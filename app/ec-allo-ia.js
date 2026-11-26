/* Déployé le 26/11/2026 à 12:22 — v1581 */
/* ============================================================
   ec-allo-ia.js — v1511
   🤖 L'IA D'ALLO BRANCHÉE SUR L'APPLI

   David, les 19 et 20 novembre : que l'IA qui décroche chez Allo
   sache qui appelle et ce qu'elle peut lui dire, qu'elle suive les
   consignes écrites ici, qu'elle puisse renvoyer l'accès, laisser une
   demande au bureau et prévenir d'un retard — et « toujours voir ce
   qui se passe » dans le suivi des appels et dans chaque dossier.
   Schéma validé le 19/11 ; ses choix du 20/11 : un connecteur (Allo
   lie lui-même le numéro de l'appelant), les consignes passent par
   lui, un retard va au moniteur du cours et au bureau.

   Trois endroits, un seul fichier :
     📞 Gestion › L'outil › L'IA d'Allo (administrateurs)
        ✅ Ce qu'elle peut dire · 📜 Ses consignes · 🕘 Versions, et
        comment brancher le connecteur dans Allo.
     🤖 L'onglet « IA d'Allo » du dossier (droit 📞 Suivi des appels)
        Comme pour tous / Oui / Non, case par case ; les messages pour
        l'élève ou ses proches ; ce qu'elle dirait aujourd'hui.
     📞 Les appels (ec-suivi-appels.js appelle blocIaAllo)
        « 🤖 Ce que l'IA d'Allo a fait », appel par appel.

   ⚠️ CE QU'ELLE NE DIT JAMAIS N'A PAS DE CASE. Résultats d'examen,
   notes internes, ce qui regarde un autre élève, son code d'accès :
   le Worker ne les lit même pas. La ligne « 🚫 Jamais » est grisée
   et le reste — une case qu'on ne peut pas cocher dit mieux qu'une
   phrase que la porte est murée.
   ============================================================ */

const ALLO_IA_DIRE = [
  ['prochain', '📅 Son prochain cours', 'jour, heure, moniteur, lieu de départ'],
  ['bilan', '🧾 Le bilan de son dernier cours', 'le résumé relu par le moniteur (historique des cours) — jamais la transcription ni les notes internes'],
  ['code', '🎓 Ses séances de code', 'faites, et ce qui reste sur 12'],
  ['heures', '🚗 Ses heures de conduite faites et restantes', ''],
  ['examen', '🎓 Sa date d’examen du permis', ''],
  ['reste', '💶 Le reste à payer', ''],
  ['creneaux', '🗓️ Les créneaux libres', 'pour proposer — elle ne réserve pas, elle laisse la demande au bureau'],
  ['manque', '📄 Ce qui manque à son dossier', ''],
  ['agences', '🏢 Horaires et adresse des agences', '']
];
const ALLO_IA_FAIRE = [
  ['acces', '📧 Renvoyer son accès à l’App Évolution Conduites', 'par mail uniquement, à l’adresse de sa fiche — et lui expliquer comment entrer et ce qu’il y trouve'],
  ['demande', '📝 Laisser une demande au bureau', 'elle arrive dans 💬 la messagerie du bureau, avec le numéro et ce qui a été dit'],
  ['retard', '⏰ Prévenir d’un retard', 'une alerte pour le moniteur du cours et le bureau, comme quand l’élève le signale de son App']
];
const ALLO_IA_RECONNAIT = [
  ['numEleve', '📱 Le numéro de l’élève', 'celui de sa fiche'],
  ['numProches', '👪 Les numéros de ses proches', 'ceux rangés dans 📞 Suivi des appels']
];
const ALLO_IA_DOSSIER = [
  ['prochain', '📅 Son prochain cours'], ['bilan', '🧾 Le bilan de son dernier cours'], ['code', '🎓 Ses séances de code'],
  ['heures', '🚗 Ses heures de conduite'], ['examen', '🎓 Sa date d’examen'], ['reste', '💶 Le reste à payer'],
  ['acces', '📧 Renvoyer son accès par mail']
];
const ALLO_IA_COURT = { prochain: '📅 prochain cours', bilan: '🧾 dernier cours', code: '🎓 code', heures: '🚗 heures',
  examen: '🎓 date d’examen', reste: '💶 reste à payer', acces: '📧 accès par mail' };
const ALLO_IA_POUR = [['tous', 'L’élève et ses proches'], ['eleve', 'L’élève seul'], ['proches', 'Ses proches seulement']];
const ALLO_IA_QUAND = [['debut', 'Dès le début de l’appel'], ['demande', 'Seulement si on lui demande']];
const ALLO_IA_ADRESSE = ((typeof CONFIG !== 'undefined' && CONFIG.WORKER_URL) || 'https://bilan-proxy.evolutionconduites.workers.dev') + '/allo-mcp';
const ALLO_IA_PHRASE = 'Au tout début de chaque appel, appelle l’outil debut_appel et suis ses consignes pendant tout l’appel.';

let alloIaEtat = null;
let alloIaSous = 'dire';

function alloEl(tag, cls, texte){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(texte !== undefined && texte !== null) e.textContent = texte;
  return e;
}
function alloJourHeure(ms){
  if(!ms) return '';
  const d = new Date(ms);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' à ' +
         d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
}
function alloJour(ms){ return ms ? new Date(ms).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : ''; }
function alloIlYA(ms){
  const m = Math.round((Date.now() - ms) / 60000);
  if(m < 1) return 'à l’instant';
  if(m < 60) return 'il y a ' + m + ' min';
  if(m < 48 * 60) return 'il y a ' + Math.round(m / 60) + ' h';
  return 'le ' + alloJourHeure(ms);
}
function alloPrenom(nom){
  const mots = String(nom || '').replace(/\([^)]*\)/g, ' ').trim().split(/\s+/).filter(Boolean);
  return mots.find(w => /[a-zà-ÿ]/.test(w) && w !== w.toUpperCase()) || mots[0] || '';
}
function alloIsoPlus(n){
  const d = new Date(Date.now() + n * 86400000);
  return d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}
function alloIsoFr(iso){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || ''); }
function alloToast(t){ if(typeof showToast === 'function') showToast(t); }

/* Une case à cocher du réglage (le patron du schéma : emoji, titre, petite ligne) */
function alloCase(titre, petit, coche, actif, changer){
  const l = alloEl('label', 'alCase');
  const i = document.createElement('input');
  i.type = 'checkbox';
  i.checked = !!coche;
  i.disabled = !actif;
  if(changer) i.addEventListener('change', () => changer(i.checked, i));
  const s = alloEl('span', '', titre);
  if(petit) s.appendChild(alloEl('small', '', petit));
  l.append(i, s);
  return l;
}

/* ============================================================
   📞 GESTION › L'IA D'ALLO
   ============================================================ */
async function chargerAlloIa(){
  const z = document.getElementById('alloIaZone');
  if(!z) return;
  if(typeof ACCES === 'undefined' || !ACCES || ACCES.role !== 'admin'){ z.innerHTML = ''; return; }
  if(!alloIaEtat) z.innerHTML = '<div class="empty">Lecture des réglages de l’IA d’Allo…</div>';
  try{
    const d = await appelPrep({ action: 'alloIaLire' });
    if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
    alloIaEtat = d;
  }catch(e){
    z.innerHTML = '';
    z.appendChild(alloEl('div', 'empty', '⚠️ ' + (e.message || e)));
    return;
  }
  dessinerAlloIa();
}

async function alloIaEnvoyer(corps, bravo){
  try{
    const d = await appelPrep(corps);
    if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
    alloIaEtat = d;
    if(bravo) alloToast(bravo);
  }catch(e){ alloToast('⚠️ ' + (e.message || e)); }
  dessinerAlloIa();
}

function dessinerAlloIa(){
  const z = document.getElementById('alloIaZone');
  if(!z || !alloIaEtat) return;
  const E = alloIaEtat;
  z.innerHTML = '';
  z.appendChild(alloEtatDuBranchement(E));

  const ong = alloEl('div', 'alOnglets');
  /* 🪪 v1516 — « 📋 Les infos à demander » : la liste pour tous (ec-fiche-infos.js) */
  [['dire', '✅ Ce qu’elle peut dire'], ['consignes', '📜 Ses consignes'], ['infos', '📋 Les infos à demander'], ['versions', '🕘 Versions'],
   /* 🗂️ v1580 — ce qu'elle a dans Allo, et ses copies */
   ['allo', '🗂️ Dans Allo']].forEach(([k, t]) => {
    const b = alloEl('button', alloIaSous === k ? 'on' : '', t);
    b.type = 'button';
    b.setAttribute('aria-pressed', alloIaSous === k ? 'true' : 'false');
    b.addEventListener('click', () => { alloIaSous = k; dessinerAlloIa(); });
    ong.appendChild(b);
  });
  z.appendChild(ong);
  if(alloIaSous === 'consignes') z.appendChild(alloConsignes(E));
  else if(alloIaSous === 'infos' && typeof alloFicheInfos === 'function') z.appendChild(alloFicheInfos());
  else if(alloIaSous === 'versions') z.appendChild(alloVersions(E));
  else if(alloIaSous === 'allo') z.appendChild(alloDansAllo());
  else z.appendChild(alloCeQuElleDit(E));
}

