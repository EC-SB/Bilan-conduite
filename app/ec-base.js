/* Déployé le 19/11/2026 à 14:37 — v1484 */
/* ============================================================
   ec-base.js — v1474
   🗄️ LA BASE DE L'APPLI (Gestion › Accès, admins)

   David, le 19 novembre : « tout passer sur D1 et juste en backup
   Sheets », « une fois par nuit et un bouton sur l'app pour le faire
   en direct ». Étape 1 : la fiche de suivi des élèves (SuiviPermis).
   Le Worker la lit et l'écrit dans D1, la recopie dans la feuille
   quelques secondes après chaque changement, et compare les deux
   chaque nuit vers 3 h (voir « LA FICHE DE SUIVI VIT DANS D1 » dans
   cloudflare-worker.js).

   Cet écran dit où en est la bascule, garde le journal des
   sauvegardes, et porte les deux boutons : sauvegarder maintenant, et
   revenir à la feuille si quelque chose n'allait pas.
   ============================================================ */

let baseRetourArme = false;

function baseQuand(ms){
  if(!ms) return '';
  try{
    return new Date(Number(ms)).toLocaleString('fr-FR', { timeZone:'Europe/Paris', day:'2-digit', month:'2-digit',
      hour:'2-digit', minute:'2-digit' }).replace(',', ' à');
  }catch(e){ return ''; }
}

function baseMotif(x){
  if(x.motif === 'nuit') return '🌙 Cette nuit';
  if(x.motif === 'retour') return '↩️ Retour à la feuille' + (x.par ? ' — ' + x.par : '');
  return '👆 Au bouton' + (x.par ? ' — ' + x.par : '');
}

async function chargerBaseServeur(quoi){
  const z = document.getElementById('baseZone');
  if(!z) return;
  if(window.EC_POSTE || typeof ACCES === 'undefined' || !ACCES || ACCES.role !== 'admin'){ z.innerHTML = ''; z.style.display = 'none'; return; }
  z.style.display = '';
  const ech = (v) => (typeof echapper === 'function') ? echapper(v) : String(v == null ? '' : v);
  if(!z.querySelector('.baseCorps')){
    z.innerHTML = '<div class="section-title">🗄️ La base de l’appli</div>' +
      '<div class="cdAide baseAide">La fiche de suivi des élèves vit dans D1, la base de Cloudflare : l’appli la lit et l’écrit là, ' +
      'sans attendre Google. Chaque changement est recopié dans la feuille Google quelques secondes après, et chaque nuit ' +
      'vers 3 h les deux sont comparées et réalignées. La feuille reste la sauvegarde.</div>' +
      '<div class="baseCorps"></div>';
  }
  const corps = z.querySelector('.baseCorps');
  if(quoi){
    corps.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const enCours = corps.querySelector('.baseMsg');
    if(enCours) enCours.innerHTML = quoi === 'revenir' ? '⏳ Retour à la feuille…' : '⏳ Sauvegarde en cours — quelques secondes…';
  }else{
    corps.innerHTML = (typeof htmlAttente === 'function') ? htmlAttente('Lecture…') : '⏳';
  }
  let d;
  try{ d = await appelPrep(Object.assign({ action:'baseSuivi' }, quoi ? { quoi: quoi } : {})); }
  catch(e){
    if(quoi){ baseRetourArme = false; try{ d = await appelPrep({ action:'baseSuivi' }); d.erreur = (e && e.message) || String(e); }catch(e2){ d = null; } }
    if(!d){ corps.innerHTML = '<div class="cdAide">⚠️ ' + ech((e && e.message) || e) + '</div>'; return; }
  }
  baseRetourArme = false;

  let html = '';
  if(d.actif){
    html += '<div class="baseEtat baseOk"><b>✅ Suivi des élèves : dans D1</b>' +
      '<small>depuis le ' + ech(baseQuand(d.depuis)) + ' · ' + Number(d.fiches || 0).toLocaleString('fr-FR') + ' fiches · ' +
      (d.attente ? '⏳ ' + d.attente + ' fiche' + (d.attente > 1 ? 's' : '') + ' en route vers la feuille'
                 : 'tout est recopié dans la feuille') + '</small></div>';
  }else{
    html += '<div class="baseEtat"><b>⏸️ Le suivi des élèves est encore lu dans la feuille Google</b>' +
      '<small>Il passera dans D1 cette nuit vers 3 h, ou tout de suite avec le bouton. Rien ne change pour l’équipe.</small></div>';
  }
  const msg = d.erreur ? '⚠️ ' + d.erreur : (d.message || '');
  html += '<div class="baseMsg' + (d.erreur ? ' baseKo' : '') + '">' + ech(msg) + '</div>';
  html += '<div class="baseBoutons">' +
    '<button type="button" class="btn btn-primary" data-base="sauvegarder">' + (d.actif ? '💾 Sauvegarder maintenant' : '🗄️ Basculer maintenant') + '</button>' +
    (d.actif ? '<button type="button" class="btn baseRetour" data-base="revenir">↩️ Revenir à la feuille</button>' : '') +
    '</div>';

  const sv = d.sauvegardes || [];
  if(sv.length){
    html += '<div class="baseTitre">Dernières sauvegardes</div><div class="baseListe">';
    sv.forEach(x => {
      const ic = x.etat === 'ok' ? '✅' : x.etat === 'partiel' ? '⚠️' : x.etat === 'echec' ? '❌' : '⏳';
      const duree = (x.fin && x.debut) ? Math.max(1, Math.round((x.fin - x.debut) / 1000)) + ' s' : '';
      html += '<div class="baseLigne"><span class="baseIc">' + ic + '</span><span class="baseTexte"><b>' + ech(baseQuand(x.debut)) +
        '</b> · ' + ech(baseMotif(x)) + (duree ? ' · ' + duree : '') + '<small>' + ech(x.detail || '') + '</small></span></div>';
    });
    html += '</div>';
  }
  const ec = d.ecarts || [];
  if(ec.length){
    html += '<div class="baseTitre">Différences trouvées sans explication</div>' +
      '<div class="cdAide">Une case de la feuille changée par autre chose que l’appli (une main dans Google Sheets, par exemple). ' +
      'C’est la feuille qui a été gardée.</div><div class="baseListe">';
    ec.slice(0, 20).forEach(x => {
      html += '<div class="baseLigne"><span class="baseTexte"><b>' + ech(x.eleve) + '</b> · ' + ech(x.champ) + ' · ' + ech(baseQuand(x.le)) +
        '<small>' + ech(x.sens) + ' : « ' + ech(x.base || '(vide)') + ' » → « ' + ech(x.feuille || '(vide)') + ' »</small></span></div>';
    });
    html += '</div>';
  }
  corps.innerHTML = html;

  corps.querySelectorAll('[data-base]').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.base;
    if(q === 'revenir' && !baseRetourArme){
      /* deux temps, sans fenêtre du navigateur : le premier appui demande, le second fait */
      baseRetourArme = true;
      b.textContent = '↩️ Oui, revenir à la feuille';
      b.classList.add('baseArme');
      const m = corps.querySelector('.baseMsg');
      if(m) m.textContent = 'L’appli relira et écrira le suivi dans Google, plus lentement, comme avant. Appuie encore pour confirmer.';
      return;
    }
    chargerBaseServeur(q);
  }));
  if(!quoi) chargerBaseEleve();
}

