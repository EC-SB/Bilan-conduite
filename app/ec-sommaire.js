/* Déployé le 28/11/2026 à 15:27 — v1605 */
/* ============================================================
   ec-sommaire.js — 🧭 v1590
   UN MENU PLUS COURT, UN SOMMAIRE PAR ONGLET, ET CE QUE LA LOUPE
   SAIT DE L'APP

   David, le 26/11 : « je trouve que les sous-onglets d'Élèves et
   d'Outils sont nombreux […] moi qui connais l'App par cœur c'est
   facile de me retrouver, mais pour les autres ça reste compliqué ».
   Mesuré ce jour-là : 18 écrans dans Élèves pour le bureau, 27 dans
   Outils pour lui, dont une douzaine visibles sans faire défiler ; sur
   téléphone, le menu d'Outils prenait la moitié de l'écran.

   Ses choix sur le schéma (« Simplifier l'App EC ») :
     · A — « ⭐ Mes favoris » en tête du menu, les familles repliées
       dessous ; « chacun les siens » ;
     · C — un sommaire par onglet : chaque écran a une phrase qui dit
       à quoi il sert, et un champ filtre les tuiles ;
     · pas de regroupement d'écrans (B) pour le moment ;
     · la loupe cherche dans « ce qui concerne l'App en elle-même » :
       les écrans, ce qu'ils contiennent, les rubriques du dossier —
       ni les bilans, ni les tâches.

   ⚠️ RIEN NE CHANGE DE PLACE. Ce module range les boutons que
   construireBarresVues (ec-onglets.js) vient de poser : il n'en
   invente aucun, et un écran reste dans sa famille, à sa place.

   ⚠️ SEULEMENT LÀ OÙ LE MENU EST LONG. Un moniteur qui voit quatre
   écrans garde son menu tel quel : replier quatre boutons, c'est
   ajouter un geste pour rien.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les onglets au menu long, et à partir de combien d'écrans on l'allège */
const ONGLETS_ALLEGES = ['eleves', 'outils', 'gestion'];
const SEUIL_MENU_LONG = 8;

/* ============================================================
   CE QUE FAIT CHAQUE ÉCRAN — une phrase, et quelques mots-clés

   La phrase s'affiche dans le sommaire ; les mots-clés ne s'affichent
   pas, ils servent à la loupe (« accrochage » mène au constat).
   Les phrases viennent du guide. Une ligne absente n'empêche rien :
   l'écran s'affiche sans phrase.
   ============================================================ */
