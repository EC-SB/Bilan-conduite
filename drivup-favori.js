/* Déployé le 13/10/2026 à 13:01 — v1166 */
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
   · la fiche d'un élève — ce que la liste n'a pas (mail, naissance).

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
  const deux = n => (n < 10 ? '0' : '') + n;
  const jourDe = d => d.getFullYear() + '-' + deux(d.getMonth() + 1) + '-' + deux(d.getDate());
  const heureDe = d => deux(d.getHours()) + ':' + deux(d.getMinutes());

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
        mobile: propre(tel ? (tel.textContent || tel.getAttribute('href').slice(4)) : '')
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
    const vue = cal.view;
    const du = jourDe(vue.activeStart);
    let au = jourDe(new Date(vue.activeEnd.getTime() - 1));
    const tous = cal.getEvents();
    tous.forEach(e => { if (e.start) { const j = jourDe(e.start); if (j > au) au = j; } });

    let porteeGenre = 'agence', porteeValeur = '';
    if (/moniteur\.php/.test(location.pathname)) {
      porteeGenre = 'moniteur';
      const res = cal.getResources ? cal.getResources() : [];
      porteeValeur = res.length === 1 ? propre(res[0].title) : '';
    } else {
      porteeValeur = propre((document.title.match(/^Agence\s+(.+?)\s+-\s+Drivup/i) || [])[1] || '');
    }
    if (!porteeValeur) throw new Error('je ne reconnais pas ce planning (ni agence ni moniteur seul)');

    const avecEleves = tous.filter(e => {
      const p = e.extendedProps || {};
      return e.start && (Number(p.nbrEleve) > 0 || p.clientName || (p.examen && p.examen !== '0'));
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
          jour: jourDe(e.start),
          debut: heureDe(e.start),
          fin: e.end ? heureDe(e.end) : '',
          agence: propre(p.address),
          moniteurDrivup: res[0] || '',
          titre: propre(e.title).slice(0, 140),
          libelle: d.libelle || propre(e.title).slice(0, 140),
          examen: !!(p.examen && p.examen !== '0'),
          eleves: d.eleves
        });
        fait++;
        dire('Lecture du planning… ' + fait + ' / ' + avecEleves.length + ' cours');
        /* Doucement : quatre à la fois, et une pause, comme une
           personne qui clique vite — pas une rafale. */
        await new Promise(r => setTimeout(r, 120));
      }
    }
    await Promise.all([ouvrier(), ouvrier(), ouvrier(), ouvrier()]);
    cours.sort((a, b) => (a.jour + a.debut).localeCompare(b.jour + b.debut));
    return { genre: 'planning', porteeGenre, porteeValeur, du, au, cours, ignores, detailsRates: rates };
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
  function lireFiche() {
    const v = id => propre((document.getElementById(id) || {}).value);
    const id = (new URLSearchParams(location.search).get('eleve') || '').replace(/\D/g, '');
    return { genre: 'fiche', eleve: {
      id: id, nom: v('nom'), prenom: v('prenom'), email: v('email'), mailPrescripteur: v('mailPrescripteur'),
      neph: v('neph').replace(/\D/g, ''), mobile: v('fakeMobile'), naissance: v('dateNaissance')
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
        envoyer(p);
      } else if (/\/eleves\/profil\.php/.test(location.pathname) && document.getElementById('nom')) {
        const p = lireFiche();
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
