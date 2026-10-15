/* Déployé le 15/10/2026 à 15:23 — v1183 */
/* ============================================================
   ec-appels.js — 📞 LES APPELS, CÔTÉ ÉQUIPE

   David, le 15 octobre : des appels vocaux et vidéo « pour faire les
   corrections post-permis ou autre ». Ses arbitrages sur le schéma :
   · un bouton d'appel en tête du fil (« ⏰ Demain » devient « ⏰ »
     sur l'ordinateur pour lui laisser la place) ;
   · un panneau « Appeler — qui sonne ? » : tous les membres du fil
     cochés, on décoche si besoin, 6 personnes au plus ;
   · Appel vidéo, Appel vocal, ou « 📅 Plus tard » (un créneau
     d'appel, posé comme les créneaux) ;
   · dans le fil, la carte « Appel en cours — Rejoindre », puis la
     trace (durée, qui) ou « appel manqué » ;
   · à toute heure.

   L'écran d'appel, la sonnerie et la mécanique WebRTC sont dans
   appel-commun.js, partagé avec l'espace élève.
   ============================================================ */

let appelPanneauEC = '';          /* l'id du fil dont le panneau est ouvert */
let appelGensEC = { conv: '', d: null, coches: null };
const sonneriesRefuseesEC = {};

function appelsPossiblesEC(){
  return typeof AppelEC !== 'undefined' && !!window.RTCPeerConnection;
}
function routeDesAppelsEC(){
  return (typeof CONFIG !== 'undefined' && CONFIG.WORKER_URL ? CONFIG.WORKER_URL : '') + '/appel';
}

/* ---------- Le bouton en tête du fil ---------- */
function boutonAppelDuFilEC(f){
  if(!appelsPossiblesEC()) return null;
  const c = f.conv || {};
  if(!f.estMembre || f.enSupervision || Number(c.fermee || 0)) return null;
  const b = ckBouton('', 'Appeler (vidéo ou vocal)', () => {
    appelPanneauEC = appelPanneauEC === c.id ? '' : c.id;
    dessinerLeFil();
  }, 'rond' + (appelPanneauEC === c.id ? ' on' : ''));
  b.innerHTML = AppelEC.ic('tel', 18);
  b.style.color = 'var(--knt)';
  b.dataset.appel = '1';
  return b;
}

