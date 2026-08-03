/* ============================================================
   ec-textes.js
   Bibliothèque de modèles de message, rédigés et modifiables
   depuis l'application, enregistrés dans le classeur.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les emplacements où un modèle peut être utilisé.
   Chaque usage annonce les variables qu'il sait remplacer. */
const USAGES_MODELE = [
  { cle:'permis_jour',    nom:'📣 Groupe Messenger — planning du jour',
    variables:['{date}', '{centre}', '{rendezvous}', '{liste}', '{note}'] },
  { cle:'permis_rappels', nom:'📌 Groupe Messenger — rappels avant examen',
    variables:[] },
  { cle:'permis_obtenu',  nom:'🎓 Élève ayant obtenu son permis',
    variables:['{eleve}', '{date}'] },
  { cle:'examen_blanc',   nom:'📝 Examen blanc — message à l\'élève',
    variables:['{eleve}', '{date}', '{moniteur}'] },
  { cle:'post_permis',    nom:'🔁 Rendez-vous post-permis',
    variables:['{eleve}', '{date}', '{moniteur}', '{ajournements}'] },
  { cle:'depart',         nom:'🚪 Départ de l\'auto-école',
    variables:['{eleve}', '{date}', '{motif}'] },
  { cle:'libre',          nom:'📄 Texte libre',
    variables:['{eleve}', '{date}'] }
];

function nomUsage(cle){
  const u = USAGES_MODELE.find(x => x.cle === cle);
  return u ? u.nom : cle;
}

let modelesTexte = [];

async function chargerModelesTexte(){
  try{
    const d = await appelPrep({ action: 'modeleList' });
    modelesTexte = (d && d.modeles) || [];
  }catch(e){
    console.warn('Modèles indisponibles :', e);
  }
  return modelesTexte;
}

/* Le premier modèle enregistré pour cet usage, s'il en existe un */
function modelePour(usage){
  return modelesTexte.find(m => m.usage === usage) || null;
}

/* Remplace les {variables} par leurs valeurs.
   Une variable absente disparaît, plutôt que de laisser {truc} dans le texte. */
function appliquerModele(contenu, valeurs){
  let t = String(contenu || '');
  Object.keys(valeurs || {}).forEach(k => {
    t = t.split('{' + k + '}').join(String(valeurs[k] === undefined ? '' : valeurs[k]));
  });
  /* Nettoyage des variables non fournies */
  t = t.replace(/\{[a-zA-Zéèêàçùî_]+\}/g, '');
  return t;
}


/* ---------- Interface de gestion ---------- */

