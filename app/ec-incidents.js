/* Déployé le 01/09/2026 à 13:21 — v768 */
/* ============================================================
   ec-incidents.js
   Quand ça casse chez un moniteur, le bureau doit le savoir.

   Jusqu'ici une erreur s'affichait sur l'écran de celui qui la
   subissait, puis disparaissait. Une monitrice a passé une soirée
   entière bloquée sans que personne ne puisse voir ce qu'elle
   voyait — il a fallu se connecter à son compte le lendemain pour
   lire le message.

   Désormais chaque erreur part au classeur : qui, quelle version,
   quel appareil, quel message. Le bureau ouvre un écran et sait.

   Trois principes :
     • ça ne doit JAMAIS gêner le moniteur — aucun signalement ne
       bloque, ne ralentit, ni ne fait échouer quoi que ce soit ;
     • pas de bavardage : la même erreur répétée n'est envoyée
       qu'une fois, et il y a un plafond par session ;
     • rien de l'élève : le message et le contexte technique, pas
       la transcription ni le bilan.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Un moniteur qui enchaîne les erreurs ne doit pas remplir la
   feuille à lui seul. */
const MAXI_INCIDENTS_SESSION = 25;
let incidentsEnvoyes = 0;
const incidentsVus = {};

/* Ce que porte l'appareil, en une ligne lisible. Le user-agent
   brut est illisible ; on en garde ce qui sert à comprendre. */
function appareilLisible(){
  const ua = String(navigator.userAgent || '');
  const os = /Android/i.test(ua) ? 'Android'
           : /iPhone|iPad|iPod/i.test(ua) ? 'iPhone/iPad'
           : /Windows/i.test(ua) ? 'Windows'
           : /Mac OS/i.test(ua) ? 'Mac'
           : 'autre';
  const nav = /EdgA?\//i.test(ua) ? 'Edge'
            : /SamsungBrowser/i.test(ua) ? 'Samsung'
            : /FxiOS|Firefox/i.test(ua) ? 'Firefox'
            : /CriOS|Chrome/i.test(ua) ? 'Chrome'
            : /Safari/i.test(ua) ? 'Safari'
            : 'autre';
  const vOs = (ua.match(/Android \d+(\.\d+)?/) ||
               ua.match(/OS (\d+[_.]\d+)/) || [''])[0].replace(/_/g, '.');
  return os + (vOs && vOs !== os ? ' ' + vOs.replace(/^OS /, '') : '') + ' · ' + nav;
}

/* La version réellement chargée, lue dans les modules : c'est elle
   qui compte, pas celle qu'on croit avoir déployée. */
function versionLisible(){
  try{
    if(typeof lireVersionChargee === 'function'){
      const v = lireVersionChargee();
      if(v) return 'v' + v;
    }
  }catch(e){}
  return '?';
}

/* ------------------------------------------------------------
   SIGNALER

   « ou » dit à quel moment : génération du bilan, envoi d'un
   rappel, démarrage. Sans lui, un message d'erreur ne raconte
   qu'une moitié d'histoire.
   ------------------------------------------------------------ */
function signalerIncident(message, ou, details){
  try{
    const texte = String(message || '').slice(0, 500);
    if(!texte.trim()) return;

    /* Deux fois la même erreur au même endroit, c'est une seule
       information. On la garde une fois. */
    const cle = (ou || '') + '|' + texte.slice(0, 120);
    if(incidentsVus[cle]) return;
    incidentsVus[cle] = true;

    if(incidentsEnvoyes >= MAXI_INCIDENTS_SESSION) return;
    incidentsEnvoyes++;

    /* Sans code d'accès on ne sait pas qui c'est, et l'appel serait
       refusé : on n'insiste pas. */
    if(typeof ACCES === 'undefined' || !ACCES.code) return;

    appelPrep({
      action: 'incidentAdd',
      message: texte,
      ou: String(ou || '').slice(0, 80),
      version: versionLisible(),
      appareil: appareilLisible(),
      details: String(details || '').slice(0, 800)
    }).catch(() => {});
  }catch(e){
    /* Un signalement qui échoue ne doit surtout pas se signaler
       lui-même : on s'arrête là, en silence. */
  }
}

/* ------------------------------------------------------------
   CE QUI EST ATTRAPÉ TOUT SEUL
   ------------------------------------------------------------ */
function veillerIncidents(){
  window.addEventListener('error', ev => {
    /* Un fichier absent : c'est un déploiement incomplet, et c'est
       exactement ce qu'on veut voir remonter. */
    if(ev.target && ev.target.tagName === 'SCRIPT'){
      signalerIncident('Fichier introuvable : ' +
        String(ev.target.src || '?').split('/').pop(), 'chargement');
      return;
    }
    signalerIncident(ev.message || 'erreur',
      String(ev.filename || '').split('/').pop() +
      (ev.lineno ? ' ligne ' + ev.lineno : ''));
  }, true);

  window.addEventListener('unhandledrejection', ev => {
    const r = ev.reason;
    signalerIncident((r && r.message) || String(r), 'promesse');
  });
}

/* ------------------------------------------------------------
   L'ÉCRAN DU BUREAU
   ------------------------------------------------------------ */
let incidents = null;

