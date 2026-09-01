/* Déployé le 01/09/2026 à 13:48 — v770 */
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
  /* Le suivi : où en est chaque dossier */
  const zs = document.createElement('div');
  zs.id = 'pfSuivi';
  zs.style.marginTop = '18px';
  zone.appendChild(zs);
  afficherSuiviAlma();

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
  /* Verrouillé pendant l'envoi : un second appui expédiait deux
     fois le même message de paiement à l'élève. Tous les boutons
     équivalents de l'outil se désactivent ; ces deux-là avaient
     été oubliés. */
  bMail.addEventListener('click', async () => {
    bMail.disabled = true;
    const libelle = bMail.textContent;
    bMail.textContent = 'Envoi…';
    try{ await envoyerPaiementMail(montant, options); }
    finally{ bMail.disabled = false; bMail.textContent = libelle; }
  });
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

  /* Garder la proposition : sans cela, on oublie qui attend quoi */
  const bSuivi = document.createElement('button');
  bSuivi.className = 'btn btn-secondary';
  bSuivi.style.cssText = 'margin-top:8px;padding:12px;font-size:13px;' +
    'border-color:var(--ambre);color:var(--ambre);';
  bSuivi.textContent = '💾 Ajouter au suivi';
  /* Idem : le garde-fou anti-doublon compare à la liste, et la
     liste n'est pas encore rechargée au second appui. */
  bSuivi.addEventListener('click', async () => {
    bSuivi.disabled = true;
    const libelle = bSuivi.textContent;
    bSuivi.textContent = 'Enregistrement…';
    try{ await enregistrerAuSuivi(montant); }
    finally{ bSuivi.disabled = false; bSuivi.textContent = libelle; }
  });
  zone.appendChild(bSuivi);

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

  /* La fenêtre remplace la confirmation : elle montre l'adresse ET
     laisse la corriger, ce que « oui / non » ne permettait pas. */
  adresse = await confirmerAdresseEleve(nom, adresse);
  if(!adresse) return;

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
   LE SUIVI DES DOSSIERS

   Trois moments : on propose, l'élève fait sa demande sur ALMA,
   ALMA nous verse. La ligne disparaît au dernier — ce qui reste
   attend encore quelque chose.
   ============================================================ */

let paiementsAlma = [];


async function enregistrerAuSuivi(montant){
  const nom = String(($('pfEleve') && $('pfEleve').value) || '').trim();
  if(!nom){
    showToast('Indique l\'élève avant d\'ajouter au suivi.');
    if($('pfEleve')) $('pfEleve').focus();
    return;
  }

  /* Déjà suivi : on ne crée pas de doublon */
  const deja = paiementsAlma.find(x =>
    normaliserMot(x.eleve || '') === normaliserMot(nom));
  if(deja){
    if(!await confirmer(nom + ' est déjà dans le suivi pour ' +
        euros(deja.montant) + '.\n\nEn ajouter un second ?')) return;
  }

  try{
    await appelPrep({
      action: 'almaSet',
      eleve: nom,
      montant: montant,
      par: ACCES.moniteur || ''
    });
    showToast('Ajouté au suivi ✅');
    afficherSuiviAlma();
  }catch(e){
    showToast('Impossible : ' + e.message);
  }
}


