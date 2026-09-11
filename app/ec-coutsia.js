/* Déployé le 11/09/2026 à 10:21 — v939 */
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

   D'où la conversion, et une règle : le taux est AFFICHÉ, avec son
   origine. Un taux caché serait pire qu'un chiffre en dollars — on
   ne saurait plus ce qu'on lit. Il se reprend tout seul à la
   Banque centrale européenne, une fois par jour, et se corrige à
   la main quand on préfère celui de son relevé : la banque prend
   sa commission par-dessus le taux officiel.

   ET LA TVA. Les tarifs d'Anthropic sont hors taxes : le classeur
   ne garde donc que du HT. Ce qui sort du compte, lui, est du TTC
   — c'est l'affichage par défaut, à 20 %. Le taux se règle, et se
   met à zéro pour une auto-école facturée en autoliquidation, qui
   déclare la TVA elle-même.

   Change et TVA se posent à l'AFFICHAGE, jamais à
   l'enregistrement. Changer l'un ou l'autre ne réécrit rien, et le
   dollar hors taxes reste la mesure — c'est lui qui fait foi le
   jour où l'on compare avec la facture.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let coutsIa = null;
let coutsPeriode = 'mois';      /* jour · semaine · mois · libre */
let coutsDu = '';
let coutsAu = '';

/* Le même nombre de jours du mois précédent, pour avoir un point de
   comparaison. Null tant qu'on ne l'a pas demandé ; un nombre —
   zéro compris — quand on l'a. La différence compte : « rien du
   tout » et « pas encore demandé » ne s'écrivent pas pareil. */
let coutsMoisAvant = null;

/* Le tarif de Claude Sonnet 5 au 1er septembre 2026, en dollars par
   million de jetons. Anthropic l'annonçait à 2 $ / 10 $ jusqu'au
   31 août 2026, puis 3 $ / 15 $ — c'est ce dernier qui s'applique
   désormais.

   Il se règle dans le Worker (PRIX_IA_ENTREE, PRIX_IA_SORTIE) et
   voyage avec chaque ligne : celui affiché ici n'est qu'un repère
   pour la ligne du haut. */
const PRIX_IA_REPERE = { entree: 3, sortie: 15 };

/* Ce que vaut un dollar en euros quand personne n'a pu le
   demander : un repère de secours, jamais une vérité. */
const TAUX_EURO_REPERE = 0.86;
const CLE_TAUX_EURO = 'ec-taux-euro';

/* La Banque centrale européenne publie ses taux de référence
   chaque jour ouvré, vers 16h. C'est le taux officiel, pas celui
   de la banque : elle prend sa commission par-dessus. */
const URL_TAUX_DU_JOUR =
  'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR';

/* La TVA, en pour cent. 20 % par défaut — le taux français.
   Elle se règle : une auto-école qui a donné son numéro de TVA
   intracommunautaire est facturée en autoliquidation, sans TVA,
   et met alors 0. */
const TVA_DEFAUT = 20;
const CLE_TVA_IA = 'ec-tva-ia';

/* La monnaie affichée. L'euro par défaut : c'est celle du compte
   de l'auto-école. Et le TTC par défaut : c'est ce qui sort du
   compte. */
let coutsMonnaie = 'EUR';
let coutsTTC = true;

/* Une seule tentative de récupération par ouverture d'écran, et le
   motif du dernier échec — affiché plutôt que tu. */
let tauxDemande = false;
let tauxEnPanne = '';


/* ------------------------------------------------------------
   LE TAUX DE CHANGE

   Il se récupère tout seul une fois par jour, et se corrige à la
   main quand on veut celui de son relevé. Le réglage garde donc
   trois choses : le taux, le jour où on l'a obtenu, et s'il vient
   d'une main ou de la BCE — sans quoi la récupération du lendemain
   écraserait une correction faite exprès.
   ------------------------------------------------------------ */
