/* Déployé le 01/09/2026 à 13:21 — v768 */
/* ============================================================
   ec-sms.js
   L'envoi de SMS, réservé au bureau.

   Les rappels partent par mail : c'est gratuit et le financeur
   les reçoit aussi. Le SMS reste pour l'urgence — un élève à
   prévenir tout de suite, une voiture au garage — et il est
   facturé au segment. Cet écran montre ce que chaque message
   coûte AVANT de partir, parce qu'un compteur qui annonce
   « 1 SMS » pour huit segments facturés ne prévient personne.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Combien de rappels par jour, sur combien de jours : ce que le
   simulateur suppose tant qu'on n'a pas bougé les curseurs. */
const SIMU_DEFAUT = { parJour: 20, jours: 6 };

let journalEnvois = null;

/* ------------------------------------------------------------
   L'ÉCRAN
   ------------------------------------------------------------ */
async function afficherSms(){
  const zone = $('smsZone');
  if(!zone) return;

  zone.innerHTML = '';
  zone.appendChild(blocAvertissement());
  zone.appendChild(blocComposition());
  zone.appendChild(blocSimulateur());

  const j = document.createElement('div');
  j.id = 'smsJournal';
  j.style.marginTop = '16px';
  zone.appendChild(j);

  brancherComposition();
  majAnalyseSms();
  afficherJournalEnvois();
}

/* Pourquoi cet écran n'est pas dans les rappels : il faut le dire
   ici, c'est là qu'on se pose la question. */
function blocAvertissement(){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--orange);border-radius:11px;' +
    'padding:11px 12px;margin-bottom:14px;font-size:13px;line-height:1.6;';
  d.innerHTML =
    '<strong>⚠️ Le SMS est facturé, le mail non.</strong><br>' +
    '<span style="color:var(--muted);">Les rappels de cours partent ' +
    'désormais par mail depuis 🔔 Rappels de cours : c\'est gratuit, et ' +
    'le financeur le reçoit aussi. Cet écran ne sert qu\'aux envois ' +
    'urgents. Chaque message est facturé <strong>au segment</strong> : ' +
    '160 caractères, ou <strong>70 seulement</strong> si un emoji ou une ' +
    'lettre accentuée hors alphabet standard s\'y glisse.</span>';
  return d;
}

function blocComposition(){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:11px;padding:12px;';
  d.innerHTML =
    '<label for="smsEleve">👤 Élève (facultatif)</label>' +
    '<input type="text" id="smsEleve" list="listeEleves" ' +
           'placeholder="Nom de l\'élève, pour le journal">' +
    '<label for="smsTel">📱 Numéro</label>' +
    '<input type="tel" id="smsTel" inputmode="tel" placeholder="06 12 34 56 78">' +
    '<div id="smsTelEtat" style="font-size:12px;margin:-6px 0 10px;"></div>' +
    '<label for="smsTexte">💬 Message</label>' +
    '<textarea id="smsTexte" rows="6" ' +
              'placeholder="Ce que l\'élève doit lire tout de suite."></textarea>' +
    '<div id="smsAnalyse" style="margin:8px 0 10px;"></div>' +
    '<div id="smsFautifs" style="margin-bottom:10px;"></div>';

  const rang = document.createElement('div');
  rang.style.cssText = 'display:flex;gap:8px;';

  const bNet = document.createElement('button');
  bNet.className = 'btn btn-secondary';
  bNet.id = 'smsNettoyer';
  bNet.style.cssText = 'flex:1;padding:11px;font-size:13px;margin:0;';
  bNet.textContent = '🧹 Nettoyer';
  bNet.title = 'Retire ce qui coûte cher sans toucher aux accents qui passent';
  rang.appendChild(bNet);

  const bEnv = document.createElement('button');
  bEnv.className = 'btn btn-primary';
  bEnv.id = 'smsEnvoyer';
  bEnv.style.cssText = 'flex:2;padding:11px;font-size:13px;margin:0;';
  bEnv.textContent = '💬 Envoyer';
  rang.appendChild(bEnv);

  d.appendChild(rang);

  const etat = document.createElement('div');
  etat.id = 'smsEtatEnvoi';
  etat.style.cssText = 'font-size:13px;line-height:1.5;margin-top:9px;';
  d.appendChild(etat);

  return d;
}

