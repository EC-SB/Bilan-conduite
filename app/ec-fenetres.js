/* Déployé le 03/09/2026 à 11:30 — v836 */
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
const FORME_DOSSIER = 6;   /* 6 : + le simulateur nuit et risques déjà fait */

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
  { cle: 'CS BV',           nom: '🚗 CS manuelle',            voiture: true },
  { cle: 'CS BEA',          nom: '🚗 CS automatique',         voiture: true },
  /* UN ÉLÈVE QUI VIENT D'AILLEURS.

     Son dossier est dans une autre auto-école ; il prend des
     leçons ici. La boîte, le modèle de bilan et la frise sont les
     mêmes que pour les nôtres — c'est la même conduite. Ce qui
     change, c'est qu'on sait d'où il vient.

     Les clés ne disent pas « auto école » exprès : plusieurs
     endroits déduisaient la boîte en cherchant « auto » dans le
     nom de la formation, et « Autre auto école BV » les aurait
     tous envoyés sur la boîte automatique. */
  { cle: 'Autre AE BV',      nom: '🏫 Autre auto école BV',     voiture: true },
  { cle: 'Autre AE BEA',     nom: '🏫 Autre auto école BEA',    voiture: true },
  { cle: 'AAC BV autre AE',  nom: '🏫 AAC Boite Manuelle autre AE',    voiture: true },
  { cle: 'AAC BEA autre AE', nom: '🏫 AAC Boite Automatique autre AE', voiture: true },
  { cle: 'CS BV autre AE',   nom: '🏫 CS Boite Manuelle autre AE',     voiture: true },
  { cle: 'CS BEA autre AE',  nom: '🏫 CS Boite Automatique autre AE',  voiture: true },
  /* B78 est le code porté sur un permis obtenu en boîte automatique :
     la passerelle mène au permis B, et se conduit en manuelle. */
  { cle: 'Passerelle BEA→BV',   nom: '🚗 Passerelle B78 → B (manuelle)', voiture: true },
  /* LA RÉGULARISATION DE PERMIS.

     « Des élèves qui ont déjà le permis mais qui doivent faire des
     leçons avant de repasser devant la préfecture pour valider un
     nouveau permis avec des aménagements du véhicule. Ça découle
     de l'onglet handicap. »

     Ni frise, ni examen blanc, ni simulateur, ni rendez-vous
     post-permis — et le poste de conduite est obligatoire : c'est
     tout l'objet de ces leçons. Voir PARCOURS_FORMATION. */
  { cle: 'Régularisation BEA', nom: '♿ Régularisation de permis (BEA)', voiture: true },
  { cle: 'Régularisation BV',  nom: '♿ Régularisation de permis (BV)',  voiture: true },
  /* LA REMISE À NIVEAU.

     Un conducteur qui a son permis et qui n'a plus conduit depuis
     longtemps. Comme la régularisation : ni frise, ni examen blanc,
     ni date d'examen, ni rendez-vous post-permis. Ce qui lui est
     propre : son parcours se compte EN HEURES et en trois temps —
     simulateur, notre voiture, la sienne. Voir PARCOURS_FORMATION.

     ⚠️ « Remise à niveau BV » existait déjà, ajoutée à la main :
     elle ne vivait que dans le navigateur du bureau, et les
     moniteurs ne l'avaient pas. L'orthographe est reprise au mot
     près — sinon les élèves qui la portent déjà ne retomberaient
     pas sur ce parcours. */
  { cle: 'Remise à niveau BV',  nom: '🔄 Remise à niveau (BV)',  voiture: true },
  { cle: 'Remise à niveau BEA', nom: '🔄 Remise à niveau (BEA)', voiture: true },
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

/* ⚠️ UNE FORMATION AJOUTÉE À LA MAIN EST UNE FORMATION VOITURE,
   SAUF SI SON NOM DIT LE CONTRAIRE.

   Elles arrivaient toutes avec « voiture: false ». Or le
   questionnaire ne propose que les formations voiture : une
   formation ajoutée à la main N'APPARAISSAIT DONC JAMAIS dans son
   menu. Le moniteur ouvrait le questionnaire d'un élève qui en
   portait une et voyait le champ Formation vide — « ça n'y est
   plus » — alors que sa fiche, elle, l'avait toujours.

   On leur applique la même lecture qu'à n'importe quelle formation
   inconnue ailleurs dans l'outil : moto, remorque et voiturette ne
   font pas de bilan de conduite, tout le reste en fait un. */
