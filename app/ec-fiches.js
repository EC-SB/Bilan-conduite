/* Déployé le 20/10/2026 à 09:49 — v1206 */
/* ============================================================
   ec-fiches.js
   ✍️ Le créateur des fiches « bilan à la main » — v1206

   David, le 20 octobre : « un vrai créateur visuel de comment verra
   le moniteur, un peu dans le même style que ce qu'on a fait pour
   l'affichage, mais pour les bilans en manuel ». Ses choix : une
   fiche par modèle (« ⧉ Copier vers… »), administrateurs seuls, un
   brouillon, « 👁️ Essayer comme un moniteur », « 💾 Publier »,
   « ↺ Comme avant ». Livraison ① : sur les zones existantes — titres,
   aides, fonds et leur force, micros, cases à cocher, ordre, zones
   masquées.

   ⚠️ LA FICHE DU MILIEU EST LA VRAIE. Elle est dessinée par
   dessinerChampsManuels — la fonction même qui dessine la fiche du
   moniteur — avec la forme du brouillon. Une copie écrite à part
   aurait fini par ne plus lui ressembler.

   La forme, ses règles et son nettoyage sont dans ec-manuel.js
   (« LA FORME D'UNE FICHE ») : un seul endroit pour la fiche du
   moniteur et pour son créateur.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let fiS = null;

/* Les modèles qui se remplissent à la main avec des rubriques */
function modelesDesFiches(){
  if(typeof MODELES === 'undefined' || typeof CHAMPS_MANUELS === 'undefined') return [];
  return Object.keys(MODELES).filter(k => {
    const m = MODELES[k];
    return m && k !== 'rdv-post' && m.schema !== 'handicap' && Array.isArray(CHAMPS_MANUELS[m.schema]);
  }).map(k => ({ cle: k, label: MODELES[k].label, schema: MODELES[k].schema, groupe: MODELES[k].groupe || '' }));
}
function champsDeBaseFiche(modeleCle){
  const m = MODELES[modeleCle];
  return (m && CHAMPS_MANUELS[m.schema]) || [];
}
const echFiche = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function telFiche(){ return innerWidth < 900; }
function formeVideFiche(){ return { v: 1, zones: {}, ordre: [] }; }

/* ============================================================
   OUVRIR, FERMER
   ============================================================ */
async function ouvrirCreateurFiches(modeleCle){
  if(!ACCES || ACCES.role !== 'admin'){ showToast('Réservé aux administrateurs.'); return; }
  if(typeof modeManuel !== 'undefined' && modeManuel){
    await informer('Une fiche « bilan à la main » est ouverte sur cet appareil.\n\nTermine-la ou ferme-la avant d’ouvrir le créateur de fiches.');
    return;
  }
  const liste = modelesDesFiches();
  if(!liste.length){ showToast('Aucun modèle à régler.'); return; }
  let r;
  try{ r = await appelPrep({ action: 'fichesManuellesLire' }); }
  catch(e){ showToast('Impossible de lire les fiches : ' + e.message); return; }
  if(!r || r.status !== 'ok'){ showToast('Impossible de lire les fiches.'); return; }

  /* La page garde ce qui appartient à une vraie fiche : le créateur
     prête ses propres valeurs le temps de son ouverture. */
  fiS = {
    modele: liste.some(x => x.cle === modeleCle) ? modeleCle : liste[0].cle,
    publiees: r.publiees || {}, brouillons: r.brouillons || {}, infos: r.infos || {},
    forme: null, choix: '', format: 'tel', essai: false, feuille: '', minuteur: null, enCours: null,
    sauve: {
      champsManuels: champsManuels, champsDessinesCourants: (typeof champsDessinesCourants !== 'undefined') ? champsDessinesCourants : null,
      dossierManuel: (typeof dossierManuel !== 'undefined') ? dossierManuel : null,
      prefixeExamenBlanc: prefixeExamenBlanc, cleNiveauCourante: cleNiveauCourante
    }
  };
  chargerFormeFiche();
  coquilleFiche();
  dessinerCreateurFiche();
}
function chargerFormeFiche(){
  const b = fiS.brouillons[fiS.modele], p = fiS.publiees[fiS.modele];
  fiS.forme = nettoyerFormeFiche(JSON.parse(JSON.stringify(b || p || formeVideFiche())), champsDeBaseFiche(fiS.modele));
  fiS.choix = ''; fiS.feuille = '';
}
async function fermerCreateurFiche(){
  if(!fiS || fiS.fermeture) return;
  fiS.fermeture = true;
  await enregistrerBrouillonFiche(true);
  window.essaiFicheEnCours = false;
  const s = fiS.sauve;
  champsManuels = s.champsManuels;
  if(typeof champsDessinesCourants !== 'undefined') champsDessinesCourants = s.champsDessinesCourants;
  if(typeof dossierManuel !== 'undefined') dossierManuel = s.dossierManuel;
  prefixeExamenBlanc = s.prefixeExamenBlanc; cleNiveauCourante = s.cleNiveauCourante;
  if(fiS.redim) removeEventListener('resize', fiS.redim);
  const z = document.getElementById('fiStudio');
  if(z) z.remove();
  document.body.classList.remove('stOuvert');
  fiS = null;
  if(typeof afficherTextesBilan === 'function' && document.getElementById('bilansZone')) afficherTextesBilan();
}

