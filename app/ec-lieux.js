/* Déployé le 31/10/2026 à 14:23 — v1322 */
/* ============================================================
   ec-lieux.js — 📚 LA BASE DES LIEUX, ET LE 📍 QUI LA CONNAÎT

   David, le 31 octobre 2026 : « quand un moniteur appuie sur le
   bouton repère pendant un cours, il faut que ce soit lié à une base
   de données : on voit le point GPS où il est, dans un rayon il
   trouve ce qui doit être dit pour ici — par exemple ici c'est un
   carrefour à l'indonésienne : il n'y a pas de voie ni de marquage
   au sol, mais quand on tourne à gauche on doit se mettre le plus à
   gauche possible. Il faut que le texte aille tout seul dans la
   transcription, qu'un moniteur puisse enregistrer un nouveau point,
   que dans le bilan le texte aille au niveau du point de repère,
   qu'on puisse ajouter des photos, et le lier à une étape d'un
   groupe pour que l'élève puisse aller voir la vidéo. »

   Ses choix (schémas v1 et v2 du 31/10) :
     · le bouton 📍 PRÉVIENT quand on approche d'un lieu connu (100 m
       avant son rayon), sans vibrer ;
     · un appui : le lieu de SON SENS (le sens de la voiture, lu sur
       les derniers points GPS) — un seul : son texte ENTIER va dans
       la dictée, juste après la marque « 📍n » ; plusieurs : une
       fenêtre pour choisir ; aucun : « Aucun lieu — juste un travail
       pour l'élève » et « ➕ Nouveau lieu ici » ;
     · sens inconnu (à l'arrêt, GPS imprécis) : tous les sens du lieu
       sont proposés dans la fenêtre ;
     · un lieu : un rayon (30, 50 ou 100 m), un texte par sens (ou le
       même dans tous les sens), plusieurs vidéos, des photos prises
       sur place ou ajoutées depuis l'ordinateur ;
     · tout le monde crée et modifie ; supprimer : celui qui l'a créé,
       le bureau et les administrateurs (vérifié par le Worker) ;
     · au bureau : Outils › 📚 Repères de lieu, par une adresse ou des
       coordonnées GPS, sur le plan IGN du trajet.

   ⚠️ RIEN NE PART EN ROULANT. La base est chargée au début du cours
   (et gardée dans le téléphone) ; la recherche se fait ici, avec la
   position que le trajet relève déjà. Comme le trajet : aucune
   vitesse, seulement un SENS (le cap entre deux points).
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const LX = { liste: null, guides: [], moi: null, charge: 0, enCours: null, veille: null, proches: [] };
const LX_AVANT = 100;          /* prévenir 100 m avant le rayon (choix de David) */
const LX_TOLERANCE = 45;       /* un texte vaut pour son sens à ± 45° */
const LX_RAYONS = [30, 50, 100];
const LX_CAPS = [[0, '⬆'], [45, '⬈'], [90, '➡'], [135, '⬊'], [180, '⬇'], [225, '⬋'], [270, '⬅'], [315, '⬉']];
const LX_CLE_COPIE = 'ec_lieux_copie';

