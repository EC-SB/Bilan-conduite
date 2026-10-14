/* Déployé le 14/10/2026 à 17:25 — v1178 */
/* ============================================================
   ec-tarifs-fiches.js — 💰 LES TARIFS ET LEURS FICHES (v1178)

   David, le 14 octobre : « je voudrais un squelette de tarifs, et
   que quand je change un tarif ça change partout où ça a besoin, et
   que le calcul des totaux se fasse automatiquement. Là, si je veux
   changer mon taux horaire en voiture c'est une galère : je dois
   reprendre chaque fichier Word un par un avec le risque de me
   planter dans mes calculs. […] imprimer mes tarifs en PDF, les
   exporter en JPG pour les mettre sur mon site internet, les envoyer
   par mail en PDF (il faut que je puisse en sélectionner plusieurs).
   Il faudra prévoir des boutons rapides pour imprimer ceux qu'on
   veut avoir vite quand on n'a plus de stock d'imprimés. »

   ⚠️ TROIS ÉTAGES, ET UN PRIX N'EST ÉCRIT QU'UNE FOIS.
   · les TARIFS HORAIRES (voiture, équipée, simulateur, moto…) ;
   · les PRESTATIONS : un prix fixe, ou une formule sur les tarifs
     horaires (« examen blanc = 1,5 × heure voiture ») ;
   · les FICHES : des lignes « prestation × quantité ». Sous-totaux,
     totaux, 1er versement (les lignes ★) et HT se calculent.

   Ses arbitrages, sur le schéma : BV et BEA en deux cases liées 🔗
   qu'on détache ; les forfaits à prix fixe ; ETG et ETM distincts ;
   JPG en téléchargement ; l'historique gardé pour l'école, la date
   du dernier changement à l'écran et rien sur la fiche ; prix et
   fiches changés par les administrateurs, impression et envoi par
   ceux qui ont 💰 Tarifs.

   Le Worker garde les versions : voir « LES TARIFS ET LEURS
   FICHES » dans cloudflare-worker.js.
   ============================================================ */

let tfData = null;            /* la version du jour, telle qu'enregistrée */
let tfVersion = null;         /* { id, majLe, majPar } */
let tfHistorique = [];
let tfModifiable = false;     /* administrateur */
let tfBrouillon = null;       /* ce qu'on est en train de changer */
let tfConsult = null;         /* 🗂️ une ancienne version, en lecture seule */
let tfOnglet = 'prix';
let tfDossier = '';
const tfSelection = new Set();

const TF_ADRESSES = [
  '4 rue Saint Benoît 22000 SAINT BRIEUC – 09 83 55 56 87 – Agrément n° E1802200010',
  '3 rue Louis Lavergne 22600 LOUDEAC – 09 86 29 42 52 – Agrément n° E2402200030',
  'Organisme de formation n° 53220887422',
  'contact@evolutionconduites.fr'
];

/* Le logo des fiches, dans le fichier : une image venue d'ailleurs
   bloquerait la fabrication des PDF et des JPG (la page « salie »
   ne se lit plus), et il doit s'imprimer sans réseau. */
const TF_LOGO = 'data:image/jpeg;base64,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';

/* ⚠️ LA FICHE A SA FEUILLE DE STYLE À ELLE. Elle sert trois fois :
   à l'écran (miniatures, aperçu), dans la fenêtre d'impression, et
   pour les PDF/JPG. Une seule source, sinon les trois divergent. */
const TF_CSS_FICHE = `
.tfA4{ width:794px; height:1123px; background:#fff; color:#000; font-family:Arial, Helvetica, sans-serif; position:relative;
  box-sizing:border-box; padding:22px 20px 0; display:flex; --tf:20px; flex-direction:column; overflow:hidden; text-align:left;
  -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.tfA4 *{ box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.tfCorps{ flex:1 1 auto; min-height:0; overflow:hidden; }
.tfT{ width:100%; border-collapse:collapse; font-size:var(--tf); line-height:1.22; margin:0 0 calc(var(--tf) * .6); table-layout:auto; }
.tfT td{ border:1px solid #000; padding:1px 3px; vertical-align:middle; color:#000; }
/* Une hauteur de ligne écrite : la photographie des PDF/JPG (html2canvas)
   recompose la page et serrait les lignes ; à l'écran et à l'impression
   ça ne change rien. */
.tfT td{ height:calc(var(--tf) * 1.22 + 3px); }
.tfTitre td{ background:#B6FF0E; font-size:calc(var(--tf) * 1.6); font-weight:700; text-align:center; padding:2px 6px; line-height:1.15; }
.tfEntete td{ background:#3b3b3b; color:#fff; font-weight:700; text-align:center; font-size:var(--tf); line-height:1.15; }
.tfSec td{ background:#8a8a8a; color:#fff; font-weight:700; font-size:var(--tf); padding:1px 3px; }
.tfLib{ width:62%; }
.tfPu, .tfSt{ text-align:right; white-space:nowrap; width:14%; background:#B6FF0E; }
.tfQ{ text-align:right; width:6%; }
.tfEt{ color:#9bd400; font-weight:700; vertical-align:super; font-size:.6em; margin-left:1px; }
.tfTotal td{ background:#3b3b3b; color:#fff; font-weight:700; text-align:center; }
.tfTotal td:last-child{ text-align:right; white-space:nowrap; }
.tfV1 td{ text-align:left; }
.tfV1 td:last-child{ text-align:right; }
.tfNote td{ text-align:center; font-style:italic; padding:3px; }
.tfGlobal td{ font-size:calc(var(--tf) * 1.1); background:#6b6b6b; }
.tfApres td:nth-child(3), .tfApres td:nth-child(4){ width:6%; }
.tfNoteLibre{ text-align:center; font-style:italic; font-size:var(--tf); line-height:1.35; margin:calc(var(--tf) * .7) 0; white-space:normal; color:#000; }
.tfLogo{ text-align:center; margin:10px 0 8px; }
.tfLogo img{ height:68px; width:auto; display:inline-block; }
.tfPied{ background:#ededed; margin:0 0 22px; padding:8px 0 10px; text-align:center; font-size:15px; font-style:italic; line-height:1.3; color:#555; }
.tfDouble{ padding:0; }
.tfMoitie{ --tf:14px; height:561px; display:flex; flex-direction:column; padding:14px 24px 0; overflow:hidden; border-bottom:1px dashed #bbb; }
.tfMoitie .tfLogo img{ height:52px; }
.tfMoitie .tfPied{ font-size:11px; padding:5px 0; margin-bottom:10px; }
.tfGrille{ padding:22px 26px; display:block; }
.tfGTitre{ border:1px solid #c8e86b; text-align:center; font-weight:700; padding:10px; font-size:14px; margin-bottom:0; color:#000; }
.tfGCols{ display:flex; gap:24px; }
.tfGCols > div{ flex:1; min-width:0; }
.tfG{ width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:14px; }
.tfG td{ border:1px solid #c8e86b; padding:4px 5px; text-align:center; color:#000; }
.tfG td:first-child{ width:62%; }
.tfG td + td{ white-space:nowrap; }
.tfGTete td{ font-weight:700; font-size:11px; padding:8px 5px; }
.tfGTete td:first-child{ font-size:13px; }
.tfGPack td{ font-size:13px; }
.tfGNote{ text-align:center; font-weight:700; font-size:16px; margin-top:22px; color:#000; }
`;
(function(){
  try{
    if(document.getElementById('tfCssFiche')) return;
    const st = document.createElement('style');
    st.id = 'tfCssFiche';
    st.textContent = TF_CSS_FICHE;
    document.head.appendChild(st);
  }catch(e){ /* pas de document : un banc */ }
})();

/* À l'écran, une adresse courte vers la même image : vingt-huit
   miniatures ne recopient pas trente kilo-octets chacune. La fenêtre
   d'impression, elle, reçoit l'image entière. */
let tfLogoUrl = '';
function tfLogo(){
  if(tfLogoUrl) return tfLogoUrl;
  try{
    const bin = atob(TF_LOGO.split(',')[1]);
    const t = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) t[i] = bin.charCodeAt(i);
    tfLogoUrl = URL.createObjectURL(new Blob([t], { type: 'image/jpeg' }));
  }catch(e){ tfLogoUrl = TF_LOGO; }
  return tfLogoUrl;
}

const tfEch = x => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tfArrondi = n => Math.round(n * 100) / 100;
function tfEuros(n){
  return (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/[  ]/g, ' ') + ' €';
}
const tfCopie = x => JSON.parse(JSON.stringify(x));
const tfTitre1 = f => String((f && f.titre) || '').replace(/\n/g, ' ');

/* ── Les calculs ─────────────────────────────────────────────── */

/* ⚠️ BV ET BEA. Un tarif horaire ou une prestation qui sert aux deux
   porte une case « bea » : liée, elle vaut la case BV ; détachée,
   elle a son propre prix. Le genre vient de la fiche (« BV »,
   « BEA », ou rien : moto, AM, code…). */
function tfTaux(d, id, g){
  const t = d.taux.find(x => x.id === id);
  if(!t) return 0;
  if(g === 'BEA' && t.bea && !t.bea.lie) return Number(t.bea.pu) || 0;
  return Number(t.pu) || 0;
}
function tfPrestation(d, pid){ return d.prestations.find(p => p.id === pid) || null; }
function tfPrix(d, pid, g){
  const p0 = tfPrestation(d, pid);
  if(!p0) return 0;
  const p = (g === 'BEA' && p0.bea && !p0.bea.lie) ? p0.bea : p0;
  return tfArrondi(Number(p.fixe || 0) + Object.keys(p.formule || {}).reduce((s, k) => s + tfTaux(d, k, g) * p.formule[k], 0));
}
function tfLibelle(l){ return String(l.lib || '').replace(/\{q\}/g, String(l.q).replace('.', ',')); }
function tfFiche(d, id){ return d.fiches.find(f => f.id === id); }
function tfLignes(f){
  return [].concat(...(f.blocs || []).map(b => [].concat(...b.sections.map(s => s.lignes))), ...(f.apres || []).map(a => a.lignes));
}

/* Les totaux : par bloc, le 1er versement (toutes les lignes ★, quel
   que soit le bloc — c'est ce que font les fiches CS), et le total
   global quand il y a plusieurs blocs. */
