/* Déployé le 26/08/2026 à 15:43 — v579 */
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
  eval: [
    { cle:'resume',      type:'texte', nom:'Bilan de l\'évaluation', lignes:12 },
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
  rvp: [
    { cle:'resume',      type:'texte', nom:'Déroulé du rendez-vous', lignes:12 }
  ],
  accompagnateur: [
    { cle:'resume',      type:'texte', nom:'Déroulé de la formation', lignes:12 }
  ]
};

/* La boîte automatique part du même formulaire que la boîte manuelle,
   puis les deux évoluent séparément. */
CHAMPS_MANUELS.conduiteResumeAuto =
  JSON.parse(JSON.stringify(CHAMPS_MANUELS.conduiteResume));


/* champsManuels : déclaré dans ec-etat.js */
/* modeManuel : déclaré dans ec-etat.js */

/* La dictée est-elle possible sur ce navigateur ? */
function dicteePossible(){
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/* Dictée dans un champ précis, sans toucher au reste */
function dicterDans(champ, bouton){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ showToast('La dictée demande Chrome sur Android.'); return; }

  /* Un second appui arrête pour de bon */
  if(bouton.dataset.actif === 'oui'){
    bouton.dataset.stop = 'oui';
    if(bouton._sr) try{ bouton._sr.stop(); }catch(e){}
    return;
  }

  const sr = new SR();
  sr.lang = 'fr-FR';
  sr.continuous = true;
  /* Les résultats provisoires : le moniteur voit ses mots arriver
     et sait que ça écoute encore. */
  sr.interimResults = true;
  sr.maxAlternatives = 3;

  /* Le texte acquis. Il se fige à chaque relance : sans cela, la
     session suivante repartait de zéro et Chrome relivrait ce qui
     venait d'être dit — d'où le texte écrit deux ou trois fois. */
  let depart = champ.value;
  let ajoute = '';

  const ecrire = (provisoire) => {
    champ.value = (depart ? depart + (depart.endsWith('\n') ? '' : ' ') : '') +
                  terminerPhrase(ajoute) +
                  (provisoire ? (ajoute ? ' ' : '') + provisoire : '');
    champ.scrollTop = champ.scrollHeight;
  };

  /* Une phrase déjà livrée ne doit pas revenir : Chrome relivre
     parfois les derniers résultats après une coupure. */
  const dejaDit = [];

  sr.onresult = ev => {
    let provisoire = '';

    for(let i = ev.resultIndex; i < ev.results.length; i++){
      if(!ev.results[i].isFinal){
        provisoire += ev.results[i][0].transcript;
        continue;
      }
      let meilleur = ev.results[i][0].transcript;
      let score = -1;
      for(let k = 0; k < ev.results[i].length; k++){
        const s = scoreMetier(ev.results[i][k].transcript);
        if(s > score){ score = s; meilleur = ev.results[i][k].transcript; }
      }
      const propre = corrigerVocabulaire(meilleur.trim());
      if(!propre) continue;

      /* Le même bout, deux fois de suite : c'est une relivraison */
      if(dejaDit.indexOf(propre) !== -1) continue;
      dejaDit.push(propre);
      if(dejaDit.length > 12) dejaDit.shift();

      ajoute += (ajoute ? ' ' : '') + propre;
    }

    ecrire(provisoire);
  };

  sr.onerror = e => {
    /* Un silence n'est pas une erreur : on relancera. */
    if(e.error === 'no-speech' || e.error === 'aborted') return;
    if(e.error === 'not-allowed'){
      bouton.dataset.stop = 'oui';
      showToast('Le micro est refusé. Autorise-le dans le navigateur.');
      return;
    }
    showToast('Dictée : ' + e.error);
  };

  /* Le navigateur coupe seul après quelques secondes de silence.
     Sans relance, le moniteur devait rappuyer à chaque phrase —
     d'où l'impression de devoir maintenir le bouton. */
  sr.onend = () => {
    /* On fige ce qui a été dit : la boîte fait autorité, et la
       session suivante repart d'une page blanche.

       Les espaces de fin sont retirés, sinon chaque relance en
       ajoutait un et le texte finissait par flotter. */
    ecrire('');
    depart = champ.value.replace(/[ \t]+$/, '');
    champ.value = depart;
    ajoute = '';

    if(bouton.dataset.stop === 'oui'){
      bouton.dataset.actif = '';
      bouton.dataset.stop = '';
      bouton.textContent = '🎙️';
      bouton.style.background = '';
      bouton._sr = null;
      return;
    }

    try{
      sr.start();
    }catch(e){
      /* La relance a échoué : on rend la main plutôt que de
         laisser un bouton rouge qui n'écoute plus. */
      bouton.dataset.actif = '';
      bouton.textContent = '🎙️';
      bouton.style.background = '';
      bouton._sr = null;
    }
  };

  bouton._sr = sr;
  bouton.dataset.actif = 'oui';
  bouton.dataset.stop = '';
  bouton.textContent = '⏹️';
  bouton.style.background = 'var(--red)';
  bouton.title = 'Appuie pour arrêter la dictée';

  try{
    sr.start();
    showToast('🎙️ Dictée en cours — appuie sur ⏹️ pour arrêter');
  }catch(e){
    showToast('Dictée indisponible.');
    bouton.dataset.stop = 'oui';
    sr.onend();
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

  const champs = CHAMPS_MANUELS[modele.schema];
  if(!champs){ showToast('Ce modèle ne se remplit pas encore à la main.'); return; }

  const eleve = $('studentName').value.trim();
  const btn = $('manuelBtn');
  btn.disabled = true;
  btn.textContent = 'Préparation…';

  /* L'examen officiel n'a pas de leçon à préparer : le
     questionnaire n'apprendrait rien, et son bilan ne dépend pas
     de la boîte de vitesses. On passe directement à la fiche. */
  if(modeleCle === 'examen-officiel'){
    /* rien à demander */
  }else if(!contexteDepart){
    try{
      const rep = await ouvrirQuestionnaireDepart(null, 'Avant de remplir le bilan', 'Continuer');
      if(rep){
        contexteDepart = rep;
        if(typeof afficherSaisieDuJour === 'function'){
          afficherSaisieDuJour(rep, 'preparationManuel');
        }
        appliquerNoteQuestionnaire(noteDepuisQuestionnaire(rep));
      }
    }catch(e){}
  }

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

  champs.forEach(ch => {
    const bloc = document.createElement('div');
    bloc.style.cssText = 'margin-bottom:16px;';

    /* Certains champs ne servent que si l élève a le niveau :
       les montrer ailleurs fait remplir pour rien. */
    if(ch.siNiveau) bloc.dataset.siNiveau = ch.siNiveau;

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
      champ.id = 'man_' + ch.cle.replace('.', '_');
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
      inp.id = 'man_' + ch.cle;
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

    }else if(ch.type === 'ok'){
      /* Passager et voyants décident de la note d'installation */
      const surInstallation = (ch.cle === 'examen.instPassager' ||
                               ch.cle === 'examen.instVoyants');
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
      [['✅','✅'], ['❌','❌'], ['—','']].forEach(([lab, val]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:7px 11px;font-size:15px;margin:0;' +
          'transition:transform .1s, background .1s;';
        b.textContent = lab;
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
      sel.id = 'man_' + ch.cle;
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
      iq.id = 'man_' + ch.cle;
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
      sel.id = 'man_' + ch.cle;
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
      iq.id = 'man_' + ch.cle;
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
      t.id = 'man_' + ch.cle.replace('.', '_');
      /* Le texte pré-rempli : le moniteur n'a plus qu'à effacer
         l'émoji qui ne convient pas et compléter les blancs. */
      if(ch.defaut) t.value = ch.defaut;
      t.style.cssText = 'flex:1;background:var(--navy);border:1px solid var(--line);' +
        'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:16px;' +
        'line-height:1.6;font-family:inherit;resize:vertical;margin:0;';
      /* Les heures avant permis décident de la frise post : le
         calcul se fait à la saisie, pas à la génération. */
      if(ch.cle === 'heuresAvant'){
        t.addEventListener('input', () => {
          champsManuels.heuresAvant = t.value;
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

  /* Tant qu'aucun niveau n'est choisi, on ne demande rien qui en
     dépende. */
  if(typeof majChampsSelonNiveau === 'function') majChampsSelonNiveau();

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
function majChampsSelonNiveau(){
  const n = champsManuels.niveau || '';

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
  /* La remarque alimente le bilan des éliminatoires */
  insp.addEventListener('input', () => {
    if(typeof majBilanEliminatoires === 'function') majBilanEliminatoires();
  });
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
    const pris = (d.dataset.grave === 'oui');
    bGrave.style.borderColor = pris ? 'var(--accent-text)' : 'var(--line)';
    bGrave.style.color = pris ? 'var(--accent-text)' : '';
  };

  bGrave.addEventListener('click', () => {
    d.dataset.grave = (d.dataset.grave === 'oui') ? '' : 'oui';
    majGrave();
    if(typeof majBilanEliminatoires === 'function') majBilanEliminatoires();
  });
  r.appendChild(bGrave);

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
  const zone = document.getElementById('man_bilanElim');
  if(!zone) return;

  /* Ce qui est marqué, groupé par catégorie */
  const par = {};
  document.querySelectorAll('#obsManuel > div').forEach(d => {
    const cat = d.dataset ? (d.dataset.categorie || '') : '';
    if(!cat) return;
    const i = d.querySelector('.obsInsp');
    const r = d.querySelector('.obsRep');
    (par[cat] = par[cat] || []).push({
      inspecteur: i ? i.value.trim() : '',
      reponse: r ? r.value.trim() : ''
    });
  });

  const noms = Object.keys(par);
  if(!noms.length) return;

  /* L'ordre du CEPC, celui que suit l'inspecteur */
  const ordre = (typeof categoriesEliminatoires === 'function')
    ? categoriesEliminatoires().filter(n => par[n]) : noms;

  const ancien = zone.value;
  const bouts = [];

  ordre.forEach(cat => {
    /* Une catégorie déjà présente n'est pas réécrite : le
       moniteur y a peut-être déjà répondu. */
    if(ancien.indexOf(cat) !== -1) return;

    bouts.push('☠️ Erreur éliminatoire — ' + cat);
    bouts.push('');

    par[cat].forEach(o => {
      if(o.inspecteur) bouts.push('👨‍✈️ ' + o.inspecteur);
      if(o.reponse) bouts.push(emojiMoniteur() + ' ' + o.reponse);
      bouts.push("- qu'en penses-tu ?");
      bouts.push('- quelles sont TES solutions ?');
      bouts.push('- ce que je te PROPOSE : ');
      bouts.push('');
    });
  });

  /* Les erreurs graves sans être éliminatoires : elles rejoignent
     le bilan sous le même format, sans toucher au CEPC. */
  document.querySelectorAll('#obsManuel > div').forEach(dv => {
    if(!dv.dataset || dv.dataset.grave !== 'oui') return;
    if(dv.dataset.categorie) return;        /* déjà traitée plus haut */

    const i = dv.querySelector('.obsInsp');
    const r = dv.querySelector('.obsRep');
    const vi = i ? i.value.trim() : '';
    const vr = r ? r.value.trim() : '';
    if(!vi && !vr) return;

    /* Déjà écrite : le moniteur y a peut-être déjà répondu */
    if(vi && ancien.indexOf(vi) !== -1) return;

    if(vi) bouts.push('👨‍✈️ ' + vi);
    if(vr) bouts.push(emojiMoniteur() + ' ' + vr);
    bouts.push("- qu'en penses-tu ?");
    bouts.push('- quelles sont TES solutions ?');
    bouts.push('- ce que je te PROPOSE : ');
    bouts.push('');
  });

  if(!bouts.length) return;

  /* En tête : les éliminatoires passent avant le reste */
  zone.value = (bouts.join('\n') + (ancien ? '\n' + ancien : '')).trim();
  champsManuels.bilanElim = zone.value;

  if(typeof sauvegarderBrouillonManuel === 'function'){
    sauvegarderBrouillonManuel();
  }
}


/* Combien de leçons l'élève a réellement faites.

   Compter les bilans ne suffit pas : un élève arrivé en cours de
   route n'en a qu'un ou deux dans l'outil alors qu'il en est à sa
   huitième leçon. Le numéro écrit dans son dernier bilan dit la
   vérité. */
function leconsFaites(){
  const d = dossierManuel || {};

  /* Ce que dit son dernier bilan */
  const n = parseInt(d.leconNum, 10);
  if(!isNaN(n) && n > 0) return n;

  /* À défaut, ce que disent ses notes à l'écran */
  const t = ($('noteInterne') && $('noteInterne').value) || '';
  const m = t.match(/(\d+)\s*(?:ère|ere|ème|eme|e)?\s*le[çc]on/i);
  if(m){
    const v = parseInt(m[1], 10);
    if(!isNaN(v) && v > 0) return v;
  }

  /* En dernier ressort, le nombre de bilans enregistrés */
  const c = Number(d.lecons);
  return c > 0 ? c : null;
}


/* ============================================================
   LES FRISES, DÉDUITES

   La frise dit combien de leçons étaient prévues avant et après
   l'examen blanc. Le nombre de leçons faites se lit dans le
   dossier ; les heures annoncées avant permis, dans la fiche.

   Comparer les deux évite au moniteur de le faire de tête.
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
    if(champs[cle] === valeur) return;      /* déjà juste */

    champs[cle] = valeur;
    champs.__frisesAuto[cle] = valeur;
    if(!surEcran) return;

    const zone = document.getElementById('man_' + cle.replace('.', '_'));
    if(zone){ zone.value = valeur; return; }

    /* Les oui/non sont des boutons : on repeint nous-mêmes.

       Un clic simulé rappellerait le gestionnaire, qui réécrirait
       la valeur et effacerait la marque « posé par le calcul » —
       plus rien ne se serait recalculé ensuite. */
    const r = document.getElementById('ouinon_' + cle);
    if(!r) return;
    peindreOuiNon(r, valeur);
  };

  /* Avant l'examen blanc : ce que la frise prévoyait, contre ce
     que l'élève a réellement fait. */
  const prevues = leconsAvantExamenBlanc(frise);
  const faites = leconsFaites();

  /* On recalcule tant que le moniteur n'a pas corrigé lui-même */
  const aMoi = cle => !champs[cle] ||
                      champs.__frisesAuto[cle] === champs[cle];

  if(prevues !== null && faites !== null && aMoi('friseAvant')){
    if(faites <= prevues){
      poser('friseAvant', 'oui');
    }else{
      poser('friseAvant', 'non');
      /* Chaque leçon de deux heures au-delà du prévu */
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
       s'annulent. « 4 + 3 » se compare donc à 4h de leçons, pas
       à 7h. */
    const prevuH = apres * 2;

    if(annoncees <= prevuH){
      poser('frisePost', 'oui');
      /* Plus d'heures en trop : le champ se vide */
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
   LES NOTES REPORTÉES SUR LE CEPC

   L'installation vaut 2 : passager et voyants comptent un point
   chacun. Les vérifications valent 3, notées directement.

   Le moniteur voit la note se poser pendant qu'il coche, et
   peut la corriger.
   ============================================================ */

function reporterNotesCepc(){
  /* L'installation : deux cases, deux points */
  const p = champsManuels['examen.instPassager'] || '';
  const v = champsManuels['examen.instVoyants'] || '';

  if(p || v){
    let n = 0;
    if(p === '✅') n++;
    if(v === '✅') n++;
    poserNoteCepc("Savoir s'installer et assurer la sécurité à bord",
                  String(n));
  }

  /* Les vérifications : la note du moniteur, telle quelle */
  const nv = champsManuels['examen.verifNote'];
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


function choisirCategorieCepc(){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.cssText = 'max-width:min(460px, 94vw);max-height:88vh;overflow-y:auto;';

    boite.innerHTML = '<h3>☠️ Quelle catégorie ?</h3>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
        'line-height:1.5;">Le E sera coché sur cette ligne du CEPC, et ' +
        "l'erreur nommée ainsi dans le bilan.</div>";

    categoriesEliminatoires().forEach(nom => {
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

  /* Rien de saisi : inutile de proposer une reprise vide */
  if(!saisies.some(x => x.valeur)) return;

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

  ['input', 'change'].forEach(ev => {
    zone.addEventListener(ev, planifierSauvegardeManuelle);
  });
}


function lireChampsManuels(){
  const modele = MODELES[$('modele').value];
  const champs = CHAMPS_MANUELS[modele.schema];
  if(!champs) return;

  champs.forEach(ch => {
    if(ch.type === 'titre' || ch.type === 'envoiAvant' ||
       ch.type === 'rappelFrise'){
      /* Ni un intertitre ni un bouton ne portent de réponse */


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
      champ.id = 'man_' + ch.cle.replace('.', '_');
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

    }else if(ch.type === 'note3'){
      const el = document.getElementById('man_' + ch.cle.replace('.', '_'));
      if(el && String(el.value).trim()){
        champsManuels[ch.cle] = String(el.value).trim();
      }
    }else if(ch.type === 'heures'){
      const el = document.getElementById('man_' + ch.cle);
      if(el && String(el.value).trim()){
        champsManuels[ch.cle] = String(el.value).trim();
      }
    }else if(ch.type === 'inspecteur' || ch.type === 'repassage'){
      const el = document.getElementById('man_' + ch.cle);
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
        const grave = d.dataset ? (d.dataset.grave === 'oui') : false;
        if(vi || vr){
          obs.push({ inspecteur: vi, reponse: vr, categorie: cat,
                     grave: grave });
        }
      });
      champsManuels[ch.cle] = obs;
    }else if(ch.type !== 'ok' && ch.type !== 'photo' &&
             ch.type !== 'niveau' && ch.type !== 'ouinon'){
      const t = document.getElementById('man_' + ch.cle.replace('.', '_'));
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
  }

  /* Mise à jour des infos, comme à la fin d'un cours enregistré.

     Sauf pour l'examen officiel : rien à préparer pour la suite,
     elle se décide au rendez-vous post-permis. */
  const maj = ($('modele').value === 'examen-officiel')
    ? null
    : await ouvrirQuestionnaireDepart(repris, 'Après ce cours', 'Terminer');

  if(maj){
    contexteDepart = maj;
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
    const [pere, fils] = k.split('.');
    if(!donnees[pere]) donnees[pere] = {};
    donnees[pere][fils] = champsManuels[k];
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

    if(!adresse){ showToast('Aucune adresse dans sa fiche.'); return; }

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

  const ban = $('repriseBanner');
  if(ban) ban.style.display = 'none';

  /* La fiche se dessine, puis on y repose les saisies */
  ouvrirBilanManuel().then(() => {
    const n = replacerSaisiesManuelles(b.saisies);
    showToast(n ? 'Bilan retrouvé — ' + n + ' réponse(s) ✅'
                : 'Bilan rouvert ✅');
  }).catch(() => {});
}


function fermerBilanManuel(){
  modeManuel = false;
  $('manuelView').style.display = 'none';
  $('recordView').style.display = 'block';
  if(typeof afficherVue === 'function') afficherVue('cours', 'cours');
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
