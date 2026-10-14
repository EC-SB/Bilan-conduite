/* Déployé le 14/10/2026 à 12:39 — v1175 */
/* ============================================================
   📋 RENSEIGNEMENTS ET DISPONIBILITÉS — v1175

   David, le 14 octobre : « il faut que tu crées sur la page élève
   un questionnaire avec tout ça pour remplacer le Google Form, et
   que les réponses arrivent dans la fiche de l'élève directement
   sous poste de conduite. On demande aux élèves de remplir ce
   questionnaire dès le début pour nous aider quand on doit décaler
   leurs leçons, mettre à jour la fiche Drivup, mais tous ne
   répondent pas et c'est un problème pour moi. »

   Puis : « laisse-moi la possibilité de modifier les renseignements
   qui apparaîtront côté élève, de rajouter des catégories au
   besoin ».

   Trois choses vivent ici :
   · le cadre « 📋 Renseignements et disponibilités » de 📇 Fiche ;
   · l'écran 👥 Élèves › 📋 Renseignements : qui n'a pas répondu,
     les relances, la reprise des réponses du Google Form ;
   · le gestionnaire du questionnaire (administrateurs).

   ⚠️ LE QUESTIONNAIRE EST UNE DONNÉE, PAS DU CODE. Ses catégories
   et ses questions sont rangées dans D1 (le Worker les sert à la
   page élève à la connexion). Le formulaire que l'élève remplit,
   l'aperçu du gestionnaire et « ✏️ Remplir avec lui » sont UNE
   SEULE page — eleve.html — ouverte ici dans un cadre : trois
   dessins du même formulaire finiraient par ne plus dire la même
   chose.
   ============================================================ */

const TYPES_RG = {
  texte:     { emoji: '📝', nom: 'Texte' },
  ouinon:    { emoji: '✅', nom: 'Oui / Non' },
  pastilles: { emoji: '🔘', nom: 'Pastilles' },
  tel:       { emoji: '📱', nom: 'Téléphone' },
  mail:      { emoji: '✉️', nom: 'Mail' },
  date:      { emoji: '📅', nom: 'Date' },
  /* Celle-ci ne se crée pas : c'est LA grille des disponibilités,
     qu'on modifie (jours, créneaux) mais qu'on n'ajoute pas. */
  dispo:     { emoji: '🗓️', nom: 'Grille des disponibilités' }
};
const TYPES_RG_CREABLES = ['texte', 'ouinon', 'pastilles', 'tel', 'mail', 'date'];

/* Les deux questions que l'application relie à la fiche. Elles se
   renomment et se déplacent ; supprimées, le lien part avec elles. */
const LIENS_RG = {
  facebook: '🔗 Sa réponse va dans 💬 Messenger de la fiche, si la case est vide.',
  amenage:  '🔗 « Oui » alerte si ♿ Conduite aménagée n’est pas cochée au poste de conduite.'
};

let rgDonnees = null;      /* { modele, eleves:[…], lu } */
let rgEnCours = null;      /* la lecture en vol, partagée */
let rgFiltre = 'ademander';
let rgEdition = null;      /* le brouillon du gestionnaire, ou null */

const echRg = x => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------
   LA LECTURE — une seule pour l'écran et pour les fiches
   ------------------------------------------------------------ */
async function chargerRenseignements(force){
  if(!force && rgDonnees && Date.now() - rgDonnees.lu < 60000) return rgDonnees;
  if(rgEnCours) return rgEnCours;
  rgEnCours = (async () => {
    try{
      const d = await appelPrep({ action: 'renseignementsListe' });
      if(d && d.status === 'error') throw new Error(d.message);
      rgDonnees = { modele: (d && d.modele) || null, eleves: (d && d.eleves) || [],
                    modeleMaj: (d && d.modeleMaj) || '', lu: Date.now() };
      return rgDonnees;
    }finally{ rgEnCours = null; }
  })();
  return rgEnCours;
}

function rgDe(nom){
  if(!rgDonnees) return null;
  const cle = normaliserMot(nom);
  return rgDonnees.eleves.find(x => normaliserMot(x.eleve) === cle) || null;
}

function questionsRg(modele){
  const out = [];
  ((modele && modele.categories) || []).forEach(c => (c.questions || []).forEach(q => out.push(q)));
  return out;
}

function reponseDonnee(q, v){
  if(v === undefined || v === null) return false;
  if(q.type === 'ouinon') return v === true || v === false;
  if(q.type === 'pastilles') return Array.isArray(v) && v.some(x => String(x).trim());
  if(q.type === 'dispo'){
    const jours = q.jours || [];
    return !!v && typeof v === 'object' && jours.length > 0 &&
      jours.every(j => Array.isArray(v[j]) && v[j].length);
  }
  return String(v).trim() !== '';
}

/* Ce qui manque : les questions obligatoires du questionnaire
   D'AUJOURD'HUI sans réponse. Une question ajoutée après coup
   rend la fiche incomplète — c'est le choix de David (« on leur
   demande la nouvelle »). */
function questionsManquantes(modele, reponses){
  const r = reponses || {};
  return questionsRg(modele).filter(q => q.obligatoire && !reponseDonnee(q, r[q.id]));
}

function etatRg(x, modele){
  if(!x || !x.reponses) return 'vide';
  return questionsManquantes(modele, x.reponses).length ? 'incomplet' : 'complet';
}

function valeurLisibleRg(q, v){
  if(q.type === 'ouinon') return v === true ? 'Oui' : (v === false ? 'Non' : '—');
  if(q.type === 'pastilles') return (v || []).join(' · ');
  if(q.type === 'date'){
    return (typeof dateEnToutesLettres === 'function') ? (dateEnToutesLettres(v) || String(v)) : String(v);
  }
  return String(v == null ? '' : v);
}

/* « à surveiller » : Oui quand on a écrit « si Oui », Non quand on a
   écrit « si Non ». Le rouge de la fiche ne vient que de là. */
function enAlerteRg(q, v){
  if(q.type !== 'ouinon') return false;
  return (q.alerte === 'oui' && v === true) || (q.alerte === 'non' && v === false);
}

/* ------------------------------------------------------------
   📇 FICHE › LE CADRE
   ------------------------------------------------------------ */
function cadreRenseignements(corps, nom){
  const c = document.createElement('div');
  c.className = 'rgApp';
  corps.appendChild(c);
  if(!rgDonnees){
    c.innerHTML = '<div class="rgAppTete"><span>📋 <strong>Renseignements et disponibilités</strong></span></div>' +
      '<div class="empty">Lecture…</div>';
    chargerRenseignements().then(() => { if(c.isConnected) remplirCadreRg(c, nom); })
      .catch(e => { if(c.isConnected) c.querySelector('.empty').textContent = '⚠️ ' + (e.message || e); });
    return c;
  }
  remplirCadreRg(c, nom);
  return c;
}

