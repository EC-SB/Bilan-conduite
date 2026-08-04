/* ============================================================
   ec-fenetres.js
   Cache et fenêtres de dialogue
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   CACHE
   Apps Script met plusieurs secondes à répondre. On garde les
   résultats un court instant plutôt que de le réinterroger.
   ============================================================ */
const cacheDossiers = {};      /* par élève */
/* cacheBureau : déclaré dans ec-etat.js */
const DUREE_CACHE = 60000;     /* 1 minute */

function lireCacheDossier(nom){
  const k = normaliserMot(nom);
  const e = cacheDossiers[k];
  if(e && Date.now() - e.ts < DUREE_CACHE) return e.data;
  return null;
}
function ecrireCacheDossier(nom, data){
  cacheDossiers[normaliserMot(nom)] = { ts: Date.now(), data: data };
}
function viderCaches(nom){
  if(nom) delete cacheDossiers[normaliserMot(nom)];
  else Object.keys(cacheDossiers).forEach(k => delete cacheDossiers[k]);
  cacheBureau = null;
}


/* ============================================================
   FENÊTRES DE DIALOGUE
   Chrome propose de bloquer les boîtes natives après plusieurs
   affichages : confirm() renvoie alors « non » sans rien montrer.
   On utilise donc nos propres fenêtres.
   ============================================================ */
function fenetre(contenu, boutons, titre){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.maxWidth = 'min(420px, 92vw)';

    if(titre){
      const h = document.createElement('h3');
      h.textContent = titre;
      boite.appendChild(h);
    }
    const t = document.createElement('div');
    t.style.cssText = 'font-size:15px;line-height:1.6;white-space:pre-wrap;margin-bottom:16px;';
    t.textContent = contenu;
    boite.appendChild(t);

    const zone = document.createElement('div');
    boite.appendChild(zone);

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';
    boutons.forEach(b => {
      const el = document.createElement('button');
      el.className = 'btn ' + (b.principal ? 'btn-primary' : 'btn-secondary');
      if(b.danger) el.style.cssText = 'color:var(--red);border-color:var(--red);';
      el.textContent = b.nom;
      el.addEventListener('click', () => {
        const saisie = zone.querySelector('input');
        document.body.removeChild(fond);
        resolve(b.valeur !== undefined ? b.valeur : (saisie ? saisie.value : true));
      });
      rangee.appendChild(el);
    });
    boite.appendChild(rangee);
    fond.appendChild(boite);
    document.body.appendChild(fond);
    return zone;
  });
}

/* Remplace confirm() */
function confirmer(message, titre, danger){
  return fenetre(message, [
    { nom:'Annuler', valeur:false },
    { nom:'Confirmer', valeur:true, principal:!danger, danger:danger }
  ], titre || 'Confirmation');
}

/* Remplace prompt() */
function demander(message, valeurParDefaut, titre){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.maxWidth = 'min(420px, 92vw)';

    const h = document.createElement('h3');
    h.textContent = titre || 'Saisie';
    boite.appendChild(h);

    const t = document.createElement('div');
    t.style.cssText = 'font-size:15px;line-height:1.6;white-space:pre-wrap;margin-bottom:12px;';
    t.textContent = message;
    boite.appendChild(t);

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = valeurParDefaut || '';
    boite.appendChild(inp);

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';
    const a = document.createElement('button');
    a.className = 'btn btn-secondary';
    a.textContent = 'Annuler';
    const v = document.createElement('button');
    v.className = 'btn btn-primary';
    v.textContent = 'Valider';
    rangee.appendChild(a); rangee.appendChild(v);
    boite.appendChild(rangee);
    fond.appendChild(boite);
    document.body.appendChild(fond);

    const fermer = val => { document.body.removeChild(fond); resolve(val); };
    a.addEventListener('click', () => fermer(null));
    v.addEventListener('click', () => fermer(inp.value));
    inp.addEventListener('keydown', e => { if(e.key === 'Enter') fermer(inp.value); });
    setTimeout(() => inp.focus(), 60);
  });
}

/* Remplace alert() */
function informer(message, titre){
  return fenetre(message, [{ nom:'OK', valeur:true, principal:true }], titre || 'Information');
}

