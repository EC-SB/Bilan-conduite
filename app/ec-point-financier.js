/* Déployé le 26/11/2026 à 09:39 — v1577 */
/* ============================================================
   ec-point-financier.js — 🧾 DOSSIER ÉLÈVE › POINT FINANCIER (v1577)

   David, le 25 novembre 2026 : le point financier fait à la main sur
   deux élèves, validé, « il faut maintenant le faire faire par l'App,
   sur le même principe, pour tous les élèves ». Un onglet dans chaque
   dossier, « comme ça on garde une copie du point financier quand il a
   été fait et envoyé ».

   Ses choix, sur le schéma « Point financier » :
   · administrateurs et bureau ; Drivup lu seulement quand on touche
     « Faire le point » (l'extension « App EC · Drivup » 1.9.0, lecture
     seule : relevé de compte, détail des factures, Facturer, planning,
     notes internes) ;
   · le bilan au « vous » : ce que vous avez versé (le mode de Drivup,
     la ligne renommable par le bureau, rien de deviné), le code (bloc
     THÉORIE de Facturer), la conduite (le reste), au prix PAYÉ lu sur
     les factures, une ligne par prix, les écoutes dans la liste, la
     ligne de contrôle (code + conduite = facturé, sinon on le dit), les
     cas particuliers (l'avoir et la note interne, la phrase corrigée
     par le bureau), le bilan, puis ce qu'il reste à prévoir ;
   · ce qu'il reste à prévoir : les prix des FICHES DE TARIFS DE L'App.
     AAC : RVP pratique n° 1, théorique n° 1 et n° 2, pratique n° 2,
     puis la fin (vérifications, 3 h avant l'examen, accompagnement,
     disque A, abonnement post-permis), moins le déjà acheté. CS : le
     rendez-vous préalable, la formation accompagnateur, l'examen
     blanc, puis la même fin. Les autres : la frise (en heures ; un
     examen blanc toujours prévu, compté s'il n'est pas payé), puis la
     même fin ; sans frise, « frise à faire ». Un prix de Drivup qui
     n'est pas celui de l'App est signalé (le RVP n° 2 à 62 €) ;
   · envoi : mail (des cases à cocher, l'élève coché), Copier, ou
     Garder sans envoyer ; le texte se modifie avant ; chaque point
     fait est gardé dans le dossier (Worker : pointFinGarder).
   ============================================================ */

const PF = {};      /* nom → { lu, tarifs, calc, renom, cas, texte, main, dest } */

const pfEch = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pfNorm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const pfArr = n => Math.round((Number(n) || 0) * 100) / 100;
function pfEuros(n){
  return pfArr(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[  ]/g, ' ') + ' €';
}
function pfNombre(n){ return String(pfArr(n)).replace('.', ','); }
function pfDateFr(iso){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || ''); }
function pfAuj(){ return new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }); }
function pfPeut(){ return typeof ACCES !== 'undefined' && ACCES && (ACCES.role === 'admin' || ACCES.role === 'bureau'); }
function pfPrenom(nom){ return String(nom || '').trim().split(/\s+/)[0] || ''; }

/* Le nom d'une prestation, tel qu'on l'écrit à la famille */
function pfNomPropre(lib){
  return String(lib || '')
    .replace(/\s+-\s+(st|saint)[ -]brieuc\s*$/i, '').replace(/\s+-\s+loud[ée]ac\s*$/i, '')
    .replace(/\bOBLIGATOIRE\b/g, '').replace(/^\s*1\s+(acc[èe]s)/i, 'Accès').replace(/\s{2,}/g, ' ').trim()
    .replace(/^./, c => c.toUpperCase());
}

/* ---------- les tarifs de l'App (fiches de tarifs) ---------- */
function pfTaux(d, id, g){
  const t = ((d && d.taux) || []).find(x => x.id === id);
  if(!t) return 0;
  if(g === 'BEA' && t.bea && !t.bea.lie) return Number(t.bea.pu) || 0;
  return Number(t.pu) || 0;
}
function pfPrixPrestation(d, p, g){
  if(!p) return null;
  const q = (g === 'BEA' && p.bea && !p.bea.lie) ? p.bea : p;
  return pfArr(Number(q.fixe || 0) + Object.keys(q.formule || {}).reduce((s, k) => s + pfTaux(d, k, g) * q.formule[k], 0));
}
/* une prestation des tarifs, par son nom ; celle du genre de l'élève d'abord */
function pfPrixParNom(d, re, g){
  const l = ((d && d.prestations) || []).filter(p => re.test(pfNorm(p.nom)));
  if(!l.length) return null;
  const p = l.find(x => (x.genres || []).indexOf(g) !== -1) || l.find(x => !(x.genres || []).length) || l[0];
  return pfPrixPrestation(d, p, g);
}

