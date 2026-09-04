/* Déployé le 04/09/2026 à 09:03 — v856 */
/* ============================================================
   ec-postpermis.js
   Après l'examen : résultat, repassage, rendez-vous post-permis.
   Calendrier de prise des dates et disponibilités des élèves.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   SUITE À DONNER APRÈS UN RENDEZ-VOUS POST-PERMIS
   ============================================================ */
const SUITES_POST = [
  { cle:'3h',         nom:'➕ 3h avant repassage' },
  { cle:'2h',         nom:'🚗 Une leçon de 2h pour refaire le point' },
  { cle:'impossible', nom:'⛔ Pas de repassage possible pour le moment' }
];

function libelleSuite(cle){
  const s = SUITES_POST.find(x => x.cle === cle);
  return s ? s.nom : '';
}

/* Mention du repassage, telle qu'elle apparaît dans les notes */
function mentionAjournements(n, date){
  const v = parseInt(n, 10);
  if(!v) return '';
  return '🔁 ' + v + (v === 1 ? 'er' : 'e') + ' repassage' +
         (date ? ' (ajourné le ' + dateEnToutesLettres(date) + ')' : '');
}


/* ============================================================
   1. EXAMENS PASSÉS — résultat à saisir
   Le lendemain de la date, l'élève attend son résultat.
   ============================================================ */
async function afficherPostExamen(tous){
  const zone = $('listePostExamen');
  if(!zone) return;
  const auj = todayLocal();

  const attente = tous.filter(e => {
    const s = suiviDe(e.eleve);
    if(s.resultat) return false;
    const iso = e._iso || dateFrVersIso(s.datePermis || '');
    return iso && iso < auj;
  });

  zone.innerHTML = '';
  if(!attente.length){
    zone.innerHTML = '<div class="empty">Aucun résultat en attente.</div>';
    return;
  }

  /* ------------------------------------------------------------
     QUAND LA SESSION ET LA FICHE NE DISENT PAS LA MÊME CHOSE

     Deux endroits écrivent qui est convoqué et quand : la place
     tenue sur une session, et « datePermis » sur la fiche de
     suivi. Les deux sens du désaccord se voient ici :

       · une PLACE sans date sur la fiche — c'était Romain Kikela
         le 3 septembre, absent de cette liste jusqu'ici ;
       · une DATE sans place — les « anciens noms » retirés des
         sessions et restés dans la liste.

     On ne répare rien tout seul : on le DIT, sur la ligne de
     l'élève. Effacer une date d'examen sur un doute, ce serait
     rejouer le bouton qui a effacé une matinée d'examens.
     ------------------------------------------------------------ */
  const sessionsConnues = (typeof sessionsPermis !== 'undefined') &&
                          (sessionsPermis || []).length > 0 &&
                          typeof placeEnSessionDe === 'function';
  const mentionDesaccord = (x, s) => {
    if(!sessionsConnues) return '';
    if(x._sansDateDeSuivi) return ' · ⚠️ sa place sur la session, mais aucune date sur sa fiche';
    if(String(s.datePermis || '').trim() && !placeEnSessionDe(x.eleve)){
      return ' · ⚠️ une date sur sa fiche, mais plus de place sur aucune session';
    }
    return '';
  };

  majVolet('cptPasses', attente.length, attente.length > 0);
  attente.forEach(e => {
    const s = suiviDe(e.eleve);
    const iso = e._iso || dateFrVersIso(s.datePermis || '');
    zone.appendChild(ligneBureau(e, {
      info: x => 'Examen passé le ' + (x._datePermis || s.datePermis || iso) +
                 (s.nbAjournements
                   ? ' · ' + mentionAjournements(s.nbAjournements, s.dateAjournement) : '') +
                 mentionDesaccord(x, s),
      resume: () => '',
      alerte: () => 'Résultat à saisir',
      actions: (x, boite) => {
        const r = document.createElement('div');
        r.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

        const bOk = document.createElement('button');
        bOk.className = 'btn btn-primary';
        bOk.style.cssText = 'width:auto;padding:10px 14px;font-size:14px;';
        bOk.textContent = '✅ Permis obtenu';
        bOk.addEventListener('click', async () => {
          if(!await confirmer(x.eleve + ' a obtenu son permis ?')) return;
          bOk.disabled = true;
          try{
            await consignerResultat(x, 'obtenu', iso);
            /* Il sort de toutes les listes de suivi */
            for(const cs of (x.enAttente || [])){
              try{ await appelPrep({ action:'consigneDone', id: cs.id }); }catch(err){}
            }
            await appelPrep({ action:'suiviDelete', eleve: x.eleve });

            $('permisNom').value = x.eleve;
            if(typeof afficherOnglet === 'function'){
              afficherOnglet('eleves');
              afficherVue('eleves', 'permis');
            }
            await preparerPermis();
            afficherBureau();
            showToast('Messages prêts dans le module permis ✅');

            /* Un permis obtenu en automatique ouvre la passerelle.
               La question se pose ICI, tout de suite : dans une
               semaine, plus personne ne saura qu'il vient d'obtenir
               un B78. Elle ne bloque rien — le permis est déjà
               enregistré à ce stade. */
            try{ await proposerPasserelle(x, boiteDePostPermis(x)); }
            catch(err){ showToast('Passerelle : ' + err.message); }
          }catch(err){ showToast('Erreur : ' + err.message); bOk.disabled = false; }
        });
        r.appendChild(bOk);

        /* Les captures du CEPC : elles vous servent à décider ici,
           et suivront jusqu'au rendez-vous post-permis. */
        boite.appendChild(blocCaptures(x.eleve, iso));

        const bNon = document.createElement('button');
        bNon.className = 'btn btn-secondary';
        bNon.style.cssText = 'width:auto;padding:10px 14px;font-size:14px;' +
          'color:var(--red);border-color:var(--red);';
        bNon.textContent = '❌ Ajourné';
        bNon.addEventListener('click', async () => {
          if(!await confirmer(x.eleve + " est ajourné ?\n\n" +
                              "Il passe en attente de son bilan d'examen,\n" +
                              'puis du rendez-vous post-permis.')) return;
          bNon.disabled = true;
          try{
            await consignerResultat(x, 'ajourne', iso);
            const n = (parseInt(s.nbAjournements, 10) || 0) + 1;
            const dateAjo = iso || todayLocal();
            await majSuivi(x.eleve, {
              resultat: 'ajourne',
              nbAjournements: String(n),
              dateAjournement: dateAjo,
              datePermis: '', aPlanifier: '', retireAPrevoir: '',
              toutOk: '', aRemplacer: '', dateADonner: '', fantome: '',
              rdvPostDate: '', rdvPostMoniteur: '', rdvPostFait: '',
              bilanExamen: '', suite: '', commentaireMoniteur: ''
            });
            for(const cs of (x.enAttente || [])){
              try{ await appelPrep({ action:'consigneDone', id: cs.id }); }catch(err){}
            }
            await envoyerConsigne(x.eleve, 'permis',
              'Ajourné le ' + dateEnToutesLettres(dateAjo) + ' — ' +
              mentionAjournements(n) +
              " · bilan d'examen et rendez-vous post-permis à prévoir (bureau)");
            showToast(x.eleve + ' est en attente de son bilan');
            afficherBureau();

            /* Les quatre messages à lui envoyer : sans ce rappel,
               ils se faisaient de mémoire. */
            setTimeout(() => ouvrirMessagesAjourne(x.eleve), 400);
          }catch(err){ showToast('Erreur : ' + err.message); bNon.disabled = false; }
        });
        r.appendChild(bNon);

        /* ------------------------------------------------------
           IL N'Y EST PAS ALLÉ

           Chrystel : « j'ai des élèves qui n'ont pas passé leur
           permis, il faut que je puisse les enlever ».

           Ni « obtenu » ni « ajourné » : la troisième réponse
           manquait, et c'est la seule qui soit vraie quand
           l'examen n'a pas eu lieu. Un ajournement fabriqué à sa
           place aurait compté un repassage de plus et déclenché
           tout le suivi post-permis pour rien.

           Sa date s'efface — des deux endroits où elle vit, la
           fiche de suivi ET la note du dernier cours — et il
           repart dans les élèves prêts au permis, où le bureau le
           replacera.
           ------------------------------------------------------ */
        const bAbs = document.createElement('button');
        bAbs.className = 'btn btn-secondary';
        bAbs.style.cssText = 'width:auto;padding:10px 14px;font-size:14px;';
        bAbs.textContent = "🚫 Ne l'a pas passé";
        bAbs.title = "L'examen n'a pas eu lieu : sa date s'efface et il " +
                     'repart dans les élèves prêts au permis';
        bAbs.addEventListener('click', async () => {
          /* ⚠️ SA PLACE AUSSI, PAS SEULEMENT SA DATE.

             Effacer la date sans libérer la place le laissait entre
             deux listes : « Élèves prêts au permis » voyait sa place
             et l'écartait, pendant que cette liste-ci, qui lit les
             sessions passées depuis la v849, continuait de lui
             réclamer un résultat. Il n'aurait été nulle part —
             exactement le défaut qu'on venait de réparer.

             Et c'est la vérité : il n'y est pas allé, il ne tenait
             donc pas cette place. La confirmation le dit. */
          const place = (typeof placeEnSessionDe === 'function')
            ? placeEnSessionDe(x.eleve) : null;
          if(!await confirmer(x.eleve + " n'a pas passé son examen ?\n\n" +
              "Sa date est effacée et il repart dans « Élèves prêts au " +
              "permis ».\nAucun repassage n'est compté." +
              (place ? "\n\nSa place du " + (place.date || '?') +
                       ' redevient libre.' : ''))) return;
          bAbs.disabled = true;
          try{
            if(place && place.session && place.place){
              try{
                await appelPrep({ action:'sessionPlace',
                                  idSession: place.session.id,
                                  rang: place.place.rang, eleve: '',
                                  prevenu: '', dossierOk: '', remarque: '' });
                place.place.eleve = '';
                if(typeof sessionsPermis !== 'undefined') sessionsPermis = [];
              }catch(e2){
                /* La place n'a pas pu être libérée : on le DIT, sinon
                   il repart dans une liste tout en restant coincé
                   dans l'autre. */
                showToast('⚠️ Sa place n’a pas pu être libérée — ' +
                          'vide-la à la main dans la session.');
              }
            }
            await majSuivi(x.eleve, {
              datePermis: '', aPlanifier: '', retireAPrevoir: '', statut: ''
            });
            /* La note du dernier cours annonce encore la
               convocation, et le bureau ne peut pas la réécrire :
               c'est la dernière annonce qui fait foi. */
            await envoyerConsigne(x.eleve, 'permis',
                                  "Date d'examen à prévoir (bureau)");
            if(typeof viderCaches === 'function') viderCaches(x.eleve);
            showToast(x.eleve + ' → prêt au permis ✅');
            afficherBureau(true);
          }catch(err){
            showToast('Erreur : ' + err.message);
            bAbs.disabled = false;
          }
        });
        r.appendChild(bAbs);

        boite.appendChild(r);
      }
    }));
  });
}


/* ============================================================
   2. EN ATTENTE DU BILAN D'EXAMEN
   Ajournés dont le bilan ou le rendez-vous manque encore.
   ============================================================ */
