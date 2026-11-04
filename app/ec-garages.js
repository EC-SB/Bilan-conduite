/* Déployé le 04/11/2026 à 10:14 — v1346 */
/* ============================================================
   ec-garages.js
   🅿️ Les garages en location — Gestion › 🚗 Flotte (v1346).

   David, le 4 novembre : « dans la flotte il faut rajouter la gestion
   des garages en location avec leur numéro et le loyer mensuel depuis
   quand on l'a et le coût trimestriel, et lier les voitures qui sont
   dedans ou les motos ou scooters, ou s'il y a du stockage, s'il y a
   un coffre à clé, des prises, etc. »

   L'écran est la copie du schéma validé :
   · une famille « 🅿️ Garages en location » sous les véhicules ;
   · le loyer, le trimestre (3 × le loyer) et la date : administrateurs
     seulement — le Worker ne les envoie pas aux autres ;
   · ce qu'il y a dedans : les véhicules de la flotte (un véhicule n'est
     que dans un garage), et du stockage ;
   · les équipements, dont le coffre à clé : son code est chiffré, et
     ne se montre qu'après le code de l'appli, 30 secondes ;
   · le contrat de location en PDF, remplaçable (David) ;
   · le loyer alimente la ligne « Goulard — garages » des 💶 Charges
     fixes, qui se calcule toute seule.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const GA = { liste: [], admin: false, modifier: false, cleCoffre: true, charge: false, lu: false, erreur: '' };

function htmlGA(t){
  return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function eurGA(c){
  return (c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/[  ]/g, ' ') + ' €';
}
function lireEurosGA(t){
  const s = String(t == null ? '' : t).replace(/[\s  €]/g, '').replace(',', '.');
  if(s === '') return null;
  if(!/^\d+(\.\d{0,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}
function moisAnneeGA(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return '';
  const m = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
             'septembre', 'octobre', 'novembre', 'décembre'][Number(iso.slice(5, 7)) - 1];
  return m + ' ' + iso.slice(0, 4);
}
function vehiculeGA(id){
  return (typeof flotte !== 'undefined' ? flotte : []).find(v => String(v.id) === String(id));
}
function nomVehiculeGA(id){
  const v = vehiculeGA(id);
  if(!v) return '';
  const cat = (typeof CATEGORIES_FLOTTE !== 'undefined') ? CATEGORIES_FLOTTE.find(c => c.cle === v.categorie) : null;
  return (cat ? cat.nom.split(' ')[0] + ' ' : '') + v.nom;
}
/* Le garage où dort un véhicule (pour la liste et la fiche du véhicule) */
function garageDuVehicule(id){
  return GA.liste.find(g => g.etat !== 'rendu' && (g.vehicules || []).indexOf(String(id)) !== -1) || null;
}
function equipementsGA(g){
  const e = [];
  if(g.coffre) e.push('🔑 coffre à clé');
  if(g.prises) e.push('🔌 ' + g.prises + ' prise' + (g.prises > 1 ? 's' : ''));
  if(g.lumiere) e.push('💡 lumière');
  if(g.alarme) e.push('🚨 alarme');
  if(g.eau) e.push('🚰 point d’eau');
  if(g.autre) e.push(g.autre);
  return e;
}

/* ============================================================
   LA LISTE, SOUS LES VÉHICULES
   ============================================================ */
async function afficherGarages(){
  const fz = $('flotteZone');
  if(!fz) return;
  let z = $('garagesZone');
  if(!z){ z = document.createElement('div'); z.id = 'garagesZone'; fz.appendChild(z); }
  else if(z.parentNode !== fz) fz.appendChild(z);
  if(!GA.lu) z.innerHTML = '<div class="empty">Lecture des garages…</div>';
  try{
    const r = await appelPrep({ action: 'garagesLire' });
    prendreGA(r);
  }catch(e){
    GA.erreur = (e && e.message) || String(e);
  }
  dessinerGarages();
  /* la ligne de chaque véhicule dit son garage */
  if(typeof dessinerListeFlotte === 'function') dessinerListeFlotte();
}
function prendreGA(r){
  if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
  GA.liste = r.garages || [];
  GA.admin = !!r.admin;
  GA.modifier = !!r.modifier;
  GA.cleCoffre = r.cleCoffre !== false;
  GA.lu = true;
  GA.erreur = '';
}

