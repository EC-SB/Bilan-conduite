/* Déployé le 28/11/2026 à 15:27 — v1605 */
/* ============================================================
   ec-alarme.js — v1605 — 🛡 L'ALARME DES BUREAUX

   David, le 27/11 : dans le menu ⋯, au-dessus de la CB Gasoil, une
   ligne pour Saint-Brieuc et une pour Loudéac, avec l'état et deux
   boutons. Ses choix, validés sur le schéma :
   · toute l'agence d'un coup (pas de zone), pas de « Présent » ;
   · « Absent » (un bonhomme qui part et un cadenas fermé, rouge) et
     « Désactiver l'alarme » (un cadenas ouvert, vert) : le bouton plein
     dit l'état actuel ;
   · un cadenas DESSINÉ à côté de l'agence (🔒 et 🔓 se ressemblent trop
     en petit) ;
   · aucun code : une confirmation ;
   · administrateurs par le rôle, une case « 🛡 Alarme » dans ⚙️ Accès
     pour les autres (voir : l'état ; modifier : les deux boutons) ;
   · l'historique de ce qui a été fait depuis l'App.

   Le Worker parle au cloud Hik-Connect (alarmeLire, alarmeAgir,
   alarmeHistorique). ⚠️ RIEN ICI NE BLOQUE LE RESTE DE L'APP : l'état
   n'est demandé qu'à l'ouverture du menu ⋯, et tout échec s'écrit sous
   l'agence, en une phrase.
   ============================================================ */

const AL_SVG = {
  ferme: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.2" fill="currentColor" fill-opacity=".18"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="16" r="1.2" fill="currentColor"/></svg>',
  ouvert: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.2" fill="currentColor" fill-opacity=".18"/><path d="M8 11V7.5a4 4 0 0 1 7.6-1.8"/><circle cx="12" cy="16" r="1.2" fill="currentColor"/></svg>',
  part: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><circle cx="8" cy="5.5" r="1.6" fill="currentColor"/><path d="M7.5 9 5 12.5l3 1.5 1 6M7.5 9l3 2.5 3-1M8 14l-2.5 6"/></svg>',
  alerte: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 2.8 19.5h18.4Z"/><path d="M12 10v4.5"/><circle cx="12" cy="17" r=".9" fill="currentColor"/></svg>',
  attente: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke-opacity=".35"/><path d="M12 7v5l3 2"/></svg>'
};
const AL_AGENCES = [{ id: 'saint-brieuc', nom: 'Saint-Brieuc' }, { id: 'loudeac', nom: 'Loudéac' }];
/* l'état d'une agence → ce que la ligne montre */
const AL_ETATS = {
  activee:    { texte: 'Activée',         cls: 'dehors', rond: 'ferme',   bouton: 'arm' },
  desactivee: { texte: 'Désactivée',      cls: '',       rond: 'ouvert',  bouton: 'des' },
  encours:    { texte: 'En cours…',       cls: 'or',     rond: 'attente', bouton: '' },
  partielle:  { texte: 'En partie',       cls: 'or',     rond: 'ferme',   bouton: '' },
  alarme:     { texte: '🚨 Alarme !',      cls: 'dehors', rond: 'alerte',  bouton: 'arm' },
  inconnu:    { texte: 'Inconnu',         cls: 'or',     rond: 'alerte',  bouton: '' },
  horsligne:  { texte: 'Hors ligne',      cls: 'dehors', rond: 'alerte',  bouton: '', coupe: true },
  lecture:    { texte: '…',               cls: '',       rond: 'attente', bouton: '', coupe: true }
};

let alEtat = null;          /* la dernière réponse d'alarmeLire */
let alLuLe = 0;
let alLecture = null;       /* la lecture en cours (une seule à la fois) */
let alCommande = '';        /* l'agence dont une commande part */
let alSuivi = null;         /* la relecture d'une agence « en cours » */

