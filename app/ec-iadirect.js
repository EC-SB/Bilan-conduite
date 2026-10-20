/* Déployé le 20/10/2026 à 12:49 — v1211 */
/* ============================================================
   ec-iadirect.js
   🤖 L'IA AU FIL DE L'EAU, ET LE BILAN QUI NE REVIENT PAS — v1209

   David, le 20 octobre, captures de « Cours non terminés » à l'appui :
   des bilans « génération lancée, jamais aboutie », un moniteur qui
   attend depuis trois heures. La cause : ni le téléphone ni le Worker
   n'avaient de délai, et une réponse perdue en route (réseau coupé
   dans la voiture, téléphone en veille) s'attendait pour toujours.

   Ses choix, sur le schéma « Quand le bilan IA ne revient pas » :
     · un vrai délai maximum, côté téléphone et côté Worker ;
     · la réponse au fil de l'eau (« 1 240 mots écrits… ») ;
     · une relance automatique, une seule fois, avant l'alerte ;
     · l'écran gardé allumé pendant la génération ;
     · au bout de 6 minutes (réglable dans 💸 Coûts IA) : l'alerte,
       « 🔁 Relancer la génération » et « ✍️ Envoyer sans la partie
       IA » — la génération continue en fond pendant ce temps ;
     · le bureau prévenu (la boîte du bureau seulement) ;
     · sans IA : le bilan habituel, le moniteur coche les rubriques
       qu'il remplit à la main ; la dictée reste gardée pour refaire
       le bilan avec l'IA (v1210, « REFAIRE AVEC L'IA » plus bas) ;
     · les durées mesurées, pour régler le seuil sur des chiffres.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Au fil de l'eau, l'IA donne signe de vie toutes les quelques
   secondes. Une minute et demie sans rien : la connexion est morte. */
const IA_SILENCE_MAX = 90 * 1000;
/* Revenu sur l'application après une coupure : vingt secondes sans
   rien, c'est que la connexion n'a pas survécu à la veille. */
const IA_SILENCE_AU_RETOUR = 20 * 1000;

/* Les appels en cours, pour la vérification au retour */
const fluxIAEnCours = new Set();

function erreurIA(message, o){
  const e = new Error(message);
  Object.assign(e, o || {});
  return e;
}

/* « 1 min 40 », « 45 s », « 6 min » */
function dureeLisibleIA(secondes){
  const s = Math.max(0, Math.round(Number(secondes) || 0));
  if(s < 60) return s + ' s';
  const m = Math.floor(s / 60), r = s % 60;
  return m + ' min' + (r ? ' ' + String(r).padStart(2, '0') : '');
}

/* ============================================================
   L'APPEL, AU FIL DE L'EAU

   Rend la même chose qu'avant — { content, stop_reason, usage } —
   pour que les appelants n'aient rien à changer. En plus : un délai
   de silence, l'abandon sur demande (relance, envoi sans IA), et le
   texte reçu à mesure (« surTexte »).
   ============================================================ */
async function appelIAFlux(corps, o){
  o = o || {};
  const ctrl = new AbortController();
  const signalExterieur = o.signal || (generationIA && !generationIA.finie && generationIA.ctrl ? generationIA.ctrl.signal : null);
  let pourquoi = '';
  const couper = raison => { if(!pourquoi) pourquoi = raison; try{ ctrl.abort(); }catch(e){} };
  if(signalExterieur){
    if(signalExterieur.aborted) throw erreurIA('Génération annulée', { annule: true });
    signalExterieur.addEventListener('abort', () => couper('annule'), { once: true });
  }
  const suivi = { dernier: Date.now(), couper: couper };
  fluxIAEnCours.add(suivi);
  const silenceMax = o.silenceMax || IA_SILENCE_MAX;
  let veille = setInterval(() => {
    if(Date.now() - suivi.dernier > silenceMax) couper('silence');
  }, Math.min(5000, Math.max(100, Math.round(silenceMax / 3))));
  const fin = () => { clearInterval(veille); fluxIAEnCours.delete(suivi); };
  const raisonEnErreur = e => {
    if(pourquoi === 'annule') return erreurIA('Génération annulée', { annule: true });
    if(pourquoi) return erreurIA(pourquoi === 'retour'
      ? 'La connexion à l\'IA n\'a pas survécu à la mise en veille'
      : 'L\'IA ne répond plus (connexion coupée)', { coupure: true });
    return erreurIA('IA injoignable : ' + ((e && e.message) || e), { coupure: true });
  };

  let r;
  try{
    r = await fetch(CONFIG.IA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({}, corps, { flux: true })),
      signal: ctrl.signal
    });
  }catch(e){ fin(); throw raisonEnErreur(e); }

  if(r.status === 403){
    fin();
    if(typeof verrouiller === 'function') verrouiller('Session expirée, saisis ton code à nouveau.');
    throw erreurIA('Accès refusé — code invalide.');
  }
  if(!r.ok){
    let t = '';
    try{ t = await r.text(); }catch(e){}
    fin();
    let j = null;
    try{ j = JSON.parse(t); }catch(e){}
    throw erreurIA('HTTP ' + r.status + ' — ' + ((j && j.error) || t).toString().slice(0, 300),
                   { coupure: !!(j && j.coupure) || r.status === 504 });
  }

  /* Un Worker d'avant (pas encore déployé) répond d'un bloc : on
     prend sa réponse telle quelle. */
  const type = String(r.headers.get('content-type') || '');
  if(type.indexOf('text/event-stream') === -1){
    try{ const d = await r.json(); fin(); return d; }
    catch(e){ fin(); throw raisonEnErreur(e); }
  }

  const lecteur = r.body.getReader();
  const dec = new TextDecoder();
  let tampon = '', texte = '', stop = null, usage = {}, erreur = null;
  const lire = bloc => {
    let ev = '';
    String(bloc).split('\n').forEach(l => {
      if(l.indexOf('event:') === 0) ev = l.slice(6).trim();
      if(l.indexOf('data:') !== 0) return;
      let d;
      try{ d = JSON.parse(l.slice(5).trim()); }catch(e){ return; }
      if(!d) return;
      if(d.type === 'error' || ev === 'error'){
        erreur = d.error || d;
        return;
      }
      if(d.type === 'message_start' && d.message && d.message.usage) Object.assign(usage, d.message.usage);
      if(d.type === 'content_block_delta' && d.delta && d.delta.type === 'text_delta'){
        texte += d.delta.text || '';
        if(o.surTexte) try{ o.surTexte(texte); }catch(e){}
      }
      if(d.type === 'message_delta'){
        if(d.delta && d.delta.stop_reason) stop = d.delta.stop_reason;
        if(d.usage) Object.assign(usage, d.usage);
      }
    });
  };
  try{
    while(true){
      const { value, done } = await lecteur.read();
      if(done) break;
      suivi.dernier = Date.now();
      tampon += dec.decode(value, { stream: true });
      let i;
      while((i = tampon.indexOf('\n\n')) !== -1){
        lire(tampon.slice(0, i));
        tampon = tampon.slice(i + 2);
      }
    }
    if(tampon.trim()) lire(tampon);
  }catch(e){
    fin();
    throw raisonEnErreur(e);
  }
  fin();
  if(erreur){
    const coupure = erreur.type === 'coupure' || erreur.type === 'overloaded_error' || erreur.type === 'api_error';
    throw erreurIA(String(erreur.message || erreur.type || 'Erreur de l\'IA'), { coupure: coupure });
  }
  /* La réponse s'est arrêtée sans dire pourquoi : la connexion a
     lâché au milieu. C'est une coupure, pas une réponse. */
  if(!stop) throw erreurIA('La réponse de l\'IA s\'est arrêtée en route', { coupure: true });
  return { type: 'message', content: [{ type: 'text', text: texte }], stop_reason: stop, usage: usage };
}

