/* Déployé le 04/09/2026 à 14:12 — v870 */
/* ============================================================
   ec-avant-cours.js
   Ce qu'on doit savoir avant de monter en voiture — UNE fois.

   Chrystel, le 4 septembre 2026 : « quand on ouvre un cours depuis
   Mes prochains cours, on fait du ménage pour ne pas tout avoir :
   là on confond plein de choses ».

   ⚠️ CE N'ÉTAIT PAS QU'UN PROBLÈME DE PLACE.

   Deux blocs se dessinaient l'un sous l'autre. Celui du haut lisait
   la note du DERNIER BILAN — une photo d'avant le dernier cours ;
   celui du bas la note du COURS PRÉPARÉ, refaite avec ce qu'on sait
   aujourd'hui. Sur la carte de David Edom, le 4 septembre, le
   premier annonçait « EXAMEN BLANC À PRÉVOIR dans 0 leçon » quand
   le second disait « EXAMEN BLANC PASSÉ le 29 août ». Il l'avait
   passé. Deux sources, deux âges, et rien à l'écran pour dire
   laquelle croire.

   Un seul bloc, donc, et une seule source par sujet :

     · les trois états — simulateur, examen blanc, examen officiel —
       viennent de « etatQuiFaitFoi() », celle que le questionnaire
       et la carte des prochains cours emploient déjà ;
     · l'état de la place — 🔄 à remplacer, 👻 prête-nom — vient de
       « marquePlaceExamen() », écrite en v862 ;
     · la frise et le rang viennent du cours préparé s'il existe, du
       dernier bilan sinon ;
     · la fiche véhicule se dessine comme dans le bloc « préparé
       le » : ce qui est fait en haut, ce qui reste en dessous.

   ET ON AFFICHE CE QUI FAIT FOI, SANS COMMENTAIRE. « Attention, le
   dernier bilan dit autre chose » sur chaque cours finirait par ne
   plus se lire. Le dossier de l'élève, lui, continue de signaler
   les désaccords : c'est sa place, pas celle-ci.

   Trois écrans appellent ce bloc : l'ouverture d'un cours, la
   saisie d'un nom d'élève, et le questionnaire de préparation.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ------------------------------------------------------------
   CE QUE LE BLOC RÉAFFICHE LUI-MÊME, ET QU'IL RETIRE DONC DE LA
   NOTE

   Sans ce filtre, on redoublerait à l'intérieur du bloc unique ce
   qu'on vient de retirer entre les deux blocs : la note PORTE déjà
   « EXAMEN BLANC PASSÉ LE… », « PAS DE DATE D'EXAMEN OFFICIEL »,
   « 🎯 5ÈME LEÇON ».

   Les familles sont celles de FAMILLES_NOTE (ec-questionnaire.js).
   On ne les redéclare pas : on nomme les clés qu'on reprend, et
   tout le reste — la frise, les rendez-vous AAC, le texte libre du
   moniteur — passe tel quel.
   ------------------------------------------------------------ */
const FAMILLES_REPRISES_PAR_LE_BLOC = [
  'entete',        /* l'heure, le 🆔, le 💾 : montrés en tête */
  'lecon', 'leconVide', 'friseEtat',   /* la ligne 🎯, en gros */
  'handicap', 'coussin',               /* le poste de conduite */
  'repassage',
  'simuNuit', 'examenBlanc', 'avantEB', 'trois_h', 'examenPermis',
  'ecoutes',       /* « pas d'écoutes pédagogiques », en évidence */
  'aRenseigner'    /* ce que l'outil disait de sa propre ignorance */
];

function segmentEstReprisParLeBloc(seg){
  if(typeof familleDuSegment !== 'function') return false;
  const f = familleDuSegment(seg);
  return !!(f && FAMILLES_REPRISES_PAR_LE_BLOC.indexOf(f.cle) !== -1);
}

/* Ce qui reste d'une note une fois retiré ce que le bloc dit
   ailleurs : la frise, les rendez-vous, et surtout les mots du
   moniteur — « rappeler la maman » n'appartient à aucune famille,
   et doit traverser intact. */
