/* ============================================================
   ec-postes.js
   Le simulateur à plusieurs élèves.

   Un moniteur peut suivre jusqu'à quatre postes en même temps.
   Chacun a son bilan, et le moniteur dicte pendant la séance :
   basculer d'un élève à l'autre doit être instantané et ne rien
   perdre.

   Ce qui est commun — la date, le lieu, le moniteur — se saisit
   une fois. Le reste appartient à chaque poste.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les postes ouverts. Chacun garde tout ce qui le concerne :
   sa dictée, son bilan, ses notes. */
let postes = [];
let posteActif = -1;

const POSTES_MAX = 4;
const CLE_POSTES = 'ec_postes_simu';


/* ============================================================
   OUVRIR UNE SÉANCE
   ============================================================ */

function ouvrirSeancePostes(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(480px, 94vw);max-height:88vh;overflow-y:auto;';

  boite.innerHTML = '<h3>🎮 Simulateur à plusieurs</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:14px;' +
      'line-height:1.5;">Chaque élève aura son propre bilan. Tu passes ' +
      'de l\'un à l\'autre pendant la séance, rien ne se perd.</div>';

  const zn = document.createElement('div');
  for(let i = 0; i < POSTES_MAX; i++){
    const l = document.createElement('label');
    l.textContent = 'Poste ' + (i + 1) + (i > 1 ? ' (facultatif)' : '');
    zn.appendChild(l);

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.id = 'psNom' + i;
    inp.setAttribute('list', 'listeEleves');
    inp.autocomplete = 'off';
    inp.placeholder = i < 2 ? 'Son nom' : '—';
    zn.appendChild(inp);
  }
  boite.appendChild(zn);

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bA);

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = '🎮 Commencer';
  bO.addEventListener('click', () => {
    const noms = [];
    for(let i = 0; i < POSTES_MAX; i++){
      const v = boite.querySelector('#psNom' + i).value.trim();
      if(v) noms.push(v);
    }

    if(noms.length < 2){
      showToast('Indique au moins deux élèves.');
      return;
    }

    /* Deux fois le même nom : les bilans se mélangeraient */
    const vus = {};
    for(const n of noms){
      const k = normaliserMot(n);
      if(vus[k]){ showToast(n + ' est saisi deux fois.'); return; }
      vus[k] = true;
    }

    document.body.removeChild(fond);
    demarrerPostes(noms);
  });
  r.appendChild(bO);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#psNom0').focus(), 100);
}


function demarrerPostes(noms){
  postes = noms.map(n => ({
    eleve: n,
    /* Tout ce qui appartient à cet élève seul */
    transcript: '',
    committed: '',
    bilan: '',
    note: '',
    /* Ce qu'il a coché : l'en-tête du cours et la fiche véhicule */
    entete: null,
    fiche: null,
    fait: false
  }));

  posteActif = 0;
  rangerPostes();

  /* La séance est commune : un seul modèle, un seul lieu */
  $('studentName').value = postes[0].eleve;
  retablirEcranPoste(postes[0]);

  afficherBarrePostes();
  showToast(postes.length + ' postes ouverts — dicte pour ' +
            postes[0].eleve);
}


/* ============================================================
   LA BARRE DES POSTES

   Elle reste visible pendant toute la séance : c'est elle qui
   dit sur quel élève on parle.
   ============================================================ */

