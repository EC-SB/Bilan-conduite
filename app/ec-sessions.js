/* Déployé le 21/11/2026 à 19:57 — v1547 */
/* ============================================================
   ec-sessions.js
   Les sessions d'examen, place par place.

   Une session = une demi-journée avec un inspecteur. On la crée
   en disant combien de places et à quelle heure elle commence ;
   les créneaux se calculent seuls. Chaque place accueille un
   élève, ou reste une place fantôme.

   Tout se voit d'un coup d'œil : qui est prévenu, qui a son
   dossier prêt, qui n'est pas encore prêt à passer.
   ============================================================ */

let sessionsPermis = [];
let sessionsOuvertes = {};
/* La place retenue pour un échange, en attente de la seconde */
let echangeEnCours = null;


/* La boîte d'un élève : sa fiche de suivi d'abord, son type de
   bilan ensuite. Sans elle on ne sait pas quel véhicule prévoir. */
function boiteDe(nom){
  if(!nom) return '';

  const su = (typeof suiviDe === 'function') ? suiviDe(nom) : {};
  if(su.typeExamen) return String(su.typeExamen).toLowerCase();

  const e = eleveDuBureau(nom);
  if(e){
    if(e.boite) return String(e.boite).toLowerCase();
    if(/automatique|bea/i.test(e.type || '')) return 'bea';
    if(/manuelle|\bbv\b/i.test(e.type || '')) return 'bv';
  }

  /* Sa fiche du répertoire, quand elle porte la formation */
  const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
  if(f && f.formation){
    /* LA TABLE DES PARCOURS D'ABORD.

       Elle sait déjà dans quelle boîte roule chaque formation.
       Chercher « auto » dans le nom une seconde fois ici, c'était
       se donner deux réponses pour une question — et « Autre auto
       école BV » les envoyait toutes sur la boîte automatique, à
       cause du mot « auto » d'« auto école ». */
    const p = (typeof parcoursDeLaFormation === 'function')
      ? parcoursDeLaFormation(f.formation) : null;
    if(p && p.boite) return String(p.boite).toLowerCase();

    /* Une formation saisie à la main, hors table : on lit son nom. */
    if(/auto|bea/i.test(f.formation)) return 'bea';
    return 'bv';
  }

  return '';
}

/* L'étiquette colorée, lisible d'un coup d'œil */
function etiquetteBoite(boite){
  if(!boite) return '';
  const bea = (boite === 'bea');
  return '<span style="display:inline-block;margin-left:6px;padding:1px 6px;' +
    'border-radius:5px;font-size:10px;font-weight:800;' +
    'background:' + (bea ? 'rgba(93,173,226,.22)' : 'rgba(182,255,14,.18)') + ';' +
    'color:' + (bea ? '#5DADE2' : 'var(--accent-text)') + ';">' +
    (bea ? 'BEA' : 'BV') + '</span>';
}


/* Un élève est « au vert » quand tout est fait : prévenu, dossier
   vérifié, et rien qui traîne côté préparation. */
/* ============================================================
   UN MOT, UN SENS — « FANTÔME » EN DÉSIGNAIT DEUX

   Il existe une vraie case « 👻 fantôme » sur la fiche de suivi :
   elle dit qu'un élève tient une place en PRÊTE-NOM — placé sur
   RDV permis, mais jamais prévenu. C'est le sens métier.

   Et cette fonction appelait « 👻 Place fantôme » un créneau SANS
   AUCUN NOM. Deux choses différentes, un seul mot — et c'est le
   mauvais qui gagnait : le bloc « ⚠️ À traiter » ne ramassait que
   les créneaux vides, donc les vrais prête-noms n'apparaissaient
   NULLE PART. On ne voyait plus qui était placé sur RDV permis.

   Depuis la v791, trois états distincts :
   · ⬜ place libre  — personne dessus, rien à faire ;
   · 👻 prête-nom    — quelqu'un tient la place, jamais prévenu ;
   · 🔄 à remplacer  — quelqu'un de prévenu, qui a conduit, et
                       qu'il faut remplacer.
   ============================================================ */
function etatPlace(place, eleveBureau){
  if(!place.eleve){
    return { cle:'vide', emoji:'⬜', texte:'Place libre',
             couleur:'var(--muted)' };
  }

  const su = (typeof suiviDe === 'function') ? suiviDe(place.eleve) : {};

  /* « À remplacer » d'abord, « prête-nom » ensuite — mais la règle
     n'est plus écrite ici : « marquePlaceExamen » (ec-bureau.js) la
     tient pour les trois écrans qui la lisent maintenant, celui-ci,
     la carte de 📅 Mes prochains cours et le dossier de l'élève.
     Recopiée, elle aurait fini par ne plus dire la même chose. */
  const marque = (typeof marquePlaceExamen === 'function')
    ? marquePlaceExamen(place.eleve) : null;
  if(marque){
    return { cle: marque.cle, emoji: marque.emoji,
             texte: marque.texte, couleur: marque.couleur };
  }

  /* « Tout est OK » tranche : c'est le bureau qui le dit, après
     vérification. Aucun signalement automatique ne le contredit. */
  if(su.toutOk === 'oui'){
    return { cle:'ok', emoji:'✅', texte:'Tout est prêt',
             couleur:'var(--accent-text)' };
  }

  const manque = [];
  if(!place.prevenu) manque.push('pas prévenu');
  if(!place.dossierOk) manque.push('dossier à vérifier');
  if(su.fairePoint === 'oui') manque.push('faire le point');
  /* 💶 v1193 — le reste à payer ne s'écrit plus ici : la ligne
     « 💶 Il doit de l'argent » le porte, avec le montant, tant que
     « Tout est payé » n'est pas coché. Voir lignesDeLaPreparation. */
  /* Une relance dépassée : c'est le genre de chose qui se perd */
  if(su.relanceLe && su.relanceLe <= todayLocal()){
    manque.push('à relancer');
  }

  /* Ce que sa note de suivi signale encore */
  if(eleveBureau && typeof analyserNote === 'function'){
    const a = analyserNote(eleveBureau.note || '');
    if(a.examBlanc === 'aprevoir') manque.push('examen blanc à prévoir');
    if(a.simuNuit === 'aprevoir') manque.push('simulateur à prévoir');
  }

  /* ⚠️ v1193 — PLUS DE VERT SANS « TOUT EST OK ». David, le 16 octobre :
     « l'élève ne passe au vert que quand la case Tout est OK est
     cochée ». Avant, une fiche sans rien à signaler passait au vert
     toute seule — un élève dont personne n'avait encore regardé la
     préparation avait l'air prêt. */
  if(!manque.length){
    return { cle:'attente', emoji:'🟠', texte:'à valider : « Tout est OK » pas coché',
             couleur:'var(--warn-text)' };
  }
  return { cle:'attente', emoji: place.prevenu ? '🟠' : '🔴',
           texte: manque.join(' · '), couleur:'var(--warn-text)' };
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */

/* Redessine SANS relire le serveur : les données en mémoire sont
   déjà à jour, une action vient de les modifier. Douze appels à
   afficherSessionsPermis() rechargeaient tout pour rien. */
function redessinerSessions(){
  const zone = $('sessionsPermis');
  if(!zone) return;
  dessinerSessions(zone);
  /* Un redessin refabrique les boutons : sans ça, la place retenue
     perdrait sa couleur et on ne saurait plus ce qu'on a choisi. */
  peindreEchange();
}


/* Charger les sessions, sans rien dessiner.

   La place d'un élève dans une session vaut date d'examen, et cette
   date-là ne s'écrit dans aucune note : le rappel et la réparation
   en ont besoin autant que cet écran. Séparé du dessin pour qu'ils
   puissent l'appeler sans repeindre une page qu'ils n'affichent
   pas. */
/* ============================================================
   💬 LA BULLE SE VERDIT TOUTE SEULE — v1191

   Une session dont le groupe de la messagerie existe a son groupe
   fait : la case se coche (et s'enregistre) sans qu'on y touche. La
   création depuis Messenger permis la cochait déjà ; un groupe créé
   avant, ou dont l'enregistrement avait échoué, restait gris.

   Sans le droit d'écrire les sessions, la bulle est verte à l'écran
   quand même : le groupe existe, c'est ce qu'elle doit dire.
   ============================================================ */
function cocherLesGroupesFaits(liens){
  const l = liens || ((typeof liensGroupesPermis !== 'undefined') ? liensGroupesPermis : {}) || {};
  let change = false;
  (sessionsPermis || []).forEach(sess => {
    if(!sess || !sess.id || sess.groupeFait || !l[sess.id]) return;
    sess.groupeFait = true;
    change = true;
    try{
      appelPrep({ action: 'sessionGroupe', id: sess.id, groupeFait: 'oui' }).catch(() => {});
    }catch(e){}
  });
  const z = (typeof $ === 'function') ? $('sessionsPermis') : null;
  if(change && z && z.childElementCount && typeof redessinerSessions === 'function'){
    try{ redessinerSessions(); }catch(e){}
  }
  return change;
}

async function chargerSessionsPermis(){
  /* Le suivi en même temps : c'est lui qui porte « à remplacer »,
     « tout est OK » et le reste à payer. */
  const [d] = await Promise.all([
    appelPrep({ action: 'sessionList' }),
    /* Le suivi porte les fiches de préparation. On le recharge
       à chaque affichage : une fiche modifiée ailleurs doit se
       voir ici, et le cache de 30 s évite les appels inutiles. */
    (typeof chargerBureau === 'function')
      ? chargerBureau(false).catch(() => null) : Promise.resolve()
  ]);
  sessionsPermis = (d && d.sessions) || [];

  /* Par date, puis par heure : deux sessions du même jour se suivent
     dans l'ordre où elles ont lieu. */
  sessionsPermis.sort((a, b) => {
    const j = String(a.date || '').localeCompare(String(b.date || ''));
    if(j !== 0) return j;
    return String(a.heureDebut || '').localeCompare(String(b.heureDebut || ''));
  });

  /* 🎓 Les groupes de la messagerie suivent leur session — v1135.
     Une session vient d'être relue : si elle a changé, son groupe
     suit. Sans attendre, et sans jamais bloquer cet écran. */
  if(typeof suivreLesGroupesPermis === 'function'){
    try{ suivreLesGroupesPermis(sessionsPermis).then(cocherLesGroupesFaits).catch(() => {}); }catch(e){}
  }

  return sessionsPermis;
}


/* ============================================================
   CHOISIR UNE PLACE, PAS UNE DATE

   Une date d'examen ne se choisit pas dans un calendrier : elle
   se prend sur une journée que la préfecture a donnée. Le bon
   objet existe depuis toujours et s'affiche déjà dans 🎓 Suivi
   permis — la 👻 PLACE FANTÔME, un créneau ouvert sans nom dessus.

   Cette fenêtre est la seule façon de prendre une date. Les
   calendriers libres qui l'entouraient disparaissent : quinze
   portes pour une règle, c'est quatorze portes de trop.

   Les places s'OUVRENT dans 🎓 Suivi permis. Ici, on ne fait que
   les remplir.
   ============================================================ */

/* TROIS SORTES DE PLACES PRENABLES, ET ON DIT QUI ON ENLÈVE.

   Ne proposer que les créneaux vides était trop étroit : une place
   tenue par un prête-nom se reprend sans rien coûter, et une place
   « à remplacer » attend justement qu'on la redonne. Les ignorer
   revenait à dire « aucune place » alors qu'il y en avait.

   L'ordre compte : les vraies places libres d'abord. On ne déloge
   personne tant qu'il reste un créneau vide. */
const RANG_PRENABLE = { vide: 0, pretenom: 1, remplacer: 2 };

function placesPrenablesExamen(){
  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);

  const out = [];
  (sessionsPermis || []).forEach(s => {
    if(!s.date || String(s.date) < auj) return;

    const libres = (s.eleves || []).filter(x => !x.eleve).length;
    const total = (s.eleves || []).length;

    (s.eleves || []).forEach(p => {
      let genre = 'vide';
      if(p.eleve){
        const su = (typeof suiviDe === 'function') ? suiviDe(p.eleve) : {};
        if(su.aRemplacer === 'oui') genre = 'remplacer';
        else if(su.fantome === 'oui') genre = 'pretenom';
        else return;                    /* place occupée pour de bon */
      }

      out.push({
        idSession: s.id, rang: p.rang, genre: genre,
        /* Qui on enlève. Vide pour un créneau libre — et un nom
           qu'on ne voit pas est un nom qu'on efface sans le savoir. */
        occupant: p.eleve || '',
        date: s.date, centre: s.centre || '',
        heure: p.heure || s.heureDebut || '',
        moniteur: s.moniteur || '', inspecteur: s.inspecteur || '',
        /* Combien de créneaux vides ce jour-là : « 1 place libre
           sur 4 » ne se lit pas comme « 4 sur 4 ». */
        libres: libres, total: total
      });
    });
  });

  out.sort((a, b) => {
    if(RANG_PRENABLE[a.genre] !== RANG_PRENABLE[b.genre]){
      return RANG_PRENABLE[a.genre] - RANG_PRENABLE[b.genre];
    }
    const j = String(a.date).localeCompare(String(b.date));
    return j !== 0 ? j : String(a.heure).localeCompare(String(b.heure));
  });
  return out;
}

/* Comment se lit chaque sorte, au même endroit pour tout le monde. */
function libellePrenable(p){
  if(p.genre === 'pretenom'){
    return { emoji:'👻', quoi:'Prête-nom : ' + p.occupant,
             detail:"il n'a jamais été prévenu",
             couleur:'#E8A33D' };
  }
  if(p.genre === 'remplacer'){
    return { emoji:'🔄', quoi:'À remplacer : ' + p.occupant,
             detail:'il a été prévenu et a conduit',
             couleur:'var(--red)' };
  }
  return { emoji:'⬜', quoi:'Place libre', detail:'', couleur:'var(--muted)' };
}

/* La session d'un élève : avec qui il passe, et à quelle heure.
   L'heure de passage n'est PAS sur la fiche de suivi — elle vit
   sur la place. C'est la seule façon de la connaître. */
function sessionDeLEleve(nom){
  const cle = normaliserMot(nom || '');
  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);

  let trouvee = null;
  (sessionsPermis || []).forEach(s => {
    (s.eleves || []).forEach(p => {
      if(normaliserMot(p.eleve || '') !== cle) return;
      const candidat = { session: s, place: p };
      trouvee = trouvee ? laMeilleureSession(trouvee, candidat, auj) : candidat;
    });
  });
  return trouvee;
}

/* ⚠️ ENTRE DEUX SESSIONS PASSÉES, C'ÉTAIT TOUJOURS LA PLUS ANCIENNE
   QUI GAGNAIT — v985, trouvé par David le 15 septembre.

   La règle était écrite juste au-dessus, en toutes lettres : « la
   plus proche à venir ; à défaut, la plus récente passée ». Mais la
   branche qui l'aurait appliquée se terminait par « && aVenir(s) » :
   entre deux dates PASSÉES, elle ne s'exécutait jamais. La première
   rencontrée restait — et comme la liste est triée par date
   croissante, c'était forcément la plus vieille.

   La Perle était inscrite sur deux sessions, le 24 août et le
   14 septembre. Son dossier annonçait « lundi 24 août, passage
   15:15 » le lendemain de son examen du 14 — la mauvaise date, et
   la mauvaise heure.

   On exécute donc la règle au lieu de la décrire : à venir bat
   passé ; entre deux à venir, la plus proche ; entre deux passées,
   la plus récente. */
function laMeilleureSession(a, b, auj){
  const da = String((a.session && a.session.date) || '');
  const db = String((b.session && b.session.date) || '');
  const aVenirA = da >= auj;
  const aVenirB = db >= auj;

  if(aVenirA !== aVenirB) return aVenirA ? a : b;
  if(aVenirA) return (da <= db) ? a : b;   /* à venir : la plus proche */
  return (da >= db) ? a : b;               /* passées : la plus récente */
}

/* PRENDRE LA PLACE, ET LE DIRE PARTOUT.

   Deux écritures, indissociables : la place accueille l'élève, et
   sa fiche de suivi porte la date. Écrites ICI, une seule fois —
   le dossier, la liste RDV Permis et l'écran des sessions
   passent tous par cette porte.

   La place d'abord : si l'écriture de la fiche échoue ensuite, on
   aura une place occupée sans date sur la fiche, ce qui se voit
   dans 🎓 Suivi permis. L'inverse — une date sans place — est
   exactement ce qu'on vient de corriger. */
/* SORTIR QUELQU'UN D'UNE SESSION, C'EST TOUJOURS LA MÊME CHOSE.

   « Il réapparaît dans RDV Permis quand il est enlevé d'une session
   examen. » — et il y a QUATRE portes qui mènent dehors :

     · on lui prend sa place (placerEleveSurPlace) ;
     · on vide sa place (⬜ Vider la place) ;
     · on efface son nom dans l'éditeur de place (retirerDeLaSession) ;
     · on supprime la session entière (🗑️ Supprimer).

   Les quatre écrivaient chacune SA version des mêmes champs, et
   deux d'entre elles laissaient l'élève nulle part :

     · 🗑️ SUPPRIMER n'écrivait rien du tout. La session partait avec
       ses places, l'élève gardait sa date sur sa fiche sans être sur
       aucune session, et dejaPlace() voyait cette date : exclu de RDV
       Permis, absent des sessions. Disparu, avec une date d'examen à
       laquelle personne ne l'attendait.

     · L'ÉDITEUR DE PLACE effaçait la date mais oubliait
       « aPlanifier ». Or la liste RDV Permis se construit sur
       aPlanifier === 'oui', pas sur l'absence de date : il tombait
       de la liste, exactement pareil. Et il gardait son 👻 sans
       tenir aucune place.

   C'est le défaut du vieux « 👻 Retirer » corrigé en v793, sur trois
   autres portes. Écrite une seule fois ici, la règle ne peut plus
   être oubliée par l'une d'elles. */
function champsSortieDeSession(){
  return {
    /* aPlanifier, PAS seulement la date effacée : c'est lui qui le
       fait apparaître dans RDV Permis (afficherRdvPermis). Et
       statut vide, sinon un « annulé » l'en écarte encore. */
    datePermis: '', aPlanifier: 'oui', statut: '',
    /* Il perd son étiquette : le prête-nom n'en tient plus une,
       celui à remplacer a été remplacé. Le bureau la remettra. */
    fantome: '', aRemplacer: '',
    /* Et ce qui n'avait de sens qu'avec cette date-là : un centre
       d'examen et un « tout est OK » sans examen sont deux réponses
       à une question qu'on ne pose plus. */
    centre: '', toutOk: ''
  };
}

/* ⚠️ LA CINQUIÈME CHOSE À DÉFAIRE : CE QUE LA NOTE ANNONCE.

   David, le 4 septembre : « j'avais prévu une élève au permis le
   4 septembre, je l'ai enlevée et supprimé la session — et je vois
   sur sa fiche que son permis est toujours prévu le 04/09. Je veux
   la mettre dans les élèves prêts au permis mais je ne peux pas. »

   La v796 avait réuni ici les CHAMPS DE LA FICHE, et c'était la
   moitié du travail. L'autre moitié, c'est la NOTE du dernier cours
   — « Examen du permis fixé au 4 septembre » — que le bureau ne peut
   pas réécrire. Tant qu'elle est là, « analyserNote » rend une date
   d'examen, « dejaPlace » la voit, et l'élève reste écarté des
   élèves prêts au permis : il n'a plus de place, plus de date sur sa
   fiche, et il est quand même invisible.

   UNE SEULE des quatre portes le faisait — « retirer de la session ».
   Les trois autres (vider la place, déloger quelqu'un, supprimer la
   session) laissaient l'annonce en place. C'est le même défaut que
   la v796, à un étage de plus.

   Tout est donc ici : solder les consignes qui portaient cette date,
   effacer les champs, puis annoncer par-dessus. L'ORDRE COMPTE — la
   nouvelle annonce parle d'examen, elle serait soldée avec les
   anciennes si on la posait avant. */
async function rendreALaListeRdvPermis(nom, quand){
  if(!nom) return;

  /* 1. Les consignes qui annonçaient cette date n'ont plus d'objet */
  try{
    const e = (typeof etatBureau !== 'undefined' && etatBureau.eleves)
      ? etatBureau.eleves.find(x => normaliserMot(x.eleve) === normaliserMot(nom))
      : null;
    const obsoletes = ((e && e.enAttente) || []).filter(cs =>
      /permis|examen/i.test((cs.type || '') + ' ' + (cs.texte || '')));
    for(const cs of obsoletes){
      try{ await appelPrep({ action: 'consigneDone', id: cs.id }); }catch(err){}
    }
  }catch(e){ /* pas de consigne lisible : le reste vaut mieux que rien */ }

  /* 2. Les champs de sa fiche */
  await majSuivi(nom, champsSortieDeSession());

  /* 3. Et la note du dernier cours, par-dessus : c'est la DERNIÈRE
        annonce qui fait foi (voir analyserNote). Sans elle, l'élève
        garde une date que personne ne peut plus effacer. */
  if(typeof envoyerConsigne === 'function'){
    try{
      await envoyerConsigne(nom, 'permis', phraseExamenAnnule(quand));
    }catch(e){ /* la fiche est déjà rendue : on ne bloque pas dessus */ }
  }
}

/* ============================================================
   LA PHRASE DE L'ANNULATION

   ⚠️ ELLE ÉTAIT ÉCRITE D'UNE FAÇON ET RELUE D'UNE AUTRE — v932.

   David : « là j'ai bien écrit annulé comme il faut, par contre il
   manque la date ». Et il a raison deux fois.

   Cette phrase s'écrivait « Examen du permis annulé (était le
   mardi 22 septembre 2026) ». Les deux lecteurs, eux, cherchent la
   date AVANT le mot — « Examen du permis du <date> annulé » : c'est
   la forme de « analyserNote » (ec-bureau.js) et celle de la
   relecture du questionnaire. Aucun des deux ne trouvait donc la
   date, et la fiche de route affichait « Examen du permis annulé »
   tout court.

   La phrase prend la forme que les lecteurs connaissent déjà — et
   elle porte les DEUX dates, celle qui est annulée et le jour où
   on l'annule : « Examen du permis du mardi 22 septembre 2026
   annulé le jeudi 10 septembre 2026 ». David : « normalement
   Examen du permis du 22/09 annulé le 10/09 ».

   ⚠️ ÉCRITE ICI, ET NULLE PART AILLEURS. Les quatre portes qui
   sortent un élève d'une session passent toutes par
   « rendreALaListeRdvPermis » ; elles écrivent donc toutes la même
   phrase. Une seconde façon de l'écrire, et un des lecteurs
   cesserait de la comprendre sans que rien ne le dise.
   ============================================================ */
function phraseExamenAnnule(quand){
  const enToutesLettres = v => (typeof dateEnToutesLettres === 'function')
    ? (dateEnToutesLettres(v) || v) : v;
  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);

  return 'Examen du permis' +
    (quand ? ' du ' + enToutesLettres(quand) : '') +
    ' annulé le ' + enToutesLettres(auj) +
    ' — date à reprendre (bureau)';
}


/* ============================================================
   ÉCRIRE SUR UNE PLACE — ET LIRE LA RÉPONSE

   ⚠️ UN REFUS DU CLASSEUR N'EST PAS UNE RÉUSSITE.

   « majPlaceSession » peut refuser — « Place introuvable. » — et
   il le dit par « status: 'error' » dans une réponse par ailleurs
   normale. appelPrep, lui, ne lève que sur une panne HTTP : le
   refus passait donc sans bruit. TREIZE des seize appels de cet
   écran ne regardaient jamais le statut ; l'écran, déjà repeint,
   montrait le geste comme fait, et la place n'avait pas bougé.

   C'est exactement le défaut d'Axel Hinault, le 2 septembre —
   « Enregistré ✅ » sur une ligne que le classeur n'avait pas
   écrite — corrigé ce jour-là pour « majSuivi », et jamais pour
   celui-ci.

   ⚠️ ET LA CORRECTION EST UNE PORTE, PAS TREIZE RUSTINES. Écrire
   « if(r.status === 'error') » à treize endroits, c'est se donner
   douze occasions de l'oublier au quatorzième. Ici, une fois : les
   appelants ont déjà leur « catch » — celui qui remet l'écran
   comme avant et dit pourquoi — et il se met à servir tout seul.
   ============================================================ */
async function ecrireSurLaPlace(champs){
  const rep = await appelPrep(Object.assign({ action: 'sessionPlace' },
                                            champs || {}));
  if(rep && rep.status === 'error'){
    throw new Error(rep.message || 'Le classeur a refusé cette place.');
  }
  programmerRelectureSessions();
  return rep;
}

/* ============================================================
   🔄 L'ÉCRAN SE RELIT TOUT SEUL APRÈS UNE PLACE — v1173

   David, le 14 octobre : « quand je mets un élève sur une place
   libre dans les sessions examens, je dois recharger la page pour
   que ça apparaisse ». Plusieurs portes donnent une place — la
   fenêtre de la place, le 📅 du dossier ou de la liste RDV Permis,
   le glisser-déposer — et toutes ne redessinaient pas 🎓 Suivi
   permis : le dossier, ouvert PAR-DESSUS, se refermait sur l'écran
   d'avant.

   ⚠️ LA PORTE COMMUNE EST L'ÉCRITURE, ALORS C'EST ELLE QUI RELIT.
   Une seconde et demie après la dernière place écrite, si l'écran
   est affiché, on relit le classeur et on redessine — sans le
   « Lecture des sessions… » qui ferait clignoter la page. Une
   fenêtre est ouverte par-dessus (le dossier, une place) : on
   attend qu'elle se ferme. L'écran caché, lui, se relit déjà à la
   prochaine visite.
   ============================================================ */
let minuteurRelectureSessions = null;
function programmerRelectureSessions(delai){
  clearTimeout(minuteurRelectureSessions);
  minuteurRelectureSessions = setTimeout(relireSessionsAffichees, delai || 1500);
}
async function relireSessionsAffichees(){
  const zone = $('sessionsPermis');
  if(!zone || !zone.offsetParent) return;
  if(document.querySelector('.overlay.show')){ programmerRelectureSessions(1000); return; }
  try{ await chargerSessionsPermis(); }catch(e){ return; }
  if(document.querySelector('.overlay.show')){ programmerRelectureSessions(1000); return; }
  redessinerSessions();
}


