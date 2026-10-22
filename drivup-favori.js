/* Déployé le 21/10/2026 à 19:20 — v1235 */
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

   Il LIT : aucun bouton n'est touché, aucun mot de passe n'est lu.
   Une seule exception, voulue par David le 21 octobre : 👂 ouvrir les
   écoutes pédagogiques, quand l'onglet de l'application le demande
   après validation (voir « les écoutes pédagogiques » plus bas). Ce qu'il a lu part
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

  /* ---------- 👂 v1229 — les écoutes pédagogiques ----------

     David, le 21 octobre : « quand un cours est prévu sur un
     moniteur, il faut ouvrir une écoute pédagogique dans les cases
     écoutes ». C'est la SEULE chose que ce favori écrit dans Drivup
     (son feu vert, contrat vérifié), et seulement quand l'onglet
     Bilan de conduite le demande, après qu'on a validé la liste.

     ⚠️ ON N'OBÉIT QU'À L'ONGLET DE L'APPLICATION (origine APP), et
     même à lui, on ne fait QUE ça : une prestation d'écoute, dans une
     colonne d'écoute (BEA, BV, Ecoute), à une heure donnée. Une
     demande qui sort de ce cadre est refusée ici, quoi qu'elle dise.

     ⚠️ ET ON CRÉE COMME DRIVUP CRÉE : on ouvre son formulaire
     « Planifier » (booking_rec.php) avec la prestation choisie, on
     vérifie qu'il dit bien la bonne colonne, la bonne heure et la
     bonne prestation, puis on l'envoie tel que Drivup l'a rempli. */
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const semaineIso = d => {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const j = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - j);
    const an = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - an) / 86400000 + 1) / 7);
  };
  const fluxDuPlanning = () => performance.getEntriesByType('resource').map(e => e.name)
    .filter(n => /\/planning\/data\/FCIO_agence_events\.php/.test(n)).pop() || '';
  function ressourcesALEcran() {
    const cal = window.__FC_CAL;
    const liste = (cal && cal.getResources ? cal.getResources() : []).map(r => ({ id: String(r.id), titre: propre(r.title) }));
    const ordre = [];
    document.querySelectorAll('[data-resource-id]').forEach(e => {
      const id = e.getAttribute('data-resource-id');
      if (id && ordre.indexOf(id) === -1) ordre.push(id);
    });
    if (!ordre.length) return liste;
    return liste.slice().sort((a, b) => {
      const ia = ordre.indexOf(a.id), ib = ordre.indexOf(b.id);
      return (ia === -1 ? 1e6 : ia) - (ib === -1 ? 1e6 : ib);
    });
  }
  const estColonneDEcoute = titre => /^(bea|bv|ecoute)$/.test(sansAccent(titre));

  function parametresDuFormulaire(jour, debut, res, typMo) {
    const m = String(jour).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const h = String(debut).match(/^(\d{2}):(\d{2})$/);
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return new URLSearchParams({
      heure: String(+h[1] * 100 + +h[2]), jour: String(((d.getDay() + 6) % 7) + 1), semaine: String(semaineIso(d)),
      annee: m[1], date_start: jour + ' ' + debut + ':00', type: '0', lieu: '0', prestation: '0',
      ladate2: String(+m[2]), jour2: String(+m[3]), id_presta: '', mono: String(res), elevemax: '', duration: '',
      time: String(Date.now()), typ_mo: String(typMo || ''), typ_pr: '', agence: '0', mode: '1'
    });
  }
  async function formulaireDrivup(jour, debut, res, typMo) {
    const r = await fetch('/planning/booking_rec.php?' + parametresDuFormulaire(jour, debut, res, typMo), { credentials: 'include' });
    if (!r.ok) throw new Error('formulaire ' + r.status);
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    const form = doc.querySelector('form');
    if (!form) throw new Error('formulaire introuvable');
    return form;
  }
  async function prestationsDrivup(jour, res) {
    const form = await formulaireDrivup(jour, '10:00', res, '');
    const out = {};
    const sel = form.querySelector('[name="type_rdv"]');
    [...(sel ? sel.options : [])].forEach(o => {
      const id = (String(o.value).match(/typ_mo=(\d+)/) || [])[1];
      if (id) out[id] = propre(o.textContent).slice(0, 80);
    });
    return out;
  }
  async function evenementsDrivup(du, semaines) {
    const flux = fluxDuPlanning();
    if (!flux) throw new Error('Le flux du planning est introuvable : recharge la page Drivup, puis reclique sur le favori.');
    const vus = {};
    const out = [];
    for (let k = 0; k < semaines; k++) {
      const u = new URL(flux, location.href);
      u.searchParams.set('date', jourPlus(du, 7 * k));
      u.searchParams.set('_', String(Date.now()));
      const l = await (await fetch(u.href, { credentials: 'include' })).json();
      (Array.isArray(l) ? l : ((l && l.events) || [])).forEach(e => {
        if (!e || vus[e.id]) return;
        vus[e.id] = true;
        out.push(e);
      });
      await pause(60);
    }
    return out;
  }

  let ecoutesOccupe = false;
  async function lireLesEcoutes(demande, source) {
    const repondre = m => { try { source.postMessage(m, APP); } catch (e) {} };
    if (!/\/planning\/agence\.php/.test(location.pathname) || !window.__FC_CAL) {
      return repondre({ type: 'drivup-ecoutes-erreur', message: 'Ouvre le planning d’une agence dans Drivup, puis reclique sur le favori.' });
    }
    /* L'accusé tout de suite : l'onglet sait que le favori écoute */
    repondre({ type: 'drivup-ecoutes-progression', fait: 0, total: 0, texte: 'Lecture du planning dans Drivup…' });
    const semaines = Math.max(1, Math.min(8, parseInt(demande.semaines, 10) || 4));
    const du = /^\d{4}-\d{2}-\d{2}$/.test(String(demande.du)) ? String(demande.du)
             : new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const au = jourPlus(du, 7 * semaines - 1);
    dire('👂 Lecture des écoutes…');
    const ressources = ressourcesALEcran();
    const colEcoute = ressources.find(r => estColonneDEcoute(r.titre));
    const prestations = await prestationsDrivup(du, colEcoute ? colEcoute.id : (ressources[0] || {}).id || '');
    const bruts = (await evenementsDrivup(du, semaines))
      .filter(e => { const j = jourDuTexte(e.start); return j >= du && j <= au; });
    const evenements = bruts.map(e => ({
      id: String(e.id), res: String(e.resourceId || ''), type: String(e.typeRdv || ''),
      jour: jourDuTexte(e.start), debut: heureDuTexte(e.start), fin: heureDuTexte(e.end),
      memo: propre(e.memo).slice(0, 300), examen: String(e.examen || '0'), nbr: Number(e.nbrEleve) || 0,
      adresse: propre(e.address).slice(0, 60), titre: propre(e.title).slice(0, 80),
      agendaInterne: String(e.agendaInterne || '')
    }));
    /* L'élève de chaque cours de conduite (le détail que Drivup ouvre
       quand on clique) : pour le reconnaître chez nous. */
    const titres = {};
    ressources.forEach(r => { titres[r.id] = r.titre; });
    const LECON = /conduite|examen blanc|test exam blanc|eval voiture|remise a niveau/;
    const PAS = /moto|remorque|voiturette|simu|baby|theorie|salle|etg|code/;
    const aLire = evenements.filter(e => e.nbr > 0 && e.examen === '0' && !estColonneDEcoute(titres[e.res] || '') &&
      LECON.test(sansAccent(prestations[e.type] || '')) && !PAS.test(sansAccent(prestations[e.type] || '')));
    const details = {};
    let fait = 0;
    const file = aLire.slice();
    async function ouvrier() {
      while (file.length) {
        const e = file.shift();
        try {
          const d = await lireDetail({ id: e.id, extendedProps: { agendaInterne: e.agendaInterne, typeRdv: e.type, examen: '0' } });
          details[e.id] = d.eleves.map(x => ({ id: x.id, nom: x.nom, prenom: x.prenom, formation: x.formation }));
        } catch (err) { details[e.id] = []; }
        fait++;
        if (fait % 4 === 0 || fait === aLire.length) {
          repondre({ type: 'drivup-ecoutes-progression', fait: fait, total: aLire.length,
                     texte: 'Lecture des cours dans Drivup… ' + fait + ' / ' + aLire.length });
        }
        await pause(40);
      }
    }
    await Promise.all([ouvrier(), ouvrier(), ouvrier(), ouvrier(), ouvrier(), ouvrier()]);
    dire('👂 ' + aLire.length + ' cours lus. Choisis dans l’onglet Bilan de conduite.');
    repondre({ type: 'drivup-ecoutes-lues', du: du, au: au, ressources: ressources, prestations: prestations,
               evenements: evenements.map(e => { const c = Object.assign({}, e); delete c.agendaInterne; return c; }),
               details: details });
  }

  async function creerLesEcoutes(demande, source) {
    const repondre = m => { try { source.postMessage(m, APP); } catch (e) {} };
    if (ecoutesOccupe) return;
    repondre({ type: 'drivup-ecoutes-progression', fait: 0, total: (demande.liste || []).length });
    ecoutesOccupe = true;
    try {
      const ressources = ressourcesALEcran();
      const titres = {};
      ressources.forEach(r => { titres[r.id] = r.titre; });
      const liste = (Array.isArray(demande.liste) ? demande.liste : []).slice(0, 300);
      const resultats = [];
      if (!liste.length) return repondre({ type: 'drivup-ecoutes-faites', resultats: [] });
      const prestations = await prestationsDrivup(liste[0].jour, liste[0].res);
      /* L'état du planning juste avant : une colonne prise entre-temps
         ne se double pas. */
      const jours = [...new Set(liste.map(x => String(x.jour)))].sort();
      const avant = await evenementsDrivup(jours[0], Math.min(9, Math.ceil(((new Date(jours[jours.length - 1]) - new Date(jours[0])) / 86400000 + 1) / 7) + 1));
      const prise = (res, jour, a, b) => avant.some(e => String(e.resourceId) === res && jourDuTexte(e.start) === jour &&
        (() => { const x = heureDuTexte(e.start), y = heureDuTexte(e.end); const mn = h => +h.slice(0, 2) * 60 + +h.slice(3, 5);
                 return mn(x) < b && a < mn(y); })());
      let fait = 0;
      for (const it of liste) {
        const r = { cle: String(it.cle || ''), ok: false, message: '' };
        try {
          const res = String(it.res || ''), typMo = String(it.typMo || ''), jour = String(it.jour || ''), debut = String(it.debut || '');
          if (!estColonneDEcoute(titres[res] || '')) throw new Error('colonne refusée');
          if (!/^[ée]coute/i.test(prestations[typMo] || '')) throw new Error('prestation refusée');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(jour) || !/^\d{2}:\d{2}$/.test(debut)) throw new Error('heure refusée');
          const a = +debut.slice(0, 2) * 60 + +debut.slice(3, 5);
          if (prise(res, jour, a, a + (Number(it.min) || 60))) throw new Error('colonne prise entre-temps');
          const form = await formulaireDrivup(jour, debut, res, typMo);
          const val = n => { const e = form.querySelector('[name="' + n + '"]'); return e ? String(e.value) : ''; };
          if (val('typ_mo') !== typMo || val('moniteur') !== res || Number(val('debut')) !== (+debut.slice(0, 2) * 100 + +debut.slice(3, 5)) ||
              val('date_start').slice(0, 16) !== jour + ' ' + debut) throw new Error('le formulaire de Drivup ne correspond pas');
          const action = new URL(form.getAttribute('action') || '', location.origin + '/planning/');
          if (action.origin !== location.origin || !/iframe_ok_rec\.php$/.test(action.pathname)) throw new Error('envoi refusé');
          const envoi = await fetch(action.href, { method: 'POST', body: new FormData(form), credentials: 'include' });
          if (!envoi.ok) throw new Error('Drivup a répondu ' + envoi.status);
          r.ok = true;
          r._verif = { res, typMo, jour, debut };
          avant.push({ resourceId: res, start: jour + 'T' + debut + ':00', end: jour + 'T' + String(Math.floor((a + (Number(it.min) || 60)) / 60)).padStart(2, '0') + ':' + String((a + (Number(it.min) || 60)) % 60).padStart(2, '0') + ':00' });
        } catch (e) { r.message = (e && e.message) || String(e); }
        resultats.push(r);
        fait++;
        dire('👂 Écoutes ouvertes : ' + fait + ' / ' + liste.length);
        repondre({ type: 'drivup-ecoutes-progression', fait: fait, total: liste.length });
        await pause(300);
      }
      /* La vérification : on relit le planning, chaque écoute doit y être */
      const envoyees = resultats.filter(x => x.ok);
      if (envoyees.length) {
        const apres = await evenementsDrivup(jours[0], Math.min(9, Math.ceil(((new Date(jours[jours.length - 1]) - new Date(jours[0])) / 86400000 + 1) / 7) + 1));
        envoyees.forEach(x => {
          const v = x._verif;
          const la = apres.some(e => String(e.resourceId) === v.res && String(e.typeRdv) === v.typMo &&
                                     jourDuTexte(e.start) === v.jour && heureDuTexte(e.start) === v.debut);
          if (!la) { x.ok = false; x.message = 'envoyée, mais absente du planning Drivup'; }
        });
      }
      resultats.forEach(x => { delete x._verif; });
      try { if (window.__FC_CAL && window.__FC_CAL.refetchEvents) window.__FC_CAL.refetchEvents(); } catch (e) {}
      const bons = resultats.filter(x => x.ok).length;
      dire('👂 ' + bons + ' écoute(s) ouverte(s) sur ' + liste.length + '.');
      repondre({ type: 'drivup-ecoutes-faites', resultats: resultats });
    } catch (e) {
      repondre({ type: 'drivup-ecoutes-erreur', message: (e && e.message) || String(e) });
    } finally {
      ecoutesOccupe = false;
    }
  }

  /* ---------- 🗓️ v1234 — les créneaux libres ----------
     Lus à CHAQUE clic du favori sur le planning d'une agence (choix de
     David) : quatre semaines à partir d'aujourd'hui, sans ouvrir le
     détail des cours — le flux du planning suffit. Lecture seule. */
  /* « Séance 3 et 4 », « 1ère et 2ème séance », « séance n°3 » : le
     morceau tel qu'il est écrit, pour que le bureau le lise lui-même. */
  function seanceDuTexte(t) {
    const x = String(t || '').replace(/\s+/g, ' ');
    const m = x.match(/s[ée]ances?\s*(?:n\s*[°o]\s*)?\d+(?:\s*(?:et|&|\+|-|à)\s*\d+)?/i) ||
              x.match(/\b\d+\s*(?:e|è|er|ère|ere|eme|ème)?\s*(?:et|&|\+|-)\s*\d+\s*(?:e|è|eme|ème)\s*s[ée]ances?/i) ||
              x.match(/\b\d+\s*(?:e|è|er|ère|ere|eme|ème)\s*(?:et|&|\+|-)\s*\d+\s*(?:e|è|eme|ème)\b/i) ||
              x.match(/\b\d+\s*(?:e|è|er|ère|ere|eme|ème)\s*s[ée]ances?/i);
    return m ? m[0].trim().slice(0, 40) : '';
  }
  async function lireLesCreneaux() {
    if (!/\/planning\/agence\.php/.test(location.pathname)) return null;
    const du = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const au = jourPlus(du, 27);
    const ressources = ressourcesALEcran();
    if (!ressources.length) return null;
    const colEcoute = ressources.find(r => estColonneDEcoute(r.titre));
    const toutes = await prestationsDrivup(du, colEcoute ? colEcoute.id : ressources[0].id);
    const evenements = (await evenementsDrivup(du, 4))
      .filter(e => { const j = jourDuTexte(e.start); return j >= du && j <= au; })
      .map(e => ({ res: String(e.resourceId || ''), type: String(e.typeRdv || ''), jour: jourDuTexte(e.start),
                   debut: heureDuTexte(e.start), fin: heureDuTexte(e.end), nbr: Number(e.nbrEleve) || 0,
                   examen: String(e.examen || '0'), adresse: propre(e.address).slice(0, 40),
                   titre: propre(e.title).slice(0, 80), places: propre(e.number).slice(0, 10),
                   memo: propre(e.memo).slice(0, 200), id: String(e.id || ''), agenda: String(e.agendaInterne || '') }));
    /* 🕹️ v1235 — LE SIMULATEUR AVEC MONITEUR, UNE SEULE PERSONNE INSCRITE.
       David : « on en met 2 au maximum ; il faut qu'on voie si c'est la
       1re et 2e séance, la 3e, la 3e et 4e » — « c'est écrit dans sa
       séance ». On cherche donc ce mot dans le mémo, le titre, puis le
       détail que Drivup ouvre quand on clique (lecture seule). */
    const SIMU = /simu.*moniteur/;
    const seuls = evenements.filter(e => SIMU.test(sansAccent(toutes[e.type] || '')) && e.nbr === 1 && /^1\/[2-9]$/.test(e.places));
    for (const e of seuls) {
      let texte = e.memo + ' \n ' + e.titre;
      try {
        const r = await fetch('/planning/booking_details.php?id=' + encodeURIComponent(e.agenda) + '&typeRdv=' +
                              encodeURIComponent(e.type) + '&coursId=' + encodeURIComponent(e.id), { credentials: 'include' });
        if (r.ok) {
          const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
          texte += ' \n ' + String((doc.body && doc.body.textContent) || '');
          const el = elevesDuDetail(doc).eleves[0];
          if (el) e.inscrit = propre([el.prenom, el.nom].filter(Boolean).join(' ')).slice(0, 60);
        }
      } catch (err) { /* sans le détail, le mémo et le titre restent */ }
      e.seance = seanceDuTexte(texte);
      await pause(40);
    }
    evenements.forEach(e => { delete e.memo; delete e.id; delete e.agenda; });
    const prestations = {};
    evenements.forEach(e => { if (toutes[e.type]) prestations[e.type] = toutes[e.type]; });
    return { du: du, au: au, ressources: ressources, prestations: prestations, evenements: evenements };
  }

  if (!window.__ecEcoutesBranche) {
    window.__ecEcoutesBranche = true;
    window.addEventListener('message', ev => {
      if (ev.origin !== APP || !ev.data || !ev.source) return;
      if (ev.data.type === 'drivup-ecoutes-lire') {
        lireLesEcoutes(ev.data, ev.source).catch(e => {
          try { ev.source.postMessage({ type: 'drivup-ecoutes-erreur', message: (e && e.message) || String(e) }, APP); } catch (x) {}
        });
      } else if (ev.data.type === 'drivup-ecoutes-creer') {
        creerLesEcoutes(ev.data, ev.source);
      }
    });
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
        /* 🗓️ v1234 — les créneaux libres, en plus */
        try {
          dire('Lecture des créneaux libres…');
          const c = await lireLesCreneaux();
          if (c) p.creneaux = c;
        } catch (e) {
          p.creneauxErreur = 'Les créneaux libres n’ont pas pu être lus : ' + (e && e.message ? e.message : e);
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