function afficherBarrePostes(){
  let barre = $('barrePostes');

  if(!postes.length){
    if(barre) barre.style.display = 'none';
    return;
  }

  /* La barre a sa place dans la page, juste au-dessus du micro :
     changer d'élève ne doit pas obliger à remonter l'écran. */
  if(!barre){
    barre = document.createElement('div');
    barre.id = 'barrePostes';
    const bouton = $('recBtn');
    if(bouton && bouton.parentNode){
      bouton.parentNode.insertBefore(barre, bouton);
    }else{
      const ancre = $('recordView') || document.body;
      ancre.insertBefore(barre, ancre.firstChild);
    }
  }

  barre.style.cssText = 'display:flex;gap:6px;margin:14px 0 8px;' +
    'padding:8px;border:1px solid var(--orange);border-radius:12px;' +
    'overflow-x:auto;';
  barre.innerHTML = '';

  postes.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    const actif = (i === posteActif);

    b.style.cssText = 'flex:1;min-width:88px;padding:9px 8px;font-size:13px;' +
      'border-radius:9px;cursor:pointer;line-height:1.3;margin:0;' +
      'border:1px solid ' + (actif ? 'var(--orange)' : 'var(--line)') + ';' +
      'background:' + (actif ? 'var(--orange)' : 'transparent') + ';' +
      'color:' + (actif ? 'var(--navy-deep)' : 'var(--cream)') + ';' +
      (actif ? 'font-weight:800;' : '');

    /* Ce qui a déjà été dit pour cet élève */
    const mots = String(p.committed || p.transcript || '')
      .trim().split(/\s+/).filter(Boolean).length;

    b.innerHTML = (p.fait ? '✅ ' : '') +
      String(p.eleve.split(' ')[0]).replace(/</g, '&lt;') +
      '<div style="font-size:10px;font-weight:400;opacity:.75;">' +
        (p.bilan ? 'bilan prêt' : (mots ? mots + ' mots' : 'rien encore')) +
      '</div>';

    b.addEventListener('click', () => basculerPoste(i));
    barre.appendChild(b);
  });

  /* Fermer la séance */
  const bF = document.createElement('button');
  bF.type = 'button';
  bF.style.cssText = 'width:auto;padding:9px 10px;font-size:14px;margin:0;' +
    'border:1px solid var(--line);border-radius:9px;background:transparent;' +
    'color:var(--muted);cursor:pointer;flex-shrink:0;';
  bF.textContent = '✕';
  bF.title = 'Fermer la séance à plusieurs';
  bF.addEventListener('click', fermerPostes);
  barre.appendChild(bF);

  barre.style.display = 'flex';
}


/* ============================================================
   BASCULER

   Le moment délicat : on range ce qui vient d'être dit sous le
   bon élève avant d'ouvrir le suivant. Le micro continue de
   tourner — c'est ce qui rend la bascule instantanée.
   ============================================================ */

function basculerPoste(i){
  if(i === posteActif || i < 0 || i >= postes.length) return;

  /* Ce qui vient d'être dit appartient à celui qu'on quitte : on
     le range avant tout le reste. */
  rangerPosteActif();

  /* Le micro accumule ses résultats dans une session et la relit
     entièrement à chaque phrase. Sans coupure, l'élève suivant
     héritait de ce qui avait été dit pour le précédent.

     On coupe donc la session ici, et elle repart vierge. */
  couperSessionVocale();

  posteActif = i;
  const p = postes[i];

  /* On remet en place ce qui avait été dit pour lui */
  if(typeof finalTranscript !== 'undefined') finalTranscript = p.transcript || '';
  if(typeof committedTranscript !== 'undefined') committedTranscript = p.committed || '';

  const zt = $('transcriptBox');
  if(zt) zt.value = p.transcript || '';

  const zb = $('resultText');
  if(zb) zb.value = p.bilan || '';

  const zn = $('noteInterne');
  if(zn) zn.value = p.note || '';

  $('studentName').value = p.eleve;

  /* La transcription et les cases du véhicule : elles vivent
     dans la page, pas dans le poste. Sans ce rétablissement,
     elles disparaissaient au changement d'élève. */
  retablirEcranPoste(p);

  /* Le bilan déjà fait se revoit ; sinon on retourne à la dictée */
  if(p.bilan){
    $('recordView').style.display = 'none';
    $('resultView').style.display = 'block';
  }else{
    $('resultView').style.display = 'none';
    $('recordView').style.display = 'block';
  }

  afficherBarrePostes();
  rangerPostes();
  showToast('▶️ ' + p.eleve);
}


/* Coupe la session du micro sans l'éteindre.

   Le navigateur relance de lui-même : c'est le même mécanisme
   que la reprise après un silence, et il est éprouvé. */
