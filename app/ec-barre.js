/* Déployé le 20/11/2026 à 13:43 — v1514 */
/* ============================================================
   ec-barre.js — v1514 — LA BARRE DU HAUT REVUE

   David, le 20 novembre : « si tu mets le bouton [📞] en haut, mets la
   CB Gasoil dans les 3 points, car déjà que c'est serré en haut sur
   tablette et téléphone ». Puis, après le schéma : « c'est bon pour la
   barre, et sur téléphone et tablette mets À faire aussi dans les
   3 points ».

   Ce que fait ce module : il RECOPIE dans le menu ⋯ ce que les
   boutons du haut savent déjà. Les boutons restent là, avec leurs
   identifiants, et leurs modules continuent de les allumer et de les
   éteindre comme avant (ec-cbgasoil.js, ec-todo.js, la connexion) :
   on regarde ce qu'ils montrent, et le menu dit la même chose. Un
   deuxième endroit qui déciderait tout seul finirait par dire autre
   chose que le premier.

   · 💳 CB Gasoil : toujours dans le ⋯ (le bouton du haut est caché
     par la feuille de style), avec une pastille par carte — verte au
     bureau, dorée si c'est toi qui l'as, rouge chez quelqu'un d'autre.
     Un point rouge sur le ⋯ quand une carte est sortie depuis hier.
   · ☑️ À faire, 🔓 Se déconnecter et le nom de la personne : dans le
     ⋯ sur téléphone et tablette (900 px et moins), avec le compte des
     tâches recopié sur le ⋯. Sur grand écran, rien ne bouge.
   ============================================================ */

let barreMajPrevue = false;

function barreConnecte(){
  const o = $('logoutBtn');
  return !!(typeof ACCES !== 'undefined' && ACCES && ACCES.code) && !!o && o.style.display !== 'none';
}
function barreVisible(id){
  const b = $(id);
  return !!b && b.style.display !== 'none' && b.style.display !== '';
}
function barreNon(el, cache){ if(el) el.classList.toggle('non', !!cache); }

function barreMaj(){
  barreMajPrevue = false;
  const menu = $('plusMenu');
  if(!menu) return;
  const connecte = barreConnecte();

  /* qui est connecté (sur téléphone et tablette, #qui est caché) */
  const qui = $('plusQui');
  if(qui){
    const n = $('quiNom'), r = $('quiRole'), v = $('versionAffichee');
    const nom = (n && n.textContent.trim()) || '';
    $('plusQuiNom').textContent = nom;
    $('plusQuiRole').textContent = [(r && r.textContent.trim()) || '', (v && v.textContent.trim()) || ''].filter(Boolean).join(' · ');
    barreNon(qui, !connecte || !nom);
  }

  /* ☑️ À faire : seulement si le bouton du haut existe pour cette personne */
  const todo = connecte && barreVisible('todoBtn');
  barreNon($('plusTodo'), !todo);
  const tn = $('todoBtnN');
  const compte = (todo && tn && tn.style.display !== 'none') ? tn.textContent.trim() : '';
  const pn = $('plusTodoN');
  if(pn){ pn.textContent = compte; barreNon(pn, !compte); }
  const bn = $('plusBtnN');
  if(bn){ bn.textContent = compte; barreNon(bn, !compte); }

  /* 💳 la CB Gasoil */
  const cb = connecte && barreVisible('cbBtn');
  barreNon($('plusCb'), !cb);
  let traine = false;
  const et = $('plusCbEt');
  if(et){
    et.innerHTML = '';
    let etats = [];
    try{ etats = (cb && typeof etatsCb === 'function') ? etatsCb() : []; }catch(e){ etats = []; }
    const max = (typeof CB_LETTRES_MAX !== 'undefined') ? CB_LETTRES_MAX : 4;
    if(etats.length && etats.length <= max){
      etats.forEach(x => {
        const s = document.createElement('span');
        s.textContent = (typeof sigleCb === 'function') ? sigleCb(x.carte.cle) : '';
        s.className = x.ou === 'moi' ? 'or' : x.ou === 'autre' ? 'dehors' : '';
        s.title = ((typeof nomCb === 'function') ? nomCb(x.carte.cle) : '') + ' — ' +
          (x.ou === 'moi' ? 'tu l’as' : x.ou === 'autre' ? 'chez ' + (x.qui || 'quelqu’un') : 'au bureau');
        et.appendChild(s);
      });
    }else if(etats.length){
      const dehors = etats.filter(x => x.ou !== 'bureau').length;
      const s = document.createElement('span');
      s.textContent = dehors + ' sortie' + (dehors > 1 ? 's' : '');
      if(dehors) s.className = 'dehors';
      et.appendChild(s);
    }
    try{ traine = typeof cbTraine === 'function' && etats.some(x => cbTraine(x)); }catch(e){ traine = false; }
  }
  barreNon($('plusPoint'), !traine);
  const pb = $('plusBtn');
  if(pb) pb.title = traine ? 'Une CB Gasoil est sortie depuis hier — guide, thème, version' : 'CB Gasoil, guide, thème, version';

  /* les deux séparateurs : seulement s'il y a quelque chose de chaque côté */
  const s1 = $('plusSep1');
  if(s1){
    barreNon(s1, !cb && !todo);
    s1.classList.toggle('brPetit', !cb && todo);
  }
  barreNon($('plusSep2'), !connecte);
  barreNon($('plusOut'), !connecte);
}

function barrePrevoir(){
  if(barreMajPrevue) return;
  barreMajPrevue = true;
  setTimeout(barreMaj, 0);
}

function brancherBarre(){
  const menu = $('plusMenu');
  if(!menu || menu.dataset.barre) return;
  menu.dataset.barre = 'oui';

  const clic = (id, f) => { const b = $(id); if(b) b.addEventListener('click', () => setTimeout(f, 0)); };
  clic('plusCb', () => { if(typeof ouvrirCbGasoil === 'function') ouvrirCbGasoil(); });
  clic('plusTodo', () => { if(typeof basculerTD === 'function') basculerTD(); });
  clic('plusOut', () => { const o = $('logoutBtn'); if(o) o.click(); });

  /* Ce que les boutons du haut montrent, le menu le recopie */
  if(window.MutationObserver){
    const o = new MutationObserver(barrePrevoir);
    ['cbBtn', 'todoBtn', 'todoBtnN', 'logoutBtn', 'quiNom', 'quiRole', 'versionAffichee'].forEach(id => {
      const el = $(id);
      if(el) o.observe(el, { attributes: true, attributeFilter: ['style'], childList: true, subtree: true, characterData: true });
    });
  }
  const p = $('plusBtn');
  if(p) p.addEventListener('click', barreMaj, true);
  /* une carte qui « traîne » change avec le jour, pas avec un clic */
  setInterval(barrePrevoir, 60000);
  barreMaj();
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', brancherBarre);
else brancherBarre();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-barre.js'] = true;