/* ---------- Liste des élèves déjà enregistrés ---------- */
/* elevesConnus : déclaré dans ec-etat.js */

async function chargerEleves(){
  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'eleves', code: ACCES.code })
    });
    if(!r.ok) return;
    const data = await r.json().catch(() => ({}));
    elevesConnus = (data && data.eleves) || [];

    const liste = $('listeEleves');
    if(liste){
      liste.innerHTML = '';
      elevesConnus.forEach(nom => {
        const o = document.createElement('option');
        o.value = nom;
        liste.appendChild(o);
      });
    }
    verifierNomEleve('searchName', 'eleveInfo', false);
    verifierNomEleve('studentName', 'studentInfo', true);
  }catch(e){
    console.warn('Liste des élèves indisponible :', e);
  }
}

/* Prévient quand un nom saisi ne correspond à aucun élève connu :
   c'est presque toujours une variante d'orthographe. */
function verifierNomEleve(idChamp, idInfo, contexteCours){
  const info = $(idInfo);
  const champ = $(idChamp);
  if(!info || !champ) return;

  const saisi = champ.value.trim();
  if(!saisi || !elevesConnus.length){
    info.style.color = 'var(--muted)';
    info.textContent = elevesConnus.length
      ? elevesConnus.length + ' élève(s) enregistré(s) — appuie sur le champ pour voir la liste.'
      : 'Aucun élève enregistré pour le moment.';
    return;
  }

  const cle = normaliserMot(saisi);
  if(elevesConnus.some(n => normaliserMot(n) === cle)){
    info.style.color = 'var(--accent-text)';
    info.textContent = '✓ Élève connu';
    return;
  }

  const proches = elevesConnus.filter(n => normaliserMot(n).indexOf(cle) !== -1).slice(0, 3);
  if(proches.length){
    info.style.color = 'var(--warn-text)';
    info.innerHTML = '⚠️ Élève existant sous une autre orthographe ?<br>' +
      proches.map(n => '<span class="suggestion" data-nom="' +
        n.replace(/"/g, '&quot;') + '" data-cible="' + idChamp +
        '" style="text-decoration:underline;cursor:pointer;">' +
        n.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</span>').join(' · ');
    return;
  }

  info.style.color = 'var(--muted)';
  info.textContent = contexteCours
    ? 'Nouvel élève — ses prochains bilans seront regroupés sous cette orthographe.'
    : 'Nouveau nom — aucun bilan existant sous cette orthographe.';
}

/* Un clic sur une suggestion remplit le champ correspondant */
document.addEventListener('click', e => {
  const s = e.target && e.target.closest ? e.target.closest('.suggestion') : null;
  if(!s) return;
  const champ = $(s.getAttribute('data-cible'));
  if(!champ) return;
  champ.value = s.getAttribute('data-nom');
  if(s.getAttribute('data-cible') === 'studentName'){
    verifierNomEleve('studentName', 'studentInfo', true);
  }else{
    verifierNomEleve('searchName', 'eleveInfo', false);
    rechercherEleve();
  }
});


/* ============================================================
   RÉPERTOIRE DES ÉLÈVES
   Importer la liste réelle de l'auto-école, pour que les élèves
   sans bilan soient proposés eux aussi.
   ============================================================ */
let fichesAImporter = [];

async function importerListeEleves(){
  const zone = $('importEleves');
  const etat = $('importEtat');
  const btn = $('importBtn');
  if(!zone || !etat) return;

  const liste = zone.value.trim();
  if(!liste){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = 'Colle la liste des élèves.';
    return;
  }

  const combien = liste.split(/[\n;,]+/).filter(x => x.trim().length >= 3).length;
  if(!await confirmer('Importer ' + combien + ' nom(s) dans le répertoire ?\n\n' +
                      'Les doublons sont ignorés, rien n\'est écrasé.')) return;

  btn.disabled = true;
  btn.textContent = 'Import…';
  etat.style.color = 'var(--muted)';
  etat.textContent = 'Envoi de la liste…';

  try{
    /* Un fichier apporte les coordonnées ; une liste collée n'a que des noms */
    const corps = fichesAImporter.length
      ? { action: 'elevesImport', fiches: JSON.stringify(fichesAImporter) }
      : { action: 'elevesImport', liste: liste };

    const r = await appelPrep(corps);
    etat.style.color = 'var(--accent-text)';
    etat.textContent = '✅ ' + (r.ajoutes || 0) + ' ajouté(s)' +
      (r.majs ? ' · ' + r.majs + ' complété(s)' : '') +
      (r.doublons ? ' · ' + r.doublons + ' inchangé(s)' : '') +
      ' · ' + (r.total || 0) + ' au total';
    zone.value = '';
    fichesAImporter = [];
    /* Les deux listes se rechargent ensemble, pas l'une après l'autre */
    await Promise.all([chargerEleves(), chargerFiches()]);
    afficherRepertoire();
  }catch(e){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = 'Erreur : ' + e.message;
  }finally{
    btn.disabled = false;
    btn.textContent = '📥 Importer la liste';
  }
}

/* ============================================================
   LES FICHES DU RÉPERTOIRE
   Nom, téléphone, courriel, formation. Recherche et modification.
   ============================================================ */
const FORMATIONS = ['', 'CS BV', 'CS BEA', 'AAC BV', 'AAC BEA',
                    'Conduite supervisée', 'Passerelle BEA→BV', 'Autre'];

let fichesEleves = [];

async function chargerFiches(){
  try{
    const d = await appelPrep({ action: 'fichesList' });
    fichesEleves = (d && d.fiches) || [];
  }catch(e){ console.warn('Fiches :', e); fichesEleves = []; }
  return fichesEleves;
}

function ficheDe(nom){
  return fichesEleves.find(f => normaliserMot(f.eleve) === normaliserMot(nom)) || null;
}

/* Un numéro français, mis en forme pour l'affichage et les liens */
function telLisible(t){
  const n = String(t || '').replace(/[^\d+]/g, '');
  if(/^0\d{9}$/.test(n)) return n.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  return String(t || '').trim();
}
function telPourLien(t){
  let n = String(t || '').replace(/[^\d+]/g, '');
  if(/^0\d{9}$/.test(n)) n = '+33' + n.slice(1);
  return n;
}

async function afficherRepertoire(){
  const zone = $('repertoireListe');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Chargement du répertoire…</div>';
  if(!fichesEleves.length) await chargerFiches();
  zone.innerHTML = '';

  /* Tous les élèves connus, avec ou sans fiche */
  const noms = [];
  elevesConnus.forEach(n => { if(n) noms.push(n); });
  fichesEleves.forEach(f => {
    if(!noms.some(n => normaliserMot(n) === normaliserMot(f.eleve))) noms.push(f.eleve);
  });
  noms.sort((a, b) => a.localeCompare(b, 'fr'));

  if(!noms.length){
    zone.innerHTML = '<div class="empty">Aucun élève connu pour le moment.</div>';
    return;
  }

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:8px;';
  const avecTel = fichesEleves.filter(f => f.telephone).length;
  t.textContent = noms.length + ' élève(s) · ' + avecTel + ' avec un numéro';
  zone.appendChild(t);

  const rech = document.createElement('input');
  rech.type = 'text';
  rech.placeholder = '🔍 Rechercher un élève, un numéro, une formation';
  rech.style.marginBottom = '10px';
  zone.appendChild(rech);

  const liste = document.createElement('div');
  zone.appendChild(liste);

  function dessiner(){
    const q = normaliserMot(rech.value);
    liste.innerHTML = '';

    const vus = noms.filter(n => {
      if(!q) return true;
      const f = ficheDe(n) || {};
      return normaliserMot(n).indexOf(q) !== -1 ||
             normaliserMot(f.telephone || '').indexOf(q) !== -1 ||
             normaliserMot(f.email || '').indexOf(q) !== -1 ||
             normaliserMot(f.formation || '').indexOf(q) !== -1 ||
             normaliserMot(f.messenger || '').indexOf(q) !== -1;
    });

    if(!vus.length){
      liste.innerHTML = '<div class="empty">Aucun élève ne correspond.</div>';
      return;
    }

    vus.forEach(n => liste.appendChild(ligneFicheEleve(n)));
  }
  rech.addEventListener('input', dessiner);
  dessiner();
}

function ligneFicheEleve(nom){
  const f = ficheDe(nom) || {};
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
    'margin-bottom:7px;';

  const h = document.createElement('div');
  h.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';

  const info = document.createElement('div');
  info.style.cssText = 'flex:1;min-width:0;';
  info.innerHTML = '<strong style="font-size:15px;">' + nom.replace(/</g, '&lt;') + '</strong>' +
    (f.formation ? ' <span style="font-size:11px;color:var(--accent-text);">' +
      f.formation.replace(/</g, '&lt;') + '</span>' : '') +
    '<div style="font-size:12px;color:var(--muted);margin-top:2px;line-height:1.5;">' +
    (f.telephone ? '📱 ' + telLisible(f.telephone) : '📱 pas de numéro') +
    (f.messenger ? '<br>💬 ' + lienMessenger(f.messenger) : '') +
    (f.email ? '<br>✉️ ' + f.email.replace(/</g, '&lt;') : '') +
    (f.remarques ? '<br>' + f.remarques.replace(/</g, '&lt;') : '') +
    '</div>';
  h.appendChild(info);

  /* Écrire par SMS, si on a le numéro */
  if(f.telephone){
    const bSms = document.createElement('a');
    bSms.href = 'sms:' + telPourLien(f.telephone);
    bSms.className = 'btn btn-secondary';
    bSms.style.cssText = 'width:auto;padding:7px 10px;font-size:14px;margin:0;flex-shrink:0;' +
      'text-decoration:none;display:inline-flex;align-items:center;';
    bSms.textContent = '💬';
    bSms.title = 'Envoyer un SMS à ' + nom;
    h.appendChild(bSms);
  }

  const bMod = document.createElement('button');
  bMod.className = 'btn btn-secondary';
  bMod.style.cssText = 'width:auto;padding:7px 10px;font-size:13px;margin:0;flex-shrink:0;';
  bMod.textContent = '✏️';
  bMod.title = 'Modifier la fiche';
  bMod.addEventListener('click', () => ouvrirFicheEleve(nom, f));
  h.appendChild(bMod);

  if(ACCES.role === 'admin'){
    const x = document.createElement('button');
    x.className = 'btn btn-secondary';
    x.style.cssText = 'width:auto;padding:7px 10px;font-size:13px;margin:0;flex-shrink:0;' +
      'color:var(--red);border-color:var(--red);';
    x.textContent = '🗑️';
    x.title = 'Tout supprimer pour cet élève';
    x.addEventListener('click', () => supprimerDepuisRepertoire(nom, x));
    h.appendChild(x);
  }

  d.appendChild(h);
  return d;
}

/* La fiche, en modification */
function ouvrirFicheEleve(nom, f){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 94vw);max-height:90vh;overflow-y:auto;';

  boite.insertAdjacentHTML('beforeend',
    '<h3>' + nom.replace(/</g, '&lt;') + '</h3>' +
    '<label for="fiTel">📱 Téléphone portable</label>' +
    '<input type="tel" id="fiTel" inputmode="tel" placeholder="06 12 34 56 78">' +
    '<label for="fiMail">✉️ Adresse mail</label>' +
    '<input type="email" id="fiMail" inputmode="email" placeholder="prenom.nom@exemple.fr">' +
    '<label for="fiMess">💬 Messenger</label>' +
    '<input type="text" id="fiMess" placeholder="Son profil : lien, ou m.me/pseudo">' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;line-height:1.4;">' +
      "Colle le lien de sa conversation, ou juste son pseudo. " +
      'Les moniteurs le retrouveront depuis le cours.</div>' +
    '<label for="fiForm">🎓 Formation</label>' +
    '<select id="fiForm">' +
      FORMATIONS.map(x => '<option value="' + x + '">' +
        (x || '— à préciser —') + '</option>').join('') +
    '</select>' +
    '<label for="fiRem">Remarques</label>' +
    '<textarea id="fiRem" rows="3" placeholder="Ce qu\'il faut savoir sur cet élève" ' +
      'style="width:100%;background:var(--navy);border:1px solid var(--line);color:var(--cream);' +
      'padding:10px 11px;border-radius:10px;font-size:15px;line-height:1.5;font-family:inherit;' +
      'resize:vertical;margin-bottom:12px;"></textarea>');

  const rangee = document.createElement('div');
  rangee.className = 'btn-row';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '💾 Enregistrer';
  rangee.appendChild(bAnn); rangee.appendChild(bOk);
  boite.appendChild(rangee);

  const msg = document.createElement('div');
  msg.style.cssText = 'margin-top:8px;font-size:13px;min-height:16px;';
  boite.appendChild(msg);

  fond.appendChild(boite);
  document.body.appendChild(fond);

  const g = id => boite.querySelector('#' + id);
  g('fiTel').value = (f && f.telephone) || '';
  g('fiMail').value = (f && f.email) || '';
  g('fiMess').value = (f && f.messenger) || '';
  g('fiForm').value = (f && f.formation) || '';
  g('fiRem').value = (f && f.remarques) || '';

  bAnn.addEventListener('click', () => document.body.removeChild(fond));

  bOk.addEventListener('click', async () => {
    const tel = g('fiTel').value.trim();
    if(tel && !/^[+\d\s().-]{8,}$/.test(tel)){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Ce numéro ne semble pas valable.';
      return;
    }
    const mail = g('fiMail').value.trim();
    if(mail && mail.indexOf('@') === -1){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Cette adresse mail ne semble pas valable.';
      return;
    }

    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      await appelPrep({ action: 'ficheSet', eleve: nom, telephone: tel,
                        email: mail, formation: g('fiForm').value,
                        messenger: g('fiMess').value.trim(),
                        remarques: g('fiRem').value.trim() });
      document.body.removeChild(fond);
      showToast('Fiche enregistrée ✅');
      afficherRepertoire();
    }catch(e){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Erreur : ' + e.message;
      bOk.disabled = false;
      bOk.textContent = '💾 Enregistrer';
    }
  });
}

