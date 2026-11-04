/* Déployé le 04/11/2026 à 13:36 — v1353 */
/* ============================================================
   ec-tarifs-drivup.js
   📥 Drivup — Outils › 💰 Tarifs (v1353), et la fenêtre « Reçu de
   Drivup — les prix » que le favori ouvre.

   David, le 4 novembre : « est-ce que tu peux faire les changements
   de tarifs sur Drivup aussi ? ». Drivup refuse son API : le favori
   « 📥 App Évolution », cliqué dans Drivup sur Paramètres ›
   Prestations (ou Produits, ou Formules), lit les trois listes et
   change les prix cochés, comme à la main (son contrat l'autorise).

   Ses réponses au schéma (4 novembre) :
   · chaque prix Drivup se relie UNE fois à ce qui fait son prix dans
     l'appli (tarif horaire, prestation, total d'une fiche), avec
     « combien de fois » (× ½ pour 30 min…) ;
   · l'appli devine les liens d'après le nom : « ✅ Accepter les N
     propositions » d'un coup, liste à relire ;
   · un onglet 📥 Drivup ici, comme 🛒 Le site ;
   · les formules (forfaits) se comparent au total d'une fiche, en
     lecture seule : Drivup les recalcule tout seul ;
   · prix à 0 € et « - HT » à 0 % : jamais proposés ; archivées :
     ignorées (le favori ne les lit pas) ;
   · « Tarif de base » ET « Tarif supplémentaire » reçoivent le même
     prix ; ça change aussi les formules qui les contiennent (il le sait).

   Relier et changer : administrateurs seulement.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const DVP = { lu: false, charge: false, lignes: [], liens: {}, luLe: 0, luPar: '', admin: false, erreur: '' };

function dvpEch(t){ return (typeof woEch === 'function') ? woEch(t) : String(t == null ? '' : t).replace(/</g, '&lt;'); }
function dvpQuand(ms){
  if(!ms) return '';
  const d = new Date(ms);
  return d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
const dvpRond = n => Math.round((Number(n) || 0) * 100) / 100;
const dvpSans = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function dvpFois(f){
  const n = Number(f) || 1;
  if(n === 0.5) return '× ½';
  if(n === 0.25) return '× ¼';
  if(n === 1.5) return '× 1 ½';
  return '× ' + String(n).replace('.', ',');
}

async function dvpCharger(){
  DVP.charge = true;
  try{
    const r = await appelPrep({ action: 'drivupPrixLire' });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    dvpPrendre(r);
  }catch(e){ DVP.erreur = (e && e.message) || String(e); }
  DVP.charge = false;
}
function dvpPrendre(r){
  Object.assign(DVP, { lu: true, erreur: '', lignes: r.lignes || [], liens: r.liens || {}, luLe: r.luLe || 0, luPar: r.luPar || '', admin: !!r.admin });
}
/* Pour la fenêtre « 👁️ Ce qui change » : lu en silence à l'ouverture des Tarifs */
function dvpPrecharger(){ if(!DVP.lu && !DVP.charge && typeof ACCES !== 'undefined' && ACCES.role === 'admin') dvpCharger().catch(() => {}); }

/* ---------- ce qu'un prix Drivup devrait valoir ---------- */
/* Jamais proposés (David) : 0 €, et les « - HT » à 0 % de TVA */
function dvpDeCote(x){
  if(x.sorte === 'formule') return false;
  return !(Number(x.prix) > 0) || /^0\s*%/.test(String(x.tva || '')) || /(^|[\s-])HT\b/.test(String(x.nom || ''));
}
function dvpEtat(x, d){
  const l = DVP.liens[x.cle] || null;
  if(!l || !l.source) return { lien: null, relie: false };
  const base = (typeof woPrixSource === 'function') ? woPrixSource(d, l.source) : null;
  if(base == null) return { lien: l, relie: true, perdu: true };
  const cible = dvpRond(base * (Number(l.fois) || 1));
  const ecart = Math.abs(cible - (Number(x.prix) || 0)) >= 0.005 ||
                (x.sorte !== 'formule' && x.prixSup != null && Math.abs(cible - Number(x.prixSup)) >= 0.005);
  return { lien: l, relie: true, cible: cible, ecart: ecart };
}

/* 🪄 Deviner d'après le nom Drivup. Une proposition n'est faite que si
   le prix qu'elle donne est à ±25 % du prix de Drivup : un lien absurde
   ne se propose pas. */