function toutesLesFormations(){
  return FORMATIONS_BASE.concat(
    formationsAjoutees().map(x => ({
      cle: x, nom: x, ajoutee: true,
      voiture: !/moto|scooter|\bA1\b|\bA2\b|\bAM\b|\bBE\b|remorque|roues|voiturette/i
                 .test(String(x))
    })));
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
  return trouverParNom(fichesEleves, nom);
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


/* LA DATE DE NAISSANCE, DEPUIS N'IMPORTE OÙ.

   Elle vit sur la fiche, donc elle s'écrit ICI — comme les deux
   pastilles au-dessus. Le suivi AAC en a besoin (l'âge est une des
   deux conditions de l'examen), le dossier élève l'affichera, et il
   n'y aura pas trois écrans qui écrivent chacun sa version.

   'non' l'efface, un vide ne touche à rien : la même règle que
   partout ailleurs sur cette fiche. */
async function fixerDateNaissance(nom, iso){
  const propre = String(nom || '').trim();
  if(!propre) return false;
  const v = String(iso || '').trim() || 'non';

  try{
    await appelPrep({ action: 'ficheSet', eleve: propre, naissance: v });
  }catch(e){
    showToast('Enregistrement impossible : ' + e.message);
    return false;
  }

  /* La mémoire suit tout de suite, et garde la VALEUR — pas le mot
     qui l'efface. */
  const f = ficheDe(propre);
  const gardee = (v === 'non') ? '' : v;
  if(f) f.naissance = gardee;
  else fichesEleves.push({ eleve: propre, naissance: gardee });
  return true;
}


/* ============================================================
   CORRIGER UNE FAUTE DE FRAPPE DANS UN NOM

   « Il faut que je puisse changer le nom prénom si j'ai fait une
   erreur de frappe. »

   Ce n'est PAS une modification de fiche — et c'est pour ça que ce
   n'est pas un champ de plus dans la fenêtre au-dessus. LE NOM EST
   LA CLÉ : il n'existe pas d'identifiant d'élève dans ce classeur,
   chaque feuille retrouve la bonne ligne en comparant des noms.
   Corriger le nom du seul répertoire couperait le dossier en deux —
   les bilans, le suivi, la place d'examen et l'accès à l'espace
   resteraient accrochés à l'ancienne orthographe, invisibles depuis
   la nouvelle, et le bureau les croirait perdus.

   Le renommage vit donc dans le classeur, en un seul passage
   (« renommerEleve », côté Apps Script), et il vit ICI côté écran,
   avec le reste de la fiche. Le dossier élève ne fait que
   l'appeler : cette page-là n'écrit rien elle-même.

   Rend le nouveau nom, ou null si rien n'a changé.
   ============================================================ */
function corrigerNomEleve(ancien){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';

    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.maxWidth = 'min(420px, 92vw)';

    const h = document.createElement('h3');
    h.textContent = '✏️ Corriger le nom';
    boite.appendChild(h);

    const avert = document.createElement('div');
    avert.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;' +
      'margin-bottom:10px;';
    avert.textContent = 'Le nom sera corrigé partout : bilans, suivi, ' +
      "places d'examen, cours préparés, consignes, accès à l'espace " +
      "élève. À n'utiliser que pour une faute de frappe — pas pour " +
      "mettre quelqu'un d'autre à la place.";
    boite.appendChild(avert);

    const champ = document.createElement('input');
    champ.type = 'text';
    champ.value = ancien;
    champ.style.cssText = 'width:100%;font-size:16px;padding:12px;';
    boite.appendChild(champ);

    const msg = document.createElement('div');
    msg.style.cssText = 'font-size:12px;margin-top:8px;min-height:16px;';
    boite.appendChild(msg);

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';

    const annuler = document.createElement('button');
    annuler.className = 'btn btn-secondary';
    annuler.textContent = 'Annuler';

    const ok = document.createElement('button');
    ok.className = 'btn btn-primary';
    ok.textContent = '💾 Corriger partout';

    function fermer(valeur){
      if(fond.parentNode) document.body.removeChild(fond);
      resolve(valeur);
    }
    annuler.addEventListener('click', () => fermer(null));
    fond.addEventListener('click', e => { if(e.target === fond) fermer(null); });

    ok.addEventListener('click', async () => {
      const propre = champ.value.trim().replace(/\s+/g, ' ');

      if(propre.length < 3 || propre.split(' ').length < 2){
        msg.style.color = 'var(--warn-text)';
        msg.textContent = 'Il faut un prénom ET un nom.';
        return;
      }
      if(propre === ancien) return fermer(null);

      /* Un nom déjà pris, c'est deux dossiers fusionnés sans le
         vouloir, et rien ne permettrait ensuite de les redémêler. Le
         classeur refuse aussi — le dire ici évite l'aller-retour. */
      if(ficheDe(propre)){
        msg.style.color = 'var(--warn-text)';
        msg.textContent = 'Un élève porte déjà ce nom.';
        return;
      }

      ok.disabled = true;
      ok.textContent = 'Correction…';
      try{
        /* « eleve » sert au journal du classeur, qui nomme sa
           colonne Élève à partir de là ; « ancien » lui donne son
           détail, sans lequel on ne pourrait pas revenir dessus. */
        const r = await appelPrep({ action: 'eleveRenommer',
                                    ancien: ancien, nouveau: propre,
                                    eleve: propre });
        if(r && r.status === 'error') throw new Error(r.message);

        /* TOUT est à relire. Les listes en mémoire portent encore
           l'ancien nom, et l'index par nom est accroché au tableau :
           le corriger ligne à ligne serait exactement la faute que
           ce dossier répare partout. On relit, c'est tout. */
        viderCaches();
        await Promise.all([
          chargerFiches(),
          (typeof chargerBureau === 'function') ? chargerBureau(true) : null,
          (typeof chargerPrepares === 'function') ? chargerPrepares() : null,
          (typeof chargerSessionsPermis === 'function')
            ? chargerSessionsPermis() : null
        ].filter(Boolean).map(p => Promise.resolve(p).catch(() => null)));

        /* ⚠️ RELIRE NE SUFFIT PAS : IL FAUT REDESSINER.

           « Ça le change bien, par contre il ne s'affiche pas en
           direct, je dois recharger la page. » Les listes en mémoire
           étaient bien à jour — mais rien n'avait redemandé aux
           écrans de se repeindre, et ils montraient encore ce qui
           avait été dessiné avant. Chacun est isolé : un écran fermé
           ou un module absent ne doit pas faire échouer un renommage
           qui, lui, est déjà fait. */
        [['prochains cours', () => (typeof afficherPrepares === 'function') &&
                                    afficherPrepares(false, true)],
         ['bureau',          () => (typeof redessinerBureau === 'function') &&
                                    redessinerBureau()],
         ['sessions',        () => (typeof redessinerSessions === 'function') &&
                                    redessinerSessions()],
         ['répertoire',      () => (typeof afficherRepertoire === 'function') &&
                                    afficherRepertoire(false)]
        ].forEach(([quoi, f]) => {
          try{ f(); }catch(e){ console.warn('Après renommage — ' + quoi + ' :', e); }
        });

        showToast('✅ ' + propre + ' — ' + ((r && r.lignes) || 0) +
                  ' ligne(s) corrigée(s)' +
                  /* Une reprise après un appel resté en route : on le
                     dit, sinon « 0 ligne » ressemble à un échec. */
                  (r && r.reprise ? ' (reprise)' : ''));
        fermer(propre);
      }catch(e){
        msg.style.color = 'var(--warn-text)';
        msg.textContent = 'Impossible : ' + (e.message || e);
        ok.disabled = false;
        ok.textContent = '💾 Corriger partout';
      }
    });

    rangee.appendChild(annuler);
    rangee.appendChild(ok);
    boite.appendChild(rangee);
    fond.appendChild(boite);
    document.body.appendChild(fond);
    setTimeout(() => champ.focus(), 80);
  });
}

