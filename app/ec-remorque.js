/* Déployé le 05/09/2026 à 10:30 — v883 */
/* ============================================================
   ec-remorque.js
   Le parcours du permis remorque (BE).

   Il diffère de la moto sur deux points : le code peut être
   dispensé quand celui de la voiture a moins de cinq ans, et
   l'examen se joue en deux épreuves le même jour — plateau
   puis circulation.

   Un élève peut donc réussir son plateau et être ajourné à la
   circulation : il ne repasse alors que celle-ci.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const FORMATION_BE = 'Permis BE';

/* Ce qu'il reste à passer, quand il a échoué */
const BE_A_PASSER = {
  'complet':     'Examen complet',
  'circulation': '🔁 Circulation seule'
};


function etapeRemorque(s){
  if(String(s.beDate || '').trim()) return 'prevus';
  if(String(s.beAPasser || '').trim()) return 'repasser';
  if(s.beAPrevoir === 'oui') return 'aplacer';
  return 'preparation';
}


function elevesRemorque(){
  if(typeof etatBureau === 'undefined') return [];

  const CHAMPS = ['beAnts', 'beAntsValide', 'beCode', 'beCours1', 'beCours2',
                  'beCours3', 'beAPrevoir', 'beMois', 'beDate', 'beAPasser'];

  const dedans = s => {
    const f = String((s && s.formation) || '').trim();
    if(normaliserMot(f) === normaliserMot(FORMATION_BE)) return true;
    return CHAMPS.some(k => String((s && s[k]) || '').trim());
  };

  const vus = [];
  const out = [];

  const ajouter = (nom, source) => {
    const k = normaliserMot(nom || '');
    if(!k || vus.indexOf(k) !== -1) return;
    vus.push(k);
    out.push(Object.assign({ eleve: nom }, source || {}));
  };

  /* Les fiches du répertoire : c'est là qu'un élève tout neuf
     existe, avant tout bilan et toute consigne. */
  (typeof fichesConnues !== 'undefined' ? (fichesConnues || []) : [])
    .forEach(f => {
      if(dedans({ formation: f.formation })) ajouter(f.eleve, f);
    });

  (etatBureau.suivi || []).forEach(s => {
    const f = (typeof formationDe === 'function') ? formationDe(s.eleve) : '';
    if(dedans(Object.assign({}, s, { formation: f }))){
      ajouter(s.eleve, { formation: f });
    }
  });

  (etatBureau.eleves || []).forEach(e => {
    const f = (typeof formationDe === 'function') ? formationDe(e.eleve) : '';
    const s = Object.assign({}, suiviDe(e.eleve) || {}, { formation: f });
    if(dedans(s)) ajouter(e.eleve, e);
  });

  return out;
}


/* ============================================================
   L'AFFICHAGE
   ============================================================ */

async function afficherRemorque(){
  const zone = $('remorqueZone');
  if(!zone) return;

  /* Le bureau ne se charge qu'une fois : ensuite la mémoire est
     déjà à jour après chaque saisie. */
  if(typeof etatBureau === 'undefined' || !etatBureau.suivi ||
     (!etatBureau.suivi.length && !(etatBureau.eleves || []).length)){
    if(typeof afficherBureau === 'function'){
      try{ await afficherBureau(); }catch(e){}
    }
  }

  if(typeof chargerFichesMoto === 'function') await chargerFichesMoto();
  const tous = elevesRemorque();
  zone.innerHTML = '';
  zone.appendChild(boutonAjouterRemorque());

  const cadres = [
    ['preparation', '📋 Préparation',
     'Dossier ANTS, code et les trois cours. Quand il est prêt, ' +
     "indique le mois où le faire passer."],
    ['aplacer',     '📅 À placer',
     'Ils attendent une date, groupés par mois.'],
    ['prevus',      '🚚 Examens prévus',
     "Le jour venu, saisis les deux résultats : plateau puis " +
     'circulation.'],
    ['repasser',    '🔁 À repasser',
     'Ce qui reste à passer et le nombre de tentatives.']
  ];

  cadres.forEach(([cle, titre, aide]) => {
    const liste = tous.filter(e => etapeRemorque(suiviDe(e.eleve) || {}) === cle);
    zone.appendChild(cadreRemorque(cle, titre, aide, liste));
  });

  if(typeof blocStats2R === 'function'){
    zone.appendChild(blocStats2R('remorque', '📊 Statistiques remorque'));
  }
}