function dvpDevine(x, d){
  if(x.sorte === 'formule' || dvpDeCote(x) || !d) return null;
  const n = dvpSans(x.nom);
  const pres = (cible) => cible > 0 && Math.abs(cible - Number(x.prix)) <= Number(x.prix) * 0.25;
  if(x.sorte === 'prestation'){
    let fois = 1;
    const mh = n.match(/(\d+)\s*h\s*(\d0)\b/), mn = n.match(/\b(15|30|45)\s*(mn|min)/), hh = n.match(/\b(\d+(?:[.,]5)?)\s*(h|heures?)\b/);
    if(mh) fois = Number(mh[1]) + Number(mh[2]) / 60;
    else if(mn) fois = Number(mn[1]) / 60;
    else if(hh) fois = Number(hh[1].replace(',', '.'));
    let t = '';
    if(/simu/.test(n)) t = /autonom/.test(n) ? '' : 'simu';
    else if(/theori/.test(n)) t = 'theorie';
    else if(/remorque|\bbe\b|b96/.test(n)) t = 'remorque';
    else if(/moto|\ba1\b|\ba2\b|plateau/.test(n)) t = 'moto';
    else if(/equipe|amenag|pmr/.test(n)) t = 'equipe';
    else if(/conduite|cours|lecon|audi|\ba3\b|\bq3\b/.test(n)) t = 'voiture';
    if(!t || !(d.taux || []).some(y => y.id === t)) return null;
    const g = /\bbea\b|automatique|\bauto\b/.test(n) ? 'BEA' : 'BV';
    const unite = tfTaux(d, t, g);
    if(!(unite > 0)) return null;
    const cible = dvpRond(unite * fois);
    if(!pres(cible)) return null;
    return { source: 'taux:' + t + ':' + g, fois: fois, cible: cible, pourquoi: 'le nom dit « ' + (mn ? mn[0] : hh ? hh[0] : '1 h') + ' »' + (g === 'BEA' ? ' et « BEA »' : '') };
  }
  /* un produit : la prestation de l'appli au nom le plus proche */
  const mots = s => new Set(dvpSans(s).split(/[^a-z0-9]+/).filter(m => m.length >= 3));
  const a = mots(x.nom);
  let mieux = null;
  (d.prestations || []).forEach(p => {
    const b = mots(p.nom);
    let com = 0; a.forEach(m => { if(b.has(m)) com++; });
    const j = com / Math.max(1, new Set([...a, ...b]).size);
    if(j >= 0.4 && (!mieux || j > mieux.j)) mieux = { p, j };
  });
  if(!mieux) return null;
  const cible = dvpRond(tfPrix(d, mieux.p.id, 'BV'));
  if(!pres(cible)) return null;
  return { source: 'prest:' + mieux.p.id + ':BV', fois: 1, cible: cible, pourquoi: 'nom proche de « ' + mieux.p.nom.split(' — ')[0] + ' »' };
}

/* Le classement de toutes les lignes lues */
function dvpRanger(d){
  const out = { aChanger: [], aJour: [], perdus: [], propositions: [], pasRelies: [], deCote: [], formules: [] };
  DVP.lignes.forEach(x => {
    const e = dvpEtat(x, d);
    if(x.sorte === 'formule'){ out.formules.push({ x, e }); return; }
    if(e.relie){
      if(e.perdu) out.perdus.push({ x, e });
      else if(e.ecart) out.aChanger.push({ x, e });
      else out.aJour.push({ x, e });
      return;
    }
    if(dvpDeCote(x)){ out.deCote.push({ x, e }); return; }
    const p = dvpDevine(x, d);
    if(p) out.propositions.push({ x, e, p });
    else out.pasRelies.push({ x, e });
  });
  return out;
}

function dvpSousTexte(x){
  const t = [];
  t.push(x.sorte === 'produit' ? 'produit' : x.sorte === 'formule' ? 'formule' : 'prestation');
  if(x.sorte !== 'formule'){
    if(x.formules) t.push('dans ' + x.formules + ' formule' + (x.formules > 1 ? 's' : ''));
    if(x.ventes) t.push(x.ventes.toLocaleString('fr-FR') + ' vente' + (x.ventes > 1 ? 's' : ''));
  }else if(x.eleves) t.push(x.eleves + ' élève' + (x.eleves > 1 ? 's' : ''));
  return t.join(' · ');
}
function dvpLibLien(d, l){
  if(!l) return '';
  let lib = (typeof woLibelleSource === 'function') ? woLibelleSource(d, l.source) : l.source;
  /* « — BV » seulement là où il y a un BEA à côté */
  const [k, id] = String(l.source).split(':');
  const x = k === 'taux' ? (d.taux || []).find(t => t.id === id) : k === 'prest' ? tfPrestation(d, id) : null;
  if(x && !x.bea) lib = lib.replace(/ — BV$/, '');
  return lib + (String(l.source).indexOf('fiche:') === 0 ? '' : ' ' + dvpFois(l.fois));
}

