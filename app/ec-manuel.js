/* Déployé le 01/09/2026 à 10:59 — v762 */
/* ============================================================
   ec-manuel.js
   Bilan à remplir à la main
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   BILAN MANUEL — sans micro ni résumé automatique
   Le moniteur remplit chaque rubrique ; il peut dicter dans
   chaque champ séparément s'il le souhaite.
   ============================================================ */

/* Ce que le moniteur doit renseigner, selon le modèle choisi */
/* Les rubriques du résumé, dans l'ordre du bilan */
const THEMES_ERREURS = [
  { cle:'commandes',   nom:'🚙 MANIPULATION DES COMMANDES' },
  { cle:'trajectoire', nom:'👀 TRAJECTOIRE' },
  { cle:'giratoires',  nom:'🍩 GIRATOIRES' },
  { cle:'vavd',        nom:'🛣️ VA VD' },
  { cle:'pad',         nom:'❌ PAD' },
  { cle:'allures',     nom:'🏎️💨 ALLURES' },
  { cle:'controles',   nom:'👀 CONTRÔLES' },
  { cle:'divers',      nom:'🧠 DIVERS' },
  { cle:'manoeuvres',  nom:'🚙🚗🚙 MANŒUVRES' }
];

/* ============================================================
   LA FICHE D'ÉVALUATION HANDICAP

   Elle reprend le document papier ligne pour ligne : chaque
   contrôle a ses trois notes et son champ d'observations.
   ============================================================ */

function schemaHandicap(){
  const out = [
    { cle:'__th', type:'titre', nom:'𝗙𝗜𝗖𝗛𝗘 𝗗\'𝗘́𝗩𝗔𝗟𝗨𝗔𝗧𝗜𝗢𝗡' },
    /* Ces trois-là se remplissent tout seuls : l'élève, le
       moniteur et la date du cours sont déjà connus. */
    { cle:'handicap.conducteur',    type:'court', nom:'Conducteur' },
    { cle:'handicap.formateur',     type:'court', nom:'Formateur' },
    { cle:'handicap.date',          type:'court', nom:'Date' },
    { cle:'handicap.problematique', type:'texte', lignes:4,
      nom:'Problématique',
      aide:'Ce qui amène cette évaluation.' },

    { cle:'__tc', type:'titre', nom:'𝗖𝗢𝗡𝗧𝗥𝗢̂𝗟𝗘' }
  ];

  /* Le tableau entier en un seul champ : le dessiner ligne par
     ligne perdait le moniteur, qui connaît le document papier. */
  out.push({ cle:'__tableau', type:'tableauHandicap' });

  out.push({ cle:'__tf', type:'titre', nom:'𝗖𝗢𝗡𝗖𝗟𝗨𝗦𝗜𝗢𝗡' });
  out.push({ cle:'handicap.conclusion', type:'texte', lignes:6,
             nom:'Conclusion' });

  return out;
}


const CHAMPS_MANUELS = {
  conduiteResume: [
    { cle:'__entete', type:'entete', nom:'Carte SD — Installation — Vérifications' },
    { cle:'texteDicte',  type:'texte', nom:'🎙️ Ton cours', lignes:8,
      aide:'Ce que tu as dit pendant le cours. Peut rester vide.' },
    { cle:'resume',      type:'themes', nom:'🧠 Erreurs de ce jour' },
    { cle:'manoeuvres',  type:'manoeuvres', nom:'🦉 Manœuvres travaillées' },
    { cle:'groupesTravail', type:'ok', nom:'4 groupes de travail suivis', defaut:'' },
    { cle:'ecoutes',     type:'ok',    nom:"Plus d'écoutes que de conduite", defaut:'' }
  ],
  conduite: [
    { cle:'__entete', type:'entete', nom:'Carte SD — Installation — Vérifications' },
    { cle:'resume',      type:'themes', nom:'🧠 Erreurs de ce jour' },
    { cle:'manoeuvres',  type:'manoeuvres', nom:'🦉 Manœuvres travaillées' },
    { cle:'groupesTravail', type:'ok', nom:'4 groupes de travail suivis', defaut:'' },
    { cle:'ecoutes',     type:'ok',    nom:"Plus d'écoutes que de conduite", defaut:'' }
  ],
  simu: [
    { cle:'competences', type:'competences', nom:'Compétences travaillées' },
    { cle:'resume',      type:'texte', nom:'🧠 Remarques du cours', lignes:10 }
  ],
  /* L'évaluation se remplit rubrique par rubrique, comme la fiche
     papier. Un bloc de notes libre ne suffisait pas : le bilan
     attend un état ET un détail par rubrique, et ce qui était écrit
     dans le bloc n'arrivait nulle part. */
  eval: [
    { cle:'passif', type:'texte', lignes:3, nom:'🔍 Passif',
      aide:'Ce qu\'il a déjà conduit, ce qu\'il sait déjà faire.' },

    { cle:'__tdef', type:'titre',
      nom:'🚨 Résumé des défauts vus ce jour à corriger' },

    { cle:'installation', type:'texte', lignes:2, nom:'Installation' },

    { cle:'rubriques.manipulation', type:'eval3', nom:'Manipulation commandes' },
    { cle:'rubriques.trajectoire',  type:'eval3', nom:'Trajectoire' },
    { cle:'rubriques.giratoires',   type:'eval3', nom:'Giratoires' },
    { cle:'rubriques.vavd',         type:'eval3', nom:'VA / VD' },
    { cle:'rubriques.manoeuvres',   type:'eval3', nom:'Manœuvres' },
    { cle:'rubriques.pad',          type:'eval3', nom:'PAD' },
    { cle:'rubriques.allures',      type:'eval3', nom:'Allures' },
    { cle:'rubriques.controles',    type:'eval3', nom:'Contrôles' },

    { cle:'simuHeures',  type:'court', nom:'Heures de simulateur' },
    { cle:'leconsAvant', type:'court', nom:'Leçons avant examen blanc' },
    { cle:'leconsApres', type:'court', nom:'Leçons après examen blanc' }
  ],
  examenblanc: [
    { cle:'__t1', type:'titre', nom:"𝟭 - 𝗔𝗩𝗔𝗡𝗧 𝗟'𝗘𝗫𝗔𝗠𝗘𝗡" },
    { cle:'avant.carteSD',      type:'ok', nom:'1-1 · Carte SD', defaut:'✅' },

    /* Un bloc de texte plutôt que des cases : le moniteur efface
       l'émoji qui ne convient pas, ✅ ou ❌, directement dans le
       texte. Plus rapide que trois sélecteurs. */
    { cle:'avant.installation', type:'texte', lignes:6,
      nom:'1-2 · Installation',
      aide:'Efface l\'émoji qui ne convient pas.',
      defaut:'𝗜𝗻𝘀𝘁𝗮𝗹𝗹𝗮𝘁𝗶𝗼𝗻 ✅❌\n' +
             'https://www.facebook.com/groups/963972327360861/permalink/969918630099564/\n' +
             '𝗣𝗮𝘀𝘀𝗮𝗴𝗲𝗿 ✅❌\n' +
             '𝗩𝗼𝘆𝗮𝗻𝘁𝘀 ✅❌\n' +
             '𝙉𝙤𝙩𝙚 :  /2' },

    { cle:'avant.erreursRoute', type:'texte', lignes:5,
      nom:"1-3 · Erreurs que tu as faites en allant au centre d'examen",
      aide:'Une erreur par ligne.' },

    { cle:'__t2', type:'titre', nom:"𝟮 - 𝗣𝗘𝗡𝗗𝗔𝗡𝗧 𝗟'𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖" },
    /* Deux boutons plutôt qu'un texte à corriger : la note du
       CEPC s'en déduit toute seule. */
    { cle:'examen.instPassager', type:'ok', nom:'2-1 · Passager', defaut:'' },
    { cle:'examen.instVoyants',  type:'ok', nom:'2-1 · Voyants',  defaut:'' },
    { cle:'examen.installation', type:'texte', lignes:3,
      nom:'2-1 · Remarque sur l\'installation',
      aide:'Facultatif : ce qui a manqué à son installation.' },

    { cle:'examen.verifNote',     type:'note3',
      nom:'2-2 · Note des vérifications' },
    { cle:'examen.verifQuestion', type:'court',
      nom:'2-2 · N° de la question' },

    /* Vingt paires, comme pour l'examen officiel : la remarque de
       l'inspecteur, puis l'explication du moniteur. */
    { cle:'examen.observations', type:'observations',
      nom:"2-3 · Remarques de l'inspecteur et explications" },

    /* Le CEPC clôt le point 2 : il résume l'examen qui vient de se
       dérouler, il n'a rien à faire dans le bilan des erreurs. */
    { cle:'cepc',        type:'cepc',  nom:'🧾 CEPC — bilan des compétences' },

    { cle:'observations',type:'texte', lignes:12,
      nom:'2-4 · Observations',
      aide:'Une observation par ligne.' },

    { cle:'eliminatoires', type:'texte', lignes:6, mort:true,
      nom:'2-5 · Fautes éliminatoires',
      aide:'Une faute par ligne. Le bouton ☠️ la marque comme éliminatoire.' },

    { cle:'__t3', type:'titre', nom:'𝟯 - 𝗕𝗜𝗟𝗔𝗡 𝗗𝗘𝗦 𝗘𝗥𝗥𝗘𝗨𝗥𝗦' },

    /* Les éliminatoires viennent se poser ici dès qu'elles sont
       marquées : le moniteur y répond à la fin de l'examen, sans
       attendre la génération. */
    { cle:'bilanElim', type:'texte', lignes:14,
      nom:'3 · Erreurs éliminatoires',
      aide:'Rempli tout seul quand tu marques une ☠️ plus haut. ' +
           'Réponds aux questions à la fin de l\'examen.' },

    { cle:'bilanErreurs',type:'texte', lignes:14,
      nom:'3 · Autres erreurs',
      aide:"Les repères sont posés : écris l'erreur au bout du 👉 et ta réponse " +
           'au bout de chaque ligne.',
      defaut:('👉 \n' +
              "- qu'en penses-tu ?\n" +
              '- quelles sont TES solutions ?\n' +
              '- ce que je te PROPOSE : \n\n').repeat(3).trim() },

    { cle:'__t4', type:'titre', nom:'𝟰 - 𝗡𝗜𝗩𝗘𝗔𝗨 𝗣𝗘𝗥𝗠𝗜𝗦' },

    /* Sa frise et ses leçons faites, avant les questions : c'est
       sur quoi le moniteur s'appuie pour répondre. */
    { cle:'__rappelFrise', type:'rappelFrise' },

    { cle:'niveau',      type:'niveau', nom:'4 · Niveau permis ?' },
    { cle:'heuresAvant', type:'heures', siNiveau:'oui',
      nom:"4 · Combien d'heures avant permis (+ 3h avant examen)" },
    { cle:'aDate',       type:'ouinon', siNiveau:'oui',
      nom:'4 · A déjà sa date de permis' },
    { cle:'friseAvant',  type:'ouinon', siNiveau:'oui',
      nom:'4 · Frise respectée avant examen blanc' },
    { cle:'friseAvantH', type:'court',  siNiveau:'oui',
      nom:'4 · Si non, heures en plus' },
    { cle:'frisePost',   type:'ouinon', siNiveau:'oui',
      nom:'4 · Frise respectée post permis' },
    { cle:'frisePostH',  type:'court',  siNiveau:'oui',
      nom:'4 · Si non, heures en plus' },
    { cle:'heuresPlanifiees', type:'ok', siNiveau:'oui',
      nom:'4 · Heures avant permis planifiées', defaut:'' },
    { cle:'heuresPosees',     type:'ok', siNiveau:'oui',
      nom:'4 · Heures posées (2×2h + 1×1h)', defaut:'' }
  ],
  examen: [
    /* Deux moments distincts : le trajet vers le centre, puis
       l'examen lui-même. Le moniteur envoie le premier dès que
       l'élève descend, et reprend le second à son tour. */
    { cle:'__titreAvant', type:'titre', nom:'🚗 Avant examen',
      aide:'Le trajet jusqu\'au centre. À envoyer dès que l\'élève ' +
           'a fini de conduire.' },
    { cle:'avantExamen.installation', type:'ok', nom:'AVANT — Installation', defaut:'' },
    { cle:'avantExamen.passager',     type:'ok', nom:'AVANT — Passager',     defaut:'' },
    { cle:'avantExamen.voyants',      type:'ok', nom:'AVANT — Voyants',      defaut:'' },
    { cle:'avantExamen.erreurs',      type:'texte', lignes:5,
      nom:'AVANT — Erreurs à ne pas refaire (trajet vers le centre)' },

    /* Le bouton vient après ce qu'il envoie : le moniteur remplit
       d'abord, puis expédie. */
    { cle:'__envoiAvant', type:'envoiAvant' },

    { cle:'__titreExamen', type:'titre', nom:'🏁 Examen',
      aide:'Ce que l\'inspecteur a noté. À remplir au retour de ' +
           'l\'élève.' },
    /* Ces champs se rangent sous « examen » : c'est là que le
       constructeur du bilan va les chercher. Sans le préfixe,
       ils n'apparaissaient nulle part. */
    { cle:'examen.installation', type:'ok', nom:'EXAMEN — Installation', defaut:'' },
    { cle:'examen.passager',     type:'ok', nom:'EXAMEN — Passager',     defaut:'' },
    { cle:'examen.voyants',      type:'ok', nom:'EXAMEN — Voyants',      defaut:'' },
    /* Une seule case pour les trois : installation, passager et
       voyants se notent ensemble sur /2, et ce qui a coincé se
       raconte d'une traite. Trois cases auraient fait répéter la
       même phrase. */
    { cle:'examen.installTexte', type:'texte', lignes:3,
      nom:'Explication ou correction — installation, passager et voyants' },
    { cle:'examen.verifQuestion', type:'court',
      nom:'N° de la question de vérification' },
    { cle:'examen.vi',           type:'ok', nom:'Vérification', defaut:'' },
    { cle:'examen.viTexte',      type:'texte', lignes:3,
      nom:'Explication ou correction — vérification' },
    { cle:'examen.qser',         type:'ok', nom:'Question sécurité routière', defaut:'' },
    { cle:'examen.qserTexte',    type:'texte', lignes:3,
      nom:'Explication ou correction — sécurité routière' },
    { cle:'examen.secours',      type:'ok', nom:'Premiers secours', defaut:'' },
    { cle:'examen.secoursTexte', type:'texte', lignes:3,
      nom:'Explication ou correction — premiers secours' },
    { cle:'observations',type:'observations', nom:'Observations de l\'inspecteur' },

    /* Ce qui suit ne part jamais à l'élève : c'est pour nous,
       et pour le moniteur qui fera le rendez-vous post-permis. */
    { cle:'__titrePourNous', type:'titre', nom:'🔒 Pour nous seulement',
      aide:'Rien de ce qui suit ne figure sur le bilan de l\'élève. ' +
           'Tout va dans ses notes, pour l\'équipe.' },
    { cle:'inspecteur',  type:'inspecteur', nom:'Inspecteur' },
    { cle:'repassage',   type:'repassage',  nom:'Heures avant repassage' },
    { cle:'noteEquipe',  type:'texte', lignes:5,
      nom:'Note pour l\'équipe',
      aide:'Ce que le moniteur du rendez-vous post-permis doit savoir : ' +
           'l\'état de l\'élève, un souci pendant l\'examen, une ' +
           'remarque de l\'inspecteur.' }
  ],
  /* Le rendez-vous pédagogique : ce que le constructeur attend,
     et rien d'autre. Le bloc de notes unique d'avant n'était lu
     nulle part — tout ce qu'on y écrivait était perdu. */
  rvp: [
    { cle:'carteSD',      type:'ok', nom:'Carte SD', defaut:'✅' },
    { cle:'installation', type:'ok', nom:'Installation', defaut:'✅' },
    { cle:'passager',     type:'ok', nom:'Passager', defaut:'✅' },
    { cle:'voyants',      type:'ok', nom:'Voyants', defaut:'✅' },
    { cle:'rubriques',    type:'rubriques', nom:'🧠 Erreurs de ce jour' }
  ],
  /* La formation accompagnateur : carte SD, installation et les
     neuf rubriques. Même constat que pour le RVP. */
  accompagnateur: [
    { cle:'carteSD',      type:'ok', nom:'Carte SD', defaut:'✅' },
    { cle:'installation', type:'ok', nom:'Installation', defaut:'✅' },
    { cle:'rubriques',    type:'rubriques', nom:'🧠 Erreurs de ce jour' }
  ]
};

/* ============================================================
   L'EXAMEN BLANC GLISSÉ DANS UN RENDEZ-VOUS PÉDAGOGIQUE

   Les mêmes champs qu'un examen blanc, moins la section 1 : au
   RVP l'élève ne roule pas jusqu'au centre d'examen, et sa carte
   SD comme son installation sont déjà en haut du bilan.

   Le schéma est DÉRIVÉ de celui de l'examen blanc, jamais recopié :
   un champ ajouté là-bas arrive ici tout seul. Les clés sont
   préfixées, sinon « bilanErreurs » écraserait celui du RVP.
   ============================================================ */
CHAMPS_MANUELS.rvp = CHAMPS_MANUELS.rvp.concat(
  /* La question d'abord. « Non » ferme le sujet et le bilan le dit
     par un ❌ ; « oui » ouvre les champs de l'examen blanc. Sans
     réponse, le bilan garde sa forme d'avant. */
  [{ cle:'examenBlancFait', type:'ouinon',
     nom:'📝 Tu peux faire un examen blanc ?' }],

  CHAMPS_MANUELS.examenblanc
    /* La section 1 saute : elle n'a pas lieu d'être ici */
    .filter(c => c.cle.indexOf('avant.') !== 0 && c.cle !== '__t1')
    .map(c => Object.assign({}, c, {
      cle: (c.cle.indexOf('__') === 0) ? c.cle + 'Rvp' : 'examenBlanc.' + c.cle,
      /* Tout le module ne s'affiche que sur un « oui » */
      siEb: 'oui'
    }))
);

/* La boîte automatique part du même formulaire que la boîte manuelle,
   puis les deux évoluent séparément. */
CHAMPS_MANUELS.conduiteResumeAuto =
  JSON.parse(JSON.stringify(CHAMPS_MANUELS.conduiteResume));


/* Le préfixe des champs d'examen blanc.

   Sur un examen blanc, ils vivent à la racine : « niveau »,
   « cepc », « examen.verifNote ». Glissés dans un rendez-vous
   pédagogique, ils sont rangés sous « examenBlanc. » — sinon
   « bilanErreurs » écraserait celui du RVP, qui n'a ni la même
   forme ni le même sens. */
let prefixeExamenBlanc = '';

/* L'identifiant d'un champ. TOUS les points sont remplacés :
   replace('.','_') n'en remplaçait qu'un, et une clé préfixée en
   compte deux (« examenBlanc.examen.verifNote »). */
function idChamp(cle){
  return 'man_' + String(cle || '').split('.').join('_');
}

