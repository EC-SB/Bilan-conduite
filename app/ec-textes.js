/* Déployé le 12/09/2026 à 10:50 — v969 */
/* ============================================================
   ec-textes.js
   Bibliothèque de modèles de message, rédigés et modifiables
   depuis l'application, enregistrés dans le classeur.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les emplacements où un modèle peut être utilisé.
   Chaque usage annonce les variables qu'il sait remplacer. */
const USAGES_MODELE = [
  { cle:'permis_jour',    nom:'📣 Groupe Messenger — planning du jour',
    variables:['{date}', '{centre}', '{rendezvous}', '{liste}', '{note}'] },
  { cle:'permis_rappels', nom:'📌 Groupe Messenger — rappels avant examen',
    variables:[] },
  { cle:'permis_obtenu',  nom:'🎓 Élève ayant obtenu son permis',
    variables:['{eleve}', '{date}'] },
  { cle:'examen_blanc',   nom:'📝 Examen blanc — message à l\'élève',
    variables:['{eleve}', '{date}', '{moniteur}'] },
  { cle:'post_permis',    nom:'🔁 Rendez-vous post-permis',
    variables:['{eleve}', '{date}', '{moniteur}', '{ajournements}'] },
  { cle:'depart',         nom:'🚪 Départ de l\'auto-école',
    variables:['{eleve}', '{date}', '{motif}'] },
  { cle:'ecoutes', nom:'😱 Rappel écoutes pédagogiques', variables:[] },
  { cle:'permis_planning', nom:'🚨 Planning formation avant permis',
    variables:['{veille}', '{permis}', '{moniteur}', '{centre}', '{liste}'] },
  { cle:'rappel_cours',   nom:'🔔 Rappel de cours par mail — élève',
    variables:['{jour}', '{voiture}', '{emplacement}', '{mentions}',
               '{note}', '{prenom}', '{eleve}',
               '{date}', '{datecourte}', '{heure}', '{heure+2h}',
               '{duree}', '{moniteur}', '{site}', '{lien}'] },
  { cle:'rappel_financeur', nom:'💶 Rappel de cours par mail — financeur',
    variables:['{eleve}', '{prenom}', '{date}', '{datecourte}', '{heure}',
               '{typeseance}', '{emplacement}', '{voiture}', '{moniteur}',
               '{moniteurligne}', '{note}', '{mention48h}'] },
  { cle:'procedure',      nom:'🚦 Procédure de conduite',
    variables:[] },
  /* ⚠️ {prenom} EST DANS LA LISTE — v959. envoyerFicheParMail le
     remplit depuis toujours ; il manquait ici, donc il n'était ni
     proposé au bouton, ni reconnu par l'alerte qui prévient qu'une
     variable vient d'être retirée. Une liste qui ne dit pas tout ce
     que l'autre remplit, c'est encore le même fait à deux
     endroits. */
  { cle:'libre',          nom:'📄 Texte libre',
    variables:['{prenom}', '{eleve}', '{date}'] }
];

/* ⚠️ UNE NOUVELLE FICHE EST UN TEXTE LIBRE — v958.

   Les onze premiers usages sont des EMPLACEMENTS : l'application va
   y chercher un texte et un seul. Le menu s'ouvrait sur le premier
   d'entre eux (« Groupe Messenger — planning du jour »), si bien
   qu'une fiche créée sans y penser se posait dessus. Avec cent
   fiches à saisir, c'est cent chances de déplacer un texte que
   l'application utilise vraiment.

   Un seul endroit écrit ce menu, et il connaît son défaut. */
function optionsUsage(defaut){
  return USAGES_MODELE.map(u =>
    '<option value="' + u.cle + '"' +
    (u.cle === (defaut || 'libre') ? ' selected' : '') + '>' +
    u.nom + '</option>').join('');
}

/* Ce qu'il faut savoir des heures calculées, dit là où on écrit
   le modèle plutôt que dans un guide qu'on ne relit jamais. */
const AIDE_HEURES =
  '<code>{date}</code> donne « dimanche 23 août », ' +
  '<code>{datecourte}</code> donne « 23/08 » — calculés depuis ' +
  'le champ <em>Quand</em>.<br>' +
  'Les heures se calculent depuis celle du cours : ' +
  '<code>{heure+2h}</code>, <code>{heure+1h30}</code>, ' +
  '<code>{heure+45min}</code>. Le signe moins recule.<br>' +
  'Un cours à 13h donne « 13h à {heure+2h} » → <strong>13h à 15h</strong>.';

/* Un modèle de départ pour les usages qui en ont un. Le texte
   n'est pas recopié ici : il vit dans le module qui l'utilise,
   sinon les deux finiraient par diverger sans qu'on le voie. */
function modeleParDefaut(cle){
  if(cle === 'rappel_financeur' && typeof MODELE_FINANCEUR_DEFAUT !== 'undefined'){
    return MODELE_FINANCEUR_DEFAUT;
  }
  return '';
}

function nomUsage(cle){
  const u = USAGES_MODELE.find(x => x.cle === cle);
  return u ? u.nom : cle;
}

/* ============================================================
   CATÉGORIES LIBRES
   Les emplacements techniques (jour du permis, rappels…) restent
   fixes : l'application sait où les utiliser. Les catégories,
   elles, servent au rangement et sont créées librement.
   ============================================================ */
/* ⚠️ CETTE FONCTION NE SERT PLUS QU'À RELIRE LE PASSÉ — v958.

   Jusqu'ici la catégorie était rangée DANS le nom (« Permis ›
   Félicitations »), faute de colonne à elle : une fonction la
   collait devant, celle-ci la redécoupait. Le même fait à
   deux endroits, et c'est toujours le même prix : une fiche ne
   pouvait être que dans UNE catégorie, et la renommer la
   déménageait sans prévenir.

   Les étiquettes ont maintenant leur colonne. Ce découpage reste
   pour les textes déjà écrits : la catégorie qu'il retrouve devient
   leur première étiquette (voir etiquettesDe), une fois, sans rien
   ressaisir. Rien ne la réécrit plus jamais dans un nom —
   assemblerNom a été supprimée pour que ce soit impossible. */
function separerCategorie(nom){
  const i = String(nom || '').indexOf(' › ');
  if(i === -1) return { categorie: '', titre: String(nom || '') };
  return { categorie: nom.slice(0, i).trim(), titre: nom.slice(i + 3).trim() };
}

let modelesTexte = [];

/* Les modèles changent rarement : les relire à chaque ouverture
   d'un onglet Outils faisait attendre pour rien. */
let modelesLusA = 0;
const MODELES_FRAIS = 5 * 60 * 1000;   /* cinq minutes */

async function chargerModelesTexte(forcer){
  /* Déjà en mémoire et récents : on rend la main aussitôt */
  if(!forcer && modelesTexte.length &&
     (Date.now() - modelesLusA) < MODELES_FRAIS){
    return modelesTexte;
  }

  try{
    const d = await appelPrep({ action: 'modeleList' });
    modelesTexte = ((d && d.modeles) || []).map(m => {
      const s = separerCategorie(m.nom);
      return Object.assign({}, m, { categorie: s.categorie, titre: s.titre });
    });
    modelesLusA = Date.now();
  }catch(e){
    console.warn('Modèles indisponibles :', e);
  }
  return modelesTexte;
}


/* Une modification les périme : le prochain écran relira. */
function perimerModeles(){
  modelesLusA = 0;
}

/* ------------------------------------------------------------
   LES BILANS QU'UN RAPPEL PEUT CRÉER

   Le catalogue des modèles de bilan, groupé comme il l'est
   partout ailleurs. Il n'est PAS recopié : il est lu dans MODELES,
   la seule liste qui existe. Une seconde liste à tenir d'accord
   finirait par proposer un bilan disparu, ou par en cacher un
   nouveau.

   Les paires « — Boîte automatique » / « — Boîte manuelle » sont
   toutes deux proposées : ce qui est choisi n'est qu'un point de
   départ, modeleDansLaBoite prend ensuite la version qui
   correspond à la fiche de l'élève.
   ------------------------------------------------------------ */
function optionsBilanDuRappel(){
  const ech = t => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  let h = '<option value="">— d\'après la fiche de l\'élève —</option>';
  if(typeof MODELES === 'undefined') return h;

  const groupes = {};
  Object.keys(MODELES).forEach(cle => {
    const m = MODELES[cle] || {};
    if(!m.label) return;
    (groupes[m.groupe || 'Autres'] =
      groupes[m.groupe || 'Autres'] || []).push({ cle: cle, label: m.label });
  });

  Object.keys(groupes).forEach(g => {
    h += '<optgroup label="' + ech(g) + '">';
    groupes[g].forEach(o => {
      h += '<option value="' + ech(o.cle) + '">' + ech(o.label) + '</option>';
    });
    h += '</optgroup>';
  });
  return h;
}


/* Le premier modèle enregistré pour cet usage, s'il en existe un */
function modelePour(usage){
  return modelesTexte.find(m => m.usage === usage) || null;
}

/* Remplace les {variables} par leurs valeurs.
   Une variable absente disparaît, plutôt que de laisser {truc} dans le texte. */
function appliquerModele(contenu, valeurs){
  let t = String(contenu || '');

  /* Les heures décalées d'abord : {heure+2h} vaut l'heure du cours
     plus deux heures. Sans cela, {heure} serait remplacé le premier
     et le décalage n'aurait plus de base. */
  t = calculerHeuresDecalees(t, (valeurs || {}).heure);

  Object.keys(valeurs || {}).forEach(k => {
    t = t.split('{' + k + '}').join(String(valeurs[k] === undefined ? '' : valeurs[k]));
  });
  /* Nettoyage des variables non fournies */
  t = t.replace(/\{[a-zA-Zéèêàçùî_]+\}/g, '');
  return t;
}


/* ============================================================
   LES HEURES CALCULÉES

   Un cours se découpe en tranches. Plutôt que de réécrire les
   horaires à chaque rappel, on les fait dériver de l'heure de
   début :

     1- {heure} à {heure+2h} circulation
     2- {heure+2h} à {heure+3h} examen blanc

   Un cours à 13h donne « 13h à 15h », puis « 15h à 16h ».
   Les formes acceptées : +2h, +1h30, +45min, et le signe moins
   pour reculer.
   ============================================================ */
function calculerHeuresDecalees(texte, heureDebut){
  const base = minutesDeLHeure(heureDebut);

  /* Pas d'heure de départ : on efface les décalages plutôt que
     de laisser « {heure+2h} » dans un message envoyé. */
  if(base === null){
    return String(texte).replace(/\{heure\s*[+-][^}]*\}/gi, '');
  }

  return String(texte).replace(
    /\{heure\s*([+-])\s*([^}]+)\}/gi,
    (tout, signe, duree) => {
      const m = minutesDeLaDuree(duree);
      if(m === null) return '';
      const total = base + (signe === '-' ? -m : m);
      return heureLisible(total);
    }
  );
}

/* « 13:00 », « 13h00 » ou « 13h » en minutes depuis minuit */
function minutesDeLHeure(v){
  const s = String(v || '').trim();
  if(!s) return null;
  const m = s.match(/^(\d{1,2})\s*[h:]\s*(\d{0,2})/);
  if(!m) return null;
  return Number(m[1]) * 60 + (Number(m[2]) || 0);
}

/* « 2h », « 1h30 », « 45min », « 90 » en minutes */
function minutesDeLaDuree(v){
  const s = String(v || '').trim().toLowerCase().replace(/\s+/g, '');
  if(!s) return null;

  let m = s.match(/^(\d+)h(\d{1,2})?$/);
  if(m) return Number(m[1]) * 60 + (Number(m[2]) || 0);

  m = s.match(/^(\d+)(?:min|m)$/);
  if(m) return Number(m[1]);

  m = s.match(/^(\d+)$/);
  if(m) return Number(m[1]);

  return null;
}

/* « 15h » plutôt que « 15h00 » : c'est ainsi qu'on écrit une heure
   ronde dans un message. */
function heureLisible(minutes){
  let t = minutes % (24 * 60);
  if(t < 0) t += 24 * 60;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return m ? (h + 'h' + String(m).padStart(2, '0')) : (h + 'h');
}


/* ---------- Interface de gestion ---------- */

/* ------------------------------------------------------------
   QUELS DOSSIERS SONT OUVERTS

   L'écran se redessine à chaque modification — un texte
   enregistré, un dossier vidé, un import. Rouvrir tous les
   dossiers à chaque fois oblige à tout refermer pour retrouver
   celui sur lequel on travaillait.

   Les dossiers ouverts sont donc retenus sur ce poste. Fermés par
   défaut : le nombre de textes s'affiche sur chaque dossier, on
   n'a besoin d'ouvrir que celui qu'on veut modifier.
   ------------------------------------------------------------ */
const CLE_DOSSIERS_TEXTES = 'ec_textes_dossiers';

/* ============================================================
   LES ÉTIQUETTES — LE PRINCIPE DE KEEP (v958)

   David, le 11 septembre 2026 : « il faut prévoir qu'une fiche soit
   dans plusieurs catégories et que je puisse la changer de
   catégorie. Tout sur le même principe que Keep. »

   ⚠️ DES ÉTIQUETTES, PAS DES DOSSIERS. Une fiche n'est pas DANS une
   catégorie : elle en PORTE autant qu'on veut, et on en ajoute ou
   on en retire sans rien déplacer. C'est toute la différence, et
   c'est ce qui fait qu'on ne range jamais « mal ».

   ⚠️ ET LES ANCIENNES CATÉGORIES NE SE RETAPENT PAS. Elles vivaient
   DANS le titre — « Permis › Félicitations », un bricolage assumé,
   « faute de colonne dédiée ». Elles deviennent la première
   étiquette de leur fiche, toutes seules, sans rien ressaisir et
   sans rien perdre : le titre garde sa forme d'origine tant que
   personne ne le réécrit.
   ============================================================ */

/* Celles qui existent dès le premier jour — les carnets de David.
   On peut en créer d'autres, elles n'ont rien de particulier. */
const ETIQUETTES_DEPART = ['📥 Inscription', '🎓 Code', '🚗 Conduite',
                           '🏁 Permis', '🏍️ Moto', '🚚 Remorque',
                           '💶 Financement', '👥 Groupes'];

/* Le séparateur, le même que celui du classeur. */
const SEP_ETIQ = ' · ';

function decouperEtiquettes(txt){
  return String(txt || '').split('·')
    .map(x => x.trim()).filter(Boolean)
    .filter((x, i, t) => t.indexOf(x) === i);
}

