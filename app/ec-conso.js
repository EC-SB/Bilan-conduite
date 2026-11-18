/* Déployé le 18/11/2026 à 15:51 — v1470 */
/* ============================================================
   ec-conso.js — v1470
   📊 CE QUI INTERROGE LE SERVEUR (Gestion › Accès, admins)

   David, le 18 novembre : Cloudflare prévient « 75 % de la limite de
   100 000 requêtes par jour » — « mesure ce qui consomme le plus et
   vois comment réduire ». Le Worker compte chaque requête par sa porte
   et son action (voir « CE QUI INTERROGE LE WORKER, COMPTÉ » dans
   cloudflare-worker.js) ; cet écran les range de la plus coûteuse à la
   moins coûteuse, avec la part de chacune et le rythme heure par heure.
   ============================================================ */

/* Les noms lisibles des portes les plus fréquentes ; les autres
   s'affichent telles que le Worker les compte. */
const CONSO_NOMS = {
  'POST /appel · pouls': '🎥 Visio ou appel : le battement (prof toutes les 3 s, élève 5 s)',
  'POST /appel · recevoir': '🎥 Visio ou appel : recevoir les pistes',
  'POST /sheets · presence': '🟢 Présence de l’équipe (« en ligne »)',
  'POST /sheets · convList': '💬 Messagerie : la liste et la pastille',
  'POST /sheets · convFil': '💬 Messagerie : la conversation ouverte',
  'POST /sheets · convCompte': '💬 Messagerie : le compte des non lus',
  'POST /sheets · mailReleve': '✉️ Mails : relève automatique',
  'POST /sheets · mailListe': '✉️ Mails : la liste',
  'POST /sheets · bureauEtat': '🗂️ Bureau : relecture automatique',
  'POST /sheets · prepList': '📋 Cours préparés : relecture',
  'POST /sheets · visioLire': '🎥 Carte de la visio (écran Code)',
  'POST /sheets · cafeEtat': '☕ Coin café',
  'GET /tuile': '🗺️ Cartes : les tuiles du fond de carte',
  'GET /ws': '⚡ Messagerie en direct : connexion',
  'POST /auth': '🔑 Connexions et vérifications de code'
};
function nomConso(cle){
  if(CONSO_NOMS[cle]) return CONSO_NOMS[cle];
  const sans = String(cle).replace(' (ordinateur de la salle)', '');
  if(sans !== cle && CONSO_NOMS[sans]) return CONSO_NOMS[sans] + ' — ordinateur de la salle';
  const m = String(cle).match(/^POST \/eleve · (.+)$/);
  if(m) return '🎓 Espace élève : ' + m[1];
  return cle;
}

let consoJours = 1;
async function chargerConsoServeur(){
  const z = document.getElementById('consoZone');
  if(!z) return;
  if(window.EC_POSTE || typeof ACCES === 'undefined' || !ACCES || ACCES.role !== 'admin'){ z.innerHTML = ''; z.style.display = 'none'; return; }
  z.style.display = '';
  const ech = (v) => (typeof echapper === 'function') ? echapper(v) : String(v == null ? '' : v);
  z.innerHTML = '<div class="section-title">📊 Ce qui interroge le serveur</div>' +
    '<div class="cdAide consoAide">Cloudflare compte toutes les requêtes du Worker (100 000 par jour en gratuit). Voici d’où elles viennent, ' +
    'de la plus coûteuse à la moins coûteuse. Le compte a commencé avec la v1470 ; il est un peu en dessous du vrai total (ce qui n’est pas encore écrit quand Cloudflare éteint une instance).</div>' +
    '<div class="consoChoix"><button type="button" data-j="1">24 heures</button><button type="button" data-j="7">7 jours</button></div>' +
    '<div class="consoCorps">' + (typeof htmlAttente === 'function' ? htmlAttente('Lecture…') : '⏳') + '</div>';
  z.querySelectorAll('.consoChoix button').forEach(b => {
    b.classList.toggle('on', Number(b.dataset.j) === consoJours);
    b.addEventListener('click', () => { consoJours = Number(b.dataset.j); chargerConsoServeur(); });
  });
  const corps = z.querySelector('.consoCorps');
  let d;
  try{ d = await appelPrep({ action: 'consoRequetes', jours: consoJours }); }
  catch(e){ corps.innerHTML = '<div class="cdAide">⚠️ ' + ech((e && e.message) || e) + '</div>'; return; }
  const l = (d && d.parCle) || [];
  const total = l.reduce((t, x) => t + x.n, 0);
  if(!total){ corps.innerHTML = '<div class="cdAide">Rien de compté pour l’instant : le compte commence au déploiement de la v1470. Reviens dans une heure.</div>'; return; }
  const h = (d.parHeure || []);
  const heures = Math.max(1, h.length);
  const parJour = Math.round(total / heures * 24);
  let html = '<div class="consoTotal"><b>' + total.toLocaleString('fr-FR') + '</b> requêtes comptées sur ' + heures + ' h' +
    ' · à ce rythme, toute la journée : <b>~' + parJour.toLocaleString('fr-FR') + ' par jour</b>' +
    (parJour > 100000 ? ' <span class="consoAlerte">au-dessus de la limite gratuite</span>' : parJour > 75000 ? ' <span class="consoAlerte">proche de la limite</span>' : '') + '</div>';
  /* le rythme, heure par heure */
  const max = Math.max.apply(null, h.map(x => x.n).concat(1));
  html += '<div class="consoHeures" role="img" aria-label="Requêtes par heure">' + h.map(x =>
    '<span title="' + ech(x.heure.slice(8, 10) + '/' + x.heure.slice(5, 7) + ' ' + x.heure.slice(11) + ' h : ' + x.n.toLocaleString('fr-FR') + ' requêtes') + '" style="height:' + Math.max(4, Math.round(x.n / max * 100)) + '%"></span>').join('') + '</div>';
  html += '<div class="consoListe">';
  l.slice(0, 40).forEach((x, i) => {
    const part = x.n / total * 100;
    html += '<div class="consoLigne"><span class="consoRang">' + (i + 1) + '</span>' +
      '<span class="consoNom"><b>' + ech(nomConso(x.cle)) + '</b><small>' + ech(x.cle) + '</small>' +
      '<i class="consoBarre"><i style="width:' + Math.max(1, part).toFixed(1) + '%"></i></i></span>' +
      '<span class="consoN"><b>' + (part >= 1 ? Math.round(part) : part.toFixed(1)) + ' %</b><small>' + x.n.toLocaleString('fr-FR') + '</small></span></div>';
  });
  html += '</div>';
  corps.innerHTML = html;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-conso.js'] = true;
