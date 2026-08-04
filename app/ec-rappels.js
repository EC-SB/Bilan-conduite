/* ============================================================
   ec-rappels.js
   Rappels de cours par SMS.

   On dépose la capture du planning, l'IA en tire la liste des
   cours, l'application retrouve les élèves dans le répertoire
   et compose un message pour chacun.

   Rien ne part sans relecture : les envois groupés se trompent
   de destinataire bien plus facilement qu'on ne le croit.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const CONSIGNES_PLANNING =
  "Tu lis la capture d'écran d'un planning d'auto-école. " +
  "Extrais chaque cours visible.\n\n" +
  "Réponds UNIQUEMENT avec un tableau JSON, sans texte autour, sans balises Markdown :\n" +
  '[{"eleve":"Nom Prénom","date":"AAAA-MM-JJ","heure":"14h00",' +
  '"duree":"2h","moniteur":"Prénom","site":"Saint-Brieuc"}]\n\n' +
  "Règles :\n" +
  "- « eleve » est obligatoire ; ignore les créneaux sans nom d'élève " +
  "(pauses, indisponibilités, examens sans candidat nommé).\n" +
  "- Recopie les noms EXACTEMENT comme ils apparaissent, sans corriger " +
  "l'orthographe : ils servent à retrouver la fiche de l'élève.\n" +
  "- Si la date n'est pas lisible, mets une chaîne vide.\n" +
  "- Les heures au format 14h00.\n" +
  "- Si tu ne vois aucun cours, réponds [].";

let coursDuPlanning = [];

/* ---------- Lecture de la capture ---------- */
async function lirePlanning(){
  const inp = $('rappelFichier');
  const zone = $('rappelZone');
  const btn = $('rappelLire');
  if(!inp || !zone) return;

  const fichiers = Array.prototype.slice.call(inp.files || []);
  if(!fichiers.length){ showToast('Choisis une capture du planning.'); return; }

  btn.disabled = true;
  btn.textContent = 'Lecture…';
  zone.innerHTML = '<div class="empty">Lecture du planning par l\'IA…<br>' +
    '<span style="font-size:12px;">Quelques secondes selon la taille de l\'image.</span></div>';

  try{
    /* Toutes les captures partent dans un même message : un planning
       tient rarement sur une seule image. */
    const contenu = [];
    for(const f of fichiers){
      const donnees = await compresserImage(f);
      const virgule = donnees.indexOf(',');
      contenu.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg',
                  data: donnees.slice(virgule + 1) }
      });
    }
    contenu.push({ type: 'text', text: CONSIGNES_PLANNING });

    const r = await fetch(CONFIG.IA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: ACCES.code, payload: {
        model: CONFIG.MODELE_IA || 'claude-sonnet-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: contenu }]
      }})
    });
    if(!r.ok) throw new Error('Lecture impossible (HTTP ' + r.status + ')');

    const data = await r.json();
    const texte = (data.content || []).filter(x => x.type === 'text')
                                      .map(x => x.text).join('\n');
    const propre = texte.replace(/```json|```/g, '').trim();

    let liste;
    try{ liste = JSON.parse(propre); }
    catch(e){ throw new Error("La lecture n'a rien donné d'exploitable. Réessaie avec une capture plus nette."); }
    if(!Array.isArray(liste)) liste = [];

    coursDuPlanning = liste
      .filter(x => x && String(x.eleve || '').trim().length >= 3)
      .map(x => ({
        eleve: String(x.eleve).trim(),
        date: String(x.date || '').trim(),
        heure: String(x.heure || '').trim(),
        duree: String(x.duree || '').trim(),
        moniteur: String(x.moniteur || '').trim(),
        site: String(x.site || '').trim(),
        envoye: false
      }));

    inp.value = '';
    afficherRappels();
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
  }finally{
    btn.disabled = false;
    btn.textContent = '🔎 Lire le planning';
  }
}