/* L'état du branchement, en une ligne, et comment le faire */
function alloEtatDuBranchement(E){
  const w = alloEl('div', 'alBranche');
  const l = alloEl('div', 'alEtat');
  const branche = E.cle && E.dernier;
  const p = alloEl('span', 'alPastille' + (branche ? '' : ' gris'),
    !E.cle ? '⚪ Pas encore branché' : !E.dernier ? '🟡 Clé posée, Allo n’a pas encore appelé' : '🟢 Branché');
  l.appendChild(p);
  if(E.dernier) l.appendChild(alloEl('span', 'amMeta alSansMarge', 'Allo a appelé l’appli ' + alloIlYA(E.dernier) +
    ' · ' + E.appels7 + ' appel' + (E.appels7 > 1 ? 's' : '') + ' en 7 jours'));
  w.appendChild(l);

  const det = document.createElement('details');
  det.className = 'alGuide';
  if(!E.cle) det.open = true;
  det.appendChild(alloEl('summary', '', '🔌 Le brancher dans Allo'));
  const ol = alloEl('ol', '');
  const etape = (html) => { const li = document.createElement('li'); li.innerHTML = html; ol.appendChild(li); return li; };
  const c1 = etape('<b>Choisis une clé</b> longue et secrète (le bouton en tire une au hasard, sur cet écran seulement : elle ne part nulle part). ');
  const bCle = alloEl('button', 'alPetit', '🎲 Tirer une clé');
  bCle.type = 'button';
  const vue = alloEl('code', 'alCle');
  bCle.addEventListener('click', () => {
    const a = new Uint8Array(30);
    crypto.getRandomValues(a);
    vue.textContent = Array.from(a, x => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 56]).join('');
  });
  c1.append(bCle, vue);
  etape('<b>Cloudflare</b> › Workers › <i>bilan-proxy</i> › Settings › Variables and Secrets › <b>+ Add</b>, type <b>Secret</b>, nom <code>ALLO_MCP_CLE</code>, valeur : la clé. Puis <b>Deploy</b>.');
  const c3 = etape('<b>Allo</b> › Connecteurs › ajouter un <b>serveur MCP personnalisé</b> : nom « App Évolution Conduites », adresse ');
  const ad = alloEl('code', 'alCle', ALLO_IA_ADRESSE);
  const bAd = alloEl('button', 'alPetit', '📋 Copier');
  bAd.type = 'button';
  bAd.addEventListener('click', () => { try{ navigator.clipboard.writeText(ALLO_IA_ADRESSE); alloToast('📋 Adresse copiée'); }catch(e){} });
  c3.append(ad, bAd, document.createTextNode(' et, en clé API (Bearer), la même clé.'));
  etape('Dans ce connecteur, pour <b>chaque outil</b>, lie le paramètre <code>telephone_appelant</code> à <b>« Caller phone number »</b>. C’est ce qui fait que l’IA ne voit pas le numéro et ne peut pas le changer : <b>sans ce lien, ne l’active pas</b>.');
  etape('Active le connecteur pour ton agent, avec ses sept outils sur « Toujours exécuter » : <code>debut_appel</code>, <code>creneaux_libres</code>, <code>horaires_agences</code>, <code>renvoyer_acces</code>, <code>laisser_demande</code>, <code>signaler_retard</code>, <code>noter_renseignement</code>. Les autres paramètres restent « Renseigné par l’agent ».');
  const c6 = etape('Ajoute cette phrase aux instructions de l’agent (le reste de son texte ne change pas) : ');
  const ph = alloEl('code', 'alCle', ALLO_IA_PHRASE);
  const bPh = alloEl('button', 'alPetit', '📋 Copier');
  bPh.type = 'button';
  bPh.addEventListener('click', () => { try{ navigator.clipboard.writeText(ALLO_IA_PHRASE); alloToast('📋 Phrase copiée'); }catch(e){} });
  c6.append(ph, bPh);
  etape('Fais un appel d’essai : la pastille passe au vert, et l’appel montre « 🤖 Ce que l’IA d’Allo a fait » dans 📞 Suivi des appels.');
  det.appendChild(ol);
  w.appendChild(det);
  return w;
}

function alloCeQuElleDit(E){
  const f = document.createDocumentFragment();
  f.appendChild(alloEl('div', 'crIntro', 'La règle pour tous les élèves. Chaque dossier peut faire autrement (onglet 🤖 IA d’Allo du dossier) ; les messages pour un élève ou un proche s’écrivent dans son dossier.'));
  const cols = alloEl('div', 'amCols');
  const regler = (k) => (v) => alloIaEnvoyer({ action: 'alloIaRegler', cle: k, valeur: v ? 1 : 0 }, '✅ Enregistré — l’IA le suit dès le prochain appel');

  const g = alloEl('div', '');
  const b1 = alloEl('div', 'amBloc');
  b1.appendChild(alloEl('h3', '', 'Ce qu’elle peut dire, pour tous'));
  ALLO_IA_DIRE.forEach(([k, t, p]) => b1.appendChild(alloCase(t, p, E.regles[k], true, regler(k))));
  b1.appendChild(alloEl('div', 'alGroupe rouge', '🚫 Jamais'));
  b1.appendChild(alloCase('Résultats d’examen, notes internes du dossier, infos d’un autre élève, son code d’accès dicté au téléphone', '', false, false));
  g.appendChild(b1);
  cols.appendChild(g);

  const d = alloEl('div', '');
  const b2 = alloEl('div', 'amBloc');
  b2.appendChild(alloEl('h3', '', 'Ce qu’elle peut faire, pour tous'));
  ALLO_IA_FAIRE.forEach(([k, t, p]) => b2.appendChild(alloCase(t, p, E.regles[k], true, regler(k))));
  b2.appendChild(alloCase('Réserver, décaler ou annuler un cours', 'non : c’est le bureau qui le fait — pour annuler, elle dit d’écrire sur la messagerie de l’App', false, false));
  d.appendChild(b2);
  const b3 = alloEl('div', 'amBloc alEspace');
  b3.appendChild(alloEl('h3', '', 'Qui elle reconnaît'));
  ALLO_IA_RECONNAIT.forEach(([k, t, p]) => b3.appendChild(alloCase(t, p, E.regles[k], true, regler(k))));
  d.appendChild(b3);
  const b4 = alloEl('div', 'amBloc alEspace');
  b4.appendChild(alloEl('h3', '', 'Élèves réglés à part'));
  if(!E.eleves.length) b4.appendChild(alloEl('div', 'amMeta alSansMarge', 'Aucun pour l’instant : tous suivent la règle ci-contre.'));
  E.eleves.forEach(x => {
    const l = alloEl('button', 'alMsg alLien');
    l.type = 'button';
    l.appendChild(alloEl('span', '', '🎓'));
    const s = alloEl('span', '');
    s.appendChild(alloEl('b', '', x.eleve));
    const bouts = x.choix.map(c => (ALLO_IA_COURT[c.cle] || c.cle) + ' : ' + c.valeur);
    if(x.messages) bouts.push(x.messages + ' message' + (x.messages > 1 ? 's' : ''));
    s.appendChild(document.createTextNode(' — ' + bouts.join(' · ')));
    s.appendChild(alloEl('small', '', 'par ' + (x.par || '?') + ', le ' + alloJour(x.le)));
    l.appendChild(s);
    l.addEventListener('click', () => {
      if(typeof ouvrirPageEleve !== 'function') return;
      ouvrirPageEleve(x.eleve);
      if(typeof choisirOngletEleve === 'function') choisirOngletEleve('allo');
    });
    b4.appendChild(l);
  });
  d.appendChild(b4);
  cols.appendChild(d);
  f.appendChild(cols);
  return f;
}