/* ---------- la lecture : l'extension 1.9.0 ---------- */
async function pfLireDrivup(nom){
  const f = (typeof ficheDe === 'function') ? (ficheDe(nom) || {}) : {};
  const id = String(f.idDrivup || '').replace(/\D/g, '');
  if(!id) throw new Error('Pas de numéro Drivup dans sa fiche.');
  if(typeof extDrivupPresente !== 'function' || !extDrivupPresente()) throw new Error('Il faut l’extension « App EC · Drivup » 1.9.0 sur cet ordinateur (Gestion › 📥 Drivup).');
  const v = (typeof EXT_DV !== 'undefined' && EXT_DV.version) || '';
  if(v && v.split('.').map(Number).reduce((s, x, i) => s + x * [10000, 100, 1][i], 0) < 10900) throw new Error('Mets à jour l’extension « App EC · Drivup » en 1.9.0 pour faire le point financier (elle est en ' + v + ').');
  const p = attendreDeDrivup('drivup-financier-lu', null, 300000);
  versExtDrivup({ type: 'drivup-financier-lire', id: id });
  const d = await p.catch(e => { throw new Error(/ne sait pas encore/.test(String(e && e.message)) ? 'Mets à jour l’extension « App EC · Drivup » en 1.9.0.' : ((e && e.message) || String(e))); });
  return d;
}
async function pfLireTarifs(){
  const r = await appelPrep({ action: 'tarifsLire' });
  if(!r || r.status === 'error' || !r.tarifs) throw new Error((r && r.message) || 'les fiches de tarifs sont illisibles');
  return r.tarifs;
}

/* ============================================================
   LE CALCUL
   ============================================================ */
const PF_RE = {
  rvp1: /pedagogique pratique n ?1\b/, rvpT: /pedagogique theorique/, rvp2: /pedagogique pratique n ?2\b/,
  verif: /^verifications?$/, accomp: /examen officiel du permis|accompagnement examen/,
  disqueA: /^disque .*\ba$/, post: /abonnement .*post ?permis/,
  prealable: /rendez vous prealable|rdv prealable/, formAcc: /formation accompagnateur/,
  eb: /^examen blanc/, simu: /^simulateur avec moniteur/, conduite: /^conduite\b/
};
function pfHeuresDuLibelle(lib){
  const t = pfNorm(lib);
  if(/\b30 ?(mn|min)\b/.test(t)) return 0.5;
  const m = t.match(/\b(\d{1,2}) ?h\b/);
  return m ? Number(m[1]) : 1;
}
function pfCalculer(lu, ctx){
  const alertes = [];
  const achats = (lu && lu.achats) || [];
  /* 1. ce que vous avez versé : chaque encaissement une fois (ses parts additionnées) */
  const enc = {}, ordreEnc = [];
  achats.forEach(a => (a.encaissements || []).forEach(e => {
    const k = e.id || (e.mode + '|' + e.le);
    if(!enc[k]){ enc[k] = { id: k, mode: e.mode || 'Encaissement', le: e.le, montant: 0 }; ordreEnc.push(k); }
    enc[k].montant = pfArr(enc[k].montant + (Number(e.montant) || 0));
  }));
  const versements = ordreEnc.map(k => enc[k]).sort((a, b) => String(a.le).localeCompare(String(b.le)));
  const verse = pfArr(versements.reduce((s, x) => s + x.montant, 0));
  if(lu && lu.totalEncaisse && Math.abs(lu.totalEncaisse - verse) > 0.009) alertes.push('Les encaissements lus (' + pfEuros(verse) + ') ne font pas le total encaissé de Drivup (' + pfEuros(lu.totalEncaisse) + ') : vérifie avant d’envoyer.');
  /* 2. les lignes facturées (factures et avoirs), une ligne par prestation et par prix */
  const lignes = {}, ordreL = [];
  achats.forEach(a => (a.lignes || []).forEach(l => {
    const k = pfNorm(l.lib) + '|' + pfArr(l.pu);
    if(!lignes[k]){ lignes[k] = { lib: l.lib, nom: pfNomPropre(l.lib), pu: pfArr(l.pu), qte: 0, total: 0, avoirs: [] }; ordreL.push(k); }
    lignes[k].qte = pfArr(lignes[k].qte + (Number(l.qte) || 0));
    lignes[k].total = pfArr(lignes[k].total + (Number(l.total) || 0));
    if(a.typ === 'AVOIR') lignes[k].avoirs.push(a.num);
  }));
  achats.filter(a => !(a.lignes || []).length && a.net).forEach(a => alertes.push('Le détail de la ' + (a.typ === 'AVOIR' ? 'l’avoir' : 'facture') + ' n° ' + a.num + ' n’a pas pu être lu.'));
  /* le bloc et l'ordre : ceux de Facturer (la feuille de tarifs) */
  const fac = (lu && lu.facturer) || [];
  const rangDe = {};
  fac.forEach((x, i) => { const n = pfNorm(x.nom); if(!(n in rangDe)) rangDe[n] = { i: i, bloc: x.bloc }; });
  const code = [], conduite = [];
  ordreL.forEach((k, j) => {
    const l = lignes[k];
    if(Math.abs(l.qte) < 0.0001 && Math.abs(l.total) < 0.005) return;   /* annulée par un avoir : dite dans les cas particuliers */
    const r = rangDe[pfNorm(l.lib)];
    l.rang = r ? r.i : 1000 + j;
    (r && r.bloc === 'theorie' ? code : conduite).push(l);
  });
  code.sort((a, b) => a.rang - b.rang);
  conduite.sort((a, b) => a.rang - b.rang);
  const tCode = pfArr(code.reduce((s, l) => s + l.total, 0)), tConduite = pfArr(conduite.reduce((s, l) => s + l.total, 0));
  const facture = pfArr(achats.reduce((s, a) => s + (Number(a.net) || 0), 0));
  const controle = Math.abs(tCode + tConduite - facture) < 0.009;
  if(!controle) alertes.push('Contrôle : code + conduite (' + pfEuros(tCode + tConduite) + ') ne fait pas le total facturé (' + pfEuros(facture) + '). Cherche l’écart avant d’envoyer.');
  /* 3. les cas particuliers : les avoirs, avec la note interne qui en parle */
  const cas = achats.filter(a => a.typ === 'AVOIR').map(a => {
    const libs = (a.lignes || []).map(l => pfNomPropre(l.lib));
    const mots = [].concat(...libs.map(x => pfNorm(x).split(' '))).filter(m => m.length >= 7 && !/^(vehicule|conduite|brieuc|loudeac|saint)$/.test(m));
    const note = ((lu && lu.notes) || []).find(n => mots.some(m => pfNorm(n.note).indexOf(m) !== -1)) || null;
    return { cle: 'avoir' + a.num, num: a.num, montant: a.net, libs: libs, note: note,
             phrase: 'Un avoir de ' + pfEuros(Math.abs(a.net)) + ' (avoir n° ' + a.num + ') a été fait pour : ' + (libs.join(', ') || 'voir le détail') + '.' };
  });
  /* 4. le bilan */
  const solde = pfArr(verse - facture);
  /* 5. ce qu'il reste à prévoir, aux prix de l'App */
  const prevoir = pfAPrevoir(lu, ctx, alertes);
  return { versements: versements, verse: verse, code: code, conduite: conduite, tCode: tCode, tConduite: tConduite, facture: facture, controle: controle,
           cas: cas, solde: solde, prevoir: prevoir, alertes: alertes };
}

