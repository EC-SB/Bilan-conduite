/* Déployé le 28/08/2026 à 12:43 — v647 */
/* ============================================================
   ec-handicap-pdf.js
   La fiche d'évaluation, en PDF.

   Elle reprend le document papier de l'école : même en-tête,
   même tableau, mêmes colonnes. De quoi l'imprimer, la joindre
   au dossier ou la déposer sur Driv'up.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Le format du document : paysage, comme l'original */
const HP = {
  marge: 10,
  ligne: 5.6,
  colControle: 78,
  colNiveau: 17,
  vert: [182, 255, 14],
  gris: [120, 120, 120],
  trait: [190, 190, 190]
};


/* Ce que le moniteur vient de remplir */
function donneesHandicap(){
  const h = {};
  Object.keys(typeof champsManuels !== 'undefined' ? (champsManuels || {}) : {})
    .forEach(k => {
      if(k.indexOf('handicap.') !== 0) return;
      h[k.slice(9)] = champsManuels[k];
    });

  /* Rien en mémoire : la fiche vient de l'historique, rouverte des
     jours plus tard. On la relit dans le texte du bilan, qui la
     contient en entier — et c'est lui qui fait foi, le moniteur
     ayant pu le corriger à la main avant d'enregistrer. */
  if(!Object.keys(h).length){
    return handicapDepuisTexte(($('resultText') && $('resultText').value) || '');
  }
  return h;
}


/* ============================================================
   RELIRE UNE FICHE DÉJÀ ENREGISTRÉE

   buildHandicap() écrit la fiche selon un format fixe : on la
   relit avec les mêmes repères. Les titres sont en caractères
   gras Unicode — il faut les ramener à des lettres ordinaires
   avant d'espérer les reconnaître.
   ============================================================ */

/* L'inverse de grasUnicode() : 𝗥𝗲𝗴𝗮𝗿𝗱 redevient Regard */
function sansGras(s){
  return Array.from(String(s || '')).map(ch => {
    const c = ch.codePointAt(0);
    if(c >= 0x1D5D4 && c <= 0x1D5ED) return String.fromCharCode(65 + (c - 0x1D5D4));
    if(c >= 0x1D5EE && c <= 0x1D607) return String.fromCharCode(97 + (c - 0x1D5EE));
    if(c >= 0x1D7EC && c <= 0x1D7F5) return String.fromCharCode(48 + (c - 0x1D7EC));
    return ch;
  }).join('');
}

/* Ce texte est-il une fiche d'évaluation ? C'est le contenu qu'on
   interroge, pas une étiquette : le bilan rouvert depuis
   l'historique ne dit plus quel modèle l'a produit. */
