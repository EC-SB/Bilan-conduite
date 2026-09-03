/* Déployé le 03/09/2026 à 08:47 — v823 */
/* ============================================================
   ec-bandeau.js
   Ce qu'on doit voir sans le chercher.

   L'application n'a pas de page d'accueil : on ouvre, et on tombe
   sur son premier onglet. Tout ce qui « doit se savoir » était
   rangé dans un écran qu'il fallait penser à aller ouvrir.

   Or les choses rassemblées ici ont un point commun : ELLES ONT UNE
   DATE DE PÉREMPTION. Un anniversaire vu le lendemain ne sert à
   rien. Un rendez-vous AAC vu à J-3 n'est plus une alerte, c'est un
   constat. Une place d'examen non prise à temps est perdue.

   ─ LA RÈGLE QUI TIENT TOUT LE MODULE ─

   CE BANDEAU NE FAIT QUE LIRE ET EMMENER. Il ne calcule rien qui
   lui soit propre : chaque famille appelle la fonction qui sait
   déjà — prochainesPrises, dossierAac, notifsEnAttente, ageDe. Une
   deuxième façon de compter les jours restants, et les deux écrans
   finiraient par ne pas dire la même chose. Et il n'écrit rien :
   cliquer une ligne emmène sur l'écran qui règle la chose.

   ─ CE QUE ÇA COÛTE ─

   Rien. Tout est déjà en mémoire quand il se dessine : l'état du
   bureau, les fiches, le réglage des places. Un seul appel réseau
   lui est propre — les messages épinglés — et il part en fond, une
   fois, après le premier écran.

   ⚠️ IL SE DESSINE APRÈS, JAMAIS AVANT. Il ne doit pas retarder
   d'une seconde l'ouverture de l'application. S'il n'a pas encore
   ses données, ou si un calcul échoue, il ne s'affiche pas — et
   personne ne s'en aperçoit.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ------------------------------------------------------------
   LES FAMILLES — UNE SEULE TABLE

   C'est elle qui rend le menu possible. Une famille ajoutée ici
   apparaît dans le bandeau ET dans le menu de réglage, sans qu'on
   y pense : la liste des cases à cocher EST cette liste.

   « droit » : la section qui décide. Vide veut dire que le calcul
   se garde lui-même (les alertes à prévoir ont leurs trois droits
   à elles, un par type).

   « reglable » : peut-on l'éteindre dans le menu. Un message
   adressé à toi personnellement, non.
   ------------------------------------------------------------ */
const FAMILLES_BANDEAU = [
  { cle:'message',  emoji:'📌', nom:'Messages du bureau',
    droit:'',              reglable:false },
  { cle:'prise',    emoji:'📆', nom:'Prise de dates à la préfecture',
    droit:'bureau_places', reglable:true },
  { cle:'aac',      emoji:'🤝', nom:'Rendez-vous AAC et conduite supervisée',
    droit:'suivi_aac_cs',  reglable:true },
  { cle:'aprevoir', emoji:'📝', nom:'Examens blancs et simulateurs à prévoir',
    droit:'',              reglable:true },
  { cle:'anniv',    emoji:'🎂', nom:'Anniversaires du jour',
    droit:'cours',         reglable:true }
];

/* À combien de jours un rendez-vous AAC monte dans le bandeau. */
const JOURS_AVANT_RDV_AAC = 15;

/* Un anniversaire ne remonte plus au bout d'un an sans cours.
   Chrystel : « tous les élèves : oui sauf si pas de cours depuis
   plus d'un an ». Un élève parti reste au répertoire — c'est
   normal, on garde son dossier — mais son anniversaire n'a plus à
   revenir chaque année dans le bandeau de toute l'équipe. */
const MOIS_SANS_COURS_AVANT_OUBLI = 12;

const CLE_BANDEAU_REDUIT   = 'bandeau_reduit';
const CLE_BANDEAU_FAMILLES = 'bandeau_familles';
const CLE_BANDEAU_MASQUE   = 'bandeau_masque';

