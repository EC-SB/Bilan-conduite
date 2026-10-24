/* Déployé le 24/10/2026 à 10:48 — v1258 */
/* ============================================================
   ec-nouveautes.js
   Ce que l'outil vient de changer, dit à ceux qui s'en servent.

   David, le 12 septembre 2026 : il voulait annoncer cinq
   nouveautés — le bouton CB, la refonte de l'onglet Cours, le trait
   de couleur, le rail, les examens — dans un message épinglé. Le
   message est plafonné à quatre cents caractères, et lever le
   plafond ne réglait rien : le cadre d'un message important écrit
   en 20 px gras sur fond rouge, et mille caractères là-dedans font
   un pavé que personne ne lit jusqu'au bout.

   ⚠️ UN MESSAGE ET UNE NOTE DE VERSION NE SONT PAS LA MÊME CHOSE.

   Un message, c'est David qui parle à l'équipe — « pensez à rendre
   les clés du 208 ». Il dit UNE chose, il attend parfois une
   réponse, et il vit dans le classeur parce qu'il est écrit à la
   main. Une note de version, c'est l'OUTIL qui dit ce qu'il vient
   de changer : elle en dit cinq, elle n'attend rien de personne, et
   elle décrit une version précise.

   Deux objets, deux endroits. Le message épinglé ne bouge pas, son
   plafond non plus — il est juste, pour ce qu'un message doit être.

   ⚠️ ET LES NOTES VIVENT DANS LE CODE, PAS DANS LE CLASSEUR.

   Une note décrit ce qu'une version fait : elle voyage donc AVEC
   elle. Rien à écrire à la main, rien à administrer, aucune feuille
   ni colonne de plus — et surtout aucun écart possible entre ce qui
   est annoncé et ce qui a changé. Mettre l'outil à jour, c'est
   publier la note.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   LES NOTES — LA PLUS RÉCENTE EN PREMIER

   Une entrée par version QUI A QUELQUE CHOSE À DIRE AUX MONITEURS.
   On livre parfois trois fois dans la journée : une note par
   livraison ferait du bandeau un décor, et c'est exactement ce
   qu'on veut éviter.

   · version — le numéro, et il ne sert qu'à savoir si elle a été
     lue. Il n'est jamais montré : « v974 » ne dit rien à personne.
   · date    — en toutes lettres, c'est le sous-titre de l'écran.
   · resume  — une ligne, c'est le sous-titre de la ligne du bandeau.
   · quoi    — les changements, un par un : un emoji, ce que c'est,
     et comment ça se comporte.
   ============================================================ */