/* ------------------------------------------------------------
   LE COMPTEUR

   Il dit trois choses : combien de segments, combien ça coûte, et
   — le plus utile — QUEL caractère fait basculer le message.
   ------------------------------------------------------------ */
function majAnalyseSms(){
  const t = $('smsTexte') ? $('smsTexte').value : '';
  const a = analyserSms(t);

  const z = $('smsAnalyse');
  if(z){
    const chaud = !a.gsm || a.segments > 1;
    z.style.cssText = 'border-radius:9px;padding:9px 11px;font-size:13px;' +
      'line-height:1.6;border:1px solid ' +
      (chaud ? 'var(--orange)' : 'var(--line)') + ';';
    z.innerHTML =
      '<strong>' + a.segments + ' segment' + (a.segments > 1 ? 's' : '') +
      ' — ' + euro(a.prix) + '</strong>' +
      '<span style="color:var(--muted);"> · ' + a.caracteres + ' caractères, ' +
      a.unites + ' unités facturées · alphabet ' + a.alphabet + '</span>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:3px;">' +
      (a.segments === 0 ? 'Message vide.'
        : (a.marge >= 0
            ? 'Encore ' + a.marge + ' unités avant le segment suivant.'
            : '')) +
      '</div>';
  }

  const zf = $('smsFautifs');
  if(zf){
    const liste = fautifsResumes(a);
    if(!liste.length){ zf.innerHTML = ''; }
    else{
      zf.style.cssText = 'font-size:12px;line-height:1.7;color:var(--muted);' +
        'border-left:3px solid var(--orange);padding-left:9px;';
      zf.innerHTML = '<strong style="color:var(--warn-text);">' +
        'Ces caractères font passer tout le message à 70 par segment :' +
        '</strong><br>' +
        liste.map(f =>
          '<code style="font-size:14px;">' +
          (f.car === '\n' ? '↵' : f.car.replace(/</g, '&lt;')) + '</code>' +
          ' ×' + f.combien +
          (f.remplacement ? ' → <code>' + f.remplacement + '</code>' : '')
        ).join(' &nbsp;·&nbsp; ');
    }
  }

  const b = $('smsEnvoyer');
  if(b){
    const tel = $('smsTel') ? $('smsTel').value.trim() : '';
    b.disabled = !tel || !a.segments;
    b.textContent = a.segments
      ? '💬 Envoyer (' + a.segments + ' segment' +
        (a.segments > 1 ? 's' : '') + ' — ' + euro(a.prix) + ')'
      : '💬 Envoyer';
  }
}

/* ------------------------------------------------------------
   LE SIMULATEUR

   « Combien ça me coûterait si je repassais tous les rappels en
   SMS ? » La question mérite une réponse chiffrée, pas une
   intuition.
   ------------------------------------------------------------ */
function blocSimulateur(){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:11px;' +
    'padding:12px;margin-top:14px;';
  d.innerHTML =
    '<h3 style="margin:0 0 4px;font-size:14px;">🧮 Ce que coûterait une campagne</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:11px;line-height:1.5;">' +
    'Le nombre de segments est repris du message ci-dessus. Change les ' +
    'deux chiffres pour simuler.</div>' +
    '<div style="display:flex;gap:10px;">' +
      '<div style="flex:1;"><label for="simuParJour">Envois par jour</label>' +
      '<input type="number" id="simuParJour" min="0" max="500" value="' +
      SIMU_DEFAUT.parJour + '"></div>' +
      '<div style="flex:1;"><label for="simuJours">Jours par semaine</label>' +
      '<input type="number" id="simuJours" min="0" max="7" value="' +
      SIMU_DEFAUT.jours + '"></div>' +
    '</div>' +
    '<div id="simuResultat" style="margin-top:6px;"></div>';
  return d;
}

