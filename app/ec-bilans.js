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
  conduiteResume: "Bilan de conduite complet : carte SD, installation, ton cours, " +
                  "erreurs par rubrique, fiche véhicule, frise.",
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

      /* Consignes IA, propres au squelette */
      if(m.schema !== 'rdvpost') d.appendChild(blocConsignesIA(m.schema));

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
      document.body.removeChild(fond);
      await chargerModelesBilan();
      appliquerModelesAjoutes();
      if(typeof remplirModeles === 'function') remplirModeles();
      showToast('Modèle ajouté ✅');
      afficherTextesBilan();
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
  if(typeof remplirModeles === 'function') remplirModeles();
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-bilans.js'] = true;