async function placerEleveSurPlace(nom, place){
  if(!nom || !place) return false;

  /* DÉLOGER QUELQU'UN NE LE FAIT PAS DISPARAÎTRE.

     Fait AVANT de donner la place : si l'écriture échoue, la place
     n'a pas encore changé de main et on peut recommencer. */
  if(place.occupant &&
     normaliserMot(place.occupant) !== normaliserMot(nom)){
    await rendreALaListeRdvPermis(place.occupant, place.date || '');
  }

  await ecrireSurLaPlace({ idSession: place.idSession,
                           rang: place.rang, eleve: nom,
                           heure: place.heure || '',
                           par: ACCES.moniteur || '' });

  const jour = (typeof dateEnToutesLettres === 'function')
    ? (dateEnToutesLettres(place.date) || place.date) : place.date;

  await majSuivi(nom, { datePermis: jour, centre: place.centre || '',
                        aPlanifier: '', statut: '' });

  /* Le moniteur le lira dans la note de son prochain cours. */
  if(typeof envoyerConsigne === 'function'){
    try{
      await envoyerConsigne(nom, 'permis',
        'Examen du permis fixé au ' + jour + ' (bureau)');
    }catch(e){ /* la date est prise, le message se rattrapera */ }
  }

  sessionsPermis = [];      /* relu au prochain besoin */
  return true;
}


/* La fenêtre. Rend la place choisie, ou null.
   « voeu » : la semaine que l'élève a demandée — on la rappelle en
   haut, parce que c'est une demande à respecter, pas une
   préférence à oublier au moment de placer. */
async function choisirPlaceExamen(nom, voeu){
  try{ await chargerSessionsPermis(); }
  catch(e){
    await informer('Impossible de lire les sessions : ' + e.message);
    return null;
  }

  /* On ne se propose pas sa propre place. */
  const prenables = placesPrenablesExamen()
    .filter(p => normaliserMot(p.occupant || '') !== normaliserMot(nom));

  if(!prenables.length){
    await informer(
      "Aucune place d'examen prenable à venir.\n\n" +
      'Ni créneau libre, ni prête-nom, ni place à remplacer. Une date ' +
      'se prend sur une journée ouverte : ouvre-la dans 🎓 Suivi permis ' +
      '(➕ Nouvelle session), puis reviens placer ' +
      (nom || 'cet élève') + '.', "Pas de place prenable");
    return null;
  }

  const vides = prenables.filter(p => p.genre === 'vide').length;

  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(500px, 94vw);';

    boite.innerHTML = '<h3>🎓 Sa place d\'examen</h3>' +
      '<div style="font-size:13px;color:var(--muted);line-height:1.5;' +
      'margin-bottom:10px;">' + String(nom || '').replace(/</g, '&lt;') +
      ' — ' + prenables.length + ' place(s) prenable(s), dont ' + vides +
      ' vraiment libre(s).' +
      (voeu ? '<br><strong style="color:var(--accent-text);">🗓️ Il a demandé : ' +
              String(voeu).replace(/</g, '&lt;') + '</strong>' : '') +
      '</div>';

    const liste = document.createElement('div');
    liste.style.cssText = 'max-height:52vh;overflow-y:auto;';
    boite.appendChild(liste);

    const fermer = (v) => {
      if(fond.parentNode) fermerFond(fond);
      resolve(v || null);
    };

    let genrePose = '';
    prenables.forEach(p => {
      /* Un intertitre par sorte : on doit voir d'un coup d'œil qu'on
         est passé des créneaux vides à ceux qu'il faut reprendre à
         quelqu'un. */
      if(p.genre !== genrePose){
        genrePose = p.genre;
        const t = document.createElement('div');
        t.style.cssText = 'font-size:11px;letter-spacing:.08em;' +
          'text-transform:uppercase;color:var(--muted);margin:10px 0 6px;';
        t.textContent = p.genre === 'vide' ? 'Places libres'
          : (p.genre === 'pretenom'
              ? 'Tenues par un prête-nom — on peut les reprendre'
              : 'À remplacer — la personne a été prévenue');
        liste.appendChild(t);
      }

      const lib = libellePrenable(p);
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:100%;text-align:left;margin:0 0 7px;' +
        'padding:10px 12px;font-size:13.5px;line-height:1.45;' +
        (p.genre !== 'vide' ? 'border-color:' + lib.couleur + ';' : '');
      b.innerHTML = '<strong>' +
        ((typeof dateEnToutesLettres === 'function')
          ? dateEnToutesLettres(p.date) : p.date) +
        (p.heure ? ' — ' + p.heure : '') + '</strong>' +
        '<div style="font-size:12px;color:' + lib.couleur + ';">' +
        lib.emoji + ' ' + lib.quoi.replace(/</g, '&lt;') +
        (lib.detail ? ' · ' + lib.detail : '') + '</div>' +
        '<div style="font-size:11.5px;color:var(--muted);">' +
        (p.centre || 'centre non précisé') +
        ' · ' + p.libres + ' place(s) libre(s) sur ' + p.total +
        (p.moniteur ? ' · ' + p.moniteur.replace(/</g, '&lt;') : '') +
        '</div>';

      b.addEventListener('click', async () => {
        /* REPRENDRE LA PLACE DE QUELQU'UN SE CONFIRME, ET ON LE NOMME.
           Le faire sans lire son nom est exactement le geste qu'on
           regrette. */
        if(p.occupant){
          const quoi = (p.genre === 'pretenom')
            ? 'Reprendre la place de ' + p.occupant + ' ?\n\n' +
              "Il la tenait en prête-nom et n'a jamais été prévenu. " +
              'Il repart dans la liste RDV Permis, sans son étiquette 👻.'
            : 'Reprendre la place de ' + p.occupant + ' ?\n\n' +
              '⚠️ IL A ÉTÉ PRÉVENU et a conduit. Il repart dans la liste ' +
              'RDV Permis — pense à le rappeler pour lui dire.';
          if(!await confirmer(quoi)) return;
        }
        fermer(p);
      });
      liste.appendChild(b);
    });

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';
    const bAnn = document.createElement('button');
    bAnn.className = 'btn btn-secondary';
    bAnn.textContent = 'Annuler';
    bAnn.addEventListener('click', () => fermer(null));
    rangee.appendChild(bAnn);
    boite.appendChild(rangee);

    fond.appendChild(boite);
    document.body.appendChild(fond);
  });
}

async function afficherSessionsPermis(){
  const zone = $('sessionsPermis');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture des sessions…</div>';
  try{
    await chargerSessionsPermis();
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  dessinerSessions(zone);
  /* Un redessin refabrique les boutons : sans ça, la place retenue
     perdrait sa couleur et on ne saurait plus ce qu'on a choisi. */
  peindreEchange();
}


/* Le dessin seul, à partir de ce qu'on a en mémoire */
function dessinerSessions(zone){
zone.innerHTML = '';

  /* 🎨 LES TROIS BOUTONS SUR UNE LIGNE — v1137 (schéma validé par
     David). « Nouvelle session » reste le grand ; les deux autres,
     plus rares, se rangent à côté. Sur téléphone, ils passent
     dessous, côte à côte — jamais de défilement de côté. */
  const barre = document.createElement('div');
  barre.className = 'ses-barre';
  zone.appendChild(barre);

  /* 📅 v1546 — les « Resap » de Drivup à valider, au-dessus des sessions */
  if(typeof dessinerResapEC === 'function' && (typeof aDroit !== 'function' || aDroit('bureau_permis'))){
    const zr = document.createElement('div');
    zr.id = 'sesResap';
    zone.appendChild(zr);
    dessinerResapEC(zr);
    chargerResapEC().catch(() => {});
  }

  const b = document.createElement('button');
  b.className = 'btn btn-primary ses-b1';
  b.textContent = "➕ Nouvelle session d'examen";
  b.addEventListener('click', () => ouvrirEditeurSession(null));
  barre.appendChild(b);

  /* L'échange en cours, rappelé en haut pour qu'on n'oublie pas */
  if(echangeEnCours){
    const a = document.createElement('div');
    a.style.cssText = 'border:1px solid var(--orange);border-radius:10px;' +
      'padding:10px 12px;margin-bottom:12px;font-size:13px;line-height:1.5;' +
      'background:rgba(182,255,14,.08);';
    a.innerHTML = '🔄 <strong>' + echangeEnCours.eleve.replace(/</g, '&lt;') +
      '</strong> attend un échange.<br>' +
      '<span style="color:var(--muted);font-size:12px;">Appuie sur 🔄 d\'une ' +
      'autre place pour les permuter.</span>';

    const ann = document.createElement('button');
    ann.className = 'btn btn-secondary';
    ann.style.cssText = 'width:auto;padding:6px 11px;font-size:12px;margin-top:8px;';
    ann.textContent = "✕ Annuler l'échange";
    ann.addEventListener('click', () => { echangeEnCours = null; afficherSessionsPermis(); });
    a.appendChild(ann);
    zone.appendChild(a);
  }

  /* Reprendre les dates déjà saisies : une seule fois, au départ.
     Le bouton reste ensuite disponible si de nouvelles dates ont
     été posées ailleurs. */
  const bRep = document.createElement('button');
  bRep.className = 'btn btn-secondary ses-b2';
  bRep.textContent = '📥 Reprendre les dates';
  bRep.title = 'Crée les sessions à partir des dates du suivi';
  bRep.addEventListener('click', async () => {
    if(!await confirmer('Créer les sessions à partir des dates déjà ' +
        'enregistrées ?\n\nLes élèves y sont placés automatiquement. ' +
        'Aucune session existante n\'est écrasée.')) return;
    bRep.disabled = true;
    bRep.textContent = 'Reprise en cours…';
    try{
      const r = await reprendreDatesExistantes();
      showToast(r.creees + ' session(s) · ' + r.places + ' élève(s) placé(s) ✅');
      afficherSessionsPermis();
    }catch(e){
      showToast('Reprise impossible : ' + e.message);
      bRep.disabled = false;
      bRep.textContent = '📥 Reprendre les dates';
    }
  });
  barre.appendChild(bRep);

  /* ⚠️ RETROUVER QUI ÉTAIT SUR UNE PLACE VIDÉE.

     David, le 9 septembre 2026 : « ma collègue a fait un cliquer-
     glisser pour modifier les sessions de certaines personnes et
     tout a disparu ; ce qu'elle a décalé s'est transformé en place
     libre et on ne sait plus qui était sur ces places ».

     Le bouton RESTE une fois la crise passée : une place peut se
     vider pour d'autres raisons — un effacement de trop, une date
     retirée par erreur — et savoir qui y était se cherchera
     toujours de la même façon. */
  const bPer = document.createElement('button');
  bPer.className = 'btn btn-secondary ses-b2';
  bPer.textContent = '🔎 Places vidées';
  bPer.title = 'Qui était sur les places devenues libres, et par quelle preuve';
  bPer.addEventListener('click', () => ouvrirPlacesPerdues());
  barre.appendChild(bPer);

  /* 🗓️ v1234 — les créneaux libres lus dans Drivup (choix de David :
     en haut, et sous « 📆 Il doit planifier ») */
  if(typeof fenetreCreneauxLibres === 'function'){
    const bCr = document.createElement('button');
    bCr.className = 'btn btn-secondary ses-b2 crenHaut';
    bCr.textContent = '🗓️ Créneaux libres';
    bCr.title = 'Les cours ouverts sans élève, les « Résa » et les moniteurs sans cours, lus dans Drivup';
    bCr.addEventListener('click', () => fenetreCreneauxLibres(''));
    barre.appendChild(bCr);
  }

  if(!sessionsPermis.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucune session pour le moment.<br>' +
      '<span style="font-size:12px;">Crée une session, ou reprends les dates ' +
      'déjà enregistrées avec le bouton ci-dessus.</span>';
    zone.appendChild(v);
    return;
  }

  /* Ce qui demande une action, tous jours confondus : les listes
     que le bloc « Permis prévus » donnait avant. */
  /* TROIS LOTS, PLUS DEUX.

     Les prête-noms manquaient à ce bloc : il ne ramassait que les
     créneaux VIDES et les appelait « fantômes ». Les élèves placés
     en prête-nom — ceux dont la case 👻 est cochée — n'y
     figuraient nulle part, alors que ce sont eux qu'on cherche
     quand on demande « qui est sur RDV permis ? ». */
  const aRemplacer = [];
  const pretenoms = [];
  const libres = [];
  const jourAuj = todayLocal();
  sessionsPermis.filter(s => !s.date || s.date >= jourAuj).forEach(s => {
    s.eleves.forEach(p => {
      const su = (p.eleve && typeof suiviDe === 'function') ? suiviDe(p.eleve) : {};
      if(!p.eleve) libres.push({ s: s, p: p });
      else if(su.aRemplacer === 'oui') aRemplacer.push({ s: s, p: p, su: su });
      else if(su.fantome === 'oui') pretenoms.push({ s: s, p: p, su: su });
    });
  });

  const auj = todayLocal();

  /* Les sessions passées quittent la liste : elles l'encombraient
     alors que le travail est fait. Elles restent en base et se
     réaffichent à la demande. */
  const passees = sessionsPermis.filter(s => s.date && s.date < auj);
  const aVenir = sessionsPermis.filter(s => !s.date || s.date >= auj);

  const total = aVenir.reduce((n, s) => n + s.eleves.filter(x => x.eleve).length, 0);
  /* « fantôme » disait deux choses ; ce compteur comptait des cases
     vides et les appelait des fantômes. Les deux se comptent
     maintenant à part. */
  const vides = aVenir.reduce((n, s) => n + s.eleves.filter(x => !x.eleve).length, 0);
  const tenues = aVenir.reduce((n, s) => n + s.eleves.filter(x =>
    x.eleve && typeof suiviDe === 'function' &&
    suiviDe(x.eleve).fantome === 'oui').length, 0);
  /* En étiquettes — v1137 */
  const pluriel = (n, un, plusieurs) => n + ' ' + (n > 1 ? plusieurs : un);
  const compte = document.createElement('div');
  compte.className = 'plc-puces';
  compte.innerHTML = [
    '📅 <strong>' + aVenir.length + '</strong> ' + (aVenir.length > 1 ? 'sessions à venir' : 'session à venir'),
    '🧑‍🎓 <strong>' + total + '</strong> ' + (total > 1 ? 'élèves' : 'élève'),
    vides ? '⬜ <strong>' + vides + '</strong> ' + (vides > 1 ? 'places libres' : 'place libre') : '',
    tenues ? '👻 <strong>' + tenues + '</strong> ' + (tenues > 1 ? 'prête-noms' : 'prête-nom') : ''
  ].filter(Boolean).map(x => '<span class="plc-puce">' + x + '</span>').join('');
  zone.appendChild(compte);

  /* « ⚠️ À traiter » sous les étiquettes — l'ordre du schéma */
  if(aRemplacer.length || pretenoms.length || libres.length){
    zone.appendChild(blocAIntervenir(aRemplacer, pretenoms, libres));
  }

  /* Deux sessions le même jour : on les numérote, sinon rien ne les
     distingue dans la liste et on ne sait pas laquelle on ouvre. */
  const parJour = {};
  sessionsPermis.forEach(s => {
    parJour[s.date] = (parJour[s.date] || 0) + 1;
  });
  const vus = {};
  sessionsPermis.forEach(s => {
    if(parJour[s.date] > 1){
      vus[s.date] = (vus[s.date] || 0) + 1;
      s._rangJour = vus[s.date];
      s._totalJour = parJour[s.date];
    }else{
      s._rangJour = 0;
    }
  });

  /* 🎨 RANGÉES PAR SEMAINE, EN CARTES — v1137.

     Les mêmes semaines que les cases « Jours ouverts » juste
     au-dessus : on lit d'un bloc ce que la préfecture a ouvert et
     ce qu'on y a mis. Une session sans date se range à part, à la
     fin. */
  const semaines = [];
  aVenir.forEach(s => {
    const w = semaineDeLaSession(s.date);
    let g = semaines.find(x => x.cle === w.cle);
    if(!g){ g = Object.assign({ sessions: [] }, w); semaines.push(g); }
    g.sessions.push(s);
  });
  semaines.sort((x, y) => (x.cle === '' ? 1 : 0) - (y.cle === '' ? 1 : 0) || x.cle.localeCompare(y.cle));
  semaines.forEach(g => {
    const z = document.createElement('div');
    z.className = 'ses-sem';
    const n = g.sessions.reduce((k, s) => k + s.eleves.filter(x => x.eleve).length, 0);
    z.innerHTML = '<div class="ses-semt">' + g.titre +
      '<span class="plc-doux"> · ' + pluriel(g.sessions.length, 'session', 'sessions') +
      ' · ' + pluriel(n, 'élève', 'élèves') + '</span></div>';
    const grille = document.createElement('div');
    grille.className = 'ses-grille';
    g.sessions.forEach(s => grille.appendChild(blocSession(s, auj)));
    z.appendChild(grille);
    zone.appendChild(z);
  });

  /* Les passées, repliées en bas : on y revient pour saisir un
     résultat ou vérifier ce qui s'est dit. */
  if(passees.length){
    const d = document.createElement('details');
    d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
      'padding:10px 12px;margin-top:16px;';
    d.innerHTML = '<summary style="cursor:pointer;font-size:13px;' +
      'color:var(--muted);">🗂️ ' + passees.length +
      ' session(s) passée(s)</summary>';

    const z = document.createElement('div');
    z.className = 'ses-grille';
    z.style.marginTop = '10px';
    /* Les plus récentes d'abord : c'est là qu'on revient */
    passees.slice().reverse()
      .forEach(s => z.appendChild(blocSession(s, auj)));
    d.appendChild(z);
    zone.appendChild(d);
  }
}


/* La semaine d'une session : « S42 12–16 oct », du lundi au vendredi.
   Sans date, une clé vide — rangée à la fin. */
function semaineDeLaSession(iso){
  if(!iso) return { cle: '', titre: '<strong>Date à définir</strong>' };
  const d = new Date(iso + 'T12:00:00');
  if(isNaN(d)) return { cle: '', titre: '<strong>Date à définir</strong>' };
  const lundi = new Date(d);
  lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const vendredi = new Date(lundi);
  vendredi.setDate(lundi.getDate() + 4);
  const p2 = n => String(n).padStart(2, '0');
  const cle = lundi.getFullYear() + '-' + p2(lundi.getMonth() + 1) + '-' + p2(lundi.getDate());
  const mois = x => x.toLocaleDateString('fr-FR', { month:'short' }).replace('.', '');
  const dates = lundi.getMonth() === vendredi.getMonth()
    ? lundi.getDate() + '–' + vendredi.getDate() + ' ' + mois(vendredi)
    : lundi.getDate() + ' ' + mois(lundi) + ' – ' + vendredi.getDate() + ' ' + mois(vendredi);
  const n = (typeof numeroSemaine === 'function') ? numeroSemaine(iso) : 0;
  return { cle: cle, titre: (n ? '<strong>S' + n + '</strong> ' : '') + dates };
}


/* Les places à donner et les places libres, réunies en tête :
   c'est ce qu'on cherche en premier le matin. */
function blocAIntervenir(aRemplacer, pretenoms, libres){
  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:10px 12px;margin-bottom:14px;';

  const bouts = [];
  if(aRemplacer.length) bouts.push(aRemplacer.length + ' à remplacer');
  if(pretenoms.length) bouts.push(pretenoms.length + ' prête-nom(s)');
  if(libres.length) bouts.push(libres.length + ' place(s) libre(s)');

  d.innerHTML = '<summary style="cursor:pointer;font-size:14px;font-weight:700;' +
    'color:var(--accent-text);">⚠️ À traiter — ' + bouts.join(' · ') +
    '</summary>';

  const ajouter = (titre, lot, couleur) => {
    if(!lot.length) return;
    const t = document.createElement('div');
    t.style.cssText = 'font-size:12px;font-weight:700;color:' + couleur +
      ';margin:10px 0 4px;';
    t.textContent = titre;
    d.appendChild(t);

    lot.forEach(x => {
      const l = document.createElement('div');
      l.style.cssText = 'display:flex;gap:8px;align-items:center;padding:6px 0;' +
        'font-size:13px;cursor:pointer;';
      l.innerHTML = '<span style="flex:1;min-width:0;">' +
        (x.p.eleve ? '<strong>' + x.p.eleve.replace(/</g, '&lt;') + '</strong>' +
                     etiquetteBoite(boiteDe(x.p.eleve)) :
                     '<em style="color:var(--muted);">place libre</em>') +
        '<span style="color:var(--muted);"> — ' +
        (x.s.date ? libelleDate(x.s.date) : 'date à définir') +
        (x.p.heure ? ' à ' + x.p.heure : '') + '</span></span>';
      l.addEventListener('click', () => ouvrirPlace(x.p, x.s));
      d.appendChild(l);
    });
  };

  ajouter('🔄 À remplacer — prévenus, à rappeler', aRemplacer, 'var(--red)');
  ajouter('👻 Prête-noms — jamais prévenus', pretenoms, '#E8A33D');
  ajouter('⬜ Places libres — personne dessus', libres, 'var(--muted)');

  return d;
}


/* Une session : son en-tête et ses places.

   🎨 EN CARTE — v1137 (schéma validé par David). Fermée, la carte
   montre déjà qui passe, à quelle heure et où il en est : l'état
   (✅ 🟠 🔴 🔄 👻 ⬜), le nom dans sa couleur, la boîte. Un appui
   l'ouvre en pleine largeur, avec exactement les lignes d'avant —
   📣, 🔄, la poignée, ➕ Une place, ✏️, 🗑️ : rien ne change dedans. */
function blocSession(sess, auj){
  const passe = sess.date && sess.date < auj;
  const cejour = sess.date === auj;
  const ech = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

  /* Les états une seule fois : le compte et la carte fermée les lisent */
  const etats = sess.eleves.map(x => etatPlace(x, eleveDuBureau(x.eleve)));
  const prets = etats.filter(e => e.cle === 'ok').length;

  /* Combien de chaque boîte : c'est ce qui décide du véhicule à
     sortir, et une session mixte se repère tout de suite. */
  let nBea = 0, nBv = 0;
  sess.eleves.forEach(x => {
    if(!x.eleve) return;
    const b = boiteDe(x.eleve);
    if(b === 'bea') nBea++;
    else if(b === 'bv') nBv++;
  });
  const detailBoite = [nBea ? nBea + ' BEA' : '', nBv ? nBv + ' BV' : '']
    .filter(Boolean).join(' · ');

  const bloc = document.createElement('div');
  /* 🟪 v1162 — hors Saint-Brieuc, un cadre violet très clair (David :
     « pour montrer la différence »). */
  bloc.className = 'ses-carte' + (cejour ? ' ses-auj' : '') +
                   (horsSaintBrieuc(sess.centre) ? ' ses-ailleurs' : '') +
                   (sess.__enCours ? ' ses-encours' : '');

  const tete = document.createElement('div');
  tete.className = 'ses-tete';

  /* « Mar. 13 oct. » : la semaine est déjà écrite au-dessus */
  let jour = 'Date à définir';
  if(sess.date){
    const t = new Date(sess.date + 'T12:00:00')
      .toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' });
    jour = t.charAt(0).toUpperCase() + t.slice(1);
  }

  const g = document.createElement('div');
  g.className = 'ses-g';
  g.innerHTML =
    '<div class="ses-jour" style="color:' +
      (cejour ? 'var(--accent-text)' : passe ? 'var(--muted)' : 'var(--cream)') + ';">' +
      '<span>' + jour + (sess.heureDebut ? ' <span class="ses-h">· ' + ech(sess.heureDebut) + '</span>' : '') + '</span>' +
      (sess._rangJour ? ' <span class="ses-rang">session ' + sess._rangJour + '/' + sess._totalJour + '</span>' : '') +
      (passe ? ' <span class="ses-rang" style="color:var(--muted);">passée</span>' : '') +
      (sess.__enCours ? ' <span class="ses-rang ses-attente">⏳ enregistrement…</span>' : '') +
    '</div>' +
    '<div class="ses-sous">' +
      '<span>🏁 ' + (sess.centre ? ech(sess.centre) : 'centre à définir') + '</span>' +
      (sess.moniteur ? ' <span>· 👤 ' + ech(sess.moniteur) + '</span>' : '') +
      (detailBoite ? ' <span>· 🚗 ' + detailBoite + '</span>' : '') +
    '</div>';
  tete.appendChild(g);

  /* Le compte qui dit tout : combien de prêts sur combien de places */
  const n = document.createElement('div');
  const complet = (prets === sess.eleves.length && sess.eleves.length > 0);
  n.className = 'ses-compte' + (complet ? ' ses-complet' : '');
  n.textContent = prets + '/' + sess.eleves.length;
  n.title = prets + ' prêt(s) sur ' + sess.eleves.length + ' place(s)';
  tete.appendChild(n);

  /* Le groupe : bulle grise tant qu'il n'est pas créé, bulle VERTE une
     fois fait. Un appui bascule, sans ouvrir la session.

     ⚠️ v1191 — David, le 16 octobre : « mets la bulle en vert quand
     on clique dessus pour dire que le groupe Messenger est fait, et
     qu'elle passe en vert toute seule si le groupe de messagerie est
     fait ». Le groupe de la messagerie la verdit aussi : voir
     cocherLesGroupesFaits.

     ⚠️ v1192 — LA BULLE ELLE-MÊME, PAS UN ROND DERRIÈRE. La v1191
     posait l'émoji 💬 sur un rond vert ; David, capture à l'appui :
     « c'est moche, tu peux pas mettre la bulle en elle-même en
     vert ». Un émoji ne se recolore pas : la bulle est donc dessinée,
     même silhouette, remplie de gris ou de vert. */
  const fait = !!sess.groupeFait;
  const bMess = document.createElement('button');
  bMess.className = 'btn btn-secondary bulleGroupe' + (fait ? ' fait' : '');
  bMess.style.cssText = 'width:30px;height:30px;padding:0;margin:0;' +
    'flex-shrink:0;border:none;background:none;display:inline-flex;' +
    'align-items:center;justify-content:center;';
  bMess.innerHTML = '<svg width="22" height="20" viewBox="0 0 22 20" aria-hidden="true" style="display:block;">' +
    '<path d="M5 1.2h12a4 4 0 0 1 4 4v6.2a4 4 0 0 1-4 4H9.6l-4.4 3.4c-.5.4-1.2 0-1.2-.6v-2.9A4 4 0 0 1 1 11.4V5.2a4 4 0 0 1 4-4z" ' +
    'fill="' + (fait ? 'var(--green)' : 'var(--muted)') + '" ' +
    'stroke="' + (fait ? 'var(--accent-text)' : 'none') + '" stroke-width="1.2" stroke-linejoin="round"' +
    (fait ? '' : ' opacity=".55"') + '/></svg>';
  bMess.title = fait
    ? 'Groupe fait (Messenger ou messagerie) — appuie pour annuler'
    : 'Groupe pas encore fait — appuie quand il l’est';
  bMess.setAttribute('aria-pressed', fait ? 'true' : 'false');
  bMess.addEventListener('click', async ev => {
    ev.stopPropagation();

    /* L'écran répond tout de suite, l'enregistrement suit */
    sess.groupeFait = !sess.groupeFait;
    redessinerSessions();
    showToast(sess.groupeFait ? 'Groupe Messenger fait ✅'
                              : 'Groupe Messenger à refaire');
    try{
      await appelPrep({ action: 'sessionGroupe', id: sess.id,
                        groupeFait: sess.groupeFait ? 'oui' : '' });
    }catch(e){
      sess.groupeFait = !sess.groupeFait;
      redessinerSessions();
      showToast('Impossible : ' + e.message);
    }
  });
  tete.appendChild(bMess);

  /* ✉️ v1244 — A : les convocations de toute la session (ec-courriers.js) */
  if(typeof boutonConvocationsDeSession === 'function' && boutonConvocationsDeSession() &&
     !passe && sess.eleves.some(x => x.eleve)){
    const bC = document.createElement('button');
    bC.type = 'button';
    bC.className = 'sesConvoc';
    bC.textContent = '✉️';
    bC.title = 'Convocations de la session (courriers)';
    bC.setAttribute('aria-label', 'Convocations de la session');
    bC.addEventListener('click', ev => { ev.stopPropagation(); crConvocationsDeSession(sess); });
    tete.appendChild(bC);
  }

  const fl = document.createElement('div');
  fl.style.cssText = 'flex-shrink:0;font-size:12px;color:var(--muted);transition:transform .2s;';
  fl.textContent = '▼';
  tete.appendChild(fl);

  bloc.appendChild(tete);

  /* Fermée : la liste courte de ceux qui passent */
  const apercu = document.createElement('div');
  apercu.className = 'ses-places';
  apercu.innerHTML = sess.eleves.map((x, i) => {
    const e = etats[i];
    const h = '<span class="ses-ph">' + ech(x.heure || '—') + '</span>';
    if(!x.eleve){
      return '<div class="ses-pl ses-vide">' + h + '<span class="ses-pe">⬜</span>' +
        '<span class="ses-pn">Place libre</span></div>';
    }
    return '<div class="ses-pl" title="' + ech(e.texte) + '">' + h +
      '<span class="ses-pe">' + e.emoji + '</span>' +
      '<span class="ses-pn" style="color:' + e.couleur + ';">' + ech(x.eleve) + '</span>' +
      /* 💶 📆 v1193 — replié : au bout du prénom. À côté du nom et pas
         dedans : un nom long est coupé par « … », les marques jamais. */
      iconesDeLaPreparation(x.eleve) +
      etiquetteBoite(boiteDe(x.eleve)) + '</div>';
  }).join('');
  bloc.appendChild(apercu);

  const detail = document.createElement('div');
  detail.className = 'ses-detail';
  detail.style.display = 'none';
  bloc.appendChild(detail);

  const ouvrir = oui => {
    detail.style.display = oui ? 'block' : 'none';
    apercu.style.display = oui ? 'none' : '';
    bloc.classList.toggle('ses-ouverte', oui);
    fl.style.transform = oui ? 'rotate(180deg)' : 'none';
    sessionsOuvertes[sess.id] = oui;
    if(oui) remplirPlaces(detail, sess);
  };

  tete.addEventListener('click', () => ouvrir(detail.style.display === 'none'));
  apercu.addEventListener('click', () => ouvrir(true));
  if(sessionsOuvertes[sess.id]) ouvrir(true);

  return bloc;
}


/* L'écart entre deux passages, lu sur les places existantes */
function dureeSession(sess){
  const h = (sess.eleves || []).map(p => p.heure).filter(Boolean);
  if(h.length < 2) return 30;

  const m = t => {
    const x = String(t).match(/^(\d{1,2})[:h](\d{2})/);
    return x ? (+x[1] * 60 + +x[2]) : null;
  };
  const a = m(h[0]), b = m(h[1]);
  if(a === null || b === null || b <= a) return 30;
  return b - a;
}


function remplirPlaces(zone, sess){
  zone.innerHTML = '';
  sess.eleves.forEach(p => zone.appendChild(lignePlace(p, sess)));
  /* 📅 v1547 — ses leçons posées sur Drivup : lues pour ceux dont tout
     n'est pas planifié, puis la liste se redessine (une fois) */
  if(typeof chargerPlanningPermisEC === 'function' && sess.date && sess.date >= aujParisEC()){
    const noms = sess.eleves.map(p => p.eleve).filter(n => n && !marquesDeLaPreparation(n).planifie);
    const sig = () => JSON.stringify(noms.map(n => { const c = aVenirPermisEC(n); return c ? c.cours : 0; }));
    const avant = sig();
    if(noms.length) chargerPlanningPermisEC(noms).then(() => {
      noms.forEach(n => autoPlanifiePermisEC(n, sess.date));
      if(sig() !== avant && zone.isConnected) remplirPlaces(zone, sess);
    }).catch(() => {});
  }

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;' +
    'border-top:1px solid var(--line);';

  const bPlus = document.createElement('button');
  bPlus.className = 'btn btn-secondary';
  bPlus.style.cssText = 'width:auto;padding:7px 11px;font-size:12px;margin:0;';
  bPlus.textContent = '➕ Une place';
  bPlus.addEventListener('click', async () => {
    bPlus.disabled = true;
    try{
      /* La durée déduite des places existantes : la nouvelle prend
         l'heure qui suit, sans qu'on ait à la saisir. */
      await appelPrep({ action: 'sessionSet', id: sess.id, date: sess.date,
                        centre: sess.centre, heureDebut: sess.heureDebut,
                        places: sess.eleves.length + 1, duree: dureeSession(sess),
                        moniteur: sess.moniteur,
                        boite: sess.boite, inspecteur: sess.inspecteur,
                        par: ACCES.moniteur || '' });
      afficherSessionsPermis();
    }catch(e){ showToast('Impossible : ' + e.message); bPlus.disabled = false; }
  });
  r.appendChild(bPlus);

  const bMod = document.createElement('button');
  bMod.className = 'btn btn-secondary';
  bMod.style.cssText = 'width:auto;padding:7px 11px;font-size:12px;margin:0;';
  bMod.textContent = '✏️ La session';
  bMod.addEventListener('click', () => ouvrirEditeurSession(sess));
  if(sess.__enCours) bMod.disabled = true;
  r.appendChild(bMod);

  const bSup = document.createElement('button');
  bSup.className = 'btn btn-secondary';
  bSup.style.cssText = 'width:auto;padding:7px 11px;font-size:12px;margin:0;' +
    'color:var(--red);border-color:var(--red);';
  bSup.textContent = '🗑️ Supprimer';
  bSup.addEventListener('click', async () => {
    /* LA TROISIÈME PORTE — voir rendreALaListeRdvPermis().

       Ces élèves-là perdent leur date en même temps que la session,
       et la fenêtre le DIT : supprimer une session, c'est décider
       pour tous ceux qui y étaient. */
    const dedans = sess.eleves.filter(x => x.eleve).map(x => x.eleve);
    if(!await confirmer('Supprimer cette session ?' +
        (dedans.length
          ? '\n\n' + dedans.length + ' élève(s) y sont inscrits : ' +
            dedans.join(', ') + '.\n\nLeur date d\'examen est effacée et ' +
            'ils repartent dans la liste RDV Permis.'
          : ''))) return;
    /* 🗑️ v1452 — David : « il faut aussi que je puisse supprimer des
       bilans post-permis quand j'annule des sessions passées » (ses tests
       restaient dans ⏳ Attente bilan : la date s'effaçait, pas
       l'ajournement). Ceux qui ont été notés ajournés SUR CETTE SESSION :
       on demande, et « oui » efface tout leur post-permis
       (effacerLePostPermis, ec-postpermis.js). Admin seulement. */
    const ajournes = (typeof effacerLePostPermis === 'function' && typeof ACCES !== 'undefined' &&
                      ACCES.role === 'admin' && sess.date)
      ? dedans.filter(n => {
          const s = (typeof suiviDe === 'function' ? suiviDe(n) : null) || {};
          return s.resultat === 'ajourne' && jourIsoPP(s.dateAjournement) === String(sess.date).slice(0, 10);
        })
      : [];
    let effacerPP = false;
    if(ajournes.length){
      const q = await fenetre(
        (ajournes.length > 1 ? ajournes.join(', ') + ' ont été notés ajournés' : ajournes[0] + ' a été noté ajourné') +
        ' sur cette session.\n\nEffacer aussi leur post-permis ? Leur ajournement, les bilans, les captures de cet examen, ' +
        'les messages post-permis de leur messagerie et leur RDV post-permis. Leur fiche reste.',
        [{ nom: 'Annuler', valeur: '' },
         { nom: 'Non, les garder', valeur: 'non' },
         { nom: '🗑️ Oui, tout effacer', valeur: 'oui', principal: true }],
        'Leur post-permis');
      if(!q) return;
      effacerPP = q === 'oui';
    }
    try{
      /* Les fiches AVANT la suppression : si une écriture échoue, la
         session existe encore et personne n'est perdu — on
         recommence. Dans l'autre sens, une suppression réussie
         suivie d'une écriture ratée laissait un élève avec une date
         d'examen et aucune session, invisible partout. */
      if(effacerPP) for(const nom of ajournes) await effacerLePostPermis(nom);
      for(const nom of dedans) await rendreALaListeRdvPermis(nom, sess.date || '');

      await appelPrep({ action: 'sessionDelete', id: sess.id });
      showToast(dedans.length
        ? 'Session supprimée — ' + dedans.length +
          ' élève(s) renvoyé(s) dans RDV Permis ✅'
        : 'Session supprimée ✅');
      afficherSessionsPermis();
    }catch(e){ showToast('Impossible : ' + e.message); }
  });
  r.appendChild(bSup);

  zone.appendChild(r);
}


/* Une place : l'élève, son heure, son état, ses boutons */
/* L'état d'un élève, tel que le bureau le connaît */
function etatDe(nom){
  try{
    if(typeof etatBureau === 'undefined' || !etatBureau.eleves) return {};
    const e = etatBureau.eleves.find(x =>
      normaliserMot(x.eleve) === normaliserMot(nom));
    return (e && e.etat) || {};
  }catch(err){ return {}; }
}


/* Retirer un élève d'une session.

   Sa date d'examen s'efface partout : le suivi, et les consignes
   qui l'annonçaient. Sans cela, il continuait d'apparaître comme
   ayant une place. */
async function retirerDeLaSession(nom, sess){
  if(!nom) return;
  /* Tout se fait dans « rendreALaListeRdvPermis » : les consignes
     soldées, les champs de la fiche, et l'annonce qui défait la
     précédente. Cette porte-ci en avait sa propre version, complète
     — et c'était justement le problème : les trois autres n'en
     avaient qu'une moitié, sans que rien ne le dise. */
  try{
    await rendreALaListeRdvPermis(nom, (sess && sess.date) || '');
  }catch(e){ /* la place est libérée, c'est déjà cela */ }
}


/* ============================================================
   LES HEURES AVANT PERMIS, EN CASES

   La valeur affichée suit la source la plus récente : le
   post-permis pour un repassage, l'examen blanc sinon. Un appui
   écrit dans cette même source, pour que le choix se voie.
   ============================================================ */

function casesHeuresPermis(nom){
  const d = document.createElement('div');

  const r = (typeof heuresQuiComptent === 'function')
    ? heuresQuiComptent(nom) : { valeur: '', source: '' };

  const manque = (r.valeur === '');

  d.style.cssText = 'border:1px solid ' +
    (manque ? 'var(--orange)' : 'var(--line)') + ';' +
    'border-radius:10px;padding:10px 12px;margin-bottom:12px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:12px;margin-bottom:8px;color:' +
    (manque ? 'var(--warn-text)' : 'var(--muted)') + ';';
  t.textContent = manque
    ? "⏱️ Heures avant permis — à préciser"
    : '⏱️ Heures avant permis' +
      (r.source ? ' (' + r.source + ')' : '');
  d.appendChild(t);

  const ligne = document.createElement('div');
  ligne.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;';

  const champ = document.createElement('input');
  champ.type = 'number';
  champ.min = '0';
  champ.step = '1';
  champ.placeholder = 'autre';
  champ.value = (['0','2','4','6','8','10'].indexOf(r.valeur) === -1)
    ? r.valeur : '';
  champ.style.cssText = 'width:78px;font-size:16px;text-align:center;margin:0;';

  let choisi = r.valeur;

  const peindre = () => {
    Array.prototype.forEach.call(ligne.children, b => {
      if(b.tagName !== 'BUTTON') return;
      const pris = (b.getAttribute('data-val') === choisi);
      b.style.background = pris ? 'var(--orange)' : 'var(--navy)';
      b.style.borderColor = pris ? 'var(--orange)' : 'var(--line)';
      b.style.color = pris ? '#0B0B0B' : 'var(--cream)';
      b.style.fontWeight = pris ? '800' : '400';
    });
  };

  const poser = async (v) => {
    choisi = v;
    peindre();

    const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};

    /* ⚠️ PAR LA PORTE — v908 : elle note qui l'a dit et quand,
       sans quoi l'alerte ⏱️ nommerait le moniteur du dernier bilan
       à la place de celui qui vient de saisir.
       ⚠️ ET AVEC LE REPÈRE DU JOUR — v972 : dites ici, elles datent
       d'ici, pas de la charnière. */
    const avecRepere = (typeof champsHeuresDitesMaintenant === 'function')
      ? champsHeuresDitesMaintenant(nom, v)
      : { heuresRestantes: v };

    /* ⚠️ ET LE REPASSAGE PASSE PAR LA MÊME PORTE — v1014.

       Un élève en repassage a ses heures dans le post-permis :
       elles s'écrivaient là, et SEULEMENT là. Or ce champ-là ne
       porte aucun repère — le nombre restait donc affiché plein
       jusqu'au repassage, quelles que soient les leçons faites
       depuis. Maintenant que le compteur sait lire la réserve du
       post-permis, il lui faut son repère comme aux autres :
       « heuresRepassage » dit ce que le rendez-vous a DÉCIDÉ,
       « heuresRestantes » ce qu'il en reste. */
    const majs = (s.rdvPostFait === 'oui')
      ? Object.assign({}, avecRepere, { heuresRepassage: v })
      : avecRepere;

    try{
      await majSuivi(nom, majs);
      t.textContent = '⏱️ Heures avant permis' +
        (v === '0' ? suiteReserveSoldee()
                   : v ? ' — ' + v + ' + 3h' : '');
      t.style.color = 'var(--muted)';
      d.style.borderColor = 'var(--line)';
      redessinerSessions();
    }catch(e){ showToast('Impossible : ' + e.message); }
  };

  ['0', '2', '4', '6', '8', '10'].forEach(v => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;padding:9px 13px;font-size:14px;margin:0;';
    b.textContent = v;
    b.setAttribute('data-val', v);
    /* Le mot du zéro vient de sa porte — v1053. */
    b.title = (v === '0') ? motDuZeroEnTete() : v + ' + 3h';
    b.addEventListener('click', () => {
      champ.value = '';
      poser(v);
    });
    ligne.appendChild(b);
  });

  champ.addEventListener('change', () => {
    const v = String(champ.value).trim();
    if(v && isNaN(Number(v))){ showToast('Indique un nombre.'); return; }
    poser(v);
  });
  ligne.appendChild(champ);

  d.appendChild(ligne);

  const a = document.createElement('div');
  a.style.cssText = 'font-size:11px;color:var(--muted);margin-top:6px;' +
    'line-height:1.5;';
  a.textContent = 'Les 3h avant examen viennent en plus : « 4 » signifie 4 + 3.';
  d.appendChild(a);

  peindre();
  return d;
}


