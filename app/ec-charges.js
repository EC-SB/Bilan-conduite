/* Déployé le 04/11/2026 à 12:28 — v1352 */
/* ============================================================
   ec-charges.js
   💶 Les charges fixes — Gestion › L’argent (v1345).

   David, le 4 novembre : « dans gestion un tableau des coûts fixes
   mensuels et voir que je puisse en rajouter, j'ai des paiements
   trimestriels aussi, il faut penser à la TVA et au salaire ».

   L'écran est la copie du schéma validé (version 2) :
   · un mois à la fois (◀ ▶), ou « Lissé sur l'année » ;
   · le total TTC du mois, la case du chiffre d'affaires, ce qui
     reste une fois les charges payées ;
   · une carte par catégorie ; les salaires, la TVA et tout montant
     « à saisir » sont des cases ; chaque mois reprend le mois d'avant ;
   · le social en gris, « pour mémoire » : il est déjà dans le coût
     global des salaires, il ne compte pas deux fois ;
   · ⏸️ met en pause à partir du mois affiché, ▶️ reprend ;
   · ✏️ modifie, et supprime — vers la 🗑️ corbeille, d'où l'on remet.

   Administrateurs seuls, avec la case « 💶 Charges fixes » de
   ⚙️ Accès (le Worker vérifie les deux).

   TOUT EST EN CENTIMES, comme la caisse : on ne divise par cent
   qu'au moment d'afficher.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const CH_CATS = [
  ['locaux',     '🏢 Locaux et emprunts'],
  ['salaires',   '💶 Salaires — coût global du bulletin'],
  ['social',     '👥 Social — déjà dans les salaires'],
  ['impots',     '🧾 Impôts'],
  ['assurances', '🛡️ Assurances'],
  ['organismes', '📊 Comptable et organismes'],
  ['services',   '🔌 Services et abonnements'],
  ['vehicules',  '🚗 Véhicules'],
  ['autres',     '📦 Autres']
];
const CH_RYTHMES = [
  ['mensuel',     'Mensuel'],
  ['trimestriel', 'Trimestriel'],
  ['annuel',      'Annuel'],
  ['ponctuel',    'Ponctuel (une seule fois)'],
  ['variable',    'Variable (montant à saisir chaque mois)']
];
const CH_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
                 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const CH_MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.',
                       'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const CH = {
  mois: '',          /* 'AAAA-MM' affiché */
  vue: 'mois',       /* 'mois' | 'lisse' */
  data: null,        /* la réponse de chargesLire */
  charge: false,
  erreur: '',
  edition: null,     /* id de la ligne ouverte en ✏️, ou 'nouveau' */
  confirmer: false,  /* la confirmation de 🗑️ est ouverte */
  corbeilleOuverte: false
};

