/* Déployé le 27/10/2026 à 16:17 — v1280 */
/* ============================================================
   ec-formations.js — 💼 LES FORMATIONS ENTREPRISE (v1280)
   Outils › Entreprises › 💼 Formations

   David, le 27 octobre 2026 : un générateur de formation entreprise
   « que je puisse remplir directement depuis l'app », qui envoie les
   conventions par mail et suit le financement — « un vrai outil de
   suivi ». Puis : le prix pris dans 💰 Tarifs (prestations, packs)
   ou écrit à la main, et le financement direct, sans OPCO.

   Livraison 1 (celle-ci) : les dossiers, le suivi en 9 étapes (7 sans
   OPCO), le prix, les documents PDF et leur envoi.
   Livraison 2 : les signatures sur téléphone (moniteurs, entreprise).
   Livraison 3 : Drivup, questionnaires, rapports, alertes du bureau.

   ⚠️ LE DOSSIER S'ENREGISTRE TOUT SEUL. Chaque champ modifié part au
   Worker 0,8 s après la dernière frappe ; changer d'onglet ou de
   dossier envoie ce qui attend. Il n'y a pas de bouton « Enregistrer »
   à oublier.
   ============================================================ */

const FE = { d: null, vue: 'liste', id: '', onglet: 'res', filtre: 'cours', tf: null, journal: {}, minuterie: 0, attente: null, journalAttente: '' };

const FE_OPCOS = ['AFDAS', 'AKTO', 'ATLAS', 'Constructys', 'OCAPIAT', 'OPCO 2i', 'OPCO Commerce', 'OPCO EP', 'OPCO Mobilités', 'OPCO Santé', 'Uniformation'];
const FE_ETAPES = [['demande', 'Demande'], ['devis', 'Devis'], ['convention', 'Convention'], ['depot', 'Demande OPCO'], ['accord', 'Accord OPCO'],
                   ['formation', 'Formation'], ['attestations', 'Attestations'], ['facture', 'Facture'], ['paye', 'Payé']];