let messagesEpingles = [];
let bandeauPret = false;


/* ------------------------------------------------------------
   LE RÉGLAGE — PAR PERSONNE ET PAR APPAREIL

   Il vit dans le navigateur, pas dans le classeur : chacun règle
   son bandeau sans toucher à celui des autres, et il n'y a rien à
   administrer. Le revers est assumé : un téléphone neuf repart des
   réglages par défaut.
   ------------------------------------------------------------ */
function lireReglageBandeau(cle, defaut){
  try{
    const v = localStorage.getItem(cle);
    return v === null ? defaut : JSON.parse(v);
  }catch(e){ return defaut; }
}

function ecrireReglageBandeau(cle, valeur){
  try{ localStorage.setItem(cle, JSON.stringify(valeur)); }catch(e){}
}

/* Les familles éteintes, par leur clé. */
function famillesEteintes(){
  const v = lireReglageBandeau(CLE_BANDEAU_FAMILLES, []);
  return Array.isArray(v) ? v : [];
}

/* ⚠️ UNE ALERTE EN RETARD PASSE OUTRE LE RÉGLAGE.

   « Oui c'est sûr et certain. » Sans cette exception, le menu
   deviendrait un moyen de ne plus voir ce qui va mal — on éteint
   la famille un jour de fatigue, et le rendez-vous dépassé
   disparaît avec elle. Ce qui est en retard, ou ce qui se joue
   aujourd'hui, se montre quoi qu'on ait coché. */
function familleVisible(cle, urgente){
  if(urgente) return true;
  return famillesEteintes().indexOf(cle) === -1;
}

/* Ce qui a été mis en sourdine, et pour quel jour. Une ligne
   masquée revient le lendemain : masquer définitivement une alerte,
   ce serait prendre le risque de perdre un rendez-vous. */
function masquesDuJour(){
  const v = lireReglageBandeau(CLE_BANDEAU_MASQUE, {});
  return (v && typeof v === 'object') ? v : {};
}

function ligneEnSourdine(id){
  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);
  return masquesDuJour()[id] === auj;
}

function mettreEnSourdine(id){
  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);
  const m = masquesDuJour();
  /* Au passage, on jette les jours écoulés : sans ça, le stockage
     du navigateur grossirait d'une ligne par alerte et par jour,
     pour toujours. */
  Object.keys(m).forEach(k => { if(m[k] < auj) delete m[k]; });
  m[id] = auj;
  ecrireReglageBandeau(CLE_BANDEAU_MASQUE, m);
}


/* ============================================================
   LES CINQ FAMILLES

   Chacune rend une liste de lignes :
     { id, famille, emoji, texte, sous, urgente, croix, ou }
   « croix » : ce que fait le ✕. Absent, pas de croix.
   « ou »    : où la ligne emmène quand on la touche.
   ============================================================ */

/* ── 📌 Les messages épinglés du bureau ─────────────────────── */
function lignesMessages(){
  return (messagesEpingles || []).map(m => ({
    id: 'msg:' + m.id,
    famille: 'message',
    emoji: '📌',
    texte: m.texte,
    sous: m.par ? 'de ' + m.par : '',
    /* Un message qu'on t'adresse ne s'éteint pas dans un menu, mais
       il se tait pour la journée une fois lu. Sa disparition
       définitive appartient à celui qui l'a écrit. */
    urgente: false,
    croix: 'jour'
  }));
}

/* ── 📆 La prise de dates ───────────────────────────────────── */
function lignesPriseDeDates(){
  if(typeof prochainesPrises !== 'function') return [];
  if(typeof aDroit === 'function' && !aDroit('bureau_places')) return [];

  const out = [];
  prochainesPrises().forEach(p => {
    const lib = libellePrise(p);
    if(lib.jours < 0 || lib.jours > JOURS_AVANT_PRISE) return;

    out.push({
      id: 'prise:' + p.date + ':' + p.quinzaine,
      famille: 'prise',
      emoji: lib.urgent ? '🔔' : '📆',
      texte: lib.titre,
      sous: lib.periode + ' — ' + lib.places +
            (lib.reglee ? ' · 📌 date réglée à la main' : ''),
      urgente: lib.urgent,
      croix: 'jour',
      ou: ['permis', 'preppermis']
    });
  });
  return out;
}