function alloConsignes(E){
  const cols = alloEl('div', 'amCols');
  const g = alloEl('div', 'amBloc');
  g.appendChild(alloEl('h3', '', 'Ses consignes'));
  g.appendChild(alloEl('div', 'amMeta', 'Elles arrivent à l’IA au début de chaque appel, par le connecteur. Ce que tu lui as déjà appris dans Allo reste : ici, on ajoute.'));
  (E.fixes || []).forEach(t => {
    const l = alloEl('div', 'alMsg alFixe');
    l.append(alloEl('span', '', '🔒'), alloEl('span', '', t));
    g.appendChild(l);
  });
  if(!E.consignes.length) g.appendChild(alloEl('div', 'amMeta alEspace', 'Pas encore de consigne à toi.'));
  E.consignes.forEach(k => {
    const l = alloEl('div', 'alMsg');
    l.appendChild(alloEl('span', '', '📜'));
    const s = alloEl('span', '', k.texte);
    s.appendChild(alloEl('small', '', 'par ' + (k.par || '?') + (k.le ? ', le ' + alloJour(k.le) : '')));
    l.appendChild(s);
    const x = alloEl('button', 'x alCroix', '✕');
    x.type = 'button';
    x.title = 'Retirer cette consigne';
    x.setAttribute('aria-label', 'Retirer cette consigne');
    x.addEventListener('click', async () => {
      const oui = (typeof confirmer === 'function') ? await confirmer('Retirer cette consigne ?\n\n« ' + k.texte + ' »\n\nElle reste dans 🕘 Versions.', 'Retirer', true) : true;
      if(oui) alloIaEnvoyer({ action: 'alloIaConsigne', retirer: k.id }, '📜 Consigne retirée');
    });
    l.appendChild(x);
    g.appendChild(l);
  });
  cols.appendChild(g);

  const d = alloEl('div', 'amBloc');
  d.appendChild(alloEl('h3', '', '✍️ Ajouter une consigne'));
  const ta = document.createElement('textarea');
  ta.className = 'alSaisie';
  ta.maxLength = 600;
  ta.placeholder = 'Ex. : ne donne jamais d’heure précise de rappel, dis toujours « on vous rappellera dès que possible ».';
  d.appendChild(ta);
  const b = alloEl('button', 'btn btn-primary amGo', '➕ Ajouter la consigne');
  b.type = 'button';
  b.addEventListener('click', () => {
    const t = ta.value.trim();
    if(!t){ alloToast('Écris la consigne.'); return; }
    b.disabled = true;
    alloIaEnvoyer({ action: 'alloIaConsigne', texte: t }, '📜 Consigne ajoutée — dès le prochain appel');
  });
  d.appendChild(b);
  d.appendChild(alloEl('div', 'amMeta alEspace', 'Une consigne par idée, écrite comme tu la dirais à quelqu’un qui décroche à ta place. La version d’avant est gardée (🕘 Versions).'));
  cols.appendChild(d);
  return cols;
}

function alloVersions(E){
  const b = alloEl('div', 'amBloc');
  b.appendChild(alloEl('h3', '', '🕘 Versions'));
  if(!E.versions.length){ b.appendChild(alloEl('div', 'amMeta alSansMarge', 'Rien n’a encore changé : elle suit la règle de départ (tout coché, aucune consigne à toi).')); return b; }
  b.appendChild(alloEl('div', 'amMeta', 'Chaque changement garde la version d’avant. « Remettre » repose une version entière (ses cases et ses consignes) ; c’est un changement de plus, il se défait de même.'));
  E.versions.forEach((v, i) => {
    const l = alloEl('div', 'alMsg');
    l.appendChild(alloEl('span', '', i === 0 ? '✅' : '🕘'));
    const s = alloEl('span', '', v.quoi || 'Changement');
    const decoche = ALLO_IA_DIRE.concat(ALLO_IA_FAIRE, ALLO_IA_RECONNAIT).filter(([k]) => !v.regles[k]).map(([, t]) => t.replace(/^\S+\s/, ''));
    s.appendChild(alloEl('small', '', (v.par || '?') + ', le ' + alloJourHeure(v.le) + (i === 0 ? ' · en place' : '') +
      ' · ' + v.consignes.length + ' consigne' + (v.consignes.length > 1 ? 's' : '') +
      (decoche.length ? ' · décoché : ' + decoche.join(', ') : ' · tout coché')));
    l.appendChild(s);
    if(i > 0){
      const r = alloEl('button', 'alPetit', '↩️ Remettre');
      r.type = 'button';
      r.addEventListener('click', async () => {
        const oui = (typeof confirmer === 'function') ? await confirmer('Remettre la version du ' + alloJourHeure(v.le) + ' ?', 'Remettre') : true;
        if(oui) alloIaEnvoyer({ action: 'alloIaRemettre', id: v.id }, '🕘 Version remise');
      });
      l.appendChild(r);
    }
    b.appendChild(l);
  });
  return b;
}

/* ============================================================
   🗂️ v1580 — CE QU'ELLE A DANS ALLO

   David, le 26/11 : « une sauvegarde de ce qu'elle connaît
   actuellement, qu'on pourrait revenir en arrière en cas de souci ».
   Étape 1 : l'App LIT sa configuration chez Allo et la garde, datée
   (la première copie se fait toute seule). Rien n'est écrit dans Allo
   d'ici : corriger et publier viendra après le schéma.
   ============================================================ */
let alloAgentEtat = null;
let alloAgentCharge = false;

async function chargerAlloAgent(id, copier){
  alloAgentCharge = true;
  try{
    const d = await appelPrep(copier ? { action: 'alloAgentCopier' } : { action: 'alloAgentLire', id: id || 0 });
    if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
    alloAgentEtat = d;
    if(copier) alloToast('💾 Copie faite');
  }catch(e){
    alloAgentEtat = Object.assign({}, alloAgentEtat || { copies: [] }, { erreur: String((e && e.message) || e) });
  }
  if(alloIaSous === 'allo') dessinerAlloIa();
}

const ALLO_JOURS = { MO: 'Lundi', TU: 'Mardi', WE: 'Mercredi', TH: 'Jeudi', FR: 'Vendredi', SA: 'Samedi', SU: 'Dimanche' };
function alloHeureDeSecondes(v){
  const n = Number(v);
  if(!isFinite(n)) return String(v == null ? '' : v);
  const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60);
  return h + 'h' + String(m).padStart(2, '0');
}
function alloPlage(p){
  if(p == null) return '';
  if(typeof p !== 'object') return String(p);
  /* Allo écrit « start_time » / « end_time », en secondes depuis minuit */
  const deb = p.start_time != null ? p.start_time : (p.start != null ? p.start : (p.from != null ? p.from : p.open));
  const fin = p.end_time != null ? p.end_time : (p.end != null ? p.end : (p.to != null ? p.to : p.close));
  if(deb != null && fin != null) return alloHeureDeSecondes(deb) + ' – ' + alloHeureDeSecondes(fin);
  return JSON.stringify(p);
}
/* La configuration, en parties lisibles : [titre, [[libellé, texte]…]] */
function alloPartiesAgent(cfg){
  const a = (cfg && cfg.agent) || {};
  const parties = [];
  const L = (lib, v) => (v === undefined || v === null || String(v).trim() === '') ? null : [lib, String(v)];
  parties.push(['👋 Accueil, ton, fin', [L('Accueil', a.greeting_message), L('Fin d’appel', a.closing_message),
    L('Ton', a.tone_of_voice), L('Langue', a.language), L('Réponses', a.answer_type), L('Nom de l’agent', a.name)].filter(Boolean)]);
  parties.push(['🏢 L’école, telle qu’elle la connaît', [L('Nom', a.business_name), L('Adresse', a.business_address),
    L('Téléphone', a.business_phone), L('Mail', a.business_email), L('Site', a.business_website), L('Activité', a.business_industry)].filter(Boolean)]);
  const pr = (cfg && cfg.prompt) || {};
  const ins = [];
  (Array.isArray(pr.sections) ? pr.sections : []).forEach(x => {
    const t = x.title || x.section || 'Partie';
    if(Array.isArray(x.fields) && x.fields.length){
      ins.push([t, x.fields.map(f => '• ' + (f.label || '') + (f.question ? ' — « ' + f.question + ' »' : '') +
        (f.complete_when ? ' (complet quand : ' + f.complete_when + ')' : '')).join('\n')]);
    }else if(x.content) ins.push([t, x.content]);
  });
  if(pr.custom_prompt) ins.push(['Texte libre', pr.custom_prompt]);
  parties.push(['📜 Ses instructions dans Allo', ins]);
  const k = (cfg && cfg.knowledge) || {};
  const sait = [];
  if(k.text) sait.push(['Texte', k.text]);
  (k.websites || []).forEach(w => sait.push(['Site', (w.url || '') + (w.status ? ' (' + w.status + ')' : '')]));
  (k.files || []).forEach(fi => sait.push(['Fichier', (fi.file_name || '') + (fi.status ? ' (' + fi.status + ')' : '')]));
  parties.push(['📚 Ce qu’elle sait', sait]);
  const bh = (cfg && cfg.business_hours) || {};
  const hor = (bh.schedule || []).map(j => [ALLO_JOURS[j.day] || j.day,
    (Array.isArray(j.schedule) && j.schedule.length) ? j.schedule.map(alloPlage).join(', ') : 'fermé']);
  if(bh.timezone) hor.push(['Fuseau', bh.timezone]);
  parties.push(['🕘 Ses horaires dans Allo', hor]);
  parties.push(['🔀 Transferts', (cfg && cfg.transfer_rules || []).map(t => [t.type || 'Transfert',
    (t.description || '') + (t.target_number ? ' → ' + t.target_number : '') + (t.target_line_number ? ' → ligne ' + t.target_line_number : '') +
    (t.transfer_message ? '\nCe qu’elle dit : « ' + t.transfer_message + ' »' : '')])]);
  const cap = (cfg && cfg.capabilities) || {};
  parties.push(['⚙️ Ce qu’elle peut faire', Object.keys(cap).map(x => [x, cap[x] ? 'oui' : 'non'])]);
  const cal = ((cfg && cfg.scheduling) || {}).calendars || [];
  if(cal.length) parties.push(['📅 Agendas', cal.map(c => [c.name || 'Agenda', (c.provider || '') + (c.status ? ' · ' + c.status : '')])]);
  return parties;
}
function alloTexteAgent(copie){
  const lignes = ['Configuration de la réceptionniste IA — ligne ' + (copie.nom || '') + ' ' + (copie.numero || ''),
    'Copie du ' + alloJourHeure(copie.le) + (copie.par ? ' par ' + copie.par : ''), ''];
  alloPartiesAgent(copie.config).forEach(([t, l]) => {
    lignes.push('== ' + t.replace(/^\S+\s/, '') + ' ==');
    if(!l.length) lignes.push('(rien)');
    l.forEach(([a, b]) => lignes.push(a + ' : ' + b));
    lignes.push('');
  });
  return lignes.join('\n');
}