/* ============================================================
   ⚡ v1475 — L'ESPACE ÉLÈVE SANS APPS SCRIPT (étape 2)

   Le Worker sait construire lui-même la connexion de l'espace élève
   (12 s chez Apps Script, mesurées le 19/11 en démonstration). Avant
   de l'allumer, « 🔍 Comparer avec Apps Script » demande les deux
   réponses pour chaque élève qui a un accès ouvert, cinq par cinq
   (rien n'est noté à leur nom), et montre chaque différence.
   ============================================================ */
let baseEleveComparaison = null;   /* { faits, total, egaux, ecarts: [] } */

async function chargerBaseEleve(quoi){
  const z = document.getElementById('baseZone');
  if(!z) return;
  let b = z.querySelector('.baseEleve');
  if(!b){ b = document.createElement('div'); b.className = 'baseEleve'; z.appendChild(b); }
  const ech = (v) => (typeof echapper === 'function') ? echapper(v) : String(v == null ? '' : v);
  b.querySelectorAll('button').forEach(x => { x.disabled = true; });
  let d;
  try{ d = await appelPrep(Object.assign({ action:'baseEleve' }, quoi ? { quoi: quoi } : {})); }
  catch(e){ b.innerHTML = '<div class="baseTitre">⚡ L’espace élève sans Apps Script</div><div class="cdAide">⚠️ ' + ech((e && e.message) || e) + '</div>'; return; }

  let html = '<div class="baseTitre">⚡ L’espace élève sans Apps Script</div>' +
    '<div class="cdAide">Son ouverture attendait Apps Script (une douzaine de secondes). Cloudflare sait maintenant construire son espace ' +
    'lui-même, en une seconde, avec les mêmes règles. Avant d’allumer, la comparaison vérifie élève par élève que les deux donnent exactement la même chose.</div>' +
    '<div class="baseEtat' + (d.actif ? ' baseOk' : '') + '"><b>' + (d.actif ? '✅ Allumé : l’espace élève ne passe plus par Apps Script' : '⏸️ Éteint : l’espace élève passe encore par Apps Script') + '</b>' +
    (d.le ? '<small>' + (d.actif ? 'allumé' : 'éteint') + ' le ' + ech(baseQuand(d.le)) + (d.par ? ' par ' + ech(d.par) : '') + '</small>' : '') + '</div>';
  const c = baseEleveComparaison;
  if(c){
    const fini = c.faits >= c.total;
    html += '<div class="baseMsg' + (c.ecarts.length ? ' baseKo' : '') + '">' +
      (fini ? (c.ecarts.length ? '⚠️ ' + c.ecarts.length + ' élève(s) sur ' + c.total + ' avec une différence.'
                               : '✅ ' + c.total + ' élèves comparés : tout est identique.')
            : '⏳ Comparaison : ' + c.faits + ' / ' + c.total + ' élèves…') + '</div>';
    if(c.ecarts.length){
      html += '<div class="baseListe">';
      c.ecarts.slice(0, 30).forEach(x => {
        const l = (x.differences || []).slice(0, 6).map(y => ech(y.ou) + ' : Apps Script « ' + ech(String(y.appsScript).slice(0, 80)) + ' » · ici « ' + ech(String(y.ici).slice(0, 80)) + ' »').join('<br>');
        html += '<div class="baseLigne"><span class="baseIc">⚠️</span><span class="baseTexte"><b>' + ech(x.eleve) + '</b>' +
          '<small>' + (x.erreur ? ech(x.erreur) : l) + '</small></span></div>';
      });
      html += '</div>';
    }
  }
  const enCours = c && c.faits < c.total;
  html += '<div class="baseBoutons">' +
    '<button type="button" class="btn baseRetour" data-eleve="comparer"' + (enCours ? ' disabled' : '') + '>🔍 Comparer avec Apps Script</button>' +
    (d.actif ? '<button type="button" class="btn baseRetour" data-eleve="eteindre">⏸️ Éteindre</button>'
             : '<button type="button" class="btn btn-primary" data-eleve="allumer">⚡ Allumer</button>') + '</div>';
  /* 🪞 v1477 — les feuilles gardées dans D1 (plus lues chez Google à chaque fois) */
  const mi = (d.miroirs && d.miroirs.plages) || [];
  if(mi.length){
    const parFeuille = {};
    mi.forEach(x => {
      const f = String(x.plage).split('!')[0].replace(/^'|'$/g, '');
      const p = parFeuille[f] = parFeuille[f] || { ko: 0, quand: 0 };
      p.ko += x.ko; p.quand = Math.max(p.quand, x.quand);
    });
    const noms = Object.keys(parFeuille).sort();
    html += '<div class="baseTitre">🪞 Feuilles lues dans D1</div>' +
      '<div class="cdAide">Copiées depuis Google, et relues seulement quand elles changent (ou au bout d’un quart d’heure). ' +
      'Écrites dans Google comme avant. Si quelqu’un a modifié une feuille à la main dans Google : ' +
      '<button type="button" class="btn btn-secondary" data-eleve="relire" style="width:auto;margin:6px 0 0;padding:6px 12px;font-size:13px;">🔄 Tout relire depuis Google</button></div><div class="baseListe">' +
      noms.map(f => '<div class="baseLigne"><span class="baseTexte"><b>' + ech(f) + '</b> · ' + parFeuille[f].ko.toLocaleString('fr-FR') + ' Ko' +
        '<small>copiée le ' + ech(baseQuand(parFeuille[f].quand)) + '</small></span></div>').join('') + '</div>';
  }
  /* 🔎 v1478 — les appels à Apps Script qui font tout relire (ceux à sortir d'Apps Script en premier) */
  const qui = (d.miroirs && d.miroirs.qui) || [];
  if(qui.length){
    html += '<div class="baseTitre">🔎 Ce qui passe encore par Apps Script</div>' +
      '<div class="cdAide">Chacun de ces appels peut écrire dans Google : toutes les copies sont alors relues. ' +
      'Ce sont les prochains à faire passer par D1.</div><div class="baseListe">' +
      qui.slice(0, 15).map(x => '<div class="baseLigne"><span class="baseTexte"><b>' + ech(x.action) + '</b> · ' +
        x.n.toLocaleString('fr-FR') + ' fois<small>dernier le ' + ech(baseQuand(x.le)) + '</small></span></div>').join('') + '</div>';
  }
  b.innerHTML = html;
  b.querySelectorAll('[data-eleve]').forEach(x => x.addEventListener('click', () => {
    if(x.dataset.eleve === 'comparer') comparerBaseEleve();
    else chargerBaseEleve(x.dataset.eleve);
  }));
}

async function comparerBaseEleve(){
  baseEleveComparaison = { faits: 0, total: 1, egaux: 0, ecarts: [] };
  chargerBaseEleve();
  let depuis = 0;
  try{
    for(let tour = 0; tour < 100 && depuis !== null; tour++){
      const r = await appelPrep({ action:'baseEleve', quoi:'comparer', depuis: depuis });
      const c = baseEleveComparaison;
      c.total = r.total || 0;
      (r.resultats || []).forEach(x => { c.faits++; if(x.egal) c.egaux++; else c.ecarts.push(x); });
      depuis = r.suivant;
      if(depuis === null) c.faits = c.total;
      chargerBaseEleve();
    }
  }catch(e){
    baseEleveComparaison.ecarts.push({ eleve: '—', erreur: 'Comparaison interrompue : ' + ((e && e.message) || e) });
    baseEleveComparaison.faits = baseEleveComparaison.total;
    chargerBaseEleve();
  }
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-base.js'] = true;