async function afficherModelesTexte(){
  const zone = $('textesZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Chargement des modèles…</div>';
  await chargerModelesTexte();
  zone.innerHTML = '';

  /* Nouveau modèle */
  const bNouveau = document.createElement('button');
  bNouveau.className = 'btn btn-primary';
  bNouveau.style.marginBottom = '14px';
  bNouveau.textContent = '➕ Nouveau modèle';
  bNouveau.addEventListener('click', () => ouvrirEditeurModele(null));
  zone.appendChild(bNouveau);

  if(!modelesTexte.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucun modèle enregistré.<br>' +
      '<span style="font-size:12px;">Crée tes textes ici : ils remplaceront ceux ' +
      'que l\'application propose par défaut.</span>';
    zone.appendChild(v);
    return;
  }

  /* Regroupement par usage */
  const parUsage = {};
  modelesTexte.forEach(m => {
    if(!parUsage[m.usage]) parUsage[m.usage] = [];
    parUsage[m.usage].push(m);
  });

  USAGES_MODELE.forEach(u => {
    const liste = parUsage[u.cle];
    if(!liste) return;

    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin:12px 0 6px;';
    t.textContent = u.nom;
    zone.appendChild(t);

    liste.forEach(m => {
      const d = document.createElement('div');
      d.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
        'margin-bottom:8px;';

      const h = document.createElement('div');
      h.style.cssText = 'display:flex;align-items:center;gap:8px;';
      const n = document.createElement('div');
      n.style.cssText = 'flex:1;min-width:0;';
      n.innerHTML = '<strong style="font-size:14px;">' + m.nom.replace(/</g, '&lt;') + '</strong>' +
        '<div style="font-size:11px;color:var(--muted);">' +
        (m.maj ? 'modifié le ' + m.maj : '') + (m.par ? ' par ' + m.par : '') + '</div>';
      h.appendChild(n);

      const bMod = document.createElement('button');
      bMod.className = 'btn btn-secondary';
      bMod.style.cssText = 'width:auto;padding:7px 10px;font-size:13px;margin:0;flex-shrink:0;';
      bMod.textContent = '✏️';
      bMod.title = 'Modifier';
      bMod.addEventListener('click', () => ouvrirEditeurModele(m));
      h.appendChild(bMod);

      const bSup = document.createElement('button');
      bSup.className = 'btn btn-secondary';
      bSup.style.cssText = 'width:auto;padding:7px 10px;font-size:13px;margin:0;flex-shrink:0;' +
        'color:var(--red);border-color:var(--red);';
      bSup.textContent = '✕';
      bSup.title = 'Supprimer';
      bSup.addEventListener('click', async () => {
        if(!await confirmer('Supprimer le modèle « ' + m.nom + ' » ?')) return;
        bSup.disabled = true;
        try{
          await appelPrep({ action: 'modeleDelete', id: m.id });
          showToast('Modèle supprimé');
          afficherModelesTexte();
        }catch(e){ showToast('Erreur : ' + e.message); bSup.disabled = false; }
      });
      h.appendChild(bSup);
      d.appendChild(h);

      /* Aperçu replié */
      const det = document.createElement('details');
      det.innerHTML = '<summary style="cursor:pointer;font-size:12px;color:var(--muted);' +
        'margin-top:6px;">Voir le texte</summary>';
      const p = document.createElement('div');
      p.style.cssText = 'margin-top:6px;font-size:13px;line-height:1.5;white-space:pre-wrap;' +
        'color:var(--muted);max-height:200px;overflow-y:auto;';
      p.textContent = m.contenu;
      det.appendChild(p);
      d.appendChild(det);

      zone.appendChild(d);
    });
  });
}


function ouvrirEditeurModele(modele){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 94vw);max-height:90vh;overflow-y:auto;';

  const h = document.createElement('h3');
  h.textContent = modele ? 'Modifier le modèle' : 'Nouveau modèle';
  boite.appendChild(h);

  boite.insertAdjacentHTML('beforeend',
    '<label for="mdNom">Nom du modèle</label>' +
    '<input type="text" id="mdNom" placeholder="Ex : Jour du permis — Saint-Brieuc">' +
    '<label for="mdUsage">Où sera-t-il utilisé ?</label>' +
    '<select id="mdUsage">' +
      USAGES_MODELE.map(u => '<option value="' + u.cle + '">' + u.nom + '</option>').join('') +
    '</select>' +
    '<div id="mdVars" style="font-size:12px;color:var(--muted);margin:-8px 0 12px;' +
      'line-height:1.6;"></div>' +
    '<label for="mdContenu">Texte du message</label>' +
    '<textarea id="mdContenu" rows="14" ' +
      'style="width:100%;background:var(--navy);border:1px solid var(--line);color:var(--cream);' +
      'padding:11px 12px;border-radius:10px;font-size:15px;line-height:1.6;font-family:inherit;' +
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

  /* Rappel des variables disponibles, avec insertion en un appui */
  const majVars = () => {
    const u = USAGES_MODELE.find(x => x.cle === g('mdUsage').value);
    const z = g('mdVars');
    z.innerHTML = 'Variables disponibles — appuie pour insérer :<br>';
    (u ? u.variables : []).forEach(v => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:auto;padding:4px 8px;font-size:12px;margin:4px 4px 0 0;';
      b.textContent = v;
      b.addEventListener('click', () => {
        const t = g('mdContenu');
        const p = t.selectionStart || t.value.length;
        t.value = t.value.slice(0, p) + v + t.value.slice(p);
        t.focus();
      });
      z.appendChild(b);
    });
  };
  g('mdUsage').addEventListener('change', majVars);

  if(modele){
    g('mdNom').value = modele.nom || '';
    g('mdUsage').value = modele.usage || 'libre';
    g('mdContenu').value = modele.contenu || '';
  }
  majVars();

  bAnn.addEventListener('click', () => document.body.removeChild(fond));

  bOk.addEventListener('click', async () => {
    const nom = g('mdNom').value.trim();
    const contenu = g('mdContenu').value.trim();
    if(!nom){ msg.style.color = 'var(--warn-text)'; msg.textContent = 'Donne un nom au modèle.'; return; }
    if(!contenu){ msg.style.color = 'var(--warn-text)'; msg.textContent = 'Le texte est vide.'; return; }

    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      await appelPrep({
        action: 'modeleSet',
        id: modele ? modele.id : '',
        usage: g('mdUsage').value,
        nom: nom,
        contenu: contenu
      });
      document.body.removeChild(fond);
      showToast('Modèle enregistré ✅');
      afficherModelesTexte();
    }catch(e){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Erreur : ' + e.message;
      bOk.disabled = false;
      bOk.textContent = '💾 Enregistrer';
    }
  });
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-textes.js'] = true;
