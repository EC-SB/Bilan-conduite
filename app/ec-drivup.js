/* Déployé le 13/10/2026 à 14:14 — v1168 */
/* ============================================================
   ec-drivup.js — 📥 CE QUE LE FAVORI APPORTE DE DRIVUP

   David, le 13 octobre : « récupérer les infos des élèves pour
   éviter d'avoir à écrire sur Drivup et sur notre app, avoir le
   planning des élèves pour faire les rappels et les prochains
   cours ». Drivup refuse l'accès à son API.

   Le favori « 📥 Bilan de conduite » (drivup-favori.js, à la racine
   du site) lit la page Drivup ouverte dans le Chrome du bureau et
   ouvre l'application avec « ?drivup=1 ». Ce module :

   · reçoit ce qu'il a lu — seulement d'app.drivup.fr ;
   · attend que la session soit ouverte, et vérifie le droit
     (administrateurs et bureau : « Rappels » en modification) ;
   · montre CE QUI CHANGE, et n'écrit rien avant « Enregistrer ».

   Les arbitrages de David (13 octobre) :
   · un cours Drivup n'arrive dans Mes prochains cours qu'une fois
     son rappel envoyé — comme aujourd'hui ;
   · on reprend la conduite et les examens, pas le simulateur, le
     code, la théorie, les écoutes ni les tablettes ;
   · une fiche se COMPLÈTE, elle n'est jamais remplacée : une case
     remplie chez nous n'est pas touchée, même si Drivup dit autre
     chose.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const DRIVUP_ORIGINE = 'https://app.drivup.fr';
let drivupRecu = null;

/* ------------------------------------------------------------
   LES OUTILS
   ------------------------------------------------------------ */
function sansAccentDrivup(s){
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function cleNomDrivup(n){
  return sansAccentDrivup(n).split(' ').filter(Boolean).sort().join(' ');
}
function propreDrivup(v, max){
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 120);
}
function chiffresDrivup(v){ return String(v || '').replace(/\D/g, ''); }

/* Le nom tel qu'on l'écrit chez nous : « Prénom Nom ». Le détail
   d'un examen ne sépare pas les deux : on garde ce qu'il donne. */
function nomDeLEleveDrivup(x){
  if(!x) return '';
  if(x.complet) return propreDrivup(x.complet, 80);
  return propreDrivup([x.prenom, x.nom].filter(Boolean).join(' '), 80);
}

/* La fiche qui correspond : par l'id Drivup d'abord, puis par le nom,
   dans n'importe quel ordre (« Martin Léa » = « Léa Martin »). Un
   nom qui désigne deux fiches ne désigne personne. */
function ficheDeLEleveDrivup(x){
  const fiches = (typeof fichesEleves !== 'undefined' && fichesEleves) || [];
  const id = chiffresDrivup(x && x.id);
  if(id){
    const f = fiches.find(g => chiffresDrivup(g.idDrivup) === id);
    if(f) return f;
  }
  const cle = cleNomDrivup(nomDeLEleveDrivup(x));
  if(!cle) return null;
  const memes = fiches.filter(g => cleNomDrivup(g.eleve) === cle);
  return memes.length === 1 ? memes[0] : null;
}

/* « ChrystelAnQn » → Chrystel ; « JJacques » → Jean-Jacques ; « BEA »,
   « Simu », « Tablettes » → personne : ce ne sont pas des moniteurs. */
function moniteurDeLAppliDrivup(titre){
  const t = sansAccentDrivup(titre).replace(/[^a-z]/g, '');
  if(t.length < 2) return '';
  const liste = (typeof moniteursActifs !== 'undefined' && moniteursActifs) || [];
  for(const m of liste){
    const n = sansAccentDrivup(m).replace(/[^a-z]/g, '');
    if(n.length >= 3 && (t === n || t.indexOf(n) === 0)) return m;
    const bouts = sansAccentDrivup(m).split(/[\s-]+/).filter(Boolean);
    if(bouts.length > 1){
      const abrege = bouts.slice(0, -1).map(b => b[0]).join('') + bouts[bouts.length - 1];
      if(t.indexOf(abrege) === 0) return m;
    }
  }
  return '';
}

/* ------------------------------------------------------------
   LA FORMATION — la catégorie Drivup dite avec nos mots (v1168)

   David, le 13 octobre : « il manque la formation » ; « CA sur
   Drivup = AAC BV ». La table est la sienne. Une catégorie qu'elle
   ne connaît pas (C, D…) laisse la formation « à préciser » : on
   ne devine pas.
   ------------------------------------------------------------ */
