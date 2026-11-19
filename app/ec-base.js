/* Déployé le 19/11/2026 à 11:42 — v1474 */
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
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-base.js'] = true;
