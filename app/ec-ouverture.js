/* Déployé le 25/11/2026 à 15:51 — v1574 */
/* ============================================================
   ec-ouverture.js — 📅 GESTION › OUVERTURE DES COURS (v1572)

   David, le 25 novembre 2026 : « avec l'extension on pourrait ouvrir
   les cours pour l'année prochaine sur les moniteurs et les cours en
   salle directement, car c'est une misère à faire sur Drivup, il faut
   faire case par case ».

   Ses choix, sur les deux schémas « Ouverture des cours » :
   · une SEMAINE TYPE (pas de semaine A / B) : les moniteurs qu'on y
     met, leurs jours (Saint-Brieuc, Loudéac, 🎫 RESA PERMIS toute la
     journée, repos) et leurs créneaux de 2h ; la salle et les bureaux
     recopiés de Drivup ; la 🏍️ Moto plateau 2h de Jean Jacques
     (vendredi 17h-19h, samedi 13h-19h) ;
   · l'équilibre BV / BEA : un curseur « plus de BV / plus de BEA » pour
     l'école, et pour chacun « compté », « imposé » (un pourcentage) ou
     « pas compté » (comme s'il n'était pas là). Le curseur gagne ; une
     case fait passer d'abord « 2 moniteurs le même jour = 1 BV et
     1 BEA ». Loudéac, la RESA PERMIS et la moto ne comptent pas ;
   · 📍 Loudéac par mois : qui y est, et en changer un jour — les deux
     moniteurs ÉCHANGENT leur journée dans Drivup ;
   · ouvrir un mois, un trimestre ou une période, pour tous ou pour
     certains, sans jamais doubler ce qui est déjà dans Drivup, en
     sautant les jours fériés ; que des cours de 2h ; à Loudéac, le
     cours sans élève « .LOUDEAC » posé en haut, à 7h ;
   · fermer en un clic : les cours vides d'un moniteur retirés, ou
     remplacés par « Journée Congés Payés » (seulement sur ses jours de
     travail) ; un élève déjà placé se déplace sur un moniteur qui a un
     cours vide à la même heure, dans la même boîte, et n'est prévenu
     que si on coche.

   Ce module calcule et montre ; le Worker garde la semaine type
   (ouvertureLire / ouverturePoser) ; l'extension « App EC · Drivup »
   1.8.0 lit Drivup et y fait ce qui a été validé, en revérifiant tout
   juste avant (lecteur.js : lireOuverture, creerCours, supprimerCours,
   deplacerCours).
   ============================================================ */

const OUV_CRENEAUX = ['08:00', '10:00', '13:00', '15:00', '17:00'];
const OUV_JOURS = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const OUV_JOURS_LONGS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
/* Les prestations, par leur NOM dans Drivup (sans accents ni ponctuation) :
   l'extension relit le nom avant d'écrire, l'App n'a pas à connaître
   leurs numéros. Relevé dans Drivup le 25/11. */
const OUV_PRESTA = {
  bv: 'conduite 2h st brieuc', bea: 'conduite bea 2h st brieuc', loud: 'conduite loudeac 2h bv bea', marque: 'loudeac',
  resa: 'resa permis', moto: 'moto plateau 2h', cp: 'journee conges payes',
  bureauSB: 'bureau saint brieuc', bureauL: 'bureau loudeac',
  tab: 'tablettes', etg: 'etg salle', simu: 'simu 1h', tabL: 'tablettes loudeac', etgL: 'etg salle loudeac', simuL: 'simu 1h loudeac'
};
const OUV_NOMS_PRESTA = { bv: 'Conduite 2h BV', bea: 'Conduite BEA 2h', loud: 'Conduite Loudéac 2h BV-BEA', marque: '.LOUDEAC',
  resa: 'RESA PERMIS', moto: 'Moto plateau 2h', cp: 'Journée Congés Payés', bureauSB: 'Bureau Saint Brieuc', bureauL: 'Bureau Loudéac',
  tab: 'TABLETTES', etg: 'ETG SALLE', simu: 'SIMU 1H', tabL: 'TABLETTES Loudéac', etgL: 'ETG SALLE Loudéac', simuL: 'SIMU 1H Loudéac' };
/* ce qu'on peut retirer ou déplacer : les cours des moniteurs (comme l'extension) */
const OUV_MONITEUR = /^(conduite\b.*|loudeac|resa permis|moto plateau 2h)$/;

const OUV = { cfg: null, lu: 0, onglet: 'sem', sous: 'mon', mois: '', file: Promise.resolve(), sauver: null,
              ouvrir: { mode: 'mois', choix: '', du: '', au: '', qui: null, apercu: null, enCours: false, bilan: null },
              fermer: { qui: '', du: '', au: '', mode: 'retirer', plan: null, enCours: false, bilan: null },
              ressources: null };

/* ---------- petites aides ---------- */
const ouvEch = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ouvNorm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function ouvAuj(){ return (typeof todayLocal === 'function') ? todayLocal() : new Date().toISOString().slice(0, 10); }
function ouvPlus(iso, n){
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n)).toISOString().slice(0, 10) : '';
}
function ouvJourSem(iso){ return new Date(iso + 'T12:00:00Z').getUTCDay(); }   /* 0 dimanche … 6 samedi */
function ouvLundi(iso){ return ouvPlus(iso, -((ouvJourSem(iso) + 6) % 7)); }
function ouvFr(iso){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function ouvFrCourt(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return '';
  return OUV_JOURS[ouvJourSem(iso)].toLowerCase() + '. ' + (+m[3]) + ' ' + ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][+m[2] - 1];
}
const ouvH = h => { const m = String(h || '').match(/^(\d{2}):(\d{2})$/); return m ? (+m[1]) + 'h' + (m[2] === '00' ? '' : m[2]) : String(h || ''); };
const ouvMin = h => +String(h).slice(0, 2) * 60 + +String(h).slice(3, 5);
const ouvHeure = n => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
/* Comme Gestion › 📥 Drivup : les administrateurs, par le rôle */
function ouvPeutModifier(){
  return !!(typeof ACCES !== 'undefined' && ACCES && ACCES.role === 'admin');
}

/* ---------- les jours fériés (pour ne rien ouvrir ces jours-là) ---------- */
function ouvPaques(an){
  const a = an % 19, b = Math.floor(an / 100), c = an % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
        g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
        l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
        mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return an + '-' + String(mois).padStart(2, '0') + '-' + String(jour).padStart(2, '0');
}
const OUV_FERIES = {};
function ouvFeries(an){
  if(OUV_FERIES[an]) return OUV_FERIES[an];
  const p = ouvPaques(an);
  const l = {};
  l[an + '-01-01'] = 'Jour de l’an'; l[ouvPlus(p, 1)] = 'Lundi de Pâques'; l[an + '-05-01'] = 'Fête du travail';
  l[an + '-05-08'] = '8 mai'; l[ouvPlus(p, 39)] = 'Ascension'; l[ouvPlus(p, 50)] = 'Lundi de Pentecôte';
  l[an + '-07-14'] = '14 juillet'; l[an + '-08-15'] = 'Assomption'; l[an + '-11-01'] = 'Toussaint';
  l[an + '-11-11'] = '11 novembre'; l[an + '-12-25'] = 'Noël';
  OUV_FERIES[an] = l;
  return l;
}
function ouvFerie(iso){ return ouvFeries(+String(iso).slice(0, 4))[iso] || ''; }

/* ============================================================
   LA SEMAINE TYPE
   ============================================================ */
function ouvJourVide(){ return { lieu: 'off', boite: 'auto', creneaux: OUV_CRENEAUX.slice(), moto: [] }; }
function ouvConfigDeDepart(){
  const jours = () => { const j = {}; for(let d = 1; d <= 6; d++) j[d] = ouvJourVide(); return j; };
  const m = (nom, res) => ({ nom: nom, res: res, actif: true, mode: 'c', pct: 50, pctBoite: 'bv', jours: jours() });
  const jj = m('Jean Jacques', '52');
  /* 🏍️ David : Moto plateau 2h, Jean Jacques, le vendredi 17h-19h et le samedi 13h-19h */
  jj.jours[5].moto = ['17:00'];
  jj.jours[6].moto = ['13:00', '15:00', '17:00'];
  const salle = (nom, res, presta, agence, jours, debut, fin) => {
    const j = {};
    for(let d = 1; d <= 6; d++) j[d] = jours.indexOf(d) !== -1 ? [[debut, fin]] : [];
    return { nom: nom, res: res, presta: presta, agence: agence, jours: j };
  };
  const tous = [1, 2, 3, 4, 5, 6], loud = [2, 3, 5, 6];
  return {
    v: 1, curseur: 50, regleJour: false,
    moniteurs: [m('Chrystel', '42'), jj, m('François', '59'), m('Hery', '43')],
    /* Recopié de Drivup (semaine du 7 décembre 2026), avec les deux
       corrections de David : le jeudi 14h-16h ouvert à Saint-Brieuc,
       rien le lundi à Loudéac. */
    salle: [
      salle('Tablettes · St-Brieuc', '3', 'tab', '1', tous, '10:00', '18:00'),
      salle('ETG · St-Brieuc', '9', 'etg', '1', tous, '10:00', '18:00'),
      salle('VISIO', '62', 'etg', '1', tous, '10:00', '18:00'),
      salle('Théorie', '57', 'simu', '1', tous, '10:00', '18:00'),
      salle('Simu 1', '4', 'simu', '1', tous, '10:00', '18:00'),
      salle('Simu 2', '5', 'simu', '1', tous, '10:00', '18:00'),
      salle('Tablettes · Loudéac', '45', 'tabL', '3', loud, '10:00', '18:00'),
      salle('ETG · Loudéac', '63', 'etgL', '3', loud, '10:00', '18:00'),
      salle('Simu · Loudéac', '46', 'simuL', '3', loud, '10:00', '18:00')
    ],
    /* David : Maryne Saint-Brieuc le lundi, Loudéac mardi et mercredi,
       rien le jeudi, Saint-Brieuc vendredi et samedi ; David mardi,
       mercredi, jeudi Saint-Brieuc, vendredi et samedi Loudéac. */
    bureaux: [
      { nom: 'Maryne', res: '39', jours: { 1: 'SB', 2: 'L', 3: 'L', 4: '', 5: 'SB', 6: 'SB' } },
      { nom: 'David', res: '10', jours: { 1: '', 2: 'SB', 3: 'SB', 4: 'SB', 5: 'L', 6: 'L' } }
    ],
    horairesBureau: [['10:00', '12:00'], ['13:00', '18:00']],
    loudeac: {}
  };
}
/* Une semaine type lue : tout ce qui manque reprend la forme de départ */
function ouvConfigPropre(c){
  const d = ouvConfigDeDepart();
  if(!c || typeof c !== 'object') return d;
  const out = Object.assign({}, d, c);
  out.moniteurs = (Array.isArray(c.moniteurs) ? c.moniteurs : d.moniteurs).map(m => {
    const j = {};
    for(let k = 1; k <= 6; k++){
      const x = (m.jours && m.jours[k]) || {};
      j[k] = { lieu: ['SB', 'L', 'R', 'off'].indexOf(x.lieu) !== -1 ? x.lieu : 'off',
               boite: ['auto', 'bv', 'bea'].indexOf(x.boite) !== -1 ? x.boite : 'auto',
               creneaux: Array.isArray(x.creneaux) ? x.creneaux.filter(h => OUV_CRENEAUX.indexOf(h) !== -1) : OUV_CRENEAUX.slice(),
               moto: Array.isArray(x.moto) ? x.moto.filter(h => OUV_CRENEAUX.indexOf(h) !== -1) : [] };
    }
    return { nom: String(m.nom || '').slice(0, 40), res: String(m.res || '').replace(/\D/g, ''), actif: m.actif !== false,
             mode: ['c', 'i', 'p'].indexOf(m.mode) !== -1 ? m.mode : 'c',
             pct: Math.max(0, Math.min(100, Math.round(Number(m.pct) || 0))), pctBoite: m.pctBoite === 'bea' ? 'bea' : 'bv', jours: j };
  }).filter(m => m.nom);
  out.salle = Array.isArray(c.salle) ? c.salle : d.salle;
  out.bureaux = Array.isArray(c.bureaux) ? c.bureaux : d.bureaux;
  out.horairesBureau = Array.isArray(c.horairesBureau) ? c.horairesBureau : d.horairesBureau;
  out.loudeac = (c.loudeac && typeof c.loudeac === 'object') ? c.loudeac : {};
  out.curseur = Math.max(0, Math.min(100, Math.round(Number(c.curseur)))) ;
  if(isNaN(out.curseur)) out.curseur = 50;
  out.regleJour = !!c.regleJour;
  return out;
}
async function chargerOuverture(forcer){
  if(OUV.cfg && !forcer) return OUV.cfg;
  const r = await appelPrep({ action: 'ouvertureLire' });
  if(!r || r.status === 'error') throw new Error((r && r.message) || 'lecture impossible');
  OUV.cfg = ouvConfigPropre(r.config);
  OUV.lu = Date.now();
  return OUV.cfg;
}
/* Chaque changement s'enregistre, une seconde après le dernier geste */
function ouvSauver(){
  if(!ouvPeutModifier()) return;
  clearTimeout(OUV.sauver);
  OUV.sauver = setTimeout(async () => {
    try{
      const r = await appelPrep({ action: 'ouverturePoser', config: OUV.cfg });
      if(!r || r.status === 'error') throw new Error((r && r.message) || 'refusé');
    }catch(e){ if(typeof showToast === 'function') showToast('⚠️ Semaine type pas enregistrée : ' + ((e && e.message) || e)); }
  }, 900);
}

