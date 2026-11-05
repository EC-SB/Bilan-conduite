/* Déployé le 04/11/2026 à 17:11 — v1356 */
/* ============================================================
   ec-visio.js — 🎥 LE CODE EN VISIO, CÔTÉ ÉQUIPE

   David, le 4 novembre : « il faut que l'on prévoie un endroit pour
   lancer les cours en visio — actuellement je le fais par Messenger.
   Les élèves au code peuvent suivre les cours en visio (12 séances).
   J'ai un boîtier HDMI d'acquisition qui est capté comme une
   webcam ». Le schéma validé :
   · Élèves › 🎓 Code, une carte sous « 🎯 Quelle séance lancer ? » ;
   · la séance (1 à 12), les élèves à cocher, chaque fois ;
   · la caméra = le boîtier, avec son aperçu ; 🔊 le son du boîtier
     et 🎙️ son micro, deux interrupteurs, mêlés en un seul son ;
   · « ▶ Lancer » : le lien part dans la messagerie des élèves
     cochés, un lien à copier pour Messenger, ✉️ par mail ;
   · l'écran du cours : l'image en grand, les élèves (là, pas encore
     là, ✋), « 🔇 couper les micros des élèves », ➕, ⏹ Terminer ;
   · présent dès qu'il a rejoint : 🎥 dans la grille des séances.

   L'écran du cours et WebRTC sont dans appel-commun.js (mode
   « cours ») ; ce fichier prépare l'image et le son, et parle au
   Worker (visioLire, visioLancer, visioBillet, visioInviter,
   visioMail, visioFormulaire, visioPresences).
   ============================================================ */

const VISIO_SEANCES = 12;
const CLE_VISIO_MEDIA = 'ec_visio_media';
let visioEtat = null;          /* la dernière réponse de visioLire */
let visioChoix = { numero: 0, coches: {}, ajoutes: [], formulaire: '', formulaireTouche: false };
let visioFx = null;            /* le flux préparé : { flux, brut, ctx, gB, gM, an, sonB, sonM, cle } */
let visioAppareils = { cams: [], sons: [], lus: false };
let visioDernierLancement = null;   /* { sansEspace } du dernier lancement */

/* ---------- Ce qu'on retient de l'appareil (ce navigateur) ---------- */
function visioMedia(){
  let m = {};
  try{ m = JSON.parse(localStorage.getItem(CLE_VISIO_MEDIA) || '{}') || {}; }catch(e){ m = {}; }
  return Object.assign({ cam: '', sonBoitierId: '', microId: '', sonBoitier: true, monMicro: true }, m);
}
function visioRetenir(m){
  try{ localStorage.setItem(CLE_VISIO_MEDIA, JSON.stringify(m)); }catch(e){}
}

/* Le boîtier se présente souvent comme « USB Video », « Cam Link »… */
const VISIO_BOITIER = /usb video|capture|hdmi|cam ?link|elgato|ezcap|macrosilicon|uvc|av to usb|usb3\.0 video|video grabber/i;

async function visioListerAppareils(){
  const md = navigator.mediaDevices;
  if(!md || !md.enumerateDevices) return visioAppareils;
  const l = await md.enumerateDevices();
  visioAppareils = {
    cams: l.filter(d => d.kind === 'videoinput'),
    sons: l.filter(d => d.kind === 'audioinput' && d.deviceId !== 'communications'),
    lus: l.some(d => d.label)
  };
  /* Premier passage : on devine le boîtier */
  const m = visioMedia();
  let change = false;
  if(!m.cam || !visioAppareils.cams.some(d => d.deviceId === m.cam)){
    const b = visioAppareils.cams.find(d => VISIO_BOITIER.test(d.label)) || visioAppareils.cams[0];
    if(b){ m.cam = b.deviceId; change = true; }
  }
  if(m.sonBoitierId !== 'aucun' && (!m.sonBoitierId || !visioAppareils.sons.some(d => d.deviceId === m.sonBoitierId))){
    const b = visioAppareils.sons.find(d => VISIO_BOITIER.test(d.label));
    m.sonBoitierId = b ? b.deviceId : 'aucun'; change = true;
  }
  if(!m.microId || !visioAppareils.sons.some(d => d.deviceId === m.microId)){
    const b = visioAppareils.sons.find(d => !VISIO_BOITIER.test(d.label) && d.deviceId !== 'default') ||
              visioAppareils.sons.find(d => d.deviceId === 'default') || visioAppareils.sons[0];
    if(b){ m.microId = b.deviceId; change = true; }
  }
  if(change) visioRetenir(m);
  return visioAppareils;
}

