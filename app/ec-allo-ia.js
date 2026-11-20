/* Déployé le 20/11/2026 à 12:19 — v1511 */
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
  [['dire', '✅ Ce qu’elle peut dire'], ['consignes', '📜 Ses consignes'], ['versions', '🕘 Versions']].forEach(([k, t]) => {
    const b = alloEl('button', alloIaSous === k ? 'on' : '', t);
    b.type = 'button';
    b.setAttribute('aria-pressed', alloIaSous === k ? 'true' : 'false');
    b.addEventListener('click', () => { alloIaSous = k; dessinerAlloIa(); });
    ong.appendChild(b);
  });
  z.appendChild(ong);
  if(alloIaSous === 'consignes') z.appendChild(alloConsignes(E));
  else if(alloIaSous === 'versions') z.appendChild(alloVersions(E));
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
  etape('Active le connecteur pour ton agent, avec ses six outils : <code>debut_appel</code>, <code>creneaux_libres</code>, <code>horaires_agences</code>, <code>renvoyer_acces</code>, <code>laisser_demande</code>, <code>signaler_retard</code>.');
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
function blocIaAllo(a){
  const l = (a && Array.isArray(a.ia)) ? a.ia.filter(x => x && x.resume) : [];
  if(!l.length) return null;
  const vus = {};
  const bouts = [];
  l.forEach(x => { if(vus[x.resume]) return; vus[x.resume] = 1; bouts.push(x.resume + (x.ok === false ? ' ⚠️' : '')); });
  const d = alloEl('div', 'alIa');
  d.appendChild(document.createTextNode('🤖 '));
  d.appendChild(alloEl('b', '', 'Ce que l’IA d’Allo a fait'));
  d.appendChild(document.createTextNode(' · ' + bouts.join(' · ')));
  return d;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-allo-ia.js'] = true;