/* Les étiquettes d'une fiche : celles de sa colonne, plus son
   ancienne catégorie si elle n'y figure pas encore. */
function etiquettesDe(m){
  const l = decouperEtiquettes((m || {}).etiquettes);
  const vieille = String((m || {}).categorie || '').trim();
  if(vieille && l.indexOf(vieille) === -1) l.unshift(vieille);
  return l;
}

/* ============================================================
   LA CATÉGORIE PRIVÉE — CELLE DE CHACUN

   David : « est-ce que tu peux ajouter une catégorie privée par
   utilisateur, où chacun met ce qu'il veut, et que les admins
   peuvent voir ».

   ⚠️ PAS UNE SECONDE BIBLIOTHÈQUE. Une fiche privée est une fiche
   comme une autre, avec une catégorie de plus : « prive:David ».
   Un second stockage aurait voulu dire une seconde recherche, un
   second import, une seconde liste à tenir d'accord — et le jour où
   quelqu'un veut partager une de ses fiches, un déménagement au
   lieu d'un clic.

   Ce que ça change : les fiches privées des AUTRES ne s'affichent
   pas. Un administrateur les voit toutes, avec le nom de leur
   propriétaire écrit dessus — « que les admins peuvent voir »
   veut dire voir, pas voir sans le savoir.
   ============================================================ */
const PREFIXE_PRIVE = 'prive:';

function marqueurPriveDe(m){
  return etiquettesDe(m).find(e => e.indexOf(PREFIXE_PRIVE) === 0) || '';
}

function proprietairePrive(m){
  const t = marqueurPriveDe(m);
  return t ? t.slice(PREFIXE_PRIVE.length).trim() : '';
}

function maMarquePrivee(){
  const nom = (typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur)
    ? String(ACCES.moniteur).trim() : '';
  return nom ? PREFIXE_PRIVE + nom : '';
}

function cestMoi(nom){
  const a = (typeof normaliserMot === 'function')
    ? normaliserMot(nom) : String(nom || '').toLowerCase();
  const moi = (typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur)
    ? ACCES.moniteur : '';
  const b = (typeof normaliserMot === 'function')
    ? normaliserMot(moi) : String(moi).toLowerCase();
  return !!a && a === b;
}

/* Un administrateur voit le privé de tout le monde. Les autres ne
   voient que le leur. */
function jeVoisToutLePrive(){
  return (typeof aDroit === 'function') ? aDroit('admin') : true;
}

function jePeuxVoir(m){
  const p = proprietairePrive(m);

  /* Ma propre fiche privée, toujours. Celle d'un autre, seulement
     si je suis administrateur. */
  if(p && cestMoi(p)) return true;
  if(p && !jeVoisToutLePrive()) return false;

  /* ⚠️ UNE FICHE SE VOIT PAR LE CARNET OÙ ELLE EST RANGÉE. Elle en
     a souvent plusieurs : il suffit qu'UN d'entre eux me soit
     ouvert. Exiger qu'ils le soient tous reviendrait à cacher une
     fiche « Conduite » parce qu'elle est aussi dans
     « Financement » — on ne comprendrait pas pourquoi elle manque
     dans un carnet où elle est pourtant rangée. */
  const cats = categoriesDe(m);
  if(!cats.length) return true;
  return cats.some(jeVoisLaCategorie);
}

/* ============================================================
   QUI VOIT QUELLE CATÉGORIE

   David : « et qu'on puisse choisir qui voit quelle catégorie
   aussi », puis « pour les admins, en haut, tu mets sous une roue
   crantée, comme ça on choisit directement ici, par catégorie, qui
   voit quelle catégorie ».

   Une seule table, dans les réglages partagés : la catégorie, et
   les noms qui la voient. Vide — ou absente — veut dire TOUT LE
   MONDE, et c'est le cas de toutes les catégories tant que personne
   n'a rien coché. Un réglage qui commence par tout fermer est un
   réglage qu'on découvre en s'apercevant qu'il manque la moitié de
   l'écran.
   ============================================================ */
const CLE_ACCES_CATEG = 'categories:acces';
let accesCategories = null;

async function chargerAccesCategories(){
  if(accesCategories) return accesCategories;
  accesCategories = {};
  if(typeof chargerReglagesPartages !== 'function') return accesCategories;
  try{
    const r = await chargerReglagesPartages(false);
    const brut = String(r[CLE_ACCES_CATEG] || '').trim();
    if(brut) accesCategories = JSON.parse(brut) || {};
  }catch(e){ accesCategories = {}; }
  return accesCategories;
}

async function enregistrerAccesCategories(table){
  accesCategories = table || {};
  if(typeof ecrireReglagePartage !== 'function') return;
  await ecrireReglagePartage(CLE_ACCES_CATEG, JSON.stringify(accesCategories));
}

function quiVoitLaCategorie(cat){
  const l = (accesCategories || {})[cat];
  return Array.isArray(l) ? l : [];
}

function jeVoisLaCategorie(cat){
  const l = quiVoitLaCategorie(cat);
  if(!l.length) return true;              /* personne de coché = tout le monde */
  if(jeVoisToutLePrive()) return true;    /* un administrateur voit tout */
  return l.some(cestMoi);
}

/* ⚠️ LA POPULATION DE L'ÉCRAN S'ÉCRIT ICI, UNE FOIS. Les compteurs
   du rail et la liste des fiches doivent parler des mêmes fiches :
   deux filtres, et le rail annonce douze fiches dans un carnet qui
   en montre neuf. */
function fichesVisibles(){
  return (modelesTexte || []).filter(jePeuxVoir);
}

/* ============================================================
   ⚠️ LES ÉTIQUETTES TECHNIQUES NE SONT PAS DES CARNETS — v969

   Deux étiquettes ne nomment pas un carnet de l'école : « prive:
   David », qui dit à qui est la fiche, et « couleur:jaune », qui
   dit de quelle couleur elle est. Elles voyagent dans la même
   colonne que les autres — c'est tout leur intérêt, il n'y a
   qu'une liste à tenir — mais elles ne se rangent pas, ne se
   renomment pas, et n'apparaissent ni sur la carte ni dans le rail
   des catégories.

   Leurs préfixes sont NOMMÉS ici, une fois. Le marqueur privé
   avait son filtre écrit à la main ; la couleur en aurait demandé
   un deuxième, et la troisième un troisième — jusqu'au jour où
   l'un des trois manquerait quelque part, et où « couleur:jaune »
   s'afficherait comme un carnet.
   ============================================================ */
const PREFIXE_COULEUR = 'couleur:';
const PREFIXES_TECHNIQUES = [PREFIXE_PRIVE, PREFIXE_COULEUR];

function estEtiquetteTechnique(e){
  const t = String(e || '');
  return PREFIXES_TECHNIQUES.some(p => t.indexOf(p) === 0);
}

/* Les catégories d'une fiche : ses étiquettes, moins les
   techniques. */
function categoriesDe(m){
  return etiquettesDe(m).filter(e => !estEtiquetteTechnique(e));
}

/* ============================================================
   LA COULEUR DE LA FICHE — COMME KEEP — v969

   David, le 11 puis le 12 septembre : « mettre en place comme Keep
   sur les fiches de modèles messages des palettes de couleur pour
   le fond de la fiche, que des couleurs pastels ». Et, le 12, sur
   le rangement : « A » — la couleur appartient à la fiche, elle est
   donc la même pour toute l'école.

   ⚠️ HUIT NOMS, PAS SEIZE VALEURS. La table ne contient que les
   clés : les teintes vivent dans la feuille de style, en deux jeux,
   un clair et un sombre. Écrire « #FBF4CF » ici en ferait la
   troisième version de la même couleur — et le jour où le thème
   sombre change, c'est celle-ci qu'on oublierait.
   ============================================================ */
const COULEURS_FICHE = [
  { cle:'jaune',  nom:'Jaune'  },
  { cle:'orange', nom:'Orange' },
  { cle:'rouge',  nom:'Rouge'  },
  { cle:'rose',   nom:'Rose'   },
  { cle:'violet', nom:'Violet' },
  { cle:'bleu',   nom:'Bleu'   },
  { cle:'menthe', nom:'Menthe' },
  { cle:'vert',   nom:'Vert'   }
];

function couleurDeLaFiche(m){
  const t = etiquettesDe(m).find(e => e.indexOf(PREFIXE_COULEUR) === 0) || '';
  const cle = t ? t.slice(PREFIXE_COULEUR.length).trim() : '';
  /* Une couleur qu'on ne connaît pas ne teinte rien : une valeur
     tapée à la main dans le classeur ne doit pas peindre une fiche
     d'une couleur qui n'existe pas dans la feuille de style. */
  return COULEURS_FICHE.some(c => c.cle === cle) ? cle : '';
}

/* ============================================================
   ⚠️ ENREGISTRER UNE FICHE — PAR UNE SEULE PORTE — v969

   « modeleSet » écrit la LIGNE ENTIÈRE du classeur : un champ
   oublié dans la charge utile ne reste pas tel qu'il était, il
   s'efface. Le commentaire de la boucle de renommage le disait
   déjà — et pourtant la charge était recopiée à la main à trois
   endroits. La quatrième copie, c'était la quatrième occasion
   d'oublier un champ, et cette faute-là ne se voit qu'après, dans
   le classeur, sur la fiche de quelqu'un d'autre.

   Elle s'écrit donc ici, une fois. Ajouter une colonne au modèle,
   c'est désormais l'ajouter à UN endroit.
   ============================================================ */
async function enregistrerModeleTexte(m){
  return appelPrep({
    action: 'modeleSet',
    id: m.id,
    usage: m.usage || 'libre',
    nom: m.titre || m.nom,
    etiquettes: m.etiquettes || '',
    boite: m.boite || '',
    ordre: !!m.ordre,
    consigne: m.consigne || '',
    bilan: m.bilan || '',
    contenu: m.contenu || ''
  });
}

/* Poser une couleur, ou la retirer avec une clé vide. La fiche
   n'en porte jamais deux : on remplace. */
async function poserCouleurFiche(m, cle){
  if(!m) return;
  const garde = etiquettesDe(m).filter(e => e.indexOf(PREFIXE_COULEUR) !== 0);
  if(cle) garde.push(PREFIXE_COULEUR + cle);

  const avant = m.etiquettes;
  m.etiquettes = garde.join(SEP_ETIQ);

  try{
    await enregistrerModeleTexte(m);
  }catch(e){
    /* L'écriture a échoué : la fiche reprend sa couleur d'avant.
       La laisser peinte à l'écran ferait croire que c'est
       enregistré. */
    m.etiquettes = avant;
    if(typeof showToast === 'function') showToast('Couleur non enregistrée');
    throw e;
  }
}

/* ⚠️ L'ORDRE DES ÉTIQUETTES EST RANGÉ, PAS DEVINÉ — David : « j'ai
   besoin de modifier l'ordre des catégories aussi par un cliquer
   glisser ». Il vit dans les réglages partagés : c'est l'ordre de
   l'école, pas celui d'un appareil. */
const CLE_ORDRE_ETIQ = 'etiquettes:ordre';
let ordreEtiquettes = null;

async function chargerOrdreEtiquettes(){
  if(ordreEtiquettes) return ordreEtiquettes;
  if(typeof chargerReglagesPartages !== 'function'){
    ordreEtiquettes = ETIQUETTES_DEPART.slice();
    return ordreEtiquettes;
  }
  try{
    const r = await chargerReglagesPartages(false);
    const l = decouperEtiquettes(r[CLE_ORDRE_ETIQ]);
    ordreEtiquettes = l.length ? l : ETIQUETTES_DEPART.slice();
  }catch(e){ ordreEtiquettes = ETIQUETTES_DEPART.slice(); }
  return ordreEtiquettes;
}

async function enregistrerOrdreEtiquettes(liste){
  ordreEtiquettes = liste.slice();
  if(typeof ecrireReglagePartage !== 'function') return;
  await ecrireReglagePartage(CLE_ORDRE_ETIQ, liste.join(SEP_ETIQ));
}

/* Toutes celles qui existent : l'ordre rangé d'abord, puis celles
   qu'une fiche porte sans qu'on les ait rangées — jamais perdues,
   simplement à la fin. */
function toutesLesEtiquettes(){
  const vues = [];
  /* categoriesDe, pas etiquettesDe : un marqueur « prive:David »
     n'est pas un carnet de l'école et n'a rien à faire dans le
     rail des catégories. */
  (modelesTexte || []).forEach(m => categoriesDe(m).forEach(e => {
    if(vues.indexOf(e) === -1) vues.push(e);
  }));

  const rangees = (ordreEtiquettes || ETIQUETTES_DEPART).slice();
  const out = rangees.slice();
  vues.forEach(e => { if(out.indexOf(e) === -1) out.push(e); });
  return out;
}

/* ============================================================
   L'ORDRE DES FICHES — CELUI DE CHACUN

   David : « je dois aussi pouvoir changer l'ordre des fiches à
   l'intérieur des catégories par un cliquer-glisser, et que cet
   ordre soit valable par utilisateur ».

   ⚠️ UN SEUL ORDRE PAR PERSONNE, PAS UN PAR ÉTIQUETTE. Une fiche
   porte plusieurs étiquettes : un rangement par étiquette lui
   donnerait plusieurs places à la fois, et la même fiche déplacée
   dans un carnet n'aurait pas bougé dans l'autre — impossible à
   comprendre, et deux listes à tenir d'accord. Avec un ordre
   unique, filtrer un carnet garde l'ordre relatif : ranger à
   l'intérieur d'une étiquette marche exactement comme il le
   demande, et le résultat est le même partout.

   Il vit dans les réglages partagés, sous le nom de la personne —
   la même clé que « Mes tuiles ». Ce n'est pas l'ordre de l'école,
   c'est le sien.
   ============================================================ */
function cleOrdreFiches(){
  const nom = (typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur)
    ? String(ACCES.moniteur) : '';
  const simple = nom.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim();
  return simple ? 'fiches:' + simple : '';
}

let ordreFiches = null;

function decouperIds(txt){
  return String(txt || '').split('|')
    .map(x => x.trim()).filter(Boolean)
    .filter((x, i, t) => t.indexOf(x) === i);
}

async function chargerOrdreFiches(){
  if(ordreFiches) return ordreFiches;
  const cle = cleOrdreFiches();
  if(!cle || typeof chargerReglagesPartages !== 'function'){
    ordreFiches = [];
    return ordreFiches;
  }
  try{
    const r = await chargerReglagesPartages(false);
    ordreFiches = decouperIds(r[cle]);
  }catch(e){ ordreFiches = []; }
  return ordreFiches;
}