const FORMATIONS_DRIVUP = {
  'b': 'BV', 'b (bea)': 'BEA', 'b (pmr)': 'Conduite aménagée BEA', 'bea -> b': 'Passerelle BEA→BV',
  'ca': 'AAC BV', 'ca (bea)': 'AAC BEA', 'cs': 'CS BV', 'cs (bea)': 'CS BEA',
  'a passerelle': 'Moto A', 'a1': 'A1 permis', 'a1 equivalence': 'A1 passerelle', 'a2': 'A2',
  'am': 'AM 2 roues', 'am quadricycle': 'AM voiturette', 'be': 'Permis BE'
};
function formationDeDrivup(code){
  const k = String(code || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').replace(/\s*->\s*/, ' -> ').trim();
  return FORMATIONS_DRIVUP[k] || '';
}

/* Ce qu'on ne reprend pas, quel que soit le moniteur */
const DRIVUP_HORS_CONDUITE = /simulateur|ecoute pedagogique|code etg|\betg\b|theorie|tablettes|visio/;

function coursRetenuDrivup(c){
  if(DRIVUP_HORS_CONDUITE.test(sansAccentDrivup(c.libelle))) return false;
  if(c.examen) return true;
  return !!moniteurDeLAppliDrivup(c.moniteurDrivup);
}

/* « Conduite en Audi A3 Sportback 2h - St Brieuc » → « Conduite 2h » */
function libelleCourtDrivup(c){
  const l = String(c.libelle || '');
  const n = sansAccentDrivup(l);
  if(c.examen || /examen du permis/.test(n)) return 'Examen' + ((l.match(/permis de conduire\s+(\S+)/i) || [])[1] ? ' ' + l.match(/permis de conduire\s+(\S+)/i)[1] : '');
  if(/examen blanc/.test(n)) return 'Examen blanc';
  if(/^moto/.test(n)) return 'Moto';
  const d = (l.match(/\b(\d+h\d*)\b/) || [])[1];
  const bea = /automatique|bea/.test(n) ? ' · BEA' : '';
  return 'Conduite' + (d ? ' ' + d : '') + bea;
}

/* ------------------------------------------------------------
   LE LIEN DU FAVORI — l'adresse d'où l'application est servie
   ------------------------------------------------------------ */
function adresseDeLAppliDrivup(){
  const base = new URL('.', location.href);
  return { base: base.href, origine: base.origin };
}
function lienDuFavoriDrivup(){
  const a = adresseDeLAppliDrivup();
  const code = "(function(){var B='" + a.base + "',O='" + a.origine + "';" +
    "window.__ecFenetre=window.open(B+'?drivup=1','bilanDrivup');" +
    "var s=document.createElement('script');s.src=B+'drivup-favori.js?t='+Date.now();" +
    "s.setAttribute('data-app',O);document.body.appendChild(s);})();";
  return 'javascript:' + code;
}

function peutLireDrivup(){
  return !!(ACCES && ACCES.code) &&
         (ACCES.role === 'admin' || (typeof peutModifier === 'function' && peutModifier('rappels')));
}

/* Le bloc de « ➕ Ajouter des élèves » : le favori à glisser */
function dessinerBlocDrivup(){
  const z = $('drivupBloc');
  if(!z) return;
  if(!peutLireDrivup()){ z.style.display = 'none'; return; }
  z.style.display = '';
  z.innerHTML = '';
  const t = document.createElement('div');
  t.className = 'dvT';
  t.textContent = '📥 Depuis Drivup';
  const d = document.createElement('div');
  d.style.cssText = 'font-size:12.5px;color:var(--muted);line-height:1.5;margin-bottom:10px;';
  d.textContent = 'Ouvre dans Drivup la liste des élèves (100 par page), la fiche d’un élève ou le planning ' +
    'd’une agence, puis clique sur le favori : ce qui est affiché arrive ici, et tu valides. ' +
    'Rien n’est écrit dans Drivup.';
  const r = document.createElement('div');
  r.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;';
  const a = document.createElement('a');
  a.className = 'dvFavori';
  a.id = 'drivupFavori';
  a.href = lienDuFavoriDrivup();
  a.textContent = '📥 Bilan de conduite';
  a.title = 'Glisse-moi dans ta barre de favoris';
  a.addEventListener('click', e => {
    e.preventDefault();
    if(typeof showToast === 'function') showToast('Glisse ce bouton dans ta barre de favoris Chrome, puis clique-le sur une page Drivup.');
  });
  const aide = document.createElement('span');
  aide.style.cssText = 'font-size:12px;color:var(--muted);';
  aide.textContent = '← glisse ce bouton dans ta barre de favoris Chrome (une fois)';
  r.append(a, aide);
  const der = document.createElement('div');
  der.id = 'drivupDerniere';
  der.style.cssText = 'font-size:12px;color:var(--muted);margin-top:10px;';
  z.append(t, d, r, der);
  dernieresLecturesDrivup().then(l => {
    if(!l.length) return;
    der.textContent = 'Dernières lectures : ' + l.slice(0, 3).map(x =>
      (x.portee === 'fiches' ? 'élèves' : String(x.portee).replace(/^(agence|moniteur):/, '')) +
      ' le ' + x.luLe + (x.luPar ? ' par ' + x.luPar : '')).join(' · ');
  }).catch(() => {});
}

async function dernieresLecturesDrivup(){
  const j = new Date().toLocaleDateString('fr-CA');
  const r = await appelPrep({ action: 'drivupPlanning', du: j, au: j });
  return (r && r.lectures) || [];
}

/* ------------------------------------------------------------
   LE PLANNING DU JOUR, POUR LES RAPPELS — une lecture par jour,
   gardée une minute (on change de moniteur sans relire)
   ------------------------------------------------------------ */
const drivupRappels = { jour: '', quand: 0, donnees: null, enCours: null };

async function drivupDuJourRappels(jourIso){
  if(!jourIso || !(ACCES && ACCES.code)) return { cours: [], lectures: [] };
  if(drivupRappels.jour === jourIso && drivupRappels.donnees && Date.now() - drivupRappels.quand < 60000){
    return drivupRappels.donnees;
  }
  if(drivupRappels.jour === jourIso && drivupRappels.enCours) return drivupRappels.enCours;
  drivupRappels.jour = jourIso;
  drivupRappels.enCours = (async () => {
    let d = { cours: [], lectures: [] };
    try{
      const r = await appelPrep({ action: 'drivupPlanning', du: jourIso, au: jourIso });
      d = { cours: (r && r.cours) || [], lectures: (r && r.lectures) || [] };
    }catch(e){ /* sans Drivup, les créneaux restent ceux d'avant */ }
    drivupRappels.donnees = d;
    drivupRappels.quand = Date.now();
    drivupRappels.enCours = null;
    return d;
  })();
  return drivupRappels.enCours;
}
function oublierDrivupRappels(){ drivupRappels.donnees = null; drivupRappels.quand = 0; }

/* Le bandeau en tête des rappels : quand le planning a été lu */
async function poserBandeauDrivupRappels(zone){
  if(!zone) return;
  const ancien = $('rapDrivupBandeau');
  if(ancien) ancien.remove();
  const j = new Date().toLocaleDateString('fr-CA');
  const d = await drivupDuJourRappels(j);
  const lect = (d.lectures || []).filter(x => /^(agence|moniteur):/.test(x.portee));
  const b = document.createElement('div');
  b.id = 'rapDrivupBandeau';
  b.className = 'dvBandeau';
  const ic = document.createElement('span');
  ic.style.fontSize = '20px';
  ic.textContent = '📥';
  const t = document.createElement('span');
  if(lect.length){
    const fort = document.createElement('b');
    fort.textContent = 'Planning Drivup lu ' + lect.slice(0, 2).map(x =>
      String(x.portee).replace(/^(agence|moniteur):\s*(\d+\s*-\s*)?/, '') + ' le ' + x.luLe).join(' · ');
    const plus = document.createTextNode((lect[0].luPar ? ' par ' + lect[0].luPar : '') +
      ' — jusqu’au ' + dateLisibleDrivup(lect[0].au));
    const sm = document.createElement('small');
    sm.textContent = 'Les créneaux ci-dessous viennent de Drivup : un appui remplit l’élève, l’heure et la séance.';
    t.append(fort, plus, sm);
  }else{
    if(!peutLireDrivup()) return;
    b.classList.add('vide');
    t.textContent = 'Le planning Drivup n’a pas encore été lu. Clique le favori « 📥 Bilan de conduite » ' +
      'sur le planning d’une agence dans Drivup : les créneaux se rempliront seuls.';
  }
  b.append(ic, t);
  zone.insertBefore(b, zone.firstChild);
}

function dateLisibleDrivup(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return String(iso || '');
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* ------------------------------------------------------------
   RECEVOIR — seulement d'app.drivup.fr, seulement si l'onglet a
   été ouvert par le favori (« ?drivup=1 »)
   ------------------------------------------------------------ */
function ecouterLeFavoriDrivup(){
  if(!/[?&]drivup=1\b/.test(location.search)) return;
  let recu = false;
  window.addEventListener('message', ev => {
    if(ev.origin !== DRIVUP_ORIGINE || !ev.data) return;
    /* La lecture avance, dans Drivup : on le montre tout de suite —
       v1168, l'onglet restait vide une demi-minute. */
    if(ev.data.type === 'drivup-progression'){
      if(!recu) montrerLaLectureDrivup(ev.data.fait, ev.data.total);
      return;
    }
    if(ev.data.type !== 'drivup-donnees') return;
    try{ ev.source.postMessage({ type: 'drivup-recu' }, DRIVUP_ORIGINE); }catch(e){}
    if(recu) return;
    recu = true;
    drivupRecu = ev.data;
    try{ history.replaceState(null, '', location.pathname); }catch(e){}
    attendreLaSessionPourDrivup();
  });
  let n = 0;
  const t = setInterval(() => {
    if(recu || !window.opener || n++ > 200){ clearInterval(t); return; }
    try{ window.opener.postMessage({ type: 'drivup-pret' }, DRIVUP_ORIGINE); }catch(e){}
  }, 600);
}

function montrerLaLectureDrivup(fait, total){
  let f = $('drivupLecture');
  if(!f){
    const c = cadreDrivup('📥 Lecture dans Drivup…', 'Le planning se lit dans l’onglet Drivup : la fenêtre s’ouvre ici dès que c’est fini.');
    c.fond.id = 'drivupLecture';
    const b = document.createElement('div');
    b.className = 'dvBarre';
    b.innerHTML = '<span></span>';
    const t = document.createElement('div');
    t.className = 'dvNote';
    t.id = 'drivupLectureTexte';
    c.boite.append(b, t);
    f = c.fond;
  }
  const n = Math.max(0, Number(fait) || 0), tt = Math.max(1, Number(total) || 1);
  const barre = f.querySelector('.dvBarre span');
  if(barre) barre.style.width = Math.min(100, Math.round(n * 100 / tt)) + '%';
  const t = $('drivupLectureTexte');
  if(t) t.textContent = n + ' / ' + tt + ' cours lus';
}
function fermerLaLectureDrivup(){ const f = $('drivupLecture'); if(f) f.remove(); }

function attendreLaSessionPourDrivup(){
  let n = 0;
  const t = setInterval(async () => {
    if(!(ACCES && ACCES.code)){
      if(n++ === 4 && typeof showToast === 'function') showToast('📥 Drivup : connecte-toi, la lecture s’affichera ensuite.');
      return;
    }
    clearInterval(t);
    if(!peutLireDrivup()){
      if(typeof showToast === 'function') showToast('📥 Drivup : réservé aux administrateurs et au bureau.', 'error');
      drivupRecu = null;
      return;
    }
    try{
      if(typeof chargerFiches === 'function') await chargerFiches();
      if(typeof chargerMoniteurs === 'function' &&
         !((typeof moniteursActifs !== 'undefined') && moniteursActifs.length)) await chargerMoniteurs();
    }catch(e){}
    ouvrirLaFenetreDrivup(drivupRecu);
  }, 500);
}

function ouvrirLaFenetreDrivup(p){
  fermerLaLectureDrivup();
  if(!p || typeof p !== 'object') return;
  if(p.genre === 'planning' && Array.isArray(p.cours)) return fenetrePlanningDrivup(p);
  if(p.genre === 'eleves' && Array.isArray(p.eleves)) return fenetreElevesDrivup(p.eleves.slice(0, 300), 'liste');
  if(p.genre === 'fiche' && p.eleve) return fenetreElevesDrivup([p.eleve], 'fiche');
}

/* ------------------------------------------------------------
   LA FENÊTRE — même cadre pour les trois
   ------------------------------------------------------------ */
function cadreDrivup(titre, sous){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  fond.style.alignItems = 'flex-start';
  fond.style.paddingTop = '4vh';
  const boite = document.createElement('div');
  boite.className = 'modal dvBoite';
  const tete = document.createElement('div');
  tete.className = 'dvTete';
  const h = document.createElement('h3');
  h.textContent = titre;
  tete.appendChild(h);
  const s = document.createElement('div');
  s.className = 'dvSous';
  s.textContent = sous;
  boite.append(tete, s);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => { if(fond.parentNode) fond.remove(); };
  return { fond, boite, sous: s, fermer };
}
/* « 🆕 9 nouveaux » : l'emoji, le nombre en gras, les mots */
function puceDrivup(classe, fort, texte){
  const p = document.createElement('span');
  p.className = 'dvPuce' + (classe ? ' ' + classe : '');
  const m = String(texte).match(/^(\S+)\s+(.*)$/);
  const emoji = m && /\p{Extended_Pictographic}/u.test(m[1]) ? m[1] : '';
  if(emoji) p.appendChild(document.createTextNode(emoji + ' '));
  const b = document.createElement('b');
  b.textContent = String(fort);
  p.append(b, document.createTextNode(' ' + (emoji ? m[2] : texte)));
  return p;
}
function rondDrivup(nom){
  const r = document.createElement('span');
  r.className = 'ligneEleveRond';
  const ini = (typeof initialesEleve === 'function') ? initialesEleve(nom) : String(nom || '?').slice(0, 2).toUpperCase();
  if(typeof poserPhotoDans === 'function' && typeof clePhotoProfil === 'function'){
    poserPhotoDans(r, clePhotoProfil('eleve', nom), ini);
  }else r.textContent = ini;
  return r;
}
function boutonsDrivup(boite, libelle, faire, fermer){
  const rang = document.createElement('div');
  rang.className = 'btn-row';
  rang.style.marginTop = '12px';
  const ok = document.createElement('button');
  ok.className = 'btn btn-primary';
  ok.style.flex = '2';
  ok.textContent = libelle;
  const non = document.createElement('button');
  non.className = 'btn btn-secondary';
  non.style.flex = '1';
  non.textContent = 'Annuler';
  non.addEventListener('click', fermer);
  const etat = document.createElement('div');
  etat.className = 'dvNote';
  ok.addEventListener('click', async () => {
    ok.disabled = true; non.disabled = true;
    ok.textContent = 'Enregistrement…';
    try{
      await faire(etat, ok, non);
    }catch(e){
      ok.disabled = false; non.disabled = false;
      ok.textContent = libelle;
      etat.style.color = 'var(--warn-text)';
      etat.textContent = '⚠️ ' + ((e && e.message) || e);
    }
  });
  rang.append(ok, non);
  boite.append(rang, etat);
  return { ok, non, etat };
}

/* ------------------------------------------------------------
   ① LE PLANNING
   ------------------------------------------------------------ */
function lignesDuPlanningDrivup(p){
  const agenceDeLaPortee = p.porteeGenre === 'agence' ? propreDrivup(p.porteeValeur, 60) : '';
  const lignes = [];
  let horsConduite = 0;
  const ressourcesIgnorees = {};
  (p.cours || []).slice(0, 1500).forEach(c => {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(c.jour)) || !/^\d{2}:\d{2}$/.test(String(c.debut))) return;
    if(!coursRetenuDrivup(c)){
      horsConduite++;
      if(c.moniteurDrivup) ressourcesIgnorees[c.moniteurDrivup] = (ressourcesIgnorees[c.moniteurDrivup] || 0) + 1;
      return;
    }
    (c.eleves || []).forEach(x => {
      const fiche = ficheDeLEleveDrivup(x);
      const nom = fiche ? fiche.eleve : nomDeLEleveDrivup(x);
      if(!nom) return;
      lignes.push({
        id: String(c.id) + '-' + (chiffresDrivup(x.id) || cleNomDrivup(nom).replace(/ /g, '')),
        jour: c.jour, debut: c.debut, fin: c.fin || '',
        agence: agenceDeLaPortee || propreDrivup(c.agence, 60),
        moniteur: moniteurDeLAppliDrivup(c.moniteurDrivup),
        moniteurDrivup: propreDrivup(c.moniteurDrivup, 60),
        eleve: nom, idEleve: chiffresDrivup(x.id),
        libelle: propreDrivup(c.libelle, 140), examen: !!c.examen,
        _fiche: fiche, _x: x
      });
    });
  });
  return { lignes, horsConduite, ressourcesIgnorees };
}

