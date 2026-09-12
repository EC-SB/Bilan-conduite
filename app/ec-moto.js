/* Déployé le 12/09/2026 à 13:55 — v976 */
/* ============================================================
   ec-moto.js
   Le parcours du permis moto.

   Quatre étapes, dans l'ordre où l'élève les franchit : la
   préparation, le plateau, son repassage s'il échoue, puis la
   circulation.

   Le dossier ANTS et le code sont propres à la moto : ce ne
   sont ni le même dossier ni le même examen que pour la voiture.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ⚠️ DEUX LISTES, PARCE QUE CE SONT DEUX QUESTIONS — v976.

   « QUI APPARAÎT DANS CET ÉCRAN » n'est pas « CE QU'ON PROPOSE À LA
   CRÉATION ». La première regarde en arrière : des élèves portent
   « Moto A » ou « A1 passerelle » depuis des mois, et ils doivent
   rester visibles tant que leur parcours n'est pas fini. La seconde
   regarde devant : David, le 12 septembre — « A1 et A2, c'est
   tout ». Le A plein ne se passe pas, il s'obtient par la
   passerelle de 7 h ; la passerelle A1 non plus. Ni l'un ni l'autre
   n'a de plateau ni de circulation — donc rien à suivre ici.

   Les mettre dans une seule liste obligerait à choisir : ou bien on
   propose à la création des formations qu'on ne veut plus, ou bien
   on fait disparaître de l'écran des élèves en cours de parcours.

   ⚠️ ET LA SECONDE EST TOUJOURS COMPRISE DANS LA PREMIÈRE. Proposer
   à la création une formation qui ne fait pas entrer dans l'écran,
   ce serait créer un élève qui disparaît à la seconde où on le
   crée. C'est ce que test-nouvel-eleve-2r.js exécute. */
const FORMATIONS_MOTO = ['Moto A', 'A1 permis', 'A1 passerelle', 'A2'];

/* ⚠️ LES CLÉS EXACTES DE LA TABLE DU RÉPERTOIRE — voir
   FORMATIONS_BASE dans ec-fenetres.js. Écrire « A1 » au lieu de
   « A1 permis » ferait une fiche que le répertoire ne saurait plus
   nommer, et que cet écran ne reconnaîtrait plus. */
const FORMATIONS_MOTO_A_CREER = ['A1 permis', 'A2'];


/* Où en est l'élève. L'étape se déduit de ce qui est rempli :
   pas de champ à tenir à jour séparément. */
/* Une date passée : l'examen a eu lieu, le résultat se saisit.

   Le lendemain, pas le jour même : l'élève passe souvent dans
   l'après-midi. */
function datePassee(d){
  if(!d) return false;
  const iso = (typeof dateFrVersIso === 'function') ? dateFrVersIso(d) : '';
  if(!iso) return false;
  return iso < todayLocal();
}


/* ============================================================
   LES COMPTES DE LA MOTO, SANS DESSINER L'ÉCRAN — v954

   David veut ces nombres dans « En un coup d'œil », donc dès
   l'ouverture de l'onglet Permis. Or afficherMoto() ne tourne
   qu'en ouvrant l'écran Moto : les tuiles seraient restées à
   « pas encore dessinée » tant que personne n'y serait allé.

   ⚠️ ON NE DESSINE DONC PAS POUR COMPTER. Cette fonction ne touche
   à aucun élément de la page : elle relit la même liste et la même
   table d'étapes que l'écran — elevesMoto() et etapeMoto() — et se
   contente de trier. Un comptage écrit à part aurait fini par
   annoncer autre chose que les sept cadres.

   Elle rend « null » quand le répertoire n'a pas encore été lu :
   sans lui, un élève tout neuf n'existe nulle part, et un compte
   partiel qui se donne pour complet est pire qu'une absence de
   compte.

   ⚠️ 1ᵉʳ PASSAGE OU REPASSAGE : c'est le compteur de passages qui
   le dit — « motoPassages » pour le plateau, « motoCircuPassages »
   pour la circulation. Zéro ou vide, c'est un premier passage. Et
   on ne le déduit pas de l'échec : un élève repris d'une autre
   école a des passages sans que nous ayons vu l'échec.
   ============================================================ */
function comptesMoto(){
  if(typeof elevesMoto !== 'function') return null;
  if(typeof fichesDuRepertoire === 'function' && !fichesDuRepertoire().length){
    return null;                    /* le répertoire n'est pas encore lu */
  }

  const c = { total: 0,
              plateauAPrevoir: 0, plateauRepassage: 0, plateauPrevus: 0,
              circuAPrevoir: 0, circuRepassage: 0, circuPrevues: 0,
              resultats: 0, resultatsPlateau: 0, resultatsCircu: 0 };

  const passages = v => Number(v) || 0;

  elevesMoto().forEach(e => {
    const s = (typeof suiviDe === 'function') ? (suiviDe(e.eleve) || {}) : {};
    c.total++;
    switch(etapeMoto(s)){
      case 'aplacer':
        c.plateauAPrevoir++;
        if(passages(s.motoPassages)) c.plateauRepassage++;
        break;
      case 'plateau':       c.plateauPrevus++; break;
      case 'plateaupasse':  c.resultats++; c.resultatsPlateau++; break;
      case 'circuaprevoir':
        c.circuAPrevoir++;
        if(passages(s.motoCircuPassages)) c.circuRepassage++;
        break;
      case 'circuprevue':   c.circuPrevues++; break;
      case 'circupassee':   c.resultats++; c.resultatsCircu++; break;
      default: break;       /* préparation : il n'attend pas de date */
    }
  });

  return c;
}


/* Les tuiles de la section Moto — elles lisent comptesMoto, elles
   ne comptent rien. « null » tant que le répertoire n'a pas été lu. */
function tuilesMoto(){
  const c = comptesMoto();
  if(c === null) return null;

  /* « 4 en 1er passage · 1 repassage » — le détail sous le nombre,
     parce que ce n'est pas le même travail de préparer un premier
     passage et de replacer quelqu'un qui vient d'échouer. */
  const detail = (tout, repass) => {
    const premiers = tout - repass;
    const bouts = [];
    if(premiers) bouts.push(premiers + ' en 1er passage');
    if(repass) bouts.push(repass + ' repassage' + (repass > 1 ? 's' : ''));
    return bouts.join(' · ');
  };

  return [
    { cle:'moto:total', lib:'Élèves moto', vue:'moto', section:'moto',
      valeur:() => ({ n: c.total }) },
    { cle:'moto:plateauaprevoir', lib:'Plateau à prévoir', vue:'moto',
      section:'moto', ton:'urgent',
      valeur:() => ({ n: c.plateauAPrevoir,
                      sous: detail(c.plateauAPrevoir, c.plateauRepassage) }) },
    { cle:'moto:plateauprevus', lib:'Plateaux prévus', vue:'moto', section:'moto',
      valeur:() => ({ n: c.plateauPrevus }) },
    { cle:'moto:circuaprevoir', lib:'Circulation à prévoir', vue:'moto',
      section:'moto', ton:'urgent',
      valeur:() => ({ n: c.circuAPrevoir,
                      sous: detail(c.circuAPrevoir, c.circuRepassage) }) },
    { cle:'moto:circuprevues', lib:'Circulations prévues', vue:'moto',
      section:'moto', valeur:() => ({ n: c.circuPrevues }) },
    { cle:'moto:resultats', lib:'Résultats moto à saisir', vue:'moto',
      section:'moto', ton:'att',
      valeur:() => ({ n: c.resultats,
                      sous: [c.resultatsPlateau ? c.resultatsPlateau + ' plateau' : '',
                             c.resultatsCircu ? c.resultatsCircu + ' circulation' : '']
                              .filter(Boolean).join(' · ') }) }
  ];
}


function etapeMoto(s){
  /* La circulation, quand le plateau est acquis */
  if(s.motoPlateau === 'reussi'){
    const d = String(s.motoDateExamen || '').trim();
    if(d) return datePassee(d) ? 'circupassee' : 'circuprevue';
    return 'circuaprevoir';
  }

  /* Le plateau, tant qu'il n'est pas obtenu */
  const dp = String(s.motoDatePlateau || '').trim();
  if(dp) return datePassee(dp) ? 'plateaupasse' : 'plateau';

  /* Prêt mais sans date : il attend d'être placé */
  if(s.motoEtape === 'pret' || s.motoPlateau === 'echoue') return 'aplacer';

  return 'preparation';
}


/* ⚠️ LE RÉPERTOIRE N'EST PLUS CHARGÉ DEUX FOIS — v954.

   Les fiches du répertoire, où vit la formation : le suivi ne la
   porte pas, et sans elles un élève tout neuf n'apparaissait
   nulle part.

   Il y en avait DEUX COPIES dans l'application, remplies par le
   même appel : « fichesEleves » (ec-fenetres.js), d'où viennent
   les numéros de téléphone, et « fichesConnues » ici. Le
   commentaire d'origine racontait même pourquoi : les deux
   fonctions portaient le même nom et s'écrasaient. On a renommé
   la fonction — on n'a pas supprimé le doublon, et deux caches de
   la même liste, c'est deux appels au serveur et deux vérités qui
   peuvent dater différemment.

   Une seule liste, donc, celle de ec-fenetres, et sa porte de
   lecture — ficheDe(). Il reste la garde de cache que la moto
   avait et que l'autre n'a pas : chargerFiches() relit toujours,
   et on ne veut relire que si on n'a rien. */