async function enregistrerOrdreFiches(liste){
  ordreFiches = liste.slice();
  const cle = cleOrdreFiches();
  if(!cle || typeof ecrireReglagePartage !== 'function') return;
  await ecrireReglagePartage(cle, liste.join('|'));
}

/* Les fiches rangées : celles qu'on a placées d'abord, dans l'ordre
   voulu ; les autres derrière, par titre. Une fiche neuve ne va donc
   pas se perdre au milieu, et une fiche supprimée ne laisse pas de
   trou. */
function fichesRangees(liste){
  const rang = {};
  (ordreFiches || []).forEach((id, i) => { rang[id] = i; });

  return liste.slice().sort((a, b) => {
    const ra = rang[a.id], rb = rang[b.id];
    if(ra !== undefined && rb !== undefined) return ra - rb;
    if(ra !== undefined) return -1;
    if(rb !== undefined) return 1;
    return String(a.titre || a.nom).localeCompare(String(b.titre || b.nom), 'fr');
  });
}

/* ⚠️ ON RANGE SUR LA LISTE ENTIÈRE, PAS SUR CE QUI EST AFFICHÉ.

   Déplacer une fiche pendant qu'une recherche cache les trois
   quarts des autres ne doit pas effacer leur place : ce qui est
   masqué n'a pas déménagé. On part donc de toutes les fiches,
   rangées comme elles le sont, et on n'y bouge que celle qu'on
   tient. */
async function bougerFiche(id, devant, apres){
  if(!id || !devant || id === devant) return;

  const tout = fichesRangees(modelesTexte || []).map(m => m.id);
  const de = tout.indexOf(id), vers = tout.indexOf(devant);
  if(de === -1 || vers === -1 || de === vers) return;

  const [pris] = tout.splice(de, 1);
  /* ⚠️ AVANT OU APRÈS, SELON OÙ ON LÂCHE — v961. On posait toujours
     AVANT la carte visée : impossible de mettre une fiche en
     dernier, il n'y avait aucune carte derrière laquelle viser. Et
     sur trois colonnes, « avant » veut dire une ligne plus haut,
     ce qui n'est pas ce qu'on croit faire. La position du doigt
     tranche : première moitié de la carte, on passe devant ;
     seconde moitié, on passe derrière. */
  const ou = tout.indexOf(devant);
  tout.splice(apres ? ou + 1 : ou, 0, pris);

  ordreFiches = tout;
  dessinerListeFiches();
  try{
    await enregistrerOrdreFiches(tout);
  }catch(e){ showToast('Ordre non enregistré : ' + e.message); }
}

/* Le voisin dans ce qui est AFFICHÉ : les flèches du téléphone
   doivent déplacer d'un cran visible, pas d'un cran invisible. */
async function glisserFicheDUnCran(m, sens){
  const vues = fichesAffichees().map(x => x.id);
  const i = vues.indexOf(m.id);
  const j = i + sens;
  if(i === -1 || j < 0 || j >= vues.length) return;
  /* ⚠️ DESCENDRE, C'EST PASSER DERRIÈRE LE VOISIN — v961. Sans ce
     « après », la flèche ↓ posait la fiche DEVANT celui d'en
     dessous, c'est-à-dire exactement là où elle était déjà : le
     bouton ne faisait rien, et rien ne le disait. */
  await bougerFiche(m.id, vues[j], sens > 0);
}


/* ============================================================
   CHERCHER PARTOUT

   David : « une barre de recherche qui cherche partout ». Le titre,
   le texte ET les étiquettes — sans accents ni majuscules, sinon
   « eval » ne trouverait pas « ÉVAL ». Plusieurs mots se cumulent :
   « inscription simu » ne garde que les fiches qui portent les deux.
   ============================================================ */
function sansAccents(s){
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function fichePorte(m, mots){
  if(!mots.length) return true;
  const foin = sansAccents((m.titre || m.nom) + ' ' + (m.contenu || '') + ' ' +
                           etiquettesDe(m).join(' ') + ' ' + nomUsage(m.usage));
  return mots.every(mot => foin.indexOf(mot) !== -1);
}

/* Ce qui correspond, surligné dans l'aperçu : on doit voir POURQUOI
   une fiche est là. */
function surligner(texte, mots){
  const brut = String(texte || '');
  if(!mots.length) return brut.replace(/</g, '&lt;');

  const sans = sansAccents(brut);
  const marques = [];
  mots.forEach(mot => {
    let i = sans.indexOf(mot);
    while(i !== -1){ marques.push([i, i + mot.length]); i = sans.indexOf(mot, i + 1); }
  });
  if(!marques.length) return brut.replace(/</g, '&lt;');

  marques.sort((a, b) => a[0] - b[0]);
  let out = '', fin = 0;
  marques.forEach(([d, f]) => {
    if(d < fin) return;
    out += brut.slice(fin, d).replace(/</g, '&lt;') +
           '<mark>' + brut.slice(d, f).replace(/</g, '&lt;') + '</mark>';
    fin = f;
  });
  return out + brut.slice(fin).replace(/</g, '&lt;');
}


/* L'étiquette choisie et la recherche en cours : elles survivent au
   redessin, sinon chaque modification renverrait tout en haut. */
let etiquetteChoisie = '';
let rechercheFiches = '';


/* ============================================================
   COPIER — TOUT, OU CE QU'ON VEUT

   David : « la copie de ce que l'on veut, pas par paragraphe ». On
   ouvre donc le texte, on sélectionne ce qu'on veut à la main, et
   un bouton copie la sélection. Sur un téléphone, la sélection se
   fait avec les poignées du système : c'est le seul geste qui
   marche partout, et il n'impose aucune découpe au texte.
   ============================================================ */
async function copierDansLePressePapier(txt){
  try{
    await navigator.clipboard.writeText(txt);
    return true;
  }catch(e){
    /* Les navigateurs anciens, et les pages non sécurisées. */
    try{
      const z = document.createElement('textarea');
      z.value = txt;
      z.style.cssText = 'position:fixed;left:-9999px;';
      document.body.appendChild(z);
      z.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(z);
      return ok;
    }catch(e2){ return false; }
  }
}

function ouvrirCopieMorceau(m){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(640px, 94vw);max-height:88vh;overflow-y:auto;';
  fond.appendChild(boite);
  fond.addEventListener('click', e => { if(e.target === fond) fermerFond(fond); });

  boite.insertAdjacentHTML('beforeend',
    '<h3>✂️ ' + (m.titre || m.nom).replace(/</g, '&lt;') + '</h3>' +
    '<div style="font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:10px;">' +
      'Sélectionne ce que tu veux — un mot, une phrase, trois paragraphes — ' +
      'puis appuie sur <strong>Copier la sélection</strong>. Sans rien ' +
      'sélectionner, c’est toute la fiche qui part.</div>');

  const txt = document.createElement('div');
  txt.style.cssText = 'white-space:pre-wrap;font-size:14px;line-height:1.6;' +
    'border:1px solid var(--line);border-radius:10px;padding:12px;' +
    'background:var(--navy);user-select:text;-webkit-user-select:text;';
  txt.textContent = m.contenu || '';
  boite.appendChild(txt);

  const pied = document.createElement('div');
  pied.style.cssText = 'display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;';

  const bSel = document.createElement('button');
  bSel.className = 'btn btn-primary';
  bSel.style.cssText = 'flex:1;min-width:150px;padding:10px;font-size:13px;margin:0;';
  bSel.textContent = '📋 Copier la sélection';
  bSel.addEventListener('click', async () => {
    const sel = String(window.getSelection ? window.getSelection().toString() : '').trim();
    const quoi = sel || (m.contenu || '');
    const ok = await copierDansLePressePapier(quoi);
    showToast(ok ? (sel ? 'Morceau copié ✅' : 'Fiche entière copiée ✅')
                 : 'Copie impossible sur cet appareil');
    if(ok) fermerFond(fond);
  });
  pied.appendChild(bSel);

  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary';
  bF.style.cssText = 'width:auto;padding:10px 14px;font-size:13px;margin:0;';
  bF.textContent = 'Fermer';
  bF.addEventListener('click', () => fermerFond(fond));
  pied.appendChild(bF);

  boite.appendChild(pied);
  document.body.appendChild(fond);
}


/* ============================================================
   ENVOYER UNE FICHE PAR MAIL

   Un seul destinataire pour commencer — « un seul », a répondu
   David. Les variables se remplissent comme partout ailleurs :
   appliquerModele est la seule fonction qui sache le faire, et
   elle n'est pas recopiée ici.
   ============================================================ */
/* ⚠️ UNE ADRESSE SE TAPE AUSSI À LA MAIN — v959.

   David : « dans l'envoi par mail il faut qu'on puisse taper une
   adresse mail à la main aussi ».

   Avant, il fallait d'abord DÉSIGNER UN ÉLÈVE : l'adresse n'était
   qu'une conséquence de sa fiche. Un accompagnateur, un financeur,
   un parent, un collègue — personne d'autre qu'un élève inscrit ne
   pouvait recevoir une fiche.

   Une seule fenêtre, donc, avec les deux : l'adresse, toujours
   visible et toujours modifiable, et un bouton qui va la chercher
   dans la fiche d'un élève quand c'en est un. Le prénom vient avec,
   parce que c'est lui qui remplit {prenom} — et une adresse tapée
   à la main sans prénom enverrait « Bonjour , ». */
function choisirDestinataireMail(titre, propose){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(460px, 94vw);';
    fond.appendChild(boite);

    boite.insertAdjacentHTML('beforeend',
      '<h3>' + String(titre || '✉️ Envoyer').replace(/</g, '&lt;') + '</h3>' +
      '<div style="font-size:13px;color:var(--muted);line-height:1.5;' +
        'margin-bottom:12px;">Tape l’adresse, ou reprends celle d’un élève.' +
      '</div>' +
      '<label for="dmAdresse">Adresse du destinataire</label>' +
      /* ⚠️ LARGEUR POSÉE ICI : la feuille de style habille les
         champs texte, pas les champs « email » — celui-ci repartait
         à la largeur du navigateur, deux fois plus étroit que celui
         du dessous. */
      '<input type="email" id="dmAdresse" autocomplete="off" ' +
        'style="width:100%;" placeholder="prenom.nom@exemple.fr">' +
      '<label for="dmNom">Son prénom ou son nom <span style="opacity:.6;' +
        'text-transform:none;font-weight:400;">— remplit {prenom} et ' +
        '{eleve}</span></label>' +
      '<input type="text" id="dmNom" autocomplete="off" ' +
        'placeholder="Facultatif">');

    const g = id => boite.querySelector('#' + id);
    if(propose) g('dmNom').value = String(propose);

    const bEleve = document.createElement('button');
    bEleve.type = 'button';
    bEleve.className = 'btn btn-secondary';
    bEleve.style.cssText = 'width:100%;padding:9px;font-size:13px;margin:0 0 12px;';
    bEleve.textContent = '📇 Reprendre l’adresse d’un élève';
    bEleve.addEventListener('click', async () => {
      if(typeof choisirEleveConnu !== 'function'){
        showToast('La liste des élèves n’est pas chargée.');
        return;
      }
      const nom = await choisirEleveConnu('📇 Quel élève ?',
        'Son adresse est reprise de sa fiche.', g('dmNom').value.trim());
      if(!nom) return;
      g('dmNom').value = nom;
      const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
      const mail = (f && f.email) || '';
      if(mail) g('dmAdresse').value = mail;
      else showToast('Aucune adresse dans la fiche de ' + nom + ' — tape-la.');
      g('dmAdresse').focus();
    });
    boite.appendChild(bEleve);

    const msg = document.createElement('div');
    msg.style.cssText = 'font-size:13px;min-height:16px;margin-bottom:4px;';
    boite.appendChild(msg);

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';
    const bAnn = document.createElement('button');
    bAnn.className = 'btn btn-secondary';
    bAnn.textContent = 'Annuler';
    bAnn.addEventListener('click', () => { fermerFond(fond); resolve(null); });
    const bOk = document.createElement('button');
    bOk.className = 'btn btn-primary';
    bOk.textContent = '✉️ Continuer';
    rangee.appendChild(bAnn); rangee.appendChild(bOk);
    boite.appendChild(rangee);

    bOk.addEventListener('click', () => {
      const adresse = g('dmAdresse').value.trim();
      /* ⚠️ ON REGARDE L'ADRESSE AVANT DE PARTIR. Une faute de frappe
         part sans erreur visible et n'arrive jamais : c'est le
         genre de message dont on découvre trois jours plus tard
         qu'il n'a pas été reçu. */
      if(!/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(adresse)){
        msg.style.color = 'var(--warn-text)';
        msg.textContent = adresse ? 'Cette adresse ne ressemble pas à une adresse.'
                                  : 'Il faut une adresse.';
        g('dmAdresse').focus();
        return;
      }
      fermerFond(fond);
      resolve({ adresse: adresse, nom: g('dmNom').value.trim() });
    });

    fond.addEventListener('click', e => {
      if(e.target === fond){ fermerFond(fond); resolve(null); }
    });

    document.body.appendChild(fond);
    setTimeout(() => g('dmAdresse').focus(), 60);
  });
}

