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
      'width:70px;">Semaine</th>' +
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
    tdS.style.cssText = 'padding:7px 6px;text-align:center;font-weight:700;' +
      'color:var(--accent-text);';
    tdS.textContent = l2.semaine;
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


/* Le navigateur imprime en PDF : c'est lui qui sait le faire */
function telechargerPlacesBE(){
  if(!verifierPlacesBE()) return;

  const f = window.open('', '_blank');
  if(!f){
    showToast('Autorise les fenêtres pour télécharger.');
    return;
  }

  f.document.write(htmlCourrierBE());
  f.document.close();
  f.document.title = nomFichierBE();

  /* Le temps que la mise en page se fasse */
  setTimeout(() => {
    f.focus();
    f.print();
  }, 400);

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

  const l = [];
  l.push("Direction Départementale des Territoires et de la Mer des Côtes-d'Armor");
  l.push('Service Risque Sécurité Bâtiment');
  l.push('Unité Éducation Routière');
  l.push('');
  l.push("DEMANDE D'UNITÉS PL ET BE — " + titre.toUpperCase());
  l.push('');
  l.push('Établissement : ' + BE_ETABLISSEMENT);
  l.push('Agrément : ' + BE_AGREMENT);
  l.push('ETP PL / BE : ' + etp);
  l.push('');

  placesBE.lignes.forEach(x => {
    if(!Number(x.unites)) return;
    l.push('Semaine ' + x.semaine + ' : ' + x.unites + ' unité(s)' +
           (x.observation ? ' — ' + x.observation : ''));
  });

  l.push('');
  l.push('Cordialement,');
  l.push(BE_ETABLISSEMENT);

  try{
    await appelPrep({
      action: 'mailBilan',
      to: [propre],
      sujet: "Demande d'unités PL et BE — " + titre + ' — ' +
             BE_ETABLISSEMENT + ' ' + BE_AGREMENT,
      texte: l.join('\n')
    });

    /* L'adresse servira la prochaine fois */
    try{
      await appelPrep({ action: 'reglageSet', cle: 'adresseDdtm',
                        valeur: propre, par: ACCES.moniteur || '' });
    }catch(e){}

    showToast('Envoyée à ' + propre + ' ✅');
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


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-placesbe.js'] = true;
