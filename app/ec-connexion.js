/* Déployé le 02/11/2026 à 19:33 — v1335 */
/* ============================================================
   ec-connexion.js — LA PAGE DE CONNEXION (v1335)

   David, le 2 novembre 2026 : « beaucoup plus jolie ». Sur le schéma,
   ses choix : le panneau aux couleurs de l'école et le « Bonjour 👋 »
   avec la date ; pas d'exemple dans le champ prénom ; « se souvenir
   du prénom » ; un pavé numérique PARTOUT, « avec un bouton pour
   l'enlever si on veut et que le navigateur s'en souvienne » ;
   « Ce n'est pas moi » pour changer de prénom.

   ⚠️ CE MODULE NE FAIT QU'AJOUTER. Les deux champs et le bouton
   « Se connecter » vivent dans la page et marchent sans lui (voir la
   connexion de secours, dans index.html). S'il manque, on se connecte
   comme avant : prénom, code, bouton. Le pavé, la date et le prénom
   retenu ne s'allument que quand il est là.

   ⚠️ LE PAVÉ ÉCRIT DANS LE VRAI CHAMP. Chaque chiffre va dans
   #codeInput, et ✓ appuie sur le vrai bouton : deverrouiller() lit le
   même champ qu'avant. Il n'y a pas deux chemins de connexion.
   ============================================================ */

const CLE_PRENOM_RETENU = 'ec_prenom_retenu';
const CLE_PAVE = 'ec_pave';

/* ---------- Ce que l'appareil retient ---------- */

/* Le prénom retenu : ce qu'on a TAPÉ (c'est ce que le serveur
   reconnaît) et le nom qu'il a renvoyé (c'est ce qu'on affiche). */
function prenomRetenu(){
  try{
    const o = JSON.parse(localStorage.getItem(CLE_PRENOM_RETENU) || 'null');
    if(o && o.saisi) return { saisi: String(o.saisi), nom: String(o.nom || o.saisi) };
  }catch(e){}
  return null;
}
function retenirPrenom(saisi, nom){
  try{
    localStorage.setItem(CLE_PRENOM_RETENU,
      JSON.stringify({ saisi: String(saisi || '').trim(), nom: String(nom || saisi || '').trim() }));
  }catch(e){}
}
function oublierPrenom(){
  try{ localStorage.removeItem(CLE_PRENOM_RETENU); }catch(e){}
}

/* Le pavé est allumé par défaut ; « ⌨️ Taper au clavier » l'éteint,
   et ce navigateur s'en souvient. */
function paveVoulu(){
  try{ return localStorage.getItem(CLE_PAVE) !== 'non'; }catch(e){ return true; }
}
function choisirPave(oui){
  try{ localStorage.setItem(CLE_PAVE, oui ? 'oui' : 'non'); }catch(e){}
}

/* ---------- Le haut de la carte ---------- */

function majBonjour(){
  const d = new Date();
  const j = $('cnxJour');
  if(j) j.textContent = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const h = $('cnxBonjour');
  if(!h) return;
  const mot = d.getHours() >= 18 ? 'Bonsoir' : 'Bonjour';
  const r = document.body.classList.contains('cnxRetenu') ? prenomRetenu() : null;
  h.textContent = '';
  h.appendChild(document.createTextNode(mot + ' '));
  if(r){
    const n = document.createElement('span');
    n.className = 'nom';
    n.textContent = r.nom;
    h.appendChild(n);
    h.appendChild(document.createTextNode(' '));
  }
  h.appendChild(document.createTextNode('👋'));
}

/* ---------- Le prénom retenu ---------- */

function majPrenomRetenu(){
  const r = prenomRetenu();
  const qui = $('cnxQui');
  const champ = $('identInput');
  document.body.classList.toggle('cnxRetenu', !!r);
  if(qui) qui.hidden = !r;
  if(r){
    if($('cnxQuiNom')) $('cnxQuiNom').textContent = r.nom;
    if($('cnxQuiAv')) $('cnxQuiAv').textContent = (r.nom.charAt(0) || '?').toUpperCase();
    /* Le champ reste dans la page, caché : deverrouiller() le lit. */
    if(champ) champ.value = r.saisi;
  }
}

/* ---------- Le pavé ---------- */