async function envoyerFicheParMail(m){
  const qui = await choisirDestinataireMail(
    '✉️ Envoyer « ' + (m.titre || m.nom) + ' »');
  if(!qui) return;

  const nom = qui.nom;

  /* Le texte, variables remplacées : {prenom}, {eleve}, {date}… */
  const texte = (typeof appliquerModele === 'function')
    ? appliquerModele(m.contenu || '', {
        eleve: nom,
        prenom: String(nom).split(' ')[0],
        date: (typeof dateEnToutesLettres === 'function' &&
               typeof todayLocal === 'function')
          ? dateEnToutesLettres(todayLocal()) : ''
      })
    : (m.contenu || '');

  /* ⚠️ UN « Bonjour , » NE PART PAS SANS QU'ON L'AIT VOULU. Le
     prénom est facultatif : il faut donc le dire quand le texte en
     réclame un et qu'il n'y en a pas. */
  if(!nom && /\{(prenom|eleve)\}/.test(m.contenu || '')){
    if(!await confirmer('Ce texte attend un prénom, et tu n’en as pas mis : ' +
        'le message partira avec un blanc à la place.\n\nEnvoyer quand même ?')){
      return;
    }
  }

  /* L'objet : la porte commune de saisie, pas une fenêtre de plus. */
  const sujet = await demander('Objet du message — ce que le destinataire ' +
    'verra comme titre.', (m.titre || m.nom), '✉️ Envoyer la fiche');
  if(sujet === null) return;

  try{
    await appelPrep({ action: 'mailBilan', to: [qui.adresse],
                      sujet: sujet || (m.titre || m.nom), texte: texte });
    showToast('Envoyé à ' + qui.adresse + ' ✅');
  }catch(e){
    showToast('Impossible : ' + e.message);
  }
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */
async function afficherModelesTexte(){
  const zone = $('textesZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Chargement des fiches…</div>';
  await Promise.all([chargerModelesTexte(), chargerOrdreEtiquettes(),
                     chargerOrdreFiches(), chargerAccesCategories()]);
  dessinerBibliotheque();
}

function dessinerBibliotheque(){
  const zone = $('textesZone');
  if(!zone) return;
  zone.innerHTML = '';

  /* ---- La barre du haut : chercher, créer ---- */
  const barre = document.createElement('div');
  barre.className = 'biblioBarre';

  const champ = document.createElement('input');
  champ.type = 'search';
  champ.placeholder = '🔎 Chercher dans ' + modelesTexte.length + ' fiche' +
    (modelesTexte.length > 1 ? 's' : '') + '…';
  champ.value = rechercheFiches;
  /* ⚠️ SA LARGEUR EST DANS LA FEUILLE DE STYLE, PAS ICI — v958. Une
     largeur écrite sur l'élément gagne contre la règle du téléphone,
     et le bouton d'import se retrouvait seul sur une ligne. */
  champ.addEventListener('input', () => {
    rechercheFiches = champ.value;
    dessinerListeFiches();
  });
  barre.appendChild(champ);

  const bNouveau = document.createElement('button');
  bNouveau.className = 'btn btn-primary';
  bNouveau.style.cssText = 'width:auto;padding:9px 14px;font-size:13px;margin:0;';
  bNouveau.textContent = '➕ Nouvelle fiche';
  bNouveau.addEventListener('click', () => ouvrirEditeurModele(null));
  barre.appendChild(bNouveau);

  const bImport = document.createElement('button');
  bImport.className = 'btn btn-secondary';
  bImport.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;margin:0;';
  bImport.textContent = '📥';
  bImport.title = 'Coller plusieurs fiches d’un coup';
  bImport.addEventListener('click', ouvrirImportModeles);
  barre.appendChild(bImport);

  /* ⚙️ Qui voit quelle catégorie — réservé aux administrateurs :
     eux seuls peuvent lire la liste des comptes, et eux seuls ont à
     décider de ce que voient les autres. */
  if(jeVoisToutLePrive()){
    const bReg = document.createElement('button');
    bReg.className = 'btn btn-secondary';
    bReg.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;margin:0;';
    bReg.textContent = '⚙️';
    bReg.title = 'Qui voit quelle catégorie';
    bReg.addEventListener('click', ouvrirQuiVoitQuoi);
    barre.appendChild(bReg);
  }

  zone.appendChild(barre);

  /* ---- Le corps : les étiquettes, puis les fiches ---- */
  const corps = document.createElement('div');
  corps.className = 'biblioCorps';
  corps.innerHTML = '<div class="biblioEtiq"></div><div class="biblioFiches"></div>';
  zone.appendChild(corps);

  dessinerRailEtiquettes();
  dessinerListeFiches();
}

/* ⚠️ LE RAIL SE RANGE À LA SOURIS — et les flèches restent pour le
   téléphone, où glisser déplacerait la page. Même règle que pour
   les tuiles : deux façons d'y toucher, un seul rangement. */
function dessinerRailEtiquettes(){
  const rail = document.querySelector('#textesZone .biblioEtiq');
  if(!rail) return;
  rail.innerHTML = '';

  /* Les mêmes fiches que la liste : sinon le rail annonce douze
     fiches dans un carnet qui en montre neuf. */
  const vues = fichesVisibles();
  const compte = e => vues.filter(m => categoriesDe(m).indexOf(e) !== -1).length;
  const sans = vues.filter(m => !categoriesDe(m).length).length;
  const prives = vues.filter(m => proprietairePrive(m)).length;

  const ligne = (cle, nom, n, rangeable) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'etqLigne' + (etiquetteChoisie === cle ? ' on' : '');
    b.innerHTML = '<span class="nom">' + nom.replace(/</g, '&lt;') + '</span>' +
                  '<span class="n">' + n + '</span>';
    b.addEventListener('click', () => {
      etiquetteChoisie = (etiquetteChoisie === cle) ? '' : cle;
      dessinerRailEtiquettes();
      dessinerListeFiches();
    });
    /* ⚠️ LE CRAYON EST DANS LA LIGNE, PAS DERRIÈRE UN GESTE CACHÉ.
       Un clic long ou un clic droit ne s'invente pas, et ne marche
       pas pareil sur téléphone. */
    if(rangeable){
      const cr = document.createElement('span');
      cr.className = 'etqCrayon';
      cr.textContent = '✏️';
      cr.title = 'Renommer ou supprimer cette catégorie';
      cr.addEventListener('click', e => {
        e.stopPropagation();
        ouvrirCategorie(cle);
      });
      b.appendChild(cr);

      b.draggable = true;
      b.dataset.etq = cle;
      b.addEventListener('dragstart', e => {
        glisseEtq = cle; b.classList.add('prise');
        try{ e.dataTransfer.effectAllowed = 'move'; }catch(err){}
      });
      b.addEventListener('dragend', () => {
        glisseEtq = '';
        rail.querySelectorAll('.etqLigne').forEach(x =>
          x.classList.remove('prise', 'cible'));
      });
      b.addEventListener('dragover', e => {
        if(!glisseEtq || glisseEtq === cle) return;
        e.preventDefault(); b.classList.add('cible');
      });
      b.addEventListener('dragleave', () => b.classList.remove('cible'));
      b.addEventListener('drop', async e => {
        e.preventDefault(); b.classList.remove('cible');
        if(!glisseEtq || glisseEtq === cle) return;
        await rangerEtiquette(glisseEtq, cle);
      });
    }
    rail.appendChild(b);
    return b;
  };

  ligne('', '🏷️ Toutes', vues.length, false);

  /* ⚠️ LE PRIVÉ EST TOUJOURS LÀ, MÊME VIDE — c'est un endroit où
     poser quelque chose, pas un compte à afficher. Une catégorie
     qui n'apparaît qu'une fois remplie ne se remplit jamais. */
  ligne('*prive*',
        jeVoisToutLePrive() ? '🔒 Privé (tout le monde)' : '🔒 Mon privé',
        prives, false);

  toutesLesEtiquettes().filter(jeVoisLaCategorie)
    .forEach(e => ligne(e, e, compte(e), true));

  /* ⚠️ « SANS CATÉGORIE » NE SE SUPPRIME PAS ET NE SE RANGE PAS —
     David : « faire une catégorie qu'on ne peut pas supprimer, avec
     comme nom sans catégorie ». C'est là que tombent les fiches
     d'une catégorie qu'on efface. Elle n'existe pas dans le
     classeur : elle est le fait de n'en avoir aucune, ce qui est
     précisément ce qui la rend indestructible. */
  ligne('*sans*', '📭 Sans catégorie', sans, false);
}

let glisseEtq = '';

/* Les comptes de l'école, lus une fois : c'est la porte
   d'administration qui les connaît, et elle n'est ouverte qu'aux
   administrateurs — les seuls qui règlent cet écran. */
let comptesConnus = null;

async function chargerComptes(){
  if(comptesConnus) return comptesConnus;
  comptesConnus = [];
  if(typeof appelAdmin !== 'function') return comptesConnus;
  try{
    const d = await appelAdmin({ action: 'list' });
    comptesConnus = (d.utilisateurs || []).map(u => u.nom).filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'fr'));
  }catch(e){ comptesConnus = []; }
  return comptesConnus;
}

/* ============================================================
   ⚙️ QUI VOIT QUELLE CATÉGORIE — LE PANNEAU DES ADMINISTRATEURS

   David : « pour les admins, en haut, tu mets sous une roue
   crantée, comme ça on choisit directement ici, par catégorie, qui
   voit quelle catégorie ».

   Un seul écran pour toute la table : régler carnet par carnet,
   depuis chaque carnet, obligerait à en ouvrir douze pour savoir
   qui voit quoi — et c'est justement la question qu'on se pose en
   arrivant ici.
   ============================================================ */
async function ouvrirQuiVoitQuoi(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(620px, 96vw);max-height:90vh;overflow-y:auto;';
  fond.appendChild(boite);

  boite.insertAdjacentHTML('beforeend',
    '<h3>⚙️ Qui voit quelle catégorie</h3>' +
    '<div style="font-size:13px;color:var(--muted);line-height:1.5;' +
      'margin-bottom:14px;">Personne de coché = <strong>tout le monde ' +
      'la voit</strong>. Coche des noms pour la réserver à ces ' +
      'personnes-là. Les administrateurs voient tout, dans tous les ' +
      'cas.</div>');

  const zone = document.createElement('div');
  zone.textContent = 'Chargement des comptes…';
  zone.style.cssText = 'font-size:13px;color:var(--muted);';
  boite.appendChild(zone);

  const rangee = document.createElement('div');
  rangee.className = 'btn-row';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => fermerFond(fond));
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '💾 Enregistrer';
  rangee.appendChild(bAnn); rangee.appendChild(bOk);
  boite.appendChild(rangee);

  document.body.appendChild(fond);

  const gens = await chargerComptes();
  /* Une table de travail : on ne touche à la vraie qu'au moment
     d'enregistrer, sinon annuler ne voudrait plus rien dire. */
  const table = JSON.parse(JSON.stringify(accesCategories || {}));

  zone.textContent = '';
  if(!gens.length){
    zone.textContent = 'Impossible de lire la liste des comptes. ' +
      'Cette fenêtre est réservée aux administrateurs.';
    return;
  }

  toutesLesEtiquettes().forEach(cat => {
    const bloc = document.createElement('div');
    bloc.style.cssText = 'border-top:1px solid var(--line);padding:10px 0;';

    const t = document.createElement('div');
    t.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:6px;';
    bloc.appendChild(t);

    const chips = document.createElement('div');
    chips.className = 'mdEtiq';
    bloc.appendChild(chips);

    const majTitre = () => {
      const l = table[cat] || [];
      t.textContent = cat + ' — ' + (l.length
        ? l.join(', ')
        : 'tout le monde');
    };

    gens.forEach(nom => {
      const b = document.createElement('button');
      b.type = 'button';
      const dedans = () => (table[cat] || []).indexOf(nom) !== -1;
      const peindre = () => { b.className = 'mdEtq' + (dedans() ? ' on' : ''); };
      b.textContent = nom;
      peindre();
      b.addEventListener('click', () => {
        const l = (table[cat] || []).slice();
        const i = l.indexOf(nom);
        if(i === -1) l.push(nom); else l.splice(i, 1);
        /* Une liste vide, c'est « tout le monde » : on retire la
           clé plutôt que de garder un tableau vide qui voudrait
           dire la même chose sous une autre forme. */
        if(l.length) table[cat] = l; else delete table[cat];
        peindre();
        majTitre();
      });
      chips.appendChild(b);
    });

    majTitre();
    zone.appendChild(bloc);
  });

  bOk.addEventListener('click', async () => {
    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      await enregistrerAccesCategories(table);
      fermerFond(fond);
      showToast('Enregistré ✅');
      dessinerRailEtiquettes();
      dessinerListeFiches();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
      bOk.textContent = '💾 Enregistrer';
    }
  });
}

/* ============================================================
   UNE CATÉGORIE : LA RENOMMER, OU LA SUPPRIMER

   David : « je ne peux pas supprimer de catégorie ! et si elle a
   des fiches à l'intérieur, faire une catégorie qu'on ne peut pas
   supprimer avec comme nom sans catégorie ».

   ⚠️ SUPPRIMER UNE CATÉGORIE NE SUPPRIME AUCUNE FICHE. Elle n'a
   jamais été qu'un mot écrit sur des fiches : on l'efface de
   celles qui le portent, et elles tombent dans « 📭 Sans
   catégorie » — qui n'existe pas dans le classeur, qui est le fait
   de n'en avoir aucune, et qui est donc indestructible par
   construction.
   ============================================================ */
function ouvrirCategorie(cat){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(460px, 94vw);';
  fond.appendChild(boite);
  fond.addEventListener('click', e => { if(e.target === fond) fermerFond(fond); });

  const dedans = (modelesTexte || [])
    .filter(m => categoriesDe(m).indexOf(cat) !== -1).length;

  boite.insertAdjacentHTML('beforeend',
    '<h3>🏷️ ' + cat.replace(/</g, '&lt;') + '</h3>' +
    '<div style="font-size:13px;color:var(--muted);line-height:1.5;' +
      'margin-bottom:12px;">' + (dedans
        ? dedans + ' fiche' + (dedans > 1 ? 's' : '') + ' dans cette catégorie.'
        : 'Aucune fiche dans cette catégorie.') + '</div>' +
    '<label for="catNom">Nom de la catégorie</label>' +
    '<input type="text" id="catNom" style="width:100%;">');

  const g = id => boite.querySelector('#' + id);
  g('catNom').value = cat;

  const msg = document.createElement('div');
  msg.style.cssText = 'font-size:13px;min-height:16px;margin-bottom:4px;';
  boite.appendChild(msg);

  const rangee = document.createElement('div');
  rangee.className = 'btn-row';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => fermerFond(fond));
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '✓ Renommer';
  rangee.appendChild(bAnn); rangee.appendChild(bOk);
  boite.appendChild(rangee);

  bOk.addEventListener('click', async () => {
    const neuf = g('catNom').value.trim();
    if(!neuf || neuf === cat){ fermerFond(fond); return; }
    if(neuf.indexOf('·') !== -1){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Le « · » sépare les catégories : il ne peut pas être dans un nom.';
      return;
    }
    bOk.disabled = true;
    bOk.textContent = 'Renommage…';
    fermerFond(fond);
    await renommerEtiquette(cat, neuf);
  });

  /* Discret, en bas, à part : c'est le seul geste qu'on ne
     rattrape pas. Même règle que la suppression d'une fiche. */
  const pied = document.createElement('div');
  pied.style.cssText = 'margin-top:14px;padding-top:10px;' +
    'border-top:1px solid var(--line);';
  const bSup = document.createElement('button');
  bSup.type = 'button';
  bSup.className = 'fgb sup fgPetit';
  bSup.style.marginLeft = '0';
  bSup.textContent = '✕ Supprimer la catégorie';
  bSup.addEventListener('click', async () => {
    const quoi = dedans
      ? 'Supprimer la catégorie « ' + cat + ' » ?\n\nSes ' + dedans +
        ' fiche' + (dedans > 1 ? 's' : '') + ' ne ' +
        (dedans > 1 ? 'sont' : 'est') + ' pas supprimée' +
        (dedans > 1 ? 's' : '') + ' : ' + (dedans > 1 ? 'elles passent' : 'elle passe') +
        ' dans « 📭 Sans catégorie ».'
      : 'Supprimer la catégorie « ' + cat + ' » ?';
    if(!await confirmer(quoi)) return;
    bSup.disabled = true;
    fermerFond(fond);
    await supprimerEtiquette(cat);
  });
  pied.appendChild(bSup);
  boite.appendChild(pied);

  document.body.appendChild(fond);
  setTimeout(() => g('catNom').focus(), 60);
}