function tfTotaux(d, f){
  if(!f || f.type === 'grille') return { blocs: [], versement: 0, global: 0 };
  let versement = 0;
  const blocs = (f.blocs || []).map(b => {
    let t = 0;
    b.sections.forEach(s => s.lignes.forEach(l => {
      const st = tfArrondi(tfPrix(d, l.p, f.genre) * (Number(l.q) || 0));
      t += st;
      if(l.v1) versement += st;
    }));
    return tfArrondi(t);
  });
  return { blocs, versement: tfArrondi(versement), global: tfArrondi(blocs.reduce((a, b) => a + b, 0)) };
}
function tfTotalDeLaFiche(d, f){ return tfTotaux(d, f).global; }
function tfHT(d, ttc){ return tfArrondi(ttc / (1 + (Number(d.tva) || 20) / 100)); }

function tfFichesDe(d, pid){
  return d.fiches.filter(f => f.type !== 'grille' && tfLignes(f).some(l => l.p === pid));
}
function tfPrestationsDuTaux(d, tid){
  return d.prestations.filter(p => (p.formule && p.formule[tid]) || (p.bea && p.bea.formule && p.bea.formule[tid]));
}
function tfFichesDuTaux(d, tid){
  const ids = new Set();
  tfPrestationsDuTaux(d, tid).forEach(p => tfFichesDe(d, p.id).forEach(f => ids.add(f.id)));
  return d.fiches.filter(f => ids.has(f.id));
}
function tfSeulementForfaits(d, p){
  const f = tfFichesDe(d, p.id);
  return f.length > 0 && f.every(x => x.forfait);
}
/* Les heures d'un forfait (sur son tarif à lui) et ce que pèsent ses
   autres lignes : le total écrit en découle, « soit X € de l'heure ». */
function tfHeuresDuForfait(d, f){
  let h = 0, fixe = 0;
  [].concat(...f.blocs.map(b => [].concat(...b.sections.map(s => s.lignes)))).forEach(l => {
    const p = tfPrestation(d, l.p);
    const c = Number(((p && p.formule) || {})[f.forfait] || 0);
    if(c) h += c * (Number(l.q) || 0); else fixe += tfPrix(d, l.p, f.genre) * (Number(l.q) || 0);
  });
  return { h: tfArrondi(h), fixe: tfArrondi(fixe) };
}

/* ── La fiche A4, telle qu'elle s'imprime ─────────────────────── */
function tfFicheHtml(d, f, logoEntier){
  if(f.type === 'grille') return tfGrilleHtml(d, f);
  const tot = tfTotaux(d, f);
  const ligne = l => {
    const pu = tfPrix(d, l.p, f.genre);
    return '<tr><td class="tfLib">' + tfEch(tfLibelle(l)).replace(/\n/g, '<br>') + (l.v1 ? '<span class="tfEt">*</span>' : '') + '</td>' +
      '<td class="tfPu">' + tfEuros(pu) + '</td><td class="tfQ">' + tfEch(String(l.q).replace('.', ',')) + '</td><td class="tfSt">' +
      tfEuros(pu * (Number(l.q) || 0)) + '</td></tr>';
  };
  let x = '';
  (f.blocs || []).forEach((b, i) => {
    x += '<table class="tfT">';
    if(i === 0) x += '<tr class="tfTitre"><td colspan="4">' + tfEch(f.titre).replace(/\n/g, '<br>') + '</td></tr>' +
      '<tr class="tfEntete"><td>PRESTATIONS</td><td>TARIF<br>UNIT.</td><td>QTÉ</td><td>SOUS-<br>TOTAL</td></tr>';
    b.sections.forEach(s => {
      if(s.titre) x += '<tr class="tfSec"><td colspan="4">' + tfEch(s.titre) + '</td></tr>';
      s.lignes.forEach(l => { x += ligne(l); });
    });
    x += '<tr class="tfTotal"><td colspan="3">' + tfEch(b.total || 'TOTAL TTC') + '</td><td>' + tfEuros(tot.blocs[i]) + '</td></tr>';
    if(i === 0 && tot.versement) x += '<tr class="tfV1"><td colspan="3"><span class="tfEt">*</span>1er versement</td><td class="tfPu">' + tfEuros(tot.versement) + '</td></tr>';
    if(i === 0 && (f.notes || [])[0] && String(f.notes[0]).indexOf('Ensuite') === 0){
      x += '<tr class="tfNote"><td colspan="4">' + tfEch(f.notes[0]).replace(/\n/g, '<br>') + '</td></tr>';
    }
    x += '</table>';
  });
  if((f.blocs || []).length > 1){
    x += '<table class="tfT tfGlobal"><tr class="tfTotal"><td>TOTAL GLOBAL</td><td>' + tfEuros(tot.global) + '</td></tr></table>';
  }
  (f.apres || []).forEach(a => {
    x += '<table class="tfT tfApres"><tr class="tfSec"><td colspan="4">' + tfEch(a.titre) + '</td></tr>' +
      a.lignes.map(l => '<tr><td class="tfLib">' + tfEch(tfLibelle(l)) + '</td><td class="tfPu">' + tfEuros(tfPrix(d, l.p, f.genre)) +
        '</td><td></td><td></td></tr>').join('') + '</table>';
  });
  (f.notes || []).filter(n => String(n).indexOf('Ensuite') !== 0).forEach(n => {
    x += '<div class="tfNoteLibre">' + tfEch(n).replace(/\n/g, '<br>') + '</div>';
  });
  const page = '<div class="tfCorps">' + x + '</div>' +
    '<div class="tfLogo"><img src="' + (logoEntier ? TF_LOGO : tfLogo()) + '" alt="Évolution Conduites"></div>' +
    '<div class="tfPied">' + TF_ADRESSES.map(tfEch).join('<br>') + '</div>';
  /* La passerelle B78 s'imprime deux fois par feuille, à découper */
  if(f.format === 'demi') return '<div class="tfA4 tfDouble"><div class="tfMoitie">' + page + '</div><div class="tfMoitie">' + page + '</div></div>';
  return '<div class="tfA4">' + page + '</div>';
}

/* La police part de 20 px (comme le classeur) et descend tant que la
   fiche déborde de sa page. */
function tfAjuster(racine){
  (racine || document).querySelectorAll('.tfCorps').forEach(c => {
    const boite = c.closest('.tfMoitie') || c.closest('.tfA4');
    let t = boite.classList.contains('tfMoitie') ? 14 : 20;
    boite.style.setProperty('--tf', t + 'px');
    while(t > 8 && c.scrollHeight > c.clientHeight + 1){ t -= 0.5; boite.style.setProperty('--tf', t + 'px'); }
  });
}

function tfGrilleHtml(d, f){
  const prix = v => v.f ? tfTotalDeLaFiche(d, tfFiche(d, v.f) || {}) : tfPrix(d, v.p, v.g);
  const col = sections => (sections || []).map(s =>
    '<table class="tfG"><tr class="tfGTete"><td>' + tfEch(s.titre) + '</td><td>TTC</td><td>HT</td></tr>' +
    s.lignes.map(([lib, v]) => {
      const ttc = prix(v || {});
      return '<tr' + ((v || {}).f ? ' class="tfGPack"' : '') + '><td>' + tfEch(lib) + '</td><td>' + tfEuros(ttc) + '</td><td>' +
        tfEuros(tfHT(d, ttc)) + '</td></tr>';
    }).join('') + '</table>').join('');
  return '<div class="tfA4 tfGrille"><div class="tfGTitre">' + tfEch(f.titre || 'TARIFS') + '</div><div class="tfGCols"><div>' +
    col((f.colonnes || [])[0]) + '</div><div>' + col((f.colonnes || [])[1]) + '</div></div>' +
    (f.notes || []).map(n => '<div class="tfGNote">' + tfEch(n) + '</div>').join('') + '</div>';
}

/* ── Lire, enregistrer ───────────────────────────────────────── */

async function tfCharger(force){
  if(tfData && !force) return tfData;
  const r = await appelPrep({ action: 'tarifsLire' });
  if(!r || r.status !== 'ok' || !r.tarifs) throw new Error((r && r.message) || 'Tarifs illisibles');
  tfData = r.tarifs;
  tfVersion = r.version || null;
  tfHistorique = r.historique || [];
  tfModifiable = !!r.modifiable;
  tfBrouillon = tfCopie(tfData);
  return tfData;
}

/* Les tarifs pour un autre écran (le devis d'évaluation) */
async function tarifsDuCatalogue(){
  try{ return await tfCharger(false); }catch(e){ return null; }
}

function tfModifie(){
  return !!(tfData && tfBrouillon && JSON.stringify(tfData) !== JSON.stringify(tfBrouillon));
}

function tfChangements(){
  const avant = tfData, apres = tfBrouillon;
  const out = [];
  apres.fiches.forEach(f => {
    if(f.type === 'grille') return;
    const fa = tfFiche(avant, f.id);
    const a = fa ? tfTotaux(avant, fa) : { global: 0, versement: 0 }, b = tfTotaux(apres, f);
    if(!fa || a.global !== b.global || a.versement !== b.versement) out.push({ f, a, b, neuve: !fa });
  });
  return out;
}

/* Ce qui a changé, en une phrase : c'est ce que garde l'historique. */
function tfResume(avant, apres){
  const morceaux = [];
  apres.taux.forEach(t => {
    const a = avant.taux.find(x => x.id === t.id);
    if(!a || t.forfait) return;
    const aBV = tfTaux(avant, t.id, 'BV'), bBV = tfTaux(apres, t.id, 'BV');
    const aBEA = tfTaux(avant, t.id, 'BEA'), bBEA = tfTaux(apres, t.id, 'BEA');
    const nom = t.nom.replace(/^Heure (de )?/, 'heure ');
    if(t.bea && (aBV !== bBV || aBEA !== bBEA)){
      if(bBV === bBEA && aBV === aBEA) morceaux.push(nom + ' ' + tfEuros(aBV) + ' → ' + tfEuros(bBV));
      else morceaux.push(nom + ' BV ' + tfEuros(aBV) + ' → ' + tfEuros(bBV) + ', BEA ' + tfEuros(aBEA) + ' → ' + tfEuros(bBEA));
    }else if(aBV !== bBV) morceaux.push(nom + ' ' + tfEuros(aBV) + ' → ' + tfEuros(bBV));
  });
  apres.fiches.filter(f => f.forfait).forEach(f => {
    const fa = tfFiche(avant, f.id);
    if(fa && tfTotalDeLaFiche(avant, fa) !== tfTotalDeLaFiche(apres, f)){
      morceaux.push('forfait ' + tfTitre1(f) + ' ' + tfEuros(tfTotalDeLaFiche(avant, fa)) + ' → ' + tfEuros(tfTotalDeLaFiche(apres, f)));
    }
  });
  const pres = apres.prestations.filter(p => {
    const a = avant.prestations.find(x => x.id === p.id);
    return !a || JSON.stringify(a) !== JSON.stringify(p);
  });
  if(pres.length) morceaux.push(pres.length === 1 ? 'prestation « ' + pres[0].nom.split(' — ')[0] + ' »' : pres.length + ' prestations');
  const retirees = avant.prestations.filter(p => !apres.prestations.some(x => x.id === p.id)).length;
  if(retirees) morceaux.push(retirees + ' prestation(s) retirée(s)');
  const fiches = apres.fiches.filter(f => {
    const a = tfFiche(avant, f.id);
    return a && JSON.stringify(a) !== JSON.stringify(f) && !f.forfait;
  });
  if(fiches.length) morceaux.push((fiches.length === 1 ? 'fiche ' : 'fiches ') + fiches.slice(0, 4).map(tfTitre1).join(', ') + (fiches.length > 4 ? '…' : ''));
  const neuves = apres.fiches.filter(f => !tfFiche(avant, f.id));
  if(neuves.length) morceaux.push('nouvelle(s) fiche(s) ' + neuves.map(tfTitre1).join(', '));
  const parties = avant.fiches.filter(f => !tfFiche(apres, f.id));
  if(parties.length) morceaux.push('fiche(s) retirée(s) ' + parties.map(tfTitre1).join(', '));
  if(JSON.stringify(avant.rapides) !== JSON.stringify(apres.rapides)) morceaux.push('boutons « Imprimer vite »');
  return morceaux.join(' · ').slice(0, 580) || 'Prix modifiés';
}