const lxEch = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function lxFleche(cap){ const x = LX_CAPS.find(c => c[0] === cap); return x ? x[1] : '↻'; }
function lxLien(l){ const b = (typeof CONFIG === 'object' && CONFIG && CONFIG.WORKER_URL) ? CONFIG.WORKER_URL : ''; return /^https?:/.test(l || '') ? l : b + (l || ''); }
function lxDistance(a, b){
  if(typeof distanceEntre === 'function') return distanceEntre(a, b);
  const R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
/* Le cap de a vers b, en degrés (0 = nord, 90 = est) */
function lxCap(a, b){
  const r = Math.PI / 180, y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
function lxEcartAngle(a, b){ const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
function lxArrondiCap(c){ return c == null ? null : (Math.round(c / 45) * 45) % 360; }

/* ── la base ── */
async function chargerLieux(force){
  if(!force && LX.liste && Date.now() - LX.charge < 10 * 60000) return LX.liste;
  if(LX.enCours) return LX.enCours;
  LX.enCours = (async () => {
    try{
      const r = await appelPrep({ action: 'repLieuxList' });
      if(r && r.status === 'ok'){
        LX.liste = r.lieux || []; LX.guides = r.guides || []; LX.moi = r.moi || null; LX.charge = Date.now();
        try{ localStorage.setItem(LX_CLE_COPIE, JSON.stringify({ lieux: LX.liste, guides: LX.guides, moi: LX.moi, le: Date.now() })); }catch(e){}
      }
    }catch(e){
      /* Sans réseau (au démarrage d'un cours en pleine campagne) : la copie du téléphone */
      if(!LX.liste){
        try{ const c = JSON.parse(localStorage.getItem(LX_CLE_COPIE) || 'null'); if(c){ LX.liste = c.lieux || []; LX.guides = c.guides || []; LX.moi = c.moi || null; } }catch(er){}
      }
    }
    LX.enCours = null;
    return LX.liste || [];
  })();
  return LX.enCours;
}
function lieuParId(id){ return (LX.liste || []).find(l => l.id === id) || null; }
function lxMettreAJour(lieu){
  if(!LX.liste) LX.liste = [];
  const i = LX.liste.findIndex(l => l.id === lieu.id);
  if(i === -1) LX.liste.push(lieu); else LX.liste[i] = lieu;
  try{ localStorage.setItem(LX_CLE_COPIE, JSON.stringify({ lieux: LX.liste, guides: LX.guides, moi: LX.moi, le: Date.now() })); }catch(e){}
}

/* ── le sens de la voiture : le cap entre un point 20 m en arrière (moins d'une minute) et le dernier ── */
function capDeLaVoiture(){
  const pts = (typeof trajetPoints !== 'undefined' && trajetPoints) || [];
  if(pts.length < 2) return null;
  const p = pts[pts.length - 1];
  for(let i = pts.length - 2; i >= 0; i--){
    const q = pts[i];
    if(p.t - q.t > 60000) break;
    if(lxDistance(q, p) >= 20) return lxCap(q, p);
  }
  return null;
}
/* Les lieux autour d'une position : un candidat par (lieu, sens) qui vaut dans ce sens */
function lieuxAutour(pos, cap, marge){
  const out = [];
  if(!pos || pos.lat == null || pos.lon == null) return out;
  (LX.liste || []).forEach(l => {
    const d = lxDistance(pos, l);
    if(d > (Number(l.rayon) || 50) + (marge || 0)) return;
    (l.sens || []).forEach(z => {
      if(z.cap != null && cap != null && lxEcartAngle(z.cap, cap) > LX_TOLERANCE) return;
      out.push({ lieu: l, sens: z, d: Math.round(d), dedans: d <= (Number(l.rayon) || 50) });
    });
  });
  return out.sort((a, b) => a.d - b.d);
}

/* ============================================================
   ① LE BOUTON PRÉVIENT
   ============================================================ */
function lieuxRedessinerBouton(){
  const b = $('repereBtn');
  if(!b) return;
  if(b.classList.contains('pose')) return;
  let noms = $('lxNoms');
  const pr = LX.proches || [];
  const lieux = [];
  pr.forEach(x => { if(!lieux.some(y => y.lieu.id === x.lieu.id)) lieux.push(x); });
  if(!lieux.length){
    b.textContent = '📍 Repère ici';
    b.classList.remove('lxProche');
    if(noms) noms.remove();
    return;
  }
  b.innerHTML = '📍 Repère ici <span class="lxBadge">📚 ' + lieux.length + (lieux.length > 1 ? ' lieux ici' : ' lieu ici') + '</span>';
  b.classList.add('lxProche');
  if(!noms){ noms = document.createElement('div'); noms.id = 'lxNoms'; noms.className = 'lxNoms'; b.parentNode.insertBefore(noms, b.nextSibling); }
  const cap = capDeLaVoiture();
  noms.textContent = lieux.map(x => x.lieu.nom + (x.sens.cap != null && cap != null ? ' (' + lxFleche(x.sens.cap) + ' ton sens)' : '')).join(' · ');
}
function lieuxSuivre(){
  if(LX.veille) return;
  LX.veille = setInterval(() => {
    if(typeof trajetEnCours === 'function' && !trajetEnCours()){ clearInterval(LX.veille); LX.veille = null; LX.proches = []; lieuxRedessinerBouton(); return; }
    const pts = (typeof trajetPoints !== 'undefined' && trajetPoints) || [];
    const p = pts[pts.length - 1];
    LX.proches = p ? lieuxAutour(p, capDeLaVoiture(), LX_AVANT) : [];
    lieuxRedessinerBouton();
  }, 5000);
}
/* Au début du cours (appelé par demarrerTrajet) */
function lieuxAuDemarrage(){
  chargerLieux(true).then(() => lieuxSuivre()).catch(() => lieuxSuivre());
}

/* ============================================================
   ② ③ ④ L'APPUI SUR 📍
   ============================================================ */
function lxRepere(n){ return (typeof trajetReperes !== 'undefined' && trajetReperes[n - 1]) || null; }
function lxTexteDansDictee(lieu, sens){
  return ' [📚 ' + lieu.nom + (sens.titre ? ', ' + sens.titre : '') + ' : ' + sens.texte.replace(/\s+/g, ' ').trim() + '] ';
}
/* Le texte se pose juste après « 📍n » — la dictée a pu continuer pendant qu'il choisissait */
function lxInsererApresMarque(n, txt){
  const motif = new RegExp('📍' + n + '(?!\\d)\\s*');
  const poser = v => motif.test(v) ? v.replace(motif, '📍' + n + txt) : (v + txt);
  if(typeof committedTranscript === 'string') committedTranscript = poser(committedTranscript).replace(/ {2,}/g, ' ');
  const boite = $('transcriptBox');
  if(boite && boite.value !== undefined){
    boite.value = poser(boite.value).replace(/[ \t]{2,}/g, ' ');
    if(typeof avantDerniereEcriture !== 'undefined') avantDerniereEcriture = boite.value;
  }
}
function lxRetirerDeLaDictee(n){
  const motif = new RegExp('(📍' + n + '(?!\\d))\\s*\\[📚 [^\\]]*\\]\\s*');
  if(typeof committedTranscript === 'string') committedTranscript = committedTranscript.replace(motif, '$1 ');
  const boite = $('transcriptBox');
  if(boite && boite.value !== undefined){
    boite.value = boite.value.replace(motif, '$1 ');
    if(typeof avantDerniereEcriture !== 'undefined') avantDerniereEcriture = boite.value;
  }
}
function appliquerLeLieu(n, lieu, sens, sansDictee){
  const r = lxRepere(n);
  if(!r || !lieu || !sens) return;
  if(r.lieu) retirerLeLieu(n, true);
  r.lieu = { id: lieu.id, sens: sens.id, nom: lieu.nom, titre: sens.titre || '', texte: sens.texte, cap: sens.cap,
             videos: (sens.videos || []).slice(), photos: (sens.photos || []).concat(lieu.photos || []) };
  if(!r.nom){ r.nom = lieu.nom; r.nomDuLieu = true; }
  if(!sansDictee) lxInsererApresMarque(n, lxTexteDansDictee(lieu, sens));
  if(typeof appelPrep === 'function') appelPrep({ action: 'repLieuUtilise', id: lieu.id }).catch(() => {});
  if(typeof oublierLaCarteDuTrajet === 'function') oublierLaCarteDuTrajet();
}
function retirerLeLieu(n, sansCarte){
  const r = lxRepere(n);
  if(!r || !r.lieu) return;
  lxRetirerDeLaDictee(n);
  if(r.nomDuLieu){ r.nom = ''; delete r.nomDuLieu; }
  delete r.lieu;
  if(!sansCarte && typeof oublierLaCarteDuTrajet === 'function') oublierLaCarteDuTrajet();
}
/* La carte sous le bouton : le lieu trouvé, ou « aucun lieu » */
function lxCarteSousLeBouton(html){
  const bloc = $('blocTrajet');
  if(!bloc) return null;
  let c = $('lxCarte');
  if(!html){ if(c) c.remove(); return null; }
  if(!c){ c = document.createElement('div'); c.id = 'lxCarte'; c.className = 'lxCarte'; bloc.appendChild(c); }
  c.innerHTML = html;
  return c;
}
function lxCarteDuLieu(n){
  const r = lxRepere(n);
  if(!r || !r.lieu) return lxCarteSousLeBouton('');
  const L = r.lieu, ph = (L.photos || [])[0];
  const c = lxCarteSousLeBouton('<div class="lxLigne">' + (ph && ph.mini ? '<img src="' + lxEch(ph.mini) + '" alt="">' : '<span class="lxSansPhoto">📚</span>') +
    '<div class="lxQuoi"><b>📚 ' + lxEch(L.nom) + '</b><small>' + (L.cap != null ? lxFleche(L.cap) + ' ' + lxEch(L.titre || 'dans ton sens') + ' · ' : '') +
    'repère ' + n + ' · ajouté à ta dictée' + ((L.videos || []).length ? ' · 🎬 ' + L.videos.length + ' vidéo' + (L.videos.length > 1 ? 's' : '') : '') + '</small></div></div>' +
    '<div class="lxBoutons"><button type="button" class="btn btn-secondary" data-lx="autre">↺ Pas celui-là</button><button type="button" class="btn btn-secondary" data-lx="nouveau">➕ Nouveau lieu ici</button></div>');
  c.querySelector('[data-lx="autre"]').addEventListener('click', () => {
    const cands = lieuxAutour(r, null, LX_AVANT).filter(x => !(x.lieu.id === r.lieu.id && x.sens.id === r.lieu.sens));
    retirerLeLieu(n);
    if(cands.length) choisirUnLieu(n, cands); else lxCarteAucun(n);
  });
  c.querySelector('[data-lx="nouveau"]').addEventListener('click', () => ouvrirFicheLieu(null, { repere: n }));
  return c;
}
function lxCarteAucun(n){
  const c = lxCarteSousLeBouton('<div class="lxAide">Aucun lieu connu ici (dans un rayon de ' + (100 + LX_AVANT) + ' m).</div>' +
    '<div class="lxBoutons"><button type="button" class="btn btn-secondary" data-lx="rien">Aucun lieu — juste un travail pour l’élève</button>' +
    '<button type="button" class="btn btn-secondary" data-lx="nouveau">➕ Nouveau lieu ici</button></div>' +
    '<div class="lxAide">Sans appui, il reste un point de travail, comme avant.</div>');
  if(!c) return;
  c.querySelector('[data-lx="rien"]').addEventListener('click', () => lxCarteSousLeBouton(''));
  c.querySelector('[data-lx="nouveau"]').addEventListener('click', () => ouvrirFicheLieu(null, { repere: n }));
}
/* La fenêtre : plusieurs lieux (ou plusieurs sens), un appui */
function choisirUnLieu(n, cands){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const m = document.createElement('div');
  m.className = 'modal lxChoix';
  m.innerHTML = '<h3>📍 Plusieurs lieux ici — lequel ?</h3>' +
    '<div class="lxAide" style="margin:-4px 0 12px;">Repère ' + n + ' posé. Un appui suffit, la voiture roule.' +
    (capDeLaVoiture() == null ? ' Le sens de la voiture n’est pas connu : tous les sens sont proposés.' : '') + '</div>';
  cands.forEach((x, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-secondary lxOption';
    b.innerHTML = '<b>📚 ' + lxEch(x.lieu.nom) + '</b><small>' + (x.sens.cap != null ? lxFleche(x.sens.cap) + ' ' + lxEch(x.sens.titre || 'un sens') : '↻ tous les sens') +
      ' · à ' + x.d + ' m' + (x.dedans ? '' : ' (bientôt)') + '</small>';
    b.addEventListener('click', () => { fermerFond(fond); appliquerLeLieu(n, x.lieu, x.sens); lxCarteDuLieu(n); });
    m.appendChild(b);
  });
  const r = document.createElement('div');
  r.className = 'btn-row';
  const b0 = document.createElement('button'); b0.type = 'button'; b0.className = 'btn btn-secondary'; b0.textContent = 'Aucun lieu — juste un travail pour l’élève';
  b0.addEventListener('click', () => { fermerFond(fond); lxCarteSousLeBouton(''); });
  const b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'btn btn-secondary'; b1.textContent = '➕ Nouveau lieu ici';
  b1.addEventListener('click', () => { fermerFond(fond); ouvrirFicheLieu(null, { repere: n }); });
  r.appendChild(b0); r.appendChild(b1);
  m.appendChild(r);
  fond.appendChild(m);
  document.body.appendChild(fond);
}
/* Appelé par appuyerSurRepere, juste après la pose */
function lieuxApresRepere(n){
  const r = lxRepere(n);
  if(!r || r.lat == null || !LX.liste) return;
  const cap = capDeLaVoiture();
  const cands = lieuxAutour(r, cap, LX_AVANT);
  const dedans = cands.filter(x => x.dedans);
  if(dedans.length === 1 && cands.length === 1){
    appliquerLeLieu(n, dedans[0].lieu, dedans[0].sens);
    lxCarteDuLieu(n);
  }else if(cands.length){
    lxCarteSousLeBouton('');
    choisirUnLieu(n, cands);
  }else{
    lxCarteAucun(n);
  }
}

/* ============================================================
   ⑤ DANS LE BILAN ET À LA RELECTURE
   ============================================================ */
/* Les lignes sous « 📍 2 · 09h48 — … » dans le texte du bilan */
function lignesDuLieuPourLeBilan(n){
  const r = lxRepere(n);
  if(!r || !r.lieu) return '';
  const L = r.lieu;
  let out = '\n   ↳ ' + L.texte.replace(/\s+/g, ' ').trim();
  const bouts = [];
  if((L.photos || []).length) bouts.push('📷 ' + L.photos.length + ' photo' + (L.photos.length > 1 ? 's' : ''));
  if((L.videos || []).length) bouts.push('🎬 À revoir dans ton espace : ' + L.videos.map(v => '« ' + v.titre + ' »').join(', '));
  if(bouts.length) out += '\n   ' + bouts.join(' · ');
  return out;
}
/* Sous le point, dans « 📍 Les points de travail du trajet » */
function lieuSousLeRepere(n, rafraichir){
  const r = lxRepere(n);
  if(!r || !r.lieu) return null;
  const L = r.lieu;
  const d = document.createElement('div');
  d.className = 'lxSousRepere';
  d.innerHTML = '📚 <b>' + lxEch(L.nom) + '</b>' + (L.cap != null ? ' ' + lxFleche(L.cap) + ' <span class="lxGris">' + lxEch(L.titre || '') + '</span>' : '') + ' — ' + lxEch(L.texte) +
    ((L.photos || []).length ? '<div class="lxMinis">' + L.photos.slice(0, 4).map(p => p.mini ? '<img src="' + lxEch(p.mini) + '" alt="">' : '').join('') + '</div>' : '') +
    '<div>' + ((L.videos || []).length ? '🎬 Revoir : ' + L.videos.map(v => '« ' + lxEch(v.titre) + ' »').join(', ') + ' · ' : '') +
    '<a href="#" data-lx="changer">↺ changer de lieu</a> · <a href="#" data-lx="retirer">✕ retirer le lieu</a></div>';
  d.querySelector('[data-lx="retirer"]').addEventListener('click', ev => { ev.preventDefault(); retirerLeLieu(n); if(rafraichir) rafraichir(); });
  d.querySelector('[data-lx="changer"]').addEventListener('click', ev => {
    ev.preventDefault();
    const cands = lieuxAutour(r, null, LX_AVANT);
    if(!cands.length){ showToast('Aucun autre lieu connu autour de ce point.'); return; }
    choisirUnLieuApres(n, cands, rafraichir);
  });
  return d;
}
function choisirUnLieuApres(n, cands, rafraichir){
  const fond = document.createElement('div'); fond.className = 'overlay show';
  const m = document.createElement('div'); m.className = 'modal lxChoix';
  m.innerHTML = '<h3>📍 Repère ' + n + ' — quel lieu ?</h3>';
  cands.forEach(x => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary lxOption';
    b.innerHTML = '<b>📚 ' + lxEch(x.lieu.nom) + '</b><small>' + (x.sens.cap != null ? lxFleche(x.sens.cap) + ' ' + lxEch(x.sens.titre || '') : '↻ tous les sens') + ' · à ' + x.d + ' m</small>';
    b.addEventListener('click', () => { fermerFond(fond); appliquerLeLieu(n, x.lieu, x.sens, true); if(rafraichir) rafraichir(); });
    m.appendChild(b);
  });
  const a = document.createElement('button'); a.type = 'button'; a.className = 'btn btn-secondary'; a.textContent = 'Annuler';
  a.addEventListener('click', () => fermerFond(fond));
  m.appendChild(a);
  fond.appendChild(m); document.body.appendChild(fond);
}
/* Ce qu'on range avec le bilan : quel lieu sous quel repère (l'élève le retrouve dans son espace) */
function lieuxDesReperes(){
  return ((typeof trajetReperes !== 'undefined' && trajetReperes) || [])
    .map((r, i) => r.lieu ? { n: i + 1, lieu: r.lieu.id, sens: r.lieu.sens } : null).filter(Boolean);
}
async function enregistrerLesLieuxDuBilan(eleve, jour){
  const l = lieuxDesReperes();
  if(!l.length || !eleve || !jour) return;
  try{ await appelPrep({ action: 'repLieuxDuBilan', eleve: eleve, jour: jour, reperes: l }); }
  catch(e){ console.warn('Lieux du bilan non rangés :', e); }
}
/* Le mail : sous chaque repère, le texte, deux photos au plus, et les vidéos */
function lieuHtmlPourMail(n){
  const r = lxRepere(n);
  if(!r || !r.lieu) return '';
  const L = r.lieu;
  const lien = (typeof CONFIG === 'object' && CONFIG && CONFIG.LIEN_ELEVE) ? String(CONFIG.LIEN_ELEVE).split('#')[0] : '';
  return '<div style="margin:4px 0 0 22px;font-size:13.5px;line-height:1.5;color:#14161B;">' + lxEch(L.texte) + '</div>' +
    (L.photos || []).slice(0, 2).map((p, k) => '<img src="cid:lieu' + n + '-' + k + '" alt="" style="width:48%;max-width:250px;border-radius:8px;margin:6px 6px 0 22px;">').join('') +
    (L.videos || []).map(v => '<div style="margin:6px 0 0 22px;"><a href="' + lxEch(lien + (lien.indexOf('?') === -1 ? '?' : '&') + 'seg=' + encodeURIComponent(v.guide + '::' + (v.segment || ''))) +
      '" style="display:inline-block;font-size:13px;font-weight:700;color:#3B6900;text-decoration:none;border:1px solid #DCDCD3;border-radius:9px;padding:7px 12px;">🎬 Revoir « ' + lxEch(v.titre) + ' »</a></div>').join('');
}
async function lieuxImagesPourMail(){
  const out = [];
  const reps = (typeof trajetReperes !== 'undefined' && trajetReperes) || [];
  for(let i = 0; i < reps.length && out.length < 8; i++){
    const L = reps[i].lieu;
    if(!L) continue;
    for(let k = 0; k < Math.min(2, (L.photos || []).length) && out.length < 8; k++){
      try{
        const rep = await fetch(lxLien(L.photos[k].lien));
        if(!rep.ok) continue;
        const b = await rep.blob();
        const data = await new Promise((ok, non) => { const f = new FileReader(); f.onload = () => ok(String(f.result)); f.onerror = non; f.readAsDataURL(b); });
        out.push({ cid: 'lieu' + (i + 1) + '-' + k, nom: 'lieu' + (i + 1) + '-' + k + '.jpg', type: b.type || 'image/jpeg', contenu: data });
      }catch(e){ /* une photo qui ne vient pas ne tient pas le mail */ }
    }
  }
  return out;
}

/* ============================================================
   LA FICHE D'UN LIEU — téléphone (depuis un repère) et bureau
   ============================================================ */
function lxPeutSupprimer(l){ return !!(l && l.peutSupprimer); }
async function lxPhotoDepuisFichier(f){
  const grand = await imageVersJpegTD(f, 1600, 0.82), mini = await imageVersJpegTD(f, 240, 0.7);
  const r = await appelPrep({ action: 'repLieuPhoto', contenu: grand, mini: mini });
  return r.photo;
}
/* Le plan : neuf tuiles IGN (zoom 17) autour du point ; un appui déplace le point */
const LX_ZOOM = 17;
function lxPlan(z, et){
  const W = z.clientWidth || 420, H = Math.round(W * 0.66);
  const base = (typeof CONFIG === 'object' && CONFIG && CONFIG.WORKER_URL) ? CONFIG.WORKER_URL : '';
  const px = x => (x + 180) / 360 * Math.pow(2, LX_ZOOM) * 256;
  const py = y => { const r = y * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, LX_ZOOM) * 256; };
  const cx = px(et.lon), cy = py(et.lat), x0 = cx - W / 2, y0 = cy - H / 2;
  const mParPx = 156543.03 * Math.cos(et.lat * Math.PI / 180) / Math.pow(2, LX_ZOOM);
  let h = '<div class="lxPlan" style="height:' + H + 'px;">';
  for(let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + W) / 256); tx++){
    for(let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + H) / 256); ty++){
      h += '<img src="' + base + '/tuile?z=' + LX_ZOOM + '&x=' + tx + '&y=' + ty + '" style="left:' + Math.round(tx * 256 - x0) + 'px;top:' + Math.round(ty * 256 - y0) + 'px;" alt="">';
    }
  }
  const rr = (Number(et.rayon) || 50) / mParPx;
  const fl = (et.sens || []).filter(s => s.cap != null).map((s, i) => {
    const a = s.cap * Math.PI / 180, L = rr + 26, ex = W / 2 - Math.sin(a) * (rr + 4), ey = H / 2 + Math.cos(a) * (rr + 4);
    const sx = W / 2 - Math.sin(a) * L, sy = H / 2 + Math.cos(a) * L;
    const c = ['#e8590c', '#2F7FD8', '#7C5CE6', '#2E9E5B'][i % 4];
    return '<line x1="' + sx + '" y1="' + sy + '" x2="' + ex + '" y2="' + ey + '" stroke="' + c + '" stroke-width="5" marker-end="url(#lxF' + (i % 4) + ')"/>';
  }).join('');
  h += '<svg width="' + W + '" height="' + H + '"><defs>' + ['#e8590c', '#2F7FD8', '#7C5CE6', '#2E9E5B'].map((c, i) => '<marker id="lxF' + i + '" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="' + c + '"/></marker>').join('') + '</defs>' +
    '<circle cx="' + W / 2 + '" cy="' + H / 2 + '" r="' + rr + '" fill="rgba(59,105,0,.14)" stroke="#3B6900" stroke-dasharray="5 4"/>' +
    '<circle cx="' + W / 2 + '" cy="' + H / 2 + '" r="8" fill="#3B6900" stroke="#fff" stroke-width="3"/>' + fl + '</svg>' +
    '<span class="lxPlanMot">Plan IGN</span></div>' +
    '<div class="lxAide">Touche la carte pour déplacer le point.' + ((et.sens || []).some(s => s.cap != null)
      ? ' Les flèches sur la carte : les sens choisis ci-dessous.' : ' Un texte différent selon le sens ? « 🧭 Un texte par sens », ci-dessous.') + '</div>';
  z.innerHTML = h;
  z.querySelector('.lxPlan').addEventListener('click', ev => {
    const b = ev.currentTarget.getBoundingClientRect();
    const X = x0 + (ev.clientX - b.left), Y = y0 + (ev.clientY - b.top);
    const lon = X / (Math.pow(2, LX_ZOOM) * 256) * 360 - 180;
    const n = Math.PI - 2 * Math.PI * Y / (Math.pow(2, LX_ZOOM) * 256);
    const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    if(et.deplacer) et.deplacer(Math.round(lat * 1e6) / 1e6, Math.round(lon * 1e6) / 1e6);
  });
}
/* « 48.51712, -2.76318 », « 48,517 ; -2,763 », ou un lien Google Maps (« @48.51,-2.76 ») */
function lxLireCoordonnees(t){
  const s = String(t || '');
  let m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || s.match(/(-?\d{1,2}[.,]\d+)\s*[,; ]\s*(-?\d{1,3}[.,]\d+)/);
  if(!m) return null;
  const lat = Number(String(m[1]).replace(',', '.')), lon = Number(String(m[2]).replace(',', '.'));
  return (lat > 41 && lat < 52 && lon > -6 && lon < 10) ? { lat: lat, lon: lon } : null;
}
function lxTitreGuide(g){ return (g.groupeIcone ? g.groupeIcone + ' ' : '') + g.groupeNom + ' › ' + g.titre; }
/* Ses étapes ; un guide sans titre d'étape (ou un Worker d'avant) : le guide entier */
function lxEtapesDuGuide(g){ return (Array.isArray(g.etapes) && g.etapes.length) ? g.etapes : [{ id: '', titre: g.titre }]; }