/* ============================================================
   🔗 RELIER UN PRIX DRIVUP
   ============================================================ */
function dvpFenetreRelier(x, d, apres){
  const { m, fermer } = tfFenetre();
  const l = DVP.liens[x.cle] || null;
  const formule = x.sorte === 'formule';
  const devine = l ? null : dvpDevine(x, d);
  let choisi = (l && l.source) || (devine && devine.source) || '';
  let fois = (l && Number(l.fois)) || (devine && devine.fois) || 1;
  const groupes = formule
    ? [['📄 Le total d’une fiche', d.fiches.filter(f => f.type !== 'grille').map(f => ['fiche:' + f.id, tfTitre1(f) + ' — ' + tfEuros(tfTotalDeLaFiche(d, f))])],
       ['Aucune', [['', '— pas comparée —']]]]
    : [['⏱️ Un tarif horaire', [].concat(...d.taux.filter(t => !t.forfait).map(t => {
         const o = [['taux:' + t.id + ':BV', t.nom + ' — ' + (t.bea ? 'BV ' : '') + tfEuros(tfTaux(d, t.id, 'BV'))]];
         if(t.bea) o.push(['taux:' + t.id + ':BEA', t.nom + ' — BEA ' + tfEuros(tfTaux(d, t.id, 'BEA'))]);
         return o;
       }))],
       ['🧾 Une prestation', [].concat(...d.prestations.map(p => {
         const o = [['prest:' + p.id + ':BV', p.nom.split(' — ')[0] + ' — ' + (p.bea ? 'BV ' : '') + tfEuros(tfPrix(d, p.id, 'BV'))]];
         if(p.bea) o.push(['prest:' + p.id + ':BEA', p.nom.split(' — ')[0] + ' — BEA ' + tfEuros(tfPrix(d, p.id, 'BEA'))]);
         return o;
       }))],
       ['📄 Le total d’une fiche', d.fiches.filter(f => f.type !== 'grille').map(f => ['fiche:' + f.id, tfTitre1(f) + ' — ' + tfEuros(tfTotalDeLaFiche(d, f))])],
       ['Aucun', [['', '— pas relié : Drivup garde son prix —']]]];
  m.innerHTML = '<h3>🔗 « ' + dvpEch(x.nom) + ' » ' + (formule ? 'se compare à…' : 'prend son prix dans…') + '</h3>' +
    '<div class="tfAide" style="margin-bottom:8px">Drivup : ' + tfEuros(x.prix) + ' · ' + dvpEch(dvpSousTexte(x)) + '</div>' +
    (devine ? '<div class="dvpPropose">🪄 <b>Proposé</b> : ' + dvpEch(dvpLibLien(d, devine)) + ' — ' + dvpEch(devine.pourquoi) + '.</div>' : '') +
    '<input type="search" class="woRech" id="dvpRech" placeholder="' + (formule ? '🔍 Chercher une fiche' : '🔍 Chercher une fiche, une prestation, un tarif') + '">' +
    '<div class="woListe dvpListe"></div>' +
    (formule ? '<div class="tfAide">Rien n’est écrit sur les formules : Drivup les recalcule tout seul. L’onglet montre seulement si elles suivent l’appli.</div>'
      : '<div class="tfEtiq">Combien de fois ce prix ?</div><div class="dvpFois"></div><div class="tfAide dvpRes"></div>') +
    '<div class="tfFenBas"><button type="button" class="btn btn-secondary" data-x="non">Annuler</button>' +
    '<button type="button" class="btn btn-primary" data-x="oui">🔗 Relier</button></div>';
  const liste = m.querySelector('.dvpListe');
  const res = m.querySelector('.dvpRes');
  const resultat = () => {
    if(!res) return;
    const base = choisi ? woPrixSource(d, choisi) : null;
    res.innerHTML = choisi && base != null
      ? '= <b>' + tfEuros(dvpRond(base * fois)) + '</b> dans Drivup (aujourd’hui ' + tfEuros(x.prix) + ') — tarif de base et tarif supplémentaire.'
      : 'Pas relié : Drivup garde ' + tfEuros(x.prix) + '.';
  };
  const dessiner = () => {
    const q = dvpSans(m.querySelector('#dvpRech').value || '');
    liste.innerHTML = '';
    groupes.forEach(([titre, opts]) => {
      const vus = opts.filter(([k, t]) => !q || k === '' || dvpSans(t).indexOf(q) !== -1);
      if(!vus.length) return;
      const e = document.createElement('div'); e.className = 'tfEtiq'; e.textContent = titre; liste.appendChild(e);
      vus.forEach(([k, t]) => {
        const o = document.createElement('button'); o.type = 'button'; o.className = 'woOpt' + (k === choisi ? ' on' : ''); o.textContent = t;
        o.addEventListener('click', () => { choisi = k; dessiner(); resultat(); });
        liste.appendChild(o);
      });
    });
  };
  const zf = m.querySelector('.dvpFois');
  if(zf){
    const FIXES = [0.5, 1, 2];
    const estFixe = v => FIXES.some(k => Math.abs(k - v) < 1e-9);
    let enAutre = !estFixe(fois);
    const autre = document.createElement('input');
    autre.type = 'text'; autre.inputMode = 'decimal'; autre.id = 'dvpAutre'; autre.className = 'dvpAutre';
    autre.placeholder = 'ex. 1,5';
    autre.setAttribute('aria-label', 'Combien de fois, en chiffres');
    const boutons = [];
    const marquer = () => {
      boutons.forEach(([b, v]) => {
        const on = v == null ? enAutre : (!enAutre && Math.abs(v - fois) < 1e-9);
        b.className = 'btn ' + (on ? 'btn-primary' : 'btn-secondary') + ' dvpFoisB';
      });
      autre.hidden = !enAutre;
    };
    [[0.5, '× ½ (30 min)'], [1, '× 1 (1 h)'], [2, '× 2 (2 h)'], [null, 'Autre']].forEach(([v, t]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
      b.addEventListener('click', () => {
        if(v == null){ enAutre = true; autre.value = String(fois).replace('.', ','); marquer(); autre.focus(); }
        else { fois = v; enAutre = false; marquer(); }
        resultat();
      });
      boutons.push([b, v]); zf.appendChild(b);
    });
    if(enAutre) autre.value = String(fois).replace('.', ',');
    autre.addEventListener('input', () => {
      const v = Number(String(autre.value).replace(',', '.'));
      if(isFinite(v) && v > 0 && v <= 100){ fois = v; autre.classList.remove('chgFaux'); resultat(); }
      else autre.classList.add('chgFaux');
    });
    zf.appendChild(autre);
    marquer();
  }
  m.querySelector('#dvpRech').addEventListener('input', dessiner);
  dessiner(); resultat();
  m.querySelector('[data-x="non"]').addEventListener('click', fermer);
  m.querySelector('[data-x="oui"]').addEventListener('click', async ev => {
    ev.target.disabled = true;
    try{
      const r = await appelPrep({ action: 'drivupPrixRelier', liens: [{ cle: x.cle, source: choisi, fois: formule ? 1 : fois }] });
      if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
      dvpPrendre(r);
      fermer();
      if(apres) apres();
    }catch(e){ showToast('Impossible : ' + e.message); ev.target.disabled = false; }
  });
}