const NOUVEAUTES = [
  {
    version: 1258,
    date: 'Samedi 24 octobre 2026',
    resume: '🎯 La phrase verte ne dit plus « leçon de veille » quatre jours trop tôt',
    quoi: [
      { emoji: '🎯',
        titre: 'Une réserve dépassée n’est pas la veille',
        texte: 'Quand les heures avant l’examen sont dépassées de plus d’une leçon, la phrase verte dit « Plus que les 3h avant examen » au lieu de « C’est la leçon de veille ». La veille reste dite pour le dernier cours prévu dans les 3 jours avant l’examen, ou pour la leçon juste après la réserve — comme la tuile du dossier.' }
    ]
  },
  {
    version: 1257,
    date: 'Samedi 24 octobre 2026',
    resume: '📘 Le guide refait pour la v1257, et cinq petites erreurs corrigées',
    quoi: [
      { emoji: '📘',
        titre: 'Le guide d’utilisation est à jour',
        texte: 'Menu ⋯ › Guide : douze chapitres, dont trois nouveaux — le parcours et l’espace élève, les vérifications et leur jeu, Drivup et le favori 📥.' },
      { emoji: '📝',
        titre: 'Un examen blanc prévu n’est plus « passé »',
        texte: '« Fixer la date », « ➕ Prévoir un examen blanc », « Changer la date » et « 📅 Planifier » (CS et dossier) écrivent maintenant la date prévue : « Sa route » ne dit plus « passé le » une date à venir. Et un examen blanc planifié depuis la CS ou le dossier est enfin relu comme prévu dans les listes.' },
      { emoji: '🧹',
        titre: 'Des libellés remis d’aplomb',
        texte: '« Ajouter une date » : le bouton dit « 📌 Enregistrer » ou « 📅 Enregistrer la date » selon la situation. L’aide des alertes envoie vers Gestion › ⚙️ Accès.' }
    ]
  },
  {
    version: 1256,
    date: 'Vendredi 23 octobre 2026',
    resume: '👀 Montrer son espace à un élève · 🎮 jouer au jeu des vérifications de notre côté',
    quoi: [
      { emoji: '👀',
        titre: 'Ouvrir l’espace d’un élève pour le lui montrer',
        texte: 'Dans son dossier, onglet 🔑 Coin révisions : « 👀 Ouvrir son espace pour le lui montrer ». Son espace s’ouvre dans un nouvel onglet, comme il le voit, sans taper son code. C’est une démonstration : rien ne part ni ne s’enregistre à son nom (ni message, ni récitation, ni progression, ni dernière visite). « ✕ Terminer » la ferme ; elle s’arrête seule au bout de deux heures. Chaque ouverture est notée au journal.' },
      { emoji: '🎮',
        titre: 'Outils › Vérifications › 🎮 Jouer (essai)',
        texte: 'Le vrai jeu, dans un téléphone, avec nos voitures et leurs photos, pour le tester. Rien n’est gardé : « ↺ Recommencer à zéro » ou rouvrir l’onglet repart de zéro.' }
    ]
  },
  {
    version: 1255,
    date: 'Vendredi 23 octobre 2026',
    resume: '💡 Jeu des vérifications : allumer les feux, puis faire le tour',
    quoi: [
      { emoji: '💡',
        titre: 'L’élève allume lui-même les feux',
        texte: 'Au volant de SA voiture, il touche la bonne commande le bon nombre de fois (la bague : deux crans), puis une autre si besoin, et dit « C’est allumé ». Un appui de trop ou la mauvaise commande : on lui dit ce qu’il a fait, tout s’éteint, et la question part dans « À revoir ».' },
      { emoji: '🚶',
        titre: 'Puis il fait le tour de la voiture',
        texte: 'Il sort par la porte et touche les feux allumés sur la vraie photo, devant et derrière.' },
      { emoji: '📸',
        titre: 'Dans l’atelier (Outils › Vérifications)',
        texte: 'Pour chaque vue, « 💡 Les feux sur cette photo » accueille la photo avec tel feu allumé ; une nouvelle sorte de zone, 🔘 « commande » ; le panneau « 💡 Allumer les feux » (quelles commandes, combien d’appuis, pour quelles voitures) ; et la règle « L’allumer, puis contrôler » question par question.' }
    ]
  },
  {
    version: 1254,
    date: 'Vendredi 23 octobre 2026',
    resume: '📱 Vidéos au téléphone : plein écran entier, sous-titres à leur taille',
    quoi: [
      { emoji: '🖥️',
        titre: 'Le plein écran montre toute la vidéo',
        texte: 'Debout ou couché, la vidéo prend la plus grande taille qui tient dans l’écran du téléphone, sans rien couper.' },
      { emoji: '💬',
        titre: 'Des sous-titres qui ne cachent plus l’image',
        texte: 'Deux lignes au plus (une longue phrase se découpe et défile), une taille bornée même en plein écran, et toujours au-dessus du copyright.' }
    ]
  },
  {
    version: 1253,
    date: 'Vendredi 23 octobre 2026',
    resume: '🙈 Le flou, 💬 les sous-titres, 🎞️ le vrai fichier MP4',
    quoi: [
      { emoji: '🙈',
        titre: 'Flouter une plaque ou un visage',
        texte: 'Onglet « 🙈 Flou » de l’éditeur : un rectangle ou un rond, que tu poses sur l’image. Si ça bouge, redéplace-le à chaque changement de direction : chaque place devient un point de passage, et entre deux la zone glisse toute seule.' },
      { emoji: '🎞️',
        titre: 'Une vidéo floutée se fabrique',
        texte: 'Sur l’ordinateur du bureau (Chrome ou Edge) : la vidéo est refaite avec tout son montage dans l’image, le flou compris. La vidéo d’origine est effacée à l’enregistrement du guide : la plaque n’existe plus nulle part.' },
      { emoji: '💬',
        titre: 'Les sous-titres automatiques',
        texte: 'Onglet « 💬 Sous-titres » : la reconnaissance vocale écrit ce qui est dit, avec les temps. Tu relis, tu corriges, tu réécoutes une phrase (▶). Chez l’élève, le bouton « CC » les affiche.' },
      { emoji: '📥',
        titre: 'Télécharger en MP4',
        texte: 'Sur une vidéo montée, « 🎞️ Télécharger en MP4 » fabrique le vrai fichier (H.264, que tous les téléphones lisent), sous-titres incrustés : pour Messenger ou un envoi.' }
    ]
  },
  {
    version: 1252,
    date: 'Vendredi 23 octobre 2026',
    resume: '🎬 Monter une vidéo de guide sans logiciel de montage',
    quoi: [
      { emoji: '🎬',
        titre: 'Un éditeur avant le dépôt',
        texte: 'Dans un bloc « 🎬 Vidéo » d’un guide, choisir la vidéo ouvre l’éditeur : ton squelette se monte tout seul autour (avertissement, titre, copyright, roue, générique). Coupe le début, la fin ou un passage au milieu, puis « 💾 Enregistrer le montage » — ou « Déposer sans montage ».' },
      { emoji: '🏷️',
        titre: 'Textes, polices, couleurs',
        texte: 'Des textes posés sur l’image au moment voulu, que tu fais glisser (ou flèches du clavier) ; 6 polices, 4 tailles, 6 couleurs et 🎨 la tienne, 4 fonds. Le copyright se place à 6 endroits, dont en bas au milieu.' },
      { emoji: '🔊',
        titre: 'Le son, et plusieurs vidéos',
        texte: 'Couper le son d’un passage, ajouter une musique (libre de droits), mettre jusqu’à 4 vidéos bout à bout. La vidéo d’origine n’est jamais touchée : « 🎬 Modifier le montage » à tout moment.' },
      { emoji: '🦴',
        titre: 'Outils › Ce qu’on écrit › 🎬 Squelette des vidéos',
        texte: 'L’avertissement, le copyright, le générique, les transitions, le style maison des textes et les polices de l’école, réglés une fois (administrateurs). Chez l’élève : le début se passe dès la 2ᵉ fois, et les 90 % ne comptent que la vidéo elle-même.' }
    ]
  },
  {
    version: 1251,
    date: 'Vendredi 23 octobre 2026',
    resume: '🧰 Les questions de vérification se posent pendant le cours',
    quoi: [
      { emoji: '🧰',
        titre: 'Un tiroir « Questions de vérification »',
        texte: 'Sous les procédures, au vocal et au bilan à la main, pour la conduite et l’AAC : tu tapes le n°, la question s’affiche (réponses derrière 👁️), tu en poses autant que tu veux.' },
      { emoji: '✅',
        titre: 'Noter partie par partie',
        texte: 'Vérification, QSER, premiers secours : ✅ ou ❌, la note sur 3 se fait toute seule. « — » = pas demandée.' },
      { emoji: '📄',
        titre: 'Tout part dans le bilan',
        texte: 'Chaque question avec ses réponses, ✅ ❌ et sa note, puis le total. Une partie ❌ revient « à revoir » dans le jeu de l’élève.' },
      { emoji: '🎙️',
        titre: 'À la voix aussi',
        texte: '« Question 12 » dit pendant l’enregistrement la pose toute seule. La case « Question n° / Note sur 3 » de l’en-tête est remplacée par un rappel.' }
    ]
  },
  {
    version: 1250,
    date: 'Vendredi 23 octobre 2026',
    resume: '🚨 Le bon voyant : contre la montre, sur le tableau de bord de sa voiture',
    quoi: [
      { emoji: '🚨',
        titre: 'Le bon voyant',
        texte: 'Dans le jeu des élèves : « touche le voyant qui… », 15 secondes par voyant, une série ⚡ qui multiplie les points, et un record à battre. Sur la photo « Voyants allumés » de SA voiture.' },
      { emoji: '🖥️',
        titre: 'Quand le voyant n’existe pas',
        texte: 'Si tu as réglé la question « c’est l’ordinateur de bord » pour sa voiture dans l’atelier, c’est la case 🖥️ qu’il doit toucher.' },
      { emoji: '📸',
        titre: 'Pour qu’il apparaisse',
        texte: 'Dépose la photo « Voyants allumés » de la voiture dans l’atelier, et dessine une zone 🎯 sur chaque voyant avec les numéros de ses questions (15 et 75 pour la pression d’huile, 23 pour la batterie…).' }
    ]
  },
  {
    version: 1249,
    date: 'Vendredi 23 octobre 2026',
    resume: '📸 L’atelier du jeu : nos voitures, nos photos, leurs chemins',
    quoi: [
      { emoji: '📸',
        titre: 'L’atelier (administrateurs)',
        texte: 'Outils › 🧰 Vérifications › « 📸 Nos voitures » : les voitures du jeu, une photo par endroit (au volant, porte ouverte, devant, capot ouvert…), et des zones dessinées au doigt. Une photo peut servir à plusieurs voitures.' },
      { emoji: '🧭',
        titre: 'Le chemin, dans l’ordre',
        texte: 'Par voiture et par endroit, les gestes dans l’ordre (ex. : la porte, puis la manette du capot, puis le capot) — et « Appliquer aussi à » d’autres voitures en un clic.' },
      { emoji: '🔧',
        titre: 'Question par question',
        texte: 'La montrer sur la photo, « il n’y en a pas : à dire » (ex. hauteur des feux automatique), ou « c’est l’ordinateur de bord » — « Même chose pour » plusieurs voitures.' },
      { emoji: '🚗',
        titre: 'Chez l’élève : « Ma voiture, en vrai »',
        texte: 'Il choisit sa voiture, et fait les gestes sur SES photos. S’il se trompe, on lui dit ce qu’il a touché.' }
    ]
  },
  {
    version: 1248,
    date: 'Jeudi 22 octobre 2026',
    resume: '🎮 Le jeu des vérifications arrive dans l’espace des élèves',
    quoi: [
      { emoji: '🧰',
        titre: 'Un onglet « Vérifs » pour l’élève',
        texte: 'Il s’ouvre élève par élève, dans 🔑 Coin révisions : case « 🧰 Le jeu des vérifications ». Le jour J, Cartes éclair, À revoir, et la grille des 100 questions.' },
      { emoji: '📝',
        titre: 'Les questions ratées reviennent',
        texte: 'Un examen blanc, un examen ou un cours dont la question de vérification est ratée : quand le bilan part par mail, la question revient « à revoir » dans son jeu.' },
      { emoji: '👀',
        titre: 'Sa progression',
        texte: 'Dans son dossier (🔑, sous son parcours), et sur la carte d’un examen blanc ou d’un examen dans Mes prochains cours : ce qu’il maîtrise sur 100, et ce qu’il a à revoir.' }
    ]
  },
  {
    version: 1247,
    date: 'Jeudi 22 octobre 2026',
    resume: '✏️ Courriers : tailles, couleurs, listes — un vrai traitement de texte',
    quoi: [
      { emoji: '🔠',
        titre: 'Taille et style de ligne',
        texte: 'Choisis la taille (8 à 72) ou un style tout prêt : Titre, Sous-titre, Petit texte. A− et A+ font un cran.' },
      { emoji: '🎨',
        titre: 'Couleur et surligneur',
        texte: 'Une palette de couleurs pour le texte (et « Autre couleur… »), et un surligneur. Le PDF garde les mêmes couleurs.' },
      { emoji: '📋',
        titre: 'Listes et retraits',
        texte: 'Listes à puces ou numérotées, sous-listes, retrait d’une ligne, barré, annuler et rétablir.' }
    ]
  },
  {
    version: 1246,
    date: 'Jeudi 22 octobre 2026',
    resume: '🧰 Les questions de vérification s’affichent sous leur numéro',
    quoi: [
      { emoji: '📖',
        titre: 'La question sous son numéro',
        texte: 'Examen blanc, RVP, examen officiel et en-tête des cours : tape le numéro, la vérification (VI ou VE), la QSER et les 1ers secours s’affichent. Les réponses sont derrière « 👁️ Voir les réponses ».' },
      { emoji: '⚠️',
        titre: 'Les questions neutralisées',
        texte: 'Les 1ers secours des questions 11, 18, 59, 76 et 97 (PLS) sont barrés : la fiche montre la question suivante, celle que pose l’inspecteur.' },
      { emoji: '📝',
        titre: 'Dans le bilan',
        texte: 'Sous le numéro de la question, le bilan écrit les questions posées et leurs réponses.' },
      { emoji: '🧰',
        titre: 'La banque des questions',
        texte: 'Outils › Ce qu’on écrit › Vérifications : les 100 questions, à chercher et à imprimer. Les administrateurs peuvent corriger une question, ou la neutraliser et la remplacer.' },
      { emoji: '🅿️',
        titre: 'La manœuvre et l’arrêt de précision',
        texte: 'La liste des manœuvres se referme à chaque coche, et « Arrêt de précision faite » n’est plus cochée d’office.' }
    ]
  },
  {
    version: 1245,
    date: 'Jeudi 22 octobre 2026',
    resume: '✏️ Courriers : écrire comme dans Word, et des images',
    quoi: [
      { emoji: '✏️',
        titre: 'On écrit sur toute la page',
        texte: 'Le courrier vierge ne faisait qu’une ligne : on touche maintenant n’importe où sur la page pour écrire, et une page vide dit « Écris ton courrier ici… ».' },
      { emoji: '🅱️',
        titre: 'La barre d’écriture, comme dans Word',
        texte: 'Gras, italique, souligné, à gauche, centré, à droite, justifié, et « retirer la mise en forme » ; Ctrl+B, Ctrl+I, Ctrl+U marchent aussi. Le PDF reprend tout à l’identique.' },
      { emoji: '🖼️',
        titre: 'Des images dans un courrier',
        texte: '« 🖼️ Ajouter une image », ou copier-coller (Ctrl+V, ou appui long › Coller) : une photo, un plan, une capture, posée sur la page comme une signature. « ✨ Retirer le fond blanc » au choix. Une image posée dans un modèle revient sur chaque courrier.' },
      { emoji: '📋',
        titre: 'Les signatures et tampons se collent aussi',
        texte: 'Dans ✍️ Signatures et tampons, à côté du bouton : « 📋 Ou colle l’image ici ».' }
    ]
  },
  {
    version: 1244,
    date: 'Jeudi 22 octobre 2026',
    resume: '✉️ Courriers : une session d’un coup, relance, carnet, messagerie, signature',
    quoi: [
      { emoji: '✉️',
        titre: 'Les convocations de toute une session',
        texte: '🎓 Suivi permis : le ✉️ d’une session prépare la convocation de chaque élève (ses jours, l’en-tête de son agence, son numéro). Un envoi pour tous, ou un seul PDF pour imprimer la pile.' },
      { emoji: '💶',
        titre: '« ✉️ Relance » à côté de « Il doit de l’argent »',
        texte: 'Elle ouvre la relance de paiement de l’élève, le reste à payer déjà écrit.' },
      { emoji: '📇',
        titre: 'Le carnet d’adresses',
        texte: 'Employeurs, lycées, mission locale… : leur adresse se pose dans la fenêtre de l’enveloppe, et leur mail est proposé à l’envoi.' },
      { emoji: '💬',
        titre: 'Le courrier aussi dans sa messagerie',
        texte: 'En envoyant, « Aussi dans sa messagerie » dépose le PDF dans son fil « Le bureau » (s’il a son espace élève) — même sans adresse mail.' },
      { emoji: '✍️',
        titre: 'L’élève signe sur la tablette',
        texte: '« ✍️ Faire signer » : il signe au doigt, sa signature se pose sur la page et ne sert qu’à ce courrier.' }
    ]
  },
  {
    version: 1243,
    date: 'Jeudi 22 octobre 2026',
    resume: '✉️ Les courriers sur papier à en-tête',
    quoi: [
      { emoji: '✉️',
        titre: 'Outils › Ce qu’on écrit › ✉️ Courriers',
        texte: 'Un courrier vierge (l’en-tête et le pied de page), la convocation à l’examen, et des attestations prêtes (inscription, formation, réussite, restitution du dossier, relance de paiement). On choisit l’élève : son nom, Monsieur/Madame, « convoqué/convoquée », sa catégorie et ses jours d’examen se remplissent seuls. On relit sur la vraie page, puis 📄 PDF, 🖨️ impression ou ✉️ mail.' },
      { emoji: '📍',
        titre: 'Saint-Brieuc ou Loudéac',
        texte: 'L’en-tête suit l’agence de l’élève et se change d’un toucher. Le Siret est au pied des deux.' },
      { emoji: '✍️',
        titre: 'Signatures et tampons (administrateurs)',
        texte: 'Une photo de la signature ou du tampon : le fond blanc est retiré, l’image se pose par-dessus le texte et se glisse où l’on veut, se règle en taille et se tourne.' },
      { emoji: '🔢',
        titre: 'Un numéro par courrier, et l’onglet ✉️ Courriers du dossier',
        texte: 'Chaque courrier fait reçoit « EC-2026-0001 » écrit au bas de la page, se retrouve par la recherche, et se range dans le dossier de l’élève avec son PDF.' }
    ]
  },
  {
    version: 1242,
    date: 'Jeudi 22 octobre 2026',
    resume: '👂 Les écoutes aussi depuis « Tous les utilisateurs »',
    quoi: [
      { emoji: '👂',
        titre: 'Écoutes à ouvrir, toutes agences',
        texte: 'Le bouton « 👂 Écoutes à ouvrir » apparaît aussi quand le favori a lu le planning « Tous les utilisateurs » : les cours de Saint-Brieuc vont en BEA ou BV, ceux de Loudéac dans la colonne « Ecoute », dans la même liste à valider.' }
    ]
  },
  {
    version: 1241,
    date: 'Jeudi 22 octobre 2026',
    resume: '📥 Le favori marche sur « Tous les utilisateurs »',
    quoi: [
      { emoji: '📥',
        titre: 'Le planning de toutes les agences d’un coup',
        texte: 'Sur le planning Drivup « Tous les utilisateurs », le favori ne dit plus « je ne reconnais pas ce planning » : il lit Saint-Brieuc et Loudéac ensemble, chaque cours garde son agence, et un cours disparu de Drivup est marqué « Annulé » dans l’une comme dans l’autre. Les horaires des bureaux et les créneaux libres suivent aussi.' }
    ]
  },
  {
    version: 1240,
    date: 'Jeudi 22 octobre 2026',
    resume: '🔁 Les nouvelles zones à leur place sur une fiche déjà réglée',
    quoi: [
      { emoji: '🔁',
        titre: 'Arrêt de précision et « Après la manœuvre » à leur place',
        texte: 'Sur une fiche réglée avant leur arrivée, ces zones tombaient tout en bas de la fiche. Elles se rangent maintenant derrière leur voisine d’origine : avant la manœuvre, et juste sous Autonomie (dans le cadre).' },
      { emoji: '➖',
        titre: 'Le point retiré après la manœuvre tient',
        texte: 'Un ⚠️ posé ailleurs ne le rend plus ; la note « … /2 » de l’installation dans le bilan le suit aussi, avec « (−1 après la manœuvre) ».' }
    ]
  },
  {
    version: 1239,
    date: 'Jeudi 22 octobre 2026',
    resume: '🗓️ Créneaux libres : toutes les agences d’un coup, trous d’1h à part',
    quoi: [
      { emoji: '🗓️',
        titre: 'Toutes les agences à chaque lecture',
        texte: 'Le favori « 📥 » lit maintenant le planning de toutes les agences, quel que soit celui qui est ouvert (Saint-Brieuc, Loudéac ou « Tous les utilisateurs ») : un cours posé à Loudéac n’est plus pris pour un trou à Saint-Brieuc.' },
      { emoji: '⏳',
        titre: 'Les trous d’1h, dans leur filtre',
        texte: 'Élèves › 🗓️ Créneaux libres : « ⏳ Trous d’1h » est une pastille à part, à côté de « ⬜ Rien d’ouvert » (qui garde les créneaux de 2h et « libre après son permis »).' }
    ]
  },
  {
    version: 1238,
    date: 'Jeudi 22 octobre 2026',
    resume: '🎯 Arrêt de précision et 🔁 après la manœuvre sur les examens ; 📦 cadres sans limite',
    quoi: [
      { emoji: '🎯',
        titre: 'L’arrêt de précision, avant la manœuvre',
        texte: 'Examen blanc, examen officiel et RVP : « 🅿️ Manœuvre : Arrêt de précision » avec ses lignes Remarque de l’inspecteur / Explication (☠️ ⚠️, ➕ Ajouter une ligne), dans le cadre gris. « faite », cochée d’office, le compte dans la fiche des manœuvres de l’élève.' },
      { emoji: '🔁',
        titre: 'Passager et voyants revus après la manœuvre',
        texte: 'Sous Autonomie, deux cases ✅ ❌ : chaque ❌ enlève 1 point à « Savoir s’installer et assurer la sécurité à bord » sur le CEPC, même si c’était bon avant la manœuvre. Le bilan porte « 🔁 Après la manœuvre : Passager … · Voyants … ».' },
      { emoji: '📦',
        titre: 'Des cadres de toute taille',
        texte: 'Dans le créateur de fiches : « ➕ » dans un cadre (même sous sa dernière zone) y ajoute la zone ; le cadre se règle avec « Il commence à / Il finit à » ; pour encadrer, on peut aussi toucher les noms dans « 🧩 Les zones ».' },
      { emoji: '👨‍✈️',
        titre: 'Deux nouveaux types dans « ➕ Ajouter ici » (examens)',
        texte: '« 👨‍✈️ Remarques de l’inspecteur + explications », avec la mention qui part dans le bilan et le nombre de lignes ; « ✅❌ Trois états qui enlèvent des points au CEPC », avec la ligne du CEPC et 1 à 3 points.' }
    ]
  },
  {
    version: 1237,
    date: 'Jeudi 22 octobre 2026',
    resume: '🗓️ Créneaux de 2h, simulateurs repérés, plusieurs manœuvres, CEPC gardé',
    quoi: [
      { emoji: '🗓️',
        titre: 'Les créneaux libres, comme on les propose',
        texte: 'Quand rien n’est ouvert, la journée d’un moniteur se propose par créneaux de 2h (8h-10h, 10h-12h, 13h-15h, 15h-17h, 17h-19h) ; un créneau à moitié pris garde son trou d’1h ; après un permis, de l’heure de fin (trajet retour compris) à 2h après. ' +
               'Une note sur sa colonne (« .LOUDÉAC »…) compte comme occupée. « 1h dispo » écrit dans Drivup a sa pastille « ✍️ Dispo écrite ».' },
      { emoji: '🕹️',
        titre: 'Le simulateur avec moniteur à 1 place, enfin repéré',
        texte: 'Il était manqué : Drivup n’écrit pas de places pour un seul inscrit. Il apparaît maintenant avec son intitulé (« (Passerelle) » quand c’en est un) et la séance notée sur la colonne (« 3 », « 3-4 »).' },
      { emoji: '🅿️',
        titre: 'Plusieurs manœuvres à l’examen',
        texte: 'Le menu « Manœuvre : … » de l’examen blanc, de l’examen officiel et du RVP se coche : au moins 2 manœuvres. Le bilan porte une ligne par manœuvre, et chacune compte dans la fiche des manœuvres de l’élève.' },
      { emoji: '🧾',
        titre: '« Examen non mené à son terme » garde le CEPC',
        texte: 'La case ne vide plus la grille : on la remplit et on la modifie. Le bouton « 🧹 Vider le CEPC et le griser », dessous, la vide (un second appui rend les notes). Dans le bilan : les notes portées, et la mention à la place du total.' }
    ]
  },
  {
    version: 1236,
    date: 'Jeudi 22 octobre 2026',
    resume: '✍️ Créateur de fiches : menu des manœuvres, listes déroulantes, couleurs',
    quoi: [
      { emoji: '🅿️',
        titre: 'Le menu des manœuvres se règle à la main',
        texte: 'Dans le créateur de fiches, touche la zone « 🅿️ Manœuvre : … » : « 📋 Les choix du menu » permet d’ajouter, renommer, monter ou retirer une manœuvre. Une seule liste pour l’examen blanc, l’examen officiel et le RVP ; elle part aux moniteurs avec « 💾 Publier ». La fiche des manœuvres de l’élève ne change pas.' },
      { emoji: '▾',
        titre: 'Des listes déroulantes où tu veux',
        texte: '« ➕ Ajouter ici » › « ▾ Liste déroulante » : tes propres choix, ou une liste de l’appli (manœuvres, voitures, moniteurs, centres d’examen, procédures, formations). Chaque choix peut écrire sa phrase dans le bilan, faire apparaître des zones (cachées tant qu’on ne le prend pas, et leur texte ne part pas), ou compter la manœuvre faite dans sa fiche. « Plusieurs choix possibles » met des cases dans la liste.' },
      { emoji: '🎨',
        titre: 'La couleur des textes',
        texte: 'Sur chaque zone : la couleur du titre, de la petite aide et de ce que le moniteur écrit. « Aussi dans le bilan » les fait passer dans le mail et dans « 📖 Mes leçons » de l’élève (la copie pour Messenger reste sans couleur).' }
    ]
  },
  {
    version: 1235,
    date: 'Mercredi 21 octobre 2026',
    resume: '🕹️ Simulateur à 1 place dans les créneaux libres, et 🚫 pour en retirer',
    quoi: [
      { emoji: '🕹️',
        titre: 'Le simulateur avec moniteur où il reste une place',
        texte: 'Élèves › 🗓️ Créneaux libres montre aussi les séances de simulateur avec moniteur où un seul élève est inscrit (1/2), avec la séance telle qu’elle est écrite dans Drivup (« séance 3 et 4 »…) et qui y est déjà.' },
      { emoji: '🚫',
        titre: 'Ne pas proposer un créneau',
        texte: 'Le bouton 🚫 sur une ligne la retire de la liste et de la fenêtre « Proposer » (rien ne change dans Drivup). Les créneaux retirés sont rangés en bas de la liste, avec ↩️ Remettre.' }
    ]
  },
  {
    version: 1234,
    date: 'Mercredi 21 octobre 2026',
    resume: '🗓️ Créneaux libres lus dans Drivup, à proposer aux élèves',
    quoi: [
      { emoji: '🗓️',
        titre: 'Les créneaux libres, au même endroit',
        texte: 'Élèves › 🗓️ Créneaux libres : les cours ouverts sans élève, les « Résa » et les moments où un moniteur n’a rien d’ouvert sur ses horaires (⚙️ réglables par moniteur), sur les 4 semaines à venir — avec « 👥 À placer » : les permis prévus dont le planning n’est pas fait. ' +
               'La liste se met à jour à chaque clic du favori « 📥 » sur le planning d’une agence.' },
      { emoji: '📋',
        titre: 'Proposer des créneaux depuis 🎓 Suivi permis',
        texte: 'Le bouton « 🗓️ Créneaux libres » (en haut, et sous « 📆 Il doit planifier ») ouvre une fenêtre triée pour l’élève (avant son permis, dans sa boîte) : on coche, puis 📋 copier le message ou 💬 l’envoyer dans sa messagerie.' }
    ]
  },
  {
    version: 1232,
    date: 'Mercredi 21 octobre 2026',
    resume: '🔘 Procédures du cours : noms courts, gras, une couleur par boîte',
    quoi: [
      { emoji: '🔘',
        titre: 'Les procédures se lisent d’un coup d’œil pendant le cours',
        texte: 'Dans « 📋 Procédures à joindre au bilan », les procédures sont rangées par boîte (BEA, BV, BEA et BV), avec une couleur par boîte, et leur nom est raccourci tout seul (plus de « Procédures BEA › » ni de « (boîte à embrayage…) »). ' +
               'Pour choisir le nom vous-même : Ce qu’on écrit › Procédures › la fiche › « 🔘 Nom sur le bouton », avec **gras** où vous voulez. Le bilan garde le nom complet.' }
    ]
  },
  {
    version: 1229,
    date: 'Mercredi 21 octobre 2026',
    resume: '👂 Drivup : ouvrir les écoutes pédagogiques depuis le favori',
    quoi: [
      { emoji: '👂',
        titre: 'Les écoutes pédagogiques ouvertes pour vous dans Drivup',
        texte: 'Sur le planning d’une agence, cliquez le favori « 📥 Bilan de conduite », puis « 👂 Écoutes à ouvrir » : la liste des cours de conduite des semaines à venir (4 par défaut, réglable), chacun avec sa colonne (BEA ou BV d’après la voiture, « Ecoute » pour Loudéac) et sa prestation (1h, 1h30 pour un examen blanc, 2h…). ' +
               'Les 1ers cours, préalables, RVP (mémo Drivup ou Suivi AAC), simulateurs et examens sont écartés — on peut en recocher un. Vous validez, le favori remplit le formulaire « Planifier » de Drivup pour chacune, puis vérifie qu’elle y est.' }
    ]
  },
  {
    version: 1228,
    date: 'Mercredi 21 octobre 2026',
    resume: '✉️ Suivi AAC : le mail de relance des rendez-vous, et la réponse de la famille',
    quoi: [
      { emoji: '✉️',
        titre: 'Le mail de relance AAC, depuis l’app',
        texte: 'Suivi AAC › « ✉️ Mail de relance » : la fenêtre montre où en est l’élève, ses adresses (le prescripteur se tape là s’il manque, et s’enregistre dans sa fiche), et ce qu’on demande — ses disponibilités pour le prochain RVP pratique, et « quand passer l’examen » (une case à cocher ou non, à chaque envoi). ' +
               'Le mail reprend votre texte des 3 rendez-vous en entier, avec « ✅ fait le … » ou « ⏳ à prévoir » sur chaque titre, et reste modifiable avant l’envoi.' },
      { emoji: '📝',
        titre: 'La famille répond en quelques appuis',
        texte: 'Le lien du mail ouvre une page : jours × matin / après-midi / fin de journée, et pour l’examen « dès que possible », « peu importe », une semaine précise ou des vacances scolaires. La réponse s’écrit sous l’élève : « ✉️ Relance envoyée le … · 📝 Réponse le … ».' }
    ]
  },
  {
    version: 1227,
    date: 'Mercredi 21 octobre 2026',
    resume: '⚡ Espace élève : on entre tout de suite, le reste arrive derrière',
    quoi: [
      { emoji: '⚡',
        titre: 'Entrer dans l’espace élève sans attendre',
        texte: 'Le nom et le code se vérifient maintenant en direct (moins d’une seconde) : la page s’ouvre, la messagerie démarre, et le parcours, les leçons et les procédures arrivent derrière (« ⏳ … se charge »). ' +
               'L’élève qui revient sur son téléphone (code gardé) ne déclenche plus trois réveils du classeur en plus.' }
    ]
  },
  {
    version: 1226,
    date: 'Mercredi 21 octobre 2026',
    resume: '📣 Suivi AAC : « prévenu » pour prévoir un rendez-vous, avec la date visée',
    quoi: [
      { emoji: '📣',
        titre: 'Prévenu pour prévoir le rendez-vous',
        texte: 'Sur chaque rendez-vous pas encore fait (RVP 1, RVP 2, théorique), « 📣 … : prévenu » : on choisit la date visée, le jour et qui a prévenu se notent tout seuls. ' +
               'La ligne « EN RETARD » reste, et dessous : « 📣 Prévenu le 21/10 (David) — RDV à prévoir pour le 15/11 ». Un nouvel appui permet de prévenir à nouveau ou de retirer.' }
    ]
  },
  {
    version: 1225,
    date: 'Mercredi 21 octobre 2026',
    resume: '🎬 « ✓ Vu » ne se donne plus sans avoir vu : % de vidéo regardée et « Passer »',
    quoi: [
      { emoji: '🎬',
        titre: 'Une vidéo se valide en la regardant',
        texte: 'Côté élève, « ✓ Vu » reste grisé (« ▶ Vidéo · 35 % ») jusqu’à 90 % des secondes VRAIMENT lues : sauter à la fin ne compte pas, revoir un passage ne compte pas deux fois. ' +
               'Pour un texte, « ✓ Vu » attend le temps de lecture (compte à rebours). « Passer › » avance sans rien valider.' },
      { emoji: '📊',
        titre: 'Le % de vidéo regardée, côté bureau',
        texte: 'Dans le parcours d’un élève, la pastille porte « 🎬 35 % » tant que la vidéo n’est pas vue à 90 %, et la bulle dit « Vidéo regardée à 35 % (sa meilleure fois) ». ' +
               'Avant cette version rien n’était mesuré : « aucune lecture mesurée ».' }
    ]
  },
  {
    version: 1224,
    date: 'Mercredi 21 octobre 2026',
    resume: '🗺️ En direct : la dernière position connue de chaque voiture, et 🏠 revenue au bureau',
    quoi: [
      { emoji: '📍',
        titre: 'La dernière position connue',
        texte: 'Une voiture qui n’envoie plus rien garde sur la carte une bulle grise « dernière position » avec la date et l’heure. ' +
               'UN seul point par voiture est gardé, remplacé à chaque signal, sans historique ni vitesse. Les moniteurs le lisent sur leur ligne de trajet.' },
      { emoji: '🏠',
        titre: 'Revenue au bureau',
        texte: 'Le bouton « 🏠 Revenue au bureau » (Saint-Brieuc ou Loudéac) efface sa dernière position. Elle passe aussi toute seule « au bureau » quand elle s’arrête à moins de 150 m de l’un d’eux.' },
      { emoji: '🚗',
        titre: 'Toutes les voitures, et ce qu’on sait d’elles',
        texte: 'La liste sous la carte montre toute la flotte : 📡 en direct, 📍 dernière position, 🏠 au bureau ou ❔ inconnue ; qui l’a en ce moment et son prochain cours (d’après le planning). ' +
               'Un appui sur une ligne zoome sur la voiture — ou sur son bureau.' }
    ]
  },
  {
    version: 1223,
    date: 'Mercredi 21 octobre 2026',
    resume: '🎬 Chaque segment d’un guide a enfin son identifiant : 📌, ↺ et « vu » visent le bon',
    quoi: [
      { emoji: '🎯',
        titre: 'Un segment = un segment',
        texte: 'L’éditeur ne donnait pas d’identifiant aux « 🏷️ Titres d’étape » : tous les segments d’un guide n’en faisaient qu’un. ' +
               'Épingler un segment les épinglait tous, la carte « À revoir » ouvrait le premier, et lire un segment cochait tout le guide. ' +
               'Chaque titre a maintenant le sien, sans rien republier.' }
    ]
  },
  {
    version: 1222,
    date: 'Mercredi 21 octobre 2026',
    resume: '📌 « À revoir » pour un élève, ↺ remettre à voir, et les heures supp dans L’équipe',
    quoi: [
      { emoji: '⏫',
        titre: 'L’équipe › Heures : les heures supplémentaires',
        texte: 'Normales et à 25 % du mois, ce qui reste des mois d’avant, la récup à prendre, et la décision une fois le mois clôturé — le calcul même de 💶 Paie. ' +
               'Un interrupteur 👁️ décide si la personne les voit dans Ma fiche (caché au départ).' },
      { emoji: '↺',
        titre: 'Remettre à voir, pour un élève',
        texte: 'Dans son parcours (Parcours des élèves ou son dossier) : ↺ sur un segment (dans sa bulle), sur un guide, ou sur tout un groupe. ' +
               'La pastille repasse à voir chez nous et chez lui ; sa première date et son nombre de fois sont gardés et repartent s’il le revoit.' },
      { emoji: '📌',
        titre: 'Lui demander de revoir un segment — trois façons',
        texte: 'Depuis son parcours (bulle d’un segment › 📌, avec un mot si on veut) ; pendant le cours (tiroir « 🎬 À revoir dans son coin révisions », sous les procédures : ils partent en fin de bilan avec un lien) ; ' +
               'ou dans une conversation avec lui (＋ › À revoir : une carte qu’il touche pour ouvrir le segment). ' +
               'Chez lui, ça s’épingle en tête de « Réviser » avec une notification, et ça s’éteint tout seul quand il l’a relu — on voit « revu le … ».' }
    ]
  },
  {
    version: 1221,
    date: 'Mardi 20 octobre 2026',
    resume: '🎬 « Réviser » devient un chemin, avec une recherche ; parcours lisible au bureau',
    quoi: [
      { emoji: '🎬',
        titre: 'Espace élève : « Réviser » en chemin',
        texte: 'Une pastille ronde par segment, le long d’un chemin : ✓ ce qui est vu, ▶ le prochain à voir, un numéro pour la suite, avec le temps qu’il demande. ' +
               'Un appui ouvre le segment dans un panneau qui monte du bas, avec « ✓ Vu — Suivant › ». Les puces en haut filtrent par groupe, ou « Tout ».' },
      { emoji: '🔎',
        titre: 'Une barre de recherche',
        texte: 'L’élève tape « stop », « créneau », « huile »… et retrouve tout ce qui en parle dans ses guides et dans ses bilans, mots surlignés. Sans accents ni majuscules ; un appui ouvre le segment ou le bilan.' },
      { emoji: '🎓',
        titre: 'Bureau : le parcours d’un élève en pastilles',
        texte: 'Une carte par guide, une pastille par segment (verte et « 4× » s’il l’a vu, grise sinon). Touche une pastille : quand il l’a vu, combien de fois, et ce que le segment contient. ' +
               'Fini les noms de fichiers en guise de titre et le « � » en fin d’aperçu.' }
    ]
  },
  {
    version: 1220,
    date: 'Mardi 20 octobre 2026',
    resume: '🎬 Espace élève : les vidéos du parcours reviennent, et « vu » veut dire lu',
    quoi: [
      { emoji: '🎬',
        titre: 'Les vidéos, images et PDF du parcours s’affichent',
        texte: 'Depuis que l’espace élève charge tout en une fois, les fichiers du parcours arrivaient sans leur lien : l’élève ne voyait que le texte. Ils sont de nouveau là dès l’ouverture.' },
      { emoji: '👁️',
        titre: 'Un segment n’est « vu » que s’il a été lu',
        texte: 'Ouvrir un groupe ne valide plus tout ce qui est à l’écran. Un seul segment à la fois, le premier en partant du haut, le temps de le lire ' +
               '(selon sa longueur, ses images, ses documents) ; un segment vide ne se valide jamais tout seul. Les vidéos : 90 % regardés, comme avant.' }
    ]
  },
  {
    version: 1219,
    date: 'Mardi 20 octobre 2026',
    resume: '📍 Le bilan dit à l’élève où il en est dans sa frise',
    quoi: [
      { emoji: '📍',
        titre: '« Où tu en es », sous le rappel de la frise',
        texte: 'Chaque bilan d’élève dit maintenant où il en est : « 5ème leçon faite sur 7 → il te reste 2 leçons de 2h avant ton examen blanc », ' +
               '« examen blanc fait ✅ → il te reste 4h de leçons, puis les 3h avant ton examen », « rendez-vous post-permis fait → … ». ' +
               'Les mêmes chiffres que la phrase verte du moniteur, et rien quand on ne sait pas.' },
      { emoji: '⚠️',
        titre: '« ATTENTION : ce nombre peut changer selon ton évolution »',
        texte: 'Toujours en dessous quand il y a un nombre — pas pour la leçon de veille ni pour l’ajournement.' }
    ]
  },
  {
    version: 1218,
    date: 'Mardi 20 octobre 2026',
    resume: '⚖️ L’IA n’adoucit plus une faute grave',
    quoi: [
      { emoji: '⚖️',
        titre: 'Une faute grave reste grave',
        texte: 'L’IA ne peut plus écrire « ce n’est pas grave », « un peu », « légèrement »… pour une faute, sauf si le moniteur l’a dit lui-même. ' +
               'Stop non marqué, feu rouge, refus de priorité, sens interdit, ligne continue, vitesse excessive, intervention du moniteur : ' +
               'écrits comme graves, avec la mention « éliminatoire à l’examen ». La règle part avec chaque bilan, même si les consignes ont été réécrites.' }
    ]
  },
  {
    version: 1217,
    date: 'Mardi 20 octobre 2026',
    resume: '📏 Plus de « découpe-le en deux bilans » : l’IA a deux fois plus de place',
    quoi: [
      { emoji: '📏',
        titre: 'Un cours dense passe en un seul bilan',
        texte: 'L’IA réfléchit avant d’écrire, et cette réflexion prenait toute la place réservée au bilan : sur un cours dense, ' +
               'elle rendait un bilan vide (« arrêt : max_tokens »). Elle a maintenant deux fois plus de place, et si ça ne suffit pas, ' +
               'elle reprend toute seule avec quatre fois plus. On ne paie que ce qu’elle écrit.' },
      { emoji: '✍️',
        titre: 'La correction du cours aussi',
        texte: 'Chaque partie de la correction a la même place, et reprend avec plus de place si elle a été coupée.' }
    ]
  },
  {
    version: 1216,
    date: 'Mardi 20 octobre 2026',
    resume: '🎯 La phrase verte reste visible pendant tout le cours',
    quoi: [
      { emoji: '🎯',
        titre: 'Où il en est, pendant tout le cours',
        texte: 'La phrase verte de la carte (« 5ème leçon — plus que 2 leçons », « C’est la leçon de veille… », « 🏁 Ajourné le … ») ' +
               's’affiche aussi sous « 📋 Compléter les infos », pour tous les élèves, pendant tout le cours.' },
      { emoji: '🚗',
        titre: '« Permis le … » au lieu du 📅',
        texte: 'Dans la ligne sous « 📋 Compléter les infos », la date d’examen se lit « Permis le 22/10/2026 ».' }
    ]
  },
  {
    version: 1215,
    date: 'Mardi 20 octobre 2026',
    resume: '✍️ Fini les « Correction incomplète » pour une phrase sans point',
    quoi: [
      { emoji: '✍️',
        titre: 'La correction du cours n’est plus refusée à tort',
        texte: 'Une partie de dictée se coupe souvent au milieu d’une phrase : l’IA la rendait corrigée mais sans point final, et l’application ' +
               'la croyait coupée — trois essais, puis « ⚠️ Correction incomplète » et le texte brut. C’est maintenant l’IA qui dit si elle a fini : ' +
               'une vraie coupure est toujours repérée, une phrase sans point ne l’est plus.' }
    ]
  },
  {
    version: 1214,
    date: 'Mardi 20 octobre 2026',
    resume: '⏳ Pendant la génération du bilan, rien d’autre à l’écran',
    quoi: [
      { emoji: '⏳',
        titre: 'Plus de « Y revenir » pendant la génération',
        texte: 'Le bandeau « ⏸ EN PAUSE … Y revenir » se cache sur l’écran « Génération du bilan en cours… » : on y est déjà. Il revient dès qu’on quitte cet écran.' },
      { emoji: '🚫',
        titre: 'Plus de « Commencer un autre cours » pendant la génération',
        texte: 'Un second cours ouvert pendant que le bilan du premier s’écrit mélangeait les deux. Si l’IA tarde, « ✍️ Envoyer sans la partie IA » reste la sortie.' }
    ]
  },
  {
    version: 1213,
    date: 'Mardi 20 octobre 2026',
    resume: '🔘 Procédures et fiche véhicule en boutons, procédures triées par boîte',
    quoi: [
      { emoji: '🕹️',
        titre: 'Les procédures de la bonne boîte',
        texte: 'Cours en BV : les procédures BV, et BEA et BV. Cours en BEA : les procédures BEA, et BEA et BV. Plus de BE sur la voiture. ' +
               'Pour un examen blanc, un RVP ou un examen officiel, la boîte vient de la formation ; un élève en remorque voit ses procédures BE. ' +
               'Les autres restent à portée de main, dans « Les autres procédures (pas pour cette boîte) ». L’IA ne reçoit plus que celles de la boîte.' },
      { emoji: '🔘',
        titre: 'Des boutons qui passent en vert',
        texte: 'Les procédures à joindre et la fiche véhicule (pendant le cours et sur le bilan à la main) se touchent comme des boutons. ' +
               'Une manœuvre touchée passe en vert avec ton émoji, à côté de ceux des moniteurs qui l’ont déjà faite. ' +
               'Pour un élève venu d’une autre auto-école, le petit 🚗 à droite se colore en bleu.' },
      { emoji: '☑',
        titre: 'Ou les cases, comme avant',
        texte: '« 🔘 Boutons | ☑ Cases » en haut de chaque tiroir : ton choix est gardé sur ton téléphone, pour les deux.' }
    ]
  },
  {
    version: 1212,
    date: 'Mardi 20 octobre 2026',
    resume: '🔁 La carte d’un RDV post-permis, 👥 les cours des autres en boutons',
    quoi: [
      { emoji: '🏁',
        titre: 'Un RDV post-permis parle du post-permis',
        texte: 'En tête de sa carte, le résultat : « 🏁 Ajourné le … — 1er repassage ». Dessous, la sortie d’examen (inspecteur, heures demandées, ' +
               'le mot pour l’équipe) et les captures du CEPC. La veille, la frise, l’examen blanc, le simulateur et « pas de date d’examen » n’y sont plus.' },
      { emoji: '👥',
        titre: 'Les cours des autres moniteurs, d’un appui',
        texte: 'La case et la liste déroulante sont remplacées par une rangée de boutons : « 👤 Mes cours », « 👥 Tous », ' +
               'puis un bouton par moniteur avec son émoji et son nombre de cours.' },
      { emoji: '🗓️',
        titre: 'Plus de « veille » d’un examen passé',
        texte: 'Après un ajournement, la date de l’examen raté ne fait plus annoncer « C’est la leçon de veille de l’examen » sur les cours suivants.' }
    ]
  },
  {
    version: 1211,
    date: 'Mardi 20 octobre 2026',
    resume: '📋 Procédures cochées, 🅿️ manœuvre d’examen, 🚗 phrases par voiture, 📷 bilan en photo',
    quoi: [
      { emoji: '📋',
        titre: 'Les procédures, cochées pendant le cours',
        texte: 'En vocal, sous la fiche véhicule : « 📋 Procédures à joindre au bilan ». Sur un bilan à la main (et ceux qui ne se font qu’à la main), ' +
               'juste sous « 📍 Repère ici », avant « Composer le bilan ». Ce qui est coché part en fin de bilan, comme une procédure demandée à voix haute — jamais deux fois.' },
      { emoji: '🅿️',
        titre: 'Manœuvre : … (examen blanc et officiel)',
        texte: 'Le titre de la partie manœuvre est une liste : le moniteur choisit la manœuvre faite. Les remarques disent « Manœuvre : Créneau · … », ' +
               'le bilan porte « 🅿️ Manœuvre : … » avec l’émoji du moniteur, et elle compte sur la fiche véhicule de l’élève.' },
      { emoji: '🚗',
        titre: 'Les spécificités des véhicules, dans le créateur de fiches',
        texte: 'Une case à cocher ou une zone entière peut être réservée à certaines voitures de la flotte : le moniteur ne la voit que si c’est la voiture du cours. ' +
               'Les deux cases de la survitesse sont maintenant des cases comme les autres (« ⚡ voitures à alerte de survitesse »). « 👁️ Essayer » permet de choisir la voiture.' },
      { emoji: '📷',
        titre: 'Le bilan post-permis écrit à la main, en photo',
        texte: 'Sous « 📝 Bilan écrit par l’élève » : « 📷 Ajouter » (ou coller l’image dans le champ). Le moniteur les voit et en ajoute au rendez-vous, ' +
               'elles sont dans le dossier (onglet Permis), et l’élève les retrouve dans son espace. Douze au plus par élève.' }
    ]
  },
  {
    version: 1210,
    date: 'Mardi 20 octobre 2026',
    resume: '🤖 Refaire avec l’IA un bilan envoyé sans la partie IA',
    quoi: [
      { emoji: '🤖',
        titre: 'Refaire avec l’IA',
        texte: 'Un bilan parti sans la partie IA le dit dans le dossier de l’élève (📚 Cours) et dans « 🩹 Cours non terminés » : ' +
               '« 🤖 Refaire avec l’IA » renvoie la dictée gardée à l’IA. Le moniteur du cours, le bureau et les admins peuvent le faire.' },
      { emoji: '📨',
        titre: 'Il remplace celui envoyé sans IA',
        texte: 'Le moniteur relit, corrige, puis « 📨 Renvoyer à l’élève » : la même ligne est remplacée (son historique se met à jour) et un mail ' +
               '« 📄 Ton bilan complet du cours du … » lui part. La dictée s’efface à ce moment-là.' },
      { emoji: '📤',
        titre: 'Refait par le bureau',
        texte: 'Si ce n’est pas le moniteur du cours qui le refait, le bilan part chez lui pour relecture (« 🤖 Un bilan refait avec l’IA t’attend — à relire et renvoyer à l’élève ») : ' +
               'c’est lui qui le renvoie à l’élève.' }
    ]
  },
  {
    version: 1209,
    date: 'Mardi 20 octobre 2026',
    resume: '🤖 Un bilan IA ne peut plus attendre sans fin',
    quoi: [
      { emoji: '📶',
        titre: 'La génération qu’on voit avancer',
        texte: 'Le bilan s’écrit au fil de l’eau : le nombre de mots écrits, le temps écoulé et le temps habituel s’affichent, et l’écran reste allumé. ' +
               'Une connexion qui meurt (réseau, veille du téléphone) est relancée toute seule, une fois.' },
      { emoji: '⏱️',
        titre: 'Au bout de 6 minutes, le moniteur choisit',
        texte: '« 🔁 Relancer la génération » ou « ✍️ Envoyer sans la partie IA » : le bilan habituel, avec la dictée en clair, et les rubriques qu’il coche ' +
               'remplies à la main. La génération continue en fond pendant ce temps. Le bureau reçoit une notification.' },
      { emoji: '✍️',
        titre: 'La dictée gardée',
        texte: 'Un bilan envoyé sans IA garde sa dictée : elle apparaît dans « 🩹 Cours non terminés › ✍️ Envoyés sans la partie IA ». ' +
               '« 🤖 Refaire avec l’IA » arrive à la prochaine livraison.' },
      { emoji: '💸',
        titre: 'Le seuil, réglable, et les durées mesurées',
        texte: 'Outils › Argent › 💸 Coûts IA : le seuil d’alerte (administrateurs), le temps habituel, les plus longues, les échecs ; chaque ligne du détail porte sa durée.' }
    ]
  },
  {
    version: 1208,
    date: 'Mardi 20 octobre 2026',
    resume: '🔒 Une zone ajoutée peut rester « pour nous seulement »',
    quoi: [
      { emoji: '🔒',
        titre: 'Pour nous seulement',
        texte: 'Dans le 🎨 créateur de fiches, une zone ajoutée peut être cochée « 🔒 Pour nous seulement » : ce que le moniteur y met part dans la ' +
               'note interne du cours, jamais dans le bilan de l’élève. Sur sa fiche, le moniteur voit « 🔒 Pour nous seulement — ne part pas à l’élève ».' }
    ]
  },
  {
    version: 1207,
    date: 'Mardi 20 octobre 2026',
    resume: '➕ Créateur de fiches : ajouter, retirer et encadrer des zones',
    quoi: [
      { emoji: '➕',
        titre: 'Ajouter une zone entre deux autres',
        texte: 'Dans le 🎨 créateur de fiches, « ➕ » entre deux zones : titre de partie, sous-titre en couleur, cadre de texte (avec ou sans 🎙️), ' +
               'ligne courte, cases à cocher seules, ✅❌—, oui/non, note de 0 à 3. 🗑️ retire une zone ajoutée ; les zones d’origine, elles, se masquent.' },
      { emoji: '📝',
        titre: 'Dans le bilan, juste sous la zone du dessus',
        texte: 'Ce que le moniteur met dans une zone ajoutée part dans le bilan juste sous la zone qui la précède sur la fiche, sans toucher au reste. ' +
               'Si rien n’est écrit au-dessus, en fin de sa partie. Une zone laissée vide ne laisse rien.' },
      { emoji: '📦',
        titre: 'Encadrer plusieurs zones d’un même fond',
        texte: '« 📦 Encadrer » : touche la première zone, puis la dernière — un seul cadre, dont tu choisis la couleur et la force.' }
    ]
  },
  {
    version: 1206,
    date: 'Mardi 20 octobre 2026',
    resume: '🎨 Le créateur des fiches « bilan à la main » : fonds, cases, micros',
    quoi: [
      { emoji: '🎨',
        titre: 'Régler la fiche que voit le moniteur',
        texte: 'Outils › Ce qu’on écrit › Modèles de bilan › « 🎨 Créateur de fiches » (administrateurs) : la vraie fiche au milieu, ' +
               'tu touches une zone pour changer son titre, son aide, son fond (9 couleurs, Léger / Franc / Très visible), son micro 🎙️, ' +
               'ses cases à cocher. 🧩 Les zones : l’ordre (↑ ↓) et masquer (👁️).' },
      { emoji: '☑',
        titre: 'Des cases à cocher qui écrivent une phrase',
        texte: 'Un libellé court pour le moniteur, la phrase qui s’écrit dans le cadre (en tête ou à la fin), cochée d’office ou non. ' +
               'Les cases d’origine se modifient aussi.' },
      { emoji: '💾',
        titre: 'Brouillon, essai, publication',
        texte: 'Tout part dans un brouillon ; « 👁️ Essayer comme un moniteur » ; « 💾 Publier » l’envoie à tous ; « ⧉ Copier vers… » reporte ' +
               'sur d’autres modèles ; « ↺ Comme avant » remet la fiche d’origine. Une fiche déjà commencée garde sa forme jusqu’à la fin du cours.' }
    ]
  },
  {
    version: 1205,
    date: 'Samedi 17 octobre 2026',
    resume: '🖼️ Tes propres décors fixes dans les thèmes, glissés sur la télé',
    quoi: [
      { emoji: '🖼️',
        titre: 'Tes décors fixes',
        texte: 'Dans le studio d’un thème › ✨ L’animation › « ➕ Ajouter un décor (PNG) » : choisis une image, glisse-la sur la télé ' +
               'en petit, tire le coin ◢ pour sa taille. Une place pour l’accueil, une pour la vitrine. Ils passent derrière les cours, ' +
               'le QR et la météo.' },
      { emoji: '✂️',
        titre: 'Les PNG détourés restent détourés',
        texte: 'Une image avec du transparent (décor, petite image animée « Ta photo ») garde sa transparence au lieu d’arriver sur un fond noir.' }
    ]
  },
  {
    version: 1204,
    date: 'Samedi 17 octobre 2026',
    resume: '📐 Le QR se place et se dimensionne en le glissant sur la télé',
    quoi: [
      { emoji: '📐',
        titre: 'Le QR, où tu veux et de la taille que tu veux',
        texte: '⚙️ Réglages › 🔳 QR code › « 📐 Le placer sur la télé » : la vraie page de la télé en petit, tu glisses l’encart, ' +
               'tu tires le coin ◢ pour l’agrandir, 💾. Une place pour l’accueil, une pour la vitrine, la même pour toutes les diapositives. ' +
               '« ↺ En bas à droite » le remet comme avant.' },
      { emoji: '🖥️',
        titre: 'Les aperçus toujours à jour',
        texte: 'Les télés en petit d’Affichage ne montrent plus une ancienne version de l’écran après une mise à jour.' }
    ]
  },
  {
    version: 1203,
    date: 'Samedi 17 octobre 2026',
    resume: '🔳 Le QR posé par-dessus les diapositives ; la vitrine sans l’en-tête de l’accueil',
    quoi: [
      { emoji: '🔳',
        titre: 'Le QR code ne prend plus de colonne',
        texte: 'Les diapositives gardent toute la largeur : l’encart du QR est posé dessus, en transparence. Le code lui-même reste ' +
               'noir sur son carré blanc, pour que les téléphones le lisent.' },
      { emoji: '🪟',
        titre: 'La vitrine en mise en page',
        texte: 'Le nom, la date, la météo et l’heure de l’accueil ne s’affichent plus en haut à gauche de la vitrine : sa date, son heure ' +
               'et sa météo sont dans son bloc « La météo, la date et l’heure ».' }
    ]
  },
  {
    version: 1202,
    date: 'Samedi 17 octobre 2026',
    resume: '🏁 Le résultat du post-permis visible dans le dossier de l’élève',
    quoi: [
      { emoji: '🏁',
        titre: 'Le post-permis, lisible sans ouvrir le compte rendu',
        texte: 'Dans Élèves › dossier › 📚 Cours, la ligne « RDV post-permis » dit ce qui a été décidé (« 4 + 3h avant repassage », ' +
               '« ⛔ Pas de repassage »…) et, en 🔒, le commentaire pour le bureau. Visible pour l’équipe seulement.' },
      { emoji: '🔒',
        titre: 'Le commentaire pour le bureau reste chez nous',
        texte: 'Il ne part plus quand on renvoie le bilan d’un post-permis par ✉️, et n’apparaît plus dans « Mes leçons » de l’élève.' }
    ]
  },
  {
    version: 1201,
    date: 'Samedi 17 octobre 2026',
    resume: '🖥️ Placer les blocs des télés, « Vos cours commencent », et les thèmes des saisons',
    quoi: [
      { emoji: '🧩',
        titre: 'La mise en page des télés',
        texte: '⚙️ Réglages › « Mises en page » : ✏️ ouvre la vraie page de la télé en petit. Glisse un bloc (météo, heure, ' +
               'cours à venir, QR…) pour le déplacer, tire un coin pour sa taille, change son fond, sa forme, son texte, ou masque-le d’un 👁️. ' +
               'Une mise en page par écran (accueil, vitrine) ; « D’origine » remet l’écran d’avant.' },
      { emoji: '⏰',
        titre: '« Vos cours commencent » à ton goût',
        texte: 'Dans le même studio, l’onglet ⏰ : les titres, ce qu’il y a derrière (voile, couleur ou photo), les cartes, ' +
               'l’heure en pastille, avec ou sans moniteur et véhicule. Le QR se retire pendant cet écran.' },
      { emoji: '🍂',
        titre: 'Les thèmes des saisons et des fêtes',
        texte: 'Dix thèmes (automne, Halloween, Noël, hiver, Nouvel An, Saint-Valentin, printemps, Pâques, été, 14 juillet) changent ' +
               'les couleurs et font tomber ou monter de petites images, chacun à ses dates. Ils sont allumés : 🍂 l’automne est déjà sur les télés. ' +
               'Un appui en coupe un, ou tous avec « Thèmes automatiques ». ✏️ change ses images (même ta photo), ses couleurs, ses dates.' }
    ]
  },
  {
    version: 1200,
    date: 'Samedi 17 octobre 2026',
    resume: '📚 La photothèque de l’école, dans le studio de diapositives',
    quoi: [
      { emoji: '📚',
        titre: 'Les photos de l’école, gardées une fois',
        texte: 'Dans le studio, « 📷 Photo » (et le fond en photo) propose de prendre une photo, d’en choisir une, ou de piocher ' +
               'dans la photothèque : véhicules, bureaux, événements. Coche « ➕ Garder dans la photothèque » en ajoutant une photo ' +
               'pour la retrouver dans les prochaines diapositives.' },
      { emoji: '⋯',
        titre: 'Ranger la photothèque',
        texte: 'Le ⋯ d’une photo la renomme, la change de rangement ou la retire. La retirer ne l’enlève pas des diapositives qui s’en servent.' }
    ]
  },
  {
    version: 1199,
    date: 'Samedi 17 octobre 2026',
    resume: '🎨 Le studio : créer ses diapositives dans l’appli, et les transitions',
    quoi: [
      { emoji: '🎨',
        titre: 'Créer une diapositive, comme dans Canva',
        texte: 'Dans 📺 Affichage › 🖼️ Diapositives, « ➕ Nouvelle diapositive » propose d’abord 🎨 Créer une diapositive : on part ' +
               'd’un des sept modèles, puis on touche un élément pour le modifier, on le glisse, on tire un coin pour l’agrandir. ' +
               'Textes, photos, pastilles, pictogrammes, QR code, logo, formes, n’importe quelle couleur. Les zones hachurées montrent ' +
               'la place du planning et du QR sur la télé ; l’accueil et la vitrine ont chacun leur rangement.' },
      { emoji: '⭐',
        titre: 'Tes propres modèles',
        texte: '« ⭐ Garder comme modèle » range une diapositive dans « ⭐ Tes modèles ». Et « ⧉ » repart d’une diapositive déjà faite.' },
      { emoji: '✨',
        titre: 'Les transitions',
        texte: 'Dans ⚙️ Réglages : fondu, glisser, monter, zoom, volet ou au hasard, rapide, normale ou lente. Une diapositive du ' +
               'studio peut avoir la sienne, et ses éléments peuvent arriver un par un.' },
      { emoji: '🩹',
        titre: 'Un texte défilant reste un texte défilant',
        texte: 'Rouvert pour être modifié, il repassait en « diapositive du carrousel » sans qu’on le demande. Corrigé, comme pour une vidéo.' }
    ]
  },
  {
    version: 1198,
    date: 'Vendredi 16 octobre 2026',
    resume: '📺 Affichage repensé, et le QR de Saint-Brieuc sur les écrans',
    quoi: [
      { emoji: '📺',
        titre: 'La page Affichage, en trois onglets',
        texte: 'En arrivant : 📅 Planning. Un seul planning pour tous les jours (Aujourd’hui, Demain, ou un autre jour), une carte par cours ' +
               'avec des puces à toucher pour le moniteur, le véhicule et le lieu. Les cours passés et retirés sont repliés en bas. ' +
               'Les aperçus des deux télés se replient (repliés sur le téléphone).' },
      { emoji: '⠿',
        titre: 'Le carrousel se range en glissant',
        texte: 'Dans 🖼️ Diapositives, attrapez ⠿ et glissez la diapositive à sa place : l’ordre est enregistré. ' +
               'Ce qui est toujours à l’écran (défilant, fond, texte fixe) est à part ; les diapositives en pause ou terminées sont repliées.' },
      { emoji: '🔳',
        titre: 'Le QR code de Saint-Brieuc sur les télés',
        texte: 'Un encart fixe en bas à droite, avec sa phrase ; le carrousel se resserre pour ne rien cacher. Un interrupteur par écran ' +
               'et la phrase dans ⚙️ Réglages. Il ne s’affiche que si la page publique de Saint-Brieuc est ouverte.' }
    ]
  },
  {
    version: 1197,
    date: 'Vendredi 16 octobre 2026',
    resume: '🆕 Un élève créé par l’évaluation se retrouve tout de suite',
    quoi: [
      { emoji: '🆕',
        titre: 'Plus d’attente après une évaluation',
        texte: 'Quand l’évaluation crée l’élève, la liste des élèves de l’appareil est relue aussitôt : la recherche du dossier ' +
               'et les champs à suggestions le trouvent tout de suite, sans attendre le prochain démarrage.' }
    ]
  },
  {
    version: 1196,
    date: 'Vendredi 16 octobre 2026',
    resume: '📷 Évaluation : la photo du simulateur juste sous « Formation »',
    quoi: [
      { emoji: '📷',
        titre: 'La photo d’abord',
        texte: 'Élèves › Administratif › Évaluation : les photos du résultat du simulateur sont juste sous « Formation », ' +
               'et se prennent avant même de taper le nombre d’heures.' }
    ]
  },
  {
    version: 1195,
    date: 'Vendredi 16 octobre 2026',
    resume: '🪪 L’équipe : photo, adresse, portable, mail et RIB sur la fiche',
    quoi: [
      { emoji: '🖼️',
        titre: 'La photo de la messagerie, sur la fiche',
        texte: 'La même photo que dans 💬 : en tête de la fiche et dans la liste de l’équipe. 📷 pour la changer — la sienne ' +
               'dans Ma fiche, celle de tout le monde pour un administrateur. Changée ici, elle change dans la messagerie.' },
      { emoji: '🪪',
        titre: 'Un onglet Coordonnées',
        texte: 'Adresse, portable, adresse mail (la même que dans ⚙️ Accès : on la change d’un côté, elle change de l’autre) ' +
               'et le RIB, déposé en photo ou PDF. Chaque ligne a son interrupteur 👁️ ; ce qui est allumé, la personne le voit et peut le corriger.' }
    ]
  },
  {
    version: 1194,
    date: 'Vendredi 16 octobre 2026',
    resume: '👁️ L’équipe : un interrupteur par ligne pour ce que chacun voit de sa fiche',
    quoi: [
      { emoji: '👁️',
        titre: 'Ce que chacun voit dans « Ma fiche »',
        texte: 'Outils › 👥 Équipe, fiche d’une personne : un interrupteur au bout de chaque papier, absence, bloc d’heures ' +
               'et résultat. Tout est caché au départ ; ce qu’on allume apparaît dans sa fiche (⋯ › 👤 Ma fiche). ' +
               'Ce qu’elle dépose elle-même reste visible tant que ça attend. Elle n’est alertée que de ce qu’on lui montre.' },
      { emoji: '🏥',
        titre: 'Médecine du travail : seulement si on l’ajoute',
        texte: 'Elle n’est plus attendue d’office sur les fiches. On l’ajoute avec « ➕ Ajouter un papier » quand on veut la suivre.' }
    ]
  },
  {
    version: 1193,
    date: 'Vendredi 16 octobre 2026',
    resume: '💶 Tout est payé · 📆 Tout est planifié dans Suivi permis',
    quoi: [
      { emoji: '💶',
        titre: 'Deux cases dans « Sa préparation »',
        texte: '🎓 Suivi permis, fiche de la place : 💶 Tout est payé et 📆 Tout est planifié. Tant qu’elles ne sont pas ' +
               'cochées, 💶 et 📆 suivent le prénom sur la session fermée, et « Il doit de l’argent » / « Il doit planifier ' +
               'encore des choses » s’écrivent dessous quand elle est ouverte.' },
      { emoji: '✅',
        titre: 'Vert seulement avec « Tout est OK »',
        texte: 'Un élève ne passe au vert que si « Tout est OK — il peut passer » est coché. Sinon il reste orange, ' +
               'avec « à valider » quand plus rien ne manque.' }
    ]
  },
  {
    version: 1192,
    date: 'Vendredi 16 octobre 2026',
    resume: '💬 Suivi permis : c’est la bulle elle-même qui passe au vert',
    quoi: [
      { emoji: '💬',
        titre: 'Une bulle verte, sans rond derrière',
        texte: 'Dans 🎓 Suivi permis, la bulle du groupe est grise tant qu’il n’est pas fait, et devient verte une fois fait.' }
    ]
  },
  {
    version: 1191,
    date: 'Vendredi 16 octobre 2026',
    resume: '🔴 ELEVE PAS PREVENU sur la ligne d’examen · 💬 bulle verte',
    quoi: [
      { emoji: '🔴',
        titre: 'Sur la ligne rouge de 📅 Mes prochains cours',
        texte: 'Au bout de « EXAMEN OFFICIEL PRÉVU LE … » : ELEVE PAS PREVENU tant que le 📣 n’est pas coché ' +
               'dans 🎓 Suivi permis, ou ELEVE FANTOME / ELEVE A REMPLACER selon sa fiche. Coché, la mention s’en va. ' +
               'L’étiquette qui l’écrivait en dessous est retirée.' },
      { emoji: '💬',
        titre: 'La bulle du groupe, en vert',
        texte: 'Dans 🎓 Suivi permis, un appui sur la bulle 💬 la passe au vert : groupe fait. ' +
               'Elle passe au vert toute seule quand le groupe de la messagerie de la session existe.' }
    ]
  },
  {
    version: 1190,
    date: 'Vendredi 16 octobre 2026',
    resume: '📣 Messenger permis reprend toutes les dates de 🎓 Suivi permis',
    quoi: [
      { emoji: '📣',
        titre: 'Plus de date oubliée',
        texte: 'Messenger permis montre chaque session à venir de 🎓 Suivi permis, avec ses élèves. ' +
               'Une date déplacée, un repassage ou un ancien « annulé » sur la fiche faisaient disparaître des élèves, ' +
               'parfois une date entière : c’est la session qui décide maintenant.' }
    ]
  },
  {
    version: 1189,
    date: 'Vendredi 16 octobre 2026',
    resume: '👤 Ma fiche : tes papiers et tes arrêts, avec un rappel avant chaque échéance',
    quoi: [
      { emoji: '👤',
        titre: 'Ma fiche',
        texte: '⋯ › 👤 Ma fiche : ton autorisation d’enseigner, ton certificat médical, ton permis, la médecine du travail, ' +
               'avec leurs dates. Tu y déposes un papier ou un arrêt de travail (photo ou PDF) ; l’administration le valide.' },
      { emoji: '🔔',
        titre: 'Prévenu avant l’échéance',
        texte: 'Une notification et un mail 4 mois puis 2 mois avant la fin d’un de tes papiers, et une ligne 📄 dans le bandeau.' },
      { emoji: '👥',
        titre: 'Outils › L’équipe (administrateurs)',
        texte: '👥 Équipe : la fiche de chacun (papiers, absences, cours donnés, résultats). La liste et 💶 Paie se suivent : ' +
               'une personne créée, renommée ou partie d’un côté l’est aussi de l’autre. Une copie d’arrêt se joint aussi depuis la Paie. ' +
               '🏫 L’école : agrément, réactualisation de l’exploitant, label, Qualiopi, garantie financière, avec les fenêtres d’audit. ' +
               'Accès : ⚙️ › « 👥 Équipe et échéances ».' }
    ]
  },
  {
    version: 1188,
    date: 'Vendredi 16 octobre 2026',
    resume: '👤 Dans un groupe, le nom d’un élève ouvre son dossier',
    quoi: [
      { emoji: '👤',
        titre: 'Des noms qui mènent au dossier',
        texte: 'Dans 💬 Messagerie, fiche d’un groupe (à droite, ou ⓘ sur le téléphone) : touche le nom d’un élève ' +
               'pour ouvrir son dossier. L’équipe et la boîte du bureau restent écrites comme avant.' }
    ]
  },
  {
    version: 1187,
    date: 'Vendredi 16 octobre 2026',
    resume: '🦊 L’émoji de chaque moniteur revient sur la fiche véhicule des bilans AAC',
    quoi: [
      { emoji: '🦊',
        titre: 'Les manœuvres faites avec un collègue',
        texte: 'Sur la fiche véhicule des bilans AAC, une manœuvre faite avec un autre moniteur porte son émoji, ' +
               'et plus seulement ✅. Prévu le 10 octobre, il ne s’affichait jamais : c’est réparé.' }
    ]
  },
  {
    version: 1186,
    date: 'Jeudi 15 octobre 2026',
    resume: '📞 Appels vocaux et vidéo dans la messagerie',
    quoi: [
      { emoji: '📞',
        titre: 'Appeler depuis un fil',
        texte: 'Le combiné en tête du fil ouvre « Appeler — qui sonne ? » : tous les membres du fil sont cochés, ' +
               'tu décoches qui ne doit pas sonner (6 personnes au plus). Puis Appel vidéo, Appel vocal ou 📅 Plus tard.' },
      { emoji: '🔔',
        titre: 'Tu entends que ça sonne',
        texte: 'Tant que personne n’a décroché : « Ça sonne chez … » à l’écran, et la tonalité d’un vrai téléphone. ' +
               'Tout s’arrête dès que quelqu’un répond.' },
      { emoji: '🔇',
        titre: 'Couper le micro, couper le son',
        texte: 'Micro et Haut-parleur, côte à côte, en vocal comme en vidéo. En vocal, si le téléphone le permet, ' +
               'Haut-parleur propose aussi « À l’oreille ».' },
      { emoji: '🔽',
        titre: 'Réduire',
        texte: 'L’appel continue dans une pastille en haut à droite, et l’appli reste utilisable (dossier, bilan…). ' +
               '« Revenir » rouvre l’appel. Sur ordinateur, « Partager l’écran » montre un bilan pendant qu’on en parle.' },
      { emoji: '🔑',
        titre: 'Un élève n’appelle que si on le lui ouvre',
        texte: 'Deux interrupteurs dans l’onglet 🔑 de sa fiche : vocal, vidéo. Fermés par défaut. ' +
               'Rien n’est enregistré : ni le son, ni l’image.' }
    ]
  },
  {
    version: 1185,
    date: 'Jeudi 15 octobre 2026',
    resume: '🕘 Tes notifications sonnent aux heures que tu choisis, appareil par appareil',
    quoi: [
      { emoji: '🕘',
        titre: 'Tes heures, par appareil',
        texte: 'Dans 💬 Messagerie, sur le bandeau des notifications : 🕘 Horaires. Plusieurs créneaux par jour, ' +
               'un réglage par téléphone ou ordinateur. Un appareil qu’on active reprend les heures d’un autre des tiens.' },
      { emoji: '📋',
        titre: 'Le résumé au retour',
        texte: 'En dehors de tes heures, rien ne sonne : un seul résumé arrive au début de ton créneau suivant.' },
      { emoji: '🚨',
        titre: 'Ce qui sonne quand même',
        texte: 'Tu coches ce qui doit passer à toute heure. Au départ : les retards et les annulations.' },
      { emoji: '🌴',
        titre: 'Pause jusqu’au…',
        texte: 'Vacances, jour férié : 🌴 Mettre en pause jusqu’à une date et une heure, puis « Reprendre maintenant » quand tu veux.' }
    ]
  },
  {
    version: 1184,
    date: 'Jeudi 15 octobre 2026',
    resume: '📊 L’évaluation de départ arrive dans le dossier de l’élève, avec sa frise et ses photos',
    quoi: [
      { emoji: '📊',
        titre: 'Élèves › Administratif › 📊 Évaluation',
        texte: 'Tu tapes le nom de l’élève : l’appli le trouve, ou le crée (nom, téléphone et mail obligatoires). ' +
               'L’évaluation se range dans son dossier, onglet 📊 Évaluation.' },
      { emoji: '🚗',
        titre: '« Il part en » BV ou BEA',
        texte: 'Le choix de la boîte pose la bonne frise toute seule, et le bon montant dans son dossier. ' +
               'AAC et CS : le forfait du pack de 💰 Tarifs. Si une formation ou une frise existe déjà, l’appli demande si on remplace.' },
      { emoji: '📷',
        titre: 'Les photos du simulateur',
        texte: 'Prendre une photo ou la choisir dans la galerie : elles restent dans son dossier.' },
      { emoji: '🆔',
        titre: 'L’Id Drivup en tête du dossier',
        texte: 'À côté de la formation, visible partout dans le dossier : il distingue les homonymes. ' +
               'Le bureau et les administrateurs le corrigent à la main si l’import s’est trompé.' }
    ]
  },
  {
    version: 1182,
    date: 'Jeudi 15 octobre 2026',
    resume: '🚗 Les rappels reprennent la voiture et le simulateur depuis Drivup',
    quoi: [
      { emoji: '🚗',
        titre: 'La voiture du planning Drivup',
        texte: 'Les numéros posés en haut du planning (« .1 », « .7 ») remplissent la voiture du rappel. ' +
               'La correspondance se règle dans la fiche du véhicule (Flotte), case « N° Drivup ».' },
      { emoji: '🖥️',
        titre: 'Le type de leçon',
        texte: 'Conduite, examen blanc et simulateur avec moniteur sont lus dans le titre du cours Drivup. ' +
               'Pré-rempli dans le rappel, et toujours modifiable.' },
      { emoji: '🆔',
        titre: 'La pièce d’identité',
        texte: 'Dans Mes prochains cours, à côté du 🆔 : « DOIT DEPOSER SA PIECE D’IDENTITE AU BUREAU ».' }
    ]
  },
  {
    version: 1180,
    date: 'Jeudi 15 octobre 2026',
    resume: '↩️ Répondre à un message précis, comme sur Messenger',
    quoi: [
      { emoji: '↩️',
        titre: 'Trois façons de répondre',
        texte: 'Appui long sur la bulle puis ↩️, glisser la bulle vers la droite, ou ↩️ au survol sur ordinateur. ' +
               'Le message cité s’affiche au-dessus de ta réponse.' },
      { emoji: '👆',
        titre: 'Remonter au message',
        texte: 'Toucher la citation remonte au message d’origine dans le fil. Les élèves peuvent répondre de la même façon.' }
    ]
  },
  {
    version: 1179,
    date: 'Mercredi 14 octobre 2026',
    resume: '💰 Tarifs : un prix changé met tout à jour',
    quoi: [
      { emoji: '💰',
        titre: 'Outils › Argent › 💰 Tarifs',
        texte: 'Les prix, les fiches, Imprimer vite, et le devis d’évaluation. Un tarif unitaire changé met à jour ' +
               'toutes les fiches et tous les totaux.' },
      { emoji: '🖨️',
        titre: 'Imprimer, envoyer',
        texte: 'Impression PDF, export JPG pour le site, plusieurs PDF par mail, et des boutons d’impression rapide. ' +
               'La fenêtre des boutons a un ✕ en haut et défile sur les petits écrans.' }
    ]
  },
  {
    version: 1177,
    date: 'Mercredi 14 octobre 2026',
    resume: '👀 Le bureau partage sa lecture : un fil ouvert par l’un s’éteint chez les autres',
    quoi: [
      { emoji: '👀',
        titre: 'Un seul point à éteindre',
        texte: 'Quand quelqu’un du bureau ou un administrateur ouvre un fil bureau, vitrine, retard, annulation, ' +
               'oubli ou groupe, le point s’éteint chez les autres du bureau. La liste affiche « 👀 » et le prénom à la place.' },
      { emoji: '🎯',
        titre: 'Les moniteurs gardent le leur',
        texte: '« Vu par » ne change pas : il ne montre que ceux qui ont vraiment ouvert. Un nouveau message rallume ' +
               'le point chez tout le monde. Les options se règlent dans ⚙️ de la messagerie (administrateurs).' }
    ]
  },
  {
    version: 1176,
    date: 'Mercredi 14 octobre 2026',
    resume: '☠️ Les remarques du CEPC s’écrivent d’un appui à l’examen',
    quoi: [
      { emoji: '☠️',
        titre: 'Après la ligne du CEPC, la remarque',
        texte: 'Examen blanc et examen officiel : après ☠️ ou ⚠️ et le choix de la ligne, la liste des remarques de cette ligne ' +
               's’ouvre. Un appui l’écrit dans « Remarque de l’inspecteur » ; tu la complètes ensuite sur la ligne ou dans le bilan.' },
      { emoji: '✍️',
        titre: 'Écrire directement',
        texte: 'Le premier bouton ferme la liste et met le curseur dans la ligne.' },
      { emoji: '➕',
        titre: 'La liste de toute l’équipe',
        texte: 'Une remarque qui manque se crée d’un geste et rejoint la liste de tous. « ✏️ Modifier la liste » pour corriger ' +
               'ou retirer. Les plus utilisées remontent en haut. La liste marche aussi sans réseau.' }
    ]
  },
  {
    version: 1175,
    date: 'Mercredi 14 octobre 2026',
    resume: '📋 Les renseignements et disponibilités des élèves remplacent le Google Form',
    quoi: [
      { emoji: '📋',
        titre: 'Dans l’espace élève',
        texte: 'Le questionnaire « Mes renseignements et disponibilités » s’ouvre tout seul tant qu’il n’est pas rempli ' +
               '(« Plus tard » le remet au lendemain). Les réponses arrivent dans 📇 Fiche, sous 🪑 Poste de conduite.' },
      { emoji: '👥',
        titre: '👥 Élèves › 📋 Renseignements',
        texte: 'Qui n’a pas répondu, demandé quand, relancé combien de fois. 📨 le lui demande dans sa messagerie ; ' +
               'une relance part toute seule (3 jours après sa première visite, puis tous les 7 jours, 3 fois au plus).' },
      { emoji: '✏️',
        titre: 'Remplir avec lui',
        texte: 'Depuis sa fiche, au bureau ou au téléphone : le même questionnaire, avec ses réponses.' },
      { emoji: '🛠️',
        titre: 'Le questionnaire se modifie (administrateurs)',
        texte: 'Catégories, questions, textes de la carte et relances. Une question obligatoire ajoutée est redemandée ' +
               'à ceux qui avaient tout rempli. 📥 reprend les réponses du Google Form (fichier CSV).' }
    ]
  },
  {
    version: 1174,
    date: 'Mercredi 14 octobre 2026',
    resume: '⚡ Les réponses rapides se règlent, et 📄 Modèles messages s’ouvre depuis le fil',
    quoi: [
      { emoji: '⚡',
        titre: 'Le gestionnaire des réponses rapides',
        texte: '⚙️ de la messagerie › ⚡ Réponses rapides (administrateurs) : changer le texte d’un bouton et son message, ' +
               'en créer, choisir les conversations où il apparaît (Bureau, Vitrine, Retards…), et l’ordre par ⠿ ou ↑ ↓.' },
      { emoji: '🔤',
        titre: 'Des mots qui se remplacent',
        texte: '{prénom}, {nom}, {moi}, {bureau}, {moniteur}, {prochain cours}, {frise}, {examen blanc}, {date d’examen} : ' +
               '« Bonjour {prénom} » part en « Bonjour Léa ».' },
      { emoji: '📄',
        titre: 'Modèles messages depuis le fil',
        texte: 'Au bout des réponses rapides : catégorie, puis fiche — son texte arrive dans la zone d’écriture, mots ' +
               'remplacés, à relire avant d’envoyer. Plus de copier-coller.' },
      { emoji: '📱',
        titre: 'Tous les boutons sur le téléphone',
        texte: 'Ils passent à la ligne au lieu d’être coupés à trois.' }
    ]
  },
  {
    version: 1173,
    date: 'Mercredi 14 octobre 2026',
    resume: '🔄 Plus besoin de recharger : sessions et horaires des bureaux se mettent à jour seuls',
    quoi: [
      { emoji: '🎓',
        titre: 'Suivi permis se relit tout seul',
        texte: 'Un élève posé sur une place (depuis la place, son dossier ou la liste RDV Permis) apparaît dans ' +
               '🎓 Suivi permis sans recharger la page.' },
      { emoji: '📍',
        titre: 'Les horaires repris de Drivup apparaissent tout de suite',
        texte: 'Après le favori, l’écran Loudéac / St-Brieuc Horaires et RDV montre les nouvelles ouvertures sans recharger.' },
      { emoji: '🔴',
        titre: 'La vitrine : « le bureau vous a répondu »',
        texte: 'Sur la page du QR code, « Reprendre la discussion » porte le nombre de réponses du bureau pas encore lues, ' +
               'et la page le dit.' }
    ]
  },
  {
    version: 1172,
    date: 'Mercredi 14 octobre 2026',
    resume: '✋ Préparation permis : les heures du groupe se changent à la main',
    quoi: [
      { emoji: '✋',
        titre: 'Message groupe Messenger : toutes les heures à la main',
        texte: 'Le rendez-vous, et pour chaque élève le début et la fin de sa conduite et de son examen : touche une ' +
               'case et tape l’heure. Elle passe en vert et ne bouge plus ; elle est gardée avec la session, sur tous ' +
               'les appareils. ↩️ revient au calcul.' },
      { emoji: '📥',
        titre: 'Les conduites reprises de Drivup',
        texte: 'Si le favori a lu le planning du jour, les conduites prennent ses heures (cases en pointillés). ' +
               'Le rendez-vous, les écoutes et la pause suivent.' },
      { emoji: '🕐',
        titre: '« Horaires modifiés » dans le groupe 💬',
        texte: 'Si le groupe de la messagerie est déjà créé, changer une heure y envoie « 🕐 Horaires modifiés » avec ' +
               'les nouvelles heures, 20 secondes après la dernière retouche (ou tout de suite avec « Envoyer maintenant »).' },
      { emoji: '🧹',
        titre: 'Plus de « Sans session »',
        texte: 'Un élève qui n’est plus dans une session n’apparaît plus ici : les groupes sont les sessions de 🎓 Suivi permis.' }
    ]
  },
  {
    version: 1171,
    date: 'Mercredi 14 octobre 2026',
    resume: '👋 La vitrine : les passants écrivent au bureau depuis le QR code',
    quoi: [
      { emoji: '💬',
        titre: 'Écrire au bureau, depuis la page du QR code',
        texte: 'Un bouton « 💬 Écrire au bureau » sur la page de la vitrine : prénom, téléphone, mail et message. ' +
               'La discussion arrive dans 💬 Messagerie › 👋 Vitrine, avec l’étiquette « VITRINE · LOUDÉAC ». ' +
               'Tu réponds au nom du bureau : en direct si sa page est ouverte, par mail sinon.' },
      { emoji: '🔗',
        titre: 'Rattacher, créer sa fiche, bloquer',
        texte: 'Dans la fiche ⓘ : 📞 l’appeler, ➕ créer sa fiche élève, 🔗 rattacher la discussion au dossier d’un ' +
               'élève (elle devient son fil « Le bureau »), 🔒 clore ou 🚫 bloquer. Tant qu’elle n’est pas rattachée, ' +
               'rien du dossier n’est dit : n’importe qui peut écrire sous le nom d’un autre.' },
      { emoji: '🔘',
        titre: 'Un quatrième interrupteur par bureau',
        texte: 'Gestion › Loudéac / St-Brieuc Horaires et RDV › « 💬 Discussion en direct ». Coupé au départ : ' +
               'à toi de l’allumer. Les discussions sont effacées un mois après le dernier message.' }
    ]
  },
  {
    version: 1170,
    date: 'Mardi 13 octobre 2026',
    resume: '📍 Les bureaux : horaires et rendez-vous en ligne, avec un QR code en vitrine',
    quoi: [
      { emoji: '📍',
        titre: 'Gestion › Loudéac / St-Brieuc Horaires et RDV',
        texte: 'Les ouvertures de chaque bureau, qui le tient, les rendez-vous à venir, et l’affiche de la ' +
               'vitrine à imprimer : un QR code qui mène à la page du bureau (ouvert ou fermé maintenant, ' +
               'les horaires, et un rendez-vous de 30 minutes).' },
      { emoji: '📥',
        titre: 'Les horaires viennent de Drivup',
        texte: 'Le favori, cliqué sur le planning d’une agence, reprend les créneaux « Bureau Loudéac » des ' +
               'quatre semaines à venir. ✏️ un jour, ➕ ouvrir un autre jour ou 🔒 fermer aujourd’hui : ce qui ' +
               'est changé à la main l’emporte sur Drivup, jusqu’à ↩️.' },
      { emoji: '📅',
        titre: 'Les rendez-vous',
        texte: 'Confirmation et rappel la veille par mail pour le visiteur ; notification et mail pour le bureau, ' +
               'les administrateurs et la personne du jour. Un jour qui ferme avec des rendez-vous : tu choisis, ' +
               'un par un, annuler et prévenir ou t’en occuper.' },
      { emoji: '✉️',
        titre: 'Ton adresse mail dans ⚙️ Accès',
        texte: 'Chaque compte a maintenant une case ✉️ : c’est là qu’arrivent les rendez-vous pris au bureau.' }
    ]
  },
  {
    version: 1168,
    date: 'Mardi 13 octobre 2026',
    resume: '📥 Drivup : les bonnes heures, la formation, la photo et les notes',
    quoi: [
      { emoji: '🕐',
        titre: 'Les heures exactes',
        texte: 'Les cours lus dans Drivup arrivaient deux heures trop tard (8 h devenait 10 h). Ils arrivent ' +
               'maintenant à l’heure affichée dans Drivup.' },
      { emoji: '⏳',
        titre: 'La lecture se voit tout de suite',
        texte: 'L’onglet de l’appli montre la lecture en cours (cours lus / total), un peu plus rapide. La ' +
               'fenêtre tient dans l’écran : on fait défiler, et « Enregistrer » reste en bas.' },
      { emoji: '🎓',
        titre: 'La formation reprise',
        texte: 'La catégorie Drivup devient notre formation : B → BV, B (BEA) → BEA, CA → AAC BV, ' +
               'CS → CS BV, BEA -> B → Passerelle… Une case déjà remplie chez nous ne change pas.' },
      { emoji: '📷',
        titre: 'La photo et les notes internes',
        texte: 'La photo Drivup arrive pour un élève qui n’en a pas (fiche et planning). Sur la fiche d’un ' +
               'élève, ses notes internes Drivup passent dans 📝 Notes internes de son dossier, en ' +
               'Administratif, avec leur auteur et leur date — sans jamais en doubler une.' }
    ]
  },
  {
    version: 1167,
    date: 'Mardi 13 octobre 2026',
    resume: '🔗 Plus de doublons dans les élèves prêts au permis',
    quoi: [
      { emoji: '🔗',
        titre: 'Un nom presque pareil est le même élève',
        texte: 'Un nom mal écrit dans un bilan ou un message (un tiret bas, une lettre oubliée, les mots dans ' +
               'l’autre ordre) est rattaché à la fiche de l’élève, quand une seule fiche lui ressemble. ' +
               'Il ne fait plus de doublon, et l’élève retrouve sa place sur sa session d’examen.' },
      { emoji: '✏️',
        titre: 'Le corriger pour de bon',
        texte: 'La ligne dit « Aussi écrit … » : le bouton « 🔗 C’est le même élève : corriger » réécrit ' +
               'le mauvais nom dans le classeur.' }
    ]
  },
  {
    version: 1166,
    date: 'Mardi 13 octobre 2026',
    resume: '📥 Le planning et les fiches élèves arrivent de Drivup',
    quoi: [
      { emoji: '📥',
        titre: 'Le favori « Bilan de conduite »',
        texte: 'Dans ➕ Ajouter des élèves, glisse le bouton « 📥 Bilan de conduite » dans ta barre de favoris ' +
               'Chrome. Clique-le ensuite sur une page Drivup (planning d’une agence ou d’un moniteur, liste ' +
               'des élèves, fiche d’un élève) : l’appli montre ce qui change et attend que tu valides. Rien ' +
               'n’est écrit dans Drivup. Réservé aux administrateurs et au bureau.' },
      { emoji: '🔔',
        titre: 'Les rappels déjà remplis',
        texte: 'Une fois le planning lu, les créneaux des rappels montrent l’élève et la séance de chaque cours ' +
               'Drivup, « 📥 à envoyer » ou « ✉️ envoyé ». Un appui remplit l’élève, l’heure et le type ; ' +
               'après un envoi, le cours suivant se choisit tout seul.' },
      { emoji: '🪪',
        titre: 'Les fiches se complètent',
        texte: 'Un élève nouveau dans Drivup reçoit sa fiche. Pour les autres, seules les cases vides chez nous ' +
               'se remplissent (mobile, mail, formation, date de naissance, NEPH) : rien n’est jamais remplacé.' }
    ]
  },
  {
    version: 1165,
    date: 'Mardi 13 octobre 2026',
    resume: '🖼️ Les photos dans la recherche d’élèves',
    quoi: [
      { emoji: '🔍',
        titre: 'Tu le reconnais avant de lire son nom',
        texte: 'Dans la loupe en haut et dans la recherche du dossier élève, la photo de l’élève ' +
               'remplace ses initiales quand il en a une. Sans photo, les initiales restent.' }
    ]
  },
  {
    version: 1164,
    date: 'Mardi 13 octobre 2026',
    resume: '✉️ Le bilan du rendez-vous post-permis part par mail',
    quoi: [
      { emoji: '✉️',
        titre: 'À la fin d’un post-permis',
        texte: 'Après « Terminer », l’écran reste ouvert : « ✉️ Envoyer le bilan par mail » envoie à ' +
               'l’élève la conclusion, le bilan de son examen, le sien et tes remarques. Le commentaire ' +
               'pour le bureau ne part pas. « ← Revenir à mes cours » referme l’écran.' }
    ]
  },
  {
    version: 1163,
    date: 'Mardi 13 octobre 2026',
    resume: '🖼️ Les photos à la place des initiales',
    quoi: [
      { emoji: '🖼️',
        titre: 'Ta photo, en rond',
        texte: 'Dans la messagerie, « Moi » en haut (sur le téléphone : la pastille « Moi » devant ' +
               '« Tout ») : prends une photo ou choisis-en une, elle remplace tes initiales pour toute ' +
               'l’équipe. Sans photo, les initiales restent, en rond elles aussi.' },
      { emoji: '💬',
        titre: 'Partout où l’on voit quelqu’un',
        texte: 'Dans la liste, en haut du fil, sur la fiche à droite, et devant les bulles comme sur ' +
               'Messenger. La photo de l’élève est aussi en tête de son dossier et sur sa carte dans Mes ' +
               'prochains cours. Les élèves choisissent la leur dans leur espace.' },
      { emoji: '🔑',
        titre: 'Qui change quoi',
        texte: 'Chacun la sienne ; le bureau la photo d’un groupe (⋯ ou la fiche du groupe) ; les ' +
               'administrateurs toutes les photos, et celle du bureau dans ⚙️ Réglages de la messagerie.' }
    ]
  },
  {
    version: 1162,
    date: 'Mardi 13 octobre 2026',
    resume: '🎓 Les sessions d’examen s’enregistrent tout de suite',
    quoi: [
      { emoji: '⚡',
        titre: 'Créer ou modifier une session, sans attendre',
        texte: 'La fenêtre se ferme dès l’appui et la session est déjà dans la liste, marquée « ⏳ ' +
               'enregistrement… » le temps que le classeur confirme. Tout part en un seul envoi — la ' +
               'session, ses places, ses élèves et leurs dates — et seul ce qui change est réécrit : ' +
               'changer le moniteur ne touche plus aux élèves. Un élève remplacé ou effacé repart dans ' +
               'RDV Permis. En cas de refus, la fenêtre revient avec ce que tu avais tapé.' },
      { emoji: '🔢',
        titre: 'Les places et le centre en pastilles',
        texte: 'Nombre de places : 1 · 2 · 3 · 4 · ⌨️ Autre, 3 d’avance. Centre : Saint-Brieuc · ' +
               'Loudéac · ⌨️ Autre.' },
      { emoji: '🟪',
        titre: 'Loudéac (ou ailleurs) en violet',
        texte: 'Une session hors Saint-Brieuc a un cadre violet très clair dans 🎓 Suivi permis, et sa ' +
               'fenêtre aussi, avec le centre en pastille à côté du titre.' }
    ]
  },
  {
    version: 1161,
    date: 'Mardi 13 octobre 2026',
    resume: '📎 Les pièces jointes, et la barre façon Messenger',
    quoi: [
      { emoji: '＋',
        titre: 'La barre d’écriture : 🎤, ＋, 🙂',
        texte: 'Le micro reste seul en premier. Le ＋ ouvre cinq gestes directs : prendre une ' +
               'photo, choisir une photo, filmer, choisir une vidéo, joindre un fichier. Sur un ' +
               'ordinateur, « Prendre une photo » utilise la webcam. Les icônes sont dessinées dans ' +
               'la couleur de l’appli, et le pouce n’a plus de pastille : il devient l’avion dès ' +
               'qu’on écrit. L’espace élève a la même barre.' },
      { emoji: '📎',
        titre: 'Envoyer un PDF, un Word ou un Excel',
        texte: 'Jusqu’à 10 Mo, dans les deux sens : les élèves aussi (10 fichiers par jour). La ' +
               'bulle montre le type, le nom et le poids ; un PDF s’ouvre dans un onglet, un Word ' +
               'ou un Excel se télécharge. Un fichier à macros est refusé, en le disant.' }
    ]
  },
  {
    version: 1160,
    date: 'Mardi 13 octobre 2026',
    resume: '🎓 Les fiches d’examen se retrouvent toutes seules',
    quoi: [
      { emoji: '↩️',
        titre: 'La carte reprend la fiche commencée',
        texte: 'Dans Mes prochains cours, la carte d’un élève dont la fiche d’examen est commencée le ' +
               'dit (« 📤 Avant examen envoyé à 09h40 — sa fiche t’attend ») et son bouton devient ' +
               '« ↩️ Reprendre sa fiche d’examen » : la fiche revient avec tout ce qui était rempli, ' +
               'au lieu d’une fiche vide. Après « Fermer », la liste revient tout de suite, sans recharger.' },
      { emoji: '🎓',
        titre: 'Mes examens, en haut de la fiche',
        texte: 'En haut d’une fiche d’examen officiel, les élèves du même bloc (même session du Suivi ' +
               'permis, ou à défaut même jour et même centre), dans l’ordre des passages : 📤 avant ' +
               'examen envoyé, 📝 commencée, ⏳ pas encore ouverte, ✍️ celle qu’on a sous les yeux. Un ' +
               'appui passe d’une fiche à l’autre en gardant la première. Un moniteur qui a deux blocs ' +
               'dans la journée ne voit que celui de l’élève.' }
    ]
  },
  {
    version: 1159,
    date: 'Mardi 13 octobre 2026',
    resume: '⛽ L’historique des pleins, avec ses filtres',
    quoi: [
      { emoji: '⛽',
        titre: 'Tous les pleins, de tous les mois',
        texte: 'Dans 🚗 Suivi de la flotte › ⛽ Les CB Gasoil : les mois en pastilles (ou « Tous les ' +
               'mois »), une période du … au …, et les filtres par véhicule et par moniteur, avec le ' +
               'total de chaque mois et de la sélection. ✏️ modifie tout un plein — date et heure, ' +
               'moniteur, carte, véhicule, montant, litres, km, remarque — et 🗑️ le supprime.' }
    ]
  },
  {
    version: 1158,
    date: 'Mardi 13 octobre 2026',
    resume: '📲 La leçon de veille AAC : Drivup, le livret, l’inspecteur',
    quoi: [
      { emoji: '📲',
        titre: 'La leçon de veille d’un élève en AAC',
        texte: 'Sur son dernier cours avant l’examen (dans les 3 jours), la carte de Mes prochains ' +
               'cours rappelle de vérifier son application Drivup : l’accès à son livret, et ce qu’il ' +
               'doit présenter à l’inspecteur. Le moniteur du cours le voit aussi en message important ' +
               'dans son bandeau, de l’heure du cours à 2 h après. La phrase et ses deux ' +
               'interrupteurs se règlent dans 🎓 Suivi AAC.' }
    ]
  },
  {
    version: 1156,
    date: 'Lundi 12 octobre 2026',
    resume: '🎓 Le dossier suit la veille de l’examen',
    quoi: [
      { emoji: '🎓',
        titre: 'La veille de l’examen, dans le dossier',
        texte: 'Un examen préparé n’est plus compté comme une leçon : « Prochaine : mar. 13 oct. — ' +
               '🎓 examen officiel à 14h15 · Loudéac ». Et « Avant l’examen » se décompte aussi pour ' +
               'les élèves dont les bilans n’écrivent pas « Xᵉ après l’examen blanc » (AAC) ou dont ' +
               'la leçon attend encore son bilan : « Plus que les 3h », puis « ✅ Tout est fait » ' +
               'une fois la leçon de veille passée.' }
    ]
  },
  {
    version: 1155,
    date: 'Lundi 12 octobre 2026',
    resume: '📞 Retard ou annulation reçus au téléphone · 👤 écrire seul à un élève',
    quoi: [
      { emoji: '📞',
        titre: 'Un élève prévient au téléphone',
        texte: 'Dans la messagerie, filtre ⏰ « ＋ Signaler un retard » ou filtre 🚫 « ＋ Signaler une ' +
               'annulation ». On choisit l’élève (et les minutes, ou le jour) : son cours est retrouvé, ' +
               'son moniteur entre dans la conversation et le reçoit sur son téléphone, comme si ' +
               'l’élève l’avait signalé lui-même.' },
      { emoji: '👤',
        titre: 'Écrire seul à un élève',
        texte: 'Dans une conversation où le bureau est avec l’élève, le ⋯ propose « 👤 Lui écrire ' +
               'seul » : ta conversation à deux avec lui, sans le bureau.' }
    ]
  },
  {
    version: 1154,
    date: 'Lundi 12 octobre 2026',
    resume: '📄 Un mot dans la messagerie quand le bilan part',
    quoi: [
      { emoji: '📄',
        titre: 'Le bilan est parti : l’élève le sait aussi dans sa messagerie',
        texte: 'Quand tu envoies le bilan par mail en fin de cours, le bureau lui écrit dans son ' +
               'fil « Le bureau » : « 📄 Ton bilan du cours du … vient de partir par mail. Tu le ' +
               'retrouves aussi ici, dans ton espace : 🏠 Accueil › 📖 Mes leçons. » Ça se règle ' +
               'pour toute l’école dans ⚙️ de la messagerie (administrateurs).' }
    ]
  },
  {
    version: 1150,
    date: 'Lundi 12 octobre 2026',
    resume: '✏️ Écrire en deux gestes · 💾 la carte SD oubliée',
    quoi: [
      { emoji: '✏️',
        titre: 'Écrire à quelqu’un, en deux gestes',
        texte: 'Le ＋ de la messagerie demande seulement « À qui ? » : tes récents et tes élèves ' +
               'du jour sont déjà là. Tu touches un nom et le fil s’ouvre, prêt à écrire — ou la ' +
               'conversation qui existe déjà. « Signé : 🏢 Le bureau · 👤 Moi seul » se règle ' +
               'au-dessus de la barre. Et dans « Rechercher partout », la première ligne est ' +
               '« ✏️ Écrire à … ».' },
      { emoji: '💾',
        titre: 'La carte SD oubliée',
        texte: 'L’élève dit dans quelle voiture et avec quel moniteur : un groupe s’ouvre avec ' +
               'le moniteur et le bureau. Trois raccourcis : « 💾 Elle est au bureau », « 🚗 Pas ' +
               'dans la voiture », « 🤝 Elle est rendue » — le moniteur du groupe peut les toucher ' +
               'lui-même. Et dans 🧤 Objets, « ＋ Ouvrir un oubli » quand c’est nous qui la trouvons.' }
    ]
  },
  {
    version: 1148,
    date: 'Lundi 12 octobre 2026',
    resume: '🗺️ Les voitures en direct',
    quoi: [
      { emoji: '📡',
        titre: 'Ta position pendant le cours',
        texte: 'Si tu as le relevé du trajet, la position de ta voiture part au bureau toutes ' +
               'les 30 s pendant le cours, page ouverte — la ligne du trajet affiche ' +
               '« 📡 position partagée ». Seule la dernière position est gardée, en mémoire, ' +
               'et elle s’efface 2 min après : rien n’est enregistré, aucune vitesse.' },
      { emoji: '🗺️',
        titre: 'La carte des voitures',
        texte: 'Gestion › Le parc › En direct (administrateurs) : les voitures en cours sur le ' +
               'Plan IGN, avec le moniteur et le dernier signal. « 📍 Centrer » amène la carte ' +
               'sur l’une d’elles.' }
    ]
  },
  {
    version: 1147,
    date: 'Lundi 12 octobre 2026',
    resume: '📊 Le journal en direct · 🎓 l’activité des élèves',
    quoi: [
      { emoji: '📊',
        titre: 'Le journal, en direct',
        texte: 'Outils › Journal (administrateurs) : 🟢 qui est en ligne et sur quel écran, ' +
               'puis chaque action au fil de l’eau — bilans, dossiers ouverts, cours, mails, ' +
               'SMS, paie, flotte… La liste se met à jour toute seule ; gardée 6 mois.' },
      { emoji: '🎓',
        titre: 'Ce que font les élèves dans leur espace',
        texte: 'Outils › Activité des élèves : connexions, bilans ouverts, messages, créneaux, ' +
               'notifications — le geste, jamais le contenu. Et dans le dossier de chacun, ' +
               'onglet 🔑 Accès, sa dernière venue. Gardé 12 mois.' }
    ]
  },
  {
    version: 1146,
    date: 'Lundi 12 octobre 2026',
    resume: 'Outils › Mesurer : ✉️ tous les mails envoyés',
    quoi: [
      { emoji: '✉️',
        titre: 'Les mails envoyés',
        texte: 'Dans Outils › Mesurer (administrateurs) : chaque mail parti de l’appli — bilan, ' +
               'rappel, correction, évaluation… — avec l’élève, le destinataire, qui l’a envoyé ' +
               'et s’il est bien parti. Les échecs ressortent en rouge avec leur motif. On touche ' +
               'une ligne pour relire le texte (gardé 3 mois ; la ligne reste 12 mois).' }
    ]
  },
  {
    version: 1145,
    date: 'Lundi 12 octobre 2026',
    resume: 'L’équipe et l’Argent passent dans Outils · heures des messages épinglés',
    quoi: [
      { emoji: '🔨',
        titre: 'Outils se range autrement',
        texte: 'Dans l’ordre : Mesurer · L’équipe (Messages internes, SMS, Tâches, Alertes) · ' +
               'Argent (Caisse, Coûts IA, Paie, Tarifs) · Demandes · Ce qu’on écrit. Gestion ' +
               'garde le parc et l’outil. Les droits ne changent pas.' },
      { emoji: '⏰',
        titre: 'Une heure de début et de fin pour les messages épinglés',
        texte: 'Dans 📨 Messages internes, « À partir du » et « Jusqu’au » prennent une heure : ' +
               'le message apparaît et disparaît à l’heure dite, sans recharger.' },
      { emoji: '📋',
        titre: 'Évaluations : plus de lignes Messenger / Drivup',
        texte: 'Le bilan d’évaluation ne demande plus « Envoyé par Messenger ? » ni « Envoyé ' +
               'par Drivup ? » : tout part par mail.' }
    ]
  },
  {
    version: 1144,
    date: 'Lundi 12 octobre 2026',
    resume: 'Examens : deux cases pour l’alerte de survitesse',
    quoi: [
      { emoji: '🚗',
        titre: 'L’alerte de survitesse',
        texte: 'Sur le Q3 n°10, l’A3 n°2 et les deux A3 de Loudéac, deux cases de plus sous ' +
               'l’installation (examen blanc et examen officiel) : « Tu as oublié d’enlever ' +
               'l’alerte de survitesse. » et « Pense à enlever l’alerte de survitesse. ». La ' +
               'voiture est celle que le bureau a posée sur l’écran d’accueil.' }
    ]
  },
  {
    version: 1143,
    date: 'Lundi 12 octobre 2026',
    resume: 'Évaluations : micros, cadre « Autre », leçons et aperçu du bilan',
    quoi: [
      { emoji: '🎙️',
        titre: 'Un micro sur chaque rubrique',
        texte: 'De « Manipulation commandes » à « Contrôles », chaque cadre a son 🎙️ au bout ' +
               'de la ligne.' },
      { emoji: '✏️',
        titre: 'Un cadre « Autre »',
        texte: 'Juste après Contrôles, pour ce qui ne rentre dans aucune rubrique. Rempli, il ' +
               's’écrit dans le bilan ; vide, il n’écrit rien.' },
      { emoji: '🕙',
        titre: 'Les heures et les leçons remplissent le bilan',
        texte: 'Heures de simulateur, leçons avant et après examen blanc : les ❓ du bilan se ' +
               'remplissent tout seuls, en leçons et en heures (« 8 séances de 2 heures (16h) »), ' +
               'avec le TOTAL. En BV, la ligne « Si passage en BEA » se calcule aussi.' },
      { emoji: '👁️',
        titre: 'Un aperçu à retoucher avant de composer',
        texte: 'De l’estimation à la fin du contrat : ce que tu y retouches part tel quel dans ' +
               'le bilan. « ↺ Recalculer » le remet d’après les cases.' },
      { emoji: '📝',
        titre: 'Fin d’évaluation : tes notes, rien d’autre',
        texte: 'Le questionnaire « Après ce cours » d’une évaluation ne demande plus que tes ' +
               'notes. Ce que le dossier savait déjà reste en place.' }
    ]
  },
  {
    version: 1142,
    date: 'Lundi 12 octobre 2026',
    resume: 'Examens : case « vérifications », cadre Manœuvre/Autonomie, micro au curseur',
    quoi: [
      { emoji: '🧰',
        titre: 'Une case pour les vérifications',
        texte: 'Sous la remarque des vérifications (examen blanc et examen officiel) : ' +
               '« Tu n’as pas bossé tes vérifications : ça rapporte 3 points le jour de ' +
               'l’examen, donc bosse-les à fond ! ». Cochée, la phrase s’écrit dans le cadre.' },
      { emoji: '🅿️',
        titre: 'Manœuvre et Autonomie dans un cadre',
        texte: 'Les deux parties sont réunies sur un fond gris bleuté : on voit où elles ' +
               'commencent et où reprend la suite.' },
      { emoji: '🎙️',
        titre: 'Le micro écrit là où tu as cliqué',
        texte: 'Dans le bilan à la main, la dictée s’écrit à l’endroit du curseur — après ' +
               '« ce que je te PROPOSE : » par exemple — et plus à la fin du cadre. Sans clic ' +
               'dans le cadre, elle va à la fin, comme avant.' }
    ]
  },
  {
    version: 1141,
    date: 'Lundi 12 octobre 2026',
    resume: 'Nouvelle messagerie : 📌 épingler, ⏰ rappeler demain, retards et créneaux',
    quoi: [
      { emoji: '🧭',
        titre: 'Une nouvelle messagerie',
        texte: 'Sur ordinateur : les familles à gauche, les conversations, le fil, et à droite ' +
               'la fiche de l’élève (sa leçon, son prochain cours, son permis, ses notes internes). ' +
               'Sur téléphone et dans la bulle 💬 : la liste, puis le fil, et ⓘ pour la fiche. ' +
               'Les couleurs suivent le thème de l’appli.' },
      { emoji: '📌',
        titre: 'Épingler, et ⏰ « me la rappeler demain »',
        texte: 'Au survol d’une conversation ou en haut du fil. C’est à toi seul : ce que tu ' +
               'épingles ou remets à demain ne bouge que dans ta liste. Une conversation remise ' +
               'revient d’elle-même à 9 h — ou plus tôt si l’élève réécrit.' },
      { emoji: '⏰',
        titre: 'Les retards',
        texte: 'Le fil d’un retard montre le cours, le moniteur prévenu, et si l’alerte a été ' +
               'vue. « Relancer » la renvoie sur son téléphone ; quand le cours n’a pas été ' +
               'trouvé, « Prévenir un moniteur » fait entrer celui que tu choisis.' },
      { emoji: '📅',
        titre: 'Proposer un créneau',
        texte: '« 📅 Décaler » envoie à l’élève une carte « ✓ Ça me va / Autre ». Sa réponse ' +
               's’écrit dans le fil : c’est toi qui reportes le cours dans le planning.' },
      { emoji: '✓',
        titre: 'Réglé',
        texte: '« ✓ Réglé » ferme la conversation et l’écrit dans le fil ; elle part dans 🗄️ ' +
               'Fermées. Les objets oubliés se règlent dans leur bandeau 🧤.' }
    ]
  },
  {
    version: 1139,
    date: 'Samedi 10 octobre 2026',
    resume: 'Notes internes dans le dossier élève, et 💬 ouvert à tous les élèves',
    quoi: [
      { emoji: '📝',
        titre: 'Notes internes',
        texte: 'Un nouvel onglet du dossier élève, sous Coin révisions. On y écrit des notes ' +
               'classées Administratif, Pédagogique ou Sensible, datées et signées, avec un ' +
               'filtre par catégorie. Toute l’équipe les lit ; seul leur auteur ou un ' +
               'administrateur les modifie ou les supprime. L’élève ne les voit jamais.' },
      { emoji: '💬',
        titre: 'Écrire au bureau, pour tous les élèves',
        texte: 'Tout élève qui a un accès au coin révisions peut écrire au bureau, sans case ' +
               'à cocher. Écrire à son moniteur reste au cas par cas.' }
    ]
  },
  {
    version: 1138,
    date: 'Samedi 10 octobre 2026',
    resume: 'Le résultat de l’examen blanc dit la même chose partout',
    quoi: [
      { emoji: '🅱️',
        titre: 'La fiche de suivi gagne',
        texte: 'Quand le résultat réglé dans Sa route (« pourrait », « pas le niveau ») ' +
               'ne dit pas la même chose que le dernier bilan, c’est la fiche qui s’affiche, ' +
               'dans la tuile comme dans Sa route. « Pourrait avoir le niveau » s’écrit aussi ' +
               'dans le message au moniteur, et les bilans suivants ne recopient plus ' +
               'l’ancienne conclusion.' }
    ]
  },
  {
    version: 1137,
    date: 'Samedi 10 octobre 2026',
    resume: 'Places et sessions d’examen : un nouvel écran, en cartes',
    quoi: [
      { emoji: '📊',
        titre: 'Les mois côte à côte',
        texte: 'Dans 🎓 Suivi permis, chaque mois est une carte : ce qu’il reste à prévoir ' +
               'en grand, une jauge des places prises, puis une case par semaine avec ses ' +
               'jours ouverts et son nombre d’examens.' },
      { emoji: '🎓',
        titre: 'Les sessions rangées par semaine',
        texte: 'Une carte par session, qui montre déjà qui passe, à quelle heure et où il en ' +
               'est. Un appui l’ouvre en grand, avec les mêmes boutons qu’avant.' }
    ]
  },
  {
    version: 1136,
    date: 'Samedi 10 octobre 2026',
    resume: 'Le groupe du permis : tu coches ce qui part',
    quoi: [
      { emoji: '☑️',
        titre: 'Une case par message',
        texte: 'Dans l’encadré « 💬 Le groupe dans la messagerie », chaque message composé ' +
               'et la vidéo ont leur case. Au départ : le message du groupe, les rappels ' +
               'du centre de la session et la vidéo sont cochés ; les plannings des 2 h de ' +
               'veille ne le sont pas, à toi de cocher la bonne version. Le bouton dit ' +
               'combien de messages partent.' },
      { emoji: '🧠',
        titre: 'Les rappels avant examen — Saint-Brieuc sont revenus',
        texte: 'Ils sont toujours proposés, à côté de ceux de Loudéac. Les messages ' +
               '« Permis solo » n’entrent plus dans les messages du groupe.' }
    ]
  },
  {
    version: 1135,
    date: 'Samedi 10 octobre 2026',
    resume: 'Le groupe du jour du permis se crée dans la messagerie, depuis Préparation',
    quoi: [
      { emoji: '💬',
        titre: 'Un groupe par session, en un appui',
        texte: 'Dans Permis › 📣 Préparation, compose les messages d’une session, ' +
               'retouche-les si besoin, puis « 💬 Créer le groupe ». Il réunit les élèves, ' +
               'le moniteur et la boîte du bureau, reçoit les messages tels qu’écrits, ' +
               'puis la vidéo. Son nom : « Permis jeudi 15 octobre - Chloé, Alice, ' +
               'Bruno - 1 BEA 2 BV - Hery ». La case « 💬 Groupe fait » se coche toute seule.' },
      { emoji: '🔄',
        titre: 'Il suit la session',
        texte: 'Un élève ajouté ou retiré dans 🎓 Suivi permis entre ou sort du groupe, ' +
               'et le nom suit, comme le moniteur. Si les horaires changent, le groupe ' +
               'reçoit « 🕐 Horaires modifiés » avec le nouveau planning.' },
      { emoji: '🎬',
        titre: 'La vidéo du jour du permis, déposée une fois',
        texte: 'En haut de Préparation. Chaque groupe la reçoit en dernier message, sans ' +
               'la recopier. Pour Messenger, « 📋 Copier le lien de la vidéo » donne un ' +
               'lien qui marche jusqu’au lendemain de l’examen au soir.' }
    ]
  },
  {
    version: 1134,
    date: 'Samedi 10 octobre 2026',
    resume: 'Un petit bonhomme à côté du nom ouvre le dossier de l’élève',
    quoi: [
      { emoji: '👤',
        titre: 'Le dossier en un appui',
        texte: 'Juste après le nom d’un élève, une petite silhouette — la même que ' +
               'sur Drivup — ouvre son dossier. Dans Mes prochains cours (la carte de ' +
               'droite), toutes les listes du bureau, la liste RDV permis, les places ' +
               'de Suivi permis, le message de groupe Messenger, l’AAC et la conduite ' +
               'supervisée. Elle n’apparaît que pour ceux qui ont accès au dossier élève.' }
    ]
  },
  {
    version: 1133,
    date: 'Samedi 10 octobre 2026',
    resume: 'Message groupe Messenger : les groupes sont les sessions de Suivi permis',
    quoi: [
      { emoji: '🎓',
        titre: 'Une session = un groupe',
        texte: '« 📣 Message groupe Messenger » reprenait un ancien découpage qui ne ' +
               'bougeait plus. Il prend maintenant les sessions de 🎓 Suivi permis : ' +
               'un groupe par session, nommé « 13h15 · Saint-Brieuc · Hery », avec ' +
               'son ordre de passage et son heure en premier examen.' },
      { emoji: '⚠️',
        titre: '« Sans session »',
        texte: 'Un élève qui a la date mais n’est dans aucune session apparaît dans ' +
               'un groupe à part, pour qu’on le place dans Suivi permis.' }
    ]
  },
  {
    version: 1132,
    date: 'Samedi 10 octobre 2026',
    resume: 'Mes prochains cours : la ligne de l’examen dit les heures qui restent vraiment',
    quoi: [
      { emoji: '⏱️',
        titre: '« encore 4h + 3h » se met à jour',
        texte: 'Sur la carte d’un cours, la ligne « Examen officiel prévu le … » ' +
               'gardait le nombre d’heures du jour où le cours avait été préparé. ' +
               'Elle le recalcule maintenant à chaque affichage, avec le même calcul ' +
               'que les tuiles du dossier : ce qui restera après ce cours-là.' }
    ]
  },
  {
    version: 1131,
    date: 'Samedi 10 octobre 2026',
    resume: 'La fiche véhicule de l’AAC porte enfin l’émoji du moniteur',
    quoi: [
      { emoji: '🦉',
        titre: 'AAC : la même fiche que la conduite',
        texte: 'Les manœuvres dites ou cochées pendant un cours AAC prennent ' +
               'ton émoji, à côté de ceux des cours d’avant, et le commentaire ' +
               'reste au bout de la ligne : « MALD 🦋 — Reste débrayée… ». ' +
               'Avant, le bilan AAC ignorait les cases cochées.' },
      { emoji: '📜',
        titre: 'Les anciens bilans AAC comptent',
        texte: 'Une manœuvre commentée dans un ancien bilan AAC compte comme ' +
               'travaillée, avec l’émoji du moniteur de ce bilan. La fiche ' +
               'se reconstitue dès le prochain cours.' },
      { emoji: '🚗',
        titre: 'Boîte automatique : la fiche ne repart plus de zéro',
        texte: 'En dictée, un cours en boîte automatique ne relisait plus les ' +
               'bilans d’avant : les marques des cours précédents disparaissaient, ' +
               'et la dictée n’était plus remise au propre. Les marques perdues ' +
               'reviennent au prochain bilan.' }
    ]
  },
  {
    version: 1130,
    date: 'Vendredi 9 octobre 2026',
    resume: 'Dossier élève : rendez-vous AAC et « Où il en est » se corrigent sur place',
    quoi: [
      { emoji: '🤝',
        titre: 'Les rendez-vous AAC se posent depuis « Sa route »',
        texte: 'Toucher une ligne de rendez-vous ouvre une petite fenêtre pour ce ' +
               'rendez-vous-là : la date, et le lieu pour les RVP et le théorique. ' +
               'Une date passée le note « fait », une date à venir « prévu ». ' +
               'Avant, la ligne emmenait vers la liste AAC.' },
      { emoji: '🔢',
        titre: '« Où il en est » se corrige même sans cours préparé',
        texte: 'La correction s’écrit dans son dernier bilan (seul le chiffre ' +
               'change), ou sur son dernier cours s’il attend encore son bilan. ' +
               'Toutes les listes suivent. Si un bilan plus ancien annonce déjà ' +
               'plus de leçons, l’outil le dit avec sa date au lieu d’écrire pour rien.' }
    ]
  },
  {
    version: 1129,
    date: 'Vendredi 9 octobre 2026',
    resume: 'Les heures avant l’examen partent de la leçon que tu choisis',
    quoi: [
      { emoji: '⏱️',
        titre: 'Une option par leçon',
        texte: '« Ces heures partent de quand ? » n’offrait que deux choix : ' +
               'dès l’examen blanc, ou aujourd’hui. La question devient « Ces ' +
               'heures partent de quelle leçon après l’examen blanc ? » et propose ' +
               'chaque leçon : 1ʳᵉ, 2ᵉ, 3ᵉ… Pareil dans le questionnaire et dans ' +
               '« Sa route » du dossier, et pour le post-permis.' },
      { emoji: '👀',
        titre: 'Le bouton suit ton choix',
        texte: 'Dans le questionnaire, choisir la leçon met aussitôt à jour ce ' +
               'qui reste (« 2 + 3h »). Le nombre décidé ne change pas : seul son ' +
               'point de départ bouge.' },
      { emoji: '📝',
        titre: '« Sa route » dit la bonne leçon',
        texte: 'La ligne des heures écrivait « à partir de la 1ʳᵉ leçon » quand ' +
               'les heures commençaient à la 2ᵉ. Elle dit maintenant la même leçon ' +
               'que le menu.' }
    ]
  },
  {
    version: 1128,
    date: 'Vendredi 9 octobre 2026',
    resume: 'Dossier élève : chaque tuile du haut parle d’un seul moment',
    quoi: [
      { emoji: '🔢',
        titre: '« Où il en est » dit ce qu’il a fait',
        texte: 'Elle affichait le rang du cours préparé — demain. Elle dit ' +
               'maintenant ce qu’il a fait (« 16ᵉ · 1ʳᵉ après l’examen ' +
               'blanc »), et dessous ce qui vient : « Prochaine : sam. 10 oct. — ' +
               'sa 17ᵉ, 2ᵉ après l’examen blanc ». Quand un cours est préparé, ' +
               'un appui sur la tuile corrige ses deux cases, comme sur la carte.' },
      { emoji: '🎓',
        titre: '« Où en est son permis » dit ce qui a été décidé',
        texte: 'Sous la date d’examen : « ✅ A le niveau — 4h + la leçon de ' +
               'veille ». Elle affichait le décompte, « plus que les 3h », qui se ' +
               'lisait comme si l’examen blanc n’avait demandé que 3h.' },
      { emoji: '⏱️',
        titre: '« Avant l’examen » dit ce qui reste',
        texte: 'Elle montrait le nombre tel qu’il avait été dit, jamais ' +
               'décompté. Elle dit maintenant ce qui reste — « 2 h + la leçon de ' +
               'veille » — avec les mêmes chiffres que les listes du bureau, et ' +
               'précise « en comptant son cours du … » quand le cours préparé est ' +
               'déjà compté.' }
    ]
  },
  {
    version: 1127,
    date: 'Vendredi 9 octobre 2026',
    resume: 'Les types de séance des rappels se rangent par famille, dans ton ordre',
    quoi: [
      { emoji: '🚗',
        titre: 'Cinq familles, un emoji devant chaque type',
        texte: 'Voiture 🚗, moto 🏍️, remorque 🚛, voiturette 🚙, scooter 🛵. Le menu ' +
               '« Type de séance » des rappels les groupe, et chaque ligne porte ' +
               'l’emoji de sa famille — même menu fermé, on voit ce qui est choisi.' },
      { emoji: '⚙️',
        titre: 'Un bouton « Ranger » à côté du menu',
        texte: 'Il ouvre la liste de tous tes types : un menu pour la famille de ' +
               'chacun, deux flèches pour l’ordre. Un type pas encore classé ' +
               'arrive avec une famille proposée d’après son titre, marquée ' +
               '« proposé » — rien n’est gardé avant « Enregistrer ».' },
      { emoji: '🔤',
        titre: 'Les accents reviennent dans le menu',
        texte: '« Cours Loudéac » s’affichait « Cours Loudeac ».' }
    ]
  },
  {
    version: 1126,
    date: 'Vendredi 9 octobre 2026',
    resume: '« Modifier la préparation » : des titres, un rail, et plus aucun tiroir',
    quoi: [
      { emoji: '🧭',
        titre: 'Un rail en haut, qui dit où l’on est',
        texte: 'Élève · Parcours · Examen blanc · Permis · Rendez-vous · Fiche · ' +
               'Notes. Il reste collé en haut quand on descend, la pastille du ' +
               'sujet en cours s’allume, et un appui y amène. Un ⚠️ marque le ' +
               'sujet qui a un trou — un examen blanc passé sans résultat, une ' +
               'frise ou une formation manquante.' },
      { emoji: '📑',
        titre: 'Sept vrais titres qui se lisent',
        texte: 'À la place de vingt petits libellés gris du même poids, chaque ' +
               'sujet a son titre, et à droite ce qu’il dit déjà : « ven. 30 oct. ' +
               '· 1er passage », « 18 / 19 cochées ». On lit l’écran en lisant ' +
               'les titres. Les questions, elles, n’ont pas changé.' },
      { emoji: '🦉',
        titre: 'La fiche véhicule ne défile plus dans la page',
        texte: 'Son cadre de 240 px qui défilait à l’intérieur de la fenêtre a ' +
               'disparu : la liste se déplie. Les manœuvres qui restent ont leur ' +
               'ligne en tête ; celles déjà validées se serrent dessous, toujours ' +
               'visibles. Le « ▸ Voir les manœuvres restantes » du haut est parti ' +
               'aussi : les restantes sont nommées sur la ligne.' }
    ]
  },
  {
    version: 1125,
    date: 'Vendredi 9 octobre 2026',
    resume: 'Les rappels de cours en quatre étapes, et les deux mails sous les yeux',
    quoi: [
      { emoji: '💶',
        titre: 'Le financeur reçoit un vrai courrier',
        texte: 'Sans modèle « financeur » à soi, le mail des missions locales ' +
               'disait « Lieu de rendez-vous : Ta voiture sera dans la cour… ! », ' +
               'en gras et en tutoyant — la phrase écrite pour l’élève. Il dit ' +
               'maintenant « cour intérieure de l’auto-école », et le type de ' +
               'séance s’écrit en lettres normales.' },
      { emoji: '🔔',
        titre: 'Quatre étapes, dans l’ordre d’une série',
        texte: 'La série (jour, moniteur, véhicule), posée une fois ; les ' +
               'créneaux du moniteur ; ce cours ; ce qui part. Les mêmes champs ' +
               'qu’avant, rangés comme on fait les rappels d’une journée.' },
      { emoji: '🕐',
        titre: 'La journée du moniteur en pastilles',
        texte: '08h ✓ Tom, 10h ce cours, 13h libre… Un appui choisit l’heure. ' +
               'Après un envoi, le créneau prévenu prend son ✓ et le suivant ' +
               's’allume : on voit où on en est sans passer par l’historique.' },
      { emoji: '✉️',
        titre: 'On relit exactement ce qui part',
        texte: 'Les deux mails sont montrés, avec leur objet, la règle des ' +
               '48 heures et le bouton « Je serai présent ». L’adresse se ' +
               'change dans la ligne « À », pour ce cours seulement — et elle ' +
               'se recharge à chaque nouvel élève. Les « +248 caractères » du ' +
               'temps du SMS ont disparu.' }
    ]
  },
  {
    version: 1124,
    date: 'Vendredi 9 octobre 2026',
    resume: 'La tuile du permis voit enfin l’examen blanc qu’on vient de poser',
    quoi: [
      { emoji: '📅',
        titre: 'Un examen blanc posé depuis la fiche de route se voit en haut',
        texte: 'On posait « prévu le 6 novembre » sur la ligne 📝 de Sa route, ' +
               'et la tuile du haut continuait d’afficher « rien de noté ». ' +
               'Elle ne regardait pas la colonne que cette ligne venait ' +
               'd’écrire, et elle ne connaissait pas le mot « réservé » que ' +
               'pose le bureau. Les deux lisent maintenant la même chose, et ' +
               'avec les mêmes mots : « prévu le… ».' },
      { emoji: '🌙',
        titre: 'La date du simulateur se pose depuis Sa route',
        texte: 'La ligne 🌙 renvoyait au répertoire sans rien dire, et elle ' +
               'affichait « à prévoir » alors que l’avertissement juste ' +
               'au-dessus annonçait la date enregistrée. Elle lit maintenant ' +
               'la fiche de suivi d’abord, et un appui ouvre le calendrier ' +
               'sur place — la même porte que le bouton de l’onglet Permis, ' +
               'pas une seconde. Une date passée se lit « fait le », une date ' +
               'à venir « prévu le ».' }
    ]
  },
  {
    version: 1123,
    date: 'Vendredi 9 octobre 2026',
    resume: 'Le coin révisions s\u2019ouvre en un seul aller-retour au lieu de trois',
    quoi: [
      { emoji: '⚡',
        titre: 'Trois réveils du classeur ramenés à un',
        texte: 'En ouvrant son coin révisions, l\u2019élève déclenchait trois ' +
               'allers-retours vers le classeur : sa connexion, puis son ' +
               'dossier, son bilan et ses récitations. Or le réveil du ' +
               'classeur coûte à lui seul une dizaine de secondes, et les ' +
               'trois portes refaisaient en plus la même lecture de la ' +
               'feuille des accès. Tout part maintenant avec la connexion : ' +
               'une vague, une lecture. Rien à faire côté élève.' },
      { emoji: '🛟',
        titre: 'Et ça tient même si le classeur est en retard',
        texte: 'Si le script Apps Script déployé est plus ancien que la page, ' +
               'celle-ci redemande ce qui manque, exactement comme avant. ' +
               'Une accélération qui casse quand les deux moitiés ne sont pas ' +
               'déployées ensemble n\u2019en est pas une.' }
    ]
  },
  {
    version: 1122,
    date: 'Vendredi 9 octobre 2026',
    resume: 'Le coin révisions a sa propre adresse : eleve.evolutionconduites.fr',
    quoi: [
      { emoji: '🔑',
        titre: 'Une adresse à lui',
        texte: 'Les élèves n\u2019ont plus à taper l\u2019adresse de l\u2019application ' +
               'du bureau suivie d\u2019un nom de fichier : c\u2019est ' +
               'eleve.evolutionconduites.fr, et rien d\u2019autre. Le lien part ' +
               'déjà sous cette forme dans le message d\u2019accès, dans les ' +
               'procédures à réciter, dans le rappel vocal et dans le mail de ' +
               'correction envoyé par le classeur.' },
      { emoji: '🔔',
        titre: 'Les notifications ouvrent la bonne page',
        texte: 'Sur la nouvelle adresse, la page du coin révisions s\u2019appelle ' +
               'autrement : un clic sur une notification serait tombé sur une ' +
               'page introuvable. La page dit maintenant où elle vit à son ' +
               'démarrage, et la notification s\u2019y rend. Rien à faire côté ' +
               'élève — la première ouverture répare.' },
      { emoji: '🏠',
        titre: 'L\u2019ancienne adresse marche toujours',
        texte: 'Aucun élève n\u2019est coupé. Ceux qui ont déjà l\u2019icône du coin ' +
               'révisions sur leur écran d\u2019accueil continuent comme avant ; ' +
               'ceux qui passent à la nouvelle se reconnectent une fois.' }
    ]
  },
  {
    version: 1121,
    date: 'Vendredi 9 octobre 2026',
    resume: 'Le dossier élève refait : trois tuiles, « Sa route », et plus de crayons',
    quoi: [
      { emoji: '🧭',
        titre: 'Un onglet « Sa route », en premier',
        texte: 'La fiche de route n\u2019est plus au-dessus des onglets : elle ' +
               'a le sien, et c\u2019est celui qui s\u2019ouvre. Le résumé d\u2019état qui ' +
               'la doublait a disparu — les deux disaient les mêmes phrases ' +
               'à dix centimètres d\u2019écart, l\u2019un en lecture, l\u2019autre en ' +
               'écriture. Un fait n\u2019est plus écrit qu\u2019à un seul endroit.' },
      { emoji: '🎯',
        titre: 'Trois tuiles en haut du dossier',
        texte: 'Où il en est, où en est son permis, ce qui lui reste avant ' +
               'l\u2019examen. La tuile du milieu est celle du permis, qui change ' +
               'selon la situation. Et celle de droite se tait quand la ' +
               'précédente a déjà dit les heures : elle montre alors son ' +
               'prochain cours.' },
      { emoji: '👆',
        titre: 'Plus de colonne de crayons',
        texte: 'Sept crayons identiques qui faisaient sept choses ' +
               'différentes. La ligne entière est maintenant la cible, avec ' +
               'un chevron discret, et l\u2019explication est écrite sous elle au ' +
               'lieu d\u2019être une infobulle — qui n\u2019existe pas sur tablette.' },
      { emoji: '📂',
        titre: 'Ce qui manque se compte au lieu de s\u2019étaler',
        texte: 'Les lignes non renseignées se replient en une seule ligne ' +
               'qui les NOMME : « 4 choses non renseignées — date d\u2019examen, ' +
               'ajournements, post-permis, simulateur ». On n\u2019ouvre que si ' +
               'ça nous concerne. En dessous de trois, rien ne se replie.' },
      { emoji: '🗂️',
        titre: 'Les onglets en rail, et trois actions à portée',
        texte: 'Au-delà de 1280 px les onglets passent en colonne à gauche, ' +
               'comme un sommaire ; en dessous ils se replient sur plusieurs ' +
               'lignes. Et l\u2019en-tête porte enfin de quoi appeler, écrire, et ' +
               'voir son prochain cours — avec le numéro cliquable depuis sa ' +
               'propre ligne dans la fiche.' },
      { emoji: '📅',
        titre: 'Toutes les dates du dossier en français',
        texte: '« sam. 3 oct. » au lieu de « 03/10/2026 », et l\u2019année ' +
               'seulement quand ce n\u2019est pas l\u2019année en cours. Dix-huit ' +
               'endroits en profitent : ils passaient déjà tous par la même ' +
               'porte, il suffisait de la corriger.' }
    ]
  },
  {
    version: 1120,
    date: 'Vendredi 9 octobre 2026',
    resume: 'Le numéro de version ne peut plus mentir, et le coin révisions a son adresse',
    quoi: [
      { emoji: '🔢',
        titre: 'Le badge de version dit la vérité',
        texte: 'Le numéro à côté du titre lisait un morceau de la page ' +
               'd\u2019accueil. Mettre la page en ligne sans le dossier des ' +
               'modules affichait donc la version neuve au-dessus de ' +
               'l\u2019ancienne application, sans un mot — on croyait être à ' +
               'jour et on ne l\u2019était pas. Les modules portent maintenant ' +
               'leur propre numéro : s\u2019ils ne concordent pas, le badge ' +
               'passe en rouge et dit lequel est en retard.' },
      { emoji: '🔑',
        titre: 'Le coin révisions sur sa propre adresse',
        texte: 'eleve.evolutionconduites.fr. L\u2019ancienne adresse continue ' +
               'de fonctionner aussi longtemps qu\u2019on veut : un élève qui a ' +
               'déjà l\u2019icône sur son écran d\u2019accueil n\u2019a rien à faire. ' +
               'Ceux qui passent à la nouvelle se reconnectent une fois.' }
    ]
  },
  {
    version: 1119,
    date: 'Vendredi 9 octobre 2026',
    resume: 'Le dossier élève se lit en français, et les onglets ne défilent plus',
    quoi: [
      { emoji: '📋',
        titre: 'L\u2019onglet Questionnaire écrit en français',
        texte: 'Il affichait « Examen blanc · passe », « ebNiveau · non », ' +
               '« 2025-08-06 ». Les réponses sont maintenant nommées, ' +
               'traduites et datées en français, et rangées par sujet — ' +
               'l\u2019examen blanc, l\u2019examen du permis, les rendez-vous, le ' +
               'poste de conduite — au lieu d\u2019être triées par ordre ' +
               'alphabétique. Les mots viennent du questionnaire lui-même : ' +
               'les deux écrans ne peuvent plus se contredire.' },
      { emoji: '🗂️',
        titre: 'Les dix onglets d\u2019un dossier tiennent à l\u2019écran',
        texte: 'La rangée défilait horizontalement : sur téléphone, Handicap ' +
               'et RGPD étaient hors de l\u2019écran et rien ne le disait. Elle ' +
               'passe à la ligne, tout est visible d\u2019un coup.' },
      { emoji: '🧭',
        titre: 'La frise ne s\u2019écrase plus contre son libellé',
        texte: 'Dans la fiche, la frise et les remarques se lisent maintenant ' +
               'sous leur titre, sur toute la largeur. Et les deux cases du ' +
               'poste de conduite portent leur nom au lieu d\u2019être deux ' +
               'carrés gris : on lit ce qui est coché sans avoir à deviner.' },
      { emoji: '🅱️',
        titre: 'Le résultat d\u2019examen blanc que le bureau connaît déjà',
        texte: 'Quand tu prépares un cours et que le bureau a noté « pas le ' +
               'niveau » ou « pourrait », le questionnaire te le dit sous le ' +
               'sélecteur, avec un bouton pour reprendre la réponse. Il ne ' +
               'la remplit pas tout seul : une réponse que personne n\u2019a ' +
               'donnée n\u2019est pas une réponse.' }
    ]
  },
  {
    version: 1118,
    date: 'Vendredi 9 octobre 2026',
    resume: 'Une tuile en tête du dossier qui dit où en est l\u2019élève',
    quoi: [
      { emoji: '🎓',
        titre: 'Où en est son permis, en un coup d\u2019œil',
        texte: 'En tête de l\u2019onglet Permis d\u2019un dossier élève, un encart ' +
               'qui change de sens selon l\u2019élève. Dix-sept situations : permis ' +
               'obtenu, date prise, place à remplacer, examen annulé, ajourné sans ' +
               'rendez-vous post-permis, post-permis prévu puis fait avec sa suite, ' +
               'les cinq états de l\u2019examen blanc, les rendez-vous d\u2019un AAC, et ' +
               '« rien de noté » qui ouvre la saisie. On ne voit que celle qui ' +
               'compte : un élève ajourné n\u2019affiche plus son examen blanc, c\u2019est ' +
               'son post-permis qui parle.' },
      { emoji: '⛔',
        titre: 'Une date prise ne cache plus un « pas le niveau »',
        texte: 'Quand un élève a une date d\u2019examen ET un examen blanc conclu ' +
               '« pas le niveau » ou « pourrait », la date reste en vedette mais ' +
               'l\u2019avertissement se lit en rouge juste dessous. Il disparaît de ' +
               'lui-même dès que la conclusion change.' },
      { emoji: '📅',
        titre: 'Des dates qui se lisent',
        texte: 'Les dates de la tuile s\u2019écrivent « ven. 18 déc. » au lieu de ' +
               '« 2026-12-18 », et l\u2019année ne s\u2019affiche que si ce n\u2019est pas ' +
               'l\u2019année en cours. Les noms de mois viennent du système, donc ' +
               '« déc. » et « sept. » s\u2019abrègent correctement.' }
    ]
  },
  {
    version: 1117,
    date: 'Vendredi 9 octobre 2026',
    resume: 'Les numéros réparés, la boîte qui ne se contredit plus, et « pourrait »',
    quoi: [
      { emoji: '📱',
        titre: 'Les numéros qui avaient perdu leur zéro',
        texte: 'Certains numéros s’affichaient « 749045808 » : le zéro de ' +
               'tête saute en passant par le classeur, qui lit un numéro ' +
               'comme un nombre. Pire, le bouton 💬 pointait alors sur un ' +
               'numéro qui n’existe pas. L’outil rend son zéro tout seul, ' +
               'à l’affichage comme au SMS, et range les numéros sous une ' +
               'seule forme quand on enregistre une fiche. Rien à ' +
               'retoucher : les fiches déjà saisies se réparent d’elles-mêmes.' },
      { emoji: '⚙️',
        titre: 'La boîte ne se choisit plus, elle se lit',
        texte: 'Dans un cours préparé, la carte du haut disait « BEA » et ' +
               'le sélecteur du bas « BV — boîte manuelle », pour le même ' +
               'élève. Le sélecteur devinait la boîte d’après le TYPE DE ' +
               'BILAN : sept types sur dix-sept n’en portent pas dans leur ' +
               'nom, et tous les sept répondaient « manuelle ». La boîte ' +
               'vient maintenant de la formation, et de nulle part ailleurs. ' +
               'Pour la changer, on change la formation.' },
      { emoji: '🤔',
        titre: 'Pourrait avoir le niveau',
        texte: 'Troisième réponse au résultat de l’examen blanc, entre ' +
               '« a le niveau » et « pas le niveau ». Elle s’écrit dans la ' +
               'note, se relit au cours suivant, et l’élève reste dans ' +
               '« 🤔 Élèves prêts au permis » avec sa mention. Le bouton ' +
               '« 🤔 Pourrait » du bilan écrit à la main existait déjà mais ' +
               'ne concluait rien : il conclut.' }
    ]
  },
  {
    version: 1110,
    date: 'Jeudi 8 octobre 2026',
    resume: 'Supprimer un message, et vider les conversations fermées',
    quoi: [
      { emoji: '🗑️',
        titre: 'Retirer un message qu’on vient d’envoyer',
        texte: 'Appui long sur ta bulle, puis 🗑️. Le message part, sa photo ' +
               'ou son vocal sont effacés du stockage, et il sort de la ' +
               'recherche. Il reste une ligne « 🚫 Message supprimé » — sans ' +
               'elle, les réponses d’après ne voudraient plus rien dire. ' +
               '⚠️ Chacun ne retire que LES SIENS, et un élève ne peut pas ' +
               'retirer ce qu’il a écrit : c’est souvent ce qui compte le ' +
               'jour d’un désaccord avec une famille. Pas de délai.' },
      { emoji: '🧹',
        titre: 'Vider les conversations fermées, pour de bon',
        texte: 'Sur l’onglet 🗄️ Fermées, un bouton « Tout supprimer » pour ' +
               'les administrateurs. Il COMPTE d’abord — combien de ' +
               'conversations, de messages, de fichiers — et il les nomme, ' +
               'avant de demander confirmation. Ensuite tout part : les ' +
               'messages, les lectures, les participants, les objets ' +
               'oubliés, et les photos, vocaux et vidéos du stockage. ' +
               '⚠️ Rien ne se retrouve après.' }
    ]
  },
  {
    version: 1109,
    date: 'Jeudi 8 octobre 2026',
    resume: 'Les vidéos dans la messagerie',
    quoi: [
      { emoji: '🎥',
        titre: 'Filmer une manœuvre et l’envoyer',
        texte: 'Le bouton 🎥, à côté du micro, demande d’abord : filmer, ou ' +
               'choisir une vidéo déjà prise. On filme avec la caméra ' +
               'arrière et le compte à rebours sous les yeux — ❚❚ met en ' +
               'pause, ■ arrête sans envoyer, on se regarde, puis ➤. À 30 ' +
               'secondes ça s’arrête tout seul, sans envoyer.' },
      { emoji: '📶',
        titre: 'Réglée pour partir d’un bord de route',
        texte: '640×480 et un débit bridé : trente secondes font environ ' +
               '3 Mo, ça passe en 4G de voiture-école. Une vidéo choisie ' +
               'dans la galerie est refusée au-delà de 12 Mo — le téléphone ' +
               'l’a filmée trop grande, il faut la refaire depuis ' +
               'l’application.' },
      { emoji: '🎓',
        titre: 'Les élèves aussi, cinq par jour',
        texte: 'Même bouton dans leur espace, avec leur propre compte — une ' +
               'vidéo n’entame pas leur quota de vocaux. Dans la bulle, la ' +
               'vidéo se lit sur place avec sa durée, et ⤢ en haut à droite ' +
               'l’ouvre en grand. Le doigt sur l’image met en pause, comme ' +
               'partout.' }
    ]
  },
  {
    version: 1108,
    date: 'Jeudi 8 octobre 2026',
    resume: 'Copier un message, coller une capture d’écran',
    quoi: [
      { emoji: '📋',
        titre: 'Copier le texte d’un message',
        texte: 'L’appui long sur une bulle ouvre le menu des émoticônes, et ' +
               '📋 s’y ajoute tout au bout : le texte part dans le ' +
               'presse-papiers. ⚠️ C’est ce menu qui empêchait de copier — ' +
               'l’appui long et le clic droit sont les deux gestes par ' +
               'lesquels on sélectionne du texte, et les réactions les ' +
               'avaient pris. Ça marche aussi sur la transcription d’un ' +
               'vocal, et dans un fil qu’on ne fait que surveiller.' },
      { emoji: '🖼️',
        titre: 'Et coller une capture d’écran dans le champ',
        texte: 'Une image copiée (Ctrl+V, ou « Coller » sur téléphone) part ' +
               'directement comme photo. Plus besoin de l’enregistrer sur le ' +
               'disque pour la rouvrir ensuite par 📷. Le texte, lui, se ' +
               'collait déjà tout seul.' }
    ]
  },
  {
    version: 1107,
    date: 'Jeudi 8 octobre 2026',
    resume: 'La pastille rouge sur l’icône de l’application',
    quoi: [
      { emoji: '🔴',
        titre: 'Le nombre de messages non lus sur l’icône',
        texte: 'L’icône de l’application sur l’écran d’accueil porte ' +
               'maintenant le nombre de messages qui t’attendent. Il monte à ' +
               'chaque notification reçue application fermée, et il se remet ' +
               'au bon chiffre dès que tu ouvres — même si tu as lu les ' +
               'messages ailleurs entre-temps. Il disparaît quand tout est lu.' },
      { emoji: '📱',
        titre: '⚠️ Sur iPhone et sur ordinateur seulement',
        texte: 'Android ne sait pas faire : le système y met un point tout ' +
               'seul tant qu’une notification n’est pas lue dans le volet, et ' +
               'ce point part dès qu’on la balaie. Ce n’est pas une panne et ' +
               'il n’y a rien à régler — aucun navigateur Android ne propose ' +
               'de compteur. Sur iPhone, il faut que l’application soit ' +
               'ajoutée à l’écran d’accueil et les notifications autorisées.' }
    ]
  },
  {
    version: 1106,
    date: 'Jeudi 8 octobre 2026',
    resume: 'Le départ des heures s’enregistre vraiment depuis le questionnaire',
    quoi: [
      { emoji: '⏱️',
        titre: 'La réponse atteint enfin le suivi',
        texte: 'La question « Ces heures partent de quand ? » était bien posée ' +
               'dans le questionnaire, mais depuis une préparation personne ne ' +
               'portait ta réponse jusqu’à la fiche de l’élève : elle restait ' +
               'dans le cours. Ça marchait depuis le dossier, pas depuis « mes ' +
               'prochains cours ». C’est réglé — par le crayon d’un cours ' +
               'préparé comme à la création.' },
      { emoji: '🔒',
        titre: 'Et ton nombre d’heures ne bouge pas',
        texte: '⚠️ Important : le questionnaire affiche ce qu’il RESTE, la ' +
               'fiche affiche ce qui a été DÉCIDÉ. Quand tu réponds « depuis ' +
               'la charnière » depuis le questionnaire, seul le point de ' +
               'départ est corrigé — le nombre décidé reste intact. Sinon 6h ' +
               'devenues 4h seraient décomptées une seconde fois.' }
    ]
  },
  {
    version: 1105,
    date: 'Jeudi 8 octobre 2026',
    resume: 'Le départ des heures se corrige aussi depuis le questionnaire',
    quoi: [
      { emoji: '⏱️',
        titre: 'La question est maintenant dans tes prochains cours',
        texte: 'Sous « Heures restantes avant l’examen », le questionnaire ' +
               'demande à son tour « Ces heures partent de quand ? » — depuis ' +
               'la charnière, ou à partir d’aujourd’hui. Plus besoin d’ouvrir ' +
               'le dossier de l’élève : c’est pendant le cours qu’on s’aperçoit ' +
               'que le compte ne colle pas, et un aller-retour par le dossier, ' +
               'c’est un détour qu’on ne fait pas — donc un chiffre faux qui ' +
               'reste. Elle ne s’affiche que si elle a deux réponses, et elle ' +
               'dit de combien la réserve serait déjà entamée.' }
    ]
  },
  {
    version: 1104,
    date: 'Jeudi 8 octobre 2026',
    resume: 'Tu peux dire d’où partent les heures avant l’examen',
    quoi: [
      { emoji: '⏱️',
        titre: 'Les heures d’un post-permis se décomptent depuis le post-permis',
        texte: 'Quand tu posais un nombre d’heures sur la fiche d’un élève qui ' +
               'a eu un rendez-vous post-permis (ou un ajournement), l’outil ' +
               'retenait toujours « il reste ça À PARTIR D’AUJOURD’HUI » — sans ' +
               'jamais demander. Si tu recopiais ce que le rendez-vous avait ' +
               'évalué, les leçons déjà faites depuis n’étaient pas déduites : ' +
               'Mohammad restait à 4h + 3h alors qu’il ne lui restait que les ' +
               '3h. La question se pose maintenant pour toutes les charnières, ' +
               'pas seulement pour l’examen blanc.' },
      { emoji: '✏️',
        titre: 'Et tu peux le corriger après coup',
        texte: 'Clique sur la ligne des heures dans la fiche : la fenêtre ' +
               's’ouvre sur ce qui est ENREGISTRÉ — « depuis le post-permis » ' +
               'ou « à partir d’aujourd’hui » — et tu changes. Deux clics pour ' +
               'rattraper un repère posé de travers, au lieu de tout retaper. ' +
               'La fiche écrit le repère en toutes lettres, pour que le ' +
               'chiffre affiché reste vérifiable d’un coup d’œil.' }
    ]
  },
  {
    version: 1103,
    date: 'Jeudi 8 octobre 2026',
    resume: 'Le téléphone vibre quand un départ est refusé',
    quoi: [
      { emoji: '📳',
        titre: 'Un départ refusé se sent, en plus de se voir',
        texte: 'Trois signes le disaient déjà à l’écran — le champ qui ' +
               'rougit, l’écran qui y descend, le bouton qui dit ce qui ' +
               'manque. Mais le téléphone est souvent sur son support et les ' +
               'yeux sur la route : il vibre maintenant, deux impulsions ' +
               'courtes. Une seule, plus franche, quand un repère est posé ' +
               'pendant le trajet — un refus et une réussite ne doivent pas ' +
               'se sentir pareil.' },
      { emoji: '💾',
        titre: 'Le bilan des éliminatoires se sauve tout de suite',
        texte: 'Quand l’outil compose tout seul le bilan des éliminatoires ' +
               'd’un examen blanc, il attendait la sauvegarde suivante — et ' +
               'si le moniteur ne touchait plus à rien, elle ne venait pas. ' +
               'Un onglet fermé entre-temps emportait le texte. Il part ' +
               'maintenant à la seconde où il est écrit.' }
    ]
  },
  {
    version: 1102,
    date: 'Jeudi 8 octobre 2026',
    resume: 'Deux cours à venir ne portent plus le même numéro de leçon',
    quoi: [
      { emoji: '🔢',
        titre: 'Un cours qui attend son bilan compte quand même',
        texte: 'Le compte des leçons vient des bilans. Tant qu’un cours n’a ' +
               'pas été fait, il n’a pas de bilan — et deux cours à venir ' +
               'pour le même élève recevaient donc le même chiffre : ' +
               'Mackenzie annonçait « 16ème » à 13h ET à 17h. Chaque cours ' +
               'déjà préparé devant celui qu’on regarde compte maintenant ' +
               'pour une leçon : 16 à 13h, 17 à 17h, et la 1ère puis la 2ème ' +
               'après l’examen blanc. Deux leçons le même jour sont deux ' +
               'leçons.' },
      { emoji: '⏱️',
        titre: 'Et les heures avant l’examen se décomptent enfin',
        texte: '« 6h + 3h » prescrites au rendez-vous post-permis, c’est une ' +
               'réserve, et une réserve se consomme : à la 1ère leçon après ' +
               'il reste 4h + 3h, à la 2ème 2h + 3h, à la 3ème plus que les ' +
               '3h. C’était la règle depuis des semaines — la fonction qui ' +
               'devait faire la soustraction n’avait jamais été écrite, et ' +
               'la carte repartait de la réserve pleine tous les matins. ' +
               'Quand le repère et la charnière ne parlent pas de la même ' +
               'chose, rien n’est décompté plutôt qu’un chiffre inventé.' }
    ]
  },
  {
    version: 1101,
    date: 'Jeudi 8 octobre 2026',
    resume: 'Les vocaux : on peut enfin s’arrêter sans envoyer',
    quoi: [
      { emoji: '⏹',
        titre: 'Arrêter, s’écouter, puis décider',
        texte: 'Il n’y avait que deux sorties — jeter, ou envoyer. ■ arrête ' +
               'maintenant l’enregistrement sans rien envoyer : le micro se ' +
               'coupe, le vocal s’écoute sur place, le texte se corrige, et ' +
               'il ne part que si tu appuies sur ➤. À deux minutes (une pour ' +
               'un élève) c’est pareil : ça s’arrête, ça n’envoie plus tout ' +
               'seul.' },
      { emoji: '⏸',
        titre: 'Et une pause, quand on est coupé en plein milieu',
        texte: '❚❚ met en pause, ▶ reprend — le compteur s’arrête vraiment, ' +
               'une pause de trente secondes ne mange plus trente secondes de ' +
               'ton temps de parole. Le point rouge s’éteint et l’onde se ' +
               'couche : on voit que rien ne s’enregistre.' },
      { emoji: '🖼️',
        titre: 'Plus de vignette « Photo » cassée au-dessus des vocaux',
        texte: 'Un vocal s’affichait avec une image cassée par-dessus le ' +
               'lecteur, et c’est elle qui déclenchait le bandeau rouge ' +
               '« Erreur au chargement » en bas de l’écran. Les deux ont ' +
               'disparu. Au passage, ce bandeau ne s’affiche plus pour une ' +
               'photo qui met du temps à venir — seulement quand quelque ' +
               'chose est vraiment cassé.' }
    ]
  },
  {
    version: 1100,
    date: 'Jeudi 8 octobre 2026',
    resume: 'Le numéro de leçon se remet à jour tout seul, pour de bon',
    quoi: [
      { emoji: '🔢',
        titre: 'Le rang écrit dans le dernier bilan fait enfin loi',
        texte: 'Un cours créé par un rappel annonçait parfois un numéro très ' +
               'en dessous de la réalité — « 3ème leçon » pour un élève qui en ' +
               'est à sa 25ème. La cause : quand un bilan dit « 2ème leçon ' +
               'après le post-permis (24ème au total) », le serveur lisait le 2 ' +
               'et ne voyait jamais le 24. Il le lit maintenant, et la carte du ' +
               'lendemain reprend bien celle de la veille. Rien à retaper : ' +
               'les cartes se corrigent toutes seules au prochain chargement.' },
      { emoji: '📈',
        titre: 'Et un bilan abîmé ne fait plus reculer un élève',
        texte: 'Un rang ne recule jamais : une leçon faite reste faite. Si un ' +
               'bilan annonce un numéro plus bas qu’un bilan plus ancien — ça ' +
               'arrive quand une note a été mal écrite — c’est le plus élevé ' +
               'qui est retenu, au lieu du plus récent. ⚠️ Revers de la ' +
               'médaille : un numéro tapé TROP HAUT par erreur ne se rattrape ' +
               'plus tout seul. Il faut corriger ce bilan-là, ou taper le rang ' +
               'à la main sur la carte — la main l’emporte toujours.' }
    ]
  },
  {
    version: 1098,
    date: 'Jeudi 8 octobre 2026',
    resume: 'Les messages vocaux, avec ce qui est dit écrit en dessous',
    quoi: [
      { emoji: '🎤',
        titre: 'Les vocaux dans la messagerie',
        texte: 'Le micro, à gauche du champ : on appuie, on parle, on envoie. ' +
               'Deux minutes au maximum, avec le compte à rebours sous les ' +
               'yeux — il passe en rouge dans les dix dernières secondes, et à ' +
               'deux minutes pile l’enregistrement s’arrête tout seul sans ' +
               'rien perdre. ✕ annule, ➤ envoie.' },
      { emoji: '📝',
        titre: 'Et ce que tu dis s’écrit pendant que tu parles',
        texte: 'Le texte apparaît sous le compteur au fur et à mesure, et tu ' +
               'peux le corriger avant d’envoyer — la reconnaissance écrit ' +
               '« Hery » en « Erri » une fois sur trois. Il part AVEC le vocal : ' +
               'dans la bulle, dans l’aperçu de la liste, et surtout dans la ' +
               'recherche. C’est tout l’intérêt : dans trois mois, on retrouve ' +
               'un vocal en cherchant un mot, sans réécouter quarante ' +
               'messages. ⚠️ Sur iPhone, Safari ne sait pas le faire : le ' +
               'vocal part sans texte, et la bulle le dit.' },
      { emoji: '▶️',
        titre: 'Les écouter, et plus vite si besoin',
        texte: 'Un bouton, une barre où l’on peut se déplacer pour réécouter ' +
               'une phrase, et ×1 / ×1,5 / ×2 à droite — la vitesse se garde ' +
               'd’un vocal à l’autre. Un seul se lit à la fois : deux voix en ' +
               'même temps dans une voiture, on ne comprend ni l’une ni ' +
               'l’autre.' },
      { emoji: '🎓',
        titre: 'Les élèves aussi, une minute et cinq par jour',
        texte: 'Même bouton dans leur espace, avec leur propre compte à ' +
               'rebours. Cinq vocaux par jour : au-delà, le micro s’éteint ' +
               'jusqu’au lendemain et le lui dit. Leurs 10 photos par jour ' +
               'restent de leur côté, les deux comptes sont séparés.' }
    ]
  },
  {
    version: 1090,
    date: 'Mercredi 7 octobre 2026',
    resume: 'Les notifications, les réactions, les photos, le bandeau refait',
    quoi: [
      { emoji: '🔔',
        titre: 'Ton téléphone te prévient des nouveaux messages',
        texte: 'À faire UNE fois par appareil : onglet « 💬 Messagerie », ' +
               'la bande en haut, bouton « Activer ». Ensuite ton téléphone ' +
               'sonne quand on t’écrit, même application fermée — et quand ' +
               'quelqu’un réagit à ce que tu as écrit. La notification dit ' +
               'QUI écrit, jamais ce qui est écrit : un téléphone posé sur ' +
               'une table ne doit pas raconter la conversation. On appuie ' +
               'dessus, le bon fil s’ouvre. Et pour l’avoir comme une vraie ' +
               'application, « Ajouter à l’écran d’accueil » depuis le ' +
               'navigateur — sur iPhone c’est obligatoire pour que les ' +
               'notifications arrivent.' },
      { emoji: '👍',
        titre: 'Les réactions sur un message',
        texte: 'Appui long sur une bulle : les six émoji de Messenger ' +
               'apparaissent — 👍 ❤️ 😂 😮 😢 🙏. On appuie, c’est posé, et la ' +
               'personne est prévenue sur son téléphone. On réappuie sur le ' +
               'même, c’est retiré. Les pastilles se comptent sous la ' +
               'bulle : « 👍 6 », pas six pouces à la file. Les élèves y ont ' +
               'droit aussi, depuis leur page.' },
      { emoji: '✈️',
        titre: 'Le bouton d’envoi devient un pouce quand tu n’écris rien',
        texte: 'Champ vide : le bouton montre 👍 et envoie un pouce d’un ' +
               'seul geste — « c’est noté », sans taper. Dès que tu tapes ' +
               'une lettre, il redevient un avion. À côté, 🙂 ouvre les ' +
               'émoticônes, rangées par familles, qui s’insèrent là où est ' +
               'le curseur et pas à la fin du texte.' },
      { emoji: '📷',
        titre: 'Les photos dans la messagerie',
        texte: 'Le bouton 📷 à côté du champ : appareil photo ou galerie. ' +
               'La photo est réduite SUR TON TÉLÉPHONE avant de partir — ' +
               'elle arrive vite même en 4G, et ça lui retire au passage le ' +
               'lieu où elle a été prise, qui voyage normalement avec. On ' +
               'tape dessus pour la voir en grand. Les élèves peuvent en ' +
               'envoyer aussi : un permis, un justificatif, un papier ' +
               'd’auto-école — dix par jour au maximum, pour que la ' +
               'messagerie ne devienne pas un album.' },
      { emoji: '🔢',
        titre: 'Le « 1 » de la messagerie s’en va quand tu as lu',
        texte: 'Il restait collé sur l’onglet alors que le message était ' +
               'ouvert et que l’expéditeur voyait déjà l’accusé de lecture. ' +
               'Il se recompte maintenant à chaque fil ouvert, y compris ' +
               'quand tu lis depuis le tiroir.' },
      { emoji: '🔐',
        titre: 'Ouvrir une conversation sans voir celles des autres',
        texte: 'Pour écrire à quelqu’un, « Messagerie : Modifier » suffit ' +
               'désormais — le bouton ✏️ est là, dans la liste comme dans le ' +
               'tiroir. Avant, il fallait mettre « Superviser », qui donne ' +
               'en plus la lecture des conversations de toute l’école : ce ' +
               'n’était pas le même droit, et ça n’a plus rien à voir. ' +
               '« Superviser » reste réservé à ceux qui doivent vraiment ' +
               'tout lire.' },
      { emoji: '📄',
        titre: 'Le bilan de l’examen officiel revient tout seul',
        texte: 'Dans « Attente bilan post-permis », le champ « Bilan de ' +
               'l’examen officiel » arrivait vide alors que la ligne en ' +
               'dessous affirmait l’avoir repris : il est de nouveau rempli ' +
               'avec le bilan du jour de l’examen, et la ligne dit de quel ' +
               'examen et de quel moniteur il vient. S’il n’y a rien à ' +
               'reprendre, elle le dit au lieu de faire semblant.' },
      { emoji: '🏁',
        titre: 'Et ce que tu as noté à la sortie de l’examen aussi',
        texte: 'L’inspecteur, les heures avant repassage, la case « pas de ' +
               'repassage pour le moment » et ta note pour l’équipe : tout ' +
               'cela s’affiche maintenant en haut du rendez-vous post-permis, ' +
               'sous « 🏁 À la sortie de l’examen ». Le cadre existait, mais ' +
               'il cherchait ces informations là où elles ne sont pas : elles ' +
               'voyagent dans la note du bilan d’examen, et c’est de là ' +
               'qu’elles arrivent désormais. Les heures demandées et le ' +
               '« pas de repassage » se posent même tout seuls dans la ' +
               'conclusion — tu gardes le dernier mot, ce que tu as choisi ' +
               'n’est jamais écrasé. La carte du cours, elle, porte ces ' +
               'mêmes lignes à la place du rapport d’examen entier qui s’y ' +
               'déroulait — et quand le bureau fixe le rendez-vous, c’est ' +
               'TON cours de ce jour-là qui devient le rendez-vous, au lieu ' +
               'd’un deuxième cours posé à côté.' },
      { emoji: '🗂️',
        titre: 'Le bandeau ne dit plus tout d’un coup',
        texte: 'Il affichait quarante-sept lignes au-dessus du premier ' +
               'cours de la journée, et plus personne ne l’ouvrait. ' +
               'Maintenant : « Aujourd’hui » d’abord, « Cette semaine » et ' +
               '« En attente » à un clic avec leur compte — rien n’est ' +
               'caché, c’est juste rangé. Tu ne vois que TES élèves, ceux de ' +
               'tes prochains cours, avec un bouton « 🏫 Toute l’école » ' +
               'quand tu veux regarder le reste ; le bureau voit tout. Un ' +
               'élève qui a deux choses à prévoir fait UNE ligne, pas deux. ' +
               'Et une fois la case « prévenu » cochée dans le suivi, la ' +
               'ligne disparaît toute seule — plus besoin de la barrer à la ' +
               'main.' }
    ]
  },
  {
    version: 1015,
    date: 'Jeudi 17 septembre 2026',
    resume: 'Le tiroir « Démarrer un cours », la loupe, le numéro de leçon',
    quoi: [
      { emoji: '➕',
        titre: 'Démarrer un cours est rangé dans un tiroir',
        texte: 'Il était sous « Mes prochains cours » et se confondait avec ' +
               'eux : on tapait dedans sans mettre le nom. Il est maintenant ' +
               'fermé, et il s’appelle « Démarrer un cours qui n’est pas ' +
               'dans la liste ». Ton cours EST dans la liste ? Démarre-le de ' +
               'là : il s’ouvre en plein écran, avec un « ← Mes cours » pour ' +
               'revenir. Et s’il manque le nom, le prénom, le type de bilan ' +
               'ou la date, le bouton te montre lequel au lieu de ne rien ' +
               'faire.' },
      { emoji: '🔍',
        titre: 'La loupe s’ouvre sur la liste des élèves',
        texte: 'On appuie dessus : le clavier est là et les noms sont déjà ' +
               'affichés. On tape sur un nom, on est dans son dossier — plus ' +
               'de bouton « Ouvrir son dossier » à viser derrière. La ' +
               'formation est indiquée à droite de chaque nom. Elle trouve ' +
               'aussi les ÉCRANS : tape « écoutes », « remorque », « caisse » ' +
               '— elle t’y emmène, et elle te dit dans quel onglet c’était.' },
      { emoji: '🗺️',
        titre: 'Le trajet se revoit dans le bilan rangé',
        texte: 'Le bouton du dossier élève rouvre la carte AVEC ses points ' +
               'numérotés et l’explication sous chacun, comme au moment du ' +
               'cours. Les erreurs sans compétence ont retrouvé leur ' +
               '« point N sur la carte », qu’elles perdaient dans le mail ' +
               'd’examen blanc.' },
      { emoji: '🏁',
        titre: 'Le rendez-vous post-permis laisse sa trace',
        texte: 'Il restait dans « Cours non terminés » une fois terminé, ' +
               'et on ne le retrouvait nulle part : seul le résultat ' +
               'remontait au bureau. Il écrit maintenant son compte rendu ' +
               "dans l'historique des cours — conclusion, bilan " +
               "d'examen, ce que l'élève a écrit, tes remarques — et il " +
               'sort de la liste des cours non terminés. Il ne compte pas ' +
               'comme une leçon.' },
      { emoji: '🔢',
        titre: 'Le numéro de leçon, enfin le même partout',
        texte: 'La petite case sous la date d’examen et la phrase verte ' +
               '« encore N leçons » disent le même chiffre, et il descend à ' +
               'chaque cours. Un rang que tu as corrigé à la main TIENT : ' +
               'l’outil repart de lui et compte les leçons qui ont suivi, ' +
               'sur tous les écrans — avant, le même élève pouvait afficher ' +
               'deux numéros différents selon l’écran ouvert. Les élèves en ' +
               'conduite supervisée et ceux qui ont déjà passé le permis ' +
               'comptent sur leurs heures de repassage, pas sur celles ' +
               'd’avant.' },
      { emoji: '👨‍👩‍👦',
        titre: '⚠️ Certains numéros vont descendre, et c’est voulu',
        texte: 'Le RVP 1 et le RVP 2 se passent assis, en salle, avec ' +
               'l’accompagnateur : ce ne sont pas des leçons de conduite. Le ' +
               'classeur les comptait quand même. Un élève en conduite ' +
               'accompagnée qui a fait ses deux rendez-vous était annoncé ' +
               'deux leçons plus loin qu’il ne l’est. C’est le chiffre juste ' +
               'qui arrive, rien ne s’est perdu.' }
    ]
  },
  {
    version: 974,
    date: 'Vendredi 12 septembre 2026',
    resume: 'Le bouton CB, l’onglet Cours, les examens',
    quoi: [
      { emoji: '💳',
        titre: 'Le bouton CB, à côté de la loupe',
        texte: 'Il dit qui a la carte gasoil : gris au bureau, doré quand ' +
               'c’est toi, rouge dès qu’elle est dehors — avec l’initiale ' +
               'de chaque carte. On la prend, on la passe à quelqu’un, on ' +
               'la repose en indiquant le véhicule du plein. Dès le ' +
               'lendemain, elle est en retard et te le dit.' },
      { emoji: '🎨',
        titre: 'Le trait de couleur à côté de l’heure',
        texte: 'Il dit la boîte du cours : vert pour une manuelle, magenta ' +
               'pour une automatique. Le simulateur et l’examen blanc ont ' +
               'les leurs.' },
      { emoji: '📱',
        titre: 'L’onglet Cours refait',
        texte: 'Sur téléphone, le cours du moment est seul en haut — ' +
               '« dans 10 min », « en cours » — et tout le reste de la ' +
               'journée tient dans un tiroir qu’on déplie. Sur tablette, ' +
               'les vues passent dans un rail à gauche, qui se replie en ' +
               'icônes pour rendre la place à la carte.' },
      { emoji: '🏁',
        titre: 'Examen blanc et examen officiel',
        texte: 'MANŒUVRE et AUTONOMIE s’ajoutent sous les vérifications, ' +
               'avec les boutons 💀 et ⚠️ ; l’autonomie retire des points ' +
               'par demi-crans. Installation, passager et voyants donnent ' +
               'la note sur 2. Et avant de générer, le texte de la partie 4 ' +
               's’affiche : tu peux le corriger.' }
    ]
  }
];

