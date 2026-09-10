/* Déployé le 10/09/2026 à 10:33 — v908 */
/* ============================================================
   ec-cbgasoil.js
   La CB Gasoil : où elle est, qui l'a, et les pleins faits avec.

   David, le 9 septembre 2026 : « il faut que l'on prévoit un
   endroit où le moniteur indique qu'il a la CB Gasoil et que tout
   le monde ait l'info, et quand il la dépose il peut indiquer pour
   quel véhicule il fait le plein ».

   ⚠️ L'ÉTAT NE S'ÉCRIT NULLE PART — IL SE DÉDUIT.

   Le classeur ne garde qu'une SUITE D'ÉVÉNEMENTS : prise, dépôt,
   plein. Le dernier « prise » ou « depot » de chaque carte dit où
   elle est. Une case « où est la carte » à côté aurait été plus
   courte, et le jour où l'une des deux rate son écriture, c'est la
   mauvaise qui gagne — la carte serait « au bureau » avec une
   prise notée juste après.

   ⚠️ ET LE BOUTON EST LA PORTE UNIQUE. David : « ce serait juste
   pour la prendre, tout le reste est bien dans choses à voir
   aujourd'hui » — puis, en voyant le geste : le même bouton
   propose de la reposer quand c'est toi qui l'as. Prendre et
   reposer arrivent au même instant de la journée ; les séparer,
   c'est rendre le retour plus difficile que le départ, et le
   retour est celui qui porte les pleins.

   Se donne dans ⚙️ Accès (droit « cbgasoil »), et revient à tout
   le monde par le rôle — une carte se passe de la main à la main,
   elle ne se donne pas par écran.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ------------------------------------------------------------
   LA GRAMMAIRE DES SIGNES DU BOUTON

   David l'a dessinée lui-même, et chaque signe ne dit qu'UNE
   chose :

     · la couleur du bouton  — la situation la plus proche de toi :
       doré si tu en as une, sinon rouge si quelqu'un en a une,
       sinon neutre ;
     · la LETTRE de chaque carte — la couleur de SON état à elle :
       neutre au bureau, doré chez toi, rouge chez un autre.
       David : « avec celle qui est prise en rouge, les autres
       voient que SB est prise » ;
     · le barré — il n'y a plus rien à prendre, nulle part. Lui
       seul dit l'impossibilité, et il ne sort que là.

   Le barré et la lettre se contredisaient dans la première
   version : barré voulait dire « tu ne peux rien prendre » et la
   lettre nommait ce qui restait. À bout de bras, c'est le barré
   qu'on voit — on renonçait à aller chercher une carte qui était
   pourtant là.
   ------------------------------------------------------------ */

const CB_CARTES_DEPART = [
  { cle:'stbrieuc', nom:'CB Saint-Brieuc', sigle:'SB' },
  { cle:'loudeac',  nom:'CB Loudéac',      sigle:'L' }
];

/* Au-delà de trois lettres, le bouton ne se lit plus : on passe au
   nombre de cartes dehors. */
const CB_LETTRES_MAX = 3;

let cbCartes = null;
let cbEvents = null;
let cbCharge = 0;


async function chargerCbGasoil(force){
  /* Un cache court : le bouton se redessine à chaque changement
     d'onglet, et la CB ne bouge pas trois fois par minute. */
  if(!force && cbEvents && (Date.now() - cbCharge) < 60000) return;

  try{
    const d = await appelPrep({ action: 'cbList' });
    poserCbGasoil(d);
  }catch(e){
    cbCartes = cbCartes || CB_CARTES_DEPART.slice();
    cbEvents = cbEvents || [];
  }
}


/* ⚠️ UNE RÉPONSE QUI PORTE LA LISTE VAUT UNE RELECTURE.

   David : « les enregistrements sont super longs ». Ils l'étaient
   deux fois : un appel pour écrire, un second pour relire ce qu'on
   venait d'écrire. Le serveur rend maintenant la liste à jour avec
   son accusé de réception — celui qui vient d'écrire est le seul
   qui ne puisse pas être en retard sur lui-même.

   Une réponse sans liste ne touche à rien : mieux vaut la liste
   d'il y a dix secondes qu'un écran vide. */
function poserCbGasoil(d){
  if(!d || !Array.isArray(d.events)) return false;
  cbCartes = (d.cartes && d.cartes.length) ? d.cartes : CB_CARTES_DEPART.slice();
  cbEvents = d.events;
  cbCharge = Date.now();
  return true;
}


/* Le geste est fait, l'écran suit : le bouton, le bandeau, et le
   panneau s'il est ouvert. Trois endroits qui disent la même
   chose — donc un seul endroit qui les remet d'accord. */
function rafraichirEcransCb(){
  majBoutonCb();
  if(typeof dessinerBandeau === 'function') dessinerBandeau();
  if(typeof cbRedessinerPanneau === 'function' && cbRedessinerPanneau){
    try{ cbRedessinerPanneau(); }catch(e){}
  }
}


/* Le panneau ouvert, quand il l'est. C'est lui qui se redessine
   quand une réponse arrive derrière — sinon le panneau montrerait
   l'état d'avant le geste qu'on vient de faire dedans. */
let cbRedessinerPanneau = null;


function listeCbCartes(){
  return (cbCartes && cbCartes.length) ? cbCartes : CB_CARTES_DEPART;
}


function carteCb(cle){
  const c = String(cle || '').trim();
  return listeCbCartes().find(x => x && x.cle === c) || null;
}


function sigleCb(cle){
  const c = carteCb(cle);
  return c ? (c.sigle || c.nom || c.cle) : String(cle || '');
}


function nomCb(cle){
  const c = carteCb(cle);
  return c ? (c.nom || c.cle) : String(cle || '');
}


/* ------------------------------------------------------------
   OÙ EST CHAQUE CARTE — DÉDUIT, JAMAIS LU DANS UNE CASE

   Le dernier « prise » ou « depot » de la carte, et lui seul. Les
   pleins n'y changent rien : ils accompagnent un dépôt, ils ne
   déplacent personne.
   ------------------------------------------------------------ */
function etatCb(cle){
  const moi = (typeof ACCES !== 'undefined' && ACCES.moniteur) || '';
  const liste = (cbEvents || [])
    .filter(e => e && e.carte === cle &&
                 (e.type === 'prise' || e.type === 'depot'));

  /* Le classeur ajoute à la suite : le dernier de la feuille est
     le plus récent. On ne trie pas sur l'horodatage — deux gestes
     dans la même minute s'y confondraient. */
  const dernier = liste.length ? liste[liste.length - 1] : null;

  if(!dernier || dernier.type === 'depot'){
    /* Reposée chez un MONITEUR : elle est chez lui, pas au bureau.
       C'est le « je la passe à… » que David a demandé — en vrai la
       carte change de main sans repasser par le bureau. */
    const vers = String((dernier && dernier.vers) || '');
    const m = vers.match(/^moniteur:(.*)$/);
    if(m && m[1]){
      const qui = m[1];
      return { ou: normaliserMot(qui) === normaliserMot(moi) ? 'moi' : 'autre',
               qui: qui, depuis: dernier.quand, evenement: dernier };
    }
    return { ou: 'bureau', qui: '', lieu: vers.replace(/^bureau:/, ''),
             depuis: dernier ? dernier.quand : '', evenement: dernier };
  }

  const qui = dernier.qui || '';
  return { ou: normaliserMot(qui) === normaliserMot(moi) ? 'moi' : 'autre',
           qui: qui, depuis: dernier.quand, evenement: dernier };
}


