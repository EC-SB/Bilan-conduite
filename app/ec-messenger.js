/* ============================================================
   ec-messenger.js
   Générateur du message pour le groupe Messenger « jour du permis ».
   On choisit une date, on saisit les heures de passage, le message
   se compose seul.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les rappels envoyés à chaque groupe, communs à tous les élèves */
const RAPPELS_PERMIS = [
  '📄 𝗔𝗽𝗽𝗼𝗿𝘁𝗲 𝘁𝗮 𝗽𝗶𝗲̀𝗰𝗲 𝗱\'𝗶𝗱𝗲𝗻𝘁𝗶𝘁𝗲́ (originale, en cours de validité).\n' +
  'Pas de pièce d\'identité = pas d\'examen, aucune exception.',

  '⏰ 𝗔𝗿𝗿𝗶𝘃𝗲 𝟭𝟱 𝗺𝗶𝗻𝘂𝘁𝗲𝘀 𝗮𝘃𝗮𝗻𝘁 ton heure de passage.\n' +
  'Préviens-nous EN URGENCE en cas de retard ou d\'imprévu.',

  '🧠 𝗥𝗲́𝘃𝗶𝘀𝗲 𝘁𝗲𝘀 𝗽𝗿𝗼𝗰𝗲́𝗱𝘂𝗿𝗲𝘀 et tes vérifications.\n' +
  'Tout est dans les groupes Facebook, relis-les la veille.',

  '😴 𝗗𝗼𝗿𝘀 𝗯𝗶𝗲𝗻 la veille et mange avant de venir.\n' +
  'Un examen se passe aussi avec la tête et le corps reposés.',

  '🚗 𝗟𝗲 𝗷𝗼𝘂𝗿 𝗝, tu conduis comme en leçon.\n' +
  'L\'inspecteur n\'est pas là pour te piéger : montre ce que tu sais faire.'
];

/* Contexte du message : ce qui change d'un groupe à l'autre */
function messageGroupePermis(dateIso, centre, eleves, note){
  const jour = dateEnToutesLettres(dateIso);
  const P = [];
  const L = s => P.push(s);

  L('🚗👮 𝗝𝗢𝗨𝗥 𝗗𝗨 𝗣𝗘𝗥𝗠𝗜𝗦 👮🚗');
  L('');
  L('Bonjour à tous 👋');
  L('Voici le programme de votre journée du ' + jour +
    (centre ? ' au centre d\'examen de ' + centre : '') + '.');
  L('');
  L('⏱️ 𝗛𝗘𝗨𝗥𝗘𝗦 𝗗𝗘 𝗣𝗔𝗦𝗦𝗔𝗚𝗘 :');

  eleves.forEach(e => {
    L('👉 ' + (e.heure ? e.heure : '❓') + ' — ' + e.nom +
      (e.moniteur ? ' (avec ' + e.moniteur + ')' : '') +
      (e.repassage ? ' 🔁' : ''));
  });

  L('');
  L('💡 Ces horaires sont ceux de la convocation. Le déroulé de la journée');
  L('peut bouger légèrement selon l\'inspecteur : restez joignables.');
  L('');
  L('📌 𝗔̀ 𝗡𝗘 𝗣𝗔𝗦 𝗢𝗨𝗕𝗟𝗜𝗘𝗥 :');
  L('');
  RAPPELS_PERMIS.forEach(r => { L(r); L(''); });

  if(txt(note)){
    L('📣 𝗜𝗡𝗙𝗢 𝗣𝗔𝗥𝗧𝗜𝗖𝗨𝗟𝗜𝗘̀𝗥𝗘 :');
    L(txt(note));
    L('');
  }

  L('On croise les doigts pour vous 🤞');
  L('Vous êtes prêts, faites-vous confiance 💪');
  L('');
  L('Évolution Conduites 🤝');

  return P.join('\n');
}


/* Les dates d'examen à venir, d'après les fiches de suivi */
function datesPermisAVenir(){
  const auj = todayLocal();
  const parDate = {};

  (etatBureau.suivi || []).forEach(s => {
    if(!s.datePermis) return;
    if(s.resultat) return;                       /* déjà passé */
    if(s.statut === 'annule') return;
    const iso = dateFrVersIso(s.datePermis);
    if(!iso || iso < auj) return;                /* on ne propose que l'à-venir */
    if(!parDate[iso]) parDate[iso] = [];
    parDate[iso].push({
      nom: s.eleve,
      centre: s.centre || '',
      moniteur: s.moniteurDate || '',
      repassage: !!s.nbAjournements,
      heure: ''
    });
  });

  return Object.keys(parDate).sort().map(iso => ({
    iso: iso,
    eleves: parDate[iso].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }));
}