/* ⚠️ LA MARQUE DE LECTURE VIT DANS LE NAVIGATEUR — comme les
   réglages du bandeau, qui sont déjà là. Chacun lit pour lui, sans
   toucher à celui des autres, et il n'y a rien à administrer.

   Le revers est assumé, et c'est le même qu'aujourd'hui : un
   téléphone neuf, ou un navigateur nettoyé, reverra la dernière
   note une fois. C'est le prix de ne rien avoir à gérer — et relire
   une note n'a jamais fait de mal à personne. */
const CLE_NOUVEAUTES_LUES = 'nouveautes_lues';

function derniereNouveaute(){
  return NOUVEAUTES.length ? NOUVEAUTES[0] : null;
}

function versionNouveauteLue(){
  try{
    return parseInt(localStorage.getItem(CLE_NOUVEAUTES_LUES), 10) || 0;
  }catch(e){ return 0; }
}

function marquerNouveautesLues(){
  const d = derniereNouveaute();
  if(!d) return;
  try{ localStorage.setItem(CLE_NOUVEAUTES_LUES, String(d.version)); }
  catch(e){ /* navigation privée : elle se remontrera, tant pis */ }
}

/* Y a-t-il quelque chose à annoncer ? Rien en mémoire vaut « jamais
   lu » : un appareil neuf ne doit pas rater la note en cours. */
