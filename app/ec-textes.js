/* Déployé le 11/09/2026 à 14:46 — v958 */
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
  { cle:'libre',          nom:'📄 Texte libre',
    variables:['{eleve}', '{date}'] }
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
  (modelesTexte || []).forEach(m => etiquettesDe(m).forEach(e => {
    if(vues.indexOf(e) === -1) vues.push(e);
  }));

  const rangees = (ordreEtiquettes || ETIQUETTES_DEPART).slice();
  const out = rangees.slice();
  vues.forEach(e => { if(out.indexOf(e) === -1) out.push(e); });
  return out;
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
async function envoyerFicheParMail(m){
  if(typeof choisirEleveConnu !== 'function'){
    showToast('La liste des élèves n’est pas chargée.');
    return;
  }
  const nom = await choisirEleveConnu('✉️ Envoyer « ' + (m.titre || m.nom) + ' »',
    'À qui ce message part-il ? Son adresse est reprise de sa fiche.');
  if(!nom) return;

  const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
  let adresse = (f && f.email) || '';
  if(typeof confirmerAdresseEleve === 'function'){
    adresse = await confirmerAdresseEleve(nom, adresse);
  }
  if(!adresse) return;

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

  /* L'objet : la porte commune de saisie, pas une fenêtre de plus. */
  const sujet = await demander('Objet du message — ce que l’élève verra ' +
    'comme titre.', (m.titre || m.nom), '✉️ Envoyer la fiche');
  if(sujet === null) return;

  try{
    await appelPrep({ action: 'mailBilan', to: [adresse],
                      sujet: sujet || (m.titre || m.nom), texte: texte });
    showToast('Envoyé à ' + adresse + ' ✅');
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
  await Promise.all([chargerModelesTexte(), chargerOrdreEtiquettes()]);
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

  const compte = e => (modelesTexte || [])
    .filter(m => etiquettesDe(m).indexOf(e) !== -1).length;
  const sans = (modelesTexte || []).filter(m => !etiquettesDe(m).length).length;

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
    if(rangeable){
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

  ligne('', '🏷️ Toutes', (modelesTexte || []).length, false);
  toutesLesEtiquettes().forEach(e => ligne(e, e, compte(e), true));
  if(sans) ligne('*sans*', '📭 Sans étiquette', sans, false);
}

let glisseEtq = '';

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

function dessinerListeFiches(){
  const zone = document.querySelector('#textesZone .biblioFiches');
  if(!zone) return;
  zone.innerHTML = '';

  const mots = sansAccents(rechercheFiches).split(/\s+/).filter(Boolean);
  let liste = (modelesTexte || []).filter(m => fichePorte(m, mots));
  if(etiquetteChoisie === '*sans*'){
    liste = liste.filter(m => !etiquettesDe(m).length);
  }else if(etiquetteChoisie){
    liste = liste.filter(m => etiquettesDe(m).indexOf(etiquetteChoisie) !== -1);
  }

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

  liste.sort((a, b) => String(a.titre || a.nom)
    .localeCompare(String(b.titre || b.nom), 'fr'));

  liste.forEach(m => zone.appendChild(carteDeFiche(m, mots)));
}

function carteDeFiche(m, mots){
  const d = document.createElement('div');
  d.className = 'ficheTexte';

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

  const etq = etiquettesDe(m);
  if(etq.length){
    const z = document.createElement('div');
    z.className = 'fe';
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

  geste('✏️', 'Modifier', () => ouvrirEditeurModele(m));
  geste('📋', 'Copier toute la fiche', async () => {
    const ok = await copierDansLePressePapier(m.contenu || '');
    showToast(ok ? 'Fiche copiée ✅' : 'Copie impossible sur cet appareil');
  });
  geste('✂️', 'Copier un morceau', () => ouvrirCopieMorceau(m));
  geste('✉️', 'Envoyer par mail', () => envoyerFicheParMail(m));

  const bSup = geste('✕', 'Supprimer', async () => {
    if(!await confirmer('Supprimer la fiche « ' + (m.titre || m.nom) + ' » ?')) return;
    bSup.disabled = true;
    try{
      await appelPrep({ action: 'modeleDelete', id: m.id });
      perimerModeles();
      showToast('Fiche supprimée');
      afficherModelesTexte();
    }catch(e){ showToast('Erreur : ' + e.message); bSup.disabled = false; }
  });
  bSup.classList.add('sup');

  d.appendChild(g);
  return d;
}

function ouvrirEditeurModele(modele, usageImpose){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 94vw);max-height:90vh;overflow-y:auto;';

  const h = document.createElement('h3');
  h.textContent = modele
    ? (usageImpose === 'procedure' ? 'Modifier la procédure' : 'Modifier le texte')
    : (usageImpose === 'procedure' ? '🚦 Nouvelle procédure' : 'Nouveau texte type');
  boite.appendChild(h);

  /* ⚠️ DES ÉTIQUETTES, PAS UNE CATÉGORIE — v958. On coche celles
     qu'on veut, on en crée une en la tapant. Une fiche peut en
     porter plusieurs, et en changer sans être déplacée. */
  boite.insertAdjacentHTML('beforeend',
    '<label>🏷️ Étiquettes</label>' +
    '<div id="mdEtiq" class="mdEtiq"></div>' +
    '<div style="display:flex;gap:6px;margin:-4px 0 12px;">' +
      '<input type="text" id="mdEtiqNeuve" style="flex:1;margin:0;" ' +
        'placeholder="Créer une étiquette…">' +
      '<button type="button" class="btn btn-secondary" id="mdEtiqAdd" ' +
        'style="width:auto;padding:0 14px;margin:0;font-size:13px;">➕</button>' +
    '</div>' +
    '<label for="mdNom">Nom de ce texte</label>' +
    '<input type="text" id="mdNom" placeholder="Ex : Jour du permis — Saint-Brieuc">' +
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
    '<label for="mdContenu">Texte du message</label>' +
    '<textarea id="mdContenu" rows="14" ' +
      'style="width:100%;background:var(--navy);border:1px solid var(--line);color:var(--cream);' +
      'padding:11px 12px;border-radius:10px;font-size:15px;line-height:1.6;font-family:inherit;' +
      'resize:vertical;margin-bottom:12px;"></textarea>' +

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
    '</div>');

  const rangee = document.createElement('div');
  rangee.className = 'btn-row';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '💾 Enregistrer';
  rangee.appendChild(bAnn); rangee.appendChild(bOk);
  boite.appendChild(rangee);

  const msg = document.createElement('div');
  msg.style.cssText = 'margin-top:8px;font-size:13px;min-height:16px;';
  boite.appendChild(msg);

  /* La boîte et les consignes de correction n'ont de sens que pour
     une procédure : un texte type ne se récite pas. */
  const majBoite = () => {
    const usage = boite.querySelector('#mdUsage').value;
    const estProc = (usage === 'procedure');
    const b = boite.querySelector('#mdBlocBoite');
    if(b) b.style.display = estProc ? 'block' : 'none';
    const ia = boite.querySelector('#mdBlocIA');
    if(ia) ia.style.display = estProc ? 'block' : 'none';
    /* Le bilan à créer n'a de sens que pour un rappel de cours :
       c'est le seul usage qui fabrique un cours. */
    const bi = boite.querySelector('#mdBlocBilan');
    if(bi) bi.style.display = (usage === 'rappel_cours') ? 'block' : 'none';
  };
  boite.querySelector('#mdUsage').addEventListener('change', majBoite);
  if(modele && modele.boite && boite.querySelector('#mdBoite')){
    boite.querySelector('#mdBoite').value = modele.boite;
  }
  if(modele && boite.querySelector('#mdOrdre')){
    boite.querySelector('#mdOrdre').checked = !!modele.ordre;
  }
  if(modele && boite.querySelector('#mdConsigne')){
    boite.querySelector('#mdConsigne').value = modele.consigne || '';
  }
  if(modele && boite.querySelector('#mdBilan')){
    /* Un bilan disparu du catalogue ne doit pas se transformer en
       « d'après la fiche » sans le dire : le menu le garde, marqué. */
    const sel = boite.querySelector('#mdBilan');
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

  const g = id => boite.querySelector('#' + id);

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
      bd.title = "Écrit dans la zone ci-dessous le texte utilisé par défaut";
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

  if(modele){
    /* ⚠️ PLUS DE CHAMP « CATÉGORIE » ICI — v958. Il a été remplacé par
       le choix d'étiquettes ; cette ligne le remplissait encore et
       faisait tomber l'éditeur dès qu'on ouvrait une fiche
       existante. Une case qu'on enlève de l'écran, il faut aussi
       l'enlever de ce qui la remplit. */
    g('mdNom').value = modele.titre || modele.nom || '';
    g('mdUsage').value = modele.usage || 'libre';
    g('mdContenu').value = modele.contenu || '';
  }
  /* Depuis le tiroir des procédures, l'usage est déjà connu */
  if(usageImpose){
    g('mdUsage').value = usageImpose;
    g('mdUsage').disabled = true;
    g('mdUsage').style.opacity = '.6';
  }

  /* ⚠️ APRÈS QUE L'USAGE EST POSÉ, ET UNE SEULE FOIS.

     majBoite() décide quels blocs s'affichent D'APRÈS L'USAGE. Il
     était appelé plus haut, AVANT que l'usage du modèle qu'on
     ouvre soit écrit dans le menu — donc toujours sur « libre ».
     Le rattrapage n'existait que pour le tiroir des procédures, et
     le commentaire d'alors le disait déjà : « l'affichage a été
     calculé avant que l'usage soit posé ».

     Résultat : en ouvrant un rappel de cours DÉJÀ ÉCRIT, le menu
     « 📄 Le bilan que ce rappel doit créer » restait invisible.
     David : « je fais comment pour les rappels qui sont déjà
     créés, je n'ai pas le bouton, et je vais pas m'amuser à tous
     les recréer ». Il avait raison : il n'y avait rien à
     recréer, c'est l'écran qui ne montrait pas.

     Un seul appel, ici, quand tout est posé. */
  /* ---- Les étiquettes de cette fiche ---- */
  let mesEtiquettes = modele ? etiquettesDe(modele) : [];

  const dessinerEtiq = () => {
    const z = g('mdEtiq');
    if(!z) return;
    z.innerHTML = '';
    const toutes = toutesLesEtiquettes().slice();
    mesEtiquettes.forEach(e => { if(toutes.indexOf(e) === -1) toutes.push(e); });

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

  bAnn.addEventListener('click', () => fermerFond(fond));

  bOk.addEventListener('click', async () => {
    const nom = g('mdNom').value.trim();
    const contenu = g('mdContenu').value.trim();
    if(!nom){ msg.style.color = 'var(--warn-text)'; msg.textContent = 'Donne un nom au modèle.'; return; }
    if(!contenu){ msg.style.color = 'var(--warn-text)'; msg.textContent = 'Le texte est vide.'; return; }

    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      await appelPrep({
        action: 'modeleSet',
        id: modele ? modele.id : '',
        usage: g('mdUsage').value,
        /* ⚠️ LE TITRE EST LE TITRE — v958. La catégorie ne s'y range
           plus : elle est devenue une étiquette, et un titre qui
           porte son rangement ne se renomme plus sans tout casser. */
        nom: nom,
        etiquettes: mesEtiquettes.join(SEP_ETIQ),
        /* La boîte ne concerne que les procédures */
        boite: (g('mdUsage').value === 'procedure' && g('mdBoite'))
          ? g('mdBoite').value : '',
        /* Comment l'IA doit corriger celle-ci — procédures uniquement */
        ordre: (g('mdUsage').value === 'procedure' && g('mdOrdre'))
          ? g('mdOrdre').checked : false,
        consigne: (g('mdUsage').value === 'procedure' && g('mdConsigne'))
          ? g('mdConsigne').value.trim() : '',
        /* Le bilan que ce rappel doit créer — rappels uniquement */
        bilan: (g('mdUsage').value === 'rappel_cours' && g('mdBilan'))
          ? g('mdBilan').value : '',
        contenu: contenu
      });

      /* Le texte a changé : le cache n'a plus lieu d'être */
      perimerModeles();

      fermerFond(fond);
      showToast('Enregistré ✅');
      if(usageImpose === 'procedure') afficherProcedures();
      else afficherModelesTexte();
    }catch(e){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Erreur : ' + e.message;
      bOk.disabled = false;
      bOk.textContent = '💾 Enregistrer';
    }
  });
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
    '<label for="imCat">🏷️ Étiquette à poser sur tout le lot</label>' +
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
        await appelPrep({ action: 'modeleSet', id: '', usage: usage,
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