function afficherAttenteBilan(tous){
  const zone = $('listeAttenteBilan');
  if(!zone) return;

  const ajournes = tous.filter(e => {
    const s = suiviDe(e.eleve);
    return s.resultat === 'ajourne' && s.rdvPostFait !== 'oui';
  });

  /* Dossier complet : bilan reçu, date et moniteur fixés.
     Il n'y a plus rien à faire ici, le cours est préparé. */
  const complet = s => !!(s.bilanExamen && s.rdvPostDate && s.rdvPostMoniteur);
  const liste = ajournes.filter(e => !complet(suiviDe(e.eleve)));
  const prets = ajournes.filter(e => complet(suiviDe(e.eleve)));

  zone.innerHTML = '';

  /* Les dossiers bouclés restent consultables, sans encombrer */
  if(prets.length){
    const det = document.createElement('details');
    det.style.cssText = 'margin-bottom:8px;';
    det.innerHTML = '<summary style="cursor:pointer;font-size:12px;color:var(--muted);">✅ ' +
      prets.length + ' rendez-vous déjà organisé(s)</summary>';
    const l = document.createElement('div');
    l.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.7;padding:6px 2px;';
    prets.forEach(e => {
      const s = suiviDe(e.eleve);
      const ligne = document.createElement('div');
      ligne.style.cssText = 'display:flex;align-items:center;gap:8px;padding:3px 0;';

      const t = document.createElement('span');
      t.style.cssText = 'flex:1;min-width:0;';
      t.textContent = e.eleve + ' — ' + dateEnToutesLettres(s.rdvPostDate) +
                      ' avec ' + s.rdvPostMoniteur;
      ligne.appendChild(t);

      /* Reprendre le rendez-vous, s'il a été interrompu */
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:auto;padding:5px 9px;font-size:12px;margin:0;flex-shrink:0;';
      b.textContent = '↗️ Reprendre';
      b.title = 'Rouvrir le rendez-vous post-permis';
      b.addEventListener('click', () => {
        ouvrirRdvPost({ eleve: e.eleve, date: s.rdvPostDate,
                        moniteur: s.rdvPostMoniteur, note: '', modele: 'rdv-post' });
      });
      ligne.appendChild(b);

      l.appendChild(ligne);
    });
    det.appendChild(l);
    zone.appendChild(det);
  }

  if(!liste.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = prets.length
      ? 'Tous les rendez-vous sont organisés.'
      : 'Aucun élève en attente.';
    zone.appendChild(v);
    return;
  }

  /* Le bilan manquant passe devant */
  liste.sort((a, b) => {
    const sa = suiviDe(a.eleve), sb = suiviDe(b.eleve);
    return (sa.bilanExamen ? 1 : 0) - (sb.bilanExamen ? 1 : 0);
  });

  majVolet('cptAttente', liste.length, liste.length > 0);
  liste.forEach(e => {
    const s = suiviDe(e.eleve);
    const aBilan = !!s.bilanExamen;
    const aRdv = !!(s.rdvPostDate && s.rdvPostMoniteur);

    zone.appendChild(ligneBureau(e, {
      replier: true,
      info: () => mentionAjournements(s.nbAjournements, s.dateAjournement) +
                  (aBilan
                    ? (aRdv
                        ? ' · rendez-vous le ' + dateEnToutesLettres(s.rdvPostDate) +
                          ' avec ' + s.rdvPostMoniteur
                        : ' · bilan reçu, rendez-vous à fixer')
                    : " · bilan d'examen à récupérer"),
      resume: () => '',
      alerte: () => aBilan ? (aRdv ? null : 'Rendez-vous à fixer')
                           : "Bilan d'examen manquant",
      actions: (x, boite) => { boite.appendChild(blocRdvPost(x)); }
    }));
  });
}


/* Préparation d'un rendez-vous post-permis pour un ajourné */
function blocRdvPost(e){
  const s = suiviDe(e.eleve);
  const id = 'rp' + Math.random().toString(36).slice(2, 8);

  const det = document.createElement('details');
  det.style.cssText = 'margin-top:10px;';
  det.innerHTML = '<summary style="cursor:pointer;color:var(--accent-text);font-weight:600;' +
    'font-size:14px;">🔁 Rendez-vous post-permis' +
    (s.rdvPostDate ? ' — ' + dateEnToutesLettres(s.rdvPostDate) : ' — à prévoir') + '</summary>';

  const f = document.createElement('div');
  f.style.cssText = 'margin-top:10px;padding:12px;background:var(--navy);' +
    'border:1px solid var(--line);border-radius:10px;';
  const zoneTexte = 'width:100%;background:var(--navy-deep);border:1px solid var(--line);' +
    'color:var(--cream);padding:10px;border-radius:10px;font-size:14px;line-height:1.5;' +
    'font-family:inherit;resize:vertical;margin-bottom:14px;';

  f.innerHTML =
    '<label for="' + id + 'b">📄 Bilan de l\'examen officiel</label>' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 6px;line-height:1.4;">' +
      "Le rapport de l'inspecteur. Laisse vide s'il n'y en a pas.</div>" +
    '<textarea id="' + id + 'b" rows="5" placeholder="Rapport transmis par l\'inspecteur" ' +
      'style="' + zoneTexte + '"></textarea>' +

    '<label for="' + id + 'e">📝 Bilan écrit par l\'élève</label>' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 6px;line-height:1.4;">' +
      'Ce que l\'élève a envoyé par Messenger. Le moniteur le corrigera avec lui.</div>' +
    '<textarea id="' + id + 'e" rows="5" placeholder="Bilan envoyé par l\'élève" ' +
      'style="' + zoneTexte + '"></textarea>' +

    '<label for="' + id + 'd">Date du rendez-vous</label>' +
    '<input type="date" id="' + id + 'd">' +
    '<label for="' + id + 'm">Moniteur qui le reçoit</label>' +
    '<select id="' + id + 'm"><option value="">— à définir —</option></select>';

  /* Les captures du CEPC, ajoutables ici si ça n'a pas été fait
     au moment de la saisie du résultat. */
  f.appendChild(blocCaptures(e.eleve, dateFrVersIso(s.datePermis || '')));

  const bEnr = document.createElement('button');
  bEnr.className = 'btn btn-primary';
  bEnr.textContent = '💾 Enregistrer et préparer le cours';
  f.appendChild(bEnr);
  const msg = document.createElement('div');
  msg.style.cssText = 'margin-top:8px;font-size:13px;min-height:16px;';
  f.appendChild(msg);

  /* Retour du moniteur, une fois le rendez-vous fait */
  if(s.rdvPostFait === 'oui'){
    const ret = document.createElement('div');
    ret.style.cssText = 'margin-top:12px;padding:10px 12px;background:rgba(182,255,14,.08);' +
      'border:1px solid var(--orange);border-radius:10px;font-size:14px;line-height:1.6;';
    ret.innerHTML = '<div style="font-weight:700;color:var(--accent-text);margin-bottom:4px;">' +
      '✅ Rendez-vous fait</div>' +
      (s.suite ? '<div>' + libelleSuite(s.suite).replace(/</g, '&lt;') + '</div>' : '') +
      (s.commentaireMoniteur
        ? '<div style="white-space:pre-wrap;">' +
          s.commentaireMoniteur.replace(/</g, '&lt;') + '</div>' : '');
    f.appendChild(ret);
  }

  det.appendChild(f);

  setTimeout(() => {
    const g = k => document.getElementById(id + k);
    if(g('d')) g('d').value = s.rdvPostDate || '';
    const sm = g('m');
    if(sm){
      moniteursActifs.forEach(n => {
        const o = document.createElement('option');
        o.value = n; o.textContent = n;
        sm.appendChild(o);
      });
      sm.value = s.rdvPostMoniteur || '';
    }
    if(g('b')) g('b').value = s.bilanExamen || '';
    if(g('e')) g('e').value = s.bilanEleve || '';
  }, 0);

  bEnr.addEventListener('click', async () => {
    const g = k => document.getElementById(id + k);
    const date = g('d').value;
    const mon = g('m').value;
    const bilan = g('b').value.trim();
    const bilanEl = g('e').value.trim();

    /* On enregistre ce qui est là ; le rendez-vous peut venir après */
    if(!date || !mon){
      bEnr.disabled = true;
      try{
        await majSuivi(e.eleve, { bilanExamen: bilan, bilanEleve: bilanEl });
        msg.style.color = 'var(--accent-text)';
        msg.textContent = '✅ Enregistré. Ajoute la date et le moniteur pour préparer le cours.';
        afficherBureau();
      }catch(err){
        msg.style.color = 'var(--warn-text)';
        msg.textContent = 'Erreur : ' + err.message;
      }finally{ bEnr.disabled = false; }
      return;
    }

    bEnr.disabled = true;
    bEnr.textContent = 'Enregistrement…';
    try{
      await majSuivi(e.eleve, { rdvPostDate: date, rdvPostMoniteur: mon,
                                bilanExamen: bilan, bilanEleve: bilanEl });

      const n = parseInt(s.nbAjournements, 10) || 1;
      const note = '🔁 RENDEZ-VOUS POST-PERMIS · ' +
                   mentionAjournements(n, s.dateAjournement) +
                   (bilan ? "\n\nBILAN DE L'EXAMEN OFFICIEL :\n" + bilan : '');
      await appelPrep({
        action: 'prepAdd',
        date: date,
        eleve: e.eleve,
        modele: 'rdv-post',
        modeleLabel: '🔁 Rendez-vous post-permis',
        site: '',
        note: note,
        contexte: JSON.stringify({ rdvPost: true, eleve: e.eleve }),
        moniteur: mon
      });

      await envoyerConsigne(e.eleve, 'permis',
        'Rendez-vous post-permis le ' + dateEnToutesLettres(date) + ' avec ' + mon + ' (bureau)');

      msg.style.color = 'var(--accent-text)';
      msg.textContent = '✅ Cours préparé pour ' + mon + ' le ' + dateEnToutesLettres(date);
      afficherBureau();
    }catch(err){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Erreur : ' + err.message;
    }finally{
      bEnr.disabled = false;
      bEnr.textContent = '💾 Enregistrer et préparer le cours';
    }
  });

  return det;
}


/* ============================================================
   3. CALENDRIER DE PRISE DES DATES D'EXAMEN
   1er mardi du mois  → places de la 1ʳᵉ quinzaine du mois suivant
   2e mardi du mois   → places de la 2ᵉ quinzaine du mois suivant
   ============================================================ */
function mardisDuMois(an, mois){
  const out = [];
  const dernier = new Date(an, mois, 0).getDate();
  for(let j = 1; j <= dernier; j++){
    if(new Date(an, mois - 1, j).getDay() === 2) out.push(j);
  }
  return out;
}