function majRondsCode(){
  const z = $('cnxRonds');
  const c = $('codeInput');
  if(!z || !c) return;
  const n = String(c.value || '').length;
  z.innerHTML = '';
  for(let i = 0; i < 8; i++){
    const r = document.createElement('i');
    if(i >= 6) r.classList.add('option');
    if(i < n) r.classList.add('plein');
    z.appendChild(r);
  }
  z.setAttribute('aria-label', n + (n > 1 ? ' chiffres tapés' : ' chiffre tapé'));
}

function majPave(){
  const oui = paveVoulu();
  document.body.classList.toggle('cnxPaveOn', oui);
  if($('cnxPave')) $('cnxPave').hidden = !oui;
  if($('cnxRonds')) $('cnxRonds').hidden = !oui;
  const b = $('cnxBascule');
  if(b){
    b.hidden = false;
    b.textContent = oui ? '⌨️ Taper au clavier' : '🔢 Pavé numérique';
  }
  majRondsCode();
}

function toucheDuPave(k){
  const c = $('codeInput');
  if(!c) return;
  if(k === 'ok'){ if($('codeBtn')) $('codeBtn').click(); return; }
  if(k === 'eff'){ c.value = String(c.value || '').slice(0, -1); majRondsCode(); return; }
  if(/^\d$/.test(k) && String(c.value || '').length < 8){
    c.value = String(c.value || '') + k;
    majRondsCode();
    /* Le message d'erreur d'avant n'a plus lieu d'être quand on
       recommence à taper. */
    const m = $('codeMsg');
    if(m && m.textContent && String(c.value).length === 1){ m.textContent = ''; }
  }
}

/* L'écran de connexion est-il affiché ? */
function surConnexion(){
  return document.body.classList.contains('surVerrou');
}

/* ---------- Tout, à chaque fois que la page de connexion s'affiche ---------- */

/* Appelée par l'observateur de la page (index.html) chaque fois que
   l'écran de connexion apparaît — après verrouiller(), qui vide les
   champs : c'est pour ça qu'on remet le prénom retenu ICI. */
function preparerConnexion(){
  majPrenomRetenu();
  majBonjour();
  majPave();
}
window.preparerConnexion = preparerConnexion;

(function brancherPageConnexion(){
  const pave = $('cnxPave');
  if(pave){
    pave.addEventListener('click', e => {
      const b = e.target.closest('button[data-k]');
      if(b) toucheDuPave(b.dataset.k);
    });
  }

  const bascule = $('cnxBascule');
  if(bascule){
    bascule.addEventListener('click', () => {
      choisirPave(!paveVoulu());
      majPave();
      /* Revenu au clavier : on y met le curseur, pour taper tout de suite. */
      if(!paveVoulu() && $('codeInput')) $('codeInput').focus();
    });
  }

  const pasMoi = $('cnxPasMoi');
  if(pasMoi){
    pasMoi.addEventListener('click', () => {
      oublierPrenom();
      if($('identInput')) $('identInput').value = '';
      if($('codeInput')) $('codeInput').value = '';
      preparerConnexion();
      if($('identInput')) $('identInput').focus();
    });
  }

  /* Le clavier de l'ordinateur marche aussi avec le pavé : les
     chiffres, ⌫ et Entrée — sauf quand on tape son prénom. */
  document.addEventListener('keydown', e => {
    if(!surConnexion() || !paveVoulu()) return;
    const t = e.target;
    if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    if(/^\d$/.test(e.key)){ toucheDuPave(e.key); e.preventDefault(); }
    else if(e.key === 'Backspace'){ toucheDuPave('eff'); e.preventDefault(); }
    else if(e.key === 'Enter'){ toucheDuPave('ok'); e.preventDefault(); }
  });

  /* Entrée sur le prénom, avec le pavé : le champ du code est caché,
     on referme simplement le clavier du téléphone. */
  const ident = $('identInput');
  if(ident) ident.addEventListener('keydown', e => {
    if(e.key === 'Enter' && paveVoulu()) ident.blur();
  });

  /* L'observateur de la page a pu passer avant que ce module soit là. */
  if(typeof window.suivreEcranConnexion === 'function') window.suivreEcranConnexion();
  else if(surConnexion()) preparerConnexion();
})();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-connexion.js'] = true;