/* ============================================================
   RENOMMER UNE ÉTIQUETTE

   David : « je peux pas renommer une catégorie, il faut que ce
   soit possible ».

   ⚠️ UNE ÉTIQUETTE N'EXISTE NULLE PART EN PROPRE : elle n'est que
   le mot écrit sur les fiches qui la portent. La renommer, c'est
   donc réécrire ces fiches-là — et l'ordre rangé par-dessus. Une
   seule des deux, et l'ancien nom revient par l'autre bout à la
   première relecture.

   Les fiches qui ne la portent pas ne sont pas touchées : on ne
   réécrit que ce qui change.
   ============================================================ */
/* On déplace, on n'échange pas : glisser la dernière en tête ne
   doit pas envoyer la première tout en bas. */
async function rangerEtiquette(quoi, devant){
  const l = toutesLesEtiquettes();
  const de = l.indexOf(quoi), vers = l.indexOf(devant);
  if(de === -1 || vers === -1 || de === vers) return;
  const [pris] = l.splice(de, 1);
  l.splice(vers, 0, pris);
  dessinerRailEtiquettes();
  try{
    await enregistrerOrdreEtiquettes(l);
  }catch(e){ showToast('Ordre non enregistré : ' + e.message); }
}

/* ⚠️ « QUELLES FICHES SONT À L'ÉCRAN » NE S'ÉCRIT QU'ICI — v959.

   Le dessin le savait, les flèches de déplacement avaient besoin
   de le savoir aussi, et un second filtre aurait fini par ne plus
   dire la même chose que le premier. C'est le défaut de ce dossier
   depuis le début. */
function fichesAffichees(){
  const mots = sansAccents(rechercheFiches).split(/\s+/).filter(Boolean);
  let liste = fichesVisibles().filter(m => fichePorte(m, mots));
  if(etiquetteChoisie === '*prive*'){
    liste = liste.filter(m => proprietairePrive(m));
  }else if(etiquetteChoisie === '*sans*'){
    liste = liste.filter(m => !categoriesDe(m).length);
  }else if(etiquetteChoisie){
    liste = liste.filter(m => categoriesDe(m).indexOf(etiquetteChoisie) !== -1);
  }
  return fichesRangees(liste);
}

/* ⚠️ RENOMMER ET SUPPRIMER SONT LE MÊME GESTE — v961.

   Une catégorie n'existe nulle part en propre : elle n'est que le
   mot écrit sur les fiches qui la portent. La renommer, c'est
   réécrire ces fiches-là ; la supprimer, c'est réécrire les mêmes
   en retirant le mot. Deux fonctions auraient fini par ne plus
   traiter pareil les fiches d'avant les catégories, ou par oublier
   l'une des deux listes rangées.

   Les fiches qui ne la portent pas ne sont pas touchées : on ne
   réécrit que ce qui change. */
async function reecrireCategorie(ancien, neuf){
  const touchees = (modelesTexte || [])
    .filter(m => categoriesDe(m).indexOf(ancien) !== -1);

  /* L'ordre rangé d'abord : il se range même si aucune fiche ne la
     porte encore — une catégorie créée puis renommée avant usage.
     Et une seule des deux, c'est l'ancien nom qui revient par
     l'autre bout à la première relecture. */
  const ordre = toutesLesEtiquettes()
    .map(e => (e === ancien ? neuf : e))
    .filter(Boolean)
    .filter((e, i, l) => l.indexOf(e) === i);

  /* La table « qui voit quoi » suit le nom, sinon la restriction
     resterait accrochée à un carnet qui n'existe plus — et le
     nouveau serait ouvert à tous sans que personne l'ait décidé. */
  const acces = JSON.parse(JSON.stringify(accesCategories || {}));
  if(acces[ancien] !== undefined){
    if(neuf) acces[neuf] = acces[ancien];
    delete acces[ancien];
  }

  showToast((neuf ? 'Renommage… ' : 'Suppression… ') + touchees.length +
            ' fiche' + (touchees.length > 1 ? 's' : ''));

  let rates = 0;

  /* Quatre à la fois : une centaine de fiches à la queue leu leu se
     compterait en minutes, et toutes d'un coup noierait la porte. */
  for(let i = 0; i < touchees.length; i += 4){
    const paquet = touchees.slice(i, i + 4).map(async m => {
      const liste = etiquettesDe(m)
        .map(e => (e === ancien ? neuf : e))
        .filter(Boolean)
        .filter((e, k, l) => l.indexOf(e) === k);
      try{
        /* ⚠️ ON RENVOIE LA FICHE ENTIÈRE : « modeleSet » écrit la
           ligne complète, et un champ oublié s'effacerait dans le
           classeur. C'est pour ça que la charge utile s'écrit à un
           seul endroit — enregistrerModeleTexte. Le titre part sans
           son ancien préfixe de catégorie : elle est déjà dans la
           liste ci-dessus. */
        await enregistrerModeleTexte(
          Object.assign({}, m, { etiquettes: liste.join(SEP_ETIQ) }));
        poserModeleEnMemoire(Object.assign({}, m, {
          nom: m.titre || m.nom, etiquettes: liste.join(SEP_ETIQ), categorie: ''
        }));
      }catch(e){ rates++; }
    });
    await Promise.all(paquet);
  }

  try{ await enregistrerOrdreEtiquettes(ordre); }catch(e){ rates++; }
  try{ await enregistrerAccesCategories(acces); }catch(e){ rates++; }

  if(etiquetteChoisie === ancien) etiquetteChoisie = neuf || '';
  perimerModeles();
  dessinerRailEtiquettes();
  dessinerListeFiches();

  showToast(rates
    ? '⚠️ ' + (neuf ? 'Renommée' : 'Supprimée') + ', sauf ' + rates +
      ' fiche(s) — droit ou réseau'
    : (neuf ? '🏷️ Renommée sur ' : '🗑️ Retirée de ') + touchees.length +
      ' fiche' + (touchees.length > 1 ? 's' : ''));
}

async function renommerEtiquette(ancien, neuf){
  if(!neuf || neuf === ancien) return;
  await reecrireCategorie(ancien, neuf);
}

/* Les fiches ne sont pas supprimées : elles tombent dans
   « 📭 Sans catégorie ». */
async function supprimerEtiquette(cat){
  await reecrireCategorie(cat, '');
}

function dessinerListeFiches(){
  const zone = document.querySelector('#textesZone .biblioFiches');
  if(!zone) return;
  zone.innerHTML = '';

  const mots = sansAccents(rechercheFiches).split(/\s+/).filter(Boolean);
  const liste = fichesAffichees();

  if(!liste.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = (modelesTexte || []).length
      ? 'Aucune fiche ne correspond.'
      : 'Aucune fiche enregistrée.<br><span style="font-size:12px;">' +
        'Ajoute ici les messages que tu envoies souvent.</span>';
    zone.appendChild(v);
    return;
  }

  liste.forEach(m => zone.appendChild(carteDeFiche(m, mots)));
}

let glisseFiche = '';

/* ============================================================
   LA PALETTE — UNE SEULE À L'ÉCRAN, ET ELLE SE REFERME

   Comme dans Keep : la pastille 🎨 des gestes du bas la déplie
   sous la fiche. Huit couleurs, et un ✕ pour rendre la fiche à son
   fond d'origine — sans lui, une couleur posée par erreur ne se
   retire plus.

   ⚠️ ET LA FICHE SE PEINT AVANT QUE LE CLASSEUR RÉPONDE. Attendre
   l'aller-retour pour voir la couleur, c'est croire qu'on a raté
   son geste et appuyer une deuxième fois. Si l'écriture échoue,
   poserCouleurFiche rend la couleur d'avant et le dit.
   ============================================================ */
function fermerPalettes(sauf){
  document.querySelectorAll('#textesZone .palFiche').forEach(p => {
    if(p !== sauf) p.remove();
  });
}

function basculerPalette(carte, m, bouton){
  const ouverte = carte.querySelector('.palFiche');
  fermerPalettes();
  if(ouverte) return;

  const pal = document.createElement('div');
  pal.className = 'palFiche';

  const actuelle = couleurDeLaFiche(m);

  const pastille = (cle, nom) => {
    const s = document.createElement('button');
    s.type = 'button';
    /* « fgb » aussi : un clic sur la palette ne doit pas ouvrir la
       fiche — c'est la classe que le clic de la carte regarde. */
    s.className = 'fgb pastFiche' + (cle === actuelle ? ' choisie' : '');
    if(cle) s.dataset.couleur = cle;
    else s.textContent = '✕';
    s.title = nom;
    s.addEventListener('click', async () => {
      fermerPalettes();
      /* On peint tout de suite, on enregistre ensuite. */
      if(cle) carte.dataset.couleur = cle; else delete carte.dataset.couleur;
      try{ await poserCouleurFiche(m, cle); }
      catch(e){
        const revenue = couleurDeLaFiche(m);
        if(revenue) carte.dataset.couleur = revenue;
        else delete carte.dataset.couleur;
      }
    });
    return s;
  };

  pal.appendChild(pastille('', 'Aucune couleur'));
  COULEURS_FICHE.forEach(c => pal.appendChild(pastille(c.cle, c.nom)));

  carte.appendChild(pal);
  if(bouton && bouton.scrollIntoView){
    try{ pal.scrollIntoView({ block:'nearest' }); }catch(e){}
  }
}

function carteDeFiche(m, mots){
  const d = document.createElement('div');
  d.className = 'ficheTexte';
  /* La couleur est un NOM, pas une teinte : les seize valeurs —
     huit couleurs, deux thèmes — vivent dans la feuille de style. */
  const coul = couleurDeLaFiche(m);
  if(coul) d.dataset.couleur = coul;

  /* ⚠️ UN CLIC SUR LA CARTE OUVRE LA FICHE — v959. David : « je veux
     le texte en entier pour pouvoir changer directement dessus sans
     avoir forcément à appuyer sur le bouton crayon, il me faut la
     même chose que Keep ». Le crayon disparaît : c'était un geste de
     plus, cent fois par jour. Les autres gestes restent en bas de
     carte, et ils ne doivent pas ouvrir la fiche au passage. */
  d.tabIndex = 0;
  d.addEventListener('click', e => {
    if(e.target.closest('.fgb')) return;
    ouvrirEditeurModele(m);
  });
  d.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ouvrirEditeurModele(m); }
  });

  /* ⚠️ ON GLISSE LA CARTE, ET LES FLÈCHES RESTENT POUR LE TÉLÉPHONE
     — même règle que le rail des étiquettes et que « Mes tuiles » :
     glisser déplacerait la page sous le doigt. Deux façons d'y
     toucher, un seul rangement. */
  d.draggable = true;
  d.dataset.fiche = m.id;
  d.addEventListener('dragstart', e => {
    glisseFiche = m.id; d.classList.add('prise');
    try{ e.dataTransfer.effectAllowed = 'move'; }catch(err){}
  });
  d.addEventListener('dragend', () => {
    glisseFiche = '';
    document.querySelectorAll('#textesZone .ficheTexte')
      .forEach(x => x.classList.remove('prise', 'cible'));
  });
  /* De quel côté de la carte le doigt est-il ? Sur une seule
     colonne on regarde le haut et le bas, sur plusieurs la gauche
     et la droite — c'est là que se trouve le voisin suivant. */
  const apresLaCarte = e => {
    const r = d.getBoundingClientRect();
    const enColonne = (d.parentElement || {}).clientWidth < r.width * 1.6;
    return enColonne ? (e.clientY > r.top + r.height / 2)
                     : (e.clientX > r.left + r.width / 2);
  };

  d.addEventListener('dragover', e => {
    if(!glisseFiche || glisseFiche === m.id) return;
    e.preventDefault();
    d.classList.remove('cible', 'cibleApres');
    d.classList.add(apresLaCarte(e) ? 'cibleApres' : 'cible');
  });
  d.addEventListener('dragleave', () => d.classList.remove('cible', 'cibleApres'));
  d.addEventListener('drop', async e => {
    e.preventDefault();
    const apres = apresLaCarte(e);
    d.classList.remove('cible', 'cibleApres');
    if(!glisseFiche || glisseFiche === m.id) return;
    await bougerFiche(glisseFiche, m.id, apres);
  });

  const t = document.createElement('div');
  t.className = 'ft';
  t.innerHTML = surligner(m.titre || m.nom, mots);
  d.appendChild(t);

  const u = document.createElement('div');
  u.className = 'fu';
  u.textContent = nomUsage(m.usage) + (m.maj ? ' · ' + m.maj : '');
  d.appendChild(u);

  const p = document.createElement('div');
  p.className = 'fp';
  p.innerHTML = surligner(m.contenu || '', mots);
  d.appendChild(p);

  const etq = categoriesDe(m);
  const proprio = proprietairePrive(m);
  if(etq.length || proprio){
    const z = document.createElement('div');
    z.className = 'fe';
    /* ⚠️ LE CADENAS DIT À QUI. Un administrateur qui voit les fiches
       privées de son équipe doit savoir de qui elles sont : voir
       sans le savoir, ce n'est pas voir. */
    if(proprio){
      const c = document.createElement('span');
      c.className = 'fetq prive';
      c.textContent = cestMoi(proprio) ? '🔒 Privé' : '🔒 ' + proprio;
      z.appendChild(c);
    }
    etq.forEach(e => {
      const s = document.createElement('span');
      s.className = 'fetq';
      s.textContent = e;
      z.appendChild(s);
    });
    d.appendChild(z);
  }

  const g = document.createElement('div');
  g.className = 'fg';

  const geste = (txt, titre, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fgb';
    b.textContent = txt;
    b.title = titre;
    b.addEventListener('click', fn);
    g.appendChild(b);
    return b;
  };

  /* Les deux flèches ne s'affichent que sous 760 px : sur un
     ordinateur, on glisse. */
  const bHaut = geste('↑', 'Monter cette fiche',
                      () => glisserFicheDUnCran(m, -1));
  const bBas = geste('↓', 'Descendre cette fiche',
                     () => glisserFicheDUnCran(m, 1));
  bHaut.classList.add('fgTel');
  bBas.classList.add('fgTel');

  geste('📋', 'Copier toute la fiche', async () => {
    const ok = await copierDansLePressePapier(m.contenu || '');
    showToast(ok ? 'Fiche copiée ✅' : 'Copie impossible sur cet appareil');
  });
  geste('✂️', 'Copier un morceau', () => ouvrirCopieMorceau(m));
  geste('✉️', 'Envoyer par mail', () => envoyerFicheParMail(m));
  geste('🎨', 'Couleur de la fiche', ev => basculerPalette(d, m, ev.currentTarget));

  /* ⚠️ PAS DE SUPPRESSION SUR LA CARTE — v959. David : « enlève le
     bouton de suppression directement sur la fiche, en petit
     uniquement quand elle est ouverte, en bas ». Avec cent cartes
     serrées, une croix rouge à portée de pouce est une fiche perdue
     un jour ou l'autre ; ouverte, on sait ce qu'on supprime. */

  d.appendChild(g);
  return d;
}

