/* =========================================================
   Relais Bilan de conduite — Evolution Conduites

   A definir dans Settings du Worker :

   Secrets (Variables and Secrets) :
     ANTHROPIC_API_KEY : la cle API Anthropic
     SHEETS_URL        : l'URL /exec du script Apps Script
     ADMIN_CODE        : compte(s) principal(aux), format code:Prenom
                         separes par des virgules si plusieurs.
                         ex.  4821:Chrystel,7315:David
                         Ces comptes sont toujours administrateurs et ne
                         peuvent etre ni supprimes ni retrogrades depuis
                         l'interface : c'est la securite anti-blocage.

   Stockage (Bindings > KV namespace) :
     UTILISATEURS      : espace KV qui contient les autres comptes

   Note : la variable CODES_ACCES n'est plus utilisee, elle peut
   etre supprimee.
   ========================================================= */

const ORIGINE_AUTORISEE = "https://ec-sb.github.io";

/* Origines acceptées : le site en ligne, plus les adresses locales
   pour pouvoir essayer une modification sans la mettre en ligne.
   Le code d'accès reste exigé dans tous les cas. */
function origineAutorisee(origin) {
  if (!origin) return true;                       // appel direct, sans navigateur
  if (origin === ORIGINE_AUTORISEE) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin);
}

/* Sections réglables une par une */
/* Un numéro français, au format attendu par Allo.
   06 12 34 56 78, 0033…, +33… et 612345678 donnent tous +33612345678. */
function enFormatInternational(v) {
  let t = String(v || "").replace(/[^\d+]/g, "");
  if (!t) return "";
  if (t.indexOf("00") === 0) t = "+" + t.slice(2);
  if (t.indexOf("0") === 0 && t.length === 10) t = "+33" + t.slice(1);
  if (t.indexOf("+") !== 0) {
    t = (t.length === 9) ? "+33" + t : "+" + t;
  }
  return t;
}

/* L'expéditeur : un numéro devient international, un Sender ID
   alphanumérique est conservé tel quel (11 caractères au plus). */
function expediteurValide(v) {
  const brut = String(v || "").trim();
  if (!brut) return "";

  /* Des lettres : c'est un Sender ID, on n'y touche pas */
  if (/[a-zA-Z]/.test(brut)) return brut.slice(0, 11);

  return enFormatInternational(brut);
}

/* Allo compte 1000 caractères par SMS ; on garde une marge. */
const LIMITE_SMS = 950;

const SECTIONS = [
  "prepares", "cours", "recherche",
  "bureau_simu", "bureau_examblanc", "bureau_places", "bureau_permis",
  "bureau_messages", "permis", "textes", "procedures", "bilans", "stats", "sms", "eleves", "rappels", "depart", "admin"
];

/* Ce que chaque rôle obtient par défaut ; « m » = modifier, « v » = voir */
const DROITS_ROLE = {
  admin: { prepares:"m", cours:"m", recherche:"m", bureau_simu:"m",
           bureau_examblanc:"m", bureau_places:"m", bureau_permis:"m",
           bureau_messages:"m", permis:"m", textes:"m", procedures:"m", bilans:"m", stats:"m", sms:"m", eleves:"m", rappels:"m", depart:"m", admin:"m" },
  bureau: { recherche:"m", bureau_simu:"m", bureau_examblanc:"m",
            bureau_places:"m", bureau_permis:"m", bureau_messages:"m", permis:"m", textes:"m", procedures:"m", bilans:"m", stats:"m", sms:"m", eleves:"m", rappels:"m", depart:"m" },
  moniteur: { prepares:"m", cours:"m", recherche:"v" }
};

/* Nettoie un jeu de droits reçu du client */
function nettoyerDroits(d) {
  const out = {};
  if (!d || typeof d !== "object") return out;
  /* Ancien format : simple liste de sections */
  if (Array.isArray(d)) {
    d.forEach(function (k) { if (SECTIONS.indexOf(k) !== -1) out[k] = "m"; });
    return out;
  }
  Object.keys(d).forEach(function (k) {
    if (SECTIONS.indexOf(k) === -1) return;
    if (d[k] === "m" || d[k] === "v") out[k] = d[k];
  });
  return out;
}