function couperSessionVocale(){
  if(typeof recognition === 'undefined' || !recognition) return;
  if(typeof sessionActive !== 'undefined' && !sessionActive) return;

  try{
    /* Le texte acquis est figé avant la coupure : si la relance
       échoue, rien n'est perdu. */
    if(typeof committedTranscript !== 'undefined' &&
       typeof finalTranscript !== 'undefined'){
      const zone = $('transcriptBox');
      committedTranscript = zone ? zone.value.trim() : finalTranscript;
      finalTranscript = committedTranscript;
    }

    /* onend s'exécute APRÈS la bascule, quand la zone affiche
       déjà le nouvel élève : il figerait alors son texte à la
       place de celui qu'on vient de quitter.

       On le neutralise et on relance nous-mêmes. */
    const ancien = recognition.onend;
    recognition.onend = () => {
      recognition.onend = ancien;
      if(typeof sessionActive !== 'undefined') sessionActive = false;
      if(typeof demarrageEnCours !== 'undefined') demarrageEnCours = false;

      /* Le texte du nouvel élève fait autorité pour la suite */
      const z = $('transcriptBox');
      if(z && typeof committedTranscript !== 'undefined'){
        committedTranscript = z.value.trim();
        finalTranscript = committedTranscript;
        if(typeof avantDerniereEcriture !== 'undefined'){
          avantDerniereEcriture = finalTranscript;
        }
      }

      if(typeof relancerMicro === 'function') relancerMicro();
    };

    /* stop() laisse le navigateur finir proprement ; abort()
       perdrait la dernière phrase. */
    recognition.stop();
  }catch(e){ /* le micro se rattrapera au prochain silence */ }
}


/* L'écran, remis dans l'état de cet élève.

   Les cases du véhicule et l'en-tête du cours sont des éléments
   de la page : elles suivent l'élève affiché, pas la séance. */
function retablirEcranPoste(p){
  /* La transcription reste visible dès qu'une séance est ouverte :
     le moniteur dicte pour chacun. */
  const zt = $('transcriptBox');
  if(zt){
    zt.style.display = 'block';
    const aide = $('transcriptAide');
    if(aide) aide.style.display = 'block';
    const cpt = $('compteur');
    if(cpt) cpt.style.display = 'block';
  }

  /* L'en-tête : on le redessine vide, puis on recoche */
  const ze = $('enteteCours');
  if(ze && typeof afficherEnteteDuCours === 'function'){
    ze.innerHTML = '';
    afficherEnteteDuCours();
    if(p.entete){
      ze.querySelectorAll('.entCase').forEach(cb => {
        const k = cb.getAttribute('data-cle');
        if(k && p.entete[k] !== undefined) cb.checked = !!p.entete[k];
      });
    }
  }

  /* La fiche véhicule dépend de l'élève : elle se recharge */
  if(typeof afficherFicheDuCours === 'function'){
    try{ afficherFicheDuCours(); }catch(e){}
  }
}


/* Ce qui est à l'écran appartient au poste actif */
function rangerPosteActif(){
  if(posteActif < 0 || posteActif >= postes.length) return;
  const p = postes[posteActif];

  const zt = $('transcriptBox');
  if(zt) p.transcript = zt.value;

  /* Ce qu'il a coché dans l'en-tête */
  const ze = $('enteteCours');
  if(ze){
    const coches = {};
    ze.querySelectorAll('.entCase').forEach(cb => {
      const k = cb.getAttribute('data-cle');
      if(k) coches[k] = cb.checked;
    });
    if(Object.keys(coches).length) p.entete = coches;
  }

  if(typeof committedTranscript !== 'undefined'){
    p.committed = committedTranscript;
  }

  const zb = $('resultText');
  if(zb && zb.value) p.bilan = zb.value;

  const zn = $('noteInterne');
  if(zn) p.note = zn.value;
}


/* ============================================================
   GARDER ET REPRENDRE

   Une coupure pendant une séance à quatre coûterait cher : on
   garde tout, tout le temps.
   ============================================================ */

function rangerPostes(){
  try{
    localStorage.setItem(CLE_POSTES, JSON.stringify({
      ts: Date.now(),
      actif: posteActif,
      modele: $('modele') ? $('modele').value : '',
      moniteur: $('monitorName') ? $('monitorName').value : '',
      site: $('site') ? $('site').value : '',
      date: $('lessonDate') ? $('lessonDate').value : '',
      postes: postes
    }));
  }catch(e){ /* stockage plein */ }
}


function postesEnCours(){
  try{
    const d = JSON.parse(localStorage.getItem(CLE_POSTES) || 'null');
    if(!d || !d.postes || !d.postes.length) return null;
    /* Au-delà d'une journée, ce n'est plus la séance en cours */
    if(Date.now() - (d.ts || 0) > 24 * 3600 * 1000) return null;
    return d;
  }catch(e){ return null; }
}