function dessinerGarages(){
  const z = $('garagesZone');
  if(!z) return;
  z.innerHTML = '';
  if(GA.erreur && !GA.lu){
    z.innerHTML = '<div class="empty">⚠️ Garages : ' + htmlGA(GA.erreur) + '</div>';
    return;
  }
  const loues = GA.liste.filter(g => g.etat !== 'rendu');
  const rendus = GA.liste.filter(g => g.etat === 'rendu');

  const t = document.createElement('div');
  t.className = 'gaTitre';
  const total = loues.reduce((s, g) => s + (Number(g.loyer) || 0), 0);
  t.innerHTML = '<span>🅿️ Garages en location · ' + loues.length + '</span>' +
    (GA.admin && loues.length ? '<span class="gaTotal">' + eurGA(total) + ' / mois</span>' : '');
  z.appendChild(t);

  if(!loues.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.innerHTML = 'Aucun garage enregistré.' + (GA.modifier && GA.admin
      ? '<br><span style="font-size:12px;">Charge la liste de départ (le fichier « garages-depart.json », avec les contrats), ou ajoute-les un par un.</span>' : '');
    z.appendChild(v);
    if(GA.modifier && GA.admin && !GA.liste.length) z.appendChild(boutonImportGA());
  }
  loues.forEach(g => z.appendChild(ligneGarage(g)));

  if(GA.modifier){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary gaAjout';
    b.type = 'button';
    b.textContent = '➕ Ajouter un garage';
    b.addEventListener('click', () => ouvrirFicheGarage(null));
    z.appendChild(b);
  }

  if(rendus.length){
    const d = document.createElement('details');
    d.className = 'gaRendus';
    d.innerHTML = '<summary>🗂️ ' + rendus.length + ' garage(s) rendu(s)</summary>';
    rendus.forEach(g => d.appendChild(ligneGarage(g)));
    z.appendChild(d);
  }
}

function ligneGarage(g){
  const l = document.createElement('div');
  l.className = 'gaLigne' + (g.etat === 'rendu' ? ' gaRendu' : '');
  const dedans = (g.vehicules || []).map(nomVehiculeGA).filter(Boolean);
  if(g.stockage) dedans.push('📦 ' + (g.stockageQuoi || 'stockage'));
  const eq = equipementsGA(g);
  l.innerHTML =
    '<div class="gaIcone">🅿️</div>' +
    '<div class="gaTexte">' +
      '<strong>Garage n° ' + htmlGA(g.numero) + '</strong> ' +
      '<span class="gaPetit">' + htmlGA([g.bailleur, g.site].filter(Boolean).join(' · ')) + '</span>' +
      '<div class="gaSous">' + htmlGA(dedans.join(' · ') || 'vide') + '</div>' +
      (eq.length ? '<div class="gaSous">' + htmlGA(eq.join(' · ')) + '</div>' : '') +
      (GA.admin ? '<div class="gaLoyer">' + (g.loyer == null ? 'loyer à saisir'
        : eurGA(g.loyer) + ' / mois · ' + eurGA(3 * g.loyer) + ' / trimestre') +
        (g.depuis ? ' · depuis ' + moisAnneeGA(g.depuis) : '') + '</div>' : '') +
    '</div>' +
    (g.pdf ? '<div class="gaPdfPuce" title="Contrat déposé">📄</div>' : '');
  l.addEventListener('click', () => ouvrirFicheGarage(g));
  return l;
}

/* ============================================================
   LA FICHE D'UN GARAGE
   ============================================================ */
