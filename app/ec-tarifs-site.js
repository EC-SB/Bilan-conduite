/* Déployé le 04/11/2026 à 12:01 — v1351 */
/* ============================================================
   ec-tarifs-site.js
   🛒 Le site — Outils › 💰 Tarifs (v1348).

   David, le 4 novembre : « est-ce que tu peux faire la modification
   de tarifs tout seul sur mon wordpress ? » — « l'appli s'en occupe
   toute seule ». WordPress chez OVH, avec WooCommerce.

   L'onglet est la copie du schéma validé (version 2) :
   · chaque produit WooCommerce est relié UNE fois à ce qui fait son
     prix dans l'appli : le total d'une fiche, une prestation ou un
     tarif horaire (BV ou BEA) ; pas relié = le site garde son prix ;
   · à chaque enregistrement des prix (case qu'on peut décocher), les
     produits reliés reçoivent leur nouveau prix, et le JPG de leur
     fiche est refait et remplacé dans la description (courte ou
     longue), l'ancien effacé de la Médiathèque ;
   · relier et envoyer : administrateurs seulement.

   Le Worker fait les appels au site (wooLire, wooEnvoyer…) : les clés
   ne passent jamais par le navigateur.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const WO = { lu: false, charge: false, produits: [], liens: [], auto: true, wc: false, wp: false, site: '', admin: false,
             dernier: null, luLe: 0, erreur: '' };

function woEch(t){ return (typeof tfEch === 'function') ? tfEch(t) : String(t == null ? '' : t).replace(/</g, '&lt;'); }
function woQuand(ms){
  if(!ms) return '';
  const d = new Date(ms);
  return d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/* ---------- ce qui fait le prix d'un produit ---------- */
function woPrixSource(d, s){
  if(!d || !s) return null;
  const [k, id, g] = String(s).split(':');
  if(k === 'fiche'){ const f = tfFiche(d, id); return f ? tfTotalDeLaFiche(d, f) : null; }
  if(k === 'taux'){ return d.taux.some(t => t.id === id) ? tfTaux(d, id, g) : null; }
  if(k === 'prest'){ return tfPrestation(d, id) ? tfPrix(d, id, g) : null; }
  return null;
}
function woLibelleSource(d, s){
  if(!s) return '— pas relié —';
  const [k, id, g] = String(s).split(':');
  if(k === 'fiche'){ const f = tfFiche(d, id); return f ? 'Fiche « ' + tfTitre1(f) + ' » — total' : '⚠️ fiche retirée'; }
  if(k === 'taux'){ const t = d.taux.find(x => x.id === id); return t ? t.nom + ' — ' + g : '⚠️ tarif retiré'; }
  if(k === 'prest'){ const p = tfPrestation(d, id); return p ? p.nom.split(' — ')[0] + (p.bea ? ' — ' + g : '') : '⚠️ prestation retirée'; }
  return s;
}
/* La signature d'une fiche : ce qu'elle dit et ce qu'elle coûte. Si
   elle bouge, son JPG est à refaire. */
