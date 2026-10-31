/* Déployé le 30/10/2026 à 17:51 — v1316 */
/* ============================================================
   ec-msg-gestes.js — 🧭 LES GESTES DE LA MESSAGERIE (v1296)

   David, le 28 octobre 2026, sur la maquette « tous écrans » : « pour
   la messagerie c'est ok, change “À traiter” en “Non lus” s'il te
   plaît, c'est la seule modif dont j'ai besoin ».

   Ce module porte ce que la maquette a ajouté, pour l'équipe, sur les
   trois tailles (téléphone, tiroir, grand écran) :
     · les menus ⋯ / ⚡ : une feuille qui monte du bas sur le téléphone
       et dans le tiroir, un menu près du bouton sur grand écran ;
     · glisser une conversation : ← ✓ Réglé, → ⏰ demain ;
     · glisser depuis le bord gauche d'un fil : retour à la liste ;
     · au clavier : ↑ ↓ entre les conversations, Ctrl K pour chercher,
       Alt 1…6 pour une réponse rapide ; Entrée envoie ;
     · déposer un fichier sur le fil pour l'envoyer ;
     · un message éphémère avec « Annuler ».
   ec-messagerie.js et ec-cockpit.js l'appellent ; sans lui, ils
   retombent sur leurs gestes d'avant.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Un vrai clavier et une souris (ordinateur) ? */
function claviereEC(){
  try{ return !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches); }catch(e){ return false; }
}
const echEC = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ============================================================
   LES MENUS — feuille (petit) ou menu près du bouton (grand)
   ============================================================ */
let menuOuvertEC = null;
function fermerMenuGestesEC(){ if(menuOuvertEC){ const f = menuOuvertEC; menuOuvertEC = null; f(); } }

/* items : { titre } | { sep } | { emoji, texte, on, danger, cle, faire } */
function menuGestesEC(ancre, titre, items, surFermeture){
  fermerMenuGestesEC();
  const dansTiroir = !!(ancre && ancre.closest && ancre.closest('#msgElvTiroir'));
  const grand = !dansTiroir && typeof ckLarge === 'function' && ckLarge() && !!(ancre && ancre.closest && ancre.closest('#messagerieZone'));
  const voile = document.createElement('div');
  voile.className = 'msgFeuilleVoile' + (grand ? ' clair' : '');
  const f = document.createElement('div');
  f.className = 'msgFeuille' + (grand ? ' pop' : '');
  f.setAttribute('role', 'menu');
  f.innerHTML = (grand ? '' : '<div class="poignee"></div>') +
    '<div class="fH"><b></b><button type="button" class="fX" aria-label="Fermer">✕</button></div><div class="fC"></div>';
  f.querySelector('.fH b').textContent = titre || '';
  const corps = f.querySelector('.fC');
  (items || []).forEach(it => {
    if(it.titre){ const t = document.createElement('div'); t.className = 'sTitre'; t.textContent = it.titre; corps.appendChild(t); return; }
    if(it.sep){ const t = document.createElement('div'); t.className = 'sep'; corps.appendChild(t); return; }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'item' + (it.on ? ' on' : '') + (it.danger ? ' danger' : '');
    if(it.cle) b.dataset.cle = it.cle;
    b.innerHTML = '<span class="e">' + echEC(it.emoji || '') + '</span><span class="tx"></span>';
    b.querySelector('.tx').textContent = it.texte || '';
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      fermer();
      try{ const r = it.faire && it.faire(); if(r && r.catch) r.catch(e => { if(typeof showToast === 'function') showToast('Impossible : ' + (e.message || e)); }); }
      catch(e){ if(typeof showToast === 'function') showToast('Impossible : ' + (e.message || e)); }
    });
    corps.appendChild(b);
  });
  document.body.appendChild(voile);
  document.body.appendChild(f);
  /* Où se poser : près du bouton (grand) ; en bas de l'écran — ou du
     tiroir, qui fait 400 px — sinon */
  if(grand && ancre){
    const a = ancre.getBoundingClientRect();
    const L = Math.min(Math.max(8, a.right - 290), window.innerWidth - 298);
    f.style.left = L + 'px';
    const h = f.offsetHeight;
    if(a.bottom + 6 + h > window.innerHeight - 8 && a.top - 6 - h > 8) f.style.top = (a.top - 6 - h) + 'px';
    else f.style.top = Math.min(a.bottom + 6, Math.max(8, window.innerHeight - h - 8)) + 'px';
  }else{
    const t = dansTiroir ? document.getElementById('msgElvTiroir') : null;
    if(t){ const r = t.getBoundingClientRect(); f.style.left = r.left + 'px'; f.style.width = r.width + 'px'; voile.style.left = r.left + 'px'; voile.style.width = r.width + 'px'; }
  }
  requestAnimationFrame(() => { voile.classList.add('on'); f.classList.add('on'); });
  const echap = ev => { if(ev.key === 'Escape'){ ev.stopPropagation(); fermer(); } };
  function fermer(){
    document.removeEventListener('keydown', echap, true);
    if(menuOuvertEC === fermerIci) menuOuvertEC = null;
    voile.remove(); f.remove();
    if(surFermeture) surFermeture();
  }
  const fermerIci = fermer;
  menuOuvertEC = fermerIci;
  voile.addEventListener('click', fermer);
  f.querySelector('.fX').addEventListener('click', ev => { ev.stopPropagation(); fermer(); });
  document.addEventListener('keydown', echap, true);
  const premier = corps.querySelector('.item');
  if(grand && premier) setTimeout(() => premier.focus(), 0);
  return fermer;
}

