/* Déployé le 01/09/2026 à 14:39 — v774 */
/* ============================================================
   ec-version.js
   Rester à jour sans jamais interrompre un cours.

   Le problème : le navigateur garde index.html en mémoire, donc
   les numéros ?v= des modules aussi. Un moniteur peut travailler
   des jours sur une version dépassée sans le savoir.

   La réponse : l'application relit sa propre page à heures fixes
   et compare. Ces heures sont celles où personne ne conduit —
   avant l'ouverture, à midi, en fin de journée.

   Rien ne se recharge tant qu'un cours est en route. Un bilan
   dicté vaut plus qu'une mise à jour.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les créneaux où l'on accepte de regarder. Entre les cours,
   jamais pendant. */
const CRENEAUX_VERSION = [
  { de: '07:50', a: '08:00' },
  { de: '12:15', a: '13:00' },
  { de: '19:05', a: '20:00' }
];

/* Toutes les cinq minutes on regarde l'heure ; c'est assez fin
   pour attraper un créneau de dix minutes. */
const PAS_VERSION = 5 * 60 * 1000;

let versionChargee = '';
let minuteurVersion = null;
let dernierControle = '';
let bandeauVersionPose = false;


/* La version que porte cette page */
function lireVersionChargee(){
  if(versionChargee) return versionChargee;

  /* Le numéro suit les modules : app/ec-noyau.js?v=487 */
  const s = document.querySelector('script[src*="ec-noyau.js"]');
  if(s){
    const m = String(s.getAttribute('src') || '').match(/[?&]v=(\d+)/);
    if(m){ versionChargee = m[1]; return versionChargee; }
  }

  /* À défaut, celui affiché en bas de page */
  const z = document.getElementById('versionApp');
  if(z){
    const m = String(z.textContent || '').match(/v(\d+)/);
    if(m){ versionChargee = m[1]; return versionChargee; }
  }
  return '';
}


/* Sommes-nous dans un créneau ? */
function dansUnCreneau(){
  const d = new Date();
  const maintenant = String(d.getHours()).padStart(2, '0') + ':' +
                     String(d.getMinutes()).padStart(2, '0');

  return CRENEAUX_VERSION.some(c => maintenant >= c.de && maintenant <= c.a);
}


/* Ce qui interdit de recharger.

   Trois verrous plutôt qu'un : un enregistrement en cours, un
   bilan non enregistré, une fenêtre ouverte. Chacun seul
   suffirait à faire perdre du travail. */
function travailEnCours(){
  /* Le micro tourne */
  if(typeof isRecording !== 'undefined' && isRecording) return true;

  /* Une transcription commencée, même mise en pause */
  if(typeof finalTranscript !== 'undefined' &&
     String(finalTranscript || '').trim()) return true;
  if(typeof committedTranscript !== 'undefined' &&
     String(committedTranscript || '').trim()) return true;

  /* Un bilan à l'écran, pas encore enregistré */
  const r = document.getElementById('resultText');
  if(r && r.value.trim()){
    if(typeof bilanEnregistre === 'undefined' || !bilanEnregistre) return true;
  }

  /* Une fenêtre ouverte : le moniteur est en train de saisir */
  if(document.querySelector('.overlay.show')) return true;

  /* Un nom d'élève saisi sans cours terminé */
  const n = document.getElementById('studentName');
  if(n && n.value.trim() && r && !r.value.trim()) return true;

  return false;
}


/* Va relire index.html et compare */
async function controlerVersion(){
  const ici = lireVersionChargee();
  if(!ici) return;

  try{
    /* Sans no-store, on relirait la page du cache — c'est
       précisément ce qu'on cherche à contourner. */
    const r = await fetch('index.html?_=' + Date.now(), { cache: 'no-store' });
    if(!r.ok) return;

    const texte = await r.text();
    const m = texte.match(/ec-noyau\.js\?v=(\d+)/);
    if(!m) return;

    const enLigne = m[1];
    if(enLigne === ici) return;

    /* Une nouvelle version existe */
    if(travailEnCours()){
      /* On attend : le prochain passage réessaiera */
      poserBandeauVersion(enLigne, false);
      return;
    }

    /* Rien en cours : on recharge sans rien demander */
    rechargerVraiment();
  }catch(e){ /* hors ligne : on réessaiera */ }
}


/* Recharge en contournant le cache */
function rechargerVraiment(){
  try{
    /* L'adresse change, donc le navigateur va vraiment chercher */
    const u = new URL(window.location.href);
    u.searchParams.set('maj', Date.now());
    window.location.replace(u.toString());
  }catch(e){
    window.location.reload(true);
  }
}


