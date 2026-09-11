/* Déployé le 11/09/2026 à 14:04 — v956 */
/* ============================================================
   ec-aac-cs.js
   Le suivi de la conduite supervisée et de la conduite accompagnée.

   ─ POURQUOI CETTE VUE EXISTE ─

   Un élève en CS ou en AAC disparaît de tous les écrans pendant des
   mois. Il n'a pas de date d'examen, donc il n'est dans aucune liste
   du permis. Il ne prend pas de leçons toutes les semaines, donc il
   ne remonte pas dans les rappels. Il conduit avec son
   accompagnateur, et l'auto-école ne le revoit que le jour où
   quelqu'un y repense.

   David : « il faut que l'on voie AAC et CS, mais ce sera
   beaucoup plus simple : c'est juste une liste dans suivi avec la
   date de RVP, depuis combien de temps ils sont partis, est-ce qu'on
   leur a demandé s'ils sont prêts à faire un examen blanc, est-ce
   que l'examen blanc est planifié — sinon pouvoir le prévoir. »

   ─ CE QUE CETTE VUE NE FAIT PAS ─

   ELLE NE POSE PAS D'EXAMEN BLANC. Quand l'élève dit oui, elle
   appelle noterExamenBlanc et envoyerConsigne — les deux fonctions
   que le bureau utilise déjà partout ailleurs — et l'élève entre
   dans « 📝 Examen blanc à prévoir » avec tous les autres. À partir
   de là, plus rien n'est spécifique à la CS.

   Un deuxième endroit qui poserait des examens blancs, ce serait
   exactement la faute qu'on répare depuis dix jours.

   ─ CE QU'ELLE MONTRE, ET RIEN DE PLUS ─

   Le compteur est CALCULÉ, jamais saisi : une durée qu'on écrit est
   fausse le lendemain. Le seuil est un réglage du bureau, pas une
   donnée d'élève — il vit dans la feuille Config.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ------------------------------------------------------------
   LES RÉGLAGES DU BUREAU

   Deux nombres, réglables, partagés par tous les postes. Ils vivent
   dans la feuille Config sous une seule clé « reglages » : un sac
   plutôt qu'une clé par nombre, pour que le prochain seuil n'oblige
   pas à retoucher le serveur.

   PAS dans localStorage : un seuil réglé sur le téléphone du bureau
   et invisible depuis l'ordinateur, ce serait deux vérités.
   ------------------------------------------------------------ */
const REGLAGES_PAR_DEFAUT = {
  /* « On peut mettre un seuil à 2 mois. » Au-delà, un élève à qui
     personne n'a rien demandé remonte dans la liste. */
  seuilCsMois: 2,
  /* « On le relance tous les mois ensuite. » Compté depuis la
     DERNIÈRE question, pas depuis le départ : sinon celui qui a
     répondu « pas encore » hier remonterait déjà. */
  relanceCsMois: 1
};

let reglagesBureau = Object.assign({}, REGLAGES_PAR_DEFAUT);


/* ============================================================
   OÙ SE TIENT LE RENDEZ-VOUS — v892

   David : « il faut que l'on puisse proposer où aura lieu le
   rendez-vous, à Saint-Brieuc ou à Loudéac, et la possibilité de
   rajouter autre chose à la main ».

   ⚠️ LES ADRESSES NE SONT PAS DANS LE CODE. Elles vivent dans les
   réglages partagés, comme les emplacements de départ des cours.
   Le jour où l'une change, elle se corrige à un seul endroit et
   elle suit partout : le mail, la page des familles, la fiche de
   l'élève, le rappel. Écrite en dur, il faudrait une livraison
   pour un déménagement.

   ⚠️ ET C'EST LA CLÉ QUI SE RANGE DANS LA FICHE, jamais l'adresse.
   Recopiée sur chaque élève, elle resterait fausse le jour de ce
   déménagement — et c'est elle que le rappel enverrait.
   ============================================================ */
const LIEUX_RDV_DEPART = [
  { cle:'stbrieuc', nom:'Saint-Brieuc',
    adresse:'4 rue Saint Benoît, 22000 Saint-Brieuc' },
  { cle:'loudeac',  nom:'Loudéac',
    adresse:'3 rue Louis Lavergne, 22600 Loudéac' }
];

let lieuxRdv = null;


/* Lus une fois par session, comme les favoris de prise de date.
   Tant qu'ils n'arrivent pas, les deux d'origine s'affichent : une
   liste vide ferait croire qu'il n'y a nulle part où aller. */
async function assurerLieuxRdv(force){
  if(lieuxRdv && !force) return lieuxRdv;
  try{
    const d = await appelPrep({ action: 'reglagesList' });
    const brut = ((d && d.reglages) || {}).lieuxRdv;
    const l = brut ? JSON.parse(brut) : null;
    lieuxRdv = (Array.isArray(l) && l.length) ? l : LIEUX_RDV_DEPART.slice();
  }catch(e){ lieuxRdv = lieuxRdv || LIEUX_RDV_DEPART.slice(); }
  return lieuxRdv;
}


function listeLieuxRdv(){
  return (lieuxRdv && lieuxRdv.length) ? lieuxRdv : LIEUX_RDV_DEPART;
}


function lieuRdv(cle){
  const c = String(cle || '').trim();
  if(!c) return null;
  return listeLieuxRdv().find(x => x && x.cle === c) || null;
}


/* Le nom court : pour les listes, les cartes, le bandeau. */
function nomLieuRdv(cle){
  const l = lieuRdv(cle);
  return l ? l.nom : '';
}


/* Le nom ET l'adresse : pour le mail et la page des familles.
   C'est cette forme-là qui se fige sur un créneau — le mail est
   déjà parti avec, la page doit dire la même chose. */
function texteLieuRdv(cle){
  const l = lieuRdv(cle);
  if(!l) return '';
  return l.adresse ? (l.nom + ' — ' + l.adresse) : l.nom;
}


/* Une clé lisible, tirée du nom. Elle ne change jamais ensuite :
   c'est elle qui est écrite dans les fiches déjà enregistrées. */
function cleLieuRdv(nom){
  const base = String(nom || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'lieu';

  let cle = base, n = 2;
  while(listeLieuxRdv().some(x => x && x.cle === cle)){ cle = base + n; n++; }
  return cle;
}


async function rangerLieuxRdv(liste){
  lieuxRdv = liste;
  await appelPrep({ action: 'reglageSet', cle: 'lieuxRdv',
                    valeur: JSON.stringify(liste) });
}


/* « Autre… » S'AJOUTE À LA LISTE — David l'a demandé ainsi, « avec
   la possibilité de supprimer ». Un lieu tapé une fois se retrouve
   donc la fois suivante ; celui tapé de travers se retire d'un
   geste, dans les réglages. */
async function ajouterLieuRdv(){
  const nom = await demander(
    'Le nom court du lieu\n\nEx : « Saint-Brieuc », « Loudéac », ' +
    '« Salle des fêtes de Plérin ».', '', 'Nouveau lieu');
  if(nom === null || !String(nom).trim()) return null;

  const adresse = await demander(
    "L'adresse complète\n\nElle apparaît dans le mail et sur la page " +
    'des familles. Tu peux la laisser vide.', '', 'Adresse');
  if(adresse === null) return null;

  const l = { cle: cleLieuRdv(nom), nom: String(nom).trim(),
              adresse: String(adresse || '').trim() };

  await rangerLieuxRdv(listeLieuxRdv().concat([l]));
  return l;
}


async function supprimerLieuRdv(cle){
  const l = lieuRdv(cle);
  if(!l) return false;

  /* ⚠️ ON NE RETIRE QUE DE LA LISTE. Les rendez-vous déjà posés
     gardent leur clé : la retirer d'ici ne doit pas effacer le lieu
     d'un rendez-vous de la semaine prochaine. Il s'affichera sous
     sa clé si le lieu a disparu — mieux qu'un blanc. */
  if(!await confirmer(
      'Retirer « ' + l.nom + ' » de la liste ?\n\n' +
      'Il ne sera plus proposé. Les rendez-vous déjà fixés à cet ' +
      'endroit ne changent pas.', 'Retirer')) return false;

  await rangerLieuxRdv(listeLieuxRdv().filter(x => x && x.cle !== cle));
  return true;
}


/* ------------------------------------------------------------
   LA RANGÉE DE PASTILLES

   Le même geste partout : les lieux connus, puis « ✏️ Autre… ».
   Un seul dessin, sinon deux écrans finiraient par ne pas
   proposer la même chose.
   ------------------------------------------------------------ */
function rangeeLieuxRdv(choisie, surChoix){
  const z = document.createElement('div');
  z.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';

  const dessiner = () => {
    z.innerHTML = '';

    listeLieuxRdv().forEach(l => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      const on = (l.cle === choisie);
      b.style.cssText = 'width:auto;padding:8px 13px;font-size:13px;margin:0;' +
        (on ? 'background:var(--orange);border-color:var(--orange);' +
              'color:#0B0B0B;font-weight:700;' : '');
      b.textContent = '🏢 ' + l.nom;
      b.title = l.adresse || l.nom;
      b.addEventListener('click', () => {
        choisie = on ? '' : l.cle;      /* un second appui déchoisit */
        dessiner();
        if(typeof surChoix === 'function') surChoix(choisie);
      });
      z.appendChild(b);
    });

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'btn btn-secondary';
    plus.style.cssText = 'width:auto;padding:8px 13px;font-size:13px;margin:0;';
    plus.textContent = '✏️ Autre…';
    plus.title = 'Ajouter un lieu à la liste';
    plus.addEventListener('click', async () => {
      const l = await ajouterLieuRdv();
      if(!l) return;
      choisie = l.cle;
      dessiner();
      if(typeof surChoix === 'function') surChoix(choisie);
    });
    z.appendChild(plus);

    /* L'adresse du lieu choisi, sous la rangée : c'est elle qui
       partira dans le mail, autant la voir avant d'envoyer. */
    const l = lieuRdv(choisie);
    if(l && l.adresse){
      const a = document.createElement('div');
      a.style.cssText = 'width:100%;font-size:11.5px;color:var(--muted);' +
        'margin-top:2px;';
      a.textContent = l.adresse;
      z.appendChild(a);
    }
  };

  dessiner();
  return z;
}


/* ------------------------------------------------------------
   « OÙ ÇA S'EST PASSÉ ? » — la petite fenêtre des RVP 1 et 2

   Rend la clé choisie, '' pour « aucun lieu », ou null si on ferme
   sans répondre — et null ne touche à rien. Trois réponses
   possibles, trois issues différentes : « je n'en veux pas » et
   « laisse comme c'était » ne sont pas la même chose.
   ------------------------------------------------------------ */
function choisirLieuRdv(titre, actuelle){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(460px,94vw);';

    boite.insertAdjacentHTML('beforeend',
      '<h3>📍 Où</h3>' +
      '<div style="font-size:13px;color:var(--muted);line-height:1.5;' +
        'margin-bottom:12px;">' + String(titre || '').replace(/</g, '&lt;') +
      '</div>' +
      '<div id="chLieu" style="margin-bottom:14px;"></div>');

    let choisie = String(actuelle || '');
    boite.querySelector('#chLieu')
      .appendChild(rangeeLieuxRdv(choisie, c => { choisie = c; }));

    const r = document.createElement('div');
    r.style.cssText = 'display:flex;gap:8px;';

    const fermer = v => { try{ fermerFond(fond); }catch(e){} resolve(v); };

    const bP = document.createElement('button');
    bP.className = 'btn btn-secondary';
    bP.textContent = 'Passer';
    bP.title = "Ne rien noter — la ligne n'affichera pas de lieu";
    bP.addEventListener('click', () => fermer(null));
    r.appendChild(bP);

    const bOk = document.createElement('button');
    bOk.className = 'btn btn-primary';
    bOk.textContent = 'Enregistrer';
    bOk.addEventListener('click', () => fermer(choisie));
    r.appendChild(bOk);

    boite.appendChild(r);
    fond.appendChild(boite);
    document.body.appendChild(fond);
    fond.addEventListener('click', e => { if(e.target === fond) fermer(null); });
  });
}


/* Le même choix, en menu déroulant : sur une ligne de créneau, une
   rangée de pastilles prendrait toute la largeur. */
function menuLieuRdv(valeur){
  const s = document.createElement('select');
  s.style.cssText = 'flex:0 0 150px;min-width:0;margin:0;';

  const vide = document.createElement('option');
  vide.value = '';
  vide.textContent = '— lieu —';
  s.appendChild(vide);

  listeLieuxRdv().forEach(l => {
    const o = document.createElement('option');
    o.value = l.cle;
    o.textContent = l.nom;
    s.appendChild(o);
  });

  /* Un lieu retiré de la liste mais encore posé sur ce créneau :
     il reste choisissable, sinon l'ouvrir le remettrait à blanc. */
  const v = String(valeur || '');
  if(v && !listeLieuxRdv().some(x => x && x.cle === v)){
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    s.appendChild(o);
  }

  s.value = v;
  return s;
}

/* Appelé par afficherBureau, avec ce que le serveur a rendu. */
function chargerReglages(brut){
  reglagesBureau = Object.assign({}, REGLAGES_PAR_DEFAUT);
  try{
    const o = brut ? JSON.parse(brut) : null;
    if(!o || typeof o !== 'object') return;
    Object.keys(REGLAGES_PAR_DEFAUT).forEach(k => {
      const n = Number(o[k]);
      /* Un réglage illisible ne remplace pas le défaut : mieux vaut
         le nombre connu qu'un NaN qui rendrait la liste muette. */
      if(!isNaN(n) && n > 0 && n < 120) reglagesBureau[k] = n;
    });
  }catch(e){ /* le défaut suffit */ }
}

async function enregistrerReglages(){
  await appelPrep({ action: 'configSet', cle: 'reglages',
                    valeur: JSON.stringify(reglagesBureau) });
}


/* ------------------------------------------------------------
   QUI EST CONCERNÉ

   La formation de la fiche fait autorité. À défaut — et c'est le
   cas le plus fréquent, on ne remplit pas une fiche pour un élève
   qu'on connaît — la frise, puis ce que la note dit.

   On rend 'AAC', 'CS' ou '' : trois réponses, jamais un booléen.
   « Ce n'est pas de l'AAC » et « on ne sait pas » ne se ressemblent
   pas.
   ------------------------------------------------------------ */
function typeAccompagnement(nom){
  const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;

  if(typeof parcoursDeLaFormation === 'function'){
    const p = parcoursDeLaFormation((f && f.formation) || '');
    if(p && p.aac) return 'AAC';
    if(p && p.accompagnee) return 'CS';
  }

  /* La frise porte la même information quand la formation est vide */
  const frise = String((f && f.frise) || '');
  if(/^AAC\b/i.test(frise)) return 'AAC';
  if(/^CS\b/i.test(frise) || /conduite supervis/i.test(frise)) return 'CS';

  /* Ce que le dernier bilan raconte — dernier recours */
  const e = (typeof eleveDuBureau === 'function') ? eleveDuBureau(nom) : null;
  const t = String((e && e.note) || '') + ' ' + String((e && e.type) || '');
  if(/conduite accompagn|\bAAC\b/i.test(t)) return 'AAC';
  if(/conduite supervis/i.test(t)) return 'CS';

  return '';
}


/* ------------------------------------------------------------
   LE COMPTEUR — ANNÉES, MOIS, JOURS

   « Il est CS depuis 1 mois et 3 jours. » Calculé, jamais saisi.

   On compte en mois de calendrier, pas en paquets de 30 jours : un
   élève parti le 31 janvier est à « 1 mois » le 28 février, comme
   n'importe qui le dirait à voix haute.
   ------------------------------------------------------------ */
function dureeDepuis(iso, auJour){
  const t = String(iso || '').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;

  const d = new Date(t + 'T12:00:00');
  const j = new Date(String(auJour || (typeof todayLocal === 'function'
              ? todayLocal() : new Date().toISOString().slice(0, 10))) + 'T12:00:00');
  if(isNaN(d.getTime()) || isNaN(j.getTime()) || j < d) return null;

  let mois = (j.getFullYear() - d.getFullYear()) * 12 + (j.getMonth() - d.getMonth());
  if(j.getDate() < d.getDate()) mois--;

  /* Les jours qui restent après ces mois pleins */
  const repere = new Date(d.getTime());
  repere.setMonth(repere.getMonth() + mois);
  const jours = Math.round((j - repere) / 86400000);

  const bouts = [];
  const ans = Math.floor(mois / 12);
  const rm = mois % 12;
  if(ans) bouts.push(ans + ' an' + (ans > 1 ? 's' : ''));
  if(rm) bouts.push(rm + ' mois');
  if(jours || !bouts.length) bouts.push(jours + ' jour' + (jours > 1 ? 's' : ''));

  return {
    mois: mois,
    txt: bouts.length > 1
      ? bouts.slice(0, -1).join(', ') + ' et ' + bouts[bouts.length - 1]
      : bouts[0]
  };
}


/* ------------------------------------------------------------
   LA PAUSE — « JE PARS EN VACANCES TROIS MOIS »

   Ça ne sert à rien de le faire remonter jusque-là. La DATE suffit :
   passée, il revient tout seul. Une pause qu'il faudrait lever à la
   main serait un élève oublié — c'est la seule forme qui tienne.
   ------------------------------------------------------------ */
function enPause(s, auJour){
  const t = String((s && s.pauseJusquau) || '').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const auj = String(auJour || (typeof todayLocal === 'function'
                ? todayLocal() : new Date().toISOString().slice(0, 10)));
  return (t >= auj) ? { jusquau: t, motif: String((s && s.pauseMotif) || '') } : null;
}


/* ------------------------------------------------------------
   LA QUESTION « TE SENS-TU PRÊT POUR UN EXAMEN BLANC ? »

   Quatre états, et il faut les quatre :

     · jamais posée, et depuis peu       → rien à faire
     · jamais posée, au-delà du seuil    → PERSONNE NE LUI A RIEN DEMANDÉ
     · posée, on attend sa réponse       → relancer
     · il a répondu                      → oui, ou pas encore

   « Jamais posée » et « posée sans réponse » demandent deux gestes
   différents. Les confondre, c'est relancer quelqu'un à qui on n'a
   jamais rien demandé.
   ------------------------------------------------------------ */
function etatQuestionEb(s, duree, auJour){
  const pause = enPause(s, auJour);
  if(pause) return { cle: 'pause', urgent: false, pause: pause,
    txt: '⏸️ En pause jusqu\'au ' + jourFrCs(pause.jusquau) +
         (pause.motif ? ' — ' + pause.motif : '') };

  const rep = String((s && s.csReponse) || '').trim();
  const le = String((s && s.csQuestionLe) || '').trim();
  const repLe = String((s && s.csReponseLe) || '').trim();

  if(rep === 'oui'){
    return { cle: 'pret', urgent: false,
      txt: '✅ Prêt — a répondu oui' + (repLe ? ' le ' + jourFrCs(repLe) : '') };
  }

  if(rep === 'pasencore'){
    /* « Pas encore » n'est pas « non » : on redemande, au rythme de
       relance. Sans ça il sort de la liste et personne ne le
       rappelle jamais. */
    const depuis = dureeDepuis(repLe, auJour);
    const du = depuis && depuis.mois >= reglagesBureau.relanceCsMois;
    return { cle: du ? 'aredemander' : 'pasencore', urgent: !!du,
      txt: (du ? '🔔 À redemander' : '⏳ Pas encore prêt') +
           (repLe ? ' — a dit non le ' + jourFrCs(repLe) : '') +
           (depuis ? ' (il y a ' + depuis.txt + ')' : '') };
  }

  if(le){
    const depuis = dureeDepuis(le, auJour);
    const du = depuis && depuis.mois >= reglagesBureau.relanceCsMois;
    const par = String((s && s.csQuestionPar) || '') === 'mail'
      ? 'Envoyé' : 'Demandé';
    return { cle: du ? 'arelancer' : 'attente', urgent: !!du,
      txt: (du ? '🔔 ' : '⏳ ') + par + ' le ' + jourFrCs(le) +
           ' — on attend sa réponse' +
           (depuis && du ? ' depuis ' + depuis.txt : '') };
  }

  /* Jamais posée. Le seuil décide si c'est normal ou si ça traîne. */
  const du = duree && duree.mois >= reglagesBureau.seuilCsMois;
  return { cle: du ? 'ademander' : 'jeune', urgent: !!du,
    txt: du ? '⏰ Personne ne lui a rien demandé' +
              ' — au-delà des ' + reglagesBureau.seuilCsMois + ' mois'
            : 'Question pas encore posée — sous le seuil' };
}


/* Une date en français, sans réécrire la règle : dateCourte, dans
   ec-permis-listes, la tient depuis toujours. */
function jourFrCs(v){
  const t = String(v || '').trim();
  if(!t) return '';
  return (typeof dateCourte === 'function') ? dateCourte(t) : t;
}


/* ------------------------------------------------------------
   OÙ EN EST SON EXAMEN BLANC

   Lu là où il s'écrit déjà : la colonne « ebDate » de la fiche de
   suivi d'abord, l'état tiré de la note ensuite. Pas une troisième
   source.
   ------------------------------------------------------------ */