function cadreRemorque(cle, titre, aide, liste){
  const d = document.createElement('details');
  d.className = 'volet-liste';
  d.open = (liste.length > 0);

  const s = document.createElement('summary');
  s.innerHTML = titre.replace(/</g, '&lt;') +
    ' <span class="compteur">' + liste.length + '</span>';
  d.appendChild(s);

  const a = document.createElement('div');
  a.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px;' +
    'line-height:1.4;';
  a.textContent = aide;
  d.appendChild(a);

  if(!liste.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Personne pour le moment.';
    d.appendChild(v);
    return d;
  }

  /* Ceux qui attendent une date sont groupés par mois : c'est
     ainsi que le bureau demande ses places. */
  if(cle === 'aplacer'){
    const par = {};
    liste.forEach(e => {
      const m = String((suiviDe(e.eleve) || {}).beMois || '').trim() ||
                'Mois non précisé';
      (par[m] = par[m] || []).push(e);
    });

    Object.keys(par).forEach(m => {
      const t = document.createElement('div');
      t.style.cssText = 'font-size:12px;font-weight:700;' +
        'color:var(--accent-text);margin:10px 0 6px;';
      t.textContent = '📅 ' + m + ' — ' + par[m].length + ' élève(s)';
      d.appendChild(t);
      par[m].forEach(e => d.appendChild(ligneRemorque(e, cle)));
    });
    return d;
  }

  liste.forEach(e => d.appendChild(ligneRemorque(e, cle)));
  return d;
}


function ligneRemorque(e, etape){
  const s = suiviDe(e.eleve) || {};

  const l = document.createElement('div');
  l.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
    'padding:11px 12px;margin-bottom:9px;';

  const n = document.createElement('div');
  n.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:6px;';
  n.textContent = e.eleve;

  /* Celui qui ne repasse que la circulation doit se repérer d'un
     coup d'œil : il ne fait qu'une épreuve ce jour-là. */
  if(s.beAPasser === 'circulation'){
    const b = document.createElement('span');
    b.style.cssText = 'font-size:11px;font-weight:700;margin-left:8px;' +
      'color:var(--accent-text);border:1px solid var(--accent-text);' +
      'border-radius:8px;padding:2px 7px;';
    b.textContent = 'Circulation seule';
    n.appendChild(b);
  }
  l.appendChild(n);

  const info = document.createElement('div');
  info.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.6;' +
    'margin-bottom:9px;';
  info.textContent = resumeRemorque(s, etape);
  l.appendChild(info);

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:7px;flex-wrap:wrap;';
  actionsRemorque(e.eleve, s, etape).forEach(b => r.appendChild(b));
  l.appendChild(r);

  return l;
}


function resumeRemorque(s, etape){
  const bouts = [];

  if(etape === 'preparation' || etape === 'aplacer'){
    const ants = s.beAnts === 'fait' ? '✅ ANTS fait' : '⬜ ANTS';
    const qui = s.beAntsQui === 'nous' ? ' (nous)'
              : s.beAntsQui === 'eleve' ? ' (élève)' : '';
    bouts.push(ants + qui + (s.beAntsValide === 'oui' ? ' · validé ✅' : ''));

    const codes = {
      'pasbesoin': '✅ Pas besoin de code',
      'aveclui':   '⏳ Code avec nous',
      'soncote':   '⏳ Code de son côté',
      'obtenu':    '✅ Code obtenu'
    };
    bouts.push(codes[s.beCode] || '⬜ Code');

    const cours = [1, 2, 3].filter(i => s['beCours' + i] === 'oui');
    bouts.push(cours.length ? '📚 Cours ' + cours.join(', ')
                            : '⬜ Aucun cours');

    if(etape === 'aplacer' && String(s.beMois || '').trim()){
      bouts.push('📅 à placer en ' + s.beMois);
    }
  }

  else if(etape === 'prevus'){
    bouts.push('📅 Examen le ' + (s.beDate || '?'));
    if(s.beAPasser === 'circulation') bouts.push('circulation seule');
    else bouts.push('plateau + circulation');
    if(Number(s.bePassages) > 1) bouts.push(s.bePassages + 'e passage');
  }

  else{
    bouts.push('❌ ' + (BE_A_PASSER[s.beAPasser] || 'À repasser'));
    bouts.push((Number(s.bePassages) || 1) + ' passage(s)');
    bouts.push(String(s.beMois || '').trim()
      ? '📅 à replacer en ' + s.beMois : '📅 date à prévoir');
  }

  return bouts.join(' · ');
}