/* ---------- Le message envoyé à un élève ---------- */
function messageRappel(c){
  const perso = (typeof modelePour === 'function') ? modelePour('rappel_cours') : null;
  const valeurs = {
    eleve: c.eleve,
    prenom: c.eleve.split(' ')[0],
    date: c.date ? dateEnToutesLettres(c.date) : '',
    heure: c.heure,
    duree: c.duree,
    moniteur: c.moniteur,
    site: c.site
  };

  if(perso && perso.contenu) return appliquerModele(perso.contenu, valeurs);

  /* Modèle proposé tant qu'aucun n'est enregistré */
  return 'Bonjour ' + valeurs.prenom + ',\n' +
    'Petit rappel de ton cours de conduite' +
    (valeurs.date ? ' le ' + valeurs.date : '') +
    (c.heure ? ' à ' + c.heure : '') +
    (c.duree ? ' (' + c.duree + ')' : '') +
    (c.moniteur ? ' avec ' + c.moniteur : '') +
    (c.site ? ' — ' + c.site : '') + '.\n' +
    "Merci de prévenir au plus vite en cas d'empêchement.\n" +
    'Évolution Conduites';
}


/* ---------- Affichage et envoi ---------- */
async function afficherRappels(){
  const zone = $('rappelZone');
  if(!zone) return;

  if(!coursDuPlanning.length){
    zone.innerHTML = '<div class="empty">Aucun cours lu pour le moment.</div>';
    return;
  }

  zone.innerHTML = '<div class="empty">Recherche des numéros…</div>';
  if(typeof chargerFiches === 'function') await chargerFiches();
  if(typeof chargerModelesTexte === 'function') await chargerModelesTexte();
  zone.innerHTML = '';

  /* Chaque cours est rapproché d'une fiche du répertoire */
  coursDuPlanning.forEach(c => {
    const f = (typeof ficheDe === 'function') ? ficheDe(c.eleve) : null;
    c.telephone = f && f.telephone ? f.telephone : '';
    c.trouve = !!f;
  });

  const prets = coursDuPlanning.filter(c => c.telephone);
  const sans = coursDuPlanning.filter(c => !c.telephone);

  const tete = document.createElement('div');
  tete.style.cssText = 'padding:10px 12px;background:var(--navy);border:1px solid var(--line);' +
    'border-radius:10px;margin-bottom:12px;font-size:13px;line-height:1.6;';
  tete.innerHTML = '<strong>' + coursDuPlanning.length + ' cours lu(s)</strong> · ' +
    '<span style="color:var(--accent-text);">' + prets.length + ' prêt(s) à envoyer</span>' +
    (sans.length ? ' · <span style="color:var(--warn-text);">' + sans.length +
      ' sans numéro</span>' : '') +
    (modelePour && modelePour('rappel_cours')
      ? '<br><span style="font-size:12px;color:var(--muted);">Modèle : « ' +
        modelePour('rappel_cours').titre + ' »</span>'
      : '<br><span style="font-size:12px;color:var(--muted);">Aucun modèle enregistré : ' +
        "texte proposé par l'application. Crée-en un dans « Textes types », usage " +
        '« Rappel de cours ».</span>');
  zone.appendChild(tete);

  if(sans.length){
    const a = document.createElement('div');
    a.style.cssText = 'background:var(--warn-bg);border:1px solid var(--red);border-radius:9px;' +
      'padding:9px 11px;margin-bottom:12px;font-size:12px;line-height:1.6;color:var(--warn-text);';
    a.innerHTML = "⚠️ Sans numéro dans le répertoire :<br>" +
      sans.map(c => '• ' + c.eleve.replace(/</g, '&lt;')).join('<br>') +
      '<br><span style="color:var(--muted);">Complète leur fiche dans « Répertoire élèves », ' +
      'ou vérifie l\'orthographe lue sur le planning.</span>';
    zone.appendChild(a);
  }

  coursDuPlanning.forEach((c, i) => zone.appendChild(ligneRappel(c, i)));

  /* Tout copier, pour un envoi groupé depuis l'outil SMS */
  if(prets.length){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'margin-top:12px;padding:11px;font-size:13px;';
    b.textContent = '📋 Copier les ' + prets.length + ' messages avec les numéros';
    b.addEventListener('click', () => {
      const texte = prets.map(c => c.telephone + '\t' + messageRappel(c).replace(/\n/g, ' | '))
                         .join('\n');
      navigator.clipboard.writeText(texte).then(
        () => showToast(prets.length + ' messages copiés ✅'),
        () => showToast('Copie impossible'));
    });
    zone.appendChild(b);
  }
}