function comparerPlanningDrivup(p, lignes, existants){
  const dansLaPortee = existants.filter(x => p.porteeGenre === 'moniteur'
    ? x.moniteurDrivup === p.porteeValeur : x.agence === p.porteeValeur);
  const avant = {};
  dansLaPortee.forEach(x => { avant[x.id] = x; });
  const vus = {};
  const changes = [];
  let identiques = 0;
  lignes.forEach(l => {
    vus[l.id] = true;
    const a = avant[l.id];
    let etat = 'neuf';
    if(a){
      if(a.jour !== l.jour || a.debut !== l.debut || (a.moniteur || '') !== (l.moniteur || '')){
        etat = 'bouge';
        l._avant = a;
      }else etat = 'pareil';
    }
    const inconnu = !l._fiche;
    if(etat === 'pareil' && !inconnu){ identiques++; return; }
    changes.push(Object.assign(l, { _etat: inconnu ? 'inconnu' : etat, _etatCours: etat }));
  });
  dansLaPortee.forEach(a => {
    if(vus[a.id]) return;
    changes.push({ id: a.id, jour: a.jour, debut: a.debut, fin: a.fin, eleve: a.eleve, moniteur: a.moniteur,
                   libelle: a.libelle, examen: !!a.examen, _etat: 'annule', _etatCours: 'annule' });
  });
  changes.sort((x, y) => (x.jour + x.debut).localeCompare(y.jour + y.debut));
  return { changes, identiques };
}

