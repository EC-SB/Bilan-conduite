/* ============================================================
   🔔 LE SERVICE WORKER — étape 3 de la messagerie

   Déployé le 08/10/2026 à 16:00 — v1107

   David, le 7 octobre : « je veux un vrai systeme de messagerie
   instantané comme messenger ». Ce fichier est la dernière brique :
   celle qui fait sonner le téléphone quand l'application est fermée.

   ⚠️ IL N'A PAS DE « fetch », ET IL NE FAUT PAS LUI EN DONNER UN.

   C'est LA règle de ce fichier, et elle vaut qu'on explique
   pourquoi. Un service worker qui écoute « fetch » s'interpose entre
   la page et le réseau : c'est lui qui décide ce que le navigateur
   reçoit. Toute l'application repose au contraire sur le « ?v= » de
   chaque module — on change le numéro, le navigateur retélécharge,
   et tout le monde a la bonne version dans la minute. Un service
   worker avec un cache rendrait ce numéro MENTEUR : il servirait
   l'ancien fichier à une page qui en demande un nouveau, et on
   aurait des tablettes bloquées sur une version de la semaine
   dernière sans aucun moyen de le voir depuis le bureau. Ce sont
   exactement les pannes les plus chères à comprendre.

   Sans « fetch », ce fichier ne touche à RIEN de ce que la page
   charge. Il ne sert qu'à deux choses : recevoir une notification
   quand l'application est fermée, et ouvrir la bonne page au clic.

   ⚠️ ET IL NE REÇOIT JAMAIS LE TEXTE D'UN MESSAGE. Le Worker
   n'envoie que le titre, le nom de qui écrit et l'identifiant du
   fil. Un message d'élève peut parler de son dossier, de son argent,
   d'une difficulté : il n'a pas à s'afficher sur un écran verrouillé
   posé sur une table. On ouvre l'application pour lire.
   ============================================================ */

const ICONE = "icone-192.png";

/* ============================================================
   🔴 LA PASTILLE SUR L'ICÔNE DE L'APPLICATION — v1107

   David, le 8 octobre : « j'ai bien les notifications de messages
   sur l'appli, par contre il n'y a pas de pastille qui se met sur
   l'icône de l'application mise sur le téléphone ».

   ⚠️ « badge: ICONE », PLUS BAS, N'EST PAS CETTE PASTILLE. Le nom
   trompe : c'est la petite icône monochrome de la barre d'état
   Android. La pastille sur l'icône passe par une autre API,
   « setAppBadge », et personne ne l'appelait.

   ⚠️ ET ELLE N'EXISTE PAS PARTOUT. iPhone et iPad depuis iOS 16.4,
   pour une application ajoutée à l'écran d'accueil et autorisée à
   notifier ; les ordinateurs depuis Chrome 81. Sur ANDROID l'API
   n'existe pas : le système met un point tout seul tant qu'une
   notification n'est pas lue, et il part quand on la balaie. Rien à
   corriger de ce côté-là, et surtout rien à promettre.

   ⚠️ CE COMPTEUR EST UN SECOND LECTEUR, ET IL LE SAIT. Le vrai
   compte vit sur le serveur (« nonLusTotal ») ; ici, la page est
   fermée et on ne peut qu'INCRÉMENTER. Le chiffre peut donc dériver
   — un message lu sur l'ordinateur pendant que le téléphone dort.
   C'est pourquoi la page, dès qu'elle s'ouvre et à chaque battement,
   REPOSE le vrai nombre par « message ». Un approximatif qui se
   corrige tout seul vaut mieux qu'un point sans chiffre.

   ⚠️ ET CE CACHE N'EST PAS UN CACHE DE PAGES. Ce fichier n'a pas de
   « fetch » et n'en aura jamais : il ne sert JAMAIS un fichier à la
   place du réseau — c'est la règle écrite en tête. Ce qui suit
   range UN NOMBRE, rien d'autre, sous un nom qui le dit.
   ============================================================ */
const BOITE_PASTILLE = "pastille-compteur";
const CLE_PASTILLE = "/pastille";