function ligneRappel(c, i){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid ' + (c.telephone ? 'var(--line)' : 'var(--red)') +
    ';border-radius:10px;padding:10px 12px;margin-bottom:7px;' +
    (c.envoye ? 'opacity:.55;' : '');

  const h = document.createElement('div');
  h.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';

  const info = document.createElement('div');
  info.style.cssText = 'flex:1;min-width:0;';
  info.innerHTML = '<strong>' + (c.envoye ? '✅ ' : '') + c.eleve.replace(/</g, '&lt;') +
    '</strong><div style="font-size:12px;color:var(--muted);margin-top:2px;line-height:1.5;">' +
    [c.date ? dateEnToutesLettres(c.date) : '', c.heure, c.duree, c.moniteur, c.site]
      .filter(Boolean).join(' · ') +
    (c.telephone ? '<br>📱 ' + telLisible(c.telephone) : '<br>📱 numéro inconnu') +
    '</div>';
  h.appendChild(info);

  if(c.telephone){
    const a = document.createElement('a');
    a.href = 'sms:' + telPourLien(c.telephone) + '?&body=' +
             encodeURIComponent(messageRappel(c));
    a.className = 'btn btn-primary';
    a.style.cssText = 'width:auto;padding:9px 13px;font-size:14px;margin:0;flex-shrink:0;' +
      'text-decoration:none;display:inline-flex;align-items:center;';
    a.textContent = '💬 Envoyer';
    a.addEventListener('click', () => {
      c.envoye = true;
      setTimeout(afficherRappels, 400);
    });
    h.appendChild(a);
  }

  d.appendChild(h);

  /* Le texte exact, relisible et modifiable avant envoi */
  const det = document.createElement('details');
  det.innerHTML = '<summary style="cursor:pointer;font-size:12px;color:var(--muted);' +
    'margin-top:6px;">Voir le message</summary>';
  const t = document.createElement('div');
  t.style.cssText = 'margin-top:6px;font-size:13px;line-height:1.5;white-space:pre-wrap;' +
    'color:var(--cream);background:var(--navy);padding:9px 11px;border-radius:8px;';
  t.textContent = messageRappel(c);
  det.appendChild(t);
  d.appendChild(det);

  return d;
}



/* ============================================================
   COMPOSITION D'UN RAPPEL À LA MAIN
   Le message est toujours le même ; seules quelques mentions
   changent d'un élève à l'autre.
   ============================================================ */
const TYPES_RAPPEL = [
  { cle:'cours',        titre:'𝗖𝗢𝗨𝗥𝗦' },
  { cle:'test-eval',    titre:"𝗧𝗘𝗦𝗧 𝗗'𝗘́𝗩𝗔𝗟𝗨𝗔𝗧𝗜𝗢𝗡 𝗘𝗡 𝗩𝗢𝗜𝗧𝗨𝗥𝗘" },
  { cle:'evaluation',   titre:'𝗘́𝗩𝗔𝗟𝗨𝗔𝗧𝗜𝗢𝗡' },
  { cle:'examen-blanc', titre:'𝗘𝗫𝗔𝗠𝗘𝗡 𝗕𝗟𝗔𝗡𝗖',
    ajout:"🐥 Rappel ton ou ta monitrice devient un(e) inspecteur(trice). " +
          'Tu dois être autonome !' },
  { cle:'permis',       titre:'𝗣𝗘𝗥𝗠𝗜𝗦' },
  { cle:'accompagnateur', titre:"𝗟𝗔 𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡 𝗗𝗘 𝗧𝗢𝗡 𝗔𝗖𝗖𝗢𝗠𝗣𝗔𝗚𝗡𝗔𝗧𝗘𝗨𝗥" }
];

const JOURS_RAPPEL = ["𝗔𝗨𝗝𝗢𝗨𝗥𝗗'𝗛𝗨𝗜", '𝗗𝗘𝗠𝗔𝗜𝗡', '𝗟𝗨𝗡𝗗𝗜', '𝗠𝗔𝗥𝗗𝗜',
                      '𝗠𝗘𝗥𝗖𝗥𝗘𝗗𝗜', '𝗝𝗘𝗨𝗗𝗜', '𝗩𝗘𝗡𝗗𝗥𝗘𝗗𝗜', '𝗦𝗔𝗠𝗘𝗗𝗜', '𝗗𝗜𝗠𝗔𝗡𝗖𝗛𝗘'];