/* ============================================================
   L'ÉQUILIBRE BV / BEA

   Les jours « auto » à Saint-Brieuc des moniteurs comptés ou imposés
   reçoivent BV ou BEA. Pour chaque moniteur, un nombre de jours BV à
   atteindre : celui de son pourcentage s'il est imposé ; sinon sa part
   de ce que vise le curseur de l'école. Puis on choisit LESQUELS, en
   cherchant chaque jour autant de BV que de BEA entre les moniteurs
   comptés. Sans la case, le nombre de chacun passe d'abord (« le
   curseur gagne ») ; avec, c'est le jour (« 2 moniteurs = 1 BV et
   1 BEA »). Un moniteur « pas compté » est mis de côté : ses jours sont
   ceux qu'on a choisis à la main (BV par défaut).
   ============================================================ */
function ouvEquilibre(cfg){
  const ms = cfg.moniteurs.filter(m => m.actif);
  const res = {};   /* nom → { d: 'bv' | 'bea' } */
  const vars = [];  /* { m, d } */
  const infos = {};
  ms.forEach(m => {
    res[m.nom] = {};
    const sb = [];
    for(let d = 1; d <= 6; d++) if(m.jours[d].lieu === 'SB') sb.push(d);
    let fixeBV = 0;
    const autos = [];
    sb.forEach(d => {
      const b = m.jours[d].boite;
      if(b === 'bv' || b === 'bea'){ res[m.nom][d] = b; if(b === 'bv') fixeBV++; }
      else if(m.mode === 'p') res[m.nom][d] = 'bv';
      else autos.push(d);
    });
    infos[m.nom] = { n: sb.length, fixeBV: fixeBV, autos: autos, k: fixeBV };
    if(m.mode !== 'p') autos.forEach(d => vars.push({ m: m.nom, d: d }));
  });
  const comptes = ms.filter(m => m.mode !== 'p');
  const imposes = comptes.filter(m => m.mode === 'i'), libres = comptes.filter(m => m.mode === 'c');
  const borne = (nom, v) => Math.max(infos[nom].fixeBV, Math.min(infos[nom].fixeBV + infos[nom].autos.length, v));
  imposes.forEach(m => {
    const p = m.pctBoite === 'bv' ? m.pct : 100 - m.pct;
    infos[m.nom].k = borne(m.nom, Math.round(p / 100 * infos[m.nom].n));
  });
  const N = comptes.reduce((s, m) => s + infos[m.nom].n, 0);
  const T = Math.round(cfg.curseur / 100 * N);
  const Nc = libres.reduce((s, m) => s + infos[m.nom].n, 0);
  let Tc = T - imposes.reduce((s, m) => s + infos[m.nom].k, 0);
  Tc = Math.max(libres.reduce((s, m) => s + infos[m.nom].fixeBV, 0), Math.min(libres.reduce((s, m) => s + infos[m.nom].fixeBV + infos[m.nom].autos.length, 0), Tc));
  if(Nc){
    /* la part de chacun, au plus juste reste */
    const parts = libres.map(m => { const x = Tc * infos[m.nom].n / Nc; return { m: m, x: x, k: Math.floor(x) }; });
    let reste = Tc - parts.reduce((s, p) => s + p.k, 0);
    parts.slice().sort((a, b) => (b.x - b.k) - (a.x - a.k) || a.m.nom.localeCompare(b.m.nom)).forEach(p => { if(reste > 0){ p.k++; reste--; } });
    parts.forEach(p => { infos[p.m.nom].k = borne(p.m.nom, p.k); });
  }
  /* le choix des jours : un départ simple, puis on améliore tant qu'on peut */
  const val = {};
  const cle = v => v.m + '|' + v.d;
  Object.keys(infos).forEach(nom => {
    const inf = infos[nom];
    const aMettre = Math.max(0, inf.k - inf.fixeBV);
    inf.autos.forEach((d, i) => { val[nom + '|' + d] = i < aMettre ? 'bv' : 'bea'; });
  });
  const boiteDe = (nom, d) => val[nom + '|' + d] || res[nom][d];
  const Wj = cfg.regleJour ? 100 : 1, Ws = cfg.regleJour ? 1 : 100;
  const cout = () => {
    let c = 0;
    for(let d = 1; d <= 6; d++){
      let n = 0, b = 0;
      comptes.forEach(m => { if(m.jours[d].lieu === 'SB'){ n++; if(boiteDe(m.nom, d) === 'bv') b++; } });
      c += Wj * Math.max(0, Math.abs(2 * b - n) - (n % 2));
    }
    comptes.forEach(m => {
      let b = 0;
      for(let d = 1; d <= 6; d++) if(m.jours[d].lieu === 'SB' && boiteDe(m.nom, d) === 'bv') b++;
      c += Ws * Math.abs(b - infos[m.nom].k);
    });
    return c;
  };
  let meilleur = cout();
  for(let tour = 0; tour < 60; tour++){
    let mieux = false;
    for(const v of vars){
      const k = cle(v), avant = val[k];
      val[k] = avant === 'bv' ? 'bea' : 'bv';
      const c = cout();
      if(c < meilleur){ meilleur = c; mieux = true; } else val[k] = avant;
    }
    for(let i = 0; i < vars.length; i++) for(let j = i + 1; j < vars.length; j++){
      const a = cle(vars[i]), b = cle(vars[j]);
      if(val[a] === val[b]) continue;
      const x = val[a]; val[a] = val[b]; val[b] = x;
      const c = cout();
      if(c < meilleur){ meilleur = c; mieux = true; } else { val[b] = val[a]; val[a] = x; }
    }
    if(!mieux) break;
  }
  vars.forEach(v => { res[v.m][v.d] = val[cle(v)]; });
  /* ce qu'on affiche */
  const stats = {};
  ms.forEach(m => {
    const s = { bv: 0, bea: 0, loud: 0, resa: 0, moto: 0, k: infos[m.nom].k, n: infos[m.nom].n };
    for(let d = 1; d <= 6; d++){
      const j = m.jours[d];
      if(j.lieu === 'SB'){ s[res[m.nom][d]]++; s.moto += (j.moto || []).filter(h => j.creneaux.indexOf(h) !== -1).length; }
      if(j.lieu === 'L') s.loud++;
      if(j.lieu === 'R') s.resa++;
    }
    stats[m.nom] = s;
  });
  const jours = {};
  for(let d = 1; d <= 6; d++){
    let n = 0, b = 0;
    comptes.forEach(m => { if(m.jours[d].lieu === 'SB'){ n++; if(res[m.nom][d] === 'bv') b++; } });
    jours[d] = { n: n, bv: b, bea: n - b, ok: Math.abs(2 * b - n) <= (n % 2) };
  }
  const tBV = comptes.reduce((s, m) => s + stats[m.nom].bv, 0), tN = comptes.reduce((s, m) => s + stats[m.nom].bv + stats[m.nom].bea, 0);
  return { boites: res, stats: stats, jours: jours, total: { bv: tBV, bea: tN - tBV, pct: tN ? Math.round(tBV * 100 / tN) : 0 } };
}

/* ============================================================
   CE QUE LA SEMAINE TYPE OUVRE SUR UNE PÉRIODE

   Une ligne par cours à poser : la colonne Drivup, la prestation (son
   nom), le jour, les heures, l'agence. Les jours fériés sont sautés ;
   les échanges de Loudéac (📍 Loudéac par mois) sont appliqués.
   ============================================================ */
/* Le moniteur de chaque jour, échanges compris : nom → sa journée */
function ouvJourneesDu(cfg, iso, eq){
  const d = ouvJourSem(iso);
  const out = {};
  if(d < 1 || d > 6) return out;
  cfg.moniteurs.filter(m => m.actif).forEach(m => { out[m.nom] = { m: m, j: m.jours[d], boite: eq.boites[m.nom][d] || '' }; });
  const ech = cfg.loudeac[iso];
  if(ech && out[ech.de] && out[ech.vers]){
    const a = out[ech.de], b = out[ech.vers];
    out[ech.de] = { m: a.m, j: b.j, boite: b.boite, echange: ech.vers };
    out[ech.vers] = { m: b.m, j: a.j, boite: a.boite, echange: ech.de };
  }
  return out;
}
function ouvAttendus(cfg, du, au, quoi){
  const eq = ouvEquilibre(cfg);
  const out = [], feries = [];
  const veut = k => !quoi || quoi.indexOf(k) !== -1;
  for(let j = du; j && j <= au; j = ouvPlus(j, 1)){
    const d = ouvJourSem(j);
    if(d < 1 || d > 6) continue;
    const f = ouvFerie(j);
    if(f){ feries.push(j); continue; }
    const jn = ouvJourneesDu(cfg, j, eq);
    Object.keys(jn).forEach(nom => {
      if(!veut(nom)) return;
      const x = jn[nom], m = x.m, jr = x.j;
      const poser = (presta, debut, fin, agence) => out.push({ grp: nom, res: m.res, presta: presta, jour: j, debut: debut, fin: fin, agence: agence, d: d });
      if(jr.lieu === 'SB'){
        jr.creneaux.forEach(h => {
          const moto = (jr.moto || []).indexOf(h) !== -1;
          poser(moto ? 'moto' : (x.boite === 'bea' ? 'bea' : 'bv'), h, ouvHeure(ouvMin(h) + 120), '1');
        });
      }else if(jr.lieu === 'L'){
        poser('marque', '07:00', '07:30', '3');
        jr.creneaux.forEach(h => poser('loud', h, ouvHeure(ouvMin(h) + 120), '3'));
      }else if(jr.lieu === 'R'){
        poser('resa', '08:00', '19:00', '1');
      }
    });
    if(veut('salle')){
      cfg.salle.forEach(c => {
        (c.jours[d] || []).forEach(([a, b]) => {
          for(let t = ouvMin(a); t + 60 <= ouvMin(b); t += 60) out.push({ grp: 'salle', res: c.res, presta: c.presta, jour: j, debut: ouvHeure(t), fin: ouvHeure(t + 60), agence: c.agence || '1', d: d, col: c.nom });
        });
      });
    }
    if(veut('bureaux')){
      cfg.bureaux.forEach(b => {
        const l = b.jours[d];
        if(l !== 'SB' && l !== 'L') return;
        (cfg.horairesBureau || []).forEach(([a, z]) => out.push({ grp: 'bureaux', res: b.res, presta: l === 'L' ? 'bureauL' : 'bureauSB', jour: j, debut: a, fin: z, agence: l === 'L' ? '3' : '1', d: d, col: b.nom }));
      });
    }
  }
  return { cours: out, feries: feries, eq: eq };
}
/* Les séries : le même cours, chaque semaine, sans trou → un seul envoi
   (la répétition de Drivup) */
function ouvSeries(liste, idDe){
  const groupes = {};
  liste.forEach(c => {
    const k = [c.res, c.presta, c.d, c.debut, c.fin, c.agence].join('|');
    (groupes[k] = groupes[k] || []).push(c);
  });
  const out = [];
  Object.keys(groupes).sort().forEach(k => {
    const l = groupes[k].sort((a, b) => a.jour.localeCompare(b.jour));
    let serie = null;
    l.forEach(c => {
      if(serie && ouvPlus(serie.dates[serie.dates.length - 1], 7) === c.jour && serie.dates.length < 60) serie.dates.push(c.jour);
      else {
        serie = { cle: 's' + out.length, res: c.res, typMo: idDe[c.presta] || '', attendu: OUV_PRESTA[c.presta], presta: c.presta,
                  debut: c.debut, fin: c.fin, agence: c.agence, dates: [c.jour], grp: c.grp };
        out.push(serie);
      }
    });
  });
  return out;
}
/* Les numéros Drivup des prestations, par leur nom (le menu du formulaire) */
function ouvIdsDesPrestations(prestations){
  const parNom = {};
  Object.keys(prestations || {}).forEach(id => { const n = ouvNorm(prestations[id]); if(!parNom[n]) parNom[n] = id; });
  const out = {};
  Object.keys(OUV_PRESTA).forEach(k => { if(parNom[OUV_PRESTA[k]]) out[k] = parNom[OUV_PRESTA[k]]; });
  return out;
}

/* ============================================================
   LA CONVERSATION AVEC L'EXTENSION
   Une demande à la fois : ses réponses n'ont pas d'étiquette.
   ============================================================ */
function ouvAttendre(type, delai, surProgression){
  return new Promise((ok, ko) => {
    const fin = () => { clearTimeout(t); clearTimeout(t0); window.removeEventListener('message', ecoute); };
    const t0 = setTimeout(() => { fin(); ko(new Error('L’extension « App EC · Drivup » ne répond pas : vérifie qu’elle est installée et que tu es connecté à Drivup dans ce navigateur.')); }, 25000);
    const t = setTimeout(() => { fin(); ko(new Error('Drivup ne répond plus : c’est trop long. Recommence, ce qui est fait ne sera pas doublé.')); }, delai || 900000);
    function ecoute(ev){
      if(ev.source !== window || !ev.data || ev.data.ecExt !== 1 || ev.data.demandeId) return;
      const d = ev.data;
      if(d.type === 'drivup-ecoutes-progression'){ clearTimeout(t0); if(surProgression) surProgression(d); return; }
      if(d.type === 'drivup-ecoutes-erreur'){
        fin();
        ko(new Error(/ne sait pas encore/.test(String(d.message)) ? 'Mets à jour l’extension « App EC · Drivup » en 1.8.0 : celle-ci ne sait pas encore ouvrir les cours.' : (d.message || 'erreur dans Drivup')));
        return;
      }
      if(d.type !== type) return;
      fin();
      ok(d);
    }
    window.addEventListener('message', ecoute);
  });
}
function ouvExt(m, type, delai, surProgression){
  const t = OUV.file.then(() => {
    if(typeof extDrivupPresente !== 'function' || !extDrivupPresente()) throw new Error('Il faut l’extension « App EC · Drivup » 1.8.0 sur cet ordinateur (Gestion › 📥 Drivup).');
    const p = ouvAttendre(type, delai, surProgression);
    versExtDrivup(m);
    return p;
  });
  OUV.file = t.catch(() => {});
  return t;
}
function ouvLireDrivup(du, au, colonnes){
  const m = { type: 'drivup-ouverture-lire', du: du, au: au };
  const col = (OUV.cfg && OUV.cfg.moniteurs[0] && OUV.cfg.moniteurs[0].res) || '';
  if(col) m.colonne = col;
  if(colonnes && colonnes.length) m.colonnes = colonnes;
  return ouvExt(m, 'drivup-ouverture-lue', 600000).then(d => { if(d.ressources) OUV.ressources = d.ressources; return d; });
}