/* ============================================================
   LES DEUX PASTILLES DU POSTE DE CONDUITE

   ♿ conduite aménagée, 🟩 coussin rehausseur. Elles se cochent
   sans ouvrir la fiche : c'est l'information qu'on corrige le plus
   vite, souvent en revenant d'un cours.

   Elles vivaient sur la ligne du répertoire ; elles vivent
   maintenant dans l'onglet 📇 Fiche du dossier, avec le reste de
   ce qui concerne cette personne. Écrites ICI, à un seul endroit,
   pour qu'aucun écran qui les affiche ne soit tenté d'en refaire
   une deuxième version.
   ============================================================ */
function pastillesPosteDeConduite(nom, apres){
  const zone = document.createElement('div');
  zone.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';

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
      /* Cocher la conduite aménagée demande de dire LESQUELS : le
         moniteur a besoin de savoir quoi monter dans la voiture. */
      if(champ === 'amenagee' && !avant){
        const choisis = await choisirLesAmenagements(nom);
        peindre();
        if(choisis){
          showToast(titre + ' notée ✅');
          if(typeof apres === 'function') apres();
        }
        return;
      }
      b.disabled = true;
      const ok = await ecrirePosteDeConduite(nom, champ, !avant);
      b.disabled = false;
      peindre();
      if(ok){
        showToast(titre + (avant ? ' retiré' : ' noté') + ' ✅');
        if(typeof apres === 'function') apres();
      }
    });
    zone.appendChild(b);
  });

  return zone;
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


/* ============================================================
   CHERCHER UN ÉLÈVE — UNE SEULE RÈGLE, POUR TOUS LES ÉCRANS

   Il y en avait deux, et elles ne trouvaient pas les mêmes gens.
   Le répertoire cherchait dans le nom, le numéro, le mail, la
   formation et le Messenger, sur l'union des noms connus ET des
   fiches. La loupe cherchait dans le seul nom, sur les seuls noms
   connus — donc un élève inscrit au répertoire mais qui n'avait
   pas encore de bilan était introuvable à la loupe, alors qu'il
   était bien là, deux écrans plus loin.

   Personne ne s'en est jamais plaint : on croyait simplement qu'il
   n'existait pas.
   ============================================================ */

/* Tous les élèves qu'on connaît, avec ou sans fiche, triés. */
function nomsConnusEleves(){
  const noms = [];
  if(typeof elevesConnus !== 'undefined'){
    elevesConnus.forEach(n => { if(n) noms.push(n); });
  }
  if(typeof fichesEleves !== 'undefined'){
    fichesEleves.forEach(f => {
      if(!f || !f.eleve) return;
      if(!noms.some(n => normaliserMot(n) === normaliserMot(f.eleve))){
        noms.push(f.eleve);
      }
    });
  }
  return noms.sort((a, b) => a.localeCompare(b, 'fr'));
}

/* Ceux qui correspondent. Une recherche vide rend tout le monde :
   c'est à l'écran de décider s'il affiche une liste entière. */