function pfAPrevoir(lu, ctx, alertes){
  const d = ctx.tarifs, g = ctx.genre === 'BEA' ? 'BEA' : 'BV';
  const fac = (lu && lu.facturer) || [];
  const lignesFac = [].concat(...((lu && lu.achats) || []).map(a => a.lignes || []));
  const achete = re => fac.some(x => re.test(pfNorm(x.nom)) && x.achete > 0) ||
                       lignesFac.filter(l => re.test(pfNorm(l.lib))).reduce((s, l) => s + (Number(l.qte) || 0), 0) > 0;
  const H = pfTaux(d, 'voiture', g), T = pfTaux(d, 'theorie', g), S = pfTaux(d, 'simu', g);
  const EB = pfPrixParNom(d, g === 'BEA' ? /^examen blanc pratique audi a3 ou q3/ : /^examen blanc pratique audi a3$/, g) || pfArr(1.5 * H);
  const items = [];
  const ecart = (re, prix) => {
    const x = fac.find(y => re.test(pfNorm(y.nom)) && y.pu !== null && y.pu !== undefined);
    if(x && Math.abs(Number(x.pu) - prix) > 0.009) alertes.push('Dans Drivup, « ' + x.nom + ' » est à ' + pfEuros(x.pu) + ' : pas pris en compte. Le prix vient des fiches de tarifs de l’App (' + pfEuros(prix) + ').');
  };
  const ajouter = (re, nom, prix, deja) => {
    if(prix === null || prix === undefined){ alertes.push('« ' + nom + ' » introuvable dans les fiches de tarifs de l’App : pas compté.'); return; }
    if(re) ecart(re, prix);
    if(deja || (re && achete(re))) return;
    items.push({ nom: nom, prix: pfArr(prix) });
  };
  const f = ctx.formation || '';
  const type = /^aac\b/i.test(f) ? 'aac' : (/^cs\b|supervis/i.test(f) ? 'cs' : 'frise');
  let note = '';
  /* le stock : des heures de conduite achetées, pas encore faites */
  const conduites = fac.filter(x => PF_RE.conduite.test(pfNorm(x.nom)));
  const heuresAchetees = conduites.reduce((s, x) => s + x.achete * pfHeuresDuLibelle(x.nom), 0);
  let stock = conduites.reduce((s, x) => s + Math.max(0, x.achete - x.fait) * pfHeuresDuLibelle(x.nom), 0);
  if(type === 'aac'){
    ajouter(PF_RE.rvp1, 'Rendez-vous pédagogique pratique n° 1 (2 h)', 2 * H);
    ajouter(PF_RE.rvpT, 'Rendez-vous pédagogique théorique n° 1 et n° 2', 2 * T);
    ajouter(PF_RE.rvp2, 'Rendez-vous pédagogique pratique n° 2 (2 h)', 2 * H);
  }else if(type === 'cs'){
    ajouter(PF_RE.prealable, 'Rendez-vous préalable (2 h)', pfPrixParNom(d, /prealable/, g) || 2 * H);
    ajouter(PF_RE.formAcc, 'Formation accompagnateur', pfPrixParNom(d, g === 'BEA' ? /^formation accompagnateur bea$/ : /^formation accompagnateur$/, g));
    const ebPasse = ((lu && lu.planning && lu.planning.passes) || []).some(c => /examen blanc/i.test(c.prestation || ''));
    ajouter(PF_RE.eb, 'Examen blanc', EB, ebPasse);
  }else{
    const frise = (typeof friseUtilisable === 'function') ? friseUtilisable(ctx.frise) : String(ctx.frise || '');
    const av = (typeof leconsAvantExamenBlanc === 'function') ? leconsAvantExamenBlanc(frise) : null;
    const ap = (typeof leconsApresExamenBlanc === 'function') ? leconsApresExamenBlanc(frise) : null;
    if(!frise || av === null || ap === null){
      note = 'frise à faire';
    }else{
      const heures = (av + ap) * 2;
      const reste = Math.max(0, heures - heuresAchetees);
      stock = Math.max(0, heuresAchetees - heures);
      if(reste > 0) items.push({ nom: 'Leçons de conduite prévues par la frise : ' + pfNombre(reste) + ' h (' + pfNombre(reste / 2) + ' leçon' + (reste / 2 > 1 ? 's' : '') + ' de 2 h) × ' + pfEuros(H), prix: pfArr(reste * H) });
      const ebPasse = ((lu && lu.planning && lu.planning.passes) || []).some(c => /examen blanc/i.test(c.prestation || ''));
      ajouter(PF_RE.eb, 'Examen blanc', EB, ebPasse);
      const mS = String(frise).match(/(\d+)\s*h(?:eures?)?\s*(?:de\s+)?simu/i);
      if(mS){
        const simuAchete = fac.filter(x => PF_RE.simu.test(pfNorm(x.nom))).reduce((s, x) => s + x.achete, 0);
        const rS = Math.max(0, Number(mS[1]) - simuAchete);
        if(rS > 0) items.push({ nom: 'Simulateur avec moniteur : ' + rS + ' h × ' + pfEuros(S), prix: pfArr(rS * S) });
      }
    }
  }
  /* la fin, pour tous */
  ajouter(PF_RE.verif, 'Vérifications', pfPrixParNom(d, /^verifications?$/, g));
  const h3 = Math.max(0, 3 - stock);
  if(h3 > 0) items.push({ nom: h3 === 3 ? '3 h de conduite avant l’examen (1 leçon de 2 h + 1 leçon de 1 h)' : pfNombre(h3) + ' h de conduite avant l’examen', prix: pfArr(h3 * H) });
  ajouter(PF_RE.accomp, 'Accompagnement à l’examen (1 h de conduite)', pfPrixParNom(d, g === 'BEA' ? /^accompagnement examen permis bea voiture$/ : /^accompagnement examen permis b$/, g) || H);
  ajouter(PF_RE.disqueA, 'Disque A', pfPrixParNom(d, /^disque .*\ba$/, g));
  ajouter(PF_RE.post, 'Abonnement post-permis 1 an', pfPrixParNom(d, /^abonnement post ?permis/, g));
  return { type: type, items: items, total: pfArr(items.reduce((s, x) => s + x.prix, 0)), H: H, EB: EB, note: note };
}