/* ---------- Le panneau « Appeler — qui sonne ? » ---------- */
function panneauAppelEC(f){
  const c = f.conv || {};
  const p = document.createElement('div');
  p.className = 'ckPanneau';
  p.id = 'appelPanneau';
  const l1 = document.createElement('div');
  l1.className = 'l1';
  l1.innerHTML = '<span style="color:var(--knt)">' + AppelEC.ic('tel', 20) + '</span><b>Appeler — qui sonne ?</b>' +
    '<span class="doux">tous les membres du fil · décoche si besoin · 6 au plus</span>';
  p.appendChild(l1);
  const liste = document.createElement('div');
  liste.style.marginTop = '6px';
  liste.innerHTML = '<div class="ckNote">Lecture des membres…</div>';
  p.appendChild(liste);
  const acts = document.createElement('div');
  acts.className = 'acts';
  p.appendChild(acts);
  const note = document.createElement('div');
  note.className = 'ckNote';
  note.textContent = 'Ça sonne sur leur téléphone (notification) et dans leur messagerie. ' +
    'L’appel s’inscrit dans le fil, avec sa durée. Rien n’est enregistré.';
  p.appendChild(note);

  const cocher = (gens) => {
    liste.innerHTML = '';
    if(appelGensEC.coches === null || appelGensEC.conv !== c.id){
      appelGensEC.coches = {};
      (gens.nommes || []).forEach(x => { appelGensEC.coches[x.cle] = true; });
      if(gens.bureau && gens.bureau.length) appelGensEC.coches['boite:bureau'] = true;
    }
    const ligne = (cle, nom, role) => {
      const lab = document.createElement('label');
      lab.style.cssText = 'display:flex;align-items:center;gap:9px;margin:0;padding:7px 0;font-size:13px;' +
        'text-transform:none;letter-spacing:0;color:var(--kt);cursor:pointer;';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!appelGensEC.coches[cle];
      cb.style.cssText = 'width:18px;height:18px;margin:0;accent-color:#B6FF0E;flex-shrink:0;';
      cb.addEventListener('change', () => { appelGensEC.coches[cle] = cb.checked; compter(); });
      const b = document.createElement('b');
      b.style.fontWeight = '800';
      b.textContent = nom;
      const s = document.createElement('span');
      s.style.color = 'var(--kd)';
      s.textContent = role;
      lab.append(cb, b, s);
      liste.appendChild(lab);
    };
    (gens.nommes || []).forEach(x => ligne(x.cle, x.qui, x.genre === 'eleve' ? 'élève' : 'équipe'));
    if(gens.bureau && gens.bureau.length) ligne('boite:bureau', 'Le bureau', gens.bureau.join(', '));
    if(!(gens.nommes || []).length && !(gens.bureau || []).length){
      liste.innerHTML = '<div class="ckNote">Personne d’autre dans ce fil.</div>';
    }
    compter();
  };
  const compter = () => {
    const d = appelGensEC.d || {};
    let n = 1;
    (d.nommes || []).forEach(x => { if(appelGensEC.coches[x.cle]) n++; });
    /* la boîte du bureau : une place (le premier qui décroche la prend) */
    if(appelGensEC.coches['boite:bureau'] && d.bureau && d.bureau.length) n += 1;
    const trop = n > (d.max || 6);
    acts.querySelectorAll('[data-lancer]').forEach(b => { b.disabled = trop || n < 2; });
    let t = acts.querySelector('.appelTrop');
    if(trop && !t){ t = document.createElement('div'); t.className = 'ckNote appelTrop'; t.style.color = 'var(--kr)'; acts.appendChild(t); }
    if(t) t.textContent = trop ? n + ' personnes : ' + (d.max || 6) + ' au plus, toi compris. Décoche quelqu’un.' : '';
    if(t && !trop) t.remove();
  };

  const lancer = (genre) => async () => {
    const d = appelGensEC.d || {};
    const invites = Object.keys(appelGensEC.coches || {}).filter(k => appelGensEC.coches[k]);
    const r = await appelPrep({ action: 'appelLancer', id: c.id, genre: genre, invites: invites });
    appelPanneauEC = '';
    appelGensEC = { conv: '', d: null, coches: null };
    dessinerLeFil();
    ouvrirLAppelEC(r.appel, r.billet, genre, titreDeLAppelEC(f));
    void d;
  };
  const bv = ckBouton('', 'Appel vidéo', lancer('video'), 'p');
  bv.innerHTML = AppelEC.ic('camera', 18) + 'Appel vidéo';
  bv.dataset.lancer = '1';
  const ba = ckBouton('', 'Appel vocal', lancer('vocal'));
  ba.innerHTML = AppelEC.ic('tel', 16) + 'Appel vocal';
  ba.dataset.lancer = '1';
  acts.append(bv, ba);
  if(c.eleve){
    acts.appendChild(ckBouton('📅 Plus tard : proposer une heure', 'Un appel prévu, comme un créneau', () => {
      appelPanneauEC = '';
      ckCreneauOuvert = true;
      ckCreneauBrouillon = null;
      appelPrevuEC = c.id;
      dessinerLeFil();
    }));
  }
  acts.appendChild(ckBouton('Annuler', '', () => { appelPanneauEC = ''; dessinerLeFil(); }));

  if(appelGensEC.conv === c.id && appelGensEC.d) cocher(appelGensEC.d);
  else{
    appelGensEC = { conv: c.id, d: null, coches: null };
    appelPrep({ action: 'appelGens', id: c.id }).then(d => {
      if(appelGensEC.conv !== c.id) return;
      appelGensEC.d = d;
      if(!d.branche){
        liste.innerHTML = '<div class="ckNote" style="color:var(--kr)">Les appels ne sont pas encore branchés sur le Worker : ' +
          'il manque REALTIME_SFU_APP_ID et REALTIME_SFU_BEARER_TOKEN (Cloudflare › Realtime › Serverless SFU).</div>';
        acts.querySelectorAll('[data-lancer]').forEach(b => { b.disabled = true; });
        return;
      }
      cocher(d);
    }).catch(e => { liste.innerHTML = '<div class="ckNote">⚠️ ' + echapper((e && e.message) || e) + '</div>'; });
  }
  return p;
}
let appelPrevuEC = '';