/* Toutes les cartes, avec leur état. L'ordre de la liste réglée. */
function etatsCb(){
  return listeCbCartes().map(c => Object.assign({ carte: c }, etatCb(c.cle)));
}


/* ------------------------------------------------------------
   « DEPUIS HIER » SE LIT SUR LE CALENDRIER, PAS AU CHRONOMÈTRE

   David : « le lendemain ». Prise mardi à 16h, elle traîne
   mercredi matin — pas mercredi à 16h. C'est le jour qui a changé
   qui compte, et c'est comme ça qu'on en parle à voix haute.
   ------------------------------------------------------------ */
function jourDeCb(quand){
  const m = String(quand || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? (m[3] + '-' + m[2] + '-' + m[1]) : '';
}


function cbTraine(etat){
  if(!etat || (etat.ou !== 'moi' && etat.ou !== 'autre')) return false;
  const j = jourDeCb(etat.depuis);
  if(!j) return false;
  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);
  return j < auj;
}


/* ============================================================
   LE BOUTON DE LA BARRE DU HAUT
   ============================================================ */

function majBoutonCb(){
  const b = $('cbBtn');
  if(!b) return;

  if(typeof sectionVisible === 'function' && !sectionVisible('cbgasoil')){
    b.style.display = 'none';
    return;
  }

  const etats = etatsCb();
  if(!etats.length){ b.style.display = 'none'; return; }

  const jaiUne = etats.some(x => x.ou === 'moi');
  const prises = etats.filter(x => x.ou === 'autre');
  const dispo  = etats.filter(x => x.ou === 'bureau');

  /* La couleur du bouton : la situation la plus proche de toi.
     Quand tu en as une, c'est ÇA ta situation — le doré passe
     devant le rouge. Une couleur qui dirait deux choses n'en
     dirait plus aucune. */
  let bord = 'var(--line)', encre = 'var(--cream)', fond = 'transparent';
  if(jaiUne){
    bord = 'var(--or)'; encre = 'var(--or)'; fond = 'rgba(216,178,106,.14)';
  }else if(prises.length){
    bord = 'var(--red)'; encre = 'var(--warn-text)'; fond = 'rgba(201,71,63,.13)';
  }

  b.style.display = 'inline-flex';
  b.style.borderColor = bord;
  b.style.color = encre;
  b.style.background = fond;

  b.innerHTML = '';
  const ic = document.createElement('span');
  ic.textContent = '💳';
  b.appendChild(ic);

  /* ⚠️ CHAQUE LETTRE PREND LA COULEUR DE SON ÉTAT À ELLE.

     C'est la variante que David a choisie : « avec celle qui est
     prise en rouge, comme ça les autres voient que SB est prise ».
     Rien à déduire — on lit la situation de chaque carte
     directement, sans avoir à se rappeler la liste complète. */
  if(etats.length <= CB_LETTRES_MAX){
    etats.forEach(x => {
      const s = document.createElement('span');
      s.textContent = sigleCb(x.carte.cle);
      /* ⚠️ CELLE QUI RESTE S'ÉCRIT EN BLANC.

         David : « quand on a une carte, la carte restante n'est pas
         assez claire ». Elle était en gris discret — la couleur de
         ce qui n'a pas d'importance. Or c'est exactement l'inverse :
         à côté d'une lettre rouge, la lettre restante est LA
         réponse à la seule question qu'on se pose en regardant ce
         bouton, « est-ce qu'il en reste une ». Le gris la faisait
         passer pour une carte éteinte, et on ouvrait le panneau
         pour vérifier. */
      s.style.cssText = 'font-size:12.5px;font-weight:800;letter-spacing:.04em;' +
        'margin-left:4px;color:' +
        (x.ou === 'moi' ? 'var(--or)'
         : x.ou === 'autre' ? 'var(--warn-text)' : 'var(--cream)');
      b.appendChild(s);
    });
  }else{
    /* Trop de cartes pour des lettres : le nombre de celles qui
       sont dehors. À ce compte-là, c'est le panneau qu'on ouvre. */
    const s = document.createElement('span');
    s.textContent = String(prises.length + (jaiUne ? 1 : 0));
    s.style.cssText = 'font-size:12.5px;font-weight:800;margin-left:4px;';
    b.appendChild(s);
  }

  /* ⚠️ LE BARRÉ NE DIT QU'UNE CHOSE : il n'y a plus rien à
     prendre. Ni la couleur, ni les lettres ne le disent — et lui
     ne dit rien d'autre. */
  if(!dispo.length && !jaiUne){
    const t = document.createElement('span');
    t.style.cssText = 'position:absolute;left:5px;right:5px;top:50%;height:2px;' +
      'background:var(--red);transform:rotate(-20deg);' +
      'box-shadow:0 0 0 1px var(--navy);pointer-events:none;';
    b.appendChild(t);
  }

  b.title = etats.map(x =>
    nomCb(x.carte.cle) + ' — ' +
    (x.ou === 'moi' ? 'tu l\'as'
     : x.ou === 'autre' ? 'chez ' + (x.qui || 'quelqu\'un')
     : 'au bureau')).join('\n');
}


/* ============================================================
   LE PANNEAU — UNE LIGNE PAR CARTE, CHACUNE AVEC SON GESTE
   ============================================================ */

