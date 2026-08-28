/* Déployé le 28/08/2026 à 11:32 — v643 */
/* ============================================================
   ec-proccorriger.js
   Les procédures que les élèves envoient sur Messenger.

   Le bureau dépose ce qui arrive : le nom, son Messenger, une
   capture d'écran collée. Celle qui corrige les voit s'accumuler
   sur une pastille, et les fait disparaître au fur et à mesure.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let procACorriger = [];
let recitations = [];
let demandesProc = [];
let reglagesProc = {};
/* Les procédures existantes, avec leur boîte : l'écran des réglages
   n'offre que les catégories réellement présentes. Une liste écrite
   en dur se serait périmée dès la première procédure ajoutée. */
let proceduresConnues = [];

/* Ce qui reste à corriger, pour la pastille */
function nbProcACorriger(){
  return procACorriger.filter(x => !x.corrigeLe).length +
         recitations.filter(x => x.etat !== 'valide').length;
}

async function afficherProcCorriger(){
  const zone = $('procCorrigerZone');
  if(!zone) return;

  zone.innerHTML = htmlAttente('Lecture des procédures…');
  try{
    const [d, r, dm, rg, mo] = await Promise.all([
      appelPrep({ action: 'procCorrigerList' }),
      appelPrep({ action: 'recitationsList' }).catch(() => null),
      appelPrep({ action: 'demandesList' }).catch(() => null),
      appelPrep({ action: 'reglagesList' }).catch(() => null),
      appelPrep({ action: 'modeleList' }).catch(() => null)
    ]);
    procACorriger = (d && d.fiches) || [];
    recitations = (r && r.recitations) || [];
    demandesProc = (dm && dm.demandes) || [];
    reglagesProc = (rg && rg.reglages) || {};
    proceduresConnues = ((mo && mo.modeles) || [])
      .filter(x => x.usage === 'procedure');
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';
  majPastilleProc();

  zone.appendChild(blocInterrupteur());

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;';

  [['📌 Demander', () => ouvrirDemande(null)],
   ['➕ Reçue', () => ouvrirFicheProc(null)],
   ['🔑 Codes', () => ouvrirCodesEleves()]].forEach(([nom, faire]) => {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'flex:1;padding:12px;font-size:13px;margin:0;';
    b.textContent = nom;
    b.addEventListener('click', faire);
    r.appendChild(b);
  });
  zone.appendChild(r);

  /* Les récitations envoyées depuis l'espace élève, en premier :
     l'élève attend, et la correction est déjà rédigée. */
  const enAttente = recitations.filter(x => x.etat !== 'valide');
  if(enAttente.length){
    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
      'margin-bottom:8px;';
    t.textContent = '🎙️ ' + enAttente.length + ' récitation(s) à valider';
    zone.appendChild(t);
    enAttente.forEach(r => zone.appendChild(ligneRecitation(r)));
  }

  /* Toutes les demandes en attente, d'où qu'elles viennent */
  const bloc = blocDemandesEnCours();
  if(bloc) zone.appendChild(bloc);

  const dejaVues = recitations.filter(x => x.etat === 'valide');

  const attente = procACorriger.filter(x => !x.corrigeLe);
  const faites = procACorriger.filter(x => x.corrigeLe);

  /* Rien de déposé à la main, et rien venu de l'espace élève :
     l'écran est vraiment vide. Sortir plus tôt masquait aussi le
     tableau des corrections envoyées. */
  if(!procACorriger.length && !recitations.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucune procédure en attente.<br>' +
      '<span style="font-size:12px;">Dépose ici ce que les élèves ' +
      'envoient sur Messenger.</span>';
    zone.appendChild(v);
    return;
  }

  if(attente.length){
    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
      'margin-bottom:8px;';
    t.textContent = '📥 ' + attente.length + ' à corriger';
    zone.appendChild(t);
    attente.forEach(x => zone.appendChild(ligneProc(x)));
  }

  /* Ce qui est parti aux élèves, avec de quoi s'y retrouver */
  const envoyees = blocEnvoyees();
  if(envoyees) zone.appendChild(envoyees);

  /* Les corrigées, repliées : on y revient rarement */
  if(faites.length){
    const d = document.createElement('details');
    d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
      'padding:10px 12px;margin-top:14px;';
    d.innerHTML = '<summary style="cursor:pointer;font-size:13px;color:var(--muted);">' +
      '✅ ' + faites.length + ' déjà corrigée(s)</summary>';

    const z = document.createElement('div');
    z.style.marginTop = '10px';
    faites.forEach(x => z.appendChild(ligneProc(x)));
    d.appendChild(z);
    zone.appendChild(d);
  }
}


/* Une procédure dans la liste */
function ligneProc(x){
  const l = document.createElement('div');
  l.style.cssText = 'display:flex;gap:10px;align-items:center;' +
    'border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
    'margin-bottom:6px;' + (x.corrigeLe ? 'opacity:.55;' : '');

  const ap = document.createElement('div');
  ap.style.cssText = 'width:38px;height:38px;flex-shrink:0;border-radius:8px;' +
    'background:var(--navy);display:flex;align-items:center;justify-content:center;' +
    'font-size:19px;';
  ap.textContent = x.aUneCapture ? '🖼️' : '💬';
  l.appendChild(ap);

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:14px;line-height:1.4;cursor:pointer;';
  t.innerHTML =
    '<strong>' + (x.eleve || 'Sans nom').replace(/</g, '&lt;') + '</strong>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      'reçu le ' + (x.recuLe || '?').replace(/</g, '&lt;') +
      (x.par ? ' · ' + x.par.replace(/</g, '&lt;') : '') +
      (x.corrigeLe ? '<br><span style="color:var(--accent-text);">✅ corrigé le ' +
        x.corrigeLe.replace(/</g, '&lt;') +
        (x.corrigePar ? ' par ' + x.corrigePar.replace(/</g, '&lt;') : '') +
        '</span>' : '') +
    '</div>';
  t.addEventListener('click', () => ouvrirFicheProc(x));
  l.appendChild(t);

  /* Corriger, ou revenir en arrière */
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-secondary';
  bOk.style.cssText = 'width:auto;padding:8px 11px;font-size:14px;margin:0;flex-shrink:0;';
  bOk.textContent = x.corrigeLe ? '↩️' : '✅';
  bOk.title = x.corrigeLe ? 'Remettre à corriger' : 'Marquer comme corrigé';
  bOk.addEventListener('click', async ev => {
    ev.stopPropagation();
    bOk.disabled = true;
    try{
      await appelPrep({ action: 'procCorrigerSet', id: x.id,
                        corrige: x.corrigeLe ? '' : 'oui',
                        par: ACCES.moniteur || '' });
      showToast(x.corrigeLe ? 'Remise à corriger' : 'Corrigée ✅');
      afficherProcCorriger();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
    }
  });
  l.appendChild(bOk);

  return l;
}







/* ============================================================
   LES CORRECTIONS ENVOYÉES

   Un tableau de ce qui est parti, filtrable par moniteur et par
   période. Chaque ligne peut être retirée.
   ============================================================ */

let filtreMoniteurProc = '';
let filtreDuProc = '';
let filtreAuProc = '';
let filtreEleveProc = '';

function blocEnvoyees(){
  const validees = recitations.filter(x => x.etat === 'valide');
  if(!validees.length) return null;

  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:10px 12px;margin:14px 0 8px;';
  d.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:700;' +
    'color:var(--accent-text);">✅ ' + validees.length +
    ' correction(s) envoyée(s)</summary>';

  const z = document.createElement('div');
  z.style.marginTop = '10px';

  /* Les filtres */
  const chEleve = document.createElement('input');
  chEleve.type = 'search';
  chEleve.id = 'filtreEleveProc';
  chEleve.placeholder = '🔍 Chercher un élève…';
  chEleve.value = filtreEleveProc;
  chEleve.style.cssText = 'margin-bottom:8px;font-size:14px;';
  z.appendChild(chEleve);

  const f = document.createElement('div');
  f.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;';

  const moniteurs = [...new Set(validees.map(x => x.validePar).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), 'fr'));

  const selM = document.createElement('select');
  selM.style.cssText = 'flex:1;min-width:130px;margin:0;padding:8px 10px;font-size:13px;';
  selM.innerHTML = '<option value="">Tous les moniteurs</option>' +
    moniteurs.map(m => '<option value="' + String(m).replace(/"/g, '&quot;') + '"' +
      (m === filtreMoniteurProc ? ' selected' : '') + '>' +
      String(m).replace(/</g, '&lt;') + '</option>').join('');
  f.appendChild(selM);

  const chDu = document.createElement('input');
  chDu.type = 'date';
  chDu.value = filtreDuProc;
  chDu.title = 'À partir du';
  chDu.style.cssText = 'flex:1;min-width:130px;margin:0;padding:8px 10px;font-size:13px;';
  f.appendChild(chDu);

  const chAu = document.createElement('input');
  chAu.type = 'date';
  chAu.value = filtreAuProc;
  chAu.title = "Jusqu'au";
  chAu.style.cssText = 'flex:1;min-width:130px;margin:0;padding:8px 10px;font-size:13px;';
  f.appendChild(chAu);

  z.appendChild(f);

  const zTable = document.createElement('div');
  z.appendChild(zTable);

  const dessiner = () => {
    filtreMoniteurProc = selM.value;
    filtreDuProc = chDu.value;
    filtreAuProc = chAu.value;
    filtreEleveProc = chEleve.value;
    zTable.innerHTML = '';
    zTable.appendChild(tableauEnvoyees(validees));
  };

  [selM, chDu, chAu].forEach(x => x.addEventListener('change', dessiner));
  chEleve.addEventListener('input', dessiner);
  dessiner();

  d.appendChild(z);
  return d;
}

/* La date d'envoi, ramenée au format des comparaisons */
function isoDeRecitation(x){
  /* Le classeur écrit « 21/08/2026 10:14 » */
  const m = String(x.envoyeLe || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? (m[3] + '-' + m[2] + '-' + m[1]) : '';
}

function tableauEnvoyees(validees){
  /* Le nom se cherche sans accent ni casse, comme partout ailleurs */
  const cherche = normaliserMot(String(filtreEleveProc || '').trim());

  const vues = validees.filter(x => {
    if(cherche && normaliserMot(x.eleve || '').indexOf(cherche) === -1) return false;
    if(filtreMoniteurProc && x.validePar !== filtreMoniteurProc) return false;
    const iso = isoDeRecitation(x);
    if(filtreDuProc && iso && iso < filtreDuProc) return false;
    if(filtreAuProc && iso && iso > filtreAuProc) return false;
    return true;
  });

  const zone = document.createElement('div');

  if(!vues.length){
    zone.innerHTML = '<div class="empty">Aucune correction sur cette période.</div>';
    return zone;
  }

  const compte = document.createElement('div');
  compte.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:8px;';
  compte.textContent = vues.length + ' sur ' + validees.length;
  zone.appendChild(compte);

  vues.forEach(x => {
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:9px;align-items:center;padding:8px 0;' +
      'border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;';

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;line-height:1.45;cursor:pointer;';
    t.innerHTML = '<strong>' + (x.eleve || '').replace(/</g, '&lt;') + '</strong> — ' +
      (x.procedure || '').replace(/</g, '&lt;') +
      '<div style="font-size:11px;color:var(--muted);">' +
        (x.envoyeLe || '').replace(/</g, '&lt;') +
        (x.validePar ? ' · corrigée par ' + x.validePar.replace(/</g, '&lt;') : '') +
      '</div>';
    t.addEventListener('click', () => ouvrirRecitation(x));
    l.appendChild(t);

    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'width:auto;padding:7px 9px;font-size:13px;margin:0;' +
      'flex-shrink:0;color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.title = 'Retirer cette correction';
    bSup.addEventListener('click', async ev => {
      ev.stopPropagation();
      if(!await confirmer('Retirer la correction de ' + x.eleve + ' ?\n\n' +
          'Elle disparaîtra aussi de son espace.')) return;
      try{
        await appelPrep({ action: 'recitationDelete', id: x.id });
        showToast('Retirée ✅');
        afficherProcCorriger();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    l.appendChild(bSup);

    zone.appendChild(l);
  });

  return zone;
}


/* L'interrupteur : qui peut demander une récitation */
function blocInterrupteur(){
  const d = interrupteur({
    cle: 'recitationsMoniteurs',
    ouvert: reglagesProc.recitationsMoniteurs === 'oui',
    titre: 'Demande en fin de cours',
    quandOuvert: 'Les moniteurs peuvent demander des récitations sous ' +
                 'le bilan, et le message part à l\'élève.',
    quandFerme: 'Seul le bureau demande des récitations. Le tiroir 📌 ' +
                'reste caché aux moniteurs.',
    confirmation: 'Activer la demande en fin de cours ?\n\n' +
                  'Les moniteurs pourront demander des récitations, et ' +
                  'le message partira aux élèves dans leur bilan.'
  });

  /* Les réglages, rangés : on y touche rarement, et ils
     encombraient le haut de l'écran. */
  const tiroir = document.createElement('details');
  tiroir.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:10px 12px;margin-bottom:12px;';

  /* Ce qui est ouvert se voit sans déplier */
  const ouverts = [];
  if(reglagesProc.recitationsMoniteurs === 'oui') ouverts.push('moniteurs');
  /* Quelles catégories, pas seulement « IA » : le bureau doit voir
     sans déplier que la correction ne tourne que sur la remorque. */
  const catsIA = categoriesIAActives();
  if(catsIA.length){
    ouverts.push('IA : ' + catsIA.map(c => CATEGORIES_PROC[c].court).join(' · '));
  }
  if(reglagesProc.envoiAutoProcedures === 'oui') ouverts.push('⚠️ envoi auto');

  tiroir.innerHTML = '<summary style="cursor:pointer;font-size:13px;' +
    'font-weight:700;color:var(--accent-text);">⚙️ Réglages et alertes' +
    (ouverts.length
      ? '<span style="font-weight:400;font-size:11px;color:var(--muted);"> — ' +
        ouverts.join(' · ') + '</span>'
      : '') +
    '</summary>';

  const dedans = document.createElement('div');
  dedans.style.marginTop = '10px';

  const enveloppe = document.createElement('div');
  enveloppe.appendChild(d);

  enveloppe.appendChild(blocIAParCategorie());

  /* L'envoi sans relecture : c'est le garde-fou du dispositif, il
     ne s'ouvre pas d'un simple clic. */
  if(ACCES.role === 'admin'){
    enveloppe.appendChild(interrupteur({
      cle: 'envoiAutoProcedures',
      ouvert: reglagesProc.envoiAutoProcedures === 'oui',
      titre: '⚠️ Envoi direct à l\'élève, sans relecture',
      /* L'envoi auto suit la correction auto : il ne peut partir que
         là où l'IA a corrigé. Le dire, sinon on croit qu'il s'applique
         à toutes les récitations. */
      quandOuvert: 'La correction de l\'IA part seule, sur les ' +
                   'catégories qu\'elle corrige. Aucun moniteur ne la ' +
                   'lit avant l\'élève.',
      quandFerme: 'Un moniteur corrige, relit et valide. C\'est lui qui ' +
                  'décide de ce que l\'élève reçoit.',
      confirmation: 'Laisser l\'IA envoyer seule ?\n\n' +
                    'L\'élève recevra directement ce qu\'elle écrit, ' +
                    'sans qu\'aucun moniteur ne l\'ait lu.',
      danger: true,
      /* Sans correction automatique, il n'y a rien à envoyer */
      exige: 'iaAutoProcedures'
    }));
  }

  enveloppe.appendChild(blocMailNotification());

  /* Le dernier bloc n'a pas besoin de marge : le tiroir la porte */
  const der = enveloppe.lastElementChild;
  if(der) der.style.marginBottom = '0';

  dedans.appendChild(enveloppe);
  tiroir.appendChild(dedans);
  return tiroir;
}


/* Un interrupteur de réglage.

   Le titre nomme la fonction et ne bouge pas ; en dessous, l'état
   en clair. « Ouvrir » ne disait pas ce qui allait se passer :
   un interrupteur, lui, se comprend sans le lire. */
/* Un interrupteur de réglage, dessiné plutôt qu'écrit.

   Deux réglages sur trois valent « oui » quand ils sont actifs et
   rien du tout sinon. Certains, au contraire, doivent être actifs
   tant qu'on ne les a pas coupés : « o.valeurs » permet de dire ce
   qu'on écrit dans chaque sens, et « o.apres » quel écran redessiner
   — sans quoi cet interrupteur ne servirait qu'ici. */
function interrupteur(o){
  const danger = o.danger && o.ouvert;
  const valActif   = (o.valeurs && o.valeurs.actif   !== undefined) ? o.valeurs.actif   : 'oui';
  const valInactif = (o.valeurs && o.valeurs.inactif !== undefined) ? o.valeurs.inactif : '';
  const apres = o.apres || afficherProcCorriger;

  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid ' +
    (o.ouvert ? (o.danger ? 'var(--red)' : 'var(--orange)') : 'var(--line)') +
    ';border-radius:12px;padding:12px;margin-bottom:12px;' +
    'display:flex;gap:12px;align-items:center;';

  d.innerHTML = '<span style="flex:1;min-width:0;font-size:14px;line-height:1.5;">' +
    '<strong>' + o.titre + '</strong>' +
    '<div style="font-size:12px;margin-top:3px;color:' +
      (o.ouvert ? (danger ? 'var(--red)' : 'var(--accent-text)')
                : 'var(--muted)') + ';">' +
      (o.ouvert ? '● Activé' : '○ Désactivé') + '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:3px;">' +
      (o.ouvert ? o.quandOuvert : o.quandFerme) + '</div></span>';

  /* L'interrupteur lui-même, dessiné plutôt qu'écrit */
  const b = document.createElement('button');
  b.setAttribute('role', 'switch');
  b.setAttribute('aria-checked', o.ouvert ? 'true' : 'false');
  b.title = o.ouvert ? 'Désactiver' : 'Activer';
  b.style.cssText = 'width:56px;height:32px;flex-shrink:0;padding:0;margin:0;' +
    'border-radius:16px;cursor:pointer;position:relative;' +
    'border:1px solid ' + (o.ouvert
      ? (o.danger ? 'var(--red)' : 'var(--orange)') : 'var(--line)') + ';' +
    'background:' + (o.ouvert
      ? (o.danger ? 'var(--red)' : 'var(--orange)') : 'transparent') + ';' +
    'transition:background .15s ease;';

  const bille = document.createElement('span');
  bille.style.cssText = 'position:absolute;top:3px;width:24px;height:24px;' +
    'border-radius:50%;transition:left .15s ease;' +
    'left:' + (o.ouvert ? '28px' : '3px') + ';' +
    'background:' + (o.ouvert
      ? (o.danger ? '#fff' : 'var(--navy-deep)') : 'var(--muted)') + ';';
  b.appendChild(bille);

  b.addEventListener('click', async () => {
    /* Certains réglages en supposent un autre. La correction
       automatique n'est plus un oui/non mais une liste de
       catégories : ce qui compte, c'est qu'il y en ait au moins une. */
    if(!o.ouvert && o.exige === 'iaAutoProcedures' && !categoriesIAActives().length){
      showToast('Coche d\'abord une catégorie à corriger automatiquement.');
      return;
    }
    if(!o.ouvert && o.confirmation && !await confirmer(o.confirmation)) return;

    b.disabled = true;
    try{
      await appelPrep({
        action: 'reglageSet', cle: o.cle,
        valeur: o.ouvert ? valInactif : valActif,
        par: ACCES.moniteur || ''
      });
      showToast(o.ouvert ? 'Désactivé ✅' : 'Activé ✅');
      apres();
    }catch(e){
      showToast('Impossible : ' + e.message);
      b.disabled = false;
    }
  });
  d.appendChild(b);

  return d;
}


/* ============================================================
   CORRECTION AUTOMATIQUE, PAR CATÉGORIE DE PROCÉDURE

   Le bureau veut souvent l'IA sur un domaine et pas sur les
   autres : la remorque se récite mot pour mot, le reste se
   discute. Un interrupteur unique obligeait à choisir entre tout
   et rien.

   Les catégories sont celles de la colonne « boîte » de la feuille
   Modeles. La règle de rangement est la même que côté script —
   toute divergence rangerait une procédure ici et l'offrirait
   ailleurs.
   ============================================================ */
const CATEGORIES_PROC = {
  BE:       { court: 'BE',       long: '🚚 Remorque BE' },
  BV:       { court: 'BV',       long: '🕹️ Boîte manuelle BV' },
  BEA:      { court: 'BEA',      long: '⚙️ Boîte automatique BEA' },
  communes: { court: 'communes', long: '👥 Communes à tous' }
};
const ORDRE_CATEGORIES = ['BE', 'BV', 'BEA', 'communes'];

/* À quelle(s) catégorie(s) appartient une procédure, d'après sa
   boîte. Même règle que categoriesDeBoite() dans apps-script.js. */
function categoriesDeBoiteProc(boite){
  const bm = String(boite || '').toUpperCase();
  /* « BE » en mot entier : « BEA » le contient */
  if(/(^|[^A-Z])BE([^A-Z]|$)/.test(bm)) return ['BE'];
  if(!bm.trim()) return ['communes'];
  const out = [];
  if(bm.indexOf('BEA') !== -1) out.push('BEA');
  if(bm.indexOf('BV') !== -1) out.push('BV');
  return out;
}

/* Les catégories corrigées d'office. « oui » est la forme d'avant,
   quand le réglage était un simple interrupteur : elle vaut
   toutes les catégories. */
function categoriesIAActives(){
  const brut = String(reglagesProc.iaAutoProcedures || '').trim();
  if(!brut) return [];
  if(brut.toLowerCase() === 'oui') return ORDRE_CATEGORIES.slice();
  return brut.split(',').map(x => x.trim())
             .filter(x => CATEGORIES_PROC[x]);
}

function blocIAParCategorie(){
  const actives = categoriesIAActives();

  /* Les catégories réellement utilisées par des procédures. On y
     ajoute celles déjà cochées même si plus rien ne les utilise :
     sinon le bureau ne pourrait plus les décocher. */
  const presentes = {};
  proceduresConnues.forEach(p => {
    categoriesDeBoiteProc(p.boite).forEach(c => { presentes[c] = true; });
  });
  actives.forEach(c => { presentes[c] = true; });

  /* Aucune procédure lue — hors ligne, ou classeur muet : on
     propose les quatre catégories. Se limiter à celles déjà cochées
     laisserait croire que les autres n'existent pas, alors qu'on
     n'a simplement pas pu lire la liste. */
  const liste = proceduresConnues.length
    ? ORDRE_CATEGORIES.filter(c => presentes[c])
    : ORDRE_CATEGORIES.slice();

  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid ' +
    (actives.length ? 'var(--orange)' : 'var(--line)') + ';' +
    'border-radius:12px;padding:12px;margin-bottom:12px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:14px;line-height:1.5;';
  t.innerHTML = '<strong>Correction automatique par l\'IA</strong>' +
    '<div style="font-size:12px;margin-top:3px;color:' +
      (actives.length ? 'var(--accent-text)' : 'var(--muted)') + ';">' +
      (actives.length
        ? '● Activée pour : ' +
          actives.map(c => CATEGORIES_PROC[c].court).join(' · ')
        : '○ Désactivée') + '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:3px;">' +
      (actives.length
        ? 'Une récitation de ces catégories est corrigée dès son ' +
          'arrivée, la proposition t\'attend dans la fiche. Les autres ' +
          'attendent le bouton ✨.'
        : 'Rien ne se corrige tout seul. Le bouton ✨ dans la fiche ' +
          'lance l\'IA quand tu le veux.') + '</div>';
  d.appendChild(t);

  const zone = document.createElement('div');
  zone.style.cssText = 'margin-top:10px;border-top:1px solid var(--line);padding-top:8px;';

  liste.forEach(cle => {
    /* Combien de procédures dans cette catégorie : le bureau coche
       en connaissance de cause plutôt qu'à l'aveugle. */
    const combien = proceduresConnues.filter(
      p => categoriesDeBoiteProc(p.boite).indexOf(cle) !== -1).length;

    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:9px;padding:5px 0;' +
      'font-size:14px;text-transform:none;margin:0;font-weight:400;' +
      'cursor:pointer;color:var(--cream);';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = actives.indexOf(cle) !== -1;
    cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;';
    l.appendChild(cb);

    const n = document.createElement('span');
    n.style.cssText = 'flex:1;min-width:0;';
    n.textContent = CATEGORIES_PROC[cle].long;
    l.appendChild(n);

    const c = document.createElement('span');
    c.style.cssText = 'flex-shrink:0;font-size:11px;color:var(--muted);';
    c.textContent = combien ? combien + ' procédure' + (combien > 1 ? 's' : '')
                            : 'aucune';
    l.appendChild(c);

    cb.addEventListener('change', async () => {
      /* On repart de l'état des cases, pas d'un calcul sur la valeur
         précédente : deux clics rapides ne peuvent pas se croiser. */
      const voulues = ORDRE_CATEGORIES.filter(k => {
        const c2 = zone.querySelector('input[data-cat="' + k + '"]');
        return c2 && c2.checked;
      });

      zone.querySelectorAll('input').forEach(x => { x.disabled = true; });
      try{
        await appelPrep({
          action: 'reglageSet', cle: 'iaAutoProcedures',
          valeur: voulues.join(','),
          par: ACCES.moniteur || ''
        });
        showToast(voulues.length
          ? 'Correction automatique : ' +
            voulues.map(k => CATEGORIES_PROC[k].court).join(' · ') + ' ✅'
          : 'Correction automatique désactivée ✅');
        afficherProcCorriger();
      }catch(e){
        showToast('Impossible : ' + e.message);
        cb.checked = !cb.checked;
        zone.querySelectorAll('input').forEach(x => { x.disabled = false; });
      }
    });

    cb.setAttribute('data-cat', cle);
    zone.appendChild(l);
  });

  d.appendChild(zone);
  return d;
}


/* Où partent les alertes de correction */
function blocMailNotification(){
  const actuelle = reglagesProc.mailNotification || 'evolutionconduites@gmail.com';

  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:12px;margin-bottom:12px;display:flex;gap:11px;align-items:center;';

  d.innerHTML = '<span style="flex:1;min-width:0;font-size:13px;line-height:1.5;">' +
    '<strong>✉️ Alertes envoyées à</strong>' +
    '<div style="font-size:12px;color:var(--accent-text);margin-top:2px;' +
      'word-break:break-all;">' + actuelle.replace(/</g, '&lt;') + '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      'Un mail part à chaque récitation reçue.</div></span>';

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;padding:10px 13px;font-size:13px;margin:0;' +
    'flex-shrink:0;';
  b.textContent = '✏️';
  b.title = 'Changer l\'adresse';
  b.addEventListener('click', () => ouvrirMailNotification(actuelle));
  d.appendChild(b);

  /* L'état des envois : un mail qui ne part pas doit se voir */
  const bE = document.createElement('button');
  bE.className = 'btn btn-secondary';
  bE.style.cssText = 'width:auto;padding:10px 13px;font-size:13px;margin:0;' +
    'flex-shrink:0;';
  bE.textContent = '🩺';
  bE.title = 'Vérifier que les mails partent';
  bE.addEventListener('click', () => ouvrirEtatMails());
  d.appendChild(bE);

  return d;
}


/* Est-ce que les mails partent ? */
async function ouvrirEtatMails(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 94vw);max-height:88vh;overflow-y:auto;';

  boite.innerHTML = '<h3>🩺 État des mails</h3>' +
    '<div id="emZone"><div class="empty">Vérification…</div></div>';

  const r = document.createElement('div');
  r.className = 'btn-row';
  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary';
  bF.textContent = 'Fermer';
  bF.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bF);
  boite.appendChild(r);

  fond.appendChild(boite);
  document.body.appendChild(fond);

  const z = boite.querySelector('#emZone');
  try{
    const d = await appelPrep({ action: 'etatMails' });
    const q = (d && d.quota);
    const echecs = (d && d.echecs) || [];

    let html = '';

    /* Les mails passent par OVH, comme les bilans : pas de quota
       Google à surveiller. */
    html += '<div style="background:rgba(182,255,14,.10);' +
      'color:var(--accent-text);padding:12px;border-radius:10px;' +
      'font-size:13px;line-height:1.6;margin-bottom:12px;">' +
      '✉️ <strong>Les mails partent de ' +
      'contact@evolutionconduites.fr</strong><br>' +
      'Par OVH, comme les bilans de cours.</div>';

    if(echecs.length){
      html += '<div style="font-size:13px;font-weight:700;' +
        'color:var(--accent-text);margin-bottom:8px;">' +
        'Derniers envois manqués</div>';
      echecs.forEach(x => {
        html += '<div style="font-size:12px;padding:7px 0;line-height:1.5;' +
          'border-bottom:1px solid rgba(255,255,255,.05);">' +
          '<strong>' + (x.quand || '').replace(/</g, '&lt;') + '</strong> · ' +
          (x.type || '').replace(/</g, '&lt;') +
          '<div style="color:var(--muted);">vers ' +
            (x.vers || '?').replace(/</g, '&lt;') + '<br>' +
            (x.motif || '').replace(/</g, '&lt;') + '</div></div>';
      });
    }else{
      html += '<div class="empty">Aucun envoi manqué.</div>';
    }

    z.innerHTML = html;
  }catch(e){
    z.innerHTML = '<div class="empty">⚠️ ' +
      e.message.replace(/</g, '&lt;') + '</div>';
  }
}

function ouvrirMailNotification(actuelle){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(440px, 94vw)';

  boite.innerHTML = '<h3>✉️ Adresse des alertes</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
      'line-height:1.5;">Un mail part à cette adresse dès qu\'un élève ' +
      'envoie une récitation, avec son texte.</div>' +
    '<label for="mnMail">Adresse</label>' +
    '<input type="email" id="mnMail" inputmode="email" autocomplete="off">';

  boite.querySelector('#mnMail').value = actuelle;

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '💾 Enregistrer';
  bOk.addEventListener('click', async () => {
    const v = boite.querySelector('#mnMail').value.trim();
    if(v && v.indexOf('@') === -1){
      showToast('Cette adresse ne ressemble pas à un mail.');
      return;
    }
    bOk.disabled = true;
    try{
      await appelPrep({
        action: 'reglageSet', cle: 'mailNotification',
        valeur: v, par: ACCES.moniteur || ''
      });
      document.body.removeChild(fond);
      showToast('Adresse enregistrée ✅');
      afficherProcCorriger();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#mnMail').focus(), 100);
}


/* Les demandes en attente, du bureau comme des moniteurs */
function blocDemandesEnCours(){
  const attente = demandesProc.filter(x => x.etat !== 'fait');
  if(!attente.length) return null;

  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:10px 12px;margin:14px 0 8px;';
  d.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:700;' +
    'color:var(--accent-text);">📌 ' + attente.length +
    ' procédure(s) demandée(s), pas encore récitée(s)</summary>';

  const z = document.createElement('div');
  z.style.marginTop = '10px';

  attente.forEach(x => {
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:8px;align-items:center;padding:7px 0;' +
      'border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;';
    l.innerHTML = '<span style="flex:1;min-width:0;line-height:1.45;">' +
      '<strong>' + (x.eleve || '').replace(/</g, '&lt;') + '</strong> — ' +
      (x.procedure || '').replace(/</g, '&lt;') +
      '<div style="font-size:11px;color:var(--muted);">' +
        'demandée le ' + (x.demandeLe || '').replace(/</g, '&lt;') +
        (x.par ? ' par ' + x.par.replace(/</g, '&lt;') : '') +
        (x.consigne ? ' · ' + x.consigne.replace(/</g, '&lt;') : '') +
      '</div></span>';

    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'width:auto;padding:7px 9px;font-size:13px;margin:0;' +
      'flex-shrink:0;color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.title = 'Retirer cette demande';
    bSup.addEventListener('click', async () => {
      try{
        await appelPrep({ action: 'demandeDelete', id: x.id });
        showToast('Retirée ✅');
        afficherProcCorriger();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    l.appendChild(bSup);
    z.appendChild(l);
  });

  d.appendChild(z);
  return d;
}




/* ============================================================
   LES LANGUES DISPONIBLES

   La liste vit dans les réglages : une ligne par langue, sous la
   forme « code|nom ». Le code est celui de la dictée du
   navigateur — c'est lui qui décide de ce que le micro entend.
   ============================================================ */

/* Quelques codes courants, pour ne pas avoir à les chercher */
const CODES_CONNUS = [
  ['en-GB', 'English — Anglais'],
  ['en-US', 'English (US) — Anglais américain'],
  ['es-ES', 'Español — Espagnol'],
  ['pt-PT', 'Português — Portugais'],
  ['pt-BR', 'Português (Brasil) — Portugais brésilien'],
  ['it-IT', 'Italiano — Italien'],
  ['de-DE', 'Deutsch — Allemand'],
  ['ar-SA', 'العربية — Arabe'],
  ['ar-MA', 'العربية (المغرب) — Arabe marocain'],
  ['ar-DZ', 'العربية (الجزائر) — Arabe algérien'],
  ['tr-TR', 'Türkçe — Turc'],
  ['uk-UA', 'Українська — Ukrainien'],
  ['ru-RU', 'Русский — Russe'],
  ['ro-RO', 'Română — Roumain'],
  ['pl-PL', 'Polski — Polonais'],
  ['sq-AL', 'Shqip — Albanais'],
  ['fa-IR', 'فارسی — Persan'],
  ['fa-AF', 'دری — Dari (Afghanistan)'],
  ['ps-AF', 'پښتو — Pachto (Afghanistan)'],
  ['ta-IN', 'தமிழ் — Tamoul'],
  ['vi-VN', 'Tiếng Việt — Vietnamien'],
  ['zh-CN', '中文 — Chinois mandarin']
];

async function ouvrirGestionLangues(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 94vw);max-height:90vh;overflow-y:auto;';

  boite.innerHTML = '<h3>🌍 Langues proposées</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
      'line-height:1.5;">Celles que tu peux ouvrir à un élève. ' +
      'Le français n\'a pas à y figurer : il est toujours disponible.</div>' +
    '<div id="glListe"></div>' +

    '<div style="border-top:1px solid var(--line);margin-top:14px;' +
      'padding-top:12px;">' +
      '<label for="glAjout">Ajouter une langue</label>' +
      '<select id="glAjout"><option value="">— choisis —</option>' +
        CODES_CONNUS.map(([code, nom]) =>
          '<option value="' + code + '">' + nom.replace(/</g, '&lt;') +
          '</option>').join('') +
        '<option value="autre">⌨️ Une autre…</option>' +
      '</select>' +
      '<div id="glLibre" style="display:none;">' +
        '<div class="duo">' +
          '<div><label for="glCode">Code</label>' +
            '<input type="text" id="glCode" placeholder="Ex : nl-NL"></div>' +
          '<div><label for="glNom">Nom affiché</label>' +
            '<input type="text" id="glNom" placeholder="Ex : Nederlands"></div>' +
        '</div>' +
        '<div style="font-size:11px;color:var(--muted);margin:-8px 0 10px;' +
          'line-height:1.5;">Le code suit la forme « langue-PAYS ». ' +
          'Sans le bon code, la dictée n\'entendra rien.</div>' +
      '</div>' +
      '<button class="btn btn-secondary" id="glAjouter" ' +
        'style="padding:11px;font-size:13px;">➕ Ajouter</button>' +
    '</div>';

  let langues = [];

  const dessiner = async () => {
    const z = boite.querySelector('#glListe');
    z.innerHTML = htmlAttente('');
    try{
      const d = await appelPrep({ action: 'languesList' });
      langues = (d && d.langues) || [];
    }catch(e){
      z.innerHTML = '<div class="empty">⚠️ ' +
        e.message.replace(/</g, '&lt;') + '</div>';
      return;
    }

    if(!langues.length){
      z.innerHTML = '<div class="empty">Aucune langue : seul le français ' +
        'est proposé aux élèves.</div>';
      return;
    }

    z.innerHTML = '';
    langues.forEach((l, i) => {
      const ligne = document.createElement('div');
      ligne.style.cssText = 'display:flex;gap:8px;align-items:center;padding:8px 0;' +
        'border-bottom:1px solid rgba(255,255,255,.05);font-size:14px;';
      ligne.innerHTML = '<span style="flex:1;min-width:0;">' +
        l.nom.replace(/</g, '&lt;') +
        '<div style="font-size:11px;color:var(--muted);">' +
          l.code.replace(/</g, '&lt;') + '</div></span>';

      const bSup = document.createElement('button');
      bSup.className = 'btn btn-secondary';
      bSup.style.cssText = 'width:auto;padding:7px 9px;font-size:13px;margin:0;' +
        'flex-shrink:0;color:var(--red);border-color:var(--red);';
      bSup.textContent = '🗑️';
      bSup.addEventListener('click', async () => {
        if(!await confirmer('Retirer ' + l.nom + ' ?\n\n' +
            'Les élèves qui l\'utilisaient repasseront au français.')) return;
        const reste = langues.filter((_, j) => j !== i);
        await sauverLangues(reste);
        dessiner();
      });
      ligne.appendChild(bSup);
      z.appendChild(ligne);
    });
  };

  const sauverLangues = async liste => {
    await appelPrep({
      action: 'reglageSet',
      cle: 'languesEleves',
      valeur: liste.map(x => x.code + '|' + x.nom).join('\n'),
      par: ACCES.moniteur || ''
    });
  };

  const selA = boite.querySelector('#glAjout');
  const zLibre = boite.querySelector('#glLibre');
  selA.addEventListener('change', () => {
    zLibre.style.display = (selA.value === 'autre') ? 'block' : 'none';
  });

  boite.querySelector('#glAjouter').addEventListener('click', async () => {
    let code = '', nom = '';

    if(selA.value === 'autre'){
      code = boite.querySelector('#glCode').value.trim();
      nom = boite.querySelector('#glNom').value.trim() || code;
    }else if(selA.value){
      code = selA.value;
      const trouve = CODES_CONNUS.find(x => x[0] === code);
      nom = trouve ? trouve[1] : code;
    }

    if(!code){ showToast('Choisis une langue.'); return; }
    if(langues.some(x => x.code === code)){
      showToast('Elle est déjà dans la liste.');
      return;
    }

    try{
      await sauverLangues(langues.concat([{ code: code, nom: nom }]));
      showToast('Ajoutée ✅');
      selA.value = '';
      zLibre.style.display = 'none';
      boite.querySelector('#glCode').value = '';
      boite.querySelector('#glNom').value = '';
      dessiner();
    }catch(e){ showToast('Impossible : ' + e.message); }
  });

  const r = document.createElement('div');
  r.className = 'btn-row';
  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary';
  bF.textContent = 'Fermer';
  bF.addEventListener('click', () => {
    document.body.removeChild(fond);
    ouvrirCodesEleves();
  });
  r.appendChild(bF);
  boite.appendChild(r);

  fond.appendChild(boite);
  document.body.appendChild(fond);
  dessiner();
}


/* Demande quelle langue ouvrir à un élève */
function choisirLangue(a, langues){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.maxWidth = 'min(430px, 94vw)';

    boite.innerHTML = '<h3>🌍 Langue de ' +
      a.eleve.replace(/</g, '&lt;') + '</h3>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
        'line-height:1.5;">Il pourra réciter dans cette langue. La correction ' +
        'te reviendra en français, et lui la recevra dans la sienne.</div>' +
      '<select id="clChoix"><option value="">🇫🇷 Français seulement</option>' +
      langues.map(l => '<option value="' + String(l.code).replace(/"/g, '&quot;') +
        '"' + (l.code === a.langue ? ' selected' : '') + '>' +
        l.nom.replace(/</g, '&lt;') + '</option>').join('') +
      '</select>';

    const r = document.createElement('div');
    r.className = 'btn-row';

    const bA = document.createElement('button');
    bA.className = 'btn btn-secondary';
    bA.textContent = 'Annuler';
    bA.addEventListener('click', () => {
      document.body.removeChild(fond);
      resolve(null);
    });
    r.appendChild(bA);

    const bO = document.createElement('button');
    bO.className = 'btn btn-primary';
    bO.textContent = '💾 Enregistrer';
    bO.addEventListener('click', () => {
      const v = boite.querySelector('#clChoix').value;
      document.body.removeChild(fond);
      resolve(v);
    });
    r.appendChild(bO);

    boite.appendChild(r);
    fond.appendChild(boite);
    document.body.appendChild(fond);
  });
}


/* ============================================================
   DEMANDER UNE PROCÉDURE

   Le moniteur désigne ce que l'élève doit réciter. La demande
   apparaît en tête de son espace, et se solde d'elle-même quand
   il l'envoie.
   ============================================================ */

async function ouvrirDemande(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 94vw);max-height:88vh;overflow-y:auto;';

  const procs = (typeof modelesTexte !== 'undefined' ? modelesTexte : [])
    .filter(m => m.usage === 'procedure')
    .sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));

  boite.innerHTML =
    '<h3>📌 Demander une procédure</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.5;">' +
      'Elle apparaîtra en tête de son espace, avec la date. ' +
      'Elle disparaîtra quand il l\'aura récitée.</div>' +

    '<label for="dmEleve">Élève</label>' +
    '<input type="text" id="dmEleve" list="listeEleves" autocomplete="off" ' +
      'placeholder="Son nom">' +

    '<label for="dmProc">Procédure</label>' +
    '<select id="dmProc">' +
      (procs.length
        ? procs.map(p => '<option value="' + String(p.id).replace(/"/g, '&quot;') +
            '">' + p.nom.replace(/</g, '&lt;') + '</option>').join('')
        : '<option value="">Aucune procédure enregistrée</option>') +
    '</select>' +

    '<label for="dmMot">Un mot pour lui (facultatif)</label>' +
    '<input type="text" id="dmMot" placeholder="Ex : soigne les vérifications">';

  if(!procs.length){
    boite.innerHTML += '<div style="font-size:12px;color:var(--warn-text);' +
      'line-height:1.5;margin-bottom:10px;">⚠️ Aucune procédure dans ' +
      'Outils → Procédures : il n\'y a rien à demander pour l\'instant.</div>';
  }

  const zListe = document.createElement('div');
  zListe.style.cssText = 'border-top:1px solid var(--line);margin-top:14px;' +
    'padding-top:12px;';
  zListe.innerHTML = htmlAttente('');
  boite.appendChild(zListe);

  const dessiner = async () => {
    try{
      const d = await appelPrep({ action: 'demandesList' });
      const liste = ((d && d.demandes) || []).filter(x => x.etat !== 'fait');

      zListe.innerHTML = '<div style="font-size:13px;font-weight:700;' +
        'color:var(--accent-text);margin-bottom:8px;">' +
        liste.length + ' demande(s) en attente</div>';

      if(!liste.length){
        zListe.innerHTML += '<div class="empty">Rien en attente.</div>';
        return;
      }

      liste.forEach(x => {
        const l = document.createElement('div');
        l.style.cssText = 'display:flex;gap:8px;align-items:center;padding:8px 0;' +
          'border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;';
        l.innerHTML = '<span style="flex:1;min-width:0;">' +
          '<strong>' + x.eleve.replace(/</g, '&lt;') + '</strong> — ' +
          x.procedure.replace(/</g, '&lt;') +
          '<div style="font-size:11px;color:var(--muted);">' +
            'demandé le ' + (x.demandeLe || '').replace(/</g, '&lt;') +
            (x.par ? ' par ' + x.par.replace(/</g, '&lt;') : '') +
          '</div></span>';

        const bSup = document.createElement('button');
        bSup.className = 'btn btn-secondary';
        bSup.style.cssText = 'width:auto;padding:7px 9px;font-size:13px;margin:0;' +
          'flex-shrink:0;color:var(--red);border-color:var(--red);';
        bSup.textContent = '🗑️';
        bSup.addEventListener('click', async () => {
          try{
            await appelPrep({ action: 'demandeDelete', id: x.id });
            showToast('Retirée ✅');
            dessiner();
          }catch(e){ showToast('Impossible : ' + e.message); }
        });
        l.appendChild(bSup);
        zListe.appendChild(l);
      });
    }catch(e){
      zListe.innerHTML = '<div class="empty">⚠️ ' +
        e.message.replace(/</g, '&lt;') + '</div>';
    }
  };

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Fermer';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '📌 Demander';
  bOk.addEventListener('click', async () => {
    const nom = boite.querySelector('#dmEleve').value.trim();
    const sel = boite.querySelector('#dmProc');
    if(!nom){ showToast('Indique l\'élève.'); return; }
    if(!sel.value){ showToast('Choisis une procédure.'); return; }

    bOk.disabled = true;
    try{
      await appelPrep({
        action: 'demandeSet',
        eleve: nom,
        procedure: sel.options[sel.selectedIndex].textContent,
        idProcedure: sel.value,
        consigne: boite.querySelector('#dmMot').value.trim(),
        par: ACCES.moniteur || ''
      });
      showToast('Demandée ✅');
      boite.querySelector('#dmEleve').value = '';
      boite.querySelector('#dmMot').value = '';
      dessiner();
    }catch(e){ showToast('Impossible : ' + e.message); }
    bOk.disabled = false;
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#dmEleve').focus(), 100);
  dessiner();
}


/* ============================================================
   CE À QUOI UN ÉLÈVE A ACCÈS EN RÉVISIONS

   Sa formation décide de l'essentiel : un élève en remorque ne
   récite que les procédures BE. Le bureau peut lui en ouvrir
   d'autres, une par une, sans passer par le répertoire.

   Additif, jamais soustractif. Ce que sa formation lui donne
   s'affiche coché et verrouillé : une procédure ajoutée demain à
   sa formation lui parvient sans que personne rouvre sa fiche, et
   une case décochée par mégarde ne peut pas le priver de ce qui
   lui revient.
   ============================================================ */
const NOMS_BOITE = {
  BE:  '🚚 Remorque — permis BE',
  BV:  '🕹️ Boîte manuelle BV',
  BEA: '⚙️ Boîte automatique BEA'
};

function blocRevisions(a, catalogue, parBoite, apresEnregistrement){
  const det = document.createElement('details');
  det.style.cssText = 'margin:0 0 6px;padding:0 0 0 2px;';

  const deSaFormation = (parBoite && parBoite[a.boite || '']) || [];
  const enPlus = (a.enPlus || []).slice();
  const total = deSaFormation.length +
    enPlus.filter(id => deSaFormation.indexOf(id) === -1).length;

  const dit = a.boite
    ? (NOMS_BOITE[a.boite] || a.boite) +
      (a.boiteSource === 'declaree' ? ' (déclarée par lui)' : '')
    : '⚠️ formation non renseignée';

  det.innerHTML = '<summary style="cursor:pointer;font-size:11px;' +
    'color:var(--muted);padding:2px 0;">📚 Révisions — ' +
    dit.replace(/</g, '&lt;') + ' · ' + total + ' procédure' +
    (total > 1 ? 's' : '') + '</summary>';

  const zone = document.createElement('div');
  zone.style.cssText = 'margin:6px 0 4px;padding:8px 10px;' +
    'border:1px solid var(--line);border-radius:10px;';

  if(!catalogue.length){
    zone.innerHTML = '<div style="font-size:12px;color:var(--muted);">' +
      'Aucune procédure enregistrée.</div>';
    det.appendChild(zone);
    return det;
  }

  if(!a.boite){
    const av = document.createElement('div');
    av.style.cssText = 'font-size:11px;color:var(--warn-text);line-height:1.4;' +
      'margin-bottom:8px;';
    av.textContent = 'Sa formation n\'est pas renseignée dans le répertoire ' +
      'des élèves : il ne reçoit que les procédures communes. Coche ' +
      'ci-dessous pour lui en ouvrir en attendant.';
    zone.appendChild(av);
  }

  catalogue.forEach(p => {
    const parFormation = deSaFormation.indexOf(p.id) !== -1;

    const lab = document.createElement('label');
    lab.style.cssText = 'display:flex;align-items:flex-start;gap:8px;' +
      'padding:3px 0;font-size:13px;text-transform:none;margin:0;' +
      'font-weight:400;line-height:1.4;' +
      'color:' + (parFormation ? 'var(--muted)' : 'var(--cream)') + ';' +
      (parFormation ? '' : 'cursor:pointer;');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'revProc';
    cb.value = p.id;
    cb.checked = parFormation || enPlus.indexOf(p.id) !== -1;
    /* Ce que sa formation donne ne se retire pas d'ici */
    cb.disabled = parFormation;
    cb.style.cssText = 'width:16px;height:16px;flex-shrink:0;margin-top:2px;' +
      (parFormation ? 'opacity:.55;' : '');
    lab.appendChild(cb);

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    t.textContent = p.nom;
    if(parFormation){
      const m = document.createElement('span');
      m.style.cssText = 'font-size:10px;color:var(--muted);display:block;';
      /* Sans formation renseignée, ce n'est pas « sa formation » qui
         la lui donne : c'est qu'elle s'adresse à tout le monde. */
      m.textContent = a.boite ? 'par sa formation' : 'commune à tous';
      t.appendChild(m);
    }
    lab.appendChild(t);

    cb.addEventListener('change', async () => {
      /* On repart de l'état des cases, jamais d'un calcul sur la
         valeur précédente : deux clics rapides ne se croisent pas.
         Seules les cases actives comptent — celles de la formation
         sont déjà acquises et n'ont rien à faire dans la colonne. */
      const voulues = Array.prototype.slice
        .call(zone.querySelectorAll('.revProc'))
        .filter(x => x.checked && !x.disabled)
        .map(x => x.value);

      zone.querySelectorAll('.revProc').forEach(x => {
        if(!x.disabled) x.dataset.gele = 'oui';
        x.disabled = true;
      });
      try{
        await appelPrep({ action: 'accesEleveSet', eleve: a.eleve,
                          enPlus: voulues });
        showToast(cb.checked ? 'Procédure ouverte ✅' : 'Procédure retirée ✅');
        if(typeof apresEnregistrement === 'function') apresEnregistrement();
      }catch(e){
        showToast('Impossible : ' + e.message);
        cb.checked = !cb.checked;
        zone.querySelectorAll('.revProc').forEach(x => {
          if(x.dataset.gele === 'oui'){ x.disabled = false; x.dataset.gele = ''; }
        });
      }
    });

    zone.appendChild(lab);
  });

  det.appendChild(zone);
  return det;
}


/* ============================================================
   LES CODES D'ACCÈS DES ÉLÈVES

   Chaque élève reçoit un code à six chiffres pour entrer dans son
   espace. Le bureau peut le changer si l'élève l'a perdu ou
   partagé.
   ============================================================ */

async function ouvrirCodesEleves(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 95vw);max-height:90vh;overflow-y:auto;';

  boite.innerHTML = '<h3>🔑 Codes du coin révisions</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.5;">' +
      'L\'élève se connecte à son coin révisions avec son nom et ce ' +
      'Il n\'y voit que ses propres envois.</div>' +

    '<label for="ceEleve">Donner un accès à</label>' +
    '<input type="text" id="ceEleve" list="listeEleves" autocomplete="off" ' +
      'placeholder="Son nom, comme dans le dossier">' +

    '<label for="ceLangue">Sa langue</label>' +
    '<div style="display:flex;gap:8px;align-items:flex-start;">' +
      '<select id="ceLangue" style="flex:1;min-width:0;margin:0;">' +
        '<option value="">🇫🇷 Français seulement</option></select>' +
      '<button type="button" class="btn btn-secondary" id="ceGererLangues" ' +
        'style="width:auto;padding:11px 13px;font-size:13px;margin:0;' +
        'flex-shrink:0;" title="Gérer les langues">⚙️</button>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;' +
      'line-height:1.5;">Ouvrir une autre langue lui permet de réciter ' +
      'dans sa langue. Chaque récitation coûte alors une traduction ' +
      'en plus — à réserver à ceux qui en ont besoin.</div>' +
    '<button class="btn btn-primary" id="ceAjouter" ' +
      'style="padding:12px;font-size:14px;">🔑 Créer son code</button>' +
    '<div id="ceMsg" style="font-size:13px;margin:8px 0;line-height:1.5;"></div>';

  const zListe = document.createElement('div');
  zListe.style.cssText = 'border-top:1px solid var(--line);margin-top:14px;padding-top:12px;';
  zListe.innerHTML = htmlAttente('');
  boite.appendChild(zListe);

  /* Les langues ouvertes par le bureau */
  let langues = [];
  try{
    const dl = await appelPrep({ action: 'languesList' });
    langues = (dl && dl.langues) || [];
  }catch(e){}

  const selL = boite.querySelector('#ceLangue');
  selL.innerHTML = '<option value="">🇫🇷 Français seulement</option>' +
    langues.map(l => '<option value="' + String(l.code).replace(/"/g, '&quot;') +
      '">' + l.nom.replace(/</g, '&lt;') + '</option>').join('');

  const nomLangue = code => {
    const l = langues.find(x => x.code === code);
    return l ? l.nom : code;
  };

  boite.querySelector('#ceGererLangues').addEventListener('click', () => {
    document.body.removeChild(fond);
    ouvrirGestionLangues();
  });

  /* Le catalogue des procédures et ce que chaque formation donne :
     calculés par le script, pas ici. La règle de « qui voit quoi »
     doit rester écrite à un seul endroit — sinon l'écran promet un
     accès que l'élève n'a pas. */
  let catalogue = [];
  let parBoite = {};

  const dessiner = async () => {
    try{
      const d = await appelPrep({ action: 'accesElevesList' });
      const liste = (d && d.acces) || [];
      catalogue = (d && d.procedures) || [];
      parBoite = (d && d.parBoite) || {};

      zListe.innerHTML = '<div style="font-size:13px;font-weight:700;' +
        'color:var(--accent-text);margin-bottom:8px;">' +
        liste.length + ' élève(s) avec un accès</div>';

      if(!liste.length){
        zListe.innerHTML += '<div style="font-size:12px;color:var(--muted);">' +
          'Personne pour l\'instant.</div>';
        return;
      }

      liste.forEach(a => {
        const l = document.createElement('div');
        l.style.cssText = 'display:flex;gap:8px;align-items:center;padding:8px 0;' +
          'border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;' +
          (a.actif ? '' : 'opacity:.5;');
        l.innerHTML =
          '<span style="flex:1;min-width:0;">' +
            '<strong>' + a.eleve.replace(/</g, '&lt;') + '</strong>' +
            '<div style="font-size:11px;color:var(--muted);">' +
              (a.derniereVisite ? 'vu le ' + a.derniereVisite.replace(/</g, '&lt;')
                                : 'jamais venu') +
              (a.actif ? '' : ' · accès coupé') +
              (a.langue ? '<br>🌍 ' + nomLangue(a.langue).replace(/</g, '&lt;')
                        : '') +
            '</div>' +
          '</span>' +
          '<code style="flex-shrink:0;font-size:15px;letter-spacing:.12em;' +
            'color:var(--accent-text);font-weight:700;">' + a.code + '</code>';

        /* Le message d'accès, une fois pour les deux boutons */
        const messageAcces = () =>
          'Bonjour ' + a.eleve.split(' ')[0] + ',\n\n' +
          'Voici ton coin révisions :\n' +
          'https://ec-sb.github.io/Bilan-conduite/eleve.html\n\n' +
          'Ton nom : ' + a.eleve + '\n' +
          'Ton code : ' + a.code + '\n\n' +
          'Tu y récites tes procédures et suis tes séances de code.\n' +
          'Ce n\'est pas le site pour réserver tes cours.\n\n' +
          'Garde ce code, il te servira à chaque fois.\n\n' +
          'À bientôt !\n' +
          'Évolution Conduites';

        /* Lui envoyer par mail, sur l'adresse de sa fiche */
        const bMail = document.createElement('button');
        bMail.className = 'btn btn-secondary';
        bMail.style.cssText = 'width:auto;padding:7px 9px;font-size:13px;margin:0;' +
          'flex-shrink:0;';
        bMail.textContent = '✉️';
        bMail.title = 'Lui envoyer son accès par mail';
        bMail.addEventListener('click', async () => {
          bMail.disabled = true;
          try{
            /* L'adresse vit dans sa fiche, pas ici */
            const d = await appelPrep({ action: 'contactEleve', eleve: a.eleve });
            const adresse = ((d && d.contact) || {}).email || '';

            if(!adresse){
              showToast('Aucune adresse dans sa fiche.');
              bMail.disabled = false;
              return;
            }

            await appelPrep({
              action: 'mailBilan',
              to: [adresse],
              sujet: 'Ton coin révisions — Évolution Conduites',
              texte: messageAcces()
            });
            bMail.textContent = '✅';
            showToast('Envoyé à ' + adresse + ' ✅');
          }catch(e){
            bMail.disabled = false;
            showToast('Envoi impossible : ' + e.message);
          }
        });
        l.appendChild(bMail);

        /* Ou copier le message, pour Messenger */
        const bCop = document.createElement('button');
        bCop.className = 'btn btn-secondary';
        bCop.style.cssText = 'width:auto;padding:7px 9px;font-size:13px;margin:0;' +
          'flex-shrink:0;';
        bCop.textContent = '📋';
        bCop.title = 'Copier le message pour l\'élève';
        bCop.addEventListener('click', async () => {
          try{
            await navigator.clipboard.writeText(messageAcces());
            showToast('Message copié ✅');
          }catch(e){ showToast('Copie impossible'); }
        });
        l.appendChild(bCop);

        /* Changer le code */
        const bLang = document.createElement('button');
        bLang.className = 'btn btn-secondary';
        bLang.style.cssText = 'width:auto;padding:7px 9px;font-size:13px;margin:0;' +
          'flex-shrink:0;';
        bLang.textContent = '🌍';
        bLang.title = 'Changer sa langue';
        bLang.addEventListener('click', async () => {
          const choix = await choisirLangue(a, langues);
          if(choix === null) return;
          try{
            /* Surtout pas « code » : appelPrep s'en sert pour le
               code du moniteur, et l'envoyer ici faisait échouer
               l'authentification. Le classeur garde le code de
               l'élève quand on ne lui en donne pas. */
            await appelPrep({ action: 'accesEleveSet', eleve: a.eleve,
                              langue: choix });
            showToast(choix ? 'Langue ouverte ✅' : 'Français seulement ✅');
            dessiner();
          }catch(e){ showToast('Impossible : ' + e.message); }
        });
        l.appendChild(bLang);

        const bNew = document.createElement('button');
        bNew.className = 'btn btn-secondary';
        bNew.style.cssText = 'width:auto;padding:7px 9px;font-size:13px;margin:0;' +
          'flex-shrink:0;';
        bNew.textContent = '🔄';
        bNew.title = 'Lui donner un nouveau code';
        bNew.addEventListener('click', async () => {
          if(!await confirmer('Nouveau code pour ' + a.eleve + ' ?\n\n' +
              'L\'ancien ne marchera plus : il faudra lui transmettre le nouveau.')) return;
          try{
            const rep = await appelPrep({ action: 'accesEleveSet', eleve: a.eleve,
                                          nouveauCode: 'oui' });
            showToast('Nouveau code : ' + (rep.code || '') + ' ✅');
            dessiner();
          }catch(e){ showToast('Impossible : ' + e.message); }
        });
        l.appendChild(bNew);

        const bSup = document.createElement('button');
        bSup.className = 'btn btn-secondary';
        bSup.style.cssText = 'width:auto;padding:7px 9px;font-size:13px;margin:0;' +
          'flex-shrink:0;color:var(--red);border-color:var(--red);';
        bSup.textContent = '🗑️';
        bSup.addEventListener('click', async () => {
          if(!await confirmer('Retirer l\'accès de ' + a.eleve + ' ?')) return;
          try{
            await appelPrep({ action: 'accesEleveDelete', eleve: a.eleve });
            showToast('Accès retiré ✅');
            dessiner();
          }catch(e){ showToast('Impossible : ' + e.message); }
        });
        l.appendChild(bSup);

        /* Une carte par élève : la ligne de tête, puis ce à quoi il
           a accès en révisions. */
        const carte = document.createElement('div');
        carte.style.cssText = 'border-bottom:1px solid rgba(255,255,255,.05);' +
          'padding-bottom:6px;' + (a.actif ? '' : 'opacity:.5;');
        l.style.borderBottom = 'none';
        l.style.opacity = '';
        carte.appendChild(l);
        carte.appendChild(blocRevisions(a, catalogue, parBoite, dessiner));
        zListe.appendChild(carte);
      });
    }catch(e){
      zListe.innerHTML = '<div class="empty">⚠️ ' +
        e.message.replace(/</g, '&lt;') + '</div>';
    }
  };

  boite.querySelector('#ceAjouter').addEventListener('click', async () => {
    const nom = boite.querySelector('#ceEleve').value.trim();
    if(!nom){ showToast('Indique l\'élève.'); return; }

    const b = boite.querySelector('#ceAjouter');
    b.disabled = true;
    try{
      const rep = await appelPrep({ action: 'accesEleveSet', eleve: nom,
                                    langue: selL.value });
      boite.querySelector('#ceMsg').innerHTML =
        '<span style="color:var(--accent-text);">Code de ' +
        nom.replace(/</g, '&lt;') + ' : <strong style="letter-spacing:.12em;">' +
        (rep.code || '') + '</strong></span><br>' +
        '<span style="font-size:11px;color:var(--muted);">' +
        'Le bouton 📋 copie le message à lui envoyer.</span>';
      boite.querySelector('#ceEleve').value = '';
      dessiner();
    }catch(e){ showToast('Impossible : ' + e.message); }
    b.disabled = false;
  });

  const rw = document.createElement('div');
  rw.className = 'btn-row';
  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary';
  bF.textContent = 'Fermer';
  bF.addEventListener('click', () => document.body.removeChild(fond));
  rw.appendChild(bF);
  boite.appendChild(rw);

  fond.appendChild(boite);
  document.body.appendChild(fond);
  dessiner();
}


/* ============================================================
   LES RÉCITATIONS DE L'ESPACE ÉLÈVE

   L'élève a récité, l'IA propose une correction, un moniteur la
   relit et la valide. Tant qu'elle n'est pas validée, l'élève ne
   voit rien d'autre qu'un « en attente ».
   ============================================================ */

function ligneRecitation(r){
  const l = document.createElement('div');
  l.style.cssText = 'display:flex;gap:10px;align-items:center;' +
    'border:1px solid ' + (r.etat === 'valide' ? 'var(--line)' : 'var(--orange)') +
    ';border-radius:10px;padding:10px 12px;margin-bottom:6px;cursor:pointer;' +
    (r.etat === 'valide' ? 'opacity:.6;' : '');

  l.innerHTML =
    '<span style="flex-shrink:0;font-size:19px;">🎙️</span>' +
    '<span style="flex:1;min-width:0;font-size:14px;line-height:1.4;">' +
      '<strong>' + (r.eleve || '?').replace(/</g, '&lt;') + '</strong>' +
      '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
        (r.procedure || '').replace(/</g, '&lt;') + ' · ' +
        (r.envoyeLe || '').replace(/</g, '&lt;') +
        (r.etat === 'valide'
          ? ' · <span style="color:var(--accent-text);">✅ validée</span>'
          : (r.correction ? ' · correction prête' : ' · à corriger')) +
      '</div>' +
    '</span>';

  l.addEventListener('click', () => ouvrirRecitation(r));
  return l;
}


async function ouvrirRecitation(r){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(620px, 95vw);max-height:90vh;overflow-y:auto;';

  boite.innerHTML =
    '<h3>' + (r.eleve || '').replace(/</g, '&lt;') + '</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;">' +
      (r.procedure || '').replace(/</g, '&lt;') + ' · ' +
      (r.envoyeLe || '').replace(/</g, '&lt;') + '</div>' +

    (r.langue
      ? '<div style="background:rgba(182,255,14,.08);border-radius:10px;' +
        'padding:10px 12px;font-size:12px;line-height:1.5;margin-bottom:12px;">' +
        '🌍 Récité en <strong>' + String(r.langue).replace(/</g, '&lt;') +
        '</strong>. La correction française sera traduite pour lui.</div>'
      : '') +

    (r.traduction
      ? '<label>Traduction en français</label>' +
        '<div style="background:var(--navy);border:1px solid var(--line);' +
        'border-radius:10px;padding:11px 12px;font-size:14px;line-height:1.65;' +
        'white-space:pre-wrap;margin-bottom:14px;">' +
        r.traduction.replace(/</g, '&lt;') + '</div>'
      : '') +

    '<label for="rcTexte">Ce qu\'il a dit</label>' +
    '<textarea id="rcTexte" rows="6" ' +
      'style="font-size:14px;line-height:1.6;"></textarea>' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;' +
      'line-height:1.5;">Modifiable : la dictée se trompe parfois sur un mot. ' +
      'Corrige avant de demander la correction.</div>' +

    '<label for="rcCorrection">La correction qu\'il verra</label>' +
    '<textarea id="rcCorrection" rows="10" ' +
      'placeholder="Relis et ajuste avant de valider."></textarea>' +
    '<div id="rcEtat" style="font-size:12px;color:var(--muted);' +
      'margin:-6px 0 12px;line-height:1.5;"></div>' +

    (r.langue
      ? '<label for="rcTraduite">Ce qu\'il recevra, dans sa langue</label>' +
        '<textarea id="rcTraduite" rows="6" dir="auto" ' +
          'style="font-size:14px;line-height:1.6;"></textarea>' +
        '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;' +
          'line-height:1.5;">Si tu changes la correction française, ' +
          'pense à ajuster celle-ci — ou laisse-la vide pour n\'envoyer ' +
          'que le français.</div>'
      : '');

  boite.querySelector('#rcTexte').value = r.texte || '';
  if(boite.querySelector('#rcTraduite')){
    boite.querySelector('#rcTraduite').value = r.correctionTraduite || '';
  }
  boite.querySelector('#rcCorrection').value = r.correction || '';

  const zEtat = boite.querySelector('#rcEtat');

  /* La correction par l'IA, si elle n'existe pas encore */
  const bIA = document.createElement('button');
  bIA.className = 'btn btn-secondary';
  bIA.style.cssText = 'margin-bottom:12px;padding:11px;font-size:13px;';
  bIA.textContent = r.correction ? '🔄 Refaire la correction' : '✨ Corriger avec l\'IA';
  bIA.addEventListener('click', async () => {
    bIA.disabled = true;
    zEtat.textContent = 'Lecture de la procédure de référence…';
    try{
      /* On corrige le texte à l'écran, pas celui d'origine : le
         moniteur a pu rectifier une transcription fautive. */
      const texte = await corrigerRecitation(
        Object.assign({}, r, { texte: boite.querySelector('#rcTexte').value }));
      boite.querySelector('#rcCorrection').value = texte;
      zEtat.textContent = 'Proposition de l\'IA — relis-la avant de valider.';
    }catch(e){
      zEtat.textContent = 'Correction impossible : ' + e.message;
    }
    bIA.disabled = false;
    bIA.textContent = '🔄 Refaire la correction';
  });
  boite.appendChild(bIA);

  /* Comment la lui transmettre, en plus de son espace */
  const zEnvoi = document.createElement('div');
  zEnvoi.style.cssText = 'border-top:1px solid var(--line);margin-top:6px;' +
    'padding-top:12px;margin-bottom:6px;';
  zEnvoi.innerHTML = '<div style="font-size:12px;color:var(--muted);' +
    'margin-bottom:8px;line-height:1.5;">En plus de son espace :</div>';

  const faire = (id, texte, coche) => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:10px;' +
      'text-transform:none;font-size:14px;color:var(--cream);margin:0 0 8px;' +
      'font-weight:400;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.checked = coche;
    cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin:0;';
    l.appendChild(cb);
    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    t.textContent = texte;
    l.appendChild(t);
    zEnvoi.appendChild(l);
    return cb;
  };

  const envoyerMail = faire('rcMail', '✉️ Lui envoyer par mail', true);
  const parMessenger = faire('rcMess', '💬 Préparer le message Messenger', false);
  boite.appendChild(zEnvoi);

  const rw = document.createElement('div');
  rw.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Fermer';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  rw.appendChild(bAnn);

  const bSup = document.createElement('button');
  bSup.className = 'btn btn-secondary';
  bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
  bSup.textContent = '🗑️';
  bSup.addEventListener('click', async () => {
    if(!await confirmer('Supprimer cette récitation ?')) return;
    try{
      await appelPrep({ action: 'recitationDelete', id: r.id });
      document.body.removeChild(fond);
      showToast('Supprimée ✅');
      afficherProcCorriger();
    }catch(e){ showToast('Impossible : ' + e.message); }
  });
  rw.appendChild(bSup);

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = (r.etat === 'valide') ? '💾 Enregistrer' : '✅ Valider et envoyer';
  bOk.addEventListener('click', async () => {
    const texte = boite.querySelector('#rcCorrection').value.trim();
    if(!texte){ showToast('Écris la correction avant de valider.'); return; }

    bOk.disabled = true;
    try{
      const rep = await appelPrep({
        action: 'recitationSet', id: r.id,
        texte: boite.querySelector('#rcTexte').value,
        correction: texte, etat: 'valide',
        correctionTraduite: boite.querySelector('#rcTraduite')
          ? boite.querySelector('#rcTraduite').value : '',
        /* De quoi composer le mail, que le classeur n'a pas à
           retrouver lui-même. */
        eleveNom: r.eleve || '',
        procedureNom: r.procedure || '',
        mail: envoyerMail.checked ? 'oui' : 'non',
        par: ACCES.moniteur || ''
      });

      document.body.removeChild(fond);

      const m = rep && rep.mail;
      if(envoyerMail.checked && m && !m.envoye){
        showToast('Validée ✅ — mail non envoyé : ' + (m.motif || ''));
      }else if(envoyerMail.checked && m && m.envoye){
        showToast('Validée et envoyée à ' + m.email + ' ✅');
      }else{
        showToast('Validée — l\'élève peut la voir ✅');
      }

      /* Messenger : on prépare le message, l'envoi reste manuel */
      if(parMessenger.checked){
        ouvrirMessengerCorrection(r, texte, boite.querySelector('#rcTexte').value);
      }

      afficherProcCorriger();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
    }
  });
  rw.appendChild(bOk);

  boite.appendChild(rw);
  fond.appendChild(boite);
  document.body.appendChild(fond);

  /* On ne lance plus l'IA d'office : le moniteur décide, et
     chaque appel coûte. */
}



/* Le message Messenger, prêt à coller */
async function ouvrirMessengerCorrection(r, correction, dit){
  let messenger = '';
  try{
    const d = await appelPrep({ action: 'contactEleve', eleve: r.eleve });
    messenger = ((d && d.contact) || {}).messenger || '';
  }catch(e){}

  const texte =
    'Bonjour ' + String(r.eleve).split(' ')[0] + ' 👋\n\n' +
    'Voici la correction de ta procédure « ' + r.procedure + ' » :\n\n' +
    correction + '\n\n' +
    'Bon entraînement !';

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 94vw);max-height:88vh;overflow-y:auto;';

  boite.innerHTML = '<h3>💬 Message pour ' +
    (r.eleve || '').replace(/</g, '&lt;') + '</h3>' +
    (messenger
      ? '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Son ' +
        'Messenger : <strong>' + messenger.replace(/</g, '&lt;') + '</strong></div>'
      : '<div style="font-size:12px;color:var(--warn-text);margin-bottom:10px;' +
        'line-height:1.5;">Aucun Messenger dans sa fiche : copie le message ' +
        'et retrouve-le à la main.</div>');

  const z = document.createElement('textarea');
  z.rows = 12;
  z.value = texte;
  z.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:13px;' +
    'line-height:1.6;font-family:inherit;resize:vertical;margin-bottom:10px;';
  boite.appendChild(z);

  const rw = document.createElement('div');
  rw.className = 'btn-row';

  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary';
  bF.textContent = 'Fermer';
  bF.addEventListener('click', () => document.body.removeChild(fond));
  rw.appendChild(bF);

  const bC = document.createElement('button');
  bC.className = 'btn btn-primary';
  bC.textContent = '📋 Copier';
  bC.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(z.value);
      showToast('Message copié ✅');
      window.open('https://www.messenger.com/', '_blank');
    }catch(e){
      z.focus(); z.select();
      showToast('Sélectionné : Ctrl+C pour copier');
    }
  });
  rw.appendChild(bC);

  boite.appendChild(rw);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


/* ============================================================
   LES CONSIGNES DE CORRECTION D'UNE PROCÉDURE

   ⚠️ Ce bloc existe à l'identique dans cloudflare-worker.js, pour
   la correction automatique. Les deux doivent dire exactement la
   même chose, sinon une même récitation se corrige différemment
   selon qu'elle est passée par l'automatique ou par ce bouton.
   ============================================================ */
function consignesCorrection(ordre, libre){
  const bouts = [];
  if(ordre){
    bouts.push("L'ORDRE DES ETAPES COMPTE. L'eleve doit reciter dans l'ordre " +
      "de la procedure attendue. Une etape hors de sa place est une erreur : " +
      "dis laquelle, et ou elle devrait etre.");
  }
  const l = String(libre || '').trim();
  if(l) bouts.push("CONSIGNE DE L'AUTO-ECOLE POUR CETTE PROCEDURE :\n" + l);
  return bouts.length ? bouts.join('\n\n') + '\n\n' : '';
}

/* La correction par l'IA, appuyée sur la procédure de référence */
async function corrigerRecitation(r){
  /* Le texte attendu : la comparaison n'a de sens que par rapport
     à ce que l'auto-école enseigne. */
  let reference = '';
  let regles = '';
  try{
    const mod = (typeof modelesTexte !== 'undefined' ? modelesTexte : [])
      .find(m => m.usage === 'procedure' &&
                 normaliserMot(m.nom) === normaliserMot(r.procedure));
    reference = (mod && mod.contenu) || '';
    regles = consignesCorrection(mod && mod.ordre, mod && mod.consigne);
  }catch(e){}

  const consigne =
    'Tu es moniteur d\'auto-école. Un élève récite une procédure de conduite. ' +
    'Corrige-le en t\'adressant à lui, en le tutoyant, avec bienveillance.\n\n' +
    (reference
      ? 'LA PROCÉDURE ATTENDUE :\n' + reference + '\n\n'
      : 'Aucune procédure de référence enregistrée : appuie-toi sur les ' +
        'règles habituelles de la conduite.\n\n') +
    /* Les consignes du bureau avant la récitation, le format de
       réponse après : un texte libre ne peut pas défaire le format. */
    regles +
    'CE QUE L\'ÉLÈVE A DIT :\n' + r.texte + '\n\n' +
    'Ta réponse, en français, sans titre ni préambule :\n' +
    '1. Ce qui est juste, en une ou deux phrases.\n' +
    '2. Ce qui manque ou ce qui est faux, point par point.\n' +
    '3. Une phrase d\'encouragement pour la prochaine fois.\n\n' +
    'Reste court : dix lignes au plus. Ne réécris pas toute la procédure.';

  /* Le même relais que les bilans : le code du moniteur y donne
     accès, pas celui de l'élève. */
  const rep = await fetch(CONFIG.IA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: ACCES.code,
      payload: {
        model: 'claude-sonnet-5',
        max_tokens: 1200,
        system: consigne,
        messages: [{ role: 'user', content:
          'Corrige cette récitation.' }]
      }
    })
  });

  if(rep.status === 403){
    verrouiller('Session expirée, saisis ton code à nouveau.');
    throw new Error('Accès refusé.');
  }
  if(!rep.ok) throw new Error('HTTP ' + rep.status);

  const d = await rep.json();
  if(d.error) throw new Error((d.error && d.error.message) || 'Erreur IA');

  return (d.content || [])
    .filter(x => x.type === 'text')
    .map(x => x.text)
    .join('\n')
    .trim();
}


