/* Déployé le 20/11/2026 à 10:13 — v1505 */
/* ============================================================
   ec-base.js — v1503 (v1474 pour la première version)
   🗄️ LA BASE DE L'APPLI — Gestion › L'outil › 🗄️ Base (admins)

   David, le 19 novembre : « tout passer sur D1 et juste en backup
   Sheets », puis, devant l'écran d'alors (quinze blocs empilés dans
   Gestion › Accès) : « là c'est inbuvable il faut tout faire défiler »
   — « un truc plus joli avec des interrupteurs », dans un sous-onglet
   de Gestion, avec « des sous-onglets en haut pour séparer ce qui est
   lu, ce qui interroge le serveur » et « un suivi de la consommation
   Cloudflare pour voir ce qu'on consomme exactement ». Schéma validé
   le 19/11 (« c'est tout bon pour moi tu peux coder »).

   Trois sous-onglets :
     📖 Ce qui est lu
        Une ligne par feuille, rangées par famille : son nombre, une
        pastille d'état et son interrupteur (allumé = dans D1). Toucher
        la ligne la déplie (à quoi elle sert, les sauvegardes, les
        écarts, 💾). Puis les réglages (⚡ espace élève sans Apps
        Script, 📄 archive dans Cloudflare) et, repliées, les feuilles
        encore dans Google, gardées en copie.
     📊 Ce qui interroge le serveur
        Le compte des requêtes du Worker (l'ancien écran d'ec-conso.js)
        et ce qui passe encore par Apps Script.
     ☁️ Consommation Cloudflare
        Ce que Cloudflare compte lui-même, mesure par mesure, sur ce que
        le forfait Workers Paid inclut chaque mois (consoCloudflare).

   ✂️ COUPÉ RESTE COUPÉ (David : « coupé reste coupé mais il faut
   l'information avec une notification ») : couper un interrupteur
   demande confirmation ; la nuit ne le rallume plus, et les
   administrateurs sont prévenus (au moment de couper, puis chaque
   matin tant que c'est coupé — voir BASE_COUPEE dans le Worker).
   ============================================================ */

const BASE_SOUS = [
  { cle: 'lu', nom: '📖 Ce qui est lu' },
  { cle: 'serveur', nom: '📊 Ce qui interroge le serveur' },
  { cle: 'cloudflare', nom: '☁️ Consommation Cloudflare' }
];
let baseSous = 'lu';
try{ baseSous = localStorage.getItem('ecBaseSous') || 'lu'; }catch(e){}
if(!BASE_SOUS.some(x => x.cle === baseSous)) baseSous = 'lu';