async function tfEnregistrer(bouton){
  if(!tfModifiable || !tfModifie()) return false;
  if(bouton) bouton.disabled = true;
  try{
    const r = await appelPrep({ action: 'tarifsPoser', base: tfVersion && tfVersion.id,
                                tarifs: tfBrouillon, quoi: tfResume(tfData, tfBrouillon) });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    await tfCharger(true);
    /* Le devis d'évaluation relira ses prix */
    if(typeof tarifsPrestations !== 'undefined') try{ tarifsPrestations = null; }catch(e){}
    if(typeof showToast === 'function') showToast('Prix enregistrés ✅');
    afficherTarifsFiches();
    return true;
  }catch(e){
    if(bouton) bouton.disabled = false;
    if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e));
    return false;
  }
}

/* ── L'écran ─────────────────────────────────────────────────── */

/* Les tarifs que montre l'écran : le brouillon, ou une ancienne
   version consultée depuis 🗂️ Historique. */
function tfCourant(){ return tfConsult ? tfConsult.tarifs : tfBrouillon; }
function tfEcrit(){ return tfModifiable && !tfConsult; }

async function afficherTarifsFiches(){
  const z = (typeof $ === 'function') ? $('tarifsZone') : document.getElementById('tarifsZone');
  if(!z) return;
  if(!tfData){
    z.innerHTML = (typeof htmlAttente === 'function') ? htmlAttente('Lecture des tarifs…') : '<div class="empty">Lecture des tarifs…</div>';
    try{ await tfCharger(false); }
    catch(e){ z.innerHTML = '<div class="empty">⚠️ ' + tfEch((e && e.message) || e) + '</div>'; return; }
  }
  const garde = window.scrollY;
  z.innerHTML = '';
  const onglets = document.createElement('div');
  onglets.className = 'rrFiltres tfOnglets';
  [['prix', '💶 Les prix'], ['fiches', '📄 Les fiches'], ['vite', '🖨️ Imprimer vite'], ['devis', '🧾 Devis d’évaluation']].forEach(([k, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rrFiltre' + (tfOnglet === k ? ' on' : '');
    b.textContent = t;
    b.addEventListener('click', () => { tfOnglet = k; afficherTarifsFiches(); });
    onglets.appendChild(b);
  });
  z.appendChild(onglets);

  if(tfConsult){
    const ban = document.createElement('div');
    ban.className = 'tfConsult';
    ban.innerHTML = '<span>📜 Les prix du <b>' + tfEch(tfConsult.version.majLe) + '</b>' +
      (tfConsult.version.majPar ? ' (' + tfEch(tfConsult.version.majPar) + ')' : '') + ' — lecture seule</span>';
    const r = document.createElement('button');
    r.type = 'button'; r.className = 'tfBtn'; r.textContent = '↩️ Revenir aux prix du jour';
    r.addEventListener('click', () => { tfConsult = null; tfSelection.clear(); afficherTarifsFiches(); });
    ban.appendChild(r);
    z.appendChild(ban);
  }

  const corps = document.createElement('div');
  z.appendChild(corps);
  if(tfOnglet === 'prix') tfOngletPrix(corps);
  if(tfOnglet === 'fiches') tfOngletFiches(corps);
  if(tfOnglet === 'vite') tfOngletVite(corps);
  if(tfOnglet === 'devis'){
    const aide = document.createElement('div');
    aide.className = 'tfAide';
    aide.innerHTML = 'Le devis d’évaluation, comme avant. Les lignes marquées 🔗 prennent leur prix dans <b>💶 Les prix</b> ' +
      '(BV et BEA) : elles suivent toutes seules.';
    corps.appendChild(aide);
    const sous = document.createElement('div');
    corps.appendChild(sous);
    if(typeof afficherTarifs === 'function') afficherTarifs(sous);
  }
  /* Dans « 📄 Les fiches », la barre du bas est celle d'imprimer ou
     d'envoyer : celle d'enregistrer se met en haut, sans se coller. */
  if(tfOnglet !== 'devis' && tfEcrit() && tfModifie()){
    const b = tfBarreEnregistrer();
    if(tfOnglet === 'fiches'){ b.classList.add('tfBasHaut'); z.insertBefore(b, corps); }
    else z.appendChild(b);
  }
  window.scrollTo(0, garde);
}

function tfBarreEnregistrer(){
  const ch = tfChangements();
  const bas = document.createElement('div');
  bas.className = 'tfBas';
  bas.innerHTML = '<span class="tfBasMot">● ' + (ch.length ? ch.length + ' fiche(s) changent' : 'Des changements à enregistrer') + '</span>';
  const voir = document.createElement('button'); voir.type = 'button'; voir.className = 'btn btn-secondary'; voir.textContent = '👁️ Voir les changements';
  voir.addEventListener('click', () => tfFenetreChangements());
  const ann = document.createElement('button'); ann.type = 'button'; ann.className = 'btn btn-secondary'; ann.textContent = '↩️ Annuler';
  ann.addEventListener('click', async () => {
    if(typeof confirmer === 'function' && !await confirmer('Oublier tous les changements pas encore enregistrés ?', 'Annuler', true)) return;
    tfBrouillon = tfCopie(tfData); afficherTarifsFiches();
  });
  const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'btn btn-primary'; ok.id = 'tfEnregistrer'; ok.textContent = '✅ Enregistrer';
  ok.addEventListener('click', () => tfFenetreChangements());
  bas.append(voir, ann, ok);
  return bas;
}

function tfFenetre(classe){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const m = document.createElement('div');
  m.className = 'modal ' + (classe || 'tfFenetre');
  fond.appendChild(m);
  document.body.appendChild(fond);
  return { fond, m, fermer: () => (typeof fermerFond === 'function' ? fermerFond(fond) : fond.remove()) };
}

function tfFenetreChangements(){
  const ch = tfChangements();
  const { m, fermer } = tfFenetre();
  m.innerHTML = '<h3>👁️ Ce qui change</h3>' +
    '<div class="tfAide">' + tfEch(tfResume(tfData, tfBrouillon)) + '</div>' +
    (ch.length ? '<div class="tfAide">' + ch.length + ' fiche(s) sur ' + tfBrouillon.fiches.filter(f => f.type !== 'grille').length +
      ' changent de total. La grille d’affichage (TTC / HT) et le devis d’évaluation suivent aussi.</div>' +
      '<div class="tfDefile"><table class="tfCh"><tr><th>Fiche</th><th>Total</th><th>1er versement</th></tr>' + ch.map(x =>
        '<tr><td>' + tfEch(tfTitre1(x.f)) + (x.neuve ? ' <i>(nouvelle)</i>' : '') + '</td><td>' + (x.neuve ? '' : tfEuros(x.a.global) + ' → ') +
        '<b>' + tfEuros(x.b.global) + '</b></td><td>' +
        (x.b.versement ? (x.neuve ? '' : tfEuros(x.a.versement) + ' → ') + '<b>' + tfEuros(x.b.versement) + '</b>' : '—') + '</td></tr>').join('') +
      '</table></div>' : '<div class="tfAide">Aucun total ne change.</div>') +
    '<div class="tfFenBas"><button type="button" class="btn btn-secondary" id="tfChFermer">Revenir</button>' +
    '<button type="button" class="btn btn-primary" id="tfChOk">✅ Enregistrer</button></div>';
  m.querySelector('#tfChFermer').addEventListener('click', fermer);
  m.querySelector('#tfChOk').addEventListener('click', async e => { if(await tfEnregistrer(e.target)) fermer(); });
}

/* Deux cases BV / BEA et le 🔗 entre elles. Liées, les deux ont le
   même prix et changer l'une change l'autre. */
function tfPaire(bv, bea, lie, quand, lecture){
  const w = document.createElement('div');
  w.className = 'tfPaire' + (lie ? ' lie' : '');
  w.innerHTML = '<label><span>BV</span><input type="number" inputmode="decimal" step="0.01" min="0" value="' + bv + '"' + (lecture ? ' disabled' : '') + '></label>' +
    '<button type="button" class="tfLien" title="' + (lie ? 'Liées : un prix pour les deux. Appuie pour les détacher' :
      'Détachées : chacune son prix. Appuie pour les relier (BEA reprend le prix BV)') + '"' + (lecture ? ' disabled' : '') + '>' + (lie ? '🔗' : '⛓️‍💥') + '</button>' +
    '<label><span>BEA</span><input type="number" inputmode="decimal" step="0.01" min="0" value="' + bea + '"' + (lecture ? ' disabled' : '') + '></label>';
  const [iBV, iBEA] = w.querySelectorAll('input');
  iBV.addEventListener('input', () => { if(lie) iBEA.value = iBV.value; });
  iBEA.addEventListener('input', () => { if(lie) iBV.value = iBEA.value; });
  iBV.addEventListener('change', () => quand(Number(iBV.value) || 0, lie ? Number(iBV.value) || 0 : Number(iBEA.value) || 0, lie));
  iBEA.addEventListener('change', () => quand(lie ? Number(iBEA.value) || 0 : Number(iBV.value) || 0, Number(iBEA.value) || 0, lie));
  w.querySelector('.tfLien').addEventListener('click', () => quand(Number(iBV.value) || 0, Number(iBV.value) || 0, !lie));
  return w;
}
function tfPuces(genres){ return (genres || []).map(g => '<i class="tfG' + g + '">' + g + '</i>').join(''); }
function tfNomTaux(d, k){ return String((d.taux.find(t => t.id === k) || {}).nom || k).replace(/^Heure (de )?/, 'heure '); }
function tfFormuleTexte(d, f){
  return Object.keys(f || {}).map(k => (f[k] !== 1 ? String(f[k]).replace('.', ',') + ' × ' : '') + tfNomTaux(d, k)).join(' + ');
}

function tfOngletPrix(z){
  const d = tfCourant();
  const base = tfConsult ? tfConsult.tarifs : tfData;
  const ecrit = tfEcrit();

  const date = document.createElement('div');
  date.className = 'tfDate';
  const v = tfConsult ? tfConsult.version : tfVersion;
  date.innerHTML = '<span>🕓 Prix du <b>' + tfEch((v && v.majLe) || '—') + '</b>' + (v && v.majPar ? ' · ' + tfEch(v.majPar) : '') + '</span>';
  const hist = document.createElement('button');
  hist.type = 'button'; hist.className = 'tfBtn'; hist.textContent = '🗂️ Historique';
  hist.addEventListener('click', () => tfFenetreHistorique());
  date.appendChild(hist);
  z.appendChild(date);

  const aide = document.createElement('div');
  aide.className = 'tfAide';
  aide.innerHTML = ecrit
    ? 'Change un prix : <b>toutes les fiches qui l’utilisent se recalculent</b> (sous-totaux, totaux, 1er versement, HT). ' +
      'BV et BEA sont <b>liées 🔗</b> : changer l’une change l’autre. Appuie sur 🔗 pour changer un seul type. ' +
      'Rien ne change pour de vrai tant que tu n’as pas vu les changements et enregistré.'
    : 'Les prix en vigueur. Seul un administrateur les change.';
  z.appendChild(aide);

  const carte = (titre, sous) => {
    const c = document.createElement('div');
    c.className = 'tfCarte';
    c.innerHTML = '<div class="tfCarteT">' + titre + '</div>' + (sous ? '<div class="tfCarteS">' + sous + '</div>' : '');
    z.appendChild(c);
    return c;
  };
  const avantTxt = (a, b, quoi) => a !== b ? '<span class="tfAvant">' + (quoi ? quoi + ' ' : '') + 'avant ' + tfEuros(a) + '</span>' : '';

  /* ⏱️ Les tarifs horaires */
  const c1 = carte('⏱️ Les tarifs horaires', 'Ils font le prix de toutes les prestations qui en dépendent.');
  d.taux.filter(t => !t.forfait).forEach(t => {
    const l = document.createElement('div');
    const aBV = tfTaux(base, t.id, 'BV'), aBEA = tfTaux(base, t.id, 'BEA');
    const bv = tfTaux(d, t.id, 'BV'), bea = tfTaux(d, t.id, 'BEA');
    l.className = 'tfLigne' + (aBV !== bv || aBEA !== bea ? ' change' : '');
    l.dataset.taux = t.id;
    l.innerHTML = '<div class="tfNom">' + tfEch(t.nom) + '<span>' + tfPrestationsDuTaux(d, t.id).length + ' prestation(s) · ' +
      tfFichesDuTaux(d, t.id).length + ' fiche(s)</span></div><div class="tfPrix"></div>';
    const px = l.querySelector('.tfPrix');
    if(t.bea){
      px.appendChild(tfPaire(bv, bea, !!t.bea.lie, (vBV, vBEA, lie) => {
        t.pu = vBV; t.bea = { lie, pu: lie ? vBV : vBEA }; afficherTarifsFiches(); }, !ecrit));
      px.insertAdjacentHTML('beforeend', '<span class="tfHt">' + tfEuros(tfHT(d, bv)) + (bv !== bea ? ' / ' + tfEuros(tfHT(d, bea)) : '') + ' HT</span>' +
        avantTxt(aBV, bv, 'BV') + avantTxt(aBEA, bea, 'BEA'));
    }else{
      const seul = tfFichesDuTaux(d, t.id).map(f => f.genre);
      const g = seul.length && seul.every(x => x === 'BEA') ? ['BEA'] : seul.length && seul.every(x => x === 'BV') ? ['BV'] : [];
      px.innerHTML = tfPuces(g) + '<input type="number" inputmode="decimal" step="0.01" min="0" value="' + t.pu + '"' + (ecrit ? '' : ' disabled') + '>' +
        '<span class="tfE">€</span><span class="tfHt">' + tfEuros(tfHT(d, t.pu)) + ' HT</span>' + avantTxt(aBV, bv);
      px.querySelector('input').addEventListener('change', e => { t.pu = Number(e.target.value) || 0; afficherTarifsFiches(); });
    }
    c1.appendChild(l);
  });

  /* 📦 Les forfaits — David : « on garde prix fixe ». On écrit le
     total ; l'heure du forfait s'en déduit, et rien d'autre ne le
     fait bouger (ses autres lignes sont à prix fixe). */
  const forfaits = d.fiches.filter(f => f.forfait);
  if(forfaits.length){
    const cF = carte('📦 Les forfaits', 'Un prix fixe : tu écris le total, l’heure du forfait se calcule. Aucun autre tarif ne le fait bouger.');
    forfaits.forEach(f => {
      const fa = tfFiche(base, f.id);
      const a = fa ? tfTotalDeLaFiche(base, fa) : 0, b = tfTotalDeLaFiche(d, f);
      const hf = tfHeuresDuForfait(d, f);
      const l = document.createElement('div');
      l.className = 'tfLigne' + (a !== b ? ' change' : '');
      l.dataset.forfait = f.id;
      l.innerHTML = '<div class="tfNom">' + tfEch(tfTitre1(f)) + '<span>soit ' + tfEuros(tfTaux(d, f.forfait)) + ' de l’heure · ' +
        String(hf.h).replace('.', ',') + ' h' + (hf.fixe ? ' + ' + tfEuros(hf.fixe) + ' de lignes fixes' : '') + '</span></div>' +
        '<div class="tfPrix"><input type="number" inputmode="decimal" step="1" min="0" value="' + b + '"' + (ecrit ? '' : ' disabled') + '><span class="tfE">€</span>' +
        '<span class="tfHt">' + tfEuros(tfHT(d, b)) + ' HT</span>' + avantTxt(a, b) + '</div>' +
        '<button type="button" class="rgPetit" title="Ouvrir la fiche">' + (ecrit ? '✏️' : '👁️') + '</button>';
      l.querySelector('input').addEventListener('change', e => {
        const t = d.taux.find(x => x.id === f.forfait);
        if(t && hf.h) t.pu = Math.round(((Number(e.target.value) || 0) - hf.fixe) / hf.h * 10000) / 10000;
        afficherTarifsFiches();
      });
      l.querySelector('button').addEventListener('click', () => tfOuvrirFiche(f.id));
      cF.appendChild(l);
    });
  }

  /* 🧾 Les prestations */
  const c2 = carte('🧾 Les prestations', 'Un prix fixe, ou une formule sur un tarif horaire : celles-là suivent toutes seules.');
  const outils = document.createElement('div');
  outils.className = 'tfOutils';
  const rech = document.createElement('input');
  rech.type = 'text';
  rech.placeholder = '🔍 Chercher une prestation…';
  rech.className = 'tfRech';
  outils.appendChild(rech);
  if(ecrit){
    const ajout = document.createElement('button');
    ajout.type = 'button'; ajout.className = 'tfBtn'; ajout.textContent = '➕ Une prestation';
    ajout.addEventListener('click', () => tfFenetrePrestation(null));
    outils.appendChild(ajout);
  }
  c2.appendChild(outils);
  const liste = document.createElement('div');
  c2.appendChild(liste);
  const norm = x => (typeof normaliserMot === 'function' ? normaliserMot(x) : String(x).toLowerCase());
  const dessiner = () => {
    const q = norm(rech.value);
    liste.innerHTML = '';
    d.prestations.filter(p => !tfSeulementForfaits(d, p))
      .filter(p => !q || norm(p.nom).indexOf(q) !== -1)
      .forEach(p => {
        const g1 = (p.genres || []).length === 1 ? p.genres[0] : 'BV';
        const aP = tfPrestation(base, p.id);
        const aBV = aP ? tfPrix(base, p.id, g1) : 0, bv = tfPrix(d, p.id, g1);
        const aBEA = aP ? tfPrix(base, p.id, 'BEA') : 0, bea = tfPrix(d, p.id, 'BEA');
        const change = !aP || aBV !== bv || (p.bea && aBEA !== bea);
        const l = document.createElement('div');
        l.className = 'tfLigne' + (change ? ' change' : '');
        l.dataset.presta = p.id;
        const nom = p.nom.split(' — ');
        const nf = tfFichesDe(d, p.id).length;
        l.innerHTML = '<div class="tfNom">' + tfEch(nom[0]) + (nom[1] ? ' <em>' + tfEch(nom[1]) + '</em>' : '') +
          '<span>' + (nf ? nf + ' fiche(s)' : 'dans aucune fiche') + '</span></div><div class="tfPrix"></div>' +
          '<button type="button" class="rgPetit" title="' + (ecrit ? 'Modifier' : 'Voir') + '">' + (ecrit ? '✏️' : '👁️') + '</button>';
        const px = l.querySelector('.tfPrix');
        const formule = Object.keys(p.formule || {});
        if(formule.length || (p.bea && !p.bea.lie && Object.keys(p.bea.formule || {}).length)){
          px.innerHTML = '<span class="tfFormule" title="Se calcule tout seul">🔗 ' + tfEch(tfFormuleTexte(d, p.formule)) +
              (Number(p.fixe) ? ' + ' + tfEuros(p.fixe) : '') + '</span>' +
            (p.bea ? '<b class="tfDeux"><i class="tfGBV">BV</i>' + tfEuros(bv) + '</b><b class="tfDeux"><i class="tfGBEA">BEA</i>' + tfEuros(bea) + '</b>'
                   : tfPuces(p.genres) + '<b>' + tfEuros(bv) + '</b>') +
            avantTxt(aBV, bv, p.bea ? 'BV' : '') + (p.bea ? avantTxt(aBEA, bea, 'BEA') : '');
        }else if(p.bea){
          px.appendChild(tfPaire(bv, bea, !!p.bea.lie, (vBV, vBEA, lie) => {
            p.fixe = vBV; p.bea = { lie, fixe: lie ? vBV : vBEA, formule: {} }; afficherTarifsFiches(); }, !ecrit));
          px.insertAdjacentHTML('beforeend', avantTxt(aBV, bv, 'BV') + avantTxt(aBEA, bea, 'BEA'));
        }else{
          px.innerHTML = tfPuces(p.genres) + '<input type="number" inputmode="decimal" step="0.01" min="0" value="' + p.fixe + '"' + (ecrit ? '' : ' disabled') + '>' +
            '<span class="tfE">€</span>' + avantTxt(aBV, bv);
          px.querySelector('input').addEventListener('change', e => { p.fixe = Number(e.target.value) || 0; afficherTarifsFiches(); });
        }
        l.querySelector('.rgPetit').addEventListener('click', () => tfFenetrePrestation(p.id));
        liste.appendChild(l);
      });
    if(!liste.children.length) liste.innerHTML = '<div class="empty">Aucune prestation ne correspond.</div>';
  };
  rech.addEventListener('input', dessiner);
  dessiner();
}

/* ✏️ Une prestation : son nom, son prix (fixe ou formule), et la case
   BEA quand elle sert aux deux types. */
function tfFenetrePrestation(pid){
  const d = tfCourant();
  const ecrit = tfEcrit();
  const neuve = !pid;
  const p = neuve ? { id: 'p' + Date.now().toString(36), nom: '', fixe: 0, formule: {}, genres: [] } : tfCopie(tfPrestation(d, pid));
  if(!p) return;
  const { m, fermer } = tfFenetre();
  const optsTaux = d.taux.filter(t => !t.forfait).map(t => '<option value="' + tfEch(t.id) + '">' + tfEch(t.nom) + '</option>').join('');
  const bloc = (cle, x) => {
    const k = Object.keys(x.formule || {})[0] || '';
    return '<div class="tfPrBloc" data-cle="' + cle + '">' +
      '<div class="tfChoix"><label><input type="radio" name="tfMode' + cle + '" value="fixe"' + (k ? '' : ' checked') + '> Prix fixe</label>' +
      '<label><input type="radio" name="tfMode' + cle + '" value="formule"' + (k ? ' checked' : '') + '> Suit un tarif horaire</label></div>' +
      '<div class="tfPrFixe"' + (k ? ' hidden' : '') + '><input type="number" inputmode="decimal" step="0.01" min="0" class="tfPrMontant" value="' + (Number(x.fixe) || 0) + '"> €</div>' +
      '<div class="tfPrFormule"' + (k ? '' : ' hidden') + '><input type="number" inputmode="decimal" step="0.25" min="0" class="tfPrCoef" value="' + (k ? x.formule[k] : 1) + '"> × ' +
      '<select class="tfPrTaux">' + optsTaux.replace('value="' + tfEch(k) + '"', 'value="' + tfEch(k) + '" selected') + '</select>' +
      ' + <input type="number" inputmode="decimal" step="0.01" min="0" class="tfPrPlus" value="' + (k ? Number(x.fixe) || 0 : 0) + '"> €</div></div>';
  };
  const fiches = neuve ? [] : tfFichesDe(d, p.id);
  m.innerHTML = '<h3>' + (neuve ? '➕ Une prestation' : (ecrit ? '✏️ ' : '👁️ ') + tfEch(p.nom.split(' — ')[0])) + '</h3>' +
    '<label class="tfEtiq">Nom dans la liste</label><input type="text" id="tfPrNom" value="' + tfEch(p.nom) + '" maxlength="200">' +
    '<div class="tfAide">Le nom de la liste seulement : ce qui est imprimé sur une fiche se règle dans la fiche. ' +
      'Après « — », un nom court qui la distingue d’une autre (« — ETM »).</div>' +
    '<label class="tfEtiq">' + (p.bea ? 'Prix BV' : 'Prix') + '</label>' + bloc('bv', p) +
    (p.bea ? '<label class="tfChoix tfPrLie"><input type="checkbox" id="tfPrLie"' + (p.bea.lie ? ' checked' : '') + '> 🔗 BEA au même prix que BV</label>' +
      '<div id="tfPrBea"' + (p.bea.lie ? ' hidden' : '') + '><label class="tfEtiq">Prix BEA</label>' + bloc('bea', p.bea) + '</div>' : '') +
    '<div class="tfAide">' + (fiches.length ? 'Sur ' + fiches.length + ' fiche(s) : ' + fiches.slice(0, 8).map(f => tfEch(tfTitre1(f))).join(', ') +
      (fiches.length > 8 ? '…' : '') : 'Dans aucune fiche pour l’instant : ajoute-la depuis ✏️ une fiche.') + '</div>' +
    '<div class="tfFenBas">' + (ecrit && !neuve && !fiches.length ? '<button type="button" class="btn btn-secondary tfRouge" id="tfPrSuppr">🗑️ Retirer</button>' : '') +
    '<button type="button" class="btn btn-secondary" id="tfPrX">' + (ecrit ? 'Annuler' : 'Fermer') + '</button>' +
    (ecrit ? '<button type="button" class="btn btn-primary" id="tfPrOk">✅ Valider</button>' : '') + '</div>';
  if(!ecrit) m.querySelectorAll('input, select').forEach(i => { i.disabled = true; });
  m.querySelectorAll('.tfPrBloc').forEach(b => {
    b.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', () => {
      const f = r.value === 'formule' && r.checked;
      b.querySelector('.tfPrFixe').hidden = f;
      b.querySelector('.tfPrFormule').hidden = !f;
    }));
  });
  const lie = m.querySelector('#tfPrLie');
  if(lie) lie.addEventListener('change', () => { m.querySelector('#tfPrBea').hidden = lie.checked; });
  m.querySelector('#tfPrX').addEventListener('click', fermer);
  const lire = cle => {
    const b = m.querySelector('.tfPrBloc[data-cle="' + cle + '"]');
    const formule = b.querySelector('input[value=formule]').checked;
    if(!formule) return { fixe: Number(b.querySelector('.tfPrMontant').value) || 0, formule: {} };
    const o = {}; o[b.querySelector('.tfPrTaux').value] = Number(b.querySelector('.tfPrCoef').value) || 0;
    return { fixe: Number(b.querySelector('.tfPrPlus').value) || 0, formule: o };
  };
  const ok = m.querySelector('#tfPrOk');
  if(ok) ok.addEventListener('click', () => {
    const nom = m.querySelector('#tfPrNom').value.trim();
    if(!nom){ if(typeof showToast === 'function') showToast('Donne-lui un nom.'); return; }
    const bv = lire('bv');
    p.nom = nom; p.fixe = bv.fixe; p.formule = bv.formule;
    if(p.bea){
      if(lie.checked) p.bea = { lie: true, fixe: bv.fixe, formule: tfCopie(bv.formule) };
      else { const be = lire('bea'); p.bea = { lie: false, fixe: be.fixe, formule: be.formule }; }
    }
    if(neuve) d.prestations.push(p);
    else d.prestations[d.prestations.findIndex(x => x.id === p.id)] = p;
    d.prestations.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    fermer();
    afficherTarifsFiches();
  });
  const sup = m.querySelector('#tfPrSuppr');
  if(sup) sup.addEventListener('click', () => {
    d.prestations = d.prestations.filter(x => x.id !== p.id);
    fermer();
    afficherTarifsFiches();
  });
}