function examenBlancDe(nom){
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};
  const e = (typeof eleveDuBureau === 'function') ? eleveDuBureau(nom) : null;
  const a = (e && e.etat) || {};

  /* ⚠️ v879 : la date du suivi n'est retenue que si un examen
     blanc est établi par ailleurs — elle a longtemps reçu la date
     de la dernière leçon. Voir ec-questionnaire.js. */
  const ebDate = (typeof dateExamenBlancDuSuivi === 'function')
    ? dateExamenBlancDuSuivi(nom, a) : '';
  if(ebDate) return { cle: 'date', txt: '✅ Examen blanc le ' + jourFrCs(ebDate) };
  if(a.examBlanc === 'passe') return { cle: 'passe', txt: '✅ Examen blanc passé' };
  if(a.examBlanc === 'reserve') return { cle: 'reserve', txt: '📌 Examen blanc réservé' };
  if(a.examBlanc === 'impossible')
    return { cle: 'impossible', txt: '⛔ Examen blanc non planifiable' };
  if(a.examBlanc === 'aprevoir')
    return { cle: 'aprevoir', txt: '📝 Examen blanc à prévoir' };
  return { cle: '', txt: '' };
}


/* ------------------------------------------------------------
   OÙ EN EST SON EXAMEN OFFICIEL

   David : « dans le suivi conduite accompagnée il me manque
   l'examen officiel : s'il a déjà une date, s'il a déjà été ajourné,
   et si oui quand. Par exemple Axel Hinault, je n'ai pas
   l'information qu'il a été ajourné et si un nouvel examen est
   prévu. »

   Deux faits, et il faut les deux : CE QUI EST DERRIÈRE (ajourné, et
   quand) et CE QUI EST DEVANT (une date, ou rien). Ils ne se
   déduisent pas l'un de l'autre — un élève ajourné en août peut
   avoir une date en octobre, comme il peut n'en avoir aucune, et
   c'est justement la différence qui appelle un geste.

   Mêmes sources et même ordre que partout ailleurs : la COLONNE de
   la fiche de suivi d'abord, la note ensuite. Et le compte des
   repassages se lit comme le mini-résumé le lit déjà — le plus grand
   des deux, parce que l'un des deux peut être en retard.
   ------------------------------------------------------------ */
function examenOfficielDe(nom, auJour){
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};
  const e = (typeof eleveDuBureau === 'function') ? eleveDuBureau(nom) : null;
  const a = (e && e.etat) || {};

  const auj = String(auJour || (typeof todayLocal === 'function'
                ? todayLocal() : new Date().toISOString().slice(0, 10)));
  const iso = (v) => {
    const t = String(v || '').trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    return (typeof dateFrVersIso === 'function') ? (dateFrVersIso(t) || '') : '';
  };

  /* ── CE QUI EST DERRIÈRE ── */
  const nb = Math.max(Number(a.repassages) || 0, Number(s.nbAjournements) || 0);
  const quand = iso(s.dateAjournement || a.dateAjournement || '');
  const ajourne = nb ? {
    nb: nb,
    /* nb ajournements = il en est à son (nb+1)e passage. */
    passage: nb + 1,
    quand: quand,
    txt: '🔁 ' + (nb + 1) + 'e passage — ajourné' +
         (quand ? ' le ' + jourFrCs(quand) : ' (date inconnue)')
  } : null;

  /* ── CE QUI EST DEVANT ── */
  const dateBrute = s.datePermis || a.permisDate || '';
  const d = iso(dateBrute);
  const source = s.datePermis ? '' : ' (annoncé dans un bilan)';

  let devant;
  if(s.resultat && /obtenu|réussi|reussi|favorable/i.test(String(s.resultat))){
    devant = { cle:'obtenu', txt:'🏁 Permis obtenu' };
  }else if(d && d >= auj){
    /* Le jour même compte comme à venir : le cours d'aujourd'hui EST
       peut-être l'examen. C'est la règle d'examenDejaPasse. */
    devant = { cle:'prevu',
      txt:'🎓 Examen le ' + jourFrCs(d) +
          (s.centre ? ' · ' + s.centre : '') + source };
  }else if(d){
    /* Une date dépassée n'est plus une convocation. Si elle est déjà
       comptée dans l'ajournement, on ne la redit pas. */
    devant = (ajourne && ajourne.quand === d)
      ? { cle:'passe', txt:'🎓 Aucun nouvel examen prévu' }
      : { cle:'passe', txt:'🎓 Dernier examen le ' + jourFrCs(d) +
                           ' — aucun nouvel examen prévu' };
  }else if(a.permis === 'annule'){
    devant = { cle:'annule', txt:'🎓 Examen annulé — date à reprendre' };
  }else if(a.permis === 'aprevoir' || s.aPlanifier === 'oui'){
    devant = { cle:'aprevoir', txt:"🎓 Date d'examen à prévoir" };
  }else{
    devant = { cle:'', txt:"🎓 Pas de date d'examen" };
  }

  return {
    ajourne: ajourne,
    devant: devant,
    /* Ce qui appelle un geste : ajourné et rien de reprogrammé. */
    aReprogrammer: !!(ajourne && (devant.cle === 'passe' ||
                                  devant.cle === 'annule' ||
                                  devant.cle === 'aprevoir' ||
                                  devant.cle === ''))
  };
}


/* ------------------------------------------------------------
   LES ÉLÈVES DE LA LISTE

   Tout le monde n'a pas de date de rendez-vous préalable : on ne
   fait pas disparaître ceux-là, on les montre EN PREMIER avec leur
   date à saisir. Un élève absent d'une liste ne se réclame jamais.
   ------------------------------------------------------------ */
function elevesAccompagnes(type){
  const tous = (typeof etatBureau !== 'undefined' && etatBureau.eleves)
    ? etatBureau.eleves : [];

  /* Le répertoire aussi : un élève en CS depuis six mois peut n'avoir
     aucun bilan récent, donc n'être dans aucune liste du bureau. */
  const noms = {};
  tous.forEach(e => { noms[normaliserMot(e.eleve)] = e.eleve; });
  ((typeof fichesEleves !== 'undefined' && fichesEleves) || []).forEach(f => {
    if(f.eleve) noms[normaliserMot(f.eleve)] = noms[normaliserMot(f.eleve)] || f.eleve;
  });

  const out = [];
  Object.keys(noms).forEach(k => {
    const nom = noms[k];
    if(typeAccompagnement(nom) !== type) return;

    const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};
    const duree = dureeDepuis(s.rvpDate);
    out.push({ eleve: nom, suivi: s, duree: duree,
               etat: etatQuestionEb(s, duree), eb: examenBlancDe(nom),
               exam: examenOfficielDe(nom) });
  });

  /* Ceux sans date d'abord — c'est ce qu'il manque pour que la
     liste serve. Puis les urgents, puis les plus anciens. */
  out.sort((a, b) => {
    if(!a.duree !== !b.duree) return a.duree ? 1 : -1;
    /* Même règle qu'en AAC : ajourné et non reprogrammé passe devant
       la question de l'examen blanc — il a déjà eu son examen, la
       question ne se pose plus dans le même ordre. */
    if(a.exam.aReprogrammer !== b.exam.aReprogrammer)
      return a.exam.aReprogrammer ? -1 : 1;
    if(a.etat.urgent !== b.etat.urgent) return a.etat.urgent ? -1 : 1;
    return (b.duree ? b.duree.mois : 0) - (a.duree ? a.duree.mois : 0);
  });
  return out;
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */

/* APRÈS UN GESTE, ON REDESSINE CE QUI EST À L'ÉCRAN.

   Les mêmes gestes servent à DEUX écrans : les listes de Suivi, et
   le bloc AAC/CS du dossier élève. Leur donner chacun sa façon de
   se rafraîchir, c'est la porte ouverte à un écran qui reste en
   retard sur l'autre — et on ne sait plus lequel dit vrai.

   Les deux fonctions appelées sortent d'elles-mêmes quand leur
   écran n'est pas affiché : on peut les appeler toujours. */
function redessinerAacCs(){
  afficherAacCs();
  if(typeof rafraichirPageEleve === 'function') rafraichirPageEleve();
}


/* Le tour des deux listes, redessiné après chaque geste. */
async function afficherAacCs(){
  const zC = $('listeCs');
  const zA = $('listeAac');
  if(!zC && !zA) return;

  /* Les fiches disent la formation : sans elles, personne n'est ni
     AAC ni CS et la liste s'affiche vide en ayant l'air normale. */
  if(typeof chargerFiches === 'function' &&
     (typeof fichesEleves === 'undefined' || !fichesEleves.length)){
    try{ await chargerFiches(); }catch(e){}
  }

  /* Les tours de rendez-vous théorique : ils décident de ce que la
     liste AAC peut proposer, donc ils arrivent avec elle.

     ⚠️ ON FORCE LA RELECTURE. David : « les réponses ne se mettent
     pas à jour toutes seules, je dois rafraîchir la page une
     première fois ».

     Le cache de trente secondes est fait pour les redessins en
     rafale — pas pour une VISITE. Ouvrir cet écran, c'est
     justement demander « où en sont les réponses maintenant » : y
     répondre avec ce qu'on avait il y a vingt secondes, c'est
     répondre à côté. Le rafraîchissement automatique des
     90 secondes prend le relais ensuite. */
  if(zA) await chargerToursRvt(true);

  /* Les lieux avant de dessiner : une rangée de pastilles qui
     arriverait après coup montrerait deux villes puis quatre, et
     un lieu déjà posé s'afficherait sous sa clé le temps du
     chargement. */
  if(zA) await assurerLieuxRdv();

  dessinerReglageCs();
  if(zA) dessinerLieuxRdv();
  if(zC) dessinerListeCs(zC);
  if(zA) dessinerListeAac(zA);
}


/* ------------------------------------------------------------
   LES LIEUX, EN HAUT DE LA LISTE AAC

   Comme le seuil CS juste à côté : on modifie une liste là où on
   en voit l'effet, pas trois écrans plus loin. C'est aussi la
   seule porte pour en RETIRER un — David : « il s'ajoute avec la
   possibilité de supprimer ».
   ------------------------------------------------------------ */
