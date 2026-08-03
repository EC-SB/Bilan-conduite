/* ============================================================
   ec-consignes.js
   Consignes données à l'IA pour produire un bilan
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   CONSIGNES IA — sortie JSON uniquement
   L'IA ne rédige QUE les cases variables. Aucun texte fixe,
   aucun lien : tout cela est ajouté ensuite par l'application.
   ============================================================ */

const REGLES_COMMUNES =
'Tu analyses la transcription automatique (imparfaite, orale, décousue) d\'un cours de conduite enregistré dans la voiture d\'une auto-école française.\n' +
'\n' +
'RÈGLES ABSOLUES :\n' +
'- Tu réponds UNIQUEMENT avec un objet JSON valide. Aucun texte avant, aucun texte après, pas de balises markdown, pas de ```.\n' +
'- ATTENTION JSON : les retours à la ligne à l\'intérieur des chaînes doivent utiliser la séquence d\'échappement JSON standard. ' +
'Ils doivent être interprétés comme de vrais retours à la ligne quand la chaîne est lue, et NON apparaître ' +
'tels quels dans le texte lu par l\'élève. Les guillemets internes doivent aussi être échappés.\n' +
'- Tu n\'inventes RIEN. Si un sujet n\'a pas été abordé dans la transcription, tu laisses la chaîne vide "" (ou tu omets l\'élément). Une case vide est BIEN meilleure qu\'une case inventée.\n' +
'- Tu n\'écris aucun lien internet, aucune procédure pédagogique générale, aucun rappel de règles : uniquement ce que le moniteur a réellement observé chez cet élève pendant CE cours.\n' +
'- Tu tutoies l\'élève, ton chaleureux et direct, comme un moniteur qui parle à son élève.\n' +
'- Sois concis : 1 à 2 phrases par case maximum. Formulations courtes, concrètes, actionnables.\n' +
'- Corrige les erreurs de transcription évidentes (vocabulaire auto-école : giratoire, créneau, embrayage, angle mort, PAD, VA/VD, MALD...).\n' +
'- La transcription contient la voix du moniteur ET de l\'élève. Ce qui compte, ce sont les remarques et corrections du moniteur.\n';

const RUB_DESC =
'  "manipulation" : manipulation des commandes (embrayage, vitesses, pédales, volant côté commandes)\n' +
'  "trajectoire" : placement dans la voie, virages, écarts de trajectoire\n' +
'  "giratoires" : carrefours à sens giratoire (placement, clignotants, allure)\n' +
'  "vavd" : voie d\'accélération / voie de décélération (4 voies)\n' +
'  "pad" : priorité à droite\n' +
'  "allures" : vitesse, adaptation de l\'allure\n' +
'  "controles" : rétroviseurs, angles morts, clignotants\n' +
'  "divers" : tout le reste (attitude, autonomie, points théoriques abordés)\n' +
'  "manoeuvres" : manœuvres travaillées (créneau, bataille, épi, demi-tour...)\n';

