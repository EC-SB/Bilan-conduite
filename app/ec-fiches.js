/* Déployé le 24/10/2026 à 10:00 — v1257 */
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
   masquées. Livraison ② (v1207) : « ➕ Ajouter ici » entre deux zones,
   « 🗑️ Retirer » une zone ajoutée, « 📦 Encadrer » plusieurs zones
   d'un même fond. Une zone ajoutée part dans le bilan juste sous la
   zone qui la précède (choix B) — voir placerAjoutsDansLeBilan.
   v1208 : une zone ajoutée peut être « 🔒 Pour nous seulement » — elle
   part dans la note interne, jamais à l'élève (poserPourNousDansLaNote).

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
/* ✍️ v1207 — les zones d'origine ET les zones ajoutées */
function zonesDeBaseFiche(){ return champsDeBaseFiche(fiS.modele).concat(ajoutsDeLaForme(fiS.forme)); }
function baseDeZoneFiche(cle){ return zonesDeBaseFiche().find(c => c.cle === cle) || null; }
function ajoutFiche(cle){ return (fiS.forme.ajouts || []).find(z => z.cle === cle) || null; }
function verrouFiche(cle){ const b = baseDeZoneFiche(cle); return !!b && !b.ajout && zoneVerrouilleeFiche(b); }
function nettoyerFiche(){ fiS.forme = nettoyerFormeFiche(fiS.forme, champsDeBaseFiche(fiS.modele)); }

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
    forme: null, choix: '', cadre: '', encadre: null, format: 'tel', essai: false, feuille: '', minuteur: null, enCours: null,
    /* 🅿️ v1236 — le menu des manœuvres, commun à trois fiches */
    menu: null, minuteurMenu: null,
    sauve: {
      champsManuels: champsManuels, champsDessinesCourants: (typeof champsDessinesCourants !== 'undefined') ? champsDessinesCourants : null,
      dossierManuel: (typeof dossierManuel !== 'undefined') ? dossierManuel : null,
      prefixeExamenBlanc: prefixeExamenBlanc, cleNiveauCourante: cleNiveauCourante
    }
  };
  chargerMenuFiche();
  chargerFormeFiche();
  coquilleFiche();
  dessinerCreateurFiche();
  chargerFlotteFiche();
}
function chargerMenuFiche(){
  const f = fiS.brouillons[CLE_MENU_MANOEUVRES] || fiS.publiees[CLE_MENU_MANOEUVRES];
  fiS.menu = nettoyerMenuManoeuvres(f).liste;
}
/* 🅿️ v1236 — un changement du menu : son brouillon à lui */
function changerMenuFiche(fn){
  if(!fiS.menu.length) fiS.menu = ((typeof BLOC !== 'undefined' && BLOC.ficheListeConduite) || []).slice();
  fn(fiS.menu);
  fiS.menu = nettoyerMenuManoeuvres({ liste: fiS.menu }).liste;
  dessinerFicheDuMoniteur();
  dessinerPanneauFiche();
  clearTimeout(fiS.minuteurMenu);
  fiS.minuteurMenu = setTimeout(() => enregistrerMenuFiche(), 1000);
  dessinerEtatFiche('…');
}
async function enregistrerMenuFiche(maintenant){
  if(!fiS || !fiS.minuteurMenu) return;
  clearTimeout(fiS.minuteurMenu); fiS.minuteurMenu = null;
  try{
    const r = await appelPrep({ action: 'ficheManuellePoser', modele: CLE_MENU_MANOEUVRES, forme: JSON.stringify({ v: 1, liste: fiS.menu }), publier: '0' });
    if(fiS){ majFichesDepuis(r); if(!maintenant) dessinerEtatFiche(); }
  }catch(e){ showToast('Menu des manœuvres non enregistré : ' + e.message); }
}
/* 🚗 les listes « Les voitures » emportent la Flotte du moment */
function voituresDesListesFiche(){
  if(!fiS || !Array.isArray(fiS.flotte) || !fiS.flotte.length) return;
  (fiS.forme.ajouts || []).forEach(a => { if(a.type === 'liste' && a.source === 'voitures') a.items = fiS.flotte.slice(); });
}
function chargerFormeFiche(){
  const b = fiS.brouillons[fiS.modele], p = fiS.publiees[fiS.modele];
  fiS.forme = nettoyerFormeFiche(JSON.parse(JSON.stringify(b || p || formeVideFiche())), champsDeBaseFiche(fiS.modele));
  fiS.choix = ''; fiS.feuille = ''; fiS.cadre = ''; fiS.encadre = null;
}
async function fermerCreateurFiche(){
  if(!fiS || fiS.fermeture) return;
  fiS.fermeture = true;
  await enregistrerBrouillonFiche(true);
  await enregistrerMenuFiche(true);
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
        '<div class="fiConsigne" id="fiConsigne" style="display:none;"></div>' +
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
    /* ✍️ v1207 — « ➕ Ajouter ici » */
    const ici = ev.target.closest('[data-ici]');
    if(ici){ ev.preventDefault(); ouvrirAjoutFiche(ici.dataset.ici); return; }
    const b = ev.target.closest('[data-zone]');
    if(!b) return;
    ev.preventDefault();
    /* ✍️ v1207 — « 📦 Encadrer » : la première zone, puis la dernière */
    if(fiS.encadre){ choisirPourEncadrerFiche(b.dataset.zone); return; }
    fiS.choix = b.dataset.zone; fiS.cadre = '';
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
  if(a === 'fermerFeuille'){ fiS.feuille = ''; if(telFiche()){ fiS.choix = ''; fiS.cadre = ''; } marquerChoixFiche(); dessinerPanneauFiche(); return; }
  if(a === 'encadrer'){ commencerEncadrerFiche(fiS.choix || ''); return; }
  if(a === 'encadrerNon'){ fiS.encadre = null; dessinerConsigneFiche(); return; }
  if(a === 'essai'){
    fiS.essai = !fiS.essai;
    fiS.choix = ''; fiS.feuille = ''; fiS.cadre = ''; fiS.encadre = null;
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
      voituresDesListesFiche();
      let r = await appelPrep({ action: 'ficheManuellePoser', modele: fiS.modele, forme: JSON.stringify(fiS.forme), publier: '1' });
      majFichesDepuis(r);
      /* 🅿️ v1236 — le menu des manœuvres en brouillon part avec */
      await enregistrerMenuFiche(true);
      if(fiS.brouillons[CLE_MENU_MANOEUVRES]){
        r = await appelPrep({ action: 'ficheManuellePoser', modele: CLE_MENU_MANOEUVRES, forme: JSON.stringify({ v: 1, liste: fiS.menu }), publier: '1' });
        majFichesDepuis(r);
      }
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
  nettoyerFiche();
  if(fiS.choix && !baseDeZoneFiche(fiS.choix)) fiS.choix = '';
  if(fiS.cadre && !(fiS.forme.cadres || []).some(c => c.id === fiS.cadre)) fiS.cadre = '';
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
    '<button type="button" class="btn btn-secondary" data-fa="encadrer">📦 Encadrer</button>' +
    '<button type="button" class="btn btn-secondary" data-fa="copier">⧉ Copier vers…</button>' +
    '<button type="button" class="btn btn-secondary" data-fa="avant">↺ Comme avant</button>';
  const bz = bas.querySelector('#fiZonesTel');
  if(bz) bz.addEventListener('click', () => { fiS.feuille = 'zones'; fiS.choix = ''; fiS.cadre = ''; marquerChoixFiche(); dessinerPanneauFiche(); });
  dessinerEtatFiche();
  dessinerConsigneFiche();
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
  if(!enCours && fiS.brouillons[CLE_MENU_MANOEUVRES]) t += ' · 🅿️ <b>menu des manœuvres</b> : brouillon pas encore publié';
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
      if(c.ajout) b.classList.add('fiAjoutee');
      if(verrouFiche(c.cle)) b.classList.add('fiZoneVerrou');
      /* ▾ v1236 — une zone qu'un choix de liste fait apparaître */
      if(Array.isArray(c.siListe) && c.siListe.length){
        const s = document.createElement('div');
        s.className = 'fiBadgeListe';
        s.textContent = '👁️ apparaît avec ' + c.siListe.map(x => '« ' + x.v + ' »').join(' ou ');
        b.appendChild(s);
      }
    });
    /* ✍️ v1207 — « ➕ Ajouter ici » : avant la première zone, puis
       sous chacune. Posés APRÈS le dessin : la fiche elle-même ne
       change pas d'un pouce. */
    const blocs = Array.prototype.filter.call(zone.querySelectorAll('[data-zone]'), b => !b.parentElement.closest('[data-zone]'));
    if(blocs.length){
      const premier = blocs[0].parentElement.classList.contains('cadreFond') ? blocs[0].parentElement : blocs[0];
      premier.parentElement.insertBefore(ligneAjoutFiche(''), premier);
    }
    blocs.forEach(b => b.after(ligneAjoutFiche(b.dataset.zone)));
    zone.querySelectorAll('.cadreFond[data-cadre]').forEach(cd => cd.classList.add('fiCadreEncadre'));
  }
  marquerChoixFiche();
  if(cadre) cadre.scrollTop = haut;
}
function marquerChoixFiche(){
  const zone = document.getElementById('fiZone');
  if(!zone) return;
  zone.querySelectorAll('.fiChoisie').forEach(x => x.classList.remove('fiChoisie'));
  zone.querySelectorAll('.fiIci.apresChoix').forEach(x => x.classList.remove('apresChoix'));
  if(fiS.cadre){
    const cd = zone.querySelector('.cadreFond[data-cadre="' + CSS.escape(fiS.cadre) + '"]');
    if(cd) cd.classList.add('fiChoisie');
  }
  if(fiS.encadre && fiS.encadre.de){
    const d = zone.querySelector('[data-zone="' + CSS.escape(fiS.encadre.de) + '"]');
    if(d){ d.classList.add('fiChoisie'); d.dataset.etiquette = '📦 Début du cadre'; }
    return;
  }
  if(!fiS.choix) return;
  const b = zone.querySelector('[data-zone="' + CSS.escape(fiS.choix) + '"]');
  if(b){
    b.classList.add('fiChoisie');
    const c = champCourantFiche(fiS.choix);
    b.dataset.etiquette = (verrouFiche(fiS.choix) ? '🔒 ' : (c && c.ajout ? '➕ ' : '✏️ ')) + nomCourtFiche(c);
    const ici = b.nextElementSibling;
    if(ici && ici.classList.contains('fiIci')) ici.classList.add('apresChoix');
  }
}
function ligneAjoutFiche(apres){
  const d = document.createElement('div');
  d.className = 'fiIci';
  d.dataset.ici = apres;
  d.innerHTML = '<button type="button" title="Ajouter une zone ici">➕<span> Ajouter ici</span></button>';
  return d;
}
function champCourantFiche(cle){
  return champsAvecForme(champsDeBaseFiche(fiS.modele), fiS.forme).find(c => c.cle === cle) || null;
}
function nomCourtFiche(c){
  const n = String((c && c.nom) || '').replace(/\s+/g, ' ').trim();
  if(n) return n.slice(0, 60);
  if(c && c.ajout) return '(' + ((TYPES_AJOUT_FICHE[c.type] || {}).nom || 'zone ajoutée') + ' sans titre)';
  return String((c && c.cle) || '').slice(0, 60);
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
    const essai = Object.assign(document.createElement('div'), { className: 'stBloc',
      innerHTML: '<h4>👁️ Essai</h4><div class="stPetit">Remplis la fiche comme un moniteur : coche, écris, appuie sur les boutons. Rien n’est enregistré, rien ne part. « ✏️ Revenir aux réglages » pour continuer.</div>' +
        /* 🚗 v1211 — la voiture du cours, pour voir ce qui lui est réservé */
        '<label for="fiVoitureEssai">🚗 Essayer avec la voiture</label><select id="fiVoitureEssai"></select>' +
        '<div class="stPetit">Les cases et les zones réservées à certaines voitures n’apparaissent que sur la bonne.</div>' });
    const sv = essai.querySelector('#fiVoitureEssai');
    const vides = document.createElement('option');
    vides.value = ''; vides.textContent = '— voiture inconnue —';
    sv.appendChild(vides);
    (fiS.flotte || []).forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; sv.appendChild(o); });
    sv.value = fiS.voitureEssai || '';
    sv.addEventListener('change', () => {
      fiS.voitureEssai = sv.value;
      if(typeof majCasesSelonVoiture === 'function') majCasesSelonVoiture(document.getElementById('fiZone'));
    });
    panneau.appendChild(essai);
    return;
  }
  const blocs = [];
  if(fiS.cadre) blocs.push(blocCadreFiche(fiS.cadre));
  else if(fiS.choix) blocs.push(blocZoneFiche(fiS.choix));
  else if(!tel) blocs.push(Object.assign(document.createElement('div'), { className: 'stBloc',
    innerHTML: '<h4>✏️ Régler la fiche</h4><div class="stPetit">Touche une zone de la fiche pour changer son titre, son fond, ses cases à cocher ou son micro. ' +
      '« ➕ » entre deux zones pour en <b>ajouter</b> une. ' +
      'Chaque changement part dans un <b>brouillon</b> : les moniteurs ne voient rien avant « 💾 Publier ».</div>' +
      '<div class="stChips" style="margin-top:8px;"><button type="button" class="btn btn-secondary" data-fa="encadrer">📦 Encadrer plusieurs zones</button></div>' }));
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
  const base = baseDeZoneFiche(cle);
  const c = champCourantFiche(cle);
  const z = document.createElement('div');
  z.className = 'stBloc';
  if(!base || !c){ z.innerHTML = '<div class="stPetit">Zone introuvable.</div>'; return z; }
  const r = fiS.forme.zones[cle] || {};
  const ajout = !!base.ajout;
  const aj = ajout ? ajoutFiche(cle) : null;
  const verrou = verrouFiche(cle);
  const texte = c.type === 'texte' || c.type === 'court';
  const avecCases = texte || c.type === 'cases';
  const avecAide = avecCases || c.type === 'titre' || c.type === 'sousTitre';
  const micro = zoneAUnMicroFiche(cle);
  const fond = c.fond || '';
  const cases = Array.isArray(c.cases) ? c.cases : [];
  const cadre = c.cadre ? (fiS.forme.cadres || []).find(x => x.id === c.cadre) : null;
  /* 🚗 v1211 — une zone (pas une zone qui calcule) peut être réservée
     à certaines voitures */
  const avecVoitures = ajout || !verrou;
  const voituresZone = Array.isArray(c.voitures) ? c.voitures : [];
  z.innerHTML = '<h4>' + (verrou ? '🔒 ' : ajout ? '➕ ' : '✏️ ') + echFiche(nomCourtFiche(c)) + '</h4>' +
    (ajout ? '<div class="fiAjoutNote">➕ <b>Zone ajoutée</b> · ' + echFiche((TYPES_AJOUT_FICHE[c.typeAjout || c.type] || {}).nom || c.type) +
      (c.type === 'titre' || c.type === 'sousTitre' ? '<br>Dans le bilan, elle sort en tête des zones ajoutées remplies qui la suivent.'
       : c.typeAjout === 'remarques' ? '<br>Dans le bilan, ses lignes se rangent <b>sous la ligne du CEPC</b> choisie (☠️ ⚠️), avec leur mention — comme celles de la manœuvre.'
       : c.pourNous ? '<br>🔒 <b>Pour nous seulement</b> : ce que le moniteur y met part dans la <b>note interne</b>, jamais à l’élève.'
                    : '<br>Dans le bilan, ce que le moniteur y met part <b>juste sous la zone du dessus</b>.') + '</div>' +
      (c.type === 'titre' || c.type === 'sousTitre' || c.typeAjout === 'remarques' ? '' :
        '<label class="stCocheL"><input type="checkbox" id="fiPourNous"' + (c.pourNous ? ' checked' : '') + '> 🔒 Pour nous seulement (note interne, jamais à l’élève)</label>') : '') +
    (verrou ? '<div class="fiVerrouNote">🔒 <b>Une zone qui calcule</b> : elle nourrit le bilan, le suivi ou les listes. Tu peux la <b>renommer</b>, la <b>déplacer</b>, lui donner un <b>fond</b> et retirer son <b>micro</b> — pas la masquer.</div>' : '') +
    '<label for="fiNom">Le titre sur la fiche</label><input type="text" id="fiNom" maxlength="120">' +
    (avecAide ? '<label for="fiAide">La petite aide dessous</label><input type="text" id="fiAide" maxlength="240" placeholder="(aucune)">' : '') +
    /* 🅿️ v1236 — le menu des manœuvres ; ▾ une liste ajoutée */
    (c.choixManoeuvre ? '<div id="fiMenu"></div>' : '') +
    (ajout && c.type === 'liste' ? '<div id="fiListe"></div>' : '') +
    /* 🎯 v1238 — des remarques : leur mention, leur nombre de lignes ;
       ➖ une case trois états : les points qu'elle enlève au CEPC */
    (ajout && c.typeAjout === 'remarques' ? '<div id="fiRemarques"></div>' : '') +
    (ajout && c.type === 'ok' && SCHEMAS_CEPC_FICHE.indexOf(MODELES[fiS.modele].schema) !== -1 ? '<div id="fiMoinsCepc"></div>' : '') +
    (ajout && c.type === 'texte' ? '<label>La hauteur du cadre</label><div class="stChips fiIntens">' + [2, 4, 6, 10].map(n =>
      '<button type="button" class="btn ' + ((aj && aj.lignes) === n ? 'btn-primary' : 'btn-secondary') + '" data-lignes="' + n + '">' + n + ' lignes</button>').join('') + '</div>' : '') +
    (micro ? '<label class="stCocheL"><input type="checkbox" id="fiMicro"' + (r.micro === 0 ? '' : ' checked') + '> 🎙️ Le micro au bout de la ligne</label>' : '') +
    '<div id="fiCouleurs"></div>' +
    (cadre
      ? '<label>Le fond de la zone</label><div class="fiAjoutNote">📦 Elle est dans un <b>cadre</b> : son fond est celui du cadre.' +
        '<div class="stChips" style="margin-top:6px;"><button type="button" class="btn btn-secondary" id="fiVoirCadre">📦 Régler le cadre</button></div></div>'
      : '<label>Le fond de la zone</label>' + pastillesFondFiche(fond) +
        (fond ? '<div class="stChips fiIntens">' + [['leger', 'Léger'], ['franc', 'Franc'], ['fort', 'Très visible']].map(([k, t]) =>
          '<button type="button" class="btn ' + ((c.intensite || 'franc') === k ? 'btn-primary' : 'btn-secondary') + '" data-intens="' + k + '">' + t + '</button>').join('') + '</div>' +
          '<div class="stPetit" style="margin:4px 0 6px;">Deux zones qui se suivent avec le même fond et la même force sont encadrées ensemble.</div>' : '') +
        '<div class="stChips" style="margin:2px 0 4px;"><button type="button" class="btn btn-secondary" data-fa="encadrer">📦 Encadrer à partir d’ici…</button></div>') +
    (avecVoitures ? '<label>🚗 Zone seulement avec ces voitures</label><div class="stPetit" style="margin:-2px 0 6px;">' +
      (voituresZone.length ? 'Sur les autres voitures, le moniteur ne la voit pas.' : 'Aucune cochée : elle est là sur toutes les voitures.') +
      '</div><div class="fiVoitures" id="fiVoituresZone"></div>' : '') +
    (avecCases ? '<label>☑ Les cases à cocher</label><div class="fiCases"></div>' +
      (cases.length < 8 ? '<button type="button" class="btn btn-secondary fiPetitBtn" id="fiCaseAjout">➕ Ajouter une case</button>' : '') : '') +
    (!verrou && !ajout ? '<label class="stCocheL" style="margin-top:10px;"><input type="checkbox" id="fiAffiche"' + (r.cache ? '' : ' checked') + '> 👁️ À l’écran</label>' : '') +
    '<div class="stChips" style="margin-top:10px;">' +
      (ajout ? '<button type="button" class="btn btn-secondary fiRetirer" id="fiRetirerZone">🗑️ Retirer cette zone</button>'
             : '<button type="button" class="btn btn-secondary" id="fiZoneAvant">↺ Cette zone comme avant</button>') +
    '</div>';

  const plusTard = () => {
    clearTimeout(fiS.minuteur); fiS.minuteur = setTimeout(() => enregistrerBrouillonFiche(), 1000);
    dessinerEtatFiche('…');
    clearTimeout(fiS.redessin); fiS.redessin = setTimeout(() => { nettoyerFiche(); dessinerFicheDuMoniteur(); }, 350);
  };
  const nom = z.querySelector('#fiNom');
  nom.value = c.nom || '';
  nom.addEventListener('input', () => {
    const v = nom.value;
    if(aj){ aj.nom = v; }
    else{
      reglageZoneFiche(cle).nom = (v.trim() === String(base.nom || '').trim()) ? undefined : v;
      if(reglageZoneFiche(cle).nom === undefined) delete reglageZoneFiche(cle).nom;
    }
    plusTard();
  });
  const aide = z.querySelector('#fiAide');
  if(aide){
    aide.value = c.aide || '';
    aide.addEventListener('input', () => {
      const v = aide.value;
      if(aj){ aj.aide = v; }
      else if(v === String(base.aide || '')) delete reglageZoneFiche(cle).aide; else reglageZoneFiche(cle).aide = v;
      plusTard();
    });
  }
  const pn = z.querySelector('#fiPourNous');
  if(pn) pn.addEventListener('change', () => changerFiche(() => { if(aj){ if(pn.checked) aj.bureau = 1; else delete aj.bureau; } }));
  z.querySelectorAll('[data-lignes]').forEach(b => b.addEventListener('click', () => changerFiche(() => { if(aj) aj.lignes = Number(b.dataset.lignes); })));
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
  const vc = z.querySelector('#fiVoirCadre');
  if(vc) vc.addEventListener('click', () => { fiS.cadre = cadre.id; fiS.choix = ''; if(telFiche()) fiS.feuille = 'zone'; marquerChoixFiche(); dessinerPanneauFiche(); });
  const af = z.querySelector('#fiAffiche');
  if(af) af.addEventListener('change', () => changerFiche(() => { if(af.checked) delete reglageZoneFiche(cle).cache; else reglageZoneFiche(cle).cache = 1; }));
  const fvz = z.querySelector('#fiVoituresZone');
  if(fvz) choixVoituresFiche(fvz, voituresZone, l => changerFiche(() => {
    if(l.length) reglageZoneFiche(cle).voitures = l; else delete reglageZoneFiche(cle).voitures;
  }));
  const za = z.querySelector('#fiZoneAvant');
  if(za) za.addEventListener('click', () => changerFiche(() => { delete fiS.forme.zones[cle]; }));
  const rz = z.querySelector('#fiRetirerZone');
  if(rz) rz.addEventListener('click', async () => {
    if(!await confirmer('Retirer la zone « ' + nomCourtFiche(c) + ' » de la fiche ?\n\nLes moniteurs ne la verront plus après « 💾 Publier ». Une fiche déjà commencée la garde jusqu’à la fin du cours.', 'Retirer')) return;
    changerFiche(() => retirerAjoutFiche(cle));
    if(telFiche()) fiS.feuille = '';
    dessinerPanneauFiche();
  });

  /* les cases */
  const gc = z.querySelector('.fiCases');
  if(gc){
    if(!cases.length) gc.innerHTML = '<div class="stPetit" style="margin:0 0 6px;">Aucune case : « ➕ Ajouter une case » pose une phrase toute prête d’un appui.</div>';
    cases.forEach((cs, i) => {
      const l = document.createElement('div');
      l.className = 'fiCase';
      l.innerHTML = '<div class="q"><b>☑ ' + echFiche(cs.libelle || cs.phrase.slice(0, 50) + (cs.phrase.length > 50 ? '…' : '')) + '</b>' +
        (cs.libelle ? '<small>« ' + echFiche(cs.phrase) + ' »</small>' : '') +
        '<small>' + (c.type === 'cases' ? 'sa phrase part dans le bilan' : (cs.ou === 'fin' ? '⬇️ à la fin du cadre' : '⬆️ en tête du cadre')) + (cs.office ? ' · cochée d’office' : '') + '</small>' +
        (Array.isArray(cs.voitures) && cs.voitures.length ? '<small>🚗 seulement avec : ' + echFiche(libelleVoitures(cs.voitures)) + '</small>' : '') + '</div>' +
        (i > 0 ? '<button type="button" class="btn btn-secondary" data-cs="haut" title="Monter">↑</button>' : '') +
        '<button type="button" class="btn btn-secondary" data-cs="modifier" title="Modifier">✏️</button>' +
        '<button type="button" class="btn btn-secondary" data-cs="retirer" title="Retirer">✕</button>';
      const toutes = () => casesDeLaZoneFiche(cle, cases);
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
  const fm = z.querySelector('#fiMenu');
  if(fm) remplirMenuFiche(fm);
  const fl = z.querySelector('#fiListe');
  if(fl && aj) remplirListeFiche(fl, cle, aj);
  const fr = z.querySelector('#fiRemarques');
  if(fr && aj) remplirRemarquesFiche(fr, aj);
  const fmc = z.querySelector('#fiMoinsCepc');
  if(fmc && aj) remplirMoinsCepcFiche(fmc, aj);
  remplirCouleursFiche(z.querySelector('#fiCouleurs'), cle, c);
  return z;
}

/* ============================================================
   🅿️ v1236 — LE MENU DES MANŒUVRES

   David : « que je puisse changer la liste des manœuvres à la main ».
   Ses choix : seulement ce menu (la fiche des manœuvres de l'élève ne
   bouge pas), et une seule liste pour l'examen blanc, l'examen
   officiel et le RVP.
   ============================================================ */
function remplirMenuFiche(div){
  const liste = listeDuMenuManoeuvres();
  const perso = fiS.menu.length > 0;
  div.innerHTML = '<label>📋 Les choix du menu (' + liste.length + ')</label>' +
    '<div class="stPetit" style="margin:-2px 0 6px;">La <b>même liste</b> pour l’examen blanc, l’examen officiel et le RVP' +
      (perso ? ', réglée à la main' : ' : c’est celle de l’école') + '. La fiche des manœuvres de l’élève ne change pas.</div>' +
    '<div class="fiCases"></div>' +
    '<div class="stChips"><button type="button" class="btn btn-secondary fiPetitBtn" id="fiMenuAjout">➕ Ajouter une manœuvre</button>' +
      (perso ? '<button type="button" class="btn btn-secondary fiPetitBtn" id="fiMenuOrigine">↺ La liste d’origine</button>' : '') + '</div>';
  const g = div.querySelector('.fiCases');
  liste.forEach((m, i) => {
    const l = document.createElement('div');
    l.className = 'fiCase';
    l.innerHTML = '<div class="q"><b></b></div>' +
      (i > 0 ? '<button type="button" class="btn btn-secondary" data-mn="haut" title="Monter">↑</button>' : '') +
      '<button type="button" class="btn btn-secondary" data-mn="modifier" title="Renommer">✏️</button>' +
      '<button type="button" class="btn btn-secondary" data-mn="retirer" title="Retirer">✕</button>';
    l.querySelector('b').textContent = m;
    const h = l.querySelector('[data-mn="haut"]');
    if(h) h.addEventListener('click', () => changerMenuFiche(t => { const x = t[i - 1]; t[i - 1] = t[i]; t[i] = x; }));
    l.querySelector('[data-mn="modifier"]').addEventListener('click', async () => {
      const n = await demander('Le nouveau nom de « ' + m + ' » dans le menu :', m, '✏️ Renommer');
      if(n == null || !String(n).trim()) return;
      changerMenuFiche(t => { t[i] = String(n).trim(); });
    });
    l.querySelector('[data-mn="retirer"]').addEventListener('click', async () => {
      if(liste.length <= 1){ showToast('Le menu garde au moins une manœuvre.'); return; }
      if(!await confirmer('Retirer « ' + m + ' » du menu des manœuvres ?')) return;
      changerMenuFiche(t => { t.splice(i, 1); });
    });
    g.appendChild(l);
  });
  div.querySelector('#fiMenuAjout').addEventListener('click', async () => {
    const n = await demander('La manœuvre à ajouter au menu (à la fin de la liste) :', '', '➕ Ajouter une manœuvre');
    if(n == null || !String(n).trim()) return;
    changerMenuFiche(t => { t.push(String(n).trim()); });
  });
  const o = div.querySelector('#fiMenuOrigine');
  if(o) o.addEventListener('click', async () => {
    if(!await confirmer('Remettre la liste des manœuvres de l’école dans le menu ?')) return;
    fiS.menu = [];
    clearTimeout(fiS.minuteurMenu);
    fiS.minuteurMenu = setTimeout(() => enregistrerMenuFiche(), 300);
    dessinerFicheDuMoniteur(); dessinerPanneauFiche();
  });
}

/* ============================================================
   ▾ v1236 — UNE LISTE DÉROULANTE AJOUTÉE : d'où viennent ses choix,
   et ce que fait chacun (phrase, zones qui apparaissent, manœuvre
   comptée faite, voitures)
   ============================================================ */
function remplirListeFiche(div, cle, aj){
  const source = aj.source || 'main';
  const items = choixDeLaListeFiche(Object.assign({}, aj, { source: source }));
  const zones = champsAvecForme(champsDeBaseFiche(fiS.modele), fiS.forme);
  const nomDe = k => { const x = zones.find(y => y.cle === k); return x ? nomCourtFiche(x) : ''; };
  const notes = {
    main: 'Tu écris les choix toi-même, dans l’ordre que tu veux.',
    manoeuvres: 'Les manœuvres de l’école, tenues à jour toutes seules. Touche ✏️ pour régler ce que fait un choix.',
    voitures: 'Les voitures de la Flotte (sans vendues ni remorques), reprises à chaque « 💾 Publier ».',
    moniteurs: 'Les moniteurs de l’appli, tenus à jour tout seuls.',
    centres: 'Les centres d’examen de l’appli.',
    procedures: 'Les procédures de l’appli, tenues à jour toutes seules.',
    formations: 'Les formations de l’appli.'
  };
  div.innerHTML = '<label>▾ D’où viennent les choix</label><div class="stChips fiIntens">' +
      Object.keys(SOURCES_LISTE_FICHE).map(k => '<button type="button" class="btn ' + (k === source ? 'btn-primary' : 'btn-secondary') + '" data-src="' + k + '">' +
        echFiche(SOURCES_LISTE_FICHE[k]) + '</button>').join('') + '</div>' +
    '<div class="stPetit" style="margin:2px 0 6px;">' + notes[source] + '</div>' +
    '<label>Les choix (' + items.length + ')</label><div class="fiCases"></div>' +
    (source === 'main' ? '<button type="button" class="btn btn-secondary fiPetitBtn" id="fiChoixAjout">➕ Ajouter un choix</button>' : '') +
    (source === 'manoeuvres' && !aj.bureau ? '<div class="stChips" style="margin-top:6px;"><button type="button" class="btn btn-secondary fiPetitBtn" id="fiFaitesToutes">✅ Toutes comptées faites</button>' +
      '<button type="button" class="btn btn-secondary fiPetitBtn" id="fiFaitesAucune">Aucune</button></div>' : '') +
    '<label class="stCocheL" style="margin-top:8px;"><input type="checkbox" id="fiMulti"' + (aj.multi ? ' checked' : '') + '> Plusieurs choix possibles (cases dans la liste)</label>';
  div.querySelectorAll('[data-src]').forEach(b => b.addEventListener('click', () => changerFiche(() => {
    aj.source = b.dataset.src;
    if(aj.source === 'voitures') aj.items = (fiS.flotte || []).slice(); else delete aj.items;
  })));
  const g = div.querySelector('.fiCases');
  if(!items.length){
    g.innerHTML = '<div class="stPetit" style="margin:0 0 6px;">' + (source === 'main' ? 'Aucun choix : « ➕ Ajouter un choix ».' :
      source === 'voitures' && !fiS.flotte ? 'Lecture de la Flotte…' : 'Aucun choix dans cette liste pour l’instant.') + '</div>';
  }
  items.forEach((it, i) => {
    const l = document.createElement('div');
    l.className = 'fiCase';
    const petits = [];
    petits.push(it.phrase ? '« ' + echFiche(it.phrase.length > 90 ? it.phrase.slice(0, 90) + '…' : it.phrase) + ' »' : 'rien dans le bilan');
    if(it.montre && it.montre.length) petits.push('👁️ fait apparaître : ' + echFiche(it.montre.map(nomDe).filter(Boolean).join(' · ')));
    if(it.fait && source === 'manoeuvres') petits.push('✅ comptée faite dans sa fiche des manœuvres');
    if(it.voitures && it.voitures.length) petits.push('🚗 seulement avec : ' + echFiche(libelleVoitures(it.voitures)));
    l.innerHTML = '<div class="q"><b>' + echFiche(it.libelle) + '</b>' + petits.map(x => '<small>' + x + '</small>').join('') + '</div>' +
      (source === 'main' && i > 0 ? '<button type="button" class="btn btn-secondary" data-ch="haut" title="Monter">↑</button>' : '') +
      '<button type="button" class="btn btn-secondary" data-ch="modifier" title="Régler">✏️</button>' +
      (source === 'main' ? '<button type="button" class="btn btn-secondary" data-ch="retirer" title="Retirer">✕</button>' : '');
    const h = l.querySelector('[data-ch="haut"]');
    if(h) h.addEventListener('click', () => changerFiche(() => { const t = aj.choix; const x = t[i - 1]; t[i - 1] = t[i]; t[i] = x; }));
    l.querySelector('[data-ch="modifier"]').addEventListener('click', () => ouvrirChoixListeFiche(cle, it.libelle));
    const rt = l.querySelector('[data-ch="retirer"]');
    if(rt) rt.addEventListener('click', async () => {
      if(!await confirmer('Retirer le choix « ' + it.libelle + ' » ?')) return;
      changerFiche(() => { aj.choix = (aj.choix || []).filter(x => x.libelle !== it.libelle); });
    });
    g.appendChild(l);
  });
  const ad = div.querySelector('#fiChoixAjout');
  if(ad) ad.addEventListener('click', () => ouvrirChoixListeFiche(cle, null));
  const toutes = (oui) => changerFiche(() => {
    const l = (aj.choix || []).slice();
    items.forEach(it => {
      let x = l.find(y => y.libelle === it.libelle);
      if(!x){ x = { libelle: it.libelle }; l.push(x); }
      if(oui) x.fait = 1; else delete x.fait;
    });
    aj.choix = l;
  });
  const ft = div.querySelector('#fiFaitesToutes'), fa = div.querySelector('#fiFaitesAucune');
  if(ft) ft.addEventListener('click', () => toutes(true));
  if(fa) fa.addEventListener('click', () => toutes(false));
  const mu = div.querySelector('#fiMulti');
  mu.addEventListener('change', () => changerFiche(() => { if(mu.checked) aj.multi = 1; else delete aj.multi; }));
}
/* La fenêtre d'un choix (libelle null : un nouveau, dans « Ma liste ») */
function ouvrirChoixListeFiche(cle, libelle){
  const aj = ajoutFiche(cle);
  if(!aj) return;
  const source = aj.source || 'main';
  const items = choixDeLaListeFiche(Object.assign({}, aj, { source: source }));
  const it = libelle == null ? { libelle: '' } : (items.find(x => x.libelle === libelle) || { libelle: libelle });
  const zones = champsAvecForme(champsDeBaseFiche(fiS.modele), fiS.forme)
    .filter(z => z.cle !== cle && (z.ajout || !verrouFiche(z.cle)));
  const peutFaire = source === 'manoeuvres' && !aj.bureau;
  const fond = document.createElement('div');
  fond.className = 'overlay show fiModal';
  fond.innerHTML = '<div class="modal">' +
    '<h3>▾ ' + (libelle == null ? 'Nouveau choix' : 'Un choix de la liste') + '</h3>' +
    '<label for="fiChLib">Ce que voit le moniteur dans la liste</label>' +
    '<input type="text" id="fiChLib" maxlength="80"' + (source !== 'main' ? ' disabled' : '') + '>' +
    '<label for="fiChPhrase">La phrase qui part dans le bilan quand il le choisit</label>' +
    '<textarea id="fiChPhrase" rows="3" maxlength="500" class="fiTexte"></textarea>' +
    '<div class="stPetit" style="margin:2px 0 6px;">Vide : rien ne part dans le bilan, le choix sert seulement à la fiche.</div>' +
    '<label>👁️ Fait apparaître ces zones (cachées tant qu’on ne le choisit pas)</label>' +
    '<div class="fiVoitures" id="fiChZones"></div>' +
    '<label>✅ Dans son dossier</label>' +
    '<div class="stPetit" style="margin:-2px 0 6px;">' + (source === 'manoeuvres'
      ? (aj.bureau ? 'Pas dans une zone « 🔒 Pour nous seulement » : la manœuvre se compte par le bilan de l’élève.' : 'La manœuvre choisie compte comme faite dans sa fiche des manœuvres, avec l’émoji du moniteur.')
      : 'Seulement quand les choix viennent de <b>🅿️ Les manœuvres</b>.') + '</div>' +
    '<label class="stCocheL"' + (peutFaire ? '' : ' style="opacity:.45;"') + '><input type="checkbox" id="fiChFait"' + (peutFaire ? '' : ' disabled') + (it.fait && peutFaire ? ' checked' : '') + '> La compter faite dans sa fiche des manœuvres</label>' +
    '<label>🚗 Seulement avec ces voitures</label><div class="stPetit" style="margin:-2px 0 6px;">Aucune cochée : le choix est là sur toutes les voitures.</div>' +
    '<div class="fiVoitures" id="fiChVoitures"></div>' +
    '<div style="display:flex;gap:8px;margin-top:12px;"><button type="button" class="btn btn-primary" id="fiChOk">💾 Garder</button><button type="button" class="btn btn-secondary" id="fiChNon">Annuler</button></div></div>';
  fond.querySelector('.modal').style.setProperty('max-width', '520px', 'important');
  document.body.appendChild(fond);
  const lib = fond.querySelector('#fiChLib'), ph = fond.querySelector('#fiChPhrase'), fa = fond.querySelector('#fiChFait');
  lib.value = it.libelle || ''; ph.value = it.phrase || '';
  let montre = Array.isArray(it.montre) ? it.montre.slice() : [];
  const gz = fond.querySelector('#fiChZones');
  if(!zones.length) gz.innerHTML = '<div class="stPetit">Aucune autre zone à faire apparaître.</div>';
  zones.forEach(z => {
    const l = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = montre.indexOf(z.cle) !== -1;
    cb.addEventListener('change', () => { montre = montre.filter(k => k !== z.cle); if(cb.checked) montre.push(z.cle); });
    l.appendChild(cb);
    l.appendChild(document.createTextNode(nomCourtFiche(z) + (z.ajout ? ' ➕' : '')));
    gz.appendChild(l);
  });
  let voitures = Array.isArray(it.voitures) ? it.voitures.slice() : [];
  choixVoituresFiche(fond.querySelector('#fiChVoitures'), voitures, l => { voitures = l; });
  fond.querySelector('#fiChNon').addEventListener('click', () => fond.remove());
  fond.querySelector('#fiChOk').addEventListener('click', () => {
    const nom = String(lib.value || '').replace(/\s+/g, ' ').trim();
    if(!nom){ showToast('Écris ce que voit le moniteur dans la liste.'); lib.focus(); return; }
    if(source === 'main' && nom !== it.libelle && (aj.choix || []).some(x => x.libelle === nom)){ showToast('Ce choix est déjà dans la liste.'); return; }
    changerFiche(() => {
      const n = { libelle: nom };
      if(ph.value.trim()) n.phrase = ph.value.trim();
      if(montre.length) n.montre = montre.slice();
      if(fa && fa.checked && peutFaire) n.fait = 1;
      if(voitures.length) n.voitures = voitures.slice();
      const l = (aj.choix || []).slice();
      const i = l.findIndex(x => x.libelle === (libelle == null ? nom : libelle));
      if(i !== -1) l[i] = n; else l.push(n);
      aj.choix = l;
    });
    fond.remove();
  });
  setTimeout(() => { if(!fond.contains(document.activeElement)) (source === 'main' && libelle == null ? lib : ph).focus(); }, 50);
}

/* ============================================================
   🎯 v1238 — DES REMARQUES DE L'INSPECTEUR + EXPLICATIONS, et ➖ LES
   POINTS QU'UNE CASE TROIS ÉTATS ENLÈVE AU CEPC
   ============================================================ */
function remplirRemarquesFiche(div, aj){
  div.innerHTML = '<label for="fiMention">La mention devant chaque ligne dans le bilan</label>' +
    '<input type="text" id="fiMention" maxlength="80" placeholder="Ex. : Arrêt de précision">' +
    '<div class="stPetit" style="margin:2px 0 6px;">Comme « Manœuvre : Créneau · … » : la mention dit dans le bilan où l’erreur est arrivée.</div>' +
    '<label>Les lignes prêtes à l’ouverture</label><div class="stChips fiIntens">' + [1, 2, 3, 5].map(n =>
      '<button type="button" class="btn ' + ((aj.lignes || 2) === n ? 'btn-primary' : 'btn-secondary') + '" data-lr="' + n + '">' + n + '</button>').join('') + '</div>' +
    '<div class="stPetit" style="margin:2px 0 6px;">Le moniteur en ajoute d’autres avec « ➕ Ajouter une ligne ».</div>';
  const m = div.querySelector('#fiMention');
  m.value = aj.mention || '';
  m.addEventListener('input', () => {
    aj.mention = m.value;
    clearTimeout(fiS.minuteur); fiS.minuteur = setTimeout(() => enregistrerBrouillonFiche(), 1000);
    dessinerEtatFiche('…');
    clearTimeout(fiS.redessin); fiS.redessin = setTimeout(() => { nettoyerFiche(); dessinerFicheDuMoniteur(); }, 350);
  });
  div.querySelectorAll('[data-lr]').forEach(b => b.addEventListener('click', () => changerFiche(() => { aj.lignes = Number(b.dataset.lr); })));
}
function remplirMoinsCepcFiche(div, aj){
  const cm = aj.cepcMoins || null;
  div.innerHTML = '<label for="fiMoinsLigne">➖ Un ❌ enlève des points au CEPC</label>' +
    '<select id="fiMoinsLigne"><option value="">— non, elle n’enlève rien —</option>' +
      lignesCepcFiche().map(l => '<option value="' + echFiche(l) + '"' + (cm && cm.ligne === l ? ' selected' : '') + '>' + echFiche(l) + '</option>').join('') + '</select>' +
    (cm ? '<div class="stChips fiIntens" style="margin-top:6px;">' + [1, 2, 3].map(n =>
      '<button type="button" class="btn ' + (cm.points === n ? 'btn-primary' : 'btn-secondary') + '" data-pts="' + n + '">− ' + n + ' point' + (n > 1 ? 's' : '') + '</button>').join('') + '</div>' +
      '<div class="stPetit" style="margin:4px 0 6px;">Même si la ligne était bonne avant : la note retombe d’autant (jamais sous 0), et remonte si la case repasse à ✅ ou —.</div>' : '');
  const sel = div.querySelector('#fiMoinsLigne');
  sel.addEventListener('change', () => changerFiche(() => {
    if(sel.value) aj.cepcMoins = { ligne: sel.value, points: (cm && cm.points) || 1 }; else delete aj.cepcMoins;
  }));
  div.querySelectorAll('[data-pts]').forEach(b => b.addEventListener('click', () => changerFiche(() => {
    if(aj.cepcMoins) aj.cepcMoins.points = Number(b.dataset.pts);
  })));
}

/* ============================================================
   🎨 v1236 — LA COULEUR DES TEXTES D'UNE ZONE
   ============================================================ */
const COULEURS_TEXTE_FICHE = [['#6B3FD8', 'Violet'], ['#1F6FD1', 'Bleu'], ['#1E8A4C', 'Vert'], ['#D9480F', 'Orange'],
                              ['#C92A2A', 'Rouge'], ['#C2255C', 'Rose'], ['#5C6370', 'Gris'], ['#14161B', 'Noir']];
function remplirCouleursFiche(div, cle, c){
  if(!div) return;
  const r = fiS.forme.zones[cle] || {};
  const cc = r.couleurs || {};
  const titre = c.type === 'titre' || c.type === 'sousTitre';
  const rangs = [['t', 'Le titre'], ['a', 'La petite aide']].concat(titre ? [] : [['x', 'Ce que le moniteur écrit']]);
  const pastilles = q => '<div class="stCouleurs" data-q="' + q + '">' +
    '<button type="button" class="mepAuto' + (!cc[q] ? ' on' : '') + '" data-coul="" title="La couleur habituelle">A</button>' +
    COULEURS_TEXTE_FICHE.map(([v, n]) => '<button type="button" class="' + (cc[q] === v ? 'on' : '') + '" data-coul="' + v + '" style="background:' + v + '" title="' + n + '"></button>').join('') +
    '<label class="stAutreCouleur" title="N’importe quelle couleur">🎨<input type="color" value="' + (cc[q] ? cc[q].toLowerCase() : '#1f6fd1') + '"></label></div>';
  div.innerHTML = '<label>🎨 La couleur des textes</label>' +
    '<div class="stPetit" style="margin:-2px 0 6px;">A = la couleur habituelle. En mode sombre, la couleur choisie s’éclaircit toute seule pour rester lisible.</div>' +
    rangs.map(([q, t]) => '<div class="fiRangCouleur">' + t + '</div>' + pastilles(q)).join('') +
    (c.pourNous ? '' : '<label class="stCocheL" style="margin-top:6px;"><input type="checkbox" id="fiCoulBilan"' + (cc.b ? ' checked' : '') + (cc.t || cc.a || cc.x ? '' : ' disabled') +
      '> Aussi dans le bilan (mail et 📖 Mes leçons)</label>');
  const poser = (q, v) => changerFiche(() => {
    const reg = reglageZoneFiche(cle);
    const n = Object.assign({}, reg.couleurs || {});
    const avant = !!(n.t || n.a || n.x);
    if(v) n[q] = v; else delete n[q];
    /* la première couleur : « aussi dans le bilan » coché d'office */
    if(!avant && v) n.b = 1;
    if(n.t || n.a || n.x) reg.couleurs = n; else delete reg.couleurs;
  });
  div.querySelectorAll('.stCouleurs').forEach(rg => {
    const q = rg.dataset.q;
    rg.querySelectorAll('[data-coul]').forEach(b => b.addEventListener('click', () => poser(q, b.dataset.coul)));
    const i = rg.querySelector('input[type="color"]');
    if(i) i.addEventListener('change', () => poser(q, String(i.value).toUpperCase()));
  });
  const cb = div.querySelector('#fiCoulBilan');
  if(cb) cb.addEventListener('change', () => changerFiche(() => {
    const reg = reglageZoneFiche(cle);
    if(!reg.couleurs) return;
    if(cb.checked) reg.couleurs.b = 1; else delete reg.couleurs.b;
  }));
}

/* ============================================================
   ✍️ v1207 — AJOUTER, RETIRER, ENCADRER
   ============================================================ */
function ordreCourantFiche(){ return champsAvecForme(champsDeBaseFiche(fiS.modele), fiS.forme).map(c => c.cle); }

/* « ➕ Ajouter ici » : le type, puis son titre */
function ouvrirAjoutFiche(apres){
  const avant = apres ? champCourantFiche(apres) : null;
  const avecCepc = SCHEMAS_CEPC_FICHE.indexOf(MODELES[fiS.modele].schema) !== -1;
  const fond = document.createElement('div');
  fond.className = 'overlay show fiModal';
  fond.innerHTML = '<div class="modal"><h3>➕ Ajouter une zone ' + (avant ? 'sous « ' + echFiche(nomCourtFiche(avant)) + ' »' : 'tout en haut') + '</h3>' +
    '<div class="stPetit" style="margin-bottom:8px;">Ce que le moniteur y mettra part dans le bilan <b>juste sous la zone du dessus</b>' +
    ' (s’il n’a rien écrit au-dessus, à la fin de sa partie).</div>' +
    '<div class="fiTypes">' + Object.keys(TYPES_AJOUT_FICHE).filter(k => !TYPES_AJOUT_FICHE[k].examens || avecCepc).map(k =>
      '<button type="button" class="fiType" data-type="' + k + '"><b>' + echFiche(TYPES_AJOUT_FICHE[k].nom) + '</b><small>' + echFiche(TYPES_AJOUT_FICHE[k].aide) + '</small></button>').join('') +
      '<button type="button" class="fiType" data-type="texte" data-sans-micro="1"><b>✍️ Cadre de texte sans 🎙️</b><small>Le même, sans le micro au bout</small></button>' +
      (avecCepc ? '<button type="button" class="fiType" data-type="ok" data-cepc="1"><b>✅❌ Trois états qui enlèvent des points au CEPC</b><small>Un ❌ retire des points sur la ligne du CEPC choisie</small></button>' : '') +
    '</div>' +
    '<label for="fiAjNom">Son titre sur la fiche</label><input type="text" id="fiAjNom" maxlength="120" placeholder="Ex. : Remarque sur le stationnement">' +
    '<label class="stCocheL" style="margin-top:8px;"><input type="checkbox" id="fiAjNous"> 🔒 Pour nous seulement : dans la note interne, jamais à l’élève</label>' +
    '<div style="display:flex;gap:8px;margin-top:12px;"><button type="button" class="btn btn-primary" id="fiAjOk" disabled>➕ Ajouter</button><button type="button" class="btn btn-secondary" id="fiAjNon">Annuler</button></div></div>';
  fond.querySelector('.modal').style.setProperty('max-width', '560px', 'important');
  document.body.appendChild(fond);
  let type = '', sansMicro = false, avecMoins = false;
  const ok = fond.querySelector('#fiAjOk'), nom = fond.querySelector('#fiAjNom'), nous = fond.querySelector('#fiAjNous');
  fond.querySelectorAll('.fiType').forEach(b => b.addEventListener('click', () => {
    type = b.dataset.type; sansMicro = !!b.dataset.sansMicro; avecMoins = !!b.dataset.cepc;
    fond.querySelectorAll('.fiType').forEach(x => x.classList.toggle('on', x === b));
    ok.disabled = false;
    /* un titre n'a rien à écrire : ni dans le bilan, ni dans la note */
    const titre = type === 'titre' || type === 'sousTitre' || type === 'remarques';
    nous.disabled = titre; if(titre) nous.checked = false;
    nous.parentElement.style.opacity = titre ? '.45' : '';
    nom.focus();
  }));
  fond.querySelector('#fiAjNon').addEventListener('click', () => fond.remove());
  ok.addEventListener('click', () => {
    if(!type) return;
    const titre = nom.value.trim();
    if((type === 'titre' || type === 'sousTitre') && !titre){ showToast('Écris le titre.'); nom.focus(); return; }
    let cle = '';
    changerFiche(() => {
      const prises = zonesDeBaseFiche().map(x => x.cle);
      cle = nouvelleCleFiche('z', prises);
      const n = { cle: cle, type: type, nom: titre };
      if(type === 'texte') n.lignes = 4;
      if(type === 'liste'){ n.source = 'main'; n.choix = []; }
      if(type === 'remarques'){ n.mention = titre || 'Remarque'; n.lignes = 2; }
      if(type === 'ok' && avecMoins) n.cepcMoins = { ligne: lignesCepcFiche()[0] || '', points: 1 };
      if(nous.checked && type !== 'titre' && type !== 'sousTitre' && type !== 'remarques') n.bureau = 1;
      fiS.forme.ajouts = (fiS.forme.ajouts || []).concat([n]);
      if(sansMicro) reglageZoneFiche(cle).micro = 0;
      const ordre = ordreCourantFiche().filter(k => k !== cle);
      const i = apres ? ordre.indexOf(apres) : -1;
      ordre.splice(i + 1, 0, cle);
      fiS.forme.ordre = ordre;
      /* 📦 v1238 — « ➕ » DANS un cadre (y compris sous sa dernière zone,
         où le ➕ est dessiné dedans) : la zone entre dans le cadre. Même
         chose pour un fond partagé (le gris Manœuvre/Autonomie). */
      if(apres){
        (fiS.forme.cadres || []).forEach(cd => { if(cd.a === apres) cd.a = cle; });
        const enCadre = (fiS.forme.cadres || []).some(cd => {
          let a = ordre.indexOf(cd.de), b = ordre.indexOf(cd.a); if(a > b){ const t = a; a = b; b = t; }
          const k = ordre.indexOf(cle); return k >= a && k <= b;
        });
        const av = avant;
        if(!enCadre && av && av.fond && !av.cadre){
          reglageZoneFiche(cle).fond = av.fond;
          reglageZoneFiche(cle).intensite = av.intensite || 'leger';
        }
      }
    });
    fond.remove();
    fiS.choix = cle; fiS.cadre = '';
    if(telFiche()) fiS.feuille = 'zone';
    marquerChoixFiche(); dessinerPanneauFiche();
    const bl = document.querySelector('#fiZone [data-zone="' + CSS.escape(cle) + '"]');
    /* sur téléphone, les réglages montent du bas : la zone va en haut */
    if(bl && bl.scrollIntoView) bl.scrollIntoView({ block: telFiche() ? 'start' : 'center' });
    showToast(type === 'cases' ? '➕ Zone ajoutée — pose ses cases à droite' : type === 'liste' ? '➕ Liste ajoutée — pose ses choix à droite' : '➕ Zone ajoutée');
  });
}

/* Retirer une zone ajoutée (les zones d'origine se masquent, elles) */
function retirerAjoutFiche(cle){
  const ordre = ordreCourantFiche();
  const i = ordre.indexOf(cle);
  /* un cadre qui commençait ou finissait sur elle se resserre */
  fiS.forme.cadres = (fiS.forme.cadres || []).map(cd => {
    let de = ordre.indexOf(cd.de), a = ordre.indexOf(cd.a);
    if(de > a){ const t = de; de = a; a = t; }
    if(i < de || i > a) return cd;
    if(de === a) return null;
    const n = Object.assign({}, cd);
    n.de = ordre[de === i ? de + 1 : de]; n.a = ordre[a === i ? a - 1 : a];
    return n;
  }).filter(Boolean);
  fiS.forme.ajouts = (fiS.forme.ajouts || []).filter(z => z.cle !== cle);
  delete fiS.forme.zones[cle];
  fiS.forme.ordre = (fiS.forme.ordre || []).filter(k => k !== cle);
  if(fiS.choix === cle) fiS.choix = '';
}

/* « 📦 Encadrer » : on touche la première zone, puis la dernière */
function commencerEncadrerFiche(de){
  fiS.encadre = { de: de || '' };
  fiS.cadre = '';
  if(de) fiS.choix = '';
  fiS.feuille = '';
  marquerChoixFiche(); dessinerPanneauFiche(); dessinerConsigneFiche();
}
function dessinerConsigneFiche(){
  const e = document.getElementById('fiConsigne');
  if(!e || !fiS) return;
  if(!fiS.encadre || fiS.essai){ e.style.display = 'none'; e.innerHTML = ''; marquerChoixFiche(); return; }
  e.style.display = '';
  e.innerHTML = '📦 ' + (fiS.encadre.de ? 'Touche maintenant la <b>dernière</b> zone du cadre' : 'Touche la <b>première</b> zone du cadre') + ' (sur la fiche, ou dans « 🧩 Les zones »)' +
    ' <button type="button" class="btn btn-secondary" data-fa="encadrerNon">Annuler</button>';
  marquerChoixFiche();
}
function choisirPourEncadrerFiche(cle){
  if(!fiS.encadre.de){ fiS.encadre.de = cle; dessinerConsigneFiche(); return; }
  const ordre = ordreCourantFiche();
  let i = ordre.indexOf(fiS.encadre.de), j = ordre.indexOf(cle);
  fiS.encadre = null;
  if(i === -1 || j === -1){ dessinerConsigneFiche(); return; }
  if(i > j){ const t = i; i = j; j = t; }
  const id = nouvelleCleFiche('c', (fiS.forme.cadres || []).map(c => c.id));
  changerFiche(() => {
    /* un cadre qui chevauche le nouveau s'efface : un seul fond par zone */
    const garde = (fiS.forme.cadres || []).filter(cd => {
      let a = ordre.indexOf(cd.de), b = ordre.indexOf(cd.a);
      if(a > b){ const t = a; a = b; b = t; }
      return b < i || a > j;
    });
    garde.push({ id: id, de: ordre[i], a: ordre[j], fond: '#DCD0FF', intensite: 'franc' });
    fiS.forme.cadres = garde;
  });
  fiS.cadre = id; fiS.choix = '';
  if(telFiche()) fiS.feuille = 'zone';
  dessinerConsigneFiche(); dessinerPanneauFiche();
  showToast('📦 Cadre posé — choisis sa couleur');
}
function blocCadreFiche(id){
  const z = document.createElement('div');
  z.className = 'stBloc';
  const cd = (fiS.forme.cadres || []).find(c => c.id === id);
  if(!cd){ z.innerHTML = '<div class="stPetit">Cadre introuvable.</div>'; return z; }
  const de = champCourantFiche(cd.de), a = champCourantFiche(cd.a);
  const n = (() => { const o = ordreCourantFiche(); return Math.abs(o.indexOf(cd.a) - o.indexOf(cd.de)) + 1; })();
  /* 📦 v1238 — David : « je ne peux mettre que 2 choses dans un cadre ».
     Le début et la fin se choisissent aussi ici, dans des listes : autant
     de zones qu'on veut, sans viser sur la fiche. */
  const ordreZ = champsAvecForme(champsDeBaseFiche(fiS.modele), fiS.forme);
  const options = sel => ordreZ.map(x => '<option value="' + echFiche(x.cle) + '"' + (x.cle === sel ? ' selected' : '') + '>' + echFiche(nomCourtFiche(x)) + '</option>').join('');
  z.innerHTML = '<h4>📦 Un cadre de ' + n + ' zone' + (n > 1 ? 's' : '') + '</h4>' +
    '<label for="fiCadreDe">Il commence à</label><select id="fiCadreDe">' + options(cd.de) + '</select>' +
    '<label for="fiCadreA">Il finit à</label><select id="fiCadreA">' + options(cd.a) + '</select>' +
    '<div class="stPetit" style="margin:4px 0 6px;">Toutes les zones entre les deux sont dans le cadre. Une zone ajoutée avec « ➕ » dans le cadre, ou déplacée entre les deux, y entre aussi.</div>' +
    '<label>Le fond du cadre</label>' + pastillesFondFiche(cd.fond).replace('<button type="button" class="mepAuto' + (!cd.fond ? ' on' : '') + '" data-fond="" title="Sans fond">∅</button>', '') +
    '<div class="stChips fiIntens">' + [['leger', 'Léger'], ['franc', 'Franc'], ['fort', 'Très visible']].map(([k, t]) =>
      '<button type="button" class="btn ' + (cd.intensite === k ? 'btn-primary' : 'btn-secondary') + '" data-intens="' + k + '">' + t + '</button>').join('') + '</div>' +
    '<div class="stChips" style="margin-top:10px;"><button type="button" class="btn btn-secondary" data-fa="encadrer">📦 Refaire le cadre…</button>' +
    '<button type="button" class="btn btn-secondary fiRetirer" id="fiCadreRetirer">✕ Retirer le cadre</button></div>';
  const poser = fn => changerFiche(() => { const c = (fiS.forme.cadres || []).find(x => x.id === id); if(c) fn(c); });
  const bornes = () => changerFiche(() => {
    const c = (fiS.forme.cadres || []).find(x => x.id === id);
    if(!c) return;
    c.de = z.querySelector('#fiCadreDe').value; c.a = z.querySelector('#fiCadreA').value;
    /* un autre cadre qui chevauche s'efface : un seul fond par zone */
    const o = ordreCourantFiche();
    let i = o.indexOf(c.de), j = o.indexOf(c.a); if(i > j){ const t = i; i = j; j = t; }
    fiS.forme.cadres = fiS.forme.cadres.filter(x => {
      if(x.id === id) return true;
      let a = o.indexOf(x.de), b = o.indexOf(x.a); if(a > b){ const t = a; a = b; b = t; }
      return b < i || a > j;
    });
  });
  z.querySelector('#fiCadreDe').addEventListener('change', bornes);
  z.querySelector('#fiCadreA').addEventListener('change', bornes);
  z.querySelectorAll('[data-fond]').forEach(b => b.addEventListener('click', () => poser(c => { if(b.dataset.fond) c.fond = b.dataset.fond; })));
  const ci = z.querySelector('.stAutreCouleur input');
  if(ci) ci.addEventListener('change', () => poser(c => { c.fond = ci.value.toUpperCase(); }));
  z.querySelectorAll('[data-intens]').forEach(b => b.addEventListener('click', () => poser(c => { c.intensite = b.dataset.intens; })));
  z.querySelector('#fiCadreRetirer').addEventListener('click', () => {
    changerFiche(() => { fiS.forme.cadres = (fiS.forme.cadres || []).filter(c => c.id !== id); });
    fiS.cadre = ''; if(telFiche()) fiS.feuille = '';
    marquerChoixFiche(); dessinerPanneauFiche();
  });
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
    '<label for="fiCsPhrase">' + (c && c.type === 'cases' ? 'La phrase qui part dans le bilan quand il coche' : 'La phrase qui s’écrit dans le cadre quand il coche') + '</label>' +
    '<textarea id="fiCsPhrase" rows="4" maxlength="500" class="fiTexte"></textarea>' +
    (c && c.type === 'cases' ? '' : '<label>Où elle s’écrit</label><div class="stChips"><button type="button" class="btn" data-ou="debut">⬆️ En tête du cadre</button><button type="button" class="btn" data-ou="fin">⬇️ À la fin</button></div>') +
    '<label class="stCocheL" style="margin-top:8px;"><input type="checkbox" id="fiCsOffice"> Cochée d’office à l’ouverture de la fiche</label>' +
    /* 🚗 v1211 — une case réservée à certaines voitures */
    '<label>🚗 Seulement avec ces voitures</label><div class="stPetit" style="margin:-2px 0 6px;">Aucune cochée : la case est là sur toutes les voitures.</div>' +
    '<div class="fiVoitures" id="fiCsVoitures"></div>' +
    '<div class="stPetit" style="margin:8px 0 12px;">Décochée, la phrase repart du cadre, sans toucher à ce que le moniteur a écrit autour.</div>' +
    '<div style="display:flex;gap:8px;"><button type="button" class="btn btn-primary" id="fiCsOk">💾 Garder</button><button type="button" class="btn btn-secondary" id="fiCsNon">Annuler</button></div></div>';
  fond.querySelector('.modal').style.setProperty('max-width', '520px', 'important');
  document.body.appendChild(fond);
  const lib = fond.querySelector('#fiCsLib'), ph = fond.querySelector('#fiCsPhrase'), of = fond.querySelector('#fiCsOffice');
  lib.value = cs.libelle || ''; ph.value = cs.phrase || ''; of.checked = !!cs.office;
  let voitures = Array.isArray(cs.voitures) ? cs.voitures.slice() : [];
  choixVoituresFiche(fond.querySelector('#fiCsVoitures'), voitures, l => { voitures = l; });
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
      const l = casesDeLaZoneFiche(cle, cases);
      const n = { libelle: lib.value.trim(), phrase: phrase, ou: ou, office: of.checked ? 1 : 0 };
      if(voitures.length) n.voitures = voitures.slice();
      if(i >= 0) l[i] = n; else l.push(n);
    });
    fermer();
  });
  setTimeout(() => { if(!fond.contains(document.activeElement)) (i >= 0 ? lib : ph).focus(); }, 50);
}