function reglageTaux(){
  try{
    const t = JSON.parse(localStorage.getItem(CLE_TAUX_EURO) || 'null');
    if(t && typeof t === 'object' && t.taux > 0 && t.taux < 10) return t;

    /* L'ancien format : un simple nombre, forcément saisi à la
       main. On ne le jette pas — c'était son choix. */
    const n = parseFloat(localStorage.getItem(CLE_TAUX_EURO));
    if(n > 0 && n < 10) return { taux: n, jour: '', manuel: true };
  }catch(e){ /* stockage refusé : le repère fera */ }
  return { taux: TAUX_EURO_REPERE, jour: '', manuel: false, secours: true };
}

function tauxEuro(){ return reglageTaux().taux; }

function rangerTaux(o){
  try{ localStorage.setItem(CLE_TAUX_EURO, JSON.stringify(o)); }catch(e){}
}

/* Un taux se tape « 0,86 » ici comme partout ailleurs en France.
   Rend faux quand ce n'est pas un taux : on ne garde pas un
   chiffre qui ferait mentir tout l'écran. */
function reglerTauxEuro(v){
  const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
  if(!(n > 0 && n < 10)) return false;
  rangerTaux({ taux: n, manuel: true,
               jour: (typeof todayLocal === 'function') ? todayLocal() : '' });
  return true;
}

/* Faut-il aller le demander ? Une fois par jour, et jamais
   par-dessus un taux corrigé à la main. */
function tauxADemander(jour){
  const r = reglageTaux();
  if(r.manuel) return false;
  return !(r.jour && r.jour === jour);
}

/* Le taux du jour, demandé à la BCE.

   RIEN NE DOIT DÉPENDRE DE SA RÉUSSITE. Un écran de comptabilité
   qui refuserait de s'afficher parce qu'un service extérieur ne
   répond pas serait absurde : en cas d'échec on garde le taux
   qu'on a, et on le dit. */
async function recupererTauxDuJour(force){
  const jour = (typeof todayLocal === 'function') ? todayLocal() : '';
  if(!force && !tauxADemander(jour)) return false;

  const avant = tauxEuro();
  try{
    const rep = await fetch(URL_TAUX_DU_JOUR, { cache: 'no-store' });
    if(!rep.ok) throw new Error('HTTP ' + rep.status);
    const d = await rep.json();
    const n = parseFloat(d && d.rates && d.rates.EUR);
    if(!(n > 0 && n < 10)) throw new Error('taux inattendu');

    tauxEnPanne = '';
    rangerTaux({ taux: n, jour: jour, manuel: false,
                 /* La date de la BCE, pas la nôtre : un lundi
                    matin, c'est encore le taux de vendredi. */
                 date: String((d && d.date) || '') });
    return n !== avant;
  }catch(e){
    tauxEnPanne = String((e && e.message) || e);
    return false;
  }
}


/* ------------------------------------------------------------
   LA TVA
   ------------------------------------------------------------ */
function tva(){
  try{
    const v = parseFloat(localStorage.getItem(CLE_TVA_IA));
    if(v >= 0 && v <= 100) return v;
  }catch(e){}
  return TVA_DEFAUT;
}

/* Zéro est un taux : c'est celui de l'autoliquidation. Le vide,
   lui, n'en est pas un — et ne s'enregistre pas. */