const EMPLACEMENTS = [
  { cle:'cour', texte:"𝗧𝗮 𝘃𝗼𝗶𝘁𝘂𝗿𝗲 𝘀𝗲𝗿𝗮 𝗱𝗮𝗻𝘀 𝗹𝗮 𝗰𝗼𝘂𝗿 𝗶𝗻𝘁𝗲́𝗿𝗶𝗲𝘂𝗿𝗲 𝗱𝗲 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !" },
  { cle:'rue',  texte:'𝗧𝗮 𝘃𝗼𝗶𝘁𝘂𝗿𝗲 𝘀𝗲𝗿𝗮 𝗱𝗮𝗻𝘀 𝗹𝗮 𝗿𝘂𝗲 𝗹𝗲 𝗹𝗼𝗻𝗴 𝗱𝘂 𝘁𝗿𝗼𝘁𝘁𝗼𝗶𝗿 !' },
  { cle:'',     texte:'' }
];

const OPTIONS_RAPPEL = [
  { cle:'retard',  nom:'⏰ Le moniteur peut avoir du retard (retour de permis)',
    texte:'Ta monitrice sera peut-être un peu en retard, car elle reviendra de permis.' },
  { cle:'ci',      nom:"🆔 Déposer sa carte d'identité au bureau",
    texte:"𝗡'𝗢𝗨𝗕𝗟𝗜𝗘 𝗣𝗔𝗦 𝗗𝗘 𝗡𝗢𝗨𝗦 𝗗𝗘́𝗣𝗢𝗦𝗘𝗥 𝗧𝗔 𝗖𝗔𝗥𝗧𝗘 𝗗'𝗜𝗗𝗘𝗡𝗧𝗜𝗧𝗘́ 𝗔𝗨 𝗕𝗨𝗥𝗘𝗔𝗨 𝗢𝗕𝗟𝗜𝗚𝗔𝗧𝗢𝗜𝗥𝗘𝗠𝗘𝗡𝗧\n" +
          'Passe au bureau 5 min avant ton cours nous donner ta carte d\'identité !\n' +
          '(On te la rend après ton permis 😉)' },
  { cle:'sd',      nom:'💾 Récupérer sa carte SD au bureau',
    texte:'Passe au bureau 5 min avant ton cours que l\'on te donne ta carte SD ' +
          'comprise dans ton forfait 😉\n(Pour revisionner tes cours ensuite de chez toi)' },
  { cle:'1er-bv',  nom:'🚙 Premier cours en voiture — boîte manuelle',
    texte:"J'espère que tu as bien bossé avant ton 1ᵉʳ cours en voiture : t'es-tu entrainé " +
          'à tourner le volant chez toi (assiette ou autre), revu la position de la main ' +
          'sur le levier de vitesse comme indiqué sur ton dernier rapport en simulateur ?\n' +
          'Je rappelle que tu peux te filmer en t\'entrainant et que je peux te corriger ' +
          'gratuitement sur Messenger !' },
  { cle:'1er-bea', nom:'🅰 Premier cours en voiture — boîte automatique',
    texte:"J'espère que tu as bien bossé avant ton 1ᵉʳ cours en voiture : t'es-tu entrainé " +
          'à tourner le volant chez toi (assiette ou autre), revu les erreurs indiquées ' +
          'sur ton dernier rapport en simulateur ?\n' +
          'Je rappelle que tu peux te filmer en t\'entrainant et que je peux te corriger ' +
          'gratuitement sur Messenger !' }
];

/* Le message assemblé à partir des choix */
function composerRappel(r){
  const type = TYPES_RAPPEL.find(x => x.cle === r.type) || TYPES_RAPPEL[0];
  const empl = EMPLACEMENTS.find(x => x.cle === r.emplacement);
  const P = [];

  P.push('Bonjour 😁');
  P.push('');
  P.push("𝗡'𝗢𝗨𝗕𝗟𝗜𝗘 𝗣𝗔𝗦 𝗧𝗢𝗡 " + type.titre + ' ' + (r.jour || '') +
         (r.voiture ? '   𝗩𝗢𝗜𝗧𝗨𝗥𝗘 𝗡𝗨𝗠𝗘́𝗥𝗢 ' + r.voiture : ''));
  P.push('');

  if(empl && empl.texte){
    P.push(empl.texte);
    P.push('Le numéro de ta voiture est en bas à droite du pare-brise.');
    P.push('');
  }

  if(type.ajout){ P.push(type.ajout); P.push(''); }

  /* Les mentions ponctuelles, dans l'ordre où elles ont du sens */
  (r.options || []).forEach(cle => {
    const o = OPTIONS_RAPPEL.find(x => x.cle === cle);
    if(o){ P.push(o.texte); P.push(''); }
  });

  if(r.libre && r.libre.trim()){ P.push(r.libre.trim()); P.push(''); }

  P.push('📅 Tu vois toutes tes heures sur ton planning, depuis ton interface élève Drivup.');
  P.push('📧 Si jamais tu as du retard, préviens ton moniteur sur son Messenger ' +
         'et le bureau sur le Messenger Évolution Conduites.');
  P.push('⚠️ Toute leçon non décommandée 48 heures avant est facturée.');
  P.push('');
  P.push("📼 N'oublie pas de réviser toutes tes procédures et viens avec ta carte SD " +
         '(sauf premier cours en voiture, évaluations et simulateurs)');
  P.push('🚨 Rappel méthodologie : https://urlr.me/9K3g7 🚨');

  return P.join('\n');
}