function remplirCadreRg(c, nom){
  const modele = rgDonnees.modele;
  const x = rgDe(nom);
  const etat = etatRg(x, modele);
  c.className = 'rgApp' + (etat === 'complet' ? '' : ' rgAppManque');
  c.innerHTML = '';

  const tete = document.createElement('div');
  tete.className = 'rgAppTete';
  tete.innerHTML = '<span>📋 <strong>Renseignements et disponibilités</strong></span>' +
    (x && x.reponses ? '<span class="rgAppQuand">' + echRg(texteQuiQuandRg(x)) + '</span>' : '');
  c.appendChild(tete);

  if(etat === 'vide'){
    const a = document.createElement('div');
    a.className = 'rgAppAlerte';
    a.innerHTML = '⚠️ <b>Pas encore rempli.</b> ' + echRg(texteDemandeRg(x));
    c.appendChild(a);
    c.appendChild(boutonsRg(nom, x, true));
    return;
  }

  const r = x.reponses;
  const manque = questionsManquantes(modele, r);
  if(manque.length){
    const a = document.createElement('div');
    a.className = 'rgAppAlerte';
    a.innerHTML = '🆕 <b>' + manque.length + (manque.length > 1 ? ' nouvelles questions' : ' nouvelle question') +
      ' sans réponse</b> : ' + manque.map(q => '« ' + echRg(q.court || q.libelle) + ' »').join(', ') + '.';
    c.appendChild(a);
  }

  /* L'écart avec le poste de conduite : on le DIT, rien ne se coche
     tout seul (choix de David). */
  const poste = (typeof posteDeConduite === 'function') ? (posteDeConduite(nom) || {}) : {};
  if(r.amenage === true && !poste.amenagee){
    const a = document.createElement('div');
    a.className = 'rgAppAlerte';
    a.innerHTML = '⚠️ Il a répondu <b>Oui</b> à « véhicule aménagé », mais <b>Conduite aménagée</b> ' +
      'n’est pas cochée au poste de conduite.';
    c.appendChild(a);
  }

  let alertes = 0;
  const dejaVues = {};
  (modele.categories || []).forEach(cat => {
    const qs = (cat.questions || []).filter(q => reponseDonnee(q, r[q.id]));
    if(!qs.length) return;
    qs.forEach(q => { dejaVues[q.id] = 1; });
    const st = document.createElement('div');
    st.className = 'rgAppST';
    st.textContent = ((cat.emoji ? cat.emoji + ' ' : '') + cat.titre);
    c.appendChild(st);

    /* Les lignes, puis les Oui / Non en pastilles, puis la grille :
       chacun sa forme, dans l'ordre de la catégorie. */
    const lignes = qs.filter(q => q.type !== 'ouinon' && q.type !== 'dispo');
    if(lignes.length){
      const t = document.createElement('div');
      t.className = 'rgAppTable';
      lignes.forEach(q => t.appendChild(ligneRg(q, r[q.id], nom)));
      c.appendChild(t);
    }
    const on = qs.filter(q => q.type === 'ouinon');
    if(on.length){
      const p = document.createElement('div');
      p.className = 'rgAppPuces';
      on.forEach(q => {
        const al = enAlerteRg(q, r[q.id]);
        if(al) alertes++;
        const s = document.createElement('span');
        s.className = 'rgAppPuce' + (al ? ' alerte' : '');
        s.innerHTML = echRg(q.court || q.libelle) + ' : <b>' + valeurLisibleRg(q, r[q.id]) + '</b>';
        p.appendChild(s);
      });
      c.appendChild(p);
    }
    qs.filter(q => q.type === 'dispo').forEach(q => c.appendChild(grilleRg(q, r[q.id])));
  });

  /* Les réponses à des questions retirées depuis : elles restent,
     sous leur ancien libellé. Une donnée ne disparaît pas parce
     qu'on a changé le questionnaire. */
  const anciennes = Object.keys(r).filter(k => !dejaVues[k] && r[k] !== '' && r[k] != null &&
    !questionsRg(modele).some(q => q.id === k));
  if(anciennes.length){
    const st = document.createElement('div');
    st.className = 'rgAppST';
    st.textContent = '🗂️ Anciennes questions';
    c.appendChild(st);
    const t = document.createElement('div');
    t.className = 'rgAppTable';
    anciennes.forEach(k => {
      const lib = (x.libelles && x.libelles[k]) || k;
      const v = r[k];
      const q = { id: k, libelle: lib, type: typeof v === 'boolean' ? 'ouinon' : (Array.isArray(v) ? 'pastilles' : 'texte') };
      if(v && typeof v === 'object' && !Array.isArray(v)){
        t.appendChild(ligneRg({ libelle: lib, type: 'texte' },
          Object.keys(v).map(j => j + ' : ' + ((v[j] || []).join(', ') || '—')).join('\n'), nom));
      }else{
        t.appendChild(ligneRg(q, v, nom));
      }
    });
    c.appendChild(t);
  }

  if(alertes){
    const n = document.createElement('span');
    n.className = 'rgAppNb';
    n.textContent = '⚠️ ' + alertes + ' point' + (alertes > 1 ? 's' : '') + ' d’attention';
    tete.insertBefore(n, tete.children[1] || null);
  }
  c.appendChild(boutonsRg(nom, x, false));
}

/* « Rempli par » : le premier qui a rempli (l'élève, l'équipe — avec
   son nom —, ou la reprise du Google Form) ; « modifié » : le
   dernier, s'il n'est pas l'élève. */
function texteQuiQuandRg(x){
  const s = String(x.source || '');
  const par = s.indexOf('equipe') === 0 ? 'Rempli par ' + (s.slice(7) || 'l’équipe')
            : s === 'form' ? 'Repris du Google Form' : 'Rempli par l’élève';
  const premier = s.indexOf('equipe') === 0 ? s.slice(7) : '';
  const modif = x.majLe && (x.majLe !== x.envoyeLe || (x.majPar && x.majPar !== premier && s !== 'form'));
  return par + ' le ' + (x.envoyeLe || '') +
    (modif ? ' · modifié le ' + x.majLe + (x.majPar && x.majPar !== 'Google Form' ? ' par ' + x.majPar : '') : '');
}

function texteDemandeRg(x){
  if(!x) return 'Il n’a pas d’espace élève : à remplir avec lui.';
  const bouts = [];
  if(x.demandeLe) bouts.push('Demandé dans sa messagerie le ' + x.demandeLe);
  if(x.relances) bouts.push('relancé ' + x.relances + ' fois, dernière fois le ' + x.derniereRelance);
  if(!x.vuLe) bouts.push(x.demandeLe ? 'son espace n’a pas encore été ouvert' : 'Son espace n’a pas encore été ouvert');
  if(x.acces && !x.messagerie) bouts.push('pas de messagerie sur son espace : à lui demander de vive voix');
  return bouts.length ? bouts.join(' · ') + '.' : 'Rien ne lui a encore été demandé.';
}

function ligneRg(q, v, nom){
  const l = document.createElement('div');
  const long = q.type === 'texte' && (q.long || String(v).length > 60);
  l.className = 'rgAppL' + (long ? ' dessous' : '');
  const k = document.createElement('span');
  k.className = 'k';
  k.textContent = q.court || q.libelle;
  const d = document.createElement('span');
  d.className = 'v';
  d.textContent = valeurLisibleRg(q, v);
  if(q.type === 'tel' && typeof telPourLien === 'function' && String(v).trim()){
    d.textContent = (typeof telLisible === 'function') ? telLisible(v) : String(v);
    d.classList.add('rgAppTel');
    [['💬', 'sms:', 'Envoyer un SMS'], ['📞', 'tel:', 'Appeler']].forEach(([em, proto, titre]) => {
      const a = document.createElement('a');
      a.href = proto + telPourLien(v);
      a.title = titre;
      a.textContent = em;
      d.appendChild(a);
    });
  }
  if(q.type === 'mail' && String(v).trim()){
    d.textContent = '';
    const a = document.createElement('a');
    a.href = 'mailto:' + String(v).trim();
    a.textContent = String(v).trim();
    a.className = 'rgAppMail';
    d.appendChild(a);
  }
  l.append(k, d);
  return l;
}

function grilleRg(q, v){
  const jours = q.jours || [];
  const cr = q.creneaux || [];
  const val = v || {};
  const t = document.createElement('table');
  t.className = 'rgAppGrille';
  t.innerHTML = '<thead><tr><th></th>' + cr.map(x => '<th>' + echRg(x) + '</th>').join('') + '</tr></thead><tbody>' +
    jours.map(j => {
      const w = val[j] || [];
      if(w.indexOf('pas') !== -1){
        return '<tr class="pas"><th>' + echRg(j.slice(0, 3)) + '.</th><td colspan="' + cr.length + '">' +
          echRg(q.pasDispo || 'Pas disponible') + '</td></tr>';
      }
      return '<tr><th>' + echRg(j.slice(0, 3)) + '.</th>' + cr.map(x =>
        '<td class="' + (w.indexOf(x) !== -1 ? 'oui' : '') + '">' + (w.indexOf(x) !== -1 ? '✓' : '') + '</td>').join('') + '</tr>';
    }).join('') + '</tbody>';
  const z = document.createElement('div');
  z.className = 'rgAppGrilleZone';
  z.appendChild(t);
  return z;
}

function boutonsRg(nom, x, vide){
  const b = document.createElement('div');
  b.className = 'rgAppBouts';
  const bouton = (txt, f) => {
    const e = document.createElement('button');
    e.type = 'button';
    e.className = 'btn btn-secondary';
    e.textContent = txt;
    e.addEventListener('click', async () => {
      e.disabled = true;
      try{ await f(); }catch(err){ showToast('Impossible : ' + (err.message || err)); }
      e.disabled = false;
    });
    b.appendChild(e);
    return e;
  };
  const etat = etatRg(x, rgDonnees && rgDonnees.modele);
  if(typeof peutModifier === 'function' && !peutModifier('eleves')) return b;
  if(x && x.acces && x.messagerie){
    bouton(etat === 'complet' ? '📨 Lui demander de les mettre à jour'
         : (x.demandeLe ? '📨 Le lui redemander' : '📨 Le lui demander'), () => demanderRenseignements(nom));
  }
  bouton(vide ? '✏️ Remplir avec lui' : '✏️ Modifier', () => remplirRenseignementsAvecLui(nom));
  return b;
}