/* ============================================================
   🚗 LES VOITURES — v1211

   La flotte (sans les voitures vendues ni les remorques), lue une
   fois à l'ouverture du créateur. Une condition se coche dans une
   liste : « ⚡ les voitures à alerte de survitesse », puis chaque
   voiture. Une voiture déjà choisie qui a quitté la flotte reste dans
   la liste : on doit pouvoir la décocher.
   ============================================================ */
async function chargerFlotteFiche(){
  if(!fiS || fiS.flotte) return;
  try{
    const r = await appelPrep({ action: 'flotteList' });
    const l = ((r && r.vehicules) || [])
      .filter(v => v && v.nom && v.etat !== 'vendu' && v.categorie !== 'remorque')
      .map(v => String(v.nom).trim()).filter(Boolean);
    if(!fiS) return;
    fiS.flotte = l.filter((x, i) => l.indexOf(x) === i)
      .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  }catch(e){
    if(fiS) fiS.flotte = [];
  }
  if(fiS && !document.querySelector('.fiModal')) dessinerPanneauFiche();
}
function choixVoituresFiche(div, choisies, quandChange){
  if(!div) return;
  let sel = (choisies || []).slice();
  div.innerHTML = '';
  const ligne = (val, texte) => {
    const l = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = sel.indexOf(val) !== -1;
    cb.addEventListener('change', () => {
      if(cb.checked){ if(sel.indexOf(val) === -1) sel.push(val); }
      else sel = sel.filter(x => x !== val);
      quandChange(sel.slice());
    });
    l.appendChild(cb);
    l.appendChild(document.createTextNode(texte));
    div.appendChild(l);
  };
  ligne(VOITURES_SURVITESSE, '⚡ Les voitures à alerte de survitesse (Q3 n°10, A3 n°2, A3 BV et BEA de Loudéac)');
  const sep = document.createElement('div');
  sep.className = 'sep';
  div.appendChild(sep);
  const liste = ((fiS && fiS.flotte) || []).slice();
  sel.forEach(v => { if(v !== VOITURES_SURVITESSE && liste.indexOf(v) === -1) liste.push(v); });
  if(!liste.length){
    const v = document.createElement('div');
    v.className = 'stPetit';
    v.textContent = (fiS && fiS.flotte) ? 'Aucune voiture dans la flotte.' : 'Lecture de la flotte…';
    div.appendChild(v);
  }
  liste.forEach(v => ligne(v, '🚗 ' + v));
}
/* Les cases d'une zone, prêtes à changer. ⚠️ Une zone qui portait les
   deux cases de la survitesse les a maintenant DANS sa liste : « sv »
   le dit, pour qu'elles ne s'ajoutent pas une seconde fois. */
