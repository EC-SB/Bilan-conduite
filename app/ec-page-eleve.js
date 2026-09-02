/* Déployé le 02/09/2026 à 07:50 — v786 */
/* ============================================================
   ec-page-eleve.js
   Un endroit par élève, où l'on voit tout.

   L'outil était rangé par OUTIL — répertoire, historique,
   évaluation, handicap, financements, procédures : dix vues rien
   que sous « Élèves ». Mais on ne pense pas « quel écran », on
   pense « Léa ». Ranger un même sujet à dix endroits, c'est la
   faute qu'on répare partout ailleurs dans le code, un étage plus
   haut cette fois.

   ─ LA RÈGLE QUI TIENT TOUT LE MODULE ─

   CETTE PAGE AFFICHE ET DÉLÈGUE. Elle n'écrit rien elle-même :
   chaque geste appelle la fonction qui sait déjà faire —
   ouvrirFicheEleve, majSuivi, envoyerVersListe, choisirGroupePermis,
   fixerDateSimu, noterExamenBlanc. Il n'y a PAS une seule action
   serveur d'écriture écrite ici, et il ne doit jamais y en avoir :
   ce serait un onzième endroit qui écrit les mêmes données.

   Déléguer ne veut pas dire « ouvrir une fenêtre ». Ça veut dire
   appeler la fonction qui sait déjà.

   ─ CE QUE ÇA COÛTE ─

   Le résumé, la fiche et le permis sont DÉJÀ en mémoire : le
   répertoire et l'état du bureau sont chargés pour d'autres écrans.
   Ces trois-là coûtent zéro appel réseau — et ce sont justement
   ceux où se fait le travail. Les autres onglets ne se chargent
   qu'à leur ouverture, jamais avant.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les onglets, dans l'ordre où ils s'affichent. Chacun porte sa
   section : un compte sans le droit ne voit pas l'onglet — il ne le
   voit pas grisé, il ne le voit pas. C'est sectionVisible() qui
   décide, comme sur les cinquante autres écrans.

   ⚠️ DEUX ONGLETS MANQUENT À CETTE LISTE, ET C'EST VOULU.

   📋 QUESTIONNAIRE. Le questionnaire n'est pas un écran qui
   enregistre : c'est un formulaire dont les réponses sont
   consommées par le cours. L'ouvrir ici demanderait de lui écrire
   un SECOND chemin d'enregistrement — et un même travail écrit à
   deux endroits est exactement la faute que cette page répare.
   Il y viendra quand il aura un vrai enregistrement, écrit une
   fois.

   🎓 AAC. RVP 1, RVP 2 et le rendez-vous théorique ne sont stockés
   nulle part : ils sont relus au lasso dans le texte libre du
   dernier bilan. Un onglet qui montrerait ça donnerait une
   apparence de suivi à une devinette.

   Les deux sont écrits dans TODO-general.md. Ne pas les ajouter
   ici avant que la donnée existe. */
const ONGLETS_ELEVE = [
  { cle:'fiche',    emoji:'📇', titre:'Fiche',       section:'eleves' },
  { cle:'cours',    emoji:'📚', titre:'Cours',       section:'recherche' },
  { cle:'permis',   emoji:'🎓', titre:'Permis',      section:'permis' },
  { cle:'proc',     emoji:'📄', titre:'Procédures',  section:'proccorriger' },
  { cle:'financement', emoji:'💶', titre:'Financement', section:'financements' },
  { cle:'handicap', emoji:'♿', titre:'Handicap',    section:'handicap' }
];

const CLE_ONGLET_ELEVE = 'onglet_page_eleve';

let elevePageOuverte = '';
let ongletPageEleve  = '';


/* ============================================================
   Y ARRIVER
   ============================================================ */

/* Le seul chemin d'entrée. Le répertoire et la loupe passent par
   là, et rien d'autre n'a besoin de savoir comment la page se
   dessine. */
function ouvrirPageEleve(nom){
  const propre = String(nom || '').trim();
  if(!propre) return;

  elevePageOuverte = propre;

  if(typeof afficherOnglet === 'function') afficherOnglet('eleves');
  if(typeof afficherVue === 'function') afficherVue('eleves', 'dossier');

  dessinerPageEleve();

  /* La recherche se range : on vient d'ouvrir quelqu'un, la liste
     des résultats n'a plus rien à dire. Fait ICI et pas dans le
     bouton, parce qu'on entre aussi par le répertoire et par la
     loupe — trois portes, un seul rangement. */
  const champ = $('pageEleveChamp');
  if(champ) champ.value = '';
  const trouves = $('pageEleveTrouves');
  if(trouves) trouves.innerHTML = '';
  const dossier = $('pageEleveDossier');
  if(dossier) dossier.style.display = '';

  const carte = document.querySelector('[data-vue="dossier"]');
  if(carte && carte.scrollIntoView){
    carte.scrollIntoView({ behavior:'smooth', block:'start' });
  }
}