/* ============================================================
   LA FICHE OUVERTE — ON ÉCRIT DEDANS, COMME DANS KEEP

   David, le 11 septembre : « je veux le texte en entier pour
   pouvoir changer directement dessus sans avoir forcément à
   appuyer sur le bouton crayon, il me faut la même chose que
   Keep ».

   Donc : un clic n'importe où sur la carte ouvre la fiche, le
   titre et le texte sont des champs qu'on modifie sur place, et
   fermer enregistre. Pas de bouton « Enregistrer » — il n'y en a
   pas dans Keep, et c'est un geste de moins cent fois par jour.

   ⚠️ ET C'EST LE MÊME ÉDITEUR QU'AVANT, PAS UN SECOND.

   La tentation était d'ajouter une « ouverture rapide » à côté de
   l'éditeur existant. Deux écrans pour une même fiche, c'est le
   péché de ce dossier : celui qu'on oublie de tenir à jour finit
   par écrire de travers. Les réglages techniques — l'usage, la
   boîte, les consignes de l'IA, le bilan — sont simplement rangés
   sous « ⚙️ Réglages », dépliés d'office là où ils comptent.
   ============================================================ */

/* ⚠️ LA FICHE PORTE SON NUMÉRO AVANT DE PARTIR — v959.

   Une fiche neuve partait sans numéro, et le classeur lui en
   fabriquait un À CHAQUE FOIS qu'il recevait la demande. Un appel
   renvoyé après un délai dépassé — ce qui arrivait tout le temps,
   l'écriture réveillant Apps Script — ajoutait donc une SECONDE
   ligne. C'est la règle déjà posée pour les liens de cours :
   reconnaître avant d'écrire. Ici on fait mieux, on donne le nom
   d'abord : une demande renvoyée se réécrit sur elle-même. */
function nouvelIdModele(){
  return 'm' + Date.now() + Math.floor(Math.random() * 1000);
}

/* Un texte dont l'application se sert toute seule. Les procédures
   en font partie : elles nourrissent la correction. */
function estTexteDeLAppli(m){
  const u = String((m || {}).usage || 'libre');
  return u !== '' && u !== 'libre';
}

function peutToucherAuxTextesDeLAppli(){
  if(typeof peutModifier !== 'function') return true;
  return peutModifier('textes_appli');
}

/* ------------------------------------------------------------
   CE QUI PART DANS LE MESSAGE — ET CE QUI N'Y ARRIVERA JAMAIS

   David : « ma crainte c'est que quelqu'un modifie un texte type
   qui sert aux rappels et casse les rappels ». Le droit ci-dessus
   dit QUI peut y toucher ; ces deux fonctions disent ce qui vient
   d'être cassé, à celui qui a le droit et qui se trompe quand
   même.

   Une variable retirée ne se voit nulle part : le rappel continue
   de partir, simplement sans le lien vers le bilan. On le dit
   AVANT d'enregistrer, en la nommant.
   ------------------------------------------------------------ */
function variablesDuTexte(t){
  return (String(t || '').match(/\{[^{}\s]+\}/g) || [])
    .filter((x, i, l) => l.indexOf(x) === i);
}

function variablesConnues(usage){
  const u = USAGES_MODELE.find(x => x.cle === usage);
  return u ? u.variables : [];
}

/* Rend la phrase à montrer, ou '' si rien à signaler. */
function alerteDesVariables(ancien, neuf, usage){
  const connues = variablesConnues(usage);
  const avant = variablesDuTexte(ancien);
  const apres = variablesDuTexte(neuf);

  const parties = [];

  /* Celles qui étaient là, qui comptent, et qui n'y sont plus. */
  const perdues = avant.filter(v => connues.indexOf(v) !== -1 &&
                                    apres.indexOf(v) === -1);
  if(perdues.length){
    parties.push('Tu as retiré ' + perdues.join(', ') + ' : ' +
      (perdues.length > 1 ? 'ces éléments ne seront plus remplis'
                          : 'cet élément ne sera plus rempli') +
      ' dans le message envoyé.');
  }

  /* Une variable inventée ou mal orthographiée part telle quelle :
     l'élève reçoit « {lein} » au milieu de sa phrase. On ne le dit
     que là où l'outil remplit lui-même — ailleurs, des accolades
     dans un texte sont un texte. */
  if(estTexteDeLAppli({ usage: usage })){
    const inconnues = apres.filter(v => connues.indexOf(v) === -1);
    if(inconnues.length){
      parties.push(inconnues.join(', ') +
        (inconnues.length > 1 ? ' ne correspondent à rien' : ' ne correspond à rien') +
        ' : ' + (inconnues.length > 1 ? 'ils partiront' : 'il partira') +
        ' tels quels dans le message.');
    }
  }

  return parties.join('\n\n');
}

/* ⚠️ APRÈS L'ENREGISTREMENT, ON NE RELIT PAS TOUT — v959.

   La liste est déjà en mémoire et on sait exactement ce qu'on
   vient d'écrire. Relire les cent fiches pour retrouver celle
   qu'on tenait dans la main, c'est un aller-retour de plus à
   chaque frappe d'Enregistrer. */
function poserModeleEnMemoire(f){
  const s = separerCategorie(f.nom);
  const plein = Object.assign({}, f, { categorie: s.categorie, titre: s.titre });
  const i = (modelesTexte || []).findIndex(x => String(x.id) === String(f.id));
  if(i === -1) modelesTexte.push(plein);
  else modelesTexte[i] = Object.assign({}, modelesTexte[i], plein);
  return plein;
}

function retirerModeleDeLaMemoire(id){
  const i = (modelesTexte || []).findIndex(x => String(x.id) === String(id));
  if(i !== -1) modelesTexte.splice(i, 1);
}


