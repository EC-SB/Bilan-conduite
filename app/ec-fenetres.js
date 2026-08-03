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
          x.textContent = '✕';
          x.title = 'Retirer du répertoire — les bilans sont conservés';
          x.addEventListener('click', async () => {
            if(!await confirmer('Retirer ' + n + ' du répertoire ?\n\n' +
                                'Ses bilans sont conservés. S\'il en a, il restera proposé.')) return;
            x.disabled = true;
            try{
              await appelPrep({ action: 'eleveRetirer', eleve: n });
              await chargerEleves();
              afficherRepertoire();
            }catch(e){ showToast('Erreur : ' + e.message); x.disabled = false; }
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

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-fenetres.js'] = true;