/* ============================================================
   LES GESTES
   ============================================================ */

function actionsRemorque(nom, s, etape){
  const out = [];

  const bouton = (libelle, action, couleur) => {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;padding:9px 12px;font-size:12px;margin:0;' +
      (couleur ? 'color:' + couleur + ';border-color:' + couleur + ';' : '');
    b.textContent = libelle;
    b.addEventListener('click', action);
    out.push(b);
  };

  if(etape === 'preparation'){
    bouton('📄 Dossier ANTS', () => saisirAntsBE(nom));
    bouton('🎓 Code', () => saisirCodeBE(nom));
    bouton('📚 Les cours', () => saisirCoursBE(nom));
    bouton('📅 À prévoir', () => saisirMoisBE(nom), 'var(--accent-text)');
  }

  else if(etape === 'aplacer'){
    /* Les cours se terminent parfois après que le mois est
       choisi : le bouton doit rester ici. */
    bouton('📚 Les cours', () => saisirCoursBE(nom));
    bouton('📅 Changer le mois', () => saisirMoisBE(nom));
    bouton("📆 Poser la date", () => saisirDateBE(nom), 'var(--accent-text)');
    bouton('↩️ Retour préparation',
           () => majRemorque(nom, { beAPrevoir: '', beMois: '' }));
  }

  else if(etape === 'prevus'){
    bouton('📆 Changer la date', () => saisirDateBE(nom));
    bouton('🏁 Saisir le résultat', () => resultatBE(nom),
           'var(--accent-text)');
  }

  else{
    bouton('📅 Mois de repassage', () => saisirMoisBE(nom));
    bouton('📆 Poser la date', () => saisirDateBE(nom), 'var(--accent-text)');
  }

  return out;
}


async function majRemorque(nom, champs){
  try{
    await majSuivi(nom, champs);
    afficherRemorque();
  }catch(e){ showToast('Impossible : ' + e.message); }
}


async function saisirAntsBE(nom){
  const fait = await fenetre('Le dossier ANTS est-il fait ?',
    [{ nom:'Annuler', valeur:'' },
     { nom:'⬜ Pas encore', valeur:'non' },
     { nom:'✅ Fait', valeur:'fait', principal:true }], nom);

  if(!fait) return;

  if(fait === 'non'){
    await majRemorque(nom, { beAnts: '', beAntsQui: '', beAntsValide: '' });
    return;
  }

  const qui = await fenetre('Qui a fait ce dossier ?',
    [{ nom:'Ne pas préciser', valeur:'x' },
     { nom:"👤 L'élève", valeur:'eleve' },
     { nom:'🏫 Nous', valeur:'nous', principal:true }], nom);

  /* La validation par l'ANTS est distincte du dépôt : un dossier
     déposé peut rester des semaines sans réponse. */
  const valide = await fenetre('Le dossier est-il validé par l\'ANTS ?',
    [{ nom:'⏳ Pas encore', valeur:'non' },
     { nom:'✅ Validé', valeur:'oui', principal:true }], nom);

  await majRemorque(nom, {
    beAnts: 'fait',
    beAntsQui: (qui === 'x') ? '' : (qui || ''),
    beAntsValide: (valide === 'oui') ? 'oui' : ''
  });
}


async function saisirCodeBE(nom){
  const quoi = await fenetre('Où en est son code ?',
    [{ nom:'Annuler', valeur:'' },
     { nom:'✅ Pas besoin (moins de 5 ans)', valeur:'pasbesoin' },
     { nom:'⏳ Le passe avec nous', valeur:'aveclui' },
     { nom:'⏳ Le passe de son côté', valeur:'soncote' },
     { nom:'✅ Obtenu', valeur:'obtenu', principal:true }], nom);

  if(!quoi) return;
  await majRemorque(nom, { beCode: quoi });
}