async function ouvrirCbGasoil(){
  /* ⚠️ LE PANNEAU S'OUVRE AVEC CE QU'ON A DÉJÀ.

     David : « le bouton de CB est super long à s'ouvrir ». Il
     attendait le réseau AVANT de dessiner quoi que ce soit : on
     appuyait, et il ne se passait rien pendant plusieurs secondes.

     Or ce qu'il allait chercher, le bouton l'affiche déjà — c'est
     la même liste qui a servi à colorer ses lettres. On ouvre donc
     tout de suite avec elle, et la relecture arrive derrière : si
     elle apporte du neuf, le panneau se redessine sous les yeux.

     La première fois seulement — jamais rien chargé — il n'y a rien
     à montrer : on attend, et on le dit. */
  if(!cbEvents){
    try{ await chargerCbGasoil(true); }catch(e){}
  }
  majBoutonCb();

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(470px,94vw);max-height:88vh;overflow-y:auto;';
  boite.innerHTML = '<h3>💳 Les CB Gasoil</h3>';

  const zone = document.createElement('div');
  boite.appendChild(zone);

  /* Fermer, c'est aussi cesser d'être le panneau qu'on redessine :
     sans cet oubli, une réponse arrivée après coup ferait travailler
     un écran que plus personne ne regarde. */
  const fermer = () => {
    cbRedessinerPanneau = null;
    try{ fermerFond(fond); }catch(e){}
  };

  const dessiner = () => {
    zone.innerHTML = '';

    etatsCb().forEach(x => {
      const l = document.createElement('div');
      l.style.cssText = 'border:1px solid ' +
        (x.ou === 'moi' ? 'var(--or)'
         : x.ou === 'autre' ? 'rgba(201,71,63,.55)'
         : 'rgba(63,174,107,.5)') +
        ';border-radius:11px;padding:10px 12px;display:flex;gap:10px;' +
        'align-items:center;margin-bottom:8px;';

      const t = document.createElement('div');
      t.style.cssText = 'flex:1;min-width:0;line-height:1.45;font-size:13.5px;';
      t.innerHTML = '💳 <strong>' + nomCb(x.carte.cle).replace(/</g, '&lt;') +
        '</strong> · ' + String(sigleCb(x.carte.cle)).replace(/</g, '&lt;') +
        '<div style="font-size:11.5px;color:' +
          (x.ou === 'autre' ? 'var(--warn-text)' : 'var(--muted)') + ';">' +
        (x.ou === 'moi'
          ? 'Tu l\'as depuis ' + String(x.depuis || '').replace(/</g, '&lt;')
          : x.ou === 'autre'
            ? 'Chez ' + String(x.qui || 'quelqu\'un').replace(/</g, '&lt;') +
              ' depuis ' + String(x.depuis || '').replace(/</g, '&lt;')
            : 'Au bureau' + (x.lieu ? ' · ' + String(x.lieu).replace(/</g, '&lt;') : '') +
              (x.depuis ? ' · reposée le ' + String(x.depuis).replace(/</g, '&lt;') : '')) +
        '</div>';
      l.appendChild(t);

      const b = document.createElement('button');
      b.className = (x.ou === 'autre') ? 'btn btn-secondary' : 'btn btn-primary';
      b.style.cssText = 'width:auto;padding:9px 12px;font-size:12.5px;margin:0;' +
        'flex-shrink:0;';

      if(x.ou === 'moi'){
        b.textContent = '🏢 Je la repose';
        b.addEventListener('click', () => { fermer(); reposerCb(x.carte.cle); });
      }else{
        /* Celle qui est chez quelqu'un se prend quand même : c'est
           ce qui se passe en vrai, la carte change de main sans
           repasser par le bureau. La refuser obligerait à mentir à
           l'outil, et un outil à qui on ment cesse d'être lu. */
        b.textContent = (x.ou === 'autre') ? '🖐️ Je l\'ai' : '🖐️ Je la prends';
        b.addEventListener('click', async () => {
          b.disabled = true;
          b.textContent = '…';
          try{
            /* La réponse porte la liste à jour : plus de seconde
               attente pour relire ce qu'on vient d'écrire. */
            const rep = await appelPrep({ action:'cbEvent',
                                          carte:x.carte.cle, type:'prise' });
            if(!poserCbGasoil(rep)) await chargerCbGasoil(true);
            rafraichirEcransCb();
            showToast('Tu as la ' + nomCb(x.carte.cle) + ' ✅');
          }catch(e){
            b.disabled = false;
            b.textContent = (x.ou === 'autre') ? '🖐️ Je l\'ai' : '🖐️ Je la prends';
            showToast('Impossible : ' + e.message);
          }
        });
      }
      l.appendChild(b);
      zone.appendChild(l);
    });
  };

  dessiner();

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;margin-top:12px;';
  const bF = document.createElement('button');
  bF.className = 'btn btn-secondary';
  bF.textContent = 'Fermer';
  bF.addEventListener('click', fermer);
  r.appendChild(bF);
  boite.appendChild(r);

  fond.appendChild(boite);
  document.body.appendChild(fond);
  fond.addEventListener('click', e => { if(e.target === fond) fermer(); });

  /* Tant que ce panneau est là, c'est lui qu'on redessine quand une
     réponse arrive — d'où qu'elle vienne. Le « fermer » du haut
     l'oublie déjà : un panneau fermé ne se redessine pas. */
  cbRedessinerPanneau = dessiner;

  /* ⚠️ LA RELECTURE ARRIVE DERRIÈRE, PAS DEVANT.

     Le panneau est déjà à l'écran ; on va simplement vérifier que
     rien n'a bougé chez les autres pendant qu'on ne regardait pas.
     S'il s'est fermé entre-temps, on ne redessine rien : redessiner
     un panneau fermé rouvrirait un écran que personne n'a demandé. */
  chargerCbGasoil(true).then(() => {
    majBoutonCb();
    if(cbRedessinerPanneau === dessiner) dessiner();
  }).catch(() => {});
}


/* ============================================================
   LA REPOSER — ET DIRE LES PLEINS
   ============================================================ */