/* ── 🤝 Les rendez-vous AAC et CS ───────────────────────────── */
function lignesAacCs(){
  if(typeof elevesAac !== 'function') return [];
  if(typeof aDroit === 'function' && !aDroit('suivi_aac_cs')) return [];

  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);
  const limite = (typeof decalerJours === 'function')
    ? decalerJours(auj, JOURS_AVANT_RDV_AAC) : '';

  const out = [];
  /* On relit le MÊME dossier que la liste 🤝 Suivi AAC : les états
     « fait », « prévu », « en retard » y sont déjà calculés. */
  (elevesAac() || []).forEach(x => {
    [['rvp1', 'RVP 1'], ['rvp2', 'RVP 2'], ['rvt', 'rendez-vous théorique']]
      .forEach(([cle, nom]) => {
        const e = x.rdv && x.rdv[cle];
        if(!e || e.cle !== 'retard' && e.cle !== 'aprevoir') return;

        const ech = (x.ech && x.ech[cle]) || '';
        if(!e.retard){
          if(!ech) return;                    /* sans échéance, rien à dire */
          if(limite && ech > limite) return;  /* trop loin pour alerter */
        }

        out.push({
          id: 'aac:' + normaliserMot(x.eleve) + ':' + cle,
          famille: 'aac',
          emoji: '🤝',
          texte: x.eleve + ' — ' + nom,
          sous: e.txt,
          /* Un rendez-vous dépassé passe outre le menu. */
          urgente: !!e.retard,
          croix: 'jour',
          ou: ['suivi', 'suiviaac']
        });
      });
  });
  return out;
}

/* ── 📝 Les examens blancs et simulateurs à prévoir ─────────── */

/* Le champ de suivi qui dit « je lui ai dit d'acheter ». Il existe
   déjà, et la case est la même que dans les listes et le dossier
   élève — voir casePrevenu(). Le type « permis » n'en a pas : sa
   croix est celle de tout le monde. */
const PREVENU_DU_TYPE = { examblanc: 'ebPrevenu', simu: 'simuPrevenu', permis: '' };

function lignesAPrevoir(){
  if(typeof notifsEnAttente !== 'function') return [];
  if(typeof etatBureau === 'undefined') return [];

  const out = [];
  (notifsEnAttente(etatBureau.eleves) || []).forEach(n => {
    const champ = PREVENU_DU_TYPE[n.type];
    const s = (typeof suiviDe === 'function') ? suiviDe(n.eleve) : {};
    const prevenu = !champ || String(s[champ] || '') === 'oui';

    out.push({
      id: 'aprevoir:' + normaliserMot(n.eleve) + ':' + n.type,
      famille: 'aprevoir',
      emoji: '📝',
      texte: n.eleve + ' — ' + n.nom.replace(/^[^ ]+ /, ''),
      /* CE QUE LA CROIX ATTEND, ET POURQUOI ELLE ATTEND.

         « Prévenu » ne veut pas dire « c'est réglé » : ça veut dire
         « je lui ai dit d'acheter pour pouvoir planifier ». Il
         achète, il planifie seul sur Drivup, et la date arrive
         ensuite dans l'outil — c'est ELLE qui fait disparaître
         l'alerte, toute seule, puisque la note ne dit plus « à
         prévoir ».

         Entre les deux, il reste une étape à la main : l'élève a
         été prévenu, on n'a plus rien à faire, et la ligne n'a plus
         à occuper le bandeau. D'où la croix — mais seulement
         après avoir coché « prévenu », sinon elle servirait à
         oublier de prévenir. */
      sous: prevenu ? 'prévenu — à barrer' : "l'élève n'est pas encore prévenu",
      urgente: false,
      croix: prevenu ? 'notif' : '',
      croixType: n.type,
      croixEleve: n.eleve,
      ou: ['suivi', 'notifs']
    });
  });
  return out;
}

