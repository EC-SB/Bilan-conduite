/* ============================================================
   ec-paiement.js
   Le paiement en plusieurs fois.

   L'élève règle d'abord les frais directement à l'auto-école,
   puis le solde par ALMA, en 2, 3 ou 4 mensualités. Les frais
   dépendent du nombre d'échéances : plus il étale, plus cela
   lui coûte.

   Le lien ALMA se crée après son choix — il ne figure donc pas
   dans le message.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les taux d'ALMA, hors taxe, selon le nombre de mensualités */
const TAUX_ALMA = { 2: 0.046, 3: 0.048, 4: 0.058 };
const TVA_ALMA = 0.20;

/* ALMA refuse au-delà de cette somme */
const PLAFOND_ALMA = 2000;


function calculPaiement(montant, n){
  const ht = montant * (TAUX_ALMA[n] || 0);
  const frais = ht + (ht * TVA_ALMA);
  return {
    fois: n,
    frais: frais,
    mensualite: montant / n,
    /* Ce qu'ALMA prélèvera, une fois les frais réglés à part */
    solde: montant - frais,
    total: montant + frais
  };
}


/* « 236,00 € » : la virgule et l'espace insécable, comme partout */
function euros(v){
  return (Math.round(Number(v) * 100) / 100)
    .toFixed(2).replace('.', ',') + ' €';
}


async function afficherPaiement(){
  const zone = $('paiementZone');
  if(!zone) return;

  zone.innerHTML = '';

  const haut = document.createElement('div');
  haut.innerHTML =
    '<label for="pfMontant">Montant à financer</label>' +
    '<input type="number" id="pfMontant" inputmode="decimal" step="0.01" ' +
      'min="0" placeholder="Ex : 472" style="font-size:18px;">' +
    '<div id="pfAlerte" style="font-size:12px;line-height:1.5;' +
      'margin:-8px 0 12px;min-height:16px;"></div>' +

    '<label for="pfEleve">Pour quel élève</label>' +
    '<input type="text" id="pfEleve" list="listeEleves" autocomplete="off" ' +
      'placeholder="Son nom">';
  zone.appendChild(haut);

  const zr = document.createElement('div');
  zr.id = 'pfResultat';
  zone.appendChild(zr);

  const ch = $('pfMontant');
  ch.addEventListener('input', dessinerPaiement);
  setTimeout(() => ch.focus(), 100);

  dessinerPaiement();
}


