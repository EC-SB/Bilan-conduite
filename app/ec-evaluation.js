/* Déployé le 30/08/2026 à 06:20 — v723 */
/* ============================================================
   ec-evaluation.js
   Le calculateur d'évaluation de départ.

   Le bureau saisit le nombre d'heures rendu par le simulateur,
   en boîte manuelle. Tout en découle : la conversion en
   automatique, la répartition des séances, les deux devis, et
   les messages à coller dans Driv'up.

   Deux versions du message : une pour Messenger, avec ses
   caractères stylisés, une pour le mail — Driv'up remplace les
   émojis par des points d'interrogation.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* La conversion manuelle → automatique : 13 heures pour 20,
   puis quatre heures ajoutées. */
const CONV_BV = 20;
const CONV_BEA = 13;
const AJOUT_BEA = 4;

/* Les heures de voiture obligatoires, quelle que soit la boîte */
const HEURES_OBLIGATOIRES = 11;

/* Le devis, ligne à ligne. « simu » et « conduite2h » prennent
   la valeur calculée ; les autres sont fixes. */
const LIGNES_DEVIS = [
  { nom:'Cours théorie de la conduite 1h',            q:3,      pu:37 },
  { nom:'Simulateur avec moniteur 1h',                q:'simu', pu:45 },
  { nom:'Conduite 2h',                                q:'c2h',  pu:118 },
  { nom:'Conduite 1h',                                q:1,      pu:59 },
  { nom:'Simulateur prévention des risques 1h',       q:1,      pu:45 },
  { nom:'Simulateur conduite de nuit 1h',             q:1,      pu:45 },
  { nom:'Vérifications',                              q:1,      pu:24 },
  { nom:'Examen blanc pratique 1h30',                 q:1,      pu:88.5 },
  { nom:'Écoute pédagogique 2h',                      q:150,    pu:0.2 },
  { nom:'Écoute pédagogique 1h30 examen blanc',       q:20,     pu:0 },
  { nom:'Formation constat amiable',                  q:1,      pu:0 },
  { nom:'Formation entretien véhicule',               q:1,      pu:0 },
  { nom:'Accompagnement examen',                      q:1,      pu:59 },
  { nom:'Disque A',                                   q:1,      pu:5 },
  { nom:'Abonnement 1 an mail post permis',           q:1,      pu:5 },
  { nom:"Livret d'apprentissage",                     q:1,      pu:10 },
  { nom:'Accès compte en ligne',                      q:1,      pu:95 },
  { nom:'Test de vue / anti-stress / financement',    q:1,      pu:0 },
  { nom:'30 min post permis',                         q:1,      pu:0 },
  { nom:'Carte SD',                                   q:1,      pu:15 },
  { nom:'Accès salle des tablettes',                  q:1,      pu:0 }
];


/* Tout ce qui découle des heures du simulateur */
function calculEvaluation(heuresBV, heuresBEA){
  const bv = Number(heuresBV) || 0;
  /* La conversion sert de proposition ; une saisie la remplace */
  const bea = Number(heuresBEA) ||
              (Math.round((bv * CONV_BEA) / CONV_BV) + AJOUT_BEA);

  /* Les heures de simulateur basculent à un seuil différent
     selon la boîte : l'automatique en demande moins. */
  const simuBV = (bv < 25) ? 3 : 4;
  const simuBEA = (bea <= 18) ? 2 : 3;

  /* Ce qui est fixe : théorie, simulateurs, vérifications,
     examen blanc, accompagnement, conduite 1h. */
  const fixeBV = 3 + simuBV + 6;
  const fixeBEA = 3 + simuBEA + 6;

  /* Le reste part en leçons de deux heures */
  const c2hBV = Math.ceil((bv - fixeBV) / 2);
  const c2hBEA = Math.ceil((bea - fixeBEA) / 2);

  return {
    bv: bv, bea: bea,
    simuBV: simuBV, simuBEA: simuBEA,
    c2hBV: c2hBV, c2hBEA: c2hBEA,
    /* Ce qui reste après l'examen blanc */
    leconsBV: c2hBV - 3,
    leconsBEA: c2hBEA - 3,
    leconsBEA2: c2hBEA - 2,
    resteBV: bv - HEURES_OBLIGATOIRES,
    resteBEA: bea - HEURES_OBLIGATOIRES,
    devisBV: devisEvaluation(simuBV, c2hBV, false),
    devisBEA: devisEvaluation(simuBEA, c2hBEA, true)
  };
}