/* 🗂️ Chaque enregistrement garde les prix d'avant : pour l'école,
   pour retrouver ce qu'un élève a signé à telle date. */
function tfFenetreHistorique(){
  const { m, fermer } = tfFenetre();
  m.innerHTML = '<h3>🗂️ L’historique des prix</h3><div class="tfAide">Chaque enregistrement est gardé. ' +
    '« 📄 Ses fiches » les montre telles qu’elles étaient (pour retrouver ce qu’un élève a signé), et elles s’impriment.</div>' +
    '<div class="tfDefile"><table class="tfCh"><tr><th>Le</th><th>Par</th><th>Ce qui a changé</th><th></th></tr>' + (tfHistorique || []).map(h =>
      '<tr><td>' + tfEch(h.le) + '</td><td>' + tfEch(h.par || '—') + '</td><td>' + tfEch(h.quoi) + '</td><td>' +
      (tfVersion && h.id === tfVersion.id ? '<i>en vigueur</i>' : '<button type="button" class="tfBtn" data-id="' + Number(h.id) + '">📄 Ses fiches</button>') + '</td></tr>').join('') +
    '</table></div><div class="tfFenBas"><button type="button" class="btn btn-secondary" id="tfHiX">Fermer</button></div>';
  m.querySelector('#tfHiX').addEventListener('click', fermer);
  m.querySelectorAll('button[data-id]').forEach(b => b.addEventListener('click', async () => {
    b.disabled = true;
    try{
      const r = await appelPrep({ action: 'tarifsVersion', id: Number(b.dataset.id) });
      if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'illisible');
      tfConsult = { tarifs: r.tarifs, version: r.version };
      tfSelection.clear();
      tfOnglet = 'fiches';
      fermer();
      afficherTarifsFiches();
    }catch(e){
      b.disabled = false;
      if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e));
    }
  }));
}