/* ============================================================
   UN MESSAGE ÉPHÉMÈRE AVEC « ANNULER »
   ============================================================ */
let toastGesteEC = null;
function toastAvecGesteEC(texte, bouton, faire){
  if(toastGesteEC){ clearTimeout(toastGesteEC.t); toastGesteEC.el.remove(); toastGesteEC = null; }
  const el = document.createElement('div');
  el.className = 'msgToastGeste';
  el.innerHTML = '<span></span>' + (bouton ? '<button type="button"></button>' : '');
  el.firstChild.textContent = texte;
  const fin = () => { if(toastGesteEC && toastGesteEC.el === el){ clearTimeout(toastGesteEC.t); toastGesteEC = null; } el.classList.remove('on'); setTimeout(() => el.remove(), 250); };
  if(bouton){
    const b = el.querySelector('button');
    b.textContent = bouton;
    b.addEventListener('click', () => { fin(); try{ faire && faire(); }catch(e){} });
  }
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  toastGesteEC = { el: el, t: setTimeout(fin, bouton ? 5000 : 2500) };
}

/* ============================================================
   GLISSER UNE CONVERSATION — au doigt
   ← ✓ Réglé (si on peut régler) · → ⏰ me la rappeler demain
   À la souris : un clic ouvre, et ✓ ⏰ 📌 sont au survol.
   ============================================================ */
