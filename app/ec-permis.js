/* ============================================================
   ec-permis.js
   Élève ayant obtenu son permis
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   PERMIS OBTENU — messages et liste de tâches
   ============================================================ */
const MSG_PERMIS = {
  "felicitations": "👏🥳🤩 𝙁𝙀́𝙇𝙄𝘾𝙄𝙏𝘼𝙏𝙄𝙊𝙉𝙎, 𝙏𝙐 𝘼𝙎 𝙀𝙐 𝙏𝙊𝙉 𝙋𝙀𝙍𝙈𝙄𝙎 !!! 🤩🥳👏\n\n𝗘𝘁 𝗲𝗻𝘀𝘂𝗶𝘁𝗲 ?\nTu as été mentionné(e) sur la publication Facebook \"vous avez eu votre permis !\" \nLIS BIEN, TOUT EST INDIQUÉ DESSUS : comme par exemple, comment télécharger son résultat pdf 😏 \n\n𝗧𝗼𝗻 𝗮𝘃𝗶𝘀 𝙂𝙤𝙤𝙜𝙡𝙚 :\nOn n'oublie pas l'avis Google ⭐️⭐️⭐️⭐️⭐️, Il est super important pour nous 🥰\nÇa nous donne la patate et l'envie de CONTINUER à se battre pour vous !!!\nhttps://g.page/r/CTPj62EISdlcEB0/review\nhttps://g.co/kgs/7GEyuo\n\n𝙉'𝙝𝙚́𝙨𝙞𝙩𝙚 𝙥𝙖𝙨 𝙖̀ :\n- nous envoyer la photo de ton carrosse ;)\n- nous poser des questions sur Messenger, on est toujours là si besoin 🫶\n- parler d'Évolution Conduites autour de toi 💝\nPlus il y aura de conducteurs bien formés, plus on sera en sécurité sur la route 😅\n- continuer de te former chez nous : profite de la validité de ton code de 5 ans pour passer ton permis remorque 🚙🚃, lance-toi sur la route en deux roues en faisant nos formations motos 🏍️ ! \nEt pour ton entourage, on a aussi la Baby conduites® 👼à partir de 9 ans (formation unique en France), remise à niveau, voiture équipée handicap, formation entreprises etc.. \n\nÉvolution Conduites, toujours là pour la suite 🤝",
  "antsEleve": "C'est toi qui t'es occupé(e) de ton inscription ANTS 💪\nN'oublie pas de faire la demande pour obtenir ton titre du permis de CONDUIRE !\nhttps://www.service-public.fr/particuliers/vosdroits/R45443. \n\nSi tu t'en occupes : gratuit\nSi tu veux qu'on s'en occupe : c'est 45 € TTC\nC'est au choix ! 😁\n\n🚗 Pour conduire en attendant ta demande de titre, télécharge ton attestation de réussite sur le site RDV Permis : \nhttps://www.service-public.fr/particuliers/vosdroits/R39502. \n(crée-toi un compte si ce n'est pas déjà fait et non, on ne peut pas le récupérer de notre compte à nous).",
  "antsNous": "𝗖'𝗲𝘀𝘁 𝗻𝗼𝘂𝘀 𝗾𝘂𝗶 𝗮𝘃𝗼𝗻𝘀 𝗳𝗮𝗶𝘁 𝘁𝗼𝗻 𝗱𝗼𝘀𝘀𝗶𝗲𝗿 𝗱'𝗶𝗻𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 𝗔𝗡𝗧𝗦, 𝗱𝗼𝗻𝗰 𝗼𝗻 𝘀'𝗼𝗰𝗰𝘂𝗽𝗲 𝗮𝘂𝘀𝘀𝗶 𝗱𝗲 𝘁𝗮 𝗱𝗲𝗺𝗮𝗻𝗱𝗲 𝗱𝗲 𝘁𝗶𝘁𝗿𝗲 !\n\n🚗 Pour conduire en attendant ta demande de titre, télécharge ton attestation de réussite sur le site RDV Permis : \nhttps://www.service-public.fr/particuliers/vosdroits/R39502. \n(crée-toi un compte si ce n'est pas déjà fait et non, on ne peut pas le récupérer de notre compte à nous).\n\n📂 𝗣𝗼𝘂𝗿 𝗹𝗮 𝗿𝗲́𝗮𝗹𝗶𝘀𝗮𝘁𝗶𝗼𝗻 𝗱𝗲 𝘁𝗮 𝗱𝗲𝗺𝗮𝗻𝗱𝗲 𝗱𝗲 𝘁𝗶𝘁𝗿𝗲, je vais avoir besoin de plusieurs documents (📩 𝗗𝗲́𝗽𝗼𝘀𝗲-𝗹𝗲𝘀 𝘀𝘂𝗿 𝘁𝗼𝗻 𝗜𝗡𝗧𝗘𝗥𝗙𝗔𝗖𝗘 𝗘𝗟𝗘𝗩𝗘 𝗗𝗿𝗶𝘃𝘂𝗽 𝗱𝗮𝗻𝘀 \"𝗗𝗼𝗰𝘂𝗺𝗲𝗻𝘁𝘀 𝗮̀ 𝗳𝗼𝘂𝗿𝗻𝗶𝗿\" 𝗲𝘁 𝘀𝗲𝗿𝘀-𝘁𝗼𝗶 𝗱𝗲 𝗹𝗮 𝗹𝗶𝘀𝘁𝗲 \"𝗗𝗼𝗰𝘂𝗺𝗲𝗻𝘁 𝗰𝗼𝗺𝗽𝗹𝗲́𝗺𝗲𝗻𝘁𝗮𝗶𝗿𝗲\" 𝗽𝗼𝘂𝗿 𝗮𝗷𝗼𝘂𝘁𝗲𝗿 𝗹'𝗲𝗻𝘀𝗲𝗺𝗯𝗹𝗲 𝗱𝗲𝘀 𝗽𝗶𝗲̀𝗰𝗲𝘀 𝗱𝗲𝗺𝗮𝗻𝗱𝗲́𝗲𝘀 𝗰𝗶-𝗱𝗲𝘀𝘀𝗼𝘂𝘀 !\nhttps://client.drivup.fr/mon-compte/votreDossier.php📂)\n\n𝟭- 𝙀-𝙥𝙝𝙤𝙩𝙤 :\nPhoto avec signature numérique + code de 22 caractères alphanumériques !\n\nPour savoir où faire sa photo e-photo : https://permisdeconduire.ants.gouv.fr/services/geolocaliser-les-photographes-habilites\n\n⚠ Attention, c'est à usage unique, si une demande a été faite avec, une autre demande ne peut pas être effectuée ⚠\n\n𝟮- 𝙅𝙪𝙨𝙩𝙞𝙛𝙞𝙘𝙖𝙩𝙞𝙛 𝙙’𝙞𝙙𝙚𝙣𝙩𝙞𝙩𝙚́ : \nPour savoir quels justificatifs sont acceptés : \nhttps://www.service-public.fr/particuliers/vosdroits/F31057\n\n𝟯- 𝙅𝙪𝙨𝙩𝙞𝙛𝙞𝙘𝙖𝙩𝙞𝙛 𝙙𝙚 𝙙𝙤𝙢𝙞𝙘𝙞𝙡𝙚 𝙙𝙚 𝙢𝙤𝙞𝙣𝙨 𝙙𝙚 𝟯 𝙢𝙤𝙞𝙨 :\nJustificatif de domicile à ton nom (Facture eau, électricité, gaz ou téléphone)\n𝙎𝙞 𝙩𝙪 𝙝𝙖𝙗𝙞𝙩𝙚𝙨 𝙘𝙝𝙚𝙯 𝙦𝙪𝙚𝙡𝙦𝙪'𝙪𝙣 :\n- Attestation sur l'honneur de la personne qui vous héberge certifiant l'hébergement, datée et signée par vous deux (https://urlr.me/fgs5Z)\n- Pièce d'identité recto verso de la personne qui vous héberge\n- Justificatif de domicile à son nom (facture datant de moins de 3 mois, eau, électricité, gaz, téléphone)\n\n𝟰- 𝘾𝙤𝙥𝙞𝙚 𝙧𝙚𝙘𝙩𝙤 𝙫𝙚𝙧𝙨𝙤 𝙙𝙪 𝙥𝙚𝙧𝙢𝙞𝙨 𝙙𝙚́𝙟𝙖̀ 𝙤𝙗𝙩𝙚𝙣𝙪 :\nAM ou A1 ou B (inscription A2) C'est toi qui a fait ton dossier ANTS \nN'oublie pas de faire la demande pour obtenir ton titre du permis de CONDUIRE !\nhttps://www.service-public.fr/particuliers/vosdroits/R45443.",
  "passerelle": "𝗧𝘂 𝗮𝘀 𝗼𝗯𝘁𝗲𝗻𝘂 𝘁𝗼𝗻 𝗽𝗲𝗿𝗺𝗶𝘀 𝗲𝗻 𝗯𝗼𝗶𝘁𝗲 𝗮𝘂𝘁𝗼𝗺𝗮𝘁𝗶𝗾𝘂𝗲 🎉\n𝗦𝗶 𝘁𝘂 𝘀𝗼𝘂𝗵𝗮𝗶𝘁𝗲𝘀 𝘁'𝗶𝗻𝘀𝗰𝗿𝗶𝗿𝗲 𝗮̀ 𝗻𝗼𝘁𝗿𝗲 𝗳𝗼𝗿𝗺𝗮𝘁𝗶𝗼𝗻 𝗣𝗔𝗦𝗦𝗘𝗥𝗘𝗟𝗟𝗘 :\n\n🎉 𝗩𝗼𝗶𝗰𝗶 𝘁𝗼𝗻 𝗽𝗿𝗼𝗴𝗿𝗮𝗺𝗺𝗲 𝗲𝗻 𝟱 𝗲́𝘁𝗮𝗽𝗲𝘀 🎉\n\n𝟭- 𝗗𝗲́𝗺𝗮𝗿𝗿𝗲 𝘁𝗮 𝗳𝗼𝗿𝗺𝗮𝘁𝗶𝗼𝗻 𝙋𝘼𝙎𝙎𝙀𝙍𝙀𝙇𝙇𝙀 𝗲𝗻 𝗮𝗰𝗵𝗲𝘁𝗮𝗻𝘁 𝗹𝗲 𝙋𝘼𝘾𝙆 !\n\n𝗧𝘂 𝘃𝗶𝗲𝗻𝘀 𝗱𝗲 𝗿𝗲𝗰𝗲𝘃𝗼𝗶𝗿 𝗽𝗮𝗿 𝗺𝗮𝗶𝗹 𝗱𝗲𝘀 𝗻𝗼𝘂𝘃𝗲𝗮𝘂𝘅 𝗶𝗱𝗲𝗻𝘁𝗶𝗳𝗶𝗮𝗻𝘁𝘀 𝗱𝗿𝗶𝘃𝘂𝗽. 𝗖𝗼𝗻𝗻𝗲𝗰𝘁𝗲-𝘁𝗼𝗶 𝗱𝗲𝘀𝘀𝘂𝘀 :\n - Tu peux régler directement en ligne via ce nouvel espace élève\n - Par chèque ou espèce au bureau\n - Paiement en 3 ou 4 fois via un prestataire (avec des frais à ta charge)\n(Si tu es sur Iphone passe par Safari et non par l'appli)\n\n𝘿𝙧𝙞𝙫𝙪𝙥 > 𝙍𝙚́𝙨𝙚𝙧𝙫𝙚𝙧 > 𝙋𝙧𝙖𝙩𝙞𝙦𝙪𝙚 > 𝙁𝙤𝙧𝙢𝙪𝙡𝙚 𝙋𝙧𝙖𝙩𝙞𝙦𝙪𝙚 > 𝘼𝙘𝙝𝙚𝙩𝙚𝙧 𝙘𝙤𝙢𝙥𝙩𝙖𝙣𝙩 > 𝙋𝙖𝙞𝙚𝙢𝙚𝙣𝙩\nDis-nous dès que c'est fait, que l'on puisse planifier ensemble le simulateur avec moniteur et les leçons de voitures.\n\n𝟮- 𝗔𝗩𝗔𝗡𝗧 𝗗𝗘 𝗩𝗘𝗡𝗜𝗥 𝗘𝗡 𝗖𝗢𝗨𝗥𝗦 :\nNous allons t'ajouter dans un groupe Facebook qu'il faudra que tu révises absolument avant de venir en simulateur avec moniteur, sinon tu seras RENVOYÉ DU COURS.\nEnvois des vidéos de la position de ta main ou des vocaux des procédures pour que l'on puisse te corriger gratuitement sur Messenger.\nhttps://m.facebook.com/groups/174715876519873/permalink/1348332705824845/👀\n\n 𝟯- 𝗦𝗜𝗠𝗨𝗟𝗔𝗧𝗘𝗨𝗥 𝗔𝗩𝗘𝗖 𝗠𝗢𝗡𝗜𝗧𝗘𝗨𝗥 (𝟭𝗵) :\n(𝗥𝗲́𝘀𝗲𝗿𝘃𝗮𝘁𝗶𝗼𝗻 𝗮𝘂 𝗯𝘂𝗿𝗲𝗮𝘂 💁 𝗼𝘂 𝗽𝗮𝗿 𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸 𝗠𝗲𝘀𝘀𝗲𝗻𝗴𝗲𝗿 📨)\nViens apprendre à manipuler parfaitement la boîte de vitesse avant de partir en Audi !\n\n𝟰- 𝗟𝗘𝗖̧𝗢𝗡 𝗗𝗘 𝗖𝗢𝗡𝗗𝗨𝗜𝗧𝗘 (𝟲𝗵 𝘀𝗼𝗶𝘁 𝟯 𝗹𝗲𝗰̧𝗼𝗻𝘀 𝗱𝗲 𝟮𝗵) :\n(𝗥𝗲́𝘀𝗲𝗿𝘃𝗮𝘁𝗶𝗼𝗻 𝗲𝗻 𝗹𝗶𝗴𝗻𝗲 👨🏽‍💻)\nSeulement si tu as bien travaillé sur la/les étapes précédentes, c'est l'heure pour toi de mettre en pratique  🤩\n\n𝟱- 𝗘́𝗖𝗢𝗨𝗧𝗘𝗦 𝗣𝗘́𝗗𝗔𝗚𝗢𝗚𝗜𝗤𝗨𝗘 (𝗹𝗲𝗰̧𝗼𝗻𝘀 𝗱𝗲 𝟮𝗵 𝗢𝗣𝗧𝗜𝗢𝗡𝗡𝗘𝗟) :\n(𝗥𝗲́𝘀𝗲𝗿𝘃𝗮𝘁𝗶𝗼𝗻 𝗮𝘂 𝗯𝘂𝗿𝗲𝗮𝘂 💁 𝗼𝘂 𝗽𝗮𝗿 𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸 𝗠𝗲𝘀𝘀𝗲𝗻𝗴𝗲𝗿 📨)\nParticipe à la leçon d'un élève à l'arrière de l'Audi !\n\nBien sûr, en fonction de tes besoins, cela peut évoluer, mais nous verrons ensemble au moment venu !\n\nℹ️ Tu pourras conduire dès la fin de ta passerelle une voiture en boîte de vitesse en présentant ton résultat positif de ton examen boite auto ET ton attestation de ta passerelle. ⚠️ Valable que 4 mois ⚠️\nPendant ce temps, nous effectuerons ta demande de titre boite de vitesse.",
  "tachesCommunes": [
    [
      "Publication FB",
      "Facebook > Groupe général > 🔍 > \"Yepa\" > Nommer l'élève dans les commentaires avec un @"
    ],
    [
      "Retirer des groupes FB (sauf le général)",
      "Facebook > Ouvrir tous les groupes avec la molette > Membres > 🔍 Nom de l'élève > ... > Supprimer"
    ],
    [
      "Mail sécurité routière",
      ""
    ],
    [
      "Enlever Pro format 56€",
      "Pas touche pour le moment"
    ],
    [
      "Si financement PE : courrier obtention du permis à envoyer",
      "Pas touche pour le moment"
    ],
    [
      "Si financement Région : faire signer document et envoyer",
      "Pas touche pour le moment"
    ]
  ],
  "tachesBea": [
    [
      "Envoyer le message d'obtention BEA",
      "Keep 5-2 🚗 Messages POST PERMIS > Obtention BEA"
    ],
    [
      "Mettre la date du permis sur Drivup",
      "Profil > Formule & Permis > Date du permis BEA"
    ],
    [
      "Dupliquer la fiche élève en formation passerelle",
      "Vérifier que la date du dernier permis soit bien mise et mettre la bonne formule pour qu'il puisse acheter > lui envoyer les nouveaux identifiants par mail"
    ],
    [
      "Drivup > Profil > ENPC / EDISER > Liaison active « oui »",
      ""
    ],
    [
      "Enpc-center > 🔍 Nom de l'élève > Application > E-prev > Valider les inscriptions",
      ""
    ]
  ]
};

