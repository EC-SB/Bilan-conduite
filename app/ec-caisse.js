/* Déployé le 01/09/2026 à 07:48 — v745 */
/* ============================================================
   ec-caisse.js
   La caisse et les remises en banque.

   Deux gestes qui se faisaient sur un coin de table, et dont il
   ne restait rien le lendemain :

     • compter les billets avant d'aller à la banque ;
     • aligner les chèques pour savoir combien on en dépose, et
       pour quel montant.

   L'un et l'autre finissent au même endroit — une remise, à une
   date, pour un montant. C'est cette remise qu'on garde : le jour
   où le relevé ne tombe pas juste, on veut pouvoir dire ce qui est
   parti, quand, et compté par qui.

   TOUT EST EN CENTIMES.

   Un euro et dix centimes vaut 110, jamais 1.1 : additionner des
   nombres à virgule fait dériver les totaux de quelques centimes,
   et un total de remise qui ne tombe pas juste au centime est un
   total faux. On ne divise par cent qu'au dernier moment, pour
   afficher.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les coupures, de la plus grosse à la plus petite — l'ordre dans
   lequel on les pose sur la table. Les pièces ne se comptent pas
   ici : elles restent dans la caisse. */
const BILLETS = [500, 200, 100, 50, 20, 10, 5];

/* Ce qui reste dans la caisse pour rendre la monnaie. Réglable,
   et retenu dans le classeur : le fond ne change pas tous les
   jours, mais quand il change il change pour tout le monde. */
let fondDeCaisse = 0;          /* en centimes */
let fondDeCaisseLu = false;

let comptageBillets = {};      /* { 50: 3, 20: 7, … } */
let chequesSaisis = [];        /* [ '12,50', '', … ] tels que tapés */
let depotsConnus = null;

const CLE_FOND = 'fondDeCaisse';


/* ------------------------------------------------------------
   L'ARITHMÉTIQUE, À PART

   Ces cinq fonctions ne touchent ni à l'écran ni au réseau. Ce
   sont elles qui disent le montant qu'on emporte à la banque, et
   ce sont elles que les tests interrogent.
   ------------------------------------------------------------ */

/* « 12,50 », « 12.5 », « 12 » → 1250. Tout le reste → null.
   null n'est pas zéro : une case vide n'est pas un chèque de 0 €,
   et une faute de frappe ne doit pas se compter comme un chèque. */
