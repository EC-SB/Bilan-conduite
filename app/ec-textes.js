/* Déployé le 24/08/2026 à 09:38 — v521 */
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
  { cle:'ecoutes', nom:'😱 Rappel écoutes pédagogiques', variables:[] },
  { cle:'permis_planning', nom:'🚨 Planning formation avant permis',
    variables:['{veille}', '{permis}', '{moniteur}', '{centre}', '{liste}'] },
  { cle:'rappel_cours',   nom:'🔔 Rappel de cours par SMS',
    variables:['{jour}', '{voiture}', '{emplacement}', '{mentions}',
               '{note}', '{prenom}', '{eleve}',
               '{date}', '{datecourte}', '{heure}', '{heure+2h}',
               '{duree}', '{moniteur}', '{site}'] },
  { cle:'procedure',      nom:'🚦 Procédure de conduite',
    variables:[] },
  { cle:'libre',          nom:'📄 Texte libre',
    variables:['{eleve}', '{date}'] }
];

/* Ce qu'il faut savoir des heures calculées, dit là où on écrit
   le modèle plutôt que dans un guide qu'on ne relit jamais. */
const AIDE_HEURES =
  '<code>{date}</code> donne « dimanche 23 août », ' +
  '<code>{datecourte}</code> donne « 23/08 » — calculés depuis ' +
  'le champ <em>Quand</em>.<br>' +
  'Les heures se calculent depuis celle du cours : ' +
  '<code>{heure+2h}</code>, <code>{heure+1h30}</code>, ' +
  '<code>{heure+45min}</code>. Le signe moins recule.<br>' +
  'Un cours à 13h donne « 13h à {heure+2h} » → <strong>13h à 15h</strong>.';

function nomUsage(cle){
  const u = USAGES_MODELE.find(x => x.cle === cle);
  return u ? u.nom : cle;
}

/* ============================================================
   CATÉGORIES LIBRES
   Les emplacements techniques (jour du permis, rappels…) restent
   fixes : l'application sait où les utiliser. Les catégories,
   elles, servent au rangement et sont créées librement.
   ============================================================ */
function categoriesExistantes(){
  const vues = [];
  (modelesTexte || []).forEach(m => {
    const cat = (m.categorie || '').trim();
    if(cat && vues.indexOf(cat) === -1) vues.push(cat);
  });
  return vues.sort((a, b) => a.localeCompare(b, 'fr'));
}

/* La catégorie est rangée dans le nom, faute de colonne dédiée :
   « Permis › Félicitations ». Simple et rétrocompatible. */
function separerCategorie(nom){
  const i = String(nom || '').indexOf(' › ');
  if(i === -1) return { categorie: '', titre: String(nom || '') };
  return { categorie: nom.slice(0, i).trim(), titre: nom.slice(i + 3).trim() };
}

function assemblerNom(categorie, titre){
  const c = String(categorie || '').trim();
  return c ? c + ' › ' + String(titre || '').trim() : String(titre || '').trim();
}

let modelesTexte = [];

async function chargerModelesTexte(){
  try{
    const d = await appelPrep({ action: 'modeleList' });
    modelesTexte = ((d && d.modeles) || []).map(m => {
      const s = separerCategorie(m.nom);
      return Object.assign({}, m, { categorie: s.categorie, titre: s.titre });
    });
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

  /* Les heures décalées d'abord : {heure+2h} vaut l'heure du cours
     plus deux heures. Sans cela, {heure} serait remplacé le premier
     et le décalage n'aurait plus de base. */
  t = calculerHeuresDecalees(t, (valeurs || {}).heure);

  Object.keys(valeurs || {}).forEach(k => {
    t = t.split('{' + k + '}').join(String(valeurs[k] === undefined ? '' : valeurs[k]));
  });
  /* Nettoyage des variables non fournies */
  t = t.replace(/\{[a-zA-Zéèêàçùî_]+\}/g, '');
  return t;
}


/* ============================================================
   LES HEURES CALCULÉES

   Un cours se découpe en tranches. Plutôt que de réécrire les
   horaires à chaque rappel, on les fait dériver de l'heure de
   début :

     1- {heure} à {heure+2h} circulation
     2- {heure+2h} à {heure+3h} examen blanc

   Un cours à 13h donne « 13h à 15h », puis « 15h à 16h ».
   Les formes acceptées : +2h, +1h30, +45min, et le signe moins
   pour reculer.
   ============================================================ */
function calculerHeuresDecalees(texte, heureDebut){
  const base = minutesDeLHeure(heureDebut);

  /* Pas d'heure de départ : on efface les décalages plutôt que
     de laisser « {heure+2h} » dans un message envoyé. */
  if(base === null){
    return String(texte).replace(/\{heure\s*[+-][^}]*\}/gi, '');
  }

  return String(texte).replace(
    /\{heure\s*([+-])\s*([^}]+)\}/gi,
    (tout, signe, duree) => {
      const m = minutesDeLaDuree(duree);
      if(m === null) return '';
      const total = base + (signe === '-' ? -m : m);
      return heureLisible(total);
    }
  );
}