/* Revenu sur l'application : un appel muet depuis plus de vingt
   secondes n'a pas survécu à la veille — on le coupe, il sera relancé
   (le moniteur l'avait lu : « il se relancera à ton retour »). */
document.addEventListener('visibilitychange', () => {
  if(document.hidden) return;
  if(generationIA && !generationIA.finie && typeof garderEcranAllume === 'function') garderEcranAllume();
  fluxIAEnCours.forEach(f => {
    if(Date.now() - f.dernier > IA_SILENCE_AU_RETOUR) f.couper('retour');
  });
});

/* ============================================================
   LE SEUIL ET LE TEMPS HABITUEL
   ============================================================ */
let reglagesIA = { seuil: 6, habituel: 0, lu: 0 };
try{
  const m = JSON.parse(localStorage.getItem('ec_reglages_ia') || 'null');
  if(m && m.seuil) reglagesIA = Object.assign(reglagesIA, m, { lu: 0 });
}catch(e){}
async function chargerReglagesIA(force){
  if(!force && Date.now() - reglagesIA.lu < 10 * 60 * 1000) return reglagesIA;
  try{
    const r = await appelPrep({ action: 'iaReglagesLire' });
    if(r && r.status === 'ok'){
      reglagesIA = { seuil: parseInt(r.seuil, 10) || 6, habituel: parseInt(r.habituel, 10) || 0, lu: Date.now() };
      try{ localStorage.setItem('ec_reglages_ia', JSON.stringify(reglagesIA)); }catch(e){}
    }
  }catch(e){ /* hors ligne : on garde le dernier connu */ }
  return reglagesIA;
}

/* ============================================================
   LA GÉNÉRATION SURVEILLÉE

   Une génération = du « Terminer » au bilan affiché, avec ses
   relances. Elle porte un jeton : une génération remplacée (relance,
   envoi sans IA) ne touche plus à l'écran, même si elle finit.
   ============================================================ */
let generationIA = null;

function commencerGenerationIA(info){
  const avant = generationIA;
  const g = {
    jeton: Date.now() + Math.random(),
    debut: (avant && !avant.finie && avant.eleve === info.eleve) ? avant.debut : Date.now(),
    debutEssai: Date.now(),
    relances: (avant && !avant.finie && avant.eleve === info.eleve) ? avant.relances : 0,
    eleve: info.eleve || '', quoi: info.quoi || '', modele: info.modele || '',
    ctrl: new AbortController(), finie: false, alerte: false, bureauPrevenu: avant && !avant.finie && avant.eleve === info.eleve ? avant.bureauPrevenu : false,
    mots: 0, minuteur: null
  };
  if(avant && !avant.finie){ avant.finie = true; clearInterval(avant.minuteur); }
  generationIA = g;
  chargerReglagesIA().then(() => majChronoGeneration());
  if(typeof garderEcranAllume === 'function') garderEcranAllume();
  const e = $('genEcran');
  if(e){
    e.style.display = 'block';
    e.textContent = '📴 Laisse l’écran allumé : le bilan s’écrit. Si tu changes d’application, il se relancera à ton retour.';
  }
  const a = $('genAlerte');
  if(a){ a.style.display = 'none'; a.innerHTML = ''; }
  g.minuteur = setInterval(() => majChronoGeneration(), 1000);
  majChronoGeneration();
  return g;
}

/* Une génération remplacée ne touche plus à rien */
function generationToujoursActive(g){
  return !!(g && generationIA === g && !g.finie);
}
function verifierGenerationIA(g){
  if(g && !generationToujoursActive(g)) throw erreurIA('Génération remplacée', { annule: true });
}

function noterMotsGeneration(texte){
  const g = generationIA;
  if(!g || g.finie) return;
  g.mots = String(texte || '').split(/\s+/).filter(Boolean).length;
  const p = $('progressionGen');
  if(p && g.phase) p.innerHTML = echIA(g.phase) +
    ' <span style="font-weight:400;color:var(--muted);">· ' + g.mots.toLocaleString('fr-FR') + ' mots écrits</span>';
}
function phaseGeneration(texte){
  const g = generationIA;
  if(g && !g.finie){ g.phase = texte; g.mots = 0; }
  const p = $('progressionGen');
  if(p) p.textContent = texte;
}
const echIA = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function majChronoGeneration(){
  const g = generationIA;
  if(!g || g.finie) return;
  const ecoule = Math.round((Date.now() - g.debut) / 1000);
  const aide = $('genAide');
  if(aide){
    aide.textContent = '⏱️ ' + dureeLisibleIA(ecoule) +
      (reglagesIA.habituel ? ' · d’habitude ' + dureeLisibleIA(reglagesIA.habituel) : '');
  }
  const seuil = (reglagesIA.seuil || 6) * 60;
  if(!g.alerte && (Date.now() - g.debutEssai) / 1000 >= seuil) alerteGenerationIA(g);
}