function montantEnCentimes(txt){
  const s = String(txt == null ? '' : txt).trim().replace(/\s/g, '').replace(',', '.');
  if(!s) return null;
  if(!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  const n = Math.round(parseFloat(s) * 100);
  return isNaN(n) ? null : n;
}

/* 1250 → « 12,50 € ». Un montant s'écrit toujours avec ses deux
   décimales : « 12,5 € » sur un bordereau de banque, jamais. */
function centimesEnEuros(c){
  const n = parseInt(c, 10) || 0;
  const signe = n < 0 ? '-' : '';
  const a = Math.abs(n);
  return signe + Math.floor(a / 100) + ',' +
         String(a % 100).padStart(2, '0') + ' €';
}

/* Le compteur de billets : combien font ces coupures, en tout. */
function totalDesBillets(compte){
  return BILLETS.reduce((somme, valeur) => {
    const n = parseInt((compte || {})[valeur], 10);
    return somme + ((n > 0) ? n * valeur * 100 : 0);
  }, 0);
}

/* Les chèques : ceux qui portent un montant, et ce qu'ils font.
   Une ligne vide ne compte pas — on en laisse toujours une en bas
   pour pouvoir taper la suivante. */
function compterLesCheques(liste){
  let nombre = 0, total = 0, refuses = 0;
  (liste || []).forEach(x => {
    const brut = String(x == null ? '' : x).trim();
    if(!brut) return;
    const c = montantEnCentimes(brut);
    if(c === null || c <= 0){ refuses++; return; }
    nombre++;
    total += c;
  });
  return { nombre: nombre, total: total, refuses: refuses };
}

/* Ce qui part à la banque : tout ce qui a été compté, moins le
   fond qu'on laisse dans le tiroir. S'il n'y a pas de quoi
   reconstituer le fond, on ne dépose rien — et on le dit. */
function liquideADeposer(compte, fond){
  const total = totalDesBillets(compte);
  const f = Math.max(0, parseInt(fond, 10) || 0);
  return {
    compte: total,
    fond: f,
    aDeposer: Math.max(0, total - f),
    manque: Math.max(0, f - total)
  };
}

/* La remise entière : le liquide qui part, plus les chèques. */
function totalDeLaRemise(compte, fond, cheques){
  const l = liquideADeposer(compte, fond);
  const c = compterLesCheques(cheques);
  return {
    liquide: l.aDeposer,
    compte: l.compte,
    fond: l.fond,
    manque: l.manque,
    cheques: c.total,
    nbCheques: c.nombre,
    refuses: c.refuses,
    total: l.aDeposer + c.total
  };
}


/* ------------------------------------------------------------
   LE FOND DE CAISSE
   ------------------------------------------------------------ */
async function lireFondDeCaisse(){
  if(fondDeCaisseLu) return fondDeCaisse;
  try{
    const d = await appelPrep({ action: 'reglagesList' });
    const g = (d && d.reglages) || {};
    const c = montantEnCentimes(g[CLE_FOND]);
    if(c !== null) fondDeCaisse = c;
  }catch(e){ console.warn('Fond de caisse :', e); }
  fondDeCaisseLu = true;
  return fondDeCaisse;
}

async function reglerFondDeCaisse(){
  const rep = await demander(
    'Ce qui doit rester dans la caisse pour rendre la monnaie.\n' +
    'Il est retiré du comptage : le reste part à la banque.',
    centimesEnEuros(fondDeCaisse).replace(' €', ''),
    '💶 Fond de caisse');
  if(rep === null) return;

  const c = montantEnCentimes(rep);
  if(c === null){
    informer('« ' + rep + " » n'est pas un montant. Exemple : 150 ou 150,00",
             'Montant illisible');
    return;
  }
  fondDeCaisse = c;
  majCaisse();
  try{
    await appelPrep({ action: 'reglageSet', cle: CLE_FOND,
                      valeur: String(c / 100) });
  }catch(e){
    informer("Le fond de caisse est pris en compte à l'écran, mais " +
             "n'a pas pu être enregistré : " + e.message, 'Enregistrement');
  }
}


/* ------------------------------------------------------------
   L'ÉCRAN
   ------------------------------------------------------------ */
async function afficherCaisse(){
  const zone = $('caisseZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Chargement…</div>';
  await lireFondDeCaisse();

  zone.innerHTML = '';
  zone.appendChild(blocBillets());
  zone.appendChild(blocCheques());
  zone.appendChild(blocRemise());
  zone.appendChild(blocHistorique());

  majCaisse();
  chargerDepots();
}

function titreDeBloc(texte){
  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:800;letter-spacing:.04em;' +
    'text-transform:uppercase;color:var(--muted);margin:0 0 9px;';
  t.textContent = texte;
  return t;
}

function cadre(){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:13px 14px;margin-bottom:14px;';
  return d;
}

/* ---------- Les billets ---------- */
function blocBillets(){
  const d = cadre();
  d.appendChild(titreDeBloc('💵 Comptage des billets'));

  BILLETS.forEach(v => {
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;align-items:center;gap:10px;' +
      'padding:5px 0;border-bottom:1px solid var(--line);';

    const nom = document.createElement('div');
    nom.style.cssText = 'width:64px;font-weight:800;font-size:15px;';
    nom.textContent = v + ' €';
    l.appendChild(nom);

    const moins = boutonPas('−');
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'numeric';
    inp.placeholder = '0';
    inp.id = 'billet' + v;
    inp.style.cssText = 'width:70px;text-align:center;margin:0;padding:7px;';
    const plus = boutonPas('+');

    const pas = n => {
      const actuel = parseInt(inp.value, 10) || 0;
      inp.value = Math.max(0, actuel + n) || '';
      inp.dispatchEvent(new Event('input'));
    };
    moins.addEventListener('click', () => pas(-1));
    plus.addEventListener('click', () => pas(1));

    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '');
      comptageBillets[v] = parseInt(inp.value, 10) || 0;
      majCaisse();
    });

    l.appendChild(moins);
    l.appendChild(inp);
    l.appendChild(plus);

    const sous = document.createElement('div');
    sous.id = 'sousTotal' + v;
    sous.style.cssText = 'flex:1;text-align:right;font-size:14px;color:var(--muted);';
    sous.textContent = '—';
    l.appendChild(sous);

    d.appendChild(l);
  });

  /* Le compté, le fond, et ce qui reste : les trois lignes se
     suivent pour que la soustraction se lise sans y penser. */
  const r = document.createElement('div');
  r.style.cssText = 'margin-top:11px;font-size:14px;line-height:1.9;';
  r.innerHTML =
    '<div style="display:flex;justify-content:space-between;">' +
      '<span>Compté</span><strong id="caisseCompte">0,00 €</strong></div>' +
    '<div style="display:flex;justify-content:space-between;color:var(--muted);">' +
      '<span>Fond de caisse laissé <button type="button" id="caisseFondBtn" ' +
        'style="background:none;border:0;color:var(--accent-text);cursor:pointer;' +
        'font-size:13px;padding:0 3px;text-decoration:underline;">modifier</button>' +
      '</span><span id="caisseFond">− 0,00 €</span></div>' +
    '<div style="display:flex;justify-content:space-between;' +
      'border-top:1px solid var(--line);margin-top:5px;padding-top:5px;">' +
      '<span><strong>Liquide à déposer</strong></span>' +
      '<strong id="caisseLiquide" style="font-size:17px;">0,00 €</strong></div>' +
    '<div id="caisseManque" style="display:none;font-size:12px;' +
      'color:var(--warn-text);margin-top:5px;line-height:1.5;"></div>';
  d.appendChild(r);

  const b = r.querySelector('#caisseFondBtn');
  if(b) b.addEventListener('click', () => reglerFondDeCaisse());

  const vider = document.createElement('button');
  vider.className = 'btn btn-secondary';
  vider.style.cssText = 'margin-top:10px;font-size:13px;padding:7px 12px;';
  vider.textContent = '↺ Remettre le comptage à zéro';
  vider.addEventListener('click', () => {
    comptageBillets = {};
    BILLETS.forEach(v => { const e = $('billet' + v); if(e) e.value = ''; });
    majCaisse();
  });
  d.appendChild(vider);

  return d;
}

