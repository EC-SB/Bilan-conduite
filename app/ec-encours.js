/* Déployé le 01/09/2026 à 14:31 — v773 */
/* ============================================================
   ec-encours.js
   Les cours qui n'ont pas abouti, chez tout le monde.

   Un moniteur bloqué ne le dit pas toujours, et quand il le dit
   c'est le lendemain. Son travail, lui, est déjà sur le serveur :
   la dictée y est déposée au fil du cours, sans attendre que le
   bilan soit généré. Il suffisait de pouvoir la regarder.

   Deux signaux, qui ne disent pas la même chose :
     • un cours DÉMARRÉ et jamais terminé — l'écran a été quitté,
       ou le bilan n'a jamais été enregistré ;
     • une dictée DÉPOSÉE sans bilan — c'est la génération qui a
       échoué, et c'est le cas qui bloque vraiment.

   ET UN TROISIÈME, QUI MANQUAIT : LE BILAN EST DÉJÀ LÀ.
   Cet écran déduisait l'absence d'un bilan de la présence d'un
   brouillon, sans jamais aller voir. « Ça me dit que le bilan
   n'est pas généré alors que je le vois bien sur Sheets. » Il
   avait raison de traîner, ce brouillon — il avait tort d'accuser.
   On lit maintenant les bilans enregistrés, et on ne se plaint
   que de ce qui manque pour de bon.

   Se donne dans ⚙️ Accès (droit « encours »).
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let brouillonsTous = null;
let coursEnCoursTous = null;
let bilansTous = null;

async function afficherEnCours(recharger){
  const zone = $('encoursZone');
  if(!zone) return;

  if(recharger) { brouillonsTous = null; coursEnCoursTous = null; bilansTous = null; }

  if(brouillonsTous === null){
    zone.innerHTML = (typeof htmlAttente === 'function')
      ? htmlAttente('Lecture des cours en cours…')
      : '<div class="empty">Lecture…</div>';
    try{
      /* Les trois ensemble : ils se complètent, et l'un ne doit pas
         faire attendre l'autre.

         LES BILANS SONT LE TROISIÈME, ET C'EST LE PLUS IMPORTANT.
         Cet écran accusait sans jamais aller vérifier : il disait
         « le bilan n'a jamais été enregistré » en ne regardant que
         les brouillons. Un brouillon qui traîne n'est pas la preuve
         qu'un bilan manque — c'est seulement la preuve qu'un
         brouillon traîne. */
      const [b, c, bi] = await Promise.all([
        appelPrep({ action: 'brouillonList', tous: 'oui' }),
        appelPrep({ action: 'coursEnCours' }).catch(() => null),
        appelPrep({ action: 'bilansRecents', combien: 400 }).catch(() => null)
      ]);
      brouillonsTous = (b && b.brouillons) || [];
      coursEnCoursTous = (c && c.cours) || [];
      bilansTous = (bi && bi.bilans) || [];
    }catch(e){
      zone.innerHTML = '<div class="empty">⚠️ ' +
        e.message.replace(/</g, '&lt;') + '</div>';
      return;
    }
  }

  zone.innerHTML = '';
  zone.appendChild(barreEnCours());

  if(!brouillonsTous.length && !coursEnCoursTous.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = '✅ <strong>Rien en attente.</strong><br>' +
      '<span style="font-size:12px;">Tous les cours démarrés ont été ' +
      'enregistrés, et aucune dictée n\'attend son bilan.</span>';
    zone.appendChild(v);
    return;
  }

  /* ------------------------------------------------------------
     D'ABORD : CEUX DONT LE BILAN EXISTE DÉJÀ

     « Ça me dit que le bilan n'est pas généré alors que je le vois
     bien sur Sheets. » L'écran ne l'avait jamais vérifié. Il
     déduisait l'absence de bilan de la présence d'un brouillon,
     et ces deux choses-là n'ont rien à voir : un brouillon
     redéposé après l'enregistrement (le téléphone qui s'endort
     sur la dictée encore à l'écran) restait là pour toujours.

     La cause est traitée ailleurs — le brouillon meurt maintenant
     à l'enregistrement, et le dépôt s'arrête après. Reste ce qui
     s'est accumulé avant, et le principe : ON VÉRIFIE AVANT
     D'ACCUSER. */
  const dejaFaits = brouillonsTous.filter(b =>
    b.etat !== 'a-corriger' && bilanExistant(b));

  const restePlainte = brouillonsTous.filter(b => dejaFaits.indexOf(b) === -1);

  if(dejaFaits.length){
    zone.appendChild(titreBloc('✅ Bilan déjà enregistré — dictée à effacer',
      dejaFaits.length,
      "Le bilan de ces cours est bien dans le classeur : il n'y a RIEN à " +
      "reprendre. C'est la dictée qui est restée sur le serveur. Tu peux " +
      'l\'effacer sans risque — le bilan, lui, ne bouge pas.'));
    dejaFaits
      .slice()
      .sort((a, b) => String(b.deposeLe || '').localeCompare(String(a.deposeLe || '')))
      .forEach(b => zone.appendChild(ligneBrouillon(b)));
  }

  /* Ce que le bureau a déjà repris et renvoyé : ce n'est plus à
     lui d'agir, c'est au moniteur — mais il faut pouvoir le
     relancer s'il ne le fait jamais. */
  const aCorriger = restePlainte.filter(b => b.etat === 'a-corriger');

  /* CE QUI EST EN TRAIN DE SE GÉNÉRER.

     Le moniteur a appuyé sur « Terminer », l'IA travaille. Ce
     n'est pas un cours en panne, et le ranger avec les dictées
     sans bilan faisait chercher un problème là où il n'y en avait
     pas encore.

     Passé une demi-heure, ce n'est plus une génération en cours :
     c'est une génération qui n'a jamais abouti. La ligne redescend
     alors d'elle-même chez les cours en panne — l'état ne s'efface
     qu'au moment où le bilan est enregistré, et son âge fait le
     reste. */
  const enGeneration = restePlainte.filter(b =>
    b.etat === 'en-generation' && depuisDepot(b) < 30);

  const dictees = restePlainte.filter(b =>
    b.etat !== 'a-corriger' && enGeneration.indexOf(b) === -1);

  if(enGeneration.length){
    zone.appendChild(titreBloc('⚙️ Bilans en cours de génération',
      enGeneration.length,
      "L'IA travaille en ce moment sur ces cours. Il n'y a rien à " +
      'faire : ils disparaîtront d\'eux-mêmes une fois enregistrés. ' +
      'S\'ils sont encore là dans une demi-heure, ils passeront plus ' +
      'bas — c\'est que la génération a échoué.'));
    enGeneration
      .slice()
      .sort((a, b) => String(b.deposeLe || '').localeCompare(String(a.deposeLe || '')))
      .forEach(b => zone.appendChild(ligneBrouillon(b)));
  }

  if(aCorriger.length){
    zone.appendChild(titreBloc('⏳ Bilans renvoyés, en attente de correction',
      aCorriger.length,
      "Tu les as générés, le moniteur doit les relire et les enregistrer. " +
      "S'ils traînent, relance-le."));
    aCorriger
      .slice()
      .sort((a, b) => String(b.deposeLe || '').localeCompare(String(a.deposeLe || '')))
      .forEach(b => zone.appendChild(ligneBrouillon(b)));
  }

  if(dictees.length){
    /* On ne dit « sans bilan » que si on a pu aller regarder. Sans
       la liste des bilans — droit « recherche » absent, appel en
       échec — l'écran ne sait rien, et il doit le dire au lieu
       d'affirmer. */
    const aPuVerifier = !!(bilansTous && bilansTous.length);
    zone.appendChild(titreBloc('✍️ Dictées sans bilan', dictees.length,
      aPuVerifier
        ? 'Vérifié : aucun bilan enregistré pour ces cours. La dictée est ' +
          'sur le serveur, le bilan n\'a jamais été fait. C\'est le cas qui ' +
          'bloque vraiment — tu peux le reprendre ici.'
        : "⚠️ Je n'ai pas pu lire les bilans enregistrés : ces dictées " +
          "traînent, mais leur bilan a peut-être été fait. Vérifie dans " +
          'Sheets avant de reprendre quoi que ce soit.'));
    dictees
      .slice()
      .sort((a, b) => String(b.deposeLe || '').localeCompare(String(a.deposeLe || '')))
      .forEach(b => zone.appendChild(ligneBrouillon(b)));
  }

  /* Un cours démarré dont la dictée est déjà déposée figure déjà
     au-dessus : le répéter ferait croire à deux problèmes. */
  const restants = (coursEnCoursTous || []).filter(c =>
    !brouillonsTous.some(b =>
      normaliserMot(b.eleve || '') === normaliserMot(c.eleve || '')));

  if(restants.length){
    zone.appendChild(titreBloc('⏺️ Cours démarrés, non terminés', restants.length,
      'Le cours a été lancé et le signal de fin n\'est jamais arrivé — ' +
      'écran fermé, réseau coupé. Rien n\'a encore été dicté, ou rien ' +
      'n\'est remonté.'));
    restants.forEach(c => zone.appendChild(ligneEnCours(c)));
  }
}

