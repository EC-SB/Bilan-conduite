/* Déployé le 20/11/2026 à 16:03 — v1517 */
/* ============================================================
   ec-fiche-infos.js — v1516 — SA FICHE, EN LIGNES

   David, le 20 novembre (schéma validé : « code ça et je verrai à
   l'usage ») : plus de fenêtre « Modifier la fiche » dans le dossier —
   elle ouvrait son espace et ses aides avant les informations dont on
   a besoin. L'onglet Fiche montre tout en lignes, on voit ce qui
   manque, et une ligne touchée se remplit sur place.

   · le lieu de naissance, l'adresse, la date du code et le responsable
     légal d'un mineur sont dans la fiche (jamais dans le questionnaire
     de l'espace élève) ;
   · 📞 coché : l'IA d'Allo le demande au prochain appel ;
   · ce que l'élève remplit dans « 🪪 Mes infos » arrive « à vérifier » ;
     ce qu'il change attend ✅ Accepter / ✕ Refuser ;
   · le NEPH manquant dit où on en est ; les documents ne s'ouvrent que
     si le dossier ANTS est fait par nous.

   Deux endroits :
   · l'onglet Fiche du dossier (carteFicheInfos, appelée par ongletFiche
     dans ec-page-eleve.js) ;
   · Gestion › L'IA d'Allo › 📋 Les infos à demander (alloFicheInfos,
     appelée par dessinerAlloIa dans ec-allo-ia.js).

   Où c'est rangé : « SA FICHE » dans cloudflare-worker.js.
   ============================================================ */

function fiEl(tag, cls, texte){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(texte != null) e.textContent = texte;
  return e;
}
function fiBouton(cls, texte, titre, f){
  const b = fiEl('button', cls, texte);
  b.type = 'button';
  if(titre) b.title = titre;
  if(f) b.addEventListener('click', (e) => { e.stopPropagation(); f(e); });
  return b;
}
function fiToast(t){ if(typeof showToast === 'function') showToast(t); }
function fiJour(ms){ return ms ? new Date(ms).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit' }) : ''; }
function fiPeut(){ return (typeof peutModifier !== 'function') || peutModifier('eleves'); }
function fiSansEmoji(t){ return String(t || '').replace(/^[^\p{L}\p{N}«]+/u, '').trim(); }
function fiPrenom(nom){
  const mots = String(nom || '').replace(/\([^)]*\)/g, ' ').trim().split(/\s+/).filter(Boolean);
  return mots.find(w => /[a-zà-ÿ]/.test(w) && w !== w.toUpperCase()) || mots[0] || '';
}
function fiIsoVersFr(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || '');
}
function fiAge(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return null;
  const auj = new Date();
  let a = auj.getFullYear() - +m[1];
  if(auj.getMonth() + 1 < +m[2] || (auj.getMonth() + 1 === +m[2] && auj.getDate() < +m[3])) a--;
  return a >= 0 && a < 130 ? a : null;
}

/* ============================================================
   L'ONGLET FICHE — « 🪪 Sa fiche »
   ============================================================ */
const FI_CACHE = {};
function carteFicheInfos(corps, nom){
  const c = fiEl('div', 'anCarte');
  c.id = 'fiNouvelle';
  corps.appendChild(c);
  dessinerFicheInfos(c, nom, FI_CACHE[nom] || null);
  chargerFicheInfos(c, nom);
  return c;
}
async function chargerFicheInfos(c, nom){
  try{
    const d = await appelPrep({ action: 'ficheInfos', eleve: nom });
    if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
    fiSuivreLaFiche(nom, d);
    FI_CACHE[nom] = d;
    if(c.isConnected) dessinerFicheInfos(c, nom, d);
  }catch(e){
    const z = c.querySelector('.anErreur');
    if(z) z.textContent = '⚠️ Les infos du dossier ne se lisent pas : ' + (e.message || e);
  }
}
/* La fiche en mémoire suit ce que le serveur a écrit (âge, NEPH, contact) */
function fiSuivreLaFiche(nom, d){
  const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
  if(!f || !d) return;
  ['naissance', 'neph', 'telephone', 'email'].forEach(k => { if(d[k] !== undefined) f[k] = d[k]; });
}
async function poserFicheInfos(c, nom, corps, bravo){
  try{
    const d = await appelPrep(Object.assign({ action: 'ficheInfosPoser', eleve: nom }, corps));
    if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
    fiSuivreLaFiche(nom, d);
    FI_CACHE[nom] = d;
    dessinerFicheInfos(c, nom, d);
    if(bravo) fiToast(bravo);
    return '';
  }catch(e){ fiToast('⚠️ ' + (e.message || e)); return e.message || String(e); }
}
/* Les cases de la feuille du répertoire passent par la porte habituelle */
async function poserCaseFiche(c, nom, champs, bravo){
  try{
    const r = await appelPrep(Object.assign({ action: 'ficheSet', eleve: nom }, champs));
    if(r && r.status === 'error') throw new Error(r.message);
    const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
    if(f) Object.assign(f, champs);
    if(typeof fichesLues !== 'undefined') fichesLues = 0;
    dessinerFicheInfos(c, nom, FI_CACHE[nom] || null);
    if(bravo) fiToast(bravo);
    if(champs.ants !== undefined) chargerFicheInfos(c, nom);
    return '';
  }catch(e){ fiToast('⚠️ ' + (e.message || e)); return e.message || String(e); }
}