async function supprimerDepuisRepertoire(n, bouton){
  if(!await confirmer('⚠️ SUPPRESSION DÉFINITIVE\n\n' +
      'Tout ce qui concerne ' + n + ' va être effacé :\n' +
      '• ses bilans\n• sa fiche de suivi et ses examens\n' +
      '• ses cours à venir\n• ses captures de CEPC\n' +
      '• ses messages en attente\n• sa fiche du répertoire\n\n' +
      "Il n'apparaîtra plus nulle part. Cette action est IRRÉVERSIBLE.")) return;

  const saisi = await demander("Pour confirmer, recopie exactement son nom :\n\n" + n);
  if(saisi === null) return;
  if(normaliserMot(saisi) !== normaliserMot(n)){
    await informer('Le nom saisi ne correspond pas. Suppression annulée.');
    return;
  }

  bouton.disabled = true;
  const etat = $('importEtat');
  try{
    const faits = await supprimerEleveComplet(n, t => {
      if(etat){ etat.style.color = 'var(--muted)'; etat.textContent = n + ' — ' + t; }
    });
    if(etat){
      etat.style.color = 'var(--accent-text)';
      etat.textContent = '✅ ' + n + ' supprimé — ' + (faits.join(' · ') || 'rien à retirer');
    }
    await chargerEleves();
    afficherRepertoire();
    if(typeof afficherBureau === 'function') afficherBureau(true);
  }catch(e){
    if(etat){ etat.style.color = 'var(--warn-text)'; etat.textContent = 'Erreur : ' + e.message; }
    bouton.disabled = false;
  }
}


