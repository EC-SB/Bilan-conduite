/* ============================================================
   ec-messenger.js
   Générateur du message pour le groupe Messenger « jour du permis ».
   On choisit une date, on saisit les heures de passage, le message
   se compose seul.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   PLANNING DE LA JOURNÉE
   Les élèves alternent conduite et écoute, puis passent leur
   examen. Tout se déduit de l'heure du premier examen.
   ============================================================ */
const DUREE_CONDUITE  = 55;   /* minutes de conduite par élève */
const DUREE_EXAMEN    = 30;   /* durée d'un passage à l'examen */
/* Entre la fin des conduites et le premier examen : le temps de
   déposer et reprendre tout le monde. 5 minutes par candidat,
   3 seulement quand les leçons sont courtes. */
const MINUTES_PAR_ELEVE       = 5;
const MINUTES_PAR_ELEVE_COURT = 3;
const LECON_COURTE            = 30;

function battementAvantExamen(nbEleves, dureeConduite){
  const parEleve = (dureeConduite <= LECON_COURTE)
    ? MINUTES_PAR_ELEVE_COURT : MINUTES_PAR_ELEVE;
  return nbEleves * parEleve;
}
const AVANCE_ARRIVEE  = 5;    /* on arrive avant de démarrer */

function enMinutes(hhmm){
  const m = String(hhmm || '').match(/(\d{1,2})\s*[h:]\s*(\d{0,2})/);
  if(!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2] || '0', 10);
}

