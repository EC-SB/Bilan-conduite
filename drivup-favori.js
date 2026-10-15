/* Déployé le 15/10/2026 à 12:15 — v1181 */
/* ============================================================
   drivup-favori.js — LE FAVORI « 📥 Bilan de conduite »

   David, le 13 octobre : « récupérer les infos des élèves pour
   éviter d'avoir à écrire sur Drivup et sur notre app, avoir le
   planning des élèves pour faire les rappels et les prochains
   cours ». Drivup refuse l'accès à son API.

   Ce fichier ne tourne PAS dans l'application. Il est chargé par le
   favori, dans la page Drivup que la personne du bureau a ouverte
   elle-même, avec SA connexion :

   · le planning d'une agence ou d'un moniteur — les cours, et pour
     chacun l'élève exact (le détail que Drivup ouvre quand on clique
     sur un cours) ;
   · la liste des élèves — les lignes affichées ;
   · la fiche d'un élève — ce que la liste n'a pas (mail, naissance) ;
   · 📍 v1170 — depuis le planning d'une agence, les créneaux
     « Bureau Loudéac » / « Bureau Saint Brieuc » des quatre semaines
     à venir : les horaires d'ouverture des bureaux, pour les seuls
     bureaux dont la reprise Drivup est activée dans l'application.

   Il ne fait que LIRE : aucun bouton n'est touché, rien n'est écrit
   dans Drivup, aucun mot de passe n'est lu. Ce qu'il a lu part
   dans l'onglet de l'application que le favori vient d'ouvrir, qui
   montre ce qui change et attend qu'on valide.

   ⚠️ L'ONGLET EST OUVERT PAR LE FAVORI, PAS ICI. Chrome n'accepte
   d'ouvrir une fenêtre qu'au moment du clic ; ce fichier arrive
   une seconde plus tard, par le réseau. Le favori ouvre donc
   l'onglet tout de suite et nous le passe (window.__ecFenetre).
   ============================================================ */
