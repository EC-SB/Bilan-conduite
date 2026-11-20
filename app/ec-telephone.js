/* Déployé le 20/11/2026 à 13:43 — v1514 */
/* ============================================================
   ec-telephone.js — v1514 — LE TÉLÉPHONE D'ALLO DANS L'APPLI

   David, le 20 novembre : « est-ce que l'on peut passer les appels
   directement depuis l'app plutôt que de devoir passer par le logiciel
   Allo ». Ses choix (schémas tel-1 à tel-6) :
   · PARTOUT : tout lien « tel: » de l'appli (📞 Rappeler du suivi des
     appels, un numéro de fiche…) ouvre le téléphone de l'appli et y
     compose le numéro ; on n'a plus qu'à appuyer pour appeler ;
   · TOUTE L'ÉQUIPE peut appeler : 📞 en haut, à côté de la messagerie ;
   · un appel qui ARRIVE ouvre la carte de l'appelant à côté du
     téléphone (son prochain cours, un rappel qui attend, ce que l'IA
     d'Allo a fait aujourd'hui, les messages posés pour lui) ;
   · « Tout rappeler » enchaîne la file d'Allo (son Power Dialer) sans
     quitter l'appli ;
   · ⚠️ « la notification d'appel ne doit pas être pour tous, je dois
     pouvoir choisir » : ⚙️ Qui reçoit les appels entrants, réglé par
     les administrateurs. Coché, l'appli charge le téléphone dès le
     démarrage et sonne ; décoché, le téléphone ne se charge qu'au
     premier appui sur 📞 — rien ne peut sonner avant. Personne n'est
     coché au départ.

   LE TÉLÉPHONE EST CELUI D'ALLO, dans une fenêtre (iframe) : chacun s'y
   connecte avec SON compte Allo (e-mail ou numéro, puis un code ; dans
   Chrome ou Edge). On lui parle par messages (postMessage), et on
   n'écoute que lui : l'origine https://web.withallo.com, et
   « source: allo-dialer ». Aucune clé ne passe par l'appli.
   ============================================================ */

const TEL_ORIGINE = 'https://web.withallo.com';
const TEL_URL = 'https://web.withallo.com?variant=dialer';
const TEL_LIGNE = '02 21 65 24 24';
const TEL_ICONE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>';

const TEL = {
  session: '',        /* le code de la session qui a démarré le téléphone */
  etat: null,         /* { recoit, admin } — telEtat */
  iframe: null, pret: false, connecte: false, attente: [], minuteurInit: null,
  panneau: null, vue: 'tel',
  qui: null,          /* la bande « qui » : l'appel qu'on passe, ou celui de la file */
  carte: null,        /* l'appel qui arrive */
  file: null,         /* « Tout rappeler » */
  reglages: null,
  titre: ''
};

