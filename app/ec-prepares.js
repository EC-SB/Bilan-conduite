/* Déployé le 27/08/2026 à 09:46 — v593 */
/* ============================================================
   ec-prepares.js
   Cours préparés à l'avance
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   COURS PRÉPARÉS À L'AVANCE
   Le moniteur prépare ses notes la veille ; au moment du cours
   il choisit l'élève et démarre directement.
   Stockage dans le téléphone : accessible même sans réseau.
   ============================================================ */
const CLE_CACHE_PREP = 'cache_prepares';
/* prepares : déclaré dans ec-etat.js */
/* prepareEnCours : déclaré dans ec-etat.js */

/* Cache local : la liste reste consultable même sans réseau dans la voiture */
function lireCachePrepares(){
  try{
    const brut = localStorage.getItem(CLE_CACHE_PREP);
    const l = brut ? JSON.parse(brut) : [];
    return Array.isArray(l) ? l : [];
  }catch(e){ return []; }
}
function ecrireCachePrepares(liste){
  try{ localStorage.setItem(CLE_CACHE_PREP, JSON.stringify(liste)); }catch(e){}
}

/* Les actions qui écrivent en masse : plus de temps, et JAMAIS de
   nouvelle tentative. Relancer un import qui a peut-être abouti
   créerait des doublons. */
const ACTIONS_LOURDES = { bureauEtat: 25000, elevesImport: 90000,
                          smsList: 25000, resultatList: 25000 };
const SANS_REPRISE = ['elevesImport', 'ficheSet', 'bilanMaj', 'bilanModifier',
                      'smsLog', 'eleveRetirer', 'consigneEffacerEleve'];

async function appelPrep(corps){
  /* Se servir de l'application repousse le délai d'inactivité :
     sans cela, la session mourrait 48 h après la connexion même
     en travaillant dessus. */
  if(typeof rafraichirSession === 'function') rafraichirSession();

  const action = (corps && corps.action) || '';
  const delai = ACTIONS_LOURDES[action] || 12000;
  const essais = (SANS_REPRISE.indexOf(action) !== -1) ? 0 : 2;

  const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ code: ACCES.code }, corps))
  }, delai, essais);
  /* Le message du serveur vaut mieux qu'un code seul : « HTTP 502 »
     ne dit rien, « SMTP 535 : authentification refusée » dit tout. */
  const rep = await r.json().catch(() => ({}));

  if(!r.ok){
    /* Un refus du serveur — trop d'essais, trop d'appels — veut
       dire « pas maintenant ». On met les rafraîchissements en
       sommeil : insister ne ferait que prolonger le blocage. */
    if((r.status === 403 || r.status === 429) &&
       typeof noterRefusReseau === 'function'){
      noterRefusReseau(r.status === 429 ? 300 : 120);
    }
    throw new Error(rep && rep.error ? rep.error : 'HTTP ' + r.status);
  }

  return rep;
}

/* Charge depuis Sheets, avec repli sur le cache si le réseau manque */
async function chargerPrepares(){
  try{
    const data = await appelPrep({ action: 'prepList' });
    const liste = (data && data.preparations) || [];
    /* Les cours passés de plus de 7 jours ne sont plus affichés */
    const limite = new Date();
    limite.setDate(limite.getDate() - 7);
    const cle = limite.toISOString().slice(0, 10);
    prepares = liste.filter(x => !x.date || x.date >= cle).map(x => {
      let ctx = null;
      try{ ctx = x.contexte ? JSON.parse(x.contexte) : null; }catch(e){}
      return Object.assign({}, x, { contexte: ctx });
    });
    ecrireCachePrepares(prepares);
    derniereErreurPrep = '';
    return true;
  }catch(e){
    /* Sans la raison, « hors ligne » couvrait tout : un vrai
       problème de réseau comme un refus du serveur. */
    derniereErreurPrep = (e && e.message) ? String(e.message) : '';
    prepares = lireCachePrepares();
    return false;
  }
}

/* Ce qui a fait échouer le dernier chargement */
let derniereErreurPrep = '';

