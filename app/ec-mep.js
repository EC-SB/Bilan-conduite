/* Déployé le 28/10/2026 à 13:32 — v1291 */
/* ============================================================
   ec-mep.js
   🖥️ La mise en page des télés et 🎨 les thèmes — v1201

   L'étape ③ du studio. David, le 17 octobre 2026 : « pouvoir
   replacer la météo, avoir plusieurs modèles, modifier si je veux
   les cours à venir — la forme et le placement —, la diapositive
   vos cours commencent pareil, le QR code pareil : pouvoir modifier
   le fond, la forme, le texte bien sûr, en gardant le QR code
   lui-même ». Puis, pour les thèmes : « des petits PNG, des trucs
   qui tombent ou qui montent pour rendre vivant ». Ses réponses : le
   bandeau du haut éclaté en blocs libres ; plusieurs mises en page ;
   les dix thèmes suffisent ; la vitrine au choix, thème par thème.

   ⚠️ L'APERÇU EST LA VRAIE PAGE DES TÉLÉS. Le studio de mise en
   page ne redessine rien lui-même : il charge ecran.html en petit
   (« &apercu=1 ») avec les vraies données du jour, lui envoie son
   brouillon par message, et la page lui renvoie la place exacte de
   chaque bloc. Ce qu'on arrange ici est donc exactement ce que la
   télé affichera — un seul dessin, celui de la télé.

   Le rendu (CSS, calendrier, petites images) est dans ec-tele.js,
   partagé avec ecran.html. Rien ici n'est écrit ailleurs que dans
   D1 (voir « LA MISE EN PAGE DES TÉLÉS ET LES THÈMES » du Worker).
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let teleEcran = null;   /* ecranMises : mises en page, en service, thèmes, liens */

function majTeleEcran(r){
  if(!r || r.status !== 'ok') return;
  const th = r.themes && typeof r.themes === 'object' ? r.themes : {};
  r.mises = Array.isArray(r.mises) ? r.mises : [];
  r.accueil = r.accueil || ''; r.vitrine = r.vitrine || '';
  r.themes = { auto: th.auto === undefined ? 1 : th.auto, lignes: Array.isArray(th.lignes) ? th.lignes : [] };
  teleEcran = r;
  Object.assign(liensStudio, r.liens || {});
}
function jourIsoEcran(){
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
}
const jjmm = md => md ? md.slice(3, 5) + '/' + md.slice(0, 2) : '';

/* ============================================================
   L'APERÇU : ecran.html en petit, qui obéit au brouillon
   ============================================================ */
async function apercuTele(cadre, ou, quandPlaces){
  const j = await chargerJetonEcran();
  const ifr = document.createElement('iframe');
  ifr.className = 'mepIframe';
  ifr.title = 'Aperçu de la télé';
  ifr.tabIndex = -1;
  cadre.insertBefore(ifr, cadre.firstChild);
  let dernier = null;
  const envoyer = m => {
    dernier = Object.assign(dernier || {}, m);
    try{ ifr.contentWindow && ifr.contentWindow.postMessage({ ecApercu: m }, '*'); }catch(e){}
  };
  const ecoute = ev => {
    if(ev.source !== ifr.contentWindow || !ev.data || !ev.data.ecPlaces) return;
    quandPlaces(ev.data.ecPlaces, ev.data.ou);
  };
  addEventListener('message', ecoute);
  ifr.addEventListener('load', () => { if(dernier) try{ ifr.contentWindow.postMessage({ ecApercu: dernier }, '*'); }catch(e){} });
  const ajuster = () => { ifr.style.transform = 'scale(' + (cadre.clientWidth / 1600) + ')'; };
  ajuster();
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(ajuster) : null;
  if(ro) ro.observe(cadre);
  const charger = o => {
    if(!j){ cadre.classList.add('mepSansJeton'); return; }
    ifr.src = CONFIG.LIEN_ECRAN + '?t=' + encodeURIComponent(j) + '&ou=' + o + '&apercu=1' +
      (typeof VERSION_MODULES !== 'undefined' ? '&v=' + VERSION_MODULES : '');
  };
  charger(ou);
  return {
    iframe: ifr, envoyer: envoyer, ajuster: ajuster,
    changerOu(o){ charger(o); },
    detruire(){ removeEventListener('message', ecoute); if(ro) ro.disconnect(); ifr.remove(); }
  };
}

/* ============================================================
   ⚙️ RÉGLAGES › 🖥️ LA MISE EN PAGE DES ÉCRANS
   ============================================================ */
function blocMisesEnPage(){
  const z = document.createElement('div');
  z.className = 'afQrBloc mepBloc';
  const t = teleEcran;
  if(!t){
    z.innerHTML = '<strong>🖥️ La mise en page des écrans</strong><div class="afResume" style="margin:4px 0 0;">Lecture impossible pour l’instant.</div>';
    return z;
  }
  const options = sel => '<option value="">D’origine</option>' + t.mises.map(m =>
    '<option value="' + echEcran(m.id) + '"' + (m.id === sel ? ' selected' : '') + '>' + echEcran(m.nom) + '</option>').join('');
  z.innerHTML = '<strong>🖥️ La mise en page des écrans</strong>' +
    '<div class="afResume" style="margin:4px 0 10px;">Où se placent le nom, la date, l’heure, la météo, les cours à venir, le QR et le défilant, ' +
      'leur forme et leurs couleurs, et l’écran « Vos cours commencent ». On en garde plusieurs, une par écran est en service.</div>' +
    '<div class="duo"><div><label for="mepAccueil">🏠 L’accueil utilise</label><select id="mepAccueil">' + options(t.accueil) + '</select></div>' +
      '<div><label for="mepVitrine">🪟 La vitrine utilise</label><select id="mepVitrine">' + options(t.vitrine) + '</select></div></div>' +
    '<div class="mepListe" id="mepListe"></div>' +
    '<button type="button" class="btn btn-secondary" id="mepNouvelle" style="margin-top:10px;">➕ Nouvelle mise en page</button>';
  [['mepAccueil', 'accueil'], ['mepVitrine', 'vitrine']].forEach(([id, ou]) => z.querySelector('#' + id).addEventListener('change', async ev => {
    try{
      majTeleEcran(await appelPrep({ action: 'ecranMiseUtiliser', ou: ou, id: ev.target.value }));
      showToast((ou === 'accueil' ? 'L’accueil' : 'La vitrine') + ' : mise en page changée ✅ (dans la minute sur la télé)');
      dessinerOngletEcran();
    }catch(e){ showToast('Impossible : ' + e.message); }
  }));
  const liste = z.querySelector('#mepListe');
  const carte = (m) => {
    const c = document.createElement('div');
    c.className = 'mepCarte';
    const badges = (m ? [[t.accueil === m.id, '🏠 à l’accueil'], [t.vitrine === m.id, '🪟 à la vitrine']]
                      : [[!t.accueil, '🏠 à l’accueil'], [!t.vitrine, '🪟 à la vitrine']])
      .filter(x => x[0]).map(x => '<span class="stBadge">' + x[1] + '</span>').join('');
    c.innerHTML = '<b></b><div class="mepBadges">' + (badges || '<span class="stBadge gris">pas en service</span>') + '</div>' +
      '<div class="stPetit">' + (m ? 'Modifiée le ' + echEcran(String(m.majLe || '').slice(0, 10)) + (m.par ? ' par ' + echEcran(m.par) : '') : 'La page telle qu’elle a toujours été : on peut toujours y revenir.') + '</div>' +
      '<div class="stRang" style="margin-top:8px;"></div>';
    c.querySelector('b').textContent = m ? m.nom : 'D’origine';
    const rang = c.querySelector('.stRang');
    const bouton = (txt, titre, fn, rouge) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-secondary' + (rouge ? ' stRouge' : ''); b.textContent = txt; b.title = titre;
      b.addEventListener('click', fn); rang.appendChild(b);
    };
    if(m) bouton('✏️ Modifier', 'Modifier', () => ouvrirMepStudio({ id: m.id, nom: m.nom, config: m.config }));
    bouton('⧉ Copier', 'Partir de celle-ci pour une nouvelle', () => ouvrirMepStudio({ id: '', nom: (m ? m.nom : 'D’origine') + ' (copie)', config: m ? m.config : {} }));
    if(m) bouton('🗑️', 'Retirer', async () => {
      if(!await confirmer('Retirer la mise en page « ' + m.nom + ' » ? Un écran qui l’utilise reviendra à « D’origine ».')) return;
      try{ majTeleEcran(await appelPrep({ action: 'ecranMiseSupprimer', id: m.id })); showToast('Retirée ✅'); dessinerOngletEcran(); }
      catch(e){ showToast('Impossible : ' + e.message); }
    }, true);
    return c;
  };
  liste.appendChild(carte(null));
  t.mises.forEach(m => liste.appendChild(carte(m)));
  z.querySelector('#mepNouvelle').addEventListener('click', () => ouvrirMepStudio({ id: '', nom: 'Ma mise en page', config: {} }));
  return z;
}

/* ============================================================
   ⚙️ RÉGLAGES › 🎨 LES THÈMES DES SAISONS ET DES FÊTES
   ============================================================ */
