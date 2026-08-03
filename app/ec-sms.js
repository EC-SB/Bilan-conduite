/* ============================================================
   ec-sms.js
   Intégration de l'outil d'envoi de SMS, hébergé au même endroit.
   Il n'est chargé qu'à l'ouverture du tiroir : inutile de le
   télécharger pour quelqu'un qui ne s'en sert pas.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const URL_SMS = 'https://ec-sb.github.io/SMS2/';

/* L'outil SMS a ses propres codes : on retient celui de chacun
   pour ne le demander qu'une seule fois. */
const CLE_CODE_SMS = 'code_sms_';

function codeSmsMemorise(){
  try{
    return localStorage.getItem(CLE_CODE_SMS + normaliserMot(ACCES.moniteur || '')) || '';
  }catch(e){ return ''; }
}

function memoriserCodeSms(code){
  try{
    localStorage.setItem(CLE_CODE_SMS + normaliserMot(ACCES.moniteur || ''), code);
  }catch(e){}
}

function oublierCodeSms(){
  try{
    localStorage.removeItem(CLE_CODE_SMS + normaliserMot(ACCES.moniteur || ''));
  }catch(e){}
}

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
    connecterSmsAutomatiquement(cadre);
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



/* ============================================================
   CONNEXION AUTOMATIQUE
   Les deux applications sont au même endroit : on peut remplir
   la connexion de l'outil SMS sans que l'utilisateur la refasse.
   ============================================================ */
function connecterSmsAutomatiquement(cadre){
  let doc;
  try{ doc = cadre.contentWindow.document; }
  catch(e){ return; }          /* accès refusé : on laisse la connexion manuelle */
  if(!doc) return;

  const champ = doc.getElementById('loginCode');
  const bouton = doc.getElementById('loginBtn');
  const ecran = doc.getElementById('loginScreen');

  /* Déjà connecté : rien à faire */
  if(!champ || !bouton) return;
  if(ecran && ecran.style.display === 'none') return;

  /* Le code mémorisé, sinon celui de l'application si le format colle */
  let code = codeSmsMemorise();
  if(!code && /^[0-9]{6}$/.test(String(ACCES.code || ''))) code = String(ACCES.code);
  if(!code){ proposerCodeSms(cadre); return; }

  champ.value = code;
  bouton.click();

  /* On vérifie le résultat : un code refusé ne doit pas rester mémorisé */
  setTimeout(() => {
    try{
      const encore = doc.getElementById('loginScreen');
      const rate = encore && encore.style.display !== 'none';
      if(rate){
        oublierCodeSms();
        proposerCodeSms(cadre);
      }else{
        memoriserCodeSms(code);
      }
    }catch(e){}
  }, 1800);
}

/* Demande le code de l'outil SMS, une seule fois */
async function proposerCodeSms(cadre){
  const zone = $('smsCadre');
  if(!zone || zone.querySelector('.demandeSms')) return;

  const d = document.createElement('div');
  d.className = 'demandeSms';
  d.style.cssText = 'padding:12px;background:var(--navy);border-bottom:1px solid var(--line);' +
    'font-size:13px;line-height:1.5;';
  d.innerHTML = "🔑 L'outil SMS a son propre code. Saisis-le une fois, " +
    'il sera retenu pour les prochaines fois.';

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;margin-top:8px;';

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.inputMode = 'numeric';
  inp.placeholder = 'Code à 6 chiffres';
  inp.style.cssText = 'flex:1;margin:0;padding:9px 10px;font-size:15px;min-width:0;';
  r.appendChild(inp);

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'width:auto;padding:9px 14px;font-size:13px;margin:0;flex-shrink:0;';
  b.textContent = 'Connecter';
  b.addEventListener('click', () => {
    const v = inp.value.trim();
    if(!/^[0-9]{6}$/.test(v)){ showToast('Le code fait 6 chiffres.'); return; }
    memoriserCodeSms(v);
    d.remove();
    try{
      const doc = cadre.contentWindow.document;
      doc.getElementById('loginCode').value = v;
      doc.getElementById('loginBtn').click();
    }catch(e){}
  });
  r.appendChild(b);

  d.appendChild(r);
  zone.insertBefore(d, zone.firstChild);
  setTimeout(() => inp.focus(), 100);
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-sms.js'] = true;
