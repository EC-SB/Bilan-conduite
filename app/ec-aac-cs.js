/* Déployé le 05/09/2026 à 07:32 — v878 */
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

   Chrystel : « il faut que l'on voie AAC et CS, mais ce sera
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

  if(s.ebDate) return { cle: 'date', txt: '✅ Examen blanc le ' + jourFrCs(s.ebDate) };
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

   Chrystel : « dans le suivi conduite accompagnée il me manque
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
     liste AAC peut proposer, donc ils arrivent avec elle. */
  if(zA) await chargerToursRvt();

  dessinerReglageCs();
  if(zC) dessinerListeCs(zC);
  if(zA) dessinerListeAac(zA);
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

   Chrystel : « j'ai besoin de plusieurs élèves en même temps, au
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

  dessinerElevesRvt(g('rvtEleves'), possibles, choisis, majCompte);
  dessinerCreneaux();

  g('rvtPlus').addEventListener('click', () => {
    if(creneaux.length >= 6){
      showToast('Six créneaux, c\'est déjà beaucoup à lire.');
      return;
    }
    creneaux.push({});
    dessinerCreneaux();
  });

  const fermer = () => { try{ document.body.removeChild(fond); }catch(e){} };
  g('rvtAnnuler').addEventListener('click', fermer);
  fond.addEventListener('click', e => { if(e.target === fond) fermer(); });

  g('rvtEnvoyer').addEventListener('click', async () => {
    const noms = Object.keys(choisis).filter(k => choisis[k]);
    const cr = creneaux
      .filter(c => c.date)
      .map((c, i) => ({ id: 'c' + (i + 1), date: c.date,
                        heure: c.heure || '', lieu: '' }));

    const etat = g('rvtEtat');
    if(!noms.length){ etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Aucun élève coché.'; return; }
    if(cr.length < 2){ etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Il faut au moins deux créneaux avec une date.';
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

  const fermer = () => { try{ document.body.removeChild(fond); }catch(e){} };
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
    id: c.id, date: c.date || '', heure: c.heure || '', lieu: c.lieu || ''
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

  const fermer = () => { try{ document.body.removeChild(fond); }catch(e){} };
  g('rvtCrAnnuler').addEventListener('click', fermer);
  fond.addEventListener('click', e => { if(e.target === fond) fermer(); });

  g('rvtCrOk').addEventListener('click', async () => {
    const etat = g('rvtCrEtat');
    const gardes = creneaux.filter(c => c.date);
    if(gardes.length < 2){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Il faut au moins deux créneaux avec une date.';
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
        sujet: change
          ? 'Rendez-vous pédagogique de ' + env.eleve +
            ' — les dates ont changé'
          : 'Rendez-vous pédagogique de ' + env.eleve +
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
       'Les dates proposées pour le rendez-vous pédagogique de ' +
         eleve + ' ONT CHANGÉ.',
       '',
       'Si vous nous aviez déjà répondu sur une date qui a été',
       "déplacée, cette réponse ne vaut plus : merci de nous",
       'réindiquer vos disponibilités.',
       '', 'Voici les créneaux à jour :']
    : ['Bonjour,', '',
       'Nous organisons le rendez-vous pédagogique de ' + eleve + '.',
       "C'est un rendez-vous où l'élève vient AVEC son accompagnateur.",
       '',
       'Vous serez plusieurs familles à ce rendez-vous : nous cherchons',
       'la date qui convient au plus grand nombre.',
       '', 'Voici les créneaux possibles :'];

  (creneaux || []).forEach(c => {
    l.push('  · ' + (jourFrCs(c.date) || c.date) +
           (c.heure ? ' à ' + c.heure : ''));
  });

  l.push('',
    'Merci donc de sélectionner TOUTES les dates auxquelles vous êtes',
    'disponibles. La date ayant obtenu la majorité des réponses sera',
    'finalement retenue, et nous vous la confirmerons ultérieurement.',
    '', 'Indiquez vos disponibilités ici :', lien, '');
  if(limite){
    l.push('Vous pouvez répondre et modifier votre réponse ' +
           "jusqu'au " + (jourFrCs(limite) || limite) + '.', '');
  }
  l.push("Ce lien vous est personnel : l'élève et l'accompagnateur",
         'remplissent la même réponse, une seule fois.', '',
         'Évolution Conduites');
  return l.join('\n');
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
function dessinerToursRvt(zone){
  zone.innerHTML = '';
  const ouverts = toursRvt.filter(t => !t.clos);
  if(!ouverts.length) return;

  ouverts.forEach(t => zone.appendChild(carteTourRvt(t)));
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

  const tete = document.createElement('div');
  tete.style.cssText = 'font-weight:700;font-size:13px;margin-bottom:3px;';
  tete.textContent = '🗣️ Proposition du ' + (t.creee || '').split(' ')[0] +
    ' — ' + repondus + ' réponse(s) sur ' + attendus;
  d.appendChild(tete);

  const sous = document.createElement('div');
  sous.style.cssText = 'font-size:11.5px;color:var(--muted);' +
    'margin-bottom:9px;line-height:1.5;';
  sous.textContent = t.limite
    ? 'Ils peuvent répondre jusqu\'au ' + jourFrCs(t.limite)
    : 'Sans date limite';
  d.appendChild(sous);

  /* Une colonne par créneau, une ligne par élève. */
  const env = document.createElement('div');
  env.style.cssText = 'overflow-x:auto;margin-bottom:9px;';
  const tab = document.createElement('table');
  tab.style.cssText = 'border-collapse:collapse;font-size:12px;width:100%;';

  const thead = document.createElement('tr');
  thead.appendChild(cell('th', ''));
  (t.creneaux || []).forEach(c => {
    const th = cell('th', jourFrCs(c.date) + (c.heure ? '\n' + c.heure : ''));
    th.style.whiteSpace = 'pre-line';
    if(c.id === meilleur && comptes[c.id] > 0){
      th.style.color = 'var(--accent-text)';
      th.style.fontWeight = '800';
    }
    thead.appendChild(th);
  });
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
  tab.appendChild(pied);

  env.appendChild(tab);
  d.appendChild(env);

  /* Les sans-réponse, nommés : c'est eux qu'on relance. */
  const muets = (t.eleves || []).filter(e => !e.reponduLe).map(e => e.eleve);
  if(muets.length){
    const m = document.createElement('div');
    m.style.cssText = 'font-size:11.5px;color:var(--muted);' +
      'margin-bottom:9px;line-height:1.5;';
    m.textContent = '⏳ Sans réponse : ' + muets.join(', ');
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
  act.appendChild(petitBouton('➕ Ajouter des familles',
    'Elles reçoivent les mêmes créneaux — c\'est le même rendez-vous',
    () => ajouterAuTourRvt(t)));

  act.appendChild(petitBouton('📅 Modifier les créneaux',
    'Ajouter une date, ou en déplacer une selon les retours',
    () => changerCreneauxRvt(t)));

  (t.creneaux || []).forEach(c => {
    if(!comptes[c.id]) return;
    act.appendChild(petitBouton(
      '📅 Retenir le ' + jourFrCs(c.date) + ' (' + comptes[c.id] + ')',
      'Le rendez-vous est fixé pour ceux qui ont dit oui',
      () => retenirCreneauRvt(t, c, comptes[c.id])));
  });

  act.appendChild(petitBouton('🗑️ Abandonner', 'Aucun créneau ne va — ' +
    'les élèves redeviennent proposables', async () => {
      if(!await confirmer('Abandonner cette proposition ?\n\n' +
        'Les ' + attendus + ' élèves redeviennent proposables, et leurs ' +
        'réponses restent consultables.', 'Abandonner')) return;
      await appelPrep({ action: 'rvtFermer', id: t.id });
      await chargerToursRvt(true);
      redessinerAacCs();
    }));

  d.appendChild(act);
  return d;
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
      (c.heure ? ' à ' + c.heure : '') + ' ?\n\n' +
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
       L'écran, lui, lit encore l'ancien état : sans ce rechargement,
       la liste continuerait d'afficher « théorique à prévoir » sur
       des élèves qu'on vient de placer, et on les replacerait. */
    if(typeof chargerBureau === 'function'){
      try{ await chargerBureau(true); }catch(e){}
    }
    await chargerToursRvt(true);
    redessinerAacCs();
  }catch(e){ showToast('Impossible : ' + e.message); }
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

   Chrystel : « on doit pouvoir dire qu'un élève ne veut pas valider
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

function etatRdv(etat, date, echeance, attendu, auJour){
  const e = String(etat || '').trim();
  const d = String(date || '').trim();
  const auj = String(auJour || (typeof todayLocal === 'function'
                ? todayLocal() : new Date().toISOString().slice(0, 10)));

  if(e === 'fait')     return { cle:'fait', retard:false, proche:false,
    txt:'fait' + (d ? ' le ' + jourFrCs(d) : '') };
  if(e === 'ailleurs') return { cle:'ailleurs', retard:false, proche:false,
    txt:'fait' + (d ? ' le ' + jourFrCs(d) : '') + ' (autre auto-école)' };
  if(e === 'prevu')    return { cle:'prevu', retard:false, proche:false,
    txt:'prévu' + (d ? ' le ' + jourFrCs(d) : ' — date à fixer') };

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
    rvp1: etatRdv(s.rvp1Etat, s.rvp1Date, ech.rvp1, attendus),
    rvp2: etatRdv(s.rvp2Etat, s.rvp2Date, ech.rvp2, attendus),
    rvt:  etatRdv(s.rvtEtat, s.rvtDate, '', attendus)
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
       le retard dont Chrystel parlait, et il n'a pas d'échéance pour
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

function dessinerListeAac(zone){
  const liste = elevesAac();
  zone.innerHTML = '';

  if(typeof majVolet === 'function'){
    majVolet('cptAac', liste.length,
             liste.filter(x => x.retard || x.exam.aReprogrammer).length);
  }
  dessinerFiltresAac(liste);

  /* LES PROPOSITIONS EN COURS, AU-DESSUS DE LA LISTE. Une grille de
     réponses qu'il faudrait aller chercher ailleurs ne se regarde
     pas — et c'est justement quand elle se remplit qu'on veut la
     voir. */
  const zT = $('toursRvt');
  if(zT) dessinerToursRvt(zT);

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

  [['tous', 'Tous', liste.length],
   ['retard', '⚠️ En retard', liste.filter(x => x.retard).length],
   ['theorique', '🗣️ Théorique à faire', liste.filter(x => x.rvtManquant).length],
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
        'Noter la date à laquelle il a eu lieu', async () => {
          const iso = await choisirDate(titre);
          if(!iso) return;
          const maj = {};
          maj[cle + 'Etat'] = 'fait';
          maj[cle + 'Date'] = iso;
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

  const fermer = () => { try{ document.body.removeChild(fond); }catch(e){} };
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