/* ============================================================
   SUPPRESSION COMPLÈTE D'UN ÉLÈVE
   Tout ce qui le concerne disparaît : bilans, fiche de suivi,
   captures, cours à venir, messages, répertoire.
   Sert au ménage depuis le répertoire.
   ============================================================ */
async function supprimerEleveComplet(nom, rapporter){
  const dire = t => { if(typeof rapporter === 'function') rapporter(t); };
  const faits = [];

  /* Messages au bureau : on les efface, pas seulement les marquer traités.
     Ce sont eux qui décrivent l'état de l'élève dans les listes. */
  dire('Messages au bureau…');
  try{
    const r = await appelPrep({ action: 'consigneEffacerEleve', eleve: nom });
    if(r && r.effacees) faits.push(r.effacees + ' message(s)');
  }catch(e){}

  /* Cours préparés, passés comme à venir */
  dire('Cours préparés…');
  try{
    const d = await appelPrep({ action: 'prepList' });
    const siens = ((d && d.preparations) || [])
      .filter(x => normaliserMot(x.eleve || '') === normaliserMot(nom));
    for(const pr of siens){
      try{ await appelPrep({ action: 'prepDelete', id: pr.id }); }catch(e){}
    }
    if(siens.length) faits.push(siens.length + ' cours préparé(s)');
  }catch(e){}

  /* Fiche de suivi : examens, dates, disponibilités */
  dire('Fiche de suivi…');
  try{
    await appelPrep({ action: 'suiviDelete', eleve: nom });
    faits.push('fiche de suivi');
  }catch(e){}

  /* Captures du CEPC */
  dire('Captures du CEPC…');
  try{
    const d = await appelPrep({ action: 'captureList', eleve: nom });
    const caps = (d && d.captures) || [];
    for(const cap of caps){
      try{ await appelPrep({ action: 'captureDelete', id: cap.id }); }catch(e){}
    }
    if(caps.length) faits.push(caps.length + ' capture(s)');
  }catch(e){}

  /* Bilans */
  dire('Bilans…');
  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'supprimerEleve', code: ACCES.code, eleve: nom })
    }, 25000, 2);
    if(r.ok){
      const d = await r.json().catch(() => ({}));
      faits.push((d.supprimees || 0) + ' bilan(s)');
    }
  }catch(e){}

  /* Répertoire */
  dire('Répertoire…');
  try{ await appelPrep({ action: 'eleveRetirer', eleve: nom }); }catch(e){}

  viderCaches(nom);
  return faits;
}