const ECRANS_INFOS = {
  /* --- Élèves --- */
  'eleves/dossier':      ['Tout sur un élève : sa fiche, ses cours, son permis, ses messages.', 'fiche numéro téléphone mail adresse neph'],
  'eleves/code':         ['Les séances de code et le suivi de chaque élève.', 'etg théorie séances salle code aménagé'],
  'eleves/evaluation':   ['L’évaluation de départ : heures prévues, devis, frise.', 'simulateur devis prix programme'],
  'eleves/rappels':      ['Prévenir par mail les élèves de leurs prochains cours.', 'rappel mail financeur planning demain'],
  'eleves/appels':       ['Les appels reçus par l’école : à rappeler, traités.', 'allo téléphone sms rappeler'],
  'eleves/relancesc':    ['Les élèves qui ne conduisent plus, à relancer.', 'pas conduit 15 jours heures en stock examen blanc'],
  'eleves/creneaux':     ['Les créneaux à proposer à un élève, lus dans Drivup.', 'places libres planning disponibilités décaler'],
  'eleves/salle':        ['Les tablettes de la salle : le cours de théorie au nom d’un élève.', 'tablette théorie salle'],
  'eleves/proccorriger': ['Les procédures récitées par les élèves, à corriger.', 'récitation correction messenger'],
  'eleves/videostele':   ['Lancer la vidéo Code ou Conduite sur la télé de l’agence.', 'chromecast télévision présentation inscription'],
  'eleves/financements': ['CPF, permis à 1 €, aides : où en est chaque dossier.', 'cpf aides mission locale pass engagement france travail région'],
  'eleves/paiement':     ['Le paiement en plusieurs fois d’un élève.', 'alma mensualités frais échéancier'],
  'eleves/renseignements': ['Leurs renseignements et leurs disponibilités, remplis dans leur espace.', 'questionnaire disponibilités formulaire'],
  'eleves/recherche':    ['Retrouver un bilan de cours, par élève ou par moniteur.', 'bilans leçons historique'],
  'eleves/handicap':     ['Le suivi des permis aménagés : démarches, pièces, aménagements.', 'handicap régularisation médecin agréé'],
  'eleves/suspension':   ['Les démarches après une suspension ou une annulation de permis.', 'suspendu annulé visite médicale tests psychotechniques'],
  'eleves/eleves':       ['Coller une liste de noms pour qu’ils soient proposés partout.', 'nouveaux élèves liste inscrire'],
  'eleves/depart':       ['Noter le départ d’un élève qui arrête ou change d’auto-école.', 'arrêt transfert dossier quitter'],
  /* --- Outils --- */
  'outils/stats':        ['Taux de réussite, durée et retard des examens.', 'statistiques résultats pourcentage'],
  'outils/journal':      ['Qui a fait quoi dans l’App, et quand.', 'historique activité traces'],
  'outils/mails':        ['Tout ce que l’App a envoyé par mail, et ce qui a échoué.', 'envois mails partis échec'],
  'outils/activite':     ['Ce que les élèves font dans leur espace : connexions, bilans ouverts.', 'connexions espace élève'],
  'outils/messages':     ['Épingler un message à quelqu’un, ou en laisser un à un moniteur pour un élève.', 'consigne épinglé bandeau'],
  'outils/sms':          ['Les SMS urgents, leur coût et le journal des envois.', 'texto campagne'],
  'outils/taches':       ['Qui fait quoi, avec quelle urgence.', 'à faire todo liste'],
  'outils/notifs':       ['Ce qui attend une décision, et qui en voit la pastille.', 'alertes notifications pastilles'],
  'outils/equipe':       ['Les fiches de l’équipe : papiers, absences, heures, résultats.', 'moniteurs salariés congés autorisation d’enseigner visite médicale'],
  'outils/ecole':        ['Ce que la préfecture et les auditeurs demandent à l’école, avec ses échéances.', 'agrément qualiopi label garantie financière'],
  'outils/caisse':       ['Compter les billets et les chèques, noter un dépôt en banque.', 'espèces liquide chèques banque fond de caisse'],
  'outils/coutsia':      ['Ce que coûte l’IA, et le temps que prennent les bilans.', 'dépense réflexion générations seuil'],
  'outils/paie':         ['Les éléments de paie du mois : heures supplémentaires, congés, arrêts.', 'salaires gestionnaire heures sup'],
  'outils/tarifs':       ['Les tarifs horaires, les prestations et les fiches de tarifs.', 'prix forfait devis'],
  'outils/placesbe':     ['La demande de places d’examen BE à la DDTM.', 'remorque préfecture courrier'],
  'outils/formations':   ['Les formations pour les entreprises, de la demande au paiement.', 'opco convention entreprise'],
  'outils/textes':       ['Tous les textes à envoyer aux élèves : ceux de l’App et tes fiches.', 'keep modèles messages fiches'],
  'outils/bilans':       ['Les modèles de bilan, le bilan à la main et les consignes de l’IA.', 'créateur de fiches type de bilan consignes'],
  'outils/procedures':   ['Nos procédures de conduite, celles que l’élève doit savoir réciter.', 'créneau giratoire pad contrôles'],
  'outils/liensfb':      ['Les liens des publications Facebook, rattachés à l’espace élève.', 'facebook groupe vidéos'],
  'outils/memoire':      ['Les mots que la dictée écrit mal, et les règles dictées à l’IA.', 'vocabulaire corrections règles naia claude'],
  'outils/verifs':       ['Les 100 questions de vérification, nos voitures et le jeu.', 'vérifications intérieures extérieures sécurité routière premiers secours'],
  'outils/constat':      ['Remplir un constat amiable pas à pas après un accrochage.', 'accident assurance immatriculation croquis'],
  'outils/courriers':    ['Les courriers sur papier à en-tête : convocation, attestation…', 'lettre pdf tampon signature'],
  'outils/aidereponses': ['Des réponses prêtes pour les messages et les mails des élèves.', 'réponses toutes faites'],
  'outils/squelette':    ['Le début, la fin et le style de toutes les vidéos des guides.', 'générique copyright transitions polices'],
  'outils/lieux':        ['Les repères de lieu du parcours de conduite, avec leur explication.', 'gps carrefour rond-point'],
  /* --- Gestion --- */
  'gestion/flotte':      ['Les voitures : kilomètres, entretiens, contrôles techniques, assurance.', 'véhicules immatriculation cb gasoil carrosserie garages'],
  'gestion/incidents':   ['Les erreurs apparues sur les écrans de l’équipe.', 'bugs signalements erreurs'],
  'gestion/direct':      ['La carte des voitures de l’école, en direct.', 'gps position carte'],
  'gestion/loudeac':     ['Le bureau de Loudéac : horaires, page publique, rendez-vous.', 'ouverture fermeture qr code vitrine'],
  'gestion/stbrieuc':    ['Le bureau de Saint-Brieuc : horaires, page publique, rendez-vous.', 'ouverture fermeture qr code vitrine'],
  'gestion/ecran':       ['Ce qui tourne sur l’écran de l’accueil et sur la vitrine.', 'diapositives télé planning affichage'],
  'gestion/encours':     ['Les cours commencés par un moniteur et jamais terminés, à reprendre.', 'dictée bilan non fini'],
  'gestion/menage':      ['Ce qui s’efface tout seul, et les durées de conservation.', 'rgpd suppression archives'],
  'gestion/drivup':      ['Ce que l’App lit dans Drivup, et l’extension à installer.', 'extension favori import planning'],
  'gestion/ouverture':   ['Ouvrir et fermer les cours dans Drivup sur une période.', 'année trimestre semaine type'],
  'gestion/coffre':      ['Les identifiants et les mots de passe des logiciels de l’école.', 'mot de passe vision verifone'],
  'gestion/admin':       ['Les comptes de l’équipe et ce que chacun a le droit de voir.', 'droits codes comptes rôle'],
  'gestion/allo':        ['Naïa, l’IA qui répond au téléphone : ses consignes et ses réglages.', 'naia téléphone standard'],
  'gestion/base':        ['Ce qui est rangé dans la base et le stockage de l’App.', 'd1 r2 cloudflare'],
  'gestion/charges':     ['Les charges fixes du mois, et ce qu’il reste une fois payées.', 'loyer salaires abonnements'],
  /* --- Permis, Suivi, Messagerie : pas de sommaire, mais la loupe s'en sert --- */
  'permis/pasprets':     ['Ceux qu’on ne peut pas encore envoyer à l’examen, et pourquoi.', 'examen blanc niveau bilan post-permis repassage'],
  'permis/envisager':    ['Ceux à qui on va pouvoir donner une date d’examen.', 'prêts rdv permis examens blancs prévus'],
  'permis/relances':     ['Après le permis : bilan et rendez-vous post-permis, examens à repasser.', 'post-permis repasser'],
  'permis/preppermis':   ['Écrire aux élèves qui vont passer l’examen : messages de groupe et solo.', 'convocation messenger groupe'],
  'permis/sessions':     ['Les places du mois, les sessions d’examen, la reprise des examens blancs.', 'places sessions rdvpermis inspecteur'],
  'permis/resultats':    ['Saisir le résultat des examens passés.', 'obtenu ajourné réussite'],
  'permis/permis':       ['Les messages de félicitations, préparés quand un permis est obtenu.', 'félicitations réussi'],
  'permis/moto':         ['Le suivi des permis moto : plateau, circulation, résultats.', 'a1 a2 plateau circulation'],
  'permis/remorque':     ['Le suivi des permis remorque : à placer, examens prévus, à repasser.', 'be b96'],
  'suivi/simu':          ['Les simulateurs nuit et risques, et les examens blancs à prévoir.', 'simulateur nuit risques'],
  'suivi/suivics':       ['Les élèves en conduite supervisée, qu’on ne revoit pas toutes les semaines.', 'cs accompagnateur'],
  'suivi/suiviaac':      ['La conduite accompagnée : rendez-vous préalable, rendez-vous pédagogiques, examen.', 'aac rvp accompagnateur veille'],
  'suivi/ecoutes':       ['Qui ne réserve pas d’écoutes pédagogiques, et qui réserve sans venir.', 'écoute pointage'],
  'suivi/parcours':      ['Les groupes et les guides vidéo que les élèves suivent dans leur espace.', 'vidéos théorie parcours guide'],
  'suivi/parcourssuivi': ['Où en est chaque élève dans son parcours de guides.', 'avancement guides'],
  'suivi/faq':           ['Les questions fréquentes des élèves, et leurs réponses.', 'faq'],
  'suivi/annonces':      ['Une information de l’école affichée en tête de l’espace élève.', 'fermeture bureau annonce'],
  'messagerie/messagerie': ['Toutes les conversations : l’équipe, les élèves, les véhicules.', 'messages discussion vocal'],
  'messagerie/mails':    ['La boîte mail de l’école, lue et répondue dans l’App.', 'ovh boîte mail'],
  'messagerie/oublis':   ['Les objets oubliés dans une voiture, jusqu’à ce qu’ils soient rendus.', 'perdu oublié']
};