function libelleDate(iso){
  if(!iso) return 'Sans date';
  const auj = todayLocal();
  if(iso === auj) return "Aujourd'hui";
  const d = new Date(iso + 'T12:00:00');
  const dem = new Date();
  dem.setDate(dem.getDate() + 1);
  if(iso === dem.toISOString().slice(0, 10)) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* Les tiroirs ouverts ou fermés par le moniteur, gardés d'une fois
   sur l'autre : sa mise en page lui appartient. */
const CLE_TIROIRS = 'tiroirs_prepares';
let tiroirsPrepares = {};
/* La liste telle qu'affichée, pour que les flèches déplacent ce que
   le moniteur voit et non l'ensemble des cours. */
let listeAffichee = [];
try{
  tiroirsPrepares = JSON.parse(localStorage.getItem(CLE_TIROIRS) || '{}') || {};
}catch(e){ tiroirsPrepares = {}; }


/* Les moniteurs qui ont des cours, avec leur nombre. On ne propose
   que ceux qui en ont : une liste de noms vides n'aide personne. */
function remplirFiltreMoniteurs(sel){
  const compte = {};
  prepares.forEach(x => {
    const n = (x.moniteur || '').trim() || '(non attribué)';
    compte[n] = (compte[n] || 0) + 1;
  });

  const noms = Object.keys(compte).sort((a, b) => a.localeCompare(b, 'fr'));
  const signature = noms.map(n => n + compte[n]).join('|');
  if(sel._signature === signature) return;      /* rien de neuf */
  sel._signature = signature;

  const choix = sel.value;
  sel.innerHTML = '<option value="">Tous les moniteurs — ' +
    prepares.length + ' cours</option>' +
    noms.map(n => '<option value="' + n.replace(/"/g, '&quot;') + '">' +
                  n + ' — ' + compte[n] + '</option>').join('');
  if(choix && noms.indexOf(choix) !== -1) sel.value = choix;
}


/* Remplit le choix du moniteur destinataire */
async function remplirPourQui(){
  const sel = $('prepPour');
  if(!sel) return;

  if(typeof chargerMoniteurs === 'function' &&
     (typeof moniteursActifs === 'undefined' || !moniteursActifs.length)){
    try{ await chargerMoniteurs(); }catch(e){ /* on garde le moniteur courant */ }
  }

  const liste = (typeof moniteursActifs !== 'undefined' ? moniteursActifs : []) || [];
  const choix = sel.value || ACCES.moniteur || '';

  sel.innerHTML = liste.map(m =>
    '<option value="' + String(m).replace(/"/g, '&quot;') + '">' +
    (normaliserMot(m) === normaliserMot(ACCES.moniteur || '') ? m + ' (moi)' : m) +
    '</option>').join('');

  /* Moi par défaut : c'est le cas le plus fréquent */
  if(liste.some(m => normaliserMot(m) === normaliserMot(choix))) sel.value = choix;
  else if(liste.length) sel.value = liste[0];
}


async function afficherPrepares(recharger, silencieux){
  const zone = $('listePrepares');
  if(!zone) return;

  if(recharger !== false){
    if(!silencieux) zone.innerHTML = '<div class="empty">Chargement…</div>';
    const enLigne = await chargerPrepares();
    if(!enLigne && prepares.length){
      /* Dire pourquoi : un moniteur qui voit « hors ligne » alors
         que son téléphone marche ne sait pas quoi faire. */
      const raison = derniereErreurPrep;

      if(/503|indisponible|momentan/i.test(raison)){
        showToast('⚠️ Service momentanément indisponible — réessaie');
      }else if(/403|essai|bloqu/i.test(raison)){
        showToast('⚠️ Accès refusé — reconnecte-toi');
      }else if(/429|trop/i.test(raison)){
        showToast('⚠️ Trop de demandes — patiente une minute');
      }else if(/HTTP 5|502|503/i.test(raison)){
        showToast('⚠️ Le serveur ne répond pas — liste en cache');
      }else if(!navigator.onLine){
        showToast('Hors ligne — liste en cache');
      }else{
        showToast('Liste en cache' + (raison ? ' — ' + raison.slice(0, 40) : ''));
      }
    }
  }
  /* Chacun ne voit que ses cours, sauf demande explicite */
  const tousMoniteurs = $('prepTous') && $('prepTous').checked;
  const moi = normaliserMot(ACCES.moniteur || '');
  let liste = prepares.slice();

  /* Le filtre par moniteur ne sert que si l'on voit tout le monde */
  const selQui = $('prepQui');
  if(selQui){
    selQui.style.display = tousMoniteurs ? 'block' : 'none';
    if(tousMoniteurs) remplirFiltreMoniteurs(selQui);
  }

  if(!tousMoniteurs && moi){
    liste = liste.filter(x => !x.moniteur || normaliserMot(x.moniteur) === moi);
  }else if(selQui && selQui.value){
    liste = liste.filter(x => normaliserMot(x.moniteur || '') ===
                              normaliserMot(selQui.value));
  }

  majCompteur('cptPrepares', liste.length);

  /* Au premier chargement, on ouvre le tiroir le plus utile */
  if(!premierAffichagePrepares){
    premierAffichagePrepares = true;
    if(typeof ouvrirLeBonTiroirDuJour === 'function') ouvrirLeBonTiroirDuJour();
  }

  if(!liste.length){
    const autres = prepares.length;
    zone.innerHTML = '<div class="empty">' +
      (autres && !tousMoniteurs
        ? 'Aucun cours préparé à ton nom.<br>' + autres +
          ' cours préparé(s) par d\'autres moniteurs — coche la case ci-dessus pour les voir.'
        : 'Aucun cours préparé.<br>Prépare tes cours à l\'avance : le jour J, ' +
          'tu choisis l\'élève et tu démarres.') +
      '</div>';
    return;
  }

  liste.sort((a, b) => (a.date || '').localeCompare(b.date || '') ||
                       String(a.id || '').localeCompare(String(b.id || '')));
  zone.innerHTML = '';
  let dateCourante = null;
  let tiroir = null;

  /* Un tiroir par jour : aujourd'hui et demain ouverts, le reste
     replié. Sans ça, un moniteur qui prépare deux semaines à
     l'avance fait défiler sa journée pour la trouver. */
  const auj = todayLocal();
  const dem = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const p2 = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  })();

  /* Dans une journée, l'ordre choisi par le moniteur prime : c'est
     lui qui connaît l'enchaînement de ses cours. */
  /* Sans ordre posé, on départage par l'heure de création : deux
     cours à 999 se seraient rangés au hasard, et la flèche semblait
     ne rien faire. */
  liste.sort((a, b) => {
    const d = String(a.date || '').localeCompare(String(b.date || ''));
    if(d !== 0) return d;
    const oa = a.ordre || 0;
    const ob = b.ordre || 0;
    if(oa && ob) return oa - ob;
    if(oa) return -1;
    if(ob) return 1;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  /* Ce qui est réellement à l'écran : les flèches déplacent dans
     CETTE liste, pas dans l'ensemble des cours du jour. */
  listeAffichee = liste;

  liste.forEach(cours => {
    if(cours.date !== dateCourante){
      dateCourante = cours.date;
      const estAuj = (cours.date === auj);
      const estDem = (cours.date === dem);
      const passe = cours.date && cours.date < auj;

      /* Combien de cours ce jour-là : utile quand c'est replié */
      const combien = liste.filter(x => x.date === cours.date).length;

      tiroir = document.createElement('details');
      /* Ce que le moniteur a ouvert ou fermé lui-même prime : sans
         ça, chaque redessin rouvrait les tiroirs qu'il venait de
         replier. */
      tiroir.open = (tiroirsPrepares[cours.date] !== undefined)
        ? tiroirsPrepares[cours.date]
        : (estAuj || estDem || passe);

      tiroir.addEventListener('toggle', () => {
        tiroirsPrepares[cours.date] = tiroir.open;
        try{
          localStorage.setItem(CLE_TIROIRS, JSON.stringify(tiroirsPrepares));
        }catch(e){ /* mémoire pleine : l'état vaut pour cette session */ }
      });
      tiroir.style.cssText = 'border:1px solid ' +
        (estAuj ? 'var(--orange)' : 'var(--line)') +
        ';border-radius:12px;padding:8px 12px;margin-bottom:8px;';

      const titre = document.createElement('summary');
      titre.style.cssText = 'cursor:pointer;font-size:14px;font-weight:700;' +
        'text-transform:capitalize;padding:4px 0;color:' +
        (passe ? 'var(--warn-text)' : estAuj ? 'var(--accent-text)' : 'var(--cream)') + ';';
      titre.textContent = libelleDate(cours.date) + '  ·  ' + combien +
        ' cours' + (passe ? '  ⚠️' : '');
      tiroir.appendChild(titre);

      /* Les simulateurs à la même heure : une seule séance. On le
         propose en tête du jour, avant les cours eux-mêmes. */
      if(typeof groupesDeSimulateur === 'function' && !passe){
        const duJour = liste.filter(x => x.date === cours.date);
        groupesDeSimulateur(duJour).forEach(g => {
          tiroir.appendChild(bandeauGroupe(g));
        });
      }

      zone.appendChild(tiroir);
    }

    const row = document.createElement('div');
    row.className = 'history-item';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const nom = document.createElement('strong');
    /* L'heure à la suite du nom : c'est ce qu'on cherche en
       ouvrant la liste, avant même le type de bilan. */
    const h = heureDeLaPreparation(cours);
    /* Ce que l'élève apporte : à côté de l'heure, pour le voir sans
       ouvrir le cours. */
    const aApporter = repereDeNote(cours);

    /* L'heure au-dessus du nom, en grand : c'est elle qu'on
       cherche en ouvrant la liste, avant même de savoir qui. */
    nom.innerHTML =
      (h ? '<div style="font-size:19px;font-weight:800;' +
           'color:var(--accent-text);line-height:1.2;">' +
           h.replace(':', 'h') + '</div>' : '') +
      '<div>' + (cours.eleve || '(sans nom)').replace(/</g, '&lt;') +
      (aApporter ? ' <span style="font-size:15px;" title="' +
        aApporter.titre + '">' + aApporter.emojis + '</span>' : '') +
      '</div>';
    const sous = document.createElement('span');
    /* Un cours dont la date est passée n'a pas été enregistré :
       sa préparation serait partie. On le signale. */
    const passe = cours.date && cours.date < todayLocal();

    /* On distingue qui fait le cours de qui l'a préparé : après un
       transfert, les deux ne sont plus la même personne. */
    const donne = cours.preparePar && cours.moniteur &&
      normaliserMot(cours.preparePar) !== normaliserMot(cours.moniteur);

    sous.textContent = [cours.modeleLabel,
                        cours.moniteur ? '👤 ' + cours.moniteur : '',
                        donne ? '↩️ préparé par ' + cours.preparePar : '',
                        passe ? '⚠️ pas encore enregistré' : ''].filter(Boolean).join(' · ');
    if(passe) sous.style.color = 'var(--warn-text)';
    meta.appendChild(nom);
    meta.appendChild(sous);
    if(cours.note){
      const n = document.createElement('span');
      n.style.cssText = 'color:var(--accent-text);white-space:pre-wrap;';
      n.textContent = '📌 ' + cours.note;
      meta.appendChild(n);
    }
    row.appendChild(meta);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;flex-shrink:0;align-items:center;';

    /* Un cours donné à quelqu'un d'autre ne s'ouvre plus : le
       moniteur le voit, mais doit se le réattribuer pour le faire. */
    const aMoiOuvrir = !cours.moniteur ||
      normaliserMot(cours.moniteur) === normaliserMot(ACCES.moniteur || '');

    if(aMoiOuvrir || ACCES.role === 'admin'){
      const bOuvrir = document.createElement('button');
      bOuvrir.className = 'btn btn-primary';
      bOuvrir.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;';
      bOuvrir.textContent = '▶ Ouvrir';
      bOuvrir.title = aMoiOuvrir ? 'Démarrer ce cours'
                                 : 'Ouvrir (administrateur)';
      bOuvrir.addEventListener('click', async () => {
        /* Retour immédiat : l'ouverture demande plusieurs allers-retours
           avec Google, et un bouton muet se fait marteler. */
        if(bOuvrir.disabled) return;
        bOuvrir.disabled = true;
        const avant = bOuvrir.textContent;
        bOuvrir.textContent = '⏳ Ouverture…';
        try{
          await chargerPrepare(cours);
        }finally{
          bOuvrir.disabled = false;
          bOuvrir.textContent = avant;
        }
      });
      actions.appendChild(bOuvrir);
    }else{
      const bReprendre = document.createElement('button');
      bReprendre.className = 'btn btn-secondary';
      bReprendre.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;';
      bReprendre.textContent = '↩️ Reprendre';
      bReprendre.title = 'Ce cours est à ' + cours.moniteur +
                         '. Le reprendre pour pouvoir l\'ouvrir.';
      bReprendre.addEventListener('click', async () => {
        if(!await confirmer('Ce cours est attribué à ' + cours.moniteur + '.\n\n' +
            'Le reprendre à ton nom ?')) return;
        bReprendre.disabled = true;
        bReprendre.textContent = '⏳ Reprise…';
        try{
          await appelPrep({ action: 'prepAssign', id: cours.id,
                            moniteur: ACCES.moniteur });
          const dans = prepares.find(x => String(x.id) === String(cours.id));
          if(dans) dans.moniteur = ACCES.moniteur;
          showToast('Cours repris ✅');
          await afficherPrepares(false);
        }catch(e){
          showToast('Reprise impossible : ' + e.message);
          bReprendre.disabled = false;
          bReprendre.textContent = '↩️ Reprendre';
        }
      });
      actions.appendChild(bReprendre);
    }

    /* Monter ou descendre dans la journée : le moniteur range ses
       cours dans l'ordre où il les fera. */
    [['▲', -1, 'Monter'], ['▼', 1, 'Descendre']].forEach(([signe, sens, quoi]) => {
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:auto;padding:9px 8px;font-size:12px;';
      b.textContent = signe;
      b.title = quoi + ' dans la journée';
      b.addEventListener('click', async () => {
        /* Les cours du jour tels qu'ils sont affichés, filtres
           compris : déplacer par rapport à une liste invisible
           donnait l'impression que rien ne bougeait. */
        const duJour = listeAffichee.filter(x => x.date === cours.date);
        const i = duJour.findIndex(x => String(x.id) === String(cours.id));
        const j = i + sens;
        if(i === -1 || j < 0 || j >= duJour.length){
          showToast(sens < 0 ? 'Déjà en premier' : 'Déjà en dernier');
          return;
        }

        /* On permute, puis on renumérote la journée entière */
        const tmp = duJour[i];
        duJour[i] = duJour[j];
        duJour[j] = tmp;
        duJour.forEach((x, n) => { x.ordre = n + 1; });

        await afficherPrepares(false);
        try{
          await appelPrep({ action: 'prepOrdre',
                            ids: JSON.stringify(duJour.map(x => x.id)) });
        }catch(e){
          showToast('Ordre non enregistré : ' + e.message);
        }
      });
      actions.appendChild(b);
    });

    /* Changer la date : une erreur de saisie ne doit pas obliger à
       tout refaire. Le cours se déplace dans le bon tiroir. */
    const bDate = document.createElement('button');
    bDate.className = 'btn btn-secondary';
    bDate.style.cssText = 'width:auto;padding:9px 10px;font-size:13px;';
    bDate.textContent = '📅';
    bDate.title = 'Changer la date et l\'heure de ce cours';

    /* Les mentions oubliées au rappel : elles vivent en tête de
       note, au même endroit que l'heure. */
    const bMent = document.createElement('button');
    bMent.className = 'btn btn-secondary';
    bMent.style.cssText = 'width:auto;padding:8px 10px;font-size:14px;margin:0;' +
      'flex-shrink:0;';
    bMent.textContent = '🆔';
    bMent.title = 'Carte d\'identité, carte SD';
    bMent.addEventListener('click', () => ouvrirMentions(cours));
    bDate.addEventListener('click', async () => {
      const hAvant = heureDeLaPreparation(cours);
      const rep = await demanderDate('Cours de ' +
                                     (cours.eleve || 'cet élève'),
                                     cours.date, hAvant);
      if(!rep) return;

      const neuve = rep.date;
      const heure = rep.heure || '';
      if(neuve === cours.date && heure === hAvant) return;

      /* L'heure vit en tête de note, comme celle des rappels */
      let note = String(cours.note || '');
      note = note.replace(/^🕐[^\n]*\n?/, '');
      if(heure){
        note = '🕐 ' + heure.replace(':', 'h') + '\n' + note;
      }

      bDate.disabled = true;
      bDate.textContent = '⏳';
      try{
        await appelPrep({ action: 'prepAdd', id: cours.id, date: neuve,
                          eleve: cours.eleve, modele: cours.modele,
                          modeleLabel: cours.modeleLabel || '',
                          site: cours.site || '',
                          note: note,
                          contexte: JSON.stringify(cours.contexte || {}),
                          moniteur: cours.moniteur || ACCES.moniteur || '' });
        const dans = prepares.find(x => String(x.id) === String(cours.id));
        if(dans){ dans.date = neuve; dans.note = note; }
        showToast(heure !== hAvant ? 'Date et heure modifiées ✅'
                                   : 'Date modifiée ✅');
        await afficherPrepares(false);
      }catch(e){
        showToast('Modification impossible : ' + e.message);
        bDate.disabled = false;
        bDate.textContent = '📅';
      }
    });
    actions.appendChild(bDate);
    actions.appendChild(bMent);

    /* Un cours passé qui traîne encore : le moniteur le retire
       lui-même, sans attendre le recoupement automatique. */
    if(passe){
      const bFait = document.createElement('button');
      bFait.className = 'btn btn-secondary';
      bFait.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;' +
        'color:var(--accent-text);border-color:var(--orange);';
      bFait.textContent = '✓ Fait';
      bFait.title = 'Ce cours a eu lieu — le retirer de la liste';
      bFait.addEventListener('click', async () => {
        if(!await confirmer('Retirer ce cours de la liste ?\n\n' +
            cours.eleve + ' — ' + (dateEnToutesLettres(cours.date) || cours.date) +
            "\n\nSon bilan reste enregistré : on retire seulement la " +
            'préparation, qui n\'a plus lieu d\'être.')) return;
        bFait.disabled = true;
        bFait.textContent = '…';
        try{
          await appelPrep({ action: 'prepDelete', id: cours.id });
          showToast('Retiré ✅');
          afficherPrepares();
        }catch(e){
          showToast('Impossible : ' + e.message);
          bFait.disabled = false;
          bFait.textContent = '✓ Fait';
        }
      });
      actions.appendChild(bFait);
    }

    /* Modifier la préparation : rouvrir le questionnaire et le
       réenregistrer. Sans ça, une erreur de saisie obligeait à
       supprimer la préparation et à tout refaire. */
    const bMod = document.createElement('button');
    bMod.className = 'btn btn-secondary';
    bMod.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;';
    bMod.textContent = '✏️';
    bMod.title = 'Modifier la préparation de ' + cours.eleve;
    bMod.addEventListener('click', async () => {
      if(bMod.disabled) return;
      bMod.disabled = true;
      try{
        await modifierPreparation(cours);
      }finally{ bMod.disabled = false; }
    });
    actions.appendChild(bMod);

    const bDonner = document.createElement('button');
    bDonner.className = 'btn btn-secondary';
    bDonner.style.cssText = 'width:auto;padding:9px 10px;font-size:13px;';
    bDonner.textContent = '👤';
    bDonner.title = 'Donner ce cours à un autre moniteur';
    bDonner.addEventListener('click', async () => {
      /* La liste des moniteurs peut manquer : on le dit, sinon le
         bouton semble bloqué pendant la lecture. */
      if(!moniteursActifs.length){
        bDonner.disabled = true;
        bDonner.textContent = '⏳';
        try{ await chargerMoniteurs(); }
        finally{ bDonner.disabled = false; bDonner.textContent = '👤'; }
      }
      const cible = await choisirDansListe(
        'Donner le cours de ' + (cours.eleve || 'cet élève') + ' à :',
        moniteursActifs, cours.moniteur || '');
      if(!cible) return;
      bDonner.disabled = true;
      bDonner.textContent = '⏳';
      try{
        await appelPrep({ action: 'prepAssign', id: cours.id, moniteur: cible });
        /* La ligne en mémoire suit : relire toute la liste pour un
           champ que le serveur vient de confirmer faisait attendre
           le moniteur une seconde de plus pour rien. */
        const dans = prepares.find(x => String(x.id) === String(cours.id));
        if(dans) dans.moniteur = cible;
        showToast('Cours donné à ' + cible + ' ✅');
        await afficherPrepares(false);
      }catch(e){
        showToast('Transfert impossible : ' + e.message);
        bDonner.disabled = false;
        bDonner.textContent = '👤';
      }
    });
    actions.appendChild(bDonner);

    /* On ne supprime que ses propres préparations, sauf administrateur */
    /* Seul le moniteur à qui le cours est attribué peut le supprimer.
       Une préparation sans moniteur ne l'est que par un administrateur. */
    const aMoi = !!cours.moniteur &&
                 normaliserMot(cours.moniteur) === normaliserMot(ACCES.moniteur || '');
    if(aMoi || ACCES.role === 'admin'){
      const bSupp = document.createElement('button');
      bSupp.className = 'btn btn-secondary';
      bSupp.style.cssText = 'width:auto;padding:9px 10px;font-size:13px;color:var(--red);border-color:var(--red);';
      bSupp.textContent = '✕';
      bSupp.title = aMoi ? 'Supprimer ce cours préparé'
                         : 'Supprimer (administrateur)';
      bSupp.addEventListener('click', async () => {
        if(!await confirmer('Supprimer ce cours préparé ?' +
                    (aMoi ? '' : '\n\nIl est attribué à ' + cours.moniteur +
                      (cours.preparePar && cours.preparePar !== cours.moniteur
                        ? ' et a été préparé par ' + cours.preparePar : '') + '.'))) return;
        bSupp.disabled = true;
        try{
          const r = await appelPrep({ action: 'prepDelete', id: cours.id });
          if(r && r.status === 'error'){ showToast(r.message); bSupp.disabled = false; return; }
          afficherPrepares();
        }catch(e){
          showToast('Suppression impossible : ' + e.message);
          bSupp.disabled = false;
        }
      });
      actions.appendChild(bSupp);
    }else{
      const info = document.createElement('span');
      info.style.cssText = 'font-size:11px;color:var(--muted);flex-shrink:0;max-width:70px;line-height:1.3;';
      /* C'est l'attributaire qui compte ici : le cours est à lui. */
      info.textContent = 'à ' + cours.moniteur;
      actions.appendChild(info);
    }

    row.appendChild(actions);
    /* Dans le tiroir du jour, pas dans la liste générale */
    (tiroir || zone).appendChild(row);
  });
}

/* Retire de la liste la préparation du cours qui vient d'être fait.
   Ciblée : les autres cours du même élève sont conservés. */
async function retirerPreparationFaite(){
  let cible = prepareEnCours;

  /* Cours démarré sans passer par la liste : on retrouve sa
     préparation. La liste locale peut être vide ou périmée si le
     moniteur n'a jamais ouvert l'onglet — on relit alors le serveur. */
  if(!cible && currentLessonMeta && currentLessonMeta.studentName){
    const nom = normaliserMot(currentLessonMeta.studentName);
    const jour = $('lessonDate') ? $('lessonDate').value : '';

    let liste = prepares || [];
    if(!liste.length){
      try{
        const d = await appelPrep({ action: 'prepList' });
        liste = (d && d.preparations) || [];
      }catch(e){ liste = []; }
    }

    const siennes = liste.filter(x => normaliserMot(x.eleve || '') === nom);

    /* Celle du jour en priorité ; sinon la plus ancienne encore
       en attente, qui est forcément celle qu'on vient de faire. */
    cible = siennes.find(x => x.date === jour) ||
            siennes.filter(x => !jour || x.date <= jour)
                   .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0] ||
            null;
  }
  if(!cible) return;

  try{
    await appelPrep({ action: 'prepDelete', id: cible.id });
    prepareEnCours = null;
    afficherPrepares();
  }catch(e){
    console.warn('Préparation non retirée :', e);
  }
}


/* ---------- Côté moniteur : le rendez-vous post-permis ---------- */
/* rdvPostEnCours : déclaré dans ec-etat.js */

/* Charge un cours préparé dans le formulaire : les informations sont
   rafraîchies sans effacer ce que le moniteur avait saisi. */
let ouvertureEnCours = false;

async function chargerPrepare(cours){
  /* Deux appuis rapprochés ne doivent pas lancer deux ouvertures */
  if(ouvertureEnCours) return;
  ouvertureEnCours = true;
  try{
    return await chargerPrepareInterne(cours);
  }finally{
    ouvertureEnCours = false;
  }
}

async function chargerPrepareInterne(cours){
  /* Garde-fou : masquer un bouton ne suffit pas. Un cours attribué
     à quelqu'un d'autre ne se démarre pas sans se le réattribuer. */
  if(cours && cours.moniteur && ACCES.role !== 'admin' &&
     normaliserMot(cours.moniteur) !== normaliserMot(ACCES.moniteur || '')){
    await informer('Ce cours est attribué à ' + cours.moniteur + '.\n\n' +
      'Reprends-le à ton nom avant de le démarrer.');
    return;
  }

  if(finalTranscript && !await confirmer('Un enregistrement est en cours. Le remplacer ?')) return;

  /* Un rendez-vous post-permis ne passe pas par l'enregistrement */
  if(cours.modele === 'rdv-post'){
    ouvrirRdvPost(cours);
    return;
  }

  prepareEnCours = cours;

  if(cours.modele) $('modele').value = cours.modele;
  /* Le modèle décide de ce qui s'affiche : micro ou saisie */
  if(typeof adapterAuModele === 'function') adapterAuModele();
  $('studentName').value = cours.eleve || '';
  if(cours.site) $('site').value = cours.site;
  if(cours.date) $('lessonDate').value = cours.date;

  let contexte = cours.contexte || null;
  let note = cours.note || '';

  /* La vérification « un cours a-t-il eu lieu depuis ? » demande une
     lecture complète du classeur : plusieurs secondes de démarrage
     à froid. On n'attend pas — l'écran s'ouvre tout de suite avec la
     préparation, et se met à jour si nécessaire. */
  if(contexte){
    chargerDossierEleve(cours.eleve).then(d => {
      const source = contexte.source || '';
      if(!d.dernierHorodatage || d.dernierHorodatage === source) return;

      /* Un cours a eu lieu depuis : on repart de son état, en gardant
         tout ce que le moniteur avait renseigné à la préparation. */
      const frais = defautsDepuisNote(d.derniereNote);
      if(d.frise) frais.frise = d.frise;
      if(d.lecons !== null) frais.lecon = String(d.lecons + 1);
      frais.manoeuvresFaites = d.manoeuvres.length;
      frais.totalManoeuvres = BLOC.ficheListeConduite.length;

      contexte = fusionnerContexte(contexte, frais);
      contexte.source = d.dernierHorodatage;
      contexteDepart = contexte;

      const majNote = noteDepuisQuestionnaire(contexte);
      /* On n'écrase pas ce que le moniteur aurait déjà modifié */
      if($('noteInterne').value === note){
        $('noteInterne').value = majNote;
        if(typeof majAffichageNoteInterne === 'function') majAffichageNoteInterne();
      }
      showToast('Infos mises à jour depuis le dernier cours ✅');
    }).catch(() => { /* hors ligne : la préparation suffit */ });
  }

  $('noteInterne').value = note;

  /* Le questionnaire a déjà été rempli à la préparation : on ne le redemande pas */
  contexteDepart = contexte;
  noteQuestionnaire = note;

  finalTranscript = '';
  committedTranscript = '';
  $('transcriptBox').value = '';
  $('transcriptBox').style.display = 'none';
  $('transcriptAide').style.display = 'none';
  $('compteur').style.display = 'none';
  $('finishBtn').style.display = 'none';
  $('resultView').style.display = 'none';
  /* On bascule sur l'onglet Cours : depuis la liste des préparés,
     l'écran d'enregistrement restait masqué par sa classe d'onglet. */
  if(typeof afficherOnglet === 'function') afficherOnglet('cours');
  $('recordView').classList.remove('hors-onglet', 'hors-vue');

  $('recordView').style.display = 'block';
  $('recBtn').textContent = '🎙️ Démarrer le cours';
  $('status').textContent = 'Cours préparé — tu peux démarrer directement.';

  /* Après ces réécritures, pas avant : le bouton et le statut
     étaient remis en mode vocal alors que le bilan se remplit à
     la main. Un examen blanc préparé rouvrait avec le micro. */
  if(typeof adapterAuModele === 'function') adapterAuModele();

  verifierNomEleve('studentName', 'studentInfo', true);

  /* Le résumé du cours précédent, comme lors d'une saisie normale :
     le moniteur doit voir ce qui a été travaillé avant de démarrer. */
  if(typeof chargerHistoriqueEleve === 'function') chargerHistoriqueEleve();
  afficherPreparationEleve();
  chargerHistoriqueEleve();

  /* Les deux panneaux dès l'ouverture : la fiche véhicule montre
     ce qui est déjà acquis, avec la marque du moniteur qui l'a
     validé. Elle n'apparaissait qu'au lancement du micro, donc
     seules les cases cochées à la préparation se voyaient. */
  if(typeof afficherEnteteDuCours === 'function') afficherEnteteDuCours();
  if(typeof afficherFicheDuCours === 'function') afficherFicheDuCours();

  /* Le module de cours est en bas de l'onglet : sans ce défilement,
     le moniteur croit qu'il ne s'est rien passé et descend à la
     main. On attend l'affichage, sinon la position est fausse. */
  amenerAuCours();
  showToast('Cours de ' + (cours.eleve || 'l\'élève') + ' chargé ✅');
}

/* Prépare un nouveau cours : questionnaire complet, puis mise en réserve */
async function preparerNouveauCours(){
  const eleve = $('prepEleve').value.trim();
  const date = $('prepDate').value;
  const heurePrep = $('prepHeure') ? $('prepHeure').value : '';
  const modeleCle = $('prepModele').value;

  if(eleve.length < 2){
    showToast("Saisis le nom de l'élève.");
    return;
  }

  /* Le questionnaire lit le formulaire principal : on l'alimente le temps de la préparation */
  const sauve = {
    eleve: $('studentName').value,
    modele: $('modele').value,
    date: $('lessonDate').value
  };
  $('studentName').value = eleve;
  $('modele').value = modeleCle;
  if(typeof adapterAuModele === 'function') adapterAuModele();
  $('lessonDate').value = date;

  const btnPrep = $('prepBtn');
  btnPrep.disabled = true;
  btnPrep.textContent = 'Ouverture…';

  let rep = null;
  try{
    rep = await ouvrirQuestionnaireDepart(null, 'Préparer le cours de ' + eleve, 'Enregistrer');
  }finally{
    btnPrep.disabled = false;
    btnPrep.textContent = '📝 Préparer les notes';
    $('studentName').value = sauve.eleve;
    $('modele').value = sauve.modele;
    if(typeof adapterAuModele === 'function') adapterAuModele();
    $('lessonDate').value = sauve.date;
  }
  if(!rep) return;

  const btn = $('prepBtn');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';
  try{
    const cle = rep.modele || modeleCle;
    const nouveau = {
      date: date,
      eleve: eleve,
      modele: cle,
      modeleLabel: (MODELES[cle] || {}).label || '',
      site: $('site').value,
      /* L'heure en tête de note : même endroit que les rappels,
         donc lue partout de la même façon. */
      note: (heurePrep ? '🕐 ' + heurePrep.replace(':', 'h') + '\n' : '') +
            noteDepuisQuestionnaire(rep),
      contexte: JSON.stringify(rep),
      /* À qui revient le cours, et qui l'a préparé : deux choses
         différentes dès qu'on prépare pour un collègue. */
      moniteur: ($('prepPour') && $('prepPour').value) || ACCES.moniteur || '',
      preparePar: ACCES.moniteur || ''
    };

    const r = await appelPrep(Object.assign({ action: 'prepAdd' }, nouveau));

    $('prepEleve').value = '';
    if($('prepInfo')) $('prepInfo').textContent = '';
    if($('prepHistorique')){ $('prepHistorique').style.display = 'none'; }

    /* On ajoute le cours à la liste en mémoire plutôt que de tout
       relire : le serveur vient de le confirmer, il n'y a rien à
       aller rechercher. L'affichage est immédiat. */
    prepares.push(Object.assign({}, nouveau, {
      id: (r && r.id) || String(Date.now()),
      contexte: rep
    }));
    await afficherPrepares(false);
    showToast('Cours préparé ✅');
  }catch(e){
    showToast('Enregistrement impossible : ' + e.message);
  }finally{
    btn.disabled = false;
    btn.textContent = '📝 Préparer les notes';
  }
}

/* Ce que le moniteur de l'examen officiel a laissé dans les
   notes : l'inspecteur et les heures qu'il jugeait nécessaires.

   Il n'est pas forcément celui qui fait le rendez-vous, d'où ce
   rappel en tête d'écran. */
function mentionDeLExamen(cours, suivi){
  const sources = [
    String((cours && cours.note) || ''),
    String((suivi && suivi.note) || ''),
    (typeof ficheDe === 'function' && cours
      ? String((ficheDe(cours.eleve) || {}).remarques || '') : '')
  ];

  for(const t of sources){
    const lignes = t.split('\n');
    const i = lignes.findIndex(x => x.indexOf('🔒 EXAMEN OFFICIEL') !== -1);
    if(i === -1) continue;

    /* « Demandé : 4 + 3 heures » — on ne retient que le premier */
    const m = lignes[i].match(/Demandé\s*:\s*(\d+)/i);

    /* Les lignes 🔒 qui suivent : ce que le moniteur a écrit
       pour l'équipe. */
    const notes = [];
    for(let k = i + 1; k < lignes.length; k++){
      if(lignes[k].trim().indexOf('🔒') !== 0) break;
      notes.push(lignes[k].replace(/^\s*🔒\s*/, ''));
    }

    return {
      texte: lignes[i].replace('🔒 EXAMEN OFFICIEL · ', ''),
      note: notes.join('\n'),
      heures: m ? m[1] : ''
    };
  }
  return null;
}


function ouvrirRdvPost(cours){
  rdvPostEnCours = cours;
  const s = suiviDe(cours.eleve) || {};

  $('rdvPostEleve').textContent = cours.eleve || '';
  $('rdvPostInfo').textContent = 'Prévu le ' + libelleDate(cours.date) +
    (cours.moniteur ? ' · ' + cours.moniteur : '') +
    (s.nbAjournements ? ' · ' + mentionAjournements(s.nbAjournements, s.dateAjournement) : '');

  /* Ce que le moniteur de l'examen a demandé. Il n'est pas
     forcément celui qui corrige : sans ce rappel, l'information
     se perdait entre les deux. */
  const memo = mentionDeLExamen(cours, s);
  const zm = $('rdvPostExamen');
  if(zm){
    if(memo){
      zm.style.display = 'block';
      zm.innerHTML = '<div style="font-size:11px;color:var(--muted);' +
        'margin-bottom:3px;">🏁 À la sortie de l\'examen</div>' +
        '<div style="font-size:14px;line-height:1.6;">' +
        memo.texte.replace(/</g, '&lt;') + '</div>' +
        (memo.note
          ? '<div style="font-size:14px;line-height:1.6;margin-top:7px;' +
            'padding-top:7px;border-top:1px solid rgba(255,255,255,.08);' +
            'white-space:pre-wrap;">' +
            memo.note.replace(/</g, '&lt;') + '</div>'
          : '');
    }else{
      zm.style.display = 'none';
    }
  }

  /* Les captures du CEPC, déposées par le bureau ou ajoutées ici */
  const zc = $('rdvPostCepc');
  zc.innerHTML = '';
  zc.appendChild(blocCaptures(cours.eleve, ''));

  /* Le bilan d'examen officiel : dans la note préparée, ou dans la fiche */
  const note = String(cours.note || '');
  const sep = "BILAN DE L'EXAMEN À CORRIGER :";
  const i = note.indexOf(sep);
  $('rdvPostBilan').value = (i !== -1) ? note.slice(i + sep.length).trim()
                                       : (s.bilanExamen || '');

  /* Ce que l'élève a écrit, et ce que le moniteur ajoute */
  $('rdvPostEleveBilan').value = s.bilanEleve || '';
  $('rdvPostTexte').value = s.texteMoniteur || '';

  const sel = $('rdvPostSuite');
  sel.innerHTML = '<option value="">— à définir —</option>';
  SUITES_POST.forEach(x => {
    const o = document.createElement('option');
    o.value = x.cle; o.textContent = x.nom;
    sel.appendChild(o);
  });
  sel.value = s.suite || '';

  /* Le nombre d'heures ne se demande que si un repassage est envisagé.
     On part de ce qu'avait demandé le moniteur de l'examen : le
     moniteur du rendez-vous garde le dernier mot. */
  const hh = $('rdvPostHeures');
  hh.value = s.heuresRepassage || (memo ? memo.heures : '') || '';
  const majH = () => {
    hh.style.display = (sel.value && sel.value !== 'impossible') ? 'block' : 'none';
  };
  sel.onchange = majH;
  majH();

  $('rdvPostCom').value = s.commentaireMoniteur || '';
  $('rdvPostMsg').textContent = '';

  $('recordView').style.display = 'none';
  $('resultView').style.display = 'none';
  $('rdvPostView').style.display = 'block';
  window.scrollTo(0, 0);
}

function fermerRdvPost(){
  rdvPostEnCours = null;
  $('rdvPostView').style.display = 'none';
  $('recordView').style.display = 'block';
  if(typeof afficherVue === 'function') afficherVue('cours', 'cours');
}

async function terminerRdvPost(){
  if(!rdvPostEnCours) return;
  const suite = $('rdvPostSuite').value;
  const heures = $('rdvPostHeures').value.trim();
  const msg = $('rdvPostMsg');

  if(!suite){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = 'Indique la suite à donner avant de terminer.';
    return;
  }
  if(suite !== 'impossible' && !heures){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = "Indique le nombre d'heures avant le repassage.";
    return;
  }

  const b = $('rdvPostEnr');
  b.disabled = true;
  b.textContent = 'Enregistrement…';
  try{
    const eleve = rdvPostEnCours.eleve;

    const majs = {
      bilanExamen: $('rdvPostBilan').value.trim(),
      bilanEleve: $('rdvPostEleveBilan').value.trim(),
      texteMoniteur: $('rdvPostTexte').value.trim(),
      suite: suite,
      heuresRepassage: (suite === 'impossible') ? '' : heures,
      commentaireMoniteur: $('rdvPostCom').value.trim(),
      rdvPostFait: 'oui',
      /* L'élève rejoint la liste qui correspond à la conclusion */
      retireAPrevoir: (suite === 'impossible') ? 'oui' : '',
      par: ACCES.moniteur || ''
    };
    await majSuivi(eleve, majs);

    /* Le bureau est informé, et la note oriente les listes */
    const conclusion = libelleSuite(suite) +
      (suite !== 'impossible' && heures ? ' — ' + heures + 'h à faire' : '');

    if(suite === 'impossible'){
      await envoyerConsigne(eleve, 'permis',
        'Rendez-vous post-permis fait — ⛔ pas de repassage pour le moment. ' +
        'Reprise des leçons avant de se décider.' +
        ($('rdvPostCom').value.trim() ? ' · ' + $('rdvPostCom').value.trim() : ''));
    }else{
      await envoyerConsigne(eleve, 'permis',
        'Rendez-vous post-permis fait — ' + conclusion +
        " · Date d'examen à prévoir" +
        ($('rdvPostCom').value.trim() ? ' · ' + $('rdvPostCom').value.trim() : ''));
    }

    /* Le cours préparé n'a plus lieu d'être */
    if(rdvPostEnCours.id){
      try{ await appelPrep({ action: 'prepDelete', id: rdvPostEnCours.id }); }catch(e){}
    }

    msg.style.color = 'var(--accent-text)';
    msg.textContent = '✅ ' + conclusion + ' — le bureau est informé.';
    showToast('Rendez-vous terminé ✅');
    await afficherPrepares();
    setTimeout(fermerRdvPost, 1400);
  }catch(e){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = 'Erreur : ' + e.message;
  }finally{
    b.disabled = false;
    b.textContent = '✅ Terminer le rendez-vous';
  }
}

/* ============================================================
   CE QUI A ÉTÉ PRÉPARÉ POUR CE COURS
   Le moniteur doit voir, avant de démarrer, ce que le collègue
   a noté en préparant — au même titre que le dernier cours.
   ============================================================ */
async function afficherPreparationEleve(){
  const zone = $('preparationEleve');
  if(!zone) return;

  const nom = $('studentName') ? $('studentName').value.trim() : '';
  if(nom.length < 3){ zone.style.display = 'none'; zone.innerHTML = ''; return; }

  let liste = prepares || [];
  if(!liste.length){
    try{
      const d = await appelPrep({ action: 'prepList' });
      liste = (d && d.preparations) || [];
    }catch(e){ liste = []; }
  }

  const jour = $('lessonDate') ? $('lessonDate').value : '';
  const siennes = liste.filter(x => normaliserMot(x.eleve || '') === normaliserMot(nom));
  const prep = siennes.find(x => x.date === jour) ||
               siennes.sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];

  if(!prep){
    zone.style.display = 'none';
    zone.innerHTML = '';
    return;
  }

  zone.innerHTML = '';
  const carte = document.createElement('div');
  carte.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:12px 14px;background:rgba(182,255,14,.08);';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;';
  t.textContent = '📝 Préparé le ' +
    (dateEnToutesLettres(prep.date) || prep.date || '?') +
    (prep.preparePar ? ' par ' + prep.preparePar : '') +
    (prep.modeleLabel ? ' · ' + prep.modeleLabel : '');
  carte.appendChild(t);

  const note = String(prep.note || '').trim();

  /* Une consigne du type « pas d'écoute pédagogique » se noie dans
     la note : on la sort en évidence. */
  if(/pas d'écoutes? pédagogiques?/i.test(note)){
    const a = document.createElement('div');
    a.style.cssText = 'font-size:14px;font-weight:700;color:var(--warn-text);' +
      'margin-bottom:6px;';
    a.textContent = "🚫 Pas d'écoutes pédagogiques";
    carte.appendChild(a);
  }

  const n = document.createElement('div');
  if(note){
    n.style.cssText = 'font-size:15px;font-weight:600;color:var(--accent-text);' +
      'line-height:1.45;white-space:pre-wrap;';
    n.textContent = note;
  }else{
    n.style.cssText = 'font-size:13px;color:var(--muted);';
    n.textContent = 'Cours préparé, sans note particulière.';
  }
  carte.appendChild(n);

  /* Les procédures demandées : le moniteur doit savoir d'un coup
     d'œil si l'élève a fait ce qu'on lui a demandé. */
  const zRecit = document.createElement('div');
  carte.appendChild(zRecit);
  afficherEtatRecitations(nom, zRecit);

  /* Les manœuvres cochées à la préparation : le moniteur qui prend
     le cours doit savoir ce que son collègue comptait valider.
     La section s'affiche toujours — une absence silencieuse laisse
     croire à un défaut d'affichage. */
  /* Le contexte arrive parfois en texte : il vient du classeur,
     où tout est stocké tel quel. */
  let ctx = prep.contexte;
  if(typeof ctx === 'string' && ctx.trim()){
    try{ ctx = JSON.parse(ctx); }catch(e){ ctx = null; }
  }
  const ajoutees = (ctx && ctx.manoeuvresAjoutees) || [];

  const sep = document.createElement('div');
  sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0;';
  carte.appendChild(sep);

  /* Les marques déjà posées par les moniteurs précédents, pour
     signer chaque manœuvre de qui l'a fait travailler. */
  let marquesConnues = {};
  try{
    const d = await chargerDossierEleve(nom);
    marquesConnues = (d && d.marques) || {};
  }catch(e){ /* hors ligne : on affiche sans les émojis */ }

  /* Ce qui est acquis, quel qu'en soit le cours : les manœuvres
     déjà validées par un moniteur comptent autant que celles
     cochées à la préparation. */
  const acquises = BLOC.ficheListeConduite.filter(x =>
    marquesConnues[normaliserMot(x)] && ajoutees.indexOf(x) === -1);

  const faites = ajoutees.concat(acquises);

  const t2 = document.createElement('div');
  t2.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:4px;';
  t2.textContent = '🦉 Fiche véhicule — ' + faites.length + ' sur ' +
                   BLOC.ficheListeConduite.length;
  carte.appendChild(t2);

  const ligneManoeuvre = (x, prevue) => {
    const li = document.createElement('div');
    const marque = marquesConnues[normaliserMot(x)] || '';
    li.innerHTML = '· ' + x.replace(/</g, '&lt;') +
      (marque ? ' <span style="letter-spacing:1px;">' + marque + '</span>' : '') +
      (prevue ? ' <span style="font-size:11px;color:var(--muted);">' +
                'prévue aujourd\'hui</span>' : '');
    return li;
  };

  if(faites.length){
    const l = document.createElement('div');
    l.style.cssText = 'font-size:13px;line-height:1.7;';
    /* Celles du jour d'abord, les acquises ensuite */
    ajoutees.forEach(x => l.appendChild(ligneManoeuvre(x, true)));
    acquises.forEach(x => l.appendChild(ligneManoeuvre(x, false)));
    carte.appendChild(l);

    /* Sans rien de coché à la préparation, on le dit quand même :
       la liste ne montre alors que ce qui vient d'avant. */
    if(!ajoutees.length){
      const n = document.createElement('div');
      n.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;margin-top:5px;';
      n.textContent = ctx
        ? 'Aucune manœuvre cochée lors de la préparation — ci-dessus, ' +
          'ce qui est déjà acquis.'
        : 'Préparation antérieure à la fiche véhicule — ci-dessus, ' +
          'ce qui est déjà acquis.';
      carte.appendChild(n);
    }
  }else{
    const v = document.createElement('div');
    v.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;';
    v.textContent = ctx
      ? 'Aucune manœuvre cochée lors de la préparation, et rien d\'acquis ' +
        'pour l\'instant.'
      : 'Préparation antérieure à la fiche véhicule : rien à afficher.';
    carte.appendChild(v);
  }

  /* Ce qui reste : c'est ce que le moniteur doit travailler aujourd'hui */
  const restantes = BLOC.ficheListeConduite.filter(
    x => faites.indexOf(x) === -1);

  if(restantes.length){
    const t3 = document.createElement('div');
    t3.style.cssText = 'font-size:13px;font-weight:700;color:var(--warn-text);' +
      'margin:10px 0 4px;';
    t3.textContent = '❓ Reste à travailler — ' + restantes.length;
    carte.appendChild(t3);

    const r = document.createElement('div');
    r.style.cssText = 'font-size:13px;color:var(--muted);line-height:1.7;';
    restantes.forEach(x => {
      const li = document.createElement('div');
      li.textContent = '· ' + x;
      r.appendChild(li);
    });
    carte.appendChild(r);
  }

  zone.appendChild(carte);
  zone.style.display = 'block';
}

/* Rouvre le questionnaire d'une préparation et l'enregistre à la
   place de l'ancienne. Le contexte est repris tel quel : on ne
   repart pas de zéro. */
async function modifierPreparation(cours){
  if(!cours || !cours.id) return;

  /* Le questionnaire lit l'élève et le modèle dans l'écran de cours */
  const nomAvant = $('studentName') ? $('studentName').value : '';
  const modAvant = $('modele') ? $('modele').value : '';
  const dateAvant = $('lessonDate') ? $('lessonDate').value : '';

  if($('studentName')) $('studentName').value = cours.eleve || '';
  if($('modele') && cours.modele) $('modele').value = cours.modele;
  if($('lessonDate') && cours.date) $('lessonDate').value = cours.date;

  let rep = null;
  try{
    rep = await ouvrirQuestionnaireDepart(cours.contexte || {},
                                          'Modifier la préparation', 'Enregistrer');
  }finally{
    /* On remet l'écran comme on l'a trouvé */
    if($('studentName')) $('studentName').value = nomAvant;
    if($('modele')) $('modele').value = modAvant;
    if($('lessonDate')) $('lessonDate').value = dateAvant;
  }

  if(!rep) return;

  try{
    /* Le moniteur a pu changer le type de bilan dans le questionnaire */
    const cleModele = rep.modele || cours.modele;

    /* L'heure déjà posée sur ce cours : elle ne doit pas se perdre
       quand on retouche les notes. */
    const hDejaLa = heureDeLaPreparation(cours);

    await appelPrep({
      action: 'prepAdd',
      id: cours.id,                    /* même identifiant : on remplace */
      date: cours.date,
      eleve: cours.eleve,
      modele: cleModele,
      modeleLabel: (MODELES[cleModele] && MODELES[cleModele].label) ||
                   cours.modeleLabel || '',
      site: cours.site || '',
      /* On modifie une préparation existante : son heure vient du
         cours lui-même, pas du formulaire de création. */
      note: (hDejaLa ? '🕐 ' + hDejaLa.replace(':', 'h') + '\n' : '') +
            noteDepuisQuestionnaire(rep),
      contexte: JSON.stringify(rep),
      moniteur: cours.moniteur || ACCES.moniteur || ''
    });
    /* La ligne en mémoire suit : elle vient d'être confirmée par le
       serveur, la relire n'apprendrait rien de plus. */
    const dans = prepares.find(x => String(x.id) === String(cours.id));
    if(dans){
      dans.modele = cleModele;
      dans.modeleLabel = (MODELES[cleModele] && MODELES[cleModele].label) ||
                         cours.modeleLabel || '';
      /* La même note que celle envoyée au serveur, heure comprise :
         sans elle, l'heure disparaissait de l'écran jusqu'au
         prochain rafraîchissement. */
      dans.note = (hDejaLa ? '🕐 ' + hDejaLa.replace(':', 'h') + '\n' : '') +
                  noteDepuisQuestionnaire(rep);
      dans.contexte = rep;
    }
    showToast('Préparation modifiée ✅');
    await afficherPrepares(false);
  }catch(e){
    showToast('Modification impossible : ' + e.message);
  }
}

/* Amène l'écran sur le module de cours, prêt à démarrer. */
/* L'heure d'un cours, écrite dans sa note par le rappel ou par le
   bureau. Elle vient toujours de la même mention 🕐. */
/* Les repères posés par le rappel de cours : carte d'identité,
   carte SD. Ils vivent en tête de la note. */
/* L'état des récitations demandées à cet élève */
async function afficherEtatRecitations(nom, zone){
  if(!zone || !nom) return;

  let demandes = [], recits = [];
  try{
    const [a, b] = await Promise.all([
      appelPrep({ action: 'demandesList', eleve: nom }),
      appelPrep({ action: 'recitationsList' })
    ]);
    demandes = (a && a.demandes) || [];
    recits = ((b && b.recitations) || [])
      .filter(x => normaliserMot(x.eleve || '') === normaliserMot(nom));
  }catch(e){ return; }

  if(!demandes.length && !recits.length) return;

  const sep = document.createElement('div');
  sep.style.cssText = 'border-top:1px solid var(--line);margin:10px 0;';
  zone.appendChild(sep);

  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
    'margin-bottom:5px;';
  t.textContent = '📌 Procédures à réciter';
  zone.appendChild(t);

  /* Chaque demande, avec ce qu'elle est devenue */
  const vues = {};
  demandes.forEach(d => {
    const dit = recits.filter(r =>
      normaliserMot(r.procedure || '') === normaliserMot(d.procedure));
    /* La plus récente fait foi */
    const dernier = dit.length ? dit[0] : null;
    vues[normaliserMot(d.procedure)] = true;

    const l = document.createElement('div');
    l.style.cssText = 'display:flex;gap:8px;align-items:flex-start;' +
      'font-size:13px;line-height:1.5;padding:3px 0;';

    let etat, couleur;
    if(!dernier){
      etat = 'pas encore récitée';
      couleur = 'var(--warn-text)';
    }else if(dernier.etat === 'valide'){
      etat = 'récitée et corrigée';
      couleur = 'var(--accent-text)';
    }else{
      etat = 'récitée — correction à valider';
      couleur = 'var(--warn-text)';
    }

    l.innerHTML = '<span style="flex-shrink:0;">' +
      (!dernier ? '⏳' : (dernier.etat === 'valide' ? '✅' : '👀')) + '</span>' +
      '<span style="flex:1;min-width:0;">' +
        d.procedure.replace(/</g, '&lt;') +
        '<span style="color:' + couleur + ';font-size:11px;"> — ' + etat + '</span>' +
        '<div style="font-size:11px;color:var(--muted);">demandée le ' +
          (d.demandeLe || '').replace(/</g, '&lt;') +
          (d.par ? ' par ' + d.par.replace(/</g, '&lt;') : '') + '</div>' +
      '</span>';
    zone.appendChild(l);
  });

  /* Ce qu'il a récité de lui-même, sans qu'on le lui demande */
  recits.filter(r => !vues[normaliserMot(r.procedure || '')])
    .slice(0, 5)
    .forEach(r => {
      const l = document.createElement('div');
      l.style.cssText = 'display:flex;gap:8px;align-items:flex-start;' +
        'font-size:13px;line-height:1.5;padding:3px 0;';
      l.innerHTML = '<span style="flex-shrink:0;">' +
        (r.etat === 'valide' ? '✅' : '👀') + '</span>' +
        '<span style="flex:1;min-width:0;">' +
          (r.procedure || '').replace(/</g, '&lt;') +
          '<span style="color:var(--muted);font-size:11px;"> — de lui-même' +
          (r.etat === 'valide' ? '' : ', à valider') + '</span></span>';
      zone.appendChild(l);
    });
}


/* Les mentions à prévoir : carte d'identité, carte SD.

   Elles se cochent au rappel ; quand on les oublie, on les
   rattrape ici. Elles vivent en tête de note, à côté de l'heure. */
function ouvrirMentions(cours){
  const t = String(cours.note || '');
  const debut = t.split('\n')[0];

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(400px, 94vw)';

  boite.innerHTML = '<h3>À prévoir pour ' +
    String(cours.eleve || '').replace(/</g, '&lt;') + '</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;' +
      'line-height:1.5;">Ce que le moniteur doit avoir en tête au ' +
      'moment du cours.</div>';

  const faire = (emoji, texte, present) => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:11px;' +
      'text-transform:none;font-size:15px;color:var(--cream);margin:0 0 10px;' +
      'font-weight:400;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = present;
    cb.dataset.emoji = emoji;
    cb.style.cssText = 'width:19px;height:19px;flex-shrink:0;margin:0;';
    l.appendChild(cb);
    const s = document.createElement('span');
    s.style.cssText = 'flex:1;min-width:0;';
    s.textContent = emoji + '  ' + texte;
    l.appendChild(s);
    boite.appendChild(l);
    return cb;
  };

  const cbCI = faire('🆔', "Carte d'identité à déposer", debut.indexOf('🆔') !== -1);
  const cbSD = faire('💾', 'Carte SD à récupérer', debut.indexOf('💾') !== -1);

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bA);

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = '💾 Enregistrer';
  bO.addEventListener('click', async () => {
    /* On refait la première ligne : l'heure d'abord, puis les
       mentions, dans un ordre stable. */
    const h = heureDeLaPreparation(cours);
    const marques = [];
    if(cbCI.checked) marques.push('🆔');
    if(cbSD.checked) marques.push('💾');

    const reste = t.replace(/^[^\n]*\n?/, '');
    const tete = (h ? '🕐 ' + h.replace(':', 'h') + ' ' : '') + marques.join(' ');

    /* Si la première ligne ne portait que ces repères, on ne la
       garde que si elle a encore quelque chose à dire. */
    const avaitTete = /^(🕐|🆔|💾)/.test(debut);
    const nouvelle = tete.trim()
      ? tete.trim() + '\n' + (avaitTete ? reste : t)
      : (avaitTete ? reste : t);

    bO.disabled = true;
    try{
      await appelPrep({
        action: 'prepAdd', id: cours.id, date: cours.date,
        eleve: cours.eleve, modele: cours.modele,
        modeleLabel: cours.modeleLabel || '',
        site: cours.site || '',
        note: nouvelle,
        contexte: JSON.stringify(cours.contexte || {}),
        moniteur: cours.moniteur || ACCES.moniteur || ''
      });
      const dans = prepares.find(x => String(x.id) === String(cours.id));
      if(dans) dans.note = nouvelle;
      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      afficherPrepares();
    }catch(e){
      showToast('Impossible : ' + e.message);
      bO.disabled = false;
    }
  });
  r.appendChild(bO);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