function dessinerFicheInfos(c, nom, d){
  const peut = fiPeut();
  const f = (typeof ficheDe === 'function') ? (ficheDe(nom) || {}) : {};
  const prenom = (d && d.prenom) || fiPrenom(nom);
  const elle = f.genre === 'F';
  const ants = (d && d.ants !== undefined) ? d.ants : String(f.ants || '');
  const L = (d && d.lignes) || [];
  const ligneDe = k => L.find(l => l.k === k) || null;
  c.innerHTML = '';

  const t = fiEl('div', 'anTete');
  t.append(document.createTextNode('🪪 '), fiEl('strong', '', 'Sa fiche'));
  if(peut && d) t.appendChild(fiBouton('anBtn', '☑️ Cocher ce qui manque', 'Ce qui manque pour le permis passe en « 📞 À demander » (les documents se cochent un par un)',
    () => poserFicheInfos(c, nom, { geste: 'cocherManque' }, '☑️ Coché ce qui manque')));
  c.appendChild(t);
  c.appendChild(fiEl('div', 'anDit', (peut ? 'Touche une ligne pour la remplir ou la corriger : elle s’enregistre tout de suite. ' : '') +
    'En orange, ce qui manque pour le permis ; un tiret, ce qui est facultatif. Coché 📞 : l’IA d’Allo le demande au prochain appel de ' +
    prenom + ' ou d’un proche enregistré.'));
  c.appendChild(fiEl('div', 'anDit anErreur', d ? '' : 'Lecture des infos du dossier…'));

  /* ---- Pour le permis ---- */
  c.appendChild(fiEl('div', 'anGroupe', 'Pour le permis'));
  ['naissance', 'naissLieu', 'adresse', 'neph', 'dateCode'].forEach(k => {
    const l = ligneDe(k);
    if(!l && d) return;
    c.appendChild(ligneInfoFi(c, nom, d, l || { k: k, titre: FI_TITRES_EC[k], genre: 'info', type: FI_TYPES_EC[k] || 'texte', valeur: k === 'naissance' ? fiNaissanceLisible(f.naissance) : (k === 'neph' ? String(f.neph || '') : ''), brut: '', attente: !d },
      { ants: ants, prenom: prenom, elle: elle, peut: peut }));
  });
  /* le dossier ANTS : le même champ que le questionnaire des cours */
  const la = fiEl('div', 'anLigne');
  la.append(fiEl('span', 'anK', '📇 Dossier ANTS'));
  const va = fiEl('span', 'anV');
  const pill = fiEl('span', 'anPill');
  [['nous', 'Fait par nous'], ['eleve', 'Fait par l’élève']].forEach(([v, txt]) => {
    const s = fiBouton(ants === v ? 'on' : '', txt, peut ? (ants === v ? 'Toucher pour revenir à « non renseigné »' : '') : '', peut ? () => poserCaseFiche(c, nom, { ants: ants === v ? '' : v }, '📇 Dossier ANTS : ' + (ants === v ? 'non renseigné' : txt.toLowerCase())) : null);
    s.disabled = !peut;
    pill.appendChild(s);
  });
  va.appendChild(pill);
  la.append(va, fiAskVide());
  c.appendChild(la);

  /* ---- Contact ---- */
  c.appendChild(fiEl('div', 'anGroupe', 'Contact'));
  const props = (d && d.contact) || [];
  const prop = k => props.find(p => p.k === k);
  if(prop('nom')) c.appendChild(fiProposition(c, nom, prop('nom'), prenom, true));
  c.appendChild(ligneFicheFi(c, nom, { k: 'telephone', titre: '📱 Téléphone', type: 'tel', valeur: f.telephone, verif: d && d.verifContact && d.verifContact.telephone }, peut, prenom));
  if(prop('telephone')) c.appendChild(fiProposition(c, nom, prop('telephone'), prenom));
  c.appendChild(ligneFicheFi(c, nom, { k: 'email', titre: '✉️ Mail', type: 'email', valeur: f.email, verif: d && d.verifContact && d.verifContact.email }, peut, prenom));
  if(prop('email')) c.appendChild(fiProposition(c, nom, prop('email'), prenom));
  c.appendChild(ligneFicheFi(c, nom, { k: 'mailPrescripteur', titre: '✉️ Mail du prescripteur', type: 'email', valeur: f.mailPrescripteur, facultatif: true,
    aide: 'Représentant légal, ou celui qui paie : il reçoit une copie des bilans.' }, peut, prenom));
  c.appendChild(ligneFicheFi(c, nom, { k: 'messenger', titre: '💬 Messenger', valeur: f.messenger, facultatif: true }, peut, prenom));

  /* ---- Responsable légal ---- */
  const mineur = d ? d.mineur : (fiAge(f.naissance) === null ? null : fiAge(f.naissance) < 18);
  if(mineur !== false){
    const h = fiEl('div', 'anGroupe', 'Responsable légal');
    h.appendChild(fiEl('small', '', mineur === true ? '— ' + (elle ? 'elle est mineure' : (f.genre === 'M' ? 'il est mineur' : 'mineur')) : '— seulement s’il est mineur (date de naissance inconnue)'));
    c.appendChild(h);
    ['rlNom', 'rlAdresse', 'rlNaissance', 'rlTel', 'rlMail'].forEach(k => {
      const l = ligneDe(k);
      if(!l && d) return;
      c.appendChild(ligneInfoFi(c, nom, d, l || { k: k, titre: FI_TITRES_EC[k], genre: 'info', type: FI_TYPES_EC[k] || 'texte', valeur: '', attente: true },
        { ants: ants, prenom: prenom, elle: elle, peut: peut }));
    });
  }

  /* ---- Autres infos (pour tous, ou pour lui seulement) ---- */
  const autres = L.filter(l => l.genre === 'info' && l.groupe === 'autre');
  if(autres.length){
    c.appendChild(fiEl('div', 'anGroupe', 'Autres infos'));
    autres.forEach(l => c.appendChild(ligneInfoFi(c, nom, d, l, { ants: ants, prenom: prenom, elle: elle, peut: peut })));
  }

  /* ---- Sa formation ---- */
  c.appendChild(fiEl('div', 'anGroupe', 'Sa formation'));
  c.appendChild(ligneFicheFi(c, nom, { k: 'formation', titre: '🎓 Formation', valeur: f.formation, choix: true }, peut, prenom));
  if(typeof ligneGroupePasserelle === 'function'){ const lp = ligneGroupePasserelle(nom, () => dessinerFicheInfos(c, nom, FI_CACHE[nom] || null)); if(lp) c.appendChild(lp); }
  if(typeof ligneReunirPasserelle === 'function'){ const lr = ligneReunirPasserelle(nom); if(lr) c.appendChild(lr); }
  const lg = fiEl('div', 'anLigne');
  lg.append(fiEl('span', 'anK', 'Genre — pour les accords du bilan'));
  const vg = fiEl('span', 'anV');
  const pg = fiEl('span', 'anPill');
  [['F', 'Elle'], ['M', 'Il']].forEach(([v, txt]) => {
    const s = fiBouton(f.genre === v ? 'on' : '', txt, '', peut ? () => { if(f.genre !== v) poserCaseFiche(c, nom, { genre: v }, '✅ ' + txt); } : null);
    s.disabled = !peut;
    pg.appendChild(s);
  });
  vg.appendChild(pg);
  lg.append(vg, fiAskVide());
  c.appendChild(lg);
  c.appendChild(ligneFicheFi(c, nom, { k: 'frise', titre: '🧭 Frise', valeur: f.frise, frise: true, facultatif: true }, peut, prenom));
  c.appendChild(ligneFicheFi(c, nom, { k: 'autreAENom', titre: '🏫 Auto-école d’avant', valeur: f.autreAE ? (f.autreAENom || 'Oui') : '', facultatif: true, vide: 'Non',
    aide: 'Le nom de l’auto-école d’avant (« Oui » si on ne le sait pas).' }, peut, prenom));
  c.appendChild(ligneFicheFi(c, nom, { k: 'remarques', titre: '📝 Remarques', valeur: f.remarques, long: true, facultatif: true }, peut, prenom));

  /* ---- Documents ---- */
  const hd = fiEl('div', 'anGroupe', 'Documents');
  c.appendChild(hd);
  if(ants === 'nous'){
    hd.appendChild(fiEl('small', '', '— l’IA dit de les envoyer par mail à ' + ((d && d.mail) || 'contact@evolutionconduites.fr') +
      ((d && d.messagerie) ? ', ou sur sa messagerie' : ' (pas de messagerie sur son espace)')));
    if(!d) c.appendChild(fiEl('div', 'anDit', 'Lecture…'));
    L.filter(l => l.genre === 'doc').forEach(l => c.appendChild(ligneDocFi(c, nom, d, l, peut, prenom)));
  }else{
    const l = fiEl('div', 'anLigne anFixe');
    l.appendChild(fiEl('span', 'anK', ants === 'eleve'
      ? '📇 C’est ' + prenom + ' qui fait son dossier ANTS : rien à lui demander ici.'
      : '📇 Dossier ANTS non renseigné : choisis « Fait par nous » plus haut pour suivre ses documents.'));
    c.appendChild(l);
  }

  /* ---- le pied ---- */
  const pied = fiEl('div', 'anDit anPied');
  if(peut && d){
    const a = fiBouton('anLien', '＋ Ajouter quelque chose à demander à ' + prenom, 'Une information ou un document pour cet élève seulement', () => ajouterFicheInfos(c, nom, prenom));
    pied.appendChild(a);
    pied.appendChild(document.createTextNode(' · '));
  }
  pied.appendChild(document.createTextNode('la liste pour tous les élèves : Gestion › L’IA d’Allo › 📋 Les infos à demander.'));
  if(peut && typeof dupliquerPourAutreFormation === 'function' && f.eleve){
    pied.appendChild(document.createElement('br'));
    pied.appendChild(fiBouton('anLien', '➕ Une autre formation pour cet élève', '', () => dupliquerPourAutreFormation(nom, f)));
  }
  c.appendChild(pied);
}