function dessinerLieuxRdv(){
  const z = $('lieuxRdvAac');
  if(!z) return;
  z.innerHTML = '';

  const d = document.createElement('details');
  d.className = 'volet-liste';
  d.style.marginBottom = '12px';

  const t = document.createElement('summary');
  t.textContent = '📍 Les lieux de rendez-vous (' +
                  listeLieuxRdv().length + ')';
  d.appendChild(t);

  const dedans = document.createElement('div');
  dedans.style.cssText = 'padding-top:8px;';

  listeLieuxRdv().forEach(l => {
    const li = document.createElement('div');
    li.style.cssText = 'display:flex;gap:9px;align-items:center;' +
      'border:1px solid var(--line);border-radius:10px;padding:9px 11px;' +
      'margin-bottom:7px;';

    const txt = document.createElement('div');
    txt.style.cssText = 'flex:1;min-width:0;line-height:1.45;';
    txt.innerHTML = '<div style="font-weight:700;font-size:14px;">🏢 ' +
      String(l.nom || '').replace(/</g, '&lt;') + '</div>' +
      (l.adresse ? '<div style="font-size:11.5px;color:var(--muted);">' +
        String(l.adresse).replace(/</g, '&lt;') + '</div>' : '');
    li.appendChild(txt);

    const x = document.createElement('button');
    x.className = 'btn btn-secondary';
    x.style.cssText = 'width:auto;padding:8px 11px;font-size:13px;margin:0;' +
      'flex-shrink:0;';
    x.textContent = '🗑️';
    x.title = 'Retirer ce lieu de la liste';
    x.addEventListener('click', async () => {
      try{
        if(await supprimerLieuRdv(l.cle)){
          showToast('Retiré ✅');
          dessinerLieuxRdv();
        }
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    li.appendChild(x);

    dedans.appendChild(li);
  });

  const plus = document.createElement('button');
  plus.className = 'btn btn-secondary';
  plus.style.cssText = 'width:auto;padding:9px 13px;font-size:13px;margin:0;';
  plus.textContent = '➕ Ajouter un lieu';
  plus.addEventListener('click', async () => {
    try{
      if(await ajouterLieuRdv()){
        showToast('Ajouté ✅');
        dessinerLieuxRdv();
      }
    }catch(e){ showToast('Impossible : ' + e.message); }
  });
  dedans.appendChild(plus);

  d.appendChild(dedans);
  z.appendChild(d);
}


/* Le seuil, EN HAUT DE LA LISTE et pas dans les réglages : on change
   un seuil quand on en voit l'effet, pas trois écrans plus loin. */
function dessinerReglageCs(){
  const z = $('reglageCs');
  if(!z) return;
  z.innerHTML = '';

  const l = document.createElement('div');
  l.style.cssText = 'display:flex;align-items:center;gap:9px;' +
    'font-size:12.5px;color:var(--muted);border:1px solid var(--line);' +
    'border-radius:10px;padding:9px 11px;margin-bottom:12px;';

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;line-height:1.5;';
  t.textContent = '⏰ On les signale au bout de ' +
    reglagesBureau.seuilCsMois + ' mois sans question posée, ' +
    'puis tous les ' + reglagesBureau.relanceCsMois + ' mois.';
  l.appendChild(t);

  /* Le bouton n'apparaît QUE si le compte peut écrire la config.
     Un bouton qui échoue vaut moins qu'un bouton absent. */
  if(typeof peutModifier !== 'function' || peutModifier('bureau_places')){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;margin:0;padding:6px 10px;font-size:11.5px;' +
      'flex-shrink:0;';
    b.textContent = 'Changer';
    b.addEventListener('click', changerSeuilsCs);
    l.appendChild(b);
  }
  z.appendChild(l);
}


async function changerSeuilsCs(){
  const a = await demander(
    'Au bout de combien de mois de conduite supervisée faut-il ' +
    'signaler un élève à qui personne n\'a rien demandé ?',
    String(reglagesBureau.seuilCsMois), '⏰ Le seuil');
  if(a === null) return;
  const b = await demander(
    'Et ensuite, tous les combien de mois relancer celui qui n\'a pas ' +
    'répondu, ou qui a dit « pas encore » ?',
    String(reglagesBureau.relanceCsMois), '🔔 La relance');
  if(b === null) return;

  const na = Number(String(a).replace(',', '.'));
  const nb = Number(String(b).replace(',', '.'));
  if(isNaN(na) || na <= 0 || isNaN(nb) || nb <= 0){
    showToast('Il faut deux nombres de mois.');
    return;
  }

  const avant = Object.assign({}, reglagesBureau);
  reglagesBureau.seuilCsMois = na;
  reglagesBureau.relanceCsMois = nb;
  try{
    await enregistrerReglages();
    showToast('Réglages enregistrés ✅');
    redessinerAacCs();
  }catch(e){
    /* On remet ce qui était vrai : un écran qui montre un seuil que
       le serveur n'a pas gardé ment jusqu'au rechargement. */
    reglagesBureau = avant;
    dessinerReglageCs();
    showToast('Impossible : ' + e.message);
  }
}


function dessinerListeCs(zone){
  const liste = elevesAccompagnes('CS');
  zone.innerHTML = '';

  if(typeof majVolet === 'function'){
    majVolet('cptCs', liste.length,
             liste.filter(x => x.etat.urgent).length);
  }

  if(!liste.length){
    zone.innerHTML = '<div class="empty">Aucun élève en conduite supervisée.' +
      '<br><span style="font-size:12px;">La formation se lit sur la fiche ' +
      'de l\'élève — « CS BV », « CS BEA ».</span></div>';
    return;
  }

  liste.forEach(x => zone.appendChild(ligneCs(x)));
}


/* L'EXAMEN OFFICIEL, EN UNE OU DEUX LIGNES.

   Écrite une fois, elle sert aux deux listes et au dossier : l'état
   de l'examen officiel se lit pareil qu'on soit en AAC ou en CS.

   DEUX LIGNES QUAND IL Y A DEUX CHOSES À DIRE. « Ajourné le 24/08 »
   et « aucun nouvel examen prévu » sont deux faits distincts, et
   c'est leur ASSOCIATION qui appelle un geste. Les fondre en une
   phrase ferait disparaître celui des deux qu'on ne cherchait pas. */
function lignesExamenOfficiel(exam){
  if(!exam) return [];
  const out = [];

  if(exam.ajourne){
    const l = document.createElement('span');
    l.style.color = 'var(--warn-text)';
    l.textContent = exam.ajourne.txt;
    out.push(l);
  }

  if(exam.devant.txt){
    const l = document.createElement('span');
    /* Le orange ne se met que sur ce qui appelle un geste : ajourné
       ET rien de reprogrammé. Une date à venir est une bonne
       nouvelle, pas une alerte. */
    l.style.color = exam.aReprogrammer ? 'var(--warn-text)'
                  : (exam.devant.cle === 'prevu' || exam.devant.cle === 'obtenu'
                     ? 'var(--accent-text)' : '');
    l.textContent = exam.devant.txt;
    out.push(l);
  }
  return out;
}


function ligneCs(x){
  const row = document.createElement('div');
  row.className = 'history-item';
  row.style.cssText = 'flex-direction:column;align-items:stretch;';

  const meta = document.createElement('div');
  meta.className = 'meta';

  const nom = document.createElement('strong');
  const f = (typeof ficheDe === 'function') ? ficheDe(x.eleve) : null;
  const age = (f && typeof ageDe === 'function') ? ageDe(f.naissance) : null;
  nom.textContent = x.eleve + (age === null ? '' : ' · ' + age + ' ans');
  meta.appendChild(nom);

  /* LE COMPTEUR, ou son absence dite en toutes lettres. Sans date de
     préalable il n'y a rien à compter — et c'est justement ce qu'il
     faut voir en premier. */
  const d = document.createElement('span');
  if(x.duree){
    d.innerHTML = 'CS depuis <strong>' + x.duree.txt.replace(/</g, '&lt;') +
      '</strong> — préalable le ' + jourFrCs(x.suivi.rvpDate);
  }else{
    d.style.color = 'var(--warn-text)';
    d.textContent = '🎂 Pas de date de rendez-vous préalable — ' +
      'rien à compter tant qu\'elle manque';
  }
  meta.appendChild(d);

  const et = document.createElement('span');
  et.style.color = x.etat.urgent ? 'var(--warn-text)'
                 : (x.etat.cle === 'pret' ? 'var(--accent-text)' : '');
  et.textContent = x.etat.txt;
  meta.appendChild(et);

  if(x.eb.txt){
    const eb = document.createElement('span');
    eb.style.color = (x.eb.cle === 'date' || x.eb.cle === 'passe')
      ? 'var(--accent-text)' : '';
    eb.textContent = x.eb.txt;
    meta.appendChild(eb);
  }

  lignesExamenOfficiel(x.exam).forEach(l => meta.appendChild(l));
  row.appendChild(meta);

  const act = document.createElement('div');
  act.style.cssText = 'display:flex;flex-wrap:wrap;gap:7px;margin-top:9px;';
  boutonsCs(x, act);
  if(act.children.length) row.appendChild(act);

  return row;
}


function petitBouton(libelle, titre, faire){
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;margin:0;padding:7px 11px;font-size:12px;';
  b.textContent = libelle;
  if(titre) b.title = titre;
  b.addEventListener('click', async () => {
    b.disabled = true;
    try{ await faire(); }
    catch(e){ showToast('Impossible : ' + e.message); }
    finally{ b.disabled = false; }
  });
  return b;
}


function boutonsCs(x, zone){
  const nom = x.eleve;

  /* La date du préalable : d'abord, parce que sans elle rien ne se
     compte. Lue dans le bilan quand il y en a un, saisie à la main
     pour un élève repris d'une autre auto-école. */
  if(!x.duree){
    zone.appendChild(petitBouton('📅 Sa date de préalable',
      'Le jour de son rendez-vous préalable', async () => {
        const iso = await choisirDate('Rendez-vous préalable');
        if(!iso) return;
        await majSuivi(nom, { rvpDate: iso, rvpEtat: 'fait' });
        showToast('Enregistré ✅');
        redessinerAacCs();
      }));
    return;
  }

  /* La correction, avant tout le reste : une date de préalable tapée
     à côté fausse le compteur et l'attente entière, et c'est le
     genre d'erreur qu'on veut pouvoir reprendre tout de suite. */
  zone.appendChild(petitBouton('✏️ Corriger sa date de préalable',
    'Changer la date, ou revenir sur un préalable noté par erreur',
    () => corrigerRendezVous(x)));

  /* Il a dit oui : la porte vers l'examen blanc, et rien d'autre. */
  if(x.etat.cle === 'pret'){
    if(x.eb.cle === 'aprevoir' || !x.eb.cle){
      zone.appendChild(petitBouton('📅 Planifier son examen blanc', '',
        async () => {
          const iso = await choisirDate("Date de l'examen blanc");
          if(!iso) return;
          const jour = (typeof dateEnToutesLettres === 'function')
            ? (dateEnToutesLettres(iso) || iso) : iso;
          await envoyerConsigne(nom, 'examblanc',
            'Examen blanc prévu le ' + jour + ' (bureau)');
          if(typeof noterExamenBlanc === 'function'){
            await noterExamenBlanc(nom, '', jour);
          }
          showToast('Examen blanc planifié ✅');
          redessinerAacCs();
        }));
    }
    return;
  }

  if(x.etat.cle === 'pause'){
    zone.appendChild(petitBouton('▶️ Reprendre le suivi',
      'Il repasse dans la liste dès maintenant', async () => {
        await majSuivi(nom, { pauseJusquau: '', pauseMotif: '' });
        showToast('Suivi repris ✅');
        redessinerAacCs();
      }));
    return;
  }

  /* La question. Deux entrées — de vive voix, ou par l'outil — et un
     seul état derrière. La ligne dit seulement COMMENT, parce qu'on
     relance un mail et pas une conversation. */
  const poser = (par) => async () => {
    const auj = (typeof todayLocal === 'function')
      ? todayLocal() : new Date().toISOString().slice(0, 10);
    await majSuivi(nom, { csQuestionLe: auj, csQuestionPar: par,
                          csReponse: '', csReponseLe: '' });
    showToast(par === 'mail' ? 'Noté — envoi à faire' : 'Noté ✅');
    redessinerAacCs();
  };

  zone.appendChild(petitBouton('✋ Posée de vive voix',
    'Tu lui as demandé, tu notes la date', poser('voix')));

  /* ⚠️ L'ENVOI PAR MAIL N'EXISTE PAS ENCORE, et le bouton le DIT.
     Un bouton qui note « envoyé » sans rien envoyer ferait attendre
     une réponse qui ne viendrait jamais. Il arrivera avec la page
     de réponse du rendez-vous théorique — la même brique. */
  zone.appendChild(petitBouton('📨 Bientôt : lui envoyer',
    "L'envoi par mail arrive avec le rendez-vous théorique",
    async () => {
      showToast("L'envoi automatique n'est pas encore en place. " +
                'Pose-lui la question, et note-la ici.');
    }));

  if(x.etat.cle !== 'jeune' && x.etat.cle !== 'ademander'){
    const auj = () => (typeof todayLocal === 'function')
      ? todayLocal() : new Date().toISOString().slice(0, 10);

    zone.appendChild(petitBouton('✅ Il a dit oui',
      'Il part dans « examen blanc à prévoir »', async () => {
        await majSuivi(nom, { csReponse: 'oui', csReponseLe: auj() });
        /* LE RELAIS. On ne pose pas l'examen blanc ici : on ouvre la
           porte de la liste qui existe déjà. */
        await envoyerConsigne(nom, 'examblanc',
          "Examen blanc à prévoir — il se sent prêt (conduite supervisée)");
        showToast('Dans « examen blanc à prévoir » ✅');
        redessinerAacCs();
      }));

    zone.appendChild(petitBouton('⏳ Pas encore',
      'On le redemandera — il ne sort pas de la liste', async () => {
        await majSuivi(nom, { csReponse: 'pasencore', csReponseLe: auj() });
        showToast('Noté — on redemandera');
        redessinerAacCs();
      }));
  }

  /* La pause : « je pars en vacances trois mois ». */
  zone.appendChild(petitBouton('⏸️ Mettre en pause',
    'Ne plus le faire remonter jusqu\'à une date', async () => {
      const iso = await choisirDate('Ne plus le signaler avant le…');
      if(!iso) return;
      const quoi = await demander(
        'Pourquoi ? (facultatif — ça s\'affichera sur sa ligne)',
        '', '⏸️ En pause');
      if(quoi === null) return;
      await majSuivi(nom, { pauseJusquau: iso,
                            pauseMotif: String(quoi || '').trim() });
      showToast('En pause jusqu\'au ' + jourFrCs(iso));
      redessinerAacCs();
    }));
}


/* ============================================================
   LE RENDEZ-VOUS THÉORIQUE — REMPLACER LE DOODLE

   David : « j'ai besoin de plusieurs élèves en même temps, au
   minimum 4. J'utilise un Doodle avec des propositions de date, je
   prends celle où il y en a le plus, et je remets les autres en
   attente. Je veux supprimer ce Doodle. »

   Le tour de piste :

     1. on coche les élèves dont le théorique est à prévoir ;
     2. on propose 3 à 5 créneaux et une date limite ;
     3. chaque famille reçoit UN lien — élève et accompagnateur ;
     4. elle coche ce qui lui va sur une page ;
     5. le bureau lit la grille et retient le créneau gagnant ;
     6. ceux qui ne pouvaient pas restent dans la liste.

   Ce qui n'est PAS ici : l'envoi des mails et l'écriture des
   réponses. Les deux vivent côté serveur, et la page des familles a
   sa propre route publique. Voir apps-script.js, section « LE
   RENDEZ-VOUS THÉORIQUE ».
   ============================================================ */

let toursRvt = [];
let toursRvtLus = 0;

async function chargerToursRvt(forcer){
  if(!forcer && toursRvtLus && Date.now() - toursRvtLus < 30000) return toursRvt;
  try{
    const d = await appelPrep({ action: 'rvtList' });
    toursRvt = (d && d.tours) || [];
    toursRvtLus = Date.now();
  }catch(e){ /* la liste AAC reste lisible sans les tours */ }
  return toursRvt;
}

/* ------------------------------------------------------------
   LES RÉPONSES QUI ARRIVENT PENDANT QU'ON REGARDE

   Les familles répondent dans la journée, une par une. L'écran ne
   relisait les tours qu'à l'ouverture de la vue : le bureau voyait
   « 2 réponses sur 6 » pendant deux heures et devait recharger la
   page pour découvrir qu'elles étaient toutes arrivées.

   On se branche donc sur l'actualisation automatique du bureau —
   celle des cours préparés et des places d'examen, avec ses cinq
   garde-fous : curseur dans un champ, fenêtre ouverte, tiroir
   déplié contenant une saisie, onglet en arrière-plan, ou serveur
   qui vient de refuser. Pas de second minuteur : deux horloges
   dans une même page finissent toujours par se marcher dessus.

   ⚠️ ON NE REDESSINE QUE SI QUELQUE CHOSE A CHANGÉ. Redessiner
   dans le vide toutes les 90 secondes ferait sauter la liste sous
   la souris pour rien.
   ------------------------------------------------------------ */
async function rafraichirToursRvtAuto(){
  const zA = $('listeAac');
  if(!zA) return;
  const avant = JSON.stringify(toursRvt);
  await chargerToursRvt(true);
  if(JSON.stringify(toursRvt) === avant) return;
  dessinerListeAac(zA);
}

/* Les tours encore ouverts, par élève : c'est ce qui empêche d'en
   ouvrir un second et ce qui s'affiche sur sa ligne. */
function tourOuvertDe(nom){
  const k = normaliserMot(nom);
  return toursRvt.find(t => !t.clos &&
    (t.eleves || []).some(e => normaliserMot(e.eleve) === k)) || null;
}


/* ------------------------------------------------------------
   LES DEUX CHAMPS COMMUNS AUX TROIS FENÊTRES

   Trois fenêtres se partagent les mêmes deux champs : ouvrir un
   tour, ajouter des familles à un tour ouvert, changer ses
   créneaux. Les recopier dans chacune, c'était accepter que
   l'avertissement des adresses manquantes finisse par n'exister
   que dans une des trois — la faute qui revient sans arrêt dans ce
   dossier : une même chose écrite à deux endroits.
   ------------------------------------------------------------ */

/* La liste à cocher, avec l'état des adresses de chacun.

   « Avant l'envoi il dit qui n'a pas d'adresse. » Une adresse
   manquante découverte après coup ressemble à quelqu'un qui n'a
   pas répondu. */
function dessinerElevesRvt(zone, possibles, choisis, apres){
  zone.innerHTML = '';
  possibles.forEach(x => {
    const nom = x.eleve || x;
    const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
    const mail = (f && f.email) || '';
    const presc = (f && f.mailPrescripteur) || '';

    const l = document.createElement('label');
    l.style.cssText = 'display:flex;gap:9px;align-items:flex-start;' +
      'padding:5px 0;font-size:13px;cursor:pointer;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!choisis[nom];
    cb.style.cssText = 'margin-top:3px;flex-shrink:0;';
    cb.addEventListener('change', () => {
      choisis[nom] = cb.checked;
      if(apres) apres();
    });
    l.appendChild(cb);

    const t = document.createElement('div');
    t.style.cssText = 'flex:1;min-width:0;line-height:1.5;';
    const adresses = [mail ? '✉️ élève' : '', presc ? '✉️ prescripteur' : '']
      .filter(Boolean).join(' · ');
    t.innerHTML = '<strong>' + String(nom).replace(/</g, '&lt;') + '</strong>' +
      '<br><span style="font-size:11.5px;color:' +
      (adresses ? 'var(--muted)' : 'var(--warn-text)') + ';">' +
      (adresses || '⚠️ aucune adresse — il ne recevra rien') + '</span>';
    l.appendChild(t);
    zone.appendChild(l);
  });
  if(apres) apres();
}

/* Le compte, et l'avertissement des quatre.

   LE MINIMUM DE 4 AVERTIT, IL N'EMPÊCHE PAS : « avertissement pour
   nous, et on décide si on le fait ou pas ». */
function majCompteRvt(zone, n, dejaDedans){
  if(!zone) return;
  const total = n + (dejaDedans || 0);
  if(total < 4){
    zone.style.color = 'var(--warn-text)';
    zone.textContent = '⚠️ ' + total + ' famille(s) en tout — il en faut ' +
      'normalement 4. À toi de voir.';
  }else{
    zone.style.color = 'var(--accent-text)';
    zone.textContent = total + ' famille(s) en tout' +
      (dejaDedans ? ' (dont ' + dejaDedans + ' déjà invitée(s))' : '') + '.';
  }
}

/* Les lignes date + heure. « verrouilles » porte les identifiants
   des créneaux déjà proposés : on les montre autrement, parce que
   les toucher coûte les réponses déjà reçues. */
function dessinerCreneauxRvt(zone, creneaux, redessiner, dejaRepondu){
  zone.innerHTML = '';
  creneaux.forEach((c, i) => {
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:6px;align-items:center;' +
      'margin-bottom:7px;';
    l.innerHTML =
      '<input type="date" data-i="' + i + '" data-k="date" ' +
        'style="flex:2;min-width:0;margin:0;" value="' + (c.date || '') + '">' +
      '<input type="time" data-i="' + i + '" data-k="heure" ' +
        'style="flex:1;min-width:0;margin:0;" value="' + (c.heure || '') + '">';

    /* ⚠️ LE LIEU DE CE CRÉNEAU-LÀ.

       David a choisi la troisième façon : un lieu par défaut en haut
       qui remplit toutes les lignes, et chaque ligne modifiable. Le
       cas courant — tout au même endroit — reste un seul geste ; le
       cas mixte ne demande plus deux tours.

       Le lieu vit ICI, sur le créneau, et nulle part ailleurs : ce
       qu'on voit en haut ne fait que remplir ces cases. */
    const sel = menuLieuRdv(c.lieuCle || '');
    sel.addEventListener('change', () => { c.lieuCle = sel.value; });
    l.appendChild(sel);

    const sup = document.createElement('button');
    sup.className = 'btn btn-secondary';
    sup.style.cssText = 'width:auto;margin:0;padding:9px 10px;flex-shrink:0;';
    sup.textContent = '✕';
    sup.title = 'Retirer ce créneau';
    sup.addEventListener('click', () => {
      creneaux.splice(i, 1);
      if(creneaux.length < 2) creneaux.push({});
      redessiner();
    });
    l.appendChild(sup);
    zone.appendChild(l);

    /* Un créneau déjà proposé et déjà répondu : on dit ce que le
       déplacer coûterait, AVANT qu'on le déplace. */
    const n = (dejaRepondu && c.id) ? (dejaRepondu[c.id] || 0) : 0;
    if(n){
      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);' +
        'margin:-4px 0 8px 2px;line-height:1.4;';
      a.textContent = '↑ ' + n + ' réponse(s) portent sur ce créneau — ' +
        'le déplacer ou le retirer les effacera.';
      zone.appendChild(a);
    }
  });
  zone.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      creneaux[+inp.getAttribute('data-i')][inp.getAttribute('data-k')] =
        inp.value;
    });
  });
}


/* ------------------------------------------------------------
   OUVRIR UN TOUR
   ------------------------------------------------------------ */
async function ouvrirTourRvt(liste){
  /* Ceux dont le théorique est à prévoir, et qui n'ont pas déjà une
     proposition en cours. */
  const possibles = liste.filter(x =>
    x.parcours.rdvAttendus && x.rdv.rvt.cle === 'aprevoir' &&
    !tourOuvertDe(x.eleve));

  if(!possibles.length){
    showToast('Personne à proposer : tous ont leur théorique, ou une ' +
              'proposition déjà en cours.');
    return;
  }

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px,94vw);max-height:90vh;overflow-y:auto;';

  const dans7 = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  };

  boite.insertAdjacentHTML('beforeend',
    '<h3>🗣️ Organiser un rendez-vous théorique</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
      'line-height:1.5;">Chaque famille reçoit <strong>un seul lien</strong> ' +
      '— élève et accompagnateur — et remplit <strong>une seule</strong> ' +
      'grille.</div>' +
    '<label>Les élèves à inviter</label>' +
    '<div id="rvtEleves" style="background:var(--navy);border:1px solid ' +
      'var(--line);border-radius:10px;padding:10px 12px;max-height:210px;' +
      'overflow-y:auto;margin-bottom:6px;"></div>' +
    '<div id="rvtCompte" style="font-size:12px;margin:-2px 0 12px;' +
      'line-height:1.5;"></div>' +
    '<label>Où aura lieu le rendez-vous</label>' +
    '<div id="rvtLieu" style="margin-bottom:6px;"></div>' +
    '<div style="font-size:11px;color:var(--muted);margin:0 0 14px;' +
      'line-height:1.4;">Il se pose sur tous les créneaux. Tu peux en ' +
      'changer un, ligne par ligne.</div>' +
    '<label>Les créneaux proposés</label>' +
    '<div id="rvtCreneaux"></div>' +
    '<button class="btn btn-secondary" id="rvtPlus" style="width:auto;' +
      'padding:8px 12px;font-size:12px;margin:0 0 14px;">➕ Un créneau de plus</button>' +
    '<label for="rvtLimite">Ils peuvent modifier jusqu\'au</label>' +
    '<input type="date" id="rvtLimite" value="' + dans7() + '">' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 14px;' +
      'line-height:1.4;">Passé ce jour, leur lien n\'accepte plus de ' +
      'réponse — il montre encore ce qu\'ils avaient indiqué.</div>' +
    '<div id="rvtEtat" style="font-size:13px;line-height:1.5;' +
      'margin-bottom:10px;"></div>' +
    '<div style="display:flex;gap:8px;">' +
      '<button class="btn btn-secondary" id="rvtAnnuler">Annuler</button>' +
      '<button class="btn btn-primary" id="rvtEnvoyer">📨 Envoyer</button>' +
    '</div>');

  fond.appendChild(boite);
  document.body.appendChild(fond);

  const g = id => boite.querySelector('#' + id);

  /* ── Les élèves, avec l'état de leurs adresses ──

     « Avant l'envoi il dit qui n'a pas d'adresse. » Une adresse
     manquante découverte après coup ressemble à quelqu'un qui n'a
     pas répondu. */
  const choisis = {};
  possibles.forEach(x => { choisis[x.eleve] = true; });

  const majCompte = () => majCompteRvt(g('rvtCompte'),
    Object.keys(choisis).filter(k => choisis[k]).length, 0);

  /* ── Les créneaux ── */
  let creneaux = [{}, {}, {}];
  const dessinerCreneaux = () =>
    dessinerCreneauxRvt(g('rvtCreneaux'), creneaux, dessinerCreneaux);

  /* ── OÙ ──

     Le lieu choisi ici se POSE sur chaque ligne ; il ne vit pas à
     part. Une ligne déjà réglée à la main n'est pas écrasée : le
     raccourci ne défait pas un choix explicite. */
  let lieuParDefaut = (listeLieuxRdv()[0] || {}).cle || '';
  creneaux.forEach(c => { c.lieuCle = lieuParDefaut; });

  const posePartout = cle => {
    creneaux.forEach(c => {
      if(!c.lieuCle || c.lieuCle === lieuParDefaut) c.lieuCle = cle;
    });
    lieuParDefaut = cle;
    dessinerCreneaux();
  };

  g('rvtLieu').appendChild(rangeeLieuxRdv(lieuParDefaut, posePartout));

  dessinerElevesRvt(g('rvtEleves'), possibles, choisis, majCompte);
  dessinerCreneaux();

  g('rvtPlus').addEventListener('click', () => {
    if(creneaux.length >= 6){
      showToast('Six créneaux, c\'est déjà beaucoup à lire.');
      return;
    }
    /* Il naît au lieu par défaut : une ligne ajoutée à la dernière
       minute est justement celle qu'on oublierait de renseigner. */
    creneaux.push({ lieuCle: lieuParDefaut });
    dessinerCreneaux();
  });

  const fermer = () => { try{ fermerFond(fond); }catch(e){} };
  g('rvtAnnuler').addEventListener('click', fermer);
  fond.addEventListener('click', e => { if(e.target === fond) fermer(); });

  g('rvtEnvoyer').addEventListener('click', async () => {
    const noms = Object.keys(choisis).filter(k => choisis[k]);
    /* ⚠️ LE LIEU PART EN DEUX MORCEAUX, ET C'EST VOULU.

       « lieu » est ce que la famille LIRA — nom et adresse, figés
       ici. Le mail part avec cette adresse-là : si elle change
       demain dans les réglages, la page des familles doit continuer
       de dire ce que le mail disait, sinon on envoie deux adresses
       différentes pour le même rendez-vous.

       « lieuCle » est la clé, celle qui se rangera dans la fiche de
       l'élève quand le créneau sera retenu. Elle, elle suit les
       réglages. */
    const cr = creneaux
      .filter(c => c.date)
      .map((c, i) => ({ id: 'c' + (i + 1), date: c.date,
                        heure: c.heure || '',
                        lieu: texteLieuRdv(c.lieuCle),
                        lieuCle: c.lieuCle || '' }));

    const etat = g('rvtEtat');
    if(!noms.length){ etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Aucun élève coché.'; return; }
    if(cr.length < 2){ etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Il faut au moins deux créneaux avec une date.';
      return; }

    /* ⚠️ LE LIEU EST OBLIGATOIRE ICI — David : « obligatoire pour le
       rendez-vous théorique ». Ce mail part à des familles ; une
       adresse manquante, c'est dix appels au bureau la veille. */
    const sansLieu = cr.filter(c => !c.lieuCle).length;
    if(sansLieu){ etat.style.color = 'var(--warn-text)';
      etat.textContent = sansLieu + ' créneau(x) sans lieu. Les familles ' +
        'doivent savoir où venir avant de choisir leur date.';
      return; }

    const sansAdresse = noms.filter(n => {
      const f = (typeof ficheDe === 'function') ? ficheDe(n) : null;
      return !((f && f.email) || (f && f.mailPrescripteur));
    });
    if(sansAdresse.length &&
       !await confirmer(sansAdresse.length + ' élève(s) sans adresse :\n' +
         sansAdresse.join(', ') + '\n\nIls ne recevront rien. Continuer ?',
         'Adresses manquantes')) return;

    const b = g('rvtEnvoyer');
    b.disabled = true;
    b.textContent = 'Envoi…';
    etat.style.color = 'var(--muted)';
    etat.textContent = 'Les mails partent un par un, ça prend un moment…';

    try{
      const r = await appelPrep({
        action: 'rvtOuvrir',
        eleves: JSON.stringify(noms.map(n => {
          const f = (typeof ficheDe === 'function') ? ficheDe(n) : null;
          return { eleve: n, mail: (f && f.email) || '',
                   mailPrescripteur: (f && f.mailPrescripteur) || '' };
        })),
        creneaux: JSON.stringify(cr),
        limite: g('rvtLimite').value || '',
        lien: lienRvt(),
        par: ACCES.moniteur || ''
      });

      if(!r || r.status !== 'ok'){
        b.disabled = false; b.textContent = '📨 Envoyer';
        etat.style.color = 'var(--warn-text)';
        etat.textContent = (r && r.message) || "La proposition n'a pas " +
          'pu être ouverte.';
        return;
      }

      /* ⚠️ LES MAILS PARTENT D'ICI, PAR « mailBilan ».

         Ils partaient d'Apps Script, donc du compte Google du script,
         et ils ne partaient pas. TOUTE l'application envoie par
         mailBilan — le Worker le relaie en SMTP depuis
         contact@evolutionconduites.fr. Les rappels, les bilans, les
         convocations : tous passent par là. Un second canal à côté,
         c'était un canal que personne ne surveillait. */
      const envois = await envoyerMailsRvt(r.envois || [], cr,
                                           g('rvtLimite').value || '');

      /* Ce qui est parti retourne au classeur : un mail dont on ne
         sait pas s'il est parti se renvoie deux fois. */
      try{
        await appelPrep({ action: 'rvtEnvois', id: r.id,
                          envois: JSON.stringify(envois) });
      }catch(e){ /* la grille dira « envoi inconnu », c'est déjà ça */ }

      const rates = envois.filter(x => x.etat !== 'envoyé');
      fermer();
      showToast(rates.length
        ? '📨 ' + (envois.length - rates.length) + ' envoyé(s), ' +
          rates.length + ' en échec — regarde le tour'
        : '📨 ' + envois.length + ' famille(s) prévenue(s) ✅');
      await chargerToursRvt(true);
      redessinerAacCs();
    }catch(e){
      b.disabled = false; b.textContent = '📨 Envoyer';
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Impossible : ' + e.message;
    }
  });
}


