/* Déployé le 19/11/2026 à 13:40 — v1481 */
/* ============================================================
   ec-aide-reponses.js — 🤝 L'AIDE AUX RÉPONSES (v1481)

   David, le 19/11 : « un endroit où on peut coller les mails des
   parents ou des élèves et que tu nous aides à y répondre », et
   « il faut que je puisse te dire des choses directement, qu'on ait
   un échange ». Dans Outils › Ce qu'on écrit ; les messages viennent
   de la boîte mail de l'appli, de Messenger ou d'une messagerie
   internet ; bureau et admins seulement.

   1. On colle le message : l'appli reconnaît l'élève et qui écrit
      (le Worker, « reconnaitre », sans Claude) ; on corrige si besoin.
   2. Claude prépare la réponse avec ce que l'écran sait de l'élève
      (son dossier, ses cours, sa fiche de suivi, les créneaux libres,
      les tarifs). Ce qui manque : [à vérifier : …], en jaune.
   3. On parle avec Claude : une question sur l'élève, une
      modification ; ce qu'il change revient en vert.
   4. Rien ne part tout seul : ✉️ ouvre l'éditeur des mails, 💬 pose
      la réponse dans la messagerie de l'élève, 📋 la copie (Messenger).
   ============================================================ */
const AM = {
  etape: 'coller', texte: '', eleve: '', eleves: [], qui: 'eleve', quiNom: '', adresse: '', tous: [],
  canal: 'mail', ton: 'auto', signe: 'moi', consigne: '',
  compris: [], dossier: [], contexte: '', objet: '', reponse: '', echange: [],
  enCours: '', erreur: '', historique: null, reconnu: '', confirmerEnvoi: ''
};
const AM_CANAUX = [['mail', '✉️ Boîte mail de l’appli'], ['messenger', '💬 Messenger'], ['internet', '🌐 Messagerie internet'],
                   ['sms', '📱 SMS'], ['autre', 'Autre']];
const AM_QUI = [['eleve', '🎓 L’élève lui-même'], ['mere', '👩 Sa mère'], ['pere', '👨 Son père'], ['parent', '👪 Un parent'], ['autre', '👤 Une autre personne']];
const AM_QUI_COURT = { eleve: 'lui-même', mere: 'sa mère', pere: 'son père', parent: 'un parent', autre: 'une autre personne' };
const AM_ENVOIS = { mail: 'ouverte dans les mails', messagerie: 'envoyée dans sa messagerie', copie: 'copiée' };
const AM_ICONES = { mail: '✉️', messenger: '💬', internet: '🌐', sms: '📱', autre: '📝' };