/* Les onglets que CE compte peut voir */
function ongletsEleveVisibles(){
  return ONGLETS_ELEVE.filter(o =>
    typeof sectionVisible !== 'function' || sectionVisible(o.section));
}

/* L'onglet à ouvrir : le dernier choisi s'il est encore permis,
   sinon le premier. Un droit retiré ne doit pas laisser la page
   sur un onglet vide. */
function ongletEleveDeDepart(){
  const permis = ongletsEleveVisibles();
  if(!permis.length) return '';

  const voulu = ongletPageEleve ||
    (() => { try{ return localStorage.getItem(CLE_ONGLET_ELEVE) || ''; }
             catch(e){ return ''; } })();

  return permis.some(o => o.cle === voulu) ? voulu : permis[0].cle;
}


/* ============================================================
   LE RÉSUMÉ — LE MÊME QUE DANS L'HISTORIQUE DES LEÇONS

   « La même chose que ce qu'on voit quand on va dans historique
   des leçons. » C'est etapesEleve(), et elle n'est pas réécrite
   ici : elle est appelée.

   Une seule chose s'y ajoute : QUAND LA FICHE DE SUIVI ET LA NOTE
   NE DISENT PAS LA MÊME CHOSE, ON LE DIT. La note est relue au
   lasso dans du texte libre ; la fiche de suivi porte les vraies
   dates. Quand une date existe et que la note continue de dire
   « à prévoir », choisir en silence serait le pire des deux.
   ============================================================ */
function eleveDuBureau(nom){
  return ((typeof etatBureau !== 'undefined' && etatBureau.eleves) || [])
    .find(x => normaliserMot(x.eleve) === normaliserMot(nom)) || null;
}

/* Les contradictions entre la fiche de suivi et la note. Une par
   ligne, dites telles quelles. */
function desaccordsSuivi(s, etat){
  const dits = [];
  if(!s || !etat) return dits;

  if(s.datePermis && etat.permis === 'aprevoir'){
    dits.push('La fiche de suivi porte un examen le ' + s.datePermis +
              ", alors que le dernier bilan dit « date à prévoir ».");
  }
  if(s.ebDate && etat.examBlanc === 'aprevoir'){
    dits.push("La fiche de suivi porte un examen blanc le " + s.ebDate +
              ", alors que le dernier bilan dit « à prévoir ».");
  }
  if(s.simuDate && etat.simuNuit === 'aprevoir'){
    dits.push('La fiche de suivi porte un simulateur le ' + s.simuDate +
              ", alors que le dernier bilan dit « à prévoir ».");
  }
  return dits;
}

function blocResumeEleve(nom){
  const e = eleveDuBureau(nom);
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};

  const d = document.createElement('div');
  d.style.cssText = 'background:var(--navy);border:1px solid var(--line);' +
    'border-radius:10px;padding:12px;margin-bottom:12px;font-size:14px;' +
    'line-height:1.8;';

  const t = document.createElement('div');
  t.style.cssText = 'font-weight:700;margin-bottom:6px;';
  t.textContent = '📍 Où en est ' + nom;
  d.appendChild(t);

  /* La fonction de l'historique des leçons, telle quelle. */
  const etapes = (typeof etapesEleve === 'function' && e)
    ? etapesEleve(e.note, e.enAttente) : [];

  if(!etapes.length){
    const v = document.createElement('div');
    v.style.cssText = 'color:var(--muted);font-size:13px;line-height:1.5;';
    /* « Rien à dire » et « pas encore chargé » ne se ressemblent
       pas : l'un est une réponse, l'autre une absence. */
    v.textContent = e
      ? "Rien à signaler dans son dernier bilan."
      : "Son parcours n'est pas encore chargé sur cet appareil.";
    d.appendChild(v);
  }else{
    etapes.forEach(x => {
      const l = document.createElement('div');
      l.style.color = (x.ok === true) ? 'var(--accent-text)'
                    : (x.ok === false ? 'var(--warn-text)' : 'var(--cream)');
      l.textContent = ((x.ok === true) ? '✅ ' :
                       (x.ok === false ? '⏳ ' : '📌 ')) + x.txt;
      d.appendChild(l);
    });
  }

  desaccordsSuivi(s, e && e.etat).forEach(phrase => {
    const l = document.createElement('div');
    l.style.cssText = 'color:var(--warn-text);font-size:12.5px;line-height:1.5;' +
      'margin-top:7px;padding-top:7px;border-top:1px solid var(--line);';
    l.textContent = '⚠️ ' + phrase;
    d.appendChild(l);
  });

  return d;
}