function reglerTva(v){
  const t = String(v == null ? '' : v).replace(',', '.').replace('%', '').trim();
  if(!t) return false;
  const n = parseFloat(t);
  if(!(n >= 0 && n <= 100)) return false;
  try{ localStorage.setItem(CLE_TVA_IA, String(n)); }catch(e){}
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
   affiché à l'écran, et que David peut corriger sur son
   relevé. */
/* ⚠️ NOM PROPRE À CE MODULE — v878. Elle s'appelait « euros »,
   comme celle de ec-paiement.js. Deux fonctions de même nom au niveau
   global, et c'est la dernière chargée qui répond aux deux : ec-paiement gagnait, et un coût en dollars
   se serait affiché tel quel avec un « € » au bout.
   Le nom dit maintenant de quelle écriture de montant il s'agit. Voir
   test-heures-decalees.js, qui refuse désormais tout doublon. */
function eurosDuCout(v){
  return sou((Number(v) || 0) * tauxEuro(), '€');
}

/* Les deux passent par ici : deux façons d'écrire un montant
   finiraient par se contredire d'une colonne à l'autre. */
function sou(n, signe){
  if(n && Math.abs(n) < 0.01) return '< 0,01 ' + signe;
  return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' ' + signe;
}

/* LA TVA S'AJOUTE, ELLE NE SE CONVERTIT PAS.

   Les tarifs d'Anthropic sont hors taxes : ce que le classeur
   garde est donc du HT, et le restera. La TVA est une couche
   d'affichage de plus, comme le change — et dans cet ordre : on
   taxe le prix, puis on le convertit. L'inverse donnerait le même
   chiffre, mais pas la même phrase à écrire dans un livre de
   comptes. */
function avecTva(n){
  return coutsTTC ? n * (1 + tva() / 100) : n;
}

/* UN MONTANT, COMME L'ÉCRAN LE DEMANDE.

   Tout l'écran passe par cette fonction — le total, les tableaux,
   le détail. Basculer un bouton change donc tout d'un coup, et
   aucune colonne ne peut rester en HT pendant que la voisine est
   en TTC. */
function argent(v){
  const n = avecTva(Number(v) || 0);
  return (coutsMonnaie === 'EUR') ? sou(n * tauxEuro(), '€') : sou(n, '$');
}

/* Et le même montant dans l'autre monnaie : le total le dit
   toujours, pour qu'on puisse le comparer à la facture sans
   changer d'écran. */
function autreMonnaie(v){
  const n = avecTva(Number(v) || 0);
  return (coutsMonnaie === 'EUR') ? sou(n, '$') : sou(n * tauxEuro(), '€');
}

/* Le mot qui dit ce qu'on regarde. Il n'apparaît qu'une fois, sur
   le total : le répéter à chaque ligne encombrerait pour rien. */
/* Le même montant hors taxes, dans la monnaie affichée : c'est ce
   chiffre-là qui entre dans un livre de comptes. */
function argentHorsTaxes(v){
  const n = Number(v) || 0;
  return (coutsMonnaie === 'EUR') ? sou(n * tauxEuro(), '€') : sou(n, '$');
}

function mentionTva(){
  if(!coutsTTC) return 'HT';
  const t = tva();
  return t ? 'TTC (TVA ' + String(t).replace('.', ',') + ' %)' : 'TTC';
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

/* ⚠️ LES JOURS QUI COMPTENT SONT CEUX QUI SONT PASSÉS.

   « Ce mois-ci » va du 1er au dernier jour du mois — 30 jours le
   11 septembre, dont dix-neuf qui n'ont pas encore eu lieu. On
   divisait le total par 30 : la moyenne par jour était trois fois
   trop basse, et « environ X par mois » rendait exactement le total
   déjà dépensé. L'écran annonçait donc que le mois coûterait ce
   qu'il avait déjà coûté, en le présentant comme une projection.

   Un jour qui n'a pas eu lieu n'a pas coûté zéro : il n'a rien à
   dire. On ne divise que par les jours écoulés. */
function joursEcoulesDeLaPeriode(du, au){
  const aujourdhui = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);
  const fin = (au && au > aujourdhui) ? aujourdhui : au;
  if(!du || !fin || fin < du) return 0;
  return joursDeLaPeriode(du, fin);
}

/* Le nombre de jours du mois où tombe cette date — 28, 29, 30 ou
   31. Projeter sur « 30 jours » se trompait de deux jours en mars
   et de deux dans l'autre sens en février. */
function joursDuMoisDe(iso){
  const d = new Date(String(iso || '') + 'T12:00:00');
  if(isNaN(d)) return 30;
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/* La période couvre-t-elle un mois civil entier, du 1er au dernier ? */
function estUnMoisEntier(du, au){
  if(!du || !au) return false;
  const d = new Date(du + 'T12:00:00');
  if(isNaN(d)) return false;
  const premier = new Date(d.getFullYear(), d.getMonth(), 1);
  const dernier = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return du === isoDeDate(premier) && au === isoDeDate(dernier);
}

/* Ce que la période laisse présager sur un mois entier.

   On ne l'annonce QUE si assez de jours sont ÉCOULÉS pour que la
   moyenne veuille dire quelque chose : projeter un mois à partir
   d'une matinée donnerait un chiffre au hasard, et un chiffre au
   hasard sur une facture est pire que pas de chiffre. */
function projectionMensuelle(lignes, du, au){
  const jours = joursEcoulesDeLaPeriode(du, au);
  if(!jours || jours < 3) return null;
  const total = totalDesCouts(lignes);
  if(!total) return null;
  const parJour = total / jours;
  /* Sur un mois civil, on projette sur SA longueur et on le dit ;
     ailleurs, la lecture reste « à ce rythme, sur trente jours ». */
  const surUnMois = estUnMoisEntier(du, au);
  const longueur = surUnMois ? joursDuMoisDe(du) : 30;
  return {
    parJour: parJour,
    parMois: parJour * longueur,
    jours: jours,
    longueur: longueur,
    moisCivil: surUnMois
  };
}

/* ⚠️ NOM PROPRE À CE MODULE — v878. Elle s'appelait « joursEntre »,
   comme celle de ec-paie.js. Deux fonctions de même nom au niveau
   global, et c'est la dernière chargée qui répond aux deux : celle-ci gagnait, et la paie, qui appelle
   parfois sans date de fin, recevait 0 jour au lieu de 1.
   Le nom dit maintenant de quelle période il s'agit. Voir
   test-heures-decalees.js, qui refuse désormais tout doublon. */
function joursDeLaPeriode(du, au){
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

  dessinerEcranCouts();

  /* LE TAUX DU JOUR, DEMANDÉ UNE FOIS.

     Il part en arrière-plan : l'écran ne l'attend pas, et se
     redessine seulement s'il a changé quelque chose. Une seule
     tentative par ouverture — s'il ne répond pas, on garde le taux
     qu'on a et on le dit. */
  if(!tauxDemande){
    tauxDemande = true;
    recupererTauxDuJour(false)
      .then(change => { if(change) redessinerCoutsIa(); })
      .catch(() => {});
  }

  chargerCoutsIa();
}

/* Le cadre de l'écran : les réglages en haut, la place de la liste
   en dessous. */
function dessinerEcranCouts(){
  const zone = $('coutsIaZone');
  if(!zone) return;
  zone.innerHTML = '';
  zone.appendChild(blocPeriodeCouts());

  const liste = document.createElement('div');
  liste.id = 'coutsIaListe';
  liste.innerHTML = '<div class="empty">Chargement…</div>';
  zone.appendChild(liste);
}

/* CHANGER DE MONNAIE NE RECHARGE RIEN.

   Les lignes sont déjà là ; seule leur écriture change. Repasser
   par afficherCoutsIa() rappellerait le classeur à chaque appui
   sur « € » — un aller-retour réseau pour repeindre du texte. */
function redessinerCoutsIa(){
  const zone = $('coutsIaZone');
  if(!zone) return;
  dessinerEcranCouts();
  if(coutsIa) dessinerCoutsIa(bornesDeLaPeriode(coutsPeriode, coutsDu, coutsAu));
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
  aide.innerHTML = 'Anthropic facture en dollars <strong>hors taxes</strong> : ' +
    'la TVA et les euros sont ajoutés à l\'affichage, aux taux ci-dessus. ' +
    'Le relevé bancaire fera toujours un peu plus — la banque prend sa ' +
    'commission de change au passage. En autoliquidation (numéro de TVA ' +
    'intracommunautaire donné à Anthropic), mets la TVA à 0. ' +
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
  z.style.cssText = 'margin-top:10px;padding-top:10px;' +
    'border-top:1px solid var(--line);';

  /* Ligne 1 : ce qu'on regarde. */
  const l1 = document.createElement('div');
  l1.style.cssText = 'display:flex;gap:7px;align-items:center;flex-wrap:wrap;';

  const bouton = (actif, nom, quand) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (actif ? 'btn-primary' : 'btn-secondary');
    b.style.cssText = 'flex:none;padding:8px 13px;font-size:13px;margin:0;';
    b.textContent = nom;
    b.addEventListener('click', () => { quand(); redessinerCoutsIa(); });
    return b;
  };

  l1.appendChild(bouton(coutsMonnaie === 'EUR', '€ Euros',
                        () => { coutsMonnaie = 'EUR'; }));
  l1.appendChild(bouton(coutsMonnaie === 'USD', '$ Dollars',
                        () => { coutsMonnaie = 'USD'; }));

  const sep = document.createElement('span');
  sep.style.cssText = 'width:1px;height:22px;background:var(--line);margin:0 3px;';
  l1.appendChild(sep);

  l1.appendChild(bouton(coutsTTC, 'TTC', () => { coutsTTC = true; }));
  l1.appendChild(bouton(!coutsTTC, 'HT', () => { coutsTTC = false; }));
  z.appendChild(l1);

  /* Ligne 2 : les deux réglages qui font le chiffre. */
  const l2 = document.createElement('div');
  l2.style.cssText = 'display:flex;gap:12px;align-items:center;flex-wrap:wrap;' +
    'margin-top:9px;font-size:12px;color:var(--muted);';

  const cadre = (avant, apres, valeur, poser) => {
    const c = document.createElement('div');
    c.style.cssText = 'display:flex;align-items:center;gap:5px;';
    const a = document.createElement('span');
    a.textContent = avant;
    c.appendChild(a);
    const ch = document.createElement('input');
    ch.type = 'text';
    ch.inputMode = 'decimal';
    ch.value = valeur;
    ch.style.cssText = 'width:66px;margin:0;padding:6px;text-align:center;' +
      'font-size:13px;';
    ch.addEventListener('change', () => {
      /* Une valeur impossible ne s'enregistre pas. On redessine
         dans les deux cas : la case reprend alors celle qui vaut,
         et l'écran ne peut pas mentir sur ce qu'il applique. */
      poser(ch.value);
      redessinerCoutsIa();
    });
    c.appendChild(ch);
    const b = document.createElement('span');
    b.textContent = apres;
    c.appendChild(b);
    return c;
  };

  l2.appendChild(cadre('1 $ =', '€',
    String(tauxEuro()).replace('.', ','), reglerTauxEuro));

  /* Reprendre le taux du jour : c'est ce bouton, et lui seul, qui
     efface une correction faite à la main. */
  const bMaj = document.createElement('button');
  bMaj.type = 'button';
  bMaj.className = 'btn btn-secondary';
  bMaj.style.cssText = 'flex:none;padding:6px 9px;font-size:13px;margin:0;';
  bMaj.textContent = '↻';
  bMaj.title = 'Reprendre le taux du jour de la Banque centrale européenne';
  bMaj.addEventListener('click', async () => {
    bMaj.disabled = true;
    bMaj.textContent = '…';
    await recupererTauxDuJour(true);
    redessinerCoutsIa();
  });
  l2.appendChild(bMaj);

  l2.appendChild(cadre('TVA', '%',
    String(tva()).replace('.', ','), reglerTva));
  z.appendChild(l2);

  /* Ligne 3 : d'où vient ce taux. Un taux dont on ignore l'origine
     ne vaut pas mieux qu'un chiffre en dollars. */
  const r = reglageTaux();
  const l3 = document.createElement('div');
  l3.style.cssText = 'font-size:11px;color:var(--muted);margin-top:7px;' +
    'line-height:1.5;';
  l3.textContent = tauxEnPanne
    ? '⚠️ Taux du jour injoignable (' + tauxEnPanne + ') — celui affiché ' +
      'est le dernier connu. Tu peux le corriger à la main.'
    : r.manuel
    ? 'Taux saisi à la main. Le ↻ reprend celui de la BCE.'
    : r.secours
    ? "Taux de secours, jamais mis à jour : appuie sur ↻."
    : 'Taux BCE' + (r.date ? ' du ' + jourLisible(r.date) : '') +
      ', repris tout seul une fois par jour.';
  z.appendChild(l3);

  return z;
}

/* LE MÊME NOMBRE DE JOURS DU MOIS PRÉCÉDENT.

   David : « le mois ». Un mois se compare à un mois — mais pas un
   mois commencé à un mois entier : le 11 septembre contre tout
   août, la hausse serait inventée. On s'arrête au même jour, et
   quand le mois précédent est plus court (le 31 mars contre
   février), au dernier jour qu'il possède. */
function bornesMoisPrecedentAuMemeJour(du){
  const d = new Date(String(du || '') + 'T12:00:00');
  if(isNaN(d)) return null;
  const aujourdhui = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);
  const auj = new Date(aujourdhui + 'T12:00:00');
  if(isNaN(auj)) return null;
  /* Seulement pour le mois EN COURS : ailleurs, « le même jour »
     ne veut rien dire. */
  if(auj.getFullYear() !== d.getFullYear() || auj.getMonth() !== d.getMonth()){
    return null;
  }
  const premier = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const longueur = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
  const jours = Math.min(auj.getDate(), longueur);
  const dernier = new Date(premier.getFullYear(), premier.getMonth(), jours);
  return { du: isoDeDate(premier), au: isoDeDate(dernier), jours: jours };
}