/* Le seuil est passé : le moniteur choisit, le bureau le sait. La
   génération, elle, continue — si elle aboutit, le bilan s'affiche. */
function alerteGenerationIA(g){
  g.alerte = true;
  const min = reglagesIA.seuil || 6;
  if(!g.bureauPrevenu){
    g.bureauPrevenu = true;
    appelPrep({ action: 'iaAlerteBureau', eleve: g.eleve, modele: g.quoi, minutes: min }).catch(() => {});
  }
  /* Le moniteur est passé à un autre cours : la bannière le dit */
  if(typeof bilansEnFond !== 'undefined' && Array.isArray(bilansEnFond)){
    const b = bilansEnFond.find(x => normaliserMot(x.eleve) === normaliserMot(g.eleve) && !x.bilan && !x.erreur);
    if(b){ b.lent = min; if(typeof afficherBilansEnFond === 'function') afficherBilansEnFond(); }
  }
  const a = $('genAlerte');
  if(!a) return;
  a.style.display = 'block';
  a.innerHTML = '<div style="font-weight:800;color:var(--warn-text);font-size:14px;">⚠️ Le bilan n’est pas revenu après ' + min + ' minutes</div>' +
    '<div style="font-size:12.5px;line-height:1.5;margin:4px 0 10px;color:var(--soft);">' +
      (g.relances ? 'Déjà relancé une fois. ' : '') +
      'Il continue de s’écrire en fond : s’il arrive, il s’affiche tout seul. Le bureau est prévenu.</div>' +
    '<button type="button" class="btn btn-secondary" id="genRelancer" style="margin:0 0 8px;padding:12px;font-size:14px;">🔁 Relancer la génération</button>' +
    '<button type="button" class="btn btn-primary" id="genSansIA" style="margin:0;padding:12px;font-size:14px;">✍️ Envoyer sans la partie IA</button>';
  $('genRelancer').addEventListener('click', relancerGenerationIA);
  $('genSansIA').addEventListener('click', envoyerSansIA);
}

/* La fin, quelle qu'elle soit : la durée part au Worker */
function finirGenerationIA(g, issue){
  if(!g || g.finie) return;
  g.finie = true;
  clearInterval(g.minuteur);
  const e = $('genEcran'); if(e) e.style.display = 'none';
  const a = $('genAlerte'); if(a){ a.style.display = 'none'; a.innerHTML = ''; }
  const aide = $('genAide'); if(aide) aide.textContent = 'Un cours de 2h prend environ une minute.';
  /* L'écran se libère — sauf si un cours a repris derrière */
  if(typeof libererEcran === 'function' && !(typeof isRecording !== 'undefined' && isRecording) &&
     !((typeof trajetEnCours === 'function') && trajetEnCours())) libererEcran();
  appelPrep({ action: 'iaGenerationNoter', issue: issue, quoi: g.quoi, relances: g.relances,
              duree: Math.round((Date.now() - g.debut) / 1000) }).catch(() => {});
}

/* 🔁 Relancer : la même dictée, de zéro. L'ancienne s'arrête. */
function relancerGenerationIA(){
  const g = generationIA;
  if(!g || g.finie) return;
  g.relances++;
  g.relanceManuelle = true;
  const ancienne = g.ctrl;
  /* La nouvelle reprend le compte (début, relances, bureau prévenu) */
  g.remplacee = true;
  try{ ancienne.abort(); }catch(e){}
  showToast('🔁 Nouvelle génération lancée');
  if(typeof lancerLaGeneration === 'function') lancerLaGeneration();
}

/* ============================================================
   ✍️ ENVOYER SANS LA PARTIE IA

   L'écran « ✍️ Bilan à remplir à la main », réduit aux rubriques que
   l'IA remplit. Rien de coché au départ ; chaque rubrique cochée
   s'ouvre, avec son 🎙️. « 📄 Composer le bilan » compose le bilan
   HABITUEL du modèle — en-tête, dictée en clair, procédures, trajet,
   signature — avec ce qu'il a rempli, à la place où l'IA l'aurait mis.
   ============================================================ */
const TYPES_HORS_SANS_IA = ['titre', 'sousTitre', 'entete', 'envoiAvant', 'rappelFrise', 'apercuNiveau', 'apercuEval',
                            'photo', 'nonMene', 'nombreEval'];
let sansIA = null;

function rubriquesSansIA(modele){
  const champs = (typeof CHAMPS_MANUELS !== 'undefined' && modele && CHAMPS_MANUELS[modele.schema]) || [];
  const entete = (typeof enteteDuCours === 'function') ? enteteDuCours() : {};
  return champs.filter(c => c && TYPES_HORS_SANS_IA.indexOf(c.type) === -1 && c.cle !== 'texteDicte' &&
    c.cle !== 'examenBlancFait' && !c.siEb && String(c.cle).indexOf('examenBlanc.') !== 0 &&
    !Object.prototype.hasOwnProperty.call(entete, c.cle));
}

async function envoyerSansIA(){
  const g = generationIA;
  const ok = await confirmer('Envoyer le bilan sans la partie IA ?\n\n' +
    'La génération s’arrête. Le bilan part dans sa forme habituelle, avec ta dictée en clair ; ' +
    'tu choisis les rubriques que tu remplis à la main. La dictée reste gardée : le bilan pourra être refait avec l’IA.', 'Continuer');
  if(!ok) return;
  if(g && !g.finie){
    try{ g.ctrl.abort(); }catch(e){}
    finirGenerationIA(g, 'sans-ia');
  }
  if(typeof surFinGeneration === 'function') surFinGeneration();
  ouvrirSansIA();
}