/* ---------- L'image et le son : le boîtier, et le mélange ---------- */
function visioCleDuFlux(m){ return [m.cam, m.sonBoitierId, m.microId].join('|'); }

async function visioPreparer(){
  const m = visioMedia();
  if(visioFx && visioFx.cle === visioCleDuFlux(m) && visioFx.flux.getVideoTracks()[0] &&
     visioFx.flux.getVideoTracks()[0].readyState !== 'ended'){
    visioReglerLesGains();
    return visioFx;
  }
  visioArreter();
  const md = navigator.mediaDevices;
  if(!md || !md.getUserMedia) throw new Error('Ce navigateur ne sait pas capter de caméra. Prends Chrome ou Edge à jour.');
  let video;
  try{
    video = await md.getUserMedia({
      video: { deviceId: m.cam ? { exact: m.cam } : undefined, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 25 } },
      audio: false
    });
  }catch(e){
    throw new Error('La caméra (le boîtier) est refusée ou occupée : ferme Messenger, OBS ou l’autre onglet qui l’utilise, puis réessaie.');
  }
  let sonB = null, sonM = null;
  if(m.sonBoitierId && m.sonBoitierId !== 'aucun'){
    try{
      sonB = await md.getUserMedia({ audio: { deviceId: { exact: m.sonBoitierId },
        echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    }catch(e){ sonB = null; }
  }
  if(m.microId && m.microId !== m.sonBoitierId){
    try{
      sonM = await md.getUserMedia({ audio: { deviceId: { exact: m.microId }, echoCancellation: true, noiseSuppression: true } });
    }catch(e){ sonM = null; }
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  try{ await ctx.resume(); }catch(e){}
  const dest = ctx.createMediaStreamDestination();
  const gB = ctx.createGain(), gM = ctx.createGain();
  const an = ctx.createAnalyser();
  an.fftSize = 512;
  gB.connect(dest); gM.connect(dest); gB.connect(an); gM.connect(an);
  if(sonB) ctx.createMediaStreamSource(sonB).connect(gB);
  if(sonM) ctx.createMediaStreamSource(sonM).connect(gM);
  const flux = new MediaStream([video.getVideoTracks()[0], dest.stream.getAudioTracks()[0]]);
  visioFx = { flux, ctx, gB, gM, an, sonB: !!sonB, sonM: !!sonM, cle: visioCleDuFlux(m),
              brut: video.getTracks().concat(sonB ? sonB.getTracks() : [], sonM ? sonM.getTracks() : []) };
  visioReglerLesGains();
  /* Les noms des appareils n'arrivent qu'après la permission */
  if(!visioAppareils.lus) await visioListerAppareils();
  return visioFx;
}
function visioReglerLesGains(){
  if(!visioFx) return;
  const m = visioMedia();
  visioFx.gB.gain.value = m.sonBoitier ? 1 : 0;
  visioFx.gM.gain.value = m.monMicro ? 1 : 0;
}
function visioArreter(){
  if(!visioFx) return;
  (visioFx.brut || []).forEach(t => { try{ t.stop(); }catch(e){} });
  try{ visioFx.flux.getTracks().forEach(t => t.stop()); }catch(e){}
  try{ visioFx.ctx.close(); }catch(e){}
  visioFx = null;
}
function visioCoursOuvert(){
  const e = typeof AppelEC !== 'undefined' && AppelEC.enCours && AppelEC.enCours();
  return !!(e && e.cours);
}

/* ---------- Ouvrir l'écran du cours ---------- */
function visioGestes(){
  const basculer = (cle) => () => {
    const m = visioMedia();
    m[cle] = !m[cle];
    visioRetenir(m);
    visioReglerLesGains();
  };
  return [
    { cle: 'boitier', emoji: '🔊', lab: 'Son du boîtier',
      labOff: () => (visioFx && visioFx.sonB) ? 'Son du boîtier coupé' : 'Pas de son du boîtier',
      on: () => visioMedia().sonBoitier && !!(visioFx && visioFx.sonB), faire: basculer('sonBoitier') },
    { cle: 'monmicro', emoji: '🎙️', lab: 'Mon micro',
      labOff: () => (visioFx && visioFx.sonM) ? 'Mon micro coupé' : 'Pas de micro',
      on: () => visioMedia().monMicro && !!(visioFx && visioFx.sonM), faire: basculer('monMicro') }
  ];
}

function visioOuvrirLeCours(seance, billet){
  if(typeof AppelEC === 'undefined' || !visioFx) return;
  AppelEC.ouvrir({
    route: routeDesAppelsEC(), billet: billet, appel: seance.appel, genre: 'video',
    titre: '🎥 Code — séance ' + seance.numero, eleve: false, flux: visioFx.flux,
    cours: { numero: seance.numero, gestes: visioGestes(),
             surInviter: (c) => visioPanneauInviter(c, seance), surLien: (c) => visioPanneauLien(c, seance) },
    surFin: () => {
      visioArreter();
      setTimeout(() => { if($('vsCarte')) visioRafraichir(); }, 1200);
    }
  });
}

/* Reprendre le cours (page rechargée) : depuis la carte ou depuis le fil */
async function visioReprendre(seanceId, appelId){
  if(visioCoursOuvert()){ AppelEC.revenir(); return; }
  try{
    await visioPreparer();
    const r = await appelPrep({ action: 'visioBillet', seance: seanceId || '', appel: appelId || '' });
    visioOuvrirLeCours(r.seance, r.billet);
  }catch(e){
    visioArreter();
    if(typeof showToast === 'function') showToast('Impossible de reprendre le cours : ' + ((e && e.message) || e));
  }
}

/* ---------- Dans l'écran du cours : ➕ Inviter, 🔗 Le lien ---------- */
function visioPanneauDansLeCours(c, titre){
  const avant = c.e && c.e.querySelector('.aplListe');
  if(avant){ avant.remove(); if(avant.dataset.quoi === titre) return null; }
  const l = document.createElement('div');
  l.className = 'aplListe';
  l.dataset.quoi = titre;
  l.style.cssText = 'min-width:300px;max-width:min(420px,92%);';
  c.e.appendChild(l);
  return l;
}

function visioPanneauInviter(c, seance){
  const l = visioPanneauDansLeCours(c, 'inviter');
  if(!l) return;
  const dans = {};
  ((c.etat && c.etat.gens) || []).forEach(x => { dans[normaliserMot(x.qui)] = true; });
  const proposes = visioCandidats().filter(e => e.officiel && !dans[normaliserMot(e.officiel)]).slice(0, 8);
  l.innerHTML = '<b>Ajouter un élève au cours</b>' +
    '<input type="text" list="listeEleves" autocomplete="off" placeholder="🔍 Son nom…" ' +
    'style="width:100%;box-sizing:border-box;margin:0 0 8px;padding:9px 10px;border-radius:10px;border:1px solid #1F2A33;background:#07090B;color:#fff;font:inherit;font-size:13px">' +
    '<div class="vsProp"></div>' +
    '<div style="font-size:11.5px;color:#9AA7B1;margin-top:4px;line-height:1.45">Le lien apparaît dans sa messagerie. Tu peux aussi le lui envoyer par 🔗 Le lien.</div>';
  const ch = l.querySelector('input');
  const z = l.querySelector('.vsProp');
  const ajouter = async (nom) => {
    try{
      await appelPrep({ action: 'visioInviter', seance: seance.id, eleves: [nom] });
      l.remove();
      if(typeof showToast === 'function') showToast(nom + ' ajouté au cours ✅');
    }catch(e){ if(typeof showToast === 'function') showToast((e && e.message) || String(e)); }
  };
  proposes.forEach(e => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = '＋ ' + e.officiel + (e.seances[seance.numero] ? ' · a déjà vu la ' + seance.numero : '');
    b.addEventListener('click', () => { b.disabled = true; ajouter(e.officiel); });
    z.appendChild(b);
  });
  const poser = () => {
    const nom = ch.value.trim();
    const exact = tousLesElevesConnus().find(x => normaliserMot(x) === normaliserMot(nom));
    if(!exact){ if(nom && typeof showToast === 'function') showToast('« ' + nom + ' » n’est pas dans la liste des élèves.'); return; }
    ajouter(exact);
  };
  ch.addEventListener('change', poser);
  ch.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); poser(); } });
  setTimeout(() => ch.focus(), 50);
}