function texteDesDates(cfg){
  if(cfg.paques){
    const p = Tele.paques(new Date().getFullYear());
    const d = new Date(p.getTime() - 7 * 86400000), f = new Date(p.getTime() + 86400000);
    const f2 = x => String(x.getUTCDate()).padStart(2, '0') + '/' + String(x.getUTCMonth() + 1).padStart(2, '0');
    return 'la semaine de Pâques (cette année du ' + f2(d) + ' au ' + f2(f) + ')';
  }
  return 'du ' + jjmm(cfg.du) + ' au ' + jjmm(cfg.au);
}
let vignettesThemes = [];
function vignetteTheme(toile, cfg){
  toile.width = 300; toile.height = 168;
  toile.style.background = 'radial-gradient(circle at 60% 50%,' + (cfg.fond1 || '#1b2b20') + ',' + (cfg.fond2 || '#0B0E14') + ' 75%)';
  const m = Tele.lancer(toile, cfg.animation, { photos: cfg.animation.photos.map(lienStudio).filter(Boolean), premierePasse: 1, arretSiRetire: true });
  vignettesThemes.push(m);
}
function blocThemesEcran(){
  vignettesThemes.forEach(m => m.arreter());
  vignettesThemes = [];
  const z = document.createElement('div');
  z.className = 'afQrBloc thBloc';
  const t = teleEcran;
  if(!t || typeof Tele === 'undefined'){
    z.innerHTML = '<strong>🎨 Les thèmes</strong><div class="afResume" style="margin:4px 0 0;">Lecture impossible pour l’instant.</div>';
    return z;
  }
  const themes = Tele.themesComplets(t.themes.lignes);
  const jour = jourIsoEcran();
  const duJour = t.themes.auto ? Tele.themeDuJour(themes, jour, 'accueil') : null;
  z.innerHTML = '<strong>🎨 Les thèmes des saisons et des fêtes</strong>' +
    '<div class="afResume" style="margin:4px 0 10px;">Chaque thème change les couleurs de l’écran et ajoute de petites images qui tombent, montent ou ' +
      'traversent, <b>derrière</b> les cours à venir et le QR. Une fête passe avant la saison (Halloween avant l’automne, Noël avant l’hiver).</div>';
  z.appendChild(interrupteur({
    titre: '🗓️ Thèmes automatiques selon le calendrier', ouvert: !!t.themes.auto,
    quandOuvert: 'Chaque thème allumé s’allume et s’éteint tout seul à ses dates, chaque année.',
    quandFerme: 'Aucun thème sur les télés, quelles que soient les dates.',
    basculer: async v => majTeleEcran(await appelPrep({ action: 'ecranThemesAuto', valeur: v ? '1' : '0' })),
    apres: () => dessinerOngletEcran()
  }));
  themes.forEach(th => {
    const c = th.config;
    const ligne = document.createElement('div');
    ligne.className = 'stTheme' + (duJour && duJour.id === th.id ? ' on' : '') + (th.actif ? '' : ' eteint');
    const n = Tele.joursAvant(c, jour);
    const etat = !th.actif ? '<span class="stBadge gris">éteint</span>'
      : (duJour && duJour.id === th.id) ? '<span class="stBadge">● en ce moment</span>'
      : n === 0 ? '<span class="stBadge gris">« ' + echEcran(duJour ? duJour.config.nom : '') + ' » passe avant</span>'
      : n > 0 ? '<span class="stBadge gris">dans ' + n + ' jour' + (n > 1 ? 's' : '') + '</span>' : '';
    ligne.innerHTML = '<canvas class="thVignette"></canvas><div class="tx"><b></b><div class="d">' + echEcran(texteDesDates(c)) + ' · ' + etat + '</div>' +
      '<div class="d">' + (th.vitrine ? '🏠🪟 sur les deux écrans' : '🏠 à l’accueil seulement') + (c.fete ? ' · 🎉 fête' : '') + '</div></div>';
    ligne.querySelector('b').textContent = c.nom;
    const actif = document.createElement('button');
    actif.type = 'button';
    actif.className = 'stMini' + (th.actif ? ' on' : '');
    actif.title = th.actif ? 'Éteindre ce thème' : 'Allumer ce thème';
    actif.setAttribute('role', 'switch');
    actif.setAttribute('aria-checked', th.actif ? 'true' : 'false');
    actif.innerHTML = '<i></i>';
    actif.addEventListener('click', async () => {
      try{
        majTeleEcran(await appelPrep({ action: 'ecranThemePoser', id: th.id, config: JSON.stringify(c), actif: th.actif ? '0' : '1', vitrine: th.vitrine ? '1' : '0' }));
        showToast(th.actif ? 'Thème éteint ✅' : 'Thème allumé ✅');
        dessinerOngletEcran();
      }catch(e){ showToast('Impossible : ' + e.message); }
    });
    const modif = document.createElement('button');
    modif.type = 'button';
    modif.className = 'afPetit';
    modif.title = 'Modifier';
    modif.textContent = '✏️';
    modif.addEventListener('click', () => ouvrirThemeStudio(th));
    const boutons = document.createElement('div');
    boutons.className = 'thBoutons';
    boutons.appendChild(actif);
    boutons.appendChild(modif);
    ligne.appendChild(boutons);
    z.appendChild(ligne);
    vignetteTheme(ligne.querySelector('canvas'), c);
  });
  const nv = document.createElement('button');
  nv.type = 'button';
  nv.className = 'btn btn-secondary';
  nv.style.marginTop = '10px';
  nv.textContent = '➕ Nouveau thème';
  nv.addEventListener('click', () => {
    const d = new Date(), f = new Date(Date.now() + 7 * 86400000);
    const md = x => String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    ouvrirThemeStudio({ id: '', base: false, actif: true, vitrine: true,
      config: Tele.nettoyerTheme({ nom: '✨ Mon thème', du: md(d), au: md(f), fete: true, accent: '#B6FF0E', animation: { lutins: ['confetti'] } }, '') });
  });
  z.appendChild(nv);
  return z;
}

/* ============================================================
   LA COQUILLE COMMUNE DES DEUX STUDIOS
   ============================================================ */