async function chargerFichesMoto(force){
  if(typeof chargerFiches !== 'function') return [];
  if(typeof fichesEleves !== 'undefined' && fichesEleves.length && !force){
    return fichesEleves;
  }
  try{ await chargerFiches(); }catch(e){ /* on fera avec ce qu'on a */ }
  return (typeof fichesEleves !== 'undefined') ? fichesEleves : [];
}

/* Les fiches telles qu'on les lit ici : une seule source. */
function fichesDuRepertoire(){
  return (typeof fichesEleves !== 'undefined') ? (fichesEleves || []) : [];
}

function formationDe(nom){
  /* La recherche par nom vit déjà dans ficheDe : la refaire ici,
     c'est se donner deux façons de reconnaître le même élève. */
  const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
  return f ? String(f.formation || '') : '';
}


function elevesMoto(){
  if(typeof etatBureau === 'undefined') return [];

  const CHAMPS = ['motoAnts', 'motoCode', 'motoEval', 'motoPlateau',
                  'motoLecons', 'motoDatePlateau', 'motoDateExamen',
                  'motoCircuLecons', 'motoEtape', 'motoRemarque'];

  const dedans = s => {
    /* Retiré par le bureau : il ne revient pas, même si sa fiche
       porte encore une formation moto. */
    if(s && s.motoEtape === 'retire') return false;

    const f = String((s && s.formation) || '').trim();
    if(FORMATIONS_MOTO.some(x => normaliserMot(x) === normaliserMot(f))){
      return true;
    }
    return CHAMPS.some(k => String((s && s[k]) || '').trim());
  };

  const vus = [];
  const out = [];

  const ajouter = (nom, source) => {
    const k = normaliserMot(nom || '');
    if(!k || vus.indexOf(k) !== -1) return;
    vus.push(k);
    out.push(Object.assign({ eleve: nom }, source || {}));
  };

  /* Les fiches du répertoire : c'est là qu'un élève tout neuf
     existe, avant tout bilan et toute consigne. */
  fichesDuRepertoire().forEach(f => {
    const s = Object.assign({}, suiviDe(f.eleve) || {},
                            { formation: f.formation });
    if(dedans(s)) ajouter(f.eleve, f);
  });

  /* Ceux qui ont une saisie moto dans leur suivi */
  (etatBureau.suivi || []).forEach(s => {
    if(dedans(Object.assign({}, s, { formation: formationDe(s.eleve) }))){
      ajouter(s.eleve, { formation: formationDe(s.eleve) });
    }
  });

  /* Puis ceux qui ont déjà des bilans */
  (etatBureau.eleves || []).forEach(e => {
    const s = Object.assign({}, suiviDe(e.eleve) || {},
                            { formation: formationDe(e.eleve) });
    if(dedans(s)) ajouter(e.eleve, e);
  });

  return out;
}


/* ============================================================
   L'AFFICHAGE
   ============================================================ */

async function afficherMoto(){
  const zone = $('motoZone');
  if(!zone) return;

  /* Le bureau ne se charge qu'une fois : ensuite la mémoire est
     déjà à jour après chaque saisie. */
  if(typeof etatBureau === 'undefined' || !etatBureau.suivi ||
     (!etatBureau.suivi.length && !(etatBureau.eleves || []).length)){
    if(typeof afficherBureau === 'function'){
      try{ await afficherBureau(); }catch(e){}
    }
  }

  await chargerFichesMoto();

  /* La date du dernier ajournement se lit dans la feuille des
     résultats : sans ce chargement, les lignes se dessineraient
     sans elle et personne ne saurait pourquoi. Rechargée à chaque
     passage — un résultat vient peut-être d'être saisi. */
  try{ await chargerResultats2R(true); }catch(e){}

  const tous = elevesMoto();
  zone.innerHTML = '';

  /* Les semaines ouvertes, tout en haut — demandé le 4 septembre.
     EN LECTURE SEULE : on règle dans 🎓 Suivi permis, on regarde
     ici. Deux écrans où l'on saisirait les mêmes jours, ce serait
     deux vérités, et une seule de juste. */
  const cadreS = cadreSemainesMoto();
  if(cadreS) zone.appendChild(cadreS);

  zone.appendChild(boutonAjouterMoto());

  /* ============================================================
     LA BARRE DES SEPT ÉTAPES — v971

     David, le 12 septembre : « tout est d'affilé, ce n'est pas
     visible », puis « des boutons en haut pour changer ce que je
     vois ; faire défiler la page avec tous les tiroirs ouverts,
     c'est pas possible ».

     Mesuré avant d'y toucher, avec seize élèves : 3 388 px sur
     ordinateur, 5 280 px sur téléphone — six écrans à faire
     défiler. Avec la barre, on arrive sur une seule liste : 414 px
     et 720 px.

     ⚠️ ET C'EST LA BARRE QUI EXISTE DÉJÀ. Celle de « Pas prêts » et
     « À envisager » dans 🎓 Suivi permis. Le sous-onglet Moto était
     le seul écran de l'onglet Permis resté en liste d'affilée : il
     n'y avait rien à inventer, seulement un « data-famille » à
     poser sur chaque cadre. Elle ne compte rien non plus — chaque
     cadre pose son compteur en se dessinant, elle le relit.

     « data-defaut » porte l'ordre d'URGENCE, et lui seul : c'est la
     première étape non vide de cette liste qui s'affiche en
     arrivant. L'ordre du PARCOURS, lui, reste celui des cadres
     ci-dessous.
     ============================================================ */
  const barre = document.createElement('div');
  barre.className = 'filtres-vue';
  barre.setAttribute('data-onglet', 'permis');
  barre.setAttribute('data-vue', 'moto');
  barre.setAttribute('data-defaut',
    'plateaupasse circupassee aplacer circuaprevoir ' +
    'plateau circuprevue preparation');
  barre.style.margin = '10px 0 8px';
  zone.appendChild(barre);

  const cadres = [
    ['preparation',   '📋 Préparation du plateau',
     "Dossier, code, évaluation. Quand il est prêt, indique dans " +
     'combien de leçons il passera.'],
    ['aplacer',       '📅 Plateau à prévoir',
     'Ils sont prêts et attendent une date de plateau.'],
    ['plateau',       '🏍️ Plateau prévu',
     'La date approche. Le lendemain, il passera en « résultat à ' +
     'saisir ».'],
    ['plateaupasse',  '🏁 Plateau passé — résultat à saisir',
     'La date est dépassée. Obtenu, il part en circulation ; sinon ' +
     'il revient à « plateau à prévoir ».'],
    ['circuaprevoir', '🛣️ Circulation à prévoir',
     'Le plateau est obtenu. Leçons restantes, puis date ' +
     "d'examen."],
    ['circuprevue',   '📆 Circulation prévue',
     "La date est posée. Le lendemain, le résultat se saisira."],
    ['circupassee',   '🏁 Circulation passée — résultat à saisir',
     "Obtenue, tout s'efface ; sinon il revient à « circulation à " +
     'prévoir ».']
  ];

  cadres.forEach(([cle, titre, aide]) => {
    const liste = tous.filter(e => etapeMoto(suiviDe(e.eleve) || {}) === cle);
    zone.appendChild(cadreMoto(cle, titre, aide, liste));
  });

  zone.appendChild(blocStats2R('moto', '📊 Statistiques moto'));

  /* ⚠️ APRÈS LES CADRES, JAMAIS AVANT : la barre lit les compteurs
     qu'ils viennent de poser. Appelée trop tôt, elle les lirait
     vides et n'afficherait aucun bouton. */
  if(typeof majFiltresDeVue === 'function') majFiltresDeVue('moto');
}


/* ------------------------------------------------------------
   🗓️ LES SEMAINES OUVERTES À LA PRISE DE DATE — CADRE MOTO

   David, le 4 septembre : « on voit les semaines ouvertes avec le
   nombre de jours dans un cadre dans la partie permis moto tout en
   haut ».

   Il ne fait que RELIRE le réglage des places de 🎓 Suivi permis.
   Aucune saisie ici, aucune copie : les jours HC et CIR sont écrits
   une fois, à un seul endroit.

   Renvoie null quand il n'y a rien à montrer — un cadre vide qui
   annonce « 0 » ferait croire à un réglage à zéro alors qu'il n'a
   simplement pas encore été chargé.
   ------------------------------------------------------------ */
