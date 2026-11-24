/* Déployé le 24/11/2026 à 14:26 — v1557 */
/* ============================================================
   ec-tele-videos.js — 📽️ LES VIDÉOS DE PRÉSENTATION SUR LA TÉLÉ (v1557)

   David, le 24/11 : « une vieille télé Philips sans wifi avec un
   Chromecast, est-ce qu'on pourrait la gérer depuis l'ordinateur pour
   lancer les vidéos de présentation ? et voir le temps restant ». Ses
   réponses aux deux schémas :
    · Élèves › Au quotidien, en dernier ; bureau et admins (section « tele ») ;
    · un bouton qui enchaîne les deux vidéos, et un bouton par vidéo ;
    · les vidéos restent sur Cloudflare : celles des tablettes (📺 en libre) ;
    · SAINT-BRIEUC : la Philips ne sert qu'aux vidéos, par le Chromecast.
      Cet ordinateur lui parle directement par Google Cast (Chrome) : on
      relie le Chromecast une fois, ensuite c'est lui qui lit la vidéo ;
    · LOUDÉAC : la Samsung affiche l'écran de l'accueil (ecran.html) et
      passe les vidéos par-dessus. Les ordres passent par le Worker
      (teleOrdre) ; la télé rapporte où elle en est (teleEtat).
   ============================================================ */

const TV_SITES = { 'saint-brieuc': 'Saint-Brieuc · Chromecast', loudeac: 'Loudéac · Télé Samsung' };
const TV = {
  site: '', videos: null, erreur: '', durees: {}, loudeac: null, luLe: 0,
  cast: { etat: 'rien', pret: false, attente: null }, minuteur: null, dessine: 0
};