/* ============================================================
   LA RECHERCHE, EN HAUT DE LA PAGE

   Elle disait : « choisis un élève dans le répertoire, ou cherche-le
   avec la loupe ». Autrement dit : va ailleurs. Un écran qui envoie
   quelque part n'est pas un écran, c'est un panneau — et c'est
   exactement le défaut que ce dossier était censé réparer.

   Le champ est donc ICI, en haut, et il ne se redessine jamais :
   recréer un champ à chaque frappe fait perdre le curseur au bout
   d'une lettre. Seuls les résultats et le dossier en dessous
   changent.

   Elle cherche avec chercherEleves() — la règle du répertoire, pas
   une deuxième.
   ============================================================ */
function poserRechercheEleve(zone){
  if($('pageEleveRecherche')) return;

  const bloc = document.createElement('div');
  bloc.id = 'pageEleveRecherche';
  bloc.style.marginBottom = '14px';

  const champ = document.createElement('input');
  champ.type = 'text';
  champ.id = 'pageEleveChamp';
  champ.autocomplete = 'off';
  champ.placeholder = '🔍 Un nom, un numéro, un mail, une formation';
  champ.style.marginBottom = '8px';
  bloc.appendChild(champ);

  const trouves = document.createElement('div');
  trouves.id = 'pageEleveTrouves';
  bloc.appendChild(trouves);

  champ.addEventListener('input', () => dessinerTrouvesEleve());
  /* Entrée sur un seul résultat : on ne fait pas cliquer pour rien.
     Sur plusieurs, on ne devine pas. */
  champ.addEventListener('keydown', e => {
    if(e.key !== 'Enter') return;
    const b = trouves.querySelectorAll('button');
    if(b.length === 1) b[0].click();
  });

  zone.appendChild(bloc);
}

/* Les noms qui correspondent, sous le champ. */
function dessinerTrouvesEleve(){
  const champ = $('pageEleveChamp');
  const zone = $('pageEleveTrouves');
  const dossier = $('pageEleveDossier');
  if(!champ || !zone) return;

  const q = champ.value.trim();
  zone.innerHTML = '';

  /* Champ vide : on rend la place au dossier ouvert. */
  if(!q){
    if(dossier) dossier.style.display = '';
    return;
  }

  const trouves = (typeof chercherEleves === 'function')
    ? chercherEleves(q, 40) : [];

  if(dossier) dossier.style.display = trouves.length ? 'none' : '';

  if(!trouves.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.style.cssText = 'padding:12px;font-size:13px;line-height:1.5;';
    /* « Rien trouvé » ne veut pas dire « il n'existe pas » : cette
       liste est celle de CET appareil. */
    v.innerHTML = 'Aucun élève ne correspond <strong>dans la mémoire de ' +
      'cet appareil</strong>.<br><span style="font-size:12px;">Il existe ' +
      "peut-être quand même — ouvre une fois le répertoire, ou " +
      "cherche-le dans l'historique des leçons.</span>";
    zone.appendChild(v);
    return;
  }

  trouves.forEach(n => {
    const f = (typeof ficheDe === 'function') ? (ficheDe(n) || {}) : {};
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:100%;text-align:left;margin:0 0 6px;' +
      'padding:10px 12px;font-size:13.5px;line-height:1.45;';
    b.innerHTML = '<strong>' + n.replace(/</g, '&lt;') + '</strong>' +
      (f.formation ? ' <span style="font-size:11px;color:var(--accent-text);">' +
        String(f.formation).replace(/</g, '&lt;') + '</span>' : '') +
      (f.telephone ? '<br><span style="font-size:11.5px;color:var(--muted);">📱 ' +
        String(f.telephone).replace(/</g, '&lt;') + '</span>' : '');
    b.addEventListener('click', () => {
      champ.value = '';
      champ.blur();
      ouvrirPageEleve(n);
    });
    zone.appendChild(b);
  });

  if(trouves.length === 40){
    const a = document.createElement('div');
    a.className = 'empty';
    a.style.cssText = 'padding:10px;font-size:12px;';
    a.textContent = '40 premiers résultats — affine la recherche.';
    zone.appendChild(a);
  }
}


/* ============================================================
   LA PAGE
   ============================================================ */
function dessinerPageEleve(){
  const racine = $('pageEleve');
  if(!racine) return;

  /* Le champ de recherche est posé une fois pour toutes ; seul le
     dossier en dessous se redessine. */
  poserRechercheEleve(racine);

  let zone = $('pageEleveDossier');
  if(!zone){
    zone = document.createElement('div');
    zone.id = 'pageEleveDossier';
    racine.appendChild(zone);
  }

  const nom = elevePageOuverte;
  if(!nom){
    zone.innerHTML = '<div class="empty" style="padding:14px;line-height:1.5;">' +
      "👆 Tape le nom d'un élève pour ouvrir son dossier." +
      '<br><span style="font-size:12px;">Sa fiche, ses cours, son permis, ' +
      'ses procédures — tout au même endroit.</span></div>';
    return;
  }

  zone.innerHTML = '';
  zone.appendChild(enteteEleve(nom));
  zone.appendChild(blocResumeEleve(nom));

  const onglets = ongletsEleveVisibles();
  if(!onglets.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = "Ton compte n'ouvre aucune partie du dossier.";
    zone.appendChild(v);
    return;
  }

  ongletPageEleve = ongletEleveDeDepart();
  zone.appendChild(barreOngletsEleve(onglets));

  const corps = document.createElement('div');
  corps.id = 'pageEleveCorps';
  corps.style.marginTop = '12px';
  zone.appendChild(corps);

  remplirOngletEleve(corps, nom, ongletPageEleve);
}

