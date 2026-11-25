/* Déployé le 25/11/2026 à 16:32 — v1575 */
/* ============================================================
   ec-relances-conduite.js — 📣 LES RELANCES CONDUITE (v1568)

   David, le 25 novembre : « prévois-moi à un endroit une relance des
   élèves qui ne conduisent pas depuis longtemps, ceux qui ont encore
   des cours en stock (Drivup › Facturer) […] met aussi ceux qui n'ont
   pas fait d'examen blanc et qui est à prévoir ou pas loin dans la
   frise », puis : « pas conduit depuis, soit un nombre soit une
   date », « mixer les filtres », « examen blanc passé et suivant le
   résultat, examen prévu, pas encore d'examen blanc, normalement
   examen blanc dans tant de leçons ».

   Ses réponses au schéma (v2) :
   · Élèves › Au quotidien › 📣 Relances (le code viendra au même
     endroit, plus tard) ;
   · des filtres qui se mélangent : tout ce qui est coché à la fois, et
     dans une même ligne de choix, l'un OU l'autre ;
   · ⭐ les filtres gardés, pour toute l'équipe ;
   · le stock = Qte achetée − Fait (les leçons passées) − ce qui est
     posé sur le planning, sur les lignes « Conduite en … » (pas les
     « 30 mn cours de conduite ») ; lu une fois par jour avec le
     planning de sa fiche Drivup (extension 1.7.0) ;
   · « pas conduit » : la voiture, et le simulateur avec un filtre ;
   · mail, messagerie de l'appli et file d'appels — pas de SMS ;
   · le stock et les jours sans conduire dans « Où il en est » de son
     dossier ; rien dans le bandeau « choses à voir ».

   La fenêtre d'envoi est celle de Permis › 📨 Relances (ec-relances.js),
   à qui on passe la liste, le téléphone et les mots à insérer.
   ============================================================ */

/* Les messages de départ (Outils › Ce qu'on écrit, « 📨 Relances ») */
const RC_MODELES = {
  dormeurs: { titre: 'pas conduit depuis…', usage: 'relance_dormeurs',
    defaut: "Objet : On reprend la conduite ?\n\nBonjour {prenom},\n\nÇa fait {jours} jours que tu n’as pas conduit : c’est le bon moment pour reprendre, avant de perdre tes repères 🚗\n{stock}\nVoici des créneaux libres en ce moment :\n{créneaux}\n\nRéserve directement sur Drivup, ou réponds-nous ici et on te le pose.\n\nÀ très vite,\n{signature}" },
  stock: { titre: 'heures en stock à poser', usage: 'relance_stock',
    defaut: "Objet : Tes heures de conduite t’attendent\n\nBonjour {prenom},\n\nIl te reste {heures en stock} de conduite déjà réglées, qui ne sont pas encore posées sur le planning.\n\nVoici des créneaux libres en ce moment :\n{créneaux}\n\nRéserve-les sur Drivup, ou réponds-nous ici et on s’en occupe.\n\nÀ très vite,\n{signature}" },
  eb: { titre: 'examen blanc à prévoir', usage: 'relance_examen_blanc',
    defaut: "Objet : Ton examen blanc approche\n\nBonjour {prenom},\n\nTu en es à ta {leçon} leçon : ton examen blanc arrive. C’est lui qui nous dit combien d’heures il te reste avant le permis, alors pense à le réserver dès maintenant sur Drivup (Examen blanc pratique 1h30).\n\nVoici des créneaux libres en ce moment :\n{créneaux}\n\nÀ très vite,\n{signature}" }
};
const RC_VARIABLES = ['{prenom}', '{jours}', '{stock}', '{heures en stock}', '{créneaux}', '{leçon}', '{moniteur}', '{lien}', '{signature}'];

/* Un filtre vide (ce qu'on voit à la première ouverture : les dormeurs) */
function rcFiltreVide(){
  return { dep: { on: true, mode: 'jours', jours: 15, date: '' }, simu: false, stock: { on: false, h: 2 }, premiere: false,
           pose: [], eb: [], ebDans: 2, ebRes: [], permis: [], permisJours: 21,
           formation: [], agence: [], moniteur: [], relance: [], relanceJours: 7,
           /* 📝 v1572 — David : « j'ai des élèves que je n'ai pas vus depuis 6 ans,
              je n'ai pas besoin de les voir tout de suite » */
           insc: { on: false, mode: 'mois', mois: 18, date: '' } };
}
/* Les filtres gardés au départ — ceux du schéma */
function rcGardesDeDepart(){
  const f = (o) => Object.assign(rcFiltreVide(), { dep: { on: false, mode: 'jours', jours: 15, date: '' } }, o);
  return [
    { id: 'dormeurs', nom: '💤 Dormeurs avec du stock', f: f({ dep: { on: true, mode: 'jours', jours: 21, date: '' }, stock: { on: true, h: 2 }, pose: ['rien'] }) },
    { id: 'ebbientot', nom: '🅱️ Examen blanc bientôt', f: f({ eb: ['dans', 'depasse'], pose: ['rien'] }) },
    { id: 'pasniveau', nom: '🔁 Pas le niveau, rien de posé', f: f({ eb: ['passe'], ebRes: ['pasniveau'], pose: ['rien'] }) },
    { id: 'examen3s', nom: '🎓 Examen dans 3 semaines, rien de posé', f: f({ permis: ['prevu'], permisJours: 21, pose: ['rien'] }) }
  ];
}

const RC = { donnees: null, lu: 0, enCours: null, f: rcFiltreVide(), gardes: null, plus: false, creneaux: null, dossiers: {}, tri: rcTriGarde() };
/* 📝 v1572 — l'ordre de la liste, gardé pour celui qui regarde. David :
   « les plus récents en premier par exemple » : inscrits les plus
   récemment, par défaut. */
function rcTriGarde(){
  try{ const t = localStorage.getItem('rcTri'); if(['insc', 'inscAncien', 'dormeur', 'stock', 'nom'].indexOf(t) !== -1) return t; }catch(e){}
  return 'insc';
}
function rcPoserTri(t){ RC.tri = t; try{ localStorage.setItem('rcTri', t); }catch(e){} }