function boutonPas(signe){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-secondary';
  b.textContent = signe;
  b.style.cssText = 'width:38px;height:38px;padding:0;font-size:19px;' +
    'font-weight:800;line-height:1;flex:none;';
  return b;
}

/* ---------- Les chèques ---------- */
function blocCheques(){
  const d = cadre();
  d.appendChild(titreDeBloc('🧾 Remise de chèques'));

  const liste = document.createElement('div');
  liste.id = 'chequesListe';
  d.appendChild(liste);

  const ajouter = document.createElement('button');
  ajouter.className = 'btn btn-secondary';
  ajouter.style.cssText = 'margin-top:9px;font-size:13px;padding:7px 12px;';
  ajouter.textContent = '+ Ajouter un chèque';
  ajouter.addEventListener('click', () => {
    chequesSaisis.push('');
    dessinerCheques(true);
    majCaisse();
  });
  d.appendChild(ajouter);

  const r = document.createElement('div');
  r.style.cssText = 'margin-top:11px;font-size:14px;line-height:1.9;' +
    'border-top:1px solid var(--line);padding-top:8px;';
  r.innerHTML =
    '<div style="display:flex;justify-content:space-between;">' +
      '<span><strong>Nombre de chèques</strong></span>' +
      '<strong id="caisseNbCheques" style="font-size:17px;">0</strong></div>' +
    '<div style="display:flex;justify-content:space-between;">' +
      '<span><strong>Montant du dépôt</strong></span>' +
      '<strong id="caisseTotalCheques" style="font-size:17px;">0,00 €</strong></div>' +
    '<div id="caisseChequesFaux" style="display:none;font-size:12px;' +
      'color:var(--warn-text);margin-top:5px;line-height:1.5;"></div>';
  d.appendChild(r);

  if(!chequesSaisis.length) chequesSaisis = [''];
  setTimeout(() => dessinerCheques(false), 0);
  return d;
}

/* Une ligne par chèque, numérotée. La numérotation compte les
   lignes remplies, pas les cases : sinon on annonce « chèque 4 »
   à quelqu'un qui n'en a saisi que deux. */
