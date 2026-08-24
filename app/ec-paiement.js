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

  /* La marche à suivre, en bas : elle ne sert qu'à nous, et elle
     ne doit jamais partir à l'élève. */
  const zp = document.createElement('div');
  zp.id = 'pfProcess';
  zp.style.marginTop = '16px';
  zone.appendChild(zp);
  afficherProcessPaiement();

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



/* ============================================================
   LA MARCHE À SUIVRE

   Ce que le personnel doit faire, dans l'ordre. Elle vit dans
   les réglages : un administrateur la corrige quand ALMA ou
   Driv'up changent quelque chose.
   ============================================================ */

const PROCESS_PAIEMENT_DEFAUT = [
'𝙋𝙧𝙤𝙘𝙚𝙨𝙨𝙪𝙨 𝙥𝙤𝙪𝙧 𝙡𝙚 𝙥𝙚𝙧𝙨𝙤𝙣𝙣𝙚𝙡 (𝙉𝙚 𝙥𝙖𝙨 𝙚𝙣𝙫𝙤𝙮𝙚𝙧)',
'',
'ATTENTION : ALMA ne facture pas directement les frais aux élèves donc,',
'Process obligatoire :',
'- en premier, AVANT DE FAIRE LE DOSSIER, on fait payer les frais sur drivup en faisant un solde versement à payer et bien mettre frais de paiement : si en 2 fois 4.60% HT ; si en 3 fois 4.80% HT ; si en 4 fois 5.80% HT',
'- On fait le dossier sur ALMA seulement quand frais payés sur drivup',
'- Si validé RAS on débloque 24h après ; si refus on rembourse les frais.',
'',
'𝘿𝙖𝙨𝙝𝙗𝙤𝙖𝙧𝙙 : https://dashboard.getalma.eu/login',
'𝙋𝙤𝙪𝙧 𝙛𝙖𝙞𝙧𝙚 𝙡𝙚𝙨 𝙡𝙞𝙚𝙣𝙨 : https://shop.getalma.eu/',
'',
"Attention, il peut y avoir un délai de 24h avant la validation définitive d'ALMA.",
'Nous recevons l\'argent en une fois au bout de 7 jours, moins les frais.',
'',
'𝗣𝗿𝗼𝗰𝗲𝘀𝘀 𝗗𝗿𝗶𝘃\'𝘂𝗽',
'',
'1. Établir le devis global',
'Faire un devis regroupant toutes les prestations qui doivent être réglées via ALMA.',
'',
'2. Calculer les frais de dossier',
'Le calculateur ci-dessus les donne.',
'',
'3. Facturer les frais ALMA dans Drivup',
"Ouvrir le profil de l'élève. Aller dans : Facturer > Produits.",
'Sélectionner : Frais ALMA 1 fois, 2 fois ou 3 fois selon le cas.',
'Renseigner : Quantité 1, Prix unitaire = montant des frais calculés.',
'Mettre la facture en statut « À venir », ou son mode de paiement s\'il paye directement, une fois le paiement validé.',
"Facturer. L'élève pourra alors régler cette facture depuis son interface si elle est mise en « à venir ».",
'',
'4. Vérifier le paiement des frais',
'Une fois le paiement effectué, vérifier dans le relevé de compte que la facture des frais apparaît comme payée.',
'',
'5. Générer le lien de paiement ALMA',
'Se connecter à https://shop.getalma.eu/ et créer le lien correspondant au montant à financer.',
'',
'6. Traitement après validation du paiement ALMA',
'',
'A. Transformer le devis en facture',
'Aller dans les devis, transformer le devis en facture.',
'Indiquer : Statut « À venir », Destinataire « ALMA ».',
'',
'B. Créer un avoir sur la facture des frais',
"Aller dans le relevé de compte de l'élève.",
'Sur la facture des frais ALMA : Actions > Créer un avoir.',
'Quantité à annuler : 1. Choisir l\'agence.',
'Sélectionner une facture à payer : la facture ALMA créée précédemment.',
'',
'C. Vérification du solde',
'Après l\'avoir, le montant restant dû sur la facture ALMA doit être égal à :',
'montant global du devis − montant des frais ALMA.',
'Ce montant doit correspondre au résultat du calculateur.',
'',
'7. Planification des leçons',
"Une fois cette étape terminée, l'élève peut commencer à réserver et planifier ses leçons.",
'',
'8. Réception du virement ALMA',
'Dès réception du virement : ouvrir la facture ALMA (payée partiellement).',
'Cliquer sur Actions > Ajouter un encaissement.',
'Saisir le montant reçu par virement, puis valider l\'encaissement.'
].join('\n');


let processPaiement = null;

async function afficherProcessPaiement(){
  const zone = $('pfProcess');
  if(!zone) return;

  if(processPaiement === null){
    try{
      const d = await appelPrep({ action: 'reglagesList' });
      const r = (d && d.reglages) || {};
      processPaiement = r.processPaiement || PROCESS_PAIEMENT_DEFAUT;
    }catch(e){
      processPaiement = PROCESS_PAIEMENT_DEFAUT;
    }
  }

  zone.innerHTML = '';

  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid var(--warn-bg);border-radius:12px;' +
    'padding:10px 12px;background:var(--warn-bg);';
  d.innerHTML = '<summary style="cursor:pointer;font-size:13px;' +
    'font-weight:700;color:var(--warn-text);">⚠️ Marche à suivre — ' +
    'ne pas envoyer à l\'élève</summary>';

  const z = document.createElement('div');
  z.style.cssText = 'margin-top:10px;font-size:13px;line-height:1.65;' +
    'white-space:pre-wrap;';
  z.textContent = processPaiement;
  d.appendChild(z);

  /* Seul un administrateur la corrige : c'est une consigne
     d'auto-école, pas une note personnelle. */
  if(ACCES.role === 'admin'){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'margin-top:10px;padding:10px;font-size:12px;';
    b.textContent = '✏️ Modifier la marche à suivre';
    b.addEventListener('click', () => ouvrirProcessPaiement());
    d.appendChild(b);
  }

  zone.appendChild(d);
}


function ouvrirProcessPaiement(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(640px, 95vw);max-height:90vh;overflow-y:auto;';

  boite.innerHTML = '<h3>✏️ Marche à suivre</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;' +
      'line-height:1.5;">Elle s\'affiche sous le calculateur, pour le ' +
      'personnel seulement. Elle ne part jamais à un élève.</div>';

  const z = document.createElement('textarea');
  z.rows = 20;
  z.value = processPaiement;
  z.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:13px;' +
    'line-height:1.6;font-family:inherit;resize:vertical;margin-bottom:10px;';
  boite.appendChild(z);

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bA);

  const bRaz = document.createElement('button');
  bRaz.className = 'btn btn-secondary';
  bRaz.style.cssText = 'width:auto;padding:11px 13px;font-size:12px;';
  bRaz.textContent = '↩️';
  bRaz.title = 'Revenir au texte d\'origine';
  bRaz.addEventListener('click', () => { z.value = PROCESS_PAIEMENT_DEFAUT; });
  r.appendChild(bRaz);

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = '💾 Enregistrer';
  bO.addEventListener('click', async () => {
    bO.disabled = true;
    try{
      await appelPrep({
        action: 'reglageSet', cle: 'processPaiement',
        valeur: z.value, par: ACCES.moniteur || ''
      });
      processPaiement = z.value;
      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      afficherProcessPaiement();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bO.disabled = false;
    }
  });
  r.appendChild(bO);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-paiement.js'] = true;