function cadreSemainesMoto(){
  if(typeof placesConfig === 'undefined' || !placesConfig) return null;
  if(typeof joursMotoDeLaSemaine !== 'function') return null;
  const mois = (placesConfig.mois || []).filter(m => (m.semaines || []).length);
  if(!mois.length) return null;

  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);
  const nb = n => (typeof nbFrPlaces === 'function')
    ? nbFrPlaces(n) : String(n);

  const d = document.createElement('details');
  d.className = 'volet-liste';
  d.open = true;

  let totalHC = 0, totalCIR = 0, lignes = '';

  mois.forEach(m => {
    /* Une semaine terminée ne se prend plus : elle n'a rien à
       faire dans une liste de semaines « ouvertes ». */
    const semaines = (m.semaines || []).filter(w => !w.au || w.au >= auj);
    if(!semaines.length) return;

    let hcM = 0, cirM = 0;
    const corps = semaines.map(w => {
      const j = joursMotoDeLaSemaine(w);
      hcM += j.hc; cirM += j.cir;
      const lib = (typeof libelleSemaine === 'function')
        ? libelleSemaine(w) : ((w.du || '?') + ' → ' + (w.au || '?'));
      /* Une semaine sans jour moto se DIT. Un blanc se lit « je
         n'ai pas regardé » ; « aucun jour ici » se lit « il n'y en
         a pas », et on cesse de la chercher. */
      return '<div style="margin-bottom:3px;">• ' + lib + ' — ' +
        (j.hc || j.cir
          ? '🏍️ <strong>' + nb(j.hc) + '</strong> j HC · <strong>' +
            nb(j.cir) + '</strong> j CIR'
          : '<span style="color:var(--warn-text);">⚠️ aucun jour moto ici</span>') +
        '</div>';
    }).join('');

    totalHC += hcM; totalCIR += cirM;

    const libMois = m.mois
      ? new Date(m.mois + '-15T12:00:00')
          .toLocaleDateString('fr-FR', { month:'long', year:'numeric' })
      : 'Mois non renseigné';
    const pA = [m.aQ1, m.aQ2];
    lignes += '<div style="margin-top:7px;">' +
      '<div style="font-weight:700;text-transform:capitalize;">' +
        libMois + '</div>' + corps +
      ((pA[0] || pA[1])
        ? '<div style="color:var(--muted);">Places A : ' + (pA[0] || '?') +
          ' en 1ʳᵉ quinzaine · ' + (pA[1] || '?') + ' en 2ᵉ</div>'
        : '') +
      '</div>';
  });

  if(!lignes) return null;

  const s = document.createElement('summary');
  s.innerHTML = '🗓️ Semaines ouvertes à la prise de date ' +
    '<span class="compteur">' + nb(totalHC) + ' HC · ' + nb(totalCIR) + ' CIR</span>';
  d.appendChild(s);

  const c = document.createElement('div');
  c.style.cssText = 'font-size:13px;line-height:1.7;';
  c.innerHTML = lignes +
    '<div style="margin-top:8px;padding-top:7px;border-top:1px solid var(--line);' +
      'font-size:12px;color:var(--muted);">Réglé dans 🎓 Suivi permis → ' +
      '⚙️ Régler les places disponibles. Cet écran ne fait que le relire.</div>';
  d.appendChild(c);
  return d;
}


function cadreMoto(cle, titre, aide, liste){
  const d = document.createElement('details');
  d.className = 'volet-liste';
  /* Les deux marques que la barre des filtres lit — voir
     majFiltresDeVue dans ec-onglets.js. Le cadre des semaines
     ouvertes et celui des statistiques ne les portent pas : ils
     restent visibles quel que soit le bouton choisi. */
  d.setAttribute('data-vue', 'moto');
  d.setAttribute('data-famille', cle);
  d.open = (liste.length > 0);

  const s = document.createElement('summary');
  s.innerHTML = titre.replace(/</g, '&lt;') +
    ' <span class="compteur">' + liste.length + '</span>';
  d.appendChild(s);

  const a = document.createElement('div');
  a.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px;' +
    'line-height:1.4;';
  a.textContent = aide;
  d.appendChild(a);

  if(!liste.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Personne pour le moment.';
    d.appendChild(v);
    return d;
  }

  /* ⚠️ LES DEUX CADRES QUI PORTENT UNE DATE SE RANGENT PAR DATE.

     David, le 9 septembre 2026 : « dans plateau prévu et
     circulation prévue, est-ce que tu peux ranger les élèves par
     dates d'examen avec en titre bien visible la date d'examen ».

     Ces deux cadres-là ne sont pas des listes d'élèves : ce sont
     des listes de JOURNÉES. On ne s'y demande pas « où en est
     Machin », on s'y demande « qui passe jeudi ». Rangés par ordre
     d'arrivée dans le classeur, il fallait lire les huit lignes
     pour reconstituer la journée de mardi — et on la reconstituait
     de tête, donc parfois faux.

     Les cinq autres cadres n'ont pas de date : les grouper n'aurait
     rien à grouper. */
  const groupes = groupesParDateMoto(liste, cle);
  if(!groupes){
    liste.forEach(e => d.appendChild(ligneMoto(e, cle)));
    return d;
  }

  groupes.forEach(g => {
    d.appendChild(enteteJournee(g));
    g.elements.forEach(e => d.appendChild(ligneMoto(e, cle)));
  });
  return d;
}


/* ⚠️ QUELLES ÉTAPES SE RANGENT PAR JOURNÉE — ÉCRIT UNE SEULE FOIS.

   Trois endroits s'en servent : le groupement, l'en-tête, et le
   résumé de la ligne qui cesse alors de répéter la date. Trois
   listes séparées finiraient par diverger, et on verrait un cadre
   groupé dont les lignes redisent la date, ou l'inverse : un cadre
   plat où plus personne n'a de date du tout.

   ⚠️ LES CADRES « PASSÉ » EN SONT AUSSI, depuis que David l'a
   demandé : « oui la même chose pour les passées ». Ce sont même
   ceux où le délai compte le plus — il dit depuis combien de jours
   un résultat attend d'être saisi. */
function groupeParDateMoto(cle){
  return cle === 'plateau' || cle === 'circuprevue' ||
         cle === 'plateaupasse' || cle === 'circupassee';
}


/* La date d'examen qui compte à cette étape — et il n'y en a
   qu'une par étape : le plateau a la sienne, la circulation la
   sienne. Les confondre mettrait un élève sous la mauvaise
   journée. */
function dateExamenMoto(s, cle){
  if(cle === 'plateau' || cle === 'plateaupasse'){
    return String((s && s.motoDatePlateau) || '').trim();
  }
  if(cle === 'circuprevue' || cle === 'circupassee'){
    return String((s && s.motoDateExamen) || '').trim();
  }
  return '';
}


/* Les journées d'un cadre, dans l'ordre. Rend null quand ce cadre
   n'a pas de date : on ne groupe pas ce qui n'a rien à grouper.

   Le rangement lui-même vit dans ec-noyau.js — la remorque en fait
   autant, et deux exemplaires finiraient par ne plus se ressembler. */
function groupesParDateMoto(liste, cle){
  if(!groupeParDateMoto(cle)) return null;
  return groupesParJour(liste,
    e => dateExamenMoto(suiviDe(e.eleve) || {}, cle));
}


/* ============================================================
   UNE LIGNE
   ============================================================ */

/* ⚠️ LA LIGNE EST CELLE DE TOUTE L'APPLICATION — v971.

   Elle était un bloc écrit à la main, avec ses bordures et ses
   marges en dur : 148 px sur ordinateur, 255 px sur téléphone, et
   invisible à la feuille de style. C'est « history-item », comme
   les listes de l'AAC, du bureau et des préparés — le nom à gauche,
   les gestes à droite, et la règle du téléphone déjà écrite.

   ⚠️ ET L'ÉTAT N'EST PLUS ÉCRIT DEUX FOIS. La ligne disait « ✅
   ANTS fait · ✅ Code obtenu · ✅ Évaluation faite », et juste en
   dessous trois boutons proposaient de faire ces trois choses-là :
   une phrase qui décrit, une rangée qui agit, pour un seul et même
   fait. Ce qui est écrit se touche, désormais — voir gestesMoto. */
function ligneMoto(e, etape){
  const s = suiviDe(e.eleve) || {};

  const l = document.createElement('div');
  l.className = 'history-item ligneMoto';
  /* Le nom, pour être emmené sur cette ligne-là — voir
     viserLaPersonne. */
  l.dataset.eleve = e.eleve || '';

  const meta = document.createElement('div');
  meta.className = 'meta';

  const n = document.createElement('strong');
  n.textContent = e.eleve;
  meta.appendChild(n);

  const txt = resumeMoto(s, etape, e.eleve);
  if(txt){
    const info = document.createElement('span');
    info.textContent = txt;
    meta.appendChild(info);
  }

  const gestes = gestesMoto(e.eleve, s, etape);
  const pastilles = gestes.filter(g => g.ou === 'pastille');

  /* ⚠️ LA REMARQUE VIDE EST UN GESTE, LA REMARQUE REMPLIE EST UNE
     INFORMATION. Seize champs de saisie dessinés à vide, c'était
     seize barres grises qui ne disaient rien. Vide, elle n'est
     qu'un crayon parmi les gestes ; remplie, elle se lit dans la
     ligne. */
  const remarque = String(s.motoRemarque || '').trim();

  const zoneEtats = document.createElement('span');
  zoneEtats.className = 'etats';
  pastilles.forEach(g => zoneEtats.appendChild(pastilleMoto(g)));
  if(remarque){
    zoneEtats.appendChild(
      boutonRemarqueMoto(e.eleve, s, meta, '✏️ ' + remarque, 'note'));
  }
  if(zoneEtats.childNodes.length) meta.appendChild(zoneEtats);

  l.appendChild(meta);

  const act = document.createElement('div');
  act.className = 'actions';

  if(!remarque){
    act.appendChild(boutonRemarqueMoto(e.eleve, s, meta, '✏️', 'crayon'));
  }

  gestes.filter(g => g.ou === 'principal').forEach(g => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-secondary' + (g.ton ? ' ' + g.ton : '');
    b.textContent = g.libelle;
    b.addEventListener('click', g.action);
    act.appendChild(b);
  });

  const autres = gestes.filter(g => g.ou === 'autre');
  if(autres.length){
    menuGestesMoto(act, autres).forEach(x => act.appendChild(x));
  }

  l.appendChild(act);
  return l;
}