function ouvrirEditeurModele(modele, usageImpose){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal ficheOuverte';
  boite.style.cssText = 'max-width:min(640px, 96vw);max-height:92vh;overflow-y:auto;';

  /* Une fiche neuve est libre par construction : c'est le réglage
     d'usage qui la rendra technique, et il est verrouillé plus bas
     si la main qui la tient n'en a pas le droit. */
  const verrou = !peutToucherAuxTextesDeLAppli() &&
                 (estTexteDeLAppli(modele) || usageImpose === 'procedure');

  const ech = t => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  boite.insertAdjacentHTML('beforeend',
    (verrou
      ? '<div class="fiVerrou">🔒 Ce texte est utilisé par l’application. ' +
        'Tu peux le lire et le copier ; sa modification demande le droit ' +
        '« ⚙️ Textes de l’application ».</div>'
      : '') +

    '<input type="text" id="mdNom" class="fiTitre" ' +
      'placeholder="Titre de la fiche" value="' +
      ech(modele ? (modele.titre || modele.nom) : '') + '">' +

    '<textarea id="mdContenu" class="fiTexte" rows="12" ' +
      'placeholder="Écris ton message…"></textarea>' +

    /* ⚠️ DES ÉTIQUETTES, PAS UNE CATÉGORIE — v958. On coche celles
       qu'on veut, on en crée une en la tapant. Une fiche peut en
       porter plusieurs, et en changer sans être déplacée. */
    /* ⚠️ LE MOT EST CELUI DE DAVID — v961. Il dit « catégorie »
       depuis le premier jour ; l'écran disait « étiquette ». Deux
       mots pour une seule chose, et une consigne écrite avec l'un
       n'est pas suivie sur l'autre. */
    '<label>🏷️ Catégories</label>' +
    '<div id="mdEtiq" class="mdEtiq"></div>' +
    '<div style="display:flex;gap:6px;margin:-4px 0 12px;">' +
      '<input type="text" id="mdEtiqNeuve" style="flex:1;margin:0;" ' +
        'placeholder="Créer une catégorie…">' +
      '<button type="button" class="btn btn-secondary" id="mdEtiqAdd" ' +
        'style="width:auto;padding:0 14px;margin:0;font-size:13px;">➕</button>' +
    '</div>' +

    /* Les réglages techniques, rangés : on ne tombe plus dessus en
       venant corriger une faute de frappe. */
    '<details id="mdPlus" class="fiPlus">' +
    '<summary>⚙️ Réglages</summary>' +
    '<label for="mdUsage">Où sera-t-il utilisé ?</label>' +
    '<select id="mdUsage">' + optionsUsage(usageImpose) + '</select>' +
    '<div id="mdVars" style="font-size:12px;color:var(--muted);margin:-8px 0 12px;' +
      'line-height:1.6;"></div>' +

    /* Une procédure ne vaut pas pour toutes les formations : le
       point de patinage n'existe pas en automatique, et l'attelage
       ne concerne que la remorque. */
    '<div id="mdBlocBoite" style="display:none;">' +
      '<label for="mdBoite">Pour qui ?</label>' +
      '<select id="mdBoite">' +
        '<option value="">🚗 Voiture — BEA et BV</option>' +
        '<option value="bea">🚗 BEA seulement — boîte automatique</option>' +
        '<option value="bv">🚗 BV seulement — boîte manuelle</option>' +
        '<option value="BE">🚚 Remorque — permis BE</option>' +
      '</select>' +
      '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;' +
        'line-height:1.5;">Un élève en remorque ne voit que les ' +
        'procédures BE, et lui seul les voit.</div>' +
    '</div>' +

    /* Comment l'IA doit corriger CELLE-CI.

       Ces consignes ne peuvent pas vivre dans le texte au-dessus :
       ce texte est ce que l'élève apprend, et ce à quoi l'IA
       compare. Une ligne « à réciter dans l'ordre » glissée dedans
       serait lue par l'élève comme une étape de la procédure, et
       comparée comme telle. */
    '<div id="mdBlocIA" style="display:none;border:1px solid var(--line);' +
      'border-radius:12px;padding:12px;margin-bottom:12px;">' +
      '<div style="font-size:14px;font-weight:700;margin-bottom:3px;">' +
        '✨ Comment l\'IA doit corriger celle-ci</div>' +
      '<div style="font-size:11px;color:var(--muted);margin-bottom:10px;' +
        'line-height:1.5;">Vaut pour la correction automatique comme ' +
        'pour le bouton ✨. Laisse vide si rien de particulier.</div>' +

      '<label style="display:flex;align-items:flex-start;gap:9px;padding:4px 0;' +
        'font-size:14px;text-transform:none;margin:0 0 10px;font-weight:400;' +
        'cursor:pointer;color:var(--cream);">' +
        '<input type="checkbox" id="mdOrdre" ' +
          'style="width:18px;height:18px;flex-shrink:0;margin-top:2px;">' +
        '<span style="flex:1;min-width:0;">L\'ordre des étapes compte' +
          '<div style="font-size:11px;color:var(--muted);line-height:1.4;">' +
            'Une étape hors de sa place est comptée comme une erreur. ' +
            'Pour un déroulé ; pas pour un inventaire de vérifications.' +
          '</div></span>' +
      '</label>' +

      '<label for="mdConsigne">Autre consigne (facultatif)</label>' +
      '<textarea id="mdConsigne" rows="3" ' +
        'placeholder="Ex : exige les mots exacts du référentiel. ' +
          'Ou : ne pénalise pas le vocabulaire approximatif." ' +
        'style="width:100%;background:var(--navy);border:1px solid var(--line);' +
        'color:var(--cream);padding:10px 11px;border-radius:10px;font-size:14px;' +
        'line-height:1.5;font-family:inherit;resize:vertical;margin:0;"></textarea>' +
    '</div>' +

    /* ⚠️ CE MENU REMPLACE UNE DEVINETTE.

       Les types de séance des rappels sont ces textes-ci : l'outil
       n'en fournit aucun d'origine. Le bilan à créer était donc
       DEVINÉ d'après le titre écrit à la main — « Permis voiture »
       ne tombait dans aucune règle et repartait en conduite
       ordinaire, donc en BEA d'après la fiche. Signalé quinze fois,
       et chaque correction de la devinette en cassait une autre.

       Le titre ne décide plus. Le texte le DIT, une fois. */
    '<div id="mdBlocBilan" style="display:none;border:1px solid var(--line);' +
      'border-radius:12px;padding:12px;margin-bottom:12px;">' +
      '<div style="font-size:14px;font-weight:700;margin-bottom:3px;">' +
        '📄 Le bilan que ce rappel doit créer</div>' +
      '<div style="font-size:11px;color:var(--muted);margin-bottom:10px;' +
        'line-height:1.5;">Le cours ajouté à « Mes prochains cours » ' +
        'portera ce bilan-là. <strong>La boîte suit l\'élève</strong> : ' +
        'choisis la famille, l\'outil prend la version automatique ou ' +
        'manuelle selon sa fiche.</div>' +
      '<select id="mdBilan">' + optionsBilanDuRappel() + '</select>' +
      '<div style="font-size:11px;color:var(--muted);margin:-8px 0 0;' +
        'line-height:1.5;">Laissé sur « d\'après la fiche de l\'élève », ' +
        'c\'est sa formation qui décide — ce qu\'il faut pour une leçon de ' +
        'conduite ordinaire, et ce qu\'il ne faut pas pour un examen.' +
      '</div>' +
    '</div>' +
    '</details>');

  const g = id => boite.querySelector('#' + id);
  g('mdContenu').value = (modele && modele.contenu) || '';

  const msg = document.createElement('div');
  msg.style.cssText = 'margin-top:4px;font-size:13px;min-height:16px;';
  boite.appendChild(msg);

  /* ---- Les gestes, en pied de fiche ---- */
  const pied = document.createElement('div');
  pied.className = 'fiPied';
  boite.appendChild(pied);

  /* ---- L'état courant, tel qu'il partira ---- */
  let mesEtiquettes = modele ? etiquettesDe(modele) : [];

  const fichePleine = () => ({
    id: modele ? modele.id : idDeCetteFiche,
    usage: g('mdUsage').value,
    nom: g('mdNom').value.trim(),
    titre: g('mdNom').value.trim(),
    etiquettes: mesEtiquettes.join(SEP_ETIQ),
    boite: (g('mdUsage').value === 'procedure' && g('mdBoite'))
      ? g('mdBoite').value : '',
    ordre: (g('mdUsage').value === 'procedure' && g('mdOrdre'))
      ? g('mdOrdre').checked : false,
    consigne: (g('mdUsage').value === 'procedure' && g('mdConsigne'))
      ? g('mdConsigne').value.trim() : '',
    bilan: (g('mdUsage').value === 'rappel_cours' && g('mdBilan'))
      ? g('mdBilan').value : '',
    contenu: g('mdContenu').value.trim()
  });

  /* Le numéro est posé ICI, une fois, et ne change plus : c'est lui
     qui rend un appel renvoyé inoffensif. */
  const idDeCetteFiche = modele ? modele.id : nouvelIdModele();

  const geste = (txt, titre, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fgb';
    b.textContent = txt;
    b.title = titre;
    b.addEventListener('click', fn);
    pied.appendChild(b);
    return b;
  };

  if(modele){
    geste('📋', 'Copier toute la fiche', async () => {
      const ok = await copierDansLePressePapier(g('mdContenu').value);
      showToast(ok ? 'Fiche copiée ✅' : 'Copie impossible sur cet appareil');
    });
    geste('✂️', 'Copier un morceau', () => ouvrirCopieMorceau(fichePleine()));
    geste('✉️', 'Envoyer par mail', () => envoyerFicheParMail(fichePleine()));
    if(!verrou){
      const bSup = geste('✕ Supprimer', 'Supprimer cette fiche', async () => {
        if(!await confirmer('Supprimer la fiche « ' +
            (g('mdNom').value.trim() || 'sans titre') + ' » ?')) return;
        bSup.disabled = true;
        try{
          await appelPrep({ action: 'modeleDelete', id: modele.id,
                            usage: modele.usage || 'libre' });
          retirerModeleDeLaMemoire(modele.id);
          perimerModeles();
          fermerFond(fond);
          showToast('Fiche supprimée');
          redessiner();
        }catch(e){ showToast('Erreur : ' + e.message); bSup.disabled = false; }
      });
      /* Discret et à part : c'est le seul geste qu'on ne rattrape
         pas, il n'a rien à faire au milieu des autres. */
      bSup.classList.add('sup', 'fgPetit');
    }
  }

  const bFermer = document.createElement('button');
  bFermer.className = 'btn btn-primary';
  bFermer.style.cssText = 'width:auto;padding:8px 16px;font-size:13px;margin:0 0 0 auto;';
  bFermer.textContent = '✓ Fermer';
  pied.appendChild(bFermer);

  /* ---- Les blocs qui n'ont de sens que pour certains usages ---- */
  const majBoite = () => {
    const usage = g('mdUsage').value;
    const estProc = (usage === 'procedure');
    if(g('mdBlocBoite')) g('mdBlocBoite').style.display = estProc ? 'block' : 'none';
    if(g('mdBlocIA')) g('mdBlocIA').style.display = estProc ? 'block' : 'none';
    /* Le bilan à créer n'a de sens que pour un rappel de cours :
       c'est le seul usage qui fabrique un cours. */
    if(g('mdBlocBilan')){
      g('mdBlocBilan').style.display = (usage === 'rappel_cours') ? 'block' : 'none';
    }
  };
  g('mdUsage').addEventListener('change', majBoite);

  if(modele && modele.boite && g('mdBoite')) g('mdBoite').value = modele.boite;
  if(modele && g('mdOrdre')) g('mdOrdre').checked = !!modele.ordre;
  if(modele && g('mdConsigne')) g('mdConsigne').value = modele.consigne || '';
  if(modele && g('mdBilan')){
    /* Un bilan disparu du catalogue ne doit pas se transformer en
       « d'après la fiche » sans le dire : le menu le garde, marqué. */
    const sel = g('mdBilan');
    const v = String(modele.bilan || '');
    if(v && ![...sel.options].some(o => o.value === v)){
      const o = document.createElement('option');
      o.value = v;
      o.textContent = '⚠️ ' + v + ' — ce bilan n\'existe plus';
      sel.appendChild(o);
    }
    sel.value = v;
  }

  fond.appendChild(boite);
  document.body.appendChild(fond);

  /* Rappel des variables disponibles, avec insertion en un appui */
  const majVars = () => {
    const u = USAGES_MODELE.find(x => x.cle === g('mdUsage').value);
    const z = g('mdVars');
    z.innerHTML = 'Variables disponibles — appuie pour insérer :<br>';
    (u ? u.variables : []).forEach(v => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:auto;padding:4px 8px;font-size:12px;margin:4px 4px 0 0;';
      b.textContent = v;
      b.addEventListener('click', () => {
        const t = g('mdContenu');
        const p = t.selectionStart || t.value.length;
        t.value = t.value.slice(0, p) + v + t.value.slice(p);
        t.focus();
      });
      z.appendChild(b);
    });

    /* Un usage qui a un modèle de départ le propose : sans ça, on
       se retrouve devant une zone vide sans savoir quoi y écrire. */
    const dep = modeleParDefaut(g('mdUsage').value);
    if(dep){
      const bd = document.createElement('button');
      bd.type = 'button';
      bd.className = 'btn btn-secondary';
      bd.style.cssText = 'width:100%;padding:8px;font-size:12px;margin:9px 0 0;';
      bd.textContent = '📋 Partir du modèle proposé';
      bd.title = "Écrit dans la zone ci-dessus le texte utilisé par défaut";
      bd.addEventListener('click', async () => {
        const t = g('mdContenu');
        if(t.value.trim() &&
           !await confirmer('Remplacer ce que tu as écrit par le modèle proposé ?')) return;
        t.value = dep;
        t.focus();
      });
      z.appendChild(bd);

      const info = document.createElement('div');
      info.style.cssText = 'font-size:11px;color:var(--muted);margin-top:6px;' +
        'line-height:1.5;';
      info.textContent = "Tant que tu n'enregistres aucun modèle pour cet usage, " +
        "c'est ce texte-là qui part.";
      z.appendChild(info);
    }

    /* L'aide des heures, seulement là où elle sert */
    if(u && u.variables.some(v => v.indexOf('{heure') === 0)){
      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);margin-top:8px;' +
        'line-height:1.6;border-top:1px solid var(--line);padding-top:8px;';
      a.innerHTML = '🕐 ' + AIDE_HEURES;
      z.appendChild(a);
    }
  };
  g('mdUsage').addEventListener('change', majVars);

  /* ⚠️ L'USAGE EST POSÉ AVANT QUE LES BLOCS SOIENT CALCULÉS.

     « Je fais comment pour les rappels qui sont déjà créés ? Je
     n'ai pas le bouton, et je vais pas m'amuser à tous les
     recréer. » majBoite() décidait ce qui s'affiche d'après un
     usage pas encore écrit — donc toujours « libre » — et le menu
     du bilan restait invisible sur tout texte déjà écrit. */
  if(modele) g('mdUsage').value = modele.usage || 'libre';
  if(usageImpose){
    g('mdUsage').value = usageImpose;
    g('mdUsage').disabled = true;
    g('mdUsage').style.opacity = '.6';
  }

  /* Les réglages s'ouvrent d'office là où ils décident de quelque
     chose : une fiche libre n'a rien à y régler. */
  if(g('mdPlus')) g('mdPlus').open = (g('mdUsage').value !== 'libre');

  /* ---- Les étiquettes de cette fiche ---- */
  const dessinerEtiq = () => {
    const z = g('mdEtiq');
    if(!z) return;
    z.innerHTML = '';

    /* ⚠️ LA PUCE « PRIVÉ » VIENT EN PREMIER, ET C'EST UNE PUCE COMME
       LES AUTRES — v961. Une fiche privée n'est pas rangée
       ailleurs : elle porte une catégorie de plus. La rendre
       publique, c'est décocher, pas déménager. */
    const marque = marqueurPriveDe({ etiquettes: mesEtiquettes.join(SEP_ETIQ) });
    const proprio = marque ? marque.slice(PREFIXE_PRIVE.length).trim() : '';
    const mienne = maMarquePrivee();
    if(mienne || marque){
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mdEtq prive' + (marque ? ' on' : '');
      b.textContent = (marque && !cestMoi(proprio))
        ? '🔒 Privé — ' + proprio : '🔒 Privé';
      b.title = 'Visible de toi seul, et des administrateurs';
      b.addEventListener('click', () => {
        if(marque){
          mesEtiquettes.splice(mesEtiquettes.indexOf(marque), 1);
        }else if(mienne){
          mesEtiquettes.unshift(mienne);
        }
        dessinerEtiq();
      });
      z.appendChild(b);
    }

    const toutes = toutesLesEtiquettes().filter(jeVoisLaCategorie);
    categoriesDe({ etiquettes: mesEtiquettes.join(SEP_ETIQ) })
      .forEach(e => { if(toutes.indexOf(e) === -1) toutes.push(e); });

    toutes.forEach(e => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mdEtq' + (mesEtiquettes.indexOf(e) !== -1 ? ' on' : '');
      b.textContent = e;
      b.addEventListener('click', () => {
        const i = mesEtiquettes.indexOf(e);
        if(i === -1) mesEtiquettes.push(e); else mesEtiquettes.splice(i, 1);
        dessinerEtiq();
      });
      z.appendChild(b);
    });
  };
  dessinerEtiq();

  const ajouterEtiq = () => {
    const c = g('mdEtiqNeuve');
    const v = String(c.value || '').trim();
    if(!v) return;
    if(mesEtiquettes.indexOf(v) === -1) mesEtiquettes.push(v);
    c.value = '';
    dessinerEtiq();
  };
  if(g('mdEtiqAdd')) g('mdEtiqAdd').addEventListener('click', ajouterEtiq);
  if(g('mdEtiqNeuve')){
    g('mdEtiqNeuve').addEventListener('keydown', e => {
      if(e.key === 'Enter'){ e.preventDefault(); ajouterEtiq(); }
    });
  }

  majBoite();
  majVars();

  /* ⚠️ VERROUILLÉ VEUT DIRE VERROUILLÉ PARTOUT, pas seulement sur
     le crayon : un champ qu'on peut encore remplir laisse croire
     que c'est enregistré. */
  if(verrou){
    ['mdNom', 'mdContenu', 'mdConsigne'].forEach(k => {
      if(g(k)) g(k).readOnly = true;
    });
    ['mdUsage', 'mdBoite', 'mdOrdre', 'mdBilan', 'mdEtiqNeuve', 'mdEtiqAdd']
      .forEach(k => { if(g(k)) g(k).disabled = true; });
    boite.querySelectorAll('.mdEtq').forEach(b => { b.disabled = true; });
  }

  const redessiner = () => {
    if(usageImpose === 'procedure' && typeof afficherProcedures === 'function'){
      afficherProcedures();
    }else{
      dessinerRailEtiquettes();
      dessinerListeFiches();
    }
  };

  /* ------------------------------------------------------------
     FERMER, C'EST ENREGISTRER

     Il n'y a pas de bouton « Enregistrer » : on ferme, et c'est
     écrit. Rien ne part si rien n'a changé — et une fiche neuve
     laissée vide n'est pas créée, sans quoi un clic sur ➕ suivi
     d'un clic à côté fabriquerait une fiche fantôme.
     ------------------------------------------------------------ */
  const depart = modele
    ? JSON.stringify({ n: modele.titre || modele.nom || '', c: modele.contenu || '',
                       e: etiquettesDe(modele).join(SEP_ETIQ), u: modele.usage || 'libre',
                       b: modele.boite || '', o: !!modele.ordre,
                       g: modele.consigne || '', i: modele.bilan || '' })
    : '';

  const etatActuel = () => {
    const f = fichePleine();
    return JSON.stringify({ n: f.nom, c: f.contenu, e: f.etiquettes, u: f.usage,
                            b: f.boite, o: f.ordre, g: f.consigne, i: f.bilan });
  };

  let enCours = false;

  async function fermer(){
    if(enCours) return;
    if(verrou){ fermerFond(fond); return; }

    const f = fichePleine();

    /* Une fiche neuve sans rien dedans ne se crée pas. */
    if(!modele && !f.nom && !f.contenu){ fermerFond(fond); return; }

    /* Rien n'a bougé : on ferme sans rien écrire. */
    if(modele && etatActuel() === depart){ fermerFond(fond); return; }

    if(!f.nom){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Donne un titre à la fiche.';
      g('mdNom').focus();
      return;
    }
    if(!f.contenu){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Le texte est vide.';
      g('mdContenu').focus();
      return;
    }

    /* ⚠️ CE QUI NE SERA PLUS REMPLI SE DIT AVANT, PAS APRÈS. */
    const alerte = alerteDesVariables((modele && modele.contenu) || '',
                                      f.contenu, f.usage);
    if(alerte && !await confirmer('⚠️ ' + alerte + '\n\nEnregistrer quand même ?')){
      return;
    }

    enCours = true;
    bFermer.disabled = true;
    bFermer.textContent = 'Enregistrement…';
    try{
      const r = await appelPrep(Object.assign({ action: 'modeleSet' }, f));

      /* Le classeur peut avoir fabriqué le numéro lui-même par la
         voie de secours : c'est le sien qui fait foi. */
      const enregistree = Object.assign({}, f,
        { id: (r && r.id) || f.id, maj: horodatageCourt() });

      poserModeleEnMemoire(enregistree);
      perimerModeles();
      fermerFond(fond);
      showToast('Enregistré ✅');
      redessiner();
    }catch(e){
      enCours = false;
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Erreur : ' + e.message;
      bFermer.disabled = false;
      bFermer.textContent = '✓ Fermer';
    }
  }

  bFermer.addEventListener('click', fermer);
  fond.addEventListener('click', e => { if(e.target === fond) fermer(); });
  fond.addEventListener('keydown', e => { if(e.key === 'Escape') fermer(); });

  setTimeout(() => {
    const cible = modele ? g('mdContenu') : g('mdNom');
    if(cible && !verrou) cible.focus();
  }, 60);
}