/* ---------- petites aides ---------- */
const rcEch = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function rcAuj(){ return (typeof todayLocal === 'function') ? todayLocal() : new Date().toISOString().slice(0, 10); }
function rcIso(v){
  const t = String(v || '').trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[0];
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return '';
}
function rcJours(isoA, isoB){
  const a = rcIso(isoA), b = rcIso(isoB);
  if(!a || !b) return null;
  return Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);
}
function rcCourt(iso){ const m = String(iso || '').match(/^\d{4}-(\d{2})-(\d{2})/); return m ? m[2] + '/' + m[1] : ''; }
function rcHeures(h){ const n = Math.round(Number(h || 0) * 10) / 10; return String(n).replace('.', ',') + ' h'; }
function rcRang(n){ return n ? n + (n === 1 ? 're' : 'e') : ''; }
function rcPeutModifier(){ return typeof sectionModifiable !== 'function' || !!sectionModifiable('relances'); }
function rcMoniteurs(){
  return ((typeof moniteursActifs !== 'undefined' && moniteursActifs) || [])
    .map(m => (typeof m === 'string' ? m : (m && (m.nom || m.moniteur)) || '')).filter(Boolean);
}
/* « François A3 n°4 » → le moniteur de l'appli qui y est nommé */
function rcMoniteurDe(t){
  const s = String(t || '').trim();
  if(!s) return '';
  const n = (typeof normaliserMot === 'function') ? normaliserMot(s) : s.toLowerCase();
  const m = rcMoniteurs().slice().sort((a, b) => b.length - a.length).find(x => {
    const k = (typeof normaliserMot === 'function') ? normaliserMot(x) : x.toLowerCase();
    return n === k || n.indexOf(k + ' ') === 0 || n.indexOf(k) === 0;
  });
  return m || s.split(/\s+/)[0];
}

/* ---------- les données : la fiche Drivup résumée par le Worker ---------- */
async function chargerRelancesConduite(forcer){
  if(!forcer && RC.donnees && Date.now() - RC.lu < 120000) return RC.donnees;
  if(RC.enCours) return RC.enCours;
  RC.enCours = (async () => {
    try{
      const attentes = [appelPrep({ action: 'relancesConduite' })];
      if(typeof chargerBureau === 'function' && !(typeof etatBureau !== 'undefined' && etatBureau.eleves && etatBureau.eleves.length)) attentes.push(chargerBureau(false).catch(() => {}));
      if(typeof chargerFiches === 'function') attentes.push(chargerFiches().catch(() => {}));
      if(typeof chargerMoniteurs === 'function' && !rcMoniteurs().length) attentes.push(chargerMoniteurs().catch(() => {}));
      const [r] = await Promise.all(attentes);
      if(!r || r.status === 'error') throw new Error((r && r.message) || 'lecture impossible');
      RC.donnees = r;
      RC.lu = Date.now();
      RC.gardes = Array.isArray(r.filtres) ? r.filtres : rcGardesDeDepart();
      if(typeof assurerPreparations === 'function') assurerPreparations();
      return r;
    }finally{ RC.enCours = null; }
  })();
  return RC.enCours;
}

/* Un élève, avec tout ce que les filtres regardent */
function rcEleve(x){
  const nom = x.eleve;
  const f = (typeof ficheDe === 'function') ? (ficheDe(nom) || {}) : {};
  if(f.formation && typeof formationVoiture === 'function' && !formationVoiture(f.formation)) return null;
  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  if(String(s.resultat || '') === 'obtenu') return null;
  const e = (typeof eleveDuBureau === 'function') ? eleveDuBureau(nom) : null;
  const auj = rcAuj();
  /* sa dernière conduite : sa fiche Drivup › Plannings ; sans elle, son dernier bilan */
  const derBilan = e && rcIso(e.date);
  const derC = (x.conduite && x.conduite.jour) || (x.luLe ? '' : (derBilan || ''));
  const derS = (x.simu && x.simu.jour) || '';
  /* où il en est dans sa frise */
  let faites = null;
  try{
    const p = (typeof positionDeLEleve === 'function') ? positionDeLEleve(nom, e) : null;
    if(p && p.fait && p.fait.total) faites = p.fait.total;
  }catch(err){ /* sans les cours préparés : le rang Drivup */ }
  if(!faites && x.rangDrivup) faites = x.rangDrivup;
  const frise = (typeof friseUtilisable === 'function') ? friseUtilisable(f.frise) : String(f.frise || '');
  const avantEB = (frise && typeof leconsAvantExamenBlanc === 'function') ? leconsAvantExamenBlanc(frise) : null;
  const apresEB = (frise && typeof leconsApresExamenBlanc === 'function') ? leconsApresExamenBlanc(frise) : null;
  /* l'examen blanc */
  const etat = (e && e.etat) || {};
  const ebDate = (typeof dateExamenBlancDuSuivi === 'function') ? rcIso(dateExamenBlancDuSuivi(nom, etat)) : '';
  const ebPasse = ebDate || x.ebPasse || (etat.examBlanc === 'passe' ? '?' : '');
  const niv = String(s.ebNiveau || '').toLowerCase();
  const ebRes = !ebPasse ? '' : niv === 'non' ? 'pasniveau' : niv === 'peut' ? 'pourrait' : (niv === 'oui' ? 'niveau' : '');
  const prevueEB = rcIso(s.ebDatePrevue);
  const ebPose = (prevueEB && prevueEB >= auj ? prevueEB : '') || ((x.venir && x.venir.eb) || '') || (etat.examBlanc === 'reserve' ? '?' : '');
  const dans = (avantEB !== null && faites !== null) ? avantEB - faites : null;
  /* le permis */
  const dates = (typeof datesExamenDe === 'function') ? datesExamenDe(nom) : [];
  const dateEx = (dates || []).find(d => d >= auj) || (x.venir && x.venir.examen) || '';
  const boite = (typeof boiteDeLaFormation === 'function') ? String(boiteDeLaFormation(f.formation) || '').toUpperCase() : '';
  const agence = (typeof agenceDe === 'function' ? agenceDe(nom) : '') || String(f.agence || '');
  const moniteur = rcMoniteurDe((x.conduite && (x.conduite.ressource || x.conduite.moniteur)) ||
    (x.venir && x.venir.prochain && (x.venir.prochain.ressource || x.venir.prochain.moniteur)) || (e && e.moniteur) || '');
  const rel = (typeof rlRelances === 'function') ? (rlRelances(nom).conduite || null) : null;
  return {
    nom: nom, x: x, f: f, s: s, formation: String(f.formation || ''), boite: boite, agence: agence, moniteur: moniteur,
    derC: derC, derS: derS, joursC: derC ? rcJours(derC, auj) : null, joursS: derS ? rcJours(derS, auj) : null,
    stock: x.stock ? x.stock.heures : null, stockLu: !!x.stock,
    posees: (x.venir && x.venir.conduites) || 0, prochain: (x.venir && x.venir.prochain) || null,
    premiere: !derC && !(x.nbConduites > 0) && !faites,
    faites: faites, frise: frise, avantEB: avantEB, apresEB: apresEB, dans: dans,
    ebPasse: ebPasse, ebRes: ebRes, ebPose: ebPose, dateEx: dateEx,
    ajourne: String(s.resultat || '') === 'ajourne', rel: rel, luLe: x.luLe || 0,
    /* 📝 v1572 — sa date d'inscription dans Drivup (la liste des élèves) */
    inscription: rcIso(x.inscription)
  };
}