/* Une pastille : l'état ET le bouton, en une seule chose. */
function pastilleMoto(g){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pastEtat' + (g.etat ? ' ' + g.etat : '');
  b.textContent = (g.etat === 'on' ? '✅ ' :
                   g.etat === 'mi' ? '⏳ ' :
                   g.etat === 'off' ? '⬜ ' : '') + g.libelle;
  b.title = g.titre || g.libelle;
  b.addEventListener('click', g.action);
  return b;
}


/* ⚠️ LE CHAMP DE REMARQUE NE CHANGE PAS, IL SE MONTRE PLUS TARD.

   C'est le même champRemarqueMoto qu'avant, avec son unique
   enregistrement : on ne fabrique pas une seconde façon d'écrire la
   même remarque. Seul son moment change — il apparaît quand on
   appuie sur le crayon, et reste jusqu'au prochain dessin. */
function boutonRemarqueMoto(nom, s, meta, libelle, genre){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = (genre === 'note')
    ? 'pastEtat note' : 'btn btn-secondary crayon';
  b.textContent = libelle;
  b.title = 'Remarque sur ' + nom;
  b.addEventListener('click', () => {
    const champ = champRemarqueMoto(nom, s);
    champ.style.margin = '6px 0 0';
    b.remove();
    meta.appendChild(champ);
    champ.focus();
  });
  return b;
}


/* ⚠️ LE TIROIR ⋯ EXISTE DÉJÀ, ET C'EST LE SIEN QU'ON PREND.

   Je l'avais réécrit avec mes propres classes, et il a disparu à
   l'écran : « plus » désignait déjà le tiroir des cartes de cours,
   caché par défaut. Deux conventions pour un même geste, et la
   seconde perd — c'est la faute que ce dossier passe ses semaines à
   réparer. Donc les mêmes noms que partout : « plusBtn » pour le
   bouton, « plus » pour le panneau, « ouvert » posé sur la rangée
   des gestes.

   ⚠️ UN SEUL TIROIR OUVERT À L'ÉCRAN. Deux panneaux dépliés en même
   temps, et on ne sait plus lequel appartient à qui — même règle
   que les palettes de couleur des fiches. */
function menuGestesMoto(act, autres){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-secondary plusBtn';
  b.textContent = '⋯';
  b.title = 'Les autres gestes';

  const z = document.createElement('div');
  z.className = 'plus';
  autres.forEach(g => {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'btn btn-secondary' + (g.ton ? ' ' + g.ton : '');
    c.textContent = g.libelle;
    c.addEventListener('click', g.action);
    z.appendChild(c);
  });

  b.addEventListener('click', () => {
    const deja = act.classList.contains('ouvert');
    document.querySelectorAll('#motoZone .actions.ouvert')
      .forEach(a => a.classList.remove('ouvert'));
    if(!deja) act.classList.add('ouvert');
  });

  return [b, z];
}


/* La remarque libre, sous le nom.

   Elle reste attachée à l'élève quelle que soit son étape : le
   bureau la retrouve du premier cadre au dernier. */
function champRemarqueMoto(nom, s){
  const i = document.createElement('input');
  i.type = 'text';
  i.placeholder = '✏️ Remarque…';
  i.value = String(s.motoRemarque || '');
  i.style.cssText = 'width:100%;margin:0 0 9px;font-size:13px;' +
    'padding:8px 10px;background:var(--navy);' +
    'border:1px solid var(--line);border-radius:9px;color:var(--cream);';

  /* ------------------------------------------------------------
     UN SEUL ENREGISTREMENT, POUR LES DEUX CHEMINS.

     Il y en avait deux, et ils ne se comportaient pas pareil :
     celui de la frappe parlait quand ça ratait, celui du départ
     du champ avalait tout — « .catch(() => {}) ». Or c'est
     justement celui-là qui compte : on quitte le champ, on passe
     à autre chose, et la remarque n'est jamais partie.

     Et aucun des deux ne mettait à jour la valeur connue : après
     un enregistrement réussi, quitter le champ le refaisait.
     ------------------------------------------------------------ */
  async function garder(){
    if(i.value === String(s.motoRemarque || '')) return;   /* rien de neuf */
    const valeur = i.value;
    try{
      await majSuivi(nom, { motoRemarque: valeur });
      s.motoRemarque = valeur;          /* ce qu'on sait, à jour */
      i.style.borderColor = 'var(--orange)';
      setTimeout(() => { i.style.borderColor = 'var(--line)'; }, 900);
    }catch(e){
      i.style.borderColor = 'var(--red)';
      showToast('⚠️ Remarque de ' + nom + ' non enregistrée : ' +
                (e && e.message ? e.message : 'réseau'));
    }
  }

  /* On enregistre quand le moniteur a fini d'écrire, pas à chaque
     lettre : sinon c'est un appel réseau par frappe. */
  let minuteur = null;

  i.addEventListener('input', () => {
    clearTimeout(minuteur);
    minuteur = setTimeout(garder, 900);
  });

  /* Quitter le champ enregistre tout de suite */
  i.addEventListener('blur', () => {
    clearTimeout(minuteur);
    garder();
  });

  return i;
}


function resumeMoto(s, etape, nom){
  const bouts = [];
  const nb = Number(s.motoPassages) || 0;

  /* Le dernier ajournement, s'il y en a eu un */
  const echecPlateau = nb ? phraseEchec2R('moto', nom, 'Plateau') : '';

  if(etape === 'preparation'){
    /* ⚠️ CE QUE LES PASTILLES DISENT N'EST PLUS DIT ICI — v971.

       Cette phrase énumérait l'ANTS, le code, l'évaluation, le
       plateau commencé et les leçons ; les boutons juste en dessous
       proposaient de changer ces mêmes cinq choses. Le même fait à
       deux endroits, et le jour où l'un des deux se trompe, on ne
       sait plus lequel croire. Les pastilles le disent ET le
       changent — voir gestesMoto.

       Reste ici ce qu'aucune pastille ne porte : les passages déjà
       faits, et la date du dernier ajournement. */
    if(nb) bouts.push('🔢 ' + nb + ' plateau(x) déjà passé(s)' + echecPlateau);
  }

  else if(etape === 'aplacer'){
    /* « Plateau échoué le 12/03/2026 · ça fait 5 mois et 27 jours ».
       Sans la date, le bureau ne savait pas si l'ajournement datait
       de la semaine dernière ou du printemps. */
    bouts.push(nb ? '❌ Plateau échoué' + echecPlateau
                  : '✅ Prêt pour le plateau');
    if(nb) bouts.push(nb + ' passage(s)');
    bouts.push('📅 date à poser');
  }

  else if(etape === 'plateau'){
    /* ⚠️ LA DATE N'EST PAS RÉPÉTÉE SOUS SON PROPRE TITRE.

       Depuis que ce cadre est rangé par journée, l'en-tête la dit
       déjà, en gros. La redire sur chaque ligne, c'est du bruit —
       et surtout, c'est un second endroit où elle est écrite : le
       jour où l'un des deux se trompe, on ne sait plus lequel
       croire. Le titre fait foi.

       Elle reste dite quand on ne peut PAS la lire : là, la ligne
       est le seul endroit où la voir. */
    if(!groupeParDateMoto('plateau')){
      bouts.push('📅 Plateau le ' + (s.motoDatePlateau || '?'));
    }
    if(nb) bouts.push((nb + 1) + 'e passage');
  }

  else if(etape === 'plateaupasse'){
    /* Le titre de la journée porte la date — voir « plateau ». */
    bouts.push(groupeParDateMoto('plateaupasse')
      ? '🏁 Plateau passé'
      : '🏁 Plateau passé le ' + (s.motoDatePlateau || '?'));
    bouts.push('résultat à saisir');
  }

  else if(etape === 'circuaprevoir'){
    bouts.push('✅ Plateau obtenu');
    /* Les leçons restantes sont une pastille : elles ne sont plus
       redites ici. Même règle qu'en préparation. */
    const nc = Number(s.motoCircuPassages) || 0;
    /* Même chose pour l'autre épreuve : un ajournement est un
       ajournement, et le bureau a besoin de la même date. */
    if(nc){
      bouts.push('❌ Circulation échouée' +
                 phraseEchec2R('moto', nom, 'Circulation') +
                 ' · ' + nc + ' passage(s)');
    }
    bouts.push("📅 date à poser");
  }

  else if(etape === 'circuprevue'){
    bouts.push('✅ Plateau obtenu');
    /* Même chose : le titre de la journée la porte. */
    if(!groupeParDateMoto('circuprevue')){
      bouts.push('📅 Circulation le ' + (s.motoDateExamen || '?'));
    }
  }

  else{
    bouts.push(groupeParDateMoto('circupassee')
      ? '🏁 Circulation passée'
      : '🏁 Circulation passée le ' + (s.motoDateExamen || '?'));
    bouts.push('résultat à saisir');
  }

  return bouts.join(' · ');
}


