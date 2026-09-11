/* Déployé le 11/09/2026 à 13:30 — v953 */
/* ============================================================
   ec-stats.js
   Taux de réussite : global, par moniteur, par type de permis.
   Les résultats viennent de l'onglet Resultats du classeur,
   alimenté à chaque saisie dans « Examens passés ».

   ⚠️ LE MONITEUR D'UN RÉSULTAT EST CELUI DU BILAN D'EXAMEN
   OFFICIEL — v941.

   David, le 11 septembre 2026 : « il faut bien prendre pour le
   résultat le moniteur qui a fait le bilan d'examen officiel, pas
   celui qui renseigne le résultat ».

   Deux personnes touchent la ligne d'un résultat : celle qui a
   préparé et présenté le candidat, et celle qui tape « reçu » au
   retour de la session — souvent le bureau. Compter la seconde,
   c'est attribuer la réussite à qui n'était pas dans la voiture.

   ⚠️ ET UN RÉSULTAT SANS MONITEUR N'ENTRE DANS AUCUN TAUX PAR
   MONITEUR.

   Les résultats écrits avant la v940 portent, pour la plupart, le
   moniteur qui avait pris la date à la préfecture — ou personne.
   On ne les répartit pas au hasard : ils sont comptés à part,
   annoncés, et se renseignent d'un geste depuis la liste des noms.
   Sans savoir qui l'a présenté, compter c'est inventer.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Tout l'historique, lu une fois par ouverture d'écran. Changer de
   mois ne redemande donc rien au classeur : les périodes se
   découpent ici. */
let resultatsExamens = [];
let resultatsLus = false;

/* ------------------------------------------------------------
   LA PÉRIODE — une seule porte

   « Ce mois-ci » par défaut, comme la caisse et les coûts : c'est
   la période sur laquelle on décide encore quelque chose.
   ------------------------------------------------------------ */
let statsPeriode = 'mois';      /* mois · choisi · libre · douze */
let statsMois = '';             /* « 2026-09 » quand on en choisit un */
let statsDu = '';
let statsAu = '';
let statsFiltreListe = 'tous';  /* tous · obtenu · ajourne · sansmoniteur */

const MOIS_EN_LETTRES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function jourDuJourStats(){
  return (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);
}