/* La clé du champ « niveau » en cours : elle change avec le
   préfixe, et c'est elle qui décide de ce qui s'affiche. */
let cleNiveauCourante = 'niveau';

/* champsManuels : déclaré dans ec-etat.js */
/* modeManuel : déclaré dans ec-etat.js */

/* La dictée est-elle possible sur ce navigateur ? */
function dicteePossible(){
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/* Dictée dans un champ précis, sans toucher au reste.

   Ce que ec-vocal.js avait déjà appris et qui manquait ici :
   sur Android, Chrome empile les résultats provisoires au lieu de
   les remplacer, et une instance de reconnaissance relancée relivre
   les phrases de la session précédente. Les deux ensemble
   recopiaient le texte dicté plusieurs fois de suite. */
function dicterDans(champ, bouton){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ showToast('La dictée demande Chrome sur Android.'); return; }

  /* Un second appui arrête pour de bon */
  if(bouton.dataset.actif === 'oui'){
    bouton.dataset.stop = 'oui';
    if(bouton._sr) try{ bouton._sr.stop(); }catch(e){}
    return;
  }

  /* Le texte acquis. Il se fige à la fin de chaque session : la
     boîte fait autorité, et le moniteur peut corriger entre deux
     phrases sans que la dictée suivante ramène ce qu'il a effacé. */
  let depart = champ.value;

  /* Chaque session porte un jeton. Une instance abandonnée qui
     livre un résultat en retard n'écrit plus rien : c'est ce qui
     faisait se marcher dessus deux reconnaissances. */
  let jeton = 0;

  /* Deux fins de session vides coup sur coup, très vite : le micro
     ne répond pas. On rend la main plutôt que de relancer sans fin. */
  let vides = 0;

  const ecrire = (texteSession) => {
    const base = depart ? depart + (depart.endsWith('\n') ? '' : ' ') : '';
    champ.value = base + terminerPhrase(texteSession);
    champ.scrollTop = champ.scrollHeight;
  };

  const arreter = () => {
    jeton++;                      /* plus rien de l'ancienne session */
    bouton.dataset.actif = '';
    bouton.dataset.stop = '';
    bouton.textContent = '🎙️';
    bouton.style.background = '';
    bouton.title = 'Dicter dans ce champ';
    bouton._sr = null;
  };

  /* Une instance NEUVE à chaque session. Rappeler start() sur une
     instance terminée fait relivrer par Chrome tout ce qui venait
     d'être dit — la cause de la recopie. */
  const nouvelleSession = () => {
    const sr = new SR();
    sr.lang = 'fr-FR';
    /* Android ignore le mode continu et se comporte mal avec :
       on relance nous-mêmes à chaque fin de session. */
    sr.continuous = !estAndroid;
    /* Les provisoires ne sont gardés que là où ils fonctionnent.
       Sur Android ils s'empilent au lieu de se remplacer. */
    sr.interimResults = !estAndroid;
    sr.maxAlternatives = 3;

    const monJeton = ++jeton;
    let session = '';
    const debut = Date.now();

    sr.onresult = ev => {
      if(monJeton !== jeton) return;      /* instance abandonnée */

      /* On reconstruit TOUT depuis l'index 0 à chaque fois, au lieu
         d'ajouter à la suite : impossible d'accumuler des doublons. */
      const bouts = [];
      for(let i = 0; i < ev.results.length; i++){
        let meilleur = ev.results[i][0].transcript;
        let score = -1;
        for(let k = 0; k < ev.results[i].length; k++){
          const s = scoreMetier(ev.results[i][k].transcript);
          if(s > score){ score = s; meilleur = ev.results[i][k].transcript; }
        }
        const t = String(meilleur || '').trim();
        if(t) bouts.push(t);
      }

      /* fusionner() ne garde que la version la plus complète de
         chaque phrase. Chrome sur Android livre « pense » / « pense
         à tes » / « pense à tes contrôles » comme trois résultats
         distincts : les mettre bout à bout écrivait la phrase trois
         fois de suite. ec-vocal.js s'en servait déjà, pas ce module —
         c'est toute la différence entre les deux dictées. */
      session = corrigerVocabulaire(fusionner(bouts));
      ecrire(session);
    };

    sr.onerror = e => {
      /* Un silence n'est pas une erreur : on relancera. */
      if(e.error === 'no-speech' || e.error === 'aborted') return;
      if(e.error === 'not-allowed' || e.error === 'service-not-allowed'){
        bouton.dataset.stop = 'oui';
        showToast('Le micro est refusé. Autorise-le dans le navigateur.');
        return;
      }
      if(e.error === 'network') return;
      showToast('Dictée : ' + e.error);
    };

    sr.onend = () => {
      if(monJeton !== jeton) return;      /* instance abandonnée */

      /* Ce qui vient d'être dit rejoint l'acquis. Les espaces de
         fin sont retirés, sinon chaque relance en ajoutait un. */
      ecrire(session);
      depart = champ.value.replace(/[ \t]+$/, '');
      champ.value = depart;

      if(bouton.dataset.stop === 'oui'){ arreter(); return; }

      /* Rien entendu et session expédiée : le micro ne répond pas. */
      vides = (!session && (Date.now() - debut) < 500) ? vides + 1 : 0;
      if(vides >= 20){
        showToast('Le micro ne répond plus. Appuie à nouveau sur 🎙️.');
        arreter();
        return;
      }

      try{
        bouton._sr = nouvelleSession();
      }catch(e){
        showToast('Dictée interrompue.');
        arreter();
      }
    };

    sr.start();
    return sr;
  };

  bouton.dataset.actif = 'oui';
  bouton.dataset.stop = '';
  bouton.textContent = '⏹️';
  bouton.style.background = 'var(--red)';
  bouton.title = 'Appuie pour arrêter la dictée';

  try{
    bouton._sr = nouvelleSession();
    showToast('🎙️ Dictée en cours — appuie sur ⏹️ pour arrêter');
  }catch(e){
    showToast('Dictée indisponible.');
    arreter();
  }
}


/* Une ligne du CEPC : la compétence et son niveau */
/* Une compétence : son libellé, puis les cases de notation alignées
   à droite comme sur le CEPC de l'inspecteur. Le moniteur retrouve
   le geste du document officiel plutôt qu'un menu déroulant. */
function ligneCepc(nom, valeurs, rang){
  const l = document.createElement('div');
  /* Une ligne sur deux teintée, comme sur le document */
  l.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 12px;' +
    'background:' + ((rang % 2 === 0) ? '#EDF1F5' : '#FFFFFF') + ';';

  const t = document.createElement('span');
  t.style.cssText = 'flex:1;font-size:12px;color:#1B6AC9;line-height:1.35;min-width:0;';
  t.textContent = nom;
  l.appendChild(t);

  /* La mention éliminatoire, à gauche des cases */
  const alerte = document.createElement('span');
  alerte.className = 'cepcAlerte';
  alerte.style.cssText = 'display:none;font-size:10px;font-weight:800;' +
    'color:#E5322D;flex-shrink:0;text-align:right;line-height:1.2;';
  alerte.textContent = 'Résultat éliminatoire';
  l.appendChild(alerte);

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:4px;flex-shrink:0;';

  /* Le champ qui porte la valeur : les boutons ne font que l'écrire */
  const champ = document.createElement('input');
  champ.type = 'hidden';
  champ.className = 'cepcNiveau';
  champ.setAttribute('data-comp', nom);
  champ.value = '';
  l.appendChild(champ);

  /* Toutes les colonnes du document, même celles qui n'existent pas
     pour cette compétence : l'alignement des cases est ce qui rend
     la grille lisible. */
  const colonnes = (valeurs.indexOf('0.5') !== -1)
    ? ['', '0', '0.5', '1', '']
    : ['E', '0', '1', '2', '3'].map(v => (valeurs.indexOf(v) !== -1 ? v : ''));

  const boutons = [];

  colonnes.forEach(val => {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.cssText = 'width:34px;height:30px;padding:0;margin:0;font-size:13px;' +
      'border-radius:6px;font-family:inherit;cursor:pointer;flex-shrink:0;' +
      'transition:background .12s, color .12s;';

    if(val === ''){
      /* Colonne inexistante : grisée, comme sur le CEPC */
      b.disabled = true;
      b.style.background = '#E6EAEE';
      b.style.border = '1px solid #E6EAEE';
      b.style.cursor = 'default';
      r.appendChild(b);
      return;
    }

    b.textContent = (val === '0.5') ? '0,5' : val;
    b.setAttribute('data-val', val);
    boutons.push(b);

    const peindre = () => {
      const pris = (champ.value === val);
      const rouge = (val === 'E');
      b.style.background = pris ? (rouge ? '#E5322D' : '#1568C8') : '#FFFFFF';
      b.style.border = '1px solid ' +
        (pris ? (rouge ? '#E5322D' : '#1568C8') : '#C9D6E2');
      b.style.color = pris ? '#FFFFFF' : '#1B6AC9';
      b.style.fontWeight = pris ? '800' : '400';
    };
    b._peindre = peindre;

    b.addEventListener('click', () => {
      /* Un second appui retire la note : le moniteur peut se raviser */
      champ.value = (champ.value === val) ? '' : val;
      boutons.forEach(x => x._peindre());
      alerte.style.display = (champ.value === 'E') ? 'block' : 'none';
      majTotalCepc();
    });

    peindre();
    r.appendChild(b);
  });

  l.appendChild(r);
  return l;
}

function majTotalCepc(){
  const z = document.getElementById('cepcTotal');
  if(!z) return;
  const c = {};
  document.querySelectorAll('.cepcNiveau').forEach(s => {
    if(s.value) c[s.getAttribute('data-comp')] = s.value;
  });
  const r = calculerCepc(c);

  /* Mise en page du document : le libellé à gauche, le verdict et
     la note à droite dans sa case colorée. */
  let etat, couleur, note;
  if(r.elimine){
    etat = 'ÉLIMINATOIRE'; couleur = '#E5322D'; note = 'E';
  }else if(r.favorable){
    etat = 'FAVORABLE'; couleur = '#1568C8'; note = String(r.total).replace('.', ',');
  }else{
    etat = 'INSUFFISANT'; couleur = '#E5322D'; note = String(r.total).replace('.', ',');
  }

  z.innerHTML =
    '<span style="color:#1B6AC9;font-weight:400;font-size:12px;">Total général</span>' +
    '<span style="display:flex;align-items:center;gap:8px;">' +
      '<span style="color:' + couleur + ';font-size:11px;">' + etat + '</span>' +
      '<span style="background:' + couleur + ';color:#fff;padding:4px 10px;' +
        'border-radius:4px;font-size:12px;">' + note + '</span>' +
      (r.elimine ? '' : '<span style="color:#8A94A0;font-weight:400;font-size:10px;">/ ' +
        r.max + '</span>') +
    '</span>';
}

/* Construit le formulaire du bilan manuel */
async function ouvrirBilanManuel(){
  const probleme = verifierContexteManuel();
  if(probleme){ showToast(probleme); return; }

  /* Modifiables : l'examen officiel peut basculer d'une boîte à
     l'autre quand la question est posée au moniteur. */
  let modeleCle = $('modele').value;
  let modele = MODELES[modeleCle];

  /* Le rendez-vous post-permis a son propre écran */
  if(modeleCle === 'rdv-post'){
    const nom = $('studentName').value.trim();
    if(nom.length < 2){ showToast("Saisis le nom de l'élève."); return; }
    ouvrirRdvPost({ eleve: nom, date: $('lessonDate').value,
                    moniteur: ACCES.moniteur || '', note: '', modele: 'rdv-post' });
    return;
  }

  /* La fiche handicap se construit ligne par ligne depuis le
     document papier : elle est trop longue pour être écrite à
     la main dans le tableau des schémas. */
  const champs = (modele.schema === 'handicap')
    ? schemaHandicap()
    : CHAMPS_MANUELS[modele.schema];
  if(!champs){ showToast('Ce modèle ne se remplit pas encore à la main.'); return; }

  const eleve = $('studentName').value.trim();
  const btn = $('manuelBtn');
  btn.disabled = true;
  btn.textContent = 'Préparation…';

  /* L'examen officiel n'a pas de leçon à préparer : le
     questionnaire n'apprendrait rien, et son bilan ne dépend pas
     de la boîte de vitesses. On passe directement à la fiche. */
  /* Le questionnaire ne s'ouvre plus avant le bilan : même règle
     qu'en vocal. Ce qui manque s'écrit en rouge sur le bouton
     « 📋 Compléter les infos », et le questionnaire de fin
     redemandera ce qui a bougé pendant le cours. */
  if(typeof majBoutonCompleter === 'function') majBoutonCompleter();

  /* Ce qui se remplit tout seul : frise, manœuvres déjà validées */
  let dossier = { manoeuvres: [], frise: '' };
  try{ dossier = await chargerDossierEleve(eleve); }catch(e){}

  /* Gardé pour la génération : les frises s'y comparent */
  dossierManuel = dossier;


  btn.disabled = false;
  btn.textContent = '✍️ Bilan à remplir à la main';

  champsManuels = {};
  modeManuel = true;

  /* Sa date de permis, si elle est connue : la redemander au
     moniteur n'apprend rien de plus. */
  if(modeleCle === 'examen-blanc'){
    const s = (typeof suiviDe === 'function') ? suiviDe(eleve) : {};
    const aUneDate = !!String(s.datePermis || '').trim() ||
                     !!String((dossier && dossier.datePermis) || '').trim();
    champsManuels.aDate = aUneDate ? 'oui' : 'non';
  }

  /* La liste des inspecteurs, pour l'examen officiel */
  if(modeleCle === 'examen-officiel'){
    try{ await chargerInspecteurs(); }catch(e){}
  }

  const zone = $('manuelChamps');
  zone.innerHTML = '';

  /* Chaque saisie sera gardée : une coupure ne doit plus rien
     coûter. */
  if(!zone.dataset.surveille){
    zone.dataset.surveille = 'oui';
    surveillerChampsManuels();
  }

  /* Le module d'examen blanc du RVP range ses champs à part ; sur
     un vrai examen blanc ils restent à la racine. */
  prefixeExamenBlanc = (modele.schema === 'rvp') ? 'examenBlanc.' : '';
  cleNiveauCourante = prefixeExamenBlanc + 'niveau';

  dessinerChampsManuels(champs, zone, modele, dossier);
  if(typeof majChampsSelonExamenBlanc === 'function') majChampsSelonExamenBlanc();

  /* Tant qu'aucun niveau n'est choisi, on ne demande rien qui en
     dépende. */
  if(typeof majChampsSelonNiveau === 'function') majChampsSelonNiveau();

  /* L élève part avec tous les points du CEPC : chaque erreur en
     retire. C est ainsi que l inspecteur raisonne. */
  if(modeleCle === 'examen-blanc' && typeof poserCepcAuMaximum === 'function'){
    poserCepcAuMaximum();
  }

  /* La fiche d'évaluation connaît déjà son en-tête : l'élève, le
     moniteur et la date sont à l'écran, les retaper est inutile. */
  if(modeleCle === 'handicap'){
    const poser = (cle, valeur) => {
      if(!valeur) return;
      const el = document.getElementById(idChamp(cle));
      if(el && !el.value){
        el.value = valeur;
        champsManuels[cle] = valeur;
      }
    };

    poser('handicap.conducteur', eleve);
    poser('handicap.formateur',
          (ACCES.emoji ? ACCES.emoji + ' ' : '') + (ACCES.moniteur || ''));
    poser('handicap.date',
          dateEnToutesLettres($('lessonDate').value) ||
          $('lessonDate').value || todayLocal());

    /* La problématique vient du questionnaire ou de ses notes */
    poser('handicap.problematique',
          (contexteDepart && contexteDepart.problematique) ||
          (typeof problematiqueConnue === 'function'
            ? problematiqueConnue() : ''));
  }

  /* Frise récupérée automatiquement */
  const aide = $('aideManuel');
  if(aide){
    aide.textContent = dicteePossible()
      ? "Remplis chaque rubrique. Le 🎙️ à côté d'un champ permet de dicter au lieu d'écrire."
      : "Remplis chaque rubrique en écrivant. La dictée demanderait Chrome sur Android, "
        + "mais tout le reste fonctionne normalement ici.";
  }

  const info = $('manuelInfo');
  const frise = dossier.frise || extraireFrise($('noteInterne').value);
  const versionApp = (document.querySelector('.version') || {}).textContent || '';
  info.innerHTML = '<strong>' + (eleve || '') + '</strong> · ' + modele.label +
    (versionApp ? ' · <span style="color:var(--muted);">' + versionApp + '</span>' : '') +
    (frise ? '<br>Frise reprise : ' + frise.replace(/</g,'&lt;') : '') +
    ((dossier.manoeuvres || []).length
      ? '<br>' + dossier.manoeuvres.length + ' manœuvre(s) déjà validée(s), reprises automatiquement'
      : '');

  /* Le cadre suit sur cet écran, que le questionnaire vienne
     d'être rempli ou qu'il l'ait été au démarrage du cours. */
  if(contexteDepart && typeof afficherSaisieDuJour === 'function'){
    afficherSaisieDuJour(contexteDepart, 'preparationManuel');
  }

  $('recordView').style.display = 'none';
  $('resultView').style.display = 'none';
  $('manuelView').style.display = 'block';
  window.scrollTo(0, 0);
}

/* Peindre un choix oui/non comme si le moniteur avait appuyé.

   Une bordure seule se remarque mal : c'est le fond plein qui
   fait qu'on voit la réponse d'un coup d'œil. */
/* Masquer ce qui ne sert pas.

   Sans le niveau, ni avec « pourrait », les heures avant permis
   et les frises n'ont pas d'objet : elles n'apparaissent nulle
   part dans le bilan. */
/* Le module d'examen blanc du rendez-vous pédagogique n'apparaît
   qu'après un « oui ». Sans réponse, il reste fermé : on ne fait
   pas remplir une grille d'examen à qui n'en passe pas. */
function majChampsSelonExamenBlanc(){
  const v = champsManuels.examenBlancFait || '';
  document.querySelectorAll('[data-si-eb]').forEach(b => {
    b.style.display = (v === b.dataset.siEb) ? '' : 'none';
  });

  /* L'examen commence : l'élève part avec tous les points, chaque
     erreur en retire. On ne le fait qu'à l'ouverture du module —
     poser la grille plus tôt ferait passer un RVP sans examen pour
     un examen blanc rempli. */
  if(v === 'oui' && typeof poserCepcAuMaximum === 'function'){
    poserCepcAuMaximum();
    if(typeof majTotalCepc === 'function') majTotalCepc();
  }
}

function majChampsSelonNiveau(){
  const n = champsManuels[cleNiveauCourante] || '';

  document.querySelectorAll('#manuelChamps [data-si-niveau]').forEach(b => {
    const requis = b.dataset.siNiveau;
    b.style.display = (n === requis) ? '' : 'none';
  });
}


