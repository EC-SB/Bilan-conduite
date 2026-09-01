/* Déployé le 01/09/2026 à 16:49 — v784 */
/* ============================================================
   ec-loupe.js
   Chercher un élève, d'où qu'on soit.

   On pense « Léa », pas « quel écran ». L'outil obligeait à
   traduire : Élèves → Historique pour voir ses cours, Élèves →
   Répertoire pour corriger son numéro. Deux chemins à connaître
   pour deux gestes qu'on fait dix fois par jour.

   ─ DEUX PARTIS PRIS ─

   ELLE CHERCHE DANS LA MÉMOIRE DU TÉLÉPHONE. Les noms d'élèves y
   sont déjà (« eleves_connus »). Filtrer une liste en mémoire ne
   coûte rien, et se fait à la frappe. AUCUN appel réseau tant
   qu'on n'a pas choisi quoi faire — la loupe est donc plus rapide
   que le chemin qu'elle remplace, où il fallait taper un nom PUIS
   déclencher une recherche serveur.

   ELLE NE PROPOSE QUE CE QUI EXISTE. « Modifier le questionnaire »
   manque à cette liste, et c'est voulu : le questionnaire n'est
   pas un écran qui enregistre, c'est un formulaire dont les
   réponses sont consommées par le cours. L'ouvrir ici demanderait
   de lui écrire un SECOND chemin d'enregistrement — et un même
   travail écrit à deux endroits, c'est la faute qu'on passe la
   semaine à réparer ailleurs. Il y viendra, quand il aura un vrai
   enregistrement, écrit une fois.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Ce que la loupe sait faire. Chaque action dit à quel droit elle
   tient : proposer un écran qu'on ne peut pas ouvrir serait pire
   que de ne rien proposer. */
const ACTIONS_LOUPE = [
  { cle: 'cours', droit: 'recherche', emoji: '📚',
    titre: 'Voir ses derniers cours',
    detail: "Ouvre l'historique de ses leçons" },
  { cle: 'fiche', droit: 'eleves', emoji: '✏️',
    titre: 'Modifier sa fiche identité',
    detail: 'Téléphone, mail, Messenger, ANTS, formation' }
];

function actionsLoupeDisponibles(){
  return ACTIONS_LOUPE.filter(a =>
    typeof aDroit !== 'function' || aDroit(a.droit));
}

/* Le bouton ne s'affiche que s'il mène quelque part. Un droit qui
   ne mène nulle part est pire qu'un droit refusé : on croit
   l'avoir donné. */
function majBoutonLoupe(){
  const b = $('loupeBtn');
  if(!b) return;
  b.style.display = actionsLoupeDisponibles().length ? '' : 'none';
}

function ouvrirLoupe(){
  const actions = actionsLoupeDisponibles();
  if(!actions.length) return;

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(460px, 94vw);';

  boite.innerHTML =
    '<h3>🔍 Chercher un élève</h3>' +
    '<input type="text" id="loupeChamp" autocomplete="off" ' +
      'placeholder="Son nom ou son prénom" ' +
      'style="margin-bottom:4px;">' +
    '<div id="loupeEtat" style="font-size:12px;color:var(--muted);' +
    'line-height:1.5;margin-bottom:10px;"></div>' +
    '<div id="loupeListe" style="max-height:46vh;overflow-y:auto;"></div>';

  const fermer = () => {
    if(fond.parentNode) document.body.removeChild(fond);
  };

  const rangee = document.createElement('div');
  rangee.className = 'btn-row';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Fermer';
  bAnn.addEventListener('click', fermer);
  rangee.appendChild(bAnn);
  boite.appendChild(rangee);

  fond.appendChild(boite);
  document.body.appendChild(fond);

  const champ = boite.querySelector('#loupeChamp');
  const etat = boite.querySelector('#loupeEtat');
  const liste = boite.querySelector('#loupeListe');

  /* Les noms connus, tels qu'ils sont déjà en mémoire. */
  const tous = (typeof elevesConnus !== 'undefined' && Array.isArray(elevesConnus))
    ? elevesConnus.slice() : [];

  if(!tous.length){
    etat.innerHTML = "⚠️ <strong>Aucun élève en mémoire sur cet appareil.</strong> " +
      'Ouvre une fois la recherche ou le répertoire, puis reviens ici.';
  }

  const dessiner = () => {
    const q = (typeof normaliserMot === 'function')
      ? normaliserMot(champ.value) : champ.value.toLowerCase().trim();

    liste.innerHTML = '';
    if(!tous.length) return;

    if(!q){
      etat.textContent = tous.length + ' élève(s) connu(s) — tape les ' +
        'premières lettres.';
      return;
    }

    const trouves = tous.filter(n => {
      const c = (typeof normaliserMot === 'function')
        ? normaliserMot(n) : String(n).toLowerCase();
      return c.indexOf(q) !== -1;
    }).slice(0, 40);

    if(!trouves.length){
      /* « Rien trouvé » ne doit pas vouloir dire « il n'existe
         pas » : cette liste est celle de CET appareil. */
      etat.innerHTML = 'Aucun élève de ce nom <strong>dans la mémoire de ' +
        'cet appareil</strong>. Il existe peut-être quand même — ' +
        "cherche-le dans l'historique des leçons.";
      return;
    }

    etat.textContent = trouves.length + ' trouvé(s)' +
      (trouves.length === 40 ? ' (40 premiers)' : '');

    trouves.forEach(nom => {
      const d = document.createElement('div');
      d.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
        'padding:9px 11px;margin-bottom:7px;';

      const t = document.createElement('div');
      t.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:7px;';
      t.textContent = nom;
      d.appendChild(t);

      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:7px;flex-wrap:wrap;';

      actions.forEach(a => {
        const b = document.createElement('button');
        b.className = 'btn btn-secondary';
        b.style.cssText = 'width:auto;padding:8px 11px;font-size:13px;margin:0;';
        b.textContent = a.emoji + ' ' + a.titre;
        b.title = a.detail;
        b.addEventListener('click', () => {
          fermer();
          lancerActionLoupe(a.cle, nom);
        });
        r.appendChild(b);
      });

      d.appendChild(r);
      liste.appendChild(d);
    });
  };

  champ.addEventListener('input', dessiner);
  /* Entrée sur un seul résultat : on ne fait pas cliquer pour
     rien. Sur plusieurs, on ne devine pas. */
  champ.addEventListener('keydown', e => {
    if(e.key !== 'Enter') return;
    const seul = liste.querySelectorAll('button');
    if(seul.length === actions.length && actions.length) seul[0].click();
  });

  dessiner();
  setTimeout(() => champ.focus(), 80);
}