function dessinerPaiement(){
  const zone = $('pfResultat');
  const alerte = $('pfAlerte');
  if(!zone) return;

  const montant = Number($('pfMontant').value);
  zone.innerHTML = '';
  alerte.innerHTML = '';

  if(!montant || montant <= 0){
    zone.innerHTML = '<div class="empty">Saisis le montant pour voir ' +
      'les trois possibilités.</div>';
    return;
  }

  /* Le plafond d'ALMA : mieux vaut le dire avant d'envoyer */
  if(montant > PLAFOND_ALMA){
    alerte.innerHTML = '<span style="color:var(--warn-text);">' +
      '⚠️ ALMA n\'accepte pas au-delà de ' + euros(PLAFOND_ALMA) +
      '. Ce montant ne passera pas.</span>';
  }

  const options = [2, 3, 4].map(n => calculPaiement(montant, n));

  /* Le tableau, comme celui du bas de ton classeur */
  const t = document.createElement('div');
  t.style.cssText = 'overflow-x:auto;margin-bottom:14px;';

  let html = '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
    '<thead><tr>' +
      '<th style="text-align:left;padding:8px 6px;font-size:11px;' +
        'color:var(--muted);">Montant demandé</th>' +
      '<th colspan="3" style="padding:8px 6px;font-size:15px;' +
        'color:var(--accent-text);">' + euros(montant) + '</th>' +
    '</tr><tr>' +
      '<th></th>' +
      options.map(o => '<th style="padding:6px;font-size:12px;' +
        'color:var(--muted);border-left:1px solid var(--line);">En ' +
        o.fois + ' fois</th>').join('') +
    '</tr></thead><tbody>';

  const ligne = (nom, valeurs, gras) => {
    html += '<tr style="border-top:1px solid rgba(255,255,255,.06);">' +
      '<td style="padding:8px 6px;font-size:12px;color:var(--muted);">' +
        nom + '</td>' +
      valeurs.map(v => '<td style="padding:8px 6px;text-align:center;' +
        'border-left:1px solid var(--line);' +
        (gras ? 'font-weight:800;color:var(--accent-text);' : '') +
        '">' + v + '</td>').join('') +
    '</tr>';
  };

  ligne('Frais', options.map(o => euros(o.frais)));
  ligne('Mensualités', options.map(o =>
    o.fois + ' × ' + euros(o.mensualite)));
  ligne('Coût total', options.map(o => euros(o.total)), true);

  html += '</tbody></table>';
  t.innerHTML = html;
  zone.appendChild(t);

  /* Ce qu'il paie à quel moment : c'est ce qui se comprend mal */
  const rappel = document.createElement('div');
  rappel.style.cssText = 'font-size:12px;color:var(--muted);' +
    'line-height:1.6;margin-bottom:14px;padding:10px 12px;' +
    'border:1px solid var(--line);border-radius:10px;';
  rappel.innerHTML =
    '<strong style="color:var(--cream);">Comment ça se passe</strong><br>' +
    'Il règle d\'abord <strong>les frais</strong> à l\'auto-école. ' +
    'On lui envoie ensuite le lien ALMA pour ses mensualités.';
  zone.appendChild(rappel);

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;';

  const bMail = document.createElement('button');
  bMail.className = 'btn btn-primary';
  bMail.style.cssText = 'flex:1;padding:12px;font-size:13px;margin:0;';
  bMail.textContent = '✉️ Envoyer par mail';
  bMail.addEventListener('click', () => envoyerPaiementMail(montant, options));
  r.appendChild(bMail);

  const bCop = document.createElement('button');
  bCop.className = 'btn btn-secondary';
  bCop.style.cssText = 'flex:1;padding:12px;font-size:13px;margin:0;';
  bCop.textContent = '📋 Copier pour Messenger';
  bCop.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(messagePaiement(montant, options));
      showToast('Message copié ✅');
    }catch(e){ showToast('Copie impossible'); }
  });
  r.appendChild(bCop);

  zone.appendChild(r);

  /* Le message tel qu'il partira : on le voit avant d'envoyer */
  const apercu = document.createElement('details');
  apercu.style.cssText = 'margin-top:12px;border:1px solid var(--line);' +
    'border-radius:10px;padding:9px 12px;';
  apercu.innerHTML = '<summary style="cursor:pointer;font-size:12px;' +
    'color:var(--muted);">Voir le message</summary>' +
    '<div style="white-space:pre-wrap;font-size:13px;line-height:1.6;' +
      'margin-top:9px;">' +
      messagePaiement(montant, options).replace(/</g, '&lt;') + '</div>';
  zone.appendChild(apercu);
}


/* Le message envoyé à l'élève */
function messagePaiement(montant, options){
  const nom = String(($('pfEleve') && $('pfEleve').value) || '').trim();
  const prenom = nom ? nom.split(' ')[0] : '';

  const l = [];
  l.push('Bonjour' + (prenom ? ' ' + prenom : '') + ',');
  l.push('');
  l.push('Voici les possibilités pour régler tes ' + euros(montant) +
         ' en plusieurs fois.');
  l.push('');

  options.forEach(o => {
    l.push('𝗘𝗡 ' + o.fois + ' 𝗙𝗢𝗜𝗦');
    l.push('· Frais à régler à l\'auto-école : ' + euros(o.frais));
    l.push('· Puis ' + o.fois + ' mensualités de ' + euros(o.mensualite));
    l.push('· Coût total : ' + euros(o.total));
    l.push('');
  });

  l.push('Dis-nous en combien de fois tu souhaites régler.');
  l.push('Tu paies d\'abord les frais à l\'auto-école, et on t\'envoie');
  l.push('ensuite le lien pour tes mensualités.');
  l.push('');
  l.push('À bientôt !');
  l.push('Évolution Conduites');

  return l.join('\n');
}


async function envoyerPaiementMail(montant, options){
  const nom = String(($('pfEleve') && $('pfEleve').value) || '').trim();
  if(!nom){
    showToast('Indique l\'élève pour retrouver son adresse.');
    if($('pfEleve')) $('pfEleve').focus();
    return;
  }

  let adresse = '';
  try{
    const d = await appelPrep({ action: 'contactEleve', eleve: nom });
    adresse = ((d && d.contact) || {}).email || '';
  }catch(e){}

  if(!adresse){
    showToast('Aucune adresse dans la fiche de ' + nom + '.');
    return;
  }

  if(!await confirmer('Envoyer les possibilités de règlement à ' +
      adresse + ' ?')) return;

  try{
    await appelPrep({
      action: 'mailBilan',
      to: [adresse],
      sujet: 'Régler en plusieurs fois — Évolution Conduites',
      texte: messagePaiement(montant, options)
    });
    showToast('Envoyé à ' + adresse + ' ✅');
  }catch(e){
    showToast('Impossible : ' + e.message);
  }
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-paiement.js'] = true;
