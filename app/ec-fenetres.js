/* Déployé le 30/08/2026 à 06:20 — v723 */
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
const cacheConsignes = {};     /* messages du bureau, par élève */
/* cacheBureau : déclaré dans ec-etat.js */
const DUREE_CACHE = 600000;    /* 10 minutes — le temps d'un début de cours.
                                  Un bilan enregistré vide le cache de l'élève. */

/* La forme du dossier a changé au fil des versions : marques de la
   fiche véhicule, frise. Un dossier gardé sous l'ancienne forme
   renverrait des champs vides pendant dix minutes. */
const FORME_DOSSIER = 5;   /* 5 : les leçons depuis l'examen blanc et depuis le RDV post-permis */

function lireCacheDossier(nom){
  const k = normaliserMot(nom);
  const e = cacheDossiers[k];
  if(!e || Date.now() - e.ts >= DUREE_CACHE) return null;
  if(e.forme !== FORME_DOSSIER) return null;
  return e.data;
}
function ecrireCacheDossier(nom, data){
  cacheDossiers[normaliserMot(nom)] =
    { ts: Date.now(), forme: FORME_DOSSIER, data: data };
}

/* Les messages du bureau : mêmes règles que le dossier.
   Sans ce cache, le préchargement ne servirait à rien. */
