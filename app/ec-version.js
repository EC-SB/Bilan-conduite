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

    await informer('Tu as bien la dernière version : v' + ici + '.',
                   'Version à jour');
  }catch(e){
    await informer('La vérification a échoué.\n\n' +
                   'Version chargée ici : v' + ici + '\n' +
                   'Détail : ' + (e.message || e), 'Version');
  }finally{
    if(b){ b.disabled = false; b.textContent = ancien || '🔄'; }
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