async function demanderRenseignements(nom, sansConfirmer){
  const x = rgDe(nom);
  const complet = etatRg(x, rgDonnees && rgDonnees.modele) === 'complet';
  if(!sansConfirmer){
    const ok = await confirmer('Un message part dans la messagerie de son espace élève, avec une notification ' +
      'sur son téléphone, pour ' + (complet ? 'vérifier et mettre à jour ses renseignements.' : 'remplir ses renseignements.') +
      '\n\nLe questionnaire s’ouvrira tout seul à sa prochaine visite.', '📨 ' + nom);
    if(!ok) return false;
  }
  const d = await appelPrep({ action: 'renseignementsDemander', eleve: nom, miseAJour: complet });
  if(d && d.status === 'error') throw new Error(d.message);
  if(!sansConfirmer) showToast('📨 Demandé à ' + nom.split(' ')[0] + '.');
  await chargerRenseignements(true);
  redessinerRg();
  return true;
}

/* Après une écriture : la fiche ouverte et l'écran de la liste se
   redessinent, sans recharger la page. */
function redessinerRg(){
  if(typeof elevePageOuverte !== 'undefined' && elevePageOuverte && typeof ongletPageEleve !== 'undefined' &&
     ongletPageEleve === 'fiche' && typeof dessinerPageEleve === 'function' && $('pageEleveDossier')){
    dessinerPageEleve();
  }
  if($('rgZone') && !rgEdition) dessinerListeRg();
}

/* ------------------------------------------------------------
   LE FORMULAIRE — la page élève, dans un cadre

   « ✏️ Remplir avec lui », « ✏️ Modifier » et « 👁️ Voir comme
   l'élève » ouvrent eleve.html en mode formulaire. La page reçoit le
   questionnaire et les réponses par un message, et rend les
   réponses de la même façon. Même origine, vérifiée des deux côtés.
   ------------------------------------------------------------ */
function cadreFormulaireRg(titre, mode, modele, reponses, nom){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show rgFondCadre';
    const boite = document.createElement('div');
    boite.className = 'modal rgModalCadre' + (mode === 'apercu' ? ' tel' : '');
    const h = document.createElement('div');
    h.className = 'rgCadreTete';
    h.innerHTML = '<b>' + echRg(titre) + '</b>' +
      (mode === 'apercu' ? '<span>Aperçu : rien n’est envoyé.</span>' : '');
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'btn btn-secondary rgCadreX';
    x.textContent = '✕';
    h.appendChild(x);
    const f = document.createElement('iframe');
    f.className = 'rgCadre';
    f.src = 'eleve.html?formulaire=' + mode;
    f.title = titre;
    boite.append(h, f);
    fond.appendChild(boite);
    document.body.appendChild(fond);
    const fini = val => { window.removeEventListener('message', ecoute); fermerFond(fond); resolve(val); };
    x.addEventListener('click', () => fini(null));
    const ecoute = ev => {
      if(ev.source !== f.contentWindow || ev.origin !== location.origin) return;
      const m = ev.data || {};
      if(m.rgPret){
        f.contentWindow.postMessage({ rgModele: modele, rgReponses: reponses || null, rgNom: nom || '',
                                      rgMode: mode, rgClair: document.body.classList.contains('clair') }, location.origin);
      }
      if(m.rgFermer) fini(null);
      if(m.rgEnregistrer) fini(m.rgEnregistrer);
    };
    window.addEventListener('message', ecoute);
  });
}

async function remplirRenseignementsAvecLui(nom){
  await chargerRenseignements();
  const x = rgDe(nom);
  const r = await cadreFormulaireRg('📋 ' + nom, 'remplir', rgDonnees.modele, x && x.reponses, nom);
  if(!r) return;
  const d = await appelPrep({ action: 'renseignementsPoser', eleve: nom, reponses: r });
  if(d && d.status === 'error') throw new Error(d.message);
  showToast('✅ Renseignements enregistrés.');
  await chargerRenseignements(true);
  redessinerRg();
}

/* ------------------------------------------------------------
   👥 ÉLÈVES › 📋 RENSEIGNEMENTS — l'écran
   ------------------------------------------------------------ */
async function afficherRenseignements(force){
  const z = $('rgZone');
  if(!z) return;
  if(rgEdition) return dessinerGestionnaireRg();
  if(!rgDonnees) z.innerHTML = (typeof htmlAttente === 'function') ? htmlAttente('Lecture des renseignements…')
                                                                    : '<div class="empty">Lecture…</div>';
  try{ await chargerRenseignements(force !== false); }
  catch(e){ z.innerHTML = '<div class="empty">⚠️ ' + echRg(e.message || e) + '</div>'; return; }
  if(rgEdition) return;
  dessinerListeRg();
}

function dessinerListeRg(){
  const z = $('rgZone');
  if(!z || !rgDonnees) return;
  const modele = rgDonnees.modele;
  const tous = rgDonnees.eleves.filter(x => x.acces || x.reponses)
    .map(x => ({ x, etat: etatRg(x, modele) }));
  const ademander = tous.filter(o => o.etat !== 'complet');
  const complets = tous.filter(o => o.etat === 'complet');
  z.innerHTML = '';

  const intro = document.createElement('div');
  intro.className = 'rgListeIntro';
  intro.innerHTML = 'Les élèves qui ont un espace élève. Tant qu’il n’est pas rempli, le questionnaire s’ouvre ' +
    'tout seul quand l’élève entre dans son espace' + (modele.relance && modele.relance.actif
      ? ', et une relance part dans sa messagerie ' + modele.relance.apres + ' jours après sa première visite, puis tous les ' +
        modele.relance.tous + ' jours (' + modele.relance.max + ' fois au plus).'
      : '. Les relances automatiques sont arrêtées.');
  z.appendChild(intro);

  const haut = document.createElement('div');
  haut.className = 'rgListeHaut';
  const filtres = document.createElement('div');
  filtres.className = 'rrFiltres';
  [['ademander', '⚠️ À demander', ademander.length], ['complets', '✅ Complets', complets.length],
   ['tous', 'Tous', tous.length]].forEach(([k, t, n]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rrFiltre' + (rgFiltre === k ? ' on' : '');
    b.textContent = t + ' (' + n + ')';
    b.addEventListener('click', () => { rgFiltre = k; dessinerListeRg(); });
    filtres.appendChild(b);
  });
  haut.appendChild(filtres);
  if(ACCES && ACCES.role === 'admin'){
    const a = document.createElement('div');
    a.className = 'rgListeAdmin';
    const b1 = document.createElement('button');
    b1.type = 'button';
    b1.className = 'btn btn-secondary';
    b1.textContent = '✏️ Modifier le questionnaire';
    b1.addEventListener('click', () => { rgEdition = brouillonRg(modele); dessinerGestionnaireRg(); });
    const b2 = document.createElement('button');
    b2.type = 'button';
    b2.className = 'btn btn-secondary';
    b2.textContent = '📥 Reprendre le Google Form';
    b2.addEventListener('click', () => fenetreImportRg());
    a.append(b1, b2);
    haut.appendChild(a);
  }
  z.appendChild(haut);

  const vus = rgFiltre === 'complets' ? complets : (rgFiltre === 'tous' ? tous : ademander);
  const joignables = ademander.filter(o => o.x.acces && o.x.messagerie);
  if(rgFiltre === 'ademander' && joignables.length > 1 && (typeof peutModifier !== 'function' || peutModifier('eleves'))){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-secondary rgTous';
    b.textContent = '📨 Le demander aux ' + joignables.length + ' élèves joignables';
    b.addEventListener('click', async () => {
      const ok = await confirmer('Un message part dans la messagerie de ' + joignables.length +
        ' élèves, avec une notification sur leur téléphone.', '📨 Demander à tous');
      if(!ok) return;
      b.disabled = true;
      b.textContent = '📨 Envoi…';
      let n = 0;
      try{
        const d = await appelPrep({ action: 'renseignementsDemander', eleves: joignables.map(o => o.x.eleve), miseAJour: false });
        if(d && d.status === 'error') throw new Error(d.message);
        n = (d && d.demandes) || 0;
        showToast('📨 Demandé à ' + n + ' élève' + (n > 1 ? 's' : '') + '.');
      }catch(e){ showToast('Impossible : ' + (e.message || e)); }
      await chargerRenseignements(true);
      dessinerListeRg();
    });
    z.appendChild(b);
  }

  if(!vus.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.style.padding = '14px 2px';
    v.textContent = rgFiltre === 'ademander' ? '✅ Tout le monde a répondu.' : 'Personne ici.';
    z.appendChild(v);
    return;
  }
  const l = document.createElement('div');
  l.className = 'rgListe';
  vus.sort((a, b) => String(a.x.eleve).localeCompare(String(b.x.eleve), 'fr')).forEach(({ x, etat }) => {
    const ligne = document.createElement('div');
    ligne.className = 'rgListeL ' + etat;
    const rond = document.createElement('span');
    rond.className = 'rgRond';
    rond.textContent = etat === 'complet' ? '✅' : (etat === 'incomplet' ? '🆕' : '⚠️');
    const m = document.createElement('button');
    m.type = 'button';
    m.className = 'rgListeNom';
    const manque = etat === 'incomplet' ? questionsManquantes(modele, x.reponses).length : 0;
    m.innerHTML = '<b>' + echRg(x.eleve) + '</b><span>' + echRg(
      etat === 'complet' ? texteQuiQuandRg(x)
      : etat === 'incomplet' ? manque + (manque > 1 ? ' nouvelles questions' : ' nouvelle question') + ' sans réponse · ' + texteQuiQuandRg(x)
      : texteDemandeRg(x)) + '</span>';
    m.addEventListener('click', () => {
      if(typeof ouvrirPageEleve !== 'function') return;
      try{ localStorage.setItem(CLE_ONGLET_ELEVE, 'fiche'); }catch(e){}
      ouvrirPageEleve(x.eleve);
      if(typeof choisirOngletEleve === 'function') choisirOngletEleve('fiche');
    });
    ligne.append(rond, m);
    if(etat !== 'complet' && x.acces && x.messagerie && (typeof peutModifier !== 'function' || peutModifier('eleves'))){
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'btn btn-secondary rgListeBt';
      d.textContent = '📨';
      d.title = 'Le lui demander dans sa messagerie';
      d.addEventListener('click', async () => {
        d.disabled = true;
        try{ await demanderRenseignements(x.eleve); }catch(e){ showToast('Impossible : ' + (e.message || e)); }
        d.disabled = false;
      });
      ligne.appendChild(d);
    }
    l.appendChild(ligne);
  });
  z.appendChild(l);
}