/* ---------- petits outils ---------- */
function feEl(tag, cls, texte){ const e = document.createElement(tag); if(cls) e.className = cls; if(texte != null) e.textContent = texte; return e; }
function feEsc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
function feBouton(texte, cls, quoi, titre){
  const c = String(cls || '');
  const b = feEl('button', 'btn ' + (/btn-primary|feBtnX|feBtnLien|feResultat/.test(c) ? '' : 'btn-secondary ') + c + ' feBtn', texte);
  b.type = 'button';
  if(titre) b.title = titre;
  if(quoi) b.addEventListener('click', ev => { ev.stopPropagation(); quoi(ev, b); });
  return b;
}
function fePuce(texte, on, quoi){ const b = feEl('button', 'btn fePuce' + (on ? ' on' : ''), texte); b.type = 'button'; if(quoi) b.addEventListener('click', () => quoi(b)); return b; }
function feSous(texte){ return feEl('div', 'feSous', texte); }
function feAide(texte){ const d = feEl('div', 'feAide'); d.innerHTML = texte; return d; }
function feToast(t){ if(typeof showToast === 'function') showToast(t); }
function feNorm(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function feCourant(){ return FE.d && (FE.d.formations || []).find(x => x.id === FE.id) || null; }
function feJours(iso){ if(!iso) return null; const a = new Date(feAujourdhui() + 'T12:00:00'), b = new Date(String(iso).slice(0, 10) + 'T12:00:00'); return Math.round((b - a) / 86400000); }
function feId(p){ return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function feEstOpco(d){ return d.financement !== 'direct'; }
function fePeutEcrire(){ return typeof niveauDroit !== 'function' || niveauDroit('formations') === 'm'; }

/* ---------- l'enregistrement ---------- */
function feModifie(journal){
  const x = feCourant();
  if(!x) return;
  FE.attente = x;
  if(journal) FE.journalAttente = journal;
  clearTimeout(FE.minuterie);
  FE.minuterie = setTimeout(feSauverMaintenant, 800);
  feEtat('…');
}
async function feSauverMaintenant(journal){
  clearTimeout(FE.minuterie); FE.minuterie = 0;
  const x = FE.attente || (journal ? feCourant() : null);
  const j = journal || FE.journalAttente || '';
  FE.attente = null; FE.journalAttente = '';
  if(!x) return true;
  try{
    const r = await appelPrep({ action: 'formationPoser', id: x.id, donnees: x.donnees, journal: j });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Dossier non enregistré');
    x.majLe = r.formation.majLe; x.majPar = r.formation.majPar;
    if(j) delete FE.journal[x.id];
    feEtat('✓ enregistré');
    return true;
  }catch(e){
    feEtat('⚠️ non enregistré');
    feToast('⚠️ ' + ((e && e.message) || e));
    return false;
  }
}
function feEtat(t){ const e = $('feEtat'); if(e) e.textContent = t; }

/* ---------- le chargement ---------- */
async function afficherFormations(){
  const z = $('formationsZone');
  if(!z) return;
  if(!FE.d) z.innerHTML = '<div class="empty">Chargement…</div>';
  try{
    const r = await appelPrep({ action: 'formationsLire' });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Lecture impossible');
    if(FE.attente) r.formations = r.formations.map(x => x.id === FE.attente.id ? FE.attente : x);
    FE.d = r;
  }catch(e){
    z.innerHTML = '';
    z.appendChild(feEl('div', 'empty', '⚠️ ' + ((e && e.message) || e)));
    return;
  }
  if(FE.vue === 'dossier' && !feCourant()) FE.vue = 'liste';
  feDessiner();
}
async function feTarifs(){
  if(FE.tf) return FE.tf;
  try{ FE.tf = typeof tarifsDuCatalogue === 'function' ? await tarifsDuCatalogue() : null; }catch(e){ FE.tf = null; }
  return FE.tf;
}
function feDessiner(){
  const z = $('formationsZone');
  if(!z || !FE.d) return;
  const haut = window.scrollY;
  z.innerHTML = '';
  if(FE.vue === 'dossier' && feCourant()) feDessinerDossier(z, feCourant());
  else feDessinerListe(z);
  window.scrollTo(0, haut);
}

/* ============================================================
   LE SUIVI : les étapes, les alertes
   ============================================================ */
function feEtapes(d){
  const s = d.suivi || {}, f = d.formation || {};
  const fin = f.dateFin || f.dateDebut;
  const fait = {
    demande: true, devis: !!(s.devisEnvoye || s.conventionSignee), convention: !!s.conventionSignee,
    depot: !!s.opcoDepot, accord: !!(s.opcoAccord || s.opcoRefus), formation: !!(fin && fin < feAujourdhui()) || !!s.attestations,
    attestations: !!s.attestations, facture: !!s.facture, paye: !!s.paye
  };
  const liste = FE_ETAPES.filter(([k]) => feEstOpco(d) || (k !== 'depot' && k !== 'accord'));
  let rang = liste.findIndex(([k]) => !fait[k]);
  if(rang === -1) rang = liste.length;
  return { liste: liste, fait: fait, rang: rang };
}
function feFrise(d){
  const e = feEtapes(d);
  const w = feEl('div', 'feFrise');
  e.liste.forEach(([k, nom], i) => {
    const etat = e.fait[k] ? 'ok' : (i === e.rang ? 'ici' : 'non');
    const c = feEl('div', 'feEtape ' + etat);
    c.appendChild(feEl('i'));
    c.appendChild(feEl('span', '', (etat === 'ok' ? '✓ ' : '') + nom));
    w.appendChild(c);
  });
  const p = feEl('div', 'feFriseTel', e.rang < e.liste.length ? 'étape ' + (e.rang + 1) + ' / ' + e.liste.length + ' · ' : '');
  if(e.rang < e.liste.length) p.appendChild(feEl('b', '', e.liste[e.rang][1])); else p.appendChild(feEl('b', '', '✅ terminée et payée'));
  const tout = feEl('div'); tout.append(w, p);
  return tout;
}
function feEcheance(iso, txt){
  /* « 30 jours fin de mois » : la fin du mois de la facture + 30 jours */
  const m = String(iso || '').match(/^(\d{4})-(\d{2})/);
  if(!m) return '';
  const fdm = new Date(+m[1], +m[2], 0);
  if(/fin de mois/i.test(String(txt || ''))){ fdm.setDate(fdm.getDate() + 30); return feIso(fdm); }
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); d.setDate(d.getDate() + 30); return feIso(d);
}
function feAlertes(x){
  const d = x.donnees, s = d.suivi || {}, f = d.formation || {};
  const j = feJours(f.dateDebut), out = [];
  const opco = feEstOpco(d), e = feEtapes(d);
  if(opco && s.conventionSignee && !s.opcoDepot && j !== null && j >= 0 && j <= 21)
    out.push({ texte: 'Demande à l’OPCO pas encore déposée : la formation commence dans ' + j + ' jour' + (j > 1 ? 's' : '') + '.', bouton: '📞 Relancer l’entreprise', onglet: 'fin' });
  if(opco && s.opcoDepot && !s.opcoAccord && !s.opcoRefus && j !== null && j >= 0 && j <= 15)
    out.push({ texte: 'Pas d’accord de l’OPCO à ' + j + ' jour' + (j > 1 ? 's' : '') + ' du début. Sans accord, c’est l’entreprise qui paie.', bouton: '✏️ Noter l’accord', onglet: 'fin' });
  if(opco && s.opcoRefus && !s.paye)
    out.push({ texte: 'L’OPCO a refusé : l’entreprise paie tout, ou la formation est annulée.', bouton: '💶 Le financement', onglet: 'fin' });
  const dv = s.devisEnvoye ? -feJours(s.devisEnvoye) : null;
  if(s.devisEnvoye && !s.conventionSignee && dv >= 10)
    out.push({ texte: 'Devis sans réponse depuis ' + dv + ' jours.', bouton: '✉️ Relancer', onglet: 'doc' });
  if(e.fait.formation && !s.attestations && (d.stagiaires || []).length)
    out.push({ texte: 'Formation finie : attestations' + (opco ? ' et certificats de réalisation' : '') + ' à faire.', bouton: '🎓 Les documents', onglet: 'doc' });
  if(s.attestations && !s.facture)
    out.push({ texte: 'Facture à faire dans ton logiciel, puis à noter ici.', bouton: '🧾 Noter la facture', onglet: 'fin' });
  if(s.facture && !s.paye){
    const ech = feEcheance(s.facture.le, FE.d.organisme.paiement);
    if(ech && ech < feAujourdhui()) out.push({ texte: 'Paiement attendu depuis le ' + feDateFr(ech) + '.', bouton: '💶 Noter le paiement', onglet: 'fin' });
  }
  return out;
}
function feProchaine(x){
  const d = x.donnees, e = feEtapes(d), s = d.suivi || {}, f = d.formation || {};
  if(e.rang >= e.liste.length) return '✅ Terminée et payée.';
  const k = e.liste[e.rang][0];
  return ({
    devis: '📨 Devis à envoyer.',
    convention: s.devisEnvoye ? '✍️ Devis envoyé le ' + feDateFr(s.devisEnvoye) + ' : convention à faire signer.' : '✍️ Convention à faire signer.',
    depot: '🏦 L’entreprise dépose la demande à son OPCO' + (f.dateDebut ? ', avant le ' + feDateFr(f.dateDebut) : '') + '.',
    accord: '⏳ Demande déposée le ' + feDateFr(s.opcoDepot && s.opcoDepot.le) + ' : attente de l’accord de l’OPCO.',
    formation: '🚗 Formation ' + feDates(f) + '.',
    attestations: '🎓 Attestations' + (feEstOpco(d) ? ' et certificats' : '') + ' à faire.',
    facture: '🧾 Facture à faire dans ton logiciel, puis à noter ici.',
    paye: '💶 Facture ' + ((s.facture && s.facture.numero) || '') + ' : paiement attendu.'
  })[k] || '';
}

/* ============================================================
   LA LISTE
   ============================================================ */
function feDansLeFiltre(x, f){
  const s = x.donnees.suivi || {}, e = feEtapes(x.donnees);
  if(f === 'cours') return !s.paye;
  if(f === 'fact') return e.fait.formation && !s.facture;
  if(f === 'fini') return !!s.paye;
  return true;
}
function feDessinerListe(z){
  const L = FE.d.formations || [];
  z.appendChild(feAide('Les formations pour les entreprises, de la demande au paiement : on remplit une fois, l’appli fait les documents (devis, programme, convention, convocations, feuilles de présence, attestations, certificats de réalisation), les envoie, et dit où en est le financement.'));
  const haut = feEl('div', 'feBarre');
  if(fePeutEcrire()) haut.appendChild(feBouton('＋ Nouvelle formation', 'btn-primary', () => feFenetreNouvelle()));
  if(FE.d.admin) haut.appendChild(feBouton('⚙️ L’organisme', '', () => feFenetreOrganisme(), 'N° Qualiopi, signataire, dédit, règlement intérieur'));
  z.appendChild(haut);
  const o = FE.d.organisme;
  if(!o.qualiopi) z.appendChild(feAide('❗ <b>Le n° de certificat Qualiopi</b> n’est pas encore saisi : il doit figurer sur les conventions. ' + (FE.d.admin ? '⚙️ L’organisme.' : 'Un administrateur le saisit dans ⚙️ L’organisme.')));
  const filtres = feEl('div', 'feOnglets');
  [['cours', 'En cours'], ['fact', 'À facturer'], ['fini', 'Terminées'], ['tout', 'Toutes']].forEach(([k, t]) => {
    const n = L.filter(x => feDansLeFiltre(x, k)).length;
    filtres.appendChild(fePuce(t + (k === 'tout' ? '' : ' · ' + n), FE.filtre === k, () => { FE.filtre = k; feDessiner(); }));
  });
  z.appendChild(filtres);
  const alertes = [];
  L.filter(x => !(x.donnees.suivi || {}).paye).forEach(x => feAlertes(x).forEach(a => alertes.push([x, a])));
  if(alertes.length){
    const af = feEl('div', 'feAFaire');
    af.appendChild(feEl('div', 'feAFaireT', '⚠️ À FAIRE MAINTENANT'));
    alertes.forEach(([x, a]) => {
      const l = feEl('div', 'feAFaireL');
      const t = feEl('div', 'feAFaireTxt');
      t.appendChild(feEl('b', '', (x.donnees.entreprise && x.donnees.entreprise.nom) || x.numero));
      t.appendChild(document.createTextNode(' — ' + a.texte));
      l.appendChild(t);
      l.appendChild(feBouton(a.bouton, 'feBtnPetit', () => feOuvrir(x.id, a.onglet)));
      af.appendChild(l);
    });
    z.appendChild(af);
  }
  const vus = L.filter(x => feDansLeFiltre(x, FE.filtre));
  if(!vus.length) z.appendChild(feEl('div', 'empty', L.length ? 'Rien ici.' : 'Aucune formation pour l’instant : ＋ Nouvelle formation.'));
  vus.forEach(x => {
    const d = x.donnees, f = d.formation || {}, t = feTotaux(d, FE.d.organisme);
    const c = feEl('div', 'feCarte');
    c.tabIndex = 0;
    c.addEventListener('click', () => feOuvrir(x.id));
    c.addEventListener('keydown', ev => { if(ev.key === 'Enter') feOuvrir(x.id); });
    const tt = feEl('div', 'feCarteTete');
    tt.appendChild(feEl('b', 'feCarteNom', (d.entreprise && d.entreprise.nom) || 'Entreprise ?'));
    const m = (FE.d.modeles || []).find(y => y.id === d.modele);
    tt.appendChild(feEl('span', 'feCarteQuoi', (m ? m.emoji + ' ' : '') + (f.intitule || 'Formation') + ' · ' + feEffectif(d) + ' salarié' + (feEffectif(d) > 1 ? 's' : '') + (f.duree ? ' · ' + feHeures(f.duree) : '')));
    tt.appendChild(feEl('span', 'feCartePrix', (feEstOpco(d) ? ((d.opco && d.opco.nom) || 'OPCO ?') : '🏢 Sans OPCO') + (t.ttc ? ' · ' + feEur(t.ht).replace(',00', '') + ' HT · ' + feEur(t.ttc).replace(',00', '') + ' TTC' : '')));
    c.appendChild(tt);
    c.appendChild(feFrise(d));
    const al = feAlertes(x);
    c.appendChild(feEl('div', 'feCarteSuite' + (al.length ? ' alerte' : ''), al.length ? '⚠️ ' + al[0].texte : feProchaine(x)));
    c.appendChild(feEl('div', 'feCartePied', '📅 ' + feDates(f) + (f.formateur ? ' · 👤 ' + f.formateur : '') + ' · ' + x.numero));
    z.appendChild(c);
  });
}

/* ============================================================
   UN DOSSIER
   ============================================================ */
async function feOuvrir(id, onglet){
  await feSauverMaintenant();
  FE.vue = 'dossier'; FE.id = id; FE.onglet = onglet || 'res';
  feDessiner();
  feTarifs();
}
async function feRetour(){ await feSauverMaintenant(); FE.vue = 'liste'; FE.id = ''; feDessiner(); }
function feOnglets(d){
  const n = (d.stagiaires || []).length, ns = (d.seances || []).length;
  return [['res', '📋 Où on en est'], ['ent', '🏢 Entreprise'], ['for', '📚 Formation'], ['prix', '💶 Prix'], ['sta', '👥 Stagiaires · ' + n],
          ['sea', '📅 Séances · ' + ns], ['doc', '📄 Documents'], ['fin', feEstOpco(d) ? '💶 Financement' : '💶 Paiement']];
}
function feDessinerDossier(z, x){
  const d = x.donnees;
  const t = feEl('div', 'feDossierTete');
  t.appendChild(feBouton('‹ Retour', 'feBtnPetit', () => feRetour()));
  t.appendChild(feEl('b', 'feDossierNom', (d.entreprise && d.entreprise.nom) || 'Entreprise ?'));
  const m = (FE.d.modeles || []).find(y => y.id === d.modele);
  t.appendChild(feEl('span', 'feDossierQuoi', (m ? m.emoji + ' ' : '') + ((d.formation && d.formation.intitule) || '') + ' · ' + feEffectif(d) + ' salarié' + (feEffectif(d) > 1 ? 's' : '') + ' · ' + (feEstOpco(d) ? ((d.opco && d.opco.nom) || 'OPCO ?') : '🏢 financement direct')));
  t.appendChild(feEl('span', 'feDossierNum', x.numero));
  t.appendChild(feEl('span', 'feEtatSauve', '')).id = 'feEtat';
  z.appendChild(t);
  z.appendChild(feFrise(d));
  const o = feEl('div', 'feOnglets feOngletsDossier');
  feOnglets(d).forEach(([k, nom]) => o.appendChild(fePuce(nom, FE.onglet === k, async () => { await feSauverMaintenant(); FE.onglet = k; feDessiner(); })));
  z.appendChild(o);
  const corps = feEl('div', 'feCorps');
  z.appendChild(corps);
  const f = { res: feOngletResume, ent: feOngletEntreprise, for: feOngletFormation, prix: feOngletPrix, sta: feOngletStagiaires,
              sea: feOngletSeances, doc: feOngletDocuments, fin: feOngletFinancement }[FE.onglet] || feOngletResume;
  f(corps, x);
  if(!fePeutEcrire()) corps.querySelectorAll('input, textarea, select, button.feEcrit').forEach(e => { e.disabled = true; });
}

/* ---------- les champs ---------- */
function feChamp(lab, obj, cle, o){
  o = o || {};
  const w = feEl('div', 'feChamp' + (o.large ? ' large' : ''));
  if(lab) w.appendChild(feEl('label', '', lab));
  let i;
  if(o.type === 'textarea'){ i = document.createElement('textarea'); i.rows = o.rows || 3; }
  else if(o.type === 'select'){
    i = document.createElement('select');
    (o.options || []).forEach(op => { const e = document.createElement('option'); e.value = Array.isArray(op) ? op[0] : op; e.textContent = Array.isArray(op) ? op[1] : op; i.appendChild(e); });
  } else { i = document.createElement('input'); i.type = o.type || 'text'; if(o.step) i.step = o.step; if(o.list) i.setAttribute('list', o.list); }
  if(o.placeholder) i.placeholder = o.placeholder;
  if(o.id) i.id = o.id;
  i.value = obj[cle] == null ? '' : obj[cle];
  const lire = () => o.type === 'number' ? (i.value === '' ? '' : Number(String(i.value).replace(',', '.'))) : i.value;
  i.addEventListener(o.type === 'select' || o.type === 'date' ? 'change' : 'input', () => { obj[cle] = lire(); feModifie(); if(o.apres) o.apres(i); });
  if(o.type !== 'select') i.addEventListener('blur', () => { if(FE.attente) feSauverMaintenant(); });
  w.appendChild(i);
  return w;
}
function feGrille(min){ const g = feEl('div', 'feGrille'); if(min) g.style.gridTemplateColumns = 'repeat(auto-fit,minmax(min(100%,' + min + 'px),1fr))'; return g; }
function feDuo(){ return feEl('div', 'feDuo'); }

/* ---------- 📋 Où on en est ---------- */
function feLigneCoche(etat, texte, detail, bouton){
  const l = feEl('div', 'feCoche ' + etat);
  l.appendChild(feEl('span', 'feCocheIc', { ok: '✅', att: '⏳', non: '⬜', ko: '❗' }[etat]));
  const m = feEl('div', 'feCocheTxt');
  m.appendChild(feEl('div', 'feCocheT', texte));
  if(detail) m.appendChild(feEl('div', 'feCocheD', detail));
  l.appendChild(m);
  if(bouton) l.appendChild(bouton);
  return l;
}
function feOngletResume(z, x){
  const d = x.donnees, s = d.suivi || {}, f = d.formation || {}, o = FE.d.organisme, opco = feEstOpco(d);
  const g = feDuo();
  const a = feEl('div');
  a.appendChild(feSous(opco ? '✅ Le dossier OPCO — ce que demandent les financeurs' : '✅ Le dossier — sans OPCO'));
  a.appendChild(feEl('div', 'feTemps', 'AVANT LA FORMATION'));
  if(opco) a.appendChild(o.qualiopi ? feLigneCoche('ok', 'Certification Qualiopi n° ' + o.qualiopi, o.qualiopiFin ? 'valable jusqu’au ' + feDateFr(o.qualiopiFin) : '')
                                    : feLigneCoche('ko', 'N° de certificat Qualiopi', 'L’école est certifiée : le n° et sa date de fin se saisissent une fois, ils s’écrivent sur la convention.',
                                                   FE.d.admin ? feBouton('⚙️ Saisir', 'feBtnPetit', () => feFenetreOrganisme()) : null));
  a.appendChild(feLigneCoche('ok', 'Déclaration d’activité n° ' + o.nda, 'écrite sur la convention, le programme et les attestations'));
  const manque = [];
  if(!f.intitule) manque.push('intitulé'); if(!f.objectifs) manque.push('objectifs'); if(!(f.programme || []).length) manque.push('contenu');
  if(!f.duree) manque.push('durée'); if(!f.moyens) manque.push('moyens'); if(!f.evaluation) manque.push('évaluation');
  a.appendChild(feLigneCoche(manque.length ? 'ko' : 'ok', 'Programme détaillé', manque.length ? 'manque : ' + manque.join(', ') : 'objectifs · contenu · durée · moyens · évaluation · prérequis',
                             manque.length ? feBouton('📚 Compléter', 'feBtnPetit', () => { FE.onglet = 'for'; feDessiner(); }) : null));
  if(!f.dateDebut) a.appendChild(feLigneCoche('ko', 'Dates de la formation', opco ? 'l’OPCO veut une période, pas « à définir »' : 'à poser dans 📚 Formation'));
  a.appendChild(feLigneCoche(((d.prix && d.prix.lignes) || []).length ? 'ok' : 'ko', 'Prix', ((d.prix && d.prix.lignes) || []).length ? feEur(feTotaux(d, o).ht) + ' HT · ' + feEur(feTotaux(d, o).ttc) + ' TTC' : 'aucune ligne dans 💶 Prix'));
  a.appendChild(feLigneCoche(s.devisEnvoye ? 'ok' : 'non', 'Devis envoyé', s.devisEnvoye ? 'le ' + feDateFr(s.devisEnvoye) : ''));
  a.appendChild(feLigneCoche(s.conventionSignee ? 'ok' : 'non', 'Convention signée par les deux parties', s.conventionSignee ? 'le ' + feDateFr(s.conventionSignee.le) + (s.conventionSignee.comment ? ' · ' + s.conventionSignee.comment : '') : ''));
  if(opco){
    const avant = s.opcoDepot && f.dateDebut && s.opcoDepot.le > f.dateDebut;
    a.appendChild(feLigneCoche(s.opcoDepot ? (avant ? 'ko' : 'ok') : 'non', 'Demande déposée à l’OPCO avant le début',
      s.opcoDepot ? 'déposée le ' + feDateFr(s.opcoDepot.le) + (s.opcoDepot.numero ? ' · n° ' + s.opcoDepot.numero : '') + (avant ? ' — APRÈS le début : refus probable' : '') : 'par l’entreprise, sur son espace OPCO'));
    a.appendChild(feLigneCoche(s.opcoAccord ? 'ok' : (s.opcoRefus ? 'ko' : (s.opcoDepot ? 'att' : 'non')), 'Accord de prise en charge',
      s.opcoAccord ? 'le ' + feDateFr(s.opcoAccord.le) + (s.opcoAccord.montant ? ' · ' + feEur(s.opcoAccord.montant) + ' pris en charge' : '') : (s.opcoRefus ? 'refusé le ' + feDateFr(s.opcoRefus.le) : ''),
      s.opcoDepot && !s.opcoAccord && !s.opcoRefus ? feBouton('✏️ Noter l’accord', 'feBtnPetit feEcrit', () => feNoterAccord(x)) : null));
  }
  a.appendChild(feLigneCoche(s.convocations ? 'ok' : 'non', 'Convocations envoyées aux salariés', s.convocations ? 'le ' + feDateFr(s.convocations) + ', avec le règlement intérieur' : ''));
  a.appendChild(feEl('div', 'feTemps', 'PENDANT'));
  const ns = (d.seances || []).length;
  a.appendChild(feLigneCoche(ns ? 'att' : 'non', 'Feuilles de présence : ' + ns + ' séance' + (ns > 1 ? 's' : ''),
    'chaque stagiaire signe à chaque séance (au moins par demi-journée), le formateur aussi — à imprimer depuis 📅 Séances ; le scan signé se dépose dans 📄 Documents'));
  a.appendChild(feEl('div', 'feTemps', 'APRÈS'));
  a.appendChild(feLigneCoche(s.attestations ? 'ok' : 'non', 'Attestations de fin de formation (' + (d.stagiaires || []).length + ')', s.attestations ? 'le ' + feDateFr(s.attestations) : 'objectifs, nature, durée, résultats de l’évaluation'));
  a.appendChild(feLigneCoche(s.certificats ? 'ok' : 'non', 'Certificats de réalisation (' + (d.stagiaires || []).length + ')', s.certificats ? 'le ' + feDateFr(s.certificats) : (opco ? 'modèle du ministère du Travail — demandé pour le paiement' : 'facultatif sans OPCO')));
  a.appendChild(feLigneCoche(s.facture ? 'ok' : 'non', 'Facture faite dans ton logiciel', s.facture ? 'n° ' + (s.facture.numero || '?') + ' du ' + feDateFr(s.facture.le) + (s.facture.montant ? ' · ' + feEur(s.facture.montant) : '') : 'notée ici : n°, date, montant'));
  a.appendChild(feLigneCoche(s.paye ? 'ok' : 'non', 'Paiement reçu', s.paye ? 'le ' + feDateFr(s.paye.le) + (s.paye.montant ? ' · ' + feEur(s.paye.montant) : '') : o.paiement));
  g.appendChild(a);
  const b = feEl('div');
  b.appendChild(feSous('📌 En bref'));
  const bb = feEl('div', 'feBoite');
  const t = feTotaux(d, o), e = d.entreprise || {};
  [['Entreprise', [e.nom, [e.signataire, e.fonction].filter(Boolean).join(', ')].filter(Boolean).join(' · ')], ['Formation', (f.intitule || '') + (f.duree ? ' · ' + feHeures(f.duree) + ' par salarié' : '')],
   ['Dates', feDates(f)], ['Formateur', f.formateur || ''], ['Lieu', f.lieu || ''], ['Prix', t.ttc ? feEur(t.ht) + ' HT · ' + feEur(t.ttc) + ' TTC' : ''],
   ['Financement', opco ? ((d.opco && d.opco.nom) || 'OPCO ?') + ' · ' + ((d.opco && d.opco.subrogation === 'opco') ? 'subrogation : l’OPCO te paie' : 'l’entreprise paie, puis se fait rembourser') : 'direct, sans OPCO']]
    .forEach(([k, v]) => { const l = feEl('div', 'feKv'); l.append(feEl('span', 'k', k), feEl('span', 'v', v || '—')); bb.appendChild(l); });
  b.appendChild(bb);
  b.appendChild(feSous('🕘 Historique'));
  const hi = feEl('div', 'feBoite feHisto', 'Lecture…');
  b.appendChild(hi);
  g.appendChild(b);
  z.appendChild(g);
  feChargerJournal(x.id).then(j => {
    hi.innerHTML = '';
    if(!j || !(j.journal || []).length){ hi.textContent = 'Rien encore.'; return; }
    j.journal.slice(0, 40).forEach(l => hi.appendChild(feEl('div', '', new Date(l.quand).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' · ' + l.texte + (l.par ? ' — ' + l.par : ''))));
  });
}
async function feChargerJournal(id, force){
  if(FE.journal[id] && !force) return FE.journal[id];
  try{ const r = await appelPrep({ action: 'formationJournal', id: id }); if(r && r.status === 'ok') FE.journal[id] = r; return r; }catch(e){ return null; }
}

/* ---------- 🏢 Entreprise ---------- */
function feOngletEntreprise(z, x){
  const d = x.donnees, s = d.suivi || {};
  d.entreprise = d.entreprise || {};
  const g2 = feDuo();
  const a = feEl('div');
  a.appendChild(feSous('🏢 L’entreprise'));
  const ch = feEl('div', 'feCherche');
  const q = document.createElement('input'); q.type = 'text'; q.placeholder = '🔎 Nom ou Siret : l’annuaire des entreprises remplit le reste'; q.id = 'feChercheEnt';
  const res = feEl('div', 'feResultats');
  const go = feBouton('Chercher', 'feEcrit', async (ev, b) => {
    b.disabled = true; res.textContent = 'Recherche…';
    try{
      const r = await appelPrep({ action: 'formationEntreprise', q: q.value });
      res.innerHTML = '';
      if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Recherche impossible');
      if(!r.entreprises.length) res.textContent = 'Rien trouvé.';
      r.entreprises.forEach(en => {
        const l = feBouton('', 'feResultat feEcrit', () => {
          Object.assign(d.entreprise, { nom: en.nom, siret: en.siret, adresse: en.adresse, cp: en.cp, ville: en.ville });
          FE.attente = x; feSauverMaintenant('🔎 entreprise : ' + en.nom).then(() => feDessiner());
        });
        l.innerHTML = '<b>' + feEsc(en.nom) + '</b><span>' + feEsc([en.siret, en.adresse, en.cp, en.ville].filter(Boolean).join(' · ')) + '</span>';
        res.appendChild(l);
      });
    }catch(e){ res.textContent = '⚠️ ' + ((e && e.message) || e); }
    b.disabled = false;
  });
  q.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); go.click(); } });
  ch.append(q, go);
  a.append(ch, res);
  const g = feGrille(200);
  [['Raison sociale', 'nom'], ['Siret', 'siret'], ['Adresse', 'adresse'], ['Code postal', 'cp'], ['Ville', 'ville'], ['Signataire de la convention', 'signataire'],
   ['Sa fonction', 'fonction'], ['Mail', 'mail', 'email'], ['Téléphone', 'tel', 'tel']].forEach(([l, k, t]) => g.appendChild(feChamp(l, d.entreprise, k, { type: t, id: 'feEnt_' + k })));
  a.appendChild(g);
  g2.appendChild(a);
  const b = feEl('div');
  b.appendChild(feSous('🏦 Le financement'));
  const verrou = !!s.conventionSignee;
  const fm = feEl('div', 'feOnglets');
  [['opco', '🏦 Avec un OPCO'], ['direct', '🏢 Financement direct (sans OPCO)']].forEach(([k, t]) => fm.appendChild(fePuce(t, (d.financement || 'opco') === k, async () => {
    if(verrou){ feToast('La convention est signée : le financement ne change plus.'); return; }
    d.financement = k; await feSauverMaintenant(k === 'opco' ? '🏦 avec un OPCO' : '🏢 financement direct'); feDessiner();
  })));
  b.appendChild(fm);
  if(feEstOpco(d)){
    d.opco = d.opco || {};
    const g3 = feGrille(200);
    const listes = FE_OPCOS.slice();
    if(d.opco.nom && listes.indexOf(d.opco.nom) === -1) listes.push(d.opco.nom);
    g3.appendChild(feChamp('OPCO de l’entreprise', d.opco, 'nom', { type: 'select', options: [['', '— choisir —']].concat(listes) }));
    g3.appendChild(feChamp('N° de dossier OPCO', d.opco, 'dossier'));
    b.appendChild(g3);
    b.appendChild(feEl('label', 'feLab', 'Qui te paie ?'));
    const p = feEl('div', 'feOnglets');
    [['opco', '🏦 L’OPCO (subrogation)'], ['entreprise', '🏢 L’entreprise, remboursée par l’OPCO']].forEach(([k, t]) => p.appendChild(fePuce(t, (d.opco.subrogation || 'entreprise') === k, () => {
      d.opco.subrogation = k; feModifie(); feDessiner();
    })));
    b.appendChild(p);
    b.appendChild(feAide('L’OPCO dépend de la branche de l’entreprise (sa convention collective). Depuis le 1<sup>er</sup> octobre 2026, certains OPCO (OPCO EP par exemple) ne paient plus directement l’organisme pour le plan de développement des compétences : ça se dit à l’accord.'));
  } else b.appendChild(feAide('L’entreprise paie tout : pas d’étapes OPCO, pas de lettre pour l’OPCO, le certificat de réalisation reste disponible si elle le demande.'));
  if(verrou) b.appendChild(feAide('🔒 La convention est signée : le financement ne change plus.'));
  if(fePeutEcrire()){
    const sup = feBouton('🗑️ Supprimer ce dossier', 'feBtnPetit feDanger feEcrit', async () => {
      if(typeof confirmer === 'function' && !await confirmer('Supprimer le dossier ' + x.numero + ' (' + (d.entreprise.nom || '') + ') ?\nSes documents restent rangés, mais il disparaît du suivi.', 'Supprimer', true)) return;
      const r = await appelPrep({ action: 'formationRetirer', id: x.id });
      if(r && r.status === 'ok'){ FE.d = r; FE.vue = 'liste'; FE.id = ''; feDessiner(); }
    });
    sup.style.marginTop = '18px';
    b.appendChild(sup);
  }
  g2.appendChild(b);
  z.appendChild(g2);
}