function peindreOuiNon(rangee, valeur){
  const couleurs = {
    'oui': ['var(--orange)', '#0B0B0B'],
    'non': ['var(--red)', '#FFFFFF'],
    'peut': ['var(--accent-text)', '#0B0B0B'],
    '':    ['var(--muted)', '#0B0B0B']
  };

  Array.prototype.forEach.call(rangee.children, b => {
    if(b.getAttribute('data-val') !== valeur){
      b.style.background = 'var(--navy)';
      b.style.borderColor = 'var(--line)';
      b.style.color = 'var(--cream)';
      b.style.fontWeight = '400';
      b.style.transform = 'none';
      b.style.boxShadow = 'none';
      return;
    }

    const [fond, texte] = couleurs[valeur] || couleurs[''];
    b.style.background = fond;
    b.style.borderColor = fond;
    b.style.color = texte;
    b.style.fontWeight = '700';
    b.style.transform = 'scale(1.04)';
    b.style.boxShadow = '0 2px 10px rgba(0,0,0,.35)';
  });
}


function ajouterObservationManuelle(zone){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px;';

  const insp = document.createElement('input');
  insp.type = 'text';
  insp.className = 'obsInsp';
  insp.placeholder = "Remarque de l'inspecteur";
  /* Deux fonds distincts : ce que dit l'inspecteur et ce que
     répond le moniteur ne se confondent plus d'un coup d'œil. */
  insp.style.cssText = 'margin-bottom:6px;background:rgba(46,124,196,.14);' +
    'border-color:rgba(46,124,196,.4);';
  /* Le récapitulatif suit ce qui s'écrit */
  /* La remarque alimente le bilan, mais seulement quand le
     moniteur a fini de taper : réécrire à chaque lettre coupait
     ses phrases en morceaux. */
  let minuteurObs = null;
  const surSaisie = () => {
    clearTimeout(minuteurObs);
    minuteurObs = setTimeout(() => {
      if(typeof majBilanEliminatoires === 'function') majBilanEliminatoires();
    }, 900);
  };
  insp.addEventListener('input', surSaisie);
  d.appendChild(insp);

  /* L'explication, avec de quoi marquer une erreur éliminatoire */
  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:6px;align-items:center;';

  const rep = document.createElement('input');
  rep.type = 'text';
  rep.className = 'obsRep';
  rep.placeholder = 'Explication ou correction';
  rep.style.cssText = 'flex:1;min-width:0;margin:0;' +
    'background:rgba(255,255,255,.05);';
  /* L explication aussi : le bilan la reprend */
  rep.addEventListener('input', surSaisie);
  r.appendChild(rep);

  const bMort = document.createElement('button');
  bMort.type = 'button';
  bMort.className = 'btn btn-secondary';
  bMort.style.cssText = 'width:auto;padding:10px 13px;font-size:17px;margin:0;flex-shrink:0;';
  bMort.textContent = '☠️';
  bMort.title = 'Marquer comme erreur éliminatoire';

  /* La catégorie du CEPC, gardée sur le bloc : c'est elle qui
     décide où le E se coche et comment l'erreur se range. */
  const majMort = () => {
    const cat = d.dataset.categorie || '';
    bMort.style.borderColor = cat ? 'var(--red)' : 'var(--line)';
    bMort.style.color = cat ? 'var(--red)' : '';

    let etiq = d.querySelector('.obsCat');
    if(cat){
      if(!etiq){
        etiq = document.createElement('div');
        etiq.className = 'obsCat';
        etiq.style.cssText = 'font-size:11px;color:var(--red);margin-top:6px;';
        d.appendChild(etiq);
      }
      etiq.textContent = '☠️ ' + cat;
    }else if(etiq){
      etiq.remove();
    }
  };

  bMort.addEventListener('click', async () => {
    /* Déjà marquée : un second appui retire la marque */
    if(d.dataset.categorie){
      d.dataset.categorie = '';
      majMortEtCepc();
      return;
    }

    const cat = await choisirCategorieCepc();
    if(!cat) return;

    d.dataset.categorie = cat;
    majMortEtCepc();
  });

  /* Le CEPC se met à jour à chaque changement : le moniteur voit
     le E se cocher, il n'a pas à attendre la génération pour
     savoir si c'est bien enregistré. */
  const majMortEtCepc = () => {
    majMort();
    if(typeof rafraichirEliminatoires === 'function') rafraichirEliminatoires();
  };
  r.appendChild(bMort);

  /* Une erreur grave sans être éliminatoire : elle rejoint le
     bilan des erreurs, mais ne touche pas au CEPC. */
  const bGrave = document.createElement('button');
  bGrave.type = 'button';
  bGrave.className = 'btn btn-secondary';
  bGrave.style.cssText = 'width:auto;padding:10px 13px;font-size:17px;' +
    'margin:0;flex-shrink:0;';
  bGrave.textContent = '⚠️';
  bGrave.title = 'À reprendre dans le bilan des erreurs';

  const majGrave = () => {
    const cat = d.dataset.grave || '';
    bGrave.style.borderColor = cat ? 'var(--accent-text)' : 'var(--line)';
    bGrave.style.color = cat ? 'var(--accent-text)' : '';

    let etiq = d.querySelector('.obsGrave');
    if(cat){
      if(!etiq){
        etiq = document.createElement('div');
        etiq.className = 'obsGrave';
        etiq.style.cssText = 'font-size:11px;color:var(--accent-text);' +
          'margin-top:6px;';
        d.appendChild(etiq);
      }
      etiq.textContent = '⚠️ ' + cat;
    }else if(etiq){
      etiq.remove();
    }
  };

  bGrave.addEventListener('click', async () => {
    if(d.dataset.grave){
      d.dataset.grave = '';
      majGrave();
      if(typeof majBilanEliminatoires === 'function') majBilanEliminatoires();
      return;
    }

    /* La ligne du CEPC sert à ranger l'erreur dans le bilan ;
       elle ne coûte aucun point, contrairement au ➖. */
    const cat = await choisirCategorieCepc(true, 'grave');
    if(!cat) return;

    d.dataset.grave = cat;
    majGrave();
    if(typeof majBilanEliminatoires === 'function') majBilanEliminatoires();
  });
  r.appendChild(bGrave);

  /* Un point en moins sur une ligne du CEPC. Trois appuis sur la
     même catégorie lui coûtent trois crans — jamais E : seule la
     tête de mort élimine. */
  const bMoins = document.createElement('button');
  bMoins.type = 'button';
  bMoins.className = 'btn btn-secondary';
  bMoins.style.cssText = 'width:auto;padding:10px 14px;font-size:17px;' +
    'margin:0;flex-shrink:0;font-weight:800;';
  bMoins.textContent = '➖';
  bMoins.title = 'Retirer un point sur une compétence';

  const majMoins = () => {
    const cat = d.dataset.moins || '';
    bMoins.style.borderColor = cat ? 'var(--warn-text)' : 'var(--line)';
    bMoins.style.color = cat ? 'var(--warn-text)' : '';

    let etiq = d.querySelector('.obsMoins');
    if(cat){
      if(!etiq){
        etiq = document.createElement('div');
        etiq.className = 'obsMoins';
        etiq.style.cssText = 'font-size:11px;color:var(--warn-text);' +
          'margin-top:6px;';
        d.appendChild(etiq);
      }
      etiq.textContent = '➖ 1 point — ' + cat;
    }else if(etiq){
      etiq.remove();
    }
  };

  bMoins.addEventListener('click', async () => {
    if(d.dataset.moins){
      d.dataset.moins = '';
      majMoins();
      retirerPointsCepc();
      if(typeof majBilanEliminatoires === 'function') majBilanEliminatoires();
      return;
    }

    const cat = await choisirCategorieCepc(true, 'moins');
    if(!cat) return;

    d.dataset.moins = cat;
    majMoins();
    retirerPointsCepc();
    if(typeof majBilanEliminatoires === 'function') majBilanEliminatoires();
  });
  r.appendChild(bMoins);

  d.appendChild(r);
  zone.appendChild(d);
  return d;
}


/* ============================================================
   LE CEPC, TENU À JOUR

   Le moniteur coche une éliminatoire : le E apparaît aussitôt
   sur le CEPC, et la liste des erreurs se remplit sous ses yeux.
   Attendre la génération le laisserait dans le doute.
   ============================================================ */

function rafraichirEliminatoires(){
  /* Les catégories marquées, sans doublon */
  const touchees = {};
  document.querySelectorAll('#manuelChamps [data-categorie]').forEach(d => {
    const cat = d.dataset.categorie;
    if(cat) touchees[cat] = true;
  });

  /* Sur le CEPC : un E là où il faut, retiré ailleurs.

     Seules les cases posées par une éliminatoire sont retirées :
     un E coché à la main par le moniteur lui appartient. */
  document.querySelectorAll('.cepcNiveau').forEach(champ => {
    const ligne = champ.getAttribute('data-comp');
    const vise = !!touchees[ligne];
    const pose = (champ.dataset.parElim === 'oui');

    if(vise && champ.value !== 'E'){
      champ.value = 'E';
      champ.dataset.parElim = 'oui';
    }else if(!vise && pose){
      champ.value = '';
      champ.dataset.parElim = '';
    }else{
      return;                          /* rien à changer sur cette ligne */
    }

    /* Les boutons se repeignent, sinon le E reste invisible */
    const l = champ.parentNode;
    if(!l) return;
    l.querySelectorAll('button').forEach(b => {
      if(typeof b._peindre === 'function') b._peindre();
    });
    const al = l.querySelector('.cepcAlerte');
    if(al) al.style.display = (champ.value === 'E') ? 'block' : 'none';
  });

  if(typeof majTotalCepc === 'function') majTotalCepc();
  majBilanEliminatoires();
}


/* ============================================================
   LE BILAN DES ÉLIMINATOIRES, ÉCRIT EN DIRECT

   Le moniteur répond aux questions à la fin de l'examen : il lui
   faut la structure sous les yeux, pas après la génération.

   Ce qu'il a déjà écrit ne disparaît jamais — on ajoute les
   blocs manquants en tête et on laisse le reste intact. Un bloc
   devenu inutile, à lui de l'effacer.
   ============================================================ */

function majBilanEliminatoires(){
  const zone = document.getElementById(idChamp(prefixeExamenBlanc + 'bilanElim'));
  if(!zone) return;

  /* Tout ce qui est marqué, rangé par ligne du CEPC. Les trois
     boutons se retrouvent sous le même titre : c'est la
     compétence qui regroupe, pas le type de marque. */
  const par = {};
  const sansCategorie = [];

  document.querySelectorAll('#obsManuel > div').forEach(d => {
    if(!d.dataset) return;

    const i = d.querySelector('.obsInsp');
    const r = d.querySelector('.obsRep');
    const o = {
      inspecteur: i ? i.value.trim() : '',
      reponse: r ? r.value.trim() : '',
      /* L'élimination se signale sur l'erreur, pas sur le titre */
      elim: !!d.dataset.categorie
    };
    if(!o.inspecteur && !o.reponse) return;

    const cat = d.dataset.categorie || d.dataset.moins || d.dataset.grave || '';

    if(cat) (par[cat] = par[cat] || []).push(o);
    else sansCategorie.push(o);
  });

  const noms = Object.keys(par);
  if(!noms.length && !sansCategorie.length){
    /* Plus rien de marqué : on ne laisse pas de blocs orphelins,
       sauf si le moniteur y a déjà répondu. */
    if(!zone.value.trim() || zone.dataset.intact === 'oui'){
      zone.value = '';
      champsManuels[prefixeExamenBlanc + 'bilanElim'] = '';
    }
    return;
  }

  /* L'ordre du CEPC, celui que suit l'inspecteur */
  const ordre = (typeof toutesCategoriesCepc === 'function')
    ? toutesCategoriesCepc().filter(n => par[n]) : noms;

  const bouts = [];

  const ecrire = o => {
    if(o.inspecteur){
      bouts.push('👨‍✈️ ' + o.inspecteur +
                 (o.elim ? ' ☠️ Erreur éliminatoire' : ''));
    }else if(o.elim){
      bouts.push('☠️ Erreur éliminatoire');
    }
    if(o.reponse) bouts.push(emojiMoniteur() + ' ' + o.reponse);
    bouts.push("- qu'en penses-tu ?");
    bouts.push('- quelles sont TES solutions ?');
    bouts.push('- ce que je te PROPOSE : ');
    bouts.push('');
  };

  ordre.forEach(cat => {
    bouts.push('👉 ' + grasUnicode(cat));
    bouts.push('');
    par[cat].forEach(ecrire);
  });

  sansCategorie.forEach(ecrire);

  const propose = bouts.join('\n').trim();

  /* Tant que le moniteur n'a pas écrit dans le champ, on le
     réécrit entièrement : c'est ce qui évite les blocs coupés en
     morceaux à mesure qu'il tape ses remarques.

     Dès qu'il y touche, on n'y revient plus. */
  const intact = (zone.dataset.intact !== 'non');

  if(intact){
    zone.value = propose;
    zone.dataset.intact = 'oui';
    zone.dataset.propose = propose;
  }else{
    /* Il a répondu : on ajoute seulement les compétences absentes */
    const manquantes = ordre.filter(n =>
      zone.value.indexOf(grasUnicode(n)) === -1 &&
      zone.value.indexOf(n) === -1);
    if(!manquantes.length) return;

    const sup = [];
    manquantes.forEach(cat => {
      sup.push('👉 ' + grasUnicode(cat));
      sup.push('');
      const g = par[cat];
      const avant = bouts.length;
      bouts.length = 0;
      g.forEach(ecrire);
      sup.push.apply(sup, bouts);
      bouts.length = avant;
    });

    zone.value = (sup.join('\n') + '\n' + zone.value).trim();
  }

  champsManuels[prefixeExamenBlanc + 'bilanElim'] = zone.value;

  if(typeof sauvegarderBrouillonManuel === 'function'){
    sauvegarderBrouillonManuel();
  }
}


/* Le moniteur a écrit dans le champ : on cesse de le réécrire */
function figerBilanEliminatoires(){
  const zone = document.getElementById(idChamp(prefixeExamenBlanc + 'bilanElim'));
  if(!zone) return;

  /* Ce que l'application a proposé ne compte pas comme une
     saisie : seul un texte différent en est une. */
  if(zone.value !== (zone.dataset.propose || '')){
    zone.dataset.intact = 'non';
  }
}


/* Combien de leçons l'élève a réellement faites.

   Compter les bilans ne suffit pas : un élève arrivé en cours de
   route n'en a qu'un ou deux dans l'outil alors qu'il en est à sa
   huitième leçon. Le numéro écrit dans son dernier bilan dit la
   vérité. */
function leconsFaites(){
  const d = dossierManuel || {};

  const n = parseInt(d.leconNum, 10);
  if(!isNaN(n) && n > 0) return n;

  const t = ($('noteInterne') && $('noteInterne').value) || '';
  const m = t.match(/(\d+)\s*(?:ère|ere|ème|eme|e)?\s*le[çc]on/i);
  if(m){
    const v = parseInt(m[1], 10);
    if(!isNaN(v) && v > 0) return v;
  }

  const c = Number(d.lecons);
  return c > 0 ? c : null;
}


/* ============================================================
   LES FRISES, DÉDUITES

   La frise dit combien de leçons étaient prévues avant et après
   l'examen blanc. Comparer avec ce qui a été fait évite au
   moniteur de le faire de tête.
   ============================================================ */

function remplirFrises(champs, surEcran){
  const frise = (dossierManuel && dossierManuel.frise) ||
                extraireFrise($('noteInterne').value);
  if(!frise) return;

  /* Ce que le calcul a posé lui-même, par opposition à ce que le
     moniteur a saisi : le premier se recalcule, le second est
     sacré. */
  if(!champs.__frisesAuto) champs.__frisesAuto = {};

  const poser = (cle, valeur) => {
    if(champs[cle] === valeur) return;

    champs[cle] = valeur;
    champs.__frisesAuto[cle] = valeur;
    if(!surEcran) return;

    const zone = document.getElementById(idChamp(cle));
    if(zone){ zone.value = valeur; return; }

    const r = document.getElementById('ouinon_' + cle);
    if(!r) return;
    peindreOuiNon(r, valeur);
  };

  /* On recalcule tant que le moniteur n'a pas corrigé lui-même */
  const aMoi = cle => !champs[cle] ||
                      champs.__frisesAuto[cle] === champs[cle];

  /* Avant l'examen blanc : ce que la frise prévoyait, contre ce
     que l'élève a réellement fait. */
  const prevues = leconsAvantExamenBlanc(frise);
  const faites = leconsFaites();

  if(prevues !== null && faites !== null && aMoi('friseAvant')){
    if(faites <= prevues){
      poser('friseAvant', 'oui');
    }else{
      poser('friseAvant', 'non');
      if(aMoi('friseAvantH')){
        poser('friseAvantH', String((faites - prevues) * 2));
      }
    }
  }

  /* Après l'examen blanc : ce que la frise prévoyait, contre les
     heures que le moniteur vient d'annoncer. */
  const apres = leconsApresExamenBlanc(frise);
  const annoncees = Number(String(champs.heuresAvant || '').trim());

  if(apres !== null && annoncees && aMoi('frisePost')){
    /* Les 3h avant examen sont dans les deux comptes : elles
       s'annulent. « 4 + 3 » se compare donc à 4h de leçons. */
    const prevuH = apres * 2;

    if(annoncees <= prevuH){
      poser('frisePost', 'oui');
      if(aMoi('frisePostH') && champs.frisePostH) poser('frisePostH', '');
    }else{
      poser('frisePost', 'non');
      if(aMoi('frisePostH')){
        poser('frisePostH', String(annoncees - prevuH));
      }
    }
  }
}


/* ============================================================
   LES HEURES QUI REMONTENT AU BUREAU

   Le moniteur décide, à l'examen blanc, combien d'heures il faut
   encore. Le bureau en a besoin pour placer les dates : sans ce
   report, il fallait le lui redemander.
   ============================================================ */

function remonterHeuresAuBureau(eleve, heures, niveau){
  if(!eleve) return;

  const h = String(heures || '').trim();

  /* Pas le niveau : les heures n'ont pas de sens, on les efface */
  const valeur = (niveau === 'oui' && h && h !== '0') ? h : '';

  if(niveau !== 'oui' && !valeur) return;      /* rien à dire */

  try{
    if(typeof majSuivi === 'function'){
      majSuivi(eleve, {
        heuresRestantes: valeur,
        /* Ce que le moniteur a conclu, pour que le bureau le voie */
        ebNiveau: niveau === 'oui' ? 'oui'
                : niveau === 'peut' ? 'peut'
                : niveau === 'non' ? 'non' : '',
        ebDate: ($('lessonDate') && $('lessonDate').value) || ''
      });
    }
  }catch(e){ /* le bilan prime : on ne bloque pas pour cela */ }
}


/* ============================================================
   LE CEPC PARTI DE LA NOTE MAXIMALE

   L'élève a tous les points au départ : chaque erreur en retire.
   C'est ainsi que l'inspecteur raisonne, et cela évite au
   moniteur de tout cocher pour un examen réussi.
   ============================================================ */