function coquilleFiche(){
  const z = document.createElement('div');
  z.className = 'overlay show stStudio fiStudio';
  z.id = 'fiStudio';
  z.innerHTML =
    '<div class="stBarre">' +
      '<button type="button" class="btn btn-secondary" data-fa="fermer" title="Fermer">←<span class="stCache"> Fermer</span></button>' +
      '<select class="stNom fiModele" id="fiModele"></select>' +
      '<button type="button" class="btn btn-secondary" data-fa="essai" id="fiEssai"></button>' +
      '<button type="button" class="btn btn-secondary stLarge" data-fa="copier">⧉ Copier vers…</button>' +
      '<button type="button" class="btn btn-secondary stLarge" data-fa="avant">↺ Comme avant</button>' +
      '<button type="button" class="btn btn-primary" data-fa="publier">💾 Publier</button>' +
    '</div>' +
    '<div class="stCorps">' +
      '<div class="stToile">' +
        '<div class="stFormats" id="fiFormats"></div>' +
        '<div class="fiEtat" id="fiEtat"></div>' +
        '<div class="fiCadre" id="fiCadre"><div class="card fiCarte"><div id="fiZone" class="fiZone"></div></div></div>' +
        '<div class="stAjout stSeulTel" id="fiBasTel"></div>' +
      '</div>' +
      '<div class="stPanneau" id="fiPanneau"></div>' +
    '</div>' +
    '<div class="stFeuille" id="fiFeuille"></div>';
  document.body.appendChild(z);
  document.body.classList.add('stOuvert');
  const sel = z.querySelector('#fiModele');
  const parGroupe = {};
  modelesDesFiches().forEach(m => { (parGroupe[m.groupe] = parGroupe[m.groupe] || []).push(m); });
  sel.innerHTML = Object.keys(parGroupe).map(g => '<optgroup label="' + echFiche(g || 'Autres') + '">' +
    parGroupe[g].map(m => '<option value="' + echFiche(m.cle) + '">' + echFiche(m.label) +
      (fiS.brouillons[m.cle] ? ' · brouillon' : (fiS.publiees[m.cle] ? ' · réglée' : '')) + '</option>').join('') + '</optgroup>').join('');
  sel.value = fiS.modele;
  sel.addEventListener('change', async () => {
    await enregistrerBrouillonFiche(true);
    fiS.modele = sel.value;
    chargerFormeFiche();
    dessinerCreateurFiche();
  });
  z.addEventListener('click', ev => {
    const a = ev.target.closest('[data-fa]');
    if(a) actionFiche(a.dataset.fa);
  });
  z.querySelector('#fiZone').addEventListener('click', ev => {
    /* seuls les vrais appuis : la fiche, en se dessinant, rejoue des
       clics sur ses boutons (✅ ❌, niveau…) qui remontent jusqu'ici */
    if(fiS.essai || !ev.isTrusted) return;
    const b = ev.target.closest('[data-zone]');
    if(!b) return;
    ev.preventDefault();
    fiS.choix = b.dataset.zone;
    if(telFiche()) fiS.feuille = 'zone';
    marquerChoixFiche();
    dessinerPanneauFiche();
  });
  fiS.redim = () => { if(fiS) dessinerCreateurFiche(true); };
  addEventListener('resize', fiS.redim);
}

/* ============================================================
   LES GESTES DE LA BARRE
   ============================================================ */
async function actionFiche(a){
  if(!fiS) return;
  if(a === 'fermer'){ await fermerCreateurFiche(); return; }
  if(a === 'fermerFeuille'){ fiS.feuille = ''; if(telFiche()) fiS.choix = ''; marquerChoixFiche(); dessinerPanneauFiche(); return; }
  if(a === 'essai'){
    fiS.essai = !fiS.essai;
    fiS.choix = ''; fiS.feuille = '';
    dessinerCreateurFiche();
    if(fiS.essai) showToast('👁️ Essai : remplis comme un moniteur — rien n’est enregistré');
    return;
  }
  if(a === 'copier'){ ouvrirCopieFiche(); return; }
  if(a === 'avant'){
    if(!await confirmer('Remettre la fiche « ' + MODELES[fiS.modele].label + ' » comme à l’origine ?\n\n' +
                        'Le brouillon et ce qui est publié s’effacent : les moniteurs retrouvent la fiche d’avant à leur prochain bilan.')) return;
    try{
      clearTimeout(fiS.minuteur); fiS.minuteur = null;
      const r = await appelPrep({ action: 'ficheManuelleRetirer', modele: fiS.modele });
      majFichesDepuis(r);
      chargerFormeFiche();
      dessinerCreateurFiche();
      showToast('Fiche remise comme avant ✅');
    }catch(e){ showToast('Impossible : ' + e.message); }
    return;
  }
  if(a === 'publier'){
    if(!await confirmer('Publier la fiche « ' + MODELES[fiS.modele].label + ' » pour tous les moniteurs ?\n\n' +
                        'Elle s’applique à leur prochain bilan ; une fiche déjà commencée garde sa forme jusqu’à la fin du cours.', 'Publier')) return;
    try{
      clearTimeout(fiS.minuteur); fiS.minuteur = null;
      const r = await appelPrep({ action: 'ficheManuellePoser', modele: fiS.modele, forme: JSON.stringify(fiS.forme), publier: '1' });
      majFichesDepuis(r);
      dessinerEtatFiche();
      showToast('Publiée ✅ — les moniteurs l’ont à leur prochain bilan');
    }catch(e){ showToast('Impossible : ' + e.message); }
  }
}
function majFichesDepuis(r){
  if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'réponse illisible');
  fiS.publiees = r.publiees || {}; fiS.brouillons = r.brouillons || {}; fiS.infos = r.infos || {};
  /* la fiche des moniteurs de CET appareil suit tout de suite */
  formesFiches = fiS.publiees;
  try{ localStorage.setItem('ec_formes_fiches', JSON.stringify(formesFiches)); }catch(e){}
}