/* ✅ Accepter les N propositions — liste à relire, puis un seul envoi */
function dvpFenetrePropositions(props, d, apres){
  const { m, fermer } = tfFenetre();
  const cases = [];
  m.innerHTML = '<h3>🪄 ' + props.length + ' lien' + (props.length > 1 ? 's' : '') + ' proposé' + (props.length > 1 ? 's' : '') + '</h3>' +
    '<div class="tfAide">Devinés d’après le nom dans Drivup. Décoche ceux qui ne vont pas ; ils restent « pas reliés ». Rien ne change dans Drivup à cette étape.</div>' +
    '<div class="woListe dvpProps"></div>' +
    '<div class="tfFenBas"><button type="button" class="btn btn-secondary" data-x="non">Annuler</button>' +
    '<button type="button" class="btn btn-primary" data-x="oui"></button></div>';
  const z = m.querySelector('.dvpProps');
  const ok = m.querySelector('[data-x="oui"]');
  const maj = () => { const n = cases.filter(c => c.c.checked).length; ok.disabled = !n; ok.textContent = n ? '✅ Accepter ' + n + ' lien' + (n > 1 ? 's' : '') : 'Rien de coché'; };
  props.forEach(({ x, p }) => {
    const el = document.createElement('label');
    el.className = 'dvL';
    const c = document.createElement('input'); c.type = 'checkbox'; c.checked = true;
    c.addEventListener('change', maj);
    const q = document.createElement('span'); q.className = 'dvQui';
    const b = document.createElement('b'); b.textContent = x.nom;
    const s = document.createElement('span'); s.textContent = '→ ' + dvpLibLien(d, p) + ' · ' + p.pourquoi;
    q.append(b, s);
    const e = document.createElement('span'); e.className = 'dvEt ' + (Math.abs(p.cible - x.prix) >= 0.005 ? 'neuf' : 'inconnu');
    e.textContent = Math.abs(p.cible - x.prix) >= 0.005 ? tfEuros(x.prix) + ' → ' + tfEuros(p.cible) : '✅ ' + tfEuros(x.prix);
    el.append(c, q, e);
    z.appendChild(el);
    cases.push({ c, x, p });
  });
  maj();
  m.querySelector('[data-x="non"]').addEventListener('click', fermer);
  ok.addEventListener('click', async () => {
    ok.disabled = true;
    try{
      const liens = cases.filter(k => k.c.checked).map(k => ({ cle: k.x.cle, source: k.p.source, fois: k.p.fois }));
      const r = await appelPrep({ action: 'drivupPrixRelier', liens: liens });
      if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
      dvpPrendre(r);
      fermer();
      showToast('🔗 ' + liens.length + ' lien' + (liens.length > 1 ? 's' : '') + ' enregistré' + (liens.length > 1 ? 's' : '') + ' ✅');
      if(apres) apres();
    }catch(e){ showToast('Impossible : ' + e.message); maj(); }
  });
}