function poserCepcAuMaximum(){
  if(typeof CEPC_BLOCS === 'undefined') return;

  CEPC_BLOCS.forEach(b => b.items.forEach(it => {
    const max = (it.valeurs || []).filter(v => v !== 'E')
      .map(Number).reduce((a, x) => Math.max(a, x), 0);

    const champ = document.querySelector('.cepcNiveau[data-comp="' +
                                         it.nom.replace(/"/g, '') + '"]');
    if(!champ || champ.value) return;      /* déjà noté : on n'y touche pas */

    champ.value = String(max);
    champ.dataset.parDefaut = 'oui';

    const l = champ.parentNode;
    if(l){
      l.querySelectorAll('button').forEach(x => {
        if(typeof x._peindre === 'function') x._peindre();
      });
    }
  }));

  if(typeof majTotalCepc === 'function') majTotalCepc();
}


/* La note maximale d'une ligne du CEPC */
function maxCepc(nom){
  if(typeof CEPC_BLOCS === 'undefined') return 0;
  let m = 0;
  CEPC_BLOCS.forEach(b => b.items.forEach(it => {
    if(it.nom !== nom) return;
    m = (it.valeurs || []).filter(v => v !== 'E')
      .map(Number).reduce((a, x) => Math.max(a, x), 0);
  }));
  return m;
}


/* Toutes les lignes du CEPC, pour le bouton ➖ */
function toutesCategoriesCepc(){
  const out = [];
  if(typeof CEPC_BLOCS === 'undefined') return out;
  CEPC_BLOCS.forEach(b => b.items.forEach(it => out.push(it.nom)));
  return out;
}


/* Retirer les points, catégorie par catégorie.

   Une catégorie touchée trois fois perd trois points — mais ne
   descend jamais sous zéro, et n'atteint jamais E : seule la
   tête de mort élimine. */
function retirerPointsCepc(){
  const perdus = {};

  document.querySelectorAll('#obsManuel > div').forEach(d => {
    const cat = d.dataset ? (d.dataset.moins || '') : '';
    if(!cat) return;
    perdus[cat] = (perdus[cat] || 0) + 1;
  });

  toutesCategoriesCepc().forEach(nom => {
    const champ = document.querySelector('.cepcNiveau[data-comp="' +
                                         nom.replace(/"/g, '') + '"]');
    if(!champ) return;

    /* Un E posé par une éliminatoire prime sur tout */
    if(champ.value === 'E' && champ.dataset.parElim === 'oui') return;

    /* Jamais notée : la ligne part du maximum, comme le raisonne
       l'inspecteur. Sans cela le ➖ ne trouvait aucune ligne à
       amputer sur une grille vierge — et ne faisait rien du tout,
       en silence. Le CEPC n'était pré-rempli que sur l'examen
       blanc ; il apparaît maintenant ailleurs. */
    if(!champ.value && !champ.dataset.parDefaut && !champ.dataset.parMoins){
      champ.dataset.parDefaut = 'oui';
    }

    /* Une note saisie à la main par le moniteur lui appartient */
    if(champ.dataset.parDefaut !== 'oui' &&
       champ.dataset.parMoins !== 'oui') return;

    const max = maxCepc(nom);
    const n = perdus[nom] || 0;
    if(!n){
      /* Plus d'erreur : la note revient au maximum */
      if(champ.dataset.parMoins === 'oui'){
        champ.value = String(max);
        champ.dataset.parMoins = '';
        champ.dataset.parDefaut = 'oui';
        repeindreLigneCepc(champ);
      }
      return;
    }

    /* Les demi-points existent : on retire un cran, pas un point */
    const echelle = valeursCepc(nom);
    const i = echelle.indexOf(String(max));
    const cible = echelle[Math.max(0, i - n)];

    champ.value = cible;
    champ.dataset.parMoins = 'oui';
    champ.dataset.parDefaut = '';
    repeindreLigneCepc(champ);
  });

  if(typeof majTotalCepc === 'function') majTotalCepc();
}


/* L'échelle d'une ligne, de la plus basse à la plus haute */
function valeursCepc(nom){
  let out = [];
  if(typeof CEPC_BLOCS === 'undefined') return out;
  CEPC_BLOCS.forEach(b => b.items.forEach(it => {
    if(it.nom !== nom) return;
    out = (it.valeurs || []).filter(v => v !== 'E');
  }));
  return out;
}


function repeindreLigneCepc(champ){
  const l = champ.parentNode;
  if(!l) return;
  l.querySelectorAll('button').forEach(b => {
    if(typeof b._peindre === 'function') b._peindre();
  });
  const al = l.querySelector('.cepcAlerte');
  if(al) al.style.display = (champ.value === 'E') ? 'block' : 'none';
}


/* ============================================================
   LES NOTES REPORTÉES SUR LE CEPC

   L'installation vaut 2 : passager et voyants comptent un point
   chacun. Les vérifications valent 3, notées directement.

   Le moniteur voit la note se poser pendant qu'il coche, et
   peut la corriger.
   ============================================================ */

function reporterNotesCepc(){
  /* L'installation : deux cases, deux points */
  const p = champsManuels[prefixeExamenBlanc + 'examen.instPassager'] || '';
  const v = champsManuels[prefixeExamenBlanc + 'examen.instVoyants'] || '';

  if(p || v){
    let n = 0;
    if(p === '✅') n++;
    if(v === '✅') n++;
    poserNoteCepc("Savoir s'installer et assurer la sécurité à bord",
                  String(n));
  }

  /* Les vérifications : la note du moniteur, telle quelle */
  const nv = champsManuels[prefixeExamenBlanc + 'examen.verifNote'];
  if(nv !== undefined && nv !== ''){
    poserNoteCepc('Effectuer des vérifications du véhicule', String(nv));
  }
}


function poserNoteCepc(ligne, valeur){
  const champ = document.querySelector('.cepcNiveau[data-comp="' +
                                       ligne.replace(/"/g, '') + '"]');
  if(!champ) return;

  /* Un E posé par une éliminatoire ne se remplace pas par une
     note : c'est l'élimination qui prime. */
  if(champ.value === 'E' && champ.dataset.parElim === 'oui') return;

  champ.value = valeur;

  const l = champ.parentNode;
  if(!l) return;
  l.querySelectorAll('button').forEach(b => {
    if(typeof b._peindre === 'function') b._peindre();
  });

  if(typeof majTotalCepc === 'function') majTotalCepc();
}


/* ============================================================
   LES ÉLIMINATOIRES SUR LE CEPC

   Chaque erreur marquée ☠️ coche un E sur sa ligne. Trois erreurs
   dans la même catégorie ne cochent qu'une case — c'est bien la
   catégorie qui est éliminatoire, pas chaque faute.

   La case reste modifiable : une erreur de saisie se corrige.
   ============================================================ */

function cocherEliminatoiresCepc(champs){
  /* La fiche range les observations sous « examen.observations » */
  const obs = champs['examen.observations'] || champs.observations;
  if(!Array.isArray(obs) || !obs.length) return;

  /* Les catégories touchées, sans doublon */
  const touchees = {};
  obs.forEach(o => {
    const cat = String((o && o.categorie) || '').trim();
    if(cat) touchees[cat] = true;
  });

  const noms = Object.keys(touchees);
  if(!noms.length) return;

  /* Le CEPC vit dans champs.cepc, rangé par nom de ligne */
  if(!champs.cepc || typeof champs.cepc !== 'object') champs.cepc = {};
  noms.forEach(n => { champs.cepc[n] = 'E'; });

  /* Et sur l'écran, pour que le moniteur le voie et puisse
     corriger s'il s'est trompé de catégorie. La case reste
     modifiable : un appui la retire. */
  try{
    document.querySelectorAll('.cepcNiveau').forEach(champ => {
      const ligne = champ.getAttribute('data-comp');
      if(!touchees[ligne]) return;

      champ.value = 'E';

      /* Les boutons se repeignent : sans cela, le E est enregistré
         mais invisible. */
      const l = champ.parentNode;
      if(!l) return;
      l.querySelectorAll('button').forEach(b => {
        if(typeof b._peindre === 'function') b._peindre();
      });
      const al = l.querySelector('.cepcAlerte');
      if(al) al.style.display = 'block';
    });
    if(typeof majTotalCepc === 'function') majTotalCepc();
  }catch(e){ /* l'écran n'a pas de tableau CEPC : le bilan suffit */ }
}


/* Les erreurs éliminatoires, groupées par catégorie.

   Elles ouvrent le bilan des erreurs : c'est ce qui a coûté
   l'examen, avant tout le reste. */
function eliminatoiresGroupees(champs){
  const obs = champs['examen.observations'] || champs.observations;
  if(!Array.isArray(obs)) return [];

  const par = {};
  obs.forEach(o => {
    const cat = String((o && o.categorie) || '').trim();
    if(!cat) return;
    (par[cat] = par[cat] || []).push(o);
  });

  /* L'ordre du CEPC, pas celui de la saisie : c'est celui que
     l'inspecteur suit. */
  const ordre = (typeof categoriesEliminatoires === 'function')
    ? categoriesEliminatoires() : Object.keys(par);

  return ordre.filter(n => par[n]).map(n => ({ categorie: n, fautes: par[n] }));
}


/* ============================================================
   LA CATÉGORIE DU CEPC

   Sept lignes du CEPC acceptent un E. C'est celle que le moniteur
   choisit qui sera cochée, et qui nommera l'erreur dans le bilan.
   ============================================================ */

function categoriesEliminatoires(){
  const out = [];
  if(typeof CEPC_BLOCS === 'undefined') return out;

  CEPC_BLOCS.forEach(b => {
    b.items.forEach(it => {
      if((it.valeurs || []).indexOf('E') !== -1) out.push(it.nom);
    });
  });
  return out;
}


function choisirCategorieCepc(toutes, quoi){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(460px, 94vw);max-height:88vh;overflow-y:auto;';

    const titres = {
      'grave': ['⚠️ Quelle compétence ?',
                "L'erreur sera rangée là dans le bilan. Aucun point " +
                "n'est retiré."],
      'moins': ['➖ Quelle compétence ?',
                'Un point sera retiré sur cette ligne du CEPC, et ' +
                "l'erreur rangée là dans le bilan."],
      '':      ['☠️ Quelle catégorie ?',
                'Le E sera coché sur cette ligne du CEPC, et ' +
                "l'erreur rangée là dans le bilan."]
    };
    const [t, aide] = titres[quoi || (toutes ? 'moins' : '')] || titres[''];

    boite.innerHTML = '<h3>' + t + '</h3>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
        'line-height:1.5;">' + aide + '</div>';

    (toutes ? toutesCategoriesCepc() : categoriesEliminatoires()).forEach(nom => {
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'padding:12px;font-size:13px;margin-bottom:7px;' +
        'text-align:left;line-height:1.4;';
      b.textContent = nom;
      b.addEventListener('click', () => {
        document.body.removeChild(fond);
        resolve(nom);
      });
      boite.appendChild(b);
    });

    const bA = document.createElement('button');
    bA.className = 'btn btn-secondary';
    bA.style.cssText = 'padding:12px;font-size:13px;margin-top:6px;';
    bA.textContent = 'Annuler';
    bA.addEventListener('click', () => {
      document.body.removeChild(fond);
      resolve('');
    });
    boite.appendChild(bA);

    fond.appendChild(boite);
    document.body.appendChild(fond);
  });
}


/* Relève tout ce que le moniteur a saisi dans le formulaire */
/* ============================================================
   LES INSPECTEURS

   Une liste partagée : un nom ajouté par un moniteur sert
   aussitôt à toute l'équipe. Elle vit dans les réglages.
   ============================================================ */

const INSPECTEURS_BASE = [
  'Mme Lehain', 'Mme Bazin', 'Mme Dillenschneider', 'Mme Lefeuvre',
  'Mme Correia', 'Mr Rondineau', 'Mr Marchand', 'Mr Fornassier',
  'Mr Sotteau', 'Mr Saillant', 'Mr Prigent', 'Autre département'
];

let inspecteursAjoutes = null;

function inspecteursConnus(){
  const sus = inspecteursAjoutes || [];
  /* « Autre département » reste en dernier : c'est le fourre-tout */
  const base = INSPECTEURS_BASE.filter(x => x !== 'Autre département');
  return base.concat(sus).concat(['Autre département']);
}

async function chargerInspecteurs(){
  if(inspecteursAjoutes !== null) return;
  try{
    const d = await appelPrep({ action: 'reglagesList' });
    const g = (d && d.reglages) || {};
    inspecteursAjoutes = g.inspecteurs
      ? String(g.inspecteurs).split('|').map(x => x.trim()).filter(Boolean)
      : [];
  }catch(e){ inspecteursAjoutes = []; }
}

async function ajouterInspecteur(nom){
  await chargerInspecteurs();
  if(inspecteursConnus().some(x => normaliserMot(x) === normaliserMot(nom))){
    return;
  }
  inspecteursAjoutes.push(nom);
  try{
    await appelPrep({ action: 'reglageSet', cle: 'inspecteurs',
                      valeur: inspecteursAjoutes.join('|'),
                      par: ACCES.moniteur || '' });
    showToast('Inspecteur ajouté pour tous ✅');
  }catch(e){ showToast('Ajouté ici, mais pas enregistré.'); }
}


/* La mention gardée dans les notes après un examen officiel.

   Elle ne part jamais à l'élève : elle sert au moniteur qui fera
   le rendez-vous post-permis, qui n'est pas forcément celui qui
   a accompagné. */
function mentionExamen(champs, moniteur){
  const insp = String(champs.inspecteur || '').trim();
  const rep = String(champs.repassage || '').trim();
  const note = String(champs.noteEquipe || '').trim();
  if(!insp && !rep && !note) return '';

  const bouts = ['🔒 EXAMEN OFFICIEL'];
  if(insp) bouts.push('Inspecteur : ' + insp);
  if(rep) bouts.push('Demandé : ' + rep + ' + 3 heures avant repassage');
  if(moniteur) bouts.push('Par : ' + moniteur);

  let t = bouts.join(' · ');

  /* La note libre garde ses retours à la ligne : elle se lit
     comme un paragraphe, pas comme une suite de mentions. */
  if(note){
    t += '\n🔒 ' + note.split('\n').map(x => x.trim())
                        .filter(Boolean).join('\n🔒 ');
  }

  return t;
}


/* ============================================================
   LE BILAN MANUEL, GARDÉ EN COURS DE ROUTE

   Le vocal se sauvegarde à chaque phrase ; le manuel ne l'était
   qu'une fois terminé. Une coupure au milieu d'un examen officiel
   faisait tout perdre.
   ============================================================ */

let minuteurManuel = null;

/* Le dossier de l'élève, gardé entre l'ouverture de la fiche et
   la génération du bilan : c'est lui qui porte la frise. */
let dossierManuel = null;

/* Un brouillon par élève : le moniteur en a plusieurs dans la
   voiture le jour d'un examen, et ils ne doivent pas s'écraser. */
const CLE_MANUELS = 'bilans_manuels';

function tousLesBrouillons(){
  try{
    const l = JSON.parse(localStorage.getItem(CLE_MANUELS) || '[]');
    if(!Array.isArray(l)) return [];
    /* Au-delà de deux jours, ce n'est plus la journée en cours */
    const limite = Date.now() - 48 * 3600 * 1000;
    return l.filter(x => x && (x.ts || 0) > limite);
  }catch(e){ return []; }
}

function rangerBrouillons(liste){
  try{
    localStorage.setItem(CLE_MANUELS, JSON.stringify(liste.slice(0, 12)));
  }catch(e){ /* stockage plein */ }
}

function effacerBrouillonDe(eleve){
  const reste = tousLesBrouillons()
    .filter(x => normaliserMot(x.eleve || '') !== normaliserMot(eleve));
  rangerBrouillons(reste);
}

function sauvegarderManuel(){
  const zone = $('manuelChamps');
  if(!zone) return;

  /* On garde l'état des champs eux-mêmes plutôt que leur
     interprétation : chaque type de rubrique se redessine
     différemment, mais tous ont une valeur ou une case cochée. */
  const saisies = [];
  zone.querySelectorAll('input, textarea, select').forEach((el, i) => {
    saisies.push({
      i: i,
      cle: el.getAttribute('data-cle') || el.getAttribute('data-comp') || '',
      classe: el.className || '',
      valeur: (el.type === 'checkbox' || el.type === 'radio')
        ? (el.checked ? '1' : '')
        : String(el.value || '')
    });
  });

  /* ------------------------------------------------------------
     CE QUI NE VIT QUE DANS LA MÉMOIRE DE LA PAGE

     Chrystel : « dans les examens officiels, ça note la partie
     avant examen, j'envoie à l'élève, et quand je reviens sur la
     fiche il n'y a plus rien au niveau des cases cochées ».

     Elle a raison, et la cause est nette : les ✅ / ❌ ne sont pas
     des cases à cocher, ce sont des BOUTONS. Ils n'écrivent nulle
     part dans la page — ils posent leur réponse dans
     `champsManuels`, un objet de la mémoire. La sauvegarde, elle,
     ne parcourait que les `input`, `textarea` et `select` : elle
     ne les voyait pas. Et rouvrir la fiche repart de
     `champsManuels = {}`.

     C'est la même leçon que pour les réponses du questionnaire,
     perdues pour exactement la même raison : ce qui ne vit que
     dans la mémoire de la page doit voyager avec le brouillon.
     ------------------------------------------------------------ */
  const memoire = (typeof champsManuels !== 'undefined' && champsManuels)
    ? Object.assign({}, champsManuels) : null;
  const enMemoire = memoire && Object.keys(memoire)
    .some(k => memoire[k] !== '' && memoire[k] !== undefined);

  /* Rien de saisi : inutile de proposer une reprise vide.

     « Rien » compte aussi le questionnaire — un moniteur qui a
     renseigné la formation, la frise et les examens sans avoir
     encore coché une seule case de la fiche a bel et bien du
     travail à ne pas perdre — et les boutons, pour la même
     raison : trois ✅ sur la partie avant examen sont un travail
     fait. */
  const quest = (typeof contexteDepart !== 'undefined' && contexteDepart)
                  ? contexteDepart : null;
  if(!saisies.some(x => x.valeur) && !quest && !enMemoire) return;

  const eleve = $('studentName').value.trim();
  const brouillon = {
    ts: Date.now(),
    modele: $('modele').value,
    moniteur: $('monitorName').value,
    eleve: eleve,
    site: $('site').value,
    date: $('lessonDate').value,
    note: $('noteInterne') ? $('noteInterne').value : '',
    avantEnvoye: !!avantExamenEnvoye,
    /* Les boutons ✅ / ❌ / A-B-C et tout ce qui ne s'écrit pas
       dans un champ de la page. */
    champs: memoire,
    /* Ses réponses au questionnaire — même raison qu'en dictée :
       elles ne vivaient que dans la mémoire de la page, et une
       monitrice qui avait tout rempli n'en retrouvait rien. */
    quest: quest,
    saisies: saisies
  };

  /* Le brouillon de cet élève remplace le sien, pas celui d'un
     autre : plusieurs examens se déroulent en parallèle. */
  const autres = tousLesBrouillons()
    .filter(x => normaliserMot(x.eleve || '') !== normaliserMot(eleve));
  autres.unshift(brouillon);
  rangerBrouillons(autres);

  /* L'ancienne clé sert encore à la bannière : on garde le plus
     récent pour ne pas la laisser vide. */
  try{
    localStorage.setItem('bilan_manuel_en_cours', JSON.stringify(brouillon));
  }catch(e){}
}

/* Vrai quand la partie avant examen a déjà été envoyée */
let avantExamenEnvoye = false;

/* ------------------------------------------------------------
   RALLUMER LES BOUTONS

   Une réponse posée par un bouton — ✅ / ❌, A-B-C, ✅🍊❌ — vit
   dans `champsManuels` et NULLE PART dans la page. Restaurer la
   valeur sans rallumer le bouton donnerait une fiche qui paraît
   vide et produit pourtant un bilan rempli : pire que de tout
   perdre, parce qu'on ne s'en apercevrait pas.

   On rejoue donc le clic, qui sait déjà repeindre — et qui reste
   le seul endroit où la couleur d'un bouton se décide.
   ------------------------------------------------------------ */
function repeindreBoutonsManuels(){
  const zone = $('manuelChamps');
  if(!zone) return 0;

  let n = 0;
  Array.prototype.forEach.call(zone.querySelectorAll('[data-champ]'), groupe => {
    const cle = groupe.getAttribute('data-champ');
    const voulu = champsManuels[cle];
    if(voulu === undefined) return;

    const b = Array.prototype.filter.call(groupe.children,
      x => x.getAttribute('data-val') === String(voulu))[0];
    if(!b) return;

    /* On efface avant de cliquer : les boutons A-B-C basculent au
       second appui, et cliquer sur celui qui est déjà pris
       l'aurait éteint. */
    champsManuels[cle] = ' ';
    b.click();
    n++;
  });
  return n;
}

/* Repose ce qui avait été saisi, une fois la fiche dessinée */
function replacerSaisiesManuelles(saisies){
  const zone = $('manuelChamps');
  if(!zone || !saisies || !saisies.length) return 0;

  const champs = zone.querySelectorAll('input, textarea, select');
  let remis = 0;

  saisies.forEach(s => {
    const el = champs[s.i];
    if(!el) return;

    /* La fiche a pu changer entre-temps : on vérifie que la case
       est bien la même avant d'y écrire. */
    const meme = (el.getAttribute('data-cle') || el.getAttribute('data-comp') || '')
                 === s.cle && (el.className || '') === s.classe;
    if(!meme) return;

    if(el.type === 'checkbox' || el.type === 'radio'){
      el.checked = !!s.valeur;
    }else{
      el.value = s.valeur;
    }
    if(s.valeur) remis++;
  });

  return remis;
}

/* On attend une seconde de calme : enregistrer à chaque frappe
   ralentirait la saisie. */
function planifierSauvegardeManuelle(){
  clearTimeout(minuteurManuel);
  minuteurManuel = setTimeout(sauvegarderManuel, 1000);
}

/* Ce qui a été saisi et jamais terminé */
function brouillonManuel(){
  try{
    const b = JSON.parse(localStorage.getItem('bilan_manuel_en_cours') || 'null');
    if(!b || !b.saisies || !b.saisies.length) return null;
    /* Au-delà de deux jours, ce n'est plus le cours en cours */
    if(Date.now() - (b.ts || 0) > 48 * 3600 * 1000) return null;
    return b;
  }catch(e){ return null; }
}

function effacerBrouillonManuel(){
  try{ localStorage.removeItem('bilan_manuel_en_cours'); }catch(e){}
  try{ localStorage.removeItem(CLE_MANUELS); }catch(e){}
}

/* Suit toutes les saisies de la fiche */
function surveillerChampsManuels(){
  const zone = $('manuelChamps');
  if(!zone) return;

  /* LE CLIC AUSSI.

     Les ✅ / ❌ sont des boutons : ils ne déclenchent ni « input »
     ni « change ». Une fiche d'examen où l'on n'avait fait
     qu'appuyer sur des boutons ne s'enregistrait donc JAMAIS toute
     seule — elle n'était gardée qu'en fermant la fiche, et une
     page rechargée entre-temps emportait tout. */
  ['input', 'change', 'click'].forEach(ev => {
    zone.addEventListener(ev, planifierSauvegardeManuelle);
  });
}


/* Relit ce que le moniteur a saisi. Une liste de champs peut être
   fournie : le module d'examen blanc sous la transcription ne relit
   que les siens, sans toucher au reste. */
function lireChampsManuels(champsVoulus){
  const modele = MODELES[$('modele').value];
  /* La fiche handicap se construit ligne par ligne depuis le
     document papier : elle est trop longue pour être écrite à
     la main dans le tableau des schémas. */
  const champs = champsVoulus || ((modele.schema === 'handicap')
    ? schemaHandicap()
    : CHAMPS_MANUELS[modele.schema]);
  if(!champs) return;

  champs.forEach(ch => {
    if(ch.type === 'titre' || ch.type === 'envoiAvant' ||
       ch.type === 'rappelFrise'){
      /* Ni un intertitre ni un bouton ne portent de réponse */


    }else if(ch.type === 'abc' || ch.type === 'tableauHandicap'){
      /* Les valeurs vivent dans champsManuels : le tableau les y
         pose au fur et à mesure. */
      return;
    }else if(ch.type === 'note3'){
      const el = document.getElementById(idChamp(ch.cle));
      if(el && String(el.value).trim()){
        champsManuels[ch.cle] = String(el.value).trim();
      }
    }else if(ch.type === 'heures'){
      const el = document.getElementById(idChamp(ch.cle));
      if(el && String(el.value).trim()){
        champsManuels[ch.cle] = String(el.value).trim();
      }
    }else if(ch.type === 'inspecteur' || ch.type === 'repassage'){
      const el = document.getElementById(idChamp(ch.cle));
      if(el && el.value && el.value !== '__autre__'){
        champsManuels[ch.cle] = el.value.trim();
      }
    }else if(ch.type === 'manoeuvres'){
      champsManuels[ch.cle] = Array.prototype.slice
        .call(document.querySelectorAll('.chManuel-' + ch.cle + ':checked'))
        .map(x => ({ nom: x.value, fait: true }));

    }else if(ch.type === 'competences'){
      /* Format attendu par le constructeur : { clé : { statut, erreurs } } */
      const comps = {};
      document.querySelectorAll('.compStatut').forEach(sel => {
        const cle = sel.getAttribute('data-comp');
        if(!cle || !sel.value) return;
        const zone = document.querySelector('.compErreurs[data-comp="' + cle + '"]');
        const erreurs = zone
          ? zone.value.split('\n').map(x => x.trim()).filter(Boolean)
          : [];
        comps[cle] = { statut: sel.value, erreurs: erreurs };
      });
      champsManuels[ch.cle] = comps;
    }else if(ch.type === 'themes'){
      const bouts = [];
      document.querySelectorAll('.themeErreur').forEach(t => {
        const v = t.value.trim();
        if(!v) return;
        const lignes = v.split('\n').map(x => x.trim()).filter(Boolean);
        bouts.push(t.getAttribute('data-theme') + '\n' +
                   lignes.map(x => (x.startsWith('•') ? x : '• ' + x)).join('\n'));
      });
      champsManuels[ch.cle] = bouts.join('\n\n');
    }else if(ch.type === 'cepc'){
      const cepc = {};
      document.querySelectorAll('.cepcNiveau').forEach(s => {
        if(s.value) cepc[s.getAttribute('data-comp')] = s.value;
      });
      champsManuels[ch.cle] = cepc;
    }else if(ch.type === 'entete'){
      /* Chaque case remplit sa propre clé du bilan */
      document.querySelectorAll('.enteteCase').forEach(cb => {
        champsManuels[cb.getAttribute('data-cle')] = cb.checked ? '✅' : '❌';
      });
      document.querySelectorAll('.enteteTexte').forEach(i => {
        champsManuels[i.getAttribute('data-cle')] = i.value.trim();
      });

    }else if(ch.type === 'observations'){
      const obs = [];
      document.querySelectorAll('#obsManuel > div').forEach(d => {
        const i = d.querySelector('.obsInsp');
        const r = d.querySelector('.obsRep');
        const vi = i ? i.value.trim() : '';
        const vr = r ? r.value.trim() : '';
        /* La catégorie du CEPC accompagne l'observation : elle
           décide du E et du rangement dans le bilan. */
        const cat = d.dataset ? (d.dataset.categorie || '') : '';
        const grave = d.dataset ? (d.dataset.grave || '') : '';
        const moins = d.dataset ? (d.dataset.moins || '') : '';
        if(vi || vr){
          obs.push({ inspecteur: vi, reponse: vr, categorie: cat,
                     grave: grave, moins: moins });
        }
      });
      champsManuels[ch.cle] = obs;

    }else if(ch.type === 'rubriques'){
      /* Chaque rubrique écrit sa propre clé : « rubriques.pad »
         devient ai.rubriques.pad, ce que blocRubriques() attend. */
      document.querySelectorAll('.rubriqueManuelle').forEach(t => {
        champsManuels[t.getAttribute('data-cle')] = t.value.trim();
      });

    }else if(ch.type === 'eval3'){
      /* L'état est posé au clic ; il ne reste que le détail.
         Son identifiant remplace TOUS les points : « rubriques.pad »
         en compte un, et replace('.','_') n'en remplace qu'un seul. */
      const t = document.getElementById('manEval_' + ch.cle.split('.').join('_'));
      if(t) champsManuels[ch.cle + '.commentaire'] = t.value.trim();

    }else if(ch.type !== 'ok' && ch.type !== 'photo' &&
             ch.type !== 'niveau' && ch.type !== 'ouinon'){
      const t = document.getElementById(idChamp(ch.cle));
      if(t) champsManuels[ch.cle] = t.value.trim();
    }
  });
}

/* Assemble le bilan à partir de ce qui a été saisi */
async function genererBilanManuel(){
  /* On relève d'abord tout ce que le moniteur a saisi */
  lireChampsManuels();

  /* Modifiables : l'examen officiel peut basculer d'une boîte à
     l'autre quand la question est posée au moniteur. */
  let modeleCle = $('modele').value;
  let modele = MODELES[modeleCle];

  /* Un examen blanc renseigne déjà sa conclusion : on ne la redemande pas */
  const repris = Object.assign({}, contexteDepart || {});
  if(modeleCle === 'examen-blanc'){
    if(champsManuels.niveau === 'non'){
      repris.ebPasse = 'pasleniveau';
    }else if(champsManuels.niveau === 'oui'){
      const h = String(champsManuels.heuresAvant || '').trim();
      if(h === '' || h === '0'){
        repris.ebPasse = '3h';
      }else{
        repris.ebPasse = 'lecons';
        repris.ebLecons = h;
      }
    }
    if(champsManuels.aDate === 'oui' && !repris.examPermis) repris.examPermis = 'prevu';
    if(champsManuels.aDate === 'non' && !repris.examPermis) repris.examPermis = 'aprevoir';

    /* Les heures avant permis remontent au bureau : c'est ce
       qu'il regarde en donnant les dates, et le moniteur vient de
       les décider. */
    remonterHeuresAuBureau($('studentName').value.trim(),
                           champsManuels.heuresAvant,
                           champsManuels.niveau);
  }

  /* Mise à jour des infos, comme à la fin d'un cours enregistré.

     Sauf pour l'examen officiel : rien à préparer pour la suite,
     elle se décide au rendez-vous post-permis. */
  const maj = ($('modele').value === 'examen-officiel')
    ? null
    : await ouvrirQuestionnaireDepart(repris, 'Après ce cours', 'Terminer');

  if(maj){
    contexteDepart = maj;

    /* Idem depuis le questionnaire de fin d'un cours ordinaire */
    if(maj.heuresRemontees !== undefined &&
       typeof remonterHeuresAuBureau === 'function' &&
       modeleCle !== 'examen-blanc'){
      remonterHeuresAuBureau($('studentName').value.trim(),
                             maj.heuresRemontees,
                             maj.ebPasse === 'pasleniveau' ? 'non' : 'oui');
    }
    appliquerNoteQuestionnaire(noteDepuisQuestionnaire(maj));
  }

  const eleve = $('studentName').value.trim();
  let manoeuvresAvant = [];
  let marquesAvant = null;
  try{
    const d = await chargerDossierEleve(eleve);
    manoeuvresAvant = d.manoeuvres || [];
    marquesAvant = d.marques || null;
  }catch(e){}

  /* Les manœuvres du jour sont au format attendu par le constructeur */
  const liste = (champsManuels.manoeuvres || []).map(x => x.nom || x);

  /* Les clés « avant.carteSD » deviennent des objets imbriqués */
  const donnees = { manoeuvres: liste };
  /* Le simulateur attend « competences », rangé par clé */
  if(champsManuels.competences) donnees.competences = champsManuels.competences;
  Object.keys(champsManuels).forEach(k => {
    /* Les manœuvres sont déjà mises en forme au-dessus : les
       recopier telles quelles remettait des objets { nom, fait }
       là où le constructeur attend des noms, et la fiche
       véhicule ressortait vide. */
    if(k === 'manoeuvres') return;
    if(k.indexOf('.') === -1){ donnees[k] = champsManuels[k]; return; }

    /* Autant de niveaux que la clé en compte. Une seule profondeur
       suffisait tant que les clés valaient « avant.carteSD » ; les
       rubriques d'évaluation en demandent deux
       (« rubriques.pad.statut »), et s'arrêter au premier point
       écrasait toute la rubrique à chaque champ. */
    const chemin = k.split('.');
    let cible = donnees;
    for(let i = 0; i < chemin.length - 1; i++){
      const pas = chemin[i];
      if(!cible[pas] || typeof cible[pas] !== 'object') cible[pas] = {};
      cible = cible[pas];
    }
    cible[chemin[chemin.length - 1]] = champsManuels[k];
  });

  let bilan;
  try{
    bilan = modele.build(donnees, {
      manoeuvresAvant: manoeuvresAvant,
      marquesAvant: marquesAvant,
      transcript: (typeof aererTexte === 'function'
                    ? aererTexte(champsManuels.texteDicte || '')
                    : (champsManuels.texteDicte || '')),
      note: $('noteInterne').value.trim()
    });
    /* Un seul rappel des écoutes, quelle qu'en soit la provenance */
    if(typeof unSeulRappelEcoutes === 'function') bilan = unSeulRappelEcoutes(bilan);
    if(typeof blocProcedures === 'function'){
      bilan += blocProcedures(champsManuels.texteDicte || '');
    }
  }catch(e){
    console.error('Composition du bilan :', e);
    await informer('Le bilan n\'a pas pu être composé.\n\nDétail : ' + (e && e.message ? e.message : e));
    return;
  }

  /* Les erreurs éliminatoires cochent leur E sur le CEPC. Une
     catégorie touchée plusieurs fois n'est cochée qu'une fois. */
  if(modeleCle === 'examen-blanc'){
    cocherEliminatoiresCepc(champsManuels);
    remplirFrises(champsManuels);
  }

  /* L'examen officiel laisse une trace dans les notes : elle
     servira au rendez-vous post-permis. Un nouvel examen efface
     la précédente — seul le dernier permis compte. */
  if(modeleCle === 'examen-officiel'){
    const m = mentionExamen(champsManuels, $('monitorName').value.trim());
    const zn = $('noteInterne');
    if(zn){
      /* Toutes les lignes 🔒 s'en vont : l'en-tête comme la note
         libre qui la suit. Seul le dernier examen compte. */
      const sans = zn.value.split('\n')
        .filter(l => l.trim().indexOf('🔒') !== 0)
        .join('\n').trim();
      zn.value = m ? (m + (sans ? '\n' + sans : '')) : sans;
    }
  }

  currentLessonMeta = {
    modeleLabel: modele.label,
    studentName: eleve,
    monitorName: $('monitorName').value.trim(),
    site: $('site').value,
    dateStr: $('lessonDate').value,
    noteInterne: $('noteInterne').value.trim(),
    ts: Date.now()
  };

  $('resultText').value = bilan;
  if(typeof remplirChoixProcedures === 'function') remplirChoixProcedures();
  afficherNote($('noteInterne').value.trim());
  marquerExport(false);
  $('manuelView').style.display = 'none';
  $('resultView').style.display = 'block';
  window.scrollTo(0, 0);
  sauvegarderLocal(true);

  /* Seul le brouillon de cet élève disparaît : ceux des autres
     examens de la matinée restent. */
  effacerBrouillonDe($('studentName').value.trim());
  try{ localStorage.removeItem('bilan_manuel_en_cours'); }catch(e){}
  avantExamenEnvoye = false;
}

/* Rouvre un bilan manuel interrompu */
/* ============================================================
   L'AVANT-EXAMEN, ENVOYÉ SANS ATTENDRE

   Le jour d'un examen, plusieurs élèves se relaient au volant.
   Chacun reçoit sa partie « avant examen » dès qu'il descend,
   sans attendre que l'inspecteur ait vu tout le monde.

   Le bilan complet part ensuite, avec les deux parties.
   ============================================================ */

async function envoyerAvantExamen(){
  const eleve = $('studentName').value.trim();
  if(!eleve){ showToast("Saisis le nom de l'élève."); return; }

  lireChampsManuels();

  /* Les réponses sont rangées à plat, sous « avantExamen.xxx » —
     pas dans un objet. Les chercher au mauvais endroit rendait un
     message vide. */
  const lire = nom => {
    if(champsManuels['avantExamen.' + nom] !== undefined){
      return champsManuels['avantExamen.' + nom];
    }
    const objet = champsManuels.avantExamen;
    return (objet && objet[nom] !== undefined) ? objet[nom] : '';
  };

  /* On ne construit que la première moitié : le reste n'est pas
     encore rempli, et l'annoncer vide n'aurait pas de sens. */
  const texte = [
    '👋 𝗔𝗩𝗔𝗡𝗧 𝗧𝗢𝗡 𝗘𝗫𝗔𝗠𝗘𝗡',
    '',
    '𝗜𝗻𝘀𝘁𝗮𝗹𝗹𝗮𝘁𝗶𝗼𝗻 ' + (lire('installation') || '✅️❌️'),
    '𝗣𝗮𝘀𝘀𝗮𝗴𝗲𝗿 ' + (lire('passager') || '✅️❌️'),
    '𝗩𝗼𝘆𝗮𝗻𝘁𝘀 ' + (lire('voyants') || '✅️❌️'),
    ''
  ];

  const err = String(lire('erreurs') || '').trim();
  if(err){
    texte.push('𝙀𝙧𝙧𝙚𝙪𝙧𝙨 𝙖̀ 𝙣𝙚 𝙥𝙖𝙨 𝙧𝙚𝙛𝙖𝙞𝙧𝙚 :');
    texte.push(err);
    texte.push('');
  }

  texte.push('Le bilan complet suivra après ton examen. Courage ! 🍀');

  const message = texte.join('\n');

  /* On garde d'abord : ce qui suit peut échouer, pas la
     sauvegarde. */
  avantExamenEnvoye = true;
  sauvegarderManuel();

  ouvrirEnvoiAvant(eleve, message);
}


function ouvrirEnvoiAvant(eleve, message){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 94vw);max-height:88vh;overflow-y:auto;';

  boite.innerHTML = '<h3>📤 Avant examen — ' +
    String(eleve).replace(/</g, '&lt;') + '</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;' +
      'line-height:1.5;">Sa fiche reste en haut de l\'écran : tu la ' +
      'rouvriras pour la partie examen.</div>';

  const z = document.createElement('textarea');
  z.rows = 11;
  z.value = message;
  z.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:13px;' +
    'line-height:1.6;font-family:inherit;resize:vertical;margin-bottom:10px;';
  boite.appendChild(z);

  const r1 = document.createElement('div');
  r1.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;';

  const bCop = document.createElement('button');
  bCop.className = 'btn btn-secondary';
  bCop.style.cssText = 'flex:1;padding:11px;font-size:13px;margin:0;';
  bCop.textContent = '📋 Copier';
  bCop.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(z.value);
      showToast('Copié ✅');
    }catch(e){ z.focus(); z.select(); showToast('Ctrl+C pour copier'); }
  });
  r1.appendChild(bCop);

  const bMail = document.createElement('button');
  bMail.className = 'btn btn-secondary';
  bMail.style.cssText = 'flex:1;padding:11px;font-size:13px;margin:0;';
  bMail.textContent = '✉️ Par mail';
  bMail.addEventListener('click', async () => {
    let adresse = '';
    try{
      const d = await appelPrep({ action: 'contactEleve', eleve: eleve });
      adresse = ((d && d.contact) || {}).email || '';
    }catch(e){}

    /* L'adresse se confirme avant de partir : elle peut avoir
       changé depuis sa saisie, et un mail perdu ne se signale
       jamais. Même sans adresse connue, on la demande — la fenêtre
       sert à ça. */
    adresse = await confirmerAdresseEleve(eleve, adresse);
    if(!adresse) return;

    bMail.disabled = true;
    bMail.textContent = 'Envoi…';
    try{
      await appelPrep({
        action: 'mailBilan', to: [adresse],
        sujet: 'Avant ton examen — Évolution Conduites',
        texte: z.value
      });
      bMail.textContent = '✅ Envoyé';
      showToast('Envoyé à ' + adresse + ' ✅');
    }catch(e){
      bMail.disabled = false;
      bMail.textContent = '✉️ Par mail';
      showToast('Impossible : ' + e.message);
    }
  });
  r1.appendChild(bMail);

  boite.appendChild(r1);

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bRester = document.createElement('button');
  bRester.className = 'btn btn-secondary';
  bRester.textContent = 'Rester sur la fiche';
  bRester.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bRester);

  const bSuivant = document.createElement('button');
  bSuivant.className = 'btn btn-primary';
  bSuivant.textContent = '👤 Élève suivant';
  bSuivant.addEventListener('click', () => {
    document.body.removeChild(fond);
    fermerBilanManuel();
    $('studentName').value = '';
    if(typeof proposerReprise === 'function') proposerReprise();
    showToast('Fiche gardée — reprends-la en haut après l\'examen');
  });
  r.appendChild(bSuivant);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