const FI_TITRES_EC = { naissance: '🎂 Date de naissance', naissLieu: '📍 Lieu de naissance', adresse: '🏠 Adresse', neph: '🪪 NEPH', dateCode: '📚 Code obtenu le',
  rlNom: '👤 Nom et prénom', rlAdresse: '🏠 Son adresse', rlNaissance: '🎂 Sa date de naissance', rlTel: '📱 Son téléphone', rlMail: '✉️ Son mail' };
const FI_TYPES_EC = { naissance: 'date', dateCode: 'date', rlNaissance: 'date', neph: 'neph', rlTel: 'tel', rlMail: 'mail' };
function fiNaissanceLisible(iso){
  if(!iso) return '';
  const a = fiAge(iso);
  return fiIsoVersFr(iso) + (a !== null ? ' · ' + a + ' ans' : '');
}
/* Le rond 📞 (vide quand la ligne n'a rien à demander, pour garder l'alignement) */
function fiAskVide(){ const b = fiEl('button', 'anAsk fait', '📞'); b.type = 'button'; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); return b; }
function fiAsk(c, nom, l, peut){
  if(!l || l.obtenu || l.ia === false || l.applicable === false || l.attente) return fiAskVide();
  const ask = fiBouton('anAsk' + (l.demander ? ' on' : ''), '', l.demander ? 'L’IA d’Allo le demande au prochain appel — toucher pour ne plus le demander' : 'Le faire demander par l’IA d’Allo au prochain appel',
    peut ? () => poserFicheInfos(c, nom, { geste: 'demander', k: l.k, on: !l.demander }) : null);
  ask.innerHTML = '📞<span class="mots"> ' + (l.demander ? 'À demander' : 'Demander') + '</span>';
  ask.setAttribute('aria-pressed', l.demander ? 'true' : 'false');
  ask.disabled = !peut;
  return ask;
}
/* « 🧑‍🎓 Léa le 20/11 · à vérifier » / « 🤖 IA le 18/11 · à vérifier » + ✅ */
function fiVerif(c, nom, v, k, prenom, peut){
  const z = document.createDocumentFragment();
  if(!v) return z;
  const qui = v.qui === 'eleve' ? '🧑‍🎓 ' + prenom : (v.qui === 'ia' || /IA/.test(v.par || '') ? '🤖 IA' : '✏️ ' + (v.par || ''));
  z.appendChild(fiEl('em', 'anSrc ia', qui + ' le ' + fiJour(v.le) + ' · à vérifier'));
  if(peut) z.appendChild(fiBouton('anMini', '✅', 'C’est juste', () => poserFicheInfos(c, nom, { geste: 'verifie', k: k }, '✅ Vérifié')));
  return z;
}