function resteDeLaNoteAvantCours(corps){
  if(typeof segmentsDeNote !== 'function') return String(corps || '');
  return segmentsDeNote(corps)
    .filter(s => !segmentEstReprisParLeBloc(s))
    .join(' · ');
}

/* ------------------------------------------------------------
   LE RÉSULTAT DE L'EXAMEN BLANC

   Chrystel, le 4 septembre : « il manque le résultat de l'examen
   blanc ». « Passé le 29 août » ne dit pas si le moniteur l'a jugé
   prêt — et c'est pourtant ce qui décide de la suite.

   Les trois réponses sont celles du questionnaire, et le chemin
   inverse existe déjà dans l'autre sens (« conclusionExamenBlanc »
   traduit la note vers le suivi). Celle-ci traduit le suivi vers la
   phrase. Une seule phrase pour les deux écrans qui la disent.
   ------------------------------------------------------------ */
function resultatExamenBlanc(nom, a){
  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  const note = a || {};

  const niveau = String(s.ebNiveau || '').toLowerCase();
  const heures = String(s.heuresRestantes || '').trim();

  if(note.ebSuite === 'pasleniveau' || niveau === 'non'){
    /* Chrystel, le 4 septembre : « quand un examen blanc n'a pas le
       niveau, il faut bien écrire PAS LE NIVEAU et ajouter en
       majuscules FAIRE LE POINT À CHAQUE LEÇON ».

       Les majuscules sont la consigne, pas une décoration : c'est
       la seule ligne de tout le bloc qui demande au moniteur de
       changer sa façon de faire le cours, et elle doit se lire
       avant tout le reste. */
    /* Les mots viennent de « CONSIGNE_PAS_LE_NIVEAU »
       (ec-questionnaire.js), celle que la note écrit dans le
       classeur. Les recopier ici, c'est prendre rendez-vous avec le
       jour où l'un des deux changera sans l'autre. */
    const consigne = (typeof CONSIGNE_PAS_LE_NIVEAU !== 'undefined')
      ? CONSIGNE_PAS_LE_NIVEAU : 'FAIRE LE POINT À CHAQUE LEÇON';
    return { cle:'pasleniveau', emoji:'⛔',
             texte:'pas le niveau — ' + consigne,
             couleur:'var(--red)', gras:true };
  }
  if(note.ebSuite === '3h' || (niveau === 'oui' && heures === '0')){
    return { cle:'3h', emoji:'✅', texte:'plus que les 3h avant examen',
             couleur:'var(--accent-text)' };
  }
  if(note.ebSuite === 'lecons' && note.ebLecons){
    return { cle:'lecons', emoji:'⏳',
             texte:'encore ' + note.ebLecons + ' leçon(s) avant examen',
             couleur:'var(--warn-text)' };
  }
  /* Les heures du suivi valent des leçons de deux heures — la même
     conversion que « conclusionExamenBlanc », dans l'autre sens. */
  const h = parseFloat(String(heures).replace(',', '.'));
  if(niveau === 'oui' && !isNaN(h) && h > 0){
    return { cle:'lecons', emoji:'⏳',
             texte:'encore ' + Math.round(h / 2) + ' leçon(s) avant examen',
             couleur:'var(--warn-text)' };
  }
  return null;
}

/* ------------------------------------------------------------
   LES TROIS ÉTATS, DANS L'ORDRE DU PARCOURS

   Simulateur, examen blanc (avec son résultat), examen officiel
   (avec l'état de sa place). Rien ne s'affiche quand on ne sait
   rien : une ligne « rien de noté » sur chaque cours est du bruit,
   et c'est du bruit qu'on vient d'enlever.
   ------------------------------------------------------------ */