function ligneDeChangementDrivup(c){
  const l = document.createElement('div');
  l.className = 'dvL ' + c._etat;
  const h = document.createElement('span');
  h.className = 'dvH';
  h.textContent = c.debut.replace(':', 'h');
  if(c.fin){
    h.appendChild(document.createElement('br'));
    const f = document.createElement('span');
    f.style.cssText = 'font-weight:400;color:var(--muted);font-size:11.5px;';
    f.textContent = '→ ' + c.fin.replace(':', 'h');
    h.appendChild(f);
  }
  const qui = document.createElement('span');
  qui.className = 'dvQui';
  const b = document.createElement('b');
  b.textContent = c.eleve;
  const sp = document.createElement('span');
  let detail = libelleCourtDrivup(c) + ' · 👤 ' + (c.moniteur || c.moniteurDrivup || '—');
  if(c._etat === 'bouge' && c._avant){
    detail += ' — était ' + (c._avant.jour !== c.jour ? dateLisibleDrivup(c._avant.jour) + ' ' : '') +
              'à ' + String(c._avant.debut).replace(':', 'h') +
              ((c._avant.moniteur || '') !== (c.moniteur || '') ? ' avec ' + (c._avant.moniteur || '—') : '');
  }
  if(c._etat === 'annule') detail += ' — retiré du planning Drivup';
  if(c._etat === 'inconnu'){
    detail += (c._x && c._x.complet && !c._x.nom)
      ? ' — inconnu chez nous : crée sa fiche depuis la liste Drivup'
      : ' — pas encore chez nous : sa fiche sera créée';
  }
  sp.textContent = detail;
  qui.append(b, sp);
  const et = document.createElement('span');
  et.className = 'dvEt ' + c._etat;
  et.textContent = { neuf: '🆕 Nouveau', bouge: '🕐 Déplacé', annule: '✖️ Annulé', inconnu: '❓ À créer' }[c._etat];
  l.append(h, rondDrivup(c.eleve), qui, et);
  return l;
}

