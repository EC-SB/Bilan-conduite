/* Déployé le 01/09/2026 à 13:48 — v770 */
/* ============================================================
   ec-placesbe.js
   La demande d'unités PL et BE.

   Elle part à la DDTM trois mois à l'avance : les places de
   décembre se demandent avant le 30 septembre. Passé ce délai,
   il n'y a plus rien à faire.

   Le courrier reprend le modèle de la préfecture, semaine par
   semaine.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const BE_ETABLISSEMENT = 'Évolution Conduites';
const BE_AGREMENT = 'E180220010';
const BE_ETP_DEFAUT = '0,3';

const MOIS_BE = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                 'juillet', 'août', 'septembre', 'octobre',
                 'novembre', 'décembre'];


/* Les numéros de semaine d'un mois, au sens ISO : c'est ainsi
   que la préfecture les compte. */
function semainesDuMois(annee, mois){
  const out = [];
  const d = new Date(Date.UTC(annee, mois - 1, 1));
  const fin = new Date(Date.UTC(annee, mois, 0));

  while(d <= fin){
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(),
                                d.getUTCDate()));
    /* Le jeudi de la semaine décide de son numéro */
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    const jan1 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const n = Math.ceil(((t - jan1) / 86400000 + 1) / 7);
    if(out.indexOf(n) === -1) out.push(n);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}


/* Le lundi et le vendredi d'une semaine ISO.

   Deux mois se partagent parfois la même semaine : voir les
   dates évite de se tromper de période. */
function datesDeLaSemaine(annee, numero){
  /* Le 4 janvier tombe toujours dans la semaine 1 */
  const jan4 = new Date(Date.UTC(annee, 0, 4));
  const lundi1 = new Date(jan4);
  lundi1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1));

  const lundi = new Date(lundi1);
  lundi.setUTCDate(lundi1.getUTCDate() + (numero - 1) * 7);

  const vendredi = new Date(lundi);
  vendredi.setUTCDate(lundi.getUTCDate() + 4);

  const jour = d => String(d.getUTCDate()).padStart(2, '0') + '/' +
                    String(d.getUTCMonth() + 1).padStart(2, '0');

  return jour(lundi) + ' au ' + jour(vendredi);
}


/* Le mois qu'on doit demander maintenant : trois mois devant */
function moisAdemander(){
  const auj = new Date();
  const d = new Date(auj.getFullYear(), auj.getMonth() + 3, 1);
  return { annee: d.getFullYear(), mois: d.getMonth() + 1 };
}


/* La date limite : le dernier jour du mois M-3 */
function limiteDemande(annee, mois){
  /* Pour décembre, la limite est le 30 septembre */
  const d = new Date(annee, mois - 3, 0);
  return d;
}


function joursAvantLimite(annee, mois){
  const l = limiteDemande(annee, mois);
  const auj = new Date();
  auj.setHours(12, 0, 0, 0);
  l.setHours(12, 0, 0, 0);
  return Math.round((l - auj) / 86400000);
}


let placesBE = null;


async function afficherPlacesBE(){
  const zone = $('placesBEZone');
  if(!zone) return;

  zone.innerHTML = '';

  const m = moisAdemander();

  const haut = document.createElement('div');
  haut.innerHTML =
    '<div class="duo">' +
      '<div><label for="beMois">Mois demandé</label>' +
        '<select id="beMois"></select></div>' +
      '<div><label for="beAnnee">Année</label>' +
        '<input type="number" id="beAnnee" min="2024" max="2099" ' +
          'value="' + m.annee + '"></div>' +
    '</div>' +
    '<div id="beDelai" style="font-size:12px;line-height:1.5;' +
      'margin:-8px 0 12px;"></div>' +
    '<label for="beEtp">ETP PL / BE</label>' +
    '<input type="text" id="beEtp" value="' + BE_ETP_DEFAUT + '">';
  zone.appendChild(haut);

  const sel = $('beMois');
  sel.innerHTML = MOIS_BE.map((n, i) =>
    '<option value="' + (i + 1) + '"' +
    ((i + 1) === m.mois ? ' selected' : '') + '>' +
    n.charAt(0).toUpperCase() + n.slice(1) + '</option>').join('');

  const zt = document.createElement('div');
  zt.id = 'beTableau';
  zone.appendChild(zt);

  /* Les demandes déjà faites : sans cette trace, on ne sait plus
     lesquelles sont parties, et un oubli coûte un mois. */
  const zl = document.createElement('div');
  zl.id = 'beListe';
  zl.style.marginTop = '18px';
  zone.appendChild(zl);
  afficherListeBE();

  sel.addEventListener('change', dessinerPlacesBE);
  $('beAnnee').addEventListener('input', dessinerPlacesBE);

  dessinerPlacesBE();
}