function visioPanneauLien(c, seance){
  const l = visioPanneauDansLeCours(c, 'lien');
  if(!l) return;
  l.innerHTML = '<b>Le lien du cours</b>' +
    '<div style="font-size:12px;color:#C9D3DA;word-break:break-all;background:#07090B;border:1px solid #1F2A33;border-radius:10px;padding:8px 10px;margin:0 0 8px">' +
      echapper(seance.lien) + '</div>';
  const bc = document.createElement('button');
  bc.type = 'button';
  bc.className = 'choisi';
  bc.textContent = '📋 Copier pour Messenger';
  bc.addEventListener('click', () => visioCopier(seance.lien, bc));
  const bm = document.createElement('button');
  bm.type = 'button';
  bm.textContent = '✉️ Envoyer par mail aux élèves';
  bm.addEventListener('click', async () => {
    bm.disabled = true;
    bm.textContent = '✉️ Envoi…';
    const noms = ((c.etat && c.etat.gens) || []).filter(x => x.genre === 'eleve').map(x => x.qui);
    const r = await visioEnvoyerLesMails(seance.id, noms);
    bm.textContent = r;
  });
  l.append(bc, bm);
  const n = document.createElement('div');
  n.style.cssText = 'font-size:11.5px;color:#9AA7B1;line-height:1.45';
  n.textContent = 'Il est déjà dans la messagerie des élèves cochés. Un élève qui a un espace et ce lien entre dans le cours, même s’il n’était pas coché.';
  l.appendChild(n);
}