async function reposerCb(cle){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(500px,94vw);max-height:90vh;overflow-y:auto;';

  const e = etatCb(cle);
  boite.innerHTML = '<h3>🏢 Reposer la ' + nomCb(cle).replace(/</g, '&lt;') + '</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;">' +
      'Tu l\'as depuis ' + String(e.depuis || '').replace(/</g, '&lt;') + '</div>' +
    '<label>Où elle va</label><div id="cbOu" style="margin-bottom:12px;"></div>' +
    '<div id="cbSansPlein"></div>' +
    '<div id="cbPleinsBloc"></div>' +
    '<div id="cbEtat" style="font-size:13px;line-height:1.5;margin-bottom:10px;"></div>';

  fond.appendChild(boite);
  document.body.appendChild(fond);
  const g = id => boite.querySelector('#' + id);
  const fermer = () => { try{ fermerFond(fond); }catch(e){} };

  /* ── Où elle va ── */
  let vers = 'bureau:' + (listeCbCartes().length ? nomCb(cle).replace(/^CB\s*/i, '') : '');
  let versMoniteur = '';

  const dessinerOu = () => {
    const z = g('cbOu');
    z.innerHTML = '';
    z.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';

    const poser = (libelle, valeur, titre) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      const on = (vers === valeur);
      b.style.cssText = 'width:auto;padding:8px 12px;font-size:12.5px;margin:0;' +
        (on ? 'background:var(--orange);border-color:var(--orange);' +
              'color:#0B0B0B;font-weight:700;' : '');
      b.textContent = libelle;
      if(titre) b.title = titre;
      b.addEventListener('click', () => { vers = valeur; versMoniteur = ''; dessinerOu(); });
      z.appendChild(b);
    };

    /* Les bureaux : ceux des lieux de rendez-vous, qui portent déjà
       les deux adresses de l'école. Une deuxième liste de bureaux
       aurait fini par ne pas dire la même chose. */
    const lieux = (typeof listeLieuxRdv === 'function') ? listeLieuxRdv() : [];
    if(lieux.length){
      lieux.forEach(l => poser('🏢 ' + l.nom, 'bureau:' + l.nom, l.adresse || ''));
    }else{
      poser('🏢 Au bureau', 'bureau:');
    }

    const bM = document.createElement('button');
    bM.type = 'button';
    bM.className = 'btn btn-secondary';
    const onM = /^moniteur:/.test(vers);
    bM.style.cssText = 'width:auto;padding:8px 12px;font-size:12.5px;margin:0;' +
      (onM ? 'background:var(--orange);border-color:var(--orange);' +
             'color:#0B0B0B;font-weight:700;' : '');
    bM.textContent = onM ? ('👤 ' + versMoniteur) : '👤 Je la passe à…';
    bM.addEventListener('click', async () => {
      const qui = await demander(
        'À qui tu la passes ?\n\nElle sera notée chez cette personne, et ' +
        'tout le monde le verra.', versMoniteur, 'Je la passe à');
      if(qui === null || !String(qui).trim()) return;
      versMoniteur = String(qui).trim();
      vers = 'moniteur:' + versMoniteur;
      dessinerOu();
    });
    z.appendChild(bM);
  };
  dessinerOu();

  /* ── « Je n'ai pas fait le plein » ──

     ⚠️ ELLE DIT CE QUE LE SILENCE NE DIT PAS. Un dépôt sans ligne
     veut dire deux choses qu'on ne peut plus distinguer : rien
     fait, ou oublié de le noter. Le bureau, devant l'historique,
     ne saurait jamais laquelle. */
  let sansPlein = false;
  let pleins = [{}];

  const zC = g('cbSansPlein');
  zC.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
    'padding:10px 12px;margin-bottom:12px;';
  const lab = document.createElement('label');
  lab.style.cssText = 'display:flex;gap:9px;align-items:center;margin:0;' +
    'font-size:13.5px;text-transform:none;color:var(--cream);cursor:pointer;';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;';
  lab.appendChild(cb);
  lab.appendChild(document.createTextNode('Je n\'ai pas fait le plein'));
  zC.appendChild(lab);

  const dessinerPleins = () => {
    const z = g('cbPleinsBloc');
    z.innerHTML = '';
    if(sansPlein) return;          /* rien à remplir : rien à montrer */

    const t = document.createElement('label');
    t.textContent = 'Les pleins que tu as faits';
    z.appendChild(t);

    pleins.forEach((p, i) => {
      const l = document.createElement('div');
      l.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';

      const sel = menuVehiculeCb(p.vehicule);
      sel.addEventListener('change', () => { p.vehicule = sel.value; });
      l.appendChild(sel);

      const champ = (cle, place, largeur) => {
        const c = document.createElement('input');
        c.type = 'text';
        c.inputMode = 'decimal';
        c.placeholder = place;
        c.value = p[cle] || '';
        c.style.cssText = 'flex:0 0 ' + largeur + ';min-width:0;margin:0;';
        c.addEventListener('input', () => { p[cle] = c.value; });
        l.appendChild(c);
      };
      champ('montant', '€', '78px');
      champ('litres', 'L', '62px');

      const sup = document.createElement('button');
      sup.type = 'button';
      sup.className = 'btn btn-secondary';
      sup.style.cssText = 'width:auto;margin:0;padding:9px 10px;flex-shrink:0;';
      sup.textContent = '✕';
      sup.title = 'Retirer ce plein';
      sup.addEventListener('click', () => {
        pleins.splice(i, 1);
        if(!pleins.length) pleins.push({});
        dessinerPleins();
      });
      l.appendChild(sup);
      z.appendChild(l);

      /* Le kilométrage, facultatif — David : « oui facultatif ».
         Sur sa propre ligne : une case de plus à la pompe est une
         case qu'on ne remplit pas si elle serre les autres. */
      const k = document.createElement('input');
      k.type = 'text';
      k.inputMode = 'numeric';
      k.placeholder = 'km au compteur — facultatif';
      k.value = p.km || '';
      k.style.cssText = 'width:100%;margin:0 0 10px;';
      k.addEventListener('input', () => { p.km = k.value; });
      z.appendChild(k);
    });

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'btn btn-secondary';
    plus.style.cssText = 'width:auto;padding:8px 12px;font-size:12px;margin:0 0 12px;';
    plus.textContent = '➕ Un plein de plus';
    plus.addEventListener('click', () => { pleins.push({}); dessinerPleins(); });
    z.appendChild(plus);
  };

  cb.addEventListener('change', () => {
    sansPlein = cb.checked;
    dessinerPleins();
  });
  dessinerPleins();

  /* Les véhicules : sans eux, le menu serait vide. On les lit
     directement — un moniteur n'a pas forcément ouvert 🚗 Flotte,
     et il ne doit pas avoir à y passer pour noter un plein. */
  if(typeof flotte === 'undefined' || !flotte || !flotte.length){
    try{
      const dv = await appelPrep({ action: 'flotteList' });
      if(typeof flotte !== 'undefined') flotte = (dv && dv.vehicules) || [];
      dessinerPleins();
    }catch(e){ /* la fenêtre reste utilisable : le menu sera court */ }
  }

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;';
  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', fermer);
  r.appendChild(bA);

  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = 'Je la repose';
  bOk.addEventListener('click', async () => {
    if(bOk.disabled) return;

    const gardes = sansPlein ? []
      : pleins.filter(p => String(p.vehicule || '').trim());

    /* ⚠️ LE VÉHICULE EST OBLIGATOIRE SUR UNE LIGNE DÉCLARÉE.
       David : « véhicule obligatoire, montant / litres / km
       facultatif ». Sans véhicule, la ligne ne remonte sur aucune
       voiture — et c'était tout l'intérêt du « pour quel
       véhicule ». */
    const sansVehicule = sansPlein ? 0
      : pleins.filter(p => !String(p.vehicule || '').trim() &&
          (String(p.montant || '').trim() || String(p.litres || '').trim() ||
           String(p.km || '').trim())).length;

    if(sansVehicule){
      const et = g('cbEtat');
      et.style.color = 'var(--warn-text)';
      et.textContent = sansVehicule + ' plein(s) sans véhicule. Choisis la ' +
        'voiture, sinon la dépense ne remonte sur aucune.';
      return;
    }

    if(!sansPlein && !gardes.length &&
       !await confirmer('Reposer sans noter de plein ?\n\n' +
         'Si tu n\'as pas fait le plein, coche la case — le bureau saura ' +
         'que ce n\'est pas un oubli.', 'Reposer quand même')) return;

    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      /* Le dépôt et ses pleins partent ensemble, et la liste à jour
         revient avec — un seul aller-retour au lieu de deux. */
      const rep = await appelPrep({ action:'cbEvent', carte:cle, type:'depot',
                        vers: vers,
                        sansPlein: sansPlein ? 'oui' : '',
                        pleins: JSON.stringify(gardes) });
      if(!poserCbGasoil(rep)) await chargerCbGasoil(true);
      rafraichirEcransCb();
      if(typeof dessinerCbFlotte === 'function') dessinerCbFlotte();
      fermer();
      showToast(gardes.length
        ? 'Reposée ✅ — ' + gardes.length + ' plein(s) noté(s)'
        : 'Reposée ✅');
    }catch(e){
      bOk.disabled = false;
      bOk.textContent = 'Je la repose';
      const et = g('cbEtat');
      et.style.color = 'var(--warn-text)';
      et.textContent = 'Impossible : ' + e.message;
    }
  });
  r.appendChild(bOk);
  boite.appendChild(r);

  fond.addEventListener('click', e => { if(e.target === fond) fermer(); });
}