/* ============================================================
   LES GESTES, SELON L'ÉTAPE
   ============================================================ */

/* ⚠️ LES GESTES D'UNE ÉTAPE, ET OÙ CHACUN SE POSE — ÉCRIT UNE
   SEULE FOIS — v971.

   Trois places, et la règle qui décide tient en une phrase :

   · « pastille » — ce que la ligne AFFICHAIT déjà. L'état et le
     bouton deviennent la même chose : la pastille dit où l'on en
     est, et un appui dessus ouvre exactement la fenêtre que le
     bouton ouvrait. C'est ce qui fait fondre la ligne, pas un
     rétrécissement de police.
   · « principal » — ce qui fait AVANCER l'élève d'une étape. Un
     seul par ligne, deux quand la décision est binaire (obtenu /
     échoué).
   · « autre » — ce qui RATTRAPE : changer une date, l'annuler,
     retirer quelqu'un, saisir des passages faits ailleurs. Derrière
     le « ⋯ ».

   ⚠️ AUCUN GESTE N'A DISPARU. Les sept listes d'avant sont ici au
   complet — un test compare les deux, étape par étape. Une place
   qui se décide à trois endroits finirait par en oublier un.
   ============================================================ */
function gestesMoto(nom, s, etape){
  const g = [];
  const pastille = (libelle, etat, action, titre) =>
    g.push({ ou:'pastille', libelle, etat, action, titre });
  const principal = (libelle, action, ton) =>
    g.push({ ou:'principal', libelle, action, ton: ton || '' });
  const autre = (libelle, action, ton) =>
    g.push({ ou:'autre', libelle, action, ton: ton || '' });

  if(etape === 'preparation'){
    pastille('ANTS' + (s.motoAnts === 'fait'
              ? (s.motoAntsQui === 'nous' ? ' (nous)'
               : s.motoAntsQui === 'eleve' ? ' (élève)' : '') : ''),
             s.motoAnts === 'fait' ? 'on'
               : s.motoAnts === 'encours' ? 'mi' : 'off',
             () => saisirAntsMoto(nom), '📄 Dossier ANTS');
    pastille('Code',
             s.motoCode === 'obtenu' ? 'on'
               : s.motoCode === 'encours' ? 'mi' : 'off',
             () => saisirCodeMoto(nom), '🎓 Code moto');
    pastille('Éval', s.motoEval === 'oui' ? 'on' : 'off',
             () => basculerMoto(nom, 'motoEval', 'oui'), '📝 Évaluation');
    pastille('Plateau commencé',
             s.motoPlateau === 'commence' ? 'on' : 'off',
             () => basculerMoto(nom, 'motoPlateau', 'commence'));
    /* Le nombre de leçons se lisait dans la phrase du haut : il
       devient la pastille qui le change. */
    if(String(s.motoLecons || '').trim()){
      pastille('🏍️ Prêt dans ' + s.motoLecons + ' leçon(s)', '',
               () => preparerPlateau(nom));
    }
    principal('✅ Prêt pour le plateau', () => preparerPlateau(nom), 'oui');
    autre('🔢 Passages déjà faits', () => saisirPassagesMoto(nom, 'plateau'));
  }

  else if(etape === 'aplacer'){
    principal('📆 Poser la date du plateau',
              () => saisirDatePlateau(nom), 'oui');
    autre('🔢 Passages déjà faits', () => saisirPassagesMoto(nom, 'plateau'));
    autre('↩️ Retour préparation',
          () => majMoto(nom, { motoLecons: '', motoEtape: '' }));
  }

  else if(etape === 'plateau'){
    /* Le résultat reste possible avant l'heure : un examen du
       matin se saisit l'après-midi. */
    principal('🏁 Saisir le résultat', () => resultatPlateau(nom));
    autre('📆 Changer la date', () => saisirDatePlateau(nom));
    autre('🗑️ Annuler la date', () => effacerDatePlateau(nom));
  }

  else if(etape === 'plateaupasse'){
    principal('✅ Plateau obtenu', () => resultatPlateau(nom, true), 'oui');
    principal('❌ Plateau échoué', () => resultatPlateau(nom, false), 'non');
    autre('📆 Changer la date', () => saisirDatePlateau(nom));
  }

  else if(etape === 'circuaprevoir'){
    pastille(String(s.motoCircuLecons || '').trim()
               ? '🛣️ ' + s.motoCircuLecons + ' leçon(s) restantes'
               : '🛣️ Leçons restantes',
             String(s.motoCircuLecons || '').trim() ? '' : 'off',
             () => saisirLeconsCircu(nom));
    principal('📆 Poser la date', () => saisirDateExamenMoto(nom), 'oui');
    autre('🔢 Passages déjà faits',
          () => saisirPassagesMoto(nom, 'circulation'));
  }

  else if(etape === 'circuprevue'){
    principal('🏁 Saisir le résultat', () => resultatCirculation(nom));
    autre('📆 Changer la date', () => saisirDateExamenMoto(nom));
    autre('🗑️ Annuler la date', () => effacerDateCircu(nom));
  }

  else{
    principal('🎓 Permis obtenu', () => resultatCirculation(nom, true), 'oui');
    principal('❌ Circulation échouée',
              () => resultatCirculation(nom, false), 'non');
    autre('📆 Changer la date', () => saisirDateExamenMoto(nom));
  }

  /* Il part ailleurs : son suivi moto n'a plus d'objet. Toujours en
     dernier, et toujours dans le « ⋯ » — une porte de sortie à
     portée de pouce est un dossier perdu un jour ou l'autre. */
  autre('🚪 Retirer', () => retirerEleveMoto(nom));

  return g;
}


/* ============================================================
   LA TRACE DES RÉSULTATS

   Le suivi s'efface quand le permis est obtenu : sans cette
   trace, rien ne pourrait être compté ensuite.
   ============================================================ */

async function noterResultat2R(permis, eleve, epreuve, resultat, passage, date){
  try{
    await appelPrep({ action: 'res2rAdd', permis: permis, eleve: eleve,
                      epreuve: epreuve, resultat: resultat,
                      passage: String(passage || ''),
                      dateExamen: String(date || '') });
  }catch(e){ /* le suivi prime : on ne bloque pas pour la statistique */ }
}


/* ============================================================
   LES STATISTIQUES

   Elles se lisent d'un coup d'œil : combien de passages, combien
   d'obtentions, et du premier coup ou non.
   ============================================================ */

let resultats2R = null;

async function chargerResultats2R(force){
  if(resultats2R && !force) return resultats2R;
  try{
    const d = await appelPrep({ action: 'res2rList' });
    resultats2R = (d && d.resultats) || [];
  }catch(e){ resultats2R = resultats2R || []; }
  return resultats2R;
}


/* ============================================================
   LE DERNIER AJOURNEMENT, ET DEPUIS QUAND

   David : « dans permis moto j'ai besoin de la date du dernier
   ajournement, avec un compteur — plateau échoué le ???, ça fait
   jours mois années ».

   ⚠️ CETTE DATE N'EST NULLE PART DANS LE SUIVI, ET C'EST VOULU :
   au moment de l'échec, « motoDatePlateau » est REMISE À BLANC —
   l'élève retourne dans « plateau à prévoir » et cette case
   attend la date suivante. La seule mémoire de l'échec est la
   feuille des résultats, où il a été noté à la seconde même.

   On la lit donc là, et on n'ajoute pas une deuxième colonne au
   suivi pour dire ce que la feuille sait déjà. En échange, cette
   liste doit être chargée avant de dessiner : c'est fait dans
   afficherMoto.

   La date de l'examen d'abord ; à défaut, le jour où le résultat
   a été noté — c'est le même jour dans presque tous les cas, et
   une date approchée vaut mieux qu'un blanc.
   ============================================================ */
