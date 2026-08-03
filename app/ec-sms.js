/* ============================================================
   ec-sms.js
   Intégration de l'outil d'envoi de SMS, hébergé au même endroit.
   Il n'est chargé qu'à l'ouverture du tiroir : inutile de le
   télécharger pour quelqu'un qui ne s'en sert pas.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const URL_SMS = 'https://ec-sb.github.io/SMS2/';

let cadreSmsCharge = false;

function chargerCadreSms(){
  const zone = $('smsCadre');
  if(!zone || cadreSmsCharge) return;

  zone.innerHTML = '';

  const attente = document.createElement('div');
  attente.className = 'empty';
  attente.textContent = "Chargement de l'outil d'envoi…";
  zone.appendChild(attente);

  const cadre = document.createElement('iframe');
  cadre.src = URL_SMS;
  cadre.title = 'Envoi de SMS';
  cadre.setAttribute('loading', 'lazy');
  /* Il a besoin de son stockage pour retenir la session et le journal */
  cadre.setAttribute('allow', 'clipboard-write');
  cadre.style.cssText = 'width:100%;height:70vh;min-height:520px;border:0;display:block;' +
    'background:var(--navy);';

  cadre.addEventListener('load', () => {
    if(attente.parentNode) zone.removeChild(attente);
    cadreSmsCharge = true;
  });

  /* Si l'outil ne répond pas, on ne laisse pas un cadre vide */
  setTimeout(() => {
    if(cadreSmsCharge) return;
    if(!attente.parentNode) return;
    attente.innerHTML = "⚠️ L'outil d'envoi met du temps à répondre.<br>" +
      '<span style="font-size:12px;">Utilise « Ouvrir à part » si rien ne s\'affiche.</span>';
  }, 8000);

  zone.appendChild(cadre);
}

function rechargerCadreSms(){
  cadreSmsCharge = false;
  const zone = $('smsCadre');
  if(zone) zone.innerHTML = '';
  chargerCadreSms();
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-sms.js'] = true;
