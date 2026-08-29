/* Déployé le 29/08/2026 à 22:45 — v709 */
/* ============================================================
   ec-paie.js
   Ce qu'on transmet au gestionnaire de paie.

   Le modèle reprend celui du tableau : pour chaque semaine, deux
   soldes — normal et majoré à 25 %. Un solde peut être négatif
   quand le moniteur a fait moins que son horaire.

   En fin de mois, un solde majoré négatif se compense d'abord sur
   les heures normales. Ce qui manque encore devient un report,
   repris le mois suivant — le « manque toujours 9,75 de juin ».

   Cet outil rassemble et met en forme. Les décisions — traitement
   d'un chevauchement CP/arrêt, application d'une convention —
   restent celles du gestionnaire de paie.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let salariesPaie = [];
let semainesPaie = [];
let absencesPaie = [];
let gasoilPaie = [];
let cloturesPaie = [];
let rattachements = {};
let moisPaie = '';

/* Le maintien de salaire couvre les 45 premiers jours d'arrêt ;
   IRP Auto prend ensuite le relais. Le compteur le signale. */
const JOURS_MAINTIEN = 45;

/* Les congés se décomptent en jours ouvrés — 5 par semaine — parce
   que les salariés sont mensualisés. Le rythme de travail, lui,
   ne sert qu'au calcul des heures dues. */
const JOURS_CP_SEMAINE = 5;

const TYPES_ABSENCE = [
  { cle:'cp',     nom:'🏖️ Congés payés',      court:'CP' },
  { cle:'arret',  nom:'🤒 Arrêt de travail',   court:'Arrêt' },
  { cle:'ferie',  nom:'📅 Jour férié',         court:'Férié' },
  /* La récupération n'est pas une absence comme les autres : elle
     ne retire rien au dû, elle CONSOMME des heures que le salarié
     avait déjà gagnées. Un CP diminue les heures qu'il doit ; une
     récup diminue celles qu'on lui doit. */
  { cle:'recup',  nom:'🕐 Récupération',       court:'Récup' },
  { cle:'ss',     nom:'📄 Sans solde',         court:'Sans solde' },
  { cle:'autre',  nom:'📝 Autre absence',      court:'Absence' }
];

/* Les heures se comptent au quart */
function arrondiQuart(h){ return Math.round((h || 0) * 4) / 4; }

function enHeures(h){
  const n = arrondiQuart(h);
  return String(n).replace('.', ',') + 'h';
}

/* ------------------------------------------------------------
   LA VIRGULE VAUT LE POINT

   Toute cette page s'écrit à la française — « 33,25h » — et les
   champs de saisie, eux, étaient des <input type="number">. Or un
   champ « number » REFUSE la virgule : sur un clavier français, la
   touche décimale du pavé numérique en produit une, le navigateur
   la jette, et .value revient VIDE.

   On tapait donc « 33,25 », il s'enregistrait zéro, et rien ne le
   disait. Les nombres entiers passaient — c'est pour ça que la
   semaine à 45h était juste et que les deux suivantes restaient
   obstinément vides.

   On lit le nombre nous-mêmes, et les champs deviennent du texte
   en mode décimal : le clavier numérique s'ouvre quand même sur un
   téléphone, et les deux séparateurs passent.
   ------------------------------------------------------------ */