/* elevePermis : déclaré dans ec-etat.js */

async function preparerPermis(){
  /* Le nom vient soit de la liste des examens passés, soit de la saisie repliée */
  const manuel = $('permisNomManuel');
  if(manuel && manuel.value.trim().length >= 2){
    $('permisNom').value = manuel.value.trim();
  }
  const nom = $('permisNom').value.trim();
  const zone = $('permisResultat');
  if(nom.length < 2){
    zone.innerHTML = '<div class="empty">Saisis le nom de l\'élève.</div>';
    return;
  }

  const btn = $('permisBtn');
  btn.disabled = true;
  btn.textContent = 'Recherche…';
  zone.innerHTML = '<div class="empty">Récupération du dossier…</div>';

  let dossier = { ants: '', boite: '', nb: 0 };
  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nom, leger: true })
    });
    if(r.ok){
      const data = await r.json().catch(() => ({}));
      const res = (data && data.resultats) || [];
      dossier.nb = res.length;
      res.forEach(it => {
        if(!dossier.ants && it.ants) dossier.ants = it.ants;
        if(!dossier.boite && it.boite) dossier.boite = it.boite;
        if(!dossier.boite && /automatique/i.test(it.type || '')) dossier.boite = 'bea';
      });
    }
  }catch(e){ /* on continue sans */ }

  btn.disabled = false;
  btn.textContent = '🎓 Préparer';
  elevePermis = { nom: nom, nb: dossier.nb };
  afficherPermis(nom, dossier);
}