/* ============================================================
   CE QUI TRAÎNE — LA SEULE LIGNE DE LA LISTE DU JOUR

   David : « le bouton pour tous les jours, la liste pour ce qui
   traîne ». Le rouge du bouton dit « quelqu'un l'a » — c'est
   normal à 15h. La ligne dit « ça dure », et elle appelle un coup
   de fil.

   Et pour celui qui ne l'a pas reposée, elle se dit autrement :
   « TU AS TOUJOURS LA CB… IL FAUT LA REPOSER ». Une phrase à la
   deuxième personne, en gros, parce que c'est lui qui doit se
   lever.
   ============================================================ */
function lignesCbGasoil(){
  if(typeof sectionVisible === 'function' && !sectionVisible('cbgasoil')) return [];

  const out = [];
  etatsCb().forEach(x => {
    if(!cbTraine(x)) return;

    const nom = nomCb(x.carte.cle);

    if(x.ou === 'moi'){
      out.push({
        id: 'cb:' + x.carte.cle,
        famille: 'cbgasoil',
        emoji: '⛽',
        texte: 'Tu as toujours la ' + nom,
        sous: 'IL FAUT LA REPOSER',
        gros: true,
        urgente: true,
        croix: 'jour',
        action: () => reposerCb(x.carte.cle),
        actionTexte: '🏢 Je la repose'
      });
      return;
    }

    out.push({
      id: 'cb:' + x.carte.cle,
      famille: 'cbgasoil',
      emoji: '⛽',
      texte: nom + ' chez ' + (x.qui || 'quelqu\'un'),
      sous: 'Pas reposée depuis ' + (x.depuis || 'hier'),
      urgente: true,
      croix: 'jour'
    });
  });

  return out;
}


/* ============================================================
   LE MENU DES VÉHICULES — RANGÉ, ET AVEC UN PONT

   David, le 10 septembre 2026 : « dans la carte gasoil, en plus des
   véhicules il faut rajouter plein moto, plein 125, plein scooter ;
   voir si tu les ajoutes tels quels dans la liste des véhicules ou
   si tu les mets à part tant que je n'ai pas créé tous les 2 roues ».
   Puis : « fais le pont, j'ai trop de 2 roues à enregistrer
   maintenant ».

   ⚠️ IL N'Y A PAS DE DEUXIÈME LISTE À INVENTER. La flotte connaît
   depuis toujours ses cinq catégories — voiture, moto, scooter,
   125, remorque — et l'écran Flotte range déjà ses véhicules
   comme ça. Le menu du plein, lui, les déroulait à plat, dans le
   désordre, VENDUS COMPRIS. Il se range donc pareil, avec la même
   table, et un véhicule vendu n'y est plus.

   ⚠️ ET LE PONT A UN PRIX QU'ON PAIE TOUT DE SUITE.

   « carburantDuVehicule » rapproche les pleins d'un véhicule PAR SON
   NOM. Un plein noté sur « 🏍️ Moto — sans fiche » ne s'affichera
   donc jamais sur la fiche de la moto : l'argent existe dans le
   total du mois, mais il est invisible là où on ira le chercher.
   Un pont sans rattrapage, c'est de l'argent perdu de vue — donc le
   rattrapage est écrit dans la même livraison, pas « plus tard ».

   Les entrées « sans fiche » disparaissent d'elles-mêmes dès qu'un
   vrai véhicule de leur catégorie existe : il n'y a rien à penser à
   retirer, et donc rien qui traîne trois ans.
   ============================================================ */

/* Le préfixe des véhicules sans fiche. Il vit ICI et nulle part
   ailleurs : le menu l'écrit, le rattrapage le relit, le test le
   relit. Deux orthographes, et le rattrapage ne trouverait plus
   rien à rattraper. */
const CB_SANS_FICHE = '(sans fiche) ';

function estSansFicheCb(nom){
  return String(nom || '').indexOf(CB_SANS_FICHE) === 0;
}

function categorieSansFicheCb(nom){
  return estSansFicheCb(nom) ? String(nom).slice(CB_SANS_FICHE.length) : '';
}

/* Les catégories de la flotte, ou de quoi tenir si le module n'est
   pas chargé — le menu ne doit pas disparaître pour ça. */
function categoriesCb(){
  return (typeof CATEGORIES_FLOTTE !== 'undefined' && CATEGORIES_FLOTTE) ||
    [{ cle:'voiture', nom:'🚗 Voiture' }, { cle:'moto', nom:'🏍️ Moto' },
     { cle:'scooter', nom:'🛵 Scooter' }, { cle:'125', nom:'🏍️ 125 cm³' },
     { cle:'remorque', nom:'🚚 Remorque' }];
}

/* Les catégories de 2-roues encore sans aucun véhicule enregistré.
   Ce sont elles, et elles seules, qui méritent une entrée « sans
   fiche » : proposer « 🚗 Voiture — sans fiche » alors que la
   flotte en compte douze n'aiderait personne. */
function categoriesSansVehiculeCb(){
  const parc = ((typeof flotte !== 'undefined' && flotte) || [])
    .filter(v => v && v.etat !== 'vendu');
  return ['moto', '125', 'scooter'].filter(cle =>
    !parc.some(v => String(v.categorie || '') === cle));
}

function nomCategorieCb(cle){
  const c = categoriesCb().find(x => x.cle === cle);
  return c ? c.nom : cle;
}

/* Ce qu'un véhicule s'appelle à l'écran — « (sans fiche) moto » est
   une clé, pas un nom qu'on montre à quelqu'un. */
function libelleVehiculeCb(nom){
  if(!estSansFicheCb(nom)) return String(nom || '');
  return nomCategorieCb(categorieSansFicheCb(nom)) + ' — sans fiche';
}

/* Le menu d'un plein : les véhicules rangés par catégorie, puis le
   pont, puis — s'il y a lieu — la valeur déjà posée qui ne serait
   plus dans la liste. */