/* ---------- les filtres ---------- */
function rcPasse(g, F){
  const auj = rcAuj();
  /* 💤 pas conduit depuis */
  if(F.dep && F.dep.on){
    let der = F.simu ? [g.derC, g.derS].filter(Boolean).sort().pop() || '' : g.derC;
    /* 📝 v1575 — JAMAIS CONDUIT (que du code, des tablettes, du simulateur) :
       David, le 25/11 : « je devrais avoir beaucoup plus de monde » → ils
       comptent aussi, depuis leur inscription, ou leur dernier simulateur
       s'il est plus récent. Sans date d'inscription lue : il reste. */
    if(!g.derC) der = [g.inscription, g.derS].filter(Boolean).sort().pop() || '';
    if(der){
      if(F.dep.mode === 'date'){
        if(F.dep.date && !(der < F.dep.date)) return false;
      }else{
        const j = rcJours(der, auj);
        if(j === null || j < Math.max(0, Number(F.dep.jours) || 0)) return false;
      }
    }
  }
  if(F.stock && F.stock.on){
    if(g.stock === null || g.stock <= 0 || g.stock < (Number(F.stock.h) || 0)) return false;
  }
  if(F.premiere && !g.premiere) return false;
  if(F.pose && F.pose.length){
    const ok = (F.pose.indexOf('rien') !== -1 && !g.posees) || (F.pose.indexOf('posees') !== -1 && g.posees > 0);
    if(!ok) return false;
  }
  if(F.eb && F.eb.length){
    const n = Number(F.ebDans);
    const ok = F.eb.some(k =>
      (k === 'pasEncore' && !g.ebPasse && !g.ebPose) ||
      (k === 'dans' && !g.ebPasse && !g.ebPose && g.dans !== null && g.dans >= 0 && g.dans <= (isNaN(n) ? 2 : n)) ||
      (k === 'depasse' && !g.ebPasse && !g.ebPose && g.dans !== null && g.dans < 0) ||
      (k === 'pose' && !g.ebPasse && !!g.ebPose) ||
      (k === 'passe' && !!g.ebPasse));
    if(!ok) return false;
  }
  if(F.ebRes && F.ebRes.length && F.ebRes.indexOf(g.ebRes) === -1) return false;
  if(F.permis && F.permis.length){
    const j = g.dateEx ? rcJours(auj, g.dateEx) : null;
    const ok = F.permis.some(k =>
      (k === 'pasDate' && !g.dateEx) ||
      (k === 'prevu' && !!g.dateEx && j !== null && j <= (Number(F.permisJours) || 21)) ||
      (k === 'ajourne' && g.ajourne && !g.dateEx));
    if(!ok) return false;
  }
  if(F.formation && F.formation.length){
    const t = g.formation;
    const ok = F.formation.some(k =>
      (k === 'BEA' && g.boite === 'BEA') || (k === 'BV' && g.boite === 'BV') ||
      (k === 'AAC' && /^AAC\b/i.test(t)) || (k === 'CS' && /^CS\b|supervis/i.test(t)) || (k === 'AE' && /autre AE/i.test(t)));
    if(!ok) return false;
  }
  if(F.agence && F.agence.length){
    const loud = /loud/i.test(g.agence);
    if(!F.agence.some(k => (k === 'loudeac' && loud) || (k === 'sb' && !loud))) return false;
  }
  if(F.moniteur && F.moniteur.length && F.moniteur.indexOf(g.moniteur) === -1) return false;
  /* 📝 v1572 — inscrit depuis peu. Sans date d'inscription lue, l'élève
     reste (David : « on le met quand même »). */
  if(F.insc && F.insc.on && g.inscription){
    if(F.insc.mode === 'date'){
      if(F.insc.date && g.inscription < F.insc.date) return false;
    }else{
      const n = Math.max(0, Number(F.insc.mois) || 0);
      const lim = new Date(Date.UTC(+auj.slice(0, 4), +auj.slice(5, 7) - 1 - n, +auj.slice(8, 10))).toISOString().slice(0, 10);
      if(g.inscription < lim) return false;
    }
  }
  if(F.relance && F.relance.length){
    const j = g.rel && g.rel.le ? rcJours(g.rel.le, auj) : null;
    const ok = F.relance.some(k => (k === 'jamais' && !g.rel) || (k === 'depuis' && (!g.rel || (j !== null && j >= (Number(F.relanceJours) || 0)))));
    if(!ok) return false;
  }
  return true;
}
function rcListe(){
  const r = RC.donnees;
  if(!r) return [];
  const dormeur = (a, b) => ((b.joursC === null ? -1 : b.joursC) - (a.joursC === null ? -1 : a.joursC));
  const nom = (a, b) => a.nom.localeCompare(b.nom, 'fr');
  /* 📝 v1572 — sans date d'inscription : en bas, quel que soit le sens */
  const insc = sens => (a, b) => (!a.inscription - !b.inscription) || (sens * (a.inscription < b.inscription ? -1 : a.inscription > b.inscription ? 1 : 0));
  const tri = { insc: insc(-1), inscAncien: insc(1), dormeur: dormeur, stock: (a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0), nom: nom }[RC.tri] || dormeur;
  return (r.eleves || []).map(rcEleve).filter(Boolean).filter(g => rcPasse(g, RC.f))
    .sort((a, b) => tri(a, b) || dormeur(a, b) || nom(a, b));
}