/* « 13:00 », « 13h00 » ou « 13h » en minutes depuis minuit */
function minutesDeLHeure(v){
  const s = String(v || '').trim();
  if(!s) return null;
  const m = s.match(/^(\d{1,2})\s*[h:]\s*(\d{0,2})/);
  if(!m) return null;
  return Number(m[1]) * 60 + (Number(m[2]) || 0);
}

/* « 2h », « 1h30 », « 45min », « 90 » en minutes */
function minutesDeLaDuree(v){
  const s = String(v || '').trim().toLowerCase().replace(/\s+/g, '');
  if(!s) return null;

  let m = s.match(/^(\d+)h(\d{1,2})?$/);
  if(m) return Number(m[1]) * 60 + (Number(m[2]) || 0);

  m = s.match(/^(\d+)(?:min|m)$/);
  if(m) return Number(m[1]);

  m = s.match(/^(\d+)$/);
  if(m) return Number(m[1]);

  return null;
}

/* « 15h » plutôt que « 15h00 » : c'est ainsi qu'on écrit une heure
   ronde dans un message. */
function heureLisible(minutes){
  let t = minutes % (24 * 60);
  if(t < 0) t += 24 * 60;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return m ? (h + 'h' + String(m).padStart(2, '0')) : (h + 'h');
}


/* ---------- Interface de gestion ---------- */

async function afficherModelesTexte(){
  const zone = $('textesZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Chargement des modèles…</div>';
  await chargerModelesTexte();
  zone.innerHTML = '';

  /* Nouveau modèle */
  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;';

  const bNouveau = document.createElement('button');
  bNouveau.className = 'btn btn-primary';
  bNouveau.style.cssText = 'flex:1;margin:0;';
  bNouveau.textContent = '➕ Nouveau texte type';
  bNouveau.addEventListener('click', () => ouvrirEditeurModele(null));
  r.appendChild(bNouveau);

  const bImport = document.createElement('button');
  bImport.className = 'btn btn-secondary';
  bImport.style.cssText = 'width:auto;padding:0 16px;margin:0;font-size:14px;';
  bImport.textContent = '📥 Importer';
  bImport.title = 'Coller plusieurs modèles d\'un coup';
  bImport.addEventListener('click', ouvrirImportModeles);
  r.appendChild(bImport);

  zone.appendChild(r);

  if(!modelesTexte.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucun modèle enregistré.<br>' +
      '<span style="font-size:12px;">Ajoute ici les textes que tu envoies souvent : ' +
      "message du groupe permis, félicitations, examen blanc… " +
      "L'application les reprendra à ta place.</span>";
    zone.appendChild(v);
    return;
  }

  /* Regroupement par catégorie, puis par usage à l'intérieur */
  const parCategorie = {};
  modelesTexte.forEach(m => {
    const cat = m.categorie || 'Sans catégorie';
    if(!parCategorie[cat]) parCategorie[cat] = [];
    parCategorie[cat].push(m);
  });

  const cats = Object.keys(parCategorie).sort((a, b) => {
    if(a === 'Sans catégorie') return 1;
    if(b === 'Sans catégorie') return -1;
    return a.localeCompare(b, 'fr');
  });

  cats.forEach(cat => {
    const bloc = document.createElement('details');
    bloc.open = true;
    bloc.style.cssText = 'margin-bottom:10px;';
    const som = document.createElement('summary');
    som.style.cssText = 'cursor:pointer;font-size:14px;font-weight:700;' +
      'color:var(--accent-text);padding:6px 0;display:flex;align-items:center;gap:8px;';
    som.innerHTML = '<span style="flex:1;min-width:0;">📁 ' + cat.replace(/</g, '&lt;') +
      ' <span style="font-size:12px;color:var(--muted);font-weight:400;">(' +
      parCategorie[cat].length + ')</span></span>';

    /* Vider un dossier d'un coup : les imports ratés se corrigent vite */
    const bVider = document.createElement('button');
    bVider.className = 'btn btn-secondary';
    bVider.style.cssText = 'width:auto;padding:4px 9px;font-size:11px;margin:0;' +
      'flex-shrink:0;color:var(--red);border-color:var(--red);';
    bVider.textContent = '🗑️ Vider';
    bVider.title = 'Supprimer les ' + parCategorie[cat].length + ' textes de ce dossier';
    bVider.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      await viderDossier(cat, parCategorie[cat], bVider);
    });
    som.appendChild(bVider);
    bloc.appendChild(som);

    const liste = parCategorie[cat];
    const t = document.createElement('div');
    bloc.appendChild(t);
    zone.appendChild(bloc);

    liste.forEach(m => {
      const d = document.createElement('div');
      d.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
        'margin-bottom:8px;';

      const h = document.createElement('div');
      h.style.cssText = 'display:flex;align-items:center;gap:8px;';
      const n = document.createElement('div');
      n.style.cssText = 'flex:1;min-width:0;';
      n.innerHTML = '<strong style="font-size:14px;">' +
        (m.titre || m.nom).replace(/</g, '&lt;') + '</strong>' +
        '<div style="font-size:11px;color:var(--muted);">' + nomUsage(m.usage) +
        (m.maj ? ' · modifié le ' + m.maj : '') + (m.par ? ' par ' + m.par : '') + '</div>';
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

      bloc.appendChild(d);
    });
  });
}