function coquilleTele(o){
  const z = document.createElement('div');
  z.className = 'overlay show stStudio mepStudio';
  z.id = 'mepStudio';
  z.innerHTML =
    '<div class="stBarre">' +
      '<button type="button" class="btn btn-secondary" data-mact="fermer" title="Fermer">←<span class="stCache"> Fermer</span></button>' +
      '<input type="text" class="stNom" id="mepNom" maxlength="60">' +
      o.boutons +
      '<button type="button" class="btn btn-primary" data-mact="enregistrer">💾 Enregistrer</button>' +
    '</div>' +
    '<div class="stCorps">' +
      '<div class="stToile">' +
        '<div class="stFormats" id="mepOnglets"></div>' +
        '<div class="mepCadre" id="mepCadre"><div class="mepCalque" id="mepCalque"></div></div>' +
        '<div class="stAjout stSeulTel" id="mepBasTel"></div>' +
      '</div>' +
      '<div class="stPanneau" id="mepPanneau"></div>' +
    '</div>' +
    '<div class="stFeuille" id="mepFeuille"></div>';
  document.body.appendChild(z);
  document.body.classList.add('stOuvert');
  return z;
}
function fermerCoquilleTele(etat){
  if(etat.apercu) etat.apercu.detruire();
  if(etat.redim) removeEventListener('resize', etat.redim);
  const z = document.getElementById('mepStudio');
  if(z) z.remove();
  document.body.classList.remove('stOuvert');
}
/* Les couleurs, avec une case « Automatique » (celle du thème, ou d'origine) */
function couleursTele(actuelle, auto){
  return '<div class="stCouleurs">' +
    (auto ? '<button type="button" class="mepAuto' + (!actuelle ? ' on' : '') + '" data-c="" title="' + auto + '">A</button>' : '') +
    '<button type="button" class="mepTransp' + (actuelle === 'transparent' ? ' on' : '') + '" data-c="transparent" title="Transparent">∅</button>' +
    STUDIO_CHARTE.map(c => '<button type="button" class="' + (String(actuelle || '').toLowerCase() === c.toLowerCase() ? 'on' : '') +
      '" data-c="' + c + '" style="background:' + c + '" title="' + c + '"></button>').join('') +
    '<label class="stAutreCouleur" title="N’importe quelle couleur">🎨<input type="color" value="' +
      (/^#[0-9a-f]{6}$/i.test(actuelle || '') ? actuelle : '#ffffff') + '"></label></div>';
}
function telTele(){ return innerWidth < 900; }

/* ============================================================
   🖥️ LE STUDIO DE MISE EN PAGE
   ============================================================ */
let mepS = null;
async function ouvrirMepStudio(o){
  if(typeof Tele === 'undefined'){ showToast('Le fichier ec-tele.js manque : recharge la page.'); return; }
  mepS = { id: o.id || '', cfg: Tele.nettoyerMep(JSON.parse(JSON.stringify(o.config || {}))), onglet: 'accueil', choix: '',
           pile: [], refaire: [], modifie: false, places: {}, feuille: '' };
  const z = coquilleTele({ boutons:
    '<button type="button" class="btn btn-secondary" data-mact="annuler" title="Annuler">↶</button>' +
    '<button type="button" class="btn btn-secondary stLarge" data-mact="refaire" title="Refaire">↷</button>' +
    '<button type="button" class="btn btn-secondary stLarge" data-mact="toutAvant">↺ Tout comme avant</button>' });
  z.querySelector('#mepNom').value = o.nom || '';
  z.querySelector('#mepNom').addEventListener('input', () => { mepS.modifie = true; });
  z.addEventListener('click', ev => {
    const a = ev.target.closest('[data-mact]');
    if(a) actionMep(a.dataset.mact);
  });
  mepS.redim = () => dessinerMep();
  addEventListener('resize', mepS.redim);
  const cadre = z.querySelector('#mepCadre');
  dessinerMep();
  mepS.apercu = await apercuTele(cadre, 'accueil', (places, ou) => {
    if(!mepS || ou !== (mepS.onglet === 'vitrine' ? 'vitrine' : 'accueil')) return;
    mepS.places = places;
    dessinerCalqueMep();
  });
  envoyerMep();
  z.querySelector('#mepCalque').addEventListener('pointerdown', pointeurMep);
}
function ouMep(){ return mepS.onglet === 'vitrine' ? 'vitrine' : 'accueil'; }
function envoyerMep(){
  if(!mepS || !mepS.apercu) return;
  mepS.apercu.envoyer({ mep: mepS.cfg, demo: mepS.onglet === 'imminent', liens: liensAbsolus() });
}
function liensAbsolus(){
  const o = {};
  Object.keys(liensStudio).forEach(k => { o[k] = lienStudio(k); });
  return o;
}
function memoriserMep(){
  mepS.pile.push(JSON.stringify(mepS.cfg));
  if(mepS.pile.length > 60) mepS.pile.shift();
  mepS.refaire = [];
  mepS.modifie = true;
}
function changerMep(fn, toutRedessiner){
  memoriserMep();
  fn();
  mepS.cfg = Tele.nettoyerMep(mepS.cfg);
  envoyerMep();
  if(toutRedessiner) dessinerMep(); else dessinerCalqueMep();
}
async function actionMep(a){
  if(!mepS) return;
  if(a === 'fermer'){
    if(mepS.modifie && !await confirmer('Fermer sans enregistrer ? Les changements seront perdus.')) return;
    fermerCoquilleTele(mepS); mepS = null; return;
  }
  if(a === 'annuler' || a === 'refaire'){
    const de = a === 'annuler' ? mepS.pile : mepS.refaire, vers = a === 'annuler' ? mepS.refaire : mepS.pile;
    if(!de.length) return;
    vers.push(JSON.stringify(mepS.cfg));
    mepS.cfg = Tele.nettoyerMep(JSON.parse(de.pop()));
    mepS.modifie = true;
    envoyerMep(); dessinerMep(); return;
  }
  if(a === 'toutAvant'){
    if(!await confirmer(mepS.onglet === 'imminent' ? 'Remettre « Vos cours commencent » comme à l’origine ?' : 'Remettre tous les blocs de cet écran à leur place d’origine ?')) return;
    changerMep(() => {
      if(mepS.onglet === 'imminent') mepS.cfg.imminent = {};
      else mepS.cfg[ouMep()] = { blocs: {} };
    }, true);
    return;
  }
  if(a === 'blocAvant'){ changerMep(() => { delete mepS.cfg[ouMep()].blocs[mepS.choix]; }, true); return; }
  if(a === 'fermerFeuille'){ mepS.choix = ''; mepS.feuille = ''; dessinerMep(); return; }
  if(a === 'enregistrer') return enregistrerMep();
}

function dessinerMep(){
  if(!mepS) return;
  const z = document.getElementById('mepStudio');
  if(!z) return;
  const tel = telTele();
  z.classList.toggle('stTel', tel);
  const og = z.querySelector('#mepOnglets');
  og.innerHTML = [['accueil', '🏠 Accueil'], ['vitrine', '🪟 Vitrine'], ['imminent', '⏰ Vos cours commencent']].map(([k, t]) =>
    '<button type="button" class="btn ' + (mepS.onglet === k ? 'btn-primary' : 'btn-secondary') + '" data-onglet="' + k + '">' + t + '</button>').join('') +
    (tel ? '' : '<span class="info">' + (mepS.onglet === 'imminent' ? 'Avec deux cours d’exemple' : 'La vraie page de la télé, avec les données du jour') + '</span>');
  og.querySelectorAll('[data-onglet]').forEach(b => b.addEventListener('click', () => {
    const avant = ouMep();
    mepS.onglet = b.dataset.onglet; mepS.choix = ''; mepS.feuille = ''; mepS.places = {};
    if(mepS.apercu && ouMep() !== avant) mepS.apercu.changerOu(ouMep());
    envoyerMep(); dessinerMep();
  }));
  const cadre = z.querySelector('#mepCadre');
  const cs = getComputedStyle(cadre.parentElement);
  const dispo = cadre.parentElement.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const hMax = tel ? innerHeight * 0.4 : innerHeight - 200;
  const l = Math.max(200, Math.floor(Math.min(dispo, hMax * 16 / 9)));
  cadre.style.width = l + 'px';
  cadre.style.height = Math.round(l * 9 / 16) + 'px';
  if(mepS.apercu) mepS.apercu.ajuster();

  const bas = z.querySelector('#mepBasTel');
  bas.innerHTML = mepS.onglet === 'imminent' ? '' : '<button type="button" class="btn btn-secondary" id="mepBlocsTel">🧩 Les blocs</button>';
  const bt = bas.querySelector('#mepBlocsTel');
  if(bt) bt.addEventListener('click', () => { mepS.feuille = 'blocs'; mepS.choix = ''; dessinerMep(); });

  const panneau = z.querySelector('#mepPanneau'), feuille = z.querySelector('#mepFeuille');
  panneau.innerHTML = ''; feuille.innerHTML = '';
  const blocs = [];
  if(mepS.onglet === 'imminent') blocs.push(blocImminentMep());
  else{
    if(mepS.choix) blocs.push(blocReglagesMep());
    else if(!tel) blocs.push(Object.assign(document.createElement('div'), { className: 'stBloc',
      innerHTML: '<h4>✏️ Modifier</h4><div class="stPetit">Touche un bloc sur l’écran pour le modifier, glisse-le pour le déplacer, tire un coin pour changer sa taille.</div>' }));
    if(!tel || mepS.feuille === 'blocs') blocs.push(listeBlocsMep());
  }
  if(tel){
    const montrer = mepS.onglet === 'imminent' ? mepS.feuille === 'imminent' : (mepS.choix || mepS.feuille === 'blocs');
    if(mepS.onglet === 'imminent' && !montrer){
      bas.innerHTML = '<button type="button" class="btn btn-secondary" id="mepImmTel">⏰ Régler « Vos cours commencent »</button>';
      bas.querySelector('#mepImmTel').addEventListener('click', () => { mepS.feuille = 'imminent'; dessinerMep(); });
    }
    feuille.style.display = montrer ? 'block' : 'none';
    if(montrer){
      feuille.innerHTML = '<div class="poignee"></div><button type="button" class="stFermerFeuille" data-mact="fermerFeuille">✕</button>';
      blocs.forEach(b => feuille.appendChild(b));
    }
  }else{
    feuille.style.display = 'none';
    blocs.forEach(b => panneau.appendChild(b));
  }
  dessinerCalqueMep();
}

function dessinerCalqueMep(){
  const cal = document.getElementById('mepCalque');
  if(!cal || !mepS) return;
  cal.innerHTML = '';
  if(mepS.onglet === 'imminent') return;
  const s = (parseFloat(document.getElementById('mepCadre').style.width) || 1) / 1600;
  const defs = Tele.BLOCS[ouMep()];
  Object.keys(defs).forEach(k => {
    const p = mepS.places[k];
    if(!p) return;
    const d = document.createElement('div');
    d.className = 'mepZone' + (k === mepS.choix ? ' on' : '');
    d.dataset.bloc = k;
    d.style.left = p[0] * s + 'px'; d.style.top = p[1] * s + 'px';
    d.style.width = p[2] * s + 'px'; d.style.height = p[3] * s + 'px';
    if(k === mepS.choix){
      ['nw', 'ne', 'sw', 'se'].forEach(c => {
        const h = document.createElement('div');
        h.className = 'stPoignee p-' + c;
        h.dataset.poignee = c;
        h.style.left = (c[1] === 'w' ? 0 : p[2] * s) + 'px';
        h.style.top = (c[0] === 'n' ? 0 : p[3] * s) + 'px';
        h.style.margin = '-9px 0 0 -9px';
        d.appendChild(h);
      });
      const t = document.createElement('div');
      t.className = 'mepEtiquette';
      t.textContent = defs[k].titre;
      d.appendChild(t);
    }
    cal.appendChild(d);
  });
}

function pointeurMep(ev){
  if(!mepS || mepS.onglet === 'imminent') return;
  const cal = ev.currentTarget;
  const s = (parseFloat(document.getElementById('mepCadre').style.width) || 1) / 1600;
  const r = cal.getBoundingClientRect();
  const px = (ev.clientX - r.left) / s, py = (ev.clientY - r.top) / s;
  const defs = Tele.BLOCS[ouMep()];
  const poignee = ev.target.closest('[data-poignee]');
  let k = poignee ? mepS.choix : '';
  if(!k){
    /* le bloc du dessus : le plus haut, puis le plus petit */
    const touches = Object.keys(defs).filter(x => { const p = mepS.places[x]; return p && px >= p[0] && px <= p[0] + p[2] && py >= p[1] && py <= p[1] + p[3]; });
    touches.sort((a, b) => (defs[b].z - defs[a].z) || (mepS.places[a][2] * mepS.places[a][3] - mepS.places[b][2] * mepS.places[b][3]));
    k = touches[0] || '';
  }
  if(!k){ if(mepS.choix){ mepS.choix = ''; mepS.feuille = ''; dessinerMep(); } return; }
  ev.preventDefault();
  if(k !== mepS.choix){ mepS.choix = k; mepS.feuille = ''; dessinerMep(); }
  const b = mepS.cfg[ouMep()].blocs[k];
  const place = mepS.places[k] || [b.x, b.y, b.w, b.h];
  const depart = { x: ev.clientX, y: ev.clientY, b: Object.assign({}, b), place: place.slice() };
  let bouge = false, attente = false;
  try{ cal.setPointerCapture(ev.pointerId); }catch(e){}
  /* 📐 v1204 — un QR placé dans ⚙️ Réglages › 🔳 QR code garde cette place-là */
  const qrFixe = k === 'qr' && !!placeQrReglee(ouMep());
  let ditQr = false;
  const bouger = e2 => {
    const dx = (e2.clientX - depart.x) / s, dy = (e2.clientY - depart.y) / s;
    if(!bouge && Math.abs(dx) * s < 3 && Math.abs(dy) * s < 3) return;
    if(qrFixe){ if(!ditQr){ ditQr = true; showToast('📐 Sa place se règle dans ⚙️ Réglages › 🔳 QR code'); } return; }
    if(!bouge){ bouge = true; memoriserMep(); }
    const x = mepS.cfg[ouMep()].blocs[k];
    if(!poignee){
      x.x = Math.round(depart.b.x + dx); x.y = Math.round(depart.b.y + dy);
      mepS.places[k] = [depart.place[0] + dx, depart.place[1] + dy, depart.place[2], depart.place[3]];
    }else{
      const c = poignee.dataset.poignee;
      const g = c[1] === 'w', hh = c[0] === 'n';
      const nw = Math.max(40, depart.b.w + (g ? -dx : dx)), nh = Math.max(24, depart.b.h + (hh ? -dy : dy));
      x.w = Math.round(nw); x.h = Math.round(nh);
      if(g) x.x = Math.round(depart.b.x + depart.b.w - nw);
      if(hh) x.y = Math.round(depart.b.y + depart.b.h - nh);
      mepS.places[k] = [x.x, x.y, x.w, Tele.BLOCS[ouMep()][k].auto ? depart.place[3] : x.h];
    }
    dessinerCalqueMep();
    if(!attente){ attente = true; requestAnimationFrame(() => { attente = false; mepS.cfg = Tele.nettoyerMep(mepS.cfg); envoyerMep(); }); }
  };
  const lacher = () => {
    cal.removeEventListener('pointermove', bouger);
    cal.removeEventListener('pointerup', lacher);
    cal.removeEventListener('pointercancel', lacher);
    if(bouge){ mepS.cfg = Tele.nettoyerMep(mepS.cfg); envoyerMep(); dessinerMep(); }
  };
  cal.addEventListener('pointermove', bouger);
  cal.addEventListener('pointerup', lacher);
  cal.addEventListener('pointercancel', lacher);
}

/* ---------- Les réglages d'un bloc ---------- */
function blocReglagesMep(){
  const k = mepS.choix, ou = ouMep();
  const def = Tele.BLOCS[ou][k], b = mepS.cfg[ou].blocs[k];
  const z = document.createElement('div');
  z.className = 'stBloc';
  const libAccent = { planning: 'Les heures, le titre et les véhicules', bandeau: 'Le trait et les ◆', nom: 'La couleur du nom' }[k];
  z.innerHTML = '<h4>' + def.titre + '</h4>' +
    '<label class="stCocheL"><input type="checkbox" data-k="affiche"' + (b.cache ? '' : ' checked') + '> 👁️ À l’écran</label>' +
    (k === 'planning' ? '<label for="mepTitre">Le titre</label><input type="text" id="mepTitre" maxlength="60" placeholder="📅 Les cours à venir">' : '') +
    (k === 'qr' ? '<div class="stPetit" style="margin:4px 0;">🔒 Le code lui-même reste noir sur blanc, avec sa marge blanche : c’est ce qui permet aux téléphones de le lire. La phrase se change dans « 🔳 QR code » plus haut.' +
      (placeQrReglee(ou) ? ' 📐 Sa place et sa taille aussi : elles y sont réglées pour cet écran.' : '') + '</div>' : '') +
    '<label>Le fond</label><div data-coul="fond">' + couleursTele(b.fond, 'Automatique : comme d’origine ou selon le thème') + '</div>' +
    '<label>Le contour</label><div data-coul="contour">' + couleursTele(b.contour, 'Sans contour ajouté') + '</div>' +
    (k !== 'scene' ? '<label>Le texte</label><div data-coul="texte">' + couleursTele(b.texte, 'Automatique') + '</div>' : '') +
    (libAccent ? '<label>' + libAccent + '</label><div data-coul="accent">' + couleursTele(b.accent, 'Automatique : la couleur du thème') + '</div>' : '') +
    '<label>La forme</label><div class="stChips">' + [[-1, 'Comme d’origine'], [0, 'Droits'], [14, 'Doux'], [26, 'Arrondis'], [44, 'Très arrondis'], [200, 'Pilule']]
      .map(([v, t]) => '<button type="button" class="btn ' + (b.rayon === v ? 'btn-primary' : 'btn-secondary') + '" data-rayon="' + v + '">' + t + '</button>').join('') + '</div>' +
    (k !== 'scene' ? '<label>La taille du texte · <span id="mepTailleV">' + b.taille + ' %</span></label><input class="stCurseur" type="range" min="50" max="200" step="5" value="' + b.taille + '" id="mepTaille">' : '') +
    (k === 'planning' ? '<label>On affiche</label>' + [['moniteur', 'Le moniteur'], ['vehicule', 'Le véhicule'], ['lieu', 'Le lieu'], ['ecoutes', '👂 Les élèves en écoute pédagogique (sous chaque cours)']]
      .map(([c, t]) => '<label class="stCocheL"><input type="checkbox" data-montre="' + c + '"' + (b[c] ? ' checked' : '') + '> ' + t + '</label>').join('') : '') +
    '<div class="stPetit" style="margin:8px 0 4px;">Place : ' + b.x + ', ' + b.y + ' · ' + b.w + ' × ' + b.h + '</div>' +
    '<button type="button" class="btn btn-secondary" data-mact="blocAvant">↺ Ce bloc comme avant</button>';
  const ti = z.querySelector('#mepTitre');
  if(ti){
    ti.value = b.titre;
    let premier = true;
    ti.addEventListener('input', () => { if(premier){ memoriserMep(); premier = false; } mepS.cfg[ou].blocs[k].titre = ti.value; mepS.cfg = Tele.nettoyerMep(mepS.cfg); envoyerMep(); });
  }
  z.querySelector('[data-k="affiche"]').addEventListener('change', ev => changerMep(() => { mepS.cfg[ou].blocs[k].cache = ev.target.checked ? 0 : 1; }, true));
  z.querySelectorAll('[data-coul]').forEach(zz => {
    const champ = zz.dataset.coul;
    zz.querySelectorAll('[data-c]').forEach(x => x.addEventListener('click', () => changerMep(() => { mepS.cfg[ou].blocs[k][champ] = x.dataset.c; }, true)));
    const i = zz.querySelector('input[type=color]');
    i.addEventListener('input', () => { mepS.cfg[ou].blocs[k][champ] = i.value; mepS.cfg = Tele.nettoyerMep(mepS.cfg); envoyerMep(); });
    i.addEventListener('change', () => changerMep(() => { mepS.cfg[ou].blocs[k][champ] = i.value; }, true));
  });
  z.querySelectorAll('[data-rayon]').forEach(x => x.addEventListener('click', () => changerMep(() => { mepS.cfg[ou].blocs[k].rayon = Number(x.dataset.rayon); }, true)));
  z.querySelectorAll('[data-montre]').forEach(x => x.addEventListener('change', () => changerMep(() => { mepS.cfg[ou].blocs[k][x.dataset.montre] = x.checked ? 1 : 0; }, true)));
  const ta = z.querySelector('#mepTaille');
  if(ta){
    let premier = true;
    ta.addEventListener('input', () => {
      if(premier){ memoriserMep(); premier = false; }
      mepS.cfg[ou].blocs[k].taille = Number(ta.value);
      z.querySelector('#mepTailleV').textContent = ta.value + ' %';
      mepS.cfg = Tele.nettoyerMep(mepS.cfg); envoyerMep();
    });
    ta.addEventListener('change', () => { premier = true; });
  }
  return z;
}

function listeBlocsMep(){
  const ou = ouMep();
  const z = document.createElement('div');
  z.className = 'stBloc';
  z.innerHTML = '<h4>🧩 Les blocs de l’écran</h4><div class="stBlocs"></div>' +
    '<div class="stPetit" style="margin-top:6px;">👁️ pour en masquer un. Touche un nom pour le choisir.</div>';
  const l = z.querySelector('.stBlocs');
  Object.keys(Tele.BLOCS[ou]).forEach(k => {
    const b = mepS.cfg[ou].blocs[k];
    const r = document.createElement('div');
    r.className = 'stBlocLigne' + (k === mepS.choix ? ' on' : '') + (b.cache ? ' cache' : '');
    r.innerHTML = '<span class="n"></span><button type="button" class="oeil" title="' + (b.cache ? 'Remettre à l’écran' : 'Masquer') + '">' + (b.cache ? '🙈' : '👁️') + '</button>';
    r.querySelector('.n').textContent = Tele.BLOCS[ou][k].titre;
    r.querySelector('.n').addEventListener('click', () => { mepS.choix = k; mepS.feuille = ''; dessinerMep(); });
    r.querySelector('.oeil').addEventListener('click', () => changerMep(() => { mepS.cfg[ou].blocs[k].cache = b.cache ? 0 : 1; }, true));
    l.appendChild(r);
  });
  return z;
}

/* ---------- ⏰ « Vos cours commencent » ---------- */
function blocImminentMep(){
  const i = mepS.cfg.imminent;
  const z = document.createElement('div');
  z.className = 'stBloc';
  z.innerHTML = '<h4>⏰ Vos cours commencent</h4>' +
    '<label for="mepT1">Le titre (un cours)</label><input type="text" id="mepT1" maxlength="60">' +
    '<label for="mepT2">Le titre (plusieurs)</label><input type="text" id="mepT2" maxlength="60">' +
    '<label>Derrière les cartes</label><div class="stChips">' + [['voile', 'Voile'], ['couleur', 'Couleur'], ['photo', '📷 Photo']]
      .map(([k, t]) => '<button type="button" class="btn ' + (i.derriere === k ? 'btn-primary' : 'btn-secondary') + '" data-derriere="' + k + '">' + t + '</button>').join('') + '</div>' +
    (i.derriere === 'photo' ? '<button type="button" class="btn btn-secondary" id="mepImmPhoto">📷 ' + (i.cle ? 'Changer la photo' : 'Choisir une photo') + '</button>'
                            : '<div data-icoul="couleur">' + couleursTele(i.couleur, '') + '</div>') +
    (i.derriere !== 'couleur' ? '<label>Assombrir · <span id="mepAssV">' + Math.round(i.assombrir * 100) + ' %</span></label><input class="stCurseur" type="range" min="0" max="95" value="' + Math.round(i.assombrir * 100) + '" id="mepAss">' : '') +
    '<label>Les cartes</label><div data-icoul="carte">' + couleursTele(i.carte, 'Comme d’origine') + '</div>' +
    '<label>Le texte des cartes</label><div data-icoul="carteTexte">' + couleursTele(i.carteTexte, 'Comme d’origine') + '</div>' +
    '<label>La forme des cartes</label><div class="stChips">' + [[0, 'Droites'], [14, 'Douces'], [26, 'Arrondies'], [44, 'Très arrondies']]
      .map(([v, t]) => '<button type="button" class="btn ' + (i.rayon === v ? 'btn-primary' : 'btn-secondary') + '" data-irayon="' + v + '">' + t + '</button>').join('') + '</div>' +
    '<label>L’heure</label><div class="stChips">' + [['texte', 'En texte'], ['pastille', 'En pastille']]
      .map(([k, t]) => '<button type="button" class="btn ' + (i.heure === k ? 'btn-primary' : 'btn-secondary') + '" data-iheure="' + k + '">' + t + '</button>').join('') + '</div>' +
    '<label>On affiche</label>' +
    '<label class="stCocheL"><input type="checkbox" data-imontre="moniteur"' + (i.moniteur ? ' checked' : '') + '> « avec » le moniteur</label>' +
    '<label class="stCocheL"><input type="checkbox" data-imontre="vehicule"' + (i.vehicule ? ' checked' : '') + '> Le véhicule et le lieu</label>' +
    /* 👂 v1291 — les élèves en écoute pédagogique, dans la carte de leur voiture */
    '<label class="stCocheL"><input type="checkbox" data-imontre="ecoutes"' + (i.ecoutes ? ' checked' : '') + '> 👂 Les élèves en écoute pédagogique</label>' +
    (i.ecoutes ? '<label>Les écoutes, où ?</label><div class="stChips">' + [['nom', 'Sous l’élève'], ['bas', 'En bas de la carte']]
        .map(([k, t]) => '<button type="button" class="btn ' + (i.ecoutesOu === k ? 'btn-primary' : 'btn-secondary') + '" data-iecou="' + k + '">' + t + '</button>').join('') + '</div>' +
      '<label for="mepEcMot">Le mot devant leurs noms</label><input type="text" id="mepEcMot" maxlength="30">' +
      '<label>Le texte des écoutes</label><div data-icoul="ecoutesCouleur">' + couleursTele(i.ecoutesCouleur, 'Comme d’origine') + '</div>' +
      '<label class="stCocheL"><input type="checkbox" data-imontre="ecoutesSansCase"' + (i.ecoutesSansCase ? ' checked' : '') + '> Une écoute sans voiture : « passe voir le bureau »</label>' +
      '<div class="stPetit">Seulement les écoutes de Saint-Brieuc, dans la carte de la voiture qu’on lui a annoncée la veille. Un élève déjà pointé par son moniteur ne s’affiche plus.</div>' : '') +
    '<div class="stPetit">Pendant ce plein écran, le QR se retire.</div>';
  const t1 = z.querySelector('#mepT1'), t2 = z.querySelector('#mepT2');
  t1.value = i.titre1; t2.value = i.titre2;
  [[t1, 'titre1'], [t2, 'titre2']].forEach(([c, k]) => {
    let premier = true;
    c.addEventListener('input', () => { if(premier){ memoriserMep(); premier = false; } mepS.cfg.imminent[k] = c.value; mepS.cfg = Tele.nettoyerMep(mepS.cfg); envoyerMep(); });
  });
  z.querySelectorAll('[data-derriere]').forEach(x => x.addEventListener('click', () => {
    if(x.dataset.derriere === 'photo' && !i.cle){
      ouvrirPhotosStudio(cle => changerMep(() => { mepS.cfg.imminent.derriere = 'photo'; mepS.cfg.imminent.cle = cle; }, true));
      return;
    }
    changerMep(() => { mepS.cfg.imminent.derriere = x.dataset.derriere; }, true);
  }));
  const ph = z.querySelector('#mepImmPhoto');
  if(ph) ph.addEventListener('click', () => ouvrirPhotosStudio(cle => changerMep(() => { mepS.cfg.imminent.cle = cle; }, true)));
  z.querySelectorAll('[data-icoul]').forEach(zz => {
    const champ = zz.dataset.icoul;
    zz.querySelectorAll('[data-c]').forEach(x => x.addEventListener('click', () => changerMep(() => { mepS.cfg.imminent[champ] = x.dataset.c; }, true)));
    const c = zz.querySelector('input[type=color]');
    c.addEventListener('input', () => { mepS.cfg.imminent[champ] = c.value; mepS.cfg = Tele.nettoyerMep(mepS.cfg); envoyerMep(); });
    c.addEventListener('change', () => changerMep(() => { mepS.cfg.imminent[champ] = c.value; }, true));
  });
  const as = z.querySelector('#mepAss');
  if(as){
    let premier = true;
    as.addEventListener('input', () => {
      if(premier){ memoriserMep(); premier = false; }
      mepS.cfg.imminent.assombrir = Number(as.value) / 100;
      z.querySelector('#mepAssV').textContent = as.value + ' %';
      mepS.cfg = Tele.nettoyerMep(mepS.cfg); envoyerMep();
    });
  }
  z.querySelectorAll('[data-irayon]').forEach(x => x.addEventListener('click', () => changerMep(() => { mepS.cfg.imminent.rayon = Number(x.dataset.irayon); }, true)));
  z.querySelectorAll('[data-iheure]').forEach(x => x.addEventListener('click', () => changerMep(() => { mepS.cfg.imminent.heure = x.dataset.iheure; }, true)));
  z.querySelectorAll('[data-imontre]').forEach(x => x.addEventListener('change', () => changerMep(() => { mepS.cfg.imminent[x.dataset.imontre] = x.checked ? 1 : 0; }, true)));
  z.querySelectorAll('[data-iecou]').forEach(x => x.addEventListener('click', () => changerMep(() => { mepS.cfg.imminent.ecoutesOu = x.dataset.iecou; }, true)));
  const em = z.querySelector('#mepEcMot');
  if(em){
    em.value = i.ecoutesMot;
    let premier = true;
    em.addEventListener('input', () => { if(premier){ memoriserMep(); premier = false; } mepS.cfg.imminent.ecoutesMot = em.value; mepS.cfg = Tele.nettoyerMep(mepS.cfg); envoyerMep(); });
  }
  return z;
}

async function enregistrerMep(){
  const nom = String(document.getElementById('mepNom').value || '').trim();
  if(!nom){ showToast('Donne un nom à cette mise en page.'); return; }
  const neuve = !mepS.id;
  try{
    const r = await appelPrep({ action: 'ecranMisePoser', id: mepS.id, titre: nom, config: JSON.stringify(Tele.nettoyerMep(mepS.cfg)) });
    majTeleEcran(r);
    const id = r && r.id;
    mepS.modifie = false;
    fermerCoquilleTele(mepS); mepS = null;
    showToast('Mise en page enregistrée ✅');
    if(neuve && id && await confirmer('La mettre en service tout de suite, à l’accueil et à la vitrine ?')){
      majTeleEcran(await appelPrep({ action: 'ecranMiseUtiliser', ou: 'accueil', id: id }));
      majTeleEcran(await appelPrep({ action: 'ecranMiseUtiliser', ou: 'vitrine', id: id }));
      showToast('En service ✅ (dans la minute sur les télés)');
    }
    dessinerOngletEcran();
  }catch(e){ showToast('Impossible : ' + e.message); }
}

/* ============================================================
   🎨 LE STUDIO D'UN THÈME
   ============================================================ */
let thS = null;
async function ouvrirThemeStudio(th){
  if(typeof Tele === 'undefined'){ showToast('Le fichier ec-tele.js manque : recharge la page.'); return; }
  thS = { id: th.id || '', base: !!th.base, modifie_en_base: !!th.modifie, cfg: Tele.nettoyerTheme(JSON.parse(JSON.stringify(th.config || {})), th.id || ''),
          actif: th.actif !== false, vitrine: th.vitrine !== false, ou: 'accueil', pause: false, modifie: false, feuille: '' };
  const z = coquilleTele({ boutons:
    '<button type="button" class="btn btn-secondary" data-tact="pause">⏸️ <span class="stLarge">Arrêter l’animation</span></button>' +
    (thS.base ? (thS.modifie_en_base ? '<button type="button" class="btn btn-secondary stLarge" data-tact="avant">↺ Comme avant</button>' : '')
              : (thS.id ? '<button type="button" class="btn btn-secondary stRouge" data-tact="supprimer" title="Supprimer ce thème">🗑️</button>' : '')) });
  z.querySelector('#mepNom').value = thS.cfg.nom;
  z.querySelector('#mepNom').addEventListener('input', ev => { thS.cfg.nom = ev.target.value; thS.modifie = true; });
  z.addEventListener('click', ev => {
    const a = ev.target.closest('[data-tact]') || ev.target.closest('[data-mact]');
    if(a) actionTheme(a.dataset.tact || a.dataset.mact);
  });
  thS.redim = () => dessinerTheme();
  addEventListener('resize', thS.redim);
  dessinerTheme();
  thS.fixeChoix = -1; thS.fixesRendus = [];
  const etat = thS;
  thS.apercu = await apercuTele(z.querySelector('#mepCadre'), 'accueil', (places, o) => {
    if(thS !== etat || o !== etat.ou || etat.glisse) return;
    etat.fixesRendus = (places && Array.isArray(places.fixes)) ? places.fixes : [];
    dessinerCalqueTheme();
  });
  envoyerTheme();
  z.querySelector('#mepCalque').addEventListener('pointerdown', pointeurTheme);
}

/* ============================================================
   🖼️ v1205 — LES DÉCORS FIXES, GLISSÉS SUR LA TÉLÉ EN PETIT

   La télé en petit renvoie la place de chacun (en 1600 × 900) ; on
   dessine un cadre par-dessus. Un appui le choisit, glisser le
   déplace, le coin ◢ change sa taille (sans le déformer). La place
   va dans l'écran de l'onglet (🏠 Accueil ou 🪟 Vitrine).
   ============================================================ */
function dessinerCalqueTheme(){
  const cal = document.getElementById('mepCalque');
  if(!cal || !thS) return;
  cal.innerHTML = '';
  const s = (parseFloat(document.getElementById('mepCadre').style.width) || 1) / 1600;
  (thS.fixesRendus || []).forEach(p => {
    const i = p[0];
    const d = document.createElement('div');
    d.className = 'mepZone thFixe' + (i === thS.fixeChoix ? ' on' : '');
    d.dataset.fixe = String(i);
    d.style.left = p[1] * s + 'px'; d.style.top = p[2] * s + 'px';
    d.style.width = p[3] * s + 'px'; d.style.height = p[4] * s + 'px';
    if(i === thS.fixeChoix){
      const h = document.createElement('div');
      h.className = 'stPoignee p-se';
      h.dataset.poignee = 'se';
      h.style.left = p[3] * s + 'px'; h.style.top = p[4] * s + 'px';
      d.appendChild(h);
      const t = document.createElement('div');
      t.className = 'mepEtiquette';
      t.textContent = '🖼️ Décor ' + (i + 1);
      d.appendChild(t);
    }
    cal.appendChild(d);
  });
}
function pointeurTheme(ev){
  if(!thS) return;
  const cal = ev.currentTarget;
  const s = (parseFloat(document.getElementById('mepCadre').style.width) || 1) / 1600;
  const r = cal.getBoundingClientRect();
  const px = (ev.clientX - r.left) / s, py = (ev.clientY - r.top) / s;
  const poignee = ev.target.closest('[data-poignee]');
  let p = null;
  if(poignee) p = (thS.fixesRendus || []).find(x => x[0] === thS.fixeChoix) || null;
  else{
    /* le dernier posé est au-dessus : on cherche depuis la fin */
    const l = (thS.fixesRendus || []).slice().reverse();
    p = l.find(x => px >= x[1] && px <= x[1] + x[3] && py >= x[2] && py <= x[2] + x[4]) || null;
  }
  if(!p){ if(thS.fixeChoix !== -1){ thS.fixeChoix = -1; dessinerCalqueTheme(); } return; }
  ev.preventDefault();
  const i = p[0], ou = thS.ou;
  if(thS.fixeChoix !== i){ thS.fixeChoix = i; dessinerCalqueTheme(); }
  const depart = { x: ev.clientX, y: ev.clientY, p: p.slice() };
  const etat = thS;
  let attente = false;
  try{ cal.setPointerCapture(ev.pointerId); }catch(e){}
  const bouger = e2 => {
    const dx = (e2.clientX - depart.x) / s, dy = (e2.clientY - depart.y) / s;
    if(!etat.glisse && Math.abs(dx) * s < 3 && Math.abs(dy) * s < 3) return;
    etat.glisse = true; etat.modifie = true;
    let x = depart.p[1], y = depart.p[2], w = depart.p[3];
    if(poignee) w = Math.min(1600, Math.max(30, depart.p[3] + Math.max(dx, dy * depart.p[3] / Math.max(1, depart.p[4]))));
    else{ x = depart.p[1] + dx; y = depart.p[2] + dy; }
    x = Math.round(Math.min(1600, Math.max(-800, x))); y = Math.round(Math.min(900, Math.max(-600, y))); w = Math.round(w);
    const f = etat.cfg.animation.fixes[i];
    if(!f) return;
    f[ou] = { x: x, y: y, w: w };
    const h = Math.round(depart.p[4] * w / Math.max(1, depart.p[3]));
    etat.fixesRendus = etat.fixesRendus.map(q => q[0] === i ? [i, x, y, w, h] : q);
    dessinerCalqueTheme();
    if(!attente){ attente = true; requestAnimationFrame(() => { attente = false; envoyerTheme(); }); }
  };
  const lacher = () => {
    cal.removeEventListener('pointermove', bouger);
    cal.removeEventListener('pointerup', lacher);
    cal.removeEventListener('pointercancel', lacher);
    const avait = etat.glisse;
    etat.glisse = false;
    if(avait){ etat.cfg = Tele.nettoyerTheme(etat.cfg, etat.id); envoyerTheme(); }
  };
  cal.addEventListener('pointermove', bouger);
  cal.addEventListener('pointerup', lacher);
  cal.addEventListener('pointercancel', lacher);
}
function envoyerTheme(){
  if(thS && thS.apercu) thS.apercu.envoyer({ theme: Tele.nettoyerTheme(thS.cfg, thS.id), pause: thS.pause, liens: liensAbsolus() });
}
function changerTheme(fn){
  thS.modifie = true;
  fn();
  thS.cfg = Tele.nettoyerTheme(thS.cfg, thS.id);
  envoyerTheme();
  dessinerTheme();
}
async function actionTheme(a){
  if(!thS) return;
  if(a === 'fermer'){
    if(thS.modifie && !await confirmer('Fermer sans enregistrer ? Les changements seront perdus.')) return;
    fermerCoquilleTele(thS); thS = null; return;
  }
  if(a === 'pause'){
    thS.pause = !thS.pause;
    const b = document.querySelector('#mepStudio [data-tact="pause"]');
    if(b) b.innerHTML = thS.pause ? '▶️ <span class="stLarge">Remettre l’animation</span>' : '⏸️ <span class="stLarge">Arrêter l’animation</span>';
    envoyerTheme(); return;
  }
  if(a === 'fermerFeuille'){ thS.feuille = ''; dessinerTheme(); return; }
  if(a === 'avant' || a === 'supprimer'){
    if(!await confirmer(a === 'avant' ? 'Remettre « ' + thS.cfg.nom + ' » comme à l’origine ?' : 'Supprimer le thème « ' + thS.cfg.nom + ' » ?')) return;
    try{
      majTeleEcran(await appelPrep({ action: 'ecranThemeRetirer', id: thS.id }));
      thS.modifie = false; fermerCoquilleTele(thS); thS = null;
      showToast(a === 'avant' ? 'Thème remis comme avant ✅' : 'Thème supprimé ✅');
      dessinerOngletEcran();
    }catch(e){ showToast('Impossible : ' + e.message); }
    return;
  }
  if(a === 'enregistrer'){
    const cfg = Tele.nettoyerTheme(thS.cfg, thS.id);
    if(!String(cfg.nom).trim()){ showToast('Donne un nom à ce thème.'); return; }
    try{
      majTeleEcran(await appelPrep({ action: 'ecranThemePoser', id: thS.id, config: JSON.stringify(cfg), actif: thS.actif ? '1' : '0', vitrine: thS.vitrine ? '1' : '0' }));
      thS.modifie = false; fermerCoquilleTele(thS); thS = null;
      showToast('Thème enregistré ✅ (dans la minute sur les télés)');
      dessinerOngletEcran();
    }catch(e){ showToast('Impossible : ' + e.message); }
  }
}

function dessinerTheme(){
  if(!thS) return;
  const z = document.getElementById('mepStudio');
  if(!z) return;
  const tel = telTele();
  z.classList.toggle('stTel', tel);
  const og = z.querySelector('#mepOnglets');
  og.innerHTML = [['accueil', '🏠 Accueil'], ['vitrine', '🪟 Vitrine']].map(([k, t]) =>
    '<button type="button" class="btn ' + (thS.ou === k ? 'btn-primary' : 'btn-secondary') + '" data-ou="' + k + '">' + t + '</button>').join('') +
    (tel ? '' : '<span class="info">Ça bouge ici comme sur la télé</span>');
  og.querySelectorAll('[data-ou]').forEach(b => b.addEventListener('click', () => {
    thS.ou = b.dataset.ou;
    thS.fixesRendus = [];
    if(thS.apercu){ thS.apercu.changerOu(thS.ou); envoyerTheme(); }
    dessinerTheme();
  }));
  const cadre = z.querySelector('#mepCadre');
  const cs = getComputedStyle(cadre.parentElement);
  const dispo = cadre.parentElement.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const l = Math.max(200, Math.floor(Math.min(dispo, (tel ? innerHeight * 0.4 : innerHeight - 200) * 16 / 9)));
  cadre.style.width = l + 'px';
  cadre.style.height = Math.round(l * 9 / 16) + 'px';
  if(thS.apercu) thS.apercu.ajuster();
  dessinerCalqueTheme();
  const bas = z.querySelector('#mepBasTel');
  bas.innerHTML = [['animation', '✨ L’animation'], ['couleurs', '🎨 Les couleurs'], ['quand', '🗓️ Quand']]
    .map(([k, t]) => '<button type="button" class="btn btn-secondary" data-feuilleth="' + k + '">' + t + '</button>').join('');
  bas.querySelectorAll('[data-feuilleth]').forEach(b => b.addEventListener('click', () => { thS.feuille = b.dataset.feuilleth; dessinerTheme(); }));
  const panneau = z.querySelector('#mepPanneau'), feuille = z.querySelector('#mepFeuille');
  panneau.innerHTML = ''; feuille.innerHTML = '';
  const tous = { animation: blocAnimationTheme, couleurs: blocCouleursTheme, quand: blocQuandTheme };
  if(tel){
    feuille.style.display = thS.feuille ? 'block' : 'none';
    if(thS.feuille){
      feuille.innerHTML = '<div class="poignee"></div><button type="button" class="stFermerFeuille" data-mact="fermerFeuille">✕</button>';
      feuille.appendChild(tous[thS.feuille]());
    }
  }else{
    feuille.style.display = 'none';
    Object.keys(tous).forEach(k => panneau.appendChild(tous[k]()));
  }
}

function blocAnimationTheme(){
  const a = thS.cfg.animation;
  const z = document.createElement('div');
  z.className = 'stBloc';
  z.innerHTML = '<h4>✨ L’animation</h4><label>Les petites images</label><div class="stLutins"></div>' +
    '<div class="stPetit" style="margin:-2px 0 8px;">« ➕ Ta photo » : une image à toi (un PNG détouré, un bonbon, le logo…) devient une petite image animée.</div>' +
    '<label>Ce qu’elles font</label><div class="stChips">' + [['', 'Comme d’habitude'], ['tombe', '⬇️ Tombent'], ['monte', '⬆️ Montent'], ['traverse', '↔️ Traversent']]
      .map(([k, t]) => '<button type="button" class="btn ' + (a.sens === k ? 'btn-primary' : 'btn-secondary') + '" data-sens="' + k + '">' + t + '</button>').join('') + '</div>' +
    [['quantite', 'Combien'], ['vitesse', 'Vitesse'], ['taille', 'Taille']].map(([k, t]) =>
      '<label>' + t + '</label><input class="stCurseur" type="range" min="0" max="100" value="' + a[k] + '" data-curseur="' + k + '">').join('') +
    '<label>Les décors fixes</label>' + Object.keys(Tele.DECORS).map(k =>
      '<label class="stCocheL"><input type="checkbox" data-decor="' + k + '"' + (a.decors.indexOf(k) !== -1 ? ' checked' : '') + '> ' + Tele.DECORS[k] + '</label>').join('') +
    '<label>🖼️ Tes décors fixes</label><div class="thFixes"></div>' +
    '<div class="stPetit" style="margin:2px 0 8px;">Un PNG détouré (une guirlande, des feuilles, un sapin…) posé où tu veux. Glisse-le sur la télé, ' +
      'tire le coin ◢ pour sa taille. Une place pour 🏠 l’accueil, une pour 🪟 la vitrine (les onglets au-dessus de la télé). ' +
      'Il passe derrière les cours, le QR et la météo.</div>';
  const g = z.querySelector('.stLutins');
  Object.keys(Tele.LUTINS).forEach(k => {
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'stLutin' + (a.lutins.indexOf(k) !== -1 ? ' on' : '');
    t.dataset.lutin = k;
    const v = Tele.vignetteLutin(k);
    if(v){ v.className = 'stLutinImg'; t.appendChild(v); }
    t.appendChild(document.createTextNode(Tele.LUTINS[k].nom));
    t.addEventListener('click', () => changerTheme(() => {
      const l = thS.cfg.animation.lutins, i = l.indexOf(k);
      if(i === -1) l.push(k); else l.splice(i, 1);
    }));
    g.appendChild(t);
  });
  a.photos.forEach(cle => {
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'stLutin on';
    t.title = 'Retirer cette image';
    t.innerHTML = '<span class="stLutinPhoto"></span>✕ Retirer';
    t.querySelector('.stLutinPhoto').style.backgroundImage = 'url("' + String(lienStudio(cle)).replace(/"/g, '%22') + '")';
    t.addEventListener('click', () => changerTheme(() => { thS.cfg.animation.photos = thS.cfg.animation.photos.filter(x => x !== cle); }));
    g.appendChild(t);
  });
  if(a.photos.length < 6){
    const p = document.createElement('button');
    p.type = 'button';
    p.className = 'stLutin';
    p.innerHTML = '<span class="stLutinPhoto vide">🖼️</span>➕ Ta photo';
    p.addEventListener('click', () => ouvrirPhotosStudio(cle => changerTheme(() => {
      if(thS.cfg.animation.photos.indexOf(cle) === -1) thS.cfg.animation.photos.push(cle);
    })));
    g.appendChild(p);
  }
  /* 🖼️ v1205 — tes décors fixes */
  const gf = z.querySelector('.thFixes');
  a.fixes.forEach((f, i) => {
    const t = document.createElement('div');
    t.className = 'thFixe1' + (i === thS.fixeChoix ? ' on' : '');
    t.innerHTML = '<span class="stLutinPhoto"></span><span class="thFixeNom">Décor ' + (i + 1) + '</span>' +
      '<button type="button" class="btn btn-secondary" data-fx="choisir">🎯 Le montrer</button>' +
      '<button type="button" class="btn btn-secondary" data-fx="retirer" title="Retirer ce décor">✕</button>';
    t.querySelector('.stLutinPhoto').style.backgroundImage = 'url("' + String(lienStudio(f.cle)).replace(/"/g, '%22') + '")';
    t.querySelector('[data-fx="choisir"]').addEventListener('click', () => { thS.fixeChoix = i; dessinerCalqueTheme(); });
    t.querySelector('[data-fx="retirer"]').addEventListener('click', () => changerTheme(() => {
      thS.cfg.animation.fixes.splice(i, 1);
      thS.fixeChoix = -1;
    }));
    gf.appendChild(t);
  });
  if(a.fixes.length < 6){
    const p = document.createElement('button');
    p.type = 'button';
    p.className = 'btn btn-secondary';
    p.textContent = '➕ Ajouter un décor (PNG)';
    p.addEventListener('click', () => ouvrirPhotosStudio(cle => changerTheme(() => {
      const d = Tele.PLACE_FIXE_DEFAUT;
      thS.cfg.animation.fixes.push({ cle: cle, accueil: Object.assign({}, d), vitrine: Object.assign({}, d) });
      thS.fixeChoix = thS.cfg.animation.fixes.length - 1;
    })));
    gf.appendChild(p);
  }
  z.querySelectorAll('[data-sens]').forEach(x => x.addEventListener('click', () => changerTheme(() => { thS.cfg.animation.sens = x.dataset.sens; })));
  z.querySelectorAll('[data-curseur]').forEach(x => x.addEventListener('change', () => changerTheme(() => { thS.cfg.animation[x.dataset.curseur] = Number(x.value); })));
  z.querySelectorAll('[data-decor]').forEach(x => x.addEventListener('change', () => changerTheme(() => {
    const l = thS.cfg.animation.decors, i = l.indexOf(x.dataset.decor);
    if(x.checked && i === -1) l.push(x.dataset.decor);
    if(!x.checked && i !== -1) l.splice(i, 1);
  })));
  return z;
}

function blocCouleursTheme(){
  const c = thS.cfg;
  const z = document.createElement('div');
  z.className = 'stBloc';
  z.innerHTML = '<h4>🎨 Les couleurs du thème</h4>' +
    '<label>La couleur principale (titres, heures, véhicules)</label><div data-tcoul="accent">' + couleursTele(c.accent, 'Sans : le citron de l’école') + '</div>' +
    '<label>Le fond de l’écran (au centre)</label><div data-tcoul="fond1">' + couleursTele(c.fond1, 'Sans : le fond d’origine') + '</div>' +
    '<label>Le fond de l’écran (sur les bords)</label><div data-tcoul="fond2">' + couleursTele(c.fond2, 'Sans') + '</div>' +
    '<label>Le fond des cartes (cours à venir, météo)</label><div data-tcoul="carte">' + couleursTele(c.carte, 'Sans : comme d’origine') + '</div>' +
    '<label>Le bandeau du haut</label><div data-tcoul="entete">' + couleursTele(c.entete, 'Sans : comme d’origine') + '</div>';
  z.querySelectorAll('[data-tcoul]').forEach(zz => {
    const champ = zz.dataset.tcoul;
    zz.querySelectorAll('[data-c]').forEach(x => x.addEventListener('click', () => changerTheme(() => { thS.cfg[champ] = x.dataset.c; })));
    const i = zz.querySelector('input[type=color]');
    i.addEventListener('input', () => { thS.cfg[champ] = i.value; thS.modifie = true; envoyerTheme(); });
    i.addEventListener('change', () => changerTheme(() => { thS.cfg[champ] = i.value; }));
  });
  return z;
}

function blocQuandTheme(){
  const c = thS.cfg;
  const z = document.createElement('div');
  z.className = 'stBloc';
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const choixDate = (id, md) => '<div class="mepDate"><select data-jour="' + id + '">' + Array.from({ length: 31 }, (_, i) => i + 1)
      .map(j => '<option value="' + String(j).padStart(2, '0') + '"' + (Number(md.slice(3, 5)) === j ? ' selected' : '') + '>' + j + '</option>').join('') + '</select>' +
    '<select data-mois="' + id + '">' + mois.map((m, i) => '<option value="' + String(i + 1).padStart(2, '0') + '"' + (Number(md.slice(0, 2)) === i + 1 ? ' selected' : '') + '>' + m + '</option>').join('') + '</select></div>';
  z.innerHTML = '<h4>🗓️ Quand</h4><div class="stChips">' +
      '<button type="button" class="btn ' + (!c.paques ? 'btn-primary' : 'btn-secondary') + '" data-paques="0">Des dates</button>' +
      '<button type="button" class="btn ' + (c.paques ? 'btn-primary' : 'btn-secondary') + '" data-paques="1">🥚 La semaine de Pâques</button></div>' +
    (c.paques ? '<div class="stPetit">Calculée chaque année : ' + echEcran(texteDesDates(c)) + '.</div>'
              : '<label>Du</label>' + choixDate('du', c.du) + '<label>Au</label>' + choixDate('au', c.au) + '<div class="stPetit">Chaque année, sans rien refaire.</div>') +
    '<label class="stCocheL"><input type="checkbox" data-th="fete"' + (c.fete ? ' checked' : '') + '> 🎉 C’est une fête : elle passe avant les saisons</label>' +
    '<h4 style="margin-top:12px;">📺 Les écrans</h4>' +
    '<label class="stCocheL"><input type="checkbox" data-th="actif"' + (thS.actif ? ' checked' : '') + '> Allumé</label>' +
    '<label class="stCocheL"><input type="checkbox" data-th="vitrine"' + (thS.vitrine ? ' checked' : '') + '> 🪟 Aussi sur la vitrine</label>';
  z.querySelectorAll('[data-paques]').forEach(x => x.addEventListener('click', () => changerTheme(() => { thS.cfg.paques = x.dataset.paques === '1'; })));
  ['du', 'au'].forEach(k => {
    const j = z.querySelector('[data-jour="' + k + '"]'), m = z.querySelector('[data-mois="' + k + '"]');
    if(!j) return;
    const maj = () => changerTheme(() => { thS.cfg[k] = m.value + '-' + j.value; });
    j.addEventListener('change', maj); m.addEventListener('change', maj);
  });
  z.querySelectorAll('[data-th]').forEach(x => x.addEventListener('change', () => {
    const k = x.dataset.th;
    if(k === 'fete') changerTheme(() => { thS.cfg.fete = x.checked; });
    else{ thS[k] = x.checked; thS.modifie = true; }
  }));
  return z;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-mep.js'] = true;

/* ============================================================
   📐 v1204 — LA PLACE ET LA TAILLE DU QR, SUR LA TÉLÉ EN PETIT

   David, le 17 octobre : « je veux qu'il aille dessus et que je
   puisse régler sa taille et sa position directement sans avoir à
   refaire chaque diapositive ». Ses choix : le glisser sur la télé,
   une place par écran.

   Dans ⚙️ Réglages › 🔳 QR code : la vraie page de la télé (aperçu),
   l'encart montré même s'il est coupé à cet écran, glissé du doigt,
   le coin ◢ pour sa taille. La place part dans les réglages du QR
   (qrPlaceAccueil / qrPlaceVitrine) et passe avant celle d'une mise
   en page : un seul endroit pour le placer.
   ============================================================ */
let qrPl = null;

function placeQrReglee(ou){
  return (qrEcran && qrEcran.place && qrEcran.place[ou === 'vitrine' ? 'vitrine' : 'accueil']) || null;
}

function blocPlaceQr(){
  if(qrPl && qrPl.apercu){ try{ qrPl.apercu.detruire(); }catch(e){} qrPl.apercu = null; }
  const z = document.createElement('div');
  z.className = 'qrPlaceBloc';
  const dire = ou => placeQrReglee(ou) ? 'placé à ta main' : 'en bas à droite (d’origine)';
  z.innerHTML = '<label>📐 Sa place et sa taille</label>' +
    '<div class="afResume" style="margin:0 0 8px;" id="qrPlaceResume">🏠 Accueil : ' + dire('accueil') + ' · 🪟 Vitrine : ' + dire('vitrine') +
    '. Une place par écran, la même pour toutes les diapositives.</div>' +
    '<button type="button" class="btn btn-secondary" id="qrPlaceOuvrir">📐 Le placer sur la télé</button>' +
    '<div id="qrPlaceZone" style="display:none;">' +
      '<div class="stChips" id="qrPlaceOu"></div>' +
      '<div class="mepCadre" id="qrPlaceCadre"><div class="mepCalque" id="qrPlaceCalque"></div></div>' +
      '<div class="stPetit" style="margin:6px 0 8px;">Glisse l’encart où tu veux, tire le coin ◢ pour sa taille. Le code reste noir sur blanc.</div>' +
      '<div class="qrPlaceBoutons">' +
        '<button type="button" class="btn btn-primary" data-qp="enregistrer">💾 Enregistrer</button>' +
        '<button type="button" class="btn btn-secondary" data-qp="origine">↺ En bas à droite</button>' +
        '<button type="button" class="btn btn-secondary" data-qp="fermer">Fermer</button>' +
      '</div>' +
    '</div>';
  z.querySelector('#qrPlaceOuvrir').addEventListener('click', () => ouvrirPlaceQr(z, 'accueil'));
  z.querySelectorAll('[data-qp]').forEach(b => b.addEventListener('click', () => actionPlaceQr(z, b.dataset.qp, b)));
  if(qrPl && qrPl.ouvert) setTimeout(() => ouvrirPlaceQr(z, qrPl.ou), 0);
  return z;
}

async function ouvrirPlaceQr(z, ou){
  if(qrPl && qrPl.apercu){ try{ qrPl.apercu.detruire(); }catch(e){} }
  qrPl = { ouvert: true, ou: ou, brouillon: placeQrReglee(ou), rendu: null, apercu: null, change: false };
  z.querySelector('#qrPlaceOuvrir').style.display = 'none';
  const zone = z.querySelector('#qrPlaceZone');
  zone.style.display = 'block';
  const og = z.querySelector('#qrPlaceOu');
  og.innerHTML = [['accueil', '🏠 Accueil'], ['vitrine', '🪟 Vitrine']].map(([k, t]) =>
    '<button type="button" class="btn ' + (k === ou ? 'btn-primary' : 'btn-secondary') + '" data-qpou="' + k + '">' + t + '</button>').join('');
  og.querySelectorAll('[data-qpou]').forEach(b => b.addEventListener('click', async () => {
    if(b.dataset.qpou === qrPl.ou) return;
    if(qrPl.change && !await confirmer('La place n’est pas enregistrée. Passer à l’autre écran quand même ?')) return;
    ouvrirPlaceQr(z, b.dataset.qpou);
  }));
  const cadre = z.querySelector('#qrPlaceCadre');
  const l = Math.max(200, zone.clientWidth || z.clientWidth || 320);
  cadre.style.width = l + 'px';
  cadre.style.height = Math.round(l * 9 / 16) + 'px';
  cadre.querySelectorAll('iframe').forEach(x => x.remove());
  const etat = qrPl;
  etat.apercu = await apercuTele(cadre, ou, (places, o) => {
    if(qrPl !== etat || o !== etat.ou || etat.glisse) return;
    etat.rendu = places && places.qr ? places.qr.slice() : null;
    dessinerPlaceQr(z);
  });
  etat.apercu.envoyer({ qrVoir: true, qrPlace: etat.brouillon || null });
  const cal = z.querySelector('#qrPlaceCalque');
  cal.onpointerdown = ev => pointeurPlaceQr(ev, z);
  dessinerPlaceQr(z);
}

function dessinerPlaceQr(z){
  const cal = z.querySelector('#qrPlaceCalque');
  if(!cal || !qrPl) return;
  cal.innerHTML = '';
  const p = qrPl.rendu;
  if(!p) return;
  const s = (parseFloat(z.querySelector('#qrPlaceCadre').style.width) || 1) / 1600;
  const d = document.createElement('div');
  d.className = 'mepZone on qrPlaceZone';
  d.style.left = p[0] * s + 'px'; d.style.top = p[1] * s + 'px';
  d.style.width = p[2] * s + 'px'; d.style.height = p[3] * s + 'px';
  const h = document.createElement('div');
  h.className = 'stPoignee p-se';
  h.dataset.poignee = 'se';
  h.style.left = p[2] * s + 'px'; h.style.top = p[3] * s + 'px';
  d.appendChild(h);
  const t = document.createElement('div');
  t.className = 'mepEtiquette';
  t.textContent = '🔳 Le QR code';
  /* près du bord droit, l'étiquette se range à droite : coupée sinon */
  if(p[0] * s + 120 > (parseFloat(z.querySelector('#qrPlaceCadre').style.width) || 0)){ t.style.left = 'auto'; t.style.right = '-2px'; }
  d.appendChild(t);
  cal.appendChild(d);
}

function pointeurPlaceQr(ev, z){
  if(!qrPl || !qrPl.rendu) return;
  const cal = ev.currentTarget;
  const s = (parseFloat(z.querySelector('#qrPlaceCadre').style.width) || 1) / 1600;
  const r = cal.getBoundingClientRect();
  const px = (ev.clientX - r.left) / s, py = (ev.clientY - r.top) / s;
  const p = qrPl.rendu;
  const poignee = ev.target.closest('[data-poignee]');
  if(!poignee && !(px >= p[0] && px <= p[0] + p[2] && py >= p[1] && py <= p[1] + p[3])) return;
  ev.preventDefault();
  const depart = { x: ev.clientX, y: ev.clientY, p: p.slice() };
  const etat = qrPl;
  let attente = false;
  try{ cal.setPointerCapture(ev.pointerId); }catch(e){}
  const bouger = e2 => {
    const dx = (e2.clientX - depart.x) / s, dy = (e2.clientY - depart.y) / s;
    if(!etat.glisse && Math.abs(dx) * s < 3 && Math.abs(dy) * s < 3) return;
    etat.glisse = true; etat.change = true;
    let x = depart.p[0], y = depart.p[1], w = depart.p[2];
    if(poignee){ w = Math.min(600, Math.max(130, depart.p[2] + Math.max(dx, dy * depart.p[2] / depart.p[3]))); }
    else{ x = depart.p[0] + dx; y = depart.p[1] + dy; }
    x = Math.round(Math.min(1600 - w, Math.max(0, x)));
    y = Math.round(Math.min(860, Math.max(0, y)));
    w = Math.round(w);
    const h = Math.round(depart.p[3] * w / depart.p[2]);
    etat.brouillon = { x: x, y: y, w: w };
    etat.rendu = [x, y, w, h];
    dessinerPlaceQr(z);
    if(!attente){ attente = true; requestAnimationFrame(() => { attente = false; if(etat.apercu) etat.apercu.envoyer({ qrPlace: etat.brouillon }); }); }
  };
  const lacher = () => {
    cal.removeEventListener('pointermove', bouger);
    cal.removeEventListener('pointerup', lacher);
    cal.removeEventListener('pointercancel', lacher);
    /* la télé en petit renvoie alors la vraie hauteur de l'encart */
    const avait = etat.glisse;
    etat.glisse = false;
    if(avait && etat.apercu) etat.apercu.envoyer({ qrPlace: etat.brouillon });
  };
  cal.addEventListener('pointermove', bouger);
  cal.addEventListener('pointerup', lacher);
  cal.addEventListener('pointercancel', lacher);
}

async function actionPlaceQr(z, a, bouton){
  if(!qrPl) return;
  if(a === 'fermer'){
    if(qrPl.change && !await confirmer('La place n’est pas enregistrée. Fermer quand même ?')) return;
    if(qrPl.apercu) try{ qrPl.apercu.detruire(); }catch(e){}
    qrPl = null;
    z.querySelector('#qrPlaceZone').style.display = 'none';
    z.querySelector('#qrPlaceOuvrir').style.display = '';
    return;
  }
  if(a === 'origine'){
    qrPl.brouillon = null; qrPl.change = true;
    if(qrPl.apercu) qrPl.apercu.envoyer({ qrPlace: null });
    return;
  }
  if(a === 'enregistrer'){
    const ou = qrPl.ou;
    bouton.disabled = true;
    try{
      const r = await appelPrep({ action: 'ecranQrPoser', cle: ou === 'vitrine' ? 'qrPlaceVitrine' : 'qrPlaceAccueil',
                                  valeur: qrPl.brouillon ? JSON.stringify(qrPl.brouillon) : '' });
      if(r && r.qr) qrEcran = r.qr;
      qrPl.change = false;
      const dire = o => placeQrReglee(o) ? 'placé à ta main' : 'en bas à droite (d’origine)';
      const res = z.querySelector('#qrPlaceResume');
      if(res) res.textContent = '🏠 Accueil : ' + dire('accueil') + ' · 🪟 Vitrine : ' + dire('vitrine') + '. Une place par écran, la même pour toutes les diapositives.';
      showToast((ou === 'vitrine' ? 'Vitrine' : 'Accueil') + ' : place du QR enregistrée ✅ (dans la minute sur la télé)');
    }catch(e){ showToast('Impossible : ' + e.message); }
    bouton.disabled = false;
  }
}
