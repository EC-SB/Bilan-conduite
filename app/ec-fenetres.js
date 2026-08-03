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
    const r = await appelPrep({ action: 'elevesImport', liste: liste });
    etat.style.color = 'var(--accent-text)';
    etat.textContent = '✅ ' + (r.ajoutes || 0) + ' élève(s) ajouté(s)' +
      (r.doublons ? ' · ' + r.doublons + ' déjà présent(s)' : '') +
      ' · ' + (r.total || 0) + ' au total';
    zone.value = '';
    await chargerEleves();
    afficherRepertoire();
  }catch(e){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = 'Erreur : ' + e.message;
  }finally{
    btn.disabled = false;
    btn.textContent = '📥 Importer la liste';
  }
}

/* Ce que l'application connaît aujourd'hui */
function afficherRepertoire(){
  const zone = $('repertoireListe');
  if(!zone) return;

  zone.innerHTML = '';
  if(!elevesConnus.length){
    zone.innerHTML = '<div class="empty">Aucun élève connu pour le moment.</div>';
    return;
  }

  const det = document.createElement('details');
  det.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:700;' +
    'color:var(--accent-text);">👥 ' + elevesConnus.length +
    ' élève(s) proposé(s) dans les listes</summary>';

  const rech = document.createElement('input');
  rech.type = 'text';
  rech.placeholder = '🔍 Filtrer';
  rech.style.cssText = 'margin:8px 0;';
  det.appendChild(rech);

  const l = document.createElement('div');
  l.style.cssText = 'font-size:13px;line-height:1.9;max-height:320px;overflow-y:auto;';
  det.appendChild(l);

  function dessiner(){
    const q = normaliserMot(rech.value);
    l.innerHTML = '';
    elevesConnus
      .filter(n => !q || normaliserMot(n).indexOf(q) !== -1)
      .forEach(n => {
        const ligne = document.createElement('div');
        ligne.style.cssText = 'display:flex;align-items:center;gap:8px;';
        const s = document.createElement('span');
        s.style.cssText = 'flex:1;min-width:0;';
        s.textContent = n;
        ligne.appendChild(s);

        if(ACCES.role === 'admin'){
          const x = document.createElement('button');
          x.className = 'btn btn-secondary';
          x.style.cssText = 'width:auto;padding:3px 8px;font-size:11px;margin:0;flex-shrink:0;' +
            'color:var(--red);border-color:var(--red);';
          x.textContent = '🗑️';
          x.title = 'Tout supprimer pour cet élève';
          x.addEventListener('click', async () => {
            if(!await confirmer('⚠️ SUPPRESSION DÉFINITIVE\n\n' +
                'Tout ce qui concerne ' + n + ' va être effacé :\n' +
                '• ses bilans\n• sa fiche de suivi et ses examens\n' +
                '• ses cours à venir\n• ses captures de CEPC\n' +
                '• ses messages en attente\n\n' +
                "Il n'apparaîtra plus nulle part. Cette action est IRRÉVERSIBLE.")) return;

            const saisi = await demander("Pour confirmer, recopie exactement son nom :\n\n" + n);
            if(saisi === null) return;
            if(normaliserMot(saisi) !== normaliserMot(n)){
              await informer('Le nom saisi ne correspond pas. Suppression annulée.');
              return;
            }

            x.disabled = true;
            const etat = $('importEtat');
            try{
              const faits = await supprimerEleveComplet(n, t => {
                if(etat){ etat.style.color = 'var(--muted)'; etat.textContent = n + ' — ' + t; }
              });
              if(etat){
                etat.style.color = 'var(--accent-text)';
                etat.textContent = '✅ ' + n + ' supprimé — ' +
                  (faits.join(' · ') || 'rien à retirer');
              }
              await chargerEleves();
              afficherRepertoire();
              if(typeof afficherBureau === 'function') afficherBureau(true);
            }catch(e){
              if(etat){ etat.style.color = 'var(--warn-text)'; etat.textContent = 'Erreur : ' + e.message; }
              x.disabled = false;
            }
          });
          ligne.appendChild(x);
        }
        l.appendChild(ligne);
      });
  }
  rech.addEventListener('input', dessiner);
  dessiner();

  zone.appendChild(det);
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

  const noms = [];
  lignes.forEach((l, i) => {
    if(entete && i === 0) return;
    const cases = decouperLigneCsv(l, sep);
    const morceaux = colonnes.map(c => (cases[c] || '').trim()).filter(Boolean);
    const nom = morceaux.join(' ').replace(/\s+/g, ' ').trim();
    if(nom.length >= 3 && !/^\d+$/.test(nom)) noms.push(nom);
  });

  const info = noms.length + ' nom(s) trouvé(s) · séparateur « ' +
    (sep === '\t' ? 'tabulation' : sep) + ' » · colonne(s) ' +
    colonnes.map(c => premiere[c] || ('n°' + (c + 1))).join(' + ');

  return { noms: noms, info: info };
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
      zone.value = r.noms.join('\n');
      etat.style.color = 'var(--accent-text)';
      etat.textContent = '📄 ' + r.info +
        '\nRelis la liste ci-dessus, puis appuie sur Importer.';
    };
    /* Les exports français sont souvent en Windows-1252 */
    lecteur.readAsText(f, 'utf-8');
  });
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-fenetres.js'] = true;