async function saisirCoursBE(nom){
  const s = suiviDe(nom) || {};

  /* Combien de cours il a faits : trois cases plutôt qu'un choix
     un par un, c'est le geste le plus fréquent. */
  const combien = [1, 2, 3].filter(i => s['beCours' + i] === 'oui').length;

  const choix = await choisirDansListe2R(
    'Où en sont ses cours ?',
    'Les trois cours se font dans l\'ordre.',
    [{ nom:'Aucun cours fait',   valeur:'0' },
     { nom:'Cours 1 fait',       valeur:'1' },
     { nom:'Cours 1 et 2 faits', valeur:'2' },
     { nom:'Les trois faits',    valeur:'3' }],
    String(combien));

  if(choix === null) return;

  const n = Number(choix) || 0;

  await majRemorque(nom, {
    beCours1: (n >= 1) ? 'oui' : '',
    beCours2: (n >= 2) ? 'oui' : '',
    beCours3: (n >= 3) ? 'oui' : ''
  });
}


/* Les douze mois à venir, à partir de celui-ci.

   Les taper à la main invitait aux fautes de frappe, et deux
   orthographes du même mois faisaient deux groupes. */
function moisAVenir(){
  const noms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                'juillet', 'août', 'septembre', 'octobre', 'novembre',
                'décembre'];

  const out = [];
  const d = new Date();

  for(let i = 0; i < 12; i++){
    out.push(noms[d.getMonth()] + ' ' + d.getFullYear());
    d.setMonth(d.getMonth() + 1);
  }

  return out;
}


/* Une vraie liste déroulante : douze boutons empilés tenaient
   mal sur un téléphone.

   Nommée à part : ec-vocal.js a une fonction du même nom, avec
   d'autres arguments. */
function choisirDansListe2R(titre, aide, options, valeurActuelle){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';

    const boite = document.createElement('div');
    boite.className = 'modal';

    boite.innerHTML = '<h3>' + String(titre).replace(/</g, '&lt;') + '</h3>' +
      (aide ? '<div style="font-size:12px;color:var(--muted);' +
              'margin-bottom:12px;line-height:1.5;">' +
              String(aide).replace(/</g, '&lt;') + '</div>' : '');

    const sel = document.createElement('select');
    options.forEach(o => {
      const x = document.createElement('option');
      x.value = o.valeur;
      x.textContent = o.nom;
      if(o.valeur === valeurActuelle) x.selected = true;
      sel.appendChild(x);
    });
    boite.appendChild(sel);

    const r = document.createElement('div');
    r.className = 'duo';
    r.style.marginTop = '14px';

    const bA = document.createElement('button');
    bA.className = 'btn btn-secondary';
    bA.textContent = 'Annuler';
    bA.addEventListener('click', () => {
      fermerFond(fond);
      resolve(null);
    });

    const bOk = document.createElement('button');
    bOk.className = 'btn btn-primary';
    bOk.textContent = 'Valider';
    bOk.addEventListener('click', () => {
      const v = sel.value;
      fermerFond(fond);
      resolve(v);
    });

    r.appendChild(bA);
    r.appendChild(bOk);
    boite.appendChild(r);

    fond.appendChild(boite);
    document.body.appendChild(fond);
    sel.focus();
  });
}


async function saisirMoisBE(nom){
  const s = suiviDe(nom) || {};
  const liste = moisAVenir();

  /* Le mois déjà choisi reste proposé, même s'il est passé */
  const dejaChoisi = String(s.beMois || '').trim();
  if(dejaChoisi && liste.indexOf(dejaChoisi) === -1) liste.unshift(dejaChoisi);

  const options = [{ nom: '— aucun mois —', valeur: '' }]
    .concat(liste.map(m => ({ nom: m, valeur: m })));

  const choix = await choisirDansListe2R(
    'Sur quel mois le faire passer ?',
    'Il rejoindra le groupe de ce mois dans « à placer ».',
    options, dejaChoisi);

  if(choix === null) return;

  const propre = String(choix).trim();

  await majRemorque(nom, {
    beMois: propre,
    beAPrevoir: propre ? 'oui' : ''
  });
}


async function saisirDateBE(nom){
  const iso = await choisirDate("Date de l'examen remorque — " + nom);
  if(!iso) return;
  await majRemorque(nom, { beDate: dateEnToutesLettres(iso),
                           beAPrevoir: '' });
}


/* ============================================================
   LE RÉSULTAT, EN DEUX ÉPREUVES

   Le plateau d'abord : sans lui, l'élève ne part pas en
   circulation, et son examen est à refaire en entier.
   ============================================================ */