/* ------------------------------------------------------------
   AJOUTER DES FAMILLES À UN TOUR DÉJÀ PARTI

   « Une fois que c'est envoyé je ne peux ajouter personne. Il me
   faut la possibilité d'ajouter du monde à cette organisation même
   si une première salve est partie. »

   Les nouvelles reçoivent LES MÊMES créneaux et la MÊME date
   limite : c'est le même rendez-vous, pas un second tour. Elles
   voient donc exactement la même page que les premières.
   ------------------------------------------------------------ */
async function ajouterAuTourRvt(tour){
  const dedans = {};
  (tour.eleves || []).forEach(e => { dedans[normaliserMot(e.eleve)] = true; });

  /* Ceux dont le théorique est à prévoir, qui ne sont pas déjà dans
     CE tour, ni dans un autre encore ouvert. */
  const possibles = elevesAac().filter(x =>
    x.parcours.rdvAttendus && x.rdv.rvt.cle === 'aprevoir' &&
    !dedans[normaliserMot(x.eleve)] && !tourOuvertDe(x.eleve));

  if(!possibles.length){
    showToast('Personne à ajouter : tous ont leur théorique, ou une ' +
              'proposition déjà en cours.');
    return;
  }

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px,94vw);max-height:90vh;overflow-y:auto;';

  const lignes = (tour.creneaux || []).map(c =>
    '<li>' + (jourFrCs(c.date) || c.date) +
    (c.heure ? ' à ' + c.heure : '') + '</li>').join('');

  boite.insertAdjacentHTML('beforeend',
    '<h3>➕ Ajouter des familles</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
      'line-height:1.5;">Elles reçoivent <strong>les mêmes créneaux</strong> ' +
      'et la même date limite — c\'est le même rendez-vous.' +
      '<ul style="margin:6px 0 0 16px;padding:0;">' + lignes + '</ul></div>' +
    '<label>Les familles à ajouter</label>' +
    '<div id="rvtAjEleves" style="background:var(--navy);border:1px solid ' +
      'var(--line);border-radius:10px;padding:10px 12px;max-height:240px;' +
      'overflow-y:auto;margin-bottom:6px;"></div>' +
    '<div id="rvtAjCompte" style="font-size:12px;margin:-2px 0 12px;' +
      'line-height:1.5;"></div>' +
    '<div id="rvtAjEtat" style="font-size:13px;line-height:1.5;' +
      'margin-bottom:10px;"></div>' +
    '<div style="display:flex;gap:8px;">' +
      '<button class="btn btn-secondary" id="rvtAjAnnuler">Annuler</button>' +
      '<button class="btn btn-primary" id="rvtAjEnvoyer">📨 Les inviter</button>' +
    '</div>');

  fond.appendChild(boite);
  document.body.appendChild(fond);
  const g = id => boite.querySelector('#' + id);

  /* Rien de coché au départ : on vient en ajouter quelques-uns
     nommément, pas relancer toute la liste. */
  const choisis = {};
  const majCompte = () => majCompteRvt(g('rvtAjCompte'),
    Object.keys(choisis).filter(k => choisis[k]).length,
    (tour.eleves || []).length);
  dessinerElevesRvt(g('rvtAjEleves'), possibles, choisis, majCompte);

  const fermer = () => { try{ fermerFond(fond); }catch(e){} };
  g('rvtAjAnnuler').addEventListener('click', fermer);
  fond.addEventListener('click', e => { if(e.target === fond) fermer(); });

  g('rvtAjEnvoyer').addEventListener('click', async () => {
    const noms = Object.keys(choisis).filter(k => choisis[k]);
    const etat = g('rvtAjEtat');
    if(!noms.length){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Aucune famille cochée.';
      return;
    }

    const sansAdresse = noms.filter(n => {
      const f = (typeof ficheDe === 'function') ? ficheDe(n) : null;
      return !((f && f.email) || (f && f.mailPrescripteur));
    });
    if(sansAdresse.length &&
       !await confirmer(sansAdresse.length + ' élève(s) sans adresse :\n' +
         sansAdresse.join(', ') + '\n\nIls ne recevront rien. Continuer ?',
         'Adresses manquantes')) return;

    const b = g('rvtAjEnvoyer');
    b.disabled = true;
    b.textContent = 'Envoi…';
    etat.style.color = 'var(--muted)';
    etat.textContent = 'Les mails partent un par un, ça prend un moment…';

    try{
      const r = await appelPrep({
        action: 'rvtAjouter', id: tour.id,
        eleves: JSON.stringify(noms.map(n => {
          const f = (typeof ficheDe === 'function') ? ficheDe(n) : null;
          return { eleve: n, mail: (f && f.email) || '',
                   mailPrescripteur: (f && f.mailPrescripteur) || '' };
        })),
        par: ACCES.moniteur || ''
      });

      if(!r || r.status !== 'ok'){
        b.disabled = false; b.textContent = '📨 Les inviter';
        etat.style.color = 'var(--warn-text)';
        etat.textContent = (r && r.message) || "L'ajout n'a pas abouti.";
        return;
      }

      const envois = await envoyerMailsRvt(r.envois || [],
        r.creneaux || tour.creneaux, r.limite || tour.limite);
      try{
        await appelPrep({ action: 'rvtEnvois', id: tour.id,
                          envois: JSON.stringify(envois) });
      }catch(e){ /* la grille dira « envoi inconnu », c'est déjà ça */ }

      const rates = envois.filter(x => x.etat !== 'envoyé');
      fermer();
      showToast(rates.length
        ? '📨 ' + (envois.length - rates.length) + ' ajoutée(s), ' +
          rates.length + ' en échec — regarde le tour'
        : '📨 ' + envois.length + ' famille(s) ajoutée(s) ✅');
      await chargerToursRvt(true);
      redessinerAacCs();
    }catch(e){
      b.disabled = false; b.textContent = '📨 Les inviter';
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Impossible : ' + e.message;
    }
  });
}


/* ------------------------------------------------------------
   CHANGER LES CRÉNEAUX D'UN TOUR OUVERT

   « Et la possibilité d'ajouter des dates ou de changer des dates
   en fonction de certains retours. »

   ⚠️ UNE RÉPONSE PORTE SUR UNE DATE. Si « samedi 12 à 9 h » devient
   « samedi 19 à 9 h », ceux qui avaient dit oui avaient dit oui au
   12 : garder leur oui, c'est leur faire dire ce qu'ils n'ont pas
   dit, et convoquer un samedi matin des gens qui ne viendront pas.

   Un créneau déplacé ou retiré perd donc ses réponses. L'écran le
   dit AVANT — sous chaque créneau déjà répondu — puis le redemande
   dans la confirmation, avec le compte exact.
   ------------------------------------------------------------ */
async function changerCreneauxRvt(tour){
  /* Combien de réponses portent sur chaque créneau : c'est ce qu'on
     perdrait en le touchant. */
  const repondu = {};
  (tour.eleves || []).forEach(e => {
    Object.keys(e.reponses || {}).forEach(k => {
      repondu[k] = (repondu[k] || 0) + 1;
    });
  });

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px,94vw);max-height:90vh;overflow-y:auto;';

  boite.insertAdjacentHTML('beforeend',
    '<h3>📅 Les créneaux proposés</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
      'line-height:1.5;">Un créneau <strong>déplacé ou retiré perd ses ' +
      'réponses</strong> : ceux qui avaient dit oui avaient dit oui à ' +
      'l\'ancienne date. Ajouter un créneau, en revanche, ne touche à ' +
      'rien.</div>' +
    '<div id="rvtCrListe"></div>' +
    '<button class="btn btn-secondary" id="rvtCrPlus" style="width:auto;' +
      'padding:8px 12px;font-size:12px;margin:0 0 14px;">➕ Un créneau de ' +
      'plus</button>' +
    '<label style="display:flex;gap:9px;align-items:flex-start;' +
      'font-size:13px;cursor:pointer;margin-bottom:12px;">' +
      '<input type="checkbox" id="rvtCrPrevenir" checked ' +
        'style="margin-top:3px;flex-shrink:0;">' +
      '<span style="flex:1;line-height:1.5;">Prévenir les familles du ' +
      'changement<br><span style="font-size:11.5px;color:var(--muted);">' +
      'Elles reçoivent la liste à jour, avec leur lien habituel.</span>' +
      '</span></label>' +
    '<div id="rvtCrEtat" style="font-size:13px;line-height:1.5;' +
      'margin-bottom:10px;"></div>' +
    '<div style="display:flex;gap:8px;">' +
      '<button class="btn btn-secondary" id="rvtCrAnnuler">Annuler</button>' +
      '<button class="btn btn-primary" id="rvtCrOk">💾 Enregistrer</button>' +
    '</div>');

  fond.appendChild(boite);
  document.body.appendChild(fond);
  const g = id => boite.querySelector('#' + id);

  /* Une copie : tant qu'on n'a pas enregistré, le tour affiché
     derrière ne doit pas bouger. */
  const creneaux = (tour.creneaux || []).map(c => ({
    id: c.id, date: c.date || '', heure: c.heure || '',
    lieu: c.lieu || '', lieuCle: c.lieuCle || ''
  }));
  const redessiner = () =>
    dessinerCreneauxRvt(g('rvtCrListe'), creneaux, redessiner, repondu);
  redessiner();

  g('rvtCrPlus').addEventListener('click', () => {
    if(creneaux.length >= 6){
      showToast('Six créneaux, c\'est déjà beaucoup à lire.');
      return;
    }
    creneaux.push({});
    redessiner();
  });

  const fermer = () => { try{ fermerFond(fond); }catch(e){} };
  g('rvtCrAnnuler').addEventListener('click', fermer);
  fond.addEventListener('click', e => { if(e.target === fond) fermer(); });

  g('rvtCrOk').addEventListener('click', async () => {
    const etat = g('rvtCrEtat');
    /* Le texte du lieu se refabrique à l'enregistrement : c'est ce
       que les familles reliront, et ce que le mail de changement
       leur redira. Les deux doivent dire la même chose. */
    const gardes = creneaux.filter(c => c.date)
      .map(c => Object.assign({}, c, { lieu: texteLieuRdv(c.lieuCle) }));

    if(gardes.length < 2){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Il faut au moins deux créneaux avec une date.';
      return;
    }

    /* Même règle qu'à l'ouverture : pas de créneau sans lieu. */
    const sansLieu = gardes.filter(c => !c.lieuCle).length;
    if(sansLieu){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = sansLieu + ' créneau(x) sans lieu. Les familles ' +
        'doivent savoir où venir avant de choisir leur date.';
      return;
    }

    /* CE QU'ON VA PERDRE, DIT AVANT DE LE PERDRE. Les identifiants
       encore présents ET inchangés gardent leurs réponses ; tous les
       autres les perdent. Le classeur applique la même règle — c'est
       lui qui décide, on ne fait que l'annoncer. */
    const avant = {};
    (tour.creneaux || []).forEach(c => { avant[String(c.id)] = c; });
    let perdues = 0;
    Object.keys(repondu).forEach(id => {
      const a = avant[id];
      const reste = gardes.some(c => String(c.id) === id &&
        String(c.date || '') === String(a && a.date || '') &&
        String(c.heure || '') === String(a && a.heure || ''));
      if(!reste) perdues += repondu[id];
    });

    if(perdues && !await confirmer(
        perdues + ' réponse(s) portent sur un créneau que tu déplaces ou ' +
        'que tu retires.\n\nElles seront effacées : ceux qui avaient dit ' +
        'oui avaient dit oui à l\'ancienne date.\n\nContinuer ?',
        'Effacer ces réponses')) return;

    const b = g('rvtCrOk');
    b.disabled = true;
    b.textContent = 'Enregistrement…';

    try{
      const r = await appelPrep({
        action: 'rvtCreneaux', id: tour.id,
        creneaux: JSON.stringify(gardes),
        par: ACCES.moniteur || ''
      });

      if(!r || r.status !== 'ok'){
        b.disabled = false; b.textContent = '💾 Enregistrer';
        etat.style.color = 'var(--warn-text)';
        etat.textContent = (r && r.message) ||
          "Les créneaux n'ont pas pu être changés.";
        return;
      }

      let mot = '📅 Créneaux mis à jour ✅';
      if(g('rvtCrPrevenir').checked && (r.familles || []).length){
        b.textContent = 'Envoi des mails…';
        const envois = await envoyerMailsRvt(r.familles, r.creneaux,
                                             r.limite || tour.limite, 'change');
        const rates = envois.filter(x => x.etat !== 'envoyé');
        mot = rates.length
          ? '📅 Créneaux à jour · ' + (envois.length - rates.length) +
            ' famille(s) prévenue(s), ' + rates.length + ' en échec'
          : '📅 Créneaux à jour · ' + envois.length +
            ' famille(s) prévenue(s) ✅';
      }

      fermer();
      showToast(mot);
      await chargerToursRvt(true);
      redessinerAacCs();
    }catch(e){
      b.disabled = false; b.textContent = '💾 Enregistrer';
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Impossible : ' + e.message;
    }
  });
}


/* ------------------------------------------------------------
   LES MAILS DE LA PROPOSITION

   Un mail par famille, aux DEUX adresses à la fois — élève et
   prescripteur — donc UN SEUL LIEN et une seule grille à remplir.

   Par « mailBilan », comme tout le reste de l'application : c'est le
   Worker qui les relaie en SMTP depuis contact@evolutionconduites.fr.
   ------------------------------------------------------------ */
async function envoyerMailsRvt(envois, creneaux, limite, variante){
  const out = [];
  const change = variante === 'change';

  for(const env of envois){
    const dest = (env.mails || []).filter(m => /@/.test(m));
    if(!dest.length){
      /* Pas d'adresse : ce n'est pas un échec d'envoi, c'est une
         fiche incomplète. Les deux se réparent autrement. */
      out.push({ jeton: env.jeton, eleve: env.eleve, etat: 'aucune adresse' });
      continue;
    }

    const lien = lienRvt() + '?r=' + env.jeton;
    const texte = texteMailRvt(env.eleve, creneaux, lien, limite, change);
    try{
      await appelPrep({ action: 'mailBilan', to: dest,
        /* Le mot est dans l'OBJET aussi : c'est la seule ligne que
           la famille voit dans sa boîte, et c'est là qu'elle décide
           si ce mail est bien celui qu'elle attendait. */
        sujet: change
          ? 'Rendez-vous pédagogique théorique de ' + env.eleve +
            ' — les dates ont changé'
          : 'Rendez-vous pédagogique théorique de ' + env.eleve +
            ' — vos disponibilités',
        texte: texte,
        html: (typeof mailEnHtml === 'function')
          ? mailEnHtml(texte, lien, change
              ? '🗓️ Voir les nouvelles dates'
              : '🗓️ Indiquer nos disponibilités')
          : undefined });
      out.push({ jeton: env.jeton, eleve: env.eleve, etat: 'envoyé' });
    }catch(e){
      out.push({ jeton: env.jeton, eleve: env.eleve,
                 etat: 'échec : ' + (e && e.message ? e.message : 'inconnu') });
    }
  }
  return out;
}


/* ⚠️ CE MAIL DOIT DIRE QU'ILS SERONT PLUSIEURS.

   Sans cette phrase, la famille lit « voici les créneaux possibles »
   comme « choisissez le vôtre » : elle coche une seule date, la
   sienne, et le bureau se retrouve avec huit réponses qui ne se
   croisent nulle part. Le rendez-vous théorique réunit quatre
   familles au minimum — il faut donc TOUTES leurs disponibilités, et
   la date sort de la majorité, pas du premier qui a répondu. */
function texteMailRvt(eleve, creneaux, lien, limite, change){
  /* ⚠️ UN CHANGEMENT SE DIT DÈS LA PREMIÈRE LIGNE, et le mail dit
     pourquoi la réponse déjà donnée ne vaut plus. Une famille qui
     recevrait deux fois le même mail croirait à un doublon, ne le
     rouvrirait pas, et resterait sur les anciennes dates. */
  const l = change
    ? ['Bonjour,', '',
       'Les dates proposées pour le rendez-vous pédagogique théorique ' +
         'de ' + eleve + ' ONT CHANGÉ.',
       '',
       'Si vous nous aviez déjà répondu sur une date qui a été',
       "déplacée, cette réponse ne vaut plus : merci de nous",
       'réindiquer vos disponibilités.',
       '', 'Voici les créneaux à jour :']
    : ['Bonjour,', '',
       /* ⚠️ « THÉORIQUE » SE DIT. David : la famille reçoit aussi
          des convocations pour les RVP 1 et 2, qui sont
          pratiques et ne réunissent qu'elle. Sans le mot, elle
          lit « rendez-vous pédagogique » et croit reconnaître
          celui qu'elle attend. */
       'Nous organisons le rendez-vous pédagogique théorique de ' +
         eleve + '.',
       "C'est un rendez-vous où l'élève vient AVEC son accompagnateur.",
       '',
       'Vous serez plusieurs familles à ce rendez-vous : nous cherchons',
       'la date qui convient au plus grand nombre.',
       '', 'Voici les créneaux possibles :'];

  (creneaux || []).forEach(c => {
    l.push('  · ' + (jourFrCs(c.date) || c.date) +
           (c.heure ? ' à ' + c.heure : ''));
    /* L'adresse sous SA date, pas en bas du mail : c'est la date
       qu'on lit, et c'est là qu'il faut savoir où aller. */
    if(c.lieu) l.push('    📍 ' + c.lieu);
  });

  l.push('',
    'Merci donc de sélectionner TOUTES les dates auxquelles vous êtes',
    'disponibles. La date ayant obtenu la majorité des réponses sera',
    'finalement retenue, et nous vous la confirmerons ultérieurement.');

  /* ⚠️ L'AVERTISSEMENT NE SE DIT QUE S'IL Y A LIEU DE LE DIRE.

     Tous les créneaux au même endroit : le mail est celui de
     toujours, avec l'adresse répétée. Deux villes dans la même
     liste : la famille doit le savoir AVANT de cocher, sinon elle
     coche une date et se déplace au mauvais endroit. */
  const lieux = {};
  (creneaux || []).forEach(c => { if(c.lieu) lieux[c.lieu] = true; });
  if(Object.keys(lieux).length > 1){
    l.push('',
      "⚠️ Attention : les rendez-vous n'ont pas tous lieu au même endroit.",
      "Vérifiez l'adresse de la date que vous choisissez.");
  }

  l.push('', 'Indiquez vos disponibilités ici :', lien, '');
  if(limite){
    l.push('Vous pouvez répondre et modifier votre réponse ' +
           "jusqu'au " + (jourFrCs(limite) || limite) + '.', '');
  }
  l.push("Ce lien vous est personnel : l'élève et l'accompagnateur",
         'remplissent la même réponse, une seule fois.', '',
         'Évolution Conduites');
  return l.join('\n');
}


/* ============================================================
   LA CLÔTURE SE DIT AUX FAMILLES

   David : « on ne reçoit pas de mail de confirmation de rendez-vous ? »
   Non — et c'était le trou. La famille cochait ses disponibilités,
   la date partait dans l'outil du bureau, et chez elle : rien. Elle
   avait répondu à une question et n'obtenait pas la réponse.

   Deux mails, parce qu'il y a deux nouvelles à donner, et qu'une
   seule des deux est une convocation :

     · aux retenus — la date, l'heure, le lieu, et le rappel que
       l'élève vient AVEC son accompagnateur ;
     · aux laissés — « aucune date ne réunissait tout le monde,
       nous vous en reproposerons ». Sans ce mot, ils attendent une
       réponse qui ne vient jamais et rappellent le bureau.

   ⚠️ RIEN NE PART SANS QUE DAVID L'AIT VU. Ces mails vont à des
   familles, ils annoncent une date, et une date annoncée par erreur
   se rattrape mal. La liste des destinataires se lit AVANT l'envoi.
   ============================================================ */

/* ⚠️ CE MAIL EST UNE CONVOCATION, PAS UN ACCUSÉ DE RÉCEPTION.

   Tout ce qui décide d'un déplacement tient dans les trois
   premières lignes : quel jour, quelle heure, quelle adresse. Le
   reste peut ne pas être lu. */