function devisEvaluation(simu, c2h, auto){
  /* Les tarifs viennent de Gestion : ils changent sans qu'on
     touche au calcul. */
  const source = (typeof tarifsPrestations !== 'undefined' && tarifsPrestations)
    ? tarifsPrestations : LIGNES_DEVIS;

  const lignes = source.map(l => {
    const variable = (l.q === 'simu' || l.q === 'c2h');
    const q = (l.q === 'simu') ? simu : (l.q === 'c2h') ? c2h : l.q;
    /* Chaque boîte a son libellé et son tarif */
    const nom = auto ? (l.nomA || l.nom) : l.nom;
    const pu = auto ? ((l.puA !== undefined) ? l.puA : l.pu) : l.pu;
    return { nom: nom, q: q, pu: pu, total: q * pu,
             /* Les deux seules quantités qui bougent : elles
                se repèrent en couleur dans le devis. */
             variable: variable };
  });
  return {
    lignes: lignes,
    total: lignes.reduce((s, x) => s + x.total, 0)
  };
}


/* « 1951,50 € » */
function eurosEval(v){
  return (Math.round(Number(v) * 100) / 100)
    .toFixed(2).replace('.', ',') + ' €';
}


async function afficherEvaluation(){
  const zone = $('evaluationZone');
  if(!zone) return;

  zone.innerHTML = htmlAttente('Chargement des tarifs…');
  if(typeof chargerTarifs === 'function'){
    try{ await chargerTarifs(); }catch(e){}
  }
  zone.innerHTML = '';

  const haut = document.createElement('div');
  haut.innerHTML =
    '<div class="duo">' +
      '<div><label for="evHeures">🚗 Heures en manuelle</label>' +
        '<input type="number" id="evHeures" inputmode="numeric" min="0" ' +
          'max="60" placeholder="Ex : 32" style="font-size:20px;"></div>' +
      '<div><label for="evHeuresBea">🚙 Heures en automatique</label>' +
        '<input type="number" id="evHeuresBea" inputmode="numeric" min="0" ' +
          'max="60" placeholder="calculé" style="font-size:20px;"></div>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin:-8px 0 12px;' +
      'line-height:1.5;">Saisis les heures du simulateur à gauche : ' +
      'l\'automatique se calcule. Tu peux aussi la corriger à droite.</div>' +

    '<label for="evEleve">Élève</label>' +
    '<input type="text" id="evEleve" list="listeEleves" ' +
      'autocomplete="off" placeholder="Son nom">' +

    /* Le type de formation : l'AAC et la CS ont un programme
       fixe, elles ne se calculent pas. */
    '<label for="evType">Formation</label>' +
    '<select id="evType">' +
      '<option value="">🚗 Formation classique</option>' +
      '<option value="aac">👨‍👩‍👦 Conduite accompagnée (AAC)</option>' +
      '<option value="cs">👨‍👩‍👦 Conduite supervisée (CS)</option>' +
    '</select>';
  zone.appendChild(haut);

  const zr = document.createElement('div');
  zr.id = 'evResultat';
  zone.appendChild(zr);

  const ch = $('evHeures');
  const cb = $('evHeuresBea');

  /* La manuelle recalcule l'automatique ; corriger l'automatique
     ne touche pas à la manuelle. */
  ch.addEventListener('input', () => {
    cb.value = '';
    dessinerEvaluation();
  });
  cb.addEventListener('input', dessinerEvaluation);

  const ct = $('evType');
  if(ct) ct.addEventListener('change', dessinerEvaluation);

  setTimeout(() => ch.focus(), 100);
  dessinerEvaluation();
}


