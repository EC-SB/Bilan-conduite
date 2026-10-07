/* ============================================================
   🔔 LE SERVICE WORKER — étape 3 de la messagerie

   Déployé le 09/10/2026 à 00:40 — v1084

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

  e.waitUntil(self.registration.showNotification(titre, {
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
  }));
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
  const cible = new URL(page + (fil ? "?fil=" + encodeURIComponent(fil) : ""),
                        self.registration.scope).href;

  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true })
    .then(function (fenetres) {
      for (let i = 0; i < fenetres.length; i++) {
        const f = fenetres[i];
        /* La même page, quel que soit ce qu'il y a après le « ? ». */
        if (f.url.split("?")[0].split("#")[0] === cible.split("?")[0]) {
          /* On lui dit quel fil ouvrir : elle est peut-être sur un
             tout autre écran. */
          try { f.postMessage({ quoi: "ouvrirFil", fil: fil }); } catch (err) {}
          return f.focus();
        }
      }
      return self.clients.openWindow(cible);
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