/* Une ligne des infos du dossier (D1, ou naissance / NEPH de la fiche) */
function ligneInfoFi(c, nom, d, l, o){
  const z = fiEl('div', 'anLigne');
  const k = fiEl('span', 'anK', l.titre);
  if(l.perso){
    k.appendChild(fiEl('span', 'anPour', ' · pour ' + o.prenom));
    if(o.peut) k.appendChild(fiBouton('anSuppr', '✕', 'Retirer de sa liste', async () => {
      if(typeof confirmer === 'function' && !await confirmer('Retirer « ' + fiSansEmoji(l.titre) + ' » de la liste de ' + o.prenom + ' ?', 'Retirer')) return;
      poserFicheInfos(c, nom, { geste: 'retirer', k: l.k });
    }));
  }
  z.appendChild(k);
  const v = fiEl('span', 'anV');
  if(l.valeur){
    v.appendChild(document.createTextNode(l.valeur));
    v.appendChild(fiVerif(c, nom, l.verif, l.k, o.prenom, o.peut));
  }else if(l.attente){
    v.classList.add('muet'); v.textContent = '…';
  }else if(l.k === 'neph' && o.ants === 'eleve'){
    v.appendChild(fiEl('span', 'anManque', 'manque'));
    v.appendChild(fiEl('span', 'anPar', ' · c’est ' + o.prenom + ' qui fait son dossier : ' + (o.elle ? 'elle' : 'il') + ' nous le donne dès qu’' + (o.elle ? 'elle' : 'il') + ' l’a'));
  }else{
    v.appendChild(fiEl('span', 'anManque', 'manque'));
    if(l.k === 'neph' && o.ants === 'nous'){
      const e = fiEl('span', 'anEtat');
      [['docs', '📄 Il manque des documents'], ['ants', '⏳ En cours à l’ANTS']].forEach(([val, txt]) => {
        const on = d && d.nephEtat === val;
        const b = fiBouton(on ? 'on' : '', txt, on ? 'Toucher pour retirer' : 'Où en est son dossier ANTS : ' + fiSansEmoji(txt).toLowerCase(),
          o.peut ? () => poserFicheInfos(c, nom, { geste: 'nephEtat', valeur: on ? '' : val }) : null);
        b.disabled = !o.peut;
        e.appendChild(b);
      });
      v.appendChild(e);
    }
  }
  z.appendChild(v);
  if(l.propose){
    /* ce que l'élève a signalé : juste au-dessus de sa ligne */
    const wrap = document.createDocumentFragment();
    wrap.appendChild(fiProposition(c, nom, { k: l.k, titre: l.titre, valeur: l.propose.valeur, le: l.propose.le }, o.prenom));
    wrap.appendChild(z);
    z.appendChild(fiAsk(c, nom, l, o.peut));
    if(o.peut && !l.attente) fiEditable(z, v, () => fiEditerInfo(c, nom, l, z, v));
    const tout = fiEl('div', '');
    tout.style.display = 'contents';
    tout.appendChild(wrap);
    return tout;
  }
  z.appendChild(fiAsk(c, nom, l, o.peut));
  if(o.peut && !l.attente) fiEditable(z, v, () => fiEditerInfo(c, nom, l, z, v));
  return z;
}
function fiEditable(z, v, ouvrir){
  z.classList.add('touchable');
  z.tabIndex = 0;
  z.setAttribute('role', 'button');
  z.addEventListener('click', (e) => { if(z.querySelector('.anEdit')) return; if(e.target.closest('button,a,input,select,textarea')) return; ouvrir(); });
  z.addEventListener('keydown', (e) => { if((e.key === 'Enter' || e.key === ' ') && e.target === z){ e.preventDefault(); ouvrir(); } });
}
/* L'éditeur sur place : la valeur, ✓, Annuler (Entrée / Échap) */
function fiEditeur(z, v, o, valider){
  const ed = fiEl('span', 'anEdit');
  let i;
  if(o.choix){
    i = document.createElement('select');
    o.choix.forEach(([val, txt]) => { const op = document.createElement('option'); op.value = val; op.textContent = txt; i.appendChild(op); });
    i.value = o.valeur || '';
  }else if(o.long){
    i = document.createElement('textarea'); i.rows = 2; i.value = o.valeur || '';
  }else{
    i = document.createElement('input');
    i.type = o.type === 'date' ? 'date' : (o.type === 'email' || o.type === 'mail' ? 'email' : (o.type === 'tel' ? 'tel' : 'text'));
    if(o.type === 'neph'){ i.inputMode = 'numeric'; i.placeholder = '12 chiffres'; }
    if(o.placeholder) i.placeholder = o.placeholder;
    i.value = o.valeur || '';
  }
  i.setAttribute('aria-label', o.titre || '');
  const ok = fiBouton('btn btn-primary', '✓', 'Enregistrer');
  const non = fiBouton('btn btn-secondary', 'Annuler');
  ed.append(i, ok, non);
  const garde = Array.from(z.childNodes);
  const annuler = () => { z.innerHTML = ''; garde.forEach(n => z.appendChild(n)); z.focus(); };
  const envoyer = async () => {
    ok.disabled = true; non.disabled = true;
    const err = await valider(i.value.trim());
    if(err){ ok.disabled = false; non.disabled = false; i.focus(); }
  };
  ok.addEventListener('click', (e) => { e.stopPropagation(); envoyer(); });
  non.addEventListener('click', (e) => { e.stopPropagation(); annuler(); });
  i.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){ e.preventDefault(); annuler(); }
    if(e.key === 'Enter' && !o.long){ e.preventDefault(); envoyer(); }
  });
  z.innerHTML = '';
  z.append(fiEl('span', 'anK', o.titre), ed);
  setTimeout(() => i.focus(), 30);
}
function fiEditerInfo(c, nom, l, z, v){
  let valeur = l.brut || '';
  if(l.k === 'naissance'){ const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null; valeur = (f && f.naissance) || ''; }
  if(l.k === 'neph'){ const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null; valeur = (f && f.neph) || l.brut || ''; }
  fiEditeur(z, v, { titre: l.titre, type: l.type, valeur: valeur, long: l.long }, (val) =>
    poserFicheInfos(c, nom, { geste: 'corriger', k: l.k, valeur: val }, val ? '✏️ ' + fiSansEmoji(l.titre) + ' enregistré' : '✏️ ' + fiSansEmoji(l.titre) + ' vidé'));
}
/* Une ligne de la feuille du répertoire (contact, formation…) */
function ligneFicheFi(c, nom, o, peut, prenom){
  const z = fiEl('div', 'anLigne');
  z.appendChild(fiEl('span', 'anK', o.titre));
  const v = fiEl('span', 'anV');
  let val = String(o.valeur || '').trim();
  if(o.k === 'telephone' && val && typeof telLisible === 'function') val = telLisible(val);
  if(val){
    v.appendChild(document.createTextNode(val));
    if(o.k === 'telephone' && typeof telPourLien === 'function'){
      [['💬', 'sms:', 'Envoyer un SMS'], ['📞', 'tel:', 'Appeler']].forEach(([em, proto, titre]) => {
        const a = fiEl('a', 'anGeste', em);
        a.href = proto + telPourLien(o.valeur);
        a.title = titre + ' ' + nom;
        a.addEventListener('click', e => e.stopPropagation());
        v.appendChild(a);
      });
    }
    v.appendChild(fiVerif(c, nom, o.verif, o.k, prenom, peut));
  }else if(o.facultatif){
    v.classList.add('muet'); v.textContent = o.vide || '—';
  }else{
    v.appendChild(fiEl('span', 'anManque', 'manque'));
  }
  z.append(v, fiAskVide());
  if(!peut) return z;
  fiEditable(z, v, () => {
    if(o.k === 'formation'){
      const liste = (typeof toutesLesFormations === 'function') ? toutesLesFormations().map(x => [x.cle, x.nom]) : [];
      if(o.valeur && !liste.some(x => x[0] === o.valeur)) liste.unshift([o.valeur, o.valeur]);
      liste.unshift(['', '— à préciser —']);
      return fiEditeur(z, v, { titre: o.titre, choix: liste, valeur: o.valeur || '' }, (x) => {
        if(!x) return 'vide';
        return poserCaseFiche(c, nom, { formation: x }, '🎓 Formation enregistrée');
      });
    }
    if(o.k === 'frise') return fiEditerFrise(c, nom, z, v, o);
    if(o.k === 'autreAENom'){
      return fiEditeur(z, v, { titre: o.titre, valeur: (ficheDe(nom) || {}).autreAENom || '', placeholder: 'Le nom de l’auto-école d’avant' }, (x) =>
        poserCaseFiche(c, nom, { autreAE: 'oui', autreAENom: x }, '🏫 Auto-école d’avant enregistrée'));
    }
    fiEditeur(z, v, { titre: o.titre, type: o.type, valeur: o.valeur || '', long: o.long }, async (x) => {
      if(!x){ fiToast('Écris la nouvelle valeur (une case de la fiche ne se vide pas d’ici).'); return 'vide'; }
      if(o.k === 'telephone'){
        x = (typeof normaliserTel === 'function') ? normaliserTel(x) : x;
        if(!/^[+\d\s().-]{8,}$/.test(x)){ fiToast('Ce numéro ne semble pas valable.'); return 'tel'; }
      }
      if((o.k === 'email' || o.k === 'mailPrescripteur') && x.indexOf('@') === -1){ fiToast('Cette adresse mail ne semble pas valable.'); return 'mail'; }
      const r = await poserCaseFiche(c, nom, { [o.k]: x }, '✅ ' + fiSansEmoji(o.titre) + ' enregistré');
      /* une valeur vérifiée par l'équipe n'est plus « à vérifier » */
      if(!r && o.verif) poserFicheInfos(c, nom, { geste: 'verifie', k: o.k });
      return r;
    });
  });
  return z;
}
/* La frise : deux nombres, comme dans l'ancienne fenêtre */
function fiEditerFrise(c, nom, z, v, o){
  const avant = String(o.valeur || '').match(/^\s*(\d+)\s*leçons?\s*de\s*2h/i);
  const apres = String(o.valeur || '').match(/\+\s*(\d+)\s*leçons?\s*de\s*2h/i);
  const ed = fiEl('span', 'anEdit anFrise');
  const a = document.createElement('input'); a.inputMode = 'numeric'; a.maxLength = 2; a.value = avant ? avant[1] : ''; a.setAttribute('aria-label', 'Leçons avant l’examen blanc');
  const b = document.createElement('input'); b.inputMode = 'numeric'; b.maxLength = 2; b.value = apres ? apres[1] : ''; b.setAttribute('aria-label', 'Leçons après l’examen blanc');
  const ok = fiBouton('btn btn-primary', '✓', 'Enregistrer');
  const non = fiBouton('btn btn-secondary', 'Annuler');
  ed.append(a, document.createTextNode(' leçons de 2h + exam blanc + '), b, document.createTextNode(' leçons de 2h '), ok, non);
  const garde = Array.from(z.childNodes);
  non.addEventListener('click', (e) => { e.stopPropagation(); z.innerHTML = ''; garde.forEach(n => z.appendChild(n)); });
  ok.addEventListener('click', async (e) => {
    e.stopPropagation();
    const x = parseInt(a.value, 10), y = parseInt(b.value, 10);
    if(!x || !y){ fiToast('Écris les deux nombres de leçons.'); return; }
    ok.disabled = true;
    const r = await poserCaseFiche(c, nom, { frise: x + ' leçons de 2h + exam blanc + ' + y + ' leçons de 2h (' + (y * 2) + 'h) + 3h avant examen' }, '🧭 Frise enregistrée');
    if(r) ok.disabled = false;
  });
  z.innerHTML = '';
  z.append(fiEl('span', 'anK', o.titre), ed);
  setTimeout(() => a.focus(), 30);
}
/* « Léa signale un nouveau mail : … (le 20/11) ✅ Accepter ✕ Refuser » */
function fiProposition(c, nom, p, prenom, estNom){
  const z = fiEl('div', 'anPropose');
  z.appendChild(document.createTextNode('🧑‍🎓 '));
  const s = fiEl('span', '');
  s.append(document.createTextNode(prenom + ' signale ' + (estNom ? 'un autre nom' : 'un changement — ' + fiSansEmoji(p.titre).toLowerCase()) + ' : '), fiEl('b', '', p.valeur),
    document.createTextNode(' (le ' + fiJour(p.le) + ')'));
  z.appendChild(s);
  if(fiPeut()){
    if(estNom){
      z.appendChild(fiEl('span', 'anPar', 'pour renommer : ✏️ Nom, en haut du dossier'));
      z.appendChild(fiBouton('anMini', '✓ C’est fait', 'Retirer la demande', () => poserFicheInfos(c, nom, { geste: 'refuser', k: 'nom' })));
    }else{
      z.appendChild(fiBouton('anMini', '✅ Accepter', 'Écrire la nouvelle valeur dans sa fiche', () => poserFicheInfos(c, nom, { geste: 'accepter', k: p.k }, '✅ Changé dans sa fiche')));
      z.appendChild(fiBouton('anMini', '✕ Refuser', 'Garder ce qui est écrit', () => poserFicheInfos(c, nom, { geste: 'refuser', k: p.k }, 'Demande retirée')));
    }
  }
  return z;
}
function ligneDocFi(c, nom, d, l, peut, prenom){
  const z = fiEl('div', 'anLigne');
  const k = fiEl('span', 'anK', l.titre);
  if(l.perso){
    k.appendChild(fiEl('span', 'anPour', ' · pour ' + prenom));
    if(peut) k.appendChild(fiBouton('anSuppr', '✕', 'Retirer de sa liste', async () => {
      if(typeof confirmer === 'function' && !await confirmer('Retirer « ' + fiSansEmoji(l.titre) + ' » de la liste de ' + prenom + ' ?', 'Retirer')) return;
      poserFicheInfos(c, nom, { geste: 'retirer', k: l.k });
    }));
  }
  z.appendChild(k);
  const v = fiEl('span', 'anV');
  const doc = l.doc;
  if(doc && doc.etat === 'recu'){
    const p = fiBouton('anEt recu', '✓ reçu le ' + fiJour(doc.le), 'Reçu' + (doc.par ? ' — noté par ' + doc.par : '') + (peut ? ' · toucher pour le remettre en manquant' : ''),
      peut ? async () => {
        if(typeof confirmer === 'function' && !await confirmer('Remettre « ' + fiSansEmoji(l.titre) + ' » en manquant ?', 'Remettre en manquant')) return;
        poserFicheInfos(c, nom, { geste: 'recu', k: l.k, on: false });
      } : null);
    p.disabled = !peut;
    v.appendChild(p);
  }else{
    const e = doc && doc.etat === 'demande' ? fiEl('em', 'anEt demande', 'demandé le ' + fiJour(doc.le)) : fiEl('em', 'anEt manque', 'manquant');
    if(doc && doc.par) e.title = 'Demandé par ' + doc.par;
    v.appendChild(e);
    if(peut) v.appendChild(fiBouton('anMini', '✓ Reçu', 'Le document est arrivé', () => poserFicheInfos(c, nom, { geste: 'recu', k: l.k, on: true })));
  }
  z.append(v, fiAsk(c, nom, l, peut));
  return z;
}
function ajouterFicheInfos(c, nom, prenom){
  const fond = fiEl('div', 'overlay show');
  const boite = fiEl('div', 'modal');
  boite.style.maxWidth = 'min(440px, 92vw)';
  boite.appendChild(fiEl('h3', '', '＋ À demander à ' + prenom));
  const lab = fiEl('label', '', 'Quoi');
  const i = document.createElement('input'); i.type = 'text'; i.maxLength = 80; i.placeholder = 'Ex. : 📄 Autorisation parentale';
  lab.htmlFor = i.id = 'fiAjoutQuoi';
  const lab2 = fiEl('label', '', 'C’est…');
  const s = document.createElement('select');
  [['info', '📝 Une information à noter'], ['doc', '📎 Un document à envoyer']].forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); });
  lab2.htmlFor = s.id = 'fiAjoutGenre';
  const err = fiEl('div', 'anDit');
  boite.append(lab, i, lab2, s, err);
  const bas = fiEl('div', 'btn-row');
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };
  bas.appendChild(fiBouton('btn btn-secondary', 'Annuler', '', fermer));
  const ok = fiBouton('btn btn-primary', '＋ Ajouter', '', async () => {
    if(i.value.trim().length < 2){ err.textContent = 'Écris ce qu’il faut demander.'; i.focus(); return; }
    ok.disabled = true;
    const e = await poserFicheInfos(c, nom, { geste: 'ajouter', titre: i.value.trim(), genre: s.value }, '＋ Ajouté pour ' + prenom);
    ok.disabled = false;
    if(e) err.textContent = e; else fermer();
  });
  bas.appendChild(ok);
  boite.appendChild(bas);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => i.focus(), 60);
}