function dessinerPlacesBE(){
  const zone = $('beTableau');
  if(!zone) return;

  const mois = Number($('beMois').value);
  const annee = Number($('beAnnee').value);
  if(!mois || !annee) return;

  /* Le délai : c'est ce qui décide si la demande sert encore */
  const jours = joursAvantLimite(annee, mois);
  const l = limiteDemande(annee, mois);
  const zd = $('beDelai');

  if(jours < 0){
    zd.innerHTML = '<span style="color:var(--warn-text);">⚠️ La date ' +
      'limite était le ' + l.toLocaleDateString('fr-FR') +
      ' — dépassée depuis ' + Math.abs(jours) + ' jours.</span>';
  }else if(jours <= 15){
    zd.innerHTML = '<span style="color:var(--warn-text);">⏳ À envoyer ' +
      'avant le ' + l.toLocaleDateString('fr-FR') + ' — plus que ' +
      jours + ' jour(s).</span>';
  }else{
    zd.innerHTML = '<span style="color:var(--muted);">À envoyer avant le ' +
      l.toLocaleDateString('fr-FR') + ' — ' + jours + ' jours.</span>';
  }

  const semaines = semainesDuMois(annee, mois);

  /* On garde ce qui a été saisi quand on change de mois */
  const ancien = {};
  if(placesBE && placesBE.lignes){
    placesBE.lignes.forEach(x => { ancien[x.semaine] = x; });
  }

  placesBE = {
    annee: annee, mois: mois,
    lignes: semaines.map((s, i) => ({
      semaine: s,
      /* Deux places la dernière semaine : c'est l'habitude */
      unites: ancien[s] ? ancien[s].unites
              : (i === semaines.length - 1 ? '2' : ''),
      observation: ancien[s] ? ancien[s].observation : ''
    }))
  };

  zone.innerHTML = '';

  const t = document.createElement('div');
  t.style.cssText = 'overflow-x:auto;margin-bottom:14px;';

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:14px;';
  table.innerHTML = '<thead><tr>' +
    '<th style="padding:8px 6px;font-size:11px;color:var(--muted);' +
      'width:94px;">Semaine</th>' +
    '<th style="padding:8px 6px;font-size:11px;color:var(--muted);' +
      'width:86px;">Unités</th>' +
    '<th style="text-align:left;padding:8px 6px;font-size:11px;' +
      'color:var(--muted);">Observations</th>' +
  '</tr></thead>';

  const corps = document.createElement('tbody');

  placesBE.lignes.forEach((l2, i) => {
    const tr = document.createElement('tr');
    tr.style.cssText = 'border-top:1px solid rgba(255,255,255,.06);';

    const tdS = document.createElement('td');
    tdS.style.cssText = 'padding:7px 6px;text-align:center;';
    tdS.innerHTML = '<span style="font-weight:700;color:var(--accent-text);">' +
      l2.semaine + '</span>' +
      /* Les dates ne partent pas dans le courrier : elles ne
         servent qu'à ne pas se tromper de semaine. */
      '<div style="font-size:10px;color:var(--muted);font-weight:400;' +
        'margin-top:2px;white-space:nowrap;">' +
        datesDeLaSemaine(annee, l2.semaine) + '</div>';
    tr.appendChild(tdS);

    const tdU = document.createElement('td');
    tdU.style.cssText = 'padding:5px 6px;';
    const iu = document.createElement('input');
    iu.type = 'number';
    iu.min = '0';
    iu.step = '1';
    iu.value = l2.unites;
    iu.style.cssText = 'width:100%;padding:6px;font-size:14px;margin:0;' +
      'text-align:center;';
    iu.addEventListener('input', () => {
      placesBE.lignes[i].unites = iu.value;
      majTotalBE();
    });
    tdU.appendChild(iu);
    tr.appendChild(tdU);

    const tdO = document.createElement('td');
    tdO.style.cssText = 'padding:5px 6px;';
    const io = document.createElement('input');
    io.type = 'text';
    io.value = l2.observation;
    io.style.cssText = 'width:100%;padding:6px;font-size:13px;margin:0;';
    io.addEventListener('input', () => {
      placesBE.lignes[i].observation = io.value;
    });
    tdO.appendChild(io);
    tr.appendChild(tdO);

    corps.appendChild(tr);
  });

  table.appendChild(corps);
  t.appendChild(table);
  zone.appendChild(t);

  const tot = document.createElement('div');
  tot.id = 'beTotal';
  tot.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:14px;';
  zone.appendChild(tot);
  majTotalBE();

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;';

  const bT = document.createElement('button');
  bT.className = 'btn btn-secondary';
  bT.style.cssText = 'flex:1;padding:12px;font-size:13px;margin:0;';
  bT.textContent = '📥 Télécharger';
  bT.addEventListener('click', () => telechargerPlacesBE());
  r.appendChild(bT);

  const bE = document.createElement('button');
  bE.className = 'btn btn-primary';
  bE.style.cssText = 'flex:1;padding:12px;font-size:13px;margin:0;';
  bE.textContent = '✉️ Envoyer';
  bE.addEventListener('click', () => envoyerPlacesBE());
  r.appendChild(bE);

  zone.appendChild(r);
}