async function consignesDe(nomEleve, forcer){
  const k = normaliserMot(nomEleve || '');
  if(!k || k.length < 2) return [];

  const e = cacheConsignes[k];
  if(!forcer && e && Date.now() - e.ts < DUREE_CACHE) return e.data;

  try{
    const d = await appelPrep({ action: 'consigneList', eleve: nomEleve });
    const liste = (d && d.consignes) || [];
    cacheConsignes[k] = { ts: Date.now(), data: liste };
    return liste;
  }catch(err){
    return (e && e.data) || [];
  }
}
function viderCaches(nom){
  if(nom){
    delete cacheDossiers[normaliserMot(nom)];
    delete cacheConsignes[normaliserMot(nom)];
  }else{
    Object.keys(cacheDossiers).forEach(k => delete cacheDossiers[k]);
    Object.keys(cacheConsignes).forEach(k => delete cacheConsignes[k]);
  }
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

/* La liste des élèves change peu d'un jour à l'autre : on la garde
   dans le téléphone. Elle s'affiche instantanément au démarrage,
   puis se met à jour en arrière-plan. */
const CLE_ELEVES = 'eleves_connus';

function remplirListeEleves(noms){
  const liste = $('listeEleves');
  if(!liste) return;
  liste.innerHTML = '';
  (noms || []).forEach(nom => {
    const o = document.createElement('option');
    o.value = nom;
    liste.appendChild(o);
  });
}

/* Affiche tout de suite ce qu'on connaît déjà, avant tout réseau */
function elevesDuCache(){
  try{
    const t = localStorage.getItem(CLE_ELEVES);
    if(!t) return false;
    const noms = JSON.parse(t);
    if(!Array.isArray(noms) || !noms.length) return false;
    elevesConnus = noms;
    remplirListeEleves(noms);
    return true;
  }catch(e){ return false; }
}

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
    remplirListeEleves(elevesConnus);

    /* Gardée pour le prochain démarrage */
    try{
      localStorage.setItem(CLE_ELEVES, JSON.stringify(elevesConnus));
    }catch(e){ /* mémoire pleine : tant pis, on relira */ }
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

    /* Le point demandé par le bureau : le moniteur doit le voir
       en ouvrant son cours, pas le découvrir après. */
    if(contexteCours && typeof mentionFairePoint === 'function'){
      const pt = mentionFairePoint(champ.value.trim());
      if(pt){
        const l = document.createElement('div');
        l.style.cssText = 'margin-top:4px;color:var(--warn-text);' +
          'font-weight:700;';
        l.textContent = pt;
        info.appendChild(l);
      }
    }
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

  const combien = fichesAImporter.length ||
                  liste.split(/[\n;,]+/).filter(x => x.trim().length >= 3).length;
  const avecTel = fichesAImporter.filter(f => f.telephone).length;

  if(!await confirmer('Importer ' + combien + ' élève(s) dans le répertoire ?' +
      (avecTel ? '\n' + avecTel + ' avec leur numéro de téléphone.' : '') +
      '\n\nLes doublons sont ignorés, rien n\'est écrasé.')) return;

  btn.disabled = true;
  btn.textContent = 'Import…';
  etat.style.color = 'var(--muted)';
  etat.textContent = 'Envoi de ' + combien + ' fiche(s) — patiente, ' +
    'cela peut prendre une minute…';

  try{
    /* Un fichier apporte les coordonnées ; une liste collée n'a que des noms */
    const corps = fichesAImporter.length
      ? { action: 'elevesImport', fiches: JSON.stringify(fichesAImporter) }
      : { action: 'elevesImport', liste: liste };

    const r = await appelPrep(corps);

    /* Le serveur peut refuser sans que l'appel échoue :
       sans ce contrôle, l'import semblait réussir dans le vide. */
    if(r && r.status === 'error') throw new Error(r.message || 'Import refusé');
    if(r && !r.ajoutes && !r.majs && !r.doublons){
      throw new Error("Rien n'a été importé. Vérifie le contenu de la liste.");
    }

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
/* Les formations de l'école. Seules celles marquées « voiture »
   créent un bilan de conduite au rappel : pour les autres, le
   bilan n'existe pas encore. */
const FORMATIONS_BASE = [
  { cle: '',                nom: '— à préciser —',            voiture: false },
  { cle: 'BV',              nom: '🚗 Voiture manuelle (BV)',  voiture: true },
  { cle: 'BEA',             nom: '🚗 Voiture automatique (BEA)', voiture: true },
  { cle: 'AAC BV',          nom: '🚗 AAC manuelle',           voiture: true },
  { cle: 'AAC BEA',         nom: '🚗 AAC automatique',        voiture: true },
  /* La conduite supervisée se coche dans le questionnaire ; elle
     reste proposée ici pour les fiches qui la portent déjà. */
  { cle: 'Conduite supervisée', nom: '🚗 Conduite supervisée', voiture: true },
  { cle: 'CS BV',           nom: '🚗 CS manuelle (ancien)',   voiture: true },
  { cle: 'CS BEA',          nom: '🚗 CS automatique (ancien)', voiture: true },
  /* B78 est le code porté sur un permis obtenu en boîte automatique :
     la passerelle mène au permis B, et se conduit en manuelle. */
  { cle: 'Passerelle BEA→BV',   nom: '🚗 Passerelle B78 → B (manuelle)', voiture: true },
  { cle: 'Moto A',          nom: '🏍️ Moto (A)',              voiture: false },
  { cle: 'A1 permis',       nom: '🛵 A1 permis',              voiture: false },
  { cle: 'A1 passerelle',   nom: '🛵 A1 passerelle',          voiture: false },
  { cle: 'AM 2 roues',      nom: '🛴 AM 2 roues',             voiture: false },
  { cle: 'AM voiturette',   nom: '🚙 AM voiturette',          voiture: false },
  { cle: 'A2',              nom: '🏍️ A2',                    voiture: false },
  { cle: 'Permis BE',       nom: '🚚 Permis BE (remorque)',   voiture: false }
];

/* Celles que le bureau a ajoutées à la main */
const CLE_FORMATIONS = 'ec_formations';

function formationsAjoutees(){
  try{
    const l = JSON.parse(localStorage.getItem(CLE_FORMATIONS) || '[]');
    return Array.isArray(l) ? l : [];
  }catch(e){ return []; }
}

function toutesLesFormations(){
  return FORMATIONS_BASE.concat(
    formationsAjoutees().map(x => ({ cle: x, nom: x, voiture: false })));
}

/* Cette formation donne-t-elle lieu à un bilan de conduite ? */
function formationVoiture(v){
  const t = normaliserMot(String(v || ''));
  if(!t) return true;          /* rien de précisé : on suppose la voiture */

  const trouvee = toutesLesFormations()
    .find(x => normaliserMot(x.cle) === t);
  if(trouvee) return !!trouvee.voiture;

  /* Une formation saisie autrefois : on lit ce qu'elle dit */
  if(/moto|\bA1\b|\bA2\b|\bAM\b|\bBE\b|remorque|roues|voiturette/i
     .test(String(v))) return false;
  return true;
}

/* Un élève en remorque ne récite que les procédures BE */
function boiteDeLaFormation(v){
  const t = String(v || '');
  if(/\bBE\b|remorque/i.test(t)) return 'BE';

  /* La table des parcours d'abord : elle sait ce que le nom ne dit
     pas. « Passerelle BEA→BV » contient « BEA », mais la passerelle
     se conduit en boîte MANUELLE — c'est tout son objet. */
  if(typeof parcoursDeLaFormation === 'function'){
    const p = parcoursDeLaFormation(t);
    if(p && p.boite) return p.boite;
  }

  if(/BEA|automatique/i.test(t)) return 'BEA';
  if(/\bBV\b|manuelle/i.test(t)) return 'BV';
  return '';
}

/* Gardée pour les écrans qui l'utilisent encore */
const FORMATIONS = FORMATIONS_BASE.map(x => x.cle);

let fichesEleves = [];

let fichesLues = 0;

async function chargerFiches(){
  try{
    const d = await appelPrep({ action: 'fichesList' });
    fichesEleves = (d && d.fiches) || [];
    fichesLues = Date.now();
  }catch(e){ console.warn('Fiches :', e); }
  return fichesEleves;
}

function ficheDe(nom){
  return fichesEleves.find(f => normaliserMot(f.eleve) === normaliserMot(nom)) || null;
}

/* ------------------------------------------------------------
   LE POSTE DE CONDUITE — UNE SEULE ÉCRITURE

   ♿ conduite aménagée et 🟩 coussin vert se saisissent de trois
   endroits : la fiche de l'élève, la ligne du répertoire, et la
   carte de « Mes prochains cours ». Trois portes, mais une seule
   destination — la fiche — et une seule fonction pour y écrire.

   C'est la règle « tout est lié » prise au mot : l'information
   n'existe qu'à un endroit, et poser la case ici la fait
   apparaître partout ailleurs sans recopie.
   ------------------------------------------------------------ */
function posteDeConduite(nom){
  const f = ficheDe(nom) || {};
  return { amenagee: String(f.amenagee || '') === 'oui',
           coussin:  String(f.coussin  || '') === 'oui' };
}

/* Le résumé lisible, pour les cartes et les listes. Vide quand il
   n'y a rien à préparer : une ligne « rien de particulier » ne
   mérite pas la place qu'elle prend. */
function texteDuPoste(nom){
  const p = posteDeConduite(nom);
  const bouts = [];
  if(p.amenagee) bouts.push('♿ Conduite aménagée');
  if(p.coussin)  bouts.push('🟩 Coussin vert');
  return bouts.join(' · ');
}

/* Les aménagements du véhicule, tels qu'ils sont enregistrés. */
function amenagementsDe(nom){
  const f = ficheDe(nom) || {};
  return String(f.amenagements || '').split('|').map(x => x.trim()).filter(Boolean);
}

/* ------------------------------------------------------------
   COCHER ♿ SANS DIRE QUOI NE SERT À RIEN

   « Conduite aménagée » tout court n'apprend rien au moniteur : ce
   qu'il lui faut savoir, c'est QUOI monter dans la voiture — une
   boule à gauche, un accélérateur à gauche, des rétroviseurs. On ne
   coche donc pas la case, on ouvre la liste ; et la case ne se
   coche que si au moins un aménagement est choisi.

   Décocher, en revanche, ne demande rien : on retire tout.
   ------------------------------------------------------------ */
function choisirLesAmenagements(nom){
  return new Promise(resolve => {
    const liste = (typeof AMENAGEMENTS !== 'undefined') ? AMENAGEMENTS : [];
    const dejaLa = amenagementsDe(nom);

    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(400px, 94vw);';

    boite.innerHTML =
      '<h3>♿ Conduite aménagée</h3>' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.5;">' +
        '<strong style="color:var(--cream);">' + String(nom).replace(/</g, '&lt;') +
        '</strong><br>Qu\'est-ce qu\'il faut monter dans la voiture ?</div>' +
      liste.map(a =>
        '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
        'font-size:15px;color:var(--cream);margin-bottom:9px;font-weight:400;">' +
        '<input type="checkbox" class="amgChoix" value="' + a.cle +
        '" style="width:19px;height:19px;"' +
        (dejaLa.indexOf(a.cle) !== -1 ? ' checked' : '') + '>' +
        a.court + ' ' + a.nom.replace(/</g, '&lt;') + '</label>').join('') +
      '<div id="amgErreur" style="font-size:12px;color:var(--red);' +
      'margin:4px 0 10px;line-height:1.4;display:none;">' +
      'Coche au moins un aménagement : « conduite aménagée » sans ' +
      'préciser quoi n\'apprend rien au moniteur.</div>';

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';

    const bAnn = document.createElement('button');
    bAnn.className = 'btn btn-secondary';
    bAnn.textContent = 'Annuler';
    bAnn.addEventListener('click', () => {
      document.body.removeChild(fond);
      resolve(null);
    });
    rangee.appendChild(bAnn);

    const bOk = document.createElement('button');
    bOk.className = 'btn btn-primary';
    bOk.textContent = 'Enregistrer';
    bOk.addEventListener('click', async () => {
      const choisis = [...boite.querySelectorAll('.amgChoix')]
        .filter(x => x.checked).map(x => x.value);
      if(!choisis.length){
        boite.querySelector('#amgErreur').style.display = 'block';
        return;
      }
      bOk.disabled = true;
      bOk.textContent = 'Enregistrement…';
      const ok = await ecrirePosteDeConduite(nom, 'amenagee', true, choisis);
      if(fond.parentNode) document.body.removeChild(fond);
      resolve(ok ? choisis : null);
    });
    rangee.appendChild(bOk);

    boite.appendChild(rangee);
    fond.appendChild(boite);
    document.body.appendChild(fond);
  });
}

async function ecrirePosteDeConduite(nom, champ, actif, amenagements){
  const propre = String(nom || '').trim();
  if(!propre || ['amenagee', 'coussin'].indexOf(champ) === -1) return false;

  /* 'non' et non '' : c'est une réponse. Le vide, côté serveur,
     veut dire « le formulaire n'en parlait pas » et ne touche à
     rien — sans quoi cette case ne pourrait jamais se décocher. */
  const maj = {}; maj[champ] = actif ? 'oui' : 'non';

  /* Les aménagements suivent la case : choisis quand on la coche,
     effacés quand on la décoche. Les laisser derrière ferait dire
     à la fiche « pas de conduite aménagée, mais boule à gauche ». */
  if(champ === 'amenagee'){
    maj.amenagements = actif ? (amenagements || []).join('|') : 'non';
  }

  try{
    await appelPrep(Object.assign({ action: 'ficheSet', eleve: propre }, maj));
  }catch(e){
    showToast('Enregistrement impossible : ' + e.message);
    return false;
  }

  /* La mémoire suit tout de suite : les autres écrans lisent
     fichesEleves, et attendre le rechargement leur ferait afficher
     l'ancienne valeur. */
  const enMemoire = Object.assign({}, maj);
  if(enMemoire.amenagements === 'non') enMemoire.amenagements = '';
  const f = ficheDe(propre);
  if(f) Object.assign(f, enMemoire);
  else fichesEleves.push(Object.assign({ eleve: propre }, enMemoire));
  return true;
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

/* Défait un rattrapage : vide les formations posées automatiquement */
async function annulerLeRattrapage(){
  if(!await confirmer(
      'Effacer les formations retrouvées automatiquement ?\n\n' +
      'Attention : celles que tu as saisies avec les mêmes ' +
      'libellés (BEA, BV, AAC…) seront effacées aussi. ' +
      'Les formations moto, remorque ou personnalisées ne bougent pas.')) return;

  showToast('Nettoyage…');
  try{
    const d = await appelPrep({ action: 'annulerRattrapage' });
    const n = (d && d.videes) || 0;
    showToast(n + ' formation(s) effacée(s) ✅');
    afficherRepertoire(true);
  }catch(e){
    showToast('Impossible : ' + e.message);
  }
}


/* Remplit les formations manquantes depuis les bilans déjà faits */
async function rattraperLesFormations(){
  if(!await confirmer(
      'Retrouver les formations depuis les bilans déjà enregistrés ?\n\n' +
      'Seules les fiches sans formation seront complétées. ' +
      'Celles que tu as saisies ne bougeront pas.')) return;

  showToast('Lecture des bilans…');
  try{
    const d = await appelPrep({ action: 'rattraperFormations' });
    const n = (d && d.remplies) || 0;

    if(!n){
      informer('Aucune fiche à compléter.\n\n' +
               'Soit les formations sont déjà renseignées, soit les ' +
               'bilans ne permettent pas de conclure.', 'Rattrapage');
      return;
    }

    /* Ce qui a changé : le bureau doit pouvoir vérifier */
    const lignes = ((d && d.detail) || [])
      .map(x => '· ' + x.eleve + ' → ' + x.formation).join('\n');

    informer(n + ' fiche(s) complétée(s).\n\n' + lignes +
             (n > 40 ? '\n\n(et ' + (n - 40) + ' autres)' : '') +
             '\n\nSi ce n\'est pas ce que tu attendais, le bouton ' +
             '↩️ du répertoire annule tout.',
             'Formations retrouvées');
    afficherRepertoire(true);
  }catch(e){
    showToast('Impossible : ' + e.message);
  }
}


async function afficherRepertoire(recharger){
  const zone = $('repertoireListe');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Chargement du répertoire…</div>';
  /* Après une modification, on relit : sinon l'écran continue
     d'afficher la fiche telle qu'elle était avant l'enregistrement. */
  if(recharger || !fichesEleves.length) await chargerFiches();
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

  /* Les fiches sans formation : on propose de les retrouver
     depuis les bilans, plutôt que de les saisir une par une. */
  const sansForm = fichesEleves.filter(x => !String(x.formation || '').trim());
  if(sansForm.length){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'margin-bottom:6px;padding:11px;font-size:13px;';
    b.textContent = '🎓 Retrouver ' + sansForm.length +
                    ' formation(s) depuis les bilans';
    b.addEventListener('click', rattraperLesFormations);
    zone.appendChild(b);
  }

  /* Défaire un rattrapage mal parti : seules les formations que
     le rattrapage sait écrire sont effacées. */
  const posees = fichesEleves.filter(x =>
    ['BEA', 'BV', 'CS BEA', 'CS BV', 'AAC BEA', 'AAC BV',
     'Conduite supervisée', 'Passerelle BEA→BV']
      .indexOf(String(x.formation || '').trim()) !== -1);

  if(posees.length){
    const b2 = document.createElement('button');
    b2.className = 'btn btn-secondary';
    b2.style.cssText = 'margin-bottom:10px;padding:10px;font-size:12px;' +
      'color:var(--muted);';
    b2.textContent = '↩️ Annuler le rattrapage des formations';
    b2.addEventListener('click', annulerLeRattrapage);
    zone.appendChild(b2);
  }

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

    /* Au-delà d'une centaine de fiches, le navigateur rame pour rien :
       personne ne lit trois cents cartes, on filtre. */
    const MAX_AFFICHE = 100;
    const montres = vus.slice(0, MAX_AFFICHE);
    montres.forEach(n => liste.appendChild(ligneFicheEleve(n)));

    if(vus.length > MAX_AFFICHE){
      const a = document.createElement('div');
      a.className = 'empty';
      a.style.cssText = 'padding:12px;font-size:13px;line-height:1.5;';
      a.innerHTML = '📋 ' + montres.length + ' fiches affichées sur ' + vus.length +
        '.<br><span style="font-size:12px;">Affine la recherche pour trouver un élève précis.</span>';
      liste.appendChild(a);
    }
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
  /* Les repères visibles d'un coup d'œil, comme dans les listes permis */
  const genre = f.genre === 'F' ? '♀' : (f.genre === 'M' ? '♂' : '');

  info.innerHTML = '<strong style="font-size:15px;">' +
    (genre ? genre + ' ' : '') + nom.replace(/</g, '&lt;') + '</strong>' +
    (f.formation ? ' <span style="font-size:11px;color:var(--accent-text);">' +
      f.formation.replace(/</g, '&lt;') + '</span>' : '') +
    (f.autreAE ? ' <span style="font-size:11px;color:#E8A33D;">🏫 ' +
      (f.autreAENom ? f.autreAENom.replace(/</g, '&lt;') : 'autre auto-école') +
      '</span>' : '') +
    '<div style="font-size:12px;color:var(--muted);margin-top:2px;line-height:1.5;">' +
    (f.telephone ? '📱 ' + telLisible(f.telephone) : '📱 pas de numéro') +
    (f.messenger ? '<br>💬 ' + lienMessenger(f.messenger) : '') +
    (f.email ? '<br>✉️ ' + f.email.replace(/</g, '&lt;') : '') +
    (f.mailPrescripteur ? '<br>👤 ' + f.mailPrescripteur.replace(/</g, '&lt;') : '') +
    (f.ants ? '<br>📇 ANTS ' +
      (f.ants === 'nous' ? 'fait par nous' : "fait par l'élève") : '') +
    (f.frise ? '<br>🧭 ' + f.frise.replace(/</g, '&lt;') : '') +
    (f.remarques ? '<br>' + f.remarques.replace(/</g, '&lt;') : '') +
    '</div>';
  h.appendChild(info);

  /* Le poste de conduite se coche ici, sans ouvrir la fiche : c'est
     l'information qu'on corrige le plus vite, souvent en revenant
     d'un cours. Deux pastilles qui basculent, allumées quand c'est
     actif. */
  const poste = document.createElement('div');
  poste.style.cssText = 'display:flex;gap:4px;flex-shrink:0;';
  [['amenagee', '♿', 'Conduite aménagée'],
   ['coussin', '🟩', 'Coussin vert']].forEach(([champ, emoji, titre]) => {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.title = titre + ' — cliquer pour changer';
    const peindre = () => {
      const actif = posteDeConduite(nom)[champ];
      b.style.cssText = 'width:auto;padding:7px 9px;font-size:14px;margin:0;' +
        'flex-shrink:0;opacity:' + (actif ? '1' : '.32') + ';' +
        (actif ? 'border-color:var(--accent-text);' : '');
      b.textContent = emoji;
    };
    peindre();
    b.addEventListener('click', async () => {
      const avant = posteDeConduite(nom)[champ];
      /* Même règle qu'ailleurs : cocher la conduite aménagée
         demande de dire lesquels. */
      if(champ === 'amenagee' && !avant){
        const choisis = await choisirLesAmenagements(nom);
        peindre();
        if(choisis) showToast(titre + ' notée ✅');
        return;
      }
      b.disabled = true;
      const ok = await ecrirePosteDeConduite(nom, champ, !avant);
      b.disabled = false;
      peindre();
      if(ok) showToast(titre + (avant ? ' retiré' : ' noté') + ' ✅');
    });
    poste.appendChild(b);
  });
  h.appendChild(poste);

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
/* ============================================================
   L'ACCÈS À L'ESPACE ÉLÈVE

   Depuis sa fiche : voir s'il en a un, le lui créer, et choisir
   ce qu'il y trouve.
   ============================================================ */

const MODULES_ELEVE = [
  { cle:'proccorriger', nom:'📋 Réciter des procédures' },
  { cle:'code',         nom:'🎓 Suivi du code en salle' }
];

/* Le financement extérieur, en lecture seule.

   Le bureau le saisit dans son écran ; ici on le rappelle, parce
   que c'est là qu'on ouvre la fiche d'un élève. */
async function afficherFinancementEleve(nom, zone){
  if(!zone) return;
  zone.innerHTML = '';

  let dossier = null;
  try{
    const d = await appelPrep({ action: 'peList' });
    dossier = ((d && d.dossiers) || []).find(x =>
      normaliserMot(x.eleve || '') === normaliserMot(nom));
  }catch(e){ return; }

  if(!dossier) return;

  /* « Région » porte un accent : il faut normaliser avant de
     comparer, sinon le test échoue toujours. */
  const region = normaliserMot(String(dossier.financeur || ''))
    .indexOf('region') !== -1;

  const det = document.createElement('details');
  det.style.cssText = 'border:1px solid var(--line);border-radius:11px;' +
    'padding:9px 12px;';

  det.innerHTML = '<summary style="cursor:pointer;font-size:13px;' +
    'font-weight:700;color:var(--accent-text);">' +
    (region ? '🏛️ Région Bretagne' : '💶 France Travail') +
    (dossier.financeur && !region ? ' ' + dossier.financeur : '') +
    (dossier.total ? ' — ' + dossier.total + ' €' : '') +
    (dossier.fini ? ' · terminé' : '') + '</summary>';

  const z = document.createElement('div');
  z.style.cssText = 'margin-top:9px;font-size:12px;line-height:1.7;';

  /* Les versements, tels que le bureau les a notés */
  const versements = region
    ? [['Inscription', 'regInscription', 'courrierInscription', 'etatInscription'],
       ['Permis', 'regPermis', 'courrierPermis', 'etatPermis']]
    : [['Inscription', 'inscription', 'courrierInscription', 'etatInscription'],
       ['Code', 'code', 'courrierCode', 'etatCode'],
       ['30 heures', 'trente', 'courrier30', 'etat30']];

  z.innerHTML = versements.map(([n, ech, cour, etat]) => {
    const v = String(dossier[etat] || '');
    const marque = (v === 'paye') ? '✅' : (v === 'abandon') ? '⛔' : '·';
    const coul = (v === 'paye') ? 'var(--accent-text)'
               : (v === 'abandon') ? 'var(--red)' : 'var(--muted)';
    return '<div style="display:flex;gap:8px;">' +
      '<span style="flex-shrink:0;color:' + coul + ';">' + marque + '</span>' +
      '<span style="flex:1;min-width:0;color:var(--muted);">' + n +
        (dossier[ech] ? ' <span style="color:var(--cream);">' +
          dossier[ech] + '</span>' : '') +
        (dossier[cour] ? ' · 📨 ' + dossier[cour] : '') +
      '</span></div>';
  }).join('');

  if(region && dossier.rembourse){
    const rb = document.createElement('div');
    rb.style.cssText = 'margin-top:7px;padding-top:7px;' +
      'border-top:1px solid rgba(255,255,255,.06);color:var(--warn-text);';
    rb.textContent = '↩️ Remboursé à la Région' +
      (dossier.montantRembourse ? ' : ' + dossier.montantRembourse + ' €' : '') +
      ' le ' + dossier.rembourse;
    z.appendChild(rb);
  }

  if(dossier.remarque){
    const rm = document.createElement('div');
    rm.style.cssText = 'margin-top:7px;color:var(--muted);' +
      'white-space:pre-wrap;';
    rm.textContent = dossier.remarque;
    z.appendChild(rm);
  }

  det.appendChild(z);
  zone.appendChild(det);
}


async function afficherEspaceEleve(nom, zone){
  if(!zone || !nom) return;

  zone.innerHTML = '<div style="font-size:12px;color:var(--muted);">' +
    'Lecture de son accès…</div>';

  let acces = null;
  try{
    const d = await appelPrep({ action: 'accesElevesList' });
    acces = ((d && d.acces) || [])
      .find(x => normaliserMot(x.eleve || '') === normaliserMot(nom)) || null;
  }catch(e){
    zone.innerHTML = '';
    return;
  }

  zone.innerHTML = '';

  const carte = document.createElement('div');
  carte.style.cssText = 'border:1px solid ' +
    (acces ? 'var(--orange)' : 'var(--line)') +
    ';border-radius:11px;padding:11px 12px;';

  if(!acces){
    carte.innerHTML = '<div style="font-size:13px;line-height:1.5;">' +
      '<strong>🔒 Pas de coin révisions</strong>' +
      '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      'Il ne peut ni réciter ses procédures, ni voir son code.</div></div>';

    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'margin-top:9px;padding:10px;font-size:13px;';
    b.textContent = '🔑 Lui créer un accès';
    b.addEventListener('click', async () => {
      b.disabled = true;
      try{
        const rep = await appelPrep({ action: 'accesEleveSet', eleve: nom });
        showToast('Code créé : ' + (rep.code || '') + ' ✅');
        /* On redessine : le bouton d'envoi apparaît avec le code */
        await afficherEspaceEleve(nom, zone);
      }catch(e){
        showToast('Impossible : ' + e.message);
        b.disabled = false;
      }
    });
    carte.appendChild(b);
    zone.appendChild(carte);
    return;
  }

  /* Il en a un : on montre le code et ce qu'il peut voir */
  carte.innerHTML = '<div style="display:flex;gap:9px;align-items:center;">' +
    '<span style="flex:1;min-width:0;font-size:13px;line-height:1.5;">' +
      '<strong>🔓 Coin révisions</strong>' +
      '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
        (acces.derniereVisite
          ? 'vu le ' + acces.derniereVisite.replace(/</g, '&lt;')
          : 'jamais venu') +
        (acces.langue ? ' · 🌍 ' + acces.langue.replace(/</g, '&lt;') : '') +
      '</div></span>' +
    '<code style="font-size:16px;letter-spacing:.12em;color:var(--accent-text);' +
      'font-weight:700;flex-shrink:0;">' + acces.code + '</code></div>';

  /* Ce qu'il trouve dans son espace */
  const zm = document.createElement('div');
  zm.style.cssText = 'margin-top:10px;padding-top:9px;' +
    'border-top:1px solid rgba(255,255,255,.08);';

  const ouverts = String(acces.modules || 'proccorriger').split(',')
    .map(x => x.trim()).filter(Boolean);

  MODULES_ELEVE.forEach(m => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:10px;' +
      'text-transform:none;font-size:14px;color:var(--cream);margin:0 0 7px;' +
      'font-weight:400;';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = (ouverts.indexOf(m.cle) !== -1);
    cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin:0;';
    cb.addEventListener('change', async () => {
      const liste = MODULES_ELEVE
        .filter((x, i) => {
          const c2 = zm.querySelectorAll('input[type="checkbox"]')[i];
          return c2 && c2.checked;
        })
        .map(x => x.cle);

      try{
        await appelPrep({ action: 'accesEleveSet', eleve: nom,
                          modules: liste.join(',') });
        showToast('Accès mis à jour ✅');
      }catch(e){
        showToast('Impossible : ' + e.message);
        cb.checked = !cb.checked;
      }
    });
    l.appendChild(cb);

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    t.textContent = m.nom;
    l.appendChild(t);

    zm.appendChild(l);
  });

  carte.appendChild(zm);

  /* Lui transmettre son accès : par mail, ou à copier */
  const messageAcces = () =>
    'Bonjour ' + nom.split(' ')[0] + ',\n\n' +
    'Voici ton coin révisions :\n' +
    'https://ec-sb.github.io/Bilan-conduite/eleve.html\n\n' +
    'Ton nom : ' + nom + '\n' +
    'Ton code : ' + acces.code + '\n\n' +
    'Tu y récites tes procédures et suis tes séances de code.\n' +
    'Ce n\'est pas le site pour réserver tes cours.\n\n' +
    'Garde ce code, il te servira à chaque fois.\n\n' +
    'À bientôt !\n' +
    'Évolution Conduites';

  const rEnvoi = document.createElement('div');
  rEnvoi.style.cssText = 'display:flex;gap:6px;margin-top:8px;';

  /* L'adresse est celle de sa fiche, saisie juste au-dessus */
  const bMail = document.createElement('button');
  bMail.className = 'btn btn-secondary';
  bMail.style.cssText = 'flex:1;padding:9px;font-size:12px;margin:0;';
  bMail.textContent = '✉️ Lui envoyer par mail';
  bMail.addEventListener('click', async () => {
    const champ = document.getElementById('fiMail');
    let adresse = champ ? champ.value.trim() : '';

    /* Confirmée avant l'envoi, comme partout ailleurs. Le champ de
       la fiche suit si elle a été corrigée. */
    adresse = await confirmerAdresseEleve(nom, adresse);
    if(!adresse) return;
    if(champ) champ.value = adresse;

    bMail.disabled = true;
    bMail.textContent = 'Envoi…';
    try{
      await appelPrep({
        action: 'mailBilan',
        to: [adresse],
        sujet: 'Ton coin révisions — Évolution Conduites',
        texte: messageAcces()
      });
      bMail.textContent = '✅ Envoyé';
      showToast('Envoyé à ' + adresse + ' ✅');
    }catch(e){
      bMail.disabled = false;
      bMail.textContent = '✉️ Lui envoyer par mail';
      showToast('Envoi impossible : ' + e.message);
    }
  });
  rEnvoi.appendChild(bMail);

  const bCop = document.createElement('button');
  bCop.className = 'btn btn-secondary';
  bCop.style.cssText = 'width:auto;padding:9px 12px;font-size:12px;margin:0;' +
    'flex-shrink:0;';
  bCop.textContent = '📋';
  bCop.title = 'Copier le message';
  bCop.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(messageAcces());
      showToast('Message copié ✅');
    }catch(e){ showToast('Copie impossible'); }
  });
  rEnvoi.appendChild(bCop);

  carte.appendChild(rEnvoi);

  zone.appendChild(carte);
}