function barreEnCours(){
  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;';

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;padding:10px 14px;font-size:13px;margin:0;';
  b.textContent = '🔄 Actualiser';
  b.addEventListener('click', () => afficherEnCours(true));
  r.appendChild(b);

  const i = document.createElement('div');
  i.style.cssText = 'flex:1;font-size:12px;color:var(--muted);line-height:1.5;';
  i.textContent = "Ce que tes moniteurs ont commencé et n'ont pas fini.";
  r.appendChild(i);
  return r;
}

function titreBloc(titre, combien, explication){
  const d = document.createElement('div');
  d.style.cssText = 'margin:16px 0 8px;';
  d.innerHTML = '<h3 style="margin:0;font-size:14px;">' + titre +
    ' <span style="color:var(--muted);font-weight:400;">(' + combien + ')</span></h3>' +
    '<div style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:3px;">' +
    explication + '</div>';
  return d;
}

/* Depuis combien de temps ça traîne : c'est ce qui distingue un
   cours de tout à l'heure d'un moniteur bloqué depuis hier soir. */
function depuisQuand(texte){
  const m = String(texte || '').match(/(\d{2})\/(\d{2})\/(\d{4})[ àT]+(\d{1,2})[h:](\d{2})/);
  if(!m) return '';
  const d = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
  const h = Math.floor((Date.now() - d.getTime()) / 3600000);
  if(isNaN(h) || h < 0) return '';
  if(h < 1) return "à l'instant";
  if(h < 24) return 'il y a ' + h + ' h';
  const j = Math.floor(h / 24);
  return 'il y a ' + j + ' jour' + (j > 1 ? 's' : '');
}