/* Prénom Nom, et la formation à côté : les deux choses qu'on
   vérifie avant de parler de quelqu'un. */
function enteteEleve(nom){
  const f = (typeof ficheDe === 'function') ? (ficheDe(nom) || {}) : {};

  const d = document.createElement('div');
  d.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;' +
    'margin-bottom:12px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:19px;font-weight:800;flex:1;min-width:0;' +
    'line-height:1.25;';
  t.textContent = (f.genre === 'F' ? '♀ ' : (f.genre === 'M' ? '♂ ' : '')) + nom;
  d.appendChild(t);

  if(f.formation){
    const p = document.createElement('span');
    p.style.cssText = 'flex-shrink:0;font-size:12px;font-weight:700;' +
      'padding:5px 11px;border-radius:999px;background:var(--orange);' +
      'color:var(--navy-deep);';
    p.textContent = f.formation;
    d.appendChild(p);
  }

  if(f.autreAE){
    const p = document.createElement('span');
    p.style.cssText = 'flex-shrink:0;font-size:12px;padding:5px 10px;' +
      'border-radius:999px;border:1px solid var(--line);color:#E8A33D;';
    p.textContent = '🏫 ' + (f.autreAENom || 'autre auto-école');
    d.appendChild(p);
  }

  return d;
}

function barreOngletsEleve(onglets){
  const b = document.createElement('div');
  b.style.cssText = 'display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;';

  onglets.forEach(o => {
    const actif = (o.cle === ongletPageEleve);
    const x = document.createElement('button');
    x.className = 'btn btn-secondary';
    x.dataset.ongletEleve = o.cle;
    x.style.cssText = 'width:auto;flex:0 0 auto;margin:0;padding:8px 12px;' +
      'font-size:13px;border-radius:999px;white-space:nowrap;' +
      (actif ? 'background:var(--orange);color:var(--navy-deep);' +
               'border-color:var(--orange);font-weight:700;' : '');
    x.textContent = o.emoji + ' ' + o.titre;
    x.addEventListener('click', () => choisirOngletEleve(o.cle));
    b.appendChild(x);
  });

  return b;
}

function choisirOngletEleve(cle){
  ongletPageEleve = cle;
  try{ localStorage.setItem(CLE_ONGLET_ELEVE, cle); }catch(e){}
  dessinerPageEleve();
}

function remplirOngletEleve(corps, nom, cle){
  if(cle === 'fiche')       return ongletFiche(corps, nom);
  if(cle === 'cours')       return ongletCours(corps, nom);
  if(cle === 'permis')      return ongletPermis(corps, nom);
  if(cle === 'proc')        return ongletProcedures(corps, nom);
  if(cle === 'financement') return ongletFinancement(corps, nom);
  if(cle === 'handicap')    return ongletHandicap(corps, nom);
}


/* ── Petites briques d'affichage, communes aux onglets ─────── */

function ligneDossier(titre, detail, couleur){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
    'padding:9px 11px;margin-bottom:7px;display:flex;gap:9px;' +
    'align-items:center;';

  const g = document.createElement('div');
  g.style.cssText = 'flex:1;min-width:0;';

  const h = document.createElement('div');
  h.style.cssText = 'font-size:13.5px;font-weight:700;' +
    (couleur ? 'color:' + couleur + ';' : '');
  h.textContent = titre;
  g.appendChild(h);

  if(detail){
    const s = document.createElement('div');
    s.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;' +
      'margin-top:2px;';
    s.textContent = detail;
    g.appendChild(s);
  }

  d.appendChild(g);
  return d;
}

/* Un bouton d'action posé sur une ligne. Il ne fait jamais le
   travail : il appelle celui qui sait. */
function actionDossier(ligne, libelle, faire){
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;flex:0 0 auto;margin:0;padding:7px 11px;' +
    'font-size:12px;white-space:nowrap;';
  b.textContent = libelle;
  b.addEventListener('click', async () => {
    b.disabled = true;
    try{ await faire(); }
    catch(e){ showToast('Impossible : ' + (e.message || e)); }
    b.disabled = false;
  });
  ligne.appendChild(b);
  return b;
}

