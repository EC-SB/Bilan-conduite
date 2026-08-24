/* Déployé le 24/08/2026 à 07:55 — v516 */
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
    { cle:'examen.installation', type:'texte', lignes:7,
      nom:'2-1 · Installation',
      aide:'Efface l\'émoji qui ne convient pas, et la remarque si elle ne sert pas.',
      defaut:'𝟮-𝟭. 𝗜𝗻𝘀𝘁𝗮𝗹𝗹𝗮𝘁𝗶𝗼𝗻 ✅❌\n' +
             '❌ Tu as oublié de dire : "c\'est moi qui ai emmené le véhicule, ' +
             'j\'ai déjà fait mes réglages"\n' +
             '𝙋𝙖𝙨𝙨𝙖𝙜𝙚𝙧 ✅❌\n' +
             '𝙑𝙤𝙮𝙖𝙣𝙩𝙨 ✅❌\n' +
             '𝙉𝙤𝙩𝙚 :  /2' },

    { cle:'examen.verifications', type:'texte', lignes:5,
      nom:'2-2 · Vérifications',
      aide:'Complète le numéro de question.',
      defaut:'𝟮-𝟮. 𝗩𝗲́𝗿𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻𝘀 : 𝗾𝘂𝗲𝘀𝘁𝗶𝗼𝗻 𝗻° \n' +
             '𝙉𝙤𝙩𝙚 :  /3\n' +
             'https://www.facebook.com/groups/864826058258637' },

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
    { cle:'bilanErreurs',type:'texte', lignes:22, nom:'3 · Bilan erreurs',
      aide:"Les repères sont posés : écris l'erreur au bout du 👉 et ta réponse " +
           'au bout de chaque ligne.',
      defaut:('👉 \n' +
              "- qu'en penses-tu ?\n" +
              '- quelles sont TES solutions ?\n' +
              '- ce que je te PROPOSE : \n\n').repeat(5).trim() },

    { cle:'__t4', type:'titre', nom:'𝟰 - 𝗡𝗜𝗩𝗘𝗔𝗨 𝗣𝗘𝗥𝗠𝗜𝗦' },
    { cle:'niveau',      type:'niveau', nom:'4 · Niveau permis ?' },
    { cle:'heuresAvant', type:'court',  nom:"4 · Combien d'heures avant permis" },
    { cle:'friseAvant',  type:'ouinon', nom:'4 · Frise respectée avant examen blanc' },
    { cle:'friseAvantH', type:'court',  nom:'4 · Si non, heures en plus' },
    { cle:'frisePost',   type:'ouinon', nom:'4 · Frise respectée post permis' },
    { cle:'frisePostH',  type:'court',  nom:'4 · Si non, heures en plus' },
    { cle:'aDate',       type:'ouinon', nom:'4 · A déjà sa date de permis' },
    { cle:'heuresPlanifiees', type:'ok', nom:'4 · Heures avant permis planifiées', defaut:'' },
    { cle:'heuresPosees',     type:'ok', nom:'4 · Heures posées (2×2h + 1×1h)', defaut:'' }
  ],
  examen: [
    /* Le trajet jusqu'au centre : la partie « avant examen » du bilan.
       Sans ces champs, elle sortait vide en saisie manuelle. */
    { cle:'avantExamen.installation', type:'ok', nom:'AVANT — Installation', defaut:'' },
    { cle:'avantExamen.passager',     type:'ok', nom:'AVANT — Passager',     defaut:'' },
    { cle:'avantExamen.voyants',      type:'ok', nom:'AVANT — Voyants',      defaut:'' },
    { cle:'avantExamen.erreurs',      type:'texte', lignes:5,
      nom:'AVANT — Erreurs à ne pas refaire (trajet vers le centre)' },

    { cle:'installation',type:'ok',    nom:'EXAMEN — Installation', defaut:'' },
    { cle:'passager',    type:'ok',    nom:'EXAMEN — Passager',     defaut:'' },
    { cle:'voyants',     type:'ok',    nom:'EXAMEN — Voyants',      defaut:'' },
    { cle:'verifQuestion', type:'court', nom:'N° de la question de vérification' },
    { cle:'vi',          type:'ok',    nom:'Vérification', defaut:'' },
    { cle:'qser',        type:'ok',    nom:'Question sécurité routière', defaut:'' },
    { cle:'secours',     type:'ok',    nom:'Premiers secours', defaut:'' },
    { cle:'observations',type:'observations', nom:'Observations de l\'inspecteur' }
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

  if(bouton.dataset.actif === 'oui'){
    if(bouton._sr) try{ bouton._sr.stop(); }catch(e){}
    return;
  }

  const sr = new SR();
  sr.lang = 'fr-FR';
  sr.continuous = true;
  sr.interimResults = false;
  sr.maxAlternatives = 3;

  const depart = champ.value;
  let ajoute = '';

  sr.onresult = ev => {
    for(let i = ev.resultIndex; i < ev.results.length; i++){
      if(!ev.results[i].isFinal) continue;
      let meilleur = ev.results[i][0].transcript;
      let score = -1;
      for(let k = 0; k < ev.results[i].length; k++){
        const s = scoreMetier(ev.results[i][k].transcript);
        if(s > score){ score = s; meilleur = ev.results[i][k].transcript; }
      }
      ajoute += (ajoute ? ' ' : '') + corrigerVocabulaire(meilleur.trim());
    }
    champ.value = (depart ? depart + (depart.endsWith('\n') ? '' : ' ') : '') +
                  terminerPhrase(ajoute);
    champ.scrollTop = champ.scrollHeight;
  };
  sr.onerror = e => { if(e.error !== 'no-speech') showToast('Dictée : ' + e.error); };
  sr.onend = () => {
    bouton.dataset.actif = '';
    bouton.textContent = '🎙️';
    bouton.style.background = '';
    bouton._sr = null;
  };

  bouton._sr = sr;
  bouton.dataset.actif = 'oui';
  bouton.textContent = '⏹️';
  bouton.style.background = 'var(--red)';
  try{ sr.start(); }catch(e){ showToast('Dictée indisponible.'); sr.onend(); }
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

  const modeleCle = $('modele').value;
  const modele = MODELES[modeleCle];

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

  /* Le questionnaire alimente la note interne, comme pour un cours enregistré */
  if(!contexteDepart){
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

  btn.disabled = false;
  btn.textContent = '✍️ Bilan à remplir à la main';

  champsManuels = {};
  modeManuel = true;

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

    if(ch.type === 'niveau' || ch.type === 'ouinon'){
      bloc.style.cssText = 'margin-bottom:8px;display:flex;gap:10px;' +
        'align-items:center;flex-wrap:wrap;';
      const l = document.createElement('label');
      l.textContent = ch.nom;
      l.style.cssText = 'flex:1;min-width:140px;margin:0;font-size:14px;' +
        'text-transform:none;color:var(--cream);';
      bloc.appendChild(l);
      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:5px;flex-shrink:0;';
      const choix = (ch.type === 'niveau')
        ? [['✅ Oui', 'oui'], ['❌ Pas le niveau', 'non'], ['—', '']]
        : [['✅ Oui', 'oui'], ['❌ Non', 'non'], ['—', '']];
      choix.forEach(([lab, val]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'flex:1;padding:11px;font-size:14px;margin:0;';
        b.textContent = lab;
        b.addEventListener('click', () => {
          champsManuels[ch.cle] = val;

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
        r.appendChild(b);
      });
      bloc.appendChild(r);

    }else if(ch.type === 'ok'){
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

function ajouterObservationManuelle(zone){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px;';

  const insp = document.createElement('input');
  insp.type = 'text';
  insp.className = 'obsInsp';
  insp.placeholder = "Remarque de l'inspecteur";
  insp.style.marginBottom = '6px';
  d.appendChild(insp);

  /* L'explication, avec de quoi marquer une erreur éliminatoire */
  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:6px;align-items:center;';

  const rep = document.createElement('input');
  rep.type = 'text';
  rep.className = 'obsRep';
  rep.placeholder = 'Explication ou correction';
  rep.style.cssText = 'flex:1;min-width:0;margin:0;';
  r.appendChild(rep);

  const bMort = document.createElement('button');
  bMort.type = 'button';
  bMort.className = 'btn btn-secondary';
  bMort.style.cssText = 'width:auto;padding:10px 13px;font-size:17px;margin:0;flex-shrink:0;';
  bMort.textContent = '☠️';
  bMort.title = 'Marquer comme erreur éliminatoire';
  bMort.addEventListener('click', () => {
    const v = rep.value;
    if(v.indexOf('☠️') !== -1){
      /* Deuxième appui : on retire la marque */
      rep.value = v.split('☠️').join('').replace(/\s+/g, ' ').trim();
      bMort.style.borderColor = 'var(--line)';
    }else{
      rep.value = ('☠️ ' + v).trim();
      bMort.style.borderColor = 'var(--red)';
    }
    rep.focus();
  });
  r.appendChild(bMort);

  d.appendChild(r);
  zone.appendChild(d);
}


/* Relève tout ce que le moniteur a saisi dans le formulaire */
/* ============================================================
   LE BILAN MANUEL, GARDÉ EN COURS DE ROUTE

   Le vocal se sauvegarde à chaque phrase ; le manuel ne l'était
   qu'une fois terminé. Une coupure au milieu d'un examen officiel
   faisait tout perdre.
   ============================================================ */

let minuteurManuel = null;

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

  try{
    localStorage.setItem('bilan_manuel_en_cours', JSON.stringify({
      ts: Date.now(),
      modele: $('modele').value,
      moniteur: $('monitorName').value,
      eleve: $('studentName').value,
      site: $('site').value,
      date: $('lessonDate').value,
      note: $('noteInterne') ? $('noteInterne').value : '',
      saisies: saisies
    }));
  }catch(e){ /* stockage plein : on continue sans */ }
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
    if(ch.type === 'manoeuvres'){
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
        if(vi || vr) obs.push({ inspecteur: vi, reponse: vr });
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

  const modeleCle = $('modele').value;
  const modele = MODELES[modeleCle];

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

  /* Mise à jour des infos, comme à la fin d'un cours enregistré */
  const maj = await ouvrirQuestionnaireDepart(repris, 'Après ce cours', 'Terminer');
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
  effacerBrouillonManuel();
}

/* Rouvre un bilan manuel interrompu */
function reprendreBilanManuel(){
  const b = brouillonManuel();
  if(!b) return;

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