function majSimulateur(){
  const z = $('simuResultat');
  if(!z) return;

  const t = $('smsTexte') ? $('smsTexte').value : '';
  const a = analyserSms(t);
  const seg = a.segments || 1;
  const parJour = parseInt(($('simuParJour') || {}).value, 10) || 0;
  const jours   = parseInt(($('simuJours')   || {}).value, 10) || 0;

  const c = coutPeriode(seg, parJour, jours);

  /* Le même volume écrit proprement : c'est la comparaison qui
     fait comprendre, pas le chiffre seul. */
  const propre = analyserSms(nettoyerSms(t)).segments || 1;
  const cp = coutPeriode(propre, parJour, jours);

  z.style.cssText = 'font-size:13px;line-height:1.7;border-radius:9px;' +
    'border:1px solid var(--line);padding:10px 11px;';
  z.innerHTML =
    '<div><strong>' + c.envoisMois + ' envois par mois</strong> · ' +
    c.segmentsMois + ' segments</div>' +
    '<div style="font-size:19px;font-weight:800;color:var(--warn-text);margin:2px 0;">' +
    euro(c.euroMois) + ' <span style="font-size:13px;font-weight:400;' +
    'color:var(--muted);">par mois — ' + euro(c.euroAn) + ' par an</span></div>' +
    (propre < seg
      ? '<div style="font-size:12px;color:var(--accent-text);margin-top:4px;">' +
        '🧹 En nettoyant le message : ' + propre + ' segment' +
        (propre > 1 ? 's' : '') + ' au lieu de ' + seg + ', soit <strong>' +
        euro(cp.euroMois) + '/mois</strong> — ' +
        euro(c.euroAn - cp.euroAn) + ' économisés par an.</div>'
      : '<div style="font-size:12px;color:var(--muted);margin-top:4px;">' +
        'Ce message est déjà au plus court.</div>');
}

/* ------------------------------------------------------------
   LES BRANCHEMENTS
   ------------------------------------------------------------ */
function brancherComposition(){
  const t = $('smsTexte');
  if(t) t.addEventListener('input', () => { majAnalyseSms(); majSimulateur(); });

  const tel = $('smsTel');
  if(tel) tel.addEventListener('input', majAnalyseSms);

  ['simuParJour', 'simuJours'].forEach(id => {
    const e = $(id);
    if(e) e.addEventListener('input', majSimulateur);
  });

  const bn = $('smsNettoyer');
  if(bn) bn.addEventListener('click', () => {
    const z = $('smsTexte');
    if(!z) return;
    const avant = analyserSms(z.value);
    z.value = nettoyerSms(z.value);
    const apres = analyserSms(z.value);
    majAnalyseSms(); majSimulateur();
    showToast(apres.segments < avant.segments
      ? 'Nettoyé : ' + avant.segments + ' → ' + apres.segments + ' segments ✅'
      : 'Rien à retirer, le message était déjà au plus court.');
  });

  const be = $('smsEnvoyer');
  if(be) be.addEventListener('click', envoyerSmsDepuisEcran);

  majSimulateur();
}

async function envoyerSmsDepuisEcran(){
  const b = $('smsEnvoyer');
  const z = $('smsEtatEnvoi');
  const texte = $('smsTexte') ? $('smsTexte').value : '';
  const tel   = $('smsTel')   ? $('smsTel').value.trim() : '';
  const nom   = $('smsEleve') ? $('smsEleve').value.trim() : '';
  if(!texte.trim() || !tel) return;

  const a = analyserSms(texte);

  if(!await confirmer('Envoyer ce SMS' + (nom ? ' à ' + nom : '') + ' ?\n\n' +
      'Numéro : ' + tel + '\n' +
      a.segments + ' segment' + (a.segments > 1 ? 's' : '') +
      ' facturé' + (a.segments > 1 ? 's' : '') + ' — ' + euro(a.prix) +
      (a.gsm ? '' : '\n\n⚠️ Le message est en Unicode : 70 caractères par ' +
                    'segment au lieu de 160. « Nettoyer » le ramènerait à ' +
                    analyserSms(nettoyerSms(texte)).segments + '.'))) return;

  b.disabled = true;
  b.textContent = 'Envoi…';
  try{
    const n = await envoyerMessageComplet(tel, texte, nom);
    if(z){
      z.style.color = 'var(--accent-text)';
      z.textContent = '✅ Envoyé — ' + a.segments + ' segment' +
        (a.segments > 1 ? 's' : '') + ' facturé(s), ' + euro(a.prix);
    }
    showToast('SMS envoyé ✅');
    if($('smsTexte')) $('smsTexte').value = '';
    majAnalyseSms(); majSimulateur();
    afficherJournalEnvois(true);
  }catch(e){
    if(z){ z.style.color = 'var(--warn-text)'; z.textContent = '⚠️ ' + e.message; }
    showToast("L'envoi a échoué");
  }
  b.disabled = false;
  majAnalyseSms();
}