function casesDeLaZoneFiche(cle, cases){
  const r = reglageZoneFiche(cle);
  r.cases = (cases || []).map(x => {
    const o = Object.assign({}, x);
    if(Array.isArray(x.voitures)) o.voitures = x.voitures.slice();
    return o;
  });
  const base = baseDeZoneFiche(cle);
  if(base && base.survitesse) r.sv = 1;
  return r.cases;
}

/* La liste des zones : ordre, masquées, d'un coup d'œil */
function blocListeZonesFiche(){
  const z = document.createElement('div');
  z.className = 'stBloc';
  const liste = champsAvecForme(champsDeBaseFiche(fiS.modele), fiS.forme);
  z.innerHTML = '<h4>🧩 Les zones de la fiche</h4><div class="stPetit" style="margin-bottom:6px;">↑ ↓ pour changer l’ordre, 👁️ pour masquer, 🗑️ pour retirer une zone ajoutée. Touche un nom pour la régler.</div><div class="fiZones"></div>' +
    '<div class="stChips" style="margin-top:8px;"><button type="button" class="btn btn-secondary" id="fiOrdreAvant">↺ L’ordre d’origine</button></div>';
  const g = z.querySelector('.fiZones');
  liste.forEach((c, i) => {
    const verrou = verrouFiche(c.cle);
    const r = fiS.forme.zones[c.cle] || {};
    const d = document.createElement('div');
    d.className = (c.cle === fiS.choix ? 'on' : '') + (r.cache ? ' masquee' : '') + (c.ajout ? ' ajoutee' : '') + (c.cadre ? ' encadree' : '');
    if(c.cadre) d.style.setProperty('--cadre', c.fond === 'ardoise' ? '#5B6B80' : ((FONDS_FICHE[c.fond] && FONDS_FICHE[c.fond].fort) || c.fond));
    const coul = c.fond ? (c.fond === 'ardoise' ? '#E8EDF3' : c.fond) : '';
    const signes = (c.ajout ? '➕ ' : '') + (c.type === 'titre' ? '📌' : c.type === 'sousTitre' ? '🔖' : c.type === 'ok' ? '✅❌' : (c.type === 'texte' || c.type === 'court') ? '✍️' : c.type === 'cases' ? '☑' : c.type === 'liste' ? '▾' : c.type === 'observations' ? '👨‍✈️' : '') +
      (c.cepcMoins ? ' ➖' : '') +
      (c.siListe ? ' 👁️' : '') + (c.couleurs ? ' 🎨' : '') +
      ((c.cases || []).length ? ' ☑' + c.cases.length : '') + (r.micro === 0 ? ' 🔇' : '') + (c.cadre ? ' 📦' : '') + (c.pourNous ? ' 🔐' : '') + (verrou ? ' 🔒' : '');
    d.innerHTML = '<span class="pastille" style="background:' + (coul || 'transparent') + ';' + (coul ? '' : 'border-style:dashed;') + '"></span>' +
      '<button type="button" class="n" data-zc="choisir">' + echFiche(nomCourtFiche(c)) + '</button><span class="s">' + signes + '</span>' +
      '<button type="button" class="btn btn-secondary" data-zc="haut" title="Monter"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
      '<button type="button" class="btn btn-secondary" data-zc="bas" title="Descendre"' + (i === liste.length - 1 ? ' disabled' : '') + '>↓</button>' +
      (verrou ? '<span class="oeil" title="Zone qui calcule : toujours à l’écran">🔒</span>'
       : c.ajout ? '<button type="button" class="btn btn-secondary oeil" data-zc="retirer" title="Retirer cette zone ajoutée">🗑️</button>'
              : '<button type="button" class="btn btn-secondary oeil" data-zc="oeil" title="' + (r.cache ? 'Masquée — appuie pour la remettre' : 'À l’écran — appuie pour la masquer') + '">' + (r.cache ? '🙈' : '👁️') + '</button>');
    d.querySelector('[data-zc="choisir"]').addEventListener('click', () => {
      /* 📦 v1238 — en train d'encadrer : la liste sert aussi à choisir */
      if(fiS.encadre){ choisirPourEncadrerFiche(c.cle); return; }
      fiS.choix = c.cle; fiS.cadre = ''; fiS.feuille = telFiche() ? 'zone' : '';
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
    const rt = d.querySelector('[data-zc="retirer"]');
    if(rt) rt.addEventListener('click', async () => {
      if(!await confirmer('Retirer la zone « ' + nomCourtFiche(c) + ' » de la fiche ?', 'Retirer')) return;
      changerFiche(() => retirerAjoutFiche(c.cle));
    });
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
    '<div class="stPetit" style="margin-bottom:8px;">Les réglages partent en <b>brouillon</b> sur les modèles cochés : seules les zones qu’ils ont aussi sont reprises. ' +
      'Les <b>zones ajoutées</b> ne partent que vers les modèles qui ont les mêmes zones. Ouvre-les ensuite pour vérifier et publier.</div>' +
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
        /* les zones ajoutées vivent par rapport à leurs voisines : elles
           ne partent que vers un modèle qui a les mêmes zones */
        const src = JSON.parse(JSON.stringify(fiS.forme));
        if(MODELES[k].schema !== moi.schema){ delete src.ajouts; }
        const f = nettoyerFormeFiche(src, champsDeBaseFiche(k));
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
