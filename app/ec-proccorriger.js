/* ============================================================
   ec-proccorriger.js
   Les procédures que les élèves envoient sur Messenger.

   Le bureau dépose ce qui arrive : le nom, son Messenger, une
   capture d'écran collée. Celle qui corrige les voit s'accumuler
   sur une pastille, et les fait disparaître au fur et à mesure.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let procACorriger = [];

/* Ce qui reste à corriger, pour la pastille */
function nbProcACorriger(){
  return procACorriger.filter(x => !x.corrigeLe).length;
}

async function afficherProcCorriger(){
  const zone = $('procCorrigerZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture des procédures…</div>';
  try{
    const d = await appelPrep({ action: 'procCorrigerList' });
    procACorriger = (d && d.fiches) || [];
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';
  majPastilleProc();

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-bottom:14px;padding:13px;font-size:14px;';
  b.textContent = '➕ Ajouter une procédure reçue';
  b.addEventListener('click', () => ouvrirFicheProc(null));
  zone.appendChild(b);

  const attente = procACorriger.filter(x => !x.corrigeLe);
  const faites = procACorriger.filter(x => x.corrigeLe);

  if(!procACorriger.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucune procédure en attente.<br>' +
      '<span style="font-size:12px;">Dépose ici ce que les élèves ' +
      'envoient sur Messenger.</span>';
    zone.appendChild(v);
    return;
  }

  if(attente.length){
    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
      'margin-bottom:8px;';
    t.textContent = '📥 ' + attente.length + ' à corriger';
    zone.appendChild(t);
    attente.forEach(x => zone.appendChild(ligneProc(x)));
  }

  /* Les corrigées, repliées : on y revient rarement */
  if(faites.length){
    const d = document.createElement('details');
    d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
      'padding:10px 12px;margin-top:14px;';
    d.innerHTML = '<summary style="cursor:pointer;font-size:13px;color:var(--muted);">' +
      '✅ ' + faites.length + ' déjà corrigée(s)</summary>';

    const z = document.createElement('div');
    z.style.marginTop = '10px';
    faites.forEach(x => z.appendChild(ligneProc(x)));
    d.appendChild(z);
    zone.appendChild(d);
  }
}


/* Une procédure dans la liste */
function ligneProc(x){
  const l = document.createElement('div');
  l.style.cssText = 'display:flex;gap:10px;align-items:center;' +
    'border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
    'margin-bottom:6px;' + (x.corrigeLe ? 'opacity:.55;' : '');

  const ap = document.createElement('div');
  ap.style.cssText = 'width:38px;height:38px;flex-shrink:0;border-radius:8px;' +
    'background:var(--navy);display:flex;align-items:center;justify-content:center;' +
    'font-size:19px;';
  ap.textContent = x.aUneCapture ? '🖼️' : '💬';
  l.appendChild(ap);

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:14px;line-height:1.4;cursor:pointer;';
  t.innerHTML =
    '<strong>' + (x.eleve || 'Sans nom').replace(/</g, '&lt;') + '</strong>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      'reçu le ' + (x.recuLe || '?').replace(/</g, '&lt;') +
      (x.par ? ' · ' + x.par.replace(/</g, '&lt;') : '') +
      (x.corrigeLe ? '<br><span style="color:var(--accent-text);">✅ corrigé le ' +
        x.corrigeLe.replace(/</g, '&lt;') +
        (x.corrigePar ? ' par ' + x.corrigePar.replace(/</g, '&lt;') : '') +
        '</span>' : '') +
    '</div>';
  t.addEventListener('click', () => ouvrirFicheProc(x));
  l.appendChild(t);

  /* Corriger, ou revenir en arrière */
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-secondary';
  bOk.style.cssText = 'width:auto;padding:8px 11px;font-size:14px;margin:0;flex-shrink:0;';
  bOk.textContent = x.corrigeLe ? '↩️' : '✅';
  bOk.title = x.corrigeLe ? 'Remettre à corriger' : 'Marquer comme corrigé';
  bOk.addEventListener('click', async ev => {
    ev.stopPropagation();
    bOk.disabled = true;
    try{
      await appelPrep({ action: 'procCorrigerSet', id: x.id,
                        corrige: x.corrigeLe ? '' : 'oui',
                        par: ACCES.moniteur || '' });
      showToast(x.corrigeLe ? 'Remise à corriger' : 'Corrigée ✅');
      afficherProcCorriger();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
    }
  });
  l.appendChild(bOk);

  return l;
}


/* ============================================================
   LA FICHE
   ============================================================ */

async function ouvrirFicheProc(x){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 94vw);max-height:88vh;overflow-y:auto;';

  boite.innerHTML =
    '<h3>' + (x ? 'Procédure de ' + (x.eleve || '').replace(/</g, '&lt;')
                : 'Procédure reçue') + '</h3>' +

    '<label for="pcEleve">Élève</label>' +
    '<input type="text" id="pcEleve" list="listeEleves" autocomplete="off" ' +
      'placeholder="Prénom et nom">' +

    '<label for="pcMess">Son Messenger</label>' +
    '<input type="text" id="pcMess" placeholder="Son nom sur Messenger, ou le lien">' +

    '<label for="pcRem">Remarque (facultatif)</label>' +
    '<textarea id="pcRem" rows="2" ' +
      'placeholder="Ex : procédure du créneau, 3e envoi"></textarea>' +

    '<label>Capture d\'écran</label>' +
    '<div id="pcApercu" style="margin-bottom:8px;"></div>' +
    '<div id="pcColler" tabindex="0" style="border:2px dashed var(--line);' +
      'border-radius:10px;padding:14px 12px;text-align:center;font-size:13px;' +
      'color:var(--muted);cursor:pointer;margin-bottom:6px;">' +
      '📋 <strong>Colle la capture ici</strong><br>' +
      '<span style="font-size:11px;">Ctrl+V, ou fais glisser l\'image</span></div>' +
    '<input type="file" id="pcFichier" accept="image/*" ' +
      'style="font-size:13px;padding:9px;margin-bottom:12px;">';

  let image = '';

  const apercu = boite.querySelector('#pcApercu');
  const montrer = () => {
    apercu.innerHTML = image
      ? '<img src="' + image + '" style="max-width:100%;max-height:250px;' +
        'border-radius:9px;border:1px solid var(--line);">'
      : '';
  };

  if(x){
    boite.querySelector('#pcEleve').value = x.eleve || '';
    boite.querySelector('#pcMess').value = x.messenger || '';
    boite.querySelector('#pcRem').value = x.remarque || '';

    /* La capture arrive à part : elle est lourde et n'a pas sa
       place dans la liste. */
    if(x.aUneCapture){
      apercu.innerHTML = '<div style="font-size:12px;color:var(--muted);">' +
        'Chargement de la capture…</div>';
      appelPrep({ action: 'procCorrigerCapture', id: x.id })
        .then(r => { image = (r && r.image) || ''; montrer(); })
        .catch(() => { apercu.innerHTML =
          '<div style="font-size:12px;color:var(--warn-text);">' +
          'Capture illisible.</div>'; });
    }
  }
  montrer();

  /* Coller, glisser ou choisir */
  const prendre = async fichier => {
    if(!fichier) return;
    try{
      image = await compresserImage(fichier);
      montrer();
    }catch(e){ showToast('Image refusée : ' + e.message); }
  };

  const zc = boite.querySelector('#pcColler');
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
  boite.querySelector('#pcFichier').addEventListener('change', ev => {
    prendre(ev.target.files && ev.target.files[0]);
  });

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  if(x){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer cette procédure de la liste ?')) return;
      try{
        await appelPrep({ action: 'procCorrigerDelete', id: x.id });
        document.body.removeChild(fond);
        showToast('Supprimée ✅');
        afficherProcCorriger();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bSup);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = x ? '💾 Enregistrer' : '➕ Ajouter';
  bOk.addEventListener('click', async () => {
    const nom = boite.querySelector('#pcEleve').value.trim();
    if(!nom){ showToast("Indique l'élève."); return; }

    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      await appelPrep({
        action: 'procCorrigerSet',
        id: x ? x.id : '',
        eleve: nom,
        messenger: boite.querySelector('#pcMess').value.trim(),
        remarque: boite.querySelector('#pcRem').value.trim(),
        /* Renvoyée seulement si elle a changé : une capture pèse
           lourd et le serveur garde l'ancienne. */
        capture: (image && (!x || !x.aUneCapture || image.indexOf('data:') === 0))
                   ? image : '',
        par: ACCES.moniteur || ''
      });
      document.body.removeChild(fond);
      showToast(x ? 'Modifiée ✅' : 'Ajoutée ✅');
      afficherProcCorriger();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
      bOk.textContent = x ? '💾 Enregistrer' : '➕ Ajouter';
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#pcEleve').focus(), 100);
}


/* ============================================================
   LA PASTILLE

   Elle ne s'affiche que pour ceux qui corrigent : la voir sans
   pouvoir agir n'apporte rien.
   ============================================================ */
function majPastilleProc(){
  const n = nbProcACorriger();

  /* Sur le sous-onglet : le compte exact */
  if(typeof poserCompteVue === 'function'){
    poserCompteVue('eleves', 'proccorriger', n);
  }

  /* Et sur l'onglet Élèves lui-même : sans elle, il faudrait ouvrir
     l'onglet pour découvrir qu'il y a du travail. */
  if(typeof poserAlerte === 'function') poserAlerte('eleves', n);
}

/* Le compte, chargé en fond après la connexion */
async function chargerProcEnFond(){
  if(!ACCES || !ACCES.droits || !ACCES.droits.proccorriger) return;
  try{
    const d = await appelPrep({ action: 'procCorrigerList' });
    procACorriger = (d && d.fiches) || [];
    majPastilleProc();
  }catch(e){ /* la pastille attendra le prochain passage */ }
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-proccorriger.js'] = true;