function repereDeNote(cours){
  const t = String((cours && cours.note) || '');
  const debut = t.split('\n')[0];

  const emojis = [];
  const quoi = [];
  if(debut.indexOf('🆔') !== -1){ emojis.push('🆔'); quoi.push("carte d'identité"); }
  if(debut.indexOf('💾') !== -1){ emojis.push('💾'); quoi.push('carte SD'); }

  if(!emojis.length) return null;
  return { emojis: emojis.join(''), titre: 'À prévoir : ' + quoi.join(' · ') };
}


function heureDeLaPreparation(cours){
  const t = String((cours && cours.note) || '');

  /* « 9h30 », « 09:30 », mais aussi « 9h » tout court : une heure
     ronde s'écrit sans ses minutes, et elle se perdait. */
  const m = t.match(/🕐\s*(\d{1,2})\s*[h:]\s*(\d{2})?/);
  if(!m) return '';
  return String(m[1]).padStart(2, '0') + ':' + (m[2] || '00');
}


function amenerAuCours(){
  setTimeout(() => {
    /* Le bouton lui-même, centré : viser le haut de la carte
       laissait le moniteur devant les champs, avec le bouton hors
       de l'écran et un défilement de plus à faire. */
    const b = $('recBtn') || $('recordView');
    if(!b) return;
    try{
      b.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }catch(e){
      /* Navigateur ancien : au moins on y va */
      window.scrollTo(0, Math.max(0, b.offsetTop - 160));
    }
  }, 150);
}

