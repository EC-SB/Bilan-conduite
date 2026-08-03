/* ============================================================
   ec-correction.js
   Signaler une erreur du moniteur dans un bilan et la remplacer
   par la bonne procédure, avant que l'élève ne le reçoive.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Le bloc inséré dans le bilan, bien visible pour l'élève */
function blocCorrection(erreur, bonneProcedure, auteur){
  const P = [];
  P.push('');
  P.push('⚠️ 𝗖𝗢𝗥𝗥𝗘𝗖𝗧𝗜𝗢𝗡 — 𝗲𝗿𝗿𝗲𝘂𝗿 𝗱𝘂 𝗺𝗼𝗻𝗶𝘁𝗲𝘂𝗿 ⚠️');
  if(txt(erreur)){
    P.push('❌ Ce qui t\'a été dit pendant le cours :');
    P.push(txt(erreur));
    P.push('');
  }
  P.push('✅ La bonne procédure :');
  P.push(txt(bonneProcedure));
  P.push('');
  P.push('Désolés pour la confusion, c\'est cette version-ci qui fait foi.' +
         (auteur ? ' (correction : ' + auteur + ')' : ''));
  P.push('');
  return P.join('\n');
}


/* Fenêtre de correction, appliquée au bilan affiché */
async function ouvrirCorrectionMoniteur(){
  const champ = $('resultText');
  if(!champ || !champ.value.trim()){
    showToast('Aucun bilan à corriger.');
    return;
  }

  /* Les procédures enregistrées servent de bibliothèque */
  let procedures = [];
  try{
    if(typeof chargerModelesTexte === 'function'){
      await chargerModelesTexte();
      procedures = (modelesTexte || []).filter(m => m.usage === 'procedure');
    }
  }catch(e){}

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 94vw);max-height:90vh;overflow-y:auto;';

  boite.insertAdjacentHTML('beforeend',
    '<h3>⚠️ Signaler une erreur du moniteur</h3>' +
    '<div style="font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:14px;">' +
      "La correction sera ajoutée en tête du bilan, avant que l'élève ne le reçoive." +
    '</div>' +
    '<label for="corErreur">Ce qui a été dit à tort (facultatif)</label>' +
    '<textarea id="corErreur" rows="3" ' +
      'placeholder="Recopie ou résume le passage erroné" ' +
      'style="width:100%;background:var(--navy);border:1px solid var(--line);color:var(--cream);' +
      'padding:10px 11px;border-radius:10px;font-size:15px;line-height:1.5;font-family:inherit;' +
      'resize:vertical;margin-bottom:14px;"></textarea>' +
    '<label for="corProcedure">La bonne procédure</label>');

  /* Choix parmi les procédures enregistrées */
  if(procedures.length){
    const sel = document.createElement('select');
    sel.id = 'corChoix';
    sel.innerHTML = '<option value="">— écrire moi-même —</option>' +
      procedures.map((p, i) => '<option value="' + i + '">' + p.nom.replace(/</g, '&lt;') +
        '</option>').join('');
    boite.appendChild(sel);
  }else{
    const a = document.createElement('div');
    a.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 8px;line-height:1.4;';
    a.textContent = "Astuce : enregistre tes procédures dans « Mes modèles de message » " +
      "pour les réutiliser d'un appui.";
    boite.appendChild(a);
  }

  const zone = document.createElement('textarea');
  zone.id = 'corProcedure';
  zone.rows = 8;
  zone.placeholder = 'La procédure correcte, telle que tu veux qu\'elle apparaisse';
  zone.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:15px;line-height:1.6;' +
    'font-family:inherit;resize:vertical;margin-bottom:14px;';
  boite.appendChild(zone);

  const rangee = document.createElement('div');
  rangee.className = 'btn-row';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '✅ Ajouter la correction';
  rangee.appendChild(bAnn); rangee.appendChild(bOk);
  boite.appendChild(rangee);

  const msg = document.createElement('div');
  msg.style.cssText = 'margin-top:8px;font-size:13px;min-height:16px;';
  boite.appendChild(msg);

  fond.appendChild(boite);
  document.body.appendChild(fond);

  const sel = boite.querySelector('#corChoix');
  if(sel){
    sel.addEventListener('change', () => {
      if(sel.value === '') return;
      zone.value = procedures[parseInt(sel.value, 10)].contenu || '';
    });
  }

  bAnn.addEventListener('click', () => document.body.removeChild(fond));

  bOk.addEventListener('click', async () => {
    const proc = zone.value.trim();
    if(!proc){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Indique la bonne procédure.';
      return;
    }

    const erreur = boite.querySelector('#corErreur').value.trim();

    /* La correction se place en tête, juste après le titre du bilan */
    const lignes = champ.value.split('\n');
    const bloc = blocCorrection(erreur, proc, ACCES.moniteur || '');
    lignes.splice(1, 0, bloc);
    champ.value = lignes.join('\n');

    /* La note interne garde la trace, pour le bureau */
    const note = $('noteResult');
    if(note){
      const mention = '⚠️ Erreur du moniteur corrigée' +
        (ACCES.moniteur ? ' par ' + ACCES.moniteur : '');
      if(note.value.indexOf(mention) === -1){
        note.value = (note.value ? note.value + '\n' : '') + mention;
      }
    }

    document.body.removeChild(fond);
    marquerExport(false);
    showToast('Correction ajoutée au bilan ✅');
    if(typeof sauvegarderLocal === 'function') sauvegarderLocal(true);
  });
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-correction.js'] = true;
