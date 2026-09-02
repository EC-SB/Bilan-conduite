/* Déployé le 02/09/2026 à 11:49 — v798 */
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
               etat: etatQuestionEb(s, duree), eb: examenBlancDe(nom) });
  });

  /* Ceux sans date d'abord — c'est ce qu'il manque pour que la
     liste serve. Puis les urgents, puis les plus anciens. */
  out.sort((a, b) => {
    if(!a.duree !== !b.duree) return a.duree ? 1 : -1;
    if(a.etat.urgent !== b.etat.urgent) return a.etat.urgent ? -1 : 1;
    return (b.duree ? b.duree.mois : 0) - (a.duree ? a.duree.mois : 0);
  });
  return out;
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */

/* Le tour de la liste, redessiné après chaque geste. */
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

  dessinerReglageCs();
  if(zC) dessinerListeCs(zC);
  /* La liste AAC arrive à l'étape suivante : elle demande les trois
     parcours et les échéances. Dire qu'elle vient, plutôt que de
     laisser un cadre vide qui se lit « aucun élève en AAC ». */
  if(zA && !zA.dataset.rempli){
    zA.innerHTML = '<div class="empty">La liste AAC arrive juste après.<br>' +
      '<span style="font-size:12px;">Les colonnes sont en place ; il reste ' +
      'les trois parcours et les échéances des rendez-vous.</span></div>';
  }
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
    afficherAacCs();
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
        afficherAacCs();
      }));
    return;
  }

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
          afficherAacCs();
        }));
    }
    return;
  }

  if(x.etat.cle === 'pause'){
    zone.appendChild(petitBouton('▶️ Reprendre le suivi',
      'Il repasse dans la liste dès maintenant', async () => {
        await majSuivi(nom, { pauseJusquau: '', pauseMotif: '' });
        showToast('Suivi repris ✅');
        afficherAacCs();
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
    afficherAacCs();
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
        afficherAacCs();
      }));

    zone.appendChild(petitBouton('⏳ Pas encore',
      'On le redemandera — il ne sort pas de la liste', async () => {
        await majSuivi(nom, { csReponse: 'pasencore', csReponseLe: auj() });
        showToast('Noté — on redemandera');
        afficherAacCs();
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
      afficherAacCs();
    }));
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-aac-cs.js'] = true;