function dessinerEvaluation(){
  const zone = $('evResultat');
  if(!zone) return;

  const h = Number($('evHeures').value);
  const hBea = Number(($('evHeuresBea') || {}).value);
  zone.innerHTML = '';

  if(!h || h <= 0){
    zone.innerHTML = '<div class="empty">Saisis le nombre d\'heures ' +
      'rendu par le simulateur.</div>';
    return;
  }

  /* L'AAC et la CS ne se calculent pas : leur programme est
     fixe, seules les heures évaluées sont dites à l'élève. */
  const type = ($('evType') || {}).value || '';
  if(type){
    dessinerEvaluationAac(zone, h, type === 'cs');
    return;
  }

  const r = calculEvaluation(h, hBea);

  /* La valeur calculée s'affiche en clair tant qu'on n'a rien
     corrigé : le moniteur voit ce qu'elle vaut. */
  const cb = $('evHeuresBea');
  if(cb && !cb.value) cb.placeholder = r.bea + ' (calculé)';

  /* Les deux colonnes côte à côte : c'est ainsi qu'on compare */
  const t = document.createElement('div');
  t.style.cssText = 'overflow-x:auto;margin-bottom:14px;';

  let html = '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
    '<thead><tr><th></th>' +
      '<th style="padding:8px 6px;font-size:13px;color:var(--accent-text);' +
        'border-left:1px solid var(--line);">🚗 Manuelle</th>' +
      '<th style="padding:8px 6px;font-size:13px;color:var(--accent-text);' +
        'border-left:1px solid var(--line);">🚙 Automatique</th>' +
    '</tr></thead><tbody>';

  const ligne = (nom, a, b, gras) => {
    html += '<tr style="border-top:1px solid rgba(255,255,255,.06);">' +
      '<td style="padding:7px 6px;font-size:12px;color:var(--muted);">' +
        nom + '</td>' +
      [a, b].map(v => '<td style="padding:7px 6px;text-align:center;' +
        'border-left:1px solid var(--line);' +
        (gras ? 'font-weight:800;color:var(--accent-text);font-size:15px;' : '') +
        '">' + v + '</td>').join('') +
    '</tr>';
  };

  ligne('Total des heures', r.bv + ' h', r.bea + ' h', true);
  ligne('Simulateur', r.simuBV + ' h', r.simuBEA + ' h');
  ligne('Conduite 2h (devis)', r.c2hBV + ' ×', r.c2hBEA + ' ×', true);
  ligne('Avant examen blanc', r.leconsBV + ' leçon(s)',
        (r.c2hBEA > 6 ? r.leconsBEA : r.leconsBEA2) + ' leçon(s)');
  ligne('Devis', eurosEval(r.devisBV.total), eurosEval(r.devisBEA.total), true);

  html += '</tbody></table>';
  t.innerHTML = html;
  zone.appendChild(t);

  /* Le détail du devis, replié : on y va rarement */
  [['🚗 Devis boîte manuelle', r.devisBV],
   ['🚙 Devis boîte automatique', r.devisBEA]].forEach(([nom, d]) => {
    const det = document.createElement('details');
    det.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
      'padding:9px 12px;margin-bottom:8px;';
    det.innerHTML = '<summary style="cursor:pointer;font-size:13px;' +
      'font-weight:700;color:var(--accent-text);">' + nom + ' — ' +
      eurosEval(d.total) + '</summary>';

    const z = document.createElement('div');
    z.style.cssText = 'margin-top:9px;font-size:12px;line-height:1.7;';
    /* L'intitulé d'abord, la quantité ensuite : c'est l'ordre de
       Driv'up, et c'est là qu'on recopie. */
    z.innerHTML = d.lignes.filter(l => l.q).map(l =>
      '<div style="display:flex;gap:9px;' +
        (l.variable ? 'color:var(--accent-text);font-weight:700;' : '') + '">' +
        '<span style="flex:1;min-width:0;">' +
          l.nom.replace(/</g, '&lt;') + '</span>' +
        '<span style="flex-shrink:0;width:30px;text-align:right;">' +
          l.q + '</span>' +
        '<span style="flex-shrink:0;width:74px;text-align:right;color:' +
          (l.total ? 'inherit' : 'var(--muted)') + ';">' +
          eurosEval(l.total) + '</span></div>').join('');
    det.appendChild(z);

    zone.appendChild(det);
  });

  /* Les quatre textes à coller */
  const r2 = document.createElement('div');
  r2.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;' +
    'margin-top:12px;';

  const bouton = (nom, quoi) => {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'padding:12px;font-size:13px;margin:0;';
    b.textContent = nom;
    b.addEventListener('click', () => ouvrirTexteEvaluation(quoi, r));
    r2.appendChild(b);
  };

  bouton('💬 Messenger — BV', 'messengerBV');
  bouton('💬 Messenger — BEA', 'messengerBEA');
  bouton('✉️ Mail — BV', 'mailBV');
  bouton('✉️ Mail — BEA', 'mailBEA');
  bouton('📝 Frise BV', 'noteBV');
  bouton('📝 Frise BEA', 'noteBEA');

  zone.appendChild(r2);
}


/* ============================================================
   L'AAC ET LA CS

   Vingt heures en manuelle, quinze en automatique — c'est fixé.
   Les heures de l'évaluation ne servent qu'à dire à l'élève ce
   qu'il aurait fait en formation classique.
   ============================================================ */

function dessinerEvaluationAac(zone, heures, supervisee){
  const nom = supervisee ? 'Conduite supervisée' : 'Conduite accompagnée';

  /* Pas de tableau : le message dit tout, et le récapituler
     autrement ne pouvait que semer le doute. On rappelle
     seulement les deux totaux, qui sont fixes. */
  const a = document.createElement('div');
  a.style.cssText = 'font-size:13px;line-height:1.7;margin-bottom:14px;' +
    'padding:12px 14px;border:1px solid var(--orange);border-radius:11px;';
  a.innerHTML = '<strong style="color:var(--accent-text);">👨‍👩‍👦 ' + nom +
    '</strong><br>' +
    '🚗 En manuelle : <strong>' + PROGRAMME_AAC.bv.total + ' h</strong> ' +
      'avant le départ avec l\'accompagnateur<br>' +
    '🚙 En automatique : <strong>' + PROGRAMME_AAC.bea.total + ' h</strong>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:6px;">' +
      'Le programme est fixe. Les <strong>' + (heures || '❓') + ' h</strong> ' +
      'saisies apparaissent dans le message, pour montrer à l\'élève ce ' +
      'qu\'il économise.</div>';
  zone.appendChild(a);

  /* Les quatre messages */
  const r = document.createElement('div');
  r.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';

  const bouton = (libelle, auto, mail) => {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'padding:12px;font-size:13px;margin:0;';
    b.textContent = libelle;
    b.addEventListener('click', () =>
      ouvrirTexteAac(heures, auto, supervisee, mail));
    r.appendChild(b);
  };

  bouton('💬 Messenger — BV', false, false);
  bouton('💬 Messenger — BEA', true, false);
  bouton('✉️ Mail — BV', false, true);
  bouton('✉️ Mail — BEA', true, true);

  zone.appendChild(r);
}