async function fenetrePlanningDrivup(p){
  const portee = propreDrivup(p.porteeValeur, 60);
  const genre = p.porteeGenre === 'moniteur' ? 'moniteur' : 'agence';
  const du = String(p.du || ''), au = String(p.au || '');
  const lu = p.luA ? new Date(p.luA).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  const f = cadreDrivup('📥 Reçu de Drivup — le planning',
    (genre === 'agence' ? 'Agence ' : 'Moniteur ') + portee + ' · du ' + dateLisibleDrivup(du) +
    ' au ' + dateLisibleDrivup(au) + (lu ? ' · lu à ' + lu : ''));
  const attente = document.createElement('div');
  attente.className = 'empty';
  attente.textContent = 'Comparaison avec ce qu’on a déjà…';
  f.boite.appendChild(attente);

  let existants = [];
  try{
    const r = await appelPrep({ action: 'drivupPlanning', du: du, au: au });
    existants = (r && r.cours) || [];
  }catch(e){
    attente.textContent = '⚠️ Lecture impossible : ' + ((e && e.message) || e);
    return;
  }
  attente.remove();

  const { lignes, horsConduite, ressourcesIgnorees } = lignesDuPlanningDrivup(p);
  const { changes, identiques } = comparerPlanningDrivup(p, lignes, existants);
  const n = k => changes.filter(c => c._etat === k).length;
  const inconnus = changes.filter(c => c._etat === 'inconnu');

  const puces = document.createElement('div');
  puces.className = 'dvPuces';
  puces.append(puceDrivup('', lignes.length, 'cours d’élèves'));
  if(n('neuf')) puces.append(puceDrivup('neuf', n('neuf'), n('neuf') > 1 ? '🆕 nouveaux' : '🆕 nouveau'));
  if(n('bouge')) puces.append(puceDrivup('bouge', n('bouge'), n('bouge') > 1 ? '🕐 déplacés' : '🕐 déplacé'));
  if(n('annule')) puces.append(puceDrivup('annule', n('annule'), n('annule') > 1 ? '✖️ annulés' : '✖️ annulé'));
  if(inconnus.length) puces.append(puceDrivup('', inconnus.length, inconnus.length > 1 ? '❓ élèves à créer' : '❓ élève à créer'));
  const ign = (p.ignores || 0) + horsConduite;
  if(ign) puces.append(puceDrivup('ignore', ign, 'dispos, blocs et séances hors conduite ignorés'));
  f.boite.appendChild(puces);

  if(!changes.length){
    const v = document.createElement('div');
    v.className = 'dvPli';
    v.textContent = '✅ Rien de neuf : les ' + identiques + ' cours sont déjà à jour.';
    f.boite.appendChild(v);
  }
  const MAX = 40;
  let jourCourant = '';
  const poser = (c, ou) => {
    if(c.jour !== jourCourant){
      jourCourant = c.jour;
      const j = document.createElement('div');
      j.className = 'dvJour';
      j.textContent = dateLisibleDrivup(c.jour);
      ou.appendChild(j);
    }
    ou.appendChild(ligneDeChangementDrivup(c));
  };
  changes.slice(0, MAX).forEach(c => poser(c, f.boite));
  const reste = changes.length - MAX;
  if(reste > 0 || identiques || Object.keys(ressourcesIgnorees).length){
    const pli = document.createElement('details');
    pli.className = 'dvPli';
    const s = document.createElement('summary');
    const nbIgn = Object.keys(ressourcesIgnorees).reduce((t, k) => t + ressourcesIgnorees[k], 0);
    s.textContent = [reste > 0 ? reste + ' autres changements' : '',
                     identiques ? identiques + ' cours identiques (rien à faire)' : '',
                     nbIgn ? nbIgn + ' séance(s) hors conduite ou sans moniteur de l’appli' : ''].filter(Boolean).join(' · ');
    pli.appendChild(s);
    if(reste > 0){
      jourCourant = '';
      changes.slice(MAX).forEach(c => poser(c, pli));
    }
    const res = Object.keys(ressourcesIgnorees);
    if(res.length){
      const r = document.createElement('div');
      r.className = 'dvNote';
      r.textContent = 'Ignorés, faute d’être un moniteur de l’appli ou de la conduite : ' +
        res.map(k => k + ' (' + ressourcesIgnorees[k] + ')').join(', ') + '.';
      pli.appendChild(r);
    }
    f.boite.appendChild(pli);
  }
  if(p.detailsRates){
    const w = document.createElement('div');
    w.className = 'dvNote';
    w.style.color = 'var(--warn-text)';
    w.textContent = '⚠️ ' + p.detailsRates + ' cours n’ont pas pu être ouverts dans Drivup : leur élève est reconnu par son nom seulement.';
    f.boite.appendChild(w);
  }

  const aEcrire = changes.filter(c => c._etat !== 'pareil').length;
  const libelle = aEcrire ? '✅ Enregistrer ' + (aEcrire > 1 ? 'les ' + aEcrire + ' changements' : 'le changement')
                          : '✅ Noter la lecture';
  boutonsDrivup(f.boite, libelle, async (etat, ok, non) => {
    /* 1 · les fiches d'abord : un cours doit pointer vers quelqu'un */
    const fiches = [];
    const vus = {};
    lignes.forEach(l => {
      const x = l._x || {};
      const id = chiffresDrivup(x.id);
      const cle = id || cleNomDrivup(l.eleve);
      if(vus[cle]) return;
      vus[cle] = true;
      if(l._fiche){
        if(id && chiffresDrivup(l._fiche.idDrivup) !== id) fiches.push({ eleve: l._fiche.eleve, idDrivup: id });
        return;
      }
      /* Un examen ne dit pas l'ordre nom / prénom : pas de fiche
         inventée à partir de lui. */
      if(x.complet && !x.nom) return;
      fiches.push({ eleve: l.eleve, idDrivup: id, telephone: propreDrivup(x.mobile, 30),
                    formation: formationDeDrivup(x.formation) });
    });
    if(fiches.length){
      for(let i = 0; i < fiches.length; i += 200){
        await appelPrep({ action: 'drivupFiches', fiches: fiches.slice(i, i + 200) });
      }
    }
    /* 2 · le planning de la portée, en entier */
    const r = await appelPrep({
      action: 'drivupPlanningPoser', porteeGenre: genre, porteeValeur: portee, du: du, au: au,
      cours: lignes.map(l => ({ id: l.id, jour: l.jour, debut: l.debut, fin: l.fin, agence: l.agence,
        moniteur: l.moniteur, moniteurDrivup: l.moniteurDrivup, eleve: l.eleve, idEleve: l.idEleve,
        libelle: l.libelle, examen: l.examen }))
    });
    oublierDrivupRappels();
    if(fiches.length && typeof chargerFiches === 'function') await chargerFiches().catch(() => {});
    /* 3 · les photos de ceux qui n'en ont pas — v1168 */
    const ph = await reprendreLesPhotosDrivup(lignes.map(l => ({ eleve: l.eleve, url: (l._x || {}).photo })));
    ok.style.display = 'none';
    non.disabled = false;
    non.textContent = 'Fermer';
    etat.style.color = '';
    etat.textContent = '✅ Enregistré : ' + ((r && r.nb) || lignes.length) + ' cours' +
      (fiches.length ? ' · ' + fiches.length + ' fiche(s) créée(s) ou complétée(s)' : '') +
      (ph.posees ? ' · ' + ph.posees + ' photo(s) reprise(s)' : '') + '.';
    const aller = document.createElement('button');
    aller.className = 'btn btn-primary';
    aller.style.marginTop = '10px';
    aller.textContent = '🔔 Ouvrir les rappels';
    aller.addEventListener('click', () => {
      f.fermer();
      if(typeof afficherOnglet === 'function') afficherOnglet('eleves');
      if(typeof afficherVue === 'function') afficherVue('eleves', 'rappels');
    });
    etat.after(aller);
  }, f.fermer);
  const note = document.createElement('div');
  note.className = 'dvNote';
  note.textContent = 'Rien n’est écrit dans Drivup. Les cours vont dans 🔔 Rappels de cours ; ils arrivent dans ' +
    'Mes prochains cours du moniteur quand le rappel part, comme aujourd’hui.';
  f.boite.appendChild(note);
}