/* ============================================================
   💶 📆 CE QUI RESTE À PAYER ET À PLANIFIER — v1193

   David, le 16 octobre : « ajoute une case Tout est payé : tant
   qu'elle n'est pas cochée, mets un petit billet au bout du prénom
   quand c'est replié, et quand c'est déplié écris en dessous Il doit
   de l'argent. Il doit planifier encore des choses : même principe,
   avec un calendrier ».

   Une case PAS cochée vaut « pas encore » : c'est le bureau qui
   l'affirme en la cochant, jamais l'outil qui le devine.
   ============================================================ */
function marquesDeLaPreparation(nom){
  if(!nom) return { paye: true, planifie: true };
  const su = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  return { paye: su.toutPaye === 'oui', planifie: su.toutPlanifie === 'oui', su: su };
}
function iconesDeLaPreparation(nom){
  const m = marquesDeLaPreparation(nom);
  /* 📅 v1544 — pas planifié : 📆 réservations à faire, le calendrier
     orange quand elles sont faites, 🙋 quand il les pose lui-même */
  const r = m.planifie ? '' : etatResaPermis(m.su);
  const t = (m.paye ? '' : '<span title="Il doit de l’argent">💶</span>') +
            (r === 'faite' ? '<span title="Réservations faites" style="display:inline-flex;">' + calendrierOrangeSvg(15) + '</span>'
             : r === 'eleve' ? '<span title="Il pose lui-même ses heures">🙋</span>'
             : r ? '<span title="Il doit planifier encore des choses">📆</span>' : '');
  return t ? '<span class="ses-marques" style="font-size:13px;margin-left:-2px;">' + t + '</span>' : '';
}
function lignesDeLaPreparation(nom, examIso){
  const m = marquesDeLaPreparation(nom);
  let h = '';
  if(!m.paye){
    const reste = String((m.su && m.su.resteAPayer) || '').trim();
    const montant = reste && parseFloat(reste.replace(',', '.')) > 0
      ? ' (reste ' + reste.replace(/</g, '&lt;') + ' €)' : '';
    h += '<div class="ses-doit" style="font-size:12px;font-weight:700;color:var(--warn-text);margin-top:2px;">' +
         '💶 Il doit de l’argent' + montant +
         /* ✉️ v1244 — C : la relance de paiement, à son nom, le reste pré-rempli */
         ((typeof boutonRelancePourLeSuivi === 'function') ? boutonRelancePourLeSuivi(nom, reste) : '') + '</div>';
  }
  if(!m.planifie){
    /* 📅 v1544 — faites ou posées par lui : l'étiquette orange ou bleue
       remplace la ligne rouge ; à faire : la ligne rouge et l'étiquette */
    const r = etatResaPermis(m.su);
    /* 📅 v1547 — Drivup lu et ses heures connues : « À réserver : … »
       remplace « Il doit planifier encore des choses » */
    const b = (typeof bilanPlanningPermis === 'function') ? bilanPlanningPermis(nom, examIso) : null;
    const parDrivup = !!(b && !b.erreur && b.connu && !b.jourJ);
    const dr = b ? lignesPlanningPermisHtml(nom, examIso, m.su) : { posees: '', reste: '' };
    if(!parDrivup && (r === 'afaire' || !r)){
      h += '<div class="ses-doit" style="font-size:12px;font-weight:700;color:var(--warn-text);margin-top:2px;">' +
           '📆 Il doit planifier encore des choses' +
           /* 🗓️ v1234 — la fenêtre des créneaux, à son nom */
           ((typeof boutonCreneauxPourLeSuivi === 'function') ? boutonCreneauxPourLeSuivi(nom) : '') + '</div>';
    }
    h += dr.posees + etiquetteResaPermis(m.su, b && !b.erreur ? b : null) + dr.reste;
  }
  return h;
}

function lignePlace(p, sess){
  const etat = etatPlace(p, eleveDuBureau(p.eleve));
  const vide = !p.eleve;

  const l = document.createElement('div');
  l.style.cssText = 'display:flex;gap:8px;align-items:center;padding:9px 14px;' +
    'border-bottom:1px solid rgba(255,255,255,.04);' +
    (vide ? 'background:rgba(255,255,255,.02);' : '');

  const h = document.createElement('div');
  h.style.cssText = 'width:52px;flex-shrink:0;font-size:13px;color:var(--muted);';
  h.textContent = p.heure || '—';
  l.appendChild(h);

  const nom = document.createElement('div');
  nom.style.cssText = 'flex:1;min-width:0;font-size:14px;line-height:1.4;cursor:pointer;';
  /* Sa fiche est-elle renseignée ? Un élève repris d'une ancienne
     date peut n'avoir aucune préparation : autant le dire. */
  const su = (typeof suiviDe === 'function' && p.eleve) ? suiviDe(p.eleve) : {};
  const ficheVide = !vide && !su.resteAPayer && !su.reservations && !su.resaEtat &&
                    !su.relanceLe && !su.lecons2h && su.toutOk !== 'oui' &&
                    su.aRemplacer !== 'oui' && su.fairePoint !== 'oui' &&
                    su.toutPaye !== 'oui' && su.toutPlanifie !== 'oui';

  nom.innerHTML = vide
    ? '<span style="color:var(--muted);font-style:italic;">⬜ Place libre — ' +
      'appuie pour y mettre un élève</span>'
    : '<strong style="color:' + etat.couleur + ';">' +
      p.eleve.replace(/</g, '&lt;') + '</strong>' +
      etiquetteBoite(boiteDe(p.eleve)) +
      (ficheVide ? ' <span style="font-size:11px;color:var(--warn-text);">' +
        '📝 fiche à remplir</span>' : '') +
      '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      etat.emoji + ' ' + etat.texte + '</div>' +
      /* 💶 📆 v1193 — déplié : écrit en toutes lettres */
      lignesDeLaPreparation(p.eleve, sess && sess.date) +
      /* Ce que le bureau a noté : les leçons posées et le reste à
         faire. C'est ce qu'on veut voir sans ouvrir la fiche. */
      /* 📅 v1544 — les réservations ne sont plus une petite ligne verte :
         l'étiquette de lignesDeLaPreparation les dit (et se tait quand
         tout est planifié) */
      (su.autre ? '<div style="font-size:11px;color:var(--warn-text);' +
        'margin-top:2px;line-height:1.4;">📝 ' +
        su.autre.replace(/</g, '&lt;') + '</div>' : '');
  nom.addEventListener('click', () => ouvrirPlace(p, sess));
  /* 👤 Son dossier, juste après son nom — v1134. Le bouton arrête le
     clic : la place ne s'ouvre pas en même temps. */
  if(!vide && typeof poserDossierApresLeNom === 'function'){
    poserDossierApresLeNom(nom, p.eleve, nom.querySelector('strong'));
  }
  /* Où en est son examen blanc : c'est ce qui décide s'il est
     prêt à passer. Le bureau doit le voir en donnant les dates. */
  if(!vide && typeof mentionExamenBlanc === 'function'){
    const eb = document.createElement('div');
    eb.style.cssText = 'font-size:11px;margin-top:2px;';

    const m = mentionExamenBlanc({ eleve: p.eleve, etat: etatDe(p.eleve) });

    /* Un repassage : le post-permis remplace l'examen blanc, qui
       date d'avant et n'apprend plus rien. */
    const post = (typeof mentionPostPermis === 'function')
      ? mentionPostPermis(p.eleve) : '';

    const h = (typeof mentionHeuresRestantes === 'function')
      ? mentionHeuresRestantes(p.eleve) : '';

    /* Le post-permis dit déjà « — 2 + 3h » : répéter les heures
       juste après faisait lire deux fois la même chose. */
    /* ⚠️ Les deux formulations — v1041 : les notes déjà écrites
       disent « les 3h », les neuves « la leçon de veille ». */
    const dejaDites = post && / \+ 3h| les 3h|le[çc]on de veille/.test(post);

    const quoi = post || m.replace(/^ · /, '');
    const manque = (!post && /pas encore/.test(m)) ||
                   (!dejaDites && /à préciser/.test(h));

    /* Le point à refaire : le bureau le voit sous le nom */
    const pt = (typeof mentionFairePoint === 'function')
      ? mentionFairePoint(p.eleve) : '';

    eb.style.color = manque ? 'var(--warn-text)' : 'var(--muted)';
    eb.textContent = quoi + (dejaDites ? '' : h);

    if(pt){
      const l = document.createElement('div');
      l.style.cssText = 'margin-top:2px;color:var(--accent-text);';
      l.textContent = pt;
      eb.appendChild(l);
    }

    /* Un appui pour le corriger ou l'indiquer à la main */
    eb.style.cursor = 'pointer';
    eb.title = "Indiquer où en est son examen blanc";
    eb.addEventListener('click', ev => {
      ev.stopPropagation();
      if(typeof saisirExamenBlanc === 'function') saisirExamenBlanc(p.eleve);
    });

    nom.appendChild(eb);
  }

  l.appendChild(nom);

  if(!vide){
    /* Prévenu : le geste le plus fréquent, accessible directement */
    const bPrev = document.createElement('button');
    bPrev.className = 'btn btn-secondary';
    bPrev.style.cssText = 'width:auto;padding:5px 8px;font-size:14px;margin:0;flex-shrink:0;';
    bPrev.textContent = p.prevenu ? '📣' : '🔕';
    bPrev.title = p.prevenu ? 'Prévenu — appuie pour annuler' : 'Marquer comme prévenu';
    bPrev.addEventListener('click', async ev => {
      ev.stopPropagation();
      bPrev.disabled = true;
      try{
        /* On bascule d'abord, on enregistre ensuite : l'écran
           répond tout de suite, l'appel se fait derrière. */
        p.prevenu = !p.prevenu;
        redessinerSessions();
        await ecrireSurLaPlace({ idSession: sess.id, rang: p.rang,
                                 prevenu: p.prevenu ? 'oui' : '' });
      }catch(e){
        /* L'enregistrement a échoué : on remet comme avant */
        p.prevenu = !p.prevenu;
        redessinerSessions();
        showToast('Impossible : ' + e.message);
      }
    });
    l.appendChild(bPrev);

    const bEch = document.createElement('button');
    bEch.className = 'btn btn-secondary echPlace';
    bEch.dataset.idSession = String(sess.id);
    bEch.dataset.rang = String(p.rang);
    bEch.style.cssText = 'width:auto;padding:5px 8px;font-size:14px;margin:0;flex-shrink:0;';
    bEch.textContent = '🔄';
    bEch.addEventListener('click', async ev => {
      ev.stopPropagation();
      await gererEchange(p, sess);
    });
    l.appendChild(bEch);
  }

  /* La ligne se désigne : le glisser-déposer y dépose, et le 🔄 s'y
     repeint, sans que la page soit redessinée. */
  l.dataset.place = sess.id + '|' + p.rang;

  /* ⚠️ LE GLISSEMENT PART D'UNE POIGNÉE, PAS DE LA LIGNE ENTIÈRE.

     David, le 9 septembre : « je ne peux plus cliquer sur les
     élèves dans permis pour modifier la préparation » — puis :
     « quand je clique, ça n'ouvre pas le questionnaire, ça me
     permet de bouger l'élève ».

     Le glisser-déposer était posé sur TOUTE la ligne, et il prenait
     le pointeur dès l'appui (setPointerCapture). Deux dégâts, tous
     deux invisibles à la lecture :

       · le clic qui suit est alors adressé à la LIGNE, plus au nom
         — le geste de tous les jours, ouvrir la fiche, ne partait
         plus nulle part ;
       · « touch-action:none » sur la ligne entière empêchait aussi
         de faire défiler la liste au doigt.

     La liste des groupes, elle, fait ça depuis toujours avec une
     poignée (ec-permis-listes.js). Deux glisser-déposer dans le
     même outil, deux comportements : c'est cette différence-là que
     David a rencontrée. Ils font désormais pareil. */
  if(p.eleve){
    const poignee = document.createElement('span');
    poignee.textContent = '⠿';
    poignee.title = 'Glisse pour déplacer ' + p.eleve;
    poignee.style.cssText = 'flex-shrink:0;font-size:15px;color:var(--muted);' +
      'cursor:grab;padding:2px 4px;margin-left:2px;';
    l.appendChild(poignee);
    rendrePlaceDeplacable(poignee, l, p, sess);
  }

  return l;
}