/* Le brouillon part tout seul, une seconde après le dernier geste */
function changerFiche(fn){
  fn();
  fiS.forme = nettoyerFormeFiche(fiS.forme, champsDeBaseFiche(fiS.modele));
  dessinerFicheDuMoniteur();
  dessinerPanneauFiche();
  clearTimeout(fiS.minuteur);
  fiS.minuteur = setTimeout(() => enregistrerBrouillonFiche(), 1000);
  dessinerEtatFiche('…');
}
async function enregistrerBrouillonFiche(maintenant){
  if(!fiS || !fiS.minuteur) return;
  clearTimeout(fiS.minuteur); fiS.minuteur = null;
  const modele = fiS.modele, forme = JSON.stringify(fiS.forme);
  try{
    const r = await appelPrep({ action: 'ficheManuellePoser', modele: modele, forme: forme, publier: '0' });
    if(fiS){ majFichesDepuis(r); if(!maintenant) dessinerEtatFiche(); }
  }catch(e){ showToast('Brouillon non enregistré : ' + e.message); }
}

/* ============================================================
   LE DESSIN
   ============================================================ */
function dessinerCreateurFiche(){
  if(!fiS) return;
  const z = document.getElementById('fiStudio');
  if(!z) return;
  const tel = telFiche();
  z.classList.toggle('stTel', tel);
  z.querySelector('#fiEssai').innerHTML = fiS.essai ? '✏️ <span class="stLarge">Revenir aux réglages</span>' : '👁️ <span class="stLarge">Essayer comme un moniteur</span>';
  const f = z.querySelector('#fiFormats');
  f.innerHTML = tel ? '' : [['tel', '📱 Téléphone'], ['tab', '📟 Tablette']].map(([k, t]) =>
    '<button type="button" class="btn ' + (fiS.format === k ? 'btn-primary' : 'btn-secondary') + '" data-format="' + k + '">' + t + '</button>').join('') +
    '<span class="info">' + (fiS.essai ? '👁️ Essai : remplis-la comme un moniteur, rien n’est enregistré' : 'La vraie fiche, telle que le moniteur la verra — touche une zone pour la régler') + '</span>';
  f.querySelectorAll('[data-format]').forEach(b => b.addEventListener('click', () => { fiS.format = b.dataset.format; dessinerCreateurFiche(); }));
  const cadre = z.querySelector('#fiCadre');
  cadre.classList.toggle('fiTablette', !tel && fiS.format === 'tab');
  cadre.classList.toggle('fiTel', tel);
  const bas = z.querySelector('#fiBasTel');
  bas.innerHTML = fiS.essai ? '' : '<button type="button" class="btn btn-secondary" id="fiZonesTel">🧩 Les zones</button>' +
    '<button type="button" class="btn btn-secondary" data-fa="copier">⧉ Copier vers…</button>' +
    '<button type="button" class="btn btn-secondary" data-fa="avant">↺ Comme avant</button>';
  const bz = bas.querySelector('#fiZonesTel');
  if(bz) bz.addEventListener('click', () => { fiS.feuille = 'zones'; fiS.choix = ''; marquerChoixFiche(); dessinerPanneauFiche(); });
  dessinerEtatFiche();
  dessinerFicheDuMoniteur();
  dessinerPanneauFiche();
}

function dessinerEtatFiche(enCours){
  const e = document.getElementById('fiEtat');
  if(!e || !fiS) return;
  const i = fiS.infos[fiS.modele] || {};
  const brouillon = !!fiS.brouillons[fiS.modele], publie = !!fiS.publiees[fiS.modele];
  let t;
  if(enCours) t = '💾 Enregistrement du brouillon…';
  else if(brouillon) t = '📝 Brouillon enregistré' + (i.majLe ? ' (' + echFiche(i.majLe) + ')' : '') + ' — <b>pas encore publié</b>' +
    (publie ? ' · les moniteurs ont la version publiée' + (i.publieLe ? ' le ' + echFiche(i.publieLe) : '') : ' · les moniteurs ont la fiche d’origine');
  else if(publie) t = '✅ Publiée' + (i.publieLe ? ' le ' + echFiche(i.publieLe) : '') + (i.publiePar ? ' par ' + echFiche(i.publiePar) : '') + ' — c’est celle des moniteurs';
  else t = 'Fiche d’origine — chaque changement part dans un brouillon, rien ne change pour les moniteurs avant « 💾 Publier »';
  e.innerHTML = t;
}

