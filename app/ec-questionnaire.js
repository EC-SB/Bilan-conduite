/* Déployé le 01/09/2026 à 09:07 — v750 */
/* ============================================================
   ec-questionnaire.js
   Questionnaire de début et de fin de cours
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   RACCOURCIS DE NOTE INTERNE
   `demandes` : questions posées au moniteur, dans l'ordre.
   Chaque réponse remplace le ❓ correspondant dans le modèle.
   ============================================================ */
const RACCOURCIS_NOTE = [
  { libelle: '📋 Compléter les infos', special: 'questionnaire' }
];


/* Combien de cours le serveur renvoie au plus. Le premier appel le
   demande explicitement ; le second, celui qui relit le texte, s'en
   remet à la limite du serveur pour une recherche par élève. */
const MAXI_DOSSIER = 40;
const MAXI_SERVEUR_ELEVE = 30;

/* Les deux charnières de la frise, reconnues au type du bilan */
const RE_TYPE_EXAMEN_BLANC = /examen\s+blanc/i;
const RE_TYPE_RDV_POST     = /rdv\s+post-?permis|rendez-vous\s+post-?permis/i;
/* Le simulateur nuit et risques ne laisse pas de date dans le
   suivi — il n'y en a pas de prévue. Ce qu'il laisse, c'est un
   bilan : « Simulateur — Boîte manuelle ». C'est cette trace-là qui
   dit qu'il a eu lieu. */
const RE_TYPE_SIMU         = /^simulateur/i;

/* Ce cours fait-il avancer le compteur de leçons ?

   Un rendez-vous pédagogique porte le libellé « AAC — … » sans être
   une leçon de conduite : le compter décalait la frise de tous les
   élèves en conduite accompagnée. C'est la même règle que
   leconCompteDansLaFrise, appliquée au libellé au lieu de la clé —
   dans le classeur, c'est le libellé qui est écrit. */
/* La boîte d'un cours, lue sur son libellé : « Conduite — Boîte
   manuelle » se conduit en BV. */
function boiteDuType(type){
  const t = String(type || '');
  if(/manuelle/i.test(t)) return 'BV';
  if(/automatique/i.test(t)) return 'BEA';
  return '';
}

function estUneLecon(type){
  const t = String(type || '');
  if(!/^Conduite/i.test(t) && !/^AAC/i.test(t)) return false;
  return !/rendez-vous|rvp/i.test(t);
}

/* Une seule requête pour tout ce dont le questionnaire a besoin */
async function chargerDossierEleve(nomEleve){
  const vide = { frise: '', lecons: null, manoeuvres: [], marques: {}, derniereNote: '',
                 leconsDepuisEB: null, leconsDepuisRdvPost: null, simuFait: false,
                 leconsParBoite: { BV: 0, BEA: 0 },
                 dernierHorodatage: '', boite: '' };
  if(!nomEleve || nomEleve.trim().length < 2) return vide;

  const enCache = lireCacheDossier(nomEleve);
  if(enCache) return enCache;

  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      /* Texte complet : la fiche véhicule s'y trouve, et c'est elle
         qui pré-coche le questionnaire. En mode allégé, les marques
         étaient toujours vides et rien n'était coché. */
      /* Quarante cours couvrent largement une formation complète :
         la fiche véhicule et la frise s'y trouvent en entier. La
         limite ne joue que sur les dossiers très anciens, où relire
         tout le texte coûtait plusieurs secondes. */
      /* Le nom exact, pas un morceau : c'est le dossier de CET élève
         qui compte ses leçons. Un nom contenu dans un autre — « Marie
         Martin » dans « Marie Martinez » — ferait compter les deux. */
      body: JSON.stringify({ action: 'search', code: ACCES.code,
                             eleve: nomEleve.trim(), maxi: MAXI_DOSSIER,
                             exact: true })
    });
    if(!r.ok) return vide;
    const data = await r.json().catch(() => ({}));
    let res = (data && data.resultats) || [];
    /* Le serveur ne renvoie que les derniers cours, mais il dit
       combien il y en a en tout : le numéro de leçon reste juste. */
    const totalConnu = (data && data.total) || 0;
    let plafond = MAXI_DOSSIER;

    /* Anciennes lignes sans colonne Manœuvres : on relit avec le texte.
       Le mode léger était redemandé, ce qui coûtait un appel pour rien. */
    const besoinTexte = res.length && res.every(x => !x.manoeuvres);
    if(besoinTexte){
      const r2 = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', code: ACCES.code,
                               eleve: nomEleve.trim(), exact: true })
      });
      if(r2.ok){
        const d2 = await r2.json().catch(() => ({}));
        if(d2 && d2.resultats){
          res = d2.resultats;
          plafond = MAXI_SERVEUR_ELEVE;   /* cet appel-là ne fixe pas de limite */
        }
      }
    }

    let frise = '';
    /* Les cours relus donnent le détail ; le total, lui, vient du
       serveur quand l'historique a été tronqué. */
    let lecons = 0;
    let vus = 0;
    const manoeuvres = [];
    const parBoite = { BV: 0, BEA: 0 };
    /* Le premier résultat est le plus récent */
    const dernier = res[0] || {};

    res.forEach(item => {
      if(!frise) frise = extraireFrise(item.note) || extraireFriseTexte(item.bilan);
      if(estUneLecon(item.type)){
        lecons++;
        /* Par boîte aussi : une passerelle repart de zéro, et ses
           leçons sont les SEULES que l'élève ait faites dans cette
           boîte — il a passé son permis dans l'autre. */
        const b = boiteDuType(item.type);
        if(b) parBoite[b]++;
      }
      vus++;
      const liste = item.manoeuvres
        ? String(item.manoeuvres).split('|').map(x => x.trim()).filter(Boolean)
        : manoeuvresDejaFaites(item.bilan);
      liste.forEach(m => {
        if(manoeuvres.indexOf(m) === -1) manoeuvres.push(m);
      });
    });

    /* La boîte de l'élève : colonne du questionnaire, sinon type du bilan */
    let boite = '';
    res.forEach(it => {
      if(!boite && it.boite) boite = String(it.boite).toLowerCase();
      if(!boite && /automatique/i.test(it.type || '')) boite = 'bea';
      if(!boite && /manuelle/i.test(it.type || '')) boite = 'bv';
    });

    /* Les marques de la fiche véhicule, cumulées du plus ancien
       au plus récent : elles servent à pré-cocher le questionnaire. */
    const marques = {};
    res.slice().reverse().forEach(item => {
      const m = marquesDejaPosees(item.bilan);
      Object.keys(m).forEach(k => { marques[k] = m[k]; });
    });

    /* Les cours plus anciens que ceux relus comptent aussi : ce sont
       presque toujours des leçons de conduite.

       Mais on ne s'en sert QUE si la liste a été tronquée : avoir reçu
       moins que la limite demandée veut dire qu'on les a tous, et que
       le compte est déjà complet. Sans ce garde-fou, un total erroné
       passait tel quel — c'est ainsi qu'on a vu « 160ème leçon », le
       relais renvoyant la taille du classeur entier. */
    if(vus >= plafond && totalConnu > vus) lecons += (totalConnu - vus);

    /* ----------------------------------------------------------
       LE DERNIER RANG ÉCRIT PAR UN HUMAIN FAIT LOI

       Le classeur ne compte que ce qu'il contient. Un élève repris
       d'une autre auto-école, ou dont les leçons sont plus
       anciennes que l'outil, y sera toujours en retard — de deux,
       de cinq, on ne sait pas.

       Le bureau corrige alors le rang à la main sur la carte,
       d'après Drivup. Cette correction doit TENIR : sans ça il
       faudrait la refaire à chaque leçon, et on retomberait sur le
       compte court dès le cours suivant.

       On repart donc du dernier rang qu'un bilan porte, et on
       compte les leçons qui l'ont suivi. Corrigé une fois, l'élève
       est calé pour de bon.
       ---------------------------------------------------------- */
    for(let k = 0; k < res.length; k++){
      if(!estUneLecon(res[k].type)) continue;
      const m = String(res[k].note || '').match(RE_NUM_LECON);
      if(!m) continue;
      const dit = parseInt(String(m[0]), 10);
      if(isNaN(dit) || dit <= 0) break;
      let depuis = 0;
      for(let q = 0; q < k; q++) if(estUneLecon(res[q].type)) depuis++;
      lecons = dit + depuis;
      break;
    }

    /* Où l'élève en est dans SA moitié de frise.

       La frise a une charnière — l'examen blanc — et un élève qui
       l'a passé n'est plus « à 3 leçons de l'examen blanc » : il est
       à la 1ère des 2 leçons qui suivent. Compter depuis toujours ne
       répond donc qu'à la moitié de la question.

       Les cours arrivent du plus récent au plus ancien : la charnière
       est une POSITION dans cette liste, pas une date à analyser.
       Tout ce qui la précède est postérieur. */
    const apres = (motif) => {
      let i = -1;
      for(let k = 0; k < res.length; k++){
        if(motif.test(String(res[k].type || ''))){ i = k; break; }
      }
      /* Introuvable : soit ça n'a pas eu lieu, soit c'est plus vieux
         que ce qu'on a relu. Dans les deux cas on ne sait pas, et
         mieux vaut ne rien dire que dire un chiffre faux. */
      if(i === -1) return null;
      let n = 0;
      for(let k = 0; k < i; k++) if(estUneLecon(res[k].type)) n++;
      return n;
    };

    /* Le rendez-vous post-permis, lui, ne laisse AUCUN bilan : il se
       conclut dans le suivi, et sa préparation est effacée derrière
       lui. Impossible de le repérer comme une position dans
       l'historique — il faut compter depuis SA DATE.

       C'est pour ça qu'Enzo restait annoncé « après l'examen
       blanc » alors que son post-permis datait du 19 août. */
    const isoDuCours = t => {
      const v = String(t || '');
      if(/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
      return (typeof dateFrVersIso === 'function') ? dateFrVersIso(v) : '';
    };

    const apresLaDate = (iso) => {
      if(!iso) return null;
      let n = 0;
      for(let k = 0; k < res.length; k++){
        const d = isoDuCours(res[k].date);
        if(d && d > iso && estUneLecon(res[k].type)) n++;
      }
      return n;
    };

    let depuisRdvPost = apres(RE_TYPE_RDV_POST);
    if(depuisRdvPost === null){
      try{
        const sv = (typeof suiviDe === 'function') ? (suiviDe(nomEleve) || {}) : {};
        if(sv.rdvPostFait === 'oui' && sv.rdvPostDate){
          depuisRdvPost = apresLaDate(String(sv.rdvPostDate));
        }
      }catch(e){ /* suivi non chargé : on ne dira rien plutôt qu'un faux */ }
    }

    const resultat = { frise: frise, lecons: lecons, manoeuvres: manoeuvres,
                       marques: marques,
                       leconsDepuisEB: apres(RE_TYPE_EXAMEN_BLANC),
                       /* Un simulateur dans son historique : il est
                          fait, et personne n'a plus à le cocher. */
                       simuFait: res.some(x => RE_TYPE_SIMU.test(String(x.type || ''))),
                       leconsDepuisRdvPost: depuisRdvPost,
                       leconsParBoite: parBoite,
                       derniereNote: dernier.note || '',
                       dernierHorodatage: dernier.horodatage || dernier.date || '',
                       boite: boite };
    ecrireCacheDossier(nomEleve, resultat);
    return resultat;
  }catch(e){
    console.warn('Dossier élève indisponible :', e);
    return vide;
  }
}

/* Voyant d'attente pendant le chargement */
function ouvrirAttente(message){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  fond.innerHTML =
    '<div class="modal" style="max-width:280px;text-align:center;">' +
      '<div class="spinner" style="margin:6px auto 14px;"></div>' +
      '<div style="font-size:15px;color:var(--soft);">' + (message || 'Chargement…') + '</div>' +
    '</div>';
  document.body.appendChild(fond);
  return () => { if(fond.parentNode) document.body.removeChild(fond); };
}

/* Convertit « mardi 4 août 2026 » en « 2026-08-04 » pour le calendrier */
const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet',
                 'août','septembre','octobre','novembre','décembre'];

function dateFrVersIso(texte){
  const t = normaliserMot(texte || '');
  const p2 = n => String(n).padStart(2, '0');

  /* Format chiffré : 02/09/2026, 2-9-2026, 02.09.2026 */
  const chiffre = t.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/);
  if(chiffre){
    return chiffre[3] + '-' + p2(chiffre[2]) + '-' + p2(chiffre[1]);
  }

  /* Déjà au format ISO */
  const iso = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if(iso) return iso[0];

  const m = t.match(/(\d{1,2})\s+([a-z\u00e0-\u00ff]+)\s+(\d{4})/);
  if(!m) return '';
  const jour = parseInt(m[1], 10);
  const mois = MOIS_FR.findIndex(x => normaliserMot(x) === m[2]);
  if(mois === -1) return '';
  return m[3] + '-' + p2(mois + 1) + '-' + p2(jour);
}

/* Reprend l'état décrit dans la note du dernier cours pour
   pré-remplir le questionnaire. */
/* Le rang du passage, relu dans la note : « 2e passage » */
function passageDepuisNote(note){
  const m = String(note || '').match(/(\d)\s*(?:er|e)\s+passage/i);
  return m ? m[1] : '';
}

/* ------------------------------------------------------------
   CE QUE LES SOURCES QUI FONT FOI SAVENT, ET QUE LA NOTE IGNORE

   Une note ne devine pas : elle relit. Trois choses ne s'écrivent
   pas dans le texte d'un bilan et ne peuvent venir que d'ailleurs :

     • la conclusion d'un examen blanc et celle d'un rendez-vous
       post-permis, avec les heures décidées — c'est le SUIVI, tenu
       par le bureau, qui les enregistre ;
     • la date d'un examen officiel quand l'élève vient d'être placé
       dans une SESSION — le bureau l'y met, la note ne le sait pas.

   Enzo était annoncé « après l'examen blanc » alors que son
   post-permis était fait depuis dix jours, et trois élèves placés
   dans la session du 31 août portaient « PAS DE DATE D'EXAMEN
   OFFICIEL ». Dans les deux cas l'information existait ; personne
   n'allait la chercher.
   ------------------------------------------------------------ */
function etatQuiFaitFoi(nom){
  const d = {};
  if(!nom) return d;

  /* Le suivi : la conclusion des examens et les heures qui restent */
  try{
    const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};

    if(s.rdvPostDate) d.rdvPostDate = String(s.rdvPostDate);
    if(s.rdvPostMoniteur) d.rdvPostMoniteur = String(s.rdvPostMoniteur);
    if(s.rdvPostFait === 'oui') d.rdvPostFait = 'oui';
    if(s.heuresRepassage) d.heuresRepassage = String(s.heuresRepassage);
    if(s.heuresRestantes) d.heuresRestantes = String(s.heuresRestantes);
    if(s.ebNiveau) d.ebNiveau = String(s.ebNiveau);
    if(s.ebDate){
      const iso = dateFrVersIso(String(s.ebDate));
      if(iso) d.examBlancDate = iso;
    }
    if(s.nbAjournements) d.repassages = parseInt(s.nbAjournements, 10) || 0;
    if(s.dateAjournement) d.dateAjournement = String(s.dateAjournement);
  }catch(e){ /* suivi non chargé : la note fera sans */ }

  /* La session d'examen : elle vaut date, et elle est plus récente
     que tout ce qu'un moniteur a pu écrire. */
  try{
    const jour = (typeof dateDeSessionDe === 'function') ? dateDeSessionDe(nom) : '';
    if(jour){ d.examDate = jour; d.examPermis = 'prevu'; }
  }catch(e){ /* sessions non chargées : idem */ }

  /* La formation du répertoire : c'est elle qui dit le parcours, et
     donc la frise. Sans cela, un élève en AAC gardait la frise
     classique de ses débuts À CÔTÉ de sa frise AAC — l'application
     n'allait chercher la formation que dans le questionnaire,
     jamais quand un rappel écrivait la note. */
  try{
    const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
    const formation = (f && String(f.formation || '').trim()) || '';
    if(formation){
      d.formation = formation;
      const boite = (typeof boiteDeLaFormation === 'function')
        ? boiteDeLaFormation(formation) : '';
      const fr = (typeof friseDeLaFormation === 'function')
        ? friseDeLaFormation(formation, boite !== 'BEA') : null;
      /* Une frise imposée s'impose ; '' veut dire « ce parcours n'en
         a pas » et vaut aussi. null veut dire « à saisir » : là on
         ne touche à rien. */
      if(fr !== null && fr !== undefined) d.frise = fr;
    }
  }catch(e){ /* fiches non chargées : la note fera sans */ }

  /* ------------------------------------------------------------
     CE QUI A EU LIEU A EU LIEU.

     Chrystel : « un examen blanc qui était prévu fin août ne se met
     pas en déjà passé, j'ai dû le mettre à la main pour que ça
     indique le résultat ». Elle avait raison, et rien ne le
     rattrapait : la date PRÉVUE de l'examen blanc vit dans le suivi
     sous « ebDatePrevue », et personne ne la lisait ici. Seule
     « ebDate » — la date du jour où il a été FAIT — était consultée.
     Tant que le bureau n'écrivait pas cette seconde date, l'élève
     restait « examen blanc réservé » indéfiniment, sa charnière
     avec, et son décompte de leçons aussi.

     Une date d'examen blanc dépassée veut dire qu'il a eu lieu.
     Pas celle du jour même : le cours d'aujourd'hui est peut-être
     l'examen blanc, et le déclarer passé avant de le faire serait
     écrire la fin avant le début.

     Le simulateur, lui, n'a pas de date prévue. Ce qu'il laisse
     derrière lui, c'est un bilan — et c'est cette trace qu'on lit.
     ------------------------------------------------------------ */
  try{
    const aujourdhui = (typeof todayLocal === 'function') ? todayLocal() : '';

    const prevue = (typeof suiviDe === 'function')
      ? String((suiviDe(nom) || {}).ebDatePrevue || '') : '';
    const isoPrevue = prevue ? dateFrVersIso(prevue) : '';
    if(isoPrevue){
      if(!d.examBlancDate) d.examBlancDate = isoPrevue;
      if(aujourdhui && isoPrevue < aujourdhui) d.examBlanc = 'passe';
      else if(!d.examBlanc) d.examBlanc = 'reserve';
    }

    /* Et la preuve la plus sûre : son bilan est dans le classeur. */
    const dossier = (typeof lireCacheDossier === 'function')
      ? lireCacheDossier(nom) : null;
    if(dossier){
      if(dossier.leconsDepuisEB !== null && dossier.leconsDepuisEB !== undefined){
        d.examBlanc = 'passe';
      }
      if(dossier.simuFait) d.simuNuit = 'fait';
    }
  }catch(e){ /* rien de lu : on ne promeut rien plutôt que de deviner */ }

  return d;
}

/* La ligne d'examen voyage en gras Unicode — la note vit dans un
   tableur, elle ne peut pas porter de mise en forme. Le lecteur de
   notes, lui, cherche « Examen prévu le ». Sans cette traduction,
   une note déjà mise à la forme actuelle ne se relisait plus : la
   date d'examen s'y trouvait, et on répondait qu'il n'y en avait
   pas. */
function noteEnClair(note){
  /* Le gras d'abord : « 𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖 𝗣𝗔𝗦𝗦𝗘́ » n'est pas
     « EXAMEN BLANC PASSÉ » pour une expression régulière. */
  return sansGras(note).split('EXAMEN OFFICIEL PRÉVU LE').join('Examen prévu le');
}

/* La conclusion d'un examen blanc, telle qu'elle se range.

   « pas le niveau », « plus que les 3h », « encore 2 leçons » : la
   même information sert au bureau, au suivi et à la note. Chaque
   leçon annoncée vaut deux heures. Écrite ici une seule fois, elle
   ne peut pas dire deux choses différentes selon l'écran. */
function conclusionExamenBlanc(a){
  const d = {};
  if(!a || !a.ebSuite) return d;

  d.ebNiveau = (a.ebSuite === 'pasleniveau') ? 'non' : 'oui';
  if(a.ebSuite === '3h') d.heuresRestantes = '0';
  else if(a.ebSuite === 'lecons' && a.ebLecons){
    d.heuresRestantes = String(Number(a.ebLecons) * 2);
  }
  return d;
}

function defautsDepuisNote(note){
  note = noteEnClair(note);
  const a = analyserNote(note);
  const d = {};
  if(a.examBlanc){
    d.examBlanc = a.examBlanc;
    if(a.examBlancN !== null) d.examBlancN = String(a.examBlancN);

    /* La DATE et la CONCLUSION, que le lecteur trouvait déjà et que
       personne ne reprenait. C'est pour ça qu'un message du bureau
       — « examen blanc passé le 26 août — pas le niveau » — restait
       une phrase à relire et à ressaisir à la main. */
    if(a.ebDate){
      const iso = dateFrVersIso(a.ebDate);
      if(iso) d.examBlancDate = iso;
    }
    if(a.examBlancDate){
      const iso = dateFrVersIso(a.examBlancDate);
      if(iso) d.examBlancDate = iso;
    }
    Object.assign(d, conclusionExamenBlanc(a));
  }
  if(a.simuNuit) d.simuNuit = a.simuNuit;
  const rgP = passageDepuisNote(note);
  if(rgP) d.examPassage = rgP;
  if(a.permis === 'aprevoir'){
    d.examPermis = 'aprevoir';
  }else if(a.permis === 'prevu'){
    d.examPermis = 'prevu';
    const iso = dateFrVersIso(a.permisDate);
    if(iso) d.examDate = iso;
    if(a.permisN !== null) d.examPermisN = String(a.permisN);
  }else if(a.permis === 'annule'){
    d.examPermis = 'annule';
    const m = (note || '').match(/Examen du permis du ([^—·]+?) annulé/i);
    if(m){ const iso = dateFrVersIso(m[1]); if(iso) d.examDate = iso; }
    const n = (note || '').match(/reprogrammé le ([^—·]+)/i);
    if(n){ const iso = dateFrVersIso(n[1]); if(iso) d.nouvelleDate = iso; }
  }
  const n = String(note || '');
  const aj = analyserNote(n);
  if(aj.repassages){
    d.repassages = aj.repassages;
    d.dateAjournement = aj.dateAjournement || '';
  }
  if(/♿ Conduite aménagée/i.test(n)){
    d.handicap = 'oui';
    d.amenagements = AMENAGEMENTS.filter(a => n.indexOf(a.nom) !== -1).map(a => a.cle);
  }
  /* Un élève qui a besoin du coussin en a besoin au cours suivant :
     la case se recoche seule. */
  if(/coussin vert/i.test(n)) d.coussin = 'oui';
  if(/Formation accompagnateur faite/i.test(note || '')) d.formAccomp = 'faite';
  else if(/Formation accompagnateur déjà prévue/i.test(note || '')) d.formAccomp = 'prevue';
  else if(/Formation accompagnateur à prévoir/i.test(note || '')) d.formAccomp = 'aprevoir';
  if(/Rendez-vous préalable fait/i.test(note || '')) d.rvPrealable = 'fait';
  else if(/Rendez-vous préalable déjà prévu/i.test(note || '')) d.rvPrealable = 'prevu';
  else if(/Rendez-vous préalable à prévoir/i.test(note || '')) d.rvPrealable = 'aprevoir';

  /* Les deux rendez-vous pédagogiques de l'AAC, sous leurs deux
     écritures : la longue des premières notes, la courte d'après. */
  [1, 2].forEach(k => {
    const re = s => new RegExp(
      '(?:rendez-vous pédagogique n°|RVP\\s*)' + k + '\\s+' + s, 'i');
    if(re('fait').test(n)) d['rvp' + k] = 'fait';
    else if(re('(?:déjà )?prévu').test(n)) d['rvp' + k] = 'prevu';
    else if(re('à prévoir').test(n)) d['rvp' + k] = 'aprevoir';
  });

  /* Le rendez-vous post-permis, relu dans la note.

     Le bureau y écrit ses trois étapes au fil de l'eau — « à
     prévoir », « le 19 août avec Chrystel », « fait — 6h à faire ».
     Sans cette lecture, elles restaient trois phrases recopiées
     côte à côte au lieu d'un état ; c'est exactement l'empilement
     que Chrystel a relevé. */
  /* « 2 + 3h » est la notation du bureau : deux heures de leçons,
     puis les trois heures d'avant examen. C'est ce chiffre-là qu'on
     relit — et il se lit sur la ligne où il est écrit, jamais sur
     une autre : l'examen blanc porte la même notation, et les
     confondre donnerait à l'un les heures de l'autre. */
  const heuresDeLaLigne = (motif) => {
    const seg = segmentsDeNote(n).find(x => motif.test(x));
    if(!seg) return '';
    const m1 = seg.match(/—\s*(\d+)\s*\+\s*3\s*h/i);
    if(m1) return m1[1];
    const m2 = seg.match(/(\d+)\s*h\s+à\s+faire/i);
    return m2 ? m2[1] : '';
  };

  /* COMBIEN DE LEÇONS AVANT LA CHARNIÈRE, RELU DANS LA NOTE.

     La ligne de position porte les deux nombres — « 3ÈME LEÇON
     APRÈS L'EXAMEN BLANC (2 PRÉVUES, 8ÈME AU TOTAL) » — et leur
     différence est le seul des trois qui ne vieillisse pas : 5
     leçons avant l'examen blanc, et ce sera encore vrai dans six
     mois. Le relire ici, c'est ce qui dispense de retaper la
     deuxième case à chaque cours.

     On ne le déduit que d'une ligne qui porte VRAIMENT les deux :
     sans « au total », le rang d'après vaut le total, et la
     soustraction ne dirait rien. */
  const APRES_CHARNIERE = new RegExp(
    '(\\d+)\\s*(?:ère|ere|ème|eme|e)\\s+le[çc]on\\s+après\\s+' +
    "(l'examen blanc|le post-?permis|l'examen ajourné)" +
    '[^(\\n]*\\(([^)\\n]*?)(\\d+)\\s*(?:ère|ere|ème|eme|e)\\s+au total', 'i');
  {
    const m = n.match(APRES_CHARNIERE);
    if(m){
      const depuis = parseInt(m[1], 10);
      const total = parseInt(m[4], 10);
      if(!isNaN(depuis) && !isNaN(total) && total > depuis){
        const quelle = /post/i.test(m[2]) ? 'avantRdvPost'
                     : /ajourn/i.test(m[2]) ? 'avantExamRate'
                     : 'avantEB';
        d[quelle] = String(total - depuis);
      }
    }
  }

  /* « AJOURNÉ LE … — REPREND LA CONDUITE » : l'état se relit comme
     tout le reste, sinon le cours suivant repartirait sans savoir
     qu'il est déjà allé à l'examen. */
  {
    const m = n.match(/ajourné le\s+([^\n—]+?)\s*—\s*reprend/i);
    if(m){
      d.examPermis = 'passe';
      const iso = (typeof dateFrVersIso === 'function')
        ? dateFrVersIso(m[1].trim()) : '';
      if(iso) d.examDate = iso;
    }
  }

  /* Le résultat de l'examen blanc, quand il est écrit.

     Le motif vise la ligne d'ÉTAT — « examen blanc passé » — et
     non le simple mot : la ligne de position dit elle aussi
     « après l'examen blanc », et c'est elle qu'on trouvait en
     premier, sans le chiffre cherché. */
  if(d.examBlanc === 'passe'){
    const h = heuresDeLaLigne(/examen\s+blanc\s+pass/i);
    if(h) d.heuresRestantes = h;
  }

  const RDV = '(?:rdv|rendez-vous)\\s+post-?permis';
  let r;
  if((r = n.match(new RegExp(RDV + '\\s+fait', 'i')))){
    d.rdvPostFait = 'oui';
    /* La ligne d'état, pas celle de position : « 1ère leçon depuis
       le rendez-vous post-permis » porte les mêmes mots. */
    const h = heuresDeLaLigne(new RegExp(RDV + '\\s+fait', 'i'));
    if(h) d.heuresRepassage = h;
    const q = n.match(new RegExp(RDV + '[^·\\n]*?\\bavec\\s+([^—·(\\n]+)', 'i'));
    if(q) d.rdvPostMoniteur = q[1].trim();
    const j = n.match(new RegExp(RDV + '[^·\\n]*?\\ble\\s+([^—·(\\n]+)', 'i'));
    if(j){ const iso = dateFrVersIso(j[1]); if(iso) d.rdvPostDate = iso; }
  }else if((r = n.match(new RegExp(RDV + '\\s+(?:pr[ée]vu\\s+)?le\\s+([^—·(\\n]+)', 'i')))){
    const iso = dateFrVersIso(r[1]);
    if(iso) d.rdvPostDate = iso;
    const q = r[1].match(/\bavec\s+(.+)$/i);
    if(q) d.rdvPostMoniteur = q[1].trim();
  }else if(new RegExp(RDV + '\\s+à\\s+pr[ée]voir', 'i').test(n) ||
           /bilan d'examen et rendez-vous post-?permis à prévoir/i.test(n)){
    d.rdvPostAPrevoir = 'oui';
  }

  return d;
}

/* Champs factuels : toujours recalculés, jamais figés par la préparation */
/* Cette séance compte-t-elle dans la frise ?

   Les leçons de conduite oui ; l'examen blanc, les simulateurs
   et l'examen officiel non — ils ne consomment pas de leçon. */
/* Combien d'examens blancs l'élève a déjà passés.

   Le rang du jour s'en déduit : le troisième vient après deux
   autres. */
function examensBlancsPasses(){
  const nom = ($('studentName') && $('studentName').value.trim()) || '';
  if(!nom) return 0;

  try{
    const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};
    const n = parseInt(s.nbExamensBlancs, 10);
    if(!isNaN(n)) return n;
  }catch(e){}

  /* À défaut, ce que disent ses notes — gras défait d'abord, sans
     quoi « 2e 𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖 » ne se lit plus. */
  try{
    const t = sansGras(($('noteInterne') && $('noteInterne').value) || '');
    const m = t.match(/(\d+)\s*(?:e|er|ème|eme)?\s*examens?\s+blancs?/i);
    if(m) return parseInt(m[1], 10);
  }catch(e){}

  return 0;
}


/* La date d'examen lue dans les sessions ouvertes.

   Un élève placé par le bureau a sa date là-bas, pas forcément
   dans ses notes. */
function dateDepuisSession(){
  return dateDeSessionDe(($('studentName') && $('studentName').value.trim()) || '');
}

/* La même chose, pour un élève qu'on nomme — un cours préparé par
   un rappel, un cours qu'on répare : ni l'un ni l'autre n'a d'écran
   où lire un nom. */