function dernierEchec2R(permis, eleve, epreuve){
  if(!Array.isArray(resultats2R) || !eleve) return null;

  const memeNom = (typeof normaliserMot === 'function')
    ? (a, b) => normaliserMot(a) === normaliserMot(b)
    : (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

  const iso = v => (typeof dateFrVersIso === 'function')
    ? dateFrVersIso(v || '') : '';

  let meilleur = null;
  resultats2R.forEach(r => {
    if(!r || r.resultat !== 'echoue') return;
    if(String(r.permis || '') !== permis) return;
    if(!memeNom(r.eleve || '', eleve)) return;
    if(String(r.epreuve || '') !== epreuve) return;

    const quand = iso(r.dateExamen) || iso(r.horodatage);
    if(!quand) return;
    if(!meilleur || quand > meilleur.iso){
      meilleur = { iso: quand, passage: r.passage || '' };
    }
  });

  return meilleur;
}


/* « le 12/03/2026 · ça fait 5 mois et 27 jours ».

   Le compteur se calcule, il ne se saisit jamais — c'est la même
   règle et la MÊME fonction que le « depuis » de l'AAC. Deux
   façons de compter les mois dans le même outil finiraient par
   ne pas tomber d'accord. */
function phraseEchec2R(permis, eleve, epreuve){
  const e = dernierEchec2R(permis, eleve, epreuve);
  if(!e) return '';

  const jour = (typeof dateCourte === 'function') ? dateCourte(e.iso) : e.iso;
  const d = (typeof dureeDepuis === 'function') ? dureeDepuis(e.iso) : null;

  return ' le ' + jour + (d ? ' · ça fait ' + d.txt : '');
}


function blocStats2R(permis, titre){
  const d = document.createElement('details');
  d.className = 'volet-liste';
  d.style.marginTop = '14px';

  const s = document.createElement('summary');
  s.textContent = titre;
  d.appendChild(s);

  const dedans = document.createElement('div');
  dedans.innerHTML = '<div class="empty">Chargement…</div>';
  d.appendChild(dedans);

  chargerResultats2R().then(() => {
    dedans.innerHTML = '';
    dedans.appendChild(tableauStats2R(permis));
  });

  return d;
}


function tableauStats2R(permis){
  const tous = (resultats2R || []).filter(r =>
    normaliserMot(r.permis || '') === normaliserMot(permis));

  const z = document.createElement('div');

  if(!tous.length){
    z.innerHTML = '<div style="font-size:13px;color:var(--muted);' +
      'line-height:1.6;">Aucun résultat enregistré pour le moment.<br>' +
      "Ils se comptent à partir d'aujourd'hui, au fur et à mesure " +
      'des examens.</div>';
    return z;
  }

  /* Chaque épreuve compte à part : le plateau et la circulation
     n'ont pas les mêmes taux. */
  const epreuves = [];
  tous.forEach(r => {
    if(epreuves.indexOf(r.epreuve) === -1) epreuves.push(r.epreuve);
  });

  epreuves.forEach(e => {
    const dessus = tous.filter(r => r.epreuve === e);
    const reussis = dessus.filter(r => r.resultat === 'obtenu');
    const taux = Math.round(reussis.length / dessus.length * 100);

    /* Du premier coup : c'est ce qui dit la qualité de la
       préparation. */
    const premiers = reussis.filter(r => String(r.passage || '1') === '1');

    const l = document.createElement('div');
    l.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
      'padding:11px 12px;margin-bottom:9px;';

    l.innerHTML =
      '<div style="font-size:14px;font-weight:700;margin-bottom:6px;">' +
        String(e).replace(/</g, '&lt;') + '</div>' +
      '<div style="font-size:13px;line-height:1.7;">' +
        '<span style="color:var(--accent-text);font-weight:700;">' +
          taux + '% de réussite</span>' +
        ' · ' + reussis.length + ' obtenu(s) sur ' + dessus.length +
        ' passage(s)' +
        (reussis.length
          ? '<br><span style="color:var(--muted);">' +
            premiers.length + ' du premier coup</span>' : '') +
      '</div>';

    z.appendChild(l);
  });

  /* Les douze derniers mois, pour voir l'évolution */
  const parMois = {};
  tous.forEach(r => {
    const m = String(r.horodatage || '').match(/(\d{2})\/(\d{4})/);
    if(!m) return;
    const cle = m[2] + '-' + m[1];
    parMois[cle] = parMois[cle] || { total: 0, reussis: 0 };
    parMois[cle].total++;
    if(r.resultat === 'obtenu') parMois[cle].reussis++;
  });

  const mois = Object.keys(parMois).sort().slice(-12);

  if(mois.length > 1){
    const t = document.createElement('div');
    t.style.cssText = 'font-size:12px;color:var(--muted);margin:12px 0 6px;';
    t.textContent = 'Par mois';
    z.appendChild(t);

    mois.forEach(m => {
      const x = parMois[m];
      const [an, mo] = m.split('-');
      const nomMois = ['janvier','février','mars','avril','mai','juin',
                       'juillet','août','septembre','octobre','novembre',
                       'décembre'][Number(mo) - 1] || mo;

      const l = document.createElement('div');
      l.style.cssText = 'display:flex;gap:9px;align-items:center;' +
        'font-size:12px;padding:3px 0;';
      l.innerHTML =
        '<span style="flex:1;">' + nomMois + ' ' + an + '</span>' +
        '<span style="color:var(--accent-text);">' + x.reussis + '</span>' +
        '<span style="color:var(--muted);">/ ' + x.total + '</span>';
      z.appendChild(l);
    });
  }

  return z;
}


/* ============================================================
   LE NOMBRE DE PASSAGES DÉJÀ FAITS

   Un élève repris d'une autre auto-école a déjà passé son
   plateau une ou deux fois : sans cette saisie, le compteur
   repartait de zéro et les statistiques s'en trouvaient
   faussées.
   ============================================================ */

async function saisirPassagesMoto(nom, epreuve){
  const s = suiviDe(nom) || {};
  const cle = (epreuve === 'circulation') ? 'motoCircuPassages' : 'motoPassages';
  const quoi = (epreuve === 'circulation') ? 'circulation' : 'plateau';

  const actuel = String(s[cle] || '0');

  const choix = await choisirDansListeMoto(
    'Combien de ' + quoi + '(s) a-t-il déjà passé(s) ?',
    "Sans compter celui qui vient. Utile pour un élève repris " +
    "d'une autre auto-école.",
    ['0', '1', '2', '3', '4', '5'].map(v => ({
      nom: (v === '0') ? 'Aucun — c\'est son premier'
         : v + ' déjà passé' + (Number(v) > 1 ? 's' : ''),
      valeur: v
    })),
    actuel);

  if(choix === null) return;

  const majs = {};
  majs[cle] = (choix === '0') ? '' : choix;
  await majMoto(nom, majs);
}


/* Une liste déroulante : les boutons empilés tiennent mal sur un
   téléphone. */
function choisirDansListeMoto(titre, aide, options, valeurActuelle){
  /* La remorque en a déjà une : autant s'en servir */
  if(typeof choisirDansListe2R === 'function'){
    return choisirDansListe2R(titre, aide, options, valeurActuelle);
  }

  return Promise.resolve(null);
}


/* ============================================================
   LES SAISIES
   ============================================================ */

async function majMoto(nom, champs){
  try{
    await majSuivi(nom, champs);
    afficherMoto();
  }catch(e){ showToast('Impossible : ' + e.message); }
}


/* Une case qui s'allume et s'éteint */
async function basculerMoto(nom, champ, valeur){
  const s = suiviDe(nom) || {};
  const majs = {};
  majs[champ] = (s[champ] === valeur) ? '' : valeur;
  await majMoto(nom, majs);
}


async function saisirAntsMoto(nom){
  const s = suiviDe(nom) || {};

  const ou = await fenetre('Où en est son dossier ANTS moto ?',
    [{ nom:'Annuler', valeur:'' },
     { nom:'⬜ Pas commencé', valeur:'rien' },
     { nom:'⏳ En cours', valeur:'encours' },
     { nom:'✅ Fait', valeur:'fait', principal:true }], nom);

  if(!ou) return;

  if(ou === 'rien'){
    await majMoto(nom, { motoAnts: '', motoAntsQui: '' });
    return;
  }

  /* Qui s'en occupe : l'école ou l'élève lui-même */
  const qui = await fenetre('Qui fait ce dossier ?',
    [{ nom:'Ne pas préciser', valeur:'x' },
     { nom:"👤 L'élève", valeur:'eleve' },
     { nom:'🏫 Nous', valeur:'nous', principal:true }], nom);

  await majMoto(nom, { motoAnts: ou,
                       motoAntsQui: (qui === 'x') ? '' : (qui || '') });
}


async function saisirCodeMoto(nom){
  const quoi = await fenetre('Où en est son code moto ?',
    [{ nom:'Annuler', valeur:'' },
     { nom:'⬜ Pas commencé', valeur:'rien' },
     { nom:'⏳ En cours', valeur:'encours' },
     { nom:'✅ Obtenu', valeur:'obtenu', principal:true }], nom);

  if(!quoi) return;
  await majMoto(nom, { motoCode: (quoi === 'rien') ? '' : quoi });
}


async function preparerPlateau(nom){
  const n = await demander(
    'Dans combien de leçons pourra-t-il passer le plateau ?\n' +
    "Laisse vide s'il peut y aller maintenant.", '', nom);

  if(n === null) return;

  const propre = String(n).trim();
  if(propre && isNaN(Number(propre))){
    showToast('Indique un nombre de leçons.');
    return;
  }

  /* Sans leçon restante, il attend une date : il rejoint le
     cadre « à prévoir pour le plateau ». */
  if(!propre){
    await majMoto(nom, { motoLecons: '', motoEtape: 'pret' });
    showToast(nom + ' → à prévoir pour le plateau');
    return;
  }

  await majMoto(nom, { motoLecons: propre, motoEtape: '' });
}


async function saisirDatePlateau(nom){
  const iso = await choisirDate('Date du plateau — ' + nom);
  if(!iso) return;
  await majMoto(nom, { motoDatePlateau: dateEnToutesLettres(iso),
                       motoLecons: '' });
}


async function resultatPlateau(nom, reussi){
  const s = suiviDe(nom) || {};

  /* Sans réponse donnée, on la demande */
  if(reussi === undefined){
    const r = await fenetre('Le plateau de ' + nom + ' ?',
      [{ nom:'Annuler', valeur:'' },
       { nom:'❌ Échoué', valeur:'non' },
       { nom:'✅ Obtenu', valeur:'oui', principal:true }],
      'Résultat du plateau');
    if(!r) return;
    reussi = (r === 'oui');
  }

  const n = (Number(s.motoPassages) || 0) + 1;

  if(reussi){
    if(!await confirmer(nom + ' a obtenu son plateau ?\n\n' +
        "Il passe en circulation à prévoir. Il n'a pas encore son " +
        'permis.', 'Plateau obtenu')) return;

    await noterResultat2R('moto', nom, 'Plateau', 'obtenu', n,
                          s.motoDatePlateau);
    await majMoto(nom, { motoPlateau: 'reussi', motoDatePlateau: '',
                         motoPassages: String(n), motoEtape: '' });
    showToast('🏍️ ' + nom + ' → circulation à prévoir');
    return;
  }

  if(!await confirmer(nom + ' a échoué son plateau ?\n\n' +
      'Ce sera son ' + (n + 1) + 'e passage. Il retourne dans ' +
      '« plateau à prévoir ».', 'Plateau échoué')) return;

  await noterResultat2R('moto', nom, 'Plateau', 'echoue', n,
                        s.motoDatePlateau);

  /* Sans plateau, pas de circulation : il repart au début */
  await majMoto(nom, { motoPlateau: 'echoue', motoDatePlateau: '',
                       motoPassages: String(n), motoEtape: 'pret' });
  showToast(nom + ' → plateau à prévoir');
}


/* ============================================================
   LE RÉSULTAT DE LA CIRCULATION
   ============================================================ */

async function resultatCirculation(nom, reussi){
  const s = suiviDe(nom) || {};

  if(reussi === undefined){
    const r = await fenetre('La circulation de ' + nom + ' ?',
      [{ nom:'Annuler', valeur:'' },
       { nom:'❌ Échouée', valeur:'non' },
       { nom:'🎓 Permis obtenu', valeur:'oui', principal:true }],
      'Résultat de la circulation');
    if(!r) return;
    reussi = (r === 'oui');
  }

  if(reussi) return permisMotoObtenu(nom);

  const n = (Number(s.motoCircuPassages) || 0) + 1;

  if(!await confirmer(nom + ' a échoué sa circulation ?\n\n' +
      'Son plateau reste acquis : il retourne dans « circulation à ' +
      'prévoir ».', 'Circulation échouée')) return;

  await noterResultat2R('moto', nom, 'Circulation', 'echoue', n,
                        s.motoDateExamen);
  await majMoto(nom, { motoDateExamen: '',
                       motoCircuPassages: String(n) });
  showToast(nom + ' → circulation à prévoir');
}


/* ============================================================
   ANNULER UNE DATE

   Elle a été posée par erreur, ou la préfecture l'a retirée :
   l'élève revient dans la liste d'attente correspondante.
   ============================================================ */

async function effacerDatePlateau(nom){
  const s = suiviDe(nom) || {};

  if(!await confirmer('Annuler la date de plateau de ' + nom + ' ?\n\n' +
      '(elle était le ' + (s.motoDatePlateau || '?') + ')\n' +
      'Il revient dans « plateau à prévoir ».', 'Annuler la date')) return;

  await majMoto(nom, { motoDatePlateau: '', motoEtape: 'pret' });
  showToast('Date annulée');
}


async function effacerDateCircu(nom){
  const s = suiviDe(nom) || {};

  if(!await confirmer('Annuler la date de circulation de ' + nom + ' ?\n\n' +
      '(elle était le ' + (s.motoDateExamen || '?') + ')\n' +
      'Il revient dans « circulation à prévoir ».',
      'Annuler la date')) return;

  await majMoto(nom, { motoDateExamen: '' });
  showToast('Date annulée');
}


/* ============================================================
   RETIRER UN ÉLÈVE

   Il change d'auto-école : son suivi moto n'a plus d'objet. Ses
   bilans et sa fiche restent.
   ============================================================ */

async function retirerEleveMoto(nom){
  if(!await confirmer('Retirer ' + nom + ' du suivi moto ?\n\n' +
      "Sa fiche et ses bilans ne sont pas touchés : seul son " +
      'parcours moto disparaît.', 'Retirer du suivi')) return;

  await majMoto(nom, {
    motoAnts: '', motoAntsQui: '', motoCode: '', motoEval: '',
    motoPlateau: '', motoLecons: '', motoDatePlateau: '',
    motoPassages: '', motoCircuLecons: '', motoDateExamen: '',
    motoCircuPassages: '', motoRemarque: '', motoEtape: 'retire'
  });

  showToast(nom + ' retiré du suivi moto');
}


async function saisirLeconsCircu(nom){
  const s = suiviDe(nom) || {};

  const n = await demander(
    'Combien de leçons de circulation restent à faire ?',
    s.motoCircuLecons || '', nom);

  if(n === null) return;

  const propre = String(n).trim();
  if(propre && isNaN(Number(propre))){
    showToast('Indique un nombre de leçons.');
    return;
  }

  await majMoto(nom, { motoCircuLecons: propre });
}


async function saisirDateExamenMoto(nom){
  const iso = await choisirDate("Date de l'examen moto — " + nom);
  if(!iso) return;
  await majMoto(nom, { motoDateExamen: dateEnToutesLettres(iso) });
}


/* Le permis est obtenu : son parcours moto n'a plus d'objet */
async function permisMotoObtenu(nom){
  const s = suiviDe(nom) || {};

  if(!await confirmer(nom + ' a obtenu son permis moto ?\n\n' +
      'Tout son suivi moto sera effacé. Ses bilans restent.',
      'Permis obtenu')) return;

  /* La trace part avant l'effacement : sans elle, rien ne
     pourrait être compté ensuite. */
  await noterResultat2R('moto', nom, 'Circulation', 'obtenu',
                        (Number(s.motoCircuPassages) || 0) + 1,
                        s.motoDateExamen);

  await majMoto(nom, {
    motoAnts: '', motoAntsQui: '', motoCode: '', motoEval: '',
    motoPlateau: '', motoLecons: '', motoDatePlateau: '',
    motoPassages: '', motoCircuLecons: '', motoDateExamen: '',
    motoCircuPassages: '', motoRemarque: '', motoEtape: ''
  });

  showToast('🎓 Bravo à ' + nom + ' !');
}


/* ============================================================
   AJOUTER UN ÉLÈVE — UNE SEULE FENÊTRE, DEUX PARCOURS

   David, le 12 septembre : « quand on ajoute un élève moto il faut
   qu'on puisse renseigner son numéro de portable, son adresse mail
   et le type de formation, car il n'y a pas que A2, et aussi
   l'ANTS ».

   ⚠️ UNE FENÊTRE, PAS CINQ QUESTIONS. C'était deux questions
   enchaînées ; à cinq, chaque écran est une occasion d'abandonner —
   et on ajoute un élève au bord du terrain, pas au bureau. Tout est
   là, on remplit ce qu'on a sous la main, on valide une fois.

   ⚠️ ET UNE SEULE FENÊTRE POUR LA MOTO ET LA REMORQUE. Les deux
   écrans avaient leur propre « Ajouter un élève », et celui de la
   remorque ne demandait même pas la formation. Deux fenêtres à
   écrire, c'est deux fenêtres à corriger — et c'est toujours la
   seconde qu'on oublie. Ce qui les distingue tient dans la table
   ci-dessous ; le reste est commun.
   ============================================================ */

/* ⚠️ CHAQUE PARCOURS DIT LES ÉTATS D'ANTS QU'IL CONNAÎT.

   La moto en a trois — pas commencé, en cours, fait. La remorque
   n'en a que deux : « beAnts » ne vaut que '' ou 'fait', et sa
   validation par l'ANTS est une question à part, qui se pose
   des semaines plus tard. Proposer « en cours » pour une remorque,
   ce serait offrir un état que l'écran ne sait pas redessiner. */
const PARCOURS_NOUVEAU_2R = {
  moto: {
    titre: '🏍️ Nouvel élève moto',
    formations: () => FORMATIONS_MOTO_A_CREER,
    etatsAnts: ['encours', 'fait'],
    /* Ce que la fenêtre écrit dans le suivi, au départ */
    depart: { motoEtape: 'preparation' },
    champsAnts: (etat, qui) => ({ motoAnts: etat, motoAntsQui: qui }),
    redessiner: () => { if(typeof afficherMoto === 'function') afficherMoto(); }
  },
  remorque: {
    titre: '🚚 Nouvel élève remorque',
    /* Une seule formation possible : on ne pose pas la question,
       on l'affiche. Un menu à un seul choix est une question dont
       on connaît déjà la réponse. */
    formations: () => [(typeof FORMATION_BE !== 'undefined')
                         ? FORMATION_BE : 'Permis BE'],
    etatsAnts: ['fait'],
    depart: { beAnts: '' },
    champsAnts: (etat, qui) => ({ beAnts: etat, beAntsQui: qui }),
    redessiner: () => { if(typeof afficherRemorque === 'function') afficherRemorque(); }
  }
};

/* Les libellés du menu ANTS, dans l'ordre où on les lit. La valeur
   porte l'état ET qui s'en occupe : c'est une seule question posée
   une seule fois, pas deux écrans l'un après l'autre. */
const CHOIX_ANTS_2R = [
  { valeur: '',             nom: '— non renseigné —' },
  { valeur: 'rien',         nom: '⬜ Pas commencé' },
  { valeur: 'encours:eleve', nom: "⏳ En cours — par l'élève" },
  { valeur: 'encours:nous',  nom: '⏳ En cours — par nous' },
  { valeur: 'fait:eleve',   nom: "✅ Fait — par l'élève" },
  { valeur: 'fait:nous',    nom: '✅ Fait — par nous' }
];


function boutonAjouterMoto(){
  return boutonAjouter2R('moto', '➕ Ajouter un élève moto');
}

function boutonAjouter2R(cle, libelle){
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'padding:11px;font-size:13px;margin-bottom:12px;';
  b.textContent = libelle;
  b.addEventListener('click', () => ouvrirNouvelEleve2R(cle));
  return b;
}

/* Gardés : d'autres écrans peuvent encore les appeler par leur nom */
function ajouterEleveMoto(){ return ouvrirNouvelEleve2R('moto'); }


/* Les états d'ANTS que CE parcours sait redessiner, et eux seuls. */
function choixAntsDuParcours(cle){
  const p = PARCOURS_NOUVEAU_2R[cle];
  if(!p) return [];
  return CHOIX_ANTS_2R.filter(c =>
    !c.valeur || c.valeur === 'rien' ||
    p.etatsAnts.indexOf(String(c.valeur).split(':')[0]) >= 0);
}


/* ⚠️ CE QUI PART AU CLASSEUR SE DÉCIDE ICI, PAS DANS LA FENÊTRE.

   La fenêtre ramasse ce qui est tapé ; cette fonction seule dit ce
   que ça devient — la ligne du répertoire d'un côté, le suivi du
   parcours de l'autre. Une règle qui ne vit que dans un
   gestionnaire de clic ne se vérifie qu'à la main, et une règle
   qu'on ne vérifie qu'à la main ne se vérifie pas.

   ⚠️ ET L'ANTS PART DES DEUX CÔTÉS D'UN SEUL COUP. Le répertoire
   retient QUI s'en occupe, le suivi retient OÙ ÇA EN EST : deux
   moitiés d'une même réponse. Les laisser se saisir chacune de son
   côté, c'est se garantir qu'un jour elles se contrediront. */
function ecrituresNouvelEleve2R(cle, saisie){
  const p = PARCOURS_NOUVEAU_2R[cle];
  if(!p) return null;

  const s = saisie || {};
  const nom = String(s.nom || '').trim();
  if(!nom) return null;

  const bouts = String(s.ants || '').split(':');
  const etat = bouts[0] || '';
  const qui  = bouts[1] || '';

  return {
    fiche: {
      action: 'ficheSet',
      eleve: nom,
      telephone: String(s.telephone || '').trim(),
      email: String(s.email || '').trim(),
      formation: String(s.formation || '').trim() || p.formations()[0],
      ants: qui
    },
    /* « Pas commencé » est une réponse, pas un silence : elle vide
       l'état sans toucher au reste du départ. */
    suivi: Object.assign({}, p.depart,
      etat ? p.champsAnts(etat === 'rien' ? '' : etat, qui) : {})
  };
}


function ouvrirNouvelEleve2R(cle){
  const p = PARCOURS_NOUVEAU_2R[cle];
  if(!p) return;

  const formations = p.formations();
  const choixAnts = choixAntsDuParcours(cle);

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(470px, 94vw);max-height:90vh;overflow-y:auto;';

  const opt = (v, n) => '<option value="' + String(v).replace(/"/g, '&quot;') +
                        '">' + String(n).replace(/</g, '&lt;') + '</option>';

  boite.innerHTML = '<h3>' + p.titre + '</h3>' +

    '<label for="n2Nom">Nom de l’élève</label>' +
    '<input type="text" id="n2Nom" autocomplete="off" placeholder="Prénom Nom">' +
    '<div id="n2Deja" style="font-size:11px;color:var(--muted);' +
      'margin:-8px 0 12px;line-height:1.4;">Sa fiche sera créée dans le ' +
      'répertoire si elle n’existe pas.</div>' +

    '<label for="n2Tel">📱 Téléphone portable</label>' +
    '<input type="tel" id="n2Tel" inputmode="tel" autocomplete="off" ' +
      'placeholder="06 12 34 56 78">' +

    '<label for="n2Mail">✉️ Adresse mail</label>' +
    '<input type="email" id="n2Mail" inputmode="email" autocomplete="off" ' +
      'placeholder="prenom.nom@exemple.fr">' +

    /* Une seule formation possible : on l'affiche au lieu de la
       demander. */
    (formations.length > 1
      ? '<label for="n2Form">🎓 Formation</label>' +
        '<select id="n2Form">' + formations.map(f => opt(f, f)).join('') + '</select>'
      : '<label>🎓 Formation</label>' +
        '<div style="font-size:15px;font-weight:700;color:var(--cream);' +
          'margin:0 0 18px;">' + String(formations[0]).replace(/</g, '&lt;') +
        '</div>') +

    '<label for="n2Ants">📇 Dossier ANTS</label>' +
    '<select id="n2Ants">' + choixAnts.map(c => opt(c.valeur, c.nom)).join('') +
    '</select>' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 4px;' +
      'line-height:1.4;">Se retrouve sur sa ligne et dans sa fiche du ' +
      'répertoire — c’est la même information, dite une fois.</div>';

  const chN = boite.querySelector('#n2Nom');
  const chT = boite.querySelector('#n2Tel');
  const chM = boite.querySelector('#n2Mail');
  const selF = boite.querySelector('#n2Form');
  const selA = boite.querySelector('#n2Ants');
  const zDeja = boite.querySelector('#n2Deja');

  /* ⚠️ RECONNAÎTRE AVANT D'ÉCRIRE. Une fiche à ce nom existe peut-
     être déjà : on le dit tout de suite, plutôt que de laisser
     croire qu'on en crée une seconde. Rien n'est effacé — un champ
     laissé vide ne recouvre jamais ce qui est au classeur. */
  const ficheExistante = n => {
    const k = normaliserMot(String(n || '').trim());
    if(!k || typeof fichesEleves === 'undefined') return null;
    return (fichesEleves || []).find(f =>
      normaliserMot(f.eleve || '') === k) || null;
  };

  const direSiDeja = () => {
    const f = ficheExistante(chN.value);
    if(!f){
      zDeja.style.color = 'var(--muted)';
      zDeja.textContent = 'Sa fiche sera créée dans le répertoire si elle ' +
        'n’existe pas.';
      return;
    }
    zDeja.style.color = 'var(--warn-text)';
    zDeja.textContent = 'Déjà au répertoire' +
      (f.formation ? ' (' + f.formation + ')' : '') +
      ' — ses informations seront complétées, rien ne sera effacé.';
    /* Ce qu'on sait déjà de lui remplit les champs : les retaper à
       l'identique n'apprend rien à personne. */
    if(!chT.value && f.telephone) chT.value = f.telephone;
    if(!chM.value && f.email) chM.value = f.email;
  };
  chN.addEventListener('input', direSiDeja);

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => fermerFond(fond));
  r.appendChild(bA);

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = '➕ Créer';
  bO.addEventListener('click', async () => {
    const propre = chN.value.trim();
    if(!propre){ showToast('Donne-lui un nom.'); chN.focus(); return; }

    const mail = chM.value.trim();
    if(mail && mail.indexOf('@') === -1){
      showToast('Cette adresse mail n’a pas d’arobase.');
      chM.focus();
      return;
    }

    const quoi = ecrituresNouvelEleve2R(cle, {
      nom: propre,
      telephone: chT.value,
      email: mail,
      formation: selF ? selF.value : formations[0],
      ants: selA.value
    });
    if(!quoi) return;

    bO.disabled = true;
    bO.textContent = 'Création…';
    try{
      await appelPrep(Object.assign({}, quoi.fiche,
                                    { par: ACCES.moniteur || '' }));
      await majSuivi(propre, quoi.suivi);

      fermerFond(fond);
      showToast(propre + ' ajouté ✅');
      /* Sa fiche vient d'être créée : on relit le répertoire */
      await chargerFichesMoto(true);
      p.redessiner();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bO.disabled = false;
      bO.textContent = '➕ Créer';
    }
  });
  r.appendChild(bO);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  fond.addEventListener('click', e => { if(e.target === fond) fermerFond(fond); });
  setTimeout(() => chN.focus(), 50);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-moto.js'] = true;
