/* Déployé le 01/09/2026 à 10:53 — v761 */
/* ============================================================
   ec-coutsia.js
   Ce que l'IA coûte à l'auto-école.

   Chaque génération facturée chez Anthropic laisse une ligne dans
   le classeur : quand, qui, pour quoi, quel modèle, combien de
   jetons entrés et sortis, et à quel tarif. Le Worker les note au
   passage — c'est le seul endroit qui voie le compte exact.

   CE QUE CET ÉCRAN N'INVENTE PAS.

   Il ne recalcule aucun coût à partir d'un tarif d'aujourd'hui :
   chaque ligne porte le sien, celui qui s'appliquait le jour de
   l'appel. Un changement de prix chez Anthropic ne réécrit donc
   pas le passé, et un total de juillet reste le total de juillet.

   LA FACTURE EST EN DOLLARS, LE COMPTE EN EUROS.

   Anthropic facture en dollars : c'est ce que les lignes portent,
   et ce qu'on ne réécrit jamais. Mais ce qui sort du compte de
   l'auto-école est en euros, et c'est cette question-là qu'on se
   pose en ouvrant l'écran.

   D'où la conversion, et une seule règle : le taux est AFFICHÉ, il
   se règle à la main, et il reste sur l'appareil. Un taux caché
   serait pire qu'un chiffre en dollars — on ne saurait plus ce
   qu'on lit. Celui du relevé bancaire vaut mieux que n'importe
   quel repère : la banque prend sa commission au passage.

   La conversion se fait à l'AFFICHAGE, jamais à l'enregistrement.
   Changer de taux ne réécrit donc rien, et le dollar reste la
   mesure — c'est lui qui fait foi le jour où on compare avec la
   facture.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let coutsIa = null;
let coutsPeriode = 'mois';      /* jour · semaine · mois · libre */
let coutsDu = '';
let coutsAu = '';

/* Le tarif de Claude Sonnet 5 au 1er septembre 2026, en dollars par
   million de jetons. Anthropic l'annonçait à 2 $ / 10 $ jusqu'au
   31 août 2026, puis 3 $ / 15 $ — c'est ce dernier qui s'applique
   désormais.

   Il se règle dans le Worker (PRIX_IA_ENTREE, PRIX_IA_SORTIE) et
   voyage avec chaque ligne : celui affiché ici n'est qu'un repère
   pour la ligne du haut. */
const PRIX_IA_REPERE = { entree: 3, sortie: 15 };

/* Ce que vaut un dollar en euros, à défaut de mieux. Un repère,
   pas une vérité : c'est pour cela qu'il s'affiche et qu'il se
   règle. */
const TAUX_EURO_REPERE = 0.92;
const CLE_TAUX_EURO = 'ec-taux-euro';

/* La monnaie affichée. L'euro par défaut : c'est celle du compte
   de l'auto-école. */
let coutsMonnaie = 'EUR';

function tauxEuro(){
  try{
    const v = parseFloat(localStorage.getItem(CLE_TAUX_EURO));
    if(v > 0 && v < 10) return v;
  }catch(e){ /* stockage refusé : le repère fera */ }
  return TAUX_EURO_REPERE;
}

/* Un taux se tape « 0,92 » ici comme partout ailleurs en France.
   Rend faux quand ce n'est pas un taux : on ne garde pas un
   chiffre qui ferait mentir tout l'écran. */
function reglerTauxEuro(v){
  const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
  if(!(n > 0 && n < 10)) return false;
  try{ localStorage.setItem(CLE_TAUX_EURO, String(n)); }catch(e){}
  return true;
}


/* ------------------------------------------------------------
   LES DATES

   Toutes les périodes se ramènent à deux bornes, du premier au
   dernier jour inclus. Une seule règle, un seul calcul, et les
   totaux ne peuvent pas se contredire d'un onglet à l'autre.
   ------------------------------------------------------------ */