function dateDeSessionDe(nom){
  if(!nom) return '';

  try{
    if(typeof sessionsPermis === 'undefined' || !sessionsPermis.length) return '';

    for(const s of sessionsPermis){
      const dedans = (s.eleves || []).some(p =>
        p.eleve && normaliserMot(p.eleve) === normaliserMot(nom));
      if(!dedans) continue;

      /* La session porte sa date, en ISO ou en toutes lettres */
      const d = s.dateIso || s.iso || s.date || '';
      if(!d) continue;
      return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : (dateFrVersIso(d) || '');
    }
  }catch(e){}

  return '';
}


/* Ce que ses notes disent de sa problématique.

   Écrite une fois, elle se retrouve d'une évaluation à l'autre :
   la retaper à chaque fois n'a pas de sens. */
function problematiqueConnue(){
  const t = ($('noteInterne') && $('noteInterne').value) || '';

  const m = t.match(/❓\s*Problématique\s*:?\s*([^\n]+)/i);
  if(m) return m[1].trim();

  /* Le format des anciennes notes */
  const m2 = t.match(/Problématique\s*:\s*([^\n]+)/i);
  return m2 ? m2[1].trim() : '';
}


function seanceDeLaFrise(){
  const m = ($('modele') && $('modele').value) || '';
  if(/^simu/.test(m)) return false;
  if(m === 'examen-blanc') return false;
  if(m === 'examen-officiel') return false;
  if(m === 'rdv-post') return false;
  return true;
}


/* Ces champs-là ne sont pas un jugement : ce sont des comptes relus
   dans le classeur. Une préparation vieille de trois jours ne doit
   pas les figer — l'élève a peut-être eu un cours entre-temps. */
const CHAMPS_FACTUELS = ['lecon', 'frise', 'manoeuvresFaites', 'totalManoeuvres',
                         'leconsDepuisEB', 'leconsDepuisRdvPost', 'leconsParBoite',
                         /* « le classeur ne sait rien de cet élève » se
                            reperd dès qu'un bilan existe : c'est un
                            constat du jour, pas une réponse gardée. */
                         'sansBilan'];

/* Fusionne : le jugement du moniteur l'emporte, les faits sont rafraîchis */
function fusionnerContexte(saisi, defauts){
  const out = Object.assign({}, defauts || {});

  /* Un rang tapé à la main est un FAIT, pas un affichage : il vient
     de Drivup, pas du comptage du classeur. Le rafraîchissement ne
     repasse donc pas derrière — sinon corriger « 8 » sur la carte
     n'aurait tenu que jusqu'au prochain chargement, et on aurait
     recorrigé le même élève à chaque leçon. */
  const rangTapeALaMain = saisi && String(saisi.leconMain || '') === 'oui';

  Object.keys(saisi || {}).forEach(k => {
    if(k === 'lecon' && rangTapeALaMain){
      if(saisi.lecon) out.lecon = saisi.lecon;
      return;
    }
    if(CHAMPS_FACTUELS.indexOf(k) !== -1 &&
       defauts && defauts[k] !== undefined && defauts[k] !== '') return;
    const v = saisi[k];
    const vide = (v === '' || v === null || v === undefined ||
                  (Array.isArray(v) && !v.length));
    if(!vide) out[k] = v;
  });
  return out;
}

/* Le RANG d'une leçon dans un texte : « 5ème leçon », « 5e leçon ».
   Écrit une seule fois — la note du cours préparé, le bilan et la
   réparation s'en servent tous les trois. Le suffixe, lui, appartient
   à chaque document : la note écrit « 5ème », le bilan « 5e ».

   Deux garde-fous, et ils ont coûté cher :

   • le suffixe ordinal est OBLIGATOIRE. Une note ne parle pas que de
     rangs, elle compte aussi : « 5 leçons de 2h » dans une frise,
     « encore 2 leçons avant l'examen blanc ». Sans le suffixe, la
     frise était attrapée la première et la correction du rang la
     réécrivait — « 3èmeleçons de 2h + exam blanc… » ;

   • le pluriel est refusé. « leçons » n'est jamais un rang, et cela
     rend aussi les frises déjà abîmées intouchables : la réparation
     les reconstruit, elle ne les rature pas une seconde fois. */
const RE_NUM_LECON = /\d+\s*(?:ère|ere|ème|eme|e)(\s*le[çc]on)(?!s)/i;

/* ------------------------------------------------------------
   LA NOTE D'UN COURS PRÉPARÉ — TROIS MORCEAUX

   Une note de cours préparé est toujours faite des mêmes trois
   parties, dans le même ordre :

     🕐 13h00 🆔          ← l'en-tête, posé par le rappel
     5 leçons de 2h · …   ← le corps, écrit par le questionnaire
     📌 …                 ← la consigne reprise du cours précédent

   Trois endroits les assemblaient chacun à leur manière, et aucun
   ne savait les séparer : réparer le corps effaçait la consigne,
   nettoyer la consigne abîmait l'en-tête. Un seul assemble
   désormais, un seul sépare.
   ------------------------------------------------------------ */
function morceauxDeNotePreparee(note){
  const lignes = String(note || '').split('\n');

  /* L'en-tête tient sur la première ligne et ne porte que des
     pictogrammes : l'heure, la carte d'identité, la carte SD. */
  let entete = '';
  if(lignes.length && /^\s*(?:🕐|🆔|💾)/.test(lignes[0])) entete = lignes.shift();

  let i = -1;
  for(let k = 0; k < lignes.length; k++){
    if(/^\s*📌/.test(lignes[k])){ i = k; break; }
  }

  const corps = (i === -1 ? lignes : lignes.slice(0, i)).join('\n').trim();
  const consigne = (i === -1) ? ''
    : lignes.slice(i).join('\n').replace(/^\s*📌\s*/, '').trim();

  return { entete: entete, corps: corps, consigne: consigne };
}

/* La ligne de position — « 3ÈME LEÇON — PLUS QUE 2 LEÇONS… ».

   C'est celle qu'un moniteur cherche en premier, et la carte
   l'écrit en gros et en vert foncé. On la reconnaît à son repère
   🎯, posé au moment où elle est écrite : pas de seconde règle à
   tenir à jour, pas de motif à deviner. */
const RE_LIGNE_POSITION = /^\s*🎯/;

function lignePosition(corps){
  const l = String(corps || '').split('\n')
    .find(x => RE_LIGNE_POSITION.test(x)) || '';
  /* Le premier segment, et lui seul. Les notes écrites avant que la
     position ait sa propre ligne la collaient au reste des états :
     tout partait en gros, « Formation accompagnateur faite » y
     compris. En gros, on ne veut QUE le rang. */
  return l ? segmentsDeNote(l)[0] || '' : '';
}

/* Une note écrite avant un changement de formation.

   Chrystel passe un élève en passerelle : sa note porte encore la
   frise et la date d'examen de son parcours d'avant, et elles
   restent là jusqu'à ce que la réparation passe. Le type de
   formation prime — y compris à l'affichage, tout de suite. */
function noteSelonLaFormation(note, formation, modele){
  const texte = String(note || '');

  /* Ce que le parcours n'a pas, d'après la fiche de l'élève */
  const sans = sansObjetPourLaFormation(formation);
  const familles = {};
  sans.forEach(c => { familles[c] = true; });
  if(sans.indexOf('examPermis') !== -1) familles.examenPermis = true;
  if(sans.indexOf('pasEcoute') !== -1) familles.ecoutes = true;

  /* Et ce que la note dit d'elle-même : ses rendez-vous
     pédagogiques la désignent comme un parcours AAC, fiche remplie
     ou non. */
  const relu = (typeof defautsDepuisNote === 'function')
    ? defautsDepuisNote(texte) : {};
  const q = { rvp1: relu.rvp1, rvp2: relu.rvp2, formation: formation,
              modele: modele || '', frise: extraireFrise(texte) };

  const aac = estUnParcoursAac(q);
  const friseAac = aac ? friseAacDe(q) : '';

  /* Un rendez-vous pédagogique passé rend « examen blanc pas
     encore évoqué » faux : il a eu lieu pendant, ou il n'y en aura
     pas. On ne retire QUE cette ligne-là — un examen blanc daté
     reste une information. */
  const rienDitSurEB = aac && rvpDejaFait(q) &&
                       !relu.examBlanc && !relu.ebPasse;

  if(!sans.length && !friseAac && !rienDitSurEB) return texte;

  /* La ligne de tête aussi peut mentir : « DERNIÈRE AVANT L'EXAMEN
     BLANC » sur un élève dont le rendez-vous pédagogique est déjà
     passé. On la refait — avec la même règle que le rédacteur, et
     à partir du rang qu'elle porte déjà. */
  let positionRefaite = '';
  if(rienDitSurEB){
    const ancienne = lignePosition(texte);
    if(/examen blanc|fiche véhicule/i.test(sansGras(ancienne))){
      const m = sansGras(ancienne).match(RE_NUM_LECON);
      const rang = m ? parseInt(String(m[0]), 10) : NaN;
      if(!isNaN(rang) && rang > 0){
        positionRefaite = positionDansLaFrise({
          lecon: String(rang), leconsFaites: rang - 1,
          frise: friseAac || q.frise, modele: q.modele,
          rvPrealable: relu.rvPrealable, rvp1: relu.rvp1, rvp2: relu.rvp2
        });
      }
    }
  }

  return texte.split('\n').map(l =>
    segmentsDeNote(l).map(seg => {
      if(positionRefaite && RE_LIGNE_POSITION.test(seg)) return positionRefaite;
      const f = familleDuSegment(seg);
      if(f && familles[f.cle]) return '';
      if(f && f.cle === 'examenBlanc' && rienDitSurEB &&
         /pas encore/i.test(sansGras(seg))) return '';
      /* La frise classique d'un élève en AAC : c'est la frise AAC
         qui vaut, et elle est écrite dans une table, pas devinée. */
      if(f && f.cle === 'frise' && friseAac &&
         !/^AAC\b/i.test(sansGras(seg))) return friseAac;
      return seg;
    }).filter(Boolean).join(' · ')
  ).filter(Boolean).join('\n');
}

function sansLignePosition(corps){
  return String(corps || '').split('\n').map(l => {
    if(!RE_LIGNE_POSITION.test(l)) return l;
    /* Ce qui suivait la position sur sa ligne n'est pas perdu : il
       redescend avec le reste, en écriture normale. */
    return segmentsDeNote(l).slice(1).join(' · ');
  }).filter(Boolean).join('\n');
}

function assemblerNotePreparee(entete, corps, consigne){
  const tete = String(entete || '').trim();
  const c = String(corps || '');
  /* Un morceau absent ne laisse pas sa ligne derrière lui : sans
     cela, un cours sans corps donnait une ligne vide entre l'heure
     et la consigne. */
  let t = tete ? (c ? tete + '\n' + c : tete) : c;
  if(consigne) t += (t ? '\n\n' : '') + '📌 ' + consigne;
  return t;
}

/* ------------------------------------------------------------
   FONDRE CE QUE LE QUESTIONNAIRE ÉCRIT ET CE QUE LE COURS
   PRÉCÉDENT A LAISSÉ

   Les deux disent souvent la même chose, mais pas aussi bien : le
   questionnaire écrit « EXAMEN OFFICIEL PRÉVU LE LUNDI 31 AOÛT
   2026 », le bureau avait écrit la même ligne avec le centre et
   l'heure. Empilées, elles se répétaient cinq fois ; choisies au
   hasard, on perdait le centre.

   Trois règles, et elles suffisent :

     • une famille ne s'écrit qu'une fois. Le NEUF a le dernier mot :
       c'est la réponse du moniteur, pas l'histoire. Si le
       questionnaire dit « examen annulé », un ancien « examen prévu
       le 31 » ne doit pas ressusciter ;

     • sauf quand l'ancien dit exactement la même chose en plus
       complet — la ligne du bureau porte le centre et l'heure de
       convocation, que le questionnaire ne sait pas écrire. Le
       critère est net : l'ancien commence par le neuf ;

     • ce que le questionnaire ne sait pas redire — les mots du
       moniteur — n'entre pas dans le corps : il reste derrière son
       📌, à sa place, parce que c'est à cela que sert le 📌.

   « ancien » est tout ce qui était écrit avant : la note du cours
   précédent, ou le corps ET le 📌 d'un cours qu'on répare. Passer
   les deux permet à la réparation de tourner deux fois sans rien
   perdre.
   ------------------------------------------------------------ */
function fondreNotePreparee(neuf, ancien){
  /* L'EN-TÊTE DE L'ANCIENNE NOTE RESTE À SON COURS.

     « 🕐 13h00 🆔 » dit l'heure, la carte d'identité et la carte SD
     DE CE COURS-LÀ. Fondu tel quel, rien ne le reconnaissait comme
     un en-tête : il redescendait en texte libre derrière le 📌, et
     la carte affichait l'heure deux fois — en gros en haut, en
     petit en bas. Le nouveau cours a son propre en-tête, posé par
     son rappel. */
  const separe = (typeof morceauxDeNotePreparee === 'function' && ancien)
    ? morceauxDeNotePreparee(ancien) : null;
  const sansEntete = separe
    ? [separe.corps, separe.consigne].filter(Boolean).join('\n')
    : ancien;

  const propre = sansEntete ? nettoyerNote(sansEntete) : '';
  if(!propre) return { corps: String(neuf || ''), consigne: '' };

  /* Les mots du moniteur, sauf ceux que le neuf redit déjà : le
     questionnaire porte lui aussi un champ libre, et l'y voir deux
     fois — dans le corps et sous le 📌 — serait le même empilement
     qu'on cherche à faire disparaître. */
  const dejaLa = segmentsDeNote(String(neuf || ''));
  const aPart = segmentsDeNote(retirerSegmentsRegeneres(propre))
    .filter(s => dejaLa.indexOf(s) === -1);
  const libres = aPart.join(' · ');

  /* Ce que l'ancien disait, sujet par sujet */
  const dits = {};
  segmentsDeNote(propre).forEach(s => {
    if(aPart.indexOf(s) !== -1) return;
    const f = familleDuSegment(s);
    if(!f) return;
    /* Une frise à trous ne se recolle pas : la garder, c'est la
       promener de note en note indéfiniment. */
    if(f.cle === 'frise' && typeof friseUtilisable === 'function' &&
       !friseUtilisable(sansGras(s))) return;
    dits[f.cle] = s;
  });

  /* Ligne à ligne : la note neuve est bâtie en blocs — la frise, où
     il en est, l'examen officiel — et fondre le tout d'un bloc les
     aurait recollés en un seul pavé. */
  const vus = {};
  const sorties = String(neuf || '').split('\n').map(ligne =>
    segmentsDeNote(ligne).map(s => {
      const f = familleDuSegment(s);
      if(!f) return s;
      vus[f.cle] = true;
      const avant = dits[f.cle];
      const enrichit = avant && avant !== s &&
                       sansGras(avant).indexOf(sansGras(s)) === 0;
      return enrichit ? avant : s;
    }).join(' · ')
  );

  /* Les sujets dont le neuf ne parle pas restent ceux de l'ancien :
     ils seraient perdus autrement.

     SAUF LE RANG DE LA LEÇON. Il décrit la séance du JOUR, pas
     l'élève : hérité, il annonce la séance d'hier. Quand la note
     neuve n'en dit rien, c'est qu'il n'y a rien à en dire — un
     simulateur n'a pas de rang, un élève dont on ignore le compte
     non plus — et le silence est la bonne réponse. C'est ainsi
     qu'un cours de simulateur portait encore « 1ère leçon sur 2 —
     encore 1 leçon avant l'examen blanc », phrase écrite pour un
     autre cours, par une version d'avant. */
  const DU_JOUR = ['lecon', 'leconVide', 'avantEB', 'friseEtat', 'entete'];
  const restants = Object.keys(dits)
    .filter(c => !vus[c] && DU_JOUR.indexOf(c) === -1)
    .map(c => dits[c]);
  if(restants.length) sorties.push(restants.join(' · '));

  return { corps: sorties.filter(Boolean).join('\n'), consigne: libres };
}

/* Le cours du jour compte-t-il comme une leçon de la frise ? Un
   simulateur, un examen blanc ou un rendez-vous post-permis occupent
   un créneau sans faire avancer le compteur. */
function leconCompteDansLaFrise(modeleCle){
  return ['conduite-auto', 'conduite-manuelle',
          'aac-auto', 'aac-manuelle'].indexOf(modeleCle) !== -1;
}

/* ------------------------------------------------------------
   EST-CE VRAIMENT SON PREMIER COURS ?

   « Récupérer sa carte SD au bureau » ne se coche qu'une fois dans
   une formation : le jour où l'élève monte dans la voiture pour la
   première fois. Les deux options « Premier cours en voiture » le
   disent plus clairement encore.

   C'est la SEULE chose qui autorise à écrire « 1ère leçon » quand
   le classeur ne porte aucun bilan — voir rangConnu plus bas.

   Trois formes selon d'où vient la réponse : la case cochée au
   rappel (un tableau d'options), la trace que le rappel a laissée
   en tête de note (le 💾), ou un booléen déjà rangé dans le
   contexte du cours. */
function cestLePremierCours(source){
  /* La table vit ici, dans la seule fonction qui s'en sert : elle
     n'a pas à être chargée séparément pour que la question ait une
     réponse. */
  const OPTIONS = ['sd', '1er-bv', '1er-bea'];
  if(!source) return false;
  if(source === true || source === 'oui') return true;
  if(Array.isArray(source)){
    return source.some(o => OPTIONS.indexOf(String(o)) !== -1);
  }
  return String(source).indexOf('💾') !== -1;
}

/* ------------------------------------------------------------
   LE RANG QUE L'APPLICATION A LE DROIT D'AFFIRMER

   Zéro bilan au classeur ne veut PAS dire zéro leçon. L'élève peut
   arriver d'une autre auto-école, ses cours peuvent être plus
   vieux que ce qu'on relit, son dossier peut simplement n'avoir
   pas répondu. Compter « 0 + 1 » là-dessus et écrire « 1ère
   leçon », c'est inventer un rang — et c'est ce que les moniteurs
   lisaient sur des élèves qui en étaient à leur quinzième.

   Une seule chose prouve le contraire : le rappel qui dit de venir
   chercher sa carte SD, ou celui du premier cours en voiture.
   Sinon on ne sait pas, on rend null, et la note le dira.
   ------------------------------------------------------------ */
function rangConnu(lecons, modeleCle, premierCours){
  if(lecons === null || lecons === undefined) return null;
  const n = parseInt(lecons, 10);
  if(isNaN(n)) return null;
  if(n === 0 && !cestLePremierCours(premierCours)) return null;
  return leconCompteDansLaFrise(modeleCle) ? n + 1 : n;
}


/* Le questionnaire a-t-il été rempli par quelqu'un ?

   Porter un contexte ne suffit pas : un cours créé tout seul — par
   un rappel, par une attribution d'examen blanc — en porte un,
   déduit du dossier, auquel personne n'a répondu. Seule la marque
   posée à la validation fait foi. Écrit ici une fois pour les deux
   modes, vocal et manuel : la même question, la même réponse. */
function questionnaireDejaRepondu(ctx){
  return !!(ctx && ctx.repondu);
}

/* ============================================================
   QUESTIONNAIRE DE DÉPART
   Un seul écran, tout pré-rempli : le moniteur ne corrige que
   ce qui a changé, puis démarre.
   ============================================================ */

/* Frises fixes, connues d'après le type de bilan */
const FRISES_FIXES = {
  'aacbea': 'AAC BEA👼⚠️que 4 leçons voiture pour faire fiche véhicule ⚠️3 leçons de 2 heures + simu nuit et risques + 1 leçons de 2 heures + 1h formation accompagnateur + 2h rendez vous préalable',
  'aacbv': 'AAC BV👼⚠️que 6 leçons voiture pour faire fiche véhicule ⚠️5 leçons de 2 heures + simu nuit et risques + 1 leçons de 2 heures + 1h formation accompagnateur + 2h rendez vous préalable',
  'csbea': 'CS BEA⚠️que 4 leçons voiture pour faire fiche véhicule ⚠️3 leçons de 2 heures + simu nuit et risques + 1 leçons de 2 heures + 1h formation accompagnateur + 2h rendez vous préalable',
  'csbv': 'CS BV👼⚠️que 6 leçons voiture pour faire fiche véhicule ⚠️5 leçons de 2 heures + simu nuit et risques + 1 leçons de 2 heures + 1h formation accompagnateur + 2h rendez vous préalable'
};

/* Parcours proposé par défaut selon le type de bilan */
const PARCOURS_PAR_TYPE = { 'aac-auto': 'aacbea', 'aac-manuelle': 'aacbv' };

/* ------------------------------------------------------------
   CE QUE LA FORMATION IMPLIQUE

   La formation vient du répertoire, et tout en découle : la boîte,
   le type de bilan, la frise, et jusqu'aux questions posées.

   Une seule table, parce qu'il y en avait trois — une case
   « conduite supervisée » dans le questionnaire, une déduction par
   type de bilan pour l'AAC, une boîte devinée au nom de la
   formation. Trois endroits pour une même règle finissent toujours
   par ne plus dire la même chose : c'est ainsi qu'un élève en AAC
   repartait sur un bilan Conduite.

   « frise » vaut la clé d'une frise fixe quand le parcours l'impose,
   null quand elle se saisit à la main, et '' quand il n'y en a pas
   du tout — le cas de la passerelle, qui n'a ni examen blanc ni
   progression à jalonner.
   ------------------------------------------------------------ */
const PARCOURS_FORMATION = [
  { cle:'BV',      boite:'BV',  modele:'conduite-manuelle', frise:null },
  { cle:'BEA',     boite:'BEA', modele:'conduite-auto',     frise:null },
  { cle:'AAC BV',  boite:'BV',  modele:'aac-manuelle', frise:'aacbv',  aac:true, accompagnee:true },
  { cle:'AAC BEA', boite:'BEA', modele:'aac-auto',     frise:'aacbea', aac:true, accompagnee:true },
  { cle:'CS BV',   boite:'BV',  modele:'conduite-manuelle', frise:'csbv', accompagnee:true },
  { cle:'CS BEA',  boite:'BEA', modele:'conduite-auto',     frise:'csbea', accompagnee:true },
  /* UN ÉLÈVE DONT LE DOSSIER EST AILLEURS.

     Il prend des leçons ici, son dossier est dans une autre
     auto-école. La boîte et le modèle de bilan ne changent pas —
     c'est la même conduite — mais LA FRISE, SI.

     Chrystel : « pour toutes ces nouvelles formations ce sont des
     frises classiques ». Nos frises toutes faites décrivent NOTRE
     parcours, étape par étape ; un élève venu d'ailleurs n'a pas
     suivi ces étapes-là, et lui en imposer une reviendrait à
     décrire un parcours qu'il n'a pas fait. Sa frise se saisit
     donc à la main, comme pour une conduite ordinaire.

     Les rendez-vous pédagogiques, eux, restent demandés en AAC :
     ils ont pu être faits dans l'autre auto-école, et c'est
     justement ce qu'on veut noter. */
  { cle:'Autre AE BV',      boite:'BV',  modele:'conduite-manuelle', frise:null },
  { cle:'Autre AE BEA',     boite:'BEA', modele:'conduite-auto',     frise:null },
  { cle:'AAC BV autre AE',  boite:'BV',  modele:'aac-manuelle', frise:null,
    aac:true, accompagnee:true },
  { cle:'AAC BEA autre AE', boite:'BEA', modele:'aac-auto',     frise:null,
    aac:true, accompagnee:true },
  { cle:'CS BV autre AE',   boite:'BV',  modele:'conduite-manuelle', frise:null,
    accompagnee:true },
  { cle:'CS BEA autre AE',  boite:'BEA', modele:'conduite-auto',     frise:null,
    accompagnee:true },
  /* B78 est le code porté sur un permis obtenu en boîte
     automatique : la passerelle mène au permis B, en manuelle.

     Elle n'a ni frise, ni examen blanc — l'élève a déjà son permis,
     il n'y a rien à blanchir — et l'écoute pédagogique du jour du
     permis n'a donc pas d'objet non plus. */
  /* On repart de zéro : la passerelle est une formation à elle
     seule, l'élève a déjà son permis. Ses leçons sont les seules
     qu'il ait faites en manuelle — il a passé le sien en
     automatique — et c'est ainsi qu'on les compte. */
  { cle:'Passerelle BEA→BV', boite:'BV', modele:'conduite-manuelle', frise:'',
    repartDeZero:true,
    sansObjet:['frise', 'examBlanc', 'examBlancN', 'examBlancRang', 'examBlancDate',
               'ebPasse', 'ebLecons', 'ebImpossibleLe', 'pasEcoute',
               'examPermis', 'examDate', 'examPermisN', 'nouvelleDate',
               'examPassage'] }
];

function parcoursDeLaFormation(formation){
  const t = normaliserMot(String(formation || ''));
  if(!t) return null;

  const exact = PARCOURS_FORMATION.find(p => normaliserMot(p.cle) === t);
  if(exact) return exact;

  /* « Conduite supervisée » sans boîte, saisi avant que les deux
     existent : on lui rend la boîte qu'on connaît par ailleurs. */
  if(/conduite supervisee/.test(t)) return { cle:'CS', suivreLaBoite:'cs', accompagnee:true };
  if(/passerelle/.test(t)){
    return PARCOURS_FORMATION.find(p => /passerelle/i.test(p.cle));
  }
  return null;
}

/* La frise qu'impose une formation : une clé de FRISES_FIXES, ou
   la chaîne vide quand ce parcours n'a pas de frise, ou null quand
   elle se saisit à la main. */
/* ------------------------------------------------------------
   RECONNAÎTRE UN PARCOURS AAC SANS SA FICHE

   Les rendez-vous pédagogiques n'existent qu'en conduite
   accompagnée. Une note qui en porte un dit donc le parcours de
   l'élève — même quand sa fiche au répertoire est restée vide, et
   c'est le cas le plus fréquent : on ne remplit pas une fiche pour
   un élève qu'on connaît.

   Axel avait ses deux RVP faits, et portait quand même une frise
   classique et « examen blanc pas encore évoqué ». Tout était écrit
   dans sa note ; personne ne le lisait.
   ------------------------------------------------------------ */
function estUnParcoursAac(q){
  if(!q) return false;
  if(q.rvp1 || q.rvp2) return true;
  if(/^AAC\b/i.test(String(q.frise || ''))) return true;
  const p = parcoursDeLaFormation(q.formation);
  return !!(p && p.aac);
}

/* La frise d'un AAC, dans la boîte de l'élève. La boîte se lit sur
   son bilan, ou à défaut sur ce que sa frise disait déjà. */
function friseAacDe(q){
  const indices = String((q && q.modele) || '') + ' ' + String((q && q.frise) || '');
  return FRISES_FIXES[/auto|bea/i.test(indices) ? 'aacbea' : 'aacbv'] || '';
}

/* Un rendez-vous pédagogique a-t-il eu lieu ?

   L'examen blanc de l'AAC se passe PENDANT le rendez-vous n°2. Une
   fois un rendez-vous fait, écrire « examen blanc pas encore
   évoqué » est faux : il a eu lieu, ou il n'y en aura pas. */
function rvpDejaFait(q){
  return !!(q && (q.rvp1 === 'fait' || q.rvp2 === 'fait'));
}

function friseDeLaFormation(formation, manuelle){
  const p = parcoursDeLaFormation(formation);
  if(!p) return null;
  if(p.suivreLaBoite === 'cs') return FRISES_FIXES[manuelle ? 'csbv' : 'csbea'];
  if(p.frise === null) return null;
  return p.frise ? FRISES_FIXES[p.frise] : '';
}

/* Aménagements possibles d'un véhicule adapté */
const AMENAGEMENTS = [
  { cle:'boule_g',  court:'🔘⬅️', nom:'Boule avec commande à gauche' },
  { cle:'boule_d',  court:'🔘➡️', nom:'Boule avec commande à droite' },
  { cle:'boule',    court:'🔘',   nom:'Boule simple' },
  { cle:'accel_g',  court:'🦶⬅️', nom:'Accélérateur à gauche' },
  { cle:'retros',   court:'🪞',   nom:'Rétroviseurs additionnels' }
];

function libelleAmenagement(cle){
  const a = AMENAGEMENTS.find(x => x.cle === cle);
  return a ? a.court + ' ' + a.nom : cle;
}

/* Ce que le questionnaire doit afficher selon le type de bilan.
   Sur simulateur, tout le reste se passe en voiture : seule la frise compte. */
const PROFILS_QUESTIONNAIRE = {
  'simu-manuelle': 'simulateur',
  'simu-auto': 'simulateur',
  'eval-manuelle': 'evaluation',
  'eval-auto': 'evaluation',
  'examen-officiel': 'examen',
  /* La fiche d'évaluation ne demande qu'une chose : combien de
     leçons avant de présenter l'élève à la préfecture. */
  'handicap': 'handicap'
};

function profilQuestionnaire(modeleCle){
  return PROFILS_QUESTIONNAIRE[modeleCle] || 'complet';
}

/* ------------------------------------------------------------
   QUEL CHAMP PORTE QUELLE RÉPONSE

   Un questionnaire ne pose pas toujours toutes ses questions :
   celui d'un examen officiel masque la leçon, la frise, l'examen
   blanc et le simulateur — ils ne le regardent pas.

   Mais la validation relisait TOUS les champs, masqués compris.
   Masqués, donc vides. Et ces vides étaient écrits par-dessus le
   parcours de l'élève : un cours d'examen effaçait la frise, le
   numéro de leçon et l'examen blanc que ses leçons avaient
   construits. Chrystel l'a vu sur Enzo — deux mois de suivi
   ramenés à « 2ème leçon · PAS DE DATE ».

   Cette table dit quel champ porte quelle réponse. Ce qui n'a pas
   été demandé garde ce qu'il valait.
   ------------------------------------------------------------ */