/* ------------------------------------------------------------
   📷 LES PHOTOS — seulement pour qui n'en a pas (v1168)

   Le Worker va chercher l'image chez Drivup et vérifie de nouveau
   qu'il n'y en a pas déjà une : ce tri-ci ne sert qu'à ne pas lui
   demander pour rien.
   ------------------------------------------------------------ */
async function reprendreLesPhotosDrivup(liste){
  const res = { posees: 0, ratees: 0 };
  try{ if(typeof chargerPhotosProfil === 'function') await chargerPhotosProfil(true); }catch(e){}
  const vus = {};
  const aFaire = (liste || []).filter(x => {
    if(!x || !x.eleve || !x.url) return false;
    const k = sansAccentDrivup(x.eleve);
    if(vus[k]) return false;
    vus[k] = true;
    return !(typeof lienPhotoProfil === 'function' && typeof clePhotoProfil === 'function' &&
             lienPhotoProfil(clePhotoProfil('eleve', x.eleve)));
  });
  for(let i = 0; i < aFaire.length; i += 10){
    try{
      const r = await appelPrep({ action: 'drivupPhotos', photos: aFaire.slice(i, i + 10) });
      res.posees += (r && r.posees) || 0;
      res.ratees += (r && r.ratees) || 0;
    }catch(e){ res.ratees += Math.min(10, aFaire.length - i); }
  }
  if(res.posees && typeof chargerPhotosProfil === 'function'){
    try{ await chargerPhotosProfil(true); if(typeof repeindreLesPhotos === 'function') repeindreLesPhotos(); }catch(e){}
  }
  return res;
}

/* ------------------------------------------------------------
   📝 LES NOTES INTERNES — depuis la fiche (v1168)

   David : « dans nos notes internes de chez nous », catégorie
   Administratif. Chacune garde son auteur et sa date Drivup en
   tête ; une note déjà reprise ne revient pas.
   ------------------------------------------------------------ */