async function chargerCoutsIa(){
  const z = $('coutsIaListe');
  if(!z) return;
  const b = bornesDeLaPeriode(coutsPeriode, coutsDu, coutsAu);
  z.innerHTML = '<div class="empty">Chargement…</div>';

  /* Les deux lectures partent ENSEMBLE. En série, on attendrait la
     somme des deux délais pour un chiffre de comparaison ; et si
     celle du mois précédent échoue, l'écran s'affiche quand même
     sans elle — une comparaison manquante n'empêche pas de lire
     son total. */
  const avant = (coutsPeriode === 'mois') ? bornesMoisPrecedentAuMemeJour(b.du) : null;
  coutsMoisAvant = null;

  let d, dAvant;
  try{
    [d, dAvant] = await Promise.all([
      appelPrep({ action: 'coutIaList', du: b.du, au: b.au }),
      avant
        ? appelPrep({ action: 'coutIaList', du: avant.du, au: avant.au })
            .catch(() => null)
        : Promise.resolve(null)
    ]);
    coutsIa = (d && d.lignes) || [];
  }catch(e){
    z.innerHTML = '<div class="empty">Coûts indisponibles : ' +
      String(e.message).replace(/</g, '&lt;') + '</div>';
    return;
  }

  if(avant && dAvant){
    coutsMoisAvant = {
      total: totalDesCouts(dAvant.lignes || []),
      du: avant.du, au: avant.au, jours: avant.jours
    };
  }

  dessinerCoutsIa(b);
}