/* ---------- petits outils ---------- */
function moisDuJourCH(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function moisDecaleCH(m, n){
  let a = Number(m.slice(0, 4)), k = Number(m.slice(5, 7)) - 1 + n;
  a += Math.floor(k / 12); k = ((k % 12) + 12) % 12;
  return a + '-' + String(k + 1).padStart(2, '0');
}
function nomDuMoisCH(m, majuscule){
  const t = CH_MOIS[Number(m.slice(5, 7)) - 1] + ' ' + m.slice(0, 4);
  return majuscule ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}
function nombreCH(c){
  return (c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/[  ]/g, ' ');
}
function eurCH(c){ return nombreCH(c) + ' €'; }
function eurRondCH(c){
  return Math.round(c / 100).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' €';
}
/* « 2 840,58 » → 284058 ; vide → null ; illisible → NaN */
function lireEurosCH(t){
  const s = String(t == null ? '' : t).replace(/[\s  €]/g, '').replace(',', '.');
  if(s === '') return null;
  if(!/^-?\d+(\.\d{0,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}
function elCH(tag, cls, texte){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(texte != null) e.textContent = texte;
  return e;
}
function boutonCH(texte, cls, quoi, titre){
  const b = elCH('button', 'btn ' + (cls || 'btn-secondary'), texte);
  b.type = 'button';
  if(titre){ b.title = titre; b.setAttribute('aria-label', titre); }
  if(quoi) b.addEventListener('click', ev => quoi(ev, b));
  return b;
}

/* ---------- ce qu'une ligne vaut pour le mois affiché ---------- */
function moisDeLaLigneCH(L){
  return String(L.mois || '').split(',').map(Number).filter(n => n >= 1 && n <= 12);
}
function activeCH(L, m){
  if(L.rythme === 'ponctuel') return L.mois === m;
  return !L.debut || m >= L.debut;
}
function tombeCH(L, m){
  if(!activeCH(L, m)) return false;
  if(L.rythme === 'trimestriel' || L.rythme === 'annuel')
    return moisDeLaLigneCH(L).indexOf(Number(m.slice(5, 7))) !== -1;
  return true;
}
function enPauseCH(L, m){
  return (L.pauses || []).some(r => r.du <= m && (!r.au || m <= r.au));
}
function pauseDepuisCH(L, m){
  const r = (L.pauses || []).find(r => r.du <= m && (!r.au || m <= r.au));
  return r ? r.du : '';
}
function horsTotalCH(L, m){ return L.cat === 'social' || enPauseCH(L, m); }

/* ---------- 🧮 v1352 — le calcul du total ----------
   David : « ce n'est pas clair les salaires pour Chrystel et elle veut
   le montant des charges fixes sans les salaires ». Un tableau dans le
   bloc du total : on coche ce qui compte (le même réglage pour tous),
   et les salaires se saisissent « tout dedans » (une case, le coût
   global) ou « net + charges à part » (deux cases). */
const CH_CALCUL_LIB = {
  locaux: '🏢 Locaux et emprunts',
  salCharges: '🏛️ Charges des salaires',
  social: '👥 Social (URSSAF…) — déjà dans les salaires',
  impots: '🧾 Impôts',
  assurances: '🛡️ Assurances',
  organismes: '📊 Comptable et organismes',
  services: '🔌 Services et abonnements',
  vehicules: '🚗 Véhicules',
  autres: '📦 Autres'
};
function calculCH(){ return (CH.data && CH.data.calcul) || { salaires: 'dedans', cats: {} }; }
function aPartCH(){ return calculCH().salaires === 'apart'; }
function compteCH(cle){
  const c = calculCH().cats || {};
  return (cle in c) ? !!c[cle] : cle !== 'social';
}
function libCalculCH(cle){
  if(cle === 'salaires') return aPartCH() ? '💶 Salaires nets' : '💶 Salaires — coût global';
  return CH_CALCUL_LIB[cle] || cle;
}
/* Une ligne, rangée dans ses « cases du calcul » : un salaire à part se
   coupe en net + charges ; sans détail, il va entier dans les nets */
function morceauxCH(L, v){
  if(L.cat !== 'salaires') return [{ cle: L.cat, v: v }];
  if(!aPartCH()) return [{ cle: 'salaires', v: v }];
  if(L.net == null && L.soc == null) return [{ cle: 'salaires', v: v, seul: true }];
  const net = Number(L.net) || 0, soc = Number(L.soc) || 0, tot = net + soc;
  const vn = tot ? Math.round(v * net / tot) : 0;
  return [{ cle: 'salaires', v: vn }, { cle: 'salCharges', v: v - vn }];
}
/* Les sommes de chaque case du calcul, ce mois-ci et lissées */
function sommesCH(lignes, m){
  const S = {};
  let seul = 0;
  const ordre = ['locaux', 'salaires'].concat(aPartCH() ? ['salCharges'] : [], ['social', 'impots', 'assurances', 'organismes', 'services', 'vehicules', 'autres']);
  ordre.forEach(k => { S[k] = { mois: 0, lisse: 0, n: 0 }; });
  lignes.forEach(L => {
    if(enPauseCH(L, m)) return;
    const a = morceauxCH(L, duMoisCH(L, m)), b = morceauxCH(L, lisseCH(L, m));
    a.forEach((x, i) => {
      const k = S[x.cle] ? x.cle : 'autres';
      S[k].mois += x.v; S[k].lisse += (b[i] ? b[i].v : 0); S[k].n++;
      if(x.seul) seul += x.v;
    });
  });
  if(aPartCH() && S.salaires.n) S.salCharges.n = Math.max(S.salCharges.n, 1);
  let total = 0, lisse = 0;
  ordre.forEach(k => { if(compteCH(k)){ total += S[k].mois; lisse += S[k].lisse; } });
  return { S, ordre, total, lisse, seul };
}
function changerCalculCH(modif, bouton){
  const c = calculCH();
  const neuf = { salaires: c.salaires, cats: Object.assign({}, c.cats || {}) };
  modif(neuf);
  return agirCharges({ action: 'chargesCalcul', calcul: neuf }, bouton);
}
function duMoisCH(L, m){ return tombeCH(L, m) ? (Number(L.val) || 0) : 0; }
function lisseCH(L, m){
  if(L.rythme === 'ponctuel' || !activeCH(L, m)) return 0;
  const v = Number(L.val) || 0;
  if(L.rythme === 'trimestriel' || L.rythme === 'annuel')
    return Math.round(v * moisDeLaLigneCH(L).length / 12);
  return v;
}
function rythmeLisibleCH(L){
  const ms = moisDeLaLigneCH(L);
  if(L.rythme === 'trimestriel') return 'trimestriel' + (ms.length ? ' · ' + ms.map(n => CH_MOIS_COURT[n - 1]).join(', ') : '');
  if(L.rythme === 'annuel') return 'annuel' + (ms.length ? ' · ' + ms.map(n => CH_MOIS[n - 1]).join(' et ') : '');
  if(L.rythme === 'ponctuel') return 'une fois' + (L.mois ? ' · ' + nomDuMoisCH(L.mois) : '');
  if(L.rythme === 'variable') return 'variable';
  return 'mensuel';
}
/* Une case plutôt qu'un montant : les salaires, la TVA (« saisie »),
   une charge variable, ou une charge du mois dont on ne connaît pas
   encore le montant (la CFE). */
function aUneCaseCH(L){ return !!L.saisie || L.rythme === 'variable' || L.val == null; }

/* ============================================================
   L'ÉCRAN
   ============================================================ */
function afficherCharges(){
  if(!CH.mois) CH.mois = moisDuJourCH();
  chargerCharges();
}
async function chargerCharges(){
  CH.charge = true; CH.erreur = '';
  dessinerCharges();
  try{
    const r = await appelPrep({ action: 'chargesLire', mois: CH.mois });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    CH.data = r;
  }catch(e){
    CH.data = null;
    CH.erreur = (e && e.message) || String(e);
  }
  CH.charge = false;
  dessinerCharges();
}
/* Une écriture rend tout l'écran du mois : on redessine d'un coup. */
async function agirCharges(corps, bouton){
  if(bouton) bouton.disabled = true;
  CH.erreur = '';
  try{
    const r = await appelPrep(Object.assign({ mois: CH.mois }, corps));
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    CH.data = r;
    dessinerCharges();
    return true;
  }catch(e){
    CH.erreur = (e && e.message) || String(e);
    dessinerCharges();
    return false;
  }finally{
    if(bouton) bouton.disabled = false;
  }
}

function dessinerCharges(){
  const z = $('chargesZone');
  if(!z) return;
  z.innerHTML = '';
  const m = CH.mois;

  if(CH.charge && !CH.data){ z.appendChild(elCH('div', 'empty', 'Chargement…')); return; }
  if(!CH.data){
    z.appendChild(elCH('div', 'empty', '⚠️ ' + (CH.erreur || 'Lecture impossible.')));
    const r = boutonCH('↻ Réessayer', 'btn-secondary chgAuto', () => chargerCharges());
    z.appendChild(r);
    return;
  }
  if(CH.erreur) z.appendChild(elCH('div', 'chgErreur', '⚠️ ' + CH.erreur));

  if(CH.data.vide){ dessinerChargesVides(z); return; }

  /* Le mois, et la façon de compter */
  const per = elCH('div', 'chgMois');
  per.appendChild(boutonCH('◀', 'btn-secondary chgAuto', () => changerMoisCH(-1), 'Mois précédent'));
  per.appendChild(elCH('strong', 'chgMoisNom', nomDuMoisCH(m, true)));
  per.appendChild(boutonCH('▶', 'btn-secondary chgAuto', () => changerMoisCH(1), 'Mois suivant'));
  per.appendChild(elCH('span', 'chgVide'));
  per.appendChild(boutonCH('Ce mois-ci', (CH.vue === 'mois' ? 'btn-primary' : 'btn-secondary') + ' chgAuto',
    () => { CH.vue = 'mois'; if(m !== moisDuJourCH()){ CH.mois = moisDuJourCH(); chargerCharges(); } else dessinerCharges(); }));
  per.appendChild(boutonCH('Lissé sur l’année', (CH.vue === 'lisse' ? 'btn-primary' : 'btn-secondary') + ' chgAuto',
    () => { CH.vue = 'lisse'; dessinerCharges(); }));
  z.appendChild(per);

  const lignes = CH.data.lignes || [];
  const calc = sommesCH(lignes, m);
  z.appendChild(blocTotalCH(calc.total, calc.lisse, calc));

  CH_CATS.forEach(([cat, titre]) => {
    const L = lignes.filter(x => x.cat === cat);
    if(cat === 'salaires' && aPartCH()) titre = '💶 Salaires — net + charges du bulletin';
    if(L.length) z.appendChild(carteCategorieCH(cat, titre, L));
  });

  const aj = elCH('div', 'chgAjout');
  if(CH.edition === 'nouveau') aj.appendChild(cadreLigneCH(null));
  else aj.appendChild(boutonCH('➕ Ajouter une charge', 'btn-primary chgAuto', () => {
    CH.edition = 'nouveau'; CH.confirmer = false; dessinerCharges();
    const c = $('chargesZone').querySelector('.chgAjout input');
    if(c) c.focus();
  }));
  z.appendChild(aj);

  const corb = CH.data.corbeille || [];
  if(corb.length) z.appendChild(corbeilleCH(corb));
}

function changerMoisCH(n){
  CH.mois = moisDecaleCH(CH.mois, n);
  CH.edition = null; CH.confirmer = false;
  chargerCharges();
}

/* Le total, comme dans 💸 Coûts IA */
function blocTotalCH(total, lisse, calc){
  const m = CH.mois, enLisse = CH.vue === 'lisse';
  const t = elCH('div', 'chgTotal');
  t.appendChild(elCH('div', 'chgPetit', enLisse
    ? 'Moyenne par mois sur un an, trimestriels et annuels répartis · montants TTC'
    : 'Ce qui sort du compte en ' + nomDuMoisCH(m) + ' · montants TTC'));

  const l1 = elCH('div', 'chgLigneTotal');
  const titre = elCH('div', '');
  titre.appendChild(elCH('strong', '', enLisse ? 'Charges lissées par mois' : 'Charges du mois'));
  /* ce qui est laissé de côté, dit en clair sous le titre */
  const sans = calc.ordre.filter(k => k !== 'social' && calc.S[k].n && !compteCH(k)).map(k => libCalculCH(k).replace(/^\S+\s/, '').replace(/ — .*$/, ''));
  if(sans.length) titre.appendChild(elCH('div', 'chgPetit', 'sans : ' + sans.join(', ')));
  l1.appendChild(titre);
  const gros = elCH('strong', 'chgGros', eurCH(enLisse ? lisse : total));
  gros.appendChild(elCH('span', 'chgTtc', ' TTC'));
  l1.appendChild(gros);
  t.appendChild(l1);
  t.appendChild(tableauCalculCH(calc));

  /* Le chiffre d'affaires : une case qu'on change chaque mois */
  const l2 = elCH('div', 'chgLigneCA');
  const lib = elCH('span', '', 'Chiffre d’affaires du mois ');
  lib.appendChild(elCH('span', 'chgPetit', '(à changer chaque mois)'));
  l2.appendChild(lib);
  const caisse = elCH('span', 'chgCase');
  caisse.appendChild(caseMontantCH('__ca', CH.data.ca, 'Chiffre d’affaires de ' + nomDuMoisCH(m)));
  caisse.appendChild(document.createTextNode(' €'));
  l2.appendChild(caisse);
  t.appendChild(l2);

  const ca = Number(CH.data.ca) || 0;
  const reste = ca - (enLisse ? lisse : total);
  const l3 = elCH('div', 'chgLigneTotal');
  l3.appendChild(elCH('span', '', 'Reste une fois les charges payées'));
  l3.appendChild(elCH('strong', 'chgReste' + (reste < 0 ? ' chgNegatif' : ''),
    (reste < 0 ? '− ' : '+ ') + eurCH(Math.abs(reste))));
  t.appendChild(l3);

  const pied = elCH('div', 'chgPied');
  pied.appendChild(document.createTextNode(enLisse
    ? 'Ce mois-ci : ' + eurRondCH(total)
    : 'Lissé sur 12 mois (trimestriels et annuels répartis) : ' + eurRondCH(lisse) + ' par mois'));
  pied.appendChild(document.createElement('br'));
  pied.appendChild(document.createTextNode('Les lignes en pause et les cases décochées ne comptent pas dans le total'));
  t.appendChild(pied);
  return t;
}

/* 🧮 Le tableau du calcul : la bascule des salaires, puis une case à
   cocher par catégorie, avec son montant (du mois ou lissé) */
function tableauCalculCH(calc){
  const enLisse = CH.vue === 'lisse';
  const d = elCH('div', 'chgCalcul');
  const tete = elCH('div', 'chgCalculTete');
  tete.appendChild(elCH('span', 'chgCalculTitre', '🧮 Ce qui compte dans le total'));
  const bas = elCH('span', 'chgBascule');
  bas.appendChild(elCH('span', 'chgPetit', 'Salaires :'));
  bas.appendChild(boutonCH('Tout dedans', (aPartCH() ? 'btn-secondary' : 'btn-primary') + ' chgMini',
    (ev, b) => { if(aPartCH()) changerCalculCH(c => { c.salaires = 'dedans'; }, b); }, 'Une case par personne : le coût global du bulletin'));
  bas.appendChild(boutonCH('Net + charges à part', (aPartCH() ? 'btn-primary' : 'btn-secondary') + ' chgMini',
    (ev, b) => { if(!aPartCH()) changerCalculCH(c => { c.salaires = 'apart'; }, b); }, 'Deux cases par personne : le net et les charges'));
  tete.appendChild(bas);
  d.appendChild(tete);

  calc.ordre.forEach(k => {
    const x = calc.S[k];
    if(!x.n) return;
    const on = compteCH(k);
    const l = elCH('label', 'chgCalculLigne' + (on ? '' : ' chgTerne'));
    const c = elCH('input', '');
    c.type = 'checkbox'; c.checked = on;
    c.addEventListener('change', () => { c.disabled = true; changerCalculCH(v => { v.cats[k] = c.checked; }); });
    l.appendChild(c);
    l.appendChild(elCH('span', 'chgCalculLib', libCalculCH(k)));
    l.appendChild(elCH('span', 'chgCalculMt', eurCH(enLisse ? x.lisse : x.mois)));
    d.appendChild(l);
  });

  const avert = [];
  if(compteCH('social') && calc.S.social.n && ((!aPartCH() && compteCH('salaires')) || (aPartCH() && compteCH('salCharges'))))
    avert.push('⚠️ Le social (URSSAF…) est déjà dans les salaires : coché avec eux, il compte deux fois.');
  if(aPartCH() && calc.seul && !enLisse)
    avert.push('⚠️ ' + eurCH(calc.seul) + ' de salaires saisis « tout dedans », sans le détail : comptés dans les salaires nets. Remplis net + charges pour les séparer.');
  avert.forEach(a => d.appendChild(elCH('div', 'chgCalculAvert', a)));
  return d;
}

/* Une carte par catégorie */
function carteCategorieCH(cat, titre, L){
  const m = CH.mois, enLisse = CH.vue === 'lisse';
  const d = elCH('div', 'chgCarte');
  const tete = elCH('div', 'chgTete');
  tete.appendChild(elCH('span', '', titre));
  const compte = cat === 'salaires' ? (compteCH('salaires') || (aPartCH() && compteCH('salCharges'))) : compteCH(cat);
  if(cat === 'social' && !compte) tete.appendChild(elCH('span', 'chgMemoire', 'pour mémoire'));
  else {
    const s = L.filter(x => !enPauseCH(x, m))
               .reduce((a, x) => a + (enLisse ? lisseCH(x, m) : duMoisCH(x, m)), 0);
    const droite = elCH('span', '');
    if(!compte) droite.appendChild(elCH('span', 'chgMemoire', 'hors total · '));
    droite.appendChild(document.createTextNode(eurCH(s)));
    tete.appendChild(droite);
  }
  d.appendChild(tete);
  L.forEach(x => {
    d.appendChild(ligneCH(x));
    if(CH.edition === x.id) d.appendChild(cadreLigneCH(x));
  });
  return d;
}

function ligneCH(L){
  const m = CH.mois, enLisse = CH.vue === 'lisse';
  const pause = enPauseCH(L, m), gris = L.cat === 'social' && !compteCH('social');
  const terne = pause || gris;
  const l = elCH('div', 'chgLigne' + (CH.edition === L.id ? ' chgOuverte' : ''));

  const g = elCH('div', 'chgNom' + (terne ? ' chgTerne' : ''));
  g.appendChild(elCH('div', 'chgLib', L.nom));
  const sous = [];
  if(L.cat === 'salaires'){ if(L.note) sous.push(L.note); }
  else {
    sous.push(rythmeLisibleCH(L));
    if(L.jour) sous.push(L.jour);
    if(L.note && L.lien !== 'garages') sous.push(L.note);
    /* 🅿️ v1346 — la ligne « Goulard — garages » se calcule */
    if(L.lien === 'garages') sous.push('🅿️ calculé depuis la Flotte : ' + L.nbGarages + ' garage' + (L.nbGarages > 1 ? 's' : '') + ' × loyer × 3');
  }
  if(pause){
    const du = pauseDepuisCH(L, m);
    sous.push('⏸️ en pause depuis ' + (du.slice(0, 4) === m.slice(0, 4)
      ? CH_MOIS[Number(du.slice(5, 7)) - 1] : nomDuMoisCH(du)));
  }
  if(L.cat === 'social') sous.push('déjà dans les salaires');
  g.appendChild(elCH('div', 'chgSous', sous.join(' · ')));
  l.appendChild(g);

  const mt = elCH('div', 'chgMontant' + (terne ? ' chgTerne' : ''));
  if(enLisse){
    if(L.rythme === 'ponctuel') mt.appendChild(elCH('span', 'chgPetit', 'ponctuel'));
    else if(!activeCH(L, m)) mt.appendChild(elCH('span', 'chgPetit', 'pas encore'));
    else if(L.val == null) mt.appendChild(elCH('span', 'chgPetit', 'montant à saisir'));
    else mt.appendChild(elCH('strong', '', eurCH(lisseCH(L, m))));
  }else if(!tombeCH(L, m)){
    mt.appendChild(elCH('span', 'chgPetit', 'pas ce mois-ci'));
  }else if(L.cat === 'salaires' && aPartCH() && !pause){
    mt.appendChild(casesSalaireCH(L));
  }else if(aUneCaseCH(L) && !pause){
    mt.appendChild(caseMontantCH(L.id, L.val, L.nom + ' — ' + nomDuMoisCH(m)));
  }else if(L.val == null){
    mt.appendChild(elCH('span', 'chgPetit', 'montant à saisir'));
  }else{
    mt.appendChild(elCH('strong', '', eurCH(L.val)));
  }
  l.appendChild(mt);

  const act = elCH('div', 'chgActions');
  if(L.lien === 'garages'){
    act.appendChild(boutonCH('🅿️ Voir les garages', 'btn-secondary chgMini', () => {
      afficherOnglet('gestion');
      afficherVue('gestion', 'flotte');
      setTimeout(() => { const g = $('garagesZone'); if(g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 900);
    }, 'Les loyers se changent dans la fiche de chaque garage'));
    l.appendChild(act);
    return l;
  }
  if(L.cat !== 'salaires'){
    if(pause){
      act.appendChild(boutonCH('▶️ Reprendre', 'btn-secondary chgMini',
        (ev, b) => agirCharges({ action: 'chargesPause', id: L.id, pause: false }, b),
        'Reprendre à partir de ' + nomDuMoisCH(m)));
    }else{
      act.appendChild(boutonCH('⏸️', 'btn-secondary chgMini',
        (ev, b) => agirCharges({ action: 'chargesPause', id: L.id, pause: true }, b),
        'Mettre en pause à partir de ' + nomDuMoisCH(m)));
    }
  }
  act.appendChild(boutonCH('✏️', 'btn-secondary chgMini', () => {
    CH.edition = (CH.edition === L.id) ? null : L.id;
    CH.confirmer = false;
    dessinerCharges();
  }, 'Modifier'));
  l.appendChild(act);
  return l;
}

/* La case d'un mois : elle part quand on la quitte (ou sur Entrée).
   Vide : on efface la saisie de ce mois, le mois d'avant reprend. */
function caseMontantCH(id, val, nom){
  const i = elCH('input', 'chgSaisie');
  i.type = 'text';
  i.inputMode = 'decimal';
  i.value = (val == null) ? '' : nombreCH(val);
  i.placeholder = 'à saisir';
  i.setAttribute('aria-label', nom);
  const avant = i.value;
  const envoyer = async () => {
    if(i.value.trim() === avant.trim()) return;
    const v = lireEurosCH(i.value);
    if(Number.isNaN(v)){
      i.classList.add('chgFaux');
      i.title = 'Un montant comme 1 234,56';
      return;
    }
    i.classList.remove('chgFaux');
    i.disabled = true;
    await agirCharges({ action: 'chargesMontant', ligne: id, montant: v });
  };
  i.addEventListener('change', envoyer);
  i.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); i.blur(); } });
  return i;
}

/* 🧮 Un salaire « à part » : le net et les charges, et leur somme.
   Les deux cases partent ensemble quand on en quitte une. */
function casesSalaireCH(L){
  const m = CH.mois;
  const d = elCH('div', 'chgDeux');
  const une = (val, nom, mot) => {
    const w = elCH('label', 'chgDeuxCase');
    w.appendChild(elCH('span', 'chgPetit', mot));
    const i = elCH('input', 'chgSaisie');
    i.type = 'text'; i.inputMode = 'decimal';
    i.value = (val == null) ? '' : nombreCH(val);
    i.placeholder = 'à saisir';
    i.setAttribute('aria-label', L.nom + ' — ' + nom + ' — ' + nomDuMoisCH(m));
    w.appendChild(i);
    d.appendChild(w);
    return i;
  };
  const iNet = une(L.net, 'salaire net', 'net');
  const iSoc = une(L.soc, 'charges', '+ charges');
  const avant = iNet.value + '|' + iSoc.value;
  const envoyer = async () => {
    if(iNet.value.trim() + '|' + iSoc.value.trim() === avant) return;
    const n = lireEurosCH(iNet.value), c = lireEurosCH(iSoc.value);
    let faux = false;
    [[iNet, n], [iSoc, c]].forEach(([i, v]) => {
      i.classList.toggle('chgFaux', Number.isNaN(v));
      if(Number.isNaN(v)){ i.title = 'Un montant comme 1 234,56'; faux = true; }
    });
    if(faux) return;
    iNet.disabled = iSoc.disabled = true;
    await agirCharges({ action: 'chargesMontant', ligne: L.id, net: n, charges: c });
  };
  [iNet, iSoc].forEach(i => {
    i.addEventListener('change', envoyer);
    i.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); i.blur(); } });
  });
  const tot = elCH('div', 'chgPetit chgDeuxTotal');
  if(L.net == null && L.soc == null) tot.textContent = L.val == null ? '' : 'tout dedans : ' + eurCH(L.val) + ' (sans le détail)';
  else tot.textContent = '= ' + eurCH(L.val || 0);
  d.appendChild(tot);
  return d;
}

