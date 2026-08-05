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



/* ============================================================
   RAPPROCHEMENT AVEC LE RÉPERTOIRE
   Un planning n'affiche souvent qu'un mot : « Dupont », ou
   « Pierre ». Deux élèves peuvent répondre au même mot, et un
   rappel envoyé au mauvais destinataire ne se rattrape pas.
   ============================================================ */
function motsDe(nom){
  return normaliserMot(nom).split(/[\s-]+/).filter(x => x.length >= 2);
}

/* Renvoie les élèves du répertoire compatibles avec ce qui a été lu */
function candidatsPour(nomLu){
  const lus = motsDe(nomLu);
  if(!lus.length) return { exact: null, candidats: [] };

  const tous = (fichesEleves || []).map(f => f.eleve);
  /* Les élèves connus par leurs bilans comptent aussi */
  (elevesConnus || []).forEach(n => {
    if(!tous.some(x => normaliserMot(x) === normaliserMot(n))) tous.push(n);
  });

  /* Correspondance parfaite : on ne cherche pas plus loin */
  const exact = tous.find(n => normaliserMot(n) === normaliserMot(nomLu));
  if(exact) return { exact: exact, candidats: [exact] };

  /* Sinon : tous ceux dont un mot correspond exactement à un mot lu.
     On n'accepte pas les correspondances partielles : « Mar » ne doit
     pas rapprocher Marine, Marc et Marie. */
  const candidats = tous.filter(n => {
    const mots = motsDe(n);
    return lus.every(l => mots.indexOf(l) !== -1) ||
           lus.some(l => mots.indexOf(l) !== -1 && l.length >= 3);
  });

  return { exact: candidats.length === 1 ? candidats[0] : null,
           candidats: candidats };
}

