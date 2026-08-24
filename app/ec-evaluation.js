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
function calculEvaluation(heuresBV){
  const bv = Number(heuresBV) || 0;
  const bea = Math.round((bv * CONV_BEA) / CONV_BV) + AJOUT_BEA;

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
    devisBV: devisEvaluation(simuBV, c2hBV),
    devisBEA: devisEvaluation(simuBEA, c2hBEA)
  };
}


function devisEvaluation(simu, c2h){
  const lignes = LIGNES_DEVIS.map(l => {
    const q = (l.q === 'simu') ? simu : (l.q === 'c2h') ? c2h : l.q;
    return { nom: l.nom, q: q, pu: l.pu, total: q * l.pu };
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

  zone.innerHTML = '';

  const haut = document.createElement('div');
  haut.innerHTML =
    '<div class="duo">' +
      '<div><label for="evHeures">Heures au simulateur (BV)</label>' +
        '<input type="number" id="evHeures" inputmode="numeric" min="0" ' +
          'max="60" placeholder="Ex : 32" style="font-size:20px;"></div>' +
      '<div><label for="evEleve">Élève</label>' +
        '<input type="text" id="evEleve" list="listeEleves" ' +
          'autocomplete="off" placeholder="Son nom"></div>' +
    '</div>';
  zone.appendChild(haut);

  const zr = document.createElement('div');
  zr.id = 'evResultat';
  zone.appendChild(zr);

  const ch = $('evHeures');
  ch.addEventListener('input', dessinerEvaluation);
  setTimeout(() => ch.focus(), 100);

  dessinerEvaluation();
}


function dessinerEvaluation(){
  const zone = $('evResultat');
  if(!zone) return;

  const h = Number($('evHeures').value);
  zone.innerHTML = '';

  if(!h || h <= 0){
    zone.innerHTML = '<div class="empty">Saisis le nombre d\'heures ' +
      'rendu par le simulateur.</div>';
    return;
  }

  const r = calculEvaluation(h);

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
  ligne('Leçons de 2h', r.c2hBV, r.c2hBEA);
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
    z.innerHTML = d.lignes.filter(l => l.q).map(l =>
      '<div style="display:flex;gap:8px;">' +
        '<span style="flex:1;min-width:0;">' + l.q + ' × ' +
          l.nom.replace(/</g, '&lt;') + '</span>' +
        '<span style="flex-shrink:0;color:' +
          (l.total ? 'var(--cream)' : 'var(--muted)') + ';">' +
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

  bouton('💬 Pour Messenger', 'messenger');
  bouton('✉️ Pour le mail', 'mail');
  bouton('📝 Note interne BV', 'noteBV');
  bouton('📝 Note interne BEA', 'noteBEA');

  zone.appendChild(r2);
}


/* ============================================================
   LES MESSAGES

   Le pied — les conditions que l'élève accepte — vit dans les
   réglages : il change plus souvent que le reste, et le bureau
   doit pouvoir le corriger seul.
   ============================================================ */

let piedEvaluation = null;

const PIED_DEFAUT =
  'Merci de nous confirmer ton choix de boîte de vitesses ' +
  'et de formation.';


async function chargerPiedEvaluation(){
  if(piedEvaluation !== null) return piedEvaluation;
  try{
    const d = await appelPrep({ action: 'reglagesList' });
    const g = (d && d.reglages) || {};
    piedEvaluation = g.piedEvaluation || PIED_DEFAUT;
  }catch(e){ piedEvaluation = PIED_DEFAUT; }
  return piedEvaluation;
}


/* Le message pour Messenger, avec ses caractères stylisés */
function texteMessenger(r, prenom){
  const l = [];
  l.push('𝐁𝐨𝐧𝐣𝐨𝐮𝐫' + (prenom ? ' ' + prenom : '') + ' 👋');
  l.push('');
  l.push('𝐕𝐨𝐢𝐜𝐢 𝐥𝐞 𝐫𝐞́𝐬𝐮𝐥𝐭𝐚𝐭 𝐝𝐞 𝐭𝐨𝐧 𝐞́𝐯𝐚𝐥𝐮𝐚𝐭𝐢𝐨𝐧 𝐝𝐞 𝐝𝐞́𝐩𝐚𝐫𝐭 :');
  l.push('');
  l.push('🚗 𝐄𝐍 𝐁𝐎𝐈̂𝐓𝐄 𝐌𝐀𝐍𝐔𝐄𝐋𝐋𝐄');
  l.push('· ' + r.bv + ' heures de formation');
  l.push('· ' + eurosEval(r.devisBV.total));
  l.push('');
  l.push('🚙 𝐄𝐍 𝐁𝐎𝐈̂𝐓𝐄 𝐀𝐔𝐓𝐎𝐌𝐀𝐓𝐈𝐐𝐔𝐄');
  l.push('· ' + r.bea + ' heures de formation');
  l.push('· ' + eurosEval(r.devisBEA.total));
  l.push('');
  l.push(piedEvaluation || PIED_DEFAUT);
  return l.join('\n');
}


/* Le même, sans émoji ni caractère stylisé : Driv'up les
   remplace par des points d'interrogation dans ses mails. */
function texteMail(r, prenom){
  const l = [];
  l.push('Bonjour' + (prenom ? ' ' + prenom : '') + ',');
  l.push('');
  l.push('Voici le resultat de ton evaluation de depart :');
  l.push('');
  l.push('EN BOITE MANUELLE');
  l.push('- ' + r.bv + ' heures de formation');
  l.push('- ' + eurosEval(r.devisBV.total).replace('€', 'euros'));
  l.push('');
  l.push('EN BOITE AUTOMATIQUE');
  l.push('- ' + r.bea + ' heures de formation');
  l.push('- ' + eurosEval(r.devisBEA.total).replace('€', 'euros'));
  l.push('');
  l.push(sansAccentNiEmoji(piedEvaluation || PIED_DEFAUT));
  return l.join('\n');
}


/* Driv'up n'accepte ni émoji ni caractère stylisé */
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
    /* Puis tout ce qui n'est pas une lettre ordinaire */
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/[·•]/g, '-')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
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
  await chargerPiedEvaluation();

  const nom = String(($('evEleve') && $('evEleve').value) || '').trim();
  const prenom = nom ? nom.split(' ')[0] : '';

  let titre, texte, sujet = '';
  if(quoi === 'messenger'){
    titre = '💬 Pour Messenger';
    texte = texteMessenger(r, prenom);
  }else if(quoi === 'mail'){
    titre = '✉️ Pour le mail Driv\'up';
    texte = texteMail(r, prenom);
    sujet = 'Ton evaluation de depart - Evolution Conduites';
  }else if(quoi === 'noteBV'){
    titre = '📝 Note interne — boîte manuelle';
    texte = noteInterne(r, false);
  }else{
    titre = '📝 Note interne — boîte automatique';
    texte = noteInterne(r, true);
  }

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(580px, 95vw);max-height:90vh;overflow-y:auto;';

  boite.innerHTML = '<h3>' + titre + '</h3>' +
    (quoi === 'mail'
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
  if(quoi === 'mail' && nom){
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

      if(!adresse){ showToast('Aucune adresse dans sa fiche.'); return; }

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

  /* Le pied se corrige depuis ici : c'est là qu'on le lit */
  if(quoi !== 'noteBV' && quoi !== 'noteBEA' && ACCES.role === 'admin'){
    const bP = document.createElement('button');
    bP.className = 'btn btn-secondary';
    bP.style.cssText = 'width:auto;padding:12px 14px;font-size:12px;';
    bP.textContent = '✏️ Pied';
    bP.title = 'Modifier ce qui suit les tarifs';
    bP.addEventListener('click', () => {
      document.body.removeChild(fond);
      ouvrirPiedEvaluation(quoi, r);
    });
    rw.appendChild(bP);
  }

  boite.appendChild(rw);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


function ouvrirPiedEvaluation(retour, r){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(620px, 95vw);max-height:90vh;overflow-y:auto;';

  boite.innerHTML = '<h3>✏️ Fin du message</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;' +
      'line-height:1.5;">Ce qui suit les deux tarifs : les conditions, ' +
      'ce que l\'élève accepte, la suite à donner. Colle ici ton texte ' +
      'habituel.<br>La version mail retire les émojis toute seule.</div>';

  const z = document.createElement('textarea');
  z.rows = 16;
  z.value = piedEvaluation || PIED_DEFAUT;
  z.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:13px;' +
    'line-height:1.6;font-family:inherit;resize:vertical;margin-bottom:10px;';
  boite.appendChild(z);

  const rw = document.createElement('div');
  rw.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => {
    document.body.removeChild(fond);
    ouvrirTexteEvaluation(retour, r);
  });
  rw.appendChild(bA);

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = '💾 Enregistrer';
  bO.addEventListener('click', async () => {
    bO.disabled = true;
    try{
      await appelPrep({ action: 'reglageSet', cle: 'piedEvaluation',
                        valeur: z.value, par: ACCES.moniteur || '' });
      piedEvaluation = z.value;
      document.body.removeChild(fond);
      showToast('Enregistré ✅');
      ouvrirTexteEvaluation(retour, r);
    }catch(e){
      showToast('Impossible : ' + e.message);
      bO.disabled = false;
    }
  });
  rw.appendChild(bO);

  boite.appendChild(rw);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-evaluation.js'] = true;