/* ============================================================
   L'ONGLET 📥 Drivup (Outils › 💰 Tarifs)
   ============================================================ */
async function dvOnglet(z){
  if(!DVP.lu && !DVP.charge){
    z.innerHTML = '<div class="empty">Lecture des prix de Drivup…</div>';
    await dvpCharger();
    if(tfOnglet === 'drivup') afficherTarifsFiches();
    return;
  }
  if(!DVP.lu){ z.innerHTML = '<div class="empty">⚠️ ' + dvpEch(DVP.erreur || 'Lecture impossible.') + '</div>'; return; }
  z.innerHTML = '';
  const d = tfData;
  const ecrit = DVP.admin;
  const tete = document.createElement('div');
  tete.className = 'tfDate';
  const nP = DVP.lignes.filter(x => x.sorte === 'prestation').length, nO = DVP.lignes.filter(x => x.sorte === 'produit').length,
        nF = DVP.lignes.filter(x => x.sorte === 'formule').length;
  tete.innerHTML = DVP.luLe
    ? '<span>📥 <b>Lu dans Drivup</b> le ' + dvpEch(dvpQuand(DVP.luLe)) + (DVP.luPar ? ' par ' + dvpEch(DVP.luPar) : '') +
      ' · ' + nP + ' prestations, ' + nO + ' produits, ' + nF + ' formules</span>'
    : '<span>📥 <b>Pas encore lu dans Drivup</b></span>';
  z.appendChild(tete);
  const aide = document.createElement('div');
  aide.className = 'tfAide';
  aide.innerHTML = 'Pour lire ou changer les prix : dans Drivup, ouvre <b>Paramètres › Prestations</b> et clique sur le favori <b>📥 App Évolution</b>. ' +
    'Chaque prix Drivup se relie une fois à ce qui fait son prix dans l’appli ; un prix <b>pas relié</b> garde le prix de Drivup.';
  z.appendChild(aide);
  if(!DVP.luLe) return;
  dvpCorps(z, d, { ecrit: ecrit, fenetre: null, redessiner: () => afficherTarifsFiches() });
}

/* Le corps commun à l'onglet et à la fenêtre du favori.
   o.fenetre : la fenêtre du favori (cases à cocher + bouton « Changer ») */