/* Le bandeau, quand on ne peut pas recharger tout de suite */
function poserBandeauVersion(nouvelle, forcer){
  if(bandeauVersionPose) return;
  bandeauVersionPose = true;

  const b = document.createElement('div');
  b.id = 'bandeauVersion';
  b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9998;' +
    'background:var(--orange);color:var(--navy-deep);' +
    'padding:12px 14px;display:flex;gap:10px;align-items:center;' +
    'font-size:13px;line-height:1.4;box-shadow:0 -2px 12px rgba(0,0,0,.3);' +
    'padding-bottom:calc(12px + env(safe-area-inset-bottom));';

  b.innerHTML = '<span style="flex:1;min-width:0;">' +
    '<strong>Nouvelle version disponible</strong>' +
    '<div style="font-size:11px;opacity:.8;">Elle s\'installera dès que ' +
    'tu auras terminé ton cours.</div></span>';

  const bOk = document.createElement('button');
  bOk.textContent = 'Plus tard';
  bOk.style.cssText = 'flex-shrink:0;padding:9px 13px;border-radius:8px;' +
    'border:1px solid rgba(0,0,0,.25);background:transparent;' +
    'color:var(--navy-deep);font-size:13px;font-weight:700;cursor:pointer;';
  bOk.addEventListener('click', () => {
    b.remove();
    bandeauVersionPose = false;
  });
  b.appendChild(bOk);

  const bMaj = document.createElement('button');
  bMaj.textContent = '↻ Installer';
  bMaj.style.cssText = 'flex-shrink:0;padding:9px 13px;border-radius:8px;' +
    'border:none;background:var(--navy-deep);color:var(--orange);' +
    'font-size:13px;font-weight:700;cursor:pointer;';
  bMaj.addEventListener('click', async () => {
    /* Même ici on prévient : le moniteur peut avoir oublié */
    if(travailEnCours()){
      if(typeof confirmer === 'function'){
        const ok = await confirmer('Un cours est en route.\n\n' +
          'Installer maintenant fera perdre ce qui est à l\'écran. ' +
          'Termine plutôt ton bilan, la mise à jour attendra.');
        if(!ok) return;
      }else{
        return;
      }
    }
    rechargerVraiment();
  });
  b.appendChild(bMaj);

  document.body.appendChild(b);
}


/* Le contrôle passe une fois par créneau, pas cinq */
function peutControler(){
  if(!dansUnCreneau()) return false;

  const d = new Date();
  const cle = d.toISOString().slice(0, 10) + ' ' +
              CRENEAUX_VERSION.findIndex(c => {
                const h = String(d.getHours()).padStart(2, '0') + ':' +
                          String(d.getMinutes()).padStart(2, '0');
                return h >= c.de && h <= c.a;
              });

  if(dernierControle === cle) return false;
  dernierControle = cle;
  return true;
}


function lancerSurveillanceVersion(){
  clearInterval(minuteurVersion);
  lireVersionChargee();

  minuteurVersion = setInterval(() => {
    if(peutControler()) controlerVersion();
  }, PAS_VERSION);

  /* Au retour sur l'onglet : c'est le moment où l'on ouvre
     l'application après l'avoir laissée de côté. */
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible' && peutControler()){
      controlerVersion();
    }
  });
}


/* ============================================================
   LE CONTRÔLE À LA DEMANDE

   Un moniteur dont l'écran est figé sur une vieille version voit
   des anomalies déjà corrigées. Le bouton lui dit où il en est.
   ============================================================ */

async function verifierVersionMaintenant(){
  const b = $('versionBtn');
  const ancien = b ? b.textContent : '';
  if(b){ b.disabled = true; b.textContent = '⏳'; }

  const ici = lireVersionChargee();

  try{
    /* On demande la page elle-même, sans passer par le cache */
    const r = await fetch('index.html?v=' + Date.now(),
                          { cache: 'no-store' });
    const t = await r.text();
    const m = t.match(/\?v=(\d+)/);
    const laBas = m ? Number(m[1]) : 0;

    if(!laBas){
      await informer('La version en ligne n\'a pas pu être lue.\n\n' +
                     'Version chargée ici : v' + ici, 'Version');
      return;
    }

    if(laBas > ici){
      if(await confirmer(
          'Ton écran est en v' + ici + ', la dernière est la v' + laBas +
          '.\n\nRecharger maintenant ?\n' +
          'Ce qui est en cours sera gardé.', 'Mise à jour')){
        rechargerVraiment();
      }
      return;
    }

    await informer('Tu as bien la dernière version : v' + ici + '.' +
                   (await etatDeLaSerrure()), 'Version à jour');
  }catch(e){
    await informer('La vérification a échoué.\n\n' +
                   'Version chargée ici : v' + ici + '\n' +
                   'Détail : ' + (e.message || e), 'Version');
  }finally{
    if(b){ b.disabled = false; b.textContent = ancien || '🔄'; }
  }
}