/* ============================================================
   LE TEXTE
   ============================================================ */
function pfLigneTexte(l){
  const ecoute = /ecoute pedagogique/.test(pfNorm(l.lib)) && !/examen blanc/.test(pfNorm(l.lib));
  let t;
  if(l.pu === 0) t = l.nom + ' : ' + (l.qte > 1 ? pfNombre(l.qte) + ', ' : '') + 'offert';
  else if(l.qte === 1) t = l.nom + ' : ' + pfEuros(l.total);
  else t = l.nom + ' : ' + pfNombre(l.qte) + ' × ' + pfEuros(l.pu) + ' = ' + pfEuros(l.total);
  return '• ' + t + (ecoute && l.pu > 0 ? ', à utiliser jusqu’au permis' : '');
}
function pfTexte(nom, s){
  const c = s.calc, p = pfPrenom(nom);
  const L = [];
  L.push('Objet : Le point financier de la formation de ' + p, '', 'Bonjour,', '', 'Voici le point sur la formation de ' + p + ' au ' + pfAuj() + '.', '');
  L.push('CE QUE VOUS AVEZ VERSÉ');
  c.versements.forEach(v => {
    const nomV = String((s.renom || {})[v.id] || '').trim() || (v.mode + ', le ' + pfDateFr(v.le));
    L.push('• ' + nomV + ' : ' + pfEuros(v.montant));
  });
  if(!c.versements.length) L.push('• Rien pour l’instant');
  L.push('Total versé : ' + pfEuros(c.verse), '');
  L.push('LE CODE');
  c.code.forEach(l => L.push(pfLigneTexte(l)));
  L.push('Total code : ' + pfEuros(c.tCode), '');
  L.push('LA CONDUITE');
  c.conduite.forEach(l => L.push(pfLigneTexte(l)));
  L.push('Total conduite : ' + pfEuros(c.tConduite), '');
  L.push('Total code + conduite : ' + pfEuros(c.tCode) + ' + ' + pfEuros(c.tConduite) + ' = ' + pfEuros(c.tCode + c.tConduite), '');
  const cas = c.cas.map(x => String((s.cas || {})[x.cle] != null ? s.cas[x.cle] : x.phrase).trim()).filter(Boolean);
  if(cas.length){ L.push(cas.length > 1 ? 'CAS PARTICULIERS' : 'CAS PARTICULIER'); cas.forEach(x => L.push(x)); L.push(''); }
  L.push('BILAN');
  let b = pfEuros(c.verse) + ' versés pour ' + pfEuros(c.facture) + ' de formation';
  if(c.solde > 0.009) b += ' : vous avez une avance de ' + pfEuros(c.solde) + ', qui sera déduite de votre prochain achat.';
  else if(c.solde < -0.009) b += ' : il reste ' + pfEuros(-c.solde) + ' à payer.';
  else b += ' : tout est réglé.';
  L.push(b, '');
  L.push('CE QU’IL RESTE À PRÉVOIR JUSQU’À L’EXAMEN');
  const pv = c.prevoir;
  if(pv.note) L.push('• La frise de ' + p + ' est encore à faire : nous vous dirons ce qu’il reste à prévoir dès qu’elle sera faite.');
  pv.items.forEach(x => L.push('• ' + x.nom + ' : ' + pfEuros(x.prix)));
  if(pv.items.length){
    if(c.solde > 0.009) L.push('Total : ' + pfEuros(pv.total) + ' − votre avance de ' + pfEuros(c.solde) + ' = ' + pfEuros(Math.max(0, pv.total - c.solde)));
    else L.push('Total : ' + pfEuros(pv.total));
  }
  L.push('', 'Ce total est le minimum. Si des heures de conduite en plus sont conseillées, elles s’ajoutent au prix de l’heure (' + pfEuros(pv.H) + ') ; un examen blanc éventuel coûte ' + pfEuros(pv.EB) + '. Nous vous le dirons à ce moment-là, avant tout achat.');
  L.push('', 'L’équipe Évolution Conduites');
  return L.join('\n');
}