/* Ce que dit le filtre, en une ligne */
function rcResume(F){
  const b = [];
  if(F.dep && F.dep.on) b.push('pas conduit' + (F.simu ? ' (simulateur compris)' : '') + ' depuis ' +
    (F.dep.mode === 'date' ? (F.dep.date ? 'le ' + rcCourt(F.dep.date) : '…') : (Number(F.dep.jours) || 0) + ' jours') +
    ' (ceux qui n’ont jamais conduit : depuis leur inscription)');
  if(F.stock && F.stock.on) b.push('au moins ' + rcHeures(F.stock.h) + ' en stock');
  if(F.premiere) b.push('1re leçon pas encore faite');
  const n = { rien: 'rien de posé', posees: 'des leçons posées', pasEncore: 'pas encore d’examen blanc', dans: 'examen blanc dans ' + F.ebDans + ' leçons ou moins',
              depasse: 'frise dépassée', pose: 'examen blanc posé', passe: 'examen blanc passé', niveau: 'a le niveau', pourrait: 'pourrait', pasniveau: 'pas le niveau',
              pasDate: 'pas de date d’examen', prevu: 'examen dans moins de ' + F.permisJours + ' jours', ajourne: 'ajourné sans repassage',
              BEA: 'BEA', BV: 'BV', AAC: 'AAC', CS: 'CS', AE: 'autre AE', sb: 'Saint-Brieuc', loudeac: 'Loudéac',
              depuis: 'pas relancé depuis ' + F.relanceJours + ' jours', jamais: 'jamais relancé' };
  ['pose', 'eb', 'ebRes', 'permis', 'formation', 'agence', 'relance'].forEach(k => {
    if(F[k] && F[k].length) b.push(F[k].map(x => n[x] || x).join(' ou '));
  });
  if(F.moniteur && F.moniteur.length) b.push('avec ' + F.moniteur.join(' ou '));
  if(F.insc && F.insc.on) b.push(F.insc.mode === 'date' ? 'inscrit depuis ' + (F.insc.date ? 'le ' + rcCourt(F.insc.date) : '…') : 'inscrit il y a moins de ' + (Number(F.insc.mois) || 0) + ' mois');
  return b.join(' · ') || 'tous les élèves en formation';
}

/* ---------- ce qu'on lit sur chaque ligne ---------- */
function rcLignes(g){
  const l1 = [], l2 = [];
  /* 📝 v1572 */
  if(g.inscription) l1.push('📝 inscrit le ' + g.inscription.split('-').reverse().join('/'));
  if(g.joursC !== null) l1.push('💤 ' + (g.joursC === 0 ? 'a conduit aujourd’hui' : g.joursC + ' jour' + (g.joursC > 1 ? 's' : '') + ' (' + rcCourt(g.derC) + ')'));
  else l1.push(g.premiere ? '🚗 pas encore conduit' : '💤 dernière conduite inconnue');
  if(RC.f.simu && g.derS) l1.push('🕹️ simulateur le ' + rcCourt(g.derS));
  l1.push(g.stockLu ? (g.stock > 0 ? '📦 ' + rcHeures(g.stock) + ' en stock' : '📦 rien en stock') : '📦 stock pas encore lu');
  l1.push([g.formation || g.boite, g.moniteur].filter(Boolean).join(' · '));
  if(g.faites) l2.push('frise : ' + rcRang(g.faites) + ' leçon' + (g.avantEB !== null ? ' sur ' + (g.avantEB + (g.apresEB || 0)) : ''));
  if(g.ebPasse) l2.push('🅱️ examen blanc' + (rcCourt(g.ebPasse) ? ' le ' + rcCourt(g.ebPasse) : ' passé') + ' : ' +
    ({ niveau: 'a le niveau', pourrait: 'pourrait', pasniveau: 'pas le niveau' }[g.ebRes] || 'résultat pas noté') +
    (g.ebRes === 'pasniveau' && g.s.heuresRestantes ? ' (' + g.s.heuresRestantes + ' à faire)' : ''));
  else if(g.ebPose) l2.push('🅱️ examen blanc posé' + (rcCourt(g.ebPose) ? ' le ' + rcCourt(g.ebPose) : ''));
  else if(g.dans !== null) l2.push(g.dans < 0 ? '🅱️ frise dépassée, pas d’examen blanc' : '🅱️ examen blanc normalement dans ' + g.dans + ' leçon' + (g.dans > 1 ? 's' : ''));
  else l2.push('pas encore d’examen blanc');
  if(g.dateEx) l2.push('🎓 examen le ' + rcCourt(g.dateEx));
  else if(g.ajourne) l2.push('❌ ajourné, pas de repassage posé');
  l2.push(g.posees ? '🗓️ ' + g.posees + ' leçon' + (g.posees > 1 ? 's' : '') + ' posée' + (g.posees > 1 ? 's' : '') + (g.prochain ? ', la prochaine le ' + rcCourt(g.prochain.jour) : '') : 'rien de posé');
  l2.push(g.rel ? 'relancé' + (g.rel.n > 1 ? ' ' + g.rel.n + ' fois' : '') + ' le ' + (typeof rlJour === 'function' ? rlJour(g.rel.le) : g.rel.le) + (g.rel.par ? ' par ' + g.rel.par : '') : 'jamais relancé');
  return { l1: l1.filter(Boolean).join(' · '), l2: l2.filter(Boolean).join(' · '),
           court: [g.joursC !== null ? '💤 ' + g.joursC + ' j' : '', g.stock > 0 ? '📦 ' + rcHeures(g.stock) : ''].filter(Boolean).join(' · ') };
}

