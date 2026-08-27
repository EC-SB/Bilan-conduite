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
  Object.keys(champsManuels || {}).forEach(k => {
    if(k.indexOf('handicap.') !== 0) return;
    h[k.slice(9)] = champsManuels[k];
  });
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