/* ============================================================
   ✏️ v1581 — LA RÉGLER DEPUIS L'APP (étape 2)

   Schéma validé par David le 26/11 (« ça me va ») : « ✏️ Modifier ses
   instructions » → ses six parties, son accueil, sa fin, ce qu'elle
   sait (son texte + les déroulés des formations écrits ici), ses
   horaires (à la main : « je veux qu'elle réponde tout le temps,
   24/24, 7/7 ») → « 🚀 Publier dans Allo ». Chaque publication garde
   la version d'avant : « ↩️ Remettre dans Allo ».

   La première fois (rien encore publié depuis l'App), l'écran part de
   la proposition validée, et de son texte nettoyé : sans les horaires
   ni les tarifs (l'App les lui donne à jour), « Messenger » remplacé
   par la messagerie de l'App, et plus de Listeeleve.pdf pour les
   procédures (debut_appel dit si c'est possible).
   ============================================================ */
const ALLO_PROPOSITION = {
  "parties": {
    "objective": "Parle français par défaut. Ne change de langue que si on te le demande clairement : si l'appelant parle une autre langue, reste en français et demande-lui s'il veut changer ; ne change qu'après sa réponse.\n\nAu tout début de chaque appel, appelle l'outil debut_appel et suis ses consignes pendant tout l'appel : il te dit qui appelle (élève, proche, numéro inconnu), ce que tu peux lui dire, et les consignes de l'équipe.\n\nDéroulé de l'appel :\n1. Accueille l'appelant au nom d'Évolution Conduites.\n2. Comprends pourquoi il appelle : une question, un message pour l'équipe, une correction de procédure, ou du démarchage / une erreur de numéro (dans ce cas, termine poliment tout de suite).\n3. Réponds avec ce que te donnent les outils de l'App (horaires des agences, tarifs, créneaux libres, ce qui concerne l'élève) et avec tes connaissances.\n4. Si tu ne peux pas répondre, ou si on te laisse un message : laisse la demande au bureau avec laisser_demande, puis dis « C'est bien noté, on vous rappellera dès que possible. »\n5. Demande s'il y a autre chose, puis termine l'appel.",
    "personality": "Tu es Naïa, l'assistante vocale d'Évolution Conduites, l'auto-école de Saint-Brieuc et de Loudéac. Tu réponds aux appels, tu renseignes avec ce que te donne l'App et tes connaissances, et tu transmets à l'équipe ce que tu ne peux pas régler. Tu es chaleureuse, claire et professionnelle.",
    "behaviors": "- Réponses courtes. Ne redemande jamais ce que tu sais déjà (debut_appel te dit souvent qui appelle).\n- Rappel : ne demande jamais quand rappeler et ne propose jamais de jour ni d'heure. Dis seulement : « C'est bien noté, on vous rappellera dès que possible. »\n- Renseignements et inscriptions (permis B, boîte automatique, conduite accompagnée, conduite supervisée) : la personne passe au bureau voir une vidéo de présentation, sans rendez-vous, aux heures d'ouverture données par l'outil horaires_agences. Pour une demande de renseignements, ne propose pas de rappel. La vidéo n'est pas obligatoire pour les formations 125, moto et passerelles.\n- Horaires et adresses : uniquement ceux de l'outil horaires_agences.\n- Tarifs : uniquement ceux que l'App te donne. Si on te demande un prix que tu n'as pas, laisse la demande au bureau.\n- Si on veut parler à une personne : « Mon rôle est de simplifier le travail de l'équipe pour qu'elle se consacre pleinement à votre accompagnement. Dites-moi la raison de votre appel et votre nom, je transmets tout à la bonne personne. »\n- Si l'appelant dit être en leçon, au volant : c'est l'exercice du téléphone (voir tes connaissances) ; traite-le comme un nouvel appel à chaque fois.",
    "prohibited": "- Ne t'arrête jamais au milieu d'une phrase si on t'interrompt : finis ta phrase avant d'écouter.\n- Ne demande jamais quand rappeler, ne donne jamais de jour ni d'heure de rappel.\n- N'invente jamais un prix, un horaire, une date ou une information sur un élève.\n- Ne donne aucune information de dossier si debut_appel ne reconnaît pas l'appelant.\n- Ne dicte jamais de code d'accès au téléphone.",
    "objective_completion": "L'appel est réussi quand les questions ont une réponse, quand une correction de procédure est terminée, ou quand la demande est laissée au bureau avec laisser_demande."
  },
  "champs": [
    {
      "label": "nom_appelant",
      "question": "Pouvez-vous me donner votre nom ?",
      "complete_when": "debut_appel a reconnu l'appelant, ou il a donné son nom."
    },
    {
      "label": "raison_appel",
      "question": "Quelle est la raison de votre appel ?",
      "complete_when": "L'appelant a expliqué pourquoi il appelle."
    }
  ]
};

const ALLO_PARTIES_ECRAN = [
  ['objective', '🎯 Objectif et déroulé de l’appel', 'Obligatoire.', 14],
  ['personality', '🙂 Qui elle est', 'Obligatoire.', 3],
  ['behaviors', '✅ Ce qu’elle fait toujours', 'Obligatoire.', 12],
  ['prohibited', '🚫 Ce qu’elle ne fait jamais', '', 6],
  ['objective_completion', '🏁 Quand l’appel est réussi', '', 3]
];
const ALLO_JOURS_ORDRE = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
let alloAgentBrouillon = null;