(function () {
  'use strict';
  if (window.__ecDrivupEnCours) return;
  window.__ecDrivupEnCours = true;

  const script = document.currentScript;
  const APP = (script && script.dataset && script.dataset.app) ||
              (script && script.src ? new URL(script.src).origin : 'https://app.evolutionconduites.fr');
  const fen = window.__ecFenetre || null;

  /* ---------- Le petit cadre en bas à droite de la page Drivup ---------- */
  const cadre = document.createElement('div');
  cadre.id = 'ecDrivupCadre';
  cadre.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:340px;' +
    'background:#111;color:#fff;border:2px solid #B6FF0E;border-radius:14px;padding:12px 14px;' +
    'font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35);';
  const titre = document.createElement('div');
  titre.style.cssText = 'font-weight:800;margin-bottom:4px;';
  titre.textContent = '📥 Bilan de conduite';
  const texte = document.createElement('div');
  const fermer = document.createElement('button');
  fermer.type = 'button';
  fermer.textContent = '✕';
  fermer.setAttribute('aria-label', 'Fermer');
  fermer.style.cssText = 'position:absolute;top:6px;right:8px;background:none;border:0;color:#fff;font-size:15px;cursor:pointer;';
  fermer.addEventListener('click', () => { cadre.remove(); window.__ecDrivupEnCours = false; });
  cadre.append(fermer, titre, texte);
  document.body.appendChild(cadre);
  const dire = t => { texte.textContent = t; };
  const finir = t => { dire(t); window.__ecDrivupEnCours = false; };

  if (location.hostname !== 'app.drivup.fr') {
    finir('Ce favori se clique sur une page de Drivup (app.drivup.fr).');
    return;
  }

  const propre = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  /* ⚠️ L'HEURE SE LIT DANS LE TEXTE DU COURS, PAS DANS SA DATE — v1168.

     David, le 13 octobre : « des erreurs d'heure… ça décale tout ».
     Le calendrier de Drivup range ses heures « en UTC déguisé » : la
     date d'un cours de 8 h vaut 8 h en temps universel, et lue à
     l'heure de Paris elle devenait 10 h. Tout était décalé de deux
     heures (une en hiver). Le texte du cours, lui, dit l'heure
     affichée — « 2026-10-15T08:00:00+02:00 » : on lit celle-là. */
  const jourDuTexte = t => (String(t || '').match(/^(\d{4}-\d{2}-\d{2})/) || [])[1] || '';
  const heureDuTexte = t => (String(t || '').match(/T(\d{2}:\d{2})/) || [])[1] || '';
  const PHOTO_DRIVUP = /\/avatar\/\d+-\d+-avatar\.(jpe?g|png|webp)$/i;
  const photoDe = img => {
    if (!img || !img.getAttribute('src')) return '';
    try {
      const u = new URL(img.getAttribute('src'), location.href);
      return (u.protocol === 'https:' && /(^|\.)drivup\.fr$/.test(u.hostname) && PHOTO_DRIVUP.test(u.pathname)) ? u.href : '';
    } catch (e) { return ''; }
  };
  const envoyerAuFil = m => { try { if (fen && !fen.closed) fen.postMessage(m, APP); } catch (e) {} };

  /* ---------- Le détail d'un cours : qui, exactement ---------- */
  function elevesDuDetail(doc) {
    const out = [];
    const vus = {};
    doc.querySelectorAll('.categoriePermis').forEach(cat => {
      let c = cat.parentElement;
      for (let k = 0; k < 5 && c && !(c.querySelector('strong') && c.querySelector('a[href*="eleve="]')); k++) {
        c = c.parentElement;
      }
      if (!c) return;
      const st = c.querySelector('strong');
      let sp = st && st.nextElementSibling;
      if (!sp || sp.tagName !== 'SPAN') sp = c.querySelector('strong ~ span');
      const a = c.querySelector('a[href*="eleve="]');
      const id = ((a && a.getAttribute('href') || '').match(/eleve=(\d+)/) || [])[1] || '';
      if (!id || vus[id]) return;
      vus[id] = true;
      const tel = c.querySelector('a[href^="tel:"]');
      out.push({
        id: id,
        nom: propre(st && st.textContent),
        prenom: propre(sp && sp.textContent),
        formation: propre(cat.textContent),
        mobile: propre(tel ? (tel.textContent || tel.getAttribute('href').slice(4)) : ''),
        photo: photoDe(c.querySelector('img.zooming') || c.querySelector('img'))
      });
    });
    const td = doc.querySelector('td');
    return { libelle: propre(td && td.textContent).slice(0, 140), eleves: out };
  }

  /* Un créneau d'examen a sa propre page : une ligne par candidat,
     son nom entier suivi de sa catégorie. On ne sait pas dans quel
     ordre Drivup écrit nom et prénom : on garde le nom entier, et
     c'est l'id Drivup qui reconnaît l'élève. */
  function elevesDeLExamen(doc) {
    const out = [];
    const vus = {};
    doc.querySelectorAll('a[href*="eleve="]').forEach(a => {
      const id = ((a.getAttribute('href') || '').match(/eleve=(\d+)/) || [])[1] || '';
      const tr = a.closest('tr');
      if (!id || vus[id] || !tr) return;
      vus[id] = true;
      const sp = tr.querySelector('span');
      const cat = sp && sp.querySelector('span');
      const complet = propre([...(sp ? sp.childNodes : [])].filter(n => n.nodeType === 3).map(n => n.textContent).join(' '));
      out.push({ id: id, nom: '', prenom: '', complet: complet, formation: propre(cat && cat.textContent), mobile: '' });
    });
    const t = doc.querySelector('td, h4, h5');
    return { libelle: propre(t && t.textContent).slice(0, 140), eleves: out };
  }

  async function lireDetail(e) {
    const p = e.extendedProps || {};
    if (p.examen && p.examen !== '0') {
      const r = await fetch('/planning/booking_examen_rdv_permis.php?id=' + encodeURIComponent(p.agendaInterne || ''),
                            { credentials: 'include' });
      if (!r.ok) throw new Error('examen ' + r.status);
      return elevesDeLExamen(new DOMParser().parseFromString(await r.text(), 'text/html'));
    }
    const url = '/planning/booking_details.php?id=' + encodeURIComponent(p.agendaInterne || '') +
                '&typeRdv=' + encodeURIComponent(p.typeRdv || '') + '&coursId=' + encodeURIComponent(e.id);
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) throw new Error('détail ' + r.status);
    const h = await r.text();
    return elevesDuDetail(new DOMParser().parseFromString(h, 'text/html'));
  }

  /* ---------- Le planning ---------- */
  async function lirePlanning() {
    const cal = window.__FC_CAL;
    const tous = cal.getEvents().filter(e => jourDuTexte(e.startStr) && heureDuTexte(e.startStr));
    const jours = tous.map(e => jourDuTexte(e.startStr)).sort();
    const duUrl = new URLSearchParams(location.search).get('date') || '';
    const du = /^\d{4}-\d{2}-\d{2}$/.test(duUrl) ? duUrl : (jours[0] || '');
    let au = jours.length ? jours[jours.length - 1] : du;
    if (au < du) au = du;
    if (!du) throw new Error('aucun cours dans ce planning');

    let porteeGenre = 'agence', porteeValeur = '';
    if (/moniteur\.php/.test(location.pathname)) {
      porteeGenre = 'moniteur';
      const res = cal.getResources ? cal.getResources() : [];
      porteeValeur = res.length === 1 ? propre(res[0].title) : '';
    } else {
      porteeValeur = propre((document.title.match(/^Agence\s+(.+?)\s+-\s+Drivup/i) || [])[1] || '');
    }
    if (!porteeValeur) throw new Error('je ne reconnais pas ce planning (ni agence ni moniteur seul)');

    /* 🚗 v1181 — LES NUMÉROS DE VOITURE. David, le 15 octobre : « en
       haut du planning on met des numéros qui correspondent aux
       voitures ». Ce sont de petits créneaux sans élève, titrés « .1 »,
       « .7 », dans la colonne du moniteur : à 7h00 « .1 » (A3 n° 1,
       boîte manuelle), à 7h30 « .7 » (Q3 n° 7, automatique), et à
       12h45 « .9 » quand il change de voiture l'après-midi. L'heure
       compte : c'est à partir d'elle que la voiture vaut. On ne lit
       que le titre, le jour, l'heure et la colonne. */
    const voitures = [];
    tous.forEach(e => {
      const m = propre(e.title).match(/^[.·•]\s*(\d{1,3})$/);
      if (!m) return;
      const res = (e.getResources ? e.getResources() : []).map(r => propre(r.title));
      if (!res[0]) return;
      voitures.push({ jour: jourDuTexte(e.startStr), heure: heureDuTexte(e.startStr),
                      moniteurDrivup: res[0], numero: String(Number(m[1])) });
    });
    /* Les colonnes lues : une voiture retirée dans Drivup doit
       s'effacer chez nous, mais seulement pour ces moniteurs-là. */
    const colonnes = (cal.getResources ? cal.getResources() : []).map(r => propre(r.title)).filter(Boolean);

    const avecEleves = tous.filter(e => {
      const p = e.extendedProps || {};
      return Number(p.nbrEleve) > 0 || p.clientName || (p.examen && p.examen !== '0');
    });
    const ignores = tous.length - avecEleves.length;

    const cours = [];
    let fait = 0, rates = 0;
    const file = avecEleves.slice();
    async function ouvrier() {
      while (file.length) {
        const e = file.shift();
        const p = e.extendedProps || {};
        const res = (e.getResources ? e.getResources() : []).map(r => propre(r.title));
        let d = { libelle: propre(e.title), eleves: [] };
        try { d = await lireDetail(e); } catch (err) { rates++; }
        if (!d.eleves.length && p.clientName) {
          d.eleves = [{ id: '', nom: propre(p.clientName), prenom: '', formation: '', mobile: '' }];
        }
        cours.push({
          id: String(e.id),
          jour: jourDuTexte(e.startStr),
          debut: heureDuTexte(e.startStr),
          fin: heureDuTexte(e.endStr),
          agence: propre(p.address),
          moniteurDrivup: res[0] || '',
          titre: propre(e.title).slice(0, 140),
          libelle: d.libelle || propre(e.title).slice(0, 140),
          examen: !!(p.examen && p.examen !== '0'),
          eleves: d.eleves
        });
        fait++;
        dire('Lecture du planning… ' + fait + ' / ' + avecEleves.length + ' cours');
        /* L'onglet de l'application suit la lecture — v1168 : David
           voyait un onglet vide pendant trente secondes. */
        if (fait % 3 === 0 || fait === avecEleves.length) {
          envoyerAuFil({ type: 'drivup-progression', fait: fait, total: avecEleves.length });
        }
        /* Six à la fois, une courte pause : vite, sans rafale. */
        await new Promise(r => setTimeout(r, 40));
      }
    }
    await Promise.all([ouvrier(), ouvrier(), ouvrier(), ouvrier(), ouvrier(), ouvrier()]);
    cours.sort((a, b) => (a.jour + a.debut).localeCompare(b.jour + b.debut));
    return { genre: 'planning', porteeGenre, porteeValeur, du, au, cours,
             ignores: Math.max(0, ignores - voitures.length), detailsRates: rates,
             voitures, colonnes };
  }

  /* ---------- 📍 Les horaires des bureaux — v1170 ----------

     David, le 13 octobre : « sur le planning on peut voir bureau
     Loudéac […] les ouvertures et fermetures se font automatiquement
     quand on est sur le planning avec le bouton ».

     ⚠️ QUATRE SEMAINES, QUEL QUE SOIT LE JOUR AFFICHÉ. Le planning ne
     tient en mémoire que la semaine à l'écran ; on redemande donc à
     Drivup, comme il le fait lui-même en changeant de semaine, le
     flux des quatre semaines à venir (une semaine par demande).
     Lecture seule, la même adresse que la page.

     ⚠️ ON RECONNAÎT UN CRÉNEAU DE BUREAU À SON TYPE, PAS À SON TITRE.
     Vu depuis l'autre agence, Drivup masque le titre (« RDV sur autre
     agence ») ; le type, lui, reste. Le titre sert quand le type n'est
     pas donné.

     ⚠️ ET ON NE LIT QUE LES BUREAUX QUI L'ONT DEMANDÉ : l'application
     dit lesquels ont leur interrupteur « 📥 Horaires repris de
     Drivup » activé. Un bureau coupé n'est même pas demandé. */
  const RELAIS = 'https://bilan-proxy.evolutionconduites.workers.dev';
  const jourPlus = (iso, n) => {
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n)).toISOString().slice(0, 10) : '';
  };
  const sansAccent = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  async function lireLesBureaux() {
    if (!/\/planning\/agence\.php/.test(location.pathname)) return null;
    let quels = [];
    try {
      const r = await fetch(RELAIS + '/bureau?quoi=drivup', { credentials: 'omit', cache: 'no-store' });
      const j = await r.json();
      quels = (j && Array.isArray(j.bureaux)) ? j.bureaux : [];
    } catch (e) {
      return { erreur: 'Les réglages des bureaux n’ont pas pu être lus : les horaires des bureaux ne sont pas repris cette fois.' };
    }
    if (!quels.length) return [];
    const flux = performance.getEntriesByType('resource').map(e => e.name)
      .filter(n => /\/planning\/data\/FCIO_agence_events\.php/.test(n)).pop();
    if (!flux) return { erreur: 'Le flux du planning est introuvable : recharge la page Drivup, puis reclique sur le favori.' };

    const cal = window.__FC_CAL;
    const noms = {};
    (cal && cal.getResources ? cal.getResources() : []).forEach(r => { noms[String(r.id)] = propre(r.title); });

    const du = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const au = jourPlus(du, 27);
    const parBureau = {};
    quels.forEach(b => { parBureau[b.id] = {}; });
    const inconnus = {};
    const lus = [];
    for (let k = 0; k < 4; k++) {
      const u = new URL(flux);
      u.searchParams.set('date', jourPlus(du, 7 * k));
      u.searchParams.set('_', String(Date.now()));
      const r = await fetch(u.href, { credentials: 'include' });
      const l = await r.json();
      (Array.isArray(l) ? l : ((l && l.events) || [])).forEach(e => {
        const type = String(e.typeRdv != null ? e.typeRdv : ((e.extendedProps || {}).typeRdv || ''));
        const t = sansAccent(e.title);
        const b = quels.find(x => (type && type === String(x.typeRdv)) || (t && t === sansAccent(x.titre)));
        if (!b) return;
        const jour = jourDuTexte(e.start), deb = heureDuTexte(e.start), fin = heureDuTexte(e.end);
        if (!jour || jour < du || jour > au || !deb || !fin || fin <= deb) return;
        lus.push({ b: b.id, jour, deb, fin, res: String(e.resourceId || '') });
        if (e.resourceId && !noms[String(e.resourceId)]) inconnus[String(e.resourceId)] = true;
      });
      await new Promise(r => setTimeout(r, 60));
    }

    /* Celui qui tient le bureau n'est pas forcément une colonne de
       la page affichée (Maryne tient Loudéac, sa colonne est sur le
       planning de Saint-Brieuc) : on demande son nom à Drivup. */
    const ids = Object.keys(inconnus);
    if (ids.length) {
      try {
        const res = performance.getEntriesByType('resource').map(e => e.name)
          .filter(n => /\/planning\/data\/FCIO_semaine_resources\.php/.test(n)).pop();
        if (res) {
          const u = new URL(res);
          u.searchParams.set('monitors', ids.join(','));
          u.searchParams.set('_', String(Date.now()));
          const l = await (await fetch(u.href, { credentials: 'include' })).json();
          (Array.isArray(l) ? l : []).forEach(x => { if (x && x.id != null) noms[String(x.id)] = propre(x.title); });
        }
      } catch (e) { /* le nom manquera, l'heure reste */ }
    }

    lus.forEach(x => {
      const j = parBureau[x.b][x.jour] || (parBureau[x.b][x.jour] = { jour: x.jour, plages: [], tenu: [] });
      j.plages.push([x.deb, x.fin]);
      const n = noms[x.res];
      if (n && j.tenu.indexOf(n) === -1) j.tenu.push(n);
    });
    return quels.map(b => ({
      bureau: b.id, titre: b.titre, du: du, au: au,
      jours: Object.keys(parBureau[b.id]).sort().map(j => parBureau[b.id][j])
    }));
  }

  /* ---------- La liste des élèves ---------- */
  function lireListe() {
    const t = document.querySelector('#myTable');
    const entetes = [...t.querySelectorAll('thead th')].map(th => propre(th.textContent).toLowerCase());
    const col = n => entetes.indexOf(n);
    const lignes = [...t.querySelectorAll('tbody tr')].filter(tr => tr.offsetParent !== null && tr.cells.length >= entetes.length - 1);
    const eleves = lignes.map(tr => {
      const v = n => (col(n) === -1 ? '' : propre(tr.cells[col(n)] && tr.cells[col(n)].textContent));
      return { id: v('id').replace(/\D/g, ''), nom: v('nom'), prenom: v('prénom'), neph: v('neph').replace(/\D/g, ''),
               mobile: v('mobile'), formation: v('permis'), agence: v('agence') };
    }).filter(x => x.id && (x.nom || x.prenom));
    return { genre: 'eleves', eleves };
  }

  /* ---------- La fiche d'un élève ---------- */
  /* La catégorie de permis : la pastille au-dessus de la photo
     (« CA », « B (BEA) »…). L'application la traduit en formation. */
  const CODES_PERMIS = /^(B|B \(BEA\)|B \(PMR\)|BEA -> B|CA|CA \(BEA\)|CS|CS \(BEA\)|A|A1|A1 Equivalence|A2|A Passerelle|AM|AM Quadricycle|BE|C|D)$/i;
  function formationDeLaFiche() {
    /* La pastille du menu de l'élève (relevée le 13 octobre). Jamais
       les menus de la page : la fenêtre « Ajouter un élève », cachée,
       en contient la liste entière. */
    const p = document.querySelector('#menu_eleve .permisEleve');
    if (p && CODES_PERMIS.test(propre(p.textContent))) return propre(p.textContent);
    const menu = document.getElementById('menu_eleve');
    if (!menu) return '';
    const f = [...menu.querySelectorAll('*')]
      .filter(n => !n.childElementCount && n.tagName !== 'OPTION' && !n.closest('select'))
      .find(n => CODES_PERMIS.test(propre(n.textContent)));
    return f ? propre(f.textContent) : '';
  }

  /* Les notes internes : leur page se remplit après coup (Drivup les
     charge par son propre script). On l'ouvre donc, invisible, et on
     attend qu'elles y soient. */
  function notesDeLaFiche(id) {
    return new Promise(res => {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:absolute;left:-9999px;top:0;width:10px;height:10px;border:0;';
      let fini = false;
      const finir = v => { if (fini) return; fini = true; f.remove(); res(v); };
      /* Le texte d'une note est un cran plus haut que son titre : on
         remonte jusqu'au premier bloc qui le contient — sans dépasser
         la liste, qui contient celui de toutes les notes. */
      const lire = d => {
        const liste = d.getElementById('notesContainer');
        return [...liste.querySelectorAll('.titreNote')].map(t => {
          let b = t.parentElement;
          while (b && b !== liste && !b.querySelector('.contenuNote')) b = b.parentElement;
          const c = (b && b !== liste) ? b.querySelector('.contenuNote') : null;
          const texte = c ? (String(c.innerText || '').trim() || propre(c.textContent)) : '';
          return { titre: propre(t.textContent).slice(0, 120), texte: texte.slice(0, 3800) };
        }).filter(x => x.texte);
      };
      f.onload = () => {
        let n = 0;
        const t = setInterval(() => {
          let d = null;
          try { d = f.contentDocument; } catch (e) {}
          const c = d && d.getElementById('notesContainer');
          if ((c && c.querySelector('.titreNote')) || n++ > 16) { clearInterval(t); finir(d ? lire(d) : []); }
        }, 250);
      };
      f.src = '/eleves/notes_internes.php?eleve=' + encodeURIComponent(id);
      document.body.appendChild(f);
      setTimeout(() => finir([]), 10000);
    });
  }

  async function lireFiche() {
    const v = id => propre((document.getElementById(id) || {}).value);
    const id = (new URLSearchParams(location.search).get('eleve') || '').replace(/\D/g, '');
    /* ⚠️ LA PHOTO DE L'ÉLÈVE, PAS CELLE DE LA PERSONNE CONNECTÉE — v1169.
       David : « ça reprend ma photo à moi et pas celle de l'élève ».
       La barre du haut de Drivup montre l'avatar de qui est connecté,
       avec le même genre d'adresse, et AVANT celui de l'élève dans la
       page : la première image « avatar » était donc la sienne. On ne
       prend que celle du menu de l'élève (#menu_eleve #avatar). */
    const avatar = document.querySelector('#menu_eleve #avatar') ||
                   document.querySelector('#menu_eleve .avatar-container img');
    dire('Lecture de ses notes internes…');
    const notes = id ? await notesDeLaFiche(id) : [];
    return { genre: 'fiche', eleve: {
      id: id, nom: v('nom'), prenom: v('prenom'), email: v('email'), mailPrescripteur: v('mailPrescripteur'),
      neph: v('neph').replace(/\D/g, ''), mobile: v('fakeMobile'), naissance: v('dateNaissance'),
      formation: formationDeLaFiche(), photo: photoDe(avatar), notes: notes
    } };
  }

  /* ---------- Envoyer à l'onglet de l'application ---------- */
  function envoyer(paquet) {
    if (!fen || fen.closed) {
      finir('⚠️ Chrome a bloqué l’ouverture de Bilan de conduite. Autorise les fenêtres pour app.drivup.fr, puis reclique sur le favori.');
      return;
    }
    paquet.type = 'drivup-donnees';
    paquet.version = 1;
    paquet.luA = new Date().toISOString();
    let recu = false;
    const ecoute = ev => {
      if (ev.origin !== APP || !ev.data) return;
      if (ev.data.type === 'drivup-pret' && !recu) fen.postMessage(paquet, APP);
      if (ev.data.type === 'drivup-recu') {
        recu = true;
        window.removeEventListener('message', ecoute);
        finir('✅ Envoyé. Relis et valide dans l’onglet Bilan de conduite.');
      }
    };
    window.addEventListener('message', ecoute);
    dire('Envoi à Bilan de conduite… (connecte-toi dans l’onglet ouvert si besoin)');
    let essais = 0;
    const t = setInterval(() => {
      if (recu || essais++ > 400 || fen.closed) {
        clearInterval(t);
        if (!recu) finir('⚠️ L’onglet Bilan de conduite n’a pas répondu. Reclique sur le favori.');
        return;
      }
      try { fen.postMessage(paquet, APP); } catch (e) { /* l'onglet charge encore */ }
    }, 700);
  }

  (async () => {
    try {
      if (window.__FC_CAL && typeof window.__FC_CAL.getEvents === 'function') {
        dire('Lecture du planning…');
        const p = await lirePlanning();
        dire(p.cours.length + ' cours lus.');
        /* 📍 v1170 — les horaires des bureaux, en plus */
        try {
          const b = await lireLesBureaux();
          if (Array.isArray(b)) p.bureaux = b;
          else if (b && b.erreur) p.bureauxErreur = b.erreur;
        } catch (e) {
          p.bureauxErreur = 'Les horaires des bureaux n’ont pas pu être lus : ' + (e && e.message ? e.message : e);
        }
        envoyer(p);
      } else if (/\/eleves\/profil\.php/.test(location.pathname) && document.getElementById('nom')) {
        const p = await lireFiche();
        if (!p.eleve.id) return finir('Je ne trouve pas le numéro de cet élève.');
        dire('Fiche lue.');
        envoyer(p);
      } else if (document.querySelector('#myTable thead th')) {
        const p = lireListe();
        if (!p.eleves.length) return finir('Aucun élève affiché dans la liste.');
        dire(p.eleves.length + ' élèves lus.');
        envoyer(p);
      } else {
        if (fen && !fen.closed) fen.close();
        finir('Ouvre dans Drivup le planning d’une agence ou d’un moniteur, la liste des élèves, ou la fiche d’un élève, puis reclique sur le favori.');
      }
    } catch (e) {
      if (fen && !fen.closed) fen.close();
      finir('⚠️ Lecture impossible : ' + (e && e.message ? e.message : e));
    }
  })();
})();
