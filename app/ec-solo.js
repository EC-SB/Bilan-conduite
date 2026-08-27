/* ============================================================
   ec-solo.js
   Les messages du permis en solo.

   Ceux qu'on envoie un par un, à la main, sur Messenger. Ils
   viennent des textes types : le bureau les écrit là-bas, ils
   apparaissent ici prêts à copier.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* La catégorie qui range ces messages dans les textes types */
const CAT_SOLO = 'Permis solo';

/* Celui qu'on voit toujours : son titre commence par ⭐.

   Le désigner vaut mieux que de prendre le premier : l'ordre
   des textes types change, le choix du bureau non. */
const MARQUE_PRINCIPAL = '⭐';


function modelesSolo(){
  if(typeof modelesTexte === 'undefined') return [];

  return (modelesTexte || [])
    .filter(m => normaliserMot(m.categorie || '') === normaliserMot(CAT_SOLO))
    .map(m => ({
      cle: m.cle || m.nom || '',
      titre: String(m.titre || m.nom || '').replace(MARQUE_PRINCIPAL, '').trim(),
      contenu: String(m.contenu || ''),
      principal: String(m.titre || m.nom || '').indexOf(MARQUE_PRINCIPAL) !== -1
    }));
}


async function afficherSolo(){
  const zone = $('soloZone');
  if(!zone) return;

  /* Les modèles arrivent du serveur : sans eux, rien à montrer */
  if(typeof modelesTexte === 'undefined' || !modelesTexte.length){
    if(typeof chargerModelesTexte === 'function'){
      try{ await chargerModelesTexte(); }catch(e){}
    }
  }

  const liste = modelesSolo();
  zone.innerHTML = '';

  if(!liste.length){
    zone.appendChild(soloAucun());
    return;
  }

  /* Le principal, ou le premier à défaut */
  const principal = liste.find(m => m.principal) || liste[0];
  const autres = liste.filter(m => m !== principal);

  zone.appendChild(blocSoloPrincipal(principal));
  if(autres.length) zone.appendChild(blocSoloAutres(autres));
}


/* ============================================================
   LE MESSAGE PRINCIPAL, TOUJOURS VISIBLE
   ============================================================ */

function blocSoloPrincipal(m){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:12px 13px;margin-bottom:14px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
    'margin-bottom:8px;';
  t.textContent = '⭐ ' + (m.titre || 'Message principal');
  d.appendChild(t);

  d.appendChild(zoneTexteSolo(m));
  d.appendChild(boutonCopierSolo(m));

  return d;
}


/* ============================================================
   LES AUTRES, SOUS UN MENU
   ============================================================ */

function blocSoloAutres(liste){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:12px 13px;';

  const l = document.createElement('label');
  l.setAttribute('for', 'soloChoix');
  l.textContent = 'Les autres messages';
  d.appendChild(l);

  const sel = document.createElement('select');
  sel.id = 'soloChoix';
  sel.style.marginBottom = '10px';

  liste.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = m.titre || ('Message ' + (i + 1));
    sel.appendChild(o);
  });
  d.appendChild(sel);

  /* Ce qui change quand on choisit */
  const dedans = document.createElement('div');
  d.appendChild(dedans);

  const montrer = () => {
    const m = liste[Number(sel.value) || 0];
    dedans.innerHTML = '';
    if(!m) return;
    dedans.appendChild(zoneTexteSolo(m));
    dedans.appendChild(boutonCopierSolo(m));
  };

  sel.addEventListener('change', montrer);
  montrer();

  return d;
}


/* ============================================================
   LE TEXTE ET SON BOUTON
   ============================================================ */

function zoneTexteSolo(m){
  const t = document.createElement('textarea');
  t.rows = Math.min(14, Math.max(4, m.contenu.split('\n').length + 1));
  t.value = m.contenu;
  t.readOnly = true;
  t.style.cssText = 'width:100%;background:var(--navy);' +
    'border:1px solid var(--line);color:var(--cream);' +
    'padding:11px 12px;border-radius:10px;font-size:14px;' +
    'line-height:1.6;font-family:inherit;resize:vertical;margin:0 0 9px;';

  /* Un appui sélectionne tout : plus simple que de viser à la
     main sur un téléphone. */
  t.addEventListener('click', () => t.select());

  return t;
}


function boutonCopierSolo(m){
  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'padding:11px;font-size:13px;margin:0;';
  b.textContent = '📋 Copier le message';

  b.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(m.contenu);
      b.textContent = '✅ Copié';
      setTimeout(() => { b.textContent = '📋 Copier le message'; }, 1800);
    }catch(e){
      /* Le presse-papiers est parfois refusé : on laisse le
         moniteur copier lui-même. */
      showToast('Sélectionne le texte et copie-le à la main');
    }
  });

  return b;
}


/* ============================================================
   QUAND IL N'Y A RIEN

   Plutôt qu'une zone vide, on dit où écrire ces messages.
   ============================================================ */

function soloAucun(){
  const d = document.createElement('div');
  d.style.cssText = 'font-size:13px;color:var(--muted);line-height:1.6;';

  d.innerHTML = 'Aucun message pour le moment.<br>' +
    'Écris-les dans <strong>⚙️ Textes types</strong>, en rangeant leur nom ' +
    'sous la catégorie <strong>' + CAT_SOLO + '</strong>.<br>' +
    'Celui dont le titre commence par <strong>⭐</strong> restera toujours ' +
    'affiché ; les autres iront dans le menu.';

  if(typeof aDroit === 'function' && aDroit('textes')){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'margin-top:10px;padding:10px;font-size:13px;';
    b.textContent = '✏️ Écrire un message';
    b.addEventListener('click', () => {
      if(typeof afficherOnglet === 'function') afficherOnglet('outils');
      if(typeof afficherVue === 'function') afficherVue('outils', 'textes');
    });
    d.appendChild(b);
  }

  return d;
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-solo.js'] = true;