/* ============================================================
   GESTION › L'IA D'ALLO › 📋 LES INFOS À DEMANDER (administrateurs)
   ============================================================ */
let alloFiEtat = null;
function alloFicheInfos(){
  const w = fiEl('div', '');
  w.id = 'alloFiZone';
  if(alloFiVue === 'eleves'){ chargerTableauFi(w); return w; }
  if(alloFiEtat) dessinerAlloFicheInfos(w, alloFiEtat);
  else w.appendChild(fiEl('div', 'empty', 'Lecture de la liste…'));
  chargerAlloFicheInfos(w);
  return w;
}
async function chargerAlloFicheInfos(w, corps, bravo){
  try{
    const d = await appelPrep(corps ? Object.assign({ action: 'ficheInfosListePoser' }, corps) : { action: 'ficheInfosListe' });
    if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
    alloFiEtat = d;
    const z = document.getElementById('alloFiZone') || w;
    if(alloFiVue !== 'eleves') dessinerAlloFicheInfos(z, d);
    if(bravo) fiToast(typeof bravo === 'function' ? bravo(d) : bravo);
  }catch(e){
    if(!corps){ w.innerHTML = ''; w.appendChild(fiEl('div', 'empty', '⚠️ ' + (e.message || e))); }
    else fiToast('⚠️ ' + (e.message || e));
  }
}
function dessinerAlloFicheInfos(w, d){
  w.innerHTML = '';
  w.appendChild(ongletsAlloFi(w));   /* 👥 v1517 — par info, ou par élève */
  const intro = fiEl('div', 'crIntro');
  intro.append(document.createTextNode('Ce qu’on peut demander aux élèves pour leur dossier du permis. Deux interrupteurs par ligne : '),
    fiEl('b', '', '🧑‍🎓 Mes infos'), document.createTextNode(' — l’élève la voit « à compléter » dans son espace s’il en manque ; '),
    fiEl('b', '', '🤖 IA d’Allo'), document.createTextNode(' — l’IA peut la demander quand elle est cochée 📞 dans sa fiche. Éteint : la ligne reste dans la fiche, mais on ne la demande plus. ' +
      'Un document ne s’affiche dans « Mes infos » que si on le lui a demandé (📞 ou « demandé le »), et seulement quand on fait son dossier ANTS.'));
  w.appendChild(intro);
  const bloc = fiEl('div', 'amBloc gsBloc');
  const tab = fiEl('table', 'gsT');
  tab.innerHTML = '<thead><tr><th>Info</th><th>🧑‍🎓 Mes infos</th><th>🤖 IA d’Allo</th><th>Dans les fiches</th><th><span class="cache-lecteur">Retirer</span></th></tr></thead>';
  const tb = document.createElement('tbody');
  const groupe = (t) => { const r = fiEl('tr', 'gsG'); const td = fiEl('td', '', t); td.colSpan = 5; r.appendChild(td); tb.appendChild(r); };
  const inter = (x, quoi) => {
    const b = fiBouton('gsInter' + (x[quoi] ? ' on' : ''), '', '', async () => {
      b.disabled = true;
      await chargerAlloFicheInfos(w, { geste: 'regle', k: x.k, quoi: quoi, on: !x[quoi] }, (quoi === 'ia' ? '🤖 IA d’Allo' : '🧑‍🎓 Mes infos') + ' : ' + (x[quoi] ? 'éteint' : 'allumé') + ' pour « ' + fiSansEmoji(x.titre) + ' »');
    });
    b.setAttribute('role', 'switch');
    b.setAttribute('aria-checked', x[quoi] ? 'true' : 'false');
    b.setAttribute('aria-label', (quoi === 'ia' ? 'IA d’Allo' : 'Mes infos') + ' — ' + fiSansEmoji(x.titre));
    return b;
  };
  const ligne = (x, petit, doc) => {
    const r = document.createElement('tr');
    const t1 = fiEl('td', '', x.titre);
    t1.appendChild(fiEl('small', '', petit));
    const t2 = fiEl('td', 'c'); t2.appendChild(inter(x, 'eleve'));
    const t3 = fiEl('td', 'c'); t3.appendChild(inter(x, 'ia'));
    const t4 = fiEl('td', 'c');
    if(doc){
      t4.appendChild(fiEl('span', 'gsN', (x.demandes || x.recus) ? [x.demandes ? x.demandes + ' demandé' + (x.demandes > 1 ? 's' : '') : '', x.recus ? x.recus + ' reçu' + (x.recus > 1 ? 's' : '') : ''].filter(Boolean).join(' · ') : '—'));
    }else{
      t4.appendChild(fiEl('span', 'gsN', x.manque ? 'manque à ' + x.manque : 'rien ne manque'));
      if(x.manque){
        const b = fiBouton('alPetit', x.aCocher ? '☑️ Cocher pour les ' + x.aCocher : '✓ tous cochés',
          x.aCocher ? 'Passe « ' + fiSansEmoji(x.titre) + ' » en « 📞 À demander » chez les ' + x.aCocher + ' élèves à qui ça manque' : '', async () => {
            if(typeof confirmer === 'function' && !await confirmer('Faire demander « ' + fiSansEmoji(x.titre) + ' » par l’IA d’Allo aux ' + x.aCocher +
              ' élèves à qui ça manque ?\n\nÇa se décoche tout seul dès que c’est obtenu.', '☑️ Cocher pour les ' + x.aCocher)) return;
            b.disabled = true;
            await chargerAlloFicheInfos(w, { geste: 'cocherTous', k: x.k }, dd => '☑️ Coché chez ' + (dd.coches || 0) + ' élève' + ((dd.coches || 0) > 1 ? 's' : ''));
          });
        b.disabled = !x.aCocher;
        t4.appendChild(b);
      }
    }
    const t5 = fiEl('td', 'c');
    if(x.commun) t5.appendChild(fiBouton('alCroix', '✕', 'Retirer pour tout le monde', async () => {
      if(typeof confirmer === 'function' && !await confirmer('Retirer « ' + fiSansEmoji(x.titre) + ' » pour tout le monde ?\n\nCe qui a déjà été noté dans les fiches n’apparaîtra plus.', 'Retirer', true)) return;
      chargerAlloFicheInfos(w, { geste: 'retirer', k: x.k }, '✕ Retiré');
    }));
    r.append(t1, t2, t3, t4, t5);
    tb.appendChild(r);
  };
  const ou = { naissance: 'sa fiche (la même que Drivup)', neph: 'sa fiche · l’élève ne le remplit que s’il fait lui-même son dossier ANTS' };
  groupe('Pour le permis');
  (d.infos || []).filter(x => x.groupe === 'permis').forEach(x => ligne(x, ou[x.k] || 'sa fiche'));
  groupe('Responsable légal — élève mineur');
  (d.infos || []).filter(x => x.groupe === 'responsable').forEach(x => ligne(x, 'sa fiche'));
  groupe('Documents — seulement quand le dossier ANTS est fait par nous');
  (d.docs || []).filter(x => !x.commun).forEach(x => ligne(x, 'document' + (x.petit ? ' · ' + x.petit : ''), true));
  const ajoutes = (d.infos || []).filter(x => x.commun).map(x => [x, false]).concat((d.docs || []).filter(x => x.commun).map(x => [x, true]));
  if(ajoutes.length){
    groupe('Ajoutés');
    ajoutes.forEach(([x, doc]) => ligne(x, (doc ? 'document' : 'information') + (x.par ? ' · ajouté par ' + x.par : '') + (doc ? '' : ' · sa fiche'), doc));
  }
  tab.appendChild(tb);
  const defile = fiEl('div', 'gsDefile');
  defile.appendChild(tab);
  bloc.appendChild(defile);
  const f = fiEl('div', 'anAjout');
  const i = document.createElement('input');
  i.type = 'text'; i.maxLength = 80; i.placeholder = '＋ Ajouter pour tout le monde : ex. le nom de son médecin traitant';
  i.setAttribute('aria-label', 'Ajouter pour tout le monde');
  const s = document.createElement('select');
  s.setAttribute('aria-label', 'Information ou document');
  [['info', '📝 Une information'], ['doc', '📎 Un document']].forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); });
  const ok = fiBouton('btn btn-primary', 'Ajouter', '', async () => {
    const t = i.value.trim();
    if(t.length < 2){ fiToast('Écris ce qu’il faut demander.'); i.focus(); return; }
    ok.disabled = true;
    await chargerAlloFicheInfos(w, { geste: 'ajouter', titre: t, genre: s.value }, '＋ Ajouté pour tout le monde');
    ok.disabled = false;
  });
  f.append(i, s, ok);
  bloc.appendChild(f);
  bloc.appendChild(fiEl('div', 'amMeta', 'Comptés parmi les ' + (d.eleves || 0) + ' élèves qui ont un espace ouvert ; le responsable légal, parmi ceux dont on sait qu’ils sont mineurs.'));
  w.appendChild(bloc);
}