const CHAMP_DE_LA_REPONSE = {
  formation:     '#qFormation',
  lecon:         '#qLecon',
  /* Les deux réponses portées par la même case : le nombre de
     leçons avant la charnière ne s'écrit pas directement, il se
     déduit du second rang. Les déclarer ici, c'est empêcher un
     questionnaire qui ne pose pas la question d'effacer ce qu'on
     savait — la protection vaut pour ce qui se déduit comme pour
     ce qui se tape. */
  avantEB:       '#qLeconDepuis',
  avantRdvPost:  '#qLeconDepuis',
  avantExamRate: '#qLeconDepuis',
  frise:         '#qFriseClassique',
  examBlanc:     '#qExamBlanc',
  examBlancN:    '#qExamBlancN',
  examBlancRang: '#qBlocEbRang',
  examBlancDate: '#qExamBlancDate',
  ebPasse:       '#qEBPasse',
  ebNiveau:      '#qExamBlanc',
  heuresRestantes:'#qExamBlanc',
  ebImpossibleLe:'#qExamBlanc',
  ebLecons:      '#qEBLecons',
  examPermis:    '#qExamPermis',
  examDate:      '#qExamDate',
  examPermisN:   '#qExamPermisN',
  nouvelleDate:  '#qNouvelleDate',
  examPassage:   '#qExamPassage',
  pasEcoute:     '#qBlocEcoutes',
  /* Le poste de conduite manquait à cette table : masqué en fin de
     cours, il revenait vide et se décochait tout seul — et depuis
     qu'il vit sur la fiche, il s'y décochait pour de bon. */
  handicap:      '#qHandicap',
  amenagements:  '#qZoneHandicap',
  coussin:       '#qCoussin',
  simuNuit:      '#qSimuNuit',
  formAccomp:    '#qFormAccomp',
  rvPrealable:   '#qRvPrealable',
  rvp1:          '#qBlocAacCs',
  rvp2:          '#qBlocAacCs',
  prefecture:    '#qPrefecture',
  problematique: '#qProblematique'
};

/* Ce qu'un parcours n'a pas du tout.

   À ne pas confondre avec une question non posée : une question
   non posée garde sa réponse — l'examen officiel ne demande pas la
   frise, mais l'élève en a une. Une chose qui n'existe pas, elle,
   doit disparaître : une passerelle n'a pas d'examen blanc, et un
   « examen blanc passé » hérité d'une autre formation n'a rien à
   faire sur sa note. */
function sansObjetPourLaFormation(formation){
  const p = parcoursDeLaFormation(formation);
  return (p && p.sansObjet) || [];
}

/* Les réponses, complétées de ce que ce profil n'a pas demandé, et
   débarrassées de ce que ce parcours n'a pas.

   « avant » est l'état connu en ouvrant le questionnaire. */
function conserverLeNonDemande(reponses, avant, champsMasques, sansObjet){
  if(!reponses) return reponses;

  if(avant && champsMasques && champsMasques.length){
    Object.keys(CHAMP_DE_LA_REPONSE).forEach(cle => {
      if(champsMasques.indexOf(CHAMP_DE_LA_REPONSE[cle]) === -1) return;
      const v = avant[cle];
      if(v === undefined || v === null || v === '') return;
      reponses[cle] = v;
    });
  }

  /* Après, et jamais avant : ce que le parcours n'a pas sort, même
     si le profil venait de le remettre. */
  (sansObjet || []).forEach(cle => { reponses[cle] = ''; });

  return reponses;
}

/* contexteDepart : déclaré dans ec-etat.js */
/* noteQuestionnaire : déclaré dans ec-etat.js */
/* questionnaireOuvert : déclaré dans ec-etat.js */

/* Remplace la note du questionnaire sans écraser ce que le moniteur
   a écrit à la main à côté. */

/* Le bloc « Historique » ne s'affiche plus sur l'écran de cours :
   la note du moniteur précédent est déjà résumée sous le nom de
   l'élève. Le champ reste alimenté, il part avec le bilan. */
function majAffichageNoteInterne(){
  const bloc = $('blocNoteInterne');
  if(bloc) bloc.style.display = 'none';
}


/* ============================================================
   CE QUE LE QUESTIONNAIRE RÉÉCRIT À CHAQUE FOIS

   Une note héritée du cours précédent porte déjà l'examen, le
   simulateur, la frise… Le questionnaire vient de les redemander :
   garder les anciennes lignes faisait s'empiler deux dates
   d'examen et deux simulateurs dans la même note.

   Une famille par sujet, avec le motif qui la reconnaît. C'est la
   même liste qui sert à écrire et à nettoyer : ajouter un sujet
   sans le déclarer ici, et il s'empilerait à son tour — le test
   « test-note-questionnaire.js » le refuse.

   Le texte libre du moniteur et les messages du bureau n'y sont
   pas : eux, on ne les efface jamais. */
/* ------------------------------------------------------------
   LE GRAS DES NOTES

   Une note vit dans un tableur : elle ne peut porter aucune mise en
   forme. Le gras s'écrit donc en caractères Unicode, lettre par
   lettre. Les accents ne sont pas concernés — « É » n'a pas de
   forme grasse — d'où la décomposition : on met en gras la lettre
   nue et on lui rend son accent.

   Et surtout : ce qui a été mis en gras doit pouvoir être RELU.
   « 𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖 𝗣𝗔𝗦𝗦𝗘́ » n'est plus « Examen blanc passé » pour
   qui le cherche ; sans sansGras(), mettre un état en gras revenait
   à le rendre invisible à tout le reste de l'application.
   ------------------------------------------------------------ */
function grasNote(t){
  return String(t || '').normalize('NFD').split('').map(ch => {
    const c = ch.charCodeAt(0);
    if(c >= 65  && c <= 90)  return String.fromCodePoint(0x1D5D4 + (c - 65));
    if(c >= 97  && c <= 122) return String.fromCodePoint(0x1D5EE + (c - 97));
    if(c >= 48  && c <= 57)  return String.fromCodePoint(0x1D7EC + (c - 48));
    return ch;
  }).join('');
}

/* Les alphabets décoratifs d'Unicode, chacun rendu à ses lettres.
   Écrit ici plutôt qu'emprunté à ec-segments.js : tout le
   dédoublonnage des notes en dépend, et un module qui ne se charge
   pas ne doit pas faire échouer une note en silence. */
const BLOCS_GRAS = [0x1D400, 0x1D434, 0x1D468, 0x1D49C, 0x1D4D0, 0x1D504,
                    0x1D538, 0x1D56C, 0x1D5A0, 0x1D5D4, 0x1D608, 0x1D63C,
                    0x1D670];

function sansGras(t){
  return [...String(t || '')].map(ch => {
    const c = ch.codePointAt(0);
    for(let i = 0; i < BLOCS_GRAS.length; i++){
      const d = BLOCS_GRAS[i];
      if(c >= d && c < d + 26) return String.fromCharCode(65 + (c - d));
      if(c >= d + 26 && c < d + 52) return String.fromCharCode(97 + (c - d - 26));
    }
    /* Les chiffres décoratifs, sur le même principe */
    if(c >= 0x1D7CE && c <= 0x1D7FF) return String((c - 0x1D7CE) % 10);
    return ch;
  }).join('').normalize('NFC');
}

/* Les deux formes de la ligne d'examen officiel. Écrites ici une
   fois, reconnues à l'affichage pour la couleur — rouge quand la
   date existe, bleu sinon.

   Déclarées AVANT la table des familles, qui s'en sert : la purge
   ne reconnaissait pas la forme grasse de « PAS DE DATE » — seule
   celle d'« EXAMEN » figurait dans le motif — et cette ligne-là
   s'empilait à chaque bilan. */
const EXAMEN_PREVU = grasNote('EXAMEN OFFICIEL PRÉVU LE');
const EXAMEN_SANS_DATE = grasNote("PAS DE DATE D'EXAMEN OFFICIEL");

/* Les états qui décident de la suite, en gras eux aussi : ce sont
   ceux qu'on cherche d'un coup d'œil sur la carte du cours. La date
   qui les suit reste en écriture ordinaire — elle doit rester
   cherchable au Ctrl+F dans le classeur. */
const ETAT_EB_PASSE     = grasNote('EXAMEN BLANC PASSÉ');
const ETAT_EB_RESERVE   = grasNote('EXAMEN BLANC RÉSERVÉ');
const ETAT_EB_APREVOIR  = grasNote('EXAMEN BLANC À PRÉVOIR');
/* La formulation ne change pas : c'est celle que le lecteur de
   notes cherche pour comprendre qu'aucun examen blanc n'est prévu. */
const ETAT_EB_IMPOSSIBLE = grasNote("NE PAS PRÉVOIR D'EXAMEN BLANC");
/* Quand personne n'a rien dit. Une ligne quand même : sans elle on
   ne distingue pas « pas encore évoqué » de « sans objet ». */
const ETAT_EB_RIEN      = grasNote("EXAMEN BLANC PAS ENCORE ÉVOQUÉ");
const ETAT_SIMU         = grasNote('SIMULATEUR NUIT ET RISQUES');
const ETAT_RDV_POST     = grasNote('RDV POST-PERMIS');
const ETAT_REPASSAGE    = grasNote('REPASSAGE');

/* Le motif des lignes d'examen, construit à partir des libellés
   eux-mêmes : impossible qu'il en oublie un. */
const RE_FAMILLE_EXAMEN = new RegExp(
  '^(?:🚗\\s*)?(?:' +
  EXAMEN_PREVU.slice(0, 12) + '|' + EXAMEN_SANS_DATE.slice(0, 12) + '|' +
  "EXAMEN|PAS DE DATE|Examen (?:prévu|du permis)|Date d'examen" +
  ')', 'i');

/* Chaque famille dit aussi ce qui, chez elle, n'est qu'une
   intention. Une intention ne survit pas à côté d'une décision :
   « rendez-vous post-permis à prévoir » n'a plus lieu d'être une
   fois qu'on lit « rendez-vous post-permis le 19 août ». C'est ce
   qui empilait quatre lignes là où une seule disait tout. */