function amEl(tag, cls, txt){ const e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }
function amEch(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function amPrenomMoi(){ return String((typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur) || '').trim().split(/\s+/)[0] || ''; }
function amPeut(){
  if(typeof ACCES === 'undefined' || !ACCES) return false;
  if(ACCES.role === 'admin') return true;
  return ACCES.role === 'bureau' && typeof peutModifier === 'function' && peutModifier('mails');
}
function amSignature(){
  if(AM.signe === 'equipe') return 'L’équipe d’Évolution Conduites';
  if(AM.signe === 'moi') return (amPrenomMoi() ? amPrenomMoi() + ' — ' : '') + 'Évolution Conduites';
  return '';
}

/* Le texte de la réponse en HTML : [à vérifier : …] en jaune, ⟦…⟧ (ce
   que Claude vient de changer à la demande de l'équipe) en vert. */
function amReponseEnHtml(t){
  return String(t || '').split('\n').map(l => {
    let h = amEch(l)
      .replace(/\[(à vérifier|à compléter)\s*:([^\]]*)\]/gi, (x, a, b) => '<mark>[' + a + ' :' + b + ']</mark>')
      .replace(/⟦([^⟧]*)⟧/g, '<ins>$1</ins>');
    return '<div>' + (l.trim() ? h : '<br>') + '</div>';
  }).join('').replace(/⟦|⟧/g, '');
}
/* …et l'inverse : ce qui est dans l'éditeur, en texte simple */
function amTexteDeLEditeur(){
  const ed = document.getElementById('amEditeur');
  if(!ed) return String(AM.reponse || '').replace(/⟦|⟧/g, '');
  const lignes = [];
  ed.childNodes.forEach(n => {
    if(n.nodeType === 3){ if(n.textContent.trim()) lignes.push(n.textContent); return; }
    const t = (n.innerText != null ? n.innerText : n.textContent).replace(/\n+$/, '');
    lignes.push(t);
  });
  return lignes.join('\n').replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
function amResteAVerifier(t){ return /\[(à vérifier|à compléter)\s*:/i.test(String(t || '')); }

/* ---------- ce que l'appli sait (comme les réponses de la boîte mail) ---------- */
async function amContexte(){
  const l = [], dossier = [];
  const essai = fn => { try{ return fn(); }catch(e){ return null; } };
  const tout = String(AM.texte || '').toLowerCase() + ' ' + String(AM.consigne || '').toLowerCase();
  if(AM.eleve){
    const nom = AM.eleve;
    const v = essai(() => (typeof valeursDesMotsRapides === 'function') ? valeursDesMotsRapides({ eleve: nom, genre: 'mail' }) : null) || {};
    const fi = essai(() => (typeof ficheDe === 'function') ? ficheDe(nom) : null) || {};
    const s = essai(() => (typeof suiviDe === 'function') ? suiviDe(nom) : null) || {};
    const pousser = (texte, ecran) => { l.push(texte); dossier.push(ecran || texte); };
    l.push('L’élève : ' + nom + (fi.formation ? ' (formation : ' + fi.formation + ')' : '') + '.');
    if(v.moniteur) pousser('Son moniteur : ' + v.moniteur + '.', '👤 moniteur : ' + v.moniteur);
    pousser(v.prochaincours ? 'Son prochain cours préparé : ' + v.prochaincours + (v.moniteur ? ' avec ' + v.moniteur : '') + '.' : 'Aucun prochain cours préparé dans l’appli.',
            '📅 ' + (v.prochaincours ? 'prochain cours : ' + v.prochaincours : 'aucun prochain cours préparé'));
    if(v.frise) pousser('Sa frise de formation : ' + v.frise + '.', '🧭 ' + v.frise);
    if(v.examenblanc) pousser('Son examen blanc : ' + v.examenblanc + '.', /^\p{Extended_Pictographic}/u.test(v.examenblanc) ? v.examenblanc : '📝 examen blanc : ' + v.examenblanc);
    pousser(v.datedexamen ? 'Sa date d’examen du permis : ' + v.datedexamen + '.' : 'Pas de date d’examen du permis dans l’appli.',
            '🎓 ' + (v.datedexamen ? 'examen : ' + v.datedexamen : 'pas de date d’examen'));
    if(s.resteAPayer) pousser('Reste à payer (fiche de suivi) : ' + s.resteAPayer + '.', '💶 reste à payer : ' + s.resteAPayer);
    if(s.paiementPrevu) pousser('Paiement prévu (fiche de suivi) : ' + s.paiementPrevu + '.', '💶 paiement prévu : ' + s.paiementPrevu);
  }
  /* les créneaux libres, quand le message parle d'un cours ou d'une heure */
  if(/(cours|le[cç]on|cr[ée]neau|heure|horaire|dispo|planning|rendez-vous|rdv|semaine|vacances|d[ée]caler|lundi|mardi|mercredi|jeudi|vendredi|samedi)/.test(tout)){
    try{
      if(typeof chargerCreneaux === 'function' && typeof creneauxCalcules === 'function'){
        const e = await chargerCreneaux();
        const cr = creneauxCalcules(e.lecture, e.horaires).filter(c => ['ouvert', 'dispo', 'rien'].indexOf(c.genre) !== -1).slice(0, 30);
        if(cr.length){
          l.push('Créneaux de conduite libres (lus dans Drivup) :');
          cr.forEach(c => l.push('- ' + ((typeof jourLongCreneau === 'function') ? jourLongCreneau(c.jour) : c.jour) + ' de ' +
            String(c.debut).replace(':', 'h') + ' à ' + String(c.fin).replace(':', 'h') + (c.moniteur ? ' avec ' + c.moniteur : '')));
          dossier.push('🗓️ ' + cr.length + ' créneau' + (cr.length > 1 ? 'x' : '') + ' libre' + (cr.length > 1 ? 's' : '') + ' (Drivup)');
        }
      }
    }catch(e){ /* sans les créneaux */ }
  }
  /* les tarifs, quand il est question d'inscription ou de prix */
  if(/(tarif|prix|co[uû]t|combien|devis|forfait|inscri|€|euros?|payer|paiement|r[ée]gler)/.test(tout)){
    try{
      if(typeof tarifsDuCatalogue === 'function'){
        const d = await tarifsDuCatalogue();
        if(d){
          const eu = n => (Math.round(Number(n) * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €';
          l.push('Les tarifs de l’école (Outils › Tarifs) :');
          (d.taux || []).forEach(t => l.push('- ' + t.nom + ' : ' + eu(t.pu) + (t.bea && t.bea.pu && t.bea.pu !== t.pu ? ' (boîte automatique : ' + eu(t.bea.pu) + ')' : '')));
          (d.fiches || []).filter(x => x.type !== 'grille').slice(0, 40).forEach(x => {
            const tot = (typeof tfTotalDeLaFiche === 'function') ? essai(() => tfTotalDeLaFiche(d, x)) : null;
            l.push('- Forfait « ' + (x.titre || x.id) + ' »' + (x.dossier ? ' (' + x.dossier + ')' : '') + (tot ? ' : ' + eu(tot) : ''));
          });
          dossier.push('💶 vos tarifs (Outils › Tarifs)');
        }
      }
    }catch(e){ /* sans les tarifs */ }
  }
  l.push('Le bureau de l’école : Saint-Brieuc et Loudéac ; on peut appeler le bureau au 09 83 55 56 87.');
  return { texte: l.join('\n'), dossier: dossier };
}

/* ---------- les appels ---------- */
function amCorps(plus){
  return Object.assign({ action: 'aideReponse', texte: AM.texte, eleve: AM.eleve, qui: AM.qui, quiNom: AM.quiNom,
    canal: AM.canal === 'internet' ? 'mail' : AM.canal, ton: AM.ton, consigne: AM.consigne, contexte: AM.contexte }, plus || {});
}
let amMinuterie = null, amDernierLu = '';
function amReconnaitrePlusTard(){
  clearTimeout(amMinuterie);
  amMinuterie = setTimeout(amReconnaitre, 700);
}
async function amReconnaitre(){
  const t = AM.texte.trim();
  if(!t || t === amDernierLu) return;
  amDernierLu = t;
  try{
    const r = await appelPrep({ action: 'aideReponse', quoi: 'reconnaitre', texte: t });
    if(!r || r.status !== 'ok' || AM.texte.trim() !== t) return;
    AM.tous = r.tous || AM.tous;
    AM.eleves = r.eleves || [];
    if(AM.reconnu !== 'main'){ AM.eleve = r.eleve || ''; AM.reconnu = r.eleve ? 'auto' : ''; }
    if(AM.quiAuto !== false) AM.qui = r.qui || 'eleve';
    AM.adresse = r.adresse || '';
    if(r.adresse && AM.canal !== 'mail' && AM.canal !== 'internet' && !AM.canalChoisi) AM.canal = 'mail';
    if(AM.etape === 'coller') amDessinerLesPuces();
  }catch(e){ /* on choisira à la main */ }
}

async function amPreparer(style){
  if(!AM.texte.trim()){ AM.erreur = 'Colle d’abord le message reçu.'; return amDessiner(); }
  AM.enCours = style ? 'retouche' : 'preparer'; AM.erreur = '';
  const avant = style ? amTexteDeLEditeur() : '';
  amDessiner();
  try{
    const c = await amContexte();
    AM.contexte = c.texte; AM.dossier = c.dossier;
    const plus = { quoi: 'preparer' };
    if(style){ plus.style = style; plus.reponse = avant; if(style === 'traduire') plus.langue = AM.langue || 'anglais'; }
    const r = await appelPrep(amCorps(plus));
    if(!r || r.status !== 'ok') throw new Error((r && (r.message || r.error)) || 'Claude n’a rien proposé.');
    if(!style || !AM.compris.length) AM.compris = r.compris || [];
    AM.objet = r.objet || AM.objet || '';
    AM.reponse = r.reponse || '';
    AM.etape = 'reponse';
    AM.confirmerEnvoi = '';
  }catch(e){
    AM.erreur = (e && e.message) || String(e);
  }
  AM.enCours = '';
  amDessiner();
}

async function amEchanger(message){
  message = String(message || '').trim();
  if(!message || AM.enCours) return;
  const actuelle = amTexteDeLEditeur();
  AM.echange.push({ qui: 'equipe', par: amPrenomMoi() || 'Moi', texte: message });
  AM.enCours = 'echange'; AM.erreur = '';
  amDessiner();
  try{
    const r = await appelPrep(amCorps({ quoi: 'echanger', reponse: actuelle, message: message,
      echange: AM.echange.slice(0, -1).map(x => ({ qui: x.qui, texte: x.texte })) }));
    if(!r || r.status !== 'ok') throw new Error((r && (r.message || r.error)) || 'Claude ne répond pas.');
    AM.echange.push({ qui: 'claude', texte: r.message || (r.reponse ? 'C’est modifié, en vert dans la réponse.' : '…') });
    if(r.reponse){ AM.reponse = r.reponse; AM.confirmerEnvoi = ''; }
    else AM.reponse = actuelle;
  }catch(e){
    AM.echange.push({ qui: 'claude', texte: '⚠️ ' + ((e && e.message) || e), erreur: true });
    AM.reponse = actuelle;
  }
  AM.enCours = '';
  amDessiner();
  const z = document.getElementById('amSaisie'); if(z) z.focus();
}

async function amGarder(envoi, texte){
  try{
    await appelPrep(amCorps({ quoi: 'garder', reponse: texte, envoi: envoi, canal: AM.canal }));
    AM.historique = null;
    if(AM.etape === 'coller') amChargerLHistorique();
  }catch(e){ /* l'historique n'est qu'une aide */ }
}

/* Il reste du jaune : on le dit, et le deuxième clic envoie quand même */
function amVerifierAvant(geste){
  const t = amTexteDeLEditeur();
  if(!t){ AM.erreur = 'La réponse est vide.'; amDessiner(); return null; }
  if(amResteAVerifier(t) && AM.confirmerEnvoi !== geste){
    AM.confirmerEnvoi = geste;
    AM.reponse = t;
    amDessiner();
    return null;
  }
  AM.confirmerEnvoi = '';
  return t;
}

async function amParMail(){
  const t = amVerifierAvant('mail');
  if(t == null) return;
  if(typeof mlOuvrirLEditeur !== 'function'){ AM.erreur = 'La boîte mail de l’appli n’est pas chargée sur ce compte.'; return amDessiner(); }
  let adresse = AM.adresse;
  if(!adresse && AM.eleve){
    try{ const fi = (typeof ficheDe === 'function') ? ficheDe(AM.eleve) : null; adresse = String((fi && fi.email) || '').split(/[\s,;]+/)[0] || ''; }catch(e){}
  }
  AM.reponse = t;
  mlOuvrirLEditeur({ mode: 'nouveau', cle: 'aide:' + (AM.eleve || 'sans') + ':' + Date.now().toString(36),
    titre: '✉️ Réponse' + (AM.eleve ? ' — ' + AM.eleve : ''),
    a: adresse ? [{ nom: AM.quiNom || (AM.qui === 'eleve' ? AM.eleve : ''), adresse: adresse }] : [],
    sujet: AM.objet || 'Re :', texteHtml: (typeof mlTexteEnHtml === 'function') ? mlTexteEnHtml(t) : amReponseEnHtml(t) });
  amGarder('mail', t);
}

async function amDansSaMessagerie(){
  if(!AM.eleve){ AM.erreur = 'Choisis d’abord l’élève.'; return amDessiner(); }
  const t = amVerifierAvant('messagerie');
  if(t == null) return;
  const sig = amSignature();
  const texte = t + (sig ? '\n\n' + sig : '');
  AM.enCours = 'envoi'; AM.erreur = ''; AM.reponse = t; amDessiner();
  try{
    const r = await appelPrep(amCorps({ action: 'aideReponseMessagerie', reponse: texte }));
    if(!r || r.status !== 'ok') throw new Error((r && (r.message || r.error)) || 'Envoi impossible.');
    AM.historique = null;
    if(typeof showToast === 'function') showToast('💬 Envoyée dans la messagerie de ' + AM.eleve.split(' ')[0]);
    AM.envoyee = 'messagerie';
  }catch(e){ AM.erreur = (e && e.message) || String(e); }
  AM.enCours = '';
  amDessiner();
}

async function amCopier(){
  const t = amVerifierAvant('copie');
  if(t == null) return;
  const sig = amSignature();
  const texte = t + (sig ? '\n\n' + sig : '');
  AM.reponse = t;
  let ok = false;
  try{ await navigator.clipboard.writeText(texte); ok = true; }catch(e){
    try{ const x = document.createElement('textarea'); x.value = texte; document.body.appendChild(x); x.select(); ok = document.execCommand('copy'); x.remove(); }catch(e2){}
  }
  if(typeof showToast === 'function') showToast(ok ? '📋 Réponse copiée : colle-la dans ' + (AM.canal === 'messenger' ? 'Messenger' : 'le message') : '⚠️ Copie impossible : sélectionne le texte à la main');
  if(ok){ AM.envoyee = 'copie'; amGarder('copie', t); amDessiner(); }
}

function amRecommencer(){
  Object.assign(AM, { etape: 'coller', texte: '', eleve: '', eleves: [], qui: 'eleve', quiNom: '', adresse: '', consigne: '',
    compris: [], dossier: [], contexte: '', objet: '', reponse: '', echange: [], erreur: '', reconnu: '', quiAuto: true,
    canalChoisi: false, confirmerEnvoi: '', envoyee: '' });
  amDernierLu = '';
  amDessiner();
}

/* ---------- l'écran ---------- */
async function afficherAideReponses(){
  const z = document.getElementById('aideReponsesZone');
  if(!z) return;
  if(!amPeut()){
    z.innerHTML = '<div class="empty">🔒 L’aide aux réponses est réservée au bureau et aux administrateurs (« ✉️ Mails » en modification).</div>';
    return;
  }
  if((typeof fichesEleves === 'undefined' || !fichesEleves || !fichesEleves.length) && typeof chargerFiches === 'function'){
    chargerFiches().catch(() => {});
  }
  amDessiner();
}

async function amChargerLHistorique(){
  try{
    const r = await appelPrep({ action: 'aideReponse', quoi: 'liste' });
    AM.historique = (r && r.lignes) || [];
  }catch(e){ AM.historique = []; }
  if(AM.etape === 'coller') amDessinerLHistorique();
}

function amDessiner(){
  const z = document.getElementById('aideReponsesZone');
  if(!z) return;
  z.innerHTML = '';
  if(AM.etape === 'reponse') return amDessinerLaReponse(z);
  amDessinerLeCollage(z);
}

function amChoix(liste, valeur, quand){
  const s = document.createElement('select');
  liste.forEach(([k, t]) => { const o = document.createElement('option'); o.value = k; o.textContent = t; if(k === valeur) o.selected = true; s.appendChild(o); });
  s.addEventListener('change', () => quand(s.value));
  return s;
}
function amChamp(libelle, champ){
  const d = amEl('div');
  d.appendChild(amEl('label', '', libelle));
  d.appendChild(champ);
  return d;
}

function amDessinerLeCollage(z){
  z.appendChild(amEl('div', 'crIntro', 'Un mail, un message Messenger ou d’une messagerie internet, d’un élève ou d’un parent : on le colle ici, l’appli reconnaît l’élève, et Claude prépare une réponse avec ce que dit son dossier. On peut ensuite lui parler pour la changer. Rien ne part sans que vous l’ayez relue.'));
  const bloc = amEl('div', 'amBloc');
  bloc.appendChild(amEl('h3', '', '1. Le message reçu'));
  const ta = amEl('textarea', 'amColle');
  ta.id = 'amColle';
  ta.placeholder = 'Colle ici le mail ou le message reçu (Ctrl + V)…';
  ta.value = AM.texte;
  ta.addEventListener('input', () => { AM.texte = ta.value; amReconnaitrePlusTard(); });
  ta.addEventListener('paste', () => setTimeout(() => { AM.texte = ta.value; clearTimeout(amMinuterie); amReconnaitre(); }, 0));
  bloc.appendChild(ta);
  const puces = amEl('div', 'amPuces'); puces.id = 'amPuces';
  bloc.appendChild(puces);

  const champs = amEl('div', 'amChamps');
  champs.appendChild(amChamp('Reçu par', amChoix(AM_CANAUX, AM.canal, v => { AM.canal = v; AM.canalChoisi = true; })));
  champs.appendChild(amChamp('Réponse', amChoix([['auto', 'Selon qui écrit'], ['vous', 'Vouvoiement'], ['tu', 'Tutoiement']], AM.ton, v => { AM.ton = v; })));
  const p = amPrenomMoi();
  champs.appendChild(amChamp('Signée', amChoix([['moi', (p ? p + ' — ' : '') + 'Évolution Conduites'], ['equipe', 'L’équipe d’Évolution Conduites'], ['aucune', 'Sans signature']], AM.signe, v => { AM.signe = v; })));
  bloc.appendChild(champs);
  bloc.appendChild(amEl('label', 'amLabel', 'Ce que vous voulez lui dire (facultatif)'));
  const cons = document.createElement('input');
  cons.type = 'text'; cons.id = 'amConsigne';
  cons.placeholder = 'Ex. : on peut lui proposer mardi 17h ou jeudi 18h';
  cons.value = AM.consigne;
  cons.addEventListener('input', () => { AM.consigne = cons.value; });
  cons.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); amPreparer(); } });
  bloc.appendChild(cons);
  const go = amEl('button', 'btn btn-primary amGo', AM.enCours === 'preparer' ? '⏳ Claude prépare la réponse…' : '✨ Préparer une réponse');
  go.type = 'button'; go.id = 'amPreparer';
  go.disabled = !!AM.enCours;
  go.addEventListener('click', () => { AM.texte = ta.value; amPreparer(); });
  bloc.appendChild(go);
  if(AM.erreur) bloc.appendChild(amEl('div', 'amAlerte', '⚠️ ' + AM.erreur));
  z.appendChild(bloc);
  amDessinerLesPuces();

  const h = amEl('div'); h.id = 'amHistorique';
  z.appendChild(h);
  amDessinerLHistorique();
  if(AM.historique == null) amChargerLHistorique();
}