/* CE QU'ON PROJETTE, ET SUR COMBIEN DE JOURS ON L'A DÉDUIT.

   Le nombre de jours écoulés est écrit à côté du chiffre : un
   chiffre déduit a l'air d'un chiffre su, et celui-ci vaut ce que
   valent les jours qui l'ont produit. Trois jours de septembre ne
   promettent pas un mois. */
function ligneProjection(proj){
  const style = 'font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5;';
  if(!proj){
    return '<div style="' + style + '">Trop peu de jours écoulés pour estimer ' +
           'la fin du mois.</div>';
  }
  return '<div style="' + style + '">Soit ' + argent(proj.parJour) +
    ' par jour sur ' + proj.jours + ' jour' + (proj.jours > 1 ? 's' : '') +
    ' écoulé' + (proj.jours > 1 ? 's' : '') + ' — <strong>environ ' +
    argent(proj.parMois) +
    (proj.moisCivil
      ? ' sur le mois entier</strong> (' + proj.longueur + ' jours)'
      : ' sur trente jours</strong>') +
    ' à ce rythme.</div>';
}

/* LE MOIS PRÉCÉDENT, AU MÊME JOUR.

   Sans comparaison, un total est un nombre : on ne sait pas s'il
   est gros. Avec une comparaison mal bornée, c'est pire — un mois
   commencé contre un mois entier annoncerait une baisse à chaque
   début de mois. Les deux bornes sont posées par
   « bornesMoisPrecedentAuMemeJour », et le nombre de jours comparés
   est écrit. */