const FAMILLES_NOTE = [
  /* L'en-tête d'un cours — son heure, son 🆔, son 💾 — quand il
     s'est retrouvé dans le texte. Une famille, donc : régénérable,
     il ne se recopie plus d'une note à l'autre, et c'est ainsi
     qu'on lisait « 📌 🕐 15h00 · 📌 🕐 15h00 » au bas des cartes. */
  { cle:'entete',      motif:/^(?:🕐\s*\d{1,2}\s*[h:]\s*\d{0,2}|🆔|💾|\s)+$/ },
  { cle:'repassage',   motif:/^🔁\s*\d+\S*\s+repassage/i },
  { cle:'handicap',    motif:/^♿\s*Conduite aménagée/i },
  { cle:'coussin',     motif:/^🟩\s*Coussin vert/i },
  /* UNE seule famille pour la frise, classique ou AAC/CS. En
     faire deux les laissait cohabiter : un élève en AAC portait sa
     frise AAC ET une frise classique, l'une sous l'autre. Un élève
     n'a qu'un parcours. */
  { cle:'frise',       motif:/le[çc]ons? de 2h.*exam(?:en)? blanc|^(?:AAC|CS)\b/i },
  { cle:'problematique', motif:/^❓\s*Problématique/i },
  { cle:'prefecture',  motif:/^♿\s*(?:Encore .*préfecture|Prêt à être présenté)/i },
  { cle:'lecon',       motif:/^(?:🎯\s*)?\d+(?:ère|ere|ème|eme|e)\s+le[çc]on\b/i },
  { cle:'leconVide',   motif:/^❓\s*le[çc]ons/i },
  { cle:'friseEtat',   motif:/frise (?:dépassée|depassee|terminée|terminee)/i },
  { cle:'avantEB',     motif:/encore \d+\s+le[çc]ons?\s+avant/i },
  { cle:'examenBlanc', motif:/examen blanc/i, intention:/à\s*prévoir/i },
  { cle:'examenPermis', motif: RE_FAMILLE_EXAMEN, intention:/—\s*à\s*prévoir\s*$/i },
  { cle:'trois_h',     motif:/plus que les 3h avant examen/i },
  { cle:'ecoutes',     motif:/^Pas d'écoutes pédagogiques/i },
  { cle:'simuNuit',    motif:/simulateur nuit et risques/i, intention:/à\s*prévoir/i },
  { cle:'formAccomp',  motif:/^Formation accompagnateur/i, intention:/à\s*prévoir/i },
  { cle:'rvPrealable', motif:/^Rendez-vous préalable/i, intention:/à\s*prévoir/i },
  /* Les deux rendez-vous pédagogiques de l'AAC sont deux sujets
     distincts : les mettre dans une même famille ferait disparaître
     le n°1 dès que le n°2 est renseigné. */
  { cle:'rvp1', motif:/(?:rendez-vous pédagogique n°|RVP\s*)1\b/i, intention:/à\s*prévoir/i },
  { cle:'rvp2', motif:/(?:rendez-vous pédagogique n°|RVP\s*)2\b/i, intention:/à\s*prévoir/i },
  /* Le rendez-vous post-permis n'avait pas de famille : ses trois
     annonces — à prévoir, planifié, fait — s'écrivaient donc côte
     à côte sur la carte du moniteur. */
  { cle:'rdvPost',     motif:/(?:rdv|rendez-vous|bilan d'examen et rendez-vous)\s*post-?permis/i,
                       intention:/à\s*prévoir/i }
];

const SEGMENTS_REGENERES = FAMILLES_NOTE.map(f => f.motif);

/* Les segments d'une note. Le séparateur est « · », mais des
   retours à la ligne s'y glissent — collés, deux segments n'en
   font plus qu'un et échappent aux motifs, qui sont ancrés. */
function segmentsDeNote(note){
  return String(note || '')
    .split(/[·\n\r]+/)
    .map(x => x.trim())
    .filter(Boolean);
}

/* La famille d'un segment, gras défait d'abord.

   Les motifs cherchent « examen blanc », pas « 𝗲𝘅𝗮𝗺𝗲𝗻 𝗯𝗹𝗮𝗻𝗰 ».
   Sans ce passage, mettre un état en gras le faisait sortir de sa
   famille : il ne se dédoublonnait plus, et s'empilait. */
function familleDuSegment(seg){
  const clair = sansGras(seg);
  return FAMILLES_NOTE.find(f => f.motif.test(clair)) || null;
}

/* Ce segment n'est-il qu'une intention, dans sa famille ? */
function segmentEstUneIntention(seg, famille){
  return !!(famille && famille.intention && famille.intention.test(sansGras(seg)));
}

function retirerSegmentsRegeneres(note){
  return segmentsDeNote(note)
    .filter(x => !familleDuSegment(x))
    .join(' · ');
}

function appliquerNoteQuestionnaire(nouvelle){
  const champ = $('noteInterne');

  /* L'en-tête du cours — l'heure, le 🆔, le 💾 — appartient à la
     note AFFICHÉE. Celle que le questionnaire régénère n'en porte
     jamais : aller la chercher chez elle, c'était la trouver vide.
     L'heure redescendait alors dans le texte libre derrière un 📌,
     et un 📌 de plus s'ajoutait à chaque passage — deux appuis sur
     « Compléter les infos » et la note portait « 📌 📌 🕐 15h00 ».
     On la reprend là où elle est. */
  const affichee = morceauxDeNotePreparee(champ.value);
  let actuel = [affichee.corps, affichee.consigne].filter(Boolean).join('\n').trim();

  if(noteQuestionnaire && actuel.indexOf(noteQuestionnaire) !== -1){
    actuel = actuel.replace(noteQuestionnaire, '').replace(/^\s*·\s*|\s*·\s*$/g, '').trim();
  }

  /* Et tout ce qui vient d'une ouverture antérieure : une note
     héritée du cours précédent porte déjà sa frise, qui n'a plus
     lieu d'être puisqu'on vient d'en recalculer une. */
  actuel = retirerSegmentsRegeneres(actuel);

  /* Ce qui reste, ce sont des mots d'humains : ils vont derrière le
     📌, pas au bout de la ligne d'examen. La note s'écrit en blocs
     depuis qu'on la veut lisible d'un coup d'œil ; recoller le reste
     avec un « · » les aurait remis en pavé. */
  const dejaLa = nouvelle ? morceauxDeNotePreparee(nouvelle) : null;
  const consigne = [dejaLa && dejaLa.consigne, actuel].filter(Boolean).join(' · ');

  champ.value = nouvelle
    ? assemblerNotePreparee(affichee.entete || dejaLa.entete, dejaLa.corps, consigne)
    : assemblerNotePreparee(affichee.entete, actuel, '');
  majAffichageNoteInterne();

  noteQuestionnaire = nouvelle;
  if($('noteResult')) $('noteResult').value = champ.value;
  sauvegarderLocal(true);
}

/* Ferme le questionnaire à l'écran, quel qu'il soit. La promesse
   en attente se résout à « annulé » : le cours abandonné ne doit
   pas rester suspendu en mémoire. */
function fermerQuestionnaireOuvert(){
  document.querySelectorAll('.overlay.show').forEach(f => {
    if(!f.querySelector('#qLecon')) return;      /* pas un questionnaire */
    if(typeof f.__annuler === 'function'){
      try{ f.__annuler(); }catch(e){}
    }
    if(f.parentNode) f.parentNode.removeChild(f);
  });
  questionnaireOuvert = false;
}


/* Les blocs à laisser visibles selon ce qui manque. La table vit
   ici, dans la seule fonction qui s'en sert. */
function blocsDuSujetManquant(quoi){
  const T = {
    'la formation':        ['#qFormation', '#qFormationEffet'],
    'la frise':            ['#qFriseClassique', '#qFriseFixe'],
    'le numéro de leçon':  ['#qLecon', '#qLeconDepuis']
  };
  return T[quoi] || [];
}

async function ouvrirQuestionnaireDepart(prec, titre, libelleValider, reduire){
  /* Un questionnaire déjà ouvert appartient au cours précédent : on
     le ferme au lieu d'ignorer la demande. Ignorer laissait le
     moniteur devant l'ancien élève en croyant avoir ouvert le
     nouveau. */
  if(questionnaireOuvert) fermerQuestionnaireOuvert();
  questionnaireOuvert = true;
  /* Filet : le verrou ne doit jamais rester bloqué */
  const secours = setTimeout(() => { questionnaireOuvert = false; }, 30000);
  try{
    return await construireQuestionnaire(prec, titre, libelleValider, reduire);
  }catch(e){
    questionnaireOuvert = false;
    console.error('Questionnaire :', e);
    await informer('Le questionnaire n\'a pas pu s\'ouvrir.\n\nDétail : ' + (e && e.message ? e.message : e));
    return null;
  }finally{
    clearTimeout(secours);
  }
}

async function construireQuestionnaire(prec, titre, libelleValider, reduire){
  prec = prec || {};
  const eleve = $('studentName').value.trim();
  const modeleCle = $('modele').value;

  const profil = profilQuestionnaire(modeleCle);

  /* Les trois lectures partent ENSEMBLE. En série, le moniteur
     attendait la somme des trois délais ; en parallèle, il n'attend
     que la plus lente. */
  const fermerAttente = ouvrirAttente('Récupération du dossier…');
  let dossier = { frise:'', lecons:null, manoeuvres:[], marques:{},
                  derniereNote:'', dernierHorodatage:'' };
  let consignesBureau = [];
  try{
    const besoinFiches = (typeof chargerFiches === 'function') &&
      (typeof fichesEleves === 'undefined' || !fichesEleves.length);

    const [d, cd] = await Promise.all([
      chargerDossierEleve(eleve),
      consignesDe(eleve).catch(() => []),
      besoinFiches ? chargerFiches().catch(() => []) : Promise.resolve()
    ]);
    dossier = d || dossier;
    consignesBureau = (cd || [])
      .filter(x => x.traite !== 'oui' && x.type !== 'urgence');
  }catch(e){
    console.warn('Dossier partiellement indisponible :', e);
  }finally{
    fermerAttente();
  }

  /* Le moniteur a-t-il déjà répondu pendant ce cours ? Si oui, ses
     réponses priment sur tout : c'est lui qui vient de les saisir.

     « Porter un contexte » ne veut pas dire « avoir répondu ». Un
     cours créé par un rappel en porte un — leçon, frise, modèle,
     jeton — que personne n'a saisi. Compter ses clés faisait donc
     conclure « déjà répondu », et TOUT le pré-remplissage était
     sauté : le moniteur ouvrait le crayon sur un questionnaire vide,
     sans l'examen blanc ni la date d'examen, et devait tout
     ressaisir. Seule la marque posée à la validation fait foi, et la
     fonction qui la lit existe depuis toujours — elle n'était
     simplement pas appelée ici. */
  const dejaRepondu = questionnaireDejaRepondu(prec);

  if(!dejaRepondu){
    /* Trois sources, de la plus ancienne à la plus récente. Chacune
       recouvre la précédente là où elle dit quelque chose. */

    /* 1. L'état du dernier cours */
    let base = dossier.derniereNote ? defautsDepuisNote(dossier.derniereNote) : {};

    /* 2. Ce que le cours porte déjà : la leçon recalculée, la frise,
       le jeton du rappel. Posé après le dernier bilan, donc plus
       frais — et surtout, la seule source de la leçon du jour.

       Mais une valeur VIDE n'est pas une réponse : c'est la trace
       d'un questionnaire qui n'a pas posé la question. La recopier
       par-dessus ce que le dernier cours savait, c'est effacer une
       deuxième fois. */
    Object.keys(prec).forEach(k => {
      const v = prec[k];
      if(v === undefined || v === null || v === '') return;
      if(Array.isArray(v) && !v.length) return;
      base[k] = v;
    });

    /* 3. Les messages du bureau, plus récents que le dernier bilan.
       Une date qu'il vient de fixer doit apparaître dans le champ,
       pas seulement dans l'encadré vert. */
    if(consignesBureau.length){
      const duBureau = defautsDepuisNote(consignesBureau.map(x => x.texte).join(' · '));
      Object.keys(duBureau).forEach(k => {
        if(duBureau[k] !== undefined && duBureau[k] !== '') base[k] = duBureau[k];
      });
    }

    /* 4. Et par-dessus tout : ce que les sources qui font foi
       savent — le suivi pour les conclusions d'examen, les sessions
       pour la date. Elles ne se déduisent d'aucun texte. */
    const foi = etatQuiFaitFoi(eleve);
    Object.keys(foi).forEach(k => { base[k] = foi[k]; });

    prec = base;
  }else{
    /* Le questionnaire a déjà été rempli pour ce cours. Ses
       réponses restent celles du moniteur — mais le monde a pu
       bouger depuis : il arrive qu'un moniteur nous écrive PENDANT
       son cours pour faire poser un examen blanc ou un examen, et
       que le bureau le fasse dans la foulée. Rouvrir « Compléter
       les infos » doit le lui montrer.

       On ne reprend donc que ce qui a une SOURCE — le suivi, les
       sessions, un message du bureau — et seulement quand cette
       source dit quelque chose. Un silence ne recouvre rien : ce
       serait rendre au moniteur, sous forme de vide, la réponse
       qu'il vient de saisir. */
    prec = Object.assign({}, prec);

    if(consignesBureau.length){
      const duBureau = defautsDepuisNote(consignesBureau.map(x => x.texte).join(' · '));
      Object.keys(duBureau).forEach(k => {
        if(duBureau[k] !== undefined && duBureau[k] !== '') prec[k] = duBureau[k];
      });
    }

    const foi = etatQuiFaitFoi(eleve);
    Object.keys(foi).forEach(k => {
      const v = foi[k];
      if(v === undefined || v === null || v === '') return;
      if(Array.isArray(v) && !v.length) return;
      prec[k] = v;
    });
  }

  /* La frise saisie sur la fiche de l'élève fait autorité : elle a été
     posée une fois pour toutes, inutile de la redemander à chaque cours. */
  /* Une frise abîmée ne compte pas comme une frise : on repart
     alors de celle de la fiche, ou de rien. */
  if(typeof friseUtilisable === 'function') prec.frise = friseUtilisable(prec.frise);
  if(!prec.frise){
    const qui = ($('studentName') && $('studentName').value.trim()) ||
                ($('prepEleve') && $('prepEleve').value.trim()) || '';
    const fiche = (qui && typeof ficheDe === 'function') ? ficheDe(qui) : null;
    if(fiche && fiche.frise) prec.frise = fiche.frise;
  }

  const ficheEleve = (typeof ficheDe === 'function') ? ficheDe(eleve) : null;

  /* La formation du répertoire : c'est d'elle que tout découle
     désormais — la boîte, le type de bilan, la frise. */
  const formationDeLaFiche = (ficheEleve && String(ficheEleve.formation || '').trim()) || '';
  const manuelleDuBilan = !/auto/i.test(modeleCle);

  /* La frise qu'impose la formation, quand elle en impose une */
  const friseDeduite = friseDeLaFormation(formationDeLaFiche, manuelleDuBilan) ||
                       FRISES_FIXES[PARCOURS_PAR_TYPE[modeleCle] || ''] || '';

  /* L'ANTS vient de la fiche s'il n'a pas déjà été saisi dans ce cours :
     il est renseigné à l'inscription, pas à chaque leçon. */
  if(!prec.ants && ficheEleve && ficheEleve.ants) prec.ants = ficheEleve.ants;

  /* Le poste de conduite vient de la fiche, TOUJOURS : c'est là
     qu'il vit. Un cours ne le contredit que le temps de ce cours —
     et la réponse du questionnaire redescendra sur la fiche.

     Sans ça, décocher le coussin sur la fiche n'aurait servi à
     rien : le cours précédent l'aurait recoché indéfiniment. */
  if(ficheEleve){
    if(ficheEleve.amenagee !== undefined && ficheEleve.amenagee !== ''){
      prec.handicap = (String(ficheEleve.amenagee) === 'oui') ? 'oui' : '';
    }
    if(ficheEleve.coussin !== undefined && ficheEleve.coussin !== ''){
      prec.coussin = (String(ficheEleve.coussin) === 'oui') ? 'oui' : '';
    }
    /* Et QUELS aménagements : « conduite aménagée » sans le détail
       n'apprend rien au moniteur qui prépare la voiture. */
    if(ficheEleve.amenagements !== undefined && ficheEleve.amenagements !== ''){
      prec.amenagements = String(ficheEleve.amenagements)
        .split('|').map(x => x.trim()).filter(Boolean);
    }
  }

  /* Trois sources, de la plus sûre à la plus générale : la
     formation, le dernier cours, la fiche de l'élève. Sans ce
     dernier recours, un dossier momentanément indisponible faisait
     perdre une frise pourtant enregistrée. */
  /* Chaque source passe par le filtre : une frise à trous héritée
     d'un cours ancien ne doit pas remplir les cases à la place du
     moniteur. Mieux vaut deux cases vides qu'un « 2 » que
     personne n'a saisi. */
  const utilisable = f => (typeof friseUtilisable === 'function')
    ? friseUtilisable(f) : String(f || '');
  const frisePrecedente = friseDeduite || utilisable(dossier.frise) ||
                          utilisable(ficheEleve && ficheEleve.frise) || '';
  const compteDansLaFrise = leconCompteDansLaFrise(modeleCle);
  const faites = dossier.lecons;

  /* Le rappel de ce cours disait-il d'aller chercher sa carte SD ?
     C'est la seule chose qui permette d'affirmer « 1ère leçon » sur
     un élève sans bilan. Le contexte le porte depuis le rappel ; le
     💾 en tête de note vaut la même preuve pour les cours créés
     avant que le contexte le transporte. */
  const premierCours = cestLePremierCours(prec.premierCours) ||
                       cestLePremierCours(($('noteInterne') && $('noteInterne').value) || '');
  const rangDuJour = rangConnu(faites, modeleCle, premierCours);
  const manoeuvresAvant = dossier.manoeuvres || [];
  const totalManoeuvres = BLOC.ficheListeConduite.length;

  /* RIEN À DEMANDER : ON N'OUVRE RIEN.

     En préparant un cours d'un élève à jour, les quinze questions
     ont déjà leur réponse : la formation vient du répertoire, la
     frise de sa fiche, le rang du classeur. Ouvrir une fenêtre
     pour faire valider ce qu'on sait déjà, c'est du temps pris
     pour rien.

     On rend alors ce qu'on a réuni, sans marquer « répondu » :
     personne n'a répondu, et le jour du cours les sources qui font
     foi seront relues comme d'habitude. Le crayon de la carte
     reste la porte d'entrée quand le bureau veut poser quelque
     chose — une date d'examen, un examen blanc à réserver. */
  if(reduire && !cequiManqueAuCours(prec, eleve, modeleCle).length){
    /* Le verrou se relâche ici : il n'est levé nulle part ailleurs
       que par la fermeture de la fenêtre, et aucune fenêtre ne
       s'ouvre. Sans ça, le questionnaire suivant se croirait déjà
       ouvert. */
    questionnaireOuvert = false;
    return Promise.resolve(Object.assign({}, prec, { modele: modeleCle }));
  }

  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';

    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(560px, 94vw);max-height:88vh;overflow-y:auto;';

    const restantes = totalManoeuvres - manoeuvresAvant.length;
    boite.innerHTML =
      '<h3>' + (titre || 'Avant de démarrer') + '</h3>' +
      /* L'état de l'élève AVANT les questions : on vient ici pour
         savoir ce qui manque, pas pour relire quinze champs. */
      recapEnHtml(recapDuCours(prec, eleve, modeleCle, ficheEleve)) +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.5;">' +
        (eleve ? '<strong style="color:var(--cream);font-size:15px;">' + eleve + '</strong><br>' : '') +
        (profil === 'complet'
          ? '🦉 Manœuvres de la fiche véhicule : ' + manoeuvresAvant.length + ' sur ' + totalManoeuvres +
            ' validées' + (restantes ? ' — il en reste ' + restantes : ' — fiche terminée ✅') +
            (restantes
              ? '<details style="margin-top:8px;">' +
                  '<summary style="cursor:pointer;color:var(--accent-text);font-weight:600;">' +
                  'Voir les ' + restantes + ' manœuvres restantes</summary>' +
                  '<div id="qListeRestantes" style="margin-top:8px;padding:10px 12px;' +
                  'background:var(--navy);border:1px solid var(--line);border-radius:10px;' +
                  'font-size:14px;line-height:1.9;color:var(--cream);"></div>' +
                '</details>'
              : '')
          : (profil === 'simulateur' ? 'Séance sur simulateur — seule la frise est demandée ici.'
            : profil === 'evaluation' ? 'Évaluation de départ — la frise se définit en fin de séance.'
            : 'Examen officiel — note interne uniquement.')) +
        (consignesBureau.length
          ? '<div style="margin-top:10px;padding:10px 12px;background:rgba(182,255,14,.10);' +
            'border:1px solid var(--orange);border-radius:10px;color:var(--accent-text);' +
            'font-size:14px;font-weight:600;line-height:1.5;">📨 Message du bureau<br>' +
            consignesBureau.map(x => x.texte.replace(/&/g,'&amp;').replace(/</g,'&lt;')).join('<br>') +
            '</div>'
          : '') +
      '</div>' +

      /* LA FORMATION EN PREMIER.

         C'est elle qui décide de tout le reste — la boîte, le type
         de bilan, la frise, et jusqu'aux questions qui seront
         posées. La demander au milieu de l'écran, c'était faire
         corriger au moniteur des réponses qu'elle allait changer.

         Elle vient du répertoire et y retourne : une seule version
         de l'information, pas deux. */
      '<label for="qFormation">🎓 Formation</label>' +
      '<select id="qFormation" style="margin-bottom:6px;">' +
        toutesLesFormations()
          .filter(x => x.voiture || !x.cle)
          .map(x => '<option value="' + x.cle.replace(/"/g, '&quot;') + '">' +
                    x.nom.replace(/</g, '&lt;') + '</option>').join('') +
      '</select>' +
      '<div id="qFormationEffet" style="font-size:12px;color:var(--muted);' +
      'margin:-2px 0 14px;line-height:1.4;"></div>' +

      '<label for="qBoite">Boîte</label>' +
      '<select id="qBoite">' +
        '<option value="bea">BEA — boîte automatique</option>' +
        '<option value="bv">BV — boîte manuelle</option>' +
      '</select>' +

      '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;' +
        'color:var(--cream);margin-bottom:10px;">' +
        '<input type="checkbox" id="qHandicap" style="width:19px;height:19px;">' +
        '♿ Conduite aménagée</label>' +
      /* Le coussin : une contrainte de poste de conduite comme une
         autre, à connaître avant de monter dans la voiture. */
      '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;' +
        'color:var(--cream);margin-bottom:10px;">' +
        '<input type="checkbox" id="qCoussin" style="width:19px;height:19px;">' +
        '🟩 Coussin vert</label>' +

      '<div id="qZoneHandicap" style="display:none;padding:10px 12px;margin-bottom:14px;' +
        'background:var(--navy);border:1px solid var(--orange);border-radius:10px;">' +
        '<div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Aménagements du véhicule</div>' +
        AMENAGEMENTS.map(a =>
          '<label style="display:flex;align-items:center;gap:9px;text-transform:none;' +
          'font-size:15px;color:var(--cream);margin:0 0 7px;">' +
          '<input type="checkbox" class="qAmg" value="' + a.cle + '" style="width:18px;height:18px;">' +
          a.court + ' ' + a.nom + '</label>').join('') +
      '</div>' +

      /* Les coordonnées manquantes : demandées une seule fois, à
         celui qui a l'élève en face de lui. */
      '<div id="qBlocModele" style="display:none;">' +
        '<label for="qModele">📋 Type de bilan</label>' +
        '<select id="qModele"></select>' +
        '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;line-height:1.4;">' +
          'Ce que sera le cours. Modifiable tant que le cours n\'a pas eu lieu.</div>' +
      '</div>' +

      '<div id="qBlocCoord" style="display:none;">' +
        '<div style="font-size:12px;color:var(--warn-text);margin-bottom:8px;' +
          'line-height:1.4;font-weight:700;">' +
          '📇 Coordonnées manquantes — demande-les à l\'élève</div>' +

        /* Le Messenger de l'élève ne se demande plus ici : les
           bilans partent par mail, et c'est le mail qui manque
           quand il manque quelque chose. Le champ reste au
           répertoire pour ceux qui l'ont déjà. */

        '<div id="qBlocMail" style="display:none;">' +
          '<label for="qMail">✉️ Adresse mail de l\'élève</label>' +
          '<input type="email" id="qMail" inputmode="email" autocomplete="off" ' +
            'placeholder="prenom.nom@exemple.fr">' +
        '</div>' +

        '<div id="qBlocAnts" style="display:none;">' +
          '<label for="qAnts">📇 Dossier ANTS</label>' +
          '<select id="qAnts">' +
            '<option value="">— non renseigné —</option>' +
            '<option value="eleve">Fait par l\'élève</option>' +
            '<option value="nous">Fait par nous</option>' +
          '</select>' +
        '</div>' +

        '<div style="font-size:12px;color:var(--muted);margin:-4px 0 14px;line-height:1.4;">' +
        'Saisies ici, elles rejoignent sa fiche : tous les moniteurs les ' +
        'retrouveront, et son bilan pourra lui être envoyé.</div>' +
      '</div>' +

      '<div style="font-size:12px;color:var(--muted);margin:-8px 0 14px;line-height:1.4;">' +
      'Information interne, jamais reprise dans les notes ni dans le bilan.</div>' +

      /* Tout ce que la fiche d'évaluation ne demande pas tient
         dans ce bloc : un seul masquage suffit. */
      '<div id="qBlocSauf">' +

      '<label>Frise de formation</label>' +

      '<div id="qFriseClassique" style="background:var(--navy);border:1px solid var(--line);' +
      'border-radius:10px;padding:12px;margin-bottom:6px;font-size:15px;line-height:2;">' +
        '<input type="text" id="qFriseAvant" inputmode="numeric" maxlength="2" ' +
        'style="width:52px;display:inline-block;margin:0 4px 0 0;padding:7px;text-align:center;font-size:16px;">' +
        ' leçons de 2h + exam blanc +' +
        '<input type="text" id="qFriseApres" inputmode="numeric" maxlength="2" ' +
        'style="width:52px;display:inline-block;margin:0 4px;padding:7px;text-align:center;font-size:16px;">' +
        ' leçons de 2h <span id="qFriseHeures" style="color:var(--accent-text);font-weight:700;"></span>' +
        ' + 3h avant examen' +
      '</div>' +
      '<div id="qFriseFixe" style="display:none;background:var(--navy);border:1px solid var(--line);' +
      'border-radius:10px;padding:11px 12px;font-size:14px;line-height:1.5;margin-bottom:6px;"></div>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:14px;line-height:1.4;">' +
      'Laisse vide si la frise n\'est pas encore déterminée.</div>' +

      /* DEUX CASES, DEUX FAITS.

         Le total est celui de Drivup. Le second — combien depuis
         l'examen blanc ou le post-permis — ne s'en déduit pas chez
         les élèves qui conduisaient avant l'outil : leur classeur
         ne porte pas leurs premières leçons, et leur frise n'a pas
         été suivie à la lettre. La phrase en dessous montre ce que
         les deux chiffres produisent, pour qu'un chiffre pris pour
         l'autre se voie tout de suite. */
      '<div id="qBlocLecon">' +
        '<div class="duo">' +
          '<div><label for="qLecon">C\'est la ...ème leçon</label>' +
            '<input type="text" id="qLecon" inputmode="numeric" placeholder="—">' +
          '</div>' +
          '<div id="qBlocDepuis" style="display:none;">' +
            '<label for="qLeconDepuis" id="qLibDepuis">et la ...ème après</label>' +
            '<input type="text" id="qLeconDepuis" inputmode="numeric" placeholder="—">' +
          '</div>' +
        '</div>' +
        '<div id="qLeconEffet" style="font-size:12px;color:var(--muted);' +
          'margin:-6px 0 12px;line-height:1.45;"></div>' +
      '</div>' +

      /* Tout l'examen blanc dans un seul bloc : une passerelle n'en
         a pas, et il doit pouvoir disparaître d'un coup. */
      '<div id="qBlocExamBlanc">' +
      '<label>Examen blanc</label>' +
      '<div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
        'margin-bottom:10px;">' +
        ['', 'aprevoir', 'reserve', 'passe', 'impossible'].map(function(v, i){
          const nom = ['— non évoqué —', 'À prévoir', 'Réservé', 'Déjà passé',
                       'Non planifiable pour le moment'][i];
          return '<label style="display:flex;align-items:center;gap:9px;padding:4px 0;' +
            'text-transform:none;font-size:15px;color:var(--cream);margin:0;font-weight:400;">' +
            '<input type="radio" name="qExamBlancChoix" value="' + v + '"' +
            (v === '' ? ' checked' : '') +
            ' style="width:18px;height:18px;flex-shrink:0;">' + nom + '</label>';
        }).join('') +
      '</div>' +

      '<div id="qBlocEbRang" style="display:none;">' +
        '<label for="qExamBlancRang">Quel examen blanc ?</label>' +
        '<select id="qExamBlancRang">' +
          '<option value="">— non précisé —</option>' +
          '<option value="1">1er</option>' +
          '<option value="2">2e</option>' +
          '<option value="3">3e</option>' +
          '<option value="4">4e</option>' +
          '<option value="5">5e</option>' +
        '</select>' +
      '</div>' +

      '<div id="qBlocEbDate" style="display:none;">' +
        '<label for="qExamBlancDate">Date de l\'examen blanc</label>' +
        '<input type="date" id="qExamBlancDate">' +
      '</div>' +

      '<input type="text" id="qExamBlancN" inputmode="numeric" placeholder="Dans combien de leçons ?" style="display:none;">' +

      /* La conclusion se donne à la FIN de l'examen blanc, pas au
         départ : elle n'a rien à faire dans le questionnaire
         d'ouverture. */
      (modeleCle === 'examen-blanc' && !/^Avant/i.test(String(titre || ''))
        ? '<label for="qEBPasse">Conclusion de l\'examen blanc</label>' +
          '<select id="qEBPasse">' +
            '<option value="">— à renseigner —</option>' +
            '<option value="3h">✅ Plus que les 3h avant examen</option>' +
            '<option value="lecons">⏳ Encore des leçons avant examen</option>' +
            '<option value="pasleniveau">⛔ Pas le niveau</option>' +
          '</select>' +
          '<input type="text" id="qEBLecons" inputmode="numeric" ' +
          'placeholder="Combien de leçons avant l\'examen ?" style="display:none;">'
        : '') +
      '</div>' +

      /* Tout l'examen officiel dans un seul bloc : une passerelle
         n'y mène pas, et il doit pouvoir disparaître d'un coup. */
      '<div id="qBlocExamPermis">' +
      '<label for="qExamPermis">Examen du permis</label>' +
      '<select id="qExamPermis">' +
        '<option value="">— pas de date —</option>' +
        '<option value="aprevoir">Date à prévoir</option>' +
        '<option value="prevu">Prévu le…</option>' +
        '<option value="annule">Annulé</option>' +
        /* L'ÉLÈVE QUI REVIENT.

           Chrystel : « j'ai le cas d'un élève qui reprend sa
           conduite après un examen de décembre 2025 ». Aucun des
           choix ne le disait : « Prévu le 12/12/2025 » écrivait
           EXAMEN PRÉVU sur une date passée et le remettait dans les
           permis à venir ; « à prévoir » effaçait le fait qu'il en
           avait déjà passé un. */
        '<option value="passe">Déjà passé — ajourné</option>' +
        '<option value="nonplanifiable">Non planifiable</option>' +
      '</select>' +
      '<input type="text" id="qExamMotif" style="display:none;" ' +
      'placeholder="Pourquoi ? (facultatif — ANTS, dossier, médical…)">' +
      '<div id="qLibExamDate" style="display:none;font-size:12px;color:var(--muted);margin:-8px 0 4px;"></div>' +
      '<input type="date" id="qExamDate" style="display:none;">' +
      '<div id="qBlocPassage" style="display:none;">' +
        '<label for="qExamPassage">Quel passage ?</label>' +
        '<select id="qExamPassage">' +
          '<option value="">— non précisé —</option>' +
          '<option value="1">1er passage</option>' +
          '<option value="2">2e passage</option>' +
          '<option value="3">3e passage</option>' +
          '<option value="4">4e passage</option>' +
          '<option value="5">5e passage ou plus</option>' +
        '</select>' +
      '</div>' +
      '<input type="text" id="qExamPermisN" inputmode="numeric" ' +
      'placeholder="Leçons restantes avant l\'examen" style="display:none;">' +
      '<div id="qLibNouvelleDate" style="display:none;font-size:12px;color:var(--muted);margin:-8px 0 4px;">' +
      'Nouvelle date (laisse vide si en attente)</div>' +
      '<input type="date" id="qNouvelleDate" style="display:none;">' +
      '</div>' +

      '<label id="qBlocEcoutes" style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;color:var(--cream);margin-bottom:14px;">' +
        '<input type="checkbox" id="qPasEcoute" style="width:20px;height:20px;">' +
        "Pas d'écoutes pédagogiques" +
      '</label>' +

      '<label for="qSimuNuit">Simulateur nuit et risques</label>' +
      '<select id="qSimuNuit">' +
        '<option value="">— non évoqué —</option>' +
        '<option value="aprevoir">À prévoir</option>' +
        '<option value="prevu">Déjà prévu</option>' +
        '<option value="fait">Fait ✅</option>' +
      '</select>' +

      
      '<div id="qBlocAacCs" style="display:none;">' +
        '<label for="qFormAccomp">Formation accompagnateur</label>' +
        '<select id="qFormAccomp">' +
          '<option value="">— non évoquée —</option>' +
          '<option value="aprevoir">À prévoir</option>' +
          '<option value="prevue">Déjà prévue</option>' +
          '<option value="faite">Déjà faite</option>' +
        '</select>' +
        '<label for="qRvPrealable">Rendez-vous préalable</label>' +
        '<select id="qRvPrealable">' +
          '<option value="">— non évoqué —</option>' +
          '<option value="aprevoir">À prévoir</option>' +
          '<option value="prevu">Déjà prévu</option>' +
          '<option value="fait">Déjà fait</option>' +
        '</select>' +

        /* Les deux rendez-vous pédagogiques n'existent qu'en AAC :
           la conduite supervisée n'en a pas. Ils jalonnent l'année
           entre le rendez-vous préalable et l'examen — c'est au
           second que se joue l'examen blanc. */
        '<div id="qRvpAilleurs" style="display:none;font-size:12px;' +
          'color:var(--muted);line-height:1.5;margin:-4px 0 10px;">' +
          "Cet élève vient d'une autre auto-école : indique « Déjà fait » " +
          'pour ce qui a été fait là-bas.' +
        '</div>' +

        '<div id="qBlocRvp" style="display:none;">' +
          '<label for="qRvp1">Rendez-vous pédagogique n°1' +
          '<span style="text-transform:none;font-weight:400;color:var(--muted);">' +
          ' — environ 6 mois après le préalable</span></label>' +
          '<select id="qRvp1">' +
            '<option value="">— non évoqué —</option>' +
            '<option value="aprevoir">À prévoir</option>' +
            '<option value="prevu">Déjà prévu</option>' +
            '<option value="fait">Déjà fait</option>' +
          '</select>' +
          '<label for="qRvp2">Rendez-vous pédagogique n°2' +
          '<span style="text-transform:none;font-weight:400;color:var(--muted);">' +
          ' — environ 10 mois après, ou 2 mois avant ses 17 ans</span></label>' +
          '<select id="qRvp2">' +
            '<option value="">— non évoqué —</option>' +
            '<option value="aprevoir">À prévoir</option>' +
            '<option value="prevu">Déjà prévu</option>' +
            '<option value="fait">Déjà fait</option>' +
          '</select>' +
          '<div style="font-size:12px;color:var(--muted);margin:-6px 0 14px;' +
          'line-height:1.4;">L\'examen blanc se passe pendant le rendez-vous ' +
          'pédagogique n°2. Ne le renseigne au-dessus que s\'il faut en ' +
          'prévoir un à part, parce que l\'élève n\'avait pas le niveau ce ' +
          'jour-là.</div>' +
        '</div>' +
      '</div>' +

      '</div>' +

      /* La fiche véhicule : présente au DÉPART, pour préparer et
         cocher ce qui est acquis. Masquée en fin de cours, où le
         moniteur a déjà coché sur l'écran d'enregistrement.

         HORS du bloc masquable : une évaluation de départ n'a pas
         de frise ni d'examen à renseigner, mais elle a tout à
         apprendre des manœuvres déjà faites ailleurs. Laissée
         dedans, elle disparaissait avec le reste. */
      '<div id="qBlocFiche" style="display:none;">' +
        '<label>🦉 Fiche véhicule — coche ce qui est acquis</label>' +
        '<div style="font-size:11px;color:var(--muted);margin:-8px 0 8px;line-height:1.4;">' +
          'Les manœuvres déjà validées sont cochées. Celles que tu ajoutes seront ' +
          'signées de ton émoji.<br>' +
          'La colonne 🚗 est pour un élève repris d\'une autre auto-école : ' +
          'ce qu\'il y a déjà fait porte 🚗, pas ton émoji.</div>' +
        '<div id="qFiche" style="background:var(--navy);border:1px solid var(--line);' +
          'border-radius:10px;padding:10px 12px;max-height:240px;overflow-y:auto;' +
          'margin-bottom:14px;"></div>' +
      '</div>' +

      /* Hors du bloc masqué : les deux questions que la fiche
         d'évaluation conserve. */
      '<div id="qBlocPrefecture" style="display:none;">' +
        '<label for="qProblematique">Problématique</label>' +
        '<textarea id="qProblematique" rows="3" maxlength="400" ' +
          'placeholder="Ce qui amène cette évaluation"></textarea>' +
        '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;' +
          'line-height:1.5;">Reprise de ses notes : à compléter ou ' +
          'corriger.</div>' +

        '<label for="qPrefecture">Leçons avant présentation à la préfecture</label>' +
        '<input type="number" id="qPrefecture" min="0" inputmode="numeric" ' +
          'placeholder="—">' +
        '<div style="font-size:11px;color:var(--muted);margin:-8px 0 10px;' +
          'line-height:1.5;">Combien de leçons lui faut-il encore ?</div>' +
      '</div>' +

      '<label for="qLibre">Vos autres notes</label>' +
      '<textarea id="qLibre" rows="3" maxlength="400" ' +
      'placeholder="Ex : autre notes importante" ' +
      'style="width:100%;background:var(--navy);border:1px solid var(--line);color:var(--cream);' +
      'padding:11px 12px;border-radius:10px;font-size:15px;line-height:1.5;font-family:inherit;' +
      'resize:vertical;margin-bottom:6px;"></textarea>';

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';
    const passer = document.createElement('button');
    passer.className = 'btn btn-secondary';
    /* « Annuler » plutôt que « Passer » : le bouton ferme sans rien
       enregistrer, il ne saute pas une étape. */
    passer.textContent = 'Annuler';
    const valider = document.createElement('button');
    valider.className = 'btn btn-primary';
    valider.textContent = libelleValider || 'Démarrer';
    rangee.appendChild(passer);
    rangee.appendChild(valider);
    boite.appendChild(rangee);
    fond.appendChild(boite);
    document.body.appendChild(fond);

    /* Pré-remplissage */
    const chAvant = boite.querySelector('#qFriseAvant');
    const chApres = boite.querySelector('#qFriseApres');
    const chHeures = boite.querySelector('#qFriseHeures');

    const selForm = boite.querySelector('#qFormation');
    const effetForm = boite.querySelector('#qFormationEffet');
    /* La fiche d'évaluation n'a pas de frise : la chercher la
       ferait réapparaître après son masquage. */
    const surFiche = (profil === 'handicap');
    const zoneClassique = surFiche ? null : boite.querySelector('#qFriseClassique');
    const zoneFixe = surFiche ? null : boite.querySelector('#qFriseFixe');

    const blocAacCs = boite.querySelector('#qBlocAacCs');

    /* Ce que ce profil ne demande pas. Gardé hors du bloc : c'est
       lui qui dira, à la validation, ce qu'il ne faut pas écraser. */
    let champsMasques = [];

    /* Adaptation au profil : on retire ce qui ne concerne pas ce type de cours */
    if(profil !== 'complet'){
      const aMasquer = (profil === 'handicap')
        /* La fiche d'évaluation : tout part, sauf les leçons
           avant la préfecture. */
        ? ['#qLecon', '#qLeconDepuis', '#qExamBlanc', '#qExamBlancN', '#qExamPermis',
           '#qExamDate', '#qExamPermisN', '#qNouvelleDate', '#qLibExamDate',
           '#qLibNouvelleDate', '#qFinirFiche', '#qSimuNuit', '#qBlocAacCs',
           '#qFriseClassique', '#qFriseFixe', '#qFormation', '#qFormationEffet', '#qBlocEcoutes',
           '#qBlocEbDate', '#qBlocEbRang', '#qExamBlancDate', '#qEBPasse',
           '#qEBLecons', '#qFormAccomp', '#qRvPrealable', '#qExamPassage']
        : (profil === 'examen')
        ? ['#qLecon', '#qLeconDepuis', '#qExamBlanc', '#qExamBlancN', '#qFinirFiche',
           '#qSimuNuit', '#qBlocAacCs', '#qFriseClassique', '#qFriseFixe']
        : ['#qLecon', '#qLeconDepuis', '#qExamBlanc', '#qExamBlancN', '#qExamPermis', '#qExamDate',
           '#qExamPermisN', '#qNouvelleDate', '#qLibExamDate', '#qLibNouvelleDate',
           '#qFinirFiche', '#qSimuNuit', '#qBlocAacCs'];

      champsMasques = aMasquer;

      aMasquer.forEach(sel => {
        const el = boite.querySelector(sel);
        if(!el) return;
        /* On masque aussi l'étiquette qui précède le champ */
        const lab = boite.querySelector('label[for="' + sel.slice(1) + '"]');
        if(lab) lab.style.display = 'none';
        const parent = el.closest('label');
        if(parent) parent.style.display = 'none';
        else el.style.display = 'none';
      });
    }

    /* ----------------------------------------------------------
       LE QUESTIONNAIRE RÉDUIT

       En préparant un cours, quatorze des quinze questions ont
       déjà leur réponse. On ne montre donc que ce qui manque —
       mais un repli rend tout le reste en un clic : le bureau
       vient souvent poser quelque chose qui ne « manque » pas,
       une date d'examen, un examen blanc à réserver. Sans ce
       repli, on aurait remplacé « trop de questions » par
       « impossible de répondre ».

       Ce qu'on masque est DÉCLARÉ, comme partout : un champ caché
       revient vide du formulaire, et sans déclaration ce vide
       écraserait la réponse qu'on avait.
       ---------------------------------------------------------- */
    if(reduire){
      const aVoir = [];
      cequiManqueAuCours(prec, eleve, modeleCle)
        .forEach(q => blocsDuSujetManquant(q).forEach(x => aVoir.push(x)));

      const tous = Object.keys(CHAMP_DE_LA_REPONSE)
        .map(k => CHAMP_DE_LA_REPONSE[k])
        .filter((x, i, t) => t.indexOf(x) === i);

      const aReplier = tous.filter(x => aVoir.indexOf(x) === -1);
      const caches = [];

      aReplier.forEach(sel => {
        const el = boite.querySelector(sel);
        if(!el) return;
        const cible = (el.type === 'checkbox' && el.closest('label'))
          ? el.closest('label') : el;
        const lab = boite.querySelector('label[for="' + sel.slice(1) + '"]');
        const avant = cible.previousElementSibling;
        [cible, lab, (avant && avant.tagName === 'LABEL') ? avant : null]
          .forEach(x => { if(x){ x.dataset.replie = '1'; x.style.display = 'none'; } });
        caches.push(sel);
      });

      champsMasques = champsMasques.concat(caches);

      const bTout = document.createElement('button');
      bTout.type = 'button';
      bTout.className = 'btn btn-secondary';
      bTout.style.cssText = 'margin:2px 0 14px;padding:10px;font-size:13px;';
      bTout.textContent = '▸ Tout revoir (examen blanc, date d\'examen, simulateur…)';
      bTout.addEventListener('click', () => {
        boite.querySelectorAll('[data-replie]').forEach(x => {
          x.style.display = '';
          delete x.dataset.replie;
        });
        /* Déplié, plus rien n'est masqué : les réponses redeviennent
           celles du formulaire, et la protection n'a plus lieu
           d'être — la garder figerait ce qu'on vient d'ouvrir. */
        champsMasques = champsMasques.filter(x => caches.indexOf(x) === -1);
        bTout.remove();
      });
      boite.insertBefore(bTout, boite.querySelector('.btn-row'));
    }

    /* La formation choisie ici, ou celle du répertoire à défaut */
    function formationChoisie(){
      return (selForm && selForm.value) || formationDeLaFiche;
    }

    /* La frise imposée par la formation. Rend '' quand ce parcours
       n'en a pas (la passerelle), null quand elle se saisit. */
    function friseImposee(){
      return friseDeLaFormation(formationChoisie(), manuelleDuBilan);
    }

    /* ----------------------------------------------------------
       CE QU'ON NE SAIT PAS N'EFFACE PAS CE QU'ON SAVAIT

       Deux champs du questionnaire s'ouvrent pré-remplis depuis le
       dossier de l'élève : sa frise et son numéro de leçon. Quand
       le dossier n'a pas pu être relu — Apps Script lent, réseau
       coupé, cache vide — ils s'ouvrent vides. Le moniteur, lui,
       ne le voit pas : il répond à SES questions, valide, et
       l'enregistrement écrivait ces deux vides par-dessus une
       frise et un rang parfaitement connus.

       D'où les deux plaintes des moniteurs : la frise « qui n'est
       pas persistante » et le numéro de leçon « pas forcément
       persistant ». Ce n'était pas de l'oubli, c'était de
       l'écrasement.

       La règle est la même que pour les questions non posées : un
       champ vide n'est pas une réponse. On retombe alors sur ce
       que le questionnaire savait en s'ouvrant.
       ---------------------------------------------------------- */
    function friseSaisie(){
      const f = composerFrise(chAvant ? chAvant.value : '',
                              chApres ? chApres.value : '');
      return f || prec.frise || frisePrecedente || '';
    }

    function leconSaisie(){
      const champ = boite.querySelector('#qLecon');
      const v = champ ? champ.value.trim() : '';
      if(v) return v;
      /* Un examen, un simulateur : le rang y est vide EXPRÈS, et le
         garder serait décaler la frise. */
      if(!seanceDeLaFrise()) return '';
      return String(prec.lecon || (rangDuJour !== null ? rangDuJour : '') || '');
    }

    function majParcours(){
      /* La fiche d'évaluation n'a pas de frise : sans ce garde-fou,
         l'appel plantait et laissait le reste affiché. */
      if(!zoneClassique || !zoneFixe) return;

      const fixe = friseImposee();

      if(fixe){
        /* Une frise toute faite : on la montre, on ne la demande pas */
        zoneClassique.style.display = 'none';
        zoneFixe.style.display = 'block';
        zoneFixe.textContent = fixe;
      }else if(fixe === ''){
        /* Ce parcours n'a pas de frise du tout — la passerelle.
           Demander deux nombres qui n'existent pas, c'est inviter
           à en inventer. */
        zoneClassique.style.display = 'none';
        zoneFixe.style.display = 'none';
      }else{
        zoneClassique.style.display = 'block';
        zoneFixe.style.display = 'none';
      }

      /* FORMATION ACCOMPAGNATEUR ET RDV PRÉALABLE : LA FORMATION
         LE DIT, PAS LA FRISE.

         Ce bloc s'affichait quand la frise était imposée — ce qui
         revenait au même tant que seules l'AAC et la CS d'ici
         avaient une frise toute faite. Les formations « autre AE »
         ont cassé le raccourci : elles sont bien de l'AAC ou de la
         CS, mais leur frise se saisit à la main, et le bloc
         disparaissait avec elle. Un élève en AAC venu d'ailleurs
         n'aurait jamais eu ses rendez-vous pédagogiques.

         C'est le parcours qui décide, comme partout ailleurs. */
      const parcoursChoisi = parcoursDeLaFormation(formationChoisie());
      if(blocAacCs && profil === 'complet'){
        blocAacCs.style.display =
          (parcoursChoisi && parcoursChoisi.accompagnee) ? 'block' : 'none';
      }

      /* Les rendez-vous pédagogiques, eux, n'existent qu'en AAC */
      const blocRvp = boite.querySelector('#qBlocRvp');
      if(blocRvp){
        blocRvp.style.display =
          (parcoursChoisi && parcoursChoisi.aac && profil === 'complet')
            ? 'block' : 'none';
      }

      /* Venu d'ailleurs : ses rendez-vous ont pu être faits là-bas,
         et c'est exactement ce qu'on lui demande de noter. */
      const ailleurs = boite.querySelector('#qRvpAilleurs');
      if(ailleurs){
        ailleurs.style.display =
          (parcoursChoisi && parcoursChoisi.accompagnee &&
           /autre AE/i.test(parcoursChoisi.cle || '')) ? 'block' : 'none';
      }

      if(profil === 'examen'){
        zoneClassique.style.display = 'none';
        zoneFixe.style.display = 'none';
      }

      masquerCeQueLeParcoursNaPas();

      /* Dire ce que le choix entraîne, plutôt que de le faire en
         silence : le moniteur voit la boîte et le bilan changer. */
      if(effetForm){
        const p = parcoursDeLaFormation(formationChoisie());
        const cleM = p && p.modele;
        const lib = (cleM && typeof MODELES !== 'undefined' && MODELES[cleM])
          ? MODELES[cleM].label : '';
        const sans = sansObjetPourLaFormation(formationChoisie());
        const bouts = [];
        if(lib) bouts.push('Bilan : ' + lib);
        if(fixe === '') bouts.push('pas de frise');
        if(sans.indexOf('examBlanc') !== -1) bouts.push("pas d'examen blanc");
        effetForm.textContent = bouts.join(' · ');
      }
    }

    /* Ce que ce parcours n'a pas ne se demande pas.

       Une passerelle n'a pas d'examen blanc — l'élève a déjà son
       permis — et l'écoute pédagogique du jour du permis n'a donc
       pas d'objet non plus. Poser la question, c'est inviter à y
       répondre, et une réponse de trop finit toujours sur la note.

       Le masquage suit la liste « sansObjet » du parcours, il ne la
       double pas : ajouter un élément là-bas suffit ici. */
    const BLOCS_DU_CHAMP = {
      examBlanc:  ['#qBlocExamBlanc'],
      pasEcoute:  ['#qBlocEcoutes'],
      /* Une passerelle ne mène à aucun examen : l'élève a déjà son
         permis. Demander une date qui n'existera jamais, c'est
         inviter à en poser une. */
      examPermis: ['#qBlocExamPermis']
    };

    function masquerCeQueLeParcoursNaPas(){
      const sans = sansObjetPourLaFormation(formationChoisie());

      Object.keys(BLOCS_DU_CHAMP).forEach(cle => {
        const cache = sans.indexOf(cle) !== -1;
        BLOCS_DU_CHAMP[cle].forEach(sel => {
          const el = boite.querySelector(sel);
          if(!el) return;
          /* On retient l'affichage d'origine : « qBlocEcoutes » est
             une étiquette en flex, la remettre à « block » la
             casserait. */
          if(el.dataset.affichage === undefined){
            el.dataset.affichage = el.style.display || '';
          }
          el.style.display = cache ? 'none' : el.dataset.affichage;
        });
      });
    }

    /* Ce que le répertoire dit déjà : la liste s'ouvre dessus. À
       défaut, ce que la frise du dernier cours laisse deviner —
       une fiche jamais renseignée ne doit pas effacer un parcours
       que les notes connaissent. */
    if(selForm){
      let choix = formationDeLaFiche;
      if(!choix){
        const base = utilisable(prec.frise) || frisePrecedente || '';
        if(/^AAC /i.test(base)) choix = manuelleDuBilan ? 'AAC BV' : 'AAC BEA';
        else if(/^CS /i.test(base)) choix = manuelleDuBilan ? 'CS BV' : 'CS BEA';
      }
      if(choix && [...selForm.options].some(o => o.value === choix)){
        selForm.value = choix;
      }
      selForm.addEventListener('change', () => {
        majParcours();
        suivreLaBoite();
        suivreLeModele();
      });
    }
    majParcours();

    /* Le type de bilan suit la formation — mais seulement pour les
       leçons de conduite. Un simulateur, un examen blanc ou un
       rendez-vous post-permis restent ce qu'ils sont, quelle que
       soit la formation de l'élève : ils ne disent pas la même
       chose que son parcours.

       On ne le fait qu'au changement, jamais à l'ouverture : ouvrir
       un questionnaire ne doit rien modifier tant que personne n'a
       rien dit. */
    /* La boîte suit la formation : « AAC BV » se conduit en
       manuelle, et la passerelle aussi — malgré le « BEA » de son
       nom. C'est la table qui le sait, pas le libellé. */
    function suivreLaBoite(){
      const p = parcoursDeLaFormation(formationChoisie());
      const champ = boite.querySelector('#qBoite');
      if(!p || !p.boite || !champ) return;
      const v = (p.boite === 'BEA') ? 'bea' : (p.boite === 'BV') ? 'bv' : '';
      if(v && [...champ.options].some(o => o.value === v)) champ.value = v;
    }

    function suivreLeModele(){
      const p = parcoursDeLaFormation(formationChoisie());
      if(!p || !p.modele) return;

      const dansLaFenetre = boite.querySelector('#qModele');
      const champ = (dansLaFenetre && dansLaFenetre.offsetParent !== null)
        ? dansLaFenetre : $('modele');
      if(!champ || !champ.value) return;

      if(!leconCompteDansLaFrise(champ.value)) return;
      if(champ.value === p.modele) return;
      if(![...champ.options].some(o => o.value === p.modele)) return;

      champ.value = p.modele;
      if(champ !== dansLaFenetre && typeof adapterAuModele === 'function'){
        adapterAuModele();
      }
    }

    if(chAvant){
      const base = utilisable(prec.frise) || frisePrecedente;
      const av = leconsAvantExamenBlanc(base);
      const ap = leconsApresExamenBlanc(base);
      /* Ce que la frise dit, et RIEN d'autre.

         Ce champ proposait 2 tout seul quand il ne savait pas —
         « presque toujours 2 leçons après l'examen blanc ». Mais
         il ne sait pas surtout quand le dossier n'a pas pu être
         relu : le moniteur ouvrait alors un questionnaire portant
         une frise inventée, l'enregistrait sans y toucher — ce
         n'est pas son travail de la ressaisir — et la vraie frise
         de l'élève était remplacée par « 2 leçons après ». C'est
         la frise qui « retombait à 2 ». */
      chAvant.value = av !== null ? av : '';
      chApres.value = ap !== null ? ap : '';

      const majHeures = () => {
        const b = chApres.value.trim();
        chHeures.textContent = b ? '(' + (parseInt(b, 10) * 2) + 'h)' : '';
      };
      chApres.addEventListener('input', majHeures);
      majHeures();
    }

    /* Examen blanc, simulateur, examen officiel : ces séances ne
       comptent pas dans la frise. Leur donner un numéro de leçon
       décalait tout le reste. */
    const zLecon = boite.querySelector('#qBlocLecon');
    if(zLecon && !seanceDeLaFrise()){
      zLecon.style.display = 'none';
      boite.querySelector('#qLecon').value = '';
    }else{
      boite.querySelector('#qLecon').value =
        prec.lecon || ((rangDuJour !== null) ? rangDuJour : '');
    }

    boite.querySelector('#qPasEcoute').checked = !!prec.pasEcoute;
    boite.querySelector('#qSimuNuit').value = prec.simuNuit || '';
    boite.querySelector('#qFormAccomp').value = prec.formAccomp || '';
    boite.querySelector('#qRvPrealable').value = prec.rvPrealable || '';
    ['qRvp1', 'qRvp2'].forEach((id, i) => {
      const el = boite.querySelector('#' + id);
      if(el) el.value = prec['rvp' + (i + 1)] || '';
    });
    boite.querySelector('#qLibre').value = prec.libre || '';

    /* Le point demandé par le bureau, en tête du questionnaire :
       c'est ce que le moniteur doit faire pendant ce cours. */
    if(typeof mentionFairePoint === 'function'){
      const pt = mentionFairePoint(($('studentName') &&
                                    $('studentName').value.trim()) || '');
      if(pt){
        const l = document.createElement('div');
        l.style.cssText = 'border:1px solid var(--orange);border-radius:10px;' +
          'padding:10px 12px;margin-bottom:14px;font-size:13px;' +
          'color:var(--warn-text);line-height:1.5;';
        l.textContent = pt + ' — le bureau attend ton retour.';
        boite.insertBefore(l, boite.children[1] || null);
      }
    }

    /* En fin de cours, le moniteur a déjà coché pendant qu'il
       conduisait : lui remontrer la liste n'apporte rien. */
    const enFinDeCours = /après ce cours|terminer|fin/i.test(String(titre || ''));

    /* La fiche d'évaluation ne garde que sa question et les notes
       libres. Ce masquage vient en dernier : posé plus haut, il
       se faisait défaire par les réglages qui suivent. */
    {
      const surEval = (profil === 'handicap');

      /* L'évaluation, AU DÉPART : on ne demande ni frise, ni leçon,
         ni examen, ni écoutes, ni simulateur — tout cela se décide
         en fin de séance, une fois l'élève vu au volant. Restent
         les coordonnées, les manœuvres et les notes libres.

         En FIN de séance, le questionnaire reprend tout : c'est
         justement là que la frise se fixe. */
      const evalAuDepart = (profil === 'evaluation') && !enFinDeCours;

      const sauf = boite.querySelector('#qBlocSauf');
      if(sauf) sauf.style.display = (surEval || evalAuDepart) ? 'none' : '';

      if(surEval){
        const bf = boite.querySelector('#qBlocFiche');
        if(bf) bf.style.display = 'none';
      }

      const zp = boite.querySelector('#qBlocPrefecture');
      if(zp) zp.style.display = surEval ? 'block' : 'none';
    }

    /* La fiche véhicule, pré-cochée d'après les bilans précédents */
    const marquesConnues = dossier.marques || {};
    const blocFiche = boite.querySelector('#qBlocFiche');
    if(blocFiche){
      /* La fiche d'évaluation ne concerne pas le véhicule */
      const surFiche = (profil === 'handicap');
      blocFiche.style.display = (enFinDeCours || surFiche) ? 'none' : 'block';
    }

    remplirFicheQuestionnaire(marquesConnues, prec.manoeuvresAjoutees || [],
                              prec.manoeuvresAilleurs || []);
    boite._marquesConnues = marquesConnues;

    /* Après le cours : on n'affiche que ce qui peut avoir changé */
    /* Le questionnaire de fin masque encore d'autres champs. Il
       DIT lesquels : un champ masqué que personne ne déclare est
       relu vide à la validation, et écrase la vraie réponse. C'est
       comme ça que les rendez-vous pédagogiques et l'écoute
       disparaissaient en fin de cours. */
    if(/après ce cours/i.test(titre || '')){
      champsMasques = champsMasques.concat(allegerQuestionnaireFin(boite, prec) || []);
    }

    /* Boîte déduite du type de bilan, ANTS repris s'il est connu.
       Chaque champ est vérifié : certains profils de questionnaire
       n'en affichent qu'une partie, et un accès à un champ absent
       interrompait toute la suite de la construction. */
    const chBoite = boite.querySelector('#qBoite');
    if(chBoite) chBoite.value = prec.boite || (/auto/i.test(modeleCle) ? 'bea' : 'bv');
    const chAnts = boite.querySelector('#qAnts');
    if(chAnts) chAnts.value = prec.ants || '';

    /* Chaque coordonnée n'est demandée QUE si elle manque : les
       redemander alors qu'elles sont connues ne sert qu'à les
       effacer par inadvertance. */
    /* Le type de bilan : affiché seulement quand on prépare un cours */
    const selMod = boite.querySelector('#qModele');
    const blocMod = boite.querySelector('#qBlocModele');
    const enPreparation = /préparation/i.test(String(titre || ''));
    if(blocMod) blocMod.style.display = enPreparation ? 'block' : 'none';
    if(selMod && enPreparation){
      selMod.innerHTML = Object.keys(MODELES)
        .map(k => '<option value="' + k + '">' +
                  (MODELES[k].label || k) + '</option>').join('');
      selMod.value = modeleCle;
    }

    const champMail = boite.querySelector('#qMail');

    const manque = {
      mail:      !((ficheEleve && ficheEleve.email) || ''),
      ants:      !((ficheEleve && ficheEleve.ants) || '') && !prec.ants
    };

    const montrer = (id, oui) => {
      const b = boite.querySelector(id);
      if(b) b.style.display = oui ? 'block' : 'none';
    };
    montrer('#qBlocMail', manque.mail);
    montrer('#qBlocAnts', manque.ants);
    /* L'encadré entier disparaît si tout est déjà renseigné */
    /* Le mail du prescripteur se saisit au répertoire uniquement :
       c'est une donnée de dossier, pas quelque chose qu'on demande
       à l'élève au bord de la route. */
    montrer('#qBlocCoord', manque.mail || manque.ants);

    if(champMail) champMail.value = prec.email || '';

    /* Conduite aménagée */
    const cbH = boite.querySelector('#qHandicap');
    const znH = boite.querySelector('#qZoneHandicap');
    const dejaAmg = prec.amenagements || [];
    cbH.checked = (prec.handicap === 'oui') || dejaAmg.length > 0;
    boite.querySelectorAll('.qAmg').forEach(x => {
      x.checked = dejaAmg.indexOf(x.value) !== -1;
    });
    const majH = () => { znH.style.display = cbH.checked ? 'block' : 'none'; };
    cbH.addEventListener('change', majH);
    majH();

    /* Le coussin, repris du cours précédent */
    const cbC = boite.querySelector('#qCoussin');
    if(cbC) cbC.checked = (prec.coussin === 'oui');

    /* Manœuvres qui restent à faire — affichage seul */
    const zoneRestantes = boite.querySelector('#qListeRestantes');
    if(zoneRestantes){
      const dejaFaites = manoeuvresAvant.map(normaliserMot);
      const restantesListe = BLOC.ficheListeConduite
        .filter(m => dejaFaites.indexOf(normaliserMot(m)) === -1);
      zoneRestantes.textContent = restantesListe.join(' · ');
    }

    /* Champs conditionnels — l'examen blanc se choisit par cases */
    const casesEB = boite.querySelectorAll('input[name="qExamBlancChoix"]');
    const nEB = boite.querySelector('#qExamBlancN');
    const rangEB = boite.querySelector('#qExamBlancRang');
    const blocRang = boite.querySelector('#qBlocEbRang');
    const dateEB = boite.querySelector('#qExamBlancDate');
    const blocDate = boite.querySelector('#qBlocEbDate');
    nEB.value = prec.examBlancN || '';
    if(rangEB) rangEB.value = prec.examBlancRang || '';
    if(dateEB) dateEB.value = prec.examBlancDate || '';

    const valeurEB = () => {
      const coche = boite.querySelector('input[name="qExamBlancChoix"]:checked');
      return coche ? coche.value : '';
    };

    casesEB.forEach(x => {
      if(x.value === (prec.examBlanc || '')) x.checked = true;
      x.addEventListener('change', majEB);
    });

    /* La fiche d'évaluation montre sa question, et elle seule.

       Les blocs englobants se masquent ici : le mécanisme par
       profil ne touche que les champs et leurs étiquettes. */
    const zPref = boite.querySelector('#qBlocPrefecture');
    if(zPref){
      const surFicheEval = (profil === 'handicap');
      zPref.style.display = surFicheEval ? 'block' : 'none';

      if(surFicheEval){
        boite.querySelector('#qPrefecture').value = prec.prefecture || '';

        /* La problématique reprend ce que ses notes en disent :
           le moniteur complète plutôt que de tout retaper. */
        const zp2 = boite.querySelector('#qProblematique');
        if(zp2){
          zp2.value = prec.problematique || problematiqueConnue();
        }


      }
    }

    /* Un examen blanc se passe aujourd'hui, par définition : le
       demander n'apprend rien. Et « dans combien de leçons » ne
       veut rien dire pour la séance en cours. */
    if(($('modele') && $('modele').value) === 'examen-blanc'){
      casesEB.forEach(x => { x.checked = (x.value === 'passe'); });

      if(dateEB && !dateEB.value){
        dateEB.value = ($('lessonDate') && $('lessonDate').value) || todayLocal();
      }

      /* Le rang se déduit de ceux déjà passés : aucun avant, donc
         c'est le premier. */
      if(rangEB && !rangEB.value){
        const n = examensBlancsPasses();
        rangEB.value = String(Math.min(n + 1, 5));
      }
    }

    function majEB(){
      const v = valeurEB();
      /* Sur un examen blanc du jour, la question n'a pas d'objet :
         c'est la leçon en cours. */
      const cejour = (($('modele') && $('modele').value) === 'examen-blanc');
      nEB.style.display = (!cejour &&
        (v === 'reserve' || v === 'aprevoir' || v === 'passe')) ? 'block' : 'none';
      nEB.placeholder = (v === 'passe')
        ? 'Leçons prévues avant le permis'
        : 'Dans combien de leçons ?';
      /* Le rang n'a de sens que si un examen blanc est en jeu */
      if(blocRang) blocRang.style.display = v ? 'block' : 'none';
      /* La date : seulement s'il est réservé ou déjà passé */
      if(blocDate) blocDate.style.display = (v === 'reserve' || v === 'passe') ? 'block' : 'none';
    }

    /* Un objet qui se comporte comme l'ancien menu, pour le reste du code */
    const selEB = { get value(){ return valeurEB(); },
                    dispatchEvent: majEB };

    /* Affiche d'emblée les champs conditionnels déjà renseignés.
       Placé ICI et non plus haut : un await sépare les deux, et le
       minuteur se déclenchait avant que majEB n'existe, ce qui
       interrompait toute la construction de la fenêtre. */
    setTimeout(() => {
      try{
        majEB();
        if(selEP) selEP.dispatchEvent(new Event('change'));
      }catch(e){ console.warn('Champs conditionnels :', e); }
    }, 0);

    const selEP = boite.querySelector('#qExamPermis');
    const passEP = boite.querySelector('#qExamPassage');
    /* Renseigné ici, où le champ existe : plus haut, il n'était pas
       encore déclaré et l'accès interrompait toute la construction. */
    if(passEP) passEP.value = prec.examPassage || '';
    const dEP = boite.querySelector('#qExamDate');
    selEP.value = prec.examPermis || '';
    dEP.value = prec.examDate || '';

    /* Sa place dans une session vaut date d'examen : sans cela,
       le moniteur devait aller la chercher ailleurs. */
    if(!dEP.value){
      const place = dateDepuisSession();
      if(place){
        dEP.value = place;
        if(!selEP.value) selEP.value = 'prevu';
      }
    }
    /* ----------------------------------------------------------
       LA DEUXIÈME CASE : DEPUIS LA CHARNIÈRE

       Elle n'existe que si une charnière est derrière nous — avant
       cela, le rang d'après n'a aucun sens et une case de plus ne
       serait qu'une case de plus. Elle prend le nom de la
       charnière la plus récente : dire « depuis l'examen blanc »
       à un élève qui a fait son post-permis serait faux.
       ---------------------------------------------------------- */
    const charniere = (function(){
      /* La charnière la plus récente, demandée aux sources qui font
         foi : un post-permis vit dans le suivi, pas dans le
         contexte du cours. Sans elles, la case disait « après
         l'examen blanc » à un élève qui l'a dépassé depuis. */
      const su = Object.assign({}, prec,
        (typeof etatQuiFaitFoi === 'function') ? etatQuiFaitFoi(eleve) : {});
      /* Un examen déjà passé prime : c'est le dernier repère de son
         parcours, et c'est celui à partir duquel Chrystel veut
         compter — « la charnière est l'examen lui-même, RDV
         post-permis ou pas ». */
      /* On garde ce repère même une fois la nouvelle date posée :
         le bureau qui l'inscrit en session fait repasser examPermis
         à « prévu », et sans cette seconde condition le décompte
         serait retombé sur l'examen blanc d'il y a un an. */
      if(su.examPermis === 'passe' || su.avantExamRate){
        return { cle: 'avantExamRate', nom: "l'examen ajourné" };
      }
      if(su.rdvPostFait === 'oui'){
        return { cle: 'avantRdvPost', nom: 'le post-permis' };
      }
      if(su.examBlanc === 'passe' || su.ebPasse){
        return { cle: 'avantEB', nom: "l'examen blanc" };
      }
      return null;
    })();

    const chDepuis = boite.querySelector('#qLeconDepuis');
    const zEffet = boite.querySelector('#qLeconEffet');

    /* « 1ère », pas « 1ème » : la terminaison suit le nombre, et
       elle le suit aussi quand on le change. */
    const majLibs = () => {
      const l1 = boite.querySelector('label[for="qLecon"]');
      const ch1 = boite.querySelector('#qLecon');
      if(l1 && ch1) l1.textContent = "C'est la " + suffixeRang(ch1.value) + ' leçon';
      const lib = boite.querySelector('#qLibDepuis');
      if(lib && charniere){
        lib.textContent = 'et la ' + suffixeRang(chDepuis ? chDepuis.value : '') +
                          ' après ' + charniere.nom;
      }
    };
    ['#qLecon', '#qLeconDepuis'].forEach(x => {
      const el = boite.querySelector(x);
      if(el) el.addEventListener('input', majLibs);
    });

    if(charniere && seanceDeLaFrise()){
      const bloc = boite.querySelector('#qBlocDepuis');
      if(bloc) bloc.style.display = '';
      /* Pré-rempli avec ce que l'outil sait en déduire : le
         corriger est un geste, le retaper à chaque cours en serait
         un autre. */
      const dejaSu = rangDepuisLaCharniere(
        prec, parseInt(boite.querySelector('#qLecon').value, 10), charniere.cle);
      if(dejaSu !== null && chDepuis) chDepuis.value = dejaSu;
    }
    majLibs();

    /* CE QUE LES DEUX CHIFFRES PRODUISENT, EN DIRECT.

       C'est le garde-fou : quelqu'un qui lit « 3ÈME LEÇON APRÈS
       L'EXAMEN BLANC » sur la carte et tape 3 dans le total voit
       aussitôt la phrase se contredire. */
    const majEffetLecon = () => {
      if(!zEffet) return;
      const tot = parseInt(boite.querySelector('#qLecon').value, 10);
      const dep = chDepuis ? parseInt(chDepuis.value, 10) : NaN;

      if(!tot){ zEffet.textContent = ''; return; }
      if(charniere && !isNaN(dep) && dep > tot){
        zEffet.innerHTML = '<span style="color:var(--red);font-weight:700;">' +
          'Impossible : ' + dep + ' depuis ' + charniere.nom +
          ', pour ' + tot + ' leçons en tout.</span>';
        return;
      }
      /* friseImposee(), et non la variable « imposee » : celle-là
         est calculée à la validation, dans une autre portée. Une
         fonction se demande d'où l'on veut ; une variable, non. */
      const impose = friseImposee();
      const essai = Object.assign({}, prec, {
        lecon: String(tot), modele: modeleCle,
        frise: (impose !== null) ? impose : friseSaisie(),
        examBlanc: selEB ? selEB.value : prec.examBlanc
      });
      if(charniere && !isNaN(dep)){
        essai[charniere.cle] = avantLaCharniere(tot, dep);
      }
      const p = positionDansLaFrise(essai);
      zEffet.innerHTML = p
        ? '→ ' + String(p).replace(/^🎯\s*/, '').replace(/</g, '&lt;')
        : 'Toutes ses leçons de conduite depuis le début. ' +
          "L'examen blanc n'en est pas une.";
    };
    ['#qLecon', '#qLeconDepuis'].forEach(x => {
      const el = boite.querySelector(x);
      if(el) el.addEventListener('input', majEffetLecon);
    });
    majEffetLecon();

    /* Le nombre de leçons ne se demande que si l'examen blanc en appelle */
    const selEB2 = boite.querySelector('#qEBPasse');
    const nEB2 = boite.querySelector('#qEBLecons');
    if(selEB2 && nEB2){
      selEB2.value = prec.ebPasse || '';
      nEB2.value = prec.ebLecons || '';
      const majEB2 = () => {
        nEB2.style.display = (selEB2.value === 'lecons') ? 'block' : 'none';
      };
      selEB2.addEventListener('change', majEB2);
      setTimeout(majEB2, 0);
    }

    const nEP = boite.querySelector('#qExamPermisN');
    const nvDate = boite.querySelector('#qNouvelleDate');
    const libDate = boite.querySelector('#qLibExamDate');
    const libNv = boite.querySelector('#qLibNouvelleDate');
    nEP.value = prec.examPermisN || '';
    nvDate.value = prec.nouvelleDate || '';

    selEP.addEventListener('change', () => {
      const v = selEP.value;
      const avecDate = (v === 'prevu' || v === 'annule' || v === 'passe');

      dEP.style.display = avecDate ? 'block' : 'none';
      libDate.style.display = avecDate ? 'block' : 'none';
      libDate.textContent = (v === 'annule')
        ? "Date à laquelle l'examen était prévu"
        : (v === 'passe')
        ? "Date de l'examen déjà passé"
        : "Date de l'examen";
      /* Pas de date du jour pour un examen annulé ni pour un examen
         déjà passé : la leur est derrière nous, et la proposer
         reviendrait à la faire dire au moniteur. */
      if(v === 'prevu' && !dEP.value) dEP.value = todayLocal();

      nEP.style.display = (v === 'prevu') ? 'block' : 'none';
      /* Le rang du passage n'a de sens que pour un examen à venir */
      const bp = boite.querySelector('#qBlocPassage');
      if(bp) bp.style.display = (v === 'prevu' || v === 'aprevoir') ? 'block' : 'none';
      nvDate.style.display = (v === 'annule') ? 'block' : 'none';
      libNv.style.display = (v === 'annule') ? 'block' : 'none';

      /* Non planifiable : ni date, ni décompte de leçons — c'est le
         dossier qui bloque, pas le niveau. On demande seulement
         pourquoi, pour que le bureau sache quoi débloquer. */
      const motif = boite.querySelector('#qExamMotif');
      if(motif) motif.style.display = (v === 'nonplanifiable') ? 'block' : 'none';
    });

    /* Pour qu'une ouverture concurrente puisse fermer celui-ci
       proprement, au lieu de le retirer du document en laissant la
       promesse suspendue. */
    fond.__annuler = () => {
      questionnaireOuvert = false;
      resolve(null);
    };

    function fermer(reponses){
      questionnaireOuvert = false;
      if(fond.parentNode) document.body.removeChild(fond);

      /* La marque de « quelqu'un y a répondu », posée ici et nulle
         part ailleurs : c'est le seul endroit par où passe une
         réponse humaine. Un cours préparé tout seul — par un rappel,
         par une attribution d'examen blanc — porte bien un contexte,
         mais personne ne l'a rempli : son questionnaire reste à
         poser au moniteur, pré-rempli de ce qu'on savait déjà. */
      /* Ce que ce profil n'a pas demandé garde sa valeur : un
         questionnaire n'efface jamais une réponse qu'il n'a pas
         posée. Ce que le parcours n'a pas, en revanche, sort. */
      conserverLeNonDemande(reponses, prec, champsMasques,
                            sansObjetPourLaFormation(formationChoisie()));

      if(reponses) reponses.repondu = 1;
      /* L'ANTS et la frise redescendent sur la fiche de l'élève : ce que
         le moniteur corrige ici doit valoir pour les prochains cours,
         sans qu'on ait à ressaisir la même chose au bureau. */
      if(reponses) majFicheDepuisQuestionnaire(eleve, reponses, ficheEleve);

      resolve(reponses);
    }

    passer.addEventListener('click', () => fermer(null));
    valider.addEventListener('click', () => {
      /* Les consignes du bureau rejoignent la note et sont marquées traitées */
      consignesBureau.forEach(x => {
        appelPrep({ action: 'consigneDone', id: x.id }).catch(() => {});
      });
      /* La frise suit la formation : imposée quand le parcours en
         impose une, vide quand ce parcours n'en a pas (passerelle),
         saisie à la main sinon. */
      const imposee = friseImposee();

      fermer({
        source: dossier.dernierHorodatage || '',
        consignes: consignesBureau.map(x => x.texte),
        /* Ce que le moniteur a choisi retourne au répertoire */
        formation: formationChoisie(),
        frise: (imposee !== null) ? imposee : friseSaisie(),
        lecon: leconSaisie(),
        /* CE QU'IL Y AVAIT AVANT LA CHARNIÈRE.

           Ce n'est pas le rang d'après qu'on garde — il vieillirait
           d'une leçon à l'autre — mais le nombre de leçons faites
           AVANT, qui ne bougera plus jamais. Écrit une fois, il
           calera tous les cours suivants de cet élève. */
        avantEB: (function(){
          const v = charniere && charniere.cle === 'avantEB' && chDepuis
            ? avantLaCharniere(leconSaisie(), chDepuis.value) : '';
          return v || prec.avantEB || '';
        })(),
        avantRdvPost: (function(){
          const v = charniere && charniere.cle === 'avantRdvPost' && chDepuis
            ? avantLaCharniere(leconSaisie(), chDepuis.value) : '';
          return v || prec.avantRdvPost || '';
        })(),
        avantExamRate: (function(){
          const v = charniere && charniere.cle === 'avantExamRate' && chDepuis
            ? avantLaCharniere(leconSaisie(), chDepuis.value) : '';
          return v || prec.avantExamRate || '';
        })(),
        /* Ce que le classeur ne sait pas dire de cet élève, et la
           seule preuve qu'on ait qu'il débute. La note en a besoin
           pour choisir entre « 1ère leçon » et « il faut remplir le
           questionnaire ». */
        sansBilan: !rangDuJour && !leconSaisie(),
        premierCours: premierCours ? 'oui' : '',
        /* Un rang tapé ici est de la même eau que celui tapé sur la
           carte : une main humaine, d'après Drivup. Le recomptage
           ne doit pas davantage repasser derrière. */
        leconMain: (function(){
          const c = boite.querySelector('#qLecon');
          const tape = c ? c.value.trim() : '';
          if(tape && tape !== String(rangDuJour || '')) return 'oui';
          return prec.leconMain || '';
        })(),
        examBlanc: selEB.value,
        examBlancN: nEB.value.trim(),
        examBlancRang: rangEB ? rangEB.value : '',
        examBlancDate: dateEB ? dateEB.value : '',
        /* « Ne pas prévoir d'examen blanc » : on retient QUAND ça a
           été décidé. La date ne bouge plus tant que la réponse ne
           change pas — sinon elle dirait toujours « aujourd'hui »,
           et ne dirait donc plus rien. */
        ebImpossibleLe: (selEB.value === 'impossible')
          ? (prec.ebImpossibleLe ||
             ($('lessonDate') && $('lessonDate').value) || todayLocal())
          : '',
        examPermis: selEP.value,
        examMotif: ((boite.querySelector('#qExamMotif') || {}).value || '').trim(),
        examDate: dEP.value,
        pasEcoute: boite.querySelector('#qPasEcoute').checked,
        simuNuit: boite.querySelector('#qSimuNuit').value,
        prefecture: (boite.querySelector('#qPrefecture') || {}).value || '',
        problematique: ((boite.querySelector('#qProblematique') || {}).value || '').trim(),
        ebPasse: selEB2 ? selEB2.value : '',
        ebLecons: nEB2 ? nEB2.value.trim() : '',
        /* Les heures avant permis remontent au bureau, qui en a
           besoin pour placer les dates. */
        heuresRemontees: (function(){
          const suite = selEB2 ? selEB2.value : '';
          if(suite === '3h') return '0';
          if(suite === 'lecons' && nEB2) return nEB2.value.trim();
          return '';
        })(),
        examPermisN: nEP.value.trim(),
        examPassage: passEP ? passEP.value : '',
        nouvelleDate: nvDate.value,
        formAccomp: boite.querySelector('#qFormAccomp').value,
        rvPrealable: boite.querySelector('#qRvPrealable').value,
        rvp1: ((boite.querySelector('#qRvp1') || {}).value || ''),
        rvp2: ((boite.querySelector('#qRvp2') || {}).value || ''),
        boite: boite.querySelector('#qBoite').value,
        handicap: boite.querySelector('#qHandicap').checked ? 'oui' : '',
        coussin: boite.querySelector('#qCoussin').checked ? 'oui' : '',
        amenagements: Array.prototype.slice
          .call(boite.querySelectorAll('.qAmg:checked')).map(x => x.value),
        ants: chAnts ? chAnts.value : '',
        /* Le type de bilan choisi, quand on prépare un cours */
        modele: (selMod && enPreparation) ? selMod.value : '',
        /* Le Messenger ne se saisit plus au questionnaire : ce
           qu'on en savait traverse quand même, pour ne pas
           l'effacer de la fiche de ceux qui en ont un. */
        messenger: prec.messenger || '',
        email: champMail ? champMail.value.trim() : '',
        libre: boite.querySelector('#qLibre').value.trim(),
        /* Les manœuvres cochées en plus, à signer de l'émoji du moniteur */
        manoeuvresAjoutees: manoeuvresAjouteesQuestionnaire(boite._marquesConnues || {}),
        /* Celles faites avant d'arriver chez nous, à signer 🚗 */
        manoeuvresAilleurs: manoeuvresAilleursQuestionnaire(boite._marquesConnues || {}),
        leconsFaites: faites,
        manoeuvresFaites: manoeuvresAvant.length,
        totalManoeuvres: totalManoeuvres,
        /* Où il en est dans sa moitié de frise : relu, jamais saisi */
        leconsDepuisEB: dossier.leconsDepuisEB,
        leconsDepuisRdvPost: dossier.leconsDepuisRdvPost,
        leconsParBoite: dossier.leconsParBoite,
        /* Le rendez-vous post-permis n'est pas une question posée au
           moniteur : c'est le bureau qui le pose et le conclut. On
           le fait donc voyager tel qu'on l'a lu, sans quoi il
           disparaîtrait de la note au premier questionnaire. */
        /* La conclusion d'un examen blanc n'est pas une question de
           ce questionnaire-ci : elle vient du bureau ou de la séance
           d'examen blanc elle-même. Elle traverse. */
        ebNiveau: prec.ebNiveau || '',
        heuresRestantes: prec.heuresRestantes || '',
        rdvPostAPrevoir: prec.rdvPostAPrevoir || '',
        rdvPostDate: prec.rdvPostDate || '',
        rdvPostMoniteur: prec.rdvPostMoniteur || '',
        rdvPostFait: prec.rdvPostFait || '',
        heuresRepassage: prec.heuresRepassage || '',
        /* Ce que le cours porte et que le questionnaire ne demande
           jamais : le jeton du rappel en tête. Sans lui, « Mes
           prochains cours » ne sait plus dire si le rappel est parti
           ni si l'élève a confirmé — et il suffisait d'ouvrir le
           crayon une fois pour le perdre. */
        jeton: prec.jeton || '',
        rdvPost: prec.rdvPost || '',
        /* La carte SD demandée au rappel : la preuve que ce cours
           EST le premier. Elle ne se redemande nulle part, et la
           perdre remettrait « il faut remplir le questionnaire »
           sur un élève dont on sait justement qu'il débute. */
        premierCours: prec.premierCours || '',
        /* Le rang tapé à la main reste tapé à la main : perdre
           cette marque, c'est rendre le recomptage au classeur et
           reperdre la correction du bureau. */
        leconMain: prec.leconMain || ''
      });
    });
  });
}

/* Le rang, à la française : « 1ère », puis « 2ème ». */
function rangLecon(n){
  return (n === 1) ? '1ère' : n + 'ème';
}

/* La terminaison seule, pour les étiquettes qui suivent une case
   de saisie : « [1] ère leçon », « [5] ème leçon ». Une case dont
   l'étiquette dit toujours « ème » fait écrire « 1ème ». */
function suffixeRang(n){
  return (parseInt(n, 10) === 1) ? 'ère' : 'ème';
}

/* Le cours du jour fait-il avancer le compteur ?

   La question se pose deux fois : au moment de compter le rang
   global (déjà fait à la lecture du dossier) et au moment de
   compter dans la moitié de frise en cours. Les deux doivent
   répondre pareil, sinon le rang saute d'une leçon.

   C'est le TYPE de séance qui répond, et lui seul : une leçon de
   conduite fait avancer le compteur, un examen blanc, un
   simulateur ou un examen officiel non. C'est déjà la règle qui
   calcule le rang du jour à l'ouverture du questionnaire ; s'en
   remettre à elle ici, c'est la même réponse aux deux endroits.

   On la devinait avant par une soustraction — « le rang du jour
   vaut-il les leçons faites + 1 ? ». Les deux nombres viennent de
   sources différentes : dès que le moniteur corrigeait le rang à
   la main avec le crayon, la soustraction répondait « aujourd'hui
   ne compte pas », et la leçon qui suivait l'examen blanc
   s'affichait « 0ème ». */
function courtDansLaFrise(q){
  if(q.modele) return leconCompteDansLaFrise(q.modele);
  const n = parseInt(q.lecon, 10);
  const f = parseInt(q.leconsFaites, 10);
  if(!isNaN(n) && !isNaN(f)) return n === f + 1;
  return true;
}

/* ------------------------------------------------------------
   OÙ L'ÉLÈVE EN EST DANS SA FRISE

   Une frise a une charnière : l'examen blanc. Avant, on compte vers
   lui ; après, on compte les leçons qui le suivent. Un élève qui l'a
   passé n'est plus « à 3 leçons de l'examen blanc » — et l'écrire
   quand même, juste à côté de « examen blanc passé », c'est ce que
   les moniteurs lisaient sur leur carte.

   Le repassage a sa propre charnière, plus récente encore : le
   rendez-vous post-permis. Après lui, ce sont les heures décidées
   ce jour-là qui comptent, plus la frise d'origine.
   ------------------------------------------------------------ */
/* Quand le cours du jour EST l'événement, le rang n'apprend rien.

   « 3ème leçon sur 3 » le jour de l'examen, c'est vrai et c'est
   inutile : ce qui compte ce matin-là, c'est que c'est l'examen.
   La ligne de tête doit dire l'événement, pas le compteur. */
/* ------------------------------------------------------------
   CE QU'UNE MAIN A DIT DERRIÈRE LA CHARNIÈRE

   Deux faits indépendants, et c'est pour cela qu'il y a deux
   cases : le TOTAL des leçons (celui de Drivup) et, quand une
   charnière est passée, combien en ont été faites DEPUIS.

   Aucun des deux ne se déduit de l'autre chez les élèves qui
   conduisaient avant l'outil : le classeur ne porte pas leurs
   premières leçons, et leur frise n'a pas été suivie à la lettre.

   Ce qu'on garde n'est pas le rang d'après — il vieillirait d'une
   leçon à l'autre — mais LE NOMBRE DE LEÇONS AVANT LA CHARNIÈRE,
   qui, lui, ne bougera plus jamais. Écrit une fois, l'élève est
   calé pour toute la suite de sa formation. */
function rangDepuisLaCharniere(q, total, cle){
  const avant = parseInt((q || {})[cle], 10);
  if(isNaN(avant) || !total) return null;
  const r = total - avant;
  return (r >= 1) ? r : null;
}

/* Et l'inverse, au moment où la main répond : « 8 au total, 3
   depuis l'examen blanc » veut dire 5 avant. C'est cette
   soustraction-là qu'on enregistre. */
function avantLaCharniere(total, depuis){
  const t = parseInt(total, 10);
  const d = parseInt(depuis, 10);
  if(isNaN(t) || isNaN(d) || d < 1 || d > t) return '';
  return String(t - d);
}

function positionDansLaFrise(q){
  /* MAJUSCULES : c'est la ligne qu'on lit en premier sur une carte,
     et elle doit se distinguer sans qu'on la cherche. */
  const dire = t => '🎯 ' + majusculeNote(t);

  /* La table vit ici, dans la seule fonction qui s'en sert : elle
     n'a pas à être chargée séparément pour que le rang se calcule. */
  const EVENEMENT = {
    'examen-officiel': 'Examen ce jour',
    'examen-blanc':    "C'est l'examen blanc"
  };
  if(EVENEMENT[q.modele]) return dire(EVENEMENT[q.modele]);

  /* UNE SÉANCE QUI N'EST PAS UNE LEÇON N'A PAS DE RANG.

     Un simulateur, un rendez-vous préalable, une formation
     accompagnateur, un rendez-vous post-permis occupent un créneau
     sans faire avancer le compteur : leur annoncer « 1ère leçon —
     encore 1 leçon avant l'examen blanc » est faux deux fois. La
     carte dit déjà de quelle séance il s'agit, en tête.

     C'est la même table qu'ailleurs qui répond — celle qui dit si
     le cours du jour compte dans la frise. Sans type de séance
     (une vieille note), on ne conclut rien et on continue. */
  if(q.modele && !leconCompteDansLaFrise(q.modele)) return '';

  const n = parseInt(q.lecon, 10);
  if(isNaN(n) || !n){
    /* Pas de rang, et le classeur ne porte aucun bilan : on ne sait
       pas où en est cet élève, et personne ne l'a dit. Le taire
       laissait la carte muette là où il fallait une consigne — le
       moniteur croyait la note complète et démarrait sans avoir
       rempli le questionnaire.

       Une séance qui n'a pas de rang par nature — simulateur,
       examen, post-permis — n'a rien à réclamer : son vide est
       voulu. */
    if(q.sansBilan && (!q.modele || leconCompteDansLaFrise(q.modele))){
      return dire('Il faut remplir le questionnaire');
    }
    return '';
  }

  const plus = courtDansLaFrise(q) ? 1 : 0;
  const pl = k => (k > 1 ? 's' : '');

  /* Passé une charnière — l'examen blanc, le rendez-vous
     post-permis — on compte depuis elle : « 1ère leçon après
     l'examen blanc ». Mais le rang total ne disparaît pas pour
     autant : c'est celui que le moniteur a saisi, c'est celui
     qu'il cherche sur la carte, et c'est celui qui dit combien de
     leçons l'élève a faites en tout.

     Tout ce qui précise la ligne tient dans UNE parenthèse — ce
     qui est prévu, puis le total. Deux tirets à la suite, ou deux
     parenthèses, et la ligne passait à trois lignes sur un
     téléphone, en gros et en vert. On ne redit pas le total quand
     il vaut déjà le rang affiché : « 1ère après l'examen blanc
     (1ère au total) » ne serait qu'un bégaiement. */
  const entreParentheses = (prevu, total, rang) => {
    const bouts = [];
    if(prevu) bouts.push(prevu);
    if(total && total !== rang) bouts.push(rangLecon(total) + ' au total');
    return bouts.length ? ' (' + bouts.join(', ') + ')' : '';
  };

  /* Une formation qui repart de zéro : la passerelle. Compter
     depuis les débuts de l'élève n'aurait aucun sens — il a déjà
     son permis. Ses leçons de passerelle sont celles qu'il a faites
     dans la boîte de ce parcours. */
  const parcours = parcoursDeLaFormation(q.formation);
  if(parcours && parcours.repartDeZero){
    const faites = q.leconsParBoite && q.leconsParBoite[parcours.boite];
    const r = (typeof faites === 'number') ? faites + plus : n;
    return dire(rangLecon(r) + ' leçon de passerelle');
  }

  /* IL EST DÉJÀ ALLÉ À L'EXAMEN, ET IL A REPRIS.

     C'est la charnière la plus récente de son parcours, et elle
     prime sur tout le reste : lui annoncer « 3ème leçon après
     l'examen blanc » alors qu'il a passé son permis en décembre
     serait remonter d'un an en arrière.

     Le rang depuis l'examen ne se calcule pas : le classeur ne
     porte pas les leçons faites avant l'outil, et l'élève a pu en
     faire ailleurs. C'est le moniteur qui le dit, dans la deuxième
     case ; sans lui, on annonce la reprise sans inventer de rang. */
  if(q.examPermis === 'passe' || q.avantExamRate){
    const dit2 = rangDepuisLaCharniere(q, n, 'avantExamRate');
    if(dit2 !== null){
      return dire(rangLecon(dit2) + " leçon après l'examen ajourné" +
                  entreParentheses('', n, dit2));
    }
    /* Sans rang depuis l'examen, on annonce la reprise — mais
       seulement tant qu'aucune nouvelle date n'est posée : « reprise
       après l'examen ajourné » sur un élève qui repasse dans trois
       semaines serait une vieille nouvelle. */
    if(q.examPermis === 'passe'){
      return dire("reprise après l'examen ajourné" +
                  entreParentheses('', n, 0));
    }
  }

  /* Après le rendez-vous post-permis : ce sont ses heures qui font
     loi, pas la frise du permis d'origine. Elles s'annoncent en
     HEURES — c'est ainsi qu'elles ont été décidées ce jour-là.

     Il prime même quand on ne sait pas compter depuis lui : un
     post-permis fait est la charnière la plus récente, et dire
     « après l'examen blanc » à sa place serait faux. */
  const depuisRdv = parseInt(q.leconsDepuisRdvPost, 10);
  if(q.rdvPostFait === 'oui'){
    const h = String(q.heuresRepassage || '').trim();
    /* Ce qu'une main a dit, d'abord : voir plus bas, à l'examen
       blanc, pourquoi aucun calcul ne peut le remplacer. */
    const dit = rangDepuisLaCharniere(q, n, 'avantRdvPost');
    if(dit !== null){
      return dire(rangLecon(dit) + ' leçon après le post-permis' +
                  entreParentheses(h ? h + 'h prévues' : '', n, dit));
    }
    if(isNaN(depuisRdv)){
      return dire('leçon après le post-permis' + (h ? ' (' + h + 'h prévues)' : ''));
    }
    /* Jamais « 0ème » : la charnière est derrière nous, donc la
       leçon qui vient est au moins la première d'après. */
    const r = Math.max(1, depuisRdv + plus);
    return dire(rangLecon(r) + ' leçon après le post-permis' +
                entreParentheses(h ? h + 'h prévues' : '', n, r));
  }

  /* Parcours AAC ou CS. Le nombre inscrit dans la frise — « que 4
     leçons voiture » — ne compte QUE la fiche véhicule, c'est-à-dire
     la première phase, celle qui mène au rendez-vous préalable.

     Une fois ce rendez-vous passé, puis les rendez-vous
     pédagogiques, ce compteur n'a plus d'objet : l'élève n'a pas
     « dépassé sa frise », il en a franchi une étape. L'AAC a ses
     charnières comme la formation classique a son examen blanc. */
  const totalAacCs = leconsPrevuesAacCs(q.frise);
  if(totalAacCs){
    /* « le RVP 2 » et non « le rendez-vous pédagogique n°2 » : cette
       ligne s'écrit en gros sur la carte, et le libellé long la
       faisait déborder sur trois lignes. C'est le même mot que
       partout ailleurs. */
    const franchi = (q.rvp2 === 'fait') ? 'le RVP 2'
                  : (q.rvp1 === 'fait') ? 'le RVP 1'
                  : (q.rvPrealable === 'fait') ? 'le rendez-vous préalable'
                  : '';
    if(franchi) return dire(rangLecon(n) + ' leçon après ' + franchi);

    /* Ce vers quoi ces leçons comptent est écrit dans SA frise :
       la formation de l'accompagnateur, le rendez-vous préalable.
       « La fin de la fiche véhicule » nommait un document ; ce que
       le moniteur veut savoir, c'est ce qui attend l'élève. */
    const etape = (typeof etapeApresFicheVehicule === 'function')
      ? etapeApresFicheVehicule(q.frise) : 'la fin de la fiche véhicule';

    if(n < totalAacCs){
      return dire(rangLecon(n) + ' leçon — encore ' + (totalAacCs - n) +
                  ' leçon' + pl(totalAacCs - n) + ' avant ' + etape);
    }
    if(n === totalAacCs){
      return dire(rangLecon(n) + ' leçon — dernière avant ' + etape);
    }
    return dire(rangLecon(n) + ' leçon — fiche véhicule dépassée (' +
                totalAacCs + ' prévue' + pl(totalAacCs) + ')');
  }

  /* L'examen blanc est-il derrière nous ? */
  const ebPasse = (q.examBlanc === 'passe') || !!q.ebPasse;
  const depuisEB = parseInt(q.leconsDepuisEB, 10);

  if(ebPasse){
    const apres = leconsApresExamenBlanc(q.frise);
    const avant = leconsAvantExamenBlanc(q.frise);
    const prevues = apres ? apres + ' prévue' + pl(apres) : '';
    const dit = (t, r) => dire(t + entreParentheses(prevues, n, r));

    /* LE RANG DERRIÈRE LA CHARNIÈRE SE DÉDUIT DU RANG AFFICHÉ.

       « Un examen blanc n'est jamais compté comme une leçon »
       (Chrystel, 30 août). Le rang saisi ne compte donc que des
       leçons de conduite, et la frise dit combien il y en avait
       avant l'examen blanc : une soustraction suffit, et la carte
       ne peut plus se contredire elle-même — la pastille disait 8
       pendant que la ligne verte disait 0.

       Mamadou : 8ème leçon, 5 avant l'examen blanc → la 3ème
       après, alors que la frise n'en prévoyait que 2. C'est un
       dépassement réel, et c'est ce qu'il faut lire.

       Le compte du dossier ne sert plus que de recours : il est
       vide pour tous les élèves qui ont conduit avant l'outil, et
       c'est justement là qu'il affichait « 0ème ».

       MAIS LA SOUSTRACTION SUPPOSE QUE LA FRISE A ÉTÉ SUIVIE.
       Un élève qui a fait 9 leçons avant son examen blanc là où la
       frise en prévoyait 5 s'entendait annoncer sa 4ème d'après
       alors qu'il en est à sa 1ère — et rien ne permettait de le
       corriger. C'est le cas de tous les élèves d'avant l'outil.
       D'où la deuxième case : ce qu'une main a dit passe avant
       tout calcul, et une fois dit, il n'y a plus à le redire. */
    const dit2 = rangDepuisLaCharniere(q, n, 'avantEB');
    const deduit = (avant !== null && n > avant) ? n - avant : null;
    const duDossier = isNaN(depuisEB) ? null : Math.max(1, depuisEB + plus);
    const r = (dit2 !== null) ? dit2 : (deduit !== null) ? deduit : duDossier;

    /* Ni frise exploitable ni historique : on ne raconte pas
       d'histoire, on dit le rang global et on s'arrête. */
    if(r === null) return dit(rangLecon(n) + " leçon après l'examen blanc", n);

    if(apres && r > apres){
      return dire(rangLecon(r) + " leçon après l'examen blanc — frise dépassée" +
                  entreParentheses(prevues, n, r));
    }
    return dit(rangLecon(r) + " leçon après l'examen blanc", r);
  }

  /* Avant l'examen blanc : la première moitié de la frise */
  const prevues = leconsAvantExamenBlanc(q.frise);
  if(prevues && n < prevues){
    return dire(rangLecon(n) + ' leçon — plus que ' + (prevues - n) +
                ' leçon' + pl(prevues - n) + " avant l'examen blanc");
  }
  if(prevues && n === prevues){
    return dire(rangLecon(n) + " leçon — dernière avant l'examen blanc");
  }
  if(prevues && n > prevues){
    return dire(rangLecon(n) + ' leçon — frise dépassée (' + prevues +
                ' prévue' + pl(prevues) + ')');
  }
  return dire(rangLecon(n) + ' leçon');
}

/* ------------------------------------------------------------
   LA NOTE, EN QUATRE BLOCS

   Ce qui alerte · la frise · où il en est · le permis · les mots
   des moniteurs. Chacun sur sa ligne : c'est ce qui permet de
   trouver l'information sans la chercher.
   ------------------------------------------------------------ */
function noteDepuisQuestionnaire(q){
  if(!q) return '';

  /* Ce que le parcours de l'élève n'a pas ne s'écrit pas — même si
     le contexte en a gardé la trace d'une formation précédente.

     Ici et pas plus loin : la position dans la frise lit elle aussi
     l'examen blanc, et une passerelle serait annoncée « après
     l'examen blanc » alors qu'elle n'en a jamais eu. */
  const sansObjet = (typeof sansObjetPourLaFormation === 'function')
    ? sansObjetPourLaFormation(q.formation) : [];
  if(sansObjet.length){
    q = Object.assign({}, q);
    sansObjet.forEach(cle => { q[cle] = ''; });
  }

  /* Un élève en AAC porte la frise de l'AAC. La sienne pouvait
     dater d'avant son passage en conduite accompagnée : ses deux
     rendez-vous pédagogiques disent que ce n'est plus la bonne. */
  if(estUnParcoursAac(q) && !/^AAC\b/i.test(String(q.frise || ''))){
    const aac = friseAacDe(q);
    if(aac){ q = Object.assign({}, q, { frise: aac }); }
  }

  const alertes = [];
  const etats = [];
  const permis = [];
  const mots = [];

  /* Un repassage se signale avant tout le reste */
  if(q.repassages){
    alertes.push('🔁 ' + q.repassages + (q.repassages === 1 ? 'er' : 'e') + ' ' +
      ETAT_REPASSAGE +
      (q.dateAjournement ? ' — ajourné le ' + q.dateAjournement : ''));
  }

  /* Les aménagements passent en premier : le moniteur doit les voir d'emblée */
  if(q.handicap === 'oui'){
    const amg = (q.amenagements || []).map(libelleAmenagement);
    alertes.push('♿ Conduite aménagée' + (amg.length ? ' — ' + amg.join(' · ') : ''));
  }

  /* Le coussin se prépare avant que l'élève monte : il a sa place
     dans la note, au même titre que les aménagements. */
  if(q.coussin === 'oui') alertes.push('🟩 Coussin vert');

  /* La fiche d'évaluation : sa problématique et ses leçons */
  if(String(q.problematique || '').trim()){
    alertes.push('❓ Problématique : ' + String(q.problematique).trim());
  }

  if(String(q.prefecture || '').trim()){
    const k = Number(q.prefecture);
    alertes.push(k > 0
      ? '♿ Encore ' + k + ' leçon' + (k > 1 ? 's' : '') +
        ' avant présentation à la préfecture'
      : '♿ Prêt à être présenté à la préfecture');
  }

  ajouterSuite(etats, permis, mots, q);

  /* La position en TÊTE, sur sa propre ligne : c'est ce qu'un
     moniteur cherche en premier en ouvrant sa journée — à quelle
     leçon il en est, et ce qu'il reste. Tout le reste vient
     dessous. Son repère 🎯 permet à la carte de la retrouver pour
     l'écrire en gros. */
  const corps = [positionDansLaFrise(q),
                 alertes.join(' · '),
                 q.frise || '',
                 etats.join(' · '),
                 permis.join(' · ')].filter(Boolean).join('\n');

  return mots.length ? assemblerNotePreparee('', corps, mots.join(' · ')) : corps;
}

/* Partie commune : examens, fiche véhicule, cases à cocher, note libre */

/* « lundi 31 août 2026 » devient « LUNDI 31 AOÛT 2026 » : les
   accents montent aussi, ce que toUpperCase fait déjà en français. */
function majusculeNote(t){
  return String(t || '').toUpperCase();
}

/* La ligne d'examen dans une note déjà écrite. Reconnue à partir
   des deux libellés ci-dessus, jusqu'au séparateur suivant. */
/* La ligne d'examen va jusqu'au séparateur suivant — « · » OU un
   retour à la ligne. Sans le retour à la ligne, la couleur rouge
   débordait sur tout le bloc suivant : la frise d'un élève en AAC
   s'affichait en rouge derrière sa date d'examen. */
const RE_EXAMEN_NOTE = new RegExp(
  '(' + EXAMEN_PREVU + '|' + EXAMEN_SANS_DATE + ')([^·\\n\\r]*)', 'g');

/* Écrit une note dans un élément, la ligne d'examen en couleur :
   rouge quand la date est posée, bleu quand elle manque. On
   fabrique des nœuds plutôt que du HTML — une note contient du
   texte saisi par un moniteur, il n'a pas à être interprété. */
/* Tout ce qui a été écrit en gras Unicode, quel qu'il soit. La note
   en porte cinq états — examen blanc, simulateur, repassage,
   rendez-vous post-permis, examen officiel — et les énumérer ici
   serait une seconde liste à tenir à jour. On reconnaît le gras
   lui-même : ce qui est gras dans la note est gras à l'écran. */
const RE_GRAS_NOTE = /[\u{1D5D4}-\u{1D607}\u{1D7EC}-\u{1D7F5}][\u{1D5D4}-\u{1D607}\u{1D7EC}-\u{1D7F5}̀-ͯ '’\-]*/gu;

function colorerNote(el, note){
  if(!el) return;
  el.textContent = '';
  const t = String(note || '');

  /* Les lignes d'examen d'abord : elles ne sont pas seulement en
     gras, elles sont colorées — rouge quand la date est posée, bleu
     quand elle manque. Les autres passages en gras suivent. */
  const marques = [];
  let m;

  RE_EXAMEN_NOTE.lastIndex = 0;
  while((m = RE_EXAMEN_NOTE.exec(t)) !== null){
    marques.push({ debut: m.index, fin: m.index + m[0].length,
                   couleur: (m[1] === EXAMEN_PREVU) ? 'var(--red)' : 'var(--bleu)' });
  }

  RE_GRAS_NOTE.lastIndex = 0;
  while((m = RE_GRAS_NOTE.exec(t)) !== null){
    const debut = m.index, fin = m.index + m[0].length;
    /* Déjà pris par une ligne d'examen : ne pas la découper */
    if(marques.some(x => debut < x.fin && fin > x.debut)) continue;
    marques.push({ debut: debut, fin: fin, couleur: '' });
  }

  marques.sort((a, b) => a.debut - b.debut);

  let i = 0;
  marques.forEach(x => {
    if(x.debut < i) return;
    if(x.debut > i) el.appendChild(document.createTextNode(t.slice(i, x.debut)));
    const s = document.createElement('span');
    s.style.fontWeight = '800';
    if(x.couleur) s.style.color = x.couleur;
    s.textContent = t.slice(x.debut, x.fin);
    el.appendChild(s);
    i = x.fin;
  });
  if(i < t.length) el.appendChild(document.createTextNode(t.slice(i)));
}

/* Un examen que rien ne permet de planifier — dossier ANTS en
   attente, avis médical, pièce manquante. Ce n'est pas « pas le
   niveau » : le bureau a quelque chose à débloquer.

   Écrite ici une fois, cette reconnaissance sert au questionnaire
   comme à la liste du bureau : les deux ne peuvent pas se mettre
   à chercher des choses différentes. */
const RE_NON_PLANIFIABLE = /non\s*planifiable/i;

function examenNonPlanifiable(note){
  return (typeof segmentsDeNote === 'function' ? segmentsDeNote(note) : [])
    .some(x => RE_NON_PLANIFIABLE.test(x));
}

/* Le motif écrit entre parenthèses, s'il y en a un */
function motifNonPlanifiable(note){
  const seg = (typeof segmentsDeNote === 'function' ? segmentsDeNote(note) : [])
    .find(x => RE_NON_PLANIFIABLE.test(x)) || '';
  const m = seg.match(/non\s*planifiable\s*\(([^)]+)\)/i);
  return m ? m[1].trim() : '';
}

/* ------------------------------------------------------------
   REMETTRE À LA FORME ACTUELLE UNE LIGNE D'EXAMEN ANCIENNE

   Les notes écrites avant que cette forme existe portent d'autres
   libellés : « Examen prévu le… », « Date d'examen : … », ou la
   même phrase en majuscules ordinaires. Elles ne sont ni mises en
   gras ni colorées, puisque colorerNote cherche exactement les
   deux libellés ci-dessus.

   Plutôt qu'une seconde table de correspondances, la règle est
   écrite ici, à côté des libellés qu'elle produit : les deux ne
   peuvent pas diverger.
   ------------------------------------------------------------ */
/* Le libellé, PUIS le mot de liaison qui le suit parfois. Sans
   cette seconde partie, « Examen du permis fixé au lundi… » du
   bureau devenait « EXAMEN OFFICIEL PRÉVU LE FIXÉ AU LUNDI… » :
   le libellé était remplacé, mais « fixé au » restait et passait
   pour la date. */
const RE_EXAMEN_ANCIEN = new RegExp(
  '^(?:🚗\\s*)?(?:' + EXAMEN_PREVU + '|' +
  "EXAMEN OFFICIEL PR[EÉ]VU LE|Examen officiel pr[eé]vu le|" +
  "Examen pr[eé]vu|Examen du permis|Date d'examen|Permis pr[eé]vu" +
  ')\\s*:?\\s*(?:fix[ée]{1,2}\\s+(?:au|le)|pr[eé]vu\\s+le|au|le)?\\s*:?\\s*', 'i');

const RE_SANS_DATE_ANCIEN = new RegExp(
  '^(?:🚗\\s*)?(?:' + EXAMEN_SANS_DATE + '|' +
  "PAS DE DATE D'EXAMEN(?: OFFICIEL)?|Pas de date d'examen(?: officiel)?|" +
  "Aucune date d'examen|Examen non pr[eé]vu" +
  ')\\s*:?\\s*', 'i');

/* Un segment de note, remis à la forme actuelle. Rend le segment
   inchangé si ce n'est pas une ligne d'examen, ou si elle est
   déjà à la bonne forme — c'est ce qui permet de compter
   honnêtement ce qui reste à corriger. */
function normaliserLigneExamen(segment){
  const seg = String(segment || '').trim();
  if(!seg) return seg;

  /* « Pas de date » d'abord : « PAS DE DATE D'EXAMEN OFFICIEL »
     contient le mot EXAMEN et serait sinon pris pour l'autre. */
  let m = RE_SANS_DATE_ANCIEN.exec(seg);
  if(m) return (EXAMEN_SANS_DATE + ' ' + seg.slice(m[0].length)).trim();

  m = RE_EXAMEN_ANCIEN.exec(seg);
  if(!m) return seg;

  /* Ce qui suit le libellé : la date, puis éventuellement un
     complément après un tiret. Seule la date monte en majuscules,
     comme le fait le générateur. */
  /* « (bureau) » dit qui a saisi, pas ce qui est prévu : il n'a
     rien à faire dans la note, et surtout pas en majuscules. */
  const reste = seg.slice(m[0].length).replace(/\s*\(\s*bureau\s*\)\s*$/i, '');
  const coupe = reste.indexOf(' — ');
  const date  = (coupe === -1 ? reste : reste.slice(0, coupe)).trim();
  const suite = (coupe === -1 ? '' : reste.slice(coupe));

  /* Un libellé « prévu » sans date derrière ne l'est pas vraiment */
  if(!date) return (EXAMEN_SANS_DATE + suite).trim();

  return (EXAMEN_PREVU + ' ' + majusculeNote(date) + suite).trim();
}

/* La note entière. On ne touche qu'à la ligne d'examen, tout le
   reste est recopié tel quel — une note contient le travail d'un
   moniteur. */
function normaliserNoteExamen(note){
  return segmentsDeNote(note)
    .map(x => normaliserLigneExamen(x))
    .filter(Boolean)
    .join(' · ');
}

/* ------------------------------------------------------------
   NETTOYER UNE NOTE QUI S'EST EMPILÉE

   Une note reprise de cours en cours finit par porter trois fois
   la même date d'examen, deux fois le même examen blanc. Chaque
   ajout était juste ; c'est leur accumulation qui ne l'est pas.

   La règle est celle que Chrystel a posée : la dernière
   information est la bonne. Pour chaque famille de segments
   régénérables, on ne garde donc que la DERNIÈRE, à sa place. Ce
   qui n'appartient à aucune famille — les remarques du moniteur —
   n'est jamais jeté, seulement dédoublonné à l'identique.
   ------------------------------------------------------------ */
/* Parmi plusieurs lignes d'une même famille, laquelle garder ?

   La dernière écrite fait foi — c'est la règle posée par Chrystel.
   Sauf quand cette dernière n'est que le DÉBUT d'une autre : une
   « PAS DE DATE D'EXAMEN OFFICIEL » toute nue ne doit pas effacer
   « PAS DE DATE D'EXAMEN OFFICIEL — non planifiable (Pas le
   niveau) », qui dit la même chose ET pourquoi. Sans cette
   nuance, le ménage faisait disparaître un élève de la liste
   Permis → Pas prêts. */
function meilleurDeLaFamille(segs){
  const dernier = segs[segs.length - 1];
  const plusRiche = segs
    .filter(x => x !== dernier && x.indexOf(dernier) === 0)
    .sort((a, b) => b.length - a.length)[0];
  return plusRiche || dernier;
}

function nettoyerNote(note){
  const segs = segmentsDeNote(note).map(x => normaliserLigneExamen(x));

  /* Ce que chaque famille a écrit, dans l'ordre */
  const parFamille = {};
  segs.forEach(seg => {
    const f = familleDuSegment(seg);
    if(!f) return;
    (parFamille[f.cle] = parFamille[f.cle] || []).push(seg);
  });

  const retenu = {};
  Object.keys(parFamille).forEach(cle => {
    const f = FAMILLES_NOTE.find(x => x.cle === cle);
    let liste = parFamille[cle];

    /* Une intention ne survit pas à côté d'une décision : dès qu'un
       segment de la famille annonce autre chose qu'un « à prévoir »,
       les « à prévoir » sortent. C'est ce qui laissait lire
       « rendez-vous post-permis à prévoir » juste avant
       « rendez-vous post-permis le 19 août ». */
    const decides = liste.filter(s => !segmentEstUneIntention(s, f));
    if(decides.length) liste = decides;

    retenu[cle] = meilleurDeLaFamille(liste);
  });

  /* À l'envers : le premier rencontré est le dernier écrit, et
     c'est sa place qu'on garde. */
  const famillesVues = {};
  const identiquesVus = {};
  const gardes = [];

  for(let i = segs.length - 1; i >= 0; i--){
    const seg = segs[i];
    const f = familleDuSegment(seg);

    if(f){
      if(famillesVues[f.cle]) continue;
      famillesVues[f.cle] = true;
      gardes.push(retenu[f.cle]);
      continue;
    }

    /* Hors famille — les remarques des moniteurs : on ne jette
       que les doublons à l'identique. */
    if(identiquesVus[seg]) continue;
    identiquesVus[seg] = true;
    gardes.push(seg);
  }

  return gardes.reverse().join(' · ');
}


/* ------------------------------------------------------------
   LA LIGNE D'EXAMEN QUAND IL N'Y A RIEN À DIRE

   Un moniteur a demandé à voir « PAS DE DATE D'EXAMEN OFFICIEL »
   en permanence, pour repérer d'un coup d'œil ceux dont la date
   reste à prendre. Sur un élève qui débute, cette ligne n'apprend
   rien à personne — d'où l'interrupteur.

   Il ne concerne QUE le cas où le moniteur n'a rien répondu : une
   réponse explicite — à prévoir, prévu le, annulé, non planifiable
   — s'écrit toujours.
   ------------------------------------------------------------ */
let ligneExamenToujours = true;

async function chargerReglageLigneExamen(){
  try{
    const d = await appelPrep({ action: 'reglagesList' });
    const r = (d && d.reglages) || {};
    /* Activé tant qu'on n'a pas dit le contraire : c'est un
       moniteur qui l'a demandé, on ne le lui retire pas en
       silence. */
    ligneExamenToujours = String(r.ligneExamenToujours || 'oui') !== 'non';
  }catch(e){ /* injoignable : on garde le comportement demandé */ }
}

/* Les états et les mots vont dans des blocs différents : « etats »
   pour ce qui dit où en est l'élève, « permis » pour l'examen
   officiel et ce qui s'y rattache, « mots » pour ce qu'un humain a
   écrit. Trois listes plutôt qu'une seule : c'est ce qui met chaque
   information sur sa ligne. */
function ajouterSuite(etats, permis, mots, q){
  /* Ce que le parcours de l'élève n'a pas : une passerelle n'a ni
     examen blanc ni examen officiel, et la ligne qui dirait qu'ils
     manquent n'aurait pas plus de sens que celle qui les annonce. */
  const sans = (typeof sansObjetPourLaFormation === 'function')
    ? sansObjetPourLaFormation(q.formation) : [];
  /* L'examen blanc de l'AAC se passe pendant le rendez-vous n°2 :
     une fois un rendez-vous fait, « pas encore évoqué » est faux.
     Un examen blanc explicitement saisi, lui, s'écrit toujours —
     c'est celui qu'on prévoit à part quand l'élève n'avait pas le
     niveau ce jour-là. */
  const sansExamenBlanc = sans.indexOf('examBlanc') !== -1 ||
                          (rvpDejaFait(q) && !q.examBlanc && !q.ebPasse);
  const sansExamenPermis = sans.indexOf('examPermis') !== -1;

  const n = q.examBlancN;
  const pl = v => (parseInt(v, 10) > 1 ? 's' : '');

  /* Le rang de l'examen blanc : « 2e examen blanc » plutôt que
     « examen blanc », pour savoir combien l'élève en a déjà passé.
     Le libellé est en gras — c'est l'un des états qu'on cherche
     d'un coup d'œil — la date qui suit, non : elle doit rester
     cherchable au Ctrl+F dans le classeur. */
  const rang = String(q.examBlancRang || '').trim();
  const numero = rang ? (rang === '1' ? '1er ' : rang + 'e ') : '';

  /* Le rang du passage au permis : « 2e passage » plutôt que rien.
     C'est ce qui dit s'il s'agit d'un repassage. */
  const rp = String(q.examPassage || '').trim();
  const passage = rp
    ? (rp === '1' ? ' — 1er passage'
       : rp === '5' ? ' — 5e passage ou plus'
       : ' — ' + rp + 'e passage')
    : '';
  /* La date saisie, en toutes lettres : « le mardi 15 septembre 2026 » */
  const jourEB = q.examBlancDate
    ? ' le ' + (dateEnToutesLettres(q.examBlancDate) || q.examBlancDate)
    : '';

  /* L'examen blanc vient d'avoir lieu : sa conclusion prime */
  if(q.ebPasse){
    const jour = dateEnToutesLettres($('lessonDate').value || todayLocal());
    const tete = '🅱️ ' + numero + ETAT_EB_PASSE + ' le ' + jour;
    if(q.ebPasse === '3h'){
      etats.push(tete + ' — plus que les 3h avant examen');
    }else if(q.ebPasse === 'lecons'){
      const k = q.ebLecons;
      etats.push(tete + ' — encore ' + (k || '❓') +
                 ' leçon' + (parseInt(k, 10) > 1 ? 's' : '') + ' avant examen');
    }else{
      etats.push(tete + ' — pas le niveau');
    }
  }else if(q.examBlanc === 'passe'){
    const tete = '🅱️ ' + numero + ETAT_EB_PASSE;
    /* Le résultat, dans la notation du bureau : « 6 + 3h » — six
       heures de leçons, puis les trois heures d'avant examen.
       C'est ce chiffre qu'on cherche pour placer une date. */
    const hEB = String(q.heuresRestantes || '').trim();
    /* « Pas le niveau » prime sur tout chiffre : c'est la conclusion
       qui décide de la suite, et le bureau la cherche en premier. */
    const conclusion =
        (String(q.ebNiveau || '') === 'non') ? ' — pas le niveau'
      : (hEB === '0')                        ? ' — plus que les 3h avant examen'
      : hEB                                  ? ' — ' + hEB + ' + 3h'
      : n                                    ? ' — ' + n + ' leçon' + pl(n) +
                                               ' prévue' + pl(n) +
                                               ' avant le permis (+ 3h avant examen)'
      : (jourEB ? '' : ' — déjà fait');
    etats.push(tete + jourEB + conclusion);
  }else if(q.examBlanc === 'reserve'){
    etats.push('🅱️ ' + numero + ETAT_EB_RESERVE + jourEB +
               (n ? ' — dans ' + n + ' leçon' + pl(n) : ''));
  }else if(q.examBlanc === 'aprevoir'){
    etats.push('🅱️ ' + numero + ETAT_EB_APREVOIR +
               (n ? ' dans ' + n + ' leçon' + pl(n) : ''));
  }else if(q.examBlanc === 'impossible'){
    /* La date de la décision, pas celle d'aujourd'hui : savoir
       depuis QUAND on ne prévoit pas d'examen blanc, c'est savoir
       s'il est temps d'y revenir. */
    const quand = String(q.ebImpossibleLe || '').trim();
    etats.push('🅱️ ' + ETAT_EB_IMPOSSIBLE + ' pour le moment' +
               (quand ? ' — noté le ' + (dateEnToutesLettres(quand) || quand) : ''));
  }else if(!sansExamenBlanc){
    /* Rien de renseigné, et pourtant la ligne s'écrit : sans elle,
       on ne distingue pas « personne n'a répondu » de « la question
       ne se pose pas ». C'est la même règle que pour l'examen
       officiel, qui dit toujours s'il a une date ou non. */
    etats.push('🅱️ ' + ETAT_EB_RIEN);
  }

  /* Le rendez-vous post-permis : trois états, une seule ligne.
     Ils s'écrivaient jusqu'ici en messages du bureau recopiés côte
     à côte — « à prévoir », puis « le 19 août », puis « fait ». */
  if(q.rdvPostFait === 'oui'){
    const h = String(q.heuresRepassage || '').trim();
    etats.push('🤝 ' + ETAT_RDV_POST + ' ' + grasNote('FAIT') +
      (q.rdvPostDate ? ' le ' + dateEnToutesLettres(q.rdvPostDate) : '') +
      (q.rdvPostMoniteur ? ' avec ' + q.rdvPostMoniteur : '') +
      /* Même notation que le bureau : « 2 + 3h » */
      (h ? ' — ' + h + ' + 3h' : ''));
  }else if(q.rdvPostDate){
    etats.push('🤝 ' + ETAT_RDV_POST + ' ' + grasNote('PRÉVU') +
      ' le ' + dateEnToutesLettres(q.rdvPostDate) +
      (q.rdvPostMoniteur ? ' avec ' + q.rdvPostMoniteur : ''));
  }else if(q.rdvPostAPrevoir){
    etats.push('🤝 ' + ETAT_RDV_POST + ' ' + grasNote('À PRÉVOIR'));
  }

  /* L'EXAMEN OFFICIEL — une seule ligne, toujours présente.

     C'est l'information qu'on cherche en premier dans une note :
     elle ne doit ni se chercher au milieu du reste, ni manquer.
     Il y a une date, ou il n'y en a pas — deux formes, jamais deux
     lignes. Le gras est écrit en caractères Unicode : la note vit
     dans un tableur, elle ne peut pas porter de mise en forme. La
     couleur, elle, est posée à l'affichage (voir colorerNote). */
  if(q.examPermis === 'prevu' && q.examDate){
    let phrase = EXAMEN_PREVU + ' ' +
                 majusculeNote(dateEnToutesLettres(q.examDate)) + passage;
    const np = q.examPermisN;
    if(np){
      phrase += (parseInt(np, 10) === 0)
        ? ' — plus que les 3h avant examen'
        : ' — encore ' + np + ' leçon' + pl(np) + ' + 3h avant examen';
    }
    permis.push(phrase);
  }else if(q.examPermis === 'annule'){
    let phrase = EXAMEN_SANS_DATE + (q.examDate
      ? ' — celui du ' + dateEnToutesLettres(q.examDate) + ' est annulé'
      : ' — annulé');
    phrase += q.nouvelleDate
      ? ' — reprogrammé le ' + dateEnToutesLettres(q.nouvelleDate)
      : ' — nouvelle date en attente';
    permis.push(phrase);
  }else if(q.examPermis === 'passe'){
    /* IL EST DÉJÀ ALLÉ À L'EXAMEN, ET IL REVIENT.

       La ligne dit les deux choses que le bureau cherche : quand il
       a été ajourné, et qu'il reprend. Sans la seconde, on lit une
       vieille note ; sans la première, on croit qu'il n'y est
       jamais allé. */
    permis.push(EXAMEN_SANS_DATE +
      (q.examDate ? ' — ajourné le ' + dateEnToutesLettres(q.examDate)
                  : ' — déjà passé, ajourné') +
      ' — reprend la conduite — à reprogrammer');
  }else if(q.examPermis === 'nonplanifiable'){
    /* Le bureau le retrouve dans Permis → Pas prêts grâce à cette
       mention : elle est le seul repère, elle doit rester stable. */
    permis.push(EXAMEN_SANS_DATE + ' — non planifiable' +
                (q.examMotif ? ' (' + q.examMotif + ')' : ''));
  }else if(q.examPermis === 'aprevoir'){
    permis.push(EXAMEN_SANS_DATE + ' — à prévoir' + passage);
  }else if(ligneExamenToujours && !sansExamenPermis){
    /* Rien de répondu : la ligne n'apparaît que si le bureau veut
       la voir en permanence — et jamais sur un parcours qui ne
       mène à aucun examen. */
    permis.push(EXAMEN_SANS_DATE);
  }

  /* L'écoute pédagogique : le bureau doit le savoir pour ne pas
     la planifier inutilement le jour du permis. Elle se rattache à
     l'examen, elle reste donc sur sa ligne. */
  if(q.pasEcoute) permis.push("Pas d'écoutes pédagogiques");

  /* Les étapes qui restent à franchir : elles disent où en est
     l'élève, elles vont donc avec le reste de son parcours. */
  if(q.simuNuit === 'aprevoir') etats.push('🌙 ' + ETAT_SIMU + ' ' + grasNote('À PRÉVOIR'));
  else if(q.simuNuit === 'prevu') etats.push('🌙 ' + ETAT_SIMU + ' ' + grasNote('DÉJÀ PRÉVU'));
  else if(q.simuNuit === 'fait') etats.push('🌙 ' + ETAT_SIMU + ' ' + grasNote('FAIT') + ' ✅');

  if(q.formAccomp === 'aprevoir') etats.push('Formation accompagnateur à prévoir');
  else if(q.formAccomp === 'prevue') etats.push('Formation accompagnateur déjà prévue');
  else if(q.formAccomp === 'faite') etats.push('Formation accompagnateur faite');

  if(q.rvPrealable === 'aprevoir') etats.push('Rendez-vous préalable à prévoir');
  else if(q.rvPrealable === 'prevu') etats.push('Rendez-vous préalable déjà prévu');
  else if(q.rvPrealable === 'fait') etats.push('Rendez-vous préalable fait');

  /* Les deux rendez-vous pédagogiques de l'AAC, dans leur ordre :
     ils suivent le rendez-vous préalable, et c'est au second que se
     joue l'examen blanc. */
  [1, 2].forEach(k => {
    const v = q['rvp' + k];
    if(!v) return;
    /* « RVP 1 » et non « RENDEZ-VOUS PÉDAGOGIQUE N°1 » : le trait
       d'union et le « ° », que le gras ne couvre pas, offraient au
       navigateur trois endroits où couper. Chaque rendez-vous
       occupait quatre lignes sur la carte. C'est aussi le nom que
       porte le bilan. */
    /* « RVP 1 FAIT », et c'est tout : ni pictogramme, ni libellé
       long. Cette ligne était la plus mal fichue de la note. */
    const tete = grasNote('RVP ' + k);
    if(v === 'aprevoir') etats.push(tete + ' ' + grasNote('À PRÉVOIR'));
    else if(v === 'prevu') etats.push(tete + ' ' + grasNote('PRÉVU'));
    else if(v === 'fait') etats.push(tete + ' ' + grasNote('FAIT') + ' ✅');
  });

  /* Ce qu'un humain a écrit — le champ libre du moniteur, les
     messages du bureau — va derrière le 📌, à sa place.

     Les messages du bureau n'y entrent que pour ce que la note ne
     sait pas dire elle-même : « rendez-vous post-permis à prévoir »
     est désormais un état, pas une phrase à recopier, et c'est en
     le recopiant qu'on lisait quatre fois la même chose. */
  if(q.libre) mots.push(q.libre);
  (q.consignes || []).forEach(t => {
    const reste = retirerSegmentsRegeneres(t);
    if(reste && mots.indexOf(reste) === -1) mots.push(reste);
  });
}

/* Choix d'une date au calendrier plutôt qu'à la saisie manuelle */
function choisirDate(titre){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';

    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.maxWidth = '360px';

    const h = document.createElement('h3');
    h.textContent = titre || 'Choisis une date';
    boite.appendChild(h);

    const champ = document.createElement('input');
    champ.type = 'date';
    champ.style.cssText = 'width:100%;font-size:18px;padding:14px;text-align:center;';
    /* Pré-rempli à aujourd'hui : le calendrier s'ouvre au bon mois */
    champ.value = todayLocal();
    boite.appendChild(champ);

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';

    const annuler = document.createElement('button');
    annuler.className = 'btn btn-secondary';
    annuler.textContent = 'Annuler';

    const valider = document.createElement('button');
    valider.className = 'btn btn-primary';
    valider.textContent = 'Valider';

    rangee.appendChild(annuler);
    rangee.appendChild(valider);
    boite.appendChild(rangee);
    fond.appendChild(boite);
    document.body.appendChild(fond);

    function fermer(valeur){
      document.body.removeChild(fond);
      resolve(valeur);
    }
    annuler.addEventListener('click', () => fermer(null));
    valider.addEventListener('click', () => fermer(champ.value || null));
    fond.addEventListener('click', e => { if(e.target === fond) fermer(null); });

    /* Ouvre directement le calendrier sur mobile */
    setTimeout(() => {
      champ.focus();
      if(champ.showPicker){ try{ champ.showPicker(); }catch(e){} }
    }, 80);
  });
}