const bEch = (v) => (typeof echapper === 'function') ? echapper(v) : String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function baseQuand(ms){
  if(!ms) return '';
  try{ return new Date(Number(ms)).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' à'); }catch(e){ return ''; }
}
function baseJour(ms){
  if(!ms) return '';
  try{ return new Date(Number(ms)).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit' }); }catch(e){ return ''; }
}
function baseMotif(x){
  if(x.motif === 'nuit') return '🌙 Cette nuit';
  if(x.motif === 'retour') return '✂️ Coupé' + (x.par ? ' — ' + x.par : '');
  return '👆 Au bouton' + (x.par ? ' — ' + x.par : '');
}
function baseErreur(e){ return (e && e.message) || String(e); }

/* ============================================================
   📖 CE QUI EST LU — les feuilles, rangées par famille
   ============================================================ */
const BASE_FAMILLES = [
  { nom: 'Élèves', feuilles: [
    { action: 'baseSuivi', logo: '📋', nom: 'Fiche de suivi', mot: 'la fiche de suivi', unite: 'fiche',
      aide: 'La fiche de suivi de chaque élève (examens, AAC, préparation, ce qui est payé et planifié).' },
    { action: 'baseRepertoire', logo: '📇', nom: 'Répertoire des élèves', mot: 'le répertoire', unite: 'fiche',
      aide: 'Les fiches des élèves (téléphone, mail, formation, agence, id Drivup…).' },
    { action: 'baseAcces', logo: '🔑', nom: 'Accès à leur espace', mot: 'les accès des élèves', unite: 'accès',
      aide: 'Le code de chaque élève pour son espace, sa dernière connexion, ce qu’il voit. Lus à chaque connexion d’un élève.' } ] },
  { nom: 'Cours', feuilles: [
    { action: 'baseBilans', logo: '📚', nom: 'Bilans de cours', mot: 'les bilans', unite: 'bilan',
      aide: 'Tous les bilans de cours (le texte, la note interne, les manœuvres…).' },
    { action: 'basePreparations', logo: '🗓️', nom: 'Cours préparés', mot: 'les cours préparés', unite: 'cours préparé',
      aide: 'Les prochains cours de chaque moniteur, leur ordre dans la journée, à qui ils sont attribués.' },
    { action: 'baseConsignes', logo: '📌', nom: 'Messages aux moniteurs', mot: 'les messages aux moniteurs', unite: 'message',
      aide: 'Ce que le bureau laisse au moniteur sur un élève, et s’il l’a traité.' },
    { action: 'baseLiens', logo: '🔗', nom: 'Liens de cours', mot: 'les liens de cours', unite: 'lien',
      aide: 'Les liens envoyés aux élèves par mail pour confirmer un cours, et ce qu’ils en ont fait.' } ] },
  { nom: 'Examens', feuilles: [
    { action: 'baseSessions', logo: '📅', nom: 'Sessions d’examen', mot: 'les sessions', unite: 'session',
      aide: 'Les journées d’examen (date, centre, moniteur, boîte).' },
    { action: 'basePlaces', logo: '🎫', nom: 'Places des sessions', mot: 'les places', unite: 'place',
      aide: 'Qui passe à quelle heure, prévenu, dossier OK, remarque.' } ] },
  { nom: 'Coin révisions', feuilles: [
    { action: 'baseGroupesParcours', logo: '🗂️', nom: 'Groupes', mot: 'les groupes', unite: 'groupe',
      aide: 'Les groupes du coin révisions (nom, icône, formations, ordre, fermé ou non).' },
    { action: 'baseGuides', logo: '📘', nom: 'Guides', mot: 'les guides', unite: 'guide',
      aide: 'Les guides et tout leur contenu (textes, vidéos, photos, étapes).' },
    { action: 'baseParcoursVu', logo: '👁️', nom: 'Ce que les élèves ont vu', mot: 'ce que les élèves ont vu', unite: 'ligne',
      aide: 'Chaque guide ou étape vu par un élève (vu le, revu le, nombre de vues, remis à voir).' } ] }
];
const BASE_TOUTES = [].concat.apply([], BASE_FAMILLES.map(f => f.feuilles));
const bEtat = {};          /* action → dernière réponse du serveur */
const bOuvert = {};        /* action → détail déplié */
const bTravail = {};       /* action → « Sauvegarde… », « Bascule… » */
const bReglages = { eleve: null, archive: null };
let bComparaison = null;   /* { faits, total, egaux, ecarts: [] } */
function uniteBase(def, k){ return def.unite + (k > 1 && !/[sx]$/.test(def.unite) ? 's' : ''); }

function bPuce(def){
  const t = bTravail[def.action];
  if(t) return '<span class="bsPuce travail">⏳ ' + bEch(t) + '</span>';
  const d = bEtat[def.action];
  if(!d) return '<span class="bsPuce">…</span>';
  if(d.erreur && !('actif' in d)) return '<span class="bsPuce ko">⚠️ Illisible</span>';
  if(d.coupe) return '<span class="bsPuce route">✂️ Coupé</span>';
  if(!d.actif) return '<span class="bsPuce feuille">Feuille Google</span>';
  const ec = (d.ecarts || []).length;
  if(ec) return '<span class="bsPuce ko">' + ec + ' écart' + (ec > 1 ? 's' : '') + '</span>';
  if(d.attente) return '<span class="bsPuce route">⏳ ' + d.attente + ' en route</span>';
  return '<span class="bsPuce ok">À jour</span>';
}
function bInter(on, etiquette, occupe){
  return '<button type="button" role="switch" class="bsInter" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + bEch(etiquette) + '"' +
    (occupe ? ' disabled' : '') + '><span></span></button>';
}
function bSousTexte(def, d){
  if(!d) return 'Lecture…';
  if(d.erreur && !('actif' in d)) return d.erreur;
  const n = Number(d.fiches || 0);
  if(d.actif) return n.toLocaleString('fr-FR') + ' ' + uniteBase(def, n) + ' · dans D1 depuis le ' + baseJour(d.depuis);
  if(d.coupe) return 'coupé le ' + baseJour(d.depuis) + (d.detail ? ' par ' + d.detail : '') + ' — lu dans la feuille Google';
  return 'encore dans la feuille Google : passe dans D1 cette nuit vers 3 h, ou tout de suite avec l’interrupteur';
}
function bLigneFeuille(def){
  const d = bEtat[def.action];
  const ouvert = !!bOuvert[def.action];
  let h = '<div class="bsL' + (ouvert ? ' ouvert' : '') + '" data-a="' + def.action + '">' +
    '<div class="bsTete"><button type="button" class="bsOuvrir" aria-expanded="' + ouvert + '">' +
    '<span class="bsLogo">' + def.logo + '</span><span class="bsNom"><b>' + bEch(def.nom) + '</b><small>' + bEch(bSousTexte(def, d)) + '</small></span>' +
    bPuce(def) + '<span class="bsChev" aria-hidden="true">›</span></button>' +
    bInter(d && d.actif, def.nom + ' dans D1', !d || !!bTravail[def.action] || (d.erreur && !('actif' in d))) + '</div>';
  if(ouvert && d){
    h += '<div class="bsDetail"><div class="cdAide">' + bEch(def.aide) + (d.actif
      ? ' Lu et écrit dans D1, recopié dans la feuille Google juste après chaque changement, comparé chaque nuit vers 3 h.'
      : d.coupe ? ' Coupé : l’appli le lit et l’écrit dans la feuille Google, comme avant. La nuit ne le rallume pas : seul l’interrupteur le remet dans D1.'
                : ' Encore lu dans la feuille Google. Il passera dans D1 cette nuit vers 3 h, ou tout de suite avec l’interrupteur.') + '</div>';
    if(d.message || d.erreur) h += '<div class="baseMsg' + (d.erreur ? ' baseKo' : '') + '">' + bEch(d.erreur ? '⚠️ ' + d.erreur : d.message) + '</div>';
    const sv = (d.sauvegardes || []).slice(0, 6);
    if(sv.length){
      h += '<div class="bsSousTitre">Dernières sauvegardes</div><div class="baseListe">' + sv.map(x => {
        const ic = x.etat === 'ok' ? '✅' : x.etat === 'partiel' ? '⚠️' : x.etat === 'echec' ? '❌' : '⏳';
        const duree = (x.fin && x.debut) ? Math.max(1, Math.round((x.fin - x.debut) / 1000)) + ' s' : '';
        return '<div class="baseLigne"><span class="baseIc">' + ic + '</span><span class="baseTexte"><b>' + bEch(baseQuand(x.debut)) + '</b> · ' +
          bEch(baseMotif(x)) + (duree ? ' · ' + duree : '') + '<small>' + bEch(x.detail || '') + '</small></span></div>';
      }).join('') + '</div>';
    }
    const ec = d.ecarts || [];
    if(ec.length){
      h += '<div class="bsSousTitre">Cases changées dans la feuille par autre chose que l’appli</div>' +
        '<div class="cdAide">C’est la feuille qui a été gardée.</div><div class="baseListe">' + ec.slice(0, 20).map(x =>
        '<div class="baseLigne"><span class="baseTexte"><b>' + bEch(x.eleve) + '</b> · ' + bEch(x.champ) + ' · ' + bEch(baseQuand(x.le)) +
        '<small>' + bEch(x.sens) + ' : « ' + bEch(String(x.base || '(vide)').slice(0, 120)) + ' » → « ' + bEch(String(x.feuille || '(vide)').slice(0, 120)) + ' »</small></span></div>').join('') + '</div>';
    }
    if(d.actif) h += '<div class="baseBoutons"><button type="button" class="btn btn-primary" data-sauver="' + def.action + '"' + (bTravail[def.action] ? ' disabled' : '') + '>💾 Sauvegarder maintenant</button></div>';
    h += '</div>';
  }
  return h + '</div>';
}
function bLigneReglage(cle, logo, nom, sous, on, puce, detail){
  const ouvert = !!bOuvert[cle];
  return '<div class="bsL' + (ouvert ? ' ouvert' : '') + '" data-r="' + cle + '">' +
    '<div class="bsTete"><button type="button" class="bsOuvrir" aria-expanded="' + ouvert + '">' +
    '<span class="bsLogo">' + logo + '</span><span class="bsNom"><b>' + bEch(nom) + '</b><small>' + bEch(sous) + '</small></span>' +
    puce + '<span class="bsChev" aria-hidden="true">›</span></button>' + bInter(on, nom, !!bTravail[cle] || (cle === 'archive' ? !bReglages.archive : !bReglages.eleve) || (cle === 'humain' && !(bReglages.eleve && bReglages.eleve.humain && bReglages.eleve.humain.pret))) + '</div>' +
    (ouvert ? '<div class="bsDetail">' + detail + '</div>' : '') + '</div>';
}
function bDetailEleve(){
  let h = '<div class="cdAide">Son ouverture attendait Apps Script (une douzaine de secondes). Cloudflare construit maintenant l’espace lui-même, ' +
    'en une seconde, avec les mêmes règles. La comparaison vérifie élève par élève que les deux donnent exactement la même chose.</div>';
  const c = bComparaison;
  if(c){
    const fini = c.faits >= c.total;
    h += '<div class="baseMsg' + (c.ecarts.length ? ' baseKo' : '') + '">' +
      (fini ? (c.ecarts.length ? '⚠️ ' + c.ecarts.length + ' élève(s) sur ' + c.total + ' avec une différence.' : '✅ ' + c.total + ' élèves comparés : tout est identique.')
            : '⏳ Comparaison : ' + c.faits + ' / ' + c.total + ' élèves…') + '</div>';
    if(c.ecarts.length){
      h += '<div class="baseListe">' + c.ecarts.slice(0, 30).map(x => {
        const l = (x.differences || []).slice(0, 6).map(y => bEch(y.ou) + ' : Apps Script « ' + bEch(String(y.appsScript).slice(0, 80)) + ' » · ici « ' + bEch(String(y.ici).slice(0, 80)) + ' »').join('<br>');
        return '<div class="baseLigne"><span class="baseIc">⚠️</span><span class="baseTexte"><b>' + bEch(x.eleve) + '</b><small>' + (x.erreur ? bEch(x.erreur) : l) + '</small></span></div>';
      }).join('') + '</div>';
    }
  }
  const enCours = c && c.faits < c.total;
  return h + '<div class="baseBoutons"><button type="button" class="btn baseRetour" data-comparer' + (enCours ? ' disabled' : '') + '>🔍 Comparer avec Apps Script</button></div>';
}
/* 🤖 v1504 — la vérification « c'est bien une personne » à la connexion de l'espace élève */
function bDetailHumain(){
  const hu = (bReglages.eleve && bReglages.eleve.humain) || {};
  let h = '<div class="cdAide">À la connexion de l’espace élève et de l’appli de l’équipe, Cloudflare vérifie que c’est bien une personne et pas un robot qui essaie des codes. ' +
    'Le plus souvent on ne voit rien ; une case « Je suis humain » n’apparaît que si Cloudflare a un doute. Ensuite, l’appareil garde un laissez-passer ' +
    'deux mois pour ce code. Les tablettes de la salle et l’ordinateur de la salle de code ne sont pas concernés.</div>';
  if(!hu.pret){
    h += '<div class="baseMsg baseKo">🔑 Il manque les clés de Cloudflare Turnstile dans le Worker.</div>' +
      '<ol class="bsEtapes"><li>Sur Cloudflare : <b>Turnstile</b> › <b>Add widget</b>. Nom : « Espace élève ». Hostnames : <b>eleve.evolutionconduites.fr</b> et <b>app.evolutionconduites.fr</b>. ' +
      'Widget Mode : <b>Managed</b>.</li><li>Dans le Worker <b>bilan-proxy</b> › Settings › Variables and Secrets : <b>TURNSTILE_SITE_KEY</b> (la « Site Key ») ' +
      'et <b>TURNSTILE_SECRET</b> (la « Secret Key », en <i>Secret</i>).</li><li>Reviens ici : la ligne s’allume toute seule.</li></ol>';
  }else if(hu.le){
    h += '<div class="cdAide">' + (hu.coupe ? 'Éteinte' : 'Rallumée') + ' le ' + bEch(baseQuand(hu.le)) + (hu.par ? ' par ' + bEch(hu.par) : '') + '</div>';
  }
  return h;
}
function bDetailArchive(){
  const ar = bReglages.archive || {};
  let h = '<div class="cdAide">Avant d’effacer un dossier (passerelle BEA → BV), l’appli en garde une copie complète. Éteint : elle part dans Google Drive par Apps Script, ' +
    'comme avant. Allumé : elle se fait dans Cloudflare, plus vite, et se retrouve ici. Si Cloudflare n’y arrive pas, Google Drive prend le relais tout seul.</div>';
  if(ar.le) h += '<div class="cdAide">' + (ar.cloudflare ? 'Allumé' : 'Éteint') + ' le ' + bEch(baseQuand(ar.le)) + (ar.par ? ' par ' + bEch(ar.par) : '') + '</div>';
  const l = ar.archives || [];
  if(l.length){
    h += '<div class="baseListe">' + l.map(x => '<div class="baseLigne"><span class="baseTexte"><b>' + bEch(x.eleve) + '</b> · ' + bEch(baseQuand(x.le)) + ' · ' +
      Number(x.lignes || 0).toLocaleString('fr-FR') + ' ligne(s)<small>' + bEch(x.fichier) + (x.par ? ' — ' + bEch(x.par) : '') + '</small></span>' +
      '<button type="button" class="btn btn-secondary bsPetit" data-archive="' + bEch(x.cle) + '">📄 Télécharger</button></div>').join('') + '</div>';
  }else if(ar.cloudflare){
    h += '<div class="cdAide">Aucune archive dans Cloudflare pour l’instant.</div>';
  }
  return h;
}

function bDessinerLu(corps){
  const lues = BASE_TOUTES.filter(def => bEtat[def.action] && ('actif' in bEtat[def.action]));
  const dans = lues.filter(def => bEtat[def.action].actif).length;
  const coupees = lues.filter(def => bEtat[def.action].coupe).length;
  const attente = lues.reduce((t, def) => t + Number(bEtat[def.action].attente || 0), 0);
  const ecarts = lues.reduce((t, def) => t + (bEtat[def.action].ecarts || []).length, 0);
  const nuit = lues.map(def => (bEtat[def.action].sauvegardes || []).filter(x => x.motif === 'nuit')[0]).filter(Boolean).sort((a, b) => b.debut - a.debut)[0];
  const enCours = Object.keys(bTravail).some(k => bTravail[k]);
  const chargees = BASE_TOUTES.every(def => bEtat[def.action]);
  const ok = chargees && dans === BASE_TOUTES.length && !ecarts;
  let h = '<div class="bsResume' + (ok ? ' ok' : '') + '"><div class="bsResumeTexte"><b>' +
    (!chargees ? '⏳ Lecture des feuilles…' : dans === BASE_TOUTES.length ? '✅ Les ' + dans + ' feuilles sont dans D1' : '🗄️ ' + dans + ' feuilles sur ' + BASE_TOUTES.length + ' dans D1') +
    '</b><small>' + (coupees ? '✂️ ' + coupees + ' coupée' + (coupees > 1 ? 's' : '') + ' · ' : '') +
    (attente ? '⏳ ' + attente + ' changement' + (attente > 1 ? 's' : '') + ' en route vers Google' : 'Tout est recopié dans Google') +
    (ecarts ? ' · ⚠️ ' + ecarts + ' écart' + (ecarts > 1 ? 's' : '') : '') +
    (nuit ? ' · dernière sauvegarde de nuit le ' + baseQuand(nuit.debut) : ' · sauvegarde chaque nuit vers 3 h') + '</small></div>' +
    '<button type="button" class="btn btn-primary bsTout"' + (enCours || !dans ? ' disabled' : '') + '>' + (enCours ? '⏳ Sauvegarde…' : '💾 Tout sauvegarder') + '</button></div>';
  BASE_FAMILLES.forEach(f => {
    h += '<div class="bsFam">' + bEch(f.nom) + '</div><div class="bsListe">' + f.feuilles.map(bLigneFeuille).join('') + '</div>';
  });
  const el = bReglages.eleve, ar = bReglages.archive;
  h += '<div class="bsFam">Réglages</div><div class="bsListe">' +
    bLigneReglage('eleve', '⚡', 'Espace élève sans Apps Script',
      !el ? 'Lecture…' : el.erreur ? el.erreur : el.actif ? 'allumé le ' + baseQuand(el.le) + (el.par ? ' par ' + el.par : '') : 'éteint : l’espace élève attend Apps Script (une douzaine de secondes)',
      !!(el && el.actif), el && !el.erreur ? (el.actif ? '<span class="bsPuce ok">Allumé</span>' : '<span class="bsPuce feuille">Éteint</span>') : '<span class="bsPuce">…</span>',
      bDetailEleve()) +
    bLigneReglage('humain', '🤖', 'Vérifier que c’est bien une personne',
      !el ? 'Lecture…' : el.erreur ? el.erreur : !(el.humain && el.humain.pret) ? 'pas encore en place : il manque les clés Cloudflare (touche la ligne)'
        : el.humain.coupe ? 'éteinte : les connexions ne demandent rien' : 'à la connexion de l’espace élève et de l’appli de l’équipe, le plus souvent sans rien demander',
      !!(el && el.humain && el.humain.pret && !el.humain.coupe),
      !el || el.erreur ? '<span class="bsPuce">…</span>' : !(el.humain && el.humain.pret) ? '<span class="bsPuce route">Clés manquantes</span>'
        : el.humain.coupe ? '<span class="bsPuce feuille">Éteinte</span>' : '<span class="bsPuce ok">Allumée</span>',
      bDetailHumain()) +
    bLigneReglage('archive', '📄', 'Archiver un dossier dans Cloudflare',
      !ar ? 'Lecture…' : ar.erreur ? ar.erreur : ar.cloudflare ? (ar.archives || []).length + ' archive' + ((ar.archives || []).length > 1 ? 's' : '') + ' dans Cloudflare' : 'éteint : l’archive part dans Google Drive, comme avant',
      !!(ar && ar.cloudflare), ar && !ar.erreur ? (ar.cloudflare ? '<span class="bsPuce ok">Cloudflare</span>' : '<span class="bsPuce feuille">Google Drive</span>') : '<span class="bsPuce">…</span>',
      bDetailArchive()) + '</div>';
  /* les autres feuilles, gardées en copie — sans celles déjà passées dans D1 */
  const dejaD1 = ((el && el.feuillesD1) || []).map(x => String(x).toLowerCase());
  const mi = ((el && el.miroirs && el.miroirs.plages) || []);
  const parFeuille = {};
  mi.forEach(x => {
    const f = String(x.plage).split('!')[0].replace(/^'|'$/g, '');
    if(dejaD1.indexOf(f.toLowerCase()) !== -1) return;
    const p = parFeuille[f] = parFeuille[f] || { ko: 0, quand: 0 };
    p.ko += Number(x.ko || 0); p.quand = Math.max(p.quand, Number(x.quand || 0));
  });
  const noms = Object.keys(parFeuille).sort((a, b) => a.localeCompare(b, 'fr'));
  if(noms.length){
    h += '<details class="bsCopies"' + (bOuvert.copies ? ' open' : '') + '><summary><span class="bsLogo">🪞</span><span class="bsNom"><b>Les autres feuilles, gardées en copie</b>' +
      '<small>' + noms.length + ' feuille' + (noms.length > 1 ? 's' : '') + ' encore dans Google, copiées dans D1 et relues quand elles changent</small></span><span class="bsChev" aria-hidden="true">›</span></summary>' +
      '<div class="bsDetail"><div class="cdAide">Lues depuis leur copie dans D1 (relue quand elles changent, ou au bout d’un quart d’heure), écrites dans Google comme avant. ' +
      'Ce sont les prochaines à passer dans D1.</div>' +
      '<div class="bsGrille">' + noms.map(f => '<div><b>' + bEch(f) + '</b><small>' + parFeuille[f].ko.toLocaleString('fr-FR') + ' Ko · ' + bEch(baseQuand(parFeuille[f].quand)) + '</small></div>').join('') + '</div>' +
      '<div class="baseBoutons"><button type="button" class="btn baseRetour" data-relire' + (bTravail.relire ? ' disabled' : '') + '>' + (bTravail.relire ? '⏳ Relecture…' : '🔄 Tout relire depuis Google') + '</button></div>' +
      '<div class="cdAide">Si quelqu’un a modifié une de ces feuilles à la main dans Google.</div></div></details>';
  }
  corps.innerHTML = h;
  corps.querySelector('.bsTout').addEventListener('click', bToutSauvegarder);
  corps.querySelectorAll('.bsL').forEach(l => {
    const cle = l.dataset.a || l.dataset.r;
    l.querySelector('.bsOuvrir').addEventListener('click', () => { bOuvert[cle] = !bOuvert[cle]; bDessiner(); });
    l.querySelector('.bsInter').addEventListener('click', () => l.dataset.a ? bBasculer(cle) : bReglage(cle));
  });
  corps.querySelectorAll('[data-sauver]').forEach(b => b.addEventListener('click', () => bAgir(b.dataset.sauver, 'sauvegarder')));
  corps.querySelectorAll('[data-comparer]').forEach(b => b.addEventListener('click', bComparer));
  corps.querySelectorAll('[data-archive]').forEach(b => b.addEventListener('click', () => bTelecharger(b.dataset.archive)));
  corps.querySelectorAll('[data-relire]').forEach(b => b.addEventListener('click', bToutRelire));
  const co = corps.querySelector('.bsCopies');
  if(co) co.addEventListener('toggle', () => { bOuvert.copies = co.open; });
}

async function bCharger(action){
  try{ bEtat[action] = await appelPrep({ action: action }); }
  catch(e){ bEtat[action] = { erreur: baseErreur(e) }; }
  if(baseSous === 'lu') bDessiner();
}
async function bAgir(action, quoi){
  const avant = bEtat[action] || {};
  bTravail[action] = quoi === 'revenir' ? 'Coupure…' : avant.actif ? 'Sauvegarde…' : 'Bascule…';
  bDessiner();
  try{ bEtat[action] = await appelPrep({ action: action, quoi: quoi }); }
  catch(e){
    let d = avant;
    try{ d = await appelPrep({ action: action }); }catch(e2){}
    bEtat[action] = Object.assign({}, d, { erreur: baseErreur(e), message: '' });
    bOuvert[action] = true;
  }
  bTravail[action] = '';
  bDessiner();
}
async function bBasculer(action){
  const def = BASE_TOUTES.find(x => x.action === action);
  const d = bEtat[action];
  if(!def || !d) return;
  if(!d.actif) return bAgir(action, 'sauvegarder');
  const oui = await confirmer('L’appli relira et écrira ' + def.mot + ' dans la feuille Google, plus lentement, comme avant.\n\n' +
    'Ça reste coupé jusqu’à ce que tu rallumes l’interrupteur : la nuit ne le rallume pas. Les administrateurs sont prévenus.',
    '↩️ Couper ' + def.nom.toLowerCase() + ' ?', true);
  if(oui) bAgir(action, 'revenir');
}
async function bReglage(cle){
  if(cle === 'eleve'){
    const on = !!(bReglages.eleve && bReglages.eleve.actif);
    if(on && !(await confirmer('L’espace élève repassera par Apps Script : une douzaine de secondes à chaque ouverture.', '⏸️ Éteindre l’espace élève sans Apps Script ?', true))) return;
    bTravail.eleve = '…'; bDessiner();
    try{ bReglages.eleve = await appelPrep({ action: 'baseEleve', quoi: on ? 'eteindre' : 'allumer' }); }
    catch(e){ if(typeof showToast === 'function') showToast('⚠️ ' + baseErreur(e)); }
  }else if(cle === 'humain'){
    const hu = (bReglages.eleve && bReglages.eleve.humain) || {};
    if(!hu.pret){ bOuvert.humain = true; bDessiner(); return; }
    const on = !hu.coupe;
    if(on && !(await confirmer('Les connexions (espace élève et appli de l’équipe) ne vérifieront plus que c’est une personne. Le compteur d’essais par adresse reste en place.', '⏸️ Éteindre la vérification ?', true))) return;
    bTravail.humain = '…'; bDessiner();
    try{ bReglages.eleve = await appelPrep({ action: 'baseEleve', quoi: on ? 'humainEteindre' : 'humainAllumer' }); }
    catch(e){ if(typeof showToast === 'function') showToast('⚠️ ' + baseErreur(e)); }
  }else{
    const on = !!(bReglages.archive && bReglages.archive.cloudflare);
    bTravail.archive = '…'; bDessiner();
    try{ bReglages.archive = await appelPrep({ action: 'baseArchive', quoi: on ? 'drive' : 'cloudflare' }); }
    catch(e){ if(typeof showToast === 'function') showToast('⚠️ ' + baseErreur(e)); }
  }
  bTravail[cle] = '';
  bDessiner();
}
async function bToutSauvegarder(){
  for(const def of BASE_TOUTES){
    if(bEtat[def.action] && bEtat[def.action].actif) await bAgir(def.action, 'sauvegarder');
  }
}
async function bToutRelire(){
  bTravail.relire = '…'; bDessiner();
  try{ bReglages.eleve = await appelPrep({ action: 'baseEleve', quoi: 'relire' }); }
  catch(e){ if(typeof showToast === 'function') showToast('⚠️ ' + baseErreur(e)); }
  bTravail.relire = ''; bDessiner();
}
async function bTelecharger(cle){
  try{
    const r = await appelPrep({ action: 'baseArchive', quoi: 'lien', cle: cle });
    if(r && r.lien) window.open(/^https?:/.test(r.lien) ? r.lien : CONFIG.WORKER_URL + r.lien, '_blank', 'noopener');
  }catch(e){ if(typeof showToast === 'function') showToast('⚠️ ' + baseErreur(e)); }
}
async function bComparer(){
  bComparaison = { faits: 0, total: 1, egaux: 0, ecarts: [] };
  bOuvert.eleve = true;
  bDessiner();
  let depuis = 0;
  try{
    for(let tour = 0; tour < 100 && depuis !== null; tour++){
      const r = await appelPrep({ action: 'baseEleve', quoi: 'comparer', depuis: depuis });
      const c = bComparaison;
      c.total = r.total || 0;
      (r.resultats || []).forEach(x => { c.faits++; if(x.egal) c.egaux++; else c.ecarts.push(x); });
      depuis = r.suivant;
      if(depuis === null || depuis === undefined){ depuis = null; c.faits = c.total; }
      if(baseSous === 'lu') bDessiner();
    }
  }catch(e){
    bComparaison.ecarts.push({ eleve: '—', erreur: 'Comparaison interrompue : ' + baseErreur(e) });
    bComparaison.faits = bComparaison.total;
  }
  if(baseSous === 'lu') bDessiner();
}

/* ============================================================
   📊 CE QUI INTERROGE LE SERVEUR (les noms lisibles : ec-conso.js)
   ============================================================ */
let bConsoJours = 1;
const bConsoMemo = {};
const bConsoEnVol = {};
async function bDessinerServeur(corps, frais){
  const j = bConsoJours;
  corps.innerHTML = '<div class="cdAide">Chaque requête du Worker, comptée par sa porte et son action, de la plus fréquente à la moins fréquente. ' +
    'Le compte est un peu en dessous du vrai total (ce qui n’est pas encore écrit quand Cloudflare éteint une instance).</div>' +
    '<div class="consoChoix"><button type="button" data-j="1"' + (j === 1 ? ' class="on"' : '') + '>24 heures</button>' +
    '<button type="button" data-j="7"' + (j === 7 ? ' class="on"' : '') + '>7 jours</button></div>' +
    '<div class="bsConso">' + (bConsoMemo[j] && !frais ? '' : ((typeof htmlAttente === 'function') ? htmlAttente('Lecture…') : '⏳')) + '</div>';
  corps.querySelectorAll('[data-j]').forEach(b => b.addEventListener('click', () => { bConsoJours = Number(b.dataset.j); bDessiner(); }));
  let d = !frais && bConsoMemo[j];
  if(!d){
    /* une seule lecture à la fois : l'écran se redessine pendant qu'elle part */
    if(!bConsoEnVol[j]) bConsoEnVol[j] = appelPrep({ action: 'consoRequetes', jours: j }).finally(() => { bConsoEnVol[j] = null; });
    try{ d = bConsoMemo[j] = await bConsoEnVol[j]; }
    catch(e){ const z = corps.querySelector('.bsConso'); if(z) z.innerHTML = '<div class="cdAide">⚠️ ' + bEch(baseErreur(e)) + '</div>'; return; }
  }
  if(baseSous !== 'serveur' || bConsoJours !== j) return;
  const zone = corps.querySelector('.bsConso');
  if(!zone) return;
  const nomDe = (k) => (typeof nomConso === 'function') ? nomConso(k) : k;
  const l = d.parCle || [], total = l.reduce((t, x) => t + x.n, 0), hh = d.parHeure || [];
  let h = '';
  if(!total){
    h = '<div class="cdAide">Rien de compté pour l’instant. Reviens dans une heure.</div>';
  }else{
    const heures = Math.max(1, hh.length), parJour = Math.round(total / heures * 24);
    const max = Math.max.apply(null, hh.map(x => x.n).concat(1));
    h += '<div class="consoTotal"><b>' + total.toLocaleString('fr-FR') + '</b> requêtes comptées sur ' + heures + ' h · à ce rythme : <b>~' + parJour.toLocaleString('fr-FR') + ' par jour</b>, ~' +
      (parJour * 30 / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M par mois sur 10 M inclus dans le forfait</div>' +
      '<div class="consoHeures" role="img" aria-label="Requêtes par heure">' + hh.map(x => '<span title="' +
        bEch(String(x.heure).slice(8, 10) + '/' + String(x.heure).slice(5, 7) + ' ' + String(x.heure).slice(11) + ' h : ' + x.n.toLocaleString('fr-FR') + ' requêtes') +
        '" style="height:' + Math.max(4, Math.round(x.n / max * 100)) + '%"></span>').join('') + '</div>' +
      '<div class="consoListe">' + l.slice(0, 40).map((x, i) => {
        const part = x.n / total * 100;
        return '<div class="consoLigne"><span class="consoRang">' + (i + 1) + '</span><span class="consoNom"><b>' + bEch(nomDe(x.cle)) + '</b><small>' + bEch(x.cle) + '</small>' +
          '<i class="consoBarre"><i style="width:' + Math.max(1, part).toFixed(1) + '%"></i></i></span><span class="consoN"><b>' + (part >= 1 ? Math.round(part) : part.toFixed(1)) + ' %</b><small>' + x.n.toLocaleString('fr-FR') + '</small></span></div>';
      }).join('') + '</div>';
  }
  const qui = ((bReglages.eleve && bReglages.eleve.miroirs && bReglages.eleve.miroirs.qui) || []);
  if(qui.length){
    h += '<div class="bsFam">Ce qui passe encore par Apps Script</div><div class="cdAide">Chacun de ces appels peut écrire dans Google : les copies sont alors relues. ' +
      'Ce sont les prochains à sortir d’Apps Script.</div><div class="baseListe">' + qui.slice(0, 15).map(x => '<div class="baseLigne"><span class="baseTexte"><b>' + bEch(x.action) + '</b> · ' +
      Number(x.n || 0).toLocaleString('fr-FR') + ' fois<small>dernier le ' + bEch(baseQuand(x.le)) + '</small></span></div>').join('') + '</div>';
  }
  zone.outerHTML = h;
}

/* ============================================================
   ☁️ CONSOMMATION CLOUDFLARE — ce que le forfait Workers Paid
   (5 $ par mois) inclut chaque mois, puis le prix au-delà.
   Tarifs relevés le 19/11/2026 sur developers.cloudflare.com.
   ============================================================ */
const BASE_CF = [
  { nom: 'Le Worker (bilan-proxy)', mesures: [
    { cle: 'req', logo: '📨', nom: 'Requêtes', inclus: 10e6, prix: 0.30, par: 1e6, unite: '', tarif: '0,30 $ le million',
      aide: 'Chaque appel de l’appli, de l’espace élève, des télés et des pages publiques (tous les Workers du compte).' },
    { cle: 'cpu', logo: '⏱️', nom: 'Temps de calcul', inclus: 30e6, prix: 0.02, par: 1e6, unite: 'ms', tarif: '0,02 $ le million de ms',
      aide: 'Le temps que le Worker passe à travailler (pas l’attente de Google ou de D1).' } ] },
  { nom: 'D1 (la base)', mesures: [
    { cle: 'd1l', logo: '📖', nom: 'Lignes lues', inclus: 25e9, prix: 0.001, par: 1e6, unite: '', tarif: '0,001 $ le million',
      aide: 'Chaque ligne que D1 parcourt pour répondre (les feuilles, la messagerie, le journal…).' },
    { cle: 'd1e', logo: '✏️', nom: 'Lignes écrites', inclus: 50e6, prix: 1, par: 1e6, unite: '', tarif: '1 $ le million',
      aide: 'Chaque ligne ajoutée ou changée dans D1.' },
    { cle: 'd1s', logo: '🗄️', nom: 'Taille de la base', inclus: 5, prix: 0.75, par: 1, unite: 'Go', stock: true, tarif: '0,75 $ le Go par mois',
      aide: 'La place prise par toutes les tables de D1.' } ] },
  { nom: 'KV (les comptes, les réglages)', mesures: [
    { cle: 'kvl', logo: '🔑', nom: 'Lectures', inclus: 10e6, prix: 0.5, par: 1e6, unite: '', tarif: '0,50 $ le million',
      aide: 'Les comptes de l’équipe, les codes, quelques réglages gardés à part.' },
    { cle: 'kve', logo: '✏️', nom: 'Écritures', inclus: 1e6, prix: 5, par: 1e6, unite: '', tarif: '5 $ le million',
      aide: 'Un compte ou un réglage écrit, effacé ou listé.' } ] },
  { nom: 'La messagerie en direct (Durable Objects)', mesures: [
    { cle: 'dor', logo: '⚡', nom: 'Requêtes', inclus: 1e6, prix: 0.15, par: 1e6, unite: '', tarif: '0,15 $ le million',
      aide: 'Les messages et les connexions en direct de la messagerie.' },
    { cle: 'dod', logo: '⏳', nom: 'Durée', inclus: 400000, prix: 12.5, par: 1e6, unite: 'Go-s', tarif: '12,50 $ le million de Go-s',
      aide: 'Le temps où une conversation en direct reste active.' } ] },
  { nom: 'R2 (vidéos, photos, sons)', mesures: [
    { cle: 'r2s', logo: '🎬', nom: 'Stockage', inclus: 10, prix: 0.015, par: 1, unite: 'Go', stock: true, tarif: '0,015 $ le Go par mois',
      aide: 'Les vidéos du coin révisions, les photos et les vocaux de la messagerie.' },
    { cle: 'r2a', logo: '📤', nom: 'Dépôts (opérations A)', inclus: 1e6, prix: 4.5, par: 1e6, unite: '', tarif: '4,50 $ le million',
      aide: 'Un fichier déposé, remplacé, ou une liste de fichiers demandée.' },
    { cle: 'r2b', logo: '📥', nom: 'Lectures (opérations B)', inclus: 10e6, prix: 0.36, par: 1e6, unite: '', tarif: '0,36 $ le million',
      aide: 'Une vidéo, une photo ou un son ouvert.' } ] }
];
let bCfPeriode = 'mois';
const bCfMemo = {};
const bCfOuvert = {};
let bCfTop = null;
function bNombre(v, unite){
  const n = Number(v || 0);
  if(unite === 'Go') return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' Go';
  if(unite === 'Go-s') return Math.round(n).toLocaleString('fr-FR') + ' Go-s';
  const s = unite === 'ms' ? ' ms' : '';
  if(n >= 1e9) return (n / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' Md' + s;
  if(n >= 1e6) return (n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' M' + s;
  if(n >= 1e4) return Math.round(n / 1e3).toLocaleString('fr-FR') + ' k' + s;
  return Math.round(n).toLocaleString('fr-FR') + s;
}
const bDollars = (v) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
const BASE_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function bDessinerJeton(d){
  return '<div class="bsResume"><div class="bsResumeTexte"><b>🔑 Il faut un jeton pour lire les chiffres de Cloudflare</b>' +
    '<small>Un jeton en lecture seule, qui ne permet que de lire les statistiques du compte. ' + (d.jeton && !d.compte ? 'Le jeton est là, il manque l’identifiant du compte.' : '') + '</small></div></div>' +
    '<ol class="bsEtapes">' +
    '<li>Sur Cloudflare : ton profil (en haut à droite) › <b>Jetons d’API</b> (API Tokens) › <b>Créer un jeton</b> › <b>Jeton personnalisé</b>.</li>' +
    '<li>Autorisations : <b>Compte</b> · <b>Account Analytics</b> · <b>Lecture</b> (Read). Ressources du compte : ton compte. Rien d’autre.</li>' +
    '<li>Dans le Worker <b>bilan-proxy</b> › Paramètres › Variables et secrets : ajoute <b>CF_API_TOKEN</b> (le jeton, en <i>secret</i>) ' +
    'et <b>CF_ACCOUNT_ID</b> (l’identifiant du compte, à droite de la page d’accueil du compte, « Account ID »).</li>' +
    '<li>Reviens ici et touche <b>🔄 Relire</b>.</li></ol>' +
    '<div class="baseBoutons"><button type="button" class="btn baseRetour" data-cfrelire>🔄 Relire</button></div>';
}
async function bDessinerCloudflare(corps, frais){
  const p = bCfPeriode;
  if(frais || !bCfMemo[p]){
    corps.innerHTML = (typeof htmlAttente === 'function') ? htmlAttente('Lecture chez Cloudflare…') : '⏳ Lecture chez Cloudflare…';
    try{ bCfMemo[p] = await appelPrep({ action: 'consoCloudflare', periode: p, frais: frais ? 1 : 0 }); }
    catch(e){ corps.innerHTML = '<div class="cdAide">⚠️ ' + bEch(baseErreur(e)) + '</div><div class="baseBoutons"><button type="button" class="btn baseRetour" data-cfrelire>🔄 Relire</button></div>';
      corps.querySelectorAll('[data-cfrelire]').forEach(b => b.addEventListener('click', () => bDessinerCloudflare(corps, true))); return; }
    if(baseSous !== 'cloudflare' || bCfPeriode !== p) return;
  }
  const d = bCfMemo[p];
  if(d.manque){
    corps.innerHTML = bDessinerJeton(d);
    corps.querySelectorAll('[data-cfrelire]').forEach(b => b.addEventListener('click', () => bDessinerCloudflare(corps, true)));
    return;
  }
  const mois = p === 'mois';
  const ecoules = Math.max(1, (d.jours || []).length);
  const joursDuMois = Number(d.joursDuMois || 30);
  const erreurs = d.erreurs || {};
  let depasse = 0, nbErreurs = 0;
  const lignes = [];
  BASE_CF.forEach(g => g.mesures.forEach(m => {
    const serie = ((d.series || {})[m.cle] || []).map(Number);
    const brute = m.stock ? (serie.filter(v => v > 0).slice(-1)[0] || 0) : serie.reduce((t, v) => t + v, 0);
    const utilise = m.stock ? brute / 1e9 : brute;
    const parJour = m.stock ? serie.map(v => v / 1e9) : serie;
    const prevu = (m.stock || !mois) ? utilise : utilise / ecoules * joursDuMois;
    const cout = erreurs[m.cle] ? 0 : Math.max(0, prevu - m.inclus) * m.prix / m.par;
    if(erreurs[m.cle]) nbErreurs++;
    depasse += cout;
    lignes.push(Object.assign({ groupe: g.nom, utilise, parJour, prevu, cout, erreur: erreurs[m.cle] }, m));
  }));
  const debut = new Date(String(d.debut || '') + 'T12:00:00Z'), fin = new Date(String(d.fin || '') + 'T12:00:00Z');
  const nomMois = BASE_MOIS[fin.getUTCMonth()] || '';
  const titreMois = nomMois.charAt(0).toUpperCase() + nomMois.slice(1);
  const jj = (t) => t.getUTCDate() === 1 ? '1er' : String(t.getUTCDate());
  let h = '<div class="bsResume' + (depasse < 0.01 && !nbErreurs ? ' ok' : '') + '"><div class="bsResumeTexte"><b>' +
    (mois ? (depasse < 0.01 ? '✅ ' + titreMois + ' : rien de plus que le forfait (5,00 $)' : '⚠️ ' + titreMois + ' : ~' + bDollars(5 + depasse) + ' (forfait 5,00 $ + ' + bDollars(depasse) + ' de dépassement)')
          : (depasse < 0.01 ? '✅ 30 derniers jours : rien de plus que le forfait (5,00 $)' : '⚠️ 30 derniers jours : ' + bDollars(depasse) + ' au-delà du forfait')) + '</b>' +
    '<small>' + (mois ? 'Du ' + jj(debut) + ' au ' + jj(fin) + ' ' + nomMois + ', à ce rythme jusqu’au ' + joursDuMois : 'Du ' + baseJour(debut.getTime()) + ' au ' + baseJour(fin.getTime())) +
    ' · chiffres de Cloudflare lus le ' + bEch(baseQuand(d.lu)) + ' (ils ont environ une heure de retard)' +
    (nbErreurs ? ' · ⚠️ ' + nbErreurs + ' mesure' + (nbErreurs > 1 ? 's' : '') + ' illisible' + (nbErreurs > 1 ? 's' : '') : '') + '</small></div>' +
    '<button type="button" class="btn baseRetour bsPetit" data-cfrelire>🔄 Relire</button></div>' +
    '<div class="consoChoix"><button type="button" data-p="mois"' + (mois ? ' class="on"' : '') + '>Ce mois-ci</button>' +
    '<button type="button" data-p="30"' + (!mois ? ' class="on"' : '') + '>30 derniers jours</button></div>';
  let groupe = '';
  lignes.forEach(m => {
    if(m.groupe !== groupe){ if(groupe) h += '</div>'; groupe = m.groupe; h += '<div class="bsFam">' + bEch(groupe) + '</div><div class="bsListe">'; }
    const part = m.utilise / m.inclus * 100, partPrevu = m.prevu / m.inclus * 100;
    const niveau = partPrevu >= 100 ? 'ko' : partPrevu >= 80 ? 'route' : 'ok';
    const ouvert = !!bCfOuvert[m.cle];
    h += '<div class="bsL' + (ouvert ? ' ouvert' : '') + '" data-cf="' + m.cle + '"><div class="bsTete"><button type="button" class="bsOuvrir" aria-expanded="' + ouvert + '">' +
      '<span class="bsLogo">' + m.logo + '</span><span class="bsNom"><b>' + bEch(m.nom) + '</b>';
    if(m.erreur){
      h += '<small>⚠️ Illisible chez Cloudflare</small></span><span class="bsPart"><b>—</b></span>';
    }else{
      h += '<small>' + bNombre(m.utilise, m.unite) + ' sur ' + bNombre(m.inclus, m.unite) + ' inclus' + (m.stock || !mois ? '' : ' · fin du mois ~' + bNombre(m.prevu, m.unite)) + '</small>' +
        '<i class="bsJauge"><i class="' + niveau + '" style="width:' + Math.min(100, Math.max(0.6, part)).toFixed(1) + '%"></i>' +
        (m.stock || !mois ? '' : '<i class="bsPrevu" style="left:' + Math.min(100, partPrevu).toFixed(1) + '%"></i>') + '</i></span>' +
        '<span class="bsPart"><b>' + (part >= 10 ? Math.round(part) : part.toLocaleString('fr-FR', { maximumFractionDigits: 1 })) + ' %</b><small>' + (m.cout >= 0.01 ? '+' + bDollars(m.cout) : 'inclus') + '</small></span>';
    }
    h += '<span class="bsChev" aria-hidden="true">›</span></button></div>';
    if(ouvert){
      h += '<div class="bsDetail"><div class="cdAide">' + bEch(m.aide) + ' Au-delà de ' + bNombre(m.inclus, m.unite) + ' par mois : ' + bEch(m.tarif) + '.</div>';
      if(m.erreur){
        h += '<div class="baseMsg baseKo">⚠️ ' + bEch(m.erreur) + '</div>';
      }else{
        const mx = Math.max.apply(null, m.parJour.concat(m.stock ? 0.001 : 1));
        h += '<div class="consoHeures bsJours" role="img" aria-label="' + bEch(m.nom) + ' par jour">' + m.parJour.map((v, i) =>
          '<span title="' + bEch(baseJour(Date.parse(d.jours[i] + 'T12:00:00Z')) + ' : ' + bNombre(v, m.unite)) + '" style="height:' + Math.max(3, Math.round(v / mx * 100)) + '%"></span>').join('') + '</div>' +
          '<div class="bsAxe"><span>' + bEch(baseJour(debut.getTime())) + '</span><span>' + bEch(baseJour(fin.getTime())) + '</span></div>';
        if(m.cle === 'req' && bCfTop && bCfTop.length){
          h += '<div class="bsSousTitre">Ce qui en consomme le plus (notre compte, 7 derniers jours)</div><div class="baseListe">' + bCfTop.slice(0, 5).map(x =>
            '<div class="baseLigne"><span class="baseTexte"><b>' + bEch((typeof nomConso === 'function') ? nomConso(x.cle) : x.cle) + '</b> · ' + bNombre(x.n, '') + '</span></div>').join('') + '</div>';
        }
      }
      h += '</div>';
    }
    h += '</div>';
  });
  if(groupe) h += '</div>';
  h += '<div class="cdAide bsNote">Les chiffres sont ceux de Cloudflare pour tout le compte. Les prix sont ceux de l’offre Workers Paid (5 $ par mois) : ce qui est inclus chaque mois, ' +
    'puis le prix au-delà. Les vidéos, photos et sons (R2) ont leurs propres 10 Go gratuits.</div>';
  corps.innerHTML = h;
  corps.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { bCfPeriode = b.dataset.p; bDessiner(); }));
  corps.querySelectorAll('[data-cfrelire]').forEach(b => b.addEventListener('click', () => bDessinerCloudflare(corps, true)));
  corps.querySelectorAll('[data-cf]').forEach(l => l.querySelector('.bsOuvrir').addEventListener('click', () => {
    const k = l.dataset.cf;
    bCfOuvert[k] = !bCfOuvert[k];
    if(k === 'req' && bCfOuvert[k] && !bCfTop){
      appelPrep({ action: 'consoRequetes', jours: 7 }).then(r => { bCfTop = (r && r.parCle) || []; if(baseSous === 'cloudflare') bDessiner(); }).catch(() => {});
    }
    bDessiner();
  }));
}

/* ============================================================
   L'écran, et ce qui l'ouvre
   ============================================================ */
function bDessiner(){
  const z = document.getElementById('baseZone');
  if(!z) return;
  if(!z.querySelector('.bsSous')){
    z.innerHTML = '<h2 class="section-title">🗄️ La base de l’appli</h2>' +
      '<div class="bsSous" role="tablist" aria-label="La base de l’appli">' + BASE_SOUS.map(s => '<button type="button" role="tab" data-sous="' + s.cle + '">' + bEch(s.nom) + '</button>').join('') + '</div>' +
      '<div class="bsCorps"></div>';
    z.querySelectorAll('[data-sous]').forEach(b => b.addEventListener('click', () => {
      baseSous = b.dataset.sous;
      try{ localStorage.setItem('ecBaseSous', baseSous); }catch(e){}
      bDessiner();
    }));
  }
  z.querySelectorAll('[data-sous]').forEach(b => { const on = b.dataset.sous === baseSous; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  const corps = z.querySelector('.bsCorps');
  if(baseSous === 'lu') bDessinerLu(corps);
  else if(baseSous === 'serveur') bDessinerServeur(corps);
  else bDessinerCloudflare(corps);
}
async function chargerBaseServeur(){
  const z = document.getElementById('baseZone');
  if(!z) return;
  if(window.EC_POSTE || typeof ACCES === 'undefined' || !ACCES || ACCES.role !== 'admin'){ z.innerHTML = ''; return; }
  /* en revenant sur l'écran, tout se relit (le compte des requêtes et Cloudflare aussi) */
  Object.keys(bConsoMemo).forEach(k => delete bConsoMemo[k]);
  bDessiner();
  BASE_TOUTES.forEach(def => bCharger(def.action));
  appelPrep({ action: 'baseEleve' }).then(d => { bReglages.eleve = d; }).catch(e => { bReglages.eleve = { erreur: baseErreur(e) }; })
    .then(() => { if(baseSous !== 'cloudflare') bDessiner(); });
  appelPrep({ action: 'baseArchive' }).then(d => { bReglages.archive = d; }).catch(e => { bReglages.archive = { erreur: baseErreur(e) }; })
    .then(() => { if(baseSous === 'lu') bDessiner(); });
}

/* Toucher la notification « ✂️ Coupé » ou « Toujours coupé » ouvre cet écran */
(function(){
  const aller = () => { try{ baseSous = 'lu'; afficherOnglet('gestion'); afficherVue('gestion', 'base'); }catch(e){} };
  try{
    const u = new URL(location.href);
    if(u.searchParams.get('vue') === 'base'){
      u.searchParams.delete('vue');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
      setTimeout(aller, 1500);
    }
  }catch(e){}
  if(navigator.serviceWorker){
    navigator.serviceWorker.addEventListener('message', ev => {
      const d = ev && ev.data;
      if(d && d.quoi === 'ouvrirVue' && d.vue === 'base') aller();
    });
  }
})();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-base.js'] = true;