function glisserLaLigneEC(el, c, ouvrir){
  const peutRegler = typeof ckPeutGerer === 'function' && ckPeutGerer() && !Number(c.fermee || 0);
  el.classList.add('glissable');
  el.addEventListener('click', ev => {
    if(el.dataset.glisse === '1'){ ev.preventDefault(); ev.stopPropagation(); el.dataset.glisse = ''; return; }
    ouvrir();
  });
  let x0 = null, y0 = 0, dx = 0, bouge = false, vertical = false, fond = null;
  const remettre = () => {
    el.style.transition = 'transform .2s'; el.style.transform = '';
    if(fond){ const f = fond; setTimeout(() => f.remove(), 220); fond = null; }
  };
  el.addEventListener('pointerdown', ev => {
    if(ev.pointerType === 'mouse' || ev.target.closest('.ckVite2')) return;
    x0 = ev.clientX; y0 = ev.clientY; dx = 0; bouge = false; vertical = false;
  });
  el.addEventListener('pointermove', ev => {
    if(x0 === null) return;
    const ddx = ev.clientX - x0, ddy = ev.clientY - y0;
    if(!bouge && !vertical && Math.abs(ddy) > 10 && Math.abs(ddy) > Math.abs(ddx)){ vertical = true; x0 = null; return; }
    if(!bouge && Math.abs(ddx) < 12) return;
    if(!bouge){
      bouge = true;
      try{ el.setPointerCapture(ev.pointerId); }catch(e){}
      fond = document.createElement('div');
      fond.className = 'ckGlisseFond';
      fond.innerHTML = '<span class="d">⏰ Demain</span><span class="g">' + (peutRegler ? '✓ Réglé' : '') + '</span>';
      el.parentNode.insertBefore(fond, el);
      const r = el.getBoundingClientRect(), p = el.offsetParent ? el.offsetParent.getBoundingClientRect() : { top: 0, left: 0 };
      fond.style.top = (el.offsetTop) + 'px'; fond.style.left = (el.offsetLeft) + 'px';
      fond.style.width = r.width + 'px'; fond.style.height = r.height + 'px';
      el.style.transition = 'none';
    }
    dx = (ddx < 0 && !peutRegler) ? Math.max(ddx, -40) : ddx;
    el.style.transform = 'translateX(' + dx + 'px)';
    if(fond) fond.classList.toggle('gauche', dx < 0);
  });
  const fin = () => {
    if(x0 === null) return;
    x0 = null;
    if(!bouge) return;
    el.dataset.glisse = '1';
    setTimeout(() => { el.dataset.glisse = ''; }, 400);
    if(dx < -90 && peutRegler){
      el.style.transition = 'transform .18s'; el.style.transform = 'translateX(-110%)';
      setTimeout(() => { if(fond) fond.remove(); fond = null; ckReglerDeLaListe(c.id); }, 170);
      return;
    }
    remettre();
    if(dx > 90 && typeof ckMarquer === 'function') ckMarquer(c.id, 'rappel');
  };
  el.addEventListener('pointerup', fin);
  el.addEventListener('pointercancel', () => { x0 = null; if(bouge) remettre(); });
}

/* ============================================================
   GLISSER DEPUIS LE BORD GAUCHE D'UN FIL — retour à la liste
   ============================================================ */
function brancherLeBordEC(zone){
  if(!zone || zone.dataset.bord === '1') return;
  zone.dataset.bord = '1';
  let x0 = null, dx = 0, cible = null;
  zone.addEventListener('pointerdown', ev => {
    if(ev.pointerType === 'mouse' || !zone.querySelector(':scope > .ckFh')) return;
    const r = zone.getBoundingClientRect();
    if(ev.clientX - r.left > 24) return;
    x0 = ev.clientX; dx = 0; cible = zone;
  });
  zone.addEventListener('pointermove', ev => {
    if(x0 === null) return;
    dx = Math.max(0, ev.clientX - x0);
    if(dx > 8){ try{ zone.setPointerCapture(ev.pointerId); }catch(e){} }
    cible.style.transition = 'none';
    cible.style.transform = 'translateX(' + dx + 'px)';
  });
  const fin = () => {
    if(x0 === null) return;
    x0 = null;
    cible.style.transition = 'transform .2s';
    cible.style.transform = '';
    if(dx > 90 && typeof fermerLeFil === 'function') fermerLeFil();
  };
  zone.addEventListener('pointerup', fin);
  zone.addEventListener('pointercancel', fin);
}

/* ============================================================
   DÉPOSER UN FICHIER SUR LE FIL
   ============================================================ */