/* ---------- les mots à insérer ---------- */
async function chargerCreneauxRc(){
  try{ if(typeof chargerCreneaux === 'function') RC.creneaux = await chargerCreneaux(false); }catch(e){ RC.creneaux = null; }
}
function rcCreneauxDe(g){
  const c = RC.creneaux;
  if(!c || !c.lecture || typeof creneauxCalcules !== 'function') return '';
  const auj = rcAuj();
  const b = g.boite === 'BEA' ? 'bea' : g.boite === 'BV' ? 'bv' : '';
  const lieu = /loud/i.test(g.agence) ? 'loudeac' : 'sb';
  const l = creneauxCalcules(c.lecture, c.horaires || {})
    .filter(x => ['ouvert', 'rien', 'dispo'].indexOf(x.genre) !== -1 && x.jour > auj)
    .filter(x => !(typeof creneauMasque === 'function' && creneauMasque(x)))
    .filter(x => !b || !x.boite || x.boite === b)
    .filter(x => !x.agence || x.agence === lieu)
    .slice(0, 3);
  return l.map(x => '• ' + (typeof jourLongCreneau === 'function' ? jourLongCreneau(x.jour) : x.jour) + ' de ' +
    (typeof heureLisibleCreneau === 'function' ? heureLisibleCreneau(x.debut) + ' à ' + heureLisibleCreneau(x.fin) : x.debut + ' à ' + x.fin) +
    (x.moniteur ? ' avec ' + x.moniteur : '')).join('\n');
}
function rcRemplir(texte, nom){
  const g = (RC.parNom && RC.parNom[nom]) || null;
  if(!g) return texte;
  const cren = rcCreneauxDe(g) || '• regarde les disponibilités sur Drivup, ou demande-nous';
  return String(texte || '')
    .replace(/\{jours\}/gi, g.joursC !== null ? String(g.joursC) : 'plusieurs')
    .replace(/\{stock\}\n?/gi, g.stock > 0 ? 'Il te reste ' + rcHeures(g.stock) + ' de conduite déjà réglées.\n' : '')
    .replace(/\{heures en stock\}/gi, g.stock > 0 ? rcHeures(g.stock) : 'quelques heures')
    .replace(/\{cr[ée]neaux\}/gi, cren)
    .replace(/\{le[çc]on\}/gi, g.faites ? rcRang(g.faites) : 'dernière')
    .replace(/\{moniteur\}/gi, g.moniteur || 'ton moniteur');
}
/* Le message de départ qui va avec le filtre */
function rcModeleDuFiltre(F){
  if(F.eb && F.eb.length && !(F.dep && F.dep.on)) return RC_MODELES.eb;
  if(F.stock && F.stock.on && !(F.dep && F.dep.on)) return RC_MODELES.stock;
  return RC_MODELES.dormeurs;
}

/* ---------- l'écran ---------- */
function rcStyle(){
  if(document.getElementById('rcCss')) return;
  const st = document.createElement('style');
  st.id = 'rcCss';
  st.textContent = `
.rcSw{ display:flex; gap:7px; flex-wrap:wrap; margin-bottom:12px; }
.rcTit{ font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); font-weight:800; margin:0 0 6px; }
.rcTit span{ text-transform:none; letter-spacing:0; font-weight:600; }
.rcCh{ width:auto !important; flex:none; white-space:nowrap; margin:0 !important; padding:5px 11px !important; font-size:12.5px !important; border-radius:999px !important; font-weight:700; }
.rcCh.on{ background:var(--orange-soft) !important; border:1px solid var(--orange) !important; color:var(--on-accent) !important; }
.rcGardes{ display:flex; gap:7px; flex-wrap:wrap; align-items:center; margin-bottom:14px; }
.rcPanneau{ border:1px solid var(--line); border-radius:14px; overflow:hidden; margin-bottom:12px; }
.rcFam{ display:grid; grid-template-columns:150px 1fr; gap:8px 12px; align-items:start; padding:10px 12px; border-bottom:1px solid var(--line); }
.rcFam:last-child{ border-bottom:none; }
.rcFam > b{ font-size:13.5px; padding-top:4px; }
.rcFam > div{ display:flex; flex-direction:column; gap:7px; min-width:0; }
.rcRang{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; font-size:13px; }
.rcRang input{ margin:0 !important; padding:4px 7px !important; font-size:13px !important; }
.rcRang input[type=number]{ width:64px !important; }
.rcRang input[type=date]{ width:auto !important; }
.rcRes{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px; }
.rcRes > span:first-child{ font-size:15px; font-weight:800; }
.rcRes small{ font-size:12.5px; color:var(--muted); flex:1; min-width:180px; }
.rcRes .rcTri{ width:auto; margin:0; padding:6px 10px; font-size:13px; max-width:100%; }
.rcRes .btn{ width:auto !important; margin:0 !important; }
.rcL{ display:flex; gap:10px; align-items:center; padding:9px 12px; border-bottom:1px solid var(--line); }
.rcL:last-child{ border-bottom:none; }
.rcL .rlLt b{ display:inline-flex; align-items:center; }
.rcPied{ margin-top:10px; font-size:12.5px; color:var(--muted); line-height:1.5; }
@media (max-width:560px){ .rcFam{ grid-template-columns:1fr; } }
`;
  document.head.appendChild(st);
}
function rcChip(on, txt, faire, titre){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-secondary rcCh' + (on ? ' on' : '');
  b.textContent = txt;
  if(titre) b.title = titre;
  b.addEventListener('click', faire);
  return b;
}
function rcNombre(v, apres, poser, min){
  const s = document.createElement('span');
  s.style.cssText = 'display:inline-flex;align-items:center;gap:5px;';
  const i = document.createElement('input');
  i.type = 'number'; i.min = String(min || 0); i.value = String(v);
  i.addEventListener('change', () => { poser(Math.max(min || 0, Number(i.value) || 0)); dessinerRelancesConduite(); });
  s.append(i, document.createTextNode(apres));
  return s;
}
function rcBascule(liste, cle){
  const i = liste.indexOf(cle);
  if(i === -1) liste.push(cle); else liste.splice(i, 1);
}
function rcMemeFiltre(a, b){ return JSON.stringify(a) === JSON.stringify(Object.assign(rcFiltreVide(), b)); }