function ouvrirSansIA(){
  const modeleCle = $('modele').value;
  const modele = MODELES[modeleCle];
  const rubriques = rubriquesSansIA(modele);
  sansIA = { modeleCle: modeleCle, rubriques: rubriques };
  window.sansIAEnCours = true;
  champsManuels = {};
  if(typeof prefixeExamenBlanc !== 'undefined') prefixeExamenBlanc = '';

  const v = $('manuelView');
  v.querySelector('.section-title').textContent = '✍️ Bilan sans la partie IA';
  $('manuelInfo').innerHTML = echIA(($('studentName').value || '').trim()) + ' · ' + echIA(modele.label) +
    '<br><span style="color:var(--warn-text);">⚠️ L’IA n’a pas répondu : ton bilan part dans sa forme habituelle, avec ta dictée en clair. ' +
    'Les rubriques que l’IA remplit restent vides — sauf celles que tu choisis de remplir ici.</span>';
  /* Ce que l'écran à la main montre d'habitude, et qu'on rend en sortant */
  sansIA.avant = { aide: $('aideManuel').textContent, caches: [] };
  ['mesExamensBloc', 'preparationManuel', 'raccourcisNoteManuel', 'trajetIciManuel'].forEach(id => {
    const x = $(id); if(!x) return;
    sansIA.avant.caches.push([id, x.style.display]);
    x.style.display = 'none';
  });
  $('aideManuel').textContent = rubriques.length
    ? 'Coche ce que tu veux remplir à la main. Le 🎙️ permet de dicter.'
    : 'Ce modèle n’a pas de rubrique à remplir à la main : compose le bilan directement.';

  /* Les rubriques, toutes dessinées, cachées tant qu'elles ne sont pas cochées */
  const zone = $('manuelChamps');
  zone.innerHTML = '';
  zone.style.display = '';
  if(rubriques.length) dessinerChampsManuels(rubriques, zone, modele, (typeof dossierManuel !== 'undefined' && dossierManuel) || { manoeuvres: [], frise: '' });

  let choix = $('sansIAChoix');
  if(choix) choix.remove();
  choix = document.createElement('div');
  choix.id = 'sansIAChoix';
  choix.style.cssText = 'margin-bottom:16px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;';
  const options = [];
  rubriques.forEach(c => {
    if(c.type === 'themes' && typeof THEMES_ERREURS !== 'undefined'){
      THEMES_ERREURS.forEach(t => options.push({ cle: c.cle, theme: t.nom, nom: t.nom }));
    }else{
      options.push({ cle: c.cle, nom: String(c.nom || c.cle).replace(/\s+/g, ' ').trim() });
    }
  });
  choix.innerHTML = rubriques.length ? '<div style="font-size:13px;font-weight:800;margin-bottom:6px;">Ce que tu remplis à la main</div>' : '';
  options.forEach((op, i) => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:9px;margin:0 0 6px;font-size:13.5px;text-transform:none;color:var(--cream);cursor:pointer;';
    l.innerHTML = '<input type="checkbox" data-hors-saisie="1" style="width:18px;height:18px;margin:0;flex-shrink:0;"> <span></span>';
    l.querySelector('span').textContent = op.nom;
    const cb = l.querySelector('input');
    cb.dataset.sansIa = String(i);
    cb.addEventListener('change', () => { l.style.fontWeight = cb.checked ? '700' : '400'; montrerRubriquesSansIA(options); });
    choix.appendChild(l);
  });
  sansIA.options = options;
  zone.before(choix);
  montrerRubriquesSansIA(options);

  /* 📋 v1211 — celles cochées pendant la dictée sont là, cochées */
  if(typeof dessinerProceduresAJoindre === 'function'){
    try{ dessinerProceduresAJoindre('proceduresManuel'); }catch(e){}
  }
  $('generatingView').style.display = 'none';
  $('recordView').style.display = 'none';
  v.style.display = 'block';
  v.scrollIntoView({ block: 'start' });
}

/* Ce qui est coché se voit ; le reste reste caché (et ne part pas) */
function montrerRubriquesSansIA(options){
  const zone = $('manuelChamps');
  const coches = new Set();
  const themes = new Set();
  document.querySelectorAll('#sansIAChoix input[data-sans-ia]').forEach(cb => {
    if(!cb.checked) return;
    const op = options[Number(cb.dataset.sansIa)];
    if(!op) return;
    coches.add(op.cle);
    if(op.theme) themes.add(op.theme);
  });
  zone.querySelectorAll('[data-zone]').forEach(b => {
    b.style.display = coches.has(b.dataset.zone) ? '' : 'none';
  });
  zone.querySelectorAll('.themeErreur').forEach(t => {
    const ligne = t.parentElement && t.parentElement.parentElement;
    if(ligne) ligne.style.display = themes.has(t.dataset.theme) ? '' : 'none';
  });
  /* « Remplis seulement les rubriques utiles » n'a pas de sens ici */
  zone.querySelectorAll('[data-zone] > div').forEach(d => {
    if(/^Remplis seulement/.test(d.textContent.trim()) && !d.children.length) d.style.display = 'none';
  });
  sansIA.coches = coches; sansIA.themes = themes;
}

/* L'écran à la main redevient lui-même, pour la prochaine fiche */
function rendreLEcranALaMain(){
  window.sansIAEnCours = false;
  const s = sansIA;
  const c = $('sansIAChoix'); if(c) c.remove();
  $('manuelChamps').innerHTML = '';
  $('manuelView').style.display = 'none';
  $('manuelView').querySelector('.section-title').textContent = '✍️ Bilan à remplir à la main';
  if(s && s.avant){
    $('aideManuel').textContent = s.avant.aide;
    s.avant.caches.forEach(([id, d]) => { const x = $(id); if(x) x.style.display = d; });
  }
  sansIA = null;
}

function quitterSansIA(){
  rendreLEcranALaMain();
  $('recordView').style.display = 'block';
  showToast('La dictée est toujours là : « Terminer » relance la génération.');
}