/* Date ISO -> texte lisible en français */
function dateEnToutesLettres(valeur){
  const t = String(valeur || '').trim();
  if(!t) return '';

  /* Le format français est accepté aussi : les dates relues d'une
     feuille Sheets ressortent en « 11/08/2026 », et y ajouter
     « T12:00:00 » donnait une date invalide. */
  let iso = t;
  const fr = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if(fr){
    iso = fr[3] + '-' + ('0' + fr[2]).slice(-2) + '-' + ('0' + fr[1]).slice(-2);
  }else if(!/^\d{4}-\d{2}-\d{2}/.test(iso)){
    return t;                       /* forme inconnue : on rend tel quel */
  }

  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  if(isNaN(d.getTime())) return t;

  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}


/* Retrouve la frise inscrite dans le corps d'un bilan précédent */
function extraireFriseTexte(bilan){
  const t = String(bilan || '');
  const m = t.match(/(\d+\s*le[çc]ons? de 2h[^\n]*exam[^\n]*)/i);
  return m ? m[1].trim() : '';
}


/* Ajoute le texte à la note, sans jamais écraser ce qui est déjà écrit */
function ajouterANote(champ, texte){
  if(!champ || !texte) return;
  const actuel = champ.value.trim();
  champ.value = actuel ? actuel + ' · ' + texte : texte;
  champ.focus();
  try{ champ.setSelectionRange(champ.value.length, champ.value.length); }catch(e){}
  sauvegarderLocal();
}



