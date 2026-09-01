/* Déployé le 01/09/2026 à 15:10 — v776 */
/* ============================================================
   ec-depart.js
   Départ de l'auto-école et administration des accès
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Branche un gestionnaire sans faire tomber le reste du fichier
   si l'élément a disparu de la page. */
function brancher(id, evenement, action){
  const el = document.getElementById(id);
  /* Un écran qui n'a pas ce champ n'est pas une anomalie : le
     signaler à chaque chargement noyait les vraies erreurs. */
  if(!el) return null;
  el.addEventListener(evenement, action);
  return el;
}


/* ============================================================
   DÉPART DE L'AUTO-ÉCOLE
   Même principe que « permis obtenu » : liste de tâches,
   message prêt à envoyer, puis retrait des listes de suivi.
   ============================================================ */
const MOTIFS_DEPART = {
  'autre-ae':      'transfert vers une autre auto-école',
  'demenagement':  'déménagement',
  'arret':         'arrêt de la formation',
  'financier':     'motif financier',
  'sansnouvelles': "sans nouvelles de l'élève",
  'autre':         'autre motif'
};

const TACHES_DEPART = [
  ['Retirer des groupes Facebook (sauf le général)',
   'Facebook > Ouvrir tous les groupes avec la molette > Membres > 🔍 Nom de l\'élève > ... > Supprimer'],
  ['Clôturer le dossier sur Drivup', 'Profil > Formule & Permis'],
  ['Vérifier le solde du compte élève', 'Régularisation ou remboursement selon le cas'],
  ['Annuler les réservations à venir sur le planning', ''],
  ['Retirer des listes de suivi permis', 'Fait automatiquement ci-dessous'],
  ['Enpc-center : désactiver les accès', ''],
  ['Archiver le dossier papier', '']
];

const TACHES_TRANSFERT = [
  ['Éditer le certificat de fin de formation / attestation de suivi', ''],
  ['Transmettre le dossier ANTS à la nouvelle auto-école', ''],
  ['Restituer les pièces du dossier à l\'élève', ''],
  ['Établir le solde de tout compte', '']
];

const MSG_DEPART = "Bonjour,\n\n" +
  "Nous prenons acte de la fin de ta formation chez Évolution Conduites.\n\n" +
  "Ton dossier est clôturé. Si tu as besoin d'une attestation de suivi de formation " +
  "ou du transfert de ton dossier ANTS, dis-le nous, nous préparons cela rapidement.\n\n" +
  "Nous te souhaitons une bonne continuation, et la route reste ouverte si tu " +
  "souhaites revenir un jour 🤝\n\n" +
  "Évolution Conduites";

async function preparerDepart(){
  const nom = $('departNom').value.trim();
  const motif = $('departMotif').value;
  const date = $('departDate').value;
  const zone = $('departResultat');

  if(nom.length < 2){
    zone.innerHTML = '<div class="empty">Saisis le nom de l\'élève.</div>';
    return;
  }

  const btn = $('departBtn');
  btn.disabled = true;
  btn.textContent = 'Recherche…';
  zone.innerHTML = '<div class="empty">Récupération du dossier…</div>';

  let nb = 0;
  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nom, leger: true })
    }, 15000, 2);
    if(r.ok){
      const d = await r.json().catch(() => ({}));
      nb = ((d && d.resultats) || []).length;
    }
  }catch(e){ /* on continue sans le compte */ }

  btn.disabled = false;
  btn.textContent = '🚪 Préparer le départ';

  zone.innerHTML = '';
  const tete = document.createElement('div');
  tete.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.6;';
  tete.innerHTML = '<strong style="color:var(--cream);font-size:15px;">' +
    nom.replace(/</g,'&lt;') + '</strong><br>' +
    'Départ pour ' + MOTIFS_DEPART[motif] +
    (date ? ' · le ' + dateEnToutesLettres(date) : '') + '<br>' +
    nb + ' bilan(s) enregistré(s)';
  zone.appendChild(tete);

  /* Message à envoyer */
  zone.appendChild(blocCopiable('Message à l\'élève', MSG_DEPART));

  /* Liste de tâches, enrichie pour un transfert */
  const taches = TACHES_DEPART.slice();
  if(motif === 'autre-ae'){
    TACHES_TRANSFERT.forEach(t => taches.unshift(t));
  }

  /* ------------------------------------------------------------
     LA CHECK-LIST SE GARDE, MAINTENANT.

     Ces cases ne vivaient QUE dans la page. Rechargée — un
     téléphone qui se verrouille, un onglet fermé — la liste
     repartait vierge, et le bureau recochait de mémoire ou
     refaisait une démarche déjà faite. Un dossier ANTS transmis
     deux fois, ce n'est pas rien.

     Elles ne peuvent pas vivre dans la fiche de suivi : le bouton
     juste en dessous l'efface. Elles ont leur propre feuille.
     ------------------------------------------------------------ */
  const bloc = document.createElement('div');
  bloc.style.cssText = 'margin-top:20px;padding-top:16px;border-top:1px solid var(--line);';
  bloc.innerHTML = '<div style="font-size:13px;font-weight:700;color:var(--accent-text);' +
    'margin-bottom:10px;">✅ À faire au bureau</div>';

  const etatTaches = document.createElement('div');
  etatTaches.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;' +
    'margin-bottom:8px;';
  etatTaches.textContent = 'Lecture de ce qui est déjà fait…';
  bloc.appendChild(etatTaches);

  const cases = [];
  taches.forEach(t => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 0;' +
      'border-bottom:1px solid var(--line);text-transform:none;margin:0;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.style.cssText = 'width:19px;height:19px;flex-shrink:0;margin-top:2px;';
    cb.dataset.tache = t[0];
    const txt = document.createElement('div');
    txt.innerHTML = '<div style="font-size:15px;color:var(--cream);line-height:1.4;">' +
      t[0].replace(/</g,'&lt;') + '</div>' +
      (t[1] ? '<div style="font-size:12px;color:var(--muted);line-height:1.4;margin-top:2px;">' +
        t[1].replace(/</g,'&lt;') + '</div>' : '');
    l.appendChild(cb); l.appendChild(txt);
    bloc.appendChild(l);
    cases.push(cb);
  });
  zone.appendChild(bloc);

  /* Ce qui était déjà coché la dernière fois. */
  (async () => {
    try{
      const d = await appelPrep({ action: 'departTachesList', eleve: nom });
      const faites = (d && d.faites) || [];
      cases.forEach(cb => { cb.checked = faites.indexOf(cb.dataset.tache) !== -1; });
      etatTaches.textContent = faites.length
        ? faites.length + ' déjà fait(s)' +
          (d.quand ? ' · dernière mise à jour le ' + d.quand : '') +
          (d.par ? ' par ' + d.par : '')
        : 'Rien de coché pour le moment. Les cases sont gardées.';
    }catch(e){
      /* NE PAS FAIRE SEMBLANT. Des cases vides parce qu'on n'a rien
         pu lire ressemblent exactement à des cases vides parce que
         rien n'est fait — et c'est justement ce qu'on répare. */
      etatTaches.innerHTML = '⚠️ <strong>Impossible de relire ce qui est ' +
        'déjà fait.</strong> Les cases ci-dessous ne veulent rien dire tant ' +
        'que ce message est là.';
      etatTaches.style.color = 'var(--warn-text)';
    }
  })();

  /* Chaque clic part au classeur, et le dit s'il n'y arrive pas. */
  let enregistrement = null;
  cases.forEach(cb => cb.addEventListener('change', () => {
    clearTimeout(enregistrement);
    enregistrement = setTimeout(async () => {
      const faites = cases.filter(c => c.checked).map(c => c.dataset.tache);
      try{
        await appelPrep({ action: 'departTachesSet', eleve: nom, faites: faites });
        etatTaches.style.color = 'var(--muted)';
        etatTaches.textContent = faites.length
          ? faites.length + ' fait(s) · enregistré ✅'
          : 'Rien de coché · enregistré ✅';
      }catch(e){
        etatTaches.style.color = 'var(--warn-text)';
        etatTaches.innerHTML = '⚠️ <strong>Non enregistré</strong> — ' +
          echapper(e.message) + '. Recoche une case pour réessayer.';
      }
    }, 400);
  }));

  /* Retrait des listes de suivi */
  const actions = document.createElement('div');
  actions.style.cssText = 'margin-top:18px;padding-top:16px;border-top:1px solid var(--line);';

  const bSuivi = document.createElement('button');
  bSuivi.className = 'btn btn-secondary';
  bSuivi.textContent = '🧹 Retirer de toutes les listes de suivi';
  bSuivi.addEventListener('click', async () => {
    if(!await confirmer('Retirer ' + nom + ' de toutes les listes de suivi ?\n\n' +
                'Ses bilans sont conservés.')) return;
    bSuivi.disabled = true;
    try{
      const d = await appelPrep({ action:'consigneList', eleve: nom });
      /* CHAQUE ÉCHEC SE COMPTE. Ces consignes étaient marquées
         traitées dans une boucle qui avalait tout : une seule qui
         rate, et le message annonçait quand même « retiré des
         listes » pendant que l'élève y restait. */
      let ratees = 0;
      for(const cs of ((d && d.consignes) || [])){
        if(cs.traite !== 'oui'){
          try{ await appelPrep({ action:'consigneDone', id: cs.id }); }
          catch(e){ ratees++; }
        }
      }
      await appelPrep({ action:'suiviDelete', eleve: nom });
      if(ratees){
        showToast('⚠️ Fiche retirée, mais ' + ratees + ' message(s) en ' +
                  'attente n\'ont pas pu être classés — ils reviendront.');
        bSuivi.textContent = '⚠️ Retiré, ' + ratees + ' message(s) restés';
      }else{
        showToast(nom + ' retiré des listes ✅');
        bSuivi.textContent = '✅ Retiré des listes';
      }
    }catch(e){
      showToast('Erreur : ' + e.message);
      bSuivi.disabled = false;
    }
  });
  /* Ce bouton détruit la fiche de suivi entière — date d'examen,
     heures, examen blanc, paiements. Dans les listes, on déplace
     plutôt qu'on ne détruit ; ici, il reste pour un élève qui
     quitte vraiment l'auto-école. */
  if(ACCES.role === 'admin') actions.appendChild(bSuivi);

  /* Suppression complète, administrateurs seulement */
  if(ACCES.role === 'admin' && nb > 0){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'margin-top:8px;color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️ Supprimer les ' + nb + ' bilan(s) de ' + nom;
    bSup.addEventListener('click', () => {
      eleveAffiche = nom;
      nbBilansAffiches = nb;
      /* Son propre bouton : c'est lui qu'il faut désactiver, et
         c'est près de lui que le résultat doit s'écrire. */
      supprimerDossierEleve(bSup);
    });
    actions.appendChild(bSup);
  }

  zone.appendChild(actions);
}

/* ---------- Suppression du dossier d'un élève ---------- */
/* eleveAffiche : déclaré dans ec-etat.js */
/* nbBilansAffiches : déclaré dans ec-etat.js */

function majZoneSuppression(){
  const zone = $('zoneSuppression');
  if(!zone) return;
  /* Réservée aux administrateurs, et seulement si des bilans sont affichés */
  zone.style.display = (ACCES.role === 'admin' && eleveAffiche && nbBilansAffiches > 0)
    ? 'block' : 'none';
  const msg = $('suppressionMsg');
  if(msg) msg.textContent = '';
  const btn = $('supprimerEleveBtn');
  if(btn && eleveAffiche){
    btn.textContent = '🗑️ Supprimer les ' + nbBilansAffiches + ' bilan(s) de ' + eleveAffiche;
  }
}

