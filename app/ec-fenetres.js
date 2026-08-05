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
var VERSION_SCRIPT = 45;

/* Les feuilles techniques créées par l'application.
   Elles ne doivent jamais être prises pour la feuille des bilans. */
var FEUILLES_TECHNIQUES = ['Journal', 'Modeles', 'Resultats', 'Captures',
                           'Eleves', 'Preparations', 'Consignes', 'SuiviPermis',
                           'Config'];

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

/* Normalise un nom : minuscules, sans accents, espaces internes réduits */
function normaliser(valeur) {
  return String(valeur || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
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
  elevesImport:    'Liste d\'élèves importée',
  bilanModifier:   'Bilan corrigé',
  bilanMaj:        'Bilan mis à jour',
  smsLog:          'SMS envoyé',
  ficheSet:        "Fiche d'élève modifiée",
  eleveRetirer:    'Élève retiré du répertoire',
  captureDelete:   'Capture CEPC supprimée',
  configSet:       'Réglage des places'
};

function feuilleJournal() {
  var f = classeur();
  var sh = f.getSheetByName('Journal');
  if (!sh) {
    sh = f.insertSheet('Journal', f.getNumSheets());
    sh.appendRow(['Horodatage', 'Utilisateur', 'Rôle', 'Action', 'Élève', 'Détail']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function journaliser(action, params) {
  try {
    var demandeur = String((params && params.demandeur) || '').trim();
    if (!demandeur) return;                       /* action non identifiée : on n'invente pas */
    if (!LIBELLES_ACTION[action]) return;         /* seules les actions qui modifient */

    var sh = feuilleJournal();
    sh.appendRow([
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
  if (action === 'prepAdd' || action === 'prepAssign') {
    return String(p.modeleLabel || p.modele || '') +
           (p.moniteur ? ' → ' + p.moniteur : '') +
           (p.date ? ' le ' + p.date : '');
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
  var lignes = sh.getDataRange().getValues();
  if (lignes.length < 2) return;

  var limite = new Date();
  limite.setDate(limite.getDate() - JOURS_CONSERVATION);

  var aSupprimer = 0;
  for (var i = 1; i < lignes.length; i++) {
    var d = lignes[i][0];
    if (d instanceof Date && d >= limite) break;   /* la feuille est chronologique */
    aSupprimer++;
  }
  /* Garde-fou de volume, même si les lignes sont récentes */
  var trop = (lignes.length - 1) - MAX_LIGNES_JOURNAL;
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

function lireJournal(params) {
  var sh = feuilleJournal();
  var lignes = sh.getDataRange().getValues();
  var out = [];

  var qui = normaliser((params && params.qui) || '');
  var eleve = normaliser((params && params.eleve) || '');
  var depuis = (params && params.depuis) ? String(params.depuis) : '';
  var max = parseInt((params && params.max) || '300', 10);

  for (var i = lignes.length - 1; i >= 1 && out.length < max; i--) {
    if (!lignes[i][0]) continue;
    var iso = (lignes[i][0] instanceof Date)
      ? Utilities.formatDate(lignes[i][0], 'Europe/Paris', 'yyyy-MM-dd')
      : '';
    if (depuis && iso && iso < depuis) break;
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

  return { status: 'ok', lignes: out, conservation: JOURS_CONSERVATION,
           total: Math.max(lignes.length - 1, 0),
           alertes: alertesJournal(out) };
}

/* ============================================================
   MODÈLES DE MESSAGE
   Textes rédigés par l'auto-école, modifiables depuis l'app.
   ============================================================ */
function feuilleModeles() {
  var f = classeur();
  var sh = f.getSheetByName('Modeles');
  if (!sh) {
    sh = f.insertSheet('Modeles', f.getNumSheets());
    sh.appendRow(['Id', 'Usage', 'Nom', 'Contenu', 'Mis à jour le', 'Par']);
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
      par: texteCellule(lignes[i][5], false)
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
    String(d.demandeur || '')
  ];

  if (id) {
    for (var i = 1; i < lignes.length; i++) {
      if (String(lignes[i][0]) === id) {
        sh.getRange(i + 1, 1, 1, ligne.length).setValues([ligne]);
        return { status: 'ok', id: id };
      }
    }
  }
  sh.appendRow(ligne);
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
    sh.appendRow(['Date examen', 'Élève', 'Résultat', 'Boîte', 'Parcours',
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

  sh.appendRow([
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
  return m ? m[0] : '';
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
    sh.appendRow(['Id', 'Élève', 'Date examen', 'Légende', 'Image', 'Ajouté le', 'Par']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function ajouterCapture(d) {
  var eleve = String(d.eleve || '').trim();
  if (!eleve) return { status: 'error', message: 'Élève manquant.' };
  if (!d.image) return { status: 'error', message: 'Image manquante.' };

  feuilleCaptures().appendRow([
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
      sh.appendRow(entetes);
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
function feuilleEleves() {
  var f = classeur();
  var sh = f.getSheetByName('Eleves');
  if (!sh) {
    sh = f.insertSheet('Eleves', f.getNumSheets());
    sh.appendRow(['Élève', 'Téléphone', 'Email', 'Formation', 'Messenger',
                  'Remarques', 'Genre', 'Ajouté le', 'Par']);
    sh.setFrozenRows(1);
  }
  return sh;
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
    ajouts.push([n, '', '', '', '', '', maintenant, String(d.demandeur || '')]);
  });

  if (ajouts.length) {
    sh.getRange(sh.getLastRow() + 1, 1, ajouts.length, 8).setValues(ajouts);
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
  var lignes = sh.getDataRange().getValues();
  var index = {};
  for (var i = 1; i < lignes.length; i++) {
    if (lignes[i][0]) index[normaliser(lignes[i][0])] = i + 1;
  }

  var maintenant = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');
  var ajouts = [];
  var majs = 0, doublons = 0;

  recues.forEach(function (f) {
    var nom = String(f.eleve || '').replace(/\s+/g, ' ').trim();
    if (nom.length < 3) return;
    var cle = normaliser(nom);

    /* Déjà rencontré dans ce même fichier : on ne le traite qu'une fois */
    if (index[cle] === -1) { doublons++; return; }

    if (index[cle]) {
      /* Déjà là : on complète ce qui manque, sans écraser */
      var ligne = index[cle];
      var actuel = sh.getRange(ligne, 1, 1, 7).getValues()[0];
      var nouveau = [
        nom,
        String(f.telephone || '').trim() || actuel[1],
        String(f.email || '').trim() || actuel[2],
        String(f.formation || '').trim() || actuel[3],
        actuel[4],
        actuel[5]
      ];
      var change = false;
      for (var j = 1; j < 4; j++) {
        if (String(nouveau[j]) !== String(actuel[j])) change = true;
      }
      if (change) { sh.getRange(ligne, 1, 1, 6).setValues([nouveau]); majs++; }
      else doublons++;
      return;
    }

    index[cle] = -1;
    ajouts.push([nom, String(f.telephone || '').trim(), String(f.email || '').trim(),
                 String(f.formation || '').trim(), '', '',
                 String(f.genre || '').trim().toUpperCase(),
                 maintenant, String(demandeur || '')]);
  });

  if (ajouts.length) {
    sh.getRange(sh.getLastRow() + 1, 1, ajouts.length, 9).setValues(ajouts);
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
      ajoute: texteCellule(lignes[i][7], false)
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
    String(d.genre || '').trim().slice(0, 1).toUpperCase()
  ];

  for (var i = 1; i < lignes.length; i++) {
    if (normaliser(lignes[i][0]) === normaliser(nom)) {
      /* Un champ laissé vide ne doit pas effacer ce qui existe :
         le moniteur ne renseigne souvent que le Messenger. */
      for (var j = 1; j < valeurs.length; j++) {
        if (!valeurs[j] && lignes[i][j]) valeurs[j] = String(lignes[i][j]);
      }
      sh.getRange(i + 1, 1, 1, 7).setValues([valeurs]);
      return { status: 'ok', maj: true };
    }
  }

  /* Pas encore au répertoire : on l'y ajoute */
  sh.appendRow(valeurs.concat([
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.demandeur || '')
  ]));
  return { status: 'ok', cree: true };
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
   HISTORIQUE DES SMS
   Ce qui est parti, à qui, par qui. Sans trace écrite, personne
   ne peut dire si un élève a été prévenu.
   ============================================================ */
function feuilleSms() {
  var f = classeur();
  var sh = f.getSheetByName('Sms');
  if (!sh) {
    sh = f.insertSheet('Sms', f.getNumSheets());
    sh.appendRow(['Horodatage', 'Élève', 'Numéro', 'Par', 'Parties',
                  'Caractères', 'État', 'Message']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function enregistrerSms(d) {
  var sh = feuilleSms();
  sh.appendRow([
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
    String(d.eleve || ''),
    String(d.numero || ''),
    String(d.par || d.demandeur || ''),
    parseInt(d.parties, 10) || 1,
    parseInt(d.caracteres, 10) || String(d.message || '').length,
    String(d.etat || 'envoyé'),
    String(d.message || '').slice(0, 1200)
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
  var lignes = sh.getRange(depart, 1, nb - depart + 1, 8).getValues();

  var eleve = normaliser((params && params.eleve) || '');
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
      message: texteCellule(lignes[i][7], false)
    });
  }
  return { status: 'ok', sms: out, total: nb - 1 };
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    /* Suppression complète du dossier d'un élève */
    if (data.action === 'supprimerEleve') {
      return reponseJson(supprimerEleve(data.eleve));
    }

    /* Cours préparés à l'avance */
    if (data.action === 'prepAdd') {
      return reponseJson(ajouterPreparation(data));
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

    if (data.action === 'captureAdd') {
      return reponseJson(ajouterCapture(data));
    }
    if (data.action === 'captureList') {
      return reponseJson(listerCaptures(data));
    }
    if (data.action === 'captureDelete') {
      return reponseJson(supprimerCapture(data.id));
    }

    if (data.action === 'resultatAdd') {
      return reponseJson(enregistrerResultat(data));
    }
    if (data.action === 'resultatList') {
      return reponseJson(listerResultats(data));
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

    journaliser(data.action, data);

    if (data.action === 'prepDelete') {
      return reponseJson(supprimerPreparation(data.id, data.demandeur, data.role));
    }
    if (data.action === 'prepAssign') {
      return reponseJson(reattribuerPreparation(data.id, data.moniteur));
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
      return reponseJson({ eleves: etatEleves(), consignes: listerConsignes(''),
                           suivi: listerSuivi(),
                           places: lireConfig('places') });
    }
    if (data.action === 'suiviSet') {
      return reponseJson(enregistrerSuivi(data));
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
      String(data.manoeuvres || '')
    ];

    var sh = feuille();
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

/* ---------- PRÉPARATIONS : cours préparés à l'avance ---------- */
var NOM_ONGLET_PREP = 'Preparations';

function feuillePreparations() {
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
  var sh = classeur.getSheetByName(NOM_ONGLET_PREP);
  if (!sh) {
    sh = classeur.insertSheet(NOM_ONGLET_PREP);
    sh.appendRow(['Id', 'Date du cours', 'Élève', 'Type', 'Libellé',
                  'Site', 'Note', 'Contexte', 'Préparé par', 'Créé le']);
  }
  return sh;
}

function listerPreparations() {
  var lignes = feuillePreparations().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    out.push({
      id: String(lignes[i][0]),
      date: texteCellule(lignes[i][1], false),
      eleve: texteCellule(lignes[i][2], false),
      modele: texteCellule(lignes[i][3], false),
      modeleLabel: texteCellule(lignes[i][4], false),
      site: texteCellule(lignes[i][5], false),
      note: texteCellule(lignes[i][6], false),
      contexte: texteCellule(lignes[i][7], false),
      moniteur: texteCellule(lignes[i][8], false)
    });
  }
  return out;
}

function ajouterPreparation(data) {
  var sh = feuillePreparations();
  var id = String(data.id || new Date().getTime());
  var ligne = sh.getLastRow() + 1;
  var valeurs = [
    id,
    String(data.date || ''),
    String(data.eleve || ''),
    String(data.modele || ''),
    String(data.modeleLabel || ''),
    String(data.site || ''),
    String(data.note || ''),
    String(data.contexte || ''),
    String(data.moniteur || ''),
    Utilities.formatDate(new Date(),
      SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'dd/MM/yyyy HH:mm')
  ];
  var plage = sh.getRange(ligne, 1, 1, valeurs.length);
  plage.setNumberFormat('@');
  plage.setValues([valeurs]);
  return { status: 'ok', id: id };
}

/* Réattribue un cours préparé à un autre moniteur */
function reattribuerPreparation(id, moniteur) {
  var sh = feuillePreparations();
  var lignes = sh.getDataRange().getValues();
  for (var i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]) === String(id)) {
      sh.getRange(i + 1, 9).setValue(String(moniteur || ''));
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

    var proprietaire = String(lignes[i][8] || '');
    var admin = (String(role || '') === 'admin');

    /* Seul le moniteur à qui le cours est attribué peut le supprimer.
       Sans moniteur attribué, seul un administrateur le peut. */
    if (!admin) {
      if (!proprietaire) {
        return { status: 'error',
                 message: 'Ce cours n\'est attribué à personne. Seul un administrateur peut le supprimer.' };
      }
      if (!demandeur || normaliser(proprietaire) !== normaliser(demandeur)) {
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
    sh.appendRow(['Id', 'Élève', 'Type', 'Valeur', 'Texte', 'Créé le', 'Par', 'Traité']);
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
                  'CEPC image', 'Bilan élève', 'Texte moniteur', 'Heures repassage'];

function feuilleSuivi() {
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
  var sh = classeur.getSheetByName(NOM_ONGLET_SUIVI);
  if (!sh) {
    sh = classeur.insertSheet(NOM_ONGLET_SUIVI);
    sh.appendRow(COLS_SUIVI);
  }
  return sh;
}

function listerSuivi() {
  var lignes = feuilleSuivi().getDataRange().getValues();
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
      heuresRepassage: texteCellule(lignes[i][43], false)
    });
  }
  return out;
}

function enregistrerSuivi(d) {
  var sh = feuilleSuivi();
  var lignes = sh.getDataRange().getValues();
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
    String(d.heuresRepassage || '')
  ];
  var plage = sh.getRange(ligne, 1, 1, valeurs.length);
  plage.setNumberFormat('@');
  plage.setValues([valeurs]);
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
    sh.appendRow(['Clé', 'Valeur', 'Mis à jour le']);
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
    if (/^Conduite/i.test(type) || /^AAC/i.test(type)) e.lecons++;
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

  if (!aSupprimer.length) {
    return { status: 'ok', supprimees: 0, message: 'Aucun bilan trouvé.' };
  }

  /* On supprime en partant du bas : sinon les numéros de ligne
     se décalent au fur et à mesure et on efface les mauvaises. */
  aSupprimer.sort(function (a, b) { return b - a; });
  for (var k = 0; k < aSupprimer.length; k++) {
    sh.deleteRow(aSupprimer[k]);
  }

  return { status: 'ok', supprimees: aSupprimer.length };
}

/* ---------- LECTURE ---------- */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};

    /* Liste des élèves déjà enregistrés (pour le menu déroulant) */
    if (params.action === 'eleves') {
      var toutes = feuille().getDataRange().getValues();
      var vus = {};
      var noms = [];
      for (var j = 1; j < toutes.length; j++) {
        var nom = texteCellule(toutes[j][3], false).trim();
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

    /* En mode léger on ne charge pas la colonne E (texte du cours),
       de loin la plus volumineuse. */
    var blocA = sh.getRange(2, 1, nb - 1, 4).getValues();          // A-D
    var blocF = sh.getRange(2, 6, nb - 1, 6).getValues();          // F-K
    var blocE = leger ? null : sh.getRange(2, 5, nb - 1, 1).getValues();

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
        bilan: leger ? '' : texteCellule(blocE[i][0], false),
        type: texteCellule(blocF[i][0], false),
        note: texteCellule(blocF[i][1], false),
        horodatage: texteCellule(blocF[i][2], true),
        boite: texteCellule(blocF[i][3], false),
        ants: texteCellule(blocF[i][4], false),
        manoeuvres: texteCellule(blocF[i][5], false)
      });
    }

    resultats.reverse();                        // le plus récent en premier
    var limite = (recherche.length >= 2) ? 30 : 200;
    return reponseJson({ resultats: resultats.slice(0, limite) });

  } catch (err) {
    return reponseJson({ resultats: [], error: err.message });
  }
}