function aDesNouveautesNonLues(){
  const d = derniereNouveaute();
  return !!d && versionNouveauteLue() < d.version;
}

/* 🆕 v1187 — TOUTES les notes pas encore lues, pas seulement la
   dernière. Dix livraisons sans note (v1177 → v1186) : n'ouvrir que
   la plus récente, c'était cacher les appels sous le son des appels,
   et l'évaluation, les horaires, Tarifs… dans « précédentes », où
   personne ne va. Un appareil neuf (rien en mémoire) ne voit que la
   dernière : il n'a pas à rattraper soixante notes. */
function nouveautesNonLues(){
  const lue = versionNouveauteLue();
  if(!lue) return NOUVEAUTES.slice(0, 1);
  return NOUVEAUTES.filter(n => n.version > lue);
}


/* ============================================================
   LA LIGNE DU BANDEAU

   Elle se range dans la table des familles comme les autres — voir
   FAMILLES_BANDEAU dans ec-bandeau.js — et disparaît dès qu'elle
   est lue. Le bandeau existe pour qu'on voie SANS CHERCHER : une
   ligne qui reste après lecture devient un décor, et c'est tout le
   bandeau qu'on cesse de lire.
   ============================================================ */
function lignesNouveautes(){
  if(!aDesNouveautesNonLues()) return [];

  const d = derniereNouveaute();
  const nl = nouveautesNonLues();
  const n = nl.reduce((t, x) => t + (x.quoi || []).length, 0);

  return [{
    id: 'nouveautes:' + d.version,
    famille: 'nouveautes',
    emoji: '🆕',
    texte: 'Du nouveau dans l’outil — ' + n + ' changement' +
           (n > 1 ? 's' : ''),
    sous: nl.length > 1 ? nl.map(x => x.resume).filter(Boolean).slice(0, 3).join(' · ') + (nl.length > 3 ? ' …' : '')
                        : (d.resume || ''),
    urgente: false,
    action: ouvrirNouveautes,
    actionTexte: 'Lire'
  }];
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */
function ouvrirNouveautes(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';

  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 96vw);max-height:92vh;' +
    'overflow-y:auto;';

  const d = derniereNouveaute();
  if(!d){
    boite.innerHTML = '<div class="empty">Rien à raconter pour le moment.</div>';
  }else{
    const nl = nouveautesNonLues();
    const aLire = nl.length ? nl : [d];
    aLire.forEach((n, i) => boite.appendChild(blocNouveaute(n, aLire.length > 1 ? i : -1)));
    const avant = NOUVEAUTES.slice(aLire.length);
    if(avant.length) boite.appendChild(voletNouveautesPrecedentes(avant));
  }

  const pied = document.createElement('div');
  pied.className = 'nvPied';

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.textContent = '✅ J’ai lu';
  b.addEventListener('click', () => {
    /* ⚠️ ON MARQUE, PUIS ON FERME, PUIS ON REDESSINE. Fermer d'abord
       et marquer ensuite, c'est laisser la ligne revenir au premier
       redessin — et donner l'impression que le bouton n'a rien
       fait. */
    marquerNouveautesLues();
    fermerFond(fond);
    if(typeof dessinerBandeau === 'function') dessinerBandeau();
  });
  pied.appendChild(b);
  boite.appendChild(pied);

  fond.appendChild(boite);
  document.body.appendChild(fond);

  /* Fermer sans lire ne marque rien : on n'a pas dit qu'on avait lu. */
  fond.addEventListener('click', e => { if(e.target === fond) fermerFond(fond); });
  fond.addEventListener('keydown', e => {
    if(e.key === 'Escape') fermerFond(fond);
  });
}