async function visioCopier(texte, bouton){
  try{
    await navigator.clipboard.writeText(texte);
    if(bouton){ const t = bouton.textContent; bouton.textContent = '✅ Copié'; setTimeout(() => { bouton.textContent = t; }, 1800); }
  }catch(e){
    window.prompt('Copie le lien :', texte);
  }
}

async function visioEnvoyerLesMails(seanceId, noms){
  try{
    const r = await appelPrep({ action: 'visioMail', seance: seanceId, eleves: noms });
    const ok = (r.envoyes || []).length, ko = (r.rates || []);
    if(typeof showToast === 'function' && ko.length){
      showToast(ko.map(x => x.eleve + ' : ' + x.raison).join(' · '));
    }
    return ok ? '✉️ ' + ok + ' mail' + (ok > 1 ? 's' : '') + ' parti' + (ok > 1 ? 's' : '') + (ko.length ? ' · ' + ko.length + ' sans' : '')
              : '✉️ Aucun mail parti';
  }catch(e){ return '⚠️ ' + ((e && e.message) || e); }
}

/* ---------- Les élèves au code, avec leur vrai nom ----------
   Les noms de la grille viennent des formulaires (tapés par l'élève) ;
   la messagerie et l'espace élève ne connaissent que celui de la fiche.
   On rapproche par les mots : « Léa Martin » trouve « MARTIN Léa ». */
function visioMotsDe(n){ return normaliserMot(String(n || '')).split(/\s+/).filter(Boolean).sort().join(' '); }
function visioOfficiel(nom){
  const l = tousLesElevesConnus();
  const c = normaliserMot(nom);
  const exact = l.find(x => normaliserMot(x) === c);
  if(exact) return exact;
  const m = visioMotsDe(nom);
  return l.find(x => visioMotsDe(x) === m) || '';
}
function visioCandidats(){
  const base = (typeof elevesEtg === 'function') ? elevesEtg() : [];
  const vus = {};
  const out = [];
  base.forEach(e => {
    const off = visioOfficiel(e.nom);
    const k = normaliserMot(off || e.nom);
    if(vus[k]) return;
    vus[k] = true;
    out.push({ nom: e.nom, officiel: off, seances: e.seances || {} });
  });
  visioChoix.ajoutes.forEach(n => {
    const k = normaliserMot(n);
    if(vus[k]) return;
    vus[k] = true;
    out.push({ nom: n, officiel: n, seances: {}, ajoute: true });
  });
  /* rangés comme ils s'affichent : par leur nom de fiche, les inconnus à la fin */
  return out.sort((a, b) => (a.officiel ? 0 : 1) - (b.officiel ? 0 : 1) ||
    String(a.officiel || a.nom).localeCompare(String(b.officiel || b.nom), 'fr'));
}

function visioSeanceConseillee(){
  const el = (typeof elevesEtg === 'function') ? elevesEtg() : [];
  let best = 1, min = Infinity;
  for(let n = 1; n <= VISIO_SEANCES; n++){
    const f = el.filter(e => e.seances && e.seances[n]).length;
    if(f < min){ min = f; best = n; }
  }
  return best;
}

/* ============================================================
   LA CARTE — Élèves › 🎓 Code
   ============================================================ */
function carteVisioCode(){
  const d = document.createElement('details');
  d.id = 'vsCarte';
  d.className = 'vsCarte';
  d.open = true;
  d.innerHTML = '<summary>🎥 Cours de code en visio</summary><div class="vsCorps"><div class="vsNote">⏳ Lecture…</div></div>';
  setTimeout(() => visioRafraichir(), 0);
  return d;
}

async function visioRafraichir(){
  const corps = document.querySelector('#vsCarte .vsCorps');
  if(!corps) return;
  try{
    /* la liste des élèves VALIDE les noms : sans elle, personne à cocher */
    if(typeof tousLesElevesConnus === 'function' && !tousLesElevesConnus().length && typeof chargerEleves === 'function'){
      try{ await chargerEleves(); }catch(e){}
    }
    visioEtat = await appelPrep({ action: 'visioLire' });
  }catch(e){
    corps.innerHTML = '<div class="vsNote">⚠️ ' + echapper((e && e.message) || e) + '</div>';
    return;
  }
  visioDessiner();
}