function nombrePaie(v){
  const t = String(v === undefined || v === null ? '' : v)
    .replace(/\s/g, '').replace(',', '.');
  if(!t) return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

/* Le même nombre, prêt à être réaffiché dans un champ : avec la
   virgule, comme le reste de la page l'écrit. */
function versChampPaie(n){
  if(n === null || n === undefined || n === '') return '';
  return String(n).replace('.', ',');
}

/* Un forçage laissé vide n'est pas zéro : c'est « on ne force
   rien », et le serveur fait la différence entre les deux. Envoyer
   0 à la place ferait une semaine à zéro heure normale. */
function champForcePaie(v){
  const n = nombrePaie(v);
  return (n === null) ? '' : n;
}


/* ============================================================
   LE CALCUL

   Un solde majoré négatif se rattrape d'abord sur les heures
   normales du mois, puis sur celles du mois suivant.
   ============================================================ */
function aTransmettre(normal, majore, report){
  let maj = majore || 0;
  let nor = normal || 0;
  let dette = report || 0;

  /* Le report se rattrape d'abord sur les majorées, puis sur les
     normales : c'est l'ordre voulu, et il évite de rogner des
     heures normales quand des majorées peuvent absorber. */
  if(dette > 0){
    const prisSurMaj = Math.min(dette, Math.max(0, maj));
    maj -= prisSurMaj;
    dette -= prisSurMaj;

    if(dette > 0){
      const prisSurNor = Math.min(dette, Math.max(0, nor));
      nor -= prisSurNor;
      dette -= prisSurNor;
    }
  }

  /* Un solde majoré négatif se compense sur les normales */
  if(maj < 0){
    const reste = nor + maj;
    if(reste >= 0) return { normales: arrondiQuart(reste), majorees: 0,
                            report: arrondiQuart(dette) };
    /* Rien à payer : ce qui manque encore passe au mois suivant */
    return { normales: 0, majorees: 0, report: arrondiQuart(dette - reste) };
  }

  return { normales: arrondiQuart(nor), majorees: arrondiQuart(maj),
           report: arrondiQuart(dette) };
}


/* ============================================================
   LA RÉPARTITION D'UNE SEMAINE

   Un jour de CP ou férié retire son quota du dû. Ce qui est fait
   au-delà du dû est normal jusqu'à la base hebdomadaire, majoré
   au-delà. En dessous du dû, le solde normal devient négatif.
   ============================================================ */
function repartirSemaine(faites, joursAbsents, base, heuresJour){
  const b = base || 35;
  const hj = heuresJour || 8.75;

  /* Un jour d'absence retire son quota : avec un jour de CP, le dû
     tombe à 3 × 8,75 h. */
  const dues = Math.max(0, b - (joursAbsents || 0) * hj);
  const f = faites || 0;

  /* Moins que le dû : le manque se porte sur les majorées, pas sur
     les normales. C'est là qu'il se rattrapera. */
  if(f < dues){
    return { dues: dues, normal: 0, majore: arrondiQuart(f - dues) };
  }

  /* Au-dessus du dû : normal jusqu'à la base, majoré au-delà */
  if(f <= b){
    return { dues: dues, normal: arrondiQuart(f - dues), majore: 0 };
  }
  return {
    dues: dues,
    normal: arrondiQuart(b - dues),
    majore: arrondiQuart(f - b)
  };
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */

async function afficherPaie(){
  const zone = $('paieZone');
  if(!zone) return;

  if(!moisPaie){
    const d = new Date();
    moisPaie = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  zone.innerHTML = '<div class="empty">Lecture…</div>';
  try{
    const d = await appelPrep({ action: 'paieList' });
    salariesPaie = (d && d.salaries) || [];
    semainesPaie = (d && d.semaines) || [];
    absencesPaie = (d && d.absences) || [];
    gasoilPaie = (d && d.gasoil) || [];
    cloturesPaie = (d && d.clotures) || [];
    rattachements = (d && d.rattachements) || {};
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';
  paieARedessiner = false;

  /* Le redessin mis en attente pendant la saisie finit par
     arriver : dès qu'on quitte la dernière case, les totaux se
     remettent à jour. Posé une seule fois par écran — la zone est
     recréée à chaque affichage, l'écouteur part avec elle. */
  zone.addEventListener('focusout', () => {
    /* Le temps que le navigateur pose le focus sur sa nouvelle
       cible : sans ce délai, activeElement vaut encore <body> et on
       redessinerait entre deux cases. */
    setTimeout(() => {
      if(paieARedessiner && !saisieEnCoursDansLaPaie()){
        paieARedessiner = false;
        afficherPaie();
      }
    }, 60);
  });

  const barre = document.createElement('div');
  barre.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px;';
  barre.innerHTML = '<label for="paieMois" style="margin:0;flex-shrink:0;' +
    'text-transform:none;font-size:13px;">Mois</label>';

  const chMois = document.createElement('input');
  chMois.type = 'month';
  chMois.id = 'paieMois';
  chMois.value = moisPaie;
  chMois.style.cssText = 'flex:1;min-width:0;margin:0;';
  chMois.addEventListener('change', () => { moisPaie = chMois.value; afficherPaie(); });
  barre.appendChild(chMois);
  zone.appendChild(barre);

  if(!salariesPaie.length){
    const b = document.createElement('button');
    b.className = 'btn btn-primary';
    b.style.cssText = 'margin-bottom:12px;padding:13px;font-size:14px;';
    b.textContent = '➕ Ajouter un salarié';
    b.addEventListener('click', () => ouvrirSalarie(null));
    zone.appendChild(b);

    zone.innerHTML += '<div class="empty">Aucun salarié enregistré.<br>' +
      '<span style="font-size:12px;">Commence par les ajouter : les heures ' +
      'se saisissent ensuite semaine par semaine.</span></div>';
    return;
  }

  const bMsg = document.createElement('button');
  bMsg.className = 'btn btn-primary';
  bMsg.style.cssText = 'margin-bottom:12px;padding:13px;font-size:14px;';
  bMsg.textContent = '✉️ Composer le message pour la paie';
  bMsg.addEventListener('click', () => ouvrirMessagePaie());
  zone.appendChild(bMsg);

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;';
  [['➕ Salarié', () => ouvrirSalarie(null)],
   ['🏖️ Absence', () => ouvrirAbsence(null)],
   ['⛽ Carburant', () => ouvrirGasoil(null)],
   ['📊 Récapitulatif', () => ouvrirRecap()]].forEach(([nom, faire]) => {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'flex:1;min-width:110px;padding:11px;font-size:13px;margin:0;';
    b.textContent = nom;
    b.addEventListener('click', faire);
    r.appendChild(b);
  });
  zone.appendChild(r);

  /* Les semaines à cheval : où les compter */
  const bord = blocSemainesDeBord();
  if(bord) zone.appendChild(bord);

  /* Le tableau, comme dans le classeur : une ligne par salarié,
     deux colonnes par semaine. */
  zone.appendChild(tableauPaie());

  /* Ce qu'on DÉCIDE de ces heures, juste sous le tableau qui les
     produit : c'est là qu'on les a sous les yeux, et c'est là
     qu'on tranche. */
  zone.appendChild(blocCloture());

  /* Les absences du mois, cliquables : sans cette liste, une
     absence saisie ne pouvait plus être corrigée. */
  zone.appendChild(blocAbsencesPaie());

  const inactifs = salariesPaie.filter(s => !s.actif);
  if(inactifs.length){
    const d = document.createElement('div');
    d.style.cssText = 'font-size:11px;color:var(--muted);margin-top:10px;';
    d.textContent = inactifs.length + ' salarié(s) sorti(s) de l\'effectif, non affiché(s).';
    zone.appendChild(d);
  }
}



/* Les deux soldes d'une semaine. Ils se calculent depuis les heures
   faites, sauf si le bureau les a corrigés à la main. */
function soldesSemaine(w, s){
  if(!w) return { normal: 0, majore: 0, calcule: false, vide: true };

  if(w.normalForce !== null || w.majoreForce !== null){
    return {
      normal: w.normalForce !== null ? w.normalForce : 0,
      majore: w.majoreForce !== null ? w.majoreForce : 0,
      calcule: false, vide: false, force: true
    };
  }

  const r = repartirSemaine(w.heures, w.joursAbsents, s.baseHebdo, s.heuresJour);
  return { normal: r.normal, majore: r.majore, calcule: true,
           vide: !w.heures && !w.joursAbsents };
}

/* Les jours d'absence d'une semaine, déduits des CP et fériés déjà
   saisis : les ressaisir serait une occasion de se contredire. */
function joursAbsentsDeduits(idSalarie, lundi, joursSemaine){
  const d1 = lundi;
  const d = new Date(lundi + 'T12:00:00');
  d.setDate(d.getDate() + 6);
  const d2 = d.toISOString().slice(0, 10);

  let jours = 0;
  /* La récup retire son quota du dû, comme un CP. Sans ça la
     semaine afficherait une dette — le salarié n'a pas fait ses
     heures — ALORS QUE son compteur de récup baisse déjà. On lui
     ferait payer deux fois la même journée. */
  absencesPaie.filter(a => a.idSalarie === idSalarie && a.du &&
                           (a.type === 'cp' || a.type === 'ferie' ||
                            a.type === 'recup'))
    .forEach(a => {
      if(a.du > d2) return;
      if(a.au && a.au < d1) return;
      const du = a.du < d1 ? d1 : a.du;
      const au = (a.au && a.au < d2) ? a.au : d2;
      jours += joursTravaillesEntre(du, au, joursSemaine);
    });

  return Math.min(jours, joursSemaine || 4);
}


/* ============================================================
   LES COMPTEURS

   Les jours d'arrêt se comptent en calendaire : c'est ainsi que
   court le délai de maintien de salaire. Les CP se comptent en
   jours travaillés.
   ============================================================ */
function joursEntre(du, au){
  if(!du) return 0;
  const d1 = new Date(du + 'T12:00:00');
  const d2 = new Date((au || du) + 'T12:00:00');
  if(isNaN(d1) || isNaN(d2)) return 0;
  return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
}

/* Les jours d'une période, plafonnés à un nombre par semaine.

   Deux usages qui ne se confondent pas :
   — le compteur de congés décompte 5 jours par semaine, puisque
     les salariés sont mensualisés ;
   — le calcul du dû hebdomadaire plafonne au rythme réel, sans
     quoi une semaine entière de CP donnerait un dû négatif. */
function joursTravaillesEntre(du, au, joursSemaine){
  if(!du) return 0;
  const rythme = joursSemaine || 4;

  const d = new Date(du + 'T12:00:00');
  const f = new Date((au || du) + 'T12:00:00');
  if(isNaN(d) || isNaN(f)) return 0;

  /* Regroupé par semaine, pour plafonner chacune séparément */
  const parSemaine = {};
  let garde = 0;
  while(d <= f && garde++ < 500){
    const j = d.getDay();
    if(j >= 1 && j <= 6){
      const lundi = new Date(d);
      lundi.setDate(lundi.getDate() - ((j + 6) % 7));
      const cle = lundi.getFullYear() + '-' +
                  String(lundi.getMonth() + 1).padStart(2, '0') + '-' +
                  String(lundi.getDate()).padStart(2, '0');
      parSemaine[cle] = (parSemaine[cle] || 0) + 1;
    }
    d.setDate(d.getDate() + 1);
  }

  return Object.keys(parSemaine)
    .reduce((s, k) => s + Math.min(parSemaine[k], rythme), 0);
}

/* Les compteurs d'un salarié sur l'année en cours */
function compteursDe(s, an){
  const annee = an || (moisPaie || '').split('-')[0] ||
                String(new Date().getFullYear());
  const debut = annee + '-01-01';
  const fin = annee + '-12-31';

  let cp = 0, arret = 0, arretEnCours = null;

  absencesPaie.filter(a => a.idSalarie === s.id && a.du).forEach(a => {
    /* Ce qui touche l'année, borné à elle */
    const d = a.du < debut ? debut : a.du;
    const f = (a.au && a.au < fin) ? a.au : (a.au ? fin : fin);
    if(a.du > fin) return;
    if(a.au && a.au < debut) return;

    if(a.type === 'cp'){
      /* Le solde de congés : 5 jours par semaine */
      cp += joursTravaillesEntre(d, f, JOURS_CP_SEMAINE);
    }else if(a.type === 'arret'){
      /* Un arrêt sans fin court jusqu'à aujourd'hui */
      const finReelle = a.au ? f : todayLocal();
      arret += joursEntre(d, finReelle < d ? d : finReelle);
      if(!a.au) arretEnCours = a.du;
    }
  });

  return {
    annee: annee,
    cp: cp,
    arret: arret,
    arretEnCours: arretEnCours,
    resteMaintien: Math.max(0, JOURS_MAINTIEN - arret),
    maintienDepasse: arret > JOURS_MAINTIEN
  };
}


/* ============================================================
   LE CARBURANT
   ============================================================ */
function gasoilDuMois(idSalarie, mois){
  const m = mois || moisPaie;
  return gasoilPaie.filter(g =>
    g.idSalarie === idSalarie && String(g.date).indexOf(m) === 0);
}

function totalGasoil(liste){
  return Math.round(liste.reduce((s, g) => s + (g.montant || 0), 0) * 100) / 100;
}

function enEuros(v){
  return String(Math.round((v || 0) * 100) / 100).replace('.', ',') + ' €';
}



/* Les semaines partagées entre deux mois, et le choix qui va avec */
function blocSemainesDeBord(){
  const touchent = lundisTouchant(moisPaie);

  /* Celles qui débordent vraiment : les autres n'ont pas à être
     réglées. */
  const partagees = touchent.filter(l => {
    const f = new Date(l + 'T12:00:00');
    f.setDate(f.getDate() + 6);
    const moisFin = f.getFullYear() + '-' +
                    String(f.getMonth() + 1).padStart(2, '0');
    const moisDebut = l.slice(0, 7);
    return moisDebut !== moisFin;
  });

  if(!partagees.length) return null;

  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:10px 12px;margin-bottom:12px;';
  d.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:700;' +
    'color:var(--accent-text);">📅 Semaines à cheval — ' + partagees.length +
    '</summary>';

  const z = document.createElement('div');
  z.style.marginTop = '10px';
  z.innerHTML = '<div style="font-size:11px;color:var(--muted);margin-bottom:10px;' +
    'line-height:1.5;">Une semaine partagée ne se compte que d\'un côté. ' +
    'Choisis lequel : elle disparaîtra du tableau de l\'autre mois.</div>';

  partagees.forEach(l => {
    const f = new Date(l + 'T12:00:00');
    f.setDate(f.getDate() + 6);
    const moisA = l.slice(0, 7);
    const moisB = f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0');
    const choisi = moisDeLaSemaine(l);

    const ligne = document.createElement('div');
    ligne.style.cssText = 'display:flex;gap:8px;align-items:center;' +
      'padding:7px 0;font-size:13px;border-bottom:1px solid rgba(255,255,255,.05);';

    ligne.innerHTML = '<span style="flex:1;min-width:0;">Semaine du ' +
      dateCourtePaie(l) + ' au ' + String(f.getDate()).padStart(2, '0') + '/' +
      String(f.getMonth() + 1).padStart(2, '0') + '</span>';

    const sel = document.createElement('select');
    sel.style.cssText = 'width:auto;margin:0;padding:6px 8px;font-size:12px;';
    sel.innerHTML = [moisA, moisB].map(mo =>
      '<option value="' + mo + '"' + (mo === choisi ? ' selected' : '') + '>' +
      moisEnToutesLettres(mo) + '</option>').join('');

    sel.addEventListener('change', async () => {
      sel.disabled = true;
      try{
        await appelPrep({
          action: 'paieRattacher',
          semaine: l,
          /* Le choix par défaut n'a pas besoin d'être enregistré */
          mois: (sel.value === moisParDefaut(l)) ? '' : sel.value,
          par: ACCES.moniteur || ''
        });
        showToast('Rattachée à ' + moisEnToutesLettres(sel.value) + ' ✅');
        afficherPaie();
      }catch(e){
        showToast('Impossible : ' + e.message);
        sel.disabled = false;
      }
    });
    ligne.appendChild(sel);
    z.appendChild(ligne);
  });

  d.appendChild(z);
  return d;
}


/* ============================================================
   LA CLÔTURE DU MOIS

   Une ligne par salarié, et une seule saisie par ligne : ce qu'on
   paie. Le reste se déduit et s'écrit sous les yeux pendant qu'on
   tape — ce qui part en récup, et ce qui repart au mois suivant.

   Par défaut on paie tout ; ce qu'on ne paie pas attend d'être payé
   le mois prochain. La récup, elle, ne se met jamais toute seule :
   c'est une décision, pas un reste.
   ============================================================ */
function blocCloture(){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:12px;margin-top:14px;';

  const actifs = salariesPaie.filter(s => s.actif);
  const clos = actifs.length && actifs.every(s => !!clotureDe(s.id, moisPaie));

  const tete = document.createElement('div');
  tete.style.cssText = 'display:flex;gap:8px;align-items:center;' +
    'flex-wrap:wrap;margin-bottom:10px;';
  tete.innerHTML = '<div style="flex:1;min-width:0;font-size:13px;font-weight:700;' +
    'color:var(--accent-text);">🔒 Clôture — ' +
    (moisEnToutesLettres(moisPaie) || moisPaie) +
    (clos ? ' <span style="color:var(--muted);font-weight:400;">· validée</span>' : '') +
    '</div>';
  d.appendChild(tete);

  if(!actifs.length){
    d.innerHTML += '<div style="font-size:12px;color:var(--muted);">' +
      'Aucun salarié actif.</div>';
    return d;
  }

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:10px;' +
    'line-height:1.5;';
  aide.innerHTML =
    '<strong>reporté</strong> = ce qui restait des mois clôturés · ' +
    '<strong>ce mois</strong> = ce que le tableau au-dessus a produit · ' +
    '<strong>je paie</strong> = la seule case à remplir, pré-remplie avec tout · ' +
    '<strong>récup</strong> = transformé en temps au lieu d\'argent.<br>' +
    'Ce qui n\'est ni payé ni mis en récup repart au mois suivant.';
  d.appendChild(aide);

  const lignes = [];

  actifs.forEach(s => {
    const c = clotureParDefaut(s);
    const l = document.createElement('div');
    l.style.cssText = 'border-top:1px solid rgba(255,255,255,.06);padding:9px 0;';

    const etat = { payeN: c.payeN, payeM: c.payeM,
                   recupN: c.recupN, recupM: c.recupM, taux: c.taux };

    const nom = document.createElement('div');
    nom.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:5px;';
    nom.textContent = s.nom;
    l.appendChild(nom);

    /* Le rappel de ce qui arrive : ce n'est pas une saisie, c'est
       le point de départ. Sans lui on ne comprend pas pourquoi il y
       a plus à payer que le mois n'en a produit. */
    const avant = [];
    if(c.avant.normales) avant.push(enHeures(c.avant.normales) + ' N');
    if(c.avant.majorees) avant.push(enHeures(c.avant.majorees) + ' à 25%');
    if(c.avant.recup) avant.push('🕐 ' + enHeures(c.avant.recup) + ' de récup');
    if(avant.length){
      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--warn-text);margin-bottom:5px;';
      a.textContent = '↳ reporté : ' + avant.join(' · ');
      l.appendChild(a);
    }

    const zApres = document.createElement('div');
    zApres.style.cssText = 'font-size:11px;margin-top:5px;line-height:1.5;';

    const majApres = () => {
      const resteN = arrondiQuart(c.dispoN - etat.payeN - etat.recupN);
      const resteM = arrondiQuart(c.dispoM - etat.payeM - etat.recupM);
      const credit = recupCreditee(etat.recupN, etat.recupM, etat.taux);
      const bouts = [];
      if(credit) bouts.push('<span style="color:var(--accent-text);">🕐 +' +
        enHeures(credit) + ' de récup créditée</span>');
      if(resteN || resteM){
        const dits = [];
        if(resteN) dits.push(enHeures(resteN) + ' N');
        if(resteM) dits.push(enHeures(resteM) + ' à 25%');
        const doit = (resteN < 0 || resteM < 0);
        bouts.push('<span style="color:' + (doit ? 'var(--red)' : 'var(--warn-text)') +
          ';">' + (doit ? '⚠️ ' : '💶 ') + dits.join(' · ') +
          (doit ? ' — il doit ces heures' : ' à payer le mois prochain') + '</span>');
      }
      if(!bouts.length) bouts.push('<span style="color:var(--muted);">tout soldé</span>');
      zApres.innerHTML = '→ ' + bouts.join(' · ');
    };

    /* Deux lignes, parce que les deux ne se paient pas au même
       tarif et qu'on ne peut pas les additionner. */
    [['normales', 'N', 'payeN', 'recupN', c.dispoN, c.calcN],
     ['à 25 %', '↑', 'payeM', 'recupM', c.dispoM, c.calcM]
    ].forEach(([libelle, court, cleP, cleR, dispo, ceMois]) => {
      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:7px;align-items:center;' +
        'flex-wrap:wrap;font-size:12px;margin-bottom:4px;';

      r.innerHTML = '<span style="width:58px;flex-shrink:0;color:var(--muted);">' +
        libelle + '</span>' +
        '<span style="width:74px;flex-shrink:0;font-variant-numeric:tabular-nums;">' +
        (ceMois ? (ceMois > 0 ? '+' : '') + enHeures(ceMois) : '·') + '</span>';

      const champ = (cle, etiquette, largeur) => {
        const w = document.createElement('span');
        w.style.cssText = 'display:inline-flex;align-items:center;gap:4px;';
        const e = document.createElement('span');
        e.style.cssText = 'color:var(--muted);font-size:11px;';
        e.textContent = etiquette;
        const i = document.createElement('input');
        i.type = 'text';
        i.inputMode = 'decimal';
        i.value = versChampPaie(etat[cle] || '');
        i.placeholder = '0';
        i.disabled = c.close;
        i.style.cssText = 'width:' + largeur + 'px;margin:0;padding:4px;font-size:12px;' +
          'text-align:center;font-variant-numeric:tabular-nums;background:var(--navy);' +
          'border:1px solid var(--line);' + (c.close ? 'opacity:.55;' : '');
        i.addEventListener('input', () => {
          etat[cle] = nombrePaie(i.value) || 0;
          majApres();
        });
        w.appendChild(e); w.appendChild(i);
        return w;
      };

      r.appendChild(champ(cleP, 'je paie', 54));
      r.appendChild(champ(cleR, 'récup', 48));

      /* Le taux ne concerne QUE les heures à 25 % : une heure
         normale vaut toujours une heure de récup. */
      if(cleR === 'recupM'){
        const sel = document.createElement('select');
        sel.disabled = c.close;
        sel.style.cssText = 'width:auto;margin:0;padding:4px 6px;font-size:11px;' +
          (c.close ? 'opacity:.55;' : '');
        sel.innerHTML = '<option value="1">×1</option><option value="1.25">×1,25</option>';
        sel.value = String(etat.taux);
        sel.title = 'Une heure à 25 % vaut une heure de récup, ou une heure un quart';
        sel.addEventListener('change', () => {
          etat.taux = parseFloat(sel.value) || 1;
          majApres();
        });
        r.appendChild(sel);
      }

      const dis = document.createElement('span');
      dis.style.cssText = 'font-size:11px;color:var(--muted);';
      dis.textContent = 'dispo ' + enHeures(dispo);
      r.appendChild(dis);

      l.appendChild(r);
    });

    majApres();
    l.appendChild(zApres);
    d.appendChild(l);
    lignes.push({ s: s, c: c, etat: etat });
  });

  /* --- Valider, ou rouvrir --- */
  const rangee = document.createElement('div');
  rangee.style.cssText = 'display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;';

  const etatTexte = document.createElement('div');
  etatTexte.style.cssText = 'font-size:12px;color:var(--muted);margin-top:8px;' +
    'line-height:1.5;';

  if(!clos){
    const bVal = document.createElement('button');
    bVal.className = 'btn btn-primary';
    bVal.style.cssText = 'flex:1;min-width:170px;padding:12px;font-size:13px;margin:0;';
    bVal.textContent = '✅ Valider le mois';
    bVal.addEventListener('click', async () => {
      if(!await confirmer('Valider ' + (moisEnToutesLettres(moisPaie) || moisPaie) +
          ' ?\n\nLes chiffres de ce mois seront figés : corriger une semaine ' +
          'ensuite ne les changera plus, il faudra rouvrir le mois.')) return;
      bVal.disabled = true;
      bVal.textContent = 'Validation…';
      let ok = 0;
      for(const x of lignes){
        try{
          await appelPrep({
            action: 'paieClotureSet',
            idSalarie: x.s.id, mois: moisPaie,
            normalesCalc: x.c.calcN, majoreesCalc: x.c.calcM,
            normalesPayees: x.etat.payeN, majoreesPayees: x.etat.payeM,
            normalesRecup: x.etat.recupN, majoreesRecup: x.etat.recupM,
            tauxRecup: x.etat.taux,
            recupCreditee: recupCreditee(x.etat.recupN, x.etat.recupM, x.etat.taux),
            remarque: '', par: ACCES.moniteur || ''
          });
          ok++;
        }catch(e){
          showToast('Impossible pour ' + x.s.nom + ' : ' + e.message);
        }
      }
      if(ok) showToast(ok + ' salarié(s) clôturé(s) ✅');
      afficherPaie();
    });
    rangee.appendChild(bVal);
    etatTexte.textContent = 'Une fois validé, ce mois ne bouge plus : ' +
      'c\'est ce qui rend les compteurs fiables.';
  }else{
    const bRe = document.createElement('button');
    bRe.className = 'btn btn-secondary';
    bRe.style.cssText = 'flex:1;min-width:170px;padding:12px;font-size:13px;margin:0;';
    bRe.textContent = '🔓 Rouvrir le mois';
    bRe.addEventListener('click', async () => {
      if(!await confirmer('Rouvrir ' + (moisEnToutesLettres(moisPaie) || moisPaie) +
          ' ?\n\nLes décisions prises sur ce mois seront effacées et les ' +
          'compteurs des mois suivants recalculés.')) return;
      bRe.disabled = true;
      for(const s of actifs){
        const c = clotureDe(s.id, moisPaie);
        if(!c) continue;
        try{ await appelPrep({ action: 'paieClotureDelete', id: c.id }); }catch(e){}
      }
      showToast('Mois rouvert 🔓');
      afficherPaie();
    });
    rangee.appendChild(bRe);
    const q = lignes[0] && lignes[0].c.ligne;
    etatTexte.textContent = 'Validé' + (q && q.valideLe ? ' le ' + q.valideLe : '') +
      (q && q.par ? ' par ' + q.par : '') + '.';
  }

  const bDir = document.createElement('button');
  bDir.className = 'btn btn-secondary';
  bDir.style.cssText = 'flex:1;min-width:170px;padding:12px;font-size:13px;margin:0;';
  bDir.textContent = '💬 Message direction';
  bDir.title = 'Les heures supp de chacun, à coller sur Messenger';
  bDir.addEventListener('click', () => ouvrirMessageDirection());
  rangee.appendChild(bDir);

  d.appendChild(rangee);
  d.appendChild(etatTexte);
  return d;
}

/* Les absences qui touchent le mois, pour les revoir et corriger.
   Nom propre au module : ec-ecoutes.js déclare déjà blocAbsences,
   et deux fonctions du même nom se percutent. */
function blocAbsencesPaie(){
  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:10px 12px;margin-top:14px;';

  /* Toutes celles du mois, tous salariés confondus */
  const lot = [];
  salariesPaie.forEach(s => {
    absencesDuMois(s.id).forEach(a => lot.push({ s: s, a: a }));
  });

  d.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:700;' +
    'color:var(--accent-text);">🏖️ Absences du mois — ' + lot.length + '</summary>';

  const z = document.createElement('div');
  z.style.marginTop = '10px';

  if(!lot.length){
    z.innerHTML = '<div style="font-size:12px;color:var(--muted);line-height:1.5;">' +
      'Aucune absence sur ce mois.<br>Le bouton 🏖️ Absence en ajoute une.</div>';
    d.appendChild(z);
    return d;
  }

  /* Les plus récentes d'abord */
  lot.sort((x, y) => String(y.a.du).localeCompare(String(x.a.du)));

  lot.forEach(({ s, a }) => {
    const ty = TYPES_ABSENCE.find(x => x.cle === a.type);
    const jours = (a.type === 'cp')
      ? joursTravaillesEntre(a.du, a.au || a.du, JOURS_CP_SEMAINE)
      : (a.type === 'ferie' || a.type === 'recup')
      ? joursTravaillesEntre(a.du, a.au || a.du, s.joursSemaine)
      : joursEntre(a.du, a.au || todayLocal());

    /* Un CP ne retire pas le même nombre de jours au dû qu'au solde */
    const auDu = (a.type === 'cp' || a.type === 'ferie' || a.type === 'recup')
      ? joursTravaillesEntre(a.du, a.au || a.du, s.joursSemaine) : 0;

    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:9px;align-items:center;padding:8px 0;' +
      'border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;cursor:pointer;';
    l.innerHTML =
      '<span style="flex-shrink:0;font-size:16px;">' +
        (ty ? ty.nom.split(' ')[0] : '📝') + '</span>' +
      '<span style="flex:1;min-width:0;line-height:1.45;">' +
        '<strong>' + s.nom.replace(/</g, '&lt;') + '</strong> — ' +
        (ty ? ty.court : 'Absence') + ' ' + periodeTexte(a) +
        '<div style="font-size:11px;color:var(--muted);">' +
          jours + ' jour(s) décompté(s)' +
          (auDu ? ' · ' + auDu + ' retiré(s) du dû hebdomadaire'
                : (a.type === 'arret'
                    ? ' — n\'entre pas dans le calcul des heures' : '')) +
          (a.remarque ? ' · ' + a.remarque.replace(/</g, '&lt;') : '') +
        '</div>' +
      '</span>' +
      '<span style="flex-shrink:0;color:var(--muted);">✏️</span>';
    l.addEventListener('click', () => ouvrirAbsence(a));
    z.appendChild(l);
  });

  d.appendChild(z);
  return d;
}

/* Le mois auquel une semaine appartient par défaut : celui de son
   jeudi, comme la norme des semaines. Une semaine à cheval tombe
   ainsi d'un seul côté, jamais des deux. */
function moisParDefaut(lundi){
  const d = new Date(lundi + 'T12:00:00');
  d.setDate(d.getDate() + 3);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

/* Celui qui compte : le choix du bureau s'il existe */
function moisDeLaSemaine(lundi){
  return rattachements[lundi] || moisParDefaut(lundi);
}

/* Toutes les semaines qui touchent le mois, rattachées ou non */
function lundisTouchant(mois){
  if(!mois) return [];
  const [an, m] = mois.split('-').map(Number);
  const out = [];

  const d = new Date(an, m - 1, 1, 12);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));

  for(let i = 0; i < 6; i++){
    const fin = new Date(d);
    fin.setDate(fin.getDate() + 6);
    if(d.getMonth() === m - 1 || fin.getMonth() === m - 1){
      out.push(d.getFullYear() + '-' +
               String(d.getMonth() + 1).padStart(2, '0') + '-' +
               String(d.getDate()).padStart(2, '0'));
    }
    d.setDate(d.getDate() + 7);
    if(d.getMonth() > m - 1 && d.getFullYear() >= an) break;
  }
  return out;
}

/* Les semaines réellement comptées dans le mois affiché */
function lundisDuMois(mois){
  return lundisTouchant(mois).filter(l => moisDeLaSemaine(l) === mois);
}

function semaineDe(idSalarie, lundi){
  return semainesPaie.find(x => x.idSalarie === idSalarie && x.semaine === lundi) || null;
}


/* ============================================================
   LES COMPTEURS SE LISENT, ILS NE S'ÉCRIVENT PAS

   Ce qu'on doit à un salarié — de l'argent, du temps — est la
   somme de ce qui a été décidé mois après mois. Personne ne tient
   ce nombre à la main : il se relit à chaque ouverture, et il ne
   peut donc pas dériver. C'est toute la différence avec l'ancien
   champ « report », un nombre mutable posé sur la fiche, qui
   s'écrasait au mois suivant sans laisser de trace.

   Trois compteurs, parce que trois dettes qui ne s'éteignent pas
   pareil :

     • les heures NORMALES pas encore payées,
     • les heures à 25 % pas encore payées,
     • la RÉCUP à prendre, en heures de temps.

   Les deux premières restent séparées : elles ne se paient pas au
   même tarif, et les additionner ferait perdre de l'argent à
   quelqu'un. Elles peuvent être négatives — c'est alors le salarié
   qui doit des heures.
   ============================================================ */

/* La clôture d'un salarié pour un mois donné, ou rien. */
function clotureDe(idSalarie, mois){
  return (cloturesPaie || []).find(c =>
    String(c.idSalarie) === String(idSalarie) && String(c.mois) === String(mois)) || null;
}

function moisEstClos(mois){
  return (cloturesPaie || []).some(c => String(c.mois) === String(mois));
}

/* La récup effectivement prise, en heures.

   Une journée de récup vaut la journée de travail du salarié :
   c'est le seul taux qui ait un sens, puisqu'il pose un jour qu'il
   aurait travaillé. */
function recupPrise(s, avantMois){
  const hj = s.heuresJour || 8.75;
  let h = 0;
  (absencesPaie || []).forEach(a => {
    if(String(a.idSalarie) !== String(s.id) || a.type !== 'recup' || !a.du) return;
    if(avantMois && String(a.du).slice(0, 7) >= String(avantMois)) return;
    h += joursTravaillesEntre(a.du, a.au || a.du, s.joursSemaine) * hj;
  });
  return arrondiQuart(h);
}

/* Ce qui reste dû AVANT le mois affiché : la somme de tout ce qui
   a été produit et pas encore soldé, sur les mois déjà clos. */
function reportAvant(s, mois){
  let n = 0, m = 0, credit = 0;
  (cloturesPaie || []).forEach(c => {
    if(String(c.idSalarie) !== String(s.id)) return;
    if(mois && String(c.mois) >= String(mois)) return;
    n += (c.normalesCalc || 0) - (c.normalesPayees || 0) - (c.normalesRecup || 0);
    m += (c.majoreesCalc || 0) - (c.majoreesPayees || 0) - (c.majoreesRecup || 0);
    credit += (c.recupCreditee || 0);
  });
  return { normales: arrondiQuart(n), majorees: arrondiQuart(m),
           recup: arrondiQuart(credit - recupPrise(s, mois)) };
}

/* Ce que le mois affiché a produit, avant toute décision. */
function produitDuMois(s){
  let normal = 0, majore = 0;
  lundisDuMois(moisPaie).forEach(l => {
    const w = semaineDe(s.id, l);
    if(!w) return;
    const so = soldesSemaine(w, s);
    normal += so.normal;
    majore += so.majore;
  });
  return { normales: arrondiQuart(normal), majorees: arrondiQuart(majore) };
}

/* Une heure à 25 % ne vaut pas forcément une heure de récup : elle
   peut en valoir une et quart. C'est la direction qui tranche, au
   cas par cas, et le taux retenu se garde avec la décision.
   Une heure normale, elle, vaut toujours une heure. */
function recupCreditee(normalesRecup, majoreesRecup, taux){
  return arrondiQuart((normalesRecup || 0) + (majoreesRecup || 0) * (taux || 1));
}

/* La décision par défaut : on paie tout ce qui est disponible, et
   ce qu'on ne paie pas attend d'être payé le mois prochain. La
   récup ne se met jamais toute seule — c'est un choix. */
function clotureParDefaut(s){
  const avant = reportAvant(s, moisPaie);
  const mois = produitDuMois(s);
  const dispoN = arrondiQuart(avant.normales + mois.normales);
  const dispoM = arrondiQuart(avant.majorees + mois.majorees);
  const c = clotureDe(s.id, moisPaie);

  return {
    dispoN: dispoN, dispoM: dispoM,
    calcN: mois.normales, calcM: mois.majorees,
    avant: avant,
    /* Une dette du salarié ne se « paie » pas : elle attend d'être
       absorbée par ses prochaines heures. On ne propose donc de
       payer que ce qui est positif. */
    payeN: c ? c.normalesPayees : Math.max(0, dispoN),
    payeM: c ? c.majoreesPayees : Math.max(0, dispoM),
    recupN: c ? c.normalesRecup : 0,
    recupM: c ? c.majoreesRecup : 0,
    taux: c ? (c.tauxRecup || 1) : 1,
    remarque: c ? (c.remarque || '') : '',
    close: !!c, ligne: c
  };
}

/* Les totaux du mois pour un salarié */
function totalMois(s){
  let normal = 0, majore = 0;
  lundisDuMois(moisPaie).forEach(l => {
    const w = semaineDe(s.id, l);
    if(!w) return;
    const so = soldesSemaine(w, s);
    normal += so.normal;
    majore += so.majore;
  });

  /* Le report ne s'applique que sur le mois qu'il vise */
  const report = (s.reportMois && s.reportMois !== moisPaie) ? 0 : (s.report || 0);

  return Object.assign(
    { normal: arrondiQuart(normal), majore: arrondiQuart(majore) },
    aTransmettre(normal, majore, report)
  );
}

function absencesDuMois(idSalarie){
  if(!moisPaie) return [];
  const [an, m] = moisPaie.split('-').map(Number);
  const debut = moisPaie + '-01';
  const fin = moisPaie + '-' + String(new Date(an, m, 0).getDate()).padStart(2, '0');

  return absencesPaie.filter(a => {
    if(a.idSalarie !== idSalarie || !a.du) return false;
    if(a.du > fin) return false;
    if(a.au && a.au < debut) return false;
    return true;
  });
}


/* ------------------------------------------------------------
   NE PAS ARRACHER LA SAISIE EN COURS

   Enregistrer une case appelait afficherPaie(), qui vide l'écran
   entier, relit le classeur et le redessine. Or on remplit quatre
   semaines à la suite — c'est le geste normal, pas l'exception :
   on tape 33,25 dans le 17/08, on passe au 24/08, on commence à
   taper 28,5… et l'enregistrement de la case précédente détruit
   sous les doigts la case en cours. La deuxième semaine ne
   s'enregistrait jamais.

   Tant que quelqu'un est encore dans une case, on garde le
   redessin en attente. Il se fait à la sortie du tableau.
   ------------------------------------------------------------ */
let paieARedessiner = false;

function saisieEnCoursDansLaPaie(){
  const a = document.activeElement;
  const zone = $('paieZone');
  return !!(a && zone && zone.contains(a) &&
            (a.tagName === 'INPUT' || a.tagName === 'SELECT' ||
             a.tagName === 'TEXTAREA'));
}

function redessinerPaieQuandPossible(){
  if(saisieEnCoursDansLaPaie()){ paieARedessiner = true; return; }
  paieARedessiner = false;
  afficherPaie();
}

/* ------------------------------------------------------------
   UNE SEMAINE QU'UN ARRÊT COUVRE EN ENTIER

   Il n'y a rien à y saisir : le salarié n'a pas travaillé de la
   semaine. La reconnaître d'un coup d'œil évite de la chercher, et
   évite surtout de croire qu'on a oublié de la remplir — une case
   vide ressemble à un oubli, et c'est ce qu'on relit trois fois en
   faisant la paie.

   ENTIÈREMENT couverte, et pas seulement touchée : une semaine
   commencée avant l'arrêt garde des heures à saisir.

   Un arrêt sans date de fin court toujours : on le tient pour
   couvrant jusqu'à aujourd'hui, pas au-delà — les semaines à venir
   ne sont pas encore écrites.
   ------------------------------------------------------------ */
function semaineEnArret(idSalarie, lundi){
  if(!lundi) return false;
  const d = new Date(lundi + 'T12:00:00');
  d.setDate(d.getDate() + 6);
  const dimanche = d.toISOString().slice(0, 10);

  return (absencesPaie || []).some(a => {
    if(a.idSalarie !== idSalarie || a.type !== 'arret' || !a.du) return false;
    const fin = a.au || todayLocal();
    return a.du <= lundi && fin >= dimanche;
  });
}

/* Le tableau du mois : une case d'heures par semaine, tout le
   reste se calcule. */
function tableauPaie(){
  const lundis = lundisDuMois(moisPaie);
  const zone = document.createElement('div');
  zone.style.cssText = 'overflow-x:auto;';

  const t = document.createElement('table');
  t.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;' +
    'min-width:' + (140 + lundis.length * 70 + 120) + 'px;';

  const th = document.createElement('thead');
  const l1 = document.createElement('tr');
  l1.innerHTML = '<th style="text-align:left;padding:6px 8px;font-size:11px;' +
    'color:var(--muted);">Salarié</th>' +
    lundis.map(l => '<th style="padding:6px 4px;font-size:11px;color:var(--muted);' +
      'border-left:1px solid var(--line);white-space:nowrap;">' +
      dateCourtePaie(l) + '</th>').join('') +
    '<th colspan="2" style="padding:6px 4px;font-size:11px;color:var(--accent-text);' +
      'border-left:2px solid var(--line);">TOTAL</th>';
  th.appendChild(l1);

  const l2 = document.createElement('tr');
  l2.innerHTML = '<th></th>' +
    lundis.map(() => '<th style="padding:2px 4px;font-size:10px;color:var(--muted);' +
      'border-left:1px solid var(--line);">heures</th>').join('') +
    '<th style="padding:2px 4px;font-size:10px;color:var(--accent-text);' +
      'border-left:2px solid var(--line);">N</th>' +
    '<th style="padding:2px 4px;font-size:10px;color:var(--accent-text);">25%</th>';
  th.appendChild(l2);
  t.appendChild(th);

  const tb = document.createElement('tbody');

  salariesPaie.filter(s => s.actif).forEach(s => {
    const tr = document.createElement('tr');
    tr.style.cssText = 'border-top:1px solid rgba(255,255,255,.06);';

    const td0 = document.createElement('td');
    td0.style.cssText = 'padding:7px 8px;font-weight:700;white-space:nowrap;' +
      'cursor:pointer;';
    td0.textContent = s.nom;
    td0.title = 'Sa fiche';
    td0.addEventListener('click', () => ouvrirSalarie(s));
    tr.appendChild(td0);

    /* Une case par semaine : on tape les heures, rien d'autre */
    lundis.forEach(l => {
      const w = semaineDe(s.id, l);
      const enArret = semaineEnArret(s.id, l);
      const td = document.createElement('td');
      td.style.cssText = 'padding:3px;border-left:1px solid var(--line);' +
        'text-align:center;' +
        (enArret ? 'background:rgba(226,90,90,.13);' : '');

      const ch = document.createElement('input');
      /* Texte, pas « number » : c'est ce qui laisse passer la
         virgule du pavé numérique français. */
      ch.type = 'text';
      ch.inputMode = 'decimal';
      ch.value = (w && w.heures) ? versChampPaie(w.heures) : '';
      /* Une semaine d'arrêt reste saisissable — il arrive qu'un
         salarié reprenne un jour au milieu — mais elle ne se fait
         plus passer pour un oubli. */
      ch.placeholder = enArret ? '—' : '·';
      ch.title = enArret ? 'Semaine entièrement en arrêt : rien à saisir' : '';
      ch.style.cssText = 'width:58px;margin:0;padding:5px 4px;font-size:13px;' +
        'text-align:center;background:var(--navy);border:1px solid transparent;' +
        'font-variant-numeric:tabular-nums;' +
        (enArret ? 'color:var(--red);border-color:rgba(226,90,90,.45);' : '');

      /* Ce qu'on en déduit, en info-bulle */
      const majTitre = () => {
        const j = (w && w.joursAbsents) ||
                  joursAbsentsDeduits(s.id, l, s.joursSemaine);
        const h = nombrePaie(ch.value) || 0;
        if(!h && !j){ ch.title = 'Heures de la semaine'; return; }
        const r = repartirSemaine(h, j, s.baseHebdo, s.heuresJour);
        ch.title = h + 'h faites' + (j ? ' · ' + j + ' j absent' : '') +
          ' · dû ' + r.dues + 'h → ' + r.normal + ' normal · ' + r.majore + ' à 25%';
      };
      majTitre();

      /* On enregistre à la sortie du champ, pas à chaque frappe */
      ch.addEventListener('change', async () => {
        const h = nombrePaie(ch.value) || 0;
        const j = (w && w.joursAbsents !== undefined && w.joursAbsents !== null)
                    ? w.joursAbsents
                    : joursAbsentsDeduits(s.id, l, s.joursSemaine);
        /* Ce qui est relu tout de suite : la virgule devient la
           virgule, « 33.25 » devient « 33,25 », et un gribouillis
           redevient vide au lieu de faire croire à une saisie. */
        ch.value = versChampPaie(h || '');
        ch.style.borderColor = 'var(--orange)';
        try{
          const r = await appelPrep({
            action: 'paieSemaineSet',
            id: w ? w.id : '',
            idSalarie: s.id,
            semaine: l,
            heures: h,
            joursAbsents: j,
            normalForce: (w && w.normalForce !== null) ? w.normalForce : '',
            majoreForce: (w && w.majoreForce !== null) ? w.majoreForce : '',
            remarque: (w && w.remarque) || '',
            par: ACCES.moniteur || ''
          });
          ch.style.borderColor = 'transparent';

          /* La semaine qu'on vient d'écrire, en mémoire : sans ça
             une deuxième correction de la même case repartirait
             sans identifiant. */
          if(r && r.id){
            if(w){ w.id = r.id; w.heures = h; w.joursAbsents = j; }
            else {
              const neuve = { id: r.id, idSalarie: s.id, semaine: l,
                              heures: h, joursAbsents: j,
                              normalForce: null, majoreForce: null,
                              remarque: '' };
              semainesPaie.push(neuve);
            }
          }
          redessinerPaieQuandPossible();
        }catch(e){
          ch.style.borderColor = 'var(--red)';
          showToast('Impossible : ' + e.message);
        }
      });

      /* Le détail d'une semaine : absences forcées, correction */
      /* Ce qui est retenu, sous la case : sans cela il faudrait
         ouvrir chaque semaine pour vérifier le calcul. */
      const bDet = document.createElement('div');
      bDet.style.cssText = 'font-size:10px;cursor:pointer;margin-top:2px;' +
        'line-height:1.35;';
      const so = soldesSemaine(w, s);
      const jAbs = (w && w.joursAbsents) ||
                   joursAbsentsDeduits(s.id, l, s.joursSemaine);

      if(enArret && (!w || !w.heures)){
        /* Dit AVANT le reste : sur une semaine entièrement en
           arrêt, « 0 j abs. » ou une case vide se lisent comme un
           oubli. Ici il n'y a rien à saisir, et c'est ça qu'il faut
           lire. */
        bDet.innerHTML = '<span style="color:var(--red);font-weight:700;">' +
          '🤒 arrêt</span>';
      }else if(!jAbs && (!w || !w.heures)){
        bDet.innerHTML = '&nbsp;';
      }else if(!w || !w.heures){
        /* Des absences sans heures saisies : on montre quand même
           ce qui sera retiré du dû. */
        bDet.innerHTML = '<span style="color:var(--warn-text);">' +
          jAbs + ' j abs.</span>';
      }else{
        bDet.innerHTML =
          '<span style="color:' + (so.normal < 0 ? 'var(--red)' : 'var(--muted)') + ';">' +
            (so.normal ? String(so.normal).replace('.', ',') : '0') + 'N</span>' +
          ' <span style="color:' +
            (so.majore < 0 ? 'var(--red)' : 'var(--accent-text)') + ';">' +
            (so.majore ? String(so.majore).replace('.', ',') : '0') + '↑</span>' +
          (jAbs ? '<br><span style="color:var(--muted);">' + jAbs + ' j abs.</span>' : '') +
          (so.force ? '<br><span style="color:var(--warn-text);">forcé</span>' : '');
      }
      bDet.addEventListener('click', () => ouvrirSemaine(s, l, w));
      td.appendChild(ch);
      td.appendChild(bDet);

      tr.appendChild(td);
    });

    const tot = totalMois(s);
    [[tot.normal, true], [tot.majore, false]].forEach(([v, premier]) => {
      const td = document.createElement('td');
      td.style.cssText = 'padding:5px 6px;text-align:center;font-weight:800;' +
        'font-variant-numeric:tabular-nums;' +
        (premier ? 'border-left:2px solid var(--line);' : '') +
        (v < 0 ? 'color:var(--red);' : 'color:var(--accent-text);');
      td.textContent = v ? String(v).replace('.', ',') : '·';
      tr.appendChild(td);
    });

    tb.appendChild(tr);

    /* Ce qui sera transmis, sous la ligne */
    const abs = absencesDuMois(s.id);
    const cpt = compteursDe(s);
    const gaz = totalGasoil(gasoilDuMois(s.id));

    const dit = [];
    if(tot.majorees) dit.push(enHeures(tot.majorees) + ' à 25%');
    if(tot.normales) dit.push(enHeures(tot.normales) + ' normales');
    if(tot.report) dit.push('⚠️ manque ' + enHeures(tot.report));
    abs.forEach(a => {
      const ty = TYPES_ABSENCE.find(x => x.cle === a.type);
      dit.push((ty ? ty.court : 'Absence') + ' ' + periodeTexte(a));
    });
    if(gaz) dit.push('⛽ ' + enEuros(gaz));
    if(cpt.cp) dit.push('🏖️ ' + cpt.cp + ' j CP en ' + cpt.annee);
    if(cpt.arret){
      dit.push('🤒 ' + cpt.arret + ' j arrêt' +
        (cpt.maintienDepasse
          ? ' — maintien dépassé, IRP Auto'
          : ' — reste ' + cpt.resteMaintien + ' j de maintien'));
    }

    if(dit.length){
      const tr2 = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 1 + lundis.length + 2;
      td.style.cssText = 'padding:0 8px 8px 8px;font-size:11px;' +
        'color:var(--muted);line-height:1.5;';
      td.innerHTML = '→ ' + dit.join(' · ').replace(/</g, '&lt;');
      tr2.appendChild(td);
      tb.appendChild(tr2);
    }
  });

  t.appendChild(tb);
  zone.appendChild(t);

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin-top:8px;line-height:1.5;';
  aide.innerHTML = 'Tape les heures de la semaine : sous la case, ' +
    '<strong>N</strong> = heures normales retenues, <strong>↑</strong> = heures à 25 %. ' +
    'Les jours de CP et fériés viennent des absences saisies. ' +
    'Appuie sous une case pour corriger une semaine à la main.';
  zone.appendChild(aide);

  return zone;
}

/* Nom propre au module : ec-permis-listes en déclare une autre,
   qui rend le jour avec son année. */
function dateCourtePaie(iso){
  if(!iso) return '';
  const p = String(iso).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] : iso;
}

function periodeTexte(a){
  if(a.au) return 'du ' + dateCourtePaie(a.du) + ' au ' + dateCourtePaie(a.au);
  return 'à compter du ' + dateCourtePaie(a.du);
}


/* ============================================================
   UNE SEMAINE
   ============================================================ */

function ouvrirSemaine(s, lundi, w){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(450px, 94vw)';

  const d = new Date(lundi + 'T12:00:00');
  const fin = new Date(d);
  fin.setDate(fin.getDate() + 6);

  const jDeduits = joursAbsentsDeduits(s.id, lundi, s.joursSemaine);

  boite.innerHTML =
    '<h3>' + s.nom.replace(/</g, '&lt;') + '</h3>' +
    '<div style="font-size:13px;color:var(--muted);margin-bottom:14px;">' +
      'Semaine du ' + dateCourtePaie(lundi) + ' au ' +
      String(fin.getDate()).padStart(2, '0') + '/' +
      String(fin.getMonth() + 1).padStart(2, '0') + '</div>' +

    '<div class="duo">' +
      '<div><label for="swHeures">Heures faites</label>' +
        '<input type="text" id="swHeures" inputmode="decimal" ' +
          'placeholder="Ex : 40"></div>' +
      '<div><label for="swAbs">Jours CP ou fériés</label>' +
        '<input type="number" id="swAbs" step="1" min="0"></div>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin:-6px 0 10px;line-height:1.5;">' +
      (jDeduits
        ? jDeduits + ' jour(s) déduit(s) des absences saisies. Corrige si besoin.'
        : 'Aucune absence saisie sur cette semaine.') +
    '</div>' +

    '<div id="swApercu" style="font-size:13px;line-height:1.6;' +
      'border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
      'margin-bottom:12px;"></div>' +

    /* La correction manuelle : le calcul ne prévoit pas tout */
    '<details style="border:1px solid var(--line);border-radius:10px;' +
      'padding:9px 11px;margin-bottom:12px;">' +
      '<summary style="cursor:pointer;font-size:12px;font-weight:700;' +
        'color:var(--accent-text);">✍️ Corriger à la main</summary>' +
      '<div style="font-size:11px;color:var(--muted);margin:8px 0;line-height:1.5;">' +
        'Ce qui est saisi ici remplace le calcul pour cette semaine. ' +
        'Laisse vide pour revenir au calcul.</div>' +
      '<div class="duo">' +
        '<div><label for="swNormal">Normal</label>' +
          '<input type="text" id="swNormal" inputmode="decimal"></div>' +
        '<div><label for="swMajore">Majoré 25%</label>' +
          '<input type="text" id="swMajore" inputmode="decimal"></div>' +
      '</div>' +
    '</details>' +

    '<label for="swRem">Remarque</label>' +
    '<input type="text" id="swRem" placeholder="Facultatif">';

  boite.querySelector('#swAbs').value = w
    ? (w.joursAbsents !== null && w.joursAbsents !== undefined ? w.joursAbsents : jDeduits)
    : jDeduits;

  if(w){
    boite.querySelector('#swHeures').value = versChampPaie(w.heures || '');
    if(w.normalForce !== null) boite.querySelector('#swNormal').value = versChampPaie(w.normalForce);
    if(w.majoreForce !== null) boite.querySelector('#swMajore').value = versChampPaie(w.majoreForce);
    boite.querySelector('#swRem').value = w.remarque || '';
  }

  const zAp = boite.querySelector('#swApercu');
  const majApercu = () => {
    const h = nombrePaie(boite.querySelector('#swHeures').value) || 0;
    const j = parseInt(boite.querySelector('#swAbs').value, 10) || 0;
    const nF = boite.querySelector('#swNormal').value;
    const mF = boite.querySelector('#swMajore').value;

    if(nF !== '' || mF !== ''){
      zAp.innerHTML = '<span style="color:var(--warn-text);">✍️ Corrigé à la main : ' +
        '</span>Normal <strong>' + enHeures(nombrePaie(nF) || 0) + '</strong> · ' +
        '25% <strong>' + enHeures(nombrePaie(mF) || 0) + '</strong>';
      return;
    }

    if(!h){
      zAp.innerHTML = '<span style="color:var(--muted);">Saisis les heures ' +
        'de la semaine.</span>';
      return;
    }

    const r = repartirSemaine(h, j, s.baseHebdo, s.heuresJour);
    zAp.innerHTML = '<span style="color:var(--muted);font-size:12px;">' +
      'Dû cette semaine : ' + enHeures(r.dues) + '</span><br>' +
      'Normal <strong style="color:' +
        (r.normal < 0 ? 'var(--red)' : 'var(--accent-text)') + ';">' +
        enHeures(r.normal) + '</strong> · 25% <strong style="color:' +
        (r.majore < 0 ? 'var(--red)' : 'var(--accent-text)') + ';">' +
        enHeures(r.majore) + '</strong>';
  };
  ['#swHeures', '#swAbs', '#swNormal', '#swMajore'].forEach(x =>
    boite.querySelector(x).addEventListener('input', majApercu));
  majApercu();

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  if(w){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Effacer cette semaine ?')) return;
      try{
        await appelPrep({ action: 'paieSemaineDelete', id: w.id });
        document.body.removeChild(fond);
        showToast('Effacée ✅');
        afficherPaie();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bSup);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '💾 Enregistrer';
  bOk.addEventListener('click', async () => {
    bOk.disabled = true;
    try{
      await appelPrep({
        action: 'paieSemaineSet',
        id: w ? w.id : '',
        idSalarie: s.id,
        semaine: lundi,
        heures: nombrePaie(boite.querySelector('#swHeures').value) || 0,
        joursAbsents: boite.querySelector('#swAbs').value || 0,
        normalForce: champForcePaie(boite.querySelector('#swNormal').value),
        majoreForce: champForcePaie(boite.querySelector('#swMajore').value),
        remarque: boite.querySelector('#swRem').value.trim(),
        par: ACCES.moniteur || ''
      });
      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      afficherPaie();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#swHeures').focus(), 100);
}


/* ============================================================
   UN SALARIÉ
   ============================================================ */

function ouvrirSalarie(s){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(460px, 94vw)';

  boite.innerHTML =
    '<h3>' + (s ? s.nom.replace(/</g, '&lt;') : 'Nouveau salarié') + '</h3>' +
    '<label for="slNom">Nom</label>' +
    '<input type="text" id="slNom" placeholder="Comme sur le bulletin de paie">' +
    '<div class="duo">' +
      '<div><label for="slBase">Base hebdomadaire</label>' +
        '<input type="text" id="slBase" inputmode="decimal" value="35"></div>' +
      '<div><label for="slJours">Jours par semaine</label>' +
        '<input type="number" id="slJours" step="1" value="4"></div>' +
    '</div>' +
    '<div id="slDeduit" style="font-size:12px;color:var(--muted);margin:-6px 0 12px;' +
      'line-height:1.5;"></div>' +

    '<div class="duo">' +
      '<div><label for="slReport">Report en heures</label>' +
        '<input type="text" id="slReport" inputmode="decimal" ' +
          'placeholder="0"></div>' +
      '<div><label for="slReportMois">À déduire sur</label>' +
        '<input type="month" id="slReportMois"></div>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin:-6px 0 12px;line-height:1.5;">' +
      'Ce qui manque d\'un mois précédent, à rattraper. Il se déduit du ' +
      'mois indiqué, puis se remet à jour.</div>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin:4px 0 10px;">' +
      '<input type="checkbox" id="slActif" checked style="width:19px;height:19px;">' +
      'Toujours dans l\'effectif</label>' +
    '<label for="slRem">Remarque</label>' +
    '<input type="text" id="slRem" placeholder="Facultatif">';

  if(s){
    boite.querySelector('#slNom').value = s.nom || '';
    boite.querySelector('#slBase').value = versChampPaie(s.baseHebdo || 35);
    boite.querySelector('#slJours').value = s.joursSemaine || 4;
    boite.querySelector('#slReport').value = versChampPaie(s.report || '');
    boite.querySelector('#slReportMois').value = s.reportMois || '';
    boite.querySelector('#slActif').checked = s.actif;
    boite.querySelector('#slRem').value = s.remarque || '';
  }

  const zd = boite.querySelector('#slDeduit');
  const majDeduit = () => {
    const b = nombrePaie(boite.querySelector('#slBase').value) || 35;
    const j = parseInt(boite.querySelector('#slJours').value, 10) || 4;
    zd.textContent = 'Soit ' + enHeures(b / j) + ' par jour travaillé.';
  };
  ['#slBase', '#slJours'].forEach(x =>
    boite.querySelector(x).addEventListener('input', majDeduit));
  majDeduit();

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  if(s){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer ' + s.nom + ' ?\n\n' +
          'Pour un départ, décoche plutôt « Toujours dans l\'effectif ».')) return;
      try{
        await appelPrep({ action: 'paieSalarieDelete', id: s.id });
        document.body.removeChild(fond);
        showToast('Supprimé ✅');
        afficherPaie();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bSup);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = s ? '💾 Enregistrer' : '➕ Ajouter';
  bOk.addEventListener('click', async () => {
    const nom = boite.querySelector('#slNom').value.trim();
    if(!nom){ showToast('Indique son nom.'); return; }

    const base = nombrePaie(boite.querySelector('#slBase').value) || 35;
    const jours = parseInt(boite.querySelector('#slJours').value, 10) || 4;

    bOk.disabled = true;
    try{
      await appelPrep({
        action: 'paieSalarieSet',
        id: s ? s.id : '',
        nom: nom,
        baseHebdo: base,
        joursSemaine: jours,
        heuresJour: arrondiQuart(base / jours),
        report: nombrePaie(boite.querySelector('#slReport').value) || 0,
        reportMois: boite.querySelector('#slReportMois').value,
        actif: boite.querySelector('#slActif').checked ? 'oui' : 'non',
        remarque: boite.querySelector('#slRem').value.trim(),
        par: ACCES.moniteur || ''
      });
      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      afficherPaie();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#slNom').focus(), 100);
}


/* ============================================================
   UNE ABSENCE
   ============================================================ */

function ouvrirAbsence(a){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(460px, 94vw)';

  boite.innerHTML =
    '<h3>' + (a ? 'Modifier l\'absence' : 'Nouvelle absence') + '</h3>' +
    '<label for="abSal">Salarié</label>' +
    '<select id="abSal">' +
      salariesPaie.map(s => '<option value="' + s.id + '">' +
        s.nom.replace(/</g, '&lt;') + '</option>').join('') +
    '</select>' +
    '<label for="abType">Type</label>' +
    '<select id="abType">' +
      TYPES_ABSENCE.map(t => '<option value="' + t.cle + '">' + t.nom +
                             '</option>').join('') +
    '</select>' +
    '<div class="duo">' +
      '<div><label for="abDu">Du</label><input type="date" id="abDu"></div>' +
      '<div><label for="abAu">Au</label><input type="date" id="abAu"></div>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin:-6px 0 12px;line-height:1.5;">' +
      'Laisse « Au » vide pour un arrêt dont on ne connaît pas la fin.</div>' +
    '<label for="abRem">Remarque pour le gestionnaire</label>' +
    '<input type="text" id="abRem" placeholder="Facultatif">' +
    '<div id="abAlerte" style="font-size:12px;margin:8px 0 0;line-height:1.5;"></div>';

  if(a){
    boite.querySelector('#abSal').value = a.idSalarie;
    boite.querySelector('#abType').value = a.type;
    boite.querySelector('#abDu').value = a.du || '';
    boite.querySelector('#abAu').value = a.au || '';
    boite.querySelector('#abRem').value = a.remarque || '';
  }

  /* Le chevauchement CP/arrêt : exactement le cas sur lequel le
     gestionnaire doit trancher. */
  const zAl = boite.querySelector('#abAlerte');
  const verifier = () => {
    const idS = boite.querySelector('#abSal').value;
    const du = boite.querySelector('#abDu').value;
    const au = boite.querySelector('#abAu').value;
    if(!du){ zAl.innerHTML = ''; return; }

    const croise = absencesPaie.filter(x => {
      if(x.idSalarie !== idS || (a && x.id === a.id) || !x.du) return false;
      return du <= (x.au || '9999-12-31') && x.du <= (au || '9999-12-31');
    });

    zAl.innerHTML = croise.length
      ? '<span style="color:var(--warn-text);">⚠️ Chevauchement avec ' +
        croise.length + ' autre(s) absence(s).</span><br>' +
        '<span style="font-size:11px;color:var(--muted);">Ce sera signalé dans ' +
        'le message : c\'est au gestionnaire de trancher.</span>'
      : '';
  };
  ['#abSal', '#abDu', '#abAu'].forEach(x =>
    boite.querySelector(x).addEventListener('change', verifier));
  verifier();

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  if(a){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer cette absence ?')) return;
      try{
        await appelPrep({ action: 'paieAbsenceDelete', id: a.id });
        document.body.removeChild(fond);
        showToast('Supprimée ✅');
        afficherPaie();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bSup);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = a ? '💾 Enregistrer' : '➕ Ajouter';
  bOk.addEventListener('click', async () => {
    const du = boite.querySelector('#abDu').value;
    if(!du){ showToast('Indique au moins la date de début.'); return; }

    bOk.disabled = true;
    try{
      await appelPrep({
        action: 'paieAbsenceSet',
        id: a ? a.id : '',
        idSalarie: boite.querySelector('#abSal').value,
        type: boite.querySelector('#abType').value,
        du: du,
        au: boite.querySelector('#abAu').value,
        remarque: boite.querySelector('#abRem').value.trim(),
        par: ACCES.moniteur || ''
      });
      document.body.removeChild(fond);
      showToast('Enregistrée ✅');
      afficherPaie();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}



/* ============================================================
   LE CARBURANT
   ============================================================ */

function ouvrirGasoil(g){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 94vw);max-height:88vh;overflow-y:auto;';

  boite.innerHTML =
    '<h3>' + (g ? 'Modifier le remboursement' : '⛽ Remboursement carburant') + '</h3>' +
    '<label for="gzSal">Moniteur</label>' +
    '<select id="gzSal">' +
      salariesPaie.map(s => '<option value="' + s.id + '">' +
        s.nom.replace(/</g, '&lt;') + '</option>').join('') +
    '</select>' +
    '<div class="duo">' +
      '<div><label for="gzDate">Date</label><input type="date" id="gzDate"></div>' +
      '<div><label for="gzMontant">Montant</label>' +
        '<input type="text" id="gzMontant" inputmode="decimal" ' +
          'placeholder="€"></div>' +
    '</div>' +
    '<div class="duo">' +
      '<div><label for="gzVeh">Véhicule</label>' +
        '<input type="text" id="gzVeh" placeholder="Ex : A3 4"></div>' +
      '<div><label for="gzLitres">Litres</label>' +
        '<input type="text" id="gzLitres" inputmode="decimal" ' +
          'placeholder="Facultatif"></div>' +
    '</div>' +
    '<label for="gzRem">Remarque</label>' +
    '<input type="text" id="gzRem" placeholder="Facultatif">';

  boite.querySelector('#gzDate').value = g ? (g.date || todayLocal()) : todayLocal();
  if(g){
    boite.querySelector('#gzSal').value = g.idSalarie;
    boite.querySelector('#gzMontant').value = versChampPaie(g.montant || '');
    boite.querySelector('#gzVeh').value = g.vehicule || '';
    boite.querySelector('#gzLitres').value = versChampPaie(g.litres || '');
    boite.querySelector('#gzRem').value = g.remarque || '';
  }

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Fermer';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  if(g){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer cette ligne ?')) return;
      try{
        await appelPrep({ action: 'paieGasoilDelete', id: g.id });
        document.body.removeChild(fond);
        showToast('Supprimée ✅');
        afficherPaie();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bSup);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = g ? '💾 Enregistrer' : '➕ Ajouter';
  bOk.addEventListener('click', async () => {
    const m = nombrePaie(boite.querySelector('#gzMontant').value);
    if(!m){ showToast('Indique le montant.'); return; }

    bOk.disabled = true;
    try{
      await appelPrep({
        action: 'paieGasoilSet',
        id: g ? g.id : '',
        idSalarie: boite.querySelector('#gzSal').value,
        date: boite.querySelector('#gzDate').value,
        montant: m,
        vehicule: boite.querySelector('#gzVeh').value.trim(),
        litres: nombrePaie(boite.querySelector('#gzLitres').value) || 0,
        remarque: boite.querySelector('#gzRem').value.trim(),
        par: ACCES.moniteur || ''
      });
      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      afficherPaie();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
    }
  });
  r.appendChild(bOk);
  boite.appendChild(r);

  /* Les dernières lignes du mois, pour vérifier d'un coup d'œil */
  const duMois = gasoilPaie.filter(x => String(x.date).indexOf(moisPaie) === 0);
  if(duMois.length){
    const z = document.createElement('div');
    z.style.cssText = 'border-top:1px solid var(--line);margin-top:16px;padding-top:12px;';
    z.innerHTML = '<div style="font-size:13px;font-weight:700;color:var(--accent-text);' +
      'margin-bottom:8px;">Ce mois-ci — ' + enEuros(totalGasoil(duMois)) + '</div>';

    duMois.slice(0, 20).forEach(x => {
      const s = salariesPaie.find(y => y.id === x.idSalarie);
      const l = document.createElement('div');
      l.style.cssText = 'display:flex;gap:8px;padding:5px 0;font-size:13px;' +
        'cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05);';
      l.innerHTML = '<span style="flex-shrink:0;width:52px;color:var(--muted);' +
        'font-size:12px;">' + dateCourtePaie(x.date) + '</span>' +
        '<span style="flex:1;min-width:0;">' + (s ? s.nom : '?').replace(/</g, '&lt;') +
        (x.vehicule ? ' <span style="color:var(--muted);font-size:11px;">' +
          x.vehicule.replace(/</g, '&lt;') + '</span>' : '') + '</span>' +
        '<strong style="flex-shrink:0;">' + enEuros(x.montant) + '</strong>';
      l.addEventListener('click', () => {
        document.body.removeChild(fond);
        ouvrirGasoil(x);
      });
      z.appendChild(l);
    });
    boite.appendChild(z);
  }

  fond.appendChild(boite);
  document.body.appendChild(fond);
}


/* ============================================================
   LE RÉCAPITULATIF

   Sur une période choisie : les heures, les jours d'absence et le
   carburant, par salarié.
   ============================================================ */

let recapDu = '';
let recapAu = '';

function ouvrirRecap(){
  if(!recapDu){
    const an = (moisPaie || '').split('-')[0] || String(new Date().getFullYear());
    recapDu = an + '-01-01';
    recapAu = an + '-12-31';
  }

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(680px, 96vw);max-height:90vh;overflow-y:auto;';

  boite.innerHTML = '<h3>📊 Récapitulatif</h3>' +
    '<div class="duo">' +
      '<div><label for="rcDu">Du</label><input type="date" id="rcDu"></div>' +
      '<div><label for="rcAu">Au</label><input type="date" id="rcAu"></div>' +
    '</div>';

  boite.querySelector('#rcDu').value = recapDu;
  boite.querySelector('#rcAu').value = recapAu;

  const zT = document.createElement('div');
  boite.appendChild(zT);

  const dessiner = () => {
    recapDu = boite.querySelector('#rcDu').value;
    recapAu = boite.querySelector('#rcAu').value;
    zT.innerHTML = '';
    zT.appendChild(tableauRecap(recapDu, recapAu));
  };
  ['#rcDu', '#rcAu'].forEach(x =>
    boite.querySelector(x).addEventListener('change', dessiner));
  dessiner();

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Fermer';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  const bCop = document.createElement('button');
  bCop.className = 'btn btn-primary';
  bCop.textContent = '📋 Copier';
  bCop.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(recapTexte(recapDu, recapAu));
      showToast('Récapitulatif copié ✅');
    }catch(e){ showToast('Copie impossible'); }
  });
  r.appendChild(bCop);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}

/* Les totaux d'un salarié sur une période */
function totauxPeriode(s, du, au){
  let normal = 0, majore = 0;
  semainesPaie.filter(w => w.idSalarie === s.id && w.semaine >= du && w.semaine <= au)
    .forEach(w => {
      const so = soldesSemaine(w, s);
      normal += so.normal;
      majore += so.majore;
    });

  let cp = 0, arret = 0;
  absencesPaie.filter(a => a.idSalarie === s.id && a.du).forEach(a => {
    if(a.du > au) return;
    if(a.au && a.au < du) return;
    const d = a.du < du ? du : a.du;
    const f = a.au ? (a.au > au ? au : a.au) : au;
    if(a.type === 'cp') cp += joursTravaillesEntre(d, f, JOURS_CP_SEMAINE);
    else if(a.type === 'arret') arret += joursEntre(d, f);
  });

  const gaz = totalGasoil(gasoilPaie.filter(g =>
    g.idSalarie === s.id && g.date >= du && g.date <= au));

  return { normal: arrondiQuart(normal), majore: arrondiQuart(majore),
           cp: cp, arret: arret, gasoil: gaz };
}

function tableauRecap(du, au){
  const zone = document.createElement('div');
  zone.style.cssText = 'overflow-x:auto;margin-bottom:12px;';

  const t = document.createElement('table');
  t.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;min-width:520px;';

  t.innerHTML = '<thead><tr>' +
    ['Salarié', 'Normal', '25%', 'CP', 'Arrêt', 'Carburant']
      .map((x, i) => '<th style="text-align:' + (i ? 'center' : 'left') +
        ';padding:7px 8px;font-size:11px;color:var(--accent-text);' +
        'border-bottom:1px solid var(--line);">' + x + '</th>').join('') +
    '</tr></thead>';

  const tb = document.createElement('tbody');
  let tN = 0, tM = 0, tCp = 0, tAr = 0, tG = 0;

  salariesPaie.filter(s => s.actif).forEach(s => {
    const x = totauxPeriode(s, du, au);
    tN += x.normal; tM += x.majore; tCp += x.cp; tAr += x.arret; tG += x.gasoil;

    const tr = document.createElement('tr');
    tr.style.cssText = 'border-bottom:1px solid rgba(255,255,255,.05);';
    tr.innerHTML =
      '<td style="padding:7px 8px;font-weight:700;">' +
        s.nom.replace(/</g, '&lt;') + '</td>' +
      ['<span style="color:' + (x.normal < 0 ? 'var(--red)' : 'inherit') + ';">' +
         (x.normal ? enHeures(x.normal) : '·') + '</span>',
       '<span style="color:' + (x.majore < 0 ? 'var(--red)' : 'inherit') + ';">' +
         (x.majore ? enHeures(x.majore) : '·') + '</span>',
       x.cp ? x.cp + ' j' : '·',
       x.arret ? x.arret + ' j' : '·',
       x.gasoil ? enEuros(x.gasoil) : '·']
        .map(v => '<td style="padding:7px 8px;text-align:center;' +
          'font-variant-numeric:tabular-nums;">' + v + '</td>').join('');
    tb.appendChild(tr);
  });

  const tr = document.createElement('tr');
  tr.style.cssText = 'border-top:2px solid var(--line);font-weight:800;';
  tr.innerHTML = '<td style="padding:8px;">Total</td>' +
    [enHeures(tN), enHeures(tM), tCp + ' j', tAr + ' j', enEuros(tG)]
      .map(v => '<td style="padding:8px;text-align:center;color:var(--accent-text);' +
        'font-variant-numeric:tabular-nums;">' + v + '</td>').join('');
  tb.appendChild(tr);

  t.appendChild(tb);
  zone.appendChild(t);
  return zone;
}

function recapTexte(du, au){
  const l = ['Récapitulatif du ' + dateCourtePaie(du) + ' au ' + dateCourtePaie(au), ''];
  salariesPaie.filter(s => s.actif).forEach(s => {
    const x = totauxPeriode(s, du, au);
    const b = [];
    if(x.majore) b.push(enHeures(x.majore) + ' à 25%');
    if(x.normal) b.push(enHeures(x.normal) + ' normales');
    if(x.cp) b.push(x.cp + ' j de CP');
    if(x.arret) b.push(x.arret + ' j d\'arrêt');
    if(x.gasoil) b.push(enEuros(x.gasoil) + ' de carburant');
    if(b.length) l.push(s.nom + ' : ' + b.join(' · '));
  });
  return l.join('\n');
}


/* ------------------------------------------------------------
   LE MESSAGE POUR LA DIRECTION

   Court, et rien d'autre que ce qu'il faut pour trancher : le
   prénom, ses heures supp normales, ses heures à 25 %. Il se colle
   sur Messenger, on répond « paie tout » ou « garde-en la moitié
   en récup », et on clôture derrière.

   C'est un message AVANT la décision — à ne pas confondre avec
   celui du gestionnaire de paie, qui part APRÈS et qui dit ce
   qu'on a décidé. */
function prenomDe(nom){
  const t = String(nom || '').trim();
  if(!t) return '';
  /* « Criquet Maryne » : le prénom est le dernier mot chez nous —
     les fiches sont saisies NOM Prénom. Un seul mot reste lui-même. */
  const mots = t.split(/\s+/);
  return mots.length > 1 ? mots[mots.length - 1] : mots[0];
}

function composerMessageDirection(){
  const lignes = ['Heures supp ' + (moisEnToutesLettres(moisPaie) || moisPaie) + ' :', ''];
  let un = false;

  salariesPaie.filter(s => s.actif).forEach(s => {
    const m = produitDuMois(s);
    const avant = reportAvant(s, moisPaie);
    const totN = arrondiQuart(m.normales + avant.normales);
    const totM = arrondiQuart(m.majorees + avant.majorees);
    if(!totN && !totM && !avant.recup) return;
    un = true;

    const bouts = [];
    bouts.push(enHeures(totN) + ' normales');
    bouts.push(enHeures(totM) + ' à 25%');
    /* Ce qui traîne des mois d'avant se dit : la direction décide
       sur le total dû, pas sur le seul mois écoulé. */
    if(avant.normales || avant.majorees){
      const r = [];
      if(avant.normales) r.push(enHeures(avant.normales) + ' N');
      if(avant.majorees) r.push(enHeures(avant.majorees) + ' à 25%');
      bouts.push('dont ' + r.join(' et ') + ' reporté(s)');
    }
    if(avant.recup) bouts.push(enHeures(avant.recup) + ' de récup à prendre');

    lignes.push(prenomDe(s.nom) + ' : ' + bouts.join(', '));
  });

  if(!un) return 'Aucune heure supplémentaire ce mois-ci.';
  lignes.push('', 'On paie tout ? On en garde en récup ?');
  return lignes.join('\n');
}

function ouvrirMessageDirection(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 95vw);max-height:88vh;overflow-y:auto;';

  boite.innerHTML = '<h3>💬 Message direction</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.5;">' +
      'À coller sur Messenger, pour décider quoi faire des heures supp ' +
      'avant de clôturer le mois.</div>';

  const z = document.createElement('textarea');
  z.rows = 12;
  z.value = composerMessageDirection();
  z.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:10px 11px;border-radius:10px;font-size:14px;' +
    'line-height:1.55;font-family:inherit;resize:vertical;margin-bottom:12px;';
  boite.appendChild(z);

  const rangee = document.createElement('div');
  rangee.className = 'btn-row';

  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary';
  bF.textContent = 'Fermer';
  bF.addEventListener('click', () => document.body.removeChild(fond));
  rangee.appendChild(bF);

  const bC = document.createElement('button');
  bC.className = 'btn btn-primary';
  bC.textContent = '📋 Copier';
  bC.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(z.value);
      showToast('Copié ✅');
    }catch(e){
      z.select();
      showToast('Sélectionné — fais copier');
    }
  });
  rangee.appendChild(bC);

  boite.appendChild(rangee);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}

/* ============================================================
   LE MESSAGE
   ============================================================ */

function composerMessagePaie(){
  const lignes = ['Bonjour,', ''];
  const moisTexte = moisEnToutesLettres(moisPaie);
  if(moisTexte) lignes.push('Éléments variables pour ' + moisTexte + ' :', '');

  salariesPaie.filter(s => s.actif).forEach(s => {
    /* Ce qu'on a DÉCIDÉ quand le mois est clôturé, ce qui est
       calculé sinon. Le gestionnaire doit recevoir la décision,
       pas le brouillon : c'est lui qui va payer. */
    const c = clotureDe(s.id, moisPaie);
    const brut = totalMois(s);
    const t = c
      ? { normales: c.normalesPayees, majorees: c.majoreesPayees, report: 0 }
      : brut;
    const abs = absencesDuMois(s.id);

    /* Un salarié sans rien à signaler n'encombre pas le message */
    if(!t.normales && !t.majorees && !t.report && !abs.length &&
       !(c && c.recupCreditee)) return;

    const bouts = [];
    if(t.majorees) bouts.push('Heures supplémentaires à 25% : ' + enHeures(t.majorees));
    if(t.normales) bouts.push('Heures supplémentaires normales : ' + enHeures(t.normales));
    if(c && c.recupCreditee){
      bouts.push(enHeures(c.recupCreditee) + ' passées en récupération, ' +
                 'à ne pas payer');
    }
    if(c){
      const resteN = arrondiQuart(c.normalesCalc - c.normalesPayees - c.normalesRecup);
      const resteM = arrondiQuart(c.majoreesCalc - c.majoreesPayees - c.majoreesRecup);
      if(resteN > 0 || resteM > 0){
        const r = [];
        if(resteN > 0) r.push(enHeures(resteN) + ' normales');
        if(resteM > 0) r.push(enHeures(resteM) + ' à 25%');
        bouts.push(r.join(' et ') + ' reportées sur le mois suivant');
      }
      if(resteN < 0 || resteM < 0){
        bouts.push('il reste ' + enHeures(Math.abs(resteN) + Math.abs(resteM)) +
                   ' à rattraper');
      }
    }

    abs.forEach(a => {
      const ty = TYPES_ABSENCE.find(x => x.cle === a.type);
      bouts.push((ty ? ty.court : 'Absence') + ' ' + periodeTexte(a));
      if(a.remarque) bouts.push(a.remarque);
    });

    if(t.report){
      bouts.push('il reste ' + enHeures(t.report) + ' à rattraper');
    }

    const croises = chevauchements(abs);
    if(croises) bouts.push(croises);

    lignes.push('Pour ' + s.nom + ' : ' + bouts.join('. ') + '.');
  });

  lignes.push('', 'En vous remerciant par avance,', 'Cordialement,');
  return lignes.join('\n');
}

function chevauchements(abs){
  for(let i = 0; i < abs.length; i++){
    for(let j = i + 1; j < abs.length; j++){
      const a = abs[i], b = abs[j];
      if(a.du <= (b.au || '9999-12-31') && b.du <= (a.au || '9999-12-31')){
        return 'Attention, chevauchement entre ces absences : ' +
               'je vous laisse voir comment cela se traite';
      }
    }
  }
  return '';
}

function moisEnToutesLettres(mois){
  if(!mois) return '';
  const [an, m] = mois.split('-').map(Number);
  const noms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
                'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return (noms[m - 1] || '') + ' ' + an;
}


function ouvrirMessagePaie(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(600px, 95vw);max-height:88vh;overflow-y:auto;';

  boite.innerHTML = '<h3>✉️ Message pour la paie</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.5;">' +
      'Relis avant d\'envoyer : ce message rassemble ce qui a été saisi, ' +
      'il ne remplace pas ton contrôle.</div>';

  const z = document.createElement('textarea');
  z.rows = 16;
  z.value = composerMessagePaie();
  z.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:13px;' +
    'line-height:1.6;font-family:inherit;resize:vertical;margin-bottom:10px;';
  boite.appendChild(z);

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Fermer';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  const bCop = document.createElement('button');
  bCop.className = 'btn btn-primary';
  bCop.textContent = '📋 Copier';
  bCop.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(z.value);
      showToast('Message copié ✅');
    }catch(e){
      z.focus(); z.select();
      showToast('Sélectionné : copie-le avec Ctrl+C');
    }
  });
  r.appendChild(bCop);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-paie.js'] = true;