function dvpCorps(z, d, o){
  const R = dvpRanger(d);
  const puces = document.createElement('div');
  puces.className = 'dvPuces';
  puces.append(puceDrivup(R.aChanger.length ? 'neuf' : '', R.aChanger.length, '💰 à changer'),
               puceDrivup('', R.aJour.length, '✅ à jour'));
  if(R.propositions.length) puces.append(puceDrivup('bouge', R.propositions.length, '🪄 proposés'));
  puces.append(puceDrivup('ignore', R.pasRelies.length, 'pas reliés'));
  if(R.perdus.length) puces.append(puceDrivup('annule', R.perdus.length, '⚠️ source retirée'));
  z.appendChild(puces);

  if(o.ecrit && R.propositions.length){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-secondary dvpGros';
    b.textContent = '🪄 Voir et accepter les ' + R.propositions.length + ' liens proposés';
    b.addEventListener('click', () => dvpFenetrePropositions(R.propositions, d, o.redessiner));
    z.appendChild(b);
  }
  if(R.aChanger.length){
    const av = document.createElement('div');
    av.className = 'dvpAvert';
    av.textContent = '⚠️ Dans Drivup, changer le prix d’une prestation change aussi le prix des formules (forfaits) qui la contiennent, et des heures achetées ensuite.';
    z.appendChild(av);
  }

  const cases = [];
  const titre = t => { const j = document.createElement('div'); j.className = 'dvJour'; j.textContent = t; return j; };
  const ligne = (it, avecCase, ou) => {
    const { x, e } = it;
    const el = document.createElement(avecCase ? 'label' : 'div');
    el.className = 'dvL';
    let c = null;
    if(avecCase){ c = document.createElement('input'); c.type = 'checkbox'; c.checked = true; el.appendChild(c); }
    const q = document.createElement('span'); q.className = 'dvQui';
    const b = document.createElement('b'); b.textContent = x.nom;
    const s = document.createElement('span');
    s.textContent = (e.relie ? (e.perdu ? '⚠️ ce qui faisait son prix n’existe plus dans l’appli' : dvpLibLien(d, e.lien)) : 'Drivup : ' + tfEuros(x.prix)) +
      ' · ' + dvpSousTexte(x);
    q.append(b, s);
    el.appendChild(q);
    if(e.relie && !e.perdu){
      const et = document.createElement('span');
      et.className = 'dvEt ' + (e.ecart ? 'neuf' : 'inconnu');
      et.textContent = e.ecart ? tfEuros(x.prix) + ' → ' + tfEuros(e.cible) : '✅ ' + tfEuros(x.prix);
      el.appendChild(et);
    }
    if(o.ecrit){
      const r = document.createElement('button'); r.type = 'button'; r.className = 'btn btn-secondary dvpMini';
      r.textContent = e.relie ? '✏️' : '🔗 Relier';
      r.title = e.relie ? 'Changer le lien' : 'Relier à un prix de l’appli';
      r.addEventListener('click', ev => { ev.preventDefault(); dvpFenetreRelier(x, d, o.redessiner); });
      el.appendChild(r);
    }
    if(c){ cases.push({ c, x, e, el }); c.addEventListener('change', () => o.majBouton && o.majBouton()); }
    ou.appendChild(el);
  };
  const pli = (texte, liste, ouvert, avecCase) => {
    const p = document.createElement('details'); p.className = 'dvPli'; p.open = !!ouvert;
    const s = document.createElement('summary'); s.textContent = texte; p.appendChild(s);
    liste.forEach(it => ligne(it, avecCase, p));
    z.appendChild(p);
  };

  if(R.aChanger.length){
    z.appendChild(titre('À changer dans Drivup'));
    R.aChanger.forEach(it => ligne(it, !!o.fenetre && o.ecrit, z));
  }else{
    const v = document.createElement('div'); v.className = 'dvPli';
    v.textContent = '✅ Aucun prix relié à changer : Drivup suit l’appli.';
    z.appendChild(v);
  }
  if(R.perdus.length) pli('⚠️ ' + R.perdus.length + ' relié' + (R.perdus.length > 1 ? 's' : '') + ' à un prix retiré de l’appli', R.perdus, true, false);
  if(R.aJour.length) pli('✅ ' + R.aJour.length + ' prix déjà à jour', R.aJour, false, false);
  if(R.propositions.length) pli('🪄 ' + R.propositions.length + ' proposé' + (R.propositions.length > 1 ? 's' : '') + ' (pas encore reliés)', R.propositions, false, false);
  if(R.pasRelies.length) pli(R.pasRelies.length + ' pas relié' + (R.pasRelies.length > 1 ? 's' : '') + ' — Drivup garde leur prix', R.pasRelies, false, false);
  if(R.deCote.length) pli(R.deCote.length + ' laissé' + (R.deCote.length > 1 ? 's' : '') + ' de côté (0 € ou HT à 0 %)', R.deCote, false, false);

  /* 📦 Les formules : comparées, rien n'est écrit */
  if(R.formules.length){
    const comp = R.formules.filter(it => it.e.relie && !it.e.perdu);
    const ecarts = comp.filter(it => it.e.ecart);
    const carte = document.createElement('details');
    carte.className = 'dvPli';
    carte.open = !!ecarts.length;
    const s = document.createElement('summary');
    s.textContent = '📦 Formules (forfaits) : ' + comp.length + ' comparée' + (comp.length > 1 ? 's' : '') + ' à une fiche' +
      (ecarts.length ? ' · ⚠️ ' + ecarts.length + ' différente' + (ecarts.length > 1 ? 's' : '') : comp.length ? ' · ✅ toutes pareilles' : '') +
      ' — lecture seule';
    carte.appendChild(s);
    const n = document.createElement('div'); n.className = 'dvNote';
    n.textContent = 'Drivup recalcule ses formules à partir de leurs prestations : rien n’est écrit ici. Une formule différente du total de sa fiche se corrige dans Drivup, ou dans la fiche.';
    carte.appendChild(n);
    const tri = R.formules.slice().sort((a, b) => (b.e.relie && b.e.ecart ? 2 : b.e.relie ? 1 : 0) - (a.e.relie && a.e.ecart ? 2 : a.e.relie ? 1 : 0));
    tri.forEach(it => ligne(it, false, carte));
    z.appendChild(carte);
  }
  return { cases, R };
}