function menuVehiculeCb(choisi){
  const sel = document.createElement('select');
  sel.style.cssText = 'flex:1;min-width:0;margin:0;';

  const vide = document.createElement('option');
  vide.value = ''; vide.textContent = '— véhicule —';
  sel.appendChild(vide);

  const parc = ((typeof flotte !== 'undefined' && flotte) || [])
    .filter(v => v && v.etat !== 'vendu');

  categoriesCb().forEach(cat => {
    const lot = parc.filter(v => String(v.categorie || '') === cat.cle);
    if(!lot.length) return;
    const g = document.createElement('optgroup');
    g.label = cat.nom;
    lot.forEach(v => {
      const o = document.createElement('option');
      o.value = v.nom || v.immat || '';
      o.textContent = (v.nom || v.immat || '') +
                      (v.immat && v.nom ? ' · ' + v.immat : '');
      g.appendChild(o);
    });
    sel.appendChild(g);
  });

  /* Un véhicule sans catégorie ne se perd pas en route */
  const orphelins = parc.filter(v =>
    !categoriesCb().some(c => c.cle === String(v.categorie || '')));
  if(orphelins.length){
    const g = document.createElement('optgroup');
    g.label = '📦 Sans catégorie';
    orphelins.forEach(v => {
      const o = document.createElement('option');
      o.value = v.nom || v.immat || '';
      o.textContent = v.nom || v.immat || '';
      g.appendChild(o);
    });
    sel.appendChild(g);
  }

  /* ── LE PONT ── */
  const manquantes = categoriesSansVehiculeCb();
  if(manquantes.length){
    const g = document.createElement('optgroup');
    g.label = '⏳ Pas encore de fiche';
    manquantes.forEach(cle => {
      const o = document.createElement('option');
      o.value = CB_SANS_FICHE + cle;
      o.textContent = nomCategorieCb(cle) + ' — sans fiche';
      g.appendChild(o);
    });
    sel.appendChild(g);
  }

  /* Une valeur déjà posée qui n'est plus proposée reste choisissable :
     un véhicule vendu, ou un « sans fiche » dont la catégorie a
     depuis reçu sa fiche. Sans ça, rouvrir un plein pour corriger
     son montant EFFACERAIT son véhicule. */
  if(choisi && !Array.prototype.some.call(sel.querySelectorAll('option'),
       o => o.value === choisi)){
    const o = document.createElement('option');
    o.value = choisi;
    o.textContent = estSansFicheCb(choisi)
      ? nomCategorieCb(categorieSansFicheCb(choisi)) + ' — sans fiche'
      : choisi;
    sel.appendChild(o);
  }

  sel.value = choisi || '';
  return sel;
}


/* Une fenêtre pour choisir un véhicule et son montant. Rend null si
   on annule — jamais un objet à moitié rempli. */
function choisirVehiculeCb(titre, aide, vehicule, montant){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.maxWidth = 'min(440px, 92vw)';

    const h = document.createElement('h3');
    h.textContent = titre;
    boite.appendChild(h);

    if(aide){
      const a = document.createElement('div');
      a.style.cssText = 'font-size:12.5px;color:var(--muted);line-height:1.5;' +
        'margin-bottom:10px;';
      a.textContent = aide;
      boite.appendChild(a);
    }

    const lv = document.createElement('label');
    lv.textContent = 'Le véhicule';
    boite.appendChild(lv);
    const sel = menuVehiculeCb(vehicule);
    sel.style.cssText = 'width:100%;margin:0 0 10px;';
    boite.appendChild(sel);

    const lm = document.createElement('label');
    lm.textContent = 'Le montant en €';
    boite.appendChild(lm);
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'decimal';
    inp.value = montant || '';
    boite.appendChild(inp);

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';
    rangee.style.marginTop = '14px';
    const bA = document.createElement('button');
    bA.className = 'btn btn-secondary';
    bA.textContent = 'Annuler';
    const bV = document.createElement('button');
    bV.className = 'btn btn-primary';
    bV.textContent = '💾 Enregistrer';
    rangee.appendChild(bA); rangee.appendChild(bV);
    boite.appendChild(rangee);

    fond.appendChild(boite);
    document.body.appendChild(fond);

    const fermer = v => { try{ fermerFond(fond); }catch(e){} resolve(v); };
    bA.addEventListener('click', () => fermer(null));
    bV.addEventListener('click', () => fermer({
      vehicule: String(sel.value || '').trim(),
      montant:  String(inp.value || '').trim()
    }));
  });
}


/* ============================================================
   LE RATTRAPAGE DES PLEINS SANS FICHE

   ⚠️ C'EST LA CONTREPARTIE DU PONT, PAS UN CONFORT.

   Tant qu'un plein porte « (sans fiche) moto », son montant n'entre
   dans AUCUNE fiche véhicule : « carburantDuVehicule » rapproche par
   le nom, et ce nom-là n'appartient à personne. L'argent existe dans
   le total du mois et nulle part ailleurs — exactement le genre
   d'écart qu'on découvre six mois plus tard, en cherchant pourquoi
   les comptes ne tombent pas.

   Ce bloc n'apparaît que lorsqu'il y a quelque chose à faire : des
   pleins sans fiche, ET la fiche qui leur manquait désormais créée.
   Le reste du temps il n'existe pas — on ne montre pas un chantier
   qu'on ne peut pas encore commencer.
   ============================================================ */
function pleinsSansFicheCb(){
  return (cbEvents || []).filter(e =>
    e && e.type === 'plein' && estSansFicheCb(e.vehicule));
}

function blocRattrapageCb(){
  const sans = pleinsSansFicheCb();
  if(!sans.length) return null;

  /* Les catégories qui ont MAINTENANT au moins un véhicule : ce
     sont les seules rattachables. Une moto notée sans fiche alors
     qu'aucune moto n'existe encore n'a nulle part où aller — et
     l'annoncer serait promettre un geste impossible. */
  const pretes = [];
  sans.forEach(e => {
    const cat = categorieSansFicheCb(e.vehicule);
    if(categoriesSansVehiculeCb().indexOf(cat) !== -1) return;
    if(pretes.indexOf(cat) === -1) pretes.push(cat);
  });

  const aFaire = sans.filter(e =>
    pretes.indexOf(categorieSansFicheCb(e.vehicule)) !== -1);
  if(!aFaire.length) return null;

  const z = document.createElement('div');
  z.style.cssText = 'border:1px solid var(--orange);border-radius:10px;' +
    'padding:10px 12px;margin-bottom:12px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
    'margin-bottom:3px;';
  t.textContent = '🔗 ' + aFaire.length + ' plein' + (aFaire.length > 1 ? 's' : '') +
    ' à rattacher';
  z.appendChild(t);

  const a = document.createElement('div');
  a.style.cssText = 'font-size:11.5px;color:var(--muted);line-height:1.5;' +
    'margin-bottom:8px;';
  a.textContent = 'Ces pleins ont été notés avant que la fiche du véhicule ' +
    "existe. Tant qu'ils y restent, leur montant n'apparaît sur aucune fiche " +
    'véhicule — seulement dans le total du mois.';
  z.appendChild(a);

  aFaire.forEach(e => {
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:8px;align-items:center;font-size:12.5px;' +
      'padding:5px 0;border-top:1px solid var(--line);';

    const d = document.createElement('div');
    d.style.cssText = 'flex:1;min-width:0;';
    d.textContent = String(e.quand || '') + ' · ' +
      libelleVehiculeCb(e.vehicule) +
      (e.montant ? ' · ' + e.montant + ' €' : '');
    l.appendChild(d);

    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;padding:5px 10px;font-size:12px;margin:0;' +
      'flex-shrink:0;';
    b.textContent = '🔗 Rattacher';
    b.title = 'Choisir le véhicule à qui appartient ce plein';
    b.addEventListener('click', () => corrigerPleinCb(e));
    l.appendChild(b);

    z.appendChild(l);
  });

  return z;
}