/* ------------------------------------------------------------
   LE JOURNAL

   Ce qui est parti, à qui, par quel canal, et dans quel état.
   Sans trace écrite, personne ne peut dire si un élève a été
   prévenu — et c'est exactement ce qu'on cherche quand quelqu'un
   ne vient pas.
   ------------------------------------------------------------ */
/* Quatre états, dans cet ordre : un refus prime sur tout, une
   confirmation prime sur un simple envoi.

   Le quatrième — « en attente » — distingue deux choses qui se
   ressemblaient : un mail qui PORTE le bouton et dont personne n'a
   encore répondu, et un envoi qui n'a jamais eu de bouton (un SMS,
   ou un mail d'avant que la confirmation existe). Sans cette
   nuance, on ne peut pas savoir s'il faut relancer l'élève ou si
   la question ne se pose pas. */
/* « jeton » est devenu « attendReponse » : le journal ne rend
   plus le jeton lui-même, seulement le fait qu'on attend une
   réponse. C'est tout ce dont ce voyant avait besoin. */
function voyantEnvoi(etat, confirmeLe, attendReponse){
  const e = String(etat || '').toLowerCase();
  if(e.indexOf('refus') !== -1 || e.indexOf('échec') !== -1 ||
     e.indexOf('echec') !== -1) return { p: '🔴', nom: 'refusé', c: 'var(--warn-text)' };
  if(confirmeLe) return { p: '🔵', nom: 'présence confirmée le ' + confirmeLe,
                          c: 'var(--bleu)' };
  if(attendReponse) return { p: '⏳', nom: "envoyé — pas encore de réponse",
                     c: 'var(--muted)' };
  return { p: '🟢', nom: 'envoyé', c: 'var(--accent-text)' };
}

/* La légende des voyants. Elle vit ici, à côté de voyantEnvoi :
   une légende qui ne suit pas les voyants qu'elle explique est
   pire que pas de légende du tout.

   « avecReponse » : les SMS ne portent pas de bouton, annoncer une
   confirmation sur cet écran-là n'aurait aucun sens. */
function legendeVoyants(avecReponse){
  const etats = [['🔵', 'présence confirmée'],
                 ['⏳', 'sans réponse'],
                 ['🟢', 'envoyé'],
                 ['🔴', 'refusé']]
    .filter(x => avecReponse || (x[0] !== '🔵' && x[0] !== '⏳'));

  const d = document.createElement('div');
  d.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px 14px;margin-bottom:10px;' +
    'font-size:12px;color:var(--muted);line-height:1.7;';
  d.innerHTML = etats
    .map(([p, nom]) => '<span>' + p + '&nbsp;' + nom + '</span>')
    .join('');
  return d;
}