function visioDessiner(){
  const corps = document.querySelector('#vsCarte .vsCorps');
  if(!corps || !visioEtat) return;
  corps.innerHTML = '';
  if(!visioEtat.branche){
    corps.innerHTML = '<div class="vsNote vsAlerte">Les appels ne sont pas encore branchés sur le Worker : il manque ' +
      'REALTIME_SFU_APP_ID et REALTIME_SFU_BEARER_TOKEN (Cloudflare › Realtime › Serverless SFU).</div>';
    return;
  }
  if(visioEtat.enCours) visioDessinerEnCours(corps, visioEtat.enCours);
  else visioDessinerLancement(corps);
  visioDessinerRecentes(corps);
}

/* ---------- Une séance en cours ---------- */
function visioDessinerEnCours(corps, s){
  const dedans = s.eleves.filter(x => x.etat === 'dedans').length;
  const min = Math.max(1, Math.round((Date.now() - s.debut) / 60000));
  const bandeau = document.createElement('div');
  bandeau.className = 'vsEnCours';
  bandeau.innerHTML = '<span class="vsPoint"></span><div><b>Séance ' + s.numero + ' en cours</b>' +
    '<small>lancée par ' + echapper(s.par) + ' · depuis ' + min + ' min · ' + dedans + ' présent' + (dedans > 1 ? 's' : '') +
    ' sur ' + s.eleves.length + '</small></div>';
  corps.appendChild(bandeau);

  const acts = document.createElement('div');
  acts.className = 'vsActs';
  const ouvert = visioCoursOuvert();
  const bR = visioBouton(ouvert ? '↩ Revenir au cours' : '▶ Reprendre le cours', 'p', () => visioReprendre(s.id));
  const bL = visioBouton('📋 Copier le lien', '', () => visioCopier(s.lien, bL));
  const bM = visioBouton('✉️ Envoyer par mail', '', async () => {
    bM.disabled = true; bM.textContent = '✉️ Envoi…';
    bM.textContent = await visioEnvoyerLesMails(s.id, s.eleves.map(x => x.nom));
    bM.disabled = false;
  });
  acts.append(bR, bL, bM);
  if(typeof ouvrirLeFilPartout === 'function'){
    acts.appendChild(visioBouton('💬 Le groupe', '', () => ouvrirLeFilPartout(s.conv)));
  }
  corps.appendChild(acts);

  const lien = document.createElement('div');
  lien.className = 'vsLien';
  lien.textContent = s.lien;
  corps.appendChild(lien);

  if(visioDernierLancement && visioDernierLancement.sansEspace && visioDernierLancement.sansEspace.length){
    const w = document.createElement('div');
    w.className = 'vsNote vsAlerte';
    w.textContent = '⚠️ ' + visioDernierLancement.sansEspace.join(', ') +
      (visioDernierLancement.sansEspace.length > 1 ? ' n’ont' : ' n’a') + ' pas d’espace élève ouvert : sans son code, pas d’entrée dans le cours.';
    corps.appendChild(w);
  }

  const l = document.createElement('div');
  l.className = 'vsEleves';
  s.eleves.slice().sort((a, b) => (a.etat === 'dedans' ? 0 : 1) - (b.etat === 'dedans' ? 0 : 1) || a.nom.localeCompare(b.nom, 'fr'))
    .forEach(x => {
      const r = document.createElement('div');
      r.className = 'vsEl' + (x.etat === 'dedans' ? ' la' : '');
      r.innerHTML = '<span>' + echapper(x.nom) + '</span><small>' +
        (x.etat === 'dedans' ? '🟢 là' + (x.main ? ' · ✋' : '') : x.entre ? '⚪ parti' : '⏳ pas encore là') +
        (x.mail ? ' · ✉️' : '') + '</small>';
      l.appendChild(r);
    });
  corps.appendChild(l);
}