async function afficherRelancesConduite(){
  const z = document.getElementById('relancesConduiteZone');
  if(!z) return;
  rcStyle();
  if(typeof rlStyle === 'function') rlStyle();   /* les lignes et les boutons des relances du permis */
  if(!RC.donnees) z.innerHTML = '<div class="empty">Lecture…</div>';
  try{ await chargerRelancesConduite(); }
  catch(e){ z.innerHTML = '<div class="empty">⚠️ ' + rcEch((e && e.message) || e) + '</div>'; return; }
  dessinerRelancesConduite();
}
function dessinerRelancesConduite(){
  const z = document.getElementById('relancesConduiteZone');
  if(!z || !RC.donnees) return;
  const F = RC.f;
  const refaire = () => { RC.plus = false; dessinerRelancesConduite(); };
  z.textContent = '';
  /* 🚗 Conduite · 🎓 Code (plus tard) */
  const sw = document.createElement('div');
  sw.className = 'rcSw';
  sw.appendChild(rcChip(true, '🚗 Conduite', () => {}));
  const code = rcChip(false, '🎓 Code · plus tard', () => {});
  code.disabled = true; code.style.opacity = '.6';
  sw.appendChild(code);
  z.appendChild(sw);
  /* ⭐ les filtres gardés */
  const t1 = document.createElement('div');
  t1.className = 'rcTit'; t1.textContent = '⭐ Filtres gardés';
  z.appendChild(t1);
  const gd = document.createElement('div');
  gd.className = 'rcGardes';
  const gardes = RC.gardes || rcGardesDeDepart();
  let actif = null;
  gardes.forEach(x => {
    const on = rcMemeFiltre(F, x.f);
    if(on) actif = x;
    gd.appendChild(rcChip(on, x.nom, () => { RC.f = Object.assign(rcFiltreVide(), JSON.parse(JSON.stringify(x.f))); refaire(); }));
  });
  if(rcPeutModifier()){
    gd.appendChild(rcChip(false, '＋ Garder ce filtre', async () => {
      const nom = (typeof demander === 'function') ? await demander('Son nom, pour toute l’équipe (un émoji au début aide à le retrouver)', '', '⭐ Garder ce filtre') : '';
      if(!nom || !String(nom).trim()) return;
      await rcPoserGardes(gardes.concat([{ id: 'f' + Date.now().toString(36), nom: String(nom).trim().slice(0, 60), f: JSON.parse(JSON.stringify(F)) }]), '⭐ Filtre gardé');
    }));
    if(actif){
      const x = actif;
      const r = document.createElement('button');
      r.type = 'button'; r.className = 'rlMini'; r.textContent = '✕ Retirer « ' + x.nom + ' »';
      r.style.marginLeft = '0';
      r.addEventListener('click', async () => {
        if(typeof confirmer === 'function' && !(await confirmer('Retirer le filtre gardé « ' + x.nom + ' » pour toute l’équipe ?', 'Filtres gardés', true))) return;
        await rcPoserGardes(gardes.filter(y => y.id !== x.id), 'Filtre retiré');
      });
      gd.appendChild(r);
    }
  }
  z.appendChild(gd);
  /* 🔎 qui relancer ? */
  const t2 = document.createElement('div');
  t2.className = 'rcTit';
  t2.innerHTML = '🔎 Qui relancer ? <span>— tout ce qui est coché à la fois ; dans une même ligne de choix, l’un OU l’autre</span>';
  z.appendChild(t2);
  const pan = document.createElement('div');
  pan.className = 'rcPanneau';
  const famille = (titre, rangs) => {
    const d = document.createElement('div');
    d.className = 'rcFam';
    const b = document.createElement('b'); b.textContent = titre;
    const c = document.createElement('div');
    rangs.forEach(r => { const x = document.createElement('div'); x.className = 'rcRang'; r.filter(Boolean).forEach(el => x.append(el)); c.appendChild(x); });
    d.append(b, c);
    pan.appendChild(d);
  };
  const txt = (t) => document.createTextNode(t);
  const ch = (liste, cle, t) => rcChip(F[liste].indexOf(cle) !== -1, t, () => { rcBascule(F[liste], cle); refaire(); });
  if(!F.insc) F.insc = rcFiltreVide().insc;
  const inscIn = document.createElement('input');
  inscIn.type = 'date'; inscIn.value = F.insc.date || '';
  inscIn.setAttribute('aria-label', 'Inscrit depuis le');
  inscIn.addEventListener('change', () => { F.insc.date = inscIn.value; refaire(); });
  const dateIn = document.createElement('input');
  dateIn.type = 'date'; dateIn.value = F.dep.date || '';
  dateIn.addEventListener('change', () => { F.dep.date = dateIn.value; refaire(); });
  famille('🚗 Conduite', [
    [rcChip(F.dep.on, '💤 Pas conduit depuis', () => { F.dep.on = !F.dep.on; refaire(); }),
     F.dep.on ? rcChip(F.dep.mode === 'jours', 'nombre de jours', () => { F.dep.mode = 'jours'; refaire(); }) : null,
     F.dep.on ? rcChip(F.dep.mode === 'date', 'date', () => { F.dep.mode = 'date'; if(!F.dep.date) F.dep.date = rcAuj(); refaire(); }) : null,
     F.dep.on ? (F.dep.mode === 'jours' ? rcNombre(F.dep.jours, ' jours', v => { F.dep.jours = v; }) : (dateIn)) : null,
     F.dep.on ? rcChip(F.simu, '🕹️ compter aussi le simulateur', () => { F.simu = !F.simu; refaire(); }) : null],
    [rcChip(F.stock.on, '📦 Leçons en stock', () => { F.stock.on = !F.stock.on; refaire(); }),
     F.stock.on ? txt('au moins') : null, F.stock.on ? rcNombre(F.stock.h, ' h', v => { F.stock.h = v; }) : null],
    [ch('pose', 'rien', '🗓️ Rien de posé sur Drivup'), ch('pose', 'posees', '🗓️ Leçons posées'),
     rcChip(F.premiere, '1re leçon pas encore faite', () => { F.premiere = !F.premiere; refaire(); })]
  ]);
  famille('🅱️ Examen blanc', [
    [ch('eb', 'pasEncore', 'Pas encore d’examen blanc'), ch('eb', 'dans', 'Normalement dans'), rcNombre(F.ebDans, ' leçons ou moins', v => { F.ebDans = v; }),
     ch('eb', 'depasse', 'Frise dépassée')],
    [ch('eb', 'pose', '📅 Examen blanc posé'), ch('eb', 'passe', '✅ Examen blanc passé'),
     F.eb.indexOf('passe') !== -1 ? txt('résultat :') : null,
     F.eb.indexOf('passe') !== -1 ? ch('ebRes', 'niveau', 'A le niveau') : null,
     F.eb.indexOf('passe') !== -1 ? ch('ebRes', 'pourrait', 'Pourrait') : null,
     F.eb.indexOf('passe') !== -1 ? ch('ebRes', 'pasniveau', 'Pas le niveau') : null]
  ]);
  famille('🎓 Permis', [
    [ch('permis', 'pasDate', 'Pas de date d’examen'), ch('permis', 'prevu', '📅 Examen prévu dans moins de'),
     rcNombre(F.permisJours, ' jours', v => { F.permisJours = v; }, 1), ch('permis', 'ajourne', '❌ Ajourné, pas de repassage posé')]
  ]);
  const mons = rcMoniteurs();
  famille('👤 Élève', [
    [rcChip(!F.formation.length, 'Toutes formations', () => { F.formation = []; refaire(); }),
     ch('formation', 'BEA', 'BEA'), ch('formation', 'BV', 'BV'), ch('formation', 'AAC', 'AAC'), ch('formation', 'CS', 'CS'), ch('formation', 'AE', 'Autre AE')],
    [rcChip(!F.agence.length, 'Les deux agences', () => { F.agence = []; refaire(); }), ch('agence', 'sb', 'Saint-Brieuc'), ch('agence', 'loudeac', 'Loudéac')],
    [rcChip(!F.moniteur.length, 'Tous les moniteurs', () => { F.moniteur = []; refaire(); })].concat(mons.map(m => ch('moniteur', m, m))),
    [ch('relance', 'depuis', 'Pas relancé depuis'), rcNombre(F.relanceJours, ' jours', v => { F.relanceJours = v; }), ch('relance', 'jamais', 'Jamais relancé')],
    /* 📝 v1572 — inscrit il y a moins de N mois, ou depuis une date */
    [rcChip(F.insc.on, '📝 Inscrit il y a moins de', () => { F.insc.on = !F.insc.on; refaire(); }, 'Sa date d’inscription dans Drivup ; sans date lue, l’élève reste'),
     F.insc.on ? rcChip(F.insc.mode === 'mois', 'nombre de mois', () => { F.insc.mode = 'mois'; refaire(); }) : null,
     F.insc.on ? rcChip(F.insc.mode === 'date', 'date', () => { F.insc.mode = 'date'; if(!F.insc.date) F.insc.date = rcAuj().slice(0, 4) + '-01-01'; refaire(); }) : null,
     F.insc.on ? (F.insc.mode === 'mois' ? rcNombre(F.insc.mois, ' mois', v => { F.insc.mois = v; }, 1) : inscIn) : null]
  ]);
  z.appendChild(pan);
  const tout = document.createElement('div');
  tout.style.cssText = 'margin:-4px 0 12px;';
  const raz = rcChip(false, '↺ Tout décocher', () => { RC.f = Object.assign(rcFiltreVide(), { dep: { on: false, mode: 'jours', jours: 15, date: '' } }); refaire(); });
  tout.appendChild(raz);
  z.appendChild(tout);

  /* le résultat */
  const liste = rcListe();
  RC.parNom = {};
  liste.forEach(g => { RC.parNom[g.nom] = g; });
  const res = document.createElement('div');
  res.className = 'rcRes';
  res.innerHTML = '<span>' + liste.length + ' élève' + (liste.length > 1 ? 's' : '') + '</span><small>' + rcEch(rcResume(F)) + '</small>';
  const bR = document.createElement('button');
  bR.type = 'button'; bR.className = 'btn btn-primary';
  bR.textContent = '📨 Relancer ' + (liste.length > 1 ? 'ces ' + liste.length + ' élèves' : liste.length ? 'cet élève' : '') + ' ›';
  bR.disabled = !liste.length || !rcPeutModifier();
  if(!rcPeutModifier()) bR.title = 'Il faut le droit « 📣 Relances conduite » en modification';
  bR.addEventListener('click', () => ouvrirRelanceConduite(liste));
  /* 📝 v1572 — l'ordre de la liste */
  const tri = document.createElement('select');
  tri.className = 'rcTri';
  tri.setAttribute('aria-label', 'Trier la liste');
  [['insc', '↓ Inscrit le plus récemment'], ['inscAncien', '↑ Inscrit le plus anciennement'], ['dormeur', '💤 Pas conduit depuis le plus longtemps'],
   ['stock', '📦 Le plus d’heures en stock'], ['nom', '🔤 Nom']].forEach(([v, t]) => {
    const o = document.createElement('option'); o.value = v; o.textContent = 'Trier : ' + t; if(RC.tri === v) o.selected = true; tri.appendChild(o);
  });
  tri.addEventListener('change', () => { rcPoserTri(tri.value); RC.plus = false; dessinerRelancesConduite(); });
  res.append(tri, bR);
  z.appendChild(res);
  if(liste.length){
    const box = document.createElement('div');
    box.className = 'rlListe';
    box.style.maxHeight = 'none';
    const max = RC.plus ? liste.length : 60;
    liste.slice(0, max).forEach(g => {
      const l = rcLignes(g);
      const d = document.createElement('div');
      d.className = 'rcL';
      const t = document.createElement('span');
      t.className = 'rlLt';
      const b = document.createElement('b');
      b.textContent = g.nom;
      if(typeof poserDossierApresLeNom === 'function') poserDossierApresLeNom(b, g.nom);
      const s1 = document.createElement('span'); s1.textContent = l.l1;
      const s2 = document.createElement('span'); s2.textContent = l.l2;
      t.append(b, s1, s2);
      d.appendChild(t);
      box.appendChild(d);
    });
    z.appendChild(box);
    if(liste.length > max){
      const p = rcChip(false, 'Voir les ' + (liste.length - max) + ' autres', () => { RC.plus = true; dessinerRelancesConduite(); });
      p.style.marginTop = '8px';
      z.appendChild(p);
    }
  }else{
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = '🎉 Personne avec ces filtres.';
    z.appendChild(v);
  }
  /* d'où ça vient */
  const el = RC.donnees.eleves || [];
  const auj = RC.donnees.auj || rcAuj();
  const jourDe = t => t ? new Date(Number(t)).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }) : '';
  const lus = el.filter(x => x.luLe).length, duJour = el.filter(x => jourDe(x.luLe) === auj).length, stock = el.filter(x => x.stock).length, insc = el.filter(x => x.inscription).length;
  const pied = document.createElement('div');
  pied.className = 'rcPied';
  pied.textContent = '🔄 Lu dans sa fiche Drivup (Plannings, Facturer), une fois par jour par la lecture automatique : ' +
    lus + ' élève' + (lus > 1 ? 's' : '') + ' en formation sur ' + el.length + ' (' + duJour + ' aujourd’hui) · stock lu pour ' + stock +
    (stock < lus ? ' (il faut l’extension « App EC · Drivup » 1.7.0)' : '') + ' · date d’inscription lue pour ' + insc +
    (insc < lus ? ' (toutes d’un coup avec l’extension 1.8.2)' : '') + '. Les permis obtenus et les élèves partis n’y sont pas.';
  const re = document.createElement('button');
  re.type = 'button'; re.className = 'rlMini'; re.textContent = '↻ Relire';
  re.style.marginLeft = '8px';
  re.addEventListener('click', async () => { re.disabled = true; try{ await chargerRelancesConduite(true); }catch(e){} dessinerRelancesConduite(); });
  pied.appendChild(re);
  z.appendChild(pied);
}
async function rcPoserGardes(l, dire){
  try{
    const r = await appelPrep({ action: 'relancesFiltresPoser', filtres: l });
    if(r && r.status === 'error') throw new Error(r.message || 'refusé');
    RC.gardes = (r && r.filtres) || l;
    if(dire && typeof showToast === 'function') showToast(dire);
  }catch(e){ if(typeof showToast === 'function') showToast('⚠️ Pas enregistré : ' + ((e && e.message) || e)); }
  dessinerRelancesConduite();
}