/* Depuis combien de MINUTES la dictée a-t-elle été déposée.

   « depuisQuand » arrondit à l'heure, ce qui suffit pour dire
   qu'un cours traîne ; pour distinguer une génération en route
   d'une génération abandonnée, il faut la minute. Une date
   illisible rend l'infini : dans le doute, on ne dit pas qu'un
   bilan est en train de se faire. */
function depuisDepot(b){
  const m = String((b && b.deposeLe) || '')
    .match(/(\d{2})\/(\d{2})\/(\d{4})[ àT]+(\d{1,2})[h:](\d{2})/);
  if(!m) return Infinity;
  const d = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
  const min = (Date.now() - d.getTime()) / 60000;
  return (isNaN(min) || min < 0) ? Infinity : min;
}

/* « 2026-08-28 » se lit mal quand on cherche vite : on le rend
   dans la forme qu'on écrit en français. */
function dateLisible(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(iso || '');
}

/* ------------------------------------------------------------
   LE BILAN DE CE COURS EXISTE-T-IL VRAIMENT

   Une date se présente ici sous deux formes — « 2026-08-28 » côté
   brouillon, « 28/08/2026 » côté bilan — et les comparer telles
   quelles ne trouvait jamais rien. On les ramène toutes les deux à
   la même : c'est la seule façon de répondre à la question au lieu
   de la supposer.
   ------------------------------------------------------------ */