/* Demande une date, avec celle du cours pré-remplie */
function demanderDate(titre, dateActuelle, heureActuelle){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const boite = document.createElement('div');
    boite.className = 'modal';
    boite.style.maxWidth = '340px';

    const h = document.createElement('h3');
    h.textContent = titre;
    boite.appendChild(h);

    const lD = document.createElement('label');
    lD.textContent = 'Date';
    boite.appendChild(lD);

    const champ = document.createElement('input');
    champ.type = 'date';
    champ.value = dateActuelle || todayLocal();
    boite.appendChild(champ);

    /* L'heure se change au même endroit : un changement de
       planning déplace souvent les deux. */
    const lH = document.createElement('label');
    lH.textContent = 'Heure';
    boite.appendChild(lH);

    const champH = document.createElement('input');
    champH.type = 'time';
    champH.value = heureActuelle || '';
    boite.appendChild(champH);

    const r = document.createElement('div');
    r.className = 'btn-row';

    const bAnn = document.createElement('button');
    bAnn.className = 'btn btn-secondary';
    bAnn.textContent = 'Annuler';
    bAnn.addEventListener('click', () => {
      document.body.removeChild(fond);
      resolve(null);
    });

    const bOk = document.createElement('button');
    bOk.className = 'btn btn-primary';
    bOk.textContent = 'Valider';
    bOk.addEventListener('click', () => {
      const v = champ.value;
      const hv = champH.value;
      document.body.removeChild(fond);
      /* On rend les deux : l'appelant prend ce qui l'intéresse */
      resolve(v ? { date: v, heure: hv } : null);
    });

    r.appendChild(bAnn); r.appendChild(bOk);
    boite.appendChild(r);
    fond.appendChild(boite);
    document.body.appendChild(fond);
    setTimeout(() => champ.focus(), 100);
  });
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-prepares.js'] = true;
