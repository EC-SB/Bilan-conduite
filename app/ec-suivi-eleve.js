/* Déployé le 27/10/2026 à 10:39 — v1272 */
/* ============================================================
   ec-suivi-eleve.js — 👁️ LE SUIVI DE L'ÉLÈVE — v1272

   David, le 27 octobre :
   · « dans les manœuvres, il faut enlever les petites voitures au
     bout de chaque bouton : il ne le faut qu'une seule fois, en
     dernier, pour tout cocher » — et, sur le schéma, « il faut pouvoir
     en retirer » ;
   · « il faut ajouter un œil au bout, qui ouvre un bloc de texte pour
     indiquer que le repère pour cette manœuvre n'est pas le même que
     tout le monde, et que le moniteur indique quel est le bon repère
     pour cet élève » — pas sur Utilisation radio, Utilisation
     téléphone, Faire peur, Parking avec ticket, GPS, Régulateur,
     Ouverture du capot, Va où tu veux fais ce que tu veux ; le repère
     part dans son bilan le jour où il est écrit ou changé ;
   · les questions de vérification posées en cours « se gardent en
     mémoire comme les manœuvres » (voir ec-verifs.js).

   Ce module tient ce qu'on sait de l'élève du cours (lu au Worker,
   table D1 « suivi_reperes » / « suivi_verifs ») et dessine l'œil, le
   bloc du repère et le 🚗 unique. Les deux écrans de cours (vocal :
   ec-vocal.js, à la main : ec-manuel.js) s'en servent de la même
   façon.

   ⚠️ TOUS LES NOMS FINISSENT PAR « SE » : les modules partagent une
   seule portée.
   ============================================================ */

const SANS_REPERE_SE = ['utilisation radio', 'utilisation telephone', 'faire peur', 'parking avec ticket', 'gps',
  'regulateur', 'ouverture du capot', 'va ou tu veux fais ce que tu veux'];

const SUIVI_SE = { nom: '', donnees: null, promesse: null };

function normSE(t){
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function cleManoeuvreSE(libelle){ return normSE(libelle).slice(0, 80); }
function sansRepereSE(libelle){ return SANS_REPERE_SE.indexOf(normSE(libelle)) !== -1; }
function eleveDuCoursSE(){
  const c = (typeof $ === 'function') ? $('studentName') : null;
  return c ? String(c.value || '').trim() : '';
}
function jourSE(){ return (typeof todayLocal === 'function') ? todayLocal() : new Date().toISOString().slice(0, 10); }

/* Ce qu'on sait de l'élève : lu une fois par élève, gardé tant qu'on
   reste sur lui. « forcer » relit (après un enregistrement ailleurs). */
function chargerSuiviSE(nom, forcer){
  nom = String(nom || '').trim();
  if(nom.length < 3 || typeof appelPrep !== 'function') return Promise.resolve(null);
  if(!forcer && normSE(SUIVI_SE.nom) === normSE(nom)){
    if(SUIVI_SE.donnees) return Promise.resolve(SUIVI_SE.donnees);
    if(SUIVI_SE.promesse) return SUIVI_SE.promesse;
  }
  if(normSE(SUIVI_SE.nom) !== normSE(nom)){ SUIVI_SE.nom = nom; SUIVI_SE.donnees = null; }
  const p = appelPrep({ action: 'suiviLire', eleve: nom }).then(r => {
    if(normSE(SUIVI_SE.nom) !== normSE(nom)) return null;
    SUIVI_SE.donnees = (r && r.status === 'ok') ? { reperes: r.reperes || [], verifs: r.verifs || [] } : { reperes: [], verifs: [] };
    SUIVI_SE.promesse = null;
    rafraichirApresSuiviSE();
    return SUIVI_SE.donnees;
  }).catch(() => { SUIVI_SE.promesse = null; return null; });
  SUIVI_SE.promesse = p;
  return p;
}
/* Ce qu'on a déjà, sans attendre (null si pas encore lu, ou autre élève) */
function suiviSE(nom){
  nom = nom == null ? eleveDuCoursSE() : nom;
  return (SUIVI_SE.donnees && normSE(SUIVI_SE.nom) === normSE(nom)) ? SUIVI_SE.donnees : null;
}
function rafraichirApresSuiviSE(){
  document.querySelectorAll('.oeilRepere').forEach(b => { if(typeof b._peindre === 'function') b._peindre(); });
  /* pas pendant qu'on écrit une réponse : le champ perdrait la main */
  const a = document.activeElement;
  if(a && a.closest && a.closest('.tiroirVerifs')) return;
  if(typeof qvRedessiner === 'function'){ try{ qvRedessiner(); }catch(e){} }
}

/* ---------- 👁️ les repères ---------- */
function repereSE(libelle, nom){
  const d = suiviSE(nom);
  if(!d) return null;
  const k = cleManoeuvreSE(libelle);
  return d.reperes.find(r => r.manoeuvre === k) || null;
}
async function poserRepereSE(libelle, texte, nom){
  nom = nom || eleveDuCoursSE();
  const r = await appelPrep({ action: 'suiviReperePoser', eleve: nom, manoeuvre: libelle, texte: texte });
  if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'pas enregistré');
  const d = suiviSE(nom);
  if(d){
    const k = cleManoeuvreSE(libelle);
    d.reperes = d.reperes.filter(x => x.manoeuvre !== k);
    if(r.repere) d.reperes.push(r.repere);
  }
  rafraichirApresSuiviSE();
  return r;
}