async function supprimerDossierEleve(bouton){
  if(!eleveAffiche) return;

  /* Première confirmation */
  if(!await confirmer('⚠️ SUPPRESSION DÉFINITIVE\n\n' +
              'Tous les bilans de ' + eleveAffiche + ' (' + nbBilansAffiches + ') vont être effacés.\n\n' +
              'Cette action est IRRÉVERSIBLE : ni toi ni personne ne pourra les récupérer.\n\n' +
              'Continuer ?')) return;

  /* Seconde confirmation : le nom doit être retapé */
  const saisi = await demander('Pour confirmer, recopie exactement le nom de l\'élève :\n\n' + eleveAffiche);
  if(saisi === null) return;
  if(normaliserMot(saisi) !== normaliserMot(eleveAffiche)){
    await informer('Le nom saisi ne correspond pas. Suppression annulée.');
    return;
  }

  /* ------------------------------------------------------------
     LE BOUTON QUI A ÉTÉ APPUYÉ, PAS UN AUTRE.

     Cette fonction prenait toujours le bouton et le cadre de
     l'écran « Recherche ». Appelée depuis « Préparer le départ »,
     elle écrivait donc son compte rendu dans un élément MASQUÉ :
     un échec ne se voyait pas, et on croyait les bilans effacés.
     Et le vrai bouton n'étant jamais désactivé, un second appui
     relançait une suppression définitive.
     ------------------------------------------------------------ */
  const btn = bouton || $('supprimerEleveBtn');
  const msg = $('suppressionMsg');
  const libelle = btn ? btn.textContent : '';
  if(btn){ btn.disabled = true; btn.textContent = 'Suppression…'; }

  /* Quand le compte rendu ne peut pas s'afficher — l'autre écran —
     il se dit à voix haute plutôt que dans le vide. */
  const dire = (texte, rate) => {
    if(msg && msg.offsetParent !== null){
      msg.style.color = rate ? 'var(--warn-text)' : 'var(--accent-text)';
      msg.textContent = texte;
    }else if(rate){
      informer(texte, 'Suppression');
    }
    if(rate) showToast('⚠️ ' + texte);
  };

  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'supprimerEleve', code: ACCES.code, eleve: eleveAffiche })
    });
    const data = await r.json().catch(() => ({}));
    if(!r.ok || data.error) throw new Error(data.error || ('HTTP ' + r.status));

    dire('✅ ' + (data.supprimees || 0) + ' bilan(s) supprimé(s) définitivement.');
    showToast('Dossier supprimé ✅');

    $('searchResults').innerHTML = '<div class="empty">Dossier supprimé.</div>';
    eleveAffiche = '';
    nbBilansAffiches = 0;
    $('zoneSuppression').style.display = 'none';
    chargerEleves();
  }catch(e){
    dire('Suppression impossible : ' + e.message, true);
  }finally{
    if(btn){ btn.disabled = false; btn.textContent = libelle; }
  }
}

/* La suppression des bilans, dans l'historique : réservée aux
   administrateurs, c'est irrémédiable.

   Le rôle n'est connu qu'après la connexion : on branche le
   bouton et on décide de l'afficher au moment voulu. */
brancher('supprimerEleveBtn', 'click',
         () => supprimerDossierEleve($('supprimerEleveBtn')));

function majBoutonSuppressionHistorique(){
  const b = $('supprimerEleveBtn');
  if(!b) return;
  b.style.display = (ACCES.role === 'admin') ? '' : 'none';
}
brancher('bureauBtn', 'click', () => afficherBureau());
brancher('filtrePP', 'change', () => afficherBureau());
brancher('filtrePermis', 'change', () => afficherBureau());
brancher('filtreDate', 'change', () => afficherBureau());
brancher('msgBtn', 'click', envoyerMessageBureau);
brancher('addBtn', 'click', ajouterDateBureau);
brancher('addEtat', 'change', () => {
  const avecDate = ($('addEtat').value === 'date');
  $('addZoneDate').style.display = avecDate ? 'block' : 'none';
  $('addBtn').textContent = avecDate ? '📅 Enregistrer la date' : '📌 Enregistrer';
});
brancher('permisBtn', 'click', preparerPermis);
brancher('departBtn', 'click', preparerDepart);
if($('departDate')) $('departDate').value = todayLocal();
brancher('permisNom', 'change', preparerPermis);

/* L'alerte de version ne se montre qu'une fois par session : elle
   revenait à chaque recherche, et une alerte qu'on apprend à fermer
   sans lire ne protège plus de rien. */
let versionDejaSignalee = false;

/* Vérifie que le script Google déployé est bien à jour.

   Une réponse SANS versionScript ne vient pas d'Apps Script : c'est
   le Worker qui a répondu par l'API Sheets directe. Il ne sait pas
   quelle version est déployée dans la feuille, et son silence ne
   veut pas dire « script préhistorique ». Sans cette distinction,
   toute opération portée sur l'API — la recherche la première —
   déclenchait l'alerte alors que le script était à jour. */
async function verifierVersionScript(reponse){
  if(!reponse || reponse.versionScript === undefined ||
     reponse.versionScript === null || reponse.versionScript === ''){
    return true;
  }

  const v = Number(reponse.versionScript) || 0;
  if(v >= CONFIG.VERSION_SCRIPT_ATTENDUE) return true;

  if(versionDejaSignalee) return false;
  versionDejaSignalee = true;

  await informer(
    "⚠️ Le script Google Sheets n'est pas à jour.\n\n" +
    'Version déployée : ' + (v ? 'v' + v : 'antérieure à v21') + '\n' +
    'Version attendue : v' + CONFIG.VERSION_SCRIPT_ATTENDUE + '\n\n' +
    "La note interne et l'heure ne peuvent pas être enregistrées.\n\n" +
    'Dans la feuille : Extensions > Apps Script, colle le nouveau code, ' +
    'puis Déployer > Gérer les déploiements > crayon ✏️ > Nouvelle version > Déployer.'
  );
  return false;
}


/* Où en est l'élève dans son parcours, d'après son dernier bilan
   et les consignes du bureau encore en attente. */
function etapesEleve(note, consignes){
  const t = String(note || '') + ' · ' + (consignes || []).map(x => x.texte).join(' · ');
  const a = analyserNote(t);
  const etapes = [];

  if(a.repassages){
    etapes.push({ ok:false, txt: '🔁 ' + a.repassages +
      (a.repassages === 1 ? 'er' : 'e') + ' repassage' +
      (a.dateAjournement ? ' — ajourné le ' + a.dateAjournement : '') });
  }

  if(a.lecon){
    etapes.push({ ok:true, txt: a.lecon + (a.lecon === 1 ? 'ère' : 'ème') + ' leçon' +
      (a.leconTotal ? ' sur ' + a.leconTotal : '') + (a.friseDepassee ? ' — frise dépassée' : '') });
  }

  if(a.simuNuit === 'fait') etapes.push({ ok:true, txt:'Simulateur nuit et risques fait' });
  else if(a.simuNuit === 'prevu') etapes.push({ ok:null, txt:'Simulateur nuit et risques prévu' });
  else if(a.simuNuit === 'aprevoir') etapes.push({ ok:false, txt:'Simulateur nuit et risques à prévoir' });

  if(a.examBlanc === 'passe') etapes.push({ ok:true, txt:'Examen blanc passé' });
  else if(a.examBlanc === 'reserve'){
    etapes.push({ ok:null, txt:'Examen blanc réservé' +
      (a.examBlancDate ? ' le ' + a.examBlancDate
        : (a.examBlancN !== null ? ' dans ' + a.examBlancN + ' leçon(s)' : '')) });
  }
  else if(a.examBlanc === 'aprevoir'){
    etapes.push({ ok:false, txt:'Examen blanc à prévoir' +
      (a.examBlancN !== null ? ' dans ' + a.examBlancN + ' leçon(s)' : '') });
  }
  else if(a.examBlanc === 'impossible') etapes.push({ ok:false, txt:'Examen blanc non planifiable' });

  if(a.permis === 'prevu'){
    etapes.push({ ok:true, txt:'Examen du permis prévu' + (a.permisDate ? ' le ' + a.permisDate : '') +
      (a.permisN !== null ? ' — encore ' + a.permisN + ' leçon(s)' : '') });
  }
  else if(a.permis === 'annule') etapes.push({ ok:false, txt:'Examen du permis annulé' });
  else if(a.permis === 'aprevoir') etapes.push({ ok:false, txt:'Date d\'examen à prévoir' });

  if(a.pasEcoute) etapes.push({ ok:true, txt:"Pas d'écoutes pédagogiques" });
  return etapes;
}

/* Encadré « où en est cet élève » */
function blocParcours(eleve, note, consignes){
  const etapes = etapesEleve(note, consignes);
  if(!etapes.length) return null;

  const d = document.createElement('div');
  d.style.cssText = 'background:var(--navy);border:1px solid var(--line);border-radius:10px;' +
    'padding:12px;margin-bottom:12px;font-size:14px;line-height:1.8;';
  d.innerHTML = '<div style="font-weight:700;margin-bottom:6px;">📍 Où en est ' +
    eleve.replace(/</g,'&lt;') + '</div>' +
    etapes.map(e => {
      const icone = (e.ok === true) ? '✅' : (e.ok === false ? '⏳' : '📌');
      const couleur = (e.ok === true) ? 'var(--accent-text)'
                    : (e.ok === false ? 'var(--warn-text)' : 'var(--cream)');
      return '<div style="color:' + couleur + ';">' + icone + ' ' +
             e.txt.replace(/</g,'&lt;') + '</div>';
    }).join('');
  return d;
}