function brancherLeDepotEC(zone){
  if(!zone || zone.dataset.depot === '1') return;
  zone.dataset.depot = '1';
  let voile = null;
  const montrer = oui => {
    if(oui && !voile){
      voile = document.createElement('div');
      voile.className = 'msgDepot';
      voile.textContent = '📎 Dépose ton fichier ici';
      zone.appendChild(voile);
    }
    if(!oui && voile){ voile.remove(); voile = null; }
  };
  const aDesFichiers = ev => !!(ev.dataTransfer && Array.prototype.indexOf.call(ev.dataTransfer.types || [], 'Files') !== -1);
  zone.addEventListener('dragover', ev => {
    if(!aDesFichiers(ev) || !(filOuvertEC && filOuvertEC.peutEcrire) || !zone.querySelector(':scope > .ckFh')) return;
    ev.preventDefault(); montrer(true);
  });
  zone.addEventListener('dragleave', ev => { if(!zone.contains(ev.relatedTarget)) montrer(false); });
  zone.addEventListener('drop', ev => {
    if(!aDesFichiers(ev)) return;
    ev.preventDefault(); montrer(false);
    if(!(filOuvertEC && filOuvertEC.peutEcrire)) return;
    const f = ev.dataTransfer.files && ev.dataTransfer.files[0];
    if(!f) return;
    const t = String(f.type || '');
    if(t.indexOf('image/') === 0 && typeof envoyerUnePhotoDansLeFil === 'function') envoyerUnePhotoDansLeFil(f);
    else if(t.indexOf('video/') === 0 && typeof envoyerUneVideoChoisieEC === 'function') envoyerUneVideoChoisieEC(f);
    else if(typeof envoyerUnFichierDansLeFilEC === 'function') envoyerUnFichierDansLeFilEC(f);
  });
}

/* ============================================================
   ⌨️ AU CLAVIER, SUR GRAND ÉCRAN
   ↑ ↓ : la conversation d'avant, d'après · Ctrl K : chercher ·
   Alt 1…6 : une réponse rapide · Échap ferme un menu
   ============================================================ */
function messagerieAuPremierPlanEC(){
  const z = document.getElementById('messagerieZone');
  return !!(z && z.offsetParent !== null && z.querySelector('.ckpLarge') && !(typeof dansLeTiroir === 'function' && dansLeTiroir()));
}
document.addEventListener('keydown', ev => {
  if(!messagerieAuPremierPlanEC() || menuOuvertEC) return;
  const actif = document.activeElement;
  const tape = !!(actif && /^(input|textarea|select)$/i.test(actif.tagName));
  if((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && String(ev.key).toLowerCase() === 'k'){
    const c = document.getElementById('msgElvCherche');
    if(c){ ev.preventDefault(); c.focus(); c.select && c.select(); }
    return;
  }
  if(ev.altKey && /^[1-6]$/.test(ev.key)){
    const l = Array.prototype.filter.call(document.querySelectorAll('#messagerieZone .ckVites .ckVite'),
      b => !b.classList.contains('ckViteEclair') && !b.classList.contains('ckViteX') && !b.classList.contains('ckViteModeles'));
    const b = l[Number(ev.key) - 1];
    if(b){ ev.preventDefault(); b.click(); }
    return;
  }
  if(tape || ev.altKey || ev.ctrlKey || ev.metaKey) return;
  if(ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){
    const l = Array.prototype.slice.call(document.querySelectorAll('#ckpListe .ckIt'));
    if(!l.length) return;
    ev.preventDefault();
    let i = l.findIndex(x => x.classList.contains('on'));
    i = ev.key === 'ArrowDown' ? Math.min(l.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1);
    const x = l[i];
    if(x){ x.click(); x.scrollIntoView({ block: 'nearest' }); }
  }
});

/* ============================================================
   📱 LE CLAVIER DU TÉLÉPHONE — la barre reste au-dessus
   La hauteur visible (sans le clavier) se pose en variable : le fil
   plein écran s'y tient.
   ============================================================ */
(function(){
  const vv = window.visualViewport;
  const poser = () => {
    const h = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--msgVH', Math.round(h) + 'px');
    /* v1316 — et où commence la partie visible (le clavier fait glisser la page) */
    document.documentElement.style.setProperty('--msgVT', Math.round(vv ? Math.max(0, vv.offsetTop) : 0) + 'px');
  };
  poser();
  if(vv){ vv.addEventListener('resize', poser); vv.addEventListener('scroll', poser); }
  window.addEventListener('resize', poser);
})();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-msg-gestes.js'] = true;