function ouvrirEditeurModele(modele, usageImpose){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 94vw);max-height:90vh;overflow-y:auto;';

  const h = document.createElement('h3');
  h.textContent = modele ? 'Modifier le texte' : 'Nouveau texte type';
  boite.appendChild(h);

  boite.insertAdjacentHTML('beforeend',
    '<label for="mdCat">📁 Catégorie</label>' +
    '<input type="text" id="mdCat" list="listeCategories" ' +
      'placeholder="Ex : Permis, Examen blanc, Relances… (libre)">' +
    '<datalist id="listeCategories">' +
      categoriesExistantes().map(x => '<option value="' + x.replace(/"/g, '&quot;') + '">').join('') +
    '</datalist>' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;line-height:1.4;">' +
      'Crée autant de catégories que tu veux : tape un nom nouveau, ' +
      'ou choisis-en une déjà utilisée.</div>' +
    '<label for="mdNom">Nom de ce texte</label>' +
    '<input type="text" id="mdNom" placeholder="Ex : Jour du permis — Saint-Brieuc">' +
    '<label for="mdUsage">Où sera-t-il utilisé ?</label>' +
    '<select id="mdUsage">' +
      USAGES_MODELE.map(u => '<option value="' + u.cle + '">' + u.nom + '</option>').join('') +
    '</select>' +
    '<div id="mdVars" style="font-size:12px;color:var(--muted);margin:-8px 0 12px;' +
      'line-height:1.6;"></div>' +

    /* Une procédure ne vaut pas pour toutes les formations : le
       point de patinage n'existe pas en automatique, et l'attelage
       ne concerne que la remorque. */
    '<div id="mdBlocBoite" style="display:none;">' +
      '<label for="mdBoite">Pour qui ?</label>' +
      '<select id="mdBoite">' +
        '<option value="">🚗 Voiture — BEA et BV</option>' +
        '<option value="bea">🚗 BEA seulement — boîte automatique</option>' +
        '<option value="bv">🚗 BV seulement — boîte manuelle</option>' +
        '<option value="BE">🚚 Remorque — permis BE</option>' +
      '</select>' +
      '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;' +
        'line-height:1.5;">Un élève en remorque ne voit que les ' +
        'procédures BE, et lui seul les voit.</div>' +
    '</div>' +
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

  /* Le choix de boîte n'a de sens que pour une procédure */
  const majBoite = () => {
    const b = boite.querySelector('#mdBlocBoite');
    if(b) b.style.display = (boite.querySelector('#mdUsage').value === 'procedure')
      ? 'block' : 'none';
  };
  boite.querySelector('#mdUsage').addEventListener('change', majBoite);
  if(modele && modele.boite && boite.querySelector('#mdBoite')){
    boite.querySelector('#mdBoite').value = modele.boite;
  }
  majBoite();

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

    /* L'aide des heures, seulement là où elle sert */
    if(u && u.variables.some(v => v.indexOf('{heure') === 0)){
      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);margin-top:8px;' +
        'line-height:1.6;border-top:1px solid var(--line);padding-top:8px;';
      a.innerHTML = '🕐 ' + AIDE_HEURES;
      z.appendChild(a);
    }
  };
  g('mdUsage').addEventListener('change', majVars);

  if(modele){
    g('mdCat').value = modele.categorie || '';
    g('mdNom').value = modele.titre || modele.nom || '';
    g('mdUsage').value = modele.usage || 'libre';
    g('mdContenu').value = modele.contenu || '';
  }
  /* Depuis le tiroir des procédures, l'usage est déjà connu */
  if(usageImpose){
    g('mdUsage').value = usageImpose;
    g('mdUsage').disabled = true;
    g('mdUsage').style.opacity = '.6';
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
        nom: assemblerNom(g('mdCat') ? g('mdCat').value : '', nom),
        /* La boîte ne concerne que les procédures */
        boite: (g('mdUsage').value === 'procedure' && g('mdBoite'))
          ? g('mdBoite').value : '',
        contenu: contenu
      });
      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      if(usageImpose === 'procedure') afficherProcedures();
      else afficherModelesTexte();
    }catch(e){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Erreur : ' + e.message;
      bOk.disabled = false;
      bOk.textContent = '💾 Enregistrer';
    }
  });
}