async function afficherIncidents(recharger){
  const zone = $('incidentsZone');
  if(!zone) return;

  if(recharger) incidents = null;

  if(incidents === null){
    zone.innerHTML = (typeof htmlAttente === 'function')
      ? htmlAttente('Lecture des signalements…')
      : '<div class="empty">Lecture…</div>';
    try{
      const d = await appelPrep({ action: 'incidentList', combien: 120 });
      incidents = (d && d.incidents) || [];
    }catch(e){
      zone.innerHTML = '<div class="empty">⚠️ ' +
        e.message.replace(/</g, '&lt;') + '</div>';
      return;
    }
  }

  zone.innerHTML = '';

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;';
  const bMaj = document.createElement('button');
  bMaj.className = 'btn btn-secondary';
  bMaj.style.cssText = 'width:auto;padding:10px 14px;font-size:13px;margin:0;';
  bMaj.textContent = '🔄 Actualiser';
  bMaj.addEventListener('click', () => afficherIncidents(true));
  r.appendChild(bMaj);

  const info = document.createElement('div');
  info.style.cssText = 'flex:1;font-size:12px;color:var(--muted);line-height:1.5;';
  info.textContent = "Ce que tes moniteurs ont vu s'afficher, et que tu n'aurais " +
    "pas su autrement.";
  r.appendChild(info);
  zone.appendChild(r);

  if(!incidents.length){
    zone.innerHTML += '<div class="empty">✅ <strong>Aucun signalement.</strong><br>' +
      '<span style="font-size:12px;">Rien n\'a cassé chez personne.</span></div>';
    return;
  }

  /* Regroupé par message : dix fois la même erreur chez trois
     moniteurs, c'est UN problème, pas trente. */
  const familles = {};
  incidents.forEach(x => {
    const cle = String(x.message || '').slice(0, 120);
    if(!familles[cle]){
      familles[cle] = { message: x.message, ou: x.ou, combien: 0,
                        qui: {}, versions: {}, appareils: {},
                        premier: x.quand, dernier: x.quand, details: x.details };
    }
    const f = familles[cle];
    f.combien++;
    if(x.moniteur) f.qui[x.moniteur] = true;
    if(x.version) f.versions[x.version] = true;
    if(x.appareil) f.appareils[x.appareil] = true;
    if(String(x.quand || '') > String(f.dernier || '')) f.dernier = x.quand;
    if(String(x.quand || '') < String(f.premier || '')) f.premier = x.quand;
    if(!f.details && x.details) f.details = x.details;
  });

  const liste = Object.keys(familles).map(k => familles[k])
    .sort((a, b) => String(b.dernier || '').localeCompare(String(a.dernier || '')));

  const t = document.createElement('div');
  t.style.cssText = 'padding:10px 12px;border:1px solid var(--line);' +
    'border-radius:10px;margin-bottom:10px;font-size:13px;line-height:1.6;';
  t.innerHTML = '<strong>' + liste.length + ' problème(s) distinct(s)</strong>' +
    ' · ' + incidents.length + ' signalement(s)';
  zone.appendChild(t);

  liste.forEach(f => zone.appendChild(ligneIncident(f)));
}

function ligneIncident(f){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
    'padding:10px 12px;margin-bottom:7px;';

  const qui = Object.keys(f.qui);
  const versions = Object.keys(f.versions);
  const appareils = Object.keys(f.appareils);

  /* Une erreur qui ne frappe qu'une personne sur une seule version
     n'a pas la même cause qu'une erreur qui frappe tout le monde :
     c'est ce que ce résumé doit faire ressortir. */
  const seul = qui.length === 1;

  d.innerHTML =
    '<div style="font-size:13px;font-weight:700;color:var(--warn-text);' +
      'line-height:1.45;word-break:break-word;">' +
      String(f.message || '').replace(/</g, '&lt;') + '</div>' +
    '<div style="font-size:12px;color:var(--muted);line-height:1.7;margin-top:4px;">' +
      (f.ou ? '📍 ' + String(f.ou).replace(/</g, '&lt;') + '<br>' : '') +
      '👤 ' + (qui.length ? qui.join(', ').replace(/</g, '&lt;') : 'inconnu') +
      (seul ? '' : ' — ' + qui.length + ' personnes') +
      /* Ce champ vient du client, et il s'affiche dans la session
         qui a le plus de droits. C'était le seul des six à ne pas
         être échappé. */
      '<br>📦 ' + (echapper(versions.join(', ')) || '?') +
      ' · 📱 ' + (appareils.join(' · ').replace(/</g, '&lt;') || '?') +
      '<br>🔁 ' + f.combien + ' fois · dernier : ' +
      String(f.dernier || '').replace(/</g, '&lt;') +
    '</div>';

  if(f.details){
    const det = document.createElement('details');
    det.style.marginTop = '7px';
    det.innerHTML = '<summary style="font-size:11px;color:var(--muted);' +
      'cursor:pointer;">Détail technique</summary>' +
      '<div style="font-size:11px;white-space:pre-wrap;margin-top:5px;' +
      'color:var(--muted);word-break:break-word;">' +
      String(f.details).replace(/</g, '&lt;') + '</div>';
    d.appendChild(det);
  }

  return d;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-incidents.js'] = true;