/* ============================================================
   👥 v1517 — LE TABLEAU PAR ÉLÈVE

   David, le 20 novembre : « ou alors tu me fais un tableau avec les
   élèves et ce qu'il manque ». Une ligne par élève en formation (fiche
   sans « Parti le »), une colonne par info du dossier. Toucher un nom
   ouvre sa fiche ; ☑️ fait demander par l'IA d'Allo tout ce qui lui
   manque.
   ============================================================ */
let alloFiVue = 'infos';
let alloFiTableau = null;
const alloFiFiltre = { texte: '', manque: true };
function ongletsAlloFi(w){
  const o = fiEl('div', 'alOnglets fiVues');
  [['infos', '📋 Par info'], ['eleves', '👥 Par élève']].forEach(([k, t]) => {
    const b = fiBouton(alloFiVue === k ? 'on' : '', t, '', () => {
      alloFiVue = k;
      if(k === 'eleves') chargerTableauFi(w);
      else if(alloFiEtat) dessinerAlloFicheInfos(w, alloFiEtat);
    });
    b.setAttribute('aria-pressed', alloFiVue === k ? 'true' : 'false');
    o.appendChild(b);
  });
  return o;
}
async function chargerTableauFi(w, bravo){
  if(!alloFiTableau){ w.innerHTML = ''; w.appendChild(ongletsAlloFi(w)); w.appendChild(fiEl('div', 'empty', 'Lecture des élèves…')); }
  else dessinerTableauFi(w, alloFiTableau);
  try{
    const d = await appelPrep({ action: 'ficheInfosTableau' });
    if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
    alloFiTableau = d;
    if(alloFiVue === 'eleves') dessinerTableauFi(document.getElementById('alloFiZone') || w, d);
    if(bravo) fiToast(bravo);
  }catch(e){
    if(!alloFiTableau){ w.innerHTML = ''; w.appendChild(ongletsAlloFi(w)); w.appendChild(fiEl('div', 'empty', '⚠️ ' + (e.message || e))); }
    else fiToast('⚠️ ' + (e.message || e));
  }
}
const FI_COLONNES_TABLEAU = [
  ['naissance', '🎂', 'Date de naissance'], ['naissLieu', '📍', 'Lieu de naissance'], ['adresse', '🏠', 'Adresse'],
  ['neph', '🪪', 'NEPH'], ['dateCode', '📚', 'Code obtenu le']
];
const FI_RESP = ['rlNom', 'rlAdresse', 'rlNaissance', 'rlTel', 'rlMail'];
const FI_DOCS_TAB = ['ephoto', 'justifDomicile', 'attestHeberg', 'idHebergeant', 'identite', 'assr2', 'jdc', 'dernierPermis'];
function manquesFi(l){
  return Object.keys(l.cases).filter(k => l.cases[k] === 'manque' || l.cases[k] === 'demande');
}
function caseFi(etat, titre){
  const td = fiEl('td', 'c fiCel');
  const s = fiEl('span', 'fiEt ' + (etat || 'na'));
  s.textContent = etat === 'ok' ? '✓' : etat === 'verif' ? '✓?' : etat === 'demande' ? '📞' : etat === 'manque' ? '✕' : '—';
  s.title = titre + ' : ' + (etat === 'ok' ? 'dans sa fiche' : etat === 'verif' ? 'à vérifier' : etat === 'demande' ? 'manque — l’IA d’Allo le demande' :
    etat === 'manque' ? 'manque' : 'ne s’applique pas');
  td.appendChild(s);
  return td;
}
function dessinerTableauFi(w, d){
  w.innerHTML = '';
  w.appendChild(ongletsAlloFi(w));
  w.appendChild(fiEl('div', 'crIntro', 'Les élèves en formation (fiche sans « Parti le ») et ce qui manque à leur dossier. ✓ dans sa fiche · ✓? à vérifier · 📞 manque, l’IA d’Allo le demande · ✕ manque · — ne s’applique pas. ' +
    'Toucher un nom ouvre sa fiche ; ☑️ fait demander par l’IA tout ce qui lui manque. Pour reprendre ce que Drivup a déjà : le favori, depuis la liste des élèves de Drivup.'));
  const barre = fiEl('div', 'fiBarre');
  const rech = document.createElement('input');
  rech.type = 'search'; rech.placeholder = '🔍 Chercher un élève'; rech.value = alloFiFiltre.texte;
  rech.setAttribute('aria-label', 'Chercher un élève');
  const lab = fiEl('label', 'fiCoche');
  const cb = document.createElement('input');
  cb.type = 'checkbox'; cb.checked = alloFiFiltre.manque;
  lab.append(cb, document.createTextNode(' Seulement ceux à qui il manque quelque chose'));
  const compte = fiEl('span', 'gsN', '');
  barre.append(rech, lab, compte);
  w.appendChild(barre);
  const bloc = fiEl('div', 'amBloc gsBloc');
  const defile = fiEl('div', 'gsDefile');
  const tab = fiEl('table', 'gsT fiTab');
  const th = document.createElement('thead');
  const tr0 = document.createElement('tr');
  const enTete = (t, titre) => { const x = fiEl('th', '', t); if(titre) x.title = titre; tr0.appendChild(x); };
  enTete('Élève');
  FI_COLONNES_TABLEAU.forEach(([, em, titre]) => enTete(em, titre));
  enTete('👪', 'Responsable légal (mineur)');
  enTete('📎', 'Documents (dossier ANTS fait par nous)');
  enTete('📇', 'Dossier ANTS');
  enTete('');
  th.appendChild(tr0);
  tab.appendChild(th);
  const tb = document.createElement('tbody');
  tab.appendChild(tb);
  defile.appendChild(tab);
  bloc.appendChild(defile);
  w.appendChild(bloc);
  const norm = t => (typeof normaliserMot === 'function') ? normaliserMot(String(t || '')) : String(t || '').toLowerCase();
  const peut = fiPeut();
  const remplir = () => {
    tb.innerHTML = '';
    const q = norm(alloFiFiltre.texte);
    const lignes = (d.lignes || []).filter(l => (!q || norm(l.eleve).indexOf(q) !== -1) && (!alloFiFiltre.manque || manquesFi(l).length))
      .sort((a, b) => manquesFi(b).length - manquesFi(a).length || String(a.eleve).localeCompare(String(b.eleve), 'fr'));
    compte.textContent = lignes.length + ' élève' + (lignes.length > 1 ? 's' : '') + ' sur ' + (d.lignes || []).length;
    lignes.slice(0, 400).forEach(l => {
      const tr = document.createElement('tr');
      const t1 = fiEl('td', 'fiNom');
      const a = fiBouton('anLien', l.eleve, 'Ouvrir sa fiche', () => {
        if(typeof ouvrirPageEleve !== 'function') return;
        ouvrirPageEleve(l.eleve);
        setTimeout(() => { if(typeof choisirOngletEleve === 'function') choisirOngletEleve('fiche'); }, 60);
      });
      t1.appendChild(a);
      t1.appendChild(fiEl('small', '', [l.formation, l.age !== null && l.age !== undefined ? l.age + ' ans' : 'âge inconnu',
        l.propositions ? '✏️ ' + l.propositions + ' changement(s) signalé(s)' : ''].filter(Boolean).join(' · ')));
      tr.appendChild(t1);
      FI_COLONNES_TABLEAU.forEach(([k, , titre]) => tr.appendChild(caseFi(l.cases[k], titre)));
      /* le responsable légal, en une case */
      const rl = FI_RESP.map(k => l.cases[k]);
      const tdR = fiEl('td', 'c fiCel');
      if(rl.every(x => x === 'na' || !x)) tdR.appendChild(fiEl('span', 'fiEt na', '—'));
      else{
        const n = rl.filter(x => x === 'manque' || x === 'demande').length;
        const s = fiEl('span', 'fiEt ' + (n ? (rl.some(x => x === 'demande') ? 'demande' : 'manque') : 'ok'), n ? (5 - n) + '/5' : '✓');
        s.title = 'Responsable légal : ' + (n ? (5 - n) + ' info(s) sur 5 dans sa fiche' : 'complet') + (l.mineur === null ? ' (âge inconnu)' : '');
        tdR.appendChild(s);
      }
      tr.appendChild(tdR);
      /* les documents */
      const tdD = fiEl('td', 'c fiCel');
      if(l.ants === 'nous'){
        const docs = FI_DOCS_TAB.map(k => l.cases[k]).filter(Boolean);
        const recus = docs.filter(x => x === 'ok').length;
        const s = fiEl('span', 'fiEt ' + (recus === docs.length ? 'ok' : (docs.some(x => x === 'demande') ? 'demande' : 'manque')), recus + '/' + docs.length);
        s.title = 'Documents reçus : ' + recus + ' sur ' + docs.length;
        tdD.appendChild(s);
      }else tdD.appendChild(fiEl('span', 'fiEt na', l.ants === 'eleve' ? 'élève' : '—'));
      tr.appendChild(tdD);
      const tdA = fiEl('td', 'c fiCel');
      tdA.appendChild(fiEl('span', 'fiEt ' + (l.ants ? 'ok' : 'manque'), l.ants === 'nous' ? 'nous' : l.ants === 'eleve' ? 'élève' : '?'));
      tdA.firstChild.title = 'Dossier ANTS : ' + (l.ants === 'nous' ? 'fait par nous' : l.ants === 'eleve' ? 'fait par l’élève' : 'non renseigné');
      tr.appendChild(tdA);
      const tdB = fiEl('td', 'c');
      const aDemander = Object.keys(l.cases).some(k => l.cases[k] === 'manque' && FI_DOCS_TAB.indexOf(k) === -1);
      if(peut && aDemander){
        const b = fiBouton('alPetit', '☑️', 'Faire demander par l’IA d’Allo tout ce qui manque à ' + l.eleve, async () => {
          b.disabled = true;
          try{
            const r = await appelPrep({ action: 'ficheInfosPoser', eleve: l.eleve, geste: 'cocherManque' });
            if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
            chargerTableauFi(w, '☑️ ' + l.eleve + ' : ce qui manque est demandé');
          }catch(e){ b.disabled = false; fiToast('⚠️ ' + (e.message || e)); }
        });
        tdB.appendChild(b);
      }
      tr.appendChild(tdB);
      tb.appendChild(tr);
    });
    if(!lignes.length){
      const tr = document.createElement('tr');
      const td = fiEl('td', '', alloFiFiltre.manque ? '✅ Personne : rien ne manque.' : 'Aucun élève.');
      td.colSpan = 11;
      tr.appendChild(td);
      tb.appendChild(tr);
    }
  };
  rech.addEventListener('input', () => { alloFiFiltre.texte = rech.value; remplir(); });
  cb.addEventListener('change', () => { alloFiFiltre.manque = cb.checked; remplir(); });
  remplir();
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-fiche-infos.js'] = true;