/* ------------------------------------------------------------
   ✏️ LE GESTIONNAIRE DU QUESTIONNAIRE — administrateurs

   On travaille sur un BROUILLON : un questionnaire à moitié
   modifié ne doit pas apparaître chez les élèves. Rien ne part tant
   qu'on n'a pas appuyé sur ✅ Enregistrer.
   ------------------------------------------------------------ */
function brouillonRg(m){
  const b = JSON.parse(JSON.stringify(m || {}));
  b.categories = b.categories || [];
  b.relance = Object.assign({ actif: true, apres: 3, tous: 7, max: 3, texte: '' }, b.relance || {});
  b.carte = Object.assign({ titre: '', texte: '', intro: '' }, b.carte || {});
  b.__depart = JSON.stringify(m || {});
  return b;
}

function brouillonModifie(){
  if(!rgEdition) return false;
  const c = Object.assign({}, rgEdition);
  delete c.__depart;
  return JSON.stringify(c) !== rgEdition.__depart;
}

function idRg(prefixe){
  return prefixe + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function dessinerGestionnaireRg(){
  const z = $('rgZone');
  if(!z || !rgEdition) return;
  const m = rgEdition;
  z.innerHTML = '';

  const tete = document.createElement('div');
  tete.className = 'rgGTete';
  const ret = document.createElement('button');
  ret.type = 'button';
  ret.className = 'btn btn-secondary';
  ret.textContent = '← La liste des élèves';
  ret.addEventListener('click', async () => {
    if(brouillonModifie() && !await confirmer('Les changements du questionnaire ne sont pas enregistrés. Les abandonner ?',
                                              'Quitter le questionnaire', true)) return;
    rgEdition = null;
    dessinerListeRg();
  });
  tete.appendChild(ret);
  const t = document.createElement('div');
  t.className = 'rgGTitre';
  t.innerHTML = '<b>✏️ Le questionnaire de l’espace élève</b><span>Ce que les élèves voient et remplissent. ' +
    'Glisse ⠿ ou utilise ↑ ↓ pour l’ordre. Les réponses déjà données restent dans les fiches, même si une question change ou part.</span>';
  tete.appendChild(t);
  z.appendChild(tete);

  /* 1 · La carte de l'accueil */
  const carte = document.createElement('div');
  carte.className = 'rgGBloc';
  carte.innerHTML = '<div class="rgGBlocT">🏠 Sur l’accueil de l’élève</div>';
  const champ = (lib, val, long, ph, poser) => {
    const l = document.createElement('label');
    l.textContent = lib;
    const e = document.createElement(long ? 'textarea' : 'input');
    if(!long) e.type = 'text';
    else e.rows = 2;
    e.value = val || '';
    e.placeholder = ph || '';
    e.addEventListener('input', () => { poser(e.value); marquerBrouillonRg(); });
    carte.append(l, e);
    return e;
  };
  champ('Le titre de la carte', m.carte.titre, false, 'Mes renseignements et disponibilités', v => { m.carte.titre = v; });
  champ('Le texte de la carte', m.carte.texte, true, '', v => { m.carte.texte = v; });
  champ('En haut du questionnaire', m.carte.intro, true, '', v => { m.carte.intro = v; });
  z.appendChild(carte);

  /* 2 · Les catégories et leurs questions */
  const cats = document.createElement('div');
  cats.className = 'rgGCats';
  m.categories.forEach((cat, ci) => {
    const b = document.createElement('div');
    b.className = 'rgGCat';
    b.dataset.i = String(ci);
    const h = document.createElement('div');
    h.className = 'rgGCatTete';
    const p = document.createElement('span');
    p.className = 'rrPoignee';
    p.textContent = '⠿';
    p.title = 'Glisser pour changer l’ordre des catégories';
    p.addEventListener('pointerdown', ev => glisserRg(ev, b, cats, '.rgGCat', (de, vers) => {
      const [x] = m.categories.splice(de, 1);
      m.categories.splice(vers, 0, x);
      marquerBrouillonRg(); dessinerGestionnaireRg();
    }));
    h.appendChild(p);
    h.appendChild(flechesRg(ci, m.categories.length, d => {
      const [x] = m.categories.splice(ci, 1);
      m.categories.splice(ci + d, 0, x);
      marquerBrouillonRg(); dessinerGestionnaireRg();
    }));
    const nomC = document.createElement('div');
    nomC.className = 'rgGCatNom';
    nomC.innerHTML = '<b>' + echRg((cat.emoji ? cat.emoji + ' ' : '') + cat.titre) + '</b>' +
      (cat.phrase ? '<span>' + echRg(cat.phrase) + '</span>' : '') +
      '<span class="rgGNb">' + (cat.questions || []).length + ' question' + ((cat.questions || []).length > 1 ? 's' : '') + '</span>';
    h.appendChild(nomC);
    h.appendChild(petitBoutonRg('✏️', 'Modifier la catégorie', () => fenetreCategorieRg(ci)));
    b.appendChild(h);

    const qs = document.createElement('div');
    qs.className = 'rgGQs';
    (cat.questions || []).forEach((q, qi) => {
      const l = document.createElement('div');
      l.className = 'rgGQ';
      l.dataset.i = String(qi);
      const pq = document.createElement('span');
      pq.className = 'rrPoignee';
      pq.textContent = '⠿';
      pq.title = 'Glisser pour changer l’ordre';
      pq.addEventListener('pointerdown', ev => glisserRg(ev, l, qs, '.rgGQ', (de, vers) => {
        const [x] = cat.questions.splice(de, 1);
        cat.questions.splice(vers, 0, x);
        marquerBrouillonRg(); dessinerGestionnaireRg();
      }));
      l.appendChild(pq);
      l.appendChild(flechesRg(qi, cat.questions.length, d => {
        const [x] = cat.questions.splice(qi, 1);
        cat.questions.splice(qi + d, 0, x);
        marquerBrouillonRg(); dessinerGestionnaireRg();
      }));
      const mi = document.createElement('div');
      mi.className = 'rgGQMi';
      const ty = TYPES_RG[q.type] || TYPES_RG.texte;
      const marques = [];
      marques.push('<span class="rgGTag">' + ty.emoji + ' ' + ty.nom + (q.type === 'texte' && q.long ? ', plusieurs lignes' : '') +
        (q.type === 'pastilles' ? (q.plusieurs ? ', plusieurs choix' : ', un seul choix') : '') + '</span>');
      if(q.obligatoire) marques.push('<span class="rgGTag oblig">Obligatoire</span>');
      if(q.type === 'ouinon' && q.alerte) marques.push('<span class="rgGTag alerte">🔴 si ' + (q.alerte === 'oui' ? 'Oui' : 'Non') + '</span>');
      if(LIENS_RG[q.id]) marques.push('<span class="rgGTag lien">🔗 ' + (q.id === 'facebook' ? 'Messenger' : 'Poste de conduite') + '</span>');
      const choix = q.type === 'pastilles' ? (q.choix || []).concat(q.autre ? ['Autre…'] : [])
                  : q.type === 'dispo' ? (q.creneaux || []) : [];
      mi.innerHTML = '<div class="rgGQLib">' + echRg(q.libelle) + '</div>' +
        (choix.length ? '<div class="rgGQChoix">' + choix.map(x => '<span>' + echRg(x) + '</span>').join('') + '</div>' : '') +
        '<div class="rgGTags">' + marques.join('') + '</div>';
      l.appendChild(mi);
      l.appendChild(petitBoutonRg('✏️', 'Modifier la question', () => fenetreQuestionRg(ci, qi)));
      qs.appendChild(l);
    });
    b.appendChild(qs);
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'rrLien rgGPlus';
    plus.textContent = '➕ Une question dans « ' + cat.titre + ' »';
    plus.addEventListener('click', () => fenetreQuestionRg(ci, -1));
    b.appendChild(plus);
    cats.appendChild(b);
  });
  z.appendChild(cats);
  const plusC = document.createElement('button');
  plusC.type = 'button';
  plusC.className = 'btn btn-secondary rgGPlusCat';
  plusC.textContent = '➕ Une catégorie';
  plusC.addEventListener('click', () => fenetreCategorieRg(-1));
  z.appendChild(plusC);

  /* 3 · Les relances */
  const rel = document.createElement('div');
  rel.className = 'rgGBloc';
  const R = m.relance;
  rel.innerHTML = '<div class="rgGBlocT">🔔 Les relances automatiques</div>' +
    '<label class="rgGCase"><input type="checkbox" id="rgRelActif"' + (R.actif ? ' checked' : '') + '> ' +
      'Relancer dans sa messagerie ceux qui n’ont pas répondu</label>' +
    '<div class="rgGNombres">' +
      '<label>Première relance<span><input type="number" min="1" max="60" id="rgRelApres" value="' + R.apres + '"> jours après sa première visite</span></label>' +
      '<label>Puis<span>tous les <input type="number" min="1" max="60" id="rgRelTous" value="' + R.tous + '"> jours</span></label>' +
      '<label>Au plus<span><input type="number" min="1" max="10" id="rgRelMax" value="' + R.max + '"> relances</span></label>' +
    '</div>' +
    '<label>Le message de relance</label>' +
    '<textarea id="rgRelTexte" rows="3">' + echRg(R.texte) + '</textarea>' +
    '<div class="rgGAide">{prénom} devient le prénom de l’élève. Le message arrive dans sa conversation « Le bureau », ' +
      'avec une notification sur son téléphone, et un bouton qui ouvre le questionnaire.</div>';
  z.appendChild(rel);
  const lier = (id, f) => rel.querySelector('#' + id).addEventListener('input', ev => { f(ev.target); marquerBrouillonRg(); });
  lier('rgRelActif', e => { R.actif = e.checked; });
  lier('rgRelApres', e => { R.apres = Math.max(1, parseInt(e.value, 10) || 3); });
  lier('rgRelTous', e => { R.tous = Math.max(1, parseInt(e.value, 10) || 7); });
  lier('rgRelMax', e => { R.max = Math.max(1, parseInt(e.value, 10) || 3); });
  lier('rgRelTexte', e => { R.texte = e.value; });

  /* Le bas : voir, annuler, enregistrer */
  const bas = document.createElement('div');
  bas.className = 'rgGBas';
  bas.id = 'rgGBas';
  const voir = document.createElement('button');
  voir.type = 'button';
  voir.className = 'btn btn-secondary';
  voir.textContent = '👁️ Voir comme l’élève';
  voir.addEventListener('click', () => cadreFormulaireRg('👁️ Ce que voit l’élève', 'apercu', modelePropreRg(m), null, 'Camille Exemple'));
  const annuler = document.createElement('button');
  annuler.type = 'button';
  annuler.className = 'btn btn-secondary';
  annuler.textContent = '↩️ Annuler les changements';
  annuler.addEventListener('click', async () => {
    if(!await confirmer('Revenir au questionnaire enregistré ?', 'Annuler les changements', true)) return;
    rgEdition = brouillonRg(JSON.parse(rgEdition.__depart));
    dessinerGestionnaireRg();
  });
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'btn btn-primary';
  ok.id = 'rgGEnregistrer';
  ok.textContent = '✅ Enregistrer le questionnaire';
  ok.addEventListener('click', () => enregistrerQuestionnaireRg(ok));
  const etat = document.createElement('span');
  etat.className = 'rgGEtat';
  etat.id = 'rgGEtat';
  bas.append(etat, voir, annuler, ok);
  z.appendChild(bas);
  marquerBrouillonRg();
}

function marquerBrouillonRg(){
  const mod = brouillonModifie();
  const e = $('rgGEtat');
  if(e) e.textContent = mod ? '● Pas encore enregistré' : 'Tout est enregistré';
  if(e) e.classList.toggle('mod', mod);
  const ok = $('rgGEnregistrer');
  if(ok) ok.disabled = !mod;
}

function modelePropreRg(m){
  const c = JSON.parse(JSON.stringify(m));
  delete c.__depart;
  return c;
}

async function enregistrerQuestionnaireRg(bt){
  const m = modelePropreRg(rgEdition);
  const vides = m.categories.filter(c => !(c.questions || []).length);
  if(vides.length && !await confirmer('« ' + vides.map(c => c.titre).join(' », « ') + ' » n’a aucune question : ' +
    'l’élève ne la verra pas. Enregistrer quand même ?', 'Catégorie vide')) return;
  /* Une question obligatoire de plus, c'est tous les élèves complets
     qui repassent « à demander » : on le dit avant. */
  const avant = questionsRg(JSON.parse(rgEdition.__depart || '{}')).filter(q => q.obligatoire).map(q => q.id);
  const neuves = questionsRg(m).filter(q => q.obligatoire && avant.indexOf(q.id) === -1);
  if(neuves.length){
    const n = rgDonnees ? rgDonnees.eleves.filter(x => x.reponses && neuves.some(q => !reponseDonnee(q, x.reponses[q.id]))).length : 0;
    if(n && !await confirmer(neuves.length + (neuves.length > 1 ? ' nouvelles questions obligatoires' : ' nouvelle question obligatoire') +
      ' : ' + n + ' élève' + (n > 1 ? 's' : '') + ' qui avaient tout rempli la verront sur leur accueil, et repasseront dans « À demander ».',
      'Nouvelle question')) return;
  }
  bt.disabled = true;
  bt.textContent = 'Enregistrement…';
  try{
    const d = await appelPrep({ action: 'renseignementsModelePoser', modele: m });
    if(d && d.status === 'error') throw new Error(d.message);
    showToast('✅ Questionnaire enregistré : les élèves le voient dès leur prochaine visite.');
    rgEdition = null;
    await chargerRenseignements(true);
    dessinerListeRg();
  }catch(e){
    showToast('Impossible : ' + (e.message || e));
    bt.disabled = false;
    bt.textContent = '✅ Enregistrer le questionnaire';
  }
}

function petitBoutonRg(txt, titre, f){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'rgPetit';
  b.textContent = txt;
  b.title = titre;
  b.addEventListener('click', f);
  return b;
}

function flechesRg(i, n, bouger){
  const fl = document.createElement('div');
  fl.className = 'rgFleches';
  [['↑', 'Plus haut', -1, i > 0], ['↓', 'Plus bas', 1, i < n - 1]].forEach(([s, t, d, ok]) => {
    const b = petitBoutonRg(s, t, () => bouger(d));
    b.disabled = !ok;
    fl.appendChild(b);
  });
  return fl;
}

/* Le glisser-déposer, le même geste que les réponses rapides */
function glisserRg(ev, el, parent, selecteur, poser){
  ev.preventDefault();
  const freres = [...parent.querySelectorAll(':scope > ' + selecteur)];
  const depart = freres.indexOf(el);
  const y0 = ev.clientY;
  let vers = depart;
  el.classList.add('rrGlisse');
  try{ ev.target.setPointerCapture(ev.pointerId); }catch(e){}
  const bouger = e => {
    el.style.transform = 'translateY(' + (e.clientY - y0) + 'px)';
    if(e.clientY < 50) window.scrollBy(0, -14);
    else if(e.clientY > window.innerHeight - 50) window.scrollBy(0, 14);
    vers = depart;
    freres.forEach((x, k) => {
      if(x === el) return;
      const r = x.getBoundingClientRect();
      const c = r.top + r.height / 2;
      if(k < depart && e.clientY < c) vers = Math.min(vers, k);
      if(k > depart && e.clientY > c) vers = Math.max(vers, k);
    });
    freres.forEach((x, k) => x.classList.toggle('rrPlace', x !== el && k === vers));
  };
  const lacher = () => {
    document.removeEventListener('pointermove', bouger);
    document.removeEventListener('pointerup', lacher);
    el.classList.remove('rrGlisse');
    el.style.transform = '';
    freres.forEach(x => x.classList.remove('rrPlace'));
    if(vers !== depart) poser(depart, vers);
  };
  document.addEventListener('pointermove', bouger);
  document.addEventListener('pointerup', lacher);
}

/* ── La fenêtre d'une catégorie ─────────────────────────────── */
function fenetreCategorieRg(ci){
  const m = rgEdition;
  const neuve = ci < 0;
  const cat = neuve ? { id: idRg('c'), emoji: '', titre: '', phrase: '', questions: [] }
                    : JSON.parse(JSON.stringify(m.categories[ci]));
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal rgFenetre';
  boite.innerHTML = '<h3>' + (neuve ? '➕ Une catégorie' : '✏️ La catégorie') + '</h3>' +
    '<div class="rgDeux"><div style="flex:0 0 84px"><label>Emoji</label><input type="text" id="rgCEmoji" maxlength="4" value="' + echRg(cat.emoji) + '" placeholder="🚗"></div>' +
    '<div><label>Le titre</label><input type="text" id="rgCTitre" maxlength="80" value="' + echRg(cat.titre) + '" placeholder="Ex. : Mon permis actuel"></div></div>' +
    '<label>Une petite phrase sous le titre (facultatif)</label>' +
    '<input type="text" id="rgCPhrase" maxlength="200" value="' + echRg(cat.phrase) + '">' +
    '<div class="rrErreur" id="rgCErr"></div>' +
    '<div class="rgFenBas">' +
      (neuve ? '' : '<button type="button" class="btn btn-secondary rgSuppr" id="rgCSuppr">🗑️ Supprimer</button>') +
      '<button type="button" class="btn btn-secondary" id="rgCAnnuler">Annuler</button>' +
      '<button type="button" class="btn btn-primary" id="rgCOk">' + (neuve ? '➕ Ajouter' : '✓ Valider') + '</button></div>';
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => fermerFond(fond);
  boite.querySelector('#rgCAnnuler').addEventListener('click', fermer);
  boite.querySelector('#rgCOk').addEventListener('click', () => {
    cat.emoji = boite.querySelector('#rgCEmoji').value.trim();
    cat.titre = boite.querySelector('#rgCTitre').value.trim();
    cat.phrase = boite.querySelector('#rgCPhrase').value.trim();
    if(!cat.titre){ boite.querySelector('#rgCErr').textContent = 'Il lui faut un titre.'; return; }
    if(neuve) m.categories.push(cat); else m.categories[ci] = cat;
    fermer(); dessinerGestionnaireRg();
    if(neuve) fenetreQuestionRg(m.categories.length - 1, -1);
  });
  const s = boite.querySelector('#rgCSuppr');
  if(s) s.addEventListener('click', async () => {
    const n = (cat.questions || []).length;
    if(!await confirmer('Supprimer « ' + cat.titre + ' »' + (n ? ' et ses ' + n + ' question' + (n > 1 ? 's' : '') : '') + ' ?' +
      (n ? '\n\nLes réponses déjà données restent dans les fiches, sous « Anciennes questions ».' : ''), 'Supprimer la catégorie', true)) return;
    m.categories.splice(ci, 1);
    fermer(); dessinerGestionnaireRg();
  });
  setTimeout(() => boite.querySelector('#rgCTitre').focus(), 60);
}

/* ── La fenêtre d'une question ──────────────────────────────── */
function fenetreQuestionRg(ci, qi){
  const m = rgEdition;
  const neuve = qi < 0;
  const q = neuve ? { id: idRg('q'), type: 'texte', libelle: '', aide: '', court: '', obligatoire: true,
                      long: false, pret: '', alerte: '', choix: [], plusieurs: false, autre: false }
                  : JSON.parse(JSON.stringify(m.categories[ci].questions[qi]));
  let cat = ci;
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal rgFenetre';
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => fermerFond(fond);

  const dessiner = () => {
    boite.innerHTML = '<h3>' + (neuve ? '➕ Une question' : '✏️ La question') + '</h3>' +
      (LIENS_RG[q.id] ? '<div class="rrNote">' + LIENS_RG[q.id] + '</div>' : '') +
      '<label>La catégorie</label><select id="rgQCat">' + m.categories.map((c, k) =>
        '<option value="' + k + '"' + (k === cat ? ' selected' : '') + '>' + echRg((c.emoji ? c.emoji + ' ' : '') + c.titre) + '</option>').join('') + '</select>' +
      (q.type === 'dispo'
        ? '<label>Le type</label><div class="rgGTag" style="display:inline-block;margin-bottom:12px;">🗓️ Grille des disponibilités</div>'
        : '<label>Le type</label><div class="rrChoix" id="rgQTypes">' + TYPES_RG_CREABLES.map(t =>
            '<button type="button" class="rrFiltre' + (q.type === t ? ' on' : '') + '" data-t="' + t + '">' +
            TYPES_RG[t].emoji + ' ' + TYPES_RG[t].nom + '</button>').join('') + '</div>') +
      '<label>La question, telle que l’élève la lit</label><input type="text" id="rgQLib" maxlength="200" value="' + echRg(q.libelle) + '">' +
      '<label>Une petite aide sous la question (facultatif)</label><input type="text" id="rgQAide" maxlength="200" value="' + echRg(q.aide) + '">' +
      '<label>Le nom court dans la fiche (facultatif)</label><input type="text" id="rgQCourt" maxlength="60" value="' + echRg(q.court) +
        '" placeholder="' + echRg(q.libelle || 'Ex. : Lunettes ou lentilles') + '">' +
      '<label class="rgGCase"><input type="checkbox" id="rgQOblig"' + (q.obligatoire ? ' checked' : '') + '> Obligatoire</label>' +
      '<div id="rgQSpe"></div>' +
      '<div class="rgApercuQ"><div class="rrApT">Ce que voit l’élève</div><div id="rgQApercu"></div></div>' +
      '<div class="rrErreur" id="rgQErr"></div>' +
      '<div class="rgFenBas">' +
        (neuve || q.type === 'dispo' ? '' : '<button type="button" class="btn btn-secondary rgSuppr" id="rgQSuppr">🗑️ Supprimer</button>') +
        '<button type="button" class="btn btn-secondary" id="rgQAnnuler">Annuler</button>' +
        '<button type="button" class="btn btn-primary" id="rgQOk">' + (neuve ? '➕ Ajouter' : '✓ Valider') + '</button></div>';

    const spe = boite.querySelector('#rgQSpe');
    if(q.type === 'texte'){
      spe.innerHTML = '<label>La case</label><div class="rrChoix">' +
        '<button type="button" class="rrFiltre' + (!q.long ? ' on' : '') + '" data-long="0">Une ligne</button>' +
        '<button type="button" class="rrFiltre' + (q.long ? ' on' : '') + '" data-long="1">Plusieurs lignes</button></div>' +
        '<label>Une réponse toute prête, en un appui (facultatif)</label>' +
        '<input type="text" id="rgQPret" maxlength="60" value="' + echRg(q.pret) + '" placeholder="Ex. : Aucune pour l’instant">';
      spe.querySelectorAll('[data-long]').forEach(b => b.addEventListener('click', () => { q.long = b.dataset.long === '1'; lire(); dessiner(); }));
    }
    if(q.type === 'ouinon'){
      spe.innerHTML = '<label>En rouge dans la fiche quand l’élève répond</label><div class="rrChoix">' +
        [['oui', 'Oui'], ['non', 'Non'], ['', 'Jamais']].map(([v, t]) =>
          '<button type="button" class="rrFiltre' + ((q.alerte || '') === v ? ' on' : '') + '" data-al="' + v + '">' + t + '</button>').join('') + '</div>';
      spe.querySelectorAll('[data-al]').forEach(b => b.addEventListener('click', () => { lire(); q.alerte = b.dataset.al; dessiner(); }));
    }
    if(q.type === 'pastilles'){
      spe.innerHTML = '<label>Les choix</label>' + editeurChoixRg('choix', q.choix) +
        '<div class="rrChoix" style="margin-top:8px;">' +
          '<button type="button" class="rrFiltre' + (!q.plusieurs ? ' on' : '') + '" data-pl="0">Un seul choix</button>' +
          '<button type="button" class="rrFiltre' + (q.plusieurs ? ' on' : '') + '" data-pl="1">Plusieurs choix</button></div>' +
        '<label class="rgGCase"><input type="checkbox" id="rgQAutre"' + (q.autre ? ' checked' : '') + '> Ajouter « Autre », à préciser</label>';
      spe.querySelectorAll('[data-pl]').forEach(b => b.addEventListener('click', () => { lire(); q.plusieurs = b.dataset.pl === '1'; dessiner(); }));
    }
    if(q.type === 'dispo'){
      spe.innerHTML = '<label>Les jours (une ligne par jour)</label>' + editeurChoixRg('jours', q.jours) +
        '<label style="margin-top:10px;">Les créneaux</label>' + editeurChoixRg('creneaux', q.creneaux) +
        '<label style="margin-top:10px;">La pastille « pas disponible »</label>' +
        '<input type="text" id="rgQPas" maxlength="40" value="' + echRg(q.pasDispo || 'Pas dispo') + '">';
    }
    brancherChoixRg(spe, q, lire, dessiner);

    boite.querySelectorAll('#rgQTypes [data-t]').forEach(b => b.addEventListener('click', () => {
      lire(); q.type = b.dataset.t; dessiner();
    }));
    boite.querySelector('#rgQCat').addEventListener('change', e => { cat = Number(e.target.value); });
    boite.querySelectorAll('input, textarea').forEach(e => e.addEventListener('input', () => { lire(); apercu(); }));
    boite.querySelector('#rgQAnnuler').addEventListener('click', fermer);
    boite.querySelector('#rgQOk').addEventListener('click', valider);
    const s = boite.querySelector('#rgQSuppr');
    if(s) s.addEventListener('click', async () => {
      if(!await confirmer('Supprimer « ' + q.libelle + ' » ?\n\nLes réponses déjà données restent dans les fiches, ' +
        'sous « Anciennes questions ».', 'Supprimer la question', true)) return;
      m.categories[ci].questions.splice(qi, 1);
      fermer(); dessinerGestionnaireRg();
    });
    apercu();
  };

  const lire = () => {
    const v = id => { const e = boite.querySelector('#' + id); return e ? e.value : undefined; };
    if(v('rgQLib') !== undefined) q.libelle = v('rgQLib');
    if(v('rgQAide') !== undefined) q.aide = v('rgQAide');
    if(v('rgQCourt') !== undefined) q.court = v('rgQCourt');
    const ob = boite.querySelector('#rgQOblig'); if(ob) q.obligatoire = ob.checked;
    if(v('rgQPret') !== undefined) q.pret = v('rgQPret');
    const au = boite.querySelector('#rgQAutre'); if(au) q.autre = au.checked;
    if(v('rgQPas') !== undefined) q.pasDispo = v('rgQPas');
    ['choix', 'jours', 'creneaux'].forEach(k => {
      const ins = [...boite.querySelectorAll('[data-liste="' + k + '"] input')];
      if(ins.length) q[k] = ins.map(i => i.value);
    });
  };

  const apercu = () => {
    const z = boite.querySelector('#rgQApercu');
    if(z) z.innerHTML = apercuQuestionRg(q);
  };

  const valider = () => {
    lire();
    const err = boite.querySelector('#rgQErr');
    q.libelle = String(q.libelle || '').trim();
    ['choix', 'jours', 'creneaux'].forEach(k => { if(Array.isArray(q[k])) q[k] = q[k].map(x => String(x).trim()).filter(Boolean); });
    if(!q.libelle){ err.textContent = 'Écris la question.'; return; }
    if(q.type === 'pastilles' && (q.choix || []).length < 2){ err.textContent = 'Il faut au moins deux choix.'; return; }
    if(q.type === 'dispo' && (!(q.jours || []).length || !(q.creneaux || []).length)){
      err.textContent = 'Il faut au moins un jour et un créneau.'; return;
    }
    /* On ne garde que ce qui sert au type choisi */
    const propre = { id: q.id, type: q.type, libelle: q.libelle, aide: String(q.aide || '').trim(),
                     court: String(q.court || '').trim(), obligatoire: !!q.obligatoire };
    if(q.type === 'texte'){ propre.long = !!q.long; propre.pret = String(q.pret || '').trim(); }
    if(q.type === 'ouinon') propre.alerte = q.alerte || '';
    if(q.type === 'pastilles'){ propre.choix = q.choix; propre.plusieurs = !!q.plusieurs; propre.autre = !!q.autre; }
    if(q.type === 'dispo'){ propre.jours = q.jours; propre.creneaux = q.creneaux; propre.pasDispo = String(q.pasDispo || '').trim() || 'Pas dispo'; }
    if(neuve) m.categories[cat].questions.push(propre);
    else if(cat === ci) m.categories[ci].questions[qi] = propre;
    else { m.categories[ci].questions.splice(qi, 1); m.categories[cat].questions.push(propre); }
    fermer(); dessinerGestionnaireRg();
  };

  dessiner();
  setTimeout(() => { const e = boite.querySelector('#rgQLib'); if(e && !e.value) e.focus(); }, 60);
}

function editeurChoixRg(cle, liste){
  return '<div class="rgChoixEd" data-liste="' + cle + '">' + (liste || []).map((x, i) =>
    '<div class="rgChoixL"><input type="text" value="' + echRg(x) + '" maxlength="60">' +
    '<button type="button" class="rgPetit" data-moins="' + i + '" title="Retirer">🗑️</button></div>').join('') +
    '<button type="button" class="rrLien" data-plus="' + cle + '">➕ Un choix</button></div>';
}

/* « lire » garde ce qui est tapé ailleurs dans la fenêtre AVANT
   qu'on change la liste ; « redessiner » vient après. */
function brancherChoixRg(z, q, lire, redessiner){
  z.querySelectorAll('[data-liste]').forEach(ed => {
    const cle = ed.dataset.liste;
    ed.querySelectorAll('[data-moins]').forEach(b => b.addEventListener('click', () => {
      lire();
      const ins = (q[cle] || []).slice();
      ins.splice(Number(b.dataset.moins), 1);
      q[cle] = ins;
      redessiner();
    }));
    ed.querySelector('[data-plus]').addEventListener('click', () => {
      lire();
      q[cle] = (q[cle] || []).concat(['']);
      redessiner();
      const der = z.querySelectorAll('[data-liste="' + cle + '"] input');
      if(der.length) der[der.length - 1].focus();
    });
  });
}

/* Un aperçu rapide, dans la fenêtre. Le vrai, en entier, c'est
   « 👁️ Voir comme l'élève ». */
function apercuQuestionRg(q){
  const et = q.obligatoire ? '<span class="rgpEt">*</span>' : '';
  const lib = '<div class="rgpQ">' + echRg(q.libelle || 'La question') + et + '</div>' +
    (q.aide ? '<div class="rgpAide">' + echRg(q.aide) + '</div>' : '');
  const puce = (t, on) => '<span class="rgpPuce' + (on ? ' on' : '') + '">' + echRg(t) + '</span>';
  if(q.type === 'ouinon') return '<div class="rgpLigne">' + lib.replace('rgpQ', 'rgpQ rgpQf') + '<div>' + puce('Oui') + puce('Non') + '</div></div>';
  if(q.type === 'pastilles') return lib + '<div class="rgpPuces">' + (q.choix || []).filter(x => String(x).trim()).map(x => puce(x)).join('') +
    (q.autre ? puce('Autre') : '') + '</div>' + (q.plusieurs ? '<div class="rgpAide">Plusieurs choix possibles.</div>' : '');
  if(q.type === 'dispo') return lib + (q.jours || []).slice(0, 2).map(j => '<div class="rgpJour"><b>' + echRg(j) + '</b><div class="rgpPuces">' +
    (q.creneaux || []).map(x => puce(x)).join('') + puce(q.pasDispo || 'Pas dispo') + '</div></div>').join('') +
    ((q.jours || []).length > 2 ? '<div class="rgpAide">… et ' + ((q.jours || []).length - 2) + ' autres jours</div>' : '');
  const ph = { tel: '06 12 34 56 78', mail: 'prenom.nom@exemple.fr', date: 'jj/mm/aaaa' }[q.type] || '';
  return lib + '<div class="rgpChamp' + (q.type === 'texte' && q.long ? ' long' : '') + '">' + echRg(ph) + '</div>' +
    (q.type === 'texte' && q.pret ? '<div class="rgpPuces">' + puce(q.pret) + '</div>' : '');
}

/* ------------------------------------------------------------
   📥 REPRENDRE LES RÉPONSES DU GOOGLE FORM

   David choisit « les reprendre ». ⚠️ LES RÉPONSES NE PASSENT PAS
   PAR CLAUDE : le fichier se lit ici, dans le navigateur du
   bureau (export CSV de la feuille des réponses, ou un copier-
   coller de la feuille entière), et seules les lignes reconnues
   partent au serveur. Une fiche déjà remplie dans l'application
   n'est jamais remplacée.
   ------------------------------------------------------------ */
const COLONNES_FORM_RG = [
  [/^horodat|^timestamp/i, '__quand'],
  [/^nom$/i, '__nom'],
  [/^pr[ée]nom$/i, '__prenom'],
  [/facebook/i, 'facebook'],
  [/urgence/i, '__urgence'],
  [/qui finance/i, 'financeur'],
  [/financeur est diff/i, 'financeurCoord'],
  [/tutelle|curatelle/i, 'tutelle'],
  [/comprends et lis/i, 'francais'],
  [/am[ée]nag/i, 'amenage'],
  [/lunettes|lentilles/i, 'lunettes'],
  [/affection|handicap/i, 'handicap'],
  [/invalidit/i, 'invalidite'],
  [/dates o[uù] vous n|pas disponible$/i, 'absences']
];

function lireTableauRg(texte){
  const t = String(texte || '').replace(/^﻿/, '');
  const sep = (t.split('\n')[0].split('\t').length > 2) ? '\t' : (t.split('\n')[0].split(';').length > t.split('\n')[0].split(',').length ? ';' : ',');
  const lignes = [];
  let l = [], c = '', dans = false;
  for(let i = 0; i < t.length; i++){
    const ch = t[i];
    if(dans){
      if(ch === '"' && t[i + 1] === '"'){ c += '"'; i++; }
      else if(ch === '"') dans = false;
      else c += ch;
    }else if(ch === '"' && c === '') dans = true;
    else if(ch === sep){ l.push(c); c = ''; }
    else if(ch === '\n' || ch === '\r'){
      if(ch === '\r' && t[i + 1] === '\n') i++;
      l.push(c); c = '';
      if(l.some(x => x.trim())) lignes.push(l);
      l = [];
    }else c += ch;
  }
  l.push(c);
  if(l.some(x => x.trim())) lignes.push(l);
  return lignes;
}

function urgenceDuFormRg(t){
  const s = String(t || '');
  const tel = (s.match(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/) || [''])[0];
  const mail = (s.match(/[^\s,;:<>()]+@[^\s,;:<>()]+\.[a-z]{2,}/i) || [''])[0];
  const reste = s.replace(tel, ' ').replace(mail, ' ').replace(/\s*[-–,;\/]\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const mots = reste.split(' ').filter(Boolean);
  return { urgNom: mots[0] || '', urgPrenom: mots.slice(1).join(' '), urgTel: tel.trim(), urgMail: mail.trim() };
}

function lignesDuFormRg(tableau, modele){
  if(tableau.length < 2) return { lignes: [], colonnes: [] };
  const tete = tableau[0];
  const map = tete.map(h => {
    const x = COLONNES_FORM_RG.find(([re]) => re.test(String(h).trim()));
    if(x) return x[1];
    const j = String(h).match(/\[(\w+)\]\s*$/);
    return j ? '__jour:' + j[1] : '';
  });
  const qDispo = questionsRg(modele).find(q => q.type === 'dispo');
  const qFin = questionsRg(modele).find(q => q.id === 'financeur');
  const out = [];
  tableau.slice(1).forEach(l => {
    const r = {};
    let nom = '', prenom = '', quand = '';
    l.forEach((v, i) => {
      const k = map[i];
      const val = String(v || '').trim();
      if(!k || !val) return;
      if(k === '__nom') nom = val;
      else if(k === '__prenom') prenom = val;
      else if(k === '__quand') quand = val;
      else if(k === '__urgence') Object.assign(r, urgenceDuFormRg(val));
      else if(k.indexOf('__jour:') === 0 && qDispo){
        const jour = (qDispo.jours || []).find(j => normaliserMot(j) === normaliserMot(k.slice(7)));
        if(!jour) return;
        r.dispo = r.dispo || {};
        r.dispo[jour] = /pas disponible/i.test(val) ? ['pas']
          : (qDispo.creneaux || []).filter(c => normaliserMot(val.replace(/\s/g, '')).indexOf(normaliserMot(c.replace(/\s/g, ''))) !== -1);
      }
      else if(['tutelle', 'francais', 'amenage', 'lunettes', 'handicap', 'invalidite'].indexOf(k) !== -1){
        if(/^oui/i.test(val)) r[k] = true; else if(/^non/i.test(val)) r[k] = false;
      }
      else if(k === 'financeur'){
        const c = qFin && (qFin.choix || []).find(x => normaliserMot(x) === normaliserMot(val));
        r.financeur = c ? [c] : ['Autre : ' + val];
      }
      else r[k] = val;
    });
    if(!nom && !prenom) return;
    const f = (typeof fichesEleves !== 'undefined' ? fichesEleves : []);
    const fiche = trouverParNom(f, prenom + ' ' + nom) || trouverParNom(f, nom + ' ' + prenom);
    out.push({ tape: (prenom + ' ' + nom).trim(), eleve: fiche ? fiche.eleve : '', quand, reponses: r });
  });
  return { lignes: out, colonnes: map.filter(Boolean) };
}

function fenetreImportRg(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal rgFenetre large';
  boite.innerHTML = '<h3>📥 Reprendre les réponses du Google Form</h3>' +
    '<div class="rrNote">Dans la feuille des réponses du Google Form : <b>Fichier › Télécharger › CSV</b>, puis choisis le fichier ' +
      'ci-dessous. Ou sélectionne toute la feuille (Ctrl+A), copie, et colle-la dans la case. Le fichier est lu ici, sur cet ' +
      'ordinateur : seules les lignes reconnues partent. <b>Une fiche déjà remplie dans l’application n’est jamais remplacée.</b></div>' +
    '<input type="file" id="rgImpFichier" accept=".csv,.tsv,.txt,text/csv">' +
    '<textarea id="rgImpTexte" rows="4" placeholder="… ou colle la feuille ici"></textarea>' +
    '<div id="rgImpApercu"></div>' +
    '<div class="rgFenBas"><button type="button" class="btn btn-secondary" id="rgImpAnnuler">Fermer</button>' +
    '<button type="button" class="btn btn-primary" id="rgImpOk" disabled>📥 Reprendre</button></div>';
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => fermerFond(fond);
  boite.querySelector('#rgImpAnnuler').addEventListener('click', fermer);
  let lu = { lignes: [] };
  const analyser = async texte => {
    if(typeof chargerFiches === 'function' && !(fichesEleves || []).length) await chargerFiches();
    await chargerRenseignements();
    lu = lignesDuFormRg(lireTableauRg(texte), rgDonnees.modele);
    const reconnus = lu.lignes.filter(x => x.eleve);
    const deja = reconnus.filter(x => { const y = rgDe(x.eleve); return y && y.reponses; });
    const neufs = reconnus.filter(x => deja.indexOf(x) === -1);
    const inconnus = lu.lignes.filter(x => !x.eleve);
    const ap = boite.querySelector('#rgImpApercu');
    if(!lu.lignes.length){
      ap.innerHTML = '<div class="rrErreur">Aucune réponse trouvée : la première ligne doit être celle des questions.</div>';
      boite.querySelector('#rgImpOk').disabled = true;
      return;
    }
    const liste = (t, xs, cls) => xs.length ? '<div class="rgImpG ' + cls + '"><b>' + t + ' (' + xs.length + ')</b><div>' +
      xs.map(x => echRg(x.eleve || x.tape) + (x.quand ? ' <span>· ' + echRg(String(x.quand).slice(0, 10)) + '</span>' : '')).join('<br>') + '</div></div>' : '';
    ap.innerHTML = '<div class="rgImpRes">' +
      liste('✅ Seront repris', neufs, 'ok') +
      liste('⏭️ Déjà remplis dans l’application : gardés tels quels', deja, '') +
      liste('❓ Pas trouvés dans le répertoire : laissés de côté', inconnus, 'non') + '</div>';
    const ok = boite.querySelector('#rgImpOk');
    ok.disabled = !neufs.length;
    ok.textContent = '📥 Reprendre ' + neufs.length + ' élève' + (neufs.length > 1 ? 's' : '');
    lu.aEnvoyer = neufs;
  };
  boite.querySelector('#rgImpFichier').addEventListener('change', ev => {
    const f = ev.target.files && ev.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = () => analyser(String(r.result || ''));
    r.readAsText(f, 'utf-8');
  });
  boite.querySelector('#rgImpTexte').addEventListener('input', ev => analyser(ev.target.value));
  boite.querySelector('#rgImpOk').addEventListener('click', async ev => {
    const b = ev.target;
    b.disabled = true;
    b.textContent = 'Reprise…';
    try{
      const d = await appelPrep({ action: 'renseignementsImporter',
        lignes: (lu.aEnvoyer || []).map(x => ({ eleve: x.eleve, quand: x.quand, reponses: x.reponses })) });
      if(d && d.status === 'error') throw new Error(d.message);
      showToast('📥 ' + (d.repris || 0) + ' élève' + ((d.repris || 0) > 1 ? 's' : '') + ' repris du Google Form.');
      fermer();
      await chargerRenseignements(true);
      redessinerRg();
    }catch(e){
      showToast('Impossible : ' + (e.message || e));
      b.disabled = false;
      b.textContent = '📥 Reprendre';
    }
  });
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-renseignements.js'] = true;