function sousTitreDossier(texte){
  const d = document.createElement('div');
  d.style.cssText = 'font-size:11px;letter-spacing:.08em;text-transform:uppercase;' +
    'color:var(--muted);margin:14px 0 7px;';
  d.textContent = texte;
  return d;
}

function vidDossier(texte){
  const d = document.createElement('div');
  d.className = 'empty';
  d.textContent = texte;
  return d;
}

/* Le renvoi vers l'écran complet. La page montre ce qui concerne
   cet élève ; le travail de fond se fait là où il s'est toujours
   fait. */
function boutonEcranComplet(corps, libelle, vue){
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'margin-top:10px;padding:10px;font-size:13px;';
  b.textContent = libelle;
  b.addEventListener('click', () => {
    if(typeof afficherVue === 'function') afficherVue('eleves', vue);
  });
  corps.appendChild(b);
}

/* Un onglet qui attend le réseau doit le dire, sinon un écran vide
   ressemble à « il n'y a rien ». */
function attenteDossier(corps, texte){
  corps.innerHTML = (typeof htmlAttente === 'function')
    ? htmlAttente(texte)
    : '<div class="empty">' + texte + '</div>';
}

function echecDossier(corps, e){
  corps.innerHTML = '';
  corps.appendChild(vidDossier('⚠️ ' + (e.message || e)));
}


/* ============================================================
   📇 FICHE — zéro appel réseau
   ============================================================ */
function ongletFiche(corps, nom){
  const f = (typeof ficheDe === 'function') ? (ficheDe(nom) || {}) : null;

  if(!f){
    corps.appendChild(vidDossier(
      "Aucune fiche au répertoire pour cet élève."));
  }else{
    const champs = [
      ['📱 Téléphone', f.telephone
        ? ((typeof telLisible === 'function') ? telLisible(f.telephone) : f.telephone)
        : ''],
      ['✉️ Mail', f.email],
      ['✉️ Prescripteur', f.mailPrescripteur],
      ['💬 Messenger', f.messenger],
      ['📇 Dossier ANTS', f.ants === 'nous' ? 'Fait par nous'
        : (f.ants === 'eleve' ? "Fait par l'élève" : '')],
      ['🧭 Frise', f.frise],
      ['📝 Remarques', f.remarques]
    ].filter(x => String(x[1] || '').trim());

    if(!champs.length){
      corps.appendChild(vidDossier(
        'Sa fiche est vide : ni numéro, ni mail, ni formation.'));
    }else{
      const t = document.createElement('div');
      t.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
        'padding:4px 12px;';
      champs.forEach(([k, v], i) => {
        const l = document.createElement('div');
        l.style.cssText = 'display:flex;gap:12px;justify-content:space-between;' +
          'padding:9px 0;font-size:13.5px;line-height:1.5;' +
          (i ? 'border-top:1px solid var(--line);' : '');
        const a = document.createElement('span');
        a.style.cssText = 'color:var(--muted);flex-shrink:0;';
        a.textContent = k;
        const b = document.createElement('span');
        b.style.cssText = 'text-align:right;min-width:0;word-break:break-word;';
        b.textContent = v;
        l.appendChild(a); l.appendChild(b);
        t.appendChild(l);
      });
      corps.appendChild(t);
    }
  }

  /* La modification passe par la fenêtre du répertoire, telle
     quelle : c'est elle qui sait enregistrer, et elle le sait
     depuis longtemps. */
  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-top:12px;padding:12px;font-size:14px;';
  b.textContent = '✏️ Modifier la fiche';
  b.addEventListener('click', () => {
    if(typeof ouvrirFicheEleve !== 'function'){
      showToast("Le répertoire n'est pas disponible sur cet écran.");
      return;
    }
    ouvrirFicheEleve(nom, (typeof ficheDe === 'function') ? ficheDe(nom) : null);
  });
  corps.appendChild(b);
}


/* ============================================================
   📚 COURS — un appel, filtré par nom côté serveur
   ============================================================ */
function ongletCours(corps, nom){
  /* L'écran de recherche fait déjà ce travail, et mieux que je ne
     le referais : on lui donne le nom et on le laisse travailler. */
  const champ = $('searchName');
  if(!champ || typeof rechercherEleve !== 'function'){
    corps.appendChild(vidDossier(
      "L'historique des leçons n'est pas disponible sur cet écran."));
    return;
  }

  corps.appendChild(vidDossier(
    'Ses leçons s\'ouvrent dans l\'historique, avec le renvoi de ' +
    'bilan par mail et le détail de chaque cours.'));

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-top:4px;padding:12px;font-size:14px;';
  b.textContent = '📚 Voir ses leçons';
  b.addEventListener('click', () => {
    champ.value = nom;
    /* L'écran d'abord, la recherche ensuite : lancer l'appel sans
       amener le moniteur devant le résultat le laisserait devant
       une page qui ne bouge pas. */
    if(typeof afficherVue === 'function') afficherVue('eleves', 'recherche');
    rechercherEleve();
  });
  corps.appendChild(b);
}