/* ── 🎂 Les anniversaires du jour ───────────────────────────── */
function lignesAnniversaires(){
  if(typeof fichesEleves === 'undefined' || typeof ageDe !== 'function') return [];
  if(typeof aDroit === 'function' && !aDroit('cours')) return [];

  const d = new Date();
  const jourMois = ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                   ('0' + d.getDate()).slice(-2);

  const out = [];
  (fichesEleves || []).forEach(f => {
    const iso = String(f.naissance || '').trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
    if(iso.slice(5) !== jourMois) return;
    if(!encoreEnFormation(f.eleve)) return;

    const a = ageDe(iso);
    out.push({
      id: 'anniv:' + normaliserMot(f.eleve),
      famille: 'anniv',
      emoji: '🎂',
      texte: f.eleve + ' a ' + (a === null ? '❓' : a) + ' ans aujourd\'hui',
      sous: '',
      urgente: false,
      croix: 'jour',
      ou: ['eleves', 'dossier'],
      eleve: f.eleve
    });
  });
  return out;
}

/* Un cours dans l'année écoulée, ou aucun cours du tout — un élève
   qui vient de s'inscrire mérite qu'on lui souhaite son
   anniversaire. La date du dernier cours est DÉJÀ sur sa ligne dans
   l'état du bureau : c'est elle qui écrit « Dernier cours le … »
   dans les listes. On ne va rien chercher de plus. */
function encoreEnFormation(nom){
  if(typeof etatBureau === 'undefined' || !etatBureau.eleves) return true;
  const e = (typeof trouverParNom === 'function')
    ? trouverParNom(etatBureau.eleves, nom) : null;
  if(!e || !e.date) return true;

  const iso = (typeof isoDeDateFr === 'function') ? isoDeDateFr(e.date) : '';
  if(!iso) return true;                 /* date illisible : on ne juge pas */

  const d = new Date();
  d.setMonth(d.getMonth() - MOIS_SANS_COURS_AVANT_OUBLI);
  const limite = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) +
                 '-' + ('0' + d.getDate()).slice(-2);
  return iso >= limite;
}

/* « 12/08/2026 » ou « 12/08/2026 09:15 » vers l'ISO. La règle de
   conversion vit dans dateVersIsoFr quand elle est là ; sinon on la
   fait ici, et seulement ici. */
function isoDeDateFr(v){
  const m = String(v || '').match(/(\d{1,2})[\/\s-](\d{1,2})[\/\s-](\d{4})/);
  if(m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  const i = String(v || '').match(/\d{4}-\d{2}-\d{2}/);
  return i ? i[0] : '';
}

/* Le jour d'ici N jours, en ISO. */
function decalerJours(iso, n){
  const d = new Date(String(iso) + 'T12:00:00');
  if(isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) +
         '-' + ('0' + d.getDate()).slice(-2);
}


/* ============================================================
   TOUT RASSEMBLER
   ============================================================ */

/* Chaque famille est isolée : un module absent, une donnée pas
   encore chargée, et c'est CETTE famille qui manque — pas le
   bandeau entier. */
function lignesDuBandeau(){
  const calculs = {
    message:  lignesMessages,
    prise:    lignesPriseDeDates,
    aac:      lignesAacCs,
    aprevoir: lignesAPrevoir,
    anniv:    lignesAnniversaires
  };

  let out = [];
  FAMILLES_BANDEAU.forEach(f => {
    try{
      (calculs[f.cle]() || []).forEach(l => {
        if(!familleVisible(l.famille, l.urgente)) return;
        if(ligneEnSourdine(l.id)) return;
        out.push(l);
      });
    }catch(e){ console.warn('Bandeau — ' + f.cle + ' :', e); }
  });

  /* Ce qui presse en haut, et l'ordre des familles ensuite : le
     regard descend, il doit rencontrer le plus urgent d'abord. */
  const rang = {};
  FAMILLES_BANDEAU.forEach((f, i) => { rang[f.cle] = i; });
  out.sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0) ||
                     rang[a.famille] - rang[b.famille]);
  return out;
}