/* Les valeurs cochées, rangées comme le constructeur les attend */
function donneesSansIA(){
  const s = sansIA;
  const choisies = s.rubriques.filter(c => s.coches && s.coches.has(c.cle));
  champsManuels = {};
  if(choisies.length) lireChampsManuels(choisies);
  /* Une rubrique d'erreurs décochée ne part pas, même écrite avant */
  choisies.filter(c => c.type === 'themes').forEach(c => {
    const bouts = String(champsManuels[c.cle] || '').split('\n\n').filter(b => s.themes.has(b.split('\n')[0]));
    champsManuels[c.cle] = bouts.join('\n\n');
  });
  const liste = (champsManuels.manoeuvres || []).map(x => x.nom || x);
  const donnees = { manoeuvres: liste };
  if(champsManuels.competences) donnees.competences = champsManuels.competences;
  Object.keys(champsManuels).forEach(k => {
    if(k === 'manoeuvres') return;
    if(k.indexOf('.') === -1){ donnees[k] = champsManuels[k]; return; }
    const chemin = k.split('.');
    let cible = donnees;
    for(let i = 0; i < chemin.length - 1; i++){
      if(!cible[chemin[i]] || typeof cible[chemin[i]] !== 'object') cible[chemin[i]] = {};
      cible = cible[chemin[i]];
    }
    cible[chemin[chemin.length - 1]] = champsManuels[k];
  });
  return donnees;
}

async function composerSansIA(){
  const s = sansIA;
  if(!s) return;
  const modele = MODELES[s.modeleCle];
  const transcript = (typeof finalTranscript !== 'undefined' && finalTranscript) || ($('transcriptBox') && $('transcriptBox').value) || '';
  const donnees = donneesSansIA();
  Object.assign(donnees, (typeof enteteDuCours === 'function') ? enteteDuCours() : {});
  if(typeof examenBlancDuCours === 'function') Object.assign(donnees, examenBlancDuCours());

  /* Les manœuvres déjà faites, comme le bilan généré les reprend */
  let manoeuvresAvant = [], marquesAvant = null;
  const avecFiche = modele.schema === 'conduiteResume' || modele.schema === 'conduiteResumeAuto' || !!(modele.opts && modele.opts.fiche);
  if(avecFiche && typeof bilansAnterieurs === 'function'){
    try{
      const historique = await bilansAnterieurs($('studentName').value.trim());
      marquesAvant = marquesDeLHistorique(historique);
      historique.forEach(item => manoeuvresDejaFaites(item.bilan).forEach(m => { if(manoeuvresAvant.indexOf(m) === -1) manoeuvresAvant.push(m); }));
      BLOC.ficheListeConduite.forEach(m => { if(marquesAvant[normaliserMot(m)] && manoeuvresAvant.indexOf(m) === -1) manoeuvresAvant.push(m); });
    }catch(e){ /* hors ligne : la fiche part sans l'historique */ }
  }

  const aere = (typeof aererTexte === 'function') ? aererTexte(transcript) : transcript;
  let bilan = modele.build(donnees, { manoeuvresAvant: manoeuvresAvant, marquesAvant: marquesAvant,
                                      transcript: aere, note: $('noteInterne').value.trim() });
  if(typeof sansEcoutes === 'function' && sansEcoutes({ note: $('noteInterne').value })) bilan += '\n\n' + rappelEcoutes();
  if(typeof unSeulRappelEcoutes === 'function') bilan = unSeulRappelEcoutes(bilan);
  if(typeof blocProcedures === 'function') bilan += blocProcedures(transcript);
  if(typeof blocTranscription === 'function') bilan += blocTranscription(bilan, aere);
  if(typeof blocTrajet === 'function') bilan += blocTrajet();
  const moniteur = $('monitorName').value.trim();
  if(moniteur) bilan += '\n\n' + moniteur + ' 🚗💨';

  /* Le cours garde la trace : à l'enregistrement, la dictée reste au
     serveur (« envoyé sans IA ») au lieu d'être effacée. */
  if(typeof currentLessonMeta !== 'undefined' && currentLessonMeta) currentLessonMeta.sansIA = true;

  rendreLEcranALaMain();

  $('resultText').value = bilan;
  if(typeof remplirChoixProcedures === 'function') remplirChoixProcedures();
  if(typeof afficherNote === 'function') afficherNote((currentLessonMeta && currentLessonMeta.noteInterne) || $('noteInterne').value.trim());
  if(typeof sauvegarderLocal === 'function') sauvegarderLocal(true);
  $('resultView').style.display = 'block';
  if(typeof remplirListeRecitations === 'function') remplirListeRecitations();
  if(typeof montrerLeTrajetDansLeBilan === 'function') montrerLeTrajetDansLeBilan();
  if(typeof majBoutonCorrection === 'function') majBoutonCorrection();
  window.scrollTo(0, 0);
  showToast('✍️ Bilan composé sans la partie IA — relis-le, puis enregistre');
}

/* À l'enregistrement d'un bilan envoyé sans IA : la dictée reste au
   serveur, marquée, avec le bilan parti. Voir retirerBrouillonServeur. */
function dicteeAGarderSansIA(eleve){
  return !!(typeof currentLessonMeta !== 'undefined' && currentLessonMeta && currentLessonMeta.sansIA &&
            normaliserMot(currentLessonMeta.studentName || '') === normaliserMot(eleve || ''));
}

/* ============================================================
   💸 COÛTS IA — LE TEMPS DES GÉNÉRATIONS
   ============================================================ */
