/* ============================================================
   ec-bilans.js
   Gestion des modèles de bilan.

   Deux choses distinctes, que l'on modifie séparément :
   • le SQUELETTE, qui produit le texte du bilan — il est commun
     au mode vocal et au mode manuel ;
   • les CONSIGNES À L'IA, utilisées seulement en mode vocal pour
     transformer la transcription du cours en éléments du bilan.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Ce que produit chaque squelette, en clair */
const DESCRIPTION_SCHEMA = {
  conduiteResume: "Bilan de conduite en boîte manuelle : carte SD, installation, " +
                  "ton cours, erreurs par rubrique, fiche véhicule, frise.",
  conduiteResumeAuto: "Bilan de conduite en boîte automatique. Même structure au " +
                  "départ que la boîte manuelle, modifiable indépendamment.",
  conduite:       "Bilan de conduite détaillé, sans reprise du cours dicté.",
  rvp:            "Rendez-vous pédagogique AAC : déroulé de la séance.",
  accompagnateur: "Formation accompagnateur, rédigée au vouvoiement.",
  simu:           "Simulateur : compétences travaillées et remarques.",
  eval:           "Évaluation de départ : bilan, heures et frise prévisionnelle.",
  examen:         "Examen officiel : vérifications et observations de l'inspecteur.",
  examenblanc:    "Examen blanc : CEPC noté, bilan erreurs, niveau permis.",
  rdvpost:        "Rendez-vous post-permis : écran dédié, sans texte assemblé."
};

/* Les groupes, dans l'ordre d'affichage */
const GROUPES_MODELE = ['Conduite', 'Conduite accompagnée', 'Rendez-vous préalable',
                        'Simulateur', 'Évaluation', 'Examen'];

/* Modèles ajoutés par l'auto-école, en plus des modèles d'origine */
let modelesAjoutes = [];

async function chargerModelesBilan(){
  try{
    if(typeof chargerModelesTexte === 'function') await chargerModelesTexte();
    modelesAjoutes = (modelesTexte || []).filter(m => m.usage === 'modele_bilan');
  }catch(e){ console.warn('Modèles de bilan :', e); }
  return modelesAjoutes;
}

/* Ajoute les modèles enregistrés à la liste des types de bilan */
function appliquerModelesAjoutes(){
  modelesAjoutes.forEach(m => {
    let d;
    try{ d = JSON.parse(m.contenu); }catch(e){ return; }
    if(!d || !d.cle || !d.schema) return;

    /* On reprend le fonctionnement d'un modèle existant du même squelette */
    const source = Object.keys(MODELES).find(k => MODELES[k].schema === d.schema &&
                                                  !MODELES[k].ajoute);
    if(!source) return;

    MODELES[d.cle] = {
      label:  d.label || m.nom,
      groupe: d.groupe || 'Conduite',
      schema: d.schema,
      opts:   MODELES[source].opts,
      comps:  MODELES[source].comps,
      build:  MODELES[source].build,
      ajoute: true
    };
  });
}

/* Les consignes IA réécrites par l'auto-école */
function consignesPersonnalisees(schema){
  const m = (modelesTexte || []).find(x => x.usage === 'consignes_' + schema);
  return m ? m.contenu : null;
}


/* ============================================================
   AFFICHAGE
   ============================================================ */