function ouvrirFicheLieu(lieu, origine){
  origine = origine || {};
  const rep = origine.repere ? lxRepere(origine.repere) : null;
  const capV = rep ? lxArrondiCap(capDeLaVoiture()) : null;
  const L = lieu ? JSON.parse(JSON.stringify(lieu)) : {
    id: '', nom: '', lat: rep ? rep.lat : null, lon: rep ? rep.lon : null, rayon: 50, photos: [],
    sens: [{ id: '', cap: capV, titre: '', texte: '', videos: [], photos: [] }] };
  let parSens = (L.sens || []).some(s => s.cap != null);
  if(!L.sens || !L.sens.length) L.sens = [{ id: '', cap: null, titre: '', texte: '', videos: [], photos: [] }];

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  fond.style.alignItems = 'flex-start';
  const m = document.createElement('div');
  m.className = 'modal lxFiche';
  fond.appendChild(m);
  document.body.appendChild(fond);

  function dessiner(){
    const choixRayon = LX_RAYONS.map(r => '<button type="button" class="btn tdOnglet' + (Number(L.rayon) === r ? ' on' : '') + '" data-rayon="' + r + '">' + r + ' m</button>').join('');
    const photoBloc = (liste, cle) => '<div class="lxPhotos">' + liste.map((p, k) => '<span class="lxPhoto"><img src="' + lxEch(p.mini || lxLien(p.lien)) + '" alt=""><button type="button" data-retirer-photo="' + cle + ':' + k + '" title="Retirer">✕</button></span>').join('') +
      '<label class="btn btn-secondary lxAjoutPhoto">📷 Prendre / ajouter<input type="file" accept="image/*" multiple data-photo="' + cle + '" hidden></label></div>';
    const guideDe = v => { const g = (LX.guides || []).find(x => x.id === v.guide); return g && g.titre !== v.titre ? ' <small style="color:var(--muted);">— ' + lxEch(lxTitreGuide(g)) + '</small>' : ''; };
    const videosBloc = (z, i) => (z.videos || []).map((v, k) => '<div class="lxVideo"><span>🎬 ' + lxEch(v.titre) + guideDe(v) + '</span><button type="button" data-retirer-video="' + i + ':' + k + '">✕</button></div>').join('') +
      '<div class="lxAjoutVideo"><select data-ajout-video="' + i + '"><option value="">➕ Ajouter une vidéo (une étape d’un groupe)…</option>' +
      /* 📚 v1321 — David : « il faut aller jusqu'au titre d'étape » : un groupe
         d'options par guide, une option par ÉTAPE */
      (LX.guides || []).slice().sort((a, b) => (a.groupeNom + String(a.ordre).padStart(4, '0')).localeCompare(b.groupeNom + String(b.ordre).padStart(4, '0'))).map(g =>
        '<optgroup label="' + lxEch(lxTitreGuide(g)) + '">' + lxEtapesDuGuide(g).map(e =>
          '<option value="' + lxEch(g.id + '::' + e.id) + '">' + lxEch(e.titre) + '</option>').join('') + '</optgroup>').join('') + '</select></div>';
    const sensBloc = (z, i) => '<div class="lxSens" style="border-left-color:' + ['#e8590c', '#2F7FD8', '#7C5CE6', '#2E9E5B'][i % 4] + ';">' +
      (parSens ? '<div class="lxSensTete"><input type="text" data-titre="' + i + '" placeholder="En venant de… (rue, direction)" value="' + lxEch(z.titre || '') + '">' +
        (L.sens.length > 1 ? '<button type="button" data-retirer-sens="' + i + '" title="Retirer ce sens">✕</button>' : '') + '</div>' +
        '<div class="lxAide">On arrive en roulant vers :</div><div class="tdOnglets lxCaps">' + LX_CAPS.map(c => '<button type="button" class="btn tdOnglet' + (z.cap === c[0] ? ' on' : '') + '" data-cap="' + i + ':' + c[0] + '">' + c[1] + '</button>').join('') + '</div>' : '') +
      '<label>Ce qu’il faut dire ici' + (parSens ? ' (dans ce sens)' : '') + '</label><textarea rows="3" data-texte="' + i + '">' + lxEch(z.texte || '') + '</textarea>' +
      '<label>Les vidéos à revoir</label>' + videosBloc(z, i) +
      (parSens ? '<label>Photos de ce sens</label>' + photoBloc(z.photos || [], 's' + i) : '') + '</div>';
    m.innerHTML = '<h3>' + (L.id ? '✏️ ' + lxEch(L.nom) : (rep ? '➕ Nouveau lieu ici' : '➕ Nouveau lieu')) + '</h3>' +
      (rep && !L.id ? '<div class="lxAide" style="margin:-4px 0 10px;">📍 Là où tu as posé le repère ' + origine.repere + '. Il sert à toute l’équipe.</div>' : '') +
      '<div class="lxDeux"><div>' +
        '<label for="lxNom">Son nom</label><input type="text" id="lxNom" maxlength="120" placeholder="Carrefour à l’indonésienne — rue de Brest" value="' + lxEch(L.nom || '') + '">' +
        '<label>Où ?</label><div class="tdOnglets"><button type="button" class="btn tdOnglet' + (origine.ou !== 'gps' ? ' on' : '') + '" data-ou="adresse">🏠 Une adresse</button><button type="button" class="btn tdOnglet' + (origine.ou === 'gps' ? ' on' : '') + '" data-ou="gps">📍 Des coordonnées GPS</button></div>' +
        (origine.ou === 'gps'
          ? '<input type="text" id="lxGps" placeholder="48.51712, -2.76318 (ou un lien Google Maps)" value="' + (L.lat != null ? L.lat + ', ' + L.lon : '') + '">'
          : '<div class="lxRecherche"><input type="text" id="lxAdresse" placeholder="12 rue de Brest, Saint-Brieuc"><button type="button" class="btn btn-secondary" id="lxChercher">🔎</button></div><div id="lxResultats"></div>') +
        '<div class="lxAide" id="lxOuEst">' + (L.lat != null ? '📍 ' + L.lat + ', ' + L.lon : 'Pas encore de point.') + '</div>' +
        '<label>Rayon</label><div class="tdOnglets">' + choixRayon + '</div>' +
        '<label>Photos du lieu</label>' + photoBloc(L.photos || [], 'l') +
      '</div><div id="lxPlanZone">' + (L.lat == null ? '<div class="empty">Le plan apparaît dès qu’il y a un point.</div>' : '') + '</div></div>' +
      '<label>🧭 Le sens</label><div class="tdOnglets"><button type="button" class="btn tdOnglet' + (!parSens ? ' on' : '') + '" data-mode="tous">↻ Le même texte dans tous les sens</button><button type="button" class="btn tdOnglet' + (parSens ? ' on' : '') + '" data-mode="sens">🧭 Un texte par sens</button></div>' +
      (parSens ? L.sens : [L.sens[0]]).map(sensBloc).join('') +
      (parSens ? '<button type="button" class="btn btn-secondary" id="lxAjoutSens">➕ Ajouter un sens</button>' : '') +
      '<div class="lxMsg" id="lxMsg"></div>' +
      '<div class="btn-row"><button type="button" class="btn btn-secondary" id="lxAnnuler">Annuler</button>' +
      (L.id && lxPeutSupprimer(lieu) ? '<button type="button" class="btn btn-secondary" id="lxSupprimer">🗑️ Supprimer</button>' : '') +
      '<button type="button" class="btn btn-primary" id="lxEnregistrer">💾 Enregistrer le lieu</button></div>' +
      (L.creePar ? '<div class="lxAide">Créé par ' + lxEch(L.creePar) + (L.majPar && L.majPar !== L.creePar ? ' · modifié par ' + lxEch(L.majPar) : '') + '</div>' : '');
    brancher();
  }
  function lireChamps(){
    const nom = m.querySelector('#lxNom'); if(nom) L.nom = nom.value;
    m.querySelectorAll('[data-texte]').forEach(t => { L.sens[Number(t.getAttribute('data-texte'))].texte = t.value; });
    m.querySelectorAll('[data-titre]').forEach(t => { L.sens[Number(t.getAttribute('data-titre'))].titre = t.value; });
    const g = m.querySelector('#lxGps');
    if(g && g.value.trim()){ const c = lxLireCoordonnees(g.value); if(c){ L.lat = c.lat; L.lon = c.lon; } }
  }
  function plan(){
    const z = m.querySelector('#lxPlanZone');
    if(!z || L.lat == null) return;
    lxPlan(z, { lat: L.lat, lon: L.lon, rayon: L.rayon, sens: parSens ? L.sens : [], deplacer: (la, lo) => { lireChamps(); L.lat = la; L.lon = lo; dessiner(); } });
  }
  function brancher(){
    plan();
    m.querySelectorAll('[data-rayon]').forEach(b => b.addEventListener('click', () => { lireChamps(); L.rayon = Number(b.getAttribute('data-rayon')); dessiner(); }));
    m.querySelectorAll('[data-ou]').forEach(b => b.addEventListener('click', () => { lireChamps(); origine.ou = b.getAttribute('data-ou'); dessiner(); }));
    m.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
      lireChamps();
      parSens = b.getAttribute('data-mode') === 'sens';
      if(parSens && L.sens.every(s => s.cap == null)) L.sens[0].cap = capV != null ? capV : 0;
      if(!parSens){ L.sens = [Object.assign(L.sens[0], { cap: null })]; }
      dessiner();
    }));
    m.querySelectorAll('[data-cap]').forEach(b => b.addEventListener('click', () => { lireChamps(); const [i, c] = b.getAttribute('data-cap').split(':'); L.sens[Number(i)].cap = Number(c); dessiner(); }));
    m.querySelectorAll('[data-retirer-sens]').forEach(b => b.addEventListener('click', () => { lireChamps(); L.sens.splice(Number(b.getAttribute('data-retirer-sens')), 1); dessiner(); }));
    const as = m.querySelector('#lxAjoutSens');
    if(as) as.addEventListener('click', () => { lireChamps(); const pris = L.sens.map(s => s.cap); const libre = LX_CAPS.find(c => pris.indexOf(c[0]) === -1); L.sens.push({ id: '', cap: libre ? libre[0] : 0, titre: '', texte: '', videos: [], photos: [] }); dessiner(); });
    m.querySelectorAll('[data-ajout-video]').forEach(sel => sel.addEventListener('change', () => {
      lireChamps();
      const [gid, sid] = String(sel.value || '').split('::');
      const g = (LX.guides || []).find(x => x.id === gid);
      if(!g) return;
      const e = lxEtapesDuGuide(g).find(x => x.id === (sid || '')) || { id: '', titre: g.titre };
      const z = L.sens[Number(sel.getAttribute('data-ajout-video'))];
      z.videos = (z.videos || []).filter(v => !(v.guide === g.id && (v.segment || '') === e.id)).concat([{ guide: g.id, segment: e.id, titre: e.titre }]);
      dessiner();
    }));
    m.querySelectorAll('[data-retirer-video]').forEach(b => b.addEventListener('click', () => { lireChamps(); const [i, k] = b.getAttribute('data-retirer-video').split(':').map(Number); L.sens[i].videos.splice(k, 1); dessiner(); }));
    m.querySelectorAll('[data-retirer-photo]').forEach(b => b.addEventListener('click', () => {
      lireChamps(); const [cle, k] = b.getAttribute('data-retirer-photo').split(':');
      (cle === 'l' ? L.photos : L.sens[Number(cle.slice(1))].photos).splice(Number(k), 1); dessiner();
    }));
    m.querySelectorAll('[data-photo]').forEach(inp => inp.addEventListener('change', async () => {
      lireChamps();
      const cle = inp.getAttribute('data-photo');
      const liste = cle === 'l' ? (L.photos = L.photos || []) : (L.sens[Number(cle.slice(1))].photos = L.sens[Number(cle.slice(1))].photos || []);
      const msg = m.querySelector('#lxMsg'); msg.textContent = '⏳ Photo…';
      for(const f of Array.from(inp.files || []).slice(0, 6)){
        try{ liste.push(await lxPhotoDepuisFichier(f)); }catch(e){ msg.textContent = '⚠️ ' + (e.message || e); return; }
      }
      dessiner();
    }));
    const ch = m.querySelector('#lxChercher');
    if(ch) ch.addEventListener('click', async () => {
      lireChamps();
      const q = m.querySelector('#lxAdresse').value.trim();
      const z = m.querySelector('#lxResultats');
      z.innerHTML = '<div class="lxAide">⏳ …</div>';
      try{
        const r = await appelPrep({ action: 'repLieuAdresse', q: q });
        const l = r.resultats || [];
        z.innerHTML = l.length ? '' : '<div class="lxAide">Rien trouvé : essaie avec la ville, ou les coordonnées GPS.</div>';
        l.forEach(x => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary lxResultat';
          b.textContent = '📍 ' + x.label;
          b.addEventListener('click', () => { L.lat = Math.round(x.lat * 1e6) / 1e6; L.lon = Math.round(x.lon * 1e6) / 1e6; if(!L.nom) L.nom = x.label; dessiner(); });
          z.appendChild(b);
        });
      }catch(e){ z.innerHTML = '<div class="lxAide">⚠️ ' + lxEch(e.message || e) + '</div>'; }
    });
    const gp = m.querySelector('#lxGps');
    if(gp) gp.addEventListener('change', () => { const c = lxLireCoordonnees(gp.value); if(c){ lireChamps(); L.lat = c.lat; L.lon = c.lon; dessiner(); } else m.querySelector('#lxMsg').textContent = '⚠️ Des coordonnées comme « 48.51712, -2.76318 ».'; });
    m.querySelector('#lxAnnuler').addEventListener('click', () => fermerFond(fond));
    const sup = m.querySelector('#lxSupprimer');
    if(sup) sup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer « ' + L.nom + ' » de la base ?\n\nLes bilans déjà envoyés le gardent.', '🗑️ Supprimer le lieu', true)) return;
      try{ await appelPrep({ action: 'repLieuSupprimer', id: L.id }); LX.liste = (LX.liste || []).filter(x => x.id !== L.id); fermerFond(fond); if(origine.apres) origine.apres(); }
      catch(e){ m.querySelector('#lxMsg').textContent = '⚠️ ' + (e.message || e); }
    });
    m.querySelector('#lxEnregistrer').addEventListener('click', async () => {
      lireChamps();
      const msg = m.querySelector('#lxMsg');
      if(!String(L.nom || '').trim()){ msg.textContent = '⚠️ Son nom ?'; return; }
      if(L.lat == null){ msg.textContent = '⚠️ Où est-il ? Une adresse ou des coordonnées GPS.'; return; }
      if(!L.sens.some(s => String(s.texte || '').trim())){ msg.textContent = '⚠️ Ce qu’il faut dire ici ?'; return; }
      const b = m.querySelector('#lxEnregistrer'); b.disabled = true; b.textContent = '…';
      try{
        const r = await appelPrep({ action: 'repLieuSet', id: L.id || '', nom: L.nom, lat: L.lat, lon: L.lon, rayon: L.rayon,
          sens: (parSens ? L.sens : [Object.assign({}, L.sens[0], { cap: null })]).map(s => ({ id: s.id, cap: s.cap, titre: s.titre, texte: s.texte, videos: s.videos,
            photos: (s.photos || []).map(p => ({ cle: p.cle, mini: p.mini })) })),
          photos: (L.photos || []).map(p => ({ cle: p.cle, mini: p.mini })) });
        lxMettreAJour(r.lieu);
        fermerFond(fond);
        showToast('📚 « ' + r.lieu.nom + ' » enregistré ✅');
        if(origine.repere){
          const cap = capDeLaVoiture();
          const z = r.lieu.sens.find(s => s.cap == null || cap == null || lxEcartAngle(s.cap, cap) <= LX_TOLERANCE) || r.lieu.sens[0];
          appliquerLeLieu(origine.repere, r.lieu, z);
          lxCarteDuLieu(origine.repere);
          if(typeof montrerLeTiroirDesReperes === 'function' && $('tiroirReperes') && $('tiroirReperes').style.display !== 'none') montrerLeTiroirDesReperes();
        }
        if(origine.apres) origine.apres();
      }catch(e){ b.disabled = false; b.textContent = '💾 Enregistrer le lieu'; msg.textContent = '⚠️ ' + (e.message || e); }
    });
  }
  dessiner();
}