/* ============================================================
   LE DESSIN
   ============================================================ */

function dessinerBandeau(){
  const zone = document.getElementById('bandeauJour');
  if(!zone) return;
  zone.innerHTML = '';

  if(!bandeauPret) return;

  const lignes = lignesDuBandeau();

  /* RIEN À DIRE : IL DISPARAÎT. Pas de « ✅ rien aujourd'hui » — un
     bandeau qui est là tous les jours devient un décor, et on cesse
     de le lire. C'est sa disparition qui lui donne son poids. */
  if(!lignes.length){
    zone.style.display = 'none';
    return;
  }
  zone.style.display = '';

  const urgent = lignes.some(l => l.urgente);
  const reduit = !!lireReglageBandeau(CLE_BANDEAU_REDUIT, false);

  /* ⚠️ LE FOND NE CRIE PAS, LE TEXTE SI.

     « Trop agressif, le fond rouge. » Il l'était : dès qu'une seule
     ligne était en retard, tout le bandeau passait en rouge pâle —
     et il l'aurait été presque tous les matins. Une nappe rouge
     quotidienne ne veut plus rien dire au bout de trois jours, et
     elle fatigue au lieu de prévenir.

     Le fond est donc TOUJOURS le même crème, un ton plus foncé que
     la page pour se détacher. Ce qui presse se voit là où c'est
     vrai : sur la ligne concernée, en gras et en rouge, et sur le
     liseré de gauche. */
  const teinte = { bord: urgent ? 'var(--red)' : 'var(--orange)',
                   fond: 'var(--bandeau-bg)' };

  if(reduit){
    zone.appendChild(bandeauReduit(lignes.length, teinte));
    return;
  }

  const b = document.createElement('div');
  b.style.cssText = 'border:1px solid var(--line);border-left:3px solid ' +
    teinte.bord + ';border-radius:12px;background:' + teinte.fond + ';' +
    'padding:10px 12px;margin-bottom:10px;';

  b.appendChild(enteteBandeau(lignes.length));
  lignes.forEach((l, i) => b.appendChild(ligneBandeau(l, i > 0)));
  zone.appendChild(b);
}

function bandeauReduit(combien, teinte){
  const p = document.createElement('button');
  p.className = 'btn btn-secondary';
  p.style.cssText = 'width:auto;margin:0 0 10px;padding:7px 13px;font-size:13px;' +
    'border-radius:999px;display:flex;align-items:center;gap:9px;' +
    'border-color:' + teinte.bord + ';background:' + teinte.fond + ';';
  p.innerHTML = '<span>⚠️</span><span>' + combien + ' chose' +
    (combien > 1 ? 's' : '') + ' à voir aujourd\'hui</span>' +
    '<span style="background:var(--orange);color:var(--navy-deep);' +
    'font-weight:700;border-radius:999px;padding:1px 8px;font-size:12px;">' +
    combien + '</span><span style="font-size:11px;">▾</span>';
  p.addEventListener('click', () => {
    ecrireReglageBandeau(CLE_BANDEAU_REDUIT, false);
    dessinerBandeau();
  });
  return p;
}