function dessinerCheques(focus){
  const liste = $('chequesListe');
  if(!liste) return;
  liste.innerHTML = '';

  let rang = 0;
  chequesSaisis.forEach((valeur, i) => {
    const c = montantEnCentimes(valeur);
    if(c !== null && c > 0) rang++;

    const l = document.createElement('div');
    l.style.cssText = 'display:flex;align-items:center;gap:9px;padding:4px 0;';

    const num = document.createElement('div');
    num.style.cssText = 'width:30px;font-size:13px;color:var(--muted);' +
      'text-align:right;flex:none;';
    num.textContent = (c !== null && c > 0) ? ('#' + rang) : '—';
    l.appendChild(num);

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'decimal';
    inp.placeholder = 'Montant du chèque';
    inp.value = valeur;
    inp.dataset.rang = String(i);
    inp.style.cssText = 'flex:1;margin:0;padding:9px;';
    inp.addEventListener('input', () => {
      chequesSaisis[i] = inp.value;
      /* Taper dans la dernière ligne en ouvre une nouvelle : on ne
         doit pas avoir à viser un bouton entre chaque chèque. */
      if(i === chequesSaisis.length - 1 && inp.value.trim()){
        chequesSaisis.push('');
        dessinerCheques(false);
        const e = $('chequesListe');
        if(e){
          const champs = e.querySelectorAll('input');
          if(champs[i]) champs[i].focus();
        }
      }else{
        majNumerosCheques();
      }
      majCaisse();
    });
    inp.addEventListener('keydown', ev => {
      if(ev.key === 'Enter'){
        ev.preventDefault();
        const champs = liste.querySelectorAll('input');
        if(champs[i + 1]) champs[i + 1].focus();
      }
    });
    l.appendChild(inp);

    const sup = document.createElement('button');
    sup.type = 'button';
    sup.className = 'btn btn-secondary';
    sup.textContent = '✕';
    sup.style.cssText = 'width:38px;height:38px;padding:0;font-size:15px;flex:none;';
    sup.addEventListener('click', () => {
      chequesSaisis.splice(i, 1);
      if(!chequesSaisis.length) chequesSaisis = [''];
      dessinerCheques(false);
      majCaisse();
    });
    l.appendChild(sup);

    liste.appendChild(l);
  });

  if(focus){
    const champs = liste.querySelectorAll('input');
    if(champs.length) champs[champs.length - 1].focus();
  }
}

/* Renuméroter sans redessiner : redessiner à chaque frappe ferait
   perdre le curseur au milieu d'un montant. */
function majNumerosCheques(){
  const liste = $('chequesListe');
  if(!liste) return;
  let rang = 0;
  Array.prototype.forEach.call(liste.children, (l, i) => {
    const c = montantEnCentimes(chequesSaisis[i]);
    if(c !== null && c > 0) rang++;
    const num = l.firstChild;
    if(num) num.textContent = (c !== null && c > 0) ? ('#' + rang) : '—';
  });
}

/* ---------- Le total, et le dépôt ---------- */
function blocRemise(){
  const d = cadre();
  d.style.borderColor = 'var(--accent-text)';
  d.appendChild(titreDeBloc('🏦 Ce qui part à la banque'));

  const r = document.createElement('div');
  r.style.cssText = 'font-size:14px;line-height:1.9;';
  r.innerHTML =
    '<div style="display:flex;justify-content:space-between;">' +
      '<span>Espèces</span><span id="remiseLiquide">0,00 €</span></div>' +
    '<div style="display:flex;justify-content:space-between;">' +
      '<span>Chèques (<span id="remiseNb">0</span>)</span>' +
      '<span id="remiseCheques">0,00 €</span></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:baseline;' +
      'border-top:1px solid var(--line);margin-top:6px;padding-top:7px;">' +
      '<strong>Total de la remise</strong>' +
      '<strong id="remiseTotal" style="font-size:23px;">0,00 €</strong></div>';
  d.appendChild(r);

  const note = document.createElement('input');
  note.type = 'text';
  note.id = 'caisseNote';
  note.placeholder = 'Note — facultative (n° de bordereau, agence…)';
  note.style.cssText = 'margin-top:11px;';
  d.appendChild(note);

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.id = 'caisseEnregistrer';
  b.style.marginTop = '10px';
  b.textContent = '🏦 Enregistrer ce dépôt';
  b.addEventListener('click', () => enregistrerDepot());
  d.appendChild(b);

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:12px;color:var(--muted);margin-top:7px;line-height:1.5;';
  aide.textContent = "Le comptage se vide une fois le dépôt enregistré. " +
    "Il reste dans l'historique en dessous.";
  d.appendChild(aide);

  return d;
}