/* ---------- Le message envoyé à un élève ---------- */
function messageRappel(c){
  const perso = (typeof modelePour === 'function') ? modelePour('rappel_cours') : null;
  const nom = c.choisi || c.eleve;
  const valeurs = {
    eleve: nom,
    prenom: nom.split(' ')[0],
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

  /* Chaque cours est rapproché du répertoire, sans jamais deviner */
  coursDuPlanning.forEach(c => {
    if(!c.choisi){
      const r = candidatsPour(c.eleve);
      c.candidats = r.candidats;
      c.choisi = r.exact || '';
    }
    const f = c.choisi && typeof ficheDe === 'function' ? ficheDe(c.choisi) : null;
    c.telephone = f && f.telephone ? f.telephone : '';
  });

  const prets = coursDuPlanning.filter(c => c.telephone);
  const aChoisir = coursDuPlanning.filter(c => !c.choisi && c.candidats.length > 1);
  const sans = coursDuPlanning.filter(c => !c.telephone && !aChoisir.includes(c));

  const tete = document.createElement('div');
  tete.style.cssText = 'padding:10px 12px;background:var(--navy);border:1px solid var(--line);' +
    'border-radius:10px;margin-bottom:12px;font-size:13px;line-height:1.6;';
  tete.innerHTML = '<strong>' + coursDuPlanning.length + ' cours lu(s)</strong> · ' +
    '<span style="color:var(--accent-text);">' + prets.length + ' prêt(s) à envoyer</span>' +
    (aChoisir.length ? ' · <span style="color:var(--warn-text);">' + aChoisir.length +
      ' à départager</span>' : '') +
    (sans.length ? ' · <span style="color:var(--muted);">' + sans.length +
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
    /* Envoi de toute la journée, un par un et jamais en aveugle */
    const bTous = document.createElement('button');
    bTous.className = 'btn btn-primary';
    bTous.style.cssText = 'margin-top:12px;padding:13px;font-size:14px;';
    const restants = prets.filter(x => !x.envoye);
    bTous.textContent = '📤 Envoyer les ' + restants.length + ' SMS restants';
    bTous.disabled = !restants.length;
    bTous.addEventListener('click', async () => {
      if(!await confirmer('Envoyer ' + restants.length + ' SMS ?\n\n' +
          restants.map(x => '• ' + (x.choisi || x.eleve)).join('\n') +
          '\n\nIls partent un par un ; tu peux suivre l\'avancement.')) return;

      bTous.disabled = true;
      let ok = 0, rates = [];
      for(let i = 0; i < restants.length; i++){
        const cr = restants[i];
        bTous.textContent = 'Envoi ' + (i + 1) + ' sur ' + restants.length + '…';
        try{
          await envoyerMessageComplet(cr.telephone, messageRappel(cr), cr.choisi || cr.eleve);
          cr.envoye = true;
          ok++;
        }catch(e){
          rates.push((cr.choisi || cr.eleve) + ' : ' + e.message);
          /* Quota atteint : inutile d'insister, les suivants échoueront */
          if(/quota/i.test(e.message)){
            await informer('Quota Allo atteint. Les envois restants sont interrompus.\n\n' +
                           e.message);
            break;
          }
        }
      }
      showToast(ok + ' SMS envoyé(s)' + (rates.length ? ' · ' + rates.length + ' échec(s)' : ''));
      if(rates.length) await informer('Envois manqués :\n\n' + rates.join('\n'));
      afficherRappels();
    });
    zone.appendChild(bTous);

    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'margin-top:8px;padding:11px;font-size:13px;';
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
  info.innerHTML = '<strong>' + (c.envoye ? '✅ ' : '') +
    (c.choisi || c.eleve).replace(/</g, '&lt;') + '</strong>' +
    (c.choisi && normaliserMot(c.choisi) !== normaliserMot(c.eleve)
      ? ' <span style="font-size:11px;color:var(--muted);">lu : ' +
        c.eleve.replace(/</g, '&lt;') + '</span>' : '') +
    '<div style="font-size:12px;color:var(--muted);margin-top:2px;line-height:1.5;">' +
    [c.date ? dateEnToutesLettres(c.date) : '', c.heure, c.duree, c.moniteur, c.site]
      .filter(Boolean).join(' · ') +
    (c.telephone ? '<br>📱 ' + telLisible(c.telephone) : '<br>📱 numéro inconnu') +
    '</div>';
  h.appendChild(info);

  if(c.telephone && !c.envoye){
    const a = document.createElement('button');
    a.className = 'btn btn-primary';
    a.style.cssText = 'width:auto;padding:9px 13px;font-size:14px;margin:0;flex-shrink:0;';
    a.textContent = '💬 Envoyer';
    a.addEventListener('click', async () => {
      a.disabled = true;
      a.textContent = 'Envoi…';
      try{
        await envoyerMessageComplet(c.telephone, messageRappel(c), c.choisi || c.eleve);
        c.envoye = true;
        showToast('Envoyé à ' + (c.choisi || c.eleve));
        afficherRappels();
      }catch(e){
        showToast('Erreur : ' + e.message);
        a.disabled = false;
        a.textContent = '💬 Envoyer';
      }
    });
    h.appendChild(a);
  }

  d.appendChild(h);

  /* Plusieurs élèves possibles : on demande, on ne devine pas */
  if(!c.choisi){
    const z = document.createElement('div');
    z.style.cssText = 'margin-top:8px;';

    if(c.candidats.length > 1){
      const a = document.createElement('div');
      a.style.cssText = 'font-size:12px;color:var(--warn-text);margin-bottom:5px;';
      a.textContent = '⚠️ ' + c.candidats.length + ' élèves portent ce nom. Lequel ?';
      z.appendChild(a);
    }

    const sel = document.createElement('select');
    sel.style.margin = '0';
    sel.innerHTML = '<option value="">— choisis l\'élève —</option>' +
      c.candidats.map(x => '<option value="' + x.replace(/"/g, '&quot;') + '">' +
        x + (ficheDe(x) && ficheDe(x).telephone ? '' : ' (sans numéro)') +
        '</option>').join('') +
      (c.candidats.length ? '<option value="__autre">— un autre élève —</option>' : '');
    sel.addEventListener('change', () => {
      if(sel.value === '__autre'){ choisirAutreEleve(c); return; }
      c.choisi = sel.value;
      afficherRappels();
    });
    z.appendChild(sel);

    if(!c.candidats.length){
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'margin-top:6px;padding:8px;font-size:12px;';
      b.textContent = '🔍 Chercher « ' + c.eleve + ' » dans le répertoire';
      b.addEventListener('click', () => choisirAutreEleve(c));
      z.appendChild(b);
    }

    d.appendChild(z);
  }

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




/* Choisir un élève dans tout le répertoire, quand la lecture
   n'a rien donné ou que le bon nom n'est pas proposé. */
async function choisirAutreEleve(c){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(480px, 94vw);max-height:85vh;overflow-y:auto;';

  boite.insertAdjacentHTML('beforeend',
    '<h3>Quel élève ?</h3>' +
    '<div style="font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:12px;">' +
      'Le planning indique « <strong>' + c.eleve.replace(/</g, '&lt;') + '</strong> ». ' +
      'Choisis à qui envoyer le rappel.</div>' +
    '<input type="text" id="chAutre" placeholder="🔍 Filtrer">');

  const liste = document.createElement('div');
  liste.style.cssText = 'max-height:44vh;overflow-y:auto;margin:8px 0 12px;';
  boite.appendChild(liste);

  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  boite.appendChild(bAnn);

  fond.appendChild(boite);
  document.body.appendChild(fond);

  const tous = (fichesEleves || []).map(f => f.eleve)
    .concat((elevesConnus || []).filter(n =>
      !(fichesEleves || []).some(f => normaliserMot(f.eleve) === normaliserMot(n))))
    .sort((a, b) => a.localeCompare(b, 'fr'));

  const rech = boite.querySelector('#chAutre');
  function dessiner(){
    const q = normaliserMot(rech.value);
    liste.innerHTML = '';
    tous.filter(n => !q || normaliserMot(n).indexOf(q) !== -1).forEach(n => {
      const f = ficheDe(n);
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'text-align:left;padding:10px 12px;font-size:14px;margin:0 0 5px;';
      b.textContent = n + (f && f.telephone ? '  📱' : '  (sans numéro)');
      b.addEventListener('click', () => {
        c.choisi = n;
        document.body.removeChild(fond);
        afficherRappels();
      });
      liste.appendChild(b);
    });
    if(!liste.children.length){
      liste.innerHTML = '<div class="empty">Aucun élève ne correspond.</div>';
    }
  }
  rech.addEventListener('input', dessiner);
  dessiner();
  setTimeout(() => rech.focus(), 100);
}

/* ============================================================
   COMPOSITION D'UN RAPPEL À LA MAIN
   Le message est toujours le même ; seules quelques mentions
   changent d'un élève à l'autre.
   ============================================================ */
/* Les types de rappel viennent tous de « Textes types ».
   L'application n'en propose plus d'elle-même : les vôtres sont
   les bons, et deux listes concurrentes prêtaient à confusion. */
const TYPES_RAPPEL = [];

const JOURS_RAPPEL = ['𝗗𝗘𝗠𝗔𝗜𝗡', "𝗔𝗨𝗝𝗢𝗨𝗥𝗗'𝗛𝗨𝗜", '𝗟𝗨𝗡𝗗𝗜', '𝗠𝗔𝗥𝗗𝗜',
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

/* Les types disponibles : ceux de l'application, plus les vôtres.
   Un texte enregistré dans « Textes types » avec l'usage
   « Rappel de cours » devient un type à part entière. */
function typesDisponibles(){
  const perso = ((typeof modelesTexte !== 'undefined' ? modelesTexte : []) || [])
    .filter(m => m.usage === 'rappel_cours')
    .map(m => ({ cle: 'perso:' + m.id, titre: m.titre || m.nom,
                 contenu: m.contenu, perso: true }));
  return TYPES_RAPPEL.concat(perso);
}

/* Allo compte 1000 caractères par SMS ; on garde une marge. */
const LIMITE_SMS = 950;

/* Le message assemblé à partir des choix */
function composerRappel(r){
  const tous = typesDisponibles();
  if(!tous.length){
    return "Aucun modèle de rappel enregistré.\n\n" +
      "Va dans ⚙️ Outils → 📄 Textes types, crée un texte avec l'usage " +
      '« 🔔 Rappel de cours par SMS », et il apparaîtra ici.';
  }
  const type = tous.find(x => x.cle === r.type) || tous[0];

  const empl = EMPLACEMENTS.find(x => x.cle === r.emplacement);
  const mentions = (r.options || [])
    .map(cle => (OPTIONS_RAPPEL.find(x => x.cle === cle) || {}).texte)
    .filter(Boolean).join('\n\n');

  return appliquerModele(type.contenu || '', {
    jour: r.jour || '',
    voiture: r.voiture || '',
    emplacement: (empl && empl.texte) || '',
    mentions: mentions,
    note: (r.libre || '').trim(),
    eleve: r.eleve || '',
    prenom: (r.eleve || '').split(' ')[0]
  });
}

/* ---------- L'écran de composition manuelle ---------- */
/* Ce qui reste d'un élève au suivant : on enchaîne les rappels
   d'une même journée, il serait pénible de tout ressaisir. */
/* Vrai dès que le moniteur a écrit dans l'aperçu : on ne réécrit
   plus son texte par-dessus au moindre changement de réglage. */
let texteModifie = false;

let choixRappel = { type:'cours', jour:'𝗗𝗘𝗠𝗔𝗜𝗡', voiture:'',
                    emplacement:'cour', options:[], libre:'' };

const CLE_RAPPEL = 'rappel_reglages';

function memoriserChoixRappel(){
  try{
    const r = lireChoixRappel();
    delete r.libre;   /* propre à un élève, on ne le reporte pas */
    localStorage.setItem(CLE_RAPPEL, JSON.stringify(r));
  }catch(e){}
}

function relireChoixRappel(){
  try{
    const brut = localStorage.getItem(CLE_RAPPEL);
    if(brut) choixRappel = Object.assign(choixRappel, JSON.parse(brut));
  }catch(e){}
  return choixRappel;
}

async function afficherRappelManuel(){
  const zone = $('rappelManuelZone');
  if(!zone) return;

  /* Un nouvel écran repart du modèle */
  texteModifie = false;

  zone.innerHTML = '<div class="empty">Chargement des élèves…</div>';
  if(typeof chargerFiches === 'function') await chargerFiches();
  zone.innerHTML = '';

  /* Choix de l'élève */
  const lab = document.createElement('label');
  lab.textContent = "Élève — le numéro vient de sa fiche";
  zone.appendChild(lab);

  /* Saisie libre avec suggestions : plus rapide que de dérouler
     une liste de plusieurs centaines d'élèves. */
  const sel = document.createElement('input');
  sel.type = 'text';
  sel.id = 'rappelEleve';
  sel.setAttribute('list', 'listeRappelEleves');
  sel.autocomplete = 'off';
  sel.placeholder = 'Tape les premières lettres, ou laisse vide';
  zone.appendChild(sel);

  const dl = document.createElement('datalist');
  dl.id = 'listeRappelEleves';
  const noms = (fichesEleves || []).map(f => f.eleve);
  (elevesConnus || []).forEach(n => {
    if(!noms.some(x => normaliserMot(x) === normaliserMot(n))) noms.push(n);
  });
  noms.sort((a, b) => a.localeCompare(b, 'fr')).forEach(n => {
    const o = document.createElement('option');
    const f = ficheDe(n);
    o.value = n;
    o.textContent = (f && f.telephone) ? telLisible(f.telephone) : 'sans numéro';
    dl.appendChild(o);
  });
  zone.appendChild(dl);

  const etatEleve = document.createElement('div');
  etatEleve.id = 'rappelEleveEtat';
  etatEleve.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 12px;line-height:1.4;';
  zone.appendChild(etatEleve);

  /* Un élève absent du répertoire, ou un numéro ponctuel */
  const lt = document.createElement('label');
  lt.textContent = 'Numéro — laisse vide pour prendre celui de sa fiche';
  zone.appendChild(lt);

  const tel = document.createElement('input');
  tel.type = 'tel';
  tel.id = 'rapTel';
  tel.inputMode = 'tel';
  tel.placeholder = '06 12 34 56 78';
  tel.style.width = '100%';
  zone.appendChild(tel);

  /* Les réglages du message */
  /* Sans modèle enregistré, l'outil ne peut rien composer */
  if(!typesDisponibles().length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.style.cssText = 'padding:16px;line-height:1.6;';
    v.innerHTML = '📄 <strong>Aucun modèle de rappel enregistré.</strong><br>' +
      '<span style="font-size:12px;">Va dans <strong>📄 Textes types</strong>, ' +
      'crée un texte avec l\'usage « 🔔 Rappel de cours par SMS », ' +
      'et il apparaîtra ici.<br>' +
      'Le bouton 📥 Importer permet d\'en coller plusieurs d\'un coup.</span>';
    zone.appendChild(v);
    return;
  }

  const grille = document.createElement('div');
  grille.className = 'duo';
  grille.innerHTML =
    '<div><label for="rapType">Type de séance</label><select id="rapType">' +
      typesDisponibles().map(t => '<option value="' + t.cle + '">' +
        String(t.titre).normalize('NFKD').replace(/[^\x20-\x7Eéèêàçîô'’-]/g, '') +
        '</option>').join('') +
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

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    t.textContent = o.nom;
    l.appendChild(t);

    /* Le coût en caractères, pour décider en connaissance de cause */
    const poids = document.createElement('span');
    poids.style.cssText = 'font-size:11px;color:var(--muted);flex-shrink:0;';
    poids.textContent = '+' + (o.texte.length + 2);
    l.appendChild(poids);

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
  const compteur = document.createElement('div');
  compteur.id = 'rappelCompteur';
  compteur.style.cssText = 'font-size:12px;text-align:right;margin-bottom:4px;min-height:16px;';
  zone.appendChild(compteur);

  /* L'aperçu est modifiable : une précision de dernière minute ne
     doit pas obliger à passer par les modèles. */
  const ap = document.createElement('textarea');
  ap.id = 'rappelApercu';
  ap.rows = 14;
  ap.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
    'border-radius:10px;padding:12px 14px;font-size:13px;line-height:1.55;' +
    'color:var(--cream);font-family:inherit;resize:vertical;margin-bottom:6px;';
  zone.appendChild(ap);

  const barreAp = document.createElement('div');
  barreAp.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px;';

  const etatAp = document.createElement('span');
  etatAp.id = 'rappelEtatApercu';
  etatAp.style.cssText = 'flex:1;min-width:0;font-size:11px;color:var(--muted);';
  barreAp.appendChild(etatAp);

  const bRaz = document.createElement('button');
  bRaz.id = 'rappelRaz';
  bRaz.className = 'btn btn-secondary';
  bRaz.style.cssText = 'display:none;width:auto;padding:6px 10px;font-size:11px;margin:0;';
  bRaz.textContent = '↺ Revenir au modèle';
  bRaz.addEventListener('click', () => {
    texteModifie = false;
    apercuRappel();
  });
  barreAp.appendChild(bRaz);
  zone.appendChild(barreAp);

  /* Dès qu'on écrit dedans, le texte cesse d'être recalculé */
  ap.addEventListener('input', () => {
    texteModifie = true;
    majCompteurRappel(ap.value);
    majEtatApercu();
    majBoutonEnvoi();
  });

  const etatEnvoi = document.createElement('div');
  etatEnvoi.id = 'rappelEtatEnvoi';
  etatEnvoi.style.cssText = 'font-size:13px;line-height:1.5;margin-bottom:10px;' +
    'min-height:18px;';
  zone.appendChild(etatEnvoi);

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;';

  const bEnv = document.createElement('button');
  bEnv.id = 'rappelEnvoi';
  bEnv.className = 'btn btn-primary';
  bEnv.style.cssText = 'flex:1;padding:13px;font-size:14px;margin:0;';
  bEnv.textContent = '💬 Envoyer par SMS';
  bEnv.addEventListener('click', envoyerRappelManuel);
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

  ['rapType', 'rapJour', 'rapVoiture', 'rapEmpl', 'rapLibre', 'rappelEleve', 'rapTel']
    .forEach(id => {
      const el = $(id);
      if(el){
        el.addEventListener('change', () => { apercuRappel(); memoriserChoixRappel(); });
        el.addEventListener('input', apercuRappel);
      }
    });

  /* On reprend les réglages du rappel précédent */
  const m = relireChoixRappel();
  if($('rapType') && m.type){
    const existe = Array.prototype.some.call($('rapType').options, o => o.value === m.type);
    if(existe) $('rapType').value = m.type;
  }
  if($('rapJour') && m.jour) $('rapJour').value = m.jour;
  if($('rapVoiture') && m.voiture) $('rapVoiture').value = m.voiture;
  if($('rapEmpl') && m.emplacement !== undefined) $('rapEmpl').value = m.emplacement;
  (m.options || []).forEach(cle => {
    const cb = document.querySelector('.optionRappel[value="' + cle + '"]');
    if(cb) cb.checked = true;
  });

  apercuRappel();
}

function lireChoixRappel(){
  const options = [];
  document.querySelectorAll('.optionRappel').forEach(cb => {
    if(cb.checked) options.push(cb.value);
  });
  return {
    eleve: $('rappelEleve') ? $('rappelEleve').value : '',
    type: $('rapType') ? $('rapType').value : 'cours',
    jour: $('rapJour') ? $('rapJour').value : '',
    voiture: $('rapVoiture') ? $('rapVoiture').value.trim() : '',
    emplacement: $('rapEmpl') ? $('rapEmpl').value : 'cour',
    options: options,
    libre: $('rapLibre') ? $('rapLibre').value : ''
  };
}

/* Le texte réellement envoyé : celui de la zone si le moniteur
   l'a retouché, sinon celui que composent les réglages. */
function texteRappel(){
  const ap = $('rappelApercu');
  if(texteModifie && ap) return ap.value;
  return composerRappel(lireChoixRappel());
}

function majCompteurRappel(texte){
  const cp = $('rappelCompteur');
  if(!cp) return;
  const n = texte.length;
  const parts = decouperMessage(texte, LIMITE_SMS).length;
  cp.style.color = (parts > 1) ? '#E8A33D' : 'var(--muted)';
  cp.textContent = n + ' caractères' +
    (parts > 1
      ? ' — ' + parts + ' SMS · il faut retirer ' + (n - LIMITE_SMS) +
        ' caractères pour n\'en faire qu\'un'
      : ' — 1 SMS · encore ' + (LIMITE_SMS - n) + ' de marge');
}

function majEtatApercu(){
  const e = $('rappelEtatApercu');
  const b = $('rappelRaz');
  if(e) e.textContent = texteModifie
    ? '✏️ Texte modifié à la main — les réglages ne le réécrivent plus'
    : 'Tu peux écrire directement dans le message ci-dessus.';
  if(b) b.style.display = texteModifie ? 'inline-flex' : 'none';
}

function majBoutonEnvoi(){
  const bEnv = $('rappelEnvoi');
  if(!bEnv) return;

  const nom = $('rappelEleve') ? $('rappelEleve').value.trim() : '';
  const f = nom && typeof ficheDe === 'function' ? ficheDe(nom) : null;
  const saisi = $('rapTel') ? $('rapTel').value.trim() : '';
  const numero = saisi || (f && f.telephone) || '';

  /* On dit ce qu'on a trouvé, pour éviter les fautes de frappe */
  const et = $('rappelEleveEtat');
  if(et){
    if(!nom) et.textContent = '';
    else if(f && f.telephone) et.innerHTML =
      '<span style="color:var(--accent-text);">✅ ' + telLisible(f.telephone) + '</span>';
    else if(f) et.innerHTML =
      '<span style="color:var(--warn-text);">⚠️ Fiche trouvée, mais sans numéro</span>';
    else et.innerHTML =
      '<span style="color:var(--warn-text);">⚠️ Élève inconnu — saisis son numéro ci-dessous</span>';
  }

  if(numero){
    bEnv.disabled = false;
    bEnv.textContent = '💬 Envoyer à ' + (nom || telLisible(numero));
  }else{
    bEnv.disabled = true;
    bEnv.textContent = nom ? '⚠️ ' + nom + ' n\'a pas de numéro — saisis-le'
                           : '💬 Choisis un élève ou saisis un numéro';
  }
}

function apercuRappel(){
  const ap = $('rappelApercu');
  if(!ap) return;

  /* Un texte retouché n'est jamais réécrit sans le dire */
  if(!texteModifie) ap.value = composerRappel(lireChoixRappel());

  majCompteurRappel(ap.value);
  majEtatApercu();
  majBoutonEnvoi();
}

/* ============================================================
   ENVOI DIRECT PAR L'API ALLO
   Le SMS part de l'auto-école, sans passer par le téléphone
   du moniteur. La clé reste dans le Worker.
   ============================================================ */
async function envoyerSmsAllo(numero, texte, eleve){
  const r = await fetchFiable(CONFIG.SMS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: ACCES.code, to: numero,
                           message: texte, eleve: eleve || '' })
  }, 20000, 1);

  const d = await r.json().catch(() => ({}));
  if(!r.ok || d.error){
    throw new Error(d.error || ('Le Worker a répondu ' + r.status +
      (r.status === 404 ? ' — route inconnue' : '')));
  }
  return d;
}


/* Envoi depuis l'écran de composition */
async function envoyerRappelManuel(){
  direEtatEnvoi('');
  const b = $('rappelEnvoi');
  const nom = $('rappelEleve') ? $('rappelEleve').value : '';
  const f = nom && typeof ficheDe === 'function' ? ficheDe(nom) : null;
  const saisi = $('rapTel') ? $('rapTel').value.trim() : '';
  const numero = saisi || (f && f.telephone) || '';
  if(!numero) return;

  const texte = texteRappel();

  const parts = decouperMessage(texte, LIMITE_SMS).length;

  if(!await confirmer('Envoyer' + (nom ? ' à ' + nom : '') +
      '\nau ' + telLisible(numero) + ' ?\n\n' +
      texte.length + ' caractères' +
      (parts > 1 ? ' — découpé en ' + parts + ' SMS, facturés séparément.'
                 : ' — 1 SMS.'))) return;

  b.disabled = true;
  b.textContent = 'Envoi…';
  try{
    const n = await envoyerMessageComplet(numero, texte, nom);
    b.textContent = '✅ Envoyé';
    direEtatEnvoi((n > 1 ? n + ' SMS envoyés' : 'SMS envoyé') +
                  ' au ' + telLisible(numero) + (nom ? ' — ' + nom : ''), false);
    showToast(n > 1 ? n + ' SMS envoyés ✅' : 'SMS envoyé ✅');
    /* On passe à l'élève suivant, les réglages sont conservés */
    setTimeout(() => {
      if($('rappelEleve')) $('rappelEleve').value = '';
      if($('rapTel')) $('rapTel').value = '';
      if($('rapLibre')) $('rapLibre').value = '';
      /* Élève suivant : on repart du modèle, pas du texte retouché */
      texteModifie = false;
      apercuRappel();
    }, 900);
  }catch(e){
    /* Un toast disparaît en deux secondes : l'erreur doit rester
       à l'écran, avec ce qu'il faut faire. */
    direEtatEnvoi(e.message, true);
    showToast("L'envoi a échoué");
    b.disabled = false;
    apercuRappel();
  }
}

/* Le résultat de l'envoi, affiché tant qu'on ne recommence pas */
function direEtatEnvoi(texte, erreur){
  const z = $('rappelEtatEnvoi');
  if(!z) return;
  if(!texte){ z.innerHTML = ''; return; }

  z.style.color = erreur ? 'var(--warn-text)' : 'var(--accent-text)';
  let aide = '';

  if(erreur){
    if(/404|route inconnue/i.test(texte)){
      aide = "Le Worker Cloudflare n'a pas la route d'envoi : déploie sa dernière version.";
    }else if(/clé allo|api_key|non configur/i.test(texte)){
      aide = 'Ajoute les variables <strong>ALLO_API_KEY</strong> et ' +
             '<strong>ALLO_FROM</strong> dans les réglages du Worker Cloudflare. ' +
             'ALLO_FROM accepte un numéro ou un Sender ID.';
    }else if(/autoris/i.test(texte)){
      aide = "Ce compte n'a pas le droit d'envoyer des SMS : vois dans ⚙️ Accès.";
    }else if(/quota/i.test(texte)){
      aide = 'Le quota journalier Allo est atteint.';
    }else if(/réseau|network|délai/i.test(texte)){
      aide = 'Le Worker ne répond pas. Réessaie dans un instant.';
    }
  }

  z.innerHTML = (erreur ? '⚠️ ' : '✅ ') + String(texte).replace(/</g, '&lt;') +
    (aide ? '<br><span style="font-size:12px;color:var(--muted);">' + aide + '</span>' : '');
}


/* ============================================================
   MESSAGES TROP LONGS
   Certains rappels dépassent la limite d'un SMS. Plutôt que de
   refuser, on découpe proprement — sur un saut de ligne, jamais
   au milieu d'un mot.
   ============================================================ */
function decouperMessage(texte, limite){
  const max = (limite || LIMITE_SMS) - 10;   /* place pour « (1/2) » */
  if(texte.length <= (limite || LIMITE_SMS)) return [texte];

  const morceaux = [];
  let reste = texte;

  while(reste.length > max){
    /* On coupe au dernier saut de ligne avant la limite */
    let coupe = reste.lastIndexOf('\n\n', max);
    if(coupe < max * 0.5) coupe = reste.lastIndexOf('\n', max);
    if(coupe < max * 0.5) coupe = reste.lastIndexOf(' ', max);
    if(coupe < max * 0.5) coupe = max;
    morceaux.push(reste.slice(0, coupe).trim());
    reste = reste.slice(coupe).trim();
  }
  if(reste) morceaux.push(reste);

  const total = morceaux.length;
  return morceaux.map((m, i) => '(' + (i + 1) + '/' + total + ')\n' + m);
}

/* Envoie un message, en plusieurs SMS s'il le faut */
async function envoyerMessageComplet(numero, texte, eleve){
  const parties = decouperMessage(texte, LIMITE_SMS);
  for(let i = 0; i < parties.length; i++){
    await envoyerSmsAllo(numero, parties[i], eleve);
    /* Un court délai garde l'ordre d'arrivée */
    if(i < parties.length - 1) await new Promise(r => setTimeout(r, 600));
  }
  return parties.length;
}


/* ============================================================
   HISTORIQUE DES ENVOIS
   Savoir qui a été prévenu, quand et par qui. Sans ça, personne
   ne peut trancher quand un élève dit ne pas avoir reçu le rappel.
   ============================================================ */
async function afficherHistoriqueSms(){
  const zone = $('rappelHistorique');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Chargement de l\'historique…</div>';
  try{
    const d = await appelPrep({ action: 'smsList', combien: 150 });
    const liste = (d && d.sms) || [];
    zone.innerHTML = '';

    if(!liste.length){
      zone.innerHTML = '<div class="empty">Aucun SMS envoyé pour le moment.</div>';
      return;
    }

    /* Ce que ça représente, avant le détail */
    const auj = new Date().toLocaleDateString('fr-FR');
    const duJour = liste.filter(x => (x.quand || '').indexOf(auj) === 0);
    const partsJour = duJour.reduce((n, x) => n + (parseInt(x.parties, 10) || 1), 0);

    const t = document.createElement('div');
    t.style.cssText = 'padding:10px 12px;background:var(--navy);border:1px solid var(--line);' +
      'border-radius:10px;margin-bottom:10px;font-size:13px;line-height:1.6;';
    t.innerHTML = '<strong>' + duJour.length + " envoi(s) aujourd'hui</strong>" +
      (partsJour !== duJour.length ? ' · ' + partsJour + ' SMS facturés' : '') +
      '<br><span style="font-size:12px;color:var(--muted);">' +
      (d.total || liste.length) + ' au total · les 150 derniers sont affichés</span>';
    zone.appendChild(t);

    const rech = document.createElement('input');
    rech.type = 'text';
    rech.placeholder = '🔍 Filtrer par élève, numéro ou moniteur';
    rech.style.marginBottom = '10px';
    zone.appendChild(rech);

    const l = document.createElement('div');
    l.style.cssText = 'max-height:420px;overflow-y:auto;';
    zone.appendChild(l);

    function dessiner(){
      const q = normaliserMot(rech.value);
      l.innerHTML = '';
      const vus = liste.filter(x => !q ||
        normaliserMot(x.eleve).indexOf(q) !== -1 ||
        normaliserMot(x.numero).indexOf(q) !== -1 ||
        normaliserMot(x.par).indexOf(q) !== -1);

      if(!vus.length){
        l.innerHTML = '<div class="empty">Aucun envoi ne correspond.</div>';
        return;
      }

      vus.forEach(x => {
        const d2 = document.createElement('details');
        d2.style.cssText = 'border:1px solid var(--line);border-radius:9px;' +
          'padding:8px 11px;margin-bottom:6px;';

        const rate = /échec|erreur/i.test(x.etat || '');
        d2.innerHTML = '<summary style="cursor:pointer;font-size:13px;line-height:1.5;">' +
          (rate ? '⚠️ ' : '✅ ') + '<strong>' + (x.eleve || '(sans nom)').replace(/</g, '&lt;') +
          '</strong> <span style="color:var(--muted);font-size:12px;">' +
          x.quand + ' · ' + telLisible(x.numero) +
          (x.par ? ' · ' + x.par : '') +
          (x.parties > 1 ? ' · ' + x.parties + ' SMS' : '') +
          '</span></summary>';

        const m = document.createElement('div');
        m.style.cssText = 'margin-top:7px;font-size:12px;line-height:1.5;white-space:pre-wrap;' +
          'color:var(--muted);background:var(--navy);padding:8px 10px;border-radius:7px;';
        m.textContent = x.message || '(message non conservé)';
        d2.appendChild(m);

        l.appendChild(d2);
      });
    }
    rech.addEventListener('input', dessiner);
    dessiner();

  }catch(e){
    zone.innerHTML = '<div class="empty">Historique indisponible : ' +
      e.message.replace(/</g, '&lt;') + '</div>';
  }
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-rappels.js'] = true;