const SCHEMAS = {

  conduiteResume: () => REGLES_COMMUNES + '\nRenvoie exactement cette structure JSON :\n{\n' +
  '  "carteSD": "✅" ou "❌",\n' +
  '  "installation": "✅" ou "❌",\n' +
  '  "passager": "✅" ou "❌",\n' +
  '  "voyants": "✅" ou "❌",\n' +
  '  "resume": "le résumé des erreurs regroupées et de ce qui est à travailler",\n' +
  '  "manoeuvres": ["libellé exact des manœuvres réellement pratiquées"],\n' +
  '  "groupesTravail": "✅" ou "❌" ou "",\n' +
  '  "ecoutes": "✅" ou "❌" ou ""\n}\n\n' +
  'IMPORTANT : ne recopie PAS la transcription dans ta réponse. Elle est déjà en possession de l\'application, ' +
  'qui l\'insérera elle-même dans le bilan, intégralement. Tu ne produis que le résumé et les informations listées ci-dessus.\n\n' +
  'Si le moniteur demande explicitement une explication dans le cours (par exemple « explique la règle de... »), ' +
  'intègre cette explication à la fin du résumé.\n\n' +
  '"resume" : c\'est le cœur du bilan. Tu retiens TROIS types de contenu, sans en oublier aucun :\n' +
  '  1. les ERREURS commises par l\'élève et corrigées par le moniteur ;\n' +
  '  2. les CONSEILS et mises en garde du moniteur, même quand l\'élève n\'a rien fait de mal ' +
  '(pièges de la route, feux particuliers, comportements à adopter, points de vigilance, repères) ;\n' +
  '  3. les EXPLICATIONS techniques ou théoriques données pendant le cours (procédures, règles, méthodes de manœuvre).\n' +
  'Un conseil donné sans erreur associée a autant de valeur qu\'une correction : l\'élève doit le retrouver dans son bilan. ' +
  'Exemple : si le moniteur signale qu\'un feu passe au rouge en même temps que le bonhomme piéton, c\'est un conseil à conserver ' +
  'même si l\'élève n\'a commis aucune faute à cet endroit.\n' +
  'RANGEMENT IMPOSÉ — tu utilises ces rubriques, dans cet ordre, et tu ne gardes que celles qui ont de la matière :\n' +
  '  👀 Contrôles / 🚦 Priorités et feux / 👀 Trajectoire / 🍩 Giratoires / 🏎️ Allures / ' +
  '🚙 Manœuvres / 🧠 Points de vigilance / 📚 Explication demandée / ➡️ À travailler la prochaine fois\n' +
  'Chaque rubrique commence par son titre sur sa propre ligne, suivi de puces « • » courtes. ' +
  'Une information ne doit apparaître que dans UNE seule rubrique, jamais répétée ailleurs. ' +
  'Tutoie l\'élève, reste encourageant, va à l\'essentiel.\n' +
  'N\'invente rien : tout ce que tu écris doit venir de ce qui a été réellement dit.\n\n' +
  'RUBRIQUE « 📚 Explication demandée » : uniquement si le moniteur a demandé une explication pendant le cours. ' +
  'Tu dois alors donner la règle EXACTE du code de la route français, sans te tromper. ' +
  'Règle de la priorité à droite, telle qu\'elle est enseignée dans cette auto-école — à reprendre fidèlement :\n' +
  '  • À une intersection sans signalisation, en allant TOUT DROIT : tu laisses passer les véhicules venant de ta DROITE, ' +
  'ainsi que les piétons qui traversent.\n' +
  '  • En tournant À GAUCHE : tu laisses passer les véhicules venant de ta DROITE, les piétons, ' +
  'ET les véhicules venant EN FACE — non pas parce qu\'ils auraient une priorité en tant que telle, ' +
  'mais parce que ton virage coupe leur trajectoire : tu ne peux pas t\'engager tant qu\'ils arrivent.\n' +
  '  • En tournant à droite : tu laisses passer les véhicules venant de ta droite et les piétons.\n' +
  'Si tu n\'es pas certain d\'une règle, formule-la prudemment plutôt que d\'affirmer une erreur.\n\n' +
  '"manoeuvres" : uniquement celles RÉELLEMENT PRATIQUÉES pendant ce cours, c\'est-à-dire ' +
  'celles que le moniteur annonce puis guide (« on va faire un créneau à droite », « on va aller faire une bataille »). ' +
  'Une manœuvre seulement citée, évoquée en exemple, ou dont le nom apparaît dans une phrase peu claire, ne compte PAS. ' +
  'En cas de doute, ne la mets pas : un oubli se rattrape au cours suivant, une manœuvre cochée à tort fausse durablement le suivi. ' +
  'Le champ "nom" doit reprendre exactement l\'un de ces libellés : ' +
  'MALD Marche arrière en ligne droite, 1/2 tour, MAR (marche arrière en angle de rue), Arrêt de précision, ' +
  'CD Créneau droit, CG Créneau gauche, BD Bataille droit, BG Bataille Gauche, BAD bataille avant droit, ' +
  'BAG bataille avant gauche, Epi, Utilisation Radio, Utilisation téléphone, Faire peur, Parking avec ticket, ' +
  'GPS, Régulateur, va où tu veux fais ce que tu veux, Ouverture du capot. Tableau vide si aucune manœuvre.\n\n' +
  '"groupesTravail" : "❌" si le moniteur signale que l\'élève ne travaille pas ses groupes, "✅" s\'il confirme qu\'il les travaille, "" si le sujet n\'est pas évoqué.\n' +
  '"ecoutes" : "❌" si le moniteur signale un manque d\'écoutes pédagogiques, "✅" si c\'est en ordre, "" si non évoqué.\n',

  conduite: opts => {
    const o = opts || {};
    let s = REGLES_COMMUNES + '\nRenvoie exactement cette structure JSON :\n{\n' +
    '  "carteSD": "✅" ou "❌" ou "",\n' +
    '  "installation": "✅" ou "❌" ou "",\n' +
    '  "passager": "✅" ou "❌" ou "",\n' +
    '  "voyants": "✅" ou "❌" ou "",\n';
    s += '  "rubriques": {\n' +
    '    "manipulation": "", "trajectoire": "", "giratoires": "", "vavd": "",\n' +
    '    "pad": "", "allures": "", "controles": "", "divers": "", "manoeuvres": ""\n' +
    '  }';
    if(o.fiche){
      s += ',\n  "ficheVehicule": [ { "nom": "nom exact de l\'exercice", "retour": "retour très bref" } ]';
    }
    s += '\n}\n\nDétail des rubriques :\n' + RUB_DESC;
    s += '\nPour les 4 statuts (carteSD, installation, passager, voyants) : "✅" si c\'est en ordre ou acquis, "❌" si un problème a été signalé, "" si le sujet n\'a pas été évoqué du tout.\n';
    if(o.fiche){
      s += '\nPour "ficheVehicule" : liste UNIQUEMENT les exercices réellement pratiqués pendant ce cours. Le champ "nom" doit reprendre exactement l\'un de ces libellés : MALD, 1/2 tour, MAR (angle de rue), Arrêt de précision, CD, CG, BD, BG, BAD bataille avant droit, BAG bataille avant gauche, Epi, Utilisation Radio, Utilisation téléphone, Faire peur, Parking avec ticket, GPS, Régulateur, va où tu veux fais ce que tu veux, Ouverture du capot. Si aucun exercice n\'a été pratiqué, renvoie un tableau vide [].\n';
    }
    return s;
  },

  accompagnateur: () => REGLES_COMMUNES.replace(
    '- Tu tutoies l\'élève, ton chaleureux et direct, comme un moniteur qui parle à son élève.',
    '- ATTENTION : ce bilan s\'adresse à l\'ACCOMPAGNATEUR (le parent/adulte qui accompagnera l\'apprenti conducteur), PAS à un élève. Tu VOUVOIES la personne. Ton respectueux et professionnel.'
  ) + '\nRenvoie exactement cette structure JSON :\n{\n' +
  '  "carteSD": "✅" ou "❌" ou "",\n' +
  '  "installation": "✅" ou "❌" ou "",\n' +
  '  "rubriques": {\n' +
  '    "manipulation": "", "trajectoire": "", "giratoires": "", "vavd": "",\n' +
  '    "pad": "", "allures": "", "controles": "", "divers": "", "manoeuvres": ""\n' +
  '  }\n}\n\nDétail des rubriques :\n' + RUB_DESC +
  '\nL\'objectif de ce bilan est de faire prendre conscience à l\'accompagnateur de ses propres défauts de conduite, pour qu\'il ne les transmette pas à l\'apprenti conducteur.\n',

  rvp: () => REGLES_COMMUNES + '\nRenvoie exactement cette structure JSON :\n{\n' +
  '  "carteSD": "✅" ou "❌" ou "",\n' +
  '  "installation": "✅" ou "❌" ou "",\n' +
  '  "passager": "✅" ou "❌" ou "",\n' +
  '  "voyants": "✅" ou "❌" ou "",\n' +
  '  "rubriques": {\n' +
  '    "manipulation": "", "trajectoire": "", "giratoires": "", "vavd": "",\n' +
  '    "pad": "", "allures": "", "controles": "", "divers": "", "manoeuvres": ""\n' +
  '  },\n' +
  '  "reflexions": ["remarque de l\'inspecteur ou explication du moniteur, une par entrée"],\n' +
  '  "bilanErreurs": [ { "erreur": "l\'erreur constatée", "penses": "", "solutions": "", "propose": "la solution proposée par le moniteur" } ]\n}\n\n' +
  'Détail des rubriques :\n' + RUB_DESC +
  '\n"reflexions" : uniquement si la transcription contient un débriefing type examen (remarques d\'inspecteur, explications du moniteur point par point). Sinon renvoie [].\n' +
  '"bilanErreurs" : les erreurs principales reprises en fin de cours sous forme de dialogue. Laisse "penses" et "solutions" vides (ce sont les réponses de l\'élève, à remplir de vive voix). Maximum 5 entrées. Si pas de débriefing structuré, renvoie [].\n',

  simu: comps => {
    const liste = comps.map(c => '    "' + c.cle + '"').join(',\n');
    return REGLES_COMMUNES +
    '\nIl s\'agit d\'un cours sur SIMULATEUR avec moniteur. Chaque compétence reçoit un statut et une liste d\'erreurs.\n' +
    '\nRenvoie exactement cette structure JSON :\n{\n' +
    '  "competences": {\n' +
    comps.map(c => '    "' + c.cle + '": { "statut": "✅" ou "❌" ou "🟠", "erreurs": ["erreur brève et actionnable"] }').join(',\n') + '\n' +
    '  },\n' +
    '  "prochainCours": ["ce qui sera travaillé au prochain cours"]\n}\n\n' +
    'Statuts : "✅" = acquis, "❌" = non acquis, "🟠" = en cours d\'acquisition. Si la compétence n\'a pas été travaillée pendant ce cours, mets "" (chaîne vide) et une liste d\'erreurs vide.\n' +
    '"erreurs" : maximum 3 par compétence, formulées comme une consigne courte adressée à l\'élève. Tableau vide si rien à signaler.\n' +
    '"prochainCours" : maximum 3 éléments, uniquement si le moniteur annonce explicitement le programme du prochain cours. Sinon [].\n';
  },

  eval: () => REGLES_COMMUNES +
  '\nIl s\'agit d\'une ÉVALUATION DE DÉPART (premier contact, estimation du niveau).\n' +
  '\nRenvoie exactement cette structure JSON :\n{\n' +
  '  "passif": "expérience de conduite antérieure de l\'élève (quad, tracteur, scooter, conduite à l\'étranger, cours dans une autre auto-école...)",\n' +
  '  "installation": "défauts d\'installation constatés",\n' +
  '  "rubriques": {\n' +
  '    "manipulation": { "statut": "✅" ou "❌" ou "🍊", "commentaire": "" },\n' +
  '    "trajectoire": { "statut": "", "commentaire": "" },\n' +
  '    "giratoires": { "statut": "", "commentaire": "" },\n' +
  '    "vavd": { "statut": "", "commentaire": "" },\n' +
  '    "manoeuvres": { "statut": "", "commentaire": "" },\n' +
  '    "pad": { "statut": "", "commentaire": "" },\n' +
  '    "allures": { "statut": "", "commentaire": "" },\n' +
  '    "controles": { "statut": "", "commentaire": "" }\n' +
  '  }\n}\n\n' +
  'Statuts : "✅" = acquis, "❌" = non acquis, "🍊" = en cours. Si non évalué pendant la séance, mets "".\n' +
  '"passif" : uniquement ce que l\'élève a déclaré. Si rien n\'a été dit, chaîne vide.\n' +
  'IMPORTANT : n\'estime AUCUN nombre d\'heures de formation. C\'est une décision du moniteur, jamais la tienne.\n',

  examen: () => REGLES_COMMUNES +
  '\nIl s\'agit du débriefing d\'un EXAMEN OFFICIEL du permis de conduire.\n' +
  '\nRenvoie exactement cette structure JSON :\n{\n' +
  '  "avantExamen": {\n' +
  '    "installation": "✅" ou "❌" ou "", "passager": "✅" ou "❌" ou "", "voyants": "✅" ou "❌" ou "",\n' +
  '    "erreurs": "erreurs constatées avant l\'examen, à ne pas refaire"\n' +
  '  },\n' +
  '  "examen": {\n' +
  '    "installation": "✅" ou "❌" ou "", "passager": "", "voyants": "",\n' +
  '    "verifQuestion": "numéro de la question de vérification si mentionné",\n' +
  '    "vi": "✅" ou "❌" ou "", "qser": "✅" ou "❌" ou "", "secours": "✅" ou "❌" ou ""\n' +
  '  },\n' +
  '  "observations": [ { "inspecteur": "remarque/observation faite pendant l\'examen", "reponse": "explication ou correction apportée" } ]\n}\n\n' +
  '"observations" : chaque point relevé pendant l\'épreuve. "inspecteur" = le constat, "reponse" = l\'explication ou la correction. Si un des deux manque, laisse-le vide.\n' +
  'IMPORTANT : n\'invente AUCUNE note chiffrée et n\'annonce AUCUN résultat d\'examen. Les notes sont saisies par le moniteur.\n'
};

/* La conduite en boîte automatique a sa propre structure, pour que
   son formulaire et ses consignes puissent différer de la boîte manuelle.
   Au départ, les deux sont identiques. */
SCHEMAS.conduiteResumeAuto = SCHEMAS.conduiteResume;

function construireConsignes(modeleCle){
  const m = MODELES[modeleCle];
  if(!m) throw new Error('Modèle inconnu : ' + modeleCle);

  /* Des consignes réécrites par l auto-école remplacent celles d origine */
  if(typeof consignesPersonnalisees === 'function'){
    const perso = consignesPersonnalisees(m.schema);
    if(perso) return perso;
  }

  const f = SCHEMAS[m.schema];
  if(!f) throw new Error('Schéma inconnu : ' + m.schema);
  if(m.schema === 'conduite') return f(m.opts);
  if(m.schema === 'simu') return f(m.comps);
  return f();
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-consignes.js'] = true;