function isoDuJourStats(d){
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function moisEnLettres(aaaaMm){
  const m = /^(\d{4})-(\d{2})$/.exec(String(aaaaMm || ''));
  if(!m) return String(aaaaMm || '');
  return MOIS_EN_LETTRES[parseInt(m[2], 10) - 1] + ' ' + m[1];
}

function jourLisibleStats(iso){
  if(typeof dateEnToutesLettres === 'function'){
    const t = dateEnToutesLettres(iso);
    if(t) return t;
  }
  return iso;
}

/* Les bornes de la période choisie, du premier au dernier jour
   inclus, plus de quoi l'annoncer. UNE SEULE PORTE : deux façons
   de borner une période finiraient par se contredire d'un bloc à
   l'autre du même écran. */
function bornesStats(){
  const auj = jourDuJourStats();
  const d = new Date(auj + 'T12:00:00');

  if(statsPeriode === 'libre'){
    const du = statsDu || auj, au = statsAu || auj;
    return { du: du, au: au,
             titre: 'du ' + jourLisibleStats(du) + ' au ' + jourLisibleStats(au) };
  }

  if(statsPeriode === 'douze'){
    const debut = new Date(d.getFullYear(), d.getMonth() - 11, 1);
    return { du: isoDuJourStats(debut), au: auj, titre: 'les douze derniers mois' };
  }

  return bornesDuMoisStats((statsPeriode === 'choisi' && statsMois)
    ? statsMois : auj.slice(0, 7));
}

/* ⚠️ LES BORNES D'UN MOIS, SORTIES DE BORNESSTATS — v953.

   ⚠️ « Stats » dans le nom, et ce n'est pas de la décoration :
   ec-paie.js a déjà une bornesDuMois à elle, pour la paie. Deux
   fonctions du même nom dans deux modules chargés ensemble, la
   seconde écrase la première — c'est exactement ce qui était
   arrivé à chargerFiches, et test-heures-decalees veille dessus.

   La tuile « Réussite du mois » a besoin du MOIS EN COURS, toujours.
   bornesStats, elle, suit les réglages de l'écran : le jour où
   quelqu'un y choisit « les douze derniers mois », la tuile aurait
   changé de sens sans que personne ne lui demande rien.

   Le calcul reste écrit une seule fois — bornesStats l'appelle. */
function bornesDuMoisStats(mois){
  const an = parseInt(String(mois).slice(0, 4), 10);
  const nm = parseInt(String(mois).slice(5, 7), 10) - 1;
  const premier = new Date(an, nm, 1);
  const dernier = new Date(an, nm + 1, 0);
  return { du: isoDuJourStats(premier), au: isoDuJourStats(dernier),
           titre: moisEnLettres(mois) };
}

/* Les douze derniers mois, pour le repère qui accompagne le mois
   en cours : un pourcentage seul ne dit pas s'il est bon. */
function bornesDouzeMois(){
  const auj = jourDuJourStats();
  const d = new Date(auj + 'T12:00:00');
  return { du: isoDuJourStats(new Date(d.getFullYear(), d.getMonth() - 11, 1)),
           au: auj };
}

/* ⚠️ ON BORNE SUR L'ISO, JAMAIS SUR LA DATE ÉCRITE. Les dates
   arrivent du classeur dans la forme où elles ont été saisies :
   les comparer telles quelles classerait « 09/10 » après
   « 14/09 ». */
function dansLesBornes(r, b){
  const iso = String((r && r.iso) || '');
  return !!iso && iso >= b.du && iso <= b.au;
}

async function chargerResultats(force){
  if(resultatsLus && !force) return resultatsExamens;
  /* Sans « depuis » : tout l'historique, une fois. Changer de mois
     à l'écran ne doit pas rappeler le classeur — et les douze
     derniers mois servent de repère au mois en cours, donc il les
     faut de toute façon. */
  const d = await appelPrep({ action: 'resultatList', depuis: '' });
  resultatsExamens = (d && d.resultats) || [];
  resultatsLus = true;
  return resultatsExamens;
}

/* ------------------------------------------------------------
   LE TAUX DU MOIS EN COURS, POUR LA TUILE — v953

   ⚠️ ELLE NE RECALCULE RIEN : elle emprunte les trois briques de
   l'écran Réussite — les bornes du mois, le tamis des droits, le
   calcul du taux. Une tuile qui ferait sa propre moyenne finirait
   par annoncer un chiffre que l'écran contredit.

   Trois réponses, et elles ne veulent pas dire la même chose :
     · null  — on n'a pas encore lu les résultats. La tuile dit
               « pas encore » plutôt que d'inventer un zéro ;
     · false — lus, mais aucun examen ce mois-ci : il n'y a rien à
               afficher, et surtout pas « 0 % » ;
     · un objet — le taux, et de quoi il est fait.

   ⚠️ ET LE TAMIS DES DROITS PASSE AVANT LE CALCUL, comme à
   l'écran : ce qu'on n'a pas le droit de voir ne doit pas entrer
   dans la moyenne, sinon la tuile contourne un droit réglé exprès.
   ------------------------------------------------------------ */
function tauxDuMoisEnCours(){
  if(typeof resultatsLus === 'undefined' || !resultatsLus) return null;

  const source = (typeof reussiteDeToutLeMonde === 'function' &&
                  reussiteDeToutLeMonde())
    ? resultatsExamens
    : resultatsExamens.filter(r => (typeof memeNom === 'function') &&
        memeNom(r.moniteur, (typeof monNomDeMoniteur === 'function')
          ? monNomDeMoniteur() : ''));

  const b = bornesDuMoisStats(jourDuJourStats().slice(0, 7));
  const st = calculerTaux(source.filter(r => dansLesBornes(r, b)));
  return st.total ? st : false;
}


/* Un taux n'a de sens qu'au-delà d'un certain nombre de passages */
const SEUIL_FIABLE = 5;

/* ------------------------------------------------------------
   QUI VOIT QUOI — v942

   David : « visible par ceux que j'autorise », et à la question
   « un moniteur voit-il SON taux quand il n'a pas le droit de voir
   celui des autres ? » — « Je dois pouvoir choisir ».

   Deux droits, donc, et un seul écran :

   · « stats »       → tout : l'équipe, les noms, la correction du
     moniteur d'un résultat ;
   · « stats_perso » → son propre taux, et rien d'autre. Ni les
     collègues, ni les candidats des autres, ni le crayon.

   ⚠️ CE N'EST PAS UN MASQUAGE D'AFFICHAGE. Les lignes des autres
   ne sont pas peintes en gris : elles n'entrent pas dans la liste.
   Un écran qui cache ce qu'il a chargé finit toujours par le
   laisser passer quelque part — un total, une infobulle, un
   compte. Ce qu'on n'a pas le droit de voir ne doit pas entrer
   dans le calcul.

   Le Worker garde la porte de son côté : « resultatMoniteur »
   demande « stats », jamais « stats_perso ».
   ------------------------------------------------------------ */
function reussiteDeToutLeMonde(){
  if(typeof aDroit !== 'function') return true;
  return aDroit('stats');
}

function monNomDeMoniteur(){
  return (typeof ACCES !== 'undefined' && ACCES)
    ? String(ACCES.moniteur || '').trim() : '';
}

/* Deux noms se comparent sans leurs accents ni leur casse : le
   classeur garde « Maryne », le code d'accès peut porter
   « maryne ». Comparer brut ferait dire « aucun résultat » à
   quelqu'un qui en a. */
function memeNom(a, b){
  const plat = s => String(s || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  return !!plat(a) && plat(a) === plat(b);
}

/* ⚠️ CE QUI ENTRE DANS UN TAUX, ET CE QUI N'Y ENTRE PAS.

   Un résultat sans moniteur reste un examen passé : il compte dans
   le taux GLOBAL, où l'on ne demande pas qui. Il ne compte dans
   aucun taux PAR MONITEUR, où la question est justement celle-là.
   Les deux règles tiennent à cette fonction : qu'on ne puisse pas
   en changer une sans voir l'autre. */
function aUnMoniteur(r){
  return !!String((r && r.moniteur) || '').trim();
}

function calculerTaux(liste){
  const total = liste.length;
  const reussis = liste.filter(r => r.resultat === 'obtenu').length;
  return {
    total: total,
    reussis: reussis,
    echecs: total - reussis,
    taux: total ? Math.round((reussis / total) * 1000) / 10 : null,
    fiable: total >= SEUIL_FIABLE
  };
}

/* Premier passage seulement : le taux le plus parlant */
function premiersPassages(liste){
  return liste.filter(r => String(r.rang || '1') === '1');
}

/* UN POURCENTAGE S'ÉCRIT AVEC UNE VIRGULE, ICI.

   « 57.1 % » sortait tel quel de Math.round : un point décimal
   dans une phrase française se lit comme une faute de frappe. Et
   comme partout ailleurs dans ce projet, l'écriture d'un nombre
   passe par une seule fonction — deux façons de l'écrire
   finiraient par se contredire d'un bloc à l'autre. */
function pourcent(t){
  if(t === null || t === undefined) return '—';
  return String(t).replace('.', ',') + ' %';
}

function couleurTaux(t){
  if(t === null) return 'var(--muted)';
  if(t >= 70) return 'var(--accent-text)';
  if(t >= 55) return 'var(--ambre)';
  return 'var(--red)';
}

/* Une ligne de statistique, avec sa barre */
function ligneTaux(libelle, st){
  const d = document.createElement('div');
  d.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--line);';

  const h = document.createElement('div');
  h.style.cssText = 'display:flex;align-items:baseline;gap:8px;font-size:14px;';
  const n = document.createElement('span');
  n.style.cssText = 'flex:1;min-width:0;';
  n.textContent = libelle;
  h.appendChild(n);

  const v = document.createElement('span');
  v.style.cssText = 'font-weight:700;font-size:15px;flex-shrink:0;color:' +
    couleurTaux(st.taux) + ';';
  v.textContent = pourcent(st.taux);
  h.appendChild(v);

  const c = document.createElement('span');
  c.style.cssText = 'font-size:12px;color:var(--muted);flex-shrink:0;';
  c.textContent = st.reussis + '/' + st.total;
  h.appendChild(c);
  d.appendChild(h);

  /* Barre proportionnelle */
  const barre = document.createElement('div');
  barre.style.cssText = 'height:6px;background:var(--navy);border-radius:3px;' +
    'margin-top:5px;overflow:hidden;';
  const part = document.createElement('div');
  part.style.cssText = 'height:100%;width:' + (st.taux || 0) + '%;' +
    'background:' + couleurTaux(st.taux) + ';border-radius:3px;';
  barre.appendChild(part);
  d.appendChild(barre);

  /* LE NOMBRE DE PASSAGES SE LIT À CÔTÉ DU TAUX, TOUJOURS.
     50 % sur 4 examens et 50 % sur 40 ne valent pas pareil, et
     c'est sur des gens que ce chiffre-là porte. */
  if(!st.fiable){
    const a = document.createElement('div');
    a.style.cssText = 'font-size:11px;color:var(--muted);margin-top:3px;';
    a.textContent = st.total + ' passage' + (st.total > 1 ? 's' : '') +
      ' seulement — trop peu pour être significatif';
    d.appendChild(a);
  }

  return d;
}

function blocStats(titre, groupes, aide){
  const d = document.createElement('div');
  d.style.cssText = 'margin-bottom:18px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
    'margin-bottom:4px;';
  t.textContent = titre;
  d.appendChild(t);

  if(aide){
    const a = document.createElement('div');
    a.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:6px;line-height:1.5;';
    a.textContent = aide;
    d.appendChild(a);
  }

  const cles = Object.keys(groupes).sort((a, b) => {
    const ta = calculerTaux(groupes[a]).taux, tb = calculerTaux(groupes[b]).taux;
    return (tb === null ? -1 : tb) - (ta === null ? -1 : ta);
  });

  if(!cles.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.style.cssText = 'padding:10px;font-size:12px;';
    v.textContent = 'Aucun résultat.';
    d.appendChild(v);
    return d;
  }

  cles.forEach(k => d.appendChild(ligneTaux(k, calculerTaux(groupes[k]))));
  return d;
}

function grouper(liste, cle){
  const g = {};
  liste.forEach(r => {
    const k = cle(r) || '—';
    if(!g[k]) g[k] = [];
    g[k].push(r);
  });
  return g;
}


/* ------------------------------------------------------------
   LES RÉGLAGES DE PÉRIODE
   ------------------------------------------------------------ */
function blocPeriodeStats(){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:12px 13px;margin-bottom:14px;';

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:7px;flex-wrap:wrap;';
  [['mois', 'Ce mois-ci'], ['choisi', 'Choisir un mois…'],
   ['libre', 'Une période…'], ['douze', '12 derniers mois']].forEach(([cle, nom]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (statsPeriode === cle ? 'btn-primary' : 'btn-secondary');
    b.style.cssText = 'flex:1;min-width:120px;padding:9px;font-size:13px;margin:0;';
    b.textContent = nom;
    b.addEventListener('click', () => {
      statsPeriode = cle;
      if(cle === 'choisi' && !statsMois) statsMois = jourDuJourStats().slice(0, 7);
      afficherStats();
    });
    r.appendChild(b);
  });
  d.appendChild(r);

  if(statsPeriode === 'choisi'){
    const z = document.createElement('div');
    z.style.cssText = 'margin-top:10px;';
    z.innerHTML = '<label for="statsMoisChamp">Le mois</label>' +
      '<input type="month" id="statsMoisChamp" style="margin:0;">';
    d.appendChild(z);
    const ch = z.querySelector('#statsMoisChamp');
    ch.value = statsMois || jourDuJourStats().slice(0, 7);
    ch.addEventListener('change', () => {
      statsMois = ch.value;
      afficherStats();
    });
  }

  if(statsPeriode === 'libre'){
    const b = bornesStats();
    const z = document.createElement('div');
    z.style.cssText = 'display:flex;gap:9px;margin-top:10px;align-items:end;';
    z.innerHTML =
      '<div style="flex:1;"><label for="statsDuChamp">Du</label>' +
        '<input type="date" id="statsDuChamp" style="margin:0;"></div>' +
      '<div style="flex:1;"><label for="statsAuChamp">Au</label>' +
        '<input type="date" id="statsAuChamp" style="margin:0;"></div>';
    d.appendChild(z);
    z.querySelector('#statsDuChamp').value = statsDu || b.du;
    z.querySelector('#statsAuChamp').value = statsAu || b.au;
    z.querySelectorAll('input').forEach(i => i.addEventListener('change', () => {
      statsDu = z.querySelector('#statsDuChamp').value;
      statsAu = z.querySelector('#statsAuChamp').value;
      afficherStats();
    }));
  }

  return d;
}


/* ------------------------------------------------------------
   LA LISTE DES NOMS

   David : « la liste des noms présentés reçus et ajournés pour
   pouvoir faire du ménage directement dedans ».

   Le ménage qu'on peut faire ICI, et lui seul : renseigner ou
   corriger le moniteur. Ce nom ne vit que dans cette colonne —
   l'écrire d'ici ne peut donc rien désynchroniser.

   ⚠️ CORRIGER UN « REÇU » EN « AJOURNÉ » NE SE FAIT PAS D'ICI, ET
   CE N'EST PAS UN OUBLI. Le résultat d'un examen vit à DEUX
   endroits : cette feuille, pour la statistique, et la fiche de
   suivi de l'élève — qu'un permis obtenu fait disparaître. Le
   corriger ici seulement, ce serait écrire la même chose à deux
   endroits et laisser le mauvais gagner, exactement la faute que
   ce projet passe sa semaine à réparer. Le bouton « Défaire ce
   résultat » de Permis › Résultats efface la ligne ET recrée le
   suivi : c'est la seule porte qui fasse les deux.
   ------------------------------------------------------------ */
/* ⚠️ « REÇU » OU « REÇUE » ? ON NE DEVINE PAS.

   La fiche d'un élève ne porte aucun genre — j'ai regardé avant
   d'écrire cette ligne. Accorder sur le prénom, ce serait se
   tromper régulièrement, et se tromper devant la personne
   concernée. La forme neutre ne coûte rien et ne blesse personne. */
function libelleResultat(r){
  return (r.resultat === 'obtenu') ? 'Résultat : reçu' : 'Résultat : ajourné';
}

function ligneDuNom(r){
  const sans = !aUnMoniteur(r);
  const d = document.createElement('div');
  d.style.cssText = 'display:flex;gap:10px;align-items:center;padding:9px 11px;' +
    'border-bottom:1px solid var(--line);border-left:4px solid ' +
    (sans ? 'var(--ambre)'
          : (r.resultat === 'obtenu' ? 'var(--accent-text)' : 'var(--red)')) + ';';

  const coeur = document.createElement('div');
  coeur.style.cssText = 'flex:1;min-width:0;';

  const nom = document.createElement('div');
  nom.style.cssText = 'font-weight:800;font-size:14px;';
  nom.textContent = r.eleve || '—';
  coeur.appendChild(nom);

  const det = document.createElement('div');
  det.style.cssText = 'font-size:11.5px;color:var(--muted);line-height:1.45;';
  const bouts = [libelleResultat(r)];
  if(r.date) bouts.push(r.date);
  if(String(r.rang || '1') !== '1') bouts.push(r.rang + 'ᵉ passage');
  det.textContent = bouts.join(' · ');
  coeur.appendChild(det);

  /* LA RAISON EST ÉCRITE EN TOUTES LETTRES, pas seulement peinte
     sur le bord : une couleur ne dit jamais seule. */
  const qui = document.createElement('div');
  qui.style.cssText = 'font-size:11.5px;line-height:1.45;' +
    (sans ? 'color:var(--warn-text);font-weight:700;' : 'color:var(--muted);');
  qui.textContent = sans
    ? '⚠️ moniteur non renseigné — hors de tout taux par moniteur'
    : 'présenté par ' + r.moniteur;
  coeur.appendChild(qui);
  d.appendChild(coeur);

  /* LE CRAYON N'EXISTE QU'AVEC LE DROIT COMPLET. Qui ne voit que
     son propre taux ne réattribue pas un candidat : il pourrait
     s'en attribuer. Le Worker refuserait l'écriture de toute façon
     — mais un bouton qui échoue est pire qu'un bouton absent. */
  if(reussiteDeToutLeMonde()){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (sans ? 'btn-primary' : 'btn-secondary');
    b.style.cssText = 'margin:0;padding:7px 11px;font-size:12px;flex-shrink:0;';
    b.textContent = sans ? '✏️ Renseigner' : '✏️';
    b.title = 'Qui a présenté ce candidat';
    b.addEventListener('click', () => renseignerLeMoniteur(r, b));
    d.appendChild(b);
  }

  return d;
}

async function renseignerLeMoniteur(r, bouton){
  const gens = (typeof moniteursActifs !== 'undefined' ? moniteursActifs : []) || [];
  if(!gens.length){
    if(typeof informer === 'function'){
      await informer('La liste des moniteurs n’est pas encore chargée. ' +
        'Rouvre l’écran dans un instant.');
    }
    return;
  }

  /* « Personne » est un choix, pas un renoncement : il efface une
     attribution fausse. Un résultat sans moniteur se voit et se
     répare ; attribué au mauvais, il ne se voit jamais. */
  const choix = gens.map(n => ({ valeur: n, libelle: n }));
  choix.push({ valeur: '', libelle: '— personne (retirer le nom) —' });

  if(typeof choisirDansUneListe !== 'function') return;
  const nom = await choisirDansUneListe(
    'Qui a présenté ' + r.eleve + ' ?', choix, r.moniteur || '');
  if(nom === null || nom === undefined) return;

  const avant = bouton.textContent;
  bouton.disabled = true;
  bouton.textContent = '…';
  try{
    await appelPrep({
      action: 'resultatMoniteur',
      eleve: r.eleve,
      dateExamen: r.iso || r.date || '',
      moniteur: nom
    });
    /* On écrit dans la copie qu'on a en mémoire plutôt que de tout
       relire : le classeur vient de le confirmer, et relire ferait
       clignoter l'écran entier pour une case. Le ↻ du bas reste là
       pour qui veut la vérité du classeur. */
    r.moniteur = nom;
    if(typeof showToast === 'function'){
      showToast(nom ? ('Présenté par ' + nom) : 'Nom retiré');
    }
    dessinerStats();
  }catch(e){
    bouton.disabled = false;
    bouton.textContent = avant;
    if(typeof informer === 'function'){
      await informer('Le moniteur n’a PAS été enregistré.\n\nDétail : ' +
        ((e && e.message) ? e.message : e));
    }
  }
}

function blocDesNoms(liste){
  const d = document.createElement('div');
  d.style.cssText = 'margin-bottom:18px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
    'margin-bottom:4px;';
  const tout = reussiteDeToutLeMonde();
  t.textContent = tout ? '📋 Les candidats présentés'
                       : '📋 Les candidats que tu as présentés';
  d.appendChild(t);

  const a = document.createElement('div');
  a.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.5;';
  a.textContent = tout
    ? 'Le crayon dit qui a présenté le candidat. Pour défaire un résultat ' +
      'saisi par erreur, passe par Permis › Résultats : là-bas, le suivi ' +
      "de l'élève se recrée en même temps."
    : 'Ceux dont tu as signé le bilan d’examen officiel. Si l’un manque ' +
      'ou n’est pas à toi, dis-le au bureau : c’est lui qui corrige.';
  d.appendChild(a);

  const comptes = {
    tous: liste.length,
    obtenu: liste.filter(r => r.resultat === 'obtenu').length,
    ajourne: liste.filter(r => r.resultat !== 'obtenu').length,
    sansmoniteur: liste.filter(r => !aUnMoniteur(r)).length
  };

  const chips = document.createElement('div');
  chips.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px;';
  [['tous', 'Tous'], ['obtenu', 'Reçus'], ['ajourne', 'Ajournés'],
   ['sansmoniteur', 'Sans moniteur']].forEach(([cle, nom]) => {
    /* Un filtre à zéro ne s'affiche pas — sauf « Tous », qui est la
       porte de sortie des autres. Une rangée de boutons qui ne
       mènent nulle part apprend à ne plus la lire. */
    if(!comptes[cle] && cle !== 'tous') return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (statsFiltreListe === cle ? 'btn-primary' : 'btn-secondary');
    b.style.cssText = 'margin:0;padding:6px 12px;font-size:12px;border-radius:20px;';
    b.textContent = nom + ' ' + comptes[cle];
    b.addEventListener('click', () => { statsFiltreListe = cle; dessinerStats(); });
    chips.appendChild(b);
  });
  d.appendChild(chips);

  /* Un filtre qui s'est vidé ne doit pas laisser l'écran vide sans
     raison : on retombe sur « Tous ». */
  if(!comptes[statsFiltreListe]) statsFiltreListe = 'tous';

  let vues = liste.slice();
  if(statsFiltreListe === 'obtenu') vues = vues.filter(r => r.resultat === 'obtenu');
  if(statsFiltreListe === 'ajourne') vues = vues.filter(r => r.resultat !== 'obtenu');
  if(statsFiltreListe === 'sansmoniteur') vues = vues.filter(r => !aUnMoniteur(r));

  /* Du plus récent au plus ancien : on vient corriger ce qu'on
     vient de saisir. Le tri se fait sur l'ISO, jamais sur la date
     écrite. */
  vues.sort((a, b) => String(b.iso || '').localeCompare(String(a.iso || '')));

  const boite = document.createElement('div');
  boite.style.cssText = 'border:1px solid var(--line);border-radius:12px;overflow:hidden;';
  if(!vues.length){
    boite.innerHTML = '<div class="empty" style="padding:12px;font-size:12px;">' +
      'Personne dans ce filtre.</div>';
  }else{
    vues.forEach(r => boite.appendChild(ligneDuNom(r)));
  }
  d.appendChild(boite);
  return d;
}


/* ------------------------------------------------------------
   L'ÉCRAN
   ------------------------------------------------------------ */
async function afficherStats(){
  const zone = $('statsZone');
  if(!zone) return;

  const reglages = $('statsReglages');
  if(reglages){
    reglages.innerHTML = '';
    reglages.appendChild(blocPeriodeStats());
  }

  if(!resultatsLus){
    zone.innerHTML = '<div class="empty">Lecture des résultats…</div>';
    try{
      await chargerResultats(false);
    }catch(e){
      zone.innerHTML = '<div class="empty">⚠️ ' +
        String(e.message).replace(/</g, '&lt;') + '</div>';
      return;
    }
  }
  dessinerStats();
}

/* Redessine sans rien redemander : changer de filtre ou corriger un
   nom ne doit pas rappeler le classeur. */
function dessinerStats(){
  const zone = $('statsZone');
  if(!zone) return;

  const bornes = bornesStats();
  const rang = ($('statsRang') && $('statsRang').value) || 'tous';
  const tout = reussiteDeToutLeMonde();
  const moi = monNomDeMoniteur();

  /* ⚠️ LE TAMIS DES DROITS PASSE EN PREMIER, avant toute période et
     tout filtre. Ce qu'on n'a pas le droit de voir ne doit pas
     entrer dans le calcul : un écran qui charge tout et n'en cache
     qu'une partie finit par le laisser passer quelque part. */
  const permis = tout
    ? resultatsExamens
    : resultatsExamens.filter(r => memeNom(r.moniteur, moi));

  let liste = permis.filter(r => dansLesBornes(r, bornes));
  if(rang === 'premier') liste = premiersPassages(liste);
  if(rang === 'repassage') liste = liste.filter(r => String(r.rang || '1') !== '1');

  zone.innerHTML = '';

  if(!tout && !moi){
    /* Sans nom de moniteur, on ne peut rattacher aucun résultat à
       personne. On le dit plutôt que d'afficher un zéro, qui se
       lirait comme « tu n'as fait passer personne ». */
    zone.innerHTML = '<div class="empty">Ton compte n’a pas de nom de moniteur : ' +
      'impossible de retrouver tes candidats.<br>' +
      "<span style='font-size:12px;'>Le bureau peut le renseigner dans ⚙️ Accès.</span></div>";
    return;
  }

  if(!liste.length){
    zone.innerHTML = '<div class="empty">' +
      (tout ? 'Aucun examen passé sur ' : 'Tu n’as présenté personne sur ') +
      bornes.titre + '.<br>' +
      "<span style='font-size:12px;'>Les taux se construisent au fil " +
      'des saisies dans « Examens passés — résultat à saisir ».</span></div>';
    return;
  }

  /* ---- Le chiffre qu'on vient chercher ---- */
  const global = calculerTaux(liste);
  const g = document.createElement('div');
  g.style.cssText = 'background:var(--navy);border:1px solid var(--line);' +
    'border-radius:12px;padding:14px;margin-bottom:18px;text-align:center;';

  /* Le repère des douze derniers mois accompagne le mois affiché :
     un pourcentage seul ne dit pas s'il est bon. On ne l'écrit pas
     quand c'est déjà la période choisie. */
  const douze = (statsPeriode === 'douze')
    ? null
    : calculerTaux(permis.filter(r => dansLesBornes(r, bornesDouzeMois())));

  g.innerHTML =
    '<div style="font-size:13px;color:var(--muted);">' +
      (tout ? 'Taux de réussite · ' : 'Ta réussite · ') + bornes.titre + '</div>' +
    '<div style="font-size:38px;font-weight:800;line-height:1.2;color:' +
      couleurTaux(global.taux) + ';">' +
      pourcent(global.taux) + '</div>' +
    '<div style="font-size:13px;color:var(--muted);">' +
      global.reussis + ' reçu' + (global.reussis > 1 ? 's' : '') + ' sur ' +
      global.total + ' présenté' + (global.total > 1 ? 's' : '') + '</div>' +
    (douze && douze.total
      ? '<div style="font-size:12px;color:var(--muted);margin-top:3px;">' +
        pourcent(douze.taux) + ' sur les douze derniers mois (' + douze.reussis + '/' +
        douze.total + ')</div>'
      : '');
  zone.appendChild(g);

  /* Premier passage à part : c'est l'indicateur de référence */
  if(rang === 'tous'){
    const p = calculerTaux(premiersPassages(liste));
    if(p.total){
      const d = document.createElement('div');
      d.style.cssText = 'font-size:13px;color:var(--muted);text-align:center;' +
        'margin:-10px 0 18px;';
      d.innerHTML = 'Au <strong style="color:' + couleurTaux(p.taux) +
        ';">premier passage : ' + pourcent(p.taux) + '</strong> (' + p.reussis +
        '/' + p.total + ')';
      zone.appendChild(d);
    }
  }

  /* ---- Par moniteur ----
     ⚠️ Seuls les résultats QUI ONT un moniteur. Les autres sont
     annoncés juste en dessous, avec de quoi les réparer.

     Et ce bloc n'existe pas pour qui ne voit que son propre taux :
     il n'aurait qu'une ligne, la sienne, déjà écrite en grand
     au-dessus. Répéter un chiffre ne l'explique pas. */
  const avecNom = liste.filter(aUnMoniteur);
  const sansNom = liste.length - avecNom.length;

  if(tout){
    zone.appendChild(blocStats('👤 Par moniteur', grouper(avecNom, r => r.moniteur),
      'Le moniteur retenu est celui du bilan d’examen officiel, ' +
      'pas celui qui a saisi le résultat.'));
  }

  if(sansNom && tout){
    const a = document.createElement('div');
    a.style.cssText = 'border-left:4px solid var(--ambre);background:var(--warn-bg);' +
      'border-radius:0 9px 9px 0;padding:10px 12px;margin:-10px 0 18px;' +
      'font-size:12.5px;line-height:1.55;color:var(--warn-text);';
    a.innerHTML = '<strong>' + sansNom + ' résultat' + (sansNom > 1 ? 's' : '') +
      ' sans moniteur</strong> — ' +
      (sansNom > 1 ? 'ils ne sont comptés' : 'il n’est compté') +
      ' dans aucun taux par moniteur. Sans savoir qui a présenté le candidat, ' +
      'compter ce serait inventer. La liste des noms, plus bas, permet de ' +
      (sansNom > 1 ? 'les' : 'le') + ' renseigner.';
    zone.appendChild(a);
  }

  /* ---- Les autres découpages ---- */
  zone.appendChild(blocStats('🚗 Par boîte', grouper(liste, r => r.boite || '—')));
  zone.appendChild(blocStats('🎓 Par parcours', grouper(liste, r => r.parcours || '—')));

  const parCentre = grouper(liste, r => r.centre || '— non renseigné —');
  if(Object.keys(parCentre).length > 1){
    zone.appendChild(blocStats("📍 Par centre d'examen", parCentre));
  }

  /* ---- Les noms, et le ménage ---- */
  zone.appendChild(blocDesNoms(liste));

  const pied = document.createElement('div');
  pied.style.cssText = 'font-size:11px;color:var(--muted);line-height:1.6;margin-top:10px;';
  pied.textContent = 'Un taux calculé sur moins de ' + SEUIL_FIABLE +
    ' passages est signalé comme non significatif. ' +
    'Les résultats sont enregistrés au moment de la saisie dans « Examens passés ».';
  zone.appendChild(pied);

  const relire = document.createElement('button');
  relire.type = 'button';
  relire.className = 'btn btn-secondary';
  relire.style.cssText = 'margin-top:10px;padding:8px;font-size:12px;';
  relire.textContent = '↻ Relire les résultats';
  relire.addEventListener('click', async () => {
    relire.disabled = true;
    relire.textContent = 'Lecture…';
    try{ await chargerResultats(true); }catch(e){}
    afficherStats();
  });
  zone.appendChild(relire);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-stats.js'] = true;