/* ============================================================
   L'ÉCRAN
   ============================================================ */
function ouvStyle(){
  if(document.getElementById('ouvStyle')) return;
  const st = document.createElement('style');
  st.id = 'ouvStyle';
  st.textContent = `
#appView > .card[data-vue="ouverture"]{ grid-column:1 / -1; }
#ouvZone .pa{ width:auto !important; flex:none; margin:0 !important; padding:6px 12px !important; font-size:13px !important; border-radius:999px !important; font-weight:700; white-space:nowrap; }
#ouvZone .pa.on, .ovFen .pa.on{ background:var(--orange-soft) !important; border:1px solid var(--orange) !important; color:var(--on-accent) !important; }
.ovFen .pa{ width:auto !important; flex:none; margin:0 !important; padding:6px 12px !important; font-size:13px !important; border-radius:999px !important; font-weight:700; white-space:nowrap; }
.ovRang{ display:flex; gap:7px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
.ovAide{ font-size:13px; color:var(--muted); line-height:1.55; margin:-2px 0 12px; max-width:860px; }
.ovGrille{ border:1px solid var(--line); border-radius:14px; overflow:auto; }
.ovGrille table{ border-collapse:collapse; width:100%; min-width:760px; font-size:12.5px; }
.ovGrille th{ text-align:left; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); padding:8px 8px; border-bottom:1px solid var(--line); }
.ovGrille td{ vertical-align:top; padding:8px; border-bottom:1px solid var(--line); border-left:1px solid var(--line); }
.ovGrille td:first-child{ border-left:none; font-weight:800; font-size:13.5px; white-space:nowrap; }
.ovGrille td.ovCase{ cursor:pointer; }
.ovGrille td.ovCase:hover{ background:var(--orange-soft); }
.ovJour{ font-size:11px; font-weight:800; margin-bottom:4px; }
.ovC{ display:inline-block; margin:0 3px 3px 0; padding:1px 7px; border-radius:999px; font-size:11px; font-weight:800; border:1px solid; white-space:nowrap; }
.ovC.bv{ color:#3B82F6; border-color:#93B4F5; background:rgba(59,130,246,.12); }
.ovC.bea{ color:#65A30D; border-color:#9BCB3C; background:rgba(132,204,22,.14); }
.ovC.l{ color:#D97706; border-color:#E8A23A; background:rgba(245,158,11,.14); }
.ovC.off{ color:var(--muted); border-color:var(--line); background:transparent; }
.ovC.sal{ color:#8B5CF6; border-color:#C4B5FD; background:rgba(139,92,246,.12); }
.ovC.resa{ color:#DB2777; border-color:#F0A3C6; background:rgba(219,39,119,.10); }
.ovC.moto{ color:#0E7490; border-color:#7DD3E1; background:rgba(14,116,144,.10); }
.ovC.mini{ font-size:10px; padding:0 6px; font-weight:700; opacity:.9; }
.ovEq{ font-size:12px; margin-top:4px; color:var(--muted); }
.ovEq b{ color:var(--accent-text); }
.ovBoite{ border:1px solid var(--line); border-radius:14px; padding:12px 14px; margin-bottom:12px; }
.ovBoite h4{ margin:0 0 8px; font-size:14px; }
.ovLigne{ display:flex; gap:10px; align-items:center; padding:7px 0; border-top:1px solid var(--line); font-size:13px; flex-wrap:wrap; }
.ovLigne:first-of-type{ border-top:none; }
.ovLigne > b{ min-width:110px; }
.ovNb{ font-variant-numeric:tabular-nums; font-weight:800; }
.ovNote{ font-size:12px; color:var(--muted); line-height:1.5; }
.ovWarn{ border:1px solid var(--orange); background:var(--orange-soft); color:var(--on-accent); border-radius:12px; padding:10px 12px; font-size:13px; margin:10px 0; }
.ovCurseur{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:13px; }
.ovCurseur input[type=range]{ flex:1; min-width:180px; max-width:360px; margin:0; accent-color:var(--accent-text); }
.ovEqSel{ display:flex; gap:5px; align-items:center; flex-wrap:wrap; }
.ovEqSel select, .ovEqSel input{ width:auto !important; margin:0 !important; padding:4px 6px !important; font-size:12px !important; }
.ovEqSel input{ width:58px !important; }
.ovCoche{ display:flex; gap:8px; align-items:flex-start; font-size:13px; margin:8px 0 0; text-transform:none; letter-spacing:0; font-weight:400; color:var(--text); cursor:pointer; }
.ovCoche input{ width:auto; margin:3px 0 0; flex-shrink:0; }
.ovMois{ display:grid; grid-template-columns:repeat(6, minmax(0, 1fr)); gap:6px; }
.ovMois .tete{ font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); font-weight:800; padding:2px 4px; }
.ovJ{ border:1px solid var(--line); border-radius:12px; padding:6px 7px; min-height:78px; font-size:11.5px; display:flex; flex-direction:column; gap:3px; text-align:left; background:transparent; color:inherit; font-family:inherit; width:100%; margin:0; }
button.ovJ{ cursor:pointer; }
.ovJ .n{ font-weight:800; font-size:13px; display:flex; justify-content:space-between; gap:4px; }
.ovJ.vide{ opacity:.45; }
.ovJ.ferie{ opacity:.6; }
.ovJ.change{ border-color:var(--orange); box-shadow:0 0 0 1px var(--orange) inset; }
.ovJ .qui{ display:flex; flex-direction:column; gap:2px; color:var(--muted); }
.ovJ .qui b{ color:var(--text); }
.ovOpt{ display:flex; gap:8px; align-items:flex-start; padding:8px 0; border-top:1px solid var(--line); font-size:13.5px; line-height:1.45; }
.ovOpt:first-child{ border-top:none; }
.ovBarre{ height:8px; border-radius:99px; background:var(--line); overflow:hidden; margin:8px 0; }
.ovBarre span{ display:block; height:100%; width:0; background:var(--accent-text); transition:width .3s; }
@media (max-width:700px){ .ovJ{ min-height:64px; font-size:9.5px; padding:4px; } .ovJ .qui{ overflow-wrap:anywhere; line-height:1.25; } .ovMois{ gap:4px; } }
`;
  document.head.appendChild(st);
}
function ouvChip(on, txt, faire, titre){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-secondary pa' + (on ? ' on' : '');
  b.textContent = txt;
  if(titre) b.title = titre;
  if(faire) b.addEventListener('click', faire);
  return b;
}
function ouvEl(tag, classe, html){
  const e = document.createElement(tag);
  if(classe) e.className = classe;
  if(html != null) e.innerHTML = html;
  return e;
}
const ouvC = (k, t) => '<span class="ovC ' + k + '">' + ouvEch(t) + '</span>';

async function afficherOuverture(){
  const z = document.getElementById('ouvZone');
  if(!z) return;
  ouvStyle();
  if(!OUV.cfg) z.innerHTML = '<div class="empty">Lecture…</div>';
  try{ await chargerOuverture(); }
  catch(e){ z.innerHTML = '<div class="empty">⚠️ ' + ouvEch((e && e.message) || e) + '</div>'; return; }
  dessinerOuverture();
}
function dessinerOuverture(){
  const z = document.getElementById('ouvZone');
  if(!z || !OUV.cfg) return;
  z.textContent = '';
  const haut = ouvEl('div', 'ovRang');
  [['sem', '🗓️ Semaine type'], ['loud', '📍 Loudéac par mois'], ['ouvrir', '📤 Ouvrir'], ['fermer', '🔒 Fermer · CP']].forEach(([k, t]) => {
    haut.appendChild(ouvChip(OUV.onglet === k, t, () => { OUV.onglet = k; dessinerOuverture(); }));
  });
  z.appendChild(haut);
  /* l'extension : sans elle, on règle la semaine type, rien de plus */
  const v = (typeof EXT_DV !== 'undefined' && EXT_DV.version) || '';
  const present = typeof extDrivupPresente === 'function' && extDrivupPresente();
  const vieille = present && v && v.split('.').map(Number).reduce((s, x, i) => s + x * [10000, 100, 1][i], 0) < 10801;
  if(!present || vieille){
    z.appendChild(ouvEl('div', 'ovWarn', !present
      ? '🧩 L’extension « App EC · Drivup » n’est pas sur cet ordinateur : tu peux régler la semaine type, mais ouvrir, fermer et échanger se font depuis un ordinateur qui l’a (1.8.1).'
      : '🧩 L’extension est en ' + ouvEch(v) + ' : il faut la 1.8.1 pour ouvrir, fermer et échanger (Gestion › 📥 Drivup). La 1.8.0 ne posait que la durée par défaut des bureaux.'));
  }
  if(!ouvPeutModifier()) z.appendChild(ouvEl('div', 'ovNote', '👁️ En lecture : changer la semaine type ou écrire dans Drivup est réservé aux administrateurs.'));
  if(OUV.onglet === 'sem') dessinerSemaineOuv(z);
  else if(OUV.onglet === 'loud') dessinerLoudeacOuv(z);
  else if(OUV.onglet === 'ouvrir') dessinerOuvrirOuv(z);
  else dessinerFermerOuv(z);
}