/* ============================================================
   CE QUE CONTIENNENT LES ÉCRANS — tiroirs, sous-onglets, intertitres

   Pour la loupe : « assurance » doit mener au tiroir « 🛡️ L'assurance et
   nos véhicules » du constat, pas seulement aux écrans qui portent le
   mot dans leur nom. La liste est relevée sur la vraie App par
   outils/indexer-ecrans.mjs, puis relue. Un tiroir ajouté demain et
   pas encore listé ici reste trouvable par le nom de son écran : la
   liste complète, elle n'empêche rien.
   ============================================================ */
const INDEX_TIROIRS = {
  'permis/pasprets':   ['Examen blanc — pas le niveau', 'Attente bilan post-permis', 'Examen non planifiable', 'Pas de repassage pour le moment'],
  'permis/envisager':  ['Élèves prêts au permis', 'Liste RDV PERMIS', 'Examens blancs prévus'],
  'permis/preppermis': ['Messages de groupe', 'Messages SOLO'],
  'permis/sessions':   ['Reprendre les examens blancs', 'Régler les places disponibles', 'Sessions d’examen'],
  'permis/resultats':  ['Examens passés — résultat à saisir'],
  'permis/permis':     ['Préparer manuellement pour un élève'],
  'permis/moto':       ['Préparation du plateau', 'Plateau à prévoir', 'Circulation à prévoir', 'Statistiques moto'],
  'permis/remorque':   ['À placer', 'Examens prévus', 'À repasser', 'Statistiques remorque'],
  'suivi/simu':        ['Ajouter une date manuellement', 'Simulateurs nuit et risques', 'Examens blancs à prévoir'],
  'suivi/suiviaac':    ['La phrase de la leçon de veille'],
  'suivi/ecoutes':     ['Pointage et rappels des écoutes'],
  'eleves/creneaux':   ['Horaires des moniteurs'],
  'eleves/proccorriger': ['Réglages et alertes', 'Raccourci « procédures à corriger »'],
  'eleves/financements': ['Quelles aides pour cet élève ?', 'Un message CPF, sans dossier'],
  'eleves/paiement':   ['Marche à suivre'],
  'outils/stats':      ['Taux de réussite', 'Durée et retard des examens'],
  'outils/messages':   ['Message à un moniteur, à propos d’un élève', 'Messages en attente de lecture'],
  'outils/sms':        ['Ce que coûterait une campagne', 'Journal des SMS'],
  'outils/coutsia':    ['Le temps des générations', 'Réflexion de l’IA pour les bilans dictés'],
  'outils/bilans':     ['Consignes données à l’IA'],
  'outils/constat':    ['Sur place, dans l’ordre', 'L’assurance et nos véhicules'],
  'outils/squelette':  ['L’avertissement, au début', 'Le carton titre', 'Le copyright, pendant la vidéo', 'Le générique, à la fin', 'Les transitions', 'Les polices de l’école'],
  'gestion/flotte':    ['Les CB Gasoil', 'L’assurance des voitures', 'Carrosserie des véhicules'],
  'gestion/ecran':     ['Les écrans en ce moment'],
  'gestion/menage':    ['Les durées de conservation'],
  'gestion/drivup':    ['Installer l’extension sur cet ordinateur', 'Ce qui est lu, et quand', 'Les écoutes pédagogiques'],
  'gestion/ouverture': ['L’équilibre BV / BEA de l’école'],
  'gestion/admin':     ['Les ordinateurs des salles', 'Outils de réparation'],
  'gestion/allo':      ['Le brancher dans Allo', 'Ce qu’elle peut dire, pour tous', 'Ce qu’elle peut faire, pour tous', 'Qui elle reconnaît', 'Élèves réglés à part']
};

/* ============================================================
   LES PETITS OUTILS
   ============================================================ */
