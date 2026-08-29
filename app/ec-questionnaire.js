/* Déployé le 29/08/2026 à 21:05 — v696 */
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

/* Ce cours fait-il avancer le compteur de leçons ?

   Un rendez-vous pédagogique porte le libellé « AAC — … » sans être
   une leçon de conduite : le compter décalait la frise de tous les
   élèves en conduite accompagnée. C'est la même règle que
   leconCompteDansLaFrise, appliquée au libellé au lieu de la clé —
   dans le classeur, c'est le libellé qui est écrit. */
function estUneLecon(type){
  const t = String(type || '');
  if(!/^Conduite/i.test(t) && !/^AAC/i.test(t)) return false;
  return !/rendez-vous|rvp/i.test(t);
}

/* Une seule requête pour tout ce dont le questionnaire a besoin */
async function chargerDossierEleve(nomEleve){
  const vide = { frise: '', lecons: null, manoeuvres: [], marques: {}, derniereNote: '',
                 leconsDepuisEB: null, leconsDepuisRdvPost: null,
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
    /* Le premier résultat est le plus récent */
    const dernier = res[0] || {};

    res.forEach(item => {
      if(!frise) frise = extraireFrise(item.note) || extraireFriseTexte(item.bilan);
      if(estUneLecon(item.type)) lecons++;
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

    const resultat = { frise: frise, lecons: lecons, manoeuvres: manoeuvres,
                       marques: marques,
                       leconsDepuisEB: apres(RE_TYPE_EXAMEN_BLANC),
                       leconsDepuisRdvPost: apres(RE_TYPE_RDV_POST),
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

function defautsDepuisNote(note){
  note = noteEnClair(note);
  const a = analyserNote(note);
  const d = {};
  if(a.examBlanc){
    d.examBlanc = a.examBlanc;
    if(a.examBlancN !== null) d.examBlancN = String(a.examBlancN);
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
                         'leconsDepuisEB', 'leconsDepuisRdvPost'];

/* Fusionne : le jugement du moniteur l'emporte, les faits sont rafraîchis */
function fusionnerContexte(saisi, defauts){
  const out = Object.assign({}, defauts || {});
  Object.keys(saisi || {}).forEach(k => {
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
function noteSelonLaFormation(note, formation){
  const sans = sansObjetPourLaFormation(formation);
  if(!sans.length) return String(note || '');

  /* Les familles que ce parcours n'a pas. On les nomme par leur
     champ : « examBlanc » est aussi la clé de sa famille. */
  const familles = {};
  sans.forEach(c => { familles[c] = true; });
  if(sans.indexOf('examPermis') !== -1) familles.examenPermis = true;
  if(sans.indexOf('pasEcoute') !== -1) familles.ecoutes = true;

  return String(note || '').split('\n').map(l =>
    segmentsDeNote(l).filter(seg => {
      const f = familleDuSegment(seg);
      return !(f && familles[f.cle]);
    }).join(' · ')
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
  const propre = ancien ? nettoyerNote(ancien) : '';
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
    if(f) dits[f.cle] = s;
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
     ils seraient perdus autrement. */
  const restants = Object.keys(dits).filter(c => !vus[c]).map(c => dits[c]);
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
  { cle:'AAC BV',  boite:'BV',  modele:'aac-manuelle', frise:'aacbv',  aac:true },
  { cle:'AAC BEA', boite:'BEA', modele:'aac-auto',     frise:'aacbea', aac:true },
  { cle:'CS BV',   boite:'BV',  modele:'conduite-manuelle', frise:'csbv' },
  { cle:'CS BEA',  boite:'BEA', modele:'conduite-auto',     frise:'csbea' },
  /* B78 est le code porté sur un permis obtenu en boîte
     automatique : la passerelle mène au permis B, en manuelle.

     Elle n'a ni frise, ni examen blanc — l'élève a déjà son permis,
     il n'y a rien à blanchir — et l'écoute pédagogique du jour du
     permis n'a donc pas d'objet non plus. */
  { cle:'Passerelle BEA→BV', boite:'BV', modele:'conduite-manuelle', frise:'',
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
  if(/conduite supervisee/.test(t)) return { cle:'CS', suivreLaBoite:'cs' };
  if(/passerelle/.test(t)){
    return PARCOURS_FORMATION.find(p => /passerelle/i.test(p.cle));
  }
  return null;
}

/* La frise qu'impose une formation : une clé de FRISES_FIXES, ou
   la chaîne vide quand ce parcours n'a pas de frise, ou null quand
   elle se saisit à la main. */
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
  frise:         '#qFriseClassique',
  examBlanc:     '#qExamBlanc',
  examBlancN:    '#qExamBlancN',
  examBlancRang: '#qBlocEbRang',
  examBlancDate: '#qExamBlancDate',
  ebPasse:       '#qEBPasse',
  ebImpossibleLe:'#qExamBlanc',
  ebLecons:      '#qEBLecons',
  examPermis:    '#qExamPermis',
  examDate:      '#qExamDate',
  examPermisN:   '#qExamPermisN',
  nouvelleDate:  '#qNouvelleDate',
  examPassage:   '#qExamPassage',
  pasEcoute:     '#qBlocEcoutes',
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
  let actuel = champ.value.trim();

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
    ? assemblerNotePreparee(dejaLa.entete, dejaLa.corps, consigne)
    : actuel;
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


async function ouvrirQuestionnaireDepart(prec, titre, libelleValider){
  /* Un questionnaire déjà ouvert appartient au cours précédent : on
     le ferme au lieu d'ignorer la demande. Ignorer laissait le
     moniteur devant l'ancien élève en croyant avoir ouvert le
     nouveau. */
  if(questionnaireOuvert) fermerQuestionnaireOuvert();
  questionnaireOuvert = true;
  /* Filet : le verrou ne doit jamais rester bloqué */
  const secours = setTimeout(() => { questionnaireOuvert = false; }, 30000);
  try{
    return await construireQuestionnaire(prec, titre, libelleValider);
  }catch(e){
    questionnaireOuvert = false;
    console.error('Questionnaire :', e);
    await informer('Le questionnaire n\'a pas pu s\'ouvrir.\n\nDétail : ' + (e && e.message ? e.message : e));
    return null;
  }finally{
    clearTimeout(secours);
  }
}

async function construireQuestionnaire(prec, titre, libelleValider){
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
  }

  /* La frise saisie sur la fiche de l'élève fait autorité : elle a été
     posée une fois pour toutes, inutile de la redemander à chaque cours. */
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

  /* Trois sources, de la plus sûre à la plus générale : la
     formation, le dernier cours, la fiche de l'élève. Sans ce
     dernier recours, un dossier momentanément indisponible faisait
     perdre une frise pourtant enregistrée. */
  const frisePrecedente = friseDeduite || dossier.frise ||
                          (ficheEleve && ficheEleve.frise) || '';
  const compteDansLaFrise = leconCompteDansLaFrise(modeleCle);
  const faites = dossier.lecons;
  const rangDuJour = (faites === null) ? null
                                       : (compteDansLaFrise ? faites + 1 : faites);
  const manoeuvresAvant = dossier.manoeuvres || [];
  const totalManoeuvres = BLOC.ficheListeConduite.length;

  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';

    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(560px, 94vw);max-height:88vh;overflow-y:auto;';

    const restantes = totalManoeuvres - manoeuvresAvant.length;
    boite.innerHTML =
      '<h3>' + (titre || 'Avant de démarrer') + '</h3>' +
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

        '<div id="qBlocMessenger" style="display:none;">' +
          '<label for="qMessenger">💬 Messenger de l\'élève</label>' +
          '<input type="text" id="qMessenger" autocomplete="off" ' +
            'placeholder="Lien de sa conversation, ou pseudo">' +
        '</div>' +

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

      '<div id="qBlocLecon">' +
        '<label for="qLecon">Leçon n°</label>' +
        '<input type="text" id="qLecon" inputmode="numeric" placeholder="—">' +
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
        ? ['#qLecon', '#qExamBlanc', '#qExamBlancN', '#qExamPermis',
           '#qExamDate', '#qExamPermisN', '#qNouvelleDate', '#qLibExamDate',
           '#qLibNouvelleDate', '#qFinirFiche', '#qSimuNuit', '#qBlocAacCs',
           '#qFriseClassique', '#qFriseFixe', '#qFormation', '#qFormationEffet', '#qBlocEcoutes',
           '#qBlocEbDate', '#qBlocEbRang', '#qExamBlancDate', '#qEBPasse',
           '#qEBLecons', '#qFormAccomp', '#qRvPrealable', '#qExamPassage']
        : (profil === 'examen')
        ? ['#qLecon', '#qExamBlanc', '#qExamBlancN', '#qFinirFiche',
           '#qSimuNuit', '#qBlocAacCs', '#qFriseClassique', '#qFriseFixe']
        : ['#qLecon', '#qExamBlanc', '#qExamBlancN', '#qExamPermis', '#qExamDate',
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

    /* La formation choisie ici, ou celle du répertoire à défaut */
    function formationChoisie(){
      return (selForm && selForm.value) || formationDeLaFiche;
    }

    /* La frise imposée par la formation. Rend '' quand ce parcours
       n'en a pas (la passerelle), null quand elle se saisit. */
    function friseImposee(){
      return friseDeLaFormation(formationChoisie(), manuelleDuBilan);
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

      /* Formation accompagnateur et RDV préalable ne concernent que AAC et CS */
      if(blocAacCs && profil === 'complet'){
        blocAacCs.style.display = fixe ? 'block' : 'none';
      }

      /* Les rendez-vous pédagogiques, eux, n'existent qu'en AAC */
      const blocRvp = boite.querySelector('#qBlocRvp');
      if(blocRvp){
        const p = parcoursDeLaFormation(formationChoisie());
        blocRvp.style.display = (p && p.aac && profil === 'complet') ? 'block' : 'none';
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
        const base = prec.frise || frisePrecedente || '';
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
      const base = prec.frise || frisePrecedente;
      const av = leconsAvantExamenBlanc(base);
      const ap = leconsApresExamenBlanc(base);
      chAvant.value = av !== null ? av : '';
      /* Presque toujours 2 leçons après l'examen blanc */
      chApres.value = ap !== null ? ap : '2';

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
    if(/après ce cours/i.test(titre || '')) allegerQuestionnaireFin(boite, prec);

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

    const champMess = boite.querySelector('#qMessenger');
    const champMail = boite.querySelector('#qMail');

    const manque = {
      messenger: !((ficheEleve && ficheEleve.messenger) || ''),
      mail:      !((ficheEleve && ficheEleve.email) || ''),
      ants:      !((ficheEleve && ficheEleve.ants) || '') && !prec.ants
    };

    const montrer = (id, oui) => {
      const b = boite.querySelector(id);
      if(b) b.style.display = oui ? 'block' : 'none';
    };
    montrer('#qBlocMessenger', manque.messenger);
    montrer('#qBlocMail', manque.mail);
    montrer('#qBlocAnts', manque.ants);
    /* L'encadré entier disparaît si tout est déjà renseigné */
    /* Le mail du prescripteur se saisit au répertoire uniquement :
       c'est une donnée de dossier, pas quelque chose qu'on demande
       à l'élève au bord de la route. */
    montrer('#qBlocCoord', manque.messenger || manque.mail || manque.ants);

    if(champMess) champMess.value = prec.messenger || '';
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
      const avecDate = (v === 'prevu' || v === 'annule');

      dEP.style.display = avecDate ? 'block' : 'none';
      libDate.style.display = avecDate ? 'block' : 'none';
      libDate.textContent = (v === 'annule')
        ? "Date à laquelle l'examen était prévu"
        : "Date de l'examen";
      /* Pas de date du jour pour un examen annulé : elle est passée */
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
        frise: (imposee !== null)
          ? imposee
          : composerFrise(chAvant ? chAvant.value : '',
                          chApres ? chApres.value : ''),
        lecon: boite.querySelector('#qLecon').value.trim(),
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
        messenger: champMess ? champMess.value.trim() : '',
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
        /* Le rendez-vous post-permis n'est pas une question posée au
           moniteur : c'est le bureau qui le pose et le conclut. On
           le fait donc voyager tel qu'on l'a lu, sans quoi il
           disparaîtrait de la note au premier questionnaire. */
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
        rdvPost: prec.rdvPost || ''
      });
    });
  });
}

/* Le rang, à la française : « 1ère », puis « 2ème ». */
function rangLecon(n){
  return (n === 1) ? '1ère' : n + 'ème';
}

/* Le cours du jour fait-il avancer le compteur ?

   La question se pose deux fois : au moment de compter le rang
   global (déjà fait à la lecture du dossier) et au moment de
   compter dans la moitié de frise en cours. Les deux doivent
   répondre pareil, sinon le rang saute d'une leçon. */
function courtDansLaFrise(q){
  const n = parseInt(q.lecon, 10);
  const f = parseInt(q.leconsFaites, 10);
  if(!isNaN(n) && !isNaN(f)) return n === f + 1;
  if(q.modele) return leconCompteDansLaFrise(q.modele);
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

  const n = parseInt(q.lecon, 10);
  if(isNaN(n) || !n) return '';

  const plus = courtDansLaFrise(q) ? 1 : 0;
  const pl = k => (k > 1 ? 's' : '');

  /* Après le rendez-vous post-permis : ce sont ses heures qui font
     loi, pas la frise du permis d'origine. Elles s'annoncent en
     HEURES — c'est ainsi qu'elles ont été décidées ce jour-là. */
  const depuisRdv = parseInt(q.leconsDepuisRdvPost, 10);
  if(q.rdvPostFait === 'oui' && !isNaN(depuisRdv)){
    const r = depuisRdv + plus;
    const h = String(q.heuresRepassage || '').trim();
    return dire(rangLecon(r) + ' leçon après le post-permis' +
                (h ? ' (' + h + 'h prévues)' : ''));
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

    if(n < totalAacCs){
      return dire(rangLecon(n) + ' leçon — plus que ' + (totalAacCs - n) +
                  ' leçon' + pl(totalAacCs - n) + ' avant la fin de la fiche véhicule');
    }
    if(n === totalAacCs){
      return dire(rangLecon(n) + ' leçon — dernière de la fiche véhicule');
    }
    return dire(rangLecon(n) + ' leçon — fiche véhicule dépassée (' +
                totalAacCs + ' prévue' + pl(totalAacCs) + ')');
  }

  /* L'examen blanc est-il derrière nous ? */
  const ebPasse = (q.examBlanc === 'passe') || !!q.ebPasse;
  const depuisEB = parseInt(q.leconsDepuisEB, 10);

  if(ebPasse){
    const apres = leconsApresExamenBlanc(q.frise);
    const dit = (t) => dire(t + (apres ? ' (' + apres + ' prévue' + pl(apres) + ')' : ''));

    /* Sans le compte depuis l'examen blanc — historique trop court,
       examen blanc passé ailleurs — on ne raconte pas d'histoire :
       on dit le rang global et on s'arrête. */
    if(isNaN(depuisEB)) return dit(rangLecon(n) + " leçon après l'examen blanc");

    const r = depuisEB + plus;
    if(apres && r > apres){
      return dire(rangLecon(r) + " leçon après l'examen blanc — frise dépassée (" +
                  apres + ' prévue' + pl(apres) + ')');
    }
    return dit(rangLecon(r) + " leçon après l'examen blanc");
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
  const sansExamenBlanc = sans.indexOf('examBlanc') !== -1;
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
    etats.push(hEB ? tete + jourEB + ' — ' + hEB + ' + 3h'
             : n  ? tete + jourEB + ' — ' + n + ' leçon' + pl(n) + ' prévue' + pl(n) +
                    ' avant le permis (+ 3h avant examen)'
                  : tete + (jourEB || ' — déjà fait'));
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
        }
      }
      if(texte) ajouterANote($(idChamp), texte);   /* inutilisé : le questionnaire écrit lui-même */
    });
    zone.appendChild(b);
  });
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
  if(!boite) return;

  /* Masque un champ et l'étiquette qui le précède */
  const cacher = sel => {
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

  /* L'ANTS est traité avec les autres coordonnées manquantes :
     l'ancienne règle isolée masquait le champ sans son bloc. */

  /* Frise et numéro de leçon : renseignés au départ */
  ['#qFriseClassique', '#qFriseFixe', '#qBlocAacCs'].forEach(s => {
    const e = boite.querySelector(s);
    if(!e) return;
    const avant = e.previousElementSibling;
    if(avant && avant.tagName === 'LABEL') avant.style.display = 'none';
    e.style.display = 'none';
    const apres = e.nextElementSibling;
    if(apres && apres.style && apres.style.fontSize === '12px') apres.style.display = 'none';
  });
  cacher('#qLecon');

  /* L'écoute pédagogique se décide en préparant la journée de permis */
  cacher('#qPasEcoute');
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

  if(!Object.keys(maj).length) return;

  try{
    await appelPrep(Object.assign({ action: 'ficheSet', eleve: eleve }, maj));
    /* La fiche en mémoire suit, sinon l'écran afficherait l'ancienne */
    const f = (typeof ficheDe === 'function') ? ficheDe(eleve) : null;
    if(f) Object.assign(f, maj);
  }catch(e){
    console.warn('Fiche non mise à jour :', e);
  }
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