/* ============================================================
   IMPORT D'UN FICHIER CSV
   Les exports d'auto-école ont des colonnes variées : on cherche
   celle qui contient les noms plutôt que d'imposer un format.
   ============================================================ */
const ENTETES_NOM = ['nom', 'eleve', 'élève', 'candidat', 'prenom', 'prénom',
                     'nom complet', 'nom et prenom', 'apprenant', 'stagiaire'];

/* Les autres colonnes qu'on sait reconnaître */
const ENTETES_TEL = ['telephone', 'téléphone', 'tel', 'tél', 'portable', 'mobile',
                     'gsm', 'numero', 'numéro', 'tel portable', 'tel mobile'];
const ENTETES_MAIL = ['email', 'e-mail', 'mail', 'courriel', 'adresse mail',
                      'adresse email', 'e mail'];
const ENTETES_FORMATION = ['formation', 'type', 'categorie', 'catégorie',
                           'boite', 'boîte', 'parcours', 'permis'];

/* Un numéro écrit « 612345678 » ou « +33 6 12 … » redevient lisible */
function normaliserTel(v){
  let t = String(v || '').replace(/[^\d+]/g, '');
  if(!t) return '';
  if(t.indexOf('+33') === 0) t = '0' + t.slice(3);
  else if(t.indexOf('0033') === 0) t = '0' + t.slice(4);
  else if(t.length === 9 && t[0] !== '0') t = '0' + t;
  return /^0\d{9}$/.test(t) ? t : String(v || '').trim();
}