async function ouvrirTexteAac(heures, auto, supervisee, mail){
  const nom = String(($('evEleve') && $('evEleve').value) || '').trim();

  const texte = mail
    ? messageAacMail(heures, auto, supervisee)
    : messageAacMessenger(heures, auto, supervisee);

  const titre = (mail ? '✉️ Mail' : '💬 Messenger') + ' — ' +
    (supervisee ? 'CS' : 'AAC') + ' ' + (auto ? 'BEA' : 'BV');

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(580px, 95vw);max-height:90vh;overflow-y:auto;';

  boite.innerHTML = '<h3>' + titre + '</h3>' +
    (mail
      ? '<div style="font-size:11px;color:var(--muted);margin-bottom:9px;' +
        'line-height:1.5;">Sans émoji ni caractère stylisé : Driv\'up ' +
        'les remplace par des points d\'interrogation.</div>'
      : '');

  const z = document.createElement('textarea');
  z.rows = 18;
  z.value = texte;
  z.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:13px;' +
    'line-height:1.6;font-family:inherit;resize:vertical;margin-bottom:10px;';
  boite.appendChild(z);

  const r1 = document.createElement('div');
  r1.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;';

  const bCop = document.createElement('button');
  bCop.className = 'btn btn-primary';
  bCop.style.cssText = 'flex:1;padding:12px;font-size:13px;margin:0;';
  bCop.textContent = '📋 Copier';
  bCop.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(z.value);
      showToast('Copié ✅');
    }catch(e){ z.focus(); z.select(); showToast('Ctrl+C pour copier'); }
  });
  r1.appendChild(bCop);

  if(mail && nom){
    const bMail = document.createElement('button');
    bMail.className = 'btn btn-secondary';
    bMail.style.cssText = 'flex:1;padding:12px;font-size:13px;margin:0;';
    bMail.textContent = '✉️ Envoyer';
    bMail.addEventListener('click', async () => {
      let adresse = '';
      try{
        const d = await appelPrep({ action: 'contactEleve', eleve: nom });
        adresse = ((d && d.contact) || {}).email || '';
      }catch(e){}

      /* Confirmée avant l'envoi : elle a pu changer. */
      adresse = await confirmerAdresseEleve(nom, adresse);
      if(!adresse) return;

      bMail.disabled = true;
      bMail.textContent = 'Envoi…';
      try{
        await appelPrep({ action: 'mailBilan', to: [adresse],
          sujet: 'Ton évaluation de départ - Évolution Conduites',
          texte: z.value });
        bMail.textContent = '✅ Envoyé';
        showToast('Envoyé à ' + adresse + ' ✅');
      }catch(e){
        bMail.disabled = false;
        bMail.textContent = '✉️ Envoyer';
        showToast('Impossible : ' + e.message);
      }
    });
    r1.appendChild(bMail);
  }

  boite.appendChild(r1);

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
}


/* ============================================================
   LES MESSAGES

   Le pied — les conditions que l'élève accepte — vit dans les
   réglages : il change plus souvent que le reste, et le bureau
   doit pouvoir le corriger seul.
   ============================================================ */

/* La fin du message, telle qu'elle est envoyée depuis toujours.

   Deux versions : celle de Messenger, avec ses émojis, et celle
   de Driv'up qui ne les accepte pas. */