function amDessinerLesPuces(){
  const z = document.getElementById('amPuces');
  if(!z) return;
  z.innerHTML = '';
  if(!AM.texte.trim()) return;
  /* l'élève */
  const pe = amEl('span', 'amPuce' + (AM.eleve ? '' : ' gris'));
  if(AM.eleve){
    pe.appendChild(document.createTextNode('🎓 ' + AM.eleve + ' '));
    pe.appendChild(amEl('small', '', AM.reconnu === 'main' ? '— choisi' : '— reconnu dans le message'));
  }else pe.appendChild(document.createTextNode('🎓 Élève non reconnu'));
  z.appendChild(pe);
  /* qui écrit */
  const pq = amEl('span', 'amPuce');
  pq.appendChild(amChoix(AM_QUI, AM.qui, v => { AM.qui = v; AM.quiAuto = false; }));
  pq.querySelector('select').className = 'amPuceChoix';
  z.appendChild(pq);
  /* changer d'élève : les proposés d'abord, puis tous */
  const ch = amEl('span', 'amPuce gris');
  const s = document.createElement('select');
  s.className = 'amPuceChoix'; s.id = 'amEleve';
  const o0 = document.createElement('option'); o0.value = ''; o0.textContent = AM.eleve ? '✏️ Changer' : '✏️ Choisir l’élève'; s.appendChild(o0);
  const ajout = (groupe, noms) => {
    if(!noms.length) return;
    const g = document.createElement('optgroup'); g.label = groupe;
    noms.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; g.appendChild(o); });
    s.appendChild(g);
  };
  ajout('Dans le message', AM.eleves.filter(n => n !== AM.eleve));
  let tous = AM.tous.length ? AM.tous : ((typeof fichesEleves !== 'undefined' && fichesEleves) || []).map(f => f.nom || f.eleve).filter(Boolean);
  ajout('Tous les élèves', tous.filter(n => AM.eleves.indexOf(n) === -1 && n !== AM.eleve));
  if(AM.eleve){ const o = document.createElement('option'); o.value = '__aucun'; o.textContent = '— aucun élève'; s.appendChild(o); }
  s.addEventListener('change', () => {
    if(!s.value) return;
    AM.eleve = s.value === '__aucun' ? '' : s.value; AM.reconnu = 'main';
    amDessinerLesPuces();
  });
  ch.appendChild(s);
  z.appendChild(ch);
}