/* ── 📄 Les fiches ───────────────────────────────────────────── */

function tfMiniature(d, f){
  const c = document.createElement('div');
  c.className = 'tfMini' + (tfSelection.has(f.id) ? ' choisie' : '');
  c.dataset.fiche = f.id;
  const tot = tfTotaux(d, f);
  c.innerHTML = '<label class="tfCoche" title="Choisir"><input type="checkbox"' + (tfSelection.has(f.id) ? ' checked' : '') + '></label>' +
    '<div class="tfMiniPage" title="Ouvrir"><div class="tfMiniEchelle">' + tfFicheHtml(d, f) + '</div></div>' +
    '<div class="tfMiniNom">' + tfEch(tfTitre1(f)) + '</div>' +
    '<div class="tfMiniTot">' + (f.type === 'grille' ? 'TTC et HT' : tfEuros(tot.global) + (tot.versement ? ' · 1er versement ' + tfEuros(tot.versement) : '')) + '</div>';
  c.querySelector('input').addEventListener('change', e => {
    if(e.target.checked) tfSelection.add(f.id); else tfSelection.delete(f.id);
    c.classList.toggle('choisie', e.target.checked);
    tfMajBarreFiches();
  });
  c.querySelector('.tfMiniPage').addEventListener('click', () => tfOuvrirFiche(f.id));
  return c;
}