async function afficherTextesBilan(){
  const zone = $('bilansZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Chargement des modèles…</div>';
  await chargerModelesBilan();
  appliquerModelesAjoutes();
  appliquerChampsManuels();
  zone.innerHTML = '';

  /* Rappel de la distinction, une fois pour toutes */
  const info = document.createElement('div');
  info.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.6;' +
    'padding:9px 11px;background:var(--navy);border:1px solid var(--line);' +
    'border-radius:8px;margin-bottom:12px;';
  info.innerHTML =
    "🎙️ <strong>Mode vocal</strong> : l'IA lit la transcription et remplit le modèle. " +
    'Ses consignes sont modifiables ci-dessous.<br>' +
    '✍️ <strong>Mode manuel</strong> : le moniteur remplit lui-même les mêmes rubriques, ' +
    "sans IA.<br>Le texte produit est identique dans les deux cas.";
  zone.appendChild(info);

  const bNouveau = document.createElement('button');
  bNouveau.className = 'btn btn-primary';
  bNouveau.style.marginBottom = '14px';
  bNouveau.textContent = '➕ Ajouter un modèle de bilan';
  bNouveau.addEventListener('click', () => ouvrirEditeurModeleBilan());
  zone.appendChild(bNouveau);

  /* Les modèles, groupés */
  const parGroupe = {};
  Object.keys(MODELES).forEach(cle => {
    const m = MODELES[cle];
    const g = m.groupe || 'Autre';
    if(!parGroupe[g]) parGroupe[g] = [];
    parGroupe[g].push({ cle: cle, m: m });
  });

  const ordre = GROUPES_MODELE.concat(
    Object.keys(parGroupe).filter(g => GROUPES_MODELE.indexOf(g) === -1));

  let compte = 0;
  ordre.forEach(g => {
    if(!parGroupe[g]) return;

    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
      'margin:14px 0 6px;';
    t.textContent = g;
    zone.appendChild(t);

    parGroupe[g].forEach(({ cle, m }) => {
      compte++;
      const d = document.createElement('details');
      d.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
        'padding:10px 12px;margin-bottom:7px;' +
        (m.ajoute ? 'border-color:var(--orange);' : '');

      const som = document.createElement('summary');
      som.style.cssText = 'cursor:pointer;font-size:15px;font-weight:700;' +
        'color:var(--cream);list-style:none;';
      som.innerHTML = m.label.replace(/</g, '&lt;') +
        (m.ajoute ? ' <span style="font-size:11px;color:var(--accent-text);">· ajouté</span>' : '');
      d.appendChild(som);

      const desc = document.createElement('div');
      desc.style.cssText = 'font-size:12px;color:var(--muted);margin:6px 0 10px;line-height:1.5;';
      desc.textContent = DESCRIPTION_SCHEMA[m.schema] || 'Structure : ' + m.schema;
      d.appendChild(desc);

      /* Le formulaire manuel, puis les consignes IA */
      if(m.schema !== 'rdvpost'){
        d.appendChild(blocFormulaireManuel(m.schema));
        d.appendChild(blocConsignesIA(m.schema));
      }

      if(m.ajoute) d.appendChild(boutonRetirerModele(cle, m));

      zone.appendChild(d);
    });
  });

  const pied = document.createElement('div');
  pied.style.cssText = 'font-size:11px;color:var(--muted);margin-top:14px;line-height:1.6;';
  pied.textContent = compte + ' modèles disponibles dans la liste des types de bilan.';
  zone.appendChild(pied);
}


function boutonRetirerModele(cle, m){
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'margin-top:10px;padding:8px;font-size:12px;' +
    'color:var(--red);border-color:var(--red);';
  b.textContent = '🗑️ Retirer ce modèle';
  b.addEventListener('click', async () => {
    if(!await confirmer('Retirer le modèle « ' + m.label + ' » ?\n\n' +
                        'Les bilans déjà enregistrés ne changent pas.')) return;
    const src = modelesAjoutes.find(x => {
      try{ return JSON.parse(x.contenu).cle === cle; }catch(e){ return false; }
    });
    if(!src) return;
    b.disabled = true;
    try{
      await appelPrep({ action: 'modeleDelete', id: src.id });
      delete MODELES[cle];
      if(typeof remplirModeles === 'function') remplirModeles();
      showToast('Modèle retiré');
      afficherTextesBilan();
    }catch(e){ showToast('Erreur : ' + e.message); b.disabled = false; }
  });
  return b;
}


/* Les consignes données à l'IA pour un squelette donné */
function blocConsignesIA(schema){
  const d = document.createElement('details');
  d.style.cssText = 'margin-top:6px;';

  const perso = consignesPersonnalisees(schema);
  d.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:600;color:' +
    (perso ? 'var(--accent-text)' : 'var(--muted)') + ";\">🎙️ Consignes données à l'IA" +
    (perso ? ' · modifiées' : '') + '</summary>';

  const a = document.createElement('div');
  a.style.cssText = 'font-size:11px;color:var(--muted);margin:6px 0;line-height:1.5;';
  a.textContent = 'Ces consignes valent pour tous les modèles qui partagent cette ' +
    "structure, et ne servent qu'en mode vocal.";
  d.appendChild(a);

  let actuel = perso;
  if(actuel === null){
    try{ actuel = SCHEMAS[schema] ? consignesDOrigine(schema) : ''; }
    catch(e){ actuel = ''; }
  }

  const zt = document.createElement('textarea');
  zt.rows = 12;
  zt.value = actuel || '(consignes indisponibles pour cette structure)';
  zt.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:13px;' +
    'line-height:1.6;font-family:ui-monospace, monospace;resize:vertical;margin-bottom:8px;';
  d.appendChild(zt);

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;';

  const bEnr = document.createElement('button');
  bEnr.className = 'btn btn-secondary';
  bEnr.style.cssText = 'flex:1;padding:9px;font-size:13px;margin:0;';
  bEnr.textContent = '💾 Enregistrer les consignes';
  bEnr.addEventListener('click', async () => {
    const v = zt.value.trim();
    if(!v){ showToast('Les consignes sont vides.'); return; }
    bEnr.disabled = true;
    try{
      const src = (modelesTexte || []).find(x => x.usage === 'consignes_' + schema);
      await appelPrep({
        action: 'modeleSet',
        id: src ? src.id : '',
        usage: 'consignes_' + schema,
        nom: 'Consignes IA — ' + schema,
        contenu: v
      });
      showToast('Consignes enregistrées ✅');
      afficherTextesBilan();
    }catch(e){ showToast('Erreur : ' + e.message); bEnr.disabled = false; }
  });
  r.appendChild(bEnr);

  if(perso){
    const bRaz = document.createElement('button');
    bRaz.className = 'btn btn-secondary';
    bRaz.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;margin:0;';
    bRaz.textContent = '↩️';
    bRaz.title = "Revenir aux consignes d'origine";
    bRaz.addEventListener('click', async () => {
      if(!await confirmer("Revenir aux consignes d'origine ?")) return;
      const src = (modelesTexte || []).find(x => x.usage === 'consignes_' + schema);
      if(!src) return;
      bRaz.disabled = true;
      try{
        await appelPrep({ action: 'modeleDelete', id: src.id });
        showToast("Consignes d'origine rétablies");
        afficherTextesBilan();
      }catch(e){ showToast('Erreur : ' + e.message); bRaz.disabled = false; }
    });
    r.appendChild(bRaz);
  }

  d.appendChild(r);
  return d;
}

/* Les consignes telles que l'application les produit */
function consignesDOrigine(schema){
  const cle = Object.keys(MODELES).find(k => MODELES[k].schema === schema);
  if(!cle) return '';
  return construireConsignes(cle);
}


/* ============================================================
   AJOUT D'UN MODÈLE
   ============================================================ */
function ouvrirEditeurModeleBilan(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 94vw);max-height:90vh;overflow-y:auto;';

  /* On ne propose que les structures réellement disponibles */
  const schemas = [];
  Object.keys(MODELES).forEach(k => {
    const s = MODELES[k].schema;
    if(s && s !== 'rdvpost' && schemas.indexOf(s) === -1) schemas.push(s);
  });

  boite.insertAdjacentHTML('beforeend',
    '<h3>➕ Nouveau modèle de bilan</h3>' +
    '<div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:14px;">' +
      "Le nouveau modèle reprend la structure d'un modèle existant : même bilan " +
      'produit, même fonctionnement en vocal et en manuel. Seuls son nom et son ' +
      'groupe changent. Ses consignes IA restent celles de la structure choisie.' +
    '</div>' +
    '<label for="mbNom">Nom du modèle</label>' +
    '<input type="text" id="mbNom" placeholder="Ex : Conduite — Perfectionnement">' +
    '<label for="mbGroupe">Groupe</label>' +
    '<select id="mbGroupe">' +
      GROUPES_MODELE.map(g => '<option value="' + g + '">' + g + '</option>').join('') +
    '</select>' +
    '<label for="mbSchema">Structure de bilan reprise</label>' +
    '<select id="mbSchema">' +
      schemas.map(s => '<option value="' + s + '">' + s + '</option>').join('') +
    '</select>' +
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:14px;color:var(--cream);margin-bottom:12px;">' +
      '<input type="checkbox" id="mbFormulaire" style="width:18px;height:18px;">' +
      'Ouvrir le formulaire manuel après création</label>' +
    '<div id="mbDesc" style="font-size:11px;color:var(--muted);margin:-8px 0 12px;' +
      'line-height:1.5;"></div>');

  const rangee = document.createElement('div');
  rangee.className = 'btn-row';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '💾 Ajouter';
  rangee.appendChild(bAnn); rangee.appendChild(bOk);
  boite.appendChild(rangee);

  const msg = document.createElement('div');
  msg.style.cssText = 'margin-top:8px;font-size:13px;min-height:16px;';
  boite.appendChild(msg);

  fond.appendChild(boite);
  document.body.appendChild(fond);

  const selS = boite.querySelector('#mbSchema');
  const desc = boite.querySelector('#mbDesc');
  const majDesc = () => { desc.textContent = DESCRIPTION_SCHEMA[selS.value] || ''; };
  selS.addEventListener('change', majDesc);
  majDesc();

  bAnn.addEventListener('click', () => document.body.removeChild(fond));

  bOk.addEventListener('click', async () => {
    const nom = boite.querySelector('#mbNom').value.trim();
    if(!nom){ msg.style.color = 'var(--warn-text)'; msg.textContent = 'Donne un nom.'; return; }

    const cle = 'perso-' + normaliserMot(nom).replace(/[^a-z0-9]+/g, '-').slice(0, 28) +
                '-' + Date.now().toString(36).slice(-4);

    bOk.disabled = true;
    bOk.textContent = 'Ajout…';
    try{
      await appelPrep({
        action: 'modeleSet',
        usage: 'modele_bilan',
        nom: nom,
        contenu: JSON.stringify({
          cle: cle,
          label: nom,
          groupe: boite.querySelector('#mbGroupe').value,
          schema: selS.value
        })
      });
      const ouvrirForm = boite.querySelector('#mbFormulaire').checked;
      const schemaChoisi = selS.value;
      document.body.removeChild(fond);
      await chargerModelesBilan();
      appliquerModelesAjoutes();
      if(typeof remplirModeles === 'function') remplirModeles();
      showToast('Modèle ajouté ✅');
      await afficherTextesBilan();

      /* On amène directement au formulaire du nouveau modèle */
      if(ouvrirForm){
        setTimeout(() => {
          const zone = $('bilansZone');
          if(!zone) return;
          const blocs = zone.querySelectorAll('details');
          for(let i = 0; i < blocs.length; i++){
            const s = blocs[i].querySelector('summary');
            if(s && s.textContent.indexOf(nom) !== -1){
              blocs[i].open = true;
              const sous = blocs[i].querySelectorAll('details');
              if(sous[0]) sous[0].open = true;
              blocs[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
              return;
            }
          }
        }, 150);
      }
    }catch(e){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Erreur : ' + e.message;
      bOk.disabled = false;
      bOk.textContent = '💾 Ajouter';
    }
  });
}


/* Chargé à l'ouverture de session, pour que les modèles ajoutés
   apparaissent dans la liste des types de bilan. */
async function appliquerTextesBilan(){
  await chargerModelesBilan();
  appliquerModelesAjoutes();
  appliquerChampsManuels();
  if(typeof remplirModeles === 'function') remplirModeles();
}


/* ============================================================
   FORMULAIRE DU BILAN MANUEL
   Les rubriques que le moniteur remplit lui-même, modèle par
   modèle. Modifiables, réordonnables, avec ajout et retrait.
   ============================================================ */
const TYPES_CHAMP = [
  { cle:'ok',          nom:'✅❌ Trois états',      aide:'Coche verte, croix, ou rien' },
  { cle:'texte',       nom:'✍️ Texte libre',        aide:'Zone de saisie, dictée possible' },
  { cle:'court',       nom:'▪️ Ligne courte',       aide:'Une seule ligne' },
  { cle:'themes',      nom:"🧠 Rubriques d'erreurs", aide:'Une zone par rubrique' },
  { cle:'manoeuvres',  nom:'🦉 Fiche manœuvres',    aide:'Cases à cocher' },
  { cle:'competences', nom:'📋 Compétences',        aide:'Cases à cocher du simulateur' },
  { cle:'cepc',        nom:'🧾 CEPC noté',          aide:'Grille officielle' },
  { cle:'observations',nom:'👮 Observations',       aide:'Constat et explication' },
  { cle:'niveau',      nom:'🎯 Niveau permis',      aide:'Oui / Pas le niveau' },
  { cle:'ouinon',      nom:'👍 Oui ou non',         aide:'Deux états' },
  { cle:'photo',       nom:'📷 Photo',              aide:'Capture, non envoyée dans le bilan' }
];

function nomTypeChamp(cle){
  const t = TYPES_CHAMP.find(x => x.cle === cle);
  return t ? t.nom : cle;
}

/* Les champs enregistrés par l'auto-école pour une structure */
function champsPersonnalises(schema){
  const m = (modelesTexte || []).find(x => x.usage === 'champs_' + schema);
  if(!m) return null;
  try{ return JSON.parse(m.contenu); }catch(e){ return null; }
}

/* Applique les formulaires enregistrés */
function appliquerChampsManuels(){
  if(typeof CHAMPS_MANUELS === 'undefined') return;
  Object.keys(CHAMPS_MANUELS).forEach(schema => {
    const perso = champsPersonnalises(schema);
    if(perso && perso.length) CHAMPS_MANUELS[schema] = perso;
  });
}


/* L'éditeur du formulaire manuel d'une structure */
function blocFormulaireManuel(schema){
  const d = document.createElement('details');
  d.style.cssText = 'margin-top:8px;';

  const perso = champsPersonnalises(schema);
  const dispo = (typeof CHAMPS_MANUELS !== 'undefined') && CHAMPS_MANUELS[schema];

  d.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:600;color:' +
    (perso ? 'var(--accent-text)' : 'var(--muted)') + ';">✍️ Formulaire du bilan manuel' +
    (perso ? ' · modifié' : '') + '</summary>';

  if(!dispo){
    const v = document.createElement('div');
    v.style.cssText = 'font-size:12px;color:var(--muted);margin:8px 0;line-height:1.5;';
    v.textContent = "Cette structure n'a pas de formulaire manuel : " +
      "elle passe par un écran dédié.";
    d.appendChild(v);
    return d;
  }

  const a = document.createElement('div');
  a.style.cssText = 'font-size:11px;color:var(--muted);margin:6px 0 8px;line-height:1.5;';
  a.textContent = 'Les rubriques que le moniteur remplit, dans l\'ordre. ' +
    'Elles valent pour tous les modèles de cette structure.';
  d.appendChild(a);

  /* Copie de travail : on n'écrit qu'à l'enregistrement */
  let champs = JSON.parse(JSON.stringify(CHAMPS_MANUELS[schema]));

  const liste = document.createElement('div');
  d.appendChild(liste);

  function dessiner(){
    liste.innerHTML = '';
    champs.forEach((ch, i) => {
      const l = document.createElement('div');
      l.style.cssText = 'border:1px solid var(--line);border-radius:8px;padding:8px 10px;' +
        'margin-bottom:6px;';

      const h = document.createElement('div');
      h.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';

      const nom = document.createElement('input');
      nom.type = 'text';
      nom.value = ch.nom || '';
      nom.placeholder = 'Nom de la rubrique';
      nom.style.cssText = 'flex:1;margin:0;font-size:14px;padding:8px 9px;min-width:0;';
      nom.addEventListener('input', () => { ch.nom = nom.value; });
      h.appendChild(nom);

      if(i > 0){
        const bh = document.createElement('button');
        bh.type = 'button';
        bh.className = 'btn btn-secondary';
        bh.style.cssText = 'width:auto;padding:7px 9px;font-size:13px;margin:0;flex-shrink:0;';
        bh.textContent = '↑';
        bh.title = 'Monter';
        bh.addEventListener('click', () => {
          const t = champs[i - 1]; champs[i - 1] = champs[i]; champs[i] = t;
          dessiner();
        });
        h.appendChild(bh);
      }

      const bx = document.createElement('button');
      bx.type = 'button';
      bx.className = 'btn btn-secondary';
      bx.style.cssText = 'width:auto;padding:7px 9px;font-size:13px;margin:0;flex-shrink:0;' +
        'color:var(--red);border-color:var(--red);';
      bx.textContent = '✕';
      bx.title = 'Retirer';
      bx.addEventListener('click', () => { champs.splice(i, 1); dessiner(); });
      h.appendChild(bx);

      l.appendChild(h);

      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:6px;';

      const st = document.createElement('select');
      st.style.cssText = 'flex:1;margin:0;font-size:13px;padding:7px 8px;min-width:0;';
      st.innerHTML = TYPES_CHAMP.map(t =>
        '<option value="' + t.cle + '">' + t.nom + '</option>').join('');
      st.value = ch.type || 'texte';
      st.addEventListener('change', () => { ch.type = st.value; });
      r.appendChild(st);

      const opt = document.createElement('input');
      opt.type = 'text';
      opt.style.cssText = 'width:90px;margin:0;font-size:13px;padding:7px 8px;flex-shrink:0;';
      opt.placeholder = (ch.type === 'ok') ? 'défaut' : 'lignes';
      opt.value = (ch.type === 'ok') ? (ch.defaut || '') : (ch.lignes || '');
      opt.addEventListener('input', () => {
        if(ch.type === 'ok') ch.defaut = opt.value;
        else { const n = parseInt(opt.value, 10); if(!isNaN(n)) ch.lignes = n; }
      });
      r.appendChild(opt);

      l.appendChild(r);
      liste.appendChild(l);
    });
  }
  dessiner();

  const bAdd = document.createElement('button');
  bAdd.className = 'btn btn-secondary';
  bAdd.style.cssText = 'padding:8px;font-size:12px;margin-bottom:8px;';
  bAdd.textContent = '➕ Ajouter une rubrique';
  bAdd.addEventListener('click', () => {
    champs.push({ cle: 'r' + Date.now().toString(36).slice(-5),
                  type: 'texte', nom: 'Nouvelle rubrique', lignes: 4 });
    dessiner();
  });
  d.appendChild(bAdd);

  const r2 = document.createElement('div');
  r2.style.cssText = 'display:flex;gap:8px;';

  const bEnr = document.createElement('button');
  bEnr.className = 'btn btn-secondary';
  bEnr.style.cssText = 'flex:1;padding:9px;font-size:13px;margin:0;';
  bEnr.textContent = '💾 Enregistrer le formulaire';
  bEnr.addEventListener('click', async () => {
    const propres = champs.filter(x => (x.nom || '').trim());
    if(!propres.length){ showToast('Le formulaire est vide.'); return; }
    bEnr.disabled = true;
    try{
      const src = (modelesTexte || []).find(x => x.usage === 'champs_' + schema);
      await appelPrep({
        action: 'modeleSet',
        id: src ? src.id : '',
        usage: 'champs_' + schema,
        nom: 'Formulaire manuel — ' + schema,
        contenu: JSON.stringify(propres)
      });
      CHAMPS_MANUELS[schema] = propres;
      showToast('Formulaire enregistré ✅');
      afficherTextesBilan();
    }catch(e){ showToast('Erreur : ' + e.message); bEnr.disabled = false; }
  });
  r2.appendChild(bEnr);

  if(perso){
    const bRaz = document.createElement('button');
    bRaz.className = 'btn btn-secondary';
    bRaz.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;margin:0;';
    bRaz.textContent = '↩️';
    bRaz.title = "Revenir au formulaire d'origine";
    bRaz.addEventListener('click', async () => {
      if(!await confirmer("Revenir au formulaire d'origine ?\n\n" +
                          'Recharge la page pour le voir appliqué.')) return;
      const src = (modelesTexte || []).find(x => x.usage === 'champs_' + schema);
      if(!src) return;
      bRaz.disabled = true;
      try{
        await appelPrep({ action: 'modeleDelete', id: src.id });
        showToast("Formulaire d'origine rétabli");
        afficherTextesBilan();
      }catch(e){ showToast('Erreur : ' + e.message); bRaz.disabled = false; }
    });
    r2.appendChild(bRaz);
  }

  d.appendChild(r2);
  return d;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-bilans.js'] = true;