function decouperLigneCsv(ligne, sep){
  const cases = [];
  let courant = '';
  let guillemets = false;
  for(let i = 0; i < ligne.length; i++){
    const ch = ligne[i];
    if(ch === '"'){
      if(guillemets && ligne[i + 1] === '"'){ courant += '"'; i++; }
      else guillemets = !guillemets;
    }else if(ch === sep && !guillemets){
      cases.push(courant); courant = '';
    }else courant += ch;
  }
  cases.push(courant);
  return cases.map(x => x.trim());
}

/* Analyse le fichier et en tire une liste de noms */
function lireCsvEleves(texte){
  const lignes = texte.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if(!lignes.length) return { noms: [], info: 'Fichier vide.' };

  /* Le séparateur le plus fréquent sur la première ligne */
  const sep = [';', ',', '\t'].map(s => ({ s: s, n: (lignes[0].split(s).length) }))
                               .sort((a, b) => b.n - a.n)[0].s;

  const premiere = decouperLigneCsv(lignes[0], sep);
  const bas = premiere.map(x => normaliserMot(x));

  /* Une colonne « nom » et une colonne « prénom » séparées ? */
  const iNom = bas.findIndex(x => x === 'nom');
  const iPrenom = bas.findIndex(x => x === 'prenom' || x === 'prénom');
  let colonnes = null;
  let entete = false;

  if(iNom !== -1 && iPrenom !== -1){
    colonnes = [iPrenom, iNom];
    entete = true;
  }else{
    const i = bas.findIndex(x => ENTETES_NOM.indexOf(x) !== -1);
    if(i !== -1){ colonnes = [i]; entete = true; }
  }

  /* Sans en-tête reconnu : la colonne qui ressemble le plus à des noms */
  if(!colonnes){
    const nb = premiere.length;
    let meilleure = 0, meilleurScore = -1;
    for(let col = 0; col < nb; col++){
      let score = 0;
      lignes.slice(0, 25).forEach(l => {
        const v = (decouperLigneCsv(l, sep)[col] || '').trim();
        if(v.length >= 4 && /[a-zà-ÿ]/i.test(v) && !/^\d+$/.test(v) && v.split(' ').length <= 5) score++;
      });
      if(score > meilleurScore){ meilleurScore = score; meilleure = col; }
    }
    colonnes = [meilleure];
  }

  /* Les colonnes de contact, si elles sont là */
  const trouver = (liste) => bas.findIndex(x => liste.indexOf(x) !== -1);
  const iTel = entete ? trouver(ENTETES_TEL) : -1;
  const iMail = entete ? trouver(ENTETES_MAIL) : -1;
  const iForm = entete ? trouver(ENTETES_FORMATION) : -1;

  /* Sans en-tête : on repère une colonne qui ressemble à des numéros
     ou à des adresses, plutôt que de perdre l'information. */
  let telAuto = -1, mailAuto = -1;
  if(!entete){
    const nb = premiere.length;
    for(let col = 0; col < nb; col++){
      let tels = 0, mails = 0;
      lignes.slice(0, 25).forEach(l => {
        const v = (decouperLigneCsv(l, sep)[col] || '').trim();
        if(/^[+0]\d[\d\s.()-]{7,}$/.test(v)) tels++;
        if(v.indexOf('@') !== -1 && v.indexOf('.') !== -1) mails++;
      });
      if(tels >= 2 && telAuto === -1) telAuto = col;
      if(mails >= 2 && mailAuto === -1) mailAuto = col;
    }
  }
  const colTel = iTel !== -1 ? iTel : telAuto;
  const colMail = iMail !== -1 ? iMail : mailAuto;

  const fiches = [];
  lignes.forEach((l, i) => {
    if(entete && i === 0) return;
    const cases = decouperLigneCsv(l, sep);
    const morceaux = colonnes.map(c => (cases[c] || '').trim()).filter(Boolean);
    const nom = morceaux.join(' ').replace(/\s+/g, ' ').trim();
    if(nom.length < 3 || /^\d+$/.test(nom)) return;

    fiches.push({
      eleve: nom,
      telephone: colTel >= 0 ? normaliserTel(cases[colTel]) : '',
      email: colMail >= 0 ? (cases[colMail] || '').trim() : '',
      formation: iForm >= 0 ? (cases[iForm] || '').trim() : ''
    });
  });

  const dit = [];
  dit.push(fiches.length + ' élève(s)');
  const nTel = fiches.filter(f => f.telephone).length;
  const nMail = fiches.filter(f => f.email).length;
  if(nTel) dit.push(nTel + ' avec téléphone');
  if(nMail) dit.push(nMail + ' avec mail');

  const info = dit.join(' · ') + ' · séparateur « ' +
    (sep === '\t' ? 'tabulation' : sep) + ' » · nom : ' +
    colonnes.map(c => premiere[c] || ('n°' + (c + 1))).join(' + ') +
    (colTel >= 0 ? ' · tél : ' + (premiere[colTel] || ('n°' + (colTel + 1))) : '') +
    (colMail >= 0 ? ' · mail : ' + (premiere[colMail] || ('n°' + (colMail + 1))) : '');

  return { fiches: fiches, noms: fiches.map(f => f.eleve), info: info };
}