/* ---------- 📚 Formation ---------- */
function feModeleVersDossier(m, d, tf){
  d.modele = m.id;
  d.formation = Object.assign(d.formation || {}, {
    intitule: m.intitule, nature: m.nature, objectifs: m.objectifs, public: m.public, moyens: m.moyens, evaluation: m.evaluation,
    sanction: m.sanction, modalite: m.modalite, duree: m.duree, programme: JSON.parse(JSON.stringify(m.programme || []))
  });
  d.prix = d.prix || { lignes: [] };
  d.prix.lignes = [];
  (m.prix || []).forEach(r => feAjouterRef(d, r, tf));
  d.prix.copiesLe = feAujourdhui();
}
function feOngletFormation(z, x){
  const d = x.donnees;
  d.formation = d.formation || {};
  const f = d.formation;
  const t = feEl('div', 'feBarre');
  t.appendChild(feEl('span', 'feAideIn', 'Modèle :'));
  (FE.d.modeles || []).forEach(m => t.appendChild(fePuce(m.emoji + ' ' + m.nom, d.modele === m.id, async () => {
    if(d.modele === m.id) return;
    if(typeof confirmer === 'function' && !await confirmer('Reprendre le modèle « ' + m.nom + ' » ? L’intitulé, les objectifs, le programme et le prix de ce dossier sont remplacés.', 'Changer de modèle', false)) return;
    feModeleVersDossier(m, d, await feTarifs());
    await feSauverMaintenant('📚 modèle « ' + m.nom + ' »');
    feDessiner();
  })));
  z.appendChild(t);
  z.appendChild(feAide('Le modèle prérempli ; tout se change pour cette entreprise sans toucher au modèle. <b>💾 Garder comme modèle</b> l’enregistre pour les prochaines fois.'));
  const g2 = feDuo();
  const a = feEl('div');
  const g = feGrille(200);
  g.appendChild(feChamp('Intitulé', f, 'intitule', { id: 'feIntitule' }));
  g.appendChild(feChamp('Nature de l’action (art. L6313-1)', f, 'nature', { type: 'select', options: ['Action de formation', 'Bilan de compétences', 'Action de VAE', 'Action de formation par apprentissage'] }));
  g.appendChild(feChamp('Nombre de salariés', f, 'effectif', { type: 'number', placeholder: String((d.stagiaires || []).length || ''), apres: () => feMajTitre(d) }));
  g.appendChild(feChamp('Durée par salarié (h)', f, 'duree', { type: 'number', step: '0.5' }));
  g.appendChild(feChamp('Début', f, 'dateDebut', { type: 'date', id: 'feDebut' }));
  g.appendChild(feChamp('Fin', f, 'dateFin', { type: 'date', id: 'feFin' }));
  g.appendChild(feChamp('Lieu', f, 'lieu', { placeholder: FE.d.organisme.lieu }));
  g.appendChild(feChamp('Modalité', f, 'modalite', { type: 'select', options: ['Présentiel', 'À distance', 'Mixte', 'En situation de travail'] }));
  g.appendChild(feChamp('Formateur', f, 'formateur', { list: 'feMoniteurs' }));
  g.appendChild(feChamp('Sanction', f, 'sanction'));
  a.appendChild(g);
  feListeMoniteurs();
  a.appendChild(feChamp('🎯 Objectifs (un par ligne)', f, 'objectifs', { type: 'textarea', rows: 4, large: true }));
  a.appendChild(feChamp('👤 Public et prérequis', f, 'public', { type: 'textarea', rows: 2, large: true }));
  g2.appendChild(a);
  const b = feEl('div');
  const somme = (f.programme || []).reduce((s, p) => s + (Number(p.h) || 0), 0);
  b.appendChild(feSous('📚 Programme (' + feHeures(somme) + (f.duree && Math.abs(somme - f.duree) > 0.01 ? ' — la durée dit ' + feHeures(f.duree) : '') + ')'));
  f.programme = f.programme || [];
  f.programme.forEach((p, i) => {
    const l = feEl('div', 'feProg');
    const h = document.createElement('input'); h.type = 'number'; h.step = '0.25'; h.value = p.h; h.className = 'feProgH'; h.title = 'heures';
    h.addEventListener('input', () => { p.h = Number(h.value) || 0; feModifie(); });
    const tt = document.createElement('input'); tt.type = 'text'; tt.value = p.titre || ''; tt.placeholder = 'Module';
    tt.addEventListener('input', () => { p.titre = tt.value; feModifie(); });
    const dd = document.createElement('input'); dd.type = 'text'; dd.value = p.detail || ''; dd.placeholder = 'Contenu';
    dd.addEventListener('input', () => { p.detail = dd.value; feModifie(); });
    const m = feEl('div', 'feProgTxt'); m.append(tt, dd);
    l.append(h, m, feBouton('✕', 'feBtnX feEcrit', () => { f.programme.splice(i, 1); feModifie(); feDessiner(); }, 'Retirer'));
    b.appendChild(l);
  });
  b.appendChild(feBouton('＋ Un module', 'feBtnPetit feEcrit', () => { f.programme.push({ h: 1, titre: '', detail: '' }); feModifie(); feDessiner(); }));
  b.appendChild(feChamp('🧰 Moyens pédagogiques et techniques', f, 'moyens', { type: 'textarea', rows: 3, large: true }));
  b.appendChild(feChamp('📏 Évaluation', f, 'evaluation', { type: 'textarea', rows: 3, large: true }));
  if(fePeutEcrire()) b.appendChild(feBouton('💾 Garder comme modèle', 'feBtnPetit feEcrit', () => feGarderModele(x)));
  g2.appendChild(b);
  z.appendChild(g2);
}
function feMajTitre(d){ /* l'effectif change le prix : on redessine en quittant l'onglet */ }
function feListeMoniteurs(){
  let dl = $('feMoniteurs');
  if(!dl){ dl = document.createElement('datalist'); dl.id = 'feMoniteurs'; document.body.appendChild(dl); }
  dl.innerHTML = '';
  ((typeof moniteursActifs !== 'undefined' && moniteursActifs) || []).forEach(n => { const o = document.createElement('option'); o.value = typeof n === 'string' ? n : (n && n.nom) || ''; dl.appendChild(o); });
}
async function feGarderModele(x, ligneMain){
  const d = x.donnees, f = d.formation || {};
  const m0 = (FE.d.modeles || []).find(m => m.id === d.modele) || {};
  let modele;
  if(ligneMain){
    modele = Object.assign({}, m0, { prix: (m0.prix || []).concat([ligneMain]) });
  } else {
    if(typeof confirmer === 'function' && !await confirmer('Garder l’intitulé, les objectifs, le programme, les moyens et le prix de ce dossier dans le modèle « ' + (m0.nom || 'Formation') + ' » ?', 'Garder comme modèle', false)) return;
    const prix = [];
    const vus = {};
    ((d.prix && d.prix.lignes) || []).forEach(l => {
      if(l.src === 'pack' && l.pack){ const k = l.bloc + '|' + l.pack; if(!vus[k]){ vus[k] = 1; prix.push({ bloc: l.bloc, src: 'pack', pack: l.pack }); } return; }
      if(l.src === 'presta') prix.push({ bloc: l.bloc, src: 'presta', p: l.p, q: l.q });
      else prix.push({ bloc: l.bloc, src: 'main', lib: l.lib, q: l.q, ht: feArr(feHtDe(l.ttc, feTva(FE.d.organisme))) });
    });
    modele = Object.assign({}, m0, { intitule: f.intitule, nature: f.nature, objectifs: f.objectifs, public: f.public, moyens: f.moyens, evaluation: f.evaluation,
                                     sanction: f.sanction, modalite: f.modalite, duree: f.duree, programme: f.programme, prix: prix });
  }
  try{
    const r = await appelPrep({ action: 'formationModelePoser', id: m0.id || '', modele: modele });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Modèle non gardé');
    FE.d.modeles = r.modeles;
    feToast('💾 Modèle « ' + (modele.nom || '') + ' » gardé');
  }catch(e){ feToast('⚠️ ' + ((e && e.message) || e)); }
}