function chercherEleves(q, max){
  const cible = normaliserMot(String(q || ''));
  const tous = nomsConnusEleves();

  const vus = !cible ? tous : tous.filter(n => {
    const f = (typeof ficheDe === 'function') ? (ficheDe(n) || {}) : {};
    return normaliserMot(n).indexOf(cible) !== -1 ||
           normaliserMot(f.telephone || '').indexOf(cible) !== -1 ||
           normaliserMot(f.email || '').indexOf(cible) !== -1 ||
           normaliserMot(f.formation || '').indexOf(cible) !== -1 ||
           normaliserMot(f.messenger || '').indexOf(cible) !== -1;
  });

  return max ? vus.slice(0, max) : vus;
}


async function afficherRepertoire(recharger){
  const zone = $('repertoireListe');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Chargement du répertoire…</div>';
  /* Après une modification, on relit : sinon l'écran continue
     d'afficher la fiche telle qu'elle était avant l'enregistrement. */
  if(recharger || !fichesEleves.length) await chargerFiches();
  zone.innerHTML = '';

  /* Tous les élèves connus, avec ou sans fiche — la même liste que
     la loupe et le dossier, depuis la v786. */
  const noms = nomsConnusEleves();

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
    liste.innerHTML = '';

    /* Le même filtre que la loupe et le dossier : nom, numéro,
       mail, formation, Messenger. */
    const vus = chercherEleves(rech.value);

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
  d.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
    'padding:10px 12px;margin-bottom:7px;cursor:pointer;';
  d.title = 'Ouvrir le dossier de ' + nom;

  /* TOUTE LA LIGNE OUVRE SON DOSSIER.

     Elle portait six boutons : les deux pastilles du poste de
     conduite, le SMS, la modification, l'export du droit d'accès et
     la suppression. Chacun était une petite porte vers une chose
     qui concerne CETTE personne — et il fallait les connaître.

     Ils vivent tous dans son dossier maintenant, chacun dans son
     onglet. Ici il ne reste que ce qui sert à le RECONNAÎTRE dans
     une liste : son nom, sa formation, son numéro. Une ligne,
     un geste. */
  if(typeof ouvrirPageEleve === 'function'){
    d.addEventListener('click', () => ouvrirPageEleve(nom));
  }

  const genre = f.genre === 'F' ? '\u2640' : (f.genre === 'M' ? '\u2642' : '');
  const poste = (typeof posteDeConduite === 'function')
    ? posteDeConduite(nom) : {};

  d.innerHTML = '<strong style="font-size:15px;">' +
    (genre ? genre + ' ' : '') + nom.replace(/</g, '&lt;') + '</strong>' +
    (f.formation ? ' <span style="font-size:11px;color:var(--accent-text);">' +
      f.formation.replace(/</g, '&lt;') + '</span>' : '') +
    (f.autreAE ? ' <span style="font-size:11px;color:#E8A33D;">\ud83c\udfeb ' +
      (f.autreAENom ? f.autreAENom.replace(/</g, '&lt;') : 'autre auto-\u00e9cole') +
      '</span>' : '') +
    /* Le poste de conduite reste visible : c'est ce qu'on doit
       savoir AVANT d'ouvrir quoi que ce soit. Il se règle dans
       l'onglet Fiche du dossier. */
    (poste.amenagee ? ' \u267f' : '') + (poste.coussin ? ' \ud83d\udfe9' : '') +
    '<div style="font-size:12px;color:var(--muted);margin-top:2px;' +
    'line-height:1.5;">' +
    (f.telephone ? '\ud83d\udcf1 ' + telLisible(f.telephone) : '\ud83d\udcf1 pas de num\u00e9ro') +
    (f.email ? ' \u00b7 \u2709\ufe0f ' + f.email.replace(/</g, '&lt;') : '') +
    '</div>';

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

    /* LA DATE DE NAISSANCE, JUSTE AU-DESSUS DE LA FORMATION.

       Là parce que c'est là qu'on la regarde : en AAC, l'examen
       n'est possible qu'à 17 ans révolus, et cette date commande le
       rendez-vous pédagogique n°2. Les deux se lisent ensemble ou
       ne se lisent pas. */
    '<label for="fiNaissance">🎂 Date de naissance</label>' +
    '<input type="date" id="fiNaissance">' +
    '<div id="fiAge" style="font-size:11px;color:var(--muted);' +
      'margin:-8px 0 12px;line-height:1.4;"></div>' +

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

  /* L'âge se recalcule à chaque frappe : une date de naissance mal
     tapée se voit tout de suite si l'âge annoncé est absurde. */
  const majAge = () => {
    const z = g('fiAge');
    if(!z) return;
    const v = g('fiNaissance').value;
    const a = ageDe(v);
    if(a === null){ z.textContent = "L'âge et, en AAC, la date d'examen " +
                      'possible en dépendent.'; return; }
    const dix7 = jour17AnsRevolus(v);
    z.textContent = a + ' ans' +
      (a < 17 && dix7 ? ' · 17 ans révolus le ' +
        ((typeof dateCourte === 'function') ? dateCourte(dix7) : dix7) : '');
  };
  g('fiNaissance').value = (f && f.naissance) || '';
  g('fiNaissance').addEventListener('input', majAge);
  majAge();
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
                        /* Même règle que les aménagements : 'non'
                           efface, un champ vide ne touche à rien.
                           Sans ce 'non', une date de naissance saisie
                           par erreur ne pouvait plus se retirer. */
                        naissance: g('fiNaissance').value || 'non',
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
                      /* La mémoire garde la VALEUR, pas le mot qui
                         l'efface : 'non' est une consigne pour le
                         serveur, ce n'est pas une date de naissance. */
                      naissance: g('fiNaissance').value || '',
                      remarques: g('fiRem').value.trim() };
      if(f2) Object.assign(f2, saisi);
      else fichesEleves.push(Object.assign({ eleve: nom }, saisi));
      fichesLues = 0;

      document.body.removeChild(fond);
      showToast('Fiche enregistrée ✅');
      /* ⚠️ ON NE RELIT PAS LE CLASSEUR POUR REDESSINER.

         « Quand on enregistre les modifications de la fiche, c'est
         long. » Ça l'était : l'écriture partait, puis on RELISAIT
         les quelques centaines de fiches avant de redessiner — le
         double du temps, pour retrouver exactement ce qu'on venait
         d'écrire.

         La fiche en mémoire est déjà à jour, deux lignes plus haut :
         le répertoire se redessine tout de suite, sans réseau. Et
         « fichesLues = 0 » reste posé — la prochaine ouverture
         naturelle relira le classeur, au cas où il aurait reformaté
         quelque chose. */
      afficherRepertoire(false);
    }catch(e){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Erreur : ' + e.message;
      bOk.disabled = false;
      bOk.textContent = '💾 Enregistrer';
    }
  });
}