/* ============================================================
   PROCÉDURES DE CONDUITE
   Les mêmes fiches, présentées à part : c'est ce que les
   moniteurs consultent et ce qui sert aux corrections.
   ============================================================ */
async function afficherProcedures(){
  const zone = $('proceduresZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Chargement des procédures…</div>';
  await chargerModelesTexte();
  const liste = (modelesTexte || []).filter(m => m.usage === 'procedure')
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  zone.innerHTML = '';

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.marginBottom = '12px';
  b.textContent = '➕ Nouvelle procédure';
  b.addEventListener('click', () => ouvrirEditeurModele(null, 'procedure'));
  zone.appendChild(b);

  /* Recherche, car la liste va s'allonger */
  if(liste.length > 4){
    const rech = document.createElement('input');
    rech.type = 'text';
    rech.placeholder = '🔍 Filtrer les procédures';
    rech.style.marginBottom = '10px';
    rech.addEventListener('input', () => {
      const q = normaliserMot(rech.value);
      zone.querySelectorAll('[data-procedure]').forEach(el => {
        const ok = !q || normaliserMot(el.getAttribute('data-procedure')).indexOf(q) !== -1;
        el.style.display = ok ? '' : 'none';
      });
    });
    zone.appendChild(rech);
  }

  if(!liste.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucune procédure enregistrée.<br>' +
      '<span style="font-size:12px;">Ajoute ici tes procédures : giratoire, priorité à droite, ' +
      "créneau… Elles serviront aux corrections d'erreur et resteront consultables par tous.</span>";
    zone.appendChild(v);
    return;
  }

  liste.forEach(m => {
    const d = document.createElement('details');
    d.setAttribute('data-procedure', m.nom);
    d.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
      'margin-bottom:8px;';

    const som = document.createElement('summary');
    som.style.cssText = 'cursor:pointer;font-size:15px;font-weight:700;color:var(--cream);' +
      'list-style:none;';
    /* Pour qui elle est : sans ce repère, on ne sait pas d'un coup
       d'œil laquelle est réservée à la remorque. */
    const pourQui = String(m.boite || '').toUpperCase();
    const marque = /(^|[^A-Z])BE([^A-Z]|$)/.test(pourQui) ? ' 🚚'
      : (pourQui === 'BEA' ? ' 🅰️'
      : (pourQui === 'BV' ? ' 🅼' : ''));

    som.textContent = '🚦 ' + m.nom + marque;
    som.title = marque === ' 🚚' ? 'Remorque — permis BE seulement'
      : (marque === ' 🅰️' ? 'Boîte automatique seulement'
      : (marque === ' 🅼' ? 'Boîte manuelle seulement' : 'Toutes les voitures'));
    d.appendChild(som);

    const corps = document.createElement('div');
    corps.style.cssText = 'margin-top:8px;font-size:15px;line-height:1.6;white-space:pre-wrap;';
    corps.textContent = m.contenu;
    d.appendChild(corps);

    const pied = document.createElement('div');
    pied.style.cssText = 'font-size:11px;color:var(--muted);margin-top:8px;';
    pied.textContent = (m.maj ? 'modifié le ' + m.maj : '') + (m.par ? ' par ' + m.par : '');
    d.appendChild(pied);

    const r = document.createElement('div');
    r.style.cssText = 'display:flex;gap:8px;margin-top:10px;';

    const bCop = document.createElement('button');
    bCop.className = 'btn btn-secondary';
    bCop.style.cssText = 'flex:1;padding:9px;font-size:13px;margin:0;';
    bCop.textContent = '📋 Copier';
    bCop.addEventListener('click', () => {
      navigator.clipboard.writeText(m.contenu).then(
        () => showToast('Procédure copiée ✅'),
        () => showToast('Copie impossible'));
    });
    r.appendChild(bCop);

    const bMod = document.createElement('button');
    bMod.className = 'btn btn-secondary';
    bMod.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;margin:0;';
    bMod.textContent = '✏️ Modifier';
    bMod.addEventListener('click', () => ouvrirEditeurModele(m, 'procedure'));
    r.appendChild(bMod);

    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;margin:0;' +
      'color:var(--red);border-color:var(--red);';
    bSup.textContent = '✕';
    bSup.title = 'Supprimer';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer la procédure « ' + m.nom + ' » ?')) return;
      bSup.disabled = true;
      try{
        await appelPrep({ action: 'modeleDelete', id: m.id });
        showToast('Procédure supprimée');
        afficherProcedures();
      }catch(e){ showToast('Erreur : ' + e.message); bSup.disabled = false; }
    });
    r.appendChild(bSup);

    d.appendChild(r);
    zone.appendChild(d);
  });
}