/* ============================================================
   ⑦ OUTILS › 📚 REPÈRES DE LIEU
   ============================================================ */
let LX_FILTRE = { q: '', quoi: 'tous' };
async function afficherLieux(){
  const z = $('lieuxZone');
  if(!z) return;
  if(!LX.liste) z.innerHTML = '<div class="empty">Lecture de la base…</div>';
  await chargerLieux(true);
  dessinerLieux();
}
function dessinerLieux(){
  const z = $('lieuxZone');
  if(!z) return;
  const tout = LX.liste || [];
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const sansVideo = l => !(l.sens || []).some(s => (s.videos || []).length);
  let l = tout.filter(x => !LX_FILTRE.q || norm(x.nom + ' ' + (x.sens || []).map(s => s.texte + ' ' + s.titre).join(' ')).indexOf(norm(LX_FILTRE.q)) !== -1);
  if(LX_FILTRE.quoi === 'sansvideo') l = l.filter(sansVideo);
  if(LX_FILTRE.quoi === 'sansphoto') l = l.filter(x => !(x.photos || []).length && !(x.sens || []).some(s => (s.photos || []).length));
  z.innerHTML = '<div class="lxAide" style="margin-bottom:10px;">Les endroits du parcours et ce qu’il faut y dire. Un 📍 posé à côté pendant un cours les retrouve tout seul — et le bouton prévient ' + LX_AVANT + ' m avant.</div>' +
    '<div class="tdOnglets" style="margin-bottom:10px;">' + [['tous', 'Tous · ' + tout.length], ['sansvideo', 'Sans vidéo · ' + tout.filter(sansVideo).length], ['sansphoto', 'Sans photo']]
      .map(([k, t]) => '<button type="button" class="btn tdOnglet' + (LX_FILTRE.quoi === k ? ' on' : '') + '" data-quoi="' + k + '">' + t + '</button>').join('') + '</div>' +
    '<div class="lxRecherche" style="margin-bottom:6px;"><input type="text" id="lxQ" placeholder="🔎 Chercher un lieu" value="' + lxEch(LX_FILTRE.q) + '"><button type="button" class="btn btn-primary" id="lxNouveau">➕ Nouveau lieu</button></div>' +
    (l.length ? l.map((x, i) => {
      const ph = (x.photos || []).concat(...(x.sens || []).map(s => s.photos || []));
      const vids = [].concat(...(x.sens || []).map(s => s.videos || []));
      const ns = (x.sens || []).filter(s => s.cap != null).length;
      return '<div class="lxLieu" data-i="' + i + '">' + (ph[0] && ph[0].mini ? '<img src="' + lxEch(ph[0].mini) + '" alt="">' : '<span class="lxSansPhoto">📍</span>') +
        '<div class="lxQuoi"><b>' + lxEch(x.nom) + '</b><small class="lxTexte">' + lxEch(((x.sens || [])[0] || {}).texte || '') + '</small>' +
        '<small>' + x.rayon + ' m · ' + (ns ? '🧭 ' + ns + ' sens' : '↻ tous les sens') + ' · ' + (vids.length ? '🎬 ' + (vids.length > 1 ? vids.length + ' vidéos' : vids[0].titre) : 'pas de vidéo') +
        (ph.length ? ' · ' + ph.length + ' photo' + (ph.length > 1 ? 's' : '') : '') + ' · par ' + lxEch(x.creePar || '?') + (x.utilise ? ' · utilisé ' + x.utilise + ' fois' : '') + '</small></div>' +
        '<button type="button" class="btn btn-secondary" data-modifier="' + i + '">✏️</button></div>';
    }).join('') : '<div class="empty">' + (tout.length ? 'Aucun lieu ne correspond.' : 'La base est vide. ➕ Nouveau lieu, ou ➕ Nouveau lieu ici pendant un cours.') + '</div>');
  z.querySelectorAll('[data-quoi]').forEach(b => b.addEventListener('click', () => { LX_FILTRE.quoi = b.getAttribute('data-quoi'); dessinerLieux(); }));
  const q = z.querySelector('#lxQ');
  q.addEventListener('input', () => { LX_FILTRE.q = q.value; const pos = q.selectionStart; dessinerLieux(); const q2 = $('lxQ'); q2.focus(); try{ q2.setSelectionRange(pos, pos); }catch(e){} });
  z.querySelector('#lxNouveau').addEventListener('click', () => ouvrirFicheLieu(null, { apres: dessinerLieux }));
  z.querySelectorAll('[data-modifier]').forEach(b => b.addEventListener('click', () => ouvrirFicheLieu(l[Number(b.getAttribute('data-modifier'))], { apres: dessinerLieux, ou: 'adresse' })));
}