/* ---------- Recherche des anciens bilans d'un élève ---------- */
async function rechercherEleve(){
  const nom = $('searchName').value.trim();
  const moniteur = $('searchMoniteur') ? $('searchMoniteur').value : '';
  const site = $('searchSite') ? $('searchSite').value : '';
  const zone = $('searchResults');

  if(nom.length < 2 && !moniteur){
    zone.innerHTML = '<div class="empty">Saisis un nom d\'élève ou choisis un moniteur.</div>';
    return;
  }
  const btn = $('searchBtn');
  btn.disabled = true;
  btn.textContent = 'Recherche…';
  zone.innerHTML = '<div class="empty">Recherche en cours…</div>';
  try{
    /* Les messages en attente ne dépendent pas du résultat de la
       recherche : on les demande en même temps plutôt qu'après.
       Chaque appel à Google coûte plusieurs secondes de démarrage. */
    const promesseConsignes = (nom.length >= 2)
      ? appelPrep({ action: 'consigneList', eleve: nom }).catch(() => null)
      : Promise.resolve(null);

    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code,
                             eleve: nom, moniteur: moniteur, site: site })
    });
    if(r.status === 403){
      verrouiller('Session expirée, saisis ton code à nouveau.');
      return;
    }
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    /* On avertit, mais on affiche quand même : l'historique se lit
       très bien avec un script en retard, et cacher les bilans du
       moniteur pour un défaut de déploiement le punit pour rien.
       Le blocage n'a de sens qu'à l'enregistrement. */
    await verifierVersionScript(data);
    const res = (data && data.resultats) || [];
    if(!res.length){
      zone.innerHTML = '<div class="empty">' +
        (nom.length >= 2
          ? 'Aucun bilan trouvé pour cet élève' + (moniteur ? ' avec ce moniteur' : '') +
            '.<br>Vérifie que le nom et le prénom sont écrits comme lors des cours précédents.'
          : 'Aucun bilan trouvé pour ce moniteur.') + '</div>';
      eleveAffiche = '';
      nbBilansAffiches = 0;
      majZoneSuppression();
      return;
    }

    /* On repart d'une zone vide avant d'empiler les blocs */
    zone.innerHTML = '';

    /* La suppression de dossier ne concerne qu'une recherche par élève */
    eleveAffiche = (nom.length >= 2 && res[0]) ? res[0].eleve : '';
    nbBilansAffiches = (nom.length >= 2) ? res.length : 0;
    majZoneSuppression();

    /* Recherche par élève : on résume son parcours */
    if(nom.length >= 2 && res[0]){
      let enAttente = [];
      try{
        const cd = await promesseConsignes;
        enAttente = ((cd && cd.consignes) || [])
          .filter(y => y.traite !== 'oui' && y.type !== 'urgence');
      }catch(e){}
      const p = blocParcours(res[0].eleve, res[0].note, enAttente);
      if(p) zone.appendChild(p);

      /* Ses procédures récitées : elles font partie de son parcours
         au même titre que ses cours. */
      const zProc = document.createElement('div');
      zone.appendChild(zProc);
      afficherProceduresEleve(res[0].eleve, zProc);
    }

    /* Recherche par moniteur : on annonce le nombre d'élèves distincts */
    if(nom.length < 2){
      const eleves = [];
      res.forEach(x => {
        const k = normaliserMot(x.eleve || '');
        if(k && eleves.indexOf(k) === -1) eleves.push(k);
      });
      const entete = document.createElement('div');
      entete.style.cssText = 'padding:10px 12px;margin-bottom:10px;background:var(--navy);' +
        'border:1px solid var(--line);border-radius:10px;font-size:14px;';
      entete.innerHTML = '<strong>' + moniteur + '</strong> — ' + res.length +
        ' bilan(s) pour ' + eleves.length + ' élève(s)' +
        (res.length >= 200 ? ' <span style="color:var(--warn-text);">(200 plus récents)</span>' : '');
      zone.appendChild(entete);
    }

    res.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item';
      const meta = document.createElement('div');
      meta.className = 'meta';
      const note = (item.note || '').trim();
      const t = document.createElement('strong');
      if(!nom || nom.length < 2){
        /* Recherche par moniteur : on met l'élève en avant */
        t.textContent = item.eleve || '(sans nom)';
      }else if(note){
        /* La note interne prend la place du titre : c'est ce que le
           moniteur suivant doit voir en premier, en entier. */
        if(typeof colorerNote === 'function'){
          t.appendChild(document.createTextNode('📌 '));
          const dedans = document.createElement('span');
          colorerNote(dedans, note);
          t.appendChild(dedans);
        }else{
          t.textContent = '📌 ' + note;
        }
        t.style.color = 'var(--accent-text)';
        t.style.whiteSpace = 'pre-wrap';
        t.style.lineHeight = '1.45';
        t.style.overflow = 'visible';
        t.style.textOverflow = 'clip';
      }else{
        t.textContent = item.type || 'Bilan';
      }
      const s = document.createElement('span');
      s.textContent = 'Cours du ' + (item.date || '?') +
                      [' ', item.site, item.moniteur, note ? item.type : '']
                        .filter(Boolean).join(' · ');

      const h = document.createElement('span');
      h.style.opacity = '.75';
      h.textContent = item.horodatage ? 'Bilan généré le ' + item.horodatage : '';

      meta.appendChild(t);
      meta.appendChild(s);
      if(item.horodatage) meta.appendChild(h);
      row.appendChild(meta);

      /* Supprimer un bilan : administrateurs seuls, et jamais par
         mégarde. Le numéro de leçon se recalcule tout seul, il se
         déduit du nombre de bilans restants. */
      if(ACCES.role === 'admin' && item.ligne){
        const bSup = document.createElement('button');
        bSup.className = 'btn btn-secondary';
        bSup.style.cssText = 'width:auto;padding:6px 10px;font-size:12px;margin:0;' +
          'flex-shrink:0;color:var(--red);border-color:var(--red);';
        bSup.textContent = '🗑️';
        bSup.title = 'Supprimer ce bilan';
        bSup.addEventListener('click', async ev => {
          ev.stopPropagation();
          if(!await confirmer('Supprimer le bilan du ' + (item.date || '?') +
              ' pour ' + item.eleve + ' ?\n\n' +
              'Cette suppression est DÉFINITIVE : le texte du bilan et sa note ' +
              'seront perdus.\n\nLes leçons suivantes seront renumérotées.')) return;

          bSup.disabled = true;
          bSup.textContent = '…';
          try{
            await appelPrep({ action: 'bilanSupprimer', ligne: item.ligne,
                              eleve: item.eleve });
            showToast('Bilan supprimé ✅');
            viderCaches(item.eleve);
            rechercherEleve();
          }catch(e){
            showToast('Suppression impossible : ' + e.message);
            bSup.disabled = false;
            bSup.textContent = '🗑️';
          }
        });
        row.appendChild(bSup);
      }

      const arrow = document.createElement('div');
      arrow.className = 'arrow';
      arrow.textContent = '›';
      row.appendChild(arrow);
      row.addEventListener('click', () => {
        currentLessonMeta = {
          modeleLabel: item.type, studentName: item.eleve, monitorName: item.moniteur,
          site: item.site, dateStr: item.date, noteInterne: item.note || '', ts: Date.now(),
          /* On retient d'où il vient : le corriger doit le remplacer,
             pas en créer un second. */
          ligne: item.ligne || null
        };
        $('resultText').value = item.bilan;
        afficherNote(item.note);
        marquerExport(true);

        /* Une fiche d'évaluation retrouve ses sorties : le PDF pour
           le dossier ou la préfecture, et l'envoi par mail. Sans
           cela, il fallait refaire la fiche pour ravoir son PDF. */
        if(typeof majBoutonsHandicap === 'function') majBoutonsHandicap();

        /* Le bilan appartient à l'onglet Cours : depuis la recherche,
           il restait masqué par la classe « hors-onglet ». */
        if(typeof afficherOnglet === 'function') afficherOnglet('cours');

        $('recordView').style.display = 'none';
        $('generatingView').style.display = 'none';
        $('resultView').style.display = 'block';
    /* Les procédures à cocher, prêtes dès l'affichage du bilan */
    if(typeof remplirListeRecitations === 'function') remplirListeRecitations();
        $('resultView').classList.remove('hors-onglet', 'hors-vue');
        majBoutonCorrection();
        /* Le bilan est en bas de l'onglet : on y amène l'écran plutôt
           que de laisser le moniteur le chercher. */
        setTimeout(() => {
          try{ $('resultView').scrollIntoView({ behavior:'smooth', block:'start' }); }
          catch(e){ window.scrollTo(0, $('resultView').offsetTop - 10); }
        }, 120);
      });
      zone.appendChild(row);
    });
  }catch(e){
    console.error('Erreur recherche:', e);
    zone.innerHTML = '<div class="empty">Erreur de recherche : ' + e.message + '</div>';
  }finally{
    btn.disabled = false;
    btn.textContent = '🔍 Rechercher';
  }
}

brancher('searchBtn', 'click', rechercherEleve);
brancher('searchMoniteur', 'change', rechercherEleve);
brancher('searchSite', 'change', rechercherEleve);
brancher('searchName', 'input', () => verifierNomEleve('searchName', 'eleveInfo', false));
brancher('searchName', 'change', () => { verifierNomEleve('searchName', 'eleveInfo', false); rechercherEleve(); });
brancher('studentName', 'input', () => {
  verifierNomEleve('studentName', 'studentInfo', true);
  planifierHistorique();
});
brancher('studentName', 'change', () => {
  verifierNomEleve('studentName', 'studentInfo', true);
  chargerHistoriqueEleve();       /* choix dans la liste : immédiat */
});
brancher('searchName', 'keydown', e => { if(e.key === 'Enter') rechercherEleve(); });

/* Remise à zéro pour le cours suivant. Appelée par le bouton
   TERMINER et par « Copier, enregistrer et terminer ». */
async function terminerCours(){
  /* Quitter sans enregistrer se confirme : c'est une perte sèche */
  if(!bilanEnregistre && $('resultText') && $('resultText').value.trim() &&
     !await confirmer('Ce bilan n a pas été enregistré.\n\nQuitter quand même ? Il sera perdu.')) return;

  /* Une séance à plusieurs : on enchaîne sur l'élève suivant
     plutôt que de tout remettre à zéro. */
  if(typeof postes !== 'undefined' && postes.length && bilanEnregistre){
    if(typeof posteTermine === 'function'){
      posteTermine();
      return;
    }
  }

  finalTranscript = '';
  committedTranscript = '';
  interruptions = 0;
  contexteDepart = null;
  prepareEnCours = null;
  noteQuestionnaire = '';
  dernierMot = 0;
  dernierEvenement = '—';
  libererEcran();
  $('etatMicro').textContent = '';
  $('pauseWarn').style.display = 'none';
  $('transcriptBox').value = '';
  $('transcriptBox').style.display = 'none';
  $('transcriptAide').style.display = 'none';
  $('compteur').style.display = 'none';
  effacerSauvegarde();
  $('studentName').value = '';
  verifierNomEleve('studentName', 'studentInfo', true);
  $('noteInterne').value = '';
  if(typeof majAffichageNoteInterne === 'function') majAffichageNoteInterne();
  afficherNote('');

  /* Les blocs du cours précédent : sans ça, le dossier et la
     préparation de l'élève d'avant restaient affichés sous un
     champ vide, et le moniteur suivant pouvait s'y fier. */
  ['historiqueEleve', 'preparationEleve', 'saisieDuJour',
   'enteteCours', 'ficheCours'].forEach(id => {
    const z = $(id);
    if(!z) return;
    z.innerHTML = '';
    z.style.display = 'none';
  });
  if($('eleveMessenger')) $('eleveMessenger').value = '';
  ['modele','monitorName','studentName','site','lessonDate'].forEach(id => { $(id).disabled = false; });
  $('lessonDate').value = todayLocal();
  $('recBtn').textContent = '🎙️ Démarrer le cours';
  $('status').textContent = "Appuie pour lancer l'enregistrement en début de cours.";
  /* Le bilan du cours précédent et son état d'enregistrement : ils
     restaient affichés et pouvaient être renvoyés par erreur. */
  if($('resultText')) $('resultText').value = '';
  if($('finEtat')) $('finEtat').textContent = '';
  if($('genErrorDetail')) $('genErrorDetail').remove();
  if($('corrigerBtn')) $('corrigerBtn').style.display = 'none';
  if($('corrigerLecon')) $('corrigerLecon').style.display = 'none';
  if($('btnImageCepc')) $('btnImageCepc').remove();

  /* Le menu des procédures repart vide */
  if($('ajoutProcedure')) $('ajoutProcedure').value = '';

  $('finishBtn').style.display = 'none';
  $('resultView').style.display = 'none';
  $('recordView').style.display = 'block';
  /* Le bilan manuel redevient proposé : masqué pendant le cours,
     il doit revenir pour le suivant. */
  /* Les récitations cochées appartiennent au cours qui se termine */
  document.querySelectorAll('.recitDemande').forEach(cb => { cb.checked = false; });
  if($('tiroirRecitations')) $('tiroirRecitations').open = false;

  if($('zoneManuel')) $('zoneManuel').style.display = 'block';

  /* Le type de bilan repart sur une conduite : garder « examen
     blanc » d'un cours à l'autre laissait le micro masqué et
     imposait un bilan manuel au cours suivant. */
  const selM = $('modele');
  if(selM && MODELES_SANS_VOCAL.indexOf(selM.value) !== -1){
    const conduite = [...selM.options].find(o =>
      o.value === 'conduite-manuelle' || o.value === 'conduite-auto');
    if(conduite) selM.value = conduite.value;
  }

  /* Le micro revient s'il avait été masqué */
  if(typeof adapterAuModele === 'function') adapterAuModele();
  const d = $('genErrorDetail');
  if(d) d.remove();
}

brancher('newLessonBtn', 'click', terminerCours);

/* ---------- Historique ---------- */
async function saveLesson(meta, bilanText){
  try{
    await window.storage.set('bilan:' + meta.ts, JSON.stringify(Object.assign({}, meta, { text: bilanText })), false);
  }catch(e){ console.error('save failed', e); }
}

/* L'historique des procédures d'un élève : ce qu'on lui a demandé,
   ce qu'il a récité, ce qui a été corrigé. */