async function lirePastille() {
  try {
    const b = await caches.open(BOITE_PASTILLE);
    const r = await b.match(CLE_PASTILLE);
    if (!r) return 0;
    const n = parseInt(await r.text(), 10);
    return (isNaN(n) || n < 0) ? 0 : n;
  } catch (err) { return 0; }
}

async function poserLaPastille(n) {
  const v = Math.max(0, parseInt(n, 10) || 0);
  try {
    const b = await caches.open(BOITE_PASTILLE);
    await b.put(CLE_PASTILLE, new Response(String(v)));
  } catch (err) { /* le compteur se perdra, la page le reposera */ }

  /* Là où l'API n'existe pas — Android, un navigateur ancien — on
     ne fait rien, et rien ne casse. */
  try {
    if (!self.navigator) return;
    if (v > 0 && self.navigator.setAppBadge) await self.navigator.setAppBadge(v);
    else if (self.navigator.clearAppBadge) await self.navigator.clearAppBadge();
  } catch (err) { /* refusée, non installée : ce n'est pas une panne */ }
}

/* ============================================================
   OÙ VIT LE COIN RÉVISIONS — v1122

   ⚠️ CE SERVICE WORKER NE SAIT PAS QUELLE PAGE L'A INSTALLÉ, ET
   DEPUIS AUJOURD'HUI ÇA COMPTE.

   Le coin révisions a deux adresses : « eleve.html » à côté de
   l'application, et la racine de son propre domaine. La
   notification, elle, porte un seul nom de page pour les deux —
   « eleve.html » — et il est résolu par rapport à la portée du
   service worker. Sur le nouveau domaine, ça désigne un fichier
   qui n'existe pas : un clic sur la notification ouvrait une 404.

   ⚠️ ET ON N'ÉCRIT AUCUN NOM DE DOMAINE ICI. Ce serait une
   troisième copie de l'adresse, dans le fichier le plus difficile
   à mettre à jour de tous — un service worker installé reste
   installé. La seule chose qui sache où vit la page, c'est LA
   PAGE. Elle le dit à son démarrage, on le range dans la boîte
   qu'on a déjà, et on s'en sert au clic.

   Le repli reste l'ancien comportement : tant que la page n'a
   rien dit, « eleve.html » relatif à la portée — ce qui est juste
   partout où ça l'était avant.
   ============================================================ */
const BOITE_PAGE = "adresse-coin-revisions";
const CLE_PAGE = "/adresse";

async function rangerLAdresseDeLaPage(url) {
  try {
    const b = await caches.open(BOITE_PAGE);
    await b.put(CLE_PAGE, new Response(String(url || "")));
  } catch (err) { /* stockage refusé : on retombera sur le repli */ }
}

async function adresseDeLaPage() {
  try {
    const b = await caches.open(BOITE_PAGE);
    const r = await b.match(CLE_PAGE);
    if (!r) return "";
    const t = (await r.text()).trim();
    /* ⚠️ ET ELLE DOIT ÊTRE DE CHEZ NOUS. Une adresse rangée par
       autre chose que notre propre page n'ouvrirait pas le coin
       révisions : on ne suit que ce qui est dans notre portée. */
    return t.indexOf(self.registration.scope) === 0 ? t : "";
  } catch (err) { return ""; }
}

/* La page a le vrai compte : elle le repose, et c'est elle qui fait
   foi. Un seul écrivain pour la pastille — celui-ci. */
self.addEventListener("message", function (e) {
  const d = e.data || {};
  if (d.quoi === "maPage") { e.waitUntil(rangerLAdresseDeLaPage(d.url)); return; }
  if (d.quoi !== "pastille") return;
  e.waitUntil(poserLaPastille(d.combien));
});

/* Prendre la main tout de suite plutôt qu'au prochain démarrage :
   un service worker qui attend, c'est une personne qui autorise les
   notifications et ne reçoit rien jusqu'au lendemain. */
self.addEventListener("install", function (e) {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(self.clients.claim());
});

/* ------------------------------------------------------------
   UNE NOTIFICATION ARRIVE

   ⚠️ IL FAUT TOUJOURS EN AFFICHER UNE. Les navigateurs n'autorisent
   pas les notifications silencieuses : recevoir une poussée sans
   rien montrer fait apparaître, au bout de quelques fois, un
   « Ce site a été mis à jour en arrière-plan » que personne ne
   comprend — et peut faire retirer l'autorisation. Même si la charge
   est illisible, on montre quelque chose.
   ------------------------------------------------------------ */