/* ============================================================
   LE DOSSIER COMPLET D'UN ÉLÈVE (DROIT D'ACCÈS)

   Il s'ouvre dans un onglet à part, prêt à imprimer en PDF. Deux
   partis pris :

   · IL S'AFFICHE AVANT DE PARTIR. Un export qui se télécharge
     directement se transmet sans être relu — or il contient les
     notes internes du bureau. On le lit, puis on décide.
   · IL DIT CE QU'IL NE CONTIENT PAS. Un dossier muet sur ses
     absences laisse croire qu'il est exhaustif ; celui-ci nomme
     les deux choses qu'on a volontairement retirées.
   ============================================================ */
async function editerDossierEleve(nom, bouton){
  const libelle = bouton ? bouton.textContent : '';
  if(bouton){ bouton.disabled = true; bouton.textContent = '…'; }

  /* La fenêtre s'ouvre TOUT DE SUITE, sur le geste du bureau : un
     onglet ouvert après un appel réseau se fait bloquer par le
     navigateur, et on croit que le bouton ne marche pas. */
  const onglet = window.open('', '_blank');
  if(onglet){
    onglet.document.write('<p style="font-family:system-ui;padding:24px;">' +
      'Lecture du dossier de ' + echapper(nom) + '…</p>');
  }

  try{
    const d = await appelPrep({ action: 'dossierEleve', eleve: nom });
    if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'Dossier illisible.');

    const page = pageDossier(d);
    if(onglet){
      onglet.document.open();
      onglet.document.write(page);
      onglet.document.close();
    }else{
      /* Fenêtre bloquée : on ne fait pas semblant. */
      await informer("Le navigateur a bloqué l'ouverture de l'onglet. " +
        "Autorise les fenêtres pour ce site, puis réessaie.", 'Dossier');
    }
    showToast(d.total + ' ligne(s) dans son dossier');
  }catch(e){
    if(onglet) onglet.close();
    showToast('Dossier impossible : ' + e.message);
  }finally{
    if(bouton){ bouton.disabled = false; bouton.textContent = libelle; }
  }
}