const PIED_MESSENGER = [
'🧠 Rappel : une évaluation ne donne pas un nombre exact de cours à suivre mais une indication à un temps T.',
'👀 Il faudra revoir tout au long de la formation ton évolution',
'💡 Il existe la conduite supervisée qui peut permettre de diminuer le nombre d\'heures.',
'💰 Financement personnel / Paiement en plusieurs fois avec notre prestataire ALMA / Financement extérieur (CPF, Pôle Emplois, ...)',
'📝 Tu vas recevoir un contrat numérique par mail à signer basé sur cette évaluation. ',
'𝙑𝙊𝙄𝘾𝙄 𝘾𝙀 𝙌𝙐𝙀 𝙏𝙐 𝘼𝘾𝘾𝙀𝙋𝙏𝙀𝙎 𝙀𝙉 𝙎𝙄𝙂𝙉𝘼𝙉𝙏 𝙇𝙀 𝘾𝙊𝙉𝙏𝙍𝘼𝙏 :',
'𝙇\'𝙚́𝙡𝙚̀𝙫𝙚 𝙖𝙘𝙘𝙚𝙥𝙩𝙚 𝙡𝙖 𝙢𝙖𝙣𝙞𝙚̀𝙧𝙚 𝙚𝙩 𝙡𝙚 𝙛𝙤𝙣𝙘𝙩𝙞𝙤𝙣𝙣𝙚𝙢𝙚𝙣𝙩 𝙙𝙚 𝙩𝙧𝙖𝙫𝙖𝙞𝙡𝙡𝙚𝙧 𝙙𝙪 𝙘𝙚𝙣𝙩𝙧𝙚 𝙙𝙚 𝙛𝙤𝙧𝙢𝙖𝙩𝙞𝙤𝙣. 𝙄𝙡 𝙡𝙪𝙞 𝙖 𝙗𝙞𝙚𝙣 𝙚́𝙩𝙚́ 𝙞𝙣𝙙𝙞𝙦𝙪𝙚́ 𝙦𝙪𝙚 𝙨𝙞 𝙘𝙚𝙡𝙖 𝙣𝙚 𝙡𝙪𝙞 𝙘𝙤𝙣𝙫𝙚𝙣𝙖𝙞𝙩 𝙥𝙖𝙨, 𝙞𝙡 𝙚𝙭𝙞𝙨𝙩𝙚 𝙙\'𝙖𝙪𝙩𝙧𝙚𝙨 𝙢𝙚́𝙩𝙝𝙤𝙙𝙤𝙡𝙤𝙜𝙞𝙚𝙨 𝙙𝙖𝙣𝙨 𝙙\'𝙖𝙪𝙩𝙧𝙚𝙨 𝙚́𝙩𝙖𝙗𝙡𝙞𝙨𝙨𝙚𝙢𝙚𝙣𝙩𝙨.',
'📚 M\'engage à accepter la manière de travailler du centre de formation Évolution Conduites expliquée dans la vidéo de présentation que vous avez regardé à l\'accueil.',
'🤝 Comprend que l\'accès aux écoutes pédagogiques et aux groupes de travail, sont un réel complément aux heures de conduites, qu\'ils seront ouverts et accessibles UNIQUEMENT pendant ma présence en formation, avec un réel investissement de ma part.',
'M\'engage à me donner à fond dans ma formation (travail à domicile, réservations des cours en autonomie, pas d\'absence ni de retard etc...)',
'Comprends qu\'Évolution Conduites me présentera à l\'épreuve pratique du permis de conduire, SEULEMENT si le centre de formation m\'estime apte à obtenir mon examen pratique du permis de conduire, selon le nombre d\'heures données à effectuer d\'après le résultat de mon examen blanc (selon progression).',
'📆 Est bien conscient(e) que les dates d\'examens pratiques sont données par la DDTM et qu\'en cas d\'annulation ou de report, le centre de formation n\'est absolument pas responsable.',
'❌ Est bien conscient(e) qu\'en cas d\'échec à l\'épreuve pratique, le centre de formation ne peut être tenu responsable des délais de repassage, dans la mesure où les premières présentations sont toujours privilégiées, est bien conscient(e) aussi qu\'il sera nécessaire de continuer la formation (y compris nombre de leçons de conduites estimées lors de l\'examen), afin d\'obtenir le niveau nécessaire pour l\'obtention de l\'examen.',
'🌟 Est bien conscient(e) d\'être dans un centre de formation à la conduite et à la sécurité routière et de ce fait, accepter avec notre aide, de devenir un(e) conducteur(trice) sûr(e) et responsable.'
].join('\n');


