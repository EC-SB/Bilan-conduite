/* Déployé le 22/10/2026 à 10:11 — v1237 */
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
     🚗 v1181 — David, le 15 octobre : le SIMULATEUR AVEC MONITEUR
     se reprend aussi (son rappel a son type de séance), et les
     numéros de voiture posés en haut du planning (« .1 », « .7 »)
     remplissent la voiture du rappel ;
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
/* ⚠️ LE SIMULATEUR RESTE « HORS CONDUITE » ICI — v1181 : c'est la liste
   que lisent aussi les heures du jour du permis (ec-messenger.js), où
   une séance de simulateur n'est pas la conduite d'avant l'examen.
   Seul le tri des cours à reprendre (coursRetenuDrivup) l'accepte. */
const DRIVUP_HORS_CONDUITE = /simulateur|ecoute pedagogique|code etg|\betg\b|theorie|tablettes|visio/;
/* 🚗 v1181 — le simulateur se reprend AVEC moniteur seulement : la
   colonne d'un moniteur de l'appli (vérifiée plus bas), et rien qui
   dise qu'il s'y entraîne seul. */
const DRIVUP_SIMU_SEUL = /simulateur.*\b(seul|sans moniteur|autonom\w*|libre)\b/;

/* Le titre du cours, quand le libellé ne dit pas ce qu'il est */
function texteDuCoursDrivup(c){
  return sansAccentDrivup(String(c.libelle || '') + ' ' + String(c.titre || ''));
}

/* 🚗 v1181 — le libellé gardé pour les rappels : celui du détail, et
   le titre du cours en plus quand c'est LUI qui dit « Examen blanc »
   ou « Simulateur » (David : « par le titre du cours »). */
function libelleGardeDrivup(c){
  const l = String(c.libelle || '').replace(/\s+/g, ' ').trim();
  const t = String(c.titre || '').replace(/\s+/g, ' ').trim();
  const dit = x => /examen blanc|simulateur/.test(sansAccentDrivup(x));
  return propreDrivup((t && dit(t) && !dit(l) && t !== l) ? (l ? l + ' — ' + t : t) : l, 140);
}

function coursRetenuDrivup(c){
  const t = texteDuCoursDrivup(c);
  const simu = /simulateur/.test(t);
  if(simu && DRIVUP_SIMU_SEUL.test(t)) return false;
  if(!simu && DRIVUP_HORS_CONDUITE.test(t)) return false;
  if(simu && DRIVUP_HORS_CONDUITE.test(t.replace(/simulateur/g, ''))) return false;
  if(c.examen) return true;
  return !!moniteurDeLAppliDrivup(c.moniteurDrivup);
}

/* « Conduite en Audi A3 Sportback 2h - St Brieuc » → « Conduite 2h » */
function libelleCourtDrivup(c){
  const l = String(c.libelle || '');
  const n = sansAccentDrivup(l);
  if(c.examen || /examen du permis/.test(n)) return 'Examen' + ((l.match(/permis de conduire\s+(\S+)/i) || [])[1] ? ' ' + l.match(/permis de conduire\s+(\S+)/i)[1] : '');
  if(/examen blanc/.test(n)) return 'Examen blanc';
  if(/simulateur/.test(n)) return 'Simulateur';
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
  if(!jourIso || !(ACCES && ACCES.code)) return { cours: [], lectures: [], voitures: [] };
  if(drivupRappels.jour === jourIso && drivupRappels.donnees && Date.now() - drivupRappels.quand < 60000){
    return drivupRappels.donnees;
  }
  if(drivupRappels.jour === jourIso && drivupRappels.enCours) return drivupRappels.enCours;
  drivupRappels.jour = jourIso;
  drivupRappels.enCours = (async () => {
    let d = { cours: [], lectures: [], voitures: [] };
    try{
      const r = await appelPrep({ action: 'drivupPlanning', du: jourIso, au: jourIso });
      d = { cours: (r && r.cours) || [], lectures: (r && r.lectures) || [],
            voitures: (r && r.voitures) || [] };   /* 🚗 v1181 */
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
        libelle: libelleGardeDrivup(c), examen: !!c.examen,
        _fiche: fiche, _x: x
      });
    });
  });
  return { lignes, horsConduite, ressourcesIgnorees };
}

/* ============================================================
   🚗 LES NUMÉROS DE VOITURE — v1181

   David, le 15 octobre : « en haut du planning on met des numéros qui
   correspondent aux voitures ». Jean-Jacques, ce jour-là : « .1 » à
   7h00 (A3 n° 1, boîte manuelle), « .7 » à 7h30 (Q3 n° 7, automatique),
   « .9 » à 12h45 (Q3 n° 9, l'automatique de l'après-midi). Le numéro
   devient une voiture par le champ « N° Drivup » de la Flotte ; la
   boîte de l'élève dit laquelle des deux voitures du moniteur.
   ============================================================ */
function voituresDuPlanningDrivup(p){
  return (Array.isArray(p.voitures) ? p.voitures : []).slice(0, 600)
    .filter(v => /^\d{4}-\d{2}-\d{2}$/.test(String(v.jour)) && /^\d{2}:\d{2}$/.test(String(v.heure)) &&
                 /^\d{1,3}$/.test(String(v.numero)) && v.moniteurDrivup)
    .map(v => ({ jour: v.jour, heure: v.heure, numero: String(Number(v.numero)),
                 moniteurDrivup: propreDrivup(v.moniteurDrivup, 60),
                 moniteur: moniteurDeLAppliDrivup(v.moniteurDrivup) || '' }));
}

