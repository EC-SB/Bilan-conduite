/* Déployé le 28/10/2026 à 12:12 — v1289 */
/* ============================================================
   ec-aides.js — 🧮 LES AIDES AU PERMIS D'UN ÉLÈVE (v1285)

   David, le 28 octobre : « un générateur de toutes les aides
   financières possibles suivant les caractéristiques de l'élève
   (permis 1 € condition et fonctionnement, aide mission locale,
   CPF) ». Schémas v1 et v2, puis ses réponses — voir « LES AIDES
   AU PERMIS D'UN ÉLÈVE » dans cloudflare-worker.js.

   Où ça vit :
   · Élèves › Administratif › 💶 Financements : en haut, le tiroir
     « 🧮 Quelles aides pour cet élève ? » ; en bas, les dossiers
     CPF et Pass'Engagement suivis ; ⚙️ Les aides pour le tableau ;
   · la fiche de l'élève : « 🧮 Ses aides possibles » ;
   · le bandeau du jour (famille « aides ») ;
   · l'export RGPD de son dossier.

   ⚠️ L'ORDRE DE L'ARGENT. Les aides versées à l'école d'abord (CPF,
   Agefiph, Pass'Engagement), chacune sur ce qui reste ; le prêt à
   1 € sur ce qui reste encore ; ALMA sur ce qu'il paie. Jamais plus
   que le prix. L'abondement de France Travail n'est PAS compté :
   c'est France Travail qui décide — il est montré à part.

   ⚠️ LES PRIX DES FORMATIONS CPF SUIVENT 💰 TARIFS (David) : chaque
   formation dit de quoi elle est faite (une fiche, ou une prestation
   × une quantité) et son prix se recalcule. Le prix écrit sur EDOF,
   lui, ne change pas tout seul : l'outil prévient quand ils diffèrent.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const AI = { d: null, charge: 0, enCours: null, tf: null, g: null, vue: 'gen', regl: null, onglet: 'aides',
             edite: '', sale: false, ouvert: true, dossierOuvert: {} };

const AI_LIEN_DRIVUP_EDOF = 'https://app.drivup.fr/outils/suivi_dossier_edof/index.php';

const AI_ETAPES_CPF = [
  ['identite', '🪪 Identité numérique'], ['devis', '📝 Demande de devis'], ['valider', '✅ Valider le dossier'],
  ['valide', '📆 Dossier validé'], ['entree', '🚦 Entrée en formation'], ['sortie', '🏁 Sortie de formation']];
const AI_ETAPES_PE = [
  ['attestation', '📄 Attestation reçue'], ['code', '🔓 Code débloqué'], ['cheque1', '💶 1er chèque reçu'],
  ['suite', '🔓 Suite débloquée'], ['cheque2', '💶 2e chèque reçu']];
const AI_ENTREES = [['entreeCode', '📖 Il commence par le code'], ['entreeConduite', '🚗 Il commence la conduite'],
  ['entreeEnCours', '🔁 En cours de formation conduite'], ['entreeProche', '🏁 Proche du permis']];
const AI_NOMS_MESSAGES = {
  identite: '🪪 Identité numérique', devisClassique: '📝 Demande de devis — classique', devisDE: '📝 Demande de devis — demandeur d’emploi',
  validerClassique: '✅ Valider le dossier — classique', validerDE: '✅ Valider le dossier — demandeur d’emploi', relance: '♻️ Relance (UP)',
  valide: '📆 Dossier validé', entreeCode: '🚦 Entrée — code', entreeConduite: '🚦 Entrée — conduite', entreeEnCours: '🚦 Entrée — en cours de formation',
  entreeProche: '🚦 Entrée — proche du permis', sortie: '🏁 Sortie de formation' };
const AI_LIBELLES_VALEURS = { plafond: 'Plafond (€)', participation: 'Participation (€)', cofiMin: 'Part d’un tiers, au moins (€)',
  delaiClassique: 'Délai classique (jours)', delaiDE: 'Délai demandeur d’emploi (jours)', cheque: 'Montant d’un chèque (€)',
  cheques: 'Nombre de chèques', montants: 'Montants du prêt (€, séparés par des virgules)', mensualite: 'Mensualité (€)', seconde: 'Prêt seconde chance (€)' };

/* La formation de sa fiche → le forfait de 💰 Tarifs qui lui va */
const AI_FORFAIT_DE_LA_FORMATION = {
  'BV': 'pack-b-20h', 'BEA': 'pack-bea-13h', 'AAC BV': 'pack-aac', 'AAC BEA': 'pack-aac-bea', 'CS BV': 'pack-cs', 'CS BEA': 'pack-cs-bea',
  'Conduite supervisée': 'pack-cs', 'Autre AE BV': 'autre-ae-b', 'Autre AE BEA': 'autre-ae-bea', 'Passerelle BEA→BV': 'passerelle-b78-b',
  'Conduite aménagée BEA': 'pack-bea-13h-equipe', 'Régularisation BEA': 'regularisation-de-permis-vehic',
  'A2': 'formation-a1-a2-20h', 'A1 permis': 'formation-a1-a2-20h', 'A1 passerelle': 'formation-a1-7h', 'Moto A': 'passerelle-a2-a-7h',
  'Permis BE': 'formation-eb', 'AM 2 roues': 'formation-am-2-roues', 'AM voiturette': 'formation-am-voiturette' };

