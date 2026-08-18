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
  a.textContent = liste.length + ' ligne(s) · heure, véhicule et emplacement se ' +
    'règlent ici. L\'écran se met à jour dans la minute.';
  z.appendChild(a);

  liste.forEach(c => z.appendChild(lignePlanningEcran(c, liste, z)));
}

function lignePlanningEcran(c, liste, z){
  const l = document.createElement('div');
  l.style.cssText = 'border-bottom:1px solid rgba(255,255,255,.05);padding:9px 0;';

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
    '<div style="font-size:11px;color:var(--muted);">' +
      (c.moniteur ? c.moniteur.replace(/</g, '&lt;') : 'moniteur à définir') +
      ' · 👁️ ' + abregeNom(c.eleveComplet || c.eleve) +
    '</div>';
  h1.appendChild(t);

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

  const v = document.createElement('input');
  v.type = 'text';
  v.value = c.vehicule || '';
  v.placeholder = c.simulateur ? 'Simulateur n°' : 'Voiture n°';
  v.style.cssText = 'flex:1;min-width:0;margin:0;padding:6px 9px;font-size:13px;';
  v.addEventListener('change', () => { c.vehicule = v.value.trim(); enregistrerLigne(c); });
  h2.appendChild(v);

  const lieu = document.createElement('select');
  lieu.style.cssText = 'width:auto;flex-shrink:0;margin:0;padding:6px 9px;font-size:13px;';
  lieu.innerHTML =
    '<option value="">— où —</option>' +
    '<option value="devant">🚗 Devant</option>' +
    '<option value="cour">🏠 Cour intérieure</option>' +
    '<option value="simulateur">🖥️ Simulateur</option>';
  lieu.value = c.lieu || '';
  lieu.addEventListener('change', () => { c.lieu = lieu.value; enregistrerLigne(c); });
  h2.appendChild(lieu);

  /* Une ligne ajoutée à la main se retire de la même façon */
  if(c.manuel){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'width:auto;padding:6px 8px;font-size:12px;margin:0;' +
      'flex-shrink:0;color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Retirer cette ligne de l\'affichage ?')) return;
      try{
        await appelPrep({ action: 'ecranLigneDelete', id: c.id });
        showToast('Retirée ✅');
        chargerPlanningEcran(z);
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    h2.appendChild(bSup);
  }

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
      '<div><label for="lmVeh">Véhicule ou simulateur</label>' +
        '<input type="text" id="lmVeh" placeholder="Ex : 3"></div>' +
      '<div><label for="lmLieu">Où</label><select id="lmLieu">' +
        '<option value="">— non précisé —</option>' +
        '<option value="devant">🚗 Devant</option>' +
        '<option value="cour">🏠 Cour intérieure</option>' +
        '<option value="simulateur">🖥️ Simulateur</option>' +
      '</select></div>' +
    '</div>';

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
        vehicule: boite.querySelector('#lmVeh').value.trim(),
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
                   : (d.type === 'video') ? '🎬' : '💬';
  }
  l.appendChild(ap);

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:14px;line-height:1.45;cursor:pointer;';
  const ouTexte = { accueil:'🏠 accueil', vitrine:'🪟 vitrine', 'les-deux':'🏠🪟 les deux' };
  const roles = { fond:'🖼️ fond fixe', panneau:'📝 texte fixe' };
  const estVideo = (d.type === 'video');
  const fixe = !!roles[d.type];

  t.innerHTML =
    '<strong>' + (d.titre || d.contenu || 'Sans titre').slice(0, 40)
      .replace(/</g, '&lt;') + '</strong>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      (fixe ? roles[d.type] + ' · ' : '') + (estVideo ? '🎬 vidéo · ' : '') +
      (ouTexte[d.ou] || d.ou) + (fixe ? '' : ' · ' + d.duree + ' s mini') +
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
             'La vidéo est lue sans le son, en entier, puis le carrousel ' +
             'reprend. Dépose-la dans le dossier videos/ de GitHub.',
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

    /* Une vidéo n'a pas d'image, un panneau non plus */
    ['#diColler', '#diFichier', '#diApercu'].forEach(s => {
      const e = boite.querySelector(s);
      if(e) e.style.display = (t === 'panneau' || t === 'video') ? 'none' : '';
    });

    /* Le champ « Message » change de rôle pour une vidéo */
    const lblTexte = boite.querySelector('label[for="diTexte"]');
    const zTexte = boite.querySelector('#diTexte');
    if(lblTexte && zTexte){
      if(t === 'video'){
        lblTexte.textContent = 'Adresse de la vidéo';
        zTexte.rows = 2;
        zTexte.placeholder = 'https://ec-sb.github.io/Bilan-conduite/videos/ma-video.mp4';
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