/* ============================================================
   L'ONGLET
   ============================================================ */
function pfEl(tag, css, html){ const e = document.createElement(tag); if(css) e.style.cssText = css; if(html != null) e.innerHTML = html; return e; }
function pfBouton(texte, principal){ const b = pfEl('button', 'width:auto;margin:0;', null); b.type = 'button'; b.className = 'btn ' + (principal ? 'btn-primary' : 'btn-secondary'); b.textContent = texte; return b; }

async function ongletPointFinancier(corps, nom){
  corps.innerHTML = '';
  if(!pfPeut()){ corps.appendChild(vidDossier('Le point financier est réservé aux administrateurs et au bureau.')); return; }
  const s = PF[nom] = PF[nom] || { renom: {}, cas: {}, main: false };
  const f = (typeof ficheDe === 'function') ? (ficheDe(nom) || {}) : {};
  const bloc = pfEl('div', ''); bloc.className = 'suiviOnglet';
  const t = pfEl('div', '', null); t.className = 'suiviOngletTitre'; t.textContent = '🧾 Point financier de ' + pfPrenom(nom);
  bloc.appendChild(t);
  bloc.appendChild(pfEl('div', 'font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:10px;',
    'Lu dans Drivup par l’extension (relevé de compte, Facturer, planning, notes internes), sans rien y changer. Ce qu’il reste à prévoir : les <b>fiches de tarifs de l’App</b>.'));
  const rang = pfEl('div', 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:4px;');
  const bLire = pfBouton(s.calc ? '🔎 Refaire le point' : '🔎 Faire le point', true);
  const etat = pfEl('span', 'font-size:12px;color:var(--muted);', null);
  etat.textContent = s.lu ? 'Lu le ' + new Date(s.lu.lu).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' ', ' à ') +
    ' · Drivup n° ' + s.lu.id + (f.formation ? ' · ' + f.formation : '') : 'Pas encore fait aujourd’hui';
  rang.append(bLire, etat);
  bloc.appendChild(rang);
  corps.appendChild(bloc);
  bLire.addEventListener('click', async () => {
    bLire.disabled = true; bLire.textContent = '🔎 Lecture dans Drivup…';
    try{
      const [lu, tarifs] = await Promise.all([pfLireDrivup(nom), pfLireTarifs()]);
      s.lu = lu; s.tarifs = tarifs; s.main = false; s.texte = '';
      pfRecalculer(nom);
    }catch(e){
      if(typeof showToast === 'function') showToast('⚠️ ' + ((e && e.message) || e));
    }
    if(ongletPageEleve === 'pointfin' && elevePageOuverte === nom) ongletPointFinancier(corps, nom);
  });
  if(s.calc) pfDessinerPoint(corps, nom, s, f);
  /* ③ les points gardés */
  const hist = pfEl('div', '');
  corps.appendChild(hist);
  pfDessinerHistorique(hist, nom);
}
function pfRecalculer(nom){
  const s = PF[nom];
  const f = (typeof ficheDe === 'function') ? (ficheDe(nom) || {}) : {};
  const genre = (typeof boiteDeLaFormation === 'function') ? String(boiteDeLaFormation(f.formation) || '').toUpperCase() : '';
  s.calc = pfCalculer(s.lu, { tarifs: s.tarifs, genre: genre === 'BEA' ? 'BEA' : 'BV', formation: String(f.formation || ''), frise: f.frise || '' });
  if(!s.main) s.texte = pfTexte(nom, s);
}
function pfDessinerPoint(corps, nom, s, f){
  const c = s.calc;
  /* ce que l'App a vu et qu'il faut savoir */
  const w = pfEl('div', 'border:1px solid var(--orange);background:var(--orange-soft);color:var(--on-accent);border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.5;margin:10px 0;', null);
  w.innerHTML = c.alertes.map(a => '⚠️ ' + pfEch(a)).concat([c.controle ? '✓ Contrôle : ' + pfEch(pfEuros(c.tCode) + ' + ' + pfEuros(c.tConduite) + ' = ' + pfEuros(c.facture)) + ' facturés — juste.' : '']).filter(Boolean).join('<br>');
  corps.appendChild(w);
  let ta = null;
  const refaire = () => { if(s.main) return; s.texte = pfTexte(nom, s); if(ta) ta.value = s.texte; };
  /* ① à vérifier */
  corps.appendChild(sousTitreDossier('① À vérifier avant d’envoyer'));
  const v = pfEl('div', 'border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:10px;');
  v.appendChild(pfEl('div', 'font-size:12px;color:var(--muted);margin-bottom:6px;', 'Les versements, tels que Drivup les nomme. Renomme une ligne si tu sais d’où vient l’argent (l’App ne devine rien).'));
  if(!c.versements.length) v.appendChild(pfEl('div', 'font-size:13px;', 'Aucun encaissement dans Drivup.'));
  c.versements.forEach(x => {
    const l = pfEl('div', 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:5px 0;border-top:1px solid var(--line);');
    const lib = pfEl('span', 'font-size:13px;font-weight:700;min-width:230px;', null);
    lib.textContent = x.mode + ' · ' + pfDateFr(x.le) + ' · ' + pfEuros(x.montant);
    const i = document.createElement('input');
    i.type = 'text'; i.id = 'pfRenom' + String(x.id).replace(/\W/g, ''); i.value = s.renom[x.id] || ''; i.placeholder = 'nom dans le point (sinon celui de Drivup)';
    i.style.cssText = 'flex:1;min-width:180px;margin:0;';
    i.addEventListener('input', () => { s.renom[x.id] = i.value; refaire(); });
    l.append(lib, i); v.appendChild(l);
  });
  corps.appendChild(v);
  c.cas.forEach(x => {
    const b = pfEl('div', 'border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:10px;');
    const h = pfEl('div', 'font-size:13px;font-weight:800;margin-bottom:4px;', null);
    h.textContent = '🧩 Cas particulier : avoir n° ' + x.num + ', ' + pfEuros(x.montant) + (x.libs.length ? ' (« ' + x.libs.join(', ') + ' »)' : '');
    b.appendChild(h);
    if(x.note){ const n = pfEl('div', 'font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:6px;', null); n.textContent = '📝 Note interne Drivup : « ' + x.note.note + ' »'; b.appendChild(n); }
    const t = document.createElement('textarea');
    t.rows = 3; t.id = 'pfCas' + x.num; t.style.cssText = 'width:100%;margin:0;font-family:inherit;font-size:13px;line-height:1.5;';
    t.value = s.cas[x.cle] != null ? s.cas[x.cle] : x.phrase;
    t.addEventListener('input', () => { s.cas[x.cle] = t.value; refaire(); });
    b.appendChild(t);
    b.appendChild(pfEl('div', 'font-size:11.5px;color:var(--muted);margin-top:4px;', 'Phrase pré-remplie avec l’avoir' + (x.note ? ' et la note' : '') + ' : à corriger si besoin.'));
    corps.appendChild(b);
  });
  /* ② le texte */
  corps.appendChild(sousTitreDossier('② Le point, tel qu’il partira'));
  ta = document.createElement('textarea');
  ta.rows = 22; ta.id = 'pfTexte'; ta.style.cssText = 'width:100%;margin:0 0 8px;font-family:inherit;font-size:13px;line-height:1.5;';
  ta.value = s.texte;
  const aMain = pfEl('div', 'font-size:11.5px;color:var(--muted);margin:-4px 0 8px;display:' + (s.main ? 'block' : 'none') + ';', null);
  aMain.textContent = 'Texte modifié à la main : les changements du ① ne s’y reportent plus. ';
  const raz = pfEl('button', 'width:auto;margin:0;padding:2px 8px;font-size:11.5px;', null); raz.type = 'button'; raz.className = 'btn btn-secondary'; raz.textContent = '↺ Refaire le texte';
  raz.addEventListener('click', () => { s.main = false; refaire(); aMain.style.display = 'none'; });
  aMain.appendChild(raz);
  ta.addEventListener('input', () => { s.texte = ta.value; s.main = true; aMain.style.display = 'block'; });
  corps.append(ta, aMain);
  /* à qui */
  const dest = [];
  if(String(f.email || '').trim()) dest.push({ k: 'eleve', nom: pfPrenom(nom), adresse: String(f.email).trim(), on: true });
  if(String(f.mailPrescripteur || '').trim() && String(f.mailPrescripteur).trim() !== String(f.email || '').trim()) dest.push({ k: 'presc', nom: 'Représentant ou payeur', adresse: String(f.mailPrescripteur).trim(), on: false });
  s.dest = s.dest && s.dest.length === dest.length ? s.dest : dest;
  const env = pfEl('div', 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px;');
  env.appendChild(pfEl('span', 'font-size:12.5px;font-weight:700;', 'Envoyer à :'));
  if(!s.dest.length) env.appendChild(pfEl('span', 'font-size:12.5px;color:var(--muted);', 'pas d’adresse mail dans sa fiche (Copier ou Garder sans envoyer).'));
  const bEnv = pfBouton('✉️ Envoyer par mail', true);
  const majEnv = () => { bEnv.disabled = !s.dest.some(x => x.on); };
  s.dest.forEach(x => {
    const b = pfEl('button', 'width:auto;margin:0;padding:6px 12px;font-size:13px;border-radius:999px;', null);
    b.type = 'button';
    const peindre = () => { b.className = 'btn btn-secondary pa' + (x.on ? ' on' : ''); b.textContent = (x.on ? '✓ ' : '') + x.nom + ' · ' + x.adresse;
      b.style.background = x.on ? 'var(--orange-soft)' : ''; b.style.border = x.on ? '1px solid var(--orange)' : ''; b.setAttribute('aria-pressed', x.on ? 'true' : 'false'); };
    peindre();
    b.addEventListener('click', () => { x.on = !x.on; peindre(); majEnv(); });
    env.appendChild(b);
  });
  corps.appendChild(env);
  const act = pfEl('div', 'display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 14px;');
  const bCop = pfBouton('📋 Copier', false), bGar = pfBouton('🗂️ Garder sans envoyer', false);
  majEnv();
  bEnv.addEventListener('click', () => pfEnvoyer(nom, s, bEnv));
  bCop.addEventListener('click', async () => {
    const texte = pfSansObjet(ta.value).corps;
    try{ await navigator.clipboard.writeText(texte); }catch(e){ ta.focus(); ta.select(); try{ document.execCommand('copy'); }catch(e2){} }
    await pfGarder(nom, s, 'copie', '');
    if(typeof showToast === 'function') showToast('📋 Point copié, et gardé dans le dossier');
  });
  bGar.addEventListener('click', async () => {
    if(await pfGarder(nom, s, 'garde', '') && typeof showToast === 'function') showToast('🗂️ Point gardé dans le dossier');
  });
  act.append(bEnv, bCop, bGar);
  corps.appendChild(act);
}
/* « Objet : … » en première ligne : l'objet du mail */
function pfSansObjet(t){
  const l = String(t || '').split('\n');
  const m = (l[0] || '').match(/^\s*objet\s*:\s*(.+)$/i);
  if(!m) return { objet: 'Le point financier de votre formation', corps: String(t || '').trim() };
  return { objet: m[1].trim(), corps: l.slice(1).join('\n').replace(/^\s*\n/, '').trim() };
}
function pfResume(s){
  const c = s.calc;
  return { verse: c.verse, facture: c.facture, solde: c.solde, prevoir: c.prevoir.total, net: Math.max(0, c.prevoir.total - Math.max(0, c.solde)) };
}
async function pfGarder(nom, s, etat, a){
  try{
    const r = await appelPrep({ action: 'pointFinGarder', eleve: nom, texte: s.texte || '', etat: etat, a: a, resume: pfResume(s) });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    const h = document.getElementById('pfHistorique');
    if(h) pfDessinerHistorique(h.parentElement, nom);
    return true;
  }catch(e){ if(typeof showToast === 'function') showToast('⚠️ Point pas gardé : ' + ((e && e.message) || e)); return false; }
}
async function pfEnvoyer(nom, s, bouton){
  const dest = (s.dest || []).filter(x => x.on);
  if(!dest.length) return;
  const { objet, corps } = pfSansObjet(s.texte);
  if(!await confirmer('Envoyer le point financier de ' + nom + ' par mail à :\n' + dest.map(x => '· ' + x.adresse).join('\n') + '\n\nObjet : ' + objet, '✉️ Envoyer')) return;
  bouton.disabled = true; bouton.textContent = '✉️ Envoi…';
  try{
    const html = (typeof rlEnHtml === 'function') ? rlEnHtml(corps)
      : corps.split(/\n{2,}/).map(p => '<div>' + pfEch(p).replace(/\n/g, '<br>') + '</div>').join('<div><br></div>');
    const r = await appelPrep({ action: 'mailEnvoyer', a: dest.map(x => ({ nom: x.k === 'eleve' ? nom : x.nom, adresse: x.adresse })), cc: [], cci: [],
      sujet: objet, html: html, pieces: [], fil: 0, repondA: 0, mode: 'nouveau', brouillon: '', eleve: nom });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    await pfGarder(nom, s, 'envoye', dest.map(x => x.adresse).join(', '));
    if(typeof showToast === 'function') showToast('✉️ Point financier envoyé, et gardé dans le dossier');
  }catch(e){ if(typeof showToast === 'function') showToast('⚠️ Pas envoyé : ' + ((e && e.message) || e)); }
  bouton.disabled = false; bouton.textContent = '✉️ Envoyer par mail';
}
async function pfDessinerHistorique(z, nom){
  z.innerHTML = '';
  z.id = 'pfHistoriqueZone';
  const tete = sousTitreDossier((PF[nom] && PF[nom].calc ? '③ ' : '') + 'Points financiers gardés');
  tete.id = 'pfHistorique';
  z.appendChild(tete);
  const att = pfEl('div', 'font-size:12px;color:var(--muted);', 'Lecture…');
  z.appendChild(att);
  let l = [];
  try{
    const r = await appelPrep({ action: 'pointsFinListe', eleve: nom });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'illisible');
    l = r.points || [];
  }catch(e){ att.textContent = '⚠️ ' + ((e && e.message) || e); return; }
  att.remove();
  if(!l.length){ z.appendChild(vidDossier('Aucun point financier fait pour ' + pfPrenom(nom) + '.')); return; }
  l.forEach(p => {
    const quand = new Date(p.le).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
    const quoi = p.etat === 'envoye' ? 'envoyé par mail' + (p.a ? ' à ' + p.a : '') : p.etat === 'copie' ? 'copié' : 'gardé sans envoyer';
    const r = p.resume || {};
    const det = [r.verse != null ? pfEuros(r.verse) + ' versés' : '', r.facture != null ? pfEuros(r.facture) + ' de formation' : '',
                 r.solde > 0.009 ? 'avance ' + pfEuros(r.solde) : r.solde < -0.009 ? 'reste à payer ' + pfEuros(-r.solde) : (r.solde != null ? 'solde 0 €' : ''),
                 r.net != null ? 'à prévoir ' + pfEuros(r.net) : ''].filter(Boolean).join(' · ');
    const lg = ligneDossier(quand + ' · ' + quoi + ', par ' + (p.par || '?'), det + ' — toucher pour relire le texte');
    lg.style.cursor = 'pointer';
    lg.setAttribute('role', 'button'); lg.tabIndex = 0;
    const ouvrir = () => fenetre(p.texte, [{ nom: 'Fermer', valeur: true, principal: true }], '🧾 Point du ' + quand);
    lg.addEventListener('click', ouvrir);
    lg.addEventListener('keydown', ev => { if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); ouvrir(); } });
    z.appendChild(lg);
  });
}

/* ⚠️ À GARDER EN DERNIÈRE LIGNE : le fichier est arrivé jusqu'au bout. */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-point-financier.js'] = true;
