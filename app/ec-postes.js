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
    fait: false
  }));

  posteActif = 0;
  rangerPostes();

  /* La séance est commune : un seul modèle, un seul lieu */
  $('studentName').value = postes[0].eleve;

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

  if(!barre){
    barre = document.createElement('div');
    barre.id = 'barrePostes';
    const ancre = $('recordView') || document.body;
    ancre.insertBefore(barre, ancre.firstChild);
  }

  barre.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;' +
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

  rangerPosteActif();

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


/* Ce qui est à l'écran appartient au poste actif */
function rangerPosteActif(){
  if(posteActif < 0 || posteActif >= postes.length) return;
  const p = postes[posteActif];

  const zt = $('transcriptBox');
  if(zt) p.transcript = zt.value;

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
    afficherBarrePostes();
    informer('Les ' + postes.length + ' bilans sont terminés.\n\n' +
             'Tu peux fermer la séance avec le ✕.', 'Séance à plusieurs');
    return;
  }

  basculerPoste(suivant);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-postes.js'] = true;