self.addEventListener("push", function (e) {
  let a = {};
  try { a = e.data ? e.data.json() : {}; } catch (err) { a = {}; }

  const titre = a.titre || "💬 Nouveau message";
  const texte = a.texte || "Tu as un nouveau message";

  /* ⚠️ LA PASTILLE MONTE D'UN, ET LA NOTIFICATION S'AFFICHE QUAND
     MÊME — v1107. Les deux dans le même « waitUntil » : une
     pastille posée sans notification visible est interdite par les
     navigateurs, et sur iOS elle ne compterait même pas. */
  e.waitUntil(Promise.all([
    lirePastille().then(function (n) { return poserLaPastille(n + 1); }),
    self.registration.showNotification(titre, {
    body: texte,
    icon: ICONE,
    badge: ICONE,
    /* ⚠️ UNE SEULE NOTIFICATION PAR FIL. Sans « tag », dix messages
       d'affilée empilent dix lignes qu'il faut balayer une à une ;
       avec lui, la dernière remplace la précédente. C'est le fil
       qu'on suit, pas chaque phrase. */
    tag: "fil-" + (a.fil || "x"),
    renotify: true,
    data: { fil: a.fil || "", page: a.page || "index.html" }
    })
  ]));
});

/* ------------------------------------------------------------
   ON CLIQUE DESSUS

   ⚠️ ON RÉUTILISE LA FENÊTRE OUVERTE S'IL Y EN A UNE. Ouvrir un
   nouvel onglet à chaque notification, c'est une tablette avec
   quinze fois la même application au bout d'une journée — et une
   connexion à refaire à chaque fois.
   ------------------------------------------------------------ */
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  const d = e.notification.data || {};
  const page = d.page || "index.html";
  const fil = d.fil || "";
  const suite = fil ? "?fil=" + encodeURIComponent(fil) : "";

  e.waitUntil(Promise.resolve()
    /* Pour l'élève, l'adresse que SA page nous a donnée ; pour le
       bureau, et à défaut, l'ancien calcul. Voir le dossier de
       « adresseDeLaPage ». */
    .then(function () {
      return (page === "eleve.html") ? adresseDeLaPage() : "";
    })
    .then(function (sienne) {
      const cible = sienne ? (sienne.split("?")[0].split("#")[0] + suite)
                           : new URL(page + suite, self.registration.scope).href;
      return self.clients.matchAll({ type: "window", includeUncontrolled: true })
        .then(function (fenetres) {
          for (let i = 0; i < fenetres.length; i++) {
            const f = fenetres[i];
            /* La même page, quel que soit ce qu'il y a après le « ? ». */
            if (f.url.split("?")[0].split("#")[0] === cible.split("?")[0]) {
              /* On lui dit quel fil ouvrir : elle est peut-être sur
                 un tout autre écran. */
              try { f.postMessage({ quoi: "ouvrirFil", fil: fil }); } catch (err) {}
              return f.focus();
            }
          }
          return self.clients.openWindow(cible);
        });
    }));
});

/* ------------------------------------------------------------
   L'ABONNEMENT CHANGE TOUT SEUL

   ⚠️ ON NE PEUT PAS SE RÉABONNER D'ICI, ET C'EST NORMAL. Il faudrait
   le code de connexion pour le dire au Worker, et un service worker
   n'a pas de code — c'est précisément ce qui le rend sûr. La page,
   elle, se réabonne à chaque démarrage : la prochaine ouverture
   répare. On prévient pour que la personne sache qu'il faut rouvrir
   l'application plutôt que de croire que ça marche encore.
   ------------------------------------------------------------ */
self.addEventListener("pushsubscriptionchange", function (e) {
  e.waitUntil(self.registration.showNotification("🔔 Notifications à relancer", {
    body: "Ouvre l'application une fois pour continuer à être prévenu.",
    icon: ICONE,
    badge: ICONE,
    tag: "abonnement"
  }));
});