/* ---------- Limitation des tentatives de connexion ---------- */
const MAX_ESSAIS = 5;          // échecs tolérés
const DUREE_BLOCAGE = 900;     // 15 minutes, en secondes

function cleEssais(ip) {
  return "essais:" + (ip || "inconnue");
}

async function lireEssais(env, ip) {
  try {
    const v = await env.UTILISATEURS.get(cleEssais(ip));
    return v ? JSON.parse(v) : { n: 0, jusqua: 0 };
  } catch (e) {
    return { n: 0, jusqua: 0 };
  }
}

async function noterEchec(env, ip) {
  const e = await lireEssais(env, ip);
  e.n = (e.n || 0) + 1;
  if (e.n >= MAX_ESSAIS) {
    e.jusqua = Date.now() + DUREE_BLOCAGE * 1000;
  }
  try {
    await env.UTILISATEURS.put(cleEssais(ip), JSON.stringify(e),
      { expirationTtl: DUREE_BLOCAGE });
  } catch (err) {}
  return e;
}

async function effacerEssais(env, ip) {
  try { await env.UTILISATEURS.delete(cleEssais(ip)); } catch (e) {}
}

function normaliserRole(r) {
  return (r === "admin" || r === "bureau") ? r : "moniteur";
}

/* Droits d'un compte.
   « Aucun droit » et « jamais configuré » sont deux choses différentes :
   sans ce repère, décocher tout revenait à rendre les droits du rôle. */
function droitsDe(u) {
  const role = normaliserRole(u && u.role);
  const perso = nettoyerDroits(u && u.droits);

  /* Les droits ont été réglés à la main, même s'ils sont vides */
  if (u && u.droitsRegles) return perso;

  if (Object.keys(perso).length) return perso;
  return Object.assign({}, DROITS_ROLE[role]);
}
const CLE_UTILISATEURS = "utilisateurs";