function enteteBandeau(combien){
  const t = document.createElement('div');
  t.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12px;' +
    'color:var(--muted);padding-bottom:6px;margin-bottom:2px;' +
    'border-bottom:1px solid var(--line);';

  const titre = document.createElement('div');
  titre.style.cssText = 'flex:1;font-weight:700;font-size:13px;color:var(--cream);';
  titre.textContent = combien + ' chose' + (combien > 1 ? 's' : '') +
    ' à voir aujourd\'hui';
  t.appendChild(titre);

  const reg = document.createElement('button');
  reg.className = 'btn btn-secondary';
  reg.style.cssText = 'width:auto;margin:0;padding:3px 9px;font-size:11px;' +
    'border-radius:999px;';
  reg.textContent = '⚙️';
  reg.title = 'Choisir ce qui s\'affiche ici';
  reg.addEventListener('click', ouvrirReglageBandeau);
  t.appendChild(reg);

  const red = document.createElement('button');
  red.className = 'btn btn-secondary';
  red.style.cssText = 'width:auto;margin:0;padding:3px 9px;font-size:11px;' +
    'border-radius:999px;';
  red.textContent = '▴';
  red.title = 'Réduire';
  red.addEventListener('click', () => {
    ecrireReglageBandeau(CLE_BANDEAU_REDUIT, true);
    dessinerBandeau();
  });
  t.appendChild(red);

  return t;
}

function ligneBandeau(l, avecTrait){
  const d = document.createElement('div');
  d.style.cssText = 'display:flex;gap:9px;align-items:flex-start;padding:5px 0;' +
    (avecTrait ? 'border-top:1px dashed var(--line);margin-top:3px;padding-top:7px;' : '');

  const puce = document.createElement('span');
  puce.style.cssText = 'flex-shrink:0;';
  puce.textContent = l.emoji;
  d.appendChild(puce);

  const txt = document.createElement('div');
  txt.style.cssText = 'flex:1;min-width:0;font-size:13px;line-height:1.5;' +
    (l.ou ? 'cursor:pointer;' : '');
  txt.innerHTML = '<div style="font-weight:' + (l.urgente ? '800' : '600') + ';' +
      (l.urgente ? 'color:var(--warn-text);' : '') + '">' +
      echapper(l.texte) + '</div>' +
    (l.sous ? '<div style="font-size:12px;color:var(--muted);">' +
      echapper(l.sous) + '</div>' : '');
  if(l.ou) txt.addEventListener('click', () => allerDepuisBandeau(l));
  d.appendChild(txt);

  if(l.croix){
    const x = document.createElement('button');
    x.className = 'btn btn-secondary';
    x.style.cssText = 'width:auto;margin:0;padding:2px 8px;font-size:11px;' +
      'border-radius:999px;flex-shrink:0;';
    x.textContent = '✕';
    x.title = (l.croix === 'notif')
      ? 'Barrer : prévenu, plus rien à faire ici'
      : "Ne plus l'afficher aujourd'hui";
    x.addEventListener('click', e => {
      e.stopPropagation();
      barrerLigneBandeau(l, x);
    });
    d.appendChild(x);
  }

  return d;
}

/* Le bandeau n'agit jamais lui-même : il emmène sur l'écran qui
   règle la chose. */
function allerDepuisBandeau(l){
  try{
    if(l.eleve && typeof ouvrirPageEleve === 'function'){
      ouvrirPageEleve(l.eleve);
      return;
    }
    if(!l.ou) return;
    if(typeof afficherOnglet === 'function') afficherOnglet(l.ou[0]);
    if(typeof afficherVue === 'function') afficherVue(l.ou[0], l.ou[1]);
  }catch(e){ console.warn('Bandeau — aller :', e); }
}

async function barrerLigneBandeau(l, bouton){
  if(l.croix === 'notif'){
    /* La MÊME action que 🔔 Alertes : masquer une alerte s'écrit à
       un seul endroit, et se défait au même endroit. */
    bouton.disabled = true;
    try{
      await appelPrep({ action: 'notifMasquer', eleve: l.croixEleve,
                        type: l.croixType, par: ACCES.moniteur || '' });
      if(typeof chargerNotifsMasquees === 'function') await chargerNotifsMasquees(true);
      showToast('Barré ✅ — réaffichable dans 🔔 Alertes');
    }catch(e){
      showToast('Impossible : ' + (e.message || e));
      bouton.disabled = false;
      return;
    }
  }else{
    mettreEnSourdine(l.id);
  }
  dessinerBandeau();
}