function texteMailRvtFixe(eleve, date, heure, lieu, lien){
  const l = ['Bonjour,', '',
    'Le rendez-vous pédagogique théorique de ' + eleve + ' est fixé au',
    (jourFrCs(date) || date) + (heure ? ' à ' + heure : '') + '.'];

  if(lieu) l.push('', '📍 ' + lieu);

  l.push('',
    "L'élève vient AVEC son accompagnateur.",
    '',
    'Merci de nous prévenir si un empêchement survenait.');

  /* ⚠️ LE LIEN REVIENT DANS LA CONVOCATION.

     David, le 9 septembre : « il faudrait pouvoir leur renvoyer
     leur lien pour qu'ils voient bien la date de rendez-vous sur le
     site ». C'était le vrai manque : la famille avait un lien pour
     DONNER ses disponibilités, et plus rien pour RELIRE ce qui avait
     été décidé. Un mail se perd au fond d'une boîte ; une page se
     rouvre.

     C'est le même lien que celui de la proposition — celui qu'elle a
     déjà utilisé, qu'elle reconnaît, et qui affiche maintenant
     « votre rendez-vous est le … ». Un second lien pour la même
     chose, ce serait deux adresses à tenir. */
  if(lien){
    l.push('', 'Vous pouvez retrouver ce rendez-vous ici :', lien);
  }

  l.push('', 'Évolution Conduites');
  return l.join('\n');
}


/* ⚠️ CE MAIL DIT POURQUOI, ET IL DIT QUE ÇA CONTINUE.

   « Vous n'êtes pas retenu » tout seul se lit comme un refus. Ce
   n'en est pas un : leurs dates ne croisaient pas celles de la
   majorité, et ils repassent au tour suivant. Les deux moitiés se
   disent ensemble ou pas du tout. */
function texteMailRvtReporte(eleve){
  return ['Bonjour,', '',
    'Merci de nous avoir indiqué vos disponibilités pour le',
    'rendez-vous pédagogique théorique de ' + eleve + '.',
    '',
    "Aucune date ne réunissait tout le monde : nous vous en",
    'reproposerons prochainement.',
    '', 'Évolution Conduites'].join('\n');
}


/* ⚠️ UNE ANNULATION SE DIT AVEC SA DATE.

   « Le rendez-vous est annulé » sans dire lequel, c'est un mot que
   la famille ne peut pas rattacher : elle en a peut-être deux en
   tête, le théorique et un rendez-vous pratique. La date qu'on
   annule est la seule chose qui rende ce mail lisible.

   Et il dit tout de suite que ça continue : une annulation sèche se
   lit comme un abandon. */
function texteMailRvtAnnule(eleve, date, heure){
  return ['Bonjour,', '',
    'Le rendez-vous pédagogique théorique de ' + eleve + ' prévu',
    'le ' + (jourFrCs(date) || date) + (heure ? ' à ' + heure : '') +
      ' est ANNULÉ.',
    '',
    'Nous vous reproposerons des dates prochainement.',
    '',
    'Avec toutes nos excuses pour le dérangement.',
    '', 'Évolution Conduites'].join('\n');
}


/* Les adresses d'une famille : celle de l'élève et celle du
   prescripteur, comme pour la proposition. Une fiche sans adresse
   n'est pas un échec d'envoi — c'est une fiche à compléter. */
function mailsDeLaFamille(nom){
  const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
  return [(f && f.email) || '', (f && f.mailPrescripteur) || '']
    .filter(m => /@/.test(m));
}


/* L'envoi de la clôture, les deux variantes par le même chemin que
   tout le reste — « mailBilan », donc contact@evolutionconduites.fr
   et pas le compte Google du script. */
async function envoyerMailsCloture(retenus, laisses, info, jetons){
  const out = [];
  const j = jetons || {};

  const un = async (nom, variante) => {
    const dest = mailsDeLaFamille(nom);
    if(!dest.length){
      out.push({ eleve: nom, variante: variante, etat: 'aucune adresse' });
      return;
    }
    /* Le lien de CETTE famille. Sans jeton — une ligne trop vieille,
       un tour d'avant — le mail part quand même, sans lien : mieux
       vaut une convocation sans page qu'une famille non prévenue. */
    const lien = j[normaliserMot(nom)]
      ? lienRvt() + '?r=' + j[normaliserMot(nom)] : '';

    const texte = variante === 'fixe'
      ? texteMailRvtFixe(nom, info.date, info.heure, info.lieu, lien)
      : (variante === 'annule'
          ? texteMailRvtAnnule(nom, info.date, info.heure)
          : texteMailRvtReporte(nom));
    try{
      await appelPrep({ action: 'mailBilan', to: dest,
        sujet: variante === 'fixe'
          ? 'Rendez-vous pédagogique théorique de ' + nom + ' — ' +
            'c\'est le ' + (jourFrCs(info.date) || info.date)
          : (variante === 'annule'
              ? 'Rendez-vous pédagogique théorique de ' + nom + ' — ' +
                'ANNULÉ'
              : 'Rendez-vous pédagogique théorique de ' + nom + ' — ' +
                'de nouvelles dates à venir'),
        texte: texte,
        html: (typeof mailEnHtml === 'function')
          ? mailEnHtml(texte, variante === 'fixe' ? lien : '',
                       '🗓️ Voir mon rendez-vous') : undefined });
      out.push({ eleve: nom, variante: variante, etat: 'envoyé' });
    }catch(e){
      out.push({ eleve: nom, variante: variante,
                 etat: 'échec : ' + (e && e.message ? e.message : 'inconnu') });
    }
  };

  for(const n of (retenus || [])) await un(n, 'fixe');
  for(const n of (laisses || [])) await un(n, info && info.annule ? 'annule' : 'reporte');
  return out;
}


/* Les jetons d'un tour, par nom d'élève. C'est la grille du bureau
   qui les porte : elle est derrière le droit du suivi AAC. */
function jetonsDuTour(t){
  const out = {};
  ((t && t.eleves) || []).forEach(e => {
    if(e && e.eleve && e.jeton) out[normaliserMot(e.eleve)] = e.jeton;
  });
  return out;
}


/* L'adresse de la page des familles, déduite de celle de
   l'application : elle vit dans le même dossier. L'écrire en dur
   casserait les liens le jour d'un déménagement — c'est déjà la
   règle du lien de cours. */
function lienRvt(){
  return location.origin +
         location.pathname.replace(/[^/]*$/, '') + 'rvt.html';
}


/* ------------------------------------------------------------
   LA GRILLE DES RÉPONSES

   « Un tableau élèves × créneaux, avec le compte sous chaque colonne
   et le meilleur mis en avant. »
   ------------------------------------------------------------ */
/* ⚠️ CE QUI DEMANDE UNE ATTENTION : les propositions en cours, et
   les rendez-vous à venir. C'est le compte du bouton de filtre. */
function compteOrganisationRvt(){
  const ouverts = (toursRvt || []).filter(t => !t.clos).length;
  return ouverts + rvtPrevus().length;
}


/* Les propositions terminées : rendez-vous passé, ou abandonnée.

   ⚠️ LES TROIS DERNIÈRES, ET PAS « DEPUIS TOUJOURS ». David :
   « on garde juste les 3 derniers ». Au-delà, la liste ne sert plus
   qu'une fois par an, et ce jour-là c'est le classeur qu'on ouvre.
   Une liste qui garde tout finit par ne plus rien montrer. */
function toursTerminesRvt(){
  const enCours = {};
  rvtPrevus().forEach(p => { enCours[p.tour.id] = true; });
  return (toursRvt || [])
    .filter(t => t.clos && !enCours[t.id])
    .slice(0, 3);
}


function dessinerToursRvt(zone){
  zone.innerHTML = '';

  /* ── EN COURS ── ce qui attend une décision de ta part */
  const ouverts = (toursRvt || []).filter(t => !t.clos);
  if(ouverts.length){
    zone.appendChild(titreZoneRvt('EN COURS',
      ouverts.length + ' proposition(s) — elles attendent ta décision'));
    ouverts.forEach(t => zone.appendChild(carteTourRvt(t)));
  }
}


/* Le titre d'une zone : trois blocs se suivent, il faut savoir où
   l'on est sans compter les cadres. */
function titreZoneRvt(titre, sous){
  const d = document.createElement('div');
  d.style.cssText = 'margin:4px 0 8px;';
  d.innerHTML = '<div style="font-size:11.5px;font-weight:800;' +
    'letter-spacing:.08em;color:var(--muted);">' +
    String(titre).replace(/</g, '&lt;') + '</div>' +
    (sous ? '<div style="font-size:11.5px;color:var(--muted);">' +
            String(sous).replace(/</g, '&lt;') + '</div>' : '');
  return d;
}


function comptesTourRvt(t){
  const out = {};
  (t.creneaux || []).forEach(c => { out[c.id] = 0; });
  (t.eleves || []).forEach(e => {
    Object.keys(e.reponses || {}).forEach(k => {
      if(e.reponses[k] === 'oui' && out[k] !== undefined) out[k]++;
    });
  });
  return out;
}


function carteTourRvt(t){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:11px 13px;margin-bottom:12px;';

  const comptes = comptesTourRvt(t);
  const meilleur = Object.keys(comptes)
    .sort((a, b) => comptes[b] - comptes[a])[0];

  const attendus = (t.eleves || []).length;
  const repondus = (t.eleves || []).filter(e => e.reponduLe).length;

  /* ⚠️ UN TOUR CLOS GARDE SA GRILLE — v907.

     David : « je ne vois plus le tableau avec les réponses des
     personnes. Le tableau d'avant était beaucoup mieux ».

     La grille ne s'affichait que pour les tours OUVERTS. Dès qu'une
     date était retenue — ou dès que la limite passait — le tour
     disparaissait, tableau compris, alors que les réponses sont
     intactes dans le classeur. On ne pouvait plus vérifier une
     décision, ni la comprendre trois jours plus tard.

     Ce qui change quand un tour est clos, c'est ce qu'on peut en
     FAIRE — pas ce qu'on peut en VOIR. */
  const retenu = (t.creneaux || [])
    .filter(c => t.retenu && String(c.id) === String(t.retenu))[0] || null;

  if(!t.clos){
    d.style.borderColor = 'var(--orange)';
  }else if(retenu){
    d.style.borderColor = 'var(--accent-text)';
  }else{
    d.style.borderColor = 'var(--line)';
    d.style.opacity = '.85';
  }

  const tete = document.createElement('div');
  tete.style.cssText = 'font-weight:700;font-size:13px;margin-bottom:3px;';
  tete.textContent = '🗣️ Proposition du ' + (t.creee || '').split(' ')[0] +
    ' — ' + repondus + ' réponse(s) sur ' + attendus;
  d.appendChild(tete);

  const sous = document.createElement('div');
  sous.style.cssText = 'font-size:11.5px;color:var(--muted);' +
    'margin-bottom:9px;line-height:1.5;';
  sous.textContent = !t.clos
    ? (t.limite ? 'Ils peuvent répondre jusqu\'au ' + jourFrCs(t.limite)
                : 'Sans date limite')
    : (retenu
        ? '✅ Retenu : le ' + jourFrCs(retenu.date) +
          (retenu.heure ? ' à ' + retenu.heure : '')
        : '🗑️ Sans suite' + (t.closLe ? ' — ' + t.closLe : ''));
  d.appendChild(sous);

  /* Une colonne par créneau, une ligne par élève. */
  const env = document.createElement('div');
  env.style.cssText = 'overflow-x:auto;margin-bottom:9px;';
  const tab = document.createElement('table');
  tab.style.cssText = 'border-collapse:collapse;font-size:12px;width:100%;';

  const thead = document.createElement('tr');
  thead.appendChild(cell('th', ''));
  (t.creneaux || []).forEach(c => {
    /* ⚠️ LE LIEU SOUS LA COLONNE. Deux créneaux le même jour à la
       même heure dans deux villes sont IDENTIQUES à l'œil sans lui :
       on retiendrait la mauvaise. */
    const ou = nomLieuRdv(c.lieuCle) || String(c.lieu || '').split(' — ')[0];
    const th = cell('th', jourFrCs(c.date) + (c.heure ? '\n' + c.heure : '') +
                          (ou ? '\n🏢 ' + ou : ''));
    th.style.whiteSpace = 'pre-line';
    /* Sur un tour clos, c'est la colonne RETENUE qu'on met en
       avant — pas la meilleure. Elles ne sont pas toujours la même,
       et c'est la décision qu'on vient relire. */
    const enAvant = t.clos ? (retenu && c.id === retenu.id)
                           : (c.id === meilleur && comptes[c.id] > 0);
    if(enAvant){
      th.style.color = 'var(--accent-text)';
      th.style.fontWeight = '800';
    }
    thead.appendChild(th);
  });
  thead.appendChild(cell('th', ''));
  tab.appendChild(thead);

  (t.eleves || []).forEach(e => {
    const tr = document.createElement('tr');
    const nom = cell('td', e.eleve);
    nom.style.textAlign = 'left';
    /* CE QUI N'EST PAS PARTI SE DIT ICI, pas ailleurs : c'est la
       ligne de celui qui ne répondra jamais. */
    if(e.envoi && e.envoi !== 'envoyé'){
      nom.style.color = 'var(--warn-text)';
      nom.title = 'Mail : ' + e.envoi;
      nom.textContent = '⚠️ ' + e.eleve;
    }
    tr.appendChild(nom);

    (t.creneaux || []).forEach(c => {
      const r = (e.reponses || {})[c.id];
      /* « Pas de réponse » EST UN ÉTAT À PART. Le confondre avec
         « ne peut pas », c'est ne jamais relancer celui qui n'a rien
         dit — et compter comme un refus un silence. */
      const td = cell('td', r === 'oui' ? '✅' : (r === 'non' ? '✖️' : '·'));
      if(!r) td.style.opacity = '.4';
      tr.appendChild(td);
    });

    /* ⚠️ LES DEUX GESTES SONT SUR LA LIGNE DE CELUI QU'ILS
       CONCERNENT.

       David, le 9 septembre : « qu'on puisse renvoyer les mails
       individuellement dans le tableau, et qu'on puisse supprimer
       l'accès au site à certains élèves dans le tableau ».

       Ailleurs, il faudrait choisir un nom dans une liste — et se
       tromper de nom sur une relance est sans gravité, mais se
       tromper de nom en coupant un accès en a. Le geste est à côté
       de la personne : il n'y a rien à désigner. */
    tr.appendChild(cellGestesRvt(t, e));
    tab.appendChild(tr);
  });

  const pied = document.createElement('tr');
  pied.appendChild(cell('td', ''));
  (t.creneaux || []).forEach(c => {
    const td = cell('td', String(comptes[c.id]));
    td.style.fontWeight = '800';
    if(c.id === meilleur && comptes[c.id] > 0) td.style.color = 'var(--accent-text)';
    pied.appendChild(td);
  });
  pied.appendChild(cell('td', ''));
  tab.appendChild(pied);

  env.appendChild(tab);
  d.appendChild(env);

  /* Les sans-réponse, nommés : c'est eux qu'on relance. */
  const muets = (t.eleves || []).filter(e => !e.reponduLe).map(e => e.eleve);
  if(muets.length){
    const m = document.createElement('div');
    m.style.cssText = 'font-size:11.5px;color:var(--muted);' +
      'margin-bottom:9px;line-height:1.5;display:flex;gap:8px;' +
      'align-items:baseline;flex-wrap:wrap;';
    const txt = document.createElement('span');
    txt.style.cssText = 'flex:1;min-width:0;';
    txt.textContent = '⏳ ' + muets.length + ' sans réponse : ' +
                      muets.join(', ');
    m.appendChild(txt);

    /* ⚠️ UN SILENCE SE RELANCE RAREMENT TOUT SEUL — v907.

       David : « il manque de voir ceux qui n'ont pas encore répondu
       avec la possibilité de leur renvoyer le mail ». Le nom du
       geste est ici, à côté des noms qu'il concerne.

       Il ne part QU'AUX SANS-RÉPONSE. Relancer quelqu'un qui a
       répondu lui ferait croire qu'on a perdu sa réponse — et sur un
       tour où l'on attend des disponibilités, c'est la meilleure
       façon d'en recevoir deux qui se contredisent. */
    if(!t.clos){
      m.appendChild(petitBouton('📨 Relancer les ' + muets.length,
        'Le même lien, à ceux qui n\'ont rien dit',
        () => relancerMuetsRvt(t, muets)));
    }
    d.appendChild(m);
  }

  /* ⚠️ « AUCUNE DE CES DATES » EST UNE RÉPONSE, PAS UN SILENCE.

     Ils ont répondu, et ils ont répondu non partout. Les laisser
     fondus dans la grille, c'est les relancer pour rien — et
     surtout, c'est ne pas voir qu'il leur faut un autre tour. */
  const aucune = (t.eleves || []).filter(e => {
    const r = e.reponses || {};
    const cles = Object.keys(r);
    return e.reponduLe && cles.length &&
           cles.every(k => r[k] === 'non');
  }).map(e => e.eleve);
  if(aucune.length){
    const m = document.createElement('div');
    m.style.cssText = 'font-size:11.5px;color:var(--warn-text);' +
      'margin-bottom:9px;line-height:1.5;';
    m.textContent = '✖️ Aucune de ces dates : ' + aucune.join(', ') +
      ' — il leur faudra d\'autres créneaux.';
    d.appendChild(m);
  }

  const act = document.createElement('div');
  act.style.cssText = 'display:flex;flex-wrap:wrap;gap:7px;';

  /* L'écran se relit tout seul toutes les 90 secondes, mais on
     regarde souvent juste après avoir raccroché : ce bouton évite
     de recharger la page pour gagner une minute. */
  act.appendChild(petitBouton('🔄 Actualiser les réponses',
    'Relire tout de suite ce que les familles ont répondu',
    async () => {
      await chargerToursRvt(true);
      redessinerAacCs();
    }));

  /* ⚠️ UN TOUR N'EST PAS UNE LISTE CLOSE.

     « Une fois que c'est envoyé je ne peux ajouter personne. » On
     invite quatre familles, deux répondent qu'elles ne peuvent pas,
     on en ajoute trois — et parfois on déplace une date en fonction
     des retours. Les deux se font tant que le tour est ouvert. */
  /* ⚠️ CE QU'ON PEUT FAIRE DÉPEND DE L'ÉTAT — CE QU'ON PEUT VOIR,
     NON. Ajouter des familles ou déplacer des créneaux sur un
     rendez-vous déjà fixé enverrait des invitations à une date
     décidée : ces deux-là s'arrêtent à la clôture. */
  if(!t.clos){
    act.appendChild(petitBouton('➕ Ajouter des familles',
      'Elles reçoivent les mêmes créneaux — c\'est le même rendez-vous',
      () => ajouterAuTourRvt(t)));

    act.appendChild(petitBouton('📅 Modifier les créneaux',
      'Ajouter une date, ou en déplacer une selon les retours',
      () => changerCreneauxRvt(t)));
  }

  /* Retenir — ou changer la date, qui est le même geste sur un tour
     déjà décidé. Le créneau retenu n'est pas proposé : le retenir de
     nouveau ne changerait rien. */
  if(!t.clos || retenu){
    (t.creneaux || []).forEach(c => {
      if(!comptes[c.id]) return;
      if(retenu && c.id === retenu.id) return;
      act.appendChild(petitBouton(
        (retenu ? '↩️ Changer pour le ' : '📅 Retenir le ') +
          jourFrCs(c.date) + ' (' + comptes[c.id] + ')',
        retenu
          ? 'Le rendez-vous se déplace — ceux qui ne peuvent pas en sortent'
          : 'Le rendez-vous est fixé pour ceux qui ont dit oui',
        () => retenirCreneauRvt(t, c, comptes[c.id])));
    });
  }

  if(!t.clos){
    act.appendChild(petitBouton('🗑️ Abandonner', 'Aucun créneau ne va — ' +
      'les élèves redeviennent proposables', async () => {
        if(!await confirmer('Abandonner cette proposition ?\n\n' +
          'Les ' + attendus + ' élèves redeviennent proposables, et leurs ' +
          'réponses restent consultables.', 'Abandonner')) return;
        await appelPrep({ action: 'rvtFermer', id: t.id });
        await chargerToursRvt(true);
        redessinerAacCs();
      }));
  }

  if(retenu){
    act.appendChild(petitBouton('↩️ Annuler ce rendez-vous',
      'Le rendez-vous n\'a pas lieu — la proposition rouvre',
      () => annulerRendezVousRvt(t, retenu)));
  }

  d.appendChild(act);
  return d;
}


/* ⚠️ RELANCER NE PART QU'AUX SANS-RÉPONSE.

   C'est le même mail et le MÊME LIEN que l'invitation : ce que la
   famille a perdu, ce n'est pas un autre message, c'est celui-là.
   Un second texte pour la même chose finirait par dire autre
   chose. */