/* La voiture de la Flotte qui porte ce numéro (hors vendues) */
function vehiculeDuNumeroDrivup(flotte, numero){
  const n = String(Number(numero || 0) || '');
  if(!n) return null;
  return (flotte || []).find(v => v.etat !== 'vendu' && String(Number(v.numero || 0) || '') === n) || null;
}

/* Ce que la fenêtre montre : par moniteur et par jour, « 1 · A3 4 »,
   et les numéros que la Flotte ne connaît pas encore. */
async function blocDesVoituresDrivup(voitures){
  let flotte = [];
  try{
    const d = await appelPrep({ action: 'flotteList' });
    flotte = (d && d.vehicules) || [];
  }catch(e){ flotte = null; }
  const pli = document.createElement('details');
  pli.className = 'dvPli';
  const s = document.createElement('summary');
  const inconnus = {};
  const parQui = {};
  voitures.forEach(v => {
    const veh = flotte ? vehiculeDuNumeroDrivup(flotte, v.numero) : null;
    if(flotte && !veh) inconnus[v.numero] = true;
    const k = (v.moniteur || v.moniteurDrivup) + ' · ' + dateLisibleDrivup(v.jour);
    (parQui[k] = parQui[k] || []).push(v.heure.replace(':', 'h') + ' n° ' + v.numero + (veh ? ' ' + veh.nom : ''));
  });
  const nbInc = Object.keys(inconnus).length;
  s.textContent = '🚗 ' + voitures.length + ' numéro' + (voitures.length > 1 ? 's' : '') + ' de voiture lu' +
    (voitures.length > 1 ? 's' : '') + (nbInc ? ' · ⚠️ ' + nbInc + ' inconnu' + (nbInc > 1 ? 's' : '') + ' de la Flotte' : '');
  pli.appendChild(s);
  if(nbInc){
    const w = document.createElement('div');
    w.className = 'dvNote';
    w.style.color = 'var(--warn-text)';
    w.textContent = '⚠️ N° ' + Object.keys(inconnus).sort((a, b) => a - b).join(', ') +
      ' : aucun véhicule de la Flotte ne porte ce numéro. Remplis « N° Drivup » dans sa fiche ' +
      '(Gestion › Le parc), sinon le rappel ne saura pas quelle voiture annoncer.';
    pli.appendChild(w);
  }else if(flotte === null){
    const w = document.createElement('div');
    w.className = 'dvNote';
    w.textContent = 'La Flotte n’a pas pu être lue : les numéros sont gardés, la voiture se retrouvera au rappel.';
    pli.appendChild(w);
  }
  Object.keys(parQui).forEach(k => {
    const l = document.createElement('div');
    l.className = 'dvNote';
    l.textContent = k + ' — ' + parQui[k].join(' · ');
    pli.appendChild(l);
  });
  return pli;
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

  /* 🗓️ v1234 — les créneaux libres : mis à jour à chaque lecture d'une
     agence (choix de David), sans rien attendre d'autre */
  if(p.creneaux && typeof enregistrerLesCreneauxDrivup === 'function'){
    const nc = document.createElement('div');
    nc.className = 'dvNote crenNote';
    nc.style.margin = '0 0 10px';
    nc.textContent = '🗓️ Créneaux libres : mise à jour…';
    f.boite.appendChild(nc);
    enregistrerLesCreneauxDrivup(p.creneaux).then(r => {
      nc.textContent = '🗓️ Créneaux libres mis à jour : ' + r.ouverts + ' cours ouvert(s) sans élève · ' + r.resa +
        ' « Résa » · ' + (r.simu ? r.simu + ' simu à 1 place · ' : '') + (r.dispo ? r.dispo + ' dispo écrite(s) · ' : '') + r.rien + ' moment(s) sans cours — Élèves › 🗓️ Créneaux libres.';
    }).catch(e => { nc.style.color = 'var(--warn-text)'; nc.textContent = '⚠️ Créneaux libres non mis à jour : ' + ((e && e.message) || e); });
  }else if(p.creneauxErreur){
    const nc = document.createElement('div');
    nc.className = 'dvNote';
    nc.style.cssText = 'margin:0 0 10px;color:var(--warn-text);';
    nc.textContent = '⚠️ ' + p.creneauxErreur;
    f.boite.appendChild(nc);
  }

  /* 👂 v1229 — ouvrir les écoutes, depuis le planning d'une agence */
  if(genre === 'agence' && window.opener && !window.opener.closed){
    const be = document.createElement('button');
    be.className = 'btn btn-secondary';
    be.id = 'drivupBoutonEcoutes';
    be.style.cssText = 'width:auto;margin:0 0 12px;padding:8px 12px;font-size:13px;';
    be.textContent = '👂 Écoutes à ouvrir (' + semainesDesEcoutesDrivup() + ' sem.)';
    be.addEventListener('click', () => fenetreEcoutesDrivup(du));
    f.boite.appendChild(be);
  }

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

  /* 🚗 v1181 — les numéros de voiture lus en haut du planning */
  const voitures = voituresDuPlanningDrivup(p);
  if(voitures.length) f.boite.appendChild(await blocDesVoituresDrivup(voitures));

  /* 📍 v1170 — les horaires des bureaux, lus en même temps */
  let bureauxLus = [];
  if(typeof blocDesBureauxDrivup === 'function' && (p.bureaux || p.bureauxErreur)){
    try{ bureauxLus = await blocDesBureauxDrivup(p, f.boite); }catch(e){ bureauxLus = []; }
  }

  const aEcrire = changes.filter(c => c._etat !== 'pareil').length;
  const libelle = (aEcrire ? '✅ Enregistrer ' + (aEcrire > 1 ? 'les ' + aEcrire + ' changements' : 'le changement')
                           : '✅ Noter la lecture') + (bureauxLus.length ? ' et les horaires' : '');
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
        libelle: l.libelle, examen: l.examen })),
      /* 🚗 v1181 — les numéros de voiture, et les colonnes lues */
      voitures: voitures,
      colonnes: Array.isArray(p.colonnes) ? p.colonnes : undefined
    });
    oublierDrivupRappels();
    if(fiches.length && typeof chargerFiches === 'function') await chargerFiches().catch(() => {});
    /* 3 · les photos de ceux qui n'en ont pas — v1168 */
    const ph = await reprendreLesPhotosDrivup(lignes.map(l => ({ eleve: l.eleve, url: (l._x || {}).photo })));
    /* 4 · 📍 v1170 — les horaires des bureaux */
    const hb = bureauxLus.length && typeof poserLesBureauxDrivup === 'function'
      ? await poserLesBureauxDrivup(bureauxLus) : [];
    ok.style.display = 'none';
    non.disabled = false;
    non.textContent = 'Fermer';
    etat.style.color = '';
    etat.textContent = '✅ Enregistré : ' + ((r && r.nb) || lignes.length) + ' cours' +
      ((r && r.voitures) ? ' · ' + r.voitures + ' numéro(s) de voiture' : '') +
      (fiches.length ? ' · ' + fiches.length + ' fiche(s) créée(s) ou complétée(s)' : '') +
      (ph.posees ? ' · ' + ph.posees + ' photo(s) reprise(s)' : '') +
      (hb.length ? ' · horaires du bureau de ' + hb.join(' et de ') + ' repris' : '') + '.';
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
/* « forcer » : la fiche d'un élève, lue une à une. Le Worker décide
   alors seul — il remplace une photo qui venait de Drivup (v1169). */