function texteDeLaNoteDrivup(n){
  return '📥 Note Drivup — ' + propreDrivup(n.titre, 120) + '\n' + String(n.texte || '').trim();
}
function jourDeLaNoteDrivup(n){
  const m = String(n.titre || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
}
function noteDejaRepriseDrivup(n, notes){
  const corps = sansAccentDrivup(n.texte);
  if(!corps) return true;
  return (notes || []).some(x => sansAccentDrivup(x.texte).indexOf(corps) !== -1);
}

/* ------------------------------------------------------------
   ② ③ LES ÉLÈVES — la liste, ou une fiche
   ------------------------------------------------------------ */
const CHAMPS_FICHE_DRIVUP = [
  /* champ chez nous, champ Drivup, libellé, montré (sinon plié) */
  ['telephone', 'mobile', 'Mobile', true],
  ['email', 'email', 'Mail', true],
  ['formation', 'formation', 'Formation', true],
  ['mailPrescripteur', 'mailPrescripteur', 'Mail du prescripteur', true],
  ['naissance', 'naissance', 'Date de naissance', true],
  ['neph', 'neph', 'NEPH', false],
  ['idDrivup', 'id', 'Id Drivup', false]
];
function memeValeurDrivup(champ, a, b){
  if(champ === 'telephone' || champ === 'neph' || champ === 'idDrivup') return chiffresDrivup(a).slice(-9) === chiffresDrivup(b).slice(-9);
  return sansAccentDrivup(a) === sansAccentDrivup(b);
}

async function fenetreElevesDrivup(elevesBruts, sorte){
  /* La catégorie Drivup devient notre formation, avant toute
     comparaison : « CA » et « AAC BV » sont la même chose. */
  const eleves = (elevesBruts || []).map(x => Object.assign({}, x, { formation: formationDeDrivup(x.formation) }));
  const lu = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const titre = sorte === 'fiche' ? '📥 Reçu de Drivup — une fiche' : '📥 Reçu de Drivup — les élèves';
  const premier = eleves[0] || {};
  const sous = sorte === 'fiche'
    ? 'La fiche de ' + nomDeLEleveDrivup(premier) + ' · Drivup n° ' + chiffresDrivup(premier.id) + ' · lue à ' + lu
    : 'La liste des élèves de Drivup · ' + eleves.length + ' élève(s) lu(s) à ' + lu;
  const f = cadreDrivup(titre, sous);

  const nouveaux = [], aCompleter = [], plies = [];
  let differences = 0, aJour = 0;
  eleves.forEach(x => {
    const nom = nomDeLEleveDrivup(x);
    if(!nom) return;
    const fiche = ficheDeLEleveDrivup(x);
    if(!fiche){ nouveaux.push({ x, nom }); return; }
    const montres = [], caches = [];
    CHAMPS_FICHE_DRIVUP.forEach(([chez, dv, lib, montre]) => {
      const leur = propreDrivup(x[dv], 120);
      const notre = propreDrivup(fiche[chez], 120);
      if(!leur) return;
      if(!notre){ (montre ? montres : caches).push({ chez, lib, valeur: chez === 'idDrivup' ? chiffresDrivup(leur) : leur }); return; }
      if(!memeValeurDrivup(chez, notre, leur)) differences++;
    });
    if(montres.length) aCompleter.push({ x, fiche, montres, caches });
    else if(caches.length) plies.push({ x, fiche, caches });
    else aJour++;
  });

  const puces = document.createElement('div');
  puces.className = 'dvPuces';
  if(nouveaux.length) puces.append(puceDrivup('neuf', nouveaux.length, nouveaux.length > 1 ? '🆕 nouveaux' : '🆕 nouveau'));
  if(aCompleter.length) puces.append(puceDrivup('bouge', aCompleter.length, '✏️ à compléter'));
  if(aJour + plies.length) puces.append(puceDrivup('ignore', aJour + plies.length, 'déjà à jour'));
  f.boite.appendChild(puces);

  const cases = [];
  if(nouveaux.length){
    const j = document.createElement('div');
    j.className = 'dvJour';
    j.textContent = nouveaux.length > 1 ? 'Nouveaux — une fiche sera créée' : 'Nouveau — une fiche sera créée';
    f.boite.appendChild(j);
    nouveaux.forEach(({ x, nom }) => {
      const l = document.createElement('label');
      l.className = 'dvL';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = true;
      const qui = document.createElement('span');
      qui.className = 'dvQui';
      const b = document.createElement('b');
      b.textContent = nom;
      const sp = document.createElement('span');
      sp.textContent = ['Drivup n° ' + chiffresDrivup(x.id), x.mobile, x.email].filter(Boolean).join(' · ');
      qui.append(b, sp);
      l.append(cb, rondDrivup(nom), qui);
      if(x.formation){
        const fo = document.createElement('span');
        fo.className = 'ligneEleveForm';
        fo.textContent = x.formation;
        l.appendChild(fo);
      }
      f.boite.appendChild(l);
      cases.push({ cb, fiche: {
        eleve: nom, idDrivup: chiffresDrivup(x.id), telephone: propreDrivup(x.mobile, 30),
        email: propreDrivup(x.email, 120), formation: propreDrivup(x.formation, 40),
        mailPrescripteur: propreDrivup(x.mailPrescripteur, 120), naissance: propreDrivup(x.naissance, 10),
        neph: chiffresDrivup(x.neph) } });
    });
  }
  if(aCompleter.length){
    const j = document.createElement('div');
    j.className = 'dvJour';
    j.textContent = 'Ce qui manque chez nous — ajouté';
    f.boite.appendChild(j);
    aCompleter.forEach(({ fiche, montres, caches }) => {
      const l = document.createElement('label');
      l.className = 'dvL';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = true;
      const qui = document.createElement('span');
      qui.className = 'dvQui';
      const b = document.createElement('b');
      b.textContent = fiche.eleve;
      const sp = document.createElement('span');
      sp.textContent = montres.map(m => m.lib + ' : ' + m.valeur).join(' · ');
      qui.append(b, sp);
      const et = document.createElement('span');
      et.className = 'dvEt neuf';
      et.textContent = '➕ Ajouté';
      l.append(cb, rondDrivup(fiche.eleve), qui, et);
      f.boite.appendChild(l);
      const ff = { eleve: fiche.eleve };
      montres.concat(caches).forEach(m => { ff[m.chez] = m.valeur; });
      cases.push({ cb, fiche: ff });
    });
  }
  const pliees = plies.map(({ fiche, caches }) => {
    const ff = { eleve: fiche.eleve };
    caches.forEach(m => { ff[m.chez] = m.valeur; });
    return ff;
  });
  if(pliees.length || differences){
    const v = document.createElement('div');
    v.className = 'dvPli';
    v.textContent = [pliees.length ? pliees.length + ' fiche(s) reçoivent leur id Drivup ou leur NEPH' : '',
      differences ? differences + ' différence(s) laissée(s) telle(s) quelle(s) — on complète, on ne remplace jamais' : '']
      .filter(Boolean).join(' · ');
    f.boite.appendChild(v);
  }
  if(!nouveaux.length && !aCompleter.length && !pliees.length){
    const v = document.createElement('div');
    v.className = 'dvPli';
    v.textContent = '✅ Rien à compléter : tout est déjà chez nous.';
    f.boite.appendChild(v);
  }

  /* 📝 Les notes internes de la fiche — v1168 */
  const casesNotes = [];
  if(sorte === 'fiche' && Array.isArray(premier.notes) && premier.notes.length){
    const nomNotes = (ficheDeLEleveDrivup(premier) || {}).eleve || nomDeLEleveDrivup(premier);
    let deja = [];
    try{
      const d = await appelPrep({ action: 'notesDossierList', eleve: nomNotes });
      deja = (d && d.notes) || [];
    }catch(e){}
    const nouvelles = premier.notes.filter(n => !noteDejaRepriseDrivup(n, deja));
    const j = document.createElement('div');
    j.className = 'dvJour';
    j.textContent = '📝 Ses notes internes Drivup → 🗂️ Administratif, dans son dossier';
    f.boite.appendChild(j);
    nouvelles.forEach(n => {
      const l = document.createElement('label');
      l.className = 'dvL';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = true;
      const qui = document.createElement('span');
      qui.className = 'dvQui';
      const b = document.createElement('b');
      b.textContent = propreDrivup(n.titre, 120);
      const sp = document.createElement('span');
      sp.textContent = String(n.texte || '').trim().slice(0, 220) + (String(n.texte || '').length > 220 ? '…' : '');
      qui.append(b, sp);
      l.append(cb, qui);
      f.boite.appendChild(l);
      casesNotes.push({ cb, n, nom: nomNotes });
    });
    if(premier.notes.length > nouvelles.length){
      const v = document.createElement('div');
      v.className = 'dvPli';
      v.textContent = (premier.notes.length - nouvelles.length) + ' note(s) déjà reprise(s)';
      f.boite.appendChild(v);
    }
  }

  /* 📷 Dire, avant de valider, si sa photo va être reprise */
  if(sorte === 'fiche' && premier.photo){
    const nomP = (ficheDeLEleveDrivup(premier) || {}).eleve || nomDeLEleveDrivup(premier);
    const aDeja = typeof lienPhotoProfil === 'function' && typeof clePhotoProfil === 'function' &&
                  lienPhotoProfil(clePhotoProfil('eleve', nomP));
    const v = document.createElement('div');
    v.className = 'dvPli';
    v.textContent = aDeja ? '📷 Il a déjà une photo chez nous : on la garde.'
                          : '📷 Sa photo Drivup sera reprise (il n’en a pas chez nous).';
    f.boite.appendChild(v);
  }

  const nbN = nouveaux.length, nbC = aCompleter.length;
  const libelle = sorte === 'fiche'
    ? (nbN ? '✅ Créer sa fiche' : '✅ Compléter sa fiche')
    : '✅ ' + [nbN ? 'Créer ' + nbN + ' fiche' + (nbN > 1 ? 's' : '') : '',
               nbC + pliees.length ? 'compléter ' + (nbC + pliees.length) : ''].filter(Boolean).join(' · ');
  const aFaire = nbN || nbC || pliees.length || casesNotes.length || (sorte === 'fiche' && premier.photo);
  const libelleFinal = (sorte === 'fiche' && !nbN && !nbC && !pliees.length && aFaire) ? '✅ Reprendre' : libelle;
  const r = boutonsDrivup(f.boite, aFaire ? libelleFinal : '✅ Fermer', async (etat, ok, non) => {
    const fiches = cases.filter(c => c.cb.checked).map(c => c.fiche).concat(pliees);
    const notes = casesNotes.filter(c => c.cb.checked);
    const photoFiche = sorte === 'fiche' && premier.photo;
    if(!fiches.length && !notes.length && !photoFiche){ f.fermer(); return; }
    let crees = 0, completees = 0;
    for(let i = 0; i < fiches.length; i += 200){
      const rep = await appelPrep({ action: 'drivupFiches', fiches: fiches.slice(i, i + 200) });
      crees += (rep && rep.crees) || 0;
      completees += (rep && rep.completees) || 0;
    }
    if(typeof chargerFiches === 'function') await chargerFiches().catch(() => {});
    /* 📝 les notes, une par une, comme on les écrirait à la main */
    let notesEcrites = 0;
    for(const c of notes){
      const rep = await appelPrep({ action: 'notesDossierSet', eleve: c.nom, categorie: 'adm',
                                    texte: texteDeLaNoteDrivup(c.n), jour: jourDeLaNoteDrivup(c.n) });
      if(rep && rep.status !== 'error') notesEcrites++;
    }
    /* 📷 la photo, s'il n'en a pas */
    let ph = { posees: 0 };
    if(photoFiche){
      const nomPhoto = (ficheDeLEleveDrivup(premier) || {}).eleve || nomDeLEleveDrivup(premier);
      ph = await reprendreLesPhotosDrivup([{ eleve: nomPhoto, url: premier.photo }]);
    }
    if(typeof afficherRepertoire === 'function' && $('repertoireListe')) afficherRepertoire().catch(() => {});
    ok.style.display = 'none';
    non.disabled = false;
    non.textContent = 'Fermer';
    etat.style.color = '';
    etat.textContent = '✅ ' + crees + ' fiche(s) créée(s) · ' + completees + ' complétée(s)' +
      (notesEcrites ? ' · ' + notesEcrites + ' note(s) interne(s) reprise(s)' : '') +
      (ph.posees ? ' · photo reprise' : '') + '.';
  }, f.fermer);
  if(!aFaire) r.non.style.display = 'none';
  const note = document.createElement('div');
  note.className = 'dvNote';
  note.textContent = sorte === 'fiche'
    ? 'Une case déjà remplie chez nous n’est jamais remplacée.'
    : 'La liste de Drivup ne montre pas le mail : il arrive quand tu cliques le favori sur la fiche d’un élève dans Drivup. ' +
      'Une case déjà remplie chez nous n’est jamais remplacée.';
  f.boite.appendChild(note);
}

/* ------------------------------------------------------------
   AU DÉMARRAGE
   ------------------------------------------------------------ */
(function(){
  try{ ecouterLeFavoriDrivup(); }catch(e){ console.warn('Drivup :', e); }
  /* Le bloc du favori se dessine une fois la session ouverte */
  let n = 0;
  const t = setInterval(() => {
    if(n++ > 600){ clearInterval(t); return; }
    if(!(ACCES && ACCES.code)) return;
    clearInterval(t);
    try{ dessinerBlocDrivup(); }catch(e){}
  }, 500);
})();

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-drivup.js'] = true;
