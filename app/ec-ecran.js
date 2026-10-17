/* Déployé le 17/10/2026 à 10:51 — v1199 */
/* ============================================================
   ec-ecran.js
   Ce qui tourne sur les écrans du bureau et de la vitrine.

   Une diapositive = un message, une image, ou les deux. On dit où
   elle passe — accueil, vitrine ou les deux — combien de temps, et
   entre quelles dates.

   L'écran lui-même est une page à part : ecran.html.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let diaposEcran = [];
let reglagesEcran = {};

/* Le cours qui commence prend-il tout l'écran ?

   Actif tant qu'on ne l'a pas coupé : c'est ce qu'on veut tous les
   jours. La valeur enregistrée est donc « non » pour désactiver, et
   rien du tout pour le comportement normal — un réglage jamais
   touché doit marcher comme s'il avait été mis en route. */
function pleinEcranActif(){
  return String(reglagesEcran.ecranPleinEcran || '') !== 'non';
}

/* ============================================================
   COMBIEN DE TEMPS LE COURS PREND L'ÉCRAN

   David, le 9 septembre 2026 : « est-ce que tu peux faire en
   sorte que je puisse changer le temps manuellement ».

   C'était cinq minutes avant et cinq après, écrites en dur à deux
   endroits — la phrase de l'interrupteur ici, et le calcul dans
   ecran.html. Deux nombres qu'on ne pouvait changer qu'en touchant
   au code, et qui pouvaient se contredire.

   Ils vivent maintenant dans les réglages, à côté de
   l'interrupteur : le classeur les envoie à l'écran avec le reste,
   et la phrase les relit. Une seule vérité, réglable depuis
   l'application.

   ⚠️ CINQ RESTE LE DÉFAUT, et il n'est écrit qu'ici. Un réglage
   jamais touché doit se comporter comme avant.
   ============================================================ */
const MINUTES_ECRAN_DEFAUT = 5;

/* Un réglage lu en nombre de minutes : vide, illisible ou négatif
   valent le défaut. On plafonne à 120 — au-delà, le cours ne quitte
   plus l'écran et les diapositives ne passent jamais. */
function minutesEcran(cle){
  const brut = String(reglagesEcran[cle] == null ? '' : reglagesEcran[cle]).trim();
  if(!brut) return MINUTES_ECRAN_DEFAUT;
  const n = parseInt(brut, 10);
  if(isNaN(n) || n < 0) return MINUTES_ECRAN_DEFAUT;
  return Math.min(n, 120);
}

function minutesAvantEcran(){ return minutesEcran('ecranMinutesAvant'); }
function minutesApresEcran(){ return minutesEcran('ecranMinutesApres'); }

/* « De 5 minutes avant à 5 minutes après » — avec les vrais
   nombres, et au singulier quand il le faut. */
function phraseDureePleinEcran(){
  const a = minutesAvantEcran(), b = minutesApresEcran();
  const min = n => n + ' minute' + (n > 1 ? 's' : '');
  const debut = a === 0 ? 'De l\'heure du cours' : 'De ' + min(a) + ' avant';
  const fin = b === 0 ? 'à l\'heure pile' : 'à ' + min(b) + ' après';
  return debut + ' ' + fin + ', le cours prend tout l\'écran de ' +
         'l\'accueil. Les diapositives continuent derrière.';
}

/* L'interrupteur du plein écran. Il se sert du même composant que
   les réglages des procédures : un seul interrupteur dessiné dans
   toute l'application. */
function blocPleinEcran(){
  const z = document.createElement('div');
  z.style.cssText = 'margin-bottom:14px;';

  if(typeof interrupteur !== 'function'){
    /* Module absent : on le dit plutôt que de laisser un vide */
    z.innerHTML = '<div class="empty" style="font-size:13px;">' +
      'Réglage indisponible : le module des procédures n\'est pas chargé.</div>';
    return z;
  }

  z.appendChild(interrupteur({
    cle: 'ecranPleinEcran',
    titre: '🖥️ Cours en plein écran à l\'heure du cours',
    ouvert: pleinEcranActif(),
    quandOuvert: phraseDureePleinEcran(),
    quandFerme: 'Les cours restent dans leur liste, à gauche. Les diapositives ' +
                'gardent l\'écran — le temps d\'un contrôle, par exemple.',
    confirmation: '',
    /* À l'envers des autres réglages : c'est « non » qui coupe, et
       un réglage jamais touché reste actif. */
    valeurs: { actif: '', inactif: 'non' },
    apres: afficherEcran
  }));

  /* Les deux durées, sous l'interrupteur — et seulement quand il est
     ouvert : régler la durée d'un plein écran coupé n'apprend rien
     à personne. */
  if(pleinEcranActif()) z.appendChild(blocDureesPleinEcran());

  return z;
}

function blocDureesPleinEcran(){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-top:none;' +
    'border-radius:0 0 12px 12px;padding:12px 14px;margin:-13px 0 12px;';

  d.innerHTML =
    '<div style="font-size:12px;color:var(--muted);line-height:1.5;' +
      'margin-bottom:10px;">Combien de temps le cours occupe l\'écran, ' +
      'autour de son heure. À zéro, il apparaît pile à l\'heure — ou ' +
      'disparaît pile à l\'heure.</div>' +
    '<div class="duo">' +
      '<div><label for="ecrAv">Minutes avant</label>' +
        '<input type="number" id="ecrAv" inputmode="numeric" min="0" max="120"></div>' +
      '<div><label for="ecrAp">Minutes après</label>' +
        '<input type="number" id="ecrAp" inputmode="numeric" min="0" max="120"></div>' +
    '</div>' +
    '<div id="ecrDureeEtat" style="font-size:12px;color:var(--muted);' +
      'min-height:16px;line-height:1.5;margin-bottom:8px;"></div>';

  const av = d.querySelector('#ecrAv');
  const ap = d.querySelector('#ecrAp');
  const etat = d.querySelector('#ecrDureeEtat');
  av.value = minutesAvantEcran();
  ap.value = minutesApresEcran();

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;padding:8px 14px;font-size:13px;margin:0;';
  b.textContent = '💾 Enregistrer les durées';
  b.addEventListener('click', async () => {
    /* ⚠️ Le verrou avant l'attente réseau, comme partout ailleurs. */
    if(b.disabled) return;

    const lire = champ => {
      const n = parseInt(String(champ.value).trim(), 10);
      if(isNaN(n) || n < 0) return null;
      return Math.min(n, 120);
    };
    const a = lire(av), p = lire(ap);
    if(a === null || p === null){
      etat.style.color = 'var(--red)';
      etat.textContent = 'Deux nombres de minutes, de 0 à 120.';
      return;
    }

    b.disabled = true;
    const libelle = b.textContent;
    b.textContent = 'Enregistrement…';
    etat.style.color = 'var(--muted)';
    etat.textContent = '';
    try{
      /* Deux réglages, deux écritures : la feuille des réglages est
         une clé par ligne, et c'est ce qui la rend relisible à la
         main dans le classeur. */
      await appelPrep({ action: 'reglageSet', cle: 'ecranMinutesAvant',
                        valeur: String(a), par: ACCES.moniteur || '' });
      await appelPrep({ action: 'reglageSet', cle: 'ecranMinutesApres',
                        valeur: String(p), par: ACCES.moniteur || '' });
      reglagesEcran.ecranMinutesAvant = String(a);
      reglagesEcran.ecranMinutesApres = String(p);
      showToast('Durées enregistrées ✅');
      /* L'écran de la vitrine les relit à son prochain passage —
         une minute au plus, il n'y a rien à y faire. */
      afficherEcran();
    }catch(e){
      etat.style.color = 'var(--red)';
      etat.textContent = 'Impossible : ' + e.message;
      b.disabled = false;
      b.textContent = libelle;
    }
  });
  d.appendChild(b);

  return d;
}

/* ============================================================
   📺 LA PAGE AFFICHAGE, REFAITE — v1198

   David, le 16 octobre : « est-ce que tu peux me proposer une
   refonte visuelle et ergonomique de la page Affichage ». Schéma
   validé (« tu peux coder »), avec ses réponses :
     · les aperçus des deux téléviseurs, repliables — repliés sur le
       téléphone, ouverts sur la tablette et l'ordinateur ;
     · l'ordre du carrousel en glissant (⠿), plus de ▲▼ ;
     · les cours passés repliés en bas ;
     · en arrivant sur la page : toujours l'onglet 📅 Planning.

   Ce qui était une seule longue page devient :
     ① ce que montrent les écrans en ce moment, et le prochain plein
       écran ;
     ② trois onglets — 📅 Planning et 🖼️ Diapositives (tous les
       jours), ⚙️ Réglages (une fois).

   ⚠️ RIEN NE CHANGE DANS CE QUI EST ENREGISTRÉ. Mêmes actions
   (ecranLigneSet, ecranSet…), mêmes champs : seul l'écran de réglage
   est neuf. Les deux plannings — celui du jour et celui d'un autre
   jour — n'en font plus qu'un, avec la même carte et la même liste
   d'emplacements (celle de 📍 Gérer les emplacements ; le planning du
   jour en avait une écrite à la main, avec d'autres libellés).
   ============================================================ */
let ongletEcran = 'planning';
let jourEcran = '';             /* '' = aujourd'hui */
let filtreDiapos = 'tous';
let qrEcran = null;
let planningDuJourEcran = [];   /* aujourd'hui : sert au « prochain » */