/* Le fichier choisi remplit la zone de texte, pour relecture */
function brancherFichierCsv(){
  const inp = $('importFichier');
  const zone = $('importEleves');
  const etat = $('importEtat');
  if(!inp || !zone) return;

  inp.addEventListener('change', () => {
    const f = inp.files && inp.files[0];
    if(!f) return;

    const lecteur = new FileReader();
    lecteur.onerror = () => {
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Lecture du fichier impossible.';
    };
    lecteur.onload = () => {
      const r = lireCsvEleves(String(lecteur.result || ''));
      inp.value = '';
      if(!r.noms.length){
        etat.style.color = 'var(--warn-text)';
        etat.textContent = "Aucun nom trouvé dans ce fichier. " +
          'Colle la liste à la main, ou vérifie le fichier.';
        return;
      }
      fichesAImporter = r.fiches || [];
      zone.value = (r.fiches || []).map(f =>
        [f.eleve, f.telephone, f.email].filter(Boolean).join(' · ')).join('\n');
      etat.style.color = 'var(--accent-text)';
      etat.textContent = '📄 ' + r.info +
        '\nRelis la liste ci-dessus, puis appuie sur Importer.';
    };
    /* Les exports français sont souvent en Windows-1252 */
    lecteur.readAsText(f, 'utf-8');
  });
}