/* L'œil, au bout d'une manœuvre. « hote() » rend l'élément après
   lequel le bloc du repère s'ouvre (le bouton dans sa grille, ou la
   ligne de la case). */
function oeilRepereSE(libelle, hote){
  if(sansRepereSE(libelle)) return null;
  const o = document.createElement('button');
  o.type = 'button';
  o.className = 'btn pastilleVue pastilleAilleurs oeilRepere';
  o.textContent = '👁️';
  o.setAttribute('data-repere', libelle);
  o._peindre = () => {
    const r = repereSE(libelle);
    o.classList.toggle('aRepere', !!r);
    o.title = r ? 'Son repère à lui : ' + r.texte : 'Son repère n’est pas celui de tout le monde ? Écris le bon.';
    o.setAttribute('aria-label', o.title);
  };
  o.addEventListener('click', ev => {
    ev.preventDefault(); ev.stopPropagation();
    const h = hote ? hote() : o;
    const deja = h && h.nextElementSibling && h.nextElementSibling.classList.contains('repereBloc') ? h.nextElementSibling : null;
    document.querySelectorAll('.repereBloc').forEach(x => x.remove());
    if(deja) return;
    const b = blocRepereSE(libelle);
    if(h && h.parentNode) h.parentNode.insertBefore(b, h.nextSibling);
    const ta = b.querySelector('textarea');
    if(ta) try{ ta.focus(); }catch(e){}
  });
  o._peindre();
  const nom = eleveDuCoursSE();
  if(nom && !suiviSE(nom)) chargerSuiviSE(nom);
  return o;
}