function alPeutVoir(){ return typeof aDroit === 'function' && aDroit('alarme') && typeof ACCES !== 'undefined' && ACCES && ACCES.code; }
function alPeutAgir(){ return typeof peutModifier === 'function' && peutModifier('alarme'); }
function alEchap(v){ return typeof echapper === 'function' ? echapper(v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

function alStyle(){
  if(document.getElementById('alStyle')) return;
  const st = document.createElement('style');
  st.id = 'alStyle';
  st.textContent = `
  #plusMenu .alBloc{ display:flex !important; flex-direction:column !important; gap:2px; }
  #plusMenu .alBloc.non{ display:none !important; }
  #plusMenu .alTete{ display:flex; align-items:center; gap:8px; padding:6px 12px 2px; font-size:12px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; color:var(--muted); }
  #plusMenu .alTete button{ margin-left:auto; width:auto; min-height:0; padding:3px 8px; font:700 12px/1.2 inherit; text-transform:none; letter-spacing:0; border-radius:999px; background:transparent; border:1px solid var(--line); color:var(--cream); cursor:pointer; }
  #plusMenu .alLigne{ display:block !important; padding:8px 12px; border-radius:9px; }
  #plusMenu .alLigne:hover{ background:rgba(127,127,127,.08); }
  #plusMenu .alHaut{ display:flex !important; flex-direction:row !important; align-items:center; gap:10px; font-size:14px; color:var(--cream); }
  #plusMenu .alHaut b{ font-weight:700; min-width:0; } #plusMenu .alHaut .brEt span{ white-space:nowrap; }
  #plusMenu .alRond{ flex:0 0 auto; width:36px; height:36px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; border:2px solid var(--line); color:var(--line); }
  #plusMenu .alRond.ferme{ background:rgba(229,72,77,.14); border-color:#E5484D; color:#E5484D; }
  #plusMenu .alRond.ouvert{ background:rgba(47,208,122,.14); border-color:#2FA05A; color:#2FA05A; }
  #plusMenu .alRond.alerte, #plusMenu .alRond.attente{ background:rgba(127,127,127,.14); border-color:#8A8F86; color:#8A8F86; }
  #plusMenu .alRond.attente svg{ animation:alTourne 1.6s linear infinite; }
  @keyframes alTourne{ to{ transform:rotate(360deg); } }
  #plusMenu .alBtns{ display:flex !important; flex-direction:row !important; gap:6px; margin-top:7px; }
  #plusMenu .alBtns button svg{ flex:0 0 auto; }
  #plusMenu .alBtns button{ flex:1; width:auto; min-height:0; margin:0; padding:7px 6px; font:700 12.5px/1.15 inherit; border-radius:16px; white-space:normal; min-width:0; text-align:center; display:flex !important; align-items:center; justify-content:center; gap:4px; border:1px solid var(--line); background:transparent; color:var(--cream); cursor:pointer; }
  #plusMenu .alBtns button.arm{ border-color:rgba(229,72,77,.55) !important; color:#B3261E !important; background:rgba(229,72,77,.08) !important; }
  #plusMenu .alBtns button.des{ border-color:rgba(47,160,90,.55) !important; color:#17733F !important; background:rgba(47,208,122,.08) !important; }
  body:not(.clair) #plusMenu .alBtns button.arm:not(.on){ color:#FF8A8D !important; } body:not(.clair) #plusMenu .alBtns button.des:not(.on){ color:#6EE7A8 !important; }
  body:not(.x) #plusMenu .alBtns button.arm.on{ background:#E5484D !important; border-color:#E5484D !important; color:#fff !important; opacity:1 !important; }
  body:not(.x) #plusMenu .alBtns button.des.on{ background:#2FA05A !important; border-color:#2FA05A !important; color:#fff !important; opacity:1 !important; }
  html body:not(.x) #plusMenu .alBtns button.on{ color:#fff !important; -webkit-text-fill-color:#fff; text-shadow:0 1px 1px rgba(0,0,0,.25); }
  #plusMenu .alBtns button:disabled{ opacity:.45; cursor:default; }
  #plusMenu .alNote{ font-size:12px; color:var(--muted); padding:6px 0 0; line-height:1.35; white-space:normal; }
  #plusMenu .alNote.gen{ padding:0 12px 4px; }
  @media (min-width:701px){ #plusMenu.alLarge{ min-width:340px !important; } }`;
  document.head.appendChild(st);
}

/* ---------- le bloc du menu ---------- */
function alLigneHtml(a, x){
  const e = AL_ETATS[x.etat] || AL_ETATS.inconnu;
  const agir = alPeutAgir() && !e.coupe && alCommande !== a.id;
  const on = (b) => e.bouton === b ? ' on' : '';
  const dis = agir ? '' : ' disabled';
  const titre = alPeutAgir() ? '' : ' title="Tu peux voir l’état, pas le changer (🛡 Alarme dans ⚙️ Accès)"';
  return '<div class="alLigne" data-agence="' + a.id + '" data-etat="' + alEchap(x.etat) + '">' +
    '<div class="alHaut"><span class="alRond ' + e.rond + '">' + AL_SVG[e.rond] + '</span><b>' + alEchap(a.nom) + '</b>' +
    '<span class="brEt"><span class="' + e.cls + '">' + (alCommande === a.id ? 'Envoi…' : e.texte) + '</span></span></div>' +
    '<div class="alBtns"><button type="button" class="arm' + on('arm') + '" data-quoi="activer"' + dis + titre + '>' + AL_SVG.part + AL_SVG.ferme + ' Absent</button>' +
    '<button type="button" class="des' + on('des') + '" data-quoi="desactiver"' + dis + titre + '>' + AL_SVG.ouvert + ' Désactiver l’alarme</button></div>' +
    (x.message ? '<div class="alNote">⚠️ ' + alEchap(x.message) + (x.etat === 'horsligne' ? ' Rien d’autre n’est bloqué.' : '') + '</div>' : '') +
    '</div>';
}
function alDessiner(){
  const m = document.getElementById('plusMenu');
  const cb = document.getElementById('plusCb');
  if(!m || !cb) return;
  let b = m.querySelector('.alBloc');
  const voir = alPeutVoir();
  if(!voir){
    if(b){ b.classList.add('non'); const s = b.nextElementSibling; if(s && s.classList.contains('alSep')) s.classList.add('non'); }
    m.classList.remove('alLarge');
    return;
  }
  alStyle();
  if(!b){
    b = document.createElement('div');
    b.className = 'alBloc';
    const sep = document.createElement('div');
    sep.className = 'brSep alSep';
    m.insertBefore(b, cb);
    m.insertBefore(sep, cb);
    b.addEventListener('click', alClic);
  }
  b.classList.remove('non');
  const sep = b.nextElementSibling;
  if(sep && sep.classList.contains('alSep')) sep.classList.remove('non');
  m.classList.add('alLarge');
  const lu = (alEtat && Array.isArray(alEtat.agences)) ? alEtat.agences : [];
  b.innerHTML = '<div class="alTete">🛡 Alarme<button type="button" class="alHisto">🕘 Historique</button></div>' +
    AL_AGENCES.map(a => alLigneHtml(a, lu.find(x => x.id === a.id) || { etat: 'lecture' })).join('') +
    (!lu.length ? '<div class="alNote gen">⏳ Lecture des centrales…</div>' : '') +
    (alEtat && alEtat.sansSecrets && ACCES.role === 'admin'
      ? '<div class="alNote gen">Pour l’allumer : les secrets HIK_USER et HIK_PASS du Worker (Cloudflare › Workers & Pages › le Worker › Paramètres › Variables et secrets).</div>' : '');
}

/* ---------- lire l'état ---------- */
async function alLire(force){
  if(!alPeutVoir()) return;
  if(alLecture) return alLecture;
  if(!force && alEtat && Date.now() - alLuLe < 20000){ alDessiner(); return; }
  alLecture = (async () => {
    try{
      const r = await appelPrep({ action: 'alarmeLire' });
      if(r && Array.isArray(r.agences)){ alEtat = r; alLuLe = Date.now(); }
    }catch(e){
      /* le Worker lui-même n'a pas répondu : on le dit sous chaque agence */
      alEtat = { agences: AL_AGENCES.map(a => ({ id: a.id, nom: a.nom, etat: 'horsligne', message: (e && e.message) || 'Pas de réponse du serveur.' })) };
      alLuLe = Date.now();
    }finally{
      alLecture = null;
    }
    alDessiner();
    alSuivreEnCours();
  })();
  return alLecture;
}
/* une agence « en cours » (temporisation de sortie) : on relit, quelques fois */
function alSuivreEnCours(n){
  clearTimeout(alSuivi);
  const m = document.getElementById('plusMenu');
  const encours = alEtat && (alEtat.agences || []).some(x => x.etat === 'encours');
  const tour = n || 0;
  if(!encours || tour >= 8) return;
  alSuivi = setTimeout(() => {
    if(!m || m.style.display === 'none') return;
    alLire(true).then(() => alSuivreEnCours(tour + 1));
  }, 6000);
}

/* ---------- agir ---------- */
async function alClic(e){
  const h = e.target.closest('.alHisto');
  if(h){ setTimeout(alHistorique, 0); return; }
  const bt = e.target.closest('.alBtns button');
  if(!bt || bt.disabled) return;
  const ligne = bt.closest('.alLigne');
  const a = AL_AGENCES.find(x => x.id === (ligne && ligne.dataset.agence));
  if(!a) return;
  const quoi = bt.dataset.quoi;
  /* le menu se referme tout seul au clic (ec-loupe.js) : la question passe par-dessus */
  setTimeout(() => alAgir(a, quoi), 0);
}
async function alAgir(a, quoi){
  if(!alPeutAgir() || alCommande) return;
  const oui = quoi === 'activer'
    ? await confirmer('🚶🔒 Absent : activer l’alarme de ' + a.nom + ' ?\nVérifie que personne n’est encore dans l’agence.', '🛡 Alarme')
    : await confirmer('🔓 Désactiver l’alarme de ' + a.nom + ' ?', '🛡 Alarme');
  if(!oui) return;
  alCommande = a.id;
  alDessiner();
  if(typeof showToast === 'function') showToast('🛡 ' + a.nom + ' : commande envoyée…');
  let r = null, err = null;
  try{ r = await appelPrep({ action: 'alarmeAgir', agence: a.id, quoi: quoi }); }
  catch(x){ err = x; }
  alCommande = '';
  if(r && r.ok){
    if(r.agence && alEtat && Array.isArray(alEtat.agences)){
      alEtat.agences = alEtat.agences.map(x => x.id === a.id ? r.agence : x);
      alLuLe = Date.now();
    }
    if(typeof showToast === 'function') showToast((quoi === 'activer' ? '🔒 ' : '🔓 ') + a.nom + ' : ' + (r.message || 'fait'));
  }else{
    const msg = (r && r.message) || (err && err.message) || 'Pas de réponse.';
    if(typeof informer === 'function') informer('⚠️ ' + a.nom + ' : la commande n’est pas passée.\n' + msg, '🛡 Alarme');
    else if(typeof showToast === 'function') showToast('⚠️ ' + a.nom + ' : ' + msg);
    /* une commande perdue a peut-être été faite : l'état sera relu à la
       prochaine ouverture du menu */
    alLuLe = 0;
  }
  alDessiner();
  alSuivreEnCours();
}

/* ---------- l'historique ---------- */
async function alHistorique(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px,94vw);max-height:88vh;overflow-y:auto;';
  boite.innerHTML = '<h3>🕘 Alarme — l’historique</h3><div style="font-size:13px;color:var(--muted);margin:-4px 0 10px">Ce qui a été fait depuis l’App : qui, quelle agence, quand. Ce qui est fait avec l’appli Hik-Connect ou le clavier n’y est pas.</div>' +
    '<div class="alListe">⏳ Lecture…</div><div class="btn-row"><button type="button" class="btn btn-secondary">Fermer</button></div>';
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };
  boite.querySelector('.btn-row button').addEventListener('click', fermer);
  fond.addEventListener('click', e => { if(e.target === fond) fermer(); });
  const liste = boite.querySelector('.alListe');
  let r;
  try{ r = await appelPrep({ action: 'alarmeHistorique' }); }
  catch(e){ liste.textContent = '⚠️ ' + ((e && e.message) || 'Historique illisible.'); return; }
  const lignes = (r && r.lignes) || [];
  if(!lignes.length){ liste.innerHTML = '<div style="color:var(--muted);padding:8px 0">Rien encore : aucune commande n’a été envoyée depuis l’App.</div>'; return; }
  const nomDe = id => (AL_AGENCES.find(a => a.id === id) || { nom: id }).nom;
  const jourDe = le => String(le || '').split(' ')[0];
  let jour = '', html = '';
  lignes.forEach(x => {
    const j = jourDe(x.le);
    if(j !== jour){
      jour = j;
      html += '<div style="font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin:12px 0 6px">' + alEchap(alJourLisible(j)) + '</div>';
    }
    const heure = (String(x.le || '').split(' ')[1] || '').replace(':', 'h');
    const quoi = x.ok ? (x.action === 'activer' ? 'alarme activée (Absent)' : 'alarme désactivée')
                      : (x.action === 'activer' ? 'activation refusée' : 'désactivation refusée');
    const icone = !x.ok ? '⚠️' : x.action === 'activer' ? '🔒' : '🔓';
    const sous = 'par ' + (x.par || '?') + (!x.ok && x.message ? ' — « ' + x.message + ' »' : '');
    html += '<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid var(--line);border-radius:12px;margin-bottom:6px"><b style="font-variant-numeric:tabular-nums;width:46px">' + alEchap(heure) + '</b><span>' + icone + '</span><span style="flex:1;min-width:0"><b>' + alEchap(nomDe(x.agence) + ' : ' + quoi) + '</b><br><span style="font-size:12.5px;color:var(--muted)">' + alEchap(sous) + '</span></span></div>';
  });
  liste.innerHTML = html;
}
/* « 28/11/2026 » → « Aujourd’hui », « Hier » ou la date */
function alJourLisible(j){
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(j || '');
  if(!m) return j || '';
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  const n = new Date(); n.setHours(0, 0, 0, 0);
  const ecart = Math.round((n - d) / 86400000);
  if(ecart === 0) return 'Aujourd’hui';
  if(ecart === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* ---------- le branchement ---------- */
function brancherAlarme(){
  const p = document.getElementById('plusBtn');
  if(!p || p.dataset.alarme) return;
  p.dataset.alarme = 'oui';
  /* EN CAPTURE, comme ec-barre.js : le bloc est posé AVANT que le menu
     se mesure et se place (ec-loupe.js) */
  p.addEventListener('click', () => {
    const m = document.getElementById('plusMenu');
    const vaOuvrir = !m || m.style.display === 'none';
    alDessiner();
    if(vaOuvrir && alPeutVoir()) setTimeout(() => alLire(false), 0);
  }, true);
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', brancherAlarme);
else brancherAlarme();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-alarme.js'] = true;