/* ============================================================
   IMPORT EN MASSE
   Coller ses modèles un par un est décourageant quand on en a
   quinze. On les colle tous, séparés par une ligne de titre.
   ============================================================ */
const SEPARATEUR_AIDE =
  'Sépare tes modèles par une ligne contenant seulement le titre entre === :\n\n' +
  '=== RDV accompagnateur ===\n' +
  'Bonjour 😁\n' +
  "N'OUBLIE PAS LA FORMATION DE TON ACCOMPAGNATEUR {jour}…\n\n" +
  '=== RDV préalable ===\n' +
  'Bonjour 😁\n…';

/* Découpe un texte collé en plusieurs modèles */
function decouperModeles(brut){
  const lignes = String(brut || '').split('\n');
  const out = [];
  let courant = null;

  lignes.forEach(l => {
    /* Une ligne de titre : === Nom === ou ___ Nom ___ */
    const m = l.match(/^\s*(?:=|_){2,}\s*(.+?)\s*(?:=|_){2,}\s*$/);
    if(m && m[1].length >= 2){
      if(courant) out.push(courant);
      courant = { titre: m[1].trim(), lignes: [] };
      return;
    }
    if(courant) courant.lignes.push(l);
  });
  if(courant) out.push(courant);

  return out
    .map(x => ({ titre: x.titre, contenu: x.lignes.join('\n').trim() }))
    .filter(x => x.contenu.length >= 10);
}