/* ------------------------------------------------------------
   LA SERRURE DU CLASSEUR, EN CLAIR

   Le secret partagé se pose à la main des deux côtés : dans les
   propriétés du script Google, et dans les variables du Worker. Un
   réglage à la main se croit fait alors qu'il ne l'est qu'à
   moitié — et on se croirait alors protégé.

   Cette ligne le dit, dans la fenêtre que l'administratrice ouvre
   déjà pour vérifier sa version. Elle ne montre jamais le secret :
   seulement s'il y en a un de chaque côté, et s'ils se répondent.
   ------------------------------------------------------------ */
async function etatDeLaSerrure(){
  if(typeof ACCES === 'undefined' || !ACCES || ACCES.role !== 'admin') return '';
  try{
    const d = await appelPrep({ action: 'diagnostic' });
    if(!d) return '';

    /* LA VERSION D'ABORD, ET DANS TOUS LES CAS.

       Un message qui dit « le classeur est encore ouvert » sans dire
       QUELLE version du script a répondu envoie chercher une
       propriété mal écrite, alors que le vrai coupable est presque
       toujours ailleurs : le code a été collé, mais pas DÉPLOYÉ.
       Apps Script sert la dernière version publiée, pas celle de
       l'éditeur. Le numéro le dit d'un coup d'œil. */
    const vs = Number(d.versionScript || 0);
    const attendue = Number(CONFIG.VERSION_SCRIPT_ATTENDUE || 0);
    const ou = (typeof d.secretWorker === 'string')
      ? ('\nCôté Cloudflare : secret ' + (d.secretWorker === 'pose'
          ? 'posé ✅' : 'ABSENT ❌') + '.') : '';

    if(vs && attendue && vs < attendue){
      return '\n\n🔓 Le classeur répond en script v' + vs +
             ', alors que cette version en attend v' + attendue + '.\n\n' +
             "Le code a été collé mais pas déployé : dans Apps Script, " +
             'Déployer → Gérer les déploiements → ✏️ → Version : ' +
             '« Nouvelle version » → Déployer.' + ou;
    }

    if(d.serrure !== 'armee'){
      return '\n\n🔓 Le classeur est encore ouvert à tous — script v' +
             (vs || '?') + '.\n\n' +
             'La propriété SECRET_PARTAGE est absente ou vide. Apps ' +
             'Script → ⚙️ Paramètres du projet → Propriétés du script ' +
             '(pas les propriétés utilisateur), nom exact en ' +
             'majuscules.' + ou;
    }
    if(d.secretRecu !== 'oui'){
      return '\n\n🛑 LE CLASSEUR EST VERROUILLÉ ET LE WORKER N\'ENVOIE ' +
             'AUCUN SECRET.\n\nPlus rien ne passe : ni les élèves, ni ' +
             'les bilans.\n\n' +
             'Pour rouvrir tout de suite : retire SECRET_PARTAGE des ' +
             'propriétés du script.\n' +
             'Puis ajoute SHEETS_SECRET dans les variables du Worker ' +
             '(et appuie sur Deploy).' + ou;
    }
    if(d.secretJuste === false){
      return '\n\n⚠️ Les deux secrets ne se répondent pas — une faute ' +
             'de frappe, ou un espace au bout.\n\n' +
             'Rien ne passe : retire SECRET_PARTAGE du script pour ' +
             'rouvrir, puis recopie-le des deux côtés.' + ou;
    }
    /* LE MÉNAGE NE PARLE QUE QUAND IL A FAIT QUELQUE CHOSE — il
       fallait donc un endroit où il dise simplement qu'il tourne.
       Sans ça, « aucun signalement » voudrait dire à la fois
       « rien à nettoyer » et « le déclencheur n'a jamais été
       posé », et ce n'est pas la même chose du tout. */
    const m = String(d.menageDernierPassage || '');
    const menage = m
      ? '\n🧹 Dernier ménage : ' + m + '.'
      : "\n🧹 Le ménage n'a jamais tourné — lance « installerMenage » " +
        "une fois depuis l'éditeur Apps Script.";

    return '\n\n🔒 Classeur verrouillé — script v' + (vs || '?') + '.' + menage;
  }catch(e){
    /* Une vérification qui échoue ne dit rien de la serrure : on
       se tait plutôt que d'affirmer. */
    return '';
  }
}


/* Le bouton n'apparaît qu'une fois connecté */
function brancherBoutonVersion(){
  const b = $('versionBtn');
  if(!b || b.dataset.branche) return;
  b.dataset.branche = 'oui';
  b.addEventListener('click', verifierVersionMaintenant);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-version.js'] = true;