/* ---------- 💶 Prix ---------- */
function feGenrePack(tf, pack){ const fi = tf && typeof tfFiche === 'function' ? tfFiche(tf, pack) : null; return (fi && fi.genre) || ''; }
function feLibSansQ(lib){ return String(lib || '').replace(/\s*\(\{q\}[^)]*\)/g, '').replace(/\{q\}/g, '').trim(); }
function feAjouterRef(d, r, tf){
  const tva = feTva(FE.d.organisme);
  d.prix = d.prix || { lignes: [] };
  const L = d.prix.lignes;
  if(r.src === 'pack'){
    const fi = tf && typeof tfFiche === 'function' ? tfFiche(tf, r.pack) : null;
    if(!fi){ L.push({ id: feId('l'), bloc: r.bloc || 'salarie', src: 'main', lib: 'Pack « ' + r.pack + ' » (introuvable dans 💰 Tarifs)', q: 1, ttc: 0 }); return; }
    tfLignes(fi).forEach(l => {
      const p = typeof tfPrestation === 'function' ? tfPrestation(tf, l.p) : null;
      L.push({ id: feId('l'), bloc: r.bloc || 'salarie', src: 'pack', pack: fi.id, packNom: fi.titre, p: l.p, lib: feLibSansQ(l.lib) || (p && p.nom) || '', q: Number(l.q) || 0, ttc: tfPrix(tf, l.p, fi.genre) });
    });
  } else if(r.src === 'presta'){
    const p = tf && typeof tfPrestation === 'function' ? tfPrestation(tf, r.p) : null;
    L.push({ id: feId('l'), bloc: r.bloc || 'salarie', src: 'presta', p: r.p, lib: (p && p.nom) || r.p, q: Number(r.q) || 1, ttc: p ? tfPrix(tf, r.p, '') : 0 });
  } else {
    L.push({ id: feId('l'), bloc: r.bloc || 'salarie', src: 'main', lib: r.lib || '', q: Number(r.q) || 1, ttc: (Number(r.ht) || 0) * (1 + tva / 100) });
  }
}
function feOngletPrix(z, x){
  const d = x.donnees, o = FE.d.organisme, tva = feTva(o);
  d.prix = d.prix || { lignes: [] };
  const L = d.prix.lignes;
  const signe = !!(d.suivi && d.suivi.conventionSignee);
  z.appendChild(feAide('Les lignes viennent de <b>💰 Tarifs</b> (une prestation, ou un pack entier qui se déplie en ses lignes) ou s’écrivent à la main. Tes tarifs sont TTC : le HT s’en déduit, et le TTC d’un pack reste exact. Le devis, la convention et la lettre pour l’OPCO reprennent ces lignes.'));
  if(!signe){
    const t = feEl('div', 'feBarre');
    t.appendChild(feBouton('📦 Un pack de 💰 Tarifs', 'feEcrit', () => feFenetreCatalogue(x, 'k')));
    t.appendChild(feBouton('➕ Une prestation de 💰 Tarifs', 'feEcrit', () => feFenetreCatalogue(x, 'p')));
    t.appendChild(feBouton('✏️ Une ligne à la main', 'feEcrit', () => feFenetreCatalogue(x, 'm')));
    z.appendChild(t);
  } else z.appendChild(feAide('🔒 La convention est signée : le prix ne change plus.'));
  const tot = feTotaux(d, o);
  const bloc = (titre, cle, b) => {
    const lignes = L.filter(l => (l.bloc === 'groupe') === (cle === 'groupe'));
    z.appendChild(feSous(titre));
    const w = feEl('div', 'feBoite feDevis');
    const en = feEl('div', 'feDevisL tete');
    ['', 'Prestation', 'Qté', 'PU HT', 'Total HT', ''].forEach(t => en.appendChild(feEl('span', '', t)));
    w.appendChild(en);
    if(!lignes.length) w.appendChild(feEl('div', 'feVide', cle === 'groupe' ? 'Rien pour le groupe (déplacement, rapport, remise…).' : 'Aucune ligne.'));
    let packAvant = '';
    lignes.forEach((l, i) => {
      if(l.src === 'pack' && l.pack !== packAvant) w.appendChild(feEl('div', 'fePackT', '📦 ' + (l.packNom || l.pack) + ' — pack de 💰 Tarifs, déplié'));
      packAvant = l.src === 'pack' ? l.pack : '';
      const r = feEl('div', 'feDevisL');
      r.appendChild(feEl('span', 'src', l.src === 'pack' ? '📦' : (l.src === 'presta' ? '➕' : '✏️')));
      const lib = document.createElement('input'); lib.type = 'text'; lib.value = l.lib; lib.className = 'lib'; lib.disabled = signe;
      lib.addEventListener('input', () => { l.lib = lib.value; feModifie(); });
      r.appendChild(lib);
      const q = document.createElement('input'); q.type = 'number'; q.step = '0.5'; q.value = l.q; q.className = 'q'; q.disabled = signe;
      q.addEventListener('change', () => { l.q = Number(q.value) || 0; feModifie(); feDessiner(); });
      r.appendChild(q);
      if(l.src === 'main' && !signe){
        const pu = document.createElement('input'); pu.type = 'number'; pu.step = '0.01'; pu.value = feArr(feHtDe(l.ttc, tva)); pu.className = 'pu';
        pu.addEventListener('change', () => { l.ttc = (Number(pu.value) || 0) * (1 + tva / 100); feModifie(); feDessiner(); });
        r.appendChild(pu);
      } else r.appendChild(feEl('span', 'pu', feEur(feHtDe(l.ttc, tva))));
      r.appendChild(feEl('b', 'tot', feEur(b.totaux[i])));
      r.appendChild(signe ? feEl('span') : feBouton('✕', 'feBtnX feEcrit', () => { L.splice(L.indexOf(l), 1); feModifie(); feDessiner(); }, 'Retirer'));
      w.appendChild(r);
    });
    if(lignes.length) w.appendChild(feEl('div', 'feDevisTot', (cle === 'groupe' ? 'pour le groupe ' : 'par salarié ') + feEur(b.ht) + ' HT · ' + feEur(b.ttc) + ' TTC'));
    z.appendChild(w);
  };
  bloc('👤 Par salarié — × ' + tot.n, 'salarie', tot.sal);
  bloc('🏢 Pour le groupe — une fois', 'groupe', tot.grp);
  const tt = feEl('div', 'feBoite feTotal');
  const parts = [];
  if(tot.sal.ttc) parts.push(tot.n + ' × ' + feEur(tot.sal.ttc) + ' TTC');
  if(tot.grp.ttc) parts.push(feEur(tot.grp.ttc) + ' TTC');
  tt.innerHTML = '<div><span>' + feEsc(parts.join(' + ') || '—') + '</span><b>' + feEsc(feEur(tot.ht)) + ' HT</b></div>' +
    '<div class="gris"><span>TVA ' + feNb(tot.tva) + ' %</span>' + feEsc(feEur(tot.montantTva)) + '</div><div><span><b>Total</b></span><b>' + feEsc(feEur(tot.ttc)) + ' TTC</b></div>';
  z.appendChild(tt);
  if(!tot.n) z.appendChild(feAide('⚠️ Aucun salarié : écris le nombre dans 📚 Formation, ou ajoute-les dans 👥 Stagiaires.'));
  const note = feEl('div', 'feAide');
  note.innerHTML = '🔒 Les prix sont <b>recopiés</b> de 💰 Tarifs' + (d.prix.copiesLe ? ' le ' + feDateFr(d.prix.copiesLe) : '') + ' : un tarif changé ensuite ne change pas ce devis. ';
  if(!signe && L.some(l => l.p)) note.appendChild(feBouton('🔄 Reprendre les prix du jour', 'feBtnLien feEcrit', async () => {
    const tf = await feTarifs();
    if(!tf){ feToast('⚠️ 💰 Tarifs illisible'); return; }
    L.forEach(l => { if(l.p) l.ttc = tfPrix(tf, l.p, l.src === 'pack' ? feGenrePack(tf, l.pack) : ''); });
    d.prix.copiesLe = feAujourdhui();
    await feSauverMaintenant('🔄 prix repris de 💰 Tarifs');
    feDessiner();
  }));
  z.appendChild(note);
}