function ouvrirFicheGarage(g){
  const nouveau = !g;
  const f = g ? Object.assign({}, g) : { numero: '', bailleur: 'Goulard', site: 'Saint-Brieuc', adresse: '', etat: 'location',
    loyer: null, depuis: '', vehicules: [], stockage: 0, stockageQuoi: '', coffre: 0, prises: 0, lumiere: 0, alarme: 0, eau: 0,
    autre: '', remarque: '' };
  const lecture = !GA.modifier;
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 95vw);max-height:90vh;overflow-y:auto;';

  const ck = (id, lab, on) => '<label class="gaCoche"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '> ' + lab + '</label>';
  const titre = t => '<div class="gaSection">' + t + '</div>';
  const actifs = (typeof flotte !== 'undefined' ? flotte : []).filter(v => v.etat !== 'vendu' || (f.vehicules || []).indexOf(String(v.id)) !== -1);

  boite.innerHTML =
    '<h3>' + (nouveau ? 'Nouveau garage' : 'Garage n° ' + htmlGA(f.numero)) + '</h3>' +
    '<div class="duo"><div><label for="gaNum">Numéro</label><input type="text" id="gaNum" value="' + htmlGA(f.numero) + '" placeholder="Ex : 6"></div>' +
    '<div><label for="gaBail">Bailleur</label><input type="text" id="gaBail" value="' + htmlGA(f.bailleur) + '"></div></div>' +
    '<div class="duo"><div><label for="gaSite">Site</label><select id="gaSite">' +
      ['Saint-Brieuc', 'Loudéac'].map(s => '<option' + (f.site === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div>' +
    '<div><label for="gaAdr">Adresse ou repère</label><input type="text" id="gaAdr" value="' + htmlGA(f.adresse) + '" placeholder="Ex : 6 rue Saint-Benoît"></div></div>' +
    '<label for="gaEtat">État</label><select id="gaEtat"><option value="location">En location</option>' +
      '<option value="rendu"' + (f.etat === 'rendu' ? ' selected' : '') + '>Rendu</option></select>' +
    (GA.admin
      ? titre('💶 Loyer — administrateurs seulement') +
        '<div class="duo"><div><label for="gaLoyer">Loyer mensuel</label><input type="text" id="gaLoyer" inputmode="decimal" value="' +
          (f.loyer == null ? '' : htmlGA(eurGA(f.loyer).replace(' €', ''))) + '" placeholder="Ex : 50,00"></div>' +
        '<div><label for="gaDepuis">Loué depuis le</label><input type="date" id="gaDepuis" value="' + htmlGA(f.depuis || '') + '"></div></div>' +
        '<div class="gaAide" id="gaTrim"></div>'
      : '') +
    titre('🚗 Ce qu’il y a dedans') +
    '<div class="gaGrille">' + (actifs.length
      ? actifs.map(v => ck('gaV_' + htmlGA(v.id), htmlGA(nomVehiculeGA(v.id)), (f.vehicules || []).indexOf(String(v.id)) !== -1)).join('')
      : '<div class="gaAide">Aucun véhicule dans la flotte.</div>') + '</div>' +
    ck('gaStock', '📦 Du stockage', f.stockage) +
    '<input type="text" id="gaStockQuoi" value="' + htmlGA(f.stockageQuoi) + '" placeholder="Quoi ?">' +
    titre('🔌 Équipements') +
    ck('gaCoffre', '🔑 Coffre à clé', f.coffre) +
    '<div id="gaCode" class="gaCode"></div>' +
    '<div class="duo"><div><label for="gaPrises">Prises électriques</label><input type="number" id="gaPrises" min="0" value="' + (Number(f.prises) || 0) + '"></div><div></div></div>' +
    '<div class="gaGrille">' + ck('gaLum', '💡 Lumière', f.lumiere) + ck('gaAl', '🚨 Alarme', f.alarme) + ck('gaEau', '🚰 Point d’eau', f.eau) + '</div>' +
    '<label for="gaAutre">Autre</label><input type="text" id="gaAutre" value="' + htmlGA(f.autre) + '" placeholder="Ex : étagères, chargeur batterie moto">' +
    '<label for="gaRem">Remarque</label><textarea id="gaRem" rows="2" class="gaZone">' + htmlGA(f.remarque) + '</textarea>' +
    titre('📄 Contrat de location') +
    '<div id="gaContrat"></div>';

  /* le trimestre, calculé pendant la saisie */
  const zT = boite.querySelector('#gaTrim');
  const majTrim = () => {
    if(!zT) return;
    const v = lireEurosGA(boite.querySelector('#gaLoyer').value);
    zT.innerHTML = (v == null || Number.isNaN(v)) ? 'Le trimestre se calcule tout seul (3 × le loyer).'
      : 'Soit <strong>' + eurGA(3 * v) + '</strong> par trimestre. Il compte dans la ligne « Goulard — garages » des 💶 Charges fixes.';
  };
  if(zT){ boite.querySelector('#gaLoyer').addEventListener('input', majTrim); majTrim(); }

  dessinerCodeGA(boite.querySelector('#gaCode'), g, fond);
  dessinerContratGA(boite.querySelector('#gaContrat'), g, fond);

  if(lecture) boite.querySelectorAll('input, select, textarea').forEach(x => { if(!x.closest('#gaCode') && !x.closest('#gaContrat')) x.disabled = true; });

  const r = document.createElement('div');
  r.className = 'btn-row';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary'; bAnn.type = 'button';
  bAnn.textContent = lecture ? 'Fermer' : 'Annuler';
  bAnn.addEventListener('click', () => fermerFond(fond));
  r.appendChild(bAnn);
  if(!lecture){
    const bOk = document.createElement('button');
    bOk.className = 'btn btn-primary'; bOk.type = 'button';
    bOk.textContent = nouveau ? '➕ Ajouter' : '💾 Enregistrer';
    bOk.addEventListener('click', async () => {
      const q = s => boite.querySelector(s);
      const numero = q('#gaNum').value.trim();
      if(!numero){ showToast('Donne le numéro du garage.'); return; }
      const garage = {
        id: g ? g.id : '', numero: numero, bailleur: q('#gaBail').value.trim(), site: q('#gaSite').value,
        adresse: q('#gaAdr').value.trim(), etat: q('#gaEtat').value,
        vehicules: actifs.filter(v => { const c = q('#gaV_' + CSS.escape(String(v.id))); return c && c.checked; }).map(v => String(v.id)),
        stockage: q('#gaStock').checked ? 1 : 0, stockageQuoi: q('#gaStockQuoi').value.trim(),
        coffre: q('#gaCoffre').checked ? 1 : 0, prises: q('#gaPrises').value, lumiere: q('#gaLum').checked ? 1 : 0,
        alarme: q('#gaAl').checked ? 1 : 0, eau: q('#gaEau').checked ? 1 : 0, autre: q('#gaAutre').value.trim(),
        remarque: q('#gaRem').value.trim()
      };
      if(GA.admin){
        const v = lireEurosGA(q('#gaLoyer').value);
        if(Number.isNaN(v)){ showToast('Le loyer s’écrit comme 50,00.'); return; }
        garage.loyer = v;
        garage.depuis = q('#gaDepuis').value;
      }
      bOk.disabled = true; bOk.textContent = 'Enregistrement…';
      try{
        const d = await appelPrep({ action: 'garageEcrire', garage: garage });
        prendreGA(d);
        fermerFond(fond);
        showToast(nouveau ? 'Garage ajouté ✅' : 'Enregistré ✅');
        dessinerGarages();
        if(typeof dessinerListeFlotte === 'function') dessinerListeFlotte();
        /* un garage tout neuf : on rouvre sa fiche pour y déposer le contrat */
        if(nouveau && d.id){ const n = GA.liste.find(x => x.id === d.id); if(n) ouvrirFicheGarage(n); }
      }catch(e){
        showToast('Impossible : ' + e.message);
        bOk.disabled = false; bOk.textContent = nouveau ? '➕ Ajouter' : '💾 Enregistrer';
      }
    });
    r.appendChild(bOk);
  }
  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}

/* 🔑 Le code du coffre : jamais dans la page tant qu'on ne l'a pas demandé */
function dessinerCodeGA(z, g, fond){
  if(!z) return;
  z.innerHTML = '';
  if(!g){ z.innerHTML = '<div class="gaAide">Le code se range une fois le garage enregistré.</div>'; return; }
  if(!GA.cleCoffre){
    z.innerHTML = '<div class="gaAide">⚠️ Le coffre n’est pas encore prêt : il manque le secret « COFFRE_CLE » dans Cloudflare.</div>';
    return;
  }
  const rang = document.createElement('div');
  rang.className = 'gaCodeRang';
  if(g.codePose){
    const i = document.createElement('input');
    i.type = 'text'; i.value = '••••••'; i.readOnly = true; i.className = 'gaCodeMasque';
    i.setAttribute('aria-label', 'Code du coffre, masqué');
    rang.appendChild(i);
    const v = document.createElement('button');
    v.type = 'button'; v.className = 'btn btn-secondary gaMini'; v.textContent = '👁️ Voir le code';
    v.addEventListener('click', () => voirCodeGA(g));
    rang.appendChild(v);
  }else{
    const s = document.createElement('span');
    s.className = 'gaAide'; s.textContent = 'Aucun code rangé.';
    rang.appendChild(s);
  }
  if(GA.modifier){
    const c = document.createElement('button');
    c.type = 'button'; c.className = 'btn btn-secondary gaMini';
    c.textContent = g.codePose ? '✏️ Changer' : '✏️ Ranger le code';
    c.addEventListener('click', () => changerCodeGA(g, z, fond));
    rang.appendChild(c);
  }
  z.appendChild(rang);
}

/* « C'est bien toi ? » — le code de l'appli, puis 30 secondes */
function voirCodeGA(g){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(420px, 95vw);';
  boite.innerHTML = '<h3>🔑 Coffre à clé — garage n° ' + htmlGA(g.numero) + '</h3>' +
    '<p class="gaTexteModal">C’est bien toi ? Tape <strong>ton code de l’appli</strong>, celui de la connexion.</p>' +
    '<input type="password" id="gaConf" inputmode="numeric" autocomplete="off" class="gaConf">' +
    '<div class="gaErreur" id="gaConfErr"></div>' +
    '<div class="btn-row"><button class="btn btn-secondary" type="button" id="gaConfNon">Annuler</button>' +
    '<button class="btn btn-primary" type="button" id="gaConfOui">👁️ Voir</button></div>' +
    '<div id="gaVu"></div>';
  let minuterie = null;
  const fermer = () => { if(minuterie) clearInterval(minuterie); fermerFond(fond); };
  boite.querySelector('#gaConfNon').addEventListener('click', fermer);
  const go = async () => {
    const b = boite.querySelector('#gaConfOui');
    const conf = boite.querySelector('#gaConf').value.trim();
    if(!conf) return;
    b.disabled = true;
    try{
      const d = await appelPrep({ action: 'garageCodeVoir', id: g.id, confirme: conf });
      if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
      boite.querySelector('#gaConf').value = '';
      boite.querySelector('#gaConfErr').textContent = '';
      let reste = Number(d.secondes) || 30;
      const z = boite.querySelector('#gaVu');
      z.innerHTML = '<div class="gaVuRang"><strong class="gaCodeVu"></strong><span class="gaVide"></span>' +
        '<span class="gaAide" id="gaReste"></span><button class="btn btn-secondary gaMini" type="button" id="gaCacher" aria-label="Cacher">🙈</button></div>';
      z.querySelector('.gaCodeVu').textContent = String(d.code).split('').join(' ');
      const maj = () => { const s = z.querySelector('#gaReste'); if(s) s.textContent = 'se recache dans ' + reste + ' s'; };
      maj();
      minuterie = setInterval(() => { reste--; if(reste <= 0) fermer(); else maj(); }, 1000);
      z.querySelector('#gaCacher').addEventListener('click', fermer);
    }catch(e){
      boite.querySelector('#gaConfErr').textContent = '⚠️ ' + e.message;
      b.disabled = false;
    }
  };
  boite.querySelector('#gaConfOui').addEventListener('click', go);
  boite.querySelector('#gaConf').addEventListener('keydown', ev => { if(ev.key === 'Enter') go(); });
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#gaConf').focus(), 100);
}

function changerCodeGA(g, zone, fondFiche){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(420px, 95vw);';
  boite.innerHTML = '<h3>🔑 Code du coffre — garage n° ' + htmlGA(g.numero) + '</h3>' +
    '<label for="gaNouveau">Nouveau code</label><input type="text" id="gaNouveau" autocomplete="off" placeholder="Laisse vide pour retirer le code">' +
    '<p class="gaAide">Il est rangé chiffré. Changer le code ici ne le change pas sur le boîtier.</p>' +
    '<div class="btn-row"><button class="btn btn-secondary" type="button" id="gaNon">Annuler</button>' +
    '<button class="btn btn-primary" type="button" id="gaOui">💾 Enregistrer</button></div>';
  boite.querySelector('#gaNon').addEventListener('click', () => fermerFond(fond));
  boite.querySelector('#gaOui').addEventListener('click', async ev => {
    const b = ev.currentTarget;
    b.disabled = true;
    try{
      const d = await appelPrep({ action: 'garageCodePoser', id: g.id, nouveau: boite.querySelector('#gaNouveau').value.trim() });
      prendreGA(d);
      fermerFond(fond);
      showToast('Code rangé ✅');
      const n = GA.liste.find(x => x.id === g.id);
      if(n){ Object.assign(g, { codePose: n.codePose, coffre: n.coffre }); dessinerCodeGA(zone, g, fondFiche); }
      const cc = fondFiche && fondFiche.querySelector('#gaCoffre');
      if(cc && n && n.coffre) cc.checked = true;
      dessinerGarages();
    }catch(e){ showToast('Impossible : ' + e.message); b.disabled = false; }
  });
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#gaNouveau').focus(), 100);
}

/* 📄 Le contrat : le voir, le déposer, le remplacer */
function dessinerContratGA(z, g, fond){
  if(!z) return;
  z.innerHTML = '';
  if(!g){ z.innerHTML = '<div class="gaAide">Le contrat se dépose une fois le garage enregistré.</div>'; return; }
  const rang = document.createElement('div');
  rang.className = 'gaCodeRang';
  if(g.pdf){
    const v = document.createElement('button');
    v.type = 'button'; v.className = 'btn btn-secondary gaMini'; v.textContent = '📄 Voir le contrat';
    v.addEventListener('click', async () => {
      v.disabled = true;
      try{
        const d = await appelPrep({ action: 'garagePdfLien', id: g.id });
        if(d && d.lien) window.open(/^https?:/.test(d.lien) ? d.lien : CONFIG.WORKER_URL + d.lien, '_blank', 'noopener');
      }catch(e){ showToast('Impossible : ' + e.message); }
      v.disabled = false;
    });
    rang.appendChild(v);
  }
  if(GA.modifier){
    const fichier = document.createElement('input');
    fichier.type = 'file'; fichier.accept = 'application/pdf,.pdf'; fichier.hidden = true;
    const d = document.createElement('button');
    d.type = 'button'; d.className = 'btn btn-secondary gaMini';
    d.textContent = g.pdf ? '🔁 Remplacer le PDF' : '📎 Déposer le contrat (PDF)';
    d.addEventListener('click', () => fichier.click());
    fichier.addEventListener('change', async () => {
      const f = fichier.files && fichier.files[0];
      if(!f) return;
      if(f.size > 10 * 1024 * 1024){ showToast('10 Mo au plus.'); return; }
      d.disabled = true; d.textContent = 'Envoi…';
      try{
        const data = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ko(new Error('Lecture impossible')); r.readAsDataURL(f); });
        const rep = await appelPrep({ action: 'garagePdf', id: g.id, fichier: data, nom: f.name });
        prendreGA(rep);
        const n = GA.liste.find(x => x.id === g.id);
        if(n) g.pdf = n.pdf;
        showToast(g.pdf ? 'Contrat rangé ✅' : 'Envoyé');
        dessinerContratGA(z, g, fond);
        dessinerGarages();
      }catch(e){
        showToast('Impossible : ' + e.message);
        d.disabled = false; d.textContent = g.pdf ? '🔁 Remplacer le PDF' : '📎 Déposer le contrat (PDF)';
      }
    });
    rang.appendChild(fichier);
    rang.appendChild(d);
  }
  z.appendChild(rang);
  const info = document.createElement('div');
  info.className = 'gaAide';
  info.textContent = g.pdf
    ? g.pdf.nom + ' · déposé le ' + new Date(g.pdf.le).toLocaleDateString('fr-FR') + (g.pdf.par ? ' par ' + g.pdf.par : '')
    : 'Aucun contrat déposé.';
  z.appendChild(info);
}