function ligneComparaisonMois(){
  if(!coutsMoisAvant) return '';
  const style = 'font-size:12px;color:var(--muted);margin-top:4px;line-height:1.5;';
  const n = coutsMoisAvant.jours;
  const combien = n + ' premier' + (n > 1 ? 's' : '') + ' jour' + (n > 1 ? 's' : '');

  if(!coutsMoisAvant.total){
    return '<div style="' + style + '">Rien de comparable sur les ' + combien +
           ' du mois précédent.</div>';
  }
  const maintenant = totalDesCouts(coutsIa || []);
  const ecart = maintenant - coutsMoisAvant.total;
  const pct = Math.round((ecart / coutsMoisAvant.total) * 100);
  const signe = ecart > 0 ? '+' : (ecart < 0 ? '−' : '');
  const couleur = ecart > 0 ? 'var(--ambre)' : 'var(--accent-text)';
  return '<div style="' + style + '">Sur les ' + combien + ' du mois précédent : ' +
    argent(coutsMoisAvant.total) +
    (ecart
      ? ' — <strong style="color:' + couleur + ';">' + signe +
        argent(Math.abs(ecart)) + ' (' + signe + Math.abs(pct) + ' %)</strong>'
      : ' — <strong>à l’euro près le même</strong>') +
    '.</div>';
}