function reprendreBilanManuel(){
  reprendreBrouillon(brouillonManuel());
}

/* Rouvre un brouillon précis, choisi dans la liste du haut */
function reprendreBrouillon(b){
  if(!b) return;

  /* On repart de ce qui a déjà été envoyé pour cet élève */
  avantExamenEnvoye = !!b.avantEnvoye;

  if(b.modele){
    $('modele').value = b.modele;
    if(typeof adapterAuModele === 'function') adapterAuModele();
  }
  if(b.moniteur) $('monitorName').value = b.moniteur;
  if(b.eleve) $('studentName').value = b.eleve;
  if(b.site) $('site').value = b.site;
  if(b.date) $('lessonDate').value = b.date;

  if(b.note && $('noteInterne')) $('noteInterne').value = b.note;

  /* Ce qu'il avait répondu au questionnaire revient avec la fiche */
  if(b.quest && typeof contexteDepart !== 'undefined'){
    contexteDepart = b.quest;
  }

  const ban = $('repriseBanner');
  if(ban) ban.style.display = 'none';

  /* La fiche se dessine, puis on y repose les saisies */
  ouvrirBilanManuel().then(() => {
    let n = replacerSaisiesManuelles(b.saisies);

    /* ET CE QUI NE VIT QUE DANS LA MÉMOIRE.

       `ouvrirBilanManuel()` repart de `champsManuels = {}` : les
       réponses des boutons — les ✅ / ❌ de l'avant-examen, les
       A-B-C de la fiche handicap — sont donc à remettre, puis à
       rallumer à l'écran. Remettre l'une sans l'autre serait pire
       que rien : une fiche qui paraît vide et qui produit pourtant
       un bilan rempli. */
    if(b.champs && typeof champsManuels !== 'undefined'){
      Object.keys(b.champs).forEach(k => { champsManuels[k] = b.champs[k]; });
      /* Après les valeurs par défaut, qui se posent sur un
         minuteur : sinon elles repeindraient par-dessus. */
      setTimeout(() => {
        try{ repeindreBoutonsManuels(); }catch(e){ console.warn('Boutons :', e); }
      }, 0);
      n += Object.keys(b.champs).filter(k => b.champs[k] !== '' &&
                                             b.champs[k] !== undefined).length;
    }

    /* Le récapitulatif du questionnaire se redessine APRÈS la
       fiche : il s'accroche à un cadre qui n'existe pas avant. */
    if(b.quest && typeof afficherSaisieDuJour === 'function'){
      afficherSaisieDuJour(b.quest, 'preparationManuel');
    }
    if(typeof majBoutonCompleter === 'function') majBoutonCompleter();
    showToast(n ? 'Bilan retrouvé — ' + n + ' réponse(s) ✅'
                : 'Bilan rouvert ✅');
  }).catch(() => {});
}