async function afficherMessengerPermis(){
  const zone = $('messengerZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture des permis prévus…</div>';
  try{
    await chargerBureau();
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  const dates = datesPermisAVenir();
  zone.innerHTML = '';

  if(!dates.length){
    zone.innerHTML = '<div class="empty">Aucun permis à venir.<br>' +
      '<span style="font-size:12px;">Les dates apparaissent dès qu\'elles sont ' +
      'enregistrées dans le suivi.</span></div>';
    return;
  }

  const sel = $('messengerDate');
  const choix = sel.value;
  sel.innerHTML = '<option value="">— choisis une date —</option>';
  dates.forEach(d => {
    const o = document.createElement('option');
    o.value = d.iso;
    o.textContent = dateEnToutesLettres(d.iso) + ' — ' + d.eleves.length + ' élève(s)';
    sel.appendChild(o);
  });
  if(choix && dates.some(d => d.iso === choix)) sel.value = choix;

  if(!sel.value){
    zone.innerHTML = '<div class="empty">Choisis une date ci-dessus.</div>';
    return;
  }

  const jour = dates.find(d => d.iso === sel.value);
  if(!jour) return;

  /* Centres concernés : un message par centre si l'examen a lieu aux deux */
  const centres = [];
  jour.eleves.forEach(e => {
    const c = e.centre || '— centre non défini —';
    if(centres.indexOf(c) === -1) centres.push(c);
  });

  if(centres.length > 1){
    const a = document.createElement('div');
    a.style.cssText = 'background:var(--warn-bg);border:1px solid var(--red);' +
      'border-radius:8px;padding:9px 11px;font-size:13px;margin-bottom:10px;' +
      'color:var(--warn-text);line-height:1.5;';
    a.textContent = '⚠️ Deux centres ce jour-là (' + centres.join(', ') +
      '). Un message par centre est préférable.';
    zone.appendChild(a);
  }

  /* Saisie des heures, élève par élève */
  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:8px;';
  t.textContent = 'Heures de passage';
  zone.appendChild(t);

  jour.eleves.forEach((e, i) => {
    const l = document.createElement('div');
    l.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 0;';

    const nom = document.createElement('span');
    nom.style.cssText = 'flex:1;font-size:14px;min-width:0;';
    nom.textContent = (e.repassage ? '🔁 ' : '') + e.nom +
      (e.centre ? ' · ' + e.centre : '') +
      (e.moniteur ? ' · ' + e.moniteur : '');
    l.appendChild(nom);

    const h = document.createElement('input');
    h.type = 'time';
    h.className = 'heurePermis';
    h.setAttribute('data-i', String(i));
    h.style.cssText = 'width:auto;margin:0;padding:8px 9px;font-size:15px;flex-shrink:0;';
    h.addEventListener('change', () => { jour.eleves[i].heure = formaterHeure(h.value); });
    l.appendChild(h);

    zone.appendChild(l);
  });

  /* Information ponctuelle à ajouter au message */
  const lab = document.createElement('label');
  lab.textContent = 'Information particulière (facultatif)';
  lab.style.marginTop = '12px';
  zone.appendChild(lab);
  const note = document.createElement('textarea');
  note.id = 'messengerNote';
  note.rows = 2;
  note.placeholder = 'Ex : rendez-vous devant le bureau, la voiture sera la Clio grise';
  note.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:10px 11px;border-radius:10px;font-size:15px;' +
    'line-height:1.5;font-family:inherit;resize:vertical;margin-bottom:12px;';
  zone.appendChild(note);

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.textContent = '📣 Composer le message';
  b.addEventListener('click', () => {
    const centre = (centres.length === 1 && centres[0].indexOf('—') === -1) ? centres[0] : '';
    const texte = messageGroupePermis(jour.iso, centre, jour.eleves, note.value);
    zone.appendChild(blocCopiable('Message du groupe', texte));
    b.disabled = true;
    b.textContent = '✅ Message composé';
  });
  zone.appendChild(b);
}

/* Une heure saisie « 14:00 » se lit mieux en « 14h00 » */
function formaterHeure(v){
  if(!v) return '';
  return String(v).replace(':', 'h');
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-messenger.js'] = true;