/* ------------------------------------------------------------
   LE COÛT PAR JOUR, EN BARRES

   Le tableau « Par jour » donne les nombres ; il ne montre pas
   qu'un jour a coûté quatre fois les autres. Une seule série, donc
   aucune légende : le titre la nomme. Une seule échelle, en euros.

   Les jours SANS génération sont dessinés à zéro plutôt que sautés :
   un creux qui disparaît, c'est une semaine qui a l'air pleine.
   ------------------------------------------------------------ */
function joursEntreBornes(du, au){
  const out = [];
  if(!du || !au) return out;
  const d = new Date(du + 'T12:00:00'), f = new Date(au + 'T12:00:00');
  if(isNaN(d) || isNaN(f)) return out;
  for(let x = d; x <= f; x.setDate(x.getDate() + 1)) out.push(isoDeDate(x));
  return out;
}

function graphiqueParJour(lignes, bornes){
  const aujourdhui = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);
  const fin = (bornes.au > aujourdhui) ? aujourdhui : bornes.au;
  const jours = joursEntreBornes(bornes.du, fin);
  if(jours.length < 3) return null;      /* deux barres ne sont pas un graphique */

  /* ⚠️ ON ACCUMULE LE COÛT BRUT, PAS SON ÉCRITURE.
     « eurosDuCout » rend « 1,42 € » — du texte. L'additionner
     donnerait « 0 » ou un collage de chiffres. Le montant se
     totalise en dollars, comme partout ailleurs dans ce fichier,
     et ne devient lisible qu'au dernier moment, par « argent ». */
  const parJour = {};
  (lignes || []).forEach(l => {
    const k = String(l.jour || '').slice(0, 10);
    parJour[k] = (parJour[k] || 0) + (Number(l.cout) || 0);
  });

  const valeurs = jours.map(j => parJour[j] || 0);
  const max = Math.max.apply(null, valeurs);
  if(!max) return null;

  const L = 620, H = 150, base = 118, haut = 96;
  const pas = L / jours.length;
  const larg = Math.max(2, pas - 2);     /* 2 px de fond entre deux barres */

  let barres = '';
  valeurs.forEach((v, i) => {
    const h = Math.max(v > 0 ? 2 : 0, Math.round(haut * v / max));
    if(!h) return;
    barres += '<rect x="' + (i * pas + 1).toFixed(1) + '" y="' + (base - h) +
      '" width="' + larg.toFixed(1) + '" height="' + h +
      '" rx="2" fill="var(--bleu)"><title>' + jourLisible(jours[i]) + ' — ' +
      argent(v) + '</title></rect>';
  });

  /* Trois repères horizontaux, discrets : ils aident à situer une
     barre sans prétendre à une graduation précise. */
  let grille = '';
  [0, 0.5, 1].forEach(k => {
    const y = base - haut * k;
    grille += '<line x1="0" y1="' + y + '" x2="' + L + '" y2="' + y +
      '" stroke="var(--line)" stroke-width="1"/>';
  });

  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:12px 13px;margin-bottom:12px;';
  d.innerHTML =
    '<div style="font-size:13px;font-weight:800;">📈 Coût par jour</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-bottom:8px;">' +
      'Le plus cher : ' + argent(max) + '. Les jours sans génération sont à zéro.</div>' +
    '<svg viewBox="0 0 ' + L + ' ' + H + '" style="width:100%;height:auto;display:block;" ' +
      'role="img" aria-label="Coût par jour, du ' + jourLisible(bornes.du) +
      ' au ' + jourLisible(fin) + ', en euros. Le plus cher : ' + argent(max) + '.">' +
      grille + barres +
      '<text x="0" y="' + (base + 24) + '" fill="var(--muted)" font-size="12">' +
        jourLisible(jours[0]) + '</text>' +
      '<text x="' + L + '" y="' + (base + 24) + '" fill="var(--muted)" font-size="12" ' +
        'text-anchor="end">' + jourLisible(jours[jours.length - 1]) + '</text>' +
    '</svg>';
  return d;
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
      '<span style="font-size:12px;font-weight:600;color:var(--muted);"> ' +
      mentionTva() + '</span></strong></div>' +
    /* LE TOTAL DIT TOUT CE QU'IL FAUT POUR LE VÉRIFIER.

       L'autre monnaie, l'autre base, et le taux : le jour où le
       total surprend, la première chose à faire est de le comparer
       à la facture — qui est en dollars hors taxes. La chercher
       derrière un bouton, c'est la perdre. */
    '<div style="font-size:12px;color:var(--muted);text-align:right;' +
      'margin-top:2px;line-height:1.5;">soit ' +
      autreMonnaie(totalDesCouts(lignes)) + ' ' + mentionTva() +
      (coutsTTC && tva()
        ? '<br>' + argentHorsTaxes(totalDesCouts(lignes)) + ' HT' : '') +
      '<br>1 $ = ' + String(tauxEuro()).replace('.', ',') + ' €</div>' +
    ligneProjection(proj) + ligneComparaisonMois();
  z.appendChild(t);

  const g = graphiqueParJour(lignes, bornes);
  if(g) z.appendChild(g);

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