/* La page elle-même. Volontairement sobre : elle finira en PDF. */
function pageDossier(d){
  const e = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let corps = '';
  (d.parties || []).forEach(p => {
    corps += '<section><h2>' + e(p.titre) +
      ' <span class="n">' + p.lignes.length + '</span></h2>';
    if(p.note) corps += '<p class="note">' + p.note + '</p>';

    if(!p.lignes.length){
      corps += '<p class="vide">Rien dans cette catégorie.</p></section>';
      return;
    }
    p.lignes.forEach(l => {
      corps += '<div class="bloc">';
      Object.keys(l).forEach(k => {
        if(String(l[k] || '').trim() === '') return;
        corps += '<div class="champ"><span class="cle">' + e(k) + '</span>' +
                 '<span class="val">' + e(l[k]) + '</span></div>';
      });
      corps += '</div>';
    });
    corps += '</section>';
  });

  const mentions = (d.mentions || []).map(m => '<li>' + e(m) + '</li>').join('');

  return '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Dossier — ' + e(d.eleve) + '</title><style>' +
    'body{font-family:system-ui,-apple-system,sans-serif;max-width:820px;' +
    'margin:0 auto;padding:28px 20px 60px;color:#1a1a1a;line-height:1.55;}' +
    'h1{font-size:22px;margin:0 0 4px;}' +
    'h2{font-size:15px;margin:26px 0 6px;padding-bottom:5px;' +
    'border-bottom:2px solid #1a1a1a;}' +
    '.n{font-weight:400;color:#666;font-size:13px;}' +
    '.chapo{color:#555;font-size:13px;margin:0 0 18px;}' +
    '.note{font-size:12px;color:#555;margin:4px 0 10px;font-style:italic;}' +
    '.vide{font-size:13px;color:#888;margin:4px 0 0;}' +
    '.bloc{border:1px solid #ddd;border-radius:7px;padding:9px 12px;' +
    'margin:8px 0;page-break-inside:avoid;}' +
    '.champ{display:flex;gap:10px;font-size:13px;padding:2px 0;' +
    'align-items:flex-start;}' +
    '.cle{flex:0 0 190px;color:#666;}' +
    '.val{flex:1;min-width:0;white-space:pre-wrap;}' +
    '.avert{border:2px solid #b00;border-radius:8px;padding:12px 14px;' +
    'margin:18px 0;font-size:13px;}' +
    '.avert h3{margin:0 0 6px;font-size:14px;color:#b00;}' +
    '.avert ul{margin:6px 0 0;padding-left:20px;}' +
    'button{font-size:14px;padding:10px 16px;border-radius:8px;' +
    'border:1px solid #1a1a1a;background:#1a1a1a;color:#fff;cursor:pointer;}' +
    '@media print{button,.avert.ecran{display:none;}}' +
    '</style></head><body>' +
    '<h1>Dossier de ' + e(d.eleve) + '</h1>' +
    '<p class="chapo">Évolution Conduites · édité le ' + e(d.edite) +
    ' · ' + d.total + ' élément(s)</p>' +
    '<div class="avert ecran"><h3>À relire avant de le transmettre</h3>' +
    '<p>Ce dossier contient <strong>les notes internes du bureau</strong> ' +
    'le concernant. Elles font partie de ce qu\'il a le droit de ' +
    'consulter, mais relis-les : elles n\'ont pas été écrites pour ' +
    'lui.</p>' +
    '<p style="margin:8px 0 0;"><strong>Ce qui n\'y est pas, ' +
    'volontairement :</strong></p><ul>' +
    '<li>son <strong>code d\'accès</strong> au coin révisions — c\'est ' +
    'une clé, pas une donnée le concernant ;</li>' +
    '<li>les <strong>noms des salariés</strong> dans le journal — ce ' +
    'sont leurs données, pas les siennes ;</li>' +
    '<li>les <strong>images</strong> des captures du CEPC — seules leurs ' +
    'références figurent.</li>' +
    (mentions ? '</ul><p style="margin:8px 0 0;"><strong>À signaler :' +
     '</strong></p><ul>' + mentions : '') +
    '</ul>' +
    '<p style="margin:10px 0 0;"><button onclick="window.print()">' +
    '🖨️ Imprimer / enregistrer en PDF</button></p></div>' +
    corps +
    '</body></html>';
}


/* LA SUPPRESSION COMPLÈTE, DEMANDÉE DEPUIS N'IMPORTE OÙ.

   Elle écrivait son avancement dans « importEtat » — un élément du
   RÉPERTOIRE. Lancée depuis l'onglet RGPD du dossier, elle aurait
   parlé dans une zone cachée : l'effacement peut prendre une
   dizaine de secondes, et on serait resté devant un écran muet.

   L'appelant dit donc OÙ écrire. Le reste — les deux confirmations,
   dont la recopie du nom — est écrit ici une seule fois : c'est le
   geste le plus irréversible de l'outil, il n'aura jamais deux
   versions. */