function amDessinerLHistorique(){
  const z = document.getElementById('amHistorique');
  if(!z) return;
  z.innerHTML = '';
  const l = AM.historique;
  if(!l || !l.length) return;
  z.appendChild(amEl('div', 'crSt', '🗂️ Dernières réponses préparées'));
  l.slice(0, 15).forEach(x => {
    const d = amEl('button', 'amLigne');
    d.type = 'button';
    d.appendChild(amEl('span', '', AM_ICONES[x.canal] || '📝'));
    const s = amEl('span');
    const b = amEl('b', '', x.eleve || 'Sans élève'); s.appendChild(b);
    s.appendChild(document.createTextNode((x.qui ? ' · ' + (AM_QUI_COURT[x.qui] || '') : '') + (x.apercu ? ' · « ' + x.apercu.slice(0, 70) + (x.apercu.length > 70 ? '…' : '') + ' »' : '')));
    const q = new Date(Number(x.le || 0));
    s.appendChild(amEl('small', '', q.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' à ' + q.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) +
      (x.par ? ' · par ' + x.par : '') + (x.envoi ? ' · ' + (AM_ENVOIS[x.envoi] || x.envoi) : '')));
    d.appendChild(s);
    d.addEventListener('click', () => amRelire(x.id));
    z.appendChild(d);
  });
}