async function afficherProceduresEleve(nom, zone){
  if(!zone || !nom) return;

  let recits = [], demandes = [];
  try{
    const [a, b] = await Promise.all([
      appelPrep({ action: 'recitationsList' }).catch(() => null),
      appelPrep({ action: 'demandesList', eleve: nom }).catch(() => null)
    ]);
    recits = ((a && a.recitations) || [])
      .filter(x => normaliserMot(x.eleve || '') === normaliserMot(nom));
    demandes = ((b && b.demandes) || []).filter(x => x.etat !== 'fait');
  }catch(e){ return; }

  if(!recits.length && !demandes.length) return;

  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:10px 12px;margin-bottom:14px;';
  d.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:700;' +
    'color:var(--accent-text);">🎙️ Procédures — ' + recits.length +
    ' récitée(s)' + (demandes.length ? ' · ' + demandes.length + ' en attente' : '') +
    '</summary>';

  const z = document.createElement('div');
  z.style.marginTop = '10px';

  /* Ce qu'on attend encore de lui */
  demandes.forEach(x => {
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:8px;align-items:flex-start;padding:6px 0;' +
      'font-size:13px;line-height:1.5;';
    l.innerHTML = '<span style="flex-shrink:0;">⏳</span>' +
      '<span style="flex:1;min-width:0;">' +
        (x.procedure || '').replace(/</g, '&lt;') +
        '<span style="color:var(--warn-text);font-size:11px;"> — pas encore ' +
        'récitée</span><div style="font-size:11px;color:var(--muted);">' +
        'demandée le ' + (x.demandeLe || '').replace(/</g, '&lt;') +
        (x.par ? ' par ' + x.par.replace(/</g, '&lt;') : '') + '</div></span>';
    z.appendChild(l);
  });

  /* Ce qu'il a envoyé, du plus récent au plus ancien */
  recits.forEach(x => {
    const valide = (x.etat === 'valide');
    const l = document.createElement('div');
    l.style.cssText = 'padding:8px 0;border-top:1px solid rgba(255,255,255,.05);' +
      'font-size:13px;line-height:1.5;';

    const tete = document.createElement('div');
    tete.style.cssText = 'display:flex;gap:8px;align-items:flex-start;' +
      'cursor:pointer;';
    tete.innerHTML = '<span style="flex-shrink:0;">' +
      (valide ? '✅' : '👀') + '</span>' +
      '<span style="flex:1;min-width:0;"><strong>' +
        (x.procedure || '').replace(/</g, '&lt;') + '</strong>' +
        (valide ? '' : '<span style="color:var(--warn-text);font-size:11px;">' +
                       ' — à valider</span>') +
        '<div style="font-size:11px;color:var(--muted);">' +
          (x.envoyeLe || '').replace(/</g, '&lt;') +
          (x.validePar ? ' · corrigée par ' + x.validePar.replace(/</g, '&lt;') : '') +
          (x.langue ? ' · 🌍 ' + String(x.langue).replace(/</g, '&lt;') : '') +
        '</div></span>' +
      '<span style="flex-shrink:0;color:var(--muted);">▾</span>';
    l.appendChild(tete);

    /* Le détail se déplie : la liste resterait illisible autrement */
    const detail = document.createElement('div');
    detail.style.cssText = 'display:none;margin:8px 0 0 26px;font-size:12px;' +
      'line-height:1.6;';
    detail.innerHTML =
      '<div style="color:var(--muted);margin-bottom:4px;">Ce qu\'il a dit</div>' +
      '<div style="white-space:pre-wrap;margin-bottom:8px;">' +
        (x.texte || '').replace(/</g, '&lt;') + '</div>' +
      (x.correction
        ? '<div style="color:var(--muted);margin-bottom:4px;">La correction</div>' +
          '<div style="white-space:pre-wrap;">' +
          x.correction.replace(/</g, '&lt;') + '</div>'
        : '');
    l.appendChild(detail);

    tete.addEventListener('click', () => {
      const ouvert = (detail.style.display === 'block');
      detail.style.display = ouvert ? 'none' : 'block';
      tete.lastElementChild.textContent = ouvert ? '▾' : '▴';
    });

    z.appendChild(l);
  });

  d.appendChild(z);
  zone.appendChild(d);
}


async function refreshHistory(){
  /* Carte retirée de l'interface : ce stockage ne fonctionne pas
     sur un site hébergé, la recherche par élève le remplace. */
  if(!document.getElementById('historyList')) return;
  try{
    const res = await window.storage.list('bilan:', false);
    const keys = (res && res.keys) ? res.keys : [];
    if(!keys.length){
      $('historyList').innerHTML = '<div class="empty">Aucun bilan enregistré pour l\'instant.</div>';
      return;
    }
    const items = [];
    for(const k of keys){
      try{
        const r = await window.storage.get(k, false);
        if(r && r.value) items.push(JSON.parse(r.value));
      }catch(e){}
    }
    items.sort((a, b) => b.ts - a.ts);
    const list = $('historyList');
    list.innerHTML = '';
    items.slice(0, 20).forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item';
      const meta = document.createElement('div');
      meta.className = 'meta';
      const nom = document.createElement('strong');
      nom.textContent = item.studentName;
      const sous = document.createElement('span');
      sous.textContent = [item.dateStr, item.site, item.monitorName, item.modeleLabel].filter(Boolean).join(' · ');
      meta.appendChild(nom);
      meta.appendChild(sous);
      row.appendChild(meta);

      /* Supprimer un bilan : administrateurs seuls, et jamais par
         mégarde. Le numéro de leçon se recalcule tout seul, il se
         déduit du nombre de bilans restants. */
      if(ACCES.role === 'admin' && item.ligne){
        const bSup = document.createElement('button');
        bSup.className = 'btn btn-secondary';
        bSup.style.cssText = 'width:auto;padding:6px 10px;font-size:12px;margin:0;' +
          'flex-shrink:0;color:var(--red);border-color:var(--red);';
        bSup.textContent = '🗑️';
        bSup.title = 'Supprimer ce bilan';
        bSup.addEventListener('click', async ev => {
          ev.stopPropagation();
          if(!await confirmer('Supprimer le bilan du ' + (item.date || '?') +
              ' pour ' + item.eleve + ' ?\n\n' +
              'Cette suppression est DÉFINITIVE : le texte du bilan et sa note ' +
              'seront perdus.\n\nLes leçons suivantes seront renumérotées.')) return;

          bSup.disabled = true;
          bSup.textContent = '…';
          try{
            await appelPrep({ action: 'bilanSupprimer', ligne: item.ligne,
                              eleve: item.eleve });
            showToast('Bilan supprimé ✅');
            viderCaches(item.eleve);
            rechercherEleve();
          }catch(e){
            showToast('Suppression impossible : ' + e.message);
            bSup.disabled = false;
            bSup.textContent = '🗑️';
          }
        });
        row.appendChild(bSup);
      }

      const arrow = document.createElement('div');
      arrow.className = 'arrow';
      arrow.textContent = '›';
      row.appendChild(arrow);
      row.addEventListener('click', () => {
        currentLessonMeta = item;
        $('resultText').value = item.text;
        $('recordView').style.display = 'none';
        $('generatingView').style.display = 'none';
        $('resultView').style.display = 'block';
    /* Les procédures à cocher, prêtes dès l'affichage du bilan */
    if(typeof remplirListeRecitations === 'function') remplirListeRecitations();
      });
      list.appendChild(row);
    });
  }catch(e){ console.error('history load failed', e); }
}

/* ---------- Administration des accès ---------- */
function messageAdmin(texte, erreur){
  const m = $('adminMsg');
  m.textContent = texte || '';
  m.style.color = erreur ? 'var(--warn-text)' : 'var(--orange)';
}

async function appelAdmin(corps){
  const r = await fetchFiable(CONFIG.ADMIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ code: ACCES.code }, corps))
  });
  if(r.status === 403 && !ACCES.code){
    verrouiller('Session expirée, saisis ton code à nouveau.');
    throw new Error('Session expirée');
  }
  const data = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
  return data;
}

async function chargerUtilisateurs(){
  const zone = $('adminList');
  zone.innerHTML = '<div class="empty">Chargement…</div>';
  try{
    const data = await appelAdmin({ action: 'list' });
    if(data.kv === false){
      zone.innerHTML = '<div class="unsupported">⚠️ Le stockage KV n\'est pas configuré sur le Worker : impossible d\'enregistrer de nouveaux accès. Vérifie le binding <strong>UTILISATEURS</strong>.</div>';
      return;
    }
    const liste = data.utilisateurs || [];
    zone.innerHTML = '';
    liste.forEach(u => {
      const row = document.createElement('div');
      row.className = 'history-item';

      const meta = document.createElement('div');
      meta.className = 'meta';
      const nom = document.createElement('strong');
      nom.textContent = u.nom + (u.role === 'admin' ? ' — admin' : '');
      const sous = document.createElement('span');
      sous.textContent = 'Code ' + u.code + (u.principal ? ' · compte principal' : (u.cree ? ' · créé le ' + u.cree : ''));
      meta.appendChild(nom);
      meta.appendChild(sous);
      row.appendChild(meta);

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';

      if(!u.principal && u.code !== ACCES.code){
        const selRole = document.createElement('select');
        selRole.style.cssText = 'width:auto;margin:0;padding:7px 8px;font-size:12px;';
        [['moniteur','Moniteur'],['bureau','Bureau'],['admin','Admin']].forEach(([v, l]) => {
          const o = document.createElement('option');
          o.value = v; o.textContent = l;
          selRole.appendChild(o);
        });
        selRole.value = u.role;
        selRole.addEventListener('change', async () => {
          selRole.disabled = true;
          try{
            await appelAdmin({ action:'role', cible:u.code, role: selRole.value });
            messageAdmin('Rôle de ' + u.nom + ' modifié — accès repris du rôle.');
            chargerUtilisateurs();
          }catch(e){ messageAdmin(e.message, true); selRole.disabled = false; }
        });
        actions.appendChild(selRole);

        /* L'émoji, modifiable sans toucher au reste */
        const bEmo = document.createElement('button');
        bEmo.className = 'btn btn-secondary';
        bEmo.style.cssText = 'width:auto;padding:7px 10px;font-size:14px;';
        bEmo.textContent = u.emoji || '🙂';
        bEmo.title = 'Émoji de ' + u.nom + ' sur la fiche manœuvres';
        bEmo.addEventListener('click', async () => {
          const v = await demander(
            'Émoji de ' + u.nom + "\n\nIl signe les manœuvres qu'il fait retravailler.\n" +
            'Laisse vide pour ne rien signer.', u.emoji || '', 'Émoji');
          if(v === null) return;
          bEmo.disabled = true;
          try{
            await appelAdmin({ action:'emoji', cible:u.code, emoji: String(v).trim() });
            messageAdmin('Émoji de ' + u.nom + ' enregistré.');
            chargerUtilisateurs();
          }catch(e){ messageAdmin(e.message, true); bEmo.disabled = false; }
        });
        actions.appendChild(bEmo);

        /* Le genre, pour les accords du bilan */
        const bGen = document.createElement('button');
        bGen.className = 'btn btn-secondary';
        bGen.style.cssText = 'width:auto;padding:7px 10px;font-size:12px;';
        bGen.textContent = u.genre === 'F' ? '♀' : (u.genre === 'M' ? '♂' : '?');
        bGen.title = 'Genre de ' + u.nom + ', pour les accords du bilan';
        bGen.addEventListener('click', async () => {
          const v = await choisirDansListe('Genre de ' + u.nom + ' :',
            ['Féminin', 'Masculin', 'Non précisé'],
            u.genre === 'F' ? 'Féminin' : (u.genre === 'M' ? 'Masculin' : 'Non précisé'));
          if(!v) return;
          const g = (v === 'Féminin') ? 'F' : (v === 'Masculin' ? 'M' : '');
          bGen.disabled = true;
          try{
            await appelAdmin({ action:'genre', cible:u.code, genre:g });
            messageAdmin('Genre de ' + u.nom + ' enregistré.');
            chargerUtilisateurs();
          }catch(e){ messageAdmin(e.message, true); bGen.disabled = false; }
        });
        actions.appendChild(bGen);

        /* Changer le code d'accès, sans toucher au reste du compte */
        const bCode = document.createElement('button');
        bCode.className = 'btn btn-secondary';
        bCode.style.cssText = 'width:auto;padding:7px 10px;font-size:12px;';
        bCode.textContent = '🔑';
        bCode.title = 'Changer le code de ' + u.nom;
        bCode.addEventListener('click', async () => {
          const nouveau = await demander(
            'Nouveau code pour ' + u.nom + '\n\n' +
            'De 6 à 8 chiffres. Son rôle, ses accès et ses cours préparés sont conservés.',
            '', 'Changer le code');
          if(nouveau === null) return;
          const v = String(nouveau).trim();
          if(!/^[0-9]{6,8}$/.test(v)){
            messageAdmin('Le code doit contenir de 6 à 8 chiffres.', true);
            return;
          }
          bCode.disabled = true;
          try{
            await appelAdmin({ action:'changerCode', cible:u.code, nouveauCode:v });
            messageAdmin('Code de ' + u.nom + ' changé — préviens-le de son nouveau code : ' + v);
            chargerUtilisateurs();
          }catch(e){ messageAdmin(e.message, true); bCode.disabled = false; }
        });
        actions.appendChild(bCode);

        const bDel = document.createElement('button');
        bDel.className = 'btn btn-secondary';
        bDel.style.cssText = 'width:auto;padding:7px 10px;font-size:12px;color:var(--red);border-color:var(--red);';
        bDel.textContent = '✕';
        bDel.addEventListener('click', async () => {
          if(!await confirmer('Supprimer l\'accès de ' + u.nom + ' (code ' + u.code + ') ?\n\n' +
                              'Ses bilans, cours préparés et fiches restent en place :\n' +
                              "seule sa connexion est retirée.")) return;
          try{
            await appelAdmin({ action:'delete', cible:u.code });
            messageAdmin('Accès de ' + u.nom + ' supprimé.');
            chargerUtilisateurs();
          }catch(e){ messageAdmin(e.message, true); }
        });
        actions.appendChild(bDel);
      } else {
        const verrou = document.createElement('div');
        verrou.style.cssText = 'font-size:11px;color:var(--muted);';
        verrou.textContent = u.principal ? '🔒' : '(toi)';
        actions.appendChild(verrou);
      }

      row.appendChild(actions);
      zone.appendChild(row);

      /* Réglage fin de ce que cette personne voit */
      if(!u.principal){
        const det = document.createElement('details');
        det.style.cssText = 'margin:-6px 0 10px 4px;';
        det.innerHTML = '<summary style="cursor:pointer;font-size:12px;color:var(--muted);">' +
          'Ce que ' + u.nom + ' voit (' + Object.keys(u.droits || {}).length +
          ' section' + (Object.keys(u.droits || {}).length > 1 ? 's' : '') + ')</summary>';
        const z = document.createElement('div');
        z.style.cssText = 'padding:8px 0 8px 6px;';
        const dr = u.droits || {};
        SECTIONS.forEach(sec => {
          const l = document.createElement('div');
          l.style.cssText = 'display:flex;align-items:center;gap:8px;margin:0 0 6px;';
          const t = document.createElement('span');
          t.style.cssText = 'flex:1;font-size:14px;color:var(--cream);line-height:1.3;';
          t.textContent = sec.nom;
          const s = document.createElement('select');
          s.className = 'drt-' + u.code;
          s.setAttribute('data-cle', sec.cle);
          s.style.cssText = 'width:auto;margin:0;padding:6px 8px;font-size:12px;flex-shrink:0;';
          [['', 'Rien'], ['v', '👁️ Voir'], ['m', '✏️ Modifier']].forEach(([v, lab]) => {
            const o = document.createElement('option');
            o.value = v; o.textContent = lab;
            s.appendChild(o);
          });
          s.value = dr[sec.cle] || '';
          l.appendChild(t); l.appendChild(s);
          z.appendChild(l);
        });
        const b = document.createElement('button');
        b.className = 'btn btn-secondary';
        b.style.cssText = 'padding:8px;font-size:12px;margin-top:6px;';
        b.textContent = '💾 Enregistrer les accès';
        b.addEventListener('click', async () => {
          const choisis = {};
          document.querySelectorAll('.drt-' + u.code).forEach(x => {
            if(x.value) choisis[x.getAttribute('data-cle')] = x.value;
          });
          b.disabled = true;
          try{
            await appelAdmin({ action:'droits', cible:u.code, droits: choisis });
            /* Aucun droit coché est un choix, pas un oubli : on le dit */
            if(!Object.keys(choisis).length){
              messageAdmin('Rien de coché pour ' + u.nom +
                ' : il ne verra que l\'écran d\'accueil.');
            }
            messageAdmin('Accès de ' + u.nom + ' enregistrés.');
            chargerUtilisateurs();
          }catch(e){ messageAdmin(e.message, true); b.disabled = false; }
        });
        z.appendChild(b);
        det.appendChild(z);
        zone.appendChild(det);
      }
    });
  }catch(e){
    zone.innerHTML = '<div class="empty">Erreur : ' + e.message + '</div>';
  }
}