/* Les styles du module */
(function(){
  if(typeof document === 'undefined' || document.getElementById('lxStyle')) return;
  const s = document.createElement('style');
  s.id = 'lxStyle';
  s.textContent =
    '#repereBtn.lxProche{border-color:#e8590c !important;box-shadow:0 0 0 4px rgba(232,89,12,.18);}' +
    '.lxBadge{display:inline-block;margin-left:8px;padding:2px 9px;border-radius:999px;background:#e8590c;color:#fff;font-size:13px;font-weight:800;vertical-align:middle;}' +
    '.lxNoms{font-size:12.5px;color:var(--muted);text-align:center;margin-top:6px;line-height:1.4;}' +
    '.lxCarte{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-top:10px;}' +
    '.lxLigne{display:flex;gap:10px;align-items:flex-start;}.lxLigne img{width:64px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0;}' +
    '.lxSansPhoto{width:64px;height:48px;border-radius:8px;border:1px dashed var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
    '.lxQuoi{flex:1;min-width:0;}.lxQuoi b{font-size:14px;display:block;}.lxQuoi small{display:block;font-size:12.5px;color:var(--muted);line-height:1.45;margin-top:2px;}' +
    '.lxBoutons{display:flex;gap:8px;margin-top:8px;}.lxBoutons .btn{margin:0;padding:10px;font-size:13px;min-height:48px;}' +
    '.lxAide{font-size:12px;color:var(--muted);line-height:1.5;margin:4px 0;}' +
    '.lxChoix{max-width:min(460px,94vw);}.lxOption{display:block;text-align:left;padding:14px;margin-bottom:8px;min-height:64px;}' +
    '.lxOption b{font-size:15px;display:block;}.lxOption small{font-size:12.5px;font-weight:500;color:var(--muted);}' +
    '.lxSousRepere{font-size:12.5px;line-height:1.5;padding:6px 0 8px 84px;border-bottom:1px solid var(--line);}.lxGris{color:var(--muted);}' +
    '.lxMinis{display:flex;gap:6px;margin:6px 0;}.lxMinis img{width:64px;height:44px;object-fit:cover;border-radius:6px;}' +
    '.lxFiche{width:min(980px,96vw) !important;max-width:min(980px,96vw) !important;max-height:94vh;overflow-y:auto;margin-top:12px;}' +
    '.lxDeux{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;}@media (max-width:720px){.lxDeux{grid-template-columns:1fr;}}' +
    '.lxFiche textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;}' +
    '.lxFiche .tdOnglet{width:auto;margin:0;}.lxCaps .tdOnglet{min-width:48px;min-height:44px;font-size:22px;line-height:1;padding:6px 10px;}' +
    '.lxRecherche{display:flex;gap:8px;}.lxRecherche input{margin:0;flex:1;min-width:0;}.lxRecherche .btn{width:auto;margin:0;padding:10px 14px;}' +
    '.lxResultat{display:block;text-align:left;margin:6px 0 0;padding:8px 10px;font-size:13px;}' +
    '.lxPhotos{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;}.lxPhoto{position:relative;}.lxPhoto img{width:96px;height:66px;object-fit:cover;border-radius:8px;display:block;}' +
    '.lxPhoto button{position:absolute;top:2px;right:2px;width:24px;height:24px;border-radius:12px;border:0;background:rgba(0,0,0,.6);color:#fff;cursor:pointer;}' +
    '.lxAjoutPhoto{width:96px;height:66px;margin:0;font-size:12px;display:inline-flex;text-transform:none;letter-spacing:0;text-align:center;color:var(--cream);padding:6px;}' +
    '.lxVideo{display:flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-bottom:6px;font-size:13px;}.lxVideo span{flex:1;}' +
    '.lxVideo button,.lxSensTete button{border:1px solid var(--line);background:transparent;border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--cream);}' +
    '.lxAjoutVideo select{margin:0 0 6px;}' +
    '.lxSens{border:1px solid var(--line);border-left:4px solid #e8590c;border-radius:10px;padding:10px 12px;margin:10px 0;}' +
    '.lxSensTete{display:flex;gap:8px;align-items:center;margin-bottom:6px;}.lxSensTete input{margin:0;flex:1;font-weight:700;}' +
    '.lxPlan{position:relative;overflow:hidden;border-radius:10px;border:1px solid var(--line);background:#efece4;cursor:crosshair;}' +
    '.lxPlan img{position:absolute;width:256px;height:256px;}.lxPlan svg{position:absolute;left:0;top:0;}' +
    '.lxPlanMot{position:absolute;left:8px;bottom:6px;font-size:11px;color:#777;background:rgba(255,255,255,.7);padding:1px 5px;border-radius:4px;}' +
    '.lxMsg{font-size:13px;color:var(--warn-text);margin:8px 0;min-height:18px;}' +
    '.lxLieu{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--line);}' +
    '.lxLieu img{width:72px;height:50px;object-fit:cover;border-radius:8px;flex-shrink:0;}.lxLieu .lxSansPhoto{width:72px;height:50px;}' +
    '.lxLieu .btn{width:auto;margin:0;padding:7px 11px;font-size:13px;}.lxTexte{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}';
  document.head.appendChild(s);
})();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-lieux.js'] = true;