function jourDe(texte){
  const t = String(texte || '').trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return m[1] + '-' + m[2] + '-' + m[3];
  m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

/* Le bilan enregistré qui correspond à ce brouillon, s'il existe.
   Même élève, même jour de cours. Sans date de cours notée, on ne
   conclut rien : mieux vaut une plainte de trop qu'une dictée
   effacée à tort. */
function bilanExistant(b){
  if(!bilansTous || !bilansTous.length) return null;
  const jour = jourDe(b && b.dateCours);
  if(!jour) return null;
  const qui = normaliserMot(String((b && b.eleve) || ''));
  if(!qui) return null;

  for(let i = 0; i < bilansTous.length; i++){
    const x = bilansTous[i];
    if(normaliserMot(String(x.eleve || '')) !== qui) continue;
    if(jourDe(x.date) !== jour) continue;
    return x;
  }
  return null;
}

function carte(){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
    'padding:10px 12px;margin-bottom:7px;';
  return d;
}

function ligneBrouillon(b){
  const d = carte();
  const age = depuisQuand(b.deposeLe);
  /* Au-delà de huit heures, ce n'est plus un cours en route : c'est
     quelqu'un qui n'y arrive pas. C'est le seuil qui aurait fait
     ressortir la monitrice bloquée à 20h dès le lendemain matin. */
  const vieux = /jour/.test(age) ||
                (/il y a (\d+) h/.test(age) && parseInt(RegExp.$1, 10) >= 8);

  const mots = String(b.transcript || '').trim().split(/\s+/).filter(Boolean).length;
  const fait = bilanExistant(b);

  d.innerHTML =
    '<div style="font-size:14px;font-weight:700;">' +
      (b.eleve || '(sans nom)').replace(/</g, '&lt;') +
      ' <span style="font-weight:400;color:var(--muted);font-size:12px;">' +
      '· 👤 ' + String(b.moniteur || '?').replace(/</g, '&lt;') + '</span>' +
    '</div>' +
    '<div style="font-size:12px;color:' +
      (vieux ? 'var(--warn-text)' : 'var(--muted)') + ';line-height:1.6;">' +
      (b.dateCours ? '📅 ' + dateLisible(b.dateCours) + ' · ' : '') +
      (b.deposeLe ? 'déposé le ' + b.deposeLe : '') +
      (age ? ' · ' + (vieux ? '⚠️ ' : '') + age : '') +
      ' · ' + mots + ' mots dictés' +
      (b.etat === 'a-corriger'
        ? '<br><span style="color:var(--bleu);">📝 bilan proposé — ' +
          'en attente de sa correction</span>'
        : '') +
      (b.etat === 'en-generation'
        ? (depuisDepot(b) < 30
            ? '<br><span style="color:var(--accent-text);">⚙️ génération ' +
              'en cours…</span>'
            /* La même ligne dit la panne : le bilan a été lancé et
               n'est jamais revenu. C'est plus précis que « dictée
               sans bilan », et ça oriente. */
            : '<br><span style="color:var(--warn-text);">⚙️ génération ' +
              'lancée, jamais aboutie</span>')
        : '') +
      /* CE QUE L'ÉCRAN NE DISAIT PAS. On nomme le bilan trouvé,
         avec sa date d'enregistrement : sans ça, « déjà
         enregistré » se croit sur parole, exactement comme
         « jamais enregistré » se croyait avant. */
      (fait
        ? '<br><span style="color:var(--accent-text);">✅ bilan enregistré' +
          (fait.horodatage ? ' le ' + String(fait.horodatage).replace(/</g, '&lt;') : '') +
          (fait.moniteur ? ' par ' + String(fait.moniteur).replace(/</g, '&lt;') : '') +
          ' — il n\'y a rien à reprendre</span>'
        : '') +
    '</div>';

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:7px;margin-top:9px;';

  /* Reprendre n'a plus de sens quand le bilan est déjà là : le
     bouton principal devient l'effacement. */
  if(!fait){
    const bR = document.createElement('button');
    bR.className = 'btn btn-primary';
    bR.style.cssText = 'flex:1;padding:10px;font-size:13px;margin:0;';
    const enAttente = (b.etat === 'a-corriger');
    bR.textContent = enAttente ? '👁️ Revoir le bilan proposé' : '↩️ Reprendre ici';
    bR.title = enAttente
      ? "Le bilan est déjà généré et l'attend : ceci le rouvre chez toi"
      : "Charge sa dictée dans ton écran pour générer le bilan à sa place";
    bR.addEventListener('click', async () => {
      if(typeof reprendreBrouillonServeur !== 'function'){
        showToast('Reprise indisponible sur cet écran.');
        return;
      }
      await reprendreBrouillonServeur(b);
    });
    r.appendChild(bR);
  }

  /* ------------------------------------------------------------
     EFFACER LA DICTÉE

     Il n'y avait aucun moyen de sortir une ligne de cette liste :
     elle restait, on la relisait chaque semaine, et une liste
     qu'on apprend à ignorer ne sert plus à rien.

     L'identifiant part avec la demande, et c'est essentiel :
     sans lui, le classeur cherche « le brouillon de CE moniteur
     pour cet élève » — or celui qui appuie ici, c'est le bureau.
     La ligne du moniteur n'aurait pas bougé, et l'écran aurait
     annoncé un effacement qui n'a pas eu lieu.
     ------------------------------------------------------------ */
  const bX = document.createElement('button');
  bX.className = fait ? 'btn btn-primary' : 'btn btn-secondary';
  bX.style.cssText = (fait ? 'flex:1;' : 'width:auto;') +
    'padding:10px 13px;font-size:13px;margin:0;';
  bX.textContent = fait ? '🗑️ Effacer la dictée' : '🗑️';
  bX.title = "Retire la dictée du serveur. Ne touche à aucun bilan.";
  bX.addEventListener('click', async () => {
    const quoi = (b.eleve || 'cet élève') +
                 (b.dateCours ? ' du ' + dateLisible(b.dateCours) : '');
    const ok = await (typeof confirmer === 'function'
      ? confirmer('🗑️ Effacer la dictée de ' + quoi + ' ?\n\n' +
          (fait
            ? 'Son bilan est enregistré : il ne sera pas touché. Seule la ' +
              'dictée restée sur le serveur part.'
            : "⚠️ ATTENTION : aucun bilan n'a été trouvé pour ce cours. Si " +
              'tu effaces, la dictée est perdue et personne ne pourra plus ' +
              'générer le bilan. Reprends-la plutôt, ou vérifie dans Sheets.'))
      : Promise.resolve(window.confirm('Effacer la dictée de ' + quoi + ' ?')));
    if(!ok) return;

    bX.disabled = true;
    bX.textContent = '…';
    try{
      await appelPrep({ action: 'brouillonDelete', id: b.id, eleve: b.eleve });
      showToast('Dictée effacée ✅');
      afficherEnCours(true);
    }catch(e){
      showToast("Effacement impossible : " + e.message);
      bX.disabled = false;
      bX.textContent = fait ? '🗑️ Effacer la dictée' : '🗑️';
    }
  });
  r.appendChild(bX);

  const bV = document.createElement('button');
  bV.className = 'btn btn-secondary';
  bV.style.cssText = 'width:auto;padding:10px 13px;font-size:13px;margin:0;';
  bV.textContent = '👁️';
  bV.title = 'Lire la dictée sans la reprendre';
  bV.addEventListener('click', () => {
    const z = d.querySelector('.dictee');
    if(z) z.style.display = (z.style.display === 'none') ? 'block' : 'none';
  });
  r.appendChild(bV);

  d.appendChild(r);

  const z = document.createElement('div');
  z.className = 'dictee';
  z.style.cssText = 'display:none;margin-top:9px;font-size:12px;line-height:1.6;' +
    'white-space:pre-wrap;color:var(--muted);background:var(--navy);' +
    'padding:9px 11px;border-radius:8px;max-height:280px;overflow-y:auto;';
  z.textContent = b.transcript || '(dictée vide)';
  d.appendChild(z);

  return d;
}

function ligneEnCours(c){
  const d = carte();
  const age = depuisQuand(c.debut || c.quand || c.depuis);
  /* Même vérification que pour les dictées : le cours a pu être
     enregistré sans que le signal de fin arrive. */
  const fait = bilanExistant({ eleve: c.eleve, dateCours: c.debut });

  d.innerHTML =
    '<div style="font-size:14px;font-weight:700;">' +
      String(c.eleve || '(sans nom)').replace(/</g, '&lt;') +
      ' <span style="font-weight:400;color:var(--muted);font-size:12px;">' +
      '· 👤 ' + String(c.moniteur || '?').replace(/</g, '&lt;') + '</span>' +
    '</div>' +
    '<div style="font-size:12px;color:var(--muted);line-height:1.6;">' +
      'démarré' + (c.debut ? ' le ' + String(c.debut).replace(/</g, '&lt;') : '') +
      (age ? ' · ' + age : '') +
      (fait
        ? '<br><span style="color:var(--accent-text);">✅ son bilan est ' +
          'pourtant enregistré' +
          (fait.horodatage ? ' (' + String(fait.horodatage).replace(/</g, '&lt;') + ')' : '') +
          " — seul le signal de fin n'est jamais arrivé.</span>"
        : '<br>Rien de dicté n\'est remonté : il n\'y a rien à reprendre ici. ' +
          'Demande-lui si son cours a bien été enregistré.') +
    '</div>';

  /* Une liste dont on ne peut rien sortir finit par s'ignorer. */
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;padding:9px 13px;font-size:13px;margin:9px 0 0;' +
    'color:var(--red);border-color:var(--red);';
  b.textContent = '✕ Retirer de la liste';
  b.title = "Retire la mention « en cours ». Aucun bilan n'est supprimé.";
  b.addEventListener('click', async () => {
    const ok = await (typeof confirmer === 'function'
      ? confirmer('Retirer ce cours de la liste ?\n\n' +
          (c.moniteur || '?') + ' — ' + (c.eleve || 'élève non saisi') + '\n\n' +
          "Cela ne supprime aucun bilan : ça retire seulement la mention " +
          '« en cours ». Si le moniteur enregistre plus tard, son bilan ' +
          'sera bien pris en compte.')
      : Promise.resolve(window.confirm('Retirer ce cours de la liste ?')));
    if(!ok) return;

    b.disabled = true;
    b.textContent = '…';
    try{
      await appelPrep({ action: 'coursRetirer',
                        moniteur: c.moniteur, eleve: c.eleve });
      showToast('Retiré de la liste ✅');
      afficherEnCours(true);
    }catch(e){
      showToast('Retrait impossible : ' + e.message);
      b.disabled = false;
      b.textContent = '✕ Retirer de la liste';
    }
  });
  d.appendChild(b);

  return d;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-encours.js'] = true;
