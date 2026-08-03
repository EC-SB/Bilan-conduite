/* ============================================================
   ec-bureau.js
   Lecture des notes, état du suivi, ligne d'élève, actualisation.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   ec-bureau.js
   Suivi bureau : listes, places d'examen, repassages
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   LISTES BUREAU
   Lecture de l'état de tous les élèves, et consignes du bureau
   qui remontent au moniteur lors de la prochaine leçon.
   ============================================================ */
/* etatBureau : déclaré dans ec-etat.js */

/* Décode les phrases produites par le questionnaire */
function analyserNote(note){
  /* Les téléphones remplacent l'apostrophe droite par une typographique :
     sans cette normalisation, les repères du bilan ne sont plus reconnus. */
  const t = String(note || '')
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u00A0\u202F\u2007]/g, ' ');
  const r = { repassages:null, dateAjournement:null,
              ebSuite:null, ebDate:null, ebLecons:null,
              examBlanc:null, examBlancN:null, examBlancDate:null,
              simuNuit:null, simuDate:null, permis:null,
              permisDate:null, permisN:null, lecon:null, leconTotal:null,
              friseDepassee:false, finirFiche:false };
  let m;

  if((m = t.match(/Examen blanc passé le ([^—·]+)— pas le niveau/i))){
    r.examBlanc = 'passe';
    r.ebSuite = 'pasleniveau';
    r.ebDate = m[1].trim();
  }
  else if((m = t.match(/Examen blanc passé le ([^—·]+)— plus que les 3h/i))){
    r.examBlanc = 'passe';
    r.ebSuite = '3h';
    r.ebDate = m[1].trim();
  }
  else if((m = t.match(/Examen blanc passé le ([^—·]+)— encore (\d+) leçon/i))){
    r.examBlanc = 'passe';
    r.ebSuite = 'lecons';
    r.ebDate = m[1].trim();
    r.ebLecons = +m[2];
  }
  else if(/Ne pas prévoir d'examen blanc/i.test(t)) r.examBlanc = 'impossible';
  else if(/Examen blanc passé/i.test(t)) r.examBlanc = 'passe';
  else if((m = t.match(/Examen blanc fixé au ([^—·(]+)/i))){
    r.examBlanc = 'reserve';
    r.examBlancDate = m[1].trim();
  }
  else if((m = t.match(/Examen blanc réservé dans (\d+)/i))){ r.examBlanc='reserve'; r.examBlancN=+m[1]; }
  else if(/La prochaine leçon, c'est l'examen blanc/i.test(t)){ r.examBlanc='reserve'; r.examBlancN=0; }
  else if(/Examen blanc réservé/i.test(t)) r.examBlanc = 'reserve';
  else if((m = t.match(/Examen blanc à prévoir dans (\d+)/i))){ r.examBlanc='aprevoir'; r.examBlancN=+m[1]; }
  else if(/Examen blanc à prévoir dès la prochaine/i.test(t)){ r.examBlanc='aprevoir'; r.examBlancN=0; }
  else if(/Examen blanc à prévoir/i.test(t)) r.examBlanc = 'aprevoir';

  if((m = t.match(/Simulateur nuit et risques fixé au ([^—·(]+)/i))){
    r.simuNuit = 'prevu';
    r.simuDate = m[1].trim();
  }
  else if(/Simulateur nuit et risques fait/i.test(t)) r.simuNuit = 'fait';
  else if(/Simulateur nuit et risques déjà prévu/i.test(t)) r.simuNuit = 'prevu';
  else if(/Simulateur nuit et risques à prévoir/i.test(t)) r.simuNuit = 'aprevoir';

  /* Examen blanc réussi : la date de permis est à prendre */
  if(r.ebSuite === '3h' && !/Examen (du permis )?(prévu|fixé)/i.test(t)) r.permis = 'aprevoir';

  /* L'annulation prime sur toute date déjà annoncée */
  if(/annulé/i.test(t) && /permis|examen/i.test(t)) r.permis = 'annule';
  else if((m = t.match(/Examen du permis fixé au ([^—·(]+)/i))){
    r.permis = 'prevu';
    r.permisDate = m[1].trim();
  }
  else if(/(date d'examen|examen(?: du permis)?)\s*(?:est\s*)?à pr[ée]voir/i.test(t)) r.permis = 'aprevoir';
  else if((m = t.match(/Examen prévu le ([^—·]+)/i))){ r.permis='prevu'; r.permisDate=m[1].trim(); }
  if(r.permis === 'annule') r.permisDate = null;
  if((m = t.match(/Examen prévu le [^—·]+— encore (\d+) leçon/i))) r.permisN = +m[1];

  if((m = t.match(/(\d+)(?:ère|ème) leçon sur (\d+)/i))){ r.lecon=+m[1]; r.leconTotal=+m[2]; }
  else if((m = t.match(/(\d+)(?:ère|ème) leçon/i))) r.lecon = +m[1];
  if(/frise dépassée/i.test(t)) r.friseDepassee = true;
  if((m = t.match(/(\d+)(?:er|e) repassage/i))) r.repassages = +m[1];
  if((m = t.match(/[Aa]journé le ([^—·(]+)/))) r.dateAjournement = m[1].trim();
  if(/Finir Fiche/i.test(t)) r.finirFiche = true;
  return r;
}

const URGENCES = [
  { v:'', l:'— normal —', c:'var(--muted)' },
  { v:'1', l:'🟢 Peut attendre', c:'var(--muted)' },
  { v:'2', l:'🟡 À planifier', c:'var(--accent-text)' },
  { v:'3', l:'🟠 Assez pressé', c:'#E8A33D' },
  { v:'4', l:'🔴 Urgent', c:'var(--red)' },
  { v:'5', l:'🚨 Prioritaire absolu', c:'var(--red)' }
];

function libelleUrgence(v){
  const u = URGENCES.find(x => x.v === String(v || ''));
  return u || URGENCES[0];
}

async function chargerBureau(forcer){
  let data;
  if(!forcer && cacheBureau && Date.now() - cacheBureau.ts < 30000){
    data = cacheBureau.data;
  }else{
    data = await appelPrep({ action: 'bureauEtat' });
    cacheBureau = { ts: Date.now(), data: data };
  }
  const eleves = (data && data.eleves) || [];
  const consignes = (data && data.consignes) || [];

  etatBureau.consignes = consignes;
  etatBureau.suivi = (data && data.suivi) || [];
  chargerPlaces(data && data.places);
  /* Les périodes terminées sortent d'elles-mêmes */
  if(nettoyerPeriodesEchues()){
    try{ await enregistrerPlaces(); }catch(e){}
  }
  /* Un élève peut n'exister que par une consigne du bureau */
  const connus = eleves.map(x => normaliserMot(x.eleve));
  consignes.forEach(cs => {
    if(cs.traite === 'oui' || cs.type === 'urgence') return;
    const k = normaliserMot(cs.eleve);
    if(!k || connus.indexOf(k) !== -1) return;
    connus.push(k);
    eleves.push({ eleve: cs.eleve, note: '', date: cs.creeLe || '', type: '',
                  horodatage: '', moniteur: '', boite: '', ants: '', lecons: 0 });
  });

  etatBureau.eleves = eleves.map(e => {
    const enAttente = consignes.filter(cs =>
      normaliserMot(cs.eleve) === normaliserMot(e.eleve) &&
      cs.traite !== 'oui' && cs.type !== 'urgence');

    /* Une consigne du bureau non traitée prime sur la note du moniteur */
    const a = analyserNote(e.note);
    if(enAttente.length){
      const ajout = analyserNote(enAttente.map(x => x.texte).join(' · '));
      Object.keys(ajout).forEach(k => {
        if(ajout[k] !== null && ajout[k] !== false) a[k] = ajout[k];
      });
    }
    const urg = consignes.find(cs =>
      normaliserMot(cs.eleve) === normaliserMot(e.eleve) && cs.type === 'urgence');
    return Object.assign({}, e, {
      etat: a,
      enAttente: enAttente,
      urgence: urg ? urg.valeur : ''
    });
  });
  return etatBureau;
}

/* Enregistre une consigne : elle sera injectée dans la note du prochain cours */
async function envoyerConsigne(eleve, type, texte, valeur){
  cacheBureau = null;
  await appelPrep({
    action: 'consigneAdd',
    eleve: eleve, type: type, texte: texte, valeur: valeur || '',
    par: ACCES.moniteur || ''
  });
}




/* Fiche de suivi d'un élève, ou objet vide */
function suiviDe(eleve){
  return etatBureau.suivi.find(x => normaliserMot(x.eleve) === normaliserMot(eleve)) || {};
}

/* Met à jour quelques champs sans écraser le reste */
async function majSuivi(eleve, champs){
  cacheBureau = null;
  const s = suiviDe(eleve);
  await appelPrep(Object.assign({ action:'suiviSet' }, s, champs, {
    eleve: eleve, par: ACCES.moniteur || ''
  }));
}

/* Fiche de préparation administrative d'un passage au permis */
function ligneBureau(e, options){
  const row = document.createElement('div');
  row.className = 'history-item';

  /* Un repassage se repère d'un coup d'œil */
  const sv = suiviDe(e.eleve);
  if(sv.nbAjournements){
    row.classList.add('repassage');
  }
  row.style.flexDirection = 'column';
  row.style.alignItems = 'stretch';

  const haut = document.createElement('div');
  haut.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:8px;';

  const meta = document.createElement('div');
  meta.className = 'meta';
  const nom = document.createElement('strong');
  nom.textContent = e.eleve;
  meta.appendChild(nom);

  const info = document.createElement('span');
  info.textContent = options.info(e);
  meta.appendChild(info);

  const sous = document.createElement('span');
  sous.textContent = 'Dernier cours le ' + (e.date || '?') +
                     (e.moniteur ? ' avec ' + e.moniteur : '');
  meta.appendChild(sous);

  if(e.enAttente.length){
    const att = document.createElement('span');
    att.style.color = 'var(--accent-text)';
    att.textContent = '📨 ' + e.enAttente.map(x => x.texte).join(' · ') +
                      ' (transmis au prochain cours)';
    meta.appendChild(att);
  }
  haut.appendChild(meta);

  if(options.alerte && options.alerte(e)){
    const a = document.createElement('div');
    a.style.cssText = 'font-size:22px;flex-shrink:0;';
    a.textContent = '⚠️';
    a.title = options.alerte(e);
    haut.appendChild(a);
  }
  row.appendChild(haut);

  if(options.resume){
    const r = options.resume(e);
    if(r){
      const rr = document.createElement('span');
      rr.style.cssText = 'display:block;font-size:12px;color:var(--muted);line-height:1.5;margin-top:4px;';
      rr.textContent = r;
      meta.appendChild(rr);
    }
  }

  const actions = document.createElement('div');
  actions.style.cssText = 'margin-top:10px;';
  options.actions(e, actions);

  /* Les listes longues se replient : l'essentiel reste visible,
     les actions ne s'ouvrent qu'à la demande. */
  if(options.replier){
    const det = document.createElement('details');
    det.style.cssText = 'margin-top:6px;';
    const som = document.createElement('summary');
    som.style.cssText = 'cursor:pointer;font-size:13px;font-weight:600;' +
      'color:var(--accent-text);padding:4px 0;list-style:none;';
    som.textContent = '▸ Ouvrir la fiche';
    det.appendChild(som);
    det.appendChild(actions);
    det.addEventListener('toggle', () => {
      som.textContent = det.open ? '▾ Refermer' : '▸ Ouvrir la fiche';
    });
    row.appendChild(det);
  }else{
    row.appendChild(actions);
  }

  return row;
}

/* Bouton + calendrier pour fixer une date depuis le bureau */
function boutonDate(libelle, onChoisi){
  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;';
  b.textContent = libelle;
  b.addEventListener('click', async () => {
    const iso = await choisirDate(libelle);
    if(!iso) return;
    b.disabled = true;
    b.textContent = 'Enregistrement…';
    try{
      await onChoisi(iso);
    }finally{
      b.disabled = false;
      b.textContent = libelle;
    }
  });
  return b;
}

/* ============================================================
   AFFICHAGE DU SUIVI BUREAU
   Chaque liste a sa fonction : on peut en modifier une sans
   toucher aux autres.
   ============================================================ */
async function afficherBureau(silencieux){
  const zEB = $('listeExamBlanc');
  const zSim = $('listeSimu');
  const zPer = $('listePermis');
  if(!zEB) return;

  /* Les deux tiroirs ont leur bouton : on les anime tous les deux,
     sinon on croit que celui du permis ne répond pas. */
  const boutons = [$('bureauBtn'), $('permisBureauBtn')].filter(Boolean);
  const majBoutons = (t, off) => boutons.forEach(b => {
    b.textContent = t;
    b.disabled = !!off;
  });

  if(silencieux){
    majBoutons('🔄 Actualisation…', false);
  }else{
    majBoutons('🔄 Chargement…', true);
    const attente = '<div class="empty">Chargement du suivi…<br>' +
      '<span style="font-size:12px;">Le premier chargement prend quelques secondes.</span></div>';
    /* Le message s'affiche dans le tiroir réellement ouvert */
    if(tiroirOuvert('permisbureau')) zPer.innerHTML = attente;
    else zSim.innerHTML = attente;
    if(!tiroirOuvert('permisbureau')) zEB.innerHTML = '';
  }

  try{
    await chargerBureau(!silencieux);
    bureauDejaCharge = true;
  }catch(e){
    majBoutons('🔄 Actualiser les listes', false);
    if(!silencieux){
      afficherErreurBureau(tiroirOuvert('permisbureau') ? zPer : zSim, e);
    }
    return;
  }
  majBoutons('🔄 Actualiser les listes', false);

  const tous = etatBureau.eleves;

  /* Chaque liste se construit à part */
  afficherExamensBlancs(tous);
  afficherSimulateurs(tous);
  afficherRdvPermis(tous);
  const prevus = afficherPermisPrevus(tous);
  await afficherPostExamenDepuisPrevus(tous, prevus);
  afficherExamensPermis(tous);
}

/* Message d'erreur, avec la possibilité de réessayer */
function afficherErreurBureau(zone, e){
  zone.innerHTML = '';
  const err = document.createElement('div');
  err.className = 'empty';
  err.innerHTML = '⚠️ ' + e.message.replace(/</g, '&lt;') + '<br>';
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'margin-top:10px;width:auto;padding:10px 16px;';
  b.textContent = '🔄 Réessayer';
  b.addEventListener('click', () => afficherBureau());
  err.appendChild(b);
  zone.appendChild(err);
}


/* Examens blancs à prévoir */
async function envoyerMessageBureau(){
  const eleve = $('msgEleve').value.trim();
  const texte = $('msgTexte').value.trim();
  const etat = $('msgEtat');

  if(eleve.length < 2){ etat.style.color='var(--warn-text)'; etat.textContent="Saisis le nom de l'élève."; return; }
  if(!texte){ etat.style.color='var(--warn-text)'; etat.textContent='Saisis un message.'; return; }

  const btn = $('msgBtn');
  btn.disabled = true;
  btn.textContent = 'Envoi…';
  try{
    await envoyerConsigne(eleve, 'message', texte);
    etat.style.color = 'var(--accent-text)';
    etat.textContent = '✅ Message enregistré pour ' + eleve +
                       ' — il le verra au prochain cours.';
    $('msgTexte').value = '';
    await afficherConsignesEnAttente();
  }catch(e){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = 'Erreur : ' + e.message;
  }finally{
    btn.disabled = false;
    btn.textContent = '📨 Envoyer au moniteur';
  }
}

/* Messages déjà envoyés mais pas encore lus par un moniteur */
async function afficherConsignesEnAttente(){
  const zone = $('listeConsignes');
  if(!zone) return;
  try{
    const data = await appelPrep({ action: 'consigneList' });
    const liste = ((data && data.consignes) || [])
      .filter(x => x.traite !== 'oui' && x.type !== 'urgence');

    if($('nbConsignes')) $('nbConsignes').textContent = '(' + liste.length + ')';
    majCompteur('cptMessages', liste.length);
    if(!liste.length){
      zone.innerHTML = '<div class="empty">Aucun message en attente.</div>';
      return;
    }
    zone.innerHTML = '';
    liste.forEach(cs => {
      const row = document.createElement('div');
      row.className = 'history-item';
      const meta = document.createElement('div');
      meta.className = 'meta';
      const nom = document.createElement('strong');
      nom.textContent = cs.eleve;
      const t = document.createElement('span');
      t.style.cssText = 'color:var(--accent-text);white-space:pre-wrap;';
      t.textContent = '📨 ' + cs.texte;
      const d = document.createElement('span');
      d.textContent = 'Envoyé le ' + cs.creeLe + (cs.par ? ' par ' + cs.par : '');
      meta.appendChild(nom); meta.appendChild(t); meta.appendChild(d);
      row.appendChild(meta);

      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:auto;padding:9px 10px;font-size:13px;color:var(--red);border-color:var(--red);flex-shrink:0;';
      b.textContent = '✕';
      b.title = 'Annuler ce message';
      b.addEventListener('click', async () => {
        if(!await confirmer('Annuler ce message ?')) return;
        b.disabled = true;
        try{
          await appelPrep({ action: 'consigneDone', id: cs.id });
          afficherConsignesEnAttente();
        }catch(e){ showToast('Erreur : ' + e.message); b.disabled = false; }
      });
      row.appendChild(b);
      zone.appendChild(row);
    });
  }catch(e){
    zone.innerHTML = '<div class="empty">Erreur : ' + e.message + '</div>';
  }
}


/* Ajout manuel d'une date depuis le bureau, hors des listes */
async function ajouterDateBureau(){
  const eleve = $('addEleve').value.trim();
  const type = $('addType').value;
  const situation = $('addEtat').value;
  const iso = $('addDate').value;
  const nLecons = $('addLecons').value.trim();
  const etat = $('addEtatMsg');

  if(eleve.length < 2){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = "Saisis le nom de l'élève.";
    return;
  }
  if(situation === 'date' && !iso){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = 'Choisis une date ou passe en « à prévoir ».';
    return;
  }

  const suite = nLecons
    ? ' — encore ' + nLecons + ' leçon' + (parseInt(nLecons, 10) > 1 ? 's' : '')
    : '';

  let texte;
  if(situation === 'date'){
    const quand = dateEnToutesLettres(iso);
    if(type === 'permis') texte = 'Examen du permis fixé au ' + quand + suite + ' avant (bureau)';
    else if(type === 'examblanc') texte = 'Examen blanc fixé au ' + quand + suite + ' avant (bureau)';
    else texte = 'Simulateur nuit et risques fixé au ' + quand + ' (bureau)';
  }else{
    if(type === 'permis'){
      texte = "Date d'examen à prévoir" + (suite ? ' (' + suite.replace(' — ', '') + ')' : '') + ' (bureau)';
    }else if(type === 'examblanc'){
      texte = 'Examen blanc à prévoir' +
              (nLecons ? ' dans ' + nLecons + ' leçon' + (parseInt(nLecons,10) > 1 ? 's' : '') : '') +
              ' (bureau)';
    }else{
      texte = 'Simulateur nuit et risques à prévoir (bureau)';
    }
  }

  const btn = $('addBtn');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';
  try{
    await envoyerConsigne(eleve, type, texte);
    etat.style.color = 'var(--accent-text)';
    etat.textContent = '✅ ' + texte;
    $('addLecons').value = '';
    await afficherConsignesEnAttente();
    await afficherBureau();
  }catch(e){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = 'Erreur : ' + e.message;
  }finally{
    btn.disabled = false;
    btn.textContent = '📅 Enregistrer la date';
  }
}

/* ============================================================
   ACTUALISATION AUTOMATIQUE
   Le suivi bureau et les cours préparés changent sans qu'on le
   sache : d'autres personnes les modifient. On rafraîchit seul.
   ============================================================ */

/* On ne rafraîchit jamais pendant une saisie : ce serait perdre le travail */
function bureauOccupe(){
  const a = document.activeElement;
  if(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName || '')) return true;
  if(document.querySelector('.overlay.show')) return true;
  const ouverts = document.querySelectorAll('[data-tiroir] details[open]');
  for(let i = 0; i < ouverts.length; i++){
    if(ouverts[i].querySelector('input, textarea, select')) return true;
  }
  return false;
}

function tiroirOuvert(cle){
  const d = document.querySelector('[data-tiroir="' + cle + '"]');
  return !!(d && d.open && d.style.display !== 'none');
}

function lancerActualisationAuto(){
  clearInterval(minuteurBureau);
  minuteurBureau = setInterval(() => {
    if(!ACCES.code) return;
    if(bureauOccupe()) return;

    /* Les cours préparés : d'autres moniteurs en ajoutent */
    if(tiroirOuvert('prepares') && aDroit('cours')) afficherPrepares(true, true);

    /* Les deux tiroirs de suivi se rafraîchissent d'eux-mêmes */
    if((tiroirOuvert('bureau') || tiroirOuvert('permisbureau')) && bureauDejaCharge){
      afficherBureau(true);
    }

    if(tiroirOuvert('messages')) afficherConsignesEnAttente();
  }, 90000);   /* toutes les 90 secondes */
}

/* Au retour du réseau, on relance ce qui avait échoué */
let reseauEcoute = false;
function ecouterReseau(){
  if(reseauEcoute) return;
  reseauEcoute = true;
  window.addEventListener('online', () => {
    showToast('Connexion rétablie');
    viderCaches();
    if(aDroit('cours')) afficherPrepares(true, true);
    /* Les deux tiroirs de suivi se rafraîchissent d'eux-mêmes */
    if((tiroirOuvert('bureau') || tiroirOuvert('permisbureau')) && bureauDejaCharge){
      afficherBureau(true);
    }
    chargerEleves();
  });
}

/* Une fois la date fixée, on attribue l'examen blanc à un moniteur
   et on lui prépare sa fiche automatiquement. */

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-bureau.js'] = true;