/* La fenêtre « Ajouter depuis 💰 Tarifs » : prestations, packs, à la main */
function feFenetre(titre){
  const fond = feEl('div', 'overlay show');
  const boite = feEl('div', 'modal feModal');
  boite.appendChild(feEl('h3', '', titre));
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => { if(fond.parentNode) fond.remove(); };
  fond.addEventListener('click', ev => { if(ev.target === fond) fermer(); });
  return { fond, boite, fermer };
}
async function feFenetreCatalogue(x, onglet){
  const d = x.donnees;
  const fen = feFenetre('💰 Ajouter depuis Tarifs');
  const b = fen.boite;
  const ong = feEl('div', 'feOnglets');
  const zone = feEl('div');
  let bloc = 'salarie';
  const dessiner = async (k) => {
    ong.innerHTML = '';
    [['p', '➕ Prestations'], ['k', '📦 Packs'], ['m', '✏️ À la main']].forEach(([c, t]) => ong.appendChild(fePuce(t, c === k, () => dessiner(c))));
    zone.innerHTML = '';
    const bl = feEl('div', 'feOnglets');
    [['salarie', '👤 Par salarié'], ['groupe', '🏢 Pour le groupe']].forEach(([c, t]) => bl.appendChild(fePuce(t, bloc === c, (p) => { bloc = c; [...bl.children].forEach(e => e.classList.toggle('on', e === p)); })));
    if(k === 'm'){
      const o = { lib: '', q: 1, ht: '' };
      zone.appendChild(feChamp('Libellé', o, 'lib', { id: 'feMainLib', placeholder: 'Frais de déplacement, rapport à l’entreprise, remise…' }));
      const g = feGrille(140);
      g.appendChild(feChamp('Quantité', o, 'q', { type: 'number', step: '0.5' }));
      g.appendChild(feChamp('Prix unitaire HT (€)', o, 'ht', { type: 'number', step: '0.01', id: 'feMainHt' }));
      zone.appendChild(g);
      zone.appendChild(bl);
      const garde = feEl('label', 'feCocheLab');
      const cg = document.createElement('input'); cg.type = 'checkbox'; cg.id = 'feMainGarder';
      const mo = (FE.d.modeles || []).find(m => m.id === d.modele);
      garde.append(cg, document.createTextNode(' La garder dans le modèle « ' + (mo ? mo.nom : 'de cette formation') + ' » pour les prochaines fois'));
      zone.appendChild(garde);
      const r = feEl('div', 'btn-row');
      r.appendChild(feBouton('＋ Ajouter la ligne', 'btn-primary', async () => {
        const lib = String($('feMainLib').value || '').trim();
        if(!lib){ feToast('⚠️ Le libellé ?'); return; }
        const ref = { bloc: bloc, src: 'main', lib: lib, q: Number(o.q) || 1, ht: Number(String($('feMainHt').value).replace(',', '.')) || 0 };
        feAjouterRef(d, ref, null);
        FE.attente = x;
        await feSauverMaintenant('✏️ ligne « ' + lib + ' »');
        if(cg.checked && mo) await feGarderModele(x, ref);
        fen.fermer(); feDessiner();
      }));
      zone.appendChild(r);
      return;
    }
    zone.appendChild(feEl('div', 'feAide', 'Lecture de 💰 Tarifs…'));
    const tf = await feTarifs();
    zone.innerHTML = '';
    if(!tf){ zone.appendChild(feEl('div', 'empty', '⚠️ 💰 Tarifs illisible (il faut le droit 💰 Tarifs).')); return; }
    const q = document.createElement('input'); q.type = 'text'; q.placeholder = 'Chercher…'; q.id = 'feCatCherche';
    zone.appendChild(q);
    zone.appendChild(bl);
    const liste = feEl('div', 'feCatListe');
    zone.appendChild(liste);
    const tva = feTva(FE.d.organisme);
    const remplir = () => {
      liste.innerHTML = '';
      const m = feNorm(q.value);
      if(k === 'p'){
        tf.prestations.filter(p => !m || feNorm(p.nom).indexOf(m) !== -1).slice(0, 60).forEach(p => {
          const ttc = tfPrix(tf, p.id, '');
          const l = feEl('div', 'feCat');
          const t = feEl('div', 'feCatT'); t.append(feEl('b', '', p.nom), feEl('span', '', (Object.keys(p.formule || {}).length ? 'sur ' + Object.keys(p.formule).map(c => (tf.taux.find(y => y.id === c) || {}).nom || c).join(', ') : 'prix fixe') + ' · ' + feEur(ttc) + ' TTC'));
          l.append(t, feEl('b', 'feCatPrix', feEur(feHtDe(ttc, tva)) + ' HT'),
            feBouton('＋', 'btn-primary feBtnPetit', async () => { feAjouterRef(d, { bloc: bloc, src: 'presta', p: p.id, q: 1 }, tf); d.prix.copiesLe = d.prix.copiesLe || feAujourdhui(); FE.attente = x; await feSauverMaintenant('➕ ' + p.nom); fen.fermer(); feDessiner(); }));
          liste.appendChild(l);
        });
      } else {
        tf.fiches.filter(fi => fi.type !== 'grille' && (!m || feNorm(fi.titre + ' ' + fi.dossier).indexOf(m) !== -1)).forEach(fi => {
          const total = typeof tfTotalDeLaFiche === 'function' ? tfTotalDeLaFiche(tf, fi) : 0;
          const l = feEl('div', 'feCat');
          const t = feEl('div', 'feCatT'); t.append(feEl('b', '', fi.titre), feEl('span', '', (fi.dossier || '') + ' · ' + tfLignes(fi).length + ' lignes'));
          l.append(t, feEl('b', 'feCatPrix', feEur(total) + ' TTC'),
            feBouton('＋ Déplier', 'btn-primary feBtnPetit', async () => { feAjouterRef(d, { bloc: bloc, src: 'pack', pack: fi.id }, tf); d.prix.copiesLe = d.prix.copiesLe || feAujourdhui(); FE.attente = x; await feSauverMaintenant('📦 pack « ' + fi.titre + ' »'); fen.fermer(); feDessiner(); }));
          liste.appendChild(l);
        });
      }
      if(!liste.children.length) liste.appendChild(feEl('div', 'feVide', 'Rien.'));
    };
    q.addEventListener('input', remplir);
    remplir();
    zone.appendChild(feEl('div', 'feAide', k === 'p' ? 'Avec leur prix du jour (calculé sur les tarifs horaires).' : 'Un pack se déplie en ses lignes : tu enlèves ou changes ce que tu veux, le pack de 💰 Tarifs ne bouge pas.'));
  };
  b.append(ong, zone);
  const r = feEl('div', 'btn-row'); r.appendChild(feBouton('Fermer', '', fen.fermer)); b.appendChild(r);
  dessiner(onglet);
}

/* ---------- 👥 Stagiaires ---------- */
function feListeEleves(){
  let dl = $('feEleves');
  if(!dl){ dl = document.createElement('datalist'); dl.id = 'feEleves'; document.body.appendChild(dl); }
  if(dl.dataset.n === String((elevesConnus || []).length)) return;
  dl.innerHTML = '';
  (elevesConnus || []).slice(0, 3000).forEach(n => { const o = document.createElement('option'); o.value = typeof n === 'string' ? n : (n && n.nom) || ''; dl.appendChild(o); });
  dl.dataset.n = String((elevesConnus || []).length);
}
function feOngletStagiaires(z, x){
  const d = x.donnees;
  d.stagiaires = d.stagiaires || [];
  feListeEleves();
  z.appendChild(feAide('Chaque salarié a sa fiche élève (👤 l’ouvre quand le nom est connu) et ses leçons dans Drivup. Les heures faites se comptent dans les séances passées (absences retirées) ; un nombre écrit à la main passe devant.'));
  d.stagiaires.forEach((st, i) => {
    const c = feEl('div', 'feBoite feStag');
    const g = feGrille(170);
    g.appendChild(feChamp('Nom et prénom', st, 'nom', { list: 'feEleves', apres: () => {} }));
    g.appendChild(feChamp('Fonction', st, 'fonction'));
    g.appendChild(feChamp('Mail', st, 'mail', { type: 'email' }));
    g.appendChild(feChamp('N° NEPH', st, 'neph'));
    const auto = feHeuresFaites(d, Object.assign({}, st, { heures: '' }));
    g.appendChild(feChamp('Heures faites (auto : ' + feNb(auto) + ')', st, 'heures', { type: 'number', step: '0.5', placeholder: feNb(auto) }));
    c.appendChild(g);
    c.appendChild(feChamp('Résultat de l’évaluation (pour l’attestation)', st, 'resultat', { large: true, placeholder: 'Ex. : objectifs atteints · examen BE réussi le …' }));
    const pied = feEl('div', 'feStagPied');
    const connu = (elevesConnus || []).some(n => feNorm(typeof n === 'string' ? n : n.nom) === feNorm(st.nom));
    if(connu && typeof boutonDossierEleve === 'function'){ const bd = boutonDossierEleve(st.nom); if(bd) pied.appendChild(bd); }
    else if(st.nom) pied.appendChild(feEl('span', 'feAideIn', '⚠️ pas de fiche élève à ce nom'));
    pied.appendChild(feEl('span', 'feAideIn', '⏱️ ' + feNb(feHeuresFaites(d, st)) + ' h / ' + feNb((d.formation && d.formation.duree) || 0) + ' h'));
    pied.appendChild(feBouton('✕ Retirer', 'feBtnPetit feEcrit', async () => {
      if(typeof confirmer === 'function' && !await confirmer('Retirer ' + (st.nom || 'ce salarié') + ' du dossier ?', 'Retirer', true)) return;
      d.stagiaires.splice(i, 1); (d.seances || []).forEach(s => { s.stagiaires = (s.stagiaires || []).filter(id => id !== st.id); s.absents = (s.absents || []).filter(id => id !== st.id); });
      await feSauverMaintenant('👥 ' + (st.nom || 'un salarié') + ' retiré'); feDessiner();
    }));
    c.appendChild(pied);
    z.appendChild(c);
  });
  const r = feEl('div', 'feBarre');
  r.appendChild(feBouton('＋ Ajouter un salarié', 'feEcrit', async () => { d.stagiaires.push({ id: feId('s'), nom: '', fonction: '' }); FE.attente = x; await feSauverMaintenant(); feDessiner(); }));
  r.appendChild(feBouton('📋 Coller une liste', 'feEcrit', () => {
    const fen = feFenetre('📋 Coller une liste de salariés');
    fen.boite.appendChild(feAide('Une personne par ligne : <b>Nom Prénom ; fonction ; mail</b> (la fonction et le mail sont facultatifs).'));
    const t = document.createElement('textarea'); t.rows = 8; t.id = 'feColler';
    fen.boite.appendChild(t);
    const rr = feEl('div', 'btn-row');
    rr.append(feBouton('Annuler', '', fen.fermer), feBouton('＋ Ajouter', 'btn-primary', async () => {
      const n0 = d.stagiaires.length;
      t.value.split(/\n+/).map(l => l.split(/[;\t]/).map(c => c.trim())).filter(c => c[0]).forEach(c => {
        d.stagiaires.push({ id: feId('s'), nom: c[0], fonction: c[1] || '', mail: /@/.test(c[2] || '') ? c[2] : '' });
      });
      await feSauverMaintenant('👥 ' + (d.stagiaires.length - n0) + ' salarié(s) ajouté(s)');
      fen.fermer(); feDessiner();
    }));
    fen.boite.appendChild(rr);
  }));
  z.appendChild(r);
}

/* ---------- 📅 Séances ---------- */
function feOngletSeances(z, x){
  const d = x.donnees;
  d.seances = d.seances || [];
  const auj = feAujourdhui();
  z.appendChild(feAide('Chaque séance a sa feuille de présence : <b>🖨️</b> l’imprime, prête à signer par chaque stagiaire et par le formateur (au moins par demi-journée) ; le scan signé se dépose dans 📄 Documents. <i>Livraison 2 : la signature sur le téléphone du moniteur, ici et sur la carte de son cours. Livraison 3 : les séances lues dans Drivup.</i>'));
  const r0 = feEl('div', 'feBarre');
  r0.appendChild(feBouton('＋ Ajouter une séance', 'feEcrit', async () => {
    const der = d.seances[d.seances.length - 1];
    d.seances.push({ id: feId('e'), date: (der && der.date) || (d.formation && d.formation.dateDebut) || auj, debut: (der && der.debut) || '09:00', fin: (der && der.fin) || '11:00',
                     contenu: '', stagiaires: [], formateur: (d.formation && d.formation.formateur) || '', absents: [] });
    FE.attente = x; await feSauverMaintenant(); feDessiner();
  }));
  if(d.seances.length) r0.appendChild(feBouton('🖨️ Toutes les feuilles', '', () => feVoir(feTrier(d.seances).map(s => feDocument('emargement', x, s)), 'Feuilles de présence')));
  z.appendChild(r0);
  const tous = d.stagiaires || [];
  feListeMoniteurs();
  feTrier(d.seances).forEach(s => {
    const passe = s.date && s.date < auj, ajd = s.date === auj;
    const c = feEl('div', 'feBoite feSeance' + (ajd ? ' ajd' : ''));
    const g = feGrille(120);
    g.appendChild(feChamp('Date', s, 'date', { type: 'date' }));
    g.appendChild(feChamp('Début', s, 'debut', { type: 'time' }));
    g.appendChild(feChamp('Fin', s, 'fin', { type: 'time' }));
    g.appendChild(feChamp('Formateur', s, 'formateur', { list: 'feMoniteurs' }));
    c.appendChild(g);
    c.appendChild(feChamp('Contenu', s, 'contenu', { large: true, placeholder: 'Ex. : circulation + plateau' }));
    const qui = feEl('div', 'feQui');
    qui.appendChild(feEl('span', 'feAideIn', passe || ajd ? 'Présents (toucher pour noter une absence) :' : 'Stagiaires :'));
    const inscrits = s.stagiaires && s.stagiaires.length ? tous.filter(z2 => s.stagiaires.indexOf(z2.id) !== -1) : tous;
    tous.forEach(st => {
      const dans = inscrits.indexOf(st) !== -1;
      const absent = (s.absents || []).indexOf(st.id) !== -1;
      const p = fePuce((dans ? (absent ? '🚫 ' : '') : '＋ ') + (st.nom || '?'), dans && !absent, async () => {
        if(!dans){ s.stagiaires = (s.stagiaires && s.stagiaires.length ? s.stagiaires : []).concat([st.id]); }
        else if(passe || ajd){ s.absents = absent ? s.absents.filter(i => i !== st.id) : (s.absents || []).concat([st.id]); }
        else { s.stagiaires = (s.stagiaires && s.stagiaires.length ? s.stagiaires : tous.map(t => t.id)).filter(i => i !== st.id); }
        FE.attente = x; await feSauverMaintenant(); feDessiner();
      });
      if(absent) p.classList.add('absent');
      qui.appendChild(p);
    });
    if(!tous.length) qui.appendChild(feEl('span', 'feAideIn', 'aucun salarié dans 👥 Stagiaires'));
    c.appendChild(qui);
    const pied = feEl('div', 'feStagPied');
    pied.appendChild(feEl('span', 'feAideIn', (ajd ? '🔴 aujourd’hui · ' : passe ? '✓ passée · ' : '🕘 à venir · ') + feHeures(feDureeSeance(s))));
    pied.appendChild(feBouton('🖨️ Feuille de présence', 'feBtnPetit', () => feVoir([feDocument('emargement', x, s)], 'Feuille de présence')));
    pied.appendChild(feBouton('✕', 'feBtnX feEcrit', async () => {
      if(typeof confirmer === 'function' && !await confirmer('Retirer la séance du ' + feDateFr(s.date) + ' ?', 'Retirer', true)) return;
      d.seances.splice(d.seances.indexOf(s), 1); await feSauverMaintenant('📅 séance du ' + feDateFr(s.date) + ' retirée'); feDessiner();
    }, 'Retirer la séance'));
    c.appendChild(pied);
    z.appendChild(c);
  });
}
function feTrier(l){ return (l || []).slice().sort((a, b) => ((a.date || '') + (a.debut || '')).localeCompare((b.date || '') + (b.debut || ''))); }