/* ------------------------------------------------------------
   LE RANG DE LA LEÇON DU JOUR, D'OÙ QU'IL VIENNE

   Trois endroits l'affichent — la case du questionnaire, le
   récapitulatif en tête, le bouton qui dit ce qui manque — et ils
   doivent dire la même chose. Le bouton annonçait « il manque le
   numéro de leçon » pendant que la case, juste en dessous, en
   montrait un : la case le déduisait du classeur, le bouton ne
   lisait que les réponses du questionnaire. Deux écritures d'une
   même règle, encore.

   Le rang saisi gagne toujours — c'est une réponse, pas une
   déduction. À défaut, le compte du classeur : le dossier est relu
   dès la saisie du nom et gardé dix minutes en mémoire, le lire
   ici ne coûte donc ni appel ni attente.
   ------------------------------------------------------------ */
function rangDuCours(ctx, eleve, modeleCle){
  const c = ctx || {};
  const saisi = parseInt(c.lecon, 10);
  if(!isNaN(saisi) && saisi) return saisi;

  const faites = (c.leconsFaites === undefined || c.leconsFaites === null)
    ? ((typeof lireCacheDossier === 'function' && eleve)
        ? (lireCacheDossier(eleve) || {}).lecons : null)
    : c.leconsFaites;

  /* « 1ère leçon » ne s'affirme que si le rappel demandait la carte
     SD : sans bilan au classeur, on ne sait pas où en est l'élève,
     et c'est bien le questionnaire qu'il faut remplir. */
  const note = (typeof $ === 'function' && $('noteInterne'))
    ? $('noteInterne').value : '';
  const premier = (typeof cestLePremierCours === 'function')
    ? (cestLePremierCours(c.premierCours) || cestLePremierCours(note))
    : false;

  return (typeof rangConnu === 'function')
    ? rangConnu(faites, modeleCle, premier) : null;
}