function bornesDeLaPeriode(quoi, du, au){
  const aujourdhui = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);

  if(quoi === 'libre') return { du: du || aujourdhui, au: au || aujourdhui };
  if(quoi === 'jour')  return { du: aujourdhui, au: aujourdhui };

  const d = new Date(aujourdhui + 'T12:00:00');

  if(quoi === 'semaine'){
    /* La semaine commence le lundi : c'est celle du planning et
       celle de la paie. getDay() rend 0 pour dimanche. */
    const jour = (d.getDay() + 6) % 7;
    const lundi = new Date(d);
    lundi.setDate(d.getDate() - jour);
    const dimanche = new Date(lundi);
    dimanche.setDate(lundi.getDate() + 6);
    return { du: isoDeDate(lundi), au: isoDeDate(dimanche) };
  }

  /* Le mois en cours, du 1er au dernier jour */
  const premier = new Date(d.getFullYear(), d.getMonth(), 1);
  const dernier = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { du: isoDeDate(premier), au: isoDeDate(dernier) };
}

function isoDeDate(d){
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/* « 2026-09-01 » → « 1er septembre 2026 » quand la fonction commune
   est là, la date brute sinon. */
function jourLisible(iso){
  if(typeof dateEnToutesLettres === 'function'){
    const t = dateEnToutesLettres(iso);
    if(t) return t;
  }
  return iso;
}


/* ------------------------------------------------------------
   LES SOMMES

   Ces trois fonctions ne touchent ni à l'écran ni au réseau : ce
   sont elles que les tests interrogent.
   ------------------------------------------------------------ */

/* Un montant en dollars, arrondi au centime pour l'affichage —
   jamais pour le calcul. Les générations coûtent souvent moins
   d'un centime chacune : arrondir en chemin les ferait toutes
   valoir zéro. */
function dollars(v){
  return sou(Number(v) || 0, '$');
}

/* Le même montant, converti au taux du jour — celui qui est
   affiché à l'écran, et que Chrystel peut corriger sur son
   relevé. */
function euros(v){
  return sou((Number(v) || 0) * tauxEuro(), '€');
}

/* Les deux passent par ici : deux façons d'écrire un montant
   finiraient par se contredire d'une colonne à l'autre. */
function sou(n, signe){
  if(n && Math.abs(n) < 0.01) return '< 0,01 ' + signe;
  return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' ' + signe;
}

/* UN MONTANT, DANS LA MONNAIE CHOISIE À L'ÉCRAN.

   Tout l'écran passe par cette fonction — le total, les tableaux,
   le détail. Basculer le bouton change donc tout d'un coup, et
   aucune colonne ne peut rester en dollars pendant que la voisine
   est en euros. */
function argent(v){
  return (coutsMonnaie === 'EUR') ? euros(v) : dollars(v);
}

/* Et le même montant dans l'autre monnaie : le total le dit
   toujours, pour qu'on puisse le comparer à la facture sans
   changer d'écran. */
function autreMonnaie(v){
  return (coutsMonnaie === 'EUR') ? dollars(v) : euros(v);
}

/* Le total exact d'une liste, sans arrondi intermédiaire. */
function totalDesCouts(lignes){
  return (lignes || []).reduce((s, x) => s + (Number(x.cout) || 0), 0);
}

/* Regroupé par une clé — le jour, la personne, la nature de la
   génération. Rend une liste triée du plus cher au moins cher :
   c'est ce qu'on cherche en ouvrant l'écran. */
function regrouperCouts(lignes, cle){
  const par = {};
  (lignes || []).forEach(x => {
    const k = String(x[cle] || '—');
    if(!par[k]) par[k] = { cle: k, combien: 0, entree: 0, sortie: 0, cout: 0 };
    par[k].combien++;
    par[k].entree += Number(x.entree) || 0;
    par[k].sortie += Number(x.sortie) || 0;
    par[k].cout += Number(x.cout) || 0;
  });
  return Object.keys(par).map(k => par[k]).sort((a, b) => b.cout - a.cout);
}

/* Ce que la période laisse présager sur un mois entier.

   On ne l'annonce QUE si la période couvre assez de jours pour que
   la moyenne veuille dire quelque chose : projeter un mois à partir
   d'une matinée donnerait un chiffre au hasard, et un chiffre au
   hasard sur une facture est pire que pas de chiffre. */
function projectionMensuelle(lignes, du, au){
  const jours = joursEntre(du, au);
  if(!jours || jours < 3) return null;
  const total = totalDesCouts(lignes);
  if(!total) return null;
  return { parJour: total / jours, parMois: (total / jours) * 30, jours: jours };
}

function joursEntre(du, au){
  if(!du || !au) return 0;
  const a = new Date(du + 'T12:00:00'), b = new Date(au + 'T12:00:00');
  if(isNaN(a) || isNaN(b)) return 0;
  /* Bornes incluses : du lundi au lundi fait un jour, pas zéro. */
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}


/* ------------------------------------------------------------
   L'ÉCRAN
   ------------------------------------------------------------ */
async function afficherCoutsIa(){
  const zone = $('coutsIaZone');
  if(!zone) return;

  zone.innerHTML = '';
  zone.appendChild(blocPeriodeCouts());

  const liste = document.createElement('div');
  liste.id = 'coutsIaListe';
  liste.innerHTML = '<div class="empty">Chargement…</div>';
  zone.appendChild(liste);

  chargerCoutsIa();
}

function blocPeriodeCouts(){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:12px 13px;margin-bottom:14px;';

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:7px;flex-wrap:wrap;';
  [['jour', "Aujourd'hui"], ['semaine', 'Cette semaine'],
   ['mois', 'Ce mois-ci'], ['libre', 'Une période…']].forEach(([cle, nom]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (coutsPeriode === cle ? 'btn-primary' : 'btn-secondary');
    b.style.cssText = 'flex:1;min-width:110px;padding:9px;font-size:13px;margin:0;';
    b.textContent = nom;
    b.addEventListener('click', () => {
      coutsPeriode = cle;
      afficherCoutsIa();
    });
    r.appendChild(b);
  });
  d.appendChild(r);

  if(coutsPeriode === 'libre'){
    const b = bornesDeLaPeriode('mois');
    const z = document.createElement('div');
    z.style.cssText = 'display:flex;gap:9px;margin-top:10px;align-items:end;';
    z.innerHTML =
      '<div style="flex:1;"><label for="coutDu">Du</label>' +
        '<input type="date" id="coutDu" style="margin:0;"></div>' +
      '<div style="flex:1;"><label for="coutAu">Au</label>' +
        '<input type="date" id="coutAu" style="margin:0;"></div>';
    d.appendChild(z);
    z.querySelector('#coutDu').value = coutsDu || b.du;
    z.querySelector('#coutAu').value = coutsAu || b.au;
    z.querySelectorAll('input').forEach(i => i.addEventListener('change', () => {
      coutsDu = z.querySelector('#coutDu').value;
      coutsAu = z.querySelector('#coutAu').value;
      chargerCoutsIa();
    }));
  }

  d.appendChild(blocMonnaie());

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin-top:9px;' +
    'line-height:1.5;';
  aide.innerHTML = 'Anthropic facture en dollars : les euros sont une ' +
    'conversion d\'affichage, au taux ci-dessus. Le relevé bancaire fera ' +
    'toujours un peu plus — la banque prend sa commission au passage. ' +
    'Chaque ligne garde le tarif qui s\'appliquait le jour de la génération ' +
    '(repère actuel : ' + PRIX_IA_REPERE.entree + ' $ et ' +
    PRIX_IA_REPERE.sortie + ' $ par million de jetons, entrée et sortie).' +
    /* CE QUI EXPLIQUE LE GROS DE LA FACTURE.

       Le modèle réfléchit avant d'écrire, et ce raisonnement est
       facturé au prix de la sortie — souvent plusieurs milliers de
       jetons pour une correction de dix lignes. Sans cette phrase,
       le total paraît sans rapport avec ce qu'on voit à l'écran, et
       on cherche l'erreur là où elle n'est pas. */
    '<br><br>Une génération coûte surtout par ce que le modèle ' +
    '<strong>réfléchit</strong> avant d\'écrire : ce raisonnement est ' +
    'facturé au prix de la sortie, et il pèse bien plus lourd que la ' +
    'réponse elle-même. Quelques centimes par correction sont normaux.';
  d.appendChild(aide);

  return d;
}

/* ------------------------------------------------------------
   LA MONNAIE, ET LE TAUX QUI VA AVEC

   Deux boutons et une case. Le taux s'affiche toujours, même quand
   on regarde les dollars : c'est lui qui explique l'écart avec le
   relevé bancaire, et on ne devrait jamais avoir à le deviner.
   ------------------------------------------------------------ */
function blocMonnaie(){
  const z = document.createElement('div');
  z.style.cssText = 'display:flex;gap:9px;align-items:center;flex-wrap:wrap;' +
    'margin-top:10px;padding-top:10px;border-top:1px solid var(--line);';

  [['EUR', '€ Euros'], ['USD', '$ Dollars']].forEach(([cle, nom]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (coutsMonnaie === cle ? 'btn-primary' : 'btn-secondary');
    b.style.cssText = 'flex:none;padding:8px 13px;font-size:13px;margin:0;';
    b.textContent = nom;
    b.addEventListener('click', () => {
      coutsMonnaie = cle;
      /* On ne recharge rien : les lignes sont déjà là, seule leur
         écriture change. */
      afficherCoutsIa();
    });
    z.appendChild(b);
  });

  const t = document.createElement('div');
  t.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;' +
    'color:var(--muted);flex:1;min-width:180px;justify-content:flex-end;';
  t.innerHTML = '<span>1 $ =</span>';

  const ch = document.createElement('input');
  ch.type = 'text';
  ch.inputMode = 'decimal';
  ch.value = String(tauxEuro()).replace('.', ',');
  ch.style.cssText = 'width:70px;margin:0;padding:6px;text-align:center;' +
    'font-size:13px;';
  ch.title = 'Le taux de ton relevé bancaire vaut mieux que ce repère : ' +
             'la banque prend sa commission au passage.';
  ch.addEventListener('change', () => {
    if(reglerTauxEuro(ch.value)){
      afficherCoutsIa();
    }else{
      /* Un taux impossible ne s'enregistre pas, et la case reprend
         celui qui vaut : on ne laisse pas l'écran mentir. */
      ch.value = String(tauxEuro()).replace('.', ',');
    }
  });
  t.appendChild(ch);
  const e = document.createElement('span');
  e.textContent = '€';
  t.appendChild(e);
  z.appendChild(t);

  return z;
}

async function chargerCoutsIa(){
  const z = $('coutsIaListe');
  if(!z) return;
  const b = bornesDeLaPeriode(coutsPeriode, coutsDu, coutsAu);
  z.innerHTML = '<div class="empty">Chargement…</div>';

  try{
    const d = await appelPrep({ action: 'coutIaList', du: b.du, au: b.au });
    coutsIa = (d && d.lignes) || [];
  }catch(e){
    z.innerHTML = '<div class="empty">Coûts indisponibles : ' +
      String(e.message).replace(/</g, '&lt;') + '</div>';
    return;
  }
  dessinerCoutsIa(b);
}

function dessinerCoutsIa(bornes){
  const z = $('coutsIaListe');
  if(!z) return;
  const lignes = coutsIa || [];
  z.innerHTML = '';

  if(!lignes.length){
    z.innerHTML = '<div class="empty">Aucune génération sur cette période.<br>' +
      '<span style="font-size:12px;">Les bilans dictés et les corrections ' +
      'de procédures apparaîtront ici.</span></div>';
    return;
  }

  /* Le total, en gros : c'est le chiffre qu'on vient chercher. */
  const t = document.createElement('div');
  t.style.cssText = 'border:1px solid var(--accent-text);border-radius:12px;' +
    'padding:13px 14px;margin-bottom:14px;';
  const proj = projectionMensuelle(lignes, bornes.du, bornes.au);
  t.innerHTML =
    '<div style="font-size:12px;color:var(--muted);">' +
      'Du ' + jourLisible(bornes.du) + ' au ' + jourLisible(bornes.au) + '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:baseline;' +
      'margin-top:5px;gap:9px;">' +
      '<strong>' + lignes.length + ' génération(s)</strong>' +
      '<strong style="font-size:24px;">' + argent(totalDesCouts(lignes)) +
      '</strong></div>' +
    /* LE TOTAL DIT LES DEUX MONNAIES, TOUJOURS.

       Celle qu'on regarde en gros, et l'autre juste dessous : le
       jour où le total surprend, la première chose à faire est de
       le comparer à la facture, qui est en dollars. La chercher
       derrière un bouton, c'est la perdre. */
    '<div style="font-size:12px;color:var(--muted);text-align:right;' +
      'margin-top:2px;">soit ' + autreMonnaie(totalDesCouts(lignes)) +
      ' — 1 $ = ' + String(tauxEuro()).replace('.', ',') + ' €</div>' +
    (proj
      ? '<div style="font-size:12px;color:var(--muted);margin-top:6px;' +
        'line-height:1.5;">Soit ' + argent(proj.parJour) + ' par jour sur ' +
        proj.jours + ' jours — <strong>environ ' + argent(proj.parMois) +
        ' par mois</strong> à ce rythme.</div>'
      : '<div style="font-size:12px;color:var(--muted);margin-top:6px;">' +
        'Période trop courte pour estimer un mois.</div>');
  z.appendChild(t);

  z.appendChild(tableauCouts('👤 Par utilisateur', regrouperCouts(lignes, 'qui')));
  z.appendChild(tableauCouts('🧩 Par type de génération', regrouperCouts(lignes, 'quoi')));
  z.appendChild(tableauCouts('📅 Par jour', regrouperCouts(lignes, 'jour'), true));

  z.appendChild(detailDesCouts(lignes));
}

/* Un tableau, trois colonnes : le nom, le nombre, le coût. Les
   jetons vivent dans l'infobulle — ils expliquent le montant, ils
   ne sont pas ce qu'on lit. */
function tableauCouts(titre, groupes, parJour){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:12px 13px;margin-bottom:12px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:800;margin-bottom:8px;';
  t.textContent = titre;
  d.appendChild(t);

  const total = groupes.reduce((s, g) => s + g.cout, 0);
  const liste = parJour
    ? groupes.slice().sort((a, b) => String(b.cle).localeCompare(String(a.cle)))
    : groupes;

  liste.forEach(g => {
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;align-items:baseline;gap:9px;padding:5px 0;' +
      'border-bottom:1px solid var(--line);font-size:13px;';
    l.title = g.entree.toLocaleString('fr-FR') + ' jetons en entrée · ' +
              g.sortie.toLocaleString('fr-FR') + ' en sortie';

    const nom = document.createElement('div');
    nom.style.cssText = 'flex:1;min-width:0;word-break:break-word;';
    nom.textContent = parJour ? jourLisible(g.cle) : g.cle;
    l.appendChild(nom);

    const nb = document.createElement('div');
    nb.style.cssText = 'color:var(--muted);font-size:12px;flex:none;';
    nb.textContent = g.combien + '×';
    l.appendChild(nb);

    const c = document.createElement('div');
    c.style.cssText = 'font-weight:700;flex:none;min-width:74px;text-align:right;';
    c.textContent = argent(g.cout);
    l.appendChild(c);

    d.appendChild(l);

    /* Une barre plutôt qu'un pourcentage : on cherche qui pèse, pas
       combien exactement. */
    if(total > 0){
      const b = document.createElement('div');
      b.style.cssText = 'height:3px;border-radius:2px;background:var(--accent-text);' +
        'opacity:.55;margin:-1px 0 3px;width:' +
        Math.max(1, Math.round((g.cout / total) * 100)) + '%;';
      d.appendChild(b);
    }
  });

  return d;
}

/* Le détail, replié : on l'ouvre quand un total surprend. */
function detailDesCouts(lignes){
  const det = document.createElement('details');
  det.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:10px 13px;';
  det.innerHTML = '<summary style="cursor:pointer;font-size:13px;' +
    'font-weight:700;">🔍 Le détail, génération par génération</summary>';

  const z = document.createElement('div');
  z.style.cssText = 'margin-top:9px;';
  const p = t => String(t == null ? '' : t).replace(/</g, '&lt;');

  lignes.slice(0, 400).forEach(x => {
    const l = document.createElement('div');
    l.style.cssText = 'padding:6px 0;border-bottom:1px solid var(--line);' +
      'font-size:12px;line-height:1.5;';
    l.innerHTML =
      '<div style="display:flex;justify-content:space-between;gap:9px;">' +
        '<span>' + p(x.quand) + '</span>' +
        '<strong>' + argent(x.cout) + '</strong></div>' +
      '<div style="color:var(--muted);">' + p(x.quoi) +
        (x.qui ? ' · ' + p(x.qui) : '') +
        '<br>' + (Number(x.entree) || 0).toLocaleString('fr-FR') + ' → ' +
        (Number(x.sortie) || 0).toLocaleString('fr-FR') + ' jetons' +
        (x.modele ? ' · ' + p(x.modele) : '') +
      '</div>';
    z.appendChild(l);
  });

  if(lignes.length > 400){
    const s = document.createElement('div');
    s.style.cssText = 'font-size:12px;color:var(--muted);margin-top:7px;';
    s.textContent = 'Les 400 plus récentes sont affichées ; les totaux ' +
      'ci-dessus portent bien sur les ' + lignes.length + '.';
    z.appendChild(s);
  }

  det.appendChild(z);
  return det;
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-coutsia.js'] = true;