const PIED_MAIL = [
'- Rappel : une évaluation ne donne pas un nombre exact de cours à suivre mais une indication à un temps T',
'- Il faudra revoir tout au long de la formation ton évolution ',
'- Il existe la conduite supervisée qui peut permettre de diminuer le nombre d\'heures',
'- Financement personnel / Paiement en plusieurs fois avec notre prestataire ALMA / Financement extérieur (CPF, Pôle Emplois,...) ',
'- Tu vas recevoir un contrat numérique par mail à signer basé sur cette évaluation. ',
'VOICI CE QUE TU ACCEPTES EN SIGNANT LE CONTRAT :',
'L\'élève accepte la manière et le fonctionnement de travailler du centre de formation. Il lui a bien été indiqué que si cela ne lui convenait pas, il existe d\'autres méthodologies dans d\'autres établissements.',
'- M\'engage à accepter la manière de travailler du centre de formation Évolution Conduites expliquée dans la vidéo de présentation que vous avez regardé à l\'accueil.',
'- Comprend que l\'accès aux écoutes pédagogiques et aux groupes de travail, sont un réel complément aux heures de conduites, qu\'ils seront ouverts et accessibles UNIQUEMENT pendant ma présence en formation, avec un réel investissement de ma part.',
'M\'engage à me donner à fond dans ma formation (travail à domicile, réservations des cours en autonomie, pas d\'absence ni de retard etc...)',
'Comprends qu\'Évolution Conduites me présentera à l\'épreuve pratique du permis de conduire, SEULEMENT si le centre de formation m\'estime apte à obtenir mon examen pratique du permis de conduire, selon le nombre d\'heures données à effectuer d\'après le résultat de mon examen blanc (selon progression).',
'- Est bien conscient(e) que les dates d\'examens pratiques sont données par la DDTM et qu\'en cas d\'annulation ou de report, le centre de formation n\'est absolument pas responsable.',
'- Est bien conscient(e) qu\'en cas d\'échec à l\'épreuve pratique, le centre de formation ne peut être tenu responsable des délais de repassage, dans la mesure où les premières présentations sont toujours privilégiées, est bien conscient(e) aussi qu\'il sera nécessaire de continuer la formation (y compris nombres de leçons de conduites estimées lors de l\'examen), afin d\'obtenir le niveau nécessaire pour l\'obtention de l\'examen.',
'- Est bien conscient(e) d\'être dans un centre de formation à la conduite et à la sécurité routière et de ce fait, accepter avec notre aide, de devenir un(e) conducteur(trice) sûr(e) et responsable.'
].join('\n');


/* Le message pour Messenger, avec ses caractères stylisés.

   Trois nombres varient : les heures de simulateur, les leçons
   avant examen blanc, et le total. Le reste ne bouge pas. */
function texteMessenger(r, auto){
  const simu = auto ? r.simuBEA : r.simuBV;
  const lecons = auto ? (r.c2hBEA > 6 ? r.leconsBEA : r.leconsBEA2)
                      : r.leconsBV;
  const total = auto ? r.bea : r.bv;

  return [
'𝙏𝙐 𝘼𝙎 𝙁𝘼𝙄𝙏 𝙏𝙊𝙉 𝙀́𝙑𝘼𝙇𝙐𝘼𝙏𝙄𝙊𝙉 𝙎𝙐𝙍 𝙎𝙄𝙈𝙐𝙇𝘼𝙏𝙀𝙐𝙍 !',
'',
"𝙀𝙎𝙏𝙄𝙈𝘼𝙏𝙄𝙊𝙉 𝘿𝙐 𝙉𝙊𝙈𝘽𝙍𝙀 𝘿'𝙃𝙀𝙐𝙍𝙀𝙎 : ",
'🕙 𝗖𝗢𝗨𝗥𝗦 𝗗𝗘 𝗧𝗛𝗘́𝗢𝗥𝗜𝗘 𝗗𝗘 𝗟𝗔 𝗖𝗢𝗡𝗗𝗨𝗜𝗧𝗘 : 3 heures',
'🕙 𝗔𝗖𝗖𝗘̀𝗦 𝗔̀ 𝗡𝗢𝗦 𝗥𝗘𝗦𝗦𝗢𝗨𝗥𝗖𝗘𝗦 𝗦𝗨𝗥 𝗙𝗔𝗖𝗘𝗕𝗢𝗢𝗞 : en illimité',
'🕙 𝗘́𝗖𝗢𝗨𝗧𝗘𝗦 𝗣𝗘́𝗗𝗔𝗚𝗢𝗚𝗜𝗤𝗨𝗘𝗦 𝗘𝗡 𝗩𝗢𝗜𝗧𝗨𝗥𝗘 : en illimité',
'🕙 𝗦𝗜𝗠𝗨𝗟𝗔𝗧𝗘𝗨𝗥 𝗔𝗩𝗘𝗖 𝗠𝗢𝗡𝗜𝗧𝗘𝗨𝗥 : ' + simu + ' heures modulables selon ton niveau',
'🕙 𝗟𝗘𝗖̧𝗢𝗡𝗦 𝗗𝗘 𝗖𝗢𝗡𝗗𝗨𝗜𝗧𝗘 𝗘𝗡 𝗩𝗢𝗜𝗧𝗨𝗥𝗘 𝗔𝗩𝗔𝗡𝗧 𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖 : ' + lecons + ' leçons de 2 heures modulables selon ton niveau',
'🕙 𝗦𝗜𝗠𝗨𝗟𝗔𝗧𝗘𝗨𝗥 𝗡𝗨𝗜𝗧  : 1 heure 𝗘𝗧 𝗥𝗜𝗦𝗤𝗨𝗘 : 1 heure ',
'🕙 𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖 : 1 heure 30',
'🕙 𝗟𝗘𝗖̧𝗢𝗡𝗦 𝗗𝗘 𝗖𝗢𝗡𝗗𝗨𝗜𝗧𝗘 𝗘𝗡 𝗩𝗢𝗜𝗧𝗨𝗥𝗘 𝗔𝗣𝗥𝗘́𝗦 𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖 : 2 leçons de 2 heures modulables selon ton niveau (ré-évaluation lors de ton examen blanc)',
"🕙 𝗛𝗘𝗨𝗥𝗘𝗦 𝗣𝗥𝗘́𝗣𝗔𝗥𝗔𝗧𝗢𝗜𝗥𝗘𝗦 𝗔𝗩𝗔𝗡𝗧 𝗘𝗫𝗔𝗠𝗘𝗡 : 3 heures (2h le jour d'avant + 1h jour même)",
'🕙 𝗧𝗢𝗧𝗔𝗟 : ' + total + ' heures ',
'',
'',
PIED_MESSENGER
  ].join('\n');
}