function blocRepereSE(libelle){
  const nomE = eleveDuCoursSE();
  const prenom = nomE.split(/\s+/)[0] || 'l’élève';
  const r = repereSE(libelle);
  const b = document.createElement('div');
  b.className = 'repereBloc';
  b.setAttribute('data-repere', libelle);
  const t = document.createElement('div');
  t.className = 'repereTitre';
  t.textContent = '👁️ Le repère de ' + prenom + ' — ' + libelle;
  b.appendChild(t);
  const aide = document.createElement('div');
  aide.className = 'repereAide';
  aide.textContent = 'Pas le même que tout le monde : écris le bon. Il reste là pour les prochains moniteurs, l’œil reste allumé, et il part dans son bilan aujourd’hui.';
  b.appendChild(aide);
  const rg = document.createElement('div');
  rg.className = 'repereRang';
  const ta = document.createElement('textarea');
  ta.rows = 3;
  ta.placeholder = 'Ex : il ne voit pas le repère dans le rétro, on prend le poteau dans la vitre arrière.';
  ta.value = r ? r.texte : '';
  ta.setAttribute('data-hors-saisie', '1');
  rg.appendChild(ta);
  if(typeof microDObservation === 'function') rg.appendChild(microDObservation(ta, 'le repère'));
  b.appendChild(rg);
  if(r){
    const qui = document.createElement('div');
    qui.className = 'repereQui';
    qui.textContent = '✏️ ' + (r.par || '') + (r.le ? ' · ' + jourCourtSE(r.le) : '');
    b.appendChild(qui);
  }
  const acts = document.createElement('div');
  acts.className = 'repereActs';
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'btn btn-primary repereOk';
  ok.textContent = '💾 Enregistrer le repère';
  ok.addEventListener('click', async ev => {
    ev.preventDefault(); ev.stopPropagation();
    if(!eleveDuCoursSE()){ if(typeof showToast === 'function') showToast('Choisis d’abord l’élève.'); return; }
    ok.disabled = true;
    try{
      await poserRepereSE(libelle, ta.value.trim());
      if(typeof showToast === 'function') showToast(ta.value.trim() ? '👁️ Repère enregistré pour ' + prenom : 'Repère retiré');
      b.remove();
    }catch(e){
      ok.disabled = false;
      if(typeof showToast === 'function') showToast('⚠️ Le repère n’est pas enregistré : ' + (e.message || e));
    }
  });
  acts.appendChild(ok);
  if(r){
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'btn btn-secondary repereRetirer';
    x.textContent = '🗑️ Retirer';
    x.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); ta.value = ''; ok.click(); });
    acts.appendChild(x);
  }
  const f = document.createElement('button');
  f.type = 'button';
  f.className = 'btn btn-secondary';
  f.textContent = 'Fermer';
  f.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); b.remove(); });
  acts.appendChild(f);
  b.appendChild(acts);
  return b;
}
function jourCourtSE(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return String(iso || '');
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

/* Dans le bilan : les repères écrits ou changés AUJOURD'HUI */
function lignesReperesDuJourSE(){
  const d = suiviSE();
  if(!d) return [];
  const j = jourSE();
  return d.reperes.filter(r => r.le === j && r.texte)
    .map(r => '👁️ Ton repère pour « ' + (r.libelle || r.manoeuvre) + ' » : ' + r.texte);
}

/* ---------- 🚗 le bouton unique ---------- */
/* À la fin de la grille des manœuvres : il les coche toutes ; chaque
   manœuvre montre alors son 🚗 bleu, qu'on touche pour la retirer ;
   retouché quand tout est coché, il décoche tout. Rien ne s'affiche
   si la grille n'a pas de case 🚗 (élève de chez nous). */
function boutonAilleursToutSE(grille, racine, peindreTout){
  const cases = () => Array.prototype.slice.call(racine.querySelectorAll('input.mAilleurs'));
  if(!cases().length) return null;
  const g = document.createElement('span');
  g.className = 'pastilleGroupe ailleursTout';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn pastilleVue pastilleAilleurs';
  const maj = () => {
    const l = cases(), n = l.filter(x => x.checked).length;
    b.textContent = n ? '🚗 Déjà faites ailleurs : ' + n + ' sur ' + l.length : '🚗 Toutes déjà faites ailleurs';
    b.className = 'btn pastilleVue pastilleAilleurs ' + (n ? 'on' : 'btn-secondary');
    b.setAttribute('aria-pressed', n === l.length ? 'true' : 'false');
    b.title = 'Déjà faites dans une autre auto-école';
  };
  b.addEventListener('click', ev => {
    ev.preventDefault();
    const l = cases();
    const toutes = l.every(x => x.checked);
    l.forEach(x => {
      if(x.checked === !toutes) return;
      x.checked = !toutes;
      x.dispatchEvent(new Event('change', { bubbles: true }));
    });
    grille.dataset.ailleurs = toutes ? '' : '1';
    if(peindreTout) peindreTout();
    maj();
  });
  racine.addEventListener('change', ev => { if(ev.target && ev.target.classList && ev.target.classList.contains('mAilleurs')) maj(); });
  g._maj = maj;
  g.appendChild(b);
  maj();
  return g;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-suivi-eleve.js'] = true;