/* ---------- Préparer et lancer ---------- */
function visioDessinerLancement(corps){
  if(!visioChoix.numero) visioChoix.numero = visioSeanceConseillee();
  const n = visioChoix.numero;

  /* 1. La séance */
  const z1 = visioBloc(corps, 'La séance');
  const puces = document.createElement('div');
  puces.className = 'vsPuces';
  for(let i = 1; i <= VISIO_SEANCES; i++){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vsPuce' + (i === n ? ' on' : '');
    b.textContent = i;
    b.title = 'Séance ' + i;
    b.addEventListener('click', () => { visioChoix.numero = i; visioChoix.formulaireTouche = false; visioDessiner(); });
    puces.appendChild(b);
  }
  z1.appendChild(puces);

  /* 2. Les élèves */
  const cands = visioCandidats();
  const z2 = visioBloc(corps, 'Les élèves', () => {
    const k = Object.keys(visioChoix.coches).filter(x => visioChoix.coches[x]).length;
    return k + ' coché' + (k > 1 ? 's' : '') + ' · ' + ((visioEtat.max || 12) - 1) + ' au plus';
  });
  const raccourcis = document.createElement('div');
  raccourcis.className = 'vsRacc';
  const rPasVue = visioBouton('Ceux qui n’ont pas vu la ' + n, '', () => {
    cands.forEach(e => { if(e.officiel && !e.seances[n]) visioChoix.coches[e.officiel] = true; });
    visioDessiner();
  });
  const rAucun = visioBouton('Tout décocher', '', () => { visioChoix.coches = {}; visioDessiner(); });
  raccourcis.append(rPasVue, rAucun);
  z2.appendChild(raccourcis);
  const liste = document.createElement('div');
  liste.className = 'vsListe';
  if(!cands.length){
    liste.innerHTML = '<div class="vsNote">Aucun élève au code dans la période. Ajoute-les par leur nom ci-dessous.</div>';
  }
  cands.forEach(e => {
    const lab = document.createElement('label');
    lab.className = 'vsLigne' + (e.officiel ? '' : ' grise');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.disabled = !e.officiel;
    cb.checked = !!(e.officiel && visioChoix.coches[e.officiel]);
    cb.addEventListener('change', () => { visioChoix.coches[e.officiel] = cb.checked; visioMajLancer(); visioMajCompte(z2); });
    const b = document.createElement('b');
    b.textContent = e.officiel || e.nom;
    const sm = document.createElement('small');
    sm.textContent = !e.officiel ? '⚠️ « ' + e.nom + ' » : pas trouvé dans les élèves — ajoute-le par la recherche'
      : e.seances[n] ? '✓ a déjà vu la ' + n : e.ajoute ? 'ajouté' : 'pas encore vu la ' + n;
    if(e.officiel && e.seances[n]) sm.className = 'vu';
    lab.append(cb, b, sm);
    liste.appendChild(lab);
  });
  z2.appendChild(liste);
  const ch = document.createElement('input');
  ch.type = 'text';
  ch.setAttribute('list', 'listeEleves');
  ch.setAttribute('autocomplete', 'off');
  ch.placeholder = '🔍 Ajouter un élève par son nom…';
  ch.className = 'vsChamp';
  const poser = () => {
    const nom = ch.value.trim();
    if(!nom) return;
    const exact = tousLesElevesConnus().find(x => normaliserMot(x) === normaliserMot(nom));
    if(!exact){ if(typeof showToast === 'function') showToast('« ' + nom + ' » n’est pas dans la liste des élèves.'); return; }
    if(visioChoix.ajoutes.indexOf(exact) === -1) visioChoix.ajoutes.push(exact);
    visioChoix.coches[exact] = true;
    visioDessiner();
  };
  ch.addEventListener('change', poser);
  ch.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); poser(); } });
  z2.appendChild(ch);

  /* 3. Le questionnaire de la séance */
  const z3 = visioBloc(corps, 'Le questionnaire de la séance ' + n);
  const formEtg = (typeof formulairesEtg !== 'undefined' && formulairesEtg) ? formulairesEtg[n] : '';
  const formD1 = (visioEtat.formulaires || {})[n] || '';
  if(!visioChoix.formulaireTouche) visioChoix.formulaire = formD1 || formEtg || '';
  const chF = document.createElement('input');
  chF.type = 'text';
  chF.inputMode = 'url';
  chF.className = 'vsChamp';
  chF.placeholder = 'https://docs.google.com/forms/…';
  chF.value = visioChoix.formulaire;
  chF.addEventListener('input', () => { visioChoix.formulaire = chF.value.trim(); visioChoix.formulaireTouche = true; });
  z3.appendChild(chF);
  const nF = document.createElement('div');
  nF.className = 'vsNote';
  nF.textContent = visioChoix.formulaire
    ? (formD1 && visioChoix.formulaire === formD1 ? 'Celui de la dernière fois. ' : formEtg && visioChoix.formulaire === formEtg ? 'Lu dans le classeur des séances. ' : '') +
      'Les élèves l’ouvrent à côté du cours, sans changer de page.'
    : 'Pas de lien : colle celui du Google Form de la séance (il sera gardé pour la prochaine fois).';
  z3.appendChild(nF);

  /* 4. L'image et le son */
  const z4 = visioBloc(corps, 'L’image et le son');
  visioDessinerMedia(z4);

  /* 5. Lancer */
  const bas = document.createElement('div');
  bas.className = 'vsActs';
  const bLancer = visioBouton('▶ Lancer la séance ' + n, 'p', () => visioLancer(bLancer));
  bLancer.id = 'vsLancer';
  bas.appendChild(bLancer);
  corps.appendChild(bas);
  const nL = document.createElement('div');
  nL.className = 'vsNote';
  nL.textContent = 'Le lien part dans la messagerie des élèves cochés. Tu pourras le copier pour Messenger et l’envoyer par mail. Rien n’est enregistré.';
  corps.appendChild(nL);
  visioMajLancer();
}