function lignesEtatAvantCours(nom, note){
  const etat = (typeof etatQuiFaitFoi === 'function') ? (etatQuiFaitFoi(nom) || {}) : {};
  const clair = (typeof noteEnClair === 'function')
    ? noteEnClair(note || '') : String(note || '');
  const a = (typeof analyserNote === 'function') ? (analyserNote(clair) || {}) : {};
  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  /* ⚠️ EN TOUTES LETTRES, COMME PARTOUT AILLEURS. « 29/08/2026 »
     est une date de machine ; la note du moniteur écrit « le samedi
     29 août 2026 », et c'est ce qu'il cherche des yeux. Les dates
     arrivent tantôt en ISO (la fiche de suivi), tantôt en français
     (la note) : on essaie les deux avant de renoncer. */
  const jour = v => {
    const t = String(v || '').trim();
    if(!t) return '';
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(t)
      ? t : ((typeof dateFrVersIso === 'function') ? dateFrVersIso(t) : '');
    const lettres = (iso && typeof dateEnToutesLettres === 'function')
      ? dateEnToutesLettres(iso) : '';
    return lettres || ((typeof jourFr === 'function') ? jourFr(t) : t);
  };

  const out = [];

  /* ── Le simulateur ── */
  if(etat.simuNuit === 'fait' || a.simuNuit === 'fait'){
    out.push({ emoji:'✅', texte:'Simulateur nuit et risques — fait' +
      (s.simuDate ? ' le ' + jour(s.simuDate) : ''),
      couleur:'var(--accent-text)' });
  }else if(s.simuDate || a.simuDate){
    out.push({ emoji:'📌', texte:'Simulateur nuit et risques prévu le ' +
      jour(s.simuDate || a.simuDate), couleur:'var(--cream)' });
  }else if(a.simuNuit === 'aprevoir'){
    out.push({ emoji:'⏳', texte:'Simulateur nuit et risques à prévoir',
               couleur:'var(--warn-text)' });
  }

  /* ── L'examen blanc, et SON RÉSULTAT ── */
  const ebPasse = (etat.examBlanc === 'passe') || (a.examBlanc === 'passe');
  const ebDate = s.ebDate || etat.examBlancDate || a.ebDate || a.examBlancDate || '';
  if(ebPasse){
    out.push({ emoji:'🅑', texte:'Examen blanc passé' +
      (ebDate ? ' le ' + jour(ebDate) : ''), couleur:'var(--accent-text)' });

    const r = resultatExamenBlanc(nom, a);
    /* ⚠️ UN RÉSULTAT ABSENT SE DIT. Un blanc se lit comme « rien à
       signaler », et c'est le contraire : personne n'a encore dit
       si l'élève est prêt. */
    out.push(r
      ? { emoji:r.emoji, texte:r.texte, couleur:r.couleur, decale:true,
          gras:r.gras }
      : { emoji:'⏳', texte:'résultat à renseigner',
          couleur:'var(--warn-text)', decale:true });
  }else if(etat.examBlanc === 'reserve' || a.examBlanc === 'reserve'){
    out.push({ emoji:'🅑', texte:'Examen blanc réservé' +
      (ebDate ? ' le ' + jour(ebDate) : ''), couleur:'var(--cream)' });
  }else if(a.examBlanc === 'impossible'){
    out.push({ emoji:'🅑', texte:'Examen blanc non planifiable',
               couleur:'var(--warn-text)' });
  }else if(a.examBlanc === 'aprevoir'){
    out.push({ emoji:'🅑', texte:'Examen blanc à prévoir' +
      (a.examBlancN !== null && a.examBlancN !== undefined
        ? ' dans ' + a.examBlancN + ' leçon(s)' : ''),
      couleur:'var(--warn-text)' });
  }

  /* ── L'examen officiel ── */
  const dateExam = etat.examDate || (a.permis === 'prevu' ? a.permisDate : '');
  if(dateExam){
    out.push({ emoji:'🎓', texte:'Examen du permis le ' + jour(dateExam) +
      (s.centre ? ' · ' + s.centre : ''), couleur:'var(--accent-text)' });
  }else if(a.permis === 'annule'){
    out.push({ emoji:'🎓', texte:'Examen du permis annulé',
               couleur:'var(--warn-text)' });
  }else if(a.permis === 'aprevoir' || s.aPlanifier === 'oui'){
    out.push({ emoji:'🎓', texte:"Date d'examen à prévoir",
               couleur:'var(--warn-text)' });
  }else{
    /* ⚠️ ET QUAND IL N'Y A RIEN, ON LE DIT.

       Chrystel, le 4 septembre : « il me manque la partie examen
       officiel ». La note l'écrivait — « PAS DE DATE D'EXAMEN
       OFFICIEL » — et je la retirais du texte sans la remplacer :
       le bloc se taisait donc sur le sujet le plus attendu de la
       fin de parcours.

       C'est la seule des trois lignes qui s'affiche toujours. Le
       simulateur et l'examen blanc peuvent ne concerner personne
       encore ; une date d'examen absente, elle, concerne tout le
       monde — c'est ce qu'on cherche à savoir. */
    out.push({ emoji:'🎓', texte:"Pas de date d'examen officiel",
               couleur:'var(--warn-text)' });
  }

  /* ── Et l'état de sa place ──

     Chrystel, le 4 septembre : « et si un examen officiel, l'état :
     si c'est à remplacer, si c'est un fantôme ». La phrase n'est pas
     réécrite ici : c'est celle de « marquePlaceExamen », la même que
     sur la carte des prochains cours, dans le dossier et dans
     🎓 Suivi permis. Quatrième écran, même mots. */
  const place = (typeof marquePlaceExamen === 'function')
    ? marquePlaceExamen(nom) : null;
  if(place){
    out.push({ emoji:place.emoji, texte:place.court, couleur:place.couleur,
               cadre:true, aide:place.long });
  }

  /* ── Les repassages ── */
  const n = Math.max(Number(a.repassages) || 0, Number(etat.repassages) || 0);
  if(n){
    const quand = s.dateAjournement || a.dateAjournement || '';
    out.push({ emoji:'🔁', texte: n + (n === 1 ? 'er' : 'e') + ' repassage' +
      (quand ? ' — ajourné le ' + jour(quand) : ''), couleur:'var(--warn-text)' });
  }

  return out;
}