function blocTempsDesGenerations(){
  const b = document.createElement('div');
  b.id = 'tempsGenerations';
  b.style.cssText = 'border:2px solid var(--orange);border-radius:14px;padding:14px 16px;margin:0 0 16px;';
  const admin = typeof ACCES !== 'undefined' && ACCES && ACCES.role === 'admin';
  b.innerHTML = '<div style="font-weight:800;font-size:15px;margin-bottom:8px;">⏱️ Le temps des générations</div>' +
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:14px;">Alerte au moniteur si le bilan n’est pas revenu après ' +
    '<input type="number" id="seuilIA" min="2" max="30" step="1" value="' + (reglagesIA.seuil || 6) + '" style="width:70px;margin:0;text-align:center;"' + (admin ? '' : ' disabled') + '> minutes ' +
    '<span style="color:var(--muted);font-size:12px;">(' + (admin ? 'administrateurs · vaut pour tous les téléphones' : 'réglé par les administrateurs') + ')</span></div>' +
    '<div id="chiffresIA" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;"><div class="empty" style="padding:4px 0;">Chargement…</div></div>' +
    '<div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;">Chaque ligne du détail ci-dessous affiche aussi sa durée. ' +
    'Trop d’alertes alors que les bilans finissent par arriver → monte le seuil.</div>';
  const champ = b.querySelector('#seuilIA');
  if(admin) champ.addEventListener('change', async () => {
    const n = parseInt(champ.value, 10);
    if(!(n >= 2 && n <= 30)){ showToast('Le seuil va de 2 à 30 minutes.'); champ.value = reglagesIA.seuil; return; }
    try{
      const r = await appelPrep({ action: 'iaSeuilPoser', seuil: n });
      if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
      reglagesIA.seuil = n;
      try{ localStorage.setItem('ec_reglages_ia', JSON.stringify(reglagesIA)); }catch(e){}
      showToast('⏱️ Seuil réglé à ' + n + ' minutes');
      chargerTempsDesGenerations();
    }catch(e){ showToast('Impossible : ' + e.message); champ.value = reglagesIA.seuil; }
  });
  chargerReglagesIA(true).then(() => { if(!champ.matches(':focus')) champ.value = reglagesIA.seuil; });
  return b;
}
async function chargerTempsDesGenerations(bornes){
  const z = $('chiffresIA');
  if(!z) return;
  let b = bornes;
  if(!b && typeof bornesDeLaPeriode === 'function' && typeof coutsPeriode !== 'undefined') b = bornesDeLaPeriode(coutsPeriode, coutsDu, coutsAu);
  let r;
  try{ r = await appelPrep({ action: 'iaGenerationsStats', du: (b && b.du) || '', au: (b && b.au) || '' }); }
  catch(e){ z.innerHTML = '<div class="empty" style="padding:4px 0;">Chiffres indisponibles : ' + echIA(e.message) + '</div>'; return; }
  if(!r || r.status !== 'ok'){ z.innerHTML = ''; return; }
  if(!r.n){ z.innerHTML = '<div style="font-size:13px;color:var(--muted);">Aucune génération mesurée sur cette période (la mesure commence avec la v1209).</div>'; return; }
  const cases = [['Temps habituel', dureeLisibleIA(r.habituel)], ['Les plus longues', dureeLisibleIA(r.plusLongue)],
                 ['Au-delà de ' + r.seuil + ' min', String(r.auDela)],
                 ['Échecs sur la période', String(r.echecs) + (r.rattrapees ? ' (' + r.rattrapees + ' rattrapé' + (r.rattrapees > 1 ? 's' : '') + ' par la relance)' : '')],
                 ['Envoyés sans IA', String(r.sansIa)], ['Générations', String(r.n)]];
  z.innerHTML = cases.map(([t, v]) => '<div style="border:1px solid var(--line);border-radius:10px;padding:8px 12px;"><div style="font-size:11.5px;color:var(--muted);">' +
    echIA(t) + '</div><div style="font-weight:800;font-size:16px;">' + echIA(v) + '</div></div>').join('');
}

/* ============================================================
   🤖 REFAIRE AVEC L'IA — v1210 (livraison ②)

   Un bilan parti sans la partie IA garde sa dictée. On la renvoie à
   l'IA — depuis le dossier de l'élève (📚 Cours) ou « Cours non
   terminés » — et le bilan refait REMPLACE celui envoyé sans IA :
   même ligne du classeur, un mail « 📄 Ton bilan complet du cours
   du … », l'historique de l'élève se met à jour.

   Les choix de David : le moniteur du cours, le bureau et les admins
   peuvent le refaire ; si ce n'est pas le moniteur du cours, le bilan
   refait lui part pour relecture (« 📤 Renvoyer à … ») et c'est lui
   qui le renvoie à l'élève. La dictée reste jusqu'au renvoi.
   ============================================================ */
let refaitIA = null;
function refaitIAEnCours(eleve){
  return !!(refaitIA && normaliserMot(refaitIA.eleve || '') === normaliserMot(eleve || ''));
}
function estLeMoniteurDuCours(b){
  return normaliserMot((typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur) || '') === normaliserMot((b && b.moniteur) || '');
}
function jourDuCoursIA(d){
  const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : String(d || '');
}

async function refaireAvecIA(b, ligne){
  if(!b || !String(b.transcript || '').trim()){ showToast('La dictée de ce cours n’est plus là.'); return; }
  const jour = jourDuCoursIA(b.dateCours);
  const moi = estLeMoniteurDuCours(b);
  if(!await confirmer('🤖 Refaire avec l’IA le bilan de ' + b.eleve + (jour ? ' du ' + jour : '') + ' ?\n\n' +
      'La dictée gardée repart à l’IA. ' + (moi
        ? 'Tu relis, tu corriges, puis « 📨 Renvoyer à l’élève » : il remplace le bilan envoyé sans IA.'
        : 'Le bilan refait part ensuite à ' + (b.moniteur || 'son moniteur') + ', qui le relit et le renvoie à l’élève.'), 'Refaire')) return;
  if(typeof reprendreBrouillonServeur === 'function'){
    await reprendreBrouillonServeur(Object.assign({}, b, { etat: 'dictee', fiche: '', bilan: '' }));
  }
  /* Il a préféré garder le cours ouvert : on n'a rien chargé */
  if(normaliserMot(($('studentName') && $('studentName').value) || '') !== normaliserMot(b.eleve || '') ||
     String((typeof finalTranscript !== 'undefined' && finalTranscript) || '') !== String(b.transcript || '')){
    return;
  }
  /* À partir d'ici, plus aucun dépôt automatique : la dictée gardée
     ne doit pas être écrasée (voir deposerBrouillonServeur) */
  refaitIA = { b: b, ligne: ligne || null, eleve: b.eleve, dateCours: b.dateCours, moniteur: b.moniteur };
  if(typeof lancerLaGeneration === 'function') await lancerLaGeneration();
}

/* Le moniteur rouvre un bilan refait par le bureau (« 🤖 refait ») */
function ouvrirRefaitIA(b){
  refaitIA = { b: b, ligne: null, eleve: b.eleve, dateCours: b.dateCours, moniteur: b.moniteur };
  montrerRefaitIA();
}