function reprendrePostes(d){
  if(!d) return;

  postes = d.postes || [];
  posteActif = Number(d.actif) || 0;

  if(d.modele && $('modele')){
    $('modele').value = d.modele;
    if(typeof adapterAuModele === 'function') adapterAuModele();
  }
  if(d.moniteur && $('monitorName')) $('monitorName').value = d.moniteur;
  if(d.site && $('site')) $('site').value = d.site;
  if(d.date && $('lessonDate')) $('lessonDate').value = d.date;

  /* On rouvre sur le poste où l'on s'était arrêté */
  const i = posteActif;
  posteActif = -1;
  basculerPoste(i);

  showToast('Séance retrouvée — ' + postes.length + ' postes ✅');
}


function fermerPostes(){
  const restants = postes.filter(p => !p.fait && (p.transcript || p.bilan));

  const finir = () => {
    postes = [];
    posteActif = -1;
    try{ localStorage.removeItem(CLE_POSTES); }catch(e){}
    afficherBarrePostes();
    showToast('Séance fermée');
  };

  if(!restants.length){ finir(); return; }

  confirmer('Fermer la séance ?\n\n' +
    restants.length + ' bilan(s) non terminé(s) : ' +
    restants.map(p => p.eleve).join(', ') + '.\n' +
    'Ce qui a été dicté sera perdu.', 'Séance à plusieurs', true)
    .then(ok => { if(ok) finir(); });
}


/* Marque le poste actif comme terminé, une fois son bilan envoyé */
function posteTermine(){
  if(posteActif < 0 || posteActif >= postes.length) return;

  rangerPosteActif();
  postes[posteActif].fait = true;
  rangerPostes();

  /* On enchaîne sur le premier qui n'est pas fini */
  const suivant = postes.findIndex(p => !p.fait);

  if(suivant === -1){
    /* Tout est fait : la séance se ferme seule, un geste de moins */
    const n = postes.length;
    const noms = postes.map(p => p.eleve.split(' ')[0]).join(', ');

    postes = [];
    posteActif = -1;
    try{ localStorage.removeItem(CLE_POSTES); }catch(e){}
    afficherBarrePostes();

    showToast('✅ Les ' + n + ' bilans sont partis — ' + noms);
    return;
  }

  basculerPoste(suivant);
}



/* ============================================================
   LES COURS QUI SE FONT ENSEMBLE

   Trois élèves sur simulateur à la même heure : c'est une seule
   séance. On le propose, sans l'imposer — et on peut en retirer
   un qui n'y était pas.
   ============================================================ */

const CLE_GROUPES = 'ec_groupes_simu';


/* Ce que le moniteur a défait : on ne le lui repropose plus */
function groupesDefaits(){
  try{
    const l = JSON.parse(localStorage.getItem(CLE_GROUPES) || '{}');
    return (l && typeof l === 'object') ? l : {};
  }catch(e){ return {}; }
}

function marquerGroupeDefait(cle, quoi){
  const g = groupesDefaits();
  g[cle] = quoi;
  try{ localStorage.setItem(CLE_GROUPES, JSON.stringify(g)); }catch(e){}
}


/* La clé d'une séance : même jour, même heure, même moniteur */
function cleSeance(cours){
  const h = (typeof heureDeLaPreparation === 'function')
    ? heureDeLaPreparation(cours) : '';
  if(!h) return '';
  if(!/^simu/.test(String(cours.modele || ''))) return '';
  return [cours.date, h, normaliserMot(cours.moniteur || '')].join('|');
}


/* Les groupes qu'on peut proposer dans une liste de cours */
function groupesDeSimulateur(liste){
  const par = {};

  (liste || []).forEach(c => {
    const cle = cleSeance(c);
    if(!cle) return;
    (par[cle] = par[cle] || []).push(c);
  });

  const defaits = groupesDefaits();
  const out = [];

  Object.keys(par).forEach(cle => {
    const g = par[cle];
    if(g.length < 2) return;

    /* Ceux que le moniteur a sortis du groupe */
    const sortis = (defaits[cle] || '').split(',').filter(Boolean);
    const retenus = g.filter(c =>
      sortis.indexOf(normaliserMot(c.eleve || '')) === -1);

    if(retenus.length < 2) return;
    out.push({ cle: cle, cours: retenus, tous: g });
  });

  return out;
}