/* Le même, pour le mail de Driv'up : sans émoji ni caractère
   stylisé, qu'il remplace par des points d'interrogation. */
function texteMail(r, auto){
  const simu = auto ? r.simuBEA : r.simuBV;
  const lecons = auto ? (r.c2hBEA > 6 ? r.leconsBEA : r.leconsBEA2)
                      : r.leconsBV;
  const total = auto ? r.bea : r.bv;

  return [
'TU AS FAIT TON ÉVALUATION SUR SIMULATEUR !',
'',
"ESTIMATION DU NOMBRE D'HEURES",
'*COURS DE THEORIE DE LA CONDUITE : 3 heures',
'*ACCES A NOS RESSOURCES SUR FACEBOOK : en illimité',
'*ÉCOUTES PÉDAGOGIQUES EN VOITURE : en illimité',
'*SIMULATEUR AVEC MONITEUR : ' + simu + ' heures modulables selon ton niveau',
'*LEÇONS DE CONDUITE EN VOITURE AVANT EXAMEN BLANC : ' + lecons + ' leçons de 2 heures modulables selon ton niveau',
'*SIMULATEUR NUIT : 1 heure ET RISQUE: 1 heure ',
'*EXAMEN BLANC : 1 heure 30',
'*LEÇONS DE CONDUITE EN VOITURE APRES EXAMEN BLANC : 2 leçons de 2 heures modulables selon ton niveau (ré-évaluation lors de ton examen blanc)',
"*HEURES PRÉPARATOIRES AVANT EXAMEN: 3 heures (2h le jour d'avant + 1h le jour de l'examen)",
'*TOTAL : ' + total + ' ',
'',
'',
PIED_MAIL
  ].join('\n');
}


/* Driv'up n'accepte ni émoji ni caractère stylisé : il les
   remplace par des points d'interrogation. Les accents
   ordinaires, eux, passent très bien. */
function sansAccentNiEmoji(t){
  return String(t || '')
    /* Les gras et italiques mathématiques reviennent en lettres */
    .replace(/[\uD835][\uDC00-\uDFFF]/g, ch => {
      const c = ch.codePointAt(0);
      const bases = [
        [0x1D400, 65], [0x1D41A, 97], [0x1D434, 65], [0x1D44E, 97],
        [0x1D468, 65], [0x1D482, 97], [0x1D5A0, 65], [0x1D5BA, 97],
        [0x1D5D4, 65], [0x1D5EE, 97], [0x1D608, 65], [0x1D622, 97],
        [0x1D63C, 65], [0x1D656, 97], [0x1D670, 65], [0x1D68A, 97]
      ];
      for(const [debut, ascii] of bases){
        if(c >= debut && c < debut + 26){
          return String.fromCharCode(ascii + (c - debut));
        }
      }
      return '';
    })
    /* Puis les émojis eux-mêmes */
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, '')
    .replace(/[·•]/g, '-')
    .replace(/[ \t]{2,}/g, ' ')
    .split('\n').map(l => l.replace(/^\s+/, '')).join('\n');
}



/* Driv'up n'accepte ni émoji ni caractère stylisé : il les
   remplace par des points d'interrogation. Les accents
   ordinaires, eux, passent très bien. */
function sansAccentNiEmoji(t){
  return String(t || '')
    /* Les gras et italiques mathématiques reviennent en lettres */
    .replace(/[\uD835][\uDC00-\uDFFF]/g, ch => {
      const c = ch.codePointAt(0);
      const bases = [
        [0x1D400, 65], [0x1D41A, 97], [0x1D434, 65], [0x1D44E, 97],
        [0x1D468, 65], [0x1D482, 97], [0x1D5A0, 65], [0x1D5BA, 97],
        [0x1D5D4, 65], [0x1D5EE, 97], [0x1D608, 65], [0x1D622, 97],
        [0x1D63C, 65], [0x1D656, 97], [0x1D670, 65], [0x1D68A, 97]
      ];
      for(const [debut, ascii] of bases){
        if(c >= debut && c < debut + 26){
          return String.fromCharCode(ascii + (c - debut));
        }
      }
      return '';
    })
    /* Puis les émojis eux-mêmes */
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, '')
    .replace(/[·•]/g, '-')
    .replace(/[ \t]{2,}/g, ' ')
    .split('\n').map(l => l.replace(/^\s+/, '')).join('\n');
}