async function relancerMuetsRvt(t, muets){
  const vises = (t.eleves || []).filter(e =>
    muets.indexOf(e.eleve) !== -1 && !e.accesRetire);
  if(!vises.length){
    showToast('Personne à relancer — leurs liens sont coupés');
    return;
  }

  const sansMail = vises.filter(e => !mailsDeLaFamille(e.eleve).length)
                        .map(e => e.eleve);
  const lignes = ['Relancer ' + vises.length + ' famille(s) sans réponse ?', '',
    '   ' + vises.map(e => e.eleve).join(', '), '',
    'Elles reçoivent les mêmes créneaux et le même lien, avec un mot',
    "qui dit qu'on attend encore leur réponse.", ''];
  if(sansMail.length){
    lignes.push('⚠️ Sans adresse mail, donc à prévenir à la main :',
                '   ' + sansMail.join(', '), '');
  }

  if(!await confirmer(lignes.join('\n'), '📨 Relancer')) return;

  showToast('Envoi en cours…');
  const envois = await envoyerMailsRvt(
    vises.map(e => ({ eleve: e.eleve, jeton: e.jeton,
                      mails: mailsDeLaFamille(e.eleve) })),
    t.creneaux || [], t.limite || '');

  try{
    await appelPrep({ action: 'rvtEnvois', id: t.id,
                      envois: JSON.stringify(envois) });
  }catch(e){ /* la grille dira « envoi inconnu », c'est déjà ça */ }

  const partis = envois.filter(x => x.etat === 'envoyé').length;
  const rates = envois.filter(x => x.etat !== 'envoyé');
  showToast(rates.length
    ? '📨 ' + partis + ' relancée(s), ' + rates.length + ' à faire à la main : ' +
      rates.map(x => x.eleve).join(', ')
    : '📨 ' + partis + ' famille(s) relancée(s) ✅');

  await chargerToursRvt(true);
  redessinerAacCs();
}


/* ⚠️ ANNULER DIT TOUT CE QU'IL DÉFAIT AVANT DE LE FAIRE.

   Des familles ont pu recevoir une convocation : elles attendent ce
   jour-là. Et la date est écrite sur la fiche de chaque élève
   retenu — c'est elle qui les fait disparaître de « Théorique à
   faire ». L'oublier laisserait des élèves annoncés pour un
   rendez-vous qui n'existe plus, ET invisibles dans la liste de ceux
   à replacer. */
async function annulerRendezVousRvt(t, creneau){
  const vises = (t.eleves || []).filter(e => e.retenu === 'oui');
  const quand = jourFrCs(creneau.date) +
                (creneau.heure ? ' à ' + creneau.heure : '');

  if(!await confirmer(
      'Annuler le rendez-vous du ' + quand + ' ?\n\n' +
      '↩️ ' + vises.length + ' élève(s) perdent cette date et redeviennent ' +
      'à replacer :\n   ' + vises.map(e => e.eleve).join(', ') + '\n\n' +
      'La proposition rouvre avec toutes ses réponses : tu pourras ' +
      'retenir une autre date sans rien redemander aux familles.',
      '↩️ Annuler le rendez-vous')) return;

  try{
    const r = await appelPrep({ action: 'rvtAnnuler', id: t.id });
    if(!r || r.status !== 'ok'){
      showToast((r && r.message) || 'Impossible.');
      return;
    }
    showToast('Rendez-vous annulé — ' + (r.rendus || []).length +
              ' élève(s) à replacer');

    /* ⚠️ LES FICHES ONT CHANGÉ CÔTÉ SERVEUR. Sans cette relecture,
       la liste continuerait d'afficher « théorique prévu le … » sur
       des élèves qui n'ont plus de rendez-vous. */
    if(typeof chargerBureau === 'function'){
      try{ await chargerBureau(true); }catch(e){}
    }
    await chargerToursRvt(true);
    redessinerAacCs();

    /* Le mot aux familles : facultatif, et DÉCOCHÉ par défaut —
       David. La plupart des annulations arrivent avant que quoi que
       ce soit soit parti, et un mail d'annulation à quelqu'un qui
       n'a jamais reçu de convocation fait plus de mal que de bien. */
    if(vises.length && await confirmer(
        'Prévenir les ' + vises.length + ' famille(s) de l\'annulation ?\n\n' +
        'À ne faire QUE si elles avaient reçu la convocation du ' + quand +
        '.\n\nElles liront : « le rendez-vous du ' + quand + ' est ANNULÉ, ' +
        'nous vous reproposerons des dates ».',
        '📨 Prévenir de l\'annulation ?')){
      await envoyerMailsCloture([], vises.map(e => e.eleve),
        { date: creneau.date, heure: creneau.heure, annule: true },
        jetonsDuTour(t));
      showToast('📨 Familles prévenues ✅');
    }
  }catch(e){ showToast('Impossible : ' + e.message); }
}


function cell(type, texte){
  const c = document.createElement(type);
  c.textContent = texte;
  c.style.cssText = 'border:1px solid var(--line);padding:5px 7px;' +
    'text-align:center;';
  return c;
}


async function retenirCreneauRvt(t, c, combien){
  const ouis = (t.eleves || [])
    .filter(e => (e.reponses || {})[c.id] === 'oui').map(e => e.eleve);
  const autres = (t.eleves || [])
    .filter(e => (e.reponses || {})[c.id] !== 'oui').map(e => e.eleve);

  /* CE QUE ÇA FAIT, DIT AVANT DE LE FAIRE — et surtout ce que ça ne
     fait PAS : celui qui n'a pas répondu n'a pas dit oui. */
  if(!await confirmer(
      'Fixer le rendez-vous théorique au ' + jourFrCs(c.date) +
      (c.heure ? ' à ' + c.heure : '') + ' ?\n' +
      /* Le lieu se relit ici : c'est le dernier moment avant que la
         date parte sur les fiches. */
      (c.lieu ? '📍 ' + c.lieu + '\n' : '') + '\n' +
      '✅ ' + ouis.length + ' élève(s) : ' + ouis.join(', ') +
      '\n\n' + (autres.length
        ? '⏳ ' + autres.length + ' laissé(s) pour un prochain tour : ' +
          autres.join(', ') + '\n(ceux qui ne pouvaient pas, ET ceux qui ' +
          "n'ont pas répondu)"
        : 'Tout le monde peut venir.'),
      'Retenir ce créneau')) return;

  try{
    const r = await appelPrep({ action: 'rvtRetenir', id: t.id,
                                creneau: c.id, par: ACCES.moniteur || '' });
    if(!r || r.status !== 'ok'){
      showToast((r && r.message) || 'Impossible.');
      return;
    }
    showToast('Rendez-vous fixé pour ' + (r.retenus || []).length +
              ' élève(s) ✅');

    /* ⚠️ LA FICHE DE SUIVI A CHANGÉ CÔTÉ SERVEUR, PAS EN MÉMOIRE.

       C'est le serveur qui écrit « théorique prévu le … » sur chaque
       élève retenu — il est le seul à savoir lesquels ont dit oui.
       L'écran, lui, lit encore l'ancien état : sans quoi la liste
       continuerait d'afficher « théorique à prévoir » sur des élèves
       qu'on vient de placer, et on les replacerait.

       ⚠️ ON POSE CE QU'IL REND, ON NE VA PAS LE RECHERCHER.

       David : « je dois rafraîchir la page pour que ça apparaisse
       sur les noms ». Ce n'était pas un cache : la date s'écrit par
       Apps Script, et on allait la relire par l'AUTRE porte — le
       Worker, qui lit la feuille directement. Deux portes sur le
       même classeur, et rien qui fasse attendre la seconde que la
       première ait fini de poser.

       Le serveur rend maintenant les fiches qu'il vient d'écrire :
       il relit SA feuille, il ne peut pas être en retard sur
       lui-même. La grande relecture ne reste qu'en secours, pour le
       jour où un vieux script répondrait sans elles. */
    const poses = (typeof poserSuiviLocal === 'function')
      ? poserSuiviLocal(r.suivi) : 0;
    if(!poses && typeof chargerBureau === 'function'){
      try{ await chargerBureau(true); }catch(e){}
    }
    await chargerToursRvt(true);
    redessinerAacCs();

    /* La date est posée ; reste à la DIRE aux familles. */
    await prevenirFamillesRvt(r, c, t);
  }catch(e){ showToast('Impossible : ' + e.message); }
}


/* ⚠️ RIEN NE PART SANS QUE DAVID AIT VU QUI LE REÇOIT.

   Ces mails annoncent une date à des familles. Une date annoncée
   par erreur ne se rattrape pas d'un clic : elle se rattrape par
   des appels. La liste se lit donc AVANT l'envoi, avec le nombre
   d'adresses en face de chaque nom — c'est là qu'une fiche sans
   mail se voit, et pas trois jours plus tard.

   Refuser l'envoi ne défait rien : la date est retenue, elle est
   sur les fiches. On pourra toujours prévenir autrement. */
async function prevenirFamillesRvt(r, c, t){
  const retenus = r.retenus || [];
  const laisses = r.laisses || [];
  if(!retenus.length && !laisses.length) return;

  const sansMail = retenus.concat(laisses)
    .filter(n => !mailsDeLaFamille(n).length);

  const quand = (jourFrCs(r.date || c.date) || c.date) +
                ((r.heure || c.heure) ? ' à ' + (r.heure || c.heure) : '');

  const lignes = ['Prévenir les familles par mail ?', ''];
  if(retenus.length){
    lignes.push('✅ Convocation au ' + quand +
                ((r.lieu || c.lieu) ? ' — 📍 ' + (r.lieu || c.lieu) : '') + ' :',
                '   ' + retenus.join(', '), '');
  }
  if(laisses.length){
    lignes.push('⏳ « Aucune date ne réunissait tout le monde, nous vous en ' +
                'reproposerons » :',
                '   ' + laisses.join(', '), '');
  }
  if(sansMail.length){
    lignes.push('⚠️ Sans adresse mail, donc à prévenir à la main :',
                '   ' + sansMail.join(', '), '');
  }
  lignes.push('Envoi depuis contact@evolutionconduites.fr.');

  if(!await confirmer(lignes.join('\n'), '📨 Envoyer')) {
    showToast('Aucun mail envoyé — la date reste fixée');
    return;
  }

  showToast('Envoi en cours…');
  const envois = await envoyerMailsCloture(retenus, laisses, {
    date: r.date || c.date, heure: r.heure || c.heure,
    lieu: r.lieu || c.lieu
  }, jetonsDuTour(t));

  const partis = envois.filter(x => x.etat === 'envoyé').length;
  const rates = envois.filter(x => x.etat !== 'envoyé');
  showToast(rates.length
    ? '📨 ' + partis + ' envoyé(s), ' + rates.length + ' à faire à la main : ' +
      rates.map(x => x.eleve).join(', ')
    : '📨 ' + partis + ' famille(s) prévenue(s) ✅');
}


/* ============================================================
   LES DEUX GESTES D'UNE LIGNE : RELANCER, ET COUPER

   David, le 9 septembre 2026 : « qu'on puisse renvoyer les mails
   individuellement dans le tableau, et qu'on puisse supprimer
   l'accès au site à certains élèves dans le tableau », et sur le
   second : « c'est pour un lien parti par erreur ».

   ⚠️ CE QU'ON RENVOIE DÉPEND DE L'ÉTAT DU TOUR, ET C'EST TOUT.

   Tour ouvert  → l'invitation. C'est une RELANCE : « vous n'avez
                  pas encore répondu ». Elle repart avec les mêmes
                  créneaux et la même date limite — c'est le même
                  rendez-vous, pas un second tour.
   Tour retenu  → la convocation. C'est un RAPPEL : « c'est le
                  jeudi 12 à 18 h ». La date est déjà prise.

   Un seul bouton, donc, et l'écran sait lequel des deux mails
   part. Deux boutons obligeraient à savoir, avant d'appuyer, dans
   quel état est le tour — et c'est justement ce que l'écran a sous
   les yeux et pas la personne.
   ============================================================ */

function cellGestesRvt(t, e){
  const td = document.createElement('td');
  td.style.cssText = 'border:1px solid var(--line);padding:4px 5px;' +
    'text-align:center;white-space:nowrap;';

  /* ⚠️ UN ACCÈS COUPÉ SE VOIT SUR LA LIGNE. Sans ça, on relancerait
     quelqu'un dont le lien ne s'ouvre plus — et on attendrait sa
     réponse. */
  if(e.accesRetire){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;padding:4px 7px;font-size:11px;margin:0;';
    b.textContent = '🔓 Rendre';
    b.title = 'Son lien ne s\'ouvre plus. Le remettre en service.';
    b.addEventListener('click', () => changerAccesRvt(t, e, false));
    td.appendChild(b);
    return td;
  }

  const env = document.createElement('button');
  env.className = 'btn btn-secondary';
  env.style.cssText = 'width:auto;padding:4px 7px;font-size:11px;margin:0 4px 0 0;';
  env.textContent = '📨';
  env.title = t.clos
    ? 'Renvoyer la convocation à ' + e.eleve + ', avec son lien'
    : 'Relancer ' + e.eleve + ' — mêmes créneaux, même date limite';
  env.addEventListener('click', () => renvoyerMailRvt(t, e, env));
  td.appendChild(env);

  const coup = document.createElement('button');
  coup.className = 'btn btn-secondary';
  coup.style.cssText = 'width:auto;padding:4px 7px;font-size:11px;margin:0;';
  coup.textContent = '🔒';
  coup.title = 'Couper l\'accès de ' + e.eleve + ' — pour un lien parti ' +
               'par erreur';
  coup.addEventListener('click', () => changerAccesRvt(t, e, true));
  td.appendChild(coup);

  return td;
}


/* Renvoyer LE mail qui correspond à l'état du tour, à une seule
   famille. Rien n'est envoyé sans que David ait lu qui le reçoit :
   c'est la même règle que pour la clôture. */
async function renvoyerMailRvt(t, e, bouton){
  const dest = mailsDeLaFamille(e.eleve);
  if(!dest.length){
    showToast('Aucune adresse mail sur la fiche de ' + e.eleve);
    return;
  }

  const creneau = (t.creneaux || [])
    .filter(c => t.retenu && String(c.id) === String(t.retenu))[0];

  /* ⚠️ UN TOUR CLOS SANS CRÉNEAU RETENU N'A RIEN À RAPPELER. Il a
     été abandonné : renvoyer quoi que ce soit dirait à la famille
     qu'un rendez-vous existe. */
  if(t.clos && !creneau){
    showToast('Cette proposition a été abandonnée — rien à renvoyer');
    return;
  }

  const quoi = creneau
    ? 'la convocation du ' + jourFrCs(creneau.date) +
      (creneau.heure ? ' à ' + creneau.heure : '')
    : 'les créneaux à choisir';

  if(!await confirmer(
      'Renvoyer ' + quoi + ' à ' + e.eleve + ' ?\n\n' +
      '📨 ' + dest.join(', ') + '\n\n' +
      (creneau
        ? 'Le mail portera son lien : il pourra relire la date sur le site.'
        : 'Mêmes créneaux, même date limite — c\'est une relance.'),
      '📨 Envoyer')) return;

  bouton.disabled = true;
  bouton.textContent = '…';
  try{
    let etat;
    if(creneau){
      const r = await envoyerMailsCloture([e.eleve], [], {
        date: creneau.date, heure: creneau.heure, lieu: creneau.lieu
      }, jetonsDuTour(t));
      etat = (r[0] || {}).etat;
    }else{
      const r = await envoyerMailsRvt(
        [{ eleve: e.eleve, jeton: e.jeton, mails: dest }],
        t.creneaux || [], t.limite || '');
      etat = (r[0] || {}).etat;
      /* Ce qui est parti retourne au classeur : un mail dont on ne
         sait pas s'il est parti se renvoie deux fois. */
      try{
        await appelPrep({ action: 'rvtEnvois', id: t.id,
                          envois: JSON.stringify(r) });
      }catch(err){ /* la grille dira « envoi inconnu », c'est déjà ça */ }
    }
    showToast(etat === 'envoyé'
      ? '📨 Renvoyé à ' + e.eleve + ' ✅'
      : 'Pas parti : ' + (etat || 'inconnu'));
    await chargerToursRvt(true);
    redessinerAacCs();
  }catch(err){
    showToast('Impossible : ' + err.message);
    bouton.disabled = false;
    bouton.textContent = '📨';
  }
}


/* ⚠️ COUPER UN ACCÈS SE DIT EN ENTIER AVANT DE LE FAIRE.

   Ce n'est pas un réglage : c'est une porte qu'on ferme au nez de
   quelqu'un. Il faut donc dire ce qu'il verra — « ce lien n'est
   plus valable » — et rappeler que ça se défait, sinon personne
   n'ose s'en servir. */
async function changerAccesRvt(t, e, retirer){
  if(retirer){
    if(!await confirmer(
        'Couper l\'accès au site de ' + e.eleve + ' ?\n\n' +
        'Son lien cessera de s\'ouvrir : il lira « ce lien n\'est plus ' +
        'valable ».\n\n' +
        'Ses réponses restent visibles ici, et tu peux lui rendre ' +
        'l\'accès quand tu veux.',
        '🔒 Couper')) return;
  }

  try{
    const r = await appelPrep({ action: 'rvtAcces', id: t.id,
                                eleve: e.eleve,
                                retire: retirer ? 'oui' : '' });
    if(!r || r.status !== 'ok'){
      showToast((r && r.message) || 'Impossible.');
      return;
    }
    showToast(retirer
      ? '🔒 Lien de ' + e.eleve + ' coupé'
      : '🔓 Lien de ' + e.eleve + ' remis en service');
    await chargerToursRvt(true);
    redessinerAacCs();
  }catch(err){ showToast('Impossible : ' + err.message); }
}


/* ============================================================
   LES RENDEZ-VOUS THÉORIQUES PRÉVUS

   David, le 9 septembre 2026 : « il faudrait, comme "tous en
   retard" etc., un endroit où on voit les rendez-vous théoriques
   retenus avec la liste des élèves ».

   Il manquait un état à cet écran. On voyait ce qui est À FAIRE —
   les tours ouverts, les théoriques à prévoir — et plus rien une
   fois la date prise. Or c'est justement entre les deux qu'on
   travaille : rappeler la veille, renvoyer un lien perdu, savoir
   qui vient jeudi.

   ⚠️ IL DISPARAÎT LE LENDEMAIN. David : « jusqu'au lendemain ».
   Le jour même il sert encore — qui vient, à quelle heure. Le
   surlendemain, c'est de l'histoire, et une liste qui garde son
   histoire cesse d'être une liste de ce qu'on a à faire.
   ============================================================ */

function rvtPrevus(){
  /* Le même « aujourd'hui » que partout dans ce module — l'heure
     locale, pas l'heure de Greenwich : à 1 h du matin en été, le
     décalage ferait disparaître le rendez-vous du jour. */
  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);

  const out = [];
  (toursRvt || []).forEach(t => {
    if(!t.clos || !t.retenu) return;
    const c = (t.creneaux || [])
      .filter(x => String(x.id) === String(t.retenu))[0];
    if(!c || !c.date || c.date < auj) return;
    const eleves = (t.eleves || []).filter(e => e.retenu === 'oui');
    if(!eleves.length) return;
    out.push({ tour: t, creneau: c, eleves: eleves });
  });

  /* Le plus proche en tête : c'est celui dont on s'occupe. */
  out.sort((a, b) => String(a.creneau.date).localeCompare(String(b.creneau.date)));
  return out;
}


function dessinerRvtPrevus(zone){
  zone.innerHTML = '';

  const liste = rvtPrevus();
  if(liste.length){
    zone.appendChild(titreZoneRvt('PRÉVUS',
      liste.length + ' rendez-vous — ils sont décidés et approchent'));
    liste.forEach(p => zone.appendChild(carteRvtPrevu(p)));
  }

  /* ── TERMINÉES ── repliées : c'est de l'histoire, mais elle se
     relit. Fermer un tour ne doit plus vouloir dire l'effacer. */
  const finies = toursTerminesRvt();
  if(!finies.length) return;

  const det = document.createElement('details');
  det.style.cssText = 'margin-top:14px;';
  const som = document.createElement('summary');
  som.style.cssText = 'cursor:pointer;font-size:12.5px;color:var(--muted);' +
    'padding:6px 0;';
  som.textContent = '🗂️ Les ' + finies.length +
    ' dernière(s) proposition(s) terminée(s)';
  det.appendChild(som);
  finies.forEach(t => det.appendChild(carteTourRvt(t)));
  zone.appendChild(det);
}


function carteRvtPrevu(p){
  const t = p.tour, c = p.creneau;
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--accent-text);border-radius:12px;' +
    'padding:11px 13px;margin-bottom:12px;';

  const tete = document.createElement('div');
  tete.style.cssText = 'font-weight:700;font-size:13.5px;margin-bottom:2px;';
  tete.textContent = '🗣️ Rendez-vous théorique du ' + jourFrCs(c.date) +
                     (c.heure ? ' à ' + c.heure : '');
  d.appendChild(tete);

  const ou = nomLieuRdv(c.lieuCle) || String(c.lieu || '');
  const sous = document.createElement('div');
  sous.style.cssText = 'font-size:11.5px;color:var(--muted);' +
    'margin-bottom:9px;line-height:1.5;';
  sous.textContent = (ou ? '📍 ' + ou + ' · ' : '') +
    p.eleves.length + ' famille(s) attendue(s)';
  d.appendChild(sous);

  const env = document.createElement('div');
  env.style.cssText = 'overflow-x:auto;margin-bottom:9px;';
  const tab = document.createElement('table');
  tab.style.cssText = 'border-collapse:collapse;font-size:12px;width:100%;';

  p.eleves.forEach(e => {
    const tr = document.createElement('tr');
    const nom = cell('td', e.eleve + (e.accompagnateur
      ? ' · avec ' + e.accompagnateur : ''));
    nom.style.textAlign = 'left';
    if(e.accesRetire){
      nom.style.opacity = '.55';
      nom.textContent = '🔒 ' + nom.textContent;
      nom.title = 'Son lien ne s\'ouvre plus';
    }
    tr.appendChild(nom);
    tr.appendChild(cellGestesRvt(t, e));
    tab.appendChild(tr);
  });

  env.appendChild(tab);
  d.appendChild(env);

  const act = document.createElement('div');
  act.style.cssText = 'display:flex;flex-wrap:wrap;gap:7px;';

  /* Le rappel à tout le monde, la veille : c'est le geste du jour
     d'avant, et il ne vaut pas la peine d'appuyer huit fois. */
  act.appendChild(petitBouton('📨 Rappeler la date à tous',
    'Chacun reçoit sa convocation avec son lien',
    () => rappelerTousRvt(p)));

  d.appendChild(act);
  return d;
}