/* Le bandeau proposé au-dessus d'un groupe */
function bandeauGroupe(g){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--orange);border-radius:11px;' +
    'padding:10px 12px;margin-bottom:8px;';

  const h = (typeof heureDeLaPreparation === 'function')
    ? heureDeLaPreparation(g.cours[0]) : '';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;line-height:1.5;margin-bottom:9px;';
  t.innerHTML = '<strong>🎮 ' + g.cours.length + ' cours de simulateur' +
    (h ? ' à ' + h.replace(':', 'h') : '') + '</strong>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      g.cours.map(c => String(c.eleve).replace(/</g, '&lt;')).join(' · ') +
    '</div>';
  d.appendChild(t);

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;';

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.style.cssText = 'flex:1;padding:10px;font-size:13px;margin:0;';
  bO.textContent = '🎮 Les faire ensemble';
  bO.addEventListener('click', () => ouvrirGroupe(g));
  r.appendChild(bO);

  /* En sortir un : le groupe s'est trompé */
  if(g.cours.length > 2 || g.tous.length > g.cours.length){
    const bS = document.createElement('button');
    bS.className = 'btn btn-secondary';
    bS.style.cssText = 'width:auto;padding:10px 12px;font-size:12px;margin:0;';
    bS.textContent = '✏️';
    bS.title = 'Choisir qui en fait partie';
    bS.addEventListener('click', () => modifierGroupe(g));
    r.appendChild(bS);
  }

  d.appendChild(r);
  return d;
}


/* Ouvre la séance avec les onglets déjà prêts */
function ouvrirGroupe(g){
  /* Le cours porte le modèle et le lieu : on les reprend */
  const premier = g.cours[0];

  if($('modele') && premier.modele){
    $('modele').value = premier.modele;
    if(typeof adapterAuModele === 'function') adapterAuModele();
  }
  if($('lessonDate') && premier.date) $('lessonDate').value = premier.date;
  if($('site') && premier.site) $('site').value = premier.site;
  if($('monitorName') && premier.moniteur){
    $('monitorName').value = premier.moniteur;
  }

  demarrerPostes(g.cours.map(c => c.eleve));

  /* Chaque poste garde sa préparation : c'est elle qui porte la
     frise et les consignes de cet élève. */
  g.cours.forEach((c, i) => {
    if(postes[i]) postes[i].preparation = c.id || '';
  });
  rangerPostes();

  if(typeof allerAuCours === 'function') allerAuCours();
  else if(typeof afficherOnglet === 'function') afficherOnglet('cours');

  showToast('Séance ouverte — ' + g.cours.length + ' élèves');
}


/* Choisir qui fait partie du groupe */
function modifierGroupe(g){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(420px, 94vw)';

  boite.innerHTML = '<h3>🎮 Qui fait partie de la séance ?</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
      'line-height:1.5;">Décoche celui qui n\'était pas sur le ' +
      'simulateur en même temps.</div>';

  const cases = [];
  g.tous.forEach(c => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:10px;' +
      'text-transform:none;font-size:15px;color:var(--cream);margin:0 0 9px;' +
      'font-weight:400;';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = g.cours.some(x =>
      normaliserMot(x.eleve) === normaliserMot(c.eleve));
    cb.style.cssText = 'width:19px;height:19px;flex-shrink:0;margin:0;';
    l.appendChild(cb);

    const s = document.createElement('span');
    s.style.cssText = 'flex:1;min-width:0;';
    s.textContent = c.eleve;
    l.appendChild(s);

    boite.appendChild(l);
    cases.push({ cb: cb, cours: c });
  });

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bA);

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = 'Valider';
  bO.addEventListener('click', () => {
    const sortis = cases.filter(x => !x.cb.checked)
      .map(x => normaliserMot(x.cours.eleve));

    marquerGroupeDefait(g.cle, sortis.join(','));
    document.body.removeChild(fond);

    if(typeof afficherPrepares === 'function') afficherPrepares();
    showToast('Séance mise à jour ✅');
  });
  r.appendChild(bO);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-postes.js'] = true;