async function amRelire(id){
  try{
    const r = await appelPrep({ action: 'aideReponse', quoi: 'relire', id: id });
    if(!r || r.status !== 'ok') throw new Error((r && (r.message || r.error)) || 'introuvable');
    const x = r.ligne;
    amRecommencer();
    Object.assign(AM, { texte: x.recu || '', eleve: x.eleve || '', reconnu: x.eleve ? 'main' : '', qui: x.qui || 'eleve', quiAuto: false,
      canal: x.canal || 'mail', reponse: x.reponse || '', etape: 'reponse', relue: true });
    const c = await amContexte(); AM.contexte = c.texte; AM.dossier = c.dossier;
    amDessiner();
  }catch(e){ if(typeof showToast === 'function') showToast('⚠️ ' + ((e && e.message) || e)); }
}

function amDessinerLaReponse(z){
  const cols = amEl('div', 'amCols');
  /* à gauche : le message, ce que Claude a compris, le dossier */
  const g = amEl('div');
  const b1 = amEl('div', 'amBloc');
  b1.appendChild(amEl('h3', '', 'Le message reçu'));
  const meta = [((AM_CANAUX.find(x => x[0] === AM.canal) || [, ''])[1])];
  if(AM.eleve) meta.push('🎓 ' + AM.eleve);
  meta.push((AM_QUI.find(x => x[0] === AM.qui) || [, ''])[1]);
  b1.appendChild(amEl('div', 'amMeta', meta.filter(Boolean).join(' · ')));
  b1.appendChild(amEl('div', 'amMail', AM.texte));
  const mod = amEl('button', 'amLien', '✏️ Modifier le message, l’élève, le ton');
  mod.type = 'button';
  mod.addEventListener('click', () => { AM.etape = 'coller'; AM.reponse = amTexteDeLEditeur(); amDessiner(); });
  b1.appendChild(mod);
  g.appendChild(b1);
  if(AM.compris.length || AM.dossier.length){
    const b2 = amEl('div', 'amBloc');
    b2.style.marginTop = '12px';
    b2.appendChild(amEl('h3', '', 'Ce que Claude a compris'));
    const c = amEl('div', 'amCompris');
    if(AM.compris.length){
      c.appendChild(amEl('b', '', AM.compris.length > 1 ? AM.compris.length + ' demandes :' : 'La demande :'));
      const ul = amEl('ul'); AM.compris.forEach(x => ul.appendChild(amEl('li', '', x))); c.appendChild(ul);
    }
    if(AM.dossier.length){
      const t = amEl('b', '', 'Ce que l’appli lui a donné :'); t.style.display = 'block'; t.style.marginTop = '8px'; c.appendChild(t);
      const ul = amEl('ul'); AM.dossier.forEach(x => ul.appendChild(amEl('li', '', x))); c.appendChild(ul);
    }else if(!AM.eleve){
      c.appendChild(amEl('div', 'amMeta', 'Aucun élève choisi : Claude n’a que le message.'));
    }
    b2.appendChild(c);
    g.appendChild(b2);
  }
  cols.appendChild(g);

  /* à droite : la réponse, les retouches, l'échange, l'envoi */
  const d = amEl('div');
  const b3 = amEl('div', 'amBloc');
  b3.appendChild(amEl('h3', '', 'La réponse proposée'));
  if(AM.canal === 'mail' || AM.canal === 'internet'){
    let adresse = AM.adresse;
    if(!adresse && AM.eleve){ try{ const fi = ficheDe(AM.eleve); adresse = String((fi && fi.email) || '').split(/[\s,;]+/)[0] || ''; }catch(e){} }
    b3.appendChild(amEl('div', 'amMeta', 'À : ' + (adresse || '(à choisir dans l’éditeur)') + (AM.objet ? ' · Objet : ' + AM.objet : '')));
  }
  const ed = amEl('div', 'amEditeur');
  ed.id = 'amEditeur';
  ed.contentEditable = 'true';
  ed.spellcheck = true;
  ed.innerHTML = amReponseEnHtml(AM.reponse);
  if(AM.enCours === 'retouche') ed.classList.add('amAttente');
  b3.appendChild(ed);
  const sig = amSignature();
  if(sig) b3.appendChild(amEl('div', 'amMeta amSig', 'Signée : ' + sig + (AM.canal === 'mail' || AM.canal === 'internet' ? ' (par mail : la signature de la boîte mail)' : '')));

  const outils = amEl('div', 'amOutils');
  [['autre', '↻ Autre version'], ['courte', '✂️ Plus court'], ['chaleureuse', '🤝 Plus chaleureux'], ['formelle', '👔 Plus formel'], ['traduire', '🌍 Traduire']].forEach(([k, t]) => {
    const b = amEl('button', '', t); b.type = 'button'; b.disabled = !!AM.enCours; b.dataset.style = k;
    b.addEventListener('click', () => {
      if(k === 'traduire'){
        const box = document.getElementById('amLangues');
        if(box){ box.hidden = !box.hidden; return; }
      }
      amPreparer(k);
    });
    outils.appendChild(b);
  });
  b3.appendChild(outils);
  const langues = amEl('div', 'amOutils amLangues'); langues.id = 'amLangues'; langues.hidden = true;
  ['anglais', 'espagnol', 'portugais', 'arabe', 'turc', 'roumain', 'ukrainien'].forEach(lg => {
    const b = amEl('button', '', lg); b.type = 'button';
    b.addEventListener('click', () => { AM.langue = lg; amPreparer('traduire'); });
    langues.appendChild(b);
  });
  b3.appendChild(langues);
  if(AM.enCours === 'retouche') b3.appendChild(amEl('div', 'amMeta', '⏳ Claude réécrit la réponse…'));

  /* l'échange */
  const ech = amEl('div', 'amEchange');
  ech.appendChild(amEl('h3', '', '💬 Parler avec Claude'));
  if(!AM.echange.length) ech.appendChild(amEl('div', 'amMeta', 'Pose-lui une question sur l’élève, ou demande une modification (« ajoute qu’on peut aussi samedi 10h »). Ce qu’il change apparaît en vert.'));
  AM.echange.forEach(x => {
    const bu = amEl('div', 'amBulle ' + (x.qui === 'claude' ? 'cl' : 'moi'));
    bu.appendChild(amEl('small', '', x.qui === 'claude' ? 'Claude' : (x.par || 'Moi')));
    bu.appendChild(document.createTextNode(x.texte));
    ech.appendChild(bu);
  });
  if(AM.enCours === 'echange'){ const bu = amEl('div', 'amBulle cl'); bu.appendChild(amEl('small', '', 'Claude')); bu.appendChild(document.createTextNode('…')); ech.appendChild(bu); }
  const saisie = amEl('div', 'amSaisie');
  const inp = document.createElement('input');
  inp.type = 'text'; inp.id = 'amSaisie';
  inp.placeholder = 'Demande-lui une modification, ou pose-lui une question sur l’élève…';
  inp.disabled = AM.enCours === 'echange';
  const envoyer = () => { const v = inp.value; inp.value = ''; amEchanger(v); };
  inp.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); envoyer(); } });
  const bt = amEl('button', 'btn btn-primary', 'Envoyer'); bt.type = 'button'; bt.disabled = !!AM.enCours;
  bt.addEventListener('click', envoyer);
  saisie.appendChild(inp); saisie.appendChild(bt);
  ech.appendChild(saisie);
  b3.appendChild(ech);

  const reste = amResteAVerifier(AM.reponse);
  if(reste) b3.appendChild(amEl('div', 'amAlerte', AM.confirmerEnvoi
    ? '⚠️ Il reste du jaune dans la réponse : ce que Claude n’a pas trouvé. Corrige-le, ou clique encore pour l’envoyer telle quelle.'
    : '⚠️ Surligné en jaune : ce que Claude n’a pas trouvé dans le dossier. À vérifier avant d’envoyer.'));
  if(AM.erreur) b3.appendChild(amEl('div', 'amAlerte', '⚠️ ' + AM.erreur));

  const env = amEl('div', 'amEnvoi');
  const bouton = (t, cls, f, id) => { const b = amEl('button', 'btn ' + cls, t); b.type = 'button'; b.id = id; b.disabled = !!AM.enCours; b.addEventListener('click', f); env.appendChild(b); };
  const parMail = AM.canal === 'mail' || AM.canal === 'internet';
  if(typeof mlOuvrirLEditeur === 'function') bouton('✉️ Envoyer par mail', parMail ? 'btn-primary' : 'btn-secondary', amParMail, 'amParMail');
  if(AM.eleve) bouton('💬 Dans sa messagerie', 'btn-secondary', amDansSaMessagerie, 'amMessagerie');
  bouton('📋 Copier' + (AM.canal === 'messenger' ? ' (pour Messenger)' : ''), parMail ? 'btn-secondary' : 'btn-primary', amCopier, 'amCopier');
  bouton('↩️ Nouveau message', 'btn-secondary', amRecommencer, 'amNouveau');
  b3.appendChild(env);
  if(AM.envoyee) b3.appendChild(amEl('div', 'amMeta', AM.envoyee === 'messagerie' ? '✅ Envoyée dans sa messagerie, et gardée dans « Dernières réponses préparées ».' : '✅ Copiée, et gardée dans « Dernières réponses préparées ».'));
  d.appendChild(b3);
  cols.appendChild(d);
  z.appendChild(cols);
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-aide-reponses.js'] = true;