function visioMajCompte(z){
  const s = z.querySelector('.vsBlocT small');
  if(s && z._compte) s.textContent = z._compte();
}
function visioMajLancer(){
  const b = $('vsLancer');
  if(!b) return;
  const k = Object.keys(visioChoix.coches).filter(x => visioChoix.coches[x]).length;
  b.disabled = !k || k > ((visioEtat && visioEtat.max) || 12) - 1;
}

function visioDessinerMedia(z){
  const m = visioMedia();
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    z.innerHTML += '<div class="vsNote vsAlerte">Ce navigateur ne sait pas capter de caméra. Prends Chrome ou Edge à jour, sur l’ordinateur du boîtier.</div>';
    return;
  }
  const g = document.createElement('div');
  g.className = 'vsMedia';
  const ap = document.createElement('div');
  ap.className = 'vsApercu';
  ap.innerHTML = '<div class="vsNote">Pas encore d’aperçu.</div>';
  const reg = document.createElement('div');
  reg.className = 'vsReglages';
  g.append(ap, reg);
  z.appendChild(g);

  const select = (lab, liste, valeur, avecAucun, surChoix) => {
    const l = document.createElement('label');
    l.className = 'vsLab';
    l.textContent = lab;
    const s = document.createElement('select');
    s.innerHTML = (avecAucun ? '<option value="aucun">— Aucun</option>' : '') +
      liste.map((d, i) => '<option value="' + echapper(d.deviceId) + '">' + echapper(d.label || (lab + ' ' + (i + 1))) + '</option>').join('');
    s.value = valeur;
    s.addEventListener('change', () => surChoix(s.value));
    l.appendChild(s);
    reg.appendChild(l);
  };
  const interrupteur = (cle, lab, actif) => {
    const l = document.createElement('label');
    l.className = 'vsInter';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!m[cle];
    cb.disabled = !actif;
    cb.addEventListener('change', () => { const mm = visioMedia(); mm[cle] = cb.checked; visioRetenir(mm); visioReglerLesGains(); });
    l.append(cb, document.createTextNode(' ' + lab));
    reg.appendChild(l);
  };
  const changer = (cle) => (v) => {
    const mm = visioMedia(); mm[cle] = v; visioRetenir(mm);
    visioPreparer().catch(() => {}).then(() => visioDessiner());
  };

  if(!visioAppareils.lus){
    const b = visioBouton('🎥 Autoriser la caméra et le micro', 'p', () => visioApercu(ap, true));
    reg.appendChild(b);
    const n = document.createElement('div');
    n.className = 'vsNote';
    n.textContent = 'Branche le boîtier avant : il apparaît comme une webcam (souvent « USB Video »). Le navigateur demande la permission une fois.';
    reg.appendChild(n);
    return;
  }
  select('🎥 Caméra (le boîtier)', visioAppareils.cams, m.cam, false, changer('cam'));
  select('🔊 Son du boîtier', visioAppareils.sons, m.sonBoitierId || 'aucun', true, changer('sonBoitierId'));
  interrupteur('sonBoitier', 'Envoyer le son du boîtier', m.sonBoitierId && m.sonBoitierId !== 'aucun');
  select('🎙️ Mon micro', visioAppareils.sons, m.microId, false, changer('microId'));
  interrupteur('monMicro', 'Envoyer mon micro', true);
  const nv = document.createElement('div');
  nv.className = 'vsNiveau';
  nv.innerHTML = '<span></span>';
  nv.title = 'Le son que recevront les élèves';
  reg.appendChild(nv);
  /* ⚠️ LA CAMÉRA NE S'ALLUME QUE SUR UN GESTE : ouvrir l'onglet Code
     ne doit pas réveiller le boîtier (ni le prendre à Messenger) */
  if(visioFx) visioApercu(ap, false);
  else{
    ap.innerHTML = '';
    const b = visioBouton('▶ Allumer l’aperçu', '', () => visioApercu(ap, true));
    ap.appendChild(b);
  }
  if(visioFx){
    const bc = visioBouton('⏹ Éteindre l’aperçu', '', () => { visioArreter(); visioDessiner(); });
    bc.style.alignSelf = 'flex-start';
    reg.appendChild(bc);
  }
}

