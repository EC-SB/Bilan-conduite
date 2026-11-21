/* Déployé le 21/11/2026 à 12:00 — v1527 */
/* ============================================================
   ec-liens.js — 🔗 LES LIENS DANS CE QU'ON ÉCRIT — v1527

   David, le 21 novembre : « dans Ce qu'on écrit et envoie, fais en
   sorte qu'on puisse mettre des hyperliens, et dans Lien élève qu'on
   puisse mettre un lien vers n'importe où dans l'app aussi ». Ses choix :
   · « 🔗 Lien » : on sélectionne un mot, on colle l'adresse, le mot
     devient cliquable dans le mail ou le message envoyé. Dans le texte,
     il s'écrit [le mot](https://…) ;
   · « 🔗 Lien élève » : au moment d'insérer, l'espace élève (une page,
     ou une étape d'un guide comme avant) OU l'App équipe (un écran) :
       📱 Titre : https://eleve…/?vue=code       → une page de son espace
       🎬 Titre : https://eleve…/?seg=guide::étape → une étape (v1407)
       🧭 Titre : https://app…/?ou=eleves/rappels  → un écran de l'App
   Là où le texte arrive, ces liens se touchent : le mail (HTML), la
   messagerie de l'équipe, l'espace élève (eleve.html). Copié, un
   [mot](adresse) devient « mot (adresse) ».
   ============================================================ */