brancher('createBtn', 'click', async () => {
  const btn = $('createBtn');
  btn.disabled = true;
  try{
    await appelAdmin({
      action: 'create',
      nouveauCode: $('newCode').value.trim(),
      nom: $('newName').value.trim(),
      role: $('newRole').value,
      emoji: $('newEmoji') ? $('newEmoji').value.trim() : '',
      genre: $('newGenre') ? $('newGenre').value : ''
    });
    messageAdmin('Accès créé pour ' + $('newName').value.trim() + '.');
    $('newCode').value = '';
    $('newName').value = '';
    if($('newEmoji')) $('newEmoji').value = '';
    $('newRole').value = 'moniteur';
    chargerUtilisateurs();
  }catch(e){
    messageAdmin(e.message, true);
  }finally{
    btn.disabled = false;
  }
});


/* Ouvre la session et met en place l'interface */
function ouvrirSession(code, moniteur, role, saluer, droits, emoji, genre,
                      droitsRegles){
  ACCES = { code: code, moniteur: moniteur || '', role: role || 'moniteur',
            emoji: emoji || '', genre: genre || '',
            droits: droits || {},
            /* « Réglés à la main, même à vide ». Voir niveauDroit(). */
            droitsRegles: !!droitsRegles };
  memoriserSession(ACCES.code, ACCES.moniteur, ACCES.role, ACCES.droits,
                   ACCES.emoji, ACCES.genre, ACCES.droitsRegles);

  $('lockView').style.display = 'none';
  $('appView').style.display = 'block';
  $('logoutBtn').style.display = 'block';
  majBoutonSuppressionHistorique();

  /* Le contrôle de version : à côté du prénom, là où le moniteur
     regarde quand il doute. */
  if($('versionBtn')){
    $('versionBtn').style.display = 'block';
    if(typeof brancherBoutonVersion === 'function') brancherBoutonVersion();
  }

  /* Le guide s'ouvre déjà filtré sur ce que cette personne voit :
     un moniteur n'a pas à traverser les chapitres du bureau pour
     retrouver le sien. L'adresse de départ est relue à chaque fois,
     sinon le rôle s'empilerait à la seconde ouverture de session. */
  const guide = $('guideBtn');
  if(guide){
    if(!guide.dataset.base) guide.dataset.base = guide.getAttribute('href');
    guide.href = guide.dataset.base + '&role=' + encodeURIComponent(ACCES.role || 'moniteur');
    guide.style.display = 'flex';
  }

  afficherIdentite();
  if(ACCES.moniteur) $('monitorName').value = ACCES.moniteur;

  /* Chaque mise en place est isolée : un module absent ne doit pas
     empêcher d'utiliser le reste de l'application. */
  const etapes = [
    ['droits',        () => appliquerDroits()],
    ['utilisateurs',  () => { if(aDroit('admin') && ACCES.role === 'admin') chargerUtilisateurs(); }],
    ['reprise',       () => proposerReprise()],
    /* Le cache d'abord : la liste s'affiche sans attendre le réseau */
    ['élèves',        () => { if(typeof elevesDuCache === 'function') elevesDuCache();
                              chargerEleves(); }],
    ['moniteurs',     () => chargerMoniteurs()],
    ['onglets',       () => initOnglets()],
    ['modèles',       () => appliquerTextesBilan()],
    ['réseau',        () => ecouterReseau()],
    ['cours préparés',() => { if(aDroit('cours')) afficherPrepares(); }],
    ['actualisation', () => lancerActualisationAuto()]
  ];
  const ratees = [];
  etapes.forEach(([nom, f]) => {
    try{ f(); }catch(e){ ratees.push(nom); console.warn('Étape « ' + nom + ' » :', e); }
  });
  if(ratees.length){
    showToast('⚠️ Chargement incomplet : ' + ratees.join(', '));
  }
  if(saluer) showToast('Bonjour ' + (ACCES.moniteur || '') + ' 👋');

  /* Ce qui attend une décision du bureau se compte en tâche de
     fond : la pastille apparaît sur l'onglet Suivi sans que
     personne ait eu à l'ouvrir. */
  /* Chaque compte est lancé pour lui-même : imbriqués, les trois
     autres ne partaient pas si le module du bureau manquait, et
     leurs pastilles n'apparaissaient qu'après ouverture de la vue. */
  [[2500, 'verifierAPrevoirEnFond'],
   [3200, 'chargerProcEnFond'],
   [3200, 'compterTachesEnFond'],
   [3800, 'chargerFlotteEnFond']].forEach(([delai, nom]) => {
    const f = window[nom];
    /* Une étape absente passait inaperçue : le compte ne se faisait
       jamais, et rien ne le disait. */
    if(typeof f !== 'function'){
      console.warn('Compte de fond « ' + nom + ' » : fonction introuvable');
      return;
    }
    setTimeout(() => f(), delai);
  });

  /* Et le compte des procédures se refait tout seul ensuite : une
     procédure déposée à onze heures doit allumer le bouton du haut
     sans qu'on recharge la page. */
  if(typeof veillerProcACorriger === 'function') veillerProcACorriger();

  /* Une application laissée ouverte doit se verrouiller aussi :
     vérifier au chargement ne suffit pas si personne ne recharge. */
  lancerSurveillanceSession();

  /* Les erreurs remontent au bureau à partir d'ici : avant la
     connexion on ne sait pas de qui elles viennent, et l'appel
     serait refusé. */
  if(typeof veillerIncidents === 'function') veillerIncidents();

  /* La dictée se met à l'abri en cours de route, et un bilan
     renvoyé par le bureau se signale sans attendre le prochain
     démarrage. */
  if(typeof chargerReglageLigneExamen === 'function') chargerReglageLigneExamen();
  if(typeof veillerDepotBrouillon === 'function') veillerDepotBrouillon();
  if(typeof veillerBrouillonsServeur === 'function') veillerBrouillonsServeur();

  /* La version se contrôle aux créneaux, jamais pendant un cours */
  if(typeof lancerSurveillanceVersion === 'function') lancerSurveillanceVersion();

}


let minuteurSession = null;

function lancerSurveillanceSession(){
  clearInterval(minuteurSession);
  minuteurSession = setInterval(() => {
    if(!ACCES || !ACCES.code) return;
    if(lireSession()) return;

    /* La session vient d'expirer : on ferme proprement */
    clearInterval(minuteurSession);
    const pourquoi = (typeof raisonDeconnexion !== 'undefined' &&
                      raisonDeconnexion === 'hebdo')
      ? 'Déconnexion du samedi soir.'
      : 'Déconnecté après 48 h sans activité.';
    verrouiller(pourquoi, false);
  }, 300000);            /* toutes les 5 minutes */
}

/* Reprend la session mémorisée, après vérification du code */
async function reprendreSession(){
  const s = lireSession();
  if(!s){
    /* Dire pourquoi : sans explication, on croit à une panne. */
    const msg = $('codeMsg');
    if(msg && typeof raisonDeconnexion !== 'undefined' && raisonDeconnexion){
      msg.style.color = 'var(--muted)';
      msg.textContent =
          (raisonDeconnexion === 'hebdo')
        ? 'Déconnexion du samedi soir — reconnecte-toi.'
        : (raisonDeconnexion === 'droits')
        ? 'Mise à jour des accès — retape ton code, une seule fois.'
        : 'Déconnecté après 48 h sans activité.';
      raisonDeconnexion = '';
    }
    return false;
  }
  try{
    const r = await fetchFiable(CONFIG.AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      /* Le prénom mémorisé repart avec le code : la vérification
         est la même qu'à la première connexion. */
      body: JSON.stringify({ code: s.code, identifiant: s.moniteur || '' })
    });
    const data = await r.json().catch(() => ({}));

    /* On n'oublie la session que si le code est vraiment refusé.
       Un serveur occupé ou un blocage temporaire ne doit pas
       déconnecter quelqu'un dont le code est valable. */
    if(!r.ok || !data.ok){
      if(r.status === 403 && data.error && /incorrect|inconnu/i.test(data.error)){
        oublierSession();
        return false;
      }
      /* Doute : le serveur n'a pas répondu clairement. On ouvre,
         mais en mode réduit — voir ouvrirSessionDegradee(). */
      ouvrirSessionDegradee(s);
      return true;
    }

    ouvrirSession(s.code, data.moniteur, data.role, false, data.droits,
                  data.emoji, data.genre, data.droitsRegles);
    return true;
  }catch(e){
    /* Hors ligne : on travaille, mais avec les droits du volant. */
    ouvrirSessionDegradee(s);
    return true;
  }
}