/* ---------- 📄 Documents ---------- */
async function feVoir(docs, titre){
  /* la fenêtre s'ouvre tout de suite (sinon le navigateur la bloque),
     le PDF y arrive quand il est prêt */
  const w = window.open('', '_blank');
  try{
    feToast('📄 Fabrication du PDF…');
    const doc = await feFabriquerPdf(docs);
    const url = URL.createObjectURL(doc.output('blob'));
    if(w){ w.location.href = url; }
    else { const a = document.createElement('a'); a.href = url; a.download = (titre || 'Document') + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }catch(e){ if(w) w.close(); feToast('⚠️ ' + ((e && e.message) || e)); }
}
function feTelechargerB64(b64, nom, mime){
  const bin = atob(b64); const o = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([o], { type: mime || 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
/* Les documents d'un dossier : ce qu'il faut fabriquer pour chaque ligne */
function feListeDocs(x){
  const d = x.donnees, sta = (d.stagiaires || []).filter(s => s.nom), opco = feEstOpco(d);
  const s = d.suivi || {};
  const l = [
    { cle: 'devis', emoji: '💶', nom: 'Devis', etat: s.devisEnvoye ? 'envoyé le ' + feDateFr(s.devisEnvoye) : '', fait: !!s.devisEnvoye, docs: () => [feDocument('devis', x)], suivi: 'devisEnvoye' },
    { cle: 'programme', emoji: '📚', nom: 'Programme de formation', docs: () => [feDocument('programme', x)] },
    { cle: 'convention', emoji: '✍️', nom: 'Convention de formation', etat: s.conventionSignee ? 'signée le ' + feDateFr(s.conventionSignee.le) : (s.conventionEnvoyee ? 'envoyée le ' + feDateFr(s.conventionEnvoyee) : ''), fait: !!s.conventionSignee,
      docs: () => [feDocument('convention', x), feDocument('programme', x)], suivi: 'conventionEnvoyee', note: 'avec le programme en annexe' }
  ];
  if(opco) l.push({ cle: 'lettreOpco', emoji: '🏦', nom: 'Lettre pour la demande à l’OPCO', docs: () => [feDocument('lettreOpco', x)] });
  l.push({ cle: 'convocation', emoji: '📨', nom: 'Convocations (' + sta.length + ') + règlement intérieur', etat: s.convocations ? 'envoyées le ' + feDateFr(s.convocations) : '', fait: !!s.convocations,
           docs: () => sta.map(st => feDocument('convocation', x, st)).concat([feDocument('reglement', x)]), vide: !sta.length });
  l.push({ cle: 'reglement', emoji: '📋', nom: 'Règlement intérieur', docs: () => [feDocument('reglement', x)] });
  l.push({ cle: 'emargement', emoji: '🧾', nom: 'Feuilles de présence (' + (d.seances || []).length + ')', note: 'à imprimer et signer à chaque séance', docs: () => feTrier(d.seances).map(se => feDocument('emargement', x, se)), vide: !(d.seances || []).length, sansMail: true });
  l.push({ cle: 'attestation', emoji: '🎓', nom: 'Attestations de fin de formation (' + sta.length + ')', etat: s.attestations ? 'faites le ' + feDateFr(s.attestations) : '', fait: !!s.attestations,
           docs: () => sta.map(st => feDocument('attestation', x, st)), vide: !sta.length, suivi: 'attestations' });
  l.push({ cle: 'certificat', emoji: '📜', nom: 'Certificats de réalisation (' + sta.length + ')', etat: s.certificats ? 'faits le ' + feDateFr(s.certificats) : (opco ? 'modèle du ministère du Travail' : 'facultatif sans OPCO'), fait: !!s.certificats,
           docs: () => sta.map(st => feDocument('certificat', x, st)), vide: !sta.length, suivi: 'certificats' });
  return l;
}
function feOngletDocuments(z, x){
  const d = x.donnees;
  z.appendChild(feAide('Chaque document sort sur le papier à en-tête des ✉️ Courriers, rempli avec le dossier. <b>👁️</b> le montre, <b>📄</b> le télécharge (une copie se range dans le dossier), <b>✉️</b> l’envoie.'));
  const t = feEl('div', 'feBarre');
  t.appendChild(feBouton('✉️ Envoyer à l’entreprise…', 'btn-primary feEcrit', () => feFenetreMail(x, ['devis', 'convention'].concat(feEstOpco(d) ? ['lettreOpco'] : []))));
  t.appendChild(feBouton('📨 Convocations aux salariés', 'feEcrit', () => feFenetreConvocations(x)));
  t.appendChild(feBouton('📦 Tout le dossier en un PDF', '', () => {
    const l = feListeDocs(x).filter(k => !k.vide && ['devis', 'convention', 'emargement', 'attestation', 'certificat'].indexOf(k.cle) !== -1);
    feVoir([].concat(...l.map(k => k.docs())), 'Dossier ' + x.numero);
  }));
  t.appendChild(feBouton('📎 Déposer un document signé', 'feEcrit', () => feFenetreDepot(x)));
  z.appendChild(t);
  if(FE.d.admin && (FE.d.images || []).length){
    const w = feEl('div', 'feSignChoix');
    w.appendChild(feEl('span', 'feAideIn', '✍️ Signature et tampon sur les documents (administrateurs) :'));
    const s = document.createElement('select'); s.id = 'feSignature';
    [['', '— aucune —']].concat(FE.d.images.map(i => [i.id, i.nom])).forEach(([v, n]) => { const o = document.createElement('option'); o.value = v; o.textContent = n; s.appendChild(o); });
    s.value = d.signatureImage || '';
    s.addEventListener('change', () => { d.signatureImage = s.value; feModifie(); });
    w.appendChild(s);
    z.appendChild(w);
  }
  feListeDocs(x).forEach(k => {
    const c = feEl('div', 'feBoite feDoc');
    c.appendChild(feEl('span', 'feDocEmoji', k.emoji));
    const m = feEl('div', 'feDocTxt');
    m.appendChild(feEl('b', '', k.nom));
    const det = [k.etat, k.note].filter(Boolean).join(' · ');
    if(det) m.appendChild(feEl('span', '', det));
    c.appendChild(m);
    c.appendChild(feEl('span', 'feDocEtat' + (k.fait ? ' ok' : ''), k.fait ? '✅ fait' : ''));
    const bs = feEl('div', 'feDocBtns');
    if(k.vide) bs.appendChild(feEl('span', 'feAideIn', k.cle === 'emargement' ? 'aucune séance' : 'aucun salarié'));
    else {
      bs.appendChild(feBouton('👁️', 'feBtnPetit', () => feVoir(k.docs(), k.nom), 'Voir'));
      bs.appendChild(feBouton('📄', 'feBtnPetit', () => feGarderPdf(x, k), 'Télécharger (une copie se range dans le dossier)'));
      if(!k.sansMail && k.cle !== 'convocation') bs.appendChild(feBouton('✉️', 'feBtnPetit feEcrit', () => feFenetreMail(x, [k.cle]), 'Envoyer'));
      if(k.cle === 'convocation') bs.appendChild(feBouton('✉️', 'feBtnPetit feEcrit', () => feFenetreConvocations(x), 'Envoyer aux salariés'));
    }
    c.appendChild(bs);
    z.appendChild(c);
  });
  z.appendChild(feSous('🗂️ Ce qui est fait, envoyé ou déposé'));
  const h = feEl('div', 'feBoite feHisto', 'Lecture…');
  z.appendChild(h);
  feChargerJournal(x.id).then(j => {
    h.innerHTML = '';
    const docs = (j && j.docs) || [];
    if(!docs.length){ h.textContent = 'Rien encore.'; return; }
    docs.forEach(dc => {
      const l = feEl('div', 'feHistoDoc');
      l.appendChild(feEl('span', '', ({ mail: '✉️', pdf: '📄', depot: '📎' })[dc.comment] || '📄'));
      l.appendChild(feEl('span', 'n', dc.nom + ' · ' + new Date(dc.quand).toLocaleDateString('fr-FR') + (dc.a ? ' → ' + dc.a : '') + (dc.par ? ' — ' + dc.par : '')));
      l.appendChild(feBouton('⬇️', 'feBtnPetit', async () => {
        const r = await appelPrep({ action: 'formationDocLire', id: dc.id });
        if(r && r.status === 'ok') feTelechargerB64(r.contenu, r.nom, r.mime); else feToast('⚠️ ' + ((r && r.message) || 'Document illisible'));
      }, 'Télécharger'));
      h.appendChild(l);
    });
  });
}
async function feGarderPdf(x, k){
  try{
    feToast('📄 Fabrication du PDF…');
    const docs = k.docs();
    const b64 = await fePdfB64(docs);
    const nom = feNomPdf(k.nom.replace(/\s*\(\d+\)/, ''), x);
    const r = await appelPrep({ action: 'formationDocPoser', formation: x.id, comment: 'pdf', docs: [{ genre: k.cle, nom: nom, contenu: b64 }] });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'PDF non rangé');
    feTelechargerB64(b64, nom);
    if(k.suivi && ['attestations', 'certificats'].indexOf(k.suivi) !== -1){
      x.donnees.suivi = x.donnees.suivi || {};
      if(!x.donnees.suivi[k.suivi]){ x.donnees.suivi[k.suivi] = feAujourdhui(); FE.attente = x; await feSauverMaintenant(); }
    }
    delete FE.journal[x.id];
    feDessiner();
  }catch(e){ feToast('⚠️ ' + ((e && e.message) || e)); }
}

/* ✉️ L'envoi : des documents choisis, à l'entreprise */
function feFenetreMail(x, cles){
  const d = x.donnees, e = d.entreprise || {}, f = d.formation || {};
  const liste = feListeDocs(x).filter(k => !k.vide && !k.sansMail && k.cle !== 'convocation');
  const fen = feFenetre('✉️ Envoyer à l’entreprise');
  const b = fen.boite;
  b.appendChild(feAide('Part de contact@evolutionconduites.fr, avec les documents en PDF. Une copie se range dans le dossier.'));
  b.appendChild(feEl('label', 'feLab', 'À'));
  const adresses = [];
  const zA = feEl('div', 'feOnglets');
  const ajouter = (a, etiquette, on) => { if(!a) return; const o = { a: a, on: on }; adresses.push(o); zA.appendChild(fePuce((etiquette ? etiquette + ' · ' : '') + a, on, p => { o.on = !o.on; p.classList.toggle('on', o.on); })); };
  ajouter(String(e.mail || '').trim(), e.signataire || e.nom, true);
  b.appendChild(zA);
  const autre = document.createElement('input'); autre.type = 'email'; autre.placeholder = '+ une autre adresse, séparées par des virgules'; autre.id = 'feMailAutre';
  b.appendChild(autre);
  if(!e.mail) b.appendChild(feAide('⚠️ Pas de mail dans 🏢 Entreprise : tape l’adresse.'));
  const objet = document.createElement('input'); objet.type = 'text'; objet.id = 'feMailObjet';
  const noms = { devis: 'devis', convention: 'convention', lettreOpco: 'lettre pour l’OPCO', programme: 'programme', attestation: 'attestations', certificat: 'certificats de réalisation', reglement: 'règlement intérieur' };
  const choisis = new Set(cles);
  const texte = document.createElement('textarea'); texte.rows = 8; texte.id = 'feMailTexte';
  const majTexte = () => {
    const quoi = liste.filter(k => choisis.has(k.cle)).map(k => noms[k.cle] || k.nom);
    objet.value = (f.intitule || 'Formation') + ' — ' + (quoi.join(', ') || 'documents');
    const opco = feEstOpco(d) && choisis.has('convention');
    texte.value = 'Bonjour' + (e.signataire ? ' ' + e.signataire : '') + ',\n\nVous trouverez ci-joint' + (quoi.length > 1 ? 's' : '') + ' ' + (quoi.length ? 'le' + (quoi.length > 1 ? 's documents suivants : ' + quoi.join(', ') : ' ' + quoi[0]) : 'nos documents') +
      ' pour la formation « ' + (f.intitule || '') + ' » (' + feEffectif(d) + ' salarié' + (feEffectif(d) > 1 ? 's' : '') + ', ' + feDates(f) + ').' +
      (choisis.has('convention') ? '\n\nMerci de nous retourner la convention signée et tamponnée.' : '') +
      (opco ? '\n\nLa demande de prise en charge se dépose sur votre espace ' + ((d.opco && d.opco.nom) || 'OPCO') + ', avant le début de la formation, avec la convention signée et le programme.' : '') +
      '\n\nBien cordialement,\n' + (FE.d.moi || '') + ' — Évolution Conduites';
  };
  b.appendChild(feEl('label', 'feLab', 'Documents joints'));
  const zd = feEl('div', 'feOnglets');
  liste.forEach(k => zd.appendChild(fePuce(k.emoji + ' ' + k.nom, choisis.has(k.cle), p => { if(choisis.has(k.cle)) choisis.delete(k.cle); else choisis.add(k.cle); p.classList.toggle('on', choisis.has(k.cle)); majTexte(); })));
  b.appendChild(zd);
  b.appendChild(feEl('label', 'feLab', 'Objet')); b.appendChild(objet);
  b.appendChild(feEl('label', 'feLab', 'Message')); b.appendChild(texte);
  majTexte();
  const copie = feEl('label', 'feCocheLab'); const cc = document.createElement('input'); cc.type = 'checkbox';
  copie.append(cc, document.createTextNode(' M’en envoyer une copie'));
  b.appendChild(copie);
  const r = feEl('div', 'btn-row');
  const go = feBouton('✉️ Envoyer', 'btn-primary', async () => {
    const a = adresses.filter(o => o.on).map(o => o.a).concat(autre.value.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean));
    const bonnes = a.filter(v => /^[^\s@<>",;]+@[^\s@<>",;]+\.[a-z]{2,}$/i.test(v));
    if(!bonnes.length){ feToast('⚠️ Aucune adresse mail valide.'); return; }
    if(bonnes.length !== a.length){ feToast('⚠️ Une adresse est mal écrite.'); return; }
    const k2 = liste.filter(k => choisis.has(k.cle));
    if(!k2.length){ feToast('⚠️ Aucun document choisi.'); return; }
    go.disabled = true;
    try{
      feToast('✉️ Fabrication des PDF…');
      const pj = [];
      for(const k of k2) pj.push({ genre: k.cle, nom: feNomPdf(k.nom.replace(/\s*\(\d+\)/, ''), x), contenu: await fePdfB64(k.docs()) });
      const rr = await appelPrep({ action: 'formationDocPoser', formation: x.id, comment: 'mail', docs: pj, mail: { a: bonnes, objet: objet.value, texte: texte.value, copieMoi: cc.checked } });
      if(!rr || rr.status !== 'ok') throw new Error((rr && rr.message) || 'Le mail n’est pas parti');
      d.suivi = d.suivi || {};
      k2.forEach(k => { if(k.suivi && !d.suivi[k.suivi]) d.suivi[k.suivi] = feAujourdhui(); });
      FE.attente = x; await feSauverMaintenant();
      delete FE.journal[x.id];
      feToast('✉️ Envoyé à ' + rr.envoyeA.join(', '));
      fen.fermer(); feDessiner();
    }catch(e2){ feToast('⚠️ ' + ((e2 && e2.message) || e2)); go.disabled = false; }
  });
  r.append(feBouton('Annuler', '', fen.fermer), go);
  b.appendChild(r);
}
/* 📨 Les convocations : une par salarié, avec le règlement intérieur */
function feFenetreConvocations(x){
  const d = x.donnees, e = d.entreprise || {};
  const sta = (d.stagiaires || []).filter(s => s.nom);
  const avec = sta.filter(s => /@/.test(s.mail || '')), sans = sta.filter(s => !/@/.test(s.mail || ''));
  const fen = feFenetre('📨 Convocations aux salariés');
  const b = fen.boite;
  b.appendChild(feAide('Chaque salarié reçoit sa convocation et le règlement intérieur.'));
  b.appendChild(feEl('div', 'feAideIn', avec.length ? '✉️ ' + avec.map(s => s.nom).join(', ') : 'Aucun salarié n’a d’adresse mail dans 👥 Stagiaires.'));
  const cs = document.createElement('input'); cs.type = 'checkbox'; cs.checked = !!sans.length && !!e.mail;
  if(sans.length){
    b.appendChild(feEl('div', 'feAideIn', '⚠️ Sans adresse : ' + sans.map(s => s.nom).join(', ')));
    const l = feEl('label', 'feCocheLab'); l.append(cs, document.createTextNode(' Les envoyer à l’entreprise' + (e.mail ? ' (' + e.mail + ')' : ' — pas de mail dans 🏢 Entreprise')));
    b.appendChild(l);
  }
  const r = feEl('div', 'btn-row');
  const go = feBouton('📨 Envoyer', 'btn-primary', async () => {
    go.disabled = true;
    const f = d.formation || {};
    try{
      let n = 0;
      const reglement = await fePdfB64([feDocument('reglement', x)]);
      for(const st of avec){
        await fePdfEnvoi(x, [{ genre: 'convocation', nom: feNomPdf('Convocation ' + st.nom, x), contenu: await fePdfB64([feDocument('convocation', x, st)]) },
                             { genre: 'reglement', nom: 'Reglement interieur Evolution Conduites.pdf', contenu: reglement }],
                         [st.mail], 'Convocation — ' + (f.intitule || 'formation'),
                         'Bonjour ' + st.nom + ',\n\nVotre employeur, ' + (e.nom || '') + ', vous inscrit à la formation « ' + (f.intitule || '') + ' » (' + feDates(f) + ').\n\nVous trouverez ci-joints votre convocation et le règlement intérieur.\n\nÀ bientôt,\nÉvolution Conduites');
        n++;
      }
      if(sans.length && cs.checked && e.mail){
        await fePdfEnvoi(x, [{ genre: 'convocation', nom: feNomPdf('Convocations', x), contenu: await fePdfB64(sans.map(st => feDocument('convocation', x, st))) },
                             { genre: 'reglement', nom: 'Reglement interieur Evolution Conduites.pdf', contenu: reglement }],
                         [e.mail], 'Convocations — ' + (f.intitule || 'formation'),
                         'Bonjour,\n\nVous trouverez ci-jointes les convocations de ' + sans.map(s => s.nom).join(', ') + ' (sans adresse mail chez nous) et le règlement intérieur, à leur remettre.\n\nBien cordialement,\nÉvolution Conduites');
        n += sans.length;
      }
      if(!n) throw new Error('Aucune convocation envoyée : pas d’adresse.');
      d.suivi = d.suivi || {}; d.suivi.convocations = feAujourdhui();
      FE.attente = x; await feSauverMaintenant('📨 ' + n + ' convocation(s) envoyée(s)');
      delete FE.journal[x.id];
      feToast('📨 ' + n + ' convocation' + (n > 1 ? 's' : '') + ' envoyée' + (n > 1 ? 's' : ''));
      fen.fermer(); feDessiner();
    }catch(e2){ feToast('⚠️ ' + ((e2 && e2.message) || e2)); go.disabled = false; }
  });
  r.append(feBouton('Annuler', '', fen.fermer), go);
  b.appendChild(r);
}
async function fePdfEnvoi(x, docs, a, objet, texte){
  const r = await appelPrep({ action: 'formationDocPoser', formation: x.id, comment: 'mail', docs: docs, mail: { a: a, objet: objet, texte: texte } });
  if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Le mail n’est pas parti');
  return r;
}
/* 📎 Un document signé qu'on rapporte : convention, accord de l'OPCO, feuille de présence… */
function feFenetreDepot(x){
  const d = x.donnees;
  const fen = feFenetre('📎 Déposer un document signé');
  const b = fen.boite;
  b.appendChild(feAide('Un PDF ou une photo (4 Mo au plus) : il se range dans le dossier et fait avancer le suivi.'));
  let genre = 'convention-signee';
  const g = feEl('div', 'feOnglets');
  [['convention-signee', '✍️ Convention signée'], ['accord-opco', '🏦 Accord de l’OPCO'], ['emargement-signe', '🧾 Feuille de présence signée'], ['autre', '📄 Autre']]
    .filter(([k]) => feEstOpco(d) || k !== 'accord-opco')
    .forEach(([k, t]) => g.appendChild(fePuce(t, k === genre, p => { genre = k; [...g.children].forEach(c => c.classList.toggle('on', c === p)); })));
  b.appendChild(g);
  const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'application/pdf,image/jpeg,image/png'; fi.id = 'feDepotFichier';
  b.appendChild(fi);
  const r = feEl('div', 'btn-row');
  const go = feBouton('📎 Déposer', 'btn-primary', async () => {
    const f = fi.files && fi.files[0];
    if(!f){ feToast('⚠️ Choisis le fichier.'); return; }
    if(f.size > 4 * 1024 * 1024){ feToast('⚠️ Plus de 4 Mo.'); return; }
    go.disabled = true;
    try{
      const b64 = await new Promise((ok, non) => { const rd = new FileReader(); rd.onload = () => ok(String(rd.result).split(',')[1]); rd.onerror = non; rd.readAsDataURL(f); });
      const rr = await appelPrep({ action: 'formationDocPoser', formation: x.id, comment: 'depot', docs: [{ genre: genre, nom: f.name, contenu: b64 }] });
      if(!rr || rr.status !== 'ok') throw new Error((rr && rr.message) || 'Dépôt refusé');
      d.suivi = d.suivi || {};
      if(genre === 'convention-signee' && !d.suivi.conventionSignee){ d.suivi.conventionSignee = { le: feAujourdhui(), comment: 'scan déposé' }; FE.attente = x; await feSauverMaintenant('✍️ convention signée (scan déposé)'); }
      delete FE.journal[x.id];
      fen.fermer();
      if(genre === 'accord-opco' && !d.suivi.opcoAccord){ feDessiner(); feNoterAccord(x); return; }
      feDessiner();
    }catch(e2){ feToast('⚠️ ' + ((e2 && e2.message) || e2)); go.disabled = false; }
  });
  r.append(feBouton('Annuler', '', fen.fermer), go);
  b.appendChild(r);
}

/* ---------- 💶 Financement / Paiement ---------- */
function feFenetreNoter(titre, champs, aide){
  return new Promise(ok => {
    const fen = feFenetre(titre);
    if(aide) fen.boite.appendChild(feAide(aide));
    const v = {};
    champs.forEach(c => { v[c.cle] = c.valeur == null ? '' : c.valeur; fen.boite.appendChild(feChampLibre(c.lab, v, c.cle, c)); });
    const r = feEl('div', 'btn-row');
    r.append(feBouton('Annuler', '', () => { fen.fermer(); ok(null); }), feBouton('✓ Noter', 'btn-primary', () => { fen.fermer(); ok(v); }));
    fen.boite.appendChild(r);
  });
}
function feChampLibre(lab, obj, cle, o){
  /* un champ qui ne déclenche pas l'enregistrement du dossier */
  const w = feEl('div', 'feChamp large');
  w.appendChild(feEl('label', '', lab));
  const i = document.createElement('input'); i.type = o.type || 'text'; if(o.step) i.step = o.step; i.value = obj[cle]; if(o.id) i.id = o.id;
  i.addEventListener('input', () => { obj[cle] = o.type === 'number' ? Number(String(i.value).replace(',', '.')) || 0 : i.value; });
  w.appendChild(i);
  return w;
}
async function feNoter(x, cle, titre, champs, journal, aide){
  const v = await feFenetreNoter(titre, champs, aide);
  if(!v) return;
  const d = x.donnees; d.suivi = d.suivi || {};
  d.suivi[cle] = v;
  FE.attente = x; await feSauverMaintenant(journal(v));
  feDessiner();
}
function feNoterAccord(x){
  const t = feTotaux(x.donnees, FE.d.organisme);
  return feNoter(x, 'opcoAccord', '🏦 Noter l’accord de l’OPCO',
    [{ lab: 'Date de l’accord', cle: 'le', type: 'date', valeur: feAujourdhui(), id: 'feNoteLe' }, { lab: 'Montant pris en charge (€)', cle: 'montant', type: 'number', step: '0.01', valeur: t.ht, id: 'feNoteMontant' }],
    v => '🏦 accord de l’OPCO' + (v.montant ? ' : ' + feEur(v.montant) : ''), 'Le montant de l’accord (souvent plafonné à l’heure) : le reste est payé par l’entreprise.');
}
function feOngletFinancement(z, x){
  const d = x.donnees, s = d.suivi || {}, o = FE.d.organisme, opco = feEstOpco(d);
  const t = feTotaux(d, o);
  const g2 = feDuo();
  const a = feEl('div');
  a.appendChild(feSous('💶 Les montants'));
  const m = feEl('div', 'feBoite feTotal');
  const pris = s.opcoAccord && Number(s.opcoAccord.montant) || 0;
  m.innerHTML = '<div><span>' + t.n + ' salarié' + (t.n > 1 ? 's' : '') + ' (💶 Prix)</span><b>' + feEsc(feEur(t.ht)) + ' HT</b></div><div class="gris"><span>TVA ' + feNb(t.tva) + ' %</span>' + feEsc(feEur(t.montantTva)) + '</div>' +
    '<div><span>Total</span><b>' + feEsc(feEur(t.ttc)) + ' TTC</b></div>' +
    (opco ? '<div class="trait"></div><div><span>Pris en charge par ' + feEsc((d.opco && d.opco.nom) || 'l’OPCO') + '</span><b>' + (s.opcoAccord ? feEsc(feEur(pris)) : (s.opcoRefus ? 'refusé' : '— en attente')) + '</b></div>' +
            '<div><span>Reste pour l’entreprise (HT)</span><b>' + (s.opcoAccord ? feEsc(feEur(Math.max(0, t.ht - pris))) : '—') + '</b></div>' : '');
  a.appendChild(m);
  a.appendChild(feSous('🧾 Facture et paiement'));
  a.appendChild(feLigneCoche(s.facture ? 'ok' : 'non', 'Facture faite dans ton logiciel', s.facture ? 'n° ' + (s.facture.numero || '?') + ' du ' + feDateFr(s.facture.le) + (s.facture.montant ? ' · ' + feEur(s.facture.montant) : '') : 'à l’ordre de ' + ((opco && d.opco && d.opco.subrogation === 'opco') ? (d.opco.nom || 'l’OPCO') + ' (subrogation)' : ((d.entreprise && d.entreprise.nom) || 'l’entreprise')),
    feBouton(s.facture ? '✏️' : '✏️ Noter', 'feBtnPetit feEcrit', () => feNoter(x, 'facture', '🧾 Noter la facture',
      [{ lab: 'N° de facture', cle: 'numero', valeur: (s.facture && s.facture.numero) || '', id: 'feNoteNum' }, { lab: 'Date', cle: 'le', type: 'date', valeur: (s.facture && s.facture.le) || feAujourdhui() },
       { lab: 'Montant TTC (€)', cle: 'montant', type: 'number', step: '0.01', valeur: (s.facture && s.facture.montant) || t.ttc }], v => '🧾 facture ' + (v.numero || '') + ' notée'))));
  a.appendChild(feLigneCoche(s.paye ? 'ok' : 'non', 'Paiement reçu', s.paye ? 'le ' + feDateFr(s.paye.le) + (s.paye.montant ? ' · ' + feEur(s.paye.montant) : '') : o.paiement + (s.facture ? ' · échéance ' + feDateFr(feEcheance(s.facture.le, o.paiement)) : ''),
    feBouton(s.paye ? '✏️' : '✏️ Noter', 'feBtnPetit feEcrit', () => feNoter(x, 'paye', '💶 Noter le paiement',
      [{ lab: 'Date', cle: 'le', type: 'date', valeur: (s.paye && s.paye.le) || feAujourdhui() }, { lab: 'Montant (€)', cle: 'montant', type: 'number', step: '0.01', valeur: (s.paye && s.paye.montant) || (s.facture && s.facture.montant) || t.ttc }],
      v => '💶 paiement reçu' + (v.montant ? ' : ' + feEur(v.montant) : '')))));
  g2.appendChild(a);
  const b = feEl('div');
  b.appendChild(feSous(opco ? '🏦 L’OPCO, étape par étape' : '✍️ Les étapes'));
  b.appendChild(feLigneCoche(s.devisEnvoye ? 'ok' : 'non', 'Devis envoyé', s.devisEnvoye ? feDateFr(s.devisEnvoye) : '',
    s.devisEnvoye ? null : feBouton('✏️ Noter', 'feBtnPetit feEcrit', async () => { d.suivi = d.suivi || {}; d.suivi.devisEnvoye = feAujourdhui(); FE.attente = x; await feSauverMaintenant('💶 devis envoyé (noté)'); feDessiner(); })));
  b.appendChild(feLigneCoche(s.conventionSignee ? 'ok' : 'non', 'Convention signée', s.conventionSignee ? feDateFr(s.conventionSignee.le) + (s.conventionSignee.comment ? ' · ' + s.conventionSignee.comment : '') : 'sur papier : note-la (ou dépose le scan dans 📄 Documents)',
    feBouton(s.conventionSignee ? '✏️' : '✏️ Noter', 'feBtnPetit feEcrit', () => feNoter(x, 'conventionSignee', '✍️ Convention signée',
      [{ lab: 'Date', cle: 'le', type: 'date', valeur: (s.conventionSignee && s.conventionSignee.le) || feAujourdhui() }, { lab: 'Remarque', cle: 'comment', valeur: (s.conventionSignee && s.conventionSignee.comment) || 'signée sur papier' }],
      v => '✍️ convention signée (' + (v.comment || '') + ')'))));
  if(opco){
    b.appendChild(feLigneCoche(s.opcoDepot ? 'ok' : 'non', 'Demande déposée par l’entreprise', s.opcoDepot ? feDateFr(s.opcoDepot.le) + (s.opcoDepot.numero ? ' · n° ' + s.opcoDepot.numero : '') : 'sur son espace OPCO, avant le début',
      feBouton(s.opcoDepot ? '✏️' : '✏️ Noter', 'feBtnPetit feEcrit', () => feNoter(x, 'opcoDepot', '🏦 Demande déposée à l’OPCO',
        [{ lab: 'Date du dépôt', cle: 'le', type: 'date', valeur: (s.opcoDepot && s.opcoDepot.le) || feAujourdhui() }, { lab: 'N° de dossier OPCO', cle: 'numero', valeur: (s.opcoDepot && s.opcoDepot.numero) || (d.opco && d.opco.dossier) || '' }],
        v => { if(v.numero){ d.opco = d.opco || {}; d.opco.dossier = v.numero; } return '🏦 demande OPCO déposée' + (v.numero ? ' · n° ' + v.numero : ''); }))));
    b.appendChild(feLigneCoche(s.opcoAccord ? 'ok' : (s.opcoRefus ? 'ko' : (s.opcoDepot ? 'att' : 'non')), 'Accord de l’OPCO',
      s.opcoAccord ? feDateFr(s.opcoAccord.le) + (s.opcoAccord.montant ? ' · ' + feEur(s.opcoAccord.montant) : '') : (s.opcoRefus ? 'refusé le ' + feDateFr(s.opcoRefus.le) : 'attendu'),
      feBouton(s.opcoAccord ? '✏️' : '✏️ Noter l’accord', 'feBtnPetit feEcrit', () => feNoterAccord(x))));
    if(!s.opcoAccord && !s.opcoRefus) b.appendChild(feBouton('❌ Noter un refus', 'feBtnLien feEcrit', () => feNoter(x, 'opcoRefus', '❌ Refus de l’OPCO', [{ lab: 'Date', cle: 'le', type: 'date', valeur: feAujourdhui() }, { lab: 'Motif', cle: 'motif', valeur: '' }], v => '❌ refus de l’OPCO' + (v.motif ? ' : ' + v.motif : ''))));
    if(s.opcoRefus) b.appendChild(feAide('❌ Refus de l’OPCO : l’entreprise paie tout (même convention), ou la formation est annulée — le dédit de la convention s’applique moins de ' + o.deditJours + ' jours avant le début.'));
    b.appendChild(feLigneCoche(s.certificats ? 'ok' : 'non', 'Pièces pour le paiement', 'certificats de réalisation + facture (+ feuilles de présence si l’OPCO les demande) — 📦 dans 📄 Documents'));
  }
  if(s.facture || s.paye || s.opcoAccord || s.opcoDepot || s.conventionSignee){
    const ann = feBouton('↩️ Effacer une étape notée…', 'feBtnLien feEcrit', async () => {
      const choix = [['paye', 'Paiement'], ['facture', 'Facture'], ['opcoRefus', 'Refus OPCO'], ['opcoAccord', 'Accord OPCO'], ['opcoDepot', 'Dépôt OPCO'], ['conventionSignee', 'Convention signée'], ['devisEnvoye', 'Devis envoyé']].filter(([k]) => s[k]);
      const fen = feFenetre('↩️ Effacer une étape notée');
      choix.forEach(([k, n]) => fen.boite.appendChild(feBouton('↩️ ' + n, 'feBtnPetit', async () => { delete s[k]; FE.attente = x; await feSauverMaintenant('↩️ « ' + n + ' » effacé'); fen.fermer(); feDessiner(); })));
      const r = feEl('div', 'btn-row'); r.appendChild(feBouton('Fermer', '', fen.fermer)); fen.boite.appendChild(r);
    });
    ann.style.marginTop = '14px';
    b.appendChild(ann);
  }
  g2.appendChild(b);
  z.appendChild(g2);
}

/* ============================================================
   ＋ NOUVELLE FORMATION · ⚙️ L'ORGANISME
   ============================================================ */
function feFenetreNouvelle(){
  const fen = feFenetre('＋ Nouvelle formation');
  const b = fen.boite;
  const v = { nom: '' };
  b.appendChild(feChampLibre('Entreprise (le Siret et l’adresse se cherchent ensuite dans 🏢 Entreprise)', v, 'nom', { id: 'feNouvNom' }));
  b.appendChild(feEl('label', 'feLab', 'Formation'));
  let modele = (FE.d.modeles || [])[0] ? FE.d.modeles[0].id : '';
  const zm = feEl('div', 'feOnglets');
  (FE.d.modeles || []).forEach(m => zm.appendChild(fePuce(m.emoji + ' ' + m.nom, m.id === modele, p => { modele = m.id; [...zm.children].forEach(c => c.classList.toggle('on', c === p)); })));
  b.appendChild(zm);
  b.appendChild(feEl('label', 'feLab', 'Financement'));
  let fin = 'opco';
  const zf = feEl('div', 'feChoixFin');
  [['opco', '🏦 Avec un OPCO', 'Les étapes Demande OPCO et Accord OPCO, la lettre pour l’OPCO, le n° de dossier, la part prise en charge.'],
   ['direct', '🏢 Financement direct', 'L’entreprise paie tout, sans OPCO : tout le reste est pareil (devis, convention, présence, attestations).']].forEach(([k, t, d]) => {
    const c = feEl('button', 'feChoix' + (k === fin ? ' on' : '')); c.type = 'button';
    c.append(feEl('b', '', t), feEl('span', '', d));
    c.addEventListener('click', () => { fin = k; [...zf.children].forEach(e => e.classList.toggle('on', e === c)); });
    zf.appendChild(c);
  });
  b.appendChild(zf);
  b.appendChild(feAide('Ça se change ensuite dans 🏢 Entreprise, tant que la convention n’est pas signée.'));
  const r = feEl('div', 'btn-row');
  const go = feBouton('＋ Créer le dossier', 'btn-primary', async () => {
    if(!String(v.nom || '').trim()){ feToast('⚠️ Le nom de l’entreprise ?'); return; }
    go.disabled = true;
    try{
      const m = (FE.d.modeles || []).find(y => y.id === modele) || { id: '', programme: [], prix: [] };
      const d = { financement: fin, entreprise: { nom: String(v.nom).trim() }, opco: fin === 'opco' ? { subrogation: 'entreprise' } : null,
                  formation: { lieu: FE.d.organisme.lieu, effectif: '' }, prix: { lignes: [] }, stagiaires: [], seances: [], suivi: {} };
      feModeleVersDossier(m, d, await feTarifs());
      const rr = await appelPrep({ action: 'formationPoser', donnees: d, journal: '📚 modèle « ' + (m.nom || '') + ' » · ' + (fin === 'opco' ? '🏦 avec un OPCO' : '🏢 financement direct') });
      if(!rr || rr.status !== 'ok') throw new Error((rr && rr.message) || 'Dossier non créé');
      FE.d.formations.unshift(rr.formation);
      fen.fermer();
      feOuvrir(rr.formation.id, 'ent');
    }catch(e){ feToast('⚠️ ' + ((e && e.message) || e)); go.disabled = false; }
  });
  r.append(feBouton('Annuler', '', fen.fermer), go);
  b.appendChild(r);
  setTimeout(() => { const i = $('feNouvNom'); if(i) i.focus(); }, 30);
}
function feFenetreOrganisme(){
  if(!FE.d.admin) return;
  const o = JSON.parse(JSON.stringify(FE.d.organisme));
  const fen = feFenetre('⚙️ L’organisme de formation');
  const b = fen.boite;
  b.appendChild(feAide('Ce qui s’écrit sur chaque document. Administrateurs.'));
  const g = feGrille(200);
  [['N° de certificat Qualiopi', 'qualiopi', 'text', 'feOrgQualiopi'], ['Qualiopi valable jusqu’au', 'qualiopiFin', 'date'], ['N° de déclaration d’activité', 'nda'], ['Région', 'region'],
   ['Raison sociale', 'raison'], ['Nom commercial', 'nomCommercial'], ['Adresse', 'adresse'], ['Siret', 'siret'], ['Signataire', 'signataire'], ['Sa fonction', 'fonction'],
   ['Référent handicap', 'referentHandicap'], ['Lieu de formation par défaut', 'lieu'], ['TVA (%)', 'tva', 'number'], ['Délai de paiement', 'paiement'],
   ['Dédit : jours avant le début', 'deditJours', 'number'], ['Dédit : % du prix dû', 'deditPct', 'number'], ['Tribunal compétent', 'tribunal']]
    .forEach(([l, k, t, id]) => g.appendChild(feChampLibre(l, o, k, { type: t, id: id })));
  b.appendChild(g);
  const lab = feEl('label', 'feLab', '📋 Règlement intérieur (remis avec chaque convocation) — à relire');
  b.appendChild(lab);
  const ta = document.createElement('textarea'); ta.rows = 10; ta.value = o.reglement || '';
  ta.addEventListener('input', () => { o.reglement = ta.value; });
  b.appendChild(ta);
  const r = feEl('div', 'btn-row');
  r.append(feBouton('Annuler', '', fen.fermer), feBouton('✓ Enregistrer', 'btn-primary', async () => {
    try{
      const rr = await appelPrep({ action: 'formationOrganismePoser', organisme: o });
      if(!rr || rr.status !== 'ok') throw new Error((rr && rr.message) || 'Non enregistré');
      if(FE.attente) rr.formations = rr.formations.map(y => y.id === FE.attente.id ? FE.attente : y);
      FE.d = rr; fen.fermer(); feDessiner();
    }catch(e){ feToast('⚠️ ' + ((e && e.message) || e)); }
  }));
  b.appendChild(r);
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-formations.js'] = true;