async function afficherJournalEnvois(recharger){
  const zone = $('smsJournal');
  if(!zone) return;

  if(recharger) journalEnvois = null;

  if(journalEnvois === null){
    zone.innerHTML = '<div class="empty">Lecture du journal…</div>';
    try{
      const d = await appelPrep({ action: 'smsList', combien: 200 });
      journalEnvois = (d && d.sms) || [];
    }catch(e){
      zone.innerHTML = '<div class="empty">⚠️ ' +
        e.message.replace(/</g, '&lt;') + '</div>';
      return;
    }
  }

  zone.innerHTML = '';

  const titre = document.createElement('h3');
  titre.style.cssText = 'margin:0 0 8px;font-size:14px;';
  titre.textContent = '📜 Journal des SMS';
  zone.appendChild(titre);

  /* Cet écran ne parle que de ce qui coûte. Les rappels par mail —
     et les présences confirmées — se suivent là où on les envoie,
     dans 🔔 Rappels de cours → 📜 Historique. Deux journaux qui
     montrent tout, ce sont deux endroits où chercher. */
  const smsSeuls = journalEnvois.filter(x => String(x.canal || 'sms') === 'sms');

  if(!smsSeuls.length){
    zone.innerHTML += '<div class="empty">Aucun SMS envoyé pour le moment.<br>' +
      '<span style="font-size:12px;">Les rappels par mail et les présences ' +
      'confirmées sont dans 🔔 Rappels de cours → 📜 Historique.</span></div>';
    return;
  }

  /* Ce que le mois en cours a coûté : seuls les SMS comptent */
  const mois = new Date().toLocaleDateString('fr-FR').slice(3);
  const duMois = journalEnvois.filter(x => (x.quand || '').indexOf(mois) === 3);
  const smsMois = duMois.filter(x => String(x.canal || 'sms') === 'sms');
  const segMois = smsMois.reduce((n, x) => n + (parseInt(x.parties, 10) || 1), 0);
  const mailsMois = duMois.length - smsMois.length;

  const t = document.createElement('div');
  t.style.cssText = 'padding:10px 12px;border:1px solid var(--line);' +
    'border-radius:10px;margin-bottom:10px;font-size:13px;line-height:1.6;';
  t.innerHTML = '<strong>Ce mois-ci</strong> · 💬 ' + smsMois.length +
    ' SMS, ' + segMois + ' segments — <strong>' +
    euro(segMois * prixSegmentEuro()) + '</strong>' +
    '<div style="font-size:12px;color:var(--muted);margin-top:3px;">' +
    '✉️ ' + mailsMois + ' rappel(s) par mail sur la même période, sans frais — ' +
    'ils se suivent dans 🔔 Rappels de cours → 📜 Historique.</div>';
  zone.appendChild(t);

  const rech = document.createElement('input');
  rech.type = 'text';
  rech.placeholder = '🔍 Filtrer par élève, adresse, numéro ou moniteur';
  rech.style.marginBottom = '8px';
  zone.appendChild(rech);
  zone.appendChild(legendeVoyants(false));

  const liste = document.createElement('div');
  zone.appendChild(liste);

  const dessiner = () => {
    const q = normaliserMot(rech.value.trim());
    liste.innerHTML = '';

    smsSeuls
      .filter(x => !q ||
        normaliserMot(x.eleve || '').indexOf(q) !== -1 ||
        normaliserMot(x.numero || '').indexOf(q) !== -1 ||
        normaliserMot(x.par || '').indexOf(q) !== -1)
      .slice(0, 200)
      .forEach(x => liste.appendChild(ligneJournal(x)));

    if(!liste.children.length){
      liste.innerHTML = '<div class="empty">Aucun envoi ne correspond.</div>';
    }
  };
  rech.addEventListener('input', dessiner);
  dessiner();
}

function ligneJournal(x){
  const canal = String(x.canal || 'sms');
  const v = voyantEnvoi(x.etat, x.confirmeLe, x.attendReponse);

  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:9px;' +
    'padding:8px 11px;margin-bottom:5px;font-size:13px;line-height:1.55;';

  const seg = parseInt(x.parties, 10) || 1;
  const cout = (canal === 'sms')
    ? ' · ' + seg + ' segment' + (seg > 1 ? 's' : '') +
      ' — ' + euro(seg * prixSegmentEuro())
    : ' · gratuit';

  d.innerHTML =
    '<div style="display:flex;gap:8px;align-items:baseline;">' +
      '<span style="flex-shrink:0;">' + v.p + '</span>' +
      '<span style="flex:1;min-width:0;">' +
        '<strong>' + String(x.eleve || '—').replace(/</g, '&lt;') + '</strong>' +
        ' <span style="color:var(--muted);">' +
        (canal === 'mail' ? '✉️' : '💬') + ' ' +
        String(x.numero || '').replace(/</g, '&lt;') + '</span>' +
        '<div style="font-size:11px;color:var(--muted);">' +
          String(x.quand || '').replace(/</g, '&lt;') +
          (x.par ? ' · ' + String(x.par).replace(/</g, '&lt;') : '') +
          cout +
          ' · <span style="color:' + v.c + ';">' +
          String(x.confirmeLe ? '✋ ' + v.nom
                              : (x.attendReponse ? v.nom : (x.etat || v.nom)))
            .replace(/</g, '&lt;') + '</span>' +
        '</div>' +
      '</span>' +
    '</div>';

  /* Le message lui-même, replié : la liste doit rester lisible */
  if(x.message){
    const det = document.createElement('details');
    det.style.cssText = 'margin-top:5px;';
    det.innerHTML = '<summary style="font-size:11px;color:var(--muted);' +
      'cursor:pointer;">Voir le message</summary>' +
      '<div style="font-size:12px;white-space:pre-wrap;margin-top:5px;' +
      'color:var(--muted);">' +
      String(x.message).replace(/</g, '&lt;') + '</div>';
    d.appendChild(det);
  }

  return d;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-sms.js'] = true;