/* ------------------------------------------------------------
   CE QU'ON SAIT DÉJÀ DE CET ÉLÈVE, EN HUIT LIGNES

   Le questionnaire pose quinze questions ; l'état de l'élève tient
   en un coup d'œil. Le montrer en tête, c'est répondre à la seule
   question qu'on se pose en ouvrant cet écran : « qu'est-ce qui
   manque ? » — sans faire défiler quinze champs pour la trouver.

   Ce qui manque est DANS la même liste, en rouge, et pas dans un
   bloc à part : deux listes, et on lit deux fois.
   ------------------------------------------------------------ */
function recapDuCours(q, eleve, modeleCle, fiche){
  /* LE SUIVI ET LES SESSIONS D'ABORD.

     Le récapitulatif ne lisait que le contexte du cours — ce que
     le questionnaire de départ avait produit. Or ce pop-up
     n'existe plus : sur un cours démarré directement, ce contexte
     est presque vide, et l'écran réclamait une date d'examen que
     la note, deux centimètres plus bas, affichait déjà.

     Ces sources-là passent devant, comme partout ailleurs : le
     bureau peut poser une date pendant le cours, et ce qu'il pose
     est plus récent que tout ce qu'un moniteur a saisi avant. */
  const foi = (typeof etatQuiFaitFoi === 'function' && eleve)
    ? etatQuiFaitFoi(eleve) : {};
  const c = Object.assign({}, q || {}, foi);
  const f = fiche || {};
  const dit = v => String(v || '').trim();

  const formation = dit(c.formation) || dit(f.formation);
  const utile = x => (typeof friseUtilisable === 'function')
    ? friseUtilisable(x) : dit(x);
  const frise = utile(c.frise) || utile(f.frise);
  const imposee = (typeof friseDeLaFormation === 'function')
    ? friseDeLaFormation(formation, !/auto/i.test(String(modeleCle || ''))) : null;

  const boite = (formation && typeof boiteDeLaFormation === 'function')
    ? boiteDeLaFormation(formation) : '';

  const amg = Array.isArray(c.amenagements)
    ? c.amenagements.map(x => (typeof libelleAmenagement === 'function')
        ? libelleAmenagement(x) : x).join(' · ')
    : '';

  /* Un examen blanc « pas encore évoqué » n'est pas un manque pour
     un parcours qui n'en a pas : la table le sait. */
  const sansObjet = (typeof sansObjetPourLaFormation === 'function')
    ? sansObjetPourLaFormation(formation) : [];
  const aBesoin = cle => sansObjet.indexOf(cle) === -1;

  const lignes = [];
  const pose = (icone, nom, valeur, manque) =>
    lignes.push({ icone: icone, nom: nom, valeur: valeur, manque: !!manque });

  pose('🎓', 'Formation', formation, !formation);
  if(boite) pose('⚙️', 'Boîte', boite, false);

  if(imposee === null) pose('📏', 'Frise', frise, !frise);
  else if(imposee) pose('📏', 'Frise', imposee, false);

  if(typeof leconCompteDansLaFrise === 'function' &&
     leconCompteDansLaFrise(modeleCle)){
    /* Le même rang que la case du questionnaire : déduit du
       classeur quand personne ne l'a saisi. */
    const rang = rangDuCours(c, eleve, modeleCle);
    pose('🔢', 'Leçon n°', rang ? String(rang) : '', !rang);
  }

  if(c.handicap === 'oui') pose('♿', 'Conduite aménagée', amg || 'oui', false);
  if(c.coussin === 'oui') pose('🟩', 'Coussin vert', 'oui', false);

  if(aBesoin('examBlanc')){
    const eb = (c.examBlanc === 'passe') ? 'passé'
             : (c.examBlanc === 'reserve') ? 'réservé'
             : (c.examBlanc === 'impossible') ? 'à ne pas prévoir'
             : dit(c.examBlanc);
    pose('🅱️', 'Examen blanc', eb, !eb);
  }
  if(aBesoin('examPermis')){
    /* Un examen déjà passé porte une date lui aussi : sans le mot
       « ajourné », le récapitulatif l'annonçait comme une date à
       venir. */
    const ep = (c.examPermis === 'passe')
             ? 'ajourné' + (dit(c.examDate) ? ' le ' + dit(c.examDate) : '')
             : dit(c.examDate) ? 'le ' + dit(c.examDate)
             : (c.examPermis === 'non' ? 'pas de date' : dit(c.examPermis));
    pose('📅', 'Examen officiel', ep, !ep);
  }

  return lignes;
}

/* Le même récapitulatif, en HTML. Séparé pour que la règle se
   teste sans passer par un écran. */
function recapEnHtml(lignes){
  if(!lignes || !lignes.length) return '';
  const echap = t => String(t || '').replace(/</g, '&lt;');
  return '<div style="background:var(--navy);border:1px solid var(--line);' +
    'border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:13px;' +
    'line-height:1.75;">' +
    lignes.map(l =>
      '<div style="display:flex;gap:8px;">' +
        '<span style="width:130px;flex-shrink:0;color:var(--muted);">' +
          l.icone + ' ' + echap(l.nom) + '</span>' +
        (l.manque
          ? '<span style="color:var(--red);font-weight:700;">⚠️ à renseigner</span>'
          : '<span style="color:var(--cream);">' + echap(l.valeur) + '</span>') +
      '</div>').join('') +
    '</div>';
}

/* ------------------------------------------------------------
   CE QUI MANQUE POUR QUE LA NOTE SOIT JUSTE

   Le questionnaire ne s'ouvre plus au démarrage : le cours part,
   et le moniteur conduit. Ce qui manque doit donc se voir ailleurs
   — sur le bouton qui sert à le compléter, en rouge, avec le
   compte de ce qui reste.

   Trois choses, et trois seulement, empêchent une note d'être
   juste : la formation, qui décide de tout le reste ; la frise,
   quand ce parcours en a une ; et le rang de la leçon. Le poste de
   conduite n'en fait PAS partie — il s'affiche sur la carte pour
   que le moniteur prépare la voiture, il ne bloque rien.
   ------------------------------------------------------------ */
function cequiManqueAuCours(ctx, eleve, modeleCle){
  const manque = [];
  const c = ctx || {};
  const fiche = (eleve && typeof ficheDe === 'function') ? ficheDe(eleve) : null;

  const formation = String(c.formation || (fiche && fiche.formation) || '').trim();
  if(!formation) manque.push('la formation');

  /* Une passerelle n'a pas de frise du tout : son absence n'est pas
     un manque. C'est la table qui le sait, on ne le devine pas. */
  const imposee = (typeof friseDeLaFormation === 'function')
    ? friseDeLaFormation(formation, !/auto/i.test(String(modeleCle || ''))) : null;
  /* Une frise à trous est une frise manquante : la réclamer est la
     seule façon d'en sortir. */
  const brute = String(c.frise || (fiche && fiche.frise) || '').trim();
  const frise = (typeof friseUtilisable === 'function')
    ? friseUtilisable(brute) : brute;
  if(imposee === null && !frise) manque.push('la frise');

  /* Le rang déduit du classeur compte comme connu : le réclamer
     pendant que la case l'affiche, c'est envoyer le moniteur
     vérifier une information qui est déjà là. */
  if(typeof leconCompteDansLaFrise === 'function' &&
     leconCompteDansLaFrise(modeleCle) && !rangDuCours(c, eleve, modeleCle)){
    manque.push('le numéro de leçon');
  }

  return manque;
}

/* Le bouton dit ce qui manque, ou ne dit rien.

   Il portait un compte — « (1) » — et le détail en info-bulle. Une
   info-bulle ne se lit pas : il faut savoir qu'elle existe, et
   survoler. Le bouton NOMME donc ce qui manque, et ce qui est
   enregistré s'écrit juste en dessous, sur une ligne à part.
   C'est la seule question qu'on se pose devant cet écran. */
function majBoutonCompleter(){
  const eleve = ($('studentName') && $('studentName').value.trim()) || '';
  const modele = ($('modele') && $('modele').value) || '';

  /* SANS ÉLÈVE, RIEN À COMPLÉTER.

     L'écran vide affichait « Il manque la formation, la frise et le
     numéro de leçon » : c'est vrai de personne. Le bouton réclamait
     des informations sur un élève que le moniteur n'avait pas
     encore choisi.

     Deux mots au moins, comme partout ailleurs : un prénom seul en
     cours de frappe n'est pas encore un élève. */
  const connu = eleve.length >= 3 && eleve.split(/\s+/).length >= 2;
  const manque = connu ? cequiManqueAuCours(contexteDepart, eleve, modele) : [];

  document.querySelectorAll('[data-completer]').forEach(b => {
    b.style.display = connu ? '' : 'none';
    if(manque.length){
      b.textContent = '📋 Il manque ' + manque.join(' et ');
      b.title = 'Ouvrir le questionnaire';
      b.style.color = 'var(--red)';
      b.style.borderColor = 'var(--red)';
      b.style.fontWeight = '700';
    }else{
      b.textContent = '📋 Compléter les infos';
      b.title = 'Revoir la formation, la frise, les examens';
      b.style.color = '';
      b.style.borderColor = '';
      b.style.fontWeight = '';
    }

    /* Ce qui EST enregistré, sous le bouton : le moniteur voit
       l'état de l'élève sans rien ouvrir. Une ligne par bouton,
       posée une fois et remise à jour ensuite. */
    let ligne = b.nextElementSibling;
    if(!ligne || !ligne.dataset || ligne.dataset.recapCompleter !== '1'){
      ligne = document.createElement('div');
      ligne.dataset.recapCompleter = '1';
      ligne.style.cssText = 'flex-basis:100%;font-size:11px;color:var(--muted);' +
        'line-height:1.5;margin-top:2px;';
      if(b.parentNode) b.parentNode.insertBefore(ligne, b.nextSibling);
    }

    const fiche = (connu && typeof ficheDe === 'function') ? ficheDe(eleve) : null;
    const su = connu
      ? recapDuCours(contexteDepart, eleve, modele, fiche)
          .filter(x => !x.manque).map(x => x.icone + ' ' + x.valeur)
      : [];
    ligne.textContent = su.length ? su.join(' · ') : '';
  });
}

/* Construit la rangée de boutons sous un champ de note */
function creerRaccourcis(idConteneur, idChamp){
  const zone = $(idConteneur);
  if(!zone) return;
  zone.innerHTML = '';
  RACCOURCIS_NOTE.forEach(r => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'raccourci';
    b.textContent = r.libelle;
    if(r.special === 'questionnaire') b.dataset.completer = '1';
    b.addEventListener('click', async () => {
      let texte;
      if(r.special === 'questionnaire'){
        b.disabled = true;
        b.textContent = '…';
        try{
          const rep = await ouvrirQuestionnaireDepart(contexteDepart, 'Compléter les infos', 'Valider');
          if(rep){
            contexteDepart = rep;
            afficherSaisieDuJour(rep);
            appliquerNoteQuestionnaire(noteDepuisQuestionnaire(rep));
          }
        }finally{
          b.disabled = false;
          b.textContent = r.libelle;
          majBoutonCompleter();
        }
      }
      if(texte) ajouterANote($(idChamp), texte);   /* inutilisé : le questionnaire écrit lui-même */
    });
    zone.appendChild(b);
  });
  majBoutonCompleter();
}