function somNorme(s){
  return (typeof normaliserMot === 'function')
    ? normaliserMot(s)
    : String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
function somEch(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
/* Mon nom, en clé : « favoris:florence » — la même forme que le Worker */
function somMoi(){
  const nom = (typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur) ? String(ACCES.moniteur) : '';
  return nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}
function somLire(cle){
  try{ return JSON.parse(localStorage.getItem(cle + ':' + somMoi()) || 'null') || {}; }catch(e){ return {}; }
}
function somGarder(cle, o){
  try{ localStorage.setItem(cle + ':' + somMoi(), JSON.stringify(o || {})); }catch(e){}
}
/* Le rail est-il en colonne ? (ordinateur, nouvel écran) — sinon, c'est
   une rangée : téléphone, tablette debout. La même condition que la
   feuille de style. */
function somEnColonne(){
  return document.body.classList.contains('cours-neuf') &&
         !!(window.matchMedia && window.matchMedia('(min-width: 1280px)').matches);
}
function somBarre(onglet){ return document.querySelector('.barre-vues[data-pour="' + onglet + '"]'); }
function somNomOnglet(onglet){
  const o = (typeof ONGLETS_DROITS !== 'undefined') ? ONGLETS_DROITS.find(x => x.cle === onglet) : null;
  return o ? String(o.nom).replace(/^\s*\S+\s+/, '') : onglet;
}

/* ============================================================
   ⭐ LES FAVORIS — chacun les siens, sur tous ses appareils

   La copie de l'appareil s'affiche tout de suite ; celle des réglages
   la corrige quand elle arrive (comme le rangement des tuiles).
   L'écriture passe par la porte « favorisEcransPoser » du Worker, qui
   n'écrit que la clé de la personne connectée.
   ============================================================ */
const CLE_FAVORIS_ICI = 'ec_favoris_ecrans';
const CLE_FAMILLES_ICI = 'ec_familles_ouvertes';
const CLE_RECENTS_ICI = 'ec_ecrans_recents';
let favorisEcrans = null;
let favorisDeQui = null;       /* à qui sont ceux qu'on a en mémoire */
let favorisDemandes = '';      /* pour qui on les a déjà demandés */

function favorisDe(onglet){
  /* ⚠️ UN POSTE, PLUSIEURS PERSONNES : l'ordinateur du bureau change de
     mains. Les favoris en mémoire sont ceux de la personne connectée, et
     on les relit dès que ce n'est plus la même. */
  const moi = somMoi();
  if(favorisEcrans === null || favorisDeQui !== moi){
    favorisEcrans = somLire(CLE_FAVORIS_ICI);
    favorisDeQui = moi;
    if(moi && favorisDemandes !== moi) setTimeout(chargerFavorisEcrans, 0);
  }
  const l = favorisEcrans[onglet];
  return Array.isArray(l) ? l : [];
}
async function chargerFavorisEcrans(){
  const moi = somMoi();
  if(!moi || favorisDemandes === moi || typeof chargerReglagesPartages !== 'function') return;
  favorisDemandes = moi;
  try{
    const r = await chargerReglagesPartages(false);
    const brut = r['favoris:' + somMoi()];
    if(brut === undefined || somMoi() !== moi) return;
    let o = {};
    try{ o = JSON.parse(brut || '{}') || {}; }catch(e){ o = {}; }
    if(JSON.stringify(o) === JSON.stringify(favorisEcrans || {})) return;
    favorisEcrans = o;
    favorisDeQui = moi;
    somGarder(CLE_FAVORIS_ICI, o);
    ONGLETS_ALLEGES.forEach(x => { allegerLaBarre(x); rafraichirSommaire(x); });
  }catch(e){ favorisDemandes = ''; }
}
function estFavori(onglet, cle){ return favorisDe(onglet).indexOf(cle) !== -1; }
function basculerFavori(onglet, cle){
  if(!somMoi()) return;
  const l = favorisDe(onglet).slice();
  const i = l.indexOf(cle);
  if(i !== -1) l.splice(i, 1);
  else{
    if(l.length >= 12){ if(typeof showToast === 'function') showToast('12 favoris au plus par onglet : retire-en un d’abord.'); return; }
    l.push(cle);
  }
  favorisEcrans = Object.assign({}, favorisEcrans || {});
  if(l.length) favorisEcrans[onglet] = l; else delete favorisEcrans[onglet];
  somGarder(CLE_FAVORIS_ICI, favorisEcrans);
  allegerLaBarre(onglet);
  rafraichirSommaire(onglet);
  if(typeof showToast === 'function') showToast(i !== -1 ? '☆ Retiré de tes favoris' : '⭐ Ajouté à tes favoris');
  if(typeof appelPrep === 'function'){
    const envoi = JSON.stringify(favorisEcrans);
    appelPrep({ action: 'favorisEcransPoser', favoris: envoi }).then(r => {
      if(r && r.status === 'ok' && typeof reglagesDejaLus === 'function'){
        const deja = reglagesDejaLus();
        if(deja) deja['favoris:' + somMoi()] = JSON.stringify(r.favoris || {});
      }
    }).catch(() => { /* hors ligne : gardé sur cet appareil, renvoyé au prochain changement */ });
  }
}

/* Les derniers écrans ouverts, par onglet — pour la rangée courte du
   téléphone tant qu'on n'a pas choisi de favoris */
function noterEcranRecent(onglet, cle){
  if(cle === 'sommaire' || window.EC_COTE) return;
  const o = somLire(CLE_RECENTS_ICI);
  const l = (Array.isArray(o[onglet]) ? o[onglet] : []).filter(x => x !== cle);
  l.unshift(cle);
  o[onglet] = l.slice(0, 4);
  somGarder(CLE_RECENTS_ICI, o);
}

/* ============================================================
   LE MENU ALLÉGÉ
   ============================================================ */
/* Appelé par construireBarresVues : faut-il un sommaire ici ? */
function sommairePourLOnglet(onglet, dispo){
  return ONGLETS_ALLEGES.indexOf(onglet) !== -1 && Array.isArray(dispo) &&
         dispo.length > SEUIL_MENU_LONG && dispo.some(x => x[3]);
}
function menuAllege(onglet){
  const b = somBarre(onglet);
  return !!(b && b.querySelector('[data-vue-cible="sommaire"]'));
}

/* Les boutons d'origine d'un écran (celui de sa famille), jamais une copie */
function boutonDOrigine(barre, cle){
  return barre.querySelector('.grpFam [data-vue-cible="' + cle + '"]');
}
function copieDuBouton(onglet, src){
  const b = src.cloneNode(true);
  b.classList.remove('actif');
  b.addEventListener('click', () => afficherVue(onglet, src.getAttribute('data-vue-cible')));
  return b;
}
function familleOuverte(onglet, nom, cles){
  const o = somLire(CLE_FAMILLES_ICI);
  const choix = (o[onglet] || {})[nom];
  if(choix === true || choix === false) return choix;
  /* Pas de choix : ouverte si elle porte l'écran ouvert et qu'il n'est
     pas déjà sous les yeux dans les favoris */
  const ouvert = (typeof vueActive !== 'undefined') ? vueActive[onglet] : '';
  return cles.indexOf(ouvert) !== -1 && !estFavori(onglet, ouvert);
}
function basculerFamille(onglet, nom, cles){
  const o = somLire(CLE_FAMILLES_ICI);
  o[onglet] = o[onglet] || {};
  o[onglet][nom] = !familleOuverte(onglet, nom, cles);
  somGarder(CLE_FAMILLES_ICI, o);
  allegerLaBarre(onglet);
}

function allegerLaBarre(onglet){
  const barre = somBarre(onglet);
  if(!barre) return;
  const actif = menuAllege(onglet);
  barre.classList.toggle('allegee', actif);
  barre.querySelectorAll('.grpFavoris, .grpCourte').forEach(x => x.remove());
  if(!actif) return;

  const colonne = somEnColonne();
  const tout = barre.querySelector('[data-vue-cible="sommaire"]');
  const grpTout = tout.closest('.grp') || tout;
  grpTout.classList.add('grpTout');

  /* Les familles : un en-tête qui replie, une étoile par écran */
  let total = 0;
  barre.querySelectorAll('.grp').forEach(g => {
    const fam = g.querySelector(':scope > .fam');
    if(!fam || g.classList.contains('grpFavoris')) return;
    g.classList.add('grpFam');
    const nom = fam.textContent;
    const boutons = [...g.querySelectorAll('button[data-vue-cible]')];
    const cles = boutons.map(b => b.getAttribute('data-vue-cible'));
    total += cles.length;

    let tete = g.querySelector(':scope > .famPli');
    if(!tete){
      tete = document.createElement('div');
      tete.className = 'famPli';
      tete.setAttribute('role', 'button');
      tete.tabIndex = 0;
      tete.innerHTML = '<span class="ch" aria-hidden="true"></span><span class="nomFam"></span><span class="alerteFam" hidden></span><span class="nbFam"></span>';
      tete.querySelector('.nomFam').textContent = nom;
      const agir = () => basculerFamille(onglet, nom, cles);
      tete.addEventListener('click', agir);
      tete.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); agir(); } });
      g.insertBefore(tete, fam);
    }
    const ouverte = familleOuverte(onglet, nom, cles);
    g.classList.toggle('pliee', !ouverte);
    tete.setAttribute('aria-expanded', ouverte ? 'true' : 'false');
    tete.querySelector('.ch').textContent = ouverte ? '▾' : '▸';
    tete.querySelector('.nbFam').textContent = String(cles.length);

    boutons.forEach(b => {
      let env = b.parentElement;
      if(!env.classList.contains('avecEtoile')){
        env = document.createElement('span');
        env.className = 'avecEtoile';
        b.parentElement.insertBefore(env, b);
        env.appendChild(b);
        const e = document.createElement('span');
        e.className = 'etoileFav';
        e.setAttribute('role', 'button');
        e.tabIndex = 0;
        const cle = b.getAttribute('data-vue-cible');
        const agir = ev => {
          ev.preventDefault(); ev.stopPropagation();
          /* La famille reste ouverte sous le doigt : sans ça, mettre en
             favori l'écran ouvert la replierait aussitôt (elle ne s'ouvre
             d'elle-même que pour un écran qui n'est pas en favori). */
          if(!g.classList.contains('pliee')){
            const o = somLire(CLE_FAMILLES_ICI);
            o[onglet] = o[onglet] || {};
            o[onglet][nom] = true;
            somGarder(CLE_FAMILLES_ICI, o);
          }
          basculerFavori(onglet, cle);
        };
        e.addEventListener('click', agir);
        e.addEventListener('keydown', ev => { if(ev.key === 'Enter' || ev.key === ' ') agir(ev); });
        env.appendChild(e);
      }
      const e = env.querySelector('.etoileFav');
      const oui = estFavori(onglet, b.getAttribute('data-vue-cible'));
      e.textContent = oui ? '★' : '☆';
      e.classList.toggle('on', oui);
      e.setAttribute('aria-label', (oui ? 'Retirer des favoris : ' : 'Ajouter aux favoris : ') + (b.getAttribute('data-nom') || ''));
      e.title = oui ? 'Retirer de mes favoris' : 'Ajouter à mes favoris';
    });
  });

  /* « Sommaire » sur ordinateur, « Tout · 27 » sur téléphone */
  const nomTout = tout.querySelector('.nomVue');
  if(nomTout) nomTout.textContent = colonne ? 'Sommaire' : 'Tout · ' + total;
  tout.setAttribute('data-nom', colonne ? 'Sommaire' : 'Tous les écrans');
  tout.setAttribute('aria-label', colonne ? 'Sommaire' : 'Tous les écrans (' + total + ')');

  /* ⭐ Mes favoris (ordinateur) */
  const favoris = favorisDe(onglet).map(c => boutonDOrigine(barre, c)).filter(Boolean);
  const gf = document.createElement('div');
  gf.className = 'grp grpFavoris';
  const tf = document.createElement('div');
  tf.className = 'fam';
  tf.textContent = '⭐ Mes favoris';
  gf.appendChild(tf);
  const rf = document.createElement('div');
  rf.className = 'rang';
  favoris.forEach(src => rf.appendChild(copieDuBouton(onglet, src)));
  gf.appendChild(rf);
  if(!favoris.length){
    const aide = document.createElement('div');
    aide.className = 'aideFavoris';
    aide.textContent = 'Ouvre une famille et touche ☆ : l’écran reste ici, sous la main.';
    gf.appendChild(aide);
  }
  grpTout.after(gf);

  /* La rangée courte (téléphone) : ses favoris ; sinon l'écran ouvert et
     les derniers ouverts. L'écran ouvert y est toujours. */
  const ouvert = (typeof vueActive !== 'undefined') ? vueActive[onglet] : '';
  const courte = favoris.slice();
  const srcOuvert = ouvert ? boutonDOrigine(barre, ouvert) : null;
  if(srcOuvert && courte.indexOf(srcOuvert) === -1) courte.unshift(srcOuvert);
  if(!favoris.length){
    ((somLire(CLE_RECENTS_ICI)[onglet]) || []).forEach(c => {
      const s = boutonDOrigine(barre, c);
      if(s && courte.indexOf(s) === -1 && courte.length < 5) courte.push(s);
    });
  }
  const gc = document.createElement('div');
  gc.className = 'grp grpCourte';
  const rc = document.createElement('div');
  rc.className = 'rang';
  courte.forEach(src => rc.appendChild(copieDuBouton(onglet, src)));
  gc.appendChild(rc);
  gf.after(gc);

  /* Les copies viennent d'être refaites : l'écran ouvert se rallume */
  barre.querySelectorAll('button[data-vue-cible]').forEach(b => {
    b.classList.toggle('actif', b.getAttribute('data-vue-cible') === ouvert);
  });
  majPastillesDesFamilles(onglet);
}

