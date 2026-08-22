/* ============================================================
   ec-ecran.js
   Ce qui tourne sur les écrans du bureau et de la vitrine.

   Une diapositive = un message, une image, ou les deux. On dit où
   elle passe — accueil, vitrine ou les deux — combien de temps, et
   entre quelles dates.

   L'écran lui-même est une page à part : ecran.html.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let diaposEcran = [];

async function afficherEcran(){
  const zone = $('ecranZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture des diapositives…</div>';
  try{
    const d = await appelPrep({ action: 'ecranList' });
    diaposEcran = (d && d.diapos) || [];
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';

  /* Le planning tel qu'il apparaît à l'accueil, modifiable ici */
  zone.appendChild(blocPlanning());

  /* Les adresses à ouvrir sur les téléviseurs */
  zone.appendChild(blocAdresses());

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-bottom:14px;padding:13px;font-size:14px;';
  b.textContent = '➕ Nouvelle diapositive';
  b.addEventListener('click', () => ouvrirEditeurDiapo(null));
  zone.appendChild(b);

  if(!diaposEcran.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucune diapositive.<br>' +
      '<span style="font-size:12px;">Ajoute un message ou une image ' +
      'à faire tourner sur les écrans.</span>';
    zone.appendChild(v);
    return;
  }

  const c = document.createElement('div');
  c.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;';
  const actives = diaposEcran.filter(x => x.actif).length;
  c.textContent = diaposEcran.length + ' diapositive(s) · ' + actives + ' active(s)';
  zone.appendChild(c);

  diaposEcran.forEach((d, i) => zone.appendChild(ligneDiapo(d, i)));
}