/* ---------- Historique affiché dès la saisie de l'élève ---------- */
/* minuteurHistorique : déclaré dans ec-etat.js */
/* derniereBoiteEleve : déclaré dans ec-etat.js */
/* dernierEleveCharge : déclaré dans ec-etat.js */

function planifierHistorique(){
  clearTimeout(minuteurHistorique);
  /* On attend que le moniteur ait fini de taper : une recherche
     par lettre saturerait Sheets pour rien. */
  minuteurHistorique = setTimeout(() => {
    /* Le bouton apparaît avec l'élève et dit ce qui lui manque :
       il n'a rien à annoncer tant qu'on ne sait pas de qui on
       parle. */
    if(typeof majBoutonCompleter === 'function') majBoutonCompleter();
    if(typeof majEtatMailEleve === 'function') majEtatMailEleve();
    chargerHistoriqueEleve();
    /* Et ce qui a été préparé pour ce cours, s'il y a une préparation */
    if(typeof afficherPreparationEleve === 'function') afficherPreparationEleve();
  }, 700);
}

async function chargerHistoriqueEleve(){
  const zone = $('historiqueEleve');
  if(!zone) return;
  const nom = $('studentName').value.trim();

  if(nom.length < 3){
    zone.style.display = 'none';
    zone.innerHTML = '';
    dernierEleveCharge = '';
    derniereBoiteEleve = '';
    if($('alerteBoite')) $('alerteBoite').style.display = 'none';
    return;
  }
  if(normaliserMot(nom) === dernierEleveCharge) return;   /* déjà affiché */
  dernierEleveCharge = normaliserMot(nom);

  zone.style.display = 'block';
  zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">Recherche des cours précédents…</div>';

  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      /* Texte complet : la fiche véhicule s'y trouve */
      body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nom })
    });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json().catch(() => ({}));
    const res = (data && data.resultats) || [];

    if(!res.length){
      zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">Aucun cours précédent pour cet élève.</div>';
      return;
    }

    /* Boîte de l'élève, pour vérifier que le modèle correspond */
    let boiteEleve = '';
    res.forEach(it => {
      if(!boiteEleve && it.boite) boiteEleve = String(it.boite).toLowerCase();
      if(!boiteEleve && /automatique/i.test(it.type || '')) boiteEleve = 'bea';
      if(!boiteEleve && /manuelle/i.test(it.type || '')) boiteEleve = 'bv';
    });
    verifierBoiteModele(boiteEleve);
    derniereBoiteEleve = boiteEleve;

    const dernier = res[0];
    const note = (dernier.note || '').trim();

    zone.innerHTML = '';
    const carte = document.createElement('div');
    carte.style.cssText = 'border:1px solid ' + (note ? 'var(--orange)' : 'var(--line)') +
      ';border-radius:12px;padding:12px 14px;background:' +
      (note ? 'rgba(182,255,14,.08)' : 'transparent') + ';';

    const titre = document.createElement('div');
    titre.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;';
    titre.textContent = res.length + ' cours précédent' + (res.length > 1 ? 's' : '') +
      ' · dernier le ' + (dateEnToutesLettres(dateFrVersIso(dernier.date)) || dernier.date || '?') +
      (dernier.moniteur ? ' avec ' + dernier.moniteur : '');
    carte.appendChild(titre);

    /* La note du moniteur précédent : frise, examen blanc, date
       d'examen. C'est ce que le moniteur doit voir en premier. */
    if(note){
      const n = document.createElement('div');
      n.style.cssText = 'font-size:15px;font-weight:600;color:var(--accent-text);' +
        'line-height:1.45;white-space:pre-wrap;margin-bottom:10px;';
      n.textContent = '📌 ' + note;
      carte.appendChild(n);
    }else{
      const n = document.createElement('div');
      n.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;';
      n.textContent = 'Pas de note laissée par le moniteur précédent.';
      carte.appendChild(n);
    }

    /* Puis la fiche véhicule, avec les émojis des moniteurs */
    const sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0;';
    carte.appendChild(sep);
    carte.appendChild(blocFicheVehiculeEleve(res));

    const lien = document.createElement('button');
    lien.type = 'button';
    lien.className = 'btn btn-secondary';
    lien.style.cssText = 'margin-top:10px;font-size:13px;padding:9px 12px;';
    lien.textContent = '👁️ Voir le dernier bilan';
    lien.addEventListener('click', () => {
      currentLessonMeta = {
        modeleLabel: dernier.type, studentName: dernier.eleve, monitorName: dernier.moniteur,
        site: dernier.site, dateStr: dernier.date, noteInterne: dernier.note || '', ts: Date.now()
      };
      $('resultText').value = dernier.bilan;
      afficherNote(dernier.note);
      marquerExport(true);
      $('recordView').style.display = 'none';
      $('resultView').style.display = 'block';
      window.scrollTo(0, 0);
    });
    carte.appendChild(lien);

    zone.appendChild(carte);
  }catch(e){
    zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">Historique indisponible.</div>';
  }
}

/* ============================================================
   FICHE VÉHICULE DE L'ÉLÈVE
   Ce que le moniteur a besoin de savoir avant de partir : quelles
   manœuvres sont validées, par qui, et lesquelles restent à faire.
   ============================================================ */
function blocFicheVehiculeEleve(bilans, toutAfficher){
  const d = document.createElement('div');

  /* On part du plus récent : ses marques sont les plus complètes */
  let marques = {};
  (bilans || []).slice().reverse().forEach(item => {
    const m = (typeof marquesDejaPosees === 'function')
      ? marquesDejaPosees(item.bilan) : {};
    Object.keys(m).forEach(k => { marques[k] = m[k]; });
  });

  const liste = (typeof BLOC !== 'undefined' && BLOC.ficheListeConduite)
    ? BLOC.ficheListeConduite : [];

  const faites = [];
  const restantes = [];
  liste.forEach(libelle => {
    const cle = normaliserMot(libelle);
    if(marques[cle]) faites.push({ nom: libelle, marque: marques[cle] });
    else restantes.push(libelle);
  });

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:6px;';
  t.textContent = '🦉 Fiche véhicule — ' + faites.length + ' sur ' + liste.length;
  d.appendChild(t);

  if(!faites.length){
    const v = document.createElement('div');
    v.style.cssText = 'font-size:13px;color:var(--muted);';
    v.textContent = 'Aucune manœuvre validée pour le moment.';
    d.appendChild(v);
    return d;
  }

  const z = document.createElement('div');
  z.style.cssText = 'font-size:13px;line-height:1.7;';
  faites.forEach(x => {
    const l = document.createElement('div');
    l.innerHTML = '<span style="color:var(--cream);">' +
      x.nom.replace(/</g, '&lt;') + '</span> ' +
      '<span style="letter-spacing:1px;">' + x.marque + '</span>';
    z.appendChild(l);
  });
  d.appendChild(z);

  /* Ce qui reste : déplié quand on prépare un cours, replié sinon */
  if(restantes.length){
    if(toutAfficher){
      const t2 = document.createElement('div');
      t2.style.cssText = 'font-size:12px;color:var(--muted);margin:8px 0 3px;font-weight:700;';
      t2.textContent = '❓ Reste à travailler — ' + restantes.length;
      d.appendChild(t2);

      const r = document.createElement('div');
      r.style.cssText = 'font-size:13px;color:var(--muted);line-height:1.7;';
      restantes.forEach(x => {
        const l = document.createElement('div');
        l.textContent = '· ' + x;
        r.appendChild(l);
      });
      d.appendChild(r);
    }else{
      const det = document.createElement('details');
      det.style.marginTop = '8px';
      det.innerHTML = '<summary style="cursor:pointer;font-size:12px;color:var(--muted);">' +
        '❓ ' + restantes.length + ' manœuvre(s) restante(s)</summary>';
      const r = document.createElement('div');
      r.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.7;margin-top:4px;';
      r.textContent = restantes.join(' · ');
      det.appendChild(r);
      d.appendChild(det);
    }
  }

  return d;
}

/* ============================================================
   FICHE VÉHICULE DANS LE QUESTIONNAIRE
   Le moniteur complète ce qui a été acquis pendant son cours.
   Ce qu'il ajoute porte son émoji, comme dans le bilan.
   ============================================================ */
function remplirFicheQuestionnaire(marquesAvant, dejaCochees, dejaAilleurs){
  const zone = $('qFiche');
  if(!zone) return;

  const marques = marquesAvant || {};
  zone.innerHTML = '';

  /* La colonne 🚗 a sa largeur fixe, la même sur toutes les lignes :
     sans elle les cases se décalaient au gré de la longueur des
     libellés, et on ne savait plus quelle case allait avec quoi. */
  const LARGEUR_AILLEURS = '42px';

  /* L'en-tête : deux « tout cocher », un par colonne. Cocher
     dix-neuf cases une par une est absurde, et ça l'est deux fois
     plus pour un élève repris qui arrive avec la fiche à moitié
     faite. */
  const tout = document.createElement('div');
  tout.style.cssText = 'display:flex;align-items:center;gap:9px;padding:4px 0 8px;' +
    'margin:0 0 6px;border-bottom:1px solid var(--line);';

  const gauche = document.createElement('label');
  gauche.style.cssText = 'display:flex;align-items:center;gap:9px;flex:1;min-width:0;' +
    'font-size:14px;text-transform:none;margin:0;font-weight:700;' +
    'color:var(--accent-text);cursor:pointer;';
  const cbTout = document.createElement('input');
  cbTout.type = 'checkbox';
  cbTout.style.cssText = 'width:17px;height:17px;flex-shrink:0;';
  cbTout.addEventListener('change', () => {
    zone.querySelectorAll('.qManoeuvre').forEach(x => { x.checked = cbTout.checked; });
  });
  gauche.appendChild(cbTout);
  const tt = document.createElement('span');
  tt.textContent = 'Tout cocher';
  gauche.appendChild(tt);
  tout.appendChild(gauche);

  const droite = document.createElement('label');
  droite.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;' +
    'width:' + LARGEUR_AILLEURS + ';flex-shrink:0;font-size:14px;text-transform:none;' +
    'margin:0;font-weight:700;color:var(--accent-text);cursor:pointer;';
  droite.title = "Tout cocher — déjà fait dans une autre auto-école";
  const cbToutAilleurs = document.createElement('input');
  cbToutAilleurs.type = 'checkbox';
  cbToutAilleurs.style.cssText = 'width:17px;height:17px;flex-shrink:0;';
  cbToutAilleurs.addEventListener('change', () => {
    zone.querySelectorAll('.qAilleurs').forEach(x => {
      /* Une manœuvre qui porte déjà la 🚗 d'un bilan précédent n'est
         pas décochable : sa marque est écrite, on ne la reprend pas. */
      if(x.disabled) return;
      x.checked = cbToutAilleurs.checked;
    });
  });
  droite.appendChild(cbToutAilleurs);
  const dt = document.createElement('span');
  dt.style.cssText = 'font-size:13px;line-height:1;';
  dt.textContent = '🚗';
  droite.appendChild(dt);
  tout.appendChild(droite);

  zone.appendChild(tout);

  /* Ce qu'est la colonne 🚗, écrit une fois en toutes lettres :
     l'émoji seul en tête de colonne ne dit rien à qui ouvre
     l'écran pour la première fois. */
  const legende = document.createElement('div');
  legende.style.cssText = 'font-size:11px;color:var(--muted);line-height:1.4;' +
    'margin:0 0 8px;';
  legende.textContent = '🚗 = autre auto-école';
  zone.appendChild(legende);

  /* Ce que le moniteur avait coché à la préparation, ou plus tôt
     dans ce cours : sans ça, rouvrir le questionnaire effaçait tout
     et le travail du collègue était perdu. */
  const cochees = (dejaCochees || []).map(x => normaliserMot(x));
  const ailleurs = (dejaAilleurs || []).map(x => normaliserMot(x));

  (BLOC.ficheListeConduite || []).forEach(libelle => {
    const cle = normaliserMot(libelle);
    const deja = marques[cle] || '';
    const cochee = cochees.indexOf(cle) !== -1;
    /* La 🚗 déjà inscrite dans un bilan précédent : la case la
       montre, mais on n'y retouche pas. */
    const ailleursAcquis = deja.indexOf(MARQUE_AILLEURS) !== -1;
    const ailleursCochee = ailleurs.indexOf(cle) !== -1;

    /* La ligne n'est plus un seul <label> : deux cases dans un même
       label, et cliquer sur la 🚗 basculait aussi la première. */
    const ligne = document.createElement('div');
    ligne.style.cssText = 'display:flex;align-items:center;gap:9px;padding:4px 0;';

    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:9px;flex:1;min-width:0;' +
      'font-size:14px;text-transform:none;margin:0;font-weight:400;cursor:pointer;' +
      'color:' + (deja ? 'var(--muted)' : 'var(--cream)') + ';';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'qManoeuvre';
    cb.value = libelle;
    cb.checked = !!deja || cochee;
    cb.style.cssText = 'width:17px;height:17px;flex-shrink:0;';
    l.appendChild(cb);

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    t.textContent = libelle;
    l.appendChild(t);

    if(deja){
      const m = document.createElement('span');
      m.style.cssText = 'flex-shrink:0;letter-spacing:1px;';
      m.textContent = deja;
      l.appendChild(m);
    }

    ligne.appendChild(l);

    const la = document.createElement('label');
    la.style.cssText = 'display:flex;align-items:center;justify-content:center;' +
      'width:' + LARGEUR_AILLEURS + ';flex-shrink:0;margin:0;padding:0;cursor:pointer;';
    la.title = libelle + " — déjà fait dans une autre auto-école";
    const cba = document.createElement('input');
    cba.type = 'checkbox';
    cba.className = 'qAilleurs';
    cba.value = libelle;
    cba.checked = ailleursAcquis || ailleursCochee;
    cba.disabled = ailleursAcquis;
    cba.style.cssText = 'width:17px;height:17px;flex-shrink:0;' +
      (ailleursAcquis ? 'opacity:.55;' : '');
    la.appendChild(cba);
    ligne.appendChild(la);

    zone.appendChild(ligne);
  });
}

/* Ce que le moniteur vient de cocher en plus */
function manoeuvresAjouteesQuestionnaire(marquesAvant){
  const marques = marquesAvant || {};
  const ajoutees = [];
  document.querySelectorAll('.qManoeuvre').forEach(cb => {
    if(!cb.checked) return;
    if(marques[normaliserMot(cb.value)]) return;   /* déjà validée */
    ajoutees.push(cb.value);
  });
  return ajoutees;
}

/* Ce qui a été fait dans une autre auto-école. Séparé des ajouts du
   jour : ces manœuvres reçoivent la 🚗, pas l'émoji du moniteur. */
function manoeuvresAilleursQuestionnaire(marquesAvant){
  const marques = marquesAvant || {};
  const liste = [];
  document.querySelectorAll('.qAilleurs').forEach(cb => {
    if(!cb.checked) return;
    /* Déjà marquée 🚗 dans un bilan précédent : rien à réécrire */
    const deja = marques[normaliserMot(cb.value)] || '';
    if(deja.indexOf(MARQUE_AILLEURS) !== -1) return;
    liste.push(cb.value);
  });
  return liste;
}

/* Le dossier de l'élève sous le champ de préparation : même bloc
   que pour un cours, pour préparer en connaissance de cause. */
async function chargerHistoriquePrep(){
  const zone = $('prepHistorique');
  const nom = $('prepEleve') ? $('prepEleve').value.trim() : '';
  if(!zone) return;

  if(nom.length < 3){ zone.style.display = 'none'; zone.innerHTML = ''; return; }

  zone.style.display = 'block';
  zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">Lecture du dossier…</div>';

  try{
    const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nom })
    });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json().catch(() => ({}));
    const res = (data && data.resultats) || [];

    zone.innerHTML = '';
    if(!res.length){
      zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">' +
        'Aucun cours précédent pour cet élève.</div>';
      return;
    }

    const dernier = res[0];
    const carte = document.createElement('div');
    carte.style.cssText = 'border:1px solid var(--line);border-radius:12px;padding:12px 14px;';

    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;';
    t.textContent = res.length + ' cours précédent' + (res.length > 1 ? 's' : '') +
      ' · dernier le ' + (dateEnToutesLettres(dateFrVersIso(dernier.date)) || dernier.date || '?') +
      (dernier.moniteur ? ' avec ' + dernier.moniteur : '');
    carte.appendChild(t);

    const note = (dernier.note || '').trim();
    const n = document.createElement('div');
    if(note){
      n.style.cssText = 'font-size:15px;font-weight:600;color:var(--accent-text);' +
        'line-height:1.45;white-space:pre-wrap;margin-bottom:10px;';
      n.textContent = '📌 ' + note;
    }else{
      n.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;';
      n.textContent = 'Pas de note laissée par le moniteur précédent.';
    }
    carte.appendChild(n);

    const sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0;';
    carte.appendChild(sep);
    /* Déplié : on prépare un cours, on veut voir ce qui reste */
    carte.appendChild(blocFicheVehiculeEleve(res, true));

    zone.appendChild(carte);
  }catch(e){
    zone.innerHTML = '<div style="font-size:13px;color:var(--muted);">' +
      'Dossier indisponible : ' + e.message.replace(/</g, '&lt;') + '</div>';
  }
}

/* ============================================================
   ALLÈGEMENT DU QUESTIONNAIRE DE FIN DE COURS
   En début de cours on renseigne le dossier ; en fin de cours on
   ne fait que corriger ce qui a bougé. Les champs administratifs
   n'ont plus rien à y faire : le moniteur est pressé, l'élève
   attend, et chaque champ inutile est une chance d'erreur.
   ============================================================ */
function allegerQuestionnaireFin(boite, prec){
  if(!boite) return [];

  /* Tout ce qu'on masque ici est RENDU à l'appelant.

     Un champ masqué revient vide du formulaire. Si personne ne
     déclare qu'il n'a pas été posé, ce vide est pris pour une
     réponse et écrase ce qu'on savait. Le questionnaire de fin
     effaçait ainsi, à chaque cours, les rendez-vous pédagogiques,
     l'écoute pédagogique, et — depuis que la fiche les porte — le
     coussin et la conduite aménagée de l'élève. */
  const masques = [];

  /* Masque un champ et l'étiquette qui le précède */
  const cacher = sel => {
    masques.push(sel);
    const e = boite.querySelector(sel);
    if(!e) return;
    /* Une case à cocher vit dans son étiquette : on masque celle-ci */
    const cible = (e.type === 'checkbox' && e.closest('label')) ? e.closest('label') : e;
    const avant = cible.previousElementSibling;
    if(avant && avant.tagName === 'LABEL' && avant.getAttribute('for')) avant.style.display = 'none';
    cible.style.display = 'none';
  };

  /* Conduite aménagée : se décide à l'inscription, jamais après un cours */
  cacher('#qHandicap');
  cacher('#qCoussin');
  const zh = boite.querySelector('#qZoneHandicap');
  if(zh) zh.style.display = 'none';
  masques.push('#qZoneHandicap');

  /* L'ANTS est traité avec les autres coordonnées manquantes :
     l'ancienne règle isolée masquait le champ sans son bloc. */

  /* Frise et numéro de leçon : renseignés au départ */
  ['#qFriseClassique', '#qFriseFixe', '#qBlocAacCs'].forEach(s => {
    masques.push(s);
    const e = boite.querySelector(s);
    if(!e) return;
    const avant = e.previousElementSibling;
    if(avant && avant.tagName === 'LABEL') avant.style.display = 'none';
    e.style.display = 'none';
    const apres = e.nextElementSibling;
    if(apres && apres.style && apres.style.fontSize === '12px') apres.style.display = 'none';
  });
  cacher('#qLecon');
  cacher('#qLeconDepuis');

  /* L'écoute pédagogique se décide en préparant la journée de permis.
     Deux noms pour la même chose selon l'écran — la case et son
     bloc : on déclare les deux, sinon la réponse ne se retrouve
     pas et le vide gagne. */
  cacher('#qPasEcoute');
  masques.push('#qBlocEcoutes');

  return masques;
}

/* Ce que le moniteur corrige dans le questionnaire redescend sur la
   fiche de l'élève. Sans ça, le bureau et les moniteurs entretiennent
   deux vérités différentes sur le même élève. */
async function majFicheDepuisQuestionnaire(eleve, reponses, ficheAvant){
  if(!eleve || typeof appelPrep !== 'function') return;

  const avant = ficheAvant || {};
  const maj = {};

  /* Le suivi des écoutes se tient tout seul, d'après la case du
     questionnaire : personne n'aurait tenu la liste à la main. */
  if(typeof majEcouteDepuisQuestionnaire === 'function'){
    majEcouteDepuisQuestionnaire(eleve, !!reponses.pasEcoute);
  }

  if(reponses.ants && reponses.ants !== (avant.ants || '')) maj.ants = reponses.ants;
  if(reponses.messenger && reponses.messenger !== (avant.messenger || '')){
    maj.messenger = reponses.messenger;
  }
  if(reponses.email && reponses.email !== (avant.email || '')){
    maj.email = reponses.email;
  }
  if(reponses.frise && reponses.frise !== (avant.frise || '')) maj.frise = reponses.frise;

  /* La formation choisie au questionnaire redescend au répertoire :
     c'est la même information, elle ne doit pas exister en deux
     versions. Un élève passé en AAC en cours de route était jusqu'ici
     corrigé à la main, cours après cours. */
  if(reponses.formation && reponses.formation !== (avant.formation || '')){
    maj.formation = reponses.formation;
  }

  /* Le poste de conduite descend aussi — et lui doit pouvoir se
     DÉCOCHER : un élève qui n'a plus besoin du coussin doit
     pouvoir le perdre. D'où 'non' et non '' : côté serveur le vide
     veut dire « le formulaire n'en parlait pas », pas « non ».

     Ces deux-là sont des faits de l'ÉLÈVE, pas du cours. C'est
     pour ça qu'ils vivent sur la fiche : posés une fois, ils
     reviennent sur toutes ses cartes sans qu'on les recoche. */
  [['handicap', 'amenagee'], ['coussin', 'coussin']].forEach(([q, f]) => {
    if(reponses[q] === undefined) return;
    const v  = (reponses[q] === 'oui') ? 'oui' : 'non';
    const av = (String(avant[f] || '') === 'oui') ? 'oui' : 'non';
    if(v !== av) maj[f] = v;
  });

  /* La liste des aménagements descend avec la case : cochés, ils
     rejoignent la fiche ; retirés, ils la quittent. */
  if(Array.isArray(reponses.amenagements)){
    const liste = reponses.amenagements.join('|');
    const av = String(avant.amenagements || '');
    if(liste !== av) maj.amenagements = liste || 'non';
  }

  if(!Object.keys(maj).length) return;

  return enregistrerFicheEleve(eleve, maj);
}

/* CE QUI ÉCHOUE ICI DOIT SE VOIR.

   Cette écriture ne disait rien quand elle ratait : un
   console.warn, et le questionnaire se refermait comme si tout
   s'était bien passé. Le moniteur repartait convaincu d'avoir
   enregistré la formation et la frise de son élève. Elles étaient
   perdues, et personne ne l'apprenait — ni lui, ni le bureau.

   On insiste trois fois, à une seconde puis quatre : la coupure
   d'un tunnel dure rarement plus. Si ça ne passe toujours pas, on
   le dit, et on propose de réessayer.

   La reprise repart de `maj` — ce qu'il faut écrire — et non des
   réponses du questionnaire : les retraduire une seconde fois
   serait l'occasion de les traduire autrement. */
async function enregistrerFicheEleve(eleve, maj){
  const attendre = ms => new Promise(r => setTimeout(r, ms));
  let dernierEchec = null;

  for(const pause of [0, 1000, 4000]){
    if(pause) await attendre(pause);
    try{
      await appelPrep(Object.assign({ action: 'ficheSet', eleve: eleve }, maj));
      /* La fiche en mémoire suit, sinon l'écran afficherait l'ancienne */
      const f = (typeof ficheDe === 'function') ? ficheDe(eleve) : null;
      if(f) Object.assign(f, maj);
      return true;
    }catch(e){ dernierEchec = e; }
  }

  console.warn('Fiche non mise à jour :', dernierEchec);
  const encore = await direFicheNonEnregistree(eleve, maj, dernierEchec);
  return encore ? enregistrerFicheEleve(eleve, maj) : false;
}

/* Ce qui n'est pas passé, nommé — « la formation, la frise » — et
   non « des informations » : le moniteur doit savoir quoi
   ressaisir s'il renonce. */
const NOMS_CHAMPS_FICHE = {
  ants: 'le numéro ANTS', messenger: 'le nom Messenger', email: "l'adresse mail",
  frise: 'la frise', formation: 'la formation', amenagee: 'la conduite aménagée',
  coussin: 'le coussin', amenagements: 'les aménagements'
};

async function direFicheNonEnregistree(eleve, maj, erreur){
  const quoi = Object.keys(maj).map(k => NOMS_CHAMPS_FICHE[k] || k);
  const liste = quoi.length > 1
    ? quoi.slice(0, -1).join(', ') + ' et ' + quoi[quoi.length - 1]
    : (quoi[0] || 'ces informations');

  const message =
    'Sur la fiche de ' + eleve + ', ' + liste +
    " n'a pas pu être enregistré.\n\n" +
    'Ce que tu as répondu reste dans ce cours — rien de perdu ici. ' +
    "Mais la fiche de l'élève, elle, n'a pas changé : les prochains " +
    'cours ne le sauront pas.\n\n' +
    (erreur && erreur.message ? '(' + erreur.message + ')' : '');

  if(typeof fenetre !== 'function'){
    if(typeof showToast === 'function') showToast('⚠️ Fiche non enregistrée');
    return false;
  }
  return await fenetre(message, [
    { nom: 'Tant pis', valeur: false },
    { nom: '🔄 Réessayer', valeur: true, principal: true }
  ], '⚠️ Fiche non enregistrée') === true;
}

/* ============================================================
   CE QUE LE MONITEUR VIENT DE RENSEIGNER

   Un cours non préparé n'a pas de cadre sous le nom de l'élève.
   Après le questionnaire, on y affiche ses réponses et la fiche
   véhicule détaillée : il voit ce qui reste à faire avant de
   démarrer, sans rouvrir quoi que ce soit.
   ============================================================ */
async function afficherSaisieDuJour(rep, cible){
  /* Le bilan manuel s'ouvre dans un autre écran : il a son propre
     emplacement, sinon le cadre resterait sur l'écran masqué. */
  const zone = $(cible || 'saisieDuJour');
  if(!zone || !rep) return;

  const eleve = $('studentName') ? $('studentName').value.trim() : '';
  if(!eleve) return;

  zone.innerHTML = '';
  const carte = document.createElement('div');
  carte.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:12px 14px;background:rgba(182,255,14,.08);';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;';
  t.textContent = '📝 Ce que tu viens de renseigner';
  carte.appendChild(t);

  /* La consigne d'écoute, mise en avant comme dans la préparation */
  if(rep.pasEcoute){
    const a = document.createElement('div');
    a.style.cssText = 'font-size:14px;font-weight:700;color:var(--warn-text);margin-bottom:6px;';
    a.textContent = "🚫 Pas d'écoutes pédagogiques";
    carte.appendChild(a);
  }

  const note = noteDepuisQuestionnaire(rep);
  const n = document.createElement('div');
  if(note){
    n.style.cssText = 'font-size:15px;font-weight:600;color:var(--accent-text);' +
      'line-height:1.45;white-space:pre-wrap;';
    n.textContent = note;
  }else{
    n.style.cssText = 'font-size:13px;color:var(--muted);';
    n.textContent = 'Aucune information particulière.';
  }
  carte.appendChild(n);

  /* La fiche véhicule : ce qui est acquis, ce qui reste */
  const cochees = rep.manoeuvresAjoutees || [];
  /* Fait ailleurs = fait : le compteur dit ce qui reste à
     travailler, pas ce qui a été travaillé chez nous. */
  const cocheesAilleurs = rep.manoeuvresAilleurs || [];
  let marques = {};
  try{
    const d = await chargerDossierEleve(eleve);
    marques = (d && d.marques) || {};
  }catch(e){ /* hors ligne : sans les émojis */ }

  const faites = (BLOC.ficheListeConduite || []).filter(
    x => cochees.indexOf(x) !== -1 || cocheesAilleurs.indexOf(x) !== -1 ||
         marques[normaliserMot(x)]);
  const restantes = (BLOC.ficheListeConduite || []).filter(
    x => faites.indexOf(x) === -1);

  const sep = document.createElement('div');
  sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0;';
  carte.appendChild(sep);

  const t2 = document.createElement('div');
  t2.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:4px;';
  t2.textContent = '🦉 Fiche véhicule — ' + faites.length + ' sur ' +
                   (BLOC.ficheListeConduite || []).length;
  carte.appendChild(t2);

  if(faites.length){
    const l = document.createElement('div');
    l.style.cssText = 'font-size:13px;line-height:1.7;';
    faites.forEach(x => {
      /* La marque écrite si elle existe ; sinon celle que ce
         questionnaire vient de poser — 🚗 pour ce qui vient d'une
         autre auto-école, la coche pour le reste. */
      const m = marques[normaliserMot(x)] ||
        (cocheesAilleurs.indexOf(x) !== -1 ? MARQUE_AILLEURS : '✅');
      const li = document.createElement('div');
      li.innerHTML = '· ' + x.replace(/</g, '&lt;') +
        ' <span style="letter-spacing:1px;">' + m + '</span>';
      l.appendChild(li);
    });
    carte.appendChild(l);
  }

  if(restantes.length){
    const t3 = document.createElement('div');
    t3.style.cssText = 'font-size:13px;font-weight:700;color:var(--warn-text);margin:10px 0 4px;';
    t3.textContent = '❓ Reste à travailler — ' + restantes.length;
    carte.appendChild(t3);

    const r = document.createElement('div');
    r.style.cssText = 'font-size:13px;color:var(--muted);line-height:1.7;';
    restantes.forEach(x => {
      const li = document.createElement('div');
      li.textContent = '· ' + x;
      r.appendChild(li);
    });
    carte.appendChild(r);
  }

  zone.appendChild(carte);
  zone.style.display = 'block';
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-questionnaire.js'] = true;