/* ============================================================
   🎓 PERMIS — zéro appel réseau, zéro écriture nouvelle

   Tout est déjà en mémoire : la fiche de suivi est chargée pour le
   bureau. Et chaque bouton appelle une fonction qui existait avant
   cette page.
   ============================================================ */
function ongletPermis(corps, nom){
  if(typeof suiviDe !== 'function' || typeof majSuivi !== 'function'){
    corps.appendChild(vidDossier(
      "Le suivi permis n'est pas disponible sur cet écran."));
    return;
  }

  const s = suiviDe(nom);
  const e = eleveDuBureau(nom);
  const a = (e && e.etat) || {};

  if(!e && !s.eleve){
    corps.appendChild(vidDossier(
      "Son suivi n'est pas encore chargé. Ouvre une fois le bureau, " +
      'puis reviens ici.'));
    return;
  }

  const refaire = () => dessinerPageEleve();

  /* ── Avant l'examen ── */
  corps.appendChild(sousTitreDossier("Avant l'examen"));

  /* LE SIMULATEUR. La colonne fait foi ; à défaut, ce que dit la
     note — et on précise lequel des deux on lit, parce qu'une date
     devinée dans une phrase n'est pas une date. */
  /* Trois sources, dans cet ordre, et on dit toujours laquelle on
     lit : la COLONNE (v785, la vraie), puis la date devinée dans la
     note, puis le simple état. Une devinette qui se présente comme
     un fait est pire qu'un blanc. */
  const simuFait = (a.simuNuit === 'fait');
  const lSimu = ligneDossier(
    '🌙 Simulateur nuit et risques',
    s.simuDate ? 'Prévu le ' + s.simuDate
      : (a.simuDate ? 'Prévu le ' + a.simuDate + ' — annoncé dans un bilan, ' +
                      'pas encore enregistré'
        : (simuFait ? "Fait — date non enregistrée, d'après le dernier bilan"
          : (a.simuNuit === 'prevu' ? 'Prévu — date non enregistrée'
            : 'À prévoir'))),
    (s.simuDate || a.simuDate || simuFait) ? 'var(--accent-text)'
      : 'var(--warn-text)');

  actionDossier(lSimu, s.simuDate ? '📅 Changer' : '📅 Fixer la date',
    async () => {
      const iso = await choisirDate('Date du simulateur nuit et risques');
      if(!iso) return;
      await fixerDateSimu(nom, iso);
      showToast('Date enregistrée ✅');
      refaire();
    });
  corps.appendChild(lSimu);

  /* La case « prévenu », celle du bureau, telle quelle. */
  if(typeof casePrevenu === 'function'){
    const c = casePrevenu({ eleve: nom }, 'simuPrevenu',
      '📣 Message envoyé pour réserver le simulateur');
    c.style.marginLeft = '2px';
    corps.appendChild(c);
  }

  /* L'EXAMEN BLANC. */
  const lEb = ligneDossier(
    '📝 Examen blanc',
    s.ebDate ? 'Passé le ' + s.ebDate +
        (s.ebNiveau === 'non' ? " — pas le niveau" : '') +
        (s.ebMoniteur ? ' · ' + s.ebMoniteur : '')
      : (a.examBlanc === 'passe' ? 'Passé — date non enregistrée'
        : (a.examBlanc === 'reserve' ? 'Réservé' +
             (a.examBlancDate ? ' le ' + a.examBlancDate : '')
          : (a.examBlanc === 'impossible' ? 'Non planifiable'
            : 'À prévoir' + (a.examBlancN !== null && a.examBlancN !== undefined
                ? ' dans ' + a.examBlancN + ' leçon(s)' : '')))),
    (s.ebDate || a.examBlanc === 'passe') ? 'var(--accent-text)'
      : (a.examBlanc === 'reserve' ? 'var(--cream)' : 'var(--warn-text)'));

  actionDossier(lEb, '📅 Planifier', async () => {
    const iso = await choisirDate("Date de l'examen blanc");
    if(!iso) return;
    const jour = dateEnToutesLettres(iso) || iso;
    await envoyerConsigne(nom, 'examblanc',
      'Examen blanc prévu le ' + jour + ' (bureau)');
    if(typeof noterExamenBlanc === 'function'){
      await noterExamenBlanc(nom, '', jour);
    }
    showToast('Examen blanc planifié ✅');
    refaire();
  });
  corps.appendChild(lEb);

  if(typeof casePrevenu === 'function'){
    const c = casePrevenu({ eleve: nom }, 'ebPrevenu',
      "📣 Message envoyé pour l'examen blanc");
    c.style.marginLeft = '2px';
    corps.appendChild(c);
  }

  /* ── L'examen ── */
  corps.appendChild(sousTitreDossier("L'examen du permis"));

  const lDate = ligneDossier(
    '📅 Date d\'examen',
    s.datePermis ? s.datePermis + (s.centre ? ' · ' + s.centre : '')
      : (a.permis === 'prevu' && a.permisDate ? a.permisDate + ' (annoncé au moniteur)'
        : (a.permis === 'annule' ? 'Annulé' : 'À prévoir')),
    s.datePermis ? 'var(--accent-text)' : 'var(--warn-text)');

  actionDossier(lDate, s.datePermis ? '📅 Changer' : '📅 Planifier',
    async () => {
      const iso = await choisirDate("Date de l'examen du permis");
      if(!iso) return;
      await majSuivi(nom, { datePermis: dateEnToutesLettres(iso) || iso });
      showToast('Date enregistrée ✅');
      refaire();
    });
  corps.appendChild(lDate);

  /* LA LISTE. envoyerVersListe fait déjà tout : les champs de la
     fiche, la consigne qui va avec, le vidage des caches. */
  const lListe = ligneDossier('🗂️ Liste', libelleListePermis(s),
    'var(--cream)');
  if(typeof envoyerVersListe === 'function'){
    actionDossier(lListe, '🔀 Changer', async () => {
      await envoyerVersListe(nom);
      refaire();
    });
  }
  corps.appendChild(lListe);

  const lGroupe = ligneDossier('👥 Groupe d\'examen',
    s.groupePermis || 'Aucun groupe', 'var(--cream)');
  if(typeof choisirGroupePermis === 'function'){
    actionDossier(lGroupe, '👥 Choisir', async () => {
      const iso = (typeof dateFrVersIso === 'function')
        ? dateFrVersIso(s.datePermis || '') : '';
      await choisirGroupePermis(nom, iso, s.groupePermis || '');
      refaire();
    });
  }
  corps.appendChild(lGroupe);

  /* ── Ce qui est passé ── */
  const passe = [];
  if(s.resultat){
    passe.push(['🏁 Résultat', s.resultat +
      (s.nbAjournements ? ' · ' + s.nbAjournements + ' ajournement(s)' : '') +
      (s.dateAjournement ? ' · dernier le ' + s.dateAjournement : '')]);
  }
  if(s.rdvPostDate || s.rdvPostFait){
    passe.push(['🗣️ Bilan post-permis',
      (s.rdvPostFait === 'oui' ? 'Fait' : 'Prévu') +
      (s.rdvPostDate ? ' le ' + s.rdvPostDate : '') +
      (s.rdvPostMoniteur ? ' · ' + s.rdvPostMoniteur : '')]);
  }
  if(s.heuresRepassage) passe.push(['⏱️ Heures de repassage', s.heuresRepassage]);
  if(s.heuresRestantes) passe.push(['⏱️ Heures restantes', s.heuresRestantes]);

  if(passe.length){
    corps.appendChild(sousTitreDossier('Ce qui est déjà passé'));
    passe.forEach(([t, d]) => corps.appendChild(ligneDossier(t, d)));
  }

  boutonEcranComplet(corps, '🎓 Ouvrir le suivi permis complet', 'permis');
}