/* Le bandeau du bilan refait, et lui seul pour finir : pas de
   « Copier, enregistrer » (ce serait un deuxième cours). */
const ACTIONS_HABITUELLES_RESULTAT = ['copyBtn', 'renvoyerMoniteur', 'corrigerBtn', 'corrigerLecon'];
function montrerRefaitIA(){
  const r = refaitIA;
  if(!r) return;
  const carte = $('resultView') && $('resultView').querySelector('.card');
  if(!carte) return;
  let ban = $('refaitBandeau');
  if(!ban){
    ban = document.createElement('div');
    ban.id = 'refaitBandeau';
    ban.style.cssText = 'border:2px solid var(--orange);border-radius:12px;padding:11px 13px;margin-bottom:14px;';
    carte.prepend(ban);
  }
  const moi = estLeMoniteurDuCours(r.b);
  const jour = jourDuCoursIA(r.dateCours);
  ban.innerHTML = '<div style="font-weight:800;font-size:14px;">🤖 Bilan refait avec l’IA — cours du ' + echIA(jour) + '</div>' +
    '<div style="font-size:12.5px;line-height:1.5;color:var(--soft);margin:4px 0 10px;">' + (moi
      ? 'Relis et corrige. « 📨 Renvoyer à l’élève » remplace le bilan envoyé sans IA : un mail lui part, et son historique se met à jour.'
      : 'Relis-le si tu veux. Il part à <b>' + echIA(r.moniteur || 'son moniteur') + '</b> : c’est lui qui le relit et le renvoie à l’élève.') + '</div>' +
    '<button type="button" class="btn btn-primary" id="refaitEnvoyer" style="margin:0 0 8px;padding:12px;font-size:14px;">' +
      (moi ? '📨 Renvoyer à l’élève' : '📤 Renvoyer à ' + echIA(r.moniteur || 'son moniteur') + ' pour correction') + '</button>' +
    '<button type="button" class="btn btn-secondary" id="refaitLaisser" style="margin:0;padding:9px;font-size:12.5px;">Laisser pour plus tard (la dictée reste gardée)</button>';
  $('refaitEnvoyer').addEventListener('click', () => (moi ? renvoyerRefaitALEleve() : renvoyerRefaitAuMoniteur()));
  $('refaitLaisser').addEventListener('click', () => terminerRefaitIA('Le bilan refait n’est pas parti : la dictée reste gardée.'));
  /* Les actions habituelles se cachent le temps du bilan refait */
  if(!r.caches){
    r.caches = [];
    const autres = $('exportSheetsBtn') && $('exportSheetsBtn').closest('details');
    ACTIONS_HABITUELLES_RESULTAT.map(id => $(id)).concat([autres]).forEach(x => {
      if(!x) return;
      r.caches.push([x, x.style.display]);
      x.style.display = 'none';
    });
  }
  window.scrollTo(0, 0);
}

/* Fin du bilan refait (renvoyé ou laissé) : l'écran redevient lui-même */
function terminerRefaitIA(message){
  const r = refaitIA;
  refaitIA = null;
  const ban = $('refaitBandeau'); if(ban) ban.remove();
  if(r && r.caches) r.caches.forEach(([x, d]) => { x.style.display = d; });
  if(typeof marquerExport === 'function') try{ marquerExport(true); }catch(e){}
  if(typeof fermerLeCoursOuvert === 'function') fermerLeCoursOuvert();
  if($('studentName')) $('studentName').value = '';
  if($('transcriptBox')) $('transcriptBox').value = '';
  if(typeof finalTranscript !== 'undefined') finalTranscript = '';
  if(typeof committedTranscript !== 'undefined') committedTranscript = '';
  if($('noteInterne')) $('noteInterne').value = '';
  if($('recordView')) $('recordView').style.display = 'block';
  if(typeof brouillonRepris !== 'undefined') brouillonRepris = null;
  if(message) showToast(message);
}

/* La ligne du cours dans le classeur : connue depuis le dossier, sinon
   cherchée (même élève, même jour, même moniteur ; à défaut, le texte
   envoyé sans IA). */
async function trouverLigneDuCours(r){
  if(r.ligne) return r.ligne;
  let res = [];
  try{
    const d = await appelPrep({ action: 'search', eleve: r.eleve, exact: true, maxi: 60 });
    res = (d && d.resultats) || [];
  }catch(e){ return null; }
  const jour = jourDe(r.dateCours);
  let l = res.filter(x => jourDe(x.date) === jour);
  if(l.length > 1){
    const m = l.filter(x => normaliserMot(x.moniteur || '') === normaliserMot(r.moniteur || ''));
    if(m.length) l = m;
  }
  if(l.length > 1 && r.b && r.b.bilan){
    const t = l.filter(x => String(x.bilan || '').trim() === String(r.b.bilan).trim());
    if(t.length) l = t;
  }
  return l.length ? l[0].ligne : null;
}