/* ============================================================
   L'HISTORIQUE, DANS 🚗 SUIVI DE LA FLOTTE

   David : « je pense qu'on met juste un historique côté admin dans
   flotte, sous suivi flotte ». C'est là que vivent déjà les
   kilomètres, les entretiens et les incidents de chaque véhicule :
   le carburant y est à sa place.
   ============================================================ */
function pleinsCb(cle, mois){
  return (cbEvents || []).filter(e =>
    e && e.type === 'plein' &&
    (!cle || e.carte === cle) &&
    (!mois || String(e.quand || '').slice(3, 10) === mois));
}


function euroCb(v){
  const n = Number(String(v || '').replace(',', '.').replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : n;
}


/* Le total carburant d'un véhicule sur le mois en cours — lu par
   la fiche véhicule de la flotte. */
function carburantDuVehicule(nom){
  const cle = normaliserMot(nom || '');
  if(!cle) return null;

  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);
  const mois = auj.slice(5, 7) + '/' + auj.slice(0, 4);

  const l = pleinsCb('', mois).filter(e => normaliserMot(e.vehicule || '') === cle);
  if(!l.length) return null;

  let total = 0;
  l.forEach(e => { total += euroCb(e.montant); });
  return { combien: l.length, total: total, dernier: l[l.length - 1] };
}


function dessinerCbFlotte(){
  const z = $('cbFlotteZone');
  if(!z) return;
  z.innerHTML = '';

  if(typeof sectionVisible === 'function' && !sectionVisible('cbgasoil')) return;

  const d = document.createElement('details');
  d.className = 'volet-liste';
  d.style.marginBottom = '14px';

  const s = document.createElement('summary');
  s.textContent = '⛽ Les CB Gasoil (' + listeCbCartes().length + ')';
  d.appendChild(s);

  const dedans = document.createElement('div');
  dedans.style.cssText = 'padding-top:9px;';

  /* Ce qui attend un geste passe devant : des pleins qui n'entrent
     dans aucune fiche véhicule, et dont la fiche existe maintenant. */
  const rattrapage = blocRattrapageCb();
  if(rattrapage) dedans.appendChild(rattrapage);

  /* Où est chacune, en clair */
  etatsCb().forEach(x => {
    const l = document.createElement('div');
    l.style.cssText = 'border:1px solid ' +
      (x.ou === 'moi' ? 'var(--or)'
       : x.ou === 'autre' ? 'rgba(201,71,63,.55)' : 'var(--line)') +
      ';border-radius:10px;padding:9px 11px;margin-bottom:7px;' +
      'display:flex;gap:9px;align-items:center;';

    const t = document.createElement('div');
    t.style.cssText = 'flex:1;min-width:0;font-size:13px;line-height:1.45;';
    t.innerHTML = '💳 <strong>' + nomCb(x.carte.cle).replace(/</g, '&lt;') +
      '</strong> · ' + String(sigleCb(x.carte.cle)).replace(/</g, '&lt;') +
      '<div style="font-size:11.5px;color:var(--muted);">' +
      (x.ou === 'bureau'
        ? 'Au bureau' + (x.lieu ? ' · ' + String(x.lieu).replace(/</g, '&lt;') : '')
        : 'Chez ' + String(x.ou === 'moi' ? 'toi' : (x.qui || 'quelqu\'un'))
            .replace(/</g, '&lt;') +
          ' depuis ' + String(x.depuis || '').replace(/</g, '&lt;')) +
      '</div>';
    l.appendChild(t);

    const x2 = document.createElement('button');
    x2.className = 'btn btn-secondary';
    x2.style.cssText = 'width:auto;padding:8px 11px;font-size:13px;margin:0;' +
      'flex-shrink:0;';
    x2.textContent = '🗑️';
    x2.title = 'Retirer cette carte de la liste';
    x2.addEventListener('click', () => retirerCarteCb(x.carte.cle));
    l.appendChild(x2);

    dedans.appendChild(l);
  });

  const plus = document.createElement('button');
  plus.className = 'btn btn-secondary';
  plus.style.cssText = 'width:auto;padding:9px 13px;font-size:13px;margin:0 0 14px;';
  plus.textContent = '➕ Ajouter une carte';
  plus.addEventListener('click', ajouterCarteCb);
  dedans.appendChild(plus);

  /* Les pleins du mois */
  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);
  const mois = auj.slice(5, 7) + '/' + auj.slice(0, 4);
  const l = pleinsCb('', mois);

  const t = document.createElement('div');
  t.style.cssText = 'font-size:11px;letter-spacing:.06em;text-transform:uppercase;' +
    'color:var(--muted);margin:4px 0 6px;';
  t.textContent = 'Les pleins — ' + mois;
  dedans.appendChild(t);

  if(!l.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Aucun plein noté ce mois-ci.';
    dedans.appendChild(v);
  }else{
    let total = 0;
    l.forEach(e => {
      total += euroCb(e.montant);
      const li = document.createElement('div');
      li.style.cssText = 'display:flex;gap:9px;align-items:center;' +
        'font-size:12.5px;padding:6px 0;border-bottom:1px solid var(--line);';
      li.innerHTML = '<span style="flex:1;min-width:0;">' +
        String(e.quand || '').replace(/</g, '&lt;') + ' · ' +
        String(e.qui || '').replace(/</g, '&lt;') + ' · ' +
        /* Un « sans fiche » se dit par son nom de catégorie, pas par
           sa clé — et sans le 🚗 d'une voiture qu'il n'est pas. */
        (estSansFicheCb(e.vehicule) ? '' : '🚗 ') +
        libelleVehiculeCb(e.vehicule).replace(/</g, '&lt;') + '</span>' +
        '<span style="flex-shrink:0;font-weight:700;">' +
        (e.montant ? String(e.montant).replace(/</g, '&lt;') + ' €' : '—') +
        '</span>';

      const mod = document.createElement('button');
      mod.className = 'btn btn-secondary';
      mod.style.cssText = 'width:auto;padding:5px 9px;font-size:12px;margin:0;' +
        'flex-shrink:0;';
      mod.textContent = '✏️';
      mod.title = 'Corriger ce plein';
      mod.addEventListener('click', () => corrigerPleinCb(e));
      li.appendChild(mod);

      dedans.appendChild(li);
    });

    const tot = document.createElement('div');
    tot.style.cssText = 'font-size:13px;font-weight:700;margin-top:8px;';
    tot.textContent = 'Total du mois — ' + total.toFixed(2).replace('.', ',') + ' €';
    dedans.appendChild(tot);
  }

  d.appendChild(dedans);
  z.appendChild(d);
}


async function ajouterCarteCb(){
  const nom = await demander(
    'Le nom de la carte\n\nEx : « CB Saint-Brieuc », « CB Loudéac ».',
    '', 'Nouvelle carte');
  if(nom === null || !String(nom).trim()) return;

  const sigle = await demander(
    'Son sigle — une à trois lettres\n\nC\'est ce que porte le bouton en ' +
    'haut de l\'écran : « SB », « L ».', '', 'Sigle');
  if(sigle === null || !String(sigle).trim()) return;

  const base = String(nom).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'cb';
  let cle = base, n = 2;
  while(listeCbCartes().some(x => x && x.cle === cle)){ cle = base + n; n++; }

  const liste = listeCbCartes().concat([{
    cle: cle, nom: String(nom).trim(),
    sigle: String(sigle).trim().toUpperCase().slice(0, 3)
  }]);

  try{
    await appelPrep({ action:'reglageSet', cle:'cbGasoil',
                      valeur: JSON.stringify(liste) });
    cbCartes = liste;
    majBoutonCb();
    dessinerCbFlotte();
    showToast('Ajoutée ✅');
  }catch(e){ showToast('Impossible : ' + e.message); }
}