/* ------------------------------------------------------------
   LE 🔄 SE REPEINT SANS REDESSINER LA PAGE

   David, le 4 septembre : « le bouton agit sur la vitesse, c'est
   horrible : on appuie sur le bouton, ça ferme la page ; on appuie
   sur l'autre, ça referme la page et la rouvre ».

   Elle décrivait exactement ce que faisait le code : le premier
   appui appelait « afficherSessionsPermis », qui vide l'écran,
   RELIT LE CLASSEUR et redessine tout — pour changer la couleur
   d'une bordure. Un aller-retour réseau pour dire « j'ai retenu
   cette place ».

   Retenir une place ne change aucune donnée. Ça ne doit donc
   toucher que les boutons.
   ------------------------------------------------------------ */
function peindreEchange(){
  document.querySelectorAll('.echPlace').forEach(b => {
    const pris = !!(echangeEnCours &&
      String(echangeEnCours.idSession) === b.dataset.idSession &&
      String(echangeEnCours.rang) === b.dataset.rang);
    b.style.borderColor = pris ? 'var(--orange)' : '';
    b.style.color = pris ? 'var(--orange)' : '';
    /* Une place retenue fait des autres des cibles : le dire évite
       de chercher où appuyer. */
    b.title = pris
      ? 'Place retenue — appuie de nouveau pour annuler'
      : (echangeEnCours
          ? 'Échanger avec ' + (echangeEnCours.eleve || 'la place retenue')
          : 'Échanger de place');
  });
}


/* ------------------------------------------------------------
   CE QUE L'ÉCHANGE OUBLIAIT : LES FICHES

   L'échange déplaçait les noms sur les places et s'arrêtait là. Deux
   élèves permutés entre deux sessions de DATES DIFFÉRENTES gardaient
   chacun l'ancienne date sur leur fiche — et c'est cette date que
   lisent le bureau, les listes et la note du moniteur.

   Ce n'était pas visible parce que l'échange sert surtout à
   réordonner DANS une session : là, la date ne change pas, et il n'y
   avait rien à mettre à jour. C'est le cas d'à côté qui mentait.

   ⚠️ ON NE TOUCHE PAS À LA FICHE DE PRÉPARATION. David, le
   4 septembre : « non, car si on change, on l'a déjà prévenu — tu
   gardes intacte la fiche de préparation ». Donc « prévenu »,
   « dossier OK » et la remarque suivent l'élève sans être remis à
   zéro. Ce sont ses affaires à lui, pas celles de la place.

   Et rien ne part quand la date ET le centre sont les mêmes : le
   réordonnancement dans une session reste instantané.
   ------------------------------------------------------------ */
async function suivreLaDateApresEchange(nom, sessAvant, sessApres){
  if(!nom) return false;
  const dAvant = String((sessAvant && sessAvant.date) || '');
  const dApres = String((sessApres && sessApres.date) || '');
  const cAvant = String((sessAvant && sessAvant.centre) || '');
  const cApres = String((sessApres && sessApres.centre) || '');
  if(dAvant === dApres && cAvant === cApres) return false;

  const jour = (typeof dateEnToutesLettres === 'function')
    ? (dateEnToutesLettres(dApres) || dApres) : dApres;

  if(typeof majSuivi === 'function'){
    await majSuivi(nom, { datePermis: jour, centre: cApres,
                          aPlanifier: '', statut: '' });
  }
  /* Le moniteur ne lit pas cet écran : il lit la note de son
     prochain cours. C'est la dernière annonce qui fait foi. */
  if(typeof envoyerConsigne === 'function'){
    try{
      await envoyerConsigne(nom, 'permis',
        'Examen du permis fixé au ' + jour + ' (bureau)');
    }catch(e){ /* la date est écrite, le message se rattrapera */ }
  }
  return true;
}


/* Le cœur de l'échange, partagé par le bouton 🔄 et le
   glisser-déposer. Deux gestes, une seule règle. */
async function echangerDeuxPlaces(depuis, versP, versSess){
  const sessA = sessionsPermis.find(s => String(s.id) === String(depuis.idSession));
  const src = (sessA || {}).eleves || [];
  const a = src.find(x => Number(x.rang) === Number(depuis.rang));
  const b = versP;
  if(!a || !b) return;

  /* Qui va où, retenu AVANT la permutation en mémoire. */
  const nomA = String(a.eleve || '').trim();
  const nomB = String(b.eleve || '').trim();

  /* La permutation se voit tout de suite : l'heure appartient à la
     place, seuls les élèves et leur état changent de côté. */
  ['eleve', 'prevenu', 'dossierOk', 'remarque'].forEach(cle => {
    const t = a[cle]; a[cle] = b[cle]; b[cle] = t;
  });
  redessinerSessions();

  try{
    await ecrireSurLaPlace({ idSession: depuis.idSession, rang: depuis.rang,
                             echangeAvec: JSON.stringify({ idSession: versSess.id,
                                                           rang: versP.rang }) });

    /* Les fiches suivent — et seulement si la date ou le centre
       change vraiment. */
    let bouge = false;
    if(nomA) bouge = await suivreLaDateApresEchange(nomA, sessA, versSess) || bouge;
    if(nomB) bouge = await suivreLaDateApresEchange(nomB, versSess, sessA) || bouge;

    if(bouge){
      if(typeof chargerBureau === 'function') await chargerBureau(true);
      showToast('Échangés — leurs dates ont suivi ✅');
      redessinerSessions();
    }else{
      showToast('Échangés ✅');
    }
  }catch(e){
    showToast('Échange impossible : ' + e.message);
    afficherSessionsPermis();          /* on relit, l'état est incertain */
  }
}


/* Retient une place, puis permute avec la suivante désignée */
async function gererEchange(p, sess){
  if(!echangeEnCours){
    echangeEnCours = { idSession: sess.id, rang: p.rang, eleve: p.eleve };
    showToast('Choisis la place avec qui échanger 🔄');
    /* Repeindre, pas recharger : voir peindreEchange. */
    peindreEchange();
    return;
  }

  if(String(echangeEnCours.idSession) === String(sess.id) &&
     Number(echangeEnCours.rang) === Number(p.rang)){
    echangeEnCours = null;
    peindreEchange();
    return;
  }

  const depuis = echangeEnCours;
  echangeEnCours = null;
  await echangerDeuxPlaces(depuis, p, sess);
}


/* ------------------------------------------------------------
   LE GLISSER-DÉPOSER ENTRE PLACES

   Même technique que les groupes de la semaine : des événements de
   POINTEUR, qui couvrent la souris et le doigt. Le glisser-déposer
   natif du navigateur ne marche pas au doigt.

   Une place se saisit PAR SA POIGNÉE ⠿ et se lâche sur une autre —
   occupée (échange) ou libre (déplacement). Le 🔄 reste là pour qui
   préfère deux appuis.

   ⚠️ ET LA POIGNÉE N'EST PAS UN DÉTAIL DE STYLE.

   Le glissement était posé sur la LIGNE ENTIÈRE, et il prenait le
   pointeur dès l'appui. Un clic sur le nom était alors adressé à la
   ligne, plus au nom : ouvrir la fiche d'un élève — le geste de
   tous les jours dans cet écran — ne faisait plus rien du tout.
   David, le 9 septembre : « quand je clique, ça n'ouvre pas le
   questionnaire, ça me permet de bouger l'élève ».

   Un geste rare ne prend pas la place d'un geste quotidien. La
   poignée sépare les deux, et rend au passage le défilement de la
   liste au doigt, que « touch-action:none » sur la ligne entière
   avait emporté avec lui.
   ------------------------------------------------------------ */
function rendrePlaceDeplacable(poignee, ligne, p, sess){
  if(!p || !p.eleve) return;             /* une place vide ne se prend pas */
  let etat = null;

  const nettoyer = () => {
    if(etat && etat.fantome && etat.fantome.parentNode){
      etat.fantome.parentNode.removeChild(etat.fantome);
    }
    document.querySelectorAll('[data-place]').forEach(z => { z.style.outline = ''; });
    ligne.style.opacity = '';
    etat = null;
  };

  /* Sans « touch-action:none », le doigt fait défiler la page au lieu
     de déplacer le nom. Sur la POIGNÉE seule : ailleurs sur la ligne,
     le défilement reste normal. */
  poignee.style.touchAction = 'none';

  poignee.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    poignee.setPointerCapture(ev.pointerId);
    etat = { x: ev.clientX, y: ev.clientY, bouge: false, fantome: null };
  });

  poignee.addEventListener('pointermove', ev => {
    if(!etat) return;
    const d = Math.abs(ev.clientX - etat.x) + Math.abs(ev.clientY - etat.y);
    if(!etat.bouge && d < 8) return;      /* en dessous, c'est un appui */

    if(!etat.bouge){
      etat.bouge = true;
      ligne.style.opacity = '.4';
      const f = document.createElement('div');
      f.textContent = p.eleve + (p.heure ? ' · ' + p.heure : '');
      f.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;' +
        'background:var(--navy);border:1px solid var(--orange);' +
        'color:var(--cream);border-radius:8px;padding:5px 10px;' +
        'font-size:13px;box-shadow:0 6px 18px rgba(0,0,0,.45);';
      document.body.appendChild(f);
      etat.fantome = f;
    }
    etat.fantome.style.left = (ev.clientX + 12) + 'px';
    etat.fantome.style.top = (ev.clientY - 14) + 'px';

    const sous = document.elementFromPoint(ev.clientX, ev.clientY);
    const cible = sous && sous.closest ? sous.closest('[data-place]') : null;
    document.querySelectorAll('[data-place]').forEach(z => {
      z.style.outline = (z === cible && z !== ligne)
        ? '2px solid var(--orange)' : '';
    });
  });

  poignee.addEventListener('pointerup', async ev => {
    if(!etat) return;
    const bouge = etat.bouge;
    const sous = document.elementFromPoint(ev.clientX, ev.clientY);
    const cible = sous && sous.closest ? sous.closest('[data-place]') : null;
    nettoyer();
    if(!bouge || !cible || cible === ligne) return;

    const [idS, rang] = String(cible.dataset.place || '').split('|');
    if(!idS) return;
    const sessB = sessionsPermis.find(s => String(s.id) === String(idS));
    const placeB = sessB && (sessB.eleves || [])
      .find(x => Number(x.rang) === Number(rang));
    if(!sessB || !placeB) return;

    /* Le 🔄 en attente n'a plus lieu d'être : on vient de faire le
       geste autrement. */
    echangeEnCours = null;
    peindreEchange();
    await echangerDeuxPlaces({ idSession: sess.id, rang: p.rang, eleve: p.eleve },
                             placeB, sessB);
  });

  poignee.addEventListener('pointercancel', nettoyer);
}




/* ============================================================
   LA FICHE D'UNE PLACE
   ============================================================ */