function estFicheEvaluation(texte){
  const t = sansGras(String(texte || ''))
    .toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return /FICHE\s+D['’]EVALUATION/.test(t);
}

/* La clé de comparaison d'un libellé : sans gras, sans accents,
   sans le deux-points final des titres. */
function clefLigneHandicap(s){
  return sansGras(String(s || ''))
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').replace(/\s*:\s*$/, '').trim();
}

function handicapDepuisTexte(texte){
  const h = {};
  const brut = String(texte || '');
  if(!brut.trim()) return h;

  /* Chaque contrôle par son libellé, pour retrouver sa clé */
  const parNom = {};
  (typeof HANDICAP_LIGNES !== 'undefined' ? HANDICAP_LIGNES : [])
    .forEach(l => { parNom[clefLigneHandicap(l.nom)] = l.cle; });

  let section = 'entete';
  let courant = '';
  const problematique = [];
  const conclusion = [];

  brut.split('\n').forEach(ligneBrute => {
    const ligne = String(ligneBrute).replace(/\s+$/, '');
    const nu = sansGras(ligne).trim();

    /* Un séparateur ferme la section en cours */
    if(/^[━─—_-]{3,}$/.test(nu)){
      if(section === 'problematique') section = 'controles';
      return;
    }

    let m;
    if((m = nu.match(/^👤\s*Conducteur\s*:\s*(.*)$/))){ h.conducteur = m[1].trim(); return; }
    if((m = nu.match(/^🎓\s*Formateur\s*:\s*(.*)$/))){ h.formateur = m[1].trim(); return; }
    if((m = nu.match(/^📅\s*Date\s*:\s*(.*)$/))){ h.date = m[1].trim(); return; }

    if(/^❓/.test(nu)){ section = 'problematique'; courant = ''; return; }
    if(/^📋/.test(nu)){ section = 'conclusion'; courant = ''; return; }

    if(!nu) return;
    if(section === 'entete') return;
    if(section === 'problematique'){ problematique.push(nu); return; }
    if(section === 'conclusion'){ conclusion.push(nu); return; }

    /* Une observation : buildHandicap l'indente de trois espaces */
    if(/^\s{3,}/.test(ligne) && courant){
      h[courant + 'O'] = (h[courant + 'O'] ? h[courant + 'O'] + '\n' : '') + nu;
      return;
    }

    /* Sinon : un contrôle, avec ou sans sa note.

       Le drapeau u n'est pas décoratif : 🟢 s'écrit sur deux unités
       de code, et sans lui la classe ne reconnaissait qu'une moitié
       d'émoji — aucune note n'était relue. */
    const av = nu.match(/^(.*?)\s+[\u{1F7E2}\u{1F7E0}\u{1F534}]\s*([ABC])\b/u);
    const libelle = av ? av[1] : nu;
    const cle = parNom[clefLigneHandicap(libelle)];
    if(!cle){ courant = ''; return; }

    courant = cle;
    if(av) h[cle + 'N'] = av[2];
  });

  if(problematique.length) h.problematique = problematique.join('\n');
  if(conclusion.length) h.conclusion = conclusion.join('\n');
  return h;
}


async function pdfHandicap(h, pourEnvoi){
  const jsPDF = await chargerJsPDF();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const L = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = HP.marge;

  /* ---- L'en-tête ---- */
  doc.setFillColor.apply(doc, HP.vert);
  doc.rect(HP.marge, y, 52, 18, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ÉVOLUTION', HP.marge + 4, y + 8);
  doc.setFontSize(11);
  doc.text('Conduites', HP.marge + 14, y + 14);

  /* Les quatre champs, encadrés comme sur le document */
  const xI = HP.marge + 58;
  const largeI = L - xI - HP.marge;
  const champs = [
    ['Conducteur :', h.conducteur],
    ['Formateur :', h.formateur],
    ['Date :', h.date]
  ];

  doc.setFontSize(9);
  let yI = y;
  champs.forEach(([nom, val]) => {
    doc.setDrawColor.apply(doc, HP.trait);
    doc.rect(xI, yI, 30, 5.5);
    doc.rect(xI + 30, yI, largeI - 30, 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(nom, xI + 1.5, yI + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val || ''), xI + 31.5, yI + 3.8);
    yI += 5.5;
  });

  /* La problématique, sur trois lignes */
  doc.rect(xI, yI, 30, 14);
  doc.rect(xI + 30, yI, largeI - 30, 14);
  doc.setFont('helvetica', 'bold');
  doc.text('Problématique :', xI + 1.5, yI + 3.8);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(String(h.problematique || ''), largeI - 34),
           xI + 31.5, yI + 3.8);

  y = Math.max(y + 20, yI + 18);

  /* ---- Le tableau ---- */
  const xC = HP.marge;
  const xN = xC + HP.colControle;
  const xO = xN + HP.colNiveau * 3;
  const largeO = L - xO - HP.marge;

  /* Deux rangées d'en-tête : « Niveau » chapeaute A, B, C */
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8.5);

  doc.rect(xC, y, HP.colControle, HP.ligne * 2);
  doc.text('Contrôle', xC + HP.colControle / 2, y + HP.ligne + 1,
           { align: 'center' });

  doc.rect(xN, y, HP.colNiveau * 3, HP.ligne);
  doc.text('Niveau', xN + HP.colNiveau * 1.5, y + 4, { align: 'center' });

  [['A', 'Bon'], ['B', 'Moyen'], ['C', 'Faible']].forEach(([v, quoi], i) => {
    const x = xN + HP.colNiveau * i;
    doc.rect(x, y + HP.ligne, HP.colNiveau, HP.ligne);
    doc.setFontSize(8);
    doc.text(v, x + HP.colNiveau / 2, y + HP.ligne + 2.6, { align: 'center' });
    doc.setFontSize(7);
    doc.text(quoi, x + HP.colNiveau / 2, y + HP.ligne + 5.2, { align: 'center' });
    doc.setFontSize(8.5);
  });

  doc.rect(xO, y, largeO, HP.ligne * 2);
  doc.text('Observations', xO + largeO / 2, y + HP.ligne + 1, { align: 'center' });

  y += HP.ligne * 2;

  /* Chaque ligne du document */
  (typeof HANDICAP_LIGNES !== 'undefined' ? HANDICAP_LIGNES : []).forEach(l => {
    const note = String(h[l.cle + 'N'] || '');
    const obs = String(h[l.cle + 'O'] || '');

    doc.setDrawColor.apply(doc, HP.trait);
    doc.rect(xC, y, HP.colControle, HP.ligne);

    doc.setTextColor(0, 0, 0);
    if(l.titre){
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(l.nom, xC + 1.5, y + 4.2);
    }else{
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      /* Les sous-lignes sont centrées sur le document papier */
      doc.text(l.nom, xC + HP.colControle / 2, y + 4.2, { align: 'center' });
    }

    /* Les trois cases, celle qui est notée reçoit une croix */
    ['A', 'B', 'C'].forEach((v, i) => {
      const x = xN + HP.colNiveau * i;
      doc.rect(x, y, HP.colNiveau, HP.ligne);
      if(note === v){
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('X', x + HP.colNiveau / 2, y + 4.4, { align: 'center' });
      }
    });

    doc.rect(xO, y, largeO, HP.ligne);
    if(obs){
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      /* Une observation trop longue est coupée plutôt que de
         déborder sur la ligne suivante. */
      const t = doc.splitTextToSize(obs, largeO - 3)[0] || '';
      doc.text(t, xO + 1.5, y + 4.2);
    }

    y += HP.ligne;
  });

  /* ---- La conclusion ---- */
  const hautConclusion = Math.max(20, H - y - HP.marge);
  doc.rect(xC, y, L - HP.marge * 2, hautConclusion);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Conclusion :', xC + 1.5, y + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(doc.splitTextToSize(String(h.conclusion || ''), L - HP.marge * 2 - 4),
           xC + 1.5, y + 9);

  return pourEnvoi ? doc.output('datauristring').split(',')[1] : doc;
}