const LIEN_MD_RE = /\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/g;
/* [mot](adresse) → « mot (adresse) », pour ce qui ne lit pas le HTML (copier, SMS) */
function liensMdEnTexte(t){ return String(t == null ? '' : t).replace(LIEN_MD_RE, '$1 ($2)'); }
function echLien(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* ---------- l'App équipe : une adresse vers un écran ---------- */
function baseDeLApp(){ return location.origin + location.pathname.replace(/[^/]*$/, ''); }
function lienVersLApp(x){
  return baseDeLApp() + '?ou=' + encodeURIComponent([x.onglet, x.vue || '', x.eleve || ''].join('/').replace(/\/+$/, ''));
}
function placeDuLienApp(u){
  try{
    const url = new URL(u, location.href);
    if(url.origin !== location.origin) return null;
    const ou = url.searchParams.get('ou');
    if(!ou) return null;
    const k = ou.split('/');
    return { onglet: k[0] || '', vue: k[1] || '', eleve: k.slice(2).join('/') || '' };
  }catch(e){ return null; }
}
function allerALaPlaceDuLien(p){
  if(!p || !p.onglet) return false;
  try{
    if(typeof afficherOnglet === 'function') afficherOnglet(p.onglet);
    if(p.vue && typeof afficherVue === 'function') afficherVue(p.onglet, p.vue);
    if(p.vue && typeof reveillerVue === 'function') reveillerVue(p.vue);
    if(p.eleve && typeof ouvrirPageEleve === 'function'){
      if(typeof afficherVue === 'function' && p.onglet === 'eleves' && !p.vue) afficherVue('eleves', 'dossier');
      ouvrirPageEleve(p.eleve);
    }
    window.scrollTo(0, 0);
    return true;
  }catch(e){ return false; }
}
/* L'App ouverte par un lien « ?ou= » : on y va une fois connecté, puis l'adresse redevient propre */
(function(){
  let p = null;
  try{ p = placeDuLienApp(location.href); }catch(e){ p = null; }
  if(!p) return;
  let n = 0;
  const t = setInterval(() => {
    n++;
    const pret = typeof ACCES !== 'undefined' && ACCES && ACCES.code && typeof afficherOnglet === 'function';
    if(!pret && n < 1200) return;   /* 10 minutes pour se connecter */
    clearInterval(t);
    if(pret) setTimeout(() => allerALaPlaceDuLien(p), 400);
    try{ const u = new URL(location.href); u.searchParams.delete('ou'); history.replaceState(null, '', u.pathname + u.search + u.hash); }catch(e){}
  }, 500);
})();
/* Un lien vers l'App, touché dans l'App : on y va sans recharger */
document.addEventListener('click', ev => {
  const a = ev.target && ev.target.closest && ev.target.closest('a[href]');
  if(!a || ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
  const p = placeDuLienApp(a.getAttribute('href'));
  if(!p) return;
  ev.preventDefault();
  allerALaPlaceDuLien(p);
});

/* ---------- les liens d'un texte, en nœuds (la messagerie de l'équipe) ---------- */
function noeudsAvecLiensEC(texte){
  const frag = document.createDocumentFragment();
  const t = String(texte == null ? '' : texte);
  /* les morceaux : [mot](adresse), « 🧭 Titre : adresse », une adresse nue */
  const re = /\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)|(📱|🎬|🧭)\s*([^\n:]{0,120}?)\s*:\s*(https?:\/\/[^\s]+)|(https?:\/\/[^\s<>"]+)/g;
  let i = 0, m;
  while((m = re.exec(t))){
    if(m.index > i) frag.appendChild(document.createTextNode(t.slice(i, m.index)));
    let u, txt, fin = '';
    if(m[1]){ u = m[2]; txt = m[1]; }
    else if(m[3]){ u = m[5]; txt = m[3] + ' ' + (m[4] || 'Ouvrir'); }
    else { u = m[6]; fin = (u.match(/[.,;:!?)\]»]+$/) || [''])[0]; if(fin) u = u.slice(0, -fin.length); txt = u; }
    const a = document.createElement('a');
    a.href = u;
    a.textContent = txt;
    a.className = 'lienTexteEC';
    const place = placeDuLienApp(u);
    if(!place){ a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.addEventListener('click', e => {
      e.stopPropagation();   /* la bulle a ses propres gestes au toucher */
      if(place && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey){ e.preventDefault(); allerALaPlaceDuLien(place); }
    });
    frag.appendChild(a);
    if(fin) frag.appendChild(document.createTextNode(fin));
    i = m.index + m[0].length;
  }
  if(i < t.length) frag.appendChild(document.createTextNode(t.slice(i)));
  return frag;
}
/* du HTML déjà échappé (le mail) : [mot](adresse) → <a> */
function liensMdEnHtml(htmlEchappe){
  return String(htmlEchappe || '').replace(/\[([^\]\n<]{1,200})\]\((https?:\/\/[^\s)<"]+)\)/g, (m, x, u) =>
    '<a href="' + u.replace(/"/g, '%22') + '">' + x + '</a>');
}

/* ---------- les boutons de la fiche ---------- */
/* 🔗 Lien : le mot sélectionné devient [mot](adresse) */
async function insererHyperlienDans(zone){
  if(!zone) return false;
  const d = zone.selectionStart, f = zone.selectionEnd;
  const v = zone.value;
  let mot = (typeof d === 'number' && typeof f === 'number' && f > d) ? v.slice(d, f) : '';
  const deja = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(mot);
  if(deja) mot = deja[1];
  const u = await demander('L’adresse du lien (https://…) :', deja ? deja[2] : 'https://', '🔗 Lien');
  if(u === null || u === undefined) return false;
  const adr = String(u).trim();
  if(!/^https?:\/\/\S+$/i.test(adr)){ if(typeof showToast === 'function') showToast('Une adresse qui commence par https://'); return false; }
  if(!mot.trim()){
    const m2 = await demander('Le mot (ou la phrase) qui se touchera :', '', '🔗 Lien');
    if(!m2 || !String(m2).trim()) return false;
    mot = String(m2).trim();
  }
  const md = '[' + mot.replace(/[\[\]\n]/g, ' ').trim() + '](' + adr.replace(/\)/g, '%29') + ')';
  const p = typeof d === 'number' ? d : v.length, q = typeof f === 'number' ? f : p;
  zone.value = v.slice(0, p) + md + v.slice(q);
  try{ zone.focus(); zone.setSelectionRange(p + md.length, p + md.length); }catch(e){}
  zone.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

/* 🔗 Lien élève : où ? (une page de son espace, une étape, un écran de l'App) */
const PAGES_ESPACE_ELEVE = [
  ['accueil', '🏠 Accueil'], ['reviser', '🎬 Réviser'], ['verifs', '🧰 Vérifs'], ['code', '🚦 Code'],
  ['reciter', '📋 Réciter'], ['messages', '💬 Écrire (sa messagerie)'], ['bilan', '📝 Mon bilan']
];
function modaleLienEC(titre, aide){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal lienChoix';
  boite.style.cssText = 'max-width:min(520px, 95vw);max-height:88vh;overflow-y:auto;';
  boite.innerHTML = '<h3>' + echLien(titre) + '</h3>' + (aide ? '<div class="etElAide">' + echLien(aide) + '</div>' : '');
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };
  return { fond, boite, fermer };
}
function boutonLienEC(boite, texte, sous, faire, principal){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn ' + (principal ? 'btn-primary' : 'btn-secondary') + ' etElLigne';
  b.style.cssText = 'display:block;width:100%;text-align:left;margin:6px 0;';
  b.textContent = texte;
  if(sous){ const s = document.createElement('small'); s.style.cssText = 'display:block;font-weight:400;opacity:.75;'; s.textContent = sous; b.appendChild(s); }
  b.addEventListener('click', faire);
  boite.appendChild(b);
  return b;
}
function choisirOuVaLeLien(){
  return new Promise(resolve => {
    const m = modaleLienEC('🔗 Un lien vers…', 'Choisis où mène le lien : l’espace de l’élève, ou un écran de l’App de l’équipe.');
    const fin = r => { m.fermer(); resolve(r); };
    boutonLienEC(m.boite, '📱 Une page de l’espace élève', 'Accueil, Réviser, Vérifs, Code, Réciter, Écrire, Mon bilan', () => fin('page'), true);
    boutonLienEC(m.boite, '🎬 Une étape d’un guide', 'Le groupe, le guide, l’étape (comme avant)', () => fin('etape'));
    boutonLienEC(m.boite, '🧭 Un écran de l’App équipe', 'Un onglet, une de ses vues, et si tu veux le dossier d’un élève', () => fin('app'));
    const a = document.createElement('div'); a.className = 'btn-row';
    const bA = document.createElement('button'); bA.type = 'button'; bA.className = 'btn btn-secondary'; bA.textContent = 'Annuler';
    bA.addEventListener('click', () => fin(null)); a.appendChild(bA); m.boite.appendChild(a);
  });
}
function choisirUnePageEleve(){
  return new Promise(resolve => {
    const m = modaleLienEC('📱 Une page de l’espace élève', 'Le lien ouvre son espace sur cette page.');
    const fin = r => { m.fermer(); resolve(r); };
    PAGES_ESPACE_ELEVE.forEach(([cle, nom]) => boutonLienEC(m.boite, nom, '', () => fin({ cle: cle, titre: nom.replace(/^\S+\s/, '') })));
    const a = document.createElement('div'); a.className = 'btn-row';
    const bA = document.createElement('button'); bA.type = 'button'; bA.className = 'btn btn-secondary'; bA.textContent = 'Annuler';
    bA.addEventListener('click', () => fin(null)); a.appendChild(bA); m.boite.appendChild(a);
  });
}
/* Les onglets et leurs vues, tels que CETTE personne les voit (la barre du haut, les rails) */
function ecransDeLApp(){
  const out = [];
  document.querySelectorAll('#barreOnglets .onglet[data-cible]').forEach(b => {
    if(b.hidden) return;
    const o = b.getAttribute('data-cible');
    const nom = [...b.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim() || o;
    const emo = ((b.querySelector('span.emo') || b.querySelector('span:not(.vgl):not(.alerte)') || {}).textContent || '').trim();
    const vues = [];
    document.querySelectorAll('.barre-vues[data-pour="' + o + '"] button[data-vue-cible]').forEach(v => {
      const cle = v.getAttribute('data-vue-cible');
      if(vues.some(x => x.cle === cle)) return;
      const n = v.querySelector('.nomVue') ? v.querySelector('.nomVue').textContent : v.textContent;
      vues.push({ cle: cle, nom: String(n || cle).replace(/\s+/g, ' ').trim() });
    });
    out.push({ onglet: o, nom: nom, emo: emo, vues: vues });
  });
  return out;
}
function choisirUnEcranDeLApp(){
  return new Promise(resolve => {
    const m = modaleLienEC('🧭 Un écran de l’App équipe', 'L’onglet, puis la vue. Pour le dossier d’un élève : Élèves › Dossier élève, puis son nom.');
    const fin = r => { m.fermer(); resolve(r); };
    const zone = document.createElement('div');
    m.boite.appendChild(zone);
    const pied = document.createElement('div'); pied.className = 'btn-row';
    const bA = document.createElement('button'); bA.type = 'button'; bA.className = 'btn btn-secondary'; bA.textContent = 'Annuler';
    bA.addEventListener('click', () => fin(null)); pied.appendChild(bA); m.boite.appendChild(pied);
    const ecrans = ecransDeLApp();
    const etape1 = () => {
      zone.innerHTML = '';
      ecrans.forEach(e => boutonLienEC(zone, (e.emo ? e.emo + ' ' : '') + e.nom, e.vues.length ? e.vues.length + ' vue' + (e.vues.length > 1 ? 's' : '') : '', () => {
        if(!e.vues.length) return fin({ onglet: e.onglet, titre: e.nom });
        etape2(e);
      }));
    };
    const etape2 = e => {
      zone.innerHTML = '';
      boutonLienEC(zone, '← ' + e.nom, '', etape1);
      e.vues.forEach(v => boutonLienEC(zone, v.nom, '', () => {
        if(e.onglet === 'eleves' && v.cle === 'dossier') return etape3(e, v);
        fin({ onglet: e.onglet, vue: v.cle, titre: e.nom + ' › ' + v.nom });
      }));
    };
    const etape3 = (e, v) => {
      zone.innerHTML = '';
      boutonLienEC(zone, '← ' + e.nom, '', () => etape2(e));
      const ch = document.createElement('input');
      ch.type = 'text'; ch.placeholder = 'Le nom de l’élève'; ch.setAttribute('list', 'lienElevesListe');
      const dl = document.createElement('datalist'); dl.id = 'lienElevesListe';
      ((typeof fichesEleves !== 'undefined' && fichesEleves) || []).slice(0, 3000).forEach(f => { const o = document.createElement('option'); o.value = f.eleve; dl.appendChild(o); });
      zone.append(ch, dl);
      boutonLienEC(zone, '✅ Le dossier de cet élève', '', () => {
        const n = ch.value.trim();
        if(!n) return;
        fin({ onglet: 'eleves', vue: 'dossier', eleve: n, titre: 'Dossier de ' + n });
      }, true);
      boutonLienEC(zone, 'Dossier élève (sans élève choisi)', '', () => fin({ onglet: 'eleves', vue: 'dossier', titre: e.nom + ' › ' + v.nom }));
      setTimeout(() => ch.focus(), 40);
    };
    etape1();
  });
}
/* La ligne posée au curseur */
function poserUneLigneDans(zone, ligne){
  const v = zone.value;
  const p = typeof zone.selectionStart === 'number' ? zone.selectionStart : v.length;
  const q = typeof zone.selectionEnd === 'number' ? zone.selectionEnd : p;
  const avant = v.slice(0, p), apres = v.slice(q);
  const t = (avant && !/\n$/.test(avant) ? '\n' : '') + ligne + (apres && !/^\n/.test(apres) ? '\n' : '');
  zone.value = avant + t + apres;
  const c = (avant + t).length;
  try{ zone.focus(); zone.setSelectionRange(c, c); }catch(e){}
  zone.dispatchEvent(new Event('input', { bubbles: true }));
}
async function insererLienPartoutDans(zone){
  if(!zone) return false;
  const d = zone.selectionStart, f = zone.selectionEnd;
  const ou = await choisirOuVaLeLien();
  if(!ou) return false;
  try{ zone.setSelectionRange(d, f); }catch(e){}
  if(ou === 'etape') return (typeof insererLienEleveDans === 'function') ? insererLienEleveDans(zone) : false;
  if(ou === 'page'){
    const x = await choisirUnePageEleve();
    if(!x) return false;
    const base = (typeof baseDuLienEleve === 'function') ? baseDuLienEleve() : String((typeof CONFIG !== 'undefined' && CONFIG.LIEN_ELEVE) || '');
    try{ zone.setSelectionRange(d, f); }catch(e){}
    poserUneLigneDans(zone, '📱 ' + x.titre + ' : ' + base + '?vue=' + x.cle);
    return true;
  }
  const x = await choisirUnEcranDeLApp();
  if(!x) return false;
  try{ zone.setSelectionRange(d, f); }catch(e){}
  poserUneLigneDans(zone, '🧭 ' + x.titre + ' : ' + lienVersLApp(x));
  return true;
}
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-liens.js'] = true;