/* Son texte, sans ce que l'App lui donne maintenant à jour */
function nettoyerSavoirAllo(texte){
  let t = String(texte || '').replace(/\r/g, '');
  const faits = [];
  const avant = t;
  /* les blocs d'horaires d'accueil (en double), jusqu'au « Dimanche » */
  t = t.replace(/Horaires d'accueil au bureau[^\n]*\n(?:[^\n]*\n)*?Dimanche[^\n]*\n?/gi, '');
  t = t.replace(/^.*bureau de Loudéac sera fermé.*\n?/gim, '');
  if(t !== avant) faits.push('les horaires d’accueil (l’App les donne à jour)');
  /* les tarifs écrits à la main, jusqu'à « Nous ne faisons pas » */
  const t2 = t.replace(/Tarifs principaux[\s\S]*?(?=\n\s*Nous ne faisons pas)/i, '');
  if(t2 !== t){ t = t2; faits.push('les tarifs écrits à la main (l’App donne ceux des fiches de tarifs)'); }
  /* les procédures : plus de Listeeleve.pdf */
  const t3 = t.replace(/1- Tu demande le nom et prénom de l'élève[\s\S]*?sur messenger/i,
    '1- Tu ne corriges une procédure que si debut_appel te dit que c’est possible (élève reconnu, groupes ouverts). Sinon, tu ne corriges pas et tu lui demandes d’envoyer un message dans la messagerie de l’App');
  if(t3 !== t){ t = t3; faits.push('Listeeleve.pdf pour les procédures (c’est l’App qui reconnaît l’élève)'); }
  /* Messenger → la messagerie de l'App */
  const t4 = t.replace(/sur messenger/gi, 'dans la messagerie de l’App');
  if(t4 !== t){ t = t4; faits.push('« sur Messenger » → « dans la messagerie de l’App »'); }
  t = t.replace(/\n{4,}/g, '\n\n\n').trim();
  return { texte: t, faits: faits };
}

function alloBrouillonDepuis(E){
  const cfg = (E.copie && E.copie.config) || {};
  const a = cfg.agent || {};
  const deja = (E.copies || []).some(x => /Publié depuis l|Remis dans Allo/.test(x.quoi || ''));
  const marque = E.marqueFiches || '━━ DÉROULÉS DES FORMATIONS';
  let savoir = String(((cfg.knowledge || {}).text) || '');
  const i = savoir.indexOf(marque);
  if(i !== -1) savoir = savoir.slice(0, i).trim();
  const br = { numero: E.copie.numero, accueil: a.greeting_message || '', fin: a.closing_message || '',
               parties: {}, champs: [], savoir: savoir, nettoye: [], fiches: (E.fiches || []).map(x => Object.assign({}, x)),
               horaires: JSON.parse(JSON.stringify(cfg.business_hours || { timezone: 'Europe/Paris', schedule: [] })), depart: deja ? 'copie' : 'proposition' };
  if(deja){
    ((cfg.prompt || {}).sections || []).forEach(x => {
      if(x.section === 'required_fields') (x.fields || []).forEach(f => br.champs.push(Object.assign({}, f)));
      else br.parties[x.section] = x.content || '';
    });
  }else{
    br.parties = Object.assign({}, ALLO_PROPOSITION.parties);
    br.champs = ALLO_PROPOSITION.champs.map(f => Object.assign({}, f));
    const n = nettoyerSavoirAllo(savoir);
    br.savoir = n.texte;
    br.nettoye = n.faits;
  }
  return br;
}

async function alloAgentEnvoyer(corps, bravo){
  try{
    const d = await appelPrep(corps);
    if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
    alloAgentEtat = d;
    if(bravo) alloToast(bravo);
    return true;
  }catch(e){
    alloToast('⚠️ ' + ((e && e.message) || e));
    return false;
  }finally{
    if(alloIaSous === 'allo') dessinerAlloIa();
  }
}

/* « 10:00 » ↔ 36000 secondes */
function alloSecondesDe(t){
  const m = String(t || '').trim().match(/^(\d{1,2})[:h](\d{2})?$/i);
  if(!m) return null;
  const h = Number(m[1]), mi = Number(m[2] || 0);
  if(h > 24 || mi > 59) return null;
  return Math.min(86399, h * 3600 + mi * 60);
}
function alloHHMM(sec){
  const n = Number(sec) || 0;
  return String(Math.floor(n / 3600)).padStart(2, '0') + ':' + String(Math.floor((n % 3600) / 60)).padStart(2, '0');
}

function alloChamp(titre, aide, valeur, max, lignes, poser){
  const w = alloEl('div', '');
  w.style.cssText = 'margin:12px 0 4px;';
  const l = alloEl('label', '', titre);
  l.style.cssText = 'display:block;font-size:13px;font-weight:800;margin-bottom:3px;';
  w.appendChild(l);
  if(aide){ const a = alloEl('div', 'amMeta alSansMarge', aide); a.style.marginBottom = '4px'; w.appendChild(a); }
  const ta = document.createElement('textarea');
  ta.value = valeur || ''; ta.rows = lignes || 4;
  ta.style.cssText = 'width:100%;margin:0;font:inherit;font-size:13.5px;line-height:1.5;';
  w.appendChild(ta);
  let c = null;
  if(max){ c = alloEl('div', 'amMeta alSansMarge', ''); c.style.textAlign = 'right'; w.appendChild(c); }
  const compter = () => {
    if(!c) return;
    c.textContent = ta.value.length.toLocaleString('fr-FR') + ' / ' + max.toLocaleString('fr-FR') + ' caractères';
    c.style.color = ta.value.length > max ? 'var(--red)' : '';
  };
  ta.addEventListener('input', () => { poser(ta.value); compter(); });
  compter();
  return w;
}
function alloGroupe(bloc, titre, ouvert){
  const d = document.createElement('details');
  d.className = 'alGuide alCopie';
  d.open = !!ouvert;
  d.appendChild(alloEl('summary', '', titre));
  bloc.appendChild(d);
  return d;
}

function alloEdition(E){
  const B = alloAgentBrouillon;
  const bloc = alloEl('div', 'amBloc');
  bloc.appendChild(alloEl('h3', '', '✏️ Ses instructions dans Allo — à publier'));
  bloc.appendChild(alloEl('div', 'amMeta', 'Tu modifies ici : rien ne part tant que tu n’appuies pas sur « 🚀 Publier dans Allo ». Juste avant, l’App garde une copie de ce qu’elle a maintenant.'));
  if(B.depart === 'proposition'){
    const p = alloEl('div', 'amMeta', '💡 Pré-rempli avec la proposition validée le 26/11' +
      (B.nettoye.length ? ' — retiré de son texte : ' + B.nettoye.join(' ; ') + '.' : '.'));
    p.style.color = 'var(--accent-text)';
    bloc.appendChild(p);
  }
  const g1 = alloGroupe(bloc, '👋 Accueil et fin d’appel', false);
  g1.appendChild(alloChamp('Accueil', 'Ce qu’elle dit en décrochant.', B.accueil, 1000, 3, v => { B.accueil = v; }));
  g1.appendChild(alloChamp('Fin d’appel', '', B.fin, 500, 1, v => { B.fin = v; }));

  const g2 = alloGroupe(bloc, '📜 Ses instructions', true);
  ALLO_PARTIES_ECRAN.forEach(([k, t, aide, n], i) => {
    g2.appendChild(alloChamp(t, aide, B.parties[k] || '', 3000, n, v => { B.parties[k] = v; }));
    if(i === 3){
      /* 📝 ce qu'elle doit recueillir */
      const rf = alloEl('div', '');
      rf.style.cssText = 'margin:12px 0 4px;';
      const l = alloEl('label', '', '📝 Ce qu’elle doit recueillir');
      l.style.cssText = 'display:block;font-size:13px;font-weight:800;margin-bottom:3px;';
      rf.appendChild(l);
      B.champs.forEach((f, j) => {
        const r = alloEl('div', 'alMsg');
        const sp = alloEl('span', '');
        const q = document.createElement('input');
        q.type = 'text'; q.value = f.question || ''; q.placeholder = 'La question qu’elle pose';
        q.style.cssText = 'width:100%;margin:0 0 4px;';
        q.addEventListener('input', () => { f.question = q.value; });
        const w = document.createElement('input');
        w.type = 'text'; w.value = f.complete_when || ''; w.placeholder = 'C’est fait quand…';
        w.style.cssText = 'width:100%;margin:0;font-size:12.5px;';
        w.addEventListener('input', () => { f.complete_when = w.value; });
        sp.append(q, w);
        r.append(alloEl('span', '', '📝'), sp);
        const x = alloEl('button', 'alPetit', '✕');
        x.type = 'button'; x.title = 'Retirer';
        x.addEventListener('click', () => { B.champs.splice(j, 1); dessinerAlloIa(); });
        r.appendChild(x);
        rf.appendChild(r);
      });
      const add = alloEl('button', 'alPetit', '➕ Une info à recueillir');
      add.type = 'button';
      add.addEventListener('click', () => { B.champs.push({ label: 'info_' + (B.champs.length + 1), question: '', complete_when: '' }); dessinerAlloIa(); });
      rf.appendChild(add);
      g2.appendChild(rf);
    }
  });

  /* 📚 ce qu'elle sait : son texte, les déroulés, ses liens et fichiers */
  const g3 = alloGroupe(bloc, '📚 Ce qu’elle sait', B.depart === 'proposition');
  g3.appendChild(alloChamp('Son texte', 'Les horaires et les tarifs n’y sont plus : l’App les lui donne à jour.', B.savoir, 0, 10, v => { B.savoir = v; }));
  const tf = alloEl('div', '');
  tf.style.cssText = 'margin:14px 0 4px;';
  const lf = alloEl('label', '', '📘 Les déroulés des formations');
  lf.style.cssText = 'display:block;font-size:13px;font-weight:800;margin-bottom:3px;';
  tf.appendChild(lf);
  tf.appendChild(alloEl('div', 'amMeta alSansMarge', 'Une fiche par formation, en texte : elle les lit bien mieux qu’un PDF. Elles partent dans « Ce qu’elle sait » à chaque publication.'));
  B.fiches.forEach((fi, j) => {
    const r = alloEl('div', 'alMsg');
    const sp = alloEl('span', '');
    const ti = document.createElement('input');
    ti.type = 'text'; ti.value = fi.titre || ''; ti.placeholder = 'Titre (ex. : Formation 125)';
    ti.style.cssText = 'width:100%;margin:0 0 4px;font-weight:700;';
    ti.addEventListener('input', () => { fi.titre = ti.value; total(); });
    const tx = document.createElement('textarea');
    tx.value = fi.texte || ''; tx.rows = 5; tx.placeholder = 'Le déroulé, tel qu’elle doit l’expliquer';
    tx.style.cssText = 'width:100%;margin:0;font:inherit;font-size:13px;line-height:1.5;';
    tx.addEventListener('input', () => { fi.texte = tx.value; total(); });
    sp.append(ti, tx);
    r.append(alloEl('span', '', '📘'), sp);
    const x = alloEl('button', 'alPetit', '✕');
    x.type = 'button'; x.title = 'Retirer cette fiche';
    x.addEventListener('click', () => { B.fiches.splice(j, 1); dessinerAlloIa(); });
    r.appendChild(x);
    tf.appendChild(r);
  });
  const addF = alloEl('button', 'alPetit', '➕ Une fiche de déroulé');
  addF.type = 'button';
  addF.addEventListener('click', () => { B.fiches.push({ titre: '', texte: '' }); dessinerAlloIa(); });
  tf.appendChild(addF);
  const tot = alloEl('div', 'amMeta alSansMarge', '');
  tot.style.textAlign = 'right';
  const total = () => {
    const n = String(B.savoir || '').length + B.fiches.reduce((s, x) => s + String(x.titre || '').length + String(x.texte || '').length + 8, 0);
    tot.textContent = 'Ce qu’elle sait, fiches comprises : ' + n.toLocaleString('fr-FR') + ' / 25 000 caractères';
    tot.style.color = n > 25000 ? 'var(--red)' : '';
  };
  total();
  tf.appendChild(tot);
  g3.appendChild(tf);

  /* 🔗 ses liens et fichiers : tout de suite chez Allo */
  const k = ((E.copie && E.copie.config) || {}).knowledge || {};
  const src = alloEl('div', '');
  src.style.cssText = 'margin:14px 0 4px;';
  const ls = alloEl('label', '', '🔗 Ses liens et ses fichiers');
  ls.style.cssText = 'display:block;font-size:13px;font-weight:800;margin-bottom:3px;';
  src.appendChild(ls);
  src.appendChild(alloEl('div', 'amMeta alSansMarge', 'Ils changent tout de suite chez Allo (une copie est gardée avant). Un lien Facebook ne se lit pas : il faut une page publique.'));
  (k.websites || []).forEach(w => {
    const r = alloEl('div', 'alMsg');
    r.appendChild(alloEl('span', '', w.status === 'ACTIVE' ? '🟢' : '⚪'));
    const sp = alloEl('span', '', w.url || '');
    sp.appendChild(alloEl('small', '', w.status === 'ACTIVE' ? 'elle s’en sert' : 'désactivé'));
    r.appendChild(sp);
    const bt = alloEl('button', 'alPetit', w.status === 'ACTIVE' ? 'Désactiver' : 'Activer');
    bt.type = 'button';
    bt.addEventListener('click', () => { bt.disabled = true;
      alloAgentEnvoyer({ action: 'alloAgentSavoir', numero: B.numero, quoi: 'siteStatut', id: w.id, statut: w.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }, '🔗 C’est fait chez Allo'); });
    r.appendChild(bt);
    src.appendChild(r);
  });
  const ajout = alloEl('div', '');
  ajout.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px;';
  const iu = document.createElement('input');
  iu.type = 'url'; iu.placeholder = 'https://…'; iu.style.cssText = 'flex:1;min-width:180px;margin:0;';
  const bu = alloEl('button', 'alPetit', '➕ Ajouter le lien');
  bu.type = 'button';
  bu.addEventListener('click', () => {
    const u = iu.value.trim();
    if(!u){ alloToast('Colle l’adresse du site.'); return; }
    bu.disabled = true;
    alloAgentEnvoyer({ action: 'alloAgentSavoir', numero: B.numero, quoi: 'siteAjouter', url: u }, '🔗 Lien ajouté : Allo le lit, c’est prêt dans quelques minutes');
  });
  ajout.append(iu, bu);
  src.appendChild(ajout);
  (k.files || []).forEach(fi => {
    const r = alloEl('div', 'alMsg');
    r.appendChild(alloEl('span', '', '📄'));
    const sp = alloEl('span', '', fi.file_name || '');
    sp.appendChild(alloEl('small', '', fi.status === 'ACTIVE' ? 'elle s’en sert' : String(fi.status || '')));
    r.appendChild(sp);
    const bt = alloEl('button', 'alPetit', '🗑️ Retirer');
    bt.type = 'button';
    bt.addEventListener('click', async () => {
      const oui = (typeof confirmer === 'function')
        ? await confirmer('Retirer « ' + (fi.file_name || 'ce fichier') + ' » de ce qu’elle sait ?\n\nAllo le supprime de sa bibliothèque : pour le remettre, il faudra le redéposer dans Allo.', 'Retirer') : true;
      if(oui) alloAgentEnvoyer({ action: 'alloAgentSavoir', numero: B.numero, quoi: 'fichierRetirer', id: fi.id }, '🗑️ Fichier retiré');
    });
    r.appendChild(bt);
    src.appendChild(r);
  });
  src.appendChild(alloEl('div', 'amMeta alSansMarge', '📄 Ajouter un fichier : seulement dans Allo (Allo ne le permet pas depuis une autre application). Pour les déroulés, préfère les fiches ci-dessus.'));
  g3.appendChild(src);

  /* 🕘 ses horaires dans Allo, à la main */
  const g4 = alloGroupe(bloc, '🕘 Ses horaires dans Allo', false);
  const H = B.horaires;
  H.schedule = H.schedule || [];
  const b24 = alloEl('button', 'alPetit', '🕐 24 h/24, 7 j/7');
  b24.type = 'button';
  b24.addEventListener('click', () => {
    H.schedule = ALLO_JOURS_ORDRE.map(d => ({ day: d, schedule: [{ start_time: 0, end_time: 86399 }] }));
    dessinerAlloIa();
  });
  g4.appendChild(b24);
  ALLO_JOURS_ORDRE.forEach(d => {
    const j = H.schedule.find(x => x.day === d);
    const p = j && j.schedule && j.schedule[0];
    const r = alloEl('div', 'alMsg');
    r.style.alignItems = 'center';
    const ouv = document.createElement('input');
    ouv.type = 'checkbox'; ouv.checked = !!p;
    const nom = alloEl('span', '', ALLO_JOURS[d]);
    nom.style.cssText = 'flex:0 0 92px;font-weight:700;';
    const de = document.createElement('input'), a = document.createElement('input');
    [de, a].forEach(x => { x.type = 'text'; x.inputMode = 'numeric'; x.style.cssText = 'width:76px;margin:0;text-align:center;'; });
    de.value = p ? alloHHMM(p.start_time) : '10:00';
    a.value = p ? alloHHMM(p.end_time) : '18:00';
    const poser = () => {
      const i = H.schedule.findIndex(x => x.day === d);
      if(!ouv.checked){ if(i !== -1) H.schedule.splice(i, 1); de.disabled = a.disabled = true; return; }
      de.disabled = a.disabled = false;
      const s1 = alloSecondesDe(de.value), s2 = alloSecondesDe(a.value);
      const pl = { day: d, schedule: (s1 !== null && s2 !== null && s2 > s1) ? [{ start_time: s1, end_time: s2 }] : [] };
      if(i === -1) H.schedule.push(pl); else H.schedule[i] = pl;
    };
    ouv.addEventListener('change', poser);
    [de, a].forEach(x => x.addEventListener('change', poser));
    de.disabled = a.disabled = !p;
    r.append(ouv, nom, de, alloEl('span', '', '→'), a);
    g4.appendChild(r);
  });
  g4.appendChild(alloEl('div', 'amMeta', 'Fermé = la case décochée. « 23:59 » en fin, c’est jusqu’à minuit.'));

  /* 📡 ce que l'App lui donne à chaque appel */
  const app = alloEl('div', 'amBloc');
  app.style.cssText = 'margin-top:14px;';
  app.appendChild(alloEl('h3', '', '📡 Ce que l’App lui donne à chaque appel'));
  app.appendChild(alloEl('div', 'amMeta', 'Rien à publier ici : c’est lu dans l’App au moment de l’appel, donc toujours à jour.'));
  [['🏢', 'Horaires et adresses des agences', 'Gestion › Loudéac / St-Brieuc Horaires et RDV — les deux agences, fermetures comprises'],
   ['📜', 'Tes consignes', 'l’onglet « 📜 Ses consignes »'],
   ['👤', 'Ce qui regarde l’élève qui appelle', 'l’onglet « ✅ Ce qu’elle peut dire », son dossier, et si ses groupes sont ouverts (correction des procédures)']].forEach(([e, t, d]) => {
    const r = alloEl('div', 'alMsg'); r.appendChild(alloEl('span', '', e));
    const sp = alloEl('span', '', t); sp.appendChild(alloEl('small', '', d)); r.appendChild(sp); app.appendChild(r);
  });
  app.appendChild(alloTarifsNaia(E));
  bloc.appendChild(app);

  const rang = alloEl('div', '');
  rang.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;';
  const pub = alloEl('button', 'btn btn-primary amGo', '🚀 Publier dans Allo');
  pub.type = 'button'; pub.style.cssText = 'width:auto;margin:0;';
  pub.addEventListener('click', async () => {
    const oui = (typeof fenetre === 'function') ? await fenetre(
      'Ses instructions, son accueil, ses horaires et ce qu’elle sait sont remplacés dans Allo, dès le prochain appel.\n\n' +
      'Juste avant, l’App garde une copie de ce qu’elle a maintenant : « ↩️ Remettre dans Allo » la remet en un appui.',
      [{ nom: 'Annuler', valeur: false }, { nom: '🚀 Publier', valeur: true, principal: true }], '🚀 Publier dans Allo ?') : true;
    if(oui !== true) return;
    pub.disabled = true; pub.textContent = 'Publication chez Allo…';
    const ok = await alloAgentEnvoyer({ action: 'alloAgentPublier', numero: B.numero, accueil: B.accueil, fin: B.fin,
      parties: B.parties, champs: B.champs, savoir: B.savoir, fiches: B.fiches, horaires: B.horaires }, '🚀 Publié dans Allo — dès le prochain appel');
    if(ok){ alloAgentBrouillon = null; dessinerAlloIa(); }
  });
  const ann = alloEl('button', 'btn btn-secondary', 'Annuler');
  ann.type = 'button'; ann.style.cssText = 'width:auto;margin:0;';
  ann.addEventListener('click', () => { alloAgentBrouillon = null; dessinerAlloIa(); });
  rang.append(pub, ann);
  bloc.appendChild(rang);
  return bloc;
}

/* 💰 Les fiches de tarifs qu'elle peut donner (David : « case ») */
function alloTarifsNaia(E){
  const d = document.createElement('details');
  d.className = 'alGuide alCopie';
  const coches = new Set((E.fichesTarifs || []).map(String));
  d.appendChild(alloEl('summary', '', '💰 Les tarifs — ' + (coches.size ? coches.size + ' fiche' + (coches.size > 1 ? 's' : '') + ' qu’elle peut donner' : 'aucune fiche cochée')));
  d.appendChild(alloEl('div', 'amMeta', 'Outils › 💰 Tarifs : coche les fiches que Naïa peut annoncer. Elle donne leur total au prix du jour.'));
  (E.tarifs || []).forEach(f => {
    const l = alloCase('🤖 ' + f.titre, (typeof Number === 'function' ? (Number(f.total) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '') +
      (f.dossier ? ' · ' + f.dossier : ''), coches.has(String(f.id)), true, (oui) => {
        if(oui) coches.add(String(f.id)); else coches.delete(String(f.id));
        alloAgentEnvoyer({ action: 'alloAgentReglerTarifs', ids: Array.from(coches) }, oui ? '🤖 Elle peut donner cette fiche' : 'Fiche retirée de ses tarifs');
      });
    d.appendChild(l);
  });
  if(!(E.tarifs || []).length) d.appendChild(alloEl('div', 'empty', 'Aucune fiche de tarifs avec un total.'));
  return d;
}

function alloDansAllo(){
  const b = alloEl('div', 'amBloc');
  if(!alloAgentEtat){
    b.appendChild(alloEl('h3', '', '🗂️ Ce qu’elle a dans Allo'));
    if(!alloAgentCharge) chargerAlloAgent(0);
    b.appendChild(alloEl('div', 'empty', 'Lecture de sa configuration chez Allo…'));
    return b;
  }
  const E = alloAgentEtat;
  if(alloAgentBrouillon && E.copie) return alloEdition(E);
  b.appendChild(alloEl('h3', '', '🗂️ Ce qu’elle a dans Allo'));
  b.appendChild(alloEl('div', 'amMeta', 'Une copie de sa configuration chez Allo (accueil, instructions, ce qu’elle sait, horaires, transferts), gardée ici avec sa date. « ✏️ Modifier ses instructions » pour la changer depuis l’App.'));
  const rang = alloEl('div', 'alEspace');
  rang.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0;';
  const bCop = alloEl('button', 'btn btn-primary amGo', '💾 Faire une copie maintenant');
  bCop.type = 'button';
  bCop.style.cssText = 'width:auto;margin:0;';
  bCop.addEventListener('click', () => { bCop.disabled = true; bCop.textContent = 'Lecture chez Allo…'; chargerAlloAgent(0, true); });
  rang.appendChild(bCop);
  if(E.copie && E.copies[0] && E.copies[0].id === E.copie.id){
    const bMod = alloEl('button', 'btn btn-secondary', '✏️ Modifier ses instructions');
    bMod.type = 'button';
    bMod.style.cssText = 'width:auto;margin:0;';
    bMod.addEventListener('click', () => { alloAgentBrouillon = alloBrouillonDepuis(E); dessinerAlloIa(); });
    rang.appendChild(bMod);
  }
  if(E.copie){
    const bTxt = alloEl('button', 'alPetit', '📋 Copier tout le texte');
    bTxt.type = 'button';
    bTxt.addEventListener('click', () => { try{ navigator.clipboard.writeText(alloTexteAgent(E.copie)); alloToast('📋 Texte copié'); }catch(e){} });
    rang.appendChild(bTxt);
  }
  b.appendChild(rang);
  if(E.erreur) b.appendChild(alloEl('div', 'empty', '⚠️ ' + E.erreur));
  if(!E.copie){
    if(!E.erreur) b.appendChild(alloEl('div', 'empty', 'Aucune copie pour l’instant.'));
    return b;
  }
  const C = E.copie;
  const tete = alloEl('div', 'amMeta');
  tete.textContent = '📞 Ligne ' + (C.nom || '') + ' · ' + (C.numero || '') + ' — copie du ' + alloJourHeure(C.le) +
    (C.par ? ' par ' + C.par : '') + (E.copies[0] && E.copies[0].id === C.id ? ' (la plus récente)' : '');
  b.appendChild(tete);
  alloPartiesAgent(C.config).forEach(([titre, lignes]) => {
    const det = document.createElement('details');
    det.className = 'alGuide alCopie';
    det.open = /instructions|Accueil/.test(titre);
    det.appendChild(alloEl('summary', '', titre + (lignes.length ? '' : ' — rien')));
    lignes.forEach(([lib, txt]) => {
      const l = alloEl('div', 'alMsg');
      const s = alloEl('span', '');
      s.appendChild(alloEl('b', '', lib));
      const p = alloEl('div', '', txt);
      p.style.cssText = 'white-space:pre-wrap;margin-top:3px;';
      s.appendChild(p);
      l.appendChild(s);
      det.appendChild(l);
    });
    b.appendChild(det);
  });
  const h = alloEl('h3', '', '🕘 Les copies gardées');
  h.style.marginTop = '16px';
  b.appendChild(h);
  const plusRecente = E.copies[0] ? E.copies[0].id : 0;
  E.copies.forEach(x => {
    const l = alloEl('div', 'alMsg');
    l.appendChild(alloEl('span', '', x.id === C.id ? '👁️' : '💾'));
    const s = alloEl('span', '', alloJourHeure(x.le) + ' — ' + (x.quoi || 'Copie'));
    s.appendChild(alloEl('small', '', (x.par || '?') + ' · ligne ' + (x.nom || x.numero || '')));
    const actions = alloEl('div', '');
    actions.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;';
    if(x.id !== C.id){
      const v = alloEl('button', 'alPetit', 'Voir');
      v.type = 'button';
      v.addEventListener('click', () => chargerAlloAgent(x.id));
      actions.appendChild(v);
    }
    if(x.id !== plusRecente){
      const r = alloEl('button', 'alPetit', '↩️ Remettre dans Allo');
      r.type = 'button';
      r.addEventListener('click', async () => {
        const oui = (typeof confirmer === 'function')
          ? await confirmer('Remettre dans Allo la copie du ' + alloJourHeure(x.le) + ' ?\n\nSes instructions, son accueil, ses horaires et ce qu’elle sait redeviennent ceux de cette copie, dès le prochain appel. Ce qu’elle a maintenant est gardé avant.', 'Remettre') : true;
        if(oui){ r.disabled = true; alloAgentEnvoyer({ action: 'alloAgentRemettre', id: x.id }, '↩️ Remis dans Allo'); }
      });
      actions.appendChild(r);
    }
    if(actions.children.length) s.appendChild(actions);
    l.appendChild(s);
    b.appendChild(l);
  });
  return b;
}

/* ============================================================
   🤖 L'ONGLET « IA D'ALLO » DU DOSSIER
   ============================================================ */
const alloDossier = { eleve: '', d: null, corps: null };

async function ongletAlloIaEleve(corps, nom){
  alloDossier.corps = corps;
  if(alloDossier.eleve !== nom){ alloDossier.eleve = nom; alloDossier.d = null; }
  corps.innerHTML = '<div class="empty">Lecture de ce que sait l’IA d’Allo…</div>';
  try{
    const d = await appelPrep({ action: 'alloIaEleve', eleve: nom });
    if(alloDossier.eleve !== nom) return;
    if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
    alloDossier.d = d;
  }catch(e){
    corps.innerHTML = '';
    corps.appendChild(alloEl('div', 'empty', 'Impossible de lire : ' + (e.message || e)));
    return;
  }
  dessinerAlloDossier();
}

async function alloDossierEnvoyer(corps, bravo){
  try{
    const d = await appelPrep(Object.assign({ eleve: alloDossier.eleve }, corps));
    if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
    alloDossier.d = d;
    if(bravo) alloToast(bravo);
  }catch(e){ alloToast('⚠️ ' + (e.message || e)); }
  dessinerAlloDossier();
}

function dessinerAlloDossier(){
  const corps = alloDossier.corps, d = alloDossier.d;
  if(!corps || !d || !corps.isConnected) return;
  const peut = typeof peutModifier === 'function' ? peutModifier('appels') : false;
  const prenom = alloPrenom(d.eleve) || d.eleve;
  corps.innerHTML = '';
  const w = alloEl('div', 'alDossier');

  /* ① ce qu'elle peut dire de lui, case par case */
  const b1 = alloEl('div', 'amBloc');
  b1.appendChild(alloEl('h3', '', '🤖 Ce que l’IA d’Allo peut dire de ' + prenom));
  b1.appendChild(alloEl('div', 'amMeta', '« Comme pour tous » suit Gestion › L’IA d’Allo' + (peut ? '' : ' · lecture seule')));
  if(!d.reconnu.eleve) b1.appendChild(alloEl('div', 'amAlerte', '⚠️ Le numéro des élèves n’est pas reconnu (Gestion › L’IA d’Allo) : elle ne dit rien de ' + prenom + ' quand il appelle.'));
  ALLO_IA_DOSSIER.forEach(([k, t]) => {
    const l = alloEl('div', 'alLigne');
    const s = alloEl('span', '', t);
    const pour = d.regles[k] ? 'oui' : 'non';
    let petit = d.infos[k] || '';
    if(!d.choix[k] && pour === 'non') petit += (petit ? ' · ' : '') + 'non pour tous';
    s.appendChild(alloEl('small', '', petit));
    l.appendChild(s);
    const tri = alloEl('span', 'alTri');
    tri.setAttribute('role', 'group');
    tri.setAttribute('aria-label', t);
    [['', 'Comme pour tous'], ['oui', 'Oui'], ['non', 'Non']].forEach(([v, n]) => {
      const on = (d.choix[k] || '') === v;
      const b = alloEl('button', (v === 'non' ? 'non' : '') + (on ? ' on' : ''), n);
      b.type = 'button';
      b.disabled = !peut;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.addEventListener('click', () => { if(!on) alloDossierEnvoyer({ action: 'alloIaEleveChoix', cle: k, valeur: v }, '✅ Enregistré pour ' + prenom); });
      tri.appendChild(b);
    });
    l.appendChild(tri);
    b1.appendChild(l);
  });
  w.appendChild(b1);

  const droite = alloEl('div', '');
  /* ② les messages pour lui ou ses proches */
  const b2 = alloEl('div', 'amBloc alEspace');
  b2.appendChild(alloEl('h3', '', '💬 Messages pour ' + prenom + ' ou ses proches'));
  if(!d.messages.length) b2.appendChild(alloEl('div', 'amMeta alSansMarge', 'Aucun message en cours.'));
  d.messages.forEach(m => {
    const l = alloEl('div', 'alMsg');
    l.appendChild(alloEl('span', '', '✉️'));
    const s = alloEl('span', '', '« ' + m.texte + ' »');
    const pour = (ALLO_IA_POUR.find(x => x[0] === m.pour) || ['', ''])[1].toLowerCase();
    const quand = m.quand === 'demande' ? 'seulement si on lui demande' : 'dès le début de l’appel';
    const jusqu = m.jusqu === 'une' ? 'une seule fois' : m.jusqu === 'sans' ? 'sans fin' : 'jusqu’au ' + alloIsoFr(m.jusqu).slice(0, 5);
    s.appendChild(alloEl('small', '', 'pour : ' + pour + ' · ' + quand + ' · ' + jusqu + ' · par ' + (m.par || '?')));
    l.appendChild(s);
    if(peut){
      const x = alloEl('button', 'x alCroix', '✕');
      x.type = 'button';
      x.title = 'Retirer ce message';
      x.setAttribute('aria-label', 'Retirer ce message');
      x.addEventListener('click', async () => {
        const oui = (typeof confirmer === 'function') ? await confirmer('Retirer ce message ?\n\n« ' + m.texte + ' »', 'Retirer', true) : true;
        if(oui) alloDossierEnvoyer({ action: 'alloIaMessage', retirer: m.id }, '✉️ Message retiré');
      });
      l.appendChild(x);
    }
    b2.appendChild(l);
  });
  if(peut){
    const ch = alloEl('div', 'alChamp');
    const lab = alloEl('label', '', 'Nouveau message');
    const ta = document.createElement('textarea');
    ta.className = 'alSaisie';
    ta.id = 'alloNouveauMsg';
    lab.htmlFor = ta.id;
    ta.maxLength = 500;
    ta.placeholder = 'Ce qu’elle doit dire à ' + prenom + ' ou à ses proches…';
    ch.append(lab, ta);
    b2.appendChild(ch);
    const champs = alloEl('div', 'amChamps');
    const choix = (id, titre, options) => {
      const c = alloEl('div', '');
      const l = alloEl('label', '', titre);
      const s = document.createElement('select');
      s.id = id;
      l.htmlFor = id;
      options.forEach(([v, n]) => { const o = document.createElement('option'); o.value = v; o.textContent = n; s.appendChild(o); });
      c.append(l, s);
      champs.appendChild(c);
      return s;
    };
    const sPour = choix('alloPour', 'Qui peut l’entendre', ALLO_IA_POUR);
    const semaine = alloIsoPlus(7);
    const sJusqu = choix('alloJusqu', 'Jusqu’au', [['une', 'Une seule fois'], [semaine, alloIsoFr(semaine)], ['sans', 'Sans fin']]);
    const sQuand = choix('alloQuand', 'Quand le dire', ALLO_IA_QUAND);
    b2.appendChild(champs);
    const go = alloEl('button', 'btn btn-primary amGo', '💬 Poser le message');
    go.type = 'button';
    go.addEventListener('click', () => {
      const t = ta.value.trim();
      if(!t){ alloToast('Écris ce qu’elle doit dire.'); return; }
      go.disabled = true;
      alloDossierEnvoyer({ action: 'alloIaMessage', texte: t, pour: sPour.value, jusqu: sJusqu.value, quand: sQuand.value }, '💬 Message posé — dès le prochain appel');
    });
    b2.appendChild(go);
  }
  droite.appendChild(b2);

  /* ③ ce qu'elle dirait aujourd'hui */
  const b3 = alloEl('div', 'amBloc alEspace');
  b3.appendChild(alloEl('h3', '', 'Ce qu’elle dirait aujourd’hui'));
  b3.appendChild(alloEl('div', 'alCitation', '« ' + d.apercu + ' »'));
  const notes = [];
  (d.nonDit || []).forEach(x => notes.push(x.nom.charAt(0).toUpperCase() + x.nom.slice(1) + ' n’est pas dit (' +
    (x.pourLui ? 'réglé à « Non » pour ' + prenom : 'décoché pour tous') + ') : elle propose que le bureau rappelle.'));
  if((d.siDemande || []).length) notes.push('Si on lui demande : « ' + d.siDemande.join(' » · « ') + ' »');
  if(!d.peutAcces && (d.choix.acces || (d.regles.acces ? 'oui' : 'non')) === 'oui') notes.push('📧 Elle ne pourra pas renvoyer son accès : ' + (d.infos.acces || '') + '.');
  notes.forEach(n => b3.appendChild(alloEl('div', 'amMeta alEspace', n)));
  droite.appendChild(b3);
  w.appendChild(droite);
  corps.appendChild(w);
}

/* ============================================================
   📞 « CE QUE L'IA D'ALLO A FAIT », SUR UN APPEL
   Le Worker rattache à chaque appel reçu les gestes de l'IA faits
   pendant cet appel (même numéro, pendant l'appel) — voir
   gestesAlloIaDesAppels. Rien n'est recalculé ici.
   ============================================================ */
/* 📞 v1513 — un geste par ligne, avec son heure (schéma du Suivi des
   appels redessiné, validé le 20/11) */
const ICONES_IA_ALLO = { debut_appel: '🔎', message: '✉️', signaler_retard: '⏰', laisser_demande: '📝', renvoyer_acces: '📧', creneaux_libres: '🗓️', horaires_agences: '🏢',
  noter_renseignement: '🪪', documents: '📎' };   /* 🪪 v1516 */
function blocIaAllo(a){
  const l = (a && Array.isArray(a.ia)) ? a.ia.filter(x => x && x.resume) : [];
  if(!l.length) return null;
  const vus = {};
  const d = alloEl('div', 'alIa axIa');
  const t = alloEl('div', 'axIaT');
  t.append(alloEl('span', 'axDot ia'), document.createTextNode('L’IA D’ALLO PENDANT CET APPEL'));
  d.appendChild(t);
  const ol = document.createElement('ol');
  l.forEach(x => {
    if(vus[x.resume]) return;
    vus[x.resume] = 1;
    const li = alloEl('li', x.ok === false ? 'ko' : '');
    li.appendChild(alloEl('span', 'axIaI', ICONES_IA_ALLO[x.outil] || '🤖'));
    li.appendChild(alloEl('span', '', String(x.resume).replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, '') + (x.ok === false ? ' ⚠️' : '')));
    li.appendChild(alloEl('span', 'axIaH', x.le ? new Date(x.le).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }) : ''));
    ol.appendChild(li);
  });
  d.appendChild(ol);
  return d;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-allo-ia.js'] = true;