function nomFichierHandicap(h){
  const qui = String(h.conducteur || 'eleve')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const quand = String(h.date || todayLocal()).replace(/[^\d]/g, '-');

  return 'Fiche-evaluation-' + qui + '-' + quand + '.pdf';
}


/* ============================================================
   LES BOUTONS, SOUS LE BILAN
   ============================================================ */

/* Montre ou cache les sorties de la fiche, selon ce qu'affiche
   l'écran. Appelée à la génération du bilan ET à l'ouverture d'un
   bilan depuis l'historique : une fiche faite la semaine dernière
   doit se retélécharger comme celle du jour. */
function majBoutonsHandicap(){
  const zh = $('handicapActions');
  if(!zh) return;

  const texte = ($('resultText') && $('resultText').value) || '';
  /* Le modèle en cours quand on vient de la remplir ; le texte
     lui-même quand elle remonte de l'historique, où plus rien ne
     dit de quel modèle elle vient. */
  const surFiche = (($('modele') && $('modele').value) === 'handicap') ||
                   estFicheEvaluation(texte);

  zh.innerHTML = '';
  zh.style.display = surFiche ? 'block' : 'none';
  if(surFiche) boutonsHandicap(zh);
}

function boutonsHandicap(zone){
  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;';

  /* Télécharger : pour le dossier, ou pour Driv'up */
  const bPdf = document.createElement('button');
  bPdf.className = 'btn btn-secondary';
  bPdf.style.cssText = 'flex:1;min-width:150px;padding:11px;font-size:13px;margin:0;';
  bPdf.textContent = '📥 Télécharger le PDF';

  bPdf.addEventListener('click', async () => {
    bPdf.disabled = true;
    bPdf.textContent = 'Préparation…';
    try{
      const h = donneesHandicap();
      const doc = await pdfHandicap(h, false);
      doc.save(nomFichierHandicap(h));
      bPdf.textContent = '✅ Téléchargé';
    }catch(e){
      showToast('PDF impossible : ' + e.message);
    }
    setTimeout(() => {
      bPdf.disabled = false;
      bPdf.textContent = '📥 Télécharger le PDF';
    }, 2200);
  });
  r.appendChild(bPdf);

  /* Par mail, avec le PDF joint */
  const bMail = document.createElement('button');
  bMail.className = 'btn btn-secondary';
  bMail.style.cssText = 'flex:1;min-width:150px;padding:11px;font-size:13px;margin:0;';
  bMail.textContent = '✉️ Envoyer par mail';

  bMail.addEventListener('click', () => envoyerFicheHandicap(bMail));
  r.appendChild(bMail);

  zone.appendChild(r);
}


async function envoyerFicheHandicap(bouton){
  const h = donneesHandicap();
  const eleve = String(h.conducteur || '').trim() ||
                ($('studentName') && $('studentName').value.trim()) || '';

  /* L'adresse de sa fiche, plutôt que de la redemander */
  let adresse = '';
  try{
    const d = await appelPrep({ action: 'contactEleve', eleve: eleve });
    adresse = ((d && d.contact) || {}).email || '';
  }catch(e){}

  const saisie = await demander(
    'Adresse du destinataire' +
    (adresse ? '' : "\n\nAucune adresse dans sa fiche."),
    adresse, eleve);

  if(!saisie) return;

  bouton.disabled = true;
  bouton.textContent = 'Envoi…';

  try{
    const base64 = await pdfHandicap(h, true);

    await appelPrep({
      action: 'mailBilan',
      to: [String(saisie).trim()],
      sujet: "Fiche d'évaluation — " + (eleve || 'Évolution Conduites'),
      /* Le texte du bilan dans le corps, le PDF en pièce jointe :
         le destinataire lit sans ouvrir, et garde le document. */
      texte: ($('resultText') && $('resultText').value) || '',
      piecesJointes: [{
        nom: nomFichierHandicap(h),
        type: 'application/pdf',
        contenu_base64: base64
      }]
    });

    showToast('✅ Envoyé à ' + String(saisie).trim());
    bouton.textContent = '✅ Envoyé';
  }catch(e){
    showToast('Envoi impossible : ' + e.message);
    bouton.textContent = '✉️ Envoyer par mail';
  }

  setTimeout(() => { bouton.disabled = false; }, 2000);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-handicap-pdf.js'] = true;