function fermerBilanManuel(){
  /* Enregistrée avant d'être refermée, et remontée en haut : c'est
     là qu'on la reprend après l'examen. La sauvegarde automatique
     attend une seconde de calme — on ne la laisse pas décider. */
  try{ sauvegarderManuel(); }catch(e){}

  modeManuel = false;
  $('manuelView').style.display = 'none';
  $('recordView').style.display = 'block';
  if(typeof afficherVue === 'function') afficherVue('cours', 'cours');
  if(typeof proposerReprise === 'function') proposerReprise();
}


/* Le modèle doit correspondre à la boîte de l'élève : un élève BEA
   ne doit pas recevoir une fiche boîte manuelle, et inversement. */
const MODELE_EQUIVALENT = {
  'conduite-manuelle':      { bea: 'conduite-auto' },
  'conduite-auto':          { bv:  'conduite-manuelle' },
  'aac-manuelle':           { bea: 'aac-auto' },
  'aac-auto':               { bv:  'aac-manuelle' },
  'rdv-prealable-manuelle': { bea: 'rdv-prealable-auto' },
  'rdv-prealable-auto':     { bv:  'rdv-prealable-manuelle' },
  'simu-manuelle':          { bea: 'simu-auto' },
  'simu-auto':              { bv:  'simu-manuelle' },
  'eval-manuelle':          { bea: 'eval-auto' },
  'eval-auto':              { bv:  'eval-manuelle' }
};