/* 📥 La toute première fois : les garages et leurs contrats, d'un fichier */
function boutonImportGA(){
  const rang = document.createElement('div');
  rang.className = 'gaCodeRang';
  const fichier = document.createElement('input');
  fichier.type = 'file'; fichier.accept = '.json,application/json'; fichier.hidden = true;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn btn-primary gaMini'; b.textContent = '📥 Charger la liste de départ';
  b.addEventListener('click', () => fichier.click());
  fichier.addEventListener('change', async () => {
    const f = fichier.files && fichier.files[0];
    if(!f) return;
    b.disabled = true;
    try{
      const j = JSON.parse(await f.text());
      if(!j || j.quoi !== 'garages' || !Array.isArray(j.garages)) throw new Error('Ce fichier n’est pas une liste de garages.');
      let n = 0;
      for(const x of j.garages){
        b.textContent = 'Garage ' + (++n) + ' / ' + j.garages.length + '…';
        const d = await appelPrep({ action: 'garageEcrire', garage: Object.assign({}, x, { pdf: undefined }) });
        if(x.pdf && d && d.id){
          await appelPrep({ action: 'garagePdf', id: d.id, fichier: 'data:application/pdf;base64,' + x.pdf.contenu, nom: x.pdf.nom });
        }
      }
      showToast(n + ' garages rangés ✅');
      GA.lu = false;
      afficherGarages();
    }catch(e){
      showToast('Impossible : ' + e.message);
      b.disabled = false; b.textContent = '📥 Charger la liste de départ';
      GA.lu = false;
      afficherGarages();
    }
  });
  rang.appendChild(fichier);
  rang.appendChild(b);
  return rang;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-garages.js'] = true;