/* ✏️ et ➕ — le même cadre */
function cadreLigneCH(L){
  const nouveau = !L;
  const f = nouveau
    ? { nom: '', cat: 'services', rythme: 'mensuel', montant: null, jour: '', mois: CH.mois, note: '', saisie: 0 }
    : Object.assign({}, L);
  const c = elCH('div', 'chgCadre');
  c.appendChild(elCH('div', 'chgCadreTitre', nouveau ? '➕ Nouvelle charge' : '✏️ Modifier « ' + L.nom + ' »'));

  const grille = elCH('div', 'chgGrille');
  const champ = (lib, controle) => {
    const w = elCH('label', 'chgChamp', lib);
    w.appendChild(controle);
    grille.appendChild(w);
    return controle;
  };
  const texte = (v, ph) => { const i = elCH('input'); i.type = 'text'; i.value = v || ''; if(ph) i.placeholder = ph; return i; };
  const choix = (liste, v) => {
    const s = elCH('select');
    liste.forEach(([k, t]) => { const o = elCH('option', '', t); o.value = k; if(k === v) o.selected = true; s.appendChild(o); });
    return s;
  };

  const iNom = champ('Libellé', texte(f.nom, 'ex. Code n Go — examens de code'));
  const iCat = champ('Catégorie', choix(CH_CATS, f.cat));
  const iMontant = champ('Montant TTC', texte(f.montant == null ? '' : nombreCH(f.montant), 'à saisir'));
  iMontant.inputMode = 'decimal';
  const iRythme = champ('Rythme', choix(CH_RYTHMES, f.rythme));
  const iJour = champ('Jour du prélèvement', texte(f.jour, 'ex. le 5'));

  /* Le mois dépend du rythme : un mois précis pour une charge
     ponctuelle, les mois du prélèvement pour un trimestriel ou un
     annuel, rien pour le reste. */
  const zMois = elCH('div', 'chgChamp chgChampMois');
  grille.appendChild(zMois);
  let lireMois = () => '';
  const dessinerMois = () => {
    zMois.innerHTML = '';
    const r = iRythme.value;
    if(r === 'ponctuel'){
      zMois.appendChild(document.createTextNode('Mois'));
      const s = elCH('select');
      const base = moisDecaleCH(CH.mois, -12);
      const pris = /^\d{4}-\d{2}$/.test(f.mois) ? f.mois : CH.mois;
      for(let k = 0; k <= 24; k++){
        const mm = moisDecaleCH(base, k);
        const o = elCH('option', '', nomDuMoisCH(mm, true)); o.value = mm;
        if(mm === pris) o.selected = true;
        s.appendChild(o);
      }
      zMois.appendChild(s);
      lireMois = () => s.value;
    }else if(r === 'trimestriel' || r === 'annuel'){
      zMois.appendChild(document.createTextNode(r === 'annuel' ? 'Mois du prélèvement' : 'Mois des prélèvements'));
      const coches = elCH('div', 'chgCoches');
      const deja = String(f.mois || '').split(',').map(Number);
      const boites = [];
      CH_MOIS_COURT.forEach((t, k) => {
        const lab = elCH('label', 'chgCoche');
        const b = elCH('input'); b.type = 'checkbox'; b.value = String(k + 1);
        b.checked = deja.indexOf(k + 1) !== -1;
        lab.appendChild(b); lab.appendChild(document.createTextNode(t));
        coches.appendChild(lab); boites.push(b);
      });
      zMois.appendChild(coches);
      lireMois = () => boites.filter(b => b.checked).map(b => b.value).join(',');
    }else{
      lireMois = () => '';
    }
  };
  dessinerMois();
  iRythme.addEventListener('change', () => { f.mois = lireMois() || f.mois; dessinerMois(); });
  c.appendChild(grille);

  const wNote = elCH('label', 'chgChamp', 'Note');
  const iNote = texte(f.note, 'ex. remboursé par l’élève');
  wNote.appendChild(iNote);
  c.appendChild(wNote);

  const wSaisie = elCH('label', 'chgCoche chgCocheLongue');
  const iSaisie = elCH('input'); iSaisie.type = 'checkbox'; iSaisie.checked = !!f.saisie;
  wSaisie.appendChild(iSaisie);
  wSaisie.appendChild(document.createTextNode('Une case à remplir chaque mois (comme les salaires et la TVA) — chaque mois reprend le montant du mois d’avant'));
  c.appendChild(wSaisie);

  const bas = elCH('div', 'chgBoutons');
  bas.appendChild(boutonCH('Enregistrer', 'btn-primary chgAuto', async (ev, b) => {
    const montant = lireEurosCH(iMontant.value);
    if(Number.isNaN(montant)){ CH.erreur = 'Le montant doit s’écrire comme 1 234,56.'; dessinerChargesErreurSeule(); return; }
    const ligne = { nom: iNom.value.trim(), cat: iCat.value, rythme: iRythme.value, montant: montant,
                    jour: iJour.value.trim(), mois: lireMois(), note: iNote.value.trim(), saisie: iSaisie.checked ? 1 : 0 };
    if(!nouveau) ligne.id = L.id;
    const fait = await agirCharges({ action: 'chargesLigne', ligne: ligne }, b);
    if(fait){ CH.edition = null; CH.confirmer = false; dessinerCharges(); }
  }));
  bas.appendChild(boutonCH('Annuler', 'btn-secondary chgAuto', () => { CH.edition = null; CH.confirmer = false; CH.erreur = ''; dessinerCharges(); }));
  if(!nouveau){
    bas.appendChild(elCH('span', 'chgVide'));
    bas.appendChild(boutonCH('🗑️ Supprimer', 'btn-secondary chgAuto chgRouge', () => { CH.confirmer = true; dessinerCharges(); }));
  }
  c.appendChild(bas);

  if(!nouveau && CH.confirmer){
    const q = elCH('div', 'chgConfirme');
    q.appendChild(elCH('span', '', 'Supprimer « ' + L.nom + ' » ? Elle part dans la corbeille, tu pourras la remettre.'));
    q.appendChild(boutonCH('Oui, supprimer', 'btn-secondary chgAuto chgRouge', async (ev, b) => {
      const fait = await agirCharges({ action: 'chargesSupprimer', id: L.id }, b);
      if(fait){ CH.edition = null; CH.confirmer = false; dessinerCharges(); }
    }));
    q.appendChild(boutonCH('Non', 'btn-secondary chgAuto', () => { CH.confirmer = false; dessinerCharges(); }));
    c.appendChild(q);
  }
  return c;
}
/* Une erreur de saisie dans le cadre : on la montre sans refermer
   le cadre ni perdre ce qui est tapé. */