async function reprendreLesPhotosDrivup(liste, forcer){
  const res = { posees: 0, ratees: 0 };
  try{ if(typeof chargerPhotosProfil === 'function') await chargerPhotosProfil(true); }catch(e){}
  const vus = {};
  const aFaire = (liste || []).filter(x => {
    if(!x || !x.eleve || !x.url) return false;
    const k = sansAccentDrivup(x.eleve);
    if(vus[k]) return false;
    vus[k] = true;
    return forcer || !(typeof lienPhotoProfil === 'function' && typeof clePhotoProfil === 'function' &&
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
    v.textContent = aDeja ? '📷 Sa photo Drivup sera reprise si celle qu’il a chez nous venait de Drivup ; ' +
                            'une photo posée à la main chez nous est gardée.'
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
      ph = await reprendreLesPhotosDrivup([{ eleve: nomPhoto, url: premier.photo }], true);
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



/* ============================================================
   👂 OUVRIR LES ÉCOUTES PÉDAGOGIQUES DANS DRIVUP — v1229

   David, le 21 octobre : « sur le planning, quand un cours est prévu
   sur un moniteur, il faut ouvrir une écoute pédagogique dans les
   cases écoutes, sauf quand c'est 1er cours, rendez-vous préalable,
   rendez-vous pédagogique, simulateur ». Puis : « pour l'examen
   blanc il y a une écoute de 1h30 », et « quand le cours est annoncé
   sur Loudéac il faut bien ouvrir dans la colonne écoute Loudéac ».

   Ce qu'on a vu dans Drivup, le 21 octobre, sans rien y écrire :
   · une écoute est une séance « sans élève » posée dans une colonne
     d'écoute — BEA 1, BEA 2, BEA 3, BV 1, BV 2, BV 3 pour
     Saint-Brieuc, « Ecoute » pour Loudéac — à l'heure du cours ;
   · sa prestation dit la durée et le lieu : « Écoute pédagogique 2h
     St Brieuc », « … 1h30 Loudéac », « … 1h » (sans lieu)…
   · Drivup la crée par son formulaire « Planifier » (booking_rec.php,
     envoyé à iframe_ok_rec.php) : le favori fait exactement ça.

   Ses choix : BEA ou BV d'après la voiture (le numéro en haut du
   planning), sinon d'après la formation ; la 1re colonne libre ;
   toutes prises → signalé, rien créé ; le préalable, les RVP et le
   1er cours se reconnaissent au mémo du cours Drivup et par l'appli ;
   la durée lue se règle ici (4 semaines par défaut). C'est la SEULE
   chose que le favori écrit dans Drivup — feu vert de David, contrat
   vérifié — et seulement après qu'on a validé la liste.
   ============================================================ */
const ECOUTES_SEMAINES_CLE = 'ec_ecoutes_semaines';
function semainesDesEcoutesDrivup(){
  let n = 4;
  try{ n = parseInt(localStorage.getItem(ECOUTES_SEMAINES_CLE) || '4', 10); }catch(e){}
  return (n >= 1 && n <= 8) ? n : 4;
}
function poserSemainesDesEcoutesDrivup(n){
  try{ localStorage.setItem(ECOUTES_SEMAINES_CLE, String(n)); }catch(e){}
}

/* Ce qui ne prend jamais d'écoute, lu dans le mémo du cours */
const ECOUTE_MEMO_EXCLU = [
  [/pr[ée]alable/i, 'RDV préalable (mémo Drivup)'],
  [/\brvp\b|\brdv\s*p[ée]da|rendez[- ]vous\s+p[ée]dagogique/i, 'RDV pédagogique (mémo Drivup)'],
  [/\b1\s*(er|ere|ère|°)\s*(cours|le[çc]on)|premi[eè]re?\s+(cours|le[çc]on)/i, '1er cours (mémo Drivup)']
];
/* Les séances de conduite voiture : elles seules prennent une écoute */
const ECOUTE_LECON = /conduite|examen blanc|test exam blanc|eval voiture|remise a niveau/;
const ECOUTE_PAS_LECON = /moto|remorque|voiturette|simu|baby|theorie|salle|etg|code/;
const ECOUTE_EB = /examen blanc|test exam blanc/;

function minutesDrivup(h){
  const m = String(h || '').match(/^(\d{2}):(\d{2})$/);
  return m ? (+m[1]) * 60 + (+m[2]) : NaN;
}
function heureDeMinutesDrivup(n){
  return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
}

/* Les prestations d'écoute, lues dans le formulaire de Drivup :
   « Écoute pédagogique 2h St Brieuc » → { min: 120, site: 'sb' }.
   Une écoute sans lieu (« … 1h ») sert aux deux. */
function prestationsDEcouteDrivup(prestations){
  const out = [];
  Object.keys(prestations || {}).forEach(id => {
    const n = sansAccentDrivup(prestations[id]);
    const m = n.match(/^ecoute(?: pedagogique)? (\d)h(\d\d)?(?: (st brieuc|saint brieuc|loudeac))?$/);
    if(!m) return;
    out.push({ id: String(id), nom: String(prestations[id]).trim(), min: (+m[1]) * 60 + (m[2] ? +m[2] : 0),
               site: !m[3] ? '' : (m[3] === 'loudeac' ? 'loudeac' : 'sb') });
  });
  return out;
}
function prestationPourDrivup(liste, min, site){
  return liste.find(p => p.min === min && p.site === site) ||
         liste.find(p => p.min === min && p.site === '') || null;
}

/* Les colonnes d'écoute, dans l'ordre de l'écran */
function colonnesDEcouteDrivup(ressources){
  const out = { bea: [], bv: [], loudeac: [] };
  (ressources || []).forEach(r => {
    const t = sansAccentDrivup(r.titre);
    if(t === 'bea') out.bea.push({ id: String(r.id), titre: 'BEA ' + (out.bea.length + 1) });
    else if(t === 'bv') out.bv.push({ id: String(r.id), titre: 'BV ' + (out.bv.length + 1) });
    else if(t === 'ecoute') out.loudeac.push({ id: String(r.id), titre: 'Écoute Loudéac' });
  });
  return out;
}

/* LE CALCUL — sans réseau, pour être vérifiable.
   d : ce que le favori a lu ; ctx : { flotte, ficheDe(x), suiviDe(nom),
   bureauDe(nom) }. Rend une ligne par cours de conduite. */
function calculerEcoutesDrivup(d, ctx){
  const prest = d.prestations || {};
  const nomDe = id => sansAccentDrivup(prest[String(id)] || '');
  const ecoutes = prestationsDEcouteDrivup(prest);
  const idsEcoute = {};
  ecoutes.forEach(p => { idsEcoute[p.id] = true; });
  const cols = colonnesDEcouteDrivup(d.ressources);
  const colsParId = {};
  ['bea', 'bv', 'loudeac'].forEach(g => cols[g].forEach(c => { colsParId[c.id] = g; }));
  const titreRes = {};
  (d.ressources || []).forEach(r => { titreRes[String(r.id)] = r.titre; });
  const ordreRes = {};
  (d.ressources || []).forEach((r, i) => { ordreRes[String(r.id)] = i; });

  const evs = (d.evenements || []).map(e => ({
    id: String(e.id), res: String(e.res), type: String(e.type || ''), jour: String(e.jour), debut: String(e.debut),
    fin: String(e.fin), memo: String(e.memo || ''), examen: String(e.examen || '0'), nbr: Number(e.nbr) || 0,
    adresse: String(e.adresse || ''), titre: String(e.titre || '')
  })).filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.jour) && !isNaN(minutesDrivup(e.debut)) && !isNaN(minutesDrivup(e.fin)));

  /* L'occupation des colonnes d'écoute : tout ce qui y est posé */
  const occupe = {};
  evs.forEach(e => {
    if(!colsParId[e.res]) return;
    (occupe[e.res + '|' + e.jour] = occupe[e.res + '|' + e.jour] || [])
      .push([minutesDrivup(e.debut), minutesDrivup(e.fin), idsEcoute[e.type] ? e.debut : null,
             /* « NON » posé dans une colonne d'écoute, en face d'un cours */
             nomDe(e.type) === 'non' || sansAccentDrivup(e.titre) === 'non']);
  });
  const libre = (res, jour, a, b) => !(occupe[res + '|' + jour] || []).some(x => x[0] < b && a < x[1]);

  /* Les numéros de voiture : « . 7 » à 7h30 dans la colonne du moniteur */
  const voitures = evs.map(e => {
    const m = nomDe(e.type).match(/^\s*(\d{1,3})$/) || sansAccentDrivup(e.titre).match(/^(\d{1,3})$/);
    return (/^\s*\.\s*\d{1,3}\s*$/.test(prest[e.type] || '') || /^\s*[.·•]\s*\d{1,3}\s*$/.test(e.titre)) && m
      ? { res: e.res, jour: e.jour, heure: e.debut, numero: String(Number(m[1])) } : null;
  }).filter(Boolean);
  const boiteDeLaVoiture = (res, jour, debut) => {
    const v = voitures.filter(x => x.res === res && x.jour === jour && x.heure <= debut)
      .sort((a, b) => a.heure.localeCompare(b.heure)).pop();
    if(!v) return '';
    const veh = vehiculeDuNumeroDrivup(ctx.flotte || [], v.numero);
    return veh ? (veh.boite === 'bva' ? 'bea' : 'bv') : '';
  };

  /* Les cours de conduite des moniteurs */
  const lecons = evs.filter(e => {
    if(colsParId[e.res]) return false;
    if(!ctx.moniteurDe(titreRes[e.res] || '')) return false;
    const n = nomDe(e.type);
    return ECOUTE_LECON.test(n) && !ECOUTE_PAS_LECON.test(n);
  }).sort((a, b) => (a.jour + a.debut).localeCompare(b.jour + b.debut) || (ordreRes[a.res] - ordreRes[b.res]));

  /* Le 1er cours, compté par l'appli : aucune leçon chez nous, et
     c'est le premier de la période lue */
  const dejaVu = {};
  const lignes = lecons.map(e => {
    const n = nomDe(e.type);
    const eleves = ((d.details || {})[e.id] || []);
    const x = eleves[0] || null;
    const fiche = x ? ctx.ficheDe(x) : null;
    const nomEleve = fiche ? fiche.eleve : (x ? nomDeLEleveDrivup(x) : '');
    const site = /loudeac/.test(n) || /loud/i.test(e.adresse) ? 'loudeac' : 'sb';
    const eb = ECOUTE_EB.test(n);
    const duree = eb ? 90 : minutesDrivup(e.fin) - minutesDrivup(e.debut);
    let boite = '';
    if(site === 'sb'){
      boite = boiteDeLaVoiture(e.res, e.jour, e.debut);
      if(!boite){
        if(/\bbea\b/.test(n) && !/bv bea/.test(n)) boite = 'bea';
        else if(/\bbv\b/.test(n) || /^conduite \d/.test(n) || /^examen blanc pratique (st brieuc|loudeac)?$/.test(n)) boite = 'bv';
        else{
          const fo = sansAccentDrivup((x && x.formation) || (fiche && fiche.formation) || '');
          boite = /bea|pmr|aménag|amenag/.test(fo) ? 'bea' : 'bv';
        }
      }
    }
    const groupe = site === 'loudeac' ? 'loudeac' : boite;
    const ligne = {
      cle: e.id, eventId: e.id, jour: e.jour, debut: e.debut, fin: e.fin, res: e.res,
      moniteurDrivup: titreRes[e.res] || '', moniteur: ctx.moniteurDe(titreRes[e.res] || '') || '',
      eleve: nomEleve, libelle: prest[e.type] || '', site: site, groupe: groupe, eb: eb,
      /* ⚠️ UN COURS D'1H NE PREND PAS D'ÉCOUTE — David, le 21 octobre
         (le 24/10 à 13h : « il n'y a qu'une leçon », l'autre durait 1h).
         L'examen blanc, lui, a toujours la sienne (1h30). */
      prestation: (!eb && duree < 90) ? null : prestationPourDrivup(ecoutes, duree, site), duree: duree,
      colonne: null, etat: 'ouvrir', raison: '', coche: true
    };
    /* Pourquoi on n'en ouvre pas */
    const raisons = [];
    if(e.examen !== '0') raisons.push('examen');
    if(!e.nbr && !x) raisons.push('pas d’élève sur ce cours');
    ECOUTE_MEMO_EXCLU.forEach(([re, r]) => { if(re.test(e.memo)) raisons.push(r); });
    if(fiche){
      const s = ctx.suiviDe(fiche.eleve) || {};
      if(String(s.rvpDate || '') === e.jour) raisons.push('RDV préalable (Suivi AAC)');
      if(String(s.rvp1Date || '') === e.jour) raisons.push('RVP 1 (Suivi AAC)');
      if(String(s.rvp2Date || '') === e.jour) raisons.push('RVP 2 (Suivi AAC)');
      const b = ctx.bureauDe(fiche.eleve);
      const sansLecon = !b || (!(Number(b.lecons) || 0) && !(Number(b.leconNum) || 0) &&
                               !((b.datesLecons || []).some(j => j < e.jour)));
      if(sansLecon && !dejaVu[fiche.eleve] && !eb) raisons.push('1er cours (aucune leçon dans l’appli)');
      dejaVu[fiche.eleve] = true;
    }
    if(!eb && duree < 90) raisons.push(duree === 60 ? 'cours d’1h : pas d’écoute' : 'cours de ' + duree + ' min : pas d’écoute');
    else if(!ligne.prestation) raisons.push('pas d’écoute de ' + (duree % 60 ? Math.floor(duree / 60) + 'h' + String(duree % 60).padStart(2, '0') : (duree / 60) + 'h') + ' dans Drivup');
    if(raisons.length){ ligne.etat = 'ecarte'; ligne.raison = raisons.join(' · '); ligne.coche = false; }
    return ligne;
  });

  /* Déjà ouverte : à la même heure, autant d'écoutes dans les colonnes
     du groupe que de cours — les premiers cours (ordre de l'écran)
     sont servis. */
  /* ⚠️ DÉJÀ OUVERTE — une écoute par cours. David : « s'il y a 3 cours
     à 10h sans contre-indication, il faut 3 écoutes en face ».

     Une écoute déjà posée dans les colonnes du groupe sert un cours
     quand elle COUVRE son début : la même heure, ou commencée avant
     et pas finie — le samedi 31/10, l'écoute 4h de BV 3 posée à 8h
     (un élève inscrit) sert aussi le cours de 10h. Mais une écoute ne
     sert qu'un cours à la fois : tant que le cours qu'elle sert n'est
     pas fini, elle n'est pas libre pour un autre.

     Elle sert d'abord les cours qui en ont besoin (un 1er cours ou un
     préalable ne « prend » pas celle d'un autre), d'abord à la même
     heure, d'abord de la même durée (le 24/10 à 13h : l'écoute 2h est
     celle du cours de 2h de Hery, pas du cours d'1h d'à côté). On
     avance dans l'ordre des heures. */
  const existantes = [];
  ['bea', 'bv', 'loudeac'].forEach(g => (cols[g] || []).forEach(c => {
    Object.keys(occupe).filter(k => k.indexOf(c.id + '|') === 0).forEach(k => {
      const jour = k.slice(c.id.length + 1);
      occupe[k].forEach(x => {
        if(x[2] !== null) existantes.push({ groupe: g, jour: jour, a: x[0], b: x[1], debut: x[2], libreA: 0 });
        else if(x[3]) existantes.push({ groupe: g, jour: jour, a: x[0], b: x[1], debut: heureDeMinutesDrivup(x[0]), libreA: 0, non: true });
      });
    });
  }));
  const parCreneau = {};
  lignes.forEach(l => { (parCreneau[l.jour + '|' + l.debut + '|' + l.groupe] = parCreneau[l.jour + '|' + l.debut + '|' + l.groupe] || []).push(l); });
  Object.keys(parCreneau).sort().forEach(k => {
    const [jour, debut, groupe] = k.split('|');
    const t = minutesDrivup(debut);
    const besoin = parCreneau[k].filter(l => l.etat === 'ouvrir' && l.prestation);
    const servir = (l, x) => {
      x.libreA = minutesDrivup(l.fin) || (t + l.prestation.min);
      l.etat = 'deja'; l.coche = false; l.raison = 'écoute déjà ouverte à cette heure';
    };
    const dispo = () => existantes.filter(x => !x.non && x.groupe === groupe && x.jour === jour && x.a <= t && t < x.b && x.libreA <= t);
    /* même heure et même durée, puis même heure, puis commencée avant */
    besoin.forEach(l => { const x = dispo().find(x => x.debut === debut && (x.b - x.a) === l.prestation.min); if(x) servir(l, x); });
    besoin.filter(l => l.etat === 'ouvrir').forEach(l => { const x = dispo().find(x => x.debut === debut); if(x) servir(l, x); });
    /* ⚠️ « NON » EN FACE DU COURS — relevé dans le planning de David le
       21/10 (le 21/10 à 10h, le 23/10 à 13h, le 24/10 à 17h) : un bloc
       « NON » posé dans une colonne d'écoute à l'heure d'un cours dit
       « pas d'écoute pour celui-là ». On le respecte (recochable). */
    besoin.filter(l => l.etat === 'ouvrir').forEach(l => {
      const x = existantes.find(x => x.non && x.groupe === groupe && x.jour === jour && x.debut === debut && x.libreA <= t);
      if(x){ x.libreA = minutesDrivup(l.fin) || (t + 60); l.etat = 'ecarte'; l.coche = false; l.raison = '« NON » posé en face dans Drivup'; }
    });
    besoin.filter(l => l.etat === 'ouvrir').forEach(l => { const x = dispo()[0]; if(x) servir(l, x); });
  });

  /* Les colonnes : d'abord pour les cours retenus, puis pour ceux
     qu'on pourrait recocher */
  const poser = l => {
    if(!l.prestation) return;
    const a = minutesDrivup(l.debut), b = a + l.prestation.min;
    const c = (cols[l.groupe] || []).find(c => libre(c.id, l.jour, a, b));
    if(!c){
      if(l.etat === 'ouvrir'){ l.etat = 'ecarte'; l.coche = false;
        l.raison = 'plus de colonne ' + (l.groupe === 'loudeac' ? 'Écoute Loudéac' : l.groupe.toUpperCase()) + ' libre'; }
      return;
    }
    l.colonne = c;
    (occupe[c.id + '|' + l.jour] = occupe[c.id + '|' + l.jour] || []).push([a, b, l.debut]);
  };
  lignes.filter(l => l.etat === 'ouvrir').forEach(poser);
  lignes.filter(l => l.etat === 'ecarte' && l.prestation && !l.colonne).forEach(poser);
  return lignes;
}

/* ------------------------------------------------------------
   LA FENÊTRE — lire, choisir, ouvrir
   ------------------------------------------------------------ */
function envoyerADrivup(m){
  if(!window.opener || window.opener.closed) throw new Error('L’onglet Drivup est fermé : reclique sur le favori depuis le planning de l’agence.');
  window.opener.postMessage(m, DRIVUP_ORIGINE);
}

/* ⚠️ UN ACCUSÉ SOUS 20 SECONDES. Une page Drivup rechargée a perdu
   le favori : sans lui, personne ne répond — on le dit vite, au lieu
   de laisser tourner trois minutes. */
function attendreDeDrivup(type, surProgression, delai){
  return new Promise((ok, ko) => {
    const fin = () => { clearTimeout(t); clearTimeout(t0); window.removeEventListener('message', ecoute); };
    const t = setTimeout(() => { fin(); ko(new Error('Drivup ne répond plus. Recharge le planning Drivup et reclique sur le favori.')); }, delai || 180000);
    const t0 = setTimeout(() => { fin(); ko(new Error('Le favori ne répond pas dans l’onglet Drivup : reclique sur le favori depuis le planning de l’agence, puis recommence.')); }, 20000);
    function ecoute(ev){
      if(ev.origin !== DRIVUP_ORIGINE || !ev.data) return;
      if(ev.data.type === 'drivup-ecoutes-progression'){ clearTimeout(t0); if(surProgression) surProgression(ev.data); return; }
      if(ev.data.type === 'drivup-ecoutes-erreur'){ fin(); ko(new Error(ev.data.message || 'erreur dans Drivup')); return; }
      if(ev.data.type !== type) return;
      fin();
      ok(ev.data);
    }
    window.addEventListener('message', ecoute);
  });
}

async function fenetreEcoutesDrivup(du){
  const semaines = semainesDesEcoutesDrivup();
  const f = cadreDrivup('👂 Écoutes à ouvrir dans Drivup', '');
  f.fond.id = 'drivupEcoutes';
  const reglage = document.createElement('div');
  reglage.className = 'dvNote';
  reglage.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px;';
  const lab = document.createElement('span');
  lab.textContent = 'Lire à partir du ' + dateLisibleDrivup(du) + ', sur';
  const sel = document.createElement('select');
  sel.id = 'drivupEcoutesSemaines';
  sel.style.cssText = 'width:auto;padding:4px 8px;';
  for(let n = 1; n <= 8; n++){
    const o = document.createElement('option');
    o.value = String(n); o.textContent = n + ' semaine' + (n > 1 ? 's' : '');
    if(n === semaines) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => {
    poserSemainesDesEcoutesDrivup(parseInt(sel.value, 10));
    f.fermer();
    fenetreEcoutesDrivup(du);
  });
  reglage.append(lab, sel);
  f.boite.appendChild(reglage);

  const corps = document.createElement('div');
  corps.innerHTML = '<div class="dvBarre"><span></span></div><div class="dvNote" id="drivupEcoutesLu">Lecture du planning dans Drivup…</div>';
  f.boite.appendChild(corps);
  let d;
  try{
    envoyerADrivup({ type: 'drivup-ecoutes-lire', du: du, semaines: semaines });
    d = await attendreDeDrivup('drivup-ecoutes-lues', p => {
      const b = corps.querySelector('.dvBarre span');
      if(b && p.total) b.style.width = Math.min(100, Math.round(p.fait * 100 / p.total)) + '%';
      const t = $('drivupEcoutesLu');
      if(t) t.textContent = p.texte || ((p.fait || 0) + ' / ' + (p.total || 0));
    });
  }catch(e){
    corps.innerHTML = '';
    const w = document.createElement('div');
    w.className = 'empty';
    w.textContent = '⚠️ ' + e.message;
    corps.appendChild(w);
    return;
  }
  corps.remove();

  let flotte = [];
  try{ const r = await appelPrep({ action: 'flotteList' }); flotte = (r && r.vehicules) || []; }catch(e){}
  const lignes = calculerEcoutesDrivup(d, {
    flotte: flotte,
    ficheDe: ficheDeLEleveDrivup,
    moniteurDe: moniteurDeLAppliDrivup,
    suiviDe: nom => (typeof suiviDe === 'function' ? suiviDe(nom) : {}) || {},
    bureauDe: nom => (typeof eleveDuBureau === 'function' ? eleveDuBureau(nom) : null)
  });
  f.sous.textContent = 'Du ' + dateLisibleDrivup(d.du) + ' au ' + dateLisibleDrivup(d.au) +
    ' · une écoute par cours de conduite, dans la 1re colonne libre (BEA ou BV à Saint-Brieuc, « Ecoute » à Loudéac).';

  const aOuvrir = lignes.filter(l => l.etat === 'ouvrir');
  const deja = lignes.filter(l => l.etat === 'deja');
  const ecartes = lignes.filter(l => l.etat === 'ecarte');
  const puces = document.createElement('div');
  puces.className = 'dvPuces';
  puces.append(puceDrivup('neuf', aOuvrir.length, '👂 à ouvrir'));
  if(deja.length) puces.append(puceDrivup('', deja.length, deja.length > 1 ? '✅ déjà ouvertes' : '✅ déjà ouverte'));
  if(ecartes.length) puces.append(puceDrivup('ignore', ecartes.length, ecartes.length > 1 ? 'écartés' : 'écarté'));
  f.boite.appendChild(puces);

  const cases = [];
  let jourCourant = '';
  const ligneUI = (l, ou) => {
    if(l.jour !== jourCourant){
      jourCourant = l.jour;
      const j = document.createElement('div');
      j.className = 'dvJour';
      j.textContent = dateLisibleDrivup(l.jour);
      ou.appendChild(j);
    }
    const el = document.createElement('label');
    el.className = 'dvL' + (l.etat === 'ouvrir' ? '' : ' annule');
    el.dataset.cle = l.cle;
    const c = document.createElement('input');
    c.type = 'checkbox';
    c.checked = l.coche;
    c.disabled = !(l.prestation && l.colonne);
    const h = document.createElement('span');
    h.className = 'dvH';
    h.textContent = l.debut.replace(':', 'h');
    const qui = document.createElement('span');
    qui.className = 'dvQui';
    const b = document.createElement('b');
    b.textContent = (l.moniteur || l.moniteurDrivup) + (l.eleve ? ' · ' + l.eleve : '');
    const sp = document.createElement('span');
    sp.textContent = (l.colonne ? l.colonne.titre + ' · ' : '') + (l.prestation ? l.prestation.nom : l.libelle) +
      (l.raison ? ' — ' + l.raison : '');
    qui.append(b, sp);
    el.append(c, h, qui);
    if(l.etat === 'ouvrir' || (l.prestation && l.colonne)) cases.push({ l: l, c: c, el: el });
    c.addEventListener('change', majBouton);
    ou.appendChild(el);
  };
  aOuvrir.forEach(l => ligneUI(l, f.boite));
  if(!aOuvrir.length){
    const v = document.createElement('div');
    v.className = 'dvPli';
    v.textContent = '✅ Rien à ouvrir : chaque cours a déjà son écoute, ou n’en prend pas.';
    f.boite.appendChild(v);
  }
  if(ecartes.length){
    const pli = document.createElement('details');
    pli.className = 'dvPli';
    const s = document.createElement('summary');
    s.textContent = ecartes.length + ' cours écarté' + (ecartes.length > 1 ? 's' : '') + ' (on peut en recocher un)';
    pli.appendChild(s);
    jourCourant = '';
    ecartes.forEach(l => ligneUI(l, pli));
    f.boite.appendChild(pli);
  }
  if(deja.length){
    const pli = document.createElement('details');
    pli.className = 'dvPli';
    const s = document.createElement('summary');
    s.textContent = deja.length + ' cours ont déjà leur écoute';
    pli.appendChild(s);
    jourCourant = '';
    deja.forEach(l => ligneUI(l, pli));
    f.boite.appendChild(pli);
  }

  const btns = boutonsDrivup(f.boite, '👂 Ouvrir', async (etat, ok, non) => {
    const choisies = cases.filter(x => x.c.checked).map(x => x.l);
    if(!choisies.length){ ok.disabled = false; non.disabled = false; majBouton(); return; }
    ok.textContent = 'Dans Drivup…';
    etat.style.color = '';
    etat.textContent = 'Ouverture des écoutes dans Drivup… 0 / ' + choisies.length;
    envoyerADrivup({ type: 'drivup-ecoutes-creer', liste: choisies.map(l => ({
      cle: l.cle, res: l.colonne.id, typMo: l.prestation.id, jour: l.jour, debut: l.debut, min: l.prestation.min })) });
    const r = await attendreDeDrivup('drivup-ecoutes-faites', p => {
      etat.textContent = 'Ouverture des écoutes dans Drivup… ' + (p.fait || 0) + ' / ' + (p.total || choisies.length);
    }, 600000);
    let bons = 0, mauvais = 0;
    (r.resultats || []).forEach(x => {
      const it = cases.find(y => y.l.cle === x.cle);
      if(!it) return;
      it.c.disabled = true; it.c.checked = false;
      const et = document.createElement('span');
      et.className = 'dvEt ' + (x.ok ? 'neuf' : 'annule');
      et.textContent = x.ok ? '✅ Ouverte' : '⚠️ ' + (x.message || 'non ouverte');
      it.el.appendChild(et);
      if(x.ok) bons++; else mauvais++;
    });
    ok.style.display = 'none';
    non.disabled = false;
    non.textContent = 'Fermer';
    etat.style.color = mauvais ? 'var(--warn-text)' : '';
    etat.textContent = (bons ? '✅ ' + bons + ' écoute' + (bons > 1 ? 's' : '') + ' ouverte' + (bons > 1 ? 's' : '') + ' dans Drivup' : '') +
      (mauvais ? (bons ? ' · ' : '') + '⚠️ ' + mauvais + ' non ouverte' + (mauvais > 1 ? 's' : '') + ' (voir les lignes)' : '') + '.';
  }, f.fermer);
  function majBouton(){
    const n = cases.filter(x => x.c.checked).length;
    btns.ok.disabled = !n;
    btns.ok.textContent = n ? '👂 Ouvrir ' + n + ' écoute' + (n > 1 ? 's' : '') + ' dans Drivup' : 'Rien de coché';
  }
  majBouton();
  const note = document.createElement('div');
  note.className = 'dvNote';
  note.textContent = 'Le favori remplit le formulaire « Planifier » de Drivup pour chaque écoute cochée, comme à la main, ' +
    'puis relit le planning pour vérifier qu’elle y est. Rien d’autre n’est écrit dans Drivup.';
  f.boite.appendChild(note);
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-drivup.js'] = true;
