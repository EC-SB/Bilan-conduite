/* Déployé le 30/10/2026 à 10:52 — v1305 */
/* ============================================================
   ec-suivi-appels.js — 📞 LE SUIVI DES APPELS (ALLO)

   David, le 26 octobre : « avoir à un endroit sur notre app le suivi
   des appels, dire si on a eu la personne au tel, si on a laissé un
   message, envoyé un mail, ou si on est tombé sur le répondeur et
   qu'il faut la rappeler, et conserver les appels que l'on peut lier
   aux élèves sur leurs fiches pour avoir un historique ». Puis, sur
   le schéma : « il faut ajouter la possibilité d'envoyer un mail ou
   un message sur la messagerie interne ou sur Messenger directement,
   avec dans le suivi ce qu'on a envoyé ».

   Ce module porte :
   · l'écran Élèves › Au quotidien › 📞 Suivi des appels ;
   · la fenêtre « ✏️ Ce qui s'est passé » (le statut, le rappel, la
     note — avec ton nom, puisqu'Allo n'a qu'un compte) ;
   · la fenêtre « 🔗 À qui est ce numéro ? » ;
   · la fenêtre « ✉️ Envoyer » (mail, messagerie, Messenger) ;
   · « ➕ Noter un appel » passé d'un autre téléphone ;
   · l'onglet 📞 Appels du dossier de l'élève ;
   · la ligne « ⏰ à rappeler » du bandeau du bureau.

   Le Worker relit Allo toutes les 5 minutes : voir « LE SUIVI DES
   APPELS » dans cloudflare-worker.js. Rien du son n'est gardé : ▶
   demande à Allo un lien d'une heure, et seulement pour le bureau et
   les administrateurs (son choix).
   ============================================================ */

const STATUTS_APPEL_EC = {
  joint:       { emoji: '✅', nom: 'Joint',          couleur: 'var(--accent-text)', fond: 'rgba(182,255,14,.16)' },
  message:     { emoji: '📩', nom: 'Message laissé', couleur: '#2F7FD8',            fond: 'rgba(47,127,216,.12)' },
  repondeur:   { emoji: '📵', nom: 'Répondeur',      couleur: 'var(--warn-text)',   fond: 'rgba(232,93,4,.12)' },
  pas_reponse: { emoji: '🔕', nom: 'Pas de réponse', couleur: 'var(--warn-text)',   fond: 'rgba(232,93,4,.12)' },
  manque:      { emoji: '📲', nom: 'Appel manqué',   couleur: 'var(--warn-text)',   fond: 'rgba(232,93,4,.12)' },
  ia:          { emoji: '🤖', nom: 'Accueil IA',     couleur: 'var(--muted)',       fond: 'rgba(127,127,127,.12)' },
  sms:         { emoji: '💬', nom: 'SMS',            couleur: 'var(--muted)',       fond: 'rgba(127,127,127,.12)' }
};
const CANAUX_APPEL_EC = {
  mail:       { emoji: '✉️', nom: 'Mail',       fait: 'Mail envoyé',        couleur: '#7A4FD8', fond: 'rgba(122,79,216,.12)' },
  messagerie: { emoji: '💬', nom: 'Messagerie', fait: 'Écrit dans la messagerie', couleur: '#2F7FD8', fond: 'rgba(47,127,216,.12)' },
  messenger:  { emoji: 'Ⓜ️', nom: 'Messenger',  fait: 'Messenger',          couleur: '#0A7CFF', fond: 'rgba(10,124,255,.10)' }
};

const apOuverts = {};
const suiviAppelsEC = { appels: null, jours: 7, filtre: 'tous', cherche: '', synchro: 0, erreur: '',
                        cle: true, peutEcouter: false, aujourdhui: '', depuis: 0, charge: false };
let aRappelerEC = { appels: [], aujourdhui: '', lu: false };