/* Tous les chiffres de l'écran viennent d'ici, et d'un seul
   calcul : deux totaux calculés à deux endroits finissent par ne
   plus dire la même chose. */
function majCaisse(){
  const r = totalDeLaRemise(comptageBillets, fondDeCaisse, chequesSaisis);

  BILLETS.forEach(v => {
    const e = $('sousTotal' + v);
    if(!e) return;
    const n = parseInt(comptageBillets[v], 10) || 0;
    e.textContent = n ? centimesEnEuros(n * v * 100) : '—';
    e.style.color = n ? 'var(--cream)' : 'var(--muted)';
  });

  const ecrire = (id, txt) => { const e = $(id); if(e) e.textContent = txt; };
  ecrire('caisseCompte', centimesEnEuros(r.compte));
  ecrire('caisseFond', '− ' + centimesEnEuros(r.fond));
  ecrire('caisseLiquide', centimesEnEuros(r.liquide));
  ecrire('caisseNbCheques', String(r.nbCheques));
  ecrire('caisseTotalCheques', centimesEnEuros(r.cheques));
  ecrire('remiseLiquide', centimesEnEuros(r.liquide));
  ecrire('remiseNb', String(r.nbCheques));
  ecrire('remiseCheques', centimesEnEuros(r.cheques));
  ecrire('remiseTotal', centimesEnEuros(r.total));

  /* Le fond n'est pas reconstitué : on le dit plutôt que d'afficher
     un « 0,00 € à déposer » que personne ne saurait expliquer. */
  const m = $('caisseManque');
  if(m){
    m.style.display = r.manque ? '' : 'none';
    m.textContent = r.manque
      ? 'Il manque ' + centimesEnEuros(r.manque) +
        ' pour reconstituer le fond de caisse : rien ne part en espèces.'
      : '';
  }

  const f = $('caisseChequesFaux');
  if(f){
    f.style.display = r.refuses ? '' : 'none';
    f.textContent = r.refuses
      ? r.refuses + ' ligne(s) illisible(s), non comptée(s). ' +
        'Un montant s\'écrit 12,50 — sans le mot euros.'
      : '';
  }

  const b = $('caisseEnregistrer');
  if(b) b.disabled = !r.total;
}


/* ------------------------------------------------------------
   ENREGISTRER LE DÉPÔT
   ------------------------------------------------------------ */
async function enregistrerDepot(){
  const r = totalDeLaRemise(comptageBillets, fondDeCaisse, chequesSaisis);
  if(!r.total) return;

  const ok = await confirmer(
    'Espèces : ' + centimesEnEuros(r.liquide) + '\n' +
    r.nbCheques + ' chèque(s) : ' + centimesEnEuros(r.cheques) + '\n\n' +
    'Total : ' + centimesEnEuros(r.total),
    '🏦 Enregistrer ce dépôt ?');
  if(!ok) return;

  const b = $('caisseEnregistrer');
  if(b){ b.disabled = true; b.textContent = 'Enregistrement…'; }

  const detail = BILLETS.filter(v => parseInt(comptageBillets[v], 10) > 0)
    .map(v => comptageBillets[v] + '×' + v).join(' · ');
  const montants = (chequesSaisis || [])
    .map(x => montantEnCentimes(x))
    .filter(c => c !== null && c > 0)
    .map(c => (c / 100).toFixed(2)).join(' ');

  try{
    await appelPrep({
      action: 'depotAdd',
      liquide: (r.liquide / 100).toFixed(2),
      billets: detail,
      fond: (r.fond / 100).toFixed(2),
      nbCheques: r.nbCheques,
      cheques: (r.cheques / 100).toFixed(2),
      montantsCheques: montants,
      total: (r.total / 100).toFixed(2),
      note: String(($('caisseNote') || {}).value || '').slice(0, 200)
    });

    comptageBillets = {};
    chequesSaisis = [''];
    BILLETS.forEach(v => { const e = $('billet' + v); if(e) e.value = ''; });
    const n = $('caisseNote'); if(n) n.value = '';
    dessinerCheques(false);
    majCaisse();

    depotsConnus = null;
    chargerDepots();
    informer('Dépôt de ' + centimesEnEuros(r.total) + ' enregistré.', '✅ C\'est noté');
  }catch(e){
    informer("Le dépôt n'a pas pu être enregistré : " + e.message + '\n\n' +
             'Le comptage est resté à l\'écran : réessaie.', 'Enregistrement');
  }finally{
    if(b){ b.textContent = '🏦 Enregistrer ce dépôt'; }
    majCaisse();
  }
}


