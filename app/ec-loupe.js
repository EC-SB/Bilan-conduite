/* Déployé le 17/09/2026 à 12:44 — v1018 */
/* ============================================================
   ec-loupe.js
   Chercher un élève, d'où qu'on soit.

   On pense « Léa », pas « quel écran ». L'outil obligeait à
   traduire : Élèves → Historique pour voir ses cours, Élèves →
   Répertoire pour corriger son numéro.

   ─ DEUX PARTIS PRIS ─

   ELLE CHERCHE DANS LA MÉMOIRE DU TÉLÉPHONE. Les noms d'élèves y
   sont déjà (« eleves_connus »). Filtrer une liste en mémoire ne
   coûte rien, et se fait à la frappe. AUCUN appel réseau tant
   qu'on n'a pas choisi quoi faire — la loupe est donc plus rapide
   que le chemin qu'elle remplace, où il fallait taper un nom PUIS
   déclencher une recherche serveur.

   ELLE NE DÉCIDE PLUS OÙ ALLER. Depuis la v785 elle mène à un seul
   endroit : le dossier de l'élève, qui contient les deux
   destinations d'avant et le reste. Elle ne connaît donc plus
   aucun écran de destination — c'est le dossier qui sait ce qu'il
   contient. Un tri de moins à tenir à jour ici.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* CE QUE LA LOUPE SAIT FAIRE : UNE SEULE CHOSE, MAINTENANT.

   Elle en proposait deux — « voir ses cours » et « modifier sa
   fiche » — parce que c'étaient les deux écrans qui existaient.
   Depuis la v785 il y a un endroit qui contient les deux et le
   reste : le dossier de l'élève. On tape le nom, on arrive.
   Choisir entre deux boutons qui mènent au même endroit n'est pas
   un choix, c'est un tap de plus.

   ⚠️ ET DEPUIS LA v1015, LE BOUTON LUI-MÊME A DISPARU. Il restait
   un « 👤 Ouvrir son dossier » sous chaque nom : le dernier reste
   du temps où il fallait choisir. Un bouton unique n'est pas un
   choix non plus — c'est le nom qu'on veut taper. L'entrée garde
   son ÉMOJI, son TITRE et son DÉTAIL nulle part : ce qui ne
   s'affiche plus ne se maintient plus.

   Ce qui reste, et c'est tout ce qui comptait : le DROIT. Ouvrir
   une recherche qui ne mène nulle part serait pire que ne pas
   l'ouvrir. */
const ACTIONS_LOUPE = [
  { cle: 'dossier', droit: 'eleves' }
];

function actionsLoupeDisponibles(){
  return ACTIONS_LOUPE.filter(a =>
    typeof aDroit !== 'function' || aDroit(a.droit));
}


/* ============================================================
   ELLE CHERCHE AUSSI LES ÉCRANS — v1018

   David : « la loupe ne cherche que des élèves ». Il y a
   quarante-sept écrans derrière six onglets, et retrouver « les
   écoutes pédagogiques » demande de savoir qu'elles sont dans
   Suivi. On pense « écoutes », pas « quel onglet » — c'est
   exactement la phrase qui a fait naître cette loupe.

   ⚠️ LES ÉCRANS, ET PAS « TOUT ». On aurait pu y mettre les
   véhicules, les procédures, les sessions. Chacune de ces listes
   n'est en mémoire QUE si on a déjà ouvert son écran : la loupe
   trouverait un véhicule le mardi et pas le lundi, sans que
   personne puisse comprendre pourquoi. Une recherche qui ne trouve
   que ce qu'on a déjà ouvert est pire qu'une recherche qui ne
   cherche qu'une chose — elle donne l'air de chercher partout.

   La table VUES, elle, est TOUJOURS là : elle est dans le code,
   elle porte le droit de chaque écran, et elle ne coûte rien. Et
   elle reste la seule : un écran ajouté demain est trouvable sans
   que personne y pense.
   ============================================================ */