/* ============================================================
   LA FICHE
   ============================================================ */

async function ouvrirFicheProc(x){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 94vw);max-height:88vh;overflow-y:auto;';

  boite.innerHTML =
    '<h3>' + (x ? 'Procédure de ' + (x.eleve || '').replace(/</g, '&lt;')
                : 'Procédure reçue') + '</h3>' +

    '<label for="pcEleve">Élève</label>' +
    '<input type="text" id="pcEleve" list="listeEleves" autocomplete="off" ' +
      'placeholder="Prénom et nom">' +

    '<label for="pcMess">Son Messenger</label>' +
    '<input type="text" id="pcMess" placeholder="Son nom sur Messenger, ou le lien">' +

    '<label for="pcRem">Remarque (facultatif)</label>' +
    '<textarea id="pcRem" rows="2" ' +
      'placeholder="Ex : procédure du créneau, 3e envoi"></textarea>' +

    '<label>Capture d\'écran</label>' +
    '<div id="pcApercu" style="margin-bottom:8px;"></div>' +
    '<div id="pcColler" tabindex="0" style="border:2px dashed var(--line);' +
      'border-radius:10px;padding:14px 12px;text-align:center;font-size:13px;' +
      'color:var(--muted);cursor:pointer;margin-bottom:6px;">' +
      '📋 <strong>Colle la capture ici</strong><br>' +
      '<span style="font-size:11px;">Ctrl+V, ou fais glisser l\'image</span></div>' +
    '<input type="file" id="pcFichier" accept="image/*" ' +
      'style="font-size:13px;padding:9px;margin-bottom:12px;">';

  let image = '';

  const apercu = boite.querySelector('#pcApercu');
  const montrer = () => {
    apercu.innerHTML = image
      ? '<img src="' + image + '" style="max-width:100%;max-height:250px;' +
        'border-radius:9px;border:1px solid var(--line);">'
      : '';
  };

  if(x){
    boite.querySelector('#pcEleve').value = x.eleve || '';
    boite.querySelector('#pcMess').value = x.messenger || '';
    boite.querySelector('#pcRem').value = x.remarque || '';

    /* La capture arrive à part : elle est lourde et n'a pas sa
       place dans la liste. */
    if(x.aUneCapture){
      apercu.innerHTML = '<div style="font-size:12px;color:var(--muted);">' +
        'Chargement de la capture…</div>';
      appelPrep({ action: 'procCorrigerCapture', id: x.id })
        .then(r => { image = (r && r.image) || ''; montrer(); })
        .catch(() => { apercu.innerHTML =
          '<div style="font-size:12px;color:var(--warn-text);">' +
          'Capture illisible.</div>'; });
    }
  }
  montrer();

  /* Coller, glisser ou choisir */
  const prendre = async fichier => {
    if(!fichier) return;
    try{
      image = await compresserImage(fichier);
      montrer();
    }catch(e){ showToast('Image refusée : ' + e.message); }
  };

  const zc = boite.querySelector('#pcColler');
  zc.addEventListener('click', () => zc.focus());
  zc.addEventListener('paste', ev => {
    const items = (ev.clipboardData && ev.clipboardData.items) || [];
    for(let i = 0; i < items.length; i++){
      if(items[i].type && items[i].type.indexOf('image') === 0){
        ev.preventDefault();
        prendre(items[i].getAsFile());
        return;
      }
    }
  });
  ['dragenter', 'dragover'].forEach(n => zc.addEventListener(n, ev => {
    ev.preventDefault();
    zc.style.borderColor = 'var(--orange)';
  }));
  ['dragleave', 'drop'].forEach(n => zc.addEventListener(n, ev => {
    ev.preventDefault();
    zc.style.borderColor = 'var(--line)';
  }));
  zc.addEventListener('drop', ev => {
    const f = (ev.dataTransfer && ev.dataTransfer.files || [])[0];
    if(f && f.type.indexOf('image') === 0) prendre(f);
  });
  boite.querySelector('#pcFichier').addEventListener('change', ev => {
    prendre(ev.target.files && ev.target.files[0]);
  });

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bAnn);

  if(x){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.textContent = '🗑️';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Supprimer cette procédure de la liste ?')) return;
      try{
        await appelPrep({ action: 'procCorrigerDelete', id: x.id });
        document.body.removeChild(fond);
        showToast('Supprimée ✅');
        afficherProcCorriger();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bSup);
  }

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = x ? '💾 Enregistrer' : '➕ Ajouter';
  bOk.addEventListener('click', async () => {
    const nom = boite.querySelector('#pcEleve').value.trim();
    if(!nom){ showToast("Indique l'élève."); return; }

    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      await appelPrep({
        action: 'procCorrigerSet',
        id: x ? x.id : '',
        eleve: nom,
        messenger: boite.querySelector('#pcMess').value.trim(),
        remarque: boite.querySelector('#pcRem').value.trim(),
        /* Renvoyée seulement si elle a changé : une capture pèse
           lourd et le serveur garde l'ancienne. */
        capture: (image && (!x || !x.aUneCapture || image.indexOf('data:') === 0))
                   ? image : '',
        par: ACCES.moniteur || ''
      });
      document.body.removeChild(fond);
      showToast(x ? 'Modifiée ✅' : 'Ajoutée ✅');
      afficherProcCorriger();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false;
      bOk.textContent = x ? '💾 Enregistrer' : '➕ Ajouter';
    }
  });
  r.appendChild(bOk);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#pcEleve').focus(), 100);
}


/* ============================================================
   LA PASTILLE

   Elle ne s'affiche que pour ceux qui corrigent : la voir sans
   pouvoir agir n'apporte rien.
   ============================================================ */
function majPastilleProc(){
  const n = nbProcACorriger();

  /* Sur le sous-onglet : le compte exact */
  if(typeof poserCompteVue === 'function'){
    poserCompteVue('eleves', 'proccorriger', n);
  }

  /* Et sur l'onglet Élèves lui-même : sans elle, il faudrait ouvrir
     l'onglet pour découvrir qu'il y a du travail. */
  if(typeof poserAlerte === 'function') poserAlerte('eleves', n);
}

/* Le compte, chargé en fond après la connexion */
async function chargerProcEnFond(){
  if(!ACCES || !ACCES.droits || !ACCES.droits.proccorriger) return;
  try{
    const d = await appelPrep({ action: 'procCorrigerList' });
    procACorriger = (d && d.fiches) || [];
    majPastilleProc();
  }catch(e){ /* la pastille attendra le prochain passage */ }
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-proccorriger.js'] = true;