function majTotalBE(){
  const z = $('beTotal');
  if(!z || !placesBE) return;

  const total = placesBE.lignes
    .reduce((s, l) => s + (Number(l.unites) || 0), 0);

  z.textContent = total
    ? total + ' unité(s) demandée(s) pour ' +
      MOIS_BE[placesBE.mois - 1] + ' ' + placesBE.annee
    : 'Aucune unité demandée pour le moment.';
}


/* ============================================================
   LE COURRIER

   Il reprend la présentation du modèle de la préfecture. Le PDF
   se fabrique dans le navigateur : rien ne transite par nos
   serveurs.
   ============================================================ */

function nomFichierBE(){
  return 'PL_' + placesBE.annee + '_' +
         String(placesBE.mois).padStart(2, '0') + '_' +
         BE_ETABLISSEMENT.replace(/\s+/g, '_') + '_' + BE_AGREMENT;
}


function htmlCourrierBE(){
  const etp = ($('beEtp') && $('beEtp').value) || BE_ETP_DEFAUT;
  const mois = MOIS_BE[placesBE.mois - 1];
  const titre = mois.charAt(0).toUpperCase() + mois.slice(1) +
                ' ' + placesBE.annee;

  const lignes = placesBE.lignes.map(l =>
    '<tr>' +
      '<td class="c">' + l.semaine + '</td>' +
      '<td class="c">' + (l.unites || '') + '</td>' +
      '<td>' + String(l.observation || '').replace(/</g, '&lt;') + '</td>' +
    '</tr>').join('');

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">' +
    '<title>' + nomFichierBE() + '</title><style>' +
    '@page{size:A4;margin:20mm;}' +
    'body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;color:#000;}' +
    'table{width:100%;border-collapse:collapse;margin-bottom:14pt;}' +
    'td,th{border:1px solid #000;padding:5pt 7pt;vertical-align:top;}' +
    '.entete td{border:none;padding:0 0 14pt;font-weight:bold;line-height:1.4;}' +
    '.titre{font-size:14pt;font-weight:bold;text-align:center;padding:7pt;}' +
    '.c{text-align:center;}' +
    '.note{font-size:10pt;font-style:italic;line-height:1.5;}' +
    'th{background:#eee;font-weight:bold;}' +
    '</style></head><body>' +

    '<table class="entete"><tr><td>' +
      "Direction Départementale des Territoires et le la Mer des Côtes-d'Armor<br>" +
      'Service Risque Sécurité Bâtiment<br>' +
      'Unité Éducation Routière' +
    '</td></tr></table>' +

    '<table>' +
      '<tr><td class="titre" colspan="3">Demande d\'unités PL et BE</td></tr>' +
      '<tr><td class="c"><strong>' + titre + '</strong></td>' +
        '<td>Établissement</td><td>' + BE_ETABLISSEMENT + '</td></tr>' +
      '<tr><td></td><td>Agrément</td><td>' + BE_AGREMENT + '</td></tr>' +
      '<tr><td></td><td>ETP PL / BE</td><td>' + etp + '</td></tr>' +
    '</table>' +

    '<table><tr><td class="note">' +
      'Les demandes doivent être transmises au plus tard le dernier jour ' +
      'du mois M-3<br>' +
      'ex : au plus tard le 30 juin pour les places de septembre<br>' +
      "au plus tard le 31 juillet pour les places d'octobre<br>…" +
    '</td></tr></table>' +

    '<table>' +
      '<thead><tr><th>Semaine n°</th>' +
        '<th>Nombre d\u2019unités souhaitées</th>' +
        '<th>Observations</th></tr></thead>' +
      '<tbody>' + lignes + '</tbody>' +
    '</table>' +

    '</body></html>';
}