/* Une famille repliée ne doit pas cacher une pastille : son en-tête
   porte le total de ce qui attend dans ses écrans. */
function majPastillesDesFamilles(onglet){
  const barre = somBarre(onglet);
  if(!barre || !barre.classList.contains('allegee')) return;
  barre.querySelectorAll('.grpFam').forEach(g => {
    const a = g.querySelector(':scope > .famPli .alerteFam');
    if(!a) return;
    let n = 0;
    g.querySelectorAll('button[data-vue-cible]').forEach(b => {
      n += (typeof COMPTES_VUE !== 'undefined' && Number(COMPTES_VUE[b.getAttribute('data-vue-cible')])) || 0;
    });
    a.hidden = !n;
    a.textContent = n > 99 ? '99+' : String(n);
  });
}

/* Appelé par afficherVue, avant d'allumer le bouton de l'écran */
function surVueAffichee(onglet, cle){
  if(!menuAllege(onglet)) return;
  noterEcranRecent(onglet, cle);
  allegerLaBarre(onglet);
}

/* Sur téléphone, « Tout » ouvre le sommaire en feuille, par-dessus
   l'écran en cours : on ne perd pas ce qu'on regardait. */
document.addEventListener('click', e => {
  const b = e.target && e.target.closest ? e.target.closest('.barre-vues.allegee [data-vue-cible="sommaire"]') : null;
  if(!b || somEnColonne()) return;
  e.preventDefault();
  e.stopPropagation();
  const barre = b.closest('.barre-vues');
  ouvrirFeuilleSommaire(barre.getAttribute('data-pour'));
}, true);

/* Passer du téléphone à l'ordinateur (une tablette qu'on tourne) */
if(window.matchMedia){
  const mq = window.matchMedia('(min-width: 1280px)');
  const refaire = () => ONGLETS_ALLEGES.forEach(o => { try{ allegerLaBarre(o); }catch(e){} });
  if(mq.addEventListener) mq.addEventListener('change', refaire);
  else if(mq.addListener) mq.addListener(refaire);
}

/* ============================================================
   🧭 LE SOMMAIRE D'UN ONGLET
   ============================================================ */
/* La carte du sommaire, une par onglet, posée en tête de l'écran */
function carteDuSommaire(onglet){
  let c = document.querySelector('.card[data-vue="sommaire"][data-onglet="' + onglet + '"]');
  if(c) return c;
  const zone = document.getElementById('appView');
  if(!zone) return null;
  c = document.createElement('div');
  c.className = 'card hors-vue';
  c.setAttribute('data-onglet', onglet);
  c.setAttribute('data-vue', 'sommaire');
  c.style.display = 'none';
  zone.insertBefore(c, zone.firstChild);
  return c;
}
ONGLETS_ALLEGES.forEach(o => { try{ carteDuSommaire(o); }catch(e){} });