async function resultatBE(nom){
  const s = suiviDe(nom) || {};
  const seuleCircu = (s.beAPasser === 'circulation');

  /* Le plateau, sauf pour celui qui l'a déjà */
  let plateau = 'reussi';

  if(!seuleCircu){
    plateau = await fenetre('Le plateau de ' + nom + ' ?',
      [{ nom:'Annuler', valeur:'' },
       { nom:'❌ Échoué', valeur:'echoue' },
       { nom:'✅ Réussi', valeur:'reussi', principal:true }],
      'Épreuve 1 — plateau');

    if(!plateau) return;
  }

  const n = (Number(s.bePassages) || 0) + 1;

  /* Plateau raté : il ne part pas en circulation, tout est à
     refaire. */
  if(plateau === 'echoue'){
    if(!await confirmer(nom + ' a échoué son plateau.\n\n' +
        "Il ne passe pas la circulation : l'examen sera à refaire " +
        'en entier.', 'Plateau échoué')) return;

    await noterResultat2R('remorque', nom, 'Plateau', 'echoue', n, s.beDate);
    await majRemorque(nom, { beDate: '', beAPasser: 'complet',
                             bePassages: String(n), beMois: '' });
    showToast(nom + ' — examen complet à replacer');
    return;
  }

  const circu = await fenetre('La circulation de ' + nom + ' ?',
    [{ nom:'Annuler', valeur:'' },
     { nom:'❌ Ajourné', valeur:'echoue' },
     { nom:'✅ Réussie', valeur:'reussi', principal:true }],
    'Épreuve 2 — circulation');

  if(!circu) return;

  /* Plateau réussi, circulation ajournée : il ne repasse que la
     circulation. */
  if(circu === 'echoue'){
    if(!await confirmer(nom + ' a son plateau, mais est ajourné à la ' +
        'circulation.\n\nIl ne repassera que la circulation.',
        'Circulation ajournée')) return;

    if(!seuleCircu) await noterResultat2R('remorque', nom, 'Plateau',
                                          'obtenu', n, s.beDate);
    await noterResultat2R('remorque', nom, 'Circulation', 'echoue', n,
                          s.beDate);
    await majRemorque(nom, { beDate: '', beAPasser: 'circulation',
                             bePassages: String(n), beMois: '' });
    showToast(nom + ' — circulation seule à replacer');
    return;
  }

  /* Les deux épreuves : son permis est obtenu */
  if(!await confirmer(nom + ' a obtenu son permis remorque ?\n\n' +
      'Tout son suivi remorque sera effacé. Ses bilans restent.',
      'Permis BE obtenu')) return;

  /* Les traces partent avant l'effacement */
  if(!seuleCircu) await noterResultat2R('remorque', nom, 'Plateau',
                                        'obtenu', n, s.beDate);
  await noterResultat2R('remorque', nom, 'Circulation', 'obtenu', n, s.beDate);

  await majRemorque(nom, {
    beAnts: '', beAntsQui: '', beAntsValide: '', beCode: '',
    beCours1: '', beCours2: '', beCours3: '', beAPrevoir: '',
    beMois: '', beDate: '', beAPasser: '', bePassages: ''
  });

  showToast('🎓 Bravo à ' + nom + ' !');
}


/* ============================================================
   AJOUTER UN ÉLÈVE
   ============================================================ */

function boutonAjouterRemorque(){
  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'padding:11px;font-size:13px;margin-bottom:12px;';
  b.textContent = '➕ Ajouter un élève remorque';
  b.addEventListener('click', ajouterEleveRemorque);
  return b;
}


async function ajouterEleveRemorque(){
  const nom = await demander(
    "Nom de l'élève\n" +
    "Sa fiche sera créée dans le répertoire si elle n'existe pas.",
    '', 'Nouvel élève remorque');

  if(!nom || !String(nom).trim()) return;
  const propre = String(nom).trim();

  try{
    await appelPrep({ action: 'ficheSet', eleve: propre,
                      formation: FORMATION_BE, par: ACCES.moniteur || '' });

    await majSuivi(propre, { beAnts: '' });

    showToast(propre + ' ajouté ✅');
    if(typeof chargerFichesMoto === 'function') await chargerFichesMoto(true);
    afficherRemorque();
  }catch(e){ showToast('Impossible : ' + e.message); }
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-remorque.js'] = true;