function tfMajBarreFiches(){
  const b = document.getElementById('tfBarreFiches');
  if(!b) return;
  const n = tfSelection.size;
  b.querySelector('.tfBasMot').textContent = n ? n + ' fiche(s) choisie(s)' : 'Coche des fiches pour les imprimer, les exporter ou les envoyer';
  b.querySelectorAll('button[data-sortie]').forEach(x => { x.disabled = !n; });
}

function tfOngletFiches(z){
  const d = tfCourant();
  const dossiers = [...new Set(d.fiches.map(f => f.dossier).filter(Boolean))];
  if(tfDossier && dossiers.indexOf(tfDossier) === -1) tfDossier = '';
  const filtres = document.createElement('div');
  filtres.className = 'rrFiltres';
  [''].concat(dossiers).forEach(k => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rrFiltre' + (tfDossier === k ? ' on' : '');
    b.textContent = k || 'Toutes (' + d.fiches.length + ')';
    b.addEventListener('click', () => { tfDossier = k; afficherTarifsFiches(); });
    filtres.appendChild(b);
  });
  z.appendChild(filtres);
  const outils = document.createElement('div');
  outils.className = 'tfOutils';
  const tout = document.createElement('button');
  tout.type = 'button'; tout.className = 'tfBtn';
  const visibles = d.fiches.filter(f => !tfDossier || f.dossier === tfDossier);
  const toutes = visibles.length && visibles.every(f => tfSelection.has(f.id));
  tout.textContent = toutes ? '☐ Tout décocher' : '☑️ Tout cocher';
  tout.addEventListener('click', () => { visibles.forEach(f => toutes ? tfSelection.delete(f.id) : tfSelection.add(f.id)); afficherTarifsFiches(); });
  outils.appendChild(tout);
  if(tfEcrit()){
    const neuve = document.createElement('button');
    neuve.type = 'button'; neuve.className = 'tfBtn'; neuve.textContent = '➕ Une fiche';
    neuve.addEventListener('click', () => tfNouvelleFiche(null));
    outils.appendChild(neuve);
  }
  z.appendChild(outils);

  const grille = document.createElement('div');
  grille.className = 'tfMiniatures';
  visibles.forEach(f => grille.appendChild(tfMiniature(d, f)));
  z.appendChild(grille);
  tfAjuster(grille);
  grille.querySelectorAll('.tfMiniPage').forEach(p => { p.firstChild.style.transform = 'scale(' + (p.clientWidth / 794) + ')'; });

  const bas = document.createElement('div');
  bas.className = 'tfBas';
  bas.id = 'tfBarreFiches';
  bas.innerHTML = '<span class="tfBasMot"></span>';
  [['🖨️ Imprimer', () => tfImprimer([...tfSelection], d)], ['📄 PDF', () => tfTelechargerPdf([...tfSelection], d)],
   ['🖼️ JPG', () => tfTelechargerJpg([...tfSelection], d)], ['✉️ Envoyer par mail', () => tfFenetreMail([...tfSelection], d)]].forEach(([t, f]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary'; b.textContent = t;
    b.dataset.sortie = '1';
    b.addEventListener('click', f); bas.appendChild(b);
  });
  z.appendChild(bas);
  tfMajBarreFiches();
}

function tfNouvelleFiche(modele){
  const d = tfBrouillon;
  const id = 'fiche-' + Date.now().toString(36);
  const f = modele ? tfCopie(modele) : { titre: 'Nouvelle fiche', dossier: tfDossier || '', genre: '', format: 'a4', notes: [],
    blocs: [{ total: 'TOTAL TTC', sections: [{ titre: 'CONDUITE VOITURE', lignes: [] }] }], apres: [] };
  f.id = id;
  if(modele) f.titre = tfTitre1(modele) + ' (copie)';
  delete f.forfait;
  d.fiches.push(f);
  tfOuvrirFiche(id);
}

/* ✏️ Une fiche : à gauche ses lignes, à droite la fiche qui se
   redessine. On travaille sur une copie : rien ne touche au
   brouillon tant qu'on n'a pas validé. */
function tfOuvrirFiche(id){
  const d = tfCourant();
  const ecrit = tfEcrit();
  const orig = tfFiche(d, id);
  if(!orig) return;
  const f = tfCopie(orig);
  const { m, fermer } = tfFenetre('tfEditeur');
  /* Pour l'aperçu, un jeu de tarifs où la fiche est la copie en cours */
  const apercuDe = () => Object.assign({}, d, { fiches: d.fiches.map(x => x.id === f.id ? f : x) });

  const dessinerApercu = () => {
    const ap = m.querySelector('.tfEdEchelle');
    if(!ap) return;
    ap.innerHTML = tfFicheHtml(apercuDe(), f);
    tfAjuster(ap);
    const t = tfTotaux(apercuDe(), f);
    const tt = m.querySelector('.tfEdTot');
    if(tt) tt.textContent = f.type === 'grille' ? 'TTC et HT' : tfEuros(t.global) + (t.versement ? ' · 1er versement ' + tfEuros(t.versement) : '');
  };

  const sorties = '<div class="tfEdSorties"><button type="button" class="tfBtn" data-s="imprimer">🖨️ Imprimer</button>' +
    '<button type="button" class="tfBtn" data-s="pdf">📄 PDF</button><button type="button" class="tfBtn" data-s="jpg">🖼️ JPG</button>' +
    '<button type="button" class="tfBtn" data-s="mail">✉️ Mail</button></div>';

  const dessiner = () => {
    const opts = d.prestations.map(p => '<option value="' + tfEch(p.id) + '">' + tfEch(p.nom.slice(0, 70)) + ' — ' +
      tfEuros(tfPrix(d, p.id, f.genre)) + '</option>').join('');
    let g = '';
    if(f.type === 'grille'){
      g = '<div class="tfAide">La grille d’affichage reprend les prix tout seule (TTC et HT). Ses libellés se changent sur demande.</div>';
    }else if(ecrit){
      const dossiers = [...new Set(d.fiches.map(x => x.dossier).filter(Boolean))];
      g += '<div class="tfEdTitre"><label class="tfEtiq">Titre</label><input type="text" data-k="titre" value="' + tfEch(tfTitre1(f)) + '" maxlength="200"></div>' +
        '<div class="tfEdReglages">' +
        '<label>Rangée dans <input type="text" data-k="dossier" list="tfDossiers" value="' + tfEch(f.dossier || '') + '"></label>' +
        '<datalist id="tfDossiers">' + dossiers.map(x => '<option value="' + tfEch(x) + '">').join('') + '</datalist>' +
        '<label>Type <select data-k="genre"><option value="">—</option><option value="BV"' + (f.genre === 'BV' ? ' selected' : '') +
          '>BV (prix BV)</option><option value="BEA"' + (f.genre === 'BEA' ? ' selected' : '') + '>BEA (prix BEA)</option></select></label>' +
        '<label>Format <select data-k="format"><option value="a4">Une par feuille</option><option value="demi"' + (f.format === 'demi' ? ' selected' : '') +
          '>Deux par feuille</option></select></label></div>';
      (f.blocs || []).forEach((b, bi) => {
        g += '<div class="tfEdBloc">Bloc ' + (bi + 1) + ' · <input type="text" data-b="' + bi + '" data-k="total" value="' + tfEch(b.total || '') + '" title="La ligne du total">' +
          ((f.blocs.length > 1) ? '<button type="button" class="tfMini2" data-act="blocSuppr" data-b="' + bi + '" title="Retirer ce bloc">🗑️</button>' : '') + '</div>';
        b.sections.forEach((s, si) => {
          g += '<div class="tfEdSec"><input type="text" data-b="' + bi + '" data-s="' + si + '" data-k="titre" value="' + tfEch(s.titre) + '" placeholder="Titre de la section (gris)">' +
            '<button type="button" class="tfMini2" data-act="secSuppr" data-b="' + bi + '" data-s="' + si + '" title="Retirer la section">🗑️</button></div>';
          s.lignes.forEach((l, li) => {
            const at = 'data-b="' + bi + '" data-s="' + si + '" data-l="' + li + '"';
            g += '<div class="tfEdL"><select ' + at + ' data-k="p">' + opts.replace('value="' + tfEch(l.p) + '"', 'value="' + tfEch(l.p) + '" selected') + '</select>' +
              '<input class="tfEdLib" type="text" ' + at + ' data-k="lib" value="' + tfEch(l.lib) + '">' +
              '<input class="tfEdQ" type="number" inputmode="decimal" min="0" step="0.5" ' + at + ' data-k="q" value="' + l.q + '">' +
              '<button type="button" class="tfEdV1' + (l.v1 ? ' on' : '') + '" ' + at + ' data-act="v1" title="Compte dans le 1er versement">★</button>' +
              '<button type="button" class="tfMini2" ' + at + ' data-act="haut" title="Monter">↑</button>' +
              '<button type="button" class="tfMini2" ' + at + ' data-act="ligneSuppr" title="Retirer la ligne">✕</button></div>';
          });
          g += '<button type="button" class="tfLienBtn" data-act="ligneAjout" data-b="' + bi + '" data-s="' + si + '">➕ Une ligne</button>';
        });
        g += '<button type="button" class="tfLienBtn" data-act="secAjout" data-b="' + bi + '">➕ Une section</button>';
      });
      g += '<button type="button" class="tfLienBtn" data-act="blocAjout">➕ Un bloc (avec son total)</button>';
      (f.apres || []).forEach((a, ai) => {
        g += '<div class="tfEdBloc">Après le total · <input type="text" data-a="' + ai + '" data-k="titre" value="' + tfEch(a.titre) + '"></div>';
        a.lignes.forEach((l, li) => {
          const at = 'data-a="' + ai + '" data-l="' + li + '"';
          g += '<div class="tfEdL"><select ' + at + ' data-k="p">' + opts.replace('value="' + tfEch(l.p) + '"', 'value="' + tfEch(l.p) + '" selected') + '</select>' +
            '<input class="tfEdLib" type="text" ' + at + ' data-k="lib" value="' + tfEch(l.lib) + '">' +
            '<button type="button" class="tfMini2" ' + at + ' data-act="apresSuppr" title="Retirer la ligne">✕</button></div>';
        });
      });
      g += '<label class="tfEtiq">Les phrases sous les tableaux (une par paragraphe ; celle qui commence par « Ensuite » se met sous le total)</label>' +
        '<textarea data-k="notes" rows="4">' + tfEch((f.notes || []).join('\n\n')) + '</textarea>' +
        '<div class="tfEdAide">« {q} » dans un libellé s’écrit avec la quantité : « Cours Audi A3 avec caméras ({q}h) ». ★ = compté dans le 1er versement.</div>';
    }else{
      g = '<div class="tfAide">Les fiches se modifient par un administrateur. D’ici, tu peux l’imprimer, la télécharger ou l’envoyer.</div>';
    }
    m.innerHTML = '<div class="tfEdTete"><b>' + (ecrit && f.type !== 'grille' ? '✏️ ' : '📄 ') + tfEch(tfTitre1(f)) + '</b>' +
      '<span class="tfEdTot"></span><button type="button" class="btn btn-secondary" id="tfEdX">✕</button></div>' +
      '<div class="tfEdCorps"><div class="tfEdGauche">' + g + sorties + '</div>' +
      '<div class="tfEdDroite"><div class="tfEdApercu"><div class="tfEdEchelle"></div></div></div></div>' +
      '<div class="tfFenBas">' + (ecrit && f.type !== 'grille'
        ? '<button type="button" class="btn btn-secondary tfRouge" id="tfEdSuppr">🗑️ Retirer la fiche</button>' +
          '<button type="button" class="btn btn-secondary" id="tfEdDup">📑 Dupliquer</button>' +
          '<button type="button" class="btn btn-secondary" id="tfEdAnn">Annuler</button><button type="button" class="btn btn-primary" id="tfEdOk">✅ Valider la fiche</button>'
        : '<button type="button" class="btn btn-secondary" id="tfEdAnn">Fermer</button>') + '</div>';
    dessinerApercu();
    m.querySelector('#tfEdX').addEventListener('click', fermer);
    m.querySelector('#tfEdAnn').addEventListener('click', fermer);
    const dd = apercuDe;
    m.querySelectorAll('.tfEdSorties button').forEach(b => b.addEventListener('click', () => {
      const s = b.dataset.s;
      if(s === 'imprimer') tfImprimer([f.id], dd());
      if(s === 'pdf') tfTelechargerPdf([f.id], dd());
      if(s === 'jpg') tfTelechargerJpg([f.id], dd());
      if(s === 'mail') tfFenetreMail([f.id], dd());
    }));
    if(!ecrit || f.type === 'grille') return;

    const cible = el => {
      if(el.dataset.a !== undefined) {
        const a = f.apres[+el.dataset.a];
        return el.dataset.l !== undefined ? a.lignes[+el.dataset.l] : a;
      }
      if(el.dataset.b === undefined) return f;
      const b = f.blocs[+el.dataset.b];
      if(el.dataset.s === undefined) return b;
      const s = b.sections[+el.dataset.s];
      return el.dataset.l !== undefined ? s.lignes[+el.dataset.l] : s;
    };
    m.querySelectorAll('[data-k]').forEach(el => {
      const ev = (el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(ev, () => {
        const o = cible(el), k = el.dataset.k;
        if(k === 'notes') f.notes = el.value.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
        else if(k === 'q') o.q = Number(el.value) || 0;
        else o[k] = el.value;
        if(k === 'p' || k === 'genre'){ dessiner(); return; }
        dessinerApercu();
      });
    });
    m.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', () => {
      const act = el.dataset.act;
      const bi = +el.dataset.b, si = +el.dataset.s, li = +el.dataset.l;
      if(act === 'v1'){ const l = cible(el); l.v1 = !l.v1; if(!l.v1) delete l.v1; }
      if(act === 'haut' && li > 0){ const t = f.blocs[bi].sections[si].lignes; [t[li - 1], t[li]] = [t[li], t[li - 1]]; }
      if(act === 'ligneSuppr') f.blocs[bi].sections[si].lignes.splice(li, 1);
      if(act === 'ligneAjout'){
        const p = d.prestations[0];
        f.blocs[bi].sections[si].lignes.push({ p: p ? p.id : '', lib: p ? p.nom.split(' — ')[0] : '', q: 1 });
      }
      if(act === 'secSuppr') f.blocs[bi].sections.splice(si, 1);
      if(act === 'secAjout') f.blocs[bi].sections.push({ titre: '', lignes: [] });
      if(act === 'blocAjout') f.blocs.push({ total: 'TOTAL TTC', sections: [{ titre: '', lignes: [] }] });
      if(act === 'blocSuppr') f.blocs.splice(bi, 1);
      if(act === 'apresSuppr'){ const a = f.apres[+el.dataset.a]; a.lignes.splice(li, 1); if(!a.lignes.length) f.apres.splice(+el.dataset.a, 1); }
      dessiner();
    }));
    m.querySelector('#tfEdOk').addEventListener('click', () => {
      /* Une ligne choisie avant que son libellé soit écrit prend le nom de la prestation */
      tfLignes(f).forEach(l => { if(!String(l.lib || '').trim()){ const p = tfPrestation(d, l.p); l.lib = p ? p.nom.split(' — ')[0] : ''; } });
      const i = d.fiches.findIndex(x => x.id === f.id);
      d.fiches[i] = f;
      fermer();
      afficherTarifsFiches();
    });
    m.querySelector('#tfEdDup').addEventListener('click', () => { fermer(); tfNouvelleFiche(f); });
    m.querySelector('#tfEdSuppr').addEventListener('click', async () => {
      if(typeof confirmer === 'function' && !await confirmer('Retirer la fiche « ' + tfTitre1(f) + ' » ?\n\nElle reste dans l’historique.', 'Retirer', true)) return;
      d.fiches = d.fiches.filter(x => x.id !== f.id);
      (d.rapides || []).forEach(r => { r.fiches = r.fiches.filter(x => x !== f.id); });
      tfSelection.delete(f.id);
      fermer();
      afficherTarifsFiches();
    });
  };
  dessiner();
}