/* La note interne, celle qu'on colle dans Driv'up */
function noteInterne(r, auto){
  if(auto){
    /* Au-delà de six leçons, il en reste deux après l'examen
       blanc ; en deçà, une seule. */
    const apres = (r.c2hBEA > 6) ? 2 : 1;
    const avant = (r.c2hBEA > 6) ? r.leconsBEA : r.leconsBEA2;
    return '- Devis formation : CONDUITE Boite automatique ' +
      eurosEval(r.devisBEA.total) + '\n' +
      '- ' + avant + ' leçons de 2h + exam blanc + ' + apres +
      ' leçon' + (apres > 1 ? 's' : '') + ' de 2h (' + (apres * 2) +
      'h) + 3h avant examen';
  }
  return '- Devis formation : CONDUITE Boite manuelle ' +
    eurosEval(r.devisBV.total) + '\n' +
    '- ' + r.leconsBV + ' leçons de 2h + exam blanc + 2 leçons de 2h (4h) ' +
    '+ 3h avant examen';
}


async function ouvrirTexteEvaluation(quoi, r){
  const nom = String(($('evEleve') && $('evEleve').value) || '').trim();
  const prenom = nom ? nom.split(' ')[0] : '';

  let titre, texte, sujet = '';
  if(quoi === 'messengerBV'){
    titre = '💬 Messenger — boîte manuelle';
    texte = texteMessenger(r, false);
  }else if(quoi === 'messengerBEA'){
    titre = '💬 Messenger — boîte automatique';
    texte = texteMessenger(r, true);
  }else if(quoi === 'mailBV'){
    titre = '✉️ Mail — boîte manuelle';
    texte = texteMail(r, false);
    sujet = 'Ton évaluation de départ - Évolution Conduites';
  }else if(quoi === 'mailBEA'){
    titre = '✉️ Mail — boîte automatique';
    texte = texteMail(r, true);
    sujet = 'Ton évaluation de départ - Évolution Conduites';
  }else if(quoi === 'noteBV'){
    titre = '📝 Frise — boîte manuelle';
    texte = noteInterne(r, false);
  }else{
    titre = '📝 Frise — boîte automatique';
    texte = noteInterne(r, true);
  }

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(580px, 95vw);max-height:90vh;overflow-y:auto;';

  boite.innerHTML = '<h3>' + titre + '</h3>' +
    (quoi.indexOf('mail') === 0
      ? '<div style="font-size:11px;color:var(--muted);margin-bottom:9px;' +
        'line-height:1.5;">Sans émoji ni caractère stylisé : Driv\'up ' +
        'les remplace par des points d\'interrogation.</div>'
      : '');

  const z = document.createElement('textarea');
  z.rows = (quoi.indexOf('note') === 0) ? 5 : 16;
  z.value = texte;
  z.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:13px;' +
    'line-height:1.6;font-family:inherit;resize:vertical;margin-bottom:10px;';
  boite.appendChild(z);

  const r1 = document.createElement('div');
  r1.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;';

  const bCop = document.createElement('button');
  bCop.className = 'btn btn-primary';
  bCop.style.cssText = 'flex:1;padding:12px;font-size:13px;margin:0;';
  bCop.textContent = '📋 Copier';
  bCop.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(z.value);
      showToast('Copié ✅');
    }catch(e){ z.focus(); z.select(); showToast('Ctrl+C pour copier'); }
  });
  r1.appendChild(bCop);

  /* Le mail peut partir directement, sans passer par Driv'up */
  if(quoi.indexOf('mail') === 0 && nom){
    const bMail = document.createElement('button');
    bMail.className = 'btn btn-secondary';
    bMail.style.cssText = 'flex:1;padding:12px;font-size:13px;margin:0;';
    bMail.textContent = '✉️ Envoyer';
    bMail.addEventListener('click', async () => {
      let adresse = '';
      try{
        const d = await appelPrep({ action: 'contactEleve', eleve: nom });
        adresse = ((d && d.contact) || {}).email || '';
      }catch(e){}

      /* Confirmée avant l'envoi : elle a pu changer. */
      adresse = await confirmerAdresseEleve(nom, adresse);
      if(!adresse) return;

      bMail.disabled = true;
      bMail.textContent = 'Envoi…';
      try{
        await appelPrep({ action: 'mailBilan', to: [adresse],
                          sujet: sujet, texte: z.value });
        bMail.textContent = '✅ Envoyé';
        showToast('Envoyé à ' + adresse + ' ✅');
      }catch(e){
        bMail.disabled = false;
        bMail.textContent = '✉️ Envoyer';
        showToast('Impossible : ' + e.message);
      }
    });
    r1.appendChild(bMail);
  }

  boite.appendChild(r1);

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
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-evaluation.js'] = true;