/* La date telle que le classeur l'écrit, pour que la carte
   n'attende pas une relecture pour se mettre à jour. */
function horodatageCourt(){
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() +
         ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}



/* ============================================================
   PROCÉDURES DE CONDUITE
   Les mêmes fiches, présentées à part : c'est ce que les
   moniteurs consultent et ce qui sert aux corrections.
   ============================================================ */
async function afficherProcedures(){
  const zone = $('proceduresZone');
  if(!zone) return;

  zone.innerHTML = htmlAttente('Chargement des procédures…');
  await chargerModelesTexte();
  const liste = (modelesTexte || []).filter(m => m.usage === 'procedure')
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  zone.innerHTML = '';

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.marginBottom = '12px';
  b.textContent = '➕ Nouvelle procédure';
  b.addEventListener('click', () => ouvrirEditeurModele(null, 'procedure'));
  zone.appendChild(b);

  /* Recherche, car la liste va s'allonger */
  if(liste.length > 4){
    const rech = document.createElement('input');
    rech.type = 'text';
    rech.placeholder = '🔍 Filtrer les procédures';
    rech.style.marginBottom = '10px';
    rech.addEventListener('input', () => {
      const q = normaliserMot(rech.value);
      zone.querySelectorAll('[data-procedure]').forEach(el => {
        const ok = !q || normaliserMot(el.getAttribute('data-procedure')).indexOf(q) !== -1;
        el.style.display = ok ? '' : 'none';
      });
    });
    zone.appendChild(rech);
  }

  if(!liste.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucune procédure enregistrée.<br>' +
      '<span style="font-size:12px;">Ajoute ici tes procédures : giratoire, priorité à droite, ' +
      "créneau… Elles serviront aux corrections d'erreur et resteront consultables par tous.</span>";
    zone.appendChild(v);
    return;
  }

  liste.forEach(m => {
    const d = document.createElement('details');
    d.setAttribute('data-procedure', m.nom);
    d.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
      'margin-bottom:8px;';

    const som = document.createElement('summary');
    som.style.cssText = 'cursor:pointer;font-size:15px;font-weight:700;color:var(--cream);' +
      'list-style:none;';
    /* Pour qui elle est : sans ce repère, on ne sait pas d'un coup
       d'œil laquelle est réservée à la remorque. */
    const pourQui = String(m.boite || '').toUpperCase();
    const marque = /(^|[^A-Z])BE([^A-Z]|$)/.test(pourQui) ? ' 🚚'
      : (pourQui === 'BEA' ? ' 🅰️'
      : (pourQui === 'BV' ? ' 🅼' : ''));

    som.textContent = '🚦 ' + m.nom + marque;
    som.title = marque === ' 🚚' ? 'Remorque — permis BE seulement'
      : (marque === ' 🅰️' ? 'Boîte automatique seulement'
      : (marque === ' 🅼' ? 'Boîte manuelle seulement' : 'Toutes les voitures'));
    d.appendChild(som);

    const corps = document.createElement('div');
    corps.style.cssText = 'margin-top:8px;font-size:15px;line-height:1.6;white-space:pre-wrap;';
    corps.textContent = m.contenu;
    d.appendChild(corps);

    /* Les consignes de correction, visibles sans ouvrir Modifier :
       elles changent la façon dont l'élève est jugé, et devoir
       entrer dans l'éditeur pour savoir ce qui s'applique revient
       à ne pas le savoir. */
    if(m.ordre || String(m.consigne || '').trim()){
      const ia = document.createElement('div');
      ia.style.cssText = 'margin-top:10px;border:1px solid var(--line);' +
        'border-radius:10px;padding:9px 11px;font-size:13px;line-height:1.5;';

      const th = document.createElement('div');
      th.style.cssText = 'font-weight:700;color:var(--accent-text);margin-bottom:4px;';
      th.textContent = '✨ Correction par l\'IA';
      ia.appendChild(th);

      if(m.ordre){
        const o = document.createElement('div');
        o.style.cssText = 'color:var(--cream);';
        o.textContent = '☑️ L\'ordre des étapes compte';
        ia.appendChild(o);
      }

      const libre = String(m.consigne || '').trim();
      if(libre){
        const c = document.createElement('div');
        c.style.cssText = 'color:var(--muted);white-space:pre-wrap;' +
          (m.ordre ? 'margin-top:4px;' : '');
        c.textContent = libre;
        ia.appendChild(c);
      }

      d.appendChild(ia);
    }

    const pied = document.createElement('div');
    pied.style.cssText = 'font-size:11px;color:var(--muted);margin-top:8px;';
    pied.textContent = (m.maj ? 'modifié le ' + m.maj : '') + (m.par ? ' par ' + m.par : '');
    d.appendChild(pied);

    const r = document.createElement('div');
    r.style.cssText = 'display:flex;gap:8px;margin-top:10px;';

    const bCop = document.createElement('button');
    bCop.className = 'btn btn-secondary';
    bCop.style.cssText = 'flex:1;padding:9px;font-size:13px;margin:0;';
    bCop.textContent = '📋 Copier';
    bCop.addEventListener('click', () => {
      navigator.clipboard.writeText(m.contenu).then(
        () => showToast('Procédure copiée ✅'),
        () => showToast('Copie impossible'));
    });
    r.appendChild(bCop);

    const bMod = document.createElement('button');
    bMod.className = 'btn btn-secondary';
    bMod.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;margin:0;';
    bMod.textContent = '✏️ Modifier';
    bMod.addEventListener('click', () => ouvrirEditeurModele(m, 'procedure'));
    r.appendChild(bMod);

    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;margin:0;' +
      'color:var(--red);border-color:var(--red);';
    bSup.textContent = '✕';
    bSup.title = 'Supprimer';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer la procédure « ' + m.nom + ' » ?')) return;
      bSup.disabled = true;
      try{
        await appelPrep({ action: 'modeleDelete', id: m.id });
          perimerModeles();
        showToast('Procédure supprimée');
        afficherProcedures();
      }catch(e){ showToast('Erreur : ' + e.message); bSup.disabled = false; }
    });
    r.appendChild(bSup);

    d.appendChild(r);
    zone.appendChild(d);
  });
}


/* ============================================================
   IMPORT EN MASSE
   Coller ses modèles un par un est décourageant quand on en a
   quinze. On les colle tous, séparés par une ligne de titre.
   ============================================================ */
const SEPARATEUR_AIDE =
  'Sépare tes modèles par une ligne contenant seulement le titre entre === :\n\n' +
  '=== RDV accompagnateur ===\n' +
  'Bonjour 😁\n' +
  "N'OUBLIE PAS LA FORMATION DE TON ACCOMPAGNATEUR {jour}…\n\n" +
  '=== RDV préalable ===\n' +
  'Bonjour 😁\n…';

/* Découpe un texte collé en plusieurs modèles */
function decouperModeles(brut){
  const lignes = String(brut || '').split('\n');
  const out = [];
  let courant = null;

  lignes.forEach(l => {
    /* Une ligne de titre : === Nom === ou ___ Nom ___ */
    const m = l.match(/^\s*(?:=|_){2,}\s*(.+?)\s*(?:=|_){2,}\s*$/);
    if(m && m[1].length >= 2){
      if(courant) out.push(courant);
      courant = { titre: m[1].trim(), lignes: [] };
      return;
    }
    if(courant) courant.lignes.push(l);
  });
  if(courant) out.push(courant);

  return out
    .map(x => ({ titre: x.titre, contenu: x.lignes.join('\n').trim() }))
    /* ⚠️ UN TEXTE COURT RESTE UN TEXTE — v958. Le seuil était à dix
       caractères : « Merci 🙂 » ou « À demain ! » disparaissaient du
       lot sans un mot, et on ne s'en aperçoit qu'en les cherchant
       plus tard. Seul un titre sans rien dessous est écarté. */
    .filter(x => x.contenu.length > 0);
}

async function ouvrirImportModeles(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(620px, 95vw);max-height:92vh;overflow-y:auto;';

  boite.insertAdjacentHTML('beforeend',
    '<h3>📥 Importer plusieurs textes</h3>' +
    '<div style="font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:12px;">' +
      'Colle tous tes modèles d\'un coup. Sépare-les par une ligne de titre ' +
      'entre <strong>===</strong>, comme dans l\'exemple.</div>' +
    /* ⚠️ UNE ÉTIQUETTE, PAS UNE CATÉGORIE COLLÉE AU TITRE — v958. Et
       la liste proposée est la vraie : « listeCategories » n'a
       jamais existé nulle part, ce menu ne s'ouvrait donc jamais. */
    '<label for="imCat">🏷️ Catégorie à poser sur tout le lot</label>' +
    '<input type="text" id="imCat" list="imEtiqConnues" ' +
      'placeholder="Ex : 📥 Inscription — laisse vide pour ne rien poser">' +
    '<datalist id="imEtiqConnues">' +
      toutesLesEtiquettes().map(e =>
        '<option value="' + e.replace(/"/g, '&quot;') + '"></option>').join('') +
    '</datalist>' +
    '<label for="imUsage">Usage de ces textes</label>' +
    '<select id="imUsage">' + optionsUsage('libre') + '</select>' +
    '<label for="imTexte">Tes modèles</label>');

  const zone = document.createElement('textarea');
  zone.id = 'imTexte';
  zone.rows = 14;
  zone.placeholder = SEPARATEUR_AIDE;
  zone.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:14px;' +
    'line-height:1.55;font-family:inherit;resize:vertical;margin-bottom:8px;';
  boite.appendChild(zone);

  const apercu = document.createElement('div');
  apercu.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.7;' +
    'margin-bottom:12px;min-height:18px;';
  boite.appendChild(apercu);

  zone.addEventListener('input', () => {
    const t = decouperModeles(zone.value);
    apercu.innerHTML = t.length
      ? '✅ ' + t.length + ' modèle(s) reconnu(s) :<br>' +
        t.map(x => '• ' + x.titre.replace(/</g, '&lt;') +
          ' <span style="opacity:.7;">(' + x.contenu.length + ' caractères)</span>').join('<br>')
      : (zone.value.trim()
          ? '⚠️ Aucun titre entre === trouvé. Ajoute une ligne <strong>=== Nom ===</strong> ' +
            'avant chaque modèle.'
          : '');
  });

  const rangee = document.createElement('div');
  rangee.className = 'btn-row';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => fermerFond(fond));
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '📥 Importer';
  rangee.appendChild(bAnn); rangee.appendChild(bOk);
  boite.appendChild(rangee);

  const msg = document.createElement('div');
  msg.style.cssText = 'margin-top:8px;font-size:13px;min-height:16px;';
  boite.appendChild(msg);

  /* ⚠️ ICI TRAÎNAIT UN MORCEAU DE L'ÉDITEUR — v958.

     Onze lignes recopiées de ouvrirEditeurModele cherchaient la
     case d'usage de l'éditeur, et une variable qui n'existe pas dans
     cette fenêtre. La fenêtre d'import tombait donc à l'ouverture,
     avant d'avoir rien montré : le bouton 📥 ne faisait rien du
     tout. C'est le même code à deux endroits, une fois de plus — et
     c'est la porte par laquelle cent fiches doivent entrer.

     Le choix de boîte ne concerne que les procédures et se fait
     dans l'éditeur, fiche par fiche : il n'a rien à faire ici. */

  fond.appendChild(boite);
  document.body.appendChild(fond);

  bOk.addEventListener('click', async () => {
    const liste = decouperModeles(zone.value);
    if(!liste.length){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Aucun modèle reconnu. Vérifie les lignes de titre.';
      return;
    }

    const cat = boite.querySelector('#imCat').value.trim();
    const usage = boite.querySelector('#imUsage').value;

    bOk.disabled = true;
    let ok = 0;
    const rates = [];
    for(let i = 0; i < liste.length; i++){
      bOk.textContent = 'Import ' + (i + 1) + ' sur ' + liste.length + '…';
      try{
        /* L'import périme le cache : les nouveaux textes doivent
           paraître aussitôt. */
        perimerModeles();
        /* ⚠️ CHAQUE FICHE PORTE SON NUMÉRO AVANT DE PARTIR — v959.
           Sans lui, un appel renvoyé après un délai dépassé ajoute
           une seconde ligne ; sur un lot de cent, ça se compte en
           dizaines de doublons qu'on trie ensuite à la main. */
        await appelPrep({ action: 'modeleSet', id: nouvelIdModele(),
                          usage: usage,
                          nom: liste[i].titre,
                          etiquettes: cat,
                          contenu: liste[i].contenu });
        ok++;
      }catch(e){ rates.push(liste[i].titre + ' : ' + e.message); }
    }

    fermerFond(fond);
    showToast(ok + ' modèle(s) importé(s)' + (rates.length ? ' · ' + rates.length + ' échec(s)' : ''));
    if(rates.length) await informer('Modèles non importés :\n\n' + rates.join('\n'));
    afficherModelesTexte();
  });

  setTimeout(() => zone.focus(), 100);
}


/* Supprime tous les textes d'un dossier, en une fois */
async function viderDossier(nom, liste, bouton){
  if(!await confirmer('Supprimer les ' + liste.length + ' texte(s) du dossier « ' +
      nom + '» ?\n\n' +
      liste.slice(0, 8).map(m => '• ' + (m.titre || m.nom)).join('\n') +
      (liste.length > 8 ? '\n• … et ' + (liste.length - 8) + ' autre(s)' : '') +
      '\n\nCette action est irréversible.')) return;

  bouton.disabled = true;
  const initial = bouton.textContent;
  let ok = 0;
  const rates = [];

  for(let i = 0; i < liste.length; i++){
    bouton.textContent = (i + 1) + '/' + liste.length;
    try{
      await appelPrep({ action: 'modeleDelete', id: liste[i].id });
      ok++;
    }catch(e){ rates.push((liste[i].titre || liste[i].nom) + ' : ' + e.message); }
  }

  showToast(ok + ' texte(s) supprimé(s)' + (rates.length ? ' · ' + rates.length + ' échec(s)' : ''));
  if(rates.length) await informer('Textes non supprimés :\n\n' + rates.join('\n'));
  bouton.textContent = initial;
  afficherModelesTexte();
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-textes.js'] = true;