function ecransTrouvables(q){
  if(typeof VUES === 'undefined' || !VUES) return [];

  const cible = (typeof normaliserMot === 'function')
    ? normaliserMot(q) : String(q || '').toLowerCase().trim();
  if(!cible) return [];

  const noms = (typeof ONGLETS_DROITS !== 'undefined')
    ? ONGLETS_DROITS.reduce((m, o) => { m[o.cle] = o.nom; return m; }, {})
    : {};

  const out = [];
  Object.keys(VUES).forEach(onglet => {
    (VUES[onglet] || []).forEach(v => {
      const cle = v[0], nom = v[1], droit = v[2];

      /* Proposer un écran qu'on ne peut pas ouvrir serait pire que
         de ne rien proposer — la même règle que pour le dossier. */
      if(typeof aDroit === 'function'){
        const ok = Array.isArray(droit) ? droit.some(aDroit) : aDroit(droit);
        if(!ok) return;
      }

      /* On cherche dans le nom de l'écran ET dans celui de son
         onglet : « permis » doit rendre les écrans de Permis. */
      const ongletNom = noms[onglet] || onglet;
      const dedans = s => ((typeof normaliserMot === 'function')
        ? normaliserMot(s) : String(s).toLowerCase()).indexOf(cible) !== -1;

      if(dedans(nom) || dedans(ongletNom)){
        out.push({ onglet: onglet, vue: cle, nom: nom, ou: ongletNom });
      }
    });
  });

  return out.slice(0, 8);
}


/* Y aller. On emprunte la porte des tuiles — elle sait déjà changer
   d'onglet puis de vue, et une deuxième façon de naviguer serait
   celle qu'on oublie de corriger. */
function ouvrirLEcran(x){
  if(!x) return;
  if(typeof ouvrirLaTuile === 'function'){
    /* Un onglet volontairement différent du sien : c'est ce qui
       déclenche le changement d'onglet dans ouvrirLaTuile. */
    const depuis = (typeof ongletActif !== 'undefined' && ongletActif !== x.onglet)
      ? ongletActif : '';
    ouvrirLaTuile(depuis, { onglet: x.onglet, vue: x.vue });
    return;
  }
  if(typeof afficherOnglet === 'function') afficherOnglet(x.onglet);
  if(typeof afficherVue === 'function') afficherVue(x.onglet, x.vue);
}

/* Le bouton ne s'affiche que s'il mène quelque part. Un droit qui
   ne mène nulle part est pire qu'un droit refusé : on croit
   l'avoir donné. */
function majBoutonLoupe(){
  const b = $('loupeBtn');
  if(!b) return;
  b.style.display = actionsLoupeDisponibles().length ? '' : 'none';
}

/* ELLE S'OUVRE SUR UNE LISTE, PAS SUR UN CHAMP VIDE.

   « Fait en sorte qu'elle s'ouvre directement quand on appuie
   dessus. » Elle s'ouvrait déjà — mais sur un titre, un champ
   éteint et une phrase qui disait de taper. Trois choses à lire
   avant de pouvoir faire quoi que ce soit.

   Deux corrections, et c'est tout :

   ⚠️ LE FOCUS EST SYNCHRONE. Il était dans un setTimeout de 80 ms.
   Sur iPhone, le clavier ne monte QUE si le focus part du geste de
   l'utilisateur ; passé par une minuterie, le lien est rompu et le
   clavier reste en bas. Le moniteur voyait la fenêtre s'ouvrir et
   devait taper une deuxième fois DANS le champ. C'est exactement
   le tap qu'on enlève de l'autre côté.

   LA LISTE EST DÉJÀ REMPLIE. Une recherche vide rendait un compte
   (« 213 élève(s) connu(s) ») au lieu des élèves. Maintenant elle
   rend les premiers noms : on peut taper sur quelqu'un sans avoir
   rien écrit, et le champ ne sert plus qu'à réduire. */