/* ------------------------------------------------------------
   HORS LIGNE : ON TRAVAILLE, MAIS PAS AVEC N'IMPORTE QUOI

   Quand le serveur ne répond pas, la session se rouvrait avec le
   rôle et les droits MÉMORISÉS DANS LE TÉLÉPHONE. Or ce qui est
   dans le téléphone se modifie : ouvrir le stockage du navigateur,
   écrire « admin », passer en mode avion, recharger — et l'écran
   s'ouvrait en administrateur.

   Fermer complètement serait pire : un moniteur dans une zone
   blanche doit pouvoir dicter son bilan et voir ses cours. On
   ouvre donc en MODE RÉDUIT, avec ce qui fonctionne vraiment sans
   réseau. Tout le reste — la paie, les tarifs, le bureau, les
   accès — appelle le classeur de toute façon : le masquer ne
   retire rien, cela dit seulement la vérité.

   Le code, lui, reste celui du téléphone : c'est le serveur qui
   dira ce qu'il vaut à la première réponse, et la session
   redeviendra complète toute seule.
   ------------------------------------------------------------ */
const DROITS_HORS_LIGNE = { prepares: 'm', cours: 'm', recherche: 'v' };

function ouvrirSessionDegradee(s){
  ouvrirSession(s.code, s.moniteur, 'moniteur', false,
                Object.assign({}, DROITS_HORS_LIGNE),
                s.emoji, s.genre, true);

  /* Le dire, sinon on croit à une panne — ou pire, on croit avoir
     perdu des droits. */
  if(typeof showToast === 'function'){
    setTimeout(() => showToast('Hors ligne — écran réduit au volant'), 600);
  }
}

/* ---------- Déverrouillage ---------- */
async function deverrouiller(){
  const code = $('codeInput').value.trim();
  const ident = $('identInput') ? $('identInput').value.trim() : '';
  const msg = $('codeMsg');

  if(!ident){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = 'Indique ton prénom.';
    if($('identInput')) $('identInput').focus();
    return;
  }
  if(code.length < 6){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = 'Le code compte au moins 6 chiffres.';
    $('codeInput').focus();
    return;
  }
  const btn = $('codeBtn');
  btn.disabled = true;
  btn.textContent = 'Vérification…';
  msg.style.color = 'var(--muted)';
  msg.textContent = '';
  try{
    const r = await fetchFiable(CONFIG.AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, identifiant: ident })
    });
    const data = await r.json().catch(() => ({}));
    if(!r.ok || !data.ok){
      msg.style.color = 'var(--warn-text)';
      /* Le serveur dit pourquoi : essais restants, blocage temporaire.
         Le masquer derrière « code incorrect » empêche de comprendre. */
      /* On ne dit pas lequel des deux est faux : le préciser
         permettrait de deviner les prénoms enregistrés. */
      msg.textContent = data.error || 'Prénom ou code incorrect.';
      if(r.status === 429){
        msg.innerHTML = '⏳ ' + (data.error || 'Accès bloqué un moment.') +
          '<br><span style="font-size:12px;color:var(--muted);">' +
          'Après plusieurs codes erronés, l\'accès se bloque quinze minutes. ' +
          'Patiente, ou passe par un autre réseau.</span>';
      }
      $('codeInput').value = '';
      return;
    }
    ouvrirSession(code, data.moniteur, data.role, true, data.droits,
                data.emoji, data.genre, data.droitsRegles);
  }catch(e){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = 'Connexion impossible : ' + e.message;
  }finally{
    btn.disabled = false;
    btn.textContent = 'Déverrouiller';
  }
}

brancher('logoutBtn', 'click', async () => {
  /* CE QU'ON EFFACE, ON LE DIT AVANT.

     Une déconnexion voulue vide l'appareil — c'est le moment où un
     téléphone se rend, se prête ou se fait réparer. Mais un bilan
     dicté et non envoyé n'a parfois pas d'autre exemplaire :
     l'effacer en silence, ce serait détruire le travail de
     quelqu'un pour une raison qu'il n'a pas comprise. */
  const reste = (typeof travailNonTermine === 'function')
    ? travailNonTermine() : 0;

  const question = reste
    ? 'Se déconnecter ?\n\nIl reste ' + reste + ' travail(aux) non ' +
      'terminé(s) sur cet appareil (bilan dicté, fiche en cours).\n' +
      'La déconnexion les efface.'
    : 'Se déconnecter ?';

  if(!await confirmer(question)) return;
  verrouiller('');
  if(typeof oublierLeTravail === 'function') oublierLeTravail();
  showToast('Déconnecté');
});

/* Le raccourci des procédures : il n'ouvre rien de plus que
   l'écran qui existe déjà, il évite d'avoir à y penser. */
brancher('procRaccourci', 'click', () => {
  if(typeof ouvrirLesProcAcorriger === 'function') ouvrirLesProcAcorriger();
});

/* Le bouton Déverrouiller est branché dans la page elle-même,
   pour qu'aucun module ne puisse l'empêcher de répondre. */


/* ============================================================
   CORRIGER UN BILAN DÉJÀ ENREGISTRÉ
   Une date d'examen oubliée, une faute : on remplace le texte
   en place plutôt que d'enregistrer un second bilan.
   ============================================================ */
function majBoutonCorrection(){
  const b = $('corrigerBtn');
  if(!b) return;
  const ligne = currentLessonMeta && currentLessonMeta.ligne;
  b.style.display = ligne ? 'block' : 'none';
  if(ligne){
    b.textContent = '💾 Enregistrer la correction';
    b.disabled = false;
  }

  /* Le numéro de leçon, souvent oublié au premier bilan */
  const z = $('corrigerLecon');
  if(z){
    z.style.display = ligne ? 'block' : 'none';
    if(ligne){
      const n = $('corrLeconN');
      if(n) n.value = leconDuBilan();
    }
  }
}


/* Le numéro de leçon lu dans le bilan affiché.

   Le bilan porte aussi la frise — « 5 leçons de 2h » — et il ne
   faut surtout pas la lire comme un rang : c'est la même règle
   qu'ailleurs, donc la même expression, écrite une seule fois. */
function leconDuBilan(){
  const t = ($('resultText') && $('resultText').value) || '';
  const m = t.match(RE_NUM_LECON);
  if(!m) return '';
  const n = String(m[0]).match(/\d+/);
  return n ? n[0] : '';
}


/* ============================================================
   CORRIGER LE NUMÉRO DE LEÇON

   Un moniteur qui découvre l'outil l'oublie souvent la première
   fois. Toute la frise s'en trouve décalée : les leçons suivantes
   se comptent à partir de là.
   ============================================================ */

async function corrigerLeconDuBilan(){
  const ligne = currentLessonMeta && currentLessonMeta.ligne;
  if(!ligne){ showToast('Ouvre un bilan déjà enregistré.'); return; }

  const n = String(($('corrLeconN') && $('corrLeconN').value) || '').trim();
  if(!n || isNaN(Number(n))){
    showToast('Indique un numéro de leçon.');
    return;
  }

  const zone = $('resultText');
  const avant = zone ? zone.value : '';
  const actuel = leconDuBilan();

  if(!actuel){
    showToast("Ce bilan ne mentionne pas de numéro de leçon.");
    return;
  }
  if(actuel === n){ showToast('C\'est déjà la ' + n + 'e leçon.'); return; }

  const eleve = (currentLessonMeta.studentName || '').trim();
  if(!await confirmer('Corriger la ' + actuel + 'e leçon en ' + n +
      'e pour ' + eleve + ' ?\n\n' +
      'Le bilan et ses notes seront mis à jour.')) return;

  /* Seule la mention de la leçon change : le reste du bilan est
     l'ouvrage du moniteur, on n'y touche pas.

     L'accord suit le nouveau numéro : « 1ère » mais « 5e ». */
  const rang = (n === '1') ? '1ère' : (n + 'e');
  const rempl = (t) => String(t).replace(RE_NUM_LECON, rang + '$1');

  const b = $('corrLeconBtn');
  if(b){ b.disabled = true; b.textContent = 'Correction…'; }

  try{
    const texte = rempl(avant);
    const r = await appelPrep({ action: 'bilanModifier',
                                ligne: ligne, eleve: eleve, texte: texte });
    if(r && r.status === 'error') throw new Error(r.message);

    if(zone) zone.value = texte;

    /* Ses notes portent la même mention : sans cela le prochain
       cours repartirait du mauvais numéro. Elles voyagent avec le
       bilan, d'où ce second envoi. */
    const zn = $('noteInterne');
    if(zn && /le[çc]on/i.test(zn.value)){
      zn.value = rempl(zn.value);
      try{
        await appelPrep({ action: 'bilanModifier', ligne: ligne,
                          eleve: eleve, texte: texte,
                          noteInterne: zn.value.trim() });
      }catch(e){}
    }

    viderCaches(eleve);
    showToast('✅ ' + n + 'e leçon');
    if(b) b.textContent = '✅ Corrigé';
  }catch(e){
    showToast('Erreur : ' + e.message);
    if(b){ b.disabled = false; b.textContent = '✏️ Corriger la leçon'; }
  }
}