/* Un Messenger noté comme lien devient cliquable ; un simple pseudo
   est transformé en lien m.me, qui ouvre la conversation. */
function lienMessenger(v){
  const t = String(v || '').trim();
  if(!t) return '';
  let url = t;
  if(!/^https?:\/\//i.test(t)){
    url = 'https://m.me/' + t.replace(/^@/, '').replace(/\s+/g, '');
  }
  return '<a href="' + url.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener" ' +
         'style="color:var(--accent-text);">' + t.replace(/</g, '&lt;') + '</a>';
}


/* ============================================================
   LE MESSENGER DE L'ÉLÈVE, AU DÉMARRAGE DU COURS
   Le moniteur le saisit une fois ; il est retenu et proposé
   à tous les autres ensuite.
   ============================================================ */
let messengerCharge = '';

async function chargerMessengerEleve(){
  const champ = $('eleveMessenger');
  const nom = $('studentName') ? $('studentName').value.trim() : '';
  if(!champ) return;

  majLienMessenger();
  if(nom.length < 3){ champ.value = ''; messengerCharge = ''; return; }

  try{
    if(!fichesEleves.length) await chargerFiches();
    const f = ficheDe(nom);
    /* On n'écrase pas une saisie en cours */
    if(champ.value.trim() && champ.value.trim() !== messengerCharge) return;
    champ.value = (f && f.messenger) || '';
    messengerCharge = champ.value;
    majLienMessenger();
  }catch(e){}
}

function majLienMessenger(){
  const champ = $('eleveMessenger');
  const lien = $('eleveMessengerLien');
  if(!champ || !lien) return;

  const v = champ.value.trim();
  if(!v){ lien.style.display = 'none'; return; }

  let url = v;
  if(!/^https?:\/\//i.test(v)){
    url = 'https://m.me/' + v.replace(/^@/, '').replace(/\s+/g, '');
  }
  lien.href = url;
  lien.style.display = 'inline-flex';
}

/* Enregistré dès que le moniteur quitte le champ */
async function enregistrerMessengerEleve(){
  const champ = $('eleveMessenger');
  const etat = $('eleveMessengerEtat');
  if(!champ) return;

  const v = champ.value.trim();
  const nom = $('studentName') ? $('studentName').value.trim() : '';
  majLienMessenger();

  if(!nom || nom.split(' ').length < 2) return;
  if(v === messengerCharge) return;

  try{
    await appelPrep({ action: 'ficheSet', eleve: nom, messenger: v });
    messengerCharge = v;
    if(etat){
      etat.style.color = 'var(--accent-text)';
      etat.textContent = '✅ Enregistré : les autres moniteurs le retrouveront ici.';
    }
    fichesEleves = [];
  }catch(e){
    if(etat){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Non enregistré : ' + e.message;
    }
  }
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-fenetres.js'] = true;