async function renvoyerRefaitALEleve(){
  const r = refaitIA;
  if(!r) return;
  const texte = String(($('resultText') && $('resultText').value) || '').trim();
  if(!texte){ showToast('Le bilan est vide.'); return; }
  const jourTxt = (typeof dateEnToutesLettres === 'function') ? (dateEnToutesLettres(r.dateCours) || jourDuCoursIA(r.dateCours)) : jourDuCoursIA(r.dateCours);
  if(!await confirmer('📨 Renvoyer à ' + r.eleve + ' son bilan complet du ' + jourDuCoursIA(r.dateCours) + ' ?\n\n' +
      'Il remplace le bilan envoyé sans IA (dans son historique aussi), et un mail lui part.', 'Renvoyer')) return;
  const bouton = $('refaitEnvoyer');
  if(bouton){ bouton.disabled = true; bouton.textContent = 'Envoi…'; }
  const rendre = () => { if(bouton){ bouton.disabled = false; bouton.textContent = '📨 Renvoyer à l’élève'; } };
  const ligne = await trouverLigneDuCours(r);
  if(!ligne){
    rendre();
    await informer('Le cours du ' + jourDuCoursIA(r.dateCours) + ' de ' + r.eleve + ' est introuvable dans le classeur.\n\n' +
                   'Rien n’a été remplacé ni envoyé : ouvre son dossier (📚 Cours) et refais-le de là.');
    return;
  }
  try{
    const m = await appelPrep({ action: 'bilanMaj', ligne: ligne, eleve: r.eleve, bilan: texte,
                                manoeuvres: (typeof manoeuvresDejaFaites === 'function') ? manoeuvresDejaFaites(texte).join(' | ') : undefined });
    if(!m || m.status === 'error') throw new Error((m && m.message) || 'refusé');
  }catch(e){
    rendre();
    showToast('Bilan non remplacé : ' + e.message);
    return;
  }
  if(typeof viderCaches === 'function') try{ viderCaches(r.eleve); }catch(e){}
  /* La dictée a servi : elle s'en va (c'est le renvoi qui l'efface) */
  try{ await appelPrep(r.b && r.b.id ? { action: 'brouillonDelete', id: r.b.id } : { action: 'brouillonDelete', eleve: r.eleve }); }catch(e){}
  let envoye = 0, echec = '';
  try{
    const pourLui = (typeof bilanPourLEleve === 'function') ? bilanPourLEleve(texte) : texte;
    envoye = await envoyerBilanParMail(r.eleve, r.dateCours,
      '📄 Voici ton bilan complété : il remplace celui reçu le jour du cours.\n\n' + pourLui,
      { sujet: '📄 Ton bilan complet du cours du ' + jourTxt });
  }catch(e){ echec = e.message; }
  const eleve = r.eleve;
  terminerRefaitIA();
  if(echec || !envoye){
    await informer('✅ Le bilan de ' + eleve + ' est remplacé dans son historique.\n\n' +
      '⚠️ Le mail n’est pas parti' + (echec ? ' : ' + echec : '') + '. Renvoie-le depuis son dossier (📚 Cours › ✉️).');
  }else{
    showToast('📨 Bilan complet renvoyé à ' + eleve + ' ✅');
  }
}

async function renvoyerRefaitAuMoniteur(){
  const r = refaitIA;
  if(!r) return;
  const texte = String(($('resultText') && $('resultText').value) || '').trim();
  if(!texte){ showToast('Le bilan est vide.'); return; }
  const bouton = $('refaitEnvoyer');
  if(bouton){ bouton.disabled = true; bouton.textContent = 'Envoi…'; }
  try{
    await deposerBrouillonServeur({ refait: true, pour: r.moniteur, eleve: r.eleve, dateCours: r.dateCours,
      modele: (r.b && r.b.modele) || '', site: (r.b && r.b.site) || '', transcript: (r.b && r.b.transcript) || '',
      note: (r.b && r.b.note) || '', bilan: texte, etat: 'refait' });
    if(typeof envoyerConsigne === 'function'){
      try{ await envoyerConsigne(r.eleve, 'bilan', '🤖 Bilan refait avec l’IA — à relire et renvoyer à l’élève (' + jourDuCoursIA(r.dateCours) + ')'); }catch(e){}
    }
  }catch(e){
    if(bouton){ bouton.disabled = false; bouton.textContent = '📤 Renvoyer à ' + (r.moniteur || 'son moniteur') + ' pour correction'; }
    showToast('Impossible : ' + e.message);
    return;
  }
  terminerRefaitIA('📤 Parti chez ' + (r.moniteur || 'son moniteur') + ' pour relecture ✅');
}

/* Le dossier de l'élève (📚 Cours) : les bilans partis sans IA le
   disent, avec « 🤖 Refaire avec l'IA » */
async function decorerCoursSansIA(lignes, items, eleve){
  if(!lignes || !lignes.length) return;
  let d;
  try{ d = await appelPrep({ action: 'brouillonsSansIa', eleve: eleve }); }catch(e){ return; }
  const gardees = (d && d.brouillons) || [];
  if(!gardees.length) return;
  items.forEach((it, i) => {
    const row = lignes[i];
    if(!row || !it) return;
    const jour = jourDe(it.date);
    let b = gardees.filter(x => jourDe(x.dateCours) === jour && normaliserMot(x.moniteur || '') === normaliserMot(it.moniteur || ''))[0] ||
            gardees.filter(x => jourDe(x.dateCours) === jour)[0];
    if(!b || row.dataset.sansIa) return;
    row.dataset.sansIa = b.etat;
    const meta = row.querySelector('.meta');
    if(!meta) return;
    const s = document.createElement('span');
    s.style.cssText = 'color:var(--warn-text);font-weight:700;';
    s.textContent = b.etat === 'refait'
      ? '🤖 Refait avec l’IA — chez ' + (b.moniteur || 'son moniteur') + ' pour relecture'
      : '✍️ Envoyé sans la partie IA — la dictée est gardée';
    meta.appendChild(s);
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.style.cssText = 'width:auto;padding:6px 10px;font-size:12px;margin:0;flex-shrink:0;';
    if(b.etat === 'refait'){
      if(!estLeMoniteurDuCours(b)) return;
      btn.textContent = '↩️ Le relire';
      btn.addEventListener('click', ev => { ev.stopPropagation(); if(typeof reprendreBrouillonServeur === 'function') reprendreBrouillonServeur(b); });
    }else{
      btn.textContent = '🤖 Refaire avec l’IA';
      btn.addEventListener('click', ev => { ev.stopPropagation(); refaireAvecIA(b, it.ligne || null); });
    }
    meta.after(btn);
  });
}

/* Toucher la notification « bilan pas revenu » ouvre « Cours non terminés » */
(function(){
  const aller = () => { try{ afficherOnglet('gestion'); afficherVue('gestion', 'encours'); if(typeof afficherEnCours === 'function') afficherEnCours(true); }catch(e){} };
  try{
    const u = new URL(location.href);
    if(u.searchParams.get('vue') === 'encours'){
      u.searchParams.delete('vue');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
      setTimeout(aller, 1500);
    }
  }catch(e){}
  if(navigator.serviceWorker){
    navigator.serviceWorker.addEventListener('message', ev => {
      const d = ev && ev.data;
      if(d && d.quoi === 'ouvrirVue' && d.vue === 'encours') aller();
    });
  }
})();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-iadirect.js'] = true;