/* ============================================================
   UNE SECONDE FORMATION POUR LE MÊME ÉLÈVE

   Quelqu'un qui passe son B puis sa remorque a deux parcours.
   Les bilans étant rangés par nom, il faut deux fiches — donc
   deux noms distincts.
   ============================================================ */

function dupliquerPourAutreFormation(nom, f){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(470px, 94vw);max-height:88vh;overflow-y:auto;';

  boite.innerHTML = '<h3>➕ Autre formation</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
      'line-height:1.5;">Une seconde fiche pour ' +
      String(nom).replace(/</g, '&lt;') + '. Ses bilans de conduite ' +
      'resteront séparés de ceux de sa formation actuelle' +
      (f.formation ? ' (' + String(f.formation).replace(/</g, '&lt;') + ')' : '') +
      '.</div>' +

    '<label for="dfForm">La nouvelle formation</label>' +
    '<select id="dfForm">' +
      toutesLesFormations()
        .filter(x => x.cle && x.cle !== f.formation)
        .map(x => '<option value="' + String(x.cle).replace(/"/g, '&quot;') +
             '">' + x.nom + '</option>').join('') +
    '</select>' +

    '<label for="dfNom">Nom de la seconde fiche</label>' +
    '<input type="text" id="dfNom">' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;' +
      'line-height:1.5;">Il doit différer du premier, sinon les deux ' +
      'parcours se mélangeraient. Le suffixe se règle tout seul.</div>';

  const selF = boite.querySelector('#dfForm');
  const chN = boite.querySelector('#dfNom');

  /* Le nom suit la formation choisie */
  const proposerNom = () => {
    const court = String(selF.value).replace(/[^A-Za-z0-9]/g, ' ')
      .trim().split(/\s+/).slice(0, 2).join(' ');
    chN.value = nom + ' (' + court + ')';
  };
  selF.addEventListener('change', proposerNom);
  proposerNom();

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bA);

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = '➕ Créer la fiche';
  bO.addEventListener('click', async () => {
    const nouveau = chN.value.trim();
    if(!nouveau){ showToast('Donne un nom à la seconde fiche.'); return; }

    if(normaliserMot(nouveau) === normaliserMot(nom)){
      showToast('Ce nom est identique : les bilans se mélangeraient.');
      return;
    }

    const existe = fichesEleves.some(x =>
      normaliserMot(x.eleve || '') === normaliserMot(nouveau));
    if(existe){
      showToast('Une fiche porte déjà ce nom.');
      return;
    }

    bO.disabled = true;
    bO.textContent = 'Création…';
    try{
      /* On reprend ses coordonnées, pas son parcours */
      await appelPrep({
        action: 'ficheSet',
        eleve: nouveau,
        telephone: f.telephone || '',
        email: f.email || '',
        formation: selF.value,
        messenger: f.messenger || '',
        site: f.site || '',
        remarques: 'Seconde formation de ' + nom,
        par: ACCES.moniteur || ''
      });

      document.body.removeChild(fond);
      showToast('Fiche créée : ' + nouveau + ' ✅');
      afficherRepertoire(true);
    }catch(e){
      showToast('Impossible : ' + e.message);
      bO.disabled = false;
      bO.textContent = '➕ Créer la fiche';
    }
  });
  r.appendChild(bO);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


function ouvrirFicheEleve(nom, f){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 94vw);max-height:90vh;overflow-y:auto;';

  boite.insertAdjacentHTML('beforeend',
    '<h3>' + nom.replace(/</g, '&lt;') + '</h3>' +
    '<div id="fiEspace" style="margin-bottom:14px;"></div>' +
    '<div id="fiFinancement" style="margin-bottom:14px;"></div>' +
    '<label for="fiTel">📱 Téléphone portable</label>' +
    '<input type="tel" id="fiTel" inputmode="tel" placeholder="06 12 34 56 78">' +
    '<label for="fiMail">✉️ Adresse mail</label>' +
    '<input type="email" id="fiMail" inputmode="email" placeholder="prenom.nom@exemple.fr">' +
    '<label for="fiMailPresc">✉️ Mail du prescripteur</label>' +
    '<input type="email" id="fiMailPresc" inputmode="email" ' +
      'placeholder="Représentant légal, ou celui qui paie">' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;line-height:1.4;">' +
      'Recevra une copie des bilans, en plus de l\'élève.</div>' +

    '<label for="fiMess">💬 Messenger</label>' +
    '<input type="text" id="fiMess" placeholder="Son profil : lien, ou m.me/pseudo">' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;line-height:1.4;">' +
      "Colle le lien de sa conversation, ou juste son pseudo. " +
      'Les moniteurs le retrouveront depuis le cours.</div>' +
    '<label for="fiGenre">Genre — pour les accords du bilan</label>' +
    '<select id="fiGenre">' +
      '<option value="">— non précisé —</option>' +
      '<option value="F">Féminin</option>' +
      '<option value="M">Masculin</option>' +
    '</select>' +
    '<label for="fiAnts">📇 Dossier ANTS</label>' +
    '<select id="fiAnts">' +
      '<option value="">— non renseigné —</option>' +
      '<option value="eleve">Fait par l\'élève</option>' +
      '<option value="nous">Fait par nous</option>' +
    '</select>' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;line-height:1.4;">' +
      'Information interne. Le questionnaire la reprend, et la met à jour ' +
      'si un moniteur la corrige.</div>' +

    '<label for="fiForm">🎓 Formation</label>' +
    '<select id="fiForm">' +
      toutesLesFormations().map(x =>
        '<option value="' + String(x.cle).replace(/"/g, '&quot;') + '">' +
        x.nom + '</option>').join('') +
      '<option value="__autre__">⌨️ Une autre formation…</option>' +
    '</select>' +
    '<label>🧭 Frise de formation</label>' +
    '<div style="background:var(--navy);border:1px solid var(--line);border-radius:10px;' +
      'padding:12px;margin-bottom:6px;font-size:15px;line-height:2;">' +
      '<input type="text" id="fiFriseAvant" inputmode="numeric" maxlength="2" ' +
      'style="width:52px;display:inline-block;margin:0 4px 0 0;padding:7px;' +
      'text-align:center;font-size:16px;">' +
      ' leçons de 2h + exam blanc +' +
      '<input type="text" id="fiFriseApres" inputmode="numeric" maxlength="2" ' +
      'style="width:52px;display:inline-block;margin:0 4px;padding:7px;' +
      'text-align:center;font-size:16px;">' +
      ' leçons de 2h <span id="fiFriseHeures" style="color:var(--accent-text);' +
      'font-weight:700;"></span> + 3h avant examen' +
    '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin:0 0 12px;line-height:1.4;">' +
      'Saisie ici une fois pour toutes : le questionnaire et les bilans la ' +
      'reprennent seuls. Laisse vide si elle n\'est pas encore déterminée.</div>' +
    '<input type="hidden" id="fiFrise">' +

    /* Le poste de conduite : ce qu'il faut savoir AVANT que l'élève
       monte dans la voiture. Ça ne change pas d'une leçon à
       l'autre — un élève qui a besoin du coussin en a besoin
       toujours — donc ça se saisit ici, une fois, et le moniteur le
       lit sur sa carte au lieu de se le faire redemander à chaque
       cours. */
    '<label>🚗 Poste de conduite</label>' +
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin-bottom:6px;font-weight:400;">' +
      '<input type="checkbox" id="fiAmenagee" style="width:19px;height:19px;">' +
      '♿ Conduite aménagée</label>' +
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin-bottom:6px;font-weight:400;">' +
      '<input type="checkbox" id="fiCoussin" style="width:19px;height:19px;">' +
      '🟩 Coussin vert</label>' +
    '<div style="font-size:11px;color:var(--muted);margin:0 0 12px;line-height:1.4;">' +
      'Affiché sur la carte du cours, pour que le moniteur prépare la voiture ' +
      'avant que l\'élève arrive.</div>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin-bottom:6px;font-weight:400;">' +
      '<input type="checkbox" id="fiAutreAE" style="width:19px;height:19px;">' +
      '🏫 Vient d\'une autre auto-école</label>' +
    '<input type="text" id="fiAutreAENom" placeholder="Nom de l\'auto-école précédente" ' +
      'style="display:none;">' +

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

  /* Le même élève sur une seconde formation : une fiche à part,
     pour que les bilans ne se mélangent pas. */
  if(f){
    const bDup = document.createElement('button');
    bDup.className = 'btn btn-secondary';
    bDup.style.cssText = 'margin-top:8px;padding:11px;font-size:13px;';
    bDup.textContent = '➕ Une autre formation pour cet élève';
    bDup.addEventListener('click', () => {
      document.body.removeChild(fond);
      dupliquerPourAutreFormation(nom, f);
    });
    boite.appendChild(bDup);
  }

  const msg = document.createElement('div');
  msg.style.cssText = 'margin-top:8px;font-size:13px;min-height:16px;';
  boite.appendChild(msg);

  fond.appendChild(boite);
  document.body.appendChild(fond);

  /* L'accès à l'espace, chargé après coup : la fiche s'ouvre sans
     attendre le serveur. */
  const zEspace = boite.querySelector('#fiEspace');
  if(zEspace) afficherEspaceEleve(nom, zEspace);

  /* Son financement extérieur, s il en a un */
  const zFin = boite.querySelector('#fiFinancement');
  if(zFin) afficherFinancementEleve(nom, zFin);

  const g = id => boite.querySelector('#' + id);
  g('fiTel').value = (f && f.telephone) || '';
  g('fiMail').value = (f && f.email) || '';
  g('fiMailPresc').value = (f && f.mailPrescripteur) || '';
  g('fiMess').value = (f && f.messenger) || '';
  g('fiGenre').value = (f && f.genre) || '';
  g('fiAnts').value = (f && f.ants) || '';
  /* On relit la frise enregistrée pour retrouver les deux nombres */
  const friseAvant = ((f && f.frise) || '').match(/^\s*(\d+)\s*leçons?\s*de\s*2h/i);
  const friseApres = ((f && f.frise) || '').match(/\+\s*(\d+)\s*leçons?\s*de\s*2h/i);
  g('fiFriseAvant').value = friseAvant ? friseAvant[1] : '';
  g('fiFriseApres').value = friseApres ? friseApres[1] : '';

  function majFrise(){
    const a = parseInt(g('fiFriseAvant').value, 10);
    const b = parseInt(g('fiFriseApres').value, 10);
    g('fiFriseHeures').textContent = b ? '(' + (b * 2) + 'h)' : '';
    g('fiFrise').value = (a && b)
      ? a + ' leçons de 2h + exam blanc + ' + b + ' leçons de 2h (' + (b * 2) +
        'h) + 3h avant examen'
      : '';
  }
  ['fiFriseAvant', 'fiFriseApres'].forEach(id => {
    g(id).addEventListener('input', majFrise);
  });
  majFrise();
  g('fiAmenagee').checked = String((f && f.amenagee) || '') === 'oui';
  /* Cocher ici demande aussi QUOI monter dans la voiture : la
     règle est la même partout, elle ne vit qu'à un endroit. */
  g('fiAmenagee').addEventListener('change', async () => {
    if(!g('fiAmenagee').checked) return;
    const choisis = await choisirLesAmenagements(nom);
    if(!choisis) g('fiAmenagee').checked = false;
  });
  g('fiCoussin').checked  = String((f && f.coussin) || '') === 'oui';
  g('fiAutreAE').checked = !!(f && f.autreAE);
  g('fiAutreAENom').value = (f && f.autreAENom) || '';
  g('fiAutreAENom').style.display = g('fiAutreAE').checked ? 'block' : 'none';
  g('fiAutreAE').addEventListener('change', () => {
    g('fiAutreAENom').style.display = g('fiAutreAE').checked ? 'block' : 'none';
  });
  /* Une formation saisie autrefois et absente de la liste doit
     rester lisible : on l'ajoute plutôt que de l'effacer. */
  const formActuelle = (f && f.formation) || '';
  const selForm = g('fiForm');
  if(formActuelle && ![...selForm.options].some(o => o.value === formActuelle)){
    const o = document.createElement('option');
    o.value = formActuelle;
    o.textContent = formActuelle;
    selForm.insertBefore(o, selForm.lastElementChild);
  }
  selForm.value = formActuelle;

  /* Ajouter une formation à la main */
  selForm.addEventListener('change', async () => {
    if(selForm.value !== '__autre__') return;

    const nom = await demander('Nom de la formation', '', 'Nouvelle formation');
    if(!nom || !nom.trim()){ selForm.value = formActuelle; return; }

    const propre = nom.trim();
    try{
      const l = formationsAjoutees();
      if(l.indexOf(propre) === -1){
        l.push(propre);
        localStorage.setItem(CLE_FORMATIONS, JSON.stringify(l));
      }
    }catch(e){}

    const o = document.createElement('option');
    o.value = propre;
    o.textContent = propre;
    selForm.insertBefore(o, selForm.lastElementChild);
    selForm.value = propre;
  });

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
                        mailPrescripteur: g('fiMailPresc').value.trim(),
                        genre: g('fiGenre').value,
                        ants: g('fiAnts').value,
                        frise: g('fiFrise').value.trim(),
                        autreAE: g('fiAutreAE').checked ? 'oui' : '',
                        autreAENom: g('fiAutreAENom').value.trim(),
                        /* 'non' et pas '' : ces deux cases doivent
                           pouvoir se DÉCOCHER. Côté serveur, un
                           champ vide veut dire « le formulaire
                           n'en parlait pas » et ne touche à rien. */
                        amenagee: g('fiAmenagee').checked ? 'oui' : 'non',
                        coussin: g('fiCoussin').checked ? 'oui' : 'non',
                        remarques: g('fiRem').value.trim() });
      /* La fiche en mémoire suit tout de suite : l'écran ne doit pas
         attendre le rechargement pour montrer la bonne valeur. */
      const f2 = ficheDe(nom);
      const saisi = { telephone: tel, email: mail, formation: g('fiForm').value,
                      messenger: g('fiMess').value.trim(),
                      mailPrescripteur: g('fiMailPresc').value.trim(),
                      genre: g('fiGenre').value, ants: g('fiAnts').value,
                      frise: g('fiFrise').value.trim(),
                      autreAE: g('fiAutreAE').checked ? 'oui' : '',
                      autreAENom: g('fiAutreAENom').value.trim(),
                      amenagee: g('fiAmenagee').checked ? 'oui' : 'non',
                      coussin: g('fiCoussin').checked ? 'oui' : 'non',
                      remarques: g('fiRem').value.trim() };
      if(f2) Object.assign(f2, saisi);
      else fichesEleves.push(Object.assign({ eleve: nom }, saisi));
      fichesLues = 0;

      document.body.removeChild(fond);
      showToast('Fiche enregistrée ✅');
      afficherRepertoire(true);
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
const ENTETES_GENRE = ['genre', 'civilite', 'civilité', 'sexe', 'titre', 'madame monsieur'];

/* « Madame », « M. », « F » : tout devient F ou M. */
function normaliserGenre(v){
  const t = normaliserMot(v || '');
  if(!t) return '';
  if(t === 'f' || t.indexOf('mme') === 0 || t.indexOf('madame') === 0 ||
     t.indexOf('mademoiselle') === 0 || t.indexOf('femme') === 0 ||
     t.indexOf('fille') === 0) return 'F';
  if(t === 'm' || t.indexOf('m.') === 0 || t.indexOf('monsieur') === 0 ||
     t.indexOf('homme') === 0 || t.indexOf('garcon') === 0) return 'M';
  return '';
}

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
  const iGenre = entete ? trouver(ENTETES_GENRE) : -1;

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
      formation: iForm >= 0 ? (cases[iForm] || '').trim() : '',
      genre: iGenre >= 0 ? normaliserGenre(cases[iGenre]) : ''
    });
  });

  const dit = [];
  dit.push(fiches.length + ' élève(s)');
  const nTel = fiches.filter(f => f.telephone).length;
  const nMail = fiches.filter(f => f.email).length;
  if(nTel) dit.push(nTel + ' avec téléphone');
  if(nMail) dit.push(nMail + ' avec mail');
  const nGenre = fiches.filter(f => f.genre).length;
  if(nGenre) dit.push(nGenre + ' avec genre');

  const info = dit.join(' · ') + ' · séparateur « ' +
    (sep === '\t' ? 'tabulation' : sep) + ' » · nom : ' +
    colonnes.map(c => premiere[c] || ('n°' + (c + 1))).join(' + ') +
    (colTel >= 0 ? ' · tél : ' + (premiere[colTel] || ('n°' + (colTel + 1))) : '') +
    (colMail >= 0 ? ' · mail : ' + (premiere[colMail] || ('n°' + (colMail + 1))) : '') +
    (iGenre >= 0 ? ' · genre : ' + (premiere[iGenre] || ('n°' + (iGenre + 1))) : '');

  return { fiches: fiches, noms: fiches.map(f => f.eleve), info: info };
}