function ouvrirLoupe(){
  const actions = actionsLoupeDisponibles();
  if(!actions.length) return;

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  /* En haut de l'écran, pas au milieu : la liste pousse vers le
     bas sous le champ, comme le répertoire du téléphone. Centrée,
     elle sautait de place à chaque lettre tapée. */
  fond.style.alignItems = 'flex-start';
  fond.style.paddingTop = '5vh';

  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(460px, 94vw);padding:14px;';

  /* La loupe DANS le champ, comme sur sa capture : le titre
     « 🔍 Chercher un élève » répétait le bouton sur lequel on
     venait d'appuyer. */
  boite.innerHTML =
    '<div style="position:relative;">' +
      '<input type="text" id="loupeChamp" autocomplete="off" ' +
        'placeholder="Un élève, un écran" ' +
        'style="margin-bottom:6px;padding-right:42px;">' +
      '<span aria-hidden="true" style="position:absolute;right:13px;top:0;' +
      'height:100%;display:flex;align-items:center;font-size:17px;' +
      'pointer-events:none;opacity:.75;padding-bottom:6px;">🔍</span>' +
    '</div>' +
    '<div id="loupeEtat" style="font-size:12px;color:var(--muted);' +
    'line-height:1.5;margin-bottom:8px;"></div>' +
    '<div id="loupeListe" style="max-height:58vh;overflow-y:auto;"></div>';

  const fermer = () => {
    if(fond.parentNode) fermerFond(fond);
  };

  const rangee = document.createElement('div');
  rangee.className = 'btn-row';
  rangee.style.marginTop = '10px';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Fermer';
  bAnn.addEventListener('click', fermer);
  rangee.appendChild(bAnn);
  boite.appendChild(rangee);

  fond.appendChild(boite);
  document.body.appendChild(fond);

  /* Un clic à côté et Échap ferment aussi. Une fenêtre de
     recherche qu'on ouvre par erreur ne doit pas obliger à viser
     un bouton pour s'en aller. */
  fond.addEventListener('click', e => { if(e.target === fond) fermer(); });
  const auClavier = e => {
    if(e.key !== 'Escape') return;
    document.removeEventListener('keydown', auClavier);
    fermer();
  };
  document.addEventListener('keydown', auClavier);

  const champ = boite.querySelector('#loupeChamp');
  const etat = boite.querySelector('#loupeEtat');
  const liste = boite.querySelector('#loupeListe');

  /* Les noms connus, tels qu'ils sont déjà en mémoire — noms des
     bilans ET fiches du répertoire. Elle ne lisait que les
     premiers : un élève inscrit qui n'avait pas encore de bilan
     était introuvable ici, alors qu'il était bien au répertoire. */
  const tous = (typeof nomsConnusEleves === 'function')
    ? nomsConnusEleves()
    : ((typeof elevesConnus !== 'undefined' && Array.isArray(elevesConnus))
        ? elevesConnus.slice() : []);

  if(!tous.length){
    etat.innerHTML = "⚠️ <strong>Aucun élève en mémoire sur cet appareil.</strong> " +
      'Ouvre une fois la recherche ou le répertoire, puis reviens ici.';
  }

  /* Y aller. Le nom EST le bouton : plus de carte avec « Ouvrir son
     dossier » dedans. */
  const yAller = nom => { fermer(); lancerActionLoupe('dossier', nom); };

  const allerALEcran = x => { fermer(); ouvrirLEcran(x); };

  /* Les écrans qui correspondent, sous les élèves. Écrit une fois,
     parce que la recherche vide, la recherche fructueuse et la
     recherche bredouille les posent toutes les trois — et trois
     copies d'une même liste, c'est la faute de la maison. */
  const poserLesEcrans = () => {
    const ecrans = (typeof ecransTrouvables === 'function')
      ? ecransTrouvables(champ.value) : [];
    if(!ecrans.length) return 0;

    const t = document.createElement('div');
    t.style.cssText = 'font-size:11px;color:var(--muted);font-weight:700;' +
      'margin:12px 0 6px;text-transform:uppercase;letter-spacing:.5px;';
    t.textContent = 'Écrans';
    liste.appendChild(t);

    ecrans.forEach(x => {
      const b = document.createElement('button');
      b.className = 'ligneEleve';
      b.type = 'button';

      const rond = document.createElement('span');
      rond.className = 'ligneEleveRond';
      /* L'emoji de l'écran plutôt que des initiales : c'est à lui
         qu'on le reconnaît dans le menu. */
      const emoji = (String(x.nom).match(/^\s*(\p{Extended_Pictographic}️?)/u) || [])[1];
      rond.textContent = emoji || '▸';
      rond.style.fontSize = '17px';
      b.appendChild(rond);

      const n = document.createElement('span');
      n.className = 'ligneEleveNom';
      n.textContent = String(x.nom).replace(/^\s*\p{Extended_Pictographic}️?\s*/u, '');
      b.appendChild(n);

      const ou = document.createElement('span');
      ou.className = 'ligneEleveForm';
      ou.textContent = x.ou;
      b.appendChild(ou);

      b.addEventListener('click', () => allerALEcran(x));
      liste.appendChild(b);
    });
    return ecrans.length;
  };

  const dessiner = () => {
    const q = (typeof normaliserMot === 'function')
      ? normaliserMot(champ.value) : champ.value.toLowerCase().trim();

    liste.innerHTML = '';
    if(!tous.length){ poserLesEcrans(); return; }

    /* Le même filtre que le répertoire et le dossier : nom, numéro,
       mail, formation, Messenger. Elle ne cherchait que dans le
       nom — chercher un élève par son numéro marchait deux écrans
       plus loin, et pas ici.

       ⚠️ ET LA RECHERCHE VIDE REND TOUT LE MONDE. C'est ce qui fait
       qu'à l'ouverture il y a déjà des noms sous le doigt. */
    const trouves = (typeof chercherEleves === 'function')
      ? chercherEleves(champ.value, 40)
      : tous.filter(n => {
          const c = (typeof normaliserMot === 'function')
            ? normaliserMot(n) : String(n).toLowerCase();
          return !q || c.indexOf(q) !== -1;
        }).slice(0, 40);

    if(!trouves.length){
      /* ⚠️ ON N'ANNONCE PAS UN ÉCHEC AU-DESSUS D'UNE RÉPONSE.

         « Rien trouvé » ne doit pas vouloir dire « il n'existe
         pas » : cette liste est celle de CET appareil, et ces trois
         lignes-là sont justes... quand on cherchait un élève.

         Quand on tape « écoutes », on ne cherche pas un élève. Les
         voir s'afficher en gros au-dessus de l'écran qu'on
         demandait, c'est se faire répondre « non » avant le « oui ».
         On ne garde alors qu'une ligne, et la réponse dessous. */
      const combien = poserLesEcrans();
      etat.innerHTML = combien
        ? 'Aucun élève de ce nom — mais un écran, oui :'
        : 'Aucun élève de ce nom <strong>dans la mémoire de ' +
          'cet appareil</strong>. Il existe peut-être quand même — ' +
          "cherche-le dans l'historique des leçons.";
      return;
    }

    etat.textContent = !q
      ? tous.length + ' élève(s) — tape les premières lettres pour réduire'
      : trouves.length + ' trouvé(s)' +
        (trouves.length === 40 ? ' (40 premiers)' : '');

    trouves.forEach(nom => {
      liste.appendChild(
        (typeof ligneEleveTrouve === 'function')
          ? ligneEleveTrouve(nom, yAller)
          : (() => {
              const b = document.createElement('button');
              b.className = 'btn btn-secondary';
              b.textContent = nom;
              b.addEventListener('click', () => yAller(nom));
              return b;
            })());
    });

    /* Les écrans en dessous, jamais au-dessus : on cherche un élève
       neuf fois sur dix, et ce qu'on cherche le plus doit être sous
       le pouce sans défiler. */
    poserLesEcrans();
  };

  champ.addEventListener('input', dessiner);
  /* Entrée sur un seul résultat : on ne fait pas cliquer pour
     rien. Sur plusieurs, on ne devine pas. */
  champ.addEventListener('keydown', e => {
    if(e.key !== 'Enter') return;
    const seul = liste.querySelectorAll('button');
    if(seul.length === 1) seul[0].click();
  });

  dessiner();

  /* ⚠️ SYNCHRONE, PAS DANS UN setTimeout. Le clavier d'iPhone ne
     monte que si le focus part encore du geste qui a ouvert la
     fenêtre ; une minuterie, même de 80 ms, rompt le lien et
     oblige à taper une seconde fois dans le champ. */
  champ.focus();
}

/* Ce que fait chaque action. Elle ne réinvente rien : elle emmène
   sur l'écran qui sait déjà faire, et le met en route. */
function lancerActionLoupe(cle, nom){
  if(cle !== 'dossier') return;

  if(typeof ouvrirPageEleve !== 'function'){
    showToast("Le dossier élève n'est pas disponible sur cet écran.");
    return;
  }
  ouvrirPageEleve(nom);
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

  /* La CB Gasoil vit dans la même barre, elle se branche au même
     moment : deux endroits qui allumeraient les boutons du haut
     finiraient par ne pas les allumer ensemble. */
  const c = $('cbBtn');
  if(c && !c.dataset.branche){
    c.dataset.branche = 'oui';
    c.addEventListener('click', () => {
      if(typeof ouvrirCbGasoil === 'function') ouvrirCbGasoil();
    });
  }
  if(typeof chargerCbGasoil === 'function'){
    chargerCbGasoil()
      .then(() => { if(typeof majBoutonCb === 'function') majBoutonCb(); })
      .catch(() => {});
  }

  brancherMenuPlus();
  majBoutonLoupe();
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-loupe.js'] = true;
