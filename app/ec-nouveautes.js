/* Déployé le 08/10/2026 à 18:40 — v1109 */
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
  const n = (d.quoi || []).length;

  return [{
    id: 'nouveautes:' + d.version,
    famille: 'nouveautes',
    emoji: '🆕',
    texte: 'Du nouveau dans l’outil — ' + n + ' changement' +
           (n > 1 ? 's' : ''),
    sous: d.resume || '',
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
    boite.appendChild(blocNouveaute(d));
    const avant = NOUVEAUTES.slice(1);
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

function blocNouveaute(n){
  const z = document.createElement('div');

  const t = document.createElement('div');
  t.className = 'nvTitre';
  t.textContent = '🆕 Du nouveau dans l’outil';
  z.appendChild(t);

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
