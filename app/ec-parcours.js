/* Déployé le 19/09/2026 à 12:55 — v1056 */
/* =========================================================
   Bilans de conduite — Évolution Conduites
   À coller dans Extensions > Apps Script de la feuille.

   Colonnes : A Date | B Site | C Moniteur | D Élève | E Bilan
              F Type de bilan | G Note interne | H Enregistré le
              I Boîte | J Dossier ANTS | K Manœuvres validées

   Deux onglets annexes sont créés automatiquement : « Preparations »
   « Consignes » (messages du bureau vers les moniteurs) et
   « SuiviPermis » (préparation administrative des passages).
   Colonnes : A Id | B Date du cours | C Élève | D Type | E Libellé
              F Site | G Note | H Contexte | I Préparé par | J Créé le
   ========================================================= */

/* Numéro de version : l'application le lit et prévient si le
   script déployé n'est pas à jour. NE PAS SUPPRIMER. */
var VERSION_SCRIPT = 226;

/* ⚠️ LA SEULE COPIE DE L'ADRESSE QUI RESTE — v221, 12 septembre 2026.

   L'application, elle, déduit ses liens de l'adresse de la page
   qu'elle occupe : elle n'a rien eu à changer au déménagement vers
   app.evolutionconduites.fr. Ce script-ci tourne chez Google, il
   n'occupe aucune page, il ne peut rien déduire. Sa copie est donc
   inévitable — mais elle est ici, seule et nommée, pas noyée au
   milieu d'un modèle de mail à la ligne sept mille. */
var LIEN_ESPACE_ELEVE = 'https://app.evolutionconduites.fr/eleve.html';


/* ============================================================
   LA SERRURE

   Ce script est déployé en « accessible à tous » — il le doit :
   un Worker Cloudflare n'a pas de compte Google. Jusqu'ici, toute
   la protection tenait donc au SECRET DE SON ADRESSE. Or une
   adresse n'est pas un secret : elle passe dans les journaux, les
   historiques, les captures d'écran, et elle ne se change pas sans
   redéployer.

   Le Worker prouve désormais qui il est avec un secret partagé,
   rangé ici dans les propriétés du script et là-bas dans une
   variable d'environnement.

   QUATRE PORTES RESTENT OUVERTES, ET C'EST VOULU :
     · « cours » et « coursConfirmer » — le lien de confirmation de
       présence. Son jeton fait l'autorisation à lui seul, et il ne
       vaut que pour ce cours-là ;
     · « ecran » — les téléviseurs de l'agence, qui n'ont pas de
       compte ;
     · « diagnostic » — ET C'EST LA LEÇON DE LA PREMIÈRE POSE.

       Il était derrière la serrure. Le classeur refusait donc de
       dire son état à qui n'avait pas le secret — c'est-à-dire
       exactement à celui qui cherche POURQUOI il est refusé. Le
       voyant affichait alors « classeur encore ouvert à tous »
       pendant que plus rien ne passait : le contraire de la
       vérité, au pire moment.

       Un diagnostic derrière la porte qu'il diagnostique ne sert
       à rien. Il ne rend jamais le secret : seulement s'il y en a
       un, et si celui qui demande a le bon. Le Worker, lui, le
       réserve déjà aux administrateurs.

   TANT QU'AUCUN SECRET N'EST POSÉ, TOUT PASSE COMME AVANT.

   C'est délibéré, et c'est ce qui rend le déploiement sûr : ce
   script peut partir seul, sans le Worker, sans rien casser. On
   pose le secret EN DERNIER, une fois les deux côtés en place, et
   la serrure se ferme à cet instant. L'action « diagnostic » dit à
   tout moment si elle est armée — sans quoi on croirait avoir
   fermé une porte qu'on a laissée ouverte.
   ============================================================ */
/* ⚠️ CE QUE CES PORTES OUVERTES OUVRENT, EXACTEMENT.

   « rvt » et « rvtRepondre » y entrent pour la même raison que
   « cours » : c'est une famille qui les ouvre depuis un mail, sans
   compte ni code. Le JETON fait l'autorisation, et il ne vaut que
   pour cette proposition-là.

   Ce qu'elles peuvent faire est délibérément minuscule : lire les
   créneaux d'un tour et y écrire des « oui / non ». Elles ne rendent
   aucun nom d'autre élève, ne touchent à aucune fiche de suivi, et
   « rvtRepondre » refuse dès que le tour est clos. Une porte ouverte
   ne se juge pas à qui la pousse, mais à ce qu'il y a derrière. */
var ACTIONS_SANS_SECRET = { cours: 1, coursConfirmer: 1, ecran: 1,
                            diagnostic: 1, rvt: 1, rvtRepondre: 1 };

function secretAttendu() {
  try {
    return String(PropertiesService.getScriptProperties()
                    .getProperty('SECRET_PARTAGE') || '').trim();
  } catch (e) {
    /* Propriétés illisibles : on ne ferme pas une porte qu'on ne
       saurait pas rouvrir. */
    return '';
  }
}

/* Comparaison à durée constante. Une comparaison qui s'arrête au
   premier caractère différent se mesure, et se remonte lettre par
   lettre. */
function memeSecret(recu, attendu) {
  var a = String(recu || '');
  var b = String(attendu || '');
  if (a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function porteFermee(action, secretRecu) {
  var attendu = secretAttendu();
  if (!attendu) return false;                          /* pas encore armée */
  if (ACTIONS_SANS_SECRET[String(action || '')]) return false;
  return !memeSecret(secretRecu, attendu);
}

/* Les feuilles techniques créées par l'application.
   Elles ne doivent jamais être prises pour la feuille des bilans. */
var FEUILLES_TECHNIQUES = ['Journal', 'Modeles', 'Resultats', 'Captures',
                           'Eleves', 'Preparations', 'Consignes', 'SuiviPermis',
                           'Config', 'Depots', 'CoutsIA'];

/* La feuille des bilans.
   Elle était repérée par sa position, ce qui a cessé de fonctionner
   dès qu'une feuille technique s'est insérée avant elle. */
function feuille() {
  var f = SpreadsheetApp.getActiveSpreadsheet();

  var nommee = f.getSheetByName('Bilans');
  if (nommee) return nommee;

  /* Sinon : la première feuille qui n'est pas une feuille technique */
  var toutes = f.getSheets();
  for (var i = 0; i < toutes.length; i++) {
    if (FEUILLES_TECHNIQUES.indexOf(toutes[i].getName()) === -1) return toutes[i];
  }
  return toutes[0];
}

function reponseJson(objet) {
  objet.versionScript = VERSION_SCRIPT;
  return ContentService
    .createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   LA CLÉ D'IDENTITÉ D'UN ÉLÈVE — ET ELLE EST LA MÊME PARTOUT

   Minuscules, sans accents, et toute ponctuation ramenée à un
   espace. C'est ce qui décide que deux lignes du classeur parlent
   de la même personne.

   ⚠️ ELLE NE DISAIT PAS LA MÊME CHOSE QUE CELLE DU WORKER — v1017.

   Le Worker en portait une deuxième, avec en commentaire « la même
   normalisation qu'Apps Script ». Elle ne l'était pas : celle d'ici
   gardait les traits d'union et les apostrophes, celle du Worker les
   remplaçait par des espaces.

       « Jean-Pierre O'Brien »  →  jean-pierre o'brien   (ici)
                                →  jean pierre o brien   (Worker)

   Les deux couches lisent le MÊME classeur pour répondre aux mêmes
   questions : un élève au nom composé ou avec une apostrophe
   pouvait donc être retrouvé par l'une et pas par l'autre, selon
   l'écran — un bilan rattaché à personne, une formation lue vide,
   un doublon de fiche.

   ⚠️ POURQUOI C'EST LA RÈGLE TOLÉRANTE QUI GAGNE, ET PAS CELLE-CI.

   « Jean-Pierre Martin » et « Jean Pierre Martin » ne sont pas deux
   personnes : c'est un nom tapé deux fois, par deux mains. La règle
   tolérante les réunit, la stricte les sépare. Et les deux fautes ne
   coûtent pas le même prix : réunir à tort fait « trouver plus »,
   séparer à tort fait PERDRE la moitié du dossier d'un élève, en
   silence. C'est aussi ce que la moitié de l'application fait déjà,
   puisque le Worker sert aujourd'hui l'essentiel des lectures.

   Le seul risque de la tolérance est la suppression par nom
   (feuilles EnCours, Consignes, RVP) : elle emporterait les deux
   orthographes d'un coup. Ce sont précisément les lignes en double
   du même élève — c'est ce qu'on veut.

   ⚠️ AUCUNE CLÉ NORMALISÉE N'EST ÉCRITE DANS UNE FEUILLE : les
   appels d'ici ne servent qu'à comparer en mémoire, au moment de
   lire. Changer la règle ne laisse donc rien de périmé derrière.

   test-meme-cle-partout.js exécute les deux et les compare nom par
   nom : deux moteurs, une seule identité.
   ============================================================ */
function normaliser(valeur) {
  return String(valeur || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/* Sheets convertit parfois une date en objet : on la remet en texte lisible */
function texteCellule(valeur, avecHeure) {
  if (valeur instanceof Date) {
    /* Anciennes lignes converties en date par Sheets : on utilise le
       fuseau de la FEUILLE, pas celui du script, qui peut différer. */
    var fuseau = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    var format = avecHeure ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy';
    return Utilities.formatDate(valeur, fuseau, format);
  }
  return String(valeur || '');
}

/* ---------- ÉCRITURE : enregistrer un bilan ---------- */
/* ============================================================
   JOURNAL D'ACTIVITÉ
   Qui a fait quoi, et quand. Réservé aux administrateurs.
   L'écriture se fait ici, dans la même exécution que l'action :
   aucun appel réseau supplémentaire côté application.
   ============================================================ */
var JOURS_CONSERVATION = 90;      /* au-delà, les lignes sont effacées */
var MAX_LIGNES_JOURNAL = 20000;   /* garde-fou si le volume explose */

var LIBELLES_ACTION = {
  append:          'Bilan enregistré',
  supprimerEleve:  'Dossier élève supprimé',
  archiverDossier: 'Dossier archivé avant effacement',
  prepAdd:         'Cours préparé',
  prepDelete:      'Cours préparé supprimé',
  prepAssign:      'Cours réattribué',
  consigneAdd:     'Message au moniteur',
  consigneDone:    'Message traité',
  consigneEffacerEleve: "Messages d'un élève effacés",
  suiviSet:        'Fiche de suivi modifiée',
  suiviDelete:     'Fiche de suivi supprimée',
  modeleSet:       'Modèle de message modifié',
  modeleDelete:    'Modèle de message supprimé',
  resultatAdd:     "Résultat d'examen enregistré",
  captureAdd:      'Capture CEPC ajoutée',
  tacheSet:        'Tâche enregistrée',
  tacheDelete:     'Tâche supprimée',
  elevesImport:    'Liste d\'élèves importée',
  bilanModifier:   'Bilan corrigé',
  bilanMaj:        'Bilan mis à jour',
  bilanSupprimer:  'Bilan supprimé',
  smsLog:          'SMS envoyé',
  ficheSet:        "Fiche d'élève modifiée",
  eleveRetirer:    'Élève retiré du répertoire',
  msgBandeauSet:    'Message épinglé écrit',
  msgBandeauDelete: 'Message épinglé retiré',
  msgBandeauRelance: 'Message épinglé relancé',
  /* Le nom est la clé du dossier : le corriger touche une vingtaine
     de feuilles. Ça se trace. */
  eleveRenommer:   'Nom d\'élève corrigé',
  captureDelete:   'Capture CEPC supprimée',
  configSet:       'Réglage des places',
  depotAdd:        'Dépôt en banque enregistré',
  depotDelete:     'Dépôt en banque supprimé',
  /* Lire le code d'un élève n'est pas une modification, mais c'est
     une consultation qui doit laisser une trace : c'est la clé de
     son espace. */
  accesEleveCode:  "Code d'espace élève consulté",
  accesEleveSet:   "Accès d'un élève modifié",
  coursRetirer:    'Cours retiré de la liste « non terminés »'
};

/* ============================================================
   UNE CELLULE N'EST PAS UNE FORMULE

   Une valeur qui commence par « = » devient une formule dès qu'un
   humain ouvre le classeur. Une formule s'exécute chez Google, et
   IMPORTXML sait envoyer les colonnes voisines vers un domaine
   tiers : le contenu d'un champ libre devient une fuite, sans que
   personne ne clique sur rien.

   String() ne protège pas : il garantit le type, pas l'inertie de
   la cellule. Le bon réflexe existait déjà ici — setNumberFormat
   en texte avant l'écriture du chemin principal — mais il n'était
   appliqué qu'à un cinquième des écritures.

   On ne touche QUE le signe égal, et volontairement. « + », « - »
   et « @ » sont des soucis de tableur d'une autre époque : les
   échapper transformerait des montants négatifs en texte, ce qui
   casserait des totaux pour se protéger de rien.

   Les nombres et les dates passent intacts : ce sont eux qui
   doivent rester calculables.
   ============================================================ */
function cellule(v) {
  if (typeof v !== 'string') return v;
  return /^\s*=/.test(v) ? ("'" + v) : v;
}

/* Toute écriture de ligne passe par ici. Une seule porte : il
   suffisait d'un appendRow oublié pour rouvrir le trou. */
function ajouterLigne(sh, valeurs) {
  /* Le SEUL appendRow du fichier — le test le vérifie. Il aura
     suffi d'un remplacement automatique un peu trop zélé pour que
     cette fonction s'appelle elle-même : la boucle infinie était
     à une ligne près. */
  return sh.appendRow((valeurs || []).map(cellule));
}

function feuilleJournal() {
  var f = classeur();
  var sh = f.getSheetByName('Journal');
  if (!sh) {
    sh = f.insertSheet('Journal', f.getNumSheets());
    ajouterLigne(sh, ['Horodatage', 'Utilisateur', 'Rôle', 'Action', 'Élève', 'Détail']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function journaliser(action, params) {
  try {
    if (!LIBELLES_ACTION[action]) return;         /* seules les actions qui modifient */

    /* UNE ACTION SANS NOM S'ÉCRIT QUAND MÊME.

       Elle ne s'écrivait pas — « on n'invente pas ». Mais c'est
       justement la ligne qu'on veut voir : le Worker renseigne
       toujours le demandeur, donc une modification anonyme est,
       par construction, un appel qui ne vient pas de lui. La taire
       revenait à effacer la seule trace d'une intrusion. */
    var demandeur = String((params && params.demandeur) || '').trim()
                    || 'inconnu (appel direct)';

    var sh = feuilleJournal();
    ajouterLigne(sh, [
      new Date(),
      demandeur,
      String((params && params.role) || ''),
      LIBELLES_ACTION[action],
      String((params && params.eleve) || ''),
      detailAction(action, params)
    ]);

    /* Nettoyage occasionnel, pour ne pas ralentir chaque écriture */
    if (Math.random() < 0.02) purgerJournal(sh);
  } catch (e) { /* le journal ne doit jamais bloquer une action */ }
}

function detailAction(action, p) {
  p = p || {};
  /* Sans l'ancienne orthographe, la ligne du journal ne permet pas
     de retrouver ce qui a été renommé — ni de revenir dessus. */
  if (action === 'eleveRenommer') {
    return String(p.ancien || '') + ' → ' + String(p.nouveau || '');
  }
  if (action === 'prepAdd' || action === 'prepAssign') {
    return String(p.modeleLabel || p.modele || '') +
           (p.moniteur ? ' → ' + p.moniteur : '') +
           (p.date ? ' le ' + p.date : '');
  }
  /* Un résultat d'examen : sans son contenu, la ligne du journal
     ne dit pas ce qui a été noté — ni comment le corriger. */
  if (action === 'resultatAdd') {
    var bouts = [];
    if (p.resultat) bouts.push(p.resultat);
    if (p.dateExamen) bouts.push('le ' + p.dateExamen);
    if (p.centre) bouts.push(p.centre);
    return bouts.join(' · ').slice(0, 200);
  }

  if (action === 'depotAdd') {
    return String(p.total || '') + ' \u20ac' +
           (p.nbCheques ? ' \u00b7 ' + p.nbCheques + ' ch\u00e8que(s)' : '');
  }
  /* L'archive : ce qu'on a gardé, et sous quel nom. Sans ces deux
     informations, la ligne du journal ne permet pas de retrouver le
     fichier — donc ne sert à rien le jour où on le cherche. */
  if (action === 'archiverDossier') {
    return String(p.lignes || 0) + ' ligne(s) — ' + String(p.fichier || '');
  }
  if (action === 'consigneAdd') return String(p.texte || '').slice(0, 200);
  if (action === 'append')      return String(p.type || '') + (p.site ? ' · ' + p.site : '');
  if (action === 'suiviSet') {
    var bouts = [];
    ['datePermis', 'centre', 'moniteurDate', 'semaine', 'resultat', 'ebDatePrevue', 'ebMoniteur']
      .forEach(function (k) { if (p[k]) bouts.push(k + ' = ' + p[k]); });
    return bouts.join(' · ').slice(0, 300);
  }
  return '';
}

function purgerJournal(sh) {
  var derniere = sh.getLastRow();
  if (derniere < 2) return;

  /* UNE SEULE COLONNE. Elle lisait les six, sur toute la feuille,
     pour ne regarder que les dates — et cela une fois sur
     cinquante écritures, donc en plein travail de quelqu'un. */
  var dates = sh.getRange(2, 1, derniere - 1, 1).getValues();

  var limite = new Date();
  limite.setDate(limite.getDate() - JOURS_CONSERVATION);

  var aSupprimer = 0;
  for (var i = 0; i < dates.length; i++) {
    var d = dates[i][0];
    if (d instanceof Date && d >= limite) break;   /* la feuille est chronologique */
    aSupprimer++;
  }
  /* Garde-fou de volume, même si les lignes sont récentes */
  var trop = dates.length - MAX_LIGNES_JOURNAL;
  if (trop > aSupprimer) aSupprimer = trop;

  if (aSupprimer > 0) sh.deleteRows(2, aSupprimer);
}

/* ============================================================
   ALERTES DU JOURNAL
   Une activité inhabituelle se repère sur des volumes, pas sur
   des actions isolées. On les calcule à la lecture du journal.
   ============================================================ */
var SEUIL_SUPPRESSIONS = 5;    /* suppressions par personne et par jour */
var SEUIL_ACTIONS = 80;        /* actions par personne et par jour */
var HEURE_TARDIVE = 22;        /* au-delà, on le signale */
var HEURE_MATINALE = 6;

function alertesJournal(lignes) {
  var parJourEtQui = {};

  lignes.forEach(function (l) {
    if (!l.jour || !l.qui) return;
    var k = l.jour + '|' + l.qui;
    if (!parJourEtQui[k]) {
      parJourEtQui[k] = { jour: l.jour, qui: l.qui, total: 0,
                          suppressions: 0, tardives: 0, eleves: {} };
    }
    var g = parJourEtQui[k];
    g.total++;
    if (/supprim/i.test(l.action)) g.suppressions++;
    if (l.eleve) g.eleves[l.eleve] = true;

    var h = parseInt(String(l.quand).slice(-5, -3), 10);
    if (!isNaN(h) && (h >= HEURE_TARDIVE || h < HEURE_MATINALE)) g.tardives++;
  });

  var out = [];
  Object.keys(parJourEtQui).forEach(function (k) {
    var g = parJourEtQui[k];

    if (g.suppressions >= SEUIL_SUPPRESSIONS) {
      out.push({
        gravite: 'haute', jour: g.jour, qui: g.qui,
        titre: g.suppressions + ' suppressions en une journée',
        detail: 'Vérifie que c\'est bien voulu.'
      });
    }
    if (g.total >= SEUIL_ACTIONS) {
      out.push({
        gravite: 'moyenne', jour: g.jour, qui: g.qui,
        titre: g.total + ' actions en une journée',
        detail: 'Volume inhabituel, sur ' + Object.keys(g.eleves).length + ' élève(s).'
      });
    }
    if (g.tardives >= 10) {
      out.push({
        gravite: 'basse', jour: g.jour, qui: g.qui,
        titre: g.tardives + ' actions entre 22h et 6h',
        detail: 'Travail en dehors des heures habituelles.'
      });
    }
  });

  out.sort(function (a, b) { return b.jour.localeCompare(a.jour); });
  return out;
}

/* ------------------------------------------------------------
   LE JOURNAL SE LIT PAR LA FIN, ET PAR MORCEAUX

   Il lisait la feuille ENTIÈRE — jusqu'à vingt mille lignes sur
   six colonnes — pour en rendre trois cents. Tant que seules
   quelques actions y entraient, ça passait. Depuis que
   « journaliser » est remonté au tout début de doPost (v765),
   TOUT y entre : le volume a été multiplié, et l'écran est devenu
   très long à s'ouvrir. La correction d'un trou de sécurité a
   payé sa dette ici.

   La feuille est chronologique — la purge s'appuie déjà dessus. On
   part donc du bas et on remonte par blocs, en s'arrêtant dès
   qu'on a de quoi remplir l'écran. Sans filtre, un seul bloc
   suffit presque toujours.

   ET ON DIT CE QU'ON A LU. Une recherche qui s'arrête au budget
   sans le dire laisse croire que le reste n'existe pas.
   ------------------------------------------------------------ */
var JOURNAL_BLOC = 2000;        /* lignes lues d'un coup */
var JOURNAL_BUDGET = 12000;     /* au-delà, on s'arrête et on le dit */

function lireJournal(params) {
  var sh = feuilleJournal();
  var derniere = sh.getLastRow();
  var total = Math.max(derniere - 1, 0);

  var qui = normaliser((params && params.qui) || '');
  var eleve = normaliser((params && params.eleve) || '');
  var depuis = (params && params.depuis) ? String(params.depuis) : '';
  var max = parseInt((params && params.max) || '300', 10);
  if (!(max > 0)) max = 300;

  var out = [];
  if (total < 1) {
    return { status: 'ok', lignes: [], conservation: JOURS_CONSERVATION,
             total: 0, lues: 0, complet: true, plusAncienLu: '',
             alertes: [] };
  }

  var haut = derniere;          /* dernière ligne pas encore lue */
  var lues = 0;
  var arrete = false;
  var plusAncienLu = '';

  while (haut >= 2 && out.length < max && !arrete) {
    var combien = Math.min(JOURNAL_BLOC, haut - 1);
    var depart = haut - combien + 1;
    var lignes = sh.getRange(depart, 1, combien, 6).getValues();
    lues += combien;

    for (var i = lignes.length - 1; i >= 0 && out.length < max; i--) {
      if (!lignes[i][0]) continue;
      var iso = (lignes[i][0] instanceof Date)
        ? Utilities.formatDate(lignes[i][0], 'Europe/Paris', 'yyyy-MM-dd')
        : '';
      if (iso) plusAncienLu = iso;
      /* La feuille est chronologique : passé la date demandée, tout
         ce qui reste au-dessus est plus ancien encore. */
      if (depuis && iso && iso < depuis) { arrete = true; break; }
      if (qui && normaliser(lignes[i][1]).indexOf(qui) === -1) continue;
      if (eleve && normaliser(lignes[i][4]).indexOf(eleve) === -1) continue;

      out.push({
        quand: (lignes[i][0] instanceof Date)
          ? Utilities.formatDate(lignes[i][0], 'Europe/Paris', 'dd/MM/yyyy HH:mm')
          : String(lignes[i][0]),
        jour: iso,
        qui: texteCellule(lignes[i][1], false),
        role: texteCellule(lignes[i][2], false),
        action: texteCellule(lignes[i][3], false),
        eleve: texteCellule(lignes[i][4], false),
        detail: texteCellule(lignes[i][5], false)
      });
    }

    haut = depart - 1;
    if (lues >= JOURNAL_BUDGET) break;
  }

  /* « complet » : on a vraiment tout regardé, ou on s'est arrêté
     parce qu'on avait de quoi remplir l'écran ou atteint la date
     demandée. Faux quand le budget a coupé la recherche. */
  var complet = (haut < 2) || arrete || (out.length >= max);

  return { status: 'ok', lignes: out, conservation: JOURS_CONSERVATION,
           total: total, lues: lues, complet: complet,
           plusAncienLu: plusAncienLu,
           alertes: alertesJournal(out) };
}

/* ============================================================
   MODÈLES DE MESSAGE
   Textes rédigés par l'auto-école, modifiables depuis l'app.
   ============================================================ */
/* ⚠️ « Bilan » EST LA COLONNE QUI ARRÊTE LA DEVINETTE.

   Les types de séance des rappels sont des textes que David
   écrit elle-même — l'outil n'en fournit aucun d'origine. Le bilan
   à créer était donc DEVINÉ d'après le titre : « Permis voiture »
   ne tombait dans aucune règle et repartait en conduite ordinaire,
   donc en BEA d'après la fiche. Elle l'a signalé quinze fois, et
   toute correction de la devinette en cassait une autre.

   Le titre ne décide plus : le texte DIT quel bilan il produit. */
/* ⚠️ LA COLONNE « ÉTIQUETTES » — v958.

   Une fiche appartenait à UNE catégorie, et cette catégorie vivait
   dans son titre : « Permis › Félicitations ». Le commentaire
   d'origine le disait sans détour — « faute de colonne dédiée ».

   David : « il faut prévoir qu'une fiche soit dans plusieurs
   catégories et que je puisse la changer de catégorie. Tout sur le
   même principe que Keep. » Ce ne sont donc pas des dossiers mais
   des ÉTIQUETTES : une fiche n'est pas DANS l'une d'elles, elle en
   PORTE autant qu'on veut.

   Elles s'écrivent séparées par « · », comme les listes que le
   classeur porte déjà ailleurs. Une colonne vide vaut « aucune
   étiquette », ce qui est une réponse et non un trou. */
var EN_TETES_MODELES = ['Id', 'Usage', 'Nom', 'Contenu', 'Mis à jour le',
                        'Par', 'Boîte', 'Ordre', 'Consigne IA', 'Bilan',
                        'Étiquettes'];

function feuilleModeles() {
  var f = classeur();
  var sh = f.getSheetByName('Modeles');
  if (!sh) {
    sh = f.insertSheet('Modeles', f.getNumSheets());
    ajouterLigne(sh, EN_TETES_MODELES);
    sh.setFrozenRows(1);
    return sh;
  }

  /* Les colonnes ajoutées après coup : la feuille existe déjà chez
     l'auto-école, et elle n'a pas les en-têtes des nouveautés. On
     les pose sans toucher aux lignes — une colonne vide vaut
     « pas de consigne », donc rien ne change pour l'existant. */
  if (sh.getLastColumn() < EN_TETES_MODELES.length) {
    /* La grille d'abord : une feuille rognée à sept colonnes ferait
       échouer l'écriture, et feuilleModeles() est appelée partout —
       tous les modèles et toutes les procédures tomberaient avec. */
    var manquantes = EN_TETES_MODELES.length - sh.getMaxColumns();
    if (manquantes > 0) sh.insertColumnsAfter(sh.getMaxColumns(), manquantes);

    sh.getRange(1, 1, 1, EN_TETES_MODELES.length).setValues([EN_TETES_MODELES]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function listerModeles() {
  var lignes = feuilleModeles().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      id: String(lignes[i][0]),
      usage: texteCellule(lignes[i][1], false),
      nom: texteCellule(lignes[i][2], false),
      contenu: texteCellule(lignes[i][3], false),
      maj: texteCellule(lignes[i][4], false),
      par: texteCellule(lignes[i][5], false),
      /* Pour quelle boîte : BEA, BV, ou les deux. Vide = les deux. */
      boite: texteCellule(lignes[i][6], false),
      /* Comment l'IA doit corriger cette procédure-là. Le déroulé se
         récite dans l'ordre, l'inventaire des vérifications non. */
      ordre: texteCellule(lignes[i][7], false) === 'oui',
      consigne: texteCellule(lignes[i][8], false),
      /* Le bilan qu'un rappel de cours doit créer. Vide = c'est la
         fiche de l'élève qui décide, comme avant. */
      bilan: texteCellule(lignes[i][9], false),
      /* Les étiquettes, telles qu'écrites : c'est l'application qui
         les découpe, une seule fois, à un seul endroit. */
      etiquettes: texteCellule(lignes[i][10], false)
    });
  }
  return { status: 'ok', modeles: out };
}

function enregistrerModele(d) {
  var sh = feuilleModeles();
  var lignes = sh.getDataRange().getValues();
  var id = String(d.id || '').trim();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');
  var ligne = [
    id || ('m' + Date.now()),
    String(d.usage || 'libre'),
    String(d.nom || 'Sans titre'),
    String(d.contenu || ''),
    maintenant,
    String(d.demandeur || ''),
    String(d.boite || ''),
    /* Les consignes de correction ne valent que pour une procédure */
    (String(d.usage || '') === 'procedure' && d.ordre) ? 'oui' : '',
    (String(d.usage || '') === 'procedure') ? String(d.consigne || '') : '',
    /* Et seulement pour un rappel de cours : ailleurs, cette colonne
       n'aurait aucun sens et finirait par en prendre un. */
    (String(d.usage || '') === 'rappel_cours') ? String(d.bilan || '') : '',
    /* Les étiquettes valent pour toutes les fiches, celles que
       l'application emploie comme celles qu'on copie à la main. */
    String(d.etiquettes || '')
  ];

  if (id) {
    for (var i = 1; i < lignes.length; i++) {
      if (String(lignes[i][0]) === id) {
        sh.getRange(i + 1, 1, 1, ligne.length).setValues([ligne]);
        return { status: 'ok', id: id };
      }
    }
  }
  ajouterLigne(sh, ligne);
  return { status: 'ok', id: ligne[0] };
}

function supprimerModele(id) {
  var sh = feuilleModeles();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      return { status: 'ok' };
    }
  }
  return { status: 'ok', message: 'Déjà supprimé.' };
}

/* ============================================================
   RÉSULTATS D'EXAMEN
   Conservés à part : la fiche de suivi disparaît quand l'élève
   obtient son permis, il faut donc une trace durable.
   ============================================================ */
function feuilleResultats() {
  var f = classeur();
  var sh = f.getSheetByName('Resultats');
  if (!sh) {
    sh = f.insertSheet('Resultats', f.getNumSheets());
    ajouterLigne(sh, ['Date examen', 'Élève', 'Résultat', 'Boîte', 'Parcours',
                  'Moniteur', 'Centre', 'Rang', 'Enregistré le', 'Par']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function enregistrerResultat(d) {
  var sh = feuilleResultats();
  var eleve = String(d.eleve || '').trim();
  if (!eleve) return { status: 'error', message: 'Élève manquant.' };

  var dateEx = String(d.dateExamen || '');
  var lignes = sh.getDataRange().getValues();

  /* Un même examen ne doit pas compter deux fois */
  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][1]) === normaliser(eleve) &&
        String(lignes[i][0]) === dateEx) {
      sh.getRange(i + 1, 3).setValue(String(d.resultat || ''));
      return { status: 'ok', message: 'Résultat mis à jour.' };
    }
  }

  ajouterLigne(sh, [
    dateEx,
    eleve,
    String(d.resultat || ''),
    String(d.boite || ''),
    String(d.parcours || ''),
    String(d.moniteur || ''),
    String(d.centre || ''),
    String(d.rang || '1'),
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.demandeur || '')
  ]);
  return { status: 'ok' };
}

/* ============================================================
   RENSEIGNER LE MONITEUR D'UN RÉSULTAT — v218

   David, le 11 septembre 2026 : « il faut bien prendre pour le
   résultat le moniteur qui a fait le bilan d'examen officiel, pas
   celui qui renseigne le résultat », et « il faut une passe de
   rattrapage ».

   Les résultats déjà écrits portent, pour la plupart, le moniteur
   qui avait pris la date à la préfecture — ou personne. Ils sont
   hors de tout taux tant qu'ils n'ont pas de nom : sans savoir qui
   l'a présenté, compter c'est inventer. Cette action sert à leur
   en donner un, depuis l'écran Réussite.

   ⚠️ ELLE N'ÉCRIT QU'UNE COLONNE, ET SON NOM LE DIT.

   Elle s'appelle « resultatMoniteur » et non « resultatMaj » : la
   tentation, le jour où l'on voudra corriger un « reçu » saisi à
   la place d'un « ajourné », sera d'élargir celle-ci. Il ne faut
   pas. Le résultat d'un examen vit à DEUX endroits — ici, pour la
   statistique, et dans la fiche de suivi de l'élève, qu'un permis
   obtenu fait disparaître. Le corriger ici seulement, ce serait
   écrire la même chose à deux endroits et laisser le mauvais
   gagner. « resultatAnnuler » existe pour cela : il efface la
   ligne ET recrée le suivi.

   Le moniteur, lui, ne vit que dans cette colonne. C'est ce qui
   rend cette écriture sûre.
   ============================================================ */
function majMoniteurDuResultat(d) {
  var eleve = String((d && d.eleve) || '').trim();
  if (!eleve) return { status: 'error', message: 'Élève manquant.' };

  /* Le vide est une valeur : il efface une attribution fausse.
     C'est voulu — mieux vaut un résultat sans moniteur, qui se voit
     et se répare, qu'un résultat attribué au mauvais, qui ne se
     voit jamais. */
  var nom = String((d && d.moniteur) || '').trim();

  var sh = feuilleResultats();
  var lignes = sh.getDataRange().getValues();
  var cible = normaliser(eleve);
  var iso = dateVersIso(String((d && d.dateExamen) || ''));

  /* De la plus récente vers la plus ancienne : c'est celle qu'on
     vient de regarder à l'écran. */
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (normaliser(lignes[i][1]) !== cible) continue;
    /* Sans date, on prend la dernière ligne de cet élève. Avec une
       date, elle doit correspondre — et la comparaison passe par
       l'ISO : le classeur garde les dates dans la forme où elles
       ont été saisies, et « 09/10 » n'est pas après « 14/09 ». */
    if (iso && dateVersIso(lignes[i][0]) !== iso) continue;
    sh.getRange(i + 1, 6).setValue(nom);
    return { status: 'ok', eleve: eleve, moniteur: nom };
  }
  return { status: 'error', message: 'Résultat introuvable pour ' + eleve + '.' };
}

function listerResultats(params) {
  var lignes = feuilleResultats().getDataRange().getValues();
  var out = [];
  var depuis = String((params && params.depuis) || '');

  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][1]) continue;
    var iso = dateVersIso(lignes[i][0]);
    if (depuis && iso && iso < depuis) continue;
    out.push({
      date: texteCellule(lignes[i][0], false),
      iso: iso,
      eleve: texteCellule(lignes[i][1], false),
      resultat: texteCellule(lignes[i][2], false),
      boite: texteCellule(lignes[i][3], false),
      parcours: texteCellule(lignes[i][4], false),
      moniteur: texteCellule(lignes[i][5], false),
      centre: texteCellule(lignes[i][6], false),
      rang: texteCellule(lignes[i][7], false)
    });
  }
  return { status: 'ok', resultats: out };
}

/* ⚠️ LES MOIS EN TOUTES LETTRES SE LISENT AUSSI — v210.

   L'APPLICATION ÉCRIT « lundi 14 septembre 2026 » ET NE SAVAIT PAS
   LE RELIRE. C'est la faute la plus chère de ce dossier : le
   9 septembre 2026, David a déplacé des élèves d'une session
   d'examen à l'autre, et les places se sont vidées derrière elle.

   L'enchaînement, en entier, parce qu'il ne doit plus jamais se
   reproduire :

     · l'écran écrit la date sur la fiche par « dateEnToutesLettres »
       — c'est le format de TOUTE l'application, il s'affiche partout
       et il est écrit ainsi depuis le début ;
     · « enregistrerSuivi » relit cette date par ici pour savoir sur
       quelle session poser l'élève ;
     · cette fonction ne connaissait que « 14/09/2026 » et rendait
       une chaîne vide ;
     · et une chaîne vide, plus haut, ne veut pas dire « je n'ai pas
       compris » — elle veut dire « la date a été EFFACÉE », donc
       « il ne passe plus l'examen », donc on le retire de toutes
       ses places.

   Une place vidée par une date qu'on n'a pas su lire. L'écran, lui,
   ne relisait rien : le geste avait l'air d'avoir marché jusqu'au
   rechargement de la page.

   La règle qui manquait est en dessous, dans enregistrerSuivi — une
   date illisible n'est pas une date effacée — mais elle ne suffit
   pas : il faut aussi savoir lire ce qu'on écrit soi-même. Un outil
   qui parle deux langues doit les comprendre toutes les deux. */
var MOIS_FR = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10,
  novembre: 11, decembre: 12
};

/* Convertit une date française en format triable */
function dateVersIso(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, 'Europe/Paris', 'yyyy-MM-dd');
  }
  var t = String(v || '');
  var m = t.match(/(\d{1,2})[\/\s-](\d{1,2})[\/\s-](\d{4})/);
  if (m) {
    return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];

  /* « lundi 14 septembre 2026 », « 1er septembre 2026 », « 14 Août
     2026 » : le jour de semaine et le « er » se laissent de côté,
     les accents et la casse aussi. */
  var nu = t.toLowerCase()
            .replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e')
            .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o')
            .replace(/[ùûü]/g, 'u').replace(/ç/g, 'c');
  m = nu.match(/(\d{1,2})\s*(?:er)?\s+([a-z]+)\s+(\d{4})/);
  if (m && MOIS_FR[m[2]]) {
    return m[3] + '-' + ('0' + MOIS_FR[m[2]]).slice(-2) +
           '-' + ('0' + m[1]).slice(-2);
  }
  return '';
}

/* ============================================================
   CAPTURES DU CEPC
   Une feuille à part : une image par ligne, plusieurs par élève.
   Le suivi ne peut en contenir qu'une, faute de place.
   ============================================================ */
function feuilleCaptures() {
  var f = classeur();
  var sh = f.getSheetByName('Captures');
  if (!sh) {
    sh = f.insertSheet('Captures', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Élève', 'Date examen', 'Légende', 'Image', 'Ajouté le', 'Par']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function ajouterCapture(d) {
  var eleve = String(d.eleve || '').trim();
  if (!eleve) return { status: 'error', message: 'Élève manquant.' };
  if (!d.image) return { status: 'error', message: 'Image manquante.' };

  ajouterLigne(feuilleCaptures(), [
    'c' + Date.now(),
    eleve,
    String(d.dateExamen || ''),
    String(d.legende || ''),
    String(d.image),
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.demandeur || '')
  ]);
  return { status: 'ok' };
}

function listerCaptures(params) {
  var sh = feuilleCaptures();
  var nb = sh.getLastRow();
  if (nb < 2) return { status: 'ok', captures: [] };

  var eleve = normaliser((params && params.eleve) || '');

  /* On lit d'abord les colonnes légères pour repérer les lignes utiles.
     Charger toutes les images pour en garder deux coûterait des mégaoctets. */
  var meta = sh.getRange(2, 1, nb - 1, 4).getValues();
  var voulues = [];
  for (var k = 0; k < meta.length; k++) {
    if (!meta[k][0]) continue;
    if (eleve && normaliser(meta[k][1]) !== eleve) continue;
    voulues.push(k);
  }
  if (!voulues.length) return { status: 'ok', captures: [] };

  /* Puis les images, ligne par ligne, seulement celles retenues */
  var images = {};
  voulues.forEach(function (k) {
    images[k] = String(sh.getRange(k + 2, 5).getValue() || '');
  });

  var lignes = [null];
  meta.forEach(function (m, k) { lignes.push([m[0], m[1], m[2], m[3], images[k] || '', '', '']); });

  var out = [];
  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    if (eleve && normaliser(lignes[i][1]) !== eleve) continue;
    out.push({
      id: String(lignes[i][0]),
      eleve: texteCellule(lignes[i][1], false),
      dateExamen: texteCellule(lignes[i][2], false),
      legende: texteCellule(lignes[i][3], false),
      image: String(lignes[i][4] || ''),
      ajoute: ''
    });
  }
  return { status: 'ok', captures: out };
}

function supprimerCapture(id) {
  var sh = feuilleCaptures();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      return { status: 'ok' };
    }
  }
  return { status: 'ok', message: 'Déjà supprimée.' };
}

/* ============================================================
   ACCÈS AU CLASSEUR
   Ouvrir le classeur coûte du temps : on le fait une seule fois
   par exécution, pas à chaque fonction.
   ============================================================ */
var _classeur = null;
function classeur() {
  if (!_classeur) _classeur = SpreadsheetApp.getActiveSpreadsheet();
  return _classeur;
}

/* Feuille mémorisée, créée au besoin.
   Ne pas confondre avec feuille(), qui renvoie la feuille des bilans. */
var _feuilles = {};
function feuilleNommee(nom, entetes) {
  if (_feuilles[nom]) return _feuilles[nom];
  var f = classeur();
  var sh = f.getSheetByName(nom);
  if (!sh) {
    sh = f.insertSheet(nom, f.getNumSheets());
    if (entetes && entetes.length) {
      ajouterLigne(sh, entetes);
      sh.setFrozenRows(1);
    }
  }
  _feuilles[nom] = sh;
  return sh;
}

/* ============================================================
   RÉPERTOIRE DES ÉLÈVES
   Les noms proposés viennent des bilans déjà saisis. Un élève
   qui n'a pas encore de bilan n'existe donc nulle part : cette
   feuille permet d'importer la liste réelle de l'auto-école.
   ============================================================ */
/* Le poste de conduite de l'élève : conduite aménagée, coussin
   vert. Ce sont des faits de l'ÉLÈVE, pas du cours — un élève qui a
   besoin du coussin en a besoin à toutes ses leçons. Ils vivent
   donc sur sa fiche, et le moniteur les lit sur sa carte avant que
   l'élève monte dans la voiture.

   Colonnes 15 et 16, APRÈS « Ajouté le » et « Par » : les insérer
   au milieu aurait décalé d'un cran toutes les lignes déjà
   écrites, et le répertoire entier serait devenu faux. */
var COL_ELEVE_AMENAGEE = 15;
var COL_ELEVE_COUSSIN  = 16;
/* Quels aménagements, séparés par des « | ». Cocher « conduite
   aménagée » sans dire lesquels ne servirait à rien : le moniteur
   a besoin de savoir quoi monter dans la voiture. */
var COL_ELEVE_AMENAGEMENTS = 17;

/* LA DATE DE NAISSANCE (v185).

   Elle est ICI, avec l'identité, et pas dans SuiviPermis : c'est ce
   que l'élève est, pas où il en est. Elle ne change jamais.

   Et elle n'est pas du confort. En AAC, l'examen n'est possible qu'à
   17 ans révolus — le lendemain de l'anniversaire — et c'est cette
   date qui commande le rendez-vous pédagogique n°2. Sans elle, on ne
   peut ni annoncer une date d'examen possible, ni dire qu'un
   rendez-vous est en retard. L'écran dira donc « âge inconnu » et
   refusera d'annoncer quoi que ce soit : une devinette qui se
   présente comme un fait est pire qu'un blanc. */
var COL_ELEVE_NAISSANCE = 18;

/* ------------------------------------------------------------
   LE NOM TEL QU'ON L'AFFICHE — SAISI À LA MAIN

   L'écran public ne montre pas les noms entiers : il abrège. La
   règle était « le premier mot est le prénom, la dernière initiale
   est le nom ». David : « j'ai une personne qui s'appelle La
   Perle Mossongo Molodjo — La Perle c'est son prénom, Mossongo
   Molodjo son nom de famille, et j'ai des élèves avec plusieurs
   noms de famille ».

   Il n'existe AUCUNE règle qui sache couper ça. Rien dans la chaîne
   ne dit où finit le prénom : « La Perle Mossongo Molodjo » et
   « Jean Pierre Martin Dupont » ont exactement la même forme et se
   coupent à deux endroits différents. Une règle qui se trompe une
   fois sur dix sur un écran public n'est pas une règle, c'est un
   risque.

   D'où cette colonne : vide, c'est la règle par défaut qui parle ;
   remplie, c'est ce qui s'affiche, et rien d'autre. Sur trois cents
   élèves il y en aura une dizaine à corriger.
   ------------------------------------------------------------ */
var COL_ELEVE_NOM_AFFICHE = 19;
/* ⚠️ LE JOUR OÙ IL A QUITTÉ L'AUTO-ÉCOLE — v1038, étape 7.

   David : « c'est quand permis obtenu ET départ de l'auto-école
   aussi qu'il faut lui enlever les accès ».

   Le permis, lui, se lit tout seul dans les Résultats. Un DÉPART,
   rien ne l'enregistrait : l'élève restait au répertoire jusqu'à la
   suppression de son dossier, et gardait ses vidéos entre-temps.

   ⚠️ ÇA FERME, ÇA N'EFFACE PAS. Le dossier reste — c'est la
   suppression RGPD qui l'efface, plus tard, et c'est un autre
   geste, un autre jour. Une date vide veut dire « il est là ». */
var COL_ELEVE_PARTI_LE = 20;

var ENTETES_ELEVES_TARDIFS = [
  [COL_ELEVE_AMENAGEE, 'Conduite aménagée'],
  [COL_ELEVE_COUSSIN, 'Coussin vert'],
  [COL_ELEVE_AMENAGEMENTS, 'Aménagements'],
  [COL_ELEVE_NAISSANCE, 'Date de naissance'],
  [COL_ELEVE_NOM_AFFICHE, 'Nom affiché'],
  [COL_ELEVE_PARTI_LE, 'Parti le']
];

function feuilleEleves() {
  var f = classeur();
  var sh = f.getSheetByName('Eleves');
  if (!sh) {
    sh = f.insertSheet('Eleves', f.getNumSheets());
    ajouterLigne(sh, ['Élève', 'Téléphone', 'Email', 'Formation', 'Messenger',
                  'Remarques', 'Genre', 'Frise', 'Autre AE', 'Nom autre AE',
                  'Mail prescripteur', 'ANTS', 'Ajouté le', 'Par',
                  'Conduite aménagée', 'Coussin vert', 'Aménagements',
                  'Date de naissance']);
    sh.setFrozenRows(1);
    return sh;
  }

  /* La feuille existe depuis avant ces colonnes : y lire une colonne
     absente ferait échouer tout le répertoire. On l'élargit d'abord —
     une feuille rognée ferait échouer l'écriture même de l'en-tête. */
  var manque = COL_ELEVE_PARTI_LE - sh.getMaxColumns();
  if (manque > 0) sh.insertColumnsAfter(sh.getMaxColumns(), manque);
  ENTETES_ELEVES_TARDIFS.forEach(function (p) {
    if (!String(sh.getRange(1, p[0]).getValue() || '').trim()) {
      sh.getRange(1, p[0]).setValue(p[1]);
    }
  });
  return sh;
}

/* ============================================================
   UNE LIGNE DU RÉPERTOIRE, PAR NOM DE COLONNE

   ⚠️ C'EST ICI QU'ÉTAIT UN DÉFAUT, ET IL DURAIT DEPUIS LONGTEMPS.

   Les deux imports construisaient leur ligne en comptant les
   virgules :

     [nom, tel, mail, formation, '', '', genre, maintenant, demandeur]

   Neuf valeurs, donc « Ajouté le » tombait en colonne 8 et « Par »
   en colonne 9. Or la colonne 8, c'est la FRISE, et la 9 « Autre AE ».
   Chaque élève importé repartait avec une frise valant
   « 02/09/2026 11:20 » et une auto-école d'origine nommée d'après
   celui qui avait fait l'import.

   Personne ne pouvait le voir : une frise illisible ne plante pas,
   elle se contente de ne rien vouloir dire, et le questionnaire
   repose alors la question. C'est en cherchant où écrire la date de
   naissance que la colonne 18 a fait remonter le décalage.

   Une ligne se construit désormais par NOM de colonne. Compter des
   virgules, c'est se tromper une fois sur deux dès qu'on en ajoute.
   ============================================================ */
var COLONNES_REPERTOIRE = {
  eleve: 1, telephone: 2, email: 3, formation: 4, messenger: 5,
  remarques: 6, genre: 7, frise: 8, autreAE: 9, autreAENom: 10,
  mailPrescripteur: 11, ants: 12, ajouteLe: 13, par: 14,
  amenagee: COL_ELEVE_AMENAGEE, coussin: COL_ELEVE_COUSSIN,
  amenagements: COL_ELEVE_AMENAGEMENTS, naissance: COL_ELEVE_NAISSANCE,
  nomAffiche: COL_ELEVE_NOM_AFFICHE
};

var LARGEUR_REPERTOIRE = COL_ELEVE_NOM_AFFICHE;

function ligneRepertoire(champs) {
  var l = [];
  for (var i = 0; i < LARGEUR_REPERTOIRE; i++) l.push('');
  Object.keys(COLONNES_REPERTOIRE).forEach(function (k) {
    var v = champs[k];
    if (v === undefined || v === null || v === '') return;
    l[COLONNES_REPERTOIRE[k] - 1] = String(v);
  });
  return l;
}

function importerEleves(d) {
  /* Import structuré : nom, téléphone, mail, formation.
     Une simple liste de noms reste acceptée. */
  if (d.fiches) {
    var recues;
    try { recues = (typeof d.fiches === 'string') ? JSON.parse(d.fiches) : d.fiches; }
    catch (e) { recues = null; }
    if (recues && recues.length) return importerFiches(recues, d.demandeur);
  }

  var brut = String(d.liste || '');
  /* Un nom par ligne, ou séparés par des virgules ou des points-virgules */
  var noms = brut.split(/[\n;,]+/)
    .map(function (x) { return x.replace(/\s+/g, ' ').trim(); })
    .filter(function (x) { return x.length >= 3; });

  if (!noms.length) return { status: 'error', message: 'Aucun nom lisible.' };

  var sh = feuilleEleves();
  var lignes = sh.getDataRange().getValues();
  var connus = {};
  for (var i = 1; i < lignes.length; i++) {
    if (lignes[i][0]) connus[normaliser(lignes[i][0])] = true;
  }

  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');
  var ajouts = [];
  var doublons = 0;
  noms.forEach(function (n) {
    var cle = normaliser(n);
    if (connus[cle]) { doublons++; return; }
    connus[cle] = true;
    ajouts.push(ligneRepertoire({ eleve: n, ajouteLe: maintenant,
                                  par: String(d.demandeur || '') }));
  });

  if (ajouts.length) {
    sh.getRange(sh.getLastRow() + 1, 1, ajouts.length, LARGEUR_REPERTOIRE)
      .setValues(ajouts);
  }
  return { status: 'ok', ajoutes: ajouts.length, doublons: doublons,
           total: Object.keys(connus).length };
}

function listerRepertoire() {
  var lignes = feuilleEleves().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < lignes.length; i++) {
    var n = texteCellule(lignes[i][0], false).trim();
    if (n) out.push(n);
  }
  return out;
}

/* La fiche complète d'un élève du répertoire */
/* Import avec les coordonnées. Une valeur vide ne remplace jamais
   une valeur déjà présente : un export partiel ne doit rien effacer. */
function importerFiches(recues, demandeur) {
  try {
    return importerFichesInterne(recues, demandeur);
  } catch (e) {
    return { status: 'error',
             message: "L'import a échoué : " + e.message };
  }
}

function importerFichesInterne(recues, demandeur) {
  var sh = feuilleEleves();
  var nb = sh.getLastRow();

  /* Une seule lecture, une seule écriture. La version précédente
     lisait et écrivait ligne par ligne : 130 élèves dépassaient
     le délai d'attente et l'import échouait sans rien enregistrer. */
  /* Toute la largeur du tableau : un nombre figé perdait les
     colonnes ajoutées depuis (genre, frise, ANTS, prescripteur). */
  var largeur = Math.max(sh.getLastColumn(), LARGEUR_REPERTOIRE);
  var existant = (nb > 1) ? sh.getRange(2, 1, nb - 1, largeur).getValues() : [];
  var index = {};
  for (var i = 0; i < existant.length; i++) {
    if (existant[i][0]) index[normaliser(existant[i][0])] = i;
  }

  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');
  var ajouts = [];
  var majs = 0, doublons = 0;
  var modifie = false;
  var dejaVus = {};

  recues.forEach(function (f) {
    var nom = String(f.eleve || '').replace(/\s+/g, ' ').trim();
    if (nom.length < 3) return;
    var cle = normaliser(nom);

    /* Deux fois dans le même fichier : on ne traite que la première */
    if (dejaVus[cle]) { doublons++; return; }
    dejaVus[cle] = true;

    var tel = String(f.telephone || '').trim();
    var mail = String(f.email || '').trim();
    var form = String(f.formation || '').trim();
    var genre = String(f.genre || '').trim().toUpperCase();
    /* v185 : deux colonnes de plus à l'import. La date de naissance
       commande l'âge et l'échéance AAC ; le mail du prescripteur est
       l'adresse de l'accompagnateur. */
    var naiss = String(f.naissance || '').trim();
    var presc = String(f.mailPrescripteur || '').trim();

    if (index[cle] !== undefined) {
      /* Déjà là : on complète ce qui manque, sans écraser */
      var l = existant[index[cle]];
      var cols = [COLONNES_REPERTOIRE.telephone, COLONNES_REPERTOIRE.email,
                  COLONNES_REPERTOIRE.formation, COLONNES_REPERTOIRE.genre,
                  COLONNES_REPERTOIRE.mailPrescripteur,
                  COLONNES_REPERTOIRE.naissance];
      var lire = function () {
        return cols.map(function (c) { return l[c - 1]; }).join('|');
      };
      var avant = lire();
      if (tel) l[COLONNES_REPERTOIRE.telephone - 1] = tel;
      if (mail) l[COLONNES_REPERTOIRE.email - 1] = mail;
      if (form) l[COLONNES_REPERTOIRE.formation - 1] = form;
      if (genre) l[COLONNES_REPERTOIRE.genre - 1] = genre;
      if (presc) l[COLONNES_REPERTOIRE.mailPrescripteur - 1] = presc;
      if (naiss) l[COLONNES_REPERTOIRE.naissance - 1] = naiss;
      if (lire() !== avant) { majs++; modifie = true; }
      else doublons++;
      return;
    }

    ajouts.push(ligneRepertoire({
      eleve: nom, telephone: tel, email: mail, formation: form, genre: genre,
      mailPrescripteur: presc, naissance: naiss,
      ajouteLe: maintenant, par: String(demandeur || '')
    }));
  });

  /* Les mises à jour repartent d'un bloc */
  if (modifie && existant.length) {
    sh.getRange(2, 1, existant.length, largeur).setValues(existant);
  }
  if (ajouts.length) {
    sh.getRange(sh.getLastRow() + 1, 1, ajouts.length, LARGEUR_REPERTOIRE)
      .setValues(ajouts);
  }

  return { status: 'ok', ajoutes: ajouts.length, majs: majs,
           doublons: doublons, total: sh.getLastRow() - 1 };
}

function listerFiches() {
  var lignes = feuilleEleves().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < lignes.length; i++) {
    var n = texteCellule(lignes[i][0], false).trim();
    if (!n) continue;
    out.push({
      eleve: n,
      telephone: texteCellule(lignes[i][1], false),
      email: texteCellule(lignes[i][2], false),
      formation: texteCellule(lignes[i][3], false),
      messenger: texteCellule(lignes[i][4], false),
      remarques: texteCellule(lignes[i][5], false),
      genre: texteCellule(lignes[i][6], false),
      frise: texteCellule(lignes[i][7], false),
      autreAE: texteCellule(lignes[i][8], false),
      autreAENom: texteCellule(lignes[i][9], false),
      mailPrescripteur: texteCellule(lignes[i][10], false),
      ants: texteCellule(lignes[i][11], false),
      ajoute: texteCellule(lignes[i][12], false),
      /* Le poste de conduite. Une ligne écrite avant ces colonnes
         n'a pas la case : on rend '' plutôt que planter. */
      amenagee: texteCellule(lignes[i][COL_ELEVE_AMENAGEE - 1], false),
      coussin:  texteCellule(lignes[i][COL_ELEVE_COUSSIN - 1], false),
      amenagements: texteCellule(lignes[i][COL_ELEVE_AMENAGEMENTS - 1], false),
      naissance: texteCellule(lignes[i][COL_ELEVE_NAISSANCE - 1], false),
      nomAffiche: texteCellule(lignes[i][COL_ELEVE_NOM_AFFICHE - 1], false)
    });
  }
  return { status: 'ok', fiches: out };
}

function enregistrerFicheEleve(d) {
  var nom = String(d.eleve || '').trim();
  if (!nom) return { status: 'error', message: 'Nom manquant.' };

  var sh = feuilleEleves();
  var lignes = sh.getDataRange().getValues();
  var valeurs = [
    nom,
    String(d.telephone || '').trim(),
    String(d.email || '').trim(),
    String(d.formation || '').trim(),
    String(d.messenger || '').trim(),
    String(d.remarques || '').trim(),
    String(d.genre || '').trim().slice(0, 1).toUpperCase(),
    String(d.frise || '').trim(),
    String(d.autreAE || '').trim(),
    String(d.autreAENom || '').trim(),
    String(d.mailPrescripteur || '').trim(),
    String(d.ants || '').trim()
  ];

  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][0]) === normaliser(nom)) {
      /* Un champ laissé vide ne doit pas effacer ce qui existe :
         le moniteur ne renseigne souvent que le Messenger. */
      for (var j = 1; j < valeurs.length; j++) {
        if (!valeurs[j] && lignes[i][j]) valeurs[j] = String(lignes[i][j]);
      }
      /* Autant de colonnes que le tableau en compte : figer ce
         nombre faisait perdre tout ce qui avait été ajouté depuis
         — Messenger, genre, frise, ANTS, mail du prescripteur. */
      sh.getRange(i + 1, 1, 1, valeurs.length).setValues([valeurs]);
      ecrireColonnesTardivesEleve(sh, i + 1, d);
      return { status: 'ok', maj: true };
    }
  }

  /* Pas encore au répertoire : on l'y ajoute */
  ajouterLigne(sh, valeurs.concat([
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.demandeur || '')
  ]));
  ecrireColonnesTardivesEleve(sh, sh.getLastRow(), d);
  return { status: 'ok', cree: true };
}

/* Conduite aménagée et coussin vert, écrits à part.

   À part parce qu'ils sont en colonnes 15-16 et que le bloc
   principal s'arrête à la 12 : une seule écriture aurait dû
   recouvrir « Ajouté le » et « Par » au passage, et les perdre.

   Trois états, et il faut les trois. 'oui' coche, 'non' décoche —
   c'est une réponse, pas un vide — et l'absence du champ ne touche
   à rien : le formulaire du téléphone n'envoie que ce qu'il a, et
   enregistrer un Messenger ne doit pas décocher un coussin. */
function ecrireColonnesTardivesEleve(sh, ligne, d) {
  if (!ligne || ligne < 2) return;
  [[COL_ELEVE_AMENAGEE, d.amenagee], [COL_ELEVE_COUSSIN, d.coussin]].forEach(function (p) {
    var v = p[1];
    if (v === undefined || v === null || v === '') return;
    sh.getRange(ligne, p[0]).setValue(String(v) === 'oui' ? 'oui' : '');
  });

  /* La liste des aménagements, elle, n'est pas une case : 'non' la
     vide, une liste la remplace, l'absence ne touche à rien. */
  if (d.amenagements !== undefined && d.amenagements !== null &&
      d.amenagements !== '') {
    sh.getRange(ligne, COL_ELEVE_AMENAGEMENTS)
      .setValue(String(d.amenagements) === 'non' ? '' : String(d.amenagements));
  }

  /* La date de naissance, colonne 18, même raison que les trois
     au-dessus : le bloc principal s'arrête à la 12.

     ⚠️ L'ABSENCE N'EFFACE PAS. Le formulaire du téléphone n'envoie
     que ce qu'il a, et enregistrer un Messenger depuis le bord de la
     route ne doit pas effacer une date de naissance saisie au bureau.
     Pour la retirer volontairement, on envoie 'non' — comme pour les
     aménagements, un mot exprès plutôt qu'un silence. */
  if (d.naissance !== undefined && d.naissance !== null && d.naissance !== '') {
    sh.getRange(ligne, COL_ELEVE_NAISSANCE)
      .setValue(String(d.naissance) === 'non' ? '' : String(d.naissance));
  }

  /* Le nom affiché, colonne 19. Même règle : 'non' le vide et rend
     la main à l'abréviation automatique, l'absence ne touche à rien.
     C'est ce qui permet de corriger un cas, et un seul, sans rouvrir
     tous les autres. */
  if (d.nomAffiche !== undefined && d.nomAffiche !== null &&
      d.nomAffiche !== '') {
    sh.getRange(ligne, COL_ELEVE_NOM_AFFICHE)
      .setValue(String(d.nomAffiche) === 'non' ? '' : String(d.nomAffiche));
  }
}

function retirerEleveRepertoire(nom) {
  var sh = feuilleEleves();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (normaliser(lignes[i][0]) === normaliser(nom)) sh.deleteRow(i + 1);
  }
  return { status: 'ok' };
}

/* Modifier le texte d'un bilan déjà enregistré.
   On vérifie l'élève avant d'écrire : une ligne peut avoir bougé. */
/* Met à jour un bilan déjà enregistré : le texte, la note interne
   et les manœuvres. Sans ça, corriger une note créait un doublon. */
function majBilanComplet(d) {
  var ligne = parseInt(d.ligne, 10);
  var eleve = String(d.eleve || '').trim();
  if (!ligne || ligne < 2) return { status: 'error', message: 'Ligne invalide.' };

  var sh = feuille();
  if (ligne > sh.getLastRow()) return { status: 'error', message: 'Ligne introuvable.' };

  var nomEnPlace = String(sh.getRange(ligne, 4).getValue() || '');
  if (eleve && normaliser(nomEnPlace) !== normaliser(eleve)) {
    return { status: 'error',
             message: "Ce bilan n'est plus à la même place. Relance la recherche." };
  }

  if (d.bilan !== undefined) sh.getRange(ligne, 5).setValue(String(d.bilan));
  if (d.noteInterne !== undefined) sh.getRange(ligne, 7).setValue(String(d.noteInterne));
  if (d.manoeuvres !== undefined) sh.getRange(ligne, 11).setValue(String(d.manoeuvres));

  return { status: 'ok', ligne: ligne };
}

function modifierBilan(d) {
  var ligne = parseInt(d.ligne, 10);
  var eleve = String(d.eleve || '').trim();
  var texte = String(d.texte || '');

  if (!ligne || ligne < 2) return { status: 'error', message: 'Ligne invalide.' };
  if (!texte.trim()) return { status: 'error', message: 'Le bilan est vide.' };

  var sh = feuille();
  if (ligne > sh.getLastRow()) return { status: 'error', message: 'Ligne introuvable.' };

  var nomEnPlace = String(sh.getRange(ligne, 4).getValue() || '');
  if (eleve && normaliser(nomEnPlace) !== normaliser(eleve)) {
    return { status: 'error',
             message: "Ce bilan n'est plus à la même place. Relance la recherche." };
  }

  sh.getRange(ligne, 5).setValue(texte);
  return { status: 'ok', eleve: nomEnPlace };
}

/* ============================================================
   LES SIGNALEMENTS DES MONITEURS

   Ce qui casse chez eux, écrit là où le bureau peut le lire. Sans
   cette trace, un moniteur bloqué le reste jusqu'à ce qu'il pense
   à téléphoner — et le message d'erreur, lui, est déjà perdu.
   ============================================================ */
function feuilleIncidents() {
  var f = classeur();
  var sh = f.getSheetByName('Incidents');
  if (!sh) {
    sh = f.insertSheet('Incidents', f.getNumSheets());
    ajouterLigne(sh, ['Horodatage', 'Moniteur', 'Version', 'Appareil',
                  'Où', 'Message', 'Détails']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function enregistrerIncident(d) {
  var sh = feuilleIncidents();
  ajouterLigne(sh, [
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.demandeur || d.moniteur || ''),
    String(d.version || ''),
    String(d.appareil || ''),
    String(d.ou || ''),
    String(d.message || '').slice(0, 500),
    String(d.details || '').slice(0, 800)
  ]);

  /* Deux mille lignes suffisent largement : au-delà, on oublie les
     plus anciennes plutôt que d'alourdir le classeur. */
  if (sh.getLastRow() > 2000) sh.deleteRows(2, sh.getLastRow() - 1500);
  return { status: 'ok' };
}

function listerIncidents(d) {
  var sh = feuilleIncidents();
  var nb = sh.getLastRow();
  if (nb < 2) return { status: 'ok', incidents: [] };

  var combien = Math.min(parseInt((d && d.combien), 10) || 120, 400);
  var depart = Math.max(2, nb - combien + 1);
  var v = sh.getRange(depart, 1, nb - depart + 1, 7).getValues();

  var out = [];
  for (var i = v.length - 1; i >= 0; i--) {
    if (!v[i][0]) continue;
    out.push({
      quand: texteCellule(v[i][0], false),
      moniteur: texteCellule(v[i][1], false),
      version: texteCellule(v[i][2], false),
      appareil: texteCellule(v[i][3], false),
      ou: texteCellule(v[i][4], false),
      message: texteCellule(v[i][5], false),
      details: texteCellule(v[i][6], false)
    });
  }
  return { status: 'ok', incidents: out, total: nb - 1 };
}


/* ============================================================
   FAIRE LE TRI DANS LES SIGNALEMENTS

   « Sinon ça va rester affiché en permanence des choses que l'on a
   traitées ensemble. »

   Un écran d'alerte dont on ne peut rien retirer cesse d'être un
   écran d'alerte : au bout de trois semaines, tout y est vieux, et
   on n'y regarde plus la ligne du jour. Le tri n'est donc pas un
   confort, c'est ce qui garde l'écran utile.

   DEUX GESTES, ET PAS UN DE PLUS :

     · « ce problème-là est réglé » — on efface toutes ses lignes
       d'un coup, y compris celles des autres moniteurs. L'écran
       regroupe déjà par message ; on supprime ce que l'écran
       montre, jamais une ligne isolée qu'on n'aurait pas vue.
     · « tout ce qui date d'avant » — la vidange par date.

   ⚠️ ON SUPPRIME DU BAS VERS LE HAUT, et par blocs. Ligne par ligne
   en descendant, les numéros se décalent au fur et à mesure et on
   efface les mauvaises ; une par une, cinq cents lignes prennent
   plus de temps que le classeur n'en accorde.
   ============================================================ */
function supprimerIncidents(d) {
  var motif = String((d && d.message) || '').slice(0, 120);
  var avant = String((d && d.avant) || '').trim();   /* yyyy-mm-dd */

  /* Sans critère, on effacerait tout le classeur d'alerte sur un
     clic malheureux. Un refus vaut mieux. */
  if (!motif && !avant) {
    return { status: 'error',
             message: 'Rien à supprimer : il faut un problème ou une date.' };
  }

  var sh = feuilleIncidents();
  var nb = sh.getLastRow();
  if (nb < 2) return { status: 'ok', supprimes: 0 };

  var v = sh.getRange(2, 1, nb - 1, 7).getValues();

  /* Les numéros de ligne à retirer, du bas vers le haut. */
  var aRetirer = [];
  for (var i = v.length - 1; i >= 0; i--) {
    if (motif && String(v[i][5] || '').slice(0, 120) !== motif) continue;
    if (avant) {
      var iso = dateVersIso(v[i][0]);
      if (!iso || iso >= avant) continue;
    }
    aRetirer.push(i + 2);
  }
  if (!aRetirer.length) return { status: 'ok', supprimes: 0 };

  /* Par blocs contigus : « deleteRows(depart, combien) » en un
     appel là où il en fallait cent. */
  var n = 0;
  var fin = aRetirer[0];
  var debut = fin;
  for (var k = 1; k <= aRetirer.length; k++) {
    if (k < aRetirer.length && aRetirer[k] === debut - 1) {
      debut = aRetirer[k];
      continue;
    }
    sh.deleteRows(debut, fin - debut + 1);
    n += fin - debut + 1;
    if (k < aRetirer.length) { fin = aRetirer[k]; debut = fin; }
  }

  return { status: 'ok', supprimes: n };
}


/* ============================================================
   LES DÉPÔTS EN BANQUE

   Ce qu'on emporte à la banque : les espèces comptées et les
   chèques alignés. Une remise, une date, un montant.

   Les montants arrivent en euros, écrits avec un point et deux
   décimales — c'est l'application qui compte en centimes. Ici on
   ne recalcule rien : recalculer d'un côté ce qui a été calculé
   de l'autre, c'est se donner deux totaux qui finiront par ne
   plus dire la même chose. On écrit ce qui a été compté.
   ============================================================ */
function feuilleDepots() {
  var f = classeur();
  var sh = f.getSheetByName('Depots');
  if (!sh) {
    sh = f.insertSheet('Depots', f.getNumSheets());
    ajouterLigne(sh, ['Horodatage', 'Qui', 'Espèces', 'Détail des billets',
                  'Fond de caisse', 'Nb chèques', 'Montant des chèques',
                  'Détail des chèques', 'Total', 'Note']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* Un montant tel qu'il doit s'écrire dans une colonne d'argent :
   un nombre, pas un texte. Une colonne de textes ne s'additionne
   pas dans le classeur, et c'est justement ce qu'on voudra y
   faire un jour. */
function montantDepot(v) {
  var n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function enregistrerDepot(d) {
  var total = montantDepot(d.total);
  if (!(total > 0)) return { status: 'error', message: 'Dépôt vide.' };

  var sh = feuilleDepots();
  ajouterLigne(sh, [
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.demandeur || d.moniteur || ''),
    montantDepot(d.liquide),
    String(d.billets || '').slice(0, 200),
    montantDepot(d.fond),
    parseInt(d.nbCheques, 10) || 0,
    montantDepot(d.cheques),
    String(d.montantsCheques || '').slice(0, 1500),
    total,
    String(d.note || '').slice(0, 200)
  ]);
  return { status: 'ok' };
}

function listerDepots(d) {
  var sh = feuilleDepots();
  var nb = sh.getLastRow();
  if (nb < 2) return { status: 'ok', depots: [] };

  var combien = Math.min(parseInt((d && d.combien), 10) || 60, 400);
  var depart = Math.max(2, nb - combien + 1);
  var v = sh.getRange(depart, 1, nb - depart + 1, 10).getValues();

  /* Du plus récent au plus ancien : c'est le dépôt d'hier qu'on
     vient vérifier, pas celui de l'an dernier. */
  var out = [];
  for (var i = v.length - 1; i >= 0; i--) {
    if (!v[i][0]) continue;
    out.push({
      ligne: depart + i,
      quand: texteCellule(v[i][0], false),
      qui: texteCellule(v[i][1], false),
      liquide: texteCellule(v[i][2], false),
      billets: texteCellule(v[i][3], false),
      fond: texteCellule(v[i][4], false),
      nbCheques: texteCellule(v[i][5], false),
      cheques: texteCellule(v[i][6], false),
      montantsCheques: texteCellule(v[i][7], false),
      total: texteCellule(v[i][8], false),
      note: texteCellule(v[i][9], false)
    });
  }
  return { status: 'ok', depots: out, total: nb - 1 };
}


/* ============================================================
   CE QUE COÛTE L'IA

   Chaque génération facturée chez Anthropic laisse une ligne ici :
   quand, qui, pour quoi, quel modèle, combien de jetons entrés et
   sortis, et à quel tarif.

   ON GARDE LES JETONS ET LE TARIF DU JOUR, PAS UNE SOMME.

   Un montant figé ne se vérifie plus : on ne saurait plus dire
   d'où il vient. Les jetons sont le fait — c'est ce qu'Anthropic
   compte — et le tarif appliqué ce jour-là est ce qui les
   transforme en euros. Gardés côte à côte, le calcul se refait à
   l'identique des mois plus tard, et un changement de tarif ne
   réécrit pas le passé.
   ============================================================ */
function feuilleCoutsIa() {
  var f = classeur();
  var sh = f.getSheetByName('CoutsIA');
  if (!sh) {
    sh = f.insertSheet('CoutsIA', f.getNumSheets());
    ajouterLigne(sh, ['Horodatage', 'Qui', 'Pour quoi', 'Modèle',
                  'Jetons entrée', 'Jetons sortie',
                  '$ / M entrée', '$ / M sortie', 'Coût $']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function enregistrerCoutIa(d) {
  var entree = parseInt(d.entree, 10) || 0;
  var sortie = parseInt(d.sortie, 10) || 0;
  /* Un appel sans jeton n'a rien coûté : il n'a pas eu lieu, ou il
     a échoué avant de partir. On ne remplit pas la feuille de
     lignes à zéro. */
  if (!entree && !sortie) return { status: 'ok', ignore: true };

  var pe = parseFloat(d.prixEntree);
  var ps = parseFloat(d.prixSortie);
  if (isNaN(pe)) pe = 0;
  if (isNaN(ps)) ps = 0;

  var cout = (entree / 1000000) * pe + (sortie / 1000000) * ps;

  var sh = feuilleCoutsIa();
  ajouterLigne(sh, [
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.qui || 'inconnu'),
    String(d.quoi || 'Génération IA').slice(0, 120),
    String(d.modele || ''),
    entree, sortie, pe, ps,
    Math.round(cout * 1000000) / 1000000
  ]);

  /* Le classeur n'est pas un entrepôt : au-delà de vingt mille
     lignes on oublie les plus anciennes. À deux cents générations
     par jour, cela fait plus de trois mois d'historique. */
  if (sh.getLastRow() > 20000) sh.deleteRows(2, sh.getLastRow() - 15000);
  return { status: 'ok' };
}

/* Les lignes d'une période. Les bornes sont en ISA — aaaa-mm-jj —
   et l'horodatage est en jj/MM/aaaa : on compare sur des dates
   remises dans le même ordre, jamais sur du texte tel quel. */
function listerCoutsIa(d) {
  var sh = feuilleCoutsIa();
  var nb = sh.getLastRow();
  if (nb < 2) return { status: 'ok', lignes: [], total: 0 };

  var du = String((d && d.du) || '');
  var au = String((d && d.au) || '');

  var v = sh.getRange(2, 1, nb - 1, 9).getValues();
  var out = [];
  for (var i = v.length - 1; i >= 0; i--) {
    if (!v[i][0]) continue;
    /* AVEC L'HEURE. Sans elle, deux générations du même jour se
       ressemblent, et on croit en voir une comptée deux fois. */
    var quand = texteCellule(v[i][0], true);
    var jour = jourIsoDeLHorodatage(quand);
    if (du && jour && jour < du) continue;
    if (au && jour && jour > au) continue;
    out.push({
      quand: quand,
      jour: jour,
      qui: texteCellule(v[i][1], false),
      quoi: texteCellule(v[i][2], false),
      modele: texteCellule(v[i][3], false),
      entree: parseInt(v[i][4], 10) || 0,
      sortie: parseInt(v[i][5], 10) || 0,
      cout: parseFloat(v[i][8]) || 0
    });
    /* Une période large sur trois mois d'historique ferait une
       réponse énorme pour un tableau qu'on ne lit pas ligne à
       ligne. Le détail s'arrête ; les totaux, eux, sont calculés
       sur tout (voir plus bas). */
    if (out.length >= 3000) break;
  }
  return { status: 'ok', lignes: out, total: nb - 1 };
}

/* « 28/08/2026 14:03 » → « 2026-08-28 ». Rend '' si la cellule ne
   ressemble à rien de connu : mieux vaut une ligne hors période
   qu'une ligne rangée au mauvais jour. */
function jourIsoDeLHorodatage(t) {
  var m = String(t || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return m[3] + '-' + m[2] + '-' + m[1];
  var iso = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : '';
}

/* Un dépôt saisi deux fois se retire. On vérifie l'horodatage
   avant de supprimer : entre le moment où l'écran a été chargé et
   le clic, quelqu'un d'autre a pu enregistrer un dépôt, et les
   numéros de ligne auraient bougé. */
function supprimerDepot(d) {
  var ligne = parseInt(d.ligne, 10);
  if (!(ligne > 1)) return { status: 'error', message: 'Ligne inconnue.' };

  var sh = feuilleDepots();
  if (ligne > sh.getLastRow()) return { status: 'error', message: 'Ligne inconnue.' };

  var attendu = String(d.quand || '');
  var trouve = texteCellule(sh.getRange(ligne, 1).getValue(), false);
  if (attendu && attendu !== trouve) {
    return { status: 'error',
             message: 'La liste a changé entre-temps. Recharge et recommence.' };
  }
  sh.deleteRow(ligne);
  return { status: 'ok' };
}


/* ============================================================
   LE LIEN DU COURS

   Chaque rappel porte un lien vers une page qui redit tout : lieu,
   véhicule, ce qu'il faut apporter. Un clic dessus est un vrai
   signal — l'élève a lu — là où une image invisible dans un mail
   se déclenche toute seule chez la moitié des gens.

   Le jeton ne donne accès qu'à CE cours-là, en lecture, et cesse
   de répondre après. Il ne connecte à rien : le code du coin
   révisions est permanent et réutilisable, le faire circuler dans
   un mail à chaque cours le rendrait irrévocable.
   ============================================================ */
function feuilleLiens() {
  var f = classeur();
  var sh = f.getSheetByName('LiensCours');
  if (!sh) {
    sh = f.insertSheet('LiensCours', f.getNumSheets());
    ajouterLigne(sh, ['Jeton', 'Élève', 'Prénom', 'Date', 'Heure', 'Type',
                  'Lieu', 'Véhicule', 'Moniteur', 'Mentions',
                  'Créé le', 'Expire le', 'Confirmé le']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* Vingt-deux caractères tirés au sort : un jeton qui circule par
   mail ne doit pas pouvoir se deviner en essayant. */
function jetonCours() {
  var lettres = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var out = '';
  for (var i = 0; i < 22; i++) {
    out += lettres.charAt(Math.floor(Math.random() * lettres.length));
  }
  return out;
}

/* ============================================================
   ⚠️ UN RENVOI N'EST PAS UN SECOND COURS — v219

   David, le 12 septembre 2026 : « ⚠️ Mail parti, mais SANS bouton
   de confirmation — Pas de réponse après 12 s. Ça fait plusieurs
   fois que j'ai ce message. »

   VOICI CE QUI SE PASSAIT, EN ENTIER.

   L'application borne ses appels à douze secondes et les REJOUE
   deux fois. Quand le classeur mettait treize secondes à répondre
   — il attend souvent derrière le rafraîchissement du bureau — la
   première tentative était abandonnée. Mais elle avait RÉUSSI :
   la ligne était écrite, le jeton existait. Simplement, personne
   ne le recevait.

   La seconde tentative écrivait alors une DEUXIÈME ligne, et si
   elle dépassait à son tour, l'application concluait « pas de
   jeton » et envoyait le mail sans bouton. Deux liens créés, aucun
   utilisé, et un élève qui ne peut pas confirmer sa présence.

   Une écriture qu'on rejoue doit pouvoir se reconnaître. Celle-ci
   n'en avait aucun moyen : chaque appel tirait un jeton neuf, et
   deux appels identiques donnaient deux lignes.

   LA CLÉ NATURELLE EST DÉJÀ DANS LES DONNÉES : le même élève, le
   même jour, à la même heure, il y a moins de cinq minutes, c'est
   le même cours. On rend alors le jeton déjà écrit au lieu d'en
   créer un autre — et la seconde tentative RATTRAPE ce que la
   première avait réussi sans le dire.

   Changer l'heure change la clé, et crée donc un nouveau lien :
   c'est bien un autre rendez-vous.
   ============================================================ */
function horodatageDuLien(txt) {
  var m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(String(txt || '').trim());
  if (!m) return null;
  return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10),
                  parseInt(m[4], 10), parseInt(m[5], 10), 0);
}

function lienRecentIdentique(sh, d) {
  var nb = sh.getLastRow();
  if (nb < 2) return '';

  /* Les quarante derniers liens suffisent : une reprise suit son
     premier essai de quelques secondes, pas de quelques centaines
     d'envois. Relire toute la feuille coûterait précisément le
     temps qu'on essaie de rattraper. */
  var depuis = Math.max(2, nb - 39);
  var v = sh.getRange(depuis, 1, nb - depuis + 1, 11).getValues();

  var eleve = normaliser(String(d.eleve || ''));
  var date = String(d.date || '');
  var heure = String(d.heure || '');
  var limite = new Date().getTime() - 5 * 60 * 1000;

  for (var i = v.length - 1; i >= 0; i--) {
    if (normaliser(String(v[i][1])) !== eleve) continue;
    if (String(v[i][3]) !== date) continue;
    if (String(v[i][4]) !== heure) continue;
    var t = horodatageDuLien(v[i][10]);
    if (!t || t.getTime() < limite) continue;
    var j = String(v[i][0]).trim();
    if (j.length === 22) return j;
  }
  return '';
}

function creerLienCours(d) {
  var sh = feuilleLiens();

  /* La reprise d'un appel abandonné retrouve son propre jeton
     au lieu d'en écrire un second. */
  var dejaLa = lienRecentIdentique(sh, d);
  if (dejaLa) return { status: 'ok', jeton: dejaLa, repris: true };

  var jeton = jetonCours();

  /* Le lien meurt le lendemain du cours : passé le cours, il n'a
     plus rien à dire, et un lien qui vit indéfiniment finit par
     traîner quelque part. */
  var expire = new Date();
  expire.setDate(expire.getDate() + 8);

  ajouterLigne(sh, [
    jeton,
    String(d.eleve || ''),
    String(d.prenom || String(d.eleve || '').split(' ')[0]),
    String(d.date || ''),
    String(d.heure || ''),
    String(d.typeSeance || ''),
    String(d.lieu || ''),
    String(d.vehicule || ''),
    String(d.moniteur || ''),
    String(d.mentions || '').slice(0, 900),
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    Utilities.formatDate(expire, 'Europe/Paris', 'dd/MM/yyyy'),
    ''
  ]);

  if (sh.getLastRow() > 6000) sh.deleteRows(2, sh.getLastRow() - 5000);
  return { status: 'ok', jeton: jeton };
}

/* Retrouve la ligne d'un jeton. Rend null plutôt qu'une erreur :
   un jeton inconnu et un jeton périmé se répondent pareil, on ne
   renseigne pas celui qui cherche. */
function ligneDuJeton(jeton) {
  var j = String(jeton || '').trim();
  if (j.length !== 22) return null;

  var sh = feuilleLiens();
  var nb = sh.getLastRow();
  if (nb < 2) return null;

  var col = sh.getRange(2, 1, nb - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0]).trim() === j) return { sh: sh, ligne: i + 2 };
  }
  return null;
}

function lireLienCours(jeton) {
  var t = ligneDuJeton(jeton);
  if (!t) return { status: 'error', message: 'Lien inconnu ou expiré.' };

  var v = t.sh.getRange(t.ligne, 1, 1, 13).getValues()[0];

  /* Expiration : on compare des jours, sans se soucier de l'heure */
  var exp = String(v[11] || '').split('/');
  if (exp.length === 3) {
    var fin = new Date(parseInt(exp[2], 10), parseInt(exp[1], 10) - 1,
                       parseInt(exp[0], 10), 23, 59, 59);
    if (new Date() > fin) return { status: 'error', message: 'Lien inconnu ou expiré.' };
  }

  /* Le prénom seulement : cette page s'ouvre sans mot de passe,
     elle n'a pas à désigner quelqu'un par son nom complet. */
  return { status: 'ok', cours: {
    prenom: texteCellule(v[2], false),
    date: texteCellule(v[3], false),
    heure: texteCellule(v[4], false),
    typeSeance: texteCellule(v[5], false),
    lieu: texteCellule(v[6], false),
    vehicule: texteCellule(v[7], false),
    moniteur: texteCellule(v[8], false),
    mentions: texteCellule(v[9], false),
    confirmeLe: texteCellule(v[12], false)
  }};
}

function confirmerLienCours(jeton) {
  var t = ligneDuJeton(jeton);
  if (!t) return { status: 'error', message: 'Lien inconnu ou expiré.' };

  var deja = String(t.sh.getRange(t.ligne, 13).getValue() || '').trim();
  if (deja) return { status: 'ok', confirmeLe: deja, deja: true };

  var q = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');
  t.sh.getRange(t.ligne, 13).setValue(q);
  return { status: 'ok', confirmeLe: q };
}

/* ============================================================
   LA PRÉSENCE, CONFIRMÉE DEPUIS SON ESPACE — v1056

   David, le 19 septembre : « du côté élève, pour son prochain cours,
   il faut le bouton qui indique sa présence comme le mail ; s'il a
   cliqué sur le mail ça indique présence confirmée, s'il n'a pas
   confirmé sur le mail il peut confirmer directement de son espace ».

   ⚠️ C'EST LA MÊME CONFIRMATION QUE CELLE DU MAIL, écrite au MÊME
   ENDROIT : la colonne « Confirmé le » de LiensCours. Le bureau la
   voit donc exactement où il la voit déjà — « ✋ présence confirmée »
   sur la carte du cours, 🔵 dans le journal des envois. Rien de
   nouveau à regarder, rien de nouveau à apprendre.

   Une deuxième colonne « confirmé depuis l'espace » aurait été un
   deuxième endroit à consulter, et un jour l'un des deux aurait dit
   oui pendant que l'autre disait non.

   ⚠️ ET LE CAS OÙ AUCUN MAIL N'EST PARTI. La confirmation vit dans
   la ligne créée par le rappel. Si personne n'a envoyé de rappel
   pour ce cours, il n'y a pas de ligne — et il n'y aurait donc rien
   à confirmer. Dans ce cas on CRÉE la ligne, sans envoyer aucun
   mail, pour que la carte du cours l'affiche comme d'habitude. Une
   seule porte, quel que soit le chemin.

   ⚠️ ET ON NE CONFIRME QUE SON PROPRE PROCHAIN COURS. Le jeton du
   mail désigne un cours ; ici, l'élève n'en donne aucun. C'est donc
   le classeur qui va chercher son prochain cours préparé — un élève
   ne peut pas confirmer la présence d'un autre, ni un cours qu'il
   choisirait.
   ============================================================ */
function confirmerPresenceEleve(nom) {
  var eleve = String(nom || '').trim();
  if (!eleve) return { status: 'error', message: 'Élève inconnu.' };

  var prochain = null;
  try { prochain = prochainCoursDeLEleve(eleve); } catch (e) { prochain = null; }
  if (!prochain || !prochain.jour) {
    return { status: 'error', message: 'Aucun cours à venir.' };
  }

  /* Le planning parle en « 2026-09-23 », LiensCours en
     « 23/09/2026 » : c'est le format du mail, et c'est lui qui fait
     foi dans cette feuille. */
  var jourFr = jourEnFrancais(prochain.jour);
  var heure = String(prochain.heure || '');

  var sh = feuilleLiens();
  var nb = sh.getLastRow();
  var cle = normaliser(eleve);

  if (nb >= 2) {
    var v = sh.getRange(2, 1, nb - 1, 13).getValues();
    /* ⚠️ LA PLUS RÉCENTE GAGNE. Un cours peut avoir reçu deux
       rappels — un renvoi, une reprise après panne : c'est la
       dernière ligne écrite que le bureau regarde. */
    for (var i = v.length - 1; i >= 0; i--) {
      if (normaliser(String(v[i][1] || '')) !== cle) continue;
      if (String(v[i][3] || '') !== jourFr) continue;
      if (heure && String(v[i][4] || '') !== heure) continue;
      var deja = String(v[i][12] || '').trim();
      if (deja) return { status: 'ok', confirmeLe: deja, deja: true };
      var q = Utilities.formatDate(new Date(), 'Europe/Paris',
                                   'dd/MM/yyyy HH:mm');
      sh.getRange(i + 2, 13).setValue(q);
      return { status: 'ok', confirmeLe: q };
    }
  }

  /* Aucun rappel n'est parti pour ce cours : on pose la ligne
     nous-mêmes. Elle ne porte pas de jeton de mail — personne n'a
     rien à ouvrir — mais elle porte le cours, et c'est elle que la
     carte du bureau lira. */
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris',
                                        'dd/MM/yyyy HH:mm');
  var expire = new Date();
  expire.setDate(expire.getDate() + 8);
  ajouterLigne(sh, [
    jetonCours(),
    eleve,
    eleve.split(' ')[0],
    jourFr,
    heure,
    '',
    String(prochain.lieu || ''),
    String(prochain.vehicule || ''),
    String(prochain.moniteur || ''),
    '',
    maintenant,
    Utilities.formatDate(expire, 'Europe/Paris', 'dd/MM/yyyy'),
    maintenant
  ]);
  return { status: 'ok', confirmeLe: maintenant, creee: true };
}

/* ⚠️ CE QU'IL A DÉJÀ CONFIRMÉ, POUR SON PROCHAIN COURS. L'espace
   élève doit savoir, en arrivant, s'il a cliqué dans le mail — sinon
   il reverrait le bouton et confirmerait deux fois, en se demandant
   si la première fois avait marché. */
function presenceDuProchainCours(nom, prochain) {
  if (!prochain || !prochain.jour) return '';
  var sh = feuilleLiens();
  var nb = sh.getLastRow();
  if (nb < 2) return '';
  var jourFr = jourEnFrancais(prochain.jour);
  var heure = String(prochain.heure || '');
  var cle = normaliser(nom);
  var v = sh.getRange(2, 1, nb - 1, 13).getValues();
  for (var i = v.length - 1; i >= 0; i--) {
    if (normaliser(String(v[i][1] || '')) !== cle) continue;
    if (String(v[i][3] || '') !== jourFr) continue;
    if (heure && String(v[i][4] || '') !== heure) continue;
    return String(v[i][12] || '').trim();
  }
  return '';
}

/* « 2026-09-23 » → « 23/09/2026 ». LiensCours écrit les dates comme
   le mail les montre ; le planning les écrit en ISO. La conversion
   a un nom et un seul endroit. */
function jourEnFrancais(iso) {
  var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(iso || '');
}

/* Les confirmations, par jeton : le journal des envois s'en sert
   pour allumer son voyant sans un appel par ligne. */
function confirmationsParJeton() {
  var sh = feuilleLiens();
  var nb = sh.getLastRow();
  var out = {};
  if (nb < 2) return out;

  /* Seules les dernières lignes servent : le journal n'affiche que
     les envois récents, et relire six mille lignes à chaque
     ouverture rendait l'écran long à venir. */
  var depart = Math.max(2, nb - 400 + 1);
  var v = sh.getRange(depart, 1, nb - depart + 1, 13).getValues();
  for (var i = 0; i < v.length; i++) {
    var j = String(v[i][0]).trim();
    if (j && v[i][12]) out[j] = texteCellule(v[i][12], false);
  }
  return out;
}


/* ============================================================
   LES NOTES INTERNES, RELUES ET RÉÉCRITES

   La forme de la ligne « examen officiel » a changé : les notes
   écrites avant ne la portent pas, donc ni le gras ni la couleur
   ne s'y appliquent. Ces deux actions servent au bouton de
   réparation d'⚙️ Accès.

   On ne touche QUE la note la plus récente de chaque élève :
   c'est la seule qui soit affichée et utilisée. Réécrire les
   anciennes falsifierait des bilans passés, qui disaient ce
   qu'ils disaient le jour où ils ont été écrits.
   ============================================================ */
function listerNotesInternes() {
  var sh = feuille();
  var nb = sh.getLastRow();
  if (nb < 2) return { status: 'ok', notes: [] };

  var blocA = sh.getRange(2, 1, nb - 1, 4).getValues();   // A-D
  var blocG = sh.getRange(2, 7, nb - 1, 1).getValues();   // G : la note

  /* La dernière ligne rencontrée pour un élève est la plus
     récente : la feuille est écrite dans l'ordre du temps. */
  var parEleve = {};
  for (var i = 0; i < blocA.length; i++) {
    var nom = texteCellule(blocA[i][3], false).trim();
    if (!nom) continue;
    parEleve[normaliser(nom)] = {
      eleve: nom,
      ligne: i + 2,
      date: texteCellule(blocA[i][0], false),
      note: texteCellule(blocG[i][0], false)
    };
  }

  var out = [];
  for (var k in parEleve) if (parEleve[k].note) out.push(parEleve[k]);
  return { status: 'ok', notes: out, total: out.length };
}

function enregistrerNoteInterne(d) {
  var ligne = parseInt(d.ligne, 10);
  var eleve = String(d.eleve || '').trim();
  var note = String(d.note || '');

  if (!ligne || ligne < 2) return { status: 'error', message: 'Ligne invalide.' };

  var sh = feuille();
  if (ligne > sh.getLastRow()) return { status: 'error', message: 'Ligne introuvable.' };

  /* Le classeur a pu bouger entre la lecture et l'écriture : on
     vérifie que la ligne appartient toujours au même élève avant
     d'écrire quoi que ce soit. */
  var nomEnPlace = String(sh.getRange(ligne, 4).getValue() || '');
  if (eleve && normaliser(nomEnPlace) !== normaliser(eleve)) {
    return { status: 'error',
             message: "Cette note n'est plus à la même place. Relance la vérification." };
  }

  sh.getRange(ligne, 7).setValue(note);
  return { status: 'ok', eleve: nomEnPlace };
}


/* ============================================================
   HISTORIQUE DES SMS
   Ce qui est parti, à qui, par qui. Sans trace écrite, personne
   ne peut dire si un élève a été prévenu.
   ============================================================ */
function feuilleSms() {
  var f = classeur();
  var sh = f.getSheetByName('Sms');
  if (!sh) {
    sh = f.insertSheet('Sms', f.getNumSheets());
    ajouterLigne(sh, ['Horodatage', 'Élève', 'Numéro', 'Par', 'Parties',
                  'Caractères', 'État', 'Message', 'Canal', 'Jeton']);
    sh.setFrozenRows(1);
  }

  /* La colonne « Canal » est arrivée avec le passage des rappels au
     mail. Une feuille créée avant ne l'a pas : on l'ajoute plutôt
     que d'exiger une remise à zéro, qui effacerait l'historique. */
  if (sh.getLastColumn() < 9) sh.getRange(1, 9).setValue('Canal');
  if (sh.getLastColumn() < 10) sh.getRange(1, 10).setValue('Jeton');
  return sh;
}

function enregistrerSms(d) {
  var sh = feuilleSms();
  ajouterLigne(sh, [
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.eleve || ''),
    String(d.numero || ''),
    String(d.par || d.demandeur || ''),
    parseInt(d.parties, 10) || 1,
    parseInt(d.caracteres, 10) || String(d.message || '').length,
    String(d.etat || 'envoyé'),
    String(d.message || '').slice(0, 1200),
    String(d.canal || 'sms'),
    String(d.jeton || '')
  ]);

  /* On garde six mois : au-delà, la feuille enfle pour rien */
  if (sh.getLastRow() > 5000) {
    sh.deleteRows(2, sh.getLastRow() - 4000);
  }
  return { status: 'ok' };
}

function listerSms(params) {
  var sh = feuilleSms();
  var nb = sh.getLastRow();
  if (nb < 2) return { status: 'ok', sms: [], total: 0 };

  var combien = Math.min(parseInt((params && params.combien), 10) || 100, 500);
  var depart = Math.max(2, nb - combien + 1);
  /* Neuf colonnes depuis l'arrivée du canal ; une feuille ancienne
     en a huit, et lire au-delà lèverait une erreur. */
  var colonnes = Math.max(8, Math.min(10, sh.getLastColumn()));
  var lignes = sh.getRange(depart, 1, nb - depart + 1, colonnes).getValues();

  var eleve = normaliser((params && params.eleve) || '');
  var confirmes = confirmationsParJeton();
  var out = [];
  for (var i = lignes.length - 1; i >= 0; i--) {
    if (!lignes[i][0]) continue;
    if (eleve && normaliser(lignes[i][1]) !== eleve) continue;
    out.push({
      quand: texteCellule(lignes[i][0], false),
      eleve: texteCellule(lignes[i][1], false),
      numero: texteCellule(lignes[i][2], false),
      par: texteCellule(lignes[i][3], false),
      parties: lignes[i][4] || 1,
      caracteres: lignes[i][5] || 0,
      etat: texteCellule(lignes[i][6], false),
      message: texteCellule(lignes[i][7], false),
      /* Sans canal noté, c'est un envoi d'avant le passage au mail :
         à l'époque tout partait en SMS. */
      canal: texteCellule(lignes[i][8], false) || 'sms',
      /* PAS LE JETON, SEULEMENT S'IL Y EN A UN.

         Le journal des envois rendait le jeton de confirmation de
         chaque cours à tout compte connecté. Il suffisait d'ouvrir
         💬 SMS → Journal pour confirmer la présence à la place de
         n'importe quel élève, ou lire le lieu et les mentions de
         cours qui ne sont pas les siens. L'écran, lui, ne s'en
         servait que pour allumer un voyant « en attente ». */
      attendReponse: !!texteCellule(lignes[i][9], false),
      /* La confirmation vit dans LiensCours : on la rapporte ici
         pour que le journal n'ait pas à la redemander ligne à ligne. */
      confirmeLe: confirmes[texteCellule(lignes[i][9], false)] || ''
    });
  }
  return { status: 'ok', sms: out, total: nb - 1 };
}

/* ============================================================
   HISTORIQUE DES COURS ET COURS EN COURS

   L'historique relit la feuille des bilans. Les cours en cours
   vivent dans leur propre feuille : un moniteur qui démarre s'y
   inscrit, l'enregistrement du bilan l'en retire.
   ============================================================ */
function bilansRecents(params) {
  var sh = feuille();
  var nb = sh.getLastRow();
  if (nb < 2) return { status: 'ok', bilans: [], total: 0 };

  var combien = Math.min(parseInt((params && params.combien), 10) || 100, 400);
  var depart = Math.max(2, nb - combien + 1);
  /* Colonnes A à K, sans le texte du bilan : trop lourd pour une liste */
  var lignes = sh.getRange(depart, 1, nb - depart + 1, 11).getValues();

  var out = [];
  for (var i = lignes.length - 1; i >= 0; i--) {
    if (!lignes[i][3]) continue;
    out.push({
      date: texteCellule(lignes[i][0], false),
      type: texteCellule(lignes[i][1], false),
      moniteur: texteCellule(lignes[i][2], false),
      eleve: texteCellule(lignes[i][3], false),
      note: texteCellule(lignes[i][6], false),
      site: texteCellule(lignes[i][7], false),
      horodatage: texteCellule(lignes[i][9], true),
      ligne: depart + i
    });
  }
  return { status: 'ok', bilans: out, total: nb - 1 };
}

function feuilleEnCours() {
  var f = classeur();
  var sh = f.getSheetByName('EnCours');
  if (!sh) {
    sh = f.insertSheet('EnCours', f.getNumSheets());
    ajouterLigne(sh, ['Moniteur', 'Élève', 'Type', 'Site', 'Démarré le', 'Appareil']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function demarrerCours(d) {
  var sh = feuilleEnCours();
  var lignes = sh.getDataRange().getValues();
  var mon = normaliser(d.moniteur);

  /* Un moniteur n'a qu'un cours en cours : on remplace le sien */
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (normaliser(lignes[i][0]) === mon) sh.deleteRow(i + 1);
  }

  ajouterLigne(sh, [
    String(d.moniteur || ''), String(d.eleve || ''),
    String(d.type || ''), String(d.site || ''),
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.appareil || '')
  ]);
  return { status: 'ok' };
}

function finirCours(d) {
  var sh = feuilleEnCours();
  var lignes = sh.getDataRange().getValues();
  var mon = normaliser(d.moniteur);
  var n = 0;
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (normaliser(lignes[i][0]) === mon) { sh.deleteRow(i + 1); n++; }
  }
  return { status: 'ok', retires: n };
}

/* ============================================================
   RETIRER UN COURS DE LA LISTE — ET QU'IL Y RESTE

   « J'appuie sur retirer de la liste mais il reste là. »

   La ligne était bien supprimée. Elle revenait : la page du
   moniteur, elle, tourne toujours, et elle resignale son cours à
   la moindre reprise du micro ou au moindre rechargement. On
   effaçait une trace que l'autre bout réécrivait aussitôt.

   Effacer ne suffit donc pas : il faut se SOUVENIR qu'on a
   effacé. On réutilise la table des alertes masquées, qui existe
   déjà et se purge déjà toute seule — une deuxième table dirait
   tôt ou tard autre chose que la première.

   La marque porte le moniteur, l'élève et LE JOUR : le lendemain,
   un vrai nouveau cours du même moniteur avec le même élève
   s'affichera normalement.
   ============================================================ */
function typeMasqueEnCours(moniteur, quand) {
  var jour = String(quand || '').trim().slice(0, 10);
  if (!jour) {
    jour = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy');
  }
  return 'encours|' + normaliser(moniteur) + '|' + jour;
}

/* Retirer une ligne de la liste des cours en cours.
   Sert quand un moniteur a abandonné son enregistrement. */
function retirerEnCours(d) {
  var sh = feuilleEnCours();
  var lignes = sh.getDataRange().getValues();
  var mon = normaliser(d.moniteur);
  var elv = normaliser(d.eleve || '');
  var n = 0;
  var vus = [];
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (normaliser(lignes[i][0]) !== mon) continue;
    /* Si un élève est précisé, on ne retire que celui-là */
    if (elv && normaliser(lignes[i][1]) !== elv) continue;
    vus.push({ eleve: String(lignes[i][1] || ''),
               quand: texteCellule(lignes[i][4], true) });
    sh.deleteRow(i + 1);
    n++;
  }

  /* La marque, pour que le resignalement ne la ramène pas.
     On la pose même si aucune ligne n'a été trouvée : la ligne a
     pu être resignalée entre l'affichage et le clic. */
  var poses = 0;
  if (d.masquer !== false) {
    if (!vus.length) {
      vus.push({ eleve: String(d.eleve || ''),
                 quand: String(d.depuis || '') });
    }
    for (var k = 0; k < vus.length; k++) {
      if (!vus[k].eleve) continue;
      try {
        masquerNotif({ eleve: vus[k].eleve,
                       type: typeMasqueEnCours(d.moniteur, vus[k].quand),
                       par: d.demandeur || d.par || '' });
        poses++;
      } catch (e) { /* la suppression compte plus que la mémoire */ }
    }
  }

  return { status: 'ok', retires: n, masques: poses };
}

/* Une date de cellule, qu'elle soit un objet Date ou le texte
   « dd/MM/yyyy HH:mm » qu'on y écrit. Rend 0 si elle est illisible :
   on ne devine pas une heure, on s'abstient de nettoyer. */
function momentDeLaLigne(v) {
  if (v instanceof Date) return v.getTime();
  var m = String(v || '')
    .match(/(\d{1,2})[\/\s-](\d{1,2})[\/\s-](\d{4})[\s àT]+(\d{1,2})[h:](\d{2})/);
  if (!m) return 0;
  var d = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
  var t = d.getTime();
  return isNaN(t) ? 0 : t;
}

function listerEnCours() {
  var sh = feuilleEnCours();
  var lignes = sh.getDataRange().getValues();
  if (lignes.length < 2) return { status: 'ok', cours: [] };

  /* Les bilans récents, pour reconnaître un cours déjà enregistré.
     Le signal de fin peut se perdre : réseau coupé, onglet fermé.

     On retient l'HEURE du bilan : un bilan antérieur au démarrage
     concerne un cours précédent avec le même élève, et ne dit rien
     du cours en train de se faire. */
  var faits = {};
  try {
    var fb = feuille();
    var nb = fb.getLastRow();
    var depart = Math.max(2, nb - 60);
    if (nb >= 2) {
      /* Colonnes C à H : moniteur (C), élève (D), horodatage (H).
         L'horodatage est bien en H — le lire en J renvoyait toujours
         zéro, et aucun cours n'était jamais retiré de la liste. */
      var recents = fb.getRange(depart, 3, nb - depart + 1, 6).getValues();
      for (var k = 0; k < recents.length; k++) {
        if (!recents[k][1]) continue;
        var cleB = normaliser(recents[k][0]) + '|' + normaliser(recents[k][1]);
        var h = recents[k][5];
        var t = (h instanceof Date) ? h.getTime() : 0;
        if (!faits[cleB] || t > faits[cleB]) faits[cleB] = t;
      }
    }
  } catch (e) { /* sans recoupement, on affiche tout */ }

  /* Ce que le bureau a déjà écarté à la main. Une ligne retirée
     revenait dès que la page du moniteur resignalait son cours :
     on relit la marque posée par « retirerEnCours ». */
  var ecartes = {};
  try {
    var m = listerNotifsMasquees().masquees || [];
    for (var z = 0; z < m.length; z++) {
      if (String(m[z].type || '').indexOf('encours|') !== 0) continue;
      ecartes[normaliser(m[z].eleve) + '|' + m[z].type] = true;
    }
  } catch (e) { /* sans la marque, on affiche : mieux vaut trop que rien */ }

  var maintenant = new Date().getTime();
  var out = [];
  var aSupprimer = [];

  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;

    var cle = normaliser(lignes[i][0]) + '|' + normaliser(lignes[i][1]);

    /* Écarté à la main aujourd'hui : on ne le remontre pas, et on
       nettoie la ligne que l'autre bout vient de réécrire. */
    var cleEcart = normaliser(lignes[i][1]) + '|' +
      typeMasqueEnCours(lignes[i][0], texteCellule(lignes[i][4], true));
    if (ecartes[cleEcart]) { aSupprimer.push(i + 1); continue; }

    /* ⚠️ LA MÊME DATE, ÉCRITE EN TEXTE ET RELUE COMME UN OBJET.

       « demarrerCours » écrit « Utilities.formatDate(...) » — donc
       une CHAÎNE, « 02/09/2026 16:24 ». Ici on ne reconnaissait
       qu'un objet Date : « debut » valait donc zéro, et les deux
       nettoyages ci-dessous — le cours déjà enregistré, le cours de
       plus de huit heures — ne se déclenchaient JAMAIS.

       David l'a vu sans le savoir : la ligne d'un cours de la
       veille à 16 h était encore là le lendemain matin. Elle y
       serait restée pour toujours.

       On lit les deux formes, comme partout ailleurs dans ce
       fichier. */
    var debut = momentDeLaLigne(lignes[i][4]);

    /* Un bilan enregistré APRÈS le démarrage : le cours est fait.
       Sans cette comparaison, un élève déjà vu par ce moniteur
       disparaissait de la liste dès qu'il démarrait. */
    if (faits[cle] && debut && faits[cle] >= debut - 60000) {
      aSupprimer.push(i + 1);
      continue;
    }

    /* Plus de 8 heures : un cours ne dure pas si longtemps */
    if (debut && (maintenant - debut) > 8 * 3600 * 1000) {
      aSupprimer.push(i + 1);
      continue;
    }

    out.push({
      moniteur: texteCellule(lignes[i][0], false),
      eleve: texteCellule(lignes[i][1], false),
      type: texteCellule(lignes[i][2], false),
      site: texteCellule(lignes[i][3], false),
      depuis: texteCellule(lignes[i][4], true)
    });
  }

  /* Du bas vers le haut, pour ne pas décaler les indices */
  for (var j = aSupprimer.length - 1; j >= 0; j--) sh.deleteRow(aSupprimer[j]);

  return { status: 'ok', cours: out };
}

/* ============================================================
   RÈGLES DICTÉES PAR LES MONITEURS

   Quand un moniteur dit « Claude, ... » pendant un cours, son
   ordre vaut pour ce bilan. S'il est retenu, il est conservé ici
   et transmis à l'IA lors des bilans suivants.

   L'IA n'apprend pas d'elle-même : c'est cette feuille qui fait
   office de mémoire, en étant relue à chaque correction.
   ============================================================ */
function feuilleReglesIA() {
  var f = classeur();
  var sh = f.getSheetByName('ReglesIA');
  if (!sh) {
    sh = f.insertSheet('ReglesIA', f.getNumSheets());
    ajouterLigne(sh, ['Règle', 'Dictée par', 'Le', 'Élève', 'Active']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function ajouterRegleIA(d) {
  var sh = feuilleReglesIA();
  var texte = String(d.regle || '').trim();
  if (texte.length < 4) return { status: 'ok', ignore: true };

  /* Une règle déjà connue n'est pas réenregistrée */
  var lignes = sh.getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][0]) === normaliser(texte)) {
      return { status: 'ok', deja: true };
    }
  }

  ajouterLigne(sh, [
    texte,
    String(d.par || d.demandeur || ''),
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.eleve || ''),
    ''                       /* inactive tant qu'un admin ne l'a pas validée */
  ]);
  return { status: 'ok', ajoutee: true };
}

function listerReglesIA(params) {
  var sh = feuilleReglesIA();
  var lignes = sh.getDataRange().getValues();
  var toutes = (params && params.toutes);
  var out = [];
  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    var active = String(lignes[i][4] || '').trim().toLowerCase() === 'oui';
    if (!toutes && !active) continue;
    out.push({
      ligne: i + 1,
      regle: texteCellule(lignes[i][0], false),
      par: texteCellule(lignes[i][1], false),
      quand: texteCellule(lignes[i][2], false),
      eleve: texteCellule(lignes[i][3], false),
      active: active
    });
  }
  return { status: 'ok', regles: out };
}

function activerRegleIA(d) {
  var sh = feuilleReglesIA();
  var l = parseInt(d.ligne, 10);
  if (!l || l < 2 || l > sh.getLastRow()) {
    return { status: 'error', message: 'Règle introuvable.' };
  }
  if (String(d.supprimer) === 'oui') {
    sh.deleteRow(l);
    return { status: 'ok', supprimee: true };
  }
  sh.getRange(l, 5).setValue(String(d.active) === 'oui' ? 'oui' : '');
  return { status: 'ok' };
}

/* ============================================================
   SUPPRESSION D'UN BILAN

   Le numéro de leçon n'est stocké nulle part : il se déduit du
   nombre de bilans de conduite de l'élève. Retirer un bilan
   renumérote donc les suivants tout seul, sans rien réécrire.
   ============================================================ */
function supprimerBilan(d) {
  var ligne = parseInt(d.ligne, 10);
  var sh = feuille();
  if (!ligne || ligne < 2 || ligne > sh.getLastRow()) {
    return { status: 'error', message: 'Bilan introuvable.' };
  }

  /* On vérifie que la ligne correspond bien à l'élève annoncé :
     un décalage effacerait le bilan de quelqu'un d'autre. */
  var attendu = normaliser(d.eleve || '');
  var reel = normaliser(sh.getRange(ligne, 4).getValue());
  if (attendu && reel && attendu !== reel) {
    return { status: 'error',
             message: 'La ligne ne correspond pas à cet élève. Actualise la recherche.' };
  }

  var horodatage = String(sh.getRange(ligne, 10).getValue() || '');
  sh.deleteRow(ligne);

  return { status: 'ok', supprime: horodatage };
}

/* ============================================================
   CORRECTIONS DE VOCABULAIRE

   La reconnaissance vocale se trompe toujours sur les mêmes mots.
   Plutôt que d'attendre une mise à jour du code, l'auto-école
   inscrit elle-même ses corrections ici : elles s'appliquent en
   direct pendant l'enregistrement et sont transmises à l'IA.
   ============================================================ */
function feuilleCorrections() {
  var f = classeur();
  var sh = f.getSheetByName('Corrections');
  if (!sh) {
    sh = f.insertSheet('Corrections', f.getNumSheets());
    ajouterLigne(sh, ['Mal entendu', 'Correction', 'Actif', 'Ajouté par', 'Le']);
    sh.setFrozenRows(1);
    /* Quelques exemples, pour montrer l'usage */
    ajouterLigne(sh, ['ongle mort', 'angle mort', 'oui', 'Système', '']);
    ajouterLigne(sh, ['gyratoire', 'giratoire', 'oui', 'Système', '']);
  }
  return sh;
}

function listerCorrections(params) {
  var sh = feuilleCorrections();
  var lignes = sh.getDataRange().getValues();
  var toutes = (params && params.toutes);
  var out = [];
  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    var actif = String(lignes[i][2] || '').trim().toLowerCase() === 'oui';
    if (!toutes && !actif) continue;
    out.push({
      ligne: i + 1,
      mauvais: texteCellule(lignes[i][0], false),
      bon: texteCellule(lignes[i][1], false),
      actif: actif,
      par: texteCellule(lignes[i][3], false),
      quand: texteCellule(lignes[i][4], false)
    });
  }
  return { status: 'ok', corrections: out };
}

function ajouterCorrection(d) {
  var mauvais = String(d.mauvais || '').trim();
  var bon = String(d.bon || '').trim();
  if (mauvais.length < 2 || bon.length < 1) {
    return { status: 'error', message: 'Les deux mots sont nécessaires.' };
  }
  if (normaliser(mauvais) === normaliser(bon)) {
    return { status: 'error', message: 'Les deux mots sont identiques.' };
  }

  var sh = feuilleCorrections();
  var lignes = sh.getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][0]) === normaliser(mauvais)) {
      /* Déjà connue : on met à jour plutôt que de doubler */
      sh.getRange(i + 1, 2).setValue(bon);
      sh.getRange(i + 1, 3).setValue('oui');
      return { status: 'ok', maj: true };
    }
  }

  ajouterLigne(sh, [mauvais, bon, 'oui', String(d.par || ''),
                Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm')]);
  return { status: 'ok', ajoutee: true };
}

function majCorrection(d) {
  var sh = feuilleCorrections();
  var l = parseInt(d.ligne, 10);
  if (!l || l < 2 || l > sh.getLastRow()) {
    return { status: 'error', message: 'Correction introuvable.' };
  }
  if (String(d.supprimer) === 'oui') {
    sh.deleteRow(l);
    return { status: 'ok', supprimee: true };
  }
  sh.getRange(l, 3).setValue(String(d.actif) === 'oui' ? 'oui' : '');
  return { status: 'ok' };
}

/* ============================================================
   LIEUX ET POINTS D'INTÉRÊT

   La reconnaissance vocale massacre les noms propres locaux :
   Yffiniac, Plérin, Trégueux, le rond-point des Longs Champs.
   Cette liste est transmise à l'IA pour qu'elle les reconnaisse
   et les orthographie correctement.
   ============================================================ */
function feuilleLieux() {
  var f = classeur();
  var sh = f.getSheetByName('Lieux');
  if (!sh) {
    sh = f.insertSheet('Lieux', f.getNumSheets());
    ajouterLigne(sh, ['Nom', 'Genre', 'Actif', 'Ajouté par', 'Le']);
    sh.setFrozenRows(1);
    /* Quelques exemples, pour montrer l'usage */
    ajouterLigne(sh, ['Saint-Brieuc', 'commune', 'oui', 'Système', '']);
    ajouterLigne(sh, ['Loudéac', 'commune', 'oui', 'Système', '']);
    ajouterLigne(sh, ['Plérin', 'commune', 'oui', 'Système', '']);
  }
  return sh;
}

function listerLieux(params) {
  var sh = feuilleLieux();
  var lignes = sh.getDataRange().getValues();
  var toutes = (params && params.toutes);
  var out = [];
  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    var actif = String(lignes[i][2] || '').trim().toLowerCase() === 'oui';
    if (!toutes && !actif) continue;
    out.push({
      ligne: i + 1,
      nom: texteCellule(lignes[i][0], false),
      genre: texteCellule(lignes[i][1], false),
      actif: actif,
      par: texteCellule(lignes[i][3], false),
      quand: texteCellule(lignes[i][4], false)
    });
  }
  return { status: 'ok', lieux: out };
}

function ajouterLieu(d) {
  var nom = String(d.nom || '').trim();
  if (nom.length < 2) return { status: 'error', message: 'Nom trop court.' };

  var sh = feuilleLieux();
  var lignes = sh.getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][0]) === normaliser(nom)) {
      sh.getRange(i + 1, 2).setValue(String(d.genre || ''));
      sh.getRange(i + 1, 3).setValue('oui');
      return { status: 'ok', maj: true };
    }
  }

  ajouterLigne(sh, [nom, String(d.genre || ''), 'oui', String(d.par || ''),
                Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm')]);
  return { status: 'ok', ajoute: true };
}

function majLieu(d) {
  var sh = feuilleLieux();
  var l = parseInt(d.ligne, 10);
  if (!l || l < 2 || l > sh.getLastRow()) {
    return { status: 'error', message: 'Lieu introuvable.' };
  }
  if (String(d.supprimer) === 'oui') {
    sh.deleteRow(l);
    return { status: 'ok', supprime: true };
  }
  sh.getRange(l, 3).setValue(String(d.actif) === 'oui' ? 'oui' : '');
  return { status: 'ok' };
}

/* ============================================================
   TÂCHES DU BUREAU

   Une tâche terminée est supprimée, pas archivée : la liste doit
   rester courte pour rester lue. Les captures sont stockées avec
   la tâche, comme pour les CEPC.
   ============================================================ */
function feuilleTaches() {
  var f = classeur();
  var sh = f.getSheetByName('Taches');
  if (!sh) {
    sh = f.insertSheet('Taches', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Titre', 'Détail', 'Pour', 'Par', 'Créée le',
                  'Statut', 'Priorité', 'Image', 'Échéance']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function listerTaches() {
  var sh = feuilleTaches();
  var nb = sh.getLastRow();
  if (nb < 2) return { status: 'ok', taches: [] };

  /* Sans la colonne image, trop lourde pour une liste */
  var lignes = sh.getRange(2, 1, nb - 1, 10).getValues();
  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      id: String(lignes[i][0]),
      titre: texteCellule(lignes[i][1], false),
      detail: texteCellule(lignes[i][2], false),
      pour: texteCellule(lignes[i][3], false),
      par: texteCellule(lignes[i][4], false),
      creee: texteCellule(lignes[i][5], true),
      statut: texteCellule(lignes[i][6], false) || 'afaire',
      priorite: texteCellule(lignes[i][7], false) || 'normale',
      aImage: !!String(lignes[i][8] || ''),
      echeance: texteCellule(lignes[i][9], false),
      ligne: i + 2
    });
  }
  return { status: 'ok', taches: out };
}

/* L'image d'une tâche, à la demande : trop lourde pour la liste */
function imageTache(d) {
  var sh = feuilleTaches();
  var lignes = sh.getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) === String(d.id)) {
      return { status: 'ok', image: String(lignes[i][8] || '') };
    }
  }
  return { status: 'error', message: 'Tâche introuvable.' };
}

function enregistrerTache(d) {
  var sh = feuilleTaches();
  var id = String(d.id || '').trim() || ('t' + new Date().getTime());
  var lignes = sh.getDataRange().getValues();

  var ligne = [
    id,
    String(d.titre || '').trim(),
    String(d.detail || '').trim(),
    String(d.pour || '').trim(),
    String(d.par || d.demandeur || '').trim(),
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.statut || 'afaire'),
    String(d.priorite || 'normale'),
    String(d.image || ''),
    String(d.echeance || '')
  ];

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) === id) {
      /* On garde la date de création et l'image si rien de neuf */
      ligne[5] = lignes[i][5];
      if (!ligne[8]) ligne[8] = lignes[i][8];
      sh.getRange(i + 1, 1, 1, ligne.length).setValues([ligne]);
      return { status: 'ok', id: id, maj: true };
    }
  }

  ajouterLigne(sh, ligne);
  return { status: 'ok', id: id, ajoutee: true };
}

function supprimerTache(d) {
  var sh = feuilleTaches();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) {
      sh.deleteRow(i + 1);
      return { status: 'ok' };
    }
  }
  return { status: 'error', message: 'Tâche introuvable.' };
}

/* ============================================================
   ÉCOUTES PÉDAGOGIQUES

   Deux suivis distincts :
   — « sans » : l'élève ne réserve pas d'écoutes. Le moniteur coche
     la case au questionnaire ; l'élève reste listé tant qu'elle
     l'est, avec la date du premier signalement.
   — « absent » : l'élève avait réservé et n'est pas venu. Chaque
     absence est une ligne, avec la date et l'heure du rendez-vous.
   ============================================================ */
function feuilleEcoutes() {
  var f = classeur();
  var sh = f.getSheetByName('Ecoutes');
  if (!sh) {
    sh = f.insertSheet('Ecoutes', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Élève', 'Type', 'Date rdv', 'Heure rdv',
                  'Signalé le', 'Par', 'Remarque']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function listerEcoutes() {
  var sh = feuilleEcoutes();
  var nb = sh.getLastRow();
  if (nb < 2) return { status: 'ok', sans: [], absents: [] };

  var lignes = sh.getRange(2, 1, nb - 1, 8).getValues();
  var sans = [];
  var absents = [];
  var compte = {};

  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][1]) continue;
    var e = {
      id: String(lignes[i][0]),
      eleve: texteCellule(lignes[i][1], false),
      type: String(lignes[i][2] || ''),
      /* Toujours en ISO : Sheets transforme la colonne en objet Date,
         et « 11/08/2026 » n'est pas lisible par le client. */
      dateRdv: dateVersIso(lignes[i][3]) || texteCellule(lignes[i][3], false),
      heureRdv: texteCellule(lignes[i][4], false),
      signale: texteCellule(lignes[i][5], true),
      par: texteCellule(lignes[i][6], false),
      remarque: texteCellule(lignes[i][7], false),
      ligne: i + 2
    };
    if (e.type === 'absent') {
      absents.push(e);
      var cle = normaliser(e.eleve);
      compte[cle] = (compte[cle] || 0) + 1;
    } else {
      sans.push(e);
    }
  }

  /* Le compteur d'absences, porté par chaque ligne */
  for (var k = 0; k < absents.length; k++) {
    absents[k].total = compte[normaliser(absents[k].eleve)] || 1;
  }

  return { status: 'ok', sans: sans, absents: absents };
}

function enregistrerEcoute(d) {
  var eleve = String(d.eleve || '').trim();
  if (eleve.length < 3) return { status: 'error', message: 'Nom manquant.' };

  var type = (String(d.type) === 'absent') ? 'absent' : 'sans';
  var sh = feuilleEcoutes();
  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');

  /* Un élève ne figure qu'une fois dans la liste « sans » : on garde
     la date du premier signalement, c'est elle qui a du sens. */
  if (type === 'sans') {
    for (var i = 1; i < lignes.length; i++) {
      if (String(lignes[i][2]) === 'sans' &&
          normaliser(lignes[i][1]) === normaliser(eleve)) {
        return { status: 'ok', deja: true };
      }
    }
  }

  ajouterLigne(sh, [
    't' + new Date().getTime() + Math.floor(Math.random() * 1000),
    eleve,
    type,
    String(d.dateRdv || ''),
    String(d.heureRdv || ''),
    maintenant,
    String(d.par || d.demandeur || ''),
    String(d.remarque || '')
  ]);
  return { status: 'ok', ajoute: true };
}

/* Retire une ligne, ou toutes les lignes « sans » d'un élève quand
   la case est décochée. */
function supprimerEcoute(d) {
  var sh = feuilleEcoutes();
  var lignes = sh.getDataRange().getValues();
  var n = 0;

  for (var i = lignes.length - 1; i >= 1; i--) {
    var correspond = d.id
      ? (String(lignes[i][0]) === String(d.id))
      : (String(lignes[i][2]) === 'sans' &&
         normaliser(lignes[i][1]) === normaliser(d.eleve || ''));
    if (correspond) { sh.deleteRow(i + 1); n++; }
  }
  return { status: 'ok', supprimees: n };
}

/* ============================================================
   LES MESSAGES ÉPINGLÉS DU BUREAU

   « Est-ce qu'on peut faire un endroit si on veut mettre un
   message en particulier à un utilisateur ? »

   Le 📨 Messages aux moniteurs qui existait est attaché à un
   ÉLÈVE : il remonte au prochain cours de cet élève-là. Celui-ci
   est attaché à une PERSONNE — « pense à rendre les clés du 208 » —
   et s'affiche en tête de son bandeau, quel que soit l'écran.

   C'est la SEULE ligne du bandeau qui vienne du classeur et non
   d'un calcul : tout le reste se déduit de données qui existent
   déjà. D'où cette feuille, et elle seule.

   DEUX RÈGLES DE PRUDENCE :

     · La liste est filtrée ICI, par destinataire. Un moniteur qui
       demande les messages ne reçoit que les siens — la lecture est
       ouverte à tous, ce n'est donc pas à l'écran de trier.
     · Une date de fin fait disparaître le message tout seul. Sans
       elle, il reste jusqu'à ce que le bureau l'efface : un message
       épinglé qu'on oublie devient un décor, et on cesse de lire
       le bandeau.
   ============================================================ */
function feuilleMessagesBandeau() {
  var f = classeur();
  var sh = f.getSheetByName('MessagesBandeau');
  if (!sh) {
    sh = f.insertSheet('MessagesBandeau', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Destinataires', 'Texte', 'À partir du',
                  "Jusqu'au", 'Par', 'Créé le', 'Important', 'Relancé le']);
    sh.setFrozenRows(1);
    sh.getRange('D:E').setNumberFormat('@');
    return sh;
  }
  /* Les deux colonnes de la v200, sur une feuille qui existait
     déjà. Sans ce rattrapage, « Important » s'écrirait dans une
     colonne sans en-tête : le jour où quelqu'un ouvre le classeur,
     il ne saurait pas ce qu'il lit. */
  if (sh.getLastColumn() < 9) {
    sh.getRange(1, 8, 1, 2).setValues([['Important', 'Relancé le']]);
  }
  return sh;
}

/* ============================================================
   QUI A DIT « J'AI VU » — UNE FEUILLE, PAS UNE COLONNE

   David, le 4 septembre : « j'aimerais pouvoir leur pousser un
   message rapidement, et la possibilité d'indiquer qu'ils l'ont
   bien vu » — puis, sur la disparition du message une fois vu :
   « oui, SI de notre côté on voit qui a mis “j'ai vu” ».

   ⚠️ LA COLONNE « VU PAR » ÉTAIT LE PIÈGE. Y accumuler les noms
   demande de la relire, d'y ajouter le sien, puis de la réécrire
   en entier. Deux personnes qui appuient dans la même minute — ce
   qui est exactement ce qui arrive le jour où on pousse un message
   à toute l'équipe — et la seconde écriture efface la première. On
   croirait qu'Erika n'a pas lu, et le message disparaîtrait chez
   elle sans laisser de trace.

   Une ligne par lecture, ajoutée au bout, jamais modifiée : deux
   personnes en même temps, deux lignes. Le compte se fait à la
   lecture.
   ============================================================ */
function feuilleMessagesVus() {
  var f = classeur();
  var sh = f.getSheetByName('MessagesVus');
  if (!sh) {
    sh = f.insertSheet('MessagesVus', f.getNumSheets());
    ajouterLigne(sh, ['Id du message', 'Qui', 'Quand']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* Les lectures, rangées par message. */
function lecturesParMessage() {
  var sh = feuilleMessagesVus();
  var nb = sh.getLastRow();
  var parId = {};
  if (nb < 2) return parId;

  var v = sh.getRange(2, 1, nb - 1, 3).getValues();
  for (var i = 0; i < v.length; i++) {
    var id = String(v[i][0] || '');
    if (!id) continue;
    if (!parId[id]) parId[id] = [];
    parId[id].push({ qui: texteCellule(v[i][1], false),
                     quand: texteCellule(v[i][2], false) });
  }
  return parId;
}

/* ⚠️ LE NOM VIENT DU RELAIS, JAMAIS DE CE QUE LA PAGE ENVOIE.

   « demandeur » est renseigné par le Worker à partir du code de
   connexion. L'accepter depuis le corps de l'appel laisserait
   n'importe qui accuser réception à la place d'un autre — et
   l'écran du bureau afficherait « vu par David » sans que David
   ait rien vu. Un accusé de lecture auquel on ne peut pas se fier
   est pire que pas d'accusé du tout. */
function marquerMessageVu(d) {
  var id = String((d && d.id) || '').trim();
  if (!id) return { status: 'error', message: 'Message manquant.' };

  var moi = String((d && d.demandeur) || '').trim();
  if (!moi) return { status: 'error', message: 'Personne inconnue.' };

  var sh = feuilleMessagesVus();
  var nb = sh.getLastRow();

  /* Deux appuis de suite ne font pas deux lectures. */
  if (nb > 1) {
    var v = sh.getRange(2, 1, nb - 1, 3).getValues();
    for (var i = 0; i < v.length; i++) {
      if (String(v[i][0]) !== id) continue;
      if (normaliser(v[i][1]) !== normaliser(moi)) continue;
      /* … sauf après une relance : c'est un NOUVEL accusé qu'on
         demande, et il doit pouvoir s'écrire. */
      if (lectureApresRelance(texteCellule(v[i][2], false),
                              relanceDuMessage(id))) {
        return { status: 'ok', deja: true };
      }
    }
  }

  ajouterLigne(sh, [id, moi,
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm')]);
  return { status: 'ok' };
}

/* La date de relance d'un message, ou '' */
function relanceDuMessage(id) {
  var sh = feuilleMessagesBandeau();
  var v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]) === String(id)) return texteCellule(v[i][8], false);
  }
  return '';
}

/* Relancer : le message repasse en gros cadre, et les accusés
   d'avant ne comptent plus.

   On n'EFFACE rien — on pose une date, et la lecture ne retient que
   ce qui vient après. L'historique reste entier : « vu le 4, relancé
   le 6, revu le 6 ». Effacer les lignes aurait perdu la première
   lecture, celle qui dit qu'il avait bien reçu la version d'avant. */
function relancerMessageBandeau(d) {
  var id = String((d && d.id) || '').trim();
  if (!id) return { status: 'error', message: 'Message manquant.' };

  var moi = String((d && d.demandeur) || '');
  var estAdmin = String((d && d.role) || '') === 'admin';

  var sh = feuilleMessagesBandeau();
  var v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]) !== id) continue;

    /* Le même contrôle que pour retirer : on ne relance pas le mot
       d'un autre. */
    if (!estAdmin && normaliser(v[i][5]) !== normaliser(moi)) {
      return { status: 'error',
               message: 'Ce message a été écrit par ' +
                        texteCellule(v[i][5], false) +
                        ' — lui seul, ou une administratrice, peut le relancer.' };
    }

    var quand = Utilities.formatDate(new Date(), 'Europe/Paris',
                                     'dd/MM/yyyy HH:mm');
    /* Relancer remet le gros cadre : c'est ce qu'on demande quand
       on relance. */
    sh.getRange(i + 1, 8, 1, 2).setValues([['oui', quand]]);
    return { status: 'ok', relance: quand };
  }
  return { status: 'error', message: "Ce message n'existe plus." };
}

/* Une lecture compte-t-elle encore ? Non si elle précède la
   relance. Les deux dates s'écrivent « jj/mm/aaaa hh:mm » — on les
   compare sur leur VALEUR, jamais sur leur texte : « 04/09 » vient
   après « 29/08 » dans le temps, et avant dans l'alphabet. */
function lectureApresRelance(quandLu, relance) {
  if (!relance) return true;
  var a = horodatageEnNombre(quandLu);
  var b = horodatageEnNombre(relance);
  if (a === null || b === null) return true;    /* dans le doute, on garde */
  return a >= b;
}

function horodatageEnNombre(t) {
  var m = String(t || '').match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime();
}

/* « tous » vaut pour tout le monde ; sinon une liste de noms
   séparés par « | », comparés normalisés. */
function messageMeConcerne(destinataires, moi) {
  var d = String(destinataires || '').trim();
  if (!d || d === 'tous') return true;
  if (!moi) return false;
  var cible = normaliser(moi);
  var noms = d.split('|');
  for (var i = 0; i < noms.length; i++) {
    if (normaliser(noms[i]) === cible) return true;
  }
  return false;
}

function listerMessagesBandeau(d) {
  var sh = feuilleMessagesBandeau();
  var nb = sh.getLastRow();
  if (nb < 2) return { status: 'ok', messages: [] };

  /* Le Worker renseigne toujours le demandeur ET le rôle ; « tous »
     est le mode de gestion, celui de l'écran d'écriture. */
  var moi = String((d && d.demandeur) || '');
  var toutVoir = !!(d && d.tous);
  var estAdmin = String((d && d.role) || '') === 'admin';
  var auj = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');

  var v = sh.getRange(2, 1, nb - 1, 9).getValues();
  var lectures = lecturesParMessage();
  var out = [];
  for (var i = 0; i < v.length; i++) {
    if (!v[i][0]) continue;

    var du = dateVersIso(v[i][3]);
    var au = dateVersIso(v[i][4]);
    var relance = texteCellule(v[i][8], false);

    /* Les lectures qui comptent encore : celles d'après la
       dernière relance. */
    var vus = (lectures[String(v[i][0])] || []).filter(function (x) {
      return lectureApresRelance(x.quand, relance);
    });

    if (!toutVoir) {
      if (!messageMeConcerne(v[i][1], moi)) continue;
      if (du && du > auj) continue;          /* pas encore commencé */
      if (au && au < auj) continue;          /* terminé */

      /* ⚠️ CELUI QUI A DIT « J'AI VU » NE LE REVOIT PLUS.

         David : « oui, il disparaît pour de bon — si de notre
         côté on voit qui a mis j'ai vu ». Le tri se fait ICI et pas
         à l'écran : un message renvoyé puis caché par la page est
         un message que le navigateur a quand même reçu, et qui
         réapparaît au premier défaut d'affichage. */
      var moiAVu = false;
      for (var k = 0; k < vus.length; k++) {
        if (normaliser(vus[k].qui) === normaliser(moi)) { moiAVu = true; break; }
      }
      if (moiAVu) continue;
    } else if (!estAdmin) {
      /* ⚠️ CHACUN NE GÈRE QUE CE QU'IL A ÉCRIT.

         « Chacun ne voit que ce qu'il a mis, et les admins doivent
         voir tous les messages épinglés de tout le monde. » Un mot
         laissé à un moniteur ne regarde ni les autres moniteurs, ni
         les autres personnes du bureau.

         Le tri se fait ICI, sur le demandeur que le Worker
         renseigne : une liste filtrée côté navigateur est une liste
         que tout le monde a déjà reçue. */
      if (normaliser(v[i][5]) !== normaliser(moi)) continue;
    }

    out.push({
      id: String(v[i][0]),
      destinataires: texteCellule(v[i][1], false),
      texte: texteCellule(v[i][2], false),
      du: du, au: au,
      par: texteCellule(v[i][5], false),
      cree: texteCellule(v[i][6], false),
      important: String(texteCellule(v[i][7], false) || '').toLowerCase() === 'oui',
      relance: relance,
      /* Les lectures ne partent qu'à l'écran de gestion : un
         moniteur n'a pas à savoir qui d'autre a lu quoi, et c'est
         autant de moins à transporter. */
      vus: toutVoir ? vus : undefined
    });
  }
  return { status: 'ok', messages: out };
}

function enregistrerMessageBandeau(d) {
  var texte = String((d && d.texte) || '').trim().slice(0, 400);
  if (!texte) return { status: 'error', message: 'Message vide.' };

  var dest = String((d && d.destinataires) || '').trim() || 'tous';
  var id = String((d && d.id) || '').trim();

  var sh = feuilleMessagesBandeau();
  var ligne = [
    id || ('m' + new Date().getTime()),
    dest, texte,
    dateVersIso(d && d.du) || '',
    dateVersIso(d && d.au) || '',
    String((d && (d.par || d.demandeur)) || ''),
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    (d && d.important) ? 'oui' : '',
    ''
  ];

  /* Modifier plutôt qu'empiler : sans ça, corriger une faute de
     frappe laisserait les deux versions à l'écran. */
  if (id) {
    var v = sh.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) {
      if (String(v[i][0]) !== id) continue;
      /* La relance déjà posée ne se perd pas en corrigeant une
         faute de frappe : elle n'appartient pas au formulaire. */
      ligne[8] = texteCellule(v[i][8], false);
      sh.getRange(i + 1, 1, 1, 9).setValues([ligne]);
      return { status: 'ok', id: id };
    }
  }
  ajouterLigne(sh, ligne);
  return { status: 'ok', id: ligne[0] };
}

function supprimerMessageBandeau(d) {
  var id = String((d && d.id) || '').trim();
  if (!id) return { status: 'error', message: 'Message manquant.' };

  var moi = String((d && d.demandeur) || '');
  var estAdmin = String((d && d.role) || '') === 'admin';

  var sh = feuilleMessagesBandeau();
  var v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i >= 1; i--) {
    if (String(v[i][0]) !== id) continue;

    /* ⚠️ ON NE RETIRE PAS LE MOT D'UN AUTRE.

       La liste est déjà filtrée par auteur, mais un filtre
       d'affichage n'est pas une porte : l'identifiant d'un message
       se devine, et la suppression se demande directement. Le
       contrôle est donc ici aussi. */
    if (!estAdmin && normaliser(v[i][5]) !== normaliser(moi)) {
      return { status: 'error',
               message: 'Ce message a été écrit par ' +
                        texteCellule(v[i][5], false) +
                        ' — lui seul, ou une administratrice, peut le retirer.' };
    }

    sh.deleteRow(i + 1);
    return { status: 'ok' };
  }
  return { status: 'ok', rien: true };
}


/* ============================================================
   NOTIFICATIONS MASQUÉES

   Une alerte peut ne pas concerner le bureau : élève parti, cas
   réglé par téléphone. On la masque plutôt que de la laisser
   clignoter indéfiniment.
   ============================================================ */
function feuilleNotifs() {
  var f = classeur();
  var sh = f.getSheetByName('NotifsMasquees');
  if (!sh) {
    sh = f.insertSheet('NotifsMasquees', f.getNumSheets());
    ajouterLigne(sh, ['Élève', 'Type', 'Masqué le', 'Par']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function listerNotifsMasquees() {
  var sh = feuilleNotifs();
  var nb = sh.getLastRow();
  if (nb < 2) return { status: 'ok', masquees: [] };

  var lignes = sh.getRange(2, 1, nb - 1, 4).getValues();
  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      eleve: texteCellule(lignes[i][0], false),
      type: String(lignes[i][1] || ''),
      quand: texteCellule(lignes[i][2], true),
      par: texteCellule(lignes[i][3], false),
      ligne: i + 2
    });
  }
  return { status: 'ok', masquees: out };
}

function masquerNotif(d) {
  var eleve = String(d.eleve || '').trim();
  var type = String(d.type || '').trim();
  if (!eleve || !type) return { status: 'error', message: 'Alerte incomplète.' };

  var sh = feuilleNotifs();
  var lignes = sh.getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][0]) === normaliser(eleve) &&
        String(lignes[i][1]) === type) {
      return { status: 'ok', deja: true };
    }
  }

  ajouterLigne(sh, [eleve, type,
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.par || d.demandeur || '')]);
  return { status: 'ok', masquee: true };
}

function reafficherNotif(d) {
  var sh = feuilleNotifs();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (normaliser(lignes[i][0]) === normaliser(d.eleve || '') &&
        String(lignes[i][1]) === String(d.type || '')) {
      sh.deleteRow(i + 1);
      return { status: 'ok' };
    }
  }
  return { status: 'ok', rien: true };
}

/* Range les cours d'une journée dans l'ordre voulu par le moniteur */
function ordonnerPreparations(d) {
  var ids = d.ids;
  if (typeof ids === 'string') {
    try { ids = JSON.parse(ids); } catch (e) { ids = []; }
  }
  if (!ids || !ids.length) return { status: 'ok', rien: true };

  var sh = feuillePreparations();
  var lignes = sh.getDataRange().getValues();

  for (var n = 0; n < ids.length; n++) {
    for (var i = 1; i < lignes.length; i++) {
      if (String(lignes[i][0]) === String(ids[n])) {
        sh.getRange(i + 1, 12).setValue(n + 1);
        break;
      }
    }
  }
  return { status: 'ok', ranges: ids.length };
}

/* ============================================================
   SESSIONS D'EXAMEN

   Une session = une demi-journée avec un inspecteur : une date,
   un centre, une heure de début, un nombre de places. Les élèves
   y sont posés place par place ; une place vide reste une place
   fantôme tant que personne n'y est mis.

   Table à part plutôt que déduite des notes : c'est ce qui permet
   d'échanger deux élèves, de garder une place vide, et de savoir
   qui a été prévenu.
   ============================================================ */
/* Une heure telle qu'on l'a saisie : « 14:15 ».

   Sheets transforme une cellule d'heure en objet Date calé sur le
   30 décembre 1899 — c'est sa façon de stocker une heure sans
   date. Rendue telle quelle, elle s'affichait « 30/12/1899 ». */
function heureCellule(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return '';

  if (Object.prototype.toString.call(valeur) === '[object Date]') {
    var h = valeur.getHours();
    var m = valeur.getMinutes();
    return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
  }

  var t = String(valeur).trim();

  /* Déjà au bon format, ou avec un « h » */
  var m2 = t.match(/^(\d{1,2})[:h](\d{2})/);
  if (m2) return ('0' + m2[1]).slice(-2) + ':' + m2[2];

  /* Une date complète dont seule l'heure nous intéresse */
  var m3 = t.match(/(\d{1,2}):(\d{2})/);
  if (m3) return ('0' + m3[1]).slice(-2) + ':' + m3[2];

  return '';
}

function feuilleSessions() {
  var f = classeur();
  var sh = f.getSheetByName('Sessions');
  if (!sh) {
    sh = f.insertSheet('Sessions', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Date', 'Centre', 'Heure début', 'Places',
                  'Moniteur', 'Boîte', 'Inspecteur', 'Créée le', 'Par',
                  'Groupe Messenger']);
    sh.setFrozenRows(1);
    /* Tout en texte : sans ça, « 14:15 » devient un objet Date calé
       sur 1899, et ressort en « 30/12/1899 ». */
    sh.getRange('B:D').setNumberFormat('@');
  }
  return sh;
}

/* Les places : une ligne par créneau, même vide */
function feuillePlacesSession() {
  var f = classeur();
  var sh = f.getSheetByName('PlacesSession');
  if (!sh) {
    sh = f.insertSheet('PlacesSession', f.getNumSheets());
    ajouterLigne(sh, ['Id session', 'Rang', 'Élève', 'Heure', 'Prévenu',
                  'Dossier OK', 'Remarque']);
    sh.setFrozenRows(1);
    sh.getRange('D:D').setNumberFormat('@');
  }
  return sh;
}

function listerSessions() {
  var shS = feuilleSessions();
  var shP = feuillePlacesSession();

  var ls = shS.getDataRange().getValues();
  var lp = shP.getDataRange().getValues();

  var places = {};
  for (var j = 1; j < lp.length; j++) {
    var idS = String(lp[j][0] || '');
    if (!idS) continue;
    if (!places[idS]) places[idS] = [];
    places[idS].push({
      rang: Number(lp[j][1]) || 0,
      eleve: texteCellule(lp[j][2], false),
      heure: heureCellule(lp[j][3]),
      prevenu: String(lp[j][4] || '') === 'oui',
      dossierOk: String(lp[j][5] || '') === 'oui',
      remarque: texteCellule(lp[j][6], false),
      ligne: j + 1
    });
  }

  var out = [];
  for (var i = 1; i < ls.length; i++) {
    if (!ls[i][0]) continue;
    var id = String(ls[i][0]);
    var lot = (places[id] || []).sort(function (a, b) { return a.rang - b.rang; });
    out.push({
      id: id,
      date: dateVersIso(ls[i][1]) || texteCellule(ls[i][1], false),
      centre: texteCellule(ls[i][2], false),
      heureDebut: heureCellule(ls[i][3]),
      places: Number(ls[i][4]) || lot.length,
      moniteur: texteCellule(ls[i][5], false),
      boite: texteCellule(ls[i][6], false),
      inspecteur: texteCellule(ls[i][7], false),
      /* Le groupe Messenger a-t-il été créé pour cette session ? */
      groupeFait: String(ls[i][10] || '') === 'oui',
      creee: texteCellule(ls[i][8], true),
      eleves: lot,
      ligne: i + 1
    });
  }

  out.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
  return { status: 'ok', sessions: out };
}

function enregistrerSession(d) {
  var sh = feuilleSessions();
  var id = String(d.id || '').trim() || ('s' + new Date().getTime());
  var lignes = sh.getDataRange().getValues();

  var valeurs = [
    id,
    String(d.date || ''),
    String(d.centre || ''),
    String(d.heureDebut || ''),
    Number(d.places) || 0,
    String(d.moniteur || ''),
    String(d.boite || ''),
    String(d.inspecteur || ''),
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.par || ''),
    ''                                    /* groupe Messenger, ci-dessous */
  ];

  var trouve = false;
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) === id) {
      valeurs[8] = lignes[i][8];              /* on garde la création */
      /* La coche du groupe Messenger survit à une modification de
         la session : elle ne dépend pas de ses horaires. */
      valeurs[10] = (d.groupeFait !== undefined)
        ? (String(d.groupeFait) === 'oui' ? 'oui' : '')
        : (lignes[i][10] || '');
      var pl = sh.getRange(i + 1, 1, 1, valeurs.length);
      pl.setNumberFormat('@');
      pl.setValues([valeurs]);
      trouve = true;
      break;
    }
  }
  if (!trouve) {
    ajouterLigne(sh, valeurs);
    sh.getRange(sh.getLastRow(), 1, 1, valeurs.length).setNumberFormat('@');
  }

  /* Les places suivent le nombre annoncé : on complète ou on retire
     les places vides en trop. Jamais celles qui portent un élève. */
  ajusterPlaces(id, Number(d.places) || 0, String(d.heureDebut || ''),
                Number(d.duree) || 30);

  return { status: 'ok', id: id };
}

/* Une heure est « calculée » si elle suit l'écart régulier des
   autres : dans ce cas on peut la refaire sans perdre une saisie. */
function estHeureCalculee(heure, toutes, duree, rang) {
  if (rang === 0) return true;
  var prec = toutes[rang - 1].heure;
  if (!prec) return true;

  var a = String(prec).match(/^(\d{1,2})[:h](\d{2})/);
  var b = String(heure).match(/^(\d{1,2})[:h](\d{2})/);
  if (!a || !b) return true;

  var ecart = (Number(b[1]) * 60 + Number(b[2])) -
              (Number(a[1]) * 60 + Number(a[2]));
  return ecart === duree;
}


function ajusterPlaces(idSession, combien, heureDebut, duree) {
  var sh = feuillePlacesSession();
  var lignes = sh.getDataRange().getValues();

  var existantes = [];
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) === String(idSession)) {
      existantes.push({ ligne: i + 1, rang: Number(lignes[i][1]) || 0,
                        eleve: String(lignes[i][2] || ''),
                        /* Lue proprement : un objet Date comparé à
                           « 14:15 » ne correspondait jamais, et le
                           recalcul se croyait face à une saisie
                           manuelle qu'il fallait préserver. */
                        heure: heureCellule(lignes[i][3]) });
    }
  }
  existantes.sort(function (a, b) { return a.rang - b.rang; });

  /* Les heures se recalculent quand l'heure de début change, mais
     jamais celles qu'on a corrigées à la main : une place déplacée
     dans la journée garderait sinon un horaire faux. */
  if (heureDebut) {
    for (var h = 0; h < existantes.length; h++) {
      var attendue = heureCreneau(heureDebut, duree, h);
      var actuelle = existantes[h].heure;
      /* Vide, ou conforme à l'ancien calcul : on peut la refaire */
      if (!actuelle || estHeureCalculee(actuelle, existantes, duree, h)) {
        if (attendue && attendue !== actuelle) {
          var cel = sh.getRange(existantes[h].ligne, 4);
          cel.setNumberFormat('@');
          cel.setValue(attendue);
          existantes[h].heure = attendue;
        }
      }
    }
  }

  /* En ajouter */
  for (var r = existantes.length + 1; r <= combien; r++) {
    ajouterLigne(sh, [idSession, r, '', heureCreneau(heureDebut, duree, r - 1),
                  '', '', '']);
    sh.getRange(sh.getLastRow(), 4).setNumberFormat('@');
  }

  /* En retirer. On enlève des places VIDES, en partant de la fin,
     jusqu'à tomber sur le compte demandé — où qu'elles soient dans
     la session. Ne regarder que les dernières laissait en place un
     trou au milieu, et la demande semblait ignorée. */
  var aEnlever = existantes.length - combien;
  if (aEnlever > 0) {
    var lignesAOter = [];
    for (var k = existantes.length - 1; k >= 0 && lignesAOter.length < aEnlever; k--) {
      if (existantes[k].eleve) continue;        /* occupée : on n'y touche pas */
      lignesAOter.push(existantes[k].ligne);
    }

    /* De la dernière à la première : supprimer décale ce qui suit */
    lignesAOter.sort(function (a, b) { return b - a; });
    for (var s = 0; s < lignesAOter.length; s++) sh.deleteRow(lignesAOter[s]);

    if (lignesAOter.length) renumeroterPlaces(idSession, heureDebut, duree);
  }
}

/* Les rangs se suivent après une suppression : un trou dans la
   numérotation empêchait de retrouver une place par son rang. */
function renumeroterPlaces(idSession, heureDebut, duree) {
  var sh = feuillePlacesSession();
  var lignes = sh.getDataRange().getValues();

  var lot = [];
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== String(idSession)) continue;
    lot.push({ ligne: i + 1, rang: Number(lignes[i][1]) || 0,
               heure: heureCellule(lignes[i][3]) });
  }
  lot.sort(function (a, b) { return a.rang - b.rang; });

  for (var j = 0; j < lot.length; j++) {
    if (lot[j].rang !== j + 1) sh.getRange(lot[j].ligne, 2).setValue(j + 1);

    /* Les créneaux se resserrent avec les places restantes */
    if (heureDebut) {
      var attendue = heureCreneau(heureDebut, duree || 30, j);
      if (attendue && attendue !== lot[j].heure) {
        var cel = sh.getRange(lot[j].ligne, 4);
        cel.setNumberFormat('@');
        cel.setValue(attendue);
      }
    }
  }
}

/* L'heure d'un créneau, d'après l'heure de début */
function heureCreneau(debut, duree, n) {
  var m = String(debut || '').match(/^(\d{1,2})[:h](\d{2})/);
  if (!m) return '';
  var mins = Number(m[1]) * 60 + Number(m[2]) + (duree * n);
  var h = Math.floor(mins / 60) % 24;
  var mi = mins % 60;
  return ('0' + h).slice(-2) + ':' + ('0' + mi).slice(-2);
}

/* Pose, retire ou échange un élève sur une place */
/* Retire la date d'examen du suivi et de la note de l'élève */
function retirerDatePermis(eleve) {
  var sh = feuilleSuivi();
  var lignes = sh.getDataRange().getValues();

  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][0]) !== normaliser(eleve)) continue;
    /* Colonne 2 : la date d'examen. Le reste de la fiche — reste à
       payer, réservations — appartient à l'élève et demeure. */
    sh.getRange(i + 1, 2).setValue('');
    break;
  }

  /* La note de l'élève annonce aussi l'examen : elle nourrit les
     listes du bureau, et doit suivre. */
  var shE = feuilleEleves();
  var le = shE.getDataRange().getValues();
  for (var j = 1; j < le.length; j++) {
    if (normaliser(le[j][0]) !== normaliser(eleve)) continue;

    var note = String(le[j][1] || '');
    var propre = note
      .replace(/Examen du permis (?:fix[ée]|pr[ée]vu)[^\n·]*/gi, '')
      .replace(/Date d'examen : [^\n·]*/gi, '')
      .replace(/\s*·\s*·\s*/g, ' · ')
      .replace(/^\s*·\s*|\s*·\s*$/g, '')
      .trim();

    if (propre !== note) shE.getRange(j + 1, 2).setValue(propre);
    break;
  }
}

/* ============================================================
   L'ARRIVÉE SUR UNE PLACE — LE PENDANT DE retirerDatePermis

   David : « quand un élève est sur une session d'examen il faut
   l'enlever de la liste rendez-vous permis, sinon on risque de
   prendre une place pour lui à la publication suivante alors
   qu'il a déjà une date ».

   ⚠️ LE DÉPART ÉTAIT TRAITÉ ICI, PAS L'ARRIVÉE. Quitter une place
   effaçait la date (retirerDatePermis) quelle que soit la porte ;
   la prendre ne mettait à jour la fiche que par UNE porte, celle
   du bouton « Sa place d'examen » côté application. Le
   glisser-déposer, la saisie du nom dans la place, l'échange de
   deux places et l'import RdvPermis passent tous directement par
   ici — et laissaient l'élève « à planifier », donc dans la liste
   RDV Permis avec une place déjà réservée à son nom.

   C'est aussi ce qui manquait à Romain Kikela le 4 septembre : sa
   place existait, sa colonne « date d'examen » était vide.

   Écrit une seule fois ici, toutes les portes le font.
   ============================================================ */
function dateDeLaSession(idSession) {
  var sh = feuilleSessions();
  var lignes = sh.getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) === String(idSession)) {
      return texteCellule(lignes[i][1], false);
    }
  }
  return '';
}


function poserDatePermis(eleve, jour) {
  var nom = String(eleve || '').trim();
  if (!nom) return;

  var sh = feuilleSuivi();
  var lignes = sh.getDataRange().getValues();

  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][0]) !== normaliser(nom)) continue;

    /* Colonne 2 : la date d'examen. On ne l'écrase que si on en a
       une — une session sans date ne doit pas effacer celle qui
       est déjà posée. */
    if (jour) sh.getRange(i + 1, 2).setValue(String(jour));

    /* Colonne 20 : « à planifier ». C'EST ELLE QUI LE TIENT DANS
       LA LISTE RDV PERMIS. Il a sa place : il n'est plus à
       planifier. Le jour où il la quitte, champsSortieDeSession la
       remet à « oui » — les deux sens sont écrits, chacun d'un
       seul côté. */
    sh.getRange(i + 1, 20).setValue('');
    return;
  }

  /* Aucune ligne de suivi : l'élève n'existe que dans la session.
     On ne lui en fabrique pas une ici — listerSuivi ne lit que ce
     qui est écrit, et les listes du bureau savent déjà lire une
     place sans fiche (voir placeEnSessionDe). */
}


function majPlaceSession(d) {
  var sh = feuillePlacesSession();
  var lignes = sh.getDataRange().getValues();

  function trouver(idS, rang) {
    for (var i = 1; i < lignes.length; i++) {
      if (String(lignes[i][0]) === String(idS) &&
          Number(lignes[i][1]) === Number(rang)) return i + 1;
    }
    return 0;
  }

  /* Échange de deux places, éventuellement entre deux sessions */
  if (d.echangeAvec) {
    var e = (typeof d.echangeAvec === 'string')
      ? JSON.parse(d.echangeAvec) : d.echangeAvec;
    var l1 = trouver(d.idSession, d.rang);
    var l2 = trouver(e.idSession, e.rang);
    if (!l1 || !l2) return { status: 'error', message: 'Place introuvable.' };

    var a = sh.getRange(l1, 3, 1, 5).getValues()[0];   /* élève → remarque */
    var b = sh.getRange(l2, 3, 1, 5).getValues()[0];
    /* L'heure appartient à la place, pas à l'élève : on ne l'échange pas */
    var ha = a[1], hb = b[1];
    a[1] = hb; b[1] = ha;
    sh.getRange(l1, 3, 1, 5).setValues([b]);
    sh.getRange(l2, 3, 1, 5).setValues([a]);

    /* Deux élèves qui échangent leurs places échangent aussi leurs
       dates — et quand l'échange se fait entre DEUX sessions, ce
       n'est pas le même jour. Sans ça, chacun gardait la date de
       l'autre sur sa fiche. */
    try {
      var j1 = dateDeLaSession(d.idSession);
      var j2 = dateDeLaSession(e.idSession);
      if (String(b[0] || '').trim()) poserDatePermis(b[0], j1);
      if (String(a[0] || '').trim()) poserDatePermis(a[0], j2);
    } catch (err) { /* l'échange est fait : on ne le défait pas */ }

    return { status: 'ok', echange: true };
  }

  var l = trouver(d.idSession, d.rang);
  if (!l) return { status: 'error', message: 'Place introuvable.' };

  if (d.eleve !== undefined) {
    var ancien = String(lignes[l - 1][2] || '').trim();
    var nouveau = String(d.eleve || '').trim();

    /* L'élève quitte sa place : sa date d'examen n'a plus lieu
       d'être. Laissée en place, elle le faisait réapparaître dans
       les listes et le replaçait automatiquement dans la session. */
    if (ancien && !nouveau) {
      try { retirerDatePermis(ancien); } catch (e) { /* la place prime */ }
    }

    /* L'élève PREND une place : il a une date, il n'est plus à
       planifier. Le pendant exact de la ligne du dessus, par la
       même porte, pour que toutes les autres en profitent. */
    if (nouveau && normaliser(nouveau) !== normaliser(ancien)) {
      try {
        poserDatePermis(nouveau, dateDeLaSession(d.idSession));
      } catch (e) { /* la place prime */ }
    }

    sh.getRange(l, 3).setValue(nouveau);
  }
  if (d.heure !== undefined) {
    var cH = sh.getRange(l, 4);
    cH.setNumberFormat('@');
    cH.setValue(String(d.heure || ''));
  }
  if (d.prevenu !== undefined) {
    sh.getRange(l, 5).setValue(String(d.prevenu) === 'oui' ? 'oui' : '');
  }
  if (d.dossierOk !== undefined) {
    sh.getRange(l, 6).setValue(String(d.dossierOk) === 'oui' ? 'oui' : '');
  }
  if (d.remarque !== undefined) sh.getRange(l, 7).setValue(String(d.remarque || ''));

  return { status: 'ok' };
}

/* Marque le groupe Messenger comme fait, ou le décoche */
function marquerGroupeSession(d) {
  var sh = feuilleSessions();
  var lignes = sh.getDataRange().getValues();

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== String(d.id)) continue;
    sh.getRange(i + 1, 11).setValue(String(d.groupeFait) === 'oui' ? 'oui' : '');
    return { status: 'ok' };
  }
  return { status: 'error', message: 'Session introuvable.' };
}

function supprimerSession(d) {
  var sh = feuilleSessions();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) { sh.deleteRow(i + 1); break; }
  }
  /* Ses places partent avec elle */
  var shP = feuillePlacesSession();
  var lp = shP.getDataRange().getValues();
  for (var j = lp.length - 1; j >= 1; j--) {
    if (String(lp[j][0]) === String(d.id)) shP.deleteRow(j + 1);
  }
  return { status: 'ok' };
}

/* ============================================================
   REPRISE DES DATES D'EXAMEN EXISTANTES

   Les dates saisies avant les sessions vivent dans la feuille
   Suivi. On les regroupe par date et centre pour en faire des
   sessions, sans toucher au suivi lui-même.

   Ne se lance qu'à la demande, et ne crée jamais de doublon :
   une session existante pour cette date et ce centre est
   complétée, pas dupliquée.
   ============================================================ */
/* Place un élève dans la session de sa date, en créant la session
   si elle n'existe pas. Appelé dès qu'une date d'examen est posée :
   sans ça, il fallait la ressaisir dans les deux écrans. */
/* ============================================================
   RETROUVER QUI ÉTAIT SUR UNE PLACE VIDÉE

   David, le 9 septembre 2026 : « ma collègue a fait un cliquer-
   glisser pour modifier les sessions de certaines personnes et tout
   a disparu ; ce qu'elle a décalé s'est transformé en place libre et
   on ne sait plus qui était sur ces places ».

   La cause est refermée deux fois (dateVersIso, et la règle « une
   date illisible n'est pas une date effacée »). Reste à remettre les
   noms — et surtout à ne PAS les deviner.

   ⚠️ TROIS TRACES SURVIVENT AU DÉGÂT, ET ON LES REND TOUTES LES
   TROIS PLUTÔT QUE DE CHOISIR À LA PLACE DE DAVID :

     1. LA PLACE ELLE-MÊME. « retirerDesSessions » n'efface QUE la
        colonne du nom. L'heure, « prévenu », « dossier OK » et la
        remarque sont restés dessus. Une place vide qui porte encore
        une remarque ou un « prévenu », c'est une place qui a été
        vidée — une place jamais donnée n'a rien du tout.

     2. LA FICHE DE L'ÉLÈVE. Sa date d'examen y est toujours écrite,
        en toutes lettres. Un élève dont la fiche dit « lundi 14
        septembre » et qui n'est sur aucune place de la session du
        14 septembre, c'est un élève qu'on a fait tomber.

     3. LE JOURNAL. Chaque déplacement y a laissé une ligne
        horodatée, avec le nom et la date écrite. C'est la preuve
        datée, celle qui dit aussi À QUELLE HEURE ça s'est produit.

   On rapproche les trois et on rend le tout tel quel. C'est David
   qui remet, ligne par ligne, en voyant la preuve en face. Un outil
   qui « répare tout seul » sur trois indices ferait, un jour, une
   deuxième catastrophe pour effacer la première.
   ============================================================ */
function placesPerduesSession(d) {
  var res = listerSessions();
  var sessions = (res && res.sessions) || [];
  var auj = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');

  /* Les fiches, par date d'examen lisible. Ce sont elles qui
     nomment les absents. */
  var parDate = {};
  var suivi = [];
  try { suivi = listerSuivi() || []; } catch (e) { suivi = []; }
  for (var i = 0; i < suivi.length; i++) {
    var s = suivi[i];
    if (!s.eleve || !s.datePermis) continue;
    var iso = dateVersIso(s.datePermis);
    if (!iso || iso < auj) continue;
    if (!parDate[iso]) parDate[iso] = [];
    parDate[iso].push({ eleve: String(s.eleve),
                        centre: String(s.centre || ''),
                        dateEcrite: String(s.datePermis) });
  }

  /* Le journal du jour demandé — ou des sept derniers jours. C'est
     la preuve datée, et elle dit aussi qui a fait le geste. */
  var journal = [];
  try {
    var shJ = feuilleJournal();
    var lj = shJ.getDataRange().getValues();
    var depuis = new Date().getTime() - 7 * 24 * 3600 * 1000;
    for (var j = 1; j < lj.length; j++) {
      if (String(lj[j][3] || '') !== 'Fiche de suivi modifiée') continue;
      var quand = lj[j][0];
      var t = (quand instanceof Date) ? quand.getTime() : 0;
      if (t && t < depuis) continue;
      var detail = String(lj[j][5] || '');
      if (detail.indexOf('datePermis') === -1) continue;
      journal.push({
        quand: (quand instanceof Date)
          ? Utilities.formatDate(quand, 'Europe/Paris', 'dd/MM/yyyy HH:mm') : '',
        par: String(lj[j][1] || ''),
        eleve: String(lj[j][4] || ''),
        detail: detail,
        /* La date écrite dans la ligne, ramenée au format des
           sessions : c'est elle qui rattache la preuve à la place. */
        date: dateVersIso((detail.match(/datePermis = ([^·]+)/) || [])[1] || '')
      });
    }
  } catch (e) { /* sans journal, les deux autres traces suffisent */ }

  var out = [];
  for (var k = 0; k < sessions.length; k++) {
    var se = sessions[k];
    if (!se.date || se.date < auj) continue;      /* le passé est de l'histoire */

    var places = se.eleves || se.places || [];
    var occupes = {};
    var trous = [];

    for (var m = 0; m < places.length; m++) {
      var p = places[m];
      if (p.eleve) { occupes[normaliser(p.eleve)] = true; continue; }
      /* ⚠️ UNE PLACE VIDÉE GARDE SES MARQUES. Une place jamais
         donnée n'a rien : ni remarque, ni « prévenu », ni « dossier
         OK ». La différence est le seul indice que porte la feuille
         elle-même. */
      var marques = [];
      if (p.prevenu) marques.push('prévenu');
      if (p.dossierOk) marques.push('dossier OK');
      if (p.remarque) marques.push('« ' + String(p.remarque) + ' »');
      if (!marques.length) continue;
      trous.push({ rang: p.rang, heure: String(p.heure || ''),
                   marques: marques.join(' · ') });
    }

    /* Les absents : leur fiche dit cette date, aucune place ne les
       porte. C'est la trace la plus sûre des trois. */
    var absents = [];
    var candidats = parDate[se.date] || [];
    for (var n = 0; n < candidats.length; n++) {
      if (occupes[normaliser(candidats[n].eleve)]) continue;
      absents.push(candidats[n]);
    }

    /* Les lignes du journal qui parlent de cette date-là. */
    var preuves = [];
    for (var q = 0; q < journal.length; q++) {
      if (journal[q].date === se.date) preuves.push(journal[q]);
    }

    if (!trous.length && !absents.length) continue;
    out.push({ id: se.id, date: se.date, centre: String(se.centre || ''),
               trous: trous, absents: absents, preuves: preuves,
               libres: places.filter(function (x) { return !x.eleve; }).length });
  }

  return { status: 'ok', sessions: out };
}


/* Remettre un nom sur une place — un seul, désigné à la main.

   ⚠️ ON N'ÉCRASE JAMAIS QUELQU'UN. Si la place a été redonnée
   entre-temps, on refuse et on dit à qui : réparer une perte en
   en créant une autre serait la même faute, dans l'autre sens.

   Et on ne repasse PAS par enregistrerSuivi : la fiche de l'élève
   porte déjà sa date, c'est justement ce qui a permis de le
   retrouver. Une écriture de plus, c'est un chemin de plus par où
   quelque chose peut mal tourner. */
function remettreSurPlace(d) {
  var idS = String(d.idSession || '');
  var rang = Number(d.rang);
  var eleve = String(d.eleve || '').trim();
  if (!idS || !rang || !eleve) {
    return { status: 'error', message: 'Place ou élève manquant.' };
  }

  var sh = feuillePlacesSession();
  var lignes = sh.getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== idS) continue;
    if (Number(lignes[i][1]) !== rang) continue;

    var occupant = String(lignes[i][2] || '').trim();
    if (occupant && normaliser(occupant) !== normaliser(eleve)) {
      return { status: 'error',
               message: 'Cette place est à ' + occupant + ' maintenant. ' +
                        'Choisis une autre place pour ' + eleve + '.' };
    }

    sh.getRange(i + 1, 3).setValue(eleve);
    return { status: 'ok', eleve: eleve, rang: rang };
  }
  return { status: 'error', message: 'Place introuvable.' };
}


/* Retirer un élève de toutes ses places à venir.

   Sa date effacée, il n'a plus rien à faire sur une session : la
   place redevient libre pour quelqu'un d'autre. */
function retirerDesSessions(eleve) {
  var recherche = normaliser(eleve);
  if (!recherche) return;

  var sh = feuillePlacesSession();
  var lignes = sh.getDataRange().getValues();
  var auj = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');

  /* La date vit sur la session, pas sur la place : on la lit une
     fois pour toutes.

     ⚠️ ET ELLE NE SE LISAIT JAMAIS — v223.

     « listerSessions() » rend un OBJET, « { status, sessions } »,
     pas un tableau. Le « forEach » levait à chaque appel, le
     « catch » l'avalait, et la table des dates restait vide. Le
     test d'en dessous — « les sessions passées gardent leur
     trace » — ne s'est donc JAMAIS appliqué : l'effacement portait
     aussi sur l'historique.

     Rien ne le disait. La fonction faisait son travail, le
     commentaire décrivait une protection qui n'existait pas, et
     c'est ce qui a élargi le dégât du 9 septembre au-delà des
     sessions à venir.

     ⚠️ ET LE « catch » DISAIT LUI-MÊME CE QUI SE PASSAIT : « sans
     les dates, on retire partout ». Il décrivait exactement la
     panne qu'il masquait. Un filet qui rattrape une faute de frappe
     aussi bien qu'une panne de réseau ne rattrape plus rien : il se
     contente de rendre le défaut silencieux. Les deux autres
     appelants de listerSessions, eux, lisent bien « .sessions ». */
  var dates = {};
  try {
    var toutes = listerSessions();
    ((toutes && toutes.sessions) || []).forEach(function (s) {
      dates[String(s.id)] = s.date || '';
    });
  } catch (e) { /* sans les dates, on retire partout */ }

  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][2]) !== recherche) continue;

    /* Les sessions passées gardent leur trace : c'est l'histoire */
    var d = dates[String(lignes[i][0])] || '';
    if (d && d < auj) continue;

    /* La place se vide sans disparaître : elle reste à donner */
    sh.getRange(i + 1, 3).setValue('');
  }
}

/* ============================================================
   ON N'INVENTE PAS UNE PLACE D'EXAMEN

   Jusqu'à la v790, enregistrer une date d'examen faisait ceci :
   le serveur cherchait une session à cette date avec une place
   libre, et s'il n'en trouvait pas, IL CRÉAIT LA SESSION. Et si
   la session était pleine, IL AJOUTAIT UNE PLACE. Le commentaire
   était dans le code : « Aucune place libre : on en ajoute une ».
   Aucun refus, jamais.

   Autrement dit, le bureau pouvait placer un élève sur un examen
   dont l'école n'a pas la place. L'écran affichait une date, la
   feuille portait une session, tout avait l'air en ordre — et il
   n'y avait rien derrière.

   ─ « APPLIQUE » DEPUIS LE 2 SEPTEMBRE ─

   Le mode « observe » reste écrit : il inventerait comme avant,
   mais en le disant. On est passé directement en « applique ».

   ⚠️ LE SIGNALEMENT VAUT DANS LES DEUX MODES, et c'est voulu : un
   refus laisse sa ligne 🎫 dans 🚨 Signalements. Comme on n'a
   jamais fait tourner l'observation, on part sans mesure — si un
   enregistrement est refusé quelque part où on ne l'attendait pas,
   ça se lit au lieu de se deviner.

   Les places s'ouvrent dans 🎓 Suivi permis. Partout ailleurs, on
   ne fait que les remplir.
   ============================================================ */
var MODE_PLACES = 'applique';       /* 'observe' | 'applique' */

function signalerPlaceInventee(eleve, dateIso, quoi) {
  try {
    enregistrerIncident({
      demandeur: 'places d\'examen',
      version: MODE_PLACES,
      appareil: 'script',
      ou: 'placerDansSession',
      message: '🎫 Place inventée — ' + quoi + ' — ' + eleve +
               ' le ' + dateIso,
      details: MODE_PLACES === 'observe'
        ? 'Mode observation : la place a été créée quand même. En mode ' +
          '« applique », cet enregistrement aurait été refusé.'
        : 'Refusé : aucune place libre à cette date.'
    });
  } catch (e) { /* un signalement raté ne bloque pas le travail */ }
}

/* Rendu quand on refuse : l'appelant doit pouvoir le distinguer
   d'un placement réussi, et dire pourquoi à l'écran. */
var PLACE_REFUSEE = 'refus:aucune-place-libre';

function placerDansSession(eleve, dateIso, centre, heure, boite) {
  if (!eleve || !dateIso) return null;

  var shP = feuillePlacesSession();

  /* Déjà placé quelque part à cette date ? On n'y touche pas.
     Sans ce contrôle, enregistrer une fiche renvoyait l'élève dans
     la PREMIÈRE session du jour, défaisant le travail de celui qui
     venait de le déplacer entre deux sessions du même jour. */
  var lpAvant = shP.getDataRange().getValues();
  var lsAvant = feuilleSessions().getDataRange().getValues();
  var datesSessions = {};
  for (var d = 1; d < lsAvant.length; d++) {
    if (lsAvant[d][0]) datesSessions[String(lsAvant[d][0])] = dateVersIso(lsAvant[d][1]);
  }
  for (var q = 1; q < lpAvant.length; q++) {
    if (normaliser(lpAvant[q][2]) !== normaliser(eleve)) continue;
    if (datesSessions[String(lpAvant[q][0])] === dateIso) {
      return String(lpAvant[q][0]);       /* il est déjà au bon jour */
    }
  }

  var shS = feuilleSessions();
  var ls = shS.getDataRange().getValues();
  var cible = '';
  /* Y AVAIT-IL SEULEMENT UNE SESSION CE JOUR-LÀ ?

     Sans ce témoin, le signalement mentait. Une session complète
     est sautée par le « continue » ci-dessous, donc « cible » reste
     vide, donc on annonçait « session entière » — c'est-à-dire
     « aucune session ce jour-là » — alors que la session existait
     et que ses places étaient prises. Deux causes très
     différentes : l'une se répare en ouvrant une journée, l'autre
     en libérant une place. */
  var sessionCeJourLa = false;

  for (var i = 1; i < ls.length; i++) {
    if (!ls[i][0]) continue;
    if (dateVersIso(ls[i][1]) !== dateIso) continue;
    if (centre && String(ls[i][2] || '') &&
        normaliser(ls[i][2]) !== normaliser(centre)) continue;

    sessionCeJourLa = true;

    /* Une session complète n'accueille personne de plus : deux
       sessions le même jour se distinguent par leurs places libres. */
    var libre = false;
    for (var z = 1; z < lpAvant.length; z++) {
      if (String(lpAvant[z][0]) === String(ls[i][0]) && !lpAvant[z][2]) {
        libre = true;
        break;
      }
    }
    if (!libre) continue;

    cible = String(ls[i][0]);
    break;
  }

  if (!cible) {
    /* AUCUNE SESSION OUVERTE À CETTE DATE. On n'en crée plus une :
       une session, c'est une journée d'examen que la préfecture a
       donnée, pas une ligne qu'un enregistrement fabrique. */
    signalerPlaceInventee(eleve, dateIso, sessionCeJourLa
      ? 'toutes les places de la journée sont prises'
      : 'aucune session ouverte ce jour-là');
    if (MODE_PLACES === 'applique') return PLACE_REFUSEE;

    cible = 's' + new Date().getTime() + Math.floor(Math.random() * 1000);
    ajouterLigne(shS, [cible, dateIso, String(centre || ''), String(heure || ''),
                   0, '', String(boite || ''), '',
                   Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
                   'automatique']);
  }

  /* Déjà placé ailleurs ? On le retire de son ancienne place : un
     élève ne passe pas deux fois le même examen. */
  var lp = shP.getDataRange().getValues();
  var rangMax = 0;

  for (var j = 1; j < lp.length; j++) {
    if (normaliser(lp[j][2]) === normaliser(eleve)) {
      if (String(lp[j][0]) === cible) return cible;   /* déjà au bon endroit */
      shP.getRange(j + 1, 3).setValue('');            /* place redevient libre */
    }
    if (String(lp[j][0]) === cible) {
      rangMax = Math.max(rangMax, Number(lp[j][1]) || 0);
      /* Une place vide de cette session : on la prend */
      if (!lp[j][2]) {
        shP.getRange(j + 1, 3).setValue(eleve);
        if (heure && !lp[j][3]) shP.getRange(j + 1, 4).setValue(heure);
        return cible;
      }
    }
  }

  /* LA SESSION EXISTE MAIS ELLE EST PLEINE.

     C'est ici qu'on fabriquait de la capacité : une place de plus,
     et le compte des candidats dépassait le nombre de places
     réellement ouvertes sans que rien ne le dise. */
  signalerPlaceInventee(eleve, dateIso, 'place supplémentaire');
  if (MODE_PLACES === 'applique') return PLACE_REFUSEE;

  ajouterLigne(shP, [cible, rangMax + 1, eleve, String(heure || ''), '', '', '']);
  return cible;
}

function reprendreDatesEnSessions(d) {
  var suivi = listerSuivi();
  var dejaS = listerSessions().sessions;

  /* Ce qui existe déjà, par date + centre */
  var connues = {};
  for (var k = 0; k < dejaS.length; k++) {
    var cS = normaliser(dejaS[k].date + '|' + dejaS[k].centre);
    connues[cS] = dejaS[k];
  }

  /* Les élèves à placer, groupés */
  var groupes = {};
  for (var i = 0; i < suivi.length; i++) {
    var s = suivi[i];
    if (!s.datePermis) continue;

    var iso = dateVersIso(s.datePermis);
    if (!iso) continue;

    var centre = String(s.centre || '');
    var cle = iso + '|' + centre;
    if (!groupes[cle]) {
      groupes[cle] = { date: iso, centre: centre, eleves: [],
                       boite: String(s.typeExamen || '') };
    }
    groupes[cle].eleves.push({
      eleve: s.eleve,
      heure: String(s.heurePermis || ''),
      toutOk: (s.toutOk === 'oui')
    });
  }

  var creees = 0, completees = 0, places = 0;

  for (var cle2 in groupes) {
    if (!groupes.hasOwnProperty(cle2)) continue;
    var g = groupes[cle2];

    /* Les élèves dans l'ordre de leur heure, quand elle est connue */
    g.eleves.sort(function (a, b) {
      return String(a.heure).localeCompare(String(b.heure));
    });

    var cK = normaliser(g.date + '|' + g.centre);
    var sess = connues[cK];
    var idS;

    if (sess) {
      idS = sess.id;
      completees++;
    } else {
      idS = 's' + new Date().getTime() + Math.floor(Math.random() * 1000);
      ajouterLigne(feuilleSessions(), [
        idS, g.date, g.centre,
        g.eleves.length ? g.eleves[0].heure : '',
        g.eleves.length, '', g.boite, '',
        Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
        String(d.par || 'reprise')
      ]);
      creees++;
    }

    /* Les places : on n'écrase jamais un élève déjà posé */
    var shP = feuillePlacesSession();
    var lp = shP.getDataRange().getValues();
    var occupees = {};
    var dernierRang = 0;
    for (var j = 1; j < lp.length; j++) {
      if (String(lp[j][0]) !== String(idS)) continue;
      dernierRang = Math.max(dernierRang, Number(lp[j][1]) || 0);
      if (lp[j][2]) occupees[normaliser(lp[j][2])] = true;
    }

    for (var m = 0; m < g.eleves.length; m++) {
      var el = g.eleves[m];
      if (occupees[normaliser(el.eleve)]) continue;   /* déjà placé */
      dernierRang++;
      ajouterLigne(shP, [idS, dernierRang, el.eleve, el.heure,
                     '', el.toutOk ? 'oui' : '', '']);
      places++;
    }
  }

  return { status: 'ok', creees: creees, completees: completees, places: places };
}

/* ============================================================
   AFFICHAGE DYNAMIQUE

   Deux écrans : l'accueil (planning du jour, images, messages,
   météo) et la vitrine (sans le planning, visible de la rue).

   Lecture seule et sans code d'accès : un téléviseur ne se
   connecte pas. L'adresse porte un jeton, et cette route ne donne
   accès à rien d'autre.
   ============================================================ */
/* ============================================================
   PROCÉDURES À CORRIGER

   Un élève envoie sa procédure sur Messenger ; le bureau la
   dépose ici, et celle qui corrige la voit arriver.
   ============================================================ */
/* ============================================================
   LA FLOTTE

   Deux feuilles : les véhicules, et tout ce qui leur arrive —
   relevés de kilomètres, entretiens, passages au garage, contrôles
   techniques, pannes signalées par les moniteurs.

   Les échéances se calculent plutôt que de se saisir : un contrôle
   technique enregistré pose le suivant, une révision faite pose la
   prochaine au kilométrage voulu.
   ============================================================ */

/* La périodicité du contrôle technique, par catégorie.
   Véhicule auto-école : premier contrôle avant le 4e anniversaire,
   puis tous les 2 ans. Catégorie L (moto, scooter, 125) : tous les
   3 ans. Remorque de moins de 3,5 t : aucun contrôle. */
var CT_PAR_CATEGORIE = {
  voiture:  { premier: 48, suivant: 24 },
  moto:     { premier: 60, suivant: 36 },
  scooter:  { premier: 60, suivant: 36 },
  '125':    { premier: 60, suivant: 36 },
  remorque: null
};

/* ============================================================
   LA PAIE

   Un outil de TRANSMISSION, pas un logiciel de paie : il rassemble
   ce que le gestionnaire doit savoir et compose le message. Les
   décisions — traitement d'un chevauchement CP/arrêt, application
   d'une convention — restent les siennes.

   Base : 35 h sur 4 jours, soit 8,75 h par jour.
   ============================================================ */
var BASE_HEBDO = 35;
var HEURES_JOUR = 8.75;

function feuillePaieSalaries() {
  var f = classeur();
  var sh = f.getSheetByName('PaieSalaries');
  if (!sh) {
    sh = f.insertSheet('PaieSalaries', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Nom', 'Base hebdo', 'Heures par jour',
                  'Jours par semaine', 'Actif', 'Remarque',
                  'Report heures', 'Report du mois', 'Ordre',
                  'Jours travaillés']);
    sh.setFrozenRows(1);
    return sh;
  }

  /* Les colonnes ajoutées après coup : la feuille existante
     s'élargit toute seule plutôt que de faire échouer la lecture.
     — Ordre (10) : la place voulue dans le tableau ;
     — Jours travaillés (11) : « 1,2,3,5,6 », lundi = 1. C'est lui
       qui dit si un jour férié tombe sur un jour de travail.

     ⚠️ Toute colonne ajoutée ici doit l'être AUSSI dans la plage
     que lit le Worker (PaieSalaries!A2:K) : c'est lui qui répond
     à paieList, la demande n'arrive jamais jusqu'ici. */
  var manque = 11 - sh.getMaxColumns();
  if (manque > 0) sh.insertColumnsAfter(sh.getMaxColumns(), manque);
  var ENTETES = { 10: 'Ordre', 11: 'Jours travaillés' };
  Object.keys(ENTETES).forEach(function (c) {
    var n = Number(c);
    if (!String(sh.getRange(1, n).getValue() || '').trim()) {
      sh.getRange(1, n).setValue(ENTETES[c]);
    }
  });
  return sh;
}

function feuillePaieSemaines() {
  var f = classeur();
  var sh = f.getSheetByName('PaieSemaines');
  if (!sh) {
    sh = f.insertSheet('PaieSemaines', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Id salarié', 'Semaine du', 'Heures faites',
                  'Jours absents', 'Normal forcé', 'Majoré forcé',
                  'Remarque', 'Par', 'Créé le', 'Jours forcés']);
    sh.setFrozenRows(1);
    return sh;
  }

  /* « Jours forcés » (11), ajoutée après coup : les jours
     d'absence DÉCIDÉS pour cette semaine. Vide = le calcul fait
     foi, jours fériés compris ; un 0 décidé décoche le férié. La
     colonne 5 ne portait qu'un instantané, incapable de dire la
     différence entre « zéro absence » et « zéro décidé ».

     ⚠️ À ajouter AUSSI dans la plage que lit le Worker
     (PaieSemaines!A2:K) : c'est lui qui répond à paieList. */
  var manque = 11 - sh.getMaxColumns();
  if (manque > 0) sh.insertColumnsAfter(sh.getMaxColumns(), manque);
  if (!String(sh.getRange(1, 11).getValue() || '').trim()) {
    sh.getRange(1, 11).setValue('Jours forcés');
  }
  return sh;
}


/* ============================================================
   LA CLÔTURE D'UN MOIS DE PAIE

   Le CALCUL d'un mois se recalcule à chaque ouverture ; la
   DÉCISION prise sur ce mois, elle, ne doit plus bouger. Les deux
   vivaient dans le même champ « report » sur la fiche du salarié :
   un nombre mutable qui ne savait dire qu'une chose, et qui
   s'écrasait au mois suivant sans laisser de trace.

   Une clôture est donc une ligne à part, par salarié et par mois.
   Elle garde côte à côte ce que l'application avait calculé et ce
   que la direction a décidé — payer, reporter, transformer en
   récupération. Les compteurs se lisent ensuite dans cette
   histoire ; personne ne les écrit, donc ils ne peuvent pas
   dériver.
   ============================================================ */
function feuillePaieCloture() {
  var f = classeur();
  var sh = f.getSheetByName('PaieCloture');
  if (!sh) {
    sh = f.insertSheet('PaieCloture', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Id salarié', 'Mois',
                  'Normales calculées', 'Majorées calculées',
                  'Normales payées', 'Majorées payées',
                  'Normales en récup', 'Majorées en récup',
                  'Taux récup 25%', 'Récup créditée',
                  'Remarque', 'Par', 'Validé le']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function listerCloturesPaie() {
  var sh = feuillePaieCloture();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(2, 1, derniere - 1, 14).getValues();
  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      id: String(lignes[i][0]),
      idSalarie: String(lignes[i][1]),
      mois: String(lignes[i][2]),
      normalesCalc: Number(lignes[i][3]) || 0,
      majoreesCalc: Number(lignes[i][4]) || 0,
      normalesPayees: Number(lignes[i][5]) || 0,
      majoreesPayees: Number(lignes[i][6]) || 0,
      normalesRecup: Number(lignes[i][7]) || 0,
      majoreesRecup: Number(lignes[i][8]) || 0,
      /* 1 ou 1,25 : une heure à 25 % peut valoir une heure de
         récup ou une heure un quart. C'est la direction qui
         tranche, et le taux retenu se garde avec la décision. */
      tauxRecup: Number(lignes[i][9]) || 1,
      recupCreditee: Number(lignes[i][10]) || 0,
      remarque: String(lignes[i][11] || ''),
      par: String(lignes[i][12] || ''),
      valideLe: texteCellule(lignes[i][13], false)
    });
  }
  return out;
}

function enregistrerCloturePaie(d) {
  var sh = feuillePaieCloture();
  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');

  var idSalarie = String(d.idSalarie || '');
  var mois = String(d.mois || '');
  if (!idSalarie || !mois) {
    return { status: 'error', message: 'Salarié ou mois manquant.' };
  }

  /* Un salarié et un mois : une seule clôture. Deux lignes se
     contrediraient, et le compteur additionnerait les deux. */
  var id = String(d.id || '').trim();
  if (!id) {
    for (var k = 1; k < lignes.length; k++) {
      if (String(lignes[k][1]) === idSalarie && String(lignes[k][2]) === mois) {
        id = String(lignes[k][0]);
        break;
      }
    }
  }
  if (!id) id = 'c' + new Date().getTime() + Math.floor(Math.random() * 100);

  var valeurs = [
    id, idSalarie, mois,
    Number(d.normalesCalc) || 0,
    Number(d.majoreesCalc) || 0,
    Number(d.normalesPayees) || 0,
    Number(d.majoreesPayees) || 0,
    Number(d.normalesRecup) || 0,
    Number(d.majoreesRecup) || 0,
    Number(d.tauxRecup) || 1,
    Number(d.recupCreditee) || 0,
    String(d.remarque || ''),
    String(d.par || ''),
    maintenant
  ];

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== id) continue;
    sh.getRange(i + 1, 1, 1, valeurs.length).setValues([valeurs]);
    return { status: 'ok', id: id, maj: true };
  }
  ajouterLigne(sh, valeurs);
  return { status: 'ok', id: id };
}

/* Clôturer un mois ENTIER en une écriture.

   Valider, c'est un seul geste sur un seul bouton : ça ne doit pas
   coûter un aller-retour par salarié. La feuille est déjà en
   mémoire, une passe suffit. */
function cloturerLeMois(d) {
  var recus;
  try {
    recus = (typeof d.lignes === 'string') ? JSON.parse(d.lignes) : d.lignes;
  } catch (e) { recus = null; }
  if (!recus || !recus.length) return { status: 'ok', ecrites: 0 };

  var sh = feuillePaieCloture();
  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');
  var mois = String(d.mois || '');
  var par = String(d.par || '');

  /* Où se trouve déjà la clôture de chacun : une seule lecture de
     la feuille pour tout le monde. */
  var place = {};
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][2]) !== mois) continue;
    place[String(lignes[i][1])] = i + 1;
  }

  var ajouts = [];
  var ecrites = 0;

  for (var k = 0; k < recus.length; k++) {
    var c = recus[k];
    var idSalarie = String(c.idSalarie || '');
    if (!idSalarie) continue;

    var ligne = place[idSalarie];
    var id = ligne ? String(lignes[ligne - 1][0])
                   : ('c' + new Date().getTime() + k);

    var v = [
      id, idSalarie, mois,
      Number(c.normalesCalc) || 0, Number(c.majoreesCalc) || 0,
      Number(c.normalesPayees) || 0, Number(c.majoreesPayees) || 0,
      Number(c.normalesRecup) || 0, Number(c.majoreesRecup) || 0,
      Number(c.tauxRecup) || 1, Number(c.recupCreditee) || 0,
      String(c.remarque || ''), par, maintenant
    ];

    if (ligne) { sh.getRange(ligne, 1, 1, v.length).setValues([v]); ecrites++; }
    else ajouts.push(v);
  }

  /* Les nouvelles d'un bloc : un appendRow par salarié coûterait
     autant d'écritures que de lignes. */
  if (ajouts.length) {
    sh.getRange(sh.getLastRow() + 1, 1, ajouts.length, ajouts[0].length)
      .setValues(ajouts);
    ecrites += ajouts.length;
  }
  return { status: 'ok', ecrites: ecrites };
}

/* Rouvrir un mois ENTIER : toutes ses décisions s'effacent d'un
   coup, et le calcul reprend la main. */
function rouvrirLeMois(d) {
  var sh = feuillePaieCloture();
  var lignes = sh.getDataRange().getValues();
  var mois = String(d.mois || '');
  if (!mois) return { status: 'ok', effacees: 0 };

  var n = 0;
  /* De bas en haut : supprimer une ligne décale toutes celles du
     dessous, et on sauterait une clôture sur deux. */
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][2]) !== mois) continue;
    sh.deleteRow(i + 1);
    n++;
  }
  return { status: 'ok', effacees: n };
}

/* Rouvrir un mois : la décision s'efface, le calcul reprend la
   main. Geste explicite — un mois clos ne se rouvre jamais tout
   seul, sinon le compteur réécrirait l'histoire. */
function supprimerCloturePaie(d) {
  var sh = feuillePaieCloture();
  var lignes = sh.getDataRange().getValues();
  var cible = String(d.id || '').trim();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === cible) sh.deleteRow(i + 1);
  }
  return { status: 'ok' };
}

function feuillePaieAbsences() {
  var f = classeur();
  var sh = f.getSheetByName('PaieAbsences');
  if (!sh) {
    sh = f.insertSheet('PaieAbsences', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Id salarié', 'Type', 'Du', 'Au',
                  'Remarque', 'Transmis', 'Par', 'Créé le']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function listerSalaries() {
  var sh = feuillePaieSalaries();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(2, 1, derniere - 1, 10).getValues();
  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      id: String(lignes[i][0]),
      nom: texteCellule(lignes[i][1], false),
      baseHebdo: Number(lignes[i][2]) || BASE_HEBDO,
      heuresJour: Number(lignes[i][3]) || HEURES_JOUR,
      joursSemaine: Number(lignes[i][4]) || 4,
      actif: String(lignes[i][5] || 'oui') !== 'non',
      remarque: texteCellule(lignes[i][6], false),
      /* Ce qui manque d'un mois précédent : « manque toujours
         9,75 de juin » se garde d'un mois sur l'autre. */
      report: Number(lignes[i][7]) || 0,
      reportMois: texteCellule(lignes[i][8], false),
      /* La place dans le tableau. Sans ordre posé, on retombe sur
         l'alphabet — mais un salarié en arrêt long n'a rien à faire
         au milieu de ceux dont on saisit les heures. */
      ordre: Number(lignes[i][9]) || 0
    });
  }
  out.sort(function (a, b) {
    var oa = a.ordre || 999;
    var ob = b.ordre || 999;
    if (oa !== ob) return oa - ob;
    return String(a.nom).localeCompare(String(b.nom), 'fr');
  });
  return out;
}

function enregistrerSalarie(d) {
  var sh = feuillePaieSalaries();
  var id = String(d.id || '').trim() || ('s' + new Date().getTime());
  var lignes = sh.getDataRange().getValues();

  var valeurs = [
    id,
    String(d.nom || ''),
    Number(d.baseHebdo) || BASE_HEBDO,
    Number(d.heuresJour) || HEURES_JOUR,
    Number(d.joursSemaine) || 4,
    (String(d.actif) === 'non') ? 'non' : 'oui',
    String(d.remarque || ''),
    Number(d.report) || 0,
    String(d.reportMois || ''),
    Number(d.ordre) || 0,
    String(d.joursTravailles || '')
  ];

  /* CE QUE LA DEMANDE NE PORTE PAS GARDE SA VALEUR.

     La fiche du salarié envoie tous ses champs ; les flèches du
     tableau n'envoient que l'ordre. Sans cette règle, monter
     quelqu'un d'un rang lui remettait la base à 35 h, effaçait sa
     remarque et le rendait actif — un déplacement d'affichage
     aurait réécrit sa paie.

     Chaque colonne dit d'où elle vient : le nom du champ dans la
     demande, et sa place dans la ligne. */
  var CHAMPS = [null, 'nom', 'baseHebdo', 'heuresJour', 'joursSemaine',
                'actif', 'remarque', 'report', 'reportMois', 'ordre',
                'joursTravailles'];

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== id) continue;
    for (var j = 1; j < valeurs.length; j++) {
      var champ = CHAMPS[j];
      var v = d[champ];
      if (v === undefined || v === null || v === '') valeurs[j] = lignes[i][j];
    }
    sh.getRange(i + 1, 1, 1, valeurs.length).setValues([valeurs]);
    return { status: 'ok', id: id };
  }
  ajouterLigne(sh, valeurs);
  return { status: 'ok', id: id };
}

/* L'ordre de TOUS les salariés, en une seule écriture.

   On enregistrait un salarié à la fois : descendre une ligne d'un
   cran demandait autant d'allers-retours qu'il y a de salariés, et
   faisait attendre huit secondes. Une passe suffit — la feuille
   est déjà en mémoire, on n'écrit que les cellules qui changent. */
function enregistrerOrdreSalaries(d) {
  var recus;
  try {
    recus = (typeof d.ordres === 'string') ? JSON.parse(d.ordres) : d.ordres;
  } catch (e) { recus = null; }
  if (!recus || !recus.length) return { status: 'ok', maj: 0 };

  var sh = feuillePaieSalaries();
  var lignes = sh.getDataRange().getValues();
  var rang = {};
  for (var k = 0; k < recus.length; k++) {
    rang[String(recus[k].id)] = Number(recus[k].ordre) || 0;
  }

  var maj = 0;
  for (var i = 1; i < lignes.length; i++) {
    var id = String(lignes[i][0]);
    if (!(id in rang)) continue;
    if ((Number(lignes[i][9]) || 0) === rang[id]) continue;
    sh.getRange(i + 1, 10).setValue(rang[id]);
    maj++;
  }
  return { status: 'ok', maj: maj };
}

function supprimerSalarie(d) {
  var sh = feuillePaieSalaries();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) { sh.deleteRow(i + 1); break; }
  }
  return { status: 'ok' };
}

function listerSemainesPaie(d) {
  var sh = feuillePaieSemaines();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(2, 1, derniere - 1, 13).getValues();
  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    var semaine = dateVersIso(lignes[i][2]) || '';
    if (d && d.semaine && semaine !== d.semaine) continue;
    out.push({
      id: String(lignes[i][0]),
      idSalarie: String(lignes[i][1]),
      semaine: semaine,
      /* Le total que donne le logiciel de planning : le reste se
         calcule à partir de là. */
      heures: Number(lignes[i][3]) || 0,
      joursAbsents: Number(lignes[i][4]) || 0,
      /* Une correction manuelle, quand le calcul ne convient pas.
         Vide = on garde le calcul. */
      normalForce: (lignes[i][5] === '' || lignes[i][5] === null)
                     ? null : Number(lignes[i][5]),
      majoreForce: (lignes[i][6] === '' || lignes[i][6] === null)
                     ? null : Number(lignes[i][6]),
      remarque: texteCellule(lignes[i][7], false)
    });
  }
  return out;
}

function enregistrerSemainePaie(d) {
  var sh = feuillePaieSemaines();
  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');

  /* Une semaine et un salarié : une seule ligne. Sans ça, deux
     saisies successives feraient deux lignes contradictoires. */
  var id = String(d.id || '').trim();
  if (!id) {
    for (var k = 1; k < lignes.length; k++) {
      if (String(lignes[k][1]) === String(d.idSalarie) &&
          dateVersIso(lignes[k][2]) === String(d.semaine)) {
        id = String(lignes[k][0]);
        break;
      }
    }
  }
  if (!id) id = 'w' + new Date().getTime() + Math.floor(Math.random() * 100);

  var valeurs = [
    id,
    String(d.idSalarie || ''),
    String(d.semaine || ''),
    Number(d.heures) || 0,
    Number(d.joursAbsents) || 0,
    (d.normalForce === '' || d.normalForce === null ||
     d.normalForce === undefined) ? '' : Number(d.normalForce),
    (d.majoreForce === '' || d.majoreForce === null ||
     d.majoreForce === undefined) ? '' : Number(d.majoreForce),
    String(d.remarque || ''),
    String(d.par || ''),
    maintenant,
    (d.joursForces === '' || d.joursForces === null ||
     d.joursForces === undefined) ? '' : Number(d.joursForces)
  ];

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== id) continue;
    valeurs[9] = lignes[i][9] || maintenant;
    sh.getRange(i + 1, 1, 1, valeurs.length).setValues([valeurs]);
    return { status: 'ok', id: id };
  }
  ajouterLigne(sh, valeurs);
  return { status: 'ok', id: id };
}

function supprimerSemainePaie(d) {
  var sh = feuillePaieSemaines();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) { sh.deleteRow(i + 1); break; }
  }
  return { status: 'ok' };
}

function listerAbsencesPaie() {
  var sh = feuillePaieAbsences();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(2, 1, derniere - 1, 10).getValues();
  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      id: String(lignes[i][0]),
      idSalarie: String(lignes[i][1]),
      type: String(lignes[i][2] || 'cp'),
      du: dateVersIso(lignes[i][3]) || '',
      au: dateVersIso(lignes[i][4]) || '',
      remarque: texteCellule(lignes[i][5], false),
      transmis: String(lignes[i][6] || '') === 'oui'
    });
  }
  out.sort(function (a, b) { return String(b.du).localeCompare(String(a.du)); });
  return out;
}

function enregistrerAbsencePaie(d) {
  var sh = feuillePaieAbsences();
  var id = String(d.id || '').trim() || ('a' + new Date().getTime());
  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');

  var valeurs = [
    id,
    String(d.idSalarie || ''),
    String(d.type || 'cp'),
    String(d.du || ''),
    String(d.au || ''),
    String(d.remarque || ''),
    (String(d.transmis) === 'oui') ? 'oui' : '',
    String(d.par || ''),
    maintenant
  ];

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== id) continue;
    valeurs[8] = lignes[i][8] || maintenant;
    sh.getRange(i + 1, 1, 1, valeurs.length).setValues([valeurs]);
    return { status: 'ok', id: id };
  }
  ajouterLigne(sh, valeurs);
  return { status: 'ok', id: id };
}

function supprimerAbsencePaie(d) {
  var sh = feuillePaieAbsences();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) { sh.deleteRow(i + 1); break; }
  }
  return { status: 'ok' };
}

/* ============================================================
   LE RATTACHEMENT DES SEMAINES

   Une semaine à cheval sur deux mois doit être comptée une fois
   et une seule. Le bureau décide de quel côté elle tombe ; à
   défaut, elle suit son jeudi, comme la norme des semaines.
   ============================================================ */
/* ============================================================
   L'ESPACE ÉLÈVE

   Une page publique où l'élève récite une procédure. Il s'y
   identifie par son nom et un code à six chiffres que le bureau
   lui donne.

   Deux précautions tiennent tout : on ne renvoie jamais la liste
   des élèves, et un élève ne voit que ses propres envois.
   ============================================================ */
/* ============================================================
   LE CODE EN SALLE

   Les séances d'ETG sont saisies par les élèves dans des Google
   Forms, qui écrivent dans un classeur à part. On le lit à
   distance : rien à recopier, rien à changer à ce qui marche.

   Le barème varie d'une séance à l'autre — sur 10, 20 ou 25.
   Ce qui compte est le nombre de FAUTES : 0 à 3 vert, 4 à 6
   orange, au-delà rouge.
   ============================================================ */

var CLASSEUR_ETG = '1TDO_rYTAA2-k0OIV3O07nTuy7jFX7loPIlaO12w5P8I';

/* Le total de points de chaque séance */
var BAREME_SEANCES = {
  1: 10, 2: 10, 3: 10, 4: 20, 5: 10, 6: 25,
  7: 10, 8: 25, 9: 20, 10: 20, 11: 20, 12: 20
};

function baremeSeance(n) {
  return BAREME_SEANCES[Number(n)] || 10;
}

/* La couleur d'un résultat, d'après le nombre de fautes */
function couleurFautes(fautes) {
  if (fautes === null || fautes === undefined) return '';
  if (fautes <= 3) return 'vert';
  if (fautes <= 6) return 'orange';
  return 'rouge';
}

/* Retrouve une colonne par son en-tête, quelle que soit sa place.
   Les formulaires évoluent ; compter les colonnes ne tiendrait
   pas. */
function colonneParEntete(entetes, motifs) {
  for (var i = 0; i < entetes.length; i++) {
    var e = normaliser(entetes[i]);
    for (var j = 0; j < motifs.length; j++) {
      if (e.indexOf(motifs[j]) !== -1) return i;
    }
  }
  return -1;
}

/* Les corrections du bureau sur les séances.

   Un élève dont la réponse ne s'est pas enregistrée, ou un score
   à rectifier. Ces lignes priment sur ce que disent les
   formulaires. */
function feuilleEtgCorrections() {
  var f = classeur();
  var sh = f.getSheetByName('EtgCorrections');
  if (!sh) {
    sh = f.insertSheet('EtgCorrections', f.getNumSheets());
    ajouterLigne(sh, ['Élève', 'Séance', 'Score', 'Total', 'Date', 'Par', 'Modifié le']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function lireCorrectionsEtg() {
  var sh = feuilleEtgCorrections();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(2, 1, derniere - 1, 7).getValues();
  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      eleve: texteCellule(lignes[i][0], false),
      seance: Number(lignes[i][1]) || 0,
      score: (lignes[i][2] === '' || lignes[i][2] === null)
        ? null : Number(lignes[i][2]),
      total: Number(lignes[i][3]) || 0,
      date: texteCellule(lignes[i][4], false),
      par: texteCellule(lignes[i][5], false)
    });
  }
  return out;
}

function ecrireCorrectionEtg(d) {
  var sh = feuilleEtgCorrections();
  var nom = String(d.eleve || '').trim();
  var seance = Number(d.seance) || 0;
  if (!nom || !seance) {
    return { status: 'error', message: 'Élève ou séance manquant.' };
  }

  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');
  var lignes = sh.getDataRange().getValues();

  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][0]) !== normaliser(nom)) continue;
    if (Number(lignes[i][1]) !== seance) continue;

    /* Score vide : on efface la correction et le formulaire
       reprend la main. */
    if (String(d.score || '') === '') {
      sh.deleteRow(i + 1);
      return { status: 'ok', efface: true };
    }

    sh.getRange(i + 1, 3, 1, 5).setValues([[
      Number(d.score), Number(d.total) || baremeSeance(seance),
      String(d.date || ''), String(d.par || ''), maintenant
    ]]);
    return { status: 'ok' };
  }

  if (String(d.score || '') === '') return { status: 'ok' };

  ajouterLigne(sh, [nom, seance, Number(d.score),
                Number(d.total) || baremeSeance(seance),
                String(d.date || ''), String(d.par || ''), maintenant]);
  return { status: 'ok' };
}

function lireSeancesEtg() {
  var out = [];
  var f;
  try {
    f = SpreadsheetApp.openById(CLASSEUR_ETG);
  } catch (e) {
    return { status: 'error',
             message: 'Classeur des séances illisible : ' + String(e).slice(0, 120) };
  }

  for (var n = 1; n <= 12; n++) {
    var sh = f.getSheetByName('Réponses au formulaire ' + n);
    if (!sh) continue;

    var derniere = sh.getLastRow();
    if (derniere < 2) continue;

    var largeur = sh.getLastColumn();
    var lignes = sh.getRange(1, 1, derniere, largeur).getValues();
    var entetes = lignes[0];

    /* Le nom complet d'abord ; à défaut, on recolle prénom et nom
       pour distinguer deux élèves qui partagent un patronyme. */
    var cNom = colonneParEntete(entetes, ['prenom nom', 'nom prenom',
                                          'nom et prenom', 'nom complet']);
    var cPrenom = -1;
    if (cNom === -1) {
      cNom = colonneParEntete(entetes, ['nom', 'eleve']);
      cPrenom = colonneParEntete(entetes, ['prenom']);
      /* La même colonne pour les deux : elle porte déjà tout */
      if (cPrenom === cNom) cPrenom = -1;
    }
    var cScore = colonneParEntete(entetes, ['score', 'note', 'resultat']);
    var cDate = colonneParEntete(entetes, ['horodat', 'date', 'timestamp']);

    /* Sans nom ni score, la feuille ne nous apprend rien */
    if (cNom === -1 || cScore === -1) continue;

    for (var i = 1; i < lignes.length; i++) {
      var nom = texteCellule(lignes[i][cNom], false).trim();
      if (cPrenom !== -1) {
        var pre = texteCellule(lignes[i][cPrenom], false).trim();
        if (pre) nom = (pre + ' ' + nom).trim();
      }
      if (!nom) continue;

      /* Rien avant 2026 : les années passées alourdissent la
         lecture sans rien apprendre. */
      var quand = (cDate !== -1) ? dateVersIso(lignes[i][cDate]) || '' : '';
      if (quand && quand < '2026-01-01') continue;

      /* Google écrit « 8 / 10 » ou juste « 8 » selon les cas */
      var brut = String(lignes[i][cScore] || '').trim();
      var m = brut.match(/^(\d+(?:[.,]\d+)?)/);
      if (!m) continue;

      var score = Number(String(m[1]).replace(',', '.'));
      var total = baremeSeance(n);

      /* Le total peut être écrit dans la cellule : il fait foi */
      var mt = brut.match(/\/\s*(\d+)/);
      if (mt) total = Number(mt[1]);

      var fautes = Math.max(0, total - score);

      out.push({
        seance: n,
        eleve: nom,
        score: score,
        total: total,
        fautes: fautes,
        couleur: couleurFautes(fautes),
        date: quand
      });
    }
  }

  /* Ce que le bureau a corrigé remplace ce que dit le formulaire */
  try {
    var corr = lireCorrectionsEtg();
    for (var k = 0; k < corr.length; k++) {
      var x = corr[k];
      var trouve = false;

      for (var w = 0; w < out.length; w++) {
        if (out[w].seance !== x.seance) continue;
        if (normaliser(out[w].eleve) !== normaliser(x.eleve)) continue;
        out[w].score = x.score;
        out[w].total = x.total || out[w].total;
        out[w].fautes = Math.max(0, out[w].total - x.score);
        out[w].couleur = couleurFautes(out[w].fautes);
        out[w].corrige = true;
        if (x.date) out[w].date = x.date;
        trouve = true;
        break;
      }

      /* Une séance que le formulaire n'a jamais reçue */
      if (!trouve) {
        var tot = x.total || baremeSeance(x.seance);
        var ft = Math.max(0, tot - x.score);
        out.push({
          seance: x.seance, eleve: x.eleve, score: x.score, total: tot,
          fautes: ft, couleur: couleurFautes(ft), date: x.date || '',
          corrige: true
        });
      }
    }
  } catch (e) { /* les formulaires suffisent */ }

  return { status: 'ok', resultats: out, baremes: BAREME_SEANCES };
}

/* Annule un rattrapage : vide les formations que le rattrapage a
   posées, sans toucher à celles saisies par le bureau.

   On ne peut pas les distinguer après coup ; on efface donc
   uniquement les libellés que le rattrapage sait écrire. */
function annulerRattrapageFormations() {
  var POSEES = ['BEA', 'BV', 'CS BEA', 'CS BV', 'AAC BEA', 'AAC BV',
                'Conduite supervisée', 'Passerelle BEA→BV'];

  var sh = feuilleEleves();
  var derniere = sh.getLastRow();
  if (derniere < 2) return { status: 'ok', videes: 0 };

  var fiches = sh.getRange(2, 1, derniere - 1, 4).getValues();
  var videes = 0;

  for (var i = 0; i < fiches.length; i++) {
    if (!fiches[i][0]) continue;
    var v = String(fiches[i][3] || '').trim();
    if (!v) continue;
    if (POSEES.indexOf(v) === -1) continue;   /* saisi à la main */

    sh.getRange(i + 2, 4).setValue('');
    videes++;
  }

  return { status: 'ok', videes: videes };
}

/* ============================================================
   LA FORMATION DÉDUITE DU BILAN

   Un bilan porte son type : conduite automatique, AAC manuelle…
   Quand la fiche de l'élève ne dit rien, on la remplit à partir
   de là plutôt que de laisser le champ vide.
   ============================================================ */

/* Le libellé d'un bilan vers une formation du répertoire */
function formationDuTypeBilan(type) {
  var t = normaliser(type);
  if (!t) return '';

  /* L'AAC d'abord : « AAC boîte automatique » contient aussi
     « automatique », et serait pris pour une conduite simple. */
  var aac = (t.indexOf('aac') !== -1 || t.indexOf('accompagnee') !== -1);
  var supervisee = (t.indexOf('supervis') !== -1);
  var auto = (t.indexOf('automatique') !== -1 || t.indexOf('bea') !== -1);
  var manuelle = (t.indexOf('manuelle') !== -1 ||
                  /(^|[^a-z])bv([^a-z]|$)/.test(t));

  if (aac) return auto ? 'AAC BEA' : (manuelle ? 'AAC BV' : '');
  if (supervisee) return 'Conduite supervisée';
  if (t.indexOf('passerelle') !== -1) return 'Passerelle BEA→BV';

  /* Les bilans qui ne disent rien de la formation */
  if (t.indexOf('accompagnateur') !== -1) return '';
  if (t.indexOf('post') !== -1) return '';

  /* La formation courante : ni AAC ni conduite supervisée. La
     supervision se coche dans le questionnaire, elle ne se
     devine pas d'un type de bilan. */
  if (auto) return 'BEA';
  if (manuelle) return 'BV';
  return '';
}

/* Complète la fiche d'un élève si sa formation manque */
function completerFormation(nomEleve, typeBilan) {
  var form = formationDuTypeBilan(typeBilan);
  if (!form) return null;

  var sh = feuilleEleves();
  var derniere = sh.getLastRow();
  var recherche = normaliser(nomEleve);

  if (derniere >= 2) {
    var lignes = sh.getRange(2, 1, derniere - 1, 4).getValues();
    for (var i = 0; i < lignes.length; i++) {
      if (normaliser(lignes[i][0]) !== recherche) continue;

      /* Une formation déjà saisie fait foi : le bureau sait mieux
         que le type d'un bilan. */
      if (String(lignes[i][3] || '').trim()) return null;

      sh.getRange(i + 2, 4).setValue(form);
      return form;
    }
  }

  /* Aucune fiche : on n'en crée pas ici, ce n'est pas le moment */
  return null;
}

/* Rattrape les fiches sans formation à partir des bilans déjà
   enregistrés. Le plus récent fait foi. */
function rattraperFormations() {
  var sh = feuille();
  var derniere = sh.getLastRow();
  if (derniere < 2) return { status: 'ok', remplies: 0, vues: 0 };

  /* Colonne 4 : l'élève. Colonne 6 : le type de bilan. */
  var lignes = sh.getRange(2, 4, derniere - 1, 3).getValues();
  var parEleve = {};

  for (var i = 0; i < lignes.length; i++) {
    var nom = texteCellule(lignes[i][0], false).trim();
    if (!nom) continue;
    var form = formationDuTypeBilan(texteCellule(lignes[i][2], false));
    if (!form) continue;
    /* Les lignes sont dans l'ordre : la dernière écrase */
    parEleve[normaliser(nom)] = { nom: nom, formation: form };
  }

  var shE = feuilleEleves();
  var dE = shE.getLastRow();
  if (dE < 2) return { status: 'ok', remplies: 0, vues: 0 };

  var fiches = shE.getRange(2, 1, dE - 1, 4).getValues();
  var remplies = 0;
  var detail = [];

  for (var j = 0; j < fiches.length; j++) {
    if (!fiches[j][0]) continue;
    if (String(fiches[j][3] || '').trim()) continue;   /* déjà remplie */

    var trouve = parEleve[normaliser(fiches[j][0])];
    if (!trouve) continue;

    shE.getRange(j + 2, 4).setValue(trouve.formation);
    remplies++;
    if (detail.length < 40) {
      detail.push({ eleve: texteCellule(fiches[j][0], false),
                    formation: trouve.formation });
    }
  }

  return { status: 'ok', remplies: remplies,
           vues: Object.keys(parEleve).length, detail: detail };
}

/* ============================================================
   LE SUIVI HANDICAP

   Lu dans le classeur « Suivi élèves + Calculateur », onglet
   HANDICAP. Rien n'est recopié : le bureau continue de saisir
   là-bas, l'application affiche et met à jour.

   Colonnes : B nom · C déjà le permis · D pas encore ·
   E certificat médical · F pathologie · G équipement ·
   H évaluation placée · I date évaluation · J document rempli ·
   K dossier DDTM envoyé · L date RDV DDTM · M codification faite ·
   N demande de titre · O commentaires
   ============================================================ */

/* Le classeur « Suivi élèves + Calculateur » — celui du bureau.
   À ne pas confondre avec celui des séances de code. */
var CLASSEUR_SUIVI = '1LaIyXPxEjWrTw8t5v0sbM-yst2VSl8tlxnwbewFC2_0';

var ONGLET_HANDICAP = 'HANDICAP';
var LIGNE1_HANDICAP = 4;      /* les trois premières sont des en-têtes */

/* Les équipements proposés, tels que la liste du classeur */
var EQUIPEMENTS_HANDICAP = [
  'BEA', 'BV',
  'Accélérateur à gauche',
  'Boule au volant simple',
  'Boule au volant avec commandes déportées',
  'A droite', 'A gauche',
  'Rétroviseur additionnels',
  '2 Rétros classique extérieur',
  'Attente visite médicale',
  'Au moniteur de dire si besoin particulier'
];

function feuilleHandicap() {
  var f = SpreadsheetApp.openById(CLASSEUR_SUIVI);
  var sh = f.getSheetByName(ONGLET_HANDICAP);
  if (!sh) {
    /* Le nom exact aide à comprendre : les onglets se renomment */
    var noms = f.getSheets().map(function (x) { return x.getName(); });
    throw new Error('Onglet « ' + ONGLET_HANDICAP + ' » introuvable. ' +
                    'Onglets présents : ' + noms.slice(0, 8).join(', '));
  }
  return sh;
}

/* Une case à cocher rend true/false ; le texte peut arriver en
   « TRUE » selon la lecture. */
function coche(v) {
  var t = String(v === null || v === undefined ? '' : v).trim().toLowerCase();
  return (v === true || t === 'true' || t === 'vrai' || t === 'oui' || t === 'x');
}

function lireHandicap() {
  var sh;
  try {
    sh = feuilleHandicap();
  } catch (e) {
    return { status: 'error', message: String(e).slice(0, 140) };
  }

  var derniere = sh.getLastRow();
  if (derniere < LIGNE1_HANDICAP) {
    return { status: 'ok', eleves: [], equipements: EQUIPEMENTS_HANDICAP };
  }

  var n = derniere - LIGNE1_HANDICAP + 1;
  var lignes = sh.getRange(LIGNE1_HANDICAP, 2, n, 14).getValues();

  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    var l = lignes[i];
    var nom = texteCellule(l[0], false).trim();
    if (!nom) continue;

    out.push({
      ligne: LIGNE1_HANDICAP + i,
      eleve: nom,
      dejaPermis: coche(l[1]),
      pasEncore: coche(l[2]),
      certificat: coche(l[3]),
      pathologie: texteCellule(l[4], false),
      equipement: texteCellule(l[5], false),
      evalPlacee: coche(l[6]),
      dateEval: texteCellule(l[7], false),
      docRempli: coche(l[8]),
      dossierDdtm: coche(l[9]),
      dateDdtm: texteCellule(l[10], false),
      codification: coche(l[11]),
      demandeTitre: coche(l[12]),
      commentaire: texteCellule(l[13], false)
    });
  }

  return { status: 'ok', eleves: out, equipements: EQUIPEMENTS_HANDICAP };
}

/* Une seule cellule à la fois : le bureau coche une étape, on
   n'écrit que celle-là pour ne rien écraser d'autre. */
var COLONNES_HANDICAP = {
  eleve: 2, dejaPermis: 3, pasEncore: 4, certificat: 5,
  pathologie: 6, equipement: 7, evalPlacee: 8, dateEval: 9,
  docRempli: 10, dossierDdtm: 11, dateDdtm: 12,
  codification: 13, demandeTitre: 14, commentaire: 15
};

function ecrireHandicap(d) {
  var sh;
  try {
    sh = feuilleHandicap();
  } catch (e) {
    return { status: 'error', message: String(e).slice(0, 140) };
  }

  var champ = String(d.champ || '');
  var col = COLONNES_HANDICAP[champ];
  if (!col) return { status: 'error', message: 'Champ inconnu : ' + champ };

  var ligne = Number(d.ligne) || 0;

  /* Sans numéro de ligne, on retrouve l'élève par son nom */
  if (!ligne) {
    var derniere = sh.getLastRow();
    var noms = sh.getRange(LIGNE1_HANDICAP, 2,
      Math.max(1, derniere - LIGNE1_HANDICAP + 1), 1).getValues();
    for (var i = 0; i < noms.length; i++) {
      if (normaliser(noms[i][0]) === normaliser(d.eleve)) {
        ligne = LIGNE1_HANDICAP + i;
        break;
      }
    }
  }

  /* Toujours pas : c'est un nouvel élève, on l'ajoute en bas */
  if (!ligne) {
    ligne = Math.max(sh.getLastRow() + 1, LIGNE1_HANDICAP);
    sh.getRange(ligne, COLONNES_HANDICAP.eleve).setValue(String(d.eleve || ''));
  }

  var v = d.valeur;
  /* Les cases veulent un booléen, pas la chaîne « true » */
  if (v === 'true' || v === true) v = true;
  else if (v === 'false' || v === false) v = false;

  sh.getRange(ligne, col).setValue(v === undefined ? '' : v);

  /* Les deux premières cases s'excluent : déjà le permis ou pas */
  if (champ === 'dejaPermis' && v === true) {
    sh.getRange(ligne, COLONNES_HANDICAP.pasEncore).setValue(false);
  }
  if (champ === 'pasEncore' && v === true) {
    sh.getRange(ligne, COLONNES_HANDICAP.dejaPermis).setValue(false);
  }

  return { status: 'ok', ligne: ligne };
}

function supprimerHandicap(d) {
  var sh;
  try {
    sh = feuilleHandicap();
  } catch (e) {
    return { status: 'error', message: String(e).slice(0, 140) };
  }

  var ligne = Number(d.ligne) || 0;
  if (ligne < LIGNE1_HANDICAP) {
    return { status: 'error', message: 'Ligne invalide.' };
  }
  sh.deleteRow(ligne);
  return { status: 'ok' };
}

/* ============================================================
   LE SUIVI DES PAIEMENTS ALMA

   Un dossier passe par trois mains : on propose, l'élève fait sa
   demande, ALMA nous verse. Entre les deux, il faut savoir où
   l'on en est.

   Une ligne disparaît quand le virement est encaissé : ce qui
   reste est ce qui attend encore quelque chose.
   ============================================================ */
function feuillePaiementsAlma() {
  var f = classeur();
  var sh = f.getSheetByName('PaiementsAlma');
  if (!sh) {
    sh = f.insertSheet('PaiementsAlma', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Élève', 'Montant', 'Proposé le', 'Par',
                  'Demande faite', 'Nombre de fois', 'Frais',
                  'Payé par ALMA', 'Remarque']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function listerPaiementsAlma() {
  var sh = feuillePaiementsAlma();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(2, 1, derniere - 1, 10).getValues();
  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      id: String(lignes[i][0]),
      eleve: texteCellule(lignes[i][1], false),
      montant: Number(lignes[i][2]) || 0,
      proposeLe: texteCellule(lignes[i][3], false),
      par: texteCellule(lignes[i][4], false),
      demandeFaite: (lignes[i][5] === true ||
                     String(lignes[i][5]).toLowerCase() === 'oui'),
      fois: Number(lignes[i][6]) || 0,
      frais: Number(lignes[i][7]) || 0,
      payeAlma: (lignes[i][8] === true ||
                 String(lignes[i][8]).toLowerCase() === 'oui'),
      remarque: texteCellule(lignes[i][9], false)
    });
  }
  /* Les plus anciens d'abord : ce sont eux qui traînent */
  return out;
}

function enregistrerPaiementAlma(d) {
  var sh = feuillePaiementsAlma();
  var id = String(d.id || '').trim() || ('pa' + new Date().getTime());
  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy');

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== id) continue;

    /* Une case cochée, une remarque écrite : on ne touche qu'à ce
       qui est fourni. */
    if (d.demandeFaite !== undefined) {
      sh.getRange(i + 1, 6).setValue(d.demandeFaite === true ||
                                     d.demandeFaite === 'true');
    }
    if (d.fois !== undefined) sh.getRange(i + 1, 7).setValue(Number(d.fois) || 0);
    if (d.frais !== undefined) sh.getRange(i + 1, 8).setValue(Number(d.frais) || 0);
    if (d.remarque !== undefined) sh.getRange(i + 1, 10).setValue(String(d.remarque));

    /* Payé par ALMA : le dossier est clos, la ligne s'en va */
    if (d.payeAlma === true || d.payeAlma === 'true') {
      sh.deleteRow(i + 1);
      return { status: 'ok', id: id, clos: true };
    }

    return { status: 'ok', id: id };
  }

  ajouterLigne(sh, [id, String(d.eleve || ''), Number(d.montant) || 0,
                maintenant, String(d.par || ''),
                false, Number(d.fois) || 0, Number(d.frais) || 0,
                false, String(d.remarque || '')]);
  return { status: 'ok', id: id, cree: true };
}

function supprimerPaiementAlma(d) {
  var sh = feuillePaiementsAlma();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) { sh.deleteRow(i + 1); break; }
  }
  return { status: 'ok' };
}

/* ============================================================
   LES FINANCEMENTS EXTÉRIEURS

   Deux onglets du classeur de suivi, lus et écrits à distance :
   les dossiers Pôle emploi et Région, et les sessions de code
   aménagé.
   ============================================================ */

var ONGLET_PE = 'SUIVI Pole emploi + Région';
var LIGNE1_PE = 4;

var ONGLET_CODEAM = 'Code aménagé';
var LIGNE1_CODEAM = 4;


function feuilleDuSuivi(nom) {
  var f = SpreadsheetApp.openById(CLASSEUR_SUIVI);
  var sh = f.getSheetByName(nom);
  if (!sh) {
    var noms = f.getSheets().map(function (x) { return x.getName(); });
    throw new Error('Onglet « ' + nom + ' » introuvable. Présents : ' +
                    noms.slice(0, 8).join(', '));
  }
  return sh;
}


/* Pôle emploi et Région.

   Colonnes : A fini · B prénom · C nom · D total · E inscription ·
   F code · G 30h · H financeur · J inscription · K permis ·
   L remarque */
/* Les colonnes ajoutées à droite des vôtres : le suivi de chaque
   versement, et le remboursement à la Région.

   M à V — elles se créent toutes seules au premier passage. */
var ENTETES_PE_SUITE = [
  'Courrier inscription', 'Inscription payée',
  'Courrier code', 'Code payé',
  'Courrier 30h', '30h payé',
  'Courrier permis', 'Permis payé',
  'Remboursé Région', 'Montant remboursé'
];

function preparerColonnesPE(sh) {
  /* La première colonne ajoutée : juste après « Remarque » (L) */
  var depart = 13;
  for (var i = 0; i < ENTETES_PE_SUITE.length; i++) {
    var col = depart + i;
    var actuel = String(sh.getRange(3, col).getValue() || '').trim();
    if (!actuel) sh.getRange(3, col).setValue(ENTETES_PE_SUITE[i]);
  }
}


function lirePoleEmploi() {
  var sh;
  try { sh = feuilleDuSuivi(ONGLET_PE); }
  catch (e) { return { status: 'error', message: String(e).slice(0, 160) }; }

  try { preparerColonnesPE(sh); } catch (e) { /* lecture seule possible */ }

  var derniere = sh.getLastRow();
  if (derniere < LIGNE1_PE) return { status: 'ok', dossiers: [] };

  var n = derniere - LIGNE1_PE + 1;
  var lignes = sh.getRange(LIGNE1_PE, 1, n, 22).getValues();

  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    var l = lignes[i];
    var prenom = texteCellule(l[1], false).trim();
    var nom = texteCellule(l[2], false).trim();
    if (!prenom && !nom) continue;

    out.push({
      ligne: LIGNE1_PE + i,
      fini: coche(l[0]),
      prenom: prenom,
      nom: nom,
      eleve: (prenom + ' ' + nom).trim(),
      total: texteCellule(l[3], false),
      /* Pôle emploi : trois échéances */
      inscription: texteCellule(l[4], false),
      code: texteCellule(l[5], false),
      trente: texteCellule(l[6], false),
      financeur: texteCellule(l[7], false),
      /* Région : deux dates */
      regInscription: texteCellule(l[9], false),
      regPermis: texteCellule(l[10], false),
      remarque: texteCellule(l[11], false),

      /* Le suivi de chaque versement : la date du courrier, puis
         ce qu'il est devenu. */
      courrierInscription: texteCellule(l[12], false),
      etatInscription: texteCellule(l[13], false),
      courrierCode: texteCellule(l[14], false),
      etatCode: texteCellule(l[15], false),
      courrier30: texteCellule(l[16], false),
      etat30: texteCellule(l[17], false),
      courrierPermis: texteCellule(l[18], false),
      etatPermis: texteCellule(l[19], false),

      /* La Région se rembourse parfois */
      rembourse: texteCellule(l[20], false),
      montantRembourse: texteCellule(l[21], false)
    });
  }

  return { status: 'ok', dossiers: out };
}


var COLONNES_PE = {
  fini: 1, prenom: 2, nom: 3, total: 4, inscription: 5, code: 6,
  trente: 7, financeur: 8, regInscription: 10, regPermis: 11,
  remarque: 12,
  courrierInscription: 13, etatInscription: 14,
  courrierCode: 15, etatCode: 16,
  courrier30: 17, etat30: 18,
  courrierPermis: 19, etatPermis: 20,
  rembourse: 21, montantRembourse: 22
};

function ecrirePoleEmploi(d) {
  var sh;
  try { sh = feuilleDuSuivi(ONGLET_PE); }
  catch (e) { return { status: 'error', message: String(e).slice(0, 160) }; }

  try { preparerColonnesPE(sh); } catch (e) {}

  var ligne = Number(d.ligne) || 0;

  /* Un nouveau dossier s'ajoute en bas */
  if (!ligne) {
    ligne = Math.max(sh.getLastRow() + 1, LIGNE1_PE);
    sh.getRange(ligne, COLONNES_PE.prenom).setValue(String(d.prenom || ''));
    sh.getRange(ligne, COLONNES_PE.nom).setValue(String(d.nom || ''));
    sh.getRange(ligne, COLONNES_PE.fini).setValue(false);
  }

  /* On n'écrit que ce qui est fourni : le reste appartient au
     classeur, et le bureau y saisit aussi. */
  Object.keys(COLONNES_PE).forEach(function (champ) {
    if (d[champ] === undefined) return;
    var v = d[champ];
    if (champ === 'fini') v = (v === true || v === 'true');
    sh.getRange(ligne, COLONNES_PE[champ]).setValue(v);
  });

  return { status: 'ok', ligne: ligne };
}

function supprimerPoleEmploi(d) {
  var sh;
  try { sh = feuilleDuSuivi(ONGLET_PE); }
  catch (e) { return { status: 'error', message: String(e).slice(0, 160) }; }

  var ligne = Number(d.ligne) || 0;
  if (ligne < LIGNE1_PE) return { status: 'error', message: 'Ligne invalide.' };
  sh.deleteRow(ligne);
  return { status: 'ok' };
}


/* Le code aménagé.

   Colonnes : B nom · C demande envoyée · D souhaite · E inscrit
   DDTM · F redevance · G validé · H résultat · I remarque.
   La session est annoncée en C2. */
function lireCodeAmenage() {
  var sh;
  try { sh = feuilleDuSuivi(ONGLET_CODEAM); }
  catch (e) { return { status: 'error', message: String(e).slice(0, 160) }; }

  var session = texteCellule(sh.getRange(2, 3).getValue(), false);
  var derniere = sh.getLastRow();
  if (derniere < LIGNE1_CODEAM) {
    return { status: 'ok', session: session, eleves: [] };
  }

  var n = derniere - LIGNE1_CODEAM + 1;
  var lignes = sh.getRange(LIGNE1_CODEAM, 2, n, 8).getValues();

  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    var l = lignes[i];
    var nom = texteCellule(l[0], false).trim();
    if (!nom) continue;

    out.push({
      ligne: LIGNE1_CODEAM + i,
      eleve: nom,
      demande: coche(l[1]),
      souhaite: texteCellule(l[2], false),
      inscritDdtm: coche(l[3]),
      redevance: coche(l[4]),
      valide: coche(l[5]),
      resultat: texteCellule(l[6], false),
      remarque: texteCellule(l[7], false)
    });
  }

  return { status: 'ok', session: session, eleves: out };
}


var COLONNES_CODEAM = {
  eleve: 2, demande: 3, souhaite: 4, inscritDdtm: 5, redevance: 6,
  valide: 7, resultat: 8, remarque: 9
};

function ecrireCodeAmenage(d) {
  var sh;
  try { sh = feuilleDuSuivi(ONGLET_CODEAM); }
  catch (e) { return { status: 'error', message: String(e).slice(0, 160) }; }

  /* La session se change en tête de tableau */
  if (d.session !== undefined) {
    sh.getRange(2, 3).setValue(String(d.session || ''));
    if (!d.eleve && !d.ligne) return { status: 'ok', session: true };
  }

  var ligne = Number(d.ligne) || 0;
  if (!ligne) {
    ligne = Math.max(sh.getLastRow() + 1, LIGNE1_CODEAM);
    sh.getRange(ligne, COLONNES_CODEAM.eleve).setValue(String(d.eleve || ''));
  }

  Object.keys(COLONNES_CODEAM).forEach(function (champ) {
    if (d[champ] === undefined) return;
    var v = d[champ];
    if (champ === 'demande' || champ === 'inscritDdtm' ||
        champ === 'redevance' || champ === 'valide') {
      v = (v === true || v === 'true');
    }
    sh.getRange(ligne, COLONNES_CODEAM[champ]).setValue(v);
  });

  return { status: 'ok', ligne: ligne };
}

function supprimerCodeAmenage(d) {
  var sh;
  try { sh = feuilleDuSuivi(ONGLET_CODEAM); }
  catch (e) { return { status: 'error', message: String(e).slice(0, 160) }; }

  var ligne = Number(d.ligne) || 0;
  if (ligne < LIGNE1_CODEAM) return { status: 'error', message: 'Ligne invalide.' };
  sh.deleteRow(ligne);
  return { status: 'ok' };
}

/* ============================================================
   DÉFAIRE UN RÉSULTAT

   « Permis obtenu » supprime la ligne de suivi de l'élève : il
   n'a plus à être suivi. Quand on s'est trompé de bouton, il
   faut donc tout remettre — le résultat s'efface, et le suivi
   se recrée avec ce qu'il portait.
   ============================================================ */
function annulerResultat(d) {
  var eleve = String(d.eleve || '').trim();
  if (!eleve) return { status: 'error', message: 'Élève manquant.' };

  var sh = feuilleResultats();
  var lignes = sh.getDataRange().getValues();
  var recherche = normaliser(eleve);
  var efface = null;

  /* La dernière ligne de cet élève : c'est celle qu'on vient
     d'écrire par erreur. */
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (normaliser(lignes[i][1]) !== recherche) continue;
    if (d.dateExamen && dateVersIso(lignes[i][0]) !== dateVersIso(d.dateExamen)) {
      continue;
    }
    efface = {
      dateExamen: texteCellule(lignes[i][0], false),
      resultat: texteCellule(lignes[i][2], false),
      boite: texteCellule(lignes[i][3], false),
      moniteur: texteCellule(lignes[i][5], false),
      centre: texteCellule(lignes[i][6], false)
    };
    sh.deleteRow(i + 1);
    break;
  }

  /* Aucun résultat trouvé : ce n'est pas forcément une erreur.
     Le suivi a pu être supprimé sans qu'un résultat soit écrit,
     et c'est justement ce qu'on vient rétablir. */
  if (!efface) efface = { resultat: '', dateExamen: '' };

  /* Le suivi se recrée : sans lui, l'élève n'apparaît nulle part */
  var recree = false;
  try {
    var maj = { eleve: eleve };

    if (String(d.remettre || '') === 'ajourne') {
      /* On le remet en attente de son bilan d'examen */
      maj.resultat = 'ajourne';
      maj.dateAjournement = efface.dateExamen ||
        Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
      maj.nbAjournements = String(Number(d.nbAjournements) || 1);
    } else {
      /* On le remet simplement en attente de résultat */
      maj.resultat = '';
      maj.datePermis = efface.dateExamen || '';
    }

    enregistrerSuivi(maj);
    recree = true;
  } catch (e) { /* le résultat est effacé, c'est l'essentiel */ }

  return { status: 'ok', efface: efface, suiviRecree: recree };
}

/* ============================================================
   LES DEMANDES DE PLACES BE

   Elles partent trois mois à l'avance. Sans trace, on ne sait
   plus lesquelles ont été envoyées — et un oubli coûte un mois
   entier de places.
   ============================================================ */
function feuillePlacesBE() {
  var f = classeur();
  var sh = f.getSheetByName('PlacesBE');
  if (!sh) {
    sh = f.insertSheet('PlacesBE', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Année', 'Mois', 'Unités', 'Détail',
                  'Envoyée le', 'À', 'Par', 'Places obtenues',
                  'Remarque']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function listerPlacesBE() {
  var sh = feuillePlacesBE();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(2, 1, derniere - 1, 10).getValues();
  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      id: String(lignes[i][0]),
      annee: Number(lignes[i][1]) || 0,
      mois: Number(lignes[i][2]) || 0,
      unites: Number(lignes[i][3]) || 0,
      detail: texteCellule(lignes[i][4], false),
      envoyeeLe: texteCellule(lignes[i][5], false),
      destinataire: texteCellule(lignes[i][6], false),
      par: texteCellule(lignes[i][7], false),
      obtenues: texteCellule(lignes[i][8], false),
      remarque: texteCellule(lignes[i][9], false)
    });
  }

  /* La plus récente d'abord : c'est celle qui compte */
  out.sort(function (a, b) {
    return (b.annee * 100 + b.mois) - (a.annee * 100 + a.mois);
  });
  return out;
}

function enregistrerPlaceBE(d) {
  var sh = feuillePlacesBE();
  var annee = Number(d.annee) || 0;
  var mois = Number(d.mois) || 0;
  if (!annee || !mois) {
    return { status: 'error', message: 'Mois manquant.' };
  }

  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy');

  /* Une seule demande par mois : la refaire la remplace */
  for (var i = 1; i < lignes.length; i++) {
    if (Number(lignes[i][1]) !== annee) continue;
    if (Number(lignes[i][2]) !== mois) continue;

    if (d.obtenues !== undefined) {
      sh.getRange(i + 1, 9).setValue(String(d.obtenues));
    }
    if (d.remarque !== undefined) {
      sh.getRange(i + 1, 10).setValue(String(d.remarque));
    }
    /* Un nouvel envoi écrase le précédent */
    if (d.envoyee) {
      sh.getRange(i + 1, 4, 1, 4).setValues([[
        Number(d.unites) || 0, String(d.detail || ''),
        maintenant, String(d.destinataire || '')
      ]]);
      sh.getRange(i + 1, 8).setValue(String(d.par || ''));
    }
    return { status: 'ok', id: String(lignes[i][0]), maj: true };
  }

  var id = 'be' + new Date().getTime();
  ajouterLigne(sh, [id, annee, mois, Number(d.unites) || 0,
                String(d.detail || ''),
                d.envoyee ? maintenant : '',
                String(d.destinataire || ''), String(d.par || ''),
                String(d.obtenues || ''), String(d.remarque || '')]);
  return { status: 'ok', id: id, cree: true };
}

function supprimerPlaceBE(d) {
  var sh = feuillePlacesBE();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) { sh.deleteRow(i + 1); break; }
  }
  return { status: 'ok' };
}

/* ============================================================
   LE RAPPEL DES PLACES BE

   La demande part au plus tard le dernier jour du mois. Le
   dernier lundi, on prévient : il reste quelques jours.

   À installer une fois : ouvrir Apps Script, choisir la fonction
   « installerRappelPlacesBE » et l'exécuter.
   ============================================================ */

var MAIL_RAPPEL_BE = 'evolutionconduites@gmail.com';


function installerRappelPlacesBE() {
  /* On retire l'ancien avant d'en poser un neuf : sans cela ils
     s'accumulent et le mail part plusieurs fois. */
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'rappelPlacesBE') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('rappelPlacesBE')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();

  return 'Rappel installé : chaque lundi à 9h, il ne parle que le dernier.';
}


/* Le dernier lundi du mois : celui après lequel il ne reste plus
   de lundi avant la fin. */
function estDernierLundi(d) {
  if (d.getDay() !== 1) return false;
  var suivant = new Date(d.getTime());
  suivant.setDate(d.getDate() + 7);
  return suivant.getMonth() !== d.getMonth();
}


function rappelPlacesBE() {
  var auj = new Date();
  if (!estDernierLundi(auj)) return;      /* les autres lundis, rien */

  /* Le mois concerné : trois mois devant */
  var vise = new Date(auj.getFullYear(), auj.getMonth() + 3, 1);
  var annee = vise.getFullYear();
  var mois = vise.getMonth() + 1;

  var noms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
              'juillet', 'août', 'septembre', 'octobre',
              'novembre', 'décembre'];

  /* Déjà envoyée ? Alors il n'y a rien à rappeler. */
  var deja = false;
  try {
    deja = listerPlacesBE().some(function (x) {
      return x.annee === annee && x.mois === mois && x.envoyeeLe;
    });
  } catch (e) { /* sans la feuille, on prévient quand même */ }

  if (deja) return;

  /* Le dernier jour du mois en cours */
  var limite = new Date(auj.getFullYear(), auj.getMonth() + 1, 0);
  var jours = Math.round((limite - auj) / 86400000);

  var corps = [
    'Bonjour,',
    '',
    "La demande d'unités PL et BE pour " + noms[mois - 1] + ' ' + annee +
      " n'a pas encore été envoyée.",
    '',
    'Date limite : ' + Utilities.formatDate(limite, 'Europe/Paris', 'dd/MM/yyyy') +
      ' — il reste ' + jours + ' jour(s).',
    '',
    'Rendez-vous dans Outils > Demande de places BE.',
    '',
    'Passé ce délai, les places de ce mois sont perdues.',
    '',
    'Évolution Conduites'
  ].join('\n');

  try {
    MailApp.sendEmail({
      to: MAIL_RAPPEL_BE,
      subject: "⏳ Places BE " + noms[mois - 1] + ' ' + annee +
               ' — plus que ' + jours + ' jour(s)',
      body: corps
    });
  } catch (e) { /* le rappel ne doit jamais bloquer le classeur */ }
}

/* ============================================================
   LES BROUILLONS DE COURS

   La transcription part ici AVANT la génération. Si le bilan
   échoue, si le moniteur recharge la page, si son téléphone
   s'éteint — le cours est en sécurité, et il le retrouve même
   depuis un autre appareil.

   La ligne s'efface dès que le bilan est enregistré.
   ============================================================ */
/* ============================================================
   LES RÉSULTATS MOTO ET REMORQUE

   Le suivi s'efface quand le permis est obtenu : sans cette
   trace, aucune statistique n'était possible.
   ============================================================ */
function feuilleResultats2R() {
  var f = classeur();
  var sh = f.getSheetByName('ResultatsMotoBE');
  if (!sh) {
    sh = f.insertSheet('ResultatsMotoBE', f.getNumSheets());
    ajouterLigne(sh, ['Horodatage', 'Permis', 'Élève', 'Épreuve', 'Résultat',
                  'Passage n°', 'Date examen', 'Par']);
    sh.setFrozenRows(1);
  }
  return sh;
}


function noterResultat2R(d) {
  var sh = feuilleResultats2R();

  ajouterLigne(sh, [
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.permis || ''),
    String(d.eleve || ''),
    String(d.epreuve || ''),
    String(d.resultat || ''),
    String(d.passage || ''),
    String(d.dateExamen || ''),
    String(d.demandeur || d.par || '')
  ]);

  return { status: 'ok' };
}


function listerResultats2R(d) {
  var sh = feuilleResultats2R();
  var derniere = sh.getLastRow();
  if (derniere < 2) return { status: 'ok', resultats: [] };

  var lignes = sh.getRange(2, 1, derniere - 1, 8).getValues();
  var out = [];

  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][2]) continue;
    out.push({
      horodatage: texteCellule(lignes[i][0], true),
      permis: texteCellule(lignes[i][1], false),
      eleve: texteCellule(lignes[i][2], false),
      epreuve: texteCellule(lignes[i][3], false),
      resultat: texteCellule(lignes[i][4], false),
      passage: texteCellule(lignes[i][5], false),
      dateExamen: texteCellule(lignes[i][6], false),
      par: texteCellule(lignes[i][7], false)
    });
  }

  return { status: 'ok', resultats: out };
}

/* ============================================================
   LA CB GASOIL — OÙ ELLE EST, ET LES PLEINS FAITS AVEC

   David : « il faut que l'on prévoit un endroit où le moniteur
   indique qu'il a la CB Gasoil et que tout le monde ait l'info, et
   quand il la dépose il peut indiquer pour quel véhicule il fait
   le plein ».

   ⚠️ L'ÉTAT NE S'ÉCRIT NULLE PART — IL SE DÉDUIT.

   Il aurait été plus court de garder « où est la carte » dans une
   case, et d'écrire l'historique à côté. Deux endroits pour la
   même chose, et le jour où l'un des deux rate son écriture,
   c'est le mauvais qui gagne : la carte serait « au bureau » avec
   une prise notée juste après.

   Une seule vérité, donc : la SUITE DES ÉVÉNEMENTS. Le dernier
   « prise » ou « depot » de chaque carte dit où elle est. Rien à
   tenir à jour, rien à désynchroniser.

   Une ligne par événement :
     · prise  — quelqu'un l'emmène
     · depot  — il la repose (Vers : un bureau, ou un moniteur)
     · plein  — ce qu'il a mis dans quelle voiture

   Les cartes elles-mêmes vivent dans les réglages, comme les
   lieux de rendez-vous : elles changent une fois par an, elles
   n'ont pas besoin d'une feuille.
   ============================================================ */
function feuilleCbGasoil() {
  var f = classeur();
  var sh = f.getSheetByName('CbGasoil');
  if (!sh) {
    sh = f.insertSheet('CbGasoil', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Horodatage', 'Carte', 'Type', 'Qui', 'Vers',
                  'Véhicule', 'Montant', 'Litres', 'Km', 'Remarque']);
    sh.setFrozenRows(1);
  }
  return sh;
}


/* Les cartes d'origine, si personne n'a encore réglé la liste.
   David : « tu crées de base CB Saint-Brieuc et CB Loudéac, il y
   en a une par site ». Le SIGLE est ce que porte le bouton. */
function cartesCbParDefaut() {
  return [
    { cle: 'stbrieuc', nom: 'CB Saint-Brieuc', sigle: 'SB' },
    { cle: 'loudeac',  nom: 'CB Loudéac',      sigle: 'L' }
  ];
}


function listerCbGasoil(d) {
  var sh = feuilleCbGasoil();
  var derniere = sh.getLastRow();

  var cartes = cartesCbParDefaut();
  try {
    var reg = lireReglages();
    var brut = String(reg.cbGasoil || '').trim();
    if (brut) {
      var l = JSON.parse(brut);
      if (l && l.length) cartes = l;
    }
  } catch (e) { /* le défaut suffit */ }

  if (derniere < 2) return { status: 'ok', cartes: cartes, events: [] };

  /* Quatre-vingt-dix jours : de quoi faire les totaux du mois et
     lire les allers-retours récents, sans traîner trois ans de
     lignes à chaque ouverture de l'application. */
  var limite = new Date().getTime() - 90 * 24 * 3600 * 1000;

  var lignes = sh.getRange(2, 1, derniere - 1, 11).getValues();
  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;

    var quand = texteCellule(lignes[i][1], true);
    var m = String(quand).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) {
      var t = new Date(m[3] + '-' + m[2] + '-' + m[1] + 'T12:00:00').getTime();
      if (t < limite) continue;
    }

    out.push({
      id: String(lignes[i][0]),
      quand: quand,
      carte: texteCellule(lignes[i][2], false),
      type: texteCellule(lignes[i][3], false),
      qui: texteCellule(lignes[i][4], false),
      vers: texteCellule(lignes[i][5], false),
      vehicule: texteCellule(lignes[i][6], false),
      montant: texteCellule(lignes[i][7], false),
      litres: texteCellule(lignes[i][8], false),
      km: texteCellule(lignes[i][9], false),
      remarque: texteCellule(lignes[i][10], false)
    });
  }

  return { status: 'ok', cartes: cartes, events: out };
}


/* Une prise, ou un dépôt avec ses pleins — en une seule fois.

   ⚠️ LES PLEINS PARTENT AVEC LE DÉPÔT, PAS APRÈS. Deux appels
   séparés, c'est un dépôt enregistré et des pleins perdus quand le
   réseau lâche entre les deux — et personne ne saurait qu'il en
   manque. */
function evenementCbGasoil(d) {
  var sh = feuilleCbGasoil();

  var carte = String(d.carte || '').trim();
  var type = String(d.type || '').trim();
  if (!carte) return { status: 'error', message: 'Carte manquante.' };
  if (type !== 'prise' && type !== 'depot') {
    return { status: 'error', message: 'Geste inconnu.' };
  }

  var qui = String(d.demandeur || d.qui || '').trim();
  var quand = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');
  var base = new Date().getTime();

  ajouterLigne(sh, ['cb' + base, quand, carte, type, qui,
                    String(d.vers || ''), '', '', '', '',
                    /* « Je n'ai pas fait le plein » se DIT. Sans
                       cette marque, un dépôt sans ligne veut dire
                       deux choses qu'on ne peut plus distinguer :
                       rien fait, ou oublié de le noter. */
                    String(d.sansPlein || '') === 'oui' ? 'sans plein' : '']);

  var pleins = d.pleins;
  try { if (typeof pleins === 'string') pleins = JSON.parse(pleins); }
  catch (e) { pleins = null; }

  var n = 0;
  (pleins || []).forEach(function (p, i) {
    var veh = String((p && p.vehicule) || '').trim();
    if (!veh) return;      /* sans véhicule, la ligne ne remonte nulle part */
    ajouterLigne(sh, ['cb' + base + '-' + (i + 1), quand, carte, 'plein', qui,
                      '', veh, String((p && p.montant) || ''),
                      String((p && p.litres) || ''), String((p && p.km) || ''),
                      String((p && p.remarque) || '')]);
    n++;
  });

  /* ⚠️ ON REND LA LISTE À JOUR AVEC L'ACCUSÉ DE RÉCEPTION.

     David : « les enregistrements sont super longs ». Ils l'étaient
     deux fois : un aller-retour pour écrire, un second pour relire.
     Or celui qui vient d'écrire a la liste sous les yeux — la
     redemander, c'est réveiller le classeur une seconde fois pour
     apprendre ce qu'on sait déjà.

     Et ce n'est pas qu'une question de vitesse : entre les deux
     appels, la relecture pouvait passer par l'autre porte et ne pas
     encore voir l'écriture. Une seule porte, une seule réponse. */
  var apres = { cartes: cartesCbParDefaut(), events: [] };
  try { apres = listerCbGasoil({}); } catch (e) { /* l'écran relira */ }

  return { status: 'ok', pleins: n,
           cartes: apres.cartes || [], events: apres.events || [] };
}


/* Corriger un plein après coup — on se trompe de véhicule, on tape
   640 au lieu de 64. Ouvert à tout le monde : c'est celui qui était
   à la pompe qui sait ce qu'il a tapé de travers. */
function majPleinCbGasoil(d) {
  var sh = feuilleCbGasoil();
  var lignes = sh.getDataRange().getValues();
  var id = String(d.id || '').trim();
  if (!id) return { status: 'error', message: 'Ligne manquante.' };

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== id) continue;
    if (String(lignes[i][3]) !== 'plein') {
      return { status: 'error', message: "Cette ligne n'est pas un plein." };
    }
    if (d.vehicule !== undefined) sh.getRange(i + 1, 7).setValue(String(d.vehicule || ''));
    if (d.montant !== undefined)  sh.getRange(i + 1, 8).setValue(String(d.montant || ''));
    if (d.litres !== undefined)   sh.getRange(i + 1, 9).setValue(String(d.litres || ''));
    if (d.km !== undefined)       sh.getRange(i + 1, 10).setValue(String(d.km || ''));
    if (d.remarque !== undefined) sh.getRange(i + 1, 11).setValue(String(d.remarque || ''));
    return { status: 'ok' };
  }
  return { status: 'error', message: 'Ligne introuvable.' };
}


/* ⚠️ SEUL UN PLEIN SE SUPPRIME. Une prise ou un dépôt, jamais :
   ce sont eux qui disent où est la carte, et en retirer un ferait
   remonter un état d'avant-hier comme s'il était le dernier. */
function supprimerPleinCbGasoil(d) {
  var sh = feuilleCbGasoil();
  var lignes = sh.getDataRange().getValues();
  var id = String(d.id || '').trim();
  if (!id) return { status: 'error', message: 'Ligne manquante.' };

  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) !== id) continue;
    if (String(lignes[i][3]) !== 'plein') {
      return { status: 'error',
               message: "On ne supprime qu'un plein : une prise ou un dépôt " +
                        "dit où est la carte." };
    }
    sh.deleteRow(i + 1);
    return { status: 'ok' };
  }
  return { status: 'error', message: 'Ligne introuvable.' };
}


function feuilleBrouillons() {
  var f = classeur();
  var sh = f.getSheetByName('Brouillons');
  if (!sh) {
    sh = f.insertSheet('Brouillons', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Déposé le', 'Moniteur', 'Élève', 'Date du cours',
                  'Modèle', 'Site', 'Transcription', 'Note interne',
                  'Bilan proposé', 'État', 'Fiche', 'Écarté le', 'Relevé GPS']);
    sh.setFrozenRows(1);
  }

  /* Deux colonnes arrivées avec la reprise au bureau : le bilan
     que le bureau a généré, et l'état du brouillon. Ajoutées à la
     volée plutôt qu'en exigeant une remise à zéro. */
  if (sh.getLastColumn() < 10) sh.getRange(1, 10).setValue('Bilan proposé');
  if (sh.getLastColumn() < 11) sh.getRange(1, 11).setValue('État');

  /* ⚠️ LA DOUZIÈME : LA FICHE ELLE-MÊME.

     Pour un bilan manuel, la colonne « Transcription » porte le
     MIROIR de la fiche — du texte, fait pour être LU par le
     bureau. On ne peut pas le continuer : reprendre ne pouvait que
     le recoller dans la case de dictée, et le moniteur se
     retrouvait devant un pavé au lieu de sa fiche.

     Celle-ci porte les réponses telles quelles, dans le même
     format que la sauvegarde sur l'appareil. C'est elle qui permet
     de rouvrir une VRAIE fiche, chaque réponse à sa place. Vide
     pour une dictée : une dictée n'a pas de cases. */
  if (sh.getLastColumn() < 12) sh.getRange(1, 12).setValue('Fiche');

  /* ⚠️ LA TREIZIÈME : QUAND LE MONITEUR A ÉCARTÉ LA LIGNE.

     David : « il supprime en haut, ça masque en bas, par contre on
     se garde une sécu dans cours non terminé avec les infos
     exactes ».

     Écarter n'est PAS supprimer. Le moniteur retire sa copie de
     l'appareil et la ligne de son écran ; la dictée, elle, reste
     ici entière. Sans cette date, le bureau verrait une ligne
     écartée sans savoir quand — or c'est justement ce qui lui dit
     si le moniteur vient de la ranger ou s'il l'a oubliée la
     semaine dernière. */
  if (sh.getLastColumn() < 13) sh.getRange(1, 13).setValue('Écarté le');

  /* ⚠️ LA QUATORZIÈME : L'ÉTAT DU RELEVÉ GPS — v1020.

     David : « rajoute dans cours non terminés les infos sur le GPS
     par cours, pour que je voie si ça bug ». Le TRACÉ n'arrive au
     classeur qu'avec le bilan : sur un cours non terminé — celui
     qu'on cherche justement à comprendre — il n'existait nulle
     part, et le trou se découvrait après coup.

     Quelques NOMBRES : points relevés, secondes de silence, fois
     où la veille a été reposée. Aucune coordonnée — le tracé, lui,
     ne voyage qu'avec le bilan. Déposer des positions toutes les
     cinq minutes ferait un suivi permanent des salariés, que la
     note de service n'annonce pas et que la CNIL interdit. */
  if (sh.getLastColumn() < 14) sh.getRange(1, 14).setValue('Relevé GPS');
  return sh;
}


function deposerBrouillon(d) {
  var sh = feuilleBrouillons();
  /* Le bureau dépose POUR un moniteur : sinon le bilan proposé
     serait rangé sous le nom de qui l'a généré, et celui qui doit
     le corriger ne le verrait jamais. Réservé aux administrateurs,
     le rôle venant du code d'accès. */
  var pour = String(d.pour || '').trim();
  var moniteur = (pour && String(d.role || '') === 'admin')
    ? pour
    : String(d.demandeur || d.moniteur || '').trim();

  var eleve = String(d.eleve || '').trim();
  var texte = String(d.transcript || '');

  if (!texte.trim()) return { status: 'ok', vide: true };

  /* Un seul brouillon par moniteur et par élève : redéposer
     remplace, sinon les reprises s'accumulent. */
  var lignes = sh.getDataRange().getValues();

  /* ⚠️ CE QUI ÉTAIT DÉJÀ LÀ ET QUE CE DÉPÔT NE DIT PAS — v207.

     David : « j'ai fait le test sur un examen blanc, je le
     supprime en haut, je le vois bien dans cours non terminé,
     sauf que quand je le reprends ça n'a pas sauvegardé ce que
     j'ai noté : les boutons en haut, la case cochée, les
     remarques. Rien, nada. »

     La cause est ici. UN DÉPÔT REMPLACE LA LIGNE ENTIÈRE. La
     fiche — les réponses case par case — n'est envoyée que par le
     dépôt de l'écran manuel ; tous les autres chemins déposent la
     dictée sans elle : la mise à l'abri de l'arrière-plan, le
     passage en génération, l'ouverture d'un cours préparé. Le
     premier de ces dépôts qui suivait effaçait la fiche, et il ne
     restait que le miroir — du texte, fait pour être LU. C'est
     très exactement ce qu'il a vu : 361 mots dictés, et pas une
     case retrouvée.

     ⚠️ ABSENT N'EST PAS VIDE. Un dépôt qui ne parle pas de la
     fiche la laisse telle qu'elle est ; un dépôt qui envoie une
     fiche vide, lui, l'efface — c'est le geste d'un écran qui
     n'en a pas. Même règle que la photo d'un dommage, et pour la
     même raison.

     Le bilan proposé par le bureau suit la même règle : sans
     elle, la première mise à l'abri du moniteur effaçait le
     bilan qu'on venait de lui renvoyer. */
  var ancienneFiche = '', ancienBilan = '', ancienGps = '';
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (normaliser(lignes[i][2]) !== normaliser(moniteur)) continue;
    if (normaliser(lignes[i][3]) !== normaliser(eleve)) continue;
    if (!ancienneFiche) ancienneFiche = String(lignes[i][11] || '');
    if (!ancienBilan)   ancienBilan   = String(lignes[i][9] || '');
    if (!ancienGps)     ancienGps     = String(lignes[i][12] || '');
    sh.deleteRow(i + 1);
  }

  var id = 'br' + new Date().getTime();
  ajouterLigne(sh, [
    id,
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    moniteur, eleve,
    String(d.dateCours || ''), String(d.modele || ''), String(d.site || ''),
    texte.slice(0, 45000),
    String(d.note || '').slice(0, 4000),
    (d.bilan === undefined ? ancienBilan
                           : String(d.bilan || '')).slice(0, 45000),
    String(d.etat || 'dictee'),
    /* Les réponses de la fiche, pour pouvoir la ROUVRIR. Coupée,
       elle se reposerait de travers : mieux vaut ne rien mettre
       et garder le miroir seul. */
    (function () {
      if (d.fiche === undefined) return ancienneFiche;
      var f = String(d.fiche || '');
      return (f.length > 45000) ? '' : f;
    })(),
    /* ⚠️ LA COLONNE M EST DÉJÀ PRISE — « ecarteLe ». Un dépôt neuf
       n'est écarté par personne : elle part vide, et c'est juste.
       Mais elle doit être ÉCRITE, sinon la colonne suivante
       glisserait d'un cran et le relevé GPS atterrirait dedans. */
    '',
    /* ⚠️ L'ÉTAT DU RELEVÉ GPS — v1020, colonne N.

       David : « rajoute dans cours non terminés les infos sur le
       GPS par cours ». Quelques NOMBRES — points, silence,
       relances — et aucune coordonnée : le tracé, lui, ne part
       qu'avec le bilan. Déposer des positions toutes les cinq
       minutes ferait un suivi permanent des salariés, ce que la
       note de service n'annonce pas et que la CNIL interdit.

       Même règle que la fiche : un dépôt qui n'en parle PAS laisse
       ce qui était là. Tous les chemins ne relèvent pas de trajet
       — un examen officiel, une reprise par le bureau — et le
       premier d'entre eux effacerait l'état du relevé du cours. */
    (function () {
      if (d.gps === undefined) return ancienGps;
      var g = String(d.gps || '');
      return (g.length > 4000) ? '' : g;
    })()
  ]);

  /* On ne garde pas les brouillons éternellement : au-delà de
     sept jours, le cours a été refait ou abandonné. */
  try { purgerBrouillons(sh); } catch (e) {}

  return { status: 'ok', id: id };
}


function listerBrouillons(d) {
  var sh = feuilleBrouillons();
  var derniere = sh.getLastRow();
  if (derniere < 2) return { status: 'ok', brouillons: [] };

  /* Un administrateur peut demander ceux de tout le monde : c'est
     le seul moyen de récupérer le travail d'un moniteur bloqué.
     Le rôle vient du code d'accès, jamais du client. */
  var tousLesMoniteurs = (String(d.tous || '') === 'oui' &&
                          String(d.role || '') === 'admin');
  var moniteur = tousLesMoniteurs
    ? '' : normaliser(String(d.demandeur || d.moniteur || ''));
  /* ⚠️ QUATORZE COLONNES DEPUIS LA v1020 : la N porte l'état du
     relevé GPS. Une plage trop courte ne se plaint pas — elle rend
     des cases vides, et l'écran croit qu'aucun cours n'a de GPS. */
  var colonnes = Math.max(9, Math.min(14, sh.getLastColumn()));
  var lignes = sh.getRange(2, 1, derniere - 1, colonnes).getValues();
  var out = [];

  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    /* Chacun ne voit que les siens : un brouillon est un travail
       en cours, pas une archive partagée. */
    if (moniteur && normaliser(lignes[i][2]) !== moniteur) continue;

    out.push({
      id: String(lignes[i][0]),
      deposeLe: texteCellule(lignes[i][1], true),
      moniteur: texteCellule(lignes[i][2], false),
      eleve: texteCellule(lignes[i][3], false),
      dateCours: texteCellule(lignes[i][4], false),
      modele: texteCellule(lignes[i][5], false),
      site: texteCellule(lignes[i][6], false),
      transcript: texteCellule(lignes[i][7], false),
      note: texteCellule(lignes[i][8], false),
      bilan: texteCellule(lignes[i][9], false),
      /* Sans état noté, c'est un brouillon d'avant la reprise au
         bureau : à l'époque il n'y avait que des dictées. */
      etat: texteCellule(lignes[i][10], false) || 'dictee',
      /* Les réponses de la fiche, quand il y en a : c'est elle qui
         permet de la rouvrir au lieu d'en recoller le miroir dans
         la case de dictée. */
      fiche: texteCellule(lignes[i][11], false),
      /* Vide tant que personne ne l'a écartée */
      ecarteLe: texteCellule(lignes[i][12], true),
      /* L'état du relevé GPS, en quelques nombres. Vide sur les
         brouillons d'avant la v1020, et sur les cours qui ne
         relèvent pas de trajet. */
      gps: texteCellule(lignes[i][13], false)
    });
  }

  /* Le plus récent d'abord */
  out.reverse();
  return { status: 'ok', brouillons: out };
}


/* ============================================================
   ÉCARTER UNE LIGNE SANS RIEN DÉTRUIRE

   Le moniteur a supprimé sa copie sur l'appareil. Sa ligne doit
   disparaître de son écran — mais la dictée est peut-être deux
   heures de cours, et c'est la seule qui reste. On ne l'efface
   donc pas : on change son état, et le bureau la retrouve dans
   « Cours non terminés » avec toutes ses informations.

   ⚠️ CE N'EST PAS effacerBrouillon. Les deux gestes existent, et
   ils ne se remplacent pas : celui-ci range, l'autre détruit.
   Le seul qui détruise est celui du bureau, devant sa liste.

   Redicter le même cours le remet tout seul en état normal :
   deposerBrouillon supprime la ligne et en repose une neuve.
   ============================================================ */
function etatBrouillon(d) {
  var sh = feuilleBrouillons();
  var lignes = sh.getDataRange().getValues();

  var etat = String(d.etat || '').trim();
  if (!etat) return { status: 'ok', touche: 0 };

  var id = String(d.id || '').trim();
  var moniteur = normaliser(String(d.demandeur || d.moniteur || ''));
  var eleve = normaliser(String(d.eleve || ''));

  var quand = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');
  var n = 0;

  for (var i = lignes.length - 1; i >= 1; i--) {
    if (id) {
      if (String(lignes[i][0]) !== id) continue;
    } else {
      /* Sans identifiant : celui de ce moniteur pour cet élève.
         Le nom seul ne suffit pas — deux moniteurs peuvent avoir
         commencé un cours pour le même élève. */
      if (!eleve) continue;
      if (normaliser(lignes[i][2]) !== moniteur) continue;
      if (normaliser(lignes[i][3]) !== eleve) continue;
    }

    sh.getRange(i + 1, 11).setValue(etat);
    sh.getRange(i + 1, 13).setValue(quand);
    n++;
    if (id) break;
  }

  return { status: 'ok', touche: n };
}


function effacerBrouillon(d) {
  var sh = feuilleBrouillons();
  var lignes = sh.getDataRange().getValues();

  var id = String(d.id || '').trim();
  var moniteur = normaliser(String(d.demandeur || d.moniteur || ''));
  var eleve = normaliser(String(d.eleve || ''));

  for (var i = lignes.length - 1; i >= 1; i--) {
    if (id) {
      if (String(lignes[i][0]) !== id) continue;
    } else {
      /* Sans identifiant : celui de ce moniteur pour cet élève */
      if (!eleve) continue;
      if (normaliser(lignes[i][2]) !== moniteur) continue;
      if (normaliser(lignes[i][3]) !== eleve) continue;
    }
    sh.deleteRow(i + 1);
    if (id) break;
  }

  return { status: 'ok' };
}


function purgerBrouillons(sh) {
  var lignes = sh.getDataRange().getValues();
  var limite = Date.now() - 7 * 24 * 3600 * 1000;

  for (var i = lignes.length - 1; i >= 1; i--) {
    var t = String(lignes[i][1] || '');
    var m = t.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) continue;
    var d = new Date(m[3] + '-' + m[2] + '-' + m[1] + 'T12:00:00');
    if (d.getTime() < limite) sh.deleteRow(i + 1);
  }
}

function feuilleElevesAcces() {
  var f = classeur();
  var sh = f.getSheetByName('ElevesAcces');
  if (!sh) {
    sh = f.insertSheet('ElevesAcces', f.getNumSheets());
    ajouterLigne(sh, ['Élève', 'Code', 'Actif', 'Créé le', 'Dernière visite',
                  'Langue autorisée', 'Modules', 'Boîte déclarée',
                  'Procédures en plus', 'Groupes du parcours']);
    sh.setFrozenRows(1);
    return sh;
  }

  /* La feuille a pu être créée avant ces colonnes : en lire une
     qui n'existe pas ferait échouer toute la connexion.

     La grille d'abord : une feuille rognée ferait échouer
     l'écriture de l'en-tête, et cette fonction est appelée à
     chaque connexion d'élève. */
  var manque = 10 - sh.getMaxColumns();
  if (manque > 0) sh.insertColumnsAfter(sh.getMaxColumns(), manque);

  if (sh.getLastColumn() < 6) sh.getRange(1, 6).setValue('Langue autorisée');
  if (sh.getLastColumn() < 7) sh.getRange(1, 7).setValue('Modules');
  if (sh.getLastColumn() < 8) sh.getRange(1, 8).setValue('Boîte déclarée');
  if (sh.getLastColumn() < 9) sh.getRange(1, 9).setValue('Procédures en plus');
  /* ⚠️ LA DIXIÈME : LES GROUPES DU PARCOURS — v1036.

     David, le 17 septembre : « attention il ne faut pas que les
     accès soient ouverts de base, c'est nous qui ouvrons à la
     main ». Une cellule vide veut donc dire AUCUN groupe, et c'est
     le sens le plus sûr : un groupe neuf n'arrive chez personne
     tant que quelqu'un ne l'a pas coché.

     Les identifiants, séparés par « | », jamais les noms : renommer
     un groupe ne doit détacher personne. */
  if (sh.getLastColumn() < 10) sh.getRange(1, 10).setValue('Groupes du parcours');
  return sh;
}

function feuilleRecitations() {
  var f = classeur();
  var sh = f.getSheetByName('Recitations');
  if (!sh) {
    sh = f.insertSheet('Recitations', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Élève', 'Procédure', 'Texte', 'Correction',
                  'Note', 'État', 'Envoyé le', 'Validé par', 'Validé le',
                  'Langue', 'Traduction FR', 'Correction traduite']);
    sh.setFrozenRows(1);
    return sh;
  }

  /* Les trois colonnes des langues sont arrivées après coup */
  if (sh.getLastColumn() < 13) {
    sh.getRange(1, 11, 1, 3).setValues([['Langue', 'Traduction FR',
                                         'Correction traduite']]);
  }
  return sh;
}

/* Le code d'un élève, ou rien */
/* ------------------------------------------------------------
   UN CODE D'ESPACE ÉLÈVE NE DOIT PAS ÊTRE ÉTERNEL

   Six chiffres, tirés une fois, jamais expirés, jamais renouvelés,
   et transmis en clair par mail et par Messenger. Un élève parti
   en 2024 gardait un accès valable en 2027 : un téléphone perdu,
   une conversation partagée, un mail transféré à un parent, et la
   porte restait ouverte tant que personne au bureau ne s'en
   souvenait.

   Les deux colonnes qu'il fallait existaient déjà — « Créé le » et
   « Dernière visite » — et personne ne les lisait.

   DOUZE MOIS SANS VENIR, ET LE CODE NE VAUT PLUS. Le compte n'est
   pas effacé : le bureau le rouvre d'un bouton, et l'élève garde
   ses récitations. C'est une porte qui se referme, pas un dossier
   qu'on jette.
   ------------------------------------------------------------ */
var MOIS_AVANT_PEREMPTION = 12;

/* « 14/08/2025 10:30 » → « 2025-08-14 », comparable tel quel. */
function jourComparable(texte) {
  var m = String(texte || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return '';
  return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
}

function codePerime(acc) {
  if (!acc) return false;
  /* La dernière venue, ou à défaut la création : un élève qui n'est
     jamais venu depuis un an n'a pas plus besoin de sa clé. */
  var quand = jourComparable(acc.derniereVisite) || jourComparable(acc.creeLe);
  if (!quand) return false;          /* on ne sait pas : on ne ferme pas */

  var limite = new Date();
  limite.setMonth(limite.getMonth() - MOIS_AVANT_PEREMPTION);
  return quand < Utilities.formatDate(limite, 'Europe/Paris', 'yyyy-MM-dd');
}

/* ============================================================
   LE PARCOURS D'APPRENTISSAGE — LES GROUPES ET LEURS GUIDES
   v1029

   Ce qui remplace les huit groupes Facebook privés. Deux feuilles,
   et rien de plus pour l'instant : les vidéos viendront se ranger
   dans Cloudflare R2, et ce qu'un élève a vu ira dans D1. Ici on ne
   garde que ce que DAVID ÉCRIT — ce qui se corrige à la main un
   dimanche soir sans développeur.

   ⚠️ L'IDENTIFIANT D'UN GROUPE NE BOUGE JAMAIS. Les élèves y sont
   rattachés par lui, pas par son nom : c'est ce qui permet de
   renommer « Cours théorie » en autre chose sans que personne ne
   perde son groupe. Un nom qu'on n'ose pas corriger finit par être
   faux pour tout le monde.

   ⚠️ UN GROUPE SE FERME, IL NE S'EFFACE PAS. Le retirer le rend
   invisible et le sort des propositions ; ses guides et ce que les
   élèves ont vu restent. Effacer un groupe effacerait la
   progression de ceux qui l'ont suivi, et ça ne se récupère pas.

   ⚠️ UN GUIDE EST UNE PILE DE BLOCS. Cinq types — titre, texte,
   vidéo, image, PDF — un contenu chacun, et un rang qui se réécrit
   quand on les déplace au doigt. Le titre, lui, ne porte rien : il
   COUPE, et c'est ce découpage qui fait les segments (v1056). Pas de « pièce avec sa légende » : deux
   endroits pour écrire du texte, c'est deux endroits à chercher six
   mois plus tard.
   ============================================================ */
/* ⚠️ « titre » EST LE CINQUIÈME — v1056. C'est lui qui découpe un
   guide en segments ; un type refusé ici serait silencieusement jeté
   par blocsPropres, et le guide reviendrait d'un seul tenant sans
   qu'aucun écran ne le dise. */
var TYPES_DE_BLOC = ['titre', 'texte', 'video', 'image', 'pdf'];

function feuilleGroupes() {
  var f = classeur();
  var sh = f.getSheetByName('Groupes');
  if (!sh) {
    sh = f.insertSheet('Groupes', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Icône', 'Nom', 'Proposé aux formations',
                      'Ordre', 'Fermé le', 'Par']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function feuilleGuides() {
  var f = classeur();
  var sh = f.getSheetByName('Guides');
  if (!sh) {
    sh = f.insertSheet('Guides', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Groupe', 'Ordre', 'Titre', 'État',
                      'Blocs', 'Créé le', 'Modifié le', 'Par']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* Un identifiant qui ne ressemble à aucun autre. ⚠️ On regarde ce
   qui existe déjà : deux groupes créés dans la même seconde
   partageraient sinon le même, et l'un écraserait l'autre. */
function idNeuf(prefixe, dejaPris) {
  var base = prefixe + new Date().getTime();
  var id = base, n = 2;
  while (dejaPris.indexOf(id) !== -1) { id = base + '-' + n; n++; }
  return id;
}

/* ============================================================
   RECONNAÎTRE AVANT D'ÉCRIRE — v1036

   David, le 18 septembre : « quand j'enregistre le brouillon d'un
   guide, le guide se duplique ».

   ⚠️ C'EST LA PANNE DU BILAN EN QUATRE EXEMPLAIRES, À L'IDENTIQUE.

   L'envoi du navigateur borne son attente à douze secondes et
   RÉESSAIE UNE FOIS. Écrire un guide passe par ici, et réveiller ce
   classeur mange à lui seul ces douze secondes : la première
   tentative expire, la seconde arrive — et comme un guide neuf
   venait SANS identifiant, on en créait un second. Deux guides, un
   seul appui, et rien pour le dire.

   L'écran décide donc l'identifiant à l'ouverture de l'éditeur et
   l'envoie dès le premier essai. Le rejeu retrouve alors SA ligne et
   la corrige, au lieu d'en semer une seconde.

   ⚠️ MAIS UN IDENTIFIANT VENU DU CLIENT SE VÉRIFIE. On n'accepte que
   la forme qu'on écrit soi-même : le préfixe, l'instant, puis une
   queue tirée au sort. Tout le reste retombe sur idNeuf — mieux vaut
   un doublon qu'une ligne rangée sous un nom qu'on ne saura plus
   relire.

   ⚠️ ET LE PRÉFIXE SE COMPARE AVEC CE QUI LE SUIT. « g » puis un
   chiffre pour un groupe, « gd » puis un chiffre pour un guide :
   sans le chiffre dans le motif, un identifiant de guide passerait
   pour un identifiant de groupe.
   ============================================================ */
function idPropose(prefixe, propose, dejaPris) {
  var p = String(propose || '').trim();
  var forme = new RegExp('^' + prefixe + '\\d{10,16}(-[A-Za-z0-9]{1,8})?$');
  if (p && forme.test(p) && dejaPris.indexOf(p) === -1) return p;
  return idNeuf(prefixe, dejaPris);
}

function listeDeFormations(valeur) {
  var out = [];
  String(valeur || '').split(/[|,;]/).forEach(function (x) {
    var c = String(x || '').trim();
    if (c && out.indexOf(c) === -1) out.push(c);
  });
  return out;
}

function listerGroupes() {
  var sh = feuilleGroupes();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(2, 1, derniere - 1, 7).getValues();
  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      id: String(lignes[i][0]),
      icone: texteCellule(lignes[i][1], false),
      nom: texteCellule(lignes[i][2], false),
      formations: listeDeFormations(lignes[i][3]),
      ordre: Number(lignes[i][4]) || 0,
      fermeLe: texteCellule(lignes[i][5], false),
      ligne: i + 2
    });
  }
  out.sort(function (a, b) { return a.ordre - b.ordre; });
  return out;
}

/* ⚠️ « avecBlocs » est FAUX par défaut. La liste de l'écran de
   gestion n'a pas besoin du contenu — seulement des titres et du
   nombre de blocs. Tout charger à chaque ouverture ferait passer
   des centaines de kilo-octets pour afficher une liste. */
function listerGuides(groupeId, avecBlocs) {
  var sh = feuilleGuides();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(2, 1, derniere - 1, 9).getValues();
  var cible = String(groupeId || '');
  var out = [];

  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    var g = String(lignes[i][1] || '');
    if (cible && g !== cible) continue;

    var blocs = [];
    try { blocs = JSON.parse(String(lignes[i][5] || '[]')) || []; }
    catch (e) { blocs = []; }
    if (!blocs.length) blocs = [];

    var fiche = {
      id: String(lignes[i][0]),
      groupe: g,
      ordre: Number(lignes[i][2]) || 0,
      titre: texteCellule(lignes[i][3], false),
      etat: String(lignes[i][4] || 'brouillon'),
      nbBlocs: blocs.length,
      /* De quoi dire « 3 🎬 · 1 📄 » sans charger le contenu */
      compte: compterLesBlocs(blocs),
      modifieLe: texteCellule(lignes[i][7], false),
      ligne: i + 2
    };
    if (avecBlocs) fiche.blocs = blocs;
    out.push(fiche);
  }
  out.sort(function (a, b) { return a.ordre - b.ordre; });
  return out;
}

function compterLesBlocs(blocs) {
  var c = {};
  TYPES_DE_BLOC.forEach(function (t) { c[t] = 0; });
  (blocs || []).forEach(function (b) {
    var t = String((b && b.type) || '');
    if (c[t] !== undefined) c[t]++;
  });
  return c;
}

/* ⚠️ ON NE GARDE QUE LES CINQ TYPES, ET RIEN D'AUTRE. Un bloc
   venu d'ailleurs — un écran plus vieux, une main dans le
   classeur — ne doit pas se retrouver chez un élève sans que
   personne sache le dessiner. */
/* Les clés d'un bloc média : une, ou plusieurs pour un carrousel.
   On garde ce qui a la forme d'une clé ET le texte libre d'avant la
   v1034, qui n'en est pas une — l'éditeur le rangera dans « titre »
   au premier enregistrement plutôt que de le perdre. */
function clesDeBloc(valeur) {
  var brut = String(valeur || '').trim();
  if (!brut) return '';
  var morceaux = brut.split('|').map(function (x) { return x.trim(); })
    .filter(function (x) { return x; });
  var cles = morceaux.filter(function (x) {
    return /^guides\/[A-Za-z0-9]{22}\.[a-z0-9]{1,5}$/.test(x);
  });
  /* Aucune clé : c'est un nom tapé à la main, on le laisse tel quel. */
  return cles.length ? cles.join('|') : brut;
}

function blocsPropres(brut) {
  var liste = brut;
  if (typeof liste === 'string') {
    try { liste = JSON.parse(liste); } catch (e) { liste = []; }
  }
  if (!liste || !liste.length) return [];

  var out = [];
  for (var i = 0; i < liste.length; i++) {
    var b = liste[i] || {};
    var t = String(b.type || '');
    if (TYPES_DE_BLOC.indexOf(t) === -1) continue;
    out.push({
      type: t,
      /* Le rang se réécrit à chaque enregistrement : c'est l'ORDRE
         DU TABLEAU qui fait foi, pas un numéro qu'on aurait pu
         oublier de mettre à jour en glissant un bloc. */
      rang: out.length + 1,
      texte: String(b.texte || ''),
      /* ⚠️ « fichier » PORTE UNE CLÉ R2 DEPUIS LA v1034, plus un nom
         tapé à la main : « guides/xK3p….mp4 ». Le nom que l'élève
         lit vit dans « titre ». Les guides d'avant portent encore un
         nom d'affichage ici ; l'éditeur le récupère et le range dans
         « titre » au premier enregistrement.

         ⚠️ ET DEPUIS LA v1036, PLUSIEURS CLÉS SÉPARÉES PAR « | » — un
         carrousel d'images. Une clé seule reste une clé seule : c'est
         la même case, lue comme une liste d'un élément. Une seconde
         colonne pour les images aurait fait deux chemins de lecture,
         et un des deux aurait fini par en oublier une. */
      fichier: clesDeBloc(b.fichier),
      titre: String(b.titre || ''),
      /* ============================================================
         ⚠️ L'IDENTIFIANT DU SEGMENT TRAVERSE — v1056

         Cette fonction recopie CHAMP PAR CHAMP : tout ce qui n'est
         pas nommé ici est jeté, sans un mot. L'identifiant d'un
         segment serait donc perdu au premier enregistrement — et
         chaque publication en aurait recréé un autre, c'est-à-dire
         exactement ce que cet identifiant existe pour éviter.

         ⚠️ ET IL NE SE FABRIQUE PAS ICI. Le classeur ne sait pas si
         ce bloc est neuf ou s'il revient ; lui donner un identifiant
         « au cas où » en changerait un à chaque passage. C'est
         l'écran qui le pose, à la création, une fois. */
      id: String(b.id || ''),
      /* Le poids du fichier, pour l'annoncer avant de le charger sur
         une 4G de campagne. Zéro quand on ne le sait pas. */
      poids: Number(b.poids) || 0,
      duree: Number(b.duree) || 0
    });
  }
  return out;
}

function enregistrerGroupe(d) {
  var sh = feuilleGroupes();
  var nom = String(d.nom || '').trim();
  if (!nom) return { status: 'error', message: 'Donne un nom au groupe.' };

  var tous = listerGroupes();
  var id = String(d.id || '').trim();
  var existant = null;
  for (var i = 0; i < tous.length; i++) {
    if (tous[i].id === id) { existant = tous[i]; break; }
  }

  var formations = listeDeFormations(
    (d.formations && d.formations.join) ? d.formations.join('|') : d.formations);

  if (existant) {
    /* ⚠️ L'IDENTIFIANT NE BOUGE PAS. C'est lui qui rattache les
       élèves : le renommer les détacherait tous d'un coup. */
    sh.getRange(existant.ligne, 2).setValue(String(d.icone || ''));
    sh.getRange(existant.ligne, 3).setValue(nom);
    sh.getRange(existant.ligne, 4).setValue(formations.join('|'));
    if (d.ferme !== undefined) {
      sh.getRange(existant.ligne, 6).setValue(
        String(d.ferme) === 'oui'
          ? Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy')
          : '');
    }
    return { status: 'ok', id: existant.id };
  }

  var idsPris = tous.map(function (x) { return x.id; });
  /* Même règle que pour les guides — voir idPropose. */
  var neuf = idPropose('g', id, idsPris);
  var dernier = 0;
  tous.forEach(function (x) { if (x.ordre > dernier) dernier = x.ordre; });

  ajouterLigne(sh, [neuf, String(d.icone || ''), nom, formations.join('|'),
                    dernier + 1, '', String(d.par || '')]);
  return { status: 'ok', id: neuf };
}

function enregistrerGuide(d) {
  var sh = feuilleGuides();
  var groupe = String(d.groupe || '').trim();
  var titre = String(d.titre || '').trim();
  if (!groupe) return { status: 'error', message: 'Guide sans groupe.' };
  if (!titre) return { status: 'error', message: 'Donne un titre au guide.' };

  var blocs = blocsPropres(d.blocs);
  var json = JSON.stringify(blocs);
  /* ⚠️ UNE CELLULE SHEETS TIENT 50 000 CARACTÈRES. Coupée, la pile
     de blocs se relirait de travers — mieux vaut refuser que rendre
     un guide illisible sans le dire. */
  if (json.length > 45000) {
    return { status: 'error',
             message: 'Ce guide est trop long pour une cellule. ' +
                      'Coupe-le en deux guides.' };
  }

  var etat = (String(d.etat || '') === 'publie') ? 'publie' : 'brouillon';
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris',
                                        'dd/MM/yyyy HH:mm');

  var tous = listerGuides('', false);
  var id = String(d.id || '').trim();
  var existant = null;
  for (var i = 0; i < tous.length; i++) {
    if (tous[i].id === id) { existant = tous[i]; break; }
  }

  if (existant) {
    sh.getRange(existant.ligne, 2).setValue(groupe);
    sh.getRange(existant.ligne, 4).setValue(titre);
    sh.getRange(existant.ligne, 5).setValue(etat);
    var cel = sh.getRange(existant.ligne, 6);
    cel.setNumberFormat('@');
    cel.setValue(json);
    sh.getRange(existant.ligne, 8).setValue(maintenant);
    return { status: 'ok', id: existant.id };
  }

  var idsPris = tous.map(function (x) { return x.id; });
  /* ⚠️ L'IDENTIFIANT PROPOSÉ PAR L'ÉCRAN — v1036. C'est lui qui fait
     qu'un envoi rejoué retrouve sa ligne au lieu d'en créer une
     seconde. Voir idPropose. */
  var neuf = idPropose('gd', id, idsPris);
  var dernier = 0;
  tous.forEach(function (x) {
    if (x.groupe === groupe && x.ordre > dernier) dernier = x.ordre;
  });

  var ligne = sh.getLastRow() + 1;
  var plage = sh.getRange(ligne, 1, 1, 9);
  plage.setNumberFormat('@');
  plage.setValues([[neuf, groupe, dernier + 1, titre, etat, json,
                    maintenant, maintenant, String(d.par || '')]]);
  return { status: 'ok', id: neuf };
}

function supprimerGuide(d) {
  var sh = feuilleGuides();
  var tous = listerGuides('', false);
  var id = String(d.id || '').trim();
  for (var i = 0; i < tous.length; i++) {
    if (tous[i].id === id) { sh.deleteRow(tous[i].ligne); return { status: 'ok' }; }
  }
  return { status: 'ok' };
}

/* Le cliqué-glissé ne fait que réécrire des rangs. */
function ordonnerParcours(d) {
  var quoi = String(d.quoi || '');
  var ids = (d.ids && d.ids.join) ? d.ids : [];
  if (!ids.length) return { status: 'ok' };

  var sh = (quoi === 'groupes') ? feuilleGroupes() : feuilleGuides();
  var tous = (quoi === 'groupes') ? listerGroupes() : listerGuides('', false);
  var colonne = (quoi === 'groupes') ? 5 : 3;

  var parId = {};
  tous.forEach(function (x) { parId[x.id] = x; });

  for (var i = 0; i < ids.length; i++) {
    var x = parId[String(ids[i])];
    if (x) sh.getRange(x.ligne, colonne).setValue(i + 1);
  }
  return { status: 'ok' };
}


/* ============================================================
   CE QUE L'ÉLÈVE A LE DROIT DE VOIR — v1026

   La colonne G de « ElevesAcces » porte les modules ouverts,
   séparés par des virgules. Elle était lue à QUATRE endroits, et
   les quatre repliaient une cellule vide sur « proccorriger ».
   Autrement dit : même quand personne n'avait rien coché, le
   serveur rouvrait les procédures tout seul, quatre fois.

   David, le 17 septembre : « il ne faut pas que les accès soient
   ouverts de base, c'est nous qui ouvrons à la main ».

   ⚠️ MAIS UNE CELLULE VIDE, AUJOURD'HUI, VEUT DIRE « LES
   PROCÉDURES ». Des élèves en ont une. Retirer le repli d'un coup
   leur fermerait leur coin révisions du jour au lendemain, sans
   que personne l'ait demandé. On ne répare pas une porte en la
   claquant sur ceux qui sont déjà derrière.

   Alors le vide garde son ancien sens, et « fermé » S'ÉCRIT : un
   accès neuf naît avec « aucun » dans la cellule, et décocher la
   dernière case écrit « aucun » elle aussi. Le jour où plus aucune
   cellule n'est vide, ce repli pourra partir — pas avant.

   ⚠️ ET ON NE REPASSE JAMAIS UNE VALEUR DÉJÀ RÉSOLUE DANS
   modulesOuverts : « aucun » résolu donne une liste vide, et une
   liste vide relue redonnerait « proccorriger ». C'est pour ça que
   accesEleve porte modulesListe, un TABLEAU, à côté du texte.
   ============================================================ */
var MODULES_AUCUN = 'aucun';

/* ============================================================
   SON PROCHAIN COURS — v1026

   David : « il faudra aussi que son rappel de cours apparaisse
   sur l'espace élève ».

   Rien à créer : la feuille « EcranPlanning » porte déjà jour,
   élève, moniteur, heure, véhicule et lieu, et elle se remplit
   quand le bureau prépare un cours depuis la capture du planning.
   On la LIT, on n'y écrit rien.

   ⚠️ LA COLONNE « MASQUÉ » SERT DES DEUX CÔTÉS. Une ligne retirée
   de l'écran du bureau disparaît aussi de chez l'élève : deux
   façons de cacher un cours finiraient par ne pas dire la même
   chose.

   ⚠️ ET LA NOTE DE PRÉPARATION NE PART PAS. Elle est écrite par le
   moniteur pour le moniteur. L'élève reçoit la date, l'heure, le
   moniteur, le lieu et le véhicule. Rien d'autre.
   ============================================================ */
/* ⚠️ LE PROCHAIN COURS DE TOUT LE MONDE, EN UNE LECTURE — v1039.

   prochainCoursDeLEleve rouvre la feuille à chaque appel : c'est
   très bien pour UN élève, et c'est une catastrophe dans une boucle.
   Celle-ci lit EcranPlanning une fois et rend une table. */
function prochainsCoursParEleve() {
  var zone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  var aujourdhui = Utilities.formatDate(new Date(), zone, 'yyyy-MM-dd');
  var out = {};

  lignesEcranPlanning('').forEach(function (l) {
    if (l.masque || !l.jour || l.jour < aujourdhui) return;
    var cle = normaliser(l.eleve);
    if (!cle) return;
    var deja = out[cle];
    /* Le plus proche : la date d'abord, l'heure ensuite. */
    if (deja && (deja.jour < l.jour ||
        (deja.jour === l.jour &&
         String(deja.heure || '') <= String(l.heure || '')))) return;
    out[cle] = { jour: l.jour, heure: l.heure, moniteur: l.moniteur,
                 lieu: l.lieu, vehicule: l.vehicule };
  });
  return out;
}

function prochainCoursDeLEleve(nom) {
  var cle = normaliser(nom);
  var zone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  var aujourdhui = Utilities.formatDate(new Date(), zone, 'yyyy-MM-dd');

  var siens = lignesEcranPlanning('').filter(function (l) {
    return normaliser(l.eleve) === cle && !l.masque &&
           l.jour && l.jour >= aujourdhui;
  });
  if (!siens.length) return null;

  /* Le plus proche : la date d'abord, l'heure ensuite. Deux cours
     le même jour, ça arrive — un le matin, un l'après-midi. */
  siens.sort(function (a, b) {
    if (a.jour !== b.jour) return (a.jour < b.jour) ? -1 : 1;
    return String(a.heure || '').localeCompare(String(b.heure || ''));
  });

  var c = siens[0];
  return { jour: c.jour, heure: c.heure, moniteur: c.moniteur,
           lieu: c.lieu, vehicule: c.vehicule };
}


/* ============================================================
   L'HISTORIQUE DE SES LEÇONS — v1026

   David : « son historique de leçons », « en entier », « tout ».

   ⚠️ ET LA COLONNE G NE SORT JAMAIS. Une ligne de bilan fait onze
   colonnes ; la cinquième (E) est le compte rendu, celui qu'on lui
   envoie déjà par SMS après chaque cours — la lui remontrer
   n'expose rien de neuf. La SEPTIÈME (G) est la note interne : ce
   que le moniteur écrit pour le bureau.

   L'action qui liste les bilans côté bureau, bilansRecents, rend
   justement la colonne G. La réutiliser ici aurait été le chemin
   le plus court, et une fuite. Une porte du bureau ne s'élargit
   pas : on en creuse une plus étroite.

   ⚠️ LA GARDE EST DANS LA PLAGE, PAS DANS UN FILTRE. On lit
   A jusqu'à F — six colonnes. La septième n'est pas écartée après
   coup : elle n'est jamais lue. Un filtre s'oublie en refactorant,
   une plage qui s'arrête à six, non.
   ============================================================ */
function leconsDeLEleve(nom) {
  var sh = feuille();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  /* A..F, et pas une colonne de plus. Voir la note ci-dessus. */
  var lignes = sh.getRange(2, 1, derniere - 1, 6).getValues();
  var cle = normaliser(nom);
  var out = [];

  for (var i = lignes.length - 1; i >= 0; i--) {
    if (normaliser(lignes[i][3]) !== cle) continue;
    var texte = texteCellule(lignes[i][4], false);
    if (!texte) continue;               /* une ligne sans compte rendu n'apprend rien */
    out.push({
      date: texteCellule(lignes[i][0], false),
      moniteur: texteCellule(lignes[i][2], false),
      type: texteCellule(lignes[i][5], false),
      bilan: texte
    });
  }
  return out;
}

function modulesOuverts(cellule) {
  var t = String(cellule || '').trim();
  if (t === MODULES_AUCUN) return [];
  if (!t) return ['proccorriger'];          /* les lignes d'avant la v1026 */
  var out = [];
  t.split(',').forEach(function (x) {
    var c = String(x || '').trim();
    if (c && c !== MODULES_AUCUN && out.indexOf(c) === -1) out.push(c);
  });
  return out;
}

/* Ce qu'on ÉCRIT dans la cellule. ⚠️ Une liste vide s'écrit
   « aucun », jamais «  » : le vide se relirait en « procédures », et
   décocher la dernière case rouvrirait ce qu'on vient de fermer. */
function valeurModules(liste) {
  var t = (liste && liste.join) ? liste.join(',') : String(liste || '');
  var out = [];
  t.split(',').forEach(function (x) {
    var c = String(x || '').trim();
    if (c && c !== MODULES_AUCUN && out.indexOf(c) === -1) out.push(c);
  });
  return out.length ? out.join(',') : MODULES_AUCUN;
}

function accesEleve(nom) {
  var sh = feuilleElevesAcces();
  var derniere = sh.getLastRow();
  if (derniere < 2) return null;

  /* ⚠️ DIX COLONNES DEPUIS LA v1036 : la J porte ses groupes. Une
     plage trop courte ne se plaint pas — elle rend une case vide, et
     l'élève n'a plus de parcours sans que rien ne le dise. */
  var large = Math.max(9, Math.min(10, sh.getMaxColumns()));
  var lignes = sh.getRange(2, 1, derniere - 1, large).getValues();
  for (var i = 0; i < lignes.length; i++) {
    if (normaliser(lignes[i][0]) !== normaliser(nom)) continue;
    return {
      eleve: texteCellule(lignes[i][0], false),
      code: String(lignes[i][1] || ''),
      /* ⚠️ « actif » PORTE AUSSI LA SORTIE — v1038, étape 7.

         Toutes les portes de l'élève lisent déjà « ad.actif » : la
         connexion, ses récitations, son dossier, son parcours. Poser
         la règle ICI la pose donc aux six d'un coup. Ajouter un
         contrôle porte par porte, c'est la garantie d'en oublier
         une — et c'est exactement l'audit du 1er septembre, quatre
         contrôles pour deux cents actions. */
      actif: String(lignes[i][2] || 'oui') !== 'non' &&
             !sortiDeLEcole(lignes[i][0]),
      /* ⚠️ RÉSOLUE UNE FOIS, ICI. Le texte pour l'écran du bureau,
         le tableau pour les décisions du serveur — voir la note de
         modulesOuverts : repasser le texte dans la règle ferait
         mentir « aucun ». */
      modules: modulesOuverts(lignes[i][6]).join(','),
      modulesListe: modulesOuverts(lignes[i][6]),
      boite: String(lignes[i][7] || ''),
      /* Les procédures ouvertes en plus de sa formation, par ids :
         un renommage ne doit pas retirer un accès. */
      enPlus: idsProcedures(lignes[i][8]),
      /* Vide = français seulement. C'est le bureau qui ouvre une
         autre langue, élève par élève : chaque récitation traduite
         coûte un appel de plus. */
      langue: String(lignes[i][5] || ''),
      /* ⚠️ SES GROUPES DU PARCOURS — v1036. Vide veut dire AUCUN :
         rien n'est ouvert de base, c'est le bureau qui ouvre. */
      groupes: idsDesGroupes(lignes[i][9]),
      /* ⚠️ ET POURQUOI IL N'ENTRE PLUS, LE CAS ÉCHÉANT — v1038.
         Voir sortiDeLEcole : l'élève a son permis, ou il est parti.
         Ce n'est pas un accès refusé, c'est une formation finie. */
      sorti: sortiDeLEcole(lignes[i][0]),
      /* Ce qu'on sait de sa dernière venue, pour décider si son
         code a encore lieu d'être. Voir codePerime(). */
      creeLe: texteCellule(lignes[i][3], false),
      derniereVisite: texteCellule(lignes[i][4], false),
      ligne: i + 2
    };
  }
  return null;
}

/* Une liste d'ids de procédures, telle qu'elle est rangée dans une
   cellule : « m1|m4|m7 ». Tolère les espaces et les virgules, qu'on
   finit toujours par taper à la main un jour. */
function idsProcedures(valeur) {
  return String(valeur || '')
    .split(/[|,;\n]/)
    .map(function (x) { return String(x).trim(); })
    .filter(function (x) { return x; });
}

/* Les groupes du parcours ouverts à un élève : la même écriture, la
   même tolérance. Une cellule vide veut dire AUCUN — c'est le
   bureau qui ouvre, à la main. */
function idsDesGroupes(valeur) {
  return idsProcedures(valeur);
}

/* ============================================================
   CE QUE L'ÉLÈVE A VU — v1036, étape 4 du parcours

   David, le 17 septembre : « la coche est à l'élève ». On enregistre
   QUI, QUOI et QUAND.

   ⚠️ ÇA NE PROUVE PAS QU'IL A REGARDÉ, et un groupe Facebook ne le
   prouvait pas davantage. Ce que ça donne, c'est une progression
   qui ne ment pas sur ce qu'elle mesure : une case cochée, avec une
   date et un nom.
   ============================================================ */
function feuilleParcoursVu() {
  var f = classeur();
  var sh = f.getSheetByName('ParcoursVu');
  if (!sh) {
    sh = f.insertSheet('ParcoursVu', f.getNumSheets());
    ajouterLigne(sh, PARCOURSVU_COLONNES.slice());
    sh.setFrozenRows(1);
    return sh;
  }

  /* ============================================================
     ⚠️ TROIS COLONNES DE PLUS, POSÉES SANS RIEN DÉPLACER — v1056

     David : « une fois que c'est vu une fois c'est ok, j'ai juste
     besoin de l'information s'il l'a revu et quand ».

     Les quatre colonnes d'avant gardent leur PLACE et leur sens —
     Élève, Guide, Vu le, Décoché le. Les trois neuves s'ajoutent au
     bout. Insérer « Segment » au milieu, là où il se lit, aurait
     décalé « Vu le » et « Décoché le » : toutes les lignes déjà
     écrites auraient changé de sens d'un coup, sans un mot.

     ⚠️ ET « VU LE » CHANGE DE SENS, PAS DE COLONNE. Il portait la
     DERNIÈRE coche, écrasée à chaque fois ; il porte maintenant la
     PREMIÈRE, et ne bouge plus jamais. Les lignes d'avant ne
     mentent pas pour autant : une première fois inconnue vaut mieux
     que pas de date, et c'est bien une fois où il l'a vu.
     ============================================================ */
  if (sh.getLastColumn() < PARCOURSVU_COLONNES.length) {
    var manquantes = PARCOURSVU_COLONNES.slice(sh.getLastColumn());
    sh.getRange(1, sh.getLastColumn() + 1, 1, manquantes.length)
      .setValues([manquantes]);
  }
  return sh;
}

/* Les sept colonnes, nommées une fois. Leur ORDRE est la seule
   description qui existe : deux listes écrites séparément finissent
   par désigner deux choses différentes. */
var PARCOURSVU_COLONNES = ['Élève', 'Guide', 'Vu le', 'Décoché le',
                           'Segment', 'Revu le', 'Nb vues'];
var PVU_ELEVE = 0, PVU_GUIDE = 1, PVU_VU = 2, PVU_DECOCHE = 3,
    PVU_SEGMENT = 4, PVU_REVU = 5, PVU_VUES = 6;

/* ============================================================
   CE QU'UN ÉLÈVE A VU, SEGMENT PAR SEGMENT — v1056

   Rend, pour chaque guide, une fiche par segment :
   { vuLe, revuLe, vues }. La clé est l'identifiant du segment — et
   la chaîne vide est une clé comme une autre : c'est le guide
   entier, c'est-à-dire ce que valent toutes les lignes écrites
   avant cette version.

   ⚠️ DÉCOCHER NE SUPPRIME PAS LA LIGNE. Un élève qui décoche par
   erreur ne doit pas effacer la trace de ce qu'il avait fait : on
   note la date du retrait à côté, et la ligne raconte les deux.
   C'est la règle d'« écarter n'est pas supprimer ».
   ============================================================ */
function guidesVusPar(nom) {
  var sh = feuilleParcoursVu();
  var derniere = sh.getLastRow();
  if (derniere < 2) return {};

  var cle = normaliser(nom);
  var largeur = Math.max(sh.getLastColumn(), PARCOURSVU_COLONNES.length);
  var lignes = sh.getRange(2, 1, derniere - 1, largeur).getValues();
  var out = {};
  for (var i = 0; i < lignes.length; i++) {
    if (normaliser(lignes[i][PVU_ELEVE]) !== cle) continue;
    var g = String(lignes[i][PVU_GUIDE] || '');
    if (!g) continue;
    if (!out[g]) out[g] = {};
    var seg = String(lignes[i][PVU_SEGMENT] || '');
    out[g][seg] = String(lignes[i][PVU_DECOCHE] || '')
      ? null
      : { vuLe: texteCellule(lignes[i][PVU_VU], true),
          revuLe: texteCellule(lignes[i][PVU_REVU], true),
          vues: Number(lignes[i][PVU_VUES]) || 1 };
  }
  return out;
}

/* ⚠️ UN GUIDE EST VU QUAND TOUS SES SEGMENTS LE SONT — v1056.

   Et la ligne du guide entier, celle dont le segment est vide,
   continue de valoir : c'est ce qu'ont tous les élèves d'avant, et
   un guide qu'on découpe après coup ne doit pas les faire repartir
   de zéro. Rend la date de la dernière pièce vue, pour que l'écran
   puisse dire « vu le … » comme avant.

   ⚠️ ET UN GUIDE SANS SEGMENT CONNU N'EST PAS UN GUIDE VU. Zéro
   segment vu sur zéro segment attendu répondrait « oui » à une
   question qu'on n'a pas posée. */
function guideVuLe(segments, fiches) {
  var f = fiches || {};
  /* La coche du guide entier passe devant : elle dit « tout est
     vu », et c'est la seule chose qu'un élève d'avant ait posée. */
  if (f[''] && f[''].vuLe) return f[''].vuLe;

  var segs = segments || [];
  if (!segs.length) return '';

  var dernier = '';
  for (var i = 0; i < segs.length; i++) {
    var fi = f[segs[i].id];
    if (!fi || !fi.vuLe) return '';
    if (!dernier || jourEtHeureComparables(fi.vuLe) >
                    jourEtHeureComparables(dernier)) dernier = fi.vuLe;
  }
  return dernier;
}

/* « 18/09/2026 20:14 » → « 2026-09-18 20:14 », pour comparer deux
   dates sans les convertir en objets. La règle de jourComparable,
   avec l'heure derrière. */
function jourEtHeureComparables(texte) {
  var t = String(texte || '');
  var m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}:\d{2}))?/);
  if (!m) return '';
  return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) +
         ' ' + (m[4] || '00:00');
}

/* ============================================================
   NOTER QU'UN SEGMENT A ÉTÉ VU — v1056

   David : « une fois que c'est vu une fois c'est ok, j'ai juste
   besoin de l'information s'il l'a revu et quand ».

   Trois colonnes répondent à ça : la PREMIÈRE fois, la DERNIÈRE, et
   combien. Je n'écris pas un journal ligne par ligne — avec cent
   élèves et cinquante segments, il ferait des dizaines de milliers
   de lignes pour une question qui tient en trois nombres.

   ⚠️ ET « VU LE » NE SE RÉÉCRIT PLUS. C'était la dernière coche,
   écrasée à chaque passage : on ne pouvait donc pas savoir quand il
   l'avait découvert. La première fois se pose une fois, et plus
   jamais.
   ============================================================ */
function noterGuideVu(d) {
  var nom = String(d.eleve || '').trim();
  var guide = String(d.guide || '').trim();
  if (!nom || !guide) return { status: 'error', message: 'Coche incomplète.' };

  var segment = String(d.segment || '').trim();
  var vu = (String(d.vu || 'oui') !== 'non');
  var sh = feuilleParcoursVu();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris',
                                        'dd/MM/yyyy HH:mm');
  var derniere = sh.getLastRow();
  var largeur = Math.max(sh.getLastColumn(), PARCOURSVU_COLONNES.length);
  var lignes = (derniere < 2) ? []
    : sh.getRange(2, 1, derniere - 1, largeur).getValues();
  var cle = normaliser(nom);

  for (var i = 0; i < lignes.length; i++) {
    if (normaliser(lignes[i][PVU_ELEVE]) !== cle) continue;
    if (String(lignes[i][PVU_GUIDE] || '') !== guide) continue;
    if (String(lignes[i][PVU_SEGMENT] || '') !== segment) continue;

    /* La ligne existe : on la corrige, on n'en sème pas une seconde
       — revoir un segment est le geste le plus banal qui soit. */
    if (!vu) {
      sh.getRange(i + 2, PVU_DECOCHE + 1).setValue(maintenant);
      return { status: 'ok', vu: false, quand: '' };
    }

    var etaitDecoche = !!String(lignes[i][PVU_DECOCHE] || '');
    var premiere = texteCellule(lignes[i][PVU_VU], true);
    var vues = (Number(lignes[i][PVU_VUES]) || 1) + 1;

    sh.getRange(i + 2, PVU_DECOCHE + 1).setValue('');
    /* ⚠️ LA PREMIÈRE FOIS NE BOUGE PLUS — sauf si elle n'a jamais
       été écrite, ce qui arrive sur une ligne décochée puis reprise
       et sur les lignes d'avant la v1056 dont la case serait vide. */
    if (!premiere) sh.getRange(i + 2, PVU_VU + 1).setValue(maintenant);
    else sh.getRange(i + 2, PVU_REVU + 1).setValue(maintenant);
    sh.getRange(i + 2, PVU_VUES + 1).setValue(etaitDecoche ? vues : vues);

    return { status: 'ok', vu: true,
             quand: premiere || maintenant,
             revu: premiere ? maintenant : '', vues: vues };
  }

  if (!vu) return { status: 'ok', vu: false, quand: '' };

  var ligne = [];
  ligne[PVU_ELEVE] = nom;
  ligne[PVU_GUIDE] = guide;
  ligne[PVU_VU] = maintenant;
  ligne[PVU_DECOCHE] = '';
  ligne[PVU_SEGMENT] = segment;
  ligne[PVU_REVU] = '';
  ligne[PVU_VUES] = 1;
  ajouterLigne(sh, ligne);
  return { status: 'ok', vu: true, quand: maintenant, revu: '', vues: 1 };
}

/* ============================================================
   📣 LES ANNONCES — v1038, étape 6

   David, le 17 septembre : le groupe généraliste, c'est « un groupe
   dans lequel on met des informations ». Il n'a pas de guides, il a
   des annonces.

   ⚠️ UNE ANNONCE N'EST PAS UN MESSAGE. Elle s'affiche, elle ne se
   répond pas. Si l'élève veut répondre, c'est Messenger, comme
   aujourd'hui — une messagerie est un autre chantier, et il ne l'a
   pas demandé.

   ⚠️ ET UNE ANNONCE SANS FIN DEVIENT UN DÉCOR. Au bout de trois
   semaines plus personne ne la lit, et la suivante non plus. « Le
   bureau sera fermé le 27 » n'a rien à faire à l'écran le 28 : la
   date de retrait se pose en même temps que le texte.

   Colonnes : Id, Texte, Pour, Publié le, Par, Retirer le, Retiré le.
   « Pour » vaut « tous », ou la liste des noms séparés par « | ».
   ============================================================ */
var ANNONCE_POUR_TOUS = 'tous';

function feuilleAnnonces() {
  var f = classeur();
  var sh = f.getSheetByName('Annonces');
  if (!sh) {
    sh = f.insertSheet('Annonces', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Texte', 'Pour', 'Publié le', 'Par',
                      'Retirer le', 'Retiré le']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function lignesDesAnnonces() {
  var sh = feuilleAnnonces();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];
  var v = sh.getRange(2, 1, derniere - 1, 7).getValues();
  var out = [];
  for (var i = 0; i < v.length; i++) {
    if (!v[i][0]) continue;
    var pour = String(v[i][2] || ANNONCE_POUR_TOUS).trim();
    out.push({
      id: String(v[i][0]),
      texte: texteCellule(v[i][1], false),
      pour: pour,
      tous: (pour === ANNONCE_POUR_TOUS),
      noms: (pour === ANNONCE_POUR_TOUS) ? [] : idsProcedures(pour),
      publieLe: texteCellule(v[i][3], true),
      par: texteCellule(v[i][4], false),
      retirerLe: jourDeCellule(v[i][5]) || '',
      retireLe: texteCellule(v[i][6], false),
      ligne: i + 2
    });
  }
  out.reverse();                 /* la plus récente d'abord */
  return out;
}

/* ⚠️ RETIRÉE N'EST PAS EFFACÉE. Une annonce passée garde sa ligne :
   savoir ce qu'on a dit, et quand, vaut mieux qu'une feuille propre.
   C'est l'écran qui ne la montre plus. */
function annonceEnCours(a, aujourdhui) {
  if (a.retireLe) return false;
  if (a.retirerLe && a.retirerLe < aujourdhui) return false;
  return true;
}

function annoncesDeLEleve(nom) {
  var cle = normaliser(nom);
  var zone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  var auj = Utilities.formatDate(new Date(), zone, 'yyyy-MM-dd');

  return lignesDesAnnonces().filter(function (a) {
    if (!annonceEnCours(a, auj)) return false;
    if (a.tous) return true;
    for (var i = 0; i < a.noms.length; i++) {
      if (normaliser(a.noms[i]) === cle) return true;
    }
    return false;
  }).map(function (a) {
    /* ⚠️ L'ÉLÈVE NE REÇOIT PAS LA LISTE DES DESTINATAIRES. « pour »
       porte les noms des autres : l'envoyer serait un carnet
       d'adresses distribué à deux cents personnes. Il apprend
       seulement si c'est pour lui seul. */
    return { id: a.id, texte: a.texte, publieLe: a.publieLe,
             par: a.par, pourLui: !a.tous };
  });
}

function enregistrerAnnonce(d) {
  var texte = String(d.texte || '').trim();
  if (!texte) return { status: 'error', message: 'Écris le texte de l\'annonce.' };
  if (texte.length > 4000) {
    return { status: 'error', message: 'Annonce trop longue (4000 caractères).' };
  }

  var tous = (String(d.pour || '') === ANNONCE_POUR_TOUS);
  var noms = tous ? [] : idsProcedures(
    Array.isArray(d.noms) ? d.noms.join('|') : d.noms);
  if (!tous && !noms.length) {
    return { status: 'error', message: 'Choisis au moins un élève.' };
  }

  var sh = feuilleAnnonces();
  var toutes = lignesDesAnnonces();
  var id = String(d.id || '').trim();
  var existante = null;
  for (var i = 0; i < toutes.length; i++) {
    if (toutes[i].id === id) { existante = toutes[i]; break; }
  }

  var pour = tous ? ANNONCE_POUR_TOUS : noms.join('|');
  var retirer = String(d.retirerLe || '').trim();

  if (existante) {
    sh.getRange(existante.ligne, 2).setValue(texte);
    sh.getRange(existante.ligne, 3).setValue(pour);
    sh.getRange(existante.ligne, 6).setValue(retirer);
    return { status: 'ok', id: existante.id, pour: tous ? 0 : noms.length };
  }

  /* ⚠️ L'IDENTIFIANT VIENT DE L'ÉCRAN — même règle que les guides :
     l'envoi réessaie tout seul au bout de douze secondes, et une
     annonce publiée deux fois s'affiche deux fois. Voir idPropose. */
  var neuf = idPropose('an', id, toutes.map(function (x) { return x.id; }));
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris',
                                        'dd/MM/yyyy HH:mm');
  ajouterLigne(sh, [neuf, texte, pour, maintenant, String(d.par || ''),
                    retirer, '']);
  return { status: 'ok', id: neuf, pour: tous ? 0 : noms.length };
}

/* Retirer une annonce de l'écran, sans effacer ce qu'on a dit. */
function retirerAnnonce(d) {
  var sh = feuilleAnnonces();
  var toutes = lignesDesAnnonces();
  var id = String(d.id || '').trim();
  for (var i = 0; i < toutes.length; i++) {
    if (toutes[i].id !== id) continue;
    var quand = (String(d.remettre || '') === 'oui') ? ''
      : Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');
    sh.getRange(toutes[i].ligne, 7).setValue(quand);
    return { status: 'ok', id: id, retire: !!quand };
  }
  return { status: 'error', message: 'Annonce introuvable.' };
}

/* Ce que l'écran du bureau demande : les annonces, et de quoi
   choisir à qui. ⚠️ Les élèves viennent d'ici, avec leur formation
   et leur site — le sélecteur ne doit pas aller les chercher
   ailleurs, sinon il filtrerait sur autre chose que le répertoire. */
/* ⚠️ UNE FICHE QUE LE RÉPERTOIRE A CONDAMNÉE — v1040.

   David : « old ne pas utiliser ». La colonne « formation » sert
   aussi à marquer les fiches mortes : « NE PAS UTILISER OLD ». Elles
   arrivaient dans la liste des annonces comme les autres, et leurs
   mots devenaient des boutons de filtre.

   On lit la MARQUE, pas un libellé exact : le jour où quelqu'un
   écrit « ne pas utiliser (old) », la règle tient encore. */
function formationMorte(texte) {
  var t = String(texte || '').toLowerCase()
    .replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e')
    .replace(/[\s ]+/g, ' ').trim();
  if (t.indexOf('ne pas utiliser') !== -1) return true;
  return /(^|[^a-z])old([^a-z]|$)/.test(t);
}

function ecranDesAnnonces() {
  var zone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  var auj = Utilities.formatDate(new Date(), zone, 'yyyy-MM-dd');
  var toutes = lignesDesAnnonces();

  var sh = feuilleEleves();
  var nb = sh.getLastRow();
  var lignes = (nb < 2) ? [] : sh.getRange(2, 1, nb - 1, COL_ELEVE_PARTI_LE)
                                 .getValues();
  var eleves = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    var nom = texteCellule(lignes[i][0], false);
    /* ⚠️ UN ÉLÈVE SORTI NE SE PROPOSE PLUS. Lui publier une annonce
       qu'il ne pourra jamais lire, c'est se croire prévenant. */
    if (sortiDeLEcole(nom)) continue;
    var form = texteCellule(lignes[i][3], false);
    /* ⚠️ ET UNE FICHE MORTE NON PLUS — v1040. */
    if (formationMorte(form)) continue;
    eleves.push({
      eleve: nom,
      formation: form
    });
  }
  eleves.sort(function (a, b) {
    return String(a.eleve).localeCompare(String(b.eleve), 'fr');
  });

  return {
    annonces: toutes.map(function (a) {
      return { id: a.id, texte: a.texte, tous: a.tous, noms: a.noms,
               publieLe: a.publieLe, par: a.par, retirerLe: a.retirerLe,
               retireLe: a.retireLe, enCours: annonceEnCours(a, auj) };
    }),
    eleves: eleves
  };
}


/* ============================================================
   IL A FINI, OU IL EST PARTI — v1038, étape 7

   David : « c'est quand permis obtenu ET départ de l'auto-école
   aussi qu'il faut lui enlever les accès ».

   ⚠️ DEUX FINS, UNE SEULE PORTE. Le permis se lit dans les
   Résultats, le départ sur sa fiche. Les deux ferment son espace, et
   la règle se pose à UN endroit — accesEleve — que les six portes de
   l'élève traversent déjà.

   ⚠️ ÇA FERME, ÇA N'EFFACE PAS. Sa progression, ses récitations et
   son dossier restent : c'est la suppression RGPD qui les efface,
   plus tard, et c'est le bureau qui appuie. Rouvrir est un geste,
   pas une restauration.

   Rend « permis », « parti » ou « » — l'écran du bureau dit LEQUEL,
   parce qu'un accès fermé sans raison se retrouve rouvert à la main
   au premier appel de l'élève.

   ⚠️ ET ON LIT LE CLASSEUR AU PLUS DEUX FOIS PAR APPEL. accesEleve
   est traversée à chaque action de l'élève ; deux lectures de
   feuille à chaque fois, c'est l'espace élève qui rame. On garde
   donc les deux tables le temps de la requête.
   ============================================================ */
var _permisPourSortie = null;
var _partisPourSortie = null;

function partisDeLEcole() {
  if (_partisPourSortie) return _partisPourSortie;
  var out = {};
  try {
    var sh = feuilleEleves();
    var nb = sh.getLastRow();
    if (nb >= 2) {
      var v = sh.getRange(2, 1, nb - 1, COL_ELEVE_PARTI_LE).getValues();
      for (var i = 0; i < v.length; i++) {
        if (!v[i][0]) continue;
        var quand = String(v[i][COL_ELEVE_PARTI_LE - 1] || '').trim();
        if (quand) out[normaliser(v[i][0])] = quand;
      }
    }
  } catch (e) { /* pas de répertoire : personne n'est parti */ }
  _partisPourSortie = out;
  return out;
}

function sortiDeLEcole(nom) {
  var cle = normaliser(nom);
  if (!cle) return '';
  if (partisDeLEcole()[cle]) return 'parti';
  if (!_permisPourSortie) {
    try { _permisPourSortie = permisObtenuParEleve(); }
    catch (e) { _permisPourSortie = {}; }
  }
  return _permisPourSortie[cle] ? 'permis' : '';
}

/* Poser ou retirer la date de départ. ⚠️ Retirer est un geste à
   part : un élève qui revient n'est pas un élève qui n'est jamais
   parti, et le bureau doit le faire exprès. */
function noterDepartEleve(d) {
  var nom = String(d.eleve || '').trim();
  if (!nom) return { status: 'error', message: 'Élève manquant.' };

  var sh = feuilleEleves();
  var nb = sh.getLastRow();
  if (nb < 2) return { status: 'error', message: 'Élève introuvable.' };

  var cle = normaliser(nom);
  var v = sh.getRange(2, 1, nb - 1, 1).getValues();
  for (var i = 0; i < v.length; i++) {
    if (normaliser(v[i][0]) !== cle) continue;
    var parti = (String(d.parti || 'oui') !== 'non');
    var quand = parti
      ? Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy') : '';
    sh.getRange(i + 2, COL_ELEVE_PARTI_LE).setValue(quand);
    /* Le souvenir de la requête ne vaut plus rien. */
    _partisPourSortie = null;
    return { status: 'ok', eleve: nom, parti: parti, quand: quand };
  }
  return { status: 'error', message: 'Élève introuvable.' };
}


/* ============================================================
   QUI AVANCE, ET QUI ARRIVE SANS RIEN AVOIR VU — v1037, étape 5

   David : « tu vois qui avance, qui arrive au cours sans rien avoir
   vu, et tu ouvres ou fermes sans quitter la fiche ».

   ⚠️ LE SECOND EST LE SEUL QUI COMPTE VRAIMENT. « 3 sur 6 » ne dit
   rien tout seul : c'est « il a cours jeudi et il n'a rien regardé »
   qui fait décrocher le téléphone. L'écran range donc par URGENCE,
   pas par nom — le nom, on le cherche en regardant.

   ⚠️ ET ON NE RELIT PAS LE PARCOURS ÉLÈVE PAR ÉLÈVE. Deux cents
   élèves feraient deux cents lectures du classeur. On lit les quatre
   feuilles UNE FOIS, et on croise en mémoire.
   ============================================================ */
function suiviDuParcours() {
  var groupes = listerGroupes();
  /* ⚠️ AVEC LES BLOCS, DEPUIS LA v1056. C'est le découpage en
     segments qu'on vient chercher, et il vit dans les blocs. Sans
     eux, segmentsDuGuide ne verrait aucun titre et rendrait un
     segment unique pour chaque guide : l'écran aurait affiché « 1 sur
     1 » partout, avec l'air d'avoir compté. Une lecture de plus, une
     seule fois pour tout le monde — c'est la règle de ce catalogue. */
  var guides = listerGuides('', true);
  var acces = listerAccesEleves();

  /* Ce que chacun a vu, en une seule lecture. */
  var vus = {};
  var shV = feuilleParcoursVu();
  var derV = shV.getLastRow();
  if (derV >= 2) {
    /* ⚠️ SEPT COLONNES, ET UNE FICHE PAR SEGMENT — v1056. Cette
       lecture ne prenait que les quatre premières : les trois neuves
       seraient restées invisibles au bureau, c'est-à-dire là où
       David les a demandées. */
    var largeurV = Math.max(shV.getLastColumn(), PARCOURSVU_COLONNES.length);
    var lv = shV.getRange(2, 1, derV - 1, largeurV).getValues();
    for (var i = 0; i < lv.length; i++) {
      var qui = normaliser(lv[i][PVU_ELEVE]);
      var quoi = String(lv[i][PVU_GUIDE] || '');
      if (!qui || !quoi) continue;
      if (String(lv[i][PVU_DECOCHE] || '')) continue;   /* décoché : ne compte pas */
      if (!vus[qui]) vus[qui] = {};
      if (!vus[qui][quoi]) vus[qui][quoi] = {};
      vus[qui][quoi][String(lv[i][PVU_SEGMENT] || '')] = {
        vuLe: texteCellule(lv[i][PVU_VU], true),
        revuLe: texteCellule(lv[i][PVU_REVU], true),
        vues: Number(lv[i][PVU_VUES]) || 1
      };
    }
  }

  /* Les guides publiés de chaque groupe ouvert. */
  var ouverts = {};
  groupes.forEach(function (g) { if (!g.fermeLe) ouverts[g.id] = g; });

  var parGroupe = {};
  /* ⚠️ LE CATALOGUE PART UNE FOIS, PAS UNE FOIS PAR ÉLÈVE — v1040.

     David : « dans parcours des élèves je n'ai pas le détail de ce
     que l'élève a vu ». Le détail tient dans la lecture qu'on fait
     déjà : on a la liste des guides et on a ParcoursVu. Mais recopier
     le titre de chaque guide chez chacun des deux cents élèves, ce
     serait envoyer vingt fois le même mot — le titre voyage ici, une
     seule fois, et chaque élève ne porte que des identifiants. */
  var catalogue = {};
  guides.forEach(function (x) {
    if (x.etat !== 'publie') return;
    if (!ouverts[x.groupe]) return;
    if (!parGroupe[x.groupe]) parGroupe[x.groupe] = [];
    parGroupe[x.groupe].push(x.id);
    /* ⚠️ LES SEGMENTS VOYAGENT AVEC LE CATALOGUE — v1056, et une
       seule fois pour tout le monde. Les recopier chez chacun des
       deux cents élèves enverrait vingt fois les mêmes mots ; c'est
       la règle que ce catalogue existe pour tenir. */
    catalogue[x.id] = {
      segments: segmentsDuGuide(x.blocs || [], x.titre).map(function (sg) {
        return { id: sg.id, titre: sg.titre };
      }),
      titre: x.titre,
      groupe: x.groupe,
      groupeNom: ouverts[x.groupe].nom,
      groupeIcone: ouverts[x.groupe].icone
    };
  });

  /* ⚠️ LE PLANNING, LU UNE SEULE FOIS — corrigé en v1039.

     prochainCoursDeLEleve() rouvre EcranPlanning à CHAQUE appel. Il
     était appelé dans la boucle : deux cents élèves faisaient deux
     cents lectures de la même feuille. L'écran mettait une minute,
     puis l'envoi abandonnait au bout de douze secondes — et David
     voyait « Lecture impossible » sur un écran qui marchait.

     C'est exactement ce que le commentaire d'en-tête promettait
     d'éviter, et que le code ne faisait pas. */
  var prochains = prochainsCoursParEleve();

  var out = [];
  acces.forEach(function (a) {
    /* Le module fermé : il n'a pas de parcours, et ce n'est pas un
       retard — c'est une porte qu'on n'a pas ouverte. */
    var ouvertChezLui = String(a.modules || '').split(',')
      .map(function (x) { return x.trim(); }).indexOf('parcours') !== -1;
    var siens = (a.groupes || []).filter(function (id) { return ouverts[id]; });
    if (!ouvertChezLui && !siens.length) return;

    var attendus = [];
    siens.forEach(function (id) {
      (parGroupe[id] || []).forEach(function (gd) { attendus.push(gd); });
    });

    var lesSiens = vus[normaliser(a.eleve)] || {};

    /* ============================================================
       ⚠️ ON COMPTE DES SEGMENTS, PLUS DES GUIDES — v1056

       David : « 5 segments sur 7 ». Un guide découpé en six segments
       dont il en a vu cinq n'est pas « 0 sur 1 » : c'est cinq
       sixièmes du travail, et c'est ce chiffre-là qui dit s'il faut
       décrocher le téléphone avant son cours de jeudi.

       ⚠️ ET LA COCHE DU GUIDE ENTIER VAUT POUR TOUS SES SEGMENTS.
       C'est ce que les élèves d'avant ont posé ; découper un guide
       ne doit pas les faire repartir de zéro. */
    var totalSeg = 0, faitsSeg = 0;
    attendus.forEach(function (gd) {
      var segs = (catalogue[gd] && catalogue[gd].segments) || [];
      var fiches = lesSiens[gd] || {};
      var toutLeGuide = !!(fiches[''] && fiches[''].vuLe);
      if (!segs.length) { totalSeg++; if (toutLeGuide) faitsSeg++; return; }
      segs.forEach(function (sg) {
        totalSeg++;
        if (toutLeGuide || (fiches[sg.id] && fiches[sg.id].vuLe)) faitsSeg++;
      });
    });

    var faits = attendus.filter(function (gd) {
      var segs = (catalogue[gd] && catalogue[gd].segments) || [];
      return !!guideVuLe(segs, lesSiens[gd] || {});
    });

    var prochain = prochains[normaliser(a.eleve)] || null;

    out.push({
      eleve: a.eleve,
      /* ⚠️ « ouvert » DIT SI L'INTERRUPTEUR EST MIS. Un élève à qui
         l'on a coché des groupes sans ouvrir le module ne voit
         RIEN : c'est le cas le plus silencieux, et celui qu'on veut
         voir en premier. */
      ouvert: ouvertChezLui,
      groupes: siens.length,
      total: attendus.length,
      faits: faits.length,
      reste: attendus.length - faits.length,
      /* Le compte qui parle : des segments, pas des guides — v1056 */
      segmentsTotal: totalSeg,
      segmentsFaits: faitsSeg,
      segmentsReste: totalSeg - faitsSeg,
      prochain: (prochain && prochain.jour) ? prochain.jour : '',
      prochainHeure: (prochain && prochain.heure) ? prochain.heure : '',
      /* ⚠️ LE DÉTAIL, EN IDENTIFIANTS SEULEMENT — v1040. « liste »
         est ce qu'on attend de lui, dans l'ordre ; « vus » ne porte
         que les dates. Les titres sont dans le catalogue. */
      liste: attendus,
      /* ⚠️ ET « vus » PORTE MAINTENANT UNE FICHE PAR SEGMENT — v1056 :
         { vuLe, revuLe, vues }. La clé vide est le guide entier,
         c'est-à-dire ce que valent les lignes d'avant cette
         version. C'est de là que sort la colonne « Revu » de
         l'écran : « 3 fois · le 19/09 à 08:02 ». */
      vus: (function () {
        var d = {};
        attendus.forEach(function (gd) {
          if (lesSiens[gd]) d[gd] = lesSiens[gd];
        });
        return d;
      })()
    });
  });

  return { lignes: out, guides: catalogue };
}


/* ============================================================
   SON PARCOURS — v1036, étape 4

   ⚠️ CE QUI SORT D'ICI EST CE QU'UN ÉLÈVE PEUT VOIR, ET RIEN DE
   PLUS. Pas les groupes fermés, pas les guides en brouillon, pas les
   groupes qu'on ne lui a pas ouverts. Le tri se fait ICI, dans le
   classeur : un tri fait à l'écran est un tri qu'on contourne en
   ouvrant les outils du navigateur.

   ⚠️ UNE SEULE ÉTAPE OUVERTE À LA FOIS. Les suivantes arrivent
   fermées — c'est ce que faisait déjà un groupe Facebook où l'on
   ajoute l'élève au fur et à mesure, sans l'ajouter à la main. La
   décision est prise ici aussi : l'écran ne fait que la montrer.
   ============================================================ */
/* ============================================================
   DÉCOUPER UN GUIDE EN SEGMENTS — v1056, ET UNE SEULE FOIS

   David, le 19 septembre : « l'élève ne valide pas un guide complet,
   c'est segment par segment ».

   Un segment, c'est un bloc « titre » et tout ce qui le suit jusqu'au
   titre suivant. La règle tient en dix lignes — et c'est justement
   pour ça qu'elle ne doit exister QU'ICI. Écrite une fois dans
   l'espace élève et une fois dans l'écran du bureau, elle aurait fini
   par ne plus compter pareil des deux côtés, et personne n'aurait su
   lequel des deux chiffres croire.

   ⚠️ ET ON RENVOIE DES BORNES, PAS DES COPIES. Un segment dit « du
   bloc 3 au bloc 7 » plutôt que de recopier les blocs : la réponse ne
   double pas de taille — un guide porte des vidéos et des images — et
   surtout, le relais continue de signer « etape.blocs » comme il l'a
   toujours fait. Une réponse qui déplace les blocs obligerait à
   déployer le classeur et Cloudflare dans la même minute, sans quoi
   les élèves verraient des cadres vides entre les deux.

   ⚠️ ET UN GUIDE SANS AUCUN TITRE RESTE UN SEGMENT. Il porte le titre
   du guide — exactement ce qu'il affiche aujourd'hui. Les guides déjà
   écrits n'ont donc rien à reprendre.

   ⚠️ ET CE QUI PRÉCÈDE LE PREMIER TITRE N'EST PAS PERDU. Un guide qui
   commence par deux paragraphes puis coupe garde ces paragraphes dans
   un segment d'ouverture, au nom du guide. Les jeter serait effacer
   du contenu déjà publié parce qu'on a ajouté un titre en dessous.
   ============================================================ */
function segmentsDuGuide(blocs, titreDuGuide) {
  var liste = blocs || [];
  var nomGuide = String(titreDuGuide || '').trim() || 'Le guide';
  var out = [];

  for (var i = 0; i < liste.length; i++) {
    var b = liste[i] || {};
    if (String(b.type || '') !== 'titre') continue;
    if (out.length) out[out.length - 1].a = i - 1;
    out.push({
      id: String(b.id || ''),
      titre: String(b.titre || '').trim() || 'Segment sans nom',
      de: i + 1,
      a: liste.length - 1
    });
  }

  if (!out.length) {
    /* ⚠️ SON IDENTIFIANT EST VIDE, ET C'EST VOULU. Une ligne de
       « ParcoursVu » sans segment vaut pour le guide entier : c'est
       ce que valent toutes les lignes écrites avant cette version,
       et c'est ce que vaut un guide qu'on n'a pas découpé. Les deux
       se rejoignent d'elles-mêmes. */
    return [{ id: '', titre: nomGuide, de: 0, a: liste.length - 1 }];
  }

  if (out[0].de > 1) {
    out.unshift({ id: '', titre: nomGuide, de: 0, a: out[0].de - 2 });
  }

  /* Un titre en dernière position n'ouvre rien : on ne montre pas un
     segment vide, on le laisse tomber. */
  return out.filter(function (x) { return x.a >= x.de; });
}

function parcoursDeLEleve(nom) {
  var ad = accesEleve(nom);
  if (!ad) return { groupes: [], etapes: [], avant: null };

  var siens = ad.groupes || [];
  if (!siens.length) return { groupes: [], etapes: [], avant: null };

  var ouverts = listerGroupes().filter(function (g) {
    /* Un groupe fermé disparaît de chez les élèves — ses guides et
       ce qu'ils ont vu restent au classeur. */
    return !g.fermeLe && siens.indexOf(g.id) !== -1;
  });
  if (!ouverts.length) return { groupes: [], etapes: [], avant: null };

  var vus = guidesVusPar(nom);
  var tous = listerGuides('', true);
  var etapes = [];

  ouverts.forEach(function (g) {
    tous.filter(function (x) {
      return x.groupe === g.id && x.etat === 'publie';
    }).forEach(function (x) {
      /* ⚠️ « vus » NE REND PLUS UNE DATE MAIS UNE FICHE PAR SEGMENT
         — v1056. Le guide entier reste connu : c'est la ligne dont
         le segment est vide, celle que les élèves d'avant ont déjà. */
      var segs = segmentsDuGuide(x.blocs || [], x.titre);
      var vusIci = vus[x.id] || {};
      etapes.push({
        id: x.id,
        groupe: g.id,
        groupeNom: g.nom,
        groupeIcone: g.icone,
        titre: x.titre,
        blocs: x.blocs || [],
        segments: segs.map(function (sg) {
          var f = vusIci[sg.id] || null;
          return { id: sg.id, titre: sg.titre, de: sg.de, a: sg.a,
                   vuLe: (f && f.vuLe) || '',
                   revuLe: (f && f.revuLe) || '',
                   vues: (f && f.vues) || 0 };
        }),
        /* Le guide compte pour vu quand TOUS ses segments le sont :
           c'est la même question, posée d'un cran au-dessus. */
        vuLe: guideVuLe(segs, vusIci)
      });
    });
  });

  /* ⚠️ L'ÉCHÉANCE VIENT DE SON PROCHAIN COURS PRÉPARÉ. C'est elle
     qui remplace « sinon tu seras renvoyé du cours » : une date
     qu'il connaît déjà, pas une menace. */
  var prochain = null;
  try { prochain = prochainCoursDeLEleve(nom); } catch (e) { prochain = null; }

  return {
    etapes: etapes,
    faits: etapes.filter(function (e) { return !!e.vuLe; }).length,
    avant: (prochain && prochain.jour) ? prochain.jour : null
  };
}

function listerAccesEleves() {
  var sh = feuilleElevesAcces();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  /* ⚠️ DIX COLONNES DEPUIS LA v1036 : la J porte ses groupes. Une
     plage trop courte ne se plaint pas — elle rend des cases vides,
     et l'onglet 🔑 montrerait tous les groupes décochés alors qu'ils
     sont ouverts. */
  var large = Math.max(9, Math.min(10, sh.getMaxColumns()));
  var lignes = sh.getRange(2, 1, derniere - 1, large).getValues();

  /* La formation de chacun, lue EN UNE FOIS. boiteDeLEleve() rouvre
     la feuille des élèves à chaque appel : trente élèves auraient
     fait trente lectures, et l'écran aurait ramé pour rien. */
  var formations = formationsParEleve();

  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    var nom = texteCellule(lignes[i][0], false);
    var declaree = String(lignes[i][7] || '');
    out.push({
      eleve: nom,
      /* PAS LE CODE. Voir accesEleveCode : il se demande un par
         un, pour l'élève qu'on veut prévenir. Cette liste rendait
         les codes de tous les espaces élèves en clair. */
      aUnCode: !!String(lignes[i][1] || '').trim(),
      actif: String(lignes[i][2] || 'oui') !== 'non',
      /* Un code d'un an sans usage ne vaut plus rien : le bureau
         doit le voir dans la liste, pas le découvrir quand l'élève
         appelle. Voir codePerime(). */
      perime: codePerime({ derniereVisite: texteCellule(lignes[i][4], false),
                           creeLe: texteCellule(lignes[i][3], false) }),
      derniereVisite: texteCellule(lignes[i][4], false),
      langue: String(lignes[i][5] || ''),
      modules: modulesOuverts(lignes[i][6]).join(','),
      /* Ce que le bureau a noté dans le répertoire ; à défaut, ce
         que l'élève a déclaré lui-même en arrivant. */
      boite: formations[normaliser(nom)] || declaree,
      boiteSource: formations[normaliser(nom)] ? 'formation'
                 : (declaree ? 'declaree' : ''),
      enPlus: idsProcedures(lignes[i][8]),
      /* Ses groupes du parcours. Vide veut dire AUCUN : c'est le
         bureau qui ouvre, à la main. */
      groupes: idsDesGroupes(lignes[i][9]),
      /* ⚠️ POURQUOI IL N'ENTRE PLUS — v1038. Un accès fermé sans
         raison affichée se retrouve rouvert à la main au premier
         appel de l'élève, et on recommence le mois suivant. */
      sorti: sortiDeLEcole(lignes[i][0])
    });
  }
  out.sort(function (a, b) {
    return String(a.eleve).localeCompare(String(b.eleve), 'fr');
  });
  return out;
}

/* La formation de tous les élèves du répertoire, en une lecture.
   La règle est celle de boiteDeLEleve() — elles doivent rester
   d'accord, sinon l'écran promet un accès que l'élève n'a pas. */
function formationsParEleve() {
  var out = {};
  try {
    var sh = feuilleEleves();
    var derniere = sh.getLastRow();
    if (derniere < 2) return out;

    var lignes = sh.getRange(2, 1, derniere - 1, 4).getValues();
    for (var i = 0; i < lignes.length; i++) {
      if (!lignes[i][0]) continue;
      var form = normaliser(lignes[i][3]);
      var b = '';
      /* La remorque d'abord : « BEA » contient « BE » */
      if (form.indexOf('remorque') !== -1 ||
          /(^|[^a-z])be([^a-z]|$)/.test(form)) b = 'BE';
      else if (form.indexOf('bea') !== -1 ||
               form.indexOf('automatique') !== -1) b = 'BEA';
      else if (form.indexOf('bv') !== -1 ||
               form.indexOf('manuelle') !== -1) b = 'BV';
      if (b) out[normaliser(lignes[i][0])] = b;
    }
  } catch (e) { /* répertoire illisible : on retombe sur le déclaré */ }
  return out;
}

function enregistrerAccesEleve(d) {
  var sh = feuilleElevesAcces();
  var nom = String(d.eleve || '').trim();
  if (!nom) return { status: 'error', message: 'Élève manquant.' };

  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');
  var code = String(d.code || '').trim();
  var existant = accesEleve(nom);

  /* Un code tiré au hasard, à six chiffres. On n'en tire un que
     s'il n'y en a pas : changer la langue ne doit pas déconnecter
     l'élève en lui donnant un nouveau code. */
  if (!code) {
    code = (existant && existant.code)
      ? existant.code
      : String(Math.floor(100000 + Math.random() * 900000));
  }

  if (existant) {
    sh.getRange(existant.ligne, 2).setValue(code);
    sh.getRange(existant.ligne, 3).setValue(
      (String(d.actif) === 'non') ? 'non' : 'oui');
    /* La langue ne bouge que si on la fournit : régénérer un code
       ne doit pas la refermer. */
    if (d.langue !== undefined) {
      sh.getRange(existant.ligne, 6).setValue(String(d.langue || ''));
    }
    if (d.modules !== undefined) {
      sh.getRange(existant.ligne, 7).setValue(valeurModules(d.modules));
    }
    /* Une fois déclarée, la boîte ne se change plus depuis
       l'espace élève : seul le bureau peut la corriger. */
    if (d.boite !== undefined) {
      sh.getRange(existant.ligne, 8).setValue(String(d.boite || ''));
    }
    /* Les procédures ouvertes en plus de sa formation. On ne touche
       à la colonne que si elle est fournie : régénérer un code ne
       doit pas retirer les accès qu'on lui avait donnés. */
    if (d.enPlus !== undefined) {
      sh.getRange(existant.ligne, 9)
        .setValue(idsProcedures(
          Array.isArray(d.enPlus) ? d.enPlus.join('|') : d.enPlus).join('|'));
    }
    /* ⚠️ SES GROUPES DU PARCOURS — v1036, même règle que les
       procédures : la colonne ne bouge que si on la fournit.
       Régénérer un code ne doit pas fermer son parcours. */
    if (d.groupes !== undefined) {
      sh.getRange(existant.ligne, 10)
        .setValue(idsDesGroupes(
          Array.isArray(d.groupes) ? d.groupes.join('|') : d.groupes).join('|'));
    }
    return { status: 'ok', eleve: nom, code: code };
  }

  ajouterLigne(sh, [nom, code, (String(d.actif) === 'non') ? 'non' : 'oui',
                maintenant, '', String(d.langue || ''),
                /* ⚠️ UN ACCÈS NEUF NAÎT FERMÉ. C'est la règle du
                   17 septembre, et c'est ici qu'elle se joue : la
                   ligne s'écrit « aucun » tant que le bureau n'a
                   rien coché. */
                valeurModules(d.modules), '',
                idsProcedures(
                  Array.isArray(d.enPlus) ? d.enPlus.join('|') : d.enPlus).join('|'),
                /* ⚠️ ET AUCUN GROUPE. Un compte neuf n'a ni parcours,
                   ni prochain cours, ni historique : c'est le bureau
                   qui ouvre, à la main. */
                idsDesGroupes(
                  Array.isArray(d.groupes) ? d.groupes.join('|') : d.groupes).join('|')]);
  return { status: 'ok', eleve: nom, code: code };
}

function supprimerAccesEleve(d) {
  var sh = feuilleElevesAcces();
  var a = accesEleve(String(d.eleve || ''));
  if (a) sh.deleteRow(a.ligne);
  return { status: 'ok' };
}

/* Les procédures qu'un moniteur a demandées à un élève */
/* ============================================================
   LES MAILS DE L'ESPACE ÉLÈVE

   Deux moments : une récitation qui arrive, et une correction
   validée. Un envoi qui échoue ne doit jamais faire échouer
   l'enregistrement — le mail est un service, pas le fond.
   ============================================================ */

function adresseNotification() {
  var reg = lireReglages();
  return String(reg.mailNotification || 'evolutionconduites@gmail.com').trim();
}

/* La fiche d'un élève : son adresse et son Messenger */
function contactEleve(nom) {
  var sh = feuilleEleves();
  var derniere = sh.getLastRow();
  if (derniere < 2) return {};

  var lignes = sh.getRange(2, 1, derniere - 1, 5).getValues();
  for (var i = 0; i < lignes.length; i++) {
    if (normaliser(lignes[i][0]) !== normaliser(nom)) continue;
    return {
      email: texteCellule(lignes[i][2], false).trim(),
      messenger: texteCellule(lignes[i][4], false).trim()
    };
  }
  return {};
}

/* Prévient le bureau qu'une récitation attend.

   Trois situations, trois messages : personne n'a encore corrigé,
   l'IA a proposé quelque chose à relire, ou l'IA a déjà envoyé.
   Ce qu'a dit l'élève y figure toujours — c'est ce qu'on veut
   lire depuis son téléphone sans ouvrir l'application. */
function prevenirCorrectionAttendue(r) {
  var destinataire = adresseNotification();
  if (!destinataire) return null;

  var quoi = String(r.cas || 'attente');
  var bouts = [];

  bouts.push('Élève : ' + r.eleve);
  bouts.push('Procédure : ' + r.procedure);
  bouts.push('Reçue le : ' + r.envoyeLe);
  if (r.langue) bouts.push('Récitée en : ' + r.langue);
  bouts.push('');

  bouts.push('--- CE QU\'IL A DIT ---');
  bouts.push(r.texte || '');
  bouts.push('');

  if (r.traduction) {
    bouts.push('--- TRADUCTION ---');
    bouts.push(r.traduction);
    bouts.push('');
  }

  if (quoi === 'envoye') {
    bouts.push('--- CE QUE L\'IA A CORRIGÉ ET ENVOYÉ ---');
    bouts.push(r.correction || '');
    bouts.push('');
    bouts.push('L\'élève l\'a déjà reçue.');
    bouts.push('Pour la reprendre : Élèves > Procédures, ouvre sa fiche,');
    bouts.push('corrige le texte et valide à nouveau.');
  } else if (quoi === 'proposee') {
    bouts.push('--- PROPOSITION DE L\'IA, À VÉRIFIER ---');
    bouts.push(r.correction || '');
    bouts.push('');
    bouts.push('Rien n\'est parti à l\'élève.');
    bouts.push('Va vérifier cette correction dans Élèves > Procédures,');
    bouts.push('puis valide pour la lui envoyer.');
  } else {
    bouts.push('Aucune correction pour l\'instant.');
    bouts.push('Va la corriger dans Élèves > Procédures.');
  }

  return {
    destinataire: destinataire,
    sujet: r.procedure + ' - ' + r.eleve,
    texte: bouts.join('\n')
  };
}

/* Un message d'erreur qu'on peut lire sans être développeur */
function motifLisible(e) {
  var t = String(e && e.message ? e.message : e);
  if (t.indexOf('permission') !== -1 || t.indexOf('autorisé') !== -1 ||
      t.indexOf('MailApp') !== -1) {
    return "le classeur n'a pas encore le droit d'envoyer des mails " +
           "(lance « autoriserMails » depuis l'éditeur Apps Script)";
  }
  if (t.indexOf('quota') !== -1 || t.indexOf('limit') !== -1) {
    return 'quota de mails du jour atteint';
  }
  return t.slice(0, 140);
}

/* Garde une trace des envois manqués */
function journaliserEchecMail(genre, destinataire, e) {
  try {
    var f = classeur();
    var sh = f.getSheetByName('MailsEchoues');
    if (!sh) {
      sh = f.insertSheet('MailsEchoues', f.getNumSheets());
      ajouterLigne(sh, ['Quand', 'Type', 'Destinataire', 'Motif']);
      sh.setFrozenRows(1);
    }
    ajouterLigne(sh, [
      Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
      genre, String(destinataire || ''), motifLisible(e)
    ]);
  } catch (err) { /* on ne va pas plus loin */ }
}

/* Envoie la correction validée à l'élève */
function envoyerCorrectionEleve(r) {
  var c = contactEleve(r.eleve);
  if (!c.email) return { envoye: false, motif: 'pas d\'adresse en fiche' };

  var corps =
    'Bonjour ' + String(r.eleve).split(' ')[0] + ',\n\n' +
    'Voici la correction de ta procédure « ' + r.procedure + ' ».\n\n' +
    '--- CE QUE TU AS DIT ---\n' +
    r.texte + '\n\n' +
    '--- LA CORRECTION ---\n' +
    r.correction + '\n\n' +
    'Tu peux la retrouver dans ton coin révisions :\n' +
    LIEN_ESPACE_ELEVE + '\n\n' +
    'Bon entraînement !\n' +
    'Évolution Conduites';

  return { destinataire: c.email,
           sujet: 'Ta procédure corrigée - ' + r.procedure,
           texte: corps };
}

/* ============================================================
   LES RÉGLAGES

   Quelques interrupteurs, partagés entre les postes. Une feuille
   à deux colonnes suffit.
   ============================================================ */
function feuilleReglages() {
  var f = classeur();
  var sh = f.getSheetByName('Reglages');
  if (!sh) {
    sh = f.insertSheet('Reglages', f.getNumSheets());
    ajouterLigne(sh, ['Clé', 'Valeur', 'Modifié le', 'Par']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* Le réglage du plein écran, lu sans faire tomber l'écran si la
   feuille des réglages est absente ou illisible : dans le doute, on
   garde le comportement de tous les jours. */
function pleinEcranReglage() {
  try {
    return lireReglages()['ecranPleinEcran'] || '';
  } catch (e) {
    return '';
  }
}

/* Une durée d'écran, en minutes. Vide, illisible ou négative valent
   cinq — le comportement de toujours. Plafonnée à 120 : au-delà, le
   cours ne quitte plus l'écran et les diapositives ne passent
   jamais. */
function minutesEcranReglage(cle) {
  try {
    var brut = String(lireReglages()[cle] || '').trim();
    if (!brut) return 5;
    var n = parseInt(brut, 10);
    if (isNaN(n) || n < 0) return 5;
    return Math.min(n, 120);
  } catch (e) {
    return 5;
  }
}

function lireReglages() {
  var sh = feuilleReglages();
  var derniere = sh.getLastRow();
  var out = {};
  if (derniere < 2) return out;

  var lignes = sh.getRange(2, 1, derniere - 1, 2).getValues();
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out[String(lignes[i][0])] = String(lignes[i][1] || '');
  }
  return out;
}

function ecrireReglage(d) {
  var sh = feuilleReglages();
  var cle = String(d.cle || '').trim();
  if (!cle) return { status: 'error', message: 'Clé manquante.' };

  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== cle) continue;
    sh.getRange(i + 1, 2, 1, 3).setValues([[String(d.valeur || ''),
                                            maintenant, String(d.par || '')]]);
    return { status: 'ok' };
  }
  ajouterLigne(sh, [cle, String(d.valeur || ''), maintenant, String(d.par || '')]);
  return { status: 'ok' };
}

function feuilleDemandes() {
  var f = classeur();
  var sh = f.getSheetByName('DemandesProcedures');
  if (!sh) {
    sh = f.insertSheet('DemandesProcedures', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Élève', 'Procédure', 'Id procédure',
                  'Consigne', 'Demandé le', 'Par', 'État', 'Fait le']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* ============================================================
   LA CHECK-LIST DU DÉPART

   « ✅ À faire au bureau » — certificat de fin de formation,
   dossier ANTS, solde de tout compte… — n'était QUE des cases
   dans la page. Rechargée, la liste repartait vierge : le bureau
   recochait de mémoire, ou recommençait une démarche déjà faite.

   Elle ne peut pas vivre dans la fiche de suivi : le bouton juste
   en dessous, « Retirer de toutes les listes de suivi », efface
   précisément cette fiche. Elle a donc sa feuille à elle, qui
   survit au retrait.
   ============================================================ */
function feuilleDepartTaches() {
  var f = classeur();
  var sh = f.getSheetByName('DepartTaches');
  if (!sh) {
    sh = f.insertSheet('DepartTaches', f.getNumSheets());
    ajouterLigne(sh, ['Élève', 'Faites', 'Mis à jour le', 'Par']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function listerDepartTaches(d) {
  var cible = normaliser(String((d && d.eleve) || ''));
  if (!cible) return { status: 'ok', faites: [] };
  try {
    var sh = feuilleDepartTaches();
    var lignes = sh.getDataRange().getValues();
    for (var i = 1; i < lignes.length; i++) {
      if (normaliser(lignes[i][0]) !== cible) continue;
      var brut = String(lignes[i][1] || '');
      return { status: 'ok',
               faites: brut ? brut.split('|').map(function (x) {
                 return x.trim();
               }).filter(Boolean) : [],
               quand: texteCellule(lignes[i][2], false),
               par: texteCellule(lignes[i][3], false) };
    }
  } catch (e) { /* feuille absente : rien de coché */ }
  return { status: 'ok', faites: [] };
}

function enregistrerDepartTaches(d) {
  var nom = String((d && d.eleve) || '').trim();
  if (!nom) return { status: 'error', message: 'Élève manquant.' };

  var liste = (d && d.faites) || [];
  if (typeof liste === 'string') liste = liste.split('|');
  var texte = liste.map(function (x) { return String(x || '').trim(); })
                   .filter(Boolean).join(' | ');

  var sh = feuilleDepartTaches();
  var lignes = sh.getDataRange().getValues();
  var cible = normaliser(nom);
  var quand = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');

  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][0]) !== cible) continue;
    sh.getRange(i + 1, 2, 1, 3)
      .setValues([[cellule(texte), quand, String(d.demandeur || d.par || '')]]);
    return { status: 'ok', faites: texte };
  }

  ajouterLigne(sh, [nom, texte, quand, String(d.demandeur || d.par || '')]);
  return { status: 'ok', faites: texte };
}

function listerDemandes(d) {
  var sh = feuilleDemandes();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(2, 1, derniere - 1, 9).getValues();
  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    if (d && d.eleve && normaliser(lignes[i][1]) !== normaliser(d.eleve)) continue;
    out.push({
      id: String(lignes[i][0]),
      eleve: texteCellule(lignes[i][1], false),
      procedure: texteCellule(lignes[i][2], false),
      idProcedure: String(lignes[i][3] || ''),
      consigne: texteCellule(lignes[i][4], false),
      demandeLe: texteCellule(lignes[i][5], false),
      par: texteCellule(lignes[i][6], false),
      etat: String(lignes[i][7] || 'attente')
    });
  }
  /* Les plus anciennes d'abord : ce sont elles qui traînent */
  return out;
}

function enregistrerDemande(d) {
  var sh = feuilleDemandes();
  var id = String(d.id || '').trim() || ('d' + new Date().getTime());
  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy');

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== id) continue;
    if (d.etat !== undefined) {
      sh.getRange(i + 1, 8).setValue(String(d.etat));
      if (String(d.etat) === 'fait') {
        sh.getRange(i + 1, 9).setValue(maintenant);
      }
    }
    if (d.consigne !== undefined) sh.getRange(i + 1, 5).setValue(String(d.consigne));
    return { status: 'ok', id: id };
  }

  ajouterLigne(sh, [id, String(d.eleve || ''), String(d.procedure || ''),
                String(d.idProcedure || ''), String(d.consigne || ''),
                maintenant, String(d.par || ''), 'attente', '']);
  return { status: 'ok', id: id };
}

function supprimerDemande(d) {
  var sh = feuilleDemandes();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) { sh.deleteRow(i + 1); break; }
  }
  return { status: 'ok' };
}

/* Demander plusieurs procédures d'un coup, en fin de cours.

   L'accès de l'élève est créé s'il n'existe pas : sans lui, la
   demande n'irait nulle part. Le code revient pour être glissé
   dans le bilan. */
function demanderProcedures(d) {
  var eleve = String(d.eleve || '').trim();
  if (!eleve) return { status: 'error', message: 'Élève manquant.' };

  /* Tant que l'interrupteur est fermé, seul le bureau demande.
     Un moniteur qui coche en fin de cours n'envoie rien. */
  if (String(d.source || '') === 'cours') {
    var reg = lireReglages();
    if (String(reg.recitationsMoniteurs || '') !== 'oui') {
      return { status: 'error', message: 'La demande en fin de cours ' +
               'est désactivée. Le bureau s\'en charge.' };
    }
  }

  var ids = d.procedures || [];
  if (typeof ids === 'string') ids = JSON.parse(ids);
  if (!ids.length) return { status: 'error', message: 'Aucune procédure.' };

  /* L'accès d'abord : une demande sans espace ne sert à rien */
  var acc = accesEleve(eleve);
  var nouveau = false;
  if (!acc) {
    var cree = enregistrerAccesEleve({ eleve: eleve });
    acc = { eleve: eleve, code: cree.code };
    nouveau = true;
  }

  /* Les procédures, par leur nom : le classeur les range ainsi.

     TOUTES, sans filtre de boîte : on résout des ids que le bureau
     vient de cocher, on ne décide pas de ce qu'un élève a le droit
     de voir. proceduresPubliques() sans argument écarte justement
     les procédures BE — aucune récitation remorque n'était donc
     demandable. */
  var toutes = toutesLesProcedures();
  var posees = [];

  for (var i = 0; i < ids.length; i++) {
    var p = null;
    for (var j = 0; j < toutes.length; j++) {
      if (String(toutes[j].id) === String(ids[i])) { p = toutes[j]; break; }
    }
    if (!p) continue;

    /* Déjà demandée et pas encore faite : on ne double pas */
    var dejaLa = false;
    var enCours = listerDemandes({ eleve: eleve });
    for (var k = 0; k < enCours.length; k++) {
      if (enCours[k].etat !== 'fait' &&
          normaliser(enCours[k].procedure) === normaliser(p.nom)) {
        dejaLa = true;
        break;
      }
    }
    if (dejaLa) { posees.push(p.nom); continue; }

    enregistrerDemande({
      eleve: eleve,
      procedure: p.nom,
      idProcedure: p.id,
      consigne: String(d.consigne || ''),
      par: String(d.par || '')
    });
    posees.push(p.nom);
  }

  return { status: 'ok', code: acc.code, nouveau: nouveau,
           procedures: posees };
}

/* Une demande se solde quand l'élève récite la bonne procédure */
function soldeDemande(eleve, procedure) {
  var sh = feuilleDemandes();
  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy');

  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][1]) !== normaliser(eleve)) continue;
    if (normaliser(lignes[i][2]) !== normaliser(procedure)) continue;
    if (String(lignes[i][7]) === 'fait') continue;
    sh.getRange(i + 1, 8).setValue('fait');
    sh.getRange(i + 1, 9).setValue(maintenant);
    break;
  }
}

/* ============================================================
   LES EMPLACEMENTS

   Où l'élève retrouve son véhicule, ou se présente. La liste vit
   dans les réglages pour que le bureau puisse l'étoffer sans
   toucher au code.

   Une ligne par lieu : « clé | émoji | nom court | phrase du SMS ».
   La clé ne change jamais — c'est elle qui est enregistrée dans
   les cours déjà saisis.
   ============================================================ */
function lieuxDisponibles() {
  var reg = lireReglages();
  var brut = String(reg.lieux || '').trim();

  if (!brut) {
    brut = [
      "devant|🛣️|Devant, le long du trottoir|𝗧𝗮 𝘃𝗼𝗶𝘁𝘂𝗿𝗲 𝘀𝗲𝗿𝗮 𝗱𝗮𝗻𝘀 𝗹𝗮 𝗿𝘂𝗲 𝗹𝗲 𝗹𝗼𝗻𝗴 𝗱𝘂 𝘁𝗿𝗼𝘁𝘁𝗼𝗶𝗿 !",
      "cour|🅿️|Cour intérieure|𝗧𝗮 𝘃𝗼𝗶𝘁𝘂𝗿𝗲 𝘀𝗲𝗿𝗮 𝗱𝗮𝗻𝘀 𝗹𝗮 𝗰𝗼𝘂𝗿 𝗶𝗻𝘁𝗲́𝗿𝗶𝗲𝘂𝗿𝗲 𝗱𝗲 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !",
      "moto|🏍️|Moto|𝗧𝗮 𝗺𝗼𝘁𝗼 𝘁'𝗮𝘁𝘁𝗲𝗻𝗱 𝗮̀ 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !",
      "scooter|🛵|Scooter|𝗧𝗼𝗻 𝘀𝗰𝗼𝗼𝘁𝗲𝗿 𝘁'𝗮𝘁𝘁𝗲𝗻𝗱 𝗮̀ 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !",
      "bureau|🏢|Bureau|𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗮𝘂 𝗯𝘂𝗿𝗲𝗮𝘂 𝗱𝗲 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !",
      "tablettes|📱|Salle des tablettes|𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗱𝗮𝗻𝘀 𝗹𝗮 𝘀𝗮𝗹𝗹𝗲 𝗱𝗲𝘀 𝘁𝗮𝗯𝗹𝗲𝘁𝘁𝗲𝘀 !",
      "cours|📚|Salle de cours|𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗱𝗮𝗻𝘀 𝗹𝗮 𝘀𝗮𝗹𝗹𝗲 𝗱𝗲 𝗰𝗼𝘂𝗿𝘀 !",
      "simulateur|🖥️|Simulateur|𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗱𝗲𝘃𝗮𝗻𝘁 𝗹𝗲 𝘀𝗶𝗺𝘂𝗹𝗮𝘁𝗲𝘂𝗿 !"
    ].join('\n');
  }

  var out = [];
  var lignes = brut.split(/\r?\n/);
  for (var i = 0; i < lignes.length; i++) {
    var l = lignes[i].trim();
    if (!l) continue;
    var p = l.split('|');
    out.push({
      cle: (p[0] || '').trim(),
      emoji: (p[1] || '').trim(),
      nom: (p[2] || p[0] || '').trim(),
      /* La phrase du SMS ; vide = on ne dit rien à l'élève */
      sms: (p[3] || '').trim(),
      /* Un lieu sans véhicule masque le choix du véhicule */
      sansVehicule: /^(bureau|tablettes|cours)$/.test((p[0] || '').trim()) ||
                    String(p[4] || '').trim() === 'sansvehicule'
    });
  }
  return out;
}

/* Les langues qu'un élève peut utiliser, en plus du français.

   La liste est modifiable depuis les réglages : « code|nom » par
   ligne. Les codes sont ceux de la dictée du navigateur. */
function languesDisponibles() {
  var reg = lireReglages();
  var brut = String(reg.languesEleves || '').trim();

  if (!brut) {
    brut = [
      'en-GB|English — Anglais',
      'es-ES|Español — Espagnol',
      'ar-SA|العربية — Arabe',
      'tr-TR|Türkçe — Turc',
      'uk-UA|Українська — Ukrainien',
      'ru-RU|Русский — Russe',
      'fa-AF|دری — Dari (Afghanistan)',
      'ps-AF|پښتو — Pachto (Afghanistan)'
    ].join('\n');
  }

  var out = [];
  var lignes = brut.split(/\r?\n/);
  for (var i = 0; i < lignes.length; i++) {
    var l = lignes[i].trim();
    if (!l) continue;
    var p = l.split('|');
    out.push({ code: p[0].trim(), nom: (p[1] || p[0]).trim() });
  }
  return out;
}

/* La boîte d'un élève : automatique ou manuelle.

   L'espace élève ne propose que les procédures de sa boîte, plus
   celles qui valent pour les deux. Vide = on lui demandera. */
function boiteDeLEleve(nom) {
  var recherche = normaliser(nom);

  /* Ce que le bureau a noté pour son examen */
  try {
    var sh = feuilleEleves();
    var derniere = sh.getLastRow();
    if (derniere >= 2) {
      var lignes = sh.getRange(2, 1, derniere - 1, 4).getValues();
      for (var i = 0; i < lignes.length; i++) {
        if (normaliser(lignes[i][0]) !== recherche) continue;
        var form = normaliser(lignes[i][3]);
        /* La remorque d'abord : un élève en BE ne récite que ses
           propres procédures, jamais celles de la voiture. */
        if (form.indexOf('remorque') !== -1 ||
            /(^|[^a-z])be([^a-z]|$)/.test(form)) return 'BE';
        if (form.indexOf('bea') !== -1 || form.indexOf('automatique') !== -1) return 'BEA';
        if (form.indexOf('bv') !== -1 || form.indexOf('manuelle') !== -1) return 'BV';
        break;
      }
    }
  } catch (e) {}

  /* Sinon ce qui est écrit dans son suivi de permis */
  try {
    var sh2 = feuille();
    var lg = sh2.getDataRange().getValues();
    for (var j = lg.length - 1; j >= 1; j--) {
      if (normaliser(lg[j][3]) !== recherche) continue;
      var t = normaliser(lg[j][15]);
      if (!t) continue;
      if (t.indexOf('bea') !== -1 || t.indexOf('automatique') !== -1) return 'BEA';
      if (t.indexOf('bv') !== -1 || t.indexOf('manuelle') !== -1) return 'BV';
    }
  } catch (e) {}

  return '';
}

/* La boîte que l'élève a déclarée lui-même, une fois pour toutes */
function boiteDeclaree(nom) {
  var a = accesEleve(nom);
  return (a && a.boite) || '';
}

/* Les procédures que l'élève peut réciter.
   Colonnes du classeur : Id, Usage, Nom, Contenu, …, Boîte. */
function proceduresPubliques(boiteEleve) {
  var lignes = feuilleModeles().getDataRange().getValues();
  var b = String(boiteEleve || '').toUpperCase();
  var out = [];

  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    if (String(lignes[i][1]) !== 'procedure') continue;

    /* La boîte du modèle : vide = pour tout le monde. Un élève en
       BEA ne doit pas réciter le passage des vitesses. */
    var bm = texteCellule(lignes[i][6], false).toUpperCase();

    /* La remorque est un monde à part : ses procédures ne
       s'adressent qu'à elle, et elle ne voit que les siennes.

       « BE » se cherche en mot entier : « BEA » le contient, et
       une procédure automatique se serait retrouvée côté
       remorque. */
    var estBE = /(^|[^A-Z])BE([^A-Z]|$)/.test(bm);

    if (b === 'BE') {
      if (!estBE) continue;
    } else {
      if (estBE) continue;
      if (b && bm && bm.indexOf(b) === -1) continue;
    }

    out.push({
      id: String(lignes[i][0]),
      nom: texteCellule(lignes[i][2], false),
      boite: texteCellule(lignes[i][6], false)
    });
  }
  out.sort(function (a, b) {
    return String(a.nom).localeCompare(String(b.nom), 'fr');
  });
  return out;
}

/* Toutes les procédures du classeur, sans filtre de boîte.

   Sert partout où l'on manipule un catalogue — résoudre un id,
   dresser la liste des cases à cocher du bureau — par opposition à
   proceduresPubliques(), qui décide de ce qu'UN élève a le droit
   de voir. Confondre les deux écarte silencieusement la remorque. */
function toutesLesProcedures() {
  var lignes = feuilleModeles().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    if (String(lignes[i][1]) !== 'procedure') continue;
    out.push({
      id: String(lignes[i][0]),
      nom: texteCellule(lignes[i][2], false),
      boite: texteCellule(lignes[i][6], false)
    });
  }
  out.sort(function (a, b) {
    return String(a.nom).localeCompare(String(b.nom), 'fr');
  });
  return out;
}

/* Les procédures d'un élève : celles de sa formation, PLUS celles
   que le bureau lui a ouvertes une par une.

   Additif, jamais soustractif. Une procédure ajoutée demain à sa
   formation lui parvient sans que personne rouvre sa fiche, et une
   case oubliée ne peut pas le priver de ce qui lui revient. */
function proceduresDeLEleve(saBoite, enPlus) {
  var out = proceduresPubliques(saBoite);
  var ids = enPlus || [];
  if (!ids.length) return out;

  var deja = {};
  for (var i = 0; i < out.length; i++) deja[out[i].id] = true;

  var lignes = feuilleModeles().getDataRange().getValues();
  for (var j = 1; j < lignes.length; j++) {
    if (!lignes[j][0]) continue;
    if (String(lignes[j][1]) !== 'procedure') continue;
    var id = String(lignes[j][0]);
    if (deja[id]) continue;
    if (ids.indexOf(id) === -1) continue;
    out.push({
      id: id,
      nom: texteCellule(lignes[j][2], false),
      boite: texteCellule(lignes[j][6], false)
    });
  }

  out.sort(function (a, b) {
    return String(a.nom).localeCompare(String(b.nom), 'fr');
  });
  return out;
}


/* ============================================================
   À QUELLE CATÉGORIE APPARTIENT UNE PROCÉDURE

   La correction automatique se règle par catégorie : le bureau
   peut la vouloir sur la remorque et pas ailleurs. La règle est
   celle de proceduresPubliques() — elle doit le rester, sinon
   une procédure serait proposée à un élève d'un côté et rangée
   ailleurs de l'autre.
   ============================================================ */
function categoriesDeBoite(boite) {
  var bm = String(boite || '').toUpperCase();

  /* « BE » se cherche en mot entier : « BEA » le contient, et une
     procédure automatique se retrouverait côté remorque. */
  if (/(^|[^A-Z])BE([^A-Z]|$)/.test(bm)) return ['BE'];

  /* Vide = la procédure s'adresse à tout le monde */
  if (!bm.trim()) return ['communes'];

  var out = [];
  if (bm.indexOf('BEA') !== -1) out.push('BEA');
  if (bm.indexOf('BV') !== -1) out.push('BV');
  return out;
}

/* Une procédure retrouvée par son nom, avec tout ce qui sert à la
   corriger. Renvoie null si elle n'existe plus : nom modifié,
   procédure supprimée. Le bureau la corrigera à la main.

   La recherche se fait sur TOUTES les procédures, sans filtre de
   boîte. proceduresPubliques() sert à décider ce qu'un élève a le
   droit de voir ; ici on cherche une référence dont on connaît déjà
   le nom, parce que cet élève vient de la réciter. Appelée sans
   boîte, proceduresPubliques() écarte justement les procédures BE —
   le Worker cherchait donc le texte d'une procédure remorque et ne
   le trouvait jamais, et l'IA corrigeait sans référence. */
function procedureParNom(nom) {
  var cherche = normaliser(nom);
  if (!cherche) return null;

  var lignes = feuilleModeles().getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    if (String(lignes[i][1]) !== 'procedure') continue;
    if (normaliser(texteCellule(lignes[i][2], false)) !== cherche) continue;
    return {
      id: String(lignes[i][0]),
      nom: texteCellule(lignes[i][2], false),
      texte: texteCellule(lignes[i][3], false),
      boite: texteCellule(lignes[i][6], false),
      ordre: texteCellule(lignes[i][7], false) === 'oui',
      consigne: texteCellule(lignes[i][8], false)
    };
  }
  return null;
}

/* La boîte déclarée pour une procédure, ou null si elle n'existe plus */
function boiteDeProcedureParNom(nom) {
  var p = procedureParNom(nom);
  return p ? p.boite : null;
}

/* L'IA doit-elle corriger cette récitation d'office ?

   Le réglage vaut une liste de catégories : « BE », « BE,BV »…
   « oui » est la forme d'avant, quand le réglage était un simple
   interrupteur : elle vaut toutes les catégories. Sans cette
   tolérance, le temps entre le déploiement du script et la mise
   en ligne de l'application couperait la correction partout. */
function iaAutoPourProcedure(nomProcedure, reglages) {
  var brut = String((reglages || {}).iaAutoProcedures || '').trim();
  if (!brut) return false;
  if (brut.toLowerCase() === 'oui') return true;

  var voulues = brut.split(',').map(function (x) { return x.trim(); })
                    .filter(function (x) { return x; });
  if (!voulues.length) return false;

  /* Procédure introuvable : on ne devine pas sa catégorie, et une
     correction partie sur une procédure dont on ne sait rien vaut
     moins qu'une fiche qui attend un moniteur. */
  var boite = boiteDeProcedureParNom(nomProcedure);
  if (boite === null) return false;

  var siennes = categoriesDeBoite(boite);
  for (var i = 0; i < siennes.length; i++) {
    if (voulues.indexOf(siennes[i]) !== -1) return true;
  }
  return false;
}

/* Le texte d'une procédure, pour la correction */
function texteProcedure(id) {
  var lignes = feuilleModeles().getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== String(id)) continue;
    return texteCellule(lignes[i][3], false);
  }
  return '';
}

function listerRecitations(d) {
  var sh = feuilleRecitations();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(2, 1, derniere - 1, 13).getValues();
  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    /* Un élève ne voit que les siennes, et seulement validées */
    if (d && d.eleve) {
      if (normaliser(lignes[i][1]) !== normaliser(d.eleve)) continue;
      if (String(lignes[i][6]) !== 'valide') {
        out.push({
          id: String(lignes[i][0]),
          procedure: texteCellule(lignes[i][2], false),
          texte: texteCellule(lignes[i][3], false),
          correction: '',
          etat: String(lignes[i][6] || 'attente'),
          envoyeLe: texteCellule(lignes[i][7], false),
          langue: String(lignes[i][10] || '')
        });
        continue;
      }
    }
    var ligne = {
      id: String(lignes[i][0]),
      eleve: texteCellule(lignes[i][1], false),
      procedure: texteCellule(lignes[i][2], false),
      texte: texteCellule(lignes[i][3], false),
      correction: texteCellule(lignes[i][4], false),
      note: texteCellule(lignes[i][5], false),
      etat: String(lignes[i][6] || 'attente'),
      envoyeLe: texteCellule(lignes[i][7], false),
      validePar: texteCellule(lignes[i][8], false),
      langue: String(lignes[i][10] || ''),
      traduction: texteCellule(lignes[i][11], false),
      correctionTraduite: texteCellule(lignes[i][12], false)
    };

    /* L'élève reçoit la correction dans sa langue quand il en a une */
    if (d && d.eleve && ligne.langue && ligne.correctionTraduite) {
      ligne.correction = ligne.correctionTraduite;
    }
    out.push(ligne);
  }
  out.reverse();
  return out;
}

function enregistrerRecitation(d) {
  var sh = feuilleRecitations();
  var id = String(d.id || '').trim() || ('r' + new Date().getTime());
  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== id) continue;
    if (d.texte !== undefined) sh.getRange(i + 1, 4).setValue(String(d.texte));
    if (d.correction !== undefined) sh.getRange(i + 1, 5).setValue(String(d.correction));
    if (d.langue !== undefined) sh.getRange(i + 1, 11).setValue(String(d.langue));
    if (d.traduction !== undefined) sh.getRange(i + 1, 12).setValue(String(d.traduction));
    if (d.correctionTraduite !== undefined) {
      sh.getRange(i + 1, 13).setValue(String(d.correctionTraduite));
    }
    if (d.note !== undefined) sh.getRange(i + 1, 6).setValue(String(d.note));
    if (d.etat !== undefined) {
      sh.getRange(i + 1, 7).setValue(String(d.etat));
      if (String(d.etat) === 'valide') {
        sh.getRange(i + 1, 9).setValue(String(d.par || ''));
        sh.getRange(i + 1, 10).setValue(maintenant);
      }
    }
    return { status: 'ok', id: id };
  }

  ajouterLigne(sh, [id, String(d.eleve || ''), String(d.procedure || ''),
                String(d.texte || ''), String(d.correction || ''),
                String(d.note || ''), String(d.etat || 'attente'),
                maintenant, '', '',
                String(d.langue || ''), String(d.traduction || ''),
                String(d.correctionTraduite || '')]);
  return { status: 'ok', id: id };
}

function supprimerRecitation(d) {
  var sh = feuilleRecitations();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) { sh.deleteRow(i + 1); break; }
  }
  return { status: 'ok' };
}

/* Marque le passage de l'élève, sans plus */
function noterVisiteEleve(nom) {
  try {
    var a = accesEleve(nom);
    if (!a) return;
    feuilleElevesAcces().getRange(a.ligne, 5).setValue(
      Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'));
  } catch (e) { /* sans importance */ }
}

function feuillePaieRattachement() {
  var f = classeur();
  var sh = f.getSheetByName('PaieRattachement');
  if (!sh) {
    sh = f.insertSheet('PaieRattachement', f.getNumSheets());
    ajouterLigne(sh, ['Semaine du', 'Mois', 'Par', 'Modifié le']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function listerRattachements() {
  var sh = feuillePaieRattachement();
  var derniere = sh.getLastRow();
  if (derniere < 2) return {};

  var lignes = sh.getRange(2, 1, derniere - 1, 2).getValues();
  var out = {};
  for (var i = 0; i < lignes.length; i++) {
    var s = dateVersIso(lignes[i][0]);
    if (s) out[s] = String(lignes[i][1] || '');
  }
  return out;
}

function enregistrerRattachement(d) {
  var sh = feuillePaieRattachement();
  var lignes = sh.getDataRange().getValues();
  var semaine = String(d.semaine || '');
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');

  for (var i = 1; i < lignes.length; i++) {
    if (dateVersIso(lignes[i][0]) !== semaine) continue;
    /* Un mois vide remet la semaine sur sa règle par défaut */
    if (!d.mois) { sh.deleteRow(i + 1); return { status: 'ok' }; }
    sh.getRange(i + 1, 1, 1, 4).setValues([[semaine, String(d.mois),
                                            String(d.par || ''), maintenant]]);
    return { status: 'ok' };
  }

  if (!d.mois) return { status: 'ok' };
  ajouterLigne(sh, [semaine, String(d.mois), String(d.par || ''), maintenant]);
  return { status: 'ok' };
}

/* Les remboursements de carburant */
function feuillePaieGasoil() {
  var f = classeur();
  var sh = f.getSheetByName('PaieGasoil');
  if (!sh) {
    sh = f.insertSheet('PaieGasoil', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Id salarié', 'Date', 'Montant', 'Véhicule',
                  'Litres', 'Remarque', 'Remboursé', 'Par', 'Créé le']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function listerGasoil() {
  var sh = feuillePaieGasoil();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(2, 1, derniere - 1, 13).getValues();
  var out = [];
  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      id: String(lignes[i][0]),
      idSalarie: String(lignes[i][1]),
      date: dateVersIso(lignes[i][2]) || '',
      montant: Number(lignes[i][3]) || 0,
      vehicule: texteCellule(lignes[i][4], false),
      litres: Number(lignes[i][5]) || 0,
      remarque: texteCellule(lignes[i][6], false),
      rembourse: String(lignes[i][7] || '') === 'oui'
    });
  }
  out.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  return out;
}

function enregistrerGasoil(d) {
  var sh = feuillePaieGasoil();
  var id = String(d.id || '').trim() || ('g' + new Date().getTime());
  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');

  var valeurs = [
    id,
    String(d.idSalarie || ''),
    String(d.date || ''),
    Number(d.montant) || 0,
    String(d.vehicule || ''),
    Number(d.litres) || 0,
    String(d.remarque || ''),
    (String(d.rembourse) === 'oui') ? 'oui' : '',
    String(d.par || ''),
    maintenant
  ];

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== id) continue;
    valeurs[9] = lignes[i][9] || maintenant;
    sh.getRange(i + 1, 1, 1, valeurs.length).setValues([valeurs]);
    return { status: 'ok', id: id };
  }
  ajouterLigne(sh, valeurs);
  return { status: 'ok', id: id };
}

function supprimerGasoil(d) {
  var sh = feuillePaieGasoil();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) { sh.deleteRow(i + 1); break; }
  }
  return { status: 'ok' };
}

function feuilleFlotte() {
  var f = classeur();
  var sh = f.getSheetByName('Flotte');
  if (!sh) {
    sh = f.insertSheet('Flotte', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Nom', 'Catégorie', 'Marque modèle', 'Immatriculation',
                  'Mise en circulation', 'Boîte', 'Site', 'Km', 'Km relevé le',
                  'Dernier CT', 'Dernière révision km', 'Dernière révision le',
                  'Périodicité révision km', 'Assurance jusqu\'au',
                  'Accessoires', 'Remarque', 'État', 'Créé le',
                  'Indispo du', 'Indispo au', 'Motif indispo', 'Carburant']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function feuilleFlotteEvents() {
  var f = classeur();
  var sh = f.getSheetByName('FlotteEvenements');
  if (!sh) {
    sh = f.insertSheet('FlotteEvenements', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Id véhicule', 'Type', 'Date', 'Km', 'Libellé',
                  'Garage', 'Coût', 'État', 'Par', 'Créé le']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function listerFlotte() {
  var sh = feuilleFlotte();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(2, 1, derniere - 1, 19).getValues();
  var out = [];

  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    var v = {
      id: String(lignes[i][0]),
      nom: texteCellule(lignes[i][1], false),
      categorie: String(lignes[i][2] || 'voiture'),
      modele: texteCellule(lignes[i][3], false),
      immat: texteCellule(lignes[i][4], false),
      miseEnCirculation: dateVersIso(lignes[i][5]) || '',
      boite: String(lignes[i][6] || ''),
      site: texteCellule(lignes[i][7], false),
      km: Number(lignes[i][8]) || 0,
      kmLeveLe: dateVersIso(lignes[i][9]) || '',
      dernierCT: dateVersIso(lignes[i][10]) || '',
      revisionKm: Number(lignes[i][11]) || 0,
      revisionLe: dateVersIso(lignes[i][12]) || '',
      periodiciteKm: Number(lignes[i][13]) || 0,
      assuranceJusquau: dateVersIso(lignes[i][14]) || '',
      accessoires: texteCellule(lignes[i][15], false),
      remarque: texteCellule(lignes[i][16], false),
      etat: String(lignes[i][17] || 'actif'),
      indispoDu: dateVersIso(lignes[i][19]) || '',
      indispoAu: dateVersIso(lignes[i][20]) || '',
      motifIndispo: texteCellule(lignes[i][21], false),
      carburant: texteCellule(lignes[i][22], false)
    };
    /* Immobilisé aujourd'hui : le véhicule ne peut pas être annoncé
       à un élève ni affiché comme disponible. */
    v.indisponible = (v.etat === 'immobilise') || estIndisponibleAujourdhui(v);
    v.prochainCT = prochainControleTechnique(v);
    v.prochaineRevisionKm = v.periodiciteKm
      ? (v.revisionKm + v.periodiciteKm) : 0;
    out.push(v);
  }

  out.sort(function (a, b) {
    if (a.categorie !== b.categorie) {
      return String(a.categorie).localeCompare(String(b.categorie));
    }
    return String(a.nom).localeCompare(String(b.nom), 'fr', { numeric: true });
  });
  return out;
}

/* La date du prochain contrôle technique, déduite du dernier ou de
   la mise en circulation. */
/* Un véhicule immobilisé aujourd'hui : entre les deux dates, ou
   depuis une date sans retour prévu. */
function estIndisponibleAujourdhui(v) {
  if (!v.indispoDu) return false;
  var auj = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
  if (auj < v.indispoDu) return false;
  if (v.indispoAu && auj > v.indispoAu) return false;
  return true;
}

function prochainControleTechnique(v) {
  var regle = CT_PAR_CATEGORIE[v.categorie];
  if (!regle) return '';

  var base, mois;
  if (v.dernierCT) {
    base = v.dernierCT;
    mois = regle.suivant;
  } else if (v.miseEnCirculation) {
    base = v.miseEnCirculation;
    mois = regle.premier;
  } else {
    return '';
  }

  var d = new Date(base + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + mois);
  return Utilities.formatDate(d, 'Europe/Paris', 'yyyy-MM-dd');
}

function enregistrerVehicule(d) {
  var sh = feuilleFlotte();
  var id = String(d.id || '').trim() || ('v' + new Date().getTime());
  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');

  var valeurs = [
    id,
    String(d.nom || ''),
    String(d.categorie || 'voiture'),
    String(d.modele || ''),
    String(d.immat || ''),
    String(d.miseEnCirculation || ''),
    String(d.boite || ''),
    String(d.site || ''),
    Number(d.km) || 0,
    String(d.kmLeveLe || ''),
    String(d.dernierCT || ''),
    Number(d.revisionKm) || 0,
    String(d.revisionLe || ''),
    Number(d.periodiciteKm) || 0,
    String(d.assuranceJusquau || ''),
    String(d.accessoires || ''),
    String(d.remarque || ''),
    String(d.etat || 'actif'),
    maintenant,
    String(d.indispoDu || ''),
    String(d.indispoAu || ''),
    String(d.motifIndispo || ''),
    String(d.carburant || '')
  ];

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== id) continue;
    valeurs[18] = lignes[i][18] || maintenant;
    var pl = sh.getRange(i + 1, 1, 1, valeurs.length);
    pl.setNumberFormat('@');
    pl.setValues([valeurs]);
    return { status: 'ok', id: id };
  }

  ajouterLigne(sh, valeurs);
  sh.getRange(sh.getLastRow(), 1, 1, valeurs.length).setNumberFormat('@');
  return { status: 'ok', id: id };
}

function supprimerVehicule(d) {
  var sh = feuilleFlotte();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) { sh.deleteRow(i + 1); break; }
  }
  /* Son histoire part avec lui */
  var she = feuilleFlotteEvents();
  var le = she.getDataRange().getValues();
  for (var j = le.length - 1; j >= 1; j--) {
    if (String(le[j][1]) === String(d.id)) she.deleteRow(j + 1);
  }
  return { status: 'ok' };
}

function listerEvenementsFlotte(d) {
  var sh = feuilleFlotteEvents();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(2, 1, derniere - 1, 11).getValues();
  var out = [];

  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    if (d && d.idVehicule && String(lignes[i][1]) !== String(d.idVehicule)) continue;
    out.push({
      id: String(lignes[i][0]),
      idVehicule: String(lignes[i][1]),
      type: String(lignes[i][2] || ''),
      date: dateVersIso(lignes[i][3]) || '',
      km: Number(lignes[i][4]) || 0,
      libelle: texteCellule(lignes[i][5], false),
      garage: texteCellule(lignes[i][6], false),
      cout: texteCellule(lignes[i][7], false),
      etat: String(lignes[i][8] || 'fait'),
      par: texteCellule(lignes[i][9], false)
    });
  }

  /* Les plus récents en premier */
  out.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  return out;
}

function enregistrerEvenementFlotte(d) {
  var sh = feuilleFlotteEvents();
  var id = String(d.id || '').trim() || ('e' + new Date().getTime());
  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');

  var valeurs = [
    id,
    String(d.idVehicule || ''),
    String(d.type || ''),
    String(d.date || ''),
    Number(d.km) || 0,
    String(d.libelle || ''),
    String(d.garage || ''),
    String(d.cout || ''),
    String(d.etat || 'fait'),
    String(d.par || ''),
    maintenant
  ];

  var trouve = false;
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== id) continue;
    valeurs[10] = lignes[i][10] || maintenant;
    var pl = sh.getRange(i + 1, 1, 1, valeurs.length);
    pl.setNumberFormat('@');
    pl.setValues([valeurs]);
    trouve = true;
    break;
  }
  if (!trouve) {
    ajouterLigne(sh, valeurs);
    sh.getRange(sh.getLastRow(), 1, 1, valeurs.length).setNumberFormat('@');
  }

  /* Ce qui est fait met le véhicule à jour : saisir la même chose
     deux fois est le meilleur moyen de ne plus rien savoir. */
  if (String(d.etat || 'fait') === 'fait') repercuterSurVehicule(d);

  return { status: 'ok', id: id };
}

function repercuterSurVehicule(d) {
  var sh = feuilleFlotte();
  var lignes = sh.getDataRange().getValues();

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== String(d.idVehicule)) continue;

    var km = Number(d.km) || 0;
    /* Un compteur ne recule pas : une saisie plus basse est une
       faute de frappe, on garde la valeur connue. */
    if (km && km > (Number(lignes[i][8]) || 0)) {
      sh.getRange(i + 1, 9).setValue(km);
      sh.getRange(i + 1, 10).setValue(String(d.date || ''));
    }

    if (d.type === 'ct' && d.date) {
      sh.getRange(i + 1, 11).setValue(String(d.date));
    }
    if (d.type === 'revision') {
      if (km) sh.getRange(i + 1, 12).setValue(km);
      if (d.date) sh.getRange(i + 1, 13).setValue(String(d.date));
    }
    break;
  }
}

function supprimerEvenementFlotte(d) {
  var sh = feuilleFlotteEvents();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) { sh.deleteRow(i + 1); break; }
  }
  return { status: 'ok' };
}

function feuilleProcCorriger() {
  var f = classeur();
  var sh = f.getSheetByName('ProcAcorriger');
  if (!sh) {
    sh = f.insertSheet('ProcAcorriger', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Élève', 'Messenger', 'Remarque', 'Capture',
                  'Reçu le', 'Par', 'Corrigé le', 'Corrigé par']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function listerProcCorriger() {
  var sh = feuilleProcCorriger();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  /* Sans la colonne des captures : elles sont lourdes et ne servent
     qu'à l'ouverture d'une fiche. */
  var lignes = sh.getRange(2, 1, derniere - 1, 9).getValues();
  var out = [];

  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      id: String(lignes[i][0]),
      eleve: texteCellule(lignes[i][1], false),
      messenger: texteCellule(lignes[i][2], false),
      remarque: texteCellule(lignes[i][3], false),
      aUneCapture: !!String(lignes[i][4] || ''),
      recuLe: texteCellule(lignes[i][5], false),
      par: texteCellule(lignes[i][6], false),
      corrigeLe: texteCellule(lignes[i][7], false),
      corrigePar: texteCellule(lignes[i][8], false)
    });
  }

  /* Les plus anciennes d'abord : ce sont elles qui attendent */
  out.reverse();
  return out;
}

/* La capture d'une fiche, à la demande seulement */
function captureProcCorriger(d) {
  var sh = feuilleProcCorriger();
  var lignes = sh.getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== String(d.id)) continue;
    return { status: 'ok', image: String(lignes[i][4] || '') };
  }
  return { status: 'ok', image: '' };
}

function enregistrerProcCorriger(d) {
  var sh = feuilleProcCorriger();
  var id = String(d.id || '').trim() || ('pc' + new Date().getTime());
  var lignes = sh.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== id) continue;

    if (d.eleve !== undefined) sh.getRange(i + 1, 2).setValue(String(d.eleve || ''));
    if (d.messenger !== undefined) sh.getRange(i + 1, 3).setValue(String(d.messenger || ''));
    if (d.remarque !== undefined) sh.getRange(i + 1, 4).setValue(String(d.remarque || ''));
    /* La capture n'est réécrite que si une nouvelle est fournie */
    if (d.capture) sh.getRange(i + 1, 5).setValue(String(d.capture));

    if (d.corrige !== undefined) {
      sh.getRange(i + 1, 8).setValue(String(d.corrige) === 'oui' ? maintenant : '');
      sh.getRange(i + 1, 9).setValue(String(d.corrige) === 'oui'
        ? String(d.par || '') : '');
    }
    return { status: 'ok', id: id };
  }

  ajouterLigne(sh, [id, String(d.eleve || ''), String(d.messenger || ''),
                String(d.remarque || ''), String(d.capture || ''),
                maintenant, String(d.par || ''), '', '']);
  return { status: 'ok', id: id };
}

function supprimerProcCorriger(d) {
  var sh = feuilleProcCorriger();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) { sh.deleteRow(i + 1); break; }
  }
  return { status: 'ok' };
}

function feuilleEcran() {
  var f = classeur();
  var sh = f.getSheetByName('Ecran');
  if (!sh) {
    sh = f.insertSheet('Ecran', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Type', 'Titre', 'Contenu', 'Image',
                  'Ou', 'Duree', 'Actif', 'Du', 'Au', 'Ordre', 'Par']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function listerDiapos() {
  var sh = feuilleEcran();
  var lignes = sh.getDataRange().getValues();
  var out = [];

  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      id: String(lignes[i][0]),
      type: String(lignes[i][1] || 'message'),
      titre: texteCellule(lignes[i][2], false),
      contenu: texteCellule(lignes[i][3], false),
      image: String(lignes[i][4] || ''),
      ou: String(lignes[i][5] || 'les-deux'),
      /* Zéro veut dire « en boucle » : il ne doit pas devenir 12 */
      duree: (String(lignes[i][6]) === '0') ? 0 : (Number(lignes[i][6]) || 12),
      actif: String(lignes[i][7] || '') !== 'non',
      du: dateVersIso(lignes[i][8]) || '',
      au: dateVersIso(lignes[i][9]) || '',
      ordre: Number(lignes[i][10]) || 0,
      ligne: i + 1
    });
  }

  out.sort(function (a, b) { return a.ordre - b.ordre; });
  return out;
}

function enregistrerDiapo(d) {
  var sh = feuilleEcran();
  var id = String(d.id || '').trim() || ('e' + new Date().getTime());
  var lignes = sh.getDataRange().getValues();

  var ordre = Number(d.ordre) || 0;
  if (!ordre) {
    for (var k = 1; k < lignes.length; k++) {
      ordre = Math.max(ordre, Number(lignes[k][10]) || 0);
    }
    ordre++;
  }

  var valeurs = [
    id,
    String(d.type || 'message'),
    String(d.titre || ''),
    String(d.contenu || ''),
    String(d.image || ''),
    String(d.ou || 'les-deux'),
    (String(d.duree) === '0') ? 0 : (Number(d.duree) || 12),
    (String(d.actif) === 'non') ? 'non' : 'oui',
    String(d.du || ''),
    String(d.au || ''),
    ordre,
    String(d.par || '')
  ];

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) === id) {
      /* L'image n'est renvoyée que si elle change : elle est lourde */
      if (!d.image) valeurs[4] = lignes[i][4];
      sh.getRange(i + 1, 1, 1, valeurs.length).setValues([valeurs]);
      return { status: 'ok', id: id };
    }
  }

  ajouterLigne(sh, valeurs);
  return { status: 'ok', id: id };
}

function supprimerDiapo(d) {
  var sh = feuilleEcran();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) { sh.deleteRow(i + 1); break; }
  }
  return { status: 'ok' };
}

/* Le planning du jour : qui roule avec qui, d'après les cours
   préparés. L'heure n'est pas obligatoire — elle s'ajoute à la
   main sur la préparation quand on la connaît. */
function planningDuJour(anonyme, tout, jourVoulu) {
  var sh = feuillePreparations();
  /* Le jour demandé, ou celui d'aujourd'hui par défaut */
  var auj = String(jourVoulu || '').match(/^\d{4}-\d{2}-\d{2}$/)
    ? String(jourVoulu)
    : Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
  var out = [];

  var derniere = sh.getLastRow();
  if (derniere < 2) return out;

  /* La colonne des dates d'abord, les lignes du jour ensuite : lire
     toutes les préparations depuis le début coûtait plusieurs
     secondes, et l'écran interroge chaque minute. */
  var dates = sh.getRange(2, 2, derniere - 1, 1).getValues();
  var voulues = [];
  for (var d = 0; d < dates.length; d++) {
    if (dateVersIso(dates[d][0]) === auj) voulues.push(d + 2);
  }
  if (!voulues.length) return out;

  /* Une seule lecture, du premier au dernier cours du jour : les
     préparations sont écrites dans l'ordre, la plage est courte. */
  var premiere = voulues[0];
  var derniereVoulue = voulues[voulues.length - 1];
  var bloc = sh.getRange(premiere, 1, derniereVoulue - premiere + 1, 12).getValues();

  var lignes = [null];
  for (var b = 0; b < bloc.length; b++) lignes.push(bloc[b]);

  /* Les emplacements réglés par le bureau, pour que l'écran
     affiche le bon pictogramme sans le connaître d'avance. */
  var lieux = {};
  try {
    var ll = lieuxDisponibles();
    for (var z = 0; z < ll.length; z++) {
      lieux[ll[z].cle] = { emoji: ll[z].emoji, nom: ll[z].nom };
    }
  } catch (e) { /* l'écran a ses valeurs de secours */ }

  /* Les véhicules immobilisés : l'écran doit le dire plutôt que
     d'annoncer une voiture qui n'est pas là. */
  var garage = {};
  try {
    var vs = listerFlotte();
    for (var g = 0; g < vs.length; g++) {
      if (vs[g].indisponible) {
        garage[normaliser(vs[g].nom)] = vs[g].motifIndispo || 'au garage';
      }
    }
  } catch (e) { /* sans la flotte, on affiche tel quel */ }

  /* Les noms choisis à la main pour l'affichage public. Lus UNE
     fois : une lecture par ligne rendrait l'écran illisible avant
     de le rendre juste. */
  var nomsChoisis = anonyme ? nomsAffichesDuRepertoire() : {};

  /* Ce que le bureau a réglé : véhicule, emplacement, ordre */
  var details = {};
  var libres = [];
  var masques = {};
  var toutes = lignesEcranPlanning(auj);
  for (var t = 0; t < toutes.length; t++) {
    if (toutes[t].idPrep) {
      details[toutes[t].idPrep] = toutes[t];
      if (toutes[t].masque) masques[toutes[t].idPrep] = true;
    } else if (!toutes[t].masque) {
      libres.push(toutes[t]);
    }
  }

  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    if (dateVersIso(lignes[i][1]) !== auj) continue;

    var nom = texteCellule(lignes[i][2], false);
    if (anonyme) nom = nomPublic(nom, nomsChoisis);

    /* Retirée de l'écran par le bureau : le cours reste dans les
       prochains cours du moniteur, il ne s'affiche simplement plus. */
    var estMasque = !!masques[String(lignes[i][0])];
    if (estMasque && !tout) continue;

    var det = details[String(lignes[i][0])] || {};
    var modele = texteCellule(lignes[i][4], false);

    out.push({
      id: String(lignes[i][0]),
      eleve: nom,
      /* Le nom entier sert au bureau pour retrouver la préparation ;
         l'écran, lui, n'affiche que « eleve ». */
      eleveComplet: texteCellule(lignes[i][2], false),
      modele: modele,
      site: texteCellule(lignes[i][5], false),
      moniteur: det.moniteur || texteCellule(lignes[i][10], false) ||
                texteCellule(lignes[i][8], false),
      heure: det.heure || heureDansNote(texteCellule(lignes[i][6], false)),
      vehicule: det.vehicule || '',
      /* Le motif remonte à l'écran, pas seulement l'absence */
      auGarage: garage[normaliser(det.vehicule || '')] || '',
      lieu: det.lieu || '',
      lieuEmoji: (lieux[det.lieu] || {}).emoji || '',
      lieuNom: (lieux[det.lieu] || {}).nom || '',
      /* Un cours au simulateur ne parle pas de véhicule */
      simulateur: /simul/i.test(modele),
      ordre: det.ordre || Number(lignes[i][11]) || 99,
      manuel: false,
      masque: estMasque
    });
  }

  /* Les lignes ajoutées à la main rejoignent les autres */
  /* Le bureau voit aussi ce qu'il a masqué, pour le remettre */
  var libresVues = tout
    ? toutes.filter(function (x) { return !x.idPrep; })
    : libres;

  for (var m = 0; m < libresVues.length; m++) {
    var lb = libresVues[m];
    out.push({
      id: lb.id,
      eleve: anonyme ? nomPublic(lb.eleve, nomsChoisis) : lb.eleve,
      eleveComplet: lb.eleve,
      modele: '',
      site: '',
      moniteur: lb.moniteur,
      heure: lb.heure,
      vehicule: lb.vehicule,
      auGarage: garage[normaliser(lb.vehicule || '')] || '',
      lieu: lb.lieu,
      lieuEmoji: (lieux[lb.lieu] || {}).emoji || '',
      lieuNom: (lieux[lb.lieu] || {}).nom || '',
      simulateur: /simu/i.test(lb.vehicule),
      ordre: lb.ordre || 99,
      manuel: true,
      masque: !!lb.masque
    });
  }

  /* Un cours dont l'heure est passée quitte l'écran : il occupait
     la place de ceux qui viennent. On garde un quart d'heure de
     battement, le temps que l'élève entre et trouve sa voiture.

     Sans heure, le cours reste : on ne sait pas s'il a eu lieu. */
  var vraiAuj = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');

  /* Ce filtre ne vaut que pour aujourd'hui : sur une autre date,
     aucun cours n'est passé, on les montre tous. */
  if (auj === vraiAuj) {
    var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'HH:mm');
    var limite = reculerDeQuinzeMinutes(maintenant);

    out = out.filter(function (x) {
      if (!x.heure) return true;
      return x.heure >= limite;
    });
  }

  /* L'HEURE DÉCIDE. C'EST UN PLANNING.

     C'était l'inverse : « ordre » passait avant l'heure. Et cet
     « ordre » n'est pas un choix du bureau sur l'affichage — c'est
     la colonne « Ordre » des préparations, la place que le MONITEUR
     a donnée au cours dans sa journée quand il l'a préparé. Un
     rangement fait ailleurs, pour autre chose, commandait donc
     l'écran d'accueil : le bureau devait tout remonter à la main
     après chaque préparation.

     L'heure d'abord, donc. « ordre » ne départage plus que ce que
     l'heure ne peut pas départager : deux cours à la même heure.
     Et un cours sans heure passe en dernier — on ne sait pas quand
     il tombe, il n'a pas à s'intercaler entre deux qui le savent. */
  out.sort(function (a, b) {
    if (a.heure && b.heure && a.heure !== b.heure) {
      return a.heure.localeCompare(b.heure);
    }
    if (a.heure && !b.heure) return -1;
    if (b.heure && !a.heure) return 1;
    if (a.ordre !== b.ordre) return a.ordre - b.ordre;
    return 0;
  });
  return out;
}

/* « Ambre Guillebon » devient « Ambre G. » : un écran d'accueil est
   vu par d'autres élèves et par des visiteurs. */
/* « 14:05 » devient « 13:50 » : le battement laissé aux cours qui
   viennent de commencer. */
function reculerDeQuinzeMinutes(hhmm) {
  var m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '00:00';

  var mins = Number(m[1]) * 60 + Number(m[2]) - 15;
  if (mins < 0) mins = 0;

  return ('0' + Math.floor(mins / 60)).slice(-2) + ':' +
         ('0' + (mins % 60)).slice(-2);
}

/* ------------------------------------------------------------
   LE NOM SUR L'ÉCRAN PUBLIC

   ⚠️ CETTE RÈGLE SE TROMPE, ET ON LE SAIT.

   « Le premier mot est le prénom, la dernière initiale est le
   nom » : faux dès que le prénom fait deux mots — « La Perle
   Mossongo Molodjo » devient « La M. ». Et aucune autre règle ne
   marche : rien dans la chaîne ne dit où finit le prénom.

   ON NE L'A PAS RENDUE PLUS BAVARDE POUR AUTANT, et c'est un choix.
   « Tout sauf le dernier mot » donnerait « La Perle Mossongo M. » —
   plus juste, mais plus IDENTIFIANT sur un écran de salle
   d'attente, ce qui est exactement l'inverse du but. Entre se
   tromper en montrant trop peu et se tromper en montrant trop, on
   garde trop peu.

   Le vrai remède est ailleurs : la colonne « Nom affiché » du
   répertoire, saisie à la main pour la dizaine de cas qui le
   demandent. C'est « nomPublic » qui la consulte, juste dessous.

   ⚠️ Cette fonction existe à l'identique dans cloudflare-worker.js
   et dans app/ec-ecran.js — trois exécutions différentes, une seule
   règle. test-nom-affiche.js refuse qu'elles divergent.
   ------------------------------------------------------------ */
function prenomEtInitiale(nom) {
  var bouts = String(nom || '').trim().split(/\s+/);
  if (bouts.length < 2) return bouts[0] || '';
  return bouts[0] + ' ' + bouts[bouts.length - 1].charAt(0).toUpperCase() + '.';
}

/* Le nom choisi à la main s'il existe, la règle sinon. « choisis »
   est la table rendue par nomsAffichesDuRepertoire(). */
function nomPublic(nom, choisis) {
  var propre = String(nom || '').trim();
  if (!propre) return '';
  var main = choisis ? String(choisis[normaliser(propre)] || '').trim() : '';
  return main || prenomEtInitiale(propre);
}

/* La table des noms affichés, lue une fois par écran plutôt qu'une
   fois par ligne. Vide si le répertoire est illisible : on retombe
   sur la règle, jamais sur le nom entier. */
function nomsAffichesDuRepertoire() {
  var out = {};
  try {
    var sh = feuilleEleves();
    var n = sh.getLastRow();
    if (n < 2) return out;
    var v = sh.getRange(2, 1, n - 1, COL_ELEVE_NOM_AFFICHE).getValues();
    for (var i = 0; i < v.length; i++) {
      var choisi = String(v[i][COL_ELEVE_NOM_AFFICHE - 1] || '').trim();
      if (choisi && v[i][0]) out[normaliser(v[i][0])] = choisi;
    }
  } catch (e) { /* pas de répertoire : la règle suffira */ }
  return out;
}

/* Une heure écrite à la main dans la note de préparation */
function heureDansNote(note) {
  var t = String(note || '');
  /* La mention posée par le bureau vient en premier */
  var m = t.match(/^🕐\s*(\d{1,2})[h:](\d{2})/);
  if (!m) m = t.match(/(?:^|[^\d])(\d{1,2})[h:](\d{2})/);
  if (!m) return '';
  return ('0' + m[1]).slice(-2) + ':' + m[2];
}

/* Tout ce dont un écran a besoin, en un seul appel */
/* Écrit l'heure d'un cours dans sa note de préparation : c'est elle
   que lit l'affichage. Le reste de la note est conservé. */
/* ============================================================
   LES DÉTAILS D'AFFICHAGE DU PLANNING

   Le véhicule, où il est garé, l'ordre voulu — et les lignes
   ajoutées à la main pour ce qui n'a pas de préparation.

   Feuille à part : les préparations appartiennent aux moniteurs,
   l'affichage au bureau. Chacun son fichier.
   ============================================================ */
function feuilleEcranPlanning() {
  var f = classeur();
  var sh = f.getSheetByName('EcranPlanning');
  if (!sh) {
    sh = f.insertSheet('EcranPlanning', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Id préparation', 'Jour', 'Élève', 'Moniteur',
                  'Heure', 'Véhicule', 'Lieu', 'Ordre', 'Par', 'Masqué']);
    sh.setFrozenRows(1);
    sh.getRange('F:F').setNumberFormat('@');
  }
  return sh;
}

function lignesEcranPlanning(jour) {
  var sh = feuilleEcranPlanning();
  var derniere = sh.getLastRow();
  if (derniere < 2) return [];

  var lignes = sh.getRange(1, 1, derniere, 11).getValues();
  var out = [];

  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    if (jour && dateVersIso(lignes[i][2]) !== jour) continue;
    out.push({
      id: String(lignes[i][0]),
      idPrep: String(lignes[i][1] || ''),
      jour: dateVersIso(lignes[i][2]) || '',
      eleve: texteCellule(lignes[i][3], false),
      moniteur: texteCellule(lignes[i][4], false),
      heure: heureCellule(lignes[i][5]),
      vehicule: texteCellule(lignes[i][6], false),
      lieu: String(lignes[i][7] || ''),
      ordre: Number(lignes[i][8]) || 0,
      /* Retiré de l'écran sans que la préparation du moniteur en
         soit affectée : les deux ne se commandent pas. */
      masque: String(lignes[i][10] || '') === 'oui',
      ligne: i + 1
    });
  }
  return out;
}

function enregistrerLigneEcran(d) {
  var sh = feuilleEcranPlanning();
  var id = String(d.id || '').trim() || ('l' + new Date().getTime());
  var lignes = sh.getDataRange().getValues();

  var valeurs = [
    id,
    String(d.idPrep || ''),
    String(d.jour || ''),
    String(d.eleve || ''),
    String(d.moniteur || ''),
    String(d.heure || ''),
    String(d.vehicule || ''),
    String(d.lieu || ''),
    Number(d.ordre) || 0,
    String(d.par || ''),
    /* La colonne du masque était lue mais jamais écrite : retirer
       une ligne de l'écran ne laissait aucune trace. */
    (String(d.masque) === 'oui') ? 'oui' : ''
  ];

  /* ⚠️ ABSENT N'EST PAS VIDE — et ça vaut pour quatre colonnes.

     Le masque n'était touché que s'il était fourni : enregistrer un
     véhicule ne doit pas remettre la ligne à l'écran.

     ⚠️ L'HEURE, LA VOITURE ET LE LIEU SUIVENT LA MÊME RÈGLE — v1035.
     Le bureau pose parfois la voiture à la main sur l'affichage, pour
     un cours qu'un rappel avait créé sans elle. Un rappel renvoyé
     derrière, muet sur la voiture, réécrivait la ligne ENTIÈRE et
     effaçait ce travail, sans rien dire. L'écran de l'affichage, lui,
     envoie toujours ses trois champs : il garde donc le pouvoir de
     les vider.

     ⚠️ ET LA RÈGLE EST LA MÊME QUE DANS LE WORKER, mot pour mot —
     voir enregistrerLigneEcranRapide. C'est lui qui écrit presque
     toujours ; deux portes pour un geste, c'est déjà une de trop,
     deux portes qui ne se gardent pas pareil, c'est la garantie que
     l'une des deux fera le dégât. */
  var GARDEES_ECRAN = { 5: 'heure', 6: 'vehicule', 7: 'lieu', 10: 'masque' };
  function garderCeQuiNEstPasDit(ancienne) {
    Object.keys(GARDEES_ECRAN).forEach(function (i) {
      if (d[GARDEES_ECRAN[i]] === undefined) {
        valeurs[i] = (ancienne && ancienne[i]) || '';
      }
    });
  }

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) === id) {
      garderCeQuiNEstPasDit(lignes[i]);
      var pl = sh.getRange(i + 1, 1, 1, valeurs.length);
      pl.setNumberFormat('@');
      pl.setValues([valeurs]);
      return { status: 'ok', id: id };
    }
  }

  /* Un détail posé sur une préparation ne se duplique pas */
  if (d.idPrep) {
    for (var j = 1; j < lignes.length; j++) {
      if (String(lignes[j][1]) === String(d.idPrep)) {
        valeurs[0] = String(lignes[j][0]);
        garderCeQuiNEstPasDit(lignes[j]);
        var p2 = sh.getRange(j + 1, 1, 1, valeurs.length);
        p2.setNumberFormat('@');
        p2.setValues([valeurs]);
        return { status: 'ok', id: valeurs[0] };
      }
    }
  }

  ajouterLigne(sh, valeurs);
  sh.getRange(sh.getLastRow(), 1, 1, valeurs.length).setNumberFormat('@');
  return { status: 'ok', id: id };
}

function supprimerLigneEcran(d) {
  var sh = feuilleEcranPlanning();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) === String(d.id)) { sh.deleteRow(i + 1); break; }
  }
  return { status: 'ok' };
}

/* Le ménage : les lignes des jours passés ne servent plus */
function menageEcranPlanning() {
  var sh = feuilleEcranPlanning();
  var lignes = sh.getDataRange().getValues();
  var auj = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
  for (var i = lignes.length - 1; i >= 1; i--) {
    var j = dateVersIso(lignes[i][2]);
    if (j && j < auj) sh.deleteRow(i + 1);
  }
}

function heureDuCours(d) {
  var sh = feuillePreparations();
  var lignes = sh.getDataRange().getValues();

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== String(d.id)) continue;

    var note = String(lignes[i][6] || '');
    /* On retire l'ancienne mention avant d'écrire la nouvelle */
    note = note.replace(/^🕐\s*\d{1,2}[h:]\d{2}\s*\n?/, '');

    var heure = String(d.heure || '').trim();
    if (heure) note = '🕐 ' + heure.replace(':', 'h') + '\n' + note;

    sh.getRange(i + 1, 7).setValue(note);
    return { status: 'ok' };
  }
  return { status: 'error', message: 'Cours introuvable.' };
}

function contenuEcran(params) {
  var ou = String(params.ou || 'accueil');

  /* ------------------------------------------------------------
     LE PLANNING S'AFFICHE EN PRÉNOM ET INITIALE, PAR DÉFAUT

     L'anonymisation était OPTIONNELLE : sans « &anonyme=1 » dans
     l'adresse du téléviseur, le planning du jour s'affichait avec
     les noms complets — en salle d'attente, et côté rue en mode
     vitrine. Un réglage qu'il faut penser à mettre est un réglage
     qu'on oublie.

     Le défaut est donc inversé. Pour afficher les noms entiers, il
     faut le demander expressément avec « &complet=1 » — et la
     vitrine, elle, ne l'accepte jamais : ce qui se voit depuis le
     trottoir n'a pas à nommer les élèves.
     ------------------------------------------------------------ */
  var complet = String(params.complet || '') === '1' && ou !== 'vitrine';
  var anonyme = !complet;

  var diapos = listerDiapos().filter(function (d) {
    if (!d.actif) return false;
    if (d.ou !== 'les-deux' && d.ou !== ou) return false;

    /* Une diapo peut n'être affichée qu'entre deux dates */
    var auj = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
    if (d.du && auj < d.du) return false;
    if (d.au && auj > d.au) return false;
    return true;
  });

  /* Le fond et le panneau de texte ne tournent pas : ils restent
     affichés en permanence, les autres défilent par-dessus. */
  var fond = null;
  var panneau = null;
  var bandeaux = [];
  var tournantes = [];

  for (var k = 0; k < diapos.length; k++) {
    if (diapos[k].type === 'fond' && !fond) fond = diapos[k];
    else if (diapos[k].type === 'panneau' && !panneau) panneau = diapos[k];
    else if (diapos[k].type === 'bandeau') bandeaux.push(diapos[k]);
    else tournantes.push(diapos[k]);
  }

  return {
    status: 'ok',
    diapos: tournantes,
    fond: fond,
    panneau: panneau,
    /* Les textes défilants : ils se suivent en une seule bande */
    bandeaux: bandeaux,
    planning: (ou === 'accueil') ? planningDuJour(anonyme) : [],
    /* Le cours qui commence prend-il tout l'écran ? Actif tant qu'on
       ne l'a pas coupé : c'est le comportement voulu au quotidien.
       On le coupe le temps d'un contrôle, pour que les diapositives
       gardent l'écran et que les cours restent dans leur liste. */
    pleinEcran: String(pleinEcranReglage()) !== 'non',
    /* ⚠️ COMBIEN DE TEMPS, ET RÉGLABLE — v203.

       David, le 9 septembre 2026 : « est-ce que tu peux faire en
       sorte que je puisse changer le temps manuellement ». C'était
       cinq minutes avant et cinq après, écrites en dur dans
       ecran.html — l'écran de la vitrine ne se met pas à jour d'un
       clic, et personne n'allait toucher au code pour ça.

       Vides, ils valent cinq : un réglage jamais touché se comporte
       comme avant. */
    minutesAvant: minutesEcranReglage('ecranMinutesAvant'),
    minutesApres: minutesEcranReglage('ecranMinutesApres'),
    jour: Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd'),
    heure: Utilities.formatDate(new Date(), 'Europe/Paris', 'HH:mm')
  };
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    /* LA SERRURE, AVANT TOUT LE RESTE. Voir porteFermee(). */
    if (porteFermee(data.action, data.secret)) {
      return reponseJson({ status: 'error', message: 'Acces refuse.' });
    }

    /* LE JOURNAL, AVANT LES AIGUILLAGES.

       Il était appelé deux cents lignes plus bas, donc APRÈS les
       « return » de dix-huit actions qui modifient le classeur :
       suppression d'un dossier élève, suppression d'un bilan,
       import de liste, dépôts en banque, SMS envoyés, résultats
       d'examen… aucune n'entrait au journal, et l'alerte « plus de
       cinq suppressions dans la journée » ne pouvait pas se
       déclencher.

       Ici, il voit tout passer. Il ne retient rien de plus pour
       autant : journaliser() ne garde que les actions nommées dans
       LIBELLES_ACTION, et une lecture n'y figure pas. */
    journaliser(data.action, data);

    /* La serrure, en clair, pour savoir si elle est armée. Sans
       cette réponse, on croirait avoir fermé une porte laissée
       ouverte. Elle ne dit PAS le secret : seulement s'il y en a
       un, et si celui qui demande l'a. */
    if (data.action === 'diagnostic') {
      return reponseJson({
        status: 'ok',
        version: VERSION_SCRIPT,
        serrure: secretAttendu() ? 'armee' : 'ouverte',
        secretRecu: data.secret ? 'oui' : 'non',
        secretJuste: secretAttendu()
          ? memeSecret(data.secret, secretAttendu()) : null,
        /* Le ménage n'écrit dans 🚨 Signalements que lorsqu'il a
           fait quelque chose. Sans cette date, rien ne distingue
           « rien à faire » de « le déclencheur n'a jamais été
           posé » — et un ménage qui ne tourne pas ressemble
           exactement à un ménage qui ne trouve rien. */
        menageDernierPassage: (function () {
          try {
            return String(PropertiesService.getScriptProperties()
              .getProperty('menageDernierPassage') || '');
          } catch (e) { return ''; }
        })()
      });
    }

    /* Le lien d'un cours. Il passe par doPost et non par doGet :
       les appels GET vers ce script se font refuser par Google
       avant même d'arriver ici (400 et page d'erreur HTML), alors
       que le POST est le chemin qu'emprunte déjà toute
       l'application. Le jeton fait l'autorisation à lui seul. */
    if (data.action === 'cours') {
      return reponseJson(lireLienCours(data.c));
    }
    if (data.action === 'coursConfirmer') {
      return reponseJson(confirmerLienCours(data.c));
    }
    /* La carte de chaque cours préparé dit si l'élève a répondu :
       une seule lecture pour toute la liste, pas une par cours. */
    if (data.action === 'confirmationsList') {
      return reponseJson({ status: 'ok', confirmations: confirmationsParJeton() });
    }

    /* Suppression complète du dossier d'un élève */
    if (data.action === 'supprimerEleve') {
      return reponseJson(supprimerEleve(data.eleve));
    }

    /* Le ménage : il PROPOSE, il n'exécute pas. La suppression
       passe par « supprimerEleve », la même que partout ailleurs —
       un second chemin d'effacement finirait par en oublier une
       feuille. */
    if (data.action === 'departTachesList') {
      return reponseJson(listerDepartTaches(data));
    }
    if (data.action === 'departTachesSet') {
      return reponseJson(enregistrerDepartTaches(data));
    }

    if (data.action === 'dossierEleve') {
      return reponseJson(dossierEleve(data));
    }

    /* L'archive part AVANT tout effacement : voir archiverDossier. */
    if (data.action === 'archiverDossier') {
      return reponseJson(archiverDossier(data));
    }

    if (data.action === 'menageList') {
      return reponseJson(menagePropositions());
    }
    if (data.action === 'menageRecitations') {
      return reponseJson(effacerRecitationsDe(data));
    }

    /* Cours préparés à l'avance */
    if (data.action === 'prepAdd') {
      return reponseJson(ajouterPreparation(data));
    }
    if (data.action === 'prepDiag') {
      return reponseJson(diagnosticPreparations());
    }

    if (data.action === 'msgBandeauList') {
      return reponseJson(listerMessagesBandeau(data));
    }
    if (data.action === 'msgBandeauSet') {
      return reponseJson(enregistrerMessageBandeau(data));
    }
    if (data.action === 'msgBandeauDelete') {
      return reponseJson(supprimerMessageBandeau(data));
    }
    if (data.action === 'msgBandeauVu') {
      return reponseJson(marquerMessageVu(data));
    }
    if (data.action === 'msgBandeauRelance') {
      return reponseJson(relancerMessageBandeau(data));
    }

    if (data.action === 'notifList') {
      return reponseJson(listerNotifsMasquees());
    }
    if (data.action === 'notifMasquer') {
      return reponseJson(masquerNotif(data));
    }
    if (data.action === 'notifReafficher') {
      return reponseJson(reafficherNotif(data));
    }

    if (data.action === 'ecouteList') {
      return reponseJson(listerEcoutes());
    }
    if (data.action === 'ecouteSet') {
      return reponseJson(enregistrerEcoute(data));
    }
    if (data.action === 'ecouteDelete') {
      return reponseJson(supprimerEcoute(data));
    }

    if (data.action === 'tacheList') {
      return reponseJson(listerTaches());
    }
    if (data.action === 'tacheSet') {
      return reponseJson(enregistrerTache(data));
    }
    if (data.action === 'tacheImage') {
      return reponseJson(imageTache(data));
    }
    if (data.action === 'tacheDelete') {
      return reponseJson(supprimerTache(data));
    }

    if (data.action === 'lieuxList') {
      return reponseJson(listerLieux(data));
    }
    if (data.action === 'lieuAdd') {
      return reponseJson(ajouterLieu(data));
    }
    if (data.action === 'lieuSet') {
      return reponseJson(majLieu(data));
    }

    if (data.action === 'corrList') {
      return reponseJson(listerCorrections(data));
    }
    if (data.action === 'corrAdd') {
      return reponseJson(ajouterCorrection(data));
    }
    if (data.action === 'corrSet') {
      return reponseJson(majCorrection(data));
    }

    if (data.action === 'regleIaAdd') {
      return reponseJson(ajouterRegleIA(data));
    }
    if (data.action === 'regleIaList') {
      return reponseJson(listerReglesIA(data));
    }
    if (data.action === 'regleIaSet') {
      return reponseJson(activerRegleIA(data));
    }

    if (data.action === 'bilanSupprimer') {
      return reponseJson(supprimerBilan(data));
    }

    if (data.action === 'bilansRecents') {
      return reponseJson(bilansRecents(data));
    }
    if (data.action === 'coursDemarre') {
      return reponseJson(demarrerCours(data));
    }
    if (data.action === 'coursFini') {
      return reponseJson(finirCours(data));
    }
    if (data.action === 'coursRetirer') {
      return reponseJson(retirerEnCours(data));
    }
    if (data.action === 'coursEnCours') {
      return reponseJson(listerEnCours());
    }

    if (data.action === 'smsLog') {
      return reponseJson(enregistrerSms(data));
    }
    if (data.action === 'smsList') {
      return reponseJson(listerSms(data));
    }

    if (data.action === 'bilanMaj') {
      return reponseJson(majBilanComplet(data));
    }
    if (data.action === 'bilanModifier') {
      return reponseJson(modifierBilan(data));
    }
    if (data.action === 'incidentAdd') {
      return reponseJson(enregistrerIncident(data));
    }
    if (data.action === 'incidentList') {
      return reponseJson(listerIncidents(data));
    }
    if (data.action === 'incidentDelete') {
      return reponseJson(supprimerIncidents(data));
    }
    if (data.action === 'depotAdd') {
      return reponseJson(enregistrerDepot(data));
    }
    if (data.action === 'depotList') {
      return reponseJson(listerDepots(data));
    }
    if (data.action === 'depotDelete') {
      return reponseJson(supprimerDepot(data));
    }
    if (data.action === 'coutIaAdd') {
      return reponseJson(enregistrerCoutIa(data));
    }
    if (data.action === 'coutIaList') {
      return reponseJson(listerCoutsIa(data));
    }
    if (data.action === 'coursLienCreer') {
      return reponseJson(creerLienCours(data));
    }
    if (data.action === 'noteInterneList') {
      return reponseJson(listerNotesInternes());
    }
    if (data.action === 'noteInterneSet') {
      return reponseJson(enregistrerNoteInterne(data));
    }

    if (data.action === 'elevesImport') {
      return reponseJson(importerEleves(data));
    }
    if (data.action === 'fichesList') {
      return reponseJson(listerFiches());
    }
    if (data.action === 'ficheSet') {
      return reponseJson(enregistrerFicheEleve(data));
    }
    if (data.action === 'eleveRetirer') {
      return reponseJson(retirerEleveRepertoire(data.eleve));
    }
    if (data.action === 'eleveRenommer') {
      return reponseJson(renommerEleve(data));
    }

    if (data.action === 'captureAdd') {
      return reponseJson(ajouterCapture(data));
    }
    if (data.action === 'captureList') {
      return reponseJson(listerCaptures(data));
    }
    if (data.action === 'captureDelete') {
      return reponseJson(supprimerCapture(data.id));
    }

    if (data.action === 'resultatAnnuler') {
      return reponseJson(annulerResultat(data));
    }
    if (data.action === 'resultatAdd') {
      return reponseJson(enregistrerResultat(data));
    }
    if (data.action === 'resultatList') {
      return reponseJson(listerResultats(data));
    }
    if (data.action === 'resultatMoniteur') {
      return reponseJson(majMoniteurDuResultat(data));
    }

    if (data.action === 'modeleList') {
      return reponseJson(listerModeles());
    }
    if (data.action === 'modeleSet') {
      return reponseJson(enregistrerModele(data));
    }
    if (data.action === 'modeleDelete') {
      return reponseJson(supprimerModele(data.id));
    }

    if (data.action === 'journalList') {
      return reponseJson(lireJournal(data));
    }

    if (data.action === 'prepDelete') {
      return reponseJson(supprimerPreparation(data.id, data.demandeur, data.role));
    }
    if (data.action === 'prepAssign') {
      return reponseJson(reattribuerPreparation(data.id, data.moniteur));
    }
    if (data.action === 'sessionReprise') {
      return reponseJson(reprendreDatesEnSessions(data));
    }

    if (data.action === 'sessionList') {
      return reponseJson(listerSessions());
    }
    if (data.action === 'sessionSet') {
      return reponseJson(enregistrerSession(data));
    }
    if (data.action === 'sessionPlace') {
      return reponseJson(majPlaceSession(data));
    }
    /* Les places vidées du 9 septembre, et de quoi les rendre */
    if (data.action === 'placesPerdues') {
      return reponseJson(placesPerduesSession(data));
    }
    if (data.action === 'placeRemettre') {
      return reponseJson(remettreSurPlace(data));
    }
    if (data.action === 'ecranPlanningJour') {
      /* Le planning d'une date choisie, pour préparer à l'avance */
      return reponseJson({ status: 'ok',
                           planning: planningDuJour(false, true, data.jour) });
    }
    if (data.action === 'ecranPlanning') {
      try { menageEcranPlanning(); } catch (e) { /* sans importance */ }
      return reponseJson({ status: 'ok', planning: planningDuJour(false, true) });
    }
    if (data.action === 'ecranLigneSet') {
      return reponseJson(enregistrerLigneEcran(data));
    }
    if (data.action === 'ecranLigneDelete') {
      return reponseJson(supprimerLigneEcran(data));
    }
    if (data.action === 'ecranHeure') {
      return reponseJson(heureDuCours(data));
    }

    if (data.action === 'paieList') {
      return reponseJson({ status: 'ok',
                           salaries: listerSalaries(),
                           semaines: listerSemainesPaie(data),
                           absences: listerAbsencesPaie(),
                           gasoil: listerGasoil(),
                           clotures: listerCloturesPaie(),
                           rattachements: listerRattachements() });
    }
    /* --- L'espace élève --- */
    if (data.action === 'eleveConnexion') {
      var acc = accesEleve(String(data.eleve || ''));
      /* ⚠️ UNE FORMATION FINIE N'EST PAS UN CODE FAUX — v1038.

         Son code est bon, son nom est bon : lui répondre « Nom ou
         code incorrect » l'enverrait au bureau chercher un code qui
         marche déjà. On le dit, et on le félicite quand il y a de
         quoi. Le code n'est pas vérifié pour autant : on ne révèle
         rien qu'il ne sache déjà sur lui-même. */
      if (acc && acc.sorti && acc.code === String(data.code || '').trim()) {
        return reponseJson({ status: 'error',
          message: (acc.sorti === 'permis')
            ? 'Bravo, tu as ton permis 🎉 Ton coin révisions se ferme ici. ' +
              "Toute l'équipe d'Évolution Conduites te souhaite bonne route !"
            : "Ton coin révisions est fermé. Si c'est une erreur, " +
              "appelle l'auto-école." });
      }
      if (!acc || !acc.actif ||
          acc.code !== String(data.code || '').trim()) {
        return reponseJson({ status: 'error', message: 'Nom ou code incorrect.' });
      }
      /* Un an sans venir : la clé ne vaut plus. Le message est
         différent d'un code faux — il n'y a rien à cacher ici, et
         l'élève doit savoir à qui s'adresser. */
      if (codePerime(acc)) {
        return reponseJson({ status: 'error',
          message: "Ton accès a expiré. Demande un nouveau code à l'auto-école." });
      }
      noterVisiteEleve(acc.eleve);
      /* Sa boîte : celle du bureau d'abord, sinon celle qu'il a
         déclarée. Sans l'une ni l'autre, on la lui demandera. */
      var saBoite = boiteDeLEleve(acc.eleve) || acc.boite || '';

      return reponseJson({ status: 'ok', eleve: acc.eleve,
                           modules: acc.modules,
                           langue: acc.langue || '',
                           langues: languesDisponibles(),
                           boite: saBoite,
                           /* Verrouillée si le bureau l'a fixée */
                           boiteFigee: !!boiteDeLEleve(acc.eleve),
                           /* Sa formation, plus ce que le bureau lui a
                              ouvert en plus depuis les codes du coin
                              révisions. */
                           procedures: proceduresDeLEleve(saBoite, acc.enPlus),
                           demandes: listerDemandes({ eleve: acc.eleve }) });
    }
    if (data.action === 'eleveRecitations') {
      var a2 = accesEleve(String(data.eleve || ''));
      if (!a2 || !a2.actif || a2.code !== String(data.code || '').trim()) {
        return reponseJson({ status: 'error', message: 'Accès refusé.' });
      }
      return reponseJson({ status: 'ok',
                           recitations: listerRecitations({ eleve: a2.eleve }),
                           demandes: listerDemandes({ eleve: a2.eleve }) });
    }
    /* ---------- Le parcours : groupes et guides — v1029 ---------- */
    if (data.action === 'parcoursList') {
      return reponseJson({ status: 'ok',
                           groupes: listerGroupes(),
                           guides: listerGuides('', false) });
    }
    if (data.action === 'parcoursGuide') {
      var tousG = listerGuides('', true);
      var vise = null;
      for (var iG = 0; iG < tousG.length; iG++) {
        if (tousG[iG].id === String(data.id || '')) { vise = tousG[iG]; break; }
      }
      return reponseJson({ status: 'ok', guide: vise });
    }
    if (data.action === 'annoncesList') {
      return reponseJson(Object.assign({ status: 'ok' }, ecranDesAnnonces()));
    }
    if (data.action === 'annonceSet') {
      return reponseJson(enregistrerAnnonce(data));
    }
    if (data.action === 'annonceRetirer') {
      return reponseJson(retirerAnnonce(data));
    }
    if (data.action === 'eleveDepart') {
      return reponseJson(noterDepartEleve(data));
    }
    if (data.action === 'parcoursSuivi') {
      var suivi = suiviDuParcours();
      return reponseJson({ status: 'ok', lignes: suivi.lignes,
                           guides: suivi.guides });
    }
    if (data.action === 'parcoursGroupeSet') {
      return reponseJson(enregistrerGroupe(data));
    }
    if (data.action === 'parcoursGuideSet') {
      return reponseJson(enregistrerGuide(data));
    }
    if (data.action === 'parcoursGuideDelete') {
      return reponseJson(supprimerGuide(data));
    }
    if (data.action === 'parcoursOrdre') {
      return reponseJson(ordonnerParcours(data));
    }

    /* ============================================================
       SON DOSSIER : LE PROCHAIN COURS ET SES LEÇONS — v1026

       ⚠️ LA VÉRIFICATION DES MODULES EST ICI, PAS DANS LA PAGE.

       Les cases à cocher du bureau ne commandaient rien : le
       serveur les enregistrait, les renvoyait, et eleve.html ne les
       lisait nulle part. Les faire commander l'AFFICHAGE seulement
       aurait été la même faute déguisée — une carte cachée reste
       une donnée envoyée, et elle s'ouvre avec deux clics.

       Le module fermé ne cache donc pas la carte : IL NE REMPLIT
       PAS LA RÉPONSE. Ce qui n'est pas ouvert ne quitte jamais le
       classeur.
       ============================================================ */
    /* ============================================================
       ⚠️ LA PRÉSENCE, DEPUIS SON ESPACE — v1056

       Le module « rappel » est celui qui montre son prochain cours :
       c'est donc lui qui décide. Sans lui, l'élève ne voit pas le
       cours, et il n'a rien à confirmer.
       ============================================================ */
    if (data.action === 'elevePresence') {
      var apr = accesEleve(String(data.eleve || ''));
      if (!apr || !apr.actif || apr.code !== String(data.code || '').trim()) {
        return reponseJson({ status: 'error', message: 'Accès refusé.' });
      }
      if ((apr.modulesListe || []).indexOf('rappel') === -1) {
        return reponseJson({ status: 'error', message: 'Accès refusé.' });
      }
      return reponseJson(confirmerPresenceEleve(apr.eleve));
    }

    if (data.action === 'eleveDossier') {
      var ad = accesEleve(String(data.eleve || ''));
      if (!ad || !ad.actif || ad.code !== String(data.code || '').trim()) {
        return reponseJson({ status: 'error', message: 'Accès refusé.' });
      }
      if (codePerime(ad)) {
        return reponseJson({ status: 'error',
          message: "Ton accès a expiré. Demande un nouveau code à l'auto-école." });
      }
      var ouv = ad.modulesListe || [];
      /* ⚠️ LE PROCHAIN COURS, LU UNE SEULE FOIS — v1056. Il sert
         deux fois maintenant : à l'afficher, et à savoir s'il a déjà
         confirmé sa présence. prochainCoursDeLEleve rouvre le
         planning à chaque appel ; deux appels, c'est deux lectures
         de la même feuille pour la même réponse. */
      var procE = (ouv.indexOf('rappel') !== -1)
        ? prochainCoursDeLEleve(ad.eleve) : null;
      if (procE) {
        try {
          procE.confirmeLe = presenceDuProchainCours(ad.eleve, procE);
        } catch (e) { procE.confirmeLe = ''; }
      }
      return reponseJson({ status: 'ok',
        modules: ad.modules,
        prochain: procE,
        lecons: (ouv.indexOf('historique') !== -1)
          ? leconsDeLEleve(ad.eleve) : [],
        /* ⚠️ LES ANNONCES NE DÉPENDENT D'AUCUN INTERRUPTEUR — v1038.

           « Le bureau sera fermé samedi » s'adresse à tout le monde,
           y compris à celui à qui l'on n'a ouvert que les
           procédures. En faire un sixième module, c'était se donner
           une case de plus à penser pour une information qu'on veut
           justement voir arriver chez tous.

           Le tri est fait dans annoncesDeLEleve : il ne reçoit que
           celles qui le concernent, et jamais la liste des autres
           destinataires. */
        annonces: annoncesDeLEleve(ad.eleve),
        /* ⚠️ ET SON PARCOURS PART AVEC — v1039.

           La page le demandait dans un SECOND appel. Or chaque appel
           réveille ce classeur, et le réveil coûte à lui seul une
           dizaine de secondes : l'élève attendait deux fois pour une
           seule page. Les deux réponses se lisent au même endroit et
           au même moment — elles partent ensemble.

           Le tri reste ici : module fermé, la réponse part vide. */
        parcours: ((ad.modulesListe || []).indexOf('parcours') !== -1)
          ? parcoursDeLEleve(ad.eleve)
          : { etapes: [], faits: 0, avant: null } });
    }
    /* ============================================================
       SON PARCOURS — v1036, étape 4

       ⚠️ LE MODULE FERMÉ NE REMPLIT PAS LA RÉPONSE, il ne cache pas
       une carte. Même règle qu'eleveDossier, et pour la même raison :
       une carte cachée reste une donnée envoyée, et elle s'ouvre
       avec deux clics dans les outils du navigateur.
       ============================================================ */
    if (data.action === 'eleveParcours') {
      var ap4 = accesEleve(String(data.eleve || ''));
      if (!ap4 || !ap4.actif || ap4.code !== String(data.code || '').trim()) {
        return reponseJson({ status: 'error', message: 'Accès refusé.' });
      }
      if (codePerime(ap4)) {
        return reponseJson({ status: 'error',
          message: "Ton accès a expiré. Demande un nouveau code à l'auto-école." });
      }
      if ((ap4.modulesListe || []).indexOf('parcours') === -1) {
        return reponseJson({ status: 'ok', etapes: [], faits: 0, avant: null });
      }
      var pc4 = parcoursDeLEleve(ap4.eleve);
      return reponseJson({ status: 'ok', etapes: pc4.etapes,
                           faits: pc4.faits, avant: pc4.avant });
    }

    if (data.action === 'eleveParcoursVu') {
      var ap5 = accesEleve(String(data.eleve || ''));
      if (!ap5 || !ap5.actif || ap5.code !== String(data.code || '').trim()) {
        return reponseJson({ status: 'error', message: 'Acces refuse.' });
      }
      if ((ap5.modulesListe || []).indexOf('parcours') === -1) {
        return reponseJson({ status: 'error', message: 'Acces refuse.' });
      }
      /* ⚠️ ON NE COCHE QUE CE QU'IL A LE DROIT DE VOIR. Sans ce
         contrôle, un identifiant de guide tapé à la main cocherait
         une étape d'un groupe qu'on ne lui a jamais ouvert — et sa
         progression dirait n'importe quoi. */
      /* ============================================================
         ⚠️ ET LE SEGMENT AUSSI DOIT ÊTRE LE SIEN — v1056

         Le contrôle vérifiait que le GUIDE lui était ouvert. Depuis
         qu'une coche porte aussi un segment, un identifiant de
         segment tapé à la main aurait écrit une ligne pour un
         segment qui n'existe pas — ou qui appartient à un autre
         guide. Sa progression aurait alors compté des choses
         introuvables, et le bureau aurait lu « 8 sur 7 ».

         Le segment vide reste permis : c'est le guide entier, la
         forme que posent les écrans d'avant cette version.
         ============================================================ */
      var segDit = String(data.segment || '').trim();
      var sien = null;
      parcoursDeLEleve(ap5.eleve).etapes.forEach(function (e) {
        if (e.id === String(data.guide || '')) sien = e;
      });
      if (!sien) {
        return reponseJson({ status: 'error', message: 'Étape inconnue.' });
      }
      if (segDit && !(sien.segments || []).some(function (sg) {
        return sg.id === segDit;
      })) {
        return reponseJson({ status: 'error', message: 'Segment inconnu.' });
      }
      return reponseJson(noterGuideVu({ eleve: ap5.eleve, guide: data.guide,
                                        segment: segDit, vu: data.vu }));
    }

    if (data.action === 'eleveEnvoyer') {
      var a3 = accesEleve(String(data.eleve || ''));
      if (!a3 || !a3.actif || a3.code !== String(data.code || '').trim()) {
        return reponseJson({ status: 'error', message: 'Accès refusé.' });
      }
      /* Réciter une procédure demandée solde la demande */
      try { soldeDemande(a3.eleve, data.procedure); } catch (e) { /* l'envoi prime */ }

      /* La langue vient de l'accès, pas de ce que l'élève déclare :
         sinon l'autorisation ne servirait à rien. */
      var langueDite = String(data.langue || '');
      if (langueDite && langueDite !== a3.langue) langueDite = '';

      var rec = enregistrerRecitation({
        eleve: a3.eleve,
        procedure: data.procedure,
        texte: data.texte,
        langue: langueDite,
        etat: 'attente'
      });
      rec.langue = langueDite;

      /* Le mail à préparer part avec la réponse : le Worker
         l'expédie sans que l'élève ait à attendre. */
      var regEnv = lireReglages();
      /* La correction d'office se règle par catégorie de procédure :
         le bureau peut la vouloir sur la remorque et nulle part
         ailleurs. C'est ici, et seulement ici, que ça se décide —
         le Worker se contente d'obéir à iaAuto. */
      rec.iaAuto = iaAutoPourProcedure(String(data.procedure || ''), regEnv);
      /* Si l'IA doit corriger, on attend sa proposition pour
         écrire : un mail « rien à voir » suivi d'un second serait
         deux fois trop. */
      rec.mailAPreparer = rec.iaAuto ? null : prevenirCorrectionAttendue({
        cas: 'attente',
        eleve: a3.eleve,
        procedure: String(data.procedure || ''),
        texte: String(data.texte || ''),
        langue: langueDite,
        envoyeLe: Utilities.formatDate(new Date(), 'Europe/Paris',
                                       'dd/MM/yyyy HH:mm')
      });

      return reponseJson(rec);
    }
    /* Appelées par le Worker pour préparer la correction */
    if (data.action === 'eleveTexteProcedureParNom') {
      var pr = procedureParNom(String(data.nom || ''));
      return reponseJson({
        status: 'ok',
        texte: pr ? pr.texte : '',
        /* Comment corriger celle-ci : le Worker en fait sa consigne */
        ordre: pr ? pr.ordre : false,
        consigne: pr ? pr.consigne : ''
      });
    }
    if (data.action === 'recitationCorrigee') {
      var maj = enregistrerRecitation({
        id: data.id, correction: data.correction,
        langue: data.langue, traduction: data.traduction,
        correctionTraduite: data.correctionTraduite
      });

      /* L'envoi sans relecture : fermé par défaut, ouvert par un
         administrateur seulement. */
      var regA = lireReglages();
      var envoiAuto = (String(regA.envoiAutoProcedures || '') === 'oui');

      try {
        var shA = feuilleRecitations();
        var lgA = shA.getDataRange().getValues();
        for (var y = 1; y < lgA.length; y++) {
          if (String(lgA[y][0]) !== String(data.id)) continue;

          var laRecit = {
            eleve: texteCellule(lgA[y][1], false),
            procedure: texteCellule(lgA[y][2], false),
            texte: texteCellule(lgA[y][3], false),
            envoyeLe: texteCellule(lgA[y][7], false),
            langue: String(lgA[y][10] || ''),
            traduction: String(data.traduction || lgA[y][11] || ''),
            correction: String(data.correction || '')
          };

          if (envoiAuto) {
            enregistrerRecitation({ id: data.id, etat: 'valide', par: 'IA' });
            maj.mailEleve = envoyerCorrectionEleve({
              eleve: laRecit.eleve,
              procedure: laRecit.procedure,
              texte: laRecit.texte,
              correction: String(data.correctionTraduite || data.correction || '')
            });
          }

          /* Le bureau apprend en même temps ce qui s'est passé */
          maj.mailAPreparer = prevenirCorrectionAttendue(
            Object.assign({ cas: envoiAuto ? 'envoye' : 'proposee' }, laRecit));
          break;
        }
      } catch (e) { /* le moniteur validera à la main */ }

      /* La proposition est prête : le bureau reçoit le mail complet */
      try {
        var sh = feuilleRecitations();
        var lg = sh.getDataRange().getValues();
        for (var w = 1; w < lg.length; w++) {
          if (String(lg[w][0]) !== String(data.id)) continue;
          /* Le bureau a déjà été prévenu à la réception : un
             second mail pour la même récitation n'apprendrait
             rien de plus. */
          break;
        }
      } catch (e) { /* l'enregistrement prime */ }

      return reponseJson(maj);
    }

    if (data.action === 'eleveBoite') {
      var ab = accesEleve(String(data.eleve || ''));
      if (!ab || !ab.actif || ab.code !== String(data.code || '').trim()) {
        return reponseJson({ status: 'error', message: 'Accès refusé.' });
      }
      /* Le bureau prime, et une déclaration ne se refait pas */
      if (boiteDeLEleve(ab.eleve) || ab.boite) {
        return reponseJson({ status: 'error', message: 'Déjà renseigné.' });
      }
      var v = (String(data.boite || '').toUpperCase() === 'BEA') ? 'BEA' : 'BV';
      enregistrerAccesEleve({ eleve: ab.eleve, code: ab.code, boite: v });
      return reponseJson({ status: 'ok', boite: v,
                           procedures: proceduresDeLEleve(v, ab.enPlus) });
    }

    /* Le code d'UN espace élève, pour le lui envoyer.

       Il ne voyage plus dans la liste : celle-ci les rendait tous
       d'un coup. Ici, un nom, un code, et le journal note qui l'a
       demandé — le droit, lui, est vérifié par le Worker. */
    if (data.action === 'accesEleveCode') {
      var accCode = accesEleve(String(data.eleve || ''));
      if (!accCode) {
        return reponseJson({ status: 'error', message: 'Aucun accès pour cet élève.' });
      }
      return reponseJson({ status: 'ok', eleve: accCode.eleve || String(data.eleve || ''),
                           code: String(accCode.code || '') });
    }

    if (data.action === 'eleveTexteProcedure') {
      return reponseJson({ status: 'ok', texte: texteProcedure(data.id) });
    }

    /* --- Côté bureau --- */
    if (data.action === 'lieuxList') {
      return reponseJson({ status: 'ok', lieux: lieuxDisponibles() });
    }
    if (data.action === 'languesList') {
      return reponseJson({ status: 'ok', langues: languesDisponibles() });
    }
    if (data.action === 'annulerRattrapage') {
      return reponseJson(annulerRattrapageFormations());
    }
    if (data.action === 'rattraperFormations') {
      return reponseJson(rattraperFormations());
    }
    if (data.action === 'almaList') {
      return reponseJson({ status: 'ok', paiements: listerPaiementsAlma() });
    }
    if (data.action === 'almaSet') {
      return reponseJson(enregistrerPaiementAlma(data));
    }
    if (data.action === 'almaDelete') {
      return reponseJson(supprimerPaiementAlma(data));
    }
    if (data.action === 'res2rAdd')  return reponseJson(noterResultat2R(data));
    if (data.action === 'res2rList') return reponseJson(listerResultats2R(data));
    if (data.action === 'brouillonSet')    return reponseJson(deposerBrouillon(data));
    if (data.action === 'brouillonList')   return reponseJson(listerBrouillons(data));
    if (data.action === 'brouillonEtat')   return reponseJson(etatBrouillon(data));

    /* La CB Gasoil */
    if (data.action === 'cbList')        return reponseJson(listerCbGasoil(data));
    if (data.action === 'cbEvent')       return reponseJson(evenementCbGasoil(data));
    if (data.action === 'cbPleinSet')    return reponseJson(majPleinCbGasoil(data));
    if (data.action === 'cbPleinDelete') return reponseJson(supprimerPleinCbGasoil(data));
    if (data.action === 'brouillonDelete') return reponseJson(effacerBrouillon(data));
    if (data.action === 'placesbeList') {
      return reponseJson({ status: 'ok', demandes: listerPlacesBE() });
    }
    if (data.action === 'placesbeSet')    return reponseJson(enregistrerPlaceBE(data));
    if (data.action === 'placesbeDelete') return reponseJson(supprimerPlaceBE(data));
    if (data.action === 'peList')   return reponseJson(lirePoleEmploi());
    if (data.action === 'peSet')    return reponseJson(ecrirePoleEmploi(data));
    if (data.action === 'peDelete') return reponseJson(supprimerPoleEmploi(data));
    if (data.action === 'codeamList')   return reponseJson(lireCodeAmenage());
    if (data.action === 'codeamSet')    return reponseJson(ecrireCodeAmenage(data));
    if (data.action === 'codeamDelete') return reponseJson(supprimerCodeAmenage(data));
    if (data.action === 'handicapList') {
      return reponseJson(lireHandicap());
    }
    if (data.action === 'handicapSet') {
      return reponseJson(ecrireHandicap(data));
    }
    if (data.action === 'handicapDelete') {
      return reponseJson(supprimerHandicap(data));
    }
    if (data.action === 'seancesEtg') {
      return reponseJson(lireSeancesEtg());
    }
    if (data.action === 'etgCorriger') {
      return reponseJson(ecrireCorrectionEtg(data));
    }
    if (data.action === 'accesElevesList') {
      /* Le catalogue et ce que chaque formation donne, calculés ICI
         et une seule fois. L'écran n'a plus qu'à cocher : la règle
         de « qui voit quoi » reste écrite à un seul endroit, et ne
         peut pas se mettre à diverger de ce que l'élève reçoit. */
      var cat = toutesLesProcedures();
      var parBoite = {};
      ['BE', 'BV', 'BEA', ''].forEach(function (b) {
        parBoite[b] = proceduresPubliques(b).map(function (p) { return p.id; });
      });
      return reponseJson({ status: 'ok', acces: listerAccesEleves(),
                           procedures: cat, parBoite: parBoite });
    }
    if (data.action === 'accesEleveSet') {
      /* Un nouveau code se demande expressément */
      if (String(data.nouveauCode || '') === 'oui') {
        data.code = String(Math.floor(100000 + Math.random() * 900000));
      }
      return reponseJson(enregistrerAccesEleve(data));
    }
    if (data.action === 'accesEleveDelete') {
      return reponseJson(supprimerAccesEleve(data));
    }
    if (data.action === 'etatMails') {
      var q = 0;   /* le quota appartient à OVH, pas au classeur */
      var echecs = [];
      try {
        var shM = classeur().getSheetByName('MailsEchoues');
        if (shM && shM.getLastRow() > 1) {
          var der = shM.getLastRow();
          var deb = Math.max(2, der - 9);
          var le = shM.getRange(deb, 1, der - deb + 1, 4).getValues();
          for (var y = le.length - 1; y >= 0; y--) {
            echecs.push({ quand: texteCellule(le[y][0], false),
                          type: texteCellule(le[y][1], false),
                          vers: texteCellule(le[y][2], false),
                          motif: texteCellule(le[y][3], false) });
          }
        }
      } catch (e) { /* pas encore d'échec */ }
      return reponseJson({ status: 'ok', quota: q, echecs: echecs });
    }
    if (data.action === 'reglagesList') {
      return reponseJson({ status: 'ok', reglages: lireReglages() });
    }
    if (data.action === 'reglageSet') {
      return reponseJson(ecrireReglage(data));
    }
    if (data.action === 'demanderProcedures') {
      return reponseJson(demanderProcedures(data));
    }
    if (data.action === 'demandesList') {
      return reponseJson({ status: 'ok', demandes: listerDemandes(data) });
    }
    if (data.action === 'demandeSet') {
      return reponseJson(enregistrerDemande(data));
    }
    if (data.action === 'demandeDelete') {
      return reponseJson(supprimerDemande(data));
    }
    if (data.action === 'recitationsList') {
      return reponseJson({ status: 'ok', recitations: listerRecitations(null) });
    }
    if (data.action === 'recitationSet') {
      var res = enregistrerRecitation(data);

      /* Validée : l'élève la reçoit aussi par mail */
      if (String(data.etat || '') === 'valide' && String(data.mail || '') !== 'non') {
        /* Le mail à composer, que le Worker expédiera */
        res.mail = envoyerCorrectionEleve({
          eleve: String(data.eleveNom || ''),
          procedure: String(data.procedureNom || ''),
          texte: String(data.texte || ''),
          correction: String(data.correction || '')
        });
      }
      return reponseJson(res);
    }
    if (data.action === 'contactEleve') {
      return reponseJson({ status: 'ok', contact: contactEleve(data.eleve) });
    }
    if (data.action === 'recitationDelete') {
      return reponseJson(supprimerRecitation(data));
    }

    if (data.action === 'paieRattacher') {
      return reponseJson(enregistrerRattachement(data));
    }
    if (data.action === 'paieGasoilSet') {
      return reponseJson(enregistrerGasoil(data));
    }
    if (data.action === 'paieGasoilDelete') {
      return reponseJson(supprimerGasoil(data));
    }
    if (data.action === 'paieSalarieSet') {
      return reponseJson(enregistrerSalarie(data));
    }
    if (data.action === 'paieSalarieDelete') {
      return reponseJson(supprimerSalarie(data));
    }
    if (data.action === 'paieSemaineSet') {
      return reponseJson(enregistrerSemainePaie(data));
    }
    if (data.action === 'paieOrdre') {
      return reponseJson(enregistrerOrdreSalaries(data));
    }
    if (data.action === 'paieCloturerMois') {
      return reponseJson(cloturerLeMois(data));
    }
    if (data.action === 'paieRouvrirMois') {
      return reponseJson(rouvrirLeMois(data));
    }
    if (data.action === 'paieClotureSet') {
      return reponseJson(enregistrerCloturePaie(data));
    }
    if (data.action === 'paieClotureDelete') {
      return reponseJson(supprimerCloturePaie(data));
    }
    if (data.action === 'paieSemaineDelete') {
      return reponseJson(supprimerSemainePaie(data));
    }
    if (data.action === 'paieAbsenceSet') {
      return reponseJson(enregistrerAbsencePaie(data));
    }
    if (data.action === 'paieAbsenceDelete') {
      return reponseJson(supprimerAbsencePaie(data));
    }

    if (data.action === 'flotteList') {
      return reponseJson({ status: 'ok', vehicules: listerFlotte(),
                           evenements: listerEvenementsFlotte(data) });
    }
    if (data.action === 'flotteSet') {
      return reponseJson(enregistrerVehicule(data));
    }
    if (data.action === 'flotteDelete') {
      return reponseJson(supprimerVehicule(data));
    }
    if (data.action === 'flotteEventSet') {
      return reponseJson(enregistrerEvenementFlotte(data));
    }
    if (data.action === 'carrosserieList') {
      return reponseJson(listerCarrosserie());
    }
    if (data.action === 'dommageSet') {
      return reponseJson(enregistrerDommage(data));
    }
    if (data.action === 'dommageDelete') {
      return reponseJson(supprimerDommage(data.id));
    }
    if (data.action === 'dommagePhoto') {
      return reponseJson(photoDommage(data));
    }
    if (data.action === 'flotteEventDelete') {
      return reponseJson(supprimerEvenementFlotte(data));
    }

    if (data.action === 'procCorrigerList') {
      return reponseJson({ status: 'ok', fiches: listerProcCorriger() });
    }
    if (data.action === 'procCorrigerCapture') {
      return reponseJson(captureProcCorriger(data));
    }
    if (data.action === 'procCorrigerSet') {
      return reponseJson(enregistrerProcCorriger(data));
    }
    if (data.action === 'procCorrigerDelete') {
      return reponseJson(supprimerProcCorriger(data));
    }

    if (data.action === 'ecranList') {
      return reponseJson({ status: 'ok', diapos: listerDiapos() });
    }
    if (data.action === 'ecranSet') {
      return reponseJson(enregistrerDiapo(data));
    }
    if (data.action === 'ecranDelete') {
      return reponseJson(supprimerDiapo(data));
    }

    if (data.action === 'sessionGroupe') {
      return reponseJson(marquerGroupeSession(data));
    }

    if (data.action === 'sessionDelete') {
      return reponseJson(supprimerSession(data));
    }

    if (data.action === 'prepOrdre') {
      return reponseJson(ordonnerPreparations(data));
    }

    if (data.action === 'prepList') {
      return reponseJson({ preparations: listerPreparations() });
    }

    /* Consignes du bureau */
    if (data.action === 'consigneAdd') {
      return reponseJson(ajouterConsigne(data));
    }
    if (data.action === 'consigneList') {
      return reponseJson({ consignes: listerConsignes(data.eleve) });
    }
    if (data.action === 'consigneEffacerEleve') {
      return reponseJson(effacerConsignesEleve(data.eleve));
    }
    if (data.action === 'consigneDone') {
      return reponseJson(marquerConsigneTraitee(data.id));
    }
    if (data.action === 'bureauEtat') {
      /* « reglages » : les nombres que le bureau règle lui-même, dans
         un seul sac. Un sac plutôt qu'une clé par réglage, pour que
         le prochain seuil n'oblige pas à retoucher le serveur — et
         il arrive avec bureauEtat, donc sans appel de plus. */
      return reponseJson({ eleves: etatEleves(), consignes: listerConsignes(''),
                           suivi: listerSuivi(),
                           places: lireConfig('places'),
                           reglages: lireConfig('reglages') });
    }
    if (data.action === 'suiviSet') {
      return reponseJson(enregistrerSuivi(data));
    }

    /* Le rendez-vous théorique : le bureau ouvre un tour, lit la
       grille, retient un créneau. La réponse des élèves, elle, passe
       par la route publique de doGet/doPost — voir plus bas. */
    if (data.action === 'rvtOuvrir') {
      return reponseJson(rvtTourOuvrir(data));
    }
    if (data.action === 'rvtList') {
      return reponseJson(listerRvt());
    }
    if (data.action === 'rvtEnvois') {
      return reponseJson(noterEnvoisRvt(data));
    }
    /* Un tour n'est pas une liste close : on y ajoute des familles,
       on y ajoute ou on y déplace des créneaux, tant qu'il est
       ouvert. */
    if (data.action === 'rvtAjouter') {
      return reponseJson(rvtAjouter(data));
    }
    if (data.action === 'rvtCreneaux') {
      return reponseJson(rvtCreneaux(data));
    }
    /* Annuler un rendez-vous déjà retenu : le tour rouvre */
    if (data.action === 'rvtAnnuler') {
      return reponseJson(annulerRvt(data));
    }
    /* Couper (ou rendre) l'accès au site d'une famille */
    if (data.action === 'rvtAcces') {
      return reponseJson(rvtAcces(data));
    }
    if (data.action === 'rvtRetenir') {
      return reponseJson(retenirRvt(data));
    }
    if (data.action === 'rvtFermer') {
      return reponseJson(fermerRvt(data));
    }

    /* PUBLIC — le jeton fait l'autorisation, comme le lien de cours.
       « rvt » LIT et n'écrit rien : les messageries ouvrent les liens
       toutes seules. « rvtRepondre » écrit, et n'arrive que par un
       clic sur la page. */
    if (data.action === 'rvt') {
      return reponseJson(lireRvt(data.r));
    }
    if (data.action === 'rvtRepondre') {
      return reponseJson(repondreRvt(data));
    }

    /* Le Worker a déjà écrit la ligne par l'API : il ne reste que
       le placement dans la session, qui demande de la logique. */
    /* Le Worker a déjà renvoyé la liste par l'API : il ne reste
       que le ménage, qui recoupe avec les bilans et supprime les
       préparations déjà faites. Une fois par heure. */
    if (data.action === 'prepMenage') {
      try { listerPreparations(); } catch (e) {}
      return reponseJson({ status: 'ok' });
    }

    /* ⚠️ LA VOIE DE SECOURS DU TRACÉ — v222.

       Le Worker écrit les trajets en direct. Il ne peut pas le
       faire tant que la feuille n'existe pas : Cloudflare lit et
       écrit, le classeur reste celui qui crée. Le tout premier
       trajet arrive donc ici, feuilleTrajets() crée l'onglet avec
       ses en-têtes, la ligne s'écrit, et les suivants passent en
       direct sans plus jamais réveiller le classeur.

       C'est aussi le filet si l'accès direct tombe : mieux vaut un
       réveil du classeur qu'un tracé perdu. */
    if (data.action === 'trajetSet') {
      return reponseJson(enregistrerTrajet(data));
    }

    /* Relire le tracé d'un cours. Cloudflare le fait normalement
       lui-même — ceci est le filet, comme pour l'écriture. */
    if (data.action === 'trajetGet') {
      return reponseJson(lireTrajet(data));
    }

    if (data.action === 'suiviSessionSeule') {
      try {
        var iso = dateVersIso(data.datePermis);
        if (iso && data.eleve) {
          placerDansSession(String(data.eleve), iso, String(data.centre || ''),
                            String(data.heurePermis || ''),
                            String(data.typeExamen || ''));
        }
        /* ⚠️ EFFACÉE, PAS ILLISIBLE — LA GARDE MANQUAIT ICI, v223.

           C'est la règle qui a coûté une journée de sessions le
           9 septembre, et elle n'était posée que sur UNE des deux
           portes qui font ce geste. Celle-ci, qui écrit exactement
           la même chose, s'en passait : une date dans un format
           qu'on n'a pas prévu — « 14 sept. 2026 », une coquille de
           mois — rendait une chaîne vide, et cette ligne prenait ce
           silence pour un ordre. Elle vidait les places.

           Le silence n'est pas une instruction. On ne retire
           quelqu'un que si une MAIN a effacé la date, pas si une
           machine n'a pas su la lire. Une date écrite mais
           incomprise reste sur la fiche, lisible par un humain,
           réparable.

           ⚠️ ET LA RÈGLE EST LA MÊME DES DEUX CÔTÉS, mot pour mot :
           voir enregistrerSuivi. Deux portes pour un geste, c'est
           déjà une de trop ; deux portes qui ne se gardent pas
           pareil, c'est la garantie que l'une des deux fera le
           dégât. */
        else if (data.datePermis !== undefined && !iso && data.eleve &&
                 String(data.datePermis || '').trim() === '') {
          retirerDesSessions(String(data.eleve));
        }
      } catch (e) { /* la session se rattrapera au prochain passage */ }

      return reponseJson({ status: 'ok' });
    }
    if (data.action === 'suiviDelete') {
      return reponseJson(supprimerSuivi(data.eleve));
    }
    if (data.action === 'configSet') {
      return reponseJson(ecrireConfig(data.cle, data.valeur));
    }

    var horodatage = String(data.horodatage || '');
    if (!horodatage) {
      var fuseauFeuille = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
      horodatage = Utilities.formatDate(new Date(), fuseauFeuille, 'dd/MM/yyyy HH:mm');
    }

    var valeurs = [
      String(data.date || ''),
      String(data.site || ''),
      String(data.monitorName || ''),
      String(data.studentName || ''),
      String(data.bilan || ''),
      String(data.typeBilan || ''),
      String(data.noteInterne || ''),
      horodatage,
      String(data.boite || ''),
      String(data.ants || ''),
      String(data.manoeuvres || ''),
      /* ⚠️ L'ÉTAT DU RELEVÉ GPS, COLONNE L — v1033.

         David, le 18 septembre : « le relevé GPS sur la ligne du
         bilan, pour que la prochaine fois on n'ait plus à se dépêcher
         de regarder avant de valider ».

         ⚠️ IL COURAIT CONTRE LA MONTRE, ET C'ÉTAIT NOTRE FAUTE. Les
         nombres du 🛰️ — points, couverture, relances, écran non
         maintenu — ne vivaient QUE dans la colonne N de Brouillons, et
         effacerBrouillon SUPPRIME la ligne à la validation. Le seul
         moment où on pouvait les lire était donc avant de valider :
         après, le cours était muet pour toujours.

         ⚠️ ET LE TRACÉ NE BOUCHE PAS LE TROU. Il a sa propre feuille,
         mais trajetPourEnvoi ne rend rien quand le relevé est
         incomplet : un cours dont le GPS a raté n'a NI tracé NI
         diagnostic. C'est-à-dire que le seul cours qu'on veuille
         comprendre est précisément celui qui ne laisse rien.

         Des NOMBRES, pas des coordonnées — même règle qu'au brouillon.
         Le tracé ne voyage qu'avec le bilan, la note de service
         l'annonce ainsi, et déposer des positions ferait un suivi
         permanent des salariés que la CNIL interdit. */
      String(data.gps || '').slice(0, 4000)
    ];

    /* La fiche de l'élève apprend sa formation si elle l'ignore */
    try {
      completerFormation(String(data.studentName || ''),
                         String(data.typeBilan || ''));
    } catch (e) { /* le bilan prime */ }

    var sh = feuille();
    /* ⚠️ LA GRILLE PEUT ÊTRE PLUS ÉTROITE QUE LA LIGNE. Une feuille
       rognée à onze colonnes fait lever setValues, et le bilan serait
       perdu pour une colonne de diagnostic — on élargit d'abord. */
    if (sh.getMaxColumns() < valeurs.length) {
      sh.insertColumnsAfter(sh.getMaxColumns(),
                            valeurs.length - sh.getMaxColumns());
    }
    if (sh.getLastColumn() < valeurs.length) {
      sh.getRange(1, valeurs.length).setValue('Relevé GPS');
    }
    var ligne = sh.getLastRow() + 1;
    var plage = sh.getRange(ligne, 1, 1, valeurs.length);

    /* Format texte imposé AVANT l'écriture : sans cela Sheets
       transforme les dates et décale les heures. */
    plage.setNumberFormat('@');
    plage.setValues([valeurs]);

    /* La ligne écrite est renvoyée : elle permet de corriger le bilan
       ou sa note ensuite, au lieu d'en créer un second. */
    return reponseJson({ status: 'ok', ligne: ligne, noteRecue: !!data.noteInterne });
  } catch (err) {
    return reponseJson({ status: 'error', message: err.message });
  }
}

/* ============================================================
   LA CARROSSERIE — LES DOMMAGES D'UN VÉHICULE

   David, le 8 septembre 2026 : « noter les rayures, les chocs
   avec les dates et les réparations ».

   ⚠️ UN DOMMAGE EST UNE VUE ET DEUX POURCENTAGES.

   Pas un point sur un dessin, pas une coordonnée dans un modèle 3D :
   « côté conducteur, à 62 % de la longueur, 40 % de la hauteur ».
   C'est ce qui permet de redessiner la silhouette d'une A3 ou d'un
   Q3 sans perdre une seule rayure — et de relire tout ça dans le
   classeur, à la main, dans dix ans.
   ============================================================ */
function feuilleDommages() {
  var f = classeur();
  var sh = f.getSheetByName('FlotteDommages');
  if (!sh) {
    sh = f.insertSheet('FlotteDommages', f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Id vehicule', 'Vue', 'X', 'Y', 'Type', 'Gravite',
                  'Constate le', 'Par', 'Detail', 'Etat', 'Repare le',
                  'Garage', 'Cout', 'Photo', 'Cree le']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* ⚠️ LA PHOTO NE VOYAGE PAS AVEC LA LISTE.

   Une photo pèse à elle seule plus que trente dommages. Envoyée
   dans la liste, elle rendrait l'écran lent pour une image que
   personne ne regarde tant qu'il n'ouvre pas la fiche. On dit
   seulement QU'IL Y EN A UNE ; elle se demande à l'ouverture. */
function listerCarrosserie() {
  var vehicules = [];
  try {
    var shv = feuilleFlotte();
    var lv = shv.getDataRange().getValues();
    for (var i = 1; i < lv.length; i++) {
      if (!lv[i][0]) continue;
      vehicules.push({
        id: String(lv[i][0]),
        nom: texteCellule(lv[i][1], false),
        categorie: texteCellule(lv[i][2], false),
        modele: texteCellule(lv[i][3], false),
        immat: texteCellule(lv[i][4], false),
        etat: texteCellule(lv[i][17], false) || 'actif'
      });
    }
  } catch (e) { /* pas de flotte : la liste sera vide */ }

  var dommages = [];
  try {
    var sh = feuilleDommages();
    var l = sh.getDataRange().getValues();
    for (var k = 1; k < l.length; k++) {
      if (!l[k][0]) continue;
      dommages.push({
        id: String(l[k][0]),
        idVehicule: String(l[k][1]),
        vue: texteCellule(l[k][2], false),
        x: Number(l[k][3]) || 0,
        y: Number(l[k][4]) || 0,
        type: texteCellule(l[k][5], false),
        gravite: texteCellule(l[k][6], false),
        constateLe: texteCellule(l[k][7], false),
        par: texteCellule(l[k][8], false),
        detail: texteCellule(l[k][9], false),
        etat: texteCellule(l[k][10], false),
        repareLe: texteCellule(l[k][11], false),
        garage: texteCellule(l[k][12], false),
        cout: texteCellule(l[k][13], false),
        aPhoto: !!String(l[k][14] || '').trim()
      });
    }
  } catch (e) { /* pas encore de dommages */ }

  return { status: 'ok', vehicules: vehicules, dommages: dommages };
}

function photoDommage(d) {
  var sh = feuilleDommages();
  var l = sh.getDataRange().getValues();
  for (var i = 1; i < l.length; i++) {
    if (String(l[i][0]) === String(d.id)) {
      return { status: 'ok', photo: String(l[i][14] || '') };
    }
  }
  return { status: 'error', message: 'Dommage introuvable.' };
}

function enregistrerDommage(d) {
  var sh = feuilleDommages();
  var id = String(d.id || '').trim() || ('dm' + new Date().getTime());
  var l = sh.getDataRange().getValues();

  var ligne = sh.getLastRow() + 1;
  var ancienne = null;
  for (var i = 1; i < l.length; i++) {
    if (String(l[i][0]) === id) { ligne = i + 1; ancienne = l[i]; break; }
  }

  /* ⚠️ UNE PHOTO VIDE N'EFFACE PAS CELLE QUI EST LÀ.

     Un moniteur qui rouvre la fiche pour cocher « réparé » n'a pas
     rechargé la photo : envoyer sa case vide effacerait l'image que
     quelqu'un avait prise. Le client dit « photo: "" » quand il n'a
     rien de neuf ; on garde alors l'ancienne. */
  var photo = String(d.photo || '');
  if (!photo && ancienne) photo = String(ancienne[14] || '');

  var valeurs = [
    id,
    String(d.idVehicule || ''),
    String(d.vue || ''),
    Number(d.x) || 0,
    Number(d.y) || 0,
    String(d.type || ''),
    String(d.gravite || ''),
    String(d.constateLe || ''),
    String(d.par || ''),
    String(d.detail || ''),
    String(d.etat || 'areparer'),
    String(d.repareLe || (ancienne ? ancienne[11] : '') || ''),
    String(d.garage || (ancienne ? ancienne[12] : '') || ''),
    String(d.cout || (ancienne ? ancienne[13] : '') || ''),
    photo,
    ancienne ? String(ancienne[15] || '')
             : Utilities.formatDate(new Date(),
                 SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(),
                 'dd/MM/yyyy HH:mm')
  ];

  var plage = sh.getRange(ligne, 1, 1, valeurs.length);
  plage.setNumberFormat('@');
  plage.setValues([valeurs]);
  return { status: 'ok', id: id };
}

function supprimerDommage(id) {
  var sh = feuilleDommages();
  var l = sh.getDataRange().getValues();
  for (var i = l.length - 1; i >= 1; i--) {
    if (String(l[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      return { status: 'ok' };
    }
  }
  return { status: 'error', message: 'Dommage introuvable.' };
}


/* ============================================================
   LES TRAJETS — v222, lot 3 du GPS

   Un tracé de cours : la ligne du chemin, sa longueur, sa durée,
   et les repères que le moniteur a posés. Le téléphone le relève,
   l'élève en reçoit une carte dans son bilan, et cette feuille en
   garde la trace — deux mois, pas plus (voir MENAGE_TECHNIQUE).

   ⚠️ C'EST UNE DONNÉE DE DÉPLACEMENT, et donc une donnée
   personnelle à part entière. Elle entre dans le dossier que
   l'élève peut réclamer, et elle part quand on efface son nom :
   les trois endroits qui le disent sont dossierEleve,
   effacerTracesEleve et OU_LE_NOM_EST_ECRIT. Une feuille présente
   dans l'une et absente d'une autre, c'est une promesse écrite
   dans l'onglet 🔒 RGPD et non tenue.

   ⚠️ ET TOUJOURS AUCUNE VITESSE. La CNIL interdit d'utiliser un
   dispositif de géolocalisation pour contrôler le respect des
   limitations de vitesse. Il n'y a pas de colonne pour ça, et il
   ne doit jamais y en avoir : ni vitesse, ni horodatage de
   passage point par point — un relevé horodaté de chaque point
   serait un journal de déplacement.

   ⚠️ LA DATE DU COURS SE LIT EN JJ/MM/AAAA. C'est ce que
   jourComparable sait lire, et c'est lui que le ménage emploie.
   Une date écrite en ISO ici ferait passer toute la feuille pour
   « sans date » — et une ligne sans date, le ménage n'y touche
   jamais. Le tracé resterait alors pour toujours.
   ============================================================ */
var NOM_ONGLET_TRAJETS = 'Trajets';

/* La colonne du nom, et celle de la date : écrites une fois ici,
   et relues par le ménage et par les trois portes du RGPD. Trois
   nombres recopiés à la main dans quatre fichiers, c'est trois
   occasions de se tromper d'une colonne. */
var TRAJET_COL_DATE = 1;
var TRAJET_COL_ELEVE = 2;

function feuilleTrajets() {
  var f = classeur();
  var sh = f.getSheetByName(NOM_ONGLET_TRAJETS);
  if (!sh) {
    sh = f.insertSheet(NOM_ONGLET_TRAJETS, f.getNumSheets());
    ajouterLigne(sh, ['Id', 'Date du cours', 'Élève', 'Moniteur', 'Site',
                      'Kilomètres', 'Minutes', 'Début', 'Fin',
                      'Tracé (polyligne)', 'Repères', 'Enregistré le']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* Le tracé d'un cours. Écrit ici seulement quand le Worker n'a pas
   pu le faire lui-même — voir la note de « trajetSet » plus bas.
   Les colonnes sont celles de feuilleTrajets, dans l'ordre. */
function enregistrerTrajet(d) {
  var nom = String(d.eleve || '').trim();
  if (!nom) return { status: 'error', message: 'Trajet sans élève.' };

  var trace = String(d.trace || '');
  if (!trace) return { status: 'error', message: 'Trajet sans tracé.' };

  var reperes = [];
  try {
    var brut = d.reperes;
    if (typeof brut === 'string') brut = JSON.parse(brut);
    if (Object.prototype.toString.call(brut) === '[object Array]') {
      /* ⚠️ EXACTEMENT CE QUE RANGE CLOUDFLARE — v1010 / script v225.

         Cette fonction est le SECOURS : elle n'écrit que lorsque le
         Worker n'a pas pu le faire. Deux secours qui ne rangent pas
         la même chose, c'est une feuille dont on ne sait plus lire
         la moitié des lignes — et on ne s'en aperçoit que le jour
         où l'on essaie de la relire. Voir enregistrerTrajetRapide
         dans cloudflare-worker.js ; le test compare les deux.

         La POSITION et la NATURE sont désormais gardées : sans
         elles, un trajet relu rend un trait sans ses pastilles. Le
         tracé entier est déjà dans la colonne d'à côté — on
         n'ajoute aucun lieu, on dit lequel porte une marque.

         Le thème et les deux remarques, eux, restent dehors : ils
         sont déjà dans le bilan de l'élève. */
      var naturesConnues = ['repere', 'attention', 'elim'];
      reperes = brut.slice(0, 40).map(function (r) {
        var t = String((r && r.type) || '');
        return { n: parseInt((r && r.n) || 0, 10) || 0,
                 heure: String((r && r.heure) || '').slice(0, 5),
                 nom: String((r && r.nom) || '').slice(0, 120),
                 type: (naturesConnues.indexOf(t) >= 0) ? t : 'repere',
                 lat: Number((r && r.lat) || 0) || '',
                 lon: Number((r && r.lon) || 0) || '' };
      });
    }
  } catch (e) { /* des repères illisibles ne perdent pas le tracé */ }

  var sh = feuilleTrajets();
  ajouterLigne(sh, ['t' + Date.now().toString(36),
                    String(d.date || ''),
                    nom,
                    String(d.moniteur || ''),
                    String(d.site || ''),
                    String(d.km || ''),
                    String(d.minutes || ''),
                    String(d.debut || ''),
                    String(d.fin || ''),
                    trace.slice(0, 45000),
                    JSON.stringify(reperes),
                    Utilities.formatDate(new Date(), 'Europe/Paris',
                                         'dd/MM/yyyy HH:mm')]);

  return { status: 'ok', ligne: sh.getLastRow() };
}


/* ---------- PRÉPARATIONS : cours préparés à l'avance ---------- */
var NOM_ONGLET_PREP = 'Preparations';

function feuillePreparations() {
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
  var sh = classeur.getSheetByName(NOM_ONGLET_PREP);
  if (!sh) {
    sh = classeur.insertSheet(NOM_ONGLET_PREP);
    ajouterLigne(sh, ['Id', 'Date du cours', 'Élève', 'Type', 'Libellé',
                  'Site', 'Note', 'Contexte', 'Préparé par', 'Créé le',
                  'Attribué à', 'Ordre']);
  }
  return sh;
}

function listerPreparations() {
  var sh = feuillePreparations();
  var lignes = sh.getDataRange().getValues();

  /* Le recoupement avec les bilans coûtait 600 lignes lues à chaque
     affichage. Il ne se fait plus qu'une fois par heure : une
     préparation qui traîne quelques minutes de plus ne gêne
     personne, une liste qui met huit secondes à s'ouvrir, si. */
  var faits = null;
  var quand = 0;
  try {
    quand = Number(PropertiesService.getScriptProperties()
      .getProperty('menagePrepas') || 0);
  } catch (e) { /* pas de propriétés : on fera le ménage */ }

  /* On note l'heure AVANT de lire les bilans : sinon, plusieurs
     moniteurs arrivant ensemble déclenchaient chacun le ménage,
     et attendaient tous. */
  if (Date.now() - quand > 3600000) {
    try {
      PropertiesService.getScriptProperties()
        .setProperty('menagePrepas', String(Date.now()));
      faits = bilansParEleve();
    } catch (e) { /* tant pis, on recommencera */ }
  }

  var aSupprimer = [];
  var out = [];

  /* COMBIEN DE PRÉPARATIONS PAR ÉLÈVE ET PAR JOUR.

     Il en faut le compte AVANT de décider quoi que ce soit : deux
     leçons le même jour, c'est deux préparations, et un seul bilan
     n'en solde qu'une. Un premier passage rien que pour compter. */
  var prepasParJour = {};
  if (faits) {
    for (var c = 1; c < lignes.length; c++) {
      if (!lignes[c][0]) continue;
      var kc = normaliser(lignes[c][2]) + '|' + dateVersIso(lignes[c][1]);
      prepasParJour[kc] = (prepasParJour[kc] || 0) + 1;
    }
  }

  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;

    /* LE MÉNAGE : une préparation dont le cours a eu lieu s'en va.

       Deux cas, et seulement deux :

       · UN BILAN PLUS TARD que la préparation. Le cours a eu lieu,
         ou il a été sauté — dans les deux cas la préparation est
         périmée. C'était déjà la règle, mais au sens LARGE (« ou
         après »), et c'est ce « ou » qui coûtait cher.

       · AUTANT DE BILANS QUE DE PRÉPARATIONS CE JOUR-LÀ. Là
         seulement, tout ce qui était prévu ce jour est fait.

       ⚠️ ET SURTOUT : TANT QU'IL EN RESTE UNE À FAIRE, ON N'EN
       SUPPRIME AUCUNE. Deux leçons, un bilan : on garde les deux
       cartes. La bonne s'en ira au bilan suivant.

       On pourrait deviner laquelle des deux est déjà passée — par
       l'ordre du moniteur, par l'heure de création. On ne le fait
       pas : se tromper effacerait la préparation du cours À VENIR,
       et elle est irrécupérable. Une carte qui traîne une heure de
       trop se voit et se referme ; une préparation supprimée ne se
       réclame pas. */
    if (faits) {
      var cle = normaliser(lignes[i][2]);
      var jour = dateVersIso(lignes[i][1]);
      var f = faits[cle];

      if (f && jour) {
        var plusTard = f.dernier > jour;
        var duJour = f.jours[jour] || 0;
        var prevues = prepasParJour[cle + '|' + jour] || 1;

        /* ⚠️ CRÉÉE APRÈS LE DERNIER BILAN : ELLE EST DEVANT, PAS
           DERRIÈRE — v201.

           David, le 8 septembre, sur Ania Belarbi : « ça provient
           d'un rappel et elle avait déjà un cours à 10h ». Le cours
           de 10h était fait ; le rappel de 13h a créé la préparation
           suivante ; le comptage voyait un bilan et une préparation,
           et supprimait celle du cours À VENIR.

           Un bilan ne peut pas être celui d'une préparation qui
           n'existait pas encore. Quand les deux moments sont
           lisibles et que la préparation est la plus récente, on la
           garde — dans tous les autres cas, le comptage décide comme
           avant : on ne change rien à ce qui marchait. */
        var creeLe = momentDeTexte(lignes[i][9]);
        var deviseSuivante = (creeLe !== null && f.moment !== null &&
                              creeLe > f.moment);

        if (!deviseSuivante && (plusTard || duJour >= prevues)) {
          aSupprimer.push(i + 1);
          continue;
        }
      }
    }

    out.push({
      id: String(lignes[i][0]),
      date: texteCellule(lignes[i][1], false),
      eleve: texteCellule(lignes[i][2], false),
      modele: texteCellule(lignes[i][3], false),
      modeleLabel: texteCellule(lignes[i][4], false),
      site: texteCellule(lignes[i][5], false),
      note: texteCellule(lignes[i][6], false),
      contexte: texteCellule(lignes[i][7], false),
      /* Qui doit faire le cours : l'attributaire s'il existe,
         sinon celui qui l'a préparé. */
      moniteur: texteCellule(lignes[i][10], false) ||
                texteCellule(lignes[i][8], false),
      preparePar: texteCellule(lignes[i][8], false),
      /* La place voulue par le moniteur dans sa journée */
      ordre: Number(lignes[i][11]) || 0
    });
  }

  /* Du bas vers le haut, pour ne pas décaler les indices */
  for (var j = aSupprimer.length - 1; j >= 0; j--) sh.deleteRow(aSupprimer[j]);

  return out;
}

/* Les bilans de chaque élève : la date du dernier, ET COMBIEN par
   jour. Deux colonnes seulement : la feuille des bilans est de loin
   la plus lourde du classeur.

   ⚠️ LE COMPTE PAR JOUR N'EST PAS DU CONFORT.

   David : « je ne peux pas préparer 2 cours pour le même élève la
   même journée, le deuxième disparaît de mes prochains cours. J'ai
   une élève qui a une leçon à 14 h et une autre à 15 h et je ne vois
   pas le cours préparé pour 15 h. »

   On ne gardait que la DATE du dernier bilan, et le ménage
   supprimait toute préparation du même jour dès qu'un bilan
   existait. La seconde préparation partait donc à la minute où la
   première leçon était enregistrée — et elle était SUPPRIMÉE de la
   feuille, pas seulement masquée.

   La règle supposait un cours par élève et par jour. Elle l'a
   toujours supposé, et personne ne l'avait écrit nulle part. */
/* ⚠️ UN HORODATAGE, ET PAS SEULEMENT UN JOUR — v201.

   David, le 8 septembre 2026 : « David ne le voit pas de son
   côté, ça provient d'un rappel et elle avait déjà un cours à 10h ».

   Ania Belarbi avait un cours à 10h, fait et enregistré. Le rappel
   de 13h a ensuite créé une seconde préparation. Le ménage
   ci-dessous compte les bilans du jour et les préparations du jour :
   un bilan, une préparation restante — il en concluait que la
   préparation était celle du cours déjà fait, et la supprimait. La
   carte du cours de 13h disparaissait du classeur, donc de tous les
   écrans.

   Le jour ne suffit pas à distinguer les deux. L'heure, si : une
   préparation CRÉÉE APRÈS le dernier bilan ne peut pas être celle de
   ce bilan. La colonne « Horodatage » des bilans (H) et la colonne
   « Créé le » des préparations donnent les deux moments. On les
   relit. */
function momentDeTexte(t) {
  if (!t && t !== 0) return null;
  if (t instanceof Date) return isNaN(t.getTime()) ? null : t.getTime();

  var s = String(t).trim();
  if (!s) return null;

  /* « 08/09/2026 10:32 », avec ou sans les secondes */
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0)).getTime();
  }

  /* « 2026-09-08 10:32 » ou l'ISO complet */
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
  }

  return null;
}

function bilansParEleve() {
  var faits = {};
  try {
    var fb = feuille();
    var nb = fb.getLastRow();
    if (nb < 2) return faits;

    var dep = Math.max(2, nb - 600);
    var dates = fb.getRange(dep, 1, nb - dep + 1, 1).getValues();
    var eleves = fb.getRange(dep, 4, nb - dep + 1, 1).getValues();
    /* Colonne H : l'horodatage du bilan, à la minute. */
    var quands = fb.getRange(dep, 8, nb - dep + 1, 1).getValues();

    for (var k = 0; k < eleves.length; k++) {
      if (!eleves[k][0]) continue;
      var cle = normaliser(eleves[k][0]);
      var iso = dateVersIso(dates[k][0]);
      if (!iso) continue;
      if (!faits[cle]) faits[cle] = { dernier: iso, jours: {}, moment: null };
      if (iso > faits[cle].dernier) faits[cle].dernier = iso;
      faits[cle].jours[iso] = (faits[cle].jours[iso] || 0) + 1;

      var q = momentDeTexte(quands[k] && quands[k][0]);
      if (q !== null && (faits[cle].moment === null || q > faits[cle].moment)) {
        faits[cle].moment = q;
      }
    }
  } catch (e) { /* sans recoupement, on garde tout */ }
  return faits;
}

/* L'HEURE D'UN COURS, LUE EN TÊTE DE SA NOTE.

   Elle n'a pas de colonne : les deux chemins de création l'écrivent
   au début de la note, « 🕐 14h00 » — enTeteDeNote pour les rappels,
   la même forme pour la création à la main. C'est donc là qu'on la
   relit.

   ⚠️ Une jumelle vit côté écran, dans ec-rappels : deux runtimes,
   deux fonctions, et test-deux-cours-meme-jour vérifie qu'elles
   répondent la même chose. Sans ça, l'une accepterait ce que
   l'autre refuse. */
function heureDeNote(note) {
  var m = String(note || '').match(/🕐\s*(\d{1,2})\s*h\s*(\d{2})?/);
  if (!m) return '';
  return ('0' + m[1]).slice(-2) + ':' + (m[2] || '00');
}

function ajouterPreparation(data) {
  var sh = feuillePreparations();
  var id = String(data.id || new Date().getTime());

  var lignes = sh.getDataRange().getValues();
  var ligne = sh.getLastRow() + 1;
  var ancienne = null;

  /* Un identifiant déjà connu remplace la ligne existante : c'est
     ainsi qu'on modifie une préparation sans en créer une seconde. */
  if (data.id) {
    for (var i = 1; i < lignes.length; i++) {
      if (String(lignes[i][0]) === id) {
        ligne = i + 1;
        ancienne = lignes[i];
        break;
      }
    }
  } else {
    /* ⚠️ CE REFUS EMPÊCHAIT UN SECOND COURS LE MÊME JOUR.

       David : « je ne peux pas mettre 2 cours pour une même
       personne avec le même moniteur le même jour ». Elle a une
       élève à 14 h et une autre leçon à 15 h.

       Le contrôle était sur (élève, jour) : la seconde préparation
       n'était pas créée du tout, et pire, on rendait « status: ok »
       avec l'identifiant de la PREMIÈRE — l'écran croyait donc avoir
       réussi et affichait une carte qui était l'autre cours.

       Ce que ce contrôle protège vraiment, c'est le double envoi :
       deux appuis rapprochés sur le même bouton. Le discriminant qui
       sépare un double appui d'une vraie seconde leçon, c'est
       L'HEURE — les deux chemins de création l'écrivent en tête de
       note, « 🕐 14h00 ». Deux cours à la même heure pour le même
       élève, c'est un double appui. À deux heures différentes, ce
       sont deux leçons. */
    var cleE = normaliser(data.eleve || '');
    var jour = dateVersIso(String(data.date || ''));
    var h = heureDeNote(data.note);
    for (var j = 1; j < lignes.length; j++) {
      if (!lignes[j][0]) continue;
      if (normaliser(lignes[j][2]) !== cleE) continue;
      if (dateVersIso(lignes[j][1]) !== jour) continue;
      if (heureDeNote(lignes[j][6]) !== h) continue;
      return { status: 'ok', id: String(lignes[j][0]), deja: true };
    }
  }
  var valeurs = [
    id,
    String(data.date || ''),
    String(data.eleve || ''),
    String(data.modele || ''),
    String(data.modeleLabel || ''),
    String(data.site || ''),
    String(data.note || ''),
    String(data.contexte || ''),
    /* Colonne 9 : qui a préparé le cours. À la modification, on
       garde celui d'origine : c'est lui qui a fait le travail. */
    String(data.preparePar || (ancienne ? ancienne[8] : '') || data.moniteur || ''),
    Utilities.formatDate(new Date(),
      SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'dd/MM/yyyy HH:mm'),
    /* Colonne 11 : à qui il est attribué. Elle n'était pas écrite,
       et la lecture s'y référant en priorité, le cours se retrouvait
       sans moniteur — invisible pour tout le monde. */
    String(data.moniteur || ''),
    /* Colonne 12 : l'ordre dans la journée, préservé s'il existe */
    (ancienne ? (ancienne[11] || '') : '')
  ];
  var plage = sh.getRange(ligne, 1, 1, valeurs.length);
  plage.setNumberFormat('@');
  plage.setValues([valeurs]);
  return { status: 'ok', id: id };
}

/* Réattribue un cours préparé à un autre moniteur */
/* Le transfert change l'attributaire, PAS le préparateur.
   Écraser la colonne « Préparé par » faisait disparaître celui
   qui avait réellement fait le travail. */
function reattribuerPreparation(id, moniteur) {
  var sh = feuillePreparations();
  var lignes = sh.getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) === String(id)) {
      sh.getRange(i + 1, 11).setValue(String(moniteur || ''));
      return { status: 'ok' };
    }
  }
  return { status: 'error', message: 'Préparation introuvable.' };
}

function supprimerPreparation(id, demandeur, role) {
  var sh = feuillePreparations();
  var lignes = sh.getDataRange().getValues();
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (String(lignes[i][0]) !== String(id)) continue;

    /* L'attributaire d'abord, celui qui a préparé ensuite : un cours
       donné à un collègue appartient à ce collègue, et l'ancienne
       règle le rendait insupprimable pour les deux. */
    var proprietaire = String(lignes[i][10] || '') || String(lignes[i][8] || '');
    var prepare = String(lignes[i][8] || '');
    var admin = (String(role || '') === 'admin');

    /* Seul le moniteur à qui le cours est attribué peut le supprimer.
       Sans moniteur attribué, seul un administrateur le peut. */
    if (!admin) {
      if (!proprietaire) {
        return { status: 'error',
                 message: 'Ce cours n\'est attribué à personne. Seul un administrateur peut le supprimer.' };
      }
      /* Celui qui l'a préparé garde le droit de le retirer */
      if (!demandeur ||
          (normaliser(proprietaire) !== normaliser(demandeur) &&
           normaliser(prepare) !== normaliser(demandeur))) {
        return { status: 'error',
                 message: 'Ce cours est attribué à ' + proprietaire +
                          '. Tu peux le lui laisser ou le réattribuer, mais pas le supprimer.' };
      }
    }
    sh.deleteRow(i + 1);
    return { status: 'ok' };
  }
  return { status: 'ok', message: 'Déjà supprimée.' };
}

/* ---------- CONSIGNES : du bureau vers les moniteurs ---------- */
var NOM_ONGLET_CONS = 'Consignes';

function feuilleConsignes() {
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
  var sh = classeur.getSheetByName(NOM_ONGLET_CONS);
  if (!sh) {
    sh = classeur.insertSheet(NOM_ONGLET_CONS);
    ajouterLigne(sh, ['Id', 'Élève', 'Type', 'Valeur', 'Texte', 'Créé le', 'Par', 'Traité']);
  }
  return sh;
}

function ajouterConsigne(data) {
  var sh = feuilleConsignes();
  var type = String(data.type || '');
  var eleve = String(data.eleve || '');

  /* Une seule urgence par élève : on remplace la précédente */
  if (type === 'urgence') {
    var l = sh.getDataRange().getValues();
    for (var i = l.length - 1; i >= 1; i--) {
      if (String(l[i][2]) === 'urgence' && normaliser(l[i][1]) === normaliser(eleve)) {
        sh.deleteRow(i + 1);
      }
    }
  }

  var id = String(data.id || new Date().getTime());
  var ligne = sh.getLastRow() + 1;
  var valeurs = [
    id, eleve, type,
    String(data.valeur || ''),
    String(data.texte || ''),
    Utilities.formatDate(new Date(),
      SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'dd/MM/yyyy HH:mm'),
    String(data.par || ''),
    'non'
  ];
  var plage = sh.getRange(ligne, 1, 1, valeurs.length);
  plage.setNumberFormat('@');
  plage.setValues([valeurs]);
  return { status: 'ok', id: id };
}

function listerConsignes(eleve) {
  var lignes = feuilleConsignes().getDataRange().getValues();
  var filtre = eleve ? normaliser(eleve) : '';
  var out = [];
  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    if (filtre && normaliser(lignes[i][1]) !== filtre) continue;
    out.push({
      id: String(lignes[i][0]),
      eleve: texteCellule(lignes[i][1], false),
      type: texteCellule(lignes[i][2], false),
      valeur: texteCellule(lignes[i][3], false),
      texte: texteCellule(lignes[i][4], false),
      creeLe: texteCellule(lignes[i][5], false),
      par: texteCellule(lignes[i][6], false),
      traite: String(lignes[i][7] || 'non')
    });
  }
  return out;
}

/* Efface tous les messages d'un élève.
   Les marquer « traités » ne suffit pas : ils continuent de décrire
   son état et le font réapparaître dans les listes du bureau. */
function effacerConsignesEleve(eleve) {
  var sh = feuilleConsignes();
  var lignes = sh.getDataRange().getValues();
  var cible = normaliser(eleve);
  var n = 0;
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (normaliser(lignes[i][1]) === cible) { sh.deleteRow(i + 1); n++; }
  }
  return { status: 'ok', effacees: n };
}

function marquerConsigneTraitee(id) {
  var sh = feuilleConsignes();
  var lignes = sh.getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) === String(id)) {
      sh.getRange(i + 1, 8).setValue('oui');
      return { status: 'ok' };
    }
  }
  return { status: 'ok', message: 'Introuvable.' };
}

/* ---------- SUIVI PERMIS : préparation administrative ---------- */
var NOM_ONGLET_SUIVI = 'SuiviPermis';
var COLS_SUIVI = ['Élève', 'Date du permis', 'Place à remplacer', 'Date à donner (autre AE)',
                  'Reste à payer', 'Paiement prévu le', 'Relancé le',
                  'Nature', 'Leçons 2h', 'Leçons 1h', 'Accompagnement examen',
                  'Autre à prévoir', 'Réservations planning', 'Mis à jour le', 'Par',
                  'Type examen', 'Auto-école destinataire',
                  'Fantôme', 'Statut', 'À planifier', 'Semaine cible', 'Moniteur date',
                  'Tout est OK', 'Centre d\'examen', 'Retiré de à prévoir',
                  'Résultat', 'Nb ajournements', 'RDV post date', 'RDV post moniteur',
                  'Bilan examen', 'Suite à donner', 'Commentaire moniteur', 'RDV post fait',
                  'Disponible à partir du', 'Indisponible du', 'Indisponible au',
                  'Date du dernier ajournement',
                  'EB message envoyé', 'EB date', 'EB moniteur',
                  'CEPC image', 'Bilan élève', 'Texte moniteur', 'Heures repassage',
                  'Groupe permis', 'Faire le point',
                  'Simu prévenu', 'EB prévenu'];

/* ⚠️ COLS_SUIVI EST EN RETARD SUR LA FEUILLE, ET IL FAUT LE SAVOIR.

   Elle donne 48 titres ; la feuille porte 77 colonnes, parce que
   listerSuivi et enregistrerSuivi travaillent PAR POSITION, pas par
   titre. Ajouter un nom à la fin de cette liste ne créerait donc pas
   une colonne à la fin de la feuille : ça écrirait un titre par-dessus
   celui de « ebNiveau ». Une colonne nouvelle s'ajoute AU BOUT des
   deux fonctions, et son titre se pose par son numéro. */
var COL_SUIVI_SIMU_DATE = 78;   /* 1-based : la 78e colonne de SuiviPermis */

/* ── LE SUIVI AAC ET CS — colonnes 79 à 94 (v185) ──────────────

   Jusqu'ici, l'AAC ne s'écrivait NULLE PART. Le questionnaire posait
   les bonnes questions — formation accompagnateur, rendez-vous
   préalable, RVP 1, RVP 2 — mais ne retenait que des ÉTATS, et
   seulement dans le texte de la note. Aucune date. Or tout le suivi
   AAC est une affaire de dates : le 1 an entre le préalable et
   l'examen, les 6 mois du RVP 1, les 10 mois du RVP 2.

   Les quatre rendez-vous portent donc le MÊME couple (état, date) et
   le même vocabulaire — « aprevoir | prevu | fait | ailleurs ».
   « ailleurs » n'est pas un caprice : un élève repris d'une autre
   auto-école a bien fait son RVP 1, mais il n'y a AUCUN bilan à aller
   lire. Sans ce mot, on cherche une trace qui n'existe pas. */
var COL_SUIVI_AAC_DEBUT = 79;

var ENTETES_SUIVI_TARDIFS = [
  [78, 'Date simulateur'],
  /* Les quatre rendez-vous : état puis date, dans l'ordre du parcours */
  [79, 'Préalable état'],      [80, 'Préalable date'],
  [81, 'RVP1 état'],           [82, 'RVP1 date'],
  [83, 'RVP2 état'],           [84, 'RVP2 date'],
  [85, 'Théorique état'],      [86, 'Théorique date'],
  /* Le parcours AAC : '' = à valider · abandonne · fausse.
     La DATE de la bascule n'est pas du confort — c'est elle qui dit
     si l'examen officiel est venu avant ou après l'abandon, donc si
     le retour en arrière est encore possible. */
  [87, 'Parcours AAC'],        [88, 'Parcours changé le'],
  /* La question « prêt pour un examen blanc ? », côté CS */
  [89, 'Question EB le'],      [90, 'Question EB par'],
  [91, 'Réponse EB'],          [92, 'Réponse EB le'],
  /* « Je pars en vacances trois mois » : on ne le fait plus remonter
     jusque-là. La date suffit — passée, il revient tout seul. Un
     silence qu'il faudrait lever à la main est un élève oublié. */
  [93, 'Pause jusquau'],       [94, 'Pause motif'],
  /* ── LE GROUPE DE LA SEMAINE — colonne 95 (v199) ──

     À NE PAS CONFONDRE avec « Groupe permis » (colonne 45), qui
     désigne le groupe du JOUR de l'examen — « Matin »,
     « Inspecteur A ». Celui-ci est le découpage préparé une semaine
     à l'avance, avant même d'avoir la date : « je prends un groupe
     de 2 et un groupe de 3 ».

     David, le 4 septembre : « pour le moment on garde séparé ».
     Les deux découpages ne coïncident pas toujours — la préfecture
     impose le sien le jour venu. */
  [95, 'Groupe semaine'],

  /* ── LE LIEU DES RENDEZ-VOUS PÉDAGOGIQUES — colonnes 96 à 98 (v206) ──

     David : « pour le rendez-vous pédagogique pratique des AAC il
     faut que l'on puisse proposer où aura lieu le rendez-vous à
     Saint-Brieuc ou à Loudéac, et la possibilité de rajouter autre
     chose à la main ».

     ⚠️ C'EST LA CLÉ QUI EST ÉCRITE ICI, PAS L'ADRESSE.
     « stbrieuc », « loudeac » — jamais « 4 rue Saint Benoît ». Le
     jour où l'adresse change, elle se corrige dans les réglages et
     toutes les fiches suivent. Recopiée ici, elle resterait fausse
     sur chaque élève déjà placé, et c'est elle que le rappel
     enverrait.

     Un lieu tapé à la main s'ajoute à la liste des réglages et a
     donc une clé, comme les autres. */
  [96, 'RVP 1 lieu'], [97, 'RVP 2 lieu'], [98, 'RVT lieu'],
  /* ⚠️ LE CALAGE DES COMPTEURS — v213.

     Un ÉCART, pas un numéro. « Il a pris quatre leçons qu'on n'a
     pas » reste vrai au cours suivant ; « ce cours-ci est le
     douzième » ne l'est qu'une fois. C'est toute la différence
     entre un compteur qui continue d'avancer et un compteur qu'il
     faut retaper à chaque leçon. */
  [99,  'Calage total'],
  [100, 'Calage depuis examen blanc'],
  [101, 'Calage depuis post-permis'],
  [102, 'Calage posé par'],
  [103, 'Calage posé le'],
  /* ⚠️ L'AUTEUR DU NOMBRE D'HEURES — v215. Sans lui, l'alerte
     « il lui faut encore 4h » ne pourrait nommer que le moniteur du
     dernier bilan : faux dès que le nombre vient du bureau ou d'un
     post-permis, et une alerte qui se trompe de nom ne se croit
     plus. */
  [104, 'Heures dites par'],
  [105, 'Heures dites le'],
  /* ⚠️ LE CEPC INTERNE — v216. Celui que le moniteur remplit à
     l'examen officiel, pour nous seuls, et que le rendez-vous
     post-permis met en face des captures du CEPC de l'inspecteur.
     En JSON : une grille ne se raconte pas en toutes lettres. */
  [106, 'CEPC interne (JSON)'],
  [107, 'Heures — repère (rang après examen blanc)']
];

/* Les titres des colonnes tardives, posés s'ils manquent.

   « lignes » est la lecture que l'appelant a DÉJÀ faite : on ne relit
   rien pour ça. Une feuille où personne n'a encore rempli la colonne
   rend une première ligne trop courte — c'est le cas normal au premier
   passage, pas une anomalie.

   ⚠️ UNE SEULE FONCTION POUR TOUS LES TITRES. Il y en avait une par
   colonne ; à seize de plus, c'était seize fonctions à écrire et une
   à oublier. */
function poserEntetesSuivi(sh, lignes) {
  try {
    var entetes = (lignes && lignes[0]) || [];
    for (var i = 0; i < ENTETES_SUIVI_TARDIFS.length; i++) {
      var col = ENTETES_SUIVI_TARDIFS[i][0];
      if (String(entetes[col - 1] || '').trim()) continue;
      sh.getRange(1, col).setValue(ENTETES_SUIVI_TARDIFS[i][1]);
    }
  } catch (e) { /* les titres sont du confort : la donnée passe quand même */ }
}

function feuilleSuivi() {
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
  var sh = classeur.getSheetByName(NOM_ONGLET_SUIVI);
  if (!sh) {
    sh = classeur.insertSheet(NOM_ONGLET_SUIVI);
    ajouterLigne(sh, COLS_SUIVI);
  }
  return sh;
}

function listerSuivi() {
  var sh = feuilleSuivi();
  var lignes = sh.getDataRange().getValues();
  poserEntetesSuivi(sh, lignes);
  var out = [];
  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      eleve: texteCellule(lignes[i][0], false),
      datePermis: texteCellule(lignes[i][1], false),
      aRemplacer: texteCellule(lignes[i][2], false),
      dateADonner: texteCellule(lignes[i][3], false),
      resteAPayer: texteCellule(lignes[i][4], false),
      paiementPrevu: texteCellule(lignes[i][5], false),
      relanceLe: texteCellule(lignes[i][6], false),
      nature: texteCellule(lignes[i][7], false),
      lecons2h: texteCellule(lignes[i][8], false),
      lecons1h: texteCellule(lignes[i][9], false),
      accompagnement: texteCellule(lignes[i][10], false),
      autre: texteCellule(lignes[i][11], false),
      reservations: texteCellule(lignes[i][12], false),
      majLe: texteCellule(lignes[i][13], true),
      par: texteCellule(lignes[i][14], false),
      typeExamen: texteCellule(lignes[i][15], false),
      autoEcole: texteCellule(lignes[i][16], false),
      fantome: texteCellule(lignes[i][17], false),
      statut: texteCellule(lignes[i][18], false),
      aPlanifier: texteCellule(lignes[i][19], false),
      semaine: texteCellule(lignes[i][20], false),
      moniteurDate: texteCellule(lignes[i][21], false),
      toutOk: texteCellule(lignes[i][22], false),
      centre: texteCellule(lignes[i][23], false),
      retireAPrevoir: texteCellule(lignes[i][24], false),
      resultat: texteCellule(lignes[i][25], false),
      nbAjournements: texteCellule(lignes[i][26], false),
      rdvPostDate: texteCellule(lignes[i][27], false),
      rdvPostMoniteur: texteCellule(lignes[i][28], false),
      bilanExamen: texteCellule(lignes[i][29], false),
      suite: texteCellule(lignes[i][30], false),
      commentaireMoniteur: texteCellule(lignes[i][31], false),
      rdvPostFait: texteCellule(lignes[i][32], false),
      dispoDu: texteCellule(lignes[i][33], false),
      indispoDu: texteCellule(lignes[i][34], false),
      indispoAu: texteCellule(lignes[i][35], false),
      dateAjournement: texteCellule(lignes[i][36], false),
      ebMessage: texteCellule(lignes[i][37], false),
      ebDatePrevue: texteCellule(lignes[i][38], false),
      ebMoniteur: texteCellule(lignes[i][39], false),
      cepcImage: texteCellule(lignes[i][40], false),
      bilanEleve: texteCellule(lignes[i][41], false),
      texteMoniteur: texteCellule(lignes[i][42], false),
      heuresRepassage: texteCellule(lignes[i][43], false),
      groupePermis: texteCellule(lignes[i][44], false),
      fairePoint: texteCellule(lignes[i][45], false),
      /* Les colonnes existaient mais n'étaient pas relues : la coche
         partait bien au serveur et se perdait au retour. */
      simuPrevenu: texteCellule(lignes[i][46], false),
      ebPrevenu: texteCellule(lignes[i][47], false),

      /* Ce que le moniteur a conclu à l'examen blanc, et les
         heures qu'il faut encore : le bureau s'en sert pour
         placer les dates. */
      ebNiveau: texteCellule(lignes[i][48], false),
      ebDate: texteCellule(lignes[i][49], false),
      heuresRestantes: texteCellule(lignes[i][50], false),

      /* Le parcours moto : dossier ANTS, code et plateau lui sont
         propres — ce ne sont ni le même code ni le même dossier
         que pour la voiture. */
      motoAnts: texteCellule(lignes[i][51], false),
      motoAntsQui: texteCellule(lignes[i][52], false),
      motoCode: texteCellule(lignes[i][53], false),
      motoEval: texteCellule(lignes[i][54], false),
      motoPlateau: texteCellule(lignes[i][55], false),
      motoLecons: texteCellule(lignes[i][56], false),
      motoDatePlateau: texteCellule(lignes[i][57], false),
      motoPassages: texteCellule(lignes[i][58], false),
      motoCircuLecons: texteCellule(lignes[i][59], false),
      motoDateExamen: texteCellule(lignes[i][60], false),
      motoEtape: texteCellule(lignes[i][61], false),
      motoCircuPassages: texteCellule(lignes[i][74], false),
      fairePointLe: texteCellule(lignes[i][75], false),
      /* La remarque libre du suivi moto : elle suit l'élève d'un
         cadre à l'autre, quelle que soit son étape. */
      motoRemarque: texteCellule(lignes[i][76], false),

      /* Le permis remorque : son examen se joue en deux épreuves
         le même jour, d'où le suivi séparé de chacune. */
      beAnts: texteCellule(lignes[i][62], false),
      beAntsQui: texteCellule(lignes[i][63], false),
      beAntsValide: texteCellule(lignes[i][64], false),
      beCode: texteCellule(lignes[i][65], false),
      beCours1: texteCellule(lignes[i][66], false),
      beCours2: texteCellule(lignes[i][67], false),
      beCours3: texteCellule(lignes[i][68], false),
      beAPrevoir: texteCellule(lignes[i][69], false),
      beMois: texteCellule(lignes[i][70], false),
      beDate: texteCellule(lignes[i][71], false),
      beAPasser: texteCellule(lignes[i][72], false),
      bePassages: texteCellule(lignes[i][73], false),

      /* LA DATE DU SIMULATEUR, ENFIN ÉCRITE QUELQUE PART.

         Jusqu'ici seule la case « Simu prévenu » existait, et le
         « fait » se devinait dans le texte du dernier bilan. Une date
         relue au lasso dans une phrase n'est pas une date : elle
         disparaît dès que la phrase change. Celle-ci est la vraie. */
      simuDate: texteCellule(lignes[i][77], false),

      /* LE SUIVI AAC ET CS — colonnes 79 à 94, voir
         ENTETES_SUIVI_TARDIFS. Les quatre rendez-vous portent le même
         couple (état, date) : un seul vocabulaire pour quatre
         échéances, sinon on finit avec quatre façons de dire « fait ». */
      rvpEtat:   texteCellule(lignes[i][78], false),
      rvpDate:   texteCellule(lignes[i][79], false),
      rvp1Etat:  texteCellule(lignes[i][80], false),
      rvp1Date:  texteCellule(lignes[i][81], false),
      rvp2Etat:  texteCellule(lignes[i][82], false),
      rvp2Date:  texteCellule(lignes[i][83], false),
      rvtEtat:   texteCellule(lignes[i][84], false),
      rvtDate:   texteCellule(lignes[i][85], false),

      parcoursAac: texteCellule(lignes[i][86], false),
      parcoursLe:  texteCellule(lignes[i][87], false),

      csQuestionLe:  texteCellule(lignes[i][88], false),
      csQuestionPar: texteCellule(lignes[i][89], false),
      csReponse:     texteCellule(lignes[i][90], false),
      csReponseLe:   texteCellule(lignes[i][91], false),

      pauseJusquau: texteCellule(lignes[i][92], false),
      pauseMotif:   texteCellule(lignes[i][93], false),

      /* Le groupe préparé dans la semaine — voir l'en-tête 95. */
      groupeSemaine: texteCellule(lignes[i][94], false),

      /* Où se tient chaque rendez-vous pédagogique — la CLÉ du lieu,
         voir les en-têtes 96 à 98. Vide sur tous les rendez-vous
         d'avant la v206 : ils n'affichent rien, et rien n'est
         signalé — ce n'est pas un manque, c'est une question qu'on
         ne posait pas encore. */
      rvp1Lieu: texteCellule(lignes[i][95], false),
      rvp2Lieu: texteCellule(lignes[i][96], false),
      rvtLieu:  texteCellule(lignes[i][97], false),

      /* ⚠️ LE CALAGE DES COMPTEURS — v213.

         David, le 10 septembre 2026 : « ce cours sera le 12ème et le
         suivant le 13ème et ainsi de suite ».

         Ce n'est PAS un numéro figé : c'est un ÉCART. Le classeur
         compte les bilans qu'il a ; l'écart dit ce qui manque —
         des leçons prises ailleurs, avant nous, ou sans bilan
         enregistré. « Il a pris quatre leçons qu'on n'a pas » reste
         vrai au cours suivant, alors qu'un numéro figé ne l'est
         qu'une fois. C'est ce qui permet au compteur de continuer
         à avancer tout seul. */
      decalTotal: texteCellule(lignes[i][98], false),
      decalEb:    texteCellule(lignes[i][99], false),
      decalPost:  texteCellule(lignes[i][100], false),
      /* Qui l'a posé et quand : ces deux-là ne servent qu'à
         comprendre un chiffre qui surprend. Sans eux, on retape le
         nombre par méfiance, et on empile les corrections. */
      decalPar:   texteCellule(lignes[i][101], false),
      decalLe:    texteCellule(lignes[i][102], false),

      /* ⚠️ QUI A DIT CE NOMBRE D'HEURES, ET QUAND — v215.

         David, le 10 septembre 2026 : « quand un moniteur indique un
         nombre d'heures pour un passage d'examen, qu'on ait une
         notification — car là on doit aller chercher l'information,
         et si on n'y pense pas ça tombe aux oubliettes ».

         « heuresRestantes » existait déjà, mais sans auteur ni date.
         L'alerte n'aurait donc pu nommer que le moniteur du DERNIER
         BILAN : juste la plupart du temps, faux dès que le nombre
         vient du bureau ou d'un rendez-vous post-permis. Une alerte
         qui nomme le mauvais moniteur, on cesse de la croire.

         Même couple que « Calage posé par / le », et pour la même
         raison : un chiffre sans auteur se retape par méfiance. */
      heuresPar:  texteCellule(lignes[i][103], false),
      heuresLe:   texteCellule(lignes[i][104], false),

      /* ⚠️ LE CEPC INTERNE DE L'EXAMEN OFFICIEL — v216.

         David, le 10 septembre 2026 : « on va mettre en place un
         CEPC aussi, mais qui n'est visible que pour les moniteurs,
         et qui apparaît sur le rendez-vous post-permis aussi pour
         le comparer avec le CEPC officiel ».

         Une grille de quatorze notes, rangée en JSON dans UNE case.

         ⚠️ ET PAS DANS LA NOTE. Tout ce qui est « 🔒 pour nous » sur
         un examen officiel voyage aujourd'hui en TEXTE, dans les
         notes — l'inspecteur, les heures demandées, le mot pour
         l'équipe. Ça tient pour une phrase. Écrire une grille en
         toutes lettres puis la relire pour la redessiner, ce serait
         « la note est un compte rendu, pas une source » : la règle
         qui nous a coûté le plus cher cette semaine. Elle a donc sa
         case, et le rendez-vous post-permis la lit telle quelle. */
      cepcInterne: texteCellule(lignes[i][105], false),

      /* Le rang où la réserve d'heures était pleine — v217.
         Vide veut dire « depuis l'examen blanc ». */
      heuresRang: texteCellule(lignes[i][106], false)
    });
  }
  return out;
}

function enregistrerSuivi(d) {
  /* Une date d'examen occupe la place correspondante : le bureau ne
     saisit plus la même chose à deux endroits.

     ⚠️ LE REFUS DOIT SORTIR DU try. Un placement refusé ne peut pas
     être avalé comme une panne passagère : la date serait écrite sur
     la fiche de suivi et l'élève ne serait sur aucune session — une
     incohérence silencieuse, pire que l'ancien défaut. On refuse
     donc l'enregistrement entier. */
  var refus = '';
  try {
    var isoP = dateVersIso(d.datePermis);

    if (isoP && d.eleve) {
      var r = placerDansSession(String(d.eleve), isoP, String(d.centre || ''),
                                String(d.heurePermis || ''), String(d.typeExamen || ''));
      if (r === PLACE_REFUSEE) refus = isoP;
    }

    /* Une date effacée le retire de sa place : sans cela, il
       restait compté sur une session sans plus avoir de date.

       ⚠️ EFFACÉE, PAS ILLISIBLE — ET LA DIFFÉRENCE A COÛTÉ UNE
       JOURNÉE DE SESSIONS.

       Le 9 septembre 2026, David a déplacé des élèves d'une
       session à l'autre et « tout a disparu, ce qu'elle a décalé
       s'est transformé en place libre ». La date partait en toutes
       lettres, dateVersIso ne savait pas la lire, elle rendait une
       chaîne vide — et cette ligne prenait ce silence pour un
       ordre. Elle vidait toutes les places à venir de l'élève.

       Savoir lire les lettres (voir dateVersIso) referme ce
       chemin-là. Cette règle-ci referme TOUS LES AUTRES : demain,
       un format qu'on n'a pas prévu ne détruira rien. On ne retire
       quelqu'un que si la case est VRAIMENT vide — c'est-à-dire si
       une main a effacé la date, et pas si une machine n'a pas su
       la lire.

       Une date écrite mais incomprise ne dit rien du tout : on ne
       touche à rien, et elle reste sur la fiche, lisible par un
       humain, réparable. Le silence n'est pas une instruction. */
    else if (d.datePermis !== undefined && !isoP && d.eleve &&
             String(d.datePermis || '').trim() === '') {
      retirerDesSessions(String(d.eleve));
    }
  } catch (e) { /* la session se rattrapera au prochain passage */ }

  /* Rien n'est écrit : ni la date, ni le reste de la fiche. Un
     enregistrement à moitié fait serait plus difficile à réparer
     qu'un refus clair. */
  if (refus) {
    return { status: 'error',
             message: 'Aucune place libre le ' + jourLisible(refus) + '.\n\n' +
                      "Une date d'examen se prend sur une place ouverte. " +
                      'Ouvre la journée dans 🎓 Suivi permis, puis reviens ' +
                      'placer cet élève.' };
  }

  var sh = feuilleSuivi();
  var lignes = sh.getDataRange().getValues();
  poserEntetesSuivi(sh, lignes);
  var cible = normaliser(d.eleve);
  var ligne = -1;
  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][0]) === cible) { ligne = i + 1; break; }
  }
  if (ligne === -1) ligne = sh.getLastRow() + 1;

  var valeurs = [
    String(d.eleve || ''), String(d.datePermis || ''), String(d.aRemplacer || ''),
    String(d.dateADonner || ''), String(d.resteAPayer || ''), String(d.paiementPrevu || ''),
    String(d.relanceLe || ''), String(d.nature || ''), String(d.lecons2h || ''),
    String(d.lecons1h || ''), String(d.accompagnement || ''), String(d.autre || ''),
    String(d.reservations || ''),
    Utilities.formatDate(new Date(),
      SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'dd/MM/yyyy HH:mm'),
    String(d.par || ''),
    String(d.typeExamen || ''),
    String(d.autoEcole || ''),
    String(d.fantome || ''),
    String(d.statut || ''),
    String(d.aPlanifier || ''),
    String(d.semaine || ''),
    String(d.moniteurDate || ''),
    String(d.toutOk || ''),
    String(d.centre || ''),
    String(d.retireAPrevoir || ''),
    String(d.resultat || ''),
    String(d.nbAjournements || ''),
    String(d.rdvPostDate || ''),
    String(d.rdvPostMoniteur || ''),
    String(d.bilanExamen || ''),
    String(d.suite || ''),
    String(d.commentaireMoniteur || ''),
    String(d.rdvPostFait || ''),
    String(d.dispoDu || ''),
    String(d.indispoDu || ''),
    String(d.indispoAu || ''),
    String(d.dateAjournement || ''),
    String(d.ebMessage || ''),
    String(d.ebDatePrevue || ''),
    String(d.ebMoniteur || ''),
    String(d.cepcImage || ''),
    String(d.bilanEleve || ''),
    String(d.texteMoniteur || ''),
    String(d.heuresRepassage || ''),
    String(d.groupePermis || ''),
    String(d.fairePoint || ''),
    String(d.simuPrevenu || ''),
    String(d.ebPrevenu || ''),
    String(d.ebNiveau || ''),
    String(d.ebDate || ''),
    String(d.heuresRestantes || ''),
    String(d.motoAnts || ''),
    String(d.motoAntsQui || ''),
    String(d.motoCode || ''),
    String(d.motoEval || ''),
    String(d.motoPlateau || ''),
    String(d.motoLecons || ''),
    String(d.motoDatePlateau || ''),
    String(d.motoPassages || ''),
    String(d.motoCircuLecons || ''),
    String(d.motoDateExamen || ''),
    String(d.motoEtape || ''),
    String(d.beAnts || ''),
    String(d.beAntsQui || ''),
    String(d.beAntsValide || ''),
    String(d.beCode || ''),
    String(d.beCours1 || ''),
    String(d.beCours2 || ''),
    String(d.beCours3 || ''),
    String(d.beAPrevoir || ''),
    String(d.beMois || ''),
    String(d.beDate || ''),
    String(d.beAPasser || ''),
    String(d.bePassages || ''),
    String(d.motoCircuPassages || ''),
    String(d.fairePointLe || ''),
    String(d.motoRemarque || ''),
    String(d.simuDate || ''),     /* colonne 78 — voir COL_SUIVI_SIMU_DATE */

    /* Colonnes 79 à 94 — le suivi AAC et CS. L'ORDRE EST LA SEULE
       CHOSE QUI COMPTE ICI : la feuille est positionnelle, et cette
       liste doit suivre exactement celle de listerSuivi. */
    String(d.rvpEtat || ''),   String(d.rvpDate || ''),
    String(d.rvp1Etat || ''),  String(d.rvp1Date || ''),
    String(d.rvp2Etat || ''),  String(d.rvp2Date || ''),
    String(d.rvtEtat || ''),   String(d.rvtDate || ''),
    String(d.parcoursAac || ''),   String(d.parcoursLe || ''),
    String(d.csQuestionLe || ''),  String(d.csQuestionPar || ''),
    String(d.csReponse || ''),     String(d.csReponseLe || ''),
    String(d.pauseJusquau || ''),  String(d.pauseMotif || ''),
    String(d.groupeSemaine || ''),
    String(d.rvp1Lieu || ''), String(d.rvp2Lieu || ''), String(d.rvtLieu || ''),
    /* Le calage des compteurs — v213. Voir ENTETES_SUIVI_TARDIFS. */
    String(d.decalTotal || ''), String(d.decalEb || ''),
    String(d.decalPost || ''),  String(d.decalPar || ''),
    String(d.decalLe || ''),
    /* Qui a dit le nombre d'heures, et quand — v215. */
    String(d.heuresPar || ''),  String(d.heuresLe || ''),
    /* Le CEPC interne de l'examen officiel, en JSON — v216. */
    String(d.cepcInterne || ''),
    /* Depuis quel rang la réserve d'heures se décompte — v217. */
    String(d.heuresRang || '')
  ];
  var plage = sh.getRange(ligne, 1, 1, valeurs.length);
  plage.setNumberFormat('@');
  plage.setValues([valeurs]);
  return { status: 'ok' };
}

/* ============================================================
   LE RENDEZ-VOUS THÉORIQUE — LE REMPLACEMENT DU DOODLE

   David : « pour ce rendez-vous théorique j'ai besoin d'avoir
   plusieurs élèves en même temps, au minimum 4. C'est un rendez-vous
   où l'élève est présent avec l'accompagnateur. Actuellement
   j'utilise un Doodle avec des propositions de date et je prends
   celle où il y en a le plus, et je remets les autres élèves qui ne
   peuvent pas à cette date en attente. Je veux supprimer ce Doodle :
   on sélectionne les élèves sur l'outil, on envoie un mail avec des
   sessions possibles, et on récupère les réponses sur l'outil. »

   ─ CE N'EST PAS UN SYSTÈME NEUF ─

   L'application sait déjà envoyer un lien personnel qui ouvre une
   page sans mot de passe et récupérer une réponse : c'est le LIEN DE
   COURS (creerLienCours, lireLienCours, confirmerLienCours). Le
   théorique, c'est la même machine avec une grille de créneaux à la
   place d'un bouton de confirmation. Mêmes jetons de 22 caractères,
   même route publique, même prudence.

   ─ LE LIEN N'ÉCRIT RIEN ─

   Les messageries CLIQUENT les liens toutes seules : Outlook et
   Gmail ouvrent chaque lien d'un mail entrant pour le contrôler. Un
   lien qui enregistrerait une réponse enregistrerait donc des
   réponses que personne n'a données — et le bureau choisirait sa
   date sur des disponibilités fantômes.

   Le lien OUVRE UNE PAGE. C'est le clic sur la page qui répond, en
   POST. C'est déjà la règle du lien de cours, pour la même raison.

   ─ DEUX FEUILLES, PAS LES SESSIONS D'EXAMEN ─

   La tentation était forte : même forme, une date et des gens
   dessus. Mais dejaPlace() considère que TOUTE personne sur une
   session a une place d'examen : un élève AAC placé sur un théorique
   disparaîtrait silencieusement de la liste RDV Permis. C'est le
   défaut corrigé quatre fois le 2 septembre.
   ============================================================ */

function feuilleRvtTours() {
  var f = classeur();
  var sh = f.getSheetByName('RvtTours');
  if (!sh) {
    sh = f.insertSheet('RvtTours', f.getNumSheets());
    ajouterLigne(sh, ['ID', 'Créé le', 'Par', 'Créneaux', 'Limite',
                      'Statut', 'Créneau retenu', 'Clos le', 'Remarque']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function feuilleRvtReponses() {
  var f = classeur();
  var sh = f.getSheetByName('RvtReponses');
  if (!sh) {
    sh = f.insertSheet('RvtReponses', f.getNumSheets());
    ajouterLigne(sh, ['ID tour', 'Jeton', 'Élève', 'Mail élève',
                      'Mail prescripteur', 'Envoyé le', 'Envoi',
                      'Réponses', 'Accompagnateur', 'Répond', 'Répondu le',
                      /* Colonne 13 : un lien parti par erreur se coupe.
                         David, le 9 septembre : « c'est pour un lien
                         parti par erreur ». On ne supprime pas la
                         ligne — ses réponses restent lisibles au
                         bureau, et le geste se défait. */
                      'Retenu', 'Accès retiré']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* Le même tirage que le lien de cours : 22 caractères, indevinables. */
function jetonRvt() { return jetonCours(); }


/* ------------------------------------------------------------
   OUVRIR UN TOUR

   Un tour = des créneaux proposés, une date limite, et une ligne
   par élève avec son jeton.

   ⚠️ UN SEUL TOUR OUVERT PAR ÉLÈVE. Deux tours en même temps, et
   les réponses du premier se mélangent au second : on ne saurait
   plus à quelle proposition l'élève a dit oui.
   ------------------------------------------------------------ */
function rvtTourOuvrir(d) {
  var eleves = d.eleves;
  try { if (typeof eleves === 'string') eleves = JSON.parse(eleves); }
  catch (e) { eleves = null; }
  var creneaux = d.creneaux;
  try { if (typeof creneaux === 'string') creneaux = JSON.parse(creneaux); }
  catch (e) { creneaux = null; }

  if (!eleves || !eleves.length) {
    return { status: 'error', message: 'Aucun élève sélectionné.' };
  }
  if (!creneaux || creneaux.length < 2) {
    return { status: 'error',
             message: 'Il faut au moins deux créneaux à proposer.' };
  }

  /* Ceux qui sont déjà dans un tour ouvert : on les écarte, et on le
     DIT. Les écarter en silence, c'est croire les avoir invités. */
  var ouverts = {};
  var shT = feuilleRvtTours();
  var shR = feuilleRvtReponses();
  var lignesT = shT.getDataRange().getValues();
  var toursOuverts = {};
  for (var i = 1; i < lignesT.length; i++) {
    if (String(lignesT[i][5] || '') === 'ouvert') toursOuverts[String(lignesT[i][0])] = true;
  }
  var lignesR = shR.getDataRange().getValues();
  for (var j = 1; j < lignesR.length; j++) {
    if (toursOuverts[String(lignesR[j][0])]) ouverts[normaliser(lignesR[j][2])] = true;
  }

  var retenus = [], ecartes = [];
  eleves.forEach(function (e) {
    var nom = String((e && e.eleve) || '').trim();
    if (!nom) return;
    if (ouverts[normaliser(nom)]) ecartes.push(nom);
    else retenus.push(e);
  });

  if (!retenus.length) {
    return { status: 'error',
             message: 'Tous ces élèves ont déjà une proposition en cours.' };
  }

  var id = 'T' + new Date().getTime();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris',
                                        'dd/MM/yyyy HH:mm');
  ajouterLigne(shT, [id, maintenant, String(d.par || ''),
                     JSON.stringify(creneaux), String(d.limite || ''),
                     'ouvert', '', '', String(d.remarque || '')]);

  /* Les lignes d'abord, les mails ensuite : si un envoi échoue, le
     tour existe et on peut relancer. L'inverse laisserait des mails
     partis vers un tour qui n'existe pas. */
  var envois = [];
  retenus.forEach(function (e) {
    var jeton = jetonRvt();
    ajouterLigne(shR, [id, jeton, String(e.eleve || ''),
                       String(e.mail || ''), String(e.mailPrescripteur || ''),
                       '', '', '', '', '', '', '']);
    envois.push({ eleve: String(e.eleve || ''), jeton: jeton,
                  mails: [String(e.mail || ''), String(e.mailPrescripteur || '')]
                          .filter(function (x) { return x && x.indexOf('@') > 0; }) });
  });

  /* ⚠️ LES MAILS NE PARTENT PAS D'ICI.

     Ils partaient de MailApp, c'est-à-dire du compte Google qui fait
     tourner le script — pas de contact@evolutionconduites.fr. Or
     TOUTE l'application envoie ses mails par « mailBilan », que le
     Worker relaie en SMTP depuis la bonne adresse : les rappels, les
     bilans, les convocations. J'avais construit un second canal à
     côté, et il ne partait pas.

     Ce tour rend donc ses jetons, et c'est l'écran qui envoie — par
     le même chemin que tout le reste. Il rappelle ensuite ce qui est
     parti par « rvtEnvois ». */
  return { status: 'ok', id: id, ouverts: retenus.length,
           ecartes: ecartes, envois: envois };
}


/* ------------------------------------------------------------
   AJOUTER DES FAMILLES À UN TOUR DÉJÀ PARTI

   « Une fois que c'est envoyé je ne peux ajouter personne. Il me
   faut la possibilité d'ajouter du monde à cette organisation même
   si une première salve est partie. »

   Un tour n'est pas une liste close : on invite quatre familles,
   deux répondent qu'elles ne peuvent pas, on en ajoute trois. Les
   nouvelles reçoivent LES MÊMES créneaux et la MÊME date limite —
   c'est le même rendez-vous, pas un second tour.

   ⚠️ ON N'AJOUTE QUE DANS UN TOUR OUVERT. Ajouter dans un tour
   clos enverrait une invitation à une date déjà retenue, ou déjà
   abandonnée.

   ⚠️ ET JAMAIS DEUX FOIS LE MÊME ÉLÈVE. Il est déjà dans ce tour,
   ou dans un autre encore ouvert : dans les deux cas, deux liens
   pour un seul rendez-vous, et deux grilles qui se contredisent.
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   COUPER L'ACCÈS AU SITE D'UNE FAMILLE

   David, le 9 septembre 2026 : « qu'on puisse supprimer l'accès au
   site à certains élèves », et sur le pourquoi : « c'est pour un
   lien parti par erreur ».

   ⚠️ ON NE SUPPRIME PAS LA LIGNE, ON COUPE LA PORTE.

   Supprimer effacerait aussi ce que cette famille avait répondu —
   or si le lien est parti par erreur, ses réponses ne valent rien
   mais le fait qu'elle en ait donné, si : c'est ce qui explique un
   compte qui ne tombe pas juste. Une ligne barrée se relit, une
   ligne supprimée ne se relit plus.

   ⚠️ ET ÇA SE DÉFAIT. On coupe un lien par erreur exactement comme
   on en envoie un par erreur. Un geste irréversible sur un geste de
   correction, c'est une deuxième erreur qui attend son tour.
   ------------------------------------------------------------ */
function rvtAcces(d) {
  var shR = feuilleRvtReponses();
  var lignes = shR.getDataRange().getValues();
  var id = String(d.id || '');
  var cible = normaliser(d.eleve || '');
  if (!cible) return { status: 'error', message: 'Élève manquant.' };

  var retire = String(d.retire || '') === 'oui';

  for (var i = 1; i < lignes.length; i++) {
    if (id && String(lignes[i][0]) !== id) continue;
    if (normaliser(lignes[i][2]) !== cible) continue;
    shR.getRange(i + 1, 13).setValue(retire ? 'oui' : '');
    return { status: 'ok', eleve: String(lignes[i][2] || ''),
             accesRetire: retire };
  }
  return { status: 'error', message: 'Cette famille n\'est pas dans ce tour.' };
}


/* La ligne d'un jeton, et son accès. Une seule lecture pour les
   deux questions que se posent la page publique et sa réponse. */
function ligneRvtDuJeton(shR, jeton) {
  var lignes = shR.getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][1]).trim() !== jeton) continue;
    return { i: i, r: lignes[i], coupe: String(lignes[i][12] || '') === 'oui' };
  }
  return null;
}


function rvtAjouter(d) {
  var tour = tourRvt(String(d.id || ''));
  if (!tour) return { status: 'error', message: 'Proposition introuvable.' };
  if (tour.clos) {
    return { status: 'error',
             message: 'Cette proposition est close : on ne peut plus y ' +
                      'ajouter personne.' };
  }

  var eleves = d.eleves;
  try { if (typeof eleves === 'string') eleves = JSON.parse(eleves); }
  catch (e) { eleves = null; }
  if (!eleves || !eleves.length) {
    return { status: 'error', message: 'Aucun élève sélectionné.' };
  }

  /* Les mêmes garde-fous que rvtTourOuvrir, et pour les mêmes
     raisons : un élève déjà engagé dans un tour ouvert — celui-ci
     ou un autre — est écarté, et il est NOMMÉ. */
  var shT = feuilleRvtTours();
  var shR = feuilleRvtReponses();
  var lignesT = shT.getDataRange().getValues();
  var toursOuverts = {};
  for (var i = 1; i < lignesT.length; i++) {
    if (String(lignesT[i][5] || '') === 'ouvert') {
      toursOuverts[String(lignesT[i][0])] = true;
    }
  }
  var lignesR = shR.getDataRange().getValues();
  var deja = {};
  for (var j = 1; j < lignesR.length; j++) {
    if (toursOuverts[String(lignesR[j][0])]) {
      deja[normaliser(lignesR[j][2])] = true;
    }
  }

  var retenus = [], ecartes = [];
  eleves.forEach(function (e) {
    var nom = String((e && e.eleve) || '').trim();
    if (!nom) return;
    if (deja[normaliser(nom)]) ecartes.push(nom);
    else retenus.push(e);
  });

  if (!retenus.length) {
    return { status: 'error', ecartes: ecartes,
             message: 'Ils sont déjà tous dans une proposition en cours.' };
  }

  /* Les lignes d'abord, les mails ensuite — et les mails partent de
     l'écran, par mailBilan, comme pour la première salve. */
  var envois = [];
  retenus.forEach(function (e) {
    var jeton = jetonRvt();
    ajouterLigne(shR, [tour.id, jeton, String(e.eleve || ''),
                       String(e.mail || ''), String(e.mailPrescripteur || ''),
                       '', '', '', '', '', '', '']);
    envois.push({ eleve: String(e.eleve || ''), jeton: jeton,
                  mails: [String(e.mail || ''), String(e.mailPrescripteur || '')]
                          .filter(function (x) { return x && x.indexOf('@') > 0; }) });
  });

  return { status: 'ok', id: tour.id, ajoutes: retenus.length,
           ecartes: ecartes, envois: envois,
           creneaux: tour.creneaux, limite: tour.limite };
}


/* ------------------------------------------------------------
   CHANGER LES CRÉNEAUX D'UN TOUR OUVERT

   « Et la possibilité d'ajouter des dates ou de changer des dates
   en fonction de certains retours. »

   ⚠️ LA RÈGLE QUI TIENT TOUT : UNE RÉPONSE PORTE SUR UNE DATE.

   Si le créneau « samedi 12 à 9 h » devient « samedi 19 à 9 h », les
   familles qui avaient dit oui avaient dit oui au 12. Garder leur
   oui, c'est leur faire dire quelque chose qu'elles n'ont pas dit —
   et convoquer un samedi matin des gens qui ne viendront pas.

   Donc : un créneau dont la date ou l'heure change reçoit un
   IDENTIFIANT NEUF, et les réponses qui portaient sur l'ancien sont
   effacées. Un créneau retiré, pareil. Un créneau inchangé garde son
   identifiant, et ses réponses avec.

   La fonction dit combien de réponses elle a effacées : l'écran le
   demande AVANT, et propose ensuite de prévenir les familles.
   ------------------------------------------------------------ */
function rvtCreneaux(d) {
  var tour = tourRvt(String(d.id || ''));
  if (!tour) return { status: 'error', message: 'Proposition introuvable.' };
  if (tour.clos) {
    return { status: 'error',
             message: 'Cette proposition est close : ses créneaux ne ' +
                      'changent plus.' };
  }

  var voulus = d.creneaux;
  try { if (typeof voulus === 'string') voulus = JSON.parse(voulus); }
  catch (e) { voulus = null; }
  if (!voulus || voulus.length < 2) {
    return { status: 'error',
             message: 'Il faut au moins deux créneaux à proposer.' };
  }

  /* Les anciens, par identifiant, pour savoir ce qui a bougé. */
  var anciens = {};
  (tour.creneaux || []).forEach(function (c) { anciens[String(c.id)] = c; });

  /* Le prochain identifiant libre : on ne réutilise pas un numéro
     déjà servi dans ce tour, même effacé. */
  var maxN = 0;
  (tour.creneaux || []).forEach(function (c) {
    var m = String(c.id || '').match(/^c(\d+)$/);
    if (m && +m[1] > maxN) maxN = +m[1];
  });

  var neufs = [], ajoutes = 0, changes = 0;
  voulus.forEach(function (c) {
    var date = String((c && c.date) || '').trim();
    if (!date) return;
    var heure = String((c && c.heure) || '').trim();
    /* Le lieu voyage en DEUX morceaux, et c'est voulu :

         · « lieu »    = ce que la famille LIT — « Loudéac —
                         3 rue Louis Lavergne, 22600 Loudéac ». Figé
                         au moment de l'envoi, parce que le mail est
                         déjà parti avec cette adresse-là. La page
                         des familles doit dire la même chose que le
                         mail, même si l'adresse change ensuite dans
                         les réglages.
         · « lieuCle » = la CLÉ, celle qui se range dans la fiche de
                         l'élève quand le créneau est retenu. */
    var lieu = String((c && c.lieu) || '').trim();
    var lieuCle = String((c && c.lieuCle) || '').trim();
    var ancien = anciens[String((c && c.id) || '')];

    if (ancien && String(ancien.date || '') === date &&
        String(ancien.heure || '') === heure) {
      /* Inchangé : il garde son identifiant, donc ses réponses. */
      neufs.push({ id: ancien.id, date: date, heure: heure,
                   lieu: lieu, lieuCle: lieuCle });
      return;
    }

    maxN++;
    neufs.push({ id: 'c' + maxN, date: date, heure: heure,
                 lieu: lieu, lieuCle: lieuCle });
    if (ancien) changes++; else ajoutes++;
  });

  if (neufs.length < 2) {
    return { status: 'error',
             message: 'Il faut au moins deux créneaux avec une date.' };
  }

  /* ── LES RÉPONSES ORPHELINES ──

     Tout ce qui portait sur un identifiant disparu s'en va. Les
     laisser, c'est compter des oui sur une date qui n'existe plus. */
  var connus = {};
  neufs.forEach(function (c) { connus[String(c.id)] = true; });

  var shR = feuilleRvtReponses();
  var lignes = shR.getDataRange().getValues();
  var effacees = 0, touchees = [], familles = [];

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== tour.id) continue;

    familles.push({
      eleve: String(lignes[i][2] || ''),
      jeton: String(lignes[i][1] || ''),
      mails: [String(lignes[i][3] || ''), String(lignes[i][4] || '')]
              .filter(function (x) { return x && x.indexOf('@') > 0; })
    });

    var rep = {};
    try { rep = lignes[i][7] ? JSON.parse(lignes[i][7]) : {}; }
    catch (e) { rep = {}; }

    var propre = {}, perdues = 0;
    Object.keys(rep).forEach(function (k) {
      if (connus[k]) propre[k] = rep[k];
      else perdues++;
    });

    if (perdues) {
      effacees += perdues;
      touchees.push(String(lignes[i][2] || ''));
      shR.getRange(i + 1, 8).setValue(
        Object.keys(propre).length ? JSON.stringify(propre) : '');
      /* La date de réponse reste : la famille A répondu, même si ce
         sur quoi elle répondait n'existe plus. « Pas de réponse » et
         « a répondu sur des dates qui ont changé » ne se soignent
         pas pareil — la seconde se relance en le disant. */
    }
  }

  shT_ecrireCreneaux(tour, neufs);

  return { status: 'ok', id: tour.id, creneaux: neufs,
           ajoutes: ajoutes, changes: changes,
           effacees: effacees, touchees: touchees,
           familles: familles, limite: tour.limite };
}

/* Une seule écriture, au même endroit que la lecture : la colonne 4
   du tour porte les créneaux, et rien d'autre ne les écrit. */
function shT_ecrireCreneaux(tour, creneaux) {
  tour.sh.getRange(tour.ligne, 4).setValue(JSON.stringify(creneaux));
}


/* Ce qui est parti, et ce qui ne l'est pas — dit par l'écran une
   fois les mails envoyés. Un mail dont on ne sait pas s'il est parti
   se renvoie deux fois. */
function noterEnvoisRvt(d) {
  var liste = d.envois;
  try { if (typeof liste === 'string') liste = JSON.parse(liste); }
  catch (e) { liste = null; }
  if (!liste || !liste.length) return { status: 'ok', notes: 0 };

  var shR = feuilleRvtReponses();
  var lignes = shR.getDataRange().getValues();
  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris',
                                        'dd/MM/yyyy HH:mm');
  var parJeton = {};
  liste.forEach(function (x) { parJeton[String(x.jeton || '')] = String(x.etat || ''); });

  var n = 0;
  for (var i = 1; i < lignes.length; i++) {
    var etat = parJeton[String(lignes[i][1])];
    if (etat === undefined) continue;
    shR.getRange(i + 1, 6).setValue(etat === 'envoyé' ? maintenant : '');
    shR.getRange(i + 1, 7).setValue(etat);
    n++;
  }
  return { status: 'ok', notes: n };
}


/* ------------------------------------------------------------
   LA LECTURE PUBLIQUE — elle n'écrit RIEN

   C'est le lien du mail qui arrive ici. Les messageries l'ouvrent
   toutes seules : cette fonction doit donc pouvoir être appelée
   cent fois sans conséquence.
   ------------------------------------------------------------ */
function lireRvt(jeton) {
  var j = String(jeton || '').trim();
  if (j.length !== 22) return { status: 'error', message: 'Lien inconnu.' };

  var shR = feuilleRvtReponses();
  var lignes = shR.getDataRange().getValues();
  var ligne = -1;
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][1]).trim() === j) { ligne = i; break; }
  }
  if (ligne < 0) return { status: 'error', message: 'Lien inconnu.' };

  /* ⚠️ UN ACCÈS COUPÉ SE DIT COMME UN LIEN MORT, PAS COMME UNE
     PANNE. La famille a reçu ce lien par erreur : elle ne doit ni
     voir un rendez-vous qui n'est pas le sien, ni croire que le
     site est cassé. Une phrase, et rien d'autre. */
  if (String(lignes[ligne][12] || '') === 'oui') {
    return { status: 'error', message: "Ce lien n'est plus valable." };
  }

  var r = lignes[ligne];
  var tour = tourRvt(String(r[0]));
  if (!tour) return { status: 'error', message: 'Proposition introuvable.' };

  var reponses = {};
  try { reponses = r[7] ? JSON.parse(r[7]) : {}; } catch (e) { reponses = {}; }

  /* CLOS OU NON, ON MONTRE. Une page qui refuserait de s'ouvrir
     après la date limite laisserait l'élève sans savoir ce qu'il
     avait répondu — et sans savoir que c'est clos. */
  return {
    status: 'ok',
    eleve: String(r[2] || ''),
    prenom: String(r[2] || '').split(' ')[0],
    creneaux: tour.creneaux,
    limite: tour.limite,
    clos: tour.clos,
    retenu: tour.retenu,
    reponses: reponses,
    accompagnateur: String(r[8] || ''),
    repond: String(r[9] || ''),
    reponduLe: texteCellule(r[10], true),
    /* ⚠️ « CLOS » NE DIT PAS À CETTE FAMILLE-LÀ CE QU'ELLE DEVIENT.

       Un tour clos, c'est une date choisie — mais choisie sur les
       disponibilités de la majorité. Celui qui n'avait pas coché ce
       jour-là n'y va pas, et la page lui disait exactement la même
       chose qu'aux autres : « voici ce que vous nous aviez
       indiqué ». Il refermait sans savoir s'il était attendu.

       Cette case-là, c'est le bureau qui l'a posée en retenant le
       créneau. Elle vaut réponse, et elle se dit. */
    retenuPourVous: String(r[11] || '') === 'oui'
  };
}

/* Un tour, lu et décodé. « clos » recouvre les deux façons de
   fermer : le bureau a choisi, ou la date limite est passée. */
function tourRvt(id) {
  var shT = feuilleRvtTours();
  var lignes = shT.getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== String(id)) continue;
    var creneaux = [];
    try { creneaux = lignes[i][3] ? JSON.parse(lignes[i][3]) : []; }
    catch (e) { creneaux = []; }

    /* ⚠️ LA LIMITE REPASSE PAR dateVersIso.

       Elle est écrite « 2026-09-15 », et Google la reconvertit tout
       seul en objet Date dans la cellule. String() rendait alors
       « Mon Sep 15 2026 00:00:00 GMT+0200 » — c'est ce que la page
       des familles affichait aux parents, en anglais et en GMT.
       Toutes les autres dates du fichier passent déjà par ici : ce
       champ-là était le seul à ne pas le faire. */
    var limite = dateVersIso(lignes[i][4]);
    var auj = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
    return {
      id: String(lignes[i][0]), ligne: i + 1, sh: shT,
      creee: texteCellule(lignes[i][1], true), par: String(lignes[i][2] || ''),
      creneaux: creneaux, limite: limite,
      statut: String(lignes[i][5] || ''),
      retenu: String(lignes[i][6] || ''),
      closLe: texteCellule(lignes[i][7], true),
      clos: String(lignes[i][5] || '') !== 'ouvert' ||
            (limite && limite < auj),
      remarque: String(lignes[i][8] || '')
    };
  }
  return null;
}


/* ------------------------------------------------------------
   LA RÉPONSE — en POST, et seulement en POST
   ------------------------------------------------------------ */
function repondreRvt(d) {
  var j = String(d.r || '').trim();
  if (j.length !== 22) return { status: 'error', message: 'Lien inconnu.' };

  var shR = feuilleRvtReponses();
  var lignes = shR.getDataRange().getValues();
  var ligne = -1;
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][1]).trim() === j) { ligne = i; break; }
  }
  if (ligne < 0) return { status: 'error', message: 'Lien inconnu.' };

  /* ⚠️ COUPER L'ACCÈS COUPE AUSSI L'ÉCRITURE. Un lien qui ne
     s'ouvre plus mais répond encore, c'est une porte fermée avec la
     fenêtre ouverte : la page publique est du HTML, on ne peut pas
     compter sur elle pour s'interdire quoi que ce soit. */
  if (String(lignes[ligne][12] || '') === 'oui') {
    return { status: 'error', message: "Ce lien n'est plus valable." };
  }

  var tour = tourRvt(String(lignes[ligne][0]));
  if (!tour) return { status: 'error', message: 'Proposition introuvable.' };

  /* LE JETON MEURT À LA DATE LIMITE. Un vieux lien retrouvé dans une
     boîte mail ne doit pas répondre au tour d'après — ni écraser une
     date déjà choisie. */
  if (tour.clos) {
    return { status: 'error', clos: true,
             message: 'Les réponses sont closes pour cette proposition.' };
  }

  var reponses = d.reponses;
  try { if (typeof reponses === 'string') reponses = JSON.parse(reponses); }
  catch (e) { reponses = null; }
  if (!reponses || typeof reponses !== 'object') {
    return { status: 'error', message: 'Réponse illisible.' };
  }

  /* On ne garde que les créneaux de CE tour : une réponse portant un
     créneau inconnu viendrait d'ailleurs. */
  var connus = {};
  (tour.creneaux || []).forEach(function (c) { connus[String(c.id)] = true; });
  var propre = {};
  Object.keys(reponses).forEach(function (k) {
    if (connus[k] && (reponses[k] === 'oui' || reponses[k] === 'non')) {
      propre[k] = reponses[k];
    }
  });

  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris',
                                        'dd/MM/yyyy HH:mm');
  shR.getRange(ligne + 1, 8).setValue(JSON.stringify(propre));
  shR.getRange(ligne + 1, 9).setValue(String(d.accompagnateur || ''));
  shR.getRange(ligne + 1, 10).setValue(String(d.repond || ''));
  shR.getRange(ligne + 1, 11).setValue(maintenant);

  return { status: 'ok', reponduLe: maintenant };
}


/* ------------------------------------------------------------
   CE QUE LE BUREAU VOIT : LES TOURS ET LEUR GRILLE
   ------------------------------------------------------------ */
function listerRvt() {
  var shT = feuilleRvtTours();
  var shR = feuilleRvtReponses();
  var lt = shT.getDataRange().getValues();
  var lr = shR.getDataRange().getValues();

  var parTour = {};
  for (var j = 1; j < lr.length; j++) {
    if (!lr[j][0]) continue;
    var reponses = {};
    try { reponses = lr[j][7] ? JSON.parse(lr[j][7]) : {}; }
    catch (e) { reponses = {}; }
    (parTour[String(lr[j][0])] = parTour[String(lr[j][0])] || []).push({
      eleve: String(lr[j][2] || ''),
      /* ⚠️ LE JETON REMONTE AU BUREAU — et seulement à lui.
         C'est ce qui permet de renvoyer SON lien à une famille sans
         rouvrir un tour, et de mettre l'adresse de sa page dans le
         mail de confirmation. La grille est derrière le droit
         « suivi_aac_cs » : elle n'est pas publique. */
      jeton: String(lr[j][1] || ''),
      mails: [String(lr[j][3] || ''), String(lr[j][4] || '')]
              .filter(function (x) { return x; }).length,
      envoyeLe: texteCellule(lr[j][5], true),
      envoi: String(lr[j][6] || ''),
      reponses: reponses,
      accompagnateur: String(lr[j][8] || ''),
      repond: String(lr[j][9] || ''),
      reponduLe: texteCellule(lr[j][10], true),
      retenu: String(lr[j][11] || ''),
      accesRetire: String(lr[j][12] || '') === 'oui'
    });
  }

  var tours = [];
  for (var i = 1; i < lt.length; i++) {
    if (!lt[i][0]) continue;
    var t = tourRvt(String(lt[i][0]));
    if (!t) continue;
    tours.push({ id: t.id, creee: t.creee, par: t.par, creneaux: t.creneaux,
                 limite: t.limite, statut: t.statut, retenu: t.retenu,
                 clos: t.clos, remarque: t.remarque,
                 eleves: parTour[t.id] || [] });
  }
  /* Le plus récent en premier : c'est celui qu'on regarde. */
  tours.reverse();
  return { status: 'ok', tours: tours };
}


/* ------------------------------------------------------------
   RETENIR UN CRÉNEAU

   « Un appui crée le rendez-vous avec ceux qui peuvent ; les autres
   restent dans la liste, prêts pour le tour suivant. »

   ⚠️ ON N'ÉCRIT LA DATE QUE SUR CEUX QUI ONT DIT OUI. Celui qui n'a
   pas répondu n'a pas dit oui : le compter présent, c'est
   l'attendre pour rien un samedi matin.
   ------------------------------------------------------------ */
/* ============================================================
   UN ENREGISTREMENT PARTIEL NE VIDE PAS LA FICHE

   ⚠️ DÉFAUT TROUVÉ EN POSANT LE LIEU DU RENDEZ-VOUS — v206.

   « enregistrerSuivi » réécrit la LIGNE ENTIÈRE à partir de ce
   qu'on lui donne : tout ce qui n'est pas dans l'objet ressort
   vide. Côté application ce n'est pas un problème — « majSuivi »
   renvoie toujours la fiche complète avec les champs modifiés
   par-dessus.

   Mais « retenirRvt » l'appelait avec QUATRE champs. Retenir un
   créneau effaçait donc, sur chaque élève retenu, tout le reste
   de sa fiche de suivi : date de permis, reste à payer, semaine
   demandée, moniteur, heures restantes. Silencieusement.

   On repart maintenant de la fiche telle qu'elle est, et on ne
   change que ce qui est demandé.

   ⚠️ À NE PAS CONFONDRE avec l'appel de « annulerResultat », qui
   veut, LUI, une fiche remise à blanc : il recrée une ligne
   supprimée. Les deux gestes existent, ils ne se remplacent pas.
   ============================================================ */
function majPartielleSuivi(champs) {
  var nom = String((champs && champs.eleve) || '').trim();
  if (!nom) return { status: 'error', message: 'Élève manquant.' };

  var actuel = null;
  try {
    var liste = listerSuivi() || [];
    for (var i = 0; i < liste.length; i++) {
      if (normaliser(liste[i].eleve) === normaliser(nom)) {
        actuel = liste[i];
        break;
      }
    }
  } catch (e) { actuel = null; }

  var d = {};
  if (actuel) {
    for (var k in actuel) {
      if (actuel.hasOwnProperty(k)) d[k] = actuel[k];
    }
  }
  for (var k2 in champs) {
    if (champs.hasOwnProperty(k2)) d[k2] = champs[k2];
  }
  d.eleve = nom;

  return enregistrerSuivi(d);
}


function retenirRvt(d) {
  var tour = tourRvt(String(d.id || ''));
  if (!tour) return { status: 'error', message: 'Proposition introuvable.' };

  var creneau = null;
  (tour.creneaux || []).forEach(function (c) {
    if (String(c.id) === String(d.creneau)) creneau = c;
  });
  if (!creneau) return { status: 'error', message: 'Créneau inconnu.' };

  var shR = feuilleRvtReponses();
  var lignes = shR.getDataRange().getValues();
  var retenus = [], laisses = [];

  /* ⚠️ CELUI QUI SORT DU RENDEZ-VOUS DOIT EN PERDRE LA DATE — v214.

     « Changer la date » retient un AUTRE créneau. Ceux qui avaient
     dit oui au premier mais pas au second sortent du rendez-vous —
     et sans ça, leur fiche garderait « théorique prévu le 19/09 »
     pour un rendez-vous auquel ils ne vont plus. Ils
     disparaîtraient de « Théorique à faire » sans être attendus
     nulle part : exactement la forme du dégât des places d'examen,
     une information restée vraie après que le fait a disparu.

     On ne compare pas les tours — une fiche ne dit pas d'où vient sa
     date. On compare la DATE : celui qui portait celle qu'on vient
     de remplacer, et qui n'est plus retenu, la perd. */
  var ancienne = '';
  (tour.creneaux || []).forEach(function (c) {
    if (tour.retenu && String(c.id) === String(tour.retenu)) {
      ancienne = String(c.date || '');
    }
  });

  /* ⚠️ UNE SEULE LECTURE DU CLASSEUR POUR TOUT LE MONDE — v211.

     David : « quand j'appuie sur retenir c'est très long ».

     Il l'était par construction. Chaque élève retenu passait par
     « majPartielleSuivi », qui relit la feuille de suivi ENTIÈRE
     pour retrouver sa ligne, puis appelle « enregistrerSuivi », qui
     la relit une SECONDE fois pour la réécrire en entier — et qui
     va au passage vérifier les places d'examen. Huit familles,
     c'était seize lectures complètes du suivi et huit réécritures
     de lignes de quatre-vingt-dix-huit colonnes, pour poser trois
     cases par personne.

     On lit donc la feuille UNE fois, ici, et on n'écrit que les
     trois cases qui changent — exactement ce que fait déjà
     « poserDatePermis » pour la date d'examen. La colonne 85 est
     l'état du théorique, la 86 sa date, la 98 la clé de son lieu.

     ⚠️ ET SURTOUT : ON N'ÉCRASE PLUS RIEN AU PASSAGE. Réécrire une
     ligne entière pour changer trois cases, c'est se donner
     quatre-vingt-quinze occasions d'effacer autre chose — le défaut
     du 6 septembre, exactement. Trois cases écrites, trois cases
     touchées. */
  var shS = feuilleSuivi();
  var lignesSuivi = shS.getDataRange().getValues();
  var ligneDe = {};
  for (var s = 1; s < lignesSuivi.length; s++) {
    var cle = normaliser(lignesSuivi[s][0]);
    if (cle && ligneDe[cle] === undefined) ligneDe[cle] = s + 1;
  }

  /* Effacer les trois cases du théorique, et elles seules. */
  var retirerTheorique = function (nom) {
    var l = ligneDe[normaliser(nom)];
    if (!l) return;
    if (!ancienne) return;
    /* Seulement si sa fiche porte encore la date qu'on remplace :
       une date posée par un AUTRE tour ne nous regarde pas. */
    if (String(lignesSuivi[l - 1][85] || '').trim() !== ancienne) return;
    shS.getRange(l, 85).setValue('');
    shS.getRange(l, 86).setValue('');
    shS.getRange(l, 98).setValue('');
  };

  var poserTheorique = function (nom) {
    var l = ligneDe[normaliser(nom)];
    /* Pas de fiche de suivi : rien à poser. La grille du bureau
       lit le tour lui-même, elle reste juste. */
    if (!l) return;
    shS.getRange(l, 85).setValue('prevu');
    shS.getRange(l, 86).setValue(String(creneau.date || ''));
    /* ⚠️ LA CLÉ, PAS L'ADRESSE. C'est ce qui permet de corriger
       « 4 rue Saint Benoît » une seule fois, dans les réglages, et
       que toutes les fiches suivent. */
    shS.getRange(l, 98).setValue(String(creneau.lieuCle || ''));
  };

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== tour.id) continue;
    var reponses = {};
    try { reponses = lignes[i][7] ? JSON.parse(lignes[i][7]) : {}; }
    catch (e) { reponses = {}; }
    var nom = String(lignes[i][2] || '');
    if (reponses[String(creneau.id)] === 'oui') {
      shR.getRange(i + 1, 12).setValue('oui');
      retenus.push(nom);
      try { poserTheorique(nom); }
      catch (e) { /* la grille reste juste, on le verra */ }
    } else {
      shR.getRange(i + 1, 12).setValue('');
      laisses.push(nom);
      try { retirerTheorique(nom); }
      catch (e) { /* la grille reste juste, on le verra */ }
    }
  }

  tour.sh.getRange(tour.ligne, 6).setValue('clos');
  tour.sh.getRange(tour.ligne, 7).setValue(String(creneau.id));
  tour.sh.getRange(tour.ligne, 8).setValue(
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'));

  /* ⚠️ CELUI QUI ÉCRIT REND CE QU'IL A ÉCRIT.

     David : « je dois rafraîchir la page pour que ça apparaisse sur
     les noms ». Ce n'était pas un cache : la date s'écrit ICI, par
     Apps Script, et l'écran allait la relire par l'AUTRE porte — le
     Worker, qui lit la feuille directement par l'API Sheets. Deux
     portes sur le même classeur, et rien qui fasse attendre la
     seconde que la première ait fini de poser. L'écran redemandait
     quelques centièmes de seconde après le « c'est fait » : la
     feuille répondait avec ce qu'elle avait.

     Une pause avant de relire aurait marché presque toujours —
     donc raté un jour, sans prévenir. La seule réponse qui ne peut
     pas être en retard, c'est celle de celui qui vient d'écrire :
     il relit SA feuille, il voit forcément son écriture. L'écran
     n'a plus rien à redemander à personne. */
  var fiches = [];
  try {
    var toutes = listerSuivi() || [];
    var vises = {};
    retenus.forEach(function (n) { vises[normaliser(n)] = true; });
    toutes.forEach(function (s) {
      if (vises[normaliser(s.eleve)]) fiches.push(s);
    });
  } catch (e) { /* l'écran relira par le chemin long, comme avant */ }

  return { status: 'ok', retenus: retenus, laisses: laisses,
           date: String(creneau.date || ''),
           lieuCle: String(creneau.lieuCle || ''),
           heure: String(creneau.heure || ''),
           lieu: String(creneau.lieu || ''),
           suivi: fiches };
}


/* ============================================================
   ANNULER UN RENDEZ-VOUS DÉJÀ RETENU

   David, le 10 septembre 2026 : « on repart propre ».

   Le rendez-vous n'a pas lieu. La proposition retourne à l'état
   ouvert — avec ses réponses, qui n'ont pas changé — et les élèves
   redeviennent proposables.

   ⚠️ ET LA DATE QUITTE LEURS FICHES.

   C'est la moitié qu'on oublierait. Elle y est écrite noir sur
   blanc, et c'est elle qui les fait disparaître de « Théorique à
   faire ». Annuler sans l'effacer laisserait des élèves annoncés
   « théorique prévu le 19/09 » pour un rendez-vous qui n'existe
   plus, ET invisibles dans la liste de ceux à replacer. Une
   information restée vraie après que le fait a disparu : c'est
   exactement ce qui a vidé les places d'examen le 9 septembre.

   ⚠️ ON NE SUPPRIME RIEN. Les réponses des familles restent, la
   ligne du tour reste. Un rendez-vous annulé se relit, et se
   redécide : c'est le même tour, pas un nouveau.
   ============================================================ */
function annulerRvt(d) {
  var tour = tourRvt(String(d.id || ''));
  if (!tour) return { status: 'error', message: 'Proposition introuvable.' };
  if (!tour.retenu) {
    return { status: 'error',
             message: "Cette proposition n'a pas de date retenue." };
  }

  var ancienne = '';
  (tour.creneaux || []).forEach(function (c) {
    if (String(c.id) === String(tour.retenu)) ancienne = String(c.date || '');
  });

  var shS = feuilleSuivi();
  var lignesSuivi = shS.getDataRange().getValues();
  var ligneDe = {};
  for (var s2 = 1; s2 < lignesSuivi.length; s2++) {
    var cle = normaliser(lignesSuivi[s2][0]);
    if (cle && ligneDe[cle] === undefined) ligneDe[cle] = s2 + 1;
  }

  var shR = feuilleRvtReponses();
  var lignes = shR.getDataRange().getValues();
  var rendus = [];

  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) !== tour.id) continue;
    var etait = String(lignes[i][11] || '') === 'oui';
    shR.getRange(i + 1, 12).setValue('');
    if (!etait) continue;

    var nom = String(lignes[i][2] || '');
    rendus.push(nom);
    var l = ligneDe[normaliser(nom)];
    if (!l) continue;
    /* La même prudence qu'au changement de date : on n'efface que
       si sa fiche porte encore CETTE date-là. */
    if (ancienne && String(lignesSuivi[l - 1][85] || '').trim() !== ancienne) continue;
    shS.getRange(l, 85).setValue('');
    shS.getRange(l, 86).setValue('');
    shS.getRange(l, 98).setValue('');
  }

  tour.sh.getRange(tour.ligne, 6).setValue('ouvert');
  tour.sh.getRange(tour.ligne, 7).setValue('');
  tour.sh.getRange(tour.ligne, 8).setValue('');

  return { status: 'ok', rendus: rendus, date: ancienne };
}


/* Fermer un tour sans rien retenir : la proposition n'a pas abouti,
   et les élèves redeviennent proposables. */
function fermerRvt(d) {
  var tour = tourRvt(String(d.id || ''));
  if (!tour) return { status: 'error', message: 'Proposition introuvable.' };
  tour.sh.getRange(tour.ligne, 6).setValue('abandonne');
  tour.sh.getRange(tour.ligne, 8).setValue(
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'));
  return { status: 'ok' };
}

function supprimerSuivi(eleve) {
  var sh = feuilleSuivi();
  var lignes = sh.getDataRange().getValues();
  var cible = normaliser(eleve);
  for (var i = lignes.length - 1; i >= 1; i--) {
    if (normaliser(lignes[i][0]) === cible) sh.deleteRow(i + 1);
  }
  return { status: 'ok' };
}

/* ---------- CONFIGURATION : places d'examen par période ---------- */
var NOM_ONGLET_CONFIG = 'Config';

function feuilleConfig() {
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
  var sh = classeur.getSheetByName(NOM_ONGLET_CONFIG);
  if (!sh) {
    sh = classeur.insertSheet(NOM_ONGLET_CONFIG);
    ajouterLigne(sh, ['Clé', 'Valeur', 'Mis à jour le']);
  }
  return sh;
}

function lireConfig(cle) {
  var lignes = feuilleConfig().getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) === String(cle)) return String(lignes[i][1] || '');
  }
  return '';
}

function ecrireConfig(cle, valeur) {
  var sh = feuilleConfig();
  var lignes = sh.getDataRange().getValues();
  var ligne = -1;
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) === String(cle)) { ligne = i + 1; break; }
  }
  if (ligne === -1) ligne = sh.getLastRow() + 1;
  var plage = sh.getRange(ligne, 1, 1, 3);
  plage.setNumberFormat('@');
  plage.setValues([[String(cle), String(valeur || ''),
    Utilities.formatDate(new Date(),
      SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'dd/MM/yyyy HH:mm')]]);
  return { status: 'ok' };
}

/* ============================================================
   CE COURS FAIT-IL AVANCER LE COMPTEUR DE LEÇONS ?

   ⚠️ LA MÊME RÈGLE QUE « estUneLecon » DANS ec-questionnaire.js, ET
   QUE « estUneLeconDeConduite » DANS LE WORKER. Elle ne l'était pas,
   et c'est le 17 septembre 2026 qu'on s'en est aperçu.

   Le test « ^Conduite ou ^AAC » était écrit ici en clair, une
   deuxième fois dans le Worker, et une troisième fois dans l'écran —
   mais l'écran, lui, excluait EN PLUS les rendez-vous pédagogiques.
   Or « AAC — Rendez-vous pédagogique (RVP 1 et 2) » commence bien
   par « AAC ». Le serveur le comptait, l'écran le refusait.

   Conséquence, jamais signalée comme une panne : un élève en
   conduite accompagnée qui a fait ses deux RVP était annoncé DEUX
   LEÇONS PLUS LOIN qu'il ne l'est, selon l'écran qui l'affichait.
   Un rendez-vous pédagogique se passe assis, dans une salle, avec
   l'accompagnateur — ce n'est pas une leçon de conduite, et la
   frise ne doit pas avancer.

   ⚠️ AU DÉPLOIEMENT, CERTAINS NUMÉROS VONT DESCENDRE. C'est le
   chiffre juste qui arrive, pas un chiffre qui se perd.

   Trois moteurs, trois écritures — on ne peut pas partager du code
   entre eux. On peut, et on doit, les faire répondre pareil : c'est
   ce que vérifie test-lecon-meme-regle-partout.js, en exécutant les
   trois sur la même liste de libellés.
   ============================================================ */
function estUneLeconDeConduite(type) {
  var t = String(type || '');
  if (!/^Conduite/i.test(t) && !/^AAC/i.test(t)) return false;
  return !/rendez-vous|rvp/i.test(t);
}

/* ---------- ÉTAT DES ÉLÈVES pour les listes du bureau ---------- */
function etatEleves() {
  var sh = feuille();
  var nb = sh.getLastRow();
  if (nb < 2) return [];

  /* On saute volontairement la colonne E : le texte des cours pèse
     l'essentiel du classeur et n'est pas utile ici. */
  var blocA = sh.getRange(2, 1, nb - 1, 4).getValues();   // A-D
  var blocF = sh.getRange(2, 6, nb - 1, 5).getValues();   // F-J

  var parEleve = {};
  for (var i = 0; i < blocA.length; i++) {
    var nom = texteCellule(blocA[i][3], false).trim();
    if (!nom) continue;
    var cle = normaliser(nom);
    var type = texteCellule(blocF[i][0], false);

    if (!parEleve[cle]) {
      parEleve[cle] = { eleve: nom, note: '', date: '', type: '', horodatage: '',
                        moniteur: '', boite: '', ants: '', lecons: 0 };
    }
    var e = parEleve[cle];
    /* ⚠️ LE COMPTE AVANT CETTE LIGNE-CI : c'est lui qui sert à
       mesurer l'écart, juste en dessous. On le prend donc AVANT
       d'incrémenter. */
    var avantCeCours = e.lecons;
    if (estUneLeconDeConduite(type)) e.lecons++;

    /* Le numéro écrit dans la note fait autorité : un élève venu
       de l'ancien fonctionnement n'a qu'un bilan enregistré alors
       qu'il en est à sa huitième leçon. */
    var mLecon = String(texteCellule(blocF[i][1], false))
      .match(/(\d+)\s*(?:ère|ere|ème|eme|e)?\s*le[çc]on/i);
    if (mLecon) {
      var num = parseInt(mLecon[1], 10);
      if (!isNaN(num) && num > (e.leconNum || 0)) e.leconNum = num;

      /* ============================================================
         ⚠️ L'ÉCART ENTRE CE QU'UNE MAIN A ÉCRIT ET CE QU'ON COMPTE

         David a signalé trois fois en deux jours que « le décompte
         ne se fait pas tout seul ». À chaque fois il fallait trouver
         l'élève concerné à la main, un par un. Personne ne pouvait
         répondre à la question qui compte : QUI est en écart ?

         Elle se calcule pourtant sans un appel de plus, et
         seulement ICI : c'est le seul endroit de l'application où
         les lignes d'un élève sont parcourues DANS L'ORDRE. Ailleurs
         on n'a plus que des totaux, et un total ne dit pas à quel
         moment un chiffre a été écrit.

         Au moment où une main écrit « 8ème leçon » sur un cours,
         ce cours EST le 8ème : le compte d'avant, plus celui-ci,
         doit faire 8. S'il fait 6, l'élève a deux leçons que le
         classeur n'a pas — prises ailleurs, ou sans bilan — et
         l'écart RESTE vrai au cours suivant, et au suivant. C'est
         exactement ce que « decalTotal » sert à corriger une fois
         pour toutes.

         On garde le DERNIER : un écart posé il y a six mois a pu
         être rattrapé depuis.

         ⚠️ SEULEMENT SUR UNE LEÇON. « 8ème leçon » écrit dans la
         note d'un examen blanc parle d'autre chose : cette ligne-là
         ne compte pas dans la frise, et la mesurer ferait un écart
         d'une unité sur tous les élèves qui en ont passé un.
         ============================================================ */
      if (!isNaN(num) && estUneLeconDeConduite(type)) {
        e.ecartRang = num - (avantCeCours + 1);
      }
    }
    if (!e.boite && blocF[i][3]) e.boite = texteCellule(blocF[i][3], false);
    if (!e.ants && blocF[i][4]) e.ants = texteCellule(blocF[i][4], false);

    /* La dernière ligne rencontrée est la plus récente */
    e.note = texteCellule(blocF[i][1], false);
    e.date = texteCellule(blocA[i][0], false);
    e.type = type;
    e.horodatage = texteCellule(blocF[i][2], true);
    e.moniteur = texteCellule(blocA[i][2], false);
  }

  var out = [];
  for (var k in parEleve) out.push(parEleve[k]);
  return out;
}

/* ---------- SUPPRESSION : effacer tous les bilans d'un élève ---------- */
function supprimerEleve(nomEleve) {
  var recherche = normaliser(nomEleve);
  if (recherche.length < 2) {
    return { status: 'error', message: 'Nom trop court.' };
  }

  var sh = feuille();
  var lignes = sh.getDataRange().getValues();
  var aSupprimer = [];

  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][3]) === recherche) {
      aSupprimer.push(i + 1);          // numéro de ligne réel (1-indexé)
    }
  }

  /* AUCUN BILAN NE VEUT PAS DIRE AUCUNE TRACE.

     On repartait ici, sans toucher au reste : un élève parti avant
     son premier cours gardait donc son accès à l'espace, ses
     récitations, ses lignes dans le journal des envois. Un droit à
     l'effacement qui dépend du nombre de bilans n'en est pas un. */

  /* On supprime en partant du bas : sinon les numéros de ligne
     se décalent au fur et à mesure et on efface les mauvaises. */
  aSupprimer.sort(function (a, b) { return b - a; });
  for (var k = 0; k < aSupprimer.length; k++) {
    sh.deleteRow(aSupprimer[k]);
  }

  /* Son adresse, lue AVANT que le répertoire ne parte : c'est elle
     qui identifie ses lignes dans le journal des envois manqués,
     et après on ne saurait plus laquelle chercher. */
  var sonMail = '';
  try {
    var lE = feuilleEleves().getDataRange().getValues();
    for (var m = 1; m < lE.length; m++) {
      if (normaliser(lE[m][0]) !== recherche) continue;
      sonMail = String(lE[m][2] || '').trim();
      break;
    }
  } catch (e) { /* pas de répertoire : on fera sans */ }

  /* Ce qui vit ailleurs part aussi : garder ses récitations sans
     l'élève laisserait des lignes orphelines. */
  var ailleurs = effacerTracesEleve(nomEleve, sonMail);

  return { status: 'ok', supprimees: aSupprimer.length, ailleurs: ailleurs,
           message: aSupprimer.length ? '' : 'Aucun bilan trouvé.' };
}


/* ============================================================
   LE MÉNAGE DES FEUILLES TECHNIQUES

   Rien n'était jamais purgé : ni les liens de cours, ni les mails
   manqués, ni les alertes masquées. Des noms, des numéros et des
   adresses de 2024 dormaient encore dans le classeur en 2026, sans
   que personne ne s'en serve jamais.

   DEUX RÉGIMES, ET UN SEUL EST AUTOMATIQUE. Ce qui part tout seul
   ici ne concerne QUE des feuilles techniques, où rien ne se perd :
   un lien de cours expiré, une ligne de coût, un mail qui n'est
   pas parti il y a deux ans. Les dossiers d'élèves, eux, ne
   s'effacent jamais tout seuls — ils se proposent, et c'est le
   bureau qui appuie.

   ⚠️ LE COMPTE RENDU NE NOMME PERSONNE. Il serait absurde
   d'effacer le nom d'un élève d'une feuille pour le réécrire dans
   le rapport de son effacement. On dit combien de lignes, de
   quelle période, et ce qui reste. Rien d'autre.
   ============================================================ */

/* Colonne où lire la date, et au bout de combien de mois la ligne
   n'a plus de raison d'être. */
/* ------------------------------------------------------------
   LES DURÉES SE RÈGLENT DEPUIS L'ÉCRAN

   Elles étaient écrites en dur ici. David les a choisies, il
   doit pouvoir les revoir sans qu'on redéploie — une durée de
   conservation, ça se discute avec un conseil et ça bouge.

   Les nombres ci-dessous restent les DÉFAUTS : ce sont eux qui
   s'appliquent tant que rien n'a été réglé, et eux vers qui on
   retombe si la valeur enregistrée est illisible.

   ⚠️ ZÉRO VEUT DIRE « NE JAMAIS EFFACER », PAS « TOUT EFFACER ».
   C'est la seule façon de rendre un champ vidé inoffensif. Une
   case laissée vide, un copier-coller raté, et l'autre convention
   viderait la feuille entière à 4 h du matin sans que personne
   n'ait rien demandé.
   ------------------------------------------------------------ */
var CLE_DUREES = 'dureesConservation';
var MOIS_MAXI = 120;          /* dix ans : au-delà, c'est une faute de frappe */

/* Le réglage enregistré, ou le défaut. Jamais autre chose. */
function moisRegles(nom, defaut) {
  try {
    var brut = lireReglages()[CLE_DUREES];
    if (!brut) return defaut;
    var tout = JSON.parse(brut);
    if (!tout || typeof tout !== 'object') return defaut;
    if (!(nom in tout)) return defaut;

    var v = Number(tout[nom]);
    /* Illisible ou aberrant : on retombe sur le défaut. Un ménage
       ne se déclenche pas sur une valeur qu'on ne comprend pas. */
    if (!isFinite(v) || v < 0 || v > MOIS_MAXI) return defaut;
    return Math.floor(v);
  } catch (e) {
    return defaut;
  }
}

/* « quoi » sert au compte rendu du ménage (« 12 liens de cours
   effacés ») ; « libelle » est ce que l'écran des durées affiche.
   Les deux vivent ici, à côté de la règle qu'ils décrivent. */
var MENAGE_TECHNIQUE = [
  { feuille: 'LiensCours',     colonne: 10, mois: 12, quoi: 'liens de cours',
    libelle: 'Liens de cours envoyés aux élèves' },
  { feuille: 'MailsEchoues',   colonne: 0,  mois: 12, quoi: 'mails manqués',
    libelle: 'Journal des mails qui ne sont pas partis' },
  { feuille: 'CoutsIA',        colonne: 0,  mois: 12, quoi: "lignes de coût IA",
    libelle: "Comptabilité de l'IA" },
  { feuille: 'NotifsMasquees', colonne: 2,  mois: 12, quoi: 'alertes masquées',
    libelle: 'Alertes masquées par le bureau' },
  /* Un cours « en route » depuis trois mois n'est pas en route.
     Trois mois et non trois jours : cette liste sert justement à
     retrouver le travail d'un moniteur bloqué, et l'effacer avant
     qu'on l'ait vue serait pire que de la laisser. */
  { feuille: 'EnCours',        colonne: 4,  mois: 3,
    quoi: 'cours restés « en route »',
    libelle: 'Cours restés marqués « en route »' },
  /* ⚠️ DEUX MOIS, ET C'EST DAVID QUI L'A DIT — 15 septembre :
     « OUi 2 mois et dans le dossier élève à la fin si un élève
     demande tout ce qu'on a sur lui ».

     C'est aussi ce que la CNIL retient comme durée ordinaire pour
     un relevé de géolocalisation. Une règle de conservation qu'on
     applique à la main est une règle qu'on n'applique pas : elle
     est ici, dans le ménage qui tourne tout seul à 4 h. */
  { feuille: 'Trajets',        colonne: 1,  mois: 2,
    quoi: 'tracés de trajet',
    libelle: 'Tracés GPS des cours — carte envoyée à l’élève' }
];

/* Le journal d'activité a déjà sa purge (voir purgerJournal), et
   les brouillons la leur (purgerBrouillons) : on ne les double
   pas — deux ménages sur la même feuille finiraient par se
   contredire sur la durée. */

/* LE JOURNAL DES SMS NE S'EFFACE PAS : IL SE DÉPOUILLE.

   C'est aussi la preuve qu'un rappel est parti, et la source du
   suivi des coûts. On retire donc ce qui identifie — le nom, le
   numéro, le texte du message, le jeton — et on garde la date, le
   nombre de parties, l'état et le canal. On perd la preuve
   nominative, pas la comptabilité. */
var SMS_MOIS = 3;
var SMS_COLONNES_A_VIDER = [1, 2, 7, 9];   /* Élève, Numéro, Message, Jeton */

/* Les défauts, tels que la table les déclare. L'écran les affiche
   à côté des durées réglées, pour qu'on sache toujours d'où l'on
   part — et il les lit ICI, il ne les recopie pas. */
function defautsDuMenage() {
  var out = { sansCours: MENAGE_MOIS_SANS_COURS,
              jamaisVu: MENAGE_MOIS_JAMAIS_VU,
              aSurveiller: MENAGE_MOIS_A_SURVEILLER,
              recitations: MENAGE_MOIS_RECITATIONS,
              sms: SMS_MOIS };
  for (var i = 0; i < MENAGE_TECHNIQUE.length; i++) {
    out[MENAGE_TECHNIQUE[i].feuille] = MENAGE_TECHNIQUE[i].mois;
  }
  return out;
}

/* Et la liste que l'écran affiche, avec le libellé en clair. Une
   feuille ajoutée à la table apparaît d'elle-même dans l'écran :
   sans ça, une durée réglable et invisible ne se règle jamais. */
function feuillesDuMenage() {
  var out = [];
  for (var i = 0; i < MENAGE_TECHNIQUE.length; i++) {
    var r = MENAGE_TECHNIQUE[i];
    out.push({ cle: r.feuille, libelle: r.libelle || r.quoi });
  }
  return out;
}

/* Les durées effectivement appliquées cette nuit : les défauts
   ci-dessus, corrigés par ce qui a été réglé dans l'écran. */
function dureesDuMenage() {
  var out = { sms: moisRegles('sms', SMS_MOIS) };
  for (var i = 0; i < MENAGE_TECHNIQUE.length; i++) {
    var f = MENAGE_TECHNIQUE[i].feuille;
    out[f] = moisRegles(f, MENAGE_TECHNIQUE[i].mois);
  }
  return out;
}

/* Une cellule de date peut être un vrai Date (Google convertit
   parfois tout seul) ou du texte « 14/08/2025 10:30 ». Les deux
   doivent rendre le même « 2025-08-14 », sans quoi la moitié d'une
   feuille passerait pour sans date — et une ligne sans date, on
   n'y touche pas. */
function jourDeCellule(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, 'Europe/Paris', 'yyyy-MM-dd');
  }

  /* ============================================================
     ⚠️ ET UNE DATE ÉCRITE EN ISO EST UNE DATE — v1055

     David, le 19 septembre : le bouton 🗺️ d'un cours répondait
     « aucun trajet enregistré » alors que le bilan comptait 1084
     points. Le tracé était rangé sous « 2026-09-19 » quand tout le
     reste écrit « 19/09/2026 » : le bilan manuel ne posait pas la
     date courte, et la valeur brute d'un <input type="date"> est
     de l'ISO. C'est réparé côté écran (voir enregistrerLeTrajet).

     Mais les lignes déjà écrites, elles, restent — et « jourComparable »
     ne connaît que le format français. Elles passaient donc pour
     « sans date », et une ligne sans date ne s'efface JAMAIS : des
     relevés GPS conservés sans fin, alors que la note de service et
     la CNIL disent deux mois.

     ⚠️ ON ÉLARGIT LA LECTURE, ON NE RÉÉCRIT PAS LES LIGNES. Une
     ligne du classeur est un enregistrement daté ; la relire mieux
     ne lui fait rien dire de neuf. Et c'est le ménage seul qui
     passe ici : « jourComparable » garde sa règle pour tous ses
     autres appelants.
     ============================================================ */
  var iso = String(v === undefined || v === null ? '' : v)
    .match(/^\s*(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];

  return jourComparable(v);
}

function jourLimite(mois) {
  var d = new Date();
  d.setMonth(d.getMonth() - mois);
  return Utilities.formatDate(d, 'Europe/Paris', 'yyyy-MM-dd');
}

/* « 2025-08-14 » → « 14/08/2025 », pour le compte rendu. */
function jourLisible(iso) {
  var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(iso || '');
}

/* Efface d'une feuille les lignes plus vieilles que la limite.
   Rend de quoi écrire une phrase : combien, de quand à quand, et
   combien restent. */
function menageFeuille(regle, moisVoulus) {
  var mois = (moisVoulus === undefined || moisVoulus === null)
    ? regle.mois : moisVoulus;

  var bilan = { quoi: regle.quoi, feuille: regle.feuille, mois: mois,
                efface: 0, restent: 0, plusVieux: '', plusRecent: '',
                sansDate: 0, absente: false };
  var sh;
  try {
    sh = classeur().getSheetByName(regle.feuille);
  } catch (e) { sh = null; }

  if (!sh) { bilan.absente = true; return bilan; }
  if (sh.getLastRow() < 2) return bilan;

  /* ZÉRO = ON NE TOUCHE À RIEN. Voir CLE_DUREES. */
  if (!mois) { bilan.jamais = true; bilan.restent = sh.getLastRow() - 1; return bilan; }

  var limite = jourLimite(mois);
  var lignes = sh.getDataRange().getValues();

  for (var i = lignes.length - 1; i >= 1; i--) {
    var jour = jourDeCellule(lignes[i][regle.colonne]);
    /* SANS DATE, ON NE TOUCHE À RIEN. Une colonne déplacée, un
       format inattendu, et un ménage trop confiant viderait la
       feuille entière. On compte ces lignes et on les dit : c'est
       le signe qu'il faut venir regarder. */
    if (!jour) { bilan.sansDate++; bilan.restent++; continue; }
    if (jour >= limite) { bilan.restent++; continue; }

    if (!bilan.plusRecent || jour > bilan.plusRecent) bilan.plusRecent = jour;
    if (!bilan.plusVieux || jour < bilan.plusVieux) bilan.plusVieux = jour;
    sh.deleteRow(i + 1);
    bilan.efface++;
  }
  return bilan;
}

/* Le journal des SMS : on vide les colonnes qui nomment, on garde
   la ligne. */
function menageSms(moisVoulus) {
  var mois = (moisVoulus === undefined || moisVoulus === null)
    ? SMS_MOIS : moisVoulus;

  var bilan = { quoi: 'envois de SMS', feuille: 'Sms', mois: mois,
                efface: 0, restent: 0, plusVieux: '', plusRecent: '',
                sansDate: 0, absente: false, depouille: true };
  var sh;
  try {
    sh = classeur().getSheetByName('Sms');
  } catch (e) { sh = null; }

  if (!sh) { bilan.absente = true; return bilan; }
  if (sh.getLastRow() < 2) return bilan;

  if (!mois) { bilan.jamais = true; bilan.restent = sh.getLastRow() - 1; return bilan; }

  var limite = jourLimite(mois);
  var lignes = sh.getDataRange().getValues();

  for (var i = 1; i < lignes.length; i++) {
    var jour = jourDeCellule(lignes[i][0]);
    if (!jour) { bilan.sansDate++; bilan.restent++; continue; }
    if (jour >= limite) { bilan.restent++; continue; }

    /* Déjà dépouillée lors d'un passage précédent : on ne la
       recompte pas, sinon le rapport annoncerait chaque jour un
       travail qui n'a lieu qu'une fois. */
    var restaitQuelqueChose = false;
    for (var k = 0; k < SMS_COLONNES_A_VIDER.length; k++) {
      if (String(lignes[i][SMS_COLONNES_A_VIDER[k]] || '') !== '') {
        restaitQuelqueChose = true;
        break;
      }
    }
    if (!restaitQuelqueChose) { bilan.restent++; continue; }

    for (var j = 0; j < SMS_COLONNES_A_VIDER.length; j++) {
      sh.getRange(i + 1, SMS_COLONNES_A_VIDER[j] + 1).setValue('');
    }
    if (!bilan.plusRecent || jour > bilan.plusRecent) bilan.plusRecent = jour;
    if (!bilan.plusVieux || jour < bilan.plusVieux) bilan.plusVieux = jour;
    bilan.efface++;
    bilan.restent++;
  }
  return bilan;
}

/* Une ligne de compte rendu par feuille. Détaillée : combien, de
   quand à quand, et ce qui reste — sans quoi « 42 lignes
   effacées » ne dit pas si c'est normal. */
function phraseMenage(b) {
  if (b.absente) return '· ' + b.feuille + ' : feuille absente, rien à faire';
  if (b.jamais) {
    return '· ' + b.feuille + ' : conservation illimitée (réglée à 0), ' +
           b.restent + ' ligne(s) gardée(s)';
  }
  if (!b.efface) {
    return '· ' + b.feuille + ' : rien à faire (' + b.restent +
           ' ligne' + (b.restent > 1 ? 's' : '') + ' gardée' +
           (b.restent > 1 ? 's' : '') + ')' +
           (b.sansDate ? ' — dont ' + b.sansDate + ' sans date lisible' : '');
  }

  var periode = (b.plusVieux === b.plusRecent)
    ? ' du ' + jourLisible(b.plusVieux)
    : ' du ' + jourLisible(b.plusVieux) + ' au ' + jourLisible(b.plusRecent);

  return '· ' + b.feuille + ' : ' + b.efface + ' ' + b.quoi +
         (b.depouille
           ? ' dépouillés de leur nom, numéro et message' + periode +
             ' (date, coût et état gardés)'
           : ' effacés' + periode) +
         ' — plus de ' + b.mois + ' mois. Restent ' + b.restent + ' ligne' +
         (b.restent > 1 ? 's' : '') +
         (b.sansDate ? ', dont ' + b.sansDate + ' sans date lisible' : '') + '.';
}

/* ------------------------------------------------------------
   LE PASSAGE COMPLET

   Appelé par un déclencheur quotidien. N'écrit dans 🚨 Signalements
   QUE s'il a fait quelque chose : une ligne par jour disant « rien
   à faire » est une ligne qu'on apprend à ne plus lire, et le jour
   où elle dit autre chose, personne ne la voit.

   Une suppression silencieuse, en revanche, est indistinguable
   d'une perte de données. D'où le compte rendu détaillé.
   ------------------------------------------------------------ */
function menageConservation() {
  var bilans = [];

  var durees = dureesDuMenage();

  for (var i = 0; i < MENAGE_TECHNIQUE.length; i++) {
    try {
      bilans.push(menageFeuille(MENAGE_TECHNIQUE[i],
                                durees[MENAGE_TECHNIQUE[i].feuille]));
    } catch (e) {
      bilans.push({ feuille: MENAGE_TECHNIQUE[i].feuille, absente: false,
                    efface: 0, restent: 0, sansDate: 0, erreur: String(e),
                    quoi: MENAGE_TECHNIQUE[i].quoi,
                    mois: MENAGE_TECHNIQUE[i].mois });
    }
  }
  try { bilans.push(menageSms(durees.sms)); } catch (e) { /* tant pis */ }

  var total = 0, alertes = [];
  for (var j = 0; j < bilans.length; j++) {
    total += bilans[j].efface || 0;
    if (bilans[j].erreur) {
      alertes.push(bilans[j].feuille + ' : ' + bilans[j].erreur);
    }
    /* QUELQUES lignes sans date, c'est du bruit ordinaire : on les
       compte dans le détail et on n'en fait pas une alerte, sinon
       le même avertissement reviendrait chaque nuit jusqu'à la fin
       des temps, et on apprendrait à ne plus le lire.

       TOUTE une feuille sans date, c'est autre chose : c'est la
       signature d'une colonne déplacée. Le ménage ne peut alors
       plus rien effacer, et sans ce cri il échouerait en silence —
       exactement la panne qu'on ne voit pas venir. */
    if (bilans[j].sansDate && !bilans[j].efface &&
        bilans[j].sansDate === bilans[j].restent) {
      alertes.push(bilans[j].feuille + ' : AUCUNE date lisible sur ' +
                   bilans[j].sansDate + ' ligne(s) — colonne déplacée ? ' +
                   'Rien ne peut être nettoyé ici.');
    }
  }

  try {
    PropertiesService.getScriptProperties()
      .setProperty('menageDernierPassage',
        Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'));
  } catch (e) { /* sans propriétés on saura par les signalements */ }

  if (!total && !alertes.length) return { status: 'ok', total: 0, bilans: bilans };

  var lignes = [];
  for (var k = 0; k < bilans.length; k++) lignes.push(phraseMenage(bilans[k]));
  if (alertes.length) lignes.push('⚠️ À regarder : ' + alertes.join(' · '));

  try {
    enregistrerIncident({
      demandeur: 'ménage automatique',
      ou: 'Conservation',
      message: '🧹 Ménage : ' + total + ' ligne' + (total > 1 ? 's' : '') +
               ' traitée' + (total > 1 ? 's' : ''),
      details: lignes.join('\n')
    });
  } catch (e) { /* le ménage a eu lieu : c'est le rapport qui manque */ }

  return { status: 'ok', total: total, bilans: bilans, details: lignes };
}

/* ============================================================
   LE DOSSIER COMPLET D'UN ÉLÈVE — LE DROIT D'ACCÈS

   « Donnez-moi une copie de tout ce que vous avez sur moi. » Il n'y
   avait aucune réponse possible : il fallait fouiller trois
   classeurs et une dizaine de feuilles à la main, et l'audit a
   montré qu'on en oublie — c'est exactement ce qui s'est passé
   avec l'effacement.

   ALORS ON RÉUTILISE LA MÊME LISTE. Ce qu'on efface, c'est ce
   qu'on détient : « effacerTracesEleve » sait déjà où chercher. Un
   export, c'est la même tournée, en lecture. Le jour où une
   feuille s'ajoute d'un côté, elle doit s'ajouter de l'autre — et
   le test le vérifie.

   ⚠️ DEUX CHOSES N'Y SONT PAS, ET C'EST VOULU :

   · SON CODE D'ACCÈS au coin révisions. C'est une clé, pas une
     donnée le concernant. Un dossier se transmet parfois par mail,
     et une clé ne voyage pas par mail. On dit qu'un accès existe,
     depuis quand, et sa dernière visite.
   · LES NOMS DES SALARIÉS dans le journal d'activité. Ce sont
     leurs données, pas les siennes. On rend la date et l'action,
     jamais qui l'a faite.
   ============================================================ */
function lignesDe(nomFeuille, colonne, cible, colonnes, dedans) {
  var out = [];
  try {
    var sh = classeur().getSheetByName(nomFeuille);
    if (!sh || sh.getLastRow() < 2) return out;

    var tout = sh.getDataRange().getValues();
    var entetes = tout[0] || [];
    for (var i = 1; i < tout.length; i++) {
      var v = normaliser(tout[i][colonne]);
      var touche = dedans ? (v.indexOf(cible) !== -1) : (v === cible);
      if (!touche) continue;

      var ligne = {};
      for (var c = 0; c < entetes.length; c++) {
        if (colonnes && colonnes.indexOf(c) === -1) continue;
        var titre = String(entetes[c] || ('col' + c));
        ligne[titre] = texteCellule(tout[i][c], false);
      }
      out.push(ligne);
    }
  } catch (e) { /* feuille absente : rien à rendre */ }
  return out;
}

function dossierEleve(d) {
  var nom = String((d && d.eleve) || '').trim();
  var recherche = normaliser(nom);
  if (recherche.length < 2) {
    return { status: 'error', message: 'Nom trop court.' };
  }

  var dossier = {
    status: 'ok',
    eleve: nom,
    edite: Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    parties: []
  };

  var ajouter = function (titre, note, lignes) {
    dossier.parties.push({ titre: titre, note: note || '',
                           lignes: lignes || [] });
  };

  /* Sa fiche, telle qu'elle est écrite au répertoire */
  ajouter('Fiche du répertoire',
          'Ce que le bureau a noté pour le joindre et le suivre.',
          lignesDe('Eleves', 0, recherche));

  /* Ses bilans de conduite, en entier : c'est le cœur du dossier */
  ajouter('Bilans de conduite',
          'Un par cours, tel qu\'il lui a été envoyé.',
          lignesDe(NOM_FEUILLE_BILANS_OU_DEFAUT(), 3, recherche));

  ajouter('Fiche de suivi',
          'Le suivi administratif : examens, heures, paiements.',
          lignesDe(NOM_ONGLET_SUIVI, 0, recherche));

  ajouter('Résultats d\'examen', '',
          lignesDe('Resultats', 1, recherche));

  ajouter('Cours préparés', '',
          lignesDe(NOM_ONGLET_PREP, 2, recherche));

  ajouter('Captures du CEPC',
          'Les images elles-mêmes ne sont pas reproduites ici : ' +
          'demande-les si elles sont réclamées.',
          lignesDe('Captures', 1, recherche, [0, 1, 2, 3, 5, 6]));

  /* ⚠️ UN TRACÉ EST UNE DONNÉE DE DÉPLACEMENT — v222. Il entre
     donc dans le dossier au même titre qu'un bilan. La ligne du
     chemin est illisible à l'œil (une polyligne encodée), mais on
     la rend telle quelle : le dossier montre ce qu'on détient, pas
     ce qu'on trouve présentable. */
  ajouter('Trajets des cours',
          'Le tracé du cours, sa longueur, sa durée et les points de ' +
          'travail marqués par le moniteur. Conservé deux mois.',
          lignesDe(NOM_ONGLET_TRAJETS, TRAJET_COL_ELEVE, recherche));

  ajouter('Procédures récitées', '',
          lignesDe('Recitations', 1, recherche));

  ajouter('Procédures demandées', '',
          lignesDe('Demandes', 1, recherche));

  ajouter('Corrections du code (ETG)', '',
          lignesDe('EtgCorrections', 0, recherche));

  ajouter('Messages internes le concernant',
          '⚠️ Notes du bureau. À relire avant transmission.',
          lignesDe(NOM_ONGLET_CONS, 1, recherche));

  ajouter('SMS et mails envoyés', '',
          lignesDe('Sms', 1, recherche, [0, 1, 2, 4, 6, 8]));

  ajouter('Liens de cours envoyés', '',
          lignesDe('LiensCours', 1, recherche, [1, 2, 3, 4, 5, 6, 7, 8, 10, 12]));

  /* Son accès : SANS le code. Voir l'avertissement en tête. */
  var acces = lignesDe('ElevesAcces', 0, recherche, [0, 2, 3, 4, 5, 6]);
  ajouter('Accès au coin révisions',
          'Le code lui-même n\'est pas reproduit : c\'est une clé, ' +
          'pas une donnée le concernant.', acces);

  /* Le journal : la date et l'action, jamais qui l'a faite. */
  var journal = [];
  try {
    var shJ = feuilleJournal();
    var nbJ = shJ.getLastRow();
    if (nbJ > 1) {
      var lj = shJ.getRange(2, 1, nbJ - 1, 6).getValues();
      for (var k = 0; k < lj.length; k++) {
        if (normaliser(lj[k][4]) !== recherche) continue;
        journal.push({
          Quand: (lj[k][0] instanceof Date)
            ? Utilities.formatDate(lj[k][0], 'Europe/Paris', 'dd/MM/yyyy HH:mm')
            : texteCellule(lj[k][0], false),
          Action: texteCellule(lj[k][3], false)
        });
      }
    }
  } catch (e) { /* pas de journal lisible */ }
  ajouter('Journal des actions le concernant',
          'Les noms des salariés en sont retirés : ce sont leurs ' +
          'données, pas les siennes.', journal);

  /* Ce qu'on ne rend pas, mais qu'on signale : la comptabilité de
     l'IA porte son nom sans être une donnée sur lui. */
  var couts = lignesDe('CoutsIA', 1, recherche, [0], true).length;
  dossier.mentions = couts
    ? [couts + ' ligne(s) de comptabilité interne (coût des ' +
       'générations) portent son nom. Elles ne décrivent pas ' +
       "l'élève : ce sont des chiffres de facturation."]
    : [];

  var total = 0;
  for (var q = 0; q < dossier.parties.length; q++) {
    total += dossier.parties[q].lignes.length;
  }
  dossier.total = total;
  return dossier;
}

/* La feuille des bilans n'a pas de nom fixe : « feuille() » la
   trouve en écartant les feuilles techniques. On lui demande son
   nom plutôt que de le deviner. */
function NOM_FEUILLE_BILANS_OU_DEFAUT() {
  try { return feuille().getName(); } catch (e) { return 'Bilans'; }
}


/* ============================================================
   ARCHIVER UN DOSSIER AVANT DE L'EFFACER

   David, le 4 septembre 2026, sur le passage en passerelle :
   « pour vider la base de données et faire de la place, on ne
   reviendra plus jamais dessus — comme supprimer son dossier ».

   Elle a raison sur le besoin, et on lui garde quand même une
   trace : un élève peut réclamer ses données des années après,
   c'est son droit, et l'outil sait déjà les éditer. Mais elle a
   été claire : « uniquement si tu le fais automatiquement, moi je
   ne le ferai pas ». Un archivage qui demande un geste n'est pas
   un archivage, c'est une bonne intention.

   Le fichier part donc TOUT SEUL dans le Drive, à côté du
   classeur, dans un dossier « Dossiers archivés ». Il y sera dans
   trois ans ; un fichier tombé dans les téléchargements du bureau,
   non.

   ⚠️ CETTE FONCTION NE SUPPRIME RIEN. Elle écrit, et elle rend le
   lien. C'est l'appelant qui, ce lien en main, décide d'effacer —
   et s'il ne l'a pas, il n'efface pas.
   ============================================================ */
var NOM_DOSSIER_ARCHIVES = 'Dossiers archivés — Bilan de conduite';

/* ============================================================
   QUAND DRIVE DIT NON — v1008 / script v224

   David, le 16 septembre, en archivant un dossier : « Vous n'êtes
   pas autorisé à appeler DriveApp.getRootFolder. Autorisations
   requises : … » — recopié tel quel dans une fenêtre de
   l'application.

   ⚠️ UN MESSAGE DE GOOGLE N'EST PAS UN MESSAGE POUR LE BUREAU. Il
   dit la vérité, mais il ne dit pas QUOI FAIRE, et il fait croire à
   une panne alors que c'est une autorisation qui manque.

   Apps Script fige les autorisations accordées au moment de la
   validation. L'archivage est la SEULE fonction du classeur qui
   touche à Drive, et elle est arrivée après : le script n'a donc
   jamais eu ce droit, et l'archivage n'a jamais pu marcher. Ce
   n'est pas une régression, c'est une première fois.

   ⚠️ ET RIEN N'EST EFFACÉ POUR AUTANT. « archiverDossier » écrit et
   rend le lien ; c'est l'appelant, ce lien en main, qui décide
   d'effacer. Pas de lien, pas d'effacement — le garde-fou a tenu,
   et il tient toujours.
   ============================================================ */
function messageDeDrive(e) {
  /* ⚠️ « [object Object] » N'EST PAS UN MESSAGE. Une erreur sans
     « message » — ça arrive — donnait littéralement ça au bureau.
     On ne garde que ce qui se lit, et à défaut on le dit. */
  var brut = (e && e.message) ? e.message : e;
  var m = (brut === null || brut === undefined ||
           typeof brut === 'object') ? '' : String(brut);
  if (!m) return 'erreur inconnue.';

  if (!/autoris|permission|scope|DriveApp|auth\/drive/i.test(m)) return m;

  return 'le classeur n\'a pas (ou plus) l\'autorisation d\'écrire dans ' +
    'Google Drive.\n\n' +
    'À faire UNE SEULE FOIS, dans le classeur :\n' +
    '1. Extensions > Apps Script\n' +
    '2. choisir « dossierDesArchives » dans la liste des fonctions, ' +
    'puis Exécuter — et accepter les autorisations que Google demande\n' +
    '3. Déployer > Gérer les déploiements > crayon ✏️ > Nouvelle version ' +
    '> Déployer\n\n' +
    'Rien n\'a été effacé, et rien ne le sera tant que l\'archive ' +
    'n\'est pas écrite.\n\n' +
    '(Détail technique : ' + m + ')';
}

function dossierDesArchives() {
  /* À côté du classeur, pas à la racine du Drive : on retrouve les
     archives là où on cherche déjà les données.

     ⚠️ ET PLUS DE RATTRAPAGE PAR « getRootFolder » — v1008. Quand
     la ligne du dessus échouait faute d'autorisation, on se
     rabattait sur la racine du Drive… qui en demande AUTANT, et qui
     échouait donc à son tour. Le moniteur recevait le message de la
     SECONDE tentative, celle qui parle d'un dossier racine qu'il
     n'a jamais demandé — un rattrapage qui brouille la cause au
     lieu de la dire.

     Une porte fermée ne se force pas avec une plus grande porte :
     on laisse l'erreur remonter, et messageDeDrive la traduit. */
  var p = DriveApp.getFileById(classeur().getId()).getParents();
  var parent = p.hasNext() ? p.next() : DriveApp.getRootFolder();
  var trouves = parent.getFoldersByName(NOM_DOSSIER_ARCHIVES);
  return trouves.hasNext() ? trouves.next()
                           : parent.createFolder(NOM_DOSSIER_ARCHIVES);
}

/* ============================================================
   RELIRE LE TRAJET D'UN COURS — script v226

   ⚠️ LES MÊMES COLONNES QUE L'ÉCRITURE, dans le même ordre, et le
   même résultat que la porte rapide de Cloudflare — voir
   lireTrajetRapide. Deux lecteurs qui ne rendent pas la même chose
   donneraient une carte selon le chemin emprunté, et personne ne
   saurait lequel a menti.

   ⚠️ LE PLUS RÉCENT, ET UN SEUL. Un même cours peut avoir été
   enregistré deux fois — un renvoi, une reprise après panne. Le
   dernier écrit est celui qui vaut.
   ============================================================ */
function lireTrajet(d) {
  var nom = String((d && d.eleve) || '').trim().toLowerCase();
  if (!nom) return { status: 'error', message: 'Trajet : sans élève.' };

  var jour = String((d && d.date) || '').trim();

  var sh = classeur().getSheetByName(NOM_ONGLET_TRAJETS);
  if (!sh || sh.getLastRow() < 2) return { status: 'ok', trajet: null };

  var lignes = sh.getRange(2, 1, sh.getLastRow() - 1, 12).getValues();

  var trouve = null;
  for (var i = 0; i < lignes.length; i++) {
    var l = lignes[i];
    if (String(l[2] || '').trim().toLowerCase() !== nom) continue;
    if (jour && String(l[1] || '').trim() !== jour) continue;
    trouve = l;
  }

  if (!trouve) return { status: 'ok', trajet: null };

  var reperes = [];
  try {
    var brut = JSON.parse(String(trouve[10] || '[]'));
    if (Object.prototype.toString.call(brut) === '[object Array]') {
      reperes = brut;
    }
  } catch (e) { /* des repères illisibles ne perdent pas le tracé */ }

  return { status: 'ok', trajet: {
    date: String(trouve[1] || ''),
    eleve: String(trouve[2] || ''),
    km: String(trouve[5] || ''),
    minutes: String(trouve[6] || ''),
    debut: String(trouve[7] || ''),
    fin: String(trouve[8] || ''),
    trace: String(trouve[9] || ''),
    reperes: reperes
  } };
}


/* Le dossier, mis en page. Même matière que l'écran « Éditer son
   dossier complet » : une seule source, deux sorties. */
function dossierEnHtml(dossier) {
  var esc = function (t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  var h = [];
  h.push('<!doctype html><html lang="fr"><head><meta charset="utf-8">');
  h.push('<title>Dossier — ' + esc(dossier.eleve) + '</title>');
  h.push('<style>body{font-family:system-ui,sans-serif;max-width:900px;' +
         'margin:0 auto;padding:24px;line-height:1.5;color:#14161B;}' +
         'h1{font-size:24px;} h2{font-size:17px;margin-top:28px;' +
         'border-bottom:2px solid #14161B;padding-bottom:4px;}' +
         '.note{color:#64655F;font-size:13px;margin:4px 0 10px;}' +
         'table{border-collapse:collapse;width:100%;font-size:12px;' +
         'margin-bottom:10px;} th,td{border:1px solid #DCDCD3;padding:5px 7px;' +
         'text-align:left;vertical-align:top;white-space:pre-wrap;}' +
         'th{background:#F2F2EC;} .vide{color:#64655F;font-style:italic;}' +
         '</style></head><body>');
  h.push('<h1>Dossier de ' + esc(dossier.eleve) + '</h1>');
  h.push('<p class="note">Édité le ' + esc(dossier.edite) + ' — ' +
         dossier.total + ' ligne(s). Archive constituée avant effacement ' +
         'du dossier.</p>');

  for (var i = 0; i < dossier.parties.length; i++) {
    var p2 = dossier.parties[i];
    h.push('<h2>' + esc(p2.titre) + '</h2>');
    if (p2.note) h.push('<p class="note">' + esc(p2.note) + '</p>');
    if (!p2.lignes.length) {
      h.push('<p class="vide">Rien à ce nom.</p>');
      continue;
    }
    var cles = Object.keys(p2.lignes[0]);
    h.push('<table><thead><tr>');
    for (var c = 0; c < cles.length; c++) h.push('<th>' + esc(cles[c]) + '</th>');
    h.push('</tr></thead><tbody>');
    for (var l = 0; l < p2.lignes.length; l++) {
      h.push('<tr>');
      for (var c2 = 0; c2 < cles.length; c2++) {
        h.push('<td>' + esc(p2.lignes[l][cles[c2]]) + '</td>');
      }
      h.push('</tr>');
    }
    h.push('</tbody></table>');
  }

  if (dossier.mentions && dossier.mentions.length) {
    h.push('<h2>À signaler</h2><ul>');
    for (var m = 0; m < dossier.mentions.length; m++) {
      h.push('<li>' + esc(dossier.mentions[m]) + '</li>');
    }
    h.push('</ul>');
  }

  h.push('</body></html>');
  return h.join('\n');
}

function archiverDossier(d) {
  var nom = String((d && d.eleve) || '').trim();
  if (normaliser(nom).length < 2) {
    return { status: 'error', message: 'Nom trop court.' };
  }

  var dossier = dossierEleve({ eleve: nom });
  if (!dossier || dossier.status !== 'ok') {
    return { status: 'error', message: 'Dossier illisible.' };
  }

  /* ⚠️ UN DOSSIER VIDE N'EST PAS UNE ARCHIVE.
     Répondre « ok » sur zéro ligne autoriserait l'effacement d'un
     dossier qu'on n'a pas su lire — le pire des deux mondes. */
  if (!dossier.total) {
    return { status: 'error',
             message: 'Aucune ligne trouvée à ce nom : rien n\'a été archivé.' };
  }

  try {
    var quand = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd_HHmm');
    var propre = nom.replace(/[\\\/:*?"<>|]/g, ' ').trim();
    var nomFichier = propre + ' - dossier archive ' + quand + '.html';
    var fichier = dossierDesArchives().createFile(
      nomFichier, dossierEnHtml(dossier), MimeType.HTML);

    journaliser('archiverDossier', {
      demandeur: (d && d.demandeur) || '', role: (d && d.role) || '',
      eleve: nom, lignes: dossier.total, fichier: nomFichier
    });

    return { status: 'ok', lien: fichier.getUrl(),
             fichier: nomFichier, lignes: dossier.total };
  } catch (e) {
    return { status: 'error',
             message: 'Archivage impossible : ' + messageDeDrive(e) };
  }
}


/* ============================================================
   CORRIGER UNE FAUTE DE FRAPPE DANS UN NOM

   « Il faut que je puisse changer le nom prénom si j'ai fait une
   erreur de frappe. »

   ─ POURQUOI CE N'EST PAS UNE MODIFICATION DE FICHE ─

   Le nom EST la clé. Il n'y a pas d'identifiant d'élève dans ce
   classeur : chaque feuille retrouve la bonne ligne en comparant
   des noms normalisés. Corriger le nom dans le seul répertoire
   couperait donc le dossier en deux — les bilans, le suivi, la
   place d'examen et l'accès à l'espace resteraient accrochés à
   l'ancienne orthographe, invisibles depuis la nouvelle, et le
   bureau croirait les avoir perdus.

   ─ OÙ LE NOM EST ÉCRIT ─

   La liste ci-dessous est celle de « effacerTracesEleve », colonne
   pour colonne : ce qui s'efface au départ d'un élève est
   exactement ce qui se renomme. Elles doivent rester d'accord —
   une feuille ajoutée à l'une sans l'autre, et le renommage
   laisserait derrière lui ce que l'effacement, lui, sait trouver.

   TROIS EXCEPTIONS, ET ELLES SONT VOULUES :

     · « CoutsIA » porte le nom DANS un texte de facturation, pas
       dans une colonne à lui. On ne réécrit pas au milieu d'une
       phrase : ces lignes ne servent qu'à compter des centimes.
     · « HANDICAP » et le code aménagé vivent dans l'autre classeur,
       celui que David tient à la main, sur des lignes qu'il a
       mises en forme. Elles sont renommées aussi, mais séparément
       et sans jamais créer de ligne.
     · « MailsEchoues » se retrouve par l'ADRESSE, pas par le nom :
       une faute de frappe dans le nom ne la concerne pas.
   ============================================================ */
var OU_LE_NOM_EST_ECRIT = [
  ['Eleves', 0],
  [null, 3],                 /* les bilans : la feuille se nomme seule */
  [NOM_ONGLET_SUIVI, 0],
  ['Resultats', 1],
  [NOM_ONGLET_PREP, 2],
  [NOM_ONGLET_CONS, 1],
  ['PlacesSession', 2],
  ['Captures', 1],
  [NOM_ONGLET_TRAJETS, TRAJET_COL_ELEVE],
  ['Recitations', 1],
  ['Demandes', 1],
  ['EtgCorrections', 0],
  ['Sms', 1],
  ['LiensCours', 1],
  ['ElevesAcces', 0],
  ['EnCours', 1],
  ['NotifsMasquees', 0],
  ['DepartTaches', 0],
  ['Ecoutes', 1],
  ['PaiementsAlma', 1],
  ['Brouillons', 3],
  ['RvtReponses', 2],
  ['ProcAcorriger', 1],
  ['Journal', 4]
];

/* Réécrit une colonne, ligne par ligne, là où le nom correspond.
   Rend le nombre de cellules changées. */
/* ⚠️ UNE COLONNE, UNE LECTURE, UNE ÉCRITURE.

   Première version : « getDataRange().getValues() » — donc TOUTES
   les colonnes de la feuille des bilans, transcriptions comprises —
   puis un « setValue » par ligne trouvée. Sur vingt-trois feuilles,
   ça dépassait largement les douze secondes que l'application
   accorde à un appel : elle croyait à une panne, recommençait, et
   la deuxième tentative trouvait le nom déjà changé. D'où le
   « Un élève porte déjà ce nom » sur un renommage qui, lui, avait
   parfaitement fonctionné.

   Ici : on ne lit QUE la colonne des noms, et on la réécrit une
   seule fois, seulement si quelque chose a bougé. */
function renommerDansFeuille(nomFeuille, colonne, ancienNorm, nouveau) {
  try {
    var sh = classeur().getSheetByName(nomFeuille);
    if (!sh) return 0;
    var derniere = sh.getLastRow();
    if (derniere < 2) return 0;

    var plage = sh.getRange(2, colonne + 1, derniere - 1, 1);
    var col = plage.getValues();
    var n = 0;
    for (var i = 0; i < col.length; i++) {
      if (normaliser(col[i][0]) !== ancienNorm) continue;
      col[i][0] = nouveau;
      n++;
    }
    if (n) plage.setValues(col);
    return n;
  } catch (e) {
    /* Une feuille absente n'est pas une erreur : elle n'existe que
       si quelqu'un s'en est servi. */
    return 0;
  }
}

/* Le classeur du bureau, tenu à la main : on renomme sur place et
   on ne crée jamais rien. */
function renommerDansSuiviManuel(onglet, ligne1, ancienNorm, nouveau) {
  try {
    var sh = feuilleDuSuivi(onglet);
    var derniere = sh.getLastRow();
    if (derniere < ligne1) return 0;

    var plage = sh.getRange(ligne1, 1, derniere - ligne1 + 1, 1);
    var l = plage.getValues();
    var n = 0;
    for (var i = 0; i < l.length; i++) {
      if (normaliser(l[i][0]) !== ancienNorm) continue;
      l[i][0] = nouveau;
      n++;
    }
    /* Une seule écriture, et seulement s'il y a de quoi : ce
       classeur-ci est mis en forme à la main, on n'y repasse pas
       ligne à ligne. */
    if (n) plage.setValues(l);
    return n;
  } catch (e) { return 0; }
}

function renommerEleve(d) {
  var ancien = String((d && d.ancien) || '').trim();
  var nouveau = String((d && d.nouveau) || '').trim().replace(/\s+/g, ' ');

  if (ancien.length < 3 || nouveau.length < 3) {
    return { status: 'error', message: 'Nom trop court.' };
  }
  if (nouveau.split(' ').length < 2) {
    return { status: 'error', message: 'Il faut un prénom ET un nom.' };
  }

  var av = normaliser(ancien);
  var ap = normaliser(nouveau);

  /* La même orthographe à la casse près : il n'y a rien à chercher
     ailleurs, on corrige le répertoire et on s'arrête. */
  if (av === ap && ancien === nouveau) {
    return { status: 'ok', lignes: 0, message: 'Rien à corriger.' };
  }

  /* ⚠️ UN NOM DÉJÀ PRIS, C'EST UNE FUSION DE DEUX DOSSIERS —
     MAIS SEULEMENT SI L'ANCIEN EXISTE ENCORE.

     Le refus était juste, sa condition ne l'était pas : il suffisait
     que le nouveau nom soit au répertoire pour qu'on s'arrête. Or
     un renommage qui a DÉJÀ eu lieu produit exactement ça — le
     nouveau nom est là, l'ancien a disparu. David a donc reçu
     « Un élève porte déjà ce nom : Jean-Paul Gouault » sur son
     propre renommage, celui qui venait de réussir.

     La vraie fusion, c'est quand les DEUX existent : deux dossiers
     vivants qu'on mélangerait sans pouvoir les redémêler. Quand
     seul le nouveau est là, il n'y a rien à refuser — il y a une
     reprise à finir, et le balayage ci-dessous s'en charge, puisque
     lui ne touche que ce qui porte encore l'ancien nom. */
  var ancienAuRepertoire = false;
  var nouveauAuRepertoire = '';
  if (av !== ap) {
    try {
      var colE = feuilleEleves()
        .getRange(2, 1, Math.max(1, feuilleEleves().getLastRow() - 1), 1)
        .getValues();
      for (var i = 0; i < colE.length; i++) {
        var v = normaliser(colE[i][0]);
        if (v === av) ancienAuRepertoire = true;
        else if (v === ap) nouveauAuRepertoire = texteCellule(colE[i][0], false);
      }
    } catch (e) { /* pas de répertoire lisible : on continue */ }

    if (nouveauAuRepertoire && ancienAuRepertoire) {
      return { status: 'error',
               message: 'Un élève porte déjà ce nom : ' + nouveauAuRepertoire +
                        '. Deux dossiers ne se fusionnent pas.' };
    }
  }

  var total = 0;
  var detail = {};

  for (var k = 0; k < OU_LE_NOM_EST_ECRIT.length; k++) {
    var nomF = OU_LE_NOM_EST_ECRIT[k][0] || NOM_FEUILLE_BILANS_OU_DEFAUT();
    var col = OU_LE_NOM_EST_ECRIT[k][1];
    var n = renommerDansFeuille(nomF, col, av, nouveau);
    if (n) { detail[nomF] = n; total += n; }
  }

  /* Le classeur tenu à la main */
  var nh = renommerDansSuiviManuel(ONGLET_HANDICAP, LIGNE1_HANDICAP, av, nouveau);
  if (nh) { detail[ONGLET_HANDICAP] = nh; total += nh; }
  var nc = renommerDansSuiviManuel(ONGLET_CODEAM, LIGNE1_CODEAM, av, nouveau);
  if (nc) { detail[ONGLET_CODEAM] = nc; total += nc; }

  /* Le journal est écrit une seule fois, à l'entrée du routeur —
     voir « journaliser(data.action, data) ». Une deuxième écriture
     ici doublerait la ligne, et les deux finiraient par diverger. */
  return { status: 'ok', lignes: total, detail: detail, eleve: nouveau,
           /* Une reprise : le nouveau nom était déjà au répertoire, et
              l'ancien n'y était plus. On le dit sans en faire une
              erreur — il n'y a rien eu de mal. */
           reprise: !!(nouveauAuRepertoire && !ancienAuRepertoire) };
}


/* ============================================================
   LA REVUE MANUELLE — CE QUI SE PROPOSE, ET NE S'EFFACE PAS SEUL

   Le second régime. Rien de ce qui touche à un élève ne part tout
   seul : une année creuse, une élève qui revient au bout de deux
   ans, et le travail aurait disparu sans que personne l'ait
   demandé. Alors on propose, on dit POURQUOI, et c'est le bureau
   qui appuie.

   Quatre listes, dans l'ordre où David les a décrites :
     · permis obtenu — on supprime tout, c'est la règle de la
       maison ;
     · plus d'un an depuis le DERNIER COURS, sans permis ;
     · dossier jamais commencé — visible à 3 mois, proposé à 12 ;
     · récitations du coin révisions, 3 mois sans connexion.
   ============================================================ */
var MENAGE_MOIS_SANS_COURS   = 12;
var MENAGE_MOIS_JAMAIS_VU    = 12;   /* proposé à la suppression */
var MENAGE_MOIS_A_SURVEILLER = 3;    /* seulement montré */
var MENAGE_MOIS_RECITATIONS  = 3;

/* Le dernier cours de chaque élève, sur TOUT l'historique.
   « bilansParEleve » ne lit que les 600 dernières lignes : assez
   pour savoir si une préparation est faite, pas pour dire qu'un
   élève n'est plus venu depuis un an — c'est justement celui dont
   les lignes sont les plus anciennes qui nous intéresse ici. */
function dernierCoursParEleve() {
  var out = {};
  try {
    var sh = feuille();
    var nb = sh.getLastRow();
    if (nb < 2) return out;

    var dates = sh.getRange(2, 1, nb - 1, 1).getValues();
    var noms = sh.getRange(2, 4, nb - 1, 1).getValues();
    for (var i = 0; i < noms.length; i++) {
      if (!noms[i][0]) continue;
      var cle = normaliser(noms[i][0]);
      var iso = dateVersIso(dates[i][0]) || jourDeCellule(dates[i][0]);
      if (!iso) continue;
      if (!out[cle] || iso > out[cle]) out[cle] = iso;
    }
  } catch (e) { /* sans historique, on ne propose rien : c'est voulu */ }
  return out;
}

/* Qui a eu son permis, et quand. On ne retient que « obtenu » :
   un ajournement n'est pas une fin de formation. */
function permisObtenuParEleve() {
  var out = {};
  try {
    var sh = feuilleResultats();
    var nb = sh.getLastRow();
    if (nb < 2) return out;

    var v = sh.getRange(2, 1, nb - 1, 3).getValues();
    for (var i = 0; i < v.length; i++) {
      if (!v[i][1]) continue;
      if (normaliser(v[i][2]).indexOf('obtenu') === -1) continue;
      var cle = normaliser(v[i][1]);
      var iso = jourDeCellule(v[i][0]);
      if (!out[cle] || iso > out[cle]) out[cle] = iso;
    }
  } catch (e) { /* pas de résultats : personne n'a son permis */ }
  return out;
}

/* La dernière visite au coin révisions, par élève. */
function derniereVisiteParEleve() {
  var out = {};
  try {
    var sh = feuilleElevesAcces();
    var nb = sh.getLastRow();
    if (nb < 2) return out;

    var v = sh.getRange(2, 1, nb - 1, 5).getValues();
    for (var i = 0; i < v.length; i++) {
      if (!v[i][0]) continue;
      out[normaliser(v[i][0])] = jourDeCellule(v[i][4]) || jourDeCellule(v[i][3]);
    }
  } catch (e) { /* pas d'accès : rien à proposer */ }
  return out;
}

function compterColonne(nomFeuille, colonne) {
  var out = {};
  try {
    var sh = (nomFeuille === 'bilans') ? feuille()
           : (nomFeuille === 'recitations') ? feuilleRecitations() : null;
    if (!sh) return out;
    var nb = sh.getLastRow();
    if (nb < 2) return out;
    var v = sh.getRange(2, colonne, nb - 1, 1).getValues();
    for (var i = 0; i < v.length; i++) {
      if (!v[i][0]) continue;
      var cle = normaliser(v[i][0]);
      out[cle] = (out[cle] || 0) + 1;
    }
  } catch (e) { /* rien */ }
  return out;
}

/* Combien de mois entre ce jour-là et aujourd'hui. Rend -1 quand
   on ne sait pas — ET QUAND ON NE SAIT PAS, ON NE PROPOSE RIEN.
   C'est la même prudence que partout ailleurs : une date illisible
   ne doit jamais valoir « c'est vieux, on peut jeter ». */
function moisDepuis(iso) {
  if (!iso) return -1;
  var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return -1;
  var d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (isNaN(d.getTime())) return -1;
  var auj = new Date();
  var mois = (auj.getFullYear() - d.getFullYear()) * 12 +
             (auj.getMonth() - d.getMonth());
  if (auj.getDate() < d.getDate()) mois--;
  return mois < 0 ? -1 : mois;
}

function menagePropositions() {
  /* Les mêmes réglages que le ménage de nuit, lus au même endroit.
     Ici, zéro veut dire « ne rien proposer » — cohérent avec « ne
     rien effacer » de l'autre côté. */
  var mSansCours    = moisRegles('sansCours', MENAGE_MOIS_SANS_COURS);
  var mJamaisVu     = moisRegles('jamaisVu', MENAGE_MOIS_JAMAIS_VU);
  var mASurveiller  = moisRegles('aSurveiller', MENAGE_MOIS_A_SURVEILLER);
  var mRecitations  = moisRegles('recitations', MENAGE_MOIS_RECITATIONS);

  var cours = dernierCoursParEleve();
  var permis = permisObtenuParEleve();
  var visites = derniereVisiteParEleve();
  var recits = compterColonne('recitations', 2);
  var bilans = compterColonne('bilans', 4);

  var permisObtenu = [], sansCours = [], jamaisCommence = [],
      aSurveiller = [], recitations = [];

  /* Le répertoire fait foi pour « qui existe encore » : un élève
     supprimé n'y est plus, et n'a donc rien à proposer. */
  var sh = feuilleEleves();
  var nb = sh.getLastRow();
  var lignes = (nb < 2) ? [] : sh.getRange(2, 1, nb - 1, 13).getValues();

  for (var i = 0; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    var nom = texteCellule(lignes[i][0], false);
    var cle = normaliser(nom);

    var fiche = {
      eleve: nom,
      bilans: bilans[cle] || 0,
      recitations: recits[cle] || 0,
      dernierCours: cours[cle] || '',
      moisSansCours: moisDepuis(cours[cle]),
      ajouteLe: jourDeCellule(lignes[i][12]),
      permisLe: permis[cle] || ''
    };

    /* 1. Permis obtenu : la règle de la maison, on supprime tout.
          Le taux de réussite, lui, ne bouge pas — la ligne de
          Resultats est ANONYMISÉE, jamais supprimée. */
    if (permis[cle]) {
      fiche.pourquoi = 'permis obtenu le ' + jourLisible(permis[cle]);
      permisObtenu.push(fiche);
      continue;
    }

    /* 2. Jamais commencé : aucun bilan, jamais. */
    if (!fiche.bilans) {
      var age = moisDepuis(fiche.ajouteLe);
      if (mJamaisVu && age >= mJamaisVu) {
        fiche.pourquoi = 'inscrit il y a ' + age + ' mois, aucun cours';
        jamaisCommence.push(fiche);
      } else if (mASurveiller && age >= mASurveiller) {
        /* MONTRÉ, PAS PROPOSÉ. David voulait les voir dès trois
           mois pour décider elle-même, sans que l'outil suggère
           quoi que ce soit à ce stade. */
        fiche.pourquoi = 'inscrit il y a ' + age + ' mois, aucun cours';
        aSurveiller.push(fiche);
      }
      continue;
    }

    /* 3. Plus d'un an depuis le DERNIER COURS. Pas le dernier
          examen, pas l'inscription : c'est la seule date qui dit
          qu'une formation vit encore. */
    if (mSansCours && fiche.moisSansCours >= mSansCours) {
      fiche.pourquoi = 'dernier cours le ' + jourLisible(fiche.dernierCours) +
                       ' (' + fiche.moisSansCours + ' mois)';
      sansCours.push(fiche);
    }
  }

  /* 4. Les récitations du coin révisions. Elles partent avec
        l'élève ; sinon, trois mois sans connexion.

        ⚠️ MAIS PAS PENDANT SA FORMATION. Un élève qui n'a pas
        ouvert le coin révisions de l'été est un élève en vacances,
        pas un dossier mort : on ne propose que si rien ne bouge
        NON PLUS du côté des cours. */
  for (var k in recits) {
    if (!recits.hasOwnProperty(k)) continue;
    if (!mRecitations) break;          /* réglé à 0 : on ne propose rien */
    var moisVisite = moisDepuis(visites[k]);
    if (moisVisite >= 0 && moisVisite < mRecitations) continue;
    var moisCours = moisDepuis(cours[k]);
    if (moisCours >= 0 && moisCours < mRecitations) continue;

    recitations.push({
      eleve: k,
      recitations: recits[k],
      derniereVisite: visites[k] || '',
      pourquoi: (moisVisite >= 0
        ? 'dernière visite il y a ' + moisVisite + ' mois'
        : 'jamais venu sur son espace') +
        (moisCours >= 0 ? ', dernier cours il y a ' + moisCours + ' mois'
                        : ', aucun cours enregistré')
    });
  }

  var tri = function (a, b) {
    return String(a.eleve || '').localeCompare(String(b.eleve || ''));
  };
  permisObtenu.sort(tri); sansCours.sort(tri);
  jamaisCommence.sort(tri); aSurveiller.sort(tri); recitations.sort(tri);

  return { status: 'ok', permisObtenu: permisObtenu, sansCours: sansCours,
           jamaisCommence: jamaisCommence, aSurveiller: aSurveiller,
           recitations: recitations,
           reglages: { moisSansCours: mSansCours,
                       moisJamaisVu: mJamaisVu,
                       moisASurveiller: mASurveiller,
                       moisRecitations: mRecitations },
           /* Ce que l'écran affiche dans son tableau de durées :
              les valeurs appliquées ET les défauts, pour qu'on
              sache toujours d'où l'on part. */
           durees: dureesDuMenage(),
           dureesRevue: { sansCours: mSansCours, jamaisVu: mJamaisVu,
                          aSurveiller: mASurveiller,
                          recitations: mRecitations },
           /* ⚠️ LES DÉFAUTS SE LISENT DANS LA TABLE, ILS NE SE
              RECOPIENT PLUS — v222.

              Ils étaient écrits en dur ici : « LiensCours: 12,
              MailsEchoues: 12… ». Le même nombre, à deux endroits,
              et rien pour dire lequel fait foi. Changer un défaut
              dans MENAGE_TECHNIQUE laissait l'écran annoncer
              l'ancien — l'écran aurait menti sur la règle
              appliquée, ce qui est exactement ce qu'un écran de
              conservation ne doit pas faire. */
           defauts: defautsDuMenage(),
           /* Ce que l'écran nomme dans son tableau : la liste vient
              du serveur, pour qu'une feuille ajoutée à la table
              apparaisse sans qu'on touche au client. */
           feuillesAuto: feuillesDuMenage(),
           dernierPassage: (function () {
             try {
               return String(PropertiesService.getScriptProperties()
                 .getProperty('menageDernierPassage') || '');
             } catch (e) { return ''; }
           })() };
}

/* N'efface QUE les récitations, en laissant le dossier intact : un
   élève peut vouloir que son coin révisions soit vidé sans perdre
   sa formation. */
function effacerRecitationsDe(d) {
  var nom = String((d && d.eleve) || '');
  var recherche = normaliser(nom);
  if (recherche.length < 2) {
    return { status: 'error', message: 'Nom trop court.' };
  }
  var n = effacerLignesDe('Recitations', 1, recherche);
  return { status: 'ok', effacees: n,
           message: n ? '' : 'Aucune récitation trouvée.' };
}

/* ============================================================
   UN MENU DANS LE CLASSEUR

   Ces deux fonctions se lancent à la main, une fois de temps en
   temps. Les chercher dans la liste déroulante de l'éditeur, au
   milieu de plusieurs centaines d'autres, est une épreuve — et
   c'est le genre d'épreuve qui fait qu'on ne le fait pas.

   Elles sont donc dans un menu du classeur. « onOpen » est un
   déclencheur simple : il se pose tout seul, sans autorisation à
   accorder. Il suffit de rouvrir le classeur.
   ============================================================ */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🧹 Bilan de conduite')
      .addItem('Installer le ménage automatique (une fois)', 'installerMenage')
      .addItem('Lancer le ménage maintenant', 'menageMaintenant')
      .addSeparator()
      .addItem('Installer le rappel des places BE (une fois)',
               'installerRappelPlacesBE')
      .addToUi();
  } catch (e) { /* hors classeur : pas de menu, pas d'erreur */ }
}

/* Le ménage lancé à la main dit ce qu'il a fait, dans une fenêtre.
   Lancé depuis l'éditeur, son compte rendu partait dans le journal
   d'exécution — un endroit que personne ne pense à ouvrir. */
function menageMaintenant() {
  var r = menageConservation();
  var texte = (r && r.total)
    ? r.total + ' ligne(s) traitée(s).\n\n' + (r.details || []).join('\n')
    : "Rien à faire : aucune ligne ne dépassait les durées réglées.";
  try {
    SpreadsheetApp.getUi().alert('🧹 Ménage', texte,
                                 SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* lancé sans interface : le retour suffit */ }
  return r;
}


/* À lancer UNE FOIS. Le plus simple : le menu « 🧹 Bilan de
   conduite » du classeur, qui apparaît à sa réouverture. */
function installerMenage() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'menageConservation') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('menageConservation')
    .timeBased()
    .atHour(4)
    .everyDays(1)
    .create();

  var m = 'Ménage installé : chaque nuit vers 4 h. Il écrit dans ' +
          '🚨 Signalements uniquement quand il a fait quelque chose.';
  try {
    SpreadsheetApp.getUi().alert('🧹 Ménage', m,
                                 SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* lancé depuis l'éditeur : le retour suffit */ }
  return m;
}


/* Efface d'un élève tout ce qui n'est pas un bilan : accès à son
   espace, récitations, procédures demandées. */
/* ------------------------------------------------------------
   EFFACER LES LIGNES D'UN ÉLÈVE DANS UNE FEUILLE

   Toujours du bas vers le haut : sinon les numéros de ligne se
   décalent au fur et à mesure et on efface les mauvaises. C'est le
   réflexe déjà écrit ailleurs dans ce fichier — il manquait
   seulement une fonction pour ne pas le recopier sept fois.

   « exact » : le nom occupe toute la cellule. Sinon on cherche le
   nom À L'INTÉRIEUR — la feuille des coûts écrivait
   « espace élève — Prénom Nom » dans une seule colonne.
   ------------------------------------------------------------ */
function effacerLignesDe(nomFeuille, colonne, cible, dedans) {
  if (!cible) return 0;
  try {
    var sh = classeur().getSheetByName(nomFeuille);
    if (!sh || sh.getLastRow() < 2) return 0;

    var l = sh.getDataRange().getValues();
    var n = 0;
    for (var i = l.length - 1; i >= 1; i--) {
      var v = normaliser(l[i][colonne]);
      var touche = dedans ? (v.indexOf(cible) !== -1) : (v === cible);
      if (!touche) continue;
      sh.deleteRow(i + 1);
      n++;
    }
    return n;
  } catch (e) {
    /* Une feuille absente n'est pas une erreur : elle n'existe que
       si quelqu'un s'en est servi. */
    return 0;
  }
}

/* ------------------------------------------------------------
   TOUT CE QUI RESTE DE LUI AILLEURS

   Cette fonction balayait trois feuilles. L'audit du 1er septembre
   en a trouvé six autres qui gardaient son nom, son téléphone ou
   son adresse APRÈS que son dossier avait été « supprimé » :

     · le journal des envois — nom, numéro, contenu du message ;
     · LiensCours — prénom, date, lieu, véhicule, moniteur ;
     · CoutsIA, où son nom s'écrivait dans « espace élève — X »
       (corrigé en v768, mais les anciennes lignes restent) ;
     · EtgCorrections — nom, séance, score ;
     · MailsEchoues — son adresse ;
     · les cours en route, et les alertes masquées.

   Un droit à l'effacement qui laisse six traces n'est pas un droit
   à l'effacement. Le squelette était déjà écrit : il suffisait de
   le répéter.
   ------------------------------------------------------------ */
function effacerTracesEleve(nomEleve, adresseMail) {
  var recherche = normaliser(nomEleve);
  var compte = { acces: 0, recitations: 0, demandes: 0, ailleurs: 0 };

  /* Son accès à l'espace */
  try {
    var shA = feuilleElevesAcces();
    var la = shA.getDataRange().getValues();
    for (var i = la.length - 1; i >= 1; i--) {
      if (normaliser(la[i][0]) !== recherche) continue;
      shA.deleteRow(i + 1);
      compte.acces++;
    }
  } catch (e) { /* la feuille peut ne pas exister */ }

  /* ⚠️ SA PROGRESSION DANS LE PARCOURS — ajouté en v1038. Elle est
     née en v1036 et n'était effacée par RIEN : supprimer un dossier
     laissait ses lignes de « ParcoursVu » au classeur, avec son nom.
     Un droit à l'effacement qui oublie une feuille n'en est pas un. */
  try {
    var shP = feuilleParcoursVu();
    var lp = shP.getDataRange().getValues();
    for (var pv = lp.length - 1; pv >= 1; pv--) {
      if (normaliser(lp[pv][0]) !== recherche) continue;
      shP.deleteRow(pv + 1);
      compte.ailleurs++;
    }
  } catch (e) { /* la feuille peut ne pas exister */ }

  /* Ses récitations */
  try {
    var shR = feuilleRecitations();
    var lr = shR.getDataRange().getValues();
    for (var j = lr.length - 1; j >= 1; j--) {
      if (normaliser(lr[j][1]) !== recherche) continue;
      shR.deleteRow(j + 1);
      compte.recitations++;
    }
  } catch (e) { /* idem */ }

  /* Les procédures qu'on lui avait demandées */
  try {
    var shD = feuilleDemandes();
    var ld = shD.getDataRange().getValues();
    for (var k = ld.length - 1; k >= 1; k--) {
      if (normaliser(ld[k][1]) !== recherche) continue;
      shD.deleteRow(k + 1);
      compte.demandes++;
    }
  } catch (e) { /* idem */ }

  /* Les six feuilles oubliées. Chacune peut ne pas exister : une
     absence n'est pas un échec. */
  compte.ailleurs += effacerLignesDe('Sms', 1, recherche);
  compte.ailleurs += effacerLignesDe('LiensCours', 1, recherche);
  compte.ailleurs += effacerLignesDe('EtgCorrections', 0, recherche);
  compte.ailleurs += effacerLignesDe('EnCours', 1, recherche);
  compte.ailleurs += effacerLignesDe('NotifsMasquees', 0, recherche);
  compte.ailleurs += effacerLignesDe('DepartTaches', 0, recherche);
  /* ⚠️ ET SES TRAJETS — v222. Ils partent avec le reste : l'onglet
     🔒 RGPD promet « le même périmètre : tout ce que l'outil détient
     à son nom », et un tracé qui survivrait à l'effacement serait
     un déplacement gardé au nom de quelqu'un qui n'existe plus. */
  compte.ailleurs += effacerLignesDe(NOM_ONGLET_TRAJETS,
                                     TRAJET_COL_ELEVE, recherche);

  /* ------------------------------------------------------------
     ET LE RESTE DU DOSSIER, QUI N'ÉTAIT EFFACÉ QUE D'UN SEUL
     BOUTON SUR TROIS.

     Trois écrans proposaient de « supprimer » un élève — le
     répertoire, Préparer le départ, et le nouveau Ménage — et ils
     ne faisaient pas la même chose. Seul le répertoire allait
     jusqu'au bout : lui seul effaçait la fiche du répertoire, les
     cours préparés, les captures du CEPC et les messages au
     bureau. Les deux autres laissaient le nom, le téléphone et
     l'adresse en place, en annonçant « supprimé ».

     La règle de la maison : UNE RÈGLE, UN SEUL ENDROIT. Ce qui
     efface vit ici, dans le classeur, et tous les boutons y
     mènent. Un quatrième écran demain héritera du même
     effacement, sans qu'on ait à y penser.
     ------------------------------------------------------------ */
  compte.repertoire = effacerLignesDe('Eleves', 0, recherche);
  compte.preparations = effacerLignesDe(NOM_ONGLET_PREP, 2, recherche);
  compte.captures = effacerLignesDe('Captures', 1, recherche);
  compte.consignes = effacerLignesDe(NOM_ONGLET_CONS, 1, recherche);
  /* La fiche de suivi a déjà sa fonction : on l'appelle plutôt que
     de recopier sa boucle ici. Un jour où sa feuille changera de
     forme, il n'y aura qu'un endroit à corriger. */
  try { supprimerSuivi(nomEleve); compte.suivi = 1; } catch (e) { compte.suivi = 0; }
  /* Son nom était écrit DANS la colonne « Qui » : on cherche
     dedans, pas à l'identique. */
  compte.ailleurs += effacerLignesDe('CoutsIA', 1, recherche, true);

  /* Son adresse, si on la connaît. Elle vient du répertoire, qui
     est effacé APRÈS : c'est l'appelant qui nous la passe. */
  if (adresseMail) {
    compte.ailleurs += effacerLignesDe('MailsEchoues', 2,
                                       normaliser(adresseMail));
  }

  /* Et sa ligne de résultat, qu'on ANONYMISE au lieu de
     l'effacer. Voir anonymiserResultatsDe(). */
  compte.resultats = anonymiserResultatsDe(nomEleve);

  return compte;
}

/* ------------------------------------------------------------
   LE RÉSULTAT D'EXAMEN : ON ANONYMISE, ON N'EFFACE PAS

   La feuille « Resultats » porte le nom de l'élève, et c'est ELLE
   qui fait le taux de réussite. L'effacement l'oubliait — son nom
   y restait après qu'on lui avait promis le contraire. Mais
   supprimer la ligne viderait les statistiques de l'année à chaque
   dossier soldé : « on supprime tout quand ils ont leur permis »
   effacerait précisément les réussites.

   On retire donc le nom, et on garde tout le reste : date,
   résultat, boîte, parcours, moniteur, centre, rang.

   ⚠️ ET ON ÉCRIT « (élève effacé) », PAS DU VIDE. listerResultats
   saute les lignes dont la colonne « Élève » est vide
   (`if (!lignes[i][1]) continue`) : une cellule vidée ferait
   disparaître la ligne des statistiques sans que personne ne le
   voie — le pire des deux mondes, la donnée gardée et le chiffre
   faux.
   ------------------------------------------------------------ */
var RESULTAT_ANONYME = '(élève effacé)';

function anonymiserResultatsDe(nomEleve) {
  var recherche = normaliser(nomEleve);
  if (!recherche) return 0;
  var n = 0;
  try {
    var sh = feuilleResultats();
    var nb = sh.getLastRow();
    if (nb < 2) return 0;

    var v = sh.getRange(2, 2, nb - 1, 1).getValues();
    for (var i = 0; i < v.length; i++) {
      if (normaliser(v[i][0]) !== recherche) continue;
      sh.getRange(i + 2, 2).setValue(RESULTAT_ANONYME);
      n++;
    }
  } catch (e) { /* pas de feuille : rien à anonymiser */ }
  return n;
}

/* ---------- LECTURE ---------- */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};

    /* Même serrure qu'en POST. Sans action nommée, c'est la
       recherche dans les bilans : elle n'est pas dans la liste des
       portes ouvertes, donc elle est protégée. */
    if (porteFermee(params.action, params.secret)) {
      return reponseJson({ status: 'error', message: 'Acces refuse.' });
    }

    /* Liste des élèves déjà enregistrés (pour le menu déroulant) */
    /* L'écran : lecture seule, sans code d'accès */
    if (params.action === 'ecran') {
      return reponseJson(contenuEcran(params));
    }

    /* Le lien d'un cours : lecture seule, sans code d'accès. Le
       jeton lui-même fait l'autorisation, et il ne vaut que pour
       ce cours-là. */
    if (params.action === 'cours') {
      return reponseJson(lireLienCours(params.c));
    }
    if (params.action === 'coursConfirmer') {
      return reponseJson(confirmerLienCours(params.c));
    }

    if (params.action === 'eleves') {
      /* La seule colonne D, pas tout le classeur : getDataRange()
         chargeait aussi le texte intégral de chaque cours, et
         l'appel finissait par dépasser le temps d'exécution. */
      var shE = feuille();
      var nbE = shE.getLastRow();
      var toutes = (nbE >= 2) ? shE.getRange(2, 4, nbE - 1, 1).getValues() : [];
      var vus = {};
      var noms = [];
      for (var j = 0; j < toutes.length; j++) {
        var nom = texteCellule(toutes[j][0], false).trim();
        if (!nom) continue;
        var cle = normaliser(nom);
        if (vus[cle]) continue;
        vus[cle] = true;
        noms.push(nom);
      }
      /* On ajoute ceux du répertoire, qui n'ont pas encore de bilan */
      try {
        listerRepertoire().forEach(function (n) {
          var k = normaliser(n);
          if (vus[k]) return;
          vus[k] = true;
          noms.push(n);
        });
      } catch (e) { /* pas de répertoire : on garde ceux des bilans */ }

      noms.sort(function (a, b) { return a.localeCompare(b, 'fr'); });
      return reponseJson({ eleves: noms });
    }

    var recherche = normaliser(params.eleve);
    var filtreMoniteur = normaliser(params.moniteur);
    var filtreSite = normaliser(params.site);

    /* Il faut au moins un critère : élève ou moniteur */
    if (recherche.length < 2 && filtreMoniteur.length < 2) {
      return reponseJson({ resultats: [] });
    }

    var leger = (params.leger === '1' || params.leger === 'true');
    var sh = feuille();
    var nb = sh.getLastRow();
    if (nb < 2) return reponseJson({ resultats: [] });

    /* On ne relit pas tout le classeur : les colonnes A à D suffisent
       à filtrer, et le texte des cours — colonne E, de loin la plus
       lourde — n'est lu QUE pour les lignes retenues. Sur plusieurs
       milliers de bilans, la différence se compte en secondes. */
    var blocA = sh.getRange(2, 1, nb - 1, 4).getValues();          // A-D

    var gardees = [];
    for (var g = 0; g < blocA.length; g++) {
      if (recherche.length >= 2 && normaliser(blocA[g][3]) !== recherche) continue;
      if (filtreMoniteur.length >= 2 && normaliser(blocA[g][2]) !== filtreMoniteur) continue;
      if (filtreSite.length >= 2 && normaliser(blocA[g][1]) !== filtreSite) continue;
      gardees.push(g);
    }
    if (!gardees.length) return reponseJson({ resultats: [] });

    /* Le dossier d'un élève n'a besoin que de ses derniers cours :
       relire quarante bilans entiers pour en afficher trois coûtait
       plusieurs secondes. Le client demande ce qu'il lui faut. */
    /* Le total AVANT de tronquer : le numéro de leçon se compte sur
       tout l'historique, même si on ne relit que les derniers cours. */
    var totalBilans = gardees.length;

    var maxi = parseInt(params.maxi || '0', 10);
    if (maxi > 0 && gardees.length > maxi) {
      gardees = gardees.slice(gardees.length - maxi);
    }

    /* Une seule plage, des premières aux dernières lignes retenues :
       Sheets facture surtout le nombre d'appels, pas leur taille. */
    var min = gardees[0];
    var max = gardees[gardees.length - 1];
    /* ⚠️ SEPT COLONNES DEPUIS LA v1033 : la L porte l'état du relevé
       GPS. Une plage plus large que la grille fait lever getRange, et
       une plage trop courte ne se plaint pas — elle rend des cases
       vides, et l'écran croit qu'aucun cours n'a de GPS. C'est
       exactement le piège de listerBrouillons, et il se garde pareil :
       on demande ce qui EXISTE, jamais ce qu'on espère. */
    var largeurF = Math.max(6, Math.min(7, sh.getMaxColumns() - 5));
    var blocF = sh.getRange(min + 2, 6, max - min + 1, largeurF).getValues();
    var blocE = leger ? null : sh.getRange(min + 2, 5, max - min + 1, 1).getValues();
    var decalage = min;

    var resultats = [];
    for (var i = 0; i < blocA.length; i++) {
      if (recherche.length >= 2 && normaliser(blocA[i][3]) !== recherche) continue;
      if (filtreMoniteur.length >= 2 && normaliser(blocA[i][2]) !== filtreMoniteur) continue;
      if (filtreSite.length >= 2 && normaliser(blocA[i][1]) !== filtreSite) continue;
      resultats.push({
        ligne: i + 2,
        date: texteCellule(blocA[i][0], false),
        site: texteCellule(blocA[i][1], false),
        moniteur: texteCellule(blocA[i][2], false),
        eleve: texteCellule(blocA[i][3], false),
        bilan: leger ? '' : texteCellule(blocE[i - decalage][0], false),
        type: texteCellule(blocF[i - decalage][0], false),
        note: texteCellule(blocF[i - decalage][1], false),
        horodatage: texteCellule(blocF[i - decalage][2], true),
        boite: texteCellule(blocF[i - decalage][3], false),
        ants: texteCellule(blocF[i - decalage][4], false),
        manoeuvres: texteCellule(blocF[i - decalage][5], false),
        /* L'état du relevé GPS de ce cours-là, en quelques nombres.
           Vide sur les bilans d'avant la v1033, et sur les cours qui
           ne relèvent pas de trajet — un examen officiel, une reprise
           au bureau. L'écran ne dit alors rien du tout : « aucun GPS »
           sur chaque ligne ferait du bruit pour rien. */
        gps: texteCellule(blocF[i - decalage][6], false)
      });
    }

    resultats.reverse();                        // le plus récent en premier
    var limite = (recherche.length >= 2) ? 30 : 200;
    return reponseJson({ resultats: resultats.slice(0, limite),
                         total: totalBilans });

  } catch (err) {
    return reponseJson({ resultats: [], error: err.message });
  }
}