/* ============================================================
   LA FENÊTRE DU FAVORI — « 📥 Reçu de Drivup — les prix »
   ============================================================ */
function dvpAttendre(type, surProgression, delai){
  return new Promise((ok, ko) => {
    const fin = () => { clearTimeout(t); clearTimeout(t0); window.removeEventListener('message', ecoute); };
    const t = setTimeout(() => { fin(); ko(new Error('Drivup ne répond plus. Recharge Paramètres › Prestations et reclique sur le favori.')); }, delai || 600000);
    const t0 = setTimeout(() => { fin(); ko(new Error('Le favori ne répond pas dans l’onglet Drivup : reclique sur le favori depuis Paramètres › Prestations, puis recommence.')); }, 20000);
    function ecoute(ev){
      if(ev.origin !== DRIVUP_ORIGINE || !ev.data) return;
      if(ev.data.type === 'drivup-prix-progression'){ clearTimeout(t0); if(surProgression) surProgression(ev.data); return; }
      if(ev.data.type === 'drivup-prix-erreur'){ fin(); ko(new Error(ev.data.message || 'erreur dans Drivup')); return; }
      if(ev.data.type !== type) return;
      fin(); ok(ev.data);
    }
    window.addEventListener('message', ecoute);
  });
}

async function fenetrePrixDrivup(p){
  const nP = (p.prestations || []).length, nO = (p.produits || []).length, nF = (p.formules || []).length;
  const lu = p.luA ? new Date(p.luA).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  const f = cadreDrivup('📥 Reçu de Drivup — les prix',
    'Paramètres › Prestations (' + nP + '), Produits (' + nO + ') et Formules (' + nF + ')' + (lu ? ' · lu à ' + lu : ''));
  f.fond.id = 'drivupPrix';
  const corps = document.createElement('div');
  corps.innerHTML = '<div class="empty">Comparaison avec les prix de l’appli…</div>';
  f.boite.appendChild(corps);
  if(typeof ACCES === 'undefined' || ACCES.role !== 'admin'){
    corps.innerHTML = '<div class="empty">⚠️ Les prix de Drivup : administrateurs seulement.</div>';
    return;
  }
  let d;
  try{
    d = await tfCharger(false);
    const r = await appelPrep({ action: 'drivupPrixPoser', prestations: p.prestations || [], produits: p.produits || [], formules: p.formules || [] });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    dvpPrendre(r);
  }catch(e){
    corps.innerHTML = '<div class="empty">⚠️ ' + dvpEch((e && e.message) || e) + '</div>';
    return;
  }
  const dessiner = () => {
    corps.innerHTML = '';
    const o = { ecrit: DVP.admin, fenetre: f, redessiner: dessiner };
    const { cases, R } = dvpCorps(corps, d, o);
    if(!R.aChanger.length || !o.ecrit){
      const rang = document.createElement('div'); rang.className = 'btn-row'; rang.style.marginTop = '12px';
      const b = document.createElement('button'); b.className = 'btn btn-secondary'; b.textContent = 'Fermer';
      b.addEventListener('click', f.fermer);
      rang.appendChild(b); corps.appendChild(rang);
      return;
    }
    const btns = boutonsDrivup(corps, '💰 Changer', async (etat, ok, non) => {
      const choisis = cases.filter(k => k.c.checked);
      if(!choisis.length){ ok.disabled = false; non.disabled = false; maj(); return; }
      if(!window.opener || window.opener.closed) throw new Error('L’onglet Drivup est fermé : reclique sur le favori depuis Paramètres › Prestations.');
      ok.textContent = 'Dans Drivup…';
      etat.style.color = '';
      etat.textContent = 'Changement des prix dans Drivup… 0 / ' + choisis.length;
      window.opener.postMessage({ type: 'drivup-prix-changer', liste: choisis.map(k => ({
        cle: k.x.cle, sorte: k.x.sorte, id: k.x.id, prix: k.e.cible, avant: k.x.prix })) }, DRIVUP_ORIGINE);
      const r = await dvpAttendre('drivup-prix-faits', pr => {
        etat.textContent = 'Changement des prix dans Drivup… ' + (pr.fait || 0) + ' / ' + (pr.total || choisis.length);
      });
      const bons = (r.resultats || []).filter(x => x.ok);
      try{
        if(bons.length){
          const rr = await appelPrep({ action: 'drivupPrixEnvoye', resultats: bons.map(x => ({ cle: x.cle, prix: x.prix })) });
          if(rr && rr.status === 'ok') dvpPrendre(rr);
        }
      }catch(e){ /* Drivup est à jour ; l'appli le relira au prochain clic du favori */ }
      bons.forEach(b => { const x = DVP.lignes.find(y => y.cle === b.cle); if(x){ x.prix = b.prix; x.prixSup = b.prix; } });
      /* On redessine : ce qui est passé sort de « À changer » ; ce qui a
         échoué y reste, coché, avec son message en haut. */
      const rates = (r.resultats || []).filter(x => !x.ok).map(x => {
        const it = cases.find(y => y.x.cle === x.cle);
        return (it ? it.x.nom : x.cle) + ' : ' + (x.message || 'pas changé');
      });
      const resume = document.createElement('div');
      resume.className = rates.length ? 'dvpAvert' : 'dvpFait';
      resume.innerHTML = (bons.length ? '✅ <b>' + bons.length + ' prix changé' + (bons.length > 1 ? 's' : '') + ' dans Drivup</b> (relus après coup).' : '') +
        (rates.length ? (bons.length ? '<br>' : '') + '⚠️ <b>' + rates.length + ' pas changé' + (rates.length > 1 ? 's' : '') + '</b> :<br>' + rates.map(dvpEch).join('<br>') : '');
      dessiner();
      corps.prepend(resume);
      if(tfOnglet === 'drivup' && typeof afficherTarifsFiches === 'function') afficherTarifsFiches();
    }, f.fermer);
    function maj(){
      const n = cases.filter(k => k.c.checked && !k.c.disabled).length;
      btns.ok.disabled = !n;
      btns.ok.textContent = n ? '💰 Changer ' + n + ' prix dans Drivup' : 'Rien de coché';
    }
    o.majBouton = maj;
    maj();
    const note = document.createElement('div');
    note.className = 'dvNote';
    note.textContent = 'Le favori ouvre la fiche de chaque prix coché dans Drivup, met le nouveau prix dans « Tarif de base » et « Tarif supplémentaire », ' +
      'et clique « Enregistrer les modifications », comme à la main. Puis il relit la fiche pour vérifier. Rien d’autre n’est modifié.';
    corps.appendChild(note);
  };
  dessiner();
}

/* Ce que l'enregistrement va changer dans Drivup — pour « 👁️ Ce qui change » */
function dvApercu(avant, apres){
  if(typeof ACCES === 'undefined' || ACCES.role !== 'admin' || !DVP.lu || !apres) return '';
  let n = 0;
  DVP.lignes.forEach(x => {
    if(x.sorte === 'formule') return;
    const l = DVP.liens[x.cle];
    if(!l || !l.source) return;
    const a = woPrixSource(avant, l.source), b = woPrixSource(apres, l.source);
    if(a == null || b == null) return;
    if(Math.abs(dvpRond(a * l.fois) - dvpRond(b * l.fois)) >= 0.005) n++;
  });
  if(!n) return '';
  return '<div class="tfAide">📥 <b>Drivup : ' + n + ' prix relié' + (n > 1 ? 's' : '') + ' change' + (n > 1 ? 'nt' : '') + '.</b> ' +
    'Après l’enregistrement, ouvre Paramètres › Prestations dans Drivup et clique sur le favori : la fenêtre les montrera cochés.</div>';
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-tarifs-drivup.js'] = true;