/* ---------- 🗓️ la semaine type ---------- */
function dessinerSemaineOuv(z){
  const sous = ouvEl('div', 'ovRang');
  [['mon', '🚗 Moniteurs'], ['salle', '🏫 Salle'], ['bur', '🗂️ Bureaux']].forEach(([k, t]) => {
    sous.appendChild(ouvChip(OUV.sous === k, t, () => { OUV.sous = k; dessinerOuverture(); }));
  });
  z.appendChild(sous);
  if(OUV.sous === 'salle') return dessinerSalleOuv(z);
  if(OUV.sous === 'bur') return dessinerBureauxOuv(z);
  const cfg = OUV.cfg, mod = ouvPeutModifier();
  /* qui est dans la semaine type */
  const qui = ouvEl('div', 'ovRang');
  qui.appendChild(ouvEl('span', 'ovNote', '<b>Dans la semaine type :</b>'));
  cfg.moniteurs.forEach(m => qui.appendChild(ouvChip(m.actif, (m.actif ? '✓ ' : '') + m.nom, () => {
    if(!mod) return;
    m.actif = !m.actif; ouvSauver(); dessinerOuverture();
  }, 'Le mettre dans la semaine type, ou l’en sortir')));
  if(mod) qui.appendChild(ouvChip(false, '＋ Un moniteur', () => ajouterMoniteurOuv()));
  z.appendChild(qui);
  const eq = ouvEquilibre(cfg);
  /* ⚖️ le curseur de l'école */
  const bo = ouvEl('div', 'ovBoite');
  bo.appendChild(ouvEl('h4', '', '⚖️ L’équilibre BV / BEA de l’école'));
  const cur = ouvEl('div', 'ovCurseur');
  cur.appendChild(ouvEl('b', '', 'Plus de BV'));
  const r = document.createElement('input');
  r.type = 'range'; r.min = '0'; r.max = '100'; r.step = '5'; r.value = String(100 - cfg.curseur); r.disabled = !mod;
  r.setAttribute('aria-label', 'Équilibre BV / BEA');
  const lab = ouvEl('span', 'ovNb', cfg.curseur + ' % BV · ' + (100 - cfg.curseur) + ' % BEA');
  lab.style.marginLeft = '6px';
  r.addEventListener('input', () => { const bv = 100 - Number(r.value); lab.textContent = bv + ' % BV · ' + (100 - bv) + ' % BEA'; });
  r.addEventListener('change', () => { cfg.curseur = 100 - Number(r.value); ouvSauver(); dessinerOuverture(); });
  cur.append(r, ouvEl('b', '', 'Plus de BEA'), lab);
  bo.appendChild(cur);
  bo.appendChild(ouvEl('div', 'ovNote', 'Visé sur la semaine, pour les moniteurs comptés. Résultat : <b>' + eq.total.bv + ' BV · ' + eq.total.bea + ' BEA (' + eq.total.pct + ' % BV)</b>. Loudéac, la RESA PERMIS et la moto ne comptent pas.'));
  const lc = document.createElement('label');
  lc.className = 'ovCoche';
  const cc = document.createElement('input');
  cc.type = 'checkbox'; cc.checked = !!cfg.regleJour; cc.disabled = !mod;
  cc.addEventListener('change', () => { cfg.regleJour = cc.checked; ouvSauver(); dessinerOuverture(); });
  lc.append(cc, ouvEl('span', '', 'La règle du jour d’abord : quand ils sont deux à Saint-Brieuc le même jour, 1 BV et 1 BEA — même si le curseur n’est plus tout à fait atteint.'));
  bo.appendChild(lc);
  z.appendChild(bo);
  z.appendChild(ouvEl('div', 'ovAide', 'Touche un jour pour le changer : Saint-Brieuc (BV, BEA, ou l’équilibre choisit), Loudéac, 🎫 RESA PERMIS toute la journée, repos, ses créneaux et la 🏍️ moto. Dans la dernière colonne, chacun est ⚖️ compté dans l’équilibre, 🔒 imposé (un pourcentage de BV ou de BEA), ou pas compté (ses jours restent ceux que tu choisis).'));
  const actifs = cfg.moniteurs.filter(m => m.actif);
  if(!actifs.some(m => [1, 2, 3, 4, 5, 6].some(d => m.jours[d].lieu !== 'off'))){
    z.appendChild(ouvEl('div', 'ovWarn', '👉 Aucun jour de travail encore : commence par « ↺ Reprendre ce qu’il y a dans Drivup » (sous le tableau), puis corrige.'));
  }
  /* le tableau */
  const g = ouvEl('div', 'ovGrille');
  const t = document.createElement('table');
  t.style.minWidth = '1000px';
  t.innerHTML = '<thead><tr><th>Moniteur</th>' + [1, 2, 3, 4, 5, 6].map(d => '<th>' + OUV_JOURS[d] + '</th>').join('') + '<th>⚖️ Équilibre</th></tr></thead>';
  const tb = document.createElement('tbody');
  actifs.forEach(m => {
    const tr = document.createElement('tr');
    tr.appendChild(ouvEl('td', '', ouvEch(m.nom)));
    for(let d = 1; d <= 6; d++){
      const td = ouvEl('td', mod ? 'ovCase' : '', celluleJourOuv(m, d, eq));
      td.dataset.ov = m.nom + '|' + d;
      if(mod){
        td.tabIndex = 0; td.setAttribute('role', 'button');
        td.title = OUV_JOURS_LONGS[d] + ' · ' + m.nom + ' : toucher pour changer';
        td.addEventListener('click', () => menuJourOuv(m, d, td));
        td.addEventListener('keydown', ev => { if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); menuJourOuv(m, d, td); } });
      }
      tr.appendChild(td);
    }
    const tdE = document.createElement('td');
    tdE.appendChild(selectEquilibreOuv(m, mod));
    const s = eq.stats[m.nom];
    const l = ['BV ' + s.bv, 'BEA ' + s.bea];
    if(m.mode === 'i') l.push((s.bv === s.k ? '✓ ' : 'visé ') + m.pct + ' % ' + m.pctBoite.toUpperCase());
    if(s.loud) l.push('Loudéac ' + s.loud);
    if(s.resa) l.push('🎫 ' + s.resa);
    if(s.moto) l.push('🏍️ ' + s.moto);
    if(m.mode === 'p') l.push('à la main');
    tdE.appendChild(ouvEl('div', 'ovEq', '<b>' + l.map(ouvEch).join('<br>') + '</b>'));
    tr.appendChild(tdE);
    tb.appendChild(tr);
  });
  const pied = document.createElement('tr');
  pied.appendChild(ouvEl('td', '', '<span style="color:var(--muted);font-weight:700;">Saint-Brieuc</span>'));
  for(let d = 1; d <= 6; d++){
    const j = eq.jours[d];
    pied.appendChild(ouvEl('td', '', j.n ? '<div class="ovEq"><b>' + j.bv + ' BV · ' + j.bea + ' BEA' + (j.ok ? ' ✓' : '') + '</b></div>' : ''));
  }
  pied.appendChild(document.createElement('td'));
  tb.appendChild(pied);
  t.appendChild(tb);
  g.appendChild(t);
  z.appendChild(g);
  const bas = ouvEl('div', 'ovRang');
  bas.style.marginTop = '12px';
  if(mod) bas.appendChild(ouvChip(false, '↺ Reprendre ce qu’il y a dans Drivup', () => reprendreDrivupOuv()));
  z.appendChild(bas);
  z.appendChild(ouvEl('div', 'ovNote', 'Que des cours de 2h : 8h-10h, 10h-12h, 13h-15h, 15h-17h, 17h-19h. À Loudéac : « CONDUITE LOUDEAC 2H BV-BEA », et le cours sans élève « .LOUDEAC » posé en haut, à 7h. 🎫 RESA PERMIS : de 8h à 19h. Quand ils sont trois le même jour, l’équilibre se fait à un près.'));
}
function celluleJourOuv(m, d, eq){
  const j = m.jours[d];
  if(j.lieu === 'off') return '<div class="ovJour" style="color:var(--muted);">Repos</div>';
  if(j.lieu === 'R') return '<div class="ovJour">🎫 Résa permis</div>' + ouvC('resa', 'RESA PERMIS') + '<div class="ovNote">toute la journée</div>';
  if(j.lieu === 'L') return '<div class="ovJour">📍 Loudéac · BV-BEA</div>' + ouvC('l mini', '7h .LOUDEAC') + '<br>' + j.creneaux.map(h => ouvC('l', ouvH(h))).join('');
  const b = eq.boites[m.nom][d] || 'bv';
  return '<div class="ovJour">📍 St-Brieuc · ' + b.toUpperCase() + (j.boite === 'auto' && m.mode !== 'p' ? ' <span class="ovNote" title="choisi par l’équilibre">⚖️</span>' : '') + '</div>' +
    j.creneaux.map(h => (j.moto || []).indexOf(h) !== -1 ? ouvC('moto', '🏍️ ' + ouvH(h)) : ouvC(b, ouvH(h))).join('');
}
function selectEquilibreOuv(m, mod){
  const w = ouvEl('div', 'ovEqSel');
  const s = document.createElement('select');
  [['c', '⚖️ Compté'], ['i', '🔒 Imposé'], ['p', '— Pas compté']].forEach(([v, t]) => {
    const o = document.createElement('option'); o.value = v; o.textContent = t; if(m.mode === v) o.selected = true; s.appendChild(o);
  });
  s.disabled = !mod;
  s.addEventListener('change', () => {
    m.mode = s.value;
    if(m.mode === 'p') for(let d = 1; d <= 6; d++) if(m.jours[d].boite === 'auto') m.jours[d].boite = (ouvEquilibre(OUV.cfg).boites[m.nom][d] || 'bv');
    ouvSauver(); dessinerOuverture();
  });
  w.appendChild(s);
  if(m.mode === 'i'){
    const i = document.createElement('input');
    i.type = 'number'; i.min = '0'; i.max = '100'; i.value = String(m.pct); i.disabled = !mod;
    i.setAttribute('aria-label', 'Pourcentage');
    i.addEventListener('change', () => { m.pct = Math.max(0, Math.min(100, Math.round(Number(i.value) || 0))); ouvSauver(); dessinerOuverture(); });
    const b = document.createElement('select');
    [['bv', '% BV'], ['bea', '% BEA']].forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; if(m.pctBoite === v) o.selected = true; b.appendChild(o); });
    b.disabled = !mod;
    b.addEventListener('change', () => { m.pctBoite = b.value; ouvSauver(); dessinerOuverture(); });
    w.append(i, b);
  }
  return w;
}
/* Le menu d'un jour : où, quelle boîte, ses créneaux, la moto */
function menuJourOuv(m, d, ancre){
  const j = m.jours[d];
  const refaire = (rouvrir) => {
    ouvSauver(); dessinerOuverture();
    if(rouvrir){ const td = document.querySelector('#ouvZone td[data-ov="' + CSS.escape(m.nom + '|' + d) + '"]'); if(td) menuJourOuv(m, d, td); }
  };
  const poser = (lieu, boite) => { j.lieu = lieu; if(boite) j.boite = boite; if(lieu === 'SB' && !boite && m.mode === 'p' && j.boite === 'auto') j.boite = 'bv'; refaire(false); };
  const items = [{ titre: 'OÙ, ET QUOI' }];
  if(m.mode !== 'p') items.push({ emoji: '⚖️', texte: 'Saint-Brieuc · l’équilibre choisit BV ou BEA', on: j.lieu === 'SB' && j.boite === 'auto', faire: () => poser('SB', 'auto') });
  items.push({ emoji: '🔵', texte: 'Saint-Brieuc · BV', on: j.lieu === 'SB' && j.boite === 'bv', faire: () => poser('SB', 'bv') },
             { emoji: '🟢', texte: 'Saint-Brieuc · BEA', on: j.lieu === 'SB' && j.boite === 'bea', faire: () => poser('SB', 'bea') },
             { emoji: '🟠', texte: 'Loudéac · BV-BEA (.LOUDEAC à 7h)', on: j.lieu === 'L', faire: () => poser('L') },
             { emoji: '🎫', texte: 'RESA PERMIS · toute la journée (8h-19h)', on: j.lieu === 'R', faire: () => poser('R') },
             { emoji: '😴', texte: 'Repos', on: j.lieu === 'off', faire: () => poser('off') });
  if(j.lieu === 'SB' || j.lieu === 'L'){
    items.push({ sep: true }, { titre: 'SES CRÉNEAUX' });
    OUV_CRENEAUX.forEach(h => {
      const pris = j.creneaux.indexOf(h) !== -1;
      items.push({ emoji: pris ? '✅' : '⬜', texte: ouvH(h) + '-' + ouvH(ouvHeure(ouvMin(h) + 120)), faire: () => {
        if(pris) j.creneaux = j.creneaux.filter(x => x !== h); else j.creneaux = OUV_CRENEAUX.filter(x => x === h || j.creneaux.indexOf(x) !== -1);
        refaire(true);
      } });
    });
  }
  if(j.lieu === 'SB' && j.creneaux.length){
    items.push({ sep: true }, { titre: '🏍️ MOTO PLATEAU 2H (À LA PLACE DE LA CONDUITE)' });
    j.creneaux.forEach(h => {
      const moto = (j.moto || []).indexOf(h) !== -1;
      items.push({ emoji: moto ? '🏍️' : '⬜', texte: ouvH(h) + '-' + ouvH(ouvHeure(ouvMin(h) + 120)), faire: () => {
        j.moto = moto ? (j.moto || []).filter(x => x !== h) : (j.moto || []).concat([h]);
        refaire(true);
      } });
    });
  }
  menuGestesEC(ancre, '📅 ' + OUV_JOURS_LONGS[d] + ' · ' + m.nom, items);
}
async function ajouterMoniteurOuv(){
  let cols = OUV.ressources;
  if(!cols){
    try{ showToast('Lecture des colonnes de Drivup…'); cols = (await ouvLireDrivup(ouvAuj(), ouvAuj())).ressources || []; }
    catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); return; }
  }
  const pris = {};
  OUV.cfg.moniteurs.forEach(m => { pris[m.res] = true; });
  const items = [{ titre: 'SA COLONNE DANS DRIVUP' }];
  cols.filter(c => !pris[c.id]).forEach(c => items.push({ emoji: '👤', texte: c.titre + ' (n° ' + c.id + ')', faire: async () => {
    const nom = await demander('Son prénom, tel qu’on le dit dans l’App', String(c.titre).replace(/AnQn$/, ''), '＋ Un moniteur');
    if(!nom || !String(nom).trim()) return;
    const j = {};
    for(let d = 1; d <= 6; d++) j[d] = ouvJourVide();
    OUV.cfg.moniteurs.push({ nom: String(nom).trim().slice(0, 40), res: c.id, actif: true, mode: 'c', pct: 50, pctBoite: 'bv', jours: j });
    ouvSauver(); dessinerOuverture();
  } }));
  menuGestesEC(document.querySelector('#ouvZone .ovRang:nth-of-type(3)') || document.getElementById('ouvZone'), '＋ Un moniteur', items);
}
/* ↺ Les jours de chacun, lus dans Drivup sur deux semaines à venir */
async function reprendreDrivupOuv(){
  const du = ouvPlus(ouvLundi(ouvAuj()), 7), au = ouvPlus(du, 12);
  let d;
  try{ showToast('Lecture de Drivup du ' + ouvFr(du) + ' au ' + ouvFr(au) + '…'); d = await ouvLireDrivup(du, au); }
  catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); return; }
  const noms = {};
  Object.keys(d.prestations || {}).forEach(id => { noms[id] = ouvNorm(d.prestations[id]); });
  const neuf = {};
  OUV.cfg.moniteurs.forEach(m => {
    const ev = (d.evenements || []).filter(e => e.res === m.res);
    const jours = {};
    for(let k = 1; k <= 6; k++){
      const l = ev.filter(e => ouvJourSem(e.jour) === k);
      const n = l.map(e => noms[e.type] || '');
      const j = ouvJourVide();
      j.moto = m.jours[k].moto || [];
      if(n.some(x => x === OUV_PRESTA.loud || x === OUV_PRESTA.marque)) j.lieu = 'L';
      else if(n.some(x => x === OUV_PRESTA.resa)) j.lieu = 'R';
      else if(n.some(x => /^conduite\b/.test(x) || x === OUV_PRESTA.moto)) j.lieu = 'SB';
      if(j.lieu === 'SB' || j.lieu === 'L'){
        const h = [...new Set(l.filter(e => OUV_CRENEAUX.indexOf(e.debut) !== -1 && ouvMin(e.fin) - ouvMin(e.debut) === 120).map(e => e.debut))];
        if(h.length) j.creneaux = OUV_CRENEAUX.filter(x => h.indexOf(x) !== -1);
        const motos = [...new Set(l.filter(e => noms[e.type] === OUV_PRESTA.moto).map(e => e.debut))];
        if(motos.length) j.moto = motos;
        j.moto = j.moto.filter(x => j.creneaux.indexOf(x) !== -1);
      }
      j.boite = m.mode === 'p' ? (m.jours[k].boite === 'auto' ? 'bv' : m.jours[k].boite) : 'auto';
      jours[k] = j;
    }
    neuf[m.nom] = jours;
  });
  const lignes = OUV.cfg.moniteurs.map(m => '· ' + m.nom + ' : ' + [1, 2, 3, 4, 5, 6].map(k => {
    const j = neuf[m.nom][k];
    return OUV_JOURS[k] + ' ' + ({ SB: 'St-Brieuc', L: 'Loudéac', R: 'RESA', off: 'repos' }[j.lieu]);
  }).join(', '));
  if(!await confirmer('Reprendre les jours de travail lus dans Drivup, du ' + ouvFr(du) + ' au ' + ouvFr(au) + ' ?\n\n' + lignes.join('\n') +
    '\n\nBV ou BEA : l’équilibre choisit (sauf pour un moniteur « pas compté »). Les créneaux sont ceux des cours de 2h trouvés. La salle et les bureaux ne changent pas.', '↺ Reprendre')) return;
  OUV.cfg.moniteurs.forEach(m => { m.jours = neuf[m.nom]; });
  ouvSauver(); dessinerOuverture();
  showToast('↺ Semaine type reprise de Drivup');
}