function teleSiteChoisi(){
  if(TV.site) return TV.site;
  let s = '';
  try{ s = localStorage.getItem('teleSite') || ''; }catch(e){}
  TV.site = TV_SITES[s] ? s : 'saint-brieuc';
  return TV.site;
}
function teleVueVisible(){
  const z = $('teleZone');
  return !!(z && z.isConnected && z.offsetParent !== null);
}
/* « 7:21 » ; « 1:02:05 » au-delà d'une heure */
function teleMinSec(s){
  s = Math.max(0, Math.round(Number(s) || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
}
/* « 12 min 34 » */
function teleDureeDite(s){
  s = Math.round(Number(s) || 0);
  if(!s) return '';
  const m = Math.floor(s / 60), x = s % 60;
  return m ? m + ' min' + (x ? ' ' + String(x).padStart(2, '0') : '') : x + ' s';
}
function teleHeureFin(secondes){
  const d = new Date(Date.now() + Math.max(0, secondes) * 1000);
  return d.getHours() + 'h' + String(d.getMinutes()).padStart(2, '0');
}
function teleEl(tag, css, txt){
  const e = document.createElement(tag);
  if(css) e.style.cssText = css;
  if(txt !== undefined) e.textContent = txt;
  return e;
}
function teleBouton(txt, principal, action){
  const b = teleEl('button', 'width:auto;flex:0 0 auto;margin:0;padding:9px 14px;font-size:13.5px;', txt);
  b.type = 'button';
  b.className = 'btn ' + (principal ? 'btn-primary' : 'btn-secondary');
  if(action) b.addEventListener('click', action);
  return b;
}
function telePeutModifier(){ return (typeof peutModifier !== 'function') || peutModifier('tele'); }

/* ------------------------------------------------------------
   L'ÉCRAN
   ------------------------------------------------------------ */
async function afficherTeleVideos(){
  const z = $('teleZone');
  if(!z) return;
  teleSiteChoisi();
  if(!TV.videos) z.innerHTML = '<div class="empty">Chargement des vidéos…</div>';
  try{
    const r = await appelPrep({ action: 'teleVideos' });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    TV.videos = r.videos || [];
    TV.loudeac = (r.teles && r.teles.loudeac) ? Object.assign({}, r.teles.loudeac, { recuLe: Date.now() }) : null;
    TV.luLe = Date.now();
    TV.erreur = '';
  }catch(e){
    TV.erreur = (e && e.message) || 'Lecture impossible';
    if(!TV.videos) TV.videos = [];
  }
  TV.videos.forEach(v => teleDureeDe(v));
  if(TV.site === 'saint-brieuc') teleChargerCast();
  dessinerTeleVideos();
  teleSuivre();
}

/* La durée de chaque vidéo : ses premiers octets suffisent */
function teleDureeDe(v){
  if(!v || TV.durees[v.id] !== undefined) return;
  TV.durees[v.id] = 0;
  try{
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.muted = true;
    el.addEventListener('loadedmetadata', () => {
      if(isFinite(el.duration)) TV.durees[v.id] = el.duration;
      el.removeAttribute('src');
      try{ el.load(); }catch(e){}
      dessinerTeleVideos();
    }, { once: true });
    el.src = v.lien;
  }catch(e){}
}

function dessinerTeleVideos(){
  const z = $('teleZone');
  if(!z) return;
  z.innerHTML = '';
  const aide = teleEl('div', 'font-size:12.5px;color:var(--muted);line-height:1.5;', 'Les vidéos de présentation, sur la télé de l’agence. Tu lances d’ici, tu mets en pause, et tu vois le temps qu’il reste. ' +
    'Ce sont les mêmes que sur les tablettes (📺 Présentations, dans Groupes et guides).');
  z.appendChild(aide);

  /* les deux télés */
  const rang = teleEl('div', 'display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 2px;');
  Object.keys(TV_SITES).forEach(k => {
    const on = TV.site === k;
    const b = teleEl('button', 'width:auto;flex:0 0 auto;margin:0;padding:7px 12px;font-size:13px;border-radius:999px;' +
      (on ? 'background:var(--orange);color:var(--on-accent);border-color:var(--orange);font-weight:700;' : ''), '📍 ' + TV_SITES[k]);
    b.type = 'button';
    b.className = 'btn btn-secondary';
    b.addEventListener('click', () => {
      TV.site = k;
      try{ localStorage.setItem('teleSite', k); }catch(e){}
      if(k === 'saint-brieuc') teleChargerCast(); else teleRelireLoudeac();
      dessinerTeleVideos();
    });
    rang.appendChild(b);
  });
  z.appendChild(rang);

  if(TV.erreur){
    z.appendChild(teleEl('div', 'margin:10px 0;font-size:13px;color:var(--warn-text);font-weight:700;', '⚠️ ' + TV.erreur));
  }

  const lecture = TV.site === 'saint-brieuc' ? teleLectureCast() : teleLectureLoudeac();
  z.appendChild(TV.site === 'saint-brieuc' ? teleLigneEtatCast() : teleLigneEtatLoudeac());
  if(lecture) z.appendChild(teleCarteLecture(lecture));

  /* les vidéos */
  const vids = TV.videos || [];
  const tete = teleEl('div', 'display:flex;align-items:center;gap:10px;margin-top:14px;');
  tete.appendChild(teleEl('div', 'flex:1;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);', 'Les vidéos'));
  const pretALancer = telePretALancer();
  if(vids.length > 1 && telePeutModifier()){
    tete.appendChild(teleBouton('⏭️ Les ' + vids.length + ' à la suite sur la télé', !lecture && pretALancer, () => teleLancer(vids, 0)));
  }
  z.appendChild(tete);
  if(!vids.length){
    z.appendChild(teleEl('div', 'font-size:13px;color:var(--muted);margin-top:8px;',
      'Aucune vidéo : elles viennent des groupes 📺 « en libre » des tablettes (Suivi › Groupes et guides).'));
  }
  vids.forEach((v, i) => {
    const enCours = !!(lecture && lecture.titre === v.titre && lecture.lienIndex === i);
    const l = teleEl('div', 'display:flex;align-items:center;gap:12px;border:1px solid ' + (enCours ? 'var(--orange)' : 'var(--line)') +
      ';border-radius:14px;padding:10px 12px;margin-top:8px;background:var(--navy-deep);');
    l.appendChild(teleEl('div', 'width:38px;height:38px;border-radius:999px;background:rgba(124,58,237,.10);display:grid;place-items:center;font-size:17px;flex:0 0 auto;', '▶️'));
    const t = teleEl('div', 'flex:1;min-width:0;');
    t.appendChild(teleEl('div', 'font-weight:800;font-size:14.5px;', v.titre));
    t.appendChild(teleEl('div', 'font-size:12.5px;color:var(--muted);margin-top:2px;',
      [v.groupe, teleDureeDite(TV.durees[v.id])].filter(Boolean).join(' · ')));
    l.appendChild(t);
    if(telePeutModifier()){
      l.appendChild(enCours ? teleBouton('🔴 Sur la télé', false, null)
                            : teleBouton('▶️ Sur la télé', !lecture && pretALancer, () => teleLancer([v], 0)));
    }
    z.appendChild(l);
  });
  TV.dessine = Date.now();
  TV.sig = teleSignature(lecture);
}

/* Ce qui change la forme de l'écran ; le reste (le temps) se met à jour
   sur place, chaque seconde, sans refaire les boutons sous la souris */
function teleSignature(L){
  return JSON.stringify([TV.site, TV.cast.etat, TV.erreur, (TV.videos || []).length,
    Object.keys(TV.durees).filter(k => TV.durees[k]).length,
    L ? [L.titre, L.pause, L.i, L.nb, L.son, !!L.duree] : 0,
    TV.site === 'loudeac' ? [teleLoudeacAllumee(), !!(TV.loudeac && TV.loudeac.installee)] : 0]);
}
function teleMajSurPlace(L){
  const z = $('teleZone');
  if(!z) return;
  const vu = z.querySelector('.tvVu');
  if(vu && TV.loudeac) vu.textContent = '📺 Télé de Loudéac (écran de l’accueil) : allumée, vue il y a ' +
    Math.max(0, Math.round((Date.now() - teleHorlogeLoudeac(TV.loudeac.vuLe)) / 1000)) + ' s';
  if(!L) return;
  const reste = Math.max(0, (L.duree || 0) - (L.pos || 0));
  const a = z.querySelector('.tvReste'), b = z.querySelector('.tvBarre'), c = z.querySelector('.tvSous'), d = z.querySelector('.tvSuite');
  if(a) a.textContent = L.duree ? teleMinSec(reste) : '…';
  if(b) b.style.width = (L.duree ? Math.min(100, 100 * (L.pos || 0) / L.duree) : 0) + '%';
  if(c) c.textContent = teleTexteSous(L, reste);
  if(d) d.textContent = teleTexteSuite(L, reste);
}
function teleTexteSous(L, reste){
  return teleMinSec(L.pos) + ' / ' + (L.duree ? teleMinSec(L.duree) : '…') + (L.duree && !L.pause ? ' · finit vers ' + teleHeureFin(reste) : '');
}
function teleTexteSuite(L, reste){
  const suite = L.suivante;
  const apres = suite ? (TV.durees[suite.id] || 0) : 0;
  return '⏭️ ' + (L.i + 1) + ' sur ' + L.nb + (suite ? ' · ensuite : ' + suite.titre + (apres ? ' (' + teleDureeDite(apres) + ')' : '') +
    (apres && !L.pause ? ' · tout finit vers ' + teleHeureFin(reste + apres) : '') : ' · la dernière');
}

/* La carte de ce qui passe : { ou, titre, pos, duree, pause, i, nb, suivante } */
function teleCarteLecture(L){
  const c = teleEl('div', 'border:2px solid var(--orange);border-radius:16px;padding:14px 16px;margin-top:14px;');
  c.appendChild(teleEl('div', 'font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);',
    (L.pause ? '⏸️ En pause sur la télé de ' : '🔴 En cours sur la télé de ') + L.ou));
  c.appendChild(teleEl('div', 'font-size:17px;font-weight:800;margin-top:4px;', L.titre || 'Vidéo'));
  const reste = Math.max(0, (L.duree || 0) - (L.pos || 0));
  if(L.nb > 1){
    const su = teleEl('div', 'font-size:12.5px;font-weight:700;color:var(--accent-text);margin-top:2px;', teleTexteSuite(L, reste));
    su.className = 'tvSuite';
    c.appendChild(su);
  }
  const g = teleEl('div', 'display:flex;align-items:baseline;gap:8px;margin-top:6px;');
  const gr = teleEl('span', 'font-size:46px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;', L.duree ? teleMinSec(reste) : '…');
  gr.className = 'tvReste';
  g.appendChild(gr);
  g.appendChild(teleEl('span', 'font-size:15px;font-weight:700;color:var(--muted);', 'restantes'));
  c.appendChild(g);
  const barre = teleEl('div', 'height:8px;border-radius:999px;background:var(--line);margin-top:12px;overflow:hidden;');
  const plein = teleEl('div', 'height:100%;width:' + (L.duree ? Math.min(100, 100 * (L.pos || 0) / L.duree) : 0) + '%;background:var(--orange);border-radius:999px;');
  plein.className = 'tvBarre';
  barre.appendChild(plein);
  c.appendChild(barre);
  const sous = teleEl('div', 'font-size:12.5px;color:var(--muted);margin-top:6px;font-variant-numeric:tabular-nums;', teleTexteSous(L, reste));
  sous.className = 'tvSous';
  c.appendChild(sous);
  if(L.son === 'bloque'){
    c.appendChild(teleEl('div', 'font-size:12.5px;color:var(--warn-text);font-weight:700;margin-top:6px;',
      '🔇 La télé a coupé le son : appuie sur OK de la télécommande'));
  }
  if(telePeutModifier()){
    const r = teleEl('div', 'margin-top:12px;');
    r.className = 'btn-row';
    r.appendChild(teleBouton('⏪ 10 s', false, () => teleCommande('aller', Math.max(0, (L.pos || 0) - 10))));
    r.appendChild(teleBouton(L.pause ? '▶️ Reprendre' : '⏸️ Pause', true, () => teleCommande(L.pause ? 'reprendre' : 'pause')));
    r.appendChild(teleBouton('⏩ 10 s', false, () => teleCommande('aller', (L.pos || 0) + 10)));
    r.appendChild(teleBouton('⏹️ Arrêter', false, () => teleCommande('arreter')));
    c.appendChild(r);
  }
  return c;
}

function telePretALancer(){
  if(TV.site === 'saint-brieuc') return TV.cast.etat === 'relie';
  const t = TV.loudeac;
  return !!(t && t.installee && teleLoudeacAllumee());
}
function teleLancer(liste, i){
  if(!telePeutModifier() || !liste || !liste.length) return;
  if(TV.site === 'saint-brieuc') teleLancerCast(liste, i);
  else teleLancerLoudeac(liste, i);
}
function teleCommande(type, pos){
  if(TV.site === 'saint-brieuc') teleCommandeCast(type, pos);
  else teleCommandeLoudeac(type, pos);
}

/* Le temps qui passe : la carte se redessine chaque seconde tant que la
   vue est ouverte ; la télé de Loudéac se relit toutes les 4 s pendant
   une lecture, toutes les 15 s sinon. */
function teleSuivre(){
  if(TV.minuteur) return;
  let tic = 0;
  TV.minuteur = setInterval(() => {
    if(!teleVueVisible()){ clearInterval(TV.minuteur); TV.minuteur = null; return; }
    tic++;
    const L = TV.site === 'saint-brieuc' ? teleLectureCast() : teleLectureLoudeac();
    if(TV.site === 'loudeac'){
      const lit = !!(TV.loudeac && TV.loudeac.etat && TV.loudeac.etat.lecture);
      if(tic % (lit ? 4 : 15) === 0) teleRelireLoudeac();
    }
    if(teleSignature(L) !== TV.sig) dessinerTeleVideos();
    else teleMajSurPlace(L);
  }, 1000);
}

/* ------------------------------------------------------------
   SAINT-BRIEUC : LE CHROMECAST (Google Cast, dans Chrome)
   ------------------------------------------------------------ */
function teleCastDispo(){ return !!(window.cast && window.cast.framework && window.chrome && window.chrome.cast); }
function teleChargerCast(){
  if(TV.cast.pret || TV.cast.etat === 'charge') return;
  if(!/Chrome\//.test(navigator.userAgent || '') || /Edg\/|OPR\//.test(navigator.userAgent || '')){
    TV.cast.etat = 'pasChrome';
    return;
  }
  TV.cast.etat = 'charge';
  window.__onGCastApiAvailable = (ok) => {
    if(!ok || !teleCastDispo()){ TV.cast.etat = 'indispo'; dessinerTeleVideos(); return; }
    try{
      const ctx = cast.framework.CastContext.getInstance();
      ctx.setOptions({ receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                       autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED });
      TV.cast.player = new cast.framework.RemotePlayer();
      TV.cast.ctrl = new cast.framework.RemotePlayerController(TV.cast.player);
      TV.cast.pret = true;
      const maj = () => {
        TV.cast.etat = ctx.getCurrentSession() ? 'relie' : 'pasRelie';
        if(teleVueVisible()) dessinerTeleVideos();
      };
      ctx.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, maj);
      TV.cast.ctrl.addEventListener(cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED, maj);
      TV.cast.ctrl.addEventListener(cast.framework.RemotePlayerEventType.PLAYER_STATE_CHANGED, maj);
      maj();
    }catch(e){ TV.cast.etat = 'indispo'; dessinerTeleVideos(); }
  };
  const s = document.createElement('script');
  s.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
  s.onerror = () => { TV.cast.etat = 'indispo'; dessinerTeleVideos(); };
  document.head.appendChild(s);
}
function teleLigneEtat(emo, txt, ton, apres){
  const d = teleEl('div', 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0 4px;font-size:13.5px;font-weight:700;color:' + (ton || 'var(--cream)') + ';');
  d.appendChild(teleEl('span', '', emo + ' ' + txt));
  if(apres) d.appendChild(apres);
  return d;
}
function teleLigneEtatCast(){
  const e = TV.cast.etat;
  if(e === 'pasChrome') return teleLigneEtat('📡', 'Le Chromecast se pilote depuis Google Chrome : ouvre l’App dans Chrome sur cet ordinateur', 'var(--warn-text)');
  if(e === 'indispo') return teleLigneEtat('📡', 'Google Cast ne répond pas dans ce navigateur', 'var(--warn-text)');
  if(e === 'relie') return teleLigneEtat('📡', 'Chromecast de Saint-Brieuc : relié', 'var(--accent-text)');
  if(e === 'charge' || e === 'rien') return teleLigneEtat('📡', 'Chromecast de Saint-Brieuc : recherche…', 'var(--muted)');
  const box = teleEl('div', '');
  box.appendChild(teleLigneEtat('📡', 'Chromecast de Saint-Brieuc : pas encore relié à cet ordinateur', 'var(--warn-text)',
    telePeutModifier() ? teleBouton('📡 Relier le Chromecast', true, () => teleRelierCast()) : null));
  box.appendChild(teleEl('div', 'font-size:12.5px;color:var(--muted);',
    'Chrome ouvre sa petite fenêtre : choisis le Chromecast de la télé des vidéos. Il faut que cet ordinateur soit sur le même wifi.'));
  return box;
}
async function teleRelierCast(){
  if(!TV.cast.pret) return false;
  try{
    await cast.framework.CastContext.getInstance().requestSession();
    TV.cast.etat = 'relie';
    dessinerTeleVideos();
    return true;
  }catch(e){
    if(e !== 'cancel' && typeof showToast === 'function') showToast('Chromecast : ' + (e && e.message ? e.message : e));
    return false;
  }
}
function teleSessionCast(){
  try{ return cast.framework.CastContext.getInstance().getCurrentSession(); }catch(e){ return null; }
}
async function teleLancerCast(liste, i){
  if(!TV.cast.pret){ teleChargerCast(); if(typeof showToast === 'function') showToast('Le Chromecast se prépare, réessaie dans un instant'); return; }
  let s = teleSessionCast();
  if(!s){ if(!await teleRelierCast()) return; s = teleSessionCast(); }
  if(!s) return;
  const items = liste.map(v => {
    const m = new chrome.cast.media.MediaInfo(v.lien, 'video/mp4');
    m.streamType = chrome.cast.media.StreamType.BUFFERED;
    m.metadata = new chrome.cast.media.GenericMediaMetadata();
    m.metadata.title = v.titre;
    m.customData = { id: v.id };
    const q = new chrome.cast.media.QueueItem(m);
    q.autoplay = true;
    return q;
  });
  const req = new chrome.cast.media.QueueLoadRequest(items);
  req.startIndex = Math.max(0, Math.min(items.length - 1, i || 0));
  TV.cast.liste = liste.slice();
  try{
    await new Promise((ok, ko) => s.getSessionObj().queueLoad(req, ok, ko));
  }catch(e){
    if(typeof showToast === 'function') showToast('Le Chromecast refuse la vidéo : ' + ((e && (e.description || e.code)) || e));
  }
  dessinerTeleVideos();
}
function teleLectureCast(){
  const p = TV.cast.player;
  if(!TV.cast.pret || !p || !p.isConnected || !p.isMediaLoaded) return null;
  const s = teleSessionCast();
  const media = s && s.getMediaSession ? s.getMediaSession() : null;
  const items = (media && media.items) || [];
  let i = 0;
  if(items.length && media.currentItemId !== undefined){
    i = Math.max(0, items.findIndex(x => x.itemId === media.currentItemId));
  }
  const liste = TV.cast.liste || [];
  const titre = (p.mediaInfo && p.mediaInfo.metadata && p.mediaInfo.metadata.title) || (liste[i] && liste[i].titre) || '';
  const idx = (TV.videos || []).findIndex(v => v.titre === titre);
  return { ou: 'Saint-Brieuc', titre: titre, pos: p.currentTime || 0, duree: p.duration || 0, pause: !!p.isPaused,
           i: i, nb: Math.max(items.length, 1), suivante: items.length > i + 1 ? liste[i + 1] : null, lienIndex: idx };
}
function teleCommandeCast(type, pos){
  const p = TV.cast.player, c = TV.cast.ctrl;
  if(!p || !c) return;
  if(type === 'pause' || type === 'reprendre'){ if(!!p.isPaused === (type === 'reprendre')) c.playOrPause(); }
  else if(type === 'aller'){ p.currentTime = Math.max(0, Math.min(pos, (p.duration || pos) - 1)); c.seek(); }
  else if(type === 'arreter'){ c.stop(); }
  setTimeout(dessinerTeleVideos, 300);
}

/* ------------------------------------------------------------
   LOUDÉAC : LA SAMSUNG (ecran.html, la ligne ouverte du Worker)
   ------------------------------------------------------------ */
function teleLoudeacAllumee(){
  const t = TV.loudeac;
  return !!(t && t.vuLe && Date.now() - teleHorlogeLoudeac(t.vuLe) < 60000);
}
/* L'heure du Worker ramenée à celle de cet ordinateur */
function teleHorlogeLoudeac(ms){
  const t = TV.loudeac;
  const ecart = (t && t.maintenant && t.recuLe) ? (t.recuLe - t.maintenant) : 0;
  return Number(ms || 0) + ecart;
}
async function teleRelireLoudeac(){
  try{
    const r = await appelPrep({ action: 'teleEtat', site: 'loudeac' });
    if(r && r.status === 'ok'){ TV.loudeac = Object.assign({}, r.tele, { recuLe: Date.now() }); }
  }catch(e){}
  if(teleVueVisible() && TV.site === 'loudeac') dessinerTeleVideos();
}
function teleLigneEtatLoudeac(){
  const t = TV.loudeac;
  if(t && !t.recuLe) t.recuLe = TV.luLe || Date.now();
  if(!t || !t.installee){
    return teleLigneEtatInstaller('Télé de Loudéac : pas encore installée');
  }
  if(teleLoudeacAllumee()){
    const s = Math.max(0, Math.round((Date.now() - teleHorlogeLoudeac(t.vuLe)) / 1000));
    const l = teleLigneEtat('📺', 'Télé de Loudéac (écran de l’accueil) : allumée, vue il y a ' + s + ' s', 'var(--accent-text)');
    l.firstChild.className = 'tvVu';
    return l;
  }
  const d = new Date(teleHorlogeLoudeac(t.vuLe));
  const quand = t.vuLe ? (d.toDateString() === new Date().toDateString()
      ? 'depuis ' + d.getHours() + 'h' + String(d.getMinutes()).padStart(2, '0')
      : 'depuis le ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })) : '';
  return teleLigneEtatInstaller('Télé de Loudéac : pas de nouvelles ' + quand);
}
function teleLigneEtatInstaller(txt){
  const box = teleEl('div', '');
  box.appendChild(teleLigneEtat('📺', txt, 'var(--warn-text)', telePeutModifier() ? teleBouton('📺 Installer la télé', true, teleInstaller) : null));
  box.appendChild(teleEl('div', 'font-size:12.5px;color:var(--muted);',
    'Sur la Samsung, ouvre le navigateur à l’adresse ' + teleAdresseEcran() + ' et laisse la page ouverte. La première fois, tape avec la télécommande ' +
    'le code que donne « Installer la télé ». Elle affiche alors l’écran de l’accueil, comme à Saint-Brieuc, et passe les vidéos quand tu les lances.'));
  return box;
}
function teleAdresseEcran(){
  const l = (typeof CONFIG !== 'undefined' && CONFIG.LIEN_ECRAN) ? CONFIG.LIEN_ECRAN : 'app.evolutionconduites.fr/ecran.html';
  return String(l).replace(/^https?:\/\//, '').replace(/\?.*$/, '');
}
async function teleInstaller(){
  try{
    const r = await appelPrep({ action: 'teleInstaller', site: 'loudeac' });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    const code = String(r.code);
    const boite = teleEl('div', 'text-align:center;');
    boite.appendChild(teleEl('div', 'font-size:14px;color:var(--muted);margin-bottom:10px;',
      'Sur la Samsung, ouvre ' + teleAdresseEcran() + ', puis tape ce code avec la télécommande :'));
    boite.appendChild(teleEl('div', 'font-size:40px;font-weight:800;letter-spacing:.18em;font-variant-numeric:tabular-nums;', code.slice(0, 3) + ' ' + code.slice(3)));
    boite.appendChild(teleEl('div', 'font-size:12.5px;color:var(--muted);margin-top:10px;', 'Valable 15 minutes. Une télé déjà installée est remplacée par la nouvelle.'));
    await fenetre(boite, [{ nom: 'Fermer', valeur: true, principal: true }], '📺 Installer la télé de Loudéac');
    teleRelireLoudeac();
  }catch(e){
    if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e));
  }
}
function teleLectureLoudeac(){
  const t = TV.loudeac;
  const e = t && t.etat;
  if(!e || !e.lecture || !teleLoudeacAllumee()) return null;
  /* la position rapportée, plus le temps écoulé depuis (en lecture) */
  const depuis = e.lecture === 'lit' ? Math.max(0, (Date.now() - teleHorlogeLoudeac(t.vuLe)) / 1000) : 0;
  const pos = Math.min(e.duree || Infinity, (e.pos || 0) + depuis);
  const liste = TV.loudeacListe || [];
  const idx = (TV.videos || []).findIndex(v => v.titre === e.titre);
  return { ou: 'Loudéac', titre: e.titre, pos: pos, duree: e.duree || 0, pause: e.lecture === 'pause', son: e.son,
           i: e.i || 0, nb: e.nb || 1, suivante: liste[(e.i || 0) + 1] || null, lienIndex: idx };
}
async function teleOrdreLoudeac(ordre){
  try{
    const r = await appelPrep({ action: 'teleOrdre', site: 'loudeac', ordre: ordre });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
  }catch(e){
    if(typeof showToast === 'function') showToast('Télé de Loudéac : ' + ((e && e.message) || e));
    return;
  }
  /* la télé reçoit l'ordre en une ou deux secondes, puis le rapporte */
  setTimeout(teleRelireLoudeac, 2500);
  setTimeout(teleRelireLoudeac, 6000);
}
function teleLancerLoudeac(liste, i){
  TV.loudeacListe = liste.slice();
  teleOrdreLoudeac({ type: 'jouer', videos: liste.map(v => ({ titre: v.titre, lien: v.lien })), i: i || 0 });
}
function teleCommandeLoudeac(type, pos){
  const e = TV.loudeac && TV.loudeac.etat;
  /* tout de suite à l'écran, sans attendre le retour de la télé */
  if(e){
    if(type === 'pause'){ e.pos = (teleLectureLoudeac() || {}).pos || e.pos; e.lecture = 'pause'; TV.loudeac.vuLe = TV.loudeac.maintenant = Date.now(); TV.loudeac.recuLe = Date.now(); }
    else if(type === 'reprendre'){ e.lecture = 'lit'; TV.loudeac.vuLe = TV.loudeac.maintenant = Date.now(); TV.loudeac.recuLe = Date.now(); }
    else if(type === 'aller'){ e.pos = pos; TV.loudeac.vuLe = TV.loudeac.maintenant = Date.now(); TV.loudeac.recuLe = Date.now(); }
    else if(type === 'arreter'){ e.lecture = ''; }
    dessinerTeleVideos();
  }
  teleOrdreLoudeac(type === 'aller' ? { type: 'aller', pos: pos } : { type: type });
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-tele-videos.js'] = true;