/* ⚠️ LE RAPPEL À TOUS NE PART PAS AUX ACCÈS COUPÉS. Un lien coupé
   est un lien parti par erreur : le renvoyer serait refaire
   l'erreur, avec la date en plus. */
async function rappelerTousRvt(p){
  const vises = p.eleves.filter(e => !e.accesRetire).map(e => e.eleve);
  if(!vises.length){
    showToast('Personne à rappeler — tous les liens sont coupés');
    return;
  }

  const sansMail = vises.filter(n => !mailsDeLaFamille(n).length);
  const lignes = ['Rappeler la date à ' + vises.length + ' famille(s) ?', '',
    '🗣️ ' + jourFrCs(p.creneau.date) +
      (p.creneau.heure ? ' à ' + p.creneau.heure : ''),
    '   ' + vises.join(', '), ''];
  if(sansMail.length){
    lignes.push('⚠️ Sans adresse mail, donc à prévenir à la main :',
                '   ' + sansMail.join(', '), '');
  }
  lignes.push('Chacun reçoit son lien : il pourra relire la date sur le site.');

  if(!await confirmer(lignes.join('\n'), '📨 Envoyer')) return;

  showToast('Envoi en cours…');
  const envois = await envoyerMailsCloture(vises, [], {
    date: p.creneau.date, heure: p.creneau.heure, lieu: p.creneau.lieu
  }, jetonsDuTour(p.tour));

  const partis = envois.filter(x => x.etat === 'envoyé').length;
  const rates = envois.filter(x => x.etat !== 'envoyé');
  showToast(rates.length
    ? '📨 ' + partis + ' envoyé(s), ' + rates.length + ' à faire à la main : ' +
      rates.map(x => x.eleve).join(', ')
    : '📨 ' + partis + ' famille(s) rappelée(s) ✅');
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-aac-cs.js'] = true;


/* ============================================================
   LE SUIVI AAC

   Trois rendez-vous jalonnent l'année, et deux conditions ouvrent
   l'examen. Rien de tout ça ne s'écrivait nulle part avant la v185 :
   le questionnaire posait les bonnes questions et n'en gardait que
   des états, dans le texte de la note.
   ============================================================ */

/* Les trois parcours possibles.

   David : « on doit pouvoir dire qu'un élève ne veut pas valider
   sa conduite accompagnée — la décision peut être prise en cours de
   route — et il repart dans un schéma classique. Il faudra aussi
   l'option de fausse conduite accompagnée : il fait son rendez-vous
   préalable, il conduit, mais il ne fera aucun rendez-vous
   pédagogique, il attend 17 ans pour passer son examen. »

   🚗 et 👻 se comportent PAREIL : plus aucun rendez-vous attendu,
   examen à 17 ans révolus. On garde les deux mots quand même, parce
   que ce n'est pas la même histoire — et c'est le bureau qui la
   raconte au téléphone. « Il a fait son RVP 1 puis a renoncé » et
   « il n'a jamais eu l'intention de valider » n'appellent pas la
   même explication à un parent. */
const PARCOURS_AAC = {
  '':          { court:'🎓 à valider',   long:'AAC à valider',
                 rdvAttendus:true,  unAn:true },
  'abandonne': { court:'🚗 abandonnée',  long:'AAC abandonnée',
                 rdvAttendus:false, unAn:false },
  'fausse':    { court:'👻 fausse AAC',  long:'Fausse conduite accompagnée',
                 rdvAttendus:false, unAn:false }
};

/* ⚠️ NOM PROPRE À CE MODULE — v878. Elle s'appelait « parcoursDe »,
   comme celle de ec-postpermis.js. Deux fonctions de même nom au niveau
   global, et c'est la dernière chargée qui répond aux deux : celle-ci gagnait, et le post-permis, qui lui
   passe un élève entier et non un suivi, recevait toujours ''.
   Le nom dit maintenant de quelle parcours il s'agit. Voir
   test-heures-decalees.js, qui refuse désormais tout doublon. */
function parcoursAacDe(s){
  const c = String((s && s.parcoursAac) || '').trim();
  return PARCOURS_AAC[c] ? c : '';
}


/* ------------------------------------------------------------
   LA DATE À PARTIR DE LAQUELLE L'EXAMEN EST POSSIBLE

   Deux conditions, et il faut LES DEUX :

     · 17 ans révolus — le lendemain de l'anniversaire ;
     · 1 an entre le rendez-vous préalable et l'examen, pour VALIDER
       la conduite accompagnée.

   Donc la PLUS TARDIVE des deux. « Un élève qui part à 16 ans et
   demi pour son rendez-vous préalable ne peut passer son examen
   qu'à 17 ans et demi pour valider la conduite accompagnée. »

   Quand l'AAC est abandonnée ou fausse, la règle du 1 an tombe avec
   la validation : il ne reste que l'âge.

   ⚠️ ON NE DIT JAMAIS « il peut passer ». On dit « examen possible
   le … », et on dit LAQUELLE des deux conditions commande. Le
   kilométrage est suivi dans DriveUp, l'outil n'en sait rien — une
   date qui se présenterait comme un feu vert serait un mensonge.
   ------------------------------------------------------------ */
function examenPossibleLe(s, naissance){
  const p = PARCOURS_AAC[parcoursAacDe(s)];
  const dix7 = (typeof jour17AnsRevolus === 'function')
    ? jour17AnsRevolus(naissance) : '';

  let unAn = '';
  const rvp = String((s && s.rvpDate) || '').trim();
  if(p.unAn && /^\d{4}-\d{2}-\d{2}$/.test(rvp)){
    const d = new Date(rvp + 'T12:00:00');
    if(!isNaN(d.getTime())){
      d.setFullYear(d.getFullYear() + 1);
      unAn = d.getFullYear() + '-' +
             ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
             ('0' + d.getDate()).slice(-2);
    }
  }

  /* Sans date de naissance on ne peut RIEN annoncer : l'âge est une
     des deux conditions. Mieux vaut le dire que de rendre la seule
     qu'on connaît en la faisant passer pour la réponse. */
  if(!dix7) return { iso:'', pourquoi:'', manque:'naissance' };
  if(p.unAn && !unAn) return { iso:'', pourquoi:'', manque:'prealable' };

  if(unAn && unAn > dix7) return { iso:unAn, pourquoi:'le 1 an' };
  return { iso:dix7, pourquoi:'ses 17 ans' };
}


/* ------------------------------------------------------------
   LES ÉCHÉANCES DES RENDEZ-VOUS

   · RVP 1 ≈ 6 mois après le préalable.
   · RVP 2 : la PLUS TARDIVE de (préalable + 10 mois) et
     (examen possible − 2 mois). C'est le dernier point de contrôle
     avant l'examen : il se place PRÈS de l'examen, pas au plus tôt.
     Calé au plus tôt, un élève parti à 15 ans l'aurait passé à
     15 ans et 10 mois, un an avant de pouvoir présenter quoi que ce
     soit.
   · Le théorique : AUCUNE échéance. « N'importe quand après le
     préalable, de préférence entre les deux, mais ce n'est pas une
     obligation. » On ne calcule donc rien — seulement son état, et
     c'est bien assez pour voir qu'il manque.
   ------------------------------------------------------------ */
function decalerMois(iso, mois){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return '';
  const d = new Date(iso + 'T12:00:00');
  if(isNaN(d.getTime())) return '';
  const jour = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + mois);
  /* Le 31 mai + 1 mois n'est pas le 1er juillet : on retombe sur le
     dernier jour du mois quand il est plus court. */
  const dernier = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(jour, dernier));
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) +
         '-' + ('0' + d.getDate()).slice(-2);
}

function echeancesAac(s, naissance){
  const rvp = String((s && s.rvpDate) || '').trim();
  const exam = examenPossibleLe(s, naissance);

  const dixMois = decalerMois(rvp, 10);
  const moins2 = exam.iso ? decalerMois(exam.iso, -2) : '';

  return {
    rvp1: decalerMois(rvp, 6),
    /* La plus TARDIVE — dernier point de contrôle. */
    rvp2: (dixMois && moins2) ? (moins2 > dixMois ? moins2 : dixMois)
                              : (dixMois || moins2),
    rvt: '',                 /* aucune échéance, et c'est voulu */
    exam: exam
  };
}


/* L'état d'un rendez-vous, prêt à afficher.

   Quatre états, et le quatrième compte : « fait ailleurs » se
   comporte comme « fait », mais il prévient qu'IL N'Y A AUCUN BILAN
   À ALLER LIRE. Sans lui, on cherche une trace qui n'existe pas.

   ⚠️ ET LE ROUGE NE SERT QU'À UNE CHOSE : échéance dépassée, sur un
   rendez-vous ENCORE ATTENDU. Un parcours abandonné n'attend plus
   rien : le faire rougir noierait le seul retard qui compte. */
/* ⚠️ « PROCHE » : L'ÉCHÉANCE EST À DEUX MOIS OU MOINS.

   « Quand c'est attendu à 2 mois, écrit en orange ; avant, laisse en
   noir. » Un rendez-vous attendu dans huit mois n'appelle aucun
   geste : le peindre en orange dès aujourd'hui rendrait la liste
   entièrement orange, et l'orange ne voudrait plus rien dire.

   Le calcul vit ICI, avec les dates, et pas dans le code qui
   dessine : c'est une règle métier, pas une couleur. */
const MOIS_AVANT_ALERTE_RDV = 2;

function etatRdv(etat, date, echeance, attendu, auJour, lieu){
  const e = String(etat || '').trim();
  const d = String(date || '').trim();
  const auj = String(auJour || (typeof todayLocal === 'function'
                ? todayLocal() : new Date().toISOString().slice(0, 10)));

  /* Le lieu s'ajoute à la ligne quand il y en a un.

     ⚠️ RIEN NE SE DIT QUAND IL N'Y EN A PAS. David : « pour le
     moment ils restent sans rien du tout, avec la possibilité de
     les mettre si on veut, mais pas de rouge — ce n'est pas
     important sur les RVP 1 et RVP 2 ». Un « lieu non renseigné »
     mettrait toutes les anciennes lignes en alerte pour une
     question qu'on ne posait pas encore. */
  const ou = nomLieuRdv(lieu);
  const ici = ou ? ' 📍 ' + ou : '';

  if(e === 'fait')     return { cle:'fait', retard:false, proche:false,
    txt:'fait' + (d ? ' le ' + jourFrCs(d) : '') + ici };
  if(e === 'ailleurs') return { cle:'ailleurs', retard:false, proche:false,
    txt:'fait' + (d ? ' le ' + jourFrCs(d) : '') + ' (autre auto-école)' };
  if(e === 'prevu')    return { cle:'prevu', retard:false, proche:false,
    txt:'prévu' + (d ? ' le ' + jourFrCs(d) : ' — date à fixer') + ici };

  if(!attendu) return { cle:'sansobjet', retard:false, proche:false,
    txt:'plus attendu' };

  if(echeance){
    const tard = echeance < auj;
    const limite = decalerMois(auj, MOIS_AVANT_ALERTE_RDV);
    return { cle: tard ? 'retard' : 'aprevoir', retard: tard,
      proche: tard || (!!limite && echeance <= limite),
      txt: (tard ? 'EN RETARD — attendu le ' : 'attendu le ') +
           jourFrCs(echeance) };
  }
  /* Sans échéance, « à prévoir » n'a pas de date à comparer : il ne
     réclame donc rien de particulier aujourd'hui. */
  return { cle:'aprevoir', retard:false, proche:false, txt:'à prévoir' };
}


/* ------------------------------------------------------------
   UNE LIGNE DE RENDEZ-VOUS, ET SA COULEUR

   « Quand c'est attendu, écris-le en plus gros et en orange ; quand
   c'est fait, en vert. Là il n'y a que les RVP qui sont en vert,
   pas le rendez-vous préalable. »

   ⚠️ ET C'EST BIEN LE PROBLÈME : le préalable était dessiné À PART,
   dans son coin, sans une seule ligne de style. Les trois autres
   passaient par une boucle qui, elle, colorait. Une même chose
   écrite à deux endroits, et c'est celle qu'on oublie qui reste
   grise.

   Une seule fonction pour les quatre, maintenant.
   ------------------------------------------------------------ */
function ligneRdvAacCs(titre, e){
  const l = document.createElement('span');
  l.textContent = titre + ' — ' + e.txt;

  if(e.cle === 'fait' || e.cle === 'ailleurs' || e.cle === 'prevu'){
    l.style.color = 'var(--accent-text)';
  }else if(e.proche){
    /* Ce qui appelle un geste, et rien d'autre : dans les deux
       mois, ou déjà en retard. */
    l.style.color = 'var(--warn-text)';
    l.style.fontSize = '14px';
    l.style.fontWeight = e.retard ? '800' : '700';
  }else if(e.cle === 'sansobjet'){
    l.style.opacity = '.6';
  }
  return l;
}


/* Un élève AAC, tout ce qu'il faut pour sa ligne. */
function dossierAac(nom){
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};
  const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
  const naissance = (f && f.naissance) || '';
  const cle = parcoursAacDe(s);
  const p = PARCOURS_AAC[cle];
  const ech = echeancesAac(s, naissance);
  const attendus = p.rdvAttendus;

  const rdv = {
    prealable: etatRdv(s.rvpEtat, s.rvpDate, '', true),
    rvp1: etatRdv(s.rvp1Etat, s.rvp1Date, ech.rvp1, attendus, '', s.rvp1Lieu),
    rvp2: etatRdv(s.rvp2Etat, s.rvp2Date, ech.rvp2, attendus, '', s.rvp2Lieu),
    rvt:  etatRdv(s.rvtEtat, s.rvtDate, '', attendus, '', s.rvtLieu)
  };

  return {
    eleve: nom, suivi: s, fiche: f, naissance: naissance,
    age: (typeof ageDe === 'function') ? ageDe(naissance) : null,
    parcoursCle: cle, parcours: p,
    ech: ech, rdv: rdv,
    eb: examenBlancDe(nom),
    /* Où en est son examen officiel : ajourné quand, et une nouvelle
       date ou pas. Deux faits distincts, voir examenOfficielDe. */
    exam: examenOfficielDe(nom),
    retard: Object.keys(rdv).some(k => rdv[k].retard),
    /* Le théorique jamais fait, sur un parcours qui l'attend : c'est
       le retard dont David parlait, et il n'a pas d'échéance pour
       le signaler tout seul. */
    rvtManquant: attendus && rdv.rvt.cle === 'aprevoir'
  };
}


function elevesAac(){
  const tous = (typeof etatBureau !== 'undefined' && etatBureau.eleves)
    ? etatBureau.eleves : [];
  const noms = {};
  tous.forEach(e => { noms[normaliserMot(e.eleve)] = e.eleve; });
  ((typeof fichesEleves !== 'undefined' && fichesEleves) || []).forEach(f => {
    if(f.eleve) noms[normaliserMot(f.eleve)] = noms[normaliserMot(f.eleve)] || f.eleve;
  });

  const out = [];
  Object.keys(noms).forEach(k => {
    if(typeAccompagnement(noms[k]) !== 'AAC') return;
    out.push(dossierAac(noms[k]));
  });

  /* Les retards d'abord, puis ceux dont le théorique manque, puis
     par date d'examen possible — les plus proches en tête. */
  out.sort((a, b) => {
    /* AJOURNÉ SANS NOUVELLE DATE D'ABORD : c'est celui-là qui attend
       qu'on fasse quelque chose. Un rendez-vous en retard peut se
       rattraper le mois prochain ; un élève ajourné et non
       reprogrammé, personne ne le rappelle. */
    if(a.exam.aReprogrammer !== b.exam.aReprogrammer)
      return a.exam.aReprogrammer ? -1 : 1;
    if(a.retard !== b.retard) return a.retard ? -1 : 1;
    if(a.rvtManquant !== b.rvtManquant) return a.rvtManquant ? -1 : 1;
    const da = a.ech.exam.iso || '9999';
    const db = b.ech.exam.iso || '9999';
    return da < db ? -1 : (da > db ? 1 : 0);
  });
  return out;
}


/* ------------------------------------------------------------
   L'ÉCRAN AAC
   ------------------------------------------------------------ */
let filtreAac = 'tous';

/* ============================================================
   LES COMPTES DE L'AAC, SANS DESSINER L'ÉCRAN — v956

   David : « Suivi AAC tu fais une brique avec le nombre total
   d'élève, une brique avec le nombre en retard de RVP1 et de RVP2
   sur 2 lignes, une brique avec le nombre de rendez-vous théorique
   à prévoir ».

   ⚠️ RIEN N'EST RECOMPTÉ ICI. « En retard » et « théorique à
   prévoir » sont déjà décidés par dossierAac — etatRdv pour le
   retard, rvtManquant pour le théorique. Les redire autrement,
   c'est se donner deux vérités : la tuile annoncerait trois
   retards au-dessus d'une liste qui en montre deux.

   Comme pour la moto, on ne dessine pas pour compter : cette
   fonction ne touche à aucun élément de page, sans quoi les tuiles
   resteraient muettes tant que personne n'aurait ouvert l'écran.

   ⚠️ ET LE THÉORIQUE N'EST JAMAIS « EN RETARD » : il n'a pas
   d'échéance — « n'importe quand après le préalable ». Son seul
   signal est « pas encore fait », et c'est voulu. */
function comptesAac(){
  if(typeof elevesAac !== 'function') return null;
  /* Le répertoire sert à reconnaître un élève tout neuf : sans lui,
     le compte serait partiel en se donnant pour complet. */
  if(typeof fichesEleves !== 'undefined' && !fichesEleves.length &&
     typeof etatBureau !== 'undefined' && !(etatBureau.eleves || []).length){
    return null;
  }

  const c = { total: 0, rvp1: 0, rvp2: 0, rvt: 0 };
  elevesAac().forEach(x => {
    c.total++;
    if(x.rdv && x.rdv.rvp1 && x.rdv.rvp1.retard) c.rvp1++;
    if(x.rdv && x.rdv.rvp2 && x.rdv.rvp2.retard) c.rvp2++;
    if(x.rvtManquant) c.rvt++;
  });
  return c;
}

/* Les trois briques du suivi AAC. */
function tuilesAac(){
  const c = comptesAac();
  if(c === null) return null;

  return [
    { cle:'aac:total', lib:'Élèves en AAC', vue:'suiviaac',
      valeur:() => ({ n: c.total }) },
    { cle:'aac:retard', lib:'Rendez-vous en retard', vue:'suiviaac', ton:'urgent',
      valeur:() => ({ n: c.rvp1 + c.rvp2,
                      /* Deux lignes, comme demandé : ce ne sont pas
                         les mêmes rendez-vous ni la même échéance. */
                      sous: (c.rvp1 + ' RVP 1') + '\n' + (c.rvp2 + ' RVP 2') }) },
    { cle:'aac:rvt', lib:'Théoriques à prévoir', vue:'suiviaac', ton:'att',
      valeur:() => ({ n: c.rvt }) }
  ];
}