/* ---------- petits outils ---------- */
function telEsc(v){ return (typeof echapper === 'function') ? echapper(v) : String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function telEl(tag, cls, texte){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(texte != null) e.textContent = texte;
  return e;
}
function telBouton(cls, texte, titre, f){
  const b = telEl('button', cls, texte);
  b.type = 'button';
  if(titre) b.title = titre;
  if(f) b.addEventListener('click', f);
  return b;
}
/* « 06 12 34 56 78 » → « +33612345678 » (le format qu'Allo attend) */
function telE164(v){
  let t = String(v || '').trim().replace(/[^\d+]/g, '');
  if(!t) return '';
  if(t.indexOf('00') === 0) t = '+' + t.slice(2);
  if(t.charAt(0) === '0' && t.length === 10) t = '+33' + t.slice(1);
  if(t.charAt(0) !== '+') t = (t.length === 9 ? '+33' : '+') + t;
  return /^\+\d{8,15}$/.test(t) ? t : '';
}
/* « +33612345678 » → « 06 12 34 56 78 » */
function telJoli(v){
  const t = String(v || '');
  const m = t.match(/^\+33(\d{9})$/);
  if(m) return ('0' + m[1]).replace(/(\d{2})(?=\d)/g, '$1 ');
  return t;
}
function telInitiales(n){
  const m = String(n || '').replace(/\([^)]*\)/g, ' ').trim().split(/\s+/).filter(Boolean);
  if(!m.length) return '?';
  return ((m[0] || '').charAt(0) + (m[1] || '').charAt(0)).toUpperCase() || '?';
}
function telPrenomNom(n){
  const mots = String(n || '').replace(/\([^)]*\)/g, ' ').trim().split(/\s+/).filter(Boolean);
  const i = mots.findIndex(w => /[a-zà-ÿ]/.test(w) && w !== w.toUpperCase());
  if(i === -1) return { prenom: mots.slice(1).join(' '), nom: mots[0] || '' };
  return { prenom: mots[i], nom: mots.filter((w, k) => k !== i).join(' ') };
}
function telHeure(ms){ return new Date(ms || Date.now()).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }); }
function telDuree(s){ s = Math.max(0, Math.round(Number(s) || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function telConnecte(){ return typeof ACCES !== 'undefined' && ACCES && ACCES.code; }
function telAdmin(){ return !!(TEL.etat && TEL.etat.admin) || (typeof ACCES !== 'undefined' && ACCES && ACCES.role === 'admin'); }
function telToucher(){ return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); }

/* ============================================================
   LA FENÊTRE D'ALLO ET SES MESSAGES
   ============================================================ */
function telEnvoyer(type, payload){
  const m = { source: 'allo-host', type: type, payload: payload || {} };
  if(!TEL.iframe || !TEL.pret || !TEL.iframe.contentWindow){
    TEL.attente.push(m);
    telCharger();
    return;
  }
  TEL.iframe.contentWindow.postMessage(m, TEL_ORIGINE);
}

/* Le téléphone se charge une fois, et reste chargé : réduire ou fermer
   le panneau ne coupe pas un appel en cours, et la connexion à Allo
   n'est pas à refaire. */
function telCharger(){
  if(TEL.iframe) return;
  telPanneau();
  const f = document.createElement('iframe');
  f.src = TEL_URL;
  f.setAttribute('allow', 'microphone; autoplay');
  f.title = 'Le téléphone d’Allo';
  f.className = 'tlFrame';
  f.addEventListener('load', telInit);
  TEL.iframe = f;
  TEL.pret = false;
  TEL.panneau.querySelector('.tlAllo').appendChild(f);
}
/* « init » jusqu'à ce qu'il réponde « ready » (il peut charger lentement) */
function telInit(){
  let n = 0;
  clearInterval(TEL.minuteurInit);
  const go = () => {
    if(TEL.pret || !TEL.iframe || ++n > 20){ clearInterval(TEL.minuteurInit); return; }
    try{ TEL.iframe.contentWindow.postMessage({ source: 'allo-host', type: 'init', payload: {} }, TEL_ORIGINE); }catch(e){}
  };
  go();
  TEL.minuteurInit = setInterval(go, 1000);
}

window.addEventListener('message', e => {
  if(e.origin !== TEL_ORIGINE) return;
  if(!TEL.iframe || e.source !== TEL.iframe.contentWindow) return;
  const d = e.data;
  if(!d || typeof d !== 'object' || d.source !== 'allo-dialer' || typeof d.type !== 'string') return;
  try{ telEvenement(d.type, d.payload || {}); }catch(x){ console.warn('Téléphone Allo :', x); }
});

function telEvenement(type, p){
  if(type === 'ready'){
    TEL.pret = true;
    clearInterval(TEL.minuteurInit);
    const l = TEL.attente.splice(0);
    l.forEach(m => { try{ TEL.iframe.contentWindow.postMessage(m, TEL_ORIGINE); }catch(e){} });
    telMajBouton();
    return;
  }
  if(type === 'login'){ TEL.connecte = true; telMajBouton(); return; }
  if(type === 'logout'){ TEL.connecte = false; telMajBouton(); return; }
  if(type === 'incoming_call') return telEntrant(p);
  if(type === 'outgoing_call'){
    if(TEL.qui && telE164(p.to) === TEL.qui.numero) TEL.qui.callId = p.call_id;
    return;
  }
  if(type === 'call_answered'){
    if(TEL.carte && TEL.carte.callId === p.call_id){ TEL.carte.etat = 'ligne'; TEL.carte.debut = Date.now(); telDessinerCarte(); telTitreFin(); }
    return;
  }
  if(type === 'call_ended'){
    if(TEL.carte && TEL.carte.callId === p.call_id){ TEL.carte.etat = 'fini'; TEL.carte.duree = p.duration; telDessinerCarte(); telTitreFin(); }
    /* le suivi des appels relit Allo un peu après : l'appel y arrive */
    setTimeout(() => { if(typeof apRelireSiVisible === 'function') apRelireSiVisible(true); }, 20000);
    return;
  }
  if(type.indexOf('power_dialer.') === 0) return telFileEvenement(type.slice(13), p);
}

/* ============================================================
   LE BOUTON 📞 DU HAUT
   ============================================================ */
function telMajBouton(){
  const b = $('telBtn');
  if(!b) return;
  const pt = $('telBtnPoint');
  if(pt) pt.style.display = TEL.pret ? '' : 'none';
  b.title = TEL.pret ? 'Le téléphone (Allo) — prêt' + (TEL.etat && TEL.etat.recoit ? ', les appels entrants sonnent ici' : '')
                     : 'Le téléphone (Allo)';
}

/* ============================================================
   LE PANNEAU
   ============================================================ */
function telPanneau(){
  if(TEL.panneau) return TEL.panneau;
  const p = telEl('div', 'tlPanneau cache');
  p.id = 'telPanneau';
  p.setAttribute('role', 'dialog');
  p.setAttribute('aria-label', 'Le téléphone');
  const tete = telEl('div', 'tlTete');
  tete.appendChild(telEl('span', 'tlEmo', '📞'));
  const titre = telEl('b', 'tlTitre', 'Téléphone');
  tete.appendChild(titre);
  tete.appendChild(telEl('span', 'tlLigne', TEL_LIGNE));
  tete.appendChild(telEl('span', 'tlEsp'));
  const regl = telBouton('tlIc tlRegBtn', '⚙️', 'Qui reçoit les appels entrants (administrateurs)', () => telOuvrir(TEL.vue === 'reglages' ? (TEL.file ? 'file' : 'tel') : 'reglages'));
  tete.appendChild(regl);
  tete.appendChild(telBouton('tlIc', '—', 'Réduire (un appel en cours continue)', telFermer));
  tete.appendChild(telBouton('tlIc', '✕', 'Fermer', () => { telFermer(); if(!TEL.file || TEL.file.etat === 'fini') { TEL.qui = null; TEL.file = null; } }));
  p.appendChild(tete);
  p.appendChild(telEl('div', 'tlHaut'));
  p.appendChild(telEl('div', 'tlAllo'));
  document.body.appendChild(p);
  TEL.panneau = p;
  return p;
}
function telOuvrir(vue){
  telCharger();
  if(vue) TEL.vue = vue;
  TEL.panneau.classList.remove('cache');
  document.body.classList.add('tlOuvert');
  telDessiner();
}
function telFermer(){
  if(!TEL.panneau) return;
  TEL.panneau.classList.add('cache');
  document.body.classList.remove('tlOuvert');
  if(TEL.vue === 'reglages') TEL.vue = TEL.file ? 'file' : 'tel';
}
function telBasculer(){
  if(TEL.panneau && !TEL.panneau.classList.contains('cache')) telFermer();
  else telOuvrir(TEL.file && TEL.file.etat !== 'fini' ? 'file' : 'tel');
}

function telDessiner(){
  const p = TEL.panneau;
  if(!p) return;
  const vue = TEL.vue;
  p.querySelector('.tlTitre').textContent = vue === 'file' ? 'File de rappel' : 'Téléphone';
  p.querySelector('.tlRegBtn').style.display = telAdmin() ? '' : 'none';
  p.querySelector('.tlAllo').style.display = vue === 'reglages' ? 'none' : '';
  const h = p.querySelector('.tlHaut');
  h.innerHTML = '';
  if(vue === 'reglages'){ h.appendChild(telVueReglages()); return; }
  if(vue === 'file' && TEL.file) h.appendChild(telVueFile());
  if(TEL.qui) h.appendChild(telVueQui(TEL.qui));
}

/* ---------- la bande « qui » ---------- */
function telNomDe(d){
  if(!d) return '';
  if(d.genre === 'proche') return (d.libelle || 'Un proche') + ' de ' + d.eleve;
  return d.eleve || d.libelle || d.nomListe || telJoli(d.numero);
}
function telVueQui(d){
  const q = telEl('div', 'tlQui');
  const av = telEl('span', 'tlAv' + (d.couleur ? ' ' + d.couleur : ''));
  av.appendChild(telEl('span', '', d.eleve || d.nomListe ? telInitiales(d.eleve || d.nomListe) : '?'));
  q.appendChild(av);
  const t = telEl('span', 'tlTxt');
  t.appendChild(telEl('b', '', telNomDe(d)));
  let sous = '';
  if(d.sous) sous = d.sous;
  else if(d.chargement) sous = telJoli(d.numero) + ' · je cherche qui c’est…';
  else if(d.genre === 'eleve') sous = 'élève · ' + (d.prochain ? 'prochain cours ' + d.prochain : 'pas de prochain cours dans l’appli');
  else {
    /* le numéro n'est redit que si le titre est un nom */
    const num = (telNomDe(d) === telJoli(d.numero)) ? '' : telJoli(d.numero) + ' · ';
    if(d.genre === 'proche') sous = num + (d.prochain ? 'prochain cours ' + d.prochain : 'un proche');
    else if(d.genre === 'pas_eleve') sous = num + 'pas un élève';
    else if(d.genre === 'ambigu') sous = num + 'numéro de plusieurs fiches';
    else sous = num + 'numéro inconnu de l’appli';
  }
  t.appendChild(document.createTextNode(sous));
  q.appendChild(t);
  if(d.eleve) q.appendChild(telBouton('tlDos', '👤 Dossier', 'Ouvrir son dossier', () => telDossier(d.eleve)));
  /* sur un téléphone, on peut toujours passer par le sien */
  if(telToucher() && d.numero && !d.callId){
    const a = telEl('a', 'tlNatif', '📱');
    a.href = 'tel:' + d.numero;
    a.setAttribute('data-tel-natif', '1');
    a.title = 'Appeler avec mon téléphone plutôt';
    q.appendChild(a);
  }
  return q;
}
function telDossier(nom, onglet){
  if(typeof ouvrirPageEleve !== 'function' || !nom) return;
  ouvrirPageEleve(nom);
  if(onglet && typeof choisirOngletEleve === 'function') setTimeout(() => { try{ choisirOngletEleve(onglet); }catch(e){} }, 60);
  if(window.innerWidth <= 600) telFermer();
}
async function telChercher(numero){
  if(typeof appelPrep !== 'function') return null;
  try{
    const d = await appelPrep({ action: 'telAppelant', numero: numero });
    return (d && d.status === 'ok') ? d : null;
  }catch(e){ return null; }
}

/* ============================================================
   APPELER — tout lien « tel: » de l'appli passe par ici
   ============================================================ */
function telAppeler(numeroBrut){
  const n = telE164(numeroBrut);
  if(!n) return false;
  TEL.qui = { numero: n, chargement: true };
  telOuvrir(TEL.file && TEL.file.etat !== 'fini' ? TEL.vue : 'tel');
  telEnvoyer('dial', { phone_number: n });
  telChercher(n).then(d => {
    if(!TEL.qui || TEL.qui.numero !== n) return;
    TEL.qui = Object.assign({}, d || { genre: 'inconnu' }, { numero: n, callId: TEL.qui.callId });
    telDessiner();
  });
  return true;
}
document.addEventListener('click', e => {
  const a = e.target && e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
  if(!a || a.hasAttribute('data-tel-natif') || !telConnecte() || e.defaultPrevented) return;
  if(e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const num = decodeURIComponent(a.getAttribute('href').slice(4));
  if(!telE164(num)) return;
  e.preventDefault();
  e.stopPropagation();
  telAppeler(num);
}, true);

/* ============================================================
   UN APPEL QUI ARRIVE — la carte de l'appelant
   ============================================================ */
function telEntrant(p){
  const n = telE164(p.from) || String(p.from || '');
  TEL.carte = { numero: n, callId: p.call_id, quand: Date.now(), etat: 'sonne', d: null };
  /* la bande « qui » d'un appel passé avant n'a plus rien à dire */
  if(!(TEL.file && TEL.file.etat !== 'fini')) TEL.qui = null;
  telOuvrir();
  telDessinerCarte();
  telTitreSonne();
  telChercher(n).then(d => {
    if(!TEL.carte || TEL.carte.numero !== n) return;
    TEL.carte.d = d || { genre: 'inconnu', numero: n };
    telDessinerCarte();
  });
}
function telDessinerCarte(){
  let c = $('telCarte');
  const k = TEL.carte;
  if(!k){ if(c) c.remove(); telPlace(); return; }
  if(!c){ c = telEl('div', 'tlCarte'); c.id = 'telCarte'; c.setAttribute('role', 'status'); document.body.appendChild(c); }
  c.innerHTML = '';
  c.classList.toggle('fini', k.etat === 'fini');
  const d = k.d || { genre: 'inconnu', numero: k.numero, chargement: true };
  const h = telEl('div', 'tlH');
  h.appendChild(telEl('span', 'tlDot'));
  h.appendChild(document.createTextNode(
    k.etat === 'sonne' ? 'APPEL ENTRANT · ' + telHeure(k.quand)
    : k.etat === 'ligne' ? 'EN LIGNE · DEPUIS ' + telHeure(k.debut)
    : 'APPEL TERMINÉ' + (k.duree ? ' · ' + telDuree(k.duree) : '') + ' · ' + telHeure(k.quand)));
  c.appendChild(h);
  c.appendChild(telEl('div', 'tlNom', telNomDe(Object.assign({ numero: k.numero }, d))));
  c.appendChild(telEl('div', 'tlRole',
    d.chargement ? telJoli(k.numero) + ' · je cherche qui c’est…'
    : d.genre === 'eleve' ? 'élève · ' + telJoli(k.numero)
    : d.genre === 'proche' ? 'un proche · ' + telJoli(k.numero)
    : d.genre === 'pas_eleve' ? 'pas un élève · ' + telJoli(k.numero)
    : d.genre === 'ambigu' ? 'numéro de plusieurs fiches : je ne devine pas qui · ' + telJoli(k.numero)
    : 'numéro inconnu de l’appli · ' + telJoli(k.numero)));
  const f = telEl('div', 'tlFaits');
  const fait = (emo, txt) => { const l = telEl('div'); l.append(telEl('span', '', emo), telEl('span', '', txt)); f.appendChild(l); };
  if(d.eleve) fait('📅', d.prochain ? 'Prochain cours : ' + d.prochain : 'Pas de prochain cours dans l’appli');
  if(d.rappel) fait('⏰', 'À rappeler depuis l’appel du ' + (d.rappel.jour ? d.rappel.jour.split('-').reverse().slice(0, 2).join('/') + ' ' : '') + (d.rappel.heure || ''));
  if(d.ia && d.ia.length) fait('🤖', 'Aujourd’hui, l’IA d’Allo : ' + d.ia.map(x => String(x.resume || '').replace(/^\S+\s/, '') + ' (' + x.heure + ')').join(' · '));
  (d.messages || []).forEach(m => fait('✉️', 'Message posé pour l’IA : « ' + m + ' »'));
  if(f.children.length) c.appendChild(f);
  const act = telEl('div', 'tlAct');
  if(d.eleve){
    act.appendChild(telBouton('vert', '👤 Ouvrir son dossier', '', () => telDossier(d.eleve)));
    act.appendChild(telBouton('', '📞 Ses appels', '', () => telDossier(d.eleve, 'appels')));
  }
  act.appendChild(telBouton('', '✕', 'Fermer la carte', () => { TEL.carte = null; telDessinerCarte(); telTitreFin(); }));
  c.appendChild(act);
  telPlace();
}
/* Sur un téléphone, la carte est en haut et le téléphone monte du bas :
   le téléphone se raccourcit pour ne jamais passer sous la carte (son ✕
   et son — restent visibles). */
function telPlace(){
  const p = TEL.panneau;
  if(!p) return;
  const c = $('telCarte');
  if(c && window.innerWidth <= 600){
    const bas = c.getBoundingClientRect().bottom;
    p.style.maxHeight = Math.max(320, Math.round(window.innerHeight - bas - 10)) + 'px';
  }else p.style.maxHeight = '';
}
window.addEventListener('resize', () => { if(TEL.panneau) telPlace(); });
/* L'onglet du navigateur le dit aussi, quand on est ailleurs */
function telTitreSonne(){
  if(!TEL.titre) TEL.titre = document.title;
  document.title = '📞 Appel entrant…';
}
function telTitreFin(){
  if(TEL.titre){ document.title = TEL.titre; TEL.titre = ''; }
}

/* ============================================================
   TOUT RAPPELER — la file d'Allo (Power Dialer), dans l'appli
   ============================================================ */
function telToutRappeler(appels){
  const items = [];
  const contacts = [];
  (appels || []).forEach(a => {
    const n = telE164(a.numero);
    if(!n) return;
    const nom = a.eleve || a.libelle || a.nomEntendu || '';
    const pn = a.eleve ? telPrenomNom(a.eleve) : { prenom: nom, nom: '' };
    contacts.push({ phone_number: n, name: pn.prenom || '', last_name: pn.nom || '', company: '', job_title: '',
                    external_id: String(a.id) });
    const quand = (a.statut === 'ia' ? 'IA ' : a.statut === 'manque' ? 'manqué ' : '') + (a.heure || '');
    items.push({ id: String(a.id), numero: n, nom: nom, eleve: a.eleve || '', sous: quand, etat: '' });
  });
  if(!contacts.length){ if(typeof showToast === 'function') showToast('Aucun numéro à rappeler.'); return; }
  TEL.file = { items: items, i: -1, etat: 'prep', msg: '' };
  TEL.qui = null;
  telOuvrir('file');
  telEnvoyer('power_dialer.queue', { contacts: contacts, replace: true });
}
function telFileEvenement(t, p){
  const F = TEL.file;
  if(t === 'queued'){
    if(F && F.etat === 'prep'){ F.etat = 'attend'; telEnvoyer('power_dialer.start', {}); }
  }else if(t === 'start_blocked'){
    if(!F) return;
    F.etat = 'bloque';
    F.msg = ({
      user_gesture_required: 'Appuie sur « Démarrer » dans l’écran d’Allo, ci-dessous.',
      no_line: 'Ton compte Allo n’a pas de ligne pour appeler.',
      empty_queue: 'La file est vide.',
      not_entitled: 'Ton compte Allo n’a pas la file d’appels : rappelle avec 📞, un par un.'
    })[p && p.reason] || 'Allo n’a pas pu lancer la file' + (p && p.reason ? ' (' + p.reason + ')' : '') + '.';
  }else if(t === 'session_started' || t === 'resumed'){
    if(F){ F.etat = 'cours'; F.msg = ''; }
  }else if(t === 'paused'){
    if(F){ F.etat = 'pause'; F.msg = 'En pause.'; }
  }else if(t === 'call_started'){
    if(!F) return;
    const id = String((p && p.contact && p.contact.external_id) || '');
    const i = F.items.findIndex(x => x.id === id);
    if(i === -1) return;
    F.items.forEach((x, k) => { if(x.etat === 'on' && k !== i) x.etat = 'fait'; });
    F.i = i;
    F.items[i].etat = 'on';
    F.etat = 'cours';
    const it = F.items[i];
    TEL.qui = { numero: it.numero, chargement: true, nomListe: it.nom, eleve: it.eleve, couleur: 'rouge' };
    telChercher(it.numero).then(d => {
      if(!TEL.qui || TEL.qui.numero !== it.numero) return;
      TEL.qui = Object.assign({}, d || { genre: 'inconnu' }, { numero: it.numero, nomListe: it.nom, couleur: 'rouge' });
      telDessiner();
    });
  }else if(t === 'call_ended'){
    if(F && F.i >= 0 && F.items[F.i]){
      F.items[F.i].etat = 'fait';
      if(p && p.result) F.items[F.i].resultat = String(p.result);
    }
  }else if(t === 'session_ended'){
    if(F){ F.etat = 'fini'; F.items.forEach(x => { if(x.etat === 'on') x.etat = 'fait'; }); F.msg = 'File terminée.'; }
    setTimeout(() => { if(typeof apRelireSiVisible === 'function') apRelireSiVisible(true); }, 20000);
  }else if(t === 'error'){
    if(F) F.msg = 'Allo : ' + String((p && (p.message || p.code)) || 'erreur');
  }else return;
  if(TEL.vue === 'file') telDessiner();
}
function telVueFile(){
  const F = TEL.file;
  const z = telEl('div', 'tlFile');
  const faits = F.items.filter(x => x.etat === 'fait').length;
  const pos = F.i >= 0 ? F.i + 1 : Math.min(faits + 1, F.items.length);
  const t = telEl('div', 'tlFT', '⏰ À RAPPELER · ' + pos + ' / ' + F.items.length);
  z.appendChild(t);
  const bar = telEl('div', 'tlBar');
  const i = telEl('i');
  i.style.width = Math.round(100 * faits / Math.max(1, F.items.length)) + '%';
  bar.appendChild(i);
  z.appendChild(bar);
  const ol = telEl('ol');
  F.items.forEach(x => {
    const li = telEl('li', x.etat);
    if(x.etat === 'on') li.appendChild(document.createTextNode('▶ '));
    li.appendChild(telEl('b', '', x.nom || telJoli(x.numero)));
    if(x.nom) li.appendChild(document.createTextNode(' · ' + telJoli(x.numero)));
    li.appendChild(telEl('small', '', x.sous || ''));
    ol.appendChild(li);
  });
  z.appendChild(ol);
  if(F.msg) z.appendChild(telEl('div', 'tlMsg', F.msg));
  if(F.etat === 'bloque') z.appendChild(telBouton('tlRelance', '▶ Démarrer la file', '', () => { F.msg = ''; F.etat = 'attend'; telEnvoyer('power_dialer.start', {}); telDessiner(); }));
  if(F.etat === 'prep' || F.etat === 'attend') z.appendChild(telEl('div', 'tlMsg', 'Envoi de la file à Allo… (connecte-toi dans l’écran d’Allo si on te le demande)'));
  return z;
}

/* ============================================================
   ⚙️ QUI REÇOIT LES APPELS ENTRANTS — administrateurs
   ============================================================ */
function telVueReglages(){
  const z = telEl('div', 'tlRegl');
  z.appendChild(telEl('h4', '', '⚙️ Qui reçoit les appels entrants'));
  z.appendChild(telEl('p', '', 'Coché : son appli sonne et montre la carte de l’appelant. Décoché : il peut appeler (📞, Rappeler, la file), mais rien ne sonne chez lui. Réglé par les administrateurs, personne par personne.'));
  const R = TEL.reglages;
  if(!R){
    z.appendChild(telEl('p', '', 'Chargement…'));
    telChargerReglages();
  }else if(R.erreur){
    z.appendChild(telEl('p', 'tlErr', R.erreur));
  }else{
    R.equipe.forEach(x => {
      const l = telEl('div', 'tlPers');
      l.appendChild(telEl('span', 'tlRond', telInitiales(x.nom)));
      const n = telEl('span', 'tlNomP', x.nom);
      n.appendChild(telEl('small', '', ({ admin: 'administrateur', bureau: 'bureau', moniteur: 'moniteur' })[x.role] || x.role));
      l.appendChild(n);
      const b = telBouton('tlInter' + (x.recoit ? ' on' : ''), '', (x.recoit ? 'Ne plus faire sonner chez ' : 'Faire sonner chez ') + x.nom, () => telPoserReglage(x, b));
      b.setAttribute('role', 'switch');
      b.setAttribute('aria-checked', x.recoit ? 'true' : 'false');
      b.setAttribute('aria-label', 'Les appels entrants sonnent chez ' + x.nom);
      l.appendChild(b);
      z.appendChild(l);
    });
  }
  z.appendChild(telBouton('tlRetour', '← Le téléphone', '', () => telOuvrir(TEL.file ? 'file' : 'tel')));
  return z;
}
async function telChargerReglages(){
  if(TEL.reglagesEnCours) return;
  TEL.reglagesEnCours = true;
  try{
    const d = await appelPrep({ action: 'telReglages' });
    TEL.reglages = (d && d.status === 'ok') ? { equipe: d.equipe || [] } : { erreur: (d && d.message) || 'Lecture impossible.' };
  }catch(e){
    TEL.reglages = { erreur: e.message || String(e) };
  }finally{ TEL.reglagesEnCours = false; }
  if(TEL.vue === 'reglages') telDessiner();
}
async function telPoserReglage(x, b){
  b.disabled = true;
  try{
    const d = await appelPrep({ action: 'telReglagePoser', cle: x.cle, recoit: !x.recoit });
    if(d && d.status === 'ok'){
      TEL.reglages = { equipe: d.equipe || [] };
      /* c'est moi : mon appli se met à sonner (ou plus) tout de suite */
      const moi = (typeof normaliserMot === 'function') ? normaliserMot((ACCES && ACCES.moniteur) || '') : '';
      const m = (d.equipe || []).find(y => typeof normaliserMot === 'function' && normaliserMot(y.nom) === moi);
      if(m && TEL.etat) TEL.etat.recoit = !!m.recoit;
      telMajBouton();
    }else if(typeof showToast === 'function') showToast((d && d.message) || 'Impossible.');
  }catch(e){ if(typeof showToast === 'function') showToast('Impossible : ' + (e.message || e)); }
  telDessiner();
}

/* ============================================================
   LE DÉMARRAGE — après la connexion, et à chaque changement de compte
   ============================================================ */
async function telDemarrer(){
  const b = $('telBtn');
  if(b){
    b.style.display = 'inline-flex';
    if(!b.dataset.branche){ b.dataset.branche = 'oui'; b.addEventListener('click', telBasculer); }
  }
  TEL.etat = null;
  TEL.reglages = null;
  telMajBouton();
  try{
    const d = await appelPrep({ action: 'telEtat' });
    if(d && d.status === 'ok') TEL.etat = { recoit: !!d.recoit, admin: !!d.admin };
  }catch(e){ TEL.etat = null; }
  /* ⚠️ coché seulement : son téléphone se charge et peut sonner */
  if(TEL.etat && TEL.etat.recoit) telCharger();
  telMajBouton();
}
function telArreter(){
  const b = $('telBtn');
  if(b) b.style.display = 'none';
  clearInterval(TEL.minuteurInit);
  if(TEL.panneau) TEL.panneau.remove();
  Object.assign(TEL, { etat: null, iframe: null, pret: false, connecte: false, attente: [], panneau: null,
                       vue: 'tel', qui: null, carte: null, file: null, reglages: null });
  document.body.classList.remove('tlOuvert');
  telDessinerCarte();
  telTitreFin();
}
setInterval(() => {
  const code = telConnecte() ? String(ACCES.code) : '';
  if(code === TEL.session) return;
  if(TEL.session) telArreter();
  TEL.session = code;
  if(code) telDemarrer();
}, 1500);

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-telephone.js'] = true;