/* ------------------------------------------------------------
   LA FICHE VÉHICULE — CE QUI EST FAIT, PUIS CE QUI RESTE

   « Comme quand elle apparaît dans le bloc préparé le : ce qui est
   fait en haut et ce qui reste à travailler en dessous. » Et
   « déplié, mais avec la possibilité de replier » — d'où le
   <details>, ouvert par défaut, dont le choix se retient sur cet
   appareil.

   Les marques viennent des bilans qu'on a déjà en main : pas un
   appel réseau de plus. Le bloc « préparé le » allait les chercher
   par « chargerDossierEleve » parce qu'il n'avait pas la liste ;
   ici on l'a.
   ------------------------------------------------------------ */
const CLE_RESTANTES_OUVERT = 'avantcours_restantes';

function marquesDesBilans(res){
  const marques = {};
  (res || []).slice().reverse().forEach(item => {
    const m = (typeof marquesDejaPosees === 'function')
      ? marquesDejaPosees(item.bilan) : {};
    Object.keys(m).forEach(k => { marques[k] = m[k]; });
  });
  return marques;
}

function ficheVehiculeAvantCours(res, ctx){
  const liste = (typeof BLOC !== 'undefined' && BLOC.ficheListeConduite)
    ? BLOC.ficheListeConduite : [];
  const marques = marquesDesBilans(res);
  const ajoutees = (ctx && ctx.manoeuvresAjoutees) || [];
  /* Ce qui a été fait dans une autre auto-école est de l'acquis,
     pas du programme du jour. */
  const ailleurs = (ctx && ctx.manoeuvresAilleurs) || [];

  const acquises = liste.filter(x =>
    (marques[normaliserMot(x)] || ailleurs.indexOf(x) !== -1) &&
    ajoutees.indexOf(x) === -1);
  const faites = ajoutees.concat(acquises);
  const restantes = liste.filter(x => faites.indexOf(x) === -1);

  const d = document.createElement('div');
  d.style.cssText = 'border-top:1px solid var(--line);margin-top:10px;padding-top:8px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
    'margin-bottom:4px;';
  t.textContent = '🦉 Fiche véhicule — ' + faites.length + ' sur ' + liste.length;
  d.appendChild(t);

  if(!faites.length){
    const v = document.createElement('div');
    v.style.cssText = 'font-size:12px;color:var(--muted);';
    v.textContent = 'Aucune manœuvre validée pour le moment.';
    d.appendChild(v);
  }else{
    const l = document.createElement('div');
    l.style.cssText = 'font-size:13px;line-height:1.7;';
    const ligne = (x, prevue) => {
      const li = document.createElement('div');
      /* Tant que le bilan n'est pas parti, la 🚗 n'existe que dans le
         contexte de préparation : sans ce repli, une manœuvre faite
         ailleurs s'affichait nue et paraissait non acquise. */
      const marque = marques[normaliserMot(x)] ||
        (ailleurs.indexOf(x) !== -1 && typeof MARQUE_AILLEURS !== 'undefined'
          ? MARQUE_AILLEURS : '');
      li.innerHTML = '· ' + echapper(x) +
        (marque ? ' <span style="letter-spacing:1px;">' + echapper(marque) +
                  '</span>' : '') +
        (prevue ? ' <span style="font-size:11px;color:var(--muted);">' +
                  'prévue aujourd\'hui</span>' : '');
      return li;
    };
    ajoutees.forEach(x => l.appendChild(ligne(x, true)));
    acquises.forEach(x => l.appendChild(ligne(x, false)));
    d.appendChild(l);
  }

  /* ── Ce qui reste : déplié, mais repliable ── */
  if(restantes.length){
    const det = document.createElement('details');
    let ouvert = true;
    try{
      const v = localStorage.getItem(CLE_RESTANTES_OUVERT);
      if(v !== null) ouvert = (v === '1');
    }catch(e){}
    det.open = ouvert;
    det.style.marginTop = '8px';

    const som = document.createElement('summary');
    som.style.cssText = 'cursor:pointer;font-size:13px;font-weight:700;' +
      'color:var(--warn-text);';
    som.textContent = '❓ Reste à travailler — ' + restantes.length;
    det.appendChild(som);

    const r = document.createElement('div');
    r.style.cssText = 'font-size:13px;color:var(--muted);line-height:1.7;' +
      'margin-top:3px;';
    restantes.forEach(x => {
      const li = document.createElement('div');
      li.textContent = '· ' + x;
      r.appendChild(li);
    });
    det.appendChild(r);

    /* Le choix se retient : celui qui replie ne veut pas le refaire
       à chaque cours. Par appareil, comme les réglages du bandeau. */
    det.addEventListener('toggle', () => {
      try{ localStorage.setItem(CLE_RESTANTES_OUVERT, det.open ? '1' : '0'); }
      catch(e){}
    });
    d.appendChild(det);
  }

  return d;
}