/* Les moniteurs, pour changer celui d'une ligne */
async function remplirMoniteursEcran(sel, actuel){
  let gens = (typeof moniteursActifs !== 'undefined' ? moniteursActifs : []) || [];

  if(!gens.length){
    try{
      const d = await appelPrep({ action: 'moniteurs' });
      gens = (d && d.moniteurs) || [];
      if(typeof moniteursActifs !== 'undefined') moniteursActifs = gens;
    }catch(e){}
  }

  /* Un moniteur qui n'est plus dans la liste reste proposé :
     sinon la ligne changerait de main toute seule. */
  if(actuel && gens.indexOf(actuel) === -1) gens = [actuel].concat(gens);

  sel.innerHTML = '<option value="">— moniteur —</option>' +
    gens.map(g => '<option value="' + String(g).replace(/"/g, '&quot;') + '"' +
      (g === actuel ? ' selected' : '') + '>' +
      String(g).replace(/</g, '&lt;') + '</option>').join('');
}


/* Les véhicules de la flotte, chargés une fois pour tout l'écran */
let flotteEcran = null;

async function chargerFlotteEcran(){
  if(flotteEcran !== null) return flotteEcran;
  try{
    const d = await appelPrep({ action: 'flotteList' });
    flotteEcran = (d && d.vehicules) || [];
  }catch(e){ flotteEcran = []; }
  return flotteEcran;
}

/* Remplit une liste de véhicules, en gardant celui déjà choisi */
async function remplirVehiculesEcran(sel, actuel){
  const liste = (await chargerFlotteEcran())
    .filter(v => v.etat !== 'vendu' && v.categorie !== 'remorque');

  const connu = liste.some(v => v.nom === actuel);

  sel.innerHTML = '<option value="">— aucun —</option>' +
    liste.map(v =>
      '<option value="' + String(v.nom).replace(/"/g, '&quot;') + '"' +
      (v.indisponible ? ' disabled' : '') + '>' +
      (v.indisponible ? '⛔ ' : '') + v.nom +
      (v.immat ? ' · ' + v.immat : '') +
      (v.indisponible ? ' — ' + (v.motifIndispo || 'au garage') : '') +
      '</option>').join('') +
    '<option value="autre">⌨️ Autre véhicule…</option>';

  /* Un véhicule saisi à la main, ou sorti de la flotte depuis :
     on le garde plutôt que de l'effacer en silence. */
  if(actuel && !connu){
    sel.value = 'autre';
    const champ = sel.parentElement
      ? sel.parentElement.querySelector('input[placeholder="Véhicule"]') : null;
    if(champ){ champ.value = actuel; champ.style.display = 'block'; }
  }else{
    sel.value = actuel || '';
  }
}


/* Les véhicules de l'auto-école. Une liste plutôt qu'un champ
   libre : c'est toujours l'un ou l'autre, et une faute de frappe
   sur l'écran de l'accueil se voit de loin. */
const MODELES_VEHICULE = ['', 'A3', 'Q3', 'Simu'];

/* « A3 4 » se sépare en modèle et numéro pour le formulaire */
function decouperVehicule(v){
  const t = String(v || '').trim();
  if(!t) return { modele: '', numero: '' };

  const m = t.match(/^(A3|Q3|Simu)\s*(.*)$/i);
  if(m){
    return {
      modele: m[1].charAt(0).toUpperCase() +
              m[1].slice(1).toLowerCase().replace(/^3$/, '3'),
      numero: m[2].trim()
    };
  }
  /* Une saisie ancienne, sans modèle : elle reste dans le numéro */
  return { modele: '', numero: t };
}


/* ============================================================
   LE PLANNING DE L'ÉCRAN

   Ce que l'accueil affiche aujourd'hui. L'heure se règle ici :
   elle est écrite dans la note de la préparation, et l'écran la
   reprend au prochain rafraîchissement.
   ============================================================ */
function blocPlanning(){
  const d = document.createElement('details');
  d.open = true;
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:10px 12px;margin-bottom:14px;';
  d.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:700;' +
    'color:var(--accent-text);">📅 Le planning affiché aujourd\'hui</summary>';

  const z = document.createElement('div');
  z.style.marginTop = '10px';
  z.innerHTML = '<div style="font-size:12px;color:var(--muted);">Lecture…</div>';
  d.appendChild(z);

  chargerPlanningEcran(z);
  return d;
}

async function chargerPlanningEcran(z){
  let liste = [];
  try{
    const r = await appelPrep({ action: 'ecranPlanning' });
    liste = (r && r.planning) || [];
  }catch(e){
    z.innerHTML = '<div style="font-size:12px;color:var(--warn-text);">⚠️ ' +
                  e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  dessinerLignes(liste, z);
}


function dessinerLignes(liste, z){
  z.innerHTML = '';

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'margin-bottom:10px;padding:10px;font-size:13px;';
  b.textContent = '➕ Ajouter une ligne à la main';
  b.addEventListener('click', () => ouvrirLigneManuelle(z));
  z.appendChild(b);

  if(!liste.length){
    const v = document.createElement('div');
    v.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;';
    v.innerHTML = 'Aucun cours préparé pour aujourd\'hui.<br>' +
      'L\'écran affichera « Aucun cours prévu ».';
    z.appendChild(v);
    return;
  }

  const a = document.createElement('div');
  a.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.5;';
  const auj = new Date();
  const maintenant = String(auj.getHours()).padStart(2, '0') + ':' +
                     String(auj.getMinutes()).padStart(2, '0');
  const passes = liste.filter(x => x.heure && x.heure < maintenant).length;

  const caches = liste.filter(x => x.masque).length;

  a.innerHTML = liste.length + ' ligne(s) · heure, véhicule et emplacement se ' +
    'règlent ici. L\'écran se met à jour dans la minute.' +
    (caches ? '<br><span style="color:var(--muted);">🗑️ ' + caches +
      ' retirée(s) de l\'écran · ↩️ pour les remettre.</span>' : '') +
    (passes ? '<br><span style="color:var(--muted);">🕐 ' + passes +
      ' cours déjà passé(s) : ils ont quitté l\'écran mais restent ' +
      'modifiables ici.</span>' : '');
  z.appendChild(a);

  liste.forEach(c => z.appendChild(lignePlanningEcran(c, liste, z)));
}

function lignePlanningEcran(c, liste, z){
  /* Un cours passé n'est plus à l'écran : on le grise ici pour
     qu'on comprenne pourquoi il n'y apparaît pas. */
  const n = new Date();
  const maintenant = String(n.getHours()).padStart(2, '0') + ':' +
                     String(n.getMinutes()).padStart(2, '0');
  const passe = c.heure && c.heure < maintenant;

  const l = document.createElement('div');
  l.style.cssText = 'border-bottom:1px solid rgba(255,255,255,.05);padding:9px 0;' +
    (passe || c.masque ? 'opacity:.45;' : '');

  /* ---- Première ligne : heure, élève, ordre ---- */
  const h1 = document.createElement('div');
  h1.style.cssText = 'display:flex;gap:8px;align-items:center;';

  const h = document.createElement('input');
  h.type = 'time';
  h.value = c.heure || '';
  h.style.cssText = 'width:100px;flex-shrink:0;margin:0;padding:7px 8px;font-size:14px;';
  h.addEventListener('change', () => {
    c.heure = h.value;
    enregistrerLigne(c);
  });
  h1.appendChild(h);

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:14px;line-height:1.35;';
  t.innerHTML = '<strong>' + (c.eleveComplet || c.eleve || '—').replace(/</g, '&lt;') +
    '</strong>' + (c.manuel ? ' <span style="font-size:10px;color:var(--muted);">' +
                              'ajouté à la main</span>' : '') +
    (c.masque ? ' <span style="font-size:10px;color:var(--warn-text);">' +
                'retiré de l\'écran</span>' : '') +
    '<div style="font-size:11px;color:var(--muted);">' +
      '👁️ ' + abregeNom(c.eleveComplet || c.eleve) +
    '</div>';
  h1.appendChild(t);

  /* Le moniteur, changeable : un rappel mal saisi ou un échange
     de dernière minute ne doit pas obliger à tout refaire. */
  const selMon = document.createElement('select');
  selMon.className = 'choixMoniteur';
  selMon.style.cssText = 'width:auto;max-width:120px;margin:0;padding:5px 7px;' +
    'font-size:11px;flex-shrink:0;';
  remplirMoniteursEcran(selMon, c.moniteur || '');
  selMon.addEventListener('change', () => {
    c.moniteur = selMon.value;
    enregistrerLigne(c);
  });
  h1.appendChild(selMon);

  /* Monter et descendre dans l'affichage */
  [['▲', -1], ['▼', 1]].forEach(([signe, sens]) => {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;padding:5px 7px;font-size:11px;margin:0;flex-shrink:0;';
    b.textContent = signe;
    b.addEventListener('click', async () => {
      const i = liste.indexOf(c);
      const j = i + sens;
      if(i === -1 || j < 0 || j >= liste.length) return;

      const a = liste[i]; liste[i] = liste[j]; liste[j] = a;
      liste.forEach((x, n) => { x.ordre = n + 1; });

      dessinerLignes(liste, z);
      try{
        await Promise.all([liste[i], liste[j]].map(x => enregistrerLigne(x, true)));
      }catch(e){ showToast('Ordre non enregistré : ' + e.message); }
    });
    h1.appendChild(b);
  });

  l.appendChild(h1);

  /* ---- Seconde ligne : véhicule et emplacement ---- */
  const h2 = document.createElement('div');
  h2.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:6px;' +
    'padding-left:108px;';

  /* Le modèle d'un côté, le numéro de l'autre : c'est ainsi qu'on
     désigne un véhicule ici, et le taper en entier à chaque fois
     n'apporte rien. */
  /* Les véhicules de la flotte, avec leur immatriculation. Le
     dernier choix ouvre la saisie libre : un véhicule de prêt ou
     de location n'est pas dans la flotte. */
  const modele = document.createElement('select');
  modele.className = 'choixVehicule';
  modele.style.cssText = 'flex:1;min-width:0;margin:0;padding:6px 8px;font-size:13px;';

  const num = document.createElement('input');
  num.type = 'text';
  num.placeholder = 'Véhicule';
  num.style.cssText = 'flex:1;min-width:0;margin:0;padding:6px 9px;font-size:13px;' +
    'display:none;';
  num.value = c.vehicule || '';

  remplirVehiculesEcran(modele, c.vehicule || '');

  const majVeh = () => {
    if(modele.value === 'autre'){
      num.style.display = 'block';
      c.vehicule = num.value.trim();
    }else{
      num.style.display = 'none';
      c.vehicule = modele.value;
    }
    enregistrerLigne(c);
  };
  modele.addEventListener('change', () => {
    if(modele.value === 'autre') setTimeout(() => num.focus(), 60);
    majVeh();
  });
  num.addEventListener('change', majVeh);

  h2.appendChild(modele);
  h2.appendChild(num);

  /* Un peu d'air avant le choix du lieu */
  const espace = document.createElement('span');
  espace.style.cssText = 'flex:1;min-width:0;';
  h2.appendChild(espace);

  const lieu = document.createElement('select');
  lieu.style.cssText = 'width:auto;flex-shrink:0;margin:0;padding:6px 9px;font-size:13px;';
  lieu.innerHTML =
    '<option value="">— où —</option>' +
    '<option value="devant">🛣️ Devant</option>' +
    '<option value="cour">🅿️ Cour intérieure</option>' +
    '<option value="moto">🏍️ Moto</option>' +
    '<option value="scooter">🛵 Scooter</option>' +
    '<option value="bureau">🏢 Bureau</option>' +
    '<option value="tablettes">📱 Salle des tablettes</option>' +
    '<option value="cours">📚 Salle de cours</option>' +
    '<option value="simulateur">🖥️ Simulateur</option>';
  lieu.value = c.lieu || '';

  /* Une séance en salle n'a pas de véhicule : le champ s'efface
     plutôt que de laisser croire qu'il faut le remplir. */
  const SANS_VEHICULE = ['bureau', 'tablettes', 'cours'];
  const majSelonLieu = () => {
    const enSalle = SANS_VEHICULE.indexOf(lieu.value) !== -1;
    modele.style.display = enSalle ? 'none' : '';
    num.style.display = enSalle ? 'none' : '';
  };

  lieu.addEventListener('change', () => {
    c.lieu = lieu.value;
    /* Le véhicule d'une séance qui n'en a plus besoin s'efface */
    if(SANS_VEHICULE.indexOf(lieu.value) !== -1){
      c.vehicule = '';
      modele.value = '';
      num.value = '';
    }
    majSelonLieu();
    enregistrerLigne(c);
  });
  majSelonLieu();

  h2.appendChild(lieu);

  /* Toute ligne se retire de l'écran. Celle ajoutée à la main est
     supprimée ; celle qui vient d'un cours est seulement masquée —
     la préparation du moniteur ne nous appartient pas. */
  const bSup = document.createElement('button');
  bSup.className = 'btn btn-secondary';
  bSup.style.cssText = 'width:auto;padding:6px 8px;font-size:12px;margin:0;' +
    'flex-shrink:0;' + (c.masque ? '' : 'color:var(--red);border-color:var(--red);');
  bSup.textContent = c.masque ? '↩️' : '🗑️';
  bSup.title = c.masque
    ? 'Remettre à l\'écran'
    : (c.manuel ? 'Supprimer cette ligne'
                : 'Retirer de l\'écran — le cours du moniteur est conservé');

  bSup.addEventListener('click', async () => {
    /* Déjà masquée : on la remet, sans rien demander */
    if(c.masque){
      c.masque = false;
      try{
        await enregistrerLigne(c, true);
        showToast('Remise à l\'écran ✅');
        chargerPlanningEcran(z);
      }catch(e){
        c.masque = true;
        showToast('Impossible : ' + e.message);
      }
      return;
    }

    if(c.manuel){
      if(!await confirmer('Supprimer cette ligne de l\'affichage ?')) return;
      try{
        await appelPrep({ action: 'ecranLigneDelete', id: c.id });
        showToast('Supprimée ✅');
        chargerPlanningEcran(z);
      }catch(e){ showToast('Impossible : ' + e.message); }
      return;
    }

    if(!await confirmer('Retirer ' + (c.eleveComplet || c.eleve) +
        ' de l\'écran ?\n\nSon cours reste dans les prochains cours du ' +
        'moniteur : seul l\'affichage est concerné.')) return;

    c.masque = true;
    try{
      await enregistrerLigne(c, true);
      showToast('Retirée de l\'écran ✅');
      chargerPlanningEcran(z);
    }catch(e){
      c.masque = false;
      showToast('Impossible : ' + e.message);
    }
  });
  h2.appendChild(bSup);

  l.appendChild(h2);
  return l;
}


/* Enregistre les détails d'affichage d'une ligne */
async function enregistrerLigne(c, silencieux){
  try{
    await appelPrep({
      action: 'ecranLigneSet',
      id: c.manuel ? c.id : '',
      idPrep: c.manuel ? '' : c.id,
      jour: todayLocal(),
      eleve: c.eleveComplet || c.eleve || '',
      moniteur: c.moniteur || '',
      heure: c.heure || '',
      vehicule: c.vehicule || '',
      lieu: c.lieu || '',
      ordre: c.ordre || 0,
      masque: c.masque ? 'oui' : '',
      par: ACCES.moniteur || ''
    });
    if(!silencieux) showToast('Enregistré ✅');
  }catch(e){
    if(!silencieux) showToast('Impossible : ' + e.message);
    throw e;
  }
}


/* Ajouter une ligne qui n'a pas de préparation */
function ouvrirLigneManuelle(z){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(460px, 94vw)';

  boite.innerHTML =
    '<h3>Ajouter au planning affiché</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.5;">' +
      "Pour ce qui n'a pas de cours préparé : un rendez-vous, une reprise, " +
      'un créneau au simulateur.</div>' +
    '<label for="lmEleve">Élève ou intitulé</label>' +
    '<input type="text" id="lmEleve" list="listeEleves" autocomplete="off" ' +
      'placeholder="Ex : Ambre Guillebon, ou Réunion AAC">' +
    '<div class="duo">' +
      '<div><label for="lmHeure">Heure</label><input type="time" id="lmHeure"></div>' +
      '<div><label for="lmMon">Moniteur</label><select id="lmMon"></select></div>' +
    '</div>' +
    '<div class="duo">' +
      '<div><label for="lmMod">Véhicule</label>' +
        '<select id="lmMod"><option value="">— chargement —</option></select>' +
        '<input type="text" id="lmVeh" placeholder="Lequel ?" ' +
          'style="display:none;margin-top:6px;"></div>' +
      '<div><label for="lmLieu">Où</label><select id="lmLieu">' +
        '<option value="">— non précisé —</option>' +
        '<option value="devant">🛣️ Devant</option>' +
        '<option value="cour">🅿️ Cour intérieure</option>' +
        '<option value="moto">🏍️ Moto</option>' +
        '<option value="scooter">🛵 Scooter</option>' +
        '<option value="bureau">🏢 Bureau</option>' +
        '<option value="tablettes">📱 Salle des tablettes</option>' +
        '<option value="cours">📚 Salle de cours</option>' +
        '<option value="simulateur">🖥️ Simulateur</option>' +
      '</select></div>' +
    '</div>';

  /* La liste des véhicules, et la saisie libre qui va avec */
  const selMod = boite.querySelector('#lmMod');
  const champLibre = boite.querySelector('#lmVeh');
  remplirVehiculesEcran(selMod, '');
  selMod.addEventListener('change', () => {
    const libre = (selMod.value === 'autre');
    champLibre.style.display = libre ? 'block' : 'none';
    if(libre) setTimeout(() => champLibre.focus(), 60);
  });

  const gens = (typeof moniteursActifs !== 'undefined' ? moniteursActifs : []) || [];
  boite.querySelector('#lmMon').innerHTML = '<option value="">— aucun —</option>' +
    gens.map(g => '<option value="' + String(g).replace(/"/g, '&quot;') + '">' +
                  g + '</option>').join('');

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '➕ Ajouter';
  bOk.addEventListener('click', async () => {
    const nom = boite.querySelector('#lmEleve').value.trim();
    if(!nom){ showToast('Indique un élève ou un intitulé.'); return; }

    bOk.disabled = true;
    bOk.textContent = 'Ajout…';
    try{
      await appelPrep({
        action: 'ecranLigneSet',
        jour: todayLocal(),
        eleve: nom,
        moniteur: boite.querySelector('#lmMon').value,
        heure: boite.querySelector('#lmHeure').value,
        vehicule: (boite.querySelector('#lmMod').value === 'autre')
                    ? boite.querySelector('#lmVeh').value.trim()
                    : boite.querySelector('#lmMod').value,
        lieu: boite.querySelector('#lmLieu').value,
        ordre: 0,
        par: ACCES.moniteur || ''
      });
      document.body.removeChild(fond);
      showToast('Ajouté au planning ✅');
      chargerPlanningEcran(z);
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
      bOk.textContent = '➕ Ajouter';
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#lmEleve').focus(), 100);
}


/* « Ambre Guillebon » devient « Ambre G. », comme sur l'écran */
function abregeNom(nom){
  const b = String(nom || '').trim().split(/\s+/);
  if(b.length < 2) return b[0] || '';
  return b[0] + ' ' + b[b.length - 1].charAt(0).toUpperCase() + '.';
}


/* Le jeton, demandé une fois au Worker : il le connaît déjà, et
   le recopier à la main dans chaque adresse était une source
   d'oubli. */
let jetonEcran = null;

async function chargerJetonEcran(){
  if(jetonEcran !== null) return jetonEcran;
  try{
    const d = await appelPrep({ action: 'ecranJeton' });
    jetonEcran = (d && d.jeton) || '';
  }catch(e){ jetonEcran = ''; }
  return jetonEcran;
}


/* Les adresses des deux écrans, à copier une fois pour toutes */
function blocAdresses(){
  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:10px 12px;margin-bottom:14px;';
  d.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:700;' +
    'color:var(--accent-text);">📺 Adresses des écrans</summary>';

  const a = document.createElement('div');
  a.style.cssText = 'font-size:11px;color:var(--muted);margin:10px 0;line-height:1.55;';
  a.innerHTML = 'À ouvrir sur le téléviseur, en plein écran. Le jeton est déjà ' +
    'dans l\'adresse : copie-la telle quelle.<br>Elles ne donnent accès qu\'à ' +
    'l\'affichage : ni bilans, ni élèves, ni réglages.';
  d.appendChild(a);

  const base = 'https://ec-sb.github.io/Bilan-conduite/ecran.html';
  const champs = [];

  [['🏠 Accueil — avec le planning', 'accueil&anonyme=1'],
   ['🪟 Vitrine — sans le planning', 'vitrine']]
  .forEach(([nom, suite]) => {
    const t = document.createElement('div');
    t.style.cssText = 'font-size:12px;font-weight:700;margin:10px 0 4px;';
    t.textContent = nom;
    d.appendChild(t);

    const r = document.createElement('div');
    r.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';

    const z = document.createElement('input');
    z.type = 'text';
    z.value = 'Lecture du jeton…';
    z.readOnly = true;
    z.style.cssText = 'flex:1;min-width:0;font-size:12px;padding:9px 10px;margin:0;';
    z.addEventListener('focus', () => z.select());
    r.appendChild(z);
    champs.push([z, suite]);

    /* Copier d'un geste : l'adresse est longue et se recopie mal */
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;padding:9px 11px;font-size:12px;margin:0;flex-shrink:0;';
    b.textContent = '📋';
    b.title = 'Copier l\'adresse';
    b.addEventListener('click', async () => {
      try{
        await navigator.clipboard.writeText(z.value);
        showToast('Adresse copiée ✅');
      }catch(e){
        z.focus(); z.select();
        showToast('Sélectionnée : copie-la avec Ctrl+C');
      }
    });
    r.appendChild(b);

    d.appendChild(r);
  });

  /* Le jeton arrive après : on remplit les adresses quand il est là */
  chargerJetonEcran().then(j => {
    champs.forEach(([z, suite]) => {
      z.value = j
        ? base + '?t=' + encodeURIComponent(j) + '&ou=' + suite
        : base + '?t=JETON_ABSENT&ou=' + suite;
    });
    if(!j){
      a.innerHTML = '⚠️ <strong>ECRAN_TOKEN n\'est pas réglé dans Cloudflare.</strong><br>' +
        'Ajoute cette variable, puis reviens ici : les adresses se rempliront seules.';
      a.style.color = 'var(--warn-text)';
    }
  });

  const n = document.createElement('div');
  n.style.cssText = 'font-size:11px;color:var(--muted);line-height:1.5;margin-top:8px;';
  n.innerHTML = '💡 <strong>anonyme=1</strong> affiche « Ambre G. » plutôt que le nom ' +
    'entier : l\'écran d\'accueil est vu par d\'autres élèves et par des visiteurs. ' +
    'Retire-le si tu préfères les noms complets.';
  d.appendChild(n);

  return d;
}


/* Une diapositive dans la liste */
function ligneDiapo(d, rang){
  const l = document.createElement('div');
  l.style.cssText = 'display:flex;gap:10px;align-items:center;' +
    'border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
    'margin-bottom:6px;' + (d.actif ? '' : 'opacity:.5;');

  /* L'aperçu : l'image, ou le type */
  const ap = document.createElement('div');
  ap.style.cssText = 'width:52px;height:38px;flex-shrink:0;border-radius:7px;' +
    'background:var(--navy);display:flex;align-items:center;justify-content:center;' +
    'font-size:20px;overflow:hidden;';
  if(d.image){
    const i = document.createElement('img');
    i.src = d.image;
    i.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    ap.appendChild(i);
  }else{
    ap.textContent = (d.type === 'panneau') ? '📝'
                   : (d.type === 'video') ? '🎬'
                   : (d.type === 'bandeau') ? '📢' : '💬';
  }
  l.appendChild(ap);

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:14px;line-height:1.45;cursor:pointer;';
  const ouTexte = { accueil:'🏠 accueil', vitrine:'🪟 vitrine', 'les-deux':'🏠🪟 les deux' };
  const roles = { fond:'🖼️ fond fixe', panneau:'📝 texte fixe',
                  bandeau:'📢 défilant' };
  const estVideo = (d.type === 'video');
  const fixe = !!roles[d.type];

  t.innerHTML =
    '<strong>' + (d.titre || d.contenu || 'Sans titre').slice(0, 40)
      .replace(/</g, '&lt;') + '</strong>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      (fixe ? roles[d.type] + ' · ' : '') + (estVideo ? '🎬 vidéo · ' : '') +
      (ouTexte[d.ou] || d.ou) +
      (fixe ? '' : ' · ' + (Number(d.duree) === 0 ? '🔁 en boucle'
                                                  : d.duree + ' s mini')) +
      (d.du || d.au ? ' · du ' + (d.du || '…') + ' au ' + (d.au || '…') : '') +
      (d.actif ? '' : ' · en pause') +
    '</div>';
  t.addEventListener('click', () => ouvrirEditeurDiapo(d));
  l.appendChild(t);

  /* Monter et descendre : l'ordre du carrousel */
  [['▲', -1], ['▼', 1]].forEach(([signe, sens]) => {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;padding:6px 8px;font-size:12px;margin:0;flex-shrink:0;';
    b.textContent = signe;
    b.addEventListener('click', async () => {
      const j = rang + sens;
      if(j < 0 || j >= diaposEcran.length) return;

      const a = diaposEcran[rang];
      diaposEcran[rang] = diaposEcran[j];
      diaposEcran[j] = a;
      diaposEcran.forEach((x, n) => { x.ordre = n + 1; });

      afficherEcran();
      try{
        await Promise.all([diaposEcran[rang], diaposEcran[j]].map(x =>
          appelPrep({ action: 'ecranSet', id: x.id, type: x.type, titre: x.titre,
                      contenu: x.contenu, ou: x.ou, duree: x.duree,
                      actif: x.actif ? 'oui' : 'non', du: x.du, au: x.au,
                      ordre: x.ordre, par: ACCES.moniteur || '' })));
      }catch(e){ showToast('Ordre non enregistré : ' + e.message); }
    });
    l.appendChild(b);
  });

  /* En pause : elle reste, mais ne passe plus */
  const bP = document.createElement('button');
  bP.className = 'btn btn-secondary';
  bP.style.cssText = 'width:auto;padding:6px 9px;font-size:13px;margin:0;flex-shrink:0;';
  bP.textContent = d.actif ? '⏸️' : '▶️';
  bP.title = d.actif ? 'Mettre en pause' : 'Remettre à l\'écran';
  bP.addEventListener('click', async () => {
    d.actif = !d.actif;
    afficherEcran();
    try{
      await appelPrep({ action: 'ecranSet', id: d.id, type: d.type, titre: d.titre,
                        contenu: d.contenu, ou: d.ou, duree: d.duree,
                        actif: d.actif ? 'oui' : 'non', du: d.du, au: d.au,
                        ordre: d.ordre, par: ACCES.moniteur || '' });
    }catch(e){
      d.actif = !d.actif;
      afficherEcran();
      showToast('Impossible : ' + e.message);
    }
  });
  l.appendChild(bP);

  return l;
}


/* ============================================================
   CRÉER OU MODIFIER UNE DIAPOSITIVE
   ============================================================ */

function ouvrirEditeurDiapo(d){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(540px, 94vw);max-height:88vh;overflow-y:auto;';

  boite.innerHTML =
    '<h3>' + (d ? 'Modifier la diapositive' : 'Nouvelle diapositive') + '</h3>' +

    '<label for="diType">Rôle de cette diapositive</label>' +
    '<select id="diType">' +
      '<option value="message">🔄 Elle tourne dans le carrousel</option>' +
      '<option value="video">🎬 Vidéo</option>' +
      '<option value="bandeau">📢 Texte défilant en bas</option>' +
      '<option value="fond">🖼️ Fond fixe de la vitrine</option>' +
      '<option value="panneau">📝 Texte fixe à gauche de la vitrine</option>' +
    '</select>' +
    '<div id="diAideType" style="font-size:11px;color:var(--muted);' +
      'margin:-8px 0 12px;line-height:1.5;"></div>' +

    '<label for="diTitre">Titre (facultatif)</label>' +
    '<input type="text" id="diTitre" placeholder="Ex : Portes ouvertes">' +

    '<label for="diTexte">Message</label>' +
    '<textarea id="diTexte" rows="4" placeholder="Le texte affiché en grand. ' +
      'Laisse vide si tu ne mets qu\'une image."></textarea>' +

    '<label>Image (facultatif)</label>' +
    '<div id="diApercu" style="margin-bottom:8px;"></div>' +
    '<div id="diColler" tabindex="0" style="border:2px dashed var(--line);' +
      'border-radius:10px;padding:14px 12px;text-align:center;font-size:13px;' +
      'color:var(--muted);cursor:pointer;margin-bottom:6px;">' +
      '📋 <strong>Colle ton image ici</strong><br>' +
      '<span style="font-size:11px;">Ctrl+V, ou fais glisser le fichier</span></div>' +
    '<input type="file" id="diFichier" accept="image/*" ' +
      'style="font-size:13px;padding:9px;margin-bottom:12px;">' +

    '<div class="duo">' +
      '<div><label for="diOu">Sur quel écran</label>' +
        '<select id="diOu">' +
          '<option value="les-deux">🏠🪟 Les deux</option>' +
          '<option value="accueil">🏠 Accueil seulement</option>' +
          '<option value="vitrine">🪟 Vitrine seulement</option>' +
        '</select></div>' +
      '<div><label for="diDuree">Durée à l\'écran</label>' +
        '<select id="diDuree">' +
          '<option value="6">6 secondes</option>' +
          '<option value="10">10 secondes</option>' +
          '<option value="15" selected>15 secondes</option>' +
          '<option value="25">25 secondes</option>' +
          '<option value="40">40 secondes</option>' +
          '<option value="60">1 minute</option>' +
          '<option value="120">2 minutes</option>' +
          '<option value="300">5 minutes</option>' +
          '<option value="0">🔁 En boucle</option>' +
        '</select></div>' +
    '</div>' +

    '<div class="duo">' +
      '<div><label for="diDu">À partir du (facultatif)</label>' +
        '<input type="date" id="diDu"></div>' +
      '<div><label for="diAu">Jusqu\'au (facultatif)</label>' +
        '<input type="date" id="diAu"></div>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-bottom:12px;line-height:1.5;">' +
      'Sans dates, elle passe en permanence. Avec, elle apparaît et disparaît ' +
      'toute seule — pratique pour une porte ouverte ou une fermeture.</div>';

  let imageChoisie = (d && d.image) || '';

  /* Le rôle change ce qui compte : un fond n'a pas de durée, un
     panneau n'a pas d'image. */
  const selType = boite.querySelector('#diType');
  const aideType = boite.querySelector('#diAideType');

  const majSelonType = () => {
    const t = selType.value;
    const explications = {
      message: 'Elle passe à l\'écran avec les autres, chacune son tour.',
      video: 'Colle l\'adresse du fichier .mp4 dans le champ Message. ' +
             'Elle est lue sans le son et JAMAIS coupée : la durée choisie ' +
             'est arrondie au tour complet. « En boucle » la fait tourner ' +
             'sans fin si elle est seule à l\'écran.',
      bandeau: 'Défile en permanence en bas de l\'écran, pendant que le reste ' +
               'tourne. Plusieurs textes défilants se suivent à la queue leu leu.',
      fond: 'Image affichée en permanence derrière tout le reste, sur la ' +
            'vitrine. Sans elle, le dégradé vert par défaut s\'applique.',
      panneau: 'Texte affiché en permanence à gauche de la vitrine, pendant ' +
               'que les photos tournent à droite. Une seule à la fois.'
    };
    aideType.textContent = explications[t] || '';

    /* Ce qui ne sert pas se masque plutôt que d'induire en erreur */
    const ligneDuree = boite.querySelector('#diDuree').closest('div');
    if(ligneDuree){
      ligneDuree.style.display = (t === 'message' || t === 'video') ? 'block' : 'none';
    }

    /* Une vidéo, un panneau et un bandeau n'ont pas d'image */
    const sansImage = (t === 'panneau' || t === 'video' || t === 'bandeau');
    ['#diColler', '#diFichier', '#diApercu'].forEach(s => {
      const e = boite.querySelector(s);
      if(e) e.style.display = sansImage ? 'none' : '';
    });

    /* Un bandeau n'a pas de titre : tout tient dans le message */
    const lblTitre = boite.querySelector('label[for="diTitre"]');
    const zTitre = boite.querySelector('#diTitre');
    if(lblTitre && zTitre){
      const cacher = (t === 'bandeau');
      lblTitre.style.display = cacher ? 'none' : '';
      zTitre.style.display = cacher ? 'none' : '';
    }

    /* Le champ « Message » change de rôle pour une vidéo */
    const lblTexte = boite.querySelector('label[for="diTexte"]');
    const zTexte = boite.querySelector('#diTexte');
    if(lblTexte && zTexte){
      if(t === 'video'){
        lblTexte.textContent = 'Adresse de la vidéo';
        zTexte.rows = 2;
        zTexte.placeholder = 'https://ec-sb.github.io/Bilan-conduite/videos/ma-video.mp4';
      }else if(t === 'bandeau'){
        lblTexte.textContent = 'Le texte qui défile';
        zTexte.rows = 2;
        zTexte.placeholder = 'Ex : Inscriptions ouvertes pour la session de septembre — ' +
                             '09 83 55 56 87';
      }else{
        lblTexte.textContent = 'Message';
        zTexte.rows = 4;
        zTexte.placeholder = 'Le texte affiché en grand. Laisse vide si tu ne ' +
                             'mets qu\'une image.';
      }
    }
  };

  selType.addEventListener('change', majSelonType);

  const apercu = boite.querySelector('#diApercu');
  const montrer = () => {
    apercu.innerHTML = imageChoisie
      ? '<img src="' + imageChoisie + '" style="max-width:100%;max-height:170px;' +
        'border-radius:9px;border:1px solid var(--line);">'
      : '';
  };

  if(d){
    selType.value = d.type === 'fond' ? 'fond'
                  : d.type === 'panneau' ? 'panneau' : 'message';
    boite.querySelector('#diTitre').value = d.titre || '';
    boite.querySelector('#diTexte').value = d.contenu || '';
    boite.querySelector('#diOu').value = d.ou || 'les-deux';
    boite.querySelector('#diDuree').value = String(d.duree || 15);
    boite.querySelector('#diDu').value = d.du || '';
    boite.querySelector('#diAu').value = d.au || '';
  }
  montrer();
  majSelonType();

  /* Coller, glisser, ou choisir : les trois façons */
  const prendre = async fichier => {
    if(!fichier) return;
    try{
      imageChoisie = await compresserImage(fichier);
      montrer();
  majSelonType();
    }catch(e){ showToast('Image refusée : ' + e.message); }
  };

  const zc = boite.querySelector('#diColler');
  zc.addEventListener('click', () => zc.focus());
  zc.addEventListener('paste', ev => {
    const items = (ev.clipboardData && ev.clipboardData.items) || [];
    for(let i = 0; i < items.length; i++){
      if(items[i].type && items[i].type.indexOf('image') === 0){
        ev.preventDefault();
        prendre(items[i].getAsFile());
        return;
      }
    }
  });
  ['dragenter', 'dragover'].forEach(n => zc.addEventListener(n, ev => {
    ev.preventDefault();
    zc.style.borderColor = 'var(--orange)';
  }));
  ['dragleave', 'drop'].forEach(n => zc.addEventListener(n, ev => {
    ev.preventDefault();
    zc.style.borderColor = 'var(--line)';
  }));
  zc.addEventListener('drop', ev => {
    const f = (ev.dataTransfer && ev.dataTransfer.files || [])[0];
    if(f && f.type.indexOf('image') === 0) prendre(f);
  });
  boite.querySelector('#diFichier').addEventListener('change', ev => {
    prendre(ev.target.files && ev.target.files[0]);
  });

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  if(d){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer cette diapositive ?')) return;
      try{
        await appelPrep({ action: 'ecranDelete', id: d.id });
        document.body.removeChild(fond);
        showToast('Supprimée ✅');
        afficherEcran();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bSup);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = d ? '💾 Enregistrer' : '➕ Ajouter';
  bOk.addEventListener('click', async () => {
    const titre = boite.querySelector('#diTitre').value.trim();
    const texte = boite.querySelector('#diTexte').value.trim();

    if(selType.value === 'video' && !/^https?:\/\/.+\.(mp4|webm|ogg)/i.test(texte)){
      showToast('Colle l\'adresse complète d\'un fichier .mp4');
      return;
    }
    if(!titre && !texte && !imageChoisie){
      showToast('Mets au moins un texte ou une image.');
      return;
    }

    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      await appelPrep({
        action: 'ecranSet',
        id: d ? d.id : '',
        type: (selType.value === 'message')
                ? (imageChoisie ? 'image' : 'message')
                : selType.value,
        titre: titre,
        contenu: texte,
        /* L'image n'est renvoyée que si elle a changé : elle est
           lourde, et le serveur garde l'ancienne sinon. */
        image: (imageChoisie && imageChoisie !== (d && d.image)) ? imageChoisie : '',
        ou: boite.querySelector('#diOu').value,
        duree: boite.querySelector('#diDuree').value,
        actif: d ? (d.actif ? 'oui' : 'non') : 'oui',
        du: boite.querySelector('#diDu').value,
        au: boite.querySelector('#diAu').value,
        ordre: d ? d.ordre : 0,
        par: ACCES.moniteur || ''
      });
      document.body.removeChild(fond);
      showToast(d ? 'Diapositive modifiée ✅' : 'Diapositive ajoutée ✅');
      afficherEcran();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
      bOk.textContent = d ? '💾 Enregistrer' : '➕ Ajouter';
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#diTitre').focus(), 100);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-ecran.js'] = true;