function enHeure(minutes){
  const m = ((minutes % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + 'h' +
         String(m % 60).padStart(2, '0');
}

/* Calcule le déroulé complet à partir de l'heure du premier examen */
/* ============================================================
   PLANNING DE LA JOURNÉE DE PERMIS

   Règles tirées des journées réelles :
   • chaque candidat conduit une fois, à la suite des autres ;
   • la pause du midi coupe les conduites : celles qui n'ont pas
     tenu avant reprennent après ;
   • l'écoute d'un candidat, c'est TOUTES les conduites des autres,
     fusionnées quand elles se suivent, et coupées par la pause ;
   • les examens s'enchaînent après un battement.
   ============================================================ */
/* Les créneaux d'examen imposés par le centre. */
const HEURES_EXAMEN = ['08h00', '08h30', '09h00', '09h30', '10h00', '10h30', '11h00',
                       '13h15', '13h45', '14h15', '14h45', '15h15', '15h45'];

/* ============================================================
   PLANNING DE LA JOURNÉE DE PERMIS

   On part de l'heure du premier examen, imposée par le centre,
   et on REMONTE : la dernière conduite se termine juste avant,
   les précédentes s'enchaînent à rebours, et la pause du midi
   repousse vers le haut ce qui ne tient pas.

   L'écoute d'un candidat, c'est toutes les conduites des autres,
   fusionnées quand elles se suivent et coupées par la pause.
   ============================================================ */
function planningJournee(premierExamen, nbEleves, reglages){
  const r = reglages || {};
  const conduite = r.conduite || DUREE_CONDUITE;
  const examen   = r.examen   || DUREE_EXAMEN;

  const debutExamens = enMinutes(premierExamen);
  if(debutExamens === null || nbEleves < 1) return null;

  const battement = (r.battement === undefined)
    ? battementAvantExamen(nbEleves, conduite) : r.battement;

  /* La pause ne commence pas à une heure fixe : elle se termine
     quand la conduite reprend, et remonte de sa durée. C'est ce
     qui décale toutes les conduites du matin vers le haut. */
  const pauseDuree = r.pauseDuree || 0;
  const avantPause = pauseDuree ? (r.avantPause || 0) : 0;

  /* On remonte depuis la fin de la dernière conduite */
  const conduites = [];
  let fin = debutExamens - battement;
  let pauseDe = null, pauseA = null;

  for(let i = nbEleves - 1; i >= 0; i--){
    conduites.unshift({ de: fin - conduite, a: fin });
    fin -= conduite;

    /* La pause s'intercale sous ce créneau : elle se termine quand
       il commence, et remonte de sa durée. */
    if(pauseDuree && i === avantPause){
      pauseA = fin;
      pauseDe = fin - pauseDuree;
      fin = pauseDe;
    }
  }

  /* Les écoutes : tout ce que font les autres, une ligne par
     candidat écouté. On ne fusionne pas les créneaux qui se
     suivent : voir qu'il y a deux passages différents est plus
     parlant pour l'élève qu'une seule longue plage. */
  function ecoutesDe(moi){
    return conduites
      .filter((x, i) => i !== moi)
      .sort((a, b) => a.de - b.de)
      .map(x => ({ de: enHeure(x.de), a: enHeure(x.a) }));
  }

  const creneaux = [];
  for(let i = 0; i < nbEleves; i++){
    const ec = ecoutesDe(i);
    creneaux.push({
      conduiteDe: enHeure(conduites[i].de),
      conduiteA:  enHeure(conduites[i].a),
      ecoutes:    ec,
      ecouteDe:   (ec[0] || {}).de || '',
      ecouteA:    (ec[0] || {}).a  || '',
      examenDe:   enHeure(debutExamens + i * examen),
      examenA:    enHeure(debutExamens + (i + 1) * examen)
    });
  }

  /* La pause n'est annoncée que si elle tombe vraiment au milieu */
  const pauseUtile = (pauseDe !== null && avantPause > 0 && avantPause < nbEleves);

  return {
    rendezVous: enHeure(conduites[0].de - AVANCE_ARRIVEE),
    pauseDe: pauseUtile ? enHeure(pauseDe) : '',
    pauseA:  pauseUtile ? enHeure(pauseA)  : '',
    apresPause: pauseUtile ? avantPause : -1,
    creneaux: creneaux
  };
}

/* ============================================================
   MESSAGE 1 — le planning de la journée
   ============================================================ */
function messageGroupePermis(dateIso, centre, eleves, plan, note){
  const jour = dateEnToutesLettres(dateIso);

  /* La liste, telle qu'elle apparaît dans le message */
  let liste = eleves.map((e, i) => {
    const c = plan ? plan.creneaux[i] : null;
    const bouts = [];
    bouts.push((i + 1) + '- ' + e.nom + ' :');
    if(c){
      bouts.push('🚙 𝗧𝘂 𝗰𝗼𝗻𝗱𝘂𝗶𝘀 de ' + c.conduiteDe + ' à ' + c.conduiteA);
      if(eleves.length > 1){
        /* Toutes les écoutes, y compris celles d'après la pause */
        (c.ecoutes && c.ecoutes.length ? c.ecoutes : [{ de: c.ecouteDe, a: c.ecouteA }])
          .forEach(ec => {
            if(ec.de && ec.a) bouts.push("👉 Tu es en écoute de " + ec.de + ' à ' + ec.a);
          });
      }
      bouts.push('📝 𝗧𝘂 𝗽𝗮𝘀𝘀𝗲𝘀 𝘁𝗼𝗻 𝗲𝘅𝗮𝗺𝗲𝗻 𝗼𝗳𝗳𝗶𝗰𝗶𝗲𝗹 de ' + c.examenDe + ' à ' + c.examenA);
    }else if(e.heure){
      bouts.push('📝 Examen à ' + e.heure);
    }
    return bouts.join('\n');
  });

  /* Le bloc pause s'intercale là où il tombe réellement */
  if(plan && plan.pauseDe && plan.apresPause > 0 && plan.apresPause < liste.length){
    liste.splice(plan.apresPause, 0,
      '🥙 PAUSE ' + plan.pauseDe.toUpperCase() + '-' + plan.pauseA.toUpperCase() +
      " : dépôt et reprise à l'auto-école, possibilité de manger sur place 🥙");
  }
  liste = liste.join('\n\n');

  /* Le modèle de l'auto-école prime, s'il existe */
  const perso = (typeof modelePour === 'function') ? modelePour('permis_jour') : null;
  if(perso && perso.contenu){
    return appliquerModele(perso.contenu, {
      date: jour,
      centre: centre || '',
      rendezvous: plan ? plan.rendezVous : '',
      liste: liste,
      note: txt(note)
    });
  }

  const P = [];
  const L = s => P.push(s);

  L('🎉 🎉 𝙉𝙊𝙐𝙎 𝙑𝙊𝙐𝙎 𝘼𝙑𝙊𝙉𝙎 𝙊𝘽𝙏𝙀𝙉𝙐 𝙐𝙉𝙀 𝘿𝘼𝙏𝙀 𝘿𝙀 𝙋𝙀𝙍𝙈𝙄𝙎 𝙇𝙀 ' + jour + ' 🎉 🎉');
  L('❌ Si vous ne pouvez pas être présent à cette date, prévenez nous 𝗜𝗠𝗠𝗘́𝗗𝗜𝗔𝗧𝗘𝗠𝗘𝗡𝗧 !');
  L('');
  L('Planning de votre journée de 𝙋𝙀𝙍𝙈𝙄𝙎 :');
  L('');
  L('𝙎𝙊𝙔𝙀𝙕 𝙏𝙊𝙐𝙎 𝙇𝘼 :');
  L('🚗 Auto École Évolution Conduites ' + (centre || 'St Brieuc'));
  L('📅 ' + jour);
  L('🕐 ' + (plan ? plan.rendezVous : '❓'));
  L('');
  L(liste);

  if(txt(note)){
    L('');
    L('📣 ' + txt(note));
  }

  return P.join('\n');
}


/* ============================================================
   MESSAGE 2 — les rappels avant examen
   Texte fixe, modifiable dans « Mes modèles de message ».
   ============================================================ */
const RAPPELS_AVANT_EXAMEN =
"𝙋𝙀𝙏𝙄𝙏𝙎 𝙍𝘼𝙋𝙋𝙀𝙇𝙎 𝘼𝙑𝘼𝙉𝙏 𝙀𝙓𝘼𝙈𝙀𝙉 : \n\n" +
"🆔 𝗣𝗮𝘀𝘀𝗲 𝗮𝘂 𝗯𝘂𝗿𝗲𝗮𝘂 𝟱𝗺𝗶𝗻 𝗮𝘃𝗮𝗻𝘁 𝘁𝗼𝗻 𝗱𝗲𝗿𝗻𝗶𝗲𝗿 𝗰𝗼𝘂𝗿𝘀 𝗱𝗲 𝟮𝗵 de veille de permis pour 𝗻𝗼𝘂𝘀 𝗱𝗼𝗻𝗻𝗲𝗿 𝘁𝗮 𝗰𝗮𝗿𝘁𝗲 𝗱'𝗶𝗱𝗲𝗻𝘁𝗶𝘁𝗲́ ! On te la rend après ton permis.\n" +
"Pas besoin de ramener ta convocation reçue par mail !\n\n" +
"🏃‍♀️ 𝗔̀ 𝗹𝗮 𝗳𝗶𝗻 𝗱𝗲 𝘁𝗼𝗻 𝗲𝘅𝗮𝗺𝗲𝗻, tu pourras repartir seul(e) ou avec nous pour revenir à l'auto-école, mais il faudra nous l'indiquer !\n\n" +
"⚠️ 𝗠𝗘𝗥𝗖𝗜 𝗗𝗘 𝗡𝗘 𝗣𝗔𝗦 𝗙𝗔𝗜𝗥𝗘 𝗗𝗘 𝗖𝗢𝗠𝗠𝗘𝗡𝗧𝗔𝗜𝗥𝗘𝗦 𝗡𝗜 𝗗𝗘 𝗣𝗢𝗦𝗘𝗥 𝗗𝗘 𝗤𝗨𝗘𝗦𝗧𝗜𝗢𝗡𝗦 𝗘𝗡 𝗣𝗥𝗘́𝗦𝗘𝗡𝗖𝗘 𝗗𝗘 𝗟'𝗜𝗡𝗦𝗣𝗘𝗖𝗧𝗘𝗨𝗥 𝗦𝗨𝗥 𝗟𝗘 𝗖𝗘𝗡𝗧𝗥𝗘 𝗗'𝗘𝗫𝗔𝗠𝗘𝗡 ! \n" +
"Ton rapport te sera envoyé par ton moniteur sur ton messenger. \n\n" +
"👩‍👦 𝗦𝗶 𝘁𝘂 𝗲𝘀 𝗲𝗻 𝗔𝗔𝗖, 𝘁𝘂 𝗱𝗼𝗶𝘀 𝗽𝗿𝗲́𝘀𝗲𝗻𝘁𝗲𝗿 𝘁𝗼𝗻 𝗹𝗶𝘃𝗿𝗲𝘁 𝗻𝘂𝗺𝗲́𝗿𝗶𝗾𝘂𝗲 (𝗼𝘂 𝗽𝗮𝗽𝗶𝗲𝗿), et montrer l'attestation qui valide tes 1 an minimum, voir vidéo ici https://www.facebook.com/groups/963972327360861/permalink/1733835153707904/\n" +
"𝗦𝗶 𝘁𝘂 𝗲𝘀 𝗲𝗻 𝗖𝗦, 𝗽𝗮𝘀 𝗯𝗲𝘀𝗼𝗶𝗻 !\n\n" +
"💍 𝗦𝗽𝗲́𝗰𝗶𝗳𝗶𝗰𝗶𝘁𝗲́ 𝗮𝘂𝘅 𝗰𝗮𝗻𝗱𝗶𝗱𝗮𝘁𝗲𝘀 𝗱𝗲 𝗻𝗮𝘁𝗶𝗼𝗻𝗮𝗹𝗶𝘁𝗲́ 𝗿𝗼𝘂𝗺𝗮𝗶𝗻𝗲 𝗺𝗮𝗿𝗶𝗲́𝗲 (si votre nom de jeune fille n'apparait pas sur votre carte d'identité, vous devez obligatoirement nous fournir votre livret de famille ou votre certificat de mariage sur lequel apparaissent vos deux noms) : https://www.facebook.com/groups/963972327360861/learning_content?filter=957460364727818&post=1442207386345179\n\n" +
"⚠️  𝗦𝗜 𝗧𝗨 𝗟𝗢𝗨𝗣𝗘𝗦 𝗧𝗢𝗡 𝗘𝗫𝗔𝗠𝗘𝗡 : \n" +
"- tu devras OBLIGATOIREMENT effectuer le BILAN de ton PERMIS par Messenger puis la correction se fera avec un(e) moniteur(trice) au bureau sur un créneau de 30 mn. Cette prestation te sera facturée.\n" +
"- tu devras OBLIGATOIREMENT reprendre entre 2 à 5 leçons (selon ton niveau à l'examen) + 3h avant ton repassage. \n\n" +
"⚠️𝗧𝗔 𝗗𝗔𝗧𝗘 𝗗'𝗘𝗫𝗔𝗠𝗘𝗡 𝗘𝗦𝗧 𝗣𝗥𝗘́𝗖𝗜𝗘𝗨𝗦𝗘 : ne compte pas sur un repassage, c'est 𝗠𝗔𝗜𝗡𝗧𝗘𝗡𝗔𝗡𝗧 que tu dois obtenir ton permis ! Si toi ou tes moniteurs estiment que tu n'es pas prêt(e), que tu ne connais pas tes vérifications, AJOUTE DES LEÇONS OU REPORTE TON EXAMEN TOUT DE SUITE ⚠️ \n\n" +
"☠️ 𝗧𝗼𝘂𝘁𝗲 𝗺𝗲𝗻𝗮𝗰𝗲, 𝗽𝗿𝗲𝘀𝘀𝗶𝗼𝗻 𝘃𝗶𝘀𝗮𝗻𝘁 𝗮̀ 𝗼𝗯𝘁𝗲𝗻𝗶𝗿 𝘂𝗻𝗲 𝗽𝗹𝗮𝗰𝗲 𝗱𝗲 𝗿𝗲𝗽𝗮𝘀𝘀𝗮𝗴𝗲, 𝗼𝘂 𝘁𝗼𝘂𝘁𝗲 𝗻𝗼𝗻 𝗿𝗲𝗺𝗶𝘀𝗲 𝗲𝗻 𝗾𝘂𝗲𝘀𝘁𝗶𝗼𝗻, 𝗲𝗻𝘁𝗿𝗮𝗶̂𝗻𝗲𝗿𝗮 𝗮𝘂𝘁𝗼𝗺𝗮𝘁𝗶𝗾𝘂𝗲𝗺𝗲𝗻𝘁 𝗹𝗮 𝗿𝗲𝗺𝗶𝘀𝗲 𝗶𝗺𝗺𝗲́𝗱𝗶𝗮𝘁𝗲 𝗱𝘂 𝗱𝗼𝘀𝘀𝗶𝗲𝗿 𝗲𝘁 𝗹'𝗮𝗻𝗻𝘂𝗹𝗮𝘁𝗶𝗼𝗻 𝗱𝘂 𝗰𝗼𝗻𝘁𝗿𝗮𝘁, 𝘀𝗮𝗻𝘀 𝗱𝗶𝘀𝗰𝘂𝘀𝘀𝗶𝗼𝗻 𝗽𝗼𝘀𝘀𝗶𝗯𝗹𝗲. ☠️\n\n" +
"𝙇𝙄𝙀𝙉𝙎 𝘼̀ 𝘼𝙋𝙋𝙍𝙀𝙉𝘿𝙍𝙀 𝙋𝘼𝙍 𝘾𝙊𝙀𝙐𝙍 𝘼𝙑𝘼𝙉𝙏 𝙀𝙓𝘼𝙈𝙀𝙉 :\n\n" +
"💡  𝗙𝗶𝗰𝗵𝗲 𝗺𝗲́𝗺𝗼𝗶𝗿𝗲 𝗽𝗲𝗿𝗺𝗶𝘀 : \nhttps://www.facebook.com/groups/147379309864142/permalink/287913635810708/\n\n" +
"🚗  𝗗𝗲́𝗿𝗼𝘂𝗹𝗲́ 𝗱𝗲 𝗹'𝗲𝘅𝗮𝗺𝗲𝗻 : https://www.facebook.com/groups/963972327360861/permalink/970517783372982/ \nhttps://www.facebook.com/groups/963972327360861/permalink/1016364328788327/\n\n" +
"🧘‍♀️  𝗥𝗲𝘀𝘁𝗲𝗿 𝗭𝗲𝗻 : https://www.facebook.com/groups/963972327360861/permalink/1139464513144974/\n\n" +
"👌  𝗖𝗲𝗻𝘁𝗿𝗲 𝗲𝘅𝗮𝗺𝗲𝗻 𝗦𝗮𝗶𝗻𝘁-𝗕𝗿𝗶𝗲𝘂𝗰 :\nhttps://www.facebook.com/groups/963972327360861/permalink/970512993373461/\n\n" +
"🏬  𝗖𝗲𝗻𝘁𝗿𝗲 𝗲𝘅𝗮𝗺𝗲𝗻 𝗦𝗮𝗶𝗻𝘁-𝗕𝗿𝗶𝗲𝘂𝗰 :\nhttps://www.facebook.com/groups/963972327360861/learning_content/?filter=957460364727818&post=3113901628719002\n\n" +
"☠  𝗘𝗿𝗿𝗲𝘂𝗿𝘀 𝗲́𝗹𝗶𝗺𝗶𝗻𝗮𝘁𝗼𝗶𝗿𝗲𝘀 : https://www.facebook.com/groups/963972327360861/permalink/1131218613969564/  + https://www.facebook.com/groups/963972327360861/permalink/1135349536889805/\n\n" +
"❓ 𝗩𝗲́𝗿𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻𝘀 :\nhttps://www.facebook.com/groups/864826058258637";

function messageRappels(){
  const perso = (typeof modelePour === 'function') ? modelePour('permis_rappels') : null;
  return (perso && perso.contenu) ? perso.contenu : RAPPELS_AVANT_EXAMEN;
}


/* Les dates d'examen à venir, d'après les fiches de suivi */
function datesPermisAVenir(){
  const auj = todayLocal();
  const parDate = {};
  const vus = {};

  function ajouter(nom, dateFr, s){
    const cle = normaliserMot(nom || '');
    if(!cle || vus[cle]) return;
    if(s && s.resultat) return;                  /* déjà passé */
    if(s && s.statut === 'annule') return;
    const iso = dateFrVersIso(dateFr);
    if(!iso || iso < auj) return;                /* on ne propose que l'à-venir */
    vus[cle] = true;
    if(!parDate[iso]) parDate[iso] = [];
    parDate[iso].push({
      nom: nom,
      centre: (s && s.centre) || '',
      moniteur: (s && s.moniteurDate) || '',
      repassage: !!(s && s.nbAjournements),
      heure: ''
    });
  }

  /* Deux sources, comme la liste « Permis prévus » : la fiche de
     suivi, et l'état déduit des bilans. Un élève dont seule l'une
     porte la date manquait au groupe. */
  (etatBureau.suivi || []).forEach(s => ajouter(s.eleve, s.datePermis, s));

  (etatBureau.eleves || []).forEach(e => {
    if(!e.etat || e.etat.permis !== 'prevu') return;
    const s = (etatBureau.suivi || []).find(
      y => normaliserMot(y.eleve) === normaliserMot(e.eleve));
    ajouter(e.eleve, e.etat.permisDate || (s && s.datePermis) || '', s);
  });

  return Object.keys(parDate).sort().map(iso => ({
    iso: iso,
    eleves: parDate[iso].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }));
}




/* Le message « planning formation avant permis ».
   Deux variantes selon qu'on planifie les 2h de veille ou qu'on
   laisse les élèves choisir : ce sont VOS textes, pris dans
   « Textes types » avec l'usage « Planning formation avant permis ». */
function messagesPlanningPermis(){
  const tous = ((typeof modelesTexte !== 'undefined' ? modelesTexte : []) || [])
    .filter(m => m.usage === 'permis_planning');
  return tous;
}

function composerPlanningPermis(modele, jourIso, veilleIso, g){
  const jourVeille = veilleIso || veilleDe(jourIso);
  return appliquerModele(modele.contenu || '', {
    permis:   jourIso ? dateEnToutesLettres(jourIso) : '',
    veille:   jourVeille ? dateEnToutesLettres(jourVeille) : '',
    moniteur: (g && g.moniteur) || '',
    centre:   (g && g.eleves && g.eleves[0] && g.eleves[0].centre) || '',
    liste:    (g && g.eleves ? g.eleves.map((e, i) => (i + 1) + '- ' + e.nom).join('\n') : '')
  });
}

/* La veille d'une date ISO, au format ISO */
function veilleDe(iso){
  if(!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/* Un message prêt à copier, avec son bouton */
function blocCopiable(titre, texte){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:12px 14px;margin-top:12px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:8px;';
  t.textContent = titre;
  d.appendChild(t);

  const z = document.createElement('textarea');
  z.rows = 12;
  z.value = texte;
  z.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:13px;' +
    'line-height:1.55;font-family:inherit;resize:vertical;margin-bottom:8px;';
  d.appendChild(z);

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'padding:12px;font-size:14px;';
  b.textContent = '📋 Copier ce message';
  b.addEventListener('click', () => {
    z.select();
    navigator.clipboard.writeText(z.value).then(
      () => { b.textContent = '✅ Copié'; setTimeout(() => { b.textContent = '📋 Copier ce message'; }, 1500); },
      () => { try{ document.execCommand('copy'); showToast('Copié ✅'); }catch(e){ showToast('Copie impossible'); } });
  });
  d.appendChild(b);

  return d;
}

/* ============================================================
   ÉCRAN DU MESSAGE DE GROUPE

   Une même journée peut compter plusieurs groupes : deux
   inspecteurs, deux moniteurs, ou une session le matin et une
   l'après-midi. Chaque groupe a ses horaires et son message.
   ============================================================ */

let groupesPermis = [];      /* les groupes de la date choisie */
let dateGroupes = '';        /* la date à laquelle ils se rapportent */

function nouveauGroupe(nom){
  return { nom: nom || 'Groupe 1', heure: '13h15', conduite: 55,
           pauseDuree: 60, avantPause: 1, eleves: [] };
}

/* Reconstruit les groupes quand on change de date */
function preparerGroupes(jour){
  dateGroupes = jour ? jour.iso : '';
  const g = nouveauGroupe('Groupe 1');
  g.eleves = jour ? jour.eleves.slice() : [];
  groupesPermis = [g];
}

async function afficherMessengerPermis(){
  const zone = $('messengerZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture des permis prévus…</div>';
  try{
    await chargerBureau();
    if(typeof chargerModelesTexte === 'function') await chargerModelesTexte();
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  const jours = datesPermisAVenir();
  zone.innerHTML = '';

  if(!jours.length){
    zone.innerHTML = '<div class="empty">Aucune date de permis à venir.<br>' +
      '<span style="font-size:12px;">Les dates viennent des fiches de suivi et des bilans.</span></div>';
    return;
  }

  /* Choix de la date */
  const ld = document.createElement('label');
  ld.textContent = 'Date de l\'examen';
  zone.appendChild(ld);

  const selDate = document.createElement('select');
  selDate.id = 'messengerDate';
  selDate.innerHTML = jours.map(d =>
    '<option value="' + d.iso + '">' + dateEnToutesLettres(d.iso) +
    ' — ' + d.eleves.length + ' élève(s)</option>').join('');
  zone.appendChild(selDate);

  const bMaj = document.createElement('button');
  bMaj.className = 'btn btn-secondary';
  bMaj.style.cssText = 'margin-bottom:14px;padding:11px;font-size:13px;';
  bMaj.textContent = '🔄 Actualiser les dates';
  bMaj.addEventListener('click', () => afficherMessengerPermis());
  zone.appendChild(bMaj);

  const zGroupes = document.createElement('div');
  zone.appendChild(zGroupes);

  function jourChoisi(){
    return jours.find(x => x.iso === selDate.value) || jours[0];
  }

  selDate.addEventListener('change', () => {
    preparerGroupes(jourChoisi());
    dessinerGroupes();
  });

  /* ---------- Un groupe ---------- */
  function dessinerGroupes(){
    zGroupes.innerHTML = '';
    const jour = jourChoisi();

    const t = document.createElement('div');
    t.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;';
    t.innerHTML = '<strong style="flex:1;min-width:0;font-size:14px;color:var(--accent-text);">' +
      groupesPermis.length + ' groupe(s) pour cette date</strong>';

    const bPlus = document.createElement('button');
    bPlus.className = 'btn btn-secondary';
    bPlus.style.cssText = 'width:auto;padding:8px 12px;font-size:12px;margin:0;';
    bPlus.textContent = '➕ Nouveau groupe';
    bPlus.title = 'Deux inspecteurs, ou une session matin et une après-midi';
    bPlus.addEventListener('click', () => {
      groupesPermis.push(nouveauGroupe('Groupe ' + (groupesPermis.length + 1)));
      dessinerGroupes();
    });
    t.appendChild(bPlus);
    zGroupes.appendChild(t);

    groupesPermis.forEach((g, ig) => zGroupes.appendChild(blocGroupe(g, ig, jour)));
  }

  function blocGroupe(g, ig, jour){
    const d = document.createElement('div');
    d.style.cssText = 'border:2px solid var(--line);border-radius:12px;' +
      'padding:12px 14px;margin-bottom:14px;';

    /* Titre du groupe, modifiable */
    const h = document.createElement('div');
    h.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:10px;';

    const nom = document.createElement('input');
    nom.type = 'text';
    nom.value = g.nom;
    nom.placeholder = 'Nom du groupe';
    nom.style.cssText = 'flex:1;min-width:0;margin:0;font-weight:700;';
    nom.addEventListener('input', () => { g.nom = nom.value; });
    h.appendChild(nom);

    if(groupesPermis.length > 1){
      const bSup = document.createElement('button');
      bSup.className = 'btn btn-secondary';
      bSup.style.cssText = 'width:auto;padding:8px 10px;font-size:12px;margin:0;' +
        'color:var(--red);border-color:var(--red);';
      bSup.textContent = '✕';
      bSup.title = 'Supprimer ce groupe — ses élèves reviennent au premier';
      bSup.addEventListener('click', () => {
        /* Les élèves ne disparaissent pas avec le groupe */
        const restants = groupesPermis.filter((x, i) => i !== ig);
        g.eleves.forEach(e => restants[0].eleves.push(e));
        groupesPermis = restants;
        dessinerGroupes();
      });
      h.appendChild(bSup);
    }
    d.appendChild(h);

    /* Réglages propres au groupe */
    const g1 = document.createElement('div');
    g1.className = 'duo';
    g1.innerHTML =
      '<div><label>Premier examen</label><select class="grHeure">' +
        HEURES_EXAMEN.map(x => '<option value="' + x + '"' +
          (x === g.heure ? ' selected' : '') + '>' + x + '</option>').join('') +
      '</select></div>' +
      '<div><label>Conduite par candidat</label><select class="grConduite">' +
        [55, 30, 45, 60].map(x => '<option value="' + x + '"' +
          (x === g.conduite ? ' selected' : '') + '>' + x + ' minutes</option>').join('') +
      '</select></div>';
    d.appendChild(g1);

    const g2 = document.createElement('div');
    g2.className = 'duo';
    g2.innerHTML =
      '<div><label>Pause après le candidat n°</label><select class="grAvant">' +
        '<option value="0">Pas de pause</option>' +
        g.eleves.map((x, i) => i).slice(1).map(i =>
          '<option value="' + i + '"' + (i === g.avantPause ? ' selected' : '') +
          '>après le ' + i + (i === 1 ? 'er' : 'e') + '</option>').join('') +
      '</select></div>' +
      '<div><label>Durée de la pause</label><select class="grPause">' +
        [[60, '1 heure'], [45, '45 minutes'], [75, '1 h 15'], [90, '1 h 30']].map(x =>
          '<option value="' + x[0] + '"' + (x[0] === g.pauseDuree ? ' selected' : '') +
          '>' + x[1] + '</option>').join('') +
      '</select></div>';
    d.appendChild(g2);

    const lire = () => {
      g.heure = d.querySelector('.grHeure').value;
      g.conduite = parseInt(d.querySelector('.grConduite').value, 10);
      g.avantPause = parseInt(d.querySelector('.grAvant').value, 10) || 0;
      g.pauseDuree = parseInt(d.querySelector('.grPause').value, 10);
    };

    /* Ordre de passage et déplacement d'un groupe à l'autre */
    const lt = document.createElement('div');
    lt.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
      'margin:12px 0 6px;';
    lt.textContent = 'Ordre de passage — ' + g.eleves.length + ' élève(s)';
    d.appendChild(lt);

    if(!g.eleves.length){
      const v = document.createElement('div');
      v.className = 'empty';
      v.style.cssText = 'padding:10px;font-size:12px;';
      v.textContent = 'Aucun élève. Déplace-en depuis un autre groupe.';
      d.appendChild(v);
    }

    g.eleves.forEach((e, i) => {
      const l = document.createElement('div');
      l.style.cssText = 'display:flex;gap:6px;align-items:center;padding:5px 0;';

      const n = document.createElement('span');
      n.style.cssText = 'flex:1;min-width:0;font-size:14px;';
      n.innerHTML = '<strong style="color:var(--accent-text);">' + (i + 1) + '-</strong> ' +
        e.nom.replace(/</g, '&lt;');
      l.appendChild(n);

      /* Monter dans l'ordre */
      if(i > 0){
        const bH = document.createElement('button');
        bH.className = 'btn btn-secondary';
        bH.style.cssText = 'width:auto;padding:5px 9px;font-size:12px;margin:0;';
        bH.textContent = '↑';
        bH.title = 'Passer plus tôt';
        bH.addEventListener('click', () => {
          const tmp = g.eleves[i - 1];
          g.eleves[i - 1] = g.eleves[i];
          g.eleves[i] = tmp;
          dessinerGroupes();
        });
        l.appendChild(bH);
      }

      /* Déplacer vers un autre groupe */
      if(groupesPermis.length > 1){
        const sel = document.createElement('select');
        sel.style.cssText = 'width:auto;margin:0;padding:5px 8px;font-size:12px;';
        sel.innerHTML = '<option value="">↔️</option>' +
          groupesPermis.map((x, j) => j === ig ? '' :
            '<option value="' + j + '">→ ' + (x.nom || 'Groupe ' + (j + 1)) +
            '</option>').join('');
        sel.title = 'Déplacer vers un autre groupe';
        sel.addEventListener('change', () => {
          const j = parseInt(sel.value, 10);
          if(isNaN(j)) return;
          groupesPermis[j].eleves.push(e);
          g.eleves.splice(i, 1);
          /* Une pause qui pointait au-delà du dernier candidat n'a plus de sens */
          if(g.avantPause >= g.eleves.length) g.avantPause = Math.max(0, g.eleves.length - 1);
          dessinerGroupes();
        });
        l.appendChild(sel);
      }

      d.appendChild(l);
    });

    /* Aperçu et message */
    const ap = document.createElement('div');
    ap.style.cssText = 'background:var(--navy);border:1px solid var(--line);' +
      'border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.6;' +
      'margin-top:10px;';
    d.appendChild(ap);

    const lNote = document.createElement('label');
    lNote.textContent = 'Information particulière (facultatif)';
    lNote.style.marginTop = '10px';
    d.appendChild(lNote);

    const note = document.createElement('input');
    note.type = 'text';
    note.value = g.note || '';
    note.placeholder = 'Ex : la voiture sera la Clio grise';
    note.addEventListener('input', () => { g.note = note.value; });
    d.appendChild(note);

    /* La date des 2h de veille, souvent différente de la veille stricte */
    const lVeille = document.createElement('label');
    lVeille.textContent = 'Date des 2 h de veille (pour le message de planning)';
    lVeille.style.marginTop = '10px';
    d.appendChild(lVeille);

    const veille = document.createElement('input');
    veille.type = 'date';
    veille.value = g.veille || veilleDe(jour.iso);
    veille.addEventListener('change', () => { g.veille = veille.value; });
    d.appendChild(veille);

    const bMsg = document.createElement('button');
    bMsg.className = 'btn btn-primary';
    bMsg.style.cssText = 'margin-top:8px;padding:13px;font-size:14px;';
    bMsg.textContent = '✍️ Composer les messages de ce groupe';
    d.appendChild(bMsg);

    const zMsg = document.createElement('div');
    d.appendChild(zMsg);

    function apercu(){
      lire();
      if(!g.eleves.length){ ap.innerHTML = '<em>Groupe vide</em>'; return; }
      const plan = planningJournee(g.heure, g.eleves.length, g);
      if(!plan){ ap.innerHTML = '<em>Planning impossible</em>'; return; }
      ap.innerHTML = '🕐 <strong>Rendez-vous à ' + plan.rendezVous + '</strong>' +
        (plan.pauseDe ? '  ·  🥙 pause ' + plan.pauseDe + '–' + plan.pauseA : '') + '<br>' +
        g.eleves.map((e, i) => {
          const c = plan.creneaux[i];
          return (i + 1) + '- ' + e.nom + ' — conduite ' + c.conduiteDe + '/' + c.conduiteA +
                 ' · examen ' + c.examenDe + '/' + c.examenA;
        }).join('<br>');
    }

    d.querySelectorAll('select').forEach(s => s.addEventListener('change', apercu));
    setTimeout(apercu, 0);

    bMsg.addEventListener('click', () => {
      lire();
      if(!g.eleves.length){ showToast('Ce groupe n\'a aucun élève.'); return; }
      const plan = planningJournee(g.heure, g.eleves.length, g);
      zMsg.innerHTML = '';
      zMsg.appendChild(blocCopiable(
        'Message — ' + (g.nom || 'groupe'),
        messageGroupePermis(jour.iso, g.eleves[0].centre || '', g.eleves, plan, g.note || '')));
      zMsg.appendChild(blocCopiable('Rappels avant examen', messageRappels()));

      /* Les messages de planning avant permis, s'il y en a d'enregistrés */
      const plannings = messagesPlanningPermis();
      if(plannings.length){
        plannings.forEach(m => {
          zMsg.appendChild(blocCopiable(
            '🚨 ' + (m.titre || m.nom),
            composerPlanningPermis(m, jour.iso, veille.value, g)));
        });
      }else{
        const a = document.createElement('div');
        a.className = 'empty';
        a.style.cssText = 'margin-top:12px;padding:12px;font-size:12px;line-height:1.5;';
        a.innerHTML = 'Aucun message « planning avant permis » enregistré.<br>' +
          'Crée-le dans <strong>📄 Textes types</strong>, usage ' +
          '« 🚨 Planning formation avant permis ».';
        zMsg.appendChild(a);
      }
    });

    return d;
  }

  preparerGroupes(jourChoisi());
  dessinerGroupes();
}

/* Une heure saisie « 14:00 » se lit mieux en « 14h00 » */
function formaterHeure(v){
  if(!v) return '';
  return String(v).replace(':', 'h');
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-messenger.js'] = true;