function ouvrirPlace(p, sess){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 94vw);max-height:88vh;overflow-y:auto;';

  const t = document.createElement('h3');
  t.innerHTML = (p.eleve ? p.eleve.replace(/</g, '&lt;') : 'Place libre') +
                etiquetteBoite(boiteDe(p.eleve));
  boite.appendChild(t);

  const st = document.createElement('div');
  st.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.5;';
  st.textContent = (sess.date ? libelleDate(sess.date) : '') +
    (p.heure ? ' à ' + p.heure : '') +
    (sess.centre ? ' · ' + sess.centre : '');
  boite.appendChild(st);

  /* Prête-nom ou à remplacer : on le dit AVANT que le bureau touche
     à quoi que ce soit. Sans ça, on ne sait pas si cette place est
     ferme, et les deux boutons du bas n'ont pas de sens. */
  if(p.eleve && typeof etatPlace === 'function'){
    const et = etatPlace(p, null);
    if(et.cle === 'pretenom' || et.cle === 'remplacer'){
      const b = document.createElement('div');
      b.style.cssText = 'font-size:12.5px;line-height:1.5;margin:-6px 0 12px;' +
        'padding:8px 10px;border-radius:9px;border:1px solid ' + et.couleur +
        ';color:' + et.couleur + ';';
      b.textContent = et.emoji + ' ' + et.texte +
        (et.cle === 'pretenom'
          ? ' — sa place peut être reprise sans le prévenir.'
          : ' — il a été prévenu : pense à le rappeler si tu la reprends.');
      boite.appendChild(b);
    }
  }

  /* Où en est son examen blanc : c'est ce qui décide s'il est
     prêt à passer. Le bureau doit le voir en donnant la place. */
  if(p.eleve && typeof mentionExamenBlanc === 'function'){
    const eb = document.createElement('div');
    /* Le post-permis prime : pour un repassage, l'examen blanc
       ne dit plus rien d'utile. */
    const post = (typeof mentionPostPermis === 'function')
      ? mentionPostPermis(p.eleve) : '';
    const m = post || mentionExamenBlanc({ eleve: p.eleve,
                                           etat: etatDe(p.eleve) })
      .replace(/^ · /, '');
    const manque = !post && /pas encore/.test(m);

    eb.style.cssText = 'display:flex;gap:9px;align-items:center;' +
      'border:1px solid ' + (manque ? 'var(--orange)' : 'var(--line)') + ';' +
      'border-radius:10px;padding:9px 11px;margin-bottom:12px;';

    const t2 = document.createElement('span');
    t2.style.cssText = 'flex:1;min-width:0;font-size:13px;line-height:1.5;' +
      'color:' + (manque ? 'var(--warn-text)' : 'var(--cream)') + ';';
    t2.textContent = m;
    eb.appendChild(t2);

    boite.appendChild(eb);

    /* Deux boutons plutôt qu'un crayon : le bureau doit voir
       qu'il peut renseigner l'un ou l'autre. */
    const rB = document.createElement('div');
    rB.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;';

    const bouton = (libelle, action) => {
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'flex:1;padding:10px;font-size:12px;margin:0;';
      b.textContent = libelle;
      b.addEventListener('click', () => {
        fermerFond(fond);
        if(typeof action === 'function') action(p.eleve);
      });
      rB.appendChild(b);
    };

    bouton('📝 Examen blanc',
           typeof saisirExamenBlanc === 'function' ? saisirExamenBlanc : null);
    bouton('🔁 Post-permis',
           typeof saisirPostPermis === 'function' ? saisirPostPermis : null);
    bouton('❓ Faire le point',
           typeof saisirFairePoint === 'function' ? saisirFairePoint : null);

    boite.appendChild(rB);

    /* Les heures avant permis : des cases plutôt qu'un crayon,
       comme dans le bilan d'examen blanc. */
    boite.appendChild(casesHeuresPermis(p.eleve));
  }

  boite.insertAdjacentHTML('beforeend',
    '<label for="plEleve">Élève sur cette place</label>' +
    '<input type="text" id="plEleve" list="listeEleves" autocomplete="off" ' +
      'placeholder="Laisse vide pour une place fantôme">' +
    '<div class="duo">' +
      '<div><label for="plHeure">Heure</label>' +
        '<input type="time" id="plHeure"></div>' +
      '<div><label for="plRem">Remarque</label>' +
        '<input type="text" id="plRem" placeholder="Ex : arrive en retard"></div>' +
    '</div>' +
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin:8px 0;font-weight:400;">' +
      '<input type="checkbox" id="plPrevenu" style="width:19px;height:19px;">' +
      '📣 Élève prévenu</label>' +
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin-bottom:12px;font-weight:400;">' +
      '<input type="checkbox" id="plDossier" style="width:19px;height:19px;">' +
      '📁 Dossier vérifié</label>' +

    /* La préparation administrative : ce qui décide si l'élève
       passe ou si sa place doit être donnée à quelqu'un d'autre. */
    '<div style="border-top:1px solid var(--line);margin:6px 0 12px;' +
      'padding-top:12px;font-size:13px;font-weight:700;color:var(--accent-text);">' +
      '📋 Sa préparation</div>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin-bottom:8px;font-weight:400;">' +
      '<input type="checkbox" id="plOk" style="width:19px;height:19px;">' +
      '✅ Tout est OK — il peut passer</label>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--warn-text);margin-bottom:8px;font-weight:400;">' +
      '<input type="checkbox" id="plRemplacer" style="width:19px;height:19px;">' +
      '🔄 À remplacer — sa place est à donner</label>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin-bottom:8px;font-weight:400;">' +
      '<input type="checkbox" id="plPoint" style="width:19px;height:19px;">' +
      '❓ Faire le point avec lui</label>' +

    /* 💶 📆 v1193 — David, le 16 octobre : tant qu'elles ne sont pas
       cochées, un billet et un calendrier suivent son prénom. */
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin-bottom:8px;font-weight:400;">' +
      '<input type="checkbox" id="plPaye" style="width:19px;height:19px;">' +
      '💶 Tout est payé</label>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin-bottom:8px;font-weight:400;">' +
      '<input type="checkbox" id="plPlanifie" style="width:19px;height:19px;">' +
      '📆 Tout est planifié</label>' +

    '<div class="duo">' +
      '<div><label for="plPay">Reste à payer</label>' +
        '<input type="text" id="plPay" inputmode="decimal" placeholder="Ex : 180"></div>' +
      '<div><label for="plQd">Paiement prévu le</label>' +
        '<input type="date" id="plQd"></div>' +
    '</div>' +
    '<div class="duo">' +
      '<div><label for="plL2">Leçons de 2h à poser</label>' +
        '<input type="text" id="plL2" inputmode="numeric" placeholder="Ex : 2"></div>' +
      '<div><label for="plL1">Leçons de 1h</label>' +
        '<input type="text" id="plL1" inputmode="numeric" placeholder="Ex : 1"></div>' +
    '</div>' +
    '<div class="duo">' +
      '<div><label for="plBoite">Boîte</label>' +
        '<select id="plBoite">' +
          '<option value="">— d\'après sa formation —</option>' +
          '<option value="bea">BEA — automatique</option>' +
          '<option value="bv">BV — manuelle</option>' +
        '</select></div>' +
      '<div><label for="plRel">Relancer le</label>' +
        '<input type="date" id="plRel"></div>' +
    '</div>' +
    '<div class="duo">' +
      '<div><label for="plNat">Nature du paiement</label>' +
        '<select id="plNat">' +
          '<option value="">— non précisé —</option>' +
          '<option value="solde">Solde du permis</option>' +
          '<option value="heures">Heures en plus</option>' +
          '<option value="accompagnement">Accompagnement</option>' +
          '<option value="presentation">Frais de présentation</option>' +
        '</select></div>' +
    '</div>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin-bottom:8px;font-weight:400;">' +
      '<input type="checkbox" id="plAcc" style="width:19px;height:19px;">' +
      '🚗 Accompagnement à payer</label>' +

    '<label for="plAE">Auto-école à qui donner la date</label>' +
    '<input type="text" id="plAE" placeholder="Si la place part ailleurs">' +

    '<label for="plAut">Autres notes</label>' +
    '<input type="text" id="plAut" placeholder="Ce qui reste à faire avant l\'examen">');

  boite.querySelector('#plEleve').value = p.eleve || '';
  boite.querySelector('#plHeure').value = p.heure || '';
  boite.querySelector('#plRem').value = p.remarque || '';
  boite.querySelector('#plPrevenu').checked = !!p.prevenu;
  boite.querySelector('#plDossier').checked = !!p.dossierOk;

  /* La préparation vient du suivi, partagée avec l'autre sous-onglet :
     ce qu'on coche ici se retrouve dans « Permis et places ». */
  const su = (typeof suiviDe === 'function' && p.eleve) ? suiviDe(p.eleve) : {};
  boite.querySelector('#plOk').checked = (su.toutOk === 'oui');
  boite.querySelector('#plRemplacer').checked = (su.aRemplacer === 'oui');
  boite.querySelector('#plPoint').checked = (su.fairePoint === 'oui');
  boite.querySelector('#plPaye').checked = (su.toutPaye === 'oui');
  boite.querySelector('#plPlanifie').checked = (su.toutPlanifie === 'oui');

  /* ✅ v1260 — LES TROIS CASES SE TIENNENT. David, le 24 octobre :
     « quand on coche Tout est OK, il faut que ça coche Tout est payé
     et Tout est planifié, et quand on coche les deux, il faut que ça
     coche Tout est OK ». Et dans l'autre sens, par la même logique :
     décocher l'une des deux décoche « Tout est OK » — tout n'est plus
     OK. Décocher « Tout est OK » ne touche pas aux deux autres : le
     dossier peut manquer d'autre chose qu'un paiement ou un cours. */
  {
    const cOk = boite.querySelector('#plOk');
    const cPaye = boite.querySelector('#plPaye');
    const cPlan = boite.querySelector('#plPlanifie');
    cOk.addEventListener('change', () => {
      if(cOk.checked){ cPaye.checked = true; cPlan.checked = true; }
    });
    const lesDeux = () => {
      if(cPaye.checked && cPlan.checked) cOk.checked = true;
      else cOk.checked = false;
    };
    cPaye.addEventListener('change', lesDeux);
    cPlan.addEventListener('change', lesDeux);
  }
  boite.querySelector('#plPay').value = su.resteAPayer || '';
  boite.querySelector('#plQd').value = su.paiementPrevu || '';
  boite.querySelector('#plL2').value = su.lecons2h || '';
  boite.querySelector('#plL1').value = su.lecons1h || '';
  boite.querySelector('#plAut').value = su.autre || '';
  boite.querySelector('#plRel').value = su.relanceLe || '';
  boite.querySelector('#plBoite').value = su.typeExamen || '';
  boite.querySelector('#plNat').value = su.nature || '';
  boite.querySelector('#plAcc').checked = (su.accompagnement === 'oui');
  /* 📅 v1544 — les réservations, sous « 📆 Tout est planifié » : cachées
     quand c'est coché (c'est posé sur le planning) */
  const blocResa = blocReservationsPermis({
    etat: etatResaPermis(Object.assign({}, su, { toutPlanifie: '' })),
    texte: su.reservations || '',
    datePermis: isoDuPermis(sess && sess.date)
  });
  blocResa.id = 'plResa';
  {
    const cPlan = boite.querySelector('#plPlanifie');
    cPlan.closest('label').after(blocResa);
    /* 📅 v1547 — sous « Tout est planifié » : ses leçons posées sur Drivup,
       et si ça couvre ce qu'il doit faire (affiché, même coché) */
    if(p.eleve && typeof blocPlanningDrivupPermis === 'function'){
      const bd = blocPlanningDrivupPermis({ nom: p.eleve, exam: sess && sess.date,
        /* coché tout seul pendant que la fiche est ouverte : la case suit,
           sinon « Enregistrer » le décocherait */
        surAuto: () => { if(!cPlan.checked){ cPlan.checked = true; cPlan.dispatchEvent(new Event('change')); } } });
      bd.id = 'plDrivup';
      cPlan.closest('label').after(bd);
    }
    const montrer = () => { blocResa.style.display = cPlan.checked ? 'none' : ''; };
    montrer();
    cPlan.addEventListener('change', montrer);
    boite.querySelector('#plOk').addEventListener('change', montrer);
  }
  boite.querySelector('#plAE').value = su.autoEcole || '';

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => fermerFond(fond));
  r.appendChild(bAnn);

  /* ============================================================
     DEUX GESTES, ET ILS N'ÉTAIENT QU'UN

     Il n'y avait qu'un bouton, « 👻 Retirer », et il EFFAÇAIT LE
     NOM. Résultat : on ne voyait plus qui tenait cette date — et
     c'est justement l'information dont le bureau a besoin.

     Ce sont pourtant deux choses différentes :

     · 👻 LE MARQUER PRÊTE-NOM — il garde sa place ET son nom
       reste visible. On sait juste qu'il n'est pas ferme et que la
       place est reprenable. C'est ce qui manquait.

     · ⬜ VIDER LA PLACE — le nom s'en va pour de bon, la place
       redevient un créneau libre.

     ⚠️ Et l'ancien bouton MENTAIT : sa fenêtre annonçait « sa date
     d'examen est effacée », alors qu'il ne touchait qu'à la place.
     L'élève gardait sa date sur sa fiche sans être sur aucune
     session. C'est réparé : « vider » efface vraiment la date et
     le renvoie dans la liste RDV Permis.
     ============================================================ */
  if(p.eleve){
    const suP = (typeof suiviDe === 'function') ? (suiviDe(p.eleve) || {}) : {};
    const estPreteNom = (suP.fantome === 'oui');

    const bFan = document.createElement('button');
    bFan.className = 'btn btn-secondary';
    bFan.style.cssText = 'color:#E8A33D;border-color:#E8A33D;';
    bFan.textContent = estPreteNom ? '👻 Plus un prête-nom' : '👻 Prête-nom';
    bFan.title = estPreteNom
      ? 'Il tient cette place pour de bon'
      : 'Il garde la place et son nom reste visible, mais elle est reprenable';
    bFan.addEventListener('click', async () => {
      const nom = p.eleve;
      try{
        await majSuivi(nom, { fantome: estPreteNom ? '' : 'oui' });
        fermerFond(fond);
        showToast(estPreteNom
          ? nom + ' tient sa place pour de bon'
          : nom + ' est prête-nom sur cette date 👻');
        redessinerSessions();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bFan);

    const bVider = document.createElement('button');
    bVider.className = 'btn btn-secondary';
    bVider.style.cssText = 'color:var(--warn-text);border-color:var(--orange);';
    bVider.textContent = '⬜ Vider la place';
    bVider.title = 'Le nom s\'en va, la place redevient un créneau libre';
    bVider.addEventListener('click', async () => {
      const nom = p.eleve;
      if(!await confirmer('Retirer ' + nom + ' de cette place ?\n\n' +
          'Son nom disparaît de cette date et la place redevient libre. ' +
          "Sa date d'examen est effacée : il repart dans la liste " +
          'RDV Permis.\n\nPour garder son nom visible, utilise plutôt ' +
          '👻 Prête-nom.')) return;
      try{
        Object.assign(p, { eleve: '', prevenu: false, dossierOk: false, remarque: '' });
        fermerFond(fond);
        showToast('Place vidée ⬜');
        redessinerSessions();
        await ecrireSurLaPlace({ idSession: sess.id, rang: p.rang,
                                 eleve: '', prevenu: '', dossierOk: '',
                                 remarque: '' });
        /* Ce que la fenêtre annonce, et que personne ne faisait. */
        await rendreALaListeRdvPermis(nom, sess.date || '');
        redessinerSessions();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bVider);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '💾 Enregistrer';
  bOk.addEventListener('click', async () => {
    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      const nomSaisi = boite.querySelector('#plEleve').value.trim();
      const champsPlace = {
        eleve: nomSaisi,
        heure: boite.querySelector('#plHeure').value,
        remarque: boite.querySelector('#plRem').value.trim(),
        prevenu: boite.querySelector('#plPrevenu').checked ? 'oui' : '',
        dossierOk: boite.querySelector('#plDossier').checked ? 'oui' : ''
      };

      /* Le nom d'avant : si on le retire, il faut effacer sa date
         ailleurs, sinon il apparaît encore comme ayant une place. */
      const ancienNom = String(p.eleve || '').trim();
      const retire = ancienNom && (!nomSaisi ||
        normaliserMot(ancienNom) !== normaliserMot(nomSaisi));

      /* ✅ v1418 — « Tout est OK » qui PASSE à coché : le message du
         planning validé s'ouvre après l'enregistrement (lu avant que la
         mémoire ne prenne les nouvelles cases). */
      const etaitOk = !!nomSaisi && typeof suiviDe === 'function' && (suiviDe(nomSaisi) || {}).toutOk === 'oui';
      const champsSuivi = nomSaisi ? {
        datePermis: sess.date || '',
        centre: sess.centre || '',
        toutOk: boite.querySelector('#plOk').checked ? 'oui' : '',
        aRemplacer: boite.querySelector('#plRemplacer').checked ? 'oui' : '',
        fairePoint: boite.querySelector('#plPoint').checked ? 'oui' : '',
        toutPaye: boite.querySelector('#plPaye').checked ? 'oui' : '',
        toutPlanifie: boite.querySelector('#plPlanifie').checked ? 'oui' : '',
        resteAPayer: boite.querySelector('#plPay').value.trim(),
        paiementPrevu: boite.querySelector('#plQd').value,
        lecons2h: boite.querySelector('#plL2').value.trim(),
        lecons1h: boite.querySelector('#plL1').value.trim(),
        autre: boite.querySelector('#plAut').value.trim(),
        relanceLe: boite.querySelector('#plRel').value,
        typeExamen: boite.querySelector('#plBoite').value,
        nature: boite.querySelector('#plNat').value,
        accompagnement: boite.querySelector('#plAcc').checked ? 'oui' : '',
        /* 📅 v1544 — l'état et le texte, lus dans le bloc à calendrier */
        reservations: blocResa.valeurs().reservations,
        resaEtat: blocResa.valeurs().resaEtat,
        autoEcole: boite.querySelector('#plAE').value.trim()
      } : null;

      /* La place en mémoire suit tout de suite */
      Object.assign(p, {
        eleve: champsPlace.eleve,
        heure: champsPlace.heure,
        remarque: champsPlace.remarque,
        prevenu: champsPlace.prevenu === 'oui',
        dossierOk: champsPlace.dossierOk === 'oui'
      });

      /* Le suivi en mémoire suit AUSSI : la ligne affiche ses
         heures, son examen blanc et son post-permis, qui viennent
         de là. Sans cette pose, le redessin relisait l'ancien
         état et il fallait rafraîchir la page. */
      if(champsSuivi && nomSaisi && typeof etatBureau !== 'undefined'){
        const dans = (etatBureau.suivi || []).find(x =>
          normaliserMot(x.eleve) === normaliserMot(nomSaisi));

        if(dans) Object.assign(dans, champsSuivi);
        else{
          etatBureau.suivi = etatBureau.suivi || [];
          etatBureau.suivi.push(Object.assign({ eleve: nomSaisi }, champsSuivi));
        }
      }

      /* Celui qu'on retire perd sa date dans la mémoire aussi — LES
         MÊMES CHAMPS que ce qui part au serveur, pas une deuxième
         liste écrite à la main. C'en était une, et elle avait déjà
         divergé : l'écran gardait son 👻 et le laissait hors de RDV
         Permis jusqu'au prochain rechargement. */
      if(retire && typeof etatBureau !== 'undefined'){
        const parti = (etatBureau.suivi || []).find(x =>
          normaliserMot(x.eleve) === normaliserMot(ancienNom));
        if(parti) Object.assign(parti, champsSortieDeSession());
      }

      /* La fenêtre se ferme tout de suite : la mémoire est à jour,
         et le bureau n'a rien à attendre du réseau. */
      fermerFond(fond);
      showToast('Enregistré ✅');
      redessinerSessions();
      if(champsSuivi && champsSuivi.toutOk === 'oui' && !etaitOk && typeof ouvrirMessagePlanningValide === 'function'){
        ouvrirMessagePlanningValide(nomSaisi);
      }

      /* ⚠️ LA PLACE D'ABORD, LE SUIVI ENSUITE — ET SURTOUT PAS LES
         DEUX EN MÊME TEMPS.

         Ils partaient ensemble, « pour ne pas attendre deux fois ».
         Voici ce que ça a donné le 2 septembre, sur la session du
         15 septembre à Saint-Brieuc, complète :

           · « sessionPlace » écrit Axel à la place de Daouda ;
           · « suiviSet » écrit la date d'examen d'Axel, et le
             classeur, comme il le doit, lui cherche une place ce
             jour-là.

         Les deux partis ensemble, la recherche de place a lieu
         AVANT que la place ne change de nom : toutes les places
         sont encore prises, aucune n'est libre. Le classeur refuse
         — c'est son rôle, il n'invente plus de place depuis la
         v790 — et laisse la ligne 🎫 « Place inventée » dans
         🚨 Signalements. La date d'examen d'Axel n'a jamais été
         écrite, et l'écran affichait « Enregistré ✅ ».

         En série, « suiviSet » trouve Axel déjà sur sa place et
         n'a plus rien à chercher. Une demi-seconde de plus, et la
         date est écrite pour de bon. */
      ecrireSurLaPlace(Object.assign({ idSession: sess.id, rang: p.rang },
                                     champsPlace))
      .then(() => Promise.all([
        (champsSuivi && typeof majSuivi === 'function')
          ? majSuivi(nomSaisi, champsSuivi) : Promise.resolve(),

        /* Celui qu'on retire perd sa date : sans cela, il restait
           « avec une date » dans le questionnaire et les notes. */
        retire ? retirerDeLaSession(ancienNom, sess) : Promise.resolve()
      ]))
      .then(() => {
        /* Le moniteur doit voir la date dans ses cours préparés :
           sans consigne, elle ne quittait pas l'écran du bureau. */
        if(nomSaisi && sess.date && typeof envoyerConsigne === 'function'){
          return envoyerConsigne(nomSaisi, 'permis',
            'Examen du permis fixé au ' + dateEnToutesLettres(sess.date) +
            (sess.centre ? ' à ' + sess.centre : '') +
            (champsPlace.heure ? ' à ' + champsPlace.heure : '') + ' (bureau)');
        }
      })
      .catch(err => {
        /* Un échec en fond doit se voir : sans cela, le bureau
           croirait sa saisie enregistrée. Et il doit DIRE quoi : un
           refus de place ne se répare pas comme une coupure de
           réseau — il faut ouvrir la journée avant de recommencer. */
        showToast('⚠️ ' + (champsPlace.eleve || 'La place') + ' : ' +
                  ((err && err.message) || 'enregistrement incomplet') +
                  ' — vérifie et refais');
      });
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
      bOk.textContent = '💾 Enregistrer';
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#plEleve').focus(), 100);
}


/* ============================================================
   CRÉER OU MODIFIER UNE SESSION
   ============================================================ */

/* Les créneaux d'examen habituels, matin et après-midi. Nom propre
   au module : ec-messenger.js déclare déjà HEURES_EXAMEN, au format
   « 08h00 », et deux constantes du même nom se percutent. */
const CRENEAUX_SESSION = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00',
  '13:15', '13:45', '14:15', '14:45', '15:15', '15:45'
];


/* L'heure d'un créneau, côté écran : même calcul que le serveur,
   pour montrer les horaires avant même d'enregistrer. */
function heureDuCreneau(debut, duree, n){
  const m = String(debut || '').match(/^(\d{1,2})[:h](\d{2})/);
  if(!m) return '';
  const mins = (+m[1]) * 60 + (+m[2]) + (duree * n);
  const h = Math.floor(mins / 60) % 24;
  return String(h).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
}


/* 🟪 v1162 — tout centre qui n'est pas Saint-Brieuc. Un centre vide
   n'est « ailleurs » nulle part : on ne colore pas une question. */
function horsSaintBrieuc(centre){
  const c = normaliserMot(String(centre || ''));
  return !!c && c.indexOf('brieuc') === -1;
}

/* Une rangée de pastilles qui pilote un champ — v1162. Le champ reste
   la seule source : tout le reste du formulaire le lit, rien d'autre
   à changer. « autre » le montre pour une valeur libre. */
function pucesDuChamp(champ, choix, valeurAutre){
  const r = document.createElement('div');
  r.className = 'sesPuces';
  const peindre = () => {
    const v = String(champ.value || '').trim();
    const connu = choix.some(c => normaliserMot(c[0]) === normaliserMot(v));
    [...r.children].forEach(b => {
      const on = b.dataset.v === 'autre'
        ? (champ.dataset.autre === 'oui' || (!connu && v !== ''))
        : (champ.dataset.autre !== 'oui' && normaliserMot(b.dataset.v) === normaliserMot(v));
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    champ.style.display = (champ.dataset.autre === 'oui' || (!connu && v !== '')) ? '' : 'none';
  };
  choix.concat([['autre', '⌨️ Autre']]).forEach(([v, texte]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sesPuce';
    b.dataset.v = v;
    b.textContent = texte;
    b.addEventListener('click', () => {
      if(v === 'autre'){
        champ.dataset.autre = 'oui';
        /* Une valeur des pastilles laissée dans le champ ferait croire
           qu'« Autre » n'a rien changé : on propose la suivante. */
        const dejaChoix = choix.some(c => normaliserMot(c[0]) === normaliserMot(champ.value));
        if(!champ.value || dejaChoix) champ.value = valeurAutre || '';
        peindre();
        setTimeout(() => { try{ champ.focus(); champ.select(); }catch(e){} }, 30);
      }else{
        champ.dataset.autre = '';
        champ.value = v;
        peindre();
      }
      champ.dispatchEvent(new Event('input', { bubbles: true }));
    });
    r.appendChild(b);
  });
  champ.addEventListener('input', peindre);
  r.peindre = peindre;
  return r;
}

function ouvrirEditeurSession(sess, brouillon){
  /* Une session qui part encore vers le classeur ne se rouvre pas :
     on modifierait ce qui n'est pas encore écrit. */
  if(sess && sess.__enCours){
    showToast('⏳ Cette session s’enregistre encore — un instant.');
    return;
  }
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 94vw);max-height:88vh;overflow-y:auto;';

  const gens = (typeof moniteursActifs !== 'undefined' ? moniteursActifs : []) || [];

  boite.insertAdjacentHTML('beforeend',
    '<h3>' + (sess ? 'Modifier la session' : "Nouvelle session d'examen") + '</h3>' +
    '<div class="duo">' +
      '<div><label for="seDate">Date</label><input type="date" id="seDate"></div>' +
      '<div><label for="seHeure">Heure du 1er passage</label>' +
        /* Une liste plutôt qu'un datalist : les champs « time »
           ignorent les suggestions sur plusieurs navigateurs.
           Le dernier choix ouvre un champ libre. */
        '<select id="seHeureChoix">' +
          CRENEAUX_SESSION.map(h => '<option value="' + h + '">' +
                                 h.replace(':', 'h') + '</option>').join('') +
          '<option value="autre">⌨️ Autre heure…</option>' +
        '</select>' +
        '<input type="time" id="seHeure" style="display:none;margin-top:6px;">' +
      '</div>' +
    '</div>' +
    /* 🔢 v1162 — en pastilles, 3 d'avance (David). Le champ reste,
       caché, pour « Autre ». ⚠️ SUR TOUTE LA LARGEUR : dans la moitié
       d'une rangée, « Autre » passait à la ligne sur l'ordinateur. */
    '<label for="sePlaces">Nombre de places</label>' +
    '<div id="sePlacesPuces"></div>' +
    '<input type="number" id="sePlaces" min="1" max="20" value="3">' +
    '<div class="duo">' +
      '<div><label for="seDuree">Minutes par passage</label>' +
        '<input type="number" id="seDuree" min="15" max="60" step="5" value="30"></div>' +
      '<div></div>' +
    '</div>' +
    /* 🏁 v1162 — les deux centres en pastilles, « Autre » pour le reste */
    '<label for="seCentre">Centre d\'examen</label>' +
    '<div id="seCentrePuces"></div>' +
    '<input type="text" id="seCentre" placeholder="Le nom du centre">' +
    '<div class="duo">' +
      '<div><label for="seMon">Moniteur</label><select id="seMon">' +
        '<option value="">— à définir —</option>' +
        gens.map(g => '<option value="' + String(g).replace(/"/g, '&quot;') + '">' +
                      g + '</option>').join('') +
      '</select></div>' +
      '<div><label for="seBoite">Boîte</label><select id="seBoite">' +
        '<option value="">— les deux —</option>' +
        '<option value="bea">BEA — automatique</option>' +
        '<option value="bv">BV — manuelle</option>' +
      '</select></div>' +
    '</div>' +
    '<label for="seInsp">Inspecteur (facultatif)</label>' +
    '<input type="text" id="seInsp" placeholder="Son nom, si tu le connais">' +

    /* Les élèves dès la création : les poser un par un ensuite
       obligeait à rouvrir chaque place. */
    '<div style="border-top:1px solid var(--line);margin:14px 0 10px;' +
      'padding-top:12px;font-size:13px;font-weight:700;color:var(--accent-text);">' +
      '👥 Les élèves de cette session</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-bottom:8px;' +
      'line-height:1.5;">Juste les noms pour l\'instant. Leur fiche de ' +
      'préparation se remplit ensuite, place par place. Laisse vide pour ' +
      'garder une place fantôme.</div>' +
    '<div id="seEleves"></div>');

  /* Saint-Brieuc par défaut : c'est le centre de la plupart des
     sessions, et il reste modifiable. */
  if(!sess) boite.querySelector('#seCentre').value = 'Saint-Brieuc';

  /* La liste pilote le champ caché : le reste du formulaire lit
     toujours #seHeure, rien d'autre à changer. */
  const listeH = boite.querySelector('#seHeureChoix');
  const champH = boite.querySelector('#seHeure');

  const majDepuisListe = () => {
    if(listeH.value === 'autre'){
      champH.style.display = 'block';
      setTimeout(() => champH.focus(), 60);
    }else{
      champH.style.display = 'none';
      champH.value = listeH.value;
    }
    champH.dispatchEvent(new Event('input'));
  };

  listeH.addEventListener('change', majDepuisListe);
  /* 14h15 d'avance : le créneau le plus courant */
  listeH.value = '14:15';
  champH.value = '14:15';

  if(sess){
    boite.querySelector('#seDate').value = sess.date || '';
    boite.querySelector('#seHeure').value = sess.heureDebut || '';
    /* Une heure hors liste bascule sur le champ libre */
    if(sess.heureDebut && CRENEAUX_SESSION.indexOf(sess.heureDebut) === -1){
      boite.querySelector('#seHeureChoix').value = 'autre';
      boite.querySelector('#seHeure').style.display = 'block';
    }else if(sess.heureDebut){
      boite.querySelector('#seHeureChoix').value = sess.heureDebut;
    }
    boite.querySelector('#sePlaces').value = sess.eleves.length || 3;
    /* La durée de CETTE session, pas 30 d'office : sinon une simple
       modification du moniteur recalculait ses créneaux à 30 min. */
    boite.querySelector('#seDuree').value = dureeSession(sess);
    boite.querySelector('#seCentre').value = sess.centre || '';
    boite.querySelector('#seMon').value = sess.moniteur || '';
    boite.querySelector('#seBoite').value = sess.boite || '';
    boite.querySelector('#seInsp').value = sess.inspecteur || '';
  }

  /* ⚠️ RETOUR D'UN REFUS — v1162. La fenêtre se ferme dès l'appui ;
     si le classeur refuse, elle revient avec ce qui avait été tapé,
     pas avec l'ancienne session. */
  if(brouillon){
    boite.querySelector('#seDate').value = brouillon.date || '';
    boite.querySelector('#seHeure').value = brouillon.heureDebut || '';
    if(brouillon.heureDebut && CRENEAUX_SESSION.indexOf(brouillon.heureDebut) === -1){
      listeH.value = 'autre'; champH.style.display = 'block';
    }else if(brouillon.heureDebut){
      listeH.value = brouillon.heureDebut;
    }
    boite.querySelector('#sePlaces').value = brouillon.places || 3;
    boite.querySelector('#seDuree').value = brouillon.duree || 30;
    boite.querySelector('#seCentre').value = brouillon.centre || '';
    boite.querySelector('#seMon').value = brouillon.moniteur || '';
    boite.querySelector('#seBoite').value = brouillon.boite || '';
    boite.querySelector('#seInsp').value = brouillon.inspecteur || '';
  }

  /* Les pastilles, une fois les valeurs posées */
  const champPlaces = boite.querySelector('#sePlaces');
  const champCentre = boite.querySelector('#seCentre');
  const pucesPlaces = pucesDuChamp(champPlaces,
    [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']], '5');
  boite.querySelector('#sePlacesPuces').appendChild(pucesPlaces);
  const pucesCentre = pucesDuChamp(champCentre,
    [['Saint-Brieuc', 'Saint-Brieuc'], ['Loudéac', 'Loudéac']], '');
  boite.querySelector('#seCentrePuces').appendChild(pucesCentre);
  pucesPlaces.peindre();
  pucesCentre.peindre();

  /* 🟪 Le violet suit le centre, dès qu'on le change. */
  const titre = boite.querySelector('h3');
  const pastilleCentre = document.createElement('span');
  pastilleCentre.className = 'sesCentrePastille';
  titre.appendChild(pastilleCentre);
  const majViolet = () => {
    const c = champCentre.value.trim();
    const ailleurs = horsSaintBrieuc(c);
    boite.classList.toggle('ses-ailleurs', ailleurs);
    pastilleCentre.textContent = ailleurs ? '📍 ' + c : '';
    pastilleCentre.style.display = ailleurs ? '' : 'none';
  };
  champCentre.addEventListener('input', majViolet);
  majViolet();

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin:8px 0 12px;line-height:1.5;';
  aide.textContent = "Les créneaux se calculent seuls à partir de l'heure de début " +
    'et de la durée.';
  boite.appendChild(aide);

  /* ------------------------------------------------------------
     LES GROUPES PRÉPARÉS DANS LA SEMAINE

     David, le 4 septembre : « quand on ouvre les sessions
     d'examen, ça serait bien qu'on retrouve ces groupes
     directement ».

     C'est tout l'intérêt d'avoir groupé une semaine à l'avance : le
     mardi, on ne recompose pas la liste de tête. Un appui verse le
     groupe dans les places libres.

     ⚠️ IL VERSE, IL NE VALIDE PAS. Les noms atterrissent dans les
     champs ; rien n'est écrit tant qu'on n'a pas enregistré. Et il
     ne touche à aucune place déjà occupée : on ne remplace personne
     sans le dire. */
  const zGroupes = document.createElement('div');
  zGroupes.style.cssText = 'margin:-4px 0 12px;';
  boite.appendChild(zGroupes);

  /* Un champ par place, redessiné quand le nombre change */
  const zEleves = boite.querySelector('#seEleves');
  const champNombre = boite.querySelector('#sePlaces');
  const champHeure = boite.querySelector('#seHeure');
  const champDuree = boite.querySelector('#seDuree');

  const refaireChamps = () => {
    const n = Math.max(1, Math.min(20, parseInt(champNombre.value, 10) || 1));
    const avant = [...zEleves.querySelectorAll('.seEleve')].map(x => x.value);

    zEleves.innerHTML = '';
    for(let i = 0; i < n; i++){
      const l = document.createElement('div');
      l.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;';

      const h = document.createElement('span');
      h.className = 'seHeurePlace';
      h.style.cssText = 'width:52px;flex-shrink:0;font-size:13px;color:var(--muted);';
      h.textContent = heureDuCreneau(champHeure.value, +champDuree.value || 30, i) || '—';
      l.appendChild(h);

      const e = document.createElement('input');
      e.type = 'text';
      e.className = 'seEleve';
      e.setAttribute('list', 'listeEleves');
      e.setAttribute('autocomplete', 'off');
      e.placeholder = 'Place ' + (i + 1) + ' — laisse vide si libre';
      e.style.cssText = 'flex:1;min-width:0;margin:0;padding:9px 10px;font-size:15px;';
      /* Ce qui était déjà saisi ne se perd pas */
      if(avant[i] !== undefined) e.value = avant[i];
      else if(brouillon && brouillon.noms) e.value = brouillon.noms[i] || '';
      else if(sess && sess.eleves[i]) e.value = sess.eleves[i].eleve || '';
      l.appendChild(e);

      zEleves.appendChild(l);
    }
  };

  /* Les heures suivent l'heure de début et la durée */
  const majHeures = () => {
    [...zEleves.querySelectorAll('.seHeurePlace')].forEach((h, i) => {
      h.textContent = heureDuCreneau(champHeure.value, +champDuree.value || 30, i) || '—';
    });
  };

  /* Les boutons de groupe, une fois les champs de place en place :
     ils écrivent dedans, ils ne peuvent pas les précéder. */
  const peindreGroupes = () => {
    zGroupes.innerHTML = '';
    if(typeof etatBureau === 'undefined' || !etatBureau.suivi) return;

    /* ⚠️ ON REGROUPE SUR LA CLÉ, PAS SUR LE NOM.

       David, le 4 septembre : « là tu les regroupes par semaine,
       il ne faut pas — il faut bien garder chaque groupe de liste
       rendez-vous permis indépendant ». « Groupe 1 » de la semaine 37
       et « Groupe 1 » de la semaine 38 ne faisaient qu'un bouton de
       six élèves. La clé porte un identifiant propre à chaque
       groupe : ils ne peuvent plus se confondre, même appelés
       pareil. */
    const parGroupe = {}, ou = {};
    (etatBureau.suivi || []).forEach(s => {
      const g = String(s.groupeSemaine || '').trim();
      if(!g || !s.eleve) return;
      /* Déjà placé sur une date : son groupe de semaine a servi. */
      if(String(s.datePermis || '').trim()) return;
      (parGroupe[g] = parGroupe[g] || []).push(s.eleve);
      if(!ou[g]){
        ou[g] = [String(s.semaine || '').trim(), String(s.centre || '').trim()]
                  .filter(Boolean).join(' · ');
      }
    });
    const noms = Object.keys(parGroupe).sort((a, b) => {
      const c = (ou[a] || '').localeCompare(ou[b] || '', 'fr', { numeric: true });
      return c || libelleGroupe(a).localeCompare(libelleGroupe(b), 'fr',
                                                { numeric: true });
    });
    if(!noms.length) return;

    /* Deux groupes peuvent porter le même nom sans être le même
       groupe. Alors — et seulement alors — on dit d'où ils viennent :
       ajouter la semaine partout encombrerait sans rien distinguer. */
    const combien = {};
    noms.forEach(g => {
      const l = libelleGroupe(g);
      combien[l] = (combien[l] || 0) + 1;
    });

    const t = document.createElement('div');
    t.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:5px;' +
      'line-height:1.4;';
    t.textContent = 'Groupes préparés dans la semaine — un appui remplit les ' +
      'places libres, rien n’est enregistré avant le bouton du bas :';
    zGroupes.appendChild(t);

    const r = document.createElement('div');
    r.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
    noms.forEach(g => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:auto;margin:0;padding:6px 10px;font-size:12px;';
      const lib = libelleGroupe(g);
      b.textContent = '👥 ' + lib +
        ((combien[lib] > 1 && ou[g]) ? ' · ' + ou[g] : '') +
        ' (' + parGroupe[g].length + ')';
      b.title = (ou[g] ? ou[g] + '\n' : '') + parGroupe[g].join(' · ');
      b.addEventListener('click', () => {
        const champs = [...zEleves.querySelectorAll('.seEleve')];
        const dedans = champs.map(x => normaliserMot(x.value.trim()))
                             .filter(Boolean);
        let pose = 0, sansPlace = 0;
        parGroupe[g].forEach(nom => {
          if(dedans.indexOf(normaliserMot(nom)) !== -1) return;   /* déjà là */
          const libre = champs.find(x => !x.value.trim());
          if(!libre){ sansPlace++; return; }
          libre.value = nom;
          dedans.push(normaliserMot(nom));
          pose++;
        });
        /* Ce qui n'a pas tenu se DIT : sinon on enregistre en croyant
           que le groupe entier est posé. */
        showToast(sansPlace
          ? pose + ' posé(s) — ' + sansPlace + ' sans place libre, ' +
            'augmente le nombre de places'
          : (pose ? pose + ' élève(s) posé(s) ✅' : 'Ils y sont déjà'));
      });
      r.appendChild(b);
    });
    zGroupes.appendChild(r);
  };

  champNombre.addEventListener('input', refaireChamps);
  champHeure.addEventListener('input', majHeures);
  champDuree.addEventListener('input', majHeures);
  refaireChamps();
  peindreGroupes();

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => fermerFond(fond));
  r.appendChild(bAnn);

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = sess ? '💾 Enregistrer' : '➕ Créer la session';
  /* La durée touchée se retient : elle n'est écrite nulle part, on ne
     saurait pas sinon qu'elle a changé. */
  let dureeTouchee = false;
  champDuree.addEventListener('input', () => { dureeTouchee = true; });

  bOk.addEventListener('click', () => {
    const date = boite.querySelector('#seDate').value;
    if(!date){ showToast('Indique la date de la session.'); return; }

    const v = {
      date: date,
      heureDebut: boite.querySelector('#seHeure').value,
      places: Math.max(1, Math.min(20, parseInt(champPlaces.value, 10) || 1)),
      duree: +champDuree.value || 30,
      centre: champCentre.value.trim(),
      moniteur: boite.querySelector('#seMon').value,
      boite: boite.querySelector('#seBoite').value,
      inspecteur: boite.querySelector('#seInsp').value.trim(),
      noms: [...zEleves.querySelectorAll('.seEleve')].map(x => x.value.trim()),
      dureeTouchee: dureeTouchee
    };

    /* Rien de changé : rien à attendre. */
    if(sess && !sessionAChange(sess, v)){
      fermerFond(fond);
      showToast('Rien n’a changé');
      return;
    }

    /* ⚡ DIRECT — v1162. La fenêtre se ferme à l'appui, la carte
       montre déjà la session telle qu'on vient de l'écrire ; le
       classeur confirme derrière. */
    fermerFond(fond);
    enregistrerSessionDirect(sess || null, v);
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#seDate').focus(), 100);
}


/* ============================================================
   ⚡ ENREGISTRER UNE SESSION, EN UN APPEL ET SANS ATTENDRE — v1162

   David, le 13 octobre : « quand on enregistre, c'est très long à
   la création et à la modification ». L'écran attendait le classeur
   quatre fois de suite — la session, chaque élève sur sa place, la
   fiche de chacun, la relecture — et réécrivait tous les élèves
   même pour un changement de moniteur. Il a choisi « un seul appel
   pour tout » : « sessionEnregistrer » (Apps Script v241) fait la
   session, ses places, ses élèves et leurs dates, en ne touchant
   qu'à ce qui change.

   ⚠️ ET L'ÉCRAN N'ATTEND PLUS. La carte montre tout de suite la
   session telle qu'elle vient d'être écrite, avec « ⏳
   enregistrement… ». Un refus la remet comme avant, le dit, et
   rouvre la fenêtre avec ce qui avait été tapé : rien ne se perd.
   ============================================================ */
function sessionAChange(sess, v){
  const n = normaliserMot;
  if(String(sess.date || '') !== v.date) return true;
  if(String(sess.heureDebut || '') !== String(v.heureDebut || '')) return true;
  if(n(sess.centre || '') !== n(v.centre)) return true;
  if(String(sess.moniteur || '') !== String(v.moniteur || '')) return true;
  if(String(sess.boite || '') !== String(v.boite || '')) return true;
  if(String(sess.inspecteur || '') !== String(v.inspecteur || '')) return true;
  if((sess.eleves || []).length !== v.places) return true;
  if(v.dureeTouchee && dureeSession(sess) !== v.duree) return true;
  return (sess.eleves || []).some((p, i) => n(p.eleve || '') !== n(v.noms[i] || ''));
}

/* La session telle qu'elle sera, pour la dessiner sans attendre. Une
   place qui garde son élève garde aussi ce qu'on savait d'elle
   (prévenu, dossier, remarque). */
function sessionProvisoire(sess, v){
  const avant = (sess && sess.eleves) || [];
  const eleves = [];
  for(let i = 0; i < v.places; i++){
    const nom = v.noms[i] || '';
    const p = avant[i];
    const meme = p && normaliserMot(p.eleve || '') === normaliserMot(nom);
    eleves.push(Object.assign({}, meme ? p : {}, {
      rang: i + 1, eleve: nom,
      heure: heureDuCreneau(v.heureDebut, v.duree, i) || (p && p.heure) || ''
    }));
  }
  return Object.assign({}, sess || {}, {
    id: (sess && sess.id) || ('provisoire' + Date.now()),
    date: v.date, centre: v.centre, heureDebut: v.heureDebut,
    moniteur: v.moniteur, boite: v.boite, inspecteur: v.inspecteur,
    eleves: eleves, __enCours: true
  });
}

function remplacerSessionEnMemoire(ancienne, nouvelle){
  const i = ancienne ? sessionsPermis.findIndex(x => x.id === ancienne.id) : -1;
  if(i !== -1){
    if(nouvelle) sessionsPermis[i] = nouvelle;
    else sessionsPermis.splice(i, 1);
  }else if(nouvelle){
    sessionsPermis.push(nouvelle);
  }
  sessionsPermis.sort((a, b) => {
    const j = String(a.date || '').localeCompare(String(b.date || ''));
    return j !== 0 ? j : String(a.heureDebut || '').localeCompare(String(b.heureDebut || ''));
  });
}

async function enregistrerSessionDirect(sess, v){
  const provisoire = sessionProvisoire(sess, v);
  remplacerSessionEnMemoire(sess, provisoire);
  redessinerSessions();

  let r = null;
  try{
    r = await appelPrep({
      action: 'sessionEnregistrer',
      id: sess ? sess.id : '',
      date: v.date, heureDebut: v.heureDebut, places: v.places, duree: v.duree,
      centre: v.centre, moniteur: v.moniteur, boite: v.boite,
      inspecteur: v.inspecteur,
      eleves: JSON.stringify(v.noms),
      par: ACCES.moniteur || ''
    });
    if(!r || r.status !== 'ok'){
      const m = (r && (r.message || r.error)) || 'le classeur n’a pas répondu';
      /* Un script pas encore redéployé ne connaît pas cette porte :
         on le dit avec ses mots, pas « Action inconnue ». */
      throw new Error(/inconnu/i.test(m)
        ? 'le script Google n’est pas encore à jour (v241 attendue)' : m);
    }
  }catch(e){
    remplacerSessionEnMemoire(provisoire, sess);
    redessinerSessions();
    showToast('⚠️ Session pas enregistrée : ' + ((e && e.message) || e));
    ouvrirEditeurSession(sess, v);
    return;
  }

  /* La mémoire du suivi suit, sans rien redemander : ceux qui
     arrivent — et tous, si la session a changé de jour ou de centre —
     ont leur date et ne sont plus « à planifier ». */
  const bouge = sess && (String(sess.date || '') !== v.date ||
                         normaliserMot(sess.centre || '') !== normaliserMot(v.centre));
  const aDater = (r.entrants || []).concat(bouge ? v.noms.filter(Boolean) : []);
  if(typeof etatBureau !== 'undefined' && etatBureau && etatBureau.suivi &&
     typeof trouverParNom === 'function'){
    aDater.forEach(nom => {
      const s = trouverParNom(etatBureau.suivi, nom);
      if(!s) return;
      s.datePermis = v.date;
      s.aPlanifier = '';
      if(v.centre) s.centre = v.centre;
    });
  }

  const moins = sess && v.places < (sess.eleves || []).length;
  showToast(!sess ? 'Session créée ✅'
    : (moins ? 'Session modifiée ✅ — les places occupées sont conservées'
             : 'Session modifiée ✅'));

  /* Ceux qui quittent la session — remplacés ou effacés — repassent
     par la porte unique : consignes soldées, fiche rendue à RDV
     Permis, annonce de l'annulation. */
  for(const nom of (r.sortants || [])){
    await retirerDeLaSession(nom, { date: (sess && sess.date) || v.date });
  }

  /* La vraie session, relue — par le Worker, sans attendre le
     classeur. Sans le « Lecture… » d'afficherSessionsPermis : la
     carte est déjà là, elle se met juste à jour. */
  try{
    await chargerSessionsPermis();
  }catch(e){
    /* Pas relue : on garde la provisoire, sans la marque d'attente. */
    const i = sessionsPermis.findIndex(x => x.id === provisoire.id);
    if(i !== -1) sessionsPermis[i] = Object.assign({}, provisoire, { id: r.id || provisoire.id, __enCours: false });
  }
  redessinerSessions();
}


/* L'élève dans les données du bureau, pour lire sa préparation */
/* eleveDuBureau : déclarée UNE fois, dans ec-noyau.js — voir la
   note de ec-page-eleve.js. */


/* ============================================================
   REPRISE DES DATES DÉJÀ POSÉES

   Les dates d'examen vivent à deux endroits : la fiche de suivi,
   et la note du moniteur — « Examen du permis fixé au… ». Le
   serveur ne sait lire que la première ; la reprise se fait donc
   ici, où les deux sources sont déjà en mémoire.
   ============================================================ */
async function reprendreDatesExistantes(){
  /* Les élèves du bureau, s'ils ne sont pas encore chargés */
  if(typeof chargerBureau === 'function' &&
     (!etatBureau.eleves || !etatBureau.eleves.length)){
    await chargerBureau(false);
  }

  const parJour = {};

  const ajouter = (nom, iso, s) => {
    if(!nom || !iso) return;

    /* On regroupe sur la DATE seule : un élève sans centre renseigné
       passe le même jour que les autres, il n'a pas à former une
       session à part. Le centre du premier qui l'indique vaut pour
       toute la journée. */
    const cle = iso;
    if(!parJour[cle]){
      parJour[cle] = { date: iso, centre: (s && s.centre) || '',
                       boite: (s && s.typeExamen) || '', eleves: [] };
    }
    if(!parJour[cle].centre && s && s.centre) parJour[cle].centre = s.centre;
    if(!parJour[cle].boite && s && s.typeExamen) parJour[cle].boite = s.typeExamen;
    if(parJour[cle].eleves.some(x => normaliserMot(x.eleve) === normaliserMot(nom))) return;
    parJour[cle].eleves.push({
      eleve: nom,
      heure: (s && s.heurePermis) || '',
      dossierOk: !!(s && s.toutOk === 'oui')
    });
  };

  /* Source 1 : la fiche de suivi */
  (etatBureau.suivi || []).forEach(s => {
    if(!s.datePermis) return;
    ajouter(s.eleve, dateFrVersIso(s.datePermis) || s.datePermis, s);
  });

  /* Source 2 : la note du moniteur, que le serveur ne lit pas */
  (etatBureau.eleves || []).forEach(e => {
    const a = analyserNote(e.note || '');
    if(a.permis !== 'prevu' || !a.permisDate) return;
    const s = (etatBureau.suivi || []).find(
      y => normaliserMot(y.eleve) === normaliserMot(e.eleve));
    ajouter(e.eleve, dateFrVersIso(a.permisDate) || a.permisDate, s);
  });

  const jours = Object.keys(parJour);
  if(!jours.length) return { creees: 0, places: 0 };

  /* Ce qui existe déjà, pour ne rien dupliquer */
  const dejaPlaces = {};
  (sessionsPermis || []).forEach(s => {
    s.eleves.forEach(p => { if(p.eleve) dejaPlaces[normaliserMot(p.eleve)] = true; });
  });

  let creees = 0, places = 0;

  for(const k of jours){
    const g = parJour[k];
    const aPlacer = g.eleves.filter(x => !dejaPlaces[normaliserMot(x.eleve)]);
    if(!aPlacer.length) continue;

    aPlacer.sort((a, b) => String(a.heure).localeCompare(String(b.heure)));

    /* Une session par date et centre : le serveur la crée si elle
       manque, et complète la sienne sinon. */
    /* Une session existante ce jour-là accueille les nouveaux */
    const existe = (sessionsPermis || []).find(s => s.date === g.date);

    let idS = existe ? existe.id : '';
    if(!existe){
      const r = await appelPrep({
        action: 'sessionSet', date: g.date, centre: g.centre,
        heureDebut: aPlacer[0].heure || '', places: aPlacer.length,
        duree: 30, boite: g.boite, par: ACCES.moniteur || ''
      });
      idS = r && r.id;
      creees++;
    }
    if(!idS) continue;

    /* Les places, une par élève */
    const depart = existe ? existe.eleves.length : 0;
    for(let i = 0; i < aPlacer.length; i++){
      const rang = existe ? (depart + i + 1) : (i + 1);
      if(existe){
        /* La session grandit d'une place */
        await appelPrep({ action: 'sessionSet', id: idS, date: g.date,
                          centre: g.centre, heureDebut: existe.heureDebut,
                          places: depart + i + 1, moniteur: existe.moniteur,
                          boite: existe.boite, par: ACCES.moniteur || '' });
      }
      await ecrireSurLaPlace({ idSession: idS, rang: rang,
                               eleve: aPlacer[i].eleve, heure: aPlacer[i].heure,
                               dossierOk: aPlacer[i].dossierOk ? 'oui' : '' });
      places++;
    }
  }

  return { creees: creees, places: places };
}

/* ============================================================
   LES PLACES VIDÉES — CE QU'ON SAIT, ET RIEN DE PLUS

   David : « on ne sait plus qui était sur ces places ». On le sait,
   en fait, par trois traces que le dégât n'a pas emportées — et
   l'écran les montre TOUTES LES TROIS au lieu de choisir à sa
   place :

     1. la place elle-même, qui garde son heure, son « prévenu »,
        son « dossier OK » et sa remarque ;
     2. la fiche de l'élève, qui porte toujours sa date d'examen ;
     3. le journal du classeur, avec l'heure du geste et son auteur.

   ⚠️ ON NE REMET RIEN TOUT SEUL. Un outil qui « répare » sur trois
   indices ferait un jour une deuxième catastrophe pour effacer la
   première. Ici, chaque nom se remet d'un appui, en voyant la
   preuve en face — et la place ne se donne qu'une fois : si elle a
   été redonnée entre-temps, le classeur refuse et dit à qui.
   ============================================================ */

async function ouvrirPlacesPerdues(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(640px,95vw);max-height:90vh;overflow-y:auto;';
  boite.innerHTML = '<h3>🔎 Les places vidées</h3>' +
    '<div style="font-size:12.5px;color:var(--muted);line-height:1.55;' +
      'margin-bottom:14px;">Une place qui a été donnée puis vidée garde ' +
      'ses marques : son heure, « prévenu », « dossier OK », sa remarque. ' +
      'Et la fiche de l\'élève garde sa date d\'examen. C\'est en ' +
      'rapprochant les deux qu\'on retrouve qui était là.</div>';

  const zone = document.createElement('div');
  zone.innerHTML = '<div class="empty">Lecture…</div>';
  boite.appendChild(zone);

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;margin-top:14px;';
  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary';
  bF.textContent = 'Fermer';
  const fermer = () => { try{ fermerFond(fond); }catch(e){} };
  bF.addEventListener('click', () => { fermer(); afficherSessionsPermis(); });
  r.appendChild(bF);
  boite.appendChild(r);

  fond.appendChild(boite);
  document.body.appendChild(fond);
  fond.addEventListener('click', e => {
    if(e.target === fond){ fermer(); afficherSessionsPermis(); }
  });

  const dessiner = async () => {
    let d;
    try{
      d = await appelPrep({ action: 'placesPerdues' });
    }catch(e){
      zone.innerHTML = '<div class="empty">⚠️ ' +
        String(e.message).replace(/</g, '&lt;') + '</div>';
      return;
    }

    const liste = (d && d.sessions) || [];
    zone.innerHTML = '';

    /* ⚠️ « RIEN À RÉPARER » EST UNE RÉPONSE, PAS UN ÉCRAN VIDE. */
    if(!liste.length){
      zone.innerHTML = '<div class="empty">✅ Aucune place vidée.<br>' +
        '<span style="font-size:12px;">Toutes les sessions à venir ont ' +
        'les élèves que leurs fiches annoncent.</span></div>';
      return;
    }

    liste.forEach(s => zone.appendChild(blocSessionPerdue(s, dessiner)));
  };

  await dessiner();
}


function blocSessionPerdue(s, redessiner){
  const b = document.createElement('div');
  b.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:12px 13px;margin-bottom:12px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:3px;';
  t.textContent = '🎓 ' + ((typeof libelleDate === 'function')
    ? libelleDate(s.date) : s.date) + (s.centre ? ' · ' + s.centre : '');
  b.appendChild(t);

  const st = document.createElement('div');
  st.style.cssText = 'font-size:11.5px;color:var(--muted);margin-bottom:10px;';
  st.textContent = s.libres + ' place(s) libre(s) · ' +
    s.trous.length + ' portant encore des marques';
  b.appendChild(st);

  /* ── LES ABSENTS : la trace la plus sûre des trois ── */
  if(s.absents.length){
    const h = document.createElement('div');
    h.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:6px;';
    h.textContent = 'Leur fiche dit cette date, aucune place ne les porte :';
    b.appendChild(h);

    s.absents.forEach(a => b.appendChild(ligneAbsentPerdu(s, a, redessiner)));
  }else{
    const h = document.createElement('div');
    h.style.cssText = 'font-size:12.5px;color:var(--muted);line-height:1.5;';
    h.textContent = 'Aucune fiche ne réclame cette session : les places ' +
      'vidées ci-dessous ont sans doute été libérées volontairement.';
    b.appendChild(h);
  }

  /* ── LES PLACES QUI GARDENT LEURS MARQUES ── */
  if(s.trous.length){
    const h = document.createElement('div');
    h.style.cssText = 'font-size:12px;color:var(--muted);margin:12px 0 6px;';
    h.textContent = 'Places vides qui portent encore des marques :';
    b.appendChild(h);

    s.trous.forEach(x => {
      const l = document.createElement('div');
      l.style.cssText = 'font-size:12.5px;line-height:1.5;padding:4px 0;' +
        'color:var(--muted);';
      l.textContent = '· place ' + x.rang + (x.heure ? ' à ' + x.heure : '') +
        ' — ' + x.marques;
      b.appendChild(l);
    });
  }

  /* ── LA PREUVE DATÉE ── */
  if(s.preuves && s.preuves.length){
    const det = document.createElement('details');
    det.style.cssText = 'margin-top:10px;font-size:12px;';
    const som = document.createElement('summary');
    som.style.cssText = 'cursor:pointer;color:var(--muted);';
    som.textContent = '📜 ' + s.preuves.length +
      ' ligne(s) du journal pour cette date';
    det.appendChild(som);

    s.preuves.forEach(p => {
      const l = document.createElement('div');
      l.style.cssText = 'padding:4px 0 4px 10px;line-height:1.5;' +
        'color:var(--muted);';
      l.textContent = p.quand + ' · ' + (p.par || '?') + ' · ' +
        (p.eleve || '') + ' — ' + p.detail;
      det.appendChild(l);
    });
    b.appendChild(det);
  }

  return b;
}


/* Une ligne d'absent, avec le bouton qui le remet — sur la place
   qu'on choisit, jamais sur une place devinée. */
function ligneAbsentPerdu(s, a, redessiner){
  const l = document.createElement('div');
  l.style.cssText = 'display:flex;gap:8px;align-items:center;' +
    'border:1px solid var(--line);border-radius:9px;padding:8px 10px;' +
    'margin-bottom:6px;';

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:13px;line-height:1.45;';
  t.innerHTML = '<strong>' + String(a.eleve).replace(/</g, '&lt;') +
    '</strong><div style="font-size:11.5px;color:var(--muted);">' +
    'sa fiche : ' + String(a.dateEcrite || '').replace(/</g, '&lt;') +
    (a.centre ? ' · ' + String(a.centre).replace(/</g, '&lt;') : '') +
    '</div>';
  l.appendChild(t);

  const bt = document.createElement('button');
  bt.className = 'btn btn-primary';
  bt.style.cssText = 'width:auto;padding:8px 11px;font-size:12.5px;margin:0;' +
    'flex-shrink:0;';
  bt.textContent = '↩️ Le remettre';
  bt.addEventListener('click', async () => {
    /* ⚠️ LA PLACE SE CHOISIT. On sait qu'il était sur CETTE session ;
       on ne sait pas sur quel rang. Deviner reviendrait à inventer,
       et c'est exactement ce qui a fait le dégât. */
    const rang = await choisirPlaceLibre(s, a.eleve);
    if(!rang) return;

    bt.disabled = true;
    bt.textContent = '…';
    try{
      const r = await appelPrep({ action: 'placeRemettre',
                                  idSession: s.id, rang: rang,
                                  eleve: a.eleve });
      if(!r || r.status !== 'ok'){
        showToast((r && r.message) || 'Impossible.');
        bt.disabled = false;
        bt.textContent = '↩️ Le remettre';
        return;
      }
      showToast(a.eleve + ' remis en place ' + rang + ' ✅');
      sessionsPermis = [];          /* relu au prochain besoin */
      await redessiner();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bt.disabled = false;
      bt.textContent = '↩️ Le remettre';
    }
  });
  l.appendChild(bt);

  return l;
}


/* Les places libres de cette session, à choisir. Celles qui portent
   encore des marques sont proposées en premier : ce sont elles qui
   ont été vidées. */
async function choisirPlaceLibre(s, eleve){
  const trous = s.trous || [];
  if(!trous.length){
    showToast('Aucune place vidée sur cette session — ' +
              'donne-lui une place depuis la session elle-même');
    return 0;
  }

  if(trous.length === 1){
    const x = trous[0];
    return await confirmer(
      'Remettre ' + eleve + ' sur la place ' + x.rang +
      (x.heure ? ' de ' + x.heure : '') + ' ?\n\n' +
      'Cette place porte encore : ' + x.marques,
      'Le remettre') ? x.rang : 0;
  }

  return await demanderPlacePerdue(s, eleve, trous);
}


/* Plusieurs places vidées : on les montre avec leurs marques, et
   c'est David qui reconnaît la sienne. */
function demanderPlacePerdue(s, eleve, trous){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(480px,94vw);max-height:85vh;overflow-y:auto;';
    boite.innerHTML = '<h3>Quelle place pour ' +
      String(eleve).replace(/</g, '&lt;') + ' ?</h3>' +
      '<div style="font-size:12.5px;color:var(--muted);line-height:1.55;' +
        'margin-bottom:12px;">Ces places ont été vidées. Ce qu\'elles ' +
        'portent encore devrait te dire laquelle était la sienne.</div>';

    let repondu = false;
    const finir = v => {
      if(repondu) return;
      repondu = true;
      try{ fermerFond(fond); }catch(e){}
      resolve(v);
    };

    trous.forEach(x => {
      const bt = document.createElement('button');
      bt.className = 'btn btn-secondary';
      bt.style.cssText = 'text-align:left;padding:10px 12px;font-size:13px;' +
        'margin-bottom:7px;line-height:1.5;';
      bt.innerHTML = '<strong>Place ' + x.rang +
        (x.heure ? ' · ' + String(x.heure).replace(/</g, '&lt;') : '') +
        '</strong><div style="font-size:11.5px;color:var(--muted);">' +
        String(x.marques).replace(/</g, '&lt;') + '</div>';
      bt.addEventListener('click', () => finir(x.rang));
      boite.appendChild(bt);
    });

    const ann = document.createElement('button');
    ann.className = 'btn btn-secondary';
    ann.style.cssText = 'margin-top:8px;';
    ann.textContent = 'Annuler';
    ann.addEventListener('click', () => finir(0));
    boite.appendChild(ann);

    fond.appendChild(boite);
    document.body.appendChild(fond);
    fond.addEventListener('click', e => { if(e.target === fond) finir(0); });
  });
}


/* ============================================================
   📅 LES RÉSERVATIONS SUR LE PLANNING — v1544

   David, le 21 novembre, sur la case « Réservations posées sur le
   planning » de la fiche d'une place : « est-ce qu'il n'y a pas moyen
   de faire autre chose de plus visible ? Sous Tout est planifié, une
   case réservation faite ou à faire ; quand le planning est validé,
   cette ligne disparaît puisque c'est posé sur le planning ». Puis, sur
   le schéma : trois choix — « il pose lui-même ses heures », « à
   faire », « faite » (pas « à valider » : on les fait avec l'élève, et
   c'est à payer) ; au lieu d'écrire les dates, un calendrier et les
   créneaux classiques 8h-10h … 17h-19h et « autres » ; poser un créneau
   la fait passer en « faite ». Un calendrier ORANGE dit « réservations
   faites » partout où 📆 disait « à planifier ».

   · resaEtat (colonne 123 du suivi) — '' · eleve · afaire · faite.
     Vide = l'ancienne règle : une réservation écrite vaut « faite »,
     rien d'écrit vaut « à faire » (son choix).
   · reservations (la colonne d'avant) garde le TEXTE, « Jeudi 10/12
     13h-15h · Mercredi 17/12 15h-17h » : tout ce qui le lisait le lit
     toujours. Le calendrier le relit pour retrouver ses créneaux ; ce
     qu'il ne sait pas lire reste en « Noté à la main ».
   · « 📆 Tout est planifié » coché : plus rien ne s'affiche, ni ici ni
     dans les listes — c'est posé sur le planning.
   ============================================================ */
const RESA_CRENEAUX = [['08:00', '10:00'], ['10:00', '12:00'], ['13:00', '15:00'], ['15:00', '17:00'], ['17:00', '19:00']];
const RESA_ORANGE = '#E8A33D';
const RESA_ORANGE_TEXTE = 'var(--resa-orange-t, #A35F0B)';
const RESA_BLEU = '#3B82C4';
const RESA_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
/* Le repère texte des réservations faites (là où il faut du texte : les
   messages à copier) ; à l'écran, calendrierOrangeDans() le dessine. */
const MARQUE_RESA_FAITE = '🗓️';

function calendrierOrangeSvg(t){
  t = t || 15;
  return '<svg class="resaCal" viewBox="0 0 24 24" width="' + t + '" height="' + t + '" style="vertical-align:-2px;flex-shrink:0" role="img" aria-label="Réservations faites">' +
    '<rect x="3" y="5" width="18" height="16" rx="3" fill="rgba(232,163,61,.18)" stroke="' + RESA_ORANGE + '" stroke-width="2"/>' +
    '<path d="M3 10h18" stroke="' + RESA_ORANGE + '" stroke-width="2"/><path d="M8 3v4M16 3v4" stroke="' + RESA_ORANGE + '" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M8.5 15.2l2.3 2.2 4.7-4.6" fill="none" stroke="' + RESA_ORANGE + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
/* Dans un élément déjà rempli de TEXTE (textContent) : le repère devient
   le calendrier orange. Le HTML de départ est échappé par le navigateur :
   on ne remplace que le repère. */
function calendrierOrangeDans(el){
  if(!el || String(el.textContent || '').indexOf('🗓') === -1) return el;
  el.innerHTML = el.innerHTML.replace(/🗓️?/g, calendrierOrangeSvg(15));
  return el;
}
/* L'état des réservations d'une fiche de suivi : '' quand tout est
   planifié (rien à montrer), sinon eleve · afaire · faite */
function etatResaPermis(s){
  s = s || {};
  if(s.toutPlanifie === 'oui') return '';
  const e = String(s.resaEtat || '');
  if(e === 'eleve' || e === 'afaire' || e === 'faite') return e;
  const v = String(s.reservations || '').trim();
  if(!v || /à faire|a faire|^non$|pas encore|à poser|a poser|manque/i.test(v)) return 'afaire';
  return 'faite';
}
const resaH = h => { const m = String(h || '').match(/^(\d{1,2}):(\d{2})$/); return m ? Number(m[1]) + 'h' + (m[2] === '00' ? '' : m[2]) : String(h || ''); };
function resaTexte(r){
  const d = new Date(r.jour + 'T12:00:00');
  const j = RESA_JOURS[d.getDay()] || '';
  return j.charAt(0).toUpperCase() + j.slice(1) + ' ' + r.jour.slice(8, 10) + '/' + r.jour.slice(5, 7) + ' ' + resaH(r.debut) + '-' + resaH(r.fin);
}
/* Le texte d'avant relu : les « 10/12 13h-15h » deviennent des créneaux
   (l'année : celle qui met la date le plus près du permis, ou
   d'aujourd'hui), le reste reste écrit. */
function resaLire(texte, reperIso){
  const liste = [];
  const auj = new Date().toISOString().slice(0, 10);
  const ref = /^\d{4}-\d{2}-\d{2}$/.test(String(reperIso || '')) ? reperIso : auj;
  const h2 = (h, m) => String(h).padStart(2, '0') + ':' + String(m || '00').padStart(2, '0');
  /* ⚠️ v1545 — « 15 h 17 », « 8h 10 h », « 13h -15h » : l'heure de fin
     n'a pas toujours son « h », et des minutes ne s'écrivent que collées
     (« 15h30 ») — sinon « 15 h 17 » se lisait 15h17. */
  const re = /(?:(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\.?\s+)?(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\s*(?:de\s*)?(\d{1,2})\s*h(\d{2})?\s*(?:-|à|a\b)?\s*(\d{1,2})(?:\s*h(\d{2})?)?(?!\s*\/)/gi;
  const reste = String(texte || '').replace(re, (tout, j, m, hd, md, hf, mf) => {
    const an0 = Number(ref.slice(0, 4));
    const choix = [an0 - 1, an0, an0 + 1].map(a => a + '-' + String(m).padStart(2, '0') + '-' + String(j).padStart(2, '0'))
      .filter(x => !isNaN(new Date(x + 'T12:00:00').getTime()))
      .sort((x, y) => Math.abs(new Date(x) - new Date(ref)) - Math.abs(new Date(y) - new Date(ref)));
    if(!choix.length) return tout;
    liste.push({ jour: choix[0], debut: h2(hd, md), fin: h2(hf, mf) });
    return ' ';
  }).replace(/[·,;+\s]+/g, ' ').replace(/^\s*(et\s*)?|\s*(et\s*)?$/gi, '').trim();
  liste.sort((x, y) => (x.jour + x.debut).localeCompare(y.jour + y.debut));
  return { liste: liste, reste: reste };
}

/* Le bloc de la fiche. o : { etat, texte, datePermis (AAAA-MM-JJ) }.
   bloc.valeurs() → { resaEtat, reservations } à enregistrer. */
function blocReservationsPermis(o){
  o = o || {};
  const lu = resaLire(o.texte, o.datePermis);
  const S = { etat: o.etat || 'afaire', liste: lu.liste, reste: lu.reste, jour: '', autre: false,
              mois: ((o.datePermis && o.datePermis >= new Date().toISOString().slice(0, 10)) ? new Date().toISOString() : (o.datePermis || new Date().toISOString())).slice(0, 7) };
  /* le mois de départ : le premier créneau posé, sinon ce mois-ci */
  if(S.liste.length) S.mois = S.liste[0].jour.slice(0, 7);
  const bloc = document.createElement('div');
  bloc.className = 'resaBloc';
  const ech = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const dessiner = () => {
    const faite = S.etat === 'faite', eleve = S.etat === 'eleve';
    const coul = faite ? RESA_ORANGE : eleve ? RESA_BLEU : 'var(--warn-text)';
    bloc.dataset.etat = S.etat;
    bloc.style.cssText = 'border:2px solid ' + coul + ';border-radius:12px;padding:10px 12px;margin:2px 0 14px;background:' +
      (faite ? 'rgba(232,163,61,.10)' : eleve ? 'rgba(59,130,196,.08)' : 'rgba(200,60,40,.06)') + ';';
    const bt = (cle, txt, c) => '<button type="button" data-etat="' + cle + '" class="btn btn-secondary" aria-pressed="' + (S.etat === cle) + '" ' +
      'style="flex:1;min-width:0;margin:0;padding:9px 6px;font-size:13.5px;' +
      (S.etat === cle ? 'background:' + c + ';border-color:' + c + ';color:#fff;font-weight:800;' : '') + '">' + txt + '</button>';
    let h = '<div class="resaTitre" style="font-size:14px;font-weight:800;color:' + (faite ? RESA_ORANGE_TEXTE : coul) + ';">' +
        (faite ? calendrierOrangeSvg(18) : eleve ? '🙋' : '📆') + ' Réservations sur le planning</div>' +
      '<div style="display:flex;gap:6px;margin:8px 0;">' +
        bt('eleve', '🙋 Il les pose lui-même', RESA_BLEU) + bt('afaire', '⏳ À faire', 'var(--warn-text)') + bt('faite', '✅ Faite', RESA_ORANGE) + '</div>';
    if(eleve){
      h += '<div style="font-size:13px;color:var(--resa-bleu-t, #2D6A9F);line-height:1.5;">Il réserve ses heures lui-même dans Drivup. Rien à poser par le bureau.</div>';
      bloc.innerHTML = h;
      return;
    }
    h += '<div class="resaListe" style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px;">' +
      (S.liste.length ? S.liste.map((r, i) => '<span class="resaPuce" style="display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:800;padding:5px 6px 5px 10px;border-radius:9px;' +
        'background:var(--navy-deep);border:1px solid ' + RESA_ORANGE + ';color:' + RESA_ORANGE_TEXTE + ';">' + calendrierOrangeSvg(14) + ' ' + ech(resaTexte(r)) +
        '<button type="button" data-ote="' + i + '" aria-label="Retirer ' + ech(resaTexte(r)) + '" style="width:auto;min-height:0;margin:0;padding:0 6px;border:0;background:none;color:var(--muted);font-size:15px;cursor:pointer;">✕</button></span>').join('')
        : '<span style="font-size:13px;color:var(--muted);">Aucune réservation : touche un jour du calendrier.</span>') + '</div>';
    if(S.reste){
      h += '<label style="display:block;font-size:12px;color:var(--muted);margin:0 0 4px;">✏️ Noté à la main</label>' +
        '<input type="text" class="resaReste" value="' + ech(S.reste) + '" style="margin:0 0 8px;">';
    }
    /* le calendrier du mois */
    const [a, m] = S.mois.split('-').map(Number);
    const premier = new Date(a, m - 1, 1), nbJ = new Date(a, m, 0).getDate();
    const decal = (premier.getDay() + 6) % 7;
    const auj = new Date().toISOString().slice(0, 10);
    const nomMois = premier.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    h += '<div class="resaCalendrier" style="background:var(--navy-deep);border:1px solid var(--line);border-radius:12px;padding:8px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
        '<button type="button" data-mois="-1" class="btn btn-secondary" aria-label="Mois d’avant" style="width:auto;min-height:0;margin:0;padding:4px 10px;">◀</button>' +
        '<b style="font-size:14px;text-transform:capitalize;">' + ech(nomMois) + '</b>' +
        '<button type="button" data-mois="1" class="btn btn-secondary" aria-label="Mois d’après" style="width:auto;min-height:0;margin:0;padding:4px 10px;">▶</button></div>' +
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center;font-size:11px;color:var(--muted);font-weight:700;">' +
        ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => '<div>' + x + '</div>').join('') + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-top:3px;">';
    for(let i = 0; i < decal; i++) h += '<div></div>';
    for(let d = 1; d <= nbJ; d++){
      const iso = S.mois + '-' + String(d).padStart(2, '0');
      const passe = iso < auj, choisi = S.jour === iso, pris = S.liste.some(r => r.jour === iso), permis = iso === o.datePermis;
      /* le dimanche est grisé, mais on peut y poser une leçon (David) */
      const dim = new Date(a, m - 1, d).getDay() === 0;
      h += '<button type="button" data-jour="' + iso + '" ' + (passe ? 'disabled ' : '') +
        'style="margin:0;padding:6px 0;width:100%;min-height:0;border-radius:8px;font-size:13px;font-weight:700;cursor:' + (passe ? 'default' : 'pointer') + ';position:relative;' +
        (choisi ? 'background:' + RESA_ORANGE + ';color:#fff;border:1px solid ' + RESA_ORANGE + ';'
          : permis ? 'background:rgba(132,204,22,.18);border:1px solid var(--accent);color:var(--accent-text);'
          : pris ? 'background:rgba(232,163,61,.16);border:1px solid ' + RESA_ORANGE + ';color:' + RESA_ORANGE_TEXTE + ';'
          : 'background:transparent;border:1px solid transparent;color:inherit;' + (passe ? 'opacity:.3;' : dim ? 'opacity:.45;' : '')) +
        '"' + (permis ? ' title="Jour du permis"' : '') + '>' + d + (permis ? '<span style="position:absolute;top:-3px;right:0;font-size:10px;">🏁</span>' : '') + '</button>';
    }
    h += '</div>';
    if(S.jour){
      h += '<div class="resaCreneaux" style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);">' +
        '<div style="font-size:13px;font-weight:800;margin-bottom:6px;">' + ech(resaTexte({ jour: S.jour, debut: '', fin: '' }).replace(/\s+-$/, '').trim()) + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
        RESA_CRENEAUX.map(([d, f]) => {
          const on = S.liste.some(r => r.jour === S.jour && r.debut === d && r.fin === f);
          return '<button type="button" data-cr="' + d + '|' + f + '" class="btn btn-secondary" aria-pressed="' + on + '" style="width:auto;min-height:0;margin:0;padding:7px 11px;font-size:13.5px;font-weight:800;' +
            (on ? 'background:' + RESA_ORANGE + ';border-color:' + RESA_ORANGE + ';color:#fff;' : '') + '">' + (on ? '✓ ' : '') + resaH(d) + '-' + resaH(f) + '</button>';
        }).join('') +
        '<button type="button" data-autre="1" class="btn btn-secondary" style="width:auto;min-height:0;margin:0;padding:7px 11px;font-size:13.5px;">✏️ Autre</button>' +
        '</div>' +
        (S.autre ? '<div class="resaAutre" style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap;">' +
          '<span style="font-size:13px;">De</span><input type="text" class="resaDe" inputmode="numeric" placeholder="9h" style="width:80px;margin:0;">' +
          '<span style="font-size:13px;">à</span><input type="text" class="resaA" inputmode="numeric" placeholder="11h" style="width:80px;margin:0;">' +
          '<button type="button" data-ajout="1" class="btn btn-primary" style="width:auto;min-height:0;margin:0;padding:7px 12px;">Ajouter</button></div>' : '') +
        '</div>';
    }
    h += '</div>';
    bloc.innerHTML = h;
  };
  const lireHeure = t => {
    const m = String(t || '').trim().match(/^(\d{1,2})\s*(?:[h:]\s*(\d{2})?)?$/i);
    if(!m || Number(m[1]) > 23 || Number(m[2] || 0) > 59) return '';
    return String(m[1]).padStart(2, '0') + ':' + String(m[2] || '00').padStart(2, '0');
  };
  const poser = (d, f) => {
    const i = S.liste.findIndex(r => r.jour === S.jour && r.debut === d && r.fin === f);
    if(i === -1) S.liste.push({ jour: S.jour, debut: d, fin: f }); else S.liste.splice(i, 1);
    S.liste.sort((x, y) => (x.jour + x.debut).localeCompare(y.jour + y.debut));
    if(S.liste.length) S.etat = 'faite';
    else if(S.etat === 'faite' && !S.reste) S.etat = 'afaire';
  };
  bloc.addEventListener('input', ev => { if(ev.target.classList.contains('resaReste')) S.reste = ev.target.value; });
  bloc.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if(!b || !bloc.contains(b)) return;
    ev.preventDefault();
    if(b.dataset.etat) S.etat = b.dataset.etat;
    else if(b.dataset.mois){ const [a, m] = S.mois.split('-').map(Number); const d = new Date(a, m - 1 + Number(b.dataset.mois), 1); S.mois = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
    else if(b.dataset.jour){ S.jour = S.jour === b.dataset.jour ? '' : b.dataset.jour; S.autre = false; }
    else if(b.dataset.cr){ const [d, f] = b.dataset.cr.split('|'); poser(d, f); }
    else if(b.dataset.autre) S.autre = !S.autre;
    else if(b.dataset.ajout){
      const d = lireHeure(bloc.querySelector('.resaDe').value), f = lireHeure(bloc.querySelector('.resaA').value);
      if(!d || !f || f <= d){ if(typeof showToast === 'function') showToast('Écris deux heures, par exemple 9h et 11h.'); return; }
      if(!S.liste.some(r => r.jour === S.jour && r.debut === d && r.fin === f)) poser(d, f);
      S.autre = false;
    }
    else if(b.dataset.ote !== undefined){
      S.liste.splice(Number(b.dataset.ote), 1);
      if(!S.liste.length && S.etat === 'faite' && !String(S.reste || '').trim()) S.etat = 'afaire';
    }
    else return;
    dessiner();
  });
  dessiner();
  bloc.valeurs = () => ({
    resaEtat: S.etat,
    reservations: S.liste.map(resaTexte).concat(String(S.reste || '').trim() ? [String(S.reste).trim()] : []).join(' · ')
  });
  return bloc;
}
/* La ligne sous le nom, dans les listes (session dépliée) */
function etiquetteResaPermis(s, bilan){
  const e = etatResaPermis(s);
  if(!e) return '';
  /* 📅 v1547 — avec Drivup lu (bilan) : les réservations déjà posées sur
     son planning passent dans « Posées » ; « ⏳ à faire » laisse la place
     à « À réserver : … » quand ses heures sont connues. Les passées ne
     s'affichent plus, nulle part. */
  const parDrivup = !!(bilan && bilan.connu && !bilan.jourJ);
  /* ⚠️ v1545 — UNE LIGNE COMME LES AUTRES. David, le 21/11, capture à
     l'appui : « c'est trop gros les réservations ». Plus de cadre : la
     taille et la graisse de « 💶 Il doit de l'argent » juste au-dessus,
     et les dates en court (« ven. 11/12 15h-17h »). */
  const base = 'display:flex;align-items:flex-start;gap:5px;margin-top:2px;font-size:12px;font-weight:700;line-height:1.45;';
  const ech = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  if(e === 'eleve') return '<div class="resaEtiq" style="' + base + 'color:var(--resa-bleu-t, #2D6A9F);">🙋 Il pose lui-même ses heures</div>';
  if(e === 'faite'){
    const lu = resaLire(s.reservations || '', isoDuPermis(s.datePermis));
    const auj = (typeof aujParisEC === 'function') ? aujParisEC() : new Date().toISOString().slice(0, 10);
    const liste = bilan ? bilan.resas : lu.liste.filter(r => r.jour >= auj);
    const montre = bilan && typeof creneauPermisTexte === 'function' ? creneauPermisTexte : resaTexteCourt;
    /* toutes passées ou posées : plus rien d'orange à dire */
    if(!liste.length && !lu.reste && lu.liste.length) return '';
    const court = liste.map(montre).concat(lu.reste ? [lu.reste] : []).join(' · ');
    return '<div class="resaEtiq" style="' + base + 'color:' + RESA_ORANGE_TEXTE + ';">' +
      calendrierOrangeSvg(13).replace('vertical-align:-2px', 'margin-top:2px') + '<span>' + (bilan ? 'Réservées, à payer' : 'Réservations faites') +
      (court ? ' · <span style="font-weight:600;">' + ech(court) + '</span>' : '') + '</span></div>';
  }
  if(parDrivup) return '';
  return '<div class="resaEtiq" style="' + base + 'color:var(--warn-text);">⏳ Réservations à faire</div>';
}
/* « ven. 11/12 15h-17h » */
function resaTexteCourt(r){
  const d = new Date(r.jour + 'T12:00:00');
  const j = (RESA_JOURS[d.getDay()] || '').slice(0, 3);
  return j + '. ' + r.jour.slice(8, 10) + '/' + r.jour.slice(5, 7) + ' ' + resaH(r.debut) + '-' + resaH(r.fin);
}
/* ============================================================
   📅 LES « RESAP » À VALIDER — v1546

   David, le 21/11 : les rendez-vous perso « Resap + nom de l'élève » de
   Drivup sont les réservations avant permis (leur jour et leur heure SONT
   le créneau). « Parfois le nom ou le prénom n'est pas bien écrit quand on
   écrit vite ; au début il ne faut pas que ça se mette tout seul : on voit
   la liste et on valide élève par élève dans l'App. » Ses choix : en haut
   de 🎓 Suivi permis (et une ligne dans le bandeau) ; un Resap validé puis
   retiré de Drivup se valide aussi ; « poser tout seul quand le nom est
   sûr », un interrupteur éteint au départ.
   ============================================================ */
let resapEC = { lignes: [], auto: false, lu: 0 };
async function chargerResapEC(forcer){
  if(typeof aDroit === 'function' && !aDroit('bureau_permis')) return resapEC;
  if(!forcer && resapEC.lu && Date.now() - resapEC.lu < 120000) return resapEC;
  const d = await appelPrep({ action: 'drivupResapListe' });
  if(d && d.status === 'ok') resapEC = { lignes: d.lignes || [], auto: !!d.auto, lu: Date.now() };
  try{ if(typeof dessinerBandeau === 'function') dessinerBandeau(); }catch(e){}
  const z = document.getElementById('sesResap');
  if(z && z.isConnected) dessinerResapEC(z);
  return resapEC;
}
function nomDuResap(titre){ return String(titre || '').replace(/^\s*resap\b\s*[:\-–—.]?\s*/i, '').trim(); }
function distanceResap(a, b){
  const m = a.length, n = b.length;
  if(!m) return n; if(!n) return m;
  let p = Array.from({ length: n + 1 }, (_, j) => j);
  for(let i = 1; i <= m; i++){
    const c = [i];
    for(let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[n];
}
/* La fiche du nom tapé dans Drivup : exacte (« sûr »), sinon la plus proche
   (une faute de frappe, un prénom écourté), sinon rien */
function ficheDuResap(nomTape){
  const fiches = (typeof fichesEleves !== 'undefined' && fichesEleves) || [];
  if(!String(nomTape || '').trim() || !fiches.length) return { eleve: '', sur: false };
  const exacte = (typeof ficheDeLEleveDrivup === 'function') ? ficheDeLEleveDrivup({ complet: nomTape }) : null;
  if(exacte) return { eleve: exacte.eleve, sur: true };
  const plat = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  const t = plat(nomTape);
  if(!t.length) return { eleve: '', sur: false };
  let mieux = null, haut = 0, second = 0;
  fiches.forEach(f => {
    const g = plat(f.eleve);
    if(!g.length) return;
    let s = 0;
    t.forEach(x => { let b = 0; g.forEach(y => { const r = 1 - distanceResap(x, y) / Math.max(x.length, y.length); if(r > b) b = r; }); s += b; });
    s = s / t.length - Math.abs(g.length - t.length) * 0.04;
    if(typeof suiviDe === 'function' && (suiviDe(f.eleve) || {}).eleve) s += 0.05;
    if(s > haut){ second = haut; haut = s; mieux = f; } else if(s > second) second = s;
  });
  return (mieux && haut >= 0.62) ? { eleve: mieux.eleve, sur: false, proche: true } : { eleve: '', sur: false };
}
const resapCle = r => r.jour + '|' + r.debut + '|' + r.fin;
/* Les décisions à prendre, par élève */
function groupesResapEC(){
  const g = {};
  (resapEC.lignes || []).forEach(r => {
    const retirer = r.etat === 'pose' && Number(r.disparu);
    const base = retirer || r.eleve ? (r.eleve || nomDuResap(r.titre)) : nomDuResap(r.titre);
    const cle = (retirer ? 'r:' : 'p:') + (typeof cleNomDrivup === 'function' ? cleNomDrivup(base) : base.toLowerCase());
    if(!g[cle]){
      const f = (retirer || r.eleve) ? { eleve: r.eleve, sur: true } : ficheDuResap(nomDuResap(r.titre));
      g[cle] = { cle: cle, sorte: retirer ? 'retirer' : 'poser', tape: nomDuResap(r.titre), eleve: f.eleve, sur: !!f.sur, proche: !!f.proche, lignes: [] };
    }
    g[cle].lignes.push(r);
  });
  return Object.values(g);
}
/* La fiche de suivi change : des créneaux en plus, d'autres en moins */
async function appliquerResapFiche(nom, ajouts, retraits){
  const s = suiviDe(nom) || {};
  const lu = resaLire(s.reservations || '', isoDuPermis(s.datePermis));
  const enMoins = new Set(retraits || []);
  const liste = lu.liste.filter(r => !enMoins.has(resapCle(r)));
  (ajouts || []).forEach(r => { if(!liste.some(x => resapCle(x) === resapCle(r))) liste.push({ jour: r.jour, debut: r.debut, fin: r.fin }); });
  liste.sort((x, y) => (x.jour + x.debut).localeCompare(y.jour + y.debut));
  let etat = String(s.resaEtat || '');
  if(liste.length) etat = 'faite';
  else if(!lu.reste && (etat === 'faite' || !etat)) etat = 'afaire';
  await majSuivi(nom, { reservations: liste.map(resaTexte).concat(lu.reste ? [lu.reste] : []).join(' · '), resaEtat: etat });
}
async function deciderResapEC(groupe, decision, nom){
  const ids = groupe.lignes.map(r => r.id);
  if(decision === 'pose'){
    const fiche = ((typeof fichesEleves !== 'undefined' && fichesEleves) || []).find(f => f.eleve === nom);
    if(!fiche) throw new Error('« ' + nom + ' » n’est pas une fiche : choisis l’élève dans la liste.');
    if((suiviDe(nom) || {}).toutPlanifie === 'oui') throw new Error(nom + ' : « Tout est planifié » est coché — décoche-le d’abord.');
    /* déplacé dans Drivup : l'ancien créneau s'en va, le nouveau arrive */
    await appliquerResapFiche(nom, groupe.lignes, groupe.lignes.map(r => r.pose).filter(Boolean));
  }else if(decision === 'retire'){
    await appliquerResapFiche(groupe.eleve, [], groupe.lignes.map(r => r.pose || resapCle(r)));
  }
  const d = await appelPrep({ action: 'drivupResapDecider', ids: ids, decision: decision, eleve: nom || groupe.eleve || '' });
  if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'Décision non enregistrée.');
  /* le Worker note lui-même la décision dans « 🔔 Du nouveau dans Drivup » */
  resapEC = { lignes: d.lignes || [], auto: !!d.auto, lu: Date.now() };
}
/* « Poser tout seul quand le nom est sûr » : sur le poste qui lit Drivup */
async function resapAutoEC(){
  await chargerResapEC(true);
  if(!resapEC.auto) return 0;
  let n = 0;
  for(const g of groupesResapEC()){
    if(g.sorte !== 'poser' || !g.sur || !g.eleve) continue;
    const s = suiviDe(g.eleve) || {};
    if(!s.eleve || s.toutPlanifie === 'oui') continue;
    try{ await deciderResapEC(g, 'pose', g.eleve); n += g.lignes.length; }catch(e){ /* reste à valider à la main */ }
  }
  if(n){
    const z = document.getElementById('sesResap');
    if(z && z.isConnected) dessinerResapEC(z);
    try{ if(typeof dessinerBandeau === 'function') dessinerBandeau(); }catch(e){}
  }
  return n;
}
let resapReplie = false;
try{ resapReplie = localStorage.getItem('ec_resap_replie') === '1'; }catch(e){}
function dessinerResapEC(z){
  const groupes = groupesResapEC();
  z.innerHTML = '';
  if(!groupes.length && !resapEC.auto){ z.style.display = 'none'; return; }
  z.style.display = '';
  const ech = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const n = groupes.reduce((a, g) => a + g.lignes.length, 0);
  const cadre = document.createElement('div');
  cadre.className = 'resapCadre';
  cadre.style.cssText = 'border:2px solid ' + RESA_ORANGE + ';border-radius:12px;background:rgba(232,163,61,.08);margin:0 0 12px;';
  const tete = document.createElement('button');
  tete.type = 'button';
  tete.className = 'resapTete';
  tete.setAttribute('aria-expanded', resapReplie ? 'false' : 'true');
  tete.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%;margin:0;padding:10px 12px;border:0;background:none;color:inherit;font:inherit;cursor:pointer;text-align:left;min-height:0;';
  tete.innerHTML = calendrierOrangeSvg(18) + '<b style="flex:1;font-size:14px;color:' + RESA_ORANGE_TEXTE + ';">' +
    (n ? n + ' Resap à valider' : 'Resap de Drivup : rien à valider') + '</b>' +
    '<span style="font-size:12px;color:var(--muted);">' + (resapReplie ? '▸' : '▾') + '</span>';
  tete.addEventListener('click', () => {
    resapReplie = !resapReplie;
    try{ localStorage.setItem('ec_resap_replie', resapReplie ? '1' : '0'); }catch(e){}
    dessinerResapEC(z);
  });
  cadre.appendChild(tete);
  z.appendChild(cadre);
  if(resapReplie) return;
  const corps = document.createElement('div');
  corps.style.cssText = 'padding:0 12px 10px;display:flex;flex-direction:column;gap:8px;';
  cadre.appendChild(corps);
  groupes.forEach(g => {
    const b = document.createElement('div');
    b.className = 'resapGroupe';
    b.dataset.cle = g.cle;
    b.style.cssText = 'background:var(--navy);border:1px solid var(--line);border-radius:10px;padding:9px 10px;';
    const creneaux = g.lignes.map(r => {
      const neuf = resaTexteCourt(r);
      if(g.sorte === 'poser' && r.pose){
        const [j, d, f] = String(r.pose).split('|');
        /* le même jour : l'heure seule change */
        const avant = j === r.jour ? resaH(d) + '-' + resaH(f) : resaTexteCourt({ jour: j, debut: d, fin: f });
        const apres = j === r.jour ? resaH(r.debut) + '-' + resaH(r.fin) : neuf;
        return '<span style="white-space:nowrap;">' + ech(j === r.jour ? resaTexteCourt(r).replace(/ \S+$/, '') + ' ' : '') +
          '<s style="opacity:.7;">' + ech(avant) + '</s> → <b>' + ech(apres) + '</b></span>';
      }
      return '<span style="white-space:nowrap;">' + ech(neuf) + '</span>';
    }).join(' · ');
    if(g.sorte === 'retirer'){
      b.innerHTML = '<div style="font-size:13px;line-height:1.5;"><b>' + ech(g.eleve) + '</b> · <span style="color:var(--warn-text);font-weight:700;">retiré de Drivup</span> : ' + creneaux + '</div>' +
        '<div class="resapBoutons" style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap;">' +
        '<button type="button" data-d="retire" class="btn btn-secondary" style="width:auto;min-height:0;margin:0;padding:7px 12px;font-size:13px;">➖ Retirer de la fiche</button>' +
        '<button type="button" data-d="garde" class="btn btn-secondary" style="width:auto;min-height:0;margin:0;padding:7px 12px;font-size:13px;">Garder</button></div>';
    }else{
      const deplace = g.lignes.some(r => r.pose);
      b.innerHTML = '<div style="font-size:12px;color:var(--muted);">Dans Drivup : « Resap ' + ech(g.tape) + ' »' + (deplace ? ' · <b style="color:' + RESA_ORANGE_TEXTE + ';">déplacé</b>' : '') + '</div>' +
        '<div style="font-size:13.5px;font-weight:700;margin:3px 0 6px;line-height:1.5;color:' + RESA_ORANGE_TEXTE + ';">' + creneaux + '</div>' +
        '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">' +
          '<input type="text" class="resapFiche" list="listeEleves" autocomplete="off" value="' + ech(g.eleve) + '" placeholder="Choisis l’élève" ' +
            'style="flex:1;min-width:160px;margin:0;font-weight:700;">' +
          '<button type="button" data-d="pose" class="btn btn-primary" style="width:auto;min-height:0;margin:0;padding:8px 12px;font-size:13px;">✅ Valider</button>' +
          '<button type="button" data-d="ignore" class="btn btn-secondary" style="width:auto;min-height:0;margin:0;padding:8px 12px;font-size:13px;">✕ Ignorer</button></div>' +
        '<div class="resapAide" style="font-size:11.5px;margin-top:4px;color:' + (g.sur ? 'var(--accent-text)' : g.eleve ? RESA_ORANGE_TEXTE : 'var(--warn-text)') + ';">' +
          (g.sur ? '✓ Le nom correspond à sa fiche' : g.eleve ? '⚠️ Nom pas tout à fait le même : vérifie l’élève proposé' : '⚠️ Aucune fiche proche : choisis l’élève') + '</div>';
    }
    b.addEventListener('click', async ev => {
      const bt = ev.target.closest('button[data-d]');
      if(!bt) return;
      const champ = b.querySelector('.resapFiche');
      const nom = champ ? champ.value.trim() : g.eleve;
      b.querySelectorAll('button').forEach(x => { x.disabled = true; });
      try{
        await deciderResapEC(g, bt.dataset.d, nom);
        showToast(bt.dataset.d === 'pose' ? '📅 Posé dans la fiche de ' + nom + ' ✅'
          : bt.dataset.d === 'retire' ? '➖ Retiré de la fiche de ' + g.eleve : bt.dataset.d === 'ignore' ? 'Resap ignoré' : 'Gardé dans la fiche');
        dessinerResapEC(z);
        try{ if(typeof dessinerBandeau === 'function') dessinerBandeau(); }catch(e){}
        try{ if(typeof redessinerSessions === 'function') redessinerSessions(); }catch(e){}
      }catch(e){
        b.querySelectorAll('button').forEach(x => { x.disabled = false; });
        showToast('⚠️ ' + ((e && e.message) || e));
      }
    });
    corps.appendChild(b);
  });
  /* l'interrupteur, éteint au départ */
  const reg = document.createElement('label');
  reg.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--soft);text-transform:none;margin:2px 0 0;font-weight:400;cursor:pointer;';
  reg.innerHTML = '<input type="checkbox" class="resapAuto" style="width:17px;height:17px;margin:0;"' + (resapEC.auto ? ' checked' : '') + '>' +
    '⚙️ Poser tout seul quand le nom correspond exactement à une fiche';
  reg.querySelector('input').addEventListener('change', async ev => {
    try{
      const d = await appelPrep({ action: 'drivupResapReglage', auto: ev.target.checked });
      if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
      resapEC.auto = !!d.auto;
      showToast(resapEC.auto ? 'Les Resap au nom sûr se poseront tout seuls ✅' : 'Tout se valide à la main ✅');
    }catch(e){ ev.target.checked = !ev.target.checked; showToast('Impossible : ' + ((e && e.message) || e)); }
  });
  corps.appendChild(reg);
}
/* La ligne du bandeau « choses à voir » */
function lignesResapBandeau(){
  if(typeof aDroit === 'function' && !aDroit('bureau_permis')) return [];
  if(!resapEC.lu){ chargerResapEC().catch(() => {}); return []; }
  if(Date.now() - resapEC.lu > 300000) chargerResapEC(true).catch(() => {});
  const g = groupesResapEC();
  const n = g.reduce((a, x) => a + x.lignes.length, 0);
  if(!n) return [];
  return [{
    id: 'resap:' + new Date().toISOString().slice(0, 10) + ':' + n,
    famille: 'resap',
    emoji: '📅',
    texte: n + ' Resap de Drivup à valider',
    sous: g.slice(0, 5).map(x => x.eleve || x.tape).join(' · ') + (g.length > 5 ? ' · …' : ''),
    urgente: false,
    groupe: 'auj',
    action: () => { try{ afficherOnglet('permis'); afficherVue('permis', 'sessions'); }catch(e){} },
    actionTexte: 'Voir'
  }];
}

/* ============================================================
   📅 CE QU'IL RESTE À RÉSERVER AVANT LE PERMIS — v1547

   David, le 21/11 : « vu que tu sais lire le planning des élèves, que
   tu connais le nombre de leçons à placer avant l'examen, mets
   l'information de ce qu'il faut réserver : il doit faire 6 + 3, il a
   déjà fait une leçon, il y a une leçon de planifiée, donc je dois
   réserver 1 leçon + 2h de veille » ; « écris-moi sous Tout est planifié
   les leçons à venir, et dis-moi si ça valide ou pas ce que l'élève doit
   faire » ; la veille écrite « (veille) » ; les passées enlevées.

   Ses réponses :
   · « 6 + 3 » = 6h de leçons + 2h la veille + 1h le jour J (pas à
     réserver). Les 6h se consomment par les leçons faites depuis que les
     heures ont été dites : c'est heuresQuiComptent(), la même porte que
     partout (elle rend 4 quand une leçon est faite).
   · la veille = le dernier jour ouvré avant l'examen : le samedi pour un
     examen le lundi, sinon le jour d'avant.
   · DEUX SORTES DE CRÉNEAUX : les leçons POSÉES (payées, sur son planning
     Drivup — lues par permisAVenir) et les réservations ORANGE (Resap,
     créneaux notés dans la fiche : pas payées, pas sur son planning). Une
     réservation au même jour et à la même heure qu'une leçon posée EST
     cette leçon : elle passe dans les posées.
   · « Tout est planifié » : seulement affiché ; l'option pour le cocher
     tout seul existe, éteinte (« une fois que tout sera bon »).
   ============================================================ */
let planningPermisEC = { eleves: {}, auto: false, autoLu: 0 };
const enVolPermisEC = {};
function clePermisEC(n){
  return String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function aujParisEC(){
  try{ return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }); }catch(e){ return new Date().toISOString().slice(0, 10); }
}
/* Lit dans Drivup (par le Worker) les leçons à venir des élèves qui ne sont
   pas encore lus depuis 3 minutes. Rend la promesse de la lecture. */
async function chargerPlanningPermisEC(noms, forcer){
  const manque = [];
  (noms || []).forEach(n => {
    const k = clePermisEC(n);
    if(!k || manque.some(x => clePermisEC(x) === k)) return;
    const c = planningPermisEC.eleves[k];
    if(enVolPermisEC[k]) return;
    if(!forcer && c && Date.now() - c.lu < 180000) return;
    manque.push(n);
  });
  if(!manque.length){
    const p = (noms || []).map(n => enVolPermisEC[clePermisEC(n)]).filter(Boolean);
    if(p.length) await Promise.all(p).catch(() => {});
    return planningPermisEC;
  }
  const lots = [];
  for(let i = 0; i < manque.length; i += 40) lots.push(manque.slice(i, i + 40));
  const tache = (async () => {
    for(const lot of lots){
      const d = await appelPrep({ action: 'permisAVenir', eleves: lot });
      if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'Lecture refusée');
      lot.forEach(n => {
        const l = d.eleves && Object.prototype.hasOwnProperty.call(d.eleves, n) ? d.eleves[n] : null;
        planningPermisEC.eleves[clePermisEC(n)] = { cours: Array.isArray(l) ? l : null, lu: Date.now() };
      });
      planningPermisEC.auto = !!d.planifieAuto;
      planningPermisEC.autoLu = Date.now();
    }
  })();
  manque.forEach(n => { enVolPermisEC[clePermisEC(n)] = tache; });
  try{ await tache; }
  catch(e){ manque.forEach(n => { if(!planningPermisEC.eleves[clePermisEC(n)]) planningPermisEC.eleves[clePermisEC(n)] = { cours: null, lu: Date.now(), erreur: true }; }); }
  finally{ manque.forEach(n => { delete enVolPermisEC[clePermisEC(n)]; }); }
  return planningPermisEC;
}
/* null : pas encore lu */
function aVenirPermisEC(nom){
  const c = planningPermisEC.eleves[clePermisEC(nom)];
  return c ? c : null;
}
/* Le dernier jour ouvré avant l'examen : samedi pour un lundi */
function jourDeVeillePermis(examIso){
  const d = new Date(examIso + 'T12:00:00');
  if(isNaN(d.getTime())) return '';
  d.setDate(d.getDate() - 1);
  if(d.getDay() === 0) d.setDate(d.getDate() - 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function minutesPermis(h){
  const m = String(h || '').match(/(\d{1,2})\D?(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function dureePermisH(x){
  const a = minutesPermis(x.debut), b = minutesPermis(x.fin);
  if(a === null || b === null || b <= a) return 2;
  return Math.round((b - a) / 30) / 2;
}
/* « 1 leçon de 2h », « 2 leçons de 2h », « 3h » */
function heuresAReserverTexte(h){
  if(!(h > 0)) return '';
  if(h % 2 === 0){ const n = h / 2; return n + ' leçon' + (n > 1 ? 's' : '') + ' de 2h'; }
  return String(h).replace('.', ',') + 'h';
}
function jourCourtPermis(iso){
  const d = new Date(iso + 'T12:00:00');
  return (RESA_JOURS[d.getDay()] || '').slice(0, 3) + '. ' + iso.slice(8, 10) + '/' + iso.slice(5, 7);
}
function jourLongPermis(iso){
  const d = new Date(iso + 'T12:00:00');
  return (RESA_JOURS[d.getDay()] || '') + ' ' + iso.slice(8, 10) + '/' + iso.slice(5, 7);
}
/* Le bilan d'un élève. examIso : la date de son permis (la session, ou sa
   fiche). null tant que Drivup n'est pas lu. */
function bilanPlanningPermis(nom, examIso){
  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  const exam = isoDuPermis(examIso) || isoDuPermis(s.datePermis);
  const lu = aVenirPermisEC(nom);
  if(!lu) return null;
  const auj = aujParisEC();
  const avecExam = !!exam && exam >= auj;
  const veille = avecExam ? jourDeVeillePermis(exam) : '';
  const lecons = (lu.cours || []).filter(x => x.sorte === 'conduite' && x.jour >= auj && (!avecExam || x.jour <= exam))
    .map(x => ({ jour: x.jour, debut: x.debut, fin: x.fin || '', moniteur: x.moniteur || '', h: dureePermisH(x), veille: x.jour === veille, jourJ: x.jour === exam }))
    .sort((a, b) => (a.jour + a.debut).localeCompare(b.jour + b.debut));
  const memeHeure = (a, b) => a.jour === b.jour && minutesPermis(a.debut) === minutesPermis(b.debut);
  const notees = resaLire(s.reservations || '', exam || auj).liste;
  /* les passées ne s'affichent plus (elles restent comptées : faites, elles
     sont dans heuresQuiComptent) */
  const avenir = notees.filter(r => r.jour >= auj && (!avecExam || r.jour <= exam));
  const resas = avenir.filter(r => !lecons.some(l => memeHeure(l, r)))
    .map(r => ({ jour: r.jour, debut: r.debut, fin: r.fin, h: dureePermisH(r), veille: r.jour === veille }));
  const b = { exam: avecExam ? exam : '', veille: veille, lecons: lecons, resas: resas, enDouble: avenir.length - resas.length,
              erreur: !!lu.erreur, resteH: null, valeur: '', connu: false, manquePose: null, manqueResa: null, couvre: false };
  if(!avecExam) return b;
  const hq = (typeof heuresQuiComptent === 'function') ? (heuresQuiComptent(nom) || {}) : {};
  b.valeur = String(hq.valeur == null ? '' : hq.valeur);
  const n = parseFloat(b.valeur.replace(',', '.'));
  if(isNaN(n)) return b;   /* « à préciser », « pas le niveau » */
  b.resteH = n;
  b.connu = true;
  const somme = l => l.reduce((a, x) => a + x.h, 0);
  /* la veille : 2h, d'abord les leçons posées ce jour-là, puis les
     réservations ; ce qui dépasse ce jour-là compte pour les heures d'avant */
  const poseeVeille = somme(lecons.filter(x => x.veille)), resaVeille = somme(resas.filter(x => x.veille));
  /* le jour même de la veille, une leçon déjà faite n'est plus « à venir » :
     un solde dépassé dit qu'elle a eu lieu */
  const veilleFaite = veille < auj || (veille === auj && !!hq.depasse);
  const veillePose = veilleFaite ? 2 : Math.min(2, poseeVeille);
  /* le jour de l'examen : plus rien à réserver */
  if(exam === auj){
    b.jourJ = true;
    b.manquePose = { avantH: 0, veilleH: 0 };
    b.manqueResa = { avantH: 0, veilleH: 0 };
    return b;
  }
  const veilleResa = Math.min(2 - veillePose, resaVeille);
  const avantPose = somme(lecons.filter(x => x.jour < veille)) + Math.max(0, poseeVeille - 2);
  const avantResa = somme(resas.filter(x => x.jour < veille)) + Math.max(0, resaVeille - (2 - Math.min(2, poseeVeille)));
  b.manquePose = { avantH: Math.max(0, n - avantPose), veilleH: Math.max(0, 2 - veillePose) };
  b.manqueResa = { avantH: Math.max(0, n - avantPose - avantResa), veilleH: Math.max(0, 2 - veillePose - veilleResa) };
  b.couvre = !b.manquePose.avantH && !b.manquePose.veilleH;
  return b;
}
/* « 1 leçon de 2h + 2h la veille (sam. 12/12) » ; long : pour l'élève */
function texteAReserverPermis(m, b, long){
  if(!m) return '';
  const l = [];
  if(m.avantH) l.push(heuresAReserverTexte(m.avantH) + (long ? ' avant ton examen' : ''));
  if(m.veilleH) l.push((m.veilleH === 2 ? '2h' : heuresAReserverTexte(m.veilleH)) + ' la veille (' + (long ? jourLongPermis(b.veille) : jourCourtPermis(b.veille)) + ')');
  return l.join(' + ');
}
function creneauPermisTexte(x){
  return resaTexteCourt(x) + (x.veille ? ' (veille)' : x.jourJ ? ' (jour J)' : '');
}
/* La phrase du message des créneaux libres */
function phraseAReserverPermis(nom, examIso){
  const b = bilanPlanningPermis(nom, examIso);
  if(!b || !b.connu) return '';
  const t = texteAReserverPermis(b.manqueResa, b, true);
  return t ? 'Il te reste à réserver ' + t + '. Regarde la messagerie du permis pour les dispos.' : '';
}
/* Les lignes de la session dépliée (HTML) : { posees, reste } */
function lignesPlanningPermisHtml(nom, examIso, s){
  const out = { posees: '', reste: '' };
  const b = bilanPlanningPermis(nom, examIso);
  if(!b || b.erreur) return out;
  const ech = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const base = 'display:flex;align-items:flex-start;gap:5px;margin-top:2px;font-size:12px;font-weight:700;line-height:1.45;';
  let h = '';
  if(b.lecons.length){
    h += '<div class="permisPosees" style="' + base + 'color:var(--accent-text);"><span>📅</span><span>Posées sur Drivup · <span style="font-weight:600;">' +
      ech(b.lecons.map(creneauPermisTexte).join(' · ')) + '</span></span></div>';
  }else if(b.exam){
    h += '<div class="permisPosees" style="' + base + 'color:var(--muted);"><span>📅</span><span>Aucune leçon posée sur Drivup avant l’examen</span></div>';
  }
  out.posees = h;
  h = '';
  if(!b.connu || b.jourJ) return out;
  const e = etatResaPermis(s || {});
  const t = texteAReserverPermis(b.manqueResa, b, false);
  if(t){
    h += '<div class="permisAReserver ses-doit" style="' + base + 'color:' + (e === 'eleve' ? 'var(--resa-bleu-t, #2D6A9F)' : 'var(--warn-text)') + ';"><span>' +
      (e === 'eleve' ? '🙋' : '⏳') + '</span><span>' + (e === 'eleve' ? 'Il doit encore réserver : ' : 'À réserver : ') + ech(t) +
      ((e !== 'eleve' && typeof boutonCreneauxPourLeSuivi === 'function') ? boutonCreneauxPourLeSuivi(nom) : '') + '</span></div>';
  }else if(b.couvre){
    h += '<div class="permisAReserver" style="' + base + 'color:var(--accent-text);"><span>✅</span><span>Tout est posé sur Drivup (' + ech(motsHeuresPermis(b)) + ')</span></div>';
  }else{
    h += '<div class="permisAReserver" style="' + base + 'color:' + RESA_ORANGE_TEXTE + ';"><span>✅</span><span>Tout est réservé · à poser sur Drivup</span></div>';
  }
  out.reste = h;
  return out;
}
function motsHeuresPermis(b){
  return (b.resteH ? String(b.resteH).replace('.', ',') + 'h + ' : '') + 'la veille';
}
/* Le bloc « 📅 Dans Drivup » sous « 📆 Tout est planifié » (les deux
   fiches). Il se lit tout seul ; o : { nom, exam, paresseux } —
   paresseux : il attend bloc.charger(). */
function blocPlanningDrivupPermis(o){
  const bloc = document.createElement('div');
  bloc.className = 'permisDrivup';
  bloc.style.cssText = 'border:1px solid var(--line);border-radius:12px;padding:9px 12px;margin:2px 0 12px;background:var(--navy-deep);font-size:13px;line-height:1.5;';
  const ech = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const dessiner = () => {
    const b = bilanPlanningPermis(o.nom, o.exam);
    if(!b){ bloc.innerHTML = '<div style="color:var(--muted);">📅 Lecture de ses leçons dans Drivup…</div>'; return; }
    if(b.erreur){ bloc.innerHTML = '<div style="color:var(--muted);">📅 Ses leçons dans Drivup : lecture impossible pour l’instant.</div>'; return; }
    let h = '<div style="font-weight:800;margin-bottom:3px;">📅 Leçons posées sur Drivup' + (b.exam ? ' avant l’examen' : '') + '</div>';
    h += b.lecons.length
      ? '<div class="permisListe">' + b.lecons.map(x => '<div>· ' + ech(creneauPermisTexte(x)) + (x.moniteur ? ' <span style="color:var(--muted);">— ' + ech(x.moniteur) + '</span>' : '') + '</div>').join('') + '</div>'
      : '<div style="color:var(--muted);">Aucune leçon à venir sur son planning Drivup.</div>';
    if(b.resas.length){
      h += '<div style="margin-top:4px;color:' + RESA_ORANGE_TEXTE + ';font-weight:700;">' + calendrierOrangeSvg(13) + ' Réservées, pas encore posées : ' +
        ech(b.resas.map(creneauPermisTexte).join(' · ')) + '</div>';
    }
    if(b.enDouble){
      h += '<div style="color:var(--muted);font-size:12px;">' + b.enDouble + ' réservation' + (b.enDouble > 1 ? 's' : '') + ' de la fiche ' +
        (b.enDouble > 1 ? 'sont' : 'est') + ' maintenant posée' + (b.enDouble > 1 ? 's' : '') + ' sur Drivup.</div>';
    }
    if(!b.exam) h += '';
    else if(b.jourJ){
      h += '<div class="permisVerdict" style="margin-top:6px;font-weight:800;color:var(--accent-text);">🏁 L’examen est aujourd’hui.</div>';
    }else if(!b.connu){
      h += '<div class="permisVerdict" style="margin-top:6px;font-weight:800;color:var(--warn-text);">⏱️ Heures à préciser : je ne peux pas dire si ça couvre ce qu’il doit faire.</div>';
    }else if(b.couvre){
      h += '<div class="permisVerdict" style="margin-top:6px;font-weight:800;color:var(--accent-text);">✅ Ça couvre ce qu’il lui reste : ' + ech(motsHeuresPermis(b)) + '</div>';
    }else{
      const tPose = texteAReserverPermis(b.manquePose, b, false), tResa = texteAReserverPermis(b.manqueResa, b, false);
      h += '<div class="permisVerdict" style="margin-top:6px;font-weight:800;color:var(--warn-text);">⚠️ Il manque sur Drivup : ' + ech(tPose) + '</div>';
      h += tResa ? '<div class="permisAReserver" style="font-weight:700;color:var(--warn-text);">⏳ À réserver : ' + ech(tResa) + '</div>'
                 : '<div class="permisAReserver" style="font-weight:700;color:' + RESA_ORANGE_TEXTE + ';">' + calendrierOrangeSvg(13) + ' Le reste est réservé : à poser sur Drivup</div>';
    }
    if(typeof aDroit !== 'function' || aDroit('bureau_permis')){
      h += '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--soft);text-transform:none;margin:8px 0 0;font-weight:400;cursor:pointer;letter-spacing:0;">' +
        '<input type="checkbox" class="permisAuto" style="width:16px;height:16px;margin:0;"' + (planningPermisEC.auto ? ' checked' : '') + '>' +
        '⚙️ Cocher « Tout est planifié » tout seul quand Drivup couvre tout</label>';
    }
    bloc.innerHTML = h;
    const cb = bloc.querySelector('.permisAuto');
    if(cb) cb.addEventListener('change', async ev => {
      try{
        const d = await appelPrep({ action: 'permisPlanifieReglage', auto: ev.target.checked });
        if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
        planningPermisEC.auto = !!d.auto;
        if(typeof showToast === 'function') showToast(planningPermisEC.auto ? '📆 « Tout est planifié » se cochera tout seul quand Drivup couvre tout ✅' : '📆 « Tout est planifié » se coche à la main ✅');
        if(planningPermisEC.auto && await autoPlanifiePermisEC(o.nom, o.exam) && typeof o.surAuto === 'function') o.surAuto();
      }catch(e){ ev.target.checked = !ev.target.checked; if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e)); }
    });
  };
  let lance = false;
  bloc.charger = (forcer) => {
    if(lance && !forcer) return;
    lance = true;
    dessiner();
    chargerPlanningPermisEC([o.nom], forcer).then(async () => {
      dessiner();
      if(await autoPlanifiePermisEC(o.nom, o.exam) && typeof o.surAuto === 'function') o.surAuto();
    }).catch(() => dessiner());
  };
  bloc.redessiner = dessiner;
  if(o.paresseux) bloc.innerHTML = '<div style="color:var(--muted);">📅 Leçons posées sur Drivup…</div>';
  else bloc.charger();
  return bloc;
}
/* L'option allumée : Drivup couvre tout → « Tout est planifié » (et
   « Tout est OK » quand tout est payé, comme quand on coche à la main) */
const autoPlanifieFaitEC = {};
async function autoPlanifiePermisEC(nom, examIso){
  if(!planningPermisEC.auto || !nom) return false;
  if(typeof aDroit === 'function' && !aDroit('bureau_permis')) return false;
  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  if(!s.eleve || s.toutPlanifie === 'oui' || autoPlanifieFaitEC[clePermisEC(nom)]) return false;
  const b = bilanPlanningPermis(nom, examIso);
  if(!b || !b.connu || !b.couvre) return false;
  autoPlanifieFaitEC[clePermisEC(nom)] = true;
  try{
    await majSuivi(nom, Object.assign({ toutPlanifie: 'oui' }, s.toutPaye === 'oui' ? { toutOk: 'oui' } : {}));
    if(typeof showToast === 'function') showToast('📆 ' + nom + ' : Drivup couvre tout — « Tout est planifié » coché');
    try{ if(typeof redessinerSessions === 'function') redessinerSessions(); }catch(e){}
    return true;
  }catch(e){ delete autoPlanifieFaitEC[clePermisEC(nom)]; return false; }
}

/* Une date de permis lisible en AAAA-MM-JJ (« 18/12/2026 » aussi) */
function isoDuPermis(t){
  const v = String(t || '').trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const m = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0') : '';
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-sessions.js'] = true;