function woSig(d, ficheId){
  const f = tfFiche(d, ficheId);
  if(!f) return '';
  const txt = JSON.stringify(f) + '|' + JSON.stringify(tfTotaux(d, f));
  let h = 5381;
  for(let i = 0; i < txt.length; i++) h = ((h << 5) + h + txt.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
function woLien(id){ return WO.liens.find(l => l.produit === id) || null; }

/* L'état d'un produit face aux prix de l'appli */
function woEtat(p, d){
  const l = woLien(p.id);
  const source = l && l.source;
  const app = source ? woPrixSource(d, source) : null;
  const site = Number(p.prix);
  const ecart = app != null && (!isFinite(site) || Math.abs(app - site) >= 0.005);
  let img = '', choisie = null;
  if(source && source.indexOf('fiche:') === 0){
    const ims = p.images || [];
    choisie = ims.find(x => l.imgSrc && x.src === l.imgSrc) || (ims.length === 1 ? ims[0] : null);
    if(!ims.length) img = 'aucune';
    else if(!choisie) img = 'choisir';
    else if(!l.ficheSig) img = 'jamais';
    else img = (l.ficheSig === woSig(d, source.slice(6))) ? 'ajour' : 'refaire';
  }
  /* le JPG part : s'il est à refaire, ou si jamais refait et que le prix change */
  const avecJpg = !!(choisie && WO.wp && (img === 'refaire' || (img === 'jamais' && ecart)));
  return { lien: l, source, app, site, ecart, img, choisie, avecJpg, aEnvoyer: ecart || img === 'refaire' };
}

/* ============================================================
   L'ONGLET
   ============================================================ */
async function woCharger(){
  WO.charge = true;
  try{
    const r = await appelPrep({ action: 'wooLire' });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    Object.assign(WO, { lu: true, produits: r.produits || [], liens: r.liens || [], auto: r.auto !== false, wc: !!r.wc, wp: !!r.wp,
                        site: r.site || '', admin: !!r.admin, dernier: r.dernier || null, luLe: r.luLe || 0, erreur: r.erreur || '' });
  }catch(e){
    WO.erreur = (e && e.message) || String(e);
  }
  WO.charge = false;
}

async function woOnglet(z){
  if(!WO.lu && !WO.charge){
    z.innerHTML = '<div class="empty">Lecture des produits du site…</div>';
    await woCharger();
    if(tfOnglet === 'site') afficherTarifsFiches();
    return;
  }
  if(!WO.lu){ z.innerHTML = '<div class="empty">⚠️ ' + woEch(WO.erreur || 'Lecture impossible.') + '</div>'; return; }
  const d = tfData;
  const ecrit = WO.admin;
  z.innerHTML = '';

  const tete = document.createElement('div');
  tete.className = 'tfDate';
  const nom = WO.site.replace(/^https?:\/\//, '');
  tete.innerHTML = WO.wc
    ? '<span>🛒 <b>Relié à la boutique</b> ' + woEch(nom) + ' (WooCommerce)' + (WO.luLe ? ' · ' + WO.produits.length + ' produits lus le ' + woQuand(WO.luLe) : '') + '</span>'
    : '<span>🛒 <b>Pas encore relié à la boutique</b> ' + woEch(nom) + '</span>';
  const relire = document.createElement('button');
  relire.type = 'button'; relire.className = 'tfBtn'; relire.textContent = '🔄 Relire les produits du site';
  relire.addEventListener('click', async () => { relire.disabled = true; await woCharger(); afficherTarifsFiches(); });
  tete.appendChild(relire);
  if(WO.admin && WO.wc && !WO.erreur){
    const tester = document.createElement('button');
    tester.type = 'button'; tester.className = 'tfBtn'; tester.textContent = '🔎 Tester la connexion';
    tester.addEventListener('click', woFenetreTest);
    tete.appendChild(tester);
  }
  z.appendChild(tete);

  if(!WO.wc){
    const a = document.createElement('div');
    a.className = 'woManque';
    a.innerHTML = '⚠️ Il manque la clé WooCommerce dans Cloudflare. Dans WordPress : <b>WooCommerce › Réglages › Avancé › API REST › Ajouter une clé</b> ' +
      '(droits Lecture/Écriture), puis range la clé client dans <code>WC_CLE</code> et le secret client dans <code>WC_SECRET</code> ' +
      '(Worker bilan-proxy › Settings › Variables and Secrets, type Secret).';
    z.appendChild(a);
    return;
  }
  if(WO.erreur){
    const a = document.createElement('div'); a.className = 'woManque'; a.textContent = '⚠️ ' + WO.erreur;
    if(WO.admin){
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tfBtn woTestBtn'; b.textContent = '🔎 Tester la connexion';
      b.addEventListener('click', woFenetreTest);
      a.appendChild(document.createElement('br')); a.appendChild(b);
    }
    z.appendChild(a);
  }

  const aide = document.createElement('div');
  aide.className = 'tfAide';
  aide.innerHTML = 'Chaque produit du site prend son prix dans l’appli : le total d’une fiche, une prestation, ou un tarif horaire (BV ou BEA). ' +
    'Quand tu enregistres des prix dans <b>💶 Les prix</b>, les produits reliés se mettent à jour tout seuls sur le site. Un produit <b>pas relié</b> garde le prix du site.';
  z.appendChild(aide);

  if(!WO.wp){
    const a = document.createElement('div'); a.className = 'woManque';
    a.innerHTML = '🖼️ Pour remplacer les JPG des fiches, il manque le mot de passe d’application WordPress : <b>Utilisateurs › Profil › Mots de passe d’application</b>, ' +
      'puis <code>WP_UTILISATEUR</code> et <code>WP_MOT_DE_PASSE</code> dans Cloudflare. En attendant, seuls les prix changent.';
    z.appendChild(a);
  }

  const auto = document.createElement('label');
  auto.className = 'woCoche';
  auto.innerHTML = '<input type="checkbox"' + (WO.auto ? ' checked' : '') + (ecrit ? '' : ' disabled') + '> 🛒 Mettre le site à jour à chaque enregistrement des prix';
  auto.querySelector('input').addEventListener('change', async ev => {
    const v = ev.target.checked;
    try{ await appelPrep({ action: 'wooAuto', auto: v }); WO.auto = v; showToast(v ? 'Envoi automatique remis ✅' : 'Envoi automatique coupé'); }
    catch(e){ ev.target.checked = !v; showToast('Impossible : ' + e.message); }
  });
  z.appendChild(auto);

  const etats = WO.produits.map(p => ({ p, e: woEtat(p, d) }));
  const aJour = etats.filter(x => x.e.source && !x.e.aEnvoyer).length;
  const ecarts = etats.filter(x => x.e.aEnvoyer);
  const pasRelies = etats.filter(x => !x.e.source).length;
  const aChoisir = etats.filter(x => x.e.img === 'choisir').length;
  const bilan = document.createElement('div');
  bilan.className = 'woBilan';
  bilan.innerHTML = '✅ ' + aJour + ' à jour · ' + (ecarts.length ? '<span class="woEcart">⚠️ ' + ecarts.length + ' à envoyer</span>' : '0 à envoyer') +
    ' · ' + pasRelies + ' pas relié' + (pasRelies > 1 ? 's' : '') + (aChoisir ? ' · <span class="woEcart">🖼️ ' + aChoisir + ' image' + (aChoisir > 1 ? 's' : '') + ' à choisir</span>' : '');
  z.appendChild(bilan);

  const carte = document.createElement('div');
  carte.className = 'tfCarte';
  carte.innerHTML = '<div class="tfCarteT">🛍️ Les produits du site</div><div class="tfCarteS">' +
    (WO.dernier ? 'Dernier envoi : ' + woEch(woQuand(WO.dernier.le)) + (WO.dernier.par ? ' par ' + woEch(WO.dernier.par) : '') : 'Rien d’envoyé pour l’instant') + '</div>';
  if(!WO.produits.length){
    const v = document.createElement('div'); v.className = 'tfAide'; v.textContent = 'Aucun produit lu sur le site.'; carte.appendChild(v);
  }
  etats.forEach(({ p, e }) => carte.appendChild(woLigne(p, e, d, ecrit)));
  z.appendChild(carte);

  if(ecrit && ecarts.length){
    const bas = document.createElement('div'); bas.className = 'tfOutils';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tfBtn';
    b.textContent = '🛒 Envoyer les ' + ecarts.length + ' écart' + (ecarts.length > 1 ? 's' : '') + ' au site';
    b.addEventListener('click', () => woEnvoyerTous(ecarts.map(x => x.p), d, null));
    bas.appendChild(b);
    z.appendChild(bas);
  }
}

function woLigne(p, e, d, ecrit){
  const l = document.createElement('div');
  l.className = 'tfLigne' + (e.aEnvoyer ? ' change' : '');
  const imgTxt = {
    aucune: '🖼️ Pas d’image dans les descriptions : seul le prix change',
    choisir: '🖼️ ' + (p.images || []).length + ' images dans les descriptions : laquelle est la fiche ?',
    jamais: '🖼️ JPG de la fiche : dans la ' + (e.choisie && e.choisie.champ === 'description' ? 'description' : 'description courte') +
      ' · pas encore refait par l’appli',
    ajour: '🖼️ JPG de la fiche : dans la ' + (e.choisie && e.choisie.champ === 'description' ? 'description' : 'description courte') + ' · ✅ à jour',
    refaire: '🖼️ JPG de la fiche : dans la ' + (e.choisie && e.choisie.champ === 'description' ? 'description' : 'description courte') +
      ' · ⚠️ à refaire avec le nouveau prix'
  }[e.img] || '';
  l.innerHTML = '<div class="tfNom">' + woEch(p.nom) + (p.statut && p.statut !== 'publish' ? ' <span>(' + woEch(p.statut === 'draft' ? 'brouillon' : p.statut) + ')</span>' : '') +
    '<span>Sur le site : ' + (p.prix !== '' ? tfEuros(Number(p.prix)) : 'pas de prix') + '</span>' +
    (!e.source ? '<span>Pas relié : le site garde son prix</span>'
      : e.app == null ? '<em class="woAlerte">⚠️ Ce qui faisait son prix n’existe plus dans l’appli</em>'
      : e.ecart ? '<em class="woAlerte">⚠️ L’appli dit ' + tfEuros(e.app) + '</em>' : '<em>✅ à jour</em>') +
    (imgTxt ? '<span class="' + (e.img === 'choisir' || e.img === 'refaire' ? 'woAlerte' : '') + '">' + imgTxt + '</span>' : '') + '</div>' +
    '<div class="tfPrix woPrix"></div>';
  const px = l.querySelector('.woPrix');
  const choix = document.createElement('button');
  choix.type = 'button'; choix.className = 'woChoix';
  choix.textContent = woLibelleSource(d, e.source);
  choix.disabled = !ecrit;
  choix.addEventListener('click', () => woFenetreSource(p, d));
  px.appendChild(choix);
  if(ecrit && e.img === 'choisir'){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tfBtn'; b.textContent = '🖼️ Choisir l’image';
    b.addEventListener('click', () => woFenetreImage(p));
    px.appendChild(b);
  }
  if(ecrit && e.aEnvoyer && e.app != null){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tfBtn';
    b.textContent = '🛒 Envoyer ' + tfEuros(e.app);
    b.addEventListener('click', () => woEnvoyerTous([p], d, null));
    px.appendChild(b);
  }
  return l;
}

/* 🔗 « … prend son prix dans… » */
function woFenetreSource(p, d){
  const { m, fermer } = tfFenetre();
  const l = woLien(p.id);
  let choisi = (l && l.source) || '';
  const groupes = [
    ['📄 Le total d’une fiche', d.fiches.filter(f => f.type !== 'grille').map(f => ['fiche:' + f.id, tfTitre1(f) + ' — ' + tfEuros(tfTotalDeLaFiche(d, f))])],
    ['⏱️ Un tarif horaire', [].concat(...d.taux.filter(t => !t.forfait).map(t => {
      const o = [['taux:' + t.id + ':BV', t.nom + ' — ' + (t.bea ? 'BV ' : '') + tfEuros(tfTaux(d, t.id, 'BV'))]];
      if(t.bea) o.push(['taux:' + t.id + ':BEA', t.nom + ' — BEA ' + tfEuros(tfTaux(d, t.id, 'BEA'))]);
      return o;
    }))],
    ['🧾 Une prestation', [].concat(...d.prestations.map(x => {
      const o = [['prest:' + x.id + ':BV', x.nom.split(' — ')[0] + ' — ' + (x.bea ? 'BV ' : '') + tfEuros(tfPrix(d, x.id, 'BV'))]];
      if(x.bea) o.push(['prest:' + x.id + ':BEA', x.nom.split(' — ')[0] + ' — BEA ' + tfEuros(tfPrix(d, x.id, 'BEA'))]);
      return o;
    }))],
    ['Aucun', [['', '— pas relié : le site garde son prix —']]]
  ];
  m.innerHTML = '<h3>🔗 « ' + woEch(p.nom) + ' » prend son prix dans…</h3>' +
    '<input type="search" class="woRech" placeholder="🔍 Chercher une fiche, une prestation, un tarif">' +
    '<div class="woListe"></div>' +
    '<div class="tfFenBas"><button type="button" class="btn btn-secondary" data-x="non">Annuler</button>' +
    '<button type="button" class="btn btn-primary" data-x="oui">🔗 Relier</button></div>';
  const liste = m.querySelector('.woListe');
  const dessiner = () => {
    const q = (typeof normaliserMot === 'function' ? normaliserMot : (x => String(x).toLowerCase()))(m.querySelector('.woRech').value || '');
    liste.innerHTML = '';
    groupes.forEach(([titre, opts]) => {
      const vus = opts.filter(([k, t]) => !q || k === '' || (typeof normaliserMot === 'function' ? normaliserMot(t) : t.toLowerCase()).indexOf(q) !== -1);
      if(!vus.length) return;
      const e = document.createElement('div'); e.className = 'tfEtiq'; e.textContent = titre; liste.appendChild(e);
      vus.forEach(([k, t]) => {
        const o = document.createElement('button'); o.type = 'button'; o.className = 'woOpt' + (k === choisi ? ' on' : ''); o.textContent = t;
        o.addEventListener('click', () => { choisi = k; dessiner(); });
        liste.appendChild(o);
      });
    });
  };
  m.querySelector('.woRech').addEventListener('input', dessiner);
  dessiner();
  m.querySelector('[data-x="non"]').addEventListener('click', fermer);
  m.querySelector('[data-x="oui"]').addEventListener('click', async ev => {
    ev.target.disabled = true;
    try{
      await appelPrep({ action: 'wooRelier', produit: p.id, source: choisi, nom: p.nom });
      const x = woLien(p.id);
      if(x) x.source = choisi; else WO.liens.push({ produit: p.id, source: choisi, champ: '', imgSrc: '', imgId: 0, ficheSig: '' });
      fermer();
      afficherTarifsFiches();
    }catch(e){ showToast('Impossible : ' + e.message); ev.target.disabled = false; }
  });
}

/* 🔎 v1349 — Tester la connexion : chaque étape en clair (le Worker ne
   renvoie jamais une clé, seulement la fin de la clé client, comme
   WooCommerce l'affiche dans sa liste). */
async function woFenetreTest(){
  const { m, fermer } = tfFenetre();
  m.innerHTML = '<h3>🔎 La connexion au site</h3><div class="woTest"><div class="tfAide">Test en cours… (jusqu’à une minute)</div></div>' +
    '<div class="tfFenBas"><button type="button" class="btn btn-secondary" data-x="non">Fermer</button>' +
    '<button type="button" class="btn btn-primary" data-x="relire" disabled>🔄 Relire les produits</button></div>';
  m.querySelector('[data-x="non"]').addEventListener('click', fermer);
  const zone = m.querySelector('.woTest');
  let r;
  try{
    r = await appelPrep({ action: 'wooTester' });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
  }catch(e){ zone.innerHTML = '<div class="woManque">⚠️ ' + woEch(e.message) + '</div>'; return; }
  zone.innerHTML = '';
  (r.etapes || []).forEach(x => {
    const l = document.createElement('div');
    l.className = 'woEtape ' + (x.ok === true ? 'bon' : x.ok === false ? 'mauvais' : 'note');
    l.innerHTML = '<span class="woEtapeI">' + (x.ok === true ? '✅' : x.ok === false ? '❌' : 'ℹ️') + '</span>' +
      '<div><b>' + woEch(x.titre) + '</b><div class="woEtapeD">' + woEch(x.detail) + '</div></div>';
    zone.appendChild(l);
  });
  const fin = document.createElement('div'); fin.className = 'tfAide';
  const rouges = (r.etapes || []).filter(x => x.ok === false).length;
  fin.innerHTML = !r.methode
    ? '❌ <b>Aucune façon ne passe encore.</b> Le message de WooCommerce ci-dessus dit quoi corriger. Les clés se corrigent dans Cloudflare (Worker bilan-proxy › Settings › Variables and Secrets) — ne les colle jamais dans une conversation.'
    : rouges
      ? '⚠️ <b>La clé passe, mais pas tout :</b> les lignes ❌ disent ce qui bloque encore (lire les produits marche, l’envoi peut échouer).'
      : '✅ <b>Tout passe</b> : lire, écrire les prix et envoyer les JPG. Tu peux relire les produits.';
  zone.appendChild(fin);
  const relire = m.querySelector('[data-x="relire"]');
  relire.disabled = !r.methode;
  relire.addEventListener('click', async () => { relire.disabled = true; await woCharger(); fermer(); afficherTarifsFiches(); });
}

/* 🖼️ Quelle image est la fiche ? */
function woFenetreImage(p){
  const { m, fermer } = tfFenetre();
  let choisie = null;
  m.innerHTML = '<h3>🖼️ « ' + woEch(p.nom) + ' » — quelle image est la fiche ?</h3>' +
    '<p class="tfAide">' + (p.images || []).length + ' images dans les descriptions. Touche celle qui est la fiche tarifaire : c’est elle que l’appli remplacera à chaque changement de prix. Les autres ne bougent pas.</p>' +
    '<div class="woListe"></div>' +
    '<div class="tfFenBas"><button type="button" class="btn btn-secondary" data-x="non">Annuler</button>' +
    '<button type="button" class="btn btn-primary" data-x="oui" disabled>🖼️ C’est celle-là</button></div>';
  const liste = m.querySelector('.woListe');
  (p.images || []).forEach((x, i) => {
    const o = document.createElement('button'); o.type = 'button'; o.className = 'woOpt woOptImg';
    const im = document.createElement('img'); im.src = x.src; im.alt = ''; im.loading = 'lazy'; im.referrerPolicy = 'no-referrer';
    const t = document.createElement('span');
    t.textContent = 'Image ' + (i + 1) + ' · ' + x.nom + ' · ' + (x.champ === 'description' ? 'description' : 'description courte');
    o.append(im, t);
    o.addEventListener('click', () => {
      choisie = x;
      liste.querySelectorAll('.woOpt').forEach(b => b.classList.toggle('on', b === o));
      m.querySelector('[data-x="oui"]').disabled = false;
    });
    liste.appendChild(o);
  });
  m.querySelector('[data-x="non"]').addEventListener('click', fermer);
  m.querySelector('[data-x="oui"]').addEventListener('click', async ev => {
    if(!choisie) return;
    ev.target.disabled = true;
    try{
      await appelPrep({ action: 'wooImage', produit: p.id, champ: choisie.champ, src: choisie.src });
      let l = woLien(p.id);
      if(!l){ l = { produit: p.id, source: '' }; WO.liens.push(l); }
      Object.assign(l, { champ: choisie.champ, imgSrc: choisie.src, imgId: 0 });
      fermer();
      afficherTarifsFiches();
    }catch(e){ showToast('Impossible : ' + e.message); ev.target.disabled = false; }
  });
}

/* ============================================================
   🛒 ENVOYER
   ============================================================ */
/* « fichesChangees » : les fiches touchées par l'enregistrement qu'on
   vient de faire (leur JPG est à refaire, même jamais envoyé). */
async function woEnvoyerTous(produits, d, fichesChangees){
  const att = (typeof tfAttente === 'function') ? tfAttente('Envoi au site') : { dire(){}, fermer(){} };
  let n = 0, img = 0;
  const rates = [];
  try{
    for(const p of produits){
      const e = woEtat(p, d);
      if(e.app == null) continue;
      const fid = (e.source || '').indexOf('fiche:') === 0 ? e.source.slice(6) : '';
      const jpgAussi = e.avecJpg || !!(fid && e.choisie && WO.wp && fichesChangees && fichesChangees.indexOf(fid) !== -1);
      att.dire((n + rates.length + 1) + ' / ' + produits.length + ' · ' + p.nom + (jpgAussi ? ' (avec sa fiche)' : ''));
      const corps = { action: 'wooEnvoyer', produit: p.id, prix: e.app.toFixed(2) };
      try{
        if(jpgAussi){
          const c = await tfCanvasDe(d, tfFiche(d, fid));
          corps.jpg = c.toDataURL('image/jpeg', 0.9);
          corps.nomJpg = tfNomFichier(tfFiche(d, fid));
          corps.ficheSig = woSig(d, fid);
        }
        const r = await appelPrep(corps);
        if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
        n++; if(r.image) img++;
      }catch(err){ rates.push(p.nom + ' : ' + ((err && err.message) || err)); }
    }
  }finally{ att.fermer(); }
  await woCharger();
  if(tfOnglet === 'site') afficherTarifsFiches();
  if(rates.length){
    const { m, fermer } = tfFenetre();
    m.innerHTML = '<h3>🛒 Le site : ' + n + ' produit' + (n > 1 ? 's' : '') + ' mis à jour, ' + rates.length + ' en échec</h3>' +
      '<div class="tfAide">' + rates.map(woEch).join('<br>') + '</div>' +
      '<div class="tfAide">Les prix de l’appli sont bien enregistrés. Les écarts restent visibles dans 🛒 Le site, à renvoyer.</div>' +
      '<div class="tfFenBas"><button type="button" class="btn btn-primary">OK</button></div>';
    m.querySelector('button').addEventListener('click', fermer);
  }else if(n){
    showToast('🛒 Site mis à jour : ' + n + ' produit' + (n > 1 ? 's' : '') + (img ? ' (' + img + ' fiche' + (img > 1 ? 's' : '') + ' en JPG)' : '') + ' ✅');
  }
}

/* Ce que l'enregistrement va changer sur le site — pour la fenêtre
   « 👁️ Ce qui change ». */
function woApercu(avant, apres){
  if(typeof ACCES === 'undefined' || ACCES.role !== 'admin') return '';
  if(WO.lu && !WO.wc) return '';
  if(WO.lu && !WO.auto) return '<div class="tfAide">🛒 L’envoi au site est coupé (onglet 🛒 Le site) : rien ne part sur WooCommerce.</div>';
  if(!WO.lu) return '<div class="tfAide">🛒 Les produits reliés du site seront mis à jour juste après.</div>';
  const ch = woAEnvoyerApres(avant, apres);
  if(!ch.length) return '<div class="tfAide">🛒 Sur le site : aucun produit relié ne change.</div>';
  return '<div class="tfAide">🛒 Sur le site : <b>' + ch.length + ' produit' + (ch.length > 1 ? 's' : '') + ' changer' + (ch.length > 1 ? 'ont' : 'a') + '</b> (' +
    ch.slice(0, 4).map(x => woEch(x.p.nom) + (x.ecart ? ' ' + tfEuros(Number(x.p.prix)) + ' → ' + tfEuros(x.app) : ' : sa fiche')).join(' · ') +
    (ch.length > 4 ? '…' : '') + ').</div>';
}
function woFichesChangees(avant, apres){
  return apres.fiches.filter(f => woSig(avant, f.id) !== woSig(apres, f.id)).map(f => f.id);
}
function woAEnvoyerApres(avant, apres){
  const fc = woFichesChangees(avant, apres);
  return WO.produits.map(p => {
    const e = woEtat(p, apres);
    const fid = (e.source || '').indexOf('fiche:') === 0 ? e.source.slice(6) : '';
    const fiche = !!(fid && e.choisie && WO.wp && fc.indexOf(fid) !== -1);
    return (e.app != null && (e.ecart || fiche || e.img === 'refaire')) ? { p, ecart: e.ecart, app: e.app } : null;
  }).filter(Boolean);
}

/* Juste après « ✅ Enregistrer » dans 💶 Les prix */
async function woApresEnregistrement(avant, apres){
  if(typeof ACCES === 'undefined' || ACCES.role !== 'admin') return;
  await woCharger();
  if(!WO.lu || !WO.wc || !WO.auto || WO.erreur) return;
  const liste = woAEnvoyerApres(avant, apres).map(x => x.p);
  if(!liste.length) return;
  await woEnvoyerTous(liste, apres, woFichesChangees(avant, apres));
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-tarifs-site.js'] = true;