/* La vraie fiche, avec la forme du brouillon */
function dessinerFicheDuMoniteur(){
  const zone = document.getElementById('fiZone');
  if(!zone || !fiS) return;
  const cadre = document.getElementById('fiCadre');
  const haut = cadre ? cadre.scrollTop : 0;
  const modele = MODELES[fiS.modele];
  let champs = champsAvecForme(champsDeBaseFiche(fiS.modele), fiS.forme);
  if(!fiS.essai){
    /* En réglage, une zone masquée se voit encore (en pâle) : sinon
       on ne pourrait plus la retrouver pour la remettre. */
    champs = champs.map(c => { if(c.cacheFiche){ const x = Object.assign({}, c); delete x.cacheFiche; x.__masquee = true; return x; } return c; });
  }
  window.essaiFicheEnCours = true;
  champsManuels = {};
  prefixeExamenBlanc = (modele.schema === 'rvp') ? 'examenBlanc.' : '';
  cleNiveauCourante = prefixeExamenBlanc + 'niveau';
  if(typeof dossierManuel !== 'undefined') dossierManuel = { manoeuvres: [], frise: '' };
  zone.innerHTML = '';
  try{
    dessinerChampsManuels(champs, zone, modele, { manoeuvres: [], frise: '' });
  }catch(e){
    zone.innerHTML = '<div class="empty">La fiche n’a pas pu se dessiner : ' + echFiche(e.message) + '</div>';
  }
  zone.classList.toggle('fiEdition', !fiS.essai);
  if(fiS.essai){
    if(typeof majChampsSelonExamenBlanc === 'function') try{ majChampsSelonExamenBlanc(); }catch(e){}
    if(typeof majChampsSelonNiveau === 'function') try{ majChampsSelonNiveau(); }catch(e){}
  }else{
    champs.forEach(c => {
      const b = zone.querySelector('[data-zone="' + CSS.escape(c.cle) + '"]');
      if(!b) return;
      if(c.__masquee) b.classList.add('fiMasquee');
      if(c.siNiveau) b.classList.add('fiSelon');
      if(zoneVerrouilleeFiche(champsDeBaseFiche(fiS.modele).find(x => x.cle === c.cle))) b.classList.add('fiZoneVerrou');
    });
  }
  marquerChoixFiche();
  if(cadre) cadre.scrollTop = haut;
}
function marquerChoixFiche(){
  const zone = document.getElementById('fiZone');
  if(!zone) return;
  zone.querySelectorAll('.fiChoisie').forEach(x => x.classList.remove('fiChoisie'));
  if(!fiS.choix) return;
  const b = zone.querySelector('[data-zone="' + CSS.escape(fiS.choix) + '"]');
  if(b){
    b.classList.add('fiChoisie');
    b.dataset.etiquette = (zoneVerrouilleeFiche(champCourantFiche(fiS.choix)) ? '🔒 ' : '✏️ ') + nomCourtFiche(champCourantFiche(fiS.choix));
  }
}
function champCourantFiche(cle){
  return champsAvecForme(champsDeBaseFiche(fiS.modele), fiS.forme).find(c => c.cle === cle) || null;
}
function nomCourtFiche(c){
  return String((c && c.nom) || (c && c.cle) || '').replace(/\s+/g, ' ').trim().slice(0, 60);
}
function zoneAUnMicroFiche(cle){
  const b = document.querySelector('#fiZone [data-zone="' + CSS.escape(cle) + '"]');
  return !!(b && Array.prototype.some.call(b.querySelectorAll('button'), estBoutonMicro));
}
function reglageZoneFiche(cle){
  fiS.forme.zones[cle] = fiS.forme.zones[cle] || {};
  return fiS.forme.zones[cle];
}

/* ============================================================
   LE PANNEAU : la zone choisie, puis la liste des zones
   ============================================================ */
function dessinerPanneauFiche(){
  const z = document.getElementById('fiStudio');
  if(!z || !fiS) return;
  const tel = telFiche();
  const panneau = z.querySelector('#fiPanneau'), feuille = z.querySelector('#fiFeuille');
  panneau.innerHTML = ''; feuille.innerHTML = '';
  if(fiS.essai){
    feuille.style.display = 'none';
    panneau.appendChild(Object.assign(document.createElement('div'), { className: 'stBloc',
      innerHTML: '<h4>👁️ Essai</h4><div class="stPetit">Remplis la fiche comme un moniteur : coche, écris, appuie sur les boutons. Rien n’est enregistré, rien ne part. « ✏️ Revenir aux réglages » pour continuer.</div>' }));
    return;
  }
  const blocs = [];
  if(fiS.choix) blocs.push(blocZoneFiche(fiS.choix));
  else if(!tel) blocs.push(Object.assign(document.createElement('div'), { className: 'stBloc',
    innerHTML: '<h4>✏️ Régler la fiche</h4><div class="stPetit">Touche une zone de la fiche pour changer son titre, son fond, ses cases à cocher ou son micro. ' +
      'Chaque changement part dans un <b>brouillon</b> : les moniteurs ne voient rien avant « 💾 Publier ».</div>' }));
  if(!tel || fiS.feuille === 'zones') blocs.push(blocListeZonesFiche());
  if(tel){
    feuille.style.display = (fiS.feuille && blocs.length) ? 'block' : 'none';
    if(fiS.feuille){
      feuille.innerHTML = '<div class="poignee"></div><button type="button" class="stFermerFeuille" data-fa="fermerFeuille">✕</button>';
      blocs.forEach(b => feuille.appendChild(b));
    }
  }else{
    feuille.style.display = 'none';
    blocs.forEach(b => panneau.appendChild(b));
  }
}

