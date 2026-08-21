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
  { cle:'ss',     nom:'📄 Sans solde',         court:'Sans solde' },
  { cle:'autre',  nom:'📝 Autre absence',      court:'Absence' }
];

/* Les heures se comptent au quart */
function arrondiQuart(h){ return Math.round((h || 0) * 4) / 4; }

function enHeures(h){
  const n = arrondiQuart(h);
  return String(n).replace('.', ',') + 'h';
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
    rattachements = (d && d.rattachements) || {};
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';

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
  absencesPaie.filter(a => a.idSalarie === idSalarie && a.du &&
                           (a.type === 'cp' || a.type === 'ferie'))
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
      dateCourte(l) + ' au ' + String(f.getDate()).padStart(2, '0') + '/' +
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
      : (a.type === 'ferie')
      ? joursTravaillesEntre(a.du, a.au || a.du, s.joursSemaine)
      : joursEntre(a.du, a.au || todayLocal());

    /* Un CP ne retire pas le même nombre de jours au dû qu'au solde */
    const auDu = (a.type === 'cp' || a.type === 'ferie')
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
      dateCourte(l) + '</th>').join('') +
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
      const td = document.createElement('td');
      td.style.cssText = 'padding:3px;border-left:1px solid var(--line);' +
        'text-align:center;';

      const ch = document.createElement('input');
      ch.type = 'number';
      ch.step = '0.25';
      ch.inputMode = 'decimal';
      ch.value = (w && w.heures) ? w.heures : '';
      ch.placeholder = '·';
      ch.style.cssText = 'width:58px;margin:0;padding:5px 4px;font-size:13px;' +
        'text-align:center;background:var(--navy);border:1px solid transparent;' +
        'font-variant-numeric:tabular-nums;';

      /* Ce qu'on en déduit, en info-bulle */
      const majTitre = () => {
        const j = (w && w.joursAbsents) ||
                  joursAbsentsDeduits(s.id, l, s.joursSemaine);
        const h = parseFloat(ch.value) || 0;
        if(!h && !j){ ch.title = 'Heures de la semaine'; return; }
        const r = repartirSemaine(h, j, s.baseHebdo, s.heuresJour);
        ch.title = h + 'h faites' + (j ? ' · ' + j + ' j absent' : '') +
          ' · dû ' + r.dues + 'h → ' + r.normal + ' normal · ' + r.majore + ' à 25%';
      };
      majTitre();

      /* On enregistre à la sortie du champ, pas à chaque frappe */
      ch.addEventListener('change', async () => {
        const h = parseFloat(ch.value) || 0;
        const j = (w && w.joursAbsents !== undefined && w.joursAbsents !== null)
                    ? w.joursAbsents
                    : joursAbsentsDeduits(s.id, l, s.joursSemaine);
        ch.style.borderColor = 'var(--orange)';
        try{
          await appelPrep({
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
          afficherPaie();
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

      if(!jAbs && (!w || !w.heures)){
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

function dateCourte(iso){
  if(!iso) return '';
  const p = String(iso).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] : iso;
}

function periodeTexte(a){
  if(a.au) return 'du ' + dateCourte(a.du) + ' au ' + dateCourte(a.au);
  return 'à compter du ' + dateCourte(a.du);
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
      'Semaine du ' + dateCourte(lundi) + ' au ' +
      String(fin.getDate()).padStart(2, '0') + '/' +
      String(fin.getMonth() + 1).padStart(2, '0') + '</div>' +

    '<div class="duo">' +
      '<div><label for="swHeures">Heures faites</label>' +
        '<input type="number" id="swHeures" step="0.25" inputmode="decimal" ' +
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
          '<input type="number" id="swNormal" step="0.25" inputmode="decimal"></div>' +
        '<div><label for="swMajore">Majoré 25%</label>' +
          '<input type="number" id="swMajore" step="0.25" inputmode="decimal"></div>' +
      '</div>' +
    '</details>' +

    '<label for="swRem">Remarque</label>' +
    '<input type="text" id="swRem" placeholder="Facultatif">';

  boite.querySelector('#swAbs').value = w
    ? (w.joursAbsents !== null && w.joursAbsents !== undefined ? w.joursAbsents : jDeduits)
    : jDeduits;

  if(w){
    boite.querySelector('#swHeures').value = w.heures || '';
    if(w.normalForce !== null) boite.querySelector('#swNormal').value = w.normalForce;
    if(w.majoreForce !== null) boite.querySelector('#swMajore').value = w.majoreForce;
    boite.querySelector('#swRem').value = w.remarque || '';
  }

  const zAp = boite.querySelector('#swApercu');
  const majApercu = () => {
    const h = parseFloat(boite.querySelector('#swHeures').value) || 0;
    const j = parseInt(boite.querySelector('#swAbs').value, 10) || 0;
    const nF = boite.querySelector('#swNormal').value;
    const mF = boite.querySelector('#swMajore').value;

    if(nF !== '' || mF !== ''){
      zAp.innerHTML = '<span style="color:var(--warn-text);">✍️ Corrigé à la main : ' +
        '</span>Normal <strong>' + enHeures(parseFloat(nF) || 0) + '</strong> · ' +
        '25% <strong>' + enHeures(parseFloat(mF) || 0) + '</strong>';
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
        heures: boite.querySelector('#swHeures').value || 0,
        joursAbsents: boite.querySelector('#swAbs').value || 0,
        normalForce: boite.querySelector('#swNormal').value,
        majoreForce: boite.querySelector('#swMajore').value,
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
        '<input type="number" id="slBase" step="0.25" value="35"></div>' +
      '<div><label for="slJours">Jours par semaine</label>' +
        '<input type="number" id="slJours" step="1" value="4"></div>' +
    '</div>' +
    '<div id="slDeduit" style="font-size:12px;color:var(--muted);margin:-6px 0 12px;' +
      'line-height:1.5;"></div>' +

    '<div class="duo">' +
      '<div><label for="slReport">Report en heures</label>' +
        '<input type="number" id="slReport" step="0.25" inputmode="decimal" ' +
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
    boite.querySelector('#slBase').value = s.baseHebdo || 35;
    boite.querySelector('#slJours').value = s.joursSemaine || 4;
    boite.querySelector('#slReport').value = s.report || '';
    boite.querySelector('#slReportMois').value = s.reportMois || '';
    boite.querySelector('#slActif').checked = s.actif;
    boite.querySelector('#slRem').value = s.remarque || '';
  }

  const zd = boite.querySelector('#slDeduit');
  const majDeduit = () => {
    const b = parseFloat(boite.querySelector('#slBase').value) || 35;
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

    const base = parseFloat(boite.querySelector('#slBase').value) || 35;
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
        report: boite.querySelector('#slReport').value || 0,
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
        '<input type="number" id="gzMontant" step="0.01" inputmode="decimal" ' +
          'placeholder="€"></div>' +
    '</div>' +
    '<div class="duo">' +
      '<div><label for="gzVeh">Véhicule</label>' +
        '<input type="text" id="gzVeh" placeholder="Ex : A3 4"></div>' +
      '<div><label for="gzLitres">Litres</label>' +
        '<input type="number" id="gzLitres" step="0.01" inputmode="decimal" ' +
          'placeholder="Facultatif"></div>' +
    '</div>' +
    '<label for="gzRem">Remarque</label>' +
    '<input type="text" id="gzRem" placeholder="Facultatif">';

  boite.querySelector('#gzDate').value = g ? (g.date || todayLocal()) : todayLocal();
  if(g){
    boite.querySelector('#gzSal').value = g.idSalarie;
    boite.querySelector('#gzMontant').value = g.montant || '';
    boite.querySelector('#gzVeh').value = g.vehicule || '';
    boite.querySelector('#gzLitres').value = g.litres || '';
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
    const m = parseFloat(boite.querySelector('#gzMontant').value);
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
        litres: boite.querySelector('#gzLitres').value || 0,
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
        'font-size:12px;">' + dateCourte(x.date) + '</span>' +
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
  const l = ['Récapitulatif du ' + dateCourte(du) + ' au ' + dateCourte(au), ''];
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

/* ============================================================
   LE MESSAGE
   ============================================================ */

function composerMessagePaie(){
  const lignes = ['Bonjour,', ''];
  const moisTexte = moisEnToutesLettres(moisPaie);
  if(moisTexte) lignes.push('Éléments variables pour ' + moisTexte + ' :', '');

  salariesPaie.filter(s => s.actif).forEach(s => {
    const t = totalMois(s);
    const abs = absencesDuMois(s.id);

    /* Un salarié sans rien à signaler n'encombre pas le message */
    if(!t.normales && !t.majorees && !t.report && !abs.length) return;

    const bouts = [];
    if(t.majorees) bouts.push('Heures supplémentaires à 25% : ' + enHeures(t.majorees));
    if(t.normales) bouts.push('Heures supplémentaires normales : ' + enHeures(t.normales));

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