/* Ce que fait chaque action. Elle ne réinvente rien : elle emmène
   sur l'écran qui sait déjà faire, et le met en route. */
function lancerActionLoupe(cle, nom){
  if(cle === 'fiche'){
    if(typeof ouvrirFicheEleve !== 'function'){
      showToast('Le répertoire n\'est pas disponible sur cet écran.');
      return;
    }
    ouvrirFicheEleve(nom, (typeof ficheDe === 'function') ? ficheDe(nom) : null);
    return;
  }

  if(cle === 'cours'){
    const champ = $('searchName');
    if(!champ || typeof rechercherEleve !== 'function'){
      showToast("L'historique n'est pas disponible sur cet écran.");
      return;
    }
    champ.value = nom;

    /* L'écran d'abord, la recherche ensuite : lancer l'appel sans
       amener le moniteur devant le résultat le laisserait devant
       une page qui ne bouge pas. */
    if(typeof afficherOnglet === 'function') afficherOnglet('eleves');
    if(typeof afficherVue === 'function') afficherVue('eleves', 'recherche');

    const carte = document.querySelector('[data-vue="recherche"]');
    if(carte && carte.scrollIntoView){
      carte.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    rechercherEleve();
  }
}


/* ============================================================
   LE MENU ⋯ — CE QUI NE SERT PAS TOUS LES JOURS
   ============================================================ */
function brancherMenuPlus(){
  const b = $('plusBtn');
  const m = $('plusMenu');
  if(!b || !m || b.dataset.branche) return;
  b.dataset.branche = 'oui';

  /* Ouvert / fermé se lit et s'écrit au MÊME endroit : le
     « display » du bloc. C'est l'attribut « hidden » qui m'avait
     eu — il pose « display:none », et le style inline du menu
     disait « display:flex ». L'inline gagne, le menu restait
     ouvert. */
  const ouvert = () => m.style.display !== 'none';
  const fermer = () => { m.style.display = 'none'; };
  const ouvrir = () => { m.style.display = 'flex'; };

  b.addEventListener('click', e => {
    e.stopPropagation();
    if(ouvert()) fermer(); else ouvrir();
  });

  /* Un menu qui ne se referme pas au premier clic à côté finit
     par rester ouvert par-dessus le travail. */
  document.addEventListener('click', e => {
    if(!ouvert()) return;
    if(m.contains(e.target) || b.contains(e.target)) return;
    fermer();
  });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape') fermer();
  });
  m.addEventListener('click', e => {
    if(e.target.closest('a, button')) fermer();
  });
}

function brancherLoupe(){
  const b = $('loupeBtn');
  if(b && !b.dataset.branche){
    b.dataset.branche = 'oui';
    b.addEventListener('click', ouvrirLoupe);
  }
  brancherMenuPlus();
  majBoutonLoupe();
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-loupe.js'] = true;