/* ------------------------------------------------------------
   L'HISTORIQUE
   ------------------------------------------------------------ */
function blocHistorique(){
  const d = cadre();
  d.appendChild(titreDeBloc('📚 Dépôts enregistrés'));
  const z = document.createElement('div');
  z.id = 'depotsListe';
  z.innerHTML = '<div class="empty">Chargement…</div>';
  d.appendChild(z);
  return d;
}

async function chargerDepots(){
  const z = $('depotsListe');
  if(!z) return;
  try{
    const d = await appelPrep({ action: 'depotList', combien: 60 });
    depotsConnus = (d && d.depots) || [];
  }catch(e){
    z.innerHTML = '<div class="empty">Historique indisponible pour le moment.</div>';
    console.warn('Dépôts :', e);
    return;
  }
  dessinerDepots();
}

function dessinerDepots(){
  const z = $('depotsListe');
  if(!z) return;
  const liste = depotsConnus || [];

  if(!liste.length){
    z.innerHTML = '<div class="empty">Aucun dépôt enregistré pour le moment.</div>';
    return;
  }

  z.innerHTML = '';

  /* Le mois en cours, en une ligne : c'est le chiffre qu'on
     cherche quand on rapproche le relevé de banque. */
  const moisCourant = new Date().toLocaleDateString('fr-FR',
    { month: '2-digit', year: 'numeric' }).replace('/', '/');
  let sommeMois = 0, nbMois = 0;
  liste.forEach(x => {
    if(String(x.quand || '').slice(3, 10) === moisCourant){
      sommeMois += montantEnCentimes(x.total) || 0;
      nbMois++;
    }
  });
  if(nbMois){
    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;line-height:1.6;margin-bottom:9px;' +
      'padding:8px 11px;border-radius:9px;border:1px solid var(--line);';
    t.innerHTML = '<strong>Ce mois-ci</strong> — ' + nbMois + ' dépôt(s), ' +
      centimesEnEuros(sommeMois);
    z.appendChild(t);
  }

  liste.forEach(x => z.appendChild(ligneDepot(x)));
}

function ligneDepot(x){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
    'padding:9px 12px;margin-bottom:7px;font-size:13px;line-height:1.6;';

  const liquide = montantEnCentimes(x.liquide) || 0;
  const cheques = montantEnCentimes(x.cheques) || 0;
  const total = montantEnCentimes(x.total) || 0;
  const nb = parseInt(x.nbCheques, 10) || 0;

  const p = s => String(s == null ? '' : s).replace(/</g, '&lt;');

  d.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:9px;">' +
      '<strong>' + p(x.quand) + '</strong>' +
      '<strong style="font-size:16px;">' + centimesEnEuros(total) + '</strong>' +
    '</div>' +
    '<div style="color:var(--muted);">' +
      (liquide ? '💵 ' + centimesEnEuros(liquide) : '') +
      (liquide && cheques ? ' · ' : '') +
      (cheques ? '🧾 ' + nb + ' chèque(s) — ' + centimesEnEuros(cheques) : '') +
      (x.qui ? '<br>👤 ' + p(x.qui) : '') +
      (x.billets ? '<br>💵 ' + p(x.billets) : '') +
      (x.note ? '<br>📝 ' + p(x.note) : '') +
    '</div>';

  if(x.montantsCheques){
    const det = document.createElement('details');
    det.style.marginTop = '6px';
    det.innerHTML = '<summary style="font-size:12px;color:var(--muted);' +
      'cursor:pointer;">Le détail des chèques</summary>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:5px;' +
      'line-height:1.7;">' +
      String(x.montantsCheques).trim().split(/\s+/)
        .map((m, i) => '#' + (i + 1) + ' — ' +
             centimesEnEuros(montantEnCentimes(m) || 0)).join('<br>') +
      '</div>';
    d.appendChild(det);
  }

  return d;
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-caisse.js'] = true;
