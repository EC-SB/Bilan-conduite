/* ============================================================
   ec-messenger.js
   Générateur du message pour le groupe Messenger « jour du permis ».
   On choisit une date, on saisit les heures de passage, le message
   se compose seul.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   PLANNING DE LA JOURNÉE
   Les élèves alternent conduite et écoute, puis passent leur
   examen. Tout se déduit de l'heure du premier examen.
   ============================================================ */
const DUREE_CONDUITE  = 55;   /* minutes de conduite par élève */
const DUREE_EXAMEN    = 30;   /* durée d'un passage à l'examen */
const BATTEMENT_AVANT = 10;   /* entre la fin de conduite et le 1er examen */
const AVANCE_ARRIVEE  = 5;    /* on arrive avant de démarrer */

function enMinutes(hhmm){
  const m = String(hhmm || '').match(/(\d{1,2})\s*[h:]\s*(\d{0,2})/);
  if(!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2] || '0', 10);
}

function enHeure(minutes){
  const m = ((minutes % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + 'h' +
         String(m % 60).padStart(2, '0');
}

/* Calcule le déroulé complet à partir de l'heure du premier examen */
function planningJournee(premierExamen, nbEleves, reglages){
  const r = reglages || {};
  const conduite = r.conduite || DUREE_CONDUITE;
  const examen = r.examen || DUREE_EXAMEN;
  const battement = (r.battement === undefined) ? BATTEMENT_AVANT : r.battement;

  const debut = enMinutes(premierExamen);
  if(debut === null) return null;

  const debutConduite = debut - (nbEleves * conduite) - battement;

  const creneaux = [];
  for(let i = 0; i < nbEleves; i++){
    const maConduite = debutConduite + i * conduite;
    /* L'écoute, c'est la conduite du suivant : chacun assiste à l'autre */
    const monEcoute = debutConduite + ((i + 1) % nbEleves) * conduite;
    creneaux.push({
      conduiteDe: enHeure(maConduite),
      conduiteA:  enHeure(maConduite + conduite),
      ecouteDe:   enHeure(monEcoute),
      ecouteA:    enHeure(monEcoute + conduite),
      examenDe:   enHeure(debut + i * examen),
      examenA:    enHeure(debut + (i + 1) * examen)
    });
  }

  return {
    rendezVous: enHeure(debutConduite - AVANCE_ARRIVEE),
    creneaux: creneaux
  };
}


/* ============================================================
   MESSAGE 1 — le planning de la journée
   ============================================================ */
function messageGroupePermis(dateIso, centre, eleves, plan, note){
  const jour = dateEnToutesLettres(dateIso);

  /* La liste, telle qu'elle apparaît dans le message */
  const liste = eleves.map((e, i) => {
    const c = plan ? plan.creneaux[i] : null;
    const bouts = [];
    bouts.push((i + 1) + '- ' + e.nom + ' :');
    if(c){
      bouts.push('🚙 𝗧𝘂 𝗰𝗼𝗻𝗱𝘂𝗶𝘀 de ' + c.conduiteDe + ' à ' + c.conduiteA);
      if(eleves.length > 1){
        bouts.push("👉 Tu es en écoute de " + c.ecouteDe + ' à ' + c.ecouteA);
      }
      bouts.push('📝 𝗧𝘂 𝗽𝗮𝘀𝘀𝗲𝘀 𝘁𝗼𝗻 𝗲𝘅𝗮𝗺𝗲𝗻 𝗼𝗳𝗳𝗶𝗰𝗶𝗲𝗹 de ' + c.examenDe + ' à ' + c.examenA);
    }else if(e.heure){
      bouts.push('📝 Examen à ' + e.heure);
    }
    return bouts.join('\n');
  }).join('\n\n');

  /* Le modèle de l'auto-école prime, s'il existe */
  const perso = (typeof modelePour === 'function') ? modelePour('permis_jour') : null;
  if(perso && perso.contenu){
    return appliquerModele(perso.contenu, {
      date: jour,
      centre: centre || '',
      rendezvous: plan ? plan.rendezVous : '',
      liste: liste,
      note: txt(note)
    });
  }

  const P = [];
  const L = s => P.push(s);

  L('🎉 🎉 𝙉𝙊𝙐𝙎 𝙑𝙊𝙐𝙎 𝘼𝙑𝙊𝙉𝙎 𝙊𝘽𝙏𝙀𝙉𝙐 𝙐𝙉𝙀 𝘿𝘼𝙏𝙀 𝘿𝙀 𝙋𝙀𝙍𝙈𝙄𝙎 𝙇𝙀 ' + jour + ' 🎉 🎉');
  L('❌ Si vous ne pouvez pas être présent à cette date, prévenez nous 𝗜𝗠𝗠𝗘́𝗗𝗜𝗔𝗧𝗘𝗠𝗘𝗡𝗧 !');
  L('');
  L('Planning de votre journée de 𝙋𝙀𝙍𝙈𝙄𝙎 :');
  L('');
  L('𝙎𝙊𝙔𝙀𝙕 𝙏𝙊𝙐𝙎 𝙇𝘼 :');
  L('🚗 Auto École Évolution Conduites ' + (centre || 'St Brieuc'));
  L('📅 ' + jour);
  L('🕐 ' + (plan ? plan.rendezVous : '❓'));
  L('');
  L(liste);

  if(txt(note)){
    L('');
    L('📣 ' + txt(note));
  }

  return P.join('\n');
}


/* ============================================================
   MESSAGE 2 — les rappels avant examen
   Texte fixe, modifiable dans « Mes modèles de message ».
   ============================================================ */
const RAPPELS_AVANT_EXAMEN =
"𝙋𝙀𝙏𝙄𝙏𝙎 𝙍𝘼𝙋𝙋𝙀𝙇𝙎 𝘼𝙑𝘼𝙉𝙏 𝙀𝙓𝘼𝙈𝙀𝙉 : \n\n" +
"🆔 𝗣𝗮𝘀𝘀𝗲 𝗮𝘂 𝗯𝘂𝗿𝗲𝗮𝘂 𝟱𝗺𝗶𝗻 𝗮𝘃𝗮𝗻𝘁 𝘁𝗼𝗻 𝗱𝗲𝗿𝗻𝗶𝗲𝗿 𝗰𝗼𝘂𝗿𝘀 𝗱𝗲 𝟮𝗵 de veille de permis pour 𝗻𝗼𝘂𝘀 𝗱𝗼𝗻𝗻𝗲𝗿 𝘁𝗮 𝗰𝗮𝗿𝘁𝗲 𝗱'𝗶𝗱𝗲𝗻𝘁𝗶𝘁𝗲́ ! On te la rend après ton permis.\n" +
"Pas besoin de ramener ta convocation reçue par mail !\n\n" +
"🏃‍♀️ 𝗔̀ 𝗹𝗮 𝗳𝗶𝗻 𝗱𝗲 𝘁𝗼𝗻 𝗲𝘅𝗮𝗺𝗲𝗻, tu pourras repartir seul(e) ou avec nous pour revenir à l'auto-école, mais il faudra nous l'indiquer !\n\n" +
"⚠️ 𝗠𝗘𝗥𝗖𝗜 𝗗𝗘 𝗡𝗘 𝗣𝗔𝗦 𝗙𝗔𝗜𝗥𝗘 𝗗𝗘 𝗖𝗢𝗠𝗠𝗘𝗡𝗧𝗔𝗜𝗥𝗘𝗦 𝗡𝗜 𝗗𝗘 𝗣𝗢𝗦𝗘𝗥 𝗗𝗘 𝗤𝗨𝗘𝗦𝗧𝗜𝗢𝗡𝗦 𝗘𝗡 𝗣𝗥𝗘́𝗦𝗘𝗡𝗖𝗘 𝗗𝗘 𝗟'𝗜𝗡𝗦𝗣𝗘𝗖𝗧𝗘𝗨𝗥 𝗦𝗨𝗥 𝗟𝗘 𝗖𝗘𝗡𝗧𝗥𝗘 𝗗'𝗘𝗫𝗔𝗠𝗘𝗡 ! \n" +
"Ton rapport te sera envoyé par ton moniteur sur ton messenger. \n\n" +
"👩‍👦 𝗦𝗶 𝘁𝘂 𝗲𝘀 𝗲𝗻 𝗔𝗔𝗖, 𝘁𝘂 𝗱𝗼𝗶𝘀 𝗽𝗿𝗲́𝘀𝗲𝗻𝘁𝗲𝗿 𝘁𝗼𝗻 𝗹𝗶𝘃𝗿𝗲𝘁 𝗻𝘂𝗺𝗲́𝗿𝗶𝗾𝘂𝗲 (𝗼𝘂 𝗽𝗮𝗽𝗶𝗲𝗿), et montrer l'attestation qui valide tes 1 an minimum, voir vidéo ici https://www.facebook.com/groups/963972327360861/permalink/1733835153707904/\n" +
"𝗦𝗶 𝘁𝘂 𝗲𝘀 𝗲𝗻 𝗖𝗦, 𝗽𝗮𝘀 𝗯𝗲𝘀𝗼𝗶𝗻 !\n\n" +
"💍 𝗦𝗽𝗲́𝗰𝗶𝗳𝗶𝗰𝗶𝘁𝗲́ 𝗮𝘂𝘅 𝗰𝗮𝗻𝗱𝗶𝗱𝗮𝘁𝗲𝘀 𝗱𝗲 𝗻𝗮𝘁𝗶𝗼𝗻𝗮𝗹𝗶𝘁𝗲́ 𝗿𝗼𝘂𝗺𝗮𝗶𝗻𝗲 𝗺𝗮𝗿𝗶𝗲́𝗲 (si votre nom de jeune fille n'apparait pas sur votre carte d'identité, vous devez obligatoirement nous fournir votre livret de famille ou votre certificat de mariage sur lequel apparaissent vos deux noms) : https://www.facebook.com/groups/963972327360861/learning_content?filter=957460364727818&post=1442207386345179\n\n" +
"⚠️  𝗦𝗜 𝗧𝗨 𝗟𝗢𝗨𝗣𝗘𝗦 𝗧𝗢𝗡 𝗘𝗫𝗔𝗠𝗘𝗡 : \n" +
"- tu devras OBLIGATOIREMENT effectuer le BILAN de ton PERMIS par Messenger puis la correction se fera avec un(e) moniteur(trice) au bureau sur un créneau de 30 mn. Cette prestation te sera facturée.\n" +
"- tu devras OBLIGATOIREMENT reprendre entre 2 à 5 leçons (selon ton niveau à l'examen) + 3h avant ton repassage. \n\n" +
"⚠️𝗧𝗔 𝗗𝗔𝗧𝗘 𝗗'𝗘𝗫𝗔𝗠𝗘𝗡 𝗘𝗦𝗧 𝗣𝗥𝗘́𝗖𝗜𝗘𝗨𝗦𝗘 : ne compte pas sur un repassage, c'est 𝗠𝗔𝗜𝗡𝗧𝗘𝗡𝗔𝗡𝗧 que tu dois obtenir ton permis ! Si toi ou tes moniteurs estiment que tu n'es pas prêt(e), que tu ne connais pas tes vérifications, AJOUTE DES LEÇONS OU REPORTE TON EXAMEN TOUT DE SUITE ⚠️ \n\n" +
"☠️ 𝗧𝗼𝘂𝘁𝗲 𝗺𝗲𝗻𝗮𝗰𝗲, 𝗽𝗿𝗲𝘀𝘀𝗶𝗼𝗻 𝘃𝗶𝘀𝗮𝗻𝘁 𝗮̀ 𝗼𝗯𝘁𝗲𝗻𝗶𝗿 𝘂𝗻𝗲 𝗽𝗹𝗮𝗰𝗲 𝗱𝗲 𝗿𝗲𝗽𝗮𝘀𝘀𝗮𝗴𝗲, 𝗼𝘂 𝘁𝗼𝘂𝘁𝗲 𝗻𝗼𝗻 𝗿𝗲𝗺𝗶𝘀𝗲 𝗲𝗻 𝗾𝘂𝗲𝘀𝘁𝗶𝗼𝗻, 𝗲𝗻𝘁𝗿𝗮𝗶̂𝗻𝗲𝗿𝗮 𝗮𝘂𝘁𝗼𝗺𝗮𝘁𝗶𝗾𝘂𝗲𝗺𝗲𝗻𝘁 𝗹𝗮 𝗿𝗲𝗺𝗶𝘀𝗲 𝗶𝗺𝗺𝗲́𝗱𝗶𝗮𝘁𝗲 𝗱𝘂 𝗱𝗼𝘀𝘀𝗶𝗲𝗿 𝗲𝘁 𝗹'𝗮𝗻𝗻𝘂𝗹𝗮𝘁𝗶𝗼𝗻 𝗱𝘂 𝗰𝗼𝗻𝘁𝗿𝗮𝘁, 𝘀𝗮𝗻𝘀 𝗱𝗶𝘀𝗰𝘂𝘀𝘀𝗶𝗼𝗻 𝗽𝗼𝘀𝘀𝗶𝗯𝗹𝗲. ☠️\n\n" +
"𝙇𝙄𝙀𝙉𝙎 𝘼̀ 𝘼𝙋𝙋𝙍𝙀𝙉𝘿𝙍𝙀 𝙋𝘼𝙍 𝘾𝙊𝙀𝙐𝙍 𝘼𝙑𝘼𝙉𝙏 𝙀𝙓𝘼𝙈𝙀𝙉 :\n\n" +
"💡  𝗙𝗶𝗰𝗵𝗲 𝗺𝗲́𝗺𝗼𝗶𝗿𝗲 𝗽𝗲𝗿𝗺𝗶𝘀 : \nhttps://www.facebook.com/groups/147379309864142/permalink/287913635810708/\n\n" +
"🚗  𝗗𝗲́𝗿𝗼𝘂𝗹𝗲́ 𝗱𝗲 𝗹'𝗲𝘅𝗮𝗺𝗲𝗻 : https://www.facebook.com/groups/963972327360861/permalink/970517783372982/ \nhttps://www.facebook.com/groups/963972327360861/permalink/1016364328788327/\n\n" +
"🧘‍♀️  𝗥𝗲𝘀𝘁𝗲𝗿 𝗭𝗲𝗻 : https://www.facebook.com/groups/963972327360861/permalink/1139464513144974/\n\n" +
"👌  𝗖𝗲𝗻𝘁𝗿𝗲 𝗲𝘅𝗮𝗺𝗲𝗻 𝗦𝗮𝗶𝗻𝘁-𝗕𝗿𝗶𝗲𝘂𝗰 :\nhttps://www.facebook.com/groups/963972327360861/permalink/970512993373461/\n\n" +
"🏬  𝗖𝗲𝗻𝘁𝗿𝗲 𝗲𝘅𝗮𝗺𝗲𝗻 𝗦𝗮𝗶𝗻𝘁-𝗕𝗿𝗶𝗲𝘂𝗰 :\nhttps://www.facebook.com/groups/963972327360861/learning_content/?filter=957460364727818&post=3113901628719002\n\n" +
"☠  𝗘𝗿𝗿𝗲𝘂𝗿𝘀 𝗲́𝗹𝗶𝗺𝗶𝗻𝗮𝘁𝗼𝗶𝗿𝗲𝘀 : https://www.facebook.com/groups/963972327360861/permalink/1131218613969564/  + https://www.facebook.com/groups/963972327360861/permalink/1135349536889805/\n\n" +
"❓ 𝗩𝗲́𝗿𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻𝘀 :\nhttps://www.facebook.com/groups/864826058258637";

function messageRappels(){
  const perso = (typeof modelePour === 'function') ? modelePour('permis_rappels') : null;
  return (perso && perso.contenu) ? perso.contenu : RAPPELS_AVANT_EXAMEN;
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
    if(typeof chargerModelesTexte === 'function') await chargerModelesTexte();
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

  /* Heure du premier examen : tout le planning en découle */
  const lh = document.createElement('label');
  lh.textContent = 'Heure du premier passage à l\'examen';
  zone.appendChild(lh);

  const hPremier = document.createElement('input');
  hPremier.type = 'time';
  hPremier.id = 'messengerHeure';
  hPremier.value = '08:00';
  zone.appendChild(hPremier);

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 12px;line-height:1.4;';
  aide.textContent = 'Conduite, écoute et rendez-vous se calculent tout seuls à partir de cette heure.';
  zone.appendChild(aide);

  /* Ordre de passage : le premier de la liste conduit en premier */
  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:6px;';
  t.textContent = 'Ordre de passage';
  zone.appendChild(t);

  const zListe = document.createElement('div');
  zone.appendChild(zListe);

  function dessinerOrdre(){
    zListe.innerHTML = '';
    jour.eleves.forEach((e, i) => {
      const l = document.createElement('div');
      l.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 0;';

      const num = document.createElement('span');
      num.style.cssText = 'font-weight:700;color:var(--accent-text);flex-shrink:0;';
      num.textContent = (i + 1) + '-';
      l.appendChild(num);

      const nom = document.createElement('span');
      nom.style.cssText = 'flex:1;font-size:14px;min-width:0;';
      nom.textContent = (e.repassage ? '🔁 ' : '') + e.nom +
        (e.moniteur ? ' · ' + e.moniteur : '');
      l.appendChild(nom);

      if(i > 0){
        const bh = document.createElement('button');
        bh.className = 'btn btn-secondary';
        bh.style.cssText = 'width:auto;padding:6px 9px;font-size:13px;margin:0;flex-shrink:0;';
        bh.textContent = '↑';
        bh.title = 'Faire passer plus tôt';
        bh.addEventListener('click', () => {
          const tmp = jour.eleves[i - 1];
          jour.eleves[i - 1] = jour.eleves[i];
          jour.eleves[i] = tmp;
          dessinerOrdre();
          apercu();
        });
        l.appendChild(bh);
      }

      zListe.appendChild(l);
    });
  }
  dessinerOrdre();

  /* Aperçu du planning calculé, avant même de composer */
  const zApercu = document.createElement('div');
  zApercu.style.cssText = 'margin-top:10px;padding:10px 12px;background:var(--navy);' +
    'border:1px solid var(--line);border-radius:10px;font-size:13px;line-height:1.7;';
  zone.appendChild(zApercu);

  function apercu(){
    const plan = planningJournee(formaterHeure(hPremier.value), jour.eleves.length);
    if(!plan){ zApercu.textContent = "Saisis l'heure du premier examen."; return; }
    zApercu.innerHTML = '🕐 <strong>Rendez-vous à ' + plan.rendezVous + '</strong><br>' +
      jour.eleves.map((e, i) => {
        const cr = plan.creneaux[i];
        return (i + 1) + '- ' + e.nom.replace(/</g, '&lt;') + ' — conduite ' +
               cr.conduiteDe + '/' + cr.conduiteA + ' · examen ' +
               cr.examenDe + '/' + cr.examenA;
      }).join('<br>');
  }
  hPremier.addEventListener('change', apercu);
  setTimeout(apercu, 0);

  /* Information ponctuelle à ajouter au message */
  const lab = document.createElement('label');
  lab.textContent = 'Information particulière (facultatif)';
  lab.style.marginTop = '12px';
  zone.appendChild(lab);
  const note = document.createElement('textarea');
  note.rows = 2;
  note.placeholder = 'Ex : la voiture sera la Clio grise';
  note.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:10px 11px;border-radius:10px;font-size:15px;' +
    'line-height:1.5;font-family:inherit;resize:vertical;margin-bottom:12px;';
  zone.appendChild(note);

  const perso = (typeof modelePour === 'function') ? modelePour('permis_jour') : null;
  const src = document.createElement('div');
  src.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px;line-height:1.5;';
  src.textContent = perso
    ? '📄 Modèle utilisé : « ' + perso.nom + ' »'
    : "📄 Modèle de l'application. Tu peux le remplacer dans « Mes modèles de message ».";
  zone.appendChild(src);

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.textContent = '📣 Composer les deux messages';
  b.addEventListener('click', () => {
    const plan = planningJournee(formaterHeure(hPremier.value), jour.eleves.length);
    if(!plan){ showToast("Saisis l'heure du premier examen."); return; }
    const centre = (centres.length === 1 && centres[0].indexOf('—') === -1) ? centres[0] : '';

    zone.appendChild(blocCopiable('Message 1 — le planning',
      messageGroupePermis(jour.iso, centre, jour.eleves, plan, note.value)));
    zone.appendChild(blocCopiable('Message 2 — les rappels avant examen',
      messageRappels()));

    b.disabled = true;
    b.textContent = '✅ Messages composés';
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