function verifierBoiteModele(boite){
  const zone = $('alerteBoite');
  if(!zone) return;
  zone.style.display = 'none';
  zone.innerHTML = '';
  if(!boite) return;

  const actuel = $('modele').value;
  const equiv = MODELE_EQUIVALENT[actuel];
  if(!equiv || !equiv[boite]) return;      /* déjà le bon modèle */

  const cible = equiv[boite];
  if(!MODELES[cible]) return;

  const libelle = (boite === 'bea') ? 'boîte automatique (BEA)' : 'boîte manuelle (BV)';
  zone.style.display = 'block';
  zone.style.cssText = 'display:block;background:var(--warn-bg);border:1px solid var(--red);' +
    'border-radius:10px;padding:11px 12px;margin:-6px 0 14px;font-size:14px;line-height:1.5;';

  const t = document.createElement('div');
  t.innerHTML = '⚠️ Cet élève est en <strong>' + libelle + '</strong>, ' +
    'mais le modèle choisi ne correspond pas.';
  zone.appendChild(t);

  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-top:8px;font-size:14px;padding:11px;';
  b.textContent = '↔️ Passer sur « ' + MODELES[cible].label + ' »';
  b.addEventListener('click', () => {
    $('modele').value = cible;
    zone.style.display = 'none';
    showToast('Modèle adapté ✅');
  });
  zone.appendChild(b);
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-manuel.js'] = true;


/* ============================================================
   LE FORMULAIRE, CHAMP PAR CHAMP

   Extrait de ouvrirBilanManuel() pour servir deux fois : la
   fiche à remplir à la main, et le module d'examen blanc glissé
   sous la transcription d'un bilan vocal. Deux rendus séparés
   auraient fini par diverger — c'est toujours le second qu'on
   oublie de corriger.
   ============================================================ */
function dessinerChampsManuels(champs, zone, modele, dossier){
  champs.forEach(ch => {
    const bloc = document.createElement('div');
    bloc.style.cssText = 'margin-bottom:16px;';

    /* Certains champs ne servent que si l élève a le niveau :
       les montrer ailleurs fait remplir pour rien. */
    if(ch.siNiveau) bloc.dataset.siNiveau = ch.siNiveau;
    /* Les champs de l'examen blanc du RVP : cachés tant que la
       question n'a pas reçu « oui ». */
    if(ch.siEb) bloc.dataset.siEb = ch.siEb;

    if(ch.type === 'rappelFrise'){
      /* Sa frise et ses leçons faites : de quoi juger sans
         remonter chercher l'information ailleurs. */
      const frise = (dossierManuel && dossierManuel.frise) ||
                    extraireFrise($('noteInterne').value);
      /* Le numéro écrit dans son dernier bilan fait autorité : un
         élève venu de l'ancien fonctionnement n'a qu'un bilan
         enregistré alors qu'il en est à sa huitième leçon. */
      const faites = leconsFaites();

      if(frise || faites !== null){
        bloc.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
          'padding:10px 12px;margin-bottom:12px;';
        bloc.innerHTML =
          '<div style="font-size:11px;color:var(--muted);margin-bottom:4px;">' +
            '📋 Pour mémoire</div>' +
          (frise
            ? '<div style="font-size:13px;line-height:1.5;">' +
              String(frise).replace(/</g, '&lt;') + '</div>'
            : '') +
          (faites !== null
            ? '<div style="font-size:13px;color:var(--accent-text);' +
              'margin-top:4px;">' + faites + ' leçon(s) déjà effectuée(s)</div>'
            : '');
      }else{
        bloc.style.display = 'none';
      }




    }else if(ch.type === 'tableauHandicap'){
      /* Le tableau du document papier : trois colonnes sur écran
         large, deux sur téléphone — l'observation descend alors
         sous la ligne pour garder de la place où écrire. */
      const t = document.createElement('div');
      t.className = 'ficheEval';

      const tete = document.createElement('div');
      tete.className = 'fe-tete';
      ['Contrôle', 'Niveau', 'Observations'].forEach(x => {
        const s = document.createElement('span');
        s.textContent = x;
        tete.appendChild(s);
      });
      t.appendChild(tete);

      const couleurs = { A:'var(--orange)', B:'#E8850C', C:'var(--red)' };

      (typeof HANDICAP_LIGNES !== 'undefined' ? HANDICAP_LIGNES : [])
        .forEach(l => {
          const cleN = 'handicap.' + l.cle + 'N';
          const cleO = 'handicap.' + l.cle + 'O';

          const li = document.createElement('div');
          li.className = 'fe-ligne ' + (l.titre ? 'fe-rubrique' : 'fe-sous');

          const nom = document.createElement('span');
          nom.className = 'fe-nom';
          nom.textContent = l.nom;
          li.appendChild(nom);

          const notes = document.createElement('div');
          notes.className = 'fe-notes';

          const peindre = () => {
            Array.prototype.forEach.call(notes.children, b => {
              const pris = (b.textContent === champsManuels[cleN]);
              b.style.background = pris ? (couleurs[b.textContent] || 'var(--muted)')
                                        : 'var(--navy)';
              b.style.borderColor = pris ? (couleurs[b.textContent] || 'var(--line)')
                                         : 'var(--line)';
              b.style.color = pris ? '#0B0B0B' : 'var(--cream)';
              b.style.fontWeight = pris ? '800' : '400';
            });
          };

          [['A', 'Bon'], ['B', 'Moyen'], ['C', 'Faible']].forEach(([v, quoi]) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn btn-secondary';
            b.textContent = v;
            b.title = quoi;
            b.addEventListener('click', () => {
              /* Un second appui efface : le moniteur se ravise */
              champsManuels[cleN] = (champsManuels[cleN] === v) ? '' : v;
              peindre();
            });
            notes.appendChild(b);
          });

          peindre();
          li.appendChild(notes);

          const obs = document.createElement('div');
          obs.className = 'fe-obs';
          const i = document.createElement('input');
          i.type = 'text';
          i.placeholder = 'Observations';
          i.value = champsManuels[cleO] || '';
          i.addEventListener('input', () => {
            champsManuels[cleO] = i.value;
          });
          obs.appendChild(i);
          li.appendChild(obs);

          t.appendChild(li);
        });

      bloc.appendChild(t);

    }else if(ch.type === 'abc'){
      /* Les trois niveaux du document : A bon, B moyen, C faible.
         Une rubrique se note comme une sous-ligne — le document
         papier laisse les deux notables. */
      bloc.style.cssText = 'margin-bottom:4px;display:flex;gap:10px;' +
        'align-items:center;flex-wrap:wrap;';

      const l = document.createElement('span');
      l.textContent = ch.nom;
      l.style.cssText = 'flex:1;min-width:130px;font-size:14px;' +
        (ch.rubrique ? 'font-weight:700;color:var(--accent-text);'
                     : 'padding-left:14px;color:var(--cream);');
      bloc.appendChild(l);

      const r = document.createElement('div');
      r.id = 'abc_' + ch.cle.replace('.', '_');
      r.setAttribute('data-champ', ch.cle);
      r.style.cssText = 'display:flex;gap:5px;flex-shrink:0;';

      const couleurs = { A:'var(--orange)', B:'#E8850C', C:'var(--red)' };

      [['A', 'Bon'], ['B', 'Moyen'], ['C', 'Faible']].forEach(([v, quoi]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:9px 13px;font-size:14px;margin:0;';
        b.textContent = v;
        b.title = quoi;
        b.setAttribute('data-val', v);

        b.addEventListener('click', () => {
          /* Un second appui efface : le moniteur peut se raviser */
          const pris = (champsManuels[ch.cle] === v);
          champsManuels[ch.cle] = pris ? '' : v;

          Array.prototype.forEach.call(r.children, x => {
            const sien = (x.getAttribute('data-val') === champsManuels[ch.cle]);
            x.style.background = sien ? (couleurs[x.textContent] || 'var(--muted)')
                                      : 'var(--navy)';
            x.style.borderColor = sien ? (couleurs[x.textContent] || 'var(--line)')
                                       : 'var(--line)';
            x.style.color = sien ? '#0B0B0B' : 'var(--cream)';
            x.style.fontWeight = sien ? '800' : '400';
          });
        });

        r.appendChild(b);
      });

      bloc.appendChild(r);

    }else if(ch.type === 'note3'){
      /* La note se reporte sur le CEPC : quatre boutons valent
         mieux qu'un texte à relire. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const d = document.createElement('div');
      d.style.cssText = 'display:flex;gap:6px;';

      const champ = document.createElement('input');
      champ.type = 'hidden';
      champ.id = idChamp(ch.cle);
      champ.value = '';
      d.appendChild(champ);

      const peindre = () => {
        Array.prototype.forEach.call(d.children, b => {
          if(b.tagName !== 'BUTTON') return;
          const pris = (b.textContent === champ.value);
          b.style.background = pris ? 'var(--orange)' : 'var(--navy)';
          b.style.borderColor = pris ? 'var(--orange)' : 'var(--line)';
          b.style.color = pris ? '#0B0B0B' : 'var(--cream)';
          b.style.fontWeight = pris ? '800' : '400';
        });
      };

      ['0', '1', '2', '3'].forEach(v => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:10px 16px;font-size:15px;margin:0;';
        b.textContent = v;
        b.addEventListener('click', () => {
          /* Un second appui efface : le moniteur peut se raviser */
          champ.value = (champ.value === v) ? '' : v;
          champsManuels[ch.cle] = champ.value;
          peindre();
          if(typeof reporterNotesCepc === 'function') reporterNotesCepc();
        });
        d.appendChild(b);
      });

      const s = document.createElement('span');
      s.style.cssText = 'font-size:13px;color:var(--muted);align-self:center;';
      s.textContent = '/ 3';
      d.appendChild(s);

      bloc.appendChild(d);
      peindre();

    }else if(ch.type === 'heures'){
      /* Les heures avant permis : presque toujours un nombre pair
         de 2 à 10. Une liste évite de taper, tout en laissant la
         saisie libre. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const d = document.createElement('div');
      d.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;';

      const inp = document.createElement('input');
      inp.type = 'number';
      inp.id = idChamp(ch.cle);
      inp.min = '0';
      inp.step = '1';
      inp.placeholder = 'autre';
      inp.style.cssText = 'width:84px;font-size:17px;text-align:center;margin:0;';

      const peindre = () => {
        Array.prototype.forEach.call(d.children, b => {
          if(b.tagName !== 'BUTTON') return;
          const pris = (b.textContent === inp.value);
          b.style.borderColor = pris ? 'var(--orange)' : 'var(--line)';
          b.style.color = pris ? 'var(--accent-text)' : 'var(--cream)';
          b.style.fontWeight = pris ? '800' : '400';
        });
      };

      const changer = () => {
        champsManuels[ch.cle] = inp.value;
        peindre();
        if(typeof remplirFrises === 'function'){
          remplirFrises(champsManuels, true);
        }
      };

      ['2', '4', '6', '8', '10'].forEach(v => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:11px 14px;font-size:15px;margin:0;';
        b.textContent = v;
        b.addEventListener('click', () => { inp.value = v; changer(); });
        d.appendChild(b);
      });

      inp.addEventListener('input', changer);
      d.appendChild(inp);
      bloc.appendChild(d);

      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);margin-top:5px;' +
        'line-height:1.5;';
      a.textContent = 'Les 3h avant examen viennent en plus : ' +
        '« 4 » signifie 4 + 3.';
      bloc.appendChild(a);

    }else if(ch.type === 'niveau' || ch.type === 'ouinon'){
      /* C'est ce champ-là qui commande les « siNiveau » qui suivent */
      if(ch.type === 'niveau') cleNiveauCourante = ch.cle;
      bloc.style.cssText = 'margin-bottom:8px;display:flex;gap:10px;' +
        'align-items:center;flex-wrap:wrap;';
      const l = document.createElement('label');
      l.textContent = ch.nom;
      l.style.cssText = 'flex:1;min-width:140px;margin:0;font-size:14px;' +
        'text-transform:none;color:var(--cream);';
      bloc.appendChild(l);
      const r = document.createElement('div');
      r.id = 'ouinon_' + ch.cle;
      r.style.cssText = 'display:flex;gap:5px;flex-shrink:0;';
      /* Trois issues au niveau : il l'a, il ne l'a pas, ou il
         pourrait l'avoir sans qu'on puisse chiffrer les heures. */
      const choix = (ch.type === 'niveau')
        ? [['✅ Oui', 'oui'], ['🤔 Pourrait', 'peut'],
           ['❌ Pas le niveau', 'non'], ['—', '']]
        : [['✅ Oui', 'oui'], ['❌ Non', 'non'], ['—', '']];
      choix.forEach(([lab, val]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'flex:1;padding:11px;font-size:14px;margin:0;';
        b.textContent = lab;
        b.setAttribute('data-val', val);


        b.addEventListener('click', () => {
          champsManuels[ch.cle] = val;

          /* Le choix doit sauter aux yeux : une bordure seule se
             remarque mal, surtout à bout de bras dans la voiture.

             La même peinture sert quand l'application répond à la
             place du moniteur : rien ne doit distinguer les deux. */
          peindreOuiNon(r, val);

          /* Le niveau décide de ce qui reste utile */
          if(ch.cle === 'examenBlancFait' &&
             typeof majChampsSelonExamenBlanc === 'function'){
            majChampsSelonExamenBlanc();
          }
          if(ch.type === 'niveau' && typeof majChampsSelonNiveau === 'function'){
            majChampsSelonNiveau();
          }
        });
        r.appendChild(b);
      });
      /* Une réponse déjà connue — la date de permis, une frise —
         se montre d'emblée, aussi nettement qu'un choix du
         moniteur. */
      if(champsManuels[ch.cle]) peindreOuiNon(r, champsManuels[ch.cle]);

      bloc.appendChild(r);

    }else if(ch.type === 'rubriques'){
      /* Les neuf rubriques d'erreurs, une zone de texte chacune.

         Le bloc de notes unique qui tenait lieu de formulaire
         n'était lu par aucun constructeur : ce que le moniteur y
         écrivait n'arrivait jamais dans le bilan. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const aide = document.createElement('div');
      aide.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 8px;line-height:1.4;';
      aide.textContent = 'Une remarque par ligne. Une rubrique laissée vide ' +
        'sort avec son titre seul, comme sur la fiche.';
      bloc.appendChild(aide);

      (typeof RUBRIQUES !== 'undefined' ? RUBRIQUES : []).forEach(([cleR, titre]) => {
        const z = document.createElement('div');
        z.style.cssText = 'margin-bottom:10px;';

        const t2 = document.createElement('div');
        t2.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
          'margin-bottom:5px;';
        /* Le titre du bilan, sans sa ponctuation de fin : c'est le
           même repère que le moniteur retrouvera dans le texte. */
        t2.textContent = String(titre).replace(/\s*:\s*$/, '');
        z.appendChild(t2);

        const r = document.createElement('div');
        r.style.cssText = 'display:flex;gap:8px;align-items:flex-start;';

        const t = document.createElement('textarea');
        t.className = 'rubriqueManuelle';
        t.setAttribute('data-cle', ch.cle + '.' + cleR);
        t.rows = 2;
        t.placeholder = 'Une remarque par ligne';
        t.style.cssText = 'flex:1;background:var(--navy);border:1px solid var(--line);' +
          'color:var(--cream);padding:9px 10px;border-radius:10px;font-size:16px;' +
          'line-height:1.5;font-family:inherit;resize:vertical;margin:0;';
        r.appendChild(t);

        if(dicteePossible()){
          const mic = document.createElement('button');
          mic.type = 'button';
          mic.className = 'btn btn-secondary';
          mic.style.cssText = 'width:auto;padding:10px 12px;font-size:17px;margin:0;flex-shrink:0;';
          mic.textContent = '🎙️';
          mic.title = 'Dicter dans ' + t2.textContent;
          mic.addEventListener('click', () => dicterDans(t, mic));
          r.appendChild(mic);
        }

        z.appendChild(r);
        bloc.appendChild(z);
      });
    }else if(ch.type === 'eval3'){
      /* Une rubrique d'évaluation : son état, puis ce qu'il y a à
         corriger. Le bilan attend les deux — un état sans le détail
         ne dit pas à l'élève quoi retravailler.

         Non touchée, la rubrique ressort « ✅ ❌ 🍊 » dans le bilan,
         comme sur la fiche papier : c'est st3o() qui le fait, et
         c'est voulu. */
      const ligne = document.createElement('div');
      ligne.style.cssText = 'display:flex;gap:10px;align-items:center;' +
        'margin-bottom:6px;';

      const l = document.createElement('label');
      l.textContent = ch.nom;
      l.style.cssText = 'flex:1;min-width:0;margin:0;font-size:14px;' +
        'text-transform:none;color:var(--cream);';
      ligne.appendChild(l);

      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:5px;flex-shrink:0;';

      const boutons = [];
      /* Le groupe dit quelle réponse il porte, et chaque bouton
         laquelle il pose : c'est ainsi qu'une reprise sait
         lesquels rallumer. Voir repeindreBoutonsManuels(). */
      r.setAttribute('data-champ', ch.cle + '.statut');
      [['✅', '✅'], ['🍊', '🍊'], ['❌', '❌'], ['—', '']].forEach(([lab, val]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:7px 10px;font-size:15px;margin:0;' +
          'transition:transform .1s, background .1s;';
        b.textContent = lab;
        b.setAttribute('data-val', val);
        boutons.push(b);
        b.addEventListener('click', () => {
          champsManuels[ch.cle + '.statut'] = val;
          boutons.forEach(x => {
            x.style.borderColor = 'var(--line)';
            x.style.background = 'var(--navy)';
            x.style.color = 'var(--cream)';
            x.style.fontWeight = '400';
            x.style.transform = 'none';
            x.style.boxShadow = 'none';
          });
          const couleurs = {
            '✅': ['var(--orange)', '#0B0B0B'],
            '🍊': ['var(--ambre)', 'var(--sur-ambre)'],
            '❌': ['var(--red)', '#FFFFFF'],
            '':   ['var(--muted)', '#0B0B0B']
          };
          const [fond, texte] = couleurs[val] || couleurs[''];
          b.style.background = fond;
          b.style.borderColor = fond;
          b.style.color = texte;
          b.style.fontWeight = '700';
          b.style.transform = 'scale(1.06)';
          b.style.boxShadow = '0 2px 10px rgba(0,0,0,.35)';
        });
        r.appendChild(b);
      });
      ligne.appendChild(r);
      bloc.appendChild(ligne);

      /* Le détail. Un point par ligne, comme dans les autres bilans. */
      const t = document.createElement('textarea');
      t.id = 'manEval_' + ch.cle.split('.').join('_');
      t.rows = 2;
      t.placeholder = 'Ce qu\'il y a à corriger — une ligne par point';
      t.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
        'color:var(--cream);padding:9px 10px;border-radius:10px;font-size:15px;' +
        'line-height:1.5;font-family:inherit;resize:vertical;margin:0;';
      bloc.appendChild(t);

    }else if(ch.type === 'ok'){
      /* Passager et voyants décident de la note d'installation */
      /* La fin de la clé, pas son égalité : préfixée, elle devient
         « examenBlanc.examen.instPassager ». */
      const surInstallation = /(^|\.)examen\.inst(Passager|Voyants)$/.test(ch.cle);
      /* Trois états : ✅ ❌ ou rien. Compact et sur une seule ligne
         avec son libellé : un bilan en compte une dizaine, et de
         gros boutons empilés faisaient défiler pour rien. */
      bloc.style.cssText = 'margin-bottom:8px;display:flex;gap:10px;' +
        'align-items:center;';
      const l = document.createElement('label');
      l.textContent = ch.nom;
      l.style.cssText = 'flex:1;min-width:0;margin:0;font-size:14px;' +
        'text-transform:none;color:var(--cream);';
      bloc.appendChild(l);
      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:5px;flex-shrink:0;';
      r.setAttribute('data-champ', ch.cle);
      [['✅','✅'], ['❌','❌'], ['—','']].forEach(([lab, val]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:7px 11px;font-size:15px;margin:0;' +
          'transition:transform .1s, background .1s;';
        b.textContent = lab;
        b.setAttribute('data-val', val);
        b.addEventListener('click', () => {
          champsManuels[ch.cle] = val;

          /* La note d'installation se déduit des deux cases */
          if(surInstallation && typeof reporterNotesCepc === 'function'){
            reporterNotesCepc();
          }

          /* Le choix doit sauter aux yeux : une bordure seule se
             remarque mal, surtout à bout de bras dans la voiture. */
          Array.prototype.forEach.call(r.children, x => {
            x.style.borderColor = 'var(--line)';
            x.style.color = 'var(--cream)';
            x.style.background = 'var(--navy)';
            x.style.fontWeight = '400';
            x.style.transform = 'none';
            x.style.boxShadow = 'none';
          });

          const couleurs = {
            '✅': ['var(--orange)', '#0B0B0B'],
            '❌': ['var(--red)', '#FFFFFF'],
            '':   ['var(--muted)', '#0B0B0B']
          };
          const [fond, texte] = couleurs[val] || couleurs[''];
          b.style.background = fond;
          b.style.borderColor = fond;
          b.style.color = texte;
          b.style.fontWeight = '700';
          b.style.transform = 'scale(1.04)';
          b.style.boxShadow = '0 2px 10px rgba(0,0,0,.35)';
        });
        if((ch.defaut || '') === val) setTimeout(() => b.click(), 0);
        r.appendChild(b);
      });
      bloc.appendChild(r);

    }else if(ch.type === 'manoeuvres'){
      const liste = BLOC.ficheListeConduite;
      const dejaFaites = (dossier.manoeuvres || []).map(normaliserMot);

      const lm = document.createElement('label');
      lm.textContent = ch.nom + ' — coche celles travaillées aujourd\'hui';
      bloc.appendChild(lm);
      const zm = document.createElement('div');
      zm.style.cssText = 'background:var(--navy);border:1px solid var(--line);border-radius:10px;' +
        'padding:10px 12px;max-height:260px;overflow-y:auto;';
      liste.forEach(nom => {
        const dejaOk = dejaFaites.indexOf(normaliserMot(nom)) !== -1;
        const lab = document.createElement('label');
        lab.style.cssText = 'display:flex;align-items:center;gap:9px;padding:5px 0;' +
          'font-size:15px;text-transform:none;margin:0;color:' +
          (dejaOk ? 'var(--muted)' : 'var(--cream)') + ';';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = nom;
        cb.className = 'chManuel-' + ch.cle;
        cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;';
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(nom + (dejaOk ? '  (déjà validée)' : '')));

        /* 🚗 : déjà fait dans une autre auto-école. La même case que
           sur l'écran de cours — une manœuvre acquise ailleurs ne
           porte l'émoji d'aucun de nos moniteurs. */
        if(!dejaOk){
          const ail = document.createElement('label');
          ail.style.cssText = 'display:flex;align-items:center;gap:4px;margin:0 0 0 auto;' +
            'font-size:12px;text-transform:none;color:var(--muted);flex-shrink:0;';
          ail.title = 'Déjà fait dans une autre auto-école';
          const cbA = document.createElement('input');
          cbA.type = 'checkbox';
          cbA.className = 'mAilleurs';
          cbA.value = nom;
          cbA.style.cssText = 'width:15px;height:15px;flex-shrink:0;margin:0;';
          cbA.addEventListener('click', e => e.stopPropagation());
          ail.appendChild(cbA);
          ail.appendChild(document.createTextNode('🚗'));
          lab.appendChild(ail);
        }

        zm.appendChild(lab);
      });
      bloc.appendChild(zm);

    }else if(ch.type === 'competences'){
      /* Le modèle attend un statut ET des erreurs par compétence :
         une simple case à cocher ne suffisait pas. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const aide = document.createElement('div');
      aide.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 8px;line-height:1.4;';
      aide.textContent = 'Laisse « non travaillé » pour les compétences non abordées ' +
        "aujourd'hui : elles n'apparaîtront pas dans le bilan.";
      bloc.appendChild(aide);

      (modele.comps || []).forEach(comp => {
        const cle = comp.cle || '';
        const titre = comp.titre || comp.nom || cle;

        const zc = document.createElement('div');
        zc.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
          'padding:9px 11px;margin-bottom:7px;';

        const h = document.createElement('div');
        h.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;';

        const t = document.createElement('span');
        t.style.cssText = 'flex:1;min-width:0;font-size:14px;font-weight:600;';
        t.textContent = titre;
        h.appendChild(t);

        const sel = document.createElement('select');
        sel.className = 'compStatut';
        sel.setAttribute('data-comp', cle);
        sel.style.cssText = 'width:auto;margin:0;padding:7px 9px;font-size:14px;flex-shrink:0;';
        /* Les valeurs sont les émojis attendus par l'assembleur */
        sel.innerHTML = '<option value="">— non travaillé —</option>' +
          '<option value="✅">✅ Acquis</option>' +
          '<option value="🟠">🟠 En cours</option>' +
          '<option value="❌">❌ À revoir</option>';
        h.appendChild(sel);
        zc.appendChild(h);

        const err = document.createElement('textarea');
        err.className = 'compErreurs';
        err.setAttribute('data-comp', cle);
        err.rows = 2;
        err.placeholder = 'Erreurs à corriger, une par ligne';
        err.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
          'color:var(--cream);padding:8px 10px;border-radius:8px;font-size:14px;' +
          'line-height:1.5;font-family:inherit;resize:vertical;display:none;margin:0;';
        zc.appendChild(err);

        /* Les erreurs n'ont de sens que si la compétence a été travaillée */
        sel.addEventListener('change', () => {
          err.style.display = sel.value ? 'block' : 'none';
        });

        bloc.appendChild(zc);
      });

    }else if(ch.type === 'themes'){
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 8px;line-height:1.4;';
      a.textContent = 'Remplis seulement les rubriques utiles : les autres ne sortiront pas.';
      bloc.appendChild(a);

      THEMES_ERREURS.forEach(th => {
        const b = document.createElement('div');
        b.style.cssText = 'margin-bottom:10px;';
        const t2 = document.createElement('div');
        t2.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:4px;';
        t2.textContent = th.nom;
        b.appendChild(t2);

        const r = document.createElement('div');
        r.style.cssText = 'display:flex;gap:8px;align-items:flex-start;';
        const t = document.createElement('textarea');
        t.rows = 2;
        t.className = 'themeErreur';
        t.setAttribute('data-theme', th.nom);
        t.placeholder = 'Une remarque par ligne';
        t.style.cssText = 'flex:1;background:var(--navy);border:1px solid var(--line);' +
          'color:var(--cream);padding:10px 11px;border-radius:10px;font-size:16px;' +
          'line-height:1.5;font-family:inherit;resize:vertical;margin:0;';
        r.appendChild(t);
        if(dicteePossible()){
          const mic = document.createElement('button');
          mic.type = 'button';
          mic.className = 'btn btn-secondary';
          mic.style.cssText = 'width:auto;padding:10px 12px;font-size:17px;margin:0;flex-shrink:0;';
          mic.textContent = '🎙️';
          mic.title = 'Dicter dans ' + th.nom;
          mic.addEventListener('click', () => dicterDans(t, mic));
          r.appendChild(mic);
        }
        b.appendChild(r);
        bloc.appendChild(b);
      });

    }else if(ch.type === 'cepc'){
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const aide = document.createElement('div');
      aide.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 8px;line-height:1.5;';
      aide.textContent = "Appuie sur la note de chaque compétence, comme sur le CEPC " +
        "de l'inspecteur. Un second appui l'efface.";
      bloc.appendChild(aide);

      /* Le document officiel est sur fond blanc : on le reproduit
         tel quel, même en thème sombre. C'est sa ressemblance avec
         le vrai CEPC qui aide le moniteur à s'y retrouver. */
      const z = document.createElement('div');
      z.style.cssText = 'background:#FFFFFF;border:1px solid #D3DCE6;' +
        'border-radius:8px;padding:0;overflow:hidden;';

      const entete = document.createElement('div');
      entete.style.cssText = 'display:flex;justify-content:space-between;' +
        'align-items:baseline;padding:10px 12px 8px;border-bottom:1px solid #D3DCE6;';
      entete.innerHTML =
        '<span style="font-size:13px;font-weight:800;color:#0B2E4F;">' +
          'Bilan de compétences</span>' +
        '<span style="font-size:9px;color:#8A94A0;">Niveaux d\'appréciation</span>';
      z.appendChild(entete);

      /* Un compteur continu : sur le document, l'alternance ne se
         remet pas à zéro à chaque section. */
      let rangLigne = 0;
      CEPC_BLOCS.forEach(g => {
        const t = document.createElement('div');
        t.style.cssText = 'font-size:12px;font-weight:800;color:#0B2E4F;' +
          'padding:12px 12px 6px;background:#FFFFFF;';
        t.textContent = g.titre;
        z.appendChild(t);
        g.items.forEach(it => {
          z.appendChild(ligneCepc(it.nom, it.valeurs, rangLigne));
          rangLigne++;
        });
      });

      const tt = document.createElement('div');
      tt.style.cssText = 'font-size:12px;font-weight:800;color:#0B2E4F;' +
        'padding:12px 12px 4px;border-top:1px solid #D3DCE6;margin-top:8px;';
      tt.textContent = 'Résultat';
      z.appendChild(tt);

      const tot = document.createElement('div');
      tot.id = 'cepcTotal';
      tot.style.cssText = 'padding:6px 12px 14px;font-size:13px;font-weight:800;' +
        'color:#1568C8;display:flex;justify-content:space-between;align-items:center;';
      z.appendChild(tot);
      bloc.appendChild(z);
      setTimeout(majTotalCepc, 0);

    }else if(ch.type === 'photo'){
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.id = 'photo_' + ch.cle;
      inp.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
        'color:var(--cream);padding:11px;border-radius:10px;font-size:14px;';
      bloc.appendChild(inp);
      const apercu = document.createElement('div');
      apercu.id = 'apercu_' + ch.cle;
      apercu.style.cssText = 'margin-top:8px;';
      bloc.appendChild(apercu);
      const aide = document.createElement('div');
      aide.style.cssText = 'font-size:11px;color:var(--muted);margin-top:6px;line-height:1.4;';
      aide.textContent = "La photo reste sur ce téléphone : elle sert au moniteur pendant " +
        "le rendez-vous, elle n'est pas envoyée dans le bilan.";
      bloc.appendChild(aide);

      inp.addEventListener('change', () => {
        const f = inp.files && inp.files[0];
        apercu.innerHTML = '';
        if(!f) return;
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        img.style.cssText = 'max-width:100%;border-radius:10px;border:1px solid var(--line);';
        apercu.appendChild(img);
        champsManuels[ch.cle] = f.name;
      });

    }else if(ch.type === 'inspecteur'){
      /* La liste des inspecteurs, partagée par toute l'équipe :
         un nom ajouté ici sert à tout le monde. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const sel = document.createElement('select');
      sel.id = idChamp(ch.cle);
      sel.innerHTML = '<option value="">— à choisir —</option>' +
        inspecteursConnus().map(n =>
          '<option value="' + String(n).replace(/"/g, '&quot;') + '">' +
          String(n).replace(/</g, '&lt;') + '</option>').join('') +
        '<option value="__autre__">➕ En ajouter un…</option>';

      sel.addEventListener('change', async () => {
        if(sel.value !== '__autre__') return;

        const nom = await demander('Nom de l\'inspecteur', '',
                                   'Nouvel inspecteur');
        if(!nom || !nom.trim()){ sel.value = ''; return; }

        const propre = nom.trim();
        await ajouterInspecteur(propre);

        const o = document.createElement('option');
        o.value = propre;
        o.textContent = propre;
        sel.insertBefore(o, sel.lastElementChild);
        sel.value = propre;
      });
      bloc.appendChild(sel);

    }else if(ch.type === 'repassage'){
      /* « 4 + 3 » : deux leçons de 2h, puis les 3h avant examen.
         Le second nombre ne bouge pas. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const d = document.createElement('div');
      d.style.cssText = 'display:flex;gap:9px;align-items:center;';

      const iq = document.createElement('input');
      iq.type = 'number';
      iq.id = idChamp(ch.cle);
      iq.min = '0';
      iq.step = '1';
      iq.value = '4';
      iq.inputMode = 'numeric';
      iq.style.cssText = 'width:82px;font-size:17px;text-align:center;margin:0;';
      d.appendChild(iq);

      const t = document.createElement('span');
      t.style.cssText = 'font-size:16px;color:var(--muted);';
      t.textContent = '+ 3 heures';
      d.appendChild(t);

      bloc.appendChild(d);

      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);margin-top:5px;' +
        'line-height:1.5;';
      a.textContent = 'Ce qu\'il faudra avant de le représenter. ' +
        '4 + 3 = deux leçons de 2h, puis les 3h avant examen.';
      bloc.appendChild(a);

    }else if(ch.type === 'envoiAvant'){
      /* De quoi envoyer la première moitié sans attendre la fin
         de l'examen. */
      bloc.style.cssText = 'margin:2px 0 8px;';

      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'padding:12px;font-size:13px;' +
        'border-color:var(--ambre);color:var(--ambre);';
      b.textContent = '📤 Envoyer la partie avant examen';
      b.addEventListener('click', () => envoyerAvantExamen());
      bloc.appendChild(b);

      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);margin-top:6px;' +
        'text-align:center;line-height:1.5;';
      a.textContent = "L'élève reçoit cette partie tout de suite. " +
        'Sa fiche reste en haut pour la suite.';
      bloc.appendChild(a);

    }else if(ch.type === 'titre'){
      /* Un intertitre : il sépare deux moments de l'examen, et
         porte le bouton d'envoi de sa partie. */
      bloc.style.cssText = 'margin:22px 0 12px;padding-top:14px;' +
        'border-top:2px solid var(--line);';

      const t = document.createElement('div');
      t.style.cssText = 'font-size:17px;font-weight:800;color:var(--accent-text);';
      t.textContent = ch.nom;
      bloc.appendChild(t);

      if(ch.aide){
        const a = document.createElement('div');
        a.style.cssText = 'font-size:12px;color:var(--muted);margin-top:3px;' +
          'line-height:1.5;';
        a.textContent = ch.aide;
        bloc.appendChild(a);
      }


    }else if(ch.type === 'entete'){
      /* La première partie du bilan, telle que l'élève la lira :
         le moniteur coche dans le texte au lieu de répondre à une
         suite de questions détachées de leur contexte. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const z = document.createElement('div');
      z.style.cssText = 'background:var(--navy);border:1px solid var(--line);' +
        'border-radius:10px;padding:12px 13px;font-size:14px;line-height:1.55;';

      const ligneCase = (cle, texte, apres) => {
        const d = document.createElement('div');
        d.style.cssText = 'display:flex;gap:9px;align-items:flex-start;padding:5px 0;';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'enteteCase';
        cb.setAttribute('data-cle', cle);
        cb.checked = true;                 /* ✅ par défaut, comme avant */
        cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin-top:2px;';
        d.appendChild(cb);

        const t = document.createElement('div');
        t.style.cssText = 'flex:1;min-width:0;word-break:break-word;';
        t.innerHTML = '<strong>' + texte + '</strong>' +
          (apres ? '<div style="font-size:12px;color:var(--muted);' +
                   'line-height:1.5;margin-top:2px;">' + apres + '</div>' : '');
        d.appendChild(t);

        z.appendChild(d);
      };

      ligneCase('carteSD', '𝘾𝙖𝙧𝙩𝙚 𝙎𝘿',
        "N'oublie pas de la regarder et si soucis demande nous !! (rappel, tous " +
        'tes cours sont filmés, par une caméra avant et une arrière, avec le son ' +
        'et les conseils des moniteurs, pour revoir tout ton cours de conduite, ' +
        'avant de revenir à ton prochain cours).');
      ligneCase('installation', '𝙄𝙣𝙨𝙩𝙖𝙡𝙡𝙖𝙩𝙞𝙤𝙣',
        'https://www.facebook.com/groups/963972327360861/permalink/969918630099564/');
      ligneCase('passager', '𝙋𝙖𝙨𝙨𝙖𝙜𝙚𝙧', '');
      ligneCase('voyants', '𝙑𝙤𝙮𝙖𝙣𝙩𝙨', '/2 points jour du permis');

      /* Les vérifications : deux champs courts, pas des cases */
      const sep = document.createElement('div');
      sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0 8px;';
      z.appendChild(sep);

      const v = document.createElement('div');
      v.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:2px;';
      v.textContent = '𝙑𝙚́𝙧𝙞𝙛𝙞𝙘𝙖𝙩𝙞𝙤𝙣𝙨';
      z.appendChild(v);

      const lien = document.createElement('div');
      lien.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px;' +
        'word-break:break-all;';
      lien.textContent = 'https://www.facebook.com/groups/864826058258637';
      z.appendChild(lien);

      const duo = document.createElement('div');
      duo.style.cssText = 'display:flex;gap:10px;';
      [['verifQuestion', 'Question n°', 'Ex : 12'],
       ['verifNote', 'Note sur 3', 'Ex : 3']].forEach(([cle, lab, ph]) => {
        const col = document.createElement('div');
        col.style.cssText = 'flex:1;min-width:0;';
        const e = document.createElement('label');
        e.textContent = lab;
        e.style.cssText = 'font-size:12px;margin-bottom:4px;text-transform:none;';
        col.appendChild(e);
        const i = document.createElement('input');
        i.type = 'text';
        i.className = 'enteteTexte';
        i.setAttribute('data-cle', cle);
        i.placeholder = ph;
        i.style.cssText = 'margin:0;padding:9px 10px;font-size:15px;';
        col.appendChild(i);
        duo.appendChild(col);
      });
      z.appendChild(duo);

      const pts = document.createElement('div');
      pts.style.cssText = 'font-size:12px;color:var(--muted);margin-top:6px;';
      pts.textContent = '/3 points jour du permis';
      z.appendChild(pts);

      bloc.appendChild(z);

    }else if(ch.type === 'inspecteur'){
      /* La liste des inspecteurs, partagée par toute l'équipe :
         un nom ajouté ici sert à tout le monde. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const sel = document.createElement('select');
      sel.id = idChamp(ch.cle);
      sel.innerHTML = '<option value="">— à choisir —</option>' +
        inspecteursConnus().map(n =>
          '<option value="' + String(n).replace(/"/g, '&quot;') + '">' +
          String(n).replace(/</g, '&lt;') + '</option>').join('') +
        '<option value="__autre__">➕ En ajouter un…</option>';

      sel.addEventListener('change', async () => {
        if(sel.value !== '__autre__') return;

        const nom = await demander('Nom de l\'inspecteur', '',
                                   'Nouvel inspecteur');
        if(!nom || !nom.trim()){ sel.value = ''; return; }

        const propre = nom.trim();
        await ajouterInspecteur(propre);

        const o = document.createElement('option');
        o.value = propre;
        o.textContent = propre;
        sel.insertBefore(o, sel.lastElementChild);
        sel.value = propre;
      });
      bloc.appendChild(sel);

    }else if(ch.type === 'repassage'){
      /* « 4 + 3 » : deux leçons de 2h, puis les 3h avant examen.
         Le second nombre ne bouge pas. */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);

      const d = document.createElement('div');
      d.style.cssText = 'display:flex;gap:9px;align-items:center;';

      const iq = document.createElement('input');
      iq.type = 'number';
      iq.id = idChamp(ch.cle);
      iq.min = '0';
      iq.step = '1';
      iq.value = '4';
      iq.inputMode = 'numeric';
      iq.style.cssText = 'width:82px;font-size:17px;text-align:center;margin:0;';
      d.appendChild(iq);

      const t = document.createElement('span');
      t.style.cssText = 'font-size:16px;color:var(--muted);';
      t.textContent = '+ 3 heures';
      d.appendChild(t);

      bloc.appendChild(d);

      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);margin-top:5px;' +
        'line-height:1.5;';
      a.textContent = 'Ce qu\'il faudra avant de le représenter. ' +
        '4 + 3 = deux leçons de 2h, puis les 3h avant examen.';
      bloc.appendChild(a);

    }else if(ch.type === 'envoiAvant'){
      /* De quoi envoyer la première moitié sans attendre la fin
         de l'examen. */
      bloc.style.cssText = 'margin:2px 0 8px;';

      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'padding:12px;font-size:13px;' +
        'border-color:var(--ambre);color:var(--ambre);';
      b.textContent = '📤 Envoyer la partie avant examen';
      b.addEventListener('click', () => envoyerAvantExamen());
      bloc.appendChild(b);

      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);margin-top:6px;' +
        'text-align:center;line-height:1.5;';
      a.textContent = "L'élève reçoit cette partie tout de suite. " +
        'Sa fiche reste en haut pour la suite.';
      bloc.appendChild(a);

    }else if(ch.type === 'titre'){
      /* Un gros repère dans le formulaire : le moniteur retrouve
         d'un coup d'œil la structure du bilan qu'il connaît. */
      const t = document.createElement('div');
      t.style.cssText = 'font-size:19px;font-weight:800;color:var(--accent-text);' +
        'margin:26px 0 6px;text-align:center;line-height:1.35;';
      t.textContent = ch.nom;
      bloc.appendChild(t);
      const tr = document.createElement('div');
      tr.style.cssText = 'border-top:2px solid var(--orange);margin:0 auto 16px;width:70%;';
      bloc.appendChild(tr);

    }else if(ch.type === 'observations'){
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      const z = document.createElement('div');
      z.id = 'obsManuel';
      bloc.appendChild(z);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      b.style.cssText = 'margin-top:8px;padding:10px;font-size:13px;';
      b.textContent = '➕ Ajouter une observation';
      b.addEventListener('click', () => ajouterObservationManuelle(z));
      bloc.appendChild(b);

      /* Vingt lignes prêtes : un examen en compte facilement autant,
         et ajouter une ligne à chaque fois cassait le rythme. */
      for(let i = 0; i < 20; i++) ajouterObservationManuelle(z);

    }else{
      /* Texte libre, avec dictée possible */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      if(ch.aide){
        const a = document.createElement('div');
        a.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 6px;line-height:1.4;';
        a.textContent = ch.aide;
        bloc.appendChild(a);
      }
      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:8px;align-items:flex-start;';
      const t = document.createElement('textarea');
      t.rows = (ch.type === 'court') ? 1 : (ch.lignes || 6);
      t.id = idChamp(ch.cle);
      /* Le texte pré-rempli : le moniteur n'a plus qu'à effacer
         l'émoji qui ne convient pas et compléter les blancs. */
      if(ch.defaut) t.value = ch.defaut;
      t.style.cssText = 'flex:1;background:var(--navy);border:1px solid var(--line);' +
        'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:16px;' +
        'line-height:1.6;font-family:inherit;resize:vertical;margin:0;';
      /* Le bilan des éliminatoires se réécrit tant que le
         moniteur n'y a pas touché. */
      if(/(^|\.)bilanElim$/.test(ch.cle)){
        t.addEventListener('input', () => {
          if(typeof figerBilanEliminatoires === 'function'){
            figerBilanEliminatoires();
          }
        });
      }

      /* Les heures avant permis décident de la frise post : le
         calcul se fait à la saisie, pas à la génération. */
      if(ch.cle === 'heuresAvant'){
        t.addEventListener('input', () => {
          champsManuels[prefixeExamenBlanc + 'heuresAvant'] = t.value;
          if(typeof remplirFrises === 'function'){
            remplirFrises(champsManuels, true);
          }
        });
      }

      r.appendChild(t);
      if(dicteePossible()){
        const mic = document.createElement('button');
        mic.type = 'button';
        mic.className = 'btn btn-secondary';
        mic.style.cssText = 'width:auto;padding:11px 13px;font-size:18px;margin:0;flex-shrink:0;';
        mic.textContent = '🎙️';
        mic.title = 'Dicter dans ce champ';
        mic.addEventListener('click', () => dicterDans(t, mic));
        r.appendChild(mic);
      }

      /* Marquer une faute éliminatoire, là où c'est utile */
      if(ch.mort){
        const bm = document.createElement('button');
        bm.type = 'button';
        bm.className = 'btn btn-secondary';
        bm.style.cssText = 'width:auto;padding:11px 13px;font-size:18px;margin:0;flex-shrink:0;';
        bm.textContent = '☠️';
        bm.title = 'Insérer le marqueur de faute éliminatoire';
        bm.addEventListener('click', () => {
          /* Sur la ligne où se trouve le curseur, pas ailleurs */
          const v = t.value;
          const pos = t.selectionStart || 0;
          const debut = v.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
          let fin = v.indexOf('\n', pos);
          if(fin === -1) fin = v.length;
          const ligne = v.slice(debut, fin);

          const nouvelle = (ligne.indexOf('☠️') !== -1)
            ? ligne.split('☠️').join('').replace(/\s+/g, ' ').trim()
            : ('☠️ ' + ligne).trim();

          t.value = v.slice(0, debut) + nouvelle + v.slice(fin);
          t.focus();
          t.setSelectionRange(debut + nouvelle.length, debut + nouvelle.length);
        });
        r.appendChild(bm);
      }

      bloc.appendChild(r);
    }

    zone.appendChild(bloc);
  });
}