/* ---------- petits outils ---------- */
function apEsc(v){ return (typeof echapper === 'function') ? echapper(v) : String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function apPeutTout(){ return typeof peutModifier === 'function' && peutModifier('appels'); }
function apMoi(){ return (typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur) || ''; }
function apAujourdhui(){
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function apPlusJours(iso, n){
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function apJourLong(iso){
  try{ return new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }); }
  catch(e){ return iso; }
}
function apJourCourt(iso){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] : String(iso || ''); }
function apMois(iso){
  try{ const t = new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { timeZone: 'UTC', month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); }
  catch(e){ return iso.slice(0, 7); }
}
function apDuree(s){
  s = Number(s || 0);
  if(!s) return '—';
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
/* +33612345678 → 06 12 34 56 78 */
function apNumero(n){
  const t = String(n || '');
  const m = t.match(/^\+33(\d{9})$/);
  if(m) return ('0' + m[1]).replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  return t;
}
function apNumeroDeFiche(v){
  let t = String(v || '').replace(/[^\d+]/g, '');
  if(!t) return '';
  if(t.indexOf('00') === 0) t = '+' + t.slice(2);
  if(t.indexOf('0') === 0 && t.length === 10) t = '+33' + t.slice(1);
  if(t.indexOf('+') !== 0) t = (t.length === 9) ? '+33' + t : '+' + t;
  return /^\+\d{8,15}$/.test(t) ? t : '';
}
/* 📄 v1269 — le résumé complet d'Allo est écrit en Markdown (# titre,
   ## partie, - liste, **gras**) : on le montre mis en forme, et on le
   reprend en texte simple dans un mail ou un message. */
function apMarkdown(t){
  const lignes = String(t || '').replace(/\r/g, '').split('\n');
  const gras = x => apEsc(x).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  let h = '', liste = false;
  lignes.forEach(l => {
    const x = l.trim();
    const puce = x.match(/^[-*•]\s+(.*)$/);
    if(puce){ if(!liste){ h += '<ul>'; liste = true; } h += '<li>' + gras(puce[1]) + '</li>'; return; }
    if(liste){ h += '</ul>'; liste = false; }
    if(!x) return;
    const t1 = x.match(/^#{1,2}\s+(.*)$/), t2 = x.match(/^#{3,6}\s+(.*)$/);
    if(t1) h += '<div class="apMdT">' + gras(t1[1]) + '</div>';
    else if(t2) h += '<div class="apMdS">' + gras(t2[1]) + '</div>';
    else h += '<div>' + gras(x) + '</div>';
  });
  if(liste) h += '</ul>';
  return h;
}
function apTexteSimple(t){
  return String(t || '').replace(/\r/g, '').split('\n').map(l => l.trim()
    .replace(/^#{1,6}\s+/, '').replace(/^[-*•]\s+/, '• ').replace(/\*\*([^*]+)\*\*/g, '$1')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function apResumeEntier(a){ return (a.resumeComplet && a.resumeComplet.trim()) || a.resume || ''; }
function apFiche(nom){
  if(typeof ficheDe === 'function') return ficheDe(nom) || null;
  return null;
}
function apEnAttente(a){ return !!a.rappelLe && !a.rappelFait; }
function apTexteRappel(a, auj){
  auj = auj || apAujourdhui();
  if(a.rappelLe === auj) return 'aujourd’hui';
  if(a.rappelLe === apPlusJours(auj, 1)) return 'demain';
  if(a.rappelLe < auj) return 'en retard (prévu le ' + apJourCourt(a.rappelLe) + ')';
  return 'le ' + apJourCourt(a.rappelLe);
}

/* Le chargement des fiches : les suggestions et les mails en ont besoin */
async function apFichesPretes(){
  if(typeof fichesEleves !== 'undefined' && Array.isArray(fichesEleves) && fichesEleves.length) return;
  if(typeof chargerFiches === 'function'){ try{ await chargerFiches(); }catch(e){} }
}

/* ============================================================
   L'ÉCRAN DU SUIVI
   ============================================================ */
async function afficherSuiviAppels(recharger, relire){
  const zone = $('suiviAppelsZone');
  if(!zone) return;
  if(!suiviAppelsEC.appels || recharger !== false){
    if(!suiviAppelsEC.appels) zone.innerHTML = '<div class="empty">Chargement des appels…</div>';
    try{
      const d = await appelPrep({ action: relire ? 'alloRelire' : 'alloLire', jours: suiviAppelsEC.jours });
      Object.assign(suiviAppelsEC, {
        appels: (d && d.appels) || [], synchro: Number((d && d.synchro) || 0), erreur: (d && d.erreur) || '',
        cron: Number((d && d.cron) || 0), lu: Date.now(),
        cle: !(d && d.cle === false), peutEcouter: !!(d && d.peutEcouter),
        aujourdhui: (d && d.aujourdhui) || apAujourdhui(), depuis: Number((d && d.depuis) || 0), charge: true
      });
      aRappelerEC = { appels: suiviAppelsEC.appels.filter(apEnAttente), aujourdhui: suiviAppelsEC.aujourdhui, lu: true };
      if(typeof dessinerBandeau === 'function') try{ dessinerBandeau(); }catch(e){}
      /* 🕘 v1275 — le serveur vient de relancer Allo en arrière-plan :
         on relit dans quelques secondes pour montrer ce qui est arrivé */
      if(d && d.relance && !relire) setTimeout(() => apRelireSiVisible(true), 12000);
    }catch(e){
      zone.innerHTML = '<div class="empty">Impossible de lire les appels : ' + apEsc(e.message || e) + '</div>';
      return;
    }
  }
  apFichesPretes().catch(() => {});
  dessinerSuiviAppels();
}

function apCorrespond(a, filtre){
  if(filtre === 'tous') return true;
  if(filtre === 'rappel') return apEnAttente(a);
  if(filtre === 'seuls') return !a.eleve && !a.pasEleve;
  if(filtre === 'mail') return a.mail;
  return a.statut === filtre;
}

function dessinerSuiviAppels(){
  const zone = $('suiviAppelsZone');
  if(!zone) return;
  const E = suiviAppelsEC;
  const auj = E.aujourdhui || apAujourdhui();
  const tous = E.appels || [];
  const mots = String(E.cherche || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const cherche = mots ? tous.filter(a => {
    const t = [a.eleve, a.numero, apNumero(a.numero), a.resume, a.nomEntendu, a.libelle, a.note]
      .join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return mots.split(/\s+/).every(m => t.indexOf(m) !== -1 || t.replace(/\s/g, '').indexOf(m) !== -1);
  }) : tous;

  zone.innerHTML = '';

  /* L'en-tête : d'où ça vient, quand c'était relu */
  const intro = document.createElement('div');
  intro.className = 'apIntro';
  const quand = E.synchro ? new Date(E.synchro).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  intro.innerHTML = 'Tous les appels et SMS du 02 21 65 24 24 (Allo), relus toutes les 5 minutes' +
    (quand ? ' — dernière lecture le ' + apEsc(quand) : '') + '. Un appel se range tout seul dans le dossier de l’élève dont c’est le numéro ; sinon, « 🔗 Rattacher ».' +
    (E.depuis ? ' <span style="opacity:.8">Suivi commencé le ' + apEsc(new Date(E.depuis).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })) + '.</span>' : '');
  zone.appendChild(intro);
  /* 🕘 v1275 — le déclencheur des 5 minutes de Cloudflare ne tourne pas :
     l'appli relit quand même dès qu'elle est ouverte, mais pas la nuit */
  const admin = typeof ACCES !== 'undefined' && ACCES && ACCES.role === 'admin';
  if(admin && E.cle && !E.erreur && (!E.cron || Date.now() - E.cron > 20 * 60000)){
    const w = document.createElement('div');
    w.className = 'apCron';
    w.textContent = '🕘 Le déclencheur « toutes les 5 minutes » du Worker ' +
      (E.cron ? 'ne s’est plus déclenché depuis le ' + new Date(E.cron).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'ne s’est jamais déclenché') +
      ' : l’appli relit Allo quand elle est ouverte. Pour qu’il tourne aussi appli fermée : Cloudflare › ce Worker › Settings › Trigger Events › ajouter le Cron « */5 * * * * ».';
    zone.appendChild(w);
  }
  if(!E.cle || E.erreur){
    const err = document.createElement('div');
    err.className = 'apErreur';
    err.textContent = '⚠️ ' + (!E.cle ? 'Clé Allo absente du Worker (ALLO_API_KEY ou ALLO_CLE_APPELS).' : E.erreur);
    zone.appendChild(err);
  }

  /* Les tuiles */
  const semaine = apPlusJours(auj, -6);
  const nRappel = tous.filter(apEnAttente).length;
  const nSeuls = tous.filter(a => !a.eleve && !a.pasEleve).length;
  const nAuj = tous.filter(a => a.jour === auj && a.genre !== 'SMS').length;
  const nRep = tous.filter(a => a.jour >= semaine && (a.statut === 'repondeur' || a.statut === 'pas_reponse')).length;
  const tuiles = document.createElement('div');
  tuiles.className = 'apTuiles';
  [[nRappel, '⏰ À rappeler', 'rappel', nRappel ? 'rouge' : ''], [nSeuls, '❓ Numéros non rattachés', 'seuls', ''],
   [nAuj, '📞 Appels aujourd’hui', 'tous', ''], [nRep, '📵 Répondeurs cette semaine', 'repondeur', '']].forEach(([n, t, f, c]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'apTuile' + (c ? ' ' + c : '');
    b.innerHTML = '<b>' + n + '</b><span>' + apEsc(t) + '</span>';
    b.addEventListener('click', () => { E.filtre = f; dessinerSuiviAppels(); });
    tuiles.appendChild(b);
  });
  zone.appendChild(tuiles);

  /* La barre : chercher, la période, les gestes */
  const barre = document.createElement('div');
  barre.className = 'apBarre';
  const champ = document.createElement('input');
  champ.type = 'text';
  champ.inputMode = 'search';
  champ.className = 'apCherche';
  champ.placeholder = '🔎 Un nom, un numéro, un mot du résumé…';
  champ.value = E.cherche || '';
  champ.addEventListener('input', () => {
    E.cherche = champ.value;
    const pos = champ.selectionStart;
    dessinerSuiviAppels();
    const c2 = zone.querySelector('.apBarre input.apCherche');
    if(c2){ c2.focus(); try{ c2.setSelectionRange(pos, pos); }catch(e){} }
  });
  barre.appendChild(champ);
  const periode = document.createElement('select');
  periode.className = 'apPeriode';
  [[1, '📅 Aujourd’hui'], [7, '📅 Cette semaine'], [31, '📅 30 jours'], [92, '📅 3 mois'], [366, '📅 1 an']].forEach(([v, t]) => {
    const o = document.createElement('option'); o.value = v; o.textContent = t; if(Number(E.jours) === v) o.selected = true; periode.appendChild(o);
  });
  periode.addEventListener('change', () => { E.jours = Number(periode.value) || 7; afficherSuiviAppels(true); });
  barre.appendChild(periode);
  zone.appendChild(barre);

  if(apPeutTout() || (typeof aDroit === 'function' && aDroit('appels'))){
    const gestes = document.createElement('div');
    gestes.className = 'apGestes';
    if(apPeutTout()){
      const bR = document.createElement('button');
      bR.className = 'btn btn-secondary apBtn';
      bR.textContent = '🔄 Relire maintenant';
      bR.addEventListener('click', async () => { bR.disabled = true; bR.textContent = '🔄 Lecture…'; await afficherSuiviAppels(true, true); });
      gestes.appendChild(bR);
      const nDuJour = tous.filter(a => apEnAttente(a) && a.rappelLe <= auj && a.numero).length;
      const bT = document.createElement('button');
      bT.className = 'btn btn-secondary apBtn';
      bT.textContent = '📞 Tout rappeler (' + nDuJour + ')';
      bT.title = 'Envoie les numéros à rappeler aujourd’hui (et en retard) dans la file d’appels d’Allo';
      bT.disabled = !nDuJour;
      bT.addEventListener('click', () => toutRappelerAvecAllo(bT));
      gestes.appendChild(bT);
    }
    const bN = document.createElement('button');
    bN.className = 'btn btn-secondary apBtn';
    bN.textContent = '➕ Noter un appel passé d’un autre téléphone';
    bN.addEventListener('click', () => ouvrirNoterUnAppel(''));
    gestes.appendChild(bN);
    zone.appendChild(gestes);
  }

  /* Les filtres, avec leur compte — seulement ceux qui ont quelque chose */
  const filtres = document.createElement('div');
  filtres.className = 'apFiltres';
  const choix = [['tous', 'Tous'], ['rappel', '⏰ À rappeler'], ['joint', '✅ Joint'], ['message', '📩 Message laissé'],
    ['repondeur', '📵 Répondeur'], ['pas_reponse', '🔕 Pas de réponse'], ['manque', '📲 Appel manqué'],
    ['mail', '✉️ Mail envoyé'], ['ia', '🤖 Accueil IA'], ['sms', '💬 SMS'], ['seuls', '❓ Non rattachés']];
  choix.forEach(([f, t]) => {
    const n = cherche.filter(a => apCorrespond(a, f)).length;
    if(f !== 'tous' && !n && E.filtre !== f) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn pastilleVue ' + (E.filtre === f ? 'btn-primary' : 'btn-secondary');
    b.textContent = t + ' · ' + n;
    b.addEventListener('click', () => { E.filtre = f; dessinerSuiviAppels(); });
    filtres.appendChild(b);
  });
  zone.appendChild(filtres);

  const liste = cherche.filter(a => apCorrespond(a, E.filtre));
  if(!liste.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = tous.length ? 'Aucun appel pour ce filtre.' : 'Aucun appel pour le moment. Les appels arrivent ici dans les 5 minutes.';
    zone.appendChild(v);
    return;
  }
  /* Les rappels en attente d'abord quand on filtre « à rappeler » ;
     sinon, du plus récent au plus ancien, jour par jour. */
  let jourCourant = null;
  const hier = apPlusJours(auj, -1);
  liste.forEach(a => {
    if(a.jour !== jourCourant){
      jourCourant = a.jour;
      const t = document.createElement('div');
      t.className = 'apJour';
      t.textContent = (a.jour === auj ? 'Aujourd’hui — ' : a.jour === hier ? 'Hier — ' : '') + apJourLong(a.jour);
      zone.appendChild(t);
    }
    zone.appendChild(ligneAppelEC(a, { auj: auj }));
  });
}

/* Une ligne d'appel — l'écran du suivi et le dossier (o.dossier) */
function ligneAppelEC(a, o){
  o = o || {};
  const auj = o.auj || apAujourdhui();
  const tout = apPeutTout();
  const l = document.createElement('div');
  l.className = 'apLigne' + (apEnAttente(a) ? ' aRappeler' : '');
  l.dataset.id = a.id;

  const h = document.createElement('div');
  h.className = 'apHeure';
  const sens = a.sens === 'out' ? '↗️ sortant' : '↙️ entrant';
  if(o.dossier) h.innerHTML = apEsc(apJourCourt(a.jour)) + '<span>' + apEsc(a.heure) + ' · ' + (a.sens === 'out' ? '↗️' : '↙️') + '</span><span>' + (a.genre === 'SMS' ? 'SMS' : apDuree(a.duree)) + '</span>';
  else h.innerHTML = apEsc(a.heure) + '<span>' + sens + '</span><span>' + (a.genre === 'SMS' ? 'SMS' : apDuree(a.duree)) + '</span>';
  l.appendChild(h);

  const c = document.createElement('div');
  c.className = 'apCorps';

  /* Qui */
  if(!o.dossier){
    const haut = document.createElement('div');
    haut.className = 'apHaut';
    if(a.eleve){
      const q = document.createElement('a');
      q.href = '#';
      q.className = 'apQui';
      q.textContent = a.eleve;
      q.addEventListener('click', ev => {
        ev.preventDefault();
        if(typeof ouvrirPageEleve === 'function'){ ouvrirPageEleve(a.eleve); if(typeof choisirOngletEleve === 'function') choisirOngletEleve('appels'); }
      });
      haut.appendChild(q);
      const n = document.createElement('span');
      n.className = 'apNum';
      n.textContent = (a.lien === 'proche' ? '👪 ' + (a.libelle || 'un proche') + ' · ' : '') + apNumero(a.numero);
      haut.appendChild(n);
    }else if(a.pasEleve){
      const q = document.createElement('span');
      q.className = 'apQui pasEleve';
      q.textContent = '🏷️ ' + (a.libelle || apNumero(a.numero));
      haut.appendChild(q);
      if(a.libelle){ const n = document.createElement('span'); n.className = 'apNum'; n.textContent = apNumero(a.numero); haut.appendChild(n); }
    }else{
      const q = document.createElement('span');
      q.className = 'apQui inconnu';
      q.textContent = '❓ ' + (apNumero(a.numero) || 'Numéro masqué');
      haut.appendChild(q);
      if(a.nomEntendu){ const n = document.createElement('span'); n.className = 'apNum'; n.textContent = 'Allo a entendu « ' + a.nomEntendu + ' »'; haut.appendChild(n); }
    }
    c.appendChild(haut);
  }

  /* Les pastilles */
  const etats = document.createElement('div');
  etats.className = 'apEtats';
  if(o.dossier) etats.style.marginTop = '0';
  const st = STATUTS_APPEL_EC[a.statut];
  if(st){
    const p = document.createElement('span');
    p.className = 'apSt';
    p.style.cssText = 'color:' + st.couleur + ';background:' + st.fond + ';border-color:' + st.couleur;
    p.textContent = st.emoji + ' ' + (a.statut === 'sms' ? (a.sens === 'out' ? 'SMS envoyé' : 'SMS reçu') : st.nom);
    etats.appendChild(p);
  }
  Object.keys(CANAUX_APPEL_EC).forEach(k => {
    if(!a[k]) return;
    const cn = CANAUX_APPEL_EC[k];
    const p = document.createElement('span');
    p.className = 'apSt';
    p.style.cssText = 'color:' + cn.couleur + ';background:' + cn.fond + ';border-color:' + cn.couleur;
    p.textContent = cn.emoji + ' ' + cn.fait;
    etats.appendChild(p);
  });
  if(o.dossier && a.lien === 'proche'){
    const p = document.createElement('span');
    p.className = 'apSt';
    p.textContent = '👪 ' + (a.libelle || 'Un proche') + ' · ' + apNumero(a.numero);
    etats.appendChild(p);
  }
  if(apEnAttente(a)){
    const p = document.createElement('span');
    p.className = 'apSt rappel';
    p.textContent = '⏰ À rappeler ' + apTexteRappel(a, auj);
    etats.appendChild(p);
  }else if(a.rappelLe && a.rappelFait){
    const p = document.createElement('span');
    p.className = 'apSt';
    p.textContent = '☑️ Rappelé' + (a.rappelFaitPar ? ' · ' + a.rappelFaitPar : '');
    etats.appendChild(p);
  }
  const src = document.createElement('span');
  src.className = 'apSrc';
  if(a.source === 'main') src.textContent = '📱 ' + (a.via || 'autre téléphone') + ' · noté par ' + (a.statutPar || '?');
  else if(a.statutPar) src.textContent = '✋ ' + a.statutPar;
  else if(a.genre !== 'SMS') src.textContent = 'détecté par Allo';
  if(src.textContent) etats.appendChild(src);
  c.appendChild(etats);

  /* Le résumé, la note */
  if(a.resume || a.note){
    const r = document.createElement('div');
    r.className = 'apResume';
    r.textContent = a.resume || '';
    if(a.note){
      const i = document.createElement('i');
      i.textContent = (a.resume ? ' — ' : '') + 'Note : ' + a.note;
      r.appendChild(i);
    }
    c.appendChild(r);
  }
  /* 📄 v1269 — le résumé complet de l'appel, à déplier */
  if(a.source === 'allo' && a.genre === 'CALL'){
    const bloc = document.createElement('div');
    bloc.className = 'apComplet';
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'apDeplier';
    const ouvert = !!apOuverts[a.id];
    t.textContent = (ouvert ? '▾ ' : '▸ ') + '📄 Résumé complet de l’appel';
    t.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    bloc.appendChild(t);
    const corps = document.createElement('div');
    corps.className = 'apMd';
    corps.style.display = ouvert ? '' : 'none';
    if(ouvert) corps.innerHTML = a.resumeComplet ? apMarkdown(a.resumeComplet) : '<i>Lecture chez Allo…</i>';
    bloc.appendChild(corps);
    t.addEventListener('click', async () => {
      apOuverts[a.id] = !apOuverts[a.id];
      if(!apOuverts[a.id]){ corps.style.display = 'none'; t.textContent = '▸ 📄 Résumé complet de l’appel'; t.setAttribute('aria-expanded', 'false'); return; }
      t.textContent = '▾ 📄 Résumé complet de l’appel'; t.setAttribute('aria-expanded', 'true');
      corps.style.display = '';
      if(a.resumeComplet){ corps.innerHTML = apMarkdown(a.resumeComplet); return; }
      corps.innerHTML = '<i>Lecture chez Allo…</i>';
      try{
        const d = await appelPrep({ action: 'alloResume', id: a.id });
        if(d && d.appel){ Object.assign(a, d.appel); corps.innerHTML = apMarkdown(d.appel.resumeComplet || d.appel.resume || ''); }
      }catch(e){ corps.textContent = '⚠️ ' + e.message; }
    });
    c.appendChild(bloc);
  }

  /* Ce qu'on a envoyé */
  (a.envois || []).forEach(e => {
    const cn = CANAUX_APPEL_EC[e.canal] || { emoji: '✉️', nom: e.canal };
    const d = document.createElement('div');
    d.className = 'apEnvoi';
    const t = document.createElement('div');
    t.className = 'apEnvoiT';
    t.textContent = cn.emoji + ' ' + (e.canal === 'mail' ? 'Mail à ' + (e.a || '') + (e.sujet ? ' — « ' + e.sujet + ' »' : '')
      : e.canal === 'messagerie' ? 'Messagerie, fil « Le bureau »' : 'Messenger (copié et ouvert)') +
      ' · ✋ ' + (e.par || '?') + ' · ' + (e.le || '');
    d.appendChild(t);
    const x = document.createElement('div');
    x.className = 'apEnvoiX';
    const court = String(e.texte || '');
    x.textContent = court.length > 180 ? court.slice(0, 180) + '…' : court;
    if(court.length > 180){
      x.title = 'Voir tout';
      x.style.cursor = 'pointer';
      x.addEventListener('click', () => { x.textContent = court; x.style.cursor = ''; });
    }
    d.appendChild(x);
    c.appendChild(d);
  });

  /* Les gestes */
  if(tout){
    const g = document.createElement('div');
    g.className = 'apActions';
    const bouton = (texte, f, primaire, titre) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (primaire ? 'btn-primary' : 'btn-secondary') + ' apBtn';
      b.textContent = texte;
      if(titre) b.title = titre;
      b.addEventListener('click', f);
      g.appendChild(b);
      return b;
    };
    if(!a.eleve && !a.pasEleve && !o.dossier) bouton('🔗 Rattacher', () => ouvrirRattacherAppel(a), true);
    /* 📞 v1305 — David : « mets-moi un bouton pour rappeler dans le suivi
       des appels même s'il n'y a pas de demande de rappel ». Sur tout
       appel dont on a le numéro. */
    if(a.numero && apNumeroAppelable(a.numero)){
      const t = document.createElement('a');
      t.className = 'btn btn-secondary apBtn';
      t.href = 'tel:' + a.numero;
      t.textContent = o.dossier ? '📞' : '📞 Rappeler';
      t.title = 'Appeler le ' + apNumero(a.numero);
      g.appendChild(t);
    }
    if(apEnAttente(a)) bouton(o.dossier ? '☑️' : '☑️ Rappel fait', () => rappelFaitAppel(a), false, 'Le rappel est fait');
    if(a.genre !== 'SMS') bouton(o.dossier ? '✏️' : '✏️ Ce qui s’est passé', () => ouvrirCeQuiSestPasse(a), false, 'Ce qui s’est passé');
    /* v1269 — sur chaque appel, rattaché ou non : un mail à une adresse tapée, ou un texte à copier */
    bouton(o.dossier ? '✉️' : '✉️ Écrire', () => ouvrirEnvoyerDepuisAppel(a, ''), false, 'Écrire un mail, un message dans la messagerie, ou un texte à copier sur Messenger');
    if(a.enregistrement && a.source === 'allo' && (suiviAppelsEC.peutEcouter || apRoleEcoute())) bouton('▶', () => ecouterAppel(a), false, 'Écouter l’enregistrement');
    if(g.children.length) c.appendChild(g);
  }
  l.appendChild(c);
  return l;
}
/* Un numéro qu'on peut composer (pas « masqué », pas vide) */
function apNumeroAppelable(n){ return String(n || '').replace(/[^\d]/g, '').length >= 6; }
function apRoleEcoute(){ return typeof ACCES !== 'undefined' && ACCES && (ACCES.role === 'admin' || ACCES.role === 'bureau'); }

/* Après un geste : la ligne change partout où elle est */
function apRemplacer(a){
  if(!a) return;
  const E = suiviAppelsEC;
  if(E.appels){
    const i = E.appels.findIndex(x => x.id === a.id);
    if(i !== -1) E.appels[i] = a; else E.appels.unshift(a);
  }
  if(apDossierEC.appels){
    const i = apDossierEC.appels.findIndex(x => x.id === a.id);
    if(i !== -1) apDossierEC.appels[i] = a;
    else if(a.eleve && apDossierEC.eleve && normaliserApNom(a.eleve) === normaliserApNom(apDossierEC.eleve)) apDossierEC.appels.unshift(a);
  }
  const autres = (aRappelerEC.appels || []).filter(x => x.id !== a.id);
  if(apEnAttente(a)) autres.unshift(a);
  aRappelerEC = { appels: autres, aujourdhui: aRappelerEC.aujourdhui || apAujourdhui(), lu: true };
  apRedessiner();
}
function apOter(id){
  if(suiviAppelsEC.appels) suiviAppelsEC.appels = suiviAppelsEC.appels.filter(x => x.id !== id);
  if(apDossierEC.appels) apDossierEC.appels = apDossierEC.appels.filter(x => x.id !== id);
  aRappelerEC.appels = (aRappelerEC.appels || []).filter(x => x.id !== id);
  apRedessiner();
}
function apRedessiner(){
  if($('suiviAppelsZone') && suiviAppelsEC.appels) dessinerSuiviAppels();
  if(apDossierEC.corps && apDossierEC.corps.isConnected) dessinerAppelsDuDossier();
  if(typeof dessinerBandeau === 'function') try{ dessinerBandeau(); }catch(e){}
}
function normaliserApNom(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

/* ============================================================
   UNE FENÊTRE, LA MÊME POUR TOUS
   ============================================================ */
function apFenetre(titre, largeur){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal apModal';
  boite.style.cssText = 'max-width:min(' + (largeur || 540) + 'px, 96vw);max-height:92vh;overflow-y:auto;';
  const h = document.createElement('h3');
  h.textContent = titre;
  boite.appendChild(h);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  return { fond, boite, fermer: () => fermerFond(fond) };
}
function apLab(texte){ const d = document.createElement('div'); d.className = 'apLab'; d.textContent = texte; return d; }
function apCoche(texte, coche){
  const l = document.createElement('label');
  l.className = 'apCoche';
  const i = document.createElement('input');
  i.type = 'checkbox';
  i.checked = !!coche;
  l.appendChild(i);
  const t = document.createElement('span');
  t.className = 'apCocheT';
  t.textContent = texte;
  l.appendChild(t);
  return { l, i };
}
function apDetecte(a){
  const d = document.createElement('div');
  d.className = 'apDetecte';
  const st = STATUTS_APPEL_EC[a.statut];
  const qui = a.source === 'main' ? '📱 Noté à la main (' + (a.via || 'autre téléphone') + ')'
    : (a.sens === 'out' ? '↗️ Appel sortant' : '↙️ Appel entrant') + ' · ' + apDuree(a.duree);
  d.innerHTML = apEsc(qui) + (a.source === 'allo' && st ? ' · <b>Allo a détecté : ' + apEsc(st.emoji + ' ' + st.nom.toLowerCase()) +
    (a.statut === 'repondeur' ? ', pas de message laissé' : '') + '.</b>' : '') +
    (a.resumeComplet ? '<div class="apMd apMdBoite">' + apMarkdown(a.resumeComplet) + '</div>'
      : (a.resume ? '<br><span style="color:var(--muted)">Résumé : « ' + apEsc(a.resume) + ' »</span>' : ''));
  /* 📄 v1269 — pas encore lu : on le demande à Allo, et il prend sa place */
  if(!a.resumeComplet && a.source === 'allo' && a.genre === 'CALL'){
    appelPrep({ action: 'alloResume', id: a.id }).then(x => {
      if(x && x.appel && x.appel.resumeComplet && d.isConnected){
        Object.assign(a, x.appel);
        const s0 = d.querySelector('span'); if(s0 && s0.previousSibling && s0.previousSibling.nodeName === 'BR') s0.previousSibling.remove(); if(s0) s0.remove();
        const m = document.createElement('div'); m.className = 'apMd apMdBoite'; m.innerHTML = apMarkdown(x.appel.resumeComplet); d.appendChild(m);
      }
    }).catch(() => {});
  }
  return d;
}

/* ============================================================
   ✏️ CE QUI S'EST PASSÉ
   ============================================================ */
function ouvrirCeQuiSestPasse(a){
  const titre = (a.eleve || (a.pasEleve ? (a.libelle || apNumero(a.numero)) : apNumero(a.numero))) + ' — ' +
    (a.jour === apAujourdhui() ? 'aujourd’hui' : 'le ' + apJourCourt(a.jour)) + ' à ' + String(a.heure || '').replace(':', ' h ');
  const f = apFenetre('📞 ' + titre, 540);
  f.boite.appendChild(apDetecte(a));

  f.boite.appendChild(apLab('Ce qui s’est passé'));
  const grille = document.createElement('div');
  grille.className = 'apChoix';
  let statut = a.statut;
  const options = [['joint', '✅ Je l’ai eu(e)'], ['message', '📩 J’ai laissé un message'],
                   ['repondeur', '📵 Répondeur, rien laissé'], ['pas_reponse', '🔕 Pas de réponse / occupé']];
  if(a.sens === 'in') options.push(['manque', '📲 Appel manqué'], ['ia', '🤖 Pris par l’accueil IA']);
  const boutons = [];
  options.forEach(([k, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.statut = k;
    b.textContent = t;
    b.addEventListener('click', () => {
      statut = k;
      boutons.forEach(x => x.className = 'btn ' + (x.dataset.statut === statut ? 'btn-primary' : 'btn-secondary'));
      if(k === 'joint' && cR.i.checked && !a.rappelLe){ cR.i.checked = false; majQuand(); }
      if((k === 'repondeur' || k === 'pas_reponse' || k === 'manque') && !cR.i.checked){ cR.i.checked = true; majQuand(); }
    });
    boutons.push(b);
    grille.appendChild(b);
  });
  boutons.forEach(x => x.className = 'btn ' + (x.dataset.statut === statut ? 'btn-primary' : 'btn-secondary'));
  f.boite.appendChild(grille);

  f.boite.appendChild(apLab('Et ensuite'));
  const auj = apAujourdhui();
  const enAttente = apEnAttente(a);
  const cR = apCoche('⏰ À rappeler', enAttente);
  f.boite.appendChild(cR.l);
  let quand = enAttente ? a.rappelLe : auj;
  const zQ = document.createElement('div');
  zQ.className = 'apQuand';
  zQ.style.margin = '6px 0 0 26px';
  const dateLibre = document.createElement('input');
  dateLibre.type = 'date';
  dateLibre.className = 'apDateLibre';
  dateLibre.value = quand;
  const bQ = [];
  [['Aujourd’hui', auj], ['Demain', apPlusJours(auj, 1)], ['📅 Le…', '']].forEach(([t, v]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.dataset.v = v;
    b.addEventListener('click', () => {
      if(v) quand = v;
      else { dateLibre.style.display = ''; try{ dateLibre.showPicker && dateLibre.showPicker(); }catch(e){} quand = dateLibre.value || quand; }
      majQuand();
    });
    bQ.push(b);
    zQ.appendChild(b);
  });
  dateLibre.addEventListener('change', () => { if(dateLibre.value) quand = dateLibre.value; majQuand(); });
  zQ.appendChild(dateLibre);
  f.boite.appendChild(zQ);
  function majQuand(){
    zQ.style.display = cR.i.checked ? 'flex' : 'none';
    const libre = quand !== auj && quand !== apPlusJours(auj, 1);
    bQ.forEach(b => b.className = 'btn pastilleVue ' + ((b.dataset.v ? b.dataset.v === quand : libre) ? 'btn-primary' : 'btn-secondary'));
    dateLibre.style.display = libre ? '' : 'none';
    dateLibre.value = quand;
  }
  cR.i.addEventListener('change', majQuand);
  majQuand();

  const cM = apCoche('✉️ Je lui ai envoyé un mail', a.mail);
  const cG = apCoche('💬 Je lui ai écrit dans la messagerie', a.messagerie);
  f.boite.appendChild(cM.l);
  f.boite.appendChild(cG.l);

  f.boite.appendChild(apLab('Une note (facultatif)'));
  const note = document.createElement('input');
  note.type = 'text';
  note.placeholder = 'Ex : rappeler après 17 h, il travaille';
  note.value = a.note || '';
  note.style.margin = '0';
  f.boite.appendChild(note);

  /* ✉️ v1269 — écrire tout de suite, depuis cette fenêtre */
  f.boite.appendChild(apLab('Écrire maintenant'));
  const ecr = document.createElement('div');
  ecr.className = 'apQuand';
  [['mail', '✉️ Un mail'], ['messagerie', '💬 Sa messagerie'], ['messenger', 'Ⓜ️ Un texte pour Messenger']].forEach(([k, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn pastilleVue btn-secondary';
    b.setAttribute('data-ecrire', k);
    b.textContent = t;
    b.addEventListener('click', async () => {
      /* ce qui est déjà choisi est gardé, puis la fenêtre d'écriture s'ouvre */
      try{
        const d = await appelPrep({ action: 'alloStatut', id: a.id, statut: statut, rappel: cR.i.checked ? quand : '',
                                    mail: cM.i.checked ? 1 : 0, messagerie: cG.i.checked ? 1 : 0, note: note.value.trim() });
        f.fermer();
        const a2 = (d && d.appel) || a;
        apRemplacer(a2);
        ouvrirEnvoyerDepuisAppel(a2, k);
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    ecr.appendChild(b);
  });
  f.boite.appendChild(ecr);

  const dit = document.createElement('div');
  dit.className = 'apDit';
  dit.textContent = a.eleve
    ? 'Rangé dans le dossier de ' + a.eleve + ', onglet 📞 Appels, avec ton nom (' + apMoi() + ').'
    : 'Enregistré avec ton nom (' + apMoi() + '). Pense à « 🔗 Rattacher » cet appel à un élève.';
  f.boite.appendChild(dit);

  const r = document.createElement('div');
  r.className = 'btn-row apPied';
  const bS = document.createElement('button');
  bS.className = 'btn btn-secondary apSuppr';
  bS.textContent = '🗑️';
  bS.title = 'Supprimer cet appel du suivi';
  bS.addEventListener('click', async () => {
    if(!await confirmer('Supprimer cet appel du suivi de l’appli ?\n\nIl reste chez Allo ; seul notre suivi (statut, note, envois) est effacé.', 'Supprimer l’appel', true)) return;
    try{ await appelPrep({ action: 'alloSupprimer', id: a.id }); f.fermer(); apOter(a.id); showToast('Appel supprimé du suivi.'); }
    catch(e){ showToast('Impossible : ' + e.message); }
  });
  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', f.fermer);
  const bE = document.createElement('button');
  bE.className = 'btn btn-primary';
  bE.textContent = '💾 Enregistrer';
  bE.addEventListener('click', async () => {
    bE.disabled = true;
    try{
      const d = await appelPrep({ action: 'alloStatut', id: a.id, statut: statut, rappel: cR.i.checked ? quand : '',
                                  mail: cM.i.checked ? 1 : 0, messagerie: cG.i.checked ? 1 : 0, note: note.value.trim() });
      f.fermer();
      apRemplacer(d && d.appel);
      showToast('Enregistré ✅');
    }catch(e){ bE.disabled = false; showToast('Impossible : ' + e.message); }
  });
  r.append(bS, bA, bE);
  f.boite.appendChild(r);
}

async function rappelFaitAppel(a){
  try{
    const d = await appelPrep({ action: 'alloRappelFait', id: a.id });
    apRemplacer(d && d.appel);
    showToast('☑️ Rappel fait');
  }catch(e){ showToast('Impossible : ' + e.message); }
}

/* ============================================================
   🔗 À QUI EST CE NUMÉRO ?
   ============================================================ */
const MOTS_PROCHE_AP = /\b(maman|papa|mere|pere|parent|tante|oncle|grand|beau|belle|soeur|frere|tuteur|tutrice)\b/;

function apSuggestions(a){
  const fiches = (typeof fichesEleves !== 'undefined' && Array.isArray(fichesEleves)) ? fichesEleves : [];
  const vu = {};
  const out = [];
  fiches.forEach(fi => {
    if(apNumeroDeFiche(fi.telephone) && apNumeroDeFiche(fi.telephone) === a.numero && !vu[fi.eleve]){ vu[fi.eleve] = 1; out.push({ f: fi, score: 100 }); }
  });
  const entendu = normaliserApNom(a.nomEntendu).split(' ').filter(m => m.length > 2 && !MOTS_PROCHE_AP.test(m) && ['de', 'des', 'du', 'la', 'le'].indexOf(m) === -1);
  if(entendu.length){
    fiches.forEach(fi => {
      if(vu[fi.eleve]) return;
      const n = normaliserApNom(fi.eleve).split(' ');
      const s = entendu.filter(m => n.indexOf(m) !== -1).length;
      if(s){ vu[fi.eleve] = 1; out.push({ f: fi, score: s * 10 + (s === entendu.length ? 5 : 0) }); }
    });
  }
  return out.sort((x, y) => y.score - x.score).slice(0, 5).map(x => x.f);
}

async function ouvrirRattacherAppel(a){
  await apFichesPretes();
  const f = apFenetre('🔗 À qui est ce numéro ?', 540);
  const d = document.createElement('div');
  d.className = 'apDetecte';
  d.innerHTML = '❓ <b>' + apEsc(apNumero(a.numero) || 'Numéro masqué') + '</b> · appel ' + (a.sens === 'out' ? 'sortant' : 'entrant') +
    ' ' + (a.jour === apAujourdhui() ? 'd’aujourd’hui' : 'du ' + apEsc(apJourCourt(a.jour))) + ' à ' + apEsc(String(a.heure || '').replace(':', ' h ')) +
    (a.nomEntendu ? '<br>Allo a entendu : « <b>' + apEsc(a.nomEntendu) + '</b> »' : '');
  f.boite.appendChild(d);

  const cP = apCoche('👪 C’est un parent / un proche : garder ce numéro dans sa fiche (« 📞 autres numéros ») pour ranger tout seul ses prochains appels',
                     MOTS_PROCHE_AP.test(normaliserApNom(a.nomEntendu)));
  const lib = document.createElement('input');
  lib.type = 'text';
  lib.placeholder = 'Qui ? (ex : sa mère)';
  lib.className = 'apLibelle';
  const m = normaliserApNom(a.nomEntendu).match(MOTS_PROCHE_AP);
  if(m) lib.value = { maman: 'sa mère', mere: 'sa mère', papa: 'son père', pere: 'son père' }[m[1]] || '';

  const choisir = async (nom) => {
    try{
      const r = await appelPrep({ action: 'alloRattacher', id: a.id, eleve: nom, proche: cP.i.checked ? 1 : 0, libelle: cP.i.checked ? lib.value.trim() : '' });
      f.fermer();
      /* Les autres appels du même numéro ont suivi : on relit. */
      if($('suiviAppelsZone') && suiviAppelsEC.appels) afficherSuiviAppels(true); else apRemplacer(r && r.appel);
      showToast('Rattaché à ' + nom + ' ✅');
    }catch(e){ showToast('Impossible : ' + e.message); }
  };
  const ligneEleve = (fi, principal) => {
    const s = document.createElement('div');
    s.className = 'apSugg';
    const nm = document.createElement('b');
    nm.textContent = fi.eleve;
    const inf = document.createElement('span');
    inf.className = 'apNum';
    inf.textContent = [fi.formation, apNumero(apNumeroDeFiche(fi.telephone))].filter(Boolean).join(' · ');
    const b = document.createElement('button');
    b.className = 'btn ' + (principal ? 'btn-primary' : 'btn-secondary') + ' apBtn';
    b.textContent = 'C’est lui';
    b.addEventListener('click', () => choisir(fi.eleve));
    s.append(document.createTextNode('👤'), nm, inf, b);
    return s;
  };

  const sugg = apSuggestions(a);
  if(sugg.length){
    f.boite.appendChild(apLab('L’appli propose'));
    sugg.forEach((fi, i) => f.boite.appendChild(ligneEleve(fi, i === 0)));
  }
  const champ = document.createElement('input');
  champ.type = 'text';
  champ.inputMode = 'search';
  champ.className = 'apCherche';
  champ.placeholder = '🔎 Chercher un autre élève…';
  champ.style.margin = '6px 0 0';
  const res = document.createElement('div');
  champ.addEventListener('input', () => {
    res.innerHTML = '';
    const q = normaliserApNom(champ.value);
    if(q.length < 2) return;
    const fiches = (typeof fichesEleves !== 'undefined' && Array.isArray(fichesEleves)) ? fichesEleves : [];
    fiches.filter(fi => normaliserApNom(fi.eleve).indexOf(q) !== -1).slice(0, 6).forEach(fi => res.appendChild(ligneEleve(fi, false)));
  });
  f.boite.append(champ, res, cP.l, lib);
  const majLib = () => { lib.style.display = cP.i.checked ? '' : 'none'; };
  cP.i.addEventListener('change', majLib);
  majLib();

  f.boite.appendChild(apLab('Ou bien'));
  const ou = document.createElement('div');
  ou.className = 'apQuand';
  const bPas = document.createElement('button');
  bPas.className = 'btn pastilleVue btn-secondary';
  bPas.textContent = '🏷️ Pas un élève (prospect, organisme…)';
  bPas.addEventListener('click', async () => {
    const t = await demander('Qui est-ce ? (facultatif — ex : Mission locale, un prospect)', a.nomEntendu || '', '🏷️ Pas un élève');
    if(t === null) return;
    try{
      await appelPrep({ action: 'alloRattacher', id: a.id, pasEleve: 1, libelle: String(t || '').trim() });
      f.fermer();
      if($('suiviAppelsZone') && suiviAppelsEC.appels) afficherSuiviAppels(true);
      showToast('Rangé dans « pas un élève » : effacé au bout d’un an.');
    }catch(e){ showToast('Impossible : ' + e.message); }
  });
  const bNv = document.createElement('button');
  bNv.className = 'btn pastilleVue btn-secondary';
  bNv.textContent = '➕ Nouvel élève…';
  bNv.addEventListener('click', async () => {
    if(typeof choisirEleveConnu !== 'function'){ showToast('La création d’élève n’est pas disponible ici.'); return; }
    const entendu = String(a.nomEntendu || '').replace(MOTS_PROCHE_AP, '').trim();
    const nom = await choisirEleveConnu('Créer un élève', 'Vérifie qu’il n’existe pas déjà : les élèves connus sont proposés.', entendu);
    if(!nom) return;
    await choisir(nom);
    if(typeof ouvrirFicheEleve === 'function'){
      const deja = apFiche(nom) || {};
      ouvrirFicheEleve(nom, Object.assign({}, deja, cP.i.checked || deja.telephone ? {} : { telephone: apNumero(a.numero) }));
    }
  });
  ou.append(bPas, bNv);
  f.boite.appendChild(ou);

  const r = document.createElement('div');
  r.className = 'btn-row';
  r.style.marginTop = '14px';
  const bP = document.createElement('button');
  bP.className = 'btn btn-secondary';
  bP.textContent = 'Plus tard';
  bP.addEventListener('click', f.fermer);
  r.appendChild(bP);
  f.boite.appendChild(r);
}

/* ============================================================
   ✉️ ENVOYER — mail, messagerie, Messenger
   ============================================================ */
function apLienMessenger(v){
  const t = String(v || '').trim();
  if(!t) return '';
  if(/^https?:\/\//i.test(t)) return t;
  return 'https://m.me/' + t.replace(/^@/, '').replace(/\s+/g, '');
}

async function ouvrirEnvoyerDepuisAppel(a, canalDepart){
  await apFichesPretes();
  const fi = a.eleve ? (apFiche(a.eleve) || {}) : {};
  const prenom = String(a.eleve || '').split(' ')[0];
  const f = apFenetre('✉️ Envoyer à ' + (a.eleve || a.libelle || apNumero(a.numero)), 580);
  let canal = canalDepart || (fi.email || !a.eleve ? 'mail' : 'messagerie');

  const chips = document.createElement('div');
  chips.className = 'apQuand';
  const bC = {};
  Object.keys(CANAUX_APPEL_EC).forEach(k => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = CANAUX_APPEL_EC[k].emoji + ' ' + CANAUX_APPEL_EC[k].nom;
    b.addEventListener('click', () => { canal = k; maj(); });
    bC[k] = b;
    chips.appendChild(b);
  });
  f.boite.appendChild(chips);

  const dest = document.createElement('div');
  dest.className = 'apDetecte';
  dest.style.marginTop = '10px';
  f.boite.appendChild(dest);
  /* v1269 — l'adresse, modifiable (celle de sa fiche, ou une autre : un parent, un prospect) */
  const lA = apLab('À');
  const aMail = document.createElement('input');
  aMail.type = 'email';
  aMail.className = 'apA';
  aMail.placeholder = 'adresse@exemple.fr';
  aMail.value = fi.email || '';
  aMail.style.margin = '0';
  f.boite.append(lA, aMail);
  const cPres = apCoche('Aussi au prescripteur (' + (fi.mailPrescripteur || '') + ')', false);
  f.boite.appendChild(cPres.l);

  /* Un modèle de « 📄 Ce qu'on écrit et envoie » */
  f.boite.appendChild(apLab('Partir d’un modèle (facultatif)'));
  const sel = document.createElement('select');
  sel.className = 'apModele';
  sel.innerHTML = '<option value="">— texte libre —</option>' + (apResumeEntier(a) ? '<option value="__resume">📄 Le résumé de l’appel</option>' : '');
  f.boite.appendChild(sel);
  if(typeof chargerModelesTexte === 'function'){
    chargerModelesTexte().then(liste => {
      const libres = (liste || []).filter(m => !m.usage || m.usage === 'libre');
      const groupes = {};
      libres.forEach(m => { const g = m.categorie || 'Sans catégorie'; (groupes[g] = groupes[g] || []).push(m); });
      Object.keys(groupes).sort((x, y) => x.localeCompare(y, 'fr')).forEach(g => {
        const og = document.createElement('optgroup');
        og.label = g;
        groupes[g].sort((x, y) => String(x.titre || x.nom).localeCompare(String(y.titre || y.nom), 'fr')).forEach(m => {
          const o = document.createElement('option');
          o.value = m.id;
          o.textContent = m.titre || m.nom;
          og.appendChild(o);
        });
        sel.appendChild(og);
      });
      sel._modeles = libres;
    }).catch(() => {});
  }

  const lSujet = apLab('Objet du mail');
  const sujet = document.createElement('input');
  sujet.type = 'text';
  sujet.value = 'Évolution Conduites';
  sujet.style.margin = '0';
  f.boite.append(lSujet, sujet);
  f.boite.appendChild(apLab('Le message'));
  const texte = document.createElement('textarea');
  texte.rows = 7;
  texte.className = 'apTexte';
  texte.value = prenom ? 'Bonjour ' + prenom + ',\n\n' : '';
  f.boite.appendChild(texte);
  sel.addEventListener('change', () => {
    if(sel.value === '__resume'){
      texte.value = (prenom ? 'Bonjour ' + prenom + ',\n\n' : 'Bonjour,\n\n') + 'Suite à notre appel' + (a.jour ? ' du ' + apJourLong(a.jour) : '') + ' :\n\n' +
        apTexteSimple(apResumeEntier(a)) + '\n\nÉvolution Conduites';
      sujet.value = 'Suite à notre appel';
      return;
    }
    const m = (sel._modeles || []).find(x => String(x.id) === sel.value);
    if(!m) return;
    const date = (typeof dateEnToutesLettres === 'function' && typeof todayLocal === 'function') ? dateEnToutesLettres(todayLocal()) : '';
    texte.value = (typeof appliquerModele === 'function') ? appliquerModele(m.contenu || '', { eleve: a.eleve || '', prenom: prenom, date: date }) : (m.contenu || '');
    sujet.value = m.titre || m.nom || sujet.value;
  });

  const note = document.createElement('div');
  note.className = 'apDit';
  f.boite.appendChild(note);

  const r = document.createElement('div');
  r.className = 'btn-row';
  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', f.fermer);
  /* 📋 v1269 — copier le texte, pour le coller où l'on veut */
  const bC2 = document.createElement('button');
  bC2.className = 'btn btn-secondary apCopier';
  bC2.textContent = '📋 Copier le texte';
  bC2.addEventListener('click', async () => {
    const t = texte.value.trim();
    if(!t){ showToast('Le message est vide.'); return; }
    let ok = false;
    try{ await navigator.clipboard.writeText(t); ok = true; }catch(e){}
    if(!ok){ try{ texte.focus(); texte.select(); ok = document.execCommand('copy'); }catch(e){} }
    showToast(ok ? '📋 Copié : colle-le où tu veux' : 'Sélectionne le texte et copie-le (Ctrl + C)');
  });
  const bE = document.createElement('button');
  bE.className = 'btn btn-primary';
  r.append(bA, bC2, bE);
  f.boite.appendChild(r);

  function maj(){
    Object.keys(bC).forEach(k => bC[k].className = 'btn pastilleVue ' + (k === canal ? 'btn-primary' : 'btn-secondary'));
    const mail = canal === 'mail';
    lSujet.style.display = sujet.style.display = mail ? '' : 'none';
    cPres.l.style.display = (mail && fi.mailPrescripteur) ? '' : 'none';
    lA.style.display = aMail.style.display = mail ? '' : 'none';
    bE.disabled = false;
    if(mail){
      dest.innerHTML = '✉️ Depuis l’adresse de l’auto-école' + (fi.email ? ', à son adresse de fiche (modifiable).' : (a.eleve ? ' : pas d’adresse sur sa fiche, tape-la.' : ' : tape l’adresse.'));
      bE.textContent = '✉️ Envoyer le mail';
    }else if(canal === 'messagerie'){
      dest.innerHTML = a.eleve ? '💬 Dans son fil « <b>Le bureau</b> » de la messagerie, signé de ton nom.'
        : '⚠️ La messagerie est celle de l’espace d’un élève : rattache d’abord cet appel. Tu peux quand même écrire et « 📋 Copier le texte ».';
      bE.disabled = !a.eleve;
      bE.textContent = '💬 Envoyer dans la messagerie';
    }else{
      const lien = apLienMessenger(fi.messenger);
      dest.innerHTML = lien ? 'Ⓜ️ Le texte est copié, puis sa conversation Messenger s’ouvre : <b>colle-le et envoie</b>.'
        : '⚠️ Pas de Messenger sur sa fiche : le texte sera copié, et Messenger s’ouvrira sur ta boîte de réception.';
      bE.textContent = '📋 Copier et ouvrir Messenger';
    }
    note.textContent = 'Ce qui part est gardé dans le suivi de cet appel' + (a.eleve ? ' et dans le dossier de ' + a.eleve : '') + '.';
  }
  maj();

  bE.addEventListener('click', async () => {
    const t = texte.value.trim();
    if(!t){ showToast('Le message est vide.'); return; }
    bE.disabled = true;
    try{
      let a2 = '';
      if(canal === 'messenger'){
        const lien = apLienMessenger(fi.messenger) || 'https://www.facebook.com/messages/';
        try{ await navigator.clipboard.writeText(t); }catch(e){ /* le texte reste à l'écran */ }
        try{ window.open(lien, '_blank', 'noopener'); }catch(e){}
        a2 = lien;
      }
      if(canal === 'mail' && !aMail.value.trim()){ bE.disabled = false; showToast('Tape l’adresse mail.'); aMail.focus(); return; }
      const d = await appelPrep({ action: 'alloEnvoyer', id: a.id, canal: canal, texte: t, sujet: sujet.value.trim(),
                                  prescripteur: cPres.i.checked ? 1 : 0, a: a2, to: canal === 'mail' ? aMail.value.trim() : '' });
      f.fermer();
      apRemplacer(d && d.appel);
      showToast(canal === 'mail' ? 'Mail envoyé ✅' : canal === 'messagerie' ? 'Message envoyé dans la messagerie ✅' : 'Texte copié : colle-le dans Messenger ✅');
    }catch(e){ bE.disabled = false; showToast('Ce n’est pas parti : ' + e.message); }
  });
}

/* ============================================================
   ▶ ÉCOUTER — un lien d'une heure, rien de gardé
   ============================================================ */
async function ecouterAppel(a){
  try{
    const d = await appelPrep({ action: 'alloEcouter', id: a.id });
    const f = apFenetre('▶ ' + (a.eleve || apNumero(a.numero)) + ' — ' + apJourCourt(a.jour) + ' à ' + a.heure, 460);
    const au = document.createElement('audio');
    au.controls = true;
    au.autoplay = true;
    au.src = d.url;
    au.style.width = '100%';
    const n = document.createElement('div');
    n.className = 'apDit';
    n.textContent = 'Le son reste chez Allo : ce lien ne marche qu’une heure.';
    const r = document.createElement('div');
    r.className = 'btn-row';
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.textContent = 'Fermer';
    b.addEventListener('click', () => { try{ au.pause(); }catch(e){} f.fermer(); });
    r.appendChild(b);
    f.boite.append(au, n, r);
  }catch(e){ showToast('Impossible : ' + e.message); }
}

/* ============================================================
   📞 TOUT RAPPELER — la file d'appels d'Allo
   ============================================================ */
async function toutRappelerAvecAllo(bouton){
  const auj = suiviAppelsEC.aujourdhui || apAujourdhui();
  const n = new Set((suiviAppelsEC.appels || []).filter(a => apEnAttente(a) && a.rappelLe <= auj && a.numero).map(a => a.numero)).size;
  if(!await confirmer('Envoyer ' + n + ' numéro' + (n > 1 ? 's' : '') + ' à rappeler (aujourd’hui et en retard) dans la file d’appels d’Allo ?\n\n' +
                      'Ensuite, dans Allo, ouvre le Power Dialer pour les enchaîner.', '📞 Tout rappeler')) return;
  if(bouton) bouton.disabled = true;
  try{
    const d = await appelPrep({ action: 'alloToutRappeler' });
    showToast((d.ajoutes || 0) + ' numéro(s) ajouté(s) dans la file d’appels d’Allo' + (d.ignores ? ' (' + d.ignores + ' refusé(s))' : '') + '.');
  }catch(e){ showToast('Impossible : ' + e.message); }
  if(bouton) bouton.disabled = false;
}

/* ============================================================
   ➕ NOTER UN APPEL PASSÉ D'UN AUTRE TÉLÉPHONE
   ============================================================ */
async function ouvrirNoterUnAppel(eleveImpose){
  await apFichesPretes();
  const f = apFenetre('➕ Noter un appel', 520);
  const info = document.createElement('div');
  info.className = 'apDit';
  info.style.marginTop = '0';
  info.textContent = 'Pour un appel passé ou reçu sur un autre téléphone qu’Allo (un portable personnel) : il rejoint le dossier de l’élève, avec ton nom.';
  f.boite.appendChild(info);

  let eleve = eleveImpose || '';
  f.boite.appendChild(apLab('Élève'));
  const champ = document.createElement('input');
  champ.type = 'text';
  champ.inputMode = 'search';
  champ.className = 'apCherche';
  champ.placeholder = '🔎 Nom de l’élève';
  champ.value = eleve;
  champ.disabled = !!eleveImpose;
  champ.style.margin = '0';
  const res = document.createElement('div');
  champ.addEventListener('input', () => {
    eleve = '';
    res.innerHTML = '';
    const q = normaliserApNom(champ.value);
    if(q.length < 2) return;
    const fiches = (typeof fichesEleves !== 'undefined' && Array.isArray(fichesEleves)) ? fichesEleves : [];
    fiches.filter(fi => normaliserApNom(fi.eleve).indexOf(q) !== -1).slice(0, 6).forEach(fi => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn pastilleVue btn-secondary';
      b.style.margin = '6px 6px 0 0';
      b.textContent = '👤 ' + fi.eleve;
      b.addEventListener('click', () => { eleve = fi.eleve; champ.value = fi.eleve; res.innerHTML = ''; });
      res.appendChild(b);
    });
  });
  f.boite.append(champ, res);

  f.boite.appendChild(apLab('Qui a appelé'));
  const zS = document.createElement('div');
  zS.className = 'apQuand';
  let sens = 'out';
  const bSens = [['out', '↗️ J’ai appelé'], ['in', '↙️ Il / elle a appelé']].map(([k, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.addEventListener('click', () => { sens = k; bSens.forEach(x => x.b.className = 'btn pastilleVue ' + (x.k === sens ? 'btn-primary' : 'btn-secondary')); });
    zS.appendChild(b);
    return { k, b };
  });
  bSens.forEach(x => x.b.className = 'btn pastilleVue ' + (x.k === sens ? 'btn-primary' : 'btn-secondary'));
  f.boite.appendChild(zS);

  const zD = document.createElement('div');
  zD.className = 'apQuand';
  zD.style.marginTop = '8px';
  const jour = document.createElement('input');
  jour.type = 'date';
  jour.value = apAujourdhui();
  const heure = document.createElement('input');
  heure.type = 'time';
  heure.value = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
  [jour, heure].forEach(x => { x.style.margin = '0'; x.style.width = 'auto'; });
  zD.append(jour, heure);
  f.boite.appendChild(zD);

  f.boite.appendChild(apLab('Ce qui s’est passé'));
  const grille = document.createElement('div');
  grille.className = 'apChoix';
  let statut = 'joint';
  const bSt = [['joint', '✅ Je l’ai eu(e)'], ['message', '📩 J’ai laissé un message'], ['repondeur', '📵 Répondeur, rien laissé'], ['pas_reponse', '🔕 Pas de réponse / occupé']].map(([k, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.addEventListener('click', () => { statut = k; bSt.forEach(x => x.b.className = 'btn ' + (x.k === statut ? 'btn-primary' : 'btn-secondary')); });
    grille.appendChild(b);
    return { k, b };
  });
  bSt.forEach(x => x.b.className = 'btn ' + (x.k === statut ? 'btn-primary' : 'btn-secondary'));
  f.boite.appendChild(grille);

  const cR = apCoche('⏰ À rappeler le', false);
  cR.l.querySelector('.apCocheT').style.flex = '0 0 auto';
  const dR = document.createElement('input');
  dR.type = 'date';
  dR.value = apPlusJours(apAujourdhui(), 1);
  dR.style.cssText = 'margin:0 0 0 8px;width:auto;';
  cR.l.appendChild(dR);
  f.boite.appendChild(cR.l);

  f.boite.appendChild(apLab('Depuis quel téléphone'));
  const via = document.createElement('input');
  via.type = 'text';
  via.value = 'portable de ' + apMoi();
  via.style.margin = '0';
  f.boite.appendChild(via);
  f.boite.appendChild(apLab('Une note (facultatif)'));
  const note = document.createElement('input');
  note.type = 'text';
  note.placeholder = 'Ex : d’accord pour décaler la leçon de vendredi à 15 h';
  note.style.margin = '0';
  f.boite.appendChild(note);

  const r = document.createElement('div');
  r.className = 'btn-row';
  r.style.marginTop = '14px';
  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', f.fermer);
  const bE = document.createElement('button');
  bE.className = 'btn btn-primary';
  bE.textContent = '💾 Enregistrer';
  bE.addEventListener('click', async () => {
    if(!eleve){ showToast('Choisis l’élève dans la liste.'); return; }
    bE.disabled = true;
    try{
      const d = await appelPrep({ action: 'alloNoter', eleve: eleve, sens: sens, jour: jour.value, heure: heure.value, statut: statut,
                                  rappel: cR.i.checked ? dR.value : '', via: via.value.trim(), note: note.value.trim() });
      f.fermer();
      apRemplacer(d && d.appel);
      showToast('Appel noté dans le dossier de ' + eleve + ' ✅');
    }catch(e){ bE.disabled = false; showToast('Impossible : ' + e.message); }
  });
  r.append(bA, bE);
  f.boite.appendChild(r);
}

/* ============================================================
   👤 L'ONGLET 📞 APPELS DU DOSSIER
   ============================================================ */
const apDossierEC = { eleve: '', appels: null, proches: [], filtre: 'tous', corps: null };

async function ongletAppelsEleve(corps, nom){
  apDossierEC.corps = corps;
  if(apDossierEC.eleve !== nom){ apDossierEC.eleve = nom; apDossierEC.appels = null; apDossierEC.filtre = 'tous'; }
  corps.innerHTML = '<div class="empty">Chargement des appels…</div>';
  try{
    const d = await appelPrep({ action: 'alloLire', eleve: nom });
    if(apDossierEC.eleve !== nom) return;
    apDossierEC.appels = (d && d.appels) || [];
    apDossierEC.proches = (d && d.proches) || [];
    if(d && d.peutEcouter) suiviAppelsEC.peutEcouter = true;
  }catch(e){
    corps.innerHTML = '<div class="empty">Impossible de lire ses appels : ' + apEsc(e.message || e) + '</div>';
    return;
  }
  dessinerAppelsDuDossier();
}

function dessinerAppelsDuDossier(){
  const corps = apDossierEC.corps;
  if(!corps || !apDossierEC.appels) return;
  const tous = apDossierEC.appels;
  corps.innerHTML = '';
  const barre = document.createElement('div');
  barre.className = 'apBarre';
  barre.style.justifyContent = 'space-between';
  const filtres = document.createElement('div');
  filtres.className = 'apFiltres';
  filtres.style.margin = '0';
  [['tous', 'Tous'], ['rappel', '⏰ À rappeler'], ['joint', '✅'], ['message', '📩'], ['repondeur', '📵'], ['pas_reponse', '🔕'],
   ['manque', '📲'], ['mail', '✉️'], ['ia', '🤖'], ['sms', '💬']].forEach(([f, t]) => {
    const n = tous.filter(a => apCorrespond(a, f)).length;
    if(f !== 'tous' && !n) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn pastilleVue ' + (apDossierEC.filtre === f ? 'btn-primary' : 'btn-secondary');
    b.textContent = t + ' · ' + n;
    b.addEventListener('click', () => { apDossierEC.filtre = f; dessinerAppelsDuDossier(); });
    filtres.appendChild(b);
  });
  barre.appendChild(filtres);
  if(typeof aDroit === 'function' && aDroit('appels')){
    const bN = document.createElement('button');
    bN.className = 'btn btn-secondary apBtn';
    bN.textContent = '➕ Noter un appel passé d’un autre téléphone';
    bN.addEventListener('click', () => ouvrirNoterUnAppel(apDossierEC.eleve));
    barre.appendChild(bN);
  }
  corps.appendChild(barre);

  /* Les numéros de ses proches, gardés pour ranger leurs appels */
  if(apDossierEC.proches.length){
    const p = document.createElement('div');
    p.className = 'apProches';
    p.appendChild(document.createTextNode('📞 Autres numéros : '));
    apDossierEC.proches.forEach(x => {
      const s = document.createElement('span');
      s.className = 'apSt';
      s.textContent = '👪 ' + (x.libelle || 'un proche') + ' · ' + apNumero(x.numero);
      if(apPeutTout()){
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'apRetirer';
        b.textContent = '✕';
        b.title = 'Ne plus ranger ses appels ici';
        b.addEventListener('click', async () => {
          if(!await confirmer('Ne plus ranger les appels du ' + apNumero(x.numero) + ' dans ce dossier ?\n\nLes appels déjà rangés restent.', 'Retirer ce numéro')) return;
          try{ await appelPrep({ action: 'alloNumeroRetirer', numero: x.numero }); apDossierEC.proches = apDossierEC.proches.filter(y => y.numero !== x.numero); dessinerAppelsDuDossier(); }
          catch(e){ showToast('Impossible : ' + e.message); }
        });
        s.appendChild(b);
      }
      p.appendChild(s);
    });
    corps.appendChild(p);
  }

  const liste = tous.filter(a => apCorrespond(a, apDossierEC.filtre));
  if(!liste.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = tous.length ? 'Aucun appel pour ce filtre.' : 'Aucun appel pour le moment.';
    corps.appendChild(v);
    return;
  }
  let mois = null;
  const auj = apAujourdhui();
  liste.forEach(a => {
    const m = String(a.jour || '').slice(0, 7);
    if(m !== mois){
      mois = m;
      const t = document.createElement('div');
      t.className = 'apJour';
      t.textContent = apMois(a.jour);
      corps.appendChild(t);
    }
    corps.appendChild(ligneAppelEC(a, { dossier: true, auj: auj }));
  });
}

/* ============================================================
   🔔 LE BANDEAU — « ⏰ N personnes à rappeler » (bureau)
   ============================================================ */
async function chargerARappeler(){
  if(!(typeof ACCES !== 'undefined' && ACCES && ACCES.code) || !apPeutTout()) return;
  try{
    const d = await appelPrep({ action: 'alloARappeler' });
    aRappelerEC = { appels: (d && d.appels) || [], aujourdhui: (d && d.aujourdhui) || apAujourdhui(), lu: true };
  }catch(e){ return; }
  if(typeof dessinerBandeau === 'function') try{ dessinerBandeau(); }catch(e){}
}

function lignesAppelsARappeler(){
  if(!aRappelerEC.lu || !apPeutTout()) return [];
  const auj = aRappelerEC.aujourdhui || apAujourdhui();
  const dus = (aRappelerEC.appels || []).filter(a => apEnAttente(a) && a.rappelLe <= auj);
  if(!dus.length) return [];
  /* Une personne, une fois : trois répondeurs chez Léa font un rappel. */
  const vus = {};
  const noms = [];
  let enRetard = 0;
  dus.forEach(a => {
    const k = a.numero || a.eleve || a.id;
    if(vus[k]) return;
    vus[k] = 1;
    noms.push(a.eleve || a.libelle || apNumero(a.numero) || 'Numéro masqué');
    if(a.rappelLe < auj) enRetard++;
  });
  const n = noms.length;
  return [{
    id: 'appels:arappeler:' + auj + ':' + n,
    famille: 'appels',
    emoji: '⏰',
    texte: n + (n > 1 ? ' personnes à rappeler' : ' personne à rappeler'),
    sous: noms.slice(0, 6).join(' · ') + (n > 6 ? ' · …' : '') + (enRetard ? ' — dont ' + enRetard + ' en retard' : ''),
    urgente: false,
    groupe: 'auj',
    action: () => {
      suiviAppelsEC.filtre = 'rappel';
      try{ afficherOnglet('eleves'); afficherVue('eleves', 'appels'); }catch(e){}
    },
    actionTexte: 'Voir'
  }];
}

/* 🕘 v1275 — l'écran ouvert se relit tout seul, toutes les 2 minutes
   (jamais pendant qu'on écrit ou qu'une fenêtre est ouverte) */
function apRelireSiVisible(forcer){
  const zone = $('suiviAppelsZone');
  if(!zone || !zone.offsetParent || document.hidden || !suiviAppelsEC.appels) return;
  if(document.querySelector('.apModal')) return;
  const f = document.activeElement;
  if(f && zone.contains(f) && /^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName)) return;
  if(!forcer && Date.now() - Number(suiviAppelsEC.lu || 0) < 2 * 60000) return;
  const y = window.scrollY;
  afficherSuiviAppels(true).then(() => { try{ window.scrollTo(0, y); }catch(e){} });
}
setInterval(() => apRelireSiVisible(false), 30000);
document.addEventListener('visibilitychange', () => { if(!document.hidden) apRelireSiVisible(false); });

/* Au démarrage, puis toutes les 5 minutes (le rythme de la relecture d'Allo) */
(function(){
  let n = 0;
  const essayer = () => {
    if(typeof ACCES !== 'undefined' && ACCES && ACCES.code){ chargerARappeler(); return; }
    if(++n < 240) setTimeout(essayer, 1000);
  };
  setTimeout(essayer, 3500);
  setInterval(() => { if(typeof ACCES !== 'undefined' && ACCES && ACCES.code) chargerARappeler(); }, 5 * 60000);
})();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-suivi-appels.js'] = true;
