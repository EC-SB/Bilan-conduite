/* ============================================================
   ec-onglets.js
   Navigation par onglets.
   Un moniteur en voiture ne voit que ce qui le concerne ;
   le bureau retrouve ses listes en un geste.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const CLE_ONGLET = 'onglet_actif';

/* Quelles sections rendent un onglet utile.
   Un onglet dont aucune section n'est autorisée disparaît. */
const SECTIONS_ONGLET = {
  cours:  ['prepares', 'cours'],
  eleves: ['recherche', 'permis', 'depart'],
  suivi:  ['bureau_simu', 'bureau_examblanc'],
  permis: ['bureau_permis', 'bureau_places'],
  outils: ['bureau_messages', 'textes', 'procedures', 'bilans',
           'sms', 'stats', 'admin']
};

let ongletActif = '';

/* Les onglets réellement accessibles à cette personne */
function ongletsDisponibles(){
  return Object.keys(SECTIONS_ONGLET).filter(o => {
    if(o === 'outils' && ACCES.role === 'admin') return true;
    return SECTIONS_ONGLET[o].some(s => typeof aDroit === 'function' && aDroit(s));
  });
}

function afficherOnglet(cle, memoriser){
  const dispo = ongletsDisponibles();
  if(dispo.indexOf(cle) === -1) cle = dispo[0];
  if(!cle) return;

  ongletActif = cle;

  /* Les blocs des autres onglets se retirent de l'affichage */
  document.querySelectorAll('[data-onglet]').forEach(el => {
    el.classList.toggle('hors-onglet', el.getAttribute('data-onglet') !== cle);
  });

  document.querySelectorAll('#barreOnglets .onglet').forEach(b => {
    b.classList.toggle('actif', b.getAttribute('data-cible') === cle);
    b.setAttribute('aria-selected', b.getAttribute('data-cible') === cle ? 'true' : 'false');
  });

  if(memoriser !== false){
    try{ localStorage.setItem(CLE_ONGLET, cle); }catch(e){}
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  /* Chaque onglet charge ce dont il a besoin, à son ouverture */
  reveillerOnglet(cle);
}

/* Ce qu'il faut mettre à jour en arrivant sur un onglet */
function reveillerOnglet(cle){
  if(cle === 'cours' && typeof afficherPrepares === 'function' && aDroit('cours')){
    afficherPrepares(true, true);
  }
  if((cle === 'suivi' || cle === 'permis') && typeof afficherBureau === 'function'){
    afficherBureau(bureauDejaCharge);
  }
  if(cle === 'permis' && typeof afficherMessengerPermis === 'function'){
    /* La liste des dates suit les permis prévus */
  }
}

/* Masque les onglets sans contenu et branche les boutons */
function initOnglets(){
  const barre = $('barreOnglets');
  if(!barre) return;

  document.body.classList.add('avec-onglets');
  const dispo = ongletsDisponibles();

  barre.querySelectorAll('.onglet').forEach(b => {
    const cle = b.getAttribute('data-cible');
    b.hidden = (dispo.indexOf(cle) === -1);
    if(!b.dataset.branche){
      b.dataset.branche = 'oui';
      b.addEventListener('click', () => afficherOnglet(cle));
    }
  });

  barre.style.display = (dispo.length > 1) ? 'flex' : 'none';

  let depart = '';
  try{ depart = localStorage.getItem(CLE_ONGLET) || ''; }catch(e){}
  if(dispo.indexOf(depart) === -1) depart = dispo[0];
  afficherOnglet(depart, false);
}


/* ============================================================
   PREMIER GESTE DU MONITEUR
   S'il a un cours préparé pour aujourd'hui, c'est ce qu'il ouvre.
   Sinon, il démarre un cours directement.
   ============================================================ */
function ouvrirLeBonTiroirDuJour(){
  const tPrep = document.querySelector('[data-tiroir="prepares"]');
  const tCours = document.querySelector('[data-tiroir="cours"]');
  if(!tPrep || !tCours) return;

  const auj = todayLocal();
  const moi = normaliserMot(ACCES.moniteur || '');
  const duJour = (prepares || []).filter(x =>
    x.date === auj && (!x.moniteur || normaliserMot(x.moniteur) === moi));

  if(duJour.length){
    tPrep.open = true;
    tCours.open = false;
  }else{
    tPrep.open = false;
    tCours.open = true;
  }
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-onglets.js'] = true;