/* Dans quelle liste il tombe, d'après sa fiche de suivi. C'est
   LISTES_PERMIS qui décide, pas une deuxième règle écrite ici :
   on cherche la première liste dont tous les champs collent. */
function libelleListePermis(s){
  if(typeof LISTES_PERMIS === 'undefined') return 'Listes non chargées';

  const colle = LISTES_PERMIS.find(l =>
    Object.keys(l.champs).every(k =>
      String(s[k] || '') === String(l.champs[k] || '')));

  if(colle) return colle.nom;
  if(s.datePermis) return '🎓 Date fixée le ' + s.datePermis;
  return 'Dans aucune liste';
}


/* ============================================================
   📄 PROCÉDURES — un appel, filtré par nom côté serveur
   ============================================================ */
async function ongletProcedures(corps, nom){
  attenteDossier(corps, 'Lecture de ses procédures…');

  let demandes = [], recits = [];
  try{
    const [a, b] = await Promise.all([
      appelPrep({ action:'demandesList', eleve: nom }).catch(() => null),
      appelPrep({ action:'recitationsList', eleve: nom }).catch(() => null)
    ]);
    demandes = (a && a.demandes) || [];
    recits = ((b && b.recitations) || [])
      .filter(x => normaliserMot(x.eleve || '') === normaliserMot(nom));
  }catch(e){ return echecDossier(corps, e); }

  /* L'onglet a pu changer pendant l'appel : on n'écrit pas
     par-dessus ce que le moniteur regarde maintenant. */
  if(ongletPageEleve !== 'proc') return;
  corps.innerHTML = '';

  const enCours = demandes.filter(x => x.etat !== 'fait');
  if(enCours.length){
    corps.appendChild(sousTitreDossier('Demandé, pas encore fait'));
    enCours.forEach(x => corps.appendChild(ligneDossier(
      '📥 ' + (x.procedure || x.texte || 'Procédure'),
      [x.creeLe, x.par].filter(Boolean).join(' · '),
      'var(--warn-text)')));
  }

  if(recits.length){
    corps.appendChild(sousTitreDossier('Récitées'));
    recits.slice(0, 30).forEach(x => corps.appendChild(ligneDossier(
      '🗣️ ' + (x.procedure || 'Procédure'),
      [x.quand || x.creeLe, x.note].filter(Boolean).join(' · '))));
  }

  if(!enCours.length && !recits.length){
    corps.appendChild(vidDossier('Aucune procédure demandée ni récitée.'));
  }

  boutonEcranComplet(corps, '📥 Ouvrir les procédures', 'proccorriger');
}