/* Le fichier choisi remplit la zone de texte, pour relecture */
function brancherFichierCsv(){
  /* Le bouton de création manuelle, branché au même endroit */
  const bNouveau = $('btnNouvelEleve');
  if(bNouveau && !bNouveau._branche){
    bNouveau._branche = true;
    bNouveau.addEventListener('click', creerEleveALaMain);
  }

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
      /* Le genre apparaît dans l'aperçu : sans lui, impossible de
         vérifier avant d'importer que la colonne a bien été lue. */
      zone.value = (r.fiches || []).map(f => {
        const g = f.genre === 'F' ? '♀' : (f.genre === 'M' ? '♂' : '');
        return [g, f.eleve, f.telephone, f.email, f.formation]
          .filter(Boolean).join(' · ');
      }).join('\n');
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
   L'ADRESSE MAIL DE L'ÉLÈVE, AU DÉMARRAGE DU COURS

   Le moniteur la saisit une fois ; elle est retenue et proposée à
   tous les autres ensuite.

   C'était le Messenger. Les moniteurs n'écrivent plus que par
   mail, et c'est cette adresse qu'il faut pour envoyer un bilan :
   demander l'autre au bord de la route n'apportait plus rien. Les
   identifiants de champ n'ont pas changé — les renommer aurait
   touché neuf endroits pour un gain nul.
   ============================================================ */
let messengerCharge = '';

async function chargerMessengerEleve(){
  const champ = $('eleveMessenger');
  const nom = $('studentName') ? $('studentName').value.trim() : '';
  if(!champ) return;

  majLienMessenger();
  if(nom.length < 3){
    champ.value = ''; messengerCharge = '';
    majEtatMailEleve();
    return;
  }

  /* Le dossier est récupéré dès la saisie du nom, pendant que le
     moniteur remplit le reste : au démarrage, tout est déjà prêt. */
  if(typeof chargerDossierEleve === 'function'){
    chargerDossierEleve(nom).catch(() => {});
  }
  if(typeof consignesDe === 'function'){
    consignesDe(nom).catch(() => {});
  }

  try{
    if(!fichesEleves.length) await chargerFiches();

    /* La liste peut dater d'avant la saisie d'un collègue : si cet
       élève n'a pas de Messenger connu, on relit avant de conclure.
       Deux minutes de battement pour ne pas relire à chaque frappe. */
    let f = ficheDe(nom);
    if((!f || !f.email) && Date.now() - fichesLues > 120000){
      await chargerFiches();
      f = ficheDe(nom);
    }
    /* On n'écrase pas une saisie en cours */
    if(champ.value.trim() && champ.value.trim() !== messengerCharge) return;
    champ.value = (f && f.email) || '';
    messengerCharge = champ.value;
    majLienMessenger();
    majEtatMailEleve();
  }catch(e){}
}

/* ------------------------------------------------------------
   CONFIRMER L'ADRESSE AVANT D'ENVOYER

   Une adresse enregistrée il y a huit mois peut ne plus être la
   bonne, et on ne s'en aperçoit jamais : le mail part, personne ne
   le reçoit, et rien ne le dit. Le moniteur voit l'élève devant
   lui — c'est le seul moment où la question peut être posée.

   Une seule fenêtre pour les sept endroits qui écrivent à un
   élève : sans cela, corriger l'adresse marcherait à un endroit et
   pas aux six autres.

   Rend l'adresse à utiliser, ou null si on renonce. Une adresse
   corrigée redescend sur la fiche : la prochaine fois, elle sera
   la bonne pour tout le monde.
   ------------------------------------------------------------ */
function confirmerAdresseEleve(nom, adresseConnue){
  return new Promise(resolve => {
    const depart = String(adresseConnue || '').trim();

    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(430px, 94vw);';

    boite.innerHTML =
      '<h3>✉️ Envoyer à</h3>' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:12px;line-height:1.5;">' +
        '<strong style="color:var(--cream);">' +
        String(nom || '').replace(/</g, '&lt;') + '</strong><br>' +
        (depart ? 'Vérifie l\'adresse : elle peut avoir changé depuis sa dernière saisie.'
                : 'Aucune adresse enregistrée — demande-la-lui.') + '</div>' +
      '<label for="cadMail">Adresse mail</label>' +
      '<input type="email" id="cadMail" inputmode="email" autocomplete="off" ' +
        'placeholder="prenom.nom@exemple.fr">' +
      '<div id="cadEtat" style="font-size:12px;color:var(--muted);' +
      'margin:-6px 0 12px;line-height:1.4;"></div>';

    const champ = boite.querySelector('#cadMail');
    const etat = boite.querySelector('#cadEtat');
    champ.value = depart;

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';

    const bAnn = document.createElement('button');
    bAnn.className = 'btn btn-secondary';
    bAnn.textContent = 'Annuler';
    bAnn.addEventListener('click', () => {
      document.body.removeChild(fond);
      resolve(null);
    });
    rangee.appendChild(bAnn);

    const bOk = document.createElement('button');
    bOk.className = 'btn btn-primary';
    bOk.textContent = '✉️ Envoyer';
    bOk.addEventListener('click', async () => {
      const v = champ.value.trim();
      if(!v || v.indexOf('@') === -1){
        etat.style.color = 'var(--red)';
        etat.textContent = 'Cette adresse ne semble pas valable.';
        return;
      }
      /* Corrigée : elle redescend sur la fiche, sinon on la
         recorrigerait au prochain envoi. L'envoi ne dépend pas de
         cet enregistrement — il part même si la fiche résiste. */
      if(v !== depart){
        try{
          await appelPrep({ action: 'ficheSet', eleve: nom, email: v });
          const f = ficheDe(nom);
          if(f) f.email = v; else fichesEleves.push({ eleve: nom, email: v });
          fichesLues = 0;
        }catch(e){ /* l'envoi prime */ }
      }
      document.body.removeChild(fond);
      resolve(v);
    });
    rangee.appendChild(bOk);

    boite.appendChild(rangee);
    fond.appendChild(boite);
    document.body.appendChild(fond);
    setTimeout(() => champ.focus(), 80);
  });
}

/* ------------------------------------------------------------
   L'ADRESSE MANQUANTE SE VOIT

   Sans elle, le bilan ne pourra pas partir — et on ne s'en aperçoit
   qu'au moment de l'envoyer, cours terminé, élève reparti. Le champ
   le dit donc pendant le cours, tant qu'il est encore temps de la
   demander.

   Rien tant qu'aucun élève n'est choisi : réclamer une adresse à
   personne, c'est ce que faisait le bouton « Compléter les infos »
   sur un écran vide.
   ------------------------------------------------------------ */
function majEtatMailEleve(){
  const champ = $('eleveMessenger');
  const etat = $('eleveMessengerEtat');
  const lab = document.querySelector('label[for="eleveMessenger"]');
  if(!champ) return;

  const nom = $('studentName') ? $('studentName').value.trim() : '';
  const connu = nom.length >= 3 && nom.split(/\s+/).length >= 2;
  const v = champ.value.trim();

  const peindre = (couleur, texte, gras) => {
    champ.style.borderColor = couleur || '';
    if(lab){ lab.style.color = couleur || ''; }
    if(etat){
      etat.style.color = couleur || 'var(--muted)';
      etat.style.fontWeight = gras ? '700' : '';
      etat.textContent = texte;
    }
  };

  if(!connu){
    peindre('', 'Saisie une fois, elle est retenue : tous les moniteurs la retrouveront ici.');
    return;
  }
  if(!v){
    peindre('var(--red)',
            "⚠️ Aucune adresse mail — son bilan ne pourra pas lui être envoyé. " +
            'Demande-la-lui pendant le cours.', true);
    return;
  }
  if(v.indexOf('@') === -1){
    peindre('var(--warn-text)', 'Cette adresse ne semble pas valable.', true);
    return;
  }
  peindre('', '✅ Enregistrée : tous les moniteurs la retrouveront ici.');
}

function majLienMessenger(){
  const champ = $('eleveMessenger');
  const lien = $('eleveMessengerLien');
  if(!champ || !lien) return;

  const v = champ.value.trim();
  /* Le bouton n'apparaît que sur une adresse plausible : offrir
     d'écrire à « jean » ouvrirait un message sans destinataire. */
  if(!v || v.indexOf('@') === -1){ lien.style.display = 'none'; return; }
  lien.href = 'mailto:' + v;
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

  majEtatMailEleve();
  if(!nom || nom.split(' ').length < 2) return;
  if(v === messengerCharge) return;
  /* Une adresse sans @ n'est pas une adresse : l'enregistrer
     empêcherait le bilan de partir sans qu'on sache pourquoi. */
  if(v && v.indexOf('@') === -1){
    if(etat){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = "Cette adresse ne semble pas valable — elle n'est pas enregistrée.";
    }
    return;
  }

  try{
    await appelPrep({ action: 'ficheSet', eleve: nom, email: v });
    messengerCharge = v;
    /* La fiche en mémoire suit, sinon le répertoire et le bouton
       d'envoi continueraient d'ignorer cette adresse. */
    const f3 = ficheDe(nom);
    if(f3) f3.email = v;
    else fichesEleves.push({ eleve: nom, email: v });
    /* Et la prochaine lecture ira au serveur : la mémoire seule
       ne suffit pas si un autre onglet a modifié la fiche. */
    fichesLues = 0;
    if(etat){
      etat.style.color = 'var(--accent-text)';
      etat.textContent = '✅ Enregistrée : les autres moniteurs la retrouveront ici.';
    }
    fichesEleves = [];
  }catch(e){
    if(etat){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Non enregistré : ' + e.message;
    }
  }
}


/* ============================================================
   CHOISIR UN ÉLÈVE, EN SACHANT CE QU'ON FAIT
   Un champ libre ne dit pas si le nom saisi correspond à un élève
   existant ou en crée un nouveau. Une faute de frappe passe alors
   inaperçue et fabrique un doublon qu'on ne verra que des mois
   plus tard, quand l'historique sera coupé en deux.
   ============================================================ */
function choisirEleveConnu(titre, aide){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(460px, 94vw);';

    boite.insertAdjacentHTML('beforeend',
      '<h3>' + String(titre || 'Élève').replace(/</g, '&lt;') + '</h3>' +
      (aide ? '<div style="font-size:13px;color:var(--muted);line-height:1.5;' +
              'margin-bottom:12px;">' + aide + '</div>' : '') +
      '<label for="celNom">Prénom et nom de l\'élève</label>');

    const champ = document.createElement('input');
    champ.type = 'text';
    champ.id = 'celNom';
    champ.setAttribute('list', 'celListe');
    champ.autocomplete = 'off';
    champ.placeholder = 'Tape les premières lettres';
    boite.appendChild(champ);

    const dl = document.createElement('datalist');
    dl.id = 'celListe';
    (elevesConnus || []).slice().sort((a, b) => a.localeCompare(b, 'fr'))
      .forEach(n => {
        const o = document.createElement('option');
        o.value = n;
        dl.appendChild(o);
      });
    boite.appendChild(dl);

    /* Le verdict, en direct : existant ou nouveau */
    const etat = document.createElement('div');
    etat.style.cssText = 'font-size:13px;line-height:1.5;min-height:38px;margin-bottom:10px;';
    boite.appendChild(etat);

    /* Les noms proches, quand la saisie ne tombe pas juste */
    const proches = document.createElement('div');
    proches.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;';
    boite.appendChild(proches);

    let exact = null;

    function juger(){
      const v = champ.value.trim();
      proches.innerHTML = '';

      if(v.length < 2){
        etat.innerHTML = '';
        exact = null;
        return;
      }

      exact = (elevesConnus || []).find(n => normaliserMot(n) === normaliserMot(v)) || null;

      if(exact){
        etat.innerHTML = '<span style="color:var(--accent-text);font-weight:700;">' +
          '✅ Élève existant</span><br><span style="font-size:12px;color:var(--muted);">' +
          'Son historique et sa fiche seront rattachés.</span>';
        return;
      }

      /* Ceux qui commencent pareil : la faute de frappe se voit là */
      const q = normaliserMot(v);
      const candidats = (elevesConnus || [])
        .filter(n => normaliserMot(n).indexOf(q.split(' ')[0]) !== -1)
        .slice(0, 6);

      etat.innerHTML = '<span style="color:var(--warn-text);font-weight:700;">' +
        '⚠️ Nouvel élève</span><br><span style="font-size:12px;color:var(--muted);">' +
        (candidats.length
          ? 'Ce nom ne correspond à aucun élève connu. Vérifie ci-dessous.'
          : 'Ce nom ne correspond à aucun élève connu. Il sera créé.') + '</span>';

      candidats.forEach(n => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:5px 10px;font-size:12px;margin:0;';
        b.textContent = n;
        b.title = 'Choisir ' + n;
        b.addEventListener('click', () => { champ.value = n; juger(); champ.focus(); });
        proches.appendChild(b);
      });
    }

    champ.addEventListener('input', juger);

    const r = document.createElement('div');
    r.className = 'btn-row';
    const bAnn = document.createElement('button');
    bAnn.className = 'btn btn-secondary';
    bAnn.textContent = 'Annuler';
    const bOk = document.createElement('button');
    bOk.className = 'btn btn-primary';
    bOk.textContent = 'Valider';
    r.appendChild(bAnn); r.appendChild(bOk);
    boite.appendChild(r);

    fond.appendChild(boite);
    document.body.appendChild(fond);

    const fermer = v => { document.body.removeChild(fond); resolve(v); };

    bAnn.addEventListener('click', () => fermer(null));
    bOk.addEventListener('click', async () => {
      const v = champ.value.trim();
      if(v.length < 3){
        etat.innerHTML = '<span style="color:var(--warn-text);">Nom trop court.</span>';
        return;
      }
      /* Une création se confirme : c'est irréversible en pratique */
      if(!exact && !await confirmer(
          'Créer un nouvel élève « ' + v + '» ?\n\n' +
          "S'il existe déjà sous une autre orthographe, tu créeras un doublon " +
          'et son historique sera coupé en deux.')) return;
      fermer(exact || v);
    });

    champ.addEventListener('keydown', e => { if(e.key === 'Enter') bOk.click(); });
    setTimeout(() => champ.focus(), 100);
  });
}

/* Créer un élève de toutes pièces : on demande son nom, puis on
   ouvre sa fiche vide. Toutes les informations se saisissent là,
   au même endroit que pour une modification. */
async function creerEleveALaMain(){
  const nom = await choisirEleveConnu(
    'Créer un élève',
    "Vérifie qu'il n'existe pas déjà : les élèves connus sont proposés.");
  if(!nom) return;

  const existe = ficheDe(nom);
  if(existe && !await confirmer(
      '« ' + nom + " » a déjà une fiche.\n\nL'ouvrir pour la compléter ?")) return;

  ouvrirFicheEleve(nom, existe || {});
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-fenetres.js'] = true;