/* ============================================================
   L'EXAMEN BLANC SOUS LA TRANSCRIPTION

   Le rendez-vous pédagogique se dicte, mais l'examen blanc qu'on
   y fait ne se dicte pas : il se note, case par case. Le module
   se pose donc sous la transcription, replié.

   Il utilise dessinerChampsManuels() et le MÊME schéma que le
   bilan manuel : deux formulaires écrits séparément auraient fini
   par ne plus poser les mêmes questions.
   ============================================================ */

/* La question et les champs du module, sans ce qui appartient au
   RVP lui-même. On part de la question : tout ce qui suit est le
   module. */
function champsExamenBlancRvp(){
  const tous = CHAMPS_MANUELS.rvp || [];
  const debut = tous.findIndex(c => c.cle === 'examenBlancFait');
  return (debut === -1) ? [] : tous.slice(debut);
}

/* Sommes-nous sur un rendez-vous pédagogique ? On interroge le
   SCHÉMA, pas la clé du modèle : « rvp » est le nom du schéma,
   la clé s'appelle « aac-rvp » — les comparer faisait rater le
   test à tous les coups. */
function surRendezVousPedago(){
  const cle = ($('modele') && $('modele').value) || '';
  const m = (typeof MODELES !== 'undefined') ? MODELES[cle] : null;
  return !!(m && m.schema === 'rvp');
}

function majBlocExamenBlancCours(){
  const zone = $('examenBlancCours');
  if(!zone) return;

  const surRvp = surRendezVousPedago();
  zone.style.display = surRvp ? 'block' : 'none';
  if(!surRvp){ zone.innerHTML = ''; return; }

  /* Déjà dessiné : on ne recommence pas, ce que le moniteur a
     saisi serait perdu à chaque redessin de l'écran. */
  if(zone.dataset.pret === 'oui') return;
  zone.dataset.pret = 'oui';
  zone.innerHTML = '';

  const det = document.createElement('details');
  det.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:10px 12px;';
  det.open = true;
  det.innerHTML = '<summary style="cursor:pointer;font-size:15px;font-weight:700;' +
    'color:var(--accent-text);">📝 Examen blanc</summary>';

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin:8px 0 10px;line-height:1.4;';
  aide.textContent = "Réponds à la question. Sans réponse, le bilan garde " +
    'sa forme habituelle.';
  det.appendChild(aide);

  const dedans = document.createElement('div');
  det.appendChild(dedans);
  zone.appendChild(det);

  /* Les clés sont celles du module : les mêmes qu'en manuel */
  prefixeExamenBlanc = 'examenBlanc.';
  cleNiveauCourante = 'examenBlanc.niveau';
  dessinerChampsManuels(champsExamenBlancRvp(), dedans,
                        MODELES[$('modele').value] || {}, { manoeuvres: [] });
  majChampsSelonExamenBlanc();
}

/* Ce que le moniteur a noté sous la transcription, prêt pour le
   constructeur. Vide s'il n'a rien ouvert. */
function examenBlancDuCours(){
  const zone = $('examenBlancCours');
  if(!zone || zone.dataset.pret !== 'oui') return {};

  /* La même relecture que le bilan manuel, sur les mêmes champs */
  lireChampsManuels(champsExamenBlancRvp());

  const eb = {};
  Object.keys(champsManuels || {}).forEach(k => {
    if(k.indexOf('examenBlanc.') !== 0) return;
    const chemin = k.slice(12).split('.');
    let cible = eb;
    for(let i = 0; i < chemin.length - 1; i++){
      if(!cible[chemin[i]] || typeof cible[chemin[i]] !== 'object'){
        cible[chemin[i]] = {};
      }
      cible = cible[chemin[i]];
    }
    cible[chemin[chemin.length - 1]] = champsManuels[k];
  });

  const out = {};
  /* La réponse elle-même : c'est elle qui décide du ✅ ou du ❌
     dans le bilan, même sans un seul champ rempli. */
  if(champsManuels.examenBlancFait){
    out.examenBlancFait = champsManuels.examenBlancFait;
  }
  if(Object.keys(eb).length) out.examenBlanc = eb;
  return out;
}