function memeJour(a, b){
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function joursAvant(iso){
  const a = new Date(iso + 'T12:00:00');
  const b = new Date(); b.setHours(12, 0, 0, 0);
  return Math.round((a - b) / 86400000);
}

/* À combien de jours la prise de dates se signale. UN SEUL chiffre,
   pour l'écran 🚗 Permis comme pour le bandeau du jour : deux
   seuils pour une même alerte finiraient par ne plus dire la même
   chose, et on ne saurait plus lequel des deux écrans croire. */
const JOURS_AVANT_PRISE = 10;

/* ------------------------------------------------------------
   LES DEUX PROCHAINES PRISES DE DATES

   ⚠️ ON PARCOURT LES MOIS VISÉS, PAS LES MOIS DE PRISE.

   C'était l'inverse, et ça ne pouvait pas accueillir d'exception :
   partir du 1ᵉʳ mardi de septembre pour en déduire octobre marche
   tant que la préfecture suit le calendrier. Le jour où elle
   décale — « il y a eu un bug, on prendra la 1ʳᵉ quinzaine
   d'octobre mardi prochain » —, la date du 1ᵉʳ mardi est PASSÉE :
   l'ancienne boucle la sautait, et la quinzaine disparaissait de
   l'écran alors qu'elle était justement à prendre.

   Ce qui identifie une prise, c'est LA QUINZAINE QU'ELLE OUVRE.
   On part donc d'elle, on regarde si une date lui a été réglée à
   la main (voir « priseReglee » dans ec-places), et à défaut
   seulement on applique la règle : 1ᵉʳ ou 2ᵉ mardi du mois
   précédent.
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   LA DATE À LAQUELLE ON PREND LES PLACES D'UNE QUINZAINE

   Écrite ici, et lue partout : « prochainesPrises » s'en sert pour
   annoncer les deux suivantes, et la liste RDV Permis pour savoir
   quelles semaines valent encore la peine d'être visées.

   La règle : 1ᵉʳ et 2ᵉ mardi du mois PRÉCÉDENT. Une date réglée à
   la main dans l'écran des places l'emporte — c'est elle qui dit
   que la préfecture a décalé.

   Rend '' quand on ne sait pas : un mois sans mardi calculable, un
   mois hors des bornes. Et « on ne sait pas » ne doit jamais faire
   disparaître quelque chose de l'écran.
   ------------------------------------------------------------ */
function dateDePrise(isoMois, quinzaine){
  const p2 = n => String(n).padStart(2, '0');
  const m = String(isoMois || '').match(/^(\d{4})-(\d{2})$/);
  if(!m) return '';
  const anC = Number(m[1]), moC = Number(m[2]);
  const q = (Number(quinzaine) === 2) ? 2 : 1;

  const aLaMain = (typeof priseReglee === 'function')
    ? priseReglee(isoMois, q) : '';
  if(aLaMain) return aLaMain;

  /* Le mois où l'on prend : celui d'avant. */
  const src = new Date(anC, moC - 2, 1);
  const anS = src.getFullYear(), moS = src.getMonth() + 1;
  const mardis = mardisDuMois(anS, moS);
  if(mardis[q - 1] === undefined) return '';
  return anS + '-' + p2(moS) + '-' + p2(mardis[q - 1]);
}

function prochainesPrises(){
  const p2 = n => String(n).padStart(2, '0');
  const auj = new Date();
  auj.setHours(12, 0, 0, 0);
  const out = [];

  /* d = 0 : le mois en cours. Sa prise est normalement passée, mais
     une date réglée à la main peut l'avoir ramenée devant nous. */
  for(let d = 0; d <= 4; d++){
    const cible = new Date(auj.getFullYear(), auj.getMonth() + d, 1);
    const anC = cible.getFullYear(), moC = cible.getMonth() + 1;
    const isoMois = anC + '-' + p2(moC);
    const finMois = new Date(anC, moC, 0).getDate();

    [1, 2].forEach(q => {
      /* La date se demande à « dateDePrise » : la règle et le
         réglage à la main y vivent ensemble, et une seule fois. */
      const date = dateDePrise(isoMois, q);
      if(!date) return;

      const aLaMain = (typeof priseReglee === 'function')
        ? priseReglee(isoMois, q) : '';

      const jour = new Date(date + 'T12:00:00');
      if(jour < auj && !memeJour(jour, auj)) return;

      out.push({
        date: date,
        quinzaine: q,
        /* Pour le dire à l'écran : une date réglée à la main n'est
           pas une date déduite, et on doit pouvoir s'en souvenir. */
        reglee: !!aLaMain,
        moisCible: isoMois,
        du: (q === 1) ? isoMois + '-01' : isoMois + '-16',
        au: (q === 1) ? isoMois + '-15' : isoMois + '-' + p2(finMois),
        /* Le nombre de places à prendre, tel que le bureau l'a
           saisi dans le même écran que la date. */
        places: (typeof placesDeLaQuinzaine === 'function')
          ? placesDeLaQuinzaine(isoMois, q) : ''
      });
    });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out.slice(0, 2);
}


/* ------------------------------------------------------------
   COMMENT UNE PRISE SE DIT — À UN SEUL ENDROIT

   L'écran 🚗 Permis et le bandeau du jour montrent la même chose.
   Deux phrases écrites séparément finiraient par différer d'un mot,
   puis d'une date. Elles se composent donc ici.
   ------------------------------------------------------------ */
function libellePrise(p){
  const j = joursAvant(p.date);
  const jourLong = new Date(p.date + 'T12:00:00')
    .toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
  const mois = new Date(p.moisCible + '-15T12:00:00')
    .toLocaleDateString('fr-FR', { month:'long', year:'numeric' });

  return {
    jours: j,
    urgent: (j <= 1),
    quand: (j === 0) ? "aujourd'hui" : (j === 1) ? 'demain' : 'dans ' + j + ' jours',
    titre: 'Prise de dates ' + ((j === 0) ? "aujourd'hui"
             : (j === 1) ? 'demain' : 'dans ' + j + ' jours') + ' — ' + jourLong,
    /* « de octobre » se disait tel quel. Une élision manquante sur
       un écran qu'on lit tous les jours finit par se voir. */
    periode: (p.quinzaine === 1 ? '1ʳᵉ' : '2ᵉ') + ' quinzaine ' +
      (/^[aeiouâêîôûàéèù]/i.test(mois) ? "d'" : 'de ') + mois +
      ' (' + new Date(p.du + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric' }) +
      ' au ' + new Date(p.au + 'T12:00:00')
        .toLocaleDateString('fr-FR', { day:'numeric', month:'long' }) + ')',
    /* Le chiffre saisi dans le même écran que la date. Vide, on le
       DIT : un « 0 places » ferait croire qu'il n'y a rien à prendre. */
    places: p.places
      ? p.places + ' place' + (Number(p.places) > 1 ? 's' : '') + ' à prendre'
      : 'nombre de places à renseigner',
    reglee: !!p.reglee
  };
}

/* Un élève peut-il passer sur cette période ? */
function disponibleSur(s, du, au){
  if(s.dispoDu && s.dispoDu > au) return false;                 /* pas encore possible */
  if(s.indispoDu && s.indispoAu){
    if(!(s.indispoAu < du || s.indispoDu > au)) return false;    /* absent sur la période */
  }
  return true;
}

function raisonIndispo(s, du, au){
  if(s.dispoDu && s.dispoDu > au){
    return 'possible seulement à partir du ' + dateEnToutesLettres(s.dispoDu);
  }
  if(s.indispoDu && s.indispoAu && !(s.indispoAu < du || s.indispoDu > au)){
    return 'absent du ' + dateEnToutesLettres(s.indispoDu) +
           ' au ' + dateEnToutesLettres(s.indispoAu);
  }
  return '';
}

/* Bandeau : la prochaine prise de dates et les élèves à présenter */
function afficherAlertePrise(candidats){
  const zone = $('alertePrise');
  if(!zone) return;
  zone.innerHTML = '';

  prochainesPrises().forEach(p => {
    const j = joursAvant(p.date);
    /* On ne montre que ce qui arrive bientôt — et « bientôt » se lit
       dans UNE constante, la même que celle du bandeau du jour. */
    if(j < 0 || j > JOURS_AVANT_PRISE) return;

    const eligibles = candidats.filter(e => disponibleSur(suiviDe(e.eleve), p.du, p.au));
    const ecartes = candidats.filter(e => !disponibleSur(suiviDe(e.eleve), p.du, p.au));

    /* Les mots viennent de « libellePrise », comme ceux du bandeau :
       deux phrases écrites séparément finiraient par différer d'un
       mot, puis d'une date. */
    const lib = libellePrise(p);
    const urgent = lib.urgent;

    const d = document.createElement('div');
    d.style.cssText = 'border-radius:10px;padding:12px;margin-bottom:8px;font-size:14px;' +
      'line-height:1.7;border:1px solid ' + (urgent ? 'var(--red)' : 'var(--orange)') + ';' +
      'background:' + (urgent ? 'var(--warn-bg)' : 'rgba(182,255,14,.08)') + ';';

    d.innerHTML = '<div style="font-weight:700;margin-bottom:4px;">' +
      (urgent ? '🔔' : '📆') + ' ' + echapper(lib.titre) + '</div>' +
      '<div>Places de la <strong>' + echapper(lib.periode) + '</strong> — ' +
      '<strong style="color:var(--orange);">' + echapper(lib.places) +
      '</strong></div>' +
      (lib.reglee
        ? '<div style="font-size:12px;color:var(--muted);">📌 Date réglée à ' +
          'la main dans 📊 Réglage des places</div>' : '') +
      '<div style="margin-top:4px;"><strong>' + eligibles.length +
      '</strong> élève(s) présentable(s)' +
      (ecartes.length ? ' · <span style="color:var(--muted);">' + ecartes.length +
        ' écarté(s) pour indisponibilité</span>' : '') + '</div>';

    if(eligibles.length){
      const det = document.createElement('details');
      det.innerHTML = '<summary style="cursor:pointer;color:var(--accent-text);font-weight:600;' +
        'margin-top:6px;">Voir les ' + eligibles.length + ' élèves</summary>';
      const l = document.createElement('div');
      l.style.cssText = 'margin-top:6px;font-size:13px;line-height:1.9;';

      eligibles.forEach(e => {
        const s = suiviDe(e.eleve);
        const ligne = document.createElement('div');
        ligne.style.cssText = 'display:flex;align-items:center;gap:8px;';
        const nom = document.createElement('span');
        nom.style.cssText = 'flex:1;min-width:0;';
        nom.textContent = (s.nbAjournements ? '🔁 ' : '🆕 ') + e.eleve;
        const b = document.createElement('button');
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:5px 9px;font-size:12px;margin:0;flex-shrink:0;';
        b.textContent = '→ RDV PERMIS';
        b.addEventListener('click', async () => {
          b.disabled = true;
          try{
            await majSuivi(e.eleve, { aPlanifier: 'oui', retireAPrevoir: '' });
            afficherBureau();
          }catch(err){ showToast('Erreur : ' + err.message); b.disabled = false; }
        });
        ligne.appendChild(nom); ligne.appendChild(b);
        l.appendChild(ligne);
      });

      const bTous = document.createElement('button');
      bTous.className = 'btn btn-primary';
      bTous.style.cssText = 'margin-top:10px;font-size:13px;padding:10px;';
      bTous.textContent = '📋 Mettre les ' + eligibles.length + ' dans la liste RDV PERMIS';
      bTous.addEventListener('click', async () => {
        if(!await confirmer('Ajouter ces ' + eligibles.length +
                            ' élèves à la liste RDV PERMIS ?')) return;
        bTous.disabled = true;
        bTous.textContent = 'Enregistrement…';
        try{
          for(const e of eligibles){
            await majSuivi(e.eleve, { aPlanifier: 'oui', retireAPrevoir: '' });
          }
          showToast(eligibles.length + ' élèves ajoutés ✅');
          afficherBureau();
        }catch(err){ showToast('Erreur : ' + err.message); bTous.disabled = false; }
      });
      l.appendChild(bTous);
      det.appendChild(l);
      d.appendChild(det);
    }

    if(ecartes.length){
      const det2 = document.createElement('details');
      det2.innerHTML = '<summary style="cursor:pointer;color:var(--muted);font-size:13px;' +
        'margin-top:6px;">Écartés (' + ecartes.length + ')</summary>';
      const l2 = document.createElement('div');
      l2.style.cssText = 'margin-top:4px;font-size:12px;color:var(--muted);line-height:1.7;';
      l2.innerHTML = ecartes.map(e =>
        '• ' + e.eleve.replace(/</g, '&lt;') + ' — ' +
        raisonIndispo(suiviDe(e.eleve), p.du, p.au)).join('<br>');
      det2.appendChild(l2);
      d.appendChild(det2);
    }

    zone.appendChild(d);
  });
}


/* ============================================================
   4. DISPONIBILITÉS D'UN ÉLÈVE
   AAC pas encore éligible, vacances, absences.
   ============================================================ */
function blocDispo(e){
  const s = suiviDe(e.eleve);
  const id = 'dp' + Math.random().toString(36).slice(2, 8);
  const pose = (s.dispoDu || s.indispoDu);

  const det = document.createElement('details');
  det.style.cssText = 'margin-top:8px;';
  det.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:600;color:' +
    (pose ? 'var(--accent-text)' : 'var(--muted)') + ';">📅 Disponibilités' +
    (s.dispoDu ? ' — à partir du ' + dateEnToutesLettres(s.dispoDu) : '') +
    (s.indispoDu && s.indispoAu ? ' — absent du ' + dateEnToutesLettres(s.indispoDu) +
      ' au ' + dateEnToutesLettres(s.indispoAu) : '') + '</summary>';

  const f = document.createElement('div');
  f.style.cssText = 'margin-top:8px;padding:10px 12px;background:var(--navy);' +
    'border:1px solid var(--line);border-radius:10px;';
  f.innerHTML =
    '<label for="' + id + 'a">Peut passer à partir du</label>' +
    '<input type="date" id="' + id + 'a">' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;line-height:1.4;">' +
      'Pour un AAC pas encore éligible, par exemple.</div>' +
    '<label>Indisponible (vacances, absence)</label>' +
    '<div style="display:flex;gap:8px;">' +
      '<input type="date" id="' + id + 'du" style="flex:1;">' +
      '<input type="date" id="' + id + 'au" style="flex:1;">' +
    '</div>' +
    '<div style="display:flex;gap:8px;font-size:11px;color:var(--muted);margin:-8px 0 12px;">' +
      '<span style="flex:1;text-align:center;">du</span>' +
      '<span style="flex:1;text-align:center;">au</span>' +
    '</div>';

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'padding:9px;font-size:13px;';
  b.textContent = '💾 Enregistrer';
  f.appendChild(b);
  det.appendChild(f);

  setTimeout(() => {
    const g = k => document.getElementById(id + k);
    if(g('a')) g('a').value = s.dispoDu || '';
    if(g('du')) g('du').value = s.indispoDu || '';
    if(g('au')) g('au').value = s.indispoAu || '';
  }, 0);

  b.addEventListener('click', async () => {
    const g = k => document.getElementById(id + k);
    b.disabled = true;
    try{
      await majSuivi(e.eleve, {
        dispoDu: g('a').value,
        indispoDu: g('du').value,
        indispoAu: g('au').value
      });
      showToast('Disponibilités enregistrées ✅');
      afficherBureau();
    }catch(err){ showToast('Erreur : ' + err.message); b.disabled = false; }
  });

  return det;
}


/* ============================================================
   IMAGE DU CEPC
   Une cellule de tableur accepte 50 000 caractères : on réduit
   l'image jusqu'à tenir dedans, sinon rien ne s'enregistre.
   ============================================================ */
const TAILLE_MAX_IMAGE = 45000;   /* caractères, marge de sécurité */

function compresserImage(fichier){
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => reject(new Error("Lecture de l'image impossible."));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible."));
      img.onload = () => {
        /* On réduit progressivement jusqu'à tenir dans la cellule */
        const essais = [[1100, 0.65], [900, 0.55], [750, 0.45], [600, 0.4], [480, 0.35]];
        for(let i = 0; i < essais.length; i++){
          const [largeurMax, qualite] = essais[i];
          const ratio = Math.min(1, largeurMax / img.width);
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * ratio);
          c.height = Math.round(img.height * ratio);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          const donnees = c.toDataURL('image/jpeg', qualite);
          if(donnees.length <= TAILLE_MAX_IMAGE) return resolve(donnees);
        }
        reject(new Error("L'image reste trop lourde. Recadre la capture sur le CEPC seul."));
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

/* ============================================================
   PLUSIEURS CAPTURES PAR ÉLÈVE
   Le CEPC tient rarement sur une seule image : recto, verso,
   observations. On les garde toutes.
   ============================================================ */
async function chargerCaptures(eleve){
  try{
    const d = await appelPrep({ action: 'captureList', eleve: eleve });
    return (d && d.captures) || [];
  }catch(e){ console.warn('Captures :', e); return []; }
}

/* Galerie : aperçu, ajout et retrait */
/* ============================================================
   LES MESSAGES D'AJOURNEMENT

   Quatre envois, dans l'ordre : la marche à suivre, les captures
   du CEPC, le modèle de bilan, puis la relance.

   Ils vivent dans les réglages : le bureau les corrige seul.
   ============================================================ */

const MSG_AJOURNE_1 = `Bonjour,

J'ai l'indication sur Rendez-vous permis que tu es ajourné(e), voir CEPC ci-joint.
Quelles sont les prochains étapes (⚠️pas la peine de venir harceler le bureau, suis les étapes qui sont obligatoires et non négociables pour envisager un repassage ⚠️)

1- 📃 Envoie moi 𝙏𝙊𝙉 𝙋𝙍𝙊𝙋𝙍𝙀 𝘽𝙄𝙇𝘼𝙉 sur ton examen : analyse ce qu'il s'est passé et explique-moi 𝙋𝙊𝙐𝙍𝙌𝙐𝙊𝙄 tu ne l'as pas obtenu, SELON TOI, TON PROPRE RESSENTI par rapport AUSSI à l'inspecteur (trice).
Tu dois 𝘾𝙊𝙈𝙋𝙍𝙀𝙉𝘿𝙍𝙀 ce qu'il s'est passé, 𝙀́𝙑𝘼𝘾𝙐𝙀𝙍 au maximum cet échec et 𝙏𝙍𝙊𝙐𝙑𝙀𝙍 𝘿𝙀𝙎 𝙎𝙊𝙇𝙐𝙏𝙄𝙊𝙉𝙎 pour ne plus les reproduire.
Sert toi du bilan de l'inspecteur(trice) et du bilan de ton (ta) moniteur (trice).
Clique 𝙊𝘽𝙇𝙄𝙂𝘼𝙏𝙊𝙄𝙍𝙀𝙈𝙀𝙉𝙏 sur le lien pour savoir comment faire :
 https://www.facebook.com/share/p/1LuU7SKsEk/
📃 Voir 𝙈𝙊𝘿𝙀𝙇𝙀 𝘽𝙄𝙇𝘼𝙉 𝙋𝙊𝙎𝙏 𝙋𝙀𝙍𝙈𝙄𝙎 en dessous.
⚠️ Tu dois 𝘿𝙀́𝙏𝘼𝙄𝙇𝙇𝙀𝙍 point par point comment s'est déroulé ta conduite, pour qu'on puisse ENSEMBLE TROUVER DES SOLUTIONS D'AMÉLIORATION RAPIDES ET EFFICACES ! Ne nous fais pas perdre du temps à ne pas faire un bilan complet, ton rendez-vous post permis n'en sera que décalé et ton repassage aussi…
⚠️ 𝙋𝘼𝙎 𝘿𝙀 𝘽𝙄𝙇𝘼𝙉 𝘾𝙊𝙈𝙋𝙇𝙀𝙏 = 𝙋𝘼𝙎 𝘿𝙀 𝙍𝘿𝙑 𝙋𝙊𝙎𝙏 𝙋𝙀𝙍𝙈𝙄𝙎 = 𝙋𝘼𝙎 𝘿𝙀 𝙍𝙀𝙋𝘼𝙎𝙎𝘼𝙂𝙀 ⚠️

2- 🧑‍🏫 Ensuite, 𝙌𝙐𝘼𝙉𝘿 ton bilan sera effectué, tu dois réserver de ton compte en ligne un 𝙍𝘿𝙑 𝙋𝙊𝙎𝙏-𝙋𝙀𝙍𝙈𝙄𝙎 qui se fera au centre de formation 𝘼𝙑𝙀𝘾 un(e) moniteur (trice). Si tu ne peux pas te déplacer, ce rendez-vous peut se faire en visio mais il faut nous l'indiquer absolument avant.

Ce bilan dure 𝟯𝟬 𝙢𝙣. S'il est insuffisant, tu devras en refaire un autre jusqu'à ce que tout soit compris, donc travaille et 𝙀𝙉𝙑𝙊𝙄𝙀-𝙉𝙊𝙐𝙎 𝙏𝙊𝙉 𝙋𝙍𝙊𝙋𝙍𝙀 𝘽𝙄𝙇𝘼𝙉 𝘾𝙊𝙈𝙋𝙇𝙀𝙏, pour que ton (ta) moniteur (trice) puisse le travailler en amont de ton rendez-vous.
Tu dois être capable de 𝘾𝙊𝙈𝙋𝙍𝙀𝙉𝘿𝙍𝙀 tes erreurs pour ne pas les refaire ensuite
et ne pas faire perdre à la communauté une autre place d'examen, 𝙘𝙚𝙨 𝙥𝙡𝙖𝙘𝙚𝙨 𝙚́𝙩𝙖𝙣𝙩 𝙩𝙧𝙚̀𝙨 𝙥𝙧𝙚́𝙘𝙞𝙚𝙪𝙨𝙚𝙨 🧑‍🏫

3-❓ Dis nous si tu peux repasser ton permis dans notre agence de 𝗟𝗼𝘂𝗱𝗲́𝗮𝗰  (délai normalement plus court) ? https://share.google/teMUlLLF55KVarfRR

☠️𝗧𝗼𝘂𝘁𝗲 𝗺𝗲𝗻𝗮𝗰𝗲, 𝗽𝗿𝗲𝘀𝘀𝗶𝗼𝗻 𝘃𝗶𝘀𝗮𝗻𝘁 𝗮̀ 𝗼𝗯𝘁𝗲𝗻𝗶𝗿 𝘂𝗻𝗲 𝗽𝗹𝗮𝗰𝗲 𝗱𝗲 𝗿𝗲𝗽𝗮𝘀𝘀𝗮𝗴𝗲, 𝗼𝘂 𝘁𝗼𝘂𝘁𝗲 𝗻𝗼𝗻 𝗿𝗲𝗺𝗶𝘀𝗲 𝗲𝗻 𝗾𝘂𝗲𝘀𝘁𝗶𝗼𝗻, 𝗲𝗻𝘁𝗿𝗮𝗶̂𝗻𝗲𝗿𝗮 𝗮𝘂𝘁𝗼𝗺𝗮𝘁𝗶𝗾𝘂𝗲𝗺𝗲𝗻𝘁 𝗹𝗮 𝗿𝗲𝗺𝗶𝘀𝗲 𝗶𝗺𝗺𝗲́𝗱𝗶𝗮𝘁𝗲 𝗱𝘂 𝗱𝗼𝘀𝘀𝗶𝗲𝗿 𝗲𝘁 𝗹'𝗮𝗻𝗻𝘂𝗹𝗮𝘁𝗶𝗼𝗻 𝗱𝘂 𝗰𝗼𝗻𝘁𝗿𝗮𝘁, 𝘀𝗮𝗻𝘀 𝗱𝗶𝘀𝗰𝘂𝘀𝘀𝗶𝗼𝗻 𝗽𝗼𝘀𝘀𝗶𝗯𝗹𝗲. ☠️`;

const MSG_AJOURNE_3 = `𝙈𝙊𝘿𝙀𝙇𝙀 𝘽𝙄𝙇𝘼𝙉 𝙋𝙊𝙎𝙏 𝙋𝙀𝙍𝙈𝙄𝙎 :
 📲  𝙁𝘼𝙄𝙏 𝙐𝙉 𝘾𝙊𝙋𝙄𝙀́ 𝘾𝙊𝙇𝙇𝙀 𝙀𝙏 𝙍𝙀́𝙋𝙊𝙉𝘿 𝘾𝙊𝙍𝙍𝙀𝘾𝙏𝙀𝙈𝙀𝙉𝙏 𝘼𝙐𝙓 𝙌𝙐𝙀𝙎𝙏𝙄𝙊𝙉𝙎 :

👉 𝙎𝙖𝙫𝙤𝙞𝙧 𝙨'𝙞𝙣𝙨𝙩𝙖𝙡𝙡𝙚𝙧 𝙚𝙩 𝙖𝙨𝙨𝙪𝙧𝙚𝙧 𝙡𝙖 𝙨𝙚́𝙘𝙪𝙧𝙞𝙩𝙚́ 𝙖̀ 𝙗𝙤𝙧𝙙 ?
As-tu eu tous les points ?
Oui ou non, si non, pourquoi ? ✅❌

👉 𝙀𝙛𝙛𝙚𝙘𝙩𝙪𝙚𝙧 𝙙𝙚𝙨 𝙫𝙚́𝙧𝙞𝙛𝙞𝙘𝙖𝙩𝙞𝙤𝙣𝙨 𝙙𝙪 𝙫𝙚́𝙝𝙞𝙘𝙪𝙡𝙚  ?
As-tu eu tous les points ?
Oui ou non, si non, pourquoi ?  ✅❌

👉 𝘾𝙤𝙣𝙣𝙖𝙞̂𝙩𝙧𝙚 𝙚𝙩 𝙪𝙩𝙞𝙡𝙞𝙨𝙚𝙧 𝙡𝙚𝙨 𝙘𝙤𝙢𝙢𝙖𝙣𝙙𝙚𝙨 ?
As-tu eu tous les points ?
Oui ou non, si non, pourquoi ? ✅❌
❌ Si tu as eu des points en moins ou une faute éliminatoire :
▶️ Est-ce que tu as compris pourquoi ?
▶️ Pourquoi tu as fait cette faute ?
▶️ Quelle solution apporter pour ne plus jamais faire cette erreur ?

👉 𝙋𝙧𝙚𝙣𝙙𝙧𝙚 𝙡'𝙞𝙣𝙛𝙤𝙧𝙢𝙖𝙩𝙞𝙤𝙣 ?
As-tu eu tous les points ?
Oui ou non, si non, pourquoi ? ✅❌
❌ Si tu as eu des points en moins ou une faute éliminatoire :
▶️ Est-ce que tu as compris pourquoi ?
▶️ Pourquoi tu as fait cette faute ?
▶️ Quelle solution apporter pour ne plus jamais faire cette erreur ?

👉 𝘼𝙙𝙖𝙥𝙩𝙚𝙧 𝙨𝙤𝙣 𝙖𝙡𝙡𝙪𝙧𝙚 𝙖𝙪𝙭 𝙘𝙞𝙧𝙘𝙤𝙣𝙨𝙩𝙖𝙣𝙘𝙚𝙨 ?
As-tu eu tous les points ?
Oui ou non, si non, pourquoi ? ✅❌
❌ Si tu as eu des points en moins ou une faute éliminatoire :
▶️ Est-ce que tu as compris pourquoi ?
▶️ Pourquoi tu as fait cette faute ?
▶️ Quelle solution apporter pour ne plus jamais faire cette erreur ?

👉 𝘼𝙥𝙥𝙡𝙞𝙦𝙪𝙚𝙧 𝙡𝙖 𝙧𝙚́𝙜𝙡𝙚𝙢𝙚𝙣𝙩𝙖𝙩𝙞𝙤𝙣 ?
As-tu eu tous les points ?
Oui ou non, si non, pourquoi ? ✅❌
❌ Si tu as eu des points en moins ou une faute éliminatoire :
▶️ Est-ce que tu as compris pourquoi ?
▶️ Pourquoi tu as fait cette faute ?
▶️ Quelle solution apporter pour ne plus jamais faire cette erreur ?

👉 𝘾𝙤𝙢𝙢𝙪𝙣𝙞𝙦𝙪𝙚𝙧 𝙖𝙫𝙚𝙘 𝙡𝙚𝙨 𝙖𝙪𝙩𝙧𝙚𝙨 𝙪𝙨𝙖𝙜𝙚𝙧𝙨 ?
As-tu eu tous les points ?
Oui ou non, si non, pourquoi ? ✅❌
❌ Si tu as eu des points en moins ou une faute éliminatoire :
▶️ Est-ce que tu as compris pourquoi ?
▶️ Pourquoi tu as fait cette faute ?
▶️ Quelle solution apporter pour ne plus jamais faire cette erreur ?

👉 𝙋𝙖𝙧𝙩𝙖𝙜𝙚𝙧 𝙡𝙖 𝙘𝙝𝙖𝙪𝙨𝙨𝙚́𝙚 ?
As-tu eu tous les points ?
Oui ou non, si non, pourquoi ? ✅❌
❌ Si tu as eu des points en moins ou une faute éliminatoire :
▶️ Est-ce que tu as compris pourquoi ?
▶️ Pourquoi tu as fait cette faute ?
▶️ Quelle solution apporter pour ne plus jamais faire cette erreur ?

👉 𝙈𝙖𝙞𝙣𝙩𝙚𝙣𝙞𝙧 𝙡𝙚𝙨 𝙚𝙨𝙥𝙖𝙘𝙚𝙨 𝙙𝙚 𝙨𝙚́𝙘𝙪𝙧𝙞𝙩𝙚́ ?
As-tu eu tous les points ?
Oui ou non, si non, pourquoi ? ✅❌
❌ Si tu as eu des points en moins ou une faute éliminatoire :
▶️ Est-ce que tu as compris pourquoi ?
▶️ Pourquoi tu as fait cette faute ?
▶️ Quelle solution apporter pour ne plus jamais faire cette erreur ?

👉𝘼𝙣𝙖𝙡𝙮𝙨𝙚 𝙙𝙚𝙨 𝙨𝙞𝙩𝙪𝙖𝙩𝙞𝙤𝙣𝙨 ?
As-tu eu tous les points ?
Oui ou non, si non, pourquoi ? ✅❌

👉 𝘼𝙙𝙖𝙥𝙩𝙖𝙩𝙞𝙤𝙣 𝙖𝙪𝙭 𝙨𝙞𝙩𝙪𝙖𝙩𝙞𝙤𝙣𝙨 ?
As-tu eu tous les points ?
Oui ou non, si non, pourquoi ? ✅❌

👉 𝘾𝙤𝙣𝙙𝙪𝙞𝙩𝙚 𝙖𝙪𝙩𝙤𝙣𝙤𝙢𝙚 ?
As-tu eu tous les points ?
Oui ou non, si non, pourquoi ? ✅❌

👉 𝘾𝙤𝙣𝙙𝙪𝙞𝙩𝙚 𝙚́𝙘𝙤𝙣𝙤𝙢𝙞𝙦𝙪𝙚 𝙚𝙩 𝙧𝙚𝙨𝙥𝙚𝙘𝙩𝙪𝙚𝙪𝙨𝙚 𝙙𝙚 𝙡'𝙚𝙣𝙫𝙞𝙧𝙤𝙣𝙣𝙚𝙢𝙚𝙣𝙩 ?
As-tu eu tous les points ?
Oui ou non, si non, pourquoi ? ✅❌

👉 𝘾𝙤𝙪𝙧𝙩𝙤𝙞𝙨𝙞𝙚 ?
As-tu eu tous les points ?
Oui ou non, si non, pourquoi ? ✅❌

 👉 Retrouve la grille de notation de l'inspecteur(trice) ici https://www.facebook.com/share/p/19mwWHfRS4/

👉 Retrouve les statistiques des fautes éliminatoires mensuelles sur le guide 23 Statistiques mensuelles Examen pratique du permis de conduire dans le groupe Facebook Mise en pratique. https://www.facebook.com/share/p/182tnBsA2C/

👉 Qu'a tu pensé de l'inspecteur(trice)?

👉 Objectivement, est ce que tu trouves que ce que l'on t'as demandé à l'examen est compliqué ?

👉 Est ce que tu as trouvé l'examen long ?

👉 Si tu as été stressé (e) , quelles solutions selon toi peux tu mettre en place pour ne plus subir ce stress ?`;

const MSG_AJOURNE_4 = `♻️ 𝙐𝙋 🚗 Bilan permis
𝙀𝙣 𝙖𝙩𝙩𝙚𝙣𝙩𝙚 𝙙𝙚 𝙩𝙖 𝙧𝙚𝙥𝙤𝙣𝙨𝙚 𝙤𝙪 𝙙𝙚 𝙡'𝙖𝙘𝙩𝙞𝙤𝙣 𝙦𝙪𝙚 𝙩𝙪 𝙙𝙤𝙞𝙨 𝙧𝙚𝙖𝙡𝙞𝙨𝙚𝙧 💪`;


let messagesAjourne = null;

async function chargerMessagesAjourne(){
  if(messagesAjourne !== null) return messagesAjourne;
  try{
    const d = await appelPrep({ action: 'reglagesList' });
    const g = (d && d.reglages) || {};
    messagesAjourne = {
      m1: g.ajourne1 || MSG_AJOURNE_1,
      m3: g.ajourne3 || MSG_AJOURNE_3,
      m4: g.ajourne4 || MSG_AJOURNE_4
    };
  }catch(e){
    messagesAjourne = { m1: MSG_AJOURNE_1, m3: MSG_AJOURNE_3, m4: MSG_AJOURNE_4 };
  }
  return messagesAjourne;
}


/* La fenêtre qui suit l'ajournement : les quatre envois, dans
   l'ordre, avec ce qu'il faut copier à chaque fois. */
async function ouvrirMessagesAjourne(eleve){
  await chargerMessagesAjourne();
  await chargerAfaireAjourne();

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(620px, 95vw);max-height:92vh;overflow-y:auto;';

  boite.innerHTML = '<h3>📤 À envoyer à ' +
    String(eleve).replace(/</g, '&lt;') + '</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:14px;' +
      'line-height:1.5;">Quatre envois, dans cet ordre. Copie chacun ' +
      'et colle-le sur Messenger.</div>';

  const etape = (n, titre, texte, aide) => {
    const d = document.createElement('details');
    d.style.cssText = 'border:1px solid var(--line);border-radius:11px;' +
      'padding:10px 12px;margin-bottom:8px;';

    d.innerHTML = '<summary style="cursor:pointer;font-size:14px;' +
      'font-weight:700;color:var(--accent-text);">' + n + '. ' + titre +
      '</summary>';

    const z = document.createElement('div');
    z.style.marginTop = '9px';

    if(aide){
      const a = document.createElement('div');
      a.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;' +
        'margin-bottom:9px;';
      a.textContent = aide;
      z.appendChild(a);
    }

    if(texte){
      const t = document.createElement('div');
      t.style.cssText = 'font-size:12px;line-height:1.55;white-space:pre-wrap;' +
        'max-height:190px;overflow-y:auto;padding:9px 10px;' +
        'background:var(--navy);border-radius:9px;margin-bottom:9px;';
      t.textContent = texte;
      z.appendChild(t);

      const b = document.createElement('button');
      b.className = 'btn btn-primary';
      b.style.cssText = 'padding:11px;font-size:13px;';
      b.textContent = '📋 Copier';
      b.addEventListener('click', async () => {
        try{
          await navigator.clipboard.writeText(texte);
          b.textContent = '✅ Copié';
          showToast('Copié ✅');
          setTimeout(() => { b.textContent = '📋 Copier'; }, 2500);
        }catch(e){ showToast('Copie impossible'); }
      });
      z.appendChild(b);
    }

    d.appendChild(z);
    boite.appendChild(d);
    return d;
  };

  const d1 = etape(1, 'La marche à suivre', messagesAjourne.m1);
  d1.open = true;

  /* ⚠️ LES CAPTURES SE MONTRENT ICI, ELLES NE SE DÉCRIVENT PAS.

     Chrystel, le 4 septembre : « quand ils sont ajournés, tu peux me
     remettre les captures d'écran ici, pour que je puisse copier
     coller directement sans avoir à fermer et rouvrir ce pop-up ? »

     L'étape 2 disait « envoie les captures — celles déposées dans sa
     fiche », et rien d'autre. Pour les envoyer il fallait fermer
     cette fenêtre, retrouver l'élève, ouvrir sa fiche, copier, puis
     revenir. Une consigne qui oblige à quitter l'écran où elle est
     écrite n'est pas une consigne, c'est un renvoi.

     EN LECTURE SEULE : on ajoute et on retire les captures dans sa
     fiche ; ici on les prend. Deux endroits pour les retirer, ce
     serait deux endroits pour les perdre. */
  const d2 = etape(2, 'Les captures du CEPC', '',
    'Celles déposées dans sa fiche. Copie-les une par une et colle-les ' +
    'sur Messenger — pas besoin de sortir d’ici.');
  d2.lastElementChild.appendChild(galerieCapturesAcopier(eleve));

  etape(3, 'Le modèle de bilan post-permis', messagesAjourne.m3);

  etape(4, 'La relance, plus tard', messagesAjourne.m4,
    "À envoyer s'il ne répond pas.");

  /* Ce qui reste à faire de notre côté, hors messages. Coché ou
     non, rien n'est bloqué : c'est un aide-mémoire. */
  boite.appendChild(listeAFaireAjourne(eleve));

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary';
  bF.textContent = 'Fermer';
  bF.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bF);

  /* Chacun corrige les messages : ils décrivent nos démarches,
     et celui qui s'en sert est le mieux placé pour les tenir à
     jour. */
  const bM = document.createElement('button');
  bM.className = 'btn btn-secondary';
  bM.style.cssText = 'width:auto;padding:12px 14px;font-size:12px;';
  bM.textContent = '✏️ Messages';
  bM.title = 'Modifier les messages';
  bM.addEventListener('click', () => {
    document.body.removeChild(fond);
    modifierMessagesAjourne(eleve);
  });
  r.appendChild(bM);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


/* ============================================================
   CE QUI RESTE À FAIRE

   Les messages ne suffisent pas : il y a Driv'up à mettre à jour
   et le suivi à renseigner. Sans cette liste, une étape se
   perdait.
   ============================================================ */

/* La liste d'origine. Le bureau la modifie ensuite : elle vit
   dans les réglages, et suit tous les postes. */
const AFAIRE_DEFAUT = [
  { nom:'📣 Supprimer le groupe Messenger du permis',
    aide:'Messenger > Taper "Permis" et la date ou les prénoms des élèves > ' +
         'Une fois sur la conversation > Cliquer sur les 3 points > Aller sur ' +
         'les membres de la discussion > Supprimer les élèves et le moniteur ' +
         'du groupe > Supprimer la conversation' },
  { nom:'📣 Synchroniser',
    aide:"Drivup > Examens > Sessions d'examens > Saint-Brieuc ou Loudéac > " +
         '↻ Synchroniser mes sessions RdvPermis maintenant' },
  { nom:'❌ Envoyer le message du dessus',
    aide:'Keep > 5-2 🚗 Messages POST PERMIS > Annonce échec > Copier et ' +
         "coller sur le Messenger de l'élève" },
  { nom:'❌ Commentaire examen et Bon pour examen · ⛔ Attente bilan · ♻️ ? + 3',
    aide:"Drivup > Profil de l'élève > Examen > Mettre commentaire > " +
         'Enregistrer > Bon pour examen' },
  { nom:'❌ RDV post permis gratuit ?',
    aide:"Drivup > Profil de l'élève > Facturer — si 20/0 : en attente du " +
         "processus · si 0/0 : c'est bon" }
];

let afaireAjourne = null;


async function chargerAfaireAjourne(){
  if(afaireAjourne !== null) return afaireAjourne;
  try{
    const d = await appelPrep({ action: 'reglagesList' });
    const g = (d && d.reglages) || {};
    if(g.afaireAjourne){
      const l = JSON.parse(g.afaireAjourne);
      if(Array.isArray(l)) afaireAjourne = l;
    }
  }catch(e){ /* on garde la liste d'origine */ }

  if(afaireAjourne === null){
    afaireAjourne = AFAIRE_DEFAUT.map(x => Object.assign({}, x));
  }
  return afaireAjourne;
}


async function rangerAfaireAjourne(){
  try{
    await appelPrep({ action: 'reglageSet', cle: 'afaireAjourne',
                      valeur: JSON.stringify(afaireAjourne),
                      par: ACCES.moniteur || '' });
    return true;
  }catch(e){
    showToast('Impossible : ' + e.message);
    return false;
  }
}


function listeAFaireAjourne(eleve){
  const d = document.createElement('details');
  d.id = 'afaireAjourne';
  d.open = true;
  d.style.cssText = 'border:1px solid var(--orange);border-radius:11px;' +
    'padding:10px 12px;margin-top:12px;';

  d.innerHTML = '<summary style="cursor:pointer;font-size:14px;' +
    'font-weight:700;color:var(--accent-text);">' +
    '❌ PAS EU — ce qui reste à faire</summary>';

  const z = document.createElement('div');
  z.style.marginTop = '10px';

  /* Les cases vivent sur l'appareil : c'est un pense-bête du
     moment, pas une donnée à garder. */
  const cle = 'ec_afaire_' + normaliserMot(eleve).replace(/\s+/g, '_');
  let coches = {};
  try{ coches = JSON.parse(localStorage.getItem(cle) || '{}') || {}; }catch(e){}

  (afaireAjourne || AFAIRE_DEFAUT).forEach((x, i) => {
    /* La clé suit le rang : une liste modifiable n'a pas de clé
       stable, et c'est sans conséquence pour un pense-bête. */
    x.cle = 'p' + i;
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:flex-start;gap:10px;' +
      'text-transform:none;font-size:14px;color:var(--cream);margin:0 0 9px;' +
      'font-weight:400;line-height:1.5;';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!coches[x.cle];
    cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin:2px 0 0;';
    l.appendChild(cb);

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;' +
      (cb.checked ? 'opacity:.5;' : '');
    t.innerHTML = x.nom +
      (x.aide
        ? '<div style="font-size:11px;color:var(--muted);margin-top:3px;">' +
          x.aide + '</div>'
        : '');
    l.appendChild(t);

    /* Une fois fait, la ligne s'estompe : ce qui reste se voit */
    cb.addEventListener('change', () => {
      coches[x.cle] = cb.checked;
      try{ localStorage.setItem(cle, JSON.stringify(coches)); }catch(e){}
      t.style.opacity = cb.checked ? '.5' : '1';
    });

    z.appendChild(l);
  });

  d.appendChild(z);

  /* Chacun peut corriger la liste : elle décrit nos gestes, et
     ils changent. */
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'margin-top:6px;padding:9px;font-size:12px;';
  b.textContent = '✏️ Modifier cette liste';
  b.addEventListener('click', () => modifierAfaireAjourne(eleve));
  d.appendChild(b);

  return d;
}


/* ============================================================
   MODIFIER LA LISTE

   Chaque point a un intitulé et un chemin. Le bureau en ajoute,
   en retire, en corrige — pour tout le monde.
   ============================================================ */

function modifierAfaireAjourne(eleve){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(600px, 95vw);max-height:92vh;overflow-y:auto;';

  boite.innerHTML = '<h3>✏️ Ce qui reste à faire</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
      'line-height:1.5;">Cette liste sert à toute l\'équipe. Le chemin ' +
      's\'affiche sous l\'intitulé, en petit.</div>';

  const zl = document.createElement('div');
  boite.appendChild(zl);

  /* On travaille sur une copie : annuler ne doit rien changer */
  let brouillon = (afaireAjourne || AFAIRE_DEFAUT)
    .map(x => Object.assign({}, x));

  const dessiner = () => {
    zl.innerHTML = '';

    brouillon.forEach((x, i) => {
      const bloc = document.createElement('div');
      bloc.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
        'padding:9px 11px;margin-bottom:8px;';

      const h = document.createElement('div');
      h.style.cssText = 'display:flex;gap:7px;align-items:center;' +
        'margin-bottom:7px;';

      const iN = document.createElement('input');
      iN.type = 'text';
      iN.value = x.nom || '';
      iN.placeholder = 'Ce qu\'il faut faire';
      iN.style.cssText = 'flex:1;min-width:0;padding:7px 9px;font-size:13px;' +
        'margin:0;';
      iN.addEventListener('input', () => { brouillon[i].nom = iN.value; });
      h.appendChild(iN);

      /* Le remonter, pour l'ordre des gestes */
      if(i > 0){
        const bU = document.createElement('button');
        bU.className = 'btn btn-secondary';
        bU.style.cssText = 'width:auto;padding:6px 8px;font-size:12px;margin:0;' +
          'flex-shrink:0;';
        bU.textContent = '↑';
        bU.addEventListener('click', () => {
          const t = brouillon[i - 1];
          brouillon[i - 1] = brouillon[i];
          brouillon[i] = t;
          dessiner();
        });
        h.appendChild(bU);
      }

      const bS = document.createElement('button');
      bS.className = 'btn btn-secondary';
      bS.style.cssText = 'width:auto;padding:6px 8px;font-size:12px;margin:0;' +
        'flex-shrink:0;color:var(--red);border-color:var(--red);';
      bS.textContent = '×';
      bS.addEventListener('click', () => {
        brouillon.splice(i, 1);
        dessiner();
      });
      h.appendChild(bS);

      bloc.appendChild(h);

      const iA = document.createElement('textarea');
      iA.rows = 2;
      iA.value = x.aide || '';
      iA.placeholder = 'Le chemin à suivre (facultatif)';
      iA.style.cssText = 'width:100%;background:var(--navy);' +
        'border:1px solid var(--line);color:var(--muted);padding:7px 9px;' +
        'border-radius:8px;font-size:12px;line-height:1.5;' +
        'font-family:inherit;resize:vertical;margin:0;';
      iA.addEventListener('input', () => { brouillon[i].aide = iA.value; });
      bloc.appendChild(iA);

      zl.appendChild(bloc);
    });
  };
  dessiner();

  const bAdd = document.createElement('button');
  bAdd.className = 'btn btn-secondary';
  bAdd.style.cssText = 'margin-bottom:10px;padding:10px;font-size:12px;';
  bAdd.textContent = '➕ Ajouter un point';
  bAdd.addEventListener('click', () => {
    brouillon.push({ nom: '', aide: '' });
    dessiner();
  });
  boite.appendChild(bAdd);

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => {
    document.body.removeChild(fond);
    ouvrirMessagesAjourne(eleve);
  });
  r.appendChild(bA);

  const bR = document.createElement('button');
  bR.className = 'btn btn-secondary';
  bR.style.cssText = 'width:auto;padding:12px 13px;font-size:12px;';
  bR.textContent = '↩️';
  bR.title = 'Revenir à la liste d\'origine';
  bR.addEventListener('click', async () => {
    if(!await confirmer('Revenir à la liste d\'origine ?\n\n' +
        'Rien n\'est enregistré tant que tu n\'appuies pas sur 💾.')) return;
    brouillon = AFAIRE_DEFAUT.map(x => Object.assign({}, x));
    dessiner();
  });
  r.appendChild(bR);

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = '💾 Enregistrer';
  bO.addEventListener('click', async () => {
    bO.disabled = true;
    afaireAjourne = brouillon.filter(x => String(x.nom || '').trim());
    if(await rangerAfaireAjourne()){
      document.body.removeChild(fond);
      showToast('Liste enregistrée ✅');
      ouvrirMessagesAjourne(eleve);
    }else{
      bO.disabled = false;
    }
  });
  r.appendChild(bO);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


function modifierMessagesAjourne(eleve){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(640px, 95vw);max-height:92vh;overflow-y:auto;';

  boite.innerHTML = '<h3>✏️ Les messages d\'ajournement</h3>';

  const zones = {};
  [['m1', '1. La marche à suivre', 'ajourne1'],
   ['m3', '3. Le modèle de bilan', 'ajourne3'],
   ['m4', '4. La relance', 'ajourne4']].forEach(([cle, titre, reglage]) => {
    const l = document.createElement('label');
    l.textContent = titre;
    boite.appendChild(l);

    const z = document.createElement('textarea');
    z.rows = 8;
    z.value = messagesAjourne[cle];
    z.style.cssText = 'width:100%;background:var(--navy);' +
      'border:1px solid var(--line);color:var(--cream);padding:10px 11px;' +
      'border-radius:10px;font-size:12px;line-height:1.55;' +
      'font-family:inherit;resize:vertical;margin-bottom:12px;';
    boite.appendChild(z);
    zones[cle] = { zone: z, reglage: reglage };
  });

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => {
    document.body.removeChild(fond);
    ouvrirMessagesAjourne(eleve);
  });
  r.appendChild(bA);

  /* Revenir aux textes d'origine, après une fausse manœuvre */
  const bR = document.createElement('button');
  bR.className = 'btn btn-secondary';
  bR.style.cssText = 'width:auto;padding:12px 13px;font-size:12px;';
  bR.textContent = '↩️';
  bR.title = 'Revenir aux textes d\'origine';
  bR.addEventListener('click', async () => {
    if(!await confirmer('Revenir aux textes d\'origine ?\n\n' +
        'Rien n\'est enregistré tant que tu n\'appuies pas sur 💾.')) return;
    zones.m1.zone.value = MSG_AJOURNE_1;
    zones.m3.zone.value = MSG_AJOURNE_3;
    zones.m4.zone.value = MSG_AJOURNE_4;
  });
  r.appendChild(bR);

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = '💾 Enregistrer';
  bO.addEventListener('click', async () => {
    bO.disabled = true;
    try{
      for(const cle of Object.keys(zones)){
        await appelPrep({ action: 'reglageSet',
                          cle: zones[cle].reglage,
                          valeur: zones[cle].zone.value,
                          par: ACCES.moniteur || '' });
        messagesAjourne[cle] = zones[cle].zone.value;
      }
      document.body.removeChild(fond);
      showToast('Messages enregistrés ✅');
      ouvrirMessagesAjourne(eleve);
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


/* ------------------------------------------------------------
   LA GALERIE À COPIER — LECTURE SEULE

   Les mêmes captures que « blocCaptures », mais sans rien pour en
   ajouter ni en retirer : celles-là se gèrent dans la fiche de
   l'élève, à un seul endroit.

   Ici, un seul geste : mettre l'image dans le presse-papier pour la
   coller sur Messenger.

   ⚠️ La copie d'une IMAGE n'est pas celle d'un texte : elle demande
   un vrai fichier, et le presse-papier n'accepte que le PNG. On
   repasse donc par un canvas — une capture réduite en JPEG serait
   refusée telle quelle. Et quand le navigateur ne sait pas le
   faire (téléphones, navigation privée), on le DIT et on ouvre
   l'image en grand pour qu'elle soit prise à la main.
   ------------------------------------------------------------ */
async function copierImageDansPressePapier(src){
  /* Le navigateur sait-il seulement écrire une image ? */
  if(typeof ClipboardItem === 'undefined' ||
     !navigator.clipboard || !navigator.clipboard.write){
    throw new Error('presse-papier images indisponible');
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((ok, ko) => {
    img.onload = ok;
    img.onerror = () => ko(new Error('image illisible'));
    img.src = src;
  });
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  const blob = await new Promise((ok, ko) =>
    c.toBlob(b => b ? ok(b) : ko(new Error('conversion impossible')), 'image/png'));
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

function galerieCapturesAcopier(eleve){
  const zone = document.createElement('div');
  zone.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-top:4px;';
  zone.innerHTML = '<div style="font-size:12px;color:var(--muted);">Chargement…</div>';

  (async () => {
    const liste = await chargerCaptures(eleve);
    zone.innerHTML = '';

    /* L'absence se dit, et elle dit où aller. Un cadre vide
       laisserait croire que la fenêtre n'a pas fini de charger. */
    if(!liste.length){
      const v = document.createElement('div');
      v.style.cssText = 'font-size:12px;color:var(--warn-text);line-height:1.5;';
      v.textContent = 'Aucune capture déposée pour cet élève. ' +
        'Elles s’ajoutent depuis sa fiche, dans « 🏁 Résultats ».';
      zone.appendChild(v);
      return;
    }

    liste.forEach((cap, i) => {
      const vig = document.createElement('div');
      vig.style.cssText = 'width:120px;flex-shrink:0;';

      const img = document.createElement('img');
      img.src = cap.image;
      img.style.cssText = 'width:100%;height:110px;object-fit:cover;border-radius:8px;' +
        'border:1px solid var(--line);cursor:zoom-in;display:block;';
      img.title = 'Capture ' + (i + 1) + ' — appuie pour agrandir';
      img.addEventListener('click', () => agrandirImage(cap.image, eleve));
      vig.appendChild(img);

      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:100%;margin-top:5px;padding:7px;font-size:12px;';
      b.textContent = '📋 Copier';
      b.addEventListener('click', async () => {
        b.disabled = true;
        try{
          await copierImageDansPressePapier(cap.image);
          b.textContent = '✅ Copiée';
          showToast('Capture copiée ✅');
          setTimeout(() => { b.textContent = '📋 Copier'; b.disabled = false; }, 2500);
        }catch(e){
          b.disabled = false;
          /* On n'échoue pas en silence : on ouvre l'image en grand,
             et on dit quoi faire à la main. */
          showToast('Ton navigateur ne sait pas copier une image — ' +
                    'garde-la depuis l’aperçu.');
          agrandirImage(cap.image, eleve);
        }
      });
      vig.appendChild(b);

      zone.appendChild(vig);
    });
  })();

  return zone;
}


function blocCaptures(eleve, dateExamen){
  const d = document.createElement('div');
  d.style.cssText = 'margin-bottom:12px;';

  const l = document.createElement('label');
  l.textContent = '📷 Captures du CEPC';
  d.appendChild(l);

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 8px;line-height:1.4;';
  aide.textContent = 'Colle, glisse ou choisis tes captures : recto, verso, observations. ' +
    'Elles sont réduites automatiquement et suivront jusqu\'au rendez-vous post-permis.';
  d.appendChild(aide);

  const galerie = document.createElement('div');
  galerie.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;';
  d.appendChild(galerie);

  async function dessiner(){
    galerie.innerHTML = '<div style="font-size:12px;color:var(--muted);">Chargement…</div>';
    const liste = await chargerCaptures(eleve);
    galerie.innerHTML = '';

    if(!liste.length){
      const v = document.createElement('div');
      v.style.cssText = 'font-size:12px;color:var(--muted);';
      v.textContent = 'Aucune capture pour le moment.';
      galerie.appendChild(v);
      return;
    }

    liste.forEach((cap, i) => {
      const vig = document.createElement('div');
      vig.style.cssText = 'position:relative;width:96px;flex-shrink:0;';

      const img = document.createElement('img');
      img.src = cap.image;
      img.style.cssText = 'width:100%;height:96px;object-fit:cover;border-radius:8px;' +
        'border:1px solid var(--line);cursor:zoom-in;display:block;';
      img.title = 'Capture ' + (i + 1) + ' — appuie pour agrandir';
      img.addEventListener('click', () => agrandirImage(cap.image, eleve));
      vig.appendChild(img);

      const x = document.createElement('button');
      x.type = 'button';
      x.style.cssText = 'position:absolute;top:2px;right:2px;width:24px;height:24px;' +
        'border-radius:12px;border:none;background:rgba(0,0,0,.65);color:#fff;' +
        'font-size:13px;cursor:pointer;line-height:1;';
      x.textContent = '✕';
      x.title = 'Retirer cette capture';
      x.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        if(!await confirmer('Retirer cette capture ?')) return;
        try{
          await appelPrep({ action: 'captureDelete', id: cap.id });
          dessiner();
        }catch(e){ showToast('Erreur : ' + e.message); }
      });
      vig.appendChild(x);

      galerie.appendChild(vig);
    });
  }
  dessiner();

  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.multiple = true;
  inp.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:10px;border-radius:10px;font-size:14px;margin-bottom:6px;';
  d.appendChild(inp);

  const etat = document.createElement('div');
  etat.style.cssText = 'font-size:11px;color:var(--muted);line-height:1.4;min-height:14px;';
  d.appendChild(etat);

  /* Le traitement, commun aux trois façons d'ajouter une image */
  async function ajouterImages(fichiers){
    if(!fichiers.length) return;

    let ok = 0;
    for(let i = 0; i < fichiers.length; i++){
      etat.style.color = 'var(--muted)';
      etat.textContent = 'Capture ' + (i + 1) + ' sur ' + fichiers.length + '…';
      try{
        const donnees = await compresserImage(fichiers[i]);
        await appelPrep({ action: 'captureAdd', eleve: eleve,
                          dateExamen: dateExamen || '', image: donnees });
        ok++;
      }catch(e){
        etat.style.color = 'var(--warn-text)';
        etat.textContent = 'Capture ' + (i + 1) + ' : ' + e.message;
      }
    }
    if(ok){
      etat.style.color = 'var(--accent-text)';
      etat.textContent = '✅ ' + ok + ' capture(s) ajoutée(s)';
      dessiner();
    }
  }

  inp.addEventListener('change', async () => {
    await ajouterImages(Array.prototype.slice.call(inp.files || []));
    inp.value = '';
  });

  /* ---- Coller depuis le presse-papier ---- */
  const zColler = document.createElement('div');
  zColler.tabIndex = 0;
  zColler.style.cssText = 'border:2px dashed var(--line);border-radius:10px;' +
    'padding:14px 12px;text-align:center;font-size:13px;color:var(--muted);' +
    'cursor:pointer;margin-bottom:6px;transition:border-color .15s, background .15s;';
  zColler.innerHTML = '📋 <strong>Colle ta capture ici</strong><br>' +
    '<span style="font-size:11px;">Ctrl+V, ou fais glisser l\'image</span>';
  d.insertBefore(zColler, inp);

  zColler.addEventListener('click', () => zColler.focus());

  zColler.addEventListener('paste', async ev => {
    const items = (ev.clipboardData && ev.clipboardData.items) || [];
    const images = [];
    for(let i = 0; i < items.length; i++){
      if(items[i].type && items[i].type.indexOf('image') === 0){
        const f = items[i].getAsFile();
        if(f) images.push(f);
      }
    }
    if(!images.length) return;
    ev.preventDefault();
    zColler.style.borderColor = 'var(--orange)';
    await ajouterImages(images);
    zColler.style.borderColor = 'var(--line)';
  });

  /* Coller n'importe où dans la page, même sans avoir cliqué la
     zone.

     Quand la zone a déjà le curseur, son propre écouteur fait le
     travail : renvoyer l'événement le comptait deux fois, et
     l'image arrivait en double. */
  const surCollage = async ev => {
    if(document.activeElement === zColler) return;
    if(!document.body.contains(zColler)) return;

    const items = (ev.clipboardData && ev.clipboardData.items) || [];
    const images = [];
    for(let i = 0; i < items.length; i++){
      if(items[i].type && items[i].type.indexOf('image') === 0){
        const f = items[i].getAsFile();
        if(f) images.push(f);
      }
    }
    if(!images.length) return;

    ev.preventDefault();
    zColler.style.borderColor = 'var(--orange)';
    await ajouterImages(images);
    zColler.style.borderColor = 'var(--line)';
  };
  /* Un seul écouteur à la fois : sans cela, il s'en ajoutait un
     à chaque ouverture de la fenêtre, et la troisième image
     arrivait en trois exemplaires. */
  if(window.__ecCollage){
    document.removeEventListener('paste', window.__ecCollage);
  }
  window.__ecCollage = surCollage;
  document.addEventListener('paste', surCollage);

  /* ---- Glisser-déposer ---- */
  ['dragenter', 'dragover'].forEach(n => {
    zColler.addEventListener(n, ev => {
      ev.preventDefault();
      zColler.style.borderColor = 'var(--orange)';
      zColler.style.background = 'rgba(182,255,14,.06)';
    });
  });
  ['dragleave', 'drop'].forEach(n => {
    zColler.addEventListener(n, ev => {
      ev.preventDefault();
      zColler.style.borderColor = 'var(--line)';
      zColler.style.background = 'transparent';
    });
  });
  zColler.addEventListener('drop', async ev => {
    const fichiers = Array.prototype.slice.call(
      (ev.dataTransfer && ev.dataTransfer.files) || [])
      .filter(f => f.type && f.type.indexOf('image') === 0);
    await ajouterImages(fichiers);
  });

  return d;
}

function agrandirImage(src, titre){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  fond.style.cursor = 'zoom-out';
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'max-width:96vw;max-height:92vh;border-radius:10px;';
  img.alt = titre || '';
  fond.appendChild(img);
  fond.addEventListener('click', () => document.body.removeChild(fond));
  document.body.appendChild(fond);
}

/* Le parcours de l'élève, d'après sa frise de formation */
function parcoursDe(e){
  const t = String((e && e.note) || '') + ' ' + String((e && e.etat && e.etat.frise) || '');
  if(/\bAAC\b|conduite accompagnée/i.test(t)) return 'AAC';
  return 'CS';
}

/* Nom propre au module : ec-sessions déclare une boiteDe qui
   attend un nom, pas un élève entier. Chargée après, elle
   écrasait celle-ci. */
/* ============================================================
   🚗 → 🅱️ LE PASSAGE EN PASSERELLE BEA → BV

   Chrystel, le 4 septembre 2026 : « quand c'est un permis obtenu en
   BEA, que ça inscrive automatiquement l'élève à une autre formation
   de type passerelle BEA → BV, et que ça supprime tous ses bilans de
   conduite BEA — avec une validation avant, bien évidemment ».

   Et sur la trace : « pour vider la base de données et faire de la
   place, on ne reviendra plus jamais dessus — comme supprimer son
   dossier, mais on garde une autre fiche pour la passerelle avec ses
   prochains cours ». Puis : « uniquement si TU le fais
   automatiquement, moi je ne le ferai pas ».

   ⚠️ L'ORDRE EST LA SEULE CHOSE QUI PROTÈGE ICI.

     1. ARCHIVER — le dossier complet part sur le Drive.
     2. DUPLIQUER — la fiche passerelle est créée.
     3. EFFACER — et seulement alors.

   Chaque étape ne se fait que si la précédente a réussi. Une
   archive ratée arrête tout : mieux vaut un dossier qui prend de la
   place qu'un dossier perdu. Et la duplication passe AVANT
   l'effacement, sinon un échec de création laisserait l'élève sans
   rien du tout.

   La confirmation dit ce qui va partir, et le nom qu'il portera.
   ============================================================ */
const FORMATION_PASSERELLE = 'Passerelle BEA→BV';

/* Le nom de la seconde fiche. Même forme que « ➕ Une autre
   formation pour cet élève » : le suffixe entre parenthèses. */
function nomFichePasserelle(nom){
  return String(nom || '').trim() + ' (Passerelle BV)';
}

async function proposerPasserelle(x, boite){
  const nom = String((x && x.eleve) || '').trim();
  if(!nom) return;
  /* La passerelle part d'un permis en BOÎTE AUTOMATIQUE, et de
     nulle part ailleurs : c'est le B78 qu'elle vient lever. */
  if(String(boite || '') !== 'BEA') return;
  /* ⚠️ « peutModifier », pas « aDroit » : celui-ci ne prend qu'un
     argument et se contente d'un droit de LECTURE. Proposer un
     effacement définitif à qui ne peut que regarder, c'est promettre
     ce que le serveur refusera. */
  if(typeof peutModifier === 'function' && !peutModifier('eleves')) return;

  const nouveau = nomFichePasserelle(nom);

  if(!await confirmer(
      'Duplication de fiche en passerelle BEA → BV ?\n\n' +
      nom + ' vient d’obtenir son permis en automatique.\n\n' +
      '✅ Une fiche « ' + nouveau + ' » est créée, en passerelle.\n' +
      '📄 Son dossier complet est archivé sur le Drive.\n' +
      '🗑️ Puis son dossier BEA est effacé — bilans, suivi, cours à ' +
      'venir, captures.\n\n' +
      'L’effacement est DÉFINITIF, et n’a lieu que si l’archive ' +
      'a bien été écrite.')) return;

  const dire = t => showToast(t);

  /* ---- 1. L'ARCHIVE, D'ABORD ---- */
  dire('Archivage du dossier…');
  let archive;
  try{
    archive = await appelPrep({ action:'archiverDossier', eleve: nom });
  }catch(e){
    await informer('Le dossier de ' + nom + " n'a PAS pu être archivé.\n\n" +
      'Détail : ' + (e && e.message ? e.message : e) + '\n\n' +
      "RIEN n'a été effacé, et aucune fiche n'a été créée. " +
      'Recommence, ou fais-le à la main depuis 🔒 RGPD.', 'Passerelle');
    return;
  }
  if(!archive || archive.status !== 'ok' || !archive.lien){
    await informer('Le dossier de ' + nom + " n'a PAS pu être archivé.\n\n" +
      ((archive && archive.message) || 'Réponse inattendue du classeur.') +
      "\n\nRIEN n'a été effacé.", 'Passerelle');
    return;
  }

  /* ---- 2. LA FICHE PASSERELLE ---- */
  dire('Création de sa fiche passerelle…');
  const f = (typeof ficheDe === 'function') ? (ficheDe(nom) || {}) : {};
  try{
    await appelPrep({
      action: 'ficheSet',
      eleve: nouveau,
      telephone: f.telephone || '',
      email: f.email || '',
      formation: FORMATION_PASSERELLE,
      messenger: f.messenger || '',
      site: f.site || '',
      remarques: 'Passerelle après permis BEA obtenu — dossier BEA archivé le ' +
                 new Date().toLocaleDateString('fr-FR'),
      par: ACCES.moniteur || ''
    });
  }catch(e){
    await informer('Sa fiche passerelle n’a pas pu être créée.\n\n' +
      'Détail : ' + (e && e.message ? e.message : e) + '\n\n' +
      "RIEN n'a été effacé — son dossier BEA est intact. " +
      'L’archive, elle, est déjà sur le Drive.', 'Passerelle');
    return;
  }

  /* ---- 3. L'EFFACEMENT, EN DERNIER ---- */
  dire('Effacement du dossier BEA…');
  let bilan = null;
  try{
    bilan = await supprimerEleveComplet(nom, t => dire(nom + ' — ' + t));
  }catch(e){
    bilan = { faits: [], rates: ['tout (' + (e && e.message ? e.message : e) + ')'] };
  }

  if(typeof chargerEleves === 'function') await chargerEleves();
  if(typeof afficherRepertoire === 'function') afficherRepertoire(true);
  if(typeof afficherBureau === 'function') afficherBureau(true);

  const rates = (bilan && bilan.rates) || [];
  await informer(
    (rates.length ? '⚠️ Passage en passerelle — effacement INCOMPLET'
                  : '✅ ' + nom + ' est passé en passerelle') + '\n\n' +
    '📄 Archive : ' + archive.fichier + ' (' + archive.lignes + ' ligne(s))\n' +
    '   ' + archive.lien + '\n\n' +
    '✅ Fiche créée : ' + nouveau + '\n\n' +
    (rates.length
      ? "🗑️ N'a PAS pu être effacé : " + rates.join(', ') +
        '.\nCe qui est parti : ' + (((bilan && bilan.faits) || []).join(' · ') || 'rien') +
        '.\nRecommence l’effacement depuis 🔒 RGPD — l’archive, elle, est faite.'
      : '🗑️ Dossier BEA effacé : ' +
        (((bilan && bilan.faits) || []).join(' · ') || 'rien à retirer')),
    'Passerelle BEA → BV');
}


function boiteDePostPermis(e){
  const s = suiviDe(e.eleve) || {};
  if(e._boite === 'bea' || /bea|automatique/i.test(s.typeExamen || '')) return 'BEA';
  if(e._boite === 'handicap') return 'Handicap';
  return 'BV';
}

/* Consigne le résultat, pour les statistiques */
async function consignerResultat(e, resultat, iso){
  const s = suiviDe(e.eleve) || {};

  /* ⚠️ LE CACHE DES RÉSULTATS DOIT OUBLIER, SINON L'ÉLÈVE REVIENT.

     La liste des examens passés garde cinq minutes la feuille des
     Résultats pour savoir qui a déjà le sien. On vient d'en écrire
     un : sans cet oubli, la copie d'il y a trois minutes gagnerait
     et l'élève qu'on sort réapparaîtrait aussitôt.

     C'est le défaut du cache de trente secondes qui ravalait les
     dates de prise des places, et celui du cache du bureau. On
     oublie AVANT d'écrire : si l'écriture échoue, on aura seulement
     relu une fois de trop. */
  if(typeof oublierResultatsConnus === 'function') oublierResultatsConnus();

  try{
    await appelPrep({
      action: 'resultatAdd',
      eleve: e.eleve,
      dateExamen: iso || '',
      resultat: resultat,
      boite: boiteDePostPermis(e),
      parcours: parcoursDe(e),
      moniteur: s.moniteurDate || e.moniteur || '',
      centre: s.centre || '',
      rang: String((parseInt(s.nbAjournements, 10) || 0) + 1)
    });
  }catch(err){
    /* LE RÉSULTAT NE SE RATTRAPE PAS.

       L'échec ne partait qu'en console : l'élève sortait des
       listes, la statistique de réussite le perdait pour
       toujours, et personne ne l'apprenait. Un résultat d'examen
       ne se retrouve pas — il faut le dire au moment où il ne
       s'écrit pas. */
    console.warn('Résultat non consigné :', err);
    try{
      await informer("Le résultat de " + e.eleve + " n'a PAS été " +
        'enregistré dans les statistiques.\n\n' +
        'Détail : ' + (err && err.message ? err.message : err) + '\n\n' +
        "Le reste de l'opération se poursuit. Note-le : ce chiffre-là " +
        'ne se rattrape pas tout seul.', 'Résultat non consigné');
    }catch(e2){}
  }
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-postpermis.js'] = true;