function entetes(json, origin) {
  const h = {
    "Access-Control-Allow-Origin": origineAutorisee(origin) && origin
      ? origin : ORIGINE_AUTORISEE,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

function repJson(objet, statut) {
  return new Response(JSON.stringify(objet), {
    status: statut || 200,
    headers: entetes(true)
  });
}

function attendre(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

/* ---------- Comptes ---------- */

function comptesPrincipaux(env) {
  const brut = String(env.ADMIN_CODE || "");
  const liste = [];
  const entrees = brut.split(",");
  for (let i = 0; i < entrees.length; i++) {
    const e = entrees[i].trim();
    if (!e) continue;
    const sep = e.indexOf(":");
    if (sep === -1) continue;
    const code = e.slice(0, sep).trim();
    const nom = e.slice(sep + 1).trim();
    if (!code) continue;
    liste.push({ code: code, nom: nom || "Administrateur" });
  }
  return liste;
}

/* Retourne le compte principal correspondant au code, sinon null */
function trouverPrincipal(env, code) {
  const saisi = String(code || "").trim();
  if (!saisi) return null;
  const liste = comptesPrincipaux(env);
  for (let i = 0; i < liste.length; i++) {
    if (liste[i].code === saisi) return liste[i];
  }
  return null;
}

async function lireUtilisateurs(env) {
  if (!env.UTILISATEURS) return {};
  const brut = await env.UTILISATEURS.get(CLE_UTILISATEURS);
  if (!brut) return {};
  try {
    const o = JSON.parse(brut);
    return (o && typeof o === "object") ? o : {};
  } catch (e) {
    return {};
  }
}

async function ecrireUtilisateurs(env, objet) {
  if (!env.UTILISATEURS) throw new Error("Stockage KV non configure (binding UTILISATEURS manquant).");
  await env.UTILISATEURS.put(CLE_UTILISATEURS, JSON.stringify(objet));
}

/* Identifie un code : retourne { nom, role, principal } ou null */
async function identifier(env, code) {
  const saisi = String(code || "").trim();
  if (!saisi) return null;

  const principal = trouverPrincipal(env, saisi);
  if (principal) {
    return { nom: principal.nom, role: "admin",
             droits: Object.assign({}, DROITS_ROLE.admin), principal: true };
  }

  const users = await lireUtilisateurs(env);
  const u = users[saisi];
  if (u) {
    return {
      nom: u.nom || "Moniteur",
      role: normaliserRole(u.role),
      emoji: u.emoji || "",
      genre: u.genre || "",
      droits: droitsDe(u),
      principal: false
    };
  }
  return null;
}

/* ---------- Worker ---------- */

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const reponse = await traiter(request, env, origin);

    /* On renvoie l'origine réellement appelante : indispensable pour
       essayer une modification depuis un serveur local. */
    if (origin && origineAutorisee(origin)) {
      const h = new Headers(reponse.headers);
      h.set("Access-Control-Allow-Origin", origin);
      h.set("Vary", "Origin");
      return new Response(reponse.body, { status: reponse.status, headers: h });
    }
    return reponse;
  }
};

async function traiter(request, env, origin) {
  {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: entetes(false) });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: entetes(false) });
    }
    if (!origineAutorisee(origin)) {
      return repJson({ error: "Origine non autorisee" }, 403);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (err) {
      return repJson({ error: "Requete illisible" }, 400);
    }

    /* Adresse de l'appelant, pour compter les essais infructueux */
    const ip = request.headers.get("CF-Connecting-IP") || "inconnue";
    const essais = await lireEssais(env, ip);

    /* Un blocage ne doit jamais enfermer quelqu'un qui a le bon code :
       on vérifie d'abord, on refuse ensuite. Le blocage sert à empêcher
       de deviner un code, pas à punir celui qui le connaît. */
    if (essais.jusqua && Date.now() < essais.jusqua) {
      const codeTeste = String(payload.code || "").trim();
      const principal = trouverPrincipal(env, codeTeste);
      const inscrits = await lireUtilisateurs(env);
      const connu = principal || inscrits[codeTeste];
      if (connu) {
        await effacerEssais(env, ip);
        const nom = principal ? principal.nom : connu.nom;
        const role = principal ? (principal.role || "admin") : normaliserRole(connu.role);
        return repJson({
          ok: true, moniteur: nom, role: role,
          emoji: (connu && connu.emoji) || '',
          genre: (connu && connu.genre) || '',
          droits: droitsDe(principal || connu)
        });
      }
      const reste = Math.ceil((essais.jusqua - Date.now()) / 60000);
      return repJson({
        error: "Trop de codes erronés. Reessaie dans " + reste + " minute" +
               (reste > 1 ? "s" : "") + "."
      }, 429);
    }

    const moi = await identifier(env, payload.code);
    if (!moi) {
      await attendre(1200);
      const e = await noterEchec(env, ip);
      const restants = MAX_ESSAIS - e.n;
      return repJson({
        error: (restants > 0)
          ? "Code incorrect. Encore " + restants + " essai" + (restants > 1 ? "s" : "") + "."
          : "Trop de codes erronés. Acces bloque pendant 15 minutes."
      }, 403);
    }
    const monCode = String(payload.code || "").trim();

    try {
      /* ---- Verification du code ---- */
      if (url.pathname === "/auth") {
        await effacerEssais(env, ip);
        return repJson({ ok: true, moniteur: moi.nom, role: moi.role,
                         emoji: moi.emoji || '', genre: moi.genre || '',
                         droits: moi.droits || [] });
      }

      /* ---- Liste des moniteurs (noms seuls, aucun code) ---- */
      if (url.pathname === "/moniteurs") {
        const principaux = comptesPrincipaux(env);
        const users = await lireUtilisateurs(env);
        const liste = [];

        function ajouter(nom, role, droits) {
          if (!nom) return;
          if (liste.some(function (x) { return x.nom === nom; })) return;
          /* Seuls ceux qui peuvent assurer un cours reçoivent une préparation */
          const d = droitsDe({ role: role, droits: droits });
          /* « m » = peut modifier, « v » = lecture seule : il faut pouvoir agir */
          const peutConduire = (d.cours === "m");
          liste.push({ nom: nom, role: role || "moniteur", cours: peutConduire });
        }

        principaux.forEach(function (p) { ajouter(p.nom, p.role || "admin", p.droits); });
        Object.keys(users).forEach(function (k) {
          ajouter(users[k].nom, users[k].role, users[k].droits);
        });
        liste.sort(function (a, b) { return a.nom.localeCompare(b.nom, "fr"); });

        return repJson({
          /* Compatibilité : la liste des noms reste celle des moniteurs */
          moniteurs: liste.filter(function (x) { return x.cours; }).map(function (x) { return x.nom; }),
          comptes: liste
        });
      }

      /* ---- Administration des comptes ---- */
      if (url.pathname === "/admin") {
        if (moi.role !== "admin") {
          return repJson({ error: "Reserve aux administrateurs" }, 403);
        }

        const principaux = comptesPrincipaux(env);
        const users = await lireUtilisateurs(env);

        if (payload.action === "list") {
          const liste = Object.keys(users).map(function (c) {
            return {
              code: c,
              nom: users[c].nom || "",
              role: normaliserRole(users[c].role),
              droits: droitsDe(users[c]),
              emoji: users[c].emoji || "",
              genre: users[c].genre || "",
              cree: users[c].cree || "",
              principal: false
            };
          });
          liste.sort(function (a, b) { return a.nom.localeCompare(b.nom); });
          for (let i = principaux.length - 1; i >= 0; i--) {
            liste.unshift({
              code: principaux[i].code, nom: principaux[i].nom,
              role: "admin", droits: Object.assign({}, DROITS_ROLE.admin),
              cree: "", principal: true
            });
          }
          return repJson({ utilisateurs: liste, kv: !!env.UTILISATEURS });
        }

        /* ---- Genre du moniteur, pour les accords du bilan ---- */
        if (payload.action === "genre") {
          const c3 = String(payload.cible || "").trim();
          const g = String(payload.genre || "").trim().slice(0, 1).toUpperCase();
          if (!users[c3]) return repJson({ error: "Utilisateur introuvable." }, 404);
          if (g && g !== "F" && g !== "M") {
            return repJson({ error: "Genre attendu : F ou M." }, 400);
          }
          users[c3].genre = g;
          await ecrireUtilisateurs(env, users);
          return repJson({ ok: true, genre: g });
        }

        /* ---- Émoji du moniteur, visible sur la fiche manœuvres ---- */
        if (payload.action === "emoji") {
          const c2 = String(payload.cible || "").trim();
          const e = String(payload.emoji || "").trim();

          if (!users[c2]) return repJson({ error: "Utilisateur introuvable." }, 404);
          /* Un émoji fait au plus quelques caractères : on borne */
          if (e.length > 8) return repJson({ error: "Un seul émoji, s'il te plait." }, 400);

          users[c2].emoji = e;
          await ecrireUtilisateurs(env, users);
          return repJson({ ok: true, emoji: e });
        }

        /* ---- Changer le code d'accès d'un utilisateur ---- */
        if (payload.action === "changerCode") {
          const ancien = String(payload.cible || "").trim();
          const nouveau = String(payload.nouveauCode || "").trim();

          if (!/^[0-9]{6,8}$/.test(nouveau)) {
            return repJson({ error: "Le code doit contenir de 6 a 8 chiffres." }, 400);
          }
          if (trouverPrincipal(env, ancien)) {
            return repJson({ error: "Le code d'un compte principal se change dans Cloudflare." }, 400);
          }
          if (!users[ancien]) {
            return repJson({ error: "Utilisateur introuvable." }, 404);
          }
          if (nouveau === ancien) {
            return repJson({ error: "C'est deja son code." }, 400);
          }
          if (trouverPrincipal(env, nouveau) || users[nouveau]) {
            return repJson({ error: "Ce code est deja attribue." }, 409);
          }

          /* Le compte est déplacé : nom, rôle et droits suivent */
          users[nouveau] = users[ancien];
          delete users[ancien];
          await ecrireUtilisateurs(env, users);

          /* Les essais ratés de l'ancien code n'ont plus de sens */
          try { await env.UTILISATEURS.delete("essais:" + ancien); } catch (e) {}

          return repJson({ ok: true, code: nouveau, nom: users[nouveau].nom });
        }

        if (payload.action === "create") {
          const c = String(payload.nouveauCode || "").trim();
          const nom = String(payload.nom || "").trim();
          const role = normaliserRole(payload.role);

          if (!/^[0-9]{6,8}$/.test(c)) {
            return repJson({ error: "Le code doit contenir de 6 a 8 chiffres." }, 400);
          }
          if (!nom) {
            return repJson({ error: "Le prenom est obligatoire." }, 400);
          }
          if (trouverPrincipal(env, c)) {
            return repJson({ error: "Ce code est celui d'un compte principal." }, 409);
          }
          if (users[c]) {
            return repJson({ error: "Ce code est deja attribue a " + (users[c].nom || "quelqu'un") + "." }, 409);
          }

          users[c] = {
            nom: nom,
            role: role,
            emoji: String(payload.emoji || "").trim().slice(0, 8),
            genre: String(payload.genre || "").trim().slice(0, 1),
            droits: Object.keys(nettoyerDroits(payload.droits)).length
              ? nettoyerDroits(payload.droits)
              : Object.assign({}, DROITS_ROLE[role]),
            cree: new Date().toISOString().slice(0, 10)
          };
          await ecrireUtilisateurs(env, users);
          return repJson({ ok: true });
        }

        if (payload.action === "delete") {
          const c = String(payload.cible || "").trim();
          if (trouverPrincipal(env, c)) {
            return repJson({ error: "Un compte principal ne peut pas etre supprime." }, 403);
          }
          if (c === monCode) {
            return repJson({ error: "Tu ne peux pas supprimer ton propre code." }, 403);
          }
          if (!users[c]) {
            return repJson({ error: "Code inconnu." }, 404);
          }
          delete users[c];
          await ecrireUtilisateurs(env, users);
          return repJson({ ok: true });
        }

        if (payload.action === "droits") {
          const c = String(payload.cible || "").trim();
          if (!users[c]) return repJson({ error: "Code inconnu." }, 404);
          users[c].droits = nettoyerDroits(payload.droits);
          /* Réglés à la main : le vide devient un choix, pas un défaut */
          users[c].droitsRegles = true;
          if (c === monCode && users[c].droits.admin !== "m") {
            return repJson({ error: "Tu ne peux pas retirer ton propre acces a l administration." }, 403);
          }
          await ecrireUtilisateurs(env, users);
          return repJson({ ok: true });
        }

        if (payload.action === "role") {
          const c = String(payload.cible || "").trim();
          const role = normaliserRole(payload.role);
          if (trouverPrincipal(env, c)) {
            return repJson({ error: "Un compte principal reste toujours administrateur." }, 403);
          }
          if (c === monCode && role !== "admin") {
            return repJson({ error: "Tu ne peux pas retirer ton propre role administrateur." }, 403);
          }
          if (!users[c]) {
            return repJson({ error: "Code inconnu." }, 404);
          }
          users[c].role = role;
          users[c].droits = Object.assign({}, DROITS_ROLE[role]);   /* droits repris du rôle */
          await ecrireUtilisateurs(env, users);
          return repJson({ ok: true });
        }

        return repJson({ error: "Action inconnue" }, 400);
      }

      /* ---- Google Sheets ---- */
      if (url.pathname === "/sheets") {
        if (payload.action === "append") {
          const donnees = payload.data || {};
          donnees.monitorName = donnees.monitorName || moi.nom;
          const r = await fetch(env.SHEETS_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(donnees)
          });
          return new Response(await r.text(), { status: r.status, headers: entetes(true) });
        }

        if (payload.action === "supprimerEleve") {
          /* Réservé aux administrateurs : action irréversible */
          if (moi.role !== "admin") {
            return repJson({ error: "Seul un administrateur peut supprimer un dossier eleve." }, 403);
          }
          const cible = String(payload.eleve || "").trim();
          if (cible.length < 2) {
            return repJson({ error: "Nom d'eleve invalide." }, 400);
          }
          const r = await fetch(env.SHEETS_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "supprimerEleve", eleve: cible })
          });
          return new Response(await r.text(), { status: r.status, headers: entetes(true) });
        }

        if (payload.action === "prepAdd" || payload.action === "prepDelete" || payload.action === "prepAssign" ||
            payload.action === "prepList" || payload.action === "consigneAdd" ||
            payload.action === "consigneList" || payload.action === "consigneDone" ||
            payload.action === "bureauEtat" || payload.action === "suiviSet" ||
            payload.action === "suiviDelete" || payload.action === "configSet" ||
            payload.action === "journalList" || payload.action === "modeleList" ||
            payload.action === "modeleSet" || payload.action === "modeleDelete" ||
            payload.action === "resultatAdd" || payload.action === "resultatList" ||
            payload.action === "captureAdd" || payload.action === "captureList" ||
            payload.action === "captureDelete" ||
            payload.action === "elevesImport" || payload.action === "eleveRetirer" || payload.action === "consigneEffacerEleve" || payload.action === "bilanModifier" || payload.action === "bilanMaj" ||
            payload.action === "fichesList" || payload.action === "ficheSet") {

          /* Le journal d'activité ne regarde que les administrateurs */
          if (payload.action === "journalList" && moi.role !== "admin") {
            return repJson({ error: "Journal réservé aux administrateurs." }, 403);
          }
          const corps = Object.assign({}, payload);
          delete corps.code;
          corps.moniteur = corps.moniteur || moi.nom;

          /* L'identité vient du code d'accès, jamais du client :
             elle sert au contrôle des droits et au journal d'activité. */
          corps.demandeur = moi.nom;
          corps.role = moi.role;
          const r = await fetch(env.SHEETS_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(corps)
          });
          return new Response(await r.text(), { status: r.status, headers: entetes(true) });
        }

        if (payload.action === "eleves") {
          const r = await fetch(env.SHEETS_URL + "?action=eleves");
          return new Response(await r.text(), { status: r.status, headers: entetes(true) });
        }

        if (payload.action === "search") {
          const eleve = String(payload.eleve || "").trim();
          const moniteur = String(payload.moniteur || "").trim();
          if (eleve.length < 2 && moniteur.length < 2) return repJson({ resultats: [] });
          const leger = payload.leger ? "&leger=1" : "";
          const qm = moniteur ? "&moniteur=" + encodeURIComponent(moniteur) : "";
          const site = String(payload.site || "").trim();
          const qs = site ? "&site=" + encodeURIComponent(site) : "";
          const r = await fetch(env.SHEETS_URL + "?eleve=" + encodeURIComponent(eleve) + qm + qs + leger);
          return new Response(await r.text(), { status: r.status, headers: entetes(true) });
        }

        return repJson({ error: "Action inconnue" }, 400);
      }

      /* ---- API Claude ---- */

      /* ============================================================
         ENVOI DE SMS PAR L'API ALLO
         La clé reste ici : dans le navigateur, elle serait lisible
         par n'importe qui et utilisable à vos frais.
         ============================================================ */
      if (url.pathname === "/sms") {
        const moi = await identifier(env, payload.code);
        if (!moi) return repJson({ error: "Code invalide." }, 403);

        const d = droitsDe(moi);
        if (d.rappels !== "m" && d.sms !== "m" && moi.role !== "admin") {
          return repJson({ error: "Envoi de SMS non autorisé pour ce compte." }, 403);
        }

        if (!env.ALLO_API_KEY) {
          return repJson({ error: "Clé Allo non configurée dans le Worker." }, 500);
        }

        /* L'expéditeur peut être un numéro ou un Sender ID alphanumérique
           (« EvolutionC »). Convertir un Sender ID en numéro le détruirait. */
        const expediteur = expediteurValide(payload.from || env.ALLO_FROM);
        if (!expediteur) {
          return repJson({ error: "Expéditeur non configuré (ALLO_FROM). " +
                                  "Mets ton numéro ou ton Sender ID." }, 500);
        }

        const dest = enFormatInternational(payload.to);
        if (!dest || dest.length < 11) {
          return repJson({ error: "Numéro du destinataire incomplet." }, 400);
        }

        const texte = String(payload.message || "").trim();
        if (!texte) return repJson({ error: "Message vide." }, 400);
        if (texte.length > LIMITE_SMS) {
          return repJson({ error: "Message trop long : " + texte.length +
                                  " caractères pour " + LIMITE_SMS + " autorisés." }, 400);
        }

        try {
          /* Allo distingue un numéro de ligne d'un Sender ID :
             ce ne sont pas les mêmes champs, et un Sender ID envoyé
             comme numéro donne « FROM_NUMBER_NOT_FOUND ». */
          const corpsAllo = { to: dest, message: texte };
          if (/[a-zA-Z]/.test(expediteur)) corpsAllo.sender_id = expediteur;
          else corpsAllo.from = expediteur;

          const resp = await fetch("https://api.withallo.com/v1/api/sms", {
            method: "POST",
            headers: {
              "Authorization": env.ALLO_API_KEY,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(corpsAllo)
          });

          const corpsTexte = await resp.text();
          if (!resp.ok) {
            /* Le quota journalier mérite un message compréhensible */
            let d2 = null;
            try { d2 = JSON.parse(corpsTexte); } catch (e) {}
            const code2 = (d2 && (d2.code || (d2.error && d2.error.code))) || "";
            if (code2 === "FROM_NUMBER_NOT_FOUND" || code2 === "SENDER_ID_NOT_FOUND") {
              return repJson({
                error: "L'expéditeur « " + expediteur + " » n'existe pas sur ton compte Allo. " +
                       "Vérifie ALLO_FROM : il doit reprendre exactement un numéro ou " +
                       "un Sender ID de ton compte, majuscules comprises."
              }, 400);
            }
            if (d2 && d2.code === "API_KEY_QUOTA_EXCEEDED") {
              const info = (d2.details && d2.details[0] && d2.details[0].message) || "";
              const m = info.match(/reset_in=(\d+)/);
              const minutes = m ? Math.ceil(parseInt(m[1], 10) / 60) : null;
              return repJson({
                error: "Quota journalier Allo atteint" +
                       (minutes ? ", réessaie dans " + minutes + " minutes." : "."),
                quota: true
              }, 429);
            }
            return repJson({ error: "Allo a refusé l'envoi (" + resp.status + ") : " +
                                    corpsTexte.slice(0, 200) }, 502);
          }

          /* Trace de l'envoi, pour savoir qui a écrit à qui */
          try {
            await fetch(env.SHEETS_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "consigneAdd", type: "sms",
                eleve: String(payload.eleve || ""),
                texte: "SMS envoyé au " + dest,
                par: moi.nom, demandeur: moi.nom, role: moi.role
              })
            });
          } catch (e) { /* le journal ne doit pas bloquer l'envoi */ }

          return repJson({ ok: true, to: dest });
        } catch (err) {
          return repJson({ error: "Envoi impossible : " + err.message }, 502);
        }
      }

      if (url.pathname === "/ia") {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify(payload.payload || {})
        });
        return new Response(await resp.text(), { status: resp.status, headers: entetes(true) });
      }

      return repJson({ error: "Route inconnue" }, 404);

    } catch (err) {
      return repJson({ error: err.message }, 500);
    }
  }
}