function blocCopiable(titre, texte){
  const d = document.createElement('div');
  d.style.cssText = 'margin-bottom:16px;';
  const h = document.createElement('div');
  h.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:6px;';
  h.textContent = titre;
  const ta = document.createElement('textarea');
  ta.value = texte;
  ta.rows = 5;
  ta.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);color:var(--cream);' +
    'padding:11px 12px;border-radius:10px;font-size:13px;line-height:1.5;font-family:inherit;resize:vertical;';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-top:6px;font-size:14px;padding:11px;';
  b.textContent = '📋 Copier';
  b.addEventListener('click', async () => {
    try{ await navigator.clipboard.writeText(ta.value); }
    catch(e){ ta.select(); try{ document.execCommand('copy'); }catch(_){} }
    showToast('Copié ✅');
  });
  d.appendChild(h); d.appendChild(ta); d.appendChild(b);
  return d;
}

function afficherPermis(nom, dossier){
  const zone = $('permisResultat');
  zone.innerHTML = '';

  /* Réglages : repris du dossier, corrigeables */
  const reglages = document.createElement('div');
  reglages.style.cssText = 'margin-bottom:18px;';
  reglages.innerHTML =
    '<div style="font-size:13px;color:var(--muted);margin-bottom:10px;">' +
      '<strong style="color:var(--cream);font-size:15px;">' + nom + '</strong><br>' +
      dossier.nb + ' bilan(s) enregistré(s)</div>' +
    '<label for="permisAnts">Dossier ANTS</label>' +
    '<select id="permisAnts">' +
      '<option value="eleve">Fait par l\'élève</option>' +
      '<option value="nous">Fait par nous</option>' +
    '</select>' +
    '<label for="permisBoite">Permis obtenu en</label>' +
    '<select id="permisBoite">' +
      '<option value="bv">BV — boîte manuelle</option>' +
      '<option value="bea">BEA — boîte automatique</option>' +
    '</select>';
  zone.appendChild(reglages);

  const contenu = document.createElement('div');
  zone.appendChild(contenu);

  function rendre(){
    const ants = $('permisAnts').value;
    const boite = $('permisBoite').value;
    contenu.innerHTML = '';

    contenu.appendChild(blocCopiable('1 · Félicitations', MSG_PERMIS.felicitations));
    contenu.appendChild(blocCopiable(
      '2 · Demande ANTS — ' + (ants === 'nous' ? 'on s\'en occupe' : 's\'en occupe lui-même'),
      ants === 'nous' ? MSG_PERMIS.antsNous : MSG_PERMIS.antsEleve));
    if(boite === 'bea'){
      contenu.appendChild(blocCopiable('3 · Passerelle BEA → BV', MSG_PERMIS.passerelle));
    }

    /* Liste de tâches */
    const taches = MSG_PERMIS.tachesCommunes.slice();
    if(boite === 'bea'){
      MSG_PERMIS.tachesBea.forEach(t => taches.push(t));
    }
    const bloc = document.createElement('div');
    bloc.style.cssText = 'margin-top:20px;padding-top:16px;border-top:1px solid var(--line);';
    bloc.innerHTML = '<div style="font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:10px;">' +
      '✅ À faire au bureau</div>';
    taches.forEach(t => {
      const l = document.createElement('label');
      l.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 0;' +
        'border-bottom:1px solid var(--line);text-transform:none;margin:0;';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.style.cssText = 'width:19px;height:19px;flex-shrink:0;margin-top:2px;';
      const txt = document.createElement('div');
      txt.innerHTML = '<div style="font-size:15px;color:var(--cream);line-height:1.4;">' +
        t[0].replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</div>' +
        (t[1] ? '<div style="font-size:12px;color:var(--muted);line-height:1.4;margin-top:2px;">' +
          t[1].replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</div>' : '');
      l.appendChild(cb); l.appendChild(txt);
      bloc.appendChild(l);
    });
    contenu.appendChild(bloc);

    /* Clôture du dossier, une fois tout envoyé */
    const fin = document.createElement('div');
    fin.style.cssText = 'margin-top:20px;padding-top:16px;border-top:2px solid var(--line);';

    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:4px;';
    t.textContent = '🏁 Clôturer le dossier';
    fin.appendChild(t);

    const a = document.createElement('div');
    a.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.5;';
    a.textContent = "Une fois les messages envoyés et les tâches faites, " +
      "retire l'élève de toutes les listes.";
    fin.appendChild(a);

    const bFiches = document.createElement('button');
    bFiches.className = 'btn btn-secondary';
    bFiches.style.cssText = 'padding:10px;font-size:13px;';
    bFiches.textContent = '🧹 Retirer de toutes les listes';
    bFiches.title = 'Fiche de suivi, messages en attente, cours préparés. Les bilans sont conservés.';
    bFiches.addEventListener('click', () => nettoyerDossierPermis(nom, false, bFiches));
    fin.appendChild(bFiches);

    /* Suppression totale — administrateurs uniquement */
    if(ACCES.role === 'admin'){
      const bTout = document.createElement('button');
      bTout.className = 'btn btn-secondary';
      bTout.style.cssText = 'margin-top:8px;padding:10px;font-size:13px;' +
        'color:var(--red);border-color:var(--red);';
      bTout.textContent = '🗑️ Supprimer toutes ses fiches' +
        (dossier.nb ? ' et ses ' + dossier.nb + ' bilan(s)' : '');
      bTout.addEventListener('click', () => nettoyerDossierPermis(nom, true, bTout, dossier.nb));
      fin.appendChild(bTout);
    }

    const etat = document.createElement('div');
    etat.id = 'permisNettoyage';
    etat.style.cssText = 'margin-top:10px;font-size:13px;min-height:18px;line-height:1.5;';
    fin.appendChild(etat);

    contenu.appendChild(fin);
  }

  if(dossier.ants) $('permisAnts').value = dossier.ants;
  if(dossier.boite) $('permisBoite').value = dossier.boite;
  $('permisAnts').addEventListener('change', rendre);
  $('permisBoite').addEventListener('change', rendre);
  rendre();
}


/* ============================================================
   CLÔTURE DU DOSSIER
   Deux niveaux : retirer des listes, ou tout effacer.
   ============================================================ */
async function nettoyerDossierPermis(nom, toutEffacer, bouton, nbBilans){
  const etat = $('permisNettoyage');
  const dire = (t, couleur) => {
    if(!etat) return;
    etat.style.color = couleur || 'var(--muted)';
    etat.textContent = t;
  };

  if(toutEffacer){
    if(!await confirmer('⚠️ SUPPRESSION DÉFINITIVE\n\n' +
        'Tout ce qui concerne ' + nom + ' va être effacé :\n' +
        (nbBilans ? '• ses ' + nbBilans + ' bilan(s)\n' : '') +
        '• sa fiche de suivi\n• ses captures de CEPC\n' +
        '• ses cours préparés et messages en attente\n\n' +
        'Cette action est IRRÉVERSIBLE. Continuer ?')) return;

    const saisi = await demander("Pour confirmer, recopie exactement le nom de l'élève :\n\n" + nom);
    if(saisi === null) return;
    if(normaliserMot(saisi) !== normaliserMot(nom)){
      await informer('Le nom saisi ne correspond pas. Suppression annulée.');
      return;
    }
  }else{
    if(!await confirmer('Retirer ' + nom + ' de toutes les listes de suivi ?\n\n' +
                        'Ses bilans et ses captures sont conservés.')) return;
  }

  bouton.disabled = true;
  const texteInitial = bouton.textContent;
  bouton.textContent = 'Nettoyage…';

  let faits = [];
  try{
    /* Les messages en attente ne doivent plus le faire réapparaître */
    dire('Messages en attente…');
    try{
      const d = await appelPrep({ action:'consigneList', eleve: nom });
      const enAttente = ((d && d.consignes) || []).filter(x => x.traite !== 'oui');
      for(const cs of enAttente){
        try{ await appelPrep({ action:'consigneDone', id: cs.id }); }catch(e){}
      }
      if(enAttente.length) faits.push(enAttente.length + ' message(s) soldé(s)');
    }catch(e){}

    /* Les cours préparés à son nom */
    dire('Cours préparés…');
    try{
      const d = await appelPrep({ action:'prepList' });
      const siens = ((d && d.preparations) || [])
        .filter(x => normaliserMot(x.eleve || '') === normaliserMot(nom));
      for(const pr of siens){
        try{ await appelPrep({ action:'prepDelete', id: pr.id }); }catch(e){}
      }
      if(siens.length) faits.push(siens.length + ' cours préparé(s) retiré(s)');
    }catch(e){}

    /* La fiche de suivi */
    dire('Fiche de suivi…');
    try{
      await appelPrep({ action:'suiviDelete', eleve: nom });
      faits.push('fiche de suivi supprimée');
    }catch(e){}

    if(toutEffacer){
      /* Les captures du CEPC */
      dire('Captures du CEPC…');
      try{
        const d = await appelPrep({ action:'captureList', eleve: nom });
        const caps = (d && d.captures) || [];
        for(const cap of caps){
          try{ await appelPrep({ action:'captureDelete', id: cap.id }); }catch(e){}
        }
        if(caps.length) faits.push(caps.length + ' capture(s) supprimée(s)');
      }catch(e){}

      /* Les bilans */
      dire('Bilans…');
      try{
        const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'supprimerEleve', code: ACCES.code, eleve: nom })
        }, 25000, 2);
        if(r.ok) faits.push('bilans supprimés');
      }catch(e){}
    }

    viderCaches(nom);
    dire('✅ ' + nom + ' — ' + (faits.join(' · ') || 'rien à retirer'), 'var(--accent-text)');

    /* Le module se remet à zéro : le dossier est clos */
    setTimeout(() => {
      if($('permisNom')) $('permisNom').value = '';
      if($('permisNomManuel')) $('permisNomManuel').value = '';
      const z = $('permisResultat');
      if(z){
        z.innerHTML = '<div class="empty">✅ Dossier de ' +
          nom.replace(/</g, '&lt;') + ' clôturé.<br>' +
          '<span style="font-size:12px;">Aucun élève en cours.</span></div>';
      }
      chargerEleves();
      if(typeof afficherBureau === 'function') afficherBureau(true);
    }, 1600);

  }catch(e){
    dire('Erreur : ' + e.message, 'var(--warn-text)');
    bouton.disabled = false;
    bouton.textContent = texteInitial;
  }
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-permis.js'] = true;