/* ============================================================
   LE MENU — CE QU'ON VEUT VOIR ICI
   ============================================================ */
function ouvrirReglageBandeau(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';

  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(420px, 92vw)';

  const h = document.createElement('h3');
  h.textContent = '⚙️ Ce que je veux voir ici';
  boite.appendChild(h);

  const info = document.createElement('div');
  info.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.55;' +
    'margin-bottom:12px;';
  info.textContent = "Ce réglage n'appartient qu'à toi, et à cet appareil. " +
    "Ce qui est en retard reste affiché même décoché : sinon ce menu " +
    "deviendrait un moyen de ne plus voir ce qui va mal.";
  boite.appendChild(info);

  const eteintes = famillesEteintes().slice();

  FAMILLES_BANDEAU.forEach(f => {
    /* On ne propose que ce que ce compte peut voir : une case pour
       un écran qu'on n'a pas ne veut rien dire. */
    if(f.droit && typeof aDroit === 'function' && !aDroit(f.droit)) return;

    const lab = document.createElement('label');
    lab.style.cssText = 'display:flex;align-items:center;gap:10px;' +
      'text-transform:none;font-size:15px;color:var(--cream);margin:0 0 10px;' +
      (f.reglable ? '' : 'opacity:.6;');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = eteintes.indexOf(f.cle) === -1;
    cb.disabled = !f.reglable;
    cb.style.cssText = 'width:19px;height:19px;flex-shrink:0;';
    cb.addEventListener('change', () => {
      const i = eteintes.indexOf(f.cle);
      if(cb.checked){ if(i !== -1) eteintes.splice(i, 1); }
      else if(i === -1) eteintes.push(f.cle);
      ecrireReglageBandeau(CLE_BANDEAU_FAMILLES, eteintes);
      dessinerBandeau();
    });

    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(f.emoji + ' ' + f.nom +
      (f.reglable ? '' : ' (toujours affiché)')));
    boite.appendChild(lab);
  });

  const rangee = document.createElement('div');
  rangee.className = 'btn-row';
  const ok = document.createElement('button');
  ok.className = 'btn btn-primary';
  ok.textContent = 'Fermer';
  ok.addEventListener('click', () => document.body.removeChild(fond));
  rangee.appendChild(ok);
  boite.appendChild(rangee);

  fond.appendChild(boite);
  document.body.appendChild(fond);
}


/* ============================================================
   LE RÉVEIL — EN FOND, APRÈS LE PREMIER ÉCRAN
   ============================================================ */
async function reveillerBandeau(){
  try{
    /* Les messages épinglés : le seul appel qui soit propre au
       bandeau. Le classeur filtre par destinataire, on ne reçoit
       que les siens. */
    if(typeof chargerMessagesEpingles === 'function'){
      messagesEpingles = await chargerMessagesEpingles();
    }

    /* Les masquages, sinon les alertes barrées hier réapparaissent. */
    if(typeof chargerNotifsMasquees === 'function'){
      await chargerNotifsMasquees();
    }

    /* Ce dont les familles ont besoin, SANS forcer une relecture :
       « verifierAPrevoirEnFond » vient de charger l'état du bureau,
       et les fiches sont là depuis l'ouverture. On se sert de ce
       qui existe. */
    if(typeof chargerBureau === 'function') await chargerBureau(false);
    if(typeof fichesEleves !== 'undefined' && !fichesEleves.length &&
       typeof chargerFiches === 'function'){
      await chargerFiches();
    }

    bandeauPret = true;
    dessinerBandeau();
  }catch(e){
    /* Un bandeau qui n'a pas ses données ne s'affiche pas, et ne
       dit rien : ce n'est pas une panne, c'est une absence. */
    console.warn('Bandeau :', e);
  }
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-bandeau.js'] = true;