async function enregistrerCorrection(){
  const ligne = currentLessonMeta && currentLessonMeta.ligne;
  if(!ligne){ showToast("Ce bilan n'a pas encore été enregistré."); return; }

  const texte = $('resultText').value.trim();
  if(!texte){ showToast('Le bilan est vide.'); return; }

  const eleve = currentLessonMeta.studentName || '';
  if(!await confirmer('Remplacer le bilan de ' + eleve + ' du ' +
                      (currentLessonMeta.dateStr || '?') + ' ?\n\n' +
                      "L'ancien texte sera écrasé.")) return;

  const b = $('corrigerBtn');
  b.disabled = true;
  b.textContent = 'Enregistrement…';
  /* Bleu pendant l'écriture, comme le bouton principal */
  const styleAvant = b.getAttribute('style') || '';
  b.setAttribute('style', styleAvant +
    ';background:#2F6FB3;border-color:#2F6FB3;color:#FFFFFF;');
  try{
    const r = await appelPrep({ action: 'bilanModifier',
                                ligne: ligne, eleve: eleve, texte: texte });
    if(r && r.status === 'error') throw new Error(r.message);
    viderCaches(eleve);
    showToast('✅ Bilan corrigé');
    b.setAttribute('style', styleAvant);
    b.textContent = '✅ Correction enregistrée';
  }catch(e){
    showToast('Erreur : ' + e.message);
    b.setAttribute('style', styleAvant);
    b.disabled = false;
    b.textContent = '💾 Enregistrer la correction';
  }
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-depart.js'] = true;

/* ============================================================
   RÉPARATION — RECOMPTER LES NUMÉROS DE LEÇON

   Pendant quelques jours, le relais a renvoyé la taille du classeur
   au lieu du nombre de bilans de l'élève : les cours préparés à ce
   moment-là portent un numéro absurde, « 160ème leçon ». Le calcul
   est corrigé, mais ce qui a été écrit reste écrit.

   Cet outil relit les cours préparés, recompte pour de bon, et
   propose de corriger ceux qui ne collent pas. Rien n'est modifié
   avant que l'écran ait montré la liste : une réécriture en masse
   se regarde avant de se lancer.

   Réservé aux administrateurs : c'est un ménage, pas un geste de
   tous les jours.
   ============================================================ */

var reparLecons = [];   /* ce que la vérification a trouvé */

/* Un nom d'élève entre dans du HTML : il ne doit pas pouvoir le
   casser. Même précaution qu'ailleurs dans l'application. */
function reparTexte(s){
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/* Le numéro écrit sur un cours préparé.

   La NOTE d'abord, le contexte ensuite : c'est la note que le
   moniteur lit sur sa carte, et les deux ont divergé. Une première
   version de cette réparation corrigeait le contexte mais ratait la
   note — elle déclarait ensuite « rien à corriger » en regardant le
   contexte, pendant que la carte affichait toujours « 159ème ». */
function numeroLeconDuCours(cours){
  const note = String(cours.note || '');

  /* DERRIÈRE UNE CHARNIÈRE, LA LIGNE ANNONCE DEUX RANGS.

     « 4ème leçon après l'examen blanc — frise dépassée (2 prévues,
     9ème au total) » : le premier nombre n'est PAS le total. Le
     lire comme tel ramenait la 9ème leçon d'Astrid à sa 4ème — la
     case du total affichait 4 pendant que le questionnaire, qui
     lit le contexte, affichait 9. Quand la ligne porte un total,
     il s'y dit en toutes lettres. */
  const tot = note.match(/(\d+)\s*(?:ère|ere|ème|eme|e)\s+au total/i);
  if(tot){
    const v = parseInt(tot[1], 10);
    if(v > 0) return v;
  }

  /* Une ligne qui compte depuis une charnière sans dire de total
     ne dit rien du total : on ne prend surtout pas son rang. Le
     contexte, lui, le sait. */
  if(!/le[çc]ons?\s+apr[èe]s\s/i.test(note)){
    const m = note.match(RE_NUM_LECON);
    if(m){
      const v = parseInt(String(m[0]), 10);
      if(!isNaN(v) && v > 0) return v;
    }
  }

  const n = parseInt((cours.contexte || {}).lecon, 10);
  return (!isNaN(n) && n > 0) ? n : null;
}

/* ------------------------------------------------------------
   LA NOTE QUE CE COURS DEVRAIT PORTER

   On ne rature plus : on refait. Le corps de la note est ce que le
   questionnaire écrirait avec le bon numéro de leçon — donc la
   frise intacte, et la phrase de rang juste jusqu'au bout
   (« 3ème leçon sur 5 — encore 2 leçons avant l'examen blanc », et
   non « 3ème leçon — frise dépassée » héritée du 159).

   La date du jour est celle du cours pendant ce calcul : certaines
   phrases du questionnaire la lisent à l'écran, et les dater
   d'aujourd'hui serait inventer.
   ------------------------------------------------------------ */
function noteJusteDuCours(cours, rang, dossier){
  const m = morceauxDeNotePreparee(cours.note);

  /* Trois sources, de la moins sûre à la plus sûre.

     1. La note du DERNIER COURS de l'élève : le filet. Un cours
        préparé dont la note a été appauvrie — un examen officiel
        qui a effacé la frise, une préparation d'avant tout ceci —
        ne peut se réparer qu'en allant chercher ce que son dossier
        sait encore.
     2. Sa propre note, corps et 📌 : ce que quelqu'un a écrit sur
        CE cours, et qui vaut mieux que l'historique.
     3. Son contexte : des réponses de moniteur. Elles l'emportent
        partout où elles disent quelque chose. */
  const lire = t => ((typeof defautsDepuisNote === 'function' && t)
    ? defautsDepuisNote(t) : {});

  const ctx = Object.assign(lire(dossier && dossier.derniereNote),
                            lire(cours.note),
                            cours.contexte || {},
                            /* 4. Et par-dessus tout : le suivi et les
                               sessions. Ni l'un ni l'autre ne s'écrit
                               dans une note, et ce sont eux qui savent
                               qu'un post-permis est fait ou qu'une date
                               d'examen vient d'être posée. */
                            (typeof etatQuiFaitFoi === 'function')
                              ? etatQuiFaitFoi(cours.eleve) : {});
  ctx.lecon = String(rang);

  /* Le type de bilan du cours, quand le contexte ne le porte pas :
     c'est lui qui dit qu'aujourd'hui, c'est l'examen. */
  if(!ctx.modele && cours.modele) ctx.modele = cours.modele;

  /* La frise ne se devine pas : si le cours l'a perdue, le dossier
     la porte encore — dans sa note ou sur la fiche de l'élève. */
  if(!ctx.frise && dossier && dossier.frise) ctx.frise = dossier.frise;
  if(!ctx.frise && typeof extraireFrise === 'function'){
    ctx.frise = extraireFrise(cours.note) ||
                extraireFrise((dossier && dossier.derniereNote) || '') || '';
  }

  /* Le dossier vient d'être relu pour recompter : il sait dans
     quelle moitié de frise l'élève se trouve. Les cours préparés
     avant que ce compte existe ne le portent pas — sans lui, la
     réparation écrirait « 3ème leçon — après l'examen blanc » là où
     il faut lire « 1ère leçon sur 2 après l'examen blanc ». */
  if(dossier){
    if(dossier.leconsDepuisEB !== undefined) ctx.leconsDepuisEB = dossier.leconsDepuisEB;
    if(dossier.leconsDepuisRdvPost !== undefined) ctx.leconsDepuisRdvPost = dossier.leconsDepuisRdvPost;
    if(dossier.leconsParBoite) ctx.leconsParBoite = dossier.leconsParBoite;
    if(dossier.lecons !== null && dossier.lecons !== undefined){
      ctx.leconsFaites = dossier.lecons;
    }
    /* Le classeur ne porte aucun bilan de cet élève : la note doit
       le dire au lieu d'inventer « 1ère leçon ». Sauf si le rappel
       demandait la carte SD — là, c'est vraiment le premier. */
    ctx.sansBilan = !dossier.lecons &&
      !((typeof cestLePremierCours === 'function') &&
        (cestLePremierCours(ctx.premierCours) || cestLePremierCours(cours.note)));
  }

  const champDate = $('lessonDate');
  const dateAvant = champDate ? champDate.value : null;
  if(champDate && cours.date) champDate.value = cours.date;
  let corps = '';
  try{
    corps = noteDepuisQuestionnaire(ctx);
  }finally{
    if(champDate && dateAvant !== null) champDate.value = dateAvant;
  }

  /* Le neuf et l'ancien se fondent : une ligne par sujet, celle du
     questionnaire, enrichie de l'ancienne quand elle en disait
     davantage — la ligne du bureau porte le centre et l'heure de
     convocation. Le 📌 ne garde que les mots du moniteur. C'est là
     que les cinq lignes d'examen empilées disparaissent. */
  const ancien = [m.corps, m.consigne].filter(Boolean).join(' · ');
  const f = fondreNotePreparee(corps, ancien);
  return assemblerNotePreparee(m.entete, f.corps, f.consigne);
}

async function verifierNumerosLecon(){
  const btn = $('reparLeconsBtn');
  const etat = $('reparLeconsEtat');
  const zone = $('reparLeconsListe');
  if(!btn || !etat || !zone) return;

  reparLecons = [];
  zone.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'Lecture…';
  etat.textContent = 'Lecture des cours préparés…';

  try{
    /* Le suivi et les sessions AVANT tout le reste : ce sont eux qui
       savent qu'un post-permis est fait ou qu'un élève vient d'être
       placé à une date d'examen. Deux appels pour tout le lot, pas
       deux par élève — sans eux la réparation réécrirait les mêmes
       notes incomplètes. */
    await Promise.all([
      (typeof chargerBureau === 'function')
        ? chargerBureau(false).catch(() => null) : Promise.resolve(),
      (typeof chargerSessionsPermis === 'function')
        ? chargerSessionsPermis().catch(() => null) : Promise.resolve()
    ]);

    const d = await appelPrep({ action: 'prepList' });
    const liste = (d && d.preparations) || [];

    /* Un élève peut avoir plusieurs cours préparés : on ne relit son
       dossier qu'une fois. Chaque lecture est un appel au serveur. */
    const parEleve = {};
    liste.forEach(c => {
      const nom = String(c.eleve || '').trim();
      if(nom.length < 2) return;
      (parEleve[normaliserMot(nom)] = parEleve[normaliserMot(nom)] || []).push(c);
    });

    const cles = Object.keys(parEleve);
    if(!cles.length){
      etat.textContent = 'Aucun cours préparé à vérifier.';
      return;
    }

    let fait = 0;
    for(const k of cles){
      const cours = parEleve[k];
      const nom = String(cours[0].eleve || '').trim();
      fait++;
      etat.textContent = 'Vérification ' + fait + ' sur ' + cles.length + '…';

      let dossier = null;
      try{ dossier = await chargerDossierEleve(nom); }catch(e){ dossier = null; }
      if(!dossier || dossier.lecons === null) continue;

      cours.forEach(c => {
        /* Le vrai rang : le même calcul que le questionnaire — et
           il peut ne pas exister. Zéro bilan au classeur ne fait
           pas une « 1ère leçon » : on ne réécrit alors rien. */
        const debut = cestLePremierCours((c.contexte && c.contexte.premierCours) || c.note);
        const juste = rangConnu(dossier.lecons, c.modele, debut);
        if(juste === null) return;
        const ecrit = numeroLeconDuCours(c);

        /* Un cours sans aucun contexte ne se refait pas : il n'y a
           rien à partir de quoi réécrire sa note. */
        if(!c.contexte || !Object.keys(c.contexte).length) return;

        let note = '';
        try{ note = noteJusteDuCours(c, juste, dossier); }catch(e){ return; }
        if(!note || note === c.note) return;

        reparLecons.push({ cours: c, eleve: nom, note: note,
                           ecrit: (ecrit === null ? juste : ecrit),
                           juste: juste });
      });
    }

    if(!reparLecons.length){
      etat.textContent = 'Rien à corriger : les ' + cles.length +
                         ' élève(s) vérifié(s) ont la bonne note. ✅';
      return;
    }

    etat.textContent = reparLecons.length + ' cours à corriger :';
    zone.innerHTML = '';

    /* Avant et après, en entier : une réécriture en masse se lit
       avant de se lancer, et ce n'est plus un seul chiffre qui
       change — c'est toute la note. */
    reparLecons.forEach(x => {
      const d = document.createElement('div');
      d.style.cssText = 'border:1px solid var(--line);border-radius:9px;' +
        'padding:8px 11px;margin-top:6px;font-size:12px;line-height:1.55;';
      d.innerHTML =
        '<strong>' + reparTexte(x.eleve) + '</strong>' +
        (x.ecrit !== x.juste
          ? ' — <strong>' + x.ecrit + 'ème → ' + x.juste + 'ème leçon</strong>'
          : ' <span style="color:var(--muted);">— ' + x.juste +
            'ème leçon (note à remettre au propre)</span>') +
        (x.cours.date ? ' <span style="color:var(--muted);">(cours du ' +
          reparTexte(x.cours.date) + ')</span>' : '') +
        '<div style="color:var(--muted);margin-top:4px;white-space:pre-wrap;">' +
        'avant : ' + reparTexte(x.cours.note) + '</div>' +
        '<div style="color:var(--accent-text);margin-top:2px;white-space:pre-wrap;">' +
        'après : ' + reparTexte(x.note) + '</div>';
      zone.appendChild(d);
    });

    const bAppl = document.createElement('button');
    bAppl.className = 'btn btn-primary';
    bAppl.id = 'reparLeconsAppliquer';
    bAppl.style.cssText = 'margin-top:10px;padding:12px;font-size:14px;';
    bAppl.textContent = '✅ Corriger ces ' + reparLecons.length + ' cours';
    bAppl.addEventListener('click', appliquerNumerosLecon);
    zone.appendChild(bAppl);

  }catch(e){
    etat.textContent = 'Vérification impossible : ' + (e && e.message ? e.message : e);
  }finally{
    btn.disabled = false;
    btn.textContent = '🔢 Vérifier les cours préparés';
  }
}

async function appliquerNumerosLecon(){
  if(!reparLecons.length) return;

  if(!await confirmer('Corriger ' + reparLecons.length +
      ' cours préparé(s) ?\n\n' +
      'La note est refaite avec le bon numéro de leçon : la frise ' +
      'redevient lisible et la consigne du moniteur précédent est ' +
      'dédoublonnée.\n\n' +
      'Le type de bilan, le moniteur et l\'heure ne bougent pas. Les ' +
      'bilans déjà enregistrés ne sont pas touchés.')) return;

  const btn = $('reparLeconsAppliquer');
  const etat = $('reparLeconsEtat');
  if(btn) btn.disabled = true;

  let ok = 0;
  const rates = [];

  for(let i = 0; i < reparLecons.length; i++){
    const x = reparLecons[i];
    if(btn) btn.textContent = 'Correction ' + (i + 1) + ' sur ' + reparLecons.length + '…';

    try{
      const c = x.cours;
      const ctx = Object.assign({}, c.contexte || {});
      ctx.lecon = String(x.juste);

      /* La note a été refaite à la vérification, et c'est celle-là
         qu'on a montrée : on écrit exactement ce qui a été validé. */
      const note = x.note;

      await appelPrep({
        action: 'prepAdd', id: c.id, date: c.date,
        eleve: c.eleve, modele: c.modele,
        modeleLabel: c.modeleLabel || '',
        site: c.site || '',
        note: note,
        contexte: JSON.stringify(ctx),
        moniteur: c.moniteur || ''
      });

      /* La liste en mémoire suit, sans tout relire */
      const dans = (typeof prepares !== 'undefined')
        ? prepares.find(p => String(p.id) === String(c.id)) : null;
      if(dans){ dans.note = note; dans.contexte = ctx; }

      ok++;
    }catch(e){
      rates.push(x.eleve + ' : ' + (e && e.message ? e.message : e));
    }
  }

  reparLecons = [];
  if($('reparLeconsListe')) $('reparLeconsListe').innerHTML = '';
  if(etat){
    etat.textContent = ok + ' cours corrigé(s)' +
      (rates.length ? ' · ' + rates.length + ' échec(s) : ' + rates.join(' · ') : ' ✅');
  }
  showToast(ok + ' numéro(s) de leçon corrigé(s) ✅');
  if(typeof afficherPrepares === 'function') afficherPrepares();
}

/* ============================================================
   RÉPARER LES LIGNES D'EXAMEN DES NOTES

   La ligne « examen officiel » s'écrit maintenant en gras, en
   majuscules, et se colore à l'affichage — rouge quand la date
   existe, bleu quand elle manque. Mais cela ne vaut que pour les
   notes écrites depuis : une note plus ancienne porte un autre
   libellé, que rien ne reconnaît.

   Ce bouton les remet à la forme actuelle. Comme celui des
   numéros de leçon, il montre d'abord ce qu'il changerait :
   réécrire des notes sans les avoir lues serait imprudent.
   ============================================================ */
let reparNotes = [];

async function verifierNotesExamen(){
  const btn  = $('reparNotesBtn');
  const etat = $('reparNotesEtat');
  const zone = $('reparNotesListe');
  if(!btn || !etat || !zone) return;

  reparNotes = [];
  zone.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'Lecture…';
  etat.textContent = 'Lecture des notes…';

  try{
    const d = await appelPrep({ action: 'noteInterneList' });
    const liste = (d && d.notes) || [];

    liste.forEach(x => {
      /* Nettoyage complet : la ligne d'examen remise en forme, mais
         aussi les segments empilés au fil des cours — trois fois la
         même date d'examen, deux fois le même examen blanc. */
      const neuve = nettoyerNote(x.note);
      if(neuve && neuve !== x.note){
        reparNotes.push({ eleve: x.eleve, ligne: x.ligne,
                          avant: x.note, apres: neuve });
      }
    });

    if(!reparNotes.length){
      etat.style.color = 'var(--accent-text)';
      etat.textContent = '✅ ' + liste.length + ' note(s) relue(s) — ' +
        'aucune à nettoyer.';
      return;
    }

    etat.style.color = 'var(--warn-text)';
    const gagnes = reparNotes.reduce((n, x) =>
      n + (x.avant.split(/[·\n]/).filter(y => y.trim()).length -
           x.apres.split(' · ').length), 0);
    etat.textContent = reparNotes.length + ' note(s) à nettoyer, sur ' +
      liste.length + ' relue(s)' +
      (gagnes > 0 ? ' — ' + gagnes + ' ligne(s) en double à retirer.' : '.');

    reparNotes.forEach(x => zone.appendChild(ligneReparNote(x)));

    const b = document.createElement('button');
    b.className = 'btn btn-primary';
    b.id = 'reparNotesAppliquer';
    b.style.cssText = 'margin-top:10px;padding:12px;font-size:14px;';
    b.textContent = '✅ Nettoyer ces ' + reparNotes.length + ' note(s)';
    b.addEventListener('click', appliquerNotesExamen);
    zone.appendChild(b);

  }catch(e){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = '⚠️ ' + e.message;
  }finally{
    btn.disabled = false;
    btn.textContent = "🧹 Vérifier les notes internes";
  }
}

/* Avant et après, l'un sous l'autre : c'est la comparaison qui
   permet de dire oui, pas le nombre. */
function ligneReparNote(x){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:9px;' +
    'padding:8px 11px;margin-top:6px;font-size:12px;line-height:1.55;';
  d.innerHTML =
    '<strong>' + reparTexte(x.eleve) + '</strong>' +
    '<div style="color:var(--muted);margin-top:4px;">avant : ' +
    reparTexte(x.avant) + '</div>' +
    '<div style="color:var(--accent-text);margin-top:2px;">après : ' +
    reparTexte(x.apres) + '</div>';
  return d;
}

async function appliquerNotesExamen(){
  if(!reparNotes.length) return;

  if(!await confirmer('Nettoyer ' + reparNotes.length + ' note(s) ?\n\n' +
      "La ligne d'examen est remise en forme, et les lignes empilées en " +
      "double au fil des cours sont retirées — on garde la plus récente " +
      "de chaque sorte, comme dans les résumés.\n\n" +
      "Les remarques de tes moniteurs ne sont jamais jetées.\n\n" +
      "Seule la note la plus récente de chaque élève est touchée : les " +
      "bilans plus anciens gardent ce qu'ils disaient.")) return;

  const btn  = $('reparNotesAppliquer');
  const etat = $('reparNotesEtat');
  if(btn) btn.disabled = true;

  let ok = 0;
  const rates = [];

  for(let i = 0; i < reparNotes.length; i++){
    const x = reparNotes[i];
    if(btn) btn.textContent = 'Correction ' + (i + 1) + ' sur ' + reparNotes.length + '…';
    try{
      await appelPrep({ action: 'noteInterneSet', ligne: x.ligne,
                        eleve: x.eleve, note: x.apres });
      ok++;
    }catch(e){ rates.push(x.eleve + ' : ' + e.message); }
  }

  if(etat){
    etat.style.color = rates.length ? 'var(--warn-text)' : 'var(--accent-text)';
    etat.textContent = ok + ' note(s) nettoyée(s)' +
      (rates.length ? ' · ' + rates.length + ' en échec : ' + rates.join(' · ') : '') +
      ' — recharge la page pour voir les couleurs.';
  }
  showToast(rates.length ? 'Nettoyé, avec des échecs ⚠️' : ok + ' note(s) nettoyée(s) ✅');

  if(btn) btn.remove();
  reparNotes = [];
}

/* ============================================================
   RATTACHER LES COURS À LEUR RAPPEL

   « Rappel envoyé » et « présence confirmée » ne s'affichent que
   si le cours porte le JETON du rappel — celui qui identifie le
   lien de confirmation envoyé à l'élève.

   Il pouvait manquer pour trois raisons : le lien n'a pas pu être
   créé, le cours a été préparé sans passer par le rappel, ou le
   questionnaire l'a effacé en se refermant. Les deux dernières sont
   corrigées ; restent les cours déjà écrits.

   Le journal des envois, lui, garde tout : qui, quand, quel jeton.
   Il suffit de recoller les deux.
   ============================================================ */
let reparJetons = [];

/* Le jour d'un envoi, tel que le journal l'écrit */
function jourDeLEnvoi(quand){
  const t = String(quand || '');
  const m = t.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if(m) return m[3] + '-' + m[2] + '-' + m[1];
  const iso = t.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : '';
}

async function verifierJetonsRappel(){
  const btn  = $('reparJetonsBtn');
  const etat = $('reparJetonsEtat');
  const zone = $('reparJetonsListe');
  if(!btn || !etat || !zone) return;

  reparJetons = [];
  zone.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'Lecture…';
  etat.style.color = 'var(--muted)';
  etat.textContent = 'Lecture des cours et du journal…';

  try{
    const [p, j] = await Promise.all([
      appelPrep({ action: 'prepList' }),
      appelPrep({ action: 'smsList', combien: 300 })
    ]);

    const cours = (p && p.preparations) || [];
    const envois = ((j && j.sms) || []).filter(x => x.jeton);

    if(!envois.length){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = "Aucun envoi du journal ne porte de jeton. " +
        "C'est donc la création du lien de confirmation qui échoue, " +
        "pas son rattachement : les mails partent sans bouton.";
      return;
    }

    /* Le dernier envoi de chaque élève, par jour de cours */
    const parEleve = {};
    envois.forEach(x => {
      const k = normaliserMot(x.eleve || '');
      if(!k) return;
      if(!parEleve[k]) parEleve[k] = x;   /* la liste vient du plus récent */
    });

    cours.forEach(c => {
      let ctx = c.contexte;
      if(typeof ctx === 'string'){
        try{ ctx = JSON.parse(ctx); }catch(e){ ctx = null; }
      }
      if(ctx && ctx.jeton) return;               /* déjà rattaché */
      if(c.date && c.date < todayLocal()) return; /* passé : sans objet */

      const env = parEleve[normaliserMot(c.eleve || '')];
      if(!env || !env.jeton) return;

      reparJetons.push({ cours: c, contexte: Object.assign({}, ctx || {}),
                         jeton: env.jeton, quand: env.quand || '' });
    });

    if(!reparJetons.length){
      etat.style.color = 'var(--accent-text)';
      etat.textContent = '✅ Rien à rattacher : les ' + cours.length +
        ' cours à venir portent déjà leur rappel, ou n\'en ont pas reçu.';
      return;
    }

    etat.style.color = 'var(--warn-text)';
    etat.textContent = reparJetons.length + ' cours à rattacher à leur rappel :';

    reparJetons.forEach(x => {
      const d = document.createElement('div');
      d.style.cssText = 'border:1px solid var(--line);border-radius:9px;' +
        'padding:8px 11px;margin-top:6px;font-size:12px;line-height:1.55;';
      d.innerHTML = '<strong>' + reparTexte(x.cours.eleve) + '</strong>' +
        (x.cours.date ? ' <span style="color:var(--muted);">(cours du ' +
          reparTexte(x.cours.date) + ')</span>' : '') +
        '<div style="color:var(--muted);margin-top:3px;">rappel envoyé ' +
        reparTexte(x.quand) + '</div>';
      zone.appendChild(d);
    });

    const b = document.createElement('button');
    b.className = 'btn btn-primary';
    b.style.cssText = 'margin-top:10px;padding:12px;font-size:14px;';
    b.textContent = '✅ Rattacher ces ' + reparJetons.length + ' cours';
    b.addEventListener('click', appliquerJetonsRappel);
    zone.appendChild(b);

  }catch(e){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = '⚠️ ' + (e && e.message ? e.message : e);
  }finally{
    btn.disabled = false;
    btn.textContent = '✉️ Rattacher les rappels aux cours';
  }
}

async function appliquerJetonsRappel(){
  if(!reparJetons.length) return;

  if(!await confirmer('Rattacher ' + reparJetons.length + ' cours à leur ' +
      'rappel ?\n\nSeul le lien de confirmation est posé : la note, le ' +
      'type de bilan et le moniteur ne bougent pas.')) return;

  const etat = $('reparJetonsEtat');
  let ok = 0;
  const rates = [];

  for(const x of reparJetons){
    try{
      const ctx = Object.assign({}, x.contexte, { jeton: x.jeton });
      await appelPrep({
        action: 'prepAdd', id: x.cours.id, date: x.cours.date,
        eleve: x.cours.eleve, modele: x.cours.modele,
        modeleLabel: x.cours.modeleLabel || '',
        site: x.cours.site || '', note: x.cours.note || '',
        contexte: JSON.stringify(ctx),
        moniteur: x.cours.moniteur || ''
      });
      const dans = (typeof prepares !== 'undefined')
        ? prepares.find(y => String(y.id) === String(x.cours.id)) : null;
      if(dans) dans.contexte = ctx;
      ok++;
    }catch(e){ rates.push(x.cours.eleve + ' : ' + (e && e.message ? e.message : e)); }
  }

  reparJetons = [];
  if($('reparJetonsListe')) $('reparJetonsListe').innerHTML = '';
  if(etat){
    etat.style.color = rates.length ? 'var(--warn-text)' : 'var(--accent-text)';
    etat.textContent = ok + ' cours rattaché(s)' +
      (rates.length ? ' · ' + rates.length + ' échec(s) : ' + rates.join(' · ') : ' ✅');
  }
  showToast(ok + ' rappel(s) rattaché(s) ✅');
  if(typeof afficherPrepares === 'function') afficherPrepares(true);
}

brancher('reparJetonsBtn', 'click', verifierJetonsRappel);
brancher('reparNotesBtn', 'click', verifierNotesExamen);
brancher('reparLeconsBtn', 'click', verifierNumerosLecon);