function dessinerChargesErreurSeule(){
  const z = $('chargesZone');
  if(!z) return;
  let e = z.querySelector('.chgCadre .chgErreur');
  if(!e){
    e = elCH('div', 'chgErreur');
    const cadre = z.querySelector('.chgCadre');
    if(cadre) cadre.insertBefore(e, cadre.querySelector('.chgBoutons'));
  }
  e.textContent = '⚠️ ' + CH.erreur;
  CH.erreur = '';
}

/* 🗑️ La corbeille, repliée en bas */
function corbeilleCH(corb){
  const d = elCH('details', 'chgCorbeille');
  d.open = CH.corbeilleOuverte;
  d.addEventListener('toggle', () => { CH.corbeilleOuverte = d.open; });
  d.appendChild(elCH('summary', '', '🗑️ Corbeille (' + corb.length + ')'));
  corb.forEach(x => {
    const l = elCH('div', 'chgLigne');
    const g = elCH('div', 'chgNom');
    g.appendChild(elCH('div', 'chgLib', x.nom));
    g.appendChild(elCH('div', 'chgSous', 'supprimée le ' + new Date(x.supprLe).toLocaleDateString('fr-FR') +
      (x.supprPar ? ' par ' + x.supprPar : '')));
    l.appendChild(g);
    l.appendChild(boutonCH('↩️ Remettre', 'btn-secondary chgMini',
      (ev, b) => agirCharges({ action: 'chargesRemettre', id: x.id }, b), 'La remettre à sa place'));
    d.appendChild(l);
  });
  return d;
}