/* ── Petits outils ─────────────────────────────────────────────── */
const aiEch = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function aiEl(tag, cls, html){ const e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; }
function aiBouton(texte, cls, f){
  const b = aiEl('button', 'btn ' + (cls || 'btn-secondary') + ' aiBtn', aiEch(texte));
  b.type = 'button';
  if(f) b.addEventListener('click', f);
  return b;
}
function aiEuros(n){
  const v = Math.round((Number(n) || 0) * 100) / 100;
  const t = (Math.round(v * 100) % 100) ? v.toFixed(2).replace('.', ',') : String(Math.round(v));
  return t.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €';
}
function aiRemplir(t, v){
  return String(t || '').replace(/\{(\w+)\}/g, (m, k) => (v && v[k] !== undefined && v[k] !== null) ? String(Array.isArray(v[k]) ? v[k].join(', ') : v[k]) : m);
}
function aiLignes(t){ return String(t || '').split('\n').map(x => x.trim()).filter(Boolean); }
function aiAujourdhui(){ return (typeof todayLocal === 'function') ? todayLocal() : new Date().toISOString().slice(0, 10); }
function aiIsoDeFr(v){
  const m = String(v || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0') : '';
}
function aiFrDeIso(iso){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function aiPlusJours(iso, n){
  const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function aiJoursDepuis(fr){
  const iso = aiIsoDeFr(fr);
  if(!iso) return null;
  return Math.round((new Date(aiAujourdhui() + 'T12:00:00') - new Date(iso + 'T12:00:00')) / 86400000);
}
function aiMoi(){ return (typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur) || ''; }
function aiNorm(s){ return (typeof normaliserMot === 'function') ? normaliserMot(String(s || '')) : String(s || '').toLowerCase().trim(); }

/* ── Lire ──────────────────────────────────────────────────────── */
async function aiCharger(force){
  if(AI.d && !force && Date.now() - AI.charge < 5 * 60000) return AI.d;
  if(AI.enCours) return AI.enCours;
  AI.enCours = (async () => {
    try{
      const r = await appelPrep({ action: 'aidesLire' });
      if(r && r.status === 'ok'){ AI.d = r; AI.charge = Date.now(); }
      else if(!AI.d) throw new Error((r && (r.message || r.error)) || 'Aides illisibles');
    }finally{ AI.enCours = null; }
    try{ AI.tf = (typeof tarifsDuCatalogue === 'function') ? await tarifsDuCatalogue() : null; }catch(e){ AI.tf = null; }
    return AI.d;
  })();
  return AI.enCours;
}
function aiReglages(){ return (AI.vue === 'regl' && AI.regl) ? AI.regl : ((AI.d && AI.d.reglages) || { aides: [], catalogue: [], organismes: [], messages: {} }); }
function aiAide(cle){ return (aiReglages().aides || []).find(a => a.cle === cle) || null; }

/* ── Le prix d'une formation CPF, lu dans 💰 Tarifs ─────────────── */
function aiPrixFormation(x){
  if(!x) return { prix: null, source: '' };
  const compo = x.compo || [];
  if(!compo.length) return { prix: x.prixMain === null || x.prixMain === undefined ? null : Number(x.prixMain), source: 'main' };
  const tf = AI.tf;
  if(!tf || typeof tfPrix !== 'function' || typeof tfFiche !== 'function'){
    return { prix: x.prixEdof === null || x.prixEdof === undefined ? null : Number(x.prixEdof), source: 'edof' };
  }
  let t = 0;
  for(const l of compo){
    if(l.f){
      const fi = tfFiche(tf, l.f);
      if(!fi) return { prix: null, source: 'perdu', manque: l.f };
      t += tfTotalDeLaFiche(tf, fi);
    }else{
      if(!tfPrestation(tf, l.p)) return { prix: null, source: 'perdu', manque: l.p };
      t += tfPrix(tf, l.p, l.g || '') * (Number(l.q) || 0);
    }
  }
  return { prix: Math.round(t * 100) / 100, source: 'tarifs' };
}
function aiFormationCpf(id){ return (aiReglages().catalogue || []).find(x => x.id === id) || null; }
function aiPrixForfait(fid){
  if(!fid || !AI.tf || typeof tfFiche !== 'function') return null;
  const fi = tfFiche(AI.tf, fid);
  return fi ? tfTotalDeLaFiche(AI.tf, fi) : null;
}
function aiForfaits(){
  if(!AI.tf) return [];
  return (AI.tf.fiches || []).filter(f => f.type !== 'grille').map(f => ({ id: f.id, titre: String(f.titre || '').replace(/\n/g, ' '), prix: tfTotalDeLaFiche(AI.tf, f) }));
}

/* ── Le permis, d'après la formation de sa fiche ─────────────────── */
function aiPermisDeLaFormation(f){
  const t = String(f || '');
  if(/\bBE\b|remorque/i.test(t)) return 'BE';
  if(/^AM\b/i.test(t)) return 'AM';
  if(/moto|\bA1\b|\bA2\b|^Moto A$/i.test(t)) return 'A';
  if(/AAC|\bCS\b|supervis/i.test(t)) return 'AAC';
  if(/BEA/.test(t)) return 'BEA';
  return 'B';
}
/* ⚠️ v1289 — LA VOITURE, C'EST BV OU BEA, PEU IMPORTE.
   David, le 28 octobre : « sur le CPF on prend n'importe laquelle qui
   est de la voiture pour les formations voiture ». Le code seul n'y
   est plus : il ne couvre pas une formation conduite. */
function aiCategoriesCpf(g){
  return ({ B: ['B', 'BEA'], BEA: ['B', 'BEA'], AAC: ['B', 'BEA'], A: ['A2'], BE: ['BE'], code: ['Code'], AM: [] })[g.permis] || [];
}
/* ⚠️ v1289 — CELLE JUSTE AU-DESSUS, JAMAIS EN DESSOUS.
   David, le 28 octobre : « il faut mettre la formation qui a un tarif
   au-dessus tout le temps » (avant : la plus proche, au-dessus ou en
   dessous). La moins chère de celles qui coûtent au moins son prix ;
   si aucune n'y arrive, la plus chère. L'annulation (B 10h) ne se
   propose pas toute seule : elle se choisit dans la liste. */
function aiCpfProposee(g){
  const cats = aiCategoriesCpf(g);
  const prix = Number(g.prix) || 0;
  const l = (aiReglages().catalogue || [])
    .filter(x => cats.includes(x.cat) && !/annulation/i.test(String(x.titre || '')))
    .map(x => ({ id: x.id, p: aiPrixFormation(x).prix }))
    .filter(x => x.p !== null)
    .sort((a, b) => a.p - b.p);
  if(!l.length) return '';
  return (l.find(x => x.p >= prix) || l[l.length - 1]).id;
}
/* Toutes les formations du catalogue, rangées par catégorie */
const AI_GROUPES_CPF = { B: '🚗 Voiture — BV', BEA: '🚗 Voiture — BEA', Code: '📖 Code', BE: '🚚 Remorque — BE', A2: '🏍️ Moto — A2' };
function aiOptionsCpf(choisie){
  const cat = aiReglages().catalogue || [];
  const ordre = [];
  cat.forEach(x => { if(!ordre.includes(x.cat)) ordre.push(x.cat); });
  return ordre.map(c => '<optgroup label="' + aiEch(AI_GROUPES_CPF[c] || c) + '">' + cat.filter(x => x.cat === c).map(x => {
    const p = aiPrixFormation(x).prix;
    return '<option value="' + aiEch(x.id) + '"' + (x.id === choisie ? ' selected' : '') + '>' + aiEch(x.titre) + (p !== null ? ' — ' + aiEuros(p) : ' — prix ?') + '</option>';
  }).join('') + '</optgroup>').join('');
}
function aiOrganisme(id){ return (aiReglages().organismes || []).find(o => o.id === id) || null; }

/* ── Un élève : ce que dit sa fiche ───────────────────────────── */
function aiGenerateurVide(){
  return { eleve: '', naissance: '', permis: 'B', formation: '', forfait: '', prix: 0, prixMain: false, cpf: '', cpfAuto: true,
           premier: true, dejaPret: 'n', echec: false, situation: '', cofi: 'n', ml: false, mlOrg: '', cotes: null, handicap: false, mail: '', presc: '' };
}
function aiGenerateurDeLEleve(nom){
  const g = aiGenerateurVide();
  g.eleve = String(nom || '').trim();
  const f = (typeof ficheDe === 'function') ? ficheDe(g.eleve) : null;
  if(f){
    g.naissance = f.naissance || '';
    g.formation = f.formation || '';
    g.permis = aiPermisDeLaFormation(f.formation);
    g.premier = !/Régularisation|Remise à niveau|Passerelle|passerelle/i.test(String(f.formation || ''));
    g.mail = f.email || '';
    g.presc = f.mailPrescripteur || '';
    g.handicap = /aménag|Régularisation/i.test(String(f.formation || '')) || String(f.amenagee || '') === 'oui';
    const fo = AI_FORFAIT_DE_LA_FORMATION[f.formation] || '';
    g.forfait = fo;
    const p = aiPrixForfait(fo);
    if(p !== null) g.prix = p;
    /* Le prescripteur est une Mission locale qu'on connaît ? */
    const presc = aiNorm(g.presc);
    const org = presc ? (aiReglages().organismes || []).find(o => o.type === 'ml' && o.mail && (aiNorm(o.mail) === presc ||
      (presc.split('@')[1] && aiNorm(o.mail).split('@')[1] === presc.split('@')[1]))) : null;
    if(org){ g.ml = true; g.mlOrg = org.id; }
    else if(/mission[ .-]?locale|missionlocale|\bml\d*\b/i.test(g.presc)){ g.ml = true; }
  }
  g.cpf = aiCpfProposee(g);
  return g;
}
function aiAge(g){ return (g.naissance && typeof ageDe === 'function') ? ageDe(g.naissance) : null; }

/* ============================================================
   LES RÈGLES — ce qui est possible pour cet élève
   ============================================================ */
function aiRegles(g){
  const L = [];
  const age = aiAge(g);
  const ageOk = (a) => {
    if(age === null) return null;
    const mi = (a.ageMin === undefined || a.ageMin === null || a.ageMin === '') ? 0 : Number(a.ageMin);
    const ma = (a.ageMax === undefined || a.ageMax === null || a.ageMax === '') ? 200 : Number(a.ageMax);
    return age >= mi && age <= ma;
  };
  const tranche = a => (a.ageMin !== undefined && a.ageMin !== '' ? a.ageMin : '?') + '-' + (a.ageMax !== undefined && a.ageMax !== '' ? a.ageMax : '?') + ' ans';
  const base = (a, quoi) => Object.assign({ cle: a.cle, emoji: a.emoji || '•', nom: a.nom, type: 'aide', etat: 'non', montant: 0, ligne: '',
    marche: aiLignes(aiRemplir(a.marche, a.valeurs)), note: '', mail: aiRemplir(a.mail, a.valeurs), verifieLe: a.verifieLe || '' }, quoi || {});
  const prixCpfDe = id => aiPrixFormation(aiFormationCpf(id)).prix;

  (aiReglages().aides || []).forEach(a => {
    if(!a) return;
    if(a.fin){ L.push(base(a, { type: 'fin', etat: 'fin', ligne: a.fin, marche: [] })); return; }
    if(!a.actif) return;
    const v = a.valeurs || {};
    if(a.cle === 'cpf'){
      const f = aiFormationCpf(g.cpf);
      const pf = f ? prixCpfDe(g.cpf) : null;
      const x = base(a, { formation: f, prixFormation: pf });
      if(g.permis === 'AM') x.ligne = 'Le permis AM ne se finance pas au CPF';
      else if(!g.situation){ x.etat = 'voir'; x.ligne = 'Sa situation ? Demandeur d’emploi, ou salarié avec au moins ' + v.cofiMin + ' € d’un tiers'; }
      else if(!['de', 'salarie'].includes(g.situation)) x.ligne = 'Seuls les demandeurs d’emploi inscrits à France Travail, et les salariés avec ' + v.cofiMin + ' € d’un tiers';
      else if(g.situation === 'salarie' && g.cofi !== 'o') { x.etat = g.cofi === '?' ? 'voir' : 'non'; x.ligne = 'Salarié : seulement si un tiers (employeur, OPCO, État…) paie au moins ' + v.cofiMin + ' € de la formation'; }
      else if(!f) x.ligne = 'Aucune de nos formations CPF ne va avec son permis';
      else if(pf === null){ x.etat = 'voir'; x.ligne = 'Le prix de « ' + f.titre + ' » est introuvable dans 💰 Tarifs'; }
      else {
        x.etat = 'oui';
        x.montant = Math.min(Number(v.plafond) || 0, pf);
        x.ligne = (g.situation === 'de'
          ? 'Demandeur d’emploi inscrit · ' + v.plafond + ' € au plus · pas de participation · début ' + v.delaiDE + ' jours après validation'
          : 'Salarié, avec au moins ' + v.cofiMin + ' € d’un tiers · ' + v.plafond + ' € au plus · en principe pas de participation (son CPF est abondé)');
      }
      x.mail = aiRemplir(a.mail, Object.assign({}, v, { formation: f ? f.titre : '', prix: pf !== null ? aiEuros(pf) : '', lien: f ? f.lien : '' }));
      x.note = '⚠️ Pour nous : des heures en plus d’une formation commencée sans CPF ne se financent pas (Service-Public).';
      L.push(x);
      return;
    }
    if(a.cle === 'abondFT'){
      const x = base(a, { etat: 'non', ligne: 'Seulement pour un demandeur d’emploi inscrit à France Travail', apart: true });
      if(g.situation === 'de' && g.permis !== 'AM'){ x.etat = 'voir'; x.ligne = 'Il peut le demander dans son dossier CPF : en général, France Travail prend le reste du devis'; }
      L.push(x);
      return;
    }
    if(a.cle === 'agefiph'){
      const ok = g.handicap && ['de', 'salarie', 'apprenti'].includes(g.situation);
      L.push(base(a, { etat: g.handicap ? (ok ? 'oui' : 'voir') : 'non', montant: ok ? Number(v.plafond) || 0 : 0,
        ligne: g.handicap ? (ok ? v.plafond + ' € au plus · handicap reconnu (RQTH) et permis utile à son emploi' : 'Handicap reconnu : il faut que le permis serve son emploi (salarié ou demandeur d’emploi)')
                          : 'Seulement avec un handicap reconnu (RQTH, CDAPH)' }));
      return;
    }
    if(a.cle === 'pe22'){
      const ok = ageOk(a);
      const total = (Number(v.cheque) || 0) * (Number(v.cheques) || 0);
      const x = base(a);
      if(ok === null){ x.etat = 'voir'; x.ligne = 'Sa date de naissance ? (' + tranche(a) + ')'; }
      else if(!ok) x.ligne = 'Réservé aux ' + tranche(a);
      else if(g.cotes === false) x.ligne = 'Il faut habiter les Côtes-d’Armor depuis plus de 6 mois';
      else { x.etat = g.cotes ? 'oui' : 'voir'; x.montant = g.cotes ? total : 0;
             x.ligne = g.cotes ? v.cheques + ' chèques de ' + v.cheque + ' € · rien ne se débloque sans le document qui atteste son Pass’Engagement'
                               : 'Habite-t-il les Côtes-d’Armor depuis plus de 6 mois ?'; }
      L.push(x);
      return;
    }
    if(a.cle === 'ml'){
      const ok = ageOk(a);
      const org = aiOrganisme(g.mlOrg);
      const x = base(a, { nom: org ? org.nom : a.nom });
      const sites = (aiReglages().organismes || []).filter(o => o.type === 'ml').map(o => o.site || o.nom).filter(Boolean);
      if(ok === null){ x.etat = 'voir'; x.ligne = 'Sa date de naissance ? (' + tranche(a) + ')'; }
      else if(!ok) x.ligne = 'Réservée aux ' + tranche(a);
      else if(g.situation === 'lyceen') x.ligne = 'Pas tant qu’il est scolarisé';
      else { x.etat = 'voir'; x.ligne = g.ml ? 'Suivi par la Mission locale : son conseiller décide et monte le dossier' : 'Pas encore suivi : il peut s’inscrire' + (sites.length ? ' (' + sites.join(' ou ') + ')' : ''); }
      if(org && (org.contact || org.mail || org.tel)) x.note = 'Contact : ' + [org.contact, org.mail, org.tel].filter(Boolean).join(' · ');
      L.push(x);
      return;
    }
    if(a.cle === 'p1'){
      const ok = ageOk(a);
      const x = base(a, { type: 'pret' });
      if(!['B', 'BEA', 'AAC', 'A'].includes(g.permis)) x.ligne = 'Seulement pour une 1re formation B, A1 ou A2';
      else if(!g.premier) x.ligne = 'Seulement pour un premier permis';
      else if(g.dejaPret === 'o') x.ligne = 'Une seule fois par personne : il l’a déjà eu';
      else if(ok === null){ x.etat = 'voir'; x.ligne = 'Sa date de naissance ? (' + tranche(a) + ')'; }
      else if(!ok) x.ligne = 'Réservé aux ' + tranche(a) + ' (il a ' + age + ' ans)';
      else x.etat = 'oui';
      L.push(x);
      if(g.dejaPret === 'o' && g.echec && (ok !== false) && Number(v.seconde)){
        L.push(base(a, { cle: 'p1b', emoji: '🔁', nom: a.nom + ' — seconde chance', type: 'pret', etat: 'oui', montant: Number(v.seconde),
          ligne: 'Prêt de ' + v.seconde + ' € après un échec à la conduite · une fois par catégorie', marche: [], mail: '' }));
      }
      return;
    }
    if(a.cle === 'commune'){
      const coms = (aiReglages().organismes || []).filter(o => o.type === 'commune');
      L.push(base(a, { etat: 'voir', ligne: coms.length ? 'Connues : ' + coms.map(o => o.nom).join(', ') + ' — sinon, à demander à sa mairie' : 'Aucune commune enregistrée : à demander à sa mairie' }));
      return;
    }
    /* Une aide ajoutée par un administrateur : « à voir », avec son texte */
    const ok = ageOk(a);
    if(ok === false) L.push(base(a, { type: 'autre', ligne: 'Réservée aux ' + tranche(a) }));
    else L.push(base(a, { type: 'autre', etat: 'voir', ligne: aiRemplir(a.conditions, a.valeurs) || '' }));
  });

  /* L'ordre de l'argent */
  const prix = Math.max(0, Number(g.prix) || 0);
  let reste = prix;
  ['cpf', 'agefiph', 'pe22'].forEach(k => {
    const x = L.find(y => y.cle === k);
    if(!x || x.etat !== 'oui') return;
    x.montant = Math.min(x.montant, reste);
    reste -= x.montant;
    if(!x.montant){ x.etat = 'non'; x.ligne = prix ? 'Ses autres aides paient déjà tout' : 'Le prix de sa formation ?'; }
  });
  const pe = L.find(y => y.cle === 'pe22' && y.etat === 'oui');
  if(pe){
    const v = (aiAide('pe22') || {}).valeurs || {};
    if(pe.montant < (Number(v.cheque) || 0) * (Number(v.cheques) || 0)) pe.ligne = 'Jusqu’à ' + aiEuros(pe.montant) + ' sur ses ' + v.cheques + ' chèques de ' + v.cheque + ' € · rien ne se débloque sans le document qui atteste son Pass’Engagement';
  }
  const pr = L.find(y => y.cle === 'p1');
  if(pr && pr.etat === 'oui'){
    const v = (aiAide('p1') || {}).valeurs || {};
    const montants = (v.montants || []).map(Number).filter(n => n > 0).sort((a, b) => b - a);
    const m = montants.find(n => n <= reste) || 0;
    if(!m){ pr.etat = 'non'; pr.ligne = reste > 0 ? 'Il reste ' + aiEuros(reste) + ' : moins que le plus petit prêt (' + (montants.slice(-1)[0] || 0) + ' €)' : 'Ses aides paient déjà tout'; }
    else {
      pr.montant = m; reste -= m;
      const mens = Number(v.mensualite) || 30;
      pr.ligne = 'Prêt de ' + aiEuros(m) + ' · ' + Math.ceil(m / mens) + ' mois à ' + mens + ' € · accord de la banque' + (aiAge(g) !== null && aiAge(g) < 18 ? ' · signé par ses parents' : '');
    }
  }
  const sc = L.find(y => y.cle === 'p1b');
  if(sc){ sc.montant = Math.min(sc.montant, reste); reste -= sc.montant; if(!sc.montant) sc.etat = 'non'; }
  const ab = L.find(y => y.cle === 'abondFT');
  const cpf = L.find(y => y.cle === 'cpf');
  if(ab && ab.etat === 'voir' && cpf && cpf.etat === 'oui' && cpf.prixFormation){
    ab.montant = Math.max(0, cpf.prixFormation - cpf.montant);
    ab.ligne = 'En général, France Travail prend le reste du devis CPF : jusqu’à ' + aiEuros(ab.montant) + ' de plus — c’est lui qui décide';
  }
  L.push({ cle: 'alma', emoji: '💳', nom: 'Paiement en plusieurs fois (ALMA)', type: 'ecole', etat: reste > 0 ? 'oui' : 'non', montant: 0, reste: reste,
    ligne: reste > 0 ? 'Sur les ' + aiEuros(reste) + ' qui restent : en 2, 3 ou 4 fois, frais ALMA à régler au bureau' : (prix ? 'Plus rien à payer' : 'Le prix de sa formation ?'),
    marche: [], note: '', mail: reste > 0 ? 'Le reste, ' + aiEuros(reste) + ' : en 2, 3 ou 4 fois avec ALMA (les frais se règlent au bureau).' : '' });
  return L;
}
function aiTotaux(g, L){
  const prix = Math.max(0, Number(g.prix) || 0);
  const aides = L.filter(x => x.etat === 'oui' && x.type === 'aide').reduce((t, x) => t + x.montant, 0);
  const pret = L.filter(x => x.etat === 'oui' && x.type === 'pret').reduce((t, x) => t + x.montant, 0);
  return { prix: prix, aides: aides, pret: pret, paie: Math.max(0, prix - aides - pret) };
}

/* ============================================================
   L'ÉCRAN — 💶 Financements
   ============================================================ */
function aiStyle(){
  if(document.getElementById('aiStyle')) return;
  const s = document.createElement('style');
  s.id = 'aiStyle';
  s.textContent =
    '.aiBtn{width:auto;margin:0;padding:6px 10px;font-size:12.5px;}' +
    '.aiTiroir{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:14px;}' +
    '.aiTiroir>summary{cursor:pointer;font-size:14px;font-weight:800;}' +
    '.aiGrille{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:2px 18px;}' +
    '.aiQ{margin-bottom:10px;}.aiQ>label{margin-bottom:5px;}' +
    '.aiAide{font-size:11px;color:var(--muted);line-height:1.4;margin:-4px 0 0;}' +
    '.aiTot{border:2px solid var(--green);border-radius:14px;padding:11px 14px;margin:4px 0 12px;}' +
    '.aiTotG{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}' +
    '.aiTotG b{display:block;font-size:20px;font-weight:800;}.aiTotG small{font-size:11px;color:var(--muted);}' +
    '.aiSous{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin:12px 0 7px;}' +
    '.aiCarte{border:1px solid var(--line);border-radius:12px;padding:9px 12px;margin-bottom:8px;}' +
    '.aiCarte.oui{border-color:var(--accent-text);}.aiCarte.non,.aiCarte.fin{opacity:.72;}' +
    '.aiCarte>summary{cursor:pointer;list-style:none;display:flex;gap:10px;align-items:flex-start;}' +
    '.aiCarte>summary::-webkit-details-marker{display:none;}' +
    '.aiEm{font-size:20px;line-height:1.2;}.aiCorps{flex:1;min-width:0;}' +
    '.aiNom{font-size:14px;font-weight:800;}.aiMont{font-size:14px;font-weight:800;color:var(--accent-text);margin-left:8px;}' +
    '.aiLigne{display:block;font-size:12.5px;color:var(--muted);line-height:1.45;margin-top:2px;}' +
    '.aiEtat{flex-shrink:0;font-size:11.5px;font-weight:800;white-space:nowrap;}' +
    '.aiDet{margin:9px 0 2px 30px;font-size:13px;line-height:1.55;}.aiDet ol{margin:0;padding-left:18px;}' +
    '.aiNote{font-size:11.5px;color:var(--muted);margin-top:6px;line-height:1.45;}' +
    '.aiRang{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 2px 30px;}' +
    '.aiBas{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}' +
    '.aiTable{width:100%;border-collapse:collapse;font-size:13px;}' +
    '.aiTable th{padding:6px 8px;text-align:left;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);}' +
    '.aiTable td{padding:7px 8px;border-top:1px solid var(--line);vertical-align:top;}' +
    '.aiFrise{display:flex;gap:4px;flex-wrap:wrap;margin:10px 0;}' +
    '.aiPas{font-size:12px;font-weight:700;padding:5px 9px;border-radius:999px;border:1px solid var(--line);}' +
    '.aiPas.fait{background:color-mix(in srgb,var(--green) 25%,transparent);}.aiPas.ici{background:var(--green);border-color:var(--green);color:#111;}' +
    '.aiDossier{border:1px solid var(--line);border-radius:12px;padding:11px 12px;margin-bottom:10px;}' +
    '.aiDossier.chaud{border-color:var(--accent-text);}' +
    '.aiMsg{width:100%;min-height:180px;font:inherit;font-size:13px;line-height:1.5;}' +
    '.aiInter{display:inline-block;width:34px;height:20px;border-radius:999px;background:var(--line);position:relative;vertical-align:middle;cursor:pointer;border:none;padding:0;margin:0;}' +
    '.aiInter::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;}' +
    '.aiInter.on{background:var(--green);}.aiInter.on::after{left:auto;right:2px;}';
  document.head.appendChild(s);
}

async function afficherAides(){
  const z = $('aidesZone'), zd = $('aidesDossiersZone');
  if(!z) return;
  if(typeof aDroit === 'function' && !aDroit('financements')){ z.innerHTML = ''; if(zd) zd.innerHTML = ''; return; }
  aiStyle();
  if(!AI.d) z.innerHTML = (typeof htmlAttente === 'function') ? htmlAttente('Lecture des aides…') : 'Lecture des aides…';
  try{ await aiCharger(true); }
  catch(e){ z.innerHTML = '<div class="empty">⚠️ ' + aiEch(e.message || e) + '</div>'; return; }
  if(!AI.g) AI.g = aiGenerateurVide();
  if((typeof fichesEleves === 'undefined' || !fichesEleves || !fichesEleves.length) && typeof chargerFiches === 'function'){ chargerFiches().then(() => {}); }
  aiDessiner();
  aiDessinerDossiers();
}

function aiDessiner(){
  const z = $('aidesZone');
  if(!z) return;
  z.innerHTML = '';
  if(AI.vue === 'regl'){ z.appendChild(aiPanneauReglages()); return; }
  const t = aiEl('details', 'aiTiroir');
  t.open = AI.ouvert;
  t.addEventListener('toggle', () => { AI.ouvert = t.open; });
  t.appendChild(aiEl('summary', '', '🧮 Quelles aides pour cet élève ?'));
  t.appendChild(aiGenerateur(AI.g, { dansLaVue: true }));
  z.appendChild(t);
  z.appendChild(aiTiroirMessage());
}

/* ============================================================
   ✉️ v1288 — UN MESSAGE CPF, SANS DOSSIER
   David, le 28 octobre : « Comment je fais pour envoyer les messages
   CPF sans avoir à créer de dossier ? » — « ajoutes un générateur à
   côté ». Les mêmes messages que ⚙️ Les aides › ✉️ Messages CPF,
   remplis avec la formation choisie, et la même fenêtre d'envoi.
   ⚠️ RIEN N'EST NOTÉ : pas de dossier, pas d'étape, pas de « message
   envoyé le ». Pour suivre, c'est ➕ Suivre son dossier CPF.
   ============================================================ */
const AI_MESSAGES_SEULS = [
  ['identite', '🪪 Identité numérique'], ['devis', '📝 Demande de devis'], ['valider', '✅ Valider le dossier'], ['relance', '♻️ Relance (UP)'],
  ['valide', '📆 Dossier validé'], ['entreeCode', '🚦 Entrée — code'], ['entreeConduite', '🚦 Entrée — conduite'],
  ['entreeEnCours', '🚦 Entrée — en cours de formation'], ['entreeProche', '🚦 Entrée — proche du permis'], ['sortie', '🏁 Sortie de formation']];
function aiMessageVide(){ return { eleve: '', mail: '', formation: '', de: false, cle: 'identite', dateEntree: '', datePermis: '', texte: null }; }
function aiCleDuMessageSeul(m){
  if(m.cle === 'devis') return m.de ? 'devisDE' : 'devisClassique';
  if(m.cle === 'valider') return m.de ? 'validerDE' : 'validerClassique';
  return m.cle;
}
function aiTexteDuMessageSeul(m){
  const R = aiReglages(), v = ((R.aides || []).find(a => a.cle === 'cpf') || {}).valeurs || {};
  const f = aiFormationCpf(m.formation), pf = f ? aiPrixFormation(f).prix : null;
  const vals = Object.assign({}, v, {
    participation: aiEuros(Number(v.participation) || 0), formation: f ? f.titre : '', prix: pf !== null ? aiEuros(pf) : '', lien: f ? (f.lien || '') : '',
    dateEntree: m.dateEntree ? aiFrDeIso(m.dateEntree) : '…', datePermis: m.datePermis ? aiFrDeIso(m.datePermis) : '…' });
  return aiRemplir((R.messages || {})[aiCleDuMessageSeul(m)] || '', vals);
}
function aiDelaiEntree(m){
  const v = ((aiReglages().aides || []).find(a => a.cle === 'cpf') || {}).valeurs || {};
  return aiPlusJours(aiAujourdhui(), Number(m.de ? v.delaiDE : v.delaiClassique) || 14);
}
function aiTiroirMessage(){
  if(!AI.m) AI.m = aiMessageVide();
  const t = aiEl('details', 'aiTiroir');
  t.id = 'aiMessageSeul';
  t.open = !!AI.mOuvert;
  t.addEventListener('toggle', () => { AI.mOuvert = t.open; });
  t.appendChild(aiEl('summary', '', '✉️ Un message CPF, sans dossier'));
  const c = aiEl('div', '');
  c.style.marginTop = '10px';
  const dessiner = () => { c.innerHTML = ''; aiCorpsMessage(c, dessiner); };
  dessiner();
  t.appendChild(c);
  return t;
}
function aiCorpsMessage(c, dessiner){
  const m = AI.m;
  const change = (k, v) => { m[k] = v; m.texte = null; dessiner(); };
  c.appendChild(aiEl('div', 'aiAide', 'Pour envoyer un des messages CPF sans ouvrir de dossier. Rien n’est noté : pour suivre ses étapes, ➕ Suivre son dossier CPF (dans « Quelles aides pour cet élève ? »).')).style.margin = '0 0 10px';
  const hd = aiEl('div', '');
  hd.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap;';
  const ir = aiEl('input');
  ir.type = 'text'; ir.setAttribute('list', 'listeEleves'); ir.autocomplete = 'off';
  ir.placeholder = '🔎 Un élève (ou personne : tu mettras son adresse)';
  ir.value = m.eleve || '';
  ir.style.cssText = 'margin:0;flex:1;min-width:200px;';
  ir.addEventListener('change', () => {
    const v = ir.value.trim();
    const f = (typeof ficheDe === 'function') ? ficheDe(v) : null;
    m.eleve = f ? (f.eleve || v) : v;
    m.mail = f ? (f.email || '') : '';
    if(f){ const g = aiGenerateurDeLEleve(m.eleve); if(g.cpf) m.formation = g.cpf; }
    m.texte = null;
    dessiner();
  });
  hd.appendChild(ir);
  hd.appendChild(aiBouton('↺ Tout effacer', '', () => { AI.m = aiMessageVide(); dessiner(); }));
  c.appendChild(hd);

  const gr = aiEl('div', 'aiGrille'), c1 = aiEl('div', ''), c2 = aiEl('div', '');
  const fc = aiEl('div', 'aiQ');
  fc.appendChild(aiEl('label', '', '🔗 Sa formation au CPF'));
  const sel = aiEl('select'); sel.style.marginBottom = '0';
  sel.innerHTML = '<option value=""' + (!m.formation ? ' selected' : '') + '>— choisis la formation —</option>' +
    aiOptionsCpf(m.formation);
  sel.addEventListener('change', () => change('formation', sel.value));
  fc.appendChild(sel);
  fc.appendChild(aiEl('div', 'aiAide', 'Son titre, son prix (lu dans 💰 Tarifs) et son lien vont dans le message.'));
  fc.lastChild.style.marginTop = '4px';
  c1.appendChild(fc);
  c1.appendChild(aiChoix('💼 Sa situation', [['n', '🏢 Classique'], ['o', '📋 Demandeur d’emploi']], m.de ? 'o' : 'n', k => {
    m.de = k === 'o'; if(m.cle === 'valide') m.dateEntree = aiDelaiEntree(m); m.texte = null; dessiner();
  }, 'Change la demande de devis et la validation (abondement France Travail).'));
  c2.appendChild(aiChoix('✉️ Le message', AI_MESSAGES_SEULS, m.cle, k => {
    m.cle = k; if(k === 'valide' && !m.dateEntree) m.dateEntree = aiDelaiEntree(m); m.texte = null; dessiner();
  }));
  const champDate = (lab, k) => {
    const ld = aiEl('div', 'aiQ'); ld.appendChild(aiEl('label', '', lab));
    const ip = aiEl('input'); ip.type = 'date'; ip.value = m[k] || '';
    /* comme la date de naissance (v1286) : on ne redessine pas sous les doigts */
    const suivre = () => { m[k] = /^(19|20)\d\d-/.test(ip.value) ? ip.value : ''; m.texte = null; if(ta.isConnected) ta.value = aiTexteDuMessageSeul(m); };
    ip.addEventListener('input', suivre); ip.addEventListener('change', suivre);
    ld.appendChild(ip);
    return ld;
  };
  if(m.cle === 'valide') c2.appendChild(champDate('📆 Son entrée en formation le', 'dateEntree'));
  if(m.cle === 'entreeProche') c2.appendChild(champDate('🏁 La date de son permis', 'datePermis'));
  gr.appendChild(c1); gr.appendChild(c2);
  c.appendChild(gr);

  const brut = String((aiReglages().messages || {})[aiCleDuMessageSeul(m)] || '');
  if(!m.formation && /\{(formation|prix|lien)\}/.test(brut)) c.appendChild(aiEl('div', 'aiNote', '⚠️ Ce message parle de sa formation : choisis-la au-dessus.')).style.margin = '0 0 6px';
  c.appendChild(aiEl('div', 'aiSous', 'Le message — ' + aiEch(AI_NOMS_MESSAGES[aiCleDuMessageSeul(m)] || '')));
  const ta = aiEl('textarea', 'aiMsg');
  ta.value = m.texte !== null ? m.texte : aiTexteDuMessageSeul(m);
  ta.addEventListener('input', () => { m.texte = ta.value; });
  c.appendChild(ta);
  const r = aiEl('div', 'aiBas');
  r.appendChild(aiBouton('✉️ Envoyer', 'btn-primary', async () => {
    const adresse = m.eleve ? await aiAdresseDe(m.eleve, m.mail) : '';
    aiFenetreMail({ titre: '✉️ ' + (AI_NOMS_MESSAGES[aiCleDuMessageSeul(m)] || 'Message CPF'), eleve: m.eleve, a: adresse,
      sujet: 'Ton dossier CPF — Évolution Conduites', texte: ta.value, genre: 'cpf' });
  }));
  r.appendChild(aiBouton('📋 Copier', '', async () => { try{ await navigator.clipboard.writeText(ta.value); showToast('Copié ✅'); }catch(e){ showToast('Copie impossible'); } }));
  c.appendChild(r);
}
/* Depuis la carte CPF du générateur : le message prérempli */
function aiVersLeMessage(g, bouton){
  AI.m = Object.assign(aiMessageVide(), { eleve: g.eleve || '', mail: g.mail || '', formation: g.cpf || '', de: g.situation === 'de' });
  const z = $('aidesZone');
  if(z && bouton && z.contains(bouton)){
    AI.mOuvert = true;
    aiDessiner();
    const t = $('aiMessageSeul');
    if(t && t.scrollIntoView) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  /* Depuis la fenêtre ouverte dans la fiche de l'élève : une fenêtre de plus */
  const fond = aiEl('div', 'overlay show');
  const md = aiEl('div', 'modal');
  md.style.cssText = 'max-width:min(860px,96vw);max-height:92vh;overflow-y:auto;';
  const h = aiEl('div', '');
  h.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';
  h.appendChild(aiEl('h3', '', '✉️ Un message CPF' + (g.eleve ? ' — ' + aiEch(g.eleve) : ''))).style.cssText = 'flex:1;margin:0;';
  h.appendChild(aiBouton('✕', '', () => fermerFond(fond)));
  md.appendChild(h);
  const c = aiEl('div', 'aiMessageFenetre');
  const dessiner = () => { c.innerHTML = ''; aiCorpsMessage(c, dessiner); };
  dessiner();
  md.appendChild(c);
  fond.appendChild(md);
  document.body.appendChild(fond);
}

/* Le générateur : les questions et le résultat. Il sert dans la vue
   et dans la fenêtre ouverte depuis la fiche de l'élève. */
function aiGenerateur(g, opts){
  const c = aiEl('div', '');
  c.style.marginTop = '10px';
  /* ⚠️ v1286 — LES ZONES SE REMPLISSENT, ELLES NE SE REMPLACENT PAS.
     David, le 28 octobre : « Failed to execute 'replaceWith' » en
     tapant une date de naissance. Le champ date déclenche « change »
     à chaque chiffre de l'année ; le premier redessinait tout le
     générateur sous ses doigts, et l'événement suivant (la sortie du
     champ disparu) redessinait un générateur qui n'était plus là. Les
     champs qu'on tape ne refont plus que le résultat ; les pastilles
     refont les questions, et rien ne se dessine hors de la page. */
  const qz = aiEl('div', ''), rz = aiEl('div', '');
  const majResultat = () => { if(!rz.isConnected) return; rz.innerHTML = ''; rz.appendChild(aiResultat(g, opts)); };
  const redessiner = () => {
    if(!qz.isConnected) return;
    qz.innerHTML = ''; qz.appendChild(aiQuestions(g, redessiner, majResultat));
    majResultat();
  };
  if(opts.dansLaVue){
    c.appendChild(aiEl('div', 'aiAide', 'Au rendez-vous financement, ou au téléphone avec quelqu’un qui n’est pas encore inscrit. Choisis un élève pour remplir avec sa fiche, ou réponds aux questions.')).style.margin = '0 0 10px';
    const hd = aiEl('div', '');
    hd.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap;';
    const ir = aiEl('input');
    ir.type = 'text'; ir.setAttribute('list', 'listeEleves'); ir.autocomplete = 'off';
    ir.placeholder = '🔎 Un élève (ou personne : quelqu’un au téléphone)';
    ir.value = g.eleve || '';
    ir.style.cssText = 'margin:0;flex:1;min-width:200px;';
    ir.addEventListener('change', () => {
      const v = ir.value.trim();
      const f = (typeof ficheDe === 'function') ? ficheDe(v) : null;
      AI.g = f ? aiGenerateurDeLEleve(f.eleve || v) : Object.assign(g, { eleve: v });
      aiDessiner();
    });
    hd.appendChild(ir);
    hd.appendChild(aiBouton('↺ Tout effacer', '', () => { AI.g = aiGenerateurVide(); aiDessiner(); }));
    hd.appendChild(aiBouton('⚙️ Les aides', '', () => { AI.vue = 'regl'; AI.regl = JSON.parse(JSON.stringify(AI.d.reglages)); AI.sale = false; AI.edite = ''; aiDessiner(); }));
    c.appendChild(hd);
  }
  qz.appendChild(aiQuestions(g, redessiner, majResultat));
  c.appendChild(qz);
  const sep = aiEl('div', '');
  sep.style.cssText = 'height:1px;background:var(--line);margin:6px 0 12px;';
  c.appendChild(sep);
  rz.appendChild(aiResultat(g, opts));
  c.appendChild(rz);
  return c;
}

function aiChoix(lab, liste, actif, f, aide){
  const w = aiEl('div', 'aiQ');
  w.appendChild(aiEl('label', '', aiEch(lab)));
  const r = aiEl('div', 'tdOnglets');
  liste.forEach(([k, t]) => {
    const b = aiEl('button', 'btn tdOnglet' + (k === actif ? ' on' : ''), aiEch(t));
    b.type = 'button';
    b.addEventListener('click', () => f(k));
    r.appendChild(b);
  });
  w.appendChild(r);
  if(aide) w.appendChild(aiEl('div', 'aiAide', aide));
  return w;
}

function aiQuestions(g, redessiner, majResultat){
  const grille = aiEl('div', 'aiGrille');
  const c1 = aiEl('div'), c2 = aiEl('div');
  const maj = (k, v) => { g[k] = v; redessiner(); };

  /* Naissance et prix */
  const la = aiEl('div', '');
  la.style.cssText = 'display:flex;gap:10px;align-items:flex-end;margin-bottom:4px;';
  const a = aiEl('div', ''); a.style.cssText = 'flex:1;min-width:0;';
  a.appendChild(aiEl('label', '', '🎂 Date de naissance'));
  const ia = aiEl('input'); ia.type = 'date'; ia.value = g.naissance || ''; ia.style.marginBottom = '0';
  /* L'âge et le résultat suivent la frappe ; une année encore à moitié
     tapée (« 0019 ») ne compte pas. Le champ reste où il est. */
  const suivreLaDate = () => {
    const an = Number(String(ia.value || '').slice(0, 4));
    const bonne = an >= 1900 && an <= new Date().getFullYear();
    g.naissance = bonne ? ia.value : '';
    if(typeof majAge === 'function') majAge();
    if(majResultat) majResultat();
  };
  ia.addEventListener('input', suivreLaDate);
  ia.addEventListener('change', suivreLaDate);
  a.appendChild(ia);
  const b = aiEl('div', ''); b.style.cssText = 'flex:1;min-width:0;';
  b.appendChild(aiEl('label', '', '💶 Prix de sa formation (€)'));
  const ib = aiEl('input'); ib.type = 'number'; ib.step = '0.01'; ib.min = '0'; ib.value = g.prix ? String(g.prix) : ''; ib.style.marginBottom = '0';
  ib.addEventListener('input', () => { g.prix = Number(ib.value) || 0; g.forfait = ''; if(majResultat) majResultat(); });
  ib.addEventListener('change', () => { g.prix = Number(ib.value) || 0; g.forfait = ''; if(g.cpfAuto) g.cpf = aiCpfProposee(g); redessiner(); });
  b.appendChild(ib);
  la.appendChild(a); la.appendChild(b);
  c1.appendChild(la);
  const age = aiAge(g);
  const fo = aiForfaits();
  const lf = aiEl('div', 'aiQ');
  lf.style.marginTop = '8px';
  const sf = aiEl('select'); sf.style.marginBottom = '0';
  sf.innerHTML = '<option value="">💰 Son forfait dans 💰 Tarifs…</option>' + fo.map(x => '<option value="' + aiEch(x.id) + '"' + (x.id === g.forfait ? ' selected' : '') + '>' + aiEch(x.titre) + ' — ' + aiEuros(x.prix) + '</option>').join('');
  sf.addEventListener('change', () => { g.forfait = sf.value; const p = aiPrixForfait(sf.value); if(p !== null) g.prix = p; if(g.cpfAuto) g.cpf = aiCpfProposee(g); redessiner(); });
  lf.appendChild(sf);
  const ageEl = aiEl('div', 'aiAide', '');
  ageEl.style.marginTop = '4px';
  var majAge = () => { const a2 = aiAge(g); ageEl.textContent = (a2 !== null ? a2 + ' ans · ' : '') + (g.forfait ? 'prix du forfait, lu dans 💰 Tarifs' : 'le prix se tape, ou se prend dans un forfait de 💰 Tarifs'); };
  majAge();
  lf.appendChild(ageEl);
  c1.appendChild(lf);

  c1.appendChild(aiChoix('🎓 Son permis', [['B', '🚗 B'], ['BEA', '🚗 BEA'], ['AAC', '🚗 AAC / CS'], ['A', '🏍️ A1 / A2'], ['BE', '🚚 BE'], ['AM', '🛵 AM'], ['code', '📖 Code seul']], g.permis,
    k => { g.permis = k; if(g.cpfAuto) g.cpf = aiCpfProposee(g); redessiner(); }));

  /* La formation CPF proposée */
  const cats = aiCategoriesCpf(g);
  if(cats.length){
    const fc = aiEl('div', 'aiQ');
    fc.appendChild(aiEl('label', '', '🔗 Sa formation au CPF'));
    const sel = aiEl('select'); sel.style.marginBottom = '0';
    sel.innerHTML = aiOptionsCpf(g.cpf) + '<option value=""' + (!g.cpf ? ' selected' : '') + '>— pas au CPF —</option>';
    sel.addEventListener('change', () => { g.cpf = sel.value; g.cpfAuto = false; redessiner(); });
    fc.appendChild(sel);
    fc.appendChild(aiEl('div', 'aiAide', 'Proposée : celle juste au-dessus de son prix' + (['B', 'BEA', 'AAC'].includes(g.permis) ? ', en BV ou en BEA' : '') + '. Toutes les formations sont dans la liste ; les liens : ⚙️ Les aides › Formations CPF.'));
    fc.lastChild.style.marginTop = '4px';
    c1.appendChild(fc);
  }
  c1.appendChild(aiChoix('🆕 Son premier permis ?', [['o', 'Oui, le premier'], ['n', 'Il a déjà un permis']], g.premier ? 'o' : 'n', k => maj('premier', k === 'o')));
  c1.appendChild(aiChoix('🏦 A-t-il déjà eu un prêt « permis à 1 € » ?', [['n', 'Non'], ['o', 'Oui'], ['?', 'Je ne sais pas']], g.dejaPret, k => maj('dejaPret', k)));
  if(g.dejaPret === 'o') c1.appendChild(aiChoix('❌ A-t-il raté l’examen de conduite ?', [['o', 'Oui'], ['n', 'Non']], g.echec ? 'o' : 'n', k => maj('echec', k === 'o'), 'Le prêt « seconde chance » : une fois par catégorie.'));

  c2.appendChild(aiChoix('💼 Sa situation', [['lyceen', '🎒 Lycéen, étudiant'], ['de', '📋 Demandeur d’emploi'], ['salarie', '🏢 Salarié'], ['apprenti', '🛠️ Apprenti'], ['sans', '🏠 Sans activité']], g.situation,
    k => maj('situation', k), g.situation === 'de' ? 'Inscrit à France Travail (c’est ce qui ouvre le CPF).' : ''));
  if(g.situation === 'salarie') c2.appendChild(aiChoix('🤝 Son employeur (ou un OPCO…) paie au moins ' + (((aiAide('cpf') || {}).valeurs || {}).cofiMin || 100) + ' € ?', [['o', 'Oui'], ['n', 'Non'], ['?', 'Je ne sais pas']], g.cofi, k => maj('cofi', k)));
  const mls = (aiReglages().organismes || []).filter(o => o.type === 'ml');
  c2.appendChild(aiChoix('🧭 Suivi par la Mission locale ?', [['o', 'Oui'], ['n', 'Non']], g.ml ? 'o' : 'n', k => maj('ml', k === 'o'),
    g.ml && g.presc ? 'D’après le ✉️ mail du prescripteur de sa fiche.' : ''));
  if(g.ml && mls.length > 1){
    c2.appendChild(aiChoix('Laquelle ?', mls.map(o => [o.id, o.site || o.nom]), g.mlOrg, k => maj('mlOrg', k)));
  }
  c2.appendChild(aiChoix('🏠 Habite les Côtes-d’Armor depuis plus de 6 mois ?', [['o', 'Oui'], ['n', 'Non']], g.cotes === true ? 'o' : g.cotes === false ? 'n' : '', k => maj('cotes', k === 'o')));
  c2.appendChild(aiChoix('♿ Handicap reconnu (RQTH) ?', [['o', 'Oui'], ['n', 'Non']], g.handicap ? 'o' : 'n', k => maj('handicap', k === 'o')));
  grille.appendChild(c1); grille.appendChild(c2);
  return grille;
}

const AI_PASTILLES = { oui: ['✅ Possible', 'var(--accent-text)'], voir: ['🟠 À voir', 'var(--ambre)'], non: ['— Pas possible', 'var(--muted)'], fin: ['🪦 N’existe plus', 'var(--muted)'] };

function aiTableauAlma(montant){
  if(typeof calculPaiement !== 'function' || typeof euros !== 'function') return '';
  const options = [2, 3, 4].map(n => calculPaiement(montant, n));
  const td = (v, gras) => '<td style="padding:6px;text-align:center;border-left:1px solid var(--line);' + (gras ? 'font-weight:800;color:var(--accent-text);' : '') + '">' + v + '</td>';
  return '<div style="overflow-x:auto;"><table class="aiTable" style="font-size:13px;">' +
    '<tr><th></th>' + options.map(o => '<th style="text-align:center;border-left:1px solid var(--line);">En ' + o.fois + ' fois</th>').join('') + '</tr>' +
    '<tr><td style="color:var(--muted);font-size:12px;">Frais (au bureau)</td>' + options.map(o => td(euros(o.frais))).join('') + '</tr>' +
    '<tr><td style="color:var(--muted);font-size:12px;">Mensualités</td>' + options.map(o => td(o.fois + ' × ' + euros(o.mensualite))).join('') + '</tr>' +
    '<tr><td style="color:var(--muted);font-size:12px;">Coût total</td>' + options.map(o => td(euros(o.total), true)).join('') + '</tr></table></div>' +
    ((typeof PLAFOND_ALMA !== 'undefined' && montant > PLAFOND_ALMA) ? '<div style="font-size:12px;color:var(--warn-text);margin-top:6px;">⚠️ ALMA n’accepte pas au-delà de ' + euros(PLAFOND_ALMA) + '.</div>' : '');
}

function aiCarte(g, x){
  const [txt, coul] = AI_PASTILLES[x.etat] || AI_PASTILLES.non;
  const d = aiEl('details', 'aiCarte ' + x.etat);
  d.innerHTML = '<summary><span class="aiEm">' + aiEch(x.emoji) + '</span><span class="aiCorps"><span class="aiNom">' + aiEch(x.nom) + '</span>' +
    (x.montant && x.etat !== 'non' ? '<span class="aiMont">' + (x.type === 'pret' ? 'prêt ' : x.apart ? 'jusqu’à ' : '') + aiEuros(x.montant) + '</span>' : '') +
    '<span class="aiLigne">' + aiEch(x.ligne) + '</span></span><span class="aiEtat" style="color:' + coul + ';">' + txt + '</span></summary>';
  const det = aiEl('div', 'aiDet');
  if(x.cle === 'alma' && x.etat === 'oui') det.innerHTML = aiTableauAlma(x.reste);
  else if((x.marche || []).length) det.innerHTML = '<div class="aiSous" style="margin:0 0 4px;">Comment ça marche</div><ol>' + x.marche.map(m => '<li>' + aiEch(m) + '</li>').join('') + '</ol>';
  if(x.note) det.appendChild(aiEl('div', 'aiNote', aiEch(x.note)));
  if(x.verifieLe && x.etat !== 'fin') det.appendChild(aiEl('div', 'aiNote', 'Règle vérifiée le ' + aiEch(x.verifieLe) + '.'));
  if(det.childNodes.length) d.appendChild(det);
  if(x.etat === 'oui'){
    const r = aiEl('div', 'aiRang');
    if(x.cle === 'cpf'){
      r.appendChild(aiBouton('➕ Suivre son dossier CPF', '', () => aiCreerDossier(g, 'cpf', x)));
      r.appendChild(aiBouton('✉️ Un message CPF', '', ev => aiVersLeMessage(g, ev.currentTarget)));
      if(x.formation && x.formation.lien) r.appendChild(aiBouton('🔗 Copier le lien de la formation', '', async () => {
        try{ await navigator.clipboard.writeText(x.formation.lien); showToast('Lien copié ✅'); }catch(e){ showToast('Copie impossible'); }
      }));
    }
    if(x.cle === 'pe22') r.appendChild(aiBouton('➕ Suivre son Pass’Engagement', '', () => aiCreerDossier(g, 'pe22', x)));
    if(x.cle === 'alma') r.appendChild(aiBouton('💳 Ouvrir le calculateur ALMA', '', () => aiOuvrirAlma(g, x.reste)));
    if(r.childNodes.length) d.appendChild(r);
  }
  return d;
}

function aiResultat(g, opts){
  const L = aiRegles(g);
  const T = aiTotaux(g, L);
  const z = aiEl('div');
  const tot = aiEl('div', 'aiTot');
  const ab = L.find(x => x.cle === 'abondFT' && x.etat === 'voir' && x.montant);
  tot.innerHTML = '<div class="aiSous" style="margin:0 0 6px;">Pour ' + aiEch((g.eleve || 'lui').split(' ')[0]) + ' · ' + aiEuros(T.prix) + '</div>' +
    '<div class="aiTotG">' +
    '<div><small>🎁 Payé par les aides</small><b style="color:var(--accent-text);">' + aiEuros(T.aides) + '</b><small>à ne pas rembourser</small></div>' +
    '<div><small>🏦 Permis à 1 €</small><b>' + aiEuros(T.pret) + '</b><small>' + (T.pret ? 'il rembourse chaque mois' : 'aucun') + '</small></div>' +
    '<div><small>💳 Il paie</small><b>' + aiEuros(T.paie) + '</b><small>' + (T.paie ? 'ou en 2, 3, 4 fois (ALMA)' : 'rien') + '</small></div></div>' +
    (ab ? '<div style="font-size:12.5px;margin-top:8px;padding-top:7px;border-top:1px solid var(--line);">🧩 <b>Et si France Travail abonde son CPF</b> : jusqu’à ' + aiEuros(ab.montant) + ' de plus — en général, tout le devis.</div>' : '') +
    '<div style="font-size:11px;color:var(--muted);margin-top:7px;line-height:1.4;">Si tout est accordé. Ordre : CPF, Agefiph, Pass’Engagement, puis le permis à 1 € sur ce qui reste — jamais plus que le prix.</div>';
  z.appendChild(tot);
  const groupe = (t, l, ouvert) => {
    if(!l.length) return;
    z.appendChild(aiEl('div', 'aiSous', t + ' · ' + l.length));
    l.forEach(x => { const c = aiCarte(g, x); if(ouvert) c.open = false; z.appendChild(c); });
  };
  groupe('✅ Possibles', L.filter(x => x.etat === 'oui'));
  groupe('🟠 À voir', L.filter(x => x.etat === 'voir'));
  const non = L.filter(x => x.etat === 'non' || x.etat === 'fin');
  if(non.length){
    const dn = aiEl('details', '');
    dn.style.marginTop = '10px';
    dn.appendChild(aiEl('summary', 'aiSous', '— Pas possibles, ou qui n’existent plus · ' + non.length)).style.cssText = 'cursor:pointer;margin:0;';
    const dz = aiEl('div', ''); dz.style.marginTop = '7px';
    non.forEach(x => dz.appendChild(aiCarte(g, x)));
    dn.appendChild(dz);
    z.appendChild(dn);
  }
  const r = aiEl('div', 'aiBas');
  r.appendChild(aiBouton('📤 Lui envoyer ses aides', 'btn-primary', () => aiMail(g)));
  r.appendChild(aiBouton('🖨️ Imprimer', '', () => aiImprimer(g)));
  r.appendChild(aiBouton('💾 Garder dans sa fiche', '', () => aiGarder(g)));
  z.appendChild(r);
  return z;
}

/* ── Les gestes du résultat ───────────────────────────────────── */
async function aiAdresseDe(nom, connue){
  let adresse = connue || '';
  if(!adresse){
    try{ const d = await appelPrep({ action: 'contactEleve', eleve: nom }); adresse = ((d && d.contact) || {}).email || ''; }catch(e){}
  }
  return adresse;
}

async function aiMail(g){
  if(!g.eleve){ showToast('Indique l’élève pour retrouver son adresse.'); return; }
  const L = aiRegles(g);
  const T = aiTotaux(g, L);
  const ok = L.filter(x => x.etat === 'oui' && x.mail);
  const voir = L.filter(x => x.etat === 'voir');
  const prenom = g.eleve.split(' ')[0];
  const texte = 'Bonjour ' + prenom + ',\n\nVoici les aides possibles pour ta formation (' + aiEuros(T.prix) + ') :\n\n' +
    ok.map(x => x.emoji + ' ' + x.nom + (x.montant ? ' — ' + (x.type === 'pret' ? 'prêt de ' : 'jusqu’à ') + aiEuros(x.montant) : '') + '\n' + x.mail).join('\n\n') +
    (voir.length ? '\n\nÀ voir aussi : ' + voir.map(x => x.nom).join(', ') + '.' : '') +
    '\n\nLes aides ne sont pas automatiques : chacune a son dossier, et c’est l’organisme qui décide. Si tu n’y arrives pas, France Services t’aide gratuitement.\n\nL’équipe Évolution Conduites';
  const adresse = await aiAdresseDe(g.eleve, g.mail);
  const org = aiOrganisme(g.mlOrg);
  const copie = g.ml ? (g.presc || (org && org.mail) || '') : '';
  aiFenetreMail({ eleve: g.eleve, a: adresse, copie: copie, sujet: 'Les aides pour ton permis — Évolution Conduites', texte: texte, genre: 'aides' });
}

/* La fenêtre d'envoi : on relit, on corrige, on envoie (David) */
function aiFenetreMail(o){
  const fond = aiEl('div', 'overlay show');
  const m = aiEl('div', 'modal');
  m.style.cssText = 'max-width:min(640px,95vw);max-height:92vh;overflow-y:auto;';
  m.appendChild(aiEl('h3', '', o.titre || '📤 Lui envoyer ses aides'));
  m.appendChild(aiEl('label', '', 'À'));
  const ia = aiEl('input'); ia.type = 'email'; ia.value = o.a || ''; ia.placeholder = 'son adresse mail';
  m.appendChild(ia);
  let ic = null;
  if(o.copie){
    const l = aiEl('label', '');
    l.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:10px;';
    ic = aiEl('input'); ic.type = 'checkbox'; ic.checked = true; ic.style.cssText = 'width:auto;margin:0;';
    l.appendChild(ic); l.appendChild(document.createTextNode('Copie à son conseiller (' + o.copie + ')'));
    m.appendChild(l);
  }
  m.appendChild(aiEl('label', '', 'Objet'));
  const is = aiEl('input'); is.type = 'text'; is.value = o.sujet;
  m.appendChild(is);
  m.appendChild(aiEl('label', '', '✏️ Le message — relis-le et modifie-le avant d’envoyer'));
  const ta = aiEl('textarea', 'aiMsg'); ta.value = o.texte; ta.style.minHeight = '360px';
  m.appendChild(ta);
  const r = aiEl('div', 'btn-row');
  const bA = aiBouton('Annuler', 'btn-secondary', () => fermerFond(fond));
  const bE = aiBouton('✉️ Envoyer', 'btn-primary', async () => {
    const a = ia.value.trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)){ showToast('Son adresse mail ?'); ia.focus(); return; }
    const to = [a];
    if(ic && ic.checked && o.copie) to.push(o.copie);
    bE.disabled = true; bE.textContent = '…';
    try{
      await appelPrep({ action: 'mailBilan', genre: o.genre || 'aides', eleve: o.eleve, to: to, sujet: is.value.trim() || o.sujet, texte: ta.value });
      fermerFond(fond);
      showToast('Envoyé à ' + to.join(', ') + ' ✅');
      if(o.apres) o.apres();
    }catch(e){ bE.disabled = false; bE.textContent = '✉️ Envoyer'; showToast('Impossible : ' + e.message); }
  });
  r.appendChild(bA); r.appendChild(bE);
  m.appendChild(r);
  fond.appendChild(m);
  document.body.appendChild(fond);
}

function aiImprimer(g){
  const L = aiRegles(g), T = aiTotaux(g, L);
  const w = window.open('', '_blank');
  if(!w){ showToast('Le navigateur a bloqué l’onglet'); return; }
  const lignes = l => l.map(x => '<tr><td>' + aiEch(x.emoji + ' ' + x.nom) + '</td><td>' + (x.montant ? aiEch((x.type === 'pret' ? 'prêt ' : '') + aiEuros(x.montant)) : '') + '</td><td>' + aiEch(x.ligne) + '</td></tr>').join('');
  w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Aides — ' + aiEch(g.eleve || '') + '</title><style>' +
    'body{font-family:system-ui,sans-serif;margin:28px;color:#111;}h1{font-size:20px;}h2{font-size:15px;margin-top:22px;}' +
    'table{border-collapse:collapse;width:100%;font-size:13px;}td{border-bottom:1px solid #ccc;padding:6px;vertical-align:top;}' +
    '.t{display:flex;gap:30px;font-size:14px;margin:10px 0;}.t b{font-size:18px;display:block;}</style></head><body>' +
    '<h1>Les aides pour ' + aiEch(g.eleve || 'cet élève') + ' — ' + aiEuros(T.prix) + '</h1>' +
    '<div class="t"><div>Payé par les aides<b>' + aiEuros(T.aides) + '</b></div><div>Permis à 1 €<b>' + aiEuros(T.pret) + '</b></div><div>Il paie<b>' + aiEuros(T.paie) + '</b></div></div>' +
    '<h2>✅ Possibles</h2><table>' + lignes(L.filter(x => x.etat === 'oui')) + '</table>' +
    '<h2>🟠 À voir</h2><table>' + lignes(L.filter(x => x.etat === 'voir')) + '</table>' +
    '<p style="font-size:12px;color:#555;margin-top:24px;">Si tout est accordé. Évolution Conduites — le ' + aiFrDeIso(aiAujourdhui()) + '.</p>' +
    '<script>setTimeout(function(){print();},300);<\/script></body></html>');
  w.document.close();
}

async function aiGarder(g){
  if(!g.eleve){ showToast('Indique l’élève.'); return; }
  const L = aiRegles(g), T = aiTotaux(g, L);
  try{
    await appelPrep({ action: 'aidesDossierSet', eleve: g.eleve, type: 'resultat', etape: 'point', fini: true, donnees: {
      le: aiFrDeIso(aiAujourdhui()), entrees: { permis: g.permis, prix: T.prix, situation: g.situation, age: aiAge(g), cpf: g.cpf },
      totaux: T, lignes: L.filter(x => x.etat === 'oui' || x.etat === 'voir').map(x => ({ emoji: x.emoji, nom: x.nom, etat: x.etat, montant: x.montant, type: x.type })) } });
    showToast('Gardé dans sa fiche ✅');
    await aiCharger(true);
  }catch(e){ showToast('Impossible : ' + e.message); }
}

async function aiOuvrirAlma(g, montant){
  try{
    afficherOnglet('eleves'); afficherVue('eleves', 'paiement');
    if(typeof afficherPaiement === 'function') await afficherPaiement();
    setTimeout(() => {
      if($('pfMontant')){ $('pfMontant').value = String(Math.round(montant * 100) / 100); }
      if($('pfEleve') && g.eleve) $('pfEleve').value = g.eleve;
      if(typeof dessinerPaiement === 'function') dessinerPaiement();
    }, 200);
  }catch(e){ showToast('Impossible : ' + e.message); }
}

/* ============================================================
   LES DOSSIERS SUIVIS — CPF et Pass'Engagement
   ============================================================ */
async function aiCreerDossier(g, type, x){
  if(!g.eleve){ showToast('Indique l’élève d’abord.'); return; }
  const deja = ((AI.d && AI.d.dossiers) || []).find(d => d.type === type && !d.fini && aiNorm(d.eleve) === aiNorm(g.eleve));
  if(deja){ showToast('Il a déjà un dossier en cours ✅'); aiAllerAuDossier(deja.id); return; }
  const donnees = type === 'cpf'
    ? { formation: g.cpf, formationTitre: x.formation ? x.formation.titre : '', prix: x.prixFormation, lien: x.formation ? x.formation.lien : '',
        de: g.situation === 'de', montant: x.montant, mail: g.mail || '', envois: {} }
    : { montant: x.montant, dates: {} };
  try{
    const r = await appelPrep({ action: 'aidesDossierSet', eleve: g.eleve, type: type, etape: type === 'cpf' ? 'identite' : '', donnees: donnees });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    await aiCharger(true);
    aiDessinerDossiers();
    aiAllerAuDossier(r.dossier.id);
    showToast('Dossier ouvert ✅');
  }catch(e){ showToast('Impossible : ' + e.message); }
}
function aiAllerAuDossier(id){
  AI.dossierOuvert[id] = true;
  aiDessinerDossiers();
  setTimeout(() => { const el = document.querySelector('[data-aidossier="' + id + '"]'); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
}
async function aiEnregistrerDossier(x){
  const r = await appelPrep({ action: 'aidesDossierSet', id: x.id, eleve: x.eleve, type: x.type, etape: x.etape, donnees: x.donnees, fini: !!x.fini });
  if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
  const i = AI.d.dossiers.findIndex(d => d.id === x.id);
  if(i >= 0) AI.d.dossiers[i] = r.dossier;
  return r.dossier;
}

function aiDessinerDossiers(){
  const z = $('aidesDossiersZone');
  if(!z || !AI.d) return;
  z.innerHTML = '';
  const tous = (AI.d.dossiers || []).filter(d => d.type === 'cpf' || d.type === 'pe22');
  [['cpf', '🎓 Dossiers CPF'], ['pe22', '🤝 Pass’Engagement']].forEach(([type, titre]) => {
    const l = tous.filter(d => d.type === type);
    if(!l.length) return;
    const encours = l.filter(d => !d.fini), finis = l.filter(d => d.fini);
    z.appendChild(aiEl('div', 'aiSous', titre + ' · ' + encours.length + ' en cours'));
    encours.forEach(d => z.appendChild(type === 'cpf' ? aiCarteCpf(d) : aiCartePe(d)));
    if(finis.length){
      const det = aiEl('details', 'aiTiroir');
      det.appendChild(aiEl('summary', '', '✅ ' + finis.length + ' terminé(s)')).style.cssText = 'font-size:13px;color:var(--muted);font-weight:700;cursor:pointer;';
      const zf = aiEl('div', ''); zf.style.marginTop = '8px';
      finis.forEach(d => zf.appendChild(type === 'cpf' ? aiCarteCpf(d) : aiCartePe(d)));
      det.appendChild(zf);
      z.appendChild(det);
    }
  });
}

function aiFrise(etapes, ici, faits){
  const f = aiEl('div', 'aiFrise');
  const i = etapes.findIndex(e => e[0] === ici);
  etapes.forEach((e, k) => f.appendChild(aiEl('span', 'aiPas' + (faits ? (k <= i ? ' fait' : '') : (k < i ? ' fait' : k === i ? ' ici' : '')), (((faits && k <= i) || (!faits && k < i)) ? '✓ ' : '') + aiEch(e[1]))));
  return f;
}

/* Le message d'une étape CPF, avec ses valeurs */
function aiMessageCpf(x, cleMsg){
  const R = aiReglages(), v = ((R.aides || []).find(a => a.cle === 'cpf') || {}).valeurs || {};
  const d = x.donnees || {};
  const vals = Object.assign({}, v, {
    participation: aiEuros(Number(v.participation) || 0), formation: d.formationTitre || '', prix: d.prix ? aiEuros(d.prix) : '', lien: d.lien || '',
    dateEntree: d.dateEntree ? aiFrDeIso(d.dateEntree) : '…', datePermis: d.datePermis ? aiFrDeIso(d.datePermis) : '…' });
  return aiRemplir((R.messages || {})[cleMsg] || '', vals);
}
function aiCleMessageCpf(x){
  const d = x.donnees || {};
  if(x.etape === 'identite') return 'identite';
  if(x.etape === 'devis') return d.de ? 'devisDE' : 'devisClassique';
  if(x.etape === 'valider') return d.de ? 'validerDE' : 'validerClassique';
  if(x.etape === 'valide') return 'valide';
  if(x.etape === 'entree') return d.entree || 'entreeCode';
  return 'sortie';
}

function aiCarteCpf(x){
  const d = x.donnees || (x.donnees = {});
  d.envois = d.envois || {};
  const c = aiEl('div', 'aiDossier' + (x.fini ? '' : ' chaud'));
  c.setAttribute('data-aidossier', x.id);
  const i = AI_ETAPES_CPF.findIndex(e => e[0] === x.etape);
  const tete = aiEl('div', '');
  tete.style.cssText = 'display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;cursor:pointer;';
  tete.innerHTML = '<b style="font-size:15px;">🎓 ' + aiEch(x.eleve) + ' — CPF</b><span style="font-size:12.5px;color:var(--muted);">' +
    aiEch([d.formationTitre, d.prix ? aiEuros(d.prix) : '', d.montant ? 'CPF ' + aiEuros(d.montant) : '', d.de ? 'demandeur d’emploi' : 'classique'].filter(Boolean).join(' · ')) + '</span>' +
    '<span style="margin-left:auto;font-size:12px;font-weight:800;color:var(--accent-text);">' + aiEch(x.fini ? '✅ terminé' : (AI_ETAPES_CPF[i] || ['', ''])[1]) + '</span>';
  tete.addEventListener('click', () => { AI.dossierOuvert[x.id] = !AI.dossierOuvert[x.id]; aiDessinerDossiers(); });
  c.appendChild(tete);
  c.appendChild(aiFrise(AI_ETAPES_CPF, x.etape, x.fini));
  if(!AI.dossierOuvert[x.id]) return c;

  const env = d.envois[x.etape];
  c.appendChild(aiEl('div', 'aiAide', env ? '✉️ Message envoyé le ' + aiEch(env.le) + (env.par ? ' par ' + aiEch(env.par) : '') + (env.relances ? ' · ♻️ relancé ' + env.relances + ' fois' : '') + ' · ⏳ en attente de son action'
                                        : 'Le message de cette étape n’est pas encore parti.')).style.margin = '0 0 8px';

  /* L'entrée en formation : quatre messages, selon où il en est */
  if(x.etape === 'entree'){
    const ch = aiChoix('Où en est-il ?', AI_ENTREES, d.entree || 'entreeCode', async k => { d.entree = k; await aiSauver(x); });
    c.appendChild(ch);
    if((d.entree || '') === 'entreeProche'){
      const ld = aiEl('div', 'aiQ'); ld.appendChild(aiEl('label', '', 'La date de son permis'));
      const ip = aiEl('input'); ip.type = 'date'; ip.value = d.datePermis || ''; ip.addEventListener('change', async () => { d.datePermis = ip.value; await aiSauver(x); });
      ld.appendChild(ip); c.appendChild(ld);
    }
  }
  if(x.etape === 'valide'){
    const ld = aiEl('div', 'aiQ'); ld.appendChild(aiEl('label', '', '📆 Son entrée en formation le'));
    const ie = aiEl('input'); ie.type = 'date'; ie.value = d.dateEntree || ''; ie.addEventListener('change', async () => { d.dateEntree = ie.value; await aiSauver(x); });
    ld.appendChild(ie); c.appendChild(ld);
  }
  const cleMsg = aiCleMessageCpf(x);
  const ta = aiEl('textarea', 'aiMsg');
  ta.value = aiMessageCpf(x, cleMsg);
  c.appendChild(aiEl('div', 'aiSous', 'Le message — ' + aiEch(AI_NOMS_MESSAGES[cleMsg] || '')));
  c.appendChild(ta);

  const r = aiEl('div', 'aiBas');
  r.appendChild(aiBouton('✉️ Envoyer', 'btn-primary', () => aiEnvoyerMessageCpf(x, ta.value, false)));
  r.appendChild(aiBouton('📋 Copier', '', async () => { try{ await navigator.clipboard.writeText(ta.value); showToast('Copié ✅'); }catch(e){ showToast('Copie impossible'); } }));
  if(['identite', 'devis', 'valider'].includes(x.etape)) r.appendChild(aiBouton('♻️ Relancer (UP)', '', () => aiEnvoyerMessageCpf(x, aiMessageCpf(x, 'relance'), true)));
  const suiv = AI_ETAPES_CPF[i + 1];
  if(suiv) r.appendChild(aiBouton('➡️ ' + suiv[1], '', () => aiEtapeCpf(x, suiv[0])));
  else if(!x.fini) r.appendChild(aiBouton('✅ Dossier terminé', '', async () => { x.fini = true; await aiSauver(x); }));
  if(i > 0) r.appendChild(aiBouton('↩️', '', () => aiEtapeCpf(x, AI_ETAPES_CPF[i - 1][0])));
  const lien = aiEl('a', 'btn btn-secondary aiBtn', '🔎 Suivi EDOF (Drivup)');
  lien.href = AI_LIEN_DRIVUP_EDOF; lien.target = '_blank'; lien.rel = 'noopener';
  lien.style.textDecoration = 'none';
  r.appendChild(lien);
  r.appendChild(aiBouton('🗑️', '', async () => {
    if(!await confirmer('Supprimer le dossier CPF de ' + x.eleve + ' ?', 'Dossier CPF', true)) return;
    try{ await appelPrep({ action: 'aidesDossierDelete', id: x.id }); await aiCharger(true); aiDessinerDossiers(); }catch(e){ showToast('Impossible : ' + e.message); }
  }));
  c.appendChild(r);
  return c;
}
async function aiSauver(x){
  try{ await aiEnregistrerDossier(x); }catch(e){ showToast('Impossible : ' + e.message); }
  aiDessinerDossiers();
}
async function aiEtapeCpf(x, etape){
  const d = x.donnees;
  if(etape === 'valide' && !d.dateEntree){
    const v = ((aiReglages().aides || []).find(a => a.cle === 'cpf') || {}).valeurs || {};
    d.dateEntree = aiPlusJours(aiAujourdhui(), Number(d.de ? v.delaiDE : v.delaiClassique) || 14);
  }
  x.etape = etape;
  await aiSauver(x);
}
async function aiEnvoyerMessageCpf(x, texte, relance){
  const adresse = await aiAdresseDe(x.eleve, (x.donnees || {}).mail);
  aiFenetreMail({ titre: relance ? '♻️ Relancer ' + x.eleve : '✉️ ' + (AI_ETAPES_CPF.find(e => e[0] === x.etape) || ['', 'CPF'])[1], eleve: x.eleve, a: adresse,
    sujet: 'Ton dossier CPF — Évolution Conduites', texte: texte, genre: 'cpf',
    apres: async () => {
      const d = x.donnees;
      d.envois = d.envois || {};
      const e = d.envois[x.etape] || {};
      if(relance){ e.relances = (e.relances || 0) + 1; e.relanceLe = aiFrDeIso(aiAujourdhui()); }
      else { e.le = aiFrDeIso(aiAujourdhui()); e.par = aiMoi(); }
      d.envois[x.etape] = e;
      await aiSauver(x);
    } });
}

function aiCartePe(x){
  const d = x.donnees || (x.donnees = {});
  d.dates = d.dates || {};
  const v = ((aiReglages().aides || []).find(a => a.cle === 'pe22') || {}).valeurs || {};
  const c = aiEl('div', 'aiDossier' + (x.fini ? '' : ' chaud'));
  c.setAttribute('data-aidossier', x.id);
  const i = AI_ETAPES_PE.findIndex(e => e[0] === x.etape);
  const tete = aiEl('div', '');
  tete.style.cssText = 'display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;';
  tete.innerHTML = '<b style="font-size:15px;">🤝 ' + aiEch(x.eleve) + ' — Pass’Engagement</b><span style="font-size:12.5px;color:var(--muted);">' +
    aiEch((v.cheques || 2) + ' chèques de ' + (v.cheque || 600) + ' €') + '</span>';
  c.appendChild(tete);
  c.appendChild(aiFrise(AI_ETAPES_PE, x.etape, true));
  const dit = AI_ETAPES_PE.filter(e => d.dates[e[0]]).map(e => e[1] + ' le ' + d.dates[e[0]]).join(' · ');
  if(dit) c.appendChild(aiEl('div', 'aiAide', aiEch(dit))).style.margin = '0 0 8px';
  const prochaine = AI_ETAPES_PE[i + 1];
  const conseils = {
    attestation: '⛔ Rien ne se débloque sans le document qui atteste son Pass’Engagement.',
    code: '🔓 Quand l’attestation est là : on débloque une partie de ses leçons — en général le code.',
    cheque1: '💶 Après sa première action d’engagement, il reçoit un premier chèque de ' + (v.cheque || 600) + ' € et nous le remet.',
    suite: '🔓 Le premier chèque reçu : on débloque la suite de ses leçons.',
    cheque2: '💶 Au bout d’un an : le deuxième chèque de ' + (v.cheque || 600) + ' €.' };
  if(prochaine && !x.fini) c.appendChild(aiEl('div', '', aiEch(conseils[prochaine[0]]))).style.cssText = 'font-size:13px;line-height:1.5;margin:4px 0 8px;';
  const r = aiEl('div', 'aiBas');
  if(prochaine && !x.fini){
    r.appendChild(aiBouton('✓ ' + prochaine[1], 'btn-primary', async () => {
      d.dates[prochaine[0]] = aiFrDeIso(aiAujourdhui());
      x.etape = prochaine[0];
      if(!AI_ETAPES_PE[AI_ETAPES_PE.findIndex(e => e[0] === prochaine[0]) + 1]) x.fini = true;
      await aiSauver(x);
    }));
  }
  if(i >= 0) r.appendChild(aiBouton('↩️', '', async () => { delete d.dates[x.etape]; x.etape = i > 0 ? AI_ETAPES_PE[i - 1][0] : ''; x.fini = false; await aiSauver(x); }));
  r.appendChild(aiBouton('🗑️', '', async () => {
    if(!await confirmer('Supprimer le suivi Pass’Engagement de ' + x.eleve + ' ?', 'Pass’Engagement', true)) return;
    try{ await appelPrep({ action: 'aidesDossierDelete', id: x.id }); await aiCharger(true); aiDessinerDossiers(); }catch(e){ showToast('Impossible : ' + e.message); }
  }));
  c.appendChild(r);
  return c;
}

/* ============================================================
   ⚙️ LES AIDES — le tableau de ce qui existe (administrateurs)
   ============================================================ */
function aiPanneauReglages(){
  const R = AI.regl;
  const ecrit = !!(AI.d && AI.d.modifiable);
  const t = aiEl('div', 'aiTiroir');
  const h = aiEl('div', '');
  h.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap;';
  h.appendChild(aiEl('b', '', '⚙️ Les aides — ce qui existe')).style.cssText = 'font-size:15px;flex:1;';
  h.appendChild(aiEl('span', 'aiAide', ecrit ? (AI.d.majLe ? 'modifié le ' + aiEch(AI.d.majLe) + (AI.d.majPar ? ' par ' + aiEch(AI.d.majPar) : '') : 'administrateurs') : 'lecture seule — les administrateurs le modifient')).style.margin = '0';
  h.appendChild(aiBouton('← Retour', '', async () => {
    if(AI.sale && !await confirmer('Quitter sans enregistrer tes changements ?', '⚙️ Les aides', true)) return;
    AI.vue = 'gen'; AI.regl = null; AI.sale = false; aiDessiner();
  }));
  t.appendChild(h);
  const ong = aiEl('div', 'tdOnglets');
  [['aides', '🧾 Les aides'], ['cpf', '🎓 Formations CPF · ' + (R.catalogue || []).length], ['org', '🧭 Missions locales, communes'], ['msg', '✉️ Messages CPF']].forEach(([k, l]) => {
    const b = aiEl('button', 'btn tdOnglet' + (k === AI.onglet ? ' on' : ''), aiEch(l));
    b.type = 'button';
    b.addEventListener('click', () => { AI.onglet = k; AI.edite = ''; aiDessiner(); });
    ong.appendChild(b);
  });
  t.appendChild(ong);
  const sale = () => { AI.sale = true; const b = t.querySelector('.aiEnreg'); if(b) b.style.display = ''; };
  const corps = aiEl('div', '');
  if(AI.onglet === 'aides') aiOngletAides(corps, R, ecrit, sale);
  if(AI.onglet === 'cpf') aiOngletCpf(corps, R, ecrit, sale);
  if(AI.onglet === 'org') aiOngletOrg(corps, R, ecrit, sale);
  if(AI.onglet === 'msg') aiOngletMessages(corps, R, ecrit, sale);
  t.appendChild(corps);
  if(ecrit){
    const bar = aiEl('div', 'aiBas aiEnreg');
    bar.style.cssText = 'position:sticky;bottom:0;background:var(--navy-deep);padding:10px 0 4px;' + (AI.sale ? '' : 'display:none;');
    bar.appendChild(aiBouton('💾 Enregistrer le tableau', 'btn-primary', async (ev) => {
      const b = ev.currentTarget; b.disabled = true; b.textContent = '…';
      try{
        const r = await appelPrep({ action: 'aidesRegler', reglages: AI.regl });
        if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
        AI.d.reglages = r.reglages; AI.d.majLe = r.majLe; AI.d.majPar = r.majPar;
        AI.regl = JSON.parse(JSON.stringify(r.reglages)); AI.sale = false;
        showToast('Tableau des aides enregistré ✅');
        aiDessiner();
      }catch(e){ b.disabled = false; b.textContent = '💾 Enregistrer le tableau'; showToast('Impossible : ' + e.message); }
    }));
    t.appendChild(bar);
  }
  return t;
}

function aiChamp(lab, val, f, opts){
  const w = aiEl('div', '');
  w.style.minWidth = '0';
  w.appendChild(aiEl('label', '', aiEch(lab)));
  const i = (opts && opts.zone) ? aiEl('textarea') : aiEl('input');
  if(!(opts && opts.zone)) i.type = (opts && opts.type) || 'text';
  else i.style.cssText = 'width:100%;min-height:' + ((opts && opts.h) || 70) + 'px;font:inherit;font-size:13px;line-height:1.5;';
  i.value = val === undefined || val === null ? '' : String(val);
  if(opts && opts.lecture) i.disabled = true;
  i.addEventListener('input', () => f(i.value));
  w.appendChild(i);
  return w;
}

function aiOngletAides(z, R, ecrit, sale){
  z.appendChild(aiEl('div', 'aiAide', 'Ce que le générateur sait. Une loi change : on corrige ici, sans attendre une version. Une aide coupée ne s’affiche plus ; une aide ajoutée apparaît « à voir », avec ses conditions.')).style.margin = '4px 0 10px';
  const tb = aiEl('div', ''); tb.style.overflowX = 'auto';
  const table = aiEl('table', 'aiTable');
  table.innerHTML = '<tr><th></th><th>Aide</th><th>Âge</th><th>Montants</th><th>Conditions</th><th></th></tr>';
  (R.aides || []).forEach((a, k) => {
    const tr = aiEl('tr', '');
    if(!a.actif && !a.fin) tr.style.opacity = '.6';
    if(a.fin) tr.style.opacity = '.6';
    const td0 = aiEl('td', '');
    if(!a.fin){
      const t = aiEl('button', 'aiInter' + (a.actif ? ' on' : ''));
      t.type = 'button'; t.title = a.actif ? 'Couper cette aide' : 'Rallumer cette aide'; t.disabled = !ecrit;
      t.addEventListener('click', () => { a.actif = !a.actif; sale(); AI.sale = true; aiDessiner(); });
      td0.appendChild(t);
    }
    tr.appendChild(td0);
    const vals = Object.keys(a.valeurs || {}).map(cle => (AI_LIBELLES_VALEURS[cle] || cle).replace(/ \(.*\)$/, '') + ' ' + (Array.isArray(a.valeurs[cle]) ? a.valeurs[cle].join(' / ') : a.valeurs[cle])).join(' · ');
    tr.appendChild(aiEl('td', '', '<b>' + aiEch((a.emoji || '') + ' ' + a.nom) + '</b>'));
    tr.appendChild(aiEl('td', '', a.ageMin !== undefined || a.ageMax !== undefined ? aiEch((a.ageMin !== undefined ? a.ageMin : '?') + ' – ' + (a.ageMax !== undefined ? a.ageMax : '?')) : '—')).style.whiteSpace = 'nowrap';
    tr.appendChild(aiEl('td', '', aiEch(a.fin ? '—' : (vals || '—'))));
    tr.appendChild(aiEl('td', '', aiEch(a.fin || aiRemplir(a.conditions, a.valeurs) || ''))).style.color = 'var(--muted)';
    const td5 = aiEl('td', '');
    const be = aiBouton(AI.edite === a.cle ? '▲' : '✏️', '', () => { AI.edite = AI.edite === a.cle ? '' : a.cle; aiDessiner(); });
    td5.appendChild(be);
    tr.appendChild(td5);
    table.appendChild(tr);
    if(AI.edite === a.cle){
      const tr2 = aiEl('tr', ''); const td = aiEl('td', ''); td.colSpan = 6;
      td.appendChild(aiEditeurAide(a, k, R, ecrit, sale));
      tr2.appendChild(td); table.appendChild(tr2);
    }
  });
  tb.appendChild(table);
  z.appendChild(tb);
  if(ecrit) z.appendChild(aiBouton('➕ Ajouter une aide', '', () => {
    const a = { cle: 'a' + Date.now(), emoji: '💡', nom: 'Nouvelle aide', actif: true, valeurs: {}, conditions: '', marche: '', mail: '', verifieLe: aiFrDeIso(aiAujourdhui()) };
    R.aides.push(a); AI.edite = a.cle; AI.sale = true; aiDessiner();
  })).style.marginTop = '10px';
}

function aiEditeurAide(a, k, R, ecrit, sale){
  const ed = aiEl('div', '');
  ed.style.cssText = 'border:1px solid var(--accent-text);border-radius:12px;padding:10px 12px;margin:4px 0 8px;';
  const lec = { lecture: !ecrit };
  const g = aiEl('div', '');
  g.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:0 10px;';
  g.appendChild(aiChamp('Émoji', a.emoji, v => { a.emoji = v; sale(); }, lec));
  g.appendChild(aiChamp('Nom', a.nom, v => { a.nom = v; sale(); }, lec));
  if(!a.fin){
    g.appendChild(aiChamp('Âge mini', a.ageMin, v => { if(v === '') delete a.ageMin; else a.ageMin = Number(v); sale(); }, Object.assign({ type: 'number' }, lec)));
    g.appendChild(aiChamp('Âge maxi', a.ageMax, v => { if(v === '') delete a.ageMax; else a.ageMax = Number(v); sale(); }, Object.assign({ type: 'number' }, lec)));
    Object.keys(a.valeurs || {}).forEach(cle => {
      const arr = Array.isArray(a.valeurs[cle]);
      g.appendChild(aiChamp(AI_LIBELLES_VALEURS[cle] || cle, arr ? a.valeurs[cle].join(', ') : a.valeurs[cle],
        v => { a.valeurs[cle] = arr ? v.split(/[,;\s]+/).map(Number).filter(n => n > 0) : Number(String(v).replace(',', '.')) || 0; sale(); }, lec));
    });
  }
  g.appendChild(aiChamp('Vérifié le', a.verifieLe, v => { a.verifieLe = v; sale(); }, lec));
  ed.appendChild(g);
  if(a.fin){
    ed.appendChild(aiChamp('Ce qui est affiché (elle n’existe plus)', a.fin, v => { a.fin = v; sale(); }, Object.assign({ zone: true, h: 50 }, lec)));
  }else{
    ed.appendChild(aiChamp('Conditions (affichées)', a.conditions, v => { a.conditions = v; sale(); }, Object.assign({ zone: true, h: 50 }, lec)));
    ed.appendChild(aiChamp('Comment ça marche (une étape par ligne)', a.marche, v => { a.marche = v; sale(); }, Object.assign({ zone: true, h: 90 }, lec)));
    ed.appendChild(aiChamp('Ce que dit le mail à l’élève', a.mail, v => { a.mail = v; sale(); }, Object.assign({ zone: true, h: 60 }, lec)));
    if(Object.keys(a.valeurs || {}).length) ed.appendChild(aiEl('div', 'aiAide', 'Dans les textes, ' + Object.keys(a.valeurs).map(x => '{' + x + '}').join(' ') + (a.cle === 'cpf' ? ' {formation} {prix} {lien}' : '') + ' se remplacent par leur valeur.'));
  }
  if(ecrit){
    const r = aiEl('div', 'aiBas');
    if(!a.fin) r.appendChild(aiBouton('🪦 Elle n’existe plus', '', () => { a.fin = 'Supprimée depuis le ' + aiFrDeIso(aiAujourdhui()) + '.'; a.actif = false; a.emoji = '🪦'; sale(); aiDessiner(); }));
    r.appendChild(aiBouton('🗑️ Retirer du tableau', '', async () => {
      if(!await confirmer('Retirer « ' + a.nom + ' » du tableau ?', '⚙️ Les aides', true)) return;
      R.aides.splice(k, 1); AI.edite = ''; AI.sale = true; aiDessiner();
    }));
    ed.appendChild(r);
  }
  return ed;
}

function aiOngletCpf(z, R, ecrit, sale){
  z.appendChild(aiEl('div', 'aiAide', 'Tes formations en ligne sur Mon compte formation (EDOF). Leur prix vient de 💰 Tarifs (une fiche, ou une prestation × une quantité) et suit tes changements. Le prix écrit sur EDOF, lui, se change sur EDOF : ⚠️ prévient quand les deux diffèrent.')).style.margin = '4px 0 10px';
  const tb = aiEl('div', ''); tb.style.overflowX = 'auto';
  const table = aiEl('table', 'aiTable');
  table.innerHTML = '<tr><th>Permis</th><th>Formation sur EDOF</th><th>Prix (💰 Tarifs)</th><th>Sur EDOF</th><th></th></tr>';
  (R.catalogue || []).forEach((x, k) => {
    const p = aiPrixFormation(x);
    const tr = aiEl('tr', '');
    tr.appendChild(aiEl('td', '', '<b>' + aiEch(x.cat) + '</b>'));
    tr.appendChild(aiEl('td', '', aiEch(x.titre) + (x.lien ? ' <a href="' + aiEch(x.lien) + '" target="_blank" rel="noopener" style="text-decoration:none;">🔗</a>' : ' <span style="color:var(--warn-text);">· sans lien</span>')));
    const src = p.source === 'tarifs' ? '' : p.source === 'main' ? ' <span style="color:var(--muted);font-size:11.5px;">✍️ à la main</span>' : p.source === 'perdu' ? ' <span style="color:var(--warn-text);font-size:11.5px;">⚠️ « ' + aiEch(p.manque) + ' » n’est plus dans 💰 Tarifs</span>' : '';
    tr.appendChild(aiEl('td', '', (p.prix !== null ? aiEuros(p.prix) : '—') + src)).style.whiteSpace = 'nowrap';
    const ecart = (p.prix !== null && x.prixEdof !== null && x.prixEdof !== undefined && Math.abs(p.prix - Number(x.prixEdof)) > 0.009);
    tr.appendChild(aiEl('td', '', (x.prixEdof !== null && x.prixEdof !== undefined ? aiEuros(x.prixEdof) : '—') + (ecart ? ' <span style="color:var(--warn-text);" title="💰 Tarifs dit autre chose : à corriger sur EDOF">⚠️</span>' : ''))).style.whiteSpace = 'nowrap';
    const td = aiEl('td', '');
    td.appendChild(aiBouton(AI.edite === x.id ? '▲' : '✏️', '', () => { AI.edite = AI.edite === x.id ? '' : x.id; aiDessiner(); }));
    tr.appendChild(td);
    table.appendChild(tr);
    if(AI.edite === x.id){
      const tr2 = aiEl('tr', ''); const td2 = aiEl('td', ''); td2.colSpan = 5;
      td2.appendChild(aiEditeurFormation(x, k, R, ecrit, sale));
      tr2.appendChild(td2); table.appendChild(tr2);
    }
  });
  tb.appendChild(table);
  z.appendChild(tb);
  if(ecrit) z.appendChild(aiBouton('➕ Ajouter une formation', '', () => {
    const x = { id: 'f' + Date.now(), cat: 'B', titre: 'Nouvelle formation', lien: '', compo: [], prixMain: null, prixEdof: null };
    R.catalogue.push(x); AI.edite = x.id; AI.sale = true; aiDessiner();
  })).style.marginTop = '10px';
}

function aiEditeurFormation(x, k, R, ecrit, sale){
  const ed = aiEl('div', '');
  ed.style.cssText = 'border:1px solid var(--accent-text);border-radius:12px;padding:10px 12px;margin:4px 0 8px;';
  const lec = { lecture: !ecrit };
  const g = aiEl('div', '');
  g.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr));gap:0 10px;';
  const wc = aiEl('div', ''); wc.appendChild(aiEl('label', '', 'Permis'));
  const sc = aiEl('select'); sc.disabled = !ecrit;
  sc.innerHTML = ['B', 'BEA', 'Code', 'BE', 'A2'].map(c => '<option' + (c === x.cat ? ' selected' : '') + '>' + c + '</option>').join('');
  sc.addEventListener('change', () => { x.cat = sc.value; sale(); });
  wc.appendChild(sc); g.appendChild(wc);
  g.appendChild(aiChamp('Prix sur EDOF (€)', x.prixEdof, v => { x.prixEdof = v === '' ? null : Number(String(v).replace(',', '.')); sale(); }, lec));
  ed.appendChild(g);
  ed.appendChild(aiChamp('Titre (comme sur EDOF)', x.titre, v => { x.titre = v; sale(); }, lec));
  ed.appendChild(aiChamp('Lien Mon compte formation', x.lien, v => { x.lien = v.trim(); sale(); }, lec));
  ed.appendChild(aiEl('div', 'aiSous', 'De quoi son prix est fait (💰 Tarifs)'));
  const fo = aiForfaits();
  const pres = AI.tf ? (AI.tf.prestations || []) : [];
  (x.compo || []).forEach((l, i) => {
    const r = aiEl('div', '');
    r.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;';
    const s = aiEl('select'); s.style.cssText = 'margin:0;flex:1;min-width:200px;'; s.disabled = !ecrit;
    s.innerHTML = '<optgroup label="Fiches (forfaits)">' + fo.map(f => '<option value="f:' + aiEch(f.id) + '"' + (l.f === f.id ? ' selected' : '') + '>' + aiEch(f.titre) + ' — ' + aiEuros(f.prix) + '</option>').join('') + '</optgroup>' +
      '<optgroup label="Prestations">' + pres.map(p => '<option value="p:' + aiEch(p.id) + '"' + (l.p === p.id ? ' selected' : '') + '>' + aiEch(p.nom) + '</option>').join('') + '</optgroup>';
    if(l.f && !fo.some(f => f.id === l.f)) s.innerHTML = '<option selected>⚠️ ' + aiEch(l.f) + ' (introuvable)</option>' + s.innerHTML;
    s.addEventListener('change', () => { const [t, id] = s.value.split(/:(.*)/); x.compo[i] = t === 'f' ? { f: id } : { p: id, q: l.q || 1, g: l.g || '' }; sale(); aiDessiner(); });
    r.appendChild(s);
    if(!l.f){
      const q = aiEl('input'); q.type = 'number'; q.step = '0.5'; q.value = l.q; q.style.cssText = 'width:80px;margin:0;'; q.disabled = !ecrit; q.title = 'Quantité';
      q.addEventListener('input', () => { l.q = Number(q.value) || 0; sale(); });
      r.appendChild(q);
      const gg = aiEl('select'); gg.style.cssText = 'width:auto;margin:0;'; gg.disabled = !ecrit;
      gg.innerHTML = [['', '—'], ['BV', 'BV'], ['BEA', 'BEA']].map(([v, t]) => '<option value="' + v + '"' + ((l.g || '') === v ? ' selected' : '') + '>' + t + '</option>').join('');
      gg.addEventListener('change', () => { l.g = gg.value; sale(); });
      r.appendChild(gg);
    }
    if(ecrit) r.appendChild(aiBouton('✕', '', () => { x.compo.splice(i, 1); sale(); aiDessiner(); }));
    ed.appendChild(r);
  });
  if(!(x.compo || []).length) ed.appendChild(aiChamp('Prix écrit à la main (€) — tant qu’il n’est pas relié à 💰 Tarifs', x.prixMain, v => { x.prixMain = v === '' ? null : Number(String(v).replace(',', '.')); sale(); }, lec));
  const p = aiPrixFormation(x);
  ed.appendChild(aiEl('div', 'aiAide', 'Prix calculé : <b>' + (p.prix !== null ? aiEuros(p.prix) : '—') + '</b>')).style.marginTop = '6px';
  if(ecrit){
    const r = aiEl('div', 'aiBas');
    r.appendChild(aiBouton('➕ Une fiche ou une prestation', '', () => { x.compo = x.compo || []; x.compo.push(fo[0] ? { f: fo[0].id } : { p: (pres[0] || {}).id, q: 1 }); sale(); aiDessiner(); }));
    r.appendChild(aiBouton('🗑️ Retirer la formation', '', async () => {
      if(!await confirmer('Retirer « ' + x.titre + ' » ?', '⚙️ Formations CPF', true)) return;
      R.catalogue.splice(k, 1); AI.edite = ''; AI.sale = true; aiDessiner();
    }));
    ed.appendChild(r);
  }
  return ed;
}

function aiOngletOrg(z, R, ecrit, sale){
  z.appendChild(aiEl('div', 'aiAide', 'Les organismes qui prescrivent ou aident : leur nom, leur contact, et le mail qui reçoit la copie. Une Mission locale se reconnaît au ✉️ mail du prescripteur de la fiche de l’élève.')).style.margin = '4px 0 10px';
  (R.organismes || []).forEach((o, k) => {
    const b = aiEl('div', 'aiDossier');
    const g = aiEl('div', '');
    g.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:0 10px;';
    const wt = aiEl('div', ''); wt.appendChild(aiEl('label', '', 'Type'));
    const st = aiEl('select'); st.disabled = !ecrit;
    st.innerHTML = '<option value="ml"' + (o.type === 'ml' ? ' selected' : '') + '>🧭 Mission locale</option><option value="commune"' + (o.type === 'commune' ? ' selected' : '') + '>🏘️ Commune</option>';
    st.addEventListener('change', () => { o.type = st.value; sale(); });
    wt.appendChild(st); g.appendChild(wt);
    const lec = { lecture: !ecrit };
    g.appendChild(aiChamp('Nom', o.nom, v => { o.nom = v; sale(); }, lec));
    g.appendChild(aiChamp('Pour (ville, bureau)', o.site, v => { o.site = v; sale(); }, lec));
    g.appendChild(aiChamp('Contact (conseiller)', o.contact, v => { o.contact = v; sale(); }, lec));
    g.appendChild(aiChamp('Mail', o.mail, v => { o.mail = v.trim(); sale(); }, Object.assign({ type: 'email' }, lec)));
    g.appendChild(aiChamp('Téléphone', o.tel, v => { o.tel = v; sale(); }, lec));
    b.appendChild(g);
    if(ecrit) b.appendChild(aiBouton('🗑️ Retirer', '', async () => {
      if(!await confirmer('Retirer « ' + (o.nom || 'cet organisme') + ' » ?', '⚙️ Organismes', true)) return;
      R.organismes.splice(k, 1); AI.sale = true; aiDessiner();
    }));
    z.appendChild(b);
  });
  if(ecrit) z.appendChild(aiBouton('➕ Ajouter un organisme', '', () => {
    R.organismes.push({ id: 'o' + Date.now(), type: 'ml', nom: '', site: '', contact: '', mail: '', tel: '' }); AI.sale = true; aiDessiner();
  }));
}

function aiOngletMessages(z, R, ecrit, sale){
  z.appendChild(aiEl('div', 'aiAide', 'Tes messages, un par étape du dossier CPF. {formation} {prix} {lien} {participation} {delaiClassique} {delaiDE} {dateEntree} {datePermis} se remplacent tout seuls. Le message reste modifiable avant chaque envoi.')).style.margin = '4px 0 10px';
  Object.keys(AI_NOMS_MESSAGES).forEach(k => {
    z.appendChild(aiChamp(AI_NOMS_MESSAGES[k], (R.messages || {})[k], v => { R.messages[k] = v; sale(); }, { zone: true, h: k === 'relance' ? 50 : 140, lecture: !ecrit }));
  });
}

/* ============================================================
   DANS LA FICHE DE L'ÉLÈVE — « 🧮 Ses aides possibles »
   ============================================================ */
async function ligneAidesFiche(nom, zone){
  if(!zone || (typeof aDroit === 'function' && !aDroit('financements'))) return;
  try{ await aiCharger(false); }catch(e){ return; }
  aiStyle();
  const g = aiGenerateurDeLEleve(nom);
  const L = aiRegles(g).filter(x => x.etat === 'oui' && x.type !== 'ecole');
  const garde = ((AI.d && AI.d.dossiers) || []).filter(d => d.type === 'resultat' && aiNorm(d.eleve) === aiNorm(nom)).slice(0, 1)[0];
  const suivis = ((AI.d && AI.d.dossiers) || []).filter(d => (d.type === 'cpf' || d.type === 'pe22') && aiNorm(d.eleve) === aiNorm(nom));
  const d = aiEl('details', '');
  d.style.cssText = 'border:1px solid var(--line);border-radius:11px;padding:9px 12px;margin-top:8px;';
  d.appendChild(aiEl('summary', '', '🧮 Ses aides possibles : ' + L.length)).style.cssText = 'cursor:pointer;font-size:13px;font-weight:700;color:var(--accent-text);';
  const c = aiEl('div', '');
  c.style.cssText = 'margin-top:8px;font-size:12.5px;line-height:1.7;';
  c.innerHTML = L.map(x => '<div style="display:flex;gap:8px;"><span>' + aiEch(x.emoji) + '</span><span style="flex:1;min-width:0;">' + aiEch(x.nom) +
    (x.montant ? ' · <b>' + (x.type === 'pret' ? 'prêt ' : '') + aiEuros(x.montant) + '</b>' : '') + '</span></div>').join('') +
    '<div style="color:var(--muted);font-size:11.5px;margin-top:4px;">' + aiEch([aiAge(g) !== null ? aiAge(g) + ' ans' : 'âge inconnu', g.formation || 'formation ?', g.ml ? 'Mission locale' : '', 'sa situation est à demander'].filter(Boolean).join(' · ')) + ' — <u>à vérifier avec lui</u></div>' +
    (suivis.length ? '<div style="font-size:11.5px;margin-top:4px;">' + suivis.map(s => (s.type === 'cpf' ? '🎓 CPF : ' + aiEch((AI_ETAPES_CPF.find(e => e[0] === s.etape) || ['', ''])[1]) : '🤝 Pass’Engagement : ' + aiEch((AI_ETAPES_PE.find(e => e[0] === s.etape) || ['', 'attestation attendue'])[1])) + (s.fini ? ' ✅' : '')).join('<br>') + '</div>' : '') +
    (garde ? '<div style="color:var(--muted);font-size:11.5px;margin-top:4px;">💾 Dernier point gardé le ' + aiEch((garde.donnees || {}).le || garde.creeLe) + (garde.par ? ' par ' + aiEch(garde.par) : '') + '</div>' : '');
  d.appendChild(c);
  const r = aiEl('div', '');
  r.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;';
  r.appendChild(aiBouton('🧮 Voir le détail', '', () => aiFenetreGenerateur(g)));
  r.appendChild(aiBouton('📤 Lui envoyer ses aides', '', () => aiMail(g)));
  d.appendChild(r);
  zone.appendChild(d);
}

/* Le générateur dans une fenêtre, par-dessus la fiche (on ne la ferme
   pas : ce qu'on y tapait serait perdu) */
function aiFenetreGenerateur(g){
  const fond = aiEl('div', 'overlay show');
  const m = aiEl('div', 'modal');
  m.style.cssText = 'max-width:min(960px,96vw);max-height:92vh;overflow-y:auto;';
  const h = aiEl('div', '');
  h.style.cssText = 'display:flex;gap:8px;align-items:center;';
  h.appendChild(aiEl('h3', '', '🧮 Les aides de ' + aiEch(g.eleve))).style.cssText = 'flex:1;margin:0;';
  h.appendChild(aiBouton('✕', '', () => fermerFond(fond)));
  m.appendChild(h);
  m.appendChild(aiGenerateur(g, {}));
  fond.appendChild(m);
  document.body.appendChild(fond);
}

/* ============================================================
   🔔 LE BANDEAU — famille « aides »
   ============================================================ */
function lignesAidesBandeau(){
  if(!AI.d || (typeof aDroit === 'function' && !aDroit('financements'))) return [];
  const out = [];
  const auj = aiAujourdhui();
  (AI.d.dossiers || []).filter(d => !d.fini).forEach(x => {
    const d = x.donnees || {};
    if(x.type === 'cpf'){
      if(x.etape === 'valide' && d.dateEntree && d.dateEntree <= auj){
        out.push({ id: 'aides:entree:' + x.id, famille: 'aides', emoji: '🎓', surLaPersonne: x.eleve,
          texte: x.eleve + ' — faire son entrée en formation CPF', sous: 'Prévue le ' + aiFrDeIso(d.dateEntree), urgente: true, groupe: 'auj',
          action: () => aiAllerDepuisLeBandeau(x.id), actionTexte: 'Ouvrir' });
      }
      const e = (d.envois || {})[x.etape];
      const j = e ? aiJoursDepuis(e.relanceLe || e.le) : null;
      if(['identite', 'devis', 'valider'].includes(x.etape) && j !== null && j >= 5){
        out.push({ id: 'aides:relance:' + x.id + ':' + x.etape, famille: 'aides', emoji: '♻️', surLaPersonne: x.eleve,
          texte: x.eleve + ' — CPF sans nouvelles depuis ' + j + ' jours', sous: (AI_ETAPES_CPF.find(k => k[0] === x.etape) || ['', ''])[1], groupe: 'auj',
          action: () => aiAllerDepuisLeBandeau(x.id), actionTexte: 'Relancer' });
      }
    }
    if(x.type === 'pe22'){
      const dt = d.dates || {};
      if(x.etape === 'cheque1'){
        out.push({ id: 'aides:suite:' + x.id, famille: 'aides', emoji: '🤝', surLaPersonne: x.eleve,
          texte: x.eleve + ' — 1er chèque Pass’Engagement reçu : débloquer la suite de ses leçons', sous: 'Reçu le ' + (dt.cheque1 || ''), groupe: 'auj',
          action: () => aiAllerDepuisLeBandeau(x.id), actionTexte: 'Ouvrir' });
      }
      const j = dt.attestation ? aiJoursDepuis(dt.attestation) : null;
      if(x.etape === 'suite' && j !== null && j >= 365){
        out.push({ id: 'aides:cheque2:' + x.id, famille: 'aides', emoji: '💶', surLaPersonne: x.eleve,
          texte: x.eleve + ' — 2e chèque Pass’Engagement attendu (un an)', sous: 'Attestation du ' + dt.attestation, groupe: 'auj',
          action: () => aiAllerDepuisLeBandeau(x.id), actionTexte: 'Ouvrir' });
      }
    }
  });
  return out;
}
function aiAllerDepuisLeBandeau(id){
  try{ afficherOnglet('eleves'); afficherVue('eleves', 'financements'); }catch(e){}
  setTimeout(() => aiAllerAuDossier(id), 600);
}
/* Au démarrage, puis toutes les 30 minutes : le bandeau a besoin des dossiers */
(function(){
  let n = 0;
  const essayer = () => {
    if(typeof ACCES !== 'undefined' && ACCES && ACCES.code && typeof aDroit === 'function'){
      if(aDroit('financements')) aiCharger(false).then(() => { if(typeof dessinerBandeau === 'function') try{ dessinerBandeau(); }catch(e){} }).catch(() => {});
      return;
    }
    if(++n < 240) setTimeout(essayer, 1000);
  };
  setTimeout(essayer, 5000);
  setInterval(() => { if(typeof ACCES !== 'undefined' && ACCES && ACCES.code && typeof aDroit === 'function' && aDroit('financements')) aiCharger(true).then(() => { if(typeof dessinerBandeau === 'function') try{ dessinerBandeau(); }catch(e){} }).catch(() => {}); }, 30 * 60000);
})();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-aides.js'] = true;