async function afficherSuiviAlma(){
  const zone = $('pfSuivi');
  if(!zone) return;

  zone.innerHTML = htmlAttente('Lecture des dossiers ALMA…');
  try{
    const d = await appelPrep({ action: 'almaList' });
    paiementsAlma = (d && d.paiements) || [];
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' +
      String(e.message || e).replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:4px;';
  t.textContent = '📋 Dossiers en cours';
  zone.appendChild(t);

  if(!paiementsAlma.length){
    zone.innerHTML += '<div class="empty">Aucun dossier en attente.<br>' +
      '<span style="font-size:12px;">Le bouton 💾 au-dessus ajoute une ' +
      'proposition au suivi.</span></div>';
    return;
  }

  /* Ce qui attend quoi : c'est ce qu'on vient regarder */
  const sansDemande = paiementsAlma.filter(x => !x.demandeFaite).length;
  const enAttente = paiementsAlma.filter(x => x.demandeFaite).length;

  const cpt = document.createElement('div');
  cpt.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;' +
    'line-height:1.5;';
  cpt.innerHTML =
    (sansDemande ? '⏳ <strong>' + sansDemande + '</strong> ' +
      'en attente de la demande de l\'élève' : '') +
    (sansDemande && enAttente ? '<br>' : '') +
    (enAttente ? '💳 <strong>' + enAttente + '</strong> ' +
      'demande(s) faite(s), en attente du virement ALMA' : '');
  zone.appendChild(cpt);

  paiementsAlma.forEach(p => zone.appendChild(ligneAlma(p)));
}


function ligneAlma(p){
  const l = document.createElement('div');
  l.style.cssText = 'border:1px solid ' +
    (p.demandeFaite ? 'var(--orange)' : 'var(--line)') +
    ';border-radius:11px;padding:11px 12px;margin-bottom:8px;';

  const h = document.createElement('div');
  h.style.cssText = 'display:flex;gap:9px;align-items:flex-start;' +
    'margin-bottom:9px;';
  h.innerHTML = '<span style="flex:1;min-width:0;font-size:15px;' +
    'line-height:1.4;">' +
    '<strong>' + String(p.eleve).replace(/</g, '&lt;') + '</strong>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      'proposé le ' + p.proposeLe +
      (p.par ? ' par ' + String(p.par).replace(/</g, '&lt;') : '') +
    '</div></span>' +
    '<span style="flex-shrink:0;font-size:16px;font-weight:800;' +
      'color:var(--accent-text);">' + euros(p.montant) + '</span>';
  l.appendChild(h);

  /* Les deux étapes, dans l'ordre */
  const z = document.createElement('div');
  z.style.cssText = 'border-top:1px solid rgba(255,255,255,.06);' +
    'padding-top:9px;';

  const etape = (nom, coche, aide, quand) => {
    const lab = document.createElement('label');
    lab.style.cssText = 'display:flex;align-items:center;gap:10px;' +
      'text-transform:none;font-size:14px;color:var(--cream);margin:0 0 7px;' +
      'font-weight:400;';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = coche;
    cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin:0;';
    cb.addEventListener('change', () => quand(cb));
    lab.appendChild(cb);

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    t.innerHTML = nom + (aide
      ? '<div style="font-size:11px;color:var(--muted);">' + aide + '</div>'
      : '');
    lab.appendChild(t);

    z.appendChild(lab);
  };

  etape("L'élève a fait sa demande sur ALMA", p.demandeFaite, '',
    async cb => {
      cb.disabled = true;
      try{
        await appelPrep({ action: 'almaSet', id: p.id,
                          demandeFaite: cb.checked });
        p.demandeFaite = cb.checked;
        showToast('Enregistré ✅');
        afficherSuiviAlma();
      }catch(e){
        cb.checked = !cb.checked;
        showToast('Impossible : ' + e.message);
      }
      cb.disabled = false;
    });

  etape('Payé par ALMA, encaissé sur Driv\'up',
    false, 'La ligne quittera le suivi',
    async cb => {
      if(!cb.checked) return;

      if(!await confirmer('Virement ALMA encaissé pour ' + p.eleve + ' ?\n\n' +
          'Le dossier est terminé : il quittera le suivi.')){
        cb.checked = false;
        return;
      }

      cb.disabled = true;
      try{
        await appelPrep({ action: 'almaSet', id: p.id, payeAlma: true });
        showToast('Dossier clos ✅');
        afficherSuiviAlma();
      }catch(e){
        cb.checked = false;
        cb.disabled = false;
        showToast('Impossible : ' + e.message);
      }
    });

  l.appendChild(z);

  if(p.remarque){
    const rm = document.createElement('div');
    rm.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;' +
      'margin-top:4px;white-space:pre-wrap;';
    rm.textContent = p.remarque;
    l.appendChild(rm);
  }

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;margin-top:9px;';

  const bNote = document.createElement('button');
  bNote.className = 'btn btn-secondary';
  bNote.style.cssText = 'flex:1;padding:9px;font-size:12px;margin:0;';
  bNote.textContent = p.remarque ? '📝 Modifier la remarque' : '📝 Remarque';
  bNote.addEventListener('click', async () => {
    const v = await demander('Remarque sur ce dossier', p.remarque || '',
                             p.eleve);
    if(v === null) return;
    try{
      await appelPrep({ action: 'almaSet', id: p.id, remarque: v });
      showToast('Enregistré ✅');
      afficherSuiviAlma();
    }catch(e){ showToast('Impossible : ' + e.message); }
  });
  r.appendChild(bNote);

  /* L'élève renonce : la ligne s'en va sans être un succès */
  const bSup = document.createElement('button');
  bSup.className = 'btn btn-secondary';
  bSup.style.cssText = 'width:auto;padding:9px 11px;font-size:12px;margin:0;' +
    'flex-shrink:0;color:var(--red);border-color:var(--red);';
  bSup.textContent = '🗑️';
  bSup.title = 'Retirer du suivi';
  bSup.addEventListener('click', async () => {
    if(!await confirmer('Retirer ' + p.eleve + ' du suivi ?\n\n' +
        'À faire s\'il renonce au paiement en plusieurs fois.')) return;
    try{
      await appelPrep({ action: 'almaDelete', id: p.id });
      showToast('Retiré ✅');
      afficherSuiviAlma();
    }catch(e){ showToast('Impossible : ' + e.message); }
  });
  r.appendChild(bSup);

  l.appendChild(r);
  return l;
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