async function retirerCarteCb(cle){
  const c = carteCb(cle);
  if(!c) return;

  /* ⚠️ ON NE RETIRE QUE DE LA LISTE. L'historique de cette carte
     reste : les pleins déjà notés ont été payés, et ils comptent
     dans le total de leur véhicule. */
  if(!await confirmer(
      'Retirer « ' + c.nom + ' » de la liste ?\n\n' +
      'Elle ne sera plus proposée. Les pleins déjà notés ne bougent pas.',
      'Retirer')) return;

  const liste = listeCbCartes().filter(x => x && x.cle !== cle);
  try{
    await appelPrep({ action:'reglageSet', cle:'cbGasoil',
                      valeur: JSON.stringify(liste) });
    cbCartes = liste;
    majBoutonCb();
    dessinerCbFlotte();
    showToast('Retirée ✅');
  }catch(e){ showToast('Impossible : ' + e.message); }
}


/* ⚠️ LE VÉHICULE SE CHOISIT, IL NE SE RETAPE PAS — v908.

   Il était demandé au clavier, avec son nom pré-rempli. Une lettre
   de travers, et le plein cessait d'appartenir au véhicule : c'est
   « carburantDuVehicule » qui rapproche les deux PAR LE NOM, et
   personne n'aurait vu la différence — l'argent serait simplement
   sorti du total de la fiche.

   Et c'est cette fenêtre-là qui sert au rattrapage des pleins « sans
   fiche » : elle doit donc proposer les vrais véhicules. */
async function corrigerPleinCb(e){
  const veh = await choisirVehiculeCb(
    'Corriger le plein',
    'Le véhicule, le montant, et la date telle qu\'elle est notée.',
    e.vehicule || '', e.montant || '');
  if(!veh) return;

  try{
    await appelPrep({ action:'cbPleinSet', id:e.id,
                      vehicule:veh.vehicule, montant:veh.montant });
    await chargerCbGasoil(true);
    dessinerCbFlotte();
    showToast('Corrigé ✅');
  }catch(err){ showToast('Impossible : ' + err.message); }
}


/* ============================================================
   LA CARTE BOUGE CHEZ QUELQU'UN D'AUTRE

   David : « la maj chez les autres moniteurs n'est pas
   instantanée ». Elle ne l'était pas du tout : rien ne relisait la
   liste tant qu'on ne rouvrait pas le panneau. Sur Saint-Brieuc,
   quatre moniteurs pour une carte — celui qui regardait son bouton
   voyait l'état d'il y a une heure.

   Trois moments où l'on relit :

     · toutes les 20 secondes, tant que quelqu'un regarde ;
     · au RETOUR sur l'onglet — le geste de quelqu'un qui revient,
       donc le moment exact où il regarde le bouton ;
     · avec le reste de l'application, toutes les 90 secondes, en
       filet de sécurité si le battement court s'est arrêté.

   ⚠️ POURQUOI VINGT SECONDES, ET PAS QUATRE-VINGT-DIX.

   David, le 9 septembre : « j'ai reposé la carte et sur le compte
   de ma collègue c'est toujours en rouge, il faut au moins
   30 secondes ». Quatre-vingt-dix secondes, c'était le rythme de
   TOUT le reste de l'application — des listes qu'on regarde quand
   on en a besoin. Le bouton de la CB n'est pas de cette famille :
   il est là en permanence, en haut de l'écran, et la question
   qu'on lui pose est « est-ce que je peux y aller MAINTENANT ».

   Ce qui rend ce rythme tenable, c'est que la lecture ne réveille
   plus le classeur : elle passe par le Worker, qui lit onze
   colonnes en une requête. Vingt secondes de ça ne coûtent rien.

   ⚠️ ET ON NE REDESSINE QUE SI QUELQUE CHOSE A CHANGÉ. Toutes les
   vingt secondes, repeindre un bouton identique ferait clignoter
   l'écran de quelqu'un qui travaille — et rouvrirait le pli du
   panneau ouvert. On compare l'état d'avant et d'après, et le plus
   souvent il n'y a rien à faire.

   ⚠️ CE N'EST TOUJOURS PAS DE L'INSTANTANÉ, ET IL FAUT LE DIRE. Le
   vrai instantané demande une notification poussée par le serveur —
   le § F de la todolist. Ici, c'est une relecture régulière : entre
   deux, le bouton peut être en retard de vingt secondes. Ce qui
   l'empêche de mentir longtemps, ce n'est pas la vitesse, c'est le
   fait qu'on prenne une carte déjà prise SANS refus : l'outil
   accepte la réalité et se corrige, il ne discute pas.
   ============================================================ */

/* Ce que le bouton MONTRE, résumé en une chaîne. Deux résumés
   identiques, c'est un bouton qu'on n'a pas à repeindre. */
function signatureCb(){
  try{
    return etatsCb().map(x =>
      x.carte.cle + ':' + x.ou + ':' + (x.qui || '') + ':' + (x.depuis || '')
    ).join('|');
  }catch(e){ return ''; }
}


function rafraichirCbAuto(){
  if(typeof sectionVisible === 'function' && !sectionVisible('cbgasoil')) return;
  const avant = signatureCb();
  chargerCbGasoil(true).then(() => {
    if(signatureCb() !== avant) rafraichirEcransCb();
  }).catch(() => {});
}


/* ⚠️ LE BATTEMENT S'ARRÊTE QUAND PERSONNE NE REGARDE.

   Un onglet en arrière-plan n'a personne devant : vingt secondes
   d'appels pour un écran que nul ne lit, c'est de la dépense pure.
   Le retour sur l'onglet relit tout seul — on ne perd rien. */
let battementCb = null;
function lancerBattementCb(){
  clearInterval(battementCb);
  battementCb = setInterval(() => {
    if(typeof ACCES === 'undefined' || !ACCES.code) return;
    if(document.hidden) return;
    if(typeof reseauEnPause === 'function' && reseauEnPause()) return;
    if(typeof bureauOccupe === 'function' && bureauOccupe()) return;
    rafraichirCbAuto();
  }, 20000);
}


let cbEcouteRetour = false;
function ecouterRetourCb(){
  if(cbEcouteRetour) return;
  cbEcouteRetour = true;
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) return;
    if(typeof ACCES === 'undefined' || !ACCES.code) return;
    /* Après un refus du serveur on se tait : insister prolongerait
       le blocage au lieu de le laisser expirer. */
    if(typeof reseauEnPause === 'function' && reseauEnPause()) return;
    rafraichirCbAuto();
  });
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-cbgasoil.js'] = true;