/* rang : -1 = une seule note (comme avant) ; 0, 1, 2… = plusieurs
   notes à lire d'affilée — le grand titre une fois, puis chaque note
   avec son résumé, pour qu'on sache de quoi elle parle. */
function blocNouveaute(n, rang){
  const z = document.createElement('div');
  const plusieurs = typeof rang === 'number' && rang >= 0;

  if(!plusieurs || rang === 0){
    const t = document.createElement('div');
    t.className = 'nvTitre';
    t.textContent = '🆕 Du nouveau dans l’outil';
    z.appendChild(t);
  }
  if(plusieurs){
    z.style.marginTop = rang ? '18px' : '';
    const r = document.createElement('div');
    r.className = 'nvResume';
    r.style.cssText = 'font-weight:800;font-size:15px;margin-top:' + (rang ? '0' : '8px') + ';';
    r.textContent = n.resume || '';
    z.appendChild(r);
  }

  const dt = document.createElement('div');
  dt.className = 'nvDate';
  dt.textContent = n.date || '';
  z.appendChild(dt);

  (n.quoi || []).forEach(c => {
    const l = document.createElement('div');
    l.className = 'nvItem';

    const e = document.createElement('div');
    e.className = 'em';
    e.textContent = c.emoji || '•';
    l.appendChild(e);

    const corps = document.createElement('div');
    corps.className = 'corps';

    const q = document.createElement('div');
    q.className = 'quoi';
    q.textContent = c.titre || '';
    corps.appendChild(q);

    const p = document.createElement('div');
    p.className = 'comment';
    p.textContent = c.texte || '';
    corps.appendChild(p);

    l.appendChild(corps);
    z.appendChild(l);
  });

  return z;
}

/* Les précédentes, repliées : une note lue n'est pas perdue —
   quelqu'un revient de congés, ou veut relire comment marche le
   bouton CB. */
function voletNouveautesPrecedentes(liste){
  const d = document.createElement('details');
  d.className = 'volet-liste';
  d.style.marginTop = '12px';

  const s = document.createElement('summary');
  s.textContent = '📜 Les versions précédentes';
  d.appendChild(s);

  liste.forEach(n => d.appendChild(blocNouveaute(n)));
  return d;
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-nouveautes.js'] = true;