/* ============================================================
   LE PDF

   La DDTM veut le courrier en pièce jointe. Le navigateur ne
   sait pas fabriquer un PDF seul : on charge jsPDF au moment de
   l'envoi, pas au démarrage — onze fois par an ne justifie pas
   de ralentir tous les écrans.
   ============================================================ */

const JSPDF_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

let jsPDFcharge = null;


function chargerJsPDF(){
  if(jsPDFcharge) return jsPDFcharge;

  jsPDFcharge = new Promise((ok, non) => {
    if(window.jspdf && window.jspdf.jsPDF){ ok(window.jspdf.jsPDF); return; }

    const s = document.createElement('script');
    s.src = JSPDF_URL;
    s.onload = () => {
      if(window.jspdf && window.jspdf.jsPDF) ok(window.jspdf.jsPDF);
      else non(new Error('jsPDF chargé mais introuvable'));
    };
    s.onerror = () => non(new Error('jsPDF injoignable'));
    document.head.appendChild(s);
  });

  return jsPDFcharge;
}


/* Le courrier, dessiné à la main : c'est un tableau simple, et
   le faire nous-mêmes évite une seconde bibliothèque. */
async function fabriquerPdfBE(){
  const jsPDF = await chargerJsPDF();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const etp = ($('beEtp') && $('beEtp').value) || BE_ETP_DEFAUT;
  const mois = MOIS_BE[placesBE.mois - 1];
  const titre = mois.charAt(0).toUpperCase() + mois.slice(1) +
                ' ' + placesBE.annee;

  const G = 20;              /* marge gauche */
  const L = 170;             /* largeur utile */
  let y = 22;

  /* L'en-tête de la préfecture */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("Direction Départementale des Territoires et le la Mer", G, y);
  y += 5;
  doc.text("des Côtes-d'Armor", G, y);
  y += 5;
  doc.text('Service Risque Sécurité Bâtiment', G, y);
  y += 5;
  doc.text('Unité Éducation Routière', G, y);
  y += 12;

  /* Le titre, encadré */
  doc.setFontSize(13);
  doc.rect(G, y, L, 10);
  doc.text("Demande d'unités PL et BE", G + L / 2, y + 6.8,
           { align: 'center' });
  y += 10;

  /* L'établissement */
  doc.setFontSize(11);
  const rangs = [
    [titre, 'Établissement', BE_ETABLISSEMENT],
    ['', 'Agrément', BE_AGREMENT],
    ['', 'ETP PL / BE', etp]
  ];

  rangs.forEach(([a, b, d2]) => {
    doc.rect(G, y, 40, 9);
    doc.rect(G + 40, y, 45, 9);
    doc.rect(G + 85, y, L - 85, 9);

    doc.setFont('helvetica', 'bold');
    if(a) doc.text(a, G + 20, y + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(b, G + 42, y + 6);
    doc.text(String(d2), G + 87, y + 6);
    y += 9;
  });

  y += 8;

  /* La note sur les délais */
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  const note = [
    'Les demandes doivent être transmises au plus tard le dernier jour du mois M-3',
    'ex : au plus tard le 30 juin pour les places de septembre',
    "au plus tard le 31 juillet pour les places d'octobre",
    '…'
  ];
  const hNote = note.length * 4.5 + 4;
  doc.rect(G, y, L, hNote);
  note.forEach((t, i) => doc.text(t, G + 3, y + 6 + i * 4.5));
  y += hNote + 8;

  /* Le tableau des semaines */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.rect(G, y, 30, 9);
  doc.rect(G + 30, y, 55, 9);
  doc.rect(G + 85, y, L - 85, 9);
  doc.text('Semaine n°', G + 15, y + 6, { align: 'center' });
  doc.text('Nombre d\u2019unités', G + 57, y + 6, { align: 'center' });
  doc.text('Observations', G + 87, y + 6);
  y += 9;

  doc.setFont('helvetica', 'normal');
  placesBE.lignes.forEach(l => {
    doc.rect(G, y, 30, 9);
    doc.rect(G + 30, y, 55, 9);
    doc.rect(G + 85, y, L - 85, 9);

    doc.text(String(l.semaine), G + 15, y + 6, { align: 'center' });
    if(l.unites) doc.text(String(l.unites), G + 57, y + 6, { align: 'center' });
    if(l.observation){
      doc.text(String(l.observation).slice(0, 48), G + 87, y + 6);
    }
    y += 9;
  });

  return doc;
}


/* Le téléchargement : le PDF descend directement */
async function telechargerPlacesBE(){
  if(!verifierPlacesBE()) return;

  showToast('Préparation du PDF…');
  try{
    const doc = await fabriquerPdfBE();
    doc.save(nomFichierBE() + '.pdf');
    showToast('PDF téléchargé ✅');
  }catch(e){
    /* jsPDF injoignable : on retombe sur l'impression, qui
       marche partout. */
    imprimerCourrierBE();
  }
}


/* Le repli : le navigateur imprime, et sait enregistrer en PDF */
function imprimerCourrierBE(){
  const f = window.open('', '_blank');
  if(!f){
    showToast('Autorise les fenêtres pour télécharger.');
    return;
  }

  f.document.write(htmlCourrierBE());
  f.document.close();
  f.document.title = nomFichierBE();

  setTimeout(() => { f.focus(); f.print(); }, 400);
  showToast('Choisis « Enregistrer en PDF » dans l\'impression');
}


function verifierPlacesBE(){
  if(!placesBE || !placesBE.lignes.length){
    showToast('Choisis un mois.');
    return false;
  }

  const total = placesBE.lignes
    .reduce((s, l) => s + (Number(l.unites) || 0), 0);

  if(!total){
    showToast('Indique au moins une unité.');
    return false;
  }
  return true;
}


/* ============================================================
   L'ENVOI

   Le courrier part par mail, dans le corps du message : la
   préfecture le lit sans pièce jointe à ouvrir.
   ============================================================ */

async function envoyerPlacesBE(){
  if(!verifierPlacesBE()) return;

  const adresse = await demander(
    'À quelle adresse envoyer la demande ?',
    (await adresseDdtm()) || '', 'Demande de places BE');

  if(!adresse || !adresse.trim()) return;

  const propre = adresse.trim();
  if(propre.indexOf('@') === -1){
    showToast('Cette adresse ne semble pas valable.');
    return;
  }

  const mois = MOIS_BE[placesBE.mois - 1];
  const titre = mois.charAt(0).toUpperCase() + mois.slice(1) +
                ' ' + placesBE.annee;

  if(!await confirmer('Envoyer la demande de ' + titre + ' à ' +
      propre + ' ?')) return;

  const etp = ($('beEtp') && $('beEtp').value) || BE_ETP_DEFAUT;

  /* Le courrier part en pièce jointe : c'est ce que la DDTM
     demande. Le corps du message reste bref. */
  showToast('Préparation du PDF…');

  let piece = null;
  try{
    const doc = await fabriquerPdfBE();
    /* jsPDF rend « data:application/pdf;base64,xxxx » : on ne
       garde que ce qui suit la virgule. */
    const brut = doc.output('datauristring');
    piece = {
      nom: nomFichierBE() + '.pdf',
      type: 'application/pdf',
      contenu: brut.slice(brut.indexOf(',') + 1)
    };
  }catch(e){
    if(!await confirmer('Le PDF n\'a pas pu être fabriqué.\n\n' +
        'Envoyer la demande dans le corps du message ?')) return;
  }

  const l = [];
  l.push('Bonjour,');
  l.push('');
  l.push('Veuillez trouver ' + (piece ? 'ci-joint' : 'ci-dessous') +
         " notre demande d'unités PL et BE pour " + titre + '.');
  l.push('');
  l.push('Établissement : ' + BE_ETABLISSEMENT);
  l.push('Agrément : ' + BE_AGREMENT);
  l.push('ETP PL / BE : ' + etp);

  /* Sans pièce jointe, le détail passe dans le message */
  if(!piece){
    l.push('');
    placesBE.lignes.forEach(x => {
      if(!Number(x.unites)) return;
      l.push('Semaine ' + x.semaine + ' : ' + x.unites + ' unité(s)' +
             (x.observation ? ' — ' + x.observation : ''));
    });
  }

  l.push('');
  l.push('Cordialement,');
  l.push(BE_ETABLISSEMENT);

  try{
    await appelPrep({
      action: 'mailBilan',
      to: [propre],
      sujet: "Demande d'unités PL et BE — " + titre + ' — ' +
             BE_ETABLISSEMENT + ' ' + BE_AGREMENT,
      texte: l.join('\n'),
      piecesJointes: piece ? [piece] : undefined
    });

    /* L'adresse servira la prochaine fois */
    try{
      await appelPrep({ action: 'reglageSet', cle: 'adresseDdtm',
                        valeur: propre, par: ACCES.moniteur || '' });
    }catch(e){}

    /* La demande est notée comme envoyée */
    try{
      await appelPrep({
        action: 'placesbeSet',
        annee: placesBE.annee, mois: placesBE.mois,
        unites: placesBE.lignes.reduce((s, x) => s + (Number(x.unites) || 0), 0),
        detail: placesBE.lignes.filter(x => Number(x.unites))
          .map(x => 'S' + x.semaine + ' : ' + x.unites).join(' · '),
        envoyee: true,
        destinataire: propre,
        par: ACCES.moniteur || ''
      });
      showToast('Envoyée à ' + propre + ' ✅');
    }catch(e){
      /* LA DEMANDE EST PARTIE, MAIS ELLE N'EST PAS NOTÉE.

         Le catch était vide : la DDTM recevait le courrier, le
         classeur ne le savait pas, et la demande repartirait le
         mois suivant — deux fois la même à la préfecture, sans
         que personne ne comprenne pourquoi. */
      await informer('La demande est bien PARTIE à ' + propre + '.\n\n' +
        "Mais elle n'a pas pu être notée comme envoyée : " + e.message +
        '\n\nNote-le quelque part, sinon elle repartira le mois ' +
        'prochain — et la DDTM la recevra deux fois.',
        'Demande envoyée, non enregistrée');
    }

    afficherListeBE();
  }catch(e){
    showToast('Impossible : ' + e.message);
  }
}


/* L'adresse retenue de la dernière fois */
async function adresseDdtm(){
  try{
    const d = await appelPrep({ action: 'reglagesList' });
    return ((d && d.reglages) || {}).adresseDdtm || '';
  }catch(e){ return ''; }
}



/* ============================================================
   LES DEMANDES DÉJÀ FAITES

   Ce qui est parti, ce qui reste à faire. Un mois oublié se
   rattrape rarement.
   ============================================================ */

let demandesBE = [];


async function afficherListeBE(){
  const zone = $('beListe');
  if(!zone) return;

  zone.innerHTML = htmlAttente('');

  try{
    const d = await appelPrep({ action: 'placesbeList' });
    demandesBE = (d && d.demandes) || [];
  }catch(e){
    zone.innerHTML = '';
    return;
  }

  zone.innerHTML = '';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:8px;';
  t.textContent = '📋 Les demandes faites';
  zone.appendChild(t);

  /* Les mois à venir qui n'ont pas encore été demandés */
  const manquants = moisSansDemande();
  if(manquants.length){
    const al = document.createElement('div');
    al.style.cssText = 'border:1px solid var(--orange);border-radius:11px;' +
      'padding:10px 12px;margin-bottom:10px;font-size:13px;line-height:1.6;';
    al.innerHTML = '<strong style="color:var(--accent-text);">⏳ ' +
      manquants.length + ' mois sans demande</strong><br>' +
      manquants.map(m => {
        const j = joursAvantLimite(m.annee, m.mois);
        return MOIS_BE[m.mois - 1] + ' ' + m.annee +
          (j < 0 ? ' <span style="color:var(--warn-text);">— dépassé</span>'
                 : ' <span style="color:var(--muted);">— ' + j + ' j</span>');
      }).join('<br>');
    zone.appendChild(al);
  }

  if(!demandesBE.length){
    zone.innerHTML += '<div class="empty">Aucune demande enregistrée.<br>' +
      '<span style="font-size:12px;">Elles s\'ajoutent quand tu envoies ' +
      'le courrier.</span></div>';
    return;
  }

  demandesBE.forEach(d => zone.appendChild(ligneDemandeBE(d)));
}


/* Les trois prochains mois qui n'ont pas de demande */
function moisSansDemande(){
  const out = [];
  const auj = new Date();

  for(let k = 3; k <= 5; k++){
    const d = new Date(auj.getFullYear(), auj.getMonth() + k, 1);
    const annee = d.getFullYear();
    const mois = d.getMonth() + 1;

    const faite = demandesBE.some(x =>
      x.annee === annee && x.mois === mois && x.envoyeeLe);
    if(!faite) out.push({ annee: annee, mois: mois });
  }
  return out;
}


function ligneDemandeBE(d){
  const envoyee = !!d.envoyeeLe;

  const l = document.createElement('div');
  l.style.cssText = 'border:1px solid ' +
    (envoyee ? 'var(--line)' : 'var(--orange)') +
    ';border-radius:11px;padding:10px 12px;margin-bottom:8px;';

  const h = document.createElement('div');
  h.style.cssText = 'display:flex;gap:9px;align-items:flex-start;';
  h.innerHTML = '<span style="flex:1;min-width:0;font-size:15px;' +
    'line-height:1.4;"><strong>' +
    (envoyee ? '✅ ' : '⏳ ') +
    MOIS_BE[d.mois - 1].charAt(0).toUpperCase() +
    MOIS_BE[d.mois - 1].slice(1) + ' ' + d.annee + '</strong>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
      (envoyee
        ? 'envoyée le ' + d.envoyeeLe +
          (d.destinataire ? ' à ' + d.destinataire.replace(/</g, '&lt;') : '') +
          (d.par ? ' par ' + d.par.replace(/</g, '&lt;') : '')
        : 'pas encore envoyée') +
    '</div></span>' +
    '<span style="flex-shrink:0;font-size:16px;font-weight:800;' +
      'color:var(--accent-text);">' + d.unites + '</span>';
  l.appendChild(h);

  if(d.detail){
    const dt = document.createElement('div');
    dt.style.cssText = 'font-size:12px;color:var(--muted);margin-top:6px;';
    dt.textContent = d.detail;
    l.appendChild(dt);
  }

  /* Ce que la préfecture a finalement accordé */
  if(d.obtenues){
    const ob = document.createElement('div');
    ob.style.cssText = 'font-size:13px;color:var(--accent-text);margin-top:6px;';
    ob.textContent = '🎓 Obtenues : ' + d.obtenues;
    l.appendChild(ob);
  }

  if(d.remarque){
    const rm = document.createElement('div');
    rm.style.cssText = 'font-size:12px;color:var(--muted);margin-top:5px;' +
      'white-space:pre-wrap;';
    rm.textContent = d.remarque;
    l.appendChild(rm);
  }

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;margin-top:9px;';

  const bO = document.createElement('button');
  bO.className = 'btn btn-secondary';
  bO.style.cssText = 'flex:1;padding:9px;font-size:12px;margin:0;';
  bO.textContent = d.obtenues ? '🎓 Modifier les places' : '🎓 Places obtenues';
  bO.addEventListener('click', async () => {
    const v = await demander('Combien de places obtenues ?', d.obtenues || '',
      MOIS_BE[d.mois - 1] + ' ' + d.annee);
    if(v === null) return;
    try{
      await appelPrep({ action: 'placesbeSet', annee: d.annee, mois: d.mois,
                        obtenues: v });
      showToast('Enregistré ✅');
      afficherListeBE();
    }catch(e){ showToast('Impossible : ' + e.message); }
  });
  r.appendChild(bO);

  const bR = document.createElement('button');
  bR.className = 'btn btn-secondary';
  bR.style.cssText = 'width:auto;padding:9px 11px;font-size:12px;margin:0;' +
    'flex-shrink:0;';
  bR.textContent = '📝';
  bR.title = 'Remarque';
  bR.addEventListener('click', async () => {
    const v = await demander('Remarque', d.remarque || '',
      MOIS_BE[d.mois - 1] + ' ' + d.annee);
    if(v === null) return;
    try{
      await appelPrep({ action: 'placesbeSet', annee: d.annee, mois: d.mois,
                        remarque: v });
      showToast('Enregistré ✅');
      afficherListeBE();
    }catch(e){ showToast('Impossible : ' + e.message); }
  });
  r.appendChild(bR);

  const bS = document.createElement('button');
  bS.className = 'btn btn-secondary';
  bS.style.cssText = 'width:auto;padding:9px 11px;font-size:12px;margin:0;' +
    'flex-shrink:0;color:var(--red);border-color:var(--red);';
  bS.textContent = '🗑️';
  bS.addEventListener('click', async () => {
    if(!await confirmer('Retirer la demande de ' +
        MOIS_BE[d.mois - 1] + ' ' + d.annee + ' ?')) return;
    try{
      await appelPrep({ action: 'placesbeDelete', id: d.id });
      showToast('Retirée ✅');
      afficherListeBE();
    }catch(e){ showToast('Impossible : ' + e.message); }
  });
  r.appendChild(bS);

  l.appendChild(r);
  return l;
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-placesbe.js'] = true;