/* Les familles et leurs écrans, tels que le menu les montre à cette personne */
function famillesDuMenu(onglet){
  const barre = somBarre(onglet);
  const out = [];
  if(!barre) return out;
  barre.querySelectorAll('.grpFam').forEach(g => {
    const fam = g.querySelector(':scope > .fam');
    const ecrans = [...g.querySelectorAll('button[data-vue-cible]')].map(b => ({
      cle: b.getAttribute('data-vue-cible'),
      nom: b.getAttribute('data-nom') || '',
      logo: ((b.querySelector('.logoVue') || {}).textContent || '').trim()
    }));
    if(ecrans.length) out.push({ nom: fam ? fam.textContent : '', ecrans: ecrans });
  });
  return out;
}

function logoEnIcone(logo){
  const g = (typeof window.glypheVerre === 'function') ? window.glypheVerre(logo) : null;
  if(!g) return '<span class="somLogo">' + somEch(logo) + '</span>';
  return '<span class="emo somLogo">' + somEch(logo) + '</span><span class="vgl" style="--c:' + g.couleur + ';">' + g.svg + '</span>';
}

/* 👤 v1596 — le sommaire de l'onglet Élèves cherche aussi les élèves
   (à qui a le droit d'ouvrir leur dossier) */
function sommaireChercheLesEleves(onglet){
  return onglet === 'eleves' && typeof ouvrirPageEleve === 'function' &&
         (typeof aDroit !== 'function' || aDroit('eleves'));
}
/* Les élèves dont le nom contient tous les mots tapés, dans n'importe
   quel ordre (« léa mar » trouve MARTIN Léa). Ceux dont un mot COMMENCE
   par ce qu'on tape passent devant. 2 lettres au moins. */