function dessinerListeAac(zone){
  const liste = elevesAac();
  zone.innerHTML = '';

  if(typeof majVolet === 'function'){
    majVolet('cptAac', liste.length,
             liste.filter(x => x.retard || x.exam.aReprogrammer).length);
  }
  dessinerFiltresAac(liste);

  /* ⚠️ UN SEUL SUJET À L'ÉCRAN À LA FOIS.

     Sous « 🗓️ Organisation théorique » : l'organisation, seule.
     Sous les cinq autres filtres : la liste d'élèves, seule. Ni
     lieux, ni propositions, ni rendez-vous prévus au-dessus. */
  const orga = (filtreAac === 'organisation');
  const zL = $('lieuxRdvAac');
  if(zL) zL.style.display = orga ? '' : 'none';

  const zT = $('toursRvt');
  if(zT){
    zT.style.display = orga ? '' : 'none';
    if(orga) dessinerToursRvt(zT); else zT.innerHTML = '';
  }
  const zP = $('rvtPrevus');
  if(zP){
    zP.style.display = orga ? '' : 'none';
    if(orga) dessinerRvtPrevus(zP); else zP.innerHTML = '';
  }

  if(orga){
    /* Rien à décider ni à préparer : on le dit, plutôt que de
       laisser un écran vide qui ressemble à une panne. */
    if(!compteOrganisationRvt() && !toursTerminesRvt().length){
      zone.innerHTML = '<div class="empty">Aucune proposition en cours, ' +
        'aucun rendez-vous à venir.<br><span style="font-size:12px;">' +
        'Le bouton « 🗣️ Organiser » ci-dessus en ouvre une.</span></div>';
    }
    return;
  }

  if(!liste.length){
    zone.innerHTML = '<div class="empty">Aucun élève en conduite accompagnée.' +
      '<br><span style="font-size:12px;">La formation se lit sur la fiche ' +
      'de l\'élève — « AAC BV », « AAC BEA ».</span></div>';
    return;
  }

  const vus = liste.filter(x => {
    if(filtreAac === 'retard') return x.retard;
    if(filtreAac === 'theorique') return x.rvtManquant;
    if(filtreAac === 'areprogrammer') return x.exam.aReprogrammer;
    if(filtreAac === 'horsparcours') return x.parcoursCle !== '';
    return true;
  });

  if(!vus.length){
    zone.innerHTML = '<div class="empty">Personne dans ce filtre — ' +
      'et c\'est une bonne nouvelle.</div>';
    return;
  }
  vus.forEach(x => zone.appendChild(ligneAac(x)));
}


function dessinerFiltresAac(liste){
  const z = $('filtresAac');
  if(!z) return;
  z.innerHTML = '';
  z.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

  /* ⚠️ L'ORGANISATION EST UN FILTRE, PAS UN EMPILEMENT — v907.

     David, le 10 septembre 2026 : « théorique vient à côté des
     boutons dans AAC, là où il y a écrit Tous, En retard,
     Théorique à faire… tu en crées un nouveau avec Organisation
     théorique à côté de Théorique à faire ».

     Les lieux, les propositions en cours et les rendez-vous prévus
     s'empilaient AU-DESSUS d'une liste de quinze élèves qui n'a rien
     à voir. Deux sujets dans un écran, et c'est le plus bruyant qui
     gagne. Ils ne s'affichent plus que sous ce filtre-ci — et sous
     lui, il n'y a pas de liste d'élèves.

     Le compte dit ce qui demande une attention : les propositions en
     cours PLUS les rendez-vous à venir. */
  [['tous', 'Tous', liste.length],
   ['retard', '⚠️ En retard', liste.filter(x => x.retard).length],
   ['theorique', '🗣️ Théorique à faire', liste.filter(x => x.rvtManquant).length],
   ['organisation', '🗓️ Organisation théorique', compteOrganisationRvt()],
   ['areprogrammer', '🔁 À reprogrammer',
    liste.filter(x => x.exam.aReprogrammer).length],
   ['horsparcours', 'Ne valident pas',
    liste.filter(x => x.parcoursCle !== '').length]
  ].forEach(([cle, nom, n]) => {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;margin:0;padding:6px 10px;font-size:11.5px;' +
      (filtreAac === cle ? 'border-color:var(--accent-text);' +
                           'color:var(--accent-text);' : '');
    b.textContent = nom + (n ? ' (' + n + ')' : '');
    b.addEventListener('click', () => { filtreAac = cle; afficherAacCs(); });
    /* Le filtre ne change aucune donnée : il redessine la liste, pas
       le dossier. */
    z.appendChild(b);
  });

  /* LE REMPLACEMENT DU DOODLE, à droite des filtres. Il ne compte
     que ceux qu'on peut réellement inviter : théorique à prévoir,
     et pas déjà dans une proposition en cours. */
  const invitables = liste.filter(x =>
    x.parcours.rdvAttendus && x.rdv.rvt.cle === 'aprevoir' &&
    !tourOuvertDe(x.eleve)).length;

  const p = document.createElement('button');
  p.className = 'btn btn-secondary';
  p.style.cssText = 'width:auto;margin:0 0 0 auto;padding:6px 10px;' +
    'font-size:11.5px;' +
    (invitables >= 4 ? 'border-color:var(--accent-text);' +
                       'color:var(--accent-text);' : '');
  p.textContent = '🗣️ Organiser rendez-vous théorique' +
                  (invitables ? ' (' + invitables + ')' : '');
  p.title = invitables
    ? 'Envoyer des créneaux aux familles, et récupérer leurs réponses'
    : 'Personne à inviter pour le moment';
  p.disabled = !invitables;
  p.addEventListener('click', () => ouvrirTourRvt(liste));
  z.appendChild(p);
}


function ligneAac(x){
  const row = document.createElement('div');
  row.className = 'history-item';
  row.style.cssText = 'flex-direction:column;align-items:stretch;';

  const meta = document.createElement('div');
  meta.className = 'meta';

  /* Nom · âge · parcours — les trois choses qu'elle a demandées en
     tête de ligne : « nom prénom âge formation ». */
  const nom = document.createElement('strong');
  nom.textContent = x.eleve +
    (x.age === null ? ' · âge inconnu' : ' · ' + x.age + ' ans') +
    ' · ' + x.parcours.court;
  if(x.age === null) nom.style.color = 'var(--warn-text)';
  meta.appendChild(nom);

  /* LA LIGNE QUI GOUVERNE TOUT : quand l'examen devient possible, et
     LAQUELLE des deux conditions commande. Une date sans sa raison
     ne se vérifie pas et ne s'explique pas au téléphone. */
  const ex = document.createElement('span');
  if(x.ech.exam.iso){
    ex.innerHTML = 'Examen possible le <strong>' +
      jourFrCs(x.ech.exam.iso) + '</strong> <span style="opacity:.75">(' +
      x.ech.exam.pourquoi + ')</span>';
  }else{
    ex.style.color = 'var(--warn-text)';
    ex.textContent = x.ech.exam.manque === 'naissance'
      ? "Date d'examen possible inconnue — il manque sa date de naissance"
      : "Date d'examen possible inconnue — il manque son rendez-vous préalable";
  }
  meta.appendChild(ex);

  /* Les quatre rendez-vous, par la même fonction — le préalable
     compris. Il était dessiné à part, sans style : c'est pour ça
     qu'il restait gris quand les RVP passaient au vert. */
  [['① Préalable', x.rdv.prealable], ['② RVP 1', x.rdv.rvp1],
   ['③ RVP 2', x.rdv.rvp2], ['🗣️ Théorique', x.rdv.rvt]]
    .forEach(([titre, e]) => meta.appendChild(ligneRdvAacCs(titre, e)));

  if(x.eb.txt){
    const eb = document.createElement('span');
    eb.style.color = (x.eb.cle === 'date' || x.eb.cle === 'passe')
      ? 'var(--accent-text)' : '';
    eb.textContent = x.eb.txt;
    meta.appendChild(eb);
  }

  lignesExamenOfficiel(x.exam).forEach(l => meta.appendChild(l));

  /* Invité et pas encore répondu : la ligne le dit, sinon on le
     réinvite en croyant l'avoir oublié. */
  const tour = tourOuvertDe(x.eleve);
  if(tour){
    const moi = (tour.eleves || []).find(e =>
      normaliserMot(e.eleve) === normaliserMot(x.eleve)) || {};
    const t = document.createElement('span');
    t.style.color = moi.reponduLe ? 'var(--accent-text)' : 'var(--muted)';
    t.textContent = moi.reponduLe
      ? '🗣️ A répondu à la proposition du ' + (tour.creee || '').split(' ')[0]
      : '🗣️ Proposition envoyée — on attend sa réponse';
    meta.appendChild(t);
  }

  if(x.parcoursCle && x.suivi.parcoursLe){
    const q = document.createElement('span');
    q.style.opacity = '.7';
    q.textContent = x.parcours.long + ' — noté le ' + jourFrCs(x.suivi.parcoursLe);
    meta.appendChild(q);
  }

  row.appendChild(meta);

  const act = document.createElement('div');
  act.style.cssText = 'display:flex;flex-wrap:wrap;gap:7px;margin-top:9px;';
  boutonsAac(x, act);
  if(act.children.length) row.appendChild(act);

  return row;
}


/* Un examen officiel a-t-il été passé DEPUIS l'abandon ?

   « S'il a passé son examen en cassant la conduite accompagnée, il
   ne peut pas revenir en arrière. S'il n'a pas encore passé son
   examen, on peut revenir dessus. »

   C'est pour ça que la date de l'abandon est enregistrée : sans
   elle, impossible de savoir si l'examen est venu avant ou après. */
function examenPasseDepuisAbandon(x){
  const le = String((x.suivi && x.suivi.parcoursLe) || '').trim();
  if(!le) return '';
  const d = String((x.suivi && x.suivi.datePermis) || '').trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d
            : ((typeof dateFrVersIso === 'function') ? dateFrVersIso(d) : '');
  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);
  return (iso && iso >= le && iso <= auj) ? iso : '';
}


function boutonsAac(x, zone){
  const nom = x.eleve;
  const auj = () => (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);

  if(!x.naissance){
    zone.appendChild(petitBouton('🎂 Sa date de naissance',
      "L'âge est une des deux conditions de l'examen", async () => {
        const iso = await choisirDate('Date de naissance');
        if(!iso) return;
        /* On délègue : la fiche appartient à ec-fenetres, et c'est
           lui qui l'écrit — pour la fiche, pour le dossier élève et
           pour ici. Un troisième écran qui écrirait sa version, on
           connaît la suite. */
        if(!await fixerDateNaissance(nom, iso)) return;
        showToast('Enregistré ✅');
        redessinerAacCs();
      }));
  }

  if(!x.suivi.rvpDate){
    zone.appendChild(petitBouton('📅 Sa date de préalable',
      'Tout se compte à partir de là', async () => {
        const iso = await choisirDate('Rendez-vous préalable');
        if(!iso) return;
        await majSuivi(nom, { rvpDate: iso, rvpEtat: 'fait' });
        showToast('Enregistré ✅');
        redessinerAacCs();
      }));
    return;
  }

  /* Les rendez-vous, seulement tant qu'ils sont attendus. */
  if(x.parcours.rdvAttendus){
    [['② RVP 1', 'rvp1'], ['③ RVP 2', 'rvp2'],
     ['🗣️ Théorique', 'rvt']].forEach(([titre, cle]) => {
      if(x.rdv[cle === 'rvt' ? 'rvt' : cle].cle === 'fait' ||
         x.rdv[cle === 'rvt' ? 'rvt' : cle].cle === 'ailleurs') return;
      zone.appendChild(petitBouton('✅ ' + titre + ' fait',
        'Noter la date, et où il a eu lieu', async () => {
          const iso = await choisirDate(titre);
          if(!iso) return;

          /* ⚠️ LE LIEU EST FACULTATIF ICI — David : « facultatif pour
             les pratiques 1 et 2 ». On note souvent la date après
             coup, sans forcément se rappeler où. « Passer » ferme la
             fenêtre sans rien écrire, et la ligne n'affiche rien. */
          const ou = await choisirLieuRdv(titre + ' — où a-t-il eu lieu ?',
                                          (x.suivi || {})[cle + 'Lieu'] || '');

          const maj = {};
          maj[cle + 'Etat'] = 'fait';
          maj[cle + 'Date'] = iso;
          if(ou !== null) maj[cle + 'Lieu'] = ou;

          await majSuivi(nom, maj);
          showToast('Enregistré ✅');
          redessinerAacCs();
        }));
    });

  }

  /* ⚠️ TOUJOURS LÀ, MÊME QUAND TOUT EST FAIT.

     Les boutons « ✅ … fait » disparaissent une fois la date posée :
     l'outil considérait qu'une chose faite ne se défait pas. Or une
     date se tape à côté, et un rendez-vous se saisit parfois sur le
     mauvais élève. Celui-ci reste, quoi qu'il arrive — c'est la
     porte de sortie, et elle sert aussi à dire « fait ailleurs ».

     (Sans date de préalable, on n'arrive jamais ici : la fonction
     rend la main plus haut, sur le bouton qui la demande. Il n'y a
     alors rien à corriger.) */
  zone.appendChild(petitBouton('✏️ Corriger ses rendez-vous',
    'Changer une date, ou revenir sur un rendez-vous noté par erreur',
    () => corrigerRendezVous(x)));

  /* LE PARCOURS. Changeable à tout moment — sauf après un examen
     passé depuis l'abandon : là, c'est définitif, et la ligne dit
     pourquoi au lieu de laisser un bouton disparaître en silence. */
  const passe = x.parcoursCle ? examenPasseDepuisAbandon(x) : '';
  if(passe){
    const d = document.createElement('span');
    d.style.cssText = 'font-size:11.5px;color:var(--muted);line-height:1.5;' +
      'flex:1;min-width:180px;';
    d.textContent = '🔒 Examen officiel passé le ' + jourFrCs(passe) +
      ' : la conduite accompagnée ne peut plus être validée.';
    zone.appendChild(d);
    return;
  }

  if(!x.parcoursCle){
    zone.appendChild(petitBouton('🚗 Il ne validera pas',
      "Il repart en examen blanc, chemin classique",
      () => changerParcours(x, 'abandonne')));
    zone.appendChild(petitBouton('👻 Fausse AAC',
      'Aucun rendez-vous pédagogique prévu, il attend ses 17 ans',
      () => changerParcours(x, 'fausse')));
  }else{
    zone.appendChild(petitBouton('↩️ Revenir à « à valider »',
      'Les rendez-vous faits sont toujours là, les échéances reviennent',
      () => changerParcours(x, '')));
  }
}


/* ------------------------------------------------------------
   CORRIGER LES RENDEZ-VOUS — DATES ET ÉTATS

   « Il faut que je puisse modifier les dates dans le suivi AAC et
   CS en cas d'erreur de saisie : là j'ai enregistré un RVP, sauf
   que l'élève ne l'a pas fait encore. »

   ⚠️ CE QUI MANQUAIT N'ÉTAIT PAS LA MODIFICATION, C'ÉTAIT LE
   RETOUR EN ARRIÈRE.

   Les boutons « ✅ RVP 1 fait » disparaissaient une fois la date
   posée : l'outil considérait qu'une chose faite ne se défait pas.
   Or une date se tape à côté, et un rendez-vous se saisit parfois
   sur le mauvais élève. Sans porte de sortie, il fallait vivre avec
   — ou aller corriger le classeur à la main, ce qui est exactement
   ce que cet outil existe pour éviter.

   Une seule fenêtre pour les quatre rendez-vous : elle remplace
   aussi l'ancien « 🏫 Fait ailleurs », qui demandait d'écrire
   « prealable, rvp1 » dans une boîte de texte — deux écrans pour
   le même travail, et le plus maladroit était le seul qui savait
   dire « ailleurs ».
   ------------------------------------------------------------ */
const ETATS_RDV_AAC = [
  { v:'',         nom:'— pas encore fait' },
  { v:'fait',     nom:'✅ Fait' },
  { v:'prevu',    nom:'📌 Prévu' },
  { v:'ailleurs', nom:'🏫 Fait dans une autre auto-école' }
];

async function marquerAilleurs(x){ return corrigerRendezVous(x); }

async function corrigerRendezVous(x){
  const nom = x.eleve;
  const s = x.suivi || {};

  /* Le préalable pour tout le monde ; les trois autres seulement là
     où ils existent. Montrer « RVP 1 » à une conduite supervisée,
     c'est inviter à le remplir. */
  const lignes = [{ cle:'rvp', titre:'① Rendez-vous préalable' }];
  if(x.parcours && x.parcours.rdvAttendus){
    lignes.push({ cle:'rvp1', titre:'② RVP 1' },
                { cle:'rvp2', titre:'③ RVP 2' },
                { cle:'rvt',  titre:'🗣️ Rendez-vous théorique' });
  }

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px,94vw);max-height:90vh;overflow-y:auto;';

  const ech = t => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  boite.insertAdjacentHTML('beforeend',
    '<h3>✏️ Corriger ses rendez-vous</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:14px;' +
      'line-height:1.5;">' + ech(nom) + '. Une date tapée à côté, un ' +
      'rendez-vous noté sur le mauvais élève&nbsp;: tout se reprend ici. ' +
      '<strong>« Pas encore fait » efface la date</strong> et le remet dans ' +
      'la liste de ce qui est attendu.</div>' +
    lignes.map(l =>
      '<div style="border:1px solid var(--line);border-radius:11px;' +
        'padding:11px 12px;margin-bottom:10px;">' +
        '<div style="font-weight:700;font-size:13px;margin-bottom:7px;">' +
          ech(l.titre) + '</div>' +
        '<div style="display:flex;gap:7px;flex-wrap:wrap;">' +
          '<select id="cr_' + l.cle + '_etat" style="flex:2;min-width:190px;' +
            'margin:0;">' +
            ETATS_RDV_AAC.map(e => '<option value="' + e.v + '">' +
              ech(e.nom) + '</option>').join('') +
          '</select>' +
          '<input type="date" id="cr_' + l.cle + '_date" ' +
            'style="flex:1;min-width:150px;margin:0;">' +
        '</div>' +
      '</div>').join('') +
    '<div id="crEtat" style="font-size:13px;line-height:1.5;' +
      'margin-bottom:10px;"></div>' +
    '<div style="display:flex;gap:8px;">' +
      '<button class="btn btn-secondary" id="crAnnuler">Annuler</button>' +
      '<button class="btn btn-primary" id="crOk">💾 Enregistrer</button>' +
    '</div>');

  fond.appendChild(boite);
  document.body.appendChild(fond);
  const g = id => boite.querySelector('#' + id);

  lignes.forEach(l => {
    g('cr_' + l.cle + '_etat').value = String(s[l.cle + 'Etat'] || '');
    g('cr_' + l.cle + '_date').value = String(s[l.cle + 'Date'] || '');
  });

  const fermer = () => { try{ fermerFond(fond); }catch(e){} };
  g('crAnnuler').addEventListener('click', fermer);
  fond.addEventListener('click', e => { if(e.target === fond) fermer(); });

  g('crOk').addEventListener('click', async () => {
    const maj = {};
    lignes.forEach(l => {
      const etat = g('cr_' + l.cle + '_etat').value;
      const date = g('cr_' + l.cle + '_date').value;
      /* « Pas encore fait » efface les deux : un état vide avec une
         date derrière, c'est la date qui finirait par ressortir. */
      maj[l.cle + 'Etat'] = etat;
      maj[l.cle + 'Date'] = etat ? date : '';
    });

    /* ⚠️ EFFACER LE PRÉALABLE, C'EST TOUT EFFACER.

       Le compteur, les échéances des deux RVP, la date d'examen
       possible : tout se compte à partir de lui. On le dit avant,
       pas après. */
    if(!maj.rvpEtat && s.rvpEtat){
      if(!await confirmer(
          'Sans rendez-vous préalable, plus rien ne se compte pour ' +
          nom + '\u00A0: ni depuis combien de temps il est parti, ni ' +
          "les échéances de ses rendez-vous, ni sa date d'examen " +
          'possible.\n\nContinuer ?', 'Effacer le préalable')) return;
    }

    const b = g('crOk');
    b.disabled = true;
    b.textContent = 'Enregistrement…';
    try{
      await majSuivi(nom, maj);
      fermer();
      showToast('Corrigé ✅');
      redessinerAacCs();
    }catch(e){
      b.disabled = false; b.textContent = '💾 Enregistrer';
      const z = g('crEtat');
      z.style.color = 'var(--warn-text)';
      z.textContent = 'Impossible : ' + e.message;
    }
  });
}


async function changerParcours(x, vers){
  const p = PARCOURS_AAC[vers];
  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);

  /* CE QUE ÇA FAIT, DIT AVANT DE LE FAIRE. Une bascule qui replace
     l'élève dans une autre liste sans le dire, on en a déjà corrigé
     une. */
  let quoi = vers
    ? 'Ses rendez-vous pédagogiques ne seront plus attendus — ' +
      'ceux qui ont été faits restent écrits.\n\n' +
      "L'examen redevient possible dès ses 17 ans révolus : la règle " +
      'du 1 an tombe avec la validation.'
    : 'Ses rendez-vous pédagogiques redeviennent attendus, avec leurs ' +
      'échéances. Rien de ce qui a été fait n\'est effacé.';

  /* L'examen blanc d'office — mais JAMAIS par-dessus un existant. */
  const poser = vers === 'abandonne' && !x.eb.cle;
  if(poser){
    quoi += '\n\nIl part dans « 📝 Examen blanc à prévoir ».';
  }else if(vers === 'abandonne' && x.eb.cle){
    quoi += '\n\n' + x.eb.txt + " — rien n'est reposé.";
  }

  if(!await confirmer(p.long + ' ?\n\n' + quoi, 'Changer le parcours')) return;

  try{
    await majSuivi(x.eleve, { parcoursAac: vers, parcoursLe: vers ? auj : '' });
    if(poser){
      /* LE RELAIS, le même que pour la CS : on ouvre la porte de la
         liste qui existe déjà, on ne pose pas d'examen blanc ici. */
      await envoyerConsigne(x.eleve, 'examblanc',
        "Examen blanc à prévoir — conduite accompagnée non validée");
    }
    showToast(p.long + ' ✅');
    redessinerAacCs();
  }catch(e){ showToast('Impossible : ' + e.message); }
}