async function ouvrirImportModeles(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(620px, 95vw);max-height:92vh;overflow-y:auto;';

  boite.insertAdjacentHTML('beforeend',
    '<h3>📥 Importer plusieurs textes</h3>' +
    '<div style="font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:12px;">' +
      'Colle tous tes modèles d\'un coup. Sépare-les par une ligne de titre ' +
      'entre <strong>===</strong>, comme dans l\'exemple.</div>' +
    '<label for="imCat">📁 Catégorie</label>' +
    '<input type="text" id="imCat" list="listeCategories" placeholder="Ex : Rappels">' +
    '<label for="imUsage">Usage de ces textes</label>' +
    '<select id="imUsage">' +
      USAGES_MODELE.map(u => '<option value="' + u.cle + '">' + u.nom + '</option>').join('') +
    '</select>' +
    '<label for="imTexte">Tes modèles</label>');

  const zone = document.createElement('textarea');
  zone.id = 'imTexte';
  zone.rows = 14;
  zone.placeholder = SEPARATEUR_AIDE;
  zone.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:14px;' +
    'line-height:1.55;font-family:inherit;resize:vertical;margin-bottom:8px;';
  boite.appendChild(zone);

  const apercu = document.createElement('div');
  apercu.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.7;' +
    'margin-bottom:12px;min-height:18px;';
  boite.appendChild(apercu);

  zone.addEventListener('input', () => {
    const t = decouperModeles(zone.value);
    apercu.innerHTML = t.length
      ? '✅ ' + t.length + ' modèle(s) reconnu(s) :<br>' +
        t.map(x => '• ' + x.titre.replace(/</g, '&lt;') +
          ' <span style="opacity:.7;">(' + x.contenu.length + ' caractères)</span>').join('<br>')
      : (zone.value.trim()
          ? '⚠️ Aucun titre entre === trouvé. Ajoute une ligne <strong>=== Nom ===</strong> ' +
            'avant chaque modèle.'
          : '');
  });

  const rangee = document.createElement('div');
  rangee.className = 'btn-row';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '📥 Importer';
  rangee.appendChild(bAnn); rangee.appendChild(bOk);
  boite.appendChild(rangee);

  const msg = document.createElement('div');
  msg.style.cssText = 'margin-top:8px;font-size:13px;min-height:16px;';
  boite.appendChild(msg);

  /* Le choix de boîte n'a de sens que pour une procédure */
  const majBoite = () => {
    const b = boite.querySelector('#mdBlocBoite');
    if(b) b.style.display = (boite.querySelector('#mdUsage').value === 'procedure')
      ? 'block' : 'none';
  };
  boite.querySelector('#mdUsage').addEventListener('change', majBoite);
  if(modele && modele.boite && boite.querySelector('#mdBoite')){
    boite.querySelector('#mdBoite').value = modele.boite;
  }
  majBoite();

  fond.appendChild(boite);
  document.body.appendChild(fond);

  bOk.addEventListener('click', async () => {
    const liste = decouperModeles(zone.value);
    if(!liste.length){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Aucun modèle reconnu. Vérifie les lignes de titre.';
      return;
    }

    const cat = boite.querySelector('#imCat').value.trim();
    const usage = boite.querySelector('#imUsage').value;

    bOk.disabled = true;
    let ok = 0;
    const rates = [];
    for(let i = 0; i < liste.length; i++){
      bOk.textContent = 'Import ' + (i + 1) + ' sur ' + liste.length + '…';
      try{
        await appelPrep({ action: 'modeleSet', id: '', usage: usage,
                          nom: assemblerNom(cat, liste[i].titre),
                          contenu: liste[i].contenu });
        ok++;
      }catch(e){ rates.push(liste[i].titre + ' : ' + e.message); }
    }

    document.body.removeChild(fond);
    showToast(ok + ' modèle(s) importé(s)' + (rates.length ? ' · ' + rates.length + ' échec(s)' : ''));
    if(rates.length) await informer('Modèles non importés :\n\n' + rates.join('\n'));
    afficherModelesTexte();
  });

  setTimeout(() => zone.focus(), 100);
}


/* Supprime tous les textes d'un dossier, en une fois */
async function viderDossier(nom, liste, bouton){
  if(!await confirmer('Supprimer les ' + liste.length + ' texte(s) du dossier « ' +
      nom + '» ?\n\n' +
      liste.slice(0, 8).map(m => '• ' + (m.titre || m.nom)).join('\n') +
      (liste.length > 8 ? '\n• … et ' + (liste.length - 8) + ' autre(s)' : '') +
      '\n\nCette action est irréversible.')) return;

  bouton.disabled = true;
  const initial = bouton.textContent;
  let ok = 0;
  const rates = [];

  for(let i = 0; i < liste.length; i++){
    bouton.textContent = (i + 1) + '/' + liste.length;
    try{
      await appelPrep({ action: 'modeleDelete', id: liste[i].id });
      ok++;
    }catch(e){ rates.push((liste[i].titre || liste[i].nom) + ' : ' + e.message); }
  }

  showToast(ok + ' texte(s) supprimé(s)' + (rates.length ? ' · ' + rates.length + ' échec(s)' : ''));
  if(rates.length) await informer('Textes non supprimés :\n\n' + rates.join('\n'));
  bouton.textContent = initial;
  afficherModelesTexte();
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-textes.js'] = true;