/* L'aperçu : l'image du boîtier et le niveau du son mêlé */
async function visioApercu(ap, forcer){
  if(!forcer && !visioFx) return;
  const premier = !visioFx;
  try{
    await visioPreparer();
  }catch(e){
    ap.innerHTML = '<div class="vsNote vsAlerte">' + echapper(e.message || e) + '</div>';
    return;
  }
  /* premier allumage : les listes et le bouton « Éteindre » se dessinent */
  if(forcer && (premier || !document.querySelector('#vsCarte .vsReglages select'))){ visioDessiner(); return; }
  let v = ap.querySelector('video');
  if(!v){
    ap.innerHTML = '';
    v = document.createElement('video');
    v.autoplay = true; v.muted = true; v.playsInline = true;
    ap.appendChild(v);
  }
  v.srcObject = new MediaStream([visioFx.flux.getVideoTracks()[0]]);
  try{ v.play(); }catch(e){}
  visioNiveau();
}
function visioNiveau(){
  if(visioNiveau.t) return;
  const buf = new Uint8Array(256);
  visioNiveau.t = setInterval(() => {
    const barre = document.querySelector('#vsCarte .vsNiveau span');
    /* La carte n'est plus à l'écran et pas de cours : on éteint la caméra */
    if(!barre){
      if(!visioCoursOuvert() && !document.querySelector('#vsCarte')) visioArreter();
      clearInterval(visioNiveau.t); visioNiveau.t = 0;
      return;
    }
    if(!visioFx){ barre.style.width = '0'; return; }
    visioFx.an.getByteTimeDomainData(buf);
    let max = 0;
    for(let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf[i] - 128));
    barre.style.width = Math.min(100, Math.round(max / 128 * 160)) + '%';
  }, 120);
}

async function visioLancer(bouton){
  const eleves = Object.keys(visioChoix.coches).filter(x => visioChoix.coches[x]);
  if(!eleves.length){ if(typeof showToast === 'function') showToast('Coche au moins un élève.'); return; }
  bouton.disabled = true;
  bouton.textContent = '⏳ Préparation…';
  try{
    await visioPreparer();
    const r = await appelPrep({
      action: 'visioLancer', numero: visioChoix.numero, eleves: eleves,
      formulaire: visioChoix.formulaire || '',
      base: String((typeof CONFIG === 'object' && CONFIG.LIEN_ELEVE) || '').split('#')[0]
    });
    visioDernierLancement = { sansEspace: r.sansEspace || [] };
    visioChoix = { numero: 0, coches: {}, ajoutes: [], formulaire: '', formulaireTouche: false };
    visioOuvrirLeCours(r.seance, r.billet);
    visioRafraichir();
  }catch(e){
    bouton.disabled = false;
    bouton.textContent = '▶ Lancer la séance ' + visioChoix.numero;
    if(typeof showToast === 'function') showToast('Le cours n’a pas pu partir : ' + ((e && e.message) || e));
    if(/déjà en cours/.test(String(e && e.message))) visioRafraichir();
  }
}

function visioDessinerRecentes(corps){
  const l = (visioEtat.recentes || []).filter(x => x.fin);
  if(!l.length) return;
  const z = document.createElement('div');
  z.className = 'vsRecentes';
  z.innerHTML = '<div class="vsBlocT">Dernières séances</div>' + l.slice(0, 5).map(x =>
    '<div>Séance ' + x.numero + ' · ' + echapper(String(x.jour || '').split('-').reverse().join('/')) +
    ' · ' + x.presents + ' présent' + (x.presents > 1 ? 's' : '') + ' · ' + echapper(x.par) + '</div>').join('');
  corps.appendChild(z);
}

/* ---------- Petites briques ---------- */
function visioBloc(corps, titre, compte){
  const z = document.createElement('div');
  z.className = 'vsBloc';
  z.innerHTML = '<div class="vsBlocT"><span></span><small></small></div>';
  z.querySelector('span').textContent = titre;
  if(compte){ z._compte = compte; z.querySelector('small').textContent = compte(); }
  corps.appendChild(z);
  return z;
}
function visioBouton(texte, genre, faire){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn ' + (genre === 'p' ? 'btn-primary' : 'btn-secondary') + ' vsBt';
  b.textContent = texte;
  b.addEventListener('click', faire);
  return b;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-visio.js'] = true;