async function supprimerDepuisRepertoire(n, bouton, dire){
  const ecrire = (texte, couleur) => {
    if(typeof dire === 'function') return dire(texte, couleur);
    const etat = $('importEtat');
    if(etat){ etat.style.color = couleur || 'var(--muted)'; etat.textContent = texte; }
  };

  if(!await confirmer('\u26a0\ufe0f SUPPRESSION D\u00c9FINITIVE\n\n' +
      'Tout ce qui concerne ' + n + ' va \u00eatre effac\u00e9 :\n' +
      '\u2022 ses bilans\n\u2022 sa fiche de suivi et ses examens\n' +
      '\u2022 ses cours \u00e0 venir\n\u2022 ses captures de CEPC\n' +
      '\u2022 ses messages en attente\n\u2022 sa fiche du r\u00e9pertoire\n\n' +
      "Il n'appara\u00eetra plus nulle part. Cette action est IRR\u00c9VERSIBLE.")) return;

  const saisi = await demander("Pour confirmer, recopie exactement son nom :\n\n" + n);
  if(saisi === null) return;
  if(normaliserMot(saisi) !== normaliserMot(n)){
    await informer('Le nom saisi ne correspond pas. Suppression annul\u00e9e.');
    return;
  }

  if(bouton) bouton.disabled = true;
  try{
    const r = await supprimerEleveComplet(n, t => ecrire(n + ' \u2014 ' + t));

    const bilan = (r && r.faits) ? r : { faits: [], rates: [] };
    if(bilan.rates.length){
      /* Un effacement incomplet se DIT. Annoncer « supprim\u00e9 » sur
         un travail \u00e0 moiti\u00e9 fait serait le pire des deux. */
      ecrire('\u26a0\ufe0f ' + n + ' \u2014 effacement INCOMPLET. Fait : ' +
        (bilan.faits.join(' \u00b7 ') || 'rien') + ". N'a pas pu \u00eatre effac\u00e9 : " +
        bilan.rates.join(', ') + '. Recommence.', 'var(--warn-text)');
    }else{
      ecrire('\u2705 ' + n + ' supprim\u00e9 \u2014 ' +
        (bilan.faits.join(' \u00b7 ') || 'rien \u00e0 retirer'), 'var(--accent-text)');
    }

    await chargerEleves();
    afficherRepertoire();
    if(typeof afficherBureau === 'function') afficherBureau(true);
    return bilan;
  }catch(e){
    ecrire('Erreur : ' + e.message, 'var(--warn-text)');
    if(bouton) bouton.disabled = false;
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
  /* ------------------------------------------------------------
     CE QUI A RATÉ SE DIT AUSSI.

     Sept étapes, sept « catch » vides, et un message final qui
     n'énumérait que les réussites. Six d'entre elles pouvaient
     échouer — réseau, droits, feuille absente — et l'écran
     annonçait quand même « ✅ Léa supprimée ». Le bureau croyait
     le dossier parti ; l'élève restait dans le répertoire, avec
     son adresse et son numéro.

     Un effacement partiel n'est pas un effacement. Il faut le
     savoir pour recommencer.
     ------------------------------------------------------------ */
  const rates = [];

  /* ------------------------------------------------------------
     TOUT SE FAIT EN UN SEUL APPEL, DANS LE CLASSEUR.

     Cette fonction faisait la tournée elle-même : messages, cours
     préparés, fiche de suivi, captures, bilans, répertoire — six
     allers-retours, et six occasions d'en oublier un. Les deux
     autres écrans qui « suppriment un élève » ne faisaient pas la
     même tournée, et personne ne s'en apercevait.

     L'effacement vit maintenant à un seul endroit, du côté du
     classeur, là où sont les données. Les trois écrans y mènent.
     ------------------------------------------------------------ */

  /* Bilans, et tout le reste avec */
  dire('Effacement du dossier…');
  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'supprimerEleve', code: ACCES.code, eleve: nom })
    }, 25000, 2);
    if(r.ok){
      const d = await r.json().catch(() => ({}));
      /* Le classeur dit ce qu'il a fait : on le reprend mot pour
         mot plutôt que de le supposer. */
      resumeEffacement(d).forEach(x => faits.push(x));
    }else{
      rates.push('les bilans (HTTP ' + r.status + ')');
    }
  }catch(e){ rates.push('les bilans'); }

  viderCaches(nom);
  return { faits: faits, rates: rates };
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

/* LA DATE DE NAISSANCE ET LE MAIL DU PRESCRIPTEUR À L'IMPORT (v185).

   Les deux existaient déjà dans la fiche, et se saisissaient un par
   un, à la main, sur des élèves qu'on venait justement d'importer en
   lot. La date de naissance commande l'âge et toute l'échéance AAC ;
   le mail du prescripteur est l'adresse de l'accompagnateur, celle à
   qui partira la proposition de rendez-vous théorique. Les retaper
   quarante fois, c'était trente-neuf occasions d'en sauter un. */
const ENTETES_NAISSANCE = ['date de naissance', 'naissance', 'ne le', 'né le',
                           'nee le', 'née le', 'ddn', 'date naissance',
                           'birthdate', 'anniversaire'];
const ENTETES_PRESCRIPTEUR = ['mail prescripteur', 'email prescripteur',
                              'prescripteur', 'mail representant',
                              'mail représentant', 'representant legal',
                              'représentant légal', 'mail accompagnateur',
                              'accompagnateur', 'mail parent', 'parent'];

/* Une date d'import n'a pas de forme garantie : 12/03/2009, 2009-03-12,
   parfois 12-03-2009. On rend l'ISO, seule forme que le reste sait
   relire — et RIEN quand on ne sait pas lire, plutôt qu'une date
   inventée à partir d'un texte qu'on n'a pas compris. */
function isoNaissance(v){
  const t = String(v || '').trim();
  if(!t) return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if(!m) return '';
  const j = +m[1], mo = +m[2];
  if(j < 1 || j > 31 || mo < 1 || mo > 12) return '';
  return m[3] + '-' + ('0' + mo).slice(-2) + '-' + ('0' + j).slice(-2);
}

/* L'ÂGE, ET LE JOUR OÙ IL A 17 ANS RÉVOLUS.

   « 17 ans révolu, c'est le lendemain de son anniversaire » — et
   c'est à partir de ce jour-là qu'un élève peut présenter l'examen.
   La règle est écrite ICI, une seule fois : elle sert à la fiche,
   aux listes AAC et CS, et au dossier élève. Trois écrans qui
   calculeraient chacun leur âge finiraient par ne pas être d'accord
   un 29 février.

   Une date illisible rend null, jamais un âge approché : on préfère
   « âge inconnu » à un nombre faux. */
function ageDe(iso, auJour){
  const t = String(iso || '').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const n = new Date(t + 'T12:00:00');
  if(isNaN(n.getTime())) return null;

  const j = auJour ? new Date(String(auJour) + 'T12:00:00') : new Date();
  if(isNaN(j.getTime())) return null;

  let a = j.getFullYear() - n.getFullYear();
  const m = j.getMonth() - n.getMonth();
  if(m < 0 || (m === 0 && j.getDate() < n.getDate())) a--;
  return (a >= 0 && a < 130) ? a : null;
}