const echEcran = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
function minutesDeHeure(h){
  const m = /^(\d{1,2}):(\d{2})/.exec(String(h || ''));
  return m ? (+m[1]) * 60 + (+m[2]) : null;
}
function minutesMaintenant(){ const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
function isoPlusJours(iso, n){
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function jourCourtEcran(iso){
  const d = new Date(iso + 'T12:00:00');
  const j = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'][d.getDay()];
  return j + ' ' + d.getDate();
}

async function afficherEcran(o){
  o = o || {};
  /* « Toujours Planning en arrivant » (David) : seul le passage par
     l'onglet remet à zéro. Un enregistrement qui redessine garde
     l'onglet où l'on est. */
  if(o.arrivee){ ongletEcran = 'planning'; jourEcran = ''; }
  const zone = $('ecranZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture de l’affichage…</div>';
  const [d, r, q, p] = await Promise.all([
    appelPrep({ action: 'ecranList' }).then(x => ({ ok: x }), e => ({ err: e })),
    /* Les réglages, le QR et le planning du jour n'empêchent pas la
       page de s'afficher : illisibles, on fait sans. */
    appelPrep({ action: 'reglagesList' }).catch(() => null),
    appelPrep({ action: 'ecranQrLire' }).catch(() => null),
    appelPrep({ action: 'ecranPlanning' }).catch(() => null)
  ]);
  if(d.err){
    zone.innerHTML = '<div class="empty">⚠️ ' + echEcran(d.err.message) + '</div>';
    return;
  }
  diaposEcran = (d.ok && d.ok.diapos) || [];
  reglagesEcran = (r && r.reglages) || {};
  qrEcran = (q && q.qr) || null;
  /* 🎨 v1199 — la transition du carrousel, et les liens des photos du studio */
  if(typeof transitionEcran !== 'undefined') transitionEcran = (q && q.transition) || null;
  if(typeof preparerLiensDesDiapos === 'function') await preparerLiensDesDiapos(diaposEcran).catch(() => {});
  planningDuJourEcran = (p && p.planning) || [];

  zone.innerHTML = '';
  zone.appendChild(blocApercusEcrans());
  zone.appendChild(ligneProchainEcran());

  const o2 = document.createElement('div');
  o2.className = 'eqOnglets afOnglets';
  const aVenir = coursRangesEcran(planningDuJourEcran, true).avenir.length;
  const actives = diaposEcran.filter(x => etatDiapo(x) === 'ecran' || etatDiapo(x) === 'programmee').length;
  [['planning', '📅 Planning', aVenir], ['diapos', '🖼️ <span class="afLong">Diapositives</span><span class="afCourt">Diapos</span>', actives], ['reglages', '⚙️ Réglages', null]].forEach(([k, n, c]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.onglet = k;
    b.className = 'btn ' + (k === ongletEcran ? 'btn-primary' : 'btn-secondary');
    b.innerHTML = n + (c !== null ? ' · ' + c : '');
    b.addEventListener('click', () => {
      ongletEcran = k;
      o2.querySelectorAll('button').forEach(x => x.className = 'btn ' + (x.dataset.onglet === k ? 'btn-primary' : 'btn-secondary'));
      dessinerOngletEcran();
    });
    o2.appendChild(b);
  });
  zone.appendChild(o2);

  const corps = document.createElement('div');
  corps.id = 'ecranCorps';
  zone.appendChild(corps);
  dessinerOngletEcran();
}

function dessinerOngletEcran(){
  const c = $('ecranCorps');
  if(!c) return;
  c.innerHTML = '';
  if(ongletEcran === 'diapos') dessinerDiaposEcran(c);
  else if(ongletEcran === 'reglages') dessinerReglagesEcran(c);
  else dessinerPlanningEcran(c);
}

/* ============================================================
   ① CE QUE MONTRENT LES ÉCRANS EN CE MOMENT

   La vraie page de l'écran, en petit (une iframe réduite) : ce
   qu'on voit ici est exactement ce que voit la salle d'attente.
   Chargée seulement quand le tiroir est ouvert — replié sur le
   téléphone (David), il ne coûte rien.
   ============================================================ */
function blocApercusEcrans(){
  const d = document.createElement('details');
  d.className = 'afTiroir afApercus';
  d.open = window.innerWidth > 620;
  d.innerHTML = '<summary>📺 Les deux écrans en ce moment</summary>';
  const g = document.createElement('div');
  g.className = 'afEnDirect';
  d.appendChild(g);

  const charger = async () => {
    if(g.dataset.charge) return;
    g.dataset.charge = '1';
    const j = await chargerJetonEcran();
    if(!j){
      g.innerHTML = '<div class="afResume" style="grid-column:1/-1;">⚠️ ECRAN_TOKEN n’est pas réglé dans Cloudflare : pas d’aperçu (voir ⚙️ Réglages › Adresses des écrans).</div>';
      return;
    }
    [['accueil', '🏠 Accueil'], ['vitrine', '🪟 Vitrine']].forEach(([ou, nom]) => {
      const adresse = CONFIG.LIEN_ECRAN + '?t=' + encodeURIComponent(j) + '&ou=' + ou;
      const t = document.createElement('div');
      t.className = 'afTele';
      t.innerHTML = '<div class="afCadre"><iframe title="Aperçu de l’écran ' + ou + '" loading="lazy" tabindex="-1"></iframe></div>' +
        '<div class="afTeleBas"><span class="afPoint"></span><strong>' + nom + ' <span class="eqGris" style="font-weight:400;">· en ce moment</span></strong></div>';
      const ifr = t.querySelector('iframe');
      ifr.src = adresse;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'afPetit';
      b.title = 'Ouvrir cet écran en grand';
      b.textContent = '⛶';
      b.addEventListener('click', () => window.open(adresse, '_blank', 'noopener'));
      t.querySelector('.afTeleBas').appendChild(b);
      g.appendChild(t);
      /* La page de l'écran est faite pour 1600 × 900 : on la réduit à
         la largeur du cadre, au lieu de la laisser se réarranger. */
      const cadre = t.querySelector('.afCadre');
      const ajuster = () => { const k = cadre.clientWidth / 1600; ifr.style.transform = 'scale(' + k + ')'; };
      ajuster();
      if(typeof ResizeObserver === 'function') new ResizeObserver(ajuster).observe(cadre);
    });
  };
  d.addEventListener('toggle', () => { if(d.open) charger(); });
  if(d.open) charger();
  return d;
}

/* La phrase sous les aperçus : le prochain plein écran, et ce qui tourne */
function ligneProchainEcran(){
  const z = document.createElement('div');
  z.className = 'afProchain';
  const r = coursRangesEcran(planningDuJourEcran, true);
  const prochain = r.avenir.find(c => c.__etat === 'prochain') || null;
  const maintenant = minutesMaintenant();
  let a = '';
  if(r.avenir.some(c => c.__etat === 'grand')){
    const c = r.avenir.find(x => x.__etat === 'grand');
    a = '🖥️ <strong>En plein écran : ' + echEcran(nomPublicEleve(c.eleveComplet || c.eleve)) + '</strong>';
  }else if(prochain){
    const m = minutesDeHeure(prochain.heure);
    const dans = m === null ? '' : ' (dans ' + (m - maintenant >= 60 ? Math.floor((m - maintenant) / 60) + ' h ' + String((m - maintenant) % 60).padStart(2, '0') : (m - maintenant) + ' min') + ')';
    a = '⏭️ <strong>' + (pleinEcranActif() ? 'Prochain plein écran' : 'Prochain cours') + ' : ' +
        echEcran(nomPublicEleve(prochain.eleveComplet || prochain.eleve)) + ' à ' + echEcran(String(prochain.heure).replace(':', 'h')) + '</strong>' + dans;
  }else{
    a = '🌙 <strong>Plus de cours à l’écran aujourd’hui</strong>';
  }
  const tourne = ou => diaposEcran.filter(x => etatDiapo(x) === 'ecran' && !TYPES_FIXES_ECRAN[x.type] &&
                                            (x.ou === ou || x.ou === 'les-deux')).length;
  z.innerHTML = a + ' · 🖼️ ' + tourne('accueil') + ' diapositive(s) tournent à l’accueil, ' + tourne('vitrine') + ' à la vitrine';
  return z;
}

/* ============================================================
   ② 📅 LE PLANNING — un seul, pour tous les jours
   ============================================================ */

/* Range une journée : à venir (avec « grand » / « prochain »),
   passés, retirés. Le « maintenant » ne vaut que pour aujourd'hui. */
function coursRangesEcran(liste, aujourdhui){
  const maintenant = minutesMaintenant();
  const av = minutesAvantEcran(), ap = minutesApresEcran();
  const avenir = [], passes = [], retires = [];
  (liste || []).forEach(c => {
    c.__etat = '';
    if(c.masque){ retires.push(c); return; }
    const m = minutesDeHeure(c.heure);
    /* Passé : son heure, et le temps qu'il garde l'écran après, sont
       derrière nous. */
    if(aujourdhui && m !== null && m + ap < maintenant){
      passes.push(c); return;
    }
    if(aujourdhui && m !== null && pleinEcranActif() && maintenant >= m - av && maintenant <= m + ap) c.__etat = 'grand';
    avenir.push(c);
  });
  if(aujourdhui){
    const p = avenir.find(c => c.__etat !== 'grand' && minutesDeHeure(c.heure) !== null && minutesDeHeure(c.heure) >= maintenant);
    if(p) p.__etat = 'prochain';
  }
  return { avenir: avenir, passes: passes, retires: retires };
}

function dessinerPlanningEcran(z){
  const auj = todayLocal();
  const jour = jourEcran || auj;
  const j = document.createElement('div');
  j.className = 'afJours';
  const demain = isoPlusJours(auj, 1);
  let apres = isoPlusJours(auj, 2);
  if(new Date(apres + 'T12:00:00').getDay() === 0) apres = isoPlusJours(auj, 3);
  const choix = [[auj, 'Aujourd’hui · ' + jourCourtEcran(auj)], [demain, 'Demain · ' + jourCourtEcran(demain)],
                 [apres, jourCourtEcran(apres).replace(/^./, x => x.toUpperCase())]];
  const autre = choix.every(x => x[0] !== jour);
  choix.forEach(([iso, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (iso === jour ? 'btn-primary' : 'btn-secondary');
    b.textContent = t;
    b.addEventListener('click', () => { jourEcran = iso === auj ? '' : iso; dessinerOngletEcran(); });
    j.appendChild(b);
  });
  const ba = document.createElement('label');
  ba.className = 'btn ' + (autre ? 'btn-primary' : 'btn-secondary') + ' afAutreJour';
  ba.innerHTML = '📅 ' + (autre ? jourCourtEcran(jour).replace(/^./, x => x.toUpperCase()) + ' ' + jour.slice(5, 7) : 'Autre jour') +
    '<input type="date" aria-label="Choisir un jour">';
  const ch = ba.querySelector('input');
  ch.value = jour;
  ch.addEventListener('change', () => { if(ch.value){ jourEcran = ch.value === auj ? '' : ch.value; dessinerOngletEcran(); } });
  j.appendChild(ba);
  z.appendChild(j);

  const liste = document.createElement('div');
  liste.innerHTML = '<div class="empty">Lecture…</div>';
  z.appendChild(liste);

  const recharger = async () => {
    let l = [];
    try{
      if(jour === auj){
        const r = await appelPrep({ action: 'ecranPlanning' });
        l = (r && r.planning) || [];
        planningDuJourEcran = l;
      }else{
        const r = await appelPrep({ action: 'ecranPlanningJour', jour: jour });
        l = (r && r.planning) || [];
      }
    }catch(e){
      liste.innerHTML = '<div class="empty">⚠️ ' + echEcran(e.message) + '</div>';
      return;
    }
    dessinerJourneeEcran(liste, l, jour, recharger);
  };
  if(jour === auj) dessinerJourneeEcran(liste, planningDuJourEcran, jour, recharger);
  else recharger();
}

function dessinerJourneeEcran(z, l, jour, recharger){
  z.innerHTML = '';
  const auj = jour === todayLocal();
  const r = coursRangesEcran(l, auj);
  const dit = document.createElement('div');
  dit.className = 'afResume';
  dit.innerHTML = r.avenir.length
    ? '<strong style="color:var(--cream);">' + r.avenir.length + ' cours à l’écran</strong> · l’écran se met à jour dans la minute · touche une puce pour la changer'
    : (auj ? 'Plus de cours à l’écran aujourd’hui. L’écran affiche « Plus de cours aujourd’hui ».'
           : 'Aucun cours ce jour-là. « ➕ Ajouter une ligne » en met un à la main.');
  z.appendChild(dit);
  r.avenir.forEach(c => z.appendChild(carteCoursEcran(c, l, jour, recharger)));

  const add = document.createElement('button');
  add.className = 'btn btn-secondary';
  add.style.cssText = 'margin:4px 0 8px;padding:11px;font-size:13px;';
  add.textContent = '➕ Ajouter une ligne à la main';
  add.addEventListener('click', () => ouvrirLigneManuelle(jour, recharger));
  z.appendChild(add);

  const tiroir = (titre, cours, classe) => {
    if(!cours.length) return;
    const t = document.createElement('details');
    t.className = 'afTiroir ' + (classe || '');
    t.innerHTML = '<summary>' + titre + '</summary>';
    cours.forEach(c => { const k = carteCoursEcran(c, l, jour, recharger); k.classList.add('afEteint'); t.appendChild(k); });
    z.appendChild(t);
  };
  /* Repliés en bas (David) : ils ne sont plus à l'écran, mais se
     corrigent encore. */
  tiroir('🕐 ' + r.passes.length + ' cours déjà passé' + (r.passes.length > 1 ? 's' : '') + ' — ' + (r.passes.length > 1 ? 'ils ont' : 'il a') + ' quitté l’écran', r.passes, 'afPasses');
  tiroir('🙈 ' + r.retires.length + ' retiré' + (r.retires.length > 1 ? 's' : '') + ' de l’écran — ↩️ dans ⋯ pour remettre', r.retires, 'afRetires');
}

/* Une ligne qui change : enregistrée pour SON jour */
async function enregistrerLigneDuJour(c, jour, silencieux){
  try{
    await appelPrep({
      action: 'ecranLigneSet',
      id: c.manuel ? c.id : '',
      idPrep: c.manuel ? '' : c.id,
      jour: jour,
      eleve: c.eleveComplet || c.eleve || '',
      moniteur: c.moniteur || '',
      heure: c.heure || '',
      vehicule: c.vehicule || '',
      lieu: c.lieu || '',
      ordre: c.ordre || 0,
      masque: c.masque ? 'oui' : '',
      par: ACCES.moniteur || ''
    });
    if(!silencieux) showToast('Enregistré ✅');
  }catch(e){
    if(!silencieux) showToast('Impossible : ' + e.message);
    throw e;
  }
}

function carteCoursEcran(c, liste, jour, recharger){
  const k = document.createElement('div');
  k.className = 'afCours' + (c.__etat === 'prochain' || c.__etat === 'grand' ? ' maintenant' : '');
  const pastille = (t, cls) => '<span class="afBadge ' + cls + '">' + t + '</span>';

  const h = document.createElement('input');
  h.type = 'time';
  h.className = 'afHeure';
  h.value = c.heure || '';
  h.setAttribute('aria-label', 'Heure');
  h.addEventListener('change', async () => {
    c.heure = h.value;
    try{ await enregistrerLigneDuJour(c, jour); recharger(); }catch(e){}
  });
  k.appendChild(h);

  const qui = document.createElement('div');
  qui.className = 'afQui';
  qui.innerHTML = '<strong>' + echEcran(c.eleveComplet || c.eleve || '—') + '</strong>' +
    (c.manuel ? pastille('à la main', 'gris') : '') +
    (c.__etat === 'grand' ? pastille('● en plein écran', 'vert') : '') +
    (c.__etat === 'prochain' ? pastille('⏭️ prochain', 'citron') : '') +
    (c.masque ? pastille('retiré de l’écran', 'gris') : '') +
    '<div class="afPub"></div>';
  peindreApercuNomPublic(qui.querySelector('.afPub'), c.eleveComplet || c.eleve);
  k.appendChild(qui);

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'afPlus';
  plus.title = 'Plus';
  plus.textContent = '⋯';
  plus.addEventListener('click', () => menuCoursEcran(c, liste, jour, recharger, qui));
  k.appendChild(plus);

  /* Les trois puces : moniteur, véhicule, lieu */
  const puces = document.createElement('div');
  puces.className = 'afPuces';
  const selMon = document.createElement('select');
  selMon.className = 'afPuce';
  selMon.setAttribute('aria-label', 'Moniteur');
  remplirMoniteursEcran(selMon, c.moniteur || '');
  selMon.addEventListener('change', () => { c.moniteur = selMon.value; enregistrerLigneDuJour(c, jour).catch(() => {}); });
  puces.appendChild(selMon);

  const veh = document.createElement('select');
  veh.className = 'afPuce';
  veh.setAttribute('aria-label', 'Véhicule');
  const libre = document.createElement('input');
  libre.type = 'text';
  libre.className = 'afPuce afLibre';
  libre.placeholder = 'Quel véhicule ?';
  libre.value = c.vehicule || '';
  libre.style.display = 'none';
  remplirVehiculesEcran(veh, c.vehicule || '').then(() => { peindreVeh(); });
  const peindreVeh = () => {
    const enSalle = lieuSansVehicule(c.lieu || '');
    veh.style.display = enSalle ? 'none' : '';
    libre.style.display = (!enSalle && veh.value === 'autre') ? '' : 'none';
    veh.classList.toggle('vide', !enSalle && !c.vehicule);
  };
  veh.addEventListener('change', () => {
    if(veh.value === 'autre'){ peindreVeh(); setTimeout(() => libre.focus(), 60); return; }
    c.vehicule = veh.value;
    peindreVeh();
    enregistrerLigneDuJour(c, jour).catch(() => {});
  });
  libre.addEventListener('change', () => { c.vehicule = libre.value.trim(); peindreVeh(); enregistrerLigneDuJour(c, jour).catch(() => {}); });
  puces.appendChild(veh);
  puces.appendChild(libre);

  const lieu = document.createElement('select');
  lieu.className = 'afPuce';
  lieu.setAttribute('aria-label', 'Où');
  remplirListeLieux(lieu, c.lieu || '', false);
  lieu.addEventListener('change', () => {
    c.lieu = lieu.value;
    /* Une séance en salle n'a pas de véhicule : il s'efface */
    if(lieuSansVehicule(lieu.value)){ c.vehicule = ''; veh.value = ''; libre.value = ''; }
    lieu.classList.toggle('vide', !c.lieu);
    peindreVeh();
    enregistrerLigneDuJour(c, jour).catch(() => {});
  });
  lieu.classList.toggle('vide', !c.lieu);
  puces.appendChild(lieu);
  k.appendChild(puces);
  peindreVeh();
  return k;
}

/* ⋯ : ce qu'on fait rarement — le nom affiché, l'ordre à heure égale,
   retirer ou remettre, supprimer une ligne ajoutée à la main. */
function menuCoursEcran(c, liste, jour, recharger, qui){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const m = document.createElement('div');
  m.className = 'modal';
  m.style.maxWidth = 'min(380px, 94vw)';
  m.innerHTML = '<h3 style="margin-top:0;">' + echEcran(c.eleveComplet || c.eleve || '—') +
    (c.heure ? ' · ' + echEcran(String(c.heure).replace(':', 'h')) : '') + '</h3>';
  const bouton = (texte, faire, rouge) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-secondary';
    b.style.cssText = 'margin:0 0 7px;padding:11px;text-align:left;' + (rouge ? 'color:var(--red);border-color:var(--red);' : '');
    b.textContent = texte;
    b.addEventListener('click', async () => { fermerFond(fond); await faire(); });
    m.appendChild(b);
  };
  bouton('✏️ Nom à l’écran : « ' + nomPublicEleve(c.eleveComplet || c.eleve) + ' »', async () => {
    if(await corrigerNomPublic(c.eleveComplet || c.eleve)) peindreApercuNomPublic(qui.querySelector('.afPub'), c.eleveComplet || c.eleve);
  });
  /* L'heure range le planning : monter ou descendre ne départage que
     deux cours à la même heure (voir la v787). */
  const memeHeure = liste.filter(x => !x.masque && (x.heure || '') === (c.heure || ''));
  if(memeHeure.length > 1){
    [['▲ Passer avant (même heure)', -1], ['▼ Passer après (même heure)', 1]].forEach(([t, sens]) => {
      bouton(t, async () => {
        const i = memeHeure.indexOf(c), j = i + sens;
        if(j < 0 || j >= memeHeure.length) return;
        const voisin = memeHeure[j];
        const a = liste.indexOf(c), b = liste.indexOf(voisin);
        liste[a] = voisin; liste[b] = c;
        const lo = Math.min(a, b), hi = Math.max(a, b);
        liste[lo].ordre = lo + 1; liste[hi].ordre = hi + 1;
        try{
          await Promise.all([c, voisin].map(x => enregistrerLigneDuJour(x, jour, true)));
          showToast('Ordre enregistré ✅');
        }catch(e){ showToast('Ordre non enregistré : ' + e.message); }
        recharger();
      });
    });
  }
  if(c.masque){
    bouton('↩️ Remettre à l’écran', async () => {
      c.masque = false;
      try{ await enregistrerLigneDuJour(c, jour, true); showToast('Remise à l’écran ✅'); }
      catch(e){ c.masque = true; showToast('Impossible : ' + e.message); }
      recharger();
    });
  }else if(c.manuel){
    bouton('🗑️ Supprimer cette ligne', async () => {
      if(!await confirmer('Supprimer cette ligne de l’affichage ?')) return;
      try{ await appelPrep({ action: 'ecranLigneDelete', id: c.id }); showToast('Supprimée ✅'); }
      catch(e){ showToast('Impossible : ' + e.message); }
      recharger();
    }, true);
  }else{
    bouton('🙈 Retirer de l’écran', async () => {
      if(!await confirmer('Retirer ' + (c.eleveComplet || c.eleve) + ' de l’écran ?\n\nSon cours reste dans les prochains cours du ' +
                          'moniteur : seul l’affichage est concerné.')) return;
      c.masque = true;
      try{ await enregistrerLigneDuJour(c, jour, true); showToast('Retiré de l’écran ✅'); }
      catch(e){ c.masque = false; showToast('Impossible : ' + e.message); }
      recharger();
    }, true);
  }
  const f = document.createElement('button');
  f.type = 'button';
  f.className = 'btn btn-secondary';
  f.style.cssText = 'margin:4px 0 0;padding:10px;';
  f.textContent = 'Fermer';
  f.addEventListener('click', () => fermerFond(fond));
  m.appendChild(f);
  fond.appendChild(m);
  fond.addEventListener('click', ev => { if(ev.target === fond) fermerFond(fond); });
  document.body.appendChild(fond);
}

/* Ajouter une ligne qui n'a pas de préparation, sur le jour affiché */
function ouvrirLigneManuelle(jour, apres){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(460px, 94vw)';
  const auj = jour === todayLocal();
  boite.innerHTML =
    '<h3>➕ ' + (auj ? 'Ajouter au planning affiché' : 'Ligne du ' + jour.split('-').reverse().join('/')) + '</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.5;">' +
      "Pour ce qui n'a pas de cours préparé : un rendez-vous, une reprise, " +
      'un créneau au simulateur.</div>' +
    '<label for="lmEleve">Élève ou intitulé</label>' +
    '<input type="text" id="lmEleve" list="listeEleves" autocomplete="off" ' +
      'placeholder="Ex : Ambre Guillebon, ou Réunion AAC">' +
    '<div class="duo">' +
      '<div><label for="lmHeure">Heure</label><input type="time" id="lmHeure"></div>' +
      '<div><label for="lmMon">Moniteur</label><select id="lmMon"></select></div>' +
    '</div>' +
    '<div class="duo">' +
      '<div><label for="lmMod">Véhicule</label>' +
        '<select id="lmMod"><option value="">— chargement —</option></select>' +
        '<input type="text" id="lmVeh" placeholder="Lequel ?" ' +
          'style="display:none;margin-top:6px;"></div>' +
      '<div><label for="lmLieu">Où</label><select id="lmLieu"></select></div>' +
    '</div>';

  remplirListeLieux(boite.querySelector('#lmLieu'), '', false);
  remplirMoniteursEcran(boite.querySelector('#lmMon'), auj ? '' : (ACCES.moniteur || ''));
  const selMod = boite.querySelector('#lmMod');
  const champLibre = boite.querySelector('#lmVeh');
  remplirVehiculesEcran(selMod, '');
  selMod.addEventListener('change', () => {
    const l = (selMod.value === 'autre');
    champLibre.style.display = l ? 'block' : 'none';
    if(l) setTimeout(() => champLibre.focus(), 60);
  });

  const r = document.createElement('div');
  r.className = 'btn-row';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => fermerFond(fond));
  r.appendChild(bAnn);
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '➕ Ajouter';
  bOk.addEventListener('click', async () => {
    const nom = boite.querySelector('#lmEleve').value.trim();
    if(!nom){ showToast('Indique un élève ou un intitulé.'); return; }
    bOk.disabled = true;
    bOk.textContent = 'Ajout…';
    try{
      await appelPrep({
        action: 'ecranLigneSet', id: '', idPrep: '',
        jour: jour,
        eleve: nom,
        moniteur: boite.querySelector('#lmMon').value,
        heure: boite.querySelector('#lmHeure').value,
        vehicule: (selMod.value === 'autre') ? champLibre.value.trim() : selMod.value,
        lieu: boite.querySelector('#lmLieu').value,
        ordre: 0,
        par: ACCES.moniteur || ''
      });
      fermerFond(fond);
      showToast('Ajouté au planning ✅');
      if(typeof apres === 'function') apres();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
      bOk.textContent = '➕ Ajouter';
    }
  });
  r.appendChild(bOk);
  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#lmEleve').focus(), 100);
}

/* ============================================================
   ③ 🖼️ LES DIAPOSITIVES
   ============================================================ */
const TYPES_FIXES_ECRAN = { bandeau: 1, fond: 1, panneau: 1 };

/* ecran · programmee · pause · terminee */
function etatDiapo(d){
  const auj = todayLocal();
  if(d.au && d.au < auj) return 'terminee';
  if(!d.actif) return 'pause';
  if(d.du && d.du > auj) return 'programmee';
  return 'ecran';
}

function dessinerDiaposEcran(z){
  const pour = ou => diaposEcran.filter(x => x.ou === ou || x.ou === 'les-deux').length;
  const f = document.createElement('div');
  f.className = 'afJours afTrois';
  [['tous', 'Tous · ' + diaposEcran.length], ['accueil', '🏠 Accueil · ' + pour('accueil')], ['vitrine', '🪟 Vitrine · ' + pour('vitrine')]].forEach(([k, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (k === filtreDiapos ? 'btn-primary' : 'btn-secondary');
    b.textContent = t;
    b.addEventListener('click', () => { filtreDiapos = k; dessinerOngletEcran(); });
    f.appendChild(b);
  });
  z.appendChild(f);

  const n = document.createElement('button');
  n.className = 'btn btn-primary';
  n.style.cssText = 'margin:0 0 4px;padding:13px;font-size:14px;';
  n.textContent = '➕ Nouvelle diapositive';
  /* 🎨 v1199 — d'abord « Créer une diapositive » (le studio), le reste
     ouvre la fenêtre d'avant */
  n.addEventListener('click', () => (typeof ouvrirNouvelleDiapo === 'function' ? ouvrirNouvelleDiapo() : ouvrirEditeurDiapo(null)));
  z.appendChild(n);

  const vue = diaposEcran.filter(x => filtreDiapos === 'tous' || x.ou === filtreDiapos || x.ou === 'les-deux');
  const vivante = x => etatDiapo(x) === 'ecran' || etatDiapo(x) === 'programmee';
  const carrousel = vue.filter(x => vivante(x) && !TYPES_FIXES_ECRAN[x.type]);
  const fixes = vue.filter(x => vivante(x) && TYPES_FIXES_ECRAN[x.type]);
  const autres = vue.filter(x => !vivante(x));

  if(!diaposEcran.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucune diapositive.<br><span style="font-size:12px;">Ajoute un message ou une image à faire tourner sur les écrans.</span>';
    z.appendChild(v);
    return;
  }

  const groupe = (titre, aide, liste, glisser) => {
    if(!liste.length) return;
    const h = document.createElement('div');
    h.className = 'afGroupe';
    h.innerHTML = titre + ' <span class="n">· ' + liste.length + '</span>';
    z.appendChild(h);
    if(aide){ const a = document.createElement('div'); a.className = 'afResume'; a.style.marginTop = '-4px'; a.textContent = aide; z.appendChild(a); }
    const g = document.createElement('div');
    g.className = 'afDiapos';
    liste.forEach(d => g.appendChild(carteDiapoEcran(d, glisser)));
    z.appendChild(g);
    if(glisser) rendreCarrouselGlissable(g);
  };
  const tousVisibles = filtreDiapos === 'tous';
  groupe('🔄 LE CARROUSEL, DANS L’ORDRE',
    tousVisibles ? 'Elles passent chacune leur tour. ⠿ pour les glisser dans un autre ordre.'
                 : 'Elles passent chacune leur tour. Pour changer l’ordre, reviens sur « Tous ».',
    carrousel, tousVisibles && carrousel.length > 1);
  groupe('📌 TOUJOURS À L’ÉCRAN', 'Le texte défilant en bas, le fond et le texte fixe de la vitrine.', fixes, false);
  if(autres.length){
    const t = document.createElement('details');
    t.className = 'afTiroir';
    t.style.marginTop = '16px';
    t.innerHTML = '<summary>💤 ' + autres.length + ' en pause ou terminée' + (autres.length > 1 ? 's' : '') + ' — gardée' + (autres.length > 1 ? 's' : '') + ' pour les ressortir</summary>';
    const g = document.createElement('div');
    g.className = 'afDiapos';
    g.style.marginTop = '10px';
    autres.forEach(d => g.appendChild(carteDiapoEcran(d, false)));
    t.appendChild(g);
    z.appendChild(t);
  }
}

function miniDiapoEcran(d, glisser){
  const ou = { 'les-deux': '🏠🪟', accueil: '🏠', vitrine: '🪟' }[d.ou] || '';
  const role = { bandeau: ' défilant', fond: ' fond fixe', panneau: ' texte fixe', video: ' vidéo' }[d.type] || '';
  const poignee = glisser ? '<span class="poignee" title="Glisser pour changer l’ordre">⠿</span>' : '';
  const ent = '<span class="ou">' + ou + role + '</span>' + poignee;
  if(d.type === 'compo'){
    /* 🎨 v1199 — le vrai dessin, posé une fois la carte à sa place */
    return '<div class="afMini compo">' + ent + '<div class="afCompo"></div></div>';
  }
  if(d.type === 'bandeau'){
    return '<div class="afMini bandeau">' + ent + '<div class="bd">' + echEcran(d.contenu || d.titre) + '</div></div>';
  }
  if(d.image){
    return '<div class="afMini image" style="background-image:url(&quot;' + echEcran(d.image) + '&quot;);">' + ent +
      (d.titre && d.type !== 'fond' ? '<div class="leg">' + echEcran(d.titre) + '</div>' : '') + '</div>';
  }
  if(d.type === 'fond') return '<div class="afMini">' + ent + '<span>🖼️ pas d’image</span></div>';
  if(d.type === 'panneau'){
    return '<div class="afMini panneau">' + ent + '<b>' + echEcran(d.titre) + '</b><span>' + echEcran(d.contenu) + '</span></div>';
  }
  if(d.type === 'video'){
    return '<div class="afMini video">' + ent + '<i>▶</i>' + (d.titre ? '<span>' + echEcran(d.titre) + '</span>' : '') + '</div>';
  }
  return '<div class="afMini">' + ent + (d.titre ? '<b>' + echEcran(d.titre) + '</b>' : '') +
    (d.contenu ? '<span>' + echEcran(String(d.contenu).slice(0, 120)) + '</span>' : '') + '</div>';
}

function carteDiapoEcran(d, glisser){
  const c = document.createElement('div');
  const etat = etatDiapo(d);
  c.className = 'afDiapo' + (etat === 'pause' || etat === 'terminee' ? ' eteinte' : '');
  c.dataset.id = d.id;
  const jj = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
  const quand = etat === 'terminee' ? 'terminée le ' + jj(d.au)
              : etat === 'programmee' ? 'du ' + jj(d.du) + (d.au ? ' au ' + jj(d.au) : '')
              : d.au ? 'jusqu’au ' + jj(d.au) : 'sans fin';
  const duree = TYPES_FIXES_ECRAN[d.type] ? '' : (Number(d.duree) === 0 ? '🔁 en boucle · ' : d.duree + ' s · ');
  const p = etat === 'pause' ? '<span class="afBadge gris">⏸️ en pause</span>'
          : etat === 'terminee' ? '<span class="afBadge gris">terminée</span>'
          : etat === 'programmee' ? '<span class="afBadge gris">🗓️ dès le ' + jj(d.du) + '</span>'
          : '<span class="afBadge vert">● à l’écran</span>';
  c.innerHTML = miniDiapoEcran(d, glisser) +
    '<div class="afDiapoBas"><div class="t"><strong>' + echEcran(d.titre || d.contenu || 'Sans titre') + '</strong>' +
      '<div class="s">' + p + ' ' + duree + quand + '</div></div></div>';
  c.querySelector('.afMini').addEventListener('click', ev => { if(ev.target.closest('.poignee')) return; ouvrirEditeurDiapo(d); });
  if(d.type === 'compo' && typeof vignetteCompo === 'function'){
    const m = c.querySelector('.afMini'), v = c.querySelector('.afCompo');
    requestAnimationFrame(() => {
      const W = d.ou === 'vitrine' ? 1024 : 1600, H = d.ou === 'vitrine' ? 824 : 722;
      const l = Math.floor(Math.min(m.clientWidth, m.clientHeight * W / H));
      if(l > 0) vignetteCompo(v, d, l);
    });
  }
  const bas = c.querySelector('.afDiapoBas');
  if(etat !== 'terminee'){
    const bP = document.createElement('button');
    bP.type = 'button';
    bP.className = 'afPetit';
    bP.textContent = d.actif ? '⏸️' : '▶️';
    bP.title = d.actif ? 'Mettre en pause' : 'Remettre à l’écran';
    bP.addEventListener('click', async () => {
      d.actif = !d.actif;
      dessinerOngletEcran();
      try{ await enregistrerDiapoEcran(d); }
      catch(e){ d.actif = !d.actif; dessinerOngletEcran(); showToast('Impossible : ' + e.message); }
    });
    bas.appendChild(bP);
  }
  const bM = document.createElement('button');
  bM.type = 'button';
  bM.className = 'afPetit';
  bM.textContent = '✏️';
  bM.title = etat === 'terminee' ? 'Modifier (changer ses dates pour la ressortir)' : 'Modifier';
  bM.addEventListener('click', () => ouvrirEditeurDiapo(d));
  bas.appendChild(bM);
  return c;
}

function enregistrerDiapoEcran(x){
  return appelPrep({ action: 'ecranSet', id: x.id, type: x.type, titre: x.titre,
                     contenu: x.contenu, ou: x.ou, duree: x.duree,
                     actif: x.actif ? 'oui' : 'non', du: x.du, au: x.au,
                     ordre: x.ordre, par: ACCES.moniteur || '' });
}

/* ⠿ GLISSER POUR CHANGER L'ORDRE — David a choisi de glisser plutôt
   que les flèches. La poignée seule déclenche (le reste de la carte
   s'ouvre au toucher, et la liste défile au doigt) ; la carte suit
   le doigt, les autres s'écartent, et au lâcher on numérote toute la
   liste d'après sa nouvelle place — on n'enregistre que celles dont
   le numéro a changé. */
function rendreCarrouselGlissable(g){
  g.querySelectorAll('.poignee').forEach(p => {
    p.style.touchAction = 'none';
    p.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const carte = p.closest('.afDiapo');
      carte.classList.add('glisse');
      /* Les mouvements sont suivis sur toute la page (pas de capture :
         elle se perd quand la carte bouge dans la grille). */
      const bouger = e2 => {
        const sous = document.elementsFromPoint(e2.clientX, e2.clientY);
        const cible = sous.map(x => x.closest && x.closest('.afDiapo')).find(x => x && x !== carte && x.parentNode === g);
        if(!cible) return;
        const r = cible.getBoundingClientRect();
        const avant = (g.offsetWidth > r.width * 1.5)
          ? (e2.clientY < r.top + r.height / 2 && e2.clientX < r.right) || e2.clientY < r.top || (e2.clientX < r.left + r.width / 2 && e2.clientY < r.bottom)
          : e2.clientY < r.top + r.height / 2;
        g.insertBefore(carte, avant ? cible : cible.nextSibling);
      };
      const lacher = async () => {
        document.removeEventListener('pointermove', bouger);
        document.removeEventListener('pointerup', lacher);
        document.removeEventListener('pointercancel', lacher);
        carte.classList.remove('glisse');
        await enregistrerOrdreCarrousel([...g.querySelectorAll('.afDiapo')].map(x => x.dataset.id));
      };
      document.addEventListener('pointermove', bouger);
      document.addEventListener('pointerup', lacher);
      document.addEventListener('pointercancel', lacher);
    });
  });
}

async function enregistrerOrdreCarrousel(ids){
  /* Le carrousel dans son nouvel ordre, puis le reste à sa place */
  const parId = {};
  diaposEcran.forEach(x => { parId[x.id] = x; });
  const dedans = ids.map(id => parId[id]).filter(Boolean);
  const avant = diaposEcran.map(x => x.id).join('|');
  const pris = {};
  dedans.forEach(x => { pris[x.id] = 1; });
  let i = 0;
  diaposEcran = diaposEcran.map(x => pris[x.id] ? dedans[i++] : x);
  if(diaposEcran.map(x => x.id).join('|') === avant) return;
  const changees = [];
  diaposEcran.forEach((x, n) => { if(Number(x.ordre) !== n + 1){ x.ordre = n + 1; changees.push(x); } });
  try{
    await Promise.all(changees.map(enregistrerDiapoEcran));
    showToast('Ordre enregistré ✅');
  }catch(e){ showToast('Ordre non enregistré : ' + e.message); }
  dessinerOngletEcran();
}

/* ============================================================
   ④ ⚙️ LES RÉGLAGES — ce qu'on règle une fois, sans rien y changer,
   plus le QR code de Saint-Brieuc (v1198)
   ============================================================ */
function dessinerReglagesEcran(z){
  z.appendChild(blocPleinEcran());
  z.appendChild(blocQrEcran());
  if(typeof blocTransitionsEcran === 'function') z.appendChild(blocTransitionsEcran());
  z.appendChild(blocAdresses());
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'margin-bottom:10px;padding:12px;font-size:13px;';
  b.textContent = '📍 Gérer les emplacements';
  b.addEventListener('click', () => ouvrirGestionLieux());
  z.appendChild(b);
}

/* 🔳 Le QR code de Saint-Brieuc sur les écrans — voir « LE QR CODE DE
   SAINT-BRIEUC SUR LES ÉCRANS » dans le Worker. */
function blocQrEcran(){
  const z = document.createElement('div');
  z.className = 'afQrBloc';
  const q = qrEcran;
  if(!q){
    z.innerHTML = '<div class="afResume">🔳 Le QR code de Saint-Brieuc n’a pas pu être lu.</div>';
    return z;
  }
  const svg = (typeof QR_BUREAUX !== 'undefined' && QR_BUREAUX['saint-brieuc']) || '';
  const tete = document.createElement('div');
  tete.className = 'afQrTete';
  tete.innerHTML = (svg ? '<div class="afQrImg">' + svg + '</div>' : '') +
    '<div style="flex:1;min-width:0;"><strong>🔳 QR code de Saint-Brieuc sur les écrans</strong>' +
    '<div class="afResume" style="margin:4px 0 0;">Un encart fixe en bas à droite, avec ta phrase : le carrousel se resserre pour lui ' +
    'laisser sa place, rien n’est caché. Il mène à ' + echEcran(String(q.adresse || '').replace(/^https?:\/\//, '')) + '.</div></div>';
  z.appendChild(tete);
  if(!q.pageActive){
    const a = document.createElement('div');
    a.className = 'afAlerte';
    a.innerHTML = '⚠️ <strong>La page publique de Saint-Brieuc est coupée</strong> (Gestion › L’accueil › 📍 St-Brieuc) : ' +
      'le QR code ne s’affiche pas tant qu’elle l’est — il mènerait à « page pas active ».';
    z.appendChild(a);
  }
  [['qrAccueil', 'accueil', '🏠 Sur l’écran de l’accueil'], ['qrVitrine', 'vitrine', '🪟 Sur l’écran de la vitrine']].forEach(([cle, k, titre]) => {
    if(typeof interrupteur !== 'function') return;
    z.appendChild(interrupteur({
      cle: cle, titre: titre, ouvert: !!q[k],
      quandOuvert: q.pageActive ? 'Le QR code est à l’écran, en bas à droite.' : 'Il apparaîtra dès que la page publique de Saint-Brieuc sera ouverte.',
      quandFerme: 'Pas de QR code sur cet écran.',
      basculer: async (oui) => {
        const r = await appelPrep({ action: 'ecranQrPoser', cle: cle, valeur: oui ? '1' : '0' });
        if(r && r.qr) qrEcran = r.qr;
      },
      apres: () => dessinerOngletEcran()
    }));
  });
  const t = document.createElement('div');
  t.innerHTML = '<label for="ecrQrTexte">La phrase sous le QR code</label>' +
    '<div style="display:flex;gap:8px;align-items:center;">' +
      '<input type="text" id="ecrQrTexte" maxlength="80" style="flex:1;min-width:0;margin:0;">' +
      '<button type="button" class="btn btn-secondary" style="width:auto;margin:0;padding:10px 14px;flex-shrink:0;">💾</button></div>' +
    '<div class="afResume" style="margin-top:6px;">80 caractères au plus — elle se lit de loin : courte, c’est mieux.</div>';
  const ch = t.querySelector('input');
  ch.value = q.texte || '';
  const bS = t.querySelector('button');
  bS.title = 'Enregistrer la phrase';
  bS.addEventListener('click', async () => {
    bS.disabled = true;
    try{
      const r = await appelPrep({ action: 'ecranQrPoser', cle: 'qrTexte', valeur: ch.value });
      if(r && r.qr){ qrEcran = r.qr; ch.value = r.qr.texte; }
      showToast('Phrase enregistrée ✅');
    }catch(e){ showToast('Impossible : ' + e.message); }
    bS.disabled = false;
  });
  z.appendChild(t);
  return z;
}


/* ============================================================
   LES EMPLACEMENTS

   Ajouter un lieu, changer un émoji, retoucher la phrase du SMS.
   Tout se garde sur le poste et se partage si le classeur répond.
   ============================================================ */

function ouvrirGestionLieux(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 95vw);max-height:90vh;overflow-y:auto;';

  boite.innerHTML = '<h3>📍 Emplacements</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
      'line-height:1.5;">Ils apparaissent dans le planning ci-dessous ' +
      'et dans les rappels de cours.</div>' +
    '<div id="glxListe"></div>' +
    '<button class="btn btn-secondary" id="glxAjouter" ' +
      'style="margin-top:12px;padding:11px;font-size:13px;">' +
      '➕ Ajouter un emplacement</button>' +
    '<button class="btn btn-secondary" id="glxRaz" ' +
      'style="margin-top:6px;padding:10px;font-size:12px;color:var(--muted);">' +
      '↩️ Revenir à la liste d\'origine</button>';

  const dessiner = () => {
    const liste = lieuxActuels();
    const z = boite.querySelector('#glxListe');
    z.innerHTML = '';

    liste.forEach((l, i) => {
      const ligne = document.createElement('div');
      ligne.style.cssText = 'display:flex;gap:9px;align-items:center;padding:9px 0;' +
        'border-bottom:1px solid rgba(255,255,255,.05);font-size:14px;';

      ligne.innerHTML = '<span style="font-size:20px;flex-shrink:0;width:28px;' +
        'text-align:center;">' + (l.emoji || '·') + '</span>' +
        '<span style="flex:1;min-width:0;line-height:1.4;">' +
          '<strong>' + String(l.nom).replace(/</g, '&lt;') + '</strong>' +
          (l.sansVehicule ? ' <span style="font-size:10px;color:var(--muted);">' +
                            'sans véhicule</span>' : '') +
          '<div style="font-size:11px;color:var(--muted);">' +
            (l.sms ? String(l.sms).replace(/</g, '&lt;').slice(0, 52) +
                     (l.sms.length > 52 ? '…' : '')
                   : 'rien dans le SMS') +
          '</div></span>';

      /* Monter, descendre : l'ordre est celui des listes */
      [['▲', -1], ['▼', 1]].forEach(([signe, sens]) => {
        const bo = document.createElement('button');
        bo.className = 'btn btn-secondary';
        bo.style.cssText = 'width:auto;padding:5px 7px;font-size:10px;margin:0;' +
          'flex-shrink:0;';
        bo.textContent = signe;
        bo.disabled = (sens < 0 && i === 0) || (sens > 0 && i === liste.length - 1);
        bo.addEventListener('click', () => {
          const copie = liste.slice();
          const j = i + sens;
          [copie[i], copie[j]] = [copie[j], copie[i]];
          garderLieux(copie);
          dessiner();
        });
        ligne.appendChild(bo);
      });

      const bMod = document.createElement('button');
      bMod.className = 'btn btn-secondary';
      bMod.style.cssText = 'width:auto;padding:7px 9px;font-size:13px;margin:0;' +
        'flex-shrink:0;';
      bMod.textContent = '✏️';
      bMod.addEventListener('click', async () => {
        const modifie = await ficheLieu(l);
        if(!modifie) return;
        const copie = liste.slice();
        copie[i] = modifie;
        garderLieux(copie);
        showToast('Enregistré ✅');
        dessiner();
      });
      ligne.appendChild(bMod);

      const bSup = document.createElement('button');
      bSup.className = 'btn btn-secondary';
      bSup.style.cssText = 'width:auto;padding:7px 9px;font-size:13px;margin:0;' +
        'flex-shrink:0;color:var(--red);border-color:var(--red);';
      bSup.textContent = '🗑️';
      bSup.addEventListener('click', async () => {
        if(liste.length <= 1){
          showToast('Il faut garder au moins un emplacement.');
          return;
        }
        if(!await confirmer('Retirer ' + l.nom + ' ?\n\n' +
            'Les cours déjà réglés dessus le gardent, mais on ne ' +
            'pourra plus le choisir.')) return;
        garderLieux(liste.filter((_, j) => j !== i));
        showToast('Retiré ✅');
        dessiner();
      });
      ligne.appendChild(bSup);

      z.appendChild(ligne);
    });
  };

  boite.querySelector('#glxAjouter').addEventListener('click', async () => {
    const nouveau = await ficheLieu(null);
    if(!nouveau) return;

    const liste = lieuxActuels();
    if(liste.some(x => x.cle === nouveau.cle)){
      showToast('Cet emplacement existe déjà.');
      return;
    }
    garderLieux(liste.concat([nouveau]));
    showToast('Ajouté ✅');
    dessiner();
  });

  boite.querySelector('#glxRaz').addEventListener('click', async () => {
    if(!await confirmer('Revenir à la liste d\'origine ?\n\n' +
        'Tes ajouts et tes modifications seront perdus.')) return;
    garderLieux(EMPLACEMENTS_BASE);
    showToast('Liste d\'origine rétablie ✅');
    dessiner();
  });

  const r = document.createElement('div');
  r.className = 'btn-row';
  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary';
  bF.textContent = 'Fermer';
  bF.addEventListener('click', () => {
    fermerFond(fond);
    afficherEcran();
  });
  r.appendChild(bF);
  boite.appendChild(r);

  fond.appendChild(boite);
  document.body.appendChild(fond);
  dessiner();
}


/* La fiche d'un emplacement */
function ficheLieu(l){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(480px, 94vw);max-height:88vh;overflow-y:auto;';

    boite.innerHTML =
      '<h3>' + (l ? String(l.nom).replace(/</g, '&lt;') : 'Nouvel emplacement') +
      '</h3>' +

      '<div class="duo">' +
        '<div><label for="flEmoji">Émoji</label>' +
          '<input type="text" id="flEmoji" maxlength="4" ' +
            'style="text-align:center;font-size:24px;padding:8px;"></div>' +
        '<div><label for="flNom">Nom</label>' +
          '<input type="text" id="flNom" placeholder="Ex : Parking arrière"></div>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--muted);margin:-8px 0 10px;' +
        'line-height:1.5;">Colle un émoji depuis ton clavier, ou choisis ' +
        'ci-dessous.</div>' +

      '<div id="flPalette" style="display:flex;flex-wrap:wrap;gap:6px;' +
        'margin-bottom:14px;"></div>' +

      '<label for="flSms">Ce que reçoit l\'élève dans son SMS</label>' +
      '<textarea id="flSms" rows="3" ' +
        'placeholder="Laisse vide pour ne rien dire."></textarea>' +

      '<label style="display:flex;align-items:center;gap:10px;' +
        'text-transform:none;font-size:15px;color:var(--cream);margin:4px 0 10px;">' +
        '<input type="checkbox" id="flSansVeh" style="width:19px;height:19px;">' +
        'Pas de véhicule à cet endroit</label>';

    if(l){
      boite.querySelector('#flEmoji').value = l.emoji || '';
      boite.querySelector('#flNom').value = l.nom || '';
      boite.querySelector('#flSms').value = l.sms || '';
      boite.querySelector('#flSansVeh').checked = !!l.sansVehicule;
    }

    const PALETTE = ['🛣️', '🅿️', '🏢', '🏍️', '🛵', '📱', '📚', '🖥️',
                     '🚗', '🚙', '🏁', '⛽', '🔧', '🚦', '📍', '🏫',
                     '🚏', '🌳', '🅰️', '🅱️'];
    const zp = boite.querySelector('#flPalette');
    PALETTE.forEach(e => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = e;
      b.style.cssText = 'width:38px;height:38px;padding:0;border-radius:9px;' +
        'border:1px solid var(--line);background:transparent;font-size:19px;' +
        'cursor:pointer;margin:0;';
      b.addEventListener('click', () => {
        boite.querySelector('#flEmoji').value = e;
      });
      zp.appendChild(b);
    });

    const r = document.createElement('div');
    r.className = 'btn-row';

    const bA = document.createElement('button');
    bA.className = 'btn btn-secondary';
    bA.textContent = 'Annuler';
    bA.addEventListener('click', () => {
      fermerFond(fond);
      resolve(null);
    });
    r.appendChild(bA);

    const bO = document.createElement('button');
    bO.className = 'btn btn-primary';
    bO.textContent = l ? '💾 Enregistrer' : '➕ Ajouter';
    bO.addEventListener('click', () => {
      const nom = boite.querySelector('#flNom').value.trim();
      if(!nom){ showToast('Donne-lui un nom.'); return; }

      /* La clé ne change jamais : c'est elle qui est écrite dans
         les cours déjà réglés. */
      const cle = l ? l.cle
                    : normaliserMot(nom).replace(/[^a-z0-9]/g, '') ||
                      ('lieu' + Date.now());

      fermerFond(fond);
      resolve({
        cle: cle,
        emoji: boite.querySelector('#flEmoji').value.trim(),
        nom: nom,
        sms: boite.querySelector('#flSms').value.trim(),
        sansVehicule: boite.querySelector('#flSansVeh').checked
      });
    });
    r.appendChild(bO);

    boite.appendChild(r);
    fond.appendChild(boite);
    document.body.appendChild(fond);
    setTimeout(() => boite.querySelector('#flNom').focus(), 100);
  });
}