/* La fenêtre d'envoi : celle des relances du permis (ec-relances.js) */
function ouvrirRelanceConduite(liste){
  if(typeof ouvrirRelance !== 'function') return;
  const m = rcModeleDuFiltre(RC.f);
  const t = {
    ic: '📣', titre: rcResume(RC.f), usage: m.usage, defaut: m.defaut, cle: 'conduite', appels: true, variables: RC_VARIABLES,
    candidats: () => liste.map(g => { const l = rcLignes(g); return { nom: g.nom, l1: l.l1, l2: l.l2, court: l.court }; }),
    remplir: rcRemplir, charger: chargerCreneauxRc,
    apres: () => { RC.lu = 0; afficherRelancesConduite(); }
  };
  ouvrirRelance('conduite', t);
}

/* ---------- 📂 la tuile « Où il en est » de son dossier ---------- */
function lignesConduiteDossier(nom){
  const c = RC.dossiers[nom];
  if(!c || !c.resume) return [];
  const x = c.resume, auj = rcAuj();
  const out = [];
  if(x.stock) out.push({ ton: x.stock.heures > 0 ? 'vert' : '', txt: x.stock.heures > 0 ? '📦 ' + rcHeures(x.stock.heures) + ' de conduite en stock' : '📦 rien en stock' });
  const der = x.conduite && x.conduite.jour;
  if(der){
    const j = rcJours(der, auj);
    const pose = x.venir && x.venir.conduites;
    out.push({ ton: j >= 15 && !pose ? 'warn' : '', txt: (j === 0 ? '🚗 a conduit aujourd’hui' : '💤 ' + j + ' jour' + (j > 1 ? 's' : '') + ' sans conduire') +
      (pose ? ' · prochaine le ' + rcCourt(x.venir.prochain && x.venir.prochain.jour) : ' · rien de posé') });
  }
  const r = (typeof rlRelances === 'function') ? rlRelances(nom).conduite : null;
  if(r) out.push({ ton: 'bas', txt: '📣 Relancé le ' + (typeof rlJour === 'function' ? rlJour(r.le) : r.le) + (r.par ? ' par ' + r.par : '') +
    (r.via ? ' (' + String(r.via).replace('appli', 'messagerie').replace('appel', 'appel').split(',').join(', ') + ')' : '') });
  return out;
}
async function chargerConduiteDossier(nom){
  const c = RC.dossiers[nom];
  if(c && Date.now() - c.lu < 300000) return false;
  RC.dossiers[nom] = { lu: Date.now(), resume: c ? c.resume : null };
  try{
    const r = await appelPrep({ action: 'relancesConduiteEleve', eleve: nom });
    RC.dossiers[nom].resume = (r && r.resume) || null;
    return true;
  }catch(e){ return false; }
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-relances-conduite.js'] = true;