function elevesDuSommaire(texte, max){
  const mots = somNorme(texte).split(/\s+/).filter(Boolean);
  if(!mots.length || mots.join('').length < 2) return { noms: [], reste: 0 };
  const tous = (typeof elevesConnus !== 'undefined' ? (elevesConnus || []) : []);
  const vus = {};
  const l = [];
  tous.forEach(n => {
    const nom = String(n || '').trim();
    if(!nom) return;
    const k = somNorme(nom);
    if(vus[k]) return;
    if(!mots.every(m => k.indexOf(m) !== -1)) return;
    vus[k] = true;
    const debut = k.split(/[\s\-']+/).some(w => w.indexOf(mots[0]) === 0) ? 0 : 1;
    l.push({ nom: nom, debut: debut });
  });
  l.sort((a, b) => a.debut - b.debut || a.nom.localeCompare(b.nom, 'fr'));
  const m = max || 12;
  return { noms: l.slice(0, m).map(x => x.nom), reste: Math.max(0, l.length - m) };
}

/* Dessine le sommaire dans « zone ». « surChoix » : la feuille du
   téléphone se ferme quand on choisit un écran. */
function remplirSommaire(onglet, zone, surChoix){
  const avant = zone.querySelector('.somFiltre');
  const mot = avant ? avant.value : '';
  const aLeFocus = avant && document.activeElement === avant;
  zone.innerHTML = '';

  const champ = document.createElement('input');
  champ.type = 'text';
  champ.className = 'somFiltre';
  champ.autocomplete = 'off';
  const avecEleves = sommaireChercheLesEleves(onglet);
  champ.placeholder = avecEleves ? '🔍 Un élève ou un mot : « Martin », « rappel », « paiement »…'
                    : '🔍 Tape un mot : ' + (onglet === 'outils' ? '« caisse », « sms », « constat »…'
                    : onglet === 'gestion' ? '« voiture », « mot de passe », « droits »…'
                    : '« rappel », « paiement », « tablette »…');
  champ.setAttribute('aria-label', avecEleves ? 'Chercher un élève, ou filtrer les écrans de ' + somNomOnglet(onglet)
                                              : 'Filtrer les écrans de ' + somNomOnglet(onglet));
  /* la liste des élèves n'est peut-être pas encore là : on la demande, et on redessine */
  if(avecEleves && !(typeof elevesConnus !== 'undefined' && (elevesConnus || []).length) && typeof chargerEleves === 'function' && !remplirSommaire._enCharge){
    remplirSommaire._enCharge = true;
    Promise.resolve(chargerEleves()).catch(() => {}).then(() => {
      remplirSommaire._enCharge = false;
      if(zone.isConnected && champ.isConnected && champ.value.trim()) champ.dispatchEvent(new Event('input'));
    });
  }
  champ.value = mot;
  zone.appendChild(champ);

  const corps = document.createElement('div');
  zone.appendChild(corps);

  const dessiner = () => {
    const q = somNorme(champ.value);
    corps.innerHTML = '';
    let vus = 0;
    /* 👤 v1596 — DAVID : « dans le sommaire de l'onglet Élèves, la barre de
       recherche doit trouver les élèves et ouvrir leur dossier ». Ils
       passent avant les écrans ; un clic ouvre son dossier (le clic
       molette l'ouvre dans un onglet, comme partout). */
    const eleves = avecEleves ? elevesDuSommaire(champ.value) : { noms: [], reste: 0 };
    if(eleves.noms.length){
      vus += eleves.noms.length;
      const t = document.createElement('div');
      t.className = 'somFam';
      t.textContent = '👤 Élèves';
      corps.appendChild(t);
      const g = document.createElement('div');
      g.className = 'somTuiles somEleves';
      eleves.noms.forEach(nom => {
        const f = typeof ficheDe === 'function' ? (ficheDe(nom) || {}) : {};
        const env = document.createElement('div');
        env.className = 'somTuile';
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'somOuvrir somEleve';
        b.dataset.eleve = nom;
        b.title = 'Ouvrir le dossier de ' + nom;
        b.innerHTML = '<span class="somIc"><span class="somLogo">👤</span></span>' +
          '<span class="somTxt"><b>' + somSurligner(nom, champ.value.trim()) + '</b>' +
          '<span class="somPhrase">' + somEch(f.formation ? '🎓 ' + f.formation + ' · ouvrir son dossier' : 'Ouvrir son dossier') + '</span></span>';
        b.addEventListener('click', () => { if(surChoix) surChoix(); ouvrirPageEleve(nom); });
        env.appendChild(b);
        g.appendChild(env);
      });
      corps.appendChild(g);
      if(eleves.reste){
        const r = document.createElement('div');
        r.className = 'somPhrase';
        r.style.cssText = 'margin:-10px 0 16px;';
        r.textContent = '… et ' + eleves.reste + ' autre' + (eleves.reste > 1 ? 's' : '') + ' : tape quelques lettres de plus.';
        corps.appendChild(r);
      }
    }
    famillesDuMenu(onglet).forEach(f => {
      const l = f.ecrans.filter(x => {
        if(!q) return true;
        const info = ECRANS_INFOS[onglet + '/' + x.cle] || ['', ''];
        const tiroirs = (INDEX_TIROIRS[onglet + '/' + x.cle] || []).join(' ');
        return somNorme(x.nom + ' ' + info[0] + ' ' + info[1] + ' ' + tiroirs).indexOf(q) !== -1;
      });
      if(!l.length) return;
      vus += l.length;
      const t = document.createElement('div');
      t.className = 'somFam';
      t.textContent = f.nom;
      corps.appendChild(t);
      const g = document.createElement('div');
      g.className = 'somTuiles';
      l.forEach(x => {
        const info = ECRANS_INFOS[onglet + '/' + x.cle] || ['', ''];
        const env = document.createElement('div');
        env.className = 'somTuile';
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'somOuvrir';
        b.innerHTML = '<span class="somIc">' + logoEnIcone(x.logo) + '</span>' +
          '<span class="somTxt"><b>' + somEch(x.nom) + '</b>' +
          (info[0] ? '<span class="somPhrase">' + somEch(info[0]) + '</span>' : '') + '</span>';
        b.addEventListener('click', () => { if(surChoix) surChoix(); afficherVue(onglet, x.cle); });
        env.appendChild(b);
        const e = document.createElement('button');
        e.type = 'button';
        const oui = estFavori(onglet, x.cle);
        e.className = 'somEtoile' + (oui ? ' on' : '');
        e.textContent = oui ? '★' : '☆';
        e.title = oui ? 'Retirer de mes favoris' : 'Ajouter à mes favoris';
        e.setAttribute('aria-label', (oui ? 'Retirer des favoris : ' : 'Ajouter aux favoris : ') + x.nom);
        e.addEventListener('click', () => basculerFavori(onglet, x.cle));
        env.appendChild(e);
        g.appendChild(env);
      });
      corps.appendChild(g);
    });
    if(!vus){
      const v = document.createElement('div');
      v.className = 'empty';
      v.textContent = (avecEleves ? 'Aucun élève ni aucun écran de cet onglet ne parle de « ' : 'Aucun écran de cet onglet ne parle de « ') +
        champ.value.trim() + ' ». La loupe 🔍, en haut, cherche dans toute l’App.';
      corps.appendChild(v);
    }
  };
  champ.addEventListener('input', dessiner);
  champ.addEventListener('keydown', e => {
    if(e.key !== 'Enter') return;
    /* Entrée : un seul élève trouvé → son dossier ; sinon un seul écran → l'écran */
    const el = corps.querySelectorAll('.somEleve');
    if(el.length === 1){ el[0].click(); return; }
    if(el.length) return;
    const l = corps.querySelectorAll('.somOuvrir');
    if(l.length === 1) l[0].click();
  });
  dessiner();
  if(aLeFocus){ try{ champ.focus(); champ.setSelectionRange(mot.length, mot.length); }catch(e){} }
}

/* L'écran « Sommaire » (réveillé par reveillerVue) */
function dessinerSommaire(onglet){
  const c = carteDuSommaire(onglet);
  if(!c) return;
  let corps = c.querySelector('.somCorps');
  if(!corps){
    c.innerHTML = '';
    const h = document.createElement('h2');
    h.className = 'section-title';
    h.textContent = '🔳 ' + somNomOnglet(onglet) + ' — que veux-tu faire ?';
    c.appendChild(h);
    corps = document.createElement('div');
    corps.className = 'somCorps';
    c.appendChild(corps);
  }
  remplirSommaire(onglet, corps, null);
}
/* Un favori a changé : le sommaire à l'écran (ou sa feuille) se redessine */
function rafraichirSommaire(onglet){
  const c = document.querySelector('.card[data-vue="sommaire"][data-onglet="' + onglet + '"] .somCorps');
  if(c && c.offsetParent) remplirSommaire(onglet, c, null);
  const f = document.querySelector('.somFeuille[data-onglet="' + onglet + '"] .somCorps');
  if(f && f._fermer) remplirSommaire(onglet, f, f._fermer);
}

/* La feuille du téléphone */
function ouvrirFeuilleSommaire(onglet){
  document.querySelectorAll('.somFeuille').forEach(x => x.remove());
  const fond = document.createElement('div');
  fond.className = 'overlay show somFeuille';
  fond.setAttribute('data-onglet', onglet);
  const boite = document.createElement('div');
  boite.className = 'modal';
  const fermer = () => { document.removeEventListener('keydown', auClavier); fond.remove(); };
  const auClavier = e => { if(e.key === 'Escape') fermer(); };
  document.addEventListener('keydown', auClavier);
  fond.addEventListener('click', e => { if(e.target === fond) fermer(); });

  const tete = document.createElement('div');
  tete.className = 'somTete';
  const h = document.createElement('h3');
  h.textContent = somNomOnglet(onglet) + ' — que veux-tu faire ?';
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'btn btn-secondary somFermer';
  x.textContent = '✕';
  x.setAttribute('aria-label', 'Fermer');
  x.addEventListener('click', fermer);
  tete.append(h, x);
  boite.appendChild(tete);
  const corps = document.createElement('div');
  corps.className = 'somCorps';
  corps._fermer = fermer;
  boite.appendChild(corps);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  remplirSommaire(onglet, corps, fermer);
}

/* ============================================================
   🔎 CE QUE LA LOUPE SAIT DE L'APP

   David : « qu'elle cherche partout dans l'app en fonction des mots
   tapés et qu'elle propose partout où ça le contient », puis : pas
   les bilans ni les tâches, « juste ce qui concerne l'app en elle-
   même ». Donc : les écrans (leur nom, leur phrase, leurs mots-clés),
   ce qu'ils contiennent (tiroirs, sous-onglets), les rubriques du
   dossier d'un élève et les lignes du menu ⋯.

   Tout est déjà dans le téléphone : rien n'est demandé au serveur, la
   réponse vient à la frappe. Et chacun ne trouve que les écrans que
   ses droits lui ouvrent.
   ============================================================ */
function ecranOuvrable(onglet, v){
  const cle = v[0], droit = v[2];
  const admin = (typeof ACCES !== 'undefined') && ACCES && ACCES.role === 'admin';
  if(typeof ongletsDisponibles === 'function' && ongletsDisponibles().indexOf(onglet) === -1) return false;
  /* les écrans que le menu réserve aux administrateurs (construireBarresVues) */
  if(['journal', 'activite', 'direct', 'admin', 'base', 'allo', 'drivup', 'ouverture'].indexOf(cle) !== -1 &&
     (onglet === 'outils' || onglet === 'gestion')) return admin;
  if(onglet === 'outils' && cle === 'mails') return admin;
  if(cle === 'aidereponses') return typeof amPeut === 'function' ? amPeut() : admin;
  if(cle === 'charges') return admin && typeof aDroit === 'function' && aDroit('charges');
  if(cle === 'depart') return typeof aDroit === 'function' && aDroit('depart') && (admin || ACCES.role === 'bureau');
  if(typeof aDroit !== 'function') return true;
  if(cle === 'formations' && !aDroit('formations')) return !!window.FE_FORMATEUR;
  return Array.isArray(droit) ? droit.some(aDroit) : aDroit(droit);
}

function chercherDansLApp(q){
  const cible = somNorme(q);
  if(!cible || cible.length < 2 || typeof VUES === 'undefined') return [];
  const dedans = s => somNorme(s).indexOf(cible) !== -1;
  const sansLogo = s => String(s).replace(/^\s*\S+\s+/, '');
  const logoDe = s => (String(s).match(/^\s*(\S+)\s/) || [])[1] || '▸';
  const out = [];

  Object.keys(VUES).forEach(onglet => {
    const ongletNom = somNomOnglet(onglet);
    (VUES[onglet] || []).forEach(v => {
      if(!ecranOuvrable(onglet, v)) return;
      const cle = v[0], nom = sansLogo(v[1]), logo = logoDe(v[1]);
      const info = ECRANS_INFOS[onglet + '/' + cle] || ['', ''];
      const ecran = { onglet: onglet, vue: cle, nom: v[1], ou: ongletNom };
      if(dedans(nom)){
        out.push({ rang: 0, logo: logo, titre: nom, sous: info[0], ou: ongletNom, ecran: ecran });
      }else if(dedans(info[0]) || dedans(info[1]) || dedans(ongletNom)){
        out.push({ rang: 2, logo: logo, titre: nom, sous: info[0], ou: ongletNom, ecran: ecran });
      }
      (INDEX_TIROIRS[onglet + '/' + cle] || []).forEach(t => {
        if(dedans(t)) out.push({ rang: 1, logo: logo, titre: nom + ' › ' + t, sous: 'Dans cet écran', ou: ongletNom, ecran: ecran, tiroir: t });
      });
    });
  });

  /* Les rubriques du dossier d'un élève */
  if(typeof ONGLETS_ELEVE !== 'undefined' && typeof aDroit === 'function' && aDroit('eleves')){
    const admin = (typeof ACCES !== 'undefined') && ACCES && ACCES.role === 'admin';
    ONGLETS_ELEVE.forEach(o => {
      if(o.admin && !admin) return;
      if(o.roles && o.roles.indexOf(ACCES.role) === -1) return;
      if(!o.admin && typeof sectionVisible === 'function' && !sectionVisible(o.section)) return;
      if(!dedans(o.titre)) return;
      out.push({ rang: 1, logo: o.emoji, titre: 'Dossier d’un élève › ' + o.titre, sous: 'Une rubrique du dossier', ou: 'Élèves', rubrique: o.cle });
    });
  }

  /* Les lignes du menu ⋯ (guide, vidéos, graphisme…) : celles qu'on voit */
  document.querySelectorAll('#plusMenu a, #plusMenu button').forEach(el => {
    if(el.style.display === 'none' || el.hidden || el.classList.contains('non')) return;
    /* 🛡 v1605 — pas les boutons de l'alarme : « Absent » sans son agence ne veut rien dire */
    if(el.closest('.alBloc')) return;
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if(!t || t.length > 60 || !dedans(t)) return;
    out.push({ rang: 3, logo: logoDe(t + ' '), titre: sansLogo(t), sous: 'Dans le menu ⋯, en haut', ou: 'Menu ⋯', element: el });
  });

  out.sort((a, b) => a.rang - b.rang);
  return out.slice(0, 14);
}

/* Y aller : l'écran, puis le tiroir s'il y en a un */
function allerAuResultat(x){
  if(!x) return;
  if(x.element){ try{ x.element.click(); }catch(e){} return; }
  if(x.rubrique){
    /* Le dossier se rouvre sur la dernière rubrique choisie : on la pose */
    try{ localStorage.setItem('onglet_page_eleve', x.rubrique); }catch(e){}
    if(typeof elevePageOuverte !== 'undefined' && elevePageOuverte && typeof choisirOngletEleve === 'function'){
      if(typeof afficherOnglet === 'function') afficherOnglet('eleves');
      if(typeof afficherVue === 'function') afficherVue('eleves', 'dossier');
      choisirOngletEleve(x.rubrique);
    }else{
      if(typeof ouvrirLEcran === 'function') ouvrirLEcran({ onglet: 'eleves', vue: 'dossier' });
      if(typeof showToast === 'function') showToast('Ouvre un élève : son dossier s’ouvrira sur cette rubrique.');
    }
    return;
  }
  if(typeof ouvrirLEcran === 'function') ouvrirLEcran(x.ecran);
  if(x.tiroir) viserLeTiroir(x.tiroir);
}

/* Le tiroir arrive après l'écran : on le cherche quelques secondes,
   on l'ouvre, on le montre (la même patience que viserLaPersonne). */
function viserLeTiroir(texte, essais){
  const cible = somNorme(texte);
  const zone = document.getElementById('appView');
  let trouve = null;
  if(zone){
    const l = zone.querySelectorAll('summary, h3, h4, .tdOnglet, .sousonglets button, .ckpOnglet');
    for(let i = 0; i < l.length; i++){
      const e = l[i];
      if(e.closest('.hors-vue, .hors-onglet')) continue;
      if(somNorme(e.textContent).indexOf(cible) === -1) continue;
      trouve = e;
      break;
    }
  }
  if(!trouve){
    const reste = (essais === undefined ? 20 : essais) - 1;
    if(reste > 0) setTimeout(() => viserLeTiroir(texte, reste), 200);
    return;
  }
  let p = trouve.parentElement;
  while(p && p !== document.body){
    if(p.tagName === 'DETAILS' && !p.open) p.open = true;
    p = p.parentElement;
  }
  if(trouve.tagName === 'BUTTON'){ try{ trouve.click(); }catch(e){} }
  try{ trouve.scrollIntoView({ behavior: 'smooth', block: 'center' }); }catch(e){}
  document.querySelectorAll('.vise').forEach(x => x.classList.remove('vise'));
  trouve.classList.add('vise');
  setTimeout(() => trouve.classList.remove('vise'), 3000);
}

/* Le mot cherché, surligné dans un texte (rendu en HTML sûr). Sans
   accents ni majuscules, comme la recherche ; si le texte ne se laisse
   pas comparer lettre à lettre, il sort tel quel. */
function somSurligner(texte, q){
  const t = String(texte || ''), cible = somNorme(q);
  const n = somNorme(t);
  if(!cible || n.length !== t.length) return somEch(t);
  let out = '', i = 0;
  while(i < t.length){
    const j = n.indexOf(cible, i);
    if(j === -1){ out += somEch(t.slice(i)); break; }
    out += somEch(t.slice(i, j)) + '<mark class="somMarque">' + somEch(t.slice(j, j + cible.length)) + '</mark>';
    i = j + cible.length;
  }
  return out;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-sommaire.js'] = true;