/* ── 🖨️ Imprimer vite ────────────────────────────────────────── */

function tfOngletVite(z){
  const d = tfCourant();
  const aide = document.createElement('div');
  aide.className = 'tfAide';
  aide.textContent = 'Plus d’imprimés au bureau ? Un appui imprime la fiche (ou le lot) à jour. Le nombre d’exemplaires se choisit dans la fenêtre d’impression.';
  z.appendChild(aide);
  const g = document.createElement('div');
  g.className = 'tfVite';
  (d.rapides || []).forEach(r => {
    const ids = r.fiches.filter(id => tfFiche(d, id));
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tfViteBt';
    b.innerHTML = '<span class="e">' + tfEch(r.emoji || '🖨️') + '</span><b>' + tfEch(r.nom) + '</b><span>' +
      ids.map(id => tfEch(tfTitre1(tfFiche(d, id)))).join(' · ') + '</span>';
    b.disabled = !ids.length;
    b.addEventListener('click', () => tfImprimer(ids, d));
    g.appendChild(b);
  });
  if(!(d.rapides || []).length) g.innerHTML = '<div class="empty">Aucun bouton pour l’instant.</div>';
  z.appendChild(g);
  if(tfEcrit()){
    const e = document.createElement('button');
    e.type = 'button'; e.className = 'tfBtn'; e.style.marginTop = '12px';
    e.textContent = '✏️ Modifier les boutons';
    e.addEventListener('click', () => tfFenetreRapides());
    z.appendChild(e);
  }
}

function tfFenetreRapides(){
  const d = tfBrouillon;
  const rapides = tfCopie(d.rapides || []);
  const { m, fermer } = tfFenetre('tfFenetre tfLarge');
  const dessiner = () => {
    m.innerHTML = '<h3>✏️ Les boutons « Imprimer vite »</h3>' +
      rapides.map((r, i) => '<div class="tfRap" data-i="' + i + '"><div class="tfRapTete">' +
        '<input type="text" class="tfRapE" value="' + tfEch(r.emoji) + '" maxlength="4" title="Emoji">' +
        '<input type="text" class="tfRapN" value="' + tfEch(r.nom) + '" maxlength="60" placeholder="Nom du bouton">' +
        '<button type="button" class="tfMini2" data-act="haut" title="Monter">↑</button>' +
        '<button type="button" class="tfMini2" data-act="suppr" title="Retirer">🗑️</button></div>' +
        '<div class="tfRapF">' + d.fiches.map(f => '<label><input type="checkbox" value="' + tfEch(f.id) + '"' +
          (r.fiches.indexOf(f.id) !== -1 ? ' checked' : '') + '> ' + tfEch(tfTitre1(f)) + '</label>').join('') + '</div></div>').join('') +
      '<button type="button" class="tfLienBtn" id="tfRapAjout">➕ Un bouton</button>' +
      '<div class="tfFenBas"><button type="button" class="btn btn-secondary" id="tfRapX">Annuler</button>' +
      '<button type="button" class="btn btn-primary" id="tfRapOk">✅ Valider</button></div>';
    m.querySelectorAll('.tfRap').forEach(el => {
      const r = rapides[+el.dataset.i];
      el.querySelector('.tfRapE').addEventListener('input', e => { r.emoji = e.target.value; });
      el.querySelector('.tfRapN').addEventListener('input', e => { r.nom = e.target.value; });
      el.querySelectorAll('.tfRapF input').forEach(c => c.addEventListener('change', () => {
        r.fiches = [...el.querySelectorAll('.tfRapF input:checked')].map(x => x.value);
      }));
      el.querySelector('[data-act=haut]').addEventListener('click', () => {
        const i = +el.dataset.i; if(i > 0){ [rapides[i - 1], rapides[i]] = [rapides[i], rapides[i - 1]]; dessiner(); } });
      el.querySelector('[data-act=suppr]').addEventListener('click', () => { rapides.splice(+el.dataset.i, 1); dessiner(); });
    });
    m.querySelector('#tfRapAjout').addEventListener('click', () => { rapides.push({ emoji: '🖨️', nom: 'Nouveau bouton', fiches: [] }); dessiner(); });
    m.querySelector('#tfRapX').addEventListener('click', fermer);
    m.querySelector('#tfRapOk').addEventListener('click', () => {
      d.rapides = rapides.filter(r => String(r.nom).trim());
      fermer();
      afficherTarifsFiches();
    });
  };
  dessiner();
}

/* ── Ce qui sort : impression, PDF, JPG, mail ─────────────────── */

function tfNomFichier(f){
  return tfTitre1(f).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'Tarifs';
}

/* 🖨️ ⚠️ UNE FENÊTRE À PART, comme l'affiche des bureaux : la page de
   l'application a ses styles, ses barres, son thème sombre — rien de
   tout ça ne doit se glisser sur la feuille. */