/* Les moniteurs, pour changer celui d'une ligne */
async function remplirMoniteursEcran(sel, actuel){
  let gens = (typeof moniteursActifs !== 'undefined' ? moniteursActifs : []) || [];

  /* L'action « moniteurs » n'existe pas côté serveur : l'appel
     échouait toujours, après avoir attendu le réseau. La liste
     vient du bureau, déjà en mémoire. */
  if(!gens.length && typeof etatBureau !== 'undefined'){
    const vus = [];
    (etatBureau.eleves || []).forEach(e => {
      const m = String(e.moniteur || '').trim();
      if(m && vus.indexOf(m) === -1) vus.push(m);
    });
    gens = vus.sort();
    if(typeof moniteursActifs !== 'undefined') moniteursActifs = gens;
  }

  /* Un moniteur qui n'est plus dans la liste reste proposé :
     sinon la ligne changerait de main toute seule. */
  if(actuel && gens.indexOf(actuel) === -1) gens = [actuel].concat(gens);

  sel.innerHTML = '<option value="">— moniteur —</option>' +
    gens.map(g => '<option value="' + String(g).replace(/"/g, '&quot;') + '"' +
      (g === actuel ? ' selected' : '') + '>' +
      String(g).replace(/</g, '&lt;') + '</option>').join('');
}


/* Les véhicules de la flotte, chargés une fois pour tout l'écran */
let flotteEcran = null;

async function chargerFlotteEcran(){
  if(flotteEcran !== null) return flotteEcran;
  try{
    const d = await appelPrep({ action: 'flotteList' });
    flotteEcran = (d && d.vehicules) || [];
  }catch(e){ flotteEcran = []; }
  return flotteEcran;
}

/* Remplit une liste de véhicules, en gardant celui déjà choisi */
async function remplirVehiculesEcran(sel, actuel){
  const liste = (await chargerFlotteEcran())
    .filter(v => v.etat !== 'vendu' && v.categorie !== 'remorque');

  const connu = liste.some(v => v.nom === actuel);

  sel.innerHTML = '<option value="">— aucun —</option>' +
    liste.map(v =>
      '<option value="' + String(v.nom).replace(/"/g, '&quot;') + '"' +
      (v.indisponible ? ' disabled' : '') + '>' +
      (v.indisponible ? '⛔ ' : '') + v.nom +
      (v.immat ? ' · ' + v.immat : '') +
      (v.indisponible ? ' — ' + (v.motifIndispo || 'au garage') : '') +
      '</option>').join('') +
    '<option value="autre">⌨️ Autre véhicule…</option>';

  /* Un véhicule saisi à la main, ou sorti de la flotte depuis :
     on le garde plutôt que de l'effacer en silence. */
  if(actuel && !connu){
    sel.value = 'autre';
    const champ = sel.parentElement
      ? sel.parentElement.querySelector('input[placeholder="Véhicule"]') : null;
    if(champ){ champ.value = actuel; champ.style.display = 'block'; }
  }else{
    sel.value = actuel || '';
  }
}


/* Les véhicules de l'auto-école. Une liste plutôt qu'un champ
   libre : c'est toujours l'un ou l'autre, et une faute de frappe
   sur l'écran de l'accueil se voit de loin. */
const MODELES_VEHICULE = ['', 'A3', 'Q3', 'Simu'];

/* « A3 4 » se sépare en modèle et numéro pour le formulaire */
function decouperVehicule(v){
  const t = String(v || '').trim();
  if(!t) return { modele: '', numero: '' };

  const m = t.match(/^(A3|Q3|Simu)\s*(.*)$/i);
  if(m){
    return {
      modele: m[1].charAt(0).toUpperCase() +
              m[1].slice(1).toLowerCase().replace(/^3$/, '3'),
      numero: m[2].trim()
    };
  }
  /* Une saisie ancienne, sans modèle : elle reste dans le numéro */
  return { modele: '', numero: t };
}


/* ------------------------------------------------------------
   LE NOM SUR L'ÉCRAN PUBLIC

   ⚠️ CETTE RÈGLE SE TROMPE, ET ON LE SAIT.

   « Ambre Guillebon » devient « Ambre G. » — mais « La Perle
   Mossongo Molodjo » devient « La M. ». Aucune règle ne sait où
   finit un prénom : « La Perle Mossongo Molodjo » et « Jean Pierre
   Martin Dupont » ont la même forme et se coupent ailleurs.

   On ne l'a pas rendue plus bavarde pour autant : « tout sauf le
   dernier mot » serait plus juste et plus IDENTIFIANT — l'inverse
   du but sur un écran de salle d'attente.

   Le remède est le champ « Nom affiché » de la fiche, saisi à la
   main pour les quelques cas qui le demandent. C'est « nomPublic »
   qui le consulte.

   ⚠️ Cette fonction existe à l'identique dans apps-script.js et
   dans cloudflare-worker.js. test-nom-affiche.js refuse qu'elles
   divergent.
   ------------------------------------------------------------ */
function abregeNom(nom){
  const b = String(nom || '').trim().split(/\s+/);
  if(b.length < 2) return b[0] || '';
  return b[0] + ' ' + b[b.length - 1].charAt(0).toUpperCase() + '.';
}

/* Le nom choisi à la main s'il existe, la règle sinon. La fiche est
   déjà en mémoire : aucun appel réseau. */
function nomPublicEleve(nom){
  const propre = String(nom || '').trim();
  if(!propre) return '';
  const f = (typeof ficheDe === 'function') ? ficheDe(propre) : null;
  const choisi = (f && String(f.nomAffiche || '').trim()) || '';
  return choisi || abregeNom(propre);
}


/* L'aperçu sous le nom, et le clic qui le corrige. */
function peindreApercuNomPublic(zone, nom){
  if(!zone || !nom) return;
  const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
  const choisi = (f && String(f.nomAffiche || '').trim()) || '';

  zone.textContent = '👁️ ' + nomPublicEleve(nom) +
    (choisi ? ' ✏️' : '');
  zone.title = choisi
    ? 'Nom affiché choisi à la main — clique pour le changer'
    : "Ce que la salle d'attente verra — clique pour le corriger";

  if(zone.dataset.branche) return;
  zone.dataset.branche = 'oui';
  zone.addEventListener('click', async () => {
    if(await corrigerNomPublic(nom)) peindreApercuNomPublic(zone, nom);
  });
}

/* ------------------------------------------------------------
   CORRIGER CE QUE LA SALLE D'ATTENTE VOIT

   David : « La Perle Mossongo Molodjo — La Perle c'est son
   prénom, Mossongo Molodjo son nom de famille, et j'ai des élèves
   avec plusieurs noms de famille ». Aucune règle ne sait couper ça.

   On n'écrit donc rien de neuf : on ÉCRIT LA FICHE, par la même
   fonction que le reste — un champ de plus au répertoire, pas un
   réglage à part. Vide, la règle reprend la main.
   ------------------------------------------------------------ */
async function corrigerNomPublic(nom){
  const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
  const actuel = (f && String(f.nomAffiche || '').trim()) || '';

  const saisi = await demander(
    "Ce que la salle d'attente affichera pour « " + nom + " ».\n\n" +
    'Laisse vide pour revenir à l\'abréviation automatique (' +
    abregeNom(nom) + ').',
    actuel, '👁️ Nom affiché');
  if(saisi === null || saisi === false) return false;

  const propre = String(saisi).trim().replace(/\s+/g, ' ');
  if(propre === actuel) return false;

  /* ⚠️ LE NOM ENTIER SUR UN ÉCRAN PUBLIC : on prévient, on
     n'interdit pas. C'est sa salle d'attente, pas la nôtre — mais
     personne ne doit y arriver sans l'avoir voulu. */
  if(propre && (typeof normaliserMot === 'function') &&
     normaliserMot(propre) === normaliserMot(nom)){
    if(!await confirmer(
      "C'est le nom entier. Il s'affichera tel quel sur l'écran de " +
      "la salle d'attente, visible de tous.\n\nC'est bien ce que tu veux ?",
      '👁️ Nom affiché', true)) return false;
  }

  try{
    await appelPrep({ action: 'ficheSet', eleve: nom,
                      nomAffiche: propre || 'non' });
    /* La mémoire suit : l'aperçu se repeint sans recharger. */
    if(f) f.nomAffiche = propre;
    else if(typeof fichesEleves !== 'undefined'){
      fichesEleves.push({ eleve: nom, nomAffiche: propre });
    }
    showToast(propre ? '👁️ ' + propre : '👁️ Abréviation automatique');
    return true;
  }catch(e){
    showToast('Impossible : ' + (e.message || e));
    return false;
  }
}


/* Le jeton, demandé une fois au Worker : il le connaît déjà, et
   le recopier à la main dans chaque adresse était une source
   d'oubli. */
let jetonEcran = null;

async function chargerJetonEcran(){
  if(jetonEcran !== null) return jetonEcran;
  try{
    const d = await appelPrep({ action: 'ecranJeton' });
    jetonEcran = (d && d.jeton) || '';
  }catch(e){ jetonEcran = ''; }
  return jetonEcran;
}


/* Les adresses des deux écrans, à copier une fois pour toutes */
function blocAdresses(){
  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:10px 12px;margin-bottom:14px;';
  d.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:700;' +
    'color:var(--accent-text);">📺 Adresses des écrans</summary>';

  const a = document.createElement('div');
  a.style.cssText = 'font-size:11px;color:var(--muted);margin:10px 0;line-height:1.55;';
  a.innerHTML = 'À ouvrir sur le téléviseur, en plein écran. Le jeton est déjà ' +
    'dans l\'adresse : copie-la telle quelle.<br>Elles ne donnent accès qu\'à ' +
    'l\'affichage : ni bilans, ni élèves, ni réglages.';
  d.appendChild(a);

  /* Déduite de l'adresse de la page — voir pageVoisine dans
     ec-noyau.js. Écrite en dur, elle envoyait les téléviseurs sur
     l'ancienne adresse après le déménagement du 12 septembre. */
  const base = CONFIG.LIEN_ECRAN;
  const champs = [];

  /* « anonyme=1 » n'a plus lieu d'être dans l'adresse : c'est
     devenu le comportement par défaut (script v175). Les adresses
     déjà collées dans les téléviseurs continuent de marcher — un
     paramètre en trop n'a jamais gêné personne. */
  [['🏠 Accueil — avec le planning', 'accueil'],
   ['🪟 Vitrine — sans le planning', 'vitrine']]
  .forEach(([nom, suite]) => {
    const t = document.createElement('div');
    t.style.cssText = 'font-size:12px;font-weight:700;margin:10px 0 4px;';
    t.textContent = nom;
    d.appendChild(t);

    const r = document.createElement('div');
    r.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';

    const z = document.createElement('input');
    z.type = 'text';
    z.value = 'Lecture du jeton…';
    z.readOnly = true;
    z.style.cssText = 'flex:1;min-width:0;font-size:12px;padding:9px 10px;margin:0;';
    z.addEventListener('focus', () => z.select());
    r.appendChild(z);
    champs.push([z, suite]);

    /* Copier d'un geste : l'adresse est longue et se recopie mal */
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;padding:9px 11px;font-size:12px;margin:0;flex-shrink:0;';
    b.textContent = '📋';
    b.title = 'Copier l\'adresse';
    b.addEventListener('click', async () => {
      try{
        await navigator.clipboard.writeText(z.value);
        showToast('Adresse copiée ✅');
      }catch(e){
        z.focus(); z.select();
        showToast('Sélectionnée : copie-la avec Ctrl+C');
      }
    });
    r.appendChild(b);

    d.appendChild(r);
  });

  /* Le jeton arrive après : on remplit les adresses quand il est là */
  chargerJetonEcran().then(j => {
    champs.forEach(([z, suite]) => {
      z.value = j
        ? base + '?t=' + encodeURIComponent(j) + '&ou=' + suite
        : base + '?t=JETON_ABSENT&ou=' + suite;
    });
    if(!j){
      a.innerHTML = '⚠️ <strong>ECRAN_TOKEN n\'est pas réglé dans Cloudflare.</strong><br>' +
        'Ajoute cette variable, puis reviens ici : les adresses se rempliront seules.';
      a.style.color = 'var(--warn-text)';
    }
  });

  const n = document.createElement('div');
  n.style.cssText = 'font-size:11px;color:var(--muted);line-height:1.5;margin-top:8px;';
  n.innerHTML = '💡 Le planning s\'affiche en <strong>« Ambre G. »</strong>, ' +
    'jamais en nom entier : cet écran est vu par d\'autres élèves et par ' +
    'des visiteurs.<br>Pour les noms complets — dans un bureau fermé — ' +
    'ajoute <strong>&amp;complet=1</strong> à l\'adresse. La vitrine, elle, ' +
    'ne l\'accepte jamais : ce qui se voit du trottoir ne nomme personne.';
  d.appendChild(n);

  return d;
}


/* ============================================================
   CRÉER OU MODIFIER UNE DIAPOSITIVE
   ============================================================ */

function ouvrirEditeurDiapo(d, preset){
  /* 🎨 v1199 — une diapositive du studio s'ouvre dans le studio */
  if(d && d.type === 'compo' && typeof ouvrirStudio === 'function') return ouvrirStudio({ diapo: d });
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(540px, 94vw);max-height:88vh;overflow-y:auto;';

  boite.innerHTML =
    '<h3>' + (d ? 'Modifier la diapositive' : 'Nouvelle diapositive') + '</h3>' +

    '<label for="diType">Rôle de cette diapositive</label>' +
    '<select id="diType">' +
      '<option value="message">🔄 Elle tourne dans le carrousel</option>' +
      '<option value="video">🎬 Vidéo</option>' +
      '<option value="bandeau">📢 Texte défilant en bas</option>' +
      '<option value="fond">🖼️ Fond fixe de la vitrine</option>' +
      '<option value="panneau">📝 Texte fixe à gauche de la vitrine</option>' +
    '</select>' +
    '<div id="diAideType" style="font-size:11px;color:var(--muted);' +
      'margin:-8px 0 12px;line-height:1.5;"></div>' +

    '<label for="diTitre">Titre (facultatif)</label>' +
    '<input type="text" id="diTitre" placeholder="Ex : Portes ouvertes">' +

    '<label for="diTexte">Message</label>' +
    '<textarea id="diTexte" rows="4" placeholder="Le texte affiché en grand. ' +
      'Laisse vide si tu ne mets qu\'une image."></textarea>' +

    '<label>Image (facultatif)</label>' +
    '<div id="diApercu" style="margin-bottom:8px;"></div>' +
    '<div id="diColler" tabindex="0" style="border:2px dashed var(--line);' +
      'border-radius:10px;padding:14px 12px;text-align:center;font-size:13px;' +
      'color:var(--muted);cursor:pointer;margin-bottom:6px;">' +
      '📋 <strong>Colle ton image ici</strong><br>' +
      '<span style="font-size:11px;">Ctrl+V, ou fais glisser le fichier</span></div>' +
    '<input type="file" id="diFichier" accept="image/*" ' +
      'style="font-size:13px;padding:9px;margin-bottom:12px;">' +

    '<div class="duo">' +
      '<div><label for="diOu">Sur quel écran</label>' +
        '<select id="diOu">' +
          '<option value="les-deux">🏠🪟 Les deux</option>' +
          '<option value="accueil">🏠 Accueil seulement</option>' +
          '<option value="vitrine">🪟 Vitrine seulement</option>' +
        '</select></div>' +
      '<div><label for="diDuree">Durée à l\'écran</label>' +
        '<select id="diDuree">' +
          '<option value="6">6 secondes</option>' +
          '<option value="10">10 secondes</option>' +
          '<option value="15" selected>15 secondes</option>' +
          '<option value="25">25 secondes</option>' +
          '<option value="40">40 secondes</option>' +
          '<option value="60">1 minute</option>' +
          '<option value="120">2 minutes</option>' +
          '<option value="300">5 minutes</option>' +
          '<option value="0">🔁 En boucle</option>' +
        '</select></div>' +
    '</div>' +

    '<div class="duo">' +
      '<div><label for="diDu">À partir du (facultatif)</label>' +
        '<input type="date" id="diDu"></div>' +
      '<div><label for="diAu">Jusqu\'au (facultatif)</label>' +
        '<input type="date" id="diAu"></div>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-bottom:12px;line-height:1.5;">' +
      'Sans dates, elle passe en permanence. Avec, elle apparaît et disparaît ' +
      'toute seule — pratique pour une porte ouverte ou une fermeture.</div>';

  let imageChoisie = (d && d.image) || '';

  /* Le rôle change ce qui compte : un fond n'a pas de durée, un
     panneau n'a pas d'image. */
  const selType = boite.querySelector('#diType');
  const aideType = boite.querySelector('#diAideType');

  const majSelonType = () => {
    const t = selType.value;
    const explications = {
      message: 'Elle passe à l\'écran avec les autres, chacune son tour.',
      video: 'Colle l\'adresse du fichier .mp4 dans le champ Message. ' +
             'Elle est lue sans le son et JAMAIS coupée : la durée choisie ' +
             'est arrondie au tour complet. « En boucle » la fait tourner ' +
             'sans fin si elle est seule à l\'écran.',
      bandeau: 'Défile en permanence en bas de l\'écran, pendant que le reste ' +
               'tourne. Plusieurs textes défilants se suivent à la queue leu leu.',
      fond: 'Image affichée en permanence derrière tout le reste, sur la ' +
            'vitrine. Sans elle, le dégradé vert par défaut s\'applique.',
      panneau: 'Texte affiché en permanence à gauche de la vitrine, pendant ' +
               'que les photos tournent à droite. Une seule à la fois.'
    };
    aideType.textContent = explications[t] || '';

    /* Ce qui ne sert pas se masque plutôt que d'induire en erreur */
    const ligneDuree = boite.querySelector('#diDuree').closest('div');
    if(ligneDuree){
      ligneDuree.style.display = (t === 'message' || t === 'video') ? 'block' : 'none';
    }

    /* Une vidéo, un panneau et un bandeau n'ont pas d'image */
    const sansImage = (t === 'panneau' || t === 'video' || t === 'bandeau');
    ['#diColler', '#diFichier', '#diApercu'].forEach(s => {
      const e = boite.querySelector(s);
      if(e) e.style.display = sansImage ? 'none' : '';
    });

    /* Un bandeau n'a pas de titre : tout tient dans le message */
    const lblTitre = boite.querySelector('label[for="diTitre"]');
    const zTitre = boite.querySelector('#diTitre');
    if(lblTitre && zTitre){
      const cacher = (t === 'bandeau');
      lblTitre.style.display = cacher ? 'none' : '';
      zTitre.style.display = cacher ? 'none' : '';
    }

    /* Le champ « Message » change de rôle pour une vidéo */
    const lblTexte = boite.querySelector('label[for="diTexte"]');
    const zTexte = boite.querySelector('#diTexte');
    if(lblTexte && zTexte){
      if(t === 'video'){
        lblTexte.textContent = 'Adresse de la vidéo';
        zTexte.rows = 2;
        zTexte.placeholder = CONFIG.LIEN_ECRAN.replace(/ecran\.html$/, 'videos/ma-video.mp4');
      }else if(t === 'bandeau'){
        lblTexte.textContent = 'Le texte qui défile';
        zTexte.rows = 2;
        zTexte.placeholder = 'Ex : Inscriptions ouvertes pour la session de septembre — ' +
                             '09 83 55 56 87';
      }else{
        lblTexte.textContent = 'Message';
        zTexte.rows = 4;
        zTexte.placeholder = 'Le texte affiché en grand. Laisse vide si tu ne ' +
                             'mets qu\'une image.';
      }
    }
  };

  selType.addEventListener('change', majSelonType);

  const apercu = boite.querySelector('#diApercu');
  const montrer = () => {
    apercu.innerHTML = imageChoisie
      ? '<img src="' + imageChoisie + '" style="max-width:100%;max-height:170px;' +
        'border-radius:9px;border:1px solid var(--line);">'
      : '';
  };

  if(d){
    /* ⚠️ v1199 — un texte défilant ou une vidéo rouvert ici repassait
       en « elle tourne dans le carrousel » : l'enregistrer le
       changeait de rôle sans qu'on l'ait demandé. */
    selType.value = ['fond', 'panneau', 'bandeau', 'video'].indexOf(d.type) !== -1 ? d.type : 'message';
    boite.querySelector('#diTitre').value = d.titre || '';
    boite.querySelector('#diTexte').value = d.contenu || '';
    boite.querySelector('#diOu').value = d.ou || 'les-deux';
    boite.querySelector('#diDuree').value = String(d.duree || 15);
    boite.querySelector('#diDu').value = d.du || '';
    boite.querySelector('#diAu').value = d.au || '';
  }else if(preset){
    /* 🎨 v1199 — choisi dans « ➕ Nouvelle diapositive » */
    selType.value = preset === 'image' ? 'message' : preset;
  }
  montrer();
  majSelonType();

  /* Coller, glisser, ou choisir : les trois façons */
  const prendre = async fichier => {
    if(!fichier) return;
    try{
      imageChoisie = await compresserImage(fichier);
      montrer();
  majSelonType();
    }catch(e){ showToast('Image refusée : ' + e.message); }
  };

  const zc = boite.querySelector('#diColler');
  zc.addEventListener('click', () => zc.focus());
  zc.addEventListener('paste', ev => {
    const items = (ev.clipboardData && ev.clipboardData.items) || [];
    for(let i = 0; i < items.length; i++){
      if(items[i].type && items[i].type.indexOf('image') === 0){
        ev.preventDefault();
        prendre(items[i].getAsFile());
        return;
      }
    }
  });
  ['dragenter', 'dragover'].forEach(n => zc.addEventListener(n, ev => {
    ev.preventDefault();
    zc.style.borderColor = 'var(--orange)';
  }));
  ['dragleave', 'drop'].forEach(n => zc.addEventListener(n, ev => {
    ev.preventDefault();
    zc.style.borderColor = 'var(--line)';
  }));
  zc.addEventListener('drop', ev => {
    const f = (ev.dataTransfer && ev.dataTransfer.files || [])[0];
    if(f && f.type.indexOf('image') === 0) prendre(f);
  });
  boite.querySelector('#diFichier').addEventListener('change', ev => {
    prendre(ev.target.files && ev.target.files[0]);
  });

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => fermerFond(fond));
  r.appendChild(bAnn);

  if(d){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer cette diapositive ?')) return;
      try{
        await appelPrep({ action: 'ecranDelete', id: d.id });
        fermerFond(fond);
        showToast('Supprimée ✅');
        afficherEcran();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bSup);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = d ? '💾 Enregistrer' : '➕ Ajouter';
  bOk.addEventListener('click', async () => {
    const titre = boite.querySelector('#diTitre').value.trim();
    const texte = boite.querySelector('#diTexte').value.trim();

    if(selType.value === 'video' && !/^https?:\/\/.+\.(mp4|webm|ogg)/i.test(texte)){
      showToast('Colle l\'adresse complète d\'un fichier .mp4');
      return;
    }
    if(!titre && !texte && !imageChoisie){
      showToast('Mets au moins un texte ou une image.');
      return;
    }

    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      await appelPrep({
        action: 'ecranSet',
        id: d ? d.id : '',
        type: (selType.value === 'message')
                ? (imageChoisie ? 'image' : 'message')
                : selType.value,
        titre: titre,
        contenu: texte,
        /* L'image n'est renvoyée que si elle a changé : elle est
           lourde, et le serveur garde l'ancienne sinon. */
        image: (imageChoisie && imageChoisie !== (d && d.image)) ? imageChoisie : '',
        ou: boite.querySelector('#diOu').value,
        duree: boite.querySelector('#diDuree').value,
        actif: d ? (d.actif ? 'oui' : 'non') : 'oui',
        du: boite.querySelector('#diDu').value,
        au: boite.querySelector('#diAu').value,
        ordre: d ? d.ordre : 0,
        par: ACCES.moniteur || ''
      });
      fermerFond(fond);
      showToast(d ? 'Diapositive modifiée ✅' : 'Diapositive ajoutée ✅');
      afficherEcran();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
      bOk.textContent = d ? '💾 Enregistrer' : '➕ Ajouter';
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#diTitre').focus(), 100);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-ecran.js'] = true;