/* ---------- 🏫 la salle ---------- */
function dessinerSalleOuv(z){
  const cfg = OUV.cfg, mod = ouvPeutModifier();
  z.appendChild(ouvEl('div', 'ovAide', 'Recopié de Drivup (semaine du 7 décembre 2026), avec tes deux corrections : le jeudi 14h-16h ouvert à Saint-Brieuc, rien le lundi à Loudéac. Des créneaux d’1h. Touche une case pour la changer.'));
  const g = ouvEl('div', 'ovGrille');
  const t = document.createElement('table');
  t.innerHTML = '<thead><tr><th>Colonne Drivup</th>' + [1, 2, 3, 4, 5, 6].map(d => '<th>' + OUV_JOURS[d] + '</th>').join('') + '</tr></thead>';
  const tb = document.createElement('tbody');
  cfg.salle.forEach(c => {
    const tr = document.createElement('tr');
    tr.appendChild(ouvEl('td', '', ouvEch(c.nom) + '<div class="ovNote" style="font-weight:400;">' + ouvEch(OUV_NOMS_PRESTA[c.presta] || c.presta) + '</div>'));
    for(let d = 1; d <= 6; d++){
      const pl = c.jours[d] || [];
      const td = ouvEl('td', mod ? 'ovCase' : '', pl.length ? ouvC('sal', pl.map(([a, b]) => ouvH(a) + '-' + ouvH(b)).join(' · ')) : '<span class="ovC off">—</span>');
      if(mod) td.addEventListener('click', async () => {
        const v = await demander(c.nom + ', le ' + OUV_JOURS_LONGS[d].toLowerCase() + ' : les heures (ex. « 10-18 », ou « 10-14 16-18 ») ; vide = fermé',
          pl.map(([a, b]) => (+a.slice(0, 2)) + '-' + (+b.slice(0, 2))).join(' '), '🏫 ' + c.nom);
        if(v === null || v === undefined || v === false) return;
        const plages = [];
        String(v).split(/[\s,;]+/).forEach(x => {
          const m = x.match(/^(\d{1,2})(?:h)?-(\d{1,2})(?:h)?$/);
          if(m && +m[1] < +m[2] && +m[2] <= 22) plages.push([String(m[1]).padStart(2, '0') + ':00', String(m[2]).padStart(2, '0') + ':00']);
        });
        c.jours[d] = plages;
        ouvSauver(); dessinerOuverture();
      });
      tr.appendChild(td);
    }
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  g.appendChild(t);
  z.appendChild(g);
}

/* ---------- 🗂️ les bureaux ---------- */
function dessinerBureauxOuv(z){
  const cfg = OUV.cfg, mod = ouvPeutModifier();
  const hor = (cfg.horairesBureau || []).map(([a, b]) => ouvH(a) + '-' + ouvH(b)).join(' et ');
  z.appendChild(ouvEl('div', 'ovAide', 'Recopié de Drivup : « Bureau Saint Brieuc » ou « Bureau Loudéac », ' + ouvEch(hor) + '. Touche une case pour la changer.'));
  const g = ouvEl('div', 'ovGrille');
  const t = document.createElement('table');
  t.innerHTML = '<thead><tr><th>Bureau</th>' + [1, 2, 3, 4, 5, 6].map(d => '<th>' + OUV_JOURS[d] + '</th>').join('') + '</tr></thead>';
  const tb = document.createElement('tbody');
  cfg.bureaux.forEach(b => {
    const tr = document.createElement('tr');
    tr.appendChild(ouvEl('td', '', ouvEch(b.nom)));
    for(let d = 1; d <= 6; d++){
      const l = b.jours[d] || '';
      const td = ouvEl('td', mod ? 'ovCase' : '', l ? ouvC(l === 'L' ? 'l' : 'bea', l === 'L' ? '📍 Loudéac' : '📍 St-Brieuc') + '<div class="ovNote">' + ouvEch(hor) + '</div>' : '<span class="ovC off">—</span>');
      if(mod) td.addEventListener('click', () => menuGestesEC(td, '🗂️ ' + b.nom + ' · ' + OUV_JOURS_LONGS[d], [
        { emoji: '📍', texte: 'Saint-Brieuc', on: l === 'SB', faire: () => { b.jours[d] = 'SB'; ouvSauver(); dessinerOuverture(); } },
        { emoji: '🟠', texte: 'Loudéac', on: l === 'L', faire: () => { b.jours[d] = 'L'; ouvSauver(); dessinerOuverture(); } },
        { emoji: '—', texte: 'Pas de bureau', on: !l, faire: () => { b.jours[d] = ''; ouvSauver(); dessinerOuverture(); } }]));
      tr.appendChild(td);
    }
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  g.appendChild(t);
  z.appendChild(g);
}

/* ============================================================
   📍 LOUDÉAC PAR MOIS — qui y est, et en changer un jour
   David : « une vue simplifiée par mois quand c'est ouvert sur Loudéac
   avec quel moniteur, et si je veux mettre un autre moniteur sur
   Loudéac, que ça fasse le changement sur Drivup ». Puis : les deux
   ÉCHANGENT leur journée.
   ============================================================ */
const OUV_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function dessinerLoudeacOuv(z){
  const cfg = OUV.cfg, mod = ouvPeutModifier();
  const mois = /^\d{4}-\d{2}$/.test(OUV.mois) ? OUV.mois : ouvAuj().slice(0, 7);
  const eq = ouvEquilibre(cfg);
  z.appendChild(ouvEl('div', 'ovAide', 'Les jours où Loudéac est ouvert, et qui y est. C’est la semaine type ; touche un jour pour y mettre un autre moniteur : les deux <b>échangent leur journée</b> dans Drivup (Loudéac et le .LOUDEAC de 7h d’un côté, ses cours de Saint-Brieuc de l’autre). Un jour changé est entouré.'));
  const nav = ouvEl('div', 'ovRang');
  const decaler = n => { const a = +mois.slice(0, 4), m = +mois.slice(5, 7) - 1 + n; const d = new Date(Date.UTC(a, m, 1)); OUV.mois = d.toISOString().slice(0, 7); dessinerOuverture(); };
  nav.appendChild(ouvChip(false, '◀', () => decaler(-1), 'Le mois d’avant'));
  nav.appendChild(ouvEl('b', '', OUV_MOIS[+mois.slice(5, 7) - 1].replace(/^./, c => c.toUpperCase()) + ' ' + mois.slice(0, 4)));
  nav.lastChild.style.fontSize = '15px';
  nav.appendChild(ouvChip(false, '▶', () => decaler(1), 'Le mois d’après'));
  nav.appendChild(ouvEl('span', 'ovNote', '🚗 conduite · 🗂️ bureau · 🏫 salle'));
  z.appendChild(nav);
  const g = ouvEl('div', 'ovMois');
  [1, 2, 3, 4, 5, 6].forEach(d => g.appendChild(ouvEl('div', 'tete', OUV_JOURS[d])));
  const premier = mois + '-01';
  for(let k = 0; k < (ouvJourSem(premier) + 6) % 7 && k < 6; k++) g.appendChild(document.createElement('div'));
  const changes = [];
  for(let j = premier; j.slice(0, 7) === mois; j = ouvPlus(j, 1)){
    const d = ouvJourSem(j);
    if(d === 0) continue;
    const n = +j.slice(8, 10);
    if(ouvFerie(j)){ g.appendChild(ouvEl('div', 'ovJ ferie', '<div class="n">' + n + '<span class="ovNote">Férié</span></div>')); continue; }
    const jn = ouvJourneesDu(cfg, j, eq);
    const aLoud = Object.keys(jn).filter(nom => jn[nom].j.lieu === 'L');
    const bur = cfg.bureaux.filter(b => b.jours[d] === 'L').map(b => b.nom);
    const salle = cfg.salle.some(c => c.agence === '3' && (c.jours[d] || []).length);
    const ech = cfg.loudeac[j];
    if(!aLoud.length && !bur.length && !salle){ g.appendChild(ouvEl('div', 'ovJ vide', '<div class="n">' + n + '</div><div class="qui">—</div>')); continue; }
    const qui = aLoud.map(x => '<b>🚗 ' + ouvEch(x) + '</b>').concat(bur.map(x => '<span>🗂️ ' + ouvEch(x) + '</span>')).concat(salle ? ['<span>🏫 salle</span>'] : []).join('');
    const html = '<div class="n">' + n + (ech ? '<span title="échangé">🔁</span>' : '') + '</div><div class="qui">' + qui + '</div>';
    if(ech) changes.push(ouvFrCourt(j) + ' : ' + ech.vers + ' à la place de ' + ech.de);
    if(aLoud.length && mod){
      const b = ouvEl('button', 'ovJ' + (ech ? ' change' : ''), html);
      b.type = 'button';
      b.title = 'Mettre un autre moniteur à Loudéac ce jour-là';
      b.addEventListener('click', () => echangeLoudeacOuv(j));
      g.appendChild(b);
    }else g.appendChild(ouvEl('div', 'ovJ' + (ech ? ' change' : ''), html));
  }
  const bo = ouvEl('div', 'ovBoite');
  bo.style.padding = '10px';
  bo.appendChild(g);
  z.appendChild(bo);
  z.appendChild(ouvEl('div', 'ovNote', changes.length ? '🔁 ' + changes.map(ouvEch).join(' · ') : 'Aucun échange ce mois-ci : c’est la semaine type.'));
}
/* une fenêtre de l'App, avec un contenu qui change */
function fenetreOuv(titre){
  const fond = ouvEl('div', 'overlay show');
  const boite = ouvEl('div', 'modal ovFen');
  boite.style.maxWidth = 'min(560px, 94vw)';
  boite.appendChild(ouvEl('h3', '', ouvEch(titre)));
  const corps = ouvEl('div', '');
  const pied = ouvEl('div', 'btn-row');
  boite.append(corps, pied);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };
  fond.addEventListener('click', ev => { if(ev.target === fond) fermer(); });
  return { fond: fond, boite: boite, corps: corps, pied: pied, fermer: fermer,
           bouton: (t, principal, faire) => { const b = ouvEl('button', 'btn ' + (principal ? 'btn-primary' : 'btn-secondary'), ouvEch(t)); b.type = 'button'; b.addEventListener('click', faire); pied.appendChild(b); return b; } };
}
/* l'élève d'un cours Drivup → son nom dans l'App (pour le prévenir) */
function ouvEleveApp(x){
  const mots = t => ouvNorm(t).split(' ').filter(Boolean).sort().join(' ');
  const cle = mots([x && x.prenom, x && x.nom].filter(Boolean).join(' '));
  if(!cle) return '';
  const l = (typeof fichesEleves !== 'undefined' && Array.isArray(fichesEleves)) ? fichesEleves : [];
  const f = l.find(e => mots(e.eleve) === cle);
  return f ? f.eleve : '';
}
async function ouvPrevenir(liste){
  const rates = [];
  for(const p of liste){
    if(!p.nomApp){ rates.push(p.affiche + ' (pas trouvé dans l’App)'); continue; }
    try{
      const r = await appelPrep({ action: 'messageBureauEleve', eleve: p.nomApp, texte: p.texte });
      if(!r || r.status === 'error') rates.push(p.affiche + (r && r.sansMessagerie ? ' (pas d’App ouverte)' : ''));
    }catch(e){ rates.push(p.affiche); }
  }
  return rates;
}
function ouvTexteDeplace(prenom, jour, debut, moniteur, ancien){
  return 'Bonjour ' + (prenom || '') + ',\n\nTon cours de conduite du ' + ouvFrCourt(jour) + ' à ' + ouvH(debut) + ' aura lieu avec ' + moniteur +
    (ancien ? ' (au lieu de ' + ancien + ')' : '') + '. Rien d’autre ne change.\n\nÀ bientôt,\nL’équipe Évolution Conduites';
}
async function echangeLoudeacOuv(iso){
  const cfg = OUV.cfg;
  const eq = ouvEquilibre(cfg);
  const jn = ouvJourneesDu(cfg, iso, eq);
  const A = Object.keys(jn).find(nom => jn[nom].j.lieu === 'L');
  if(!A) return;
  const ech = cfg.loudeac[iso];
  const typeL = ech ? ech.de : A;
  const f = fenetreOuv('🔁 Qui à Loudéac ?');
  f.corps.appendChild(ouvEl('div', 'ovNote', ouvEch(OUV_JOURS_LONGS[ouvJourSem(iso)] + ' ' + ouvFr(iso)) + ' · aujourd’hui : <b>🚗 ' + ouvEch(A) + '</b> à Loudéac' +
    (ech ? ' (à la place de ' + ouvEch(ech.de) + ')' : '')));
  const choix = ouvEl('div', 'ovRang');
  choix.style.margin = '10px 0';
  f.corps.appendChild(choix);
  const zone = ouvEl('div', '');
  f.corps.appendChild(zone);
  const annuler = f.bouton('Annuler', false, () => f.fermer());
  const go = f.bouton('🔁 Échanger dans Drivup', true, () => {});
  go.disabled = true;
  let plan = null;
  const autres = cfg.moniteurs.filter(m => m.actif && m.nom !== A);
  autres.forEach(m => choix.appendChild(ouvChip(false, m.nom + (ech && m.nom === typeL ? ' (semaine type)' : ''), async () => {
    [...choix.children].forEach(b => b.classList.toggle('on', b.textContent.indexOf(m.nom) === 0));
    go.disabled = true;
    if(ech && m.nom !== typeL){
      zone.innerHTML = '<div class="ovWarn">Ce jour est déjà échangé (' + ouvEch(A) + ' à la place de ' + ouvEch(ech.de) + '). Remets d’abord ' + ouvEch(ech.de) + ', puis choisis un autre moniteur.</div>';
      return;
    }
    zone.innerHTML = '<div class="ovNote">Lecture de Drivup…</div>';
    const B = m.nom;
    const mA = cfg.moniteurs.find(x => x.nom === A), mB = m;
    let d = null;
    try{ d = await ouvLireDrivup(iso, iso, [mA.res, mB.res]); }
    catch(e){
      /* sans l'extension : on garde l'échange pour l'ouverture, rien n'est encore dans Drivup */
      zone.innerHTML = '<div class="ovWarn">⚠️ ' + ouvEch((e && e.message) || e) + '</div>';
      return;
    }
    const noms = {};
    Object.keys(d.prestations || {}).forEach(id => { noms[id] = ouvNorm(d.prestations[id]); });
    const deA = (d.evenements || []).filter(e => e.res === mA.res && OUV_MONITEUR.test(noms[e.type] || '') && e.examen === '0');
    const deB = (d.evenements || []).filter(e => e.res === mB.res && OUV_MONITEUR.test(noms[e.type] || '') && e.examen === '0');
    const eleves = [];
    const nomsEl = (e, vers, de) => ((d.details || {})[e.id] || []).forEach(x => eleves.push({ x: x, e: e, vers: vers, de: de }));
    deA.filter(e => e.nbr > 0).forEach(e => nomsEl(e, B, A));
    deB.filter(e => e.nbr > 0).forEach(e => nomsEl(e, A, B));
    plan = { A: mA, B: mB, deA: deA, deB: deB, eleves: eleves, prevenir: false };
    zone.textContent = '';
    if(!deA.length && !deB.length){
      zone.appendChild(ouvEl('div', 'ovOpt', '<span>ℹ️</span><span>Rien encore dans Drivup ce jour-là : l’échange est gardé, et l’ouverture le posera ainsi.</span>'));
    }else{
      zone.appendChild(ouvEl('div', 'ovOpt', '<span>🟠</span><span><b>' + ouvEch(B) + ' va à Loudéac</b><br>' + deA.length + ' cours de ' + ouvEch(A) + ' passent sur ' + ouvEch(B) +
        (deA.some(e => e.nbr) ? ' (' + deA.filter(e => e.nbr).length + ' avec un élève, qui garde son cours)' : '') + '.</span>'));
      zone.appendChild(ouvEl('div', 'ovOpt', '<span>🟢</span><span><b>' + ouvEch(A) + ' prend la journée de ' + ouvEch(B) + '</b><br>' + deB.length + ' cours passent sur ' + ouvEch(A) +
        (deB.some(e => e.nbr) ? ' (' + deB.filter(e => e.nbr).length + ' avec un élève, qui garde son cours)' : '') + '.</span>'));
      if(eleves.length){
        const lc = document.createElement('label');
        lc.className = 'ovCoche';
        const cc = document.createElement('input');
        cc.type = 'checkbox';
        cc.addEventListener('change', () => { plan.prevenir = cc.checked; });
        lc.append(cc, ouvEl('span', '', '✉️ Prévenir ' + (eleves.length > 1 ? 'les ' + eleves.length + ' élèves' : 'l’élève') + ' que leur moniteur change (' +
          eleves.map(y => ouvEch([y.x.prenom, y.x.nom].filter(Boolean).join(' '))).join(', ') + ')'));
        zone.appendChild(lc);
      }
    }
    go.disabled = false;
  })));
  go.addEventListener('click', async () => {
    if(!plan) return;
    go.disabled = true; annuler.disabled = true;
    zone.appendChild(ouvEl('div', 'ovNote', '🔁 Dans Drivup…'));
    const liste = plan.deA.map(e => ({ cle: e.id, id: e.id, res: e.res, jour: e.jour, debut: e.debut, vers: plan.B.res }))
      .concat(plan.deB.map(e => ({ cle: e.id, id: e.id, res: e.res, jour: e.jour, debut: e.debut, vers: plan.A.res })));
    let rates = [];
    if(liste.length){
      try{
        const r = await ouvExt({ type: 'drivup-cours-deplacer', liste: liste }, 'drivup-cours-deplaces', 600000);
        rates = (r.resultats || []).filter(x => !x.ok);
      }catch(e){ showToast('⚠️ ' + ((e && e.message) || e)); go.disabled = false; annuler.disabled = false; return; }
    }
    /* la semaine type garde l'échange (ou le retire, si l'on revient à elle) */
    if(plan.B.nom === typeL) delete cfg.loudeac[iso];
    else cfg.loudeac[iso] = { de: typeL, vers: plan.B.nom };
    ouvSauver();
    let pasPrevenus = [];
    if(plan.prevenir && plan.eleves.length){
      pasPrevenus = await ouvPrevenir(plan.eleves.map(y => ({ nomApp: ouvEleveApp(y.x), affiche: [y.x.prenom, y.x.nom].filter(Boolean).join(' '),
        texte: ouvTexteDeplace(y.x.prenom, y.e.jour, y.e.debut, y.vers, y.de) })));
    }
    f.fermer();
    dessinerOuverture();
    if(rates.length) await confirmer('🔁 Échange fait en partie : ' + rates.length + ' cours pas déplacé(s) dans Drivup :\n\n' + rates.map(x => '· ' + x.message).join('\n') + '\n\nÀ reprendre dans Drivup.', '🔁 Loudéac');
    else showToast('🔁 ' + plan.B.nom + ' à Loudéac le ' + ouvFr(iso) + (liste.length ? ' · ' + liste.length + ' cours échangés dans Drivup' : ''));
    if(pasPrevenus.length) showToast('✉️ À prévenir à la main : ' + pasPrevenus.join(', '));
  });
}

/* ============================================================
   📤 OUVRIR — un mois, un trimestre ou une période
   ============================================================ */
function periodesOuv(mode){
  const auj = ouvAuj(), out = [];
  if(mode === 'mois'){
    for(let k = 0; k < 13; k++){
      const d = new Date(Date.UTC(+auj.slice(0, 4), +auj.slice(5, 7) - 1 + k, 1));
      const du = d.toISOString().slice(0, 10), fin = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
      out.push({ cle: du.slice(0, 7), nom: OUV_MOIS[d.getUTCMonth()].replace(/^./, c => c.toUpperCase()) + ' ' + d.getUTCFullYear(), du: du, au: fin });
    }
  }else if(mode === 'trim'){
    const t0 = Math.floor((+auj.slice(5, 7) - 1) / 3);
    for(let k = 0; k < 6; k++){
      const d = new Date(Date.UTC(+auj.slice(0, 4), (t0 + k) * 3, 1));
      const du = d.toISOString().slice(0, 10), fin = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 0)).toISOString().slice(0, 10);
      out.push({ cle: du.slice(0, 7), nom: (Math.floor(d.getUTCMonth() / 3) + 1) + (d.getUTCMonth() < 3 ? 'er' : 'e') + ' trimestre ' + d.getUTCFullYear() + ' · ' + ouvFrCourt(du) + ' → ' + ouvFrCourt(fin), du: du, au: fin });
    }
  }
  return out;
}
function periodeChoisieOuv(){
  const o = OUV.ouvrir;
  let du, au;
  if(o.mode === 'periode'){ du = o.du; au = o.au; }
  else {
    const l = periodesOuv(o.mode);
    const p = l.find(x => x.cle === o.choix) || l[o.mode === 'mois' ? 1 : 1] || l[0];
    o.choix = p.cle;
    du = p.du; au = p.au;
  }
  const demain = ouvPlus(ouvAuj(), 1);
  if(du && du < demain) du = demain;
  return { du: du || '', au: au || '' };
}
function dessinerOuvrirOuv(z){
  const o = OUV.ouvrir, cfg = OUV.cfg, mod = ouvPeutModifier();
  if(!o.qui) o.qui = cfg.moniteurs.filter(m => m.actif).map(m => m.nom).concat(['salle', 'bureaux']);
  const refaire = () => { o.apercu = null; o.bilan = null; dessinerOuverture(); };
  /* ① quand */
  const b1 = ouvEl('div', 'ovBoite', '<h4>① Quand ?</h4>');
  const r1 = ouvEl('div', 'ovRang');
  r1.style.margin = '0';
  [['mois', 'Un mois'], ['trim', 'Un trimestre'], ['periode', 'Une période']].forEach(([k, t]) => r1.appendChild(ouvChip(o.mode === k, t, () => { o.mode = k; o.choix = ''; refaire(); })));
  if(o.mode === 'periode'){
    const p = periodeChoisieOuv();
    const i1 = document.createElement('input'), i2 = document.createElement('input');
    [i1, i2].forEach(i => { i.type = 'date'; i.style.cssText = 'width:auto;margin:0;'; });
    i1.value = o.du || ''; i2.value = o.au || '';
    i1.addEventListener('change', () => { o.du = i1.value; refaire(); });
    i2.addEventListener('change', () => { o.au = i2.value; refaire(); });
    r1.append(ouvEl('span', '', 'du'), i1, ouvEl('span', '', 'au'), i2);
    void p;
  }else{
    const s = document.createElement('select');
    s.style.cssText = 'width:auto;margin:0;';
    periodesOuv(o.mode).forEach(p => { const op = document.createElement('option'); op.value = p.cle; op.textContent = p.nom; s.appendChild(op); });
    periodeChoisieOuv();
    s.value = o.choix;
    s.addEventListener('change', () => { o.choix = s.value; refaire(); });
    r1.appendChild(s);
  }
  b1.appendChild(r1);
  b1.appendChild(ouvEl('div', 'ovNote', 'Les jours fériés sont sautés (1er janvier, lundi de Pâques…). Rien avant demain.'));
  b1.lastChild.style.marginTop = '6px';
  z.appendChild(b1);
  /* ② pour qui */
  const b2 = ouvEl('div', 'ovBoite', '<h4>② Pour qui ?</h4>');
  const r2 = ouvEl('div', 'ovRang');
  r2.style.margin = '0';
  const tous = cfg.moniteurs.filter(m => m.actif).map(m => m.nom).concat(['salle', 'bureaux']);
  r2.appendChild(ouvChip(tous.every(k => o.qui.indexOf(k) !== -1), 'Tous', () => { o.qui = tous.every(k => o.qui.indexOf(k) !== -1) ? [] : tous.slice(); refaire(); }));
  tous.forEach(k => r2.appendChild(ouvChip(o.qui.indexOf(k) !== -1, k === 'salle' ? '🏫 Salle' : k === 'bureaux' ? '🗂️ Bureaux' : k, () => {
    const i = o.qui.indexOf(k); if(i === -1) o.qui.push(k); else o.qui.splice(i, 1); refaire();
  })));
  b2.appendChild(r2);
  z.appendChild(b2);
  /* ③ l'aperçu */
  const b3 = ouvEl('div', 'ovBoite', '<h4>③ L’aperçu</h4>');
  const p = periodeChoisieOuv();
  if(!p.du || !p.au || p.au < p.du){
    b3.appendChild(ouvEl('div', 'ovNote', 'Choisis une période (à partir de demain).'));
    z.appendChild(b3);
    return;
  }
  if(!o.apercu){
    b3.appendChild(ouvEl('div', 'ovNote', 'Du ' + ouvFr(p.du) + ' au ' + ouvFr(p.au) + '. Je lis d’abord ce qu’il y a déjà dans Drivup, pour ne rien doubler.'));
    const bt = ouvChip(false, '🔎 Préparer l’aperçu', () => apercuOuv(bt));
    bt.style.marginTop = '8px';
    if(!o.qui.length) bt.disabled = true;
    b3.appendChild(bt);
    z.appendChild(b3);
    return;
  }
  const a = o.apercu;
  if(a.manque.length) b3.appendChild(ouvEl('div', 'ovWarn', '⚠️ Prestation(s) introuvable(s) dans Drivup : ' + a.manque.map(k => '« ' + ouvEch(OUV_NOMS_PRESTA[k] || k) + ' »').join(', ') + ' — ces cours ne seront pas ouverts.'));
  a.lignes.forEach(l => b3.appendChild(ouvEl('div', 'ovLigne', '<b>' + ouvEch(l.nom) + '</b><span>' + ouvEch(l.detail) + '</span><span class="ovNb">' + l.n + ' à ouvrir</span>' +
    (l.ajuster ? '<span class="ovNb">⏱️ ' + l.ajuster + ' à remettre à leurs heures</span>' : '') +
    (l.deja ? '<span class="ovNote">' + l.deja + ' déjà dans Drivup</span>' : ''))));
  if(a.ajuster.length){
    const ex = a.ajuster[0];
    b3.appendChild(ouvEl('div', 'ovNote', '⏱️ ' + a.ajuster.length + ' cours déjà dans Drivup au bon début mais à la mauvaise fin (par exemple ' + ouvEch(ouvFrCourt(ex.jour) + ' ' + ouvH(ex.debut) + '-' + ouvH(ex.avant)) +
      ' au lieu de ' + ouvEch(ouvH(ex.debut) + '-' + ouvH(ex.fin)) + ') : ils seront allongés ou raccourcis, comme quand on tire le bas du cours dans Drivup.'));
    b3.lastChild.style.marginTop = '8px';
  }
  b3.appendChild(ouvEl('div', 'ovNote', (a.feries.length ? '🎌 Sautés : ' + a.feries.map(ouvFrCourt).join(', ') + ' — ' : '') +
    'Ce qui est déjà dans Drivup n’est jamais doublé. L’extension utilise la répétition de Drivup (« chaque semaine, jusqu’au … ») : ' + a.series.length + ' envois pour ' + a.n + ' cours, puis elle vérifie que tout est dans le planning.'));
  b3.lastChild.style.marginTop = '8px';
  z.appendChild(b3);
  if(o.bilan) z.appendChild(o.bilan);
  const act = ouvEl('div', 'ovRang');
  act.appendChild(ouvChip(false, '↻ Relire', () => { o.apercu = null; o.bilan = null; dessinerOuverture(); }));
  const go = ouvEl('button', 'btn btn-primary', a.n ? '📤 Ouvrir dans Drivup · ' + a.n + ' cours' + (a.ajuster.length ? ' · ⏱️ ' + a.ajuster.length + ' remis à leurs heures' : '')
    : '⏱️ Remettre ' + a.ajuster.length + ' cours à leurs heures');
  go.type = 'button';
  go.style.cssText = 'width:auto;margin:0;';
  go.disabled = (!a.n && !a.ajuster.length) || !mod || o.enCours;
  go.addEventListener('click', () => ouvrirDansDrivupOuv(go));
  act.appendChild(go);
  z.appendChild(act);
}
async function apercuOuv(bouton){
  const o = OUV.ouvrir, cfg = OUV.cfg;
  const p = periodeChoisieOuv();
  bouton.disabled = true; bouton.textContent = '🔎 Lecture de Drivup…';
  let d;
  try{ d = await ouvLireDrivup(p.du, p.au); }
  catch(e){ bouton.disabled = false; bouton.textContent = '🔎 Préparer l’aperçu'; showToast('⚠️ ' + ((e && e.message) || e)); return; }
  const idDe = ouvIdsDesPrestations(d.prestations);
  const att = ouvAttendus(cfg, p.du, p.au, o.qui);
  const ev = d.evenements || [];
  const pris = (c) => ev.some(e => e.res === c.res && e.jour === c.jour && ouvMin(e.debut) < ouvMin(c.fin) && ouvMin(c.debut) < ouvMin(e.fin || e.debut));
  /* ⏱️ v1574 — David : « ça ne met qu'une heure » (les bureaux, ouverts
     avec l'extension 1.8.0). Un cours de la bonne prestation, au bon
     début, mais qui ne finit pas à la bonne heure : on le remet à ses
     heures au lieu de le compter « déjà là ». */
  const aAjuster = [];
  const aussi = (c) => ev.find(e => e.res === c.res && e.jour === c.jour && e.debut === c.debut && idDe[c.presta] && e.type === idDe[c.presta] && e.fin && e.fin !== c.fin);
  const aCreer = [], manque = {};
  const parGrp = {};
  att.cours.forEach(c => {
    const g = parGrp[c.grp] = parGrp[c.grp] || { n: 0, deja: 0, ajuster: 0, jours: {}, cols: {}, extra: {} };
    const mal = aussi(c);
    if(mal){ g.ajuster++; aAjuster.push({ cle: mal.id, id: mal.id, res: mal.res, jour: mal.jour, debut: mal.debut, fin: c.fin, avant: mal.fin, grp: c.grp, presta: c.presta }); return; }
    if(pris(c)){ g.deja++; return; }
    if(!idDe[c.presta]){ manque[c.presta] = true; return; }
    g.n++; g.jours[c.jour] = 1; if(c.col) g.cols[c.col] = 1;
    if(c.presta === 'marque' || c.presta === 'resa' || c.presta === 'moto') g.extra[c.presta] = (g.extra[c.presta] || 0) + 1;
    aCreer.push(c);
  });
  const series = ouvSeries(aCreer, idDe);
  const lignes = Object.keys(parGrp).map(k => {
    const g = parGrp[k];
    const semaines = Object.keys(g.jours).length;
    const ex = Object.keys(g.extra).map(x => g.extra[x] + ' ' + OUV_NOMS_PRESTA[x]).join(' · ');
    return { nom: k === 'salle' ? '🏫 Salle' : k === 'bureaux' ? '🗂️ Bureaux' : k,
             detail: (k === 'salle' || k === 'bureaux' ? Object.keys(g.cols).length + (k === 'salle' ? ' colonnes' : ' personnes') + ' · ' : '') + semaines + ' jour' + (semaines > 1 ? 's' : '') + (ex ? ' · dont ' + ex : ''),
             n: g.n, deja: g.deja, ajuster: g.ajuster };
  });
  o.apercu = { du: p.du, au: p.au, series: series, lignes: lignes, n: aCreer.length, manque: Object.keys(manque), feries: att.feries, ajuster: aAjuster };
  dessinerOuverture();
}
async function ouvrirDansDrivupOuv(bouton){
  const o = OUV.ouvrir, a = o.apercu;
  if(!a || (!a.series.length && !a.ajuster.length) || o.enCours) return;
  if(!await confirmer((a.n ? 'Ouvrir ' + a.n + ' cours' : 'Remettre ' + a.ajuster.length + ' cours à leurs heures') + ' dans Drivup, du ' + ouvFr(a.du) + ' au ' + ouvFr(a.au) + ' ?\n\n' +
    a.lignes.map(l => '· ' + l.nom + ' : ' + l.n + (l.ajuster ? ' (+ ' + l.ajuster + ' remis à leurs heures)' : '')).join('\n') + '\n\nL’extension revérifie chaque créneau juste avant : rien de ce qui est déjà dans Drivup ne sera doublé.', '📤 Ouvrir dans Drivup')) return;
  o.enCours = true;
  bouton.disabled = true;
  const z = document.getElementById('ouvZone');
  const suivi = ouvEl('div', 'ovBoite', '<h4>📤 Dans Drivup…</h4><div class="ovBarre"><span></span></div><div class="ovNote">0 / ' + a.series.length + '</div>');
  z.appendChild(suivi);
  suivi.scrollIntoView({ block: 'nearest' });
  const barre = suivi.querySelector('.ovBarre span'), txt = suivi.querySelector('.ovNote');
  const resultats = [];
  let erreur = '', ajustes = 0;
  const ajustesRates = [];
  const PAQUET = 30;
  try{
    for(let i = 0; i < a.series.length; i += PAQUET){
      const lot = a.series.slice(i, i + PAQUET);
      txt.textContent = 'Envois ' + (i + 1) + ' à ' + (i + lot.length) + ' sur ' + a.series.length + '…';
      const r = await ouvExt({ type: 'drivup-cours-creer', liste: lot.map(s => ({ cle: s.cle, res: s.res, typMo: s.typMo, attendu: s.attendu, debut: s.debut, fin: s.fin, agence: s.agence, dates: s.dates })) },
        'drivup-cours-crees', 900000);
      (r.resultats || []).forEach(x => resultats.push(x));
      barre.style.width = Math.round(Math.min(i + PAQUET, a.series.length) * 100 / a.series.length) + '%';
    }
    /* ce qui manque : une deuxième fois, jour par jour, sans répétition */
    const parCle = {};
    a.series.forEach(s => { parCle[s.cle] = s; });
    const reprise = [];
    resultats.forEach(x => (x.manquants || []).forEach(j => { const s = parCle[x.cle]; if(s) reprise.push(Object.assign({}, s, { cle: s.cle + '·' + j, dates: [j] })); }));
    if(reprise.length){
      txt.textContent = 'Deuxième passage : ' + reprise.length + ' cours…';
      for(let i = 0; i < reprise.length; i += PAQUET){
        const r = await ouvExt({ type: 'drivup-cours-creer', liste: reprise.slice(i, i + PAQUET).map(s => ({ cle: s.cle, res: s.res, typMo: s.typMo, attendu: s.attendu, debut: s.debut, fin: s.fin, agence: s.agence, dates: s.dates })) },
          'drivup-cours-crees', 900000);
        (r.resultats || []).forEach(y => {
          const base = resultats.find(x => x.cle === y.cle.split('·')[0]);
          if(base && y.presents && y.presents.length){ base.manquants = (base.manquants || []).filter(j => y.presents.indexOf(j) === -1); base.presents = (base.presents || []).concat(y.presents); }
          if(base && y.message && !y.presents.length) base.message = y.message;
        });
      }
    }
    /* ⏱️ v1574 — les cours à remettre à leurs heures */
    for(let i = 0; i < a.ajuster.length; i += 100){
      txt.textContent = 'Remis à leurs heures : ' + i + ' / ' + a.ajuster.length + '…';
      const r = await ouvExt({ type: 'drivup-cours-ajuster', liste: a.ajuster.slice(i, i + 100).map(x => ({ cle: x.cle, id: x.id, res: x.res, jour: x.jour, debut: x.debut, fin: x.fin })) },
        'drivup-cours-ajustes', 900000);
      (r.resultats || []).forEach(y => { if(y.ok) ajustes++; else ajustesRates.push(y.message); });
    }
  }catch(e){ erreur = (e && e.message) || String(e); }
  o.enCours = false;
  const poses = resultats.reduce((s, x) => s + (x.presents || []).length, 0);
  const pb = resultats.filter(x => x.message || (x.manquants && x.manquants.length));
  const parCle = {};
  a.series.forEach(s => { parCle[s.cle] = s; });
  const bilan = ouvEl('div', 'ovBoite');
  bilan.innerHTML = '<h4>' + (erreur ? '⚠️ Arrêté en route' : pb.length ? '✅ Ouvert, avec des points à voir' : '✅ Ouvert dans Drivup') + '</h4>' +
    '<div class="ovLigne"><b>' + poses + ' cours</b><span>ouverts, et dans le planning Drivup</span></div>' +
    (a.ajuster.length ? '<div class="ovLigne"><b>⏱️ ' + ajustes + ' cours</b><span>remis à leurs heures' + (ajustesRates.length ? ' · ' + ajustesRates.length + ' pas faits : ' + ouvEch([...new Set(ajustesRates)].slice(0, 3).join(' · ')) : '') + '</span></div>' : '') +
    (erreur ? '<div class="ovWarn">' + ouvEch(erreur) + '<br>Relance « 📤 Ouvrir » : ce qui est fait ne sera pas doublé.</div>' : '') +
    pb.slice(0, 40).map(x => { const s = parCle[x.cle] || {}; return '<div class="ovLigne"><b>' + ouvEch(s.grp || '') + '</b><span>' + ouvEch((OUV_NOMS_PRESTA[s.presta] || '') + ' · ' + OUV_JOURS[ouvJourSem(s.dates ? s.dates[0] : ouvAuj())] + ' ' + ouvH(s.debut)) +
      '</span><span class="ovNote">' + ouvEch(x.message || ((x.manquants || []).length + ' jour(s) absents')) + '</span></div>'; }).join('') +
    (pb.length > 40 ? '<div class="ovNote">… et ' + (pb.length - 40) + ' autres.</div>' : '');
  suivi.remove();
  o.bilan = bilan;
  o.apercu = null;
  dessinerOuverture();
  showToast(erreur ? '⚠️ Ouverture arrêtée : ' + erreur : '📤 ' + poses + ' cours ouverts dans Drivup' + (ajustes ? ' · ⏱️ ' + ajustes + ' remis à leurs heures' : ''));
}

/* ============================================================
   🔒 FERMER · CP — un moniteur, une période, un clic
   ============================================================ */
function dessinerFermerOuv(z){
  const o = OUV.fermer, cfg = OUV.cfg, mod = ouvPeutModifier();
  const actifs = cfg.moniteurs.filter(m => m.actif);
  if(!o.qui || !actifs.some(m => m.nom === o.qui)) o.qui = (actifs[0] || {}).nom || '';
  if(!o.du){ o.du = ouvPlus(ouvLundi(ouvAuj()), 7); o.au = ouvPlus(o.du, 5); }
  const refaire = () => { o.plan = null; o.bilan = null; dessinerOuverture(); };
  const b1 = ouvEl('div', 'ovBoite', '<h4>Qui et quand ?</h4>');
  const r = ouvEl('div', 'ovRang');
  r.style.margin = '0';
  const s = document.createElement('select');
  s.style.cssText = 'width:auto;margin:0;';
  actifs.forEach(m => { const op = document.createElement('option'); op.value = m.nom; op.textContent = m.nom; if(m.nom === o.qui) op.selected = true; s.appendChild(op); });
  s.addEventListener('change', () => { o.qui = s.value; refaire(); });
  const i1 = document.createElement('input'), i2 = document.createElement('input');
  [i1, i2].forEach(i => { i.type = 'date'; i.style.cssText = 'width:auto;margin:0;'; });
  i1.value = o.du; i2.value = o.au;
  i1.addEventListener('change', () => { o.du = i1.value; refaire(); });
  i2.addEventListener('change', () => { o.au = i2.value; refaire(); });
  r.append(s, ouvEl('span', '', 'du'), i1, ouvEl('span', '', 'au'), i2);
  b1.appendChild(r);
  const r2 = ouvEl('div', 'ovRang');
  r2.style.margin = '10px 0 0';
  r2.appendChild(ouvChip(o.mode === 'retirer', '🗑️ Retirer les cours vides', () => { o.mode = 'retirer'; refaire(); }));
  r2.appendChild(ouvChip(o.mode === 'cp', '🌴 Remplacer par CP', () => { o.mode = 'cp'; refaire(); }));
  b1.appendChild(r2);
  b1.appendChild(ouvEl('div', 'ovNote', o.mode === 'cp'
    ? '« Journée Congés Payés » (8h-16h30) sur chacun de ses jours de travail de la semaine type ; ses cours vides sont retirés.'
    : 'Ses cours vides sont retirés de Drivup. Un cours avec un élève n’est jamais retiré.'));
  b1.lastChild.style.marginTop = '6px';
  z.appendChild(b1);
  if(!o.du || !o.au || o.au < o.du){ z.appendChild(ouvEl('div', 'ovNote', 'Choisis la période.')); return; }
  if(!o.plan){
    if(o.bilan) z.appendChild(o.bilan);
    const bt = ouvChip(false, '🔎 Voir ce qui va se passer', () => planFermerOuv(bt));
    z.appendChild(bt);
    return;
  }
  const p = o.plan;
  const b2 = ouvEl('div', 'ovBoite', '<h4>Ce qui va se passer</h4>');
  b2.appendChild(ouvEl('div', 'ovLigne', '<b>' + p.vides.length + ' cours vide' + (p.vides.length > 1 ? 's' : '') + '</b><span>retiré' + (p.vides.length > 1 ? 's' : '') + ' de Drivup</span>'));
  if(o.mode === 'cp') b2.appendChild(ouvEl('div', 'ovLigne', '<b>' + p.cp.length + ' journée' + (p.cp.length > 1 ? 's' : '') + '</b><span>« Journée Congés Payés » : ' + ouvEch(p.cp.map(ouvFrCourt).join(', ') || '—') + '</span>'));
  if(p.dejaCp.length) b2.appendChild(ouvEl('div', 'ovNote', 'Déjà en CP : ' + ouvEch(p.dejaCp.map(ouvFrCourt).join(', '))));
  if(p.eleves.length){
    b2.appendChild(ouvEl('div', 'ovWarn', '⚠️ ' + p.eleves.length + ' cours avec un élève. Rien n’est retiré tant que tu n’as pas choisi : ➡️ le déplacer sur un moniteur qui a un cours vide à la même heure (même prestation), ou le laisser. ✉️ Il n’est prévenu que si tu coches.'));
    p.eleves.forEach(x => {
      const l = ouvEl('div', 'ovLigne');
      l.appendChild(ouvEl('b', '', ouvEch(x.affiche || 'Élève')));
      l.appendChild(ouvEl('span', '', ouvEch(ouvFrCourt(x.e.jour) + ' ' + ouvH(x.e.debut) + '-' + ouvH(x.e.fin) + ' · ' + (x.presta || ''))));
      l.lastChild.style.cssText = 'flex:1;min-width:170px;';
      const sel = document.createElement('select');
      sel.style.cssText = 'width:auto;margin:0;';
      const op0 = document.createElement('option'); op0.value = ''; op0.textContent = 'Laisser (à voir à la main)'; sel.appendChild(op0);
      x.candidats.forEach(c => { const op = document.createElement('option'); op.value = c.id; op.textContent = '➡️ Sur ' + c.nom + ' (cours vide à la même heure)'; sel.appendChild(op); });
      if(!x.candidats.length){ op0.textContent = 'Laisser — personne de libre à cette heure'; }
      sel.value = x.vers ? x.vers.id : '';
      sel.addEventListener('change', () => { x.vers = x.candidats.find(c => c.id === sel.value) || null; dessinerOuverture(); });
      const lc = document.createElement('label');
      lc.className = 'ovCoche';
      lc.style.margin = '0';
      const cc = document.createElement('input');
      cc.type = 'checkbox'; cc.checked = !!x.prevenir;
      cc.addEventListener('change', () => { x.prevenir = cc.checked; });
      lc.append(cc, ouvEl('span', '', '✉️ Le prévenir'));
      l.append(sel, lc);
      b2.appendChild(l);
    });
  }
  if(p.autres) b2.appendChild(ouvEl('div', 'ovNote', p.autres + ' autre(s) rendez-vous de ' + ouvEch(o.qui) + ' sur la période (examens, CP, NON, autres prestations) : gardés tels quels.'));
  z.appendChild(b2);
  const deplaces = p.eleves.filter(x => x.vers).length, prevenus = p.eleves.filter(x => x.prevenir).length;
  const laisses = p.eleves.filter(x => !x.vers);
  const cpPoses = o.mode === 'cp' ? p.cp.filter(j => !laisses.some(x => x.e.jour === j)) : [];
  const act = ouvEl('div', 'ovRang');
  act.appendChild(ouvChip(false, 'Annuler', () => { o.plan = null; dessinerOuverture(); }));
  const go = ouvEl('button', 'btn btn-primary', ouvEch('🔒 Fermer · ' + [p.vides.length + ' retiré' + (p.vides.length > 1 ? 's' : ''), o.mode === 'cp' ? cpPoses.length + ' CP' : '',
    deplaces ? deplaces + ' déplacé' + (deplaces > 1 ? 's' : '') : '', prevenus ? prevenus + ' prévenu' + (prevenus > 1 ? 's' : '') : ''].filter(Boolean).join(', ')));
  go.type = 'button';
  go.style.cssText = 'width:auto;margin:0;';
  go.disabled = !mod || o.enCours || (!p.vides.length && !cpPoses.length && !deplaces && !prevenus);
  go.addEventListener('click', () => fermerDansDrivupOuv(go));
  act.appendChild(go);
  if(o.mode === 'cp' && cpPoses.length < p.cp.length) act.appendChild(ouvEl('span', 'ovNote', 'Pas de CP les jours où un élève reste.'));
  z.appendChild(act);
}
async function planFermerOuv(bouton){
  const o = OUV.fermer, cfg = OUV.cfg;
  const m = cfg.moniteurs.find(x => x.nom === o.qui);
  if(!m) return;
  const du = o.du < ouvAuj() ? ouvAuj() : o.du;
  bouton.disabled = true; bouton.textContent = '🔎 Lecture de Drivup…';
  let d;
  try{ d = await ouvLireDrivup(du, o.au, [m.res]); }
  catch(e){ bouton.disabled = false; bouton.textContent = '🔎 Voir ce qui va se passer'; showToast('⚠️ ' + ((e && e.message) || e)); return; }
  const noms = {};
  Object.keys(d.prestations || {}).forEach(id => { noms[id] = ouvNorm(d.prestations[id]); });
  const idDe = ouvIdsDesPrestations(d.prestations);
  const ev = (d.evenements || []).filter(e => e.jour >= du && e.jour <= o.au);
  const sien = ev.filter(e => e.res === m.res);
  const cours = sien.filter(e => OUV_MONITEUR.test(noms[e.type] || '') && e.examen === '0');
  const vides = cours.filter(e => !e.nbr && !e.client);
  const avec = cours.filter(e => e.nbr || e.client);
  const autresMon = cfg.moniteurs.filter(x => x.res && x.res !== m.res);
  const pris = {};
  const eleves = [];
  avec.forEach(e => {
    const el = ((d.details || {})[e.id] || [])[0] || null;
    const candidats = ev.filter(c => c.res !== m.res && c.jour === e.jour && c.debut === e.debut && c.fin === e.fin && c.type === e.type && !c.nbr && !c.client)
      .map(c => ({ id: c.id, res: c.res, jour: c.jour, debut: c.debut, nom: (autresMon.find(x => x.res === c.res) || {}).nom || '' }))
      .filter(c => c.nom);
    const vers = candidats.find(c => !pris[c.id]) || null;
    if(vers) pris[vers.id] = true;
    eleves.push({ e: e, el: el, affiche: el ? [el.prenom, el.nom].filter(Boolean).join(' ') : (e.client || e.titre), presta: d.prestations[e.type] || '',
                  candidats: candidats, vers: vers, prevenir: false });
  });
  /* les jours de CP : ses jours de travail de la semaine type (échanges compris), pas les fériés */
  const eq = ouvEquilibre(cfg);
  const cp = [], dejaCp = [];
  if(o.mode === 'cp'){
    for(let j = du; j <= o.au; j = ouvPlus(j, 1)){
      const s = ouvJourSem(j);
      if(s < 1 || s > 6 || ouvFerie(j)) continue;
      const jn = ouvJourneesDu(cfg, j, eq)[m.nom];
      if(!jn || jn.j.lieu === 'off') continue;
      if(sien.some(e => e.jour === j && noms[e.type] === OUV_PRESTA.cp)){ dejaCp.push(j); continue; }
      cp.push(j);
    }
  }
  o.plan = { m: m, vides: vides, eleves: eleves, cp: cp, dejaCp: dejaCp, idDe: idDe,
             autres: sien.length - cours.length - (o.mode === 'cp' ? 0 : 0), du: du };
  dessinerOuverture();
}
async function fermerDansDrivupOuv(bouton){
  const o = OUV.fermer, p = o.plan;
  if(!p || o.enCours) return;
  const m = p.m;
  const deplaces = p.eleves.filter(x => x.vers), laisses = p.eleves.filter(x => !x.vers);
  const cpPoses = o.mode === 'cp' ? p.cp.filter(j => !laisses.some(x => x.e.jour === j)) : [];
  if(o.mode === 'cp' && cpPoses.length && !p.idDe.cp){ showToast('⚠️ « Journée Congés Payés » introuvable dans Drivup'); return; }
  if(!await confirmer('Fermer ' + m.nom + ' du ' + ouvFr(p.du) + ' au ' + ouvFr(o.au) + ' ?\n\n' +
    '· ' + p.vides.length + ' cours vide(s) retiré(s)\n' + (deplaces.length ? '· ' + deplaces.length + ' élève(s) déplacé(s)\n' : '') +
    (o.mode === 'cp' ? '· ' + cpPoses.length + ' journée(s) de CP\n' : '') + (laisses.length ? '· ' + laisses.length + ' élève(s) laissé(s) tel(s) quel(s)\n' : ''),
    '🔒 Fermer', true)) return;
  o.enCours = true;
  bouton.disabled = true;
  const z = document.getElementById('ouvZone');
  const suivi = ouvEl('div', 'ovBoite', '<h4>🔒 Dans Drivup…</h4><div class="ovNote"></div>');
  z.appendChild(suivi);
  const txt = suivi.querySelector('.ovNote');
  const pbs = [];
  let erreur = '';
  try{
    /* 1. les élèves, sur l'autre moniteur */
    if(deplaces.length){
      txt.textContent = 'Déplacement des élèves…';
      const r = await ouvExt({ type: 'drivup-cours-deplacer', liste: deplaces.map(x => ({ cle: x.e.id, id: x.e.id, res: x.e.res, jour: x.e.jour, debut: x.e.debut, vers: x.vers.res })) }, 'drivup-cours-deplaces', 600000);
      (r.resultats || []).forEach(y => { const x = deplaces.find(z2 => z2.e.id === y.cle); if(x) x.fait = y.ok; if(!y.ok) pbs.push((x ? x.affiche + ' : ' : '') + y.message); });
    }
    /* 2. les cours vides : les siens, et ceux qui ont reçu un élève */
    const aRetirer = p.vides.map(e => ({ cle: e.id, id: e.id, res: e.res, jour: e.jour, debut: e.debut }))
      .concat(deplaces.filter(x => x.fait).map(x => ({ cle: x.vers.id, id: x.vers.id, res: x.vers.res, jour: x.vers.jour, debut: x.vers.debut })));
    for(let i = 0; i < aRetirer.length; i += 100){
      txt.textContent = 'Cours vides retirés : ' + i + ' / ' + aRetirer.length + '…';
      const r = await ouvExt({ type: 'drivup-cours-supprimer', liste: aRetirer.slice(i, i + 100) }, 'drivup-cours-supprimes', 900000);
      (r.resultats || []).forEach(y => { if(!y.ok) pbs.push(ouvFrCourt((aRetirer.find(a => a.cle === y.cle) || {}).jour || '') + ' : ' + y.message); });
    }
    /* 3. les CP */
    if(cpPoses.length){
      txt.textContent = 'Journées de CP…';
      const att = cpPoses.map(j => ({ grp: m.nom, res: m.res, presta: 'cp', jour: j, debut: '08:00', fin: '16:30', agence: '1', d: ouvJourSem(j) }));
      const series = ouvSeries(att, p.idDe);
      const r = await ouvExt({ type: 'drivup-cours-creer', liste: series.map(s => ({ cle: s.cle, res: s.res, typMo: s.typMo, attendu: s.attendu, debut: s.debut, fin: s.fin, agence: s.agence, dates: s.dates })) }, 'drivup-cours-crees', 900000);
      (r.resultats || []).forEach(y => { if(y.message) pbs.push('CP : ' + y.message); });
    }
  }catch(e){ erreur = (e && e.message) || String(e); }
  /* 4. prévenir ceux qu'on a cochés */
  const aPrevenir = p.eleves.filter(x => x.prevenir && (!x.vers || x.fait));
  let pasPrevenus = [];
  if(aPrevenir.length && !erreur){
    txt.textContent = 'Messages aux élèves…';
    pasPrevenus = await ouvPrevenir(aPrevenir.map(x => ({ nomApp: x.el ? ouvEleveApp(x.el) : '', affiche: x.affiche,
      texte: x.vers ? ouvTexteDeplace(x.el && x.el.prenom, x.e.jour, x.e.debut, x.vers.nom, m.nom)
                    : 'Bonjour ' + ((x.el && x.el.prenom) || '') + ',\n\nTon cours de conduite du ' + ouvFrCourt(x.e.jour) + ' à ' + ouvH(x.e.debut) + ' avec ' + m.nom +
                      ' doit être déplacé : nous revenons vers toi très vite pour te proposer un autre créneau.\n\nL’équipe Évolution Conduites' })));
  }
  o.enCours = false;
  suivi.remove();
  const bilan = ouvEl('div', 'ovBoite');
  bilan.innerHTML = '<h4>' + (erreur ? '⚠️ Arrêté en route' : pbs.length ? '✅ Fait, avec des points à voir' : '✅ Fait dans Drivup') + '</h4>' +
    (erreur ? '<div class="ovWarn">' + ouvEch(erreur) + '</div>' : '') +
    pbs.slice(0, 30).map(x => '<div class="ovLigne"><span class="ovNote">' + ouvEch(x) + '</span></div>').join('') +
    (pasPrevenus.length ? '<div class="ovWarn">✉️ À prévenir à la main : ' + ouvEch(pasPrevenus.join(', ')) + '</div>' : '');
  o.bilan = bilan;
  o.plan = null;
  dessinerOuverture();
  showToast(erreur ? '⚠️ ' + erreur : '🔒 ' + m.nom + ' fermé du ' + ouvFr(p.du) + ' au ' + ouvFr(o.au));
}

/* ⚠️ À GARDER EN DERNIÈRE LIGNE : le fichier est arrivé jusqu'au bout. */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-ouverture.js'] = true;