function pastillesFondFiche(actuel){
  const a = String(actuel || '').toUpperCase();
  return '<div class="stCouleurs">' +
    '<button type="button" class="mepAuto' + (!a ? ' on' : '') + '" data-fond="" title="Sans fond">∅</button>' +
    Object.keys(FONDS_FICHE).map(c => '<button type="button" class="' + (a === c || (a === 'ARDOISE' && c === '#E8EDF3') ? 'on' : '') +
      '" data-fond="' + c + '" style="background:' + c + '" title="' + FONDS_FICHE[c].nom + '"></button>').join('') +
    '<label class="stAutreCouleur" title="N’importe quelle couleur">🎨<input type="color" value="' +
      (/^#[0-9A-F]{6}$/.test(a) ? a.toLowerCase() : '#ffffff') + '"></label></div>' +
    '<div class="stPetit" style="margin:-2px 0 6px;">Violet · Ardoise · Citron · Bleu · Rose · Sable · Orange · Vert</div>';
}

function blocZoneFiche(cle){
  const base = champsDeBaseFiche(fiS.modele).find(c => c.cle === cle);
  const c = champCourantFiche(cle);
  const z = document.createElement('div');
  z.className = 'stBloc';
  if(!base || !c){ z.innerHTML = '<div class="stPetit">Zone introuvable.</div>'; return z; }
  const r = fiS.forme.zones[cle] || {};
  const verrou = zoneVerrouilleeFiche(base);
  const texte = c.type === 'texte' || c.type === 'court';
  const avecAide = texte || c.type === 'titre' || c.type === 'sousTitre';
  const micro = zoneAUnMicroFiche(cle);
  const fond = c.fond || '';
  const cases = Array.isArray(c.cases) ? c.cases : [];
  z.innerHTML = '<h4>' + (verrou ? '🔒 ' : '✏️ ') + echFiche(nomCourtFiche(c)) + '</h4>' +
    (verrou ? '<div class="fiVerrouNote">🔒 <b>Une zone qui calcule</b> : elle nourrit le bilan, le suivi ou les listes. Tu peux la <b>renommer</b>, la <b>déplacer</b>, lui donner un <b>fond</b> et retirer son <b>micro</b> — pas la masquer.</div>' : '') +
    '<label for="fiNom">Le titre sur la fiche</label><input type="text" id="fiNom" maxlength="120">' +
    (avecAide ? '<label for="fiAide">La petite aide dessous</label><input type="text" id="fiAide" maxlength="240" placeholder="(aucune)">' : '') +
    (micro ? '<label class="stCocheL"><input type="checkbox" id="fiMicro"' + (r.micro === 0 ? '' : ' checked') + '> 🎙️ Le micro au bout de la ligne</label>' : '') +
    '<label>Le fond de la zone</label>' + pastillesFondFiche(fond) +
    (fond ? '<div class="stChips fiIntens">' + [['leger', 'Léger'], ['franc', 'Franc'], ['fort', 'Très visible']].map(([k, t]) =>
      '<button type="button" class="btn ' + ((c.intensite || 'franc') === k ? 'btn-primary' : 'btn-secondary') + '" data-intens="' + k + '">' + t + '</button>').join('') + '</div>' +
      '<div class="stPetit" style="margin:4px 0 6px;">Deux zones qui se suivent avec le même fond et la même force sont encadrées ensemble.</div>' : '') +
    (texte ? '<label>☑ Les cases à cocher</label><div class="fiCases"></div>' +
      (cases.length < 8 ? '<button type="button" class="btn btn-secondary fiPetitBtn" id="fiCaseAjout">➕ Ajouter une case</button>' : '') : '') +
    (!verrou ? '<label class="stCocheL" style="margin-top:10px;"><input type="checkbox" id="fiAffiche"' + (r.cache ? '' : ' checked') + '> 👁️ À l’écran</label>' : '') +
    '<div class="stChips" style="margin-top:10px;"><button type="button" class="btn btn-secondary" id="fiZoneAvant">↺ Cette zone comme avant</button></div>';

  const nom = z.querySelector('#fiNom');
  nom.value = c.nom || '';
  let premier = true;
  nom.addEventListener('input', () => {
    const v = nom.value;
    reglageZoneFiche(cle).nom = (v.trim() === String(base.nom || '').trim()) ? undefined : v;
    if(reglageZoneFiche(cle).nom === undefined) delete reglageZoneFiche(cle).nom;
    clearTimeout(fiS.minuteur); fiS.minuteur = setTimeout(() => enregistrerBrouillonFiche(), 1000);
    dessinerEtatFiche('…');
    clearTimeout(fiS.redessin); fiS.redessin = setTimeout(() => { fiS.forme = nettoyerFormeFiche(fiS.forme, champsDeBaseFiche(fiS.modele)); dessinerFicheDuMoniteur(); }, 350);
    premier = false;
  });
  const aide = z.querySelector('#fiAide');
  if(aide){
    aide.value = c.aide || '';
    aide.addEventListener('input', () => {
      const v = aide.value;
      if(v === String(base.aide || '')) delete reglageZoneFiche(cle).aide; else reglageZoneFiche(cle).aide = v;
      clearTimeout(fiS.minuteur); fiS.minuteur = setTimeout(() => enregistrerBrouillonFiche(), 1000);
      dessinerEtatFiche('…');
      clearTimeout(fiS.redessin); fiS.redessin = setTimeout(() => { fiS.forme = nettoyerFormeFiche(fiS.forme, champsDeBaseFiche(fiS.modele)); dessinerFicheDuMoniteur(); }, 350);
    });
  }
  const mi = z.querySelector('#fiMicro');
  if(mi) mi.addEventListener('change', () => changerFiche(() => { if(mi.checked) delete reglageZoneFiche(cle).micro; else reglageZoneFiche(cle).micro = 0; }));
  z.querySelectorAll('[data-fond]').forEach(b => b.addEventListener('click', () => changerFiche(() => {
    const v = b.dataset.fond;
    const reg = reglageZoneFiche(cle);
    if(!v && !base.fond){ delete reg.fond; delete reg.intensite; return; }
    reg.fond = v;
    if(v && !reg.intensite) reg.intensite = 'franc';
  })));
  const ci = z.querySelector('.stAutreCouleur input');
  if(ci) ci.addEventListener('change', () => changerFiche(() => { const reg = reglageZoneFiche(cle); reg.fond = ci.value.toUpperCase(); if(!reg.intensite) reg.intensite = 'franc'; }));
  z.querySelectorAll('[data-intens]').forEach(b => b.addEventListener('click', () => changerFiche(() => { reglageZoneFiche(cle).intensite = b.dataset.intens; })));
  const af = z.querySelector('#fiAffiche');
  if(af) af.addEventListener('change', () => changerFiche(() => { if(af.checked) delete reglageZoneFiche(cle).cache; else reglageZoneFiche(cle).cache = 1; }));
  z.querySelector('#fiZoneAvant').addEventListener('click', () => changerFiche(() => { delete fiS.forme.zones[cle]; }));

  /* les cases */
  const gc = z.querySelector('.fiCases');
  if(gc){
    if(!cases.length) gc.innerHTML = '<div class="stPetit" style="margin:0 0 6px;">Aucune case : « ➕ Ajouter une case » pose une phrase toute prête d’un appui.</div>';
    cases.forEach((cs, i) => {
      const l = document.createElement('div');
      l.className = 'fiCase';
      l.innerHTML = '<div class="q"><b>☑ ' + echFiche(cs.libelle || cs.phrase.slice(0, 50) + (cs.phrase.length > 50 ? '…' : '')) + '</b>' +
        (cs.libelle ? '<small>« ' + echFiche(cs.phrase) + ' »</small>' : '') +
        '<small>' + (cs.ou === 'fin' ? '⬇️ à la fin du cadre' : '⬆️ en tête du cadre') + (cs.office ? ' · cochée d’office' : '') + '</small></div>' +
        (i > 0 ? '<button type="button" class="btn btn-secondary" data-cs="haut" title="Monter">↑</button>' : '') +
        '<button type="button" class="btn btn-secondary" data-cs="modifier" title="Modifier">✏️</button>' +
        '<button type="button" class="btn btn-secondary" data-cs="retirer" title="Retirer">✕</button>';
      const toutes = () => (reglageZoneFiche(cle).cases = cases.map(x => Object.assign({}, x)));
      l.querySelector('[data-cs="modifier"]').addEventListener('click', () => ouvrirCaseFiche(cle, i));
      l.querySelector('[data-cs="retirer"]').addEventListener('click', async () => {
        if(!await confirmer('Retirer la case « ' + (cs.libelle || cs.phrase.slice(0, 60)) + ' » ?')) return;
        changerFiche(() => { const l2 = toutes(); l2.splice(i, 1); });
      });
      const h = l.querySelector('[data-cs="haut"]');
      if(h) h.addEventListener('click', () => changerFiche(() => { const l2 = toutes(); const t = l2[i - 1]; l2[i - 1] = l2[i]; l2[i] = t; }));
      gc.appendChild(l);
    });
  }
  const ca = z.querySelector('#fiCaseAjout');
  if(ca) ca.addEventListener('click', () => ouvrirCaseFiche(cle, -1));
  return z;
}

/* Une case à cocher, en grand */
function ouvrirCaseFiche(cle, i){
  const c = champCourantFiche(cle);
  const cases = (c && Array.isArray(c.cases)) ? c.cases : [];
  const cs = i >= 0 ? cases[i] : { libelle: '', phrase: '', ou: 'debut', office: 0 };
  const fond = document.createElement('div');
  fond.className = 'overlay show fiModal';
  fond.innerHTML = '<div class="modal">' +
    '<h3>☑ ' + (i >= 0 ? 'Une case à cocher' : 'Nouvelle case à cocher') + '</h3>' +
    '<label for="fiCsLib">Ce que voit le moniteur à côté de la case (court)</label>' +
    '<input type="text" id="fiCsLib" maxlength="80" placeholder="(vide : la phrase entière s’affiche)">' +
    '<label for="fiCsPhrase">La phrase qui s’écrit dans le cadre quand il coche</label>' +
    '<textarea id="fiCsPhrase" rows="4" maxlength="500" class="fiTexte"></textarea>' +
    '<label>Où elle s’écrit</label><div class="stChips"><button type="button" class="btn" data-ou="debut">⬆️ En tête du cadre</button><button type="button" class="btn" data-ou="fin">⬇️ À la fin</button></div>' +
    '<label class="stCocheL" style="margin-top:8px;"><input type="checkbox" id="fiCsOffice"> Cochée d’office à l’ouverture de la fiche</label>' +
    '<div class="stPetit" style="margin:8px 0 12px;">Décochée, la phrase repart du cadre, sans toucher à ce que le moniteur a écrit autour.</div>' +
    '<div style="display:flex;gap:8px;"><button type="button" class="btn btn-primary" id="fiCsOk">💾 Garder</button><button type="button" class="btn btn-secondary" id="fiCsNon">Annuler</button></div></div>';
  fond.querySelector('.modal').style.setProperty('max-width', '520px', 'important');
  document.body.appendChild(fond);
  const lib = fond.querySelector('#fiCsLib'), ph = fond.querySelector('#fiCsPhrase'), of = fond.querySelector('#fiCsOffice');
  lib.value = cs.libelle || ''; ph.value = cs.phrase || ''; of.checked = !!cs.office;
  let ou = cs.ou === 'fin' ? 'fin' : 'debut';
  const peindre = () => fond.querySelectorAll('[data-ou]').forEach(b => { b.className = 'btn ' + (b.dataset.ou === ou ? 'btn-primary' : 'btn-secondary'); });
  peindre();
  fond.querySelectorAll('[data-ou]').forEach(b => b.addEventListener('click', () => { ou = b.dataset.ou; peindre(); }));
  const fermer = () => fond.remove();
  fond.querySelector('#fiCsNon').addEventListener('click', fermer);
  fond.querySelector('#fiCsOk').addEventListener('click', () => {
    const phrase = ph.value.trim();
    if(!phrase){ showToast('Écris la phrase qui part dans le cadre.'); return; }
    changerFiche(() => {
      const l = (reglageZoneFiche(cle).cases = cases.map(x => Object.assign({}, x)));
      const n = { libelle: lib.value.trim(), phrase: phrase, ou: ou, office: of.checked ? 1 : 0 };
      if(i >= 0) l[i] = n; else l.push(n);
    });
    fermer();
  });
  setTimeout(() => (i >= 0 ? lib : ph).focus(), 50);
}

/* La liste des zones : ordre, masquées, d'un coup d'œil */
function blocListeZonesFiche(){
  const z = document.createElement('div');
  z.className = 'stBloc';
  const base = champsDeBaseFiche(fiS.modele);
  const liste = champsAvecForme(base, fiS.forme);
  z.innerHTML = '<h4>🧩 Les zones de la fiche</h4><div class="stPetit" style="margin-bottom:6px;">↑ ↓ pour changer l’ordre, 👁️ pour masquer. Touche un nom pour la régler.</div><div class="fiZones"></div>' +
    '<div class="stChips" style="margin-top:8px;"><button type="button" class="btn btn-secondary" id="fiOrdreAvant">↺ L’ordre d’origine</button></div>';
  const g = z.querySelector('.fiZones');
  liste.forEach((c, i) => {
    const b = base.find(x => x.cle === c.cle);
    const verrou = zoneVerrouilleeFiche(b);
    const r = fiS.forme.zones[c.cle] || {};
    const d = document.createElement('div');
    d.className = (c.cle === fiS.choix ? 'on' : '') + (r.cache ? ' masquee' : '');
    const coul = c.fond ? (c.fond === 'ardoise' ? '#E8EDF3' : c.fond) : '';
    const signes = (c.type === 'titre' ? '📌' : c.type === 'sousTitre' ? '🔖' : c.type === 'ok' ? '✅❌' : (c.type === 'texte' || c.type === 'court') ? '✍️' : '') +
      ((c.cases || []).length ? ' ☑' + c.cases.length : '') + (r.micro === 0 ? ' 🔇' : '') + (verrou ? ' 🔒' : '');
    d.innerHTML = '<span class="pastille" style="background:' + (coul || 'transparent') + ';' + (coul ? '' : 'border-style:dashed;') + '"></span>' +
      '<button type="button" class="n" data-zc="choisir">' + echFiche(nomCourtFiche(c)) + '</button><span class="s">' + signes + '</span>' +
      '<button type="button" class="btn btn-secondary" data-zc="haut" title="Monter"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
      '<button type="button" class="btn btn-secondary" data-zc="bas" title="Descendre"' + (i === liste.length - 1 ? ' disabled' : '') + '>↓</button>' +
      (verrou ? '<span class="oeil" title="Zone qui calcule : toujours à l’écran">🔒</span>'
              : '<button type="button" class="btn btn-secondary oeil" data-zc="oeil" title="' + (r.cache ? 'Masquée — appuie pour la remettre' : 'À l’écran — appuie pour la masquer') + '">' + (r.cache ? '🙈' : '👁️') + '</button>');
    d.querySelector('[data-zc="choisir"]').addEventListener('click', () => {
      fiS.choix = c.cle; fiS.feuille = telFiche() ? 'zone' : '';
      marquerChoixFiche(); dessinerPanneauFiche();
      const bl = document.querySelector('#fiZone [data-zone="' + CSS.escape(c.cle) + '"]');
      if(bl) bl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    const deplacer = sens => changerFiche(() => {
      const ordre = liste.map(x => x.cle);
      const j = i + sens;
      if(j < 0 || j >= ordre.length) return;
      const t = ordre[j]; ordre[j] = ordre[i]; ordre[i] = t;
      fiS.forme.ordre = ordre;
    });
    d.querySelector('[data-zc="haut"]').addEventListener('click', () => deplacer(-1));
    d.querySelector('[data-zc="bas"]').addEventListener('click', () => deplacer(1));
    const oe = d.querySelector('[data-zc="oeil"]');
    if(oe) oe.addEventListener('click', () => changerFiche(() => { if(r.cache) delete reglageZoneFiche(c.cle).cache; else reglageZoneFiche(c.cle).cache = 1; }));
    g.appendChild(d);
  });
  z.querySelector('#fiOrdreAvant').addEventListener('click', () => changerFiche(() => { fiS.forme.ordre = []; }));
  return z;
}

/* ⧉ Copier vers… — en brouillon, sur les modèles choisis */
function ouvrirCopieFiche(){
  const autres = modelesDesFiches().filter(m => m.cle !== fiS.modele);
  const moi = MODELES[fiS.modele];
  autres.sort((a, b) => ((b.schema === moi.schema) - (a.schema === moi.schema)) || a.label.localeCompare(b.label, 'fr'));
  const fond = document.createElement('div');
  fond.className = 'overlay show fiModal';
  fond.innerHTML = '<div class="modal"><h3>⧉ Copier « ' + echFiche(moi.label) + ' » vers…</h3>' +
    '<div class="stPetit" style="margin-bottom:8px;">Les réglages partent en <b>brouillon</b> sur les modèles cochés : seules les zones qu’ils ont aussi sont reprises. Ouvre-les ensuite pour vérifier et publier.</div>' +
    '<div class="fiCopie">' + autres.map(m => '<label class="stCocheL"><input type="checkbox" value="' + echFiche(m.cle) + '"' + (m.schema === moi.schema ? ' checked' : '') + '> ' + echFiche(m.label) +
      (m.schema === moi.schema ? ' <span class="stPetit">· mêmes zones</span>' : '') + '</label>').join('') + '</div>' +
    '<div style="display:flex;gap:8px;margin-top:12px;"><button type="button" class="btn btn-primary" id="fiCopOk">⧉ Copier</button><button type="button" class="btn btn-secondary" id="fiCopNon">Annuler</button></div></div>';
  fond.querySelector('.modal').style.setProperty('max-width', '520px', 'important');
  document.body.appendChild(fond);
  fond.querySelector('#fiCopNon').addEventListener('click', () => fond.remove());
  fond.querySelector('#fiCopOk').addEventListener('click', async () => {
    const cibles = [...fond.querySelectorAll('.fiCopie input:checked')].map(x => x.value);
    if(!cibles.length){ showToast('Coche au moins un modèle.'); return; }
    const b = fond.querySelector('#fiCopOk');
    b.disabled = true;
    try{
      await enregistrerBrouillonFiche(true);
      let r = null, reprises = 0;
      for(const k of cibles){
        const f = nettoyerFormeFiche(fiS.forme, champsDeBaseFiche(k));
        reprises += Object.keys(f.zones).length;
        r = await appelPrep({ action: 'ficheManuellePoser', modele: k, forme: JSON.stringify(f), publier: '0' });
      }
      if(r) majFichesDepuis(r);
      fond.remove();
      showToast('Copié en brouillon sur ' + cibles.length + ' modèle(s) ✅');
      const sel = document.getElementById('fiModele');
      if(sel) [...sel.options].forEach(o => { if(cibles.indexOf(o.value) !== -1 && !/· brouillon$/.test(o.textContent)) o.textContent = o.textContent.replace(/ · réglée$/, '') + ' · brouillon'; });
    }catch(e){ b.disabled = false; showToast('Impossible : ' + e.message); }
  });
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-fiches.js'] = true;