function titreDeLAppelEC(f){
  const c = (f && f.conv) || {};
  try{ return ckTitreListe(Object.assign({}, c, { membres: f.membres || [] })); }
  catch(e){ return c.eleve || c.titre || 'Appel'; }
}

/* ---------- Ouvrir l'écran d'appel ---------- */
function ouvrirLAppelEC(appelId, billet, genre, titre, sansCamera){
  if(!appelsPossiblesEC()) return;
  AppelEC.ouvrir({
    route: routeDesAppelsEC(), billet: billet, appel: appelId, genre: genre, titre: titre, eleve: false,
    sansCamera: !!sansCamera,
    surFin: () => { if(typeof rafraichirLeFil === 'function') setTimeout(() => rafraichirLeFil(true), 1200); }
  });
}
async function rejoindreLAppelEC(appelId, genre, titre, sansCamera){
  try{
    const r = await appelPrep({ action: 'appelBillet', appel: appelId });
    ouvrirLAppelEC(r.appel, r.billet, r.genre || genre, titre, sansCamera);
  }catch(e){
    if(typeof showToast === 'function') showToast('Impossible de rejoindre : ' + ((e && e.message) || e));
  }
}

/* ---------- Dans le fil : l'appel en cours ---------- */
function carteAppelDuFilEC(f){
  const a = f && f.appel;
  if(!a || a.fini || !appelsPossiblesEC()) return null;
  const r = document.createElement('div');
  r.className = 'msgRang';
  r.style.justifyContent = 'center';
  r.id = 'appelCarte';
  const video = a.genre === 'video';
  const dedans = (a.gens || []).filter(x => x.etat === 'dedans');
  /* la boîte du bureau se dit « le bureau », pas la liste de ses membres */
  const bureauDedans = (a.gens || []).some(x => x.bureau && x.etat === 'dedans');
  const absents = (a.gens || []).filter(x => x.etat !== 'dedans' && x.etat !== 'refuse' && !x.bureau);
  if(!bureauDedans && (a.gens || []).some(x => x.bureau && x.etat === 'invite')) absents.push({ qui: 'le bureau' });
  const heure = new Date(a.debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const depuis = a.decroche ? Math.max(1, Math.round((Date.now() - a.decroche) / 60000)) + ' min' : 'ça sonne';
  const c = document.createElement('div');
  c.className = 'ckCarteC';
  c.style.cssText = 'max-width:420px;width:100%;';
  c.innerHTML = '<div class="lab" style="display:flex;align-items:center;gap:6px;">' + AppelEC.ic(video ? 'camera' : 'tel', 14) +
    (video ? 'APPEL VIDÉO EN COURS' : 'APPEL VOCAL EN COURS') + ' · ' + heure + '</div>' +
    '<div class="v"></div><div class="e"></div>';
  c.querySelector('.v').textContent = dedans.length ? dedans.map(x => x.qui).join(', ') : 'Lancé par ' + a.par;
  c.querySelector('.e').textContent = (a.decroche ? 'depuis ' + depuis : depuis) +
    (absents.length ? ' · ' + absents.map(x => x.qui).join(', ') + (absents.length > 1 ? ' ne sont pas' : ' n’est pas') + ' dans l’appel' : '');
  const acts = document.createElement('div');
  acts.style.cssText = 'display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;';
  const moiDedans = AppelEC.enCours() && AppelEC.enCours().appel === a.id;
  const titre = titreDeLAppelEC(f);
  if(moiDedans){
    const b = ckBouton('', 'Revenir à l’appel', () => AppelEC.revenir(), 'p');
    b.innerHTML = AppelEC.ic('agrandir', 16) + 'Revenir à l’appel';
    acts.appendChild(b);
  }else if(f.estMembre){
    const b = ckBouton('', 'Rejoindre', () => rejoindreLAppelEC(a.id, a.genre, titre), 'p');
    b.innerHTML = AppelEC.ic(video ? 'camera' : 'tel', 18) + 'Rejoindre';
    acts.appendChild(b);
    if(video){
      const b2 = ckBouton('', 'Rejoindre sans caméra', () => rejoindreLAppelEC(a.id, a.genre, titre, true));
      b2.innerHTML = AppelEC.ic('tel', 16) + 'Rejoindre sans caméra';
      acts.appendChild(b2);
    }
  }
  c.appendChild(acts);
  r.appendChild(c);
  return r;
}

/* Ce qui, dans l'appel du fil, doit redessiner la carte */
function empreinteAppelEC(f){
  const a = f && f.appel;
  if(!a) return '';
  return [a.id, a.fini ? 1 : 0, a.decroche ? 1 : 0,
          (a.gens || []).map(x => x.cle + ':' + x.etat).join(',')].join('|');
}

/* La ligne de la trace : l'icône dessinée, pas l'emoji */
function ligneDAppelEC(m){
  if(!m || m.motif !== 'appel' || typeof AppelEC === 'undefined') return null;
  const d = m.donnees || {};
  const s = document.createElement('div');
  s.className = 'msgSys';
  s.setAttribute('data-rang', String(m.rang || 0));
  const span = document.createElement('span');
  span.style.cssText = 'display:inline-flex;align-items:center;gap:6px;';
  const i = document.createElement('i');
  i.style.cssText = 'display:inline-flex;font-style:normal;';
  i.innerHTML = AppelEC.ic(d.genre === 'vocal' ? 'tel' : 'camera', 14);
  const t = document.createElement('b');
  t.style.fontWeight = '400';
  t.textContent = String(m.texte || '').replace(/^(📞|🎥)\s*/, '') +
    (m.envoyeLe ? ' · ' + String(m.envoyeLe).slice(11) : '');
  span.append(i, t);
  s.appendChild(span);
  return s;
}

/* ---------- Ça sonne pour moi ---------- */
function verifierLesSonneriesEC(liste){
  if(!appelsPossiblesEC()) return;
  if(AppelEC.enCours()) return;
  const a = (liste || []).find(x => !sonneriesRefuseesEC[x.id]);
  if(!a) return;
  AppelEC.sonner({
    id: a.id, par: a.par, genre: a.genre, avec: a.avec || [], fil: a.fil,
    surRepondre: () => {
      sonneriesRefuseesEC[a.id] = true;
      try{ if(typeof allerALaMessagerie === 'function') allerALaMessagerie('messagerie'); ouvrirLeFil(a.conv); }catch(e){}
      rejoindreLAppelEC(a.id, a.genre, a.fil || a.par);
    },
    surRefuser: () => {
      sonneriesRefuseesEC[a.id] = true;
      appelPrep({ action: 'appelRefuser', appel: a.id }).catch(() => {});
    }
  });
}

/* Une notification d'appel reçue pendant que la page est ouverte :
   on relit tout de suite au lieu d'attendre le prochain battement. */
(function(){
  try{
    if(!navigator.serviceWorker) return;
    navigator.serviceWorker.addEventListener('message', ev => {
      const d = ev && ev.data;
      if(!d || d.quoi !== 'appel') return;
      if(typeof compterSiBesoin === 'function') compterSiBesoin(true);
    });
  }catch(e){}
})();

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-appels.js'] = true;