/* La toute première fois : la liste de départ tient dans un fichier
   (charges-depart.json) que David charge ici — les salaires de
   l'équipe n'ont rien à faire dans le code de l'application. */
function dessinerChargesVides(z){
  const b = elCH('div', 'chgTotal');
  b.appendChild(elCH('strong', '', 'Aucune charge pour l’instant.'));
  b.appendChild(elCH('div', 'chgPetit chgEspace',
    'Charge la liste de départ (le fichier « charges-depart.json » préparé depuis le relevé et les bulletins), ou ajoute les charges une par une.'));
  const rang = elCH('div', 'chgBoutons');
  const fichier = elCH('input'); fichier.type = 'file'; fichier.accept = '.json,application/json'; fichier.hidden = true;
  fichier.addEventListener('change', async () => {
    const f = fichier.files && fichier.files[0];
    if(!f) return;
    try{
      const j = JSON.parse(await f.text());
      if(!j || j.quoi !== 'charges-fixes' || !Array.isArray(j.lignes)) throw new Error('Ce fichier n’est pas une liste de charges.');
      await agirCharges({ action: 'chargesImporter', lignes: j.lignes, caDepart: j.caDepart });
    }catch(e){
      CH.erreur = (e && e.message) || String(e);
      dessinerCharges();
    }
  });
  rang.appendChild(fichier);
  rang.appendChild(boutonCH('📥 Charger la liste de départ', 'btn-primary chgAuto', () => fichier.click()));
  rang.appendChild(boutonCH('➕ Ajouter une charge', 'btn-secondary chgAuto', () => {
    CH.data.vide = false; CH.edition = 'nouveau'; dessinerCharges();
  }));
  b.appendChild(rang);
  z.appendChild(b);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-charges.js'] = true;