function tfImprimer(ids, d){
  ids = (ids || []).filter(id => tfFiche(d, id));
  if(!ids.length) return;
  const w = window.open('', '_blank');
  if(!w){ if(typeof showToast === 'function') showToast('⚠️ Autorise les fenêtres pour imprimer.'); return; }
  w.document.open();
  w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Tarifs — Évolution Conduites</title><style>' +
    '@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#fff}' +
    '.page{width:210mm;height:297mm;overflow:hidden;break-after:page;page-break-after:always}' +
    '.page:last-child{break-after:auto;page-break-after:auto}' +
    '.page > .tfA4{transform-origin:0 0}' +
    '@media screen{body{background:#888}.page{margin:10px auto;box-shadow:0 2px 12px rgba(0,0,0,.4);background:#fff}}' +
    TF_CSS_FICHE + '</style></head><body>' +
    ids.map(id => '<div class="page">' + tfFicheHtml(d, tfFiche(d, id), true) + '</div>').join('') +
    '<script>' + tfAjuster.toString() + ';' +
    /* 794 px font 210 mm à 96 ppp : on ajuste quand même à la page réelle */
    'document.querySelectorAll(".page").forEach(function(p){var a=p.firstChild;var k=p.clientWidth/794;if(Math.abs(k-1)>0.005)a.style.transform="scale("+k+")";});' +
    'tfAjuster(document);setTimeout(function(){window.focus();window.print();},350);<\/script></body></html>');
  w.document.close();
}

/* Les bibliothèques ne se chargent qu'au premier PDF ou JPG : la même
   règle que l'export des fiches handicap (ec-handicap-pdf.js). */
const TF_LIBS = {
  html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
};
const tfLibsChargees = {};
function tfChargerLib(nom, pret){
  if(tfLibsChargees[nom]) return tfLibsChargees[nom];
  tfLibsChargees[nom] = new Promise((ok, non) => {
    if(pret()){ ok(); return; }
    const s = document.createElement('script');
    s.src = TF_LIBS[nom];
    s.onload = () => pret() ? ok() : non(new Error(nom + ' chargé mais introuvable'));
    s.onerror = () => { tfLibsChargees[nom] = null; non(new Error('Pas de réseau pour fabriquer le fichier (' + nom + ')')); };
    document.head.appendChild(s);
  });
  return tfLibsChargees[nom];
}

/* Une fiche en image : dessinée hors de l'écran à sa vraie taille,
   puis photographiée deux fois plus fin (1588 × 2246). */
async function tfCanvasDe(d, f){
  await tfChargerLib('html2canvas', () => typeof window.html2canvas === 'function');
  const hote = document.createElement('div');
  hote.style.cssText = 'position:fixed;left:-20000px;top:0;width:794px;height:1123px;z-index:-1;background:#fff;';
  hote.innerHTML = tfFicheHtml(d, f);
  document.body.appendChild(hote);
  try{
    tfAjuster(hote);
    const img = hote.querySelector('img');
    if(img && !img.complete) await new Promise(r => { img.onload = img.onerror = r; });
    return await window.html2canvas(hote.firstChild, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
  }finally{
    hote.remove();
  }
}

function tfTelecharger(blob, nom){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}

/* Un petit voyant pendant la fabrication : dix fiches, c'est quelques
   secondes. */
function tfAttente(texte){
  const { fond, m, fermer } = tfFenetre();
  m.innerHTML = '<h3>⏳ ' + tfEch(texte) + '</h3><div class="tfAide" id="tfAttMot"></div>';
  return { dire: t => { const x = m.querySelector('#tfAttMot'); if(x) x.textContent = t; }, fermer, fond };
}

async function tfPdfDe(d, ids, dire){
  await tfChargerLib('jspdf', () => !!(window.jspdf && window.jspdf.jsPDF));
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  for(let i = 0; i < ids.length; i++){
    if(dire) dire((i + 1) + ' / ' + ids.length + ' · ' + tfTitre1(tfFiche(d, ids[i])));
    const c = await tfCanvasDe(d, tfFiche(d, ids[i]));
    if(i) doc.addPage('a4', 'portrait');
    doc.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297);
  }
  return doc;
}

async function tfTelechargerPdf(ids, d){
  ids = (ids || []).filter(id => tfFiche(d, id));
  if(!ids.length) return;
  let ensemble = false;
  if(ids.length > 1){
    const choix = await new Promise(res => {
      const { m, fermer } = tfFenetre();
      m.innerHTML = '<h3>📄 ' + ids.length + ' fiches en PDF</h3>' +
        '<div class="tfFenBas"><button type="button" class="btn btn-secondary" data-c="">Annuler</button>' +
        '<button type="button" class="btn btn-secondary" data-c="un">📄 Un PDF par fiche</button>' +
        '<button type="button" class="btn btn-primary" data-c="tout">📚 Un seul PDF</button></div>';
      m.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { fermer(); res(b.dataset.c); }));
    });
    if(!choix) return;
    ensemble = choix === 'tout';
  }
  const att = tfAttente('Fabrication des PDF');
  try{
    if(ensemble){
      const doc = await tfPdfDe(d, ids, att.dire);
      tfTelecharger(doc.output('blob'), 'Tarifs Evolution Conduites.pdf');
    }else{
      for(const id of ids){
        const doc = await tfPdfDe(d, [id], att.dire);
        tfTelecharger(doc.output('blob'), tfNomFichier(tfFiche(d, id)) + '.pdf');
        await new Promise(r => setTimeout(r, 400));
      }
    }
    if(typeof showToast === 'function') showToast('PDF prêt(s) ✅');
  }catch(e){
    if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e));
  }finally{ att.fermer(); }
}

async function tfTelechargerJpg(ids, d){
  ids = (ids || []).filter(id => tfFiche(d, id));
  if(!ids.length) return;
  const att = tfAttente('Fabrication des images');
  try{
    for(let i = 0; i < ids.length; i++){
      const f = tfFiche(d, ids[i]);
      att.dire((i + 1) + ' / ' + ids.length + ' · ' + tfTitre1(f));
      const c = await tfCanvasDe(d, f);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
      tfTelecharger(blob, tfNomFichier(f) + '.jpg');
      await new Promise(r => setTimeout(r, 400));
    }
    if(typeof showToast === 'function') showToast('Image(s) prête(s) ✅');
  }catch(e){
    if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e));
  }finally{ att.fermer(); }
}

/* ✉️ Le mail : à un élève du répertoire (son adresse est reprise de
   sa fiche) ou à une adresse tapée. Une fiche = un PDF joint. */
function tfFenetreMail(ids, d){
  ids = (ids || []).filter(id => tfFiche(d, id));
  if(!ids.length) return;
  if(ids.length > 10){ if(typeof showToast === 'function') showToast('Dix fiches au plus par mail.'); return; }
  const eleves = (typeof fichesEleves !== 'undefined' && Array.isArray(fichesEleves) ? fichesEleves : []).filter(x => x && x.email && x.nom);
  const { m, fermer } = tfFenetre();
  m.innerHTML = '<h3>✉️ Envoyer les tarifs</h3>' +
    '<label class="tfEtiq">À</label><input type="text" id="tfMailA" list="tfMailEleves" placeholder="Un élève du répertoire, ou une adresse mail" autocomplete="off">' +
    '<datalist id="tfMailEleves">' + eleves.slice(0, 2000).map(x => '<option value="' + tfEch(x.nom) + '">').join('') + '</datalist>' +
    '<div class="tfAide" id="tfMailQui"></div>' +
    '<label class="tfEtiq">Objet</label><input type="text" id="tfMailO" value="Nos tarifs — Évolution Conduites" maxlength="200">' +
    '<label class="tfEtiq">Message</label><textarea id="tfMailT" rows="6">Bonjour,\n\nVous trouverez ci-joint nos tarifs.\nNous restons à votre disposition pour toute question.\n\nL’équipe d’Évolution Conduites</textarea>' +
    '<label class="tfEtiq">En pièces jointes (PDF)</label><div class="tfPj">' + ids.map(id => '<span>📄 ' + tfEch(tfNomFichier(tfFiche(d, id))) + '.pdf</span>').join('') + '</div>' +
    '<div class="tfAide">Le mail part de contact@evolutionconduites.fr et se retrouve dans ✉️ Mails envoyés.</div>' +
    '<div class="tfFenBas"><button type="button" class="btn btn-secondary" id="tfMailX">Annuler</button>' +
    '<button type="button" class="btn btn-primary" id="tfMailOk">✉️ Envoyer</button></div>';
  const champ = m.querySelector('#tfMailA'), qui = m.querySelector('#tfMailQui');
  const resoudre = () => {
    const v = champ.value.trim();
    const e = eleves.find(x => x.nom === v) || (typeof ficheDe === 'function' && v && !/@/.test(v) ? ficheDe(v) : null);
    if(e && e.email) return { a: String(e.email).trim(), eleve: e.nom || v };
    if(/^[^\s@<>",;]+@[^\s@<>",;]+\.[a-z]{2,}$/i.test(v)) return { a: v, eleve: '' };
    return null;
  };
  champ.addEventListener('input', () => {
    const r = resoudre();
    qui.textContent = r ? (r.eleve ? '→ ' + r.a : '') : (champ.value.trim() && !/@/.test(champ.value) ? 'Pas d’adresse mail connue pour ce nom.' : '');
  });
  m.querySelector('#tfMailX').addEventListener('click', fermer);
  m.querySelector('#tfMailOk').addEventListener('click', async e => {
    const r = resoudre();
    if(!r){ if(typeof showToast === 'function') showToast('À qui ? Un élève du répertoire avec une adresse, ou une adresse mail.'); return; }
    const b = e.target;
    b.disabled = true;
    const ancien = b.textContent;
    try{
      const pieces = [];
      for(let i = 0; i < ids.length; i++){
        b.textContent = '⏳ PDF ' + (i + 1) + ' / ' + ids.length;
        const doc = await tfPdfDe(d, [ids[i]]);
        pieces.push({ nom: tfNomFichier(tfFiche(d, ids[i])) + '.pdf', contenu: doc.output('datauristring').split(',')[1] });
      }
      b.textContent = '⏳ Envoi…';
      const rep = await appelPrep({ action: 'tarifsEnvoyer', a: r.a, eleve: r.eleve, objet: m.querySelector('#tfMailO').value,
                                    texte: m.querySelector('#tfMailT').value, pieces });
      if(!rep || rep.status !== 'ok') throw new Error((rep && rep.message) || 'refusé');
      if(typeof showToast === 'function') showToast('Envoyé à ' + r.a + ' ✅');
      fermer();
    }catch(err){
      b.disabled = false;
      b.textContent = ancien;
      if(typeof showToast === 'function') showToast('Impossible : ' + ((err && err.message) || err));
    }
  });
  setTimeout(() => champ.focus(), 50);
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-tarifs-fiches.js'] = true;