/* ------------------------------------------------------------
   LE BLOC

   « res »  : ses bilans, du plus récent au plus ancien.
   « prep » : le cours préparé, ou null.
   « opts » : { avecDernierBilan } — le bouton « 👁️ Voir le dernier
              bilan » n'a de sens que sur l'écran de cours.
   ------------------------------------------------------------ */
function blocAvantLeCours(nom, res, prep, opts){
  const o = opts || {};
  const carte = document.createElement('div');
  carte.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:12px 14px;background:rgba(182,255,14,.08);';

  const dernier = (res && res[0]) || null;
  const jourFrIso = iso => (typeof dateEnToutesLettres === 'function')
    ? (dateEnToutesLettres(iso) || iso) : iso;

  /* ── L'en-tête : d'où vient ce qu'on montre ── */
  const tete = document.createElement('div');
  tete.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;';
  const lignes = [];
  if(dernier){
    lignes.push((res.length) + ' cours précédent' + (res.length > 1 ? 's' : '') +
      ' · dernier le ' +
      (jourFrIso(dateFrVersIso(dernier.date)) || dernier.date || '?') +
      (dernier.moniteur ? ' avec ' + dernier.moniteur : ''));
  }else{
    lignes.push('Aucun cours enregistré pour cet élève.');
  }
  if(prep){
    lignes.push('📝 préparé le ' + (jourFrIso(prep.date) || prep.date || '?') +
      (prep.preparePar ? ' par ' + prep.preparePar : '') +
      (prep.modeleLabel ? ' · ' + prep.modeleLabel : ''));
  }else{
    /* Sans préparation, TOUT LE RESTE EST IDENTIQUE — Chrystel, le
       4 septembre. Les états, le résultat de l'examen blanc, l'état
       de la place et les manœuvres ne viennent pas de la
       préparation : ils viennent de sa fiche de suivi et de ses
       bilans. Seule la frise du moniteur manque, et on le dit. */
    lignes.push('📋 Aucun cours préparé — ce qui suit est relu dans la note ' +
                'du dernier bilan et dans sa fiche de suivi.');
  }
  tete.textContent = lignes.join('\n');
  tete.style.whiteSpace = 'pre-line';
  carte.appendChild(tete);

  /* ── La note qui fait foi : celle du cours préparé, sinon celle
        du dernier bilan. On affiche ce qui fait foi, sans
        commentaire. ── */
  const brute = String((prep && prep.note) || (dernier && dernier.note) || '');
  const parts = (typeof morceauxDeNotePreparee === 'function')
    ? morceauxDeNotePreparee(brute)
    : { entete:'', corps: brute, consigne:'' };

  /* La formation prime sur une note écrite avant qu'elle ne change. */
  let corps = parts.corps;
  if(typeof noteSelonLaFormation === 'function'){
    try{
      const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
      corps = noteSelonLaFormation(corps, (f && f.formation) || '',
                                   (prep && prep.modele) || '');
    }catch(e){ /* sans fiche, la note reste telle quelle */ }
  }

  /* ── L'heure et le poste de conduite ── */
  const bouts = [];
  const heure = String(parts.entete || '').trim();
  if(heure) bouts.push(heure);
  if(typeof segmentsDeNote === 'function'){
    segmentsDeNote(corps).forEach(s => {
      const f = (typeof familleDuSegment === 'function') ? familleDuSegment(s) : null;
      if(f && (f.cle === 'handicap' || f.cle === 'coussin')) bouts.push(s);
    });
  }
  if(bouts.length){
    const h = document.createElement('div');
    h.style.cssText = 'font-size:13px;color:var(--cream);margin-top:6px;';
    h.textContent = bouts.join(' · ');
    carte.appendChild(h);
  }

  /* ── « Pas d'écoutes pédagogiques », en évidence ── */
  if(/pas d'écoutes? pédagogiques?/i.test(corps)){
    const a = document.createElement('div');
    a.style.cssText = 'font-size:14px;font-weight:700;color:var(--warn-text);' +
      'margin-top:6px;';
    a.textContent = "🚫 Pas d'écoutes pédagogiques";
    carte.appendChild(a);
  }

  /* ── Le rang, en gros ── */
  const pos = (typeof lignePosition === 'function') ? lignePosition(corps) : '';
  if(pos){
    const p = document.createElement('div');
    p.style.cssText = 'font-size:15px;font-weight:800;line-height:1.3;' +
      'color:var(--accent-text);margin-top:7px;';
    p.textContent = pos;
    carte.appendChild(p);
  }

  /* ── Le reste de la note : la frise, les rendez-vous, et les mots
        du moniteur. Tout ce que le bloc ne redit pas ailleurs. ── */
  const reste = resteDeLaNoteAvantCours(corps);
  if(reste){
    const n = document.createElement('div');
    n.style.cssText = 'font-size:13px;color:var(--accent-text);line-height:1.5;' +
      'margin-top:3px;white-space:pre-wrap;';
    n.textContent = reste;
    carte.appendChild(n);
  }

  /* ── Les états ── */
  const etats = lignesEtatAvantCours(nom, brute);
  if(etats.length){
    const z = document.createElement('div');
    z.style.cssText = 'font-size:13px;line-height:1.6;margin-top:7px;';
    etats.forEach(l => {
      if(l.cadre){
        const c = document.createElement('div');
        c.style.marginTop = '3px';
        const b = document.createElement('span');
        b.style.cssText = 'display:inline-block;padding:2px 9px;border-radius:8px;' +
          'font-weight:800;font-size:12px;color:' + l.couleur + ';' +
          'border:1px solid ' + l.couleur + ';';
        b.textContent = l.emoji + ' ' + l.texte;
        if(l.aide) b.title = l.aide;
        c.appendChild(b);
        z.appendChild(c);
        return;
      }
      const d = document.createElement('div');
      d.style.color = l.couleur || 'var(--cream)';
      if(l.decale) d.style.paddingLeft = '18px';
      /* « FAIRE LE POINT À CHAQUE LEÇON » demande un geste au
         moniteur : elle ne se lit pas comme un état de plus. */
      if(l.gras) d.style.fontWeight = '800';
      d.textContent = l.emoji + ' ' + l.texte;
      z.appendChild(d);
    });
    carte.appendChild(z);
  }

  /* ── La consigne du bureau ── */
  if(parts.consigne){
    const c = document.createElement('div');
    c.style.cssText = 'font-size:13px;color:var(--cream);line-height:1.5;' +
      'margin-top:7px;white-space:pre-wrap;';
    c.textContent = '📌 ' + parts.consigne;
    carte.appendChild(c);
  }

  /* ── Les procédures à réciter ── */
  if(typeof afficherEtatRecitations === 'function'){
    const zr = document.createElement('div');
    carte.appendChild(zr);
    afficherEtatRecitations(nom, zr);
  }

  /* ── La fiche véhicule ── */
  let ctx = prep ? prep.contexte : null;
  if(typeof ctx === 'string' && ctx.trim()){
    try{ ctx = JSON.parse(ctx); }catch(e){ ctx = null; }
  }
  carte.appendChild(ficheVehiculeAvantCours(res, ctx));

  /* ── Le dernier bilan ── */
  if(o.avecDernierBilan && dernier){
    const lien = document.createElement('button');
    lien.type = 'button';
    lien.className = 'btn btn-secondary';
    lien.style.cssText = 'margin-top:10px;font-size:13px;padding:9px 12px;';
    lien.textContent = '👁️ Voir le dernier bilan';
    lien.addEventListener('click', () => {
      currentLessonMeta = {
        modeleLabel: dernier.type, studentName: dernier.eleve,
        monitorName: dernier.moniteur, site: dernier.site,
        dateStr: dernier.date, noteInterne: dernier.note || '', ts: Date.now()
      };
      $('resultText').value = dernier.bilan;
      afficherNote(dernier.note);
      marquerExport(true);
      $('recordView').style.display = 'none';
      $('resultView').style.display = 'block';
      window.scrollTo(0, 0);
    });
    carte.appendChild(lien);
  }

  return carte;
}

/* La préparation d'un élève pour ce jour-là, ou la plus récente.
   Elle ne dessine rien : c'est le bloc qui dessine. */
function preparationDuCours(nom, jour){
  const liste = (typeof prepares !== 'undefined' && Array.isArray(prepares))
    ? prepares : [];
  const siennes = liste.filter(x =>
    normaliserMot(x.eleve || '') === normaliserMot(nom || ''));
  if(!siennes.length) return null;
  return siennes.find(x => x.date === jour) ||
         siennes.slice().sort((a, b) =>
           String(b.date).localeCompare(String(a.date)))[0] || null;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-avant-cours.js'] = true;