/* ---------- L'écran de composition manuelle ---------- */
let choixRappel = { type:'cours', jour:'𝗗𝗘𝗠𝗔𝗜𝗡', voiture:'',
                    emplacement:'cour', options:[], libre:'' };

async function afficherRappelManuel(){
  const zone = $('rappelManuelZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Chargement des élèves…</div>';
  if(typeof chargerFiches === 'function') await chargerFiches();
  zone.innerHTML = '';

  /* Choix de l'élève */
  const lab = document.createElement('label');
  lab.textContent = "Élève — le numéro vient de sa fiche";
  zone.appendChild(lab);

  const sel = document.createElement('select');
  sel.id = 'rappelEleve';
  sel.innerHTML = '<option value="">— choisis un élève —</option>' +
    (fichesEleves || []).slice()
      .sort((a, b) => a.eleve.localeCompare(b.eleve, 'fr'))
      .map(f => '<option value="' + f.eleve.replace(/"/g, '&quot;') + '">' +
        f.eleve + (f.telephone ? '' : '  (sans numéro)') + '</option>').join('');
  zone.appendChild(sel);

  /* Les réglages du message */
  const grille = document.createElement('div');
  grille.className = 'duo';
  grille.innerHTML =
    '<div><label for="rapType">Type de séance</label><select id="rapType">' +
      TYPES_RAPPEL.map(t => '<option value="' + t.cle + '">' +
        t.titre.normalize('NFKD').replace(/[^\x20-\x7Eéèêàçîô']/g, '') + '</option>').join('') +
    '</select></div>' +
    '<div><label for="rapJour">Quand</label><select id="rapJour">' +
      JOURS_RAPPEL.map(j => '<option value="' + j + '">' +
        j.normalize('NFKD').replace(/[^\x20-\x7Eéèêàçîô']/g, '') + '</option>').join('') +
    '</select></div>';
  zone.appendChild(grille);

  const grille2 = document.createElement('div');
  grille2.className = 'duo';
  grille2.innerHTML =
    '<div><label for="rapVoiture">N° de voiture</label>' +
      '<input type="text" id="rapVoiture" inputmode="numeric" placeholder="Ex : 5"></div>' +
    '<div><label for="rapEmpl">Où est la voiture</label><select id="rapEmpl">' +
      '<option value="cour">Cour intérieure</option>' +
      '<option value="rue">Rue, le long du trottoir</option>' +
      '<option value="">Ne pas préciser</option>' +
    '</select></div>';
  zone.appendChild(grille2);

  /* Les mentions à ajouter */
  const t = document.createElement('label');
  t.textContent = 'Mentions à ajouter';
  zone.appendChild(t);

  OPTIONS_RAPPEL.forEach(o => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:14px;color:var(--cream);margin:0 0 8px;font-weight:400;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = o.cle;
    cb.className = 'optionRappel';
    cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin:0;';
    cb.addEventListener('change', apercuRappel);
    l.appendChild(cb);
    l.appendChild(document.createTextNode(o.nom));
    zone.appendChild(l);
  });

  const lLibre = document.createElement('label');
  lLibre.textContent = 'À ajouter pour cet élève (facultatif)';
  lLibre.style.marginTop = '8px';
  zone.appendChild(lLibre);
  const libre = document.createElement('textarea');
  libre.id = 'rapLibre';
  libre.rows = 2;
  libre.placeholder = 'Une précision propre à cet élève';
  libre.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'color:var(--cream);padding:10px 11px;border-radius:10px;font-size:15px;' +
    'line-height:1.5;font-family:inherit;resize:vertical;margin-bottom:12px;';
  zone.appendChild(libre);

  /* Aperçu, toujours visible : on envoie ce qu'on a relu */
  const ap = document.createElement('div');
  ap.id = 'rappelApercu';
  ap.style.cssText = 'background:var(--navy);border:1px solid var(--line);border-radius:10px;' +
    'padding:12px 14px;font-size:13px;line-height:1.55;white-space:pre-wrap;' +
    'max-height:340px;overflow-y:auto;margin-bottom:12px;';
  zone.appendChild(ap);

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;';

  const bEnv = document.createElement('a');
  bEnv.id = 'rappelEnvoi';
  bEnv.className = 'btn btn-primary';
  bEnv.style.cssText = 'flex:1;padding:13px;font-size:14px;margin:0;text-align:center;' +
    'text-decoration:none;display:inline-flex;align-items:center;justify-content:center;';
  bEnv.textContent = '💬 Envoyer par SMS';
  r.appendChild(bEnv);

  const bCop = document.createElement('button');
  bCop.className = 'btn btn-secondary';
  bCop.style.cssText = 'width:auto;padding:13px 16px;font-size:14px;margin:0;';
  bCop.textContent = '📋';
  bCop.title = 'Copier le message';
  bCop.addEventListener('click', () => {
    navigator.clipboard.writeText(composerRappel(lireChoixRappel())).then(
      () => showToast('Message copié ✅'),
      () => showToast('Copie impossible'));
  });
  r.appendChild(bCop);
  zone.appendChild(r);

  ['rapType', 'rapJour', 'rapVoiture', 'rapEmpl', 'rapLibre', 'rappelEleve']
    .forEach(id => {
      const el = $(id);
      if(el){
        el.addEventListener('change', apercuRappel);
        el.addEventListener('input', apercuRappel);
      }
    });

  apercuRappel();
}

function lireChoixRappel(){
  const options = [];
  document.querySelectorAll('.optionRappel').forEach(cb => {
    if(cb.checked) options.push(cb.value);
  });
  return {
    type: $('rapType') ? $('rapType').value : 'cours',
    jour: $('rapJour') ? $('rapJour').value : '',
    voiture: $('rapVoiture') ? $('rapVoiture').value.trim() : '',
    emplacement: $('rapEmpl') ? $('rapEmpl').value : 'cour',
    options: options,
    libre: $('rapLibre') ? $('rapLibre').value : ''
  };
}

function apercuRappel(){
  const ap = $('rappelApercu');
  if(!ap) return;
  const texte = composerRappel(lireChoixRappel());
  ap.textContent = texte;

  const bEnv = $('rappelEnvoi');
  const nom = $('rappelEleve') ? $('rappelEleve').value : '';
  const f = nom && typeof ficheDe === 'function' ? ficheDe(nom) : null;

  if(bEnv){
    if(f && f.telephone){
      bEnv.href = 'sms:' + telPourLien(f.telephone) + '?&body=' + encodeURIComponent(texte);
      bEnv.style.opacity = '1';
      bEnv.style.pointerEvents = 'auto';
      bEnv.textContent = '💬 Envoyer à ' + nom;
    }else{
      bEnv.removeAttribute('href');
      bEnv.style.opacity = '.5';
      bEnv.style.pointerEvents = 'none';
      bEnv.textContent = nom ? '⚠️ ' + nom + ' n\'a pas de numéro'
                             : '💬 Choisis un élève';
    }
  }
}


/* Bascule entre saisie manuelle et lecture du planning */
function modeRappel(mode){
  const m = $('rappelManuel'), pl = $('rappelPlanning');
  const bm = $('rappelModeManuel'), bp = $('rappelModePlanning');
  if(!m || !pl) return;

  const manuel = (mode !== 'planning');
  m.style.display = manuel ? 'block' : 'none';
  pl.style.display = manuel ? 'none' : 'block';

  [[bm, manuel], [bp, !manuel]].forEach(([b, actif]) => {
    if(!b) return;
    b.style.borderColor = actif ? 'var(--orange)' : 'var(--line)';
    b.style.color = actif ? 'var(--accent-text)' : 'var(--cream)';
    b.style.background = actif ? 'rgba(182,255,14,.09)' : 'var(--navy)';
  });

  if(manuel) afficherRappelManuel();
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-rappels.js'] = true;