/* ============================================================
   💶 FINANCEMENT — la feuille entière, donc seulement à l'ouverture
   ============================================================ */
async function ongletFinancement(corps, nom){
  attenteDossier(corps, 'Lecture des dossiers…');

  let dossiers = [];
  try{
    const a = await appelPrep({ action:'peList' });
    if(a && a.status === 'error') throw new Error(a.message);
    dossiers = ((a && a.dossiers) || [])
      .filter(x => normaliserMot(x.eleve || '') === normaliserMot(nom));
  }catch(e){ return echecDossier(corps, e); }

  if(ongletPageEleve !== 'financement') return;
  corps.innerHTML = '';

  if(!dossiers.length){
    corps.appendChild(vidDossier('Aucun dossier de financement à son nom.'));
  }else{
    dossiers.forEach(x => corps.appendChild(ligneDossier(
      '💶 ' + (x.type || 'Dossier'),
      [x.statut, x.montant, x.dateDemande || x.creeLe].filter(Boolean).join(' · '))));
  }

  /* Ce que le bureau suit lui-même sur la fiche de suivi. */
  const s = (typeof suiviDe === 'function') ? suiviDe(nom) : {};
  if(s.resteAPayer || s.paiementPrevu || s.relanceLe){
    corps.appendChild(sousTitreDossier('Sur sa fiche de suivi'));
    if(s.resteAPayer) corps.appendChild(ligneDossier('Reste à payer', s.resteAPayer));
    if(s.paiementPrevu) corps.appendChild(ligneDossier('Paiement prévu le', s.paiementPrevu));
    if(s.relanceLe) corps.appendChild(ligneDossier('Relancé le', s.relanceLe));
  }

  boutonEcranComplet(corps, '💶 Ouvrir les financements', 'financements');
}


/* ============================================================
   ♿ HANDICAP
   ============================================================ */
async function ongletHandicap(corps, nom){
  attenteDossier(corps, 'Lecture du suivi handicap…');

  let ligne = null;
  try{
    const d = await appelPrep({ action:'handicapList' });
    if(d && d.status === 'error') throw new Error(d.message || 'Lecture impossible');
    ligne = ((d && d.eleves) || [])
      .find(x => normaliserMot(x.eleve || '') === normaliserMot(nom)) || null;
  }catch(e){ return echecDossier(corps, e); }

  if(ongletPageEleve !== 'handicap') return;
  corps.innerHTML = '';

  /* Le poste de conduite vient du répertoire, pas de cette feuille :
     deux choses différentes, qu'on montre côte à côte. */
  const p = (typeof posteDeConduite === 'function') ? posteDeConduite(nom) : {};
  if(p && (p.amenagee || p.coussin)){
    corps.appendChild(ligneDossier('🪑 Poste de conduite',
      [p.amenagee ? 'Conduite aménagée' : '',
       p.coussin ? 'Coussin vert' : ''].filter(Boolean).join(' · '),
      'var(--accent-text)'));
  }

  if(!ligne){
    corps.appendChild(vidDossier('Aucun suivi handicap à son nom.'));
  }else{
    Object.keys(ligne).forEach(k => {
      if(k === 'eleve') return;
      const v = String(ligne[k] || '').trim();
      if(v) corps.appendChild(ligneDossier(k, v));
    });
  }

  boutonEcranComplet(corps, '♿ Ouvrir le suivi handicap', 'handicap');
}


/* ============================================================
   REDESSINER QUAND UNE ÉCRITURE EST PASSÉE AILLEURS

   Les fonctions du bureau finissent par redessiner le bureau. Quand
   c'est la page élève qui les a appelées, c'est elle qu'il faut
   remettre à jour. Un rafraîchissement, pas une deuxième écriture :
   la règle du module tient.
   ============================================================ */
function rafraichirPageEleve(){
  if(!elevePageOuverte) return;
  const carte = document.querySelector('[data-vue="dossier"]');
  if(!carte || carte.classList.contains('hors-vue')) return;
  dessinerPageEleve();
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-page-eleve.js'] = true;