/* Le lendemain du 17e anniversaire, en ISO. */
function jour17AnsRevolus(iso){
  const t = String(iso || '').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(t)) return '';
  const n = new Date(t + 'T12:00:00');
  if(isNaN(n.getTime())) return '';
  n.setFullYear(n.getFullYear() + 17);
  n.setDate(n.getDate() + 1);          /* révolu = le LENDEMAIN */
  return n.getFullYear() + '-' +
         ('0' + (n.getMonth() + 1)).slice(-2) + '-' +
         ('0' + n.getDate()).slice(-2);
}

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
  /* Ces deux-là ne se devinent PAS sans en-tête. Une colonne de dates
     peut être une date de naissance comme une date d'inscription, et
     une colonne de mails peut être celle de l'élève. Se tromper
     écrirait l'anniversaire de l'inscription et enverrait les
     rendez-vous à la mauvaise adresse : sans en-tête nommé, on ne
     prend rien. */
  const iNais = entete ? trouver(ENTETES_NAISSANCE) : -1;
  const iPresc = entete ? trouver(ENTETES_PRESCRIPTEUR) : -1;

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
      genre: iGenre >= 0 ? normaliserGenre(cases[iGenre]) : '',
      naissance: iNais >= 0 ? isoNaissance(cases[iNais]) : '',
      mailPrescripteur: iPresc >= 0 ? (cases[iPresc] || '').trim() : ''
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
  const nNais = fiches.filter(f => f.naissance).length;
  if(nNais) dit.push(nNais + ' avec date de naissance');
  const nPresc = fiches.filter(f => f.mailPrescripteur).length;
  if(nPresc) dit.push(nPresc + ' avec mail prescripteur');

  /* ET ON DIT QUAND UNE COLONNE A ÉTÉ LUE MAIS PAS COMPRISE. Une
     colonne « date de naissance » remplie de « 12 mars 2009 » ne
     donne aucune date ISO : sans cette ligne, l'import annonçait
     « 40 élèves » et les quarante arrivaient sans âge, sans que rien
     ne le signale. Un silence, ce n'est pas un compte rendu. */
  if(iNais >= 0 && nNais < fiches.length){
    dit.push('⚠️ ' + (fiches.length - nNais) + ' date(s) de naissance ' +
             'illisible(s) — attendu 12/03/2009 ou 2009-03-12');
  }

  const info = dit.join(' · ') + ' · séparateur « ' +
    (sep === '\t' ? 'tabulation' : sep) + ' » · nom : ' +
    colonnes.map(c => premiere[c] || ('n°' + (c + 1))).join(' + ') +
    (colTel >= 0 ? ' · tél : ' + (premiere[colTel] || ('n°' + (colTel + 1))) : '') +
    (colMail >= 0 ? ' · mail : ' + (premiere[colMail] || ('n°' + (colMail + 1))) : '') +
    (iGenre >= 0 ? ' · genre : ' + (premiere[iGenre] || ('n°' + (iGenre + 1))) : '') +
    (iNais >= 0 ? ' · naissance : ' + (premiere[iNais] || ('n°' + (iNais + 1))) : '') +
    (iPresc >= 0 ? ' · prescripteur : ' + (premiere[iPresc] || ('n°' + (iPresc + 1))) : '');

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
      /* L'aperçu montre CE QUI A ÉTÉ LU, colonne par colonne : sans
         lui, impossible de vérifier avant d'importer qu'une colonne
         a bien été comprise. La date de naissance et le mail du
         prescripteur en font partie — ce sont justement les deux
         qu'on ne devine pas sans en-tête nommé. */
      zone.value = (r.fiches || []).map(f => {
        const g = f.genre === 'F' ? '♀' : (f.genre === 'M' ? '♂' : '');
        return [g, f.eleve, f.telephone, f.email, f.formation,
                f.naissance ? '🎂 ' + f.naissance : '',
                f.mailPrescripteur ? '✉️ ' + f.mailPrescripteur : '']
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
    /* Et le bouton se refait quand il arrive : c'est le classeur
       qui sait le rang de la leçon, et le bouton l'annonçait
       manquant tant qu'il n'était pas revenu. */
    chargerDossierEleve(nom)
      .then(() => { if(typeof majBoutonCompleter === 'function') majBoutonCompleter(); })
      .catch(() => {});
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
function choisirEleveConnu(titre, aide, propose){
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
    /* Ce qu'on vient de chercher sans le trouver : le retaper serait
       une corvée, et une occasion de l'écrire autrement — deux
       fiches pour la même personne commencent toujours comme ça. */
    if(propose) champ.value = String(propose);
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
/* « nomPropose » vient de la recherche du dossier, quand elle n'a
   rien trouvé : c'est le moment exact où l'on découvre qu'il
   n'existe pas. */
async function creerEleveALaMain(nomPropose){
  const nom = await choisirEleveConnu(
    'Créer un élève',
    "Vérifie qu'il n'existe pas déjà : les élèves connus sont proposés.",
    nomPropose);
  if(!nom) return;

  const existe = ficheDe(nom);
  if(existe && !await confirmer(
      '« ' + nom + " » a déjà une fiche.\n\nL'ouvrir pour la compléter ?")) return;

  ouvrirFicheEleve(nom, existe || {});
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-fenetres.js'] = true;
