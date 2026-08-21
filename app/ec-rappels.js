/* Déployé le 21/08/2026 à 08:13 — v456 */
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

  /* Les deux lectures partent ensemble, et seulement si elles
     manquent : chargerFiches() relançait le serveur même quand le
     répertoire était déjà en mémoire. */
  zone.innerHTML = '<div class="empty">Recherche des numéros…</div>';
  await Promise.all([
    (typeof chargerFiches === 'function' &&
     (typeof fichesEleves === 'undefined' || !fichesEleves.length))
      ? chargerFiches().catch(() => []) : Promise.resolve(),
    (typeof chargerModelesTexte === 'function' &&
     (typeof modelesTexte === 'undefined' || !modelesTexte.length))
      ? chargerModelesTexte().catch(() => []) : Promise.resolve()
  ]);
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
          /* Chaque cours va au moniteur lu sur le planning */
          preparerDepuisRappel(cr.choisi || cr.eleve, cr.jour, cr.moniteur);
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
        /* Le cours rejoint les prochains cours du moniteur lu sur le planning */
        preparerDepuisRappel(c.choisi || c.eleve, c.jour, c.moniteur);
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
    /* « 14h30 » plutôt que « 14:30 » : c'est ainsi qu'on écrit une
       heure dans un message à un élève. */
    heure: (r.heure || '').replace(':', 'h'),
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

/* Les créneaux de cours, de 6h00 à 18h30 par demi-heures */
const CRENEAUX_RAPPEL = (() => {
  const out = [];
  for(let m = 6 * 60; m <= 18 * 60 + 30; m += 30){
    out.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' +
             String(m % 60).padStart(2, '0'));
  }
  return out;
})();


let choixRappel = { type:'cours', jour:'𝗗𝗘𝗠𝗔𝗜𝗡', heure:'', voiture:'',
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

  /* Déjà en mémoire : on n'attend rien. C'est le cas courant, le
     répertoire étant lu à la connexion. */
  if(typeof chargerFiches === 'function' &&
     (typeof fichesEleves === 'undefined' || !fichesEleves.length)){
    zone.innerHTML = '<div class="empty">Chargement des élèves…</div>';
    await chargerFiches().catch(() => []);
  }
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
    '<div><label for="rapVoiture">Véhicule</label>' +
      '<div style="display:flex;gap:6px;">' +
        '<select id="rapMod" style="width:auto;flex-shrink:0;margin:0;">' +
          '<option value="">—</option><option value="A3">A3</option>' +
          '<option value="Q3">Q3</option><option value="Simu">Simu</option>' +
        '</select>' +
        '<input type="text" id="rapVoiture" inputmode="numeric" placeholder="n°" ' +
          'style="flex:1;min-width:0;margin:0;">' +
      '</div></div>' +
    '<div><label for="rapEmpl">Où est la voiture</label><select id="rapEmpl">' +
      '<option value="cour">Cour intérieure</option>' +
      '<option value="rue">Rue, le long du trottoir</option>' +
      '<option value="">Ne pas préciser</option>' +
    '</select></div>';
  zone.appendChild(grille2);

  /* Le moniteur qui fera le cours : c'est le bureau qui envoie les
     rappels, le cours doit donc arriver dans SES prochains cours,
     pas dans ceux de la personne qui a appuyé sur le bouton. */
  const lMon = document.createElement('label');
  lMon.setAttribute('for', 'rapMoniteur');
  lMon.textContent = '👤 Moniteur qui fera le cours';
  zone.appendChild(lMon);

  const selMon = document.createElement('select');
  selMon.id = 'rapMoniteur';
  selMon.innerHTML = '<option value="">— ne pas créer le cours —</option>';
  zone.appendChild(selMon);

  const aideMon = document.createElement('div');
  aideMon.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 12px;line-height:1.4;';
  aideMon.textContent = "Le cours apparaîtra dans « Mes prochains cours » du moniteur choisi. " +
    'Sans moniteur, le rappel part sans créer de cours.';
  zone.appendChild(aideMon);

  /* L'heure seule : le véhicule et l'emplacement sont déjà saisis
     plus haut, les redemander ici obligeait à taper deux fois. */
  const lH = document.createElement('label');
  lH.setAttribute('for', 'rapHeure');
  lH.textContent = '🕐 Heure du cours';
  zone.appendChild(lH);

  /* Les créneaux courants dans une liste, plutôt qu'un champ à
     remplir chiffre par chiffre sur un téléphone. Le dernier choix
     ouvre la saisie libre pour les cas particuliers. */
  const listeH = document.createElement('select');
  listeH.id = 'rapHeureChoix';
  listeH.innerHTML = '<option value="">— choisis l\'heure —</option>' +
    CRENEAUX_RAPPEL.map(h => '<option value="' + h + '">' +
                             h.replace(':', 'h') + '</option>').join('') +
    '<option value="autre">⌨️ Autre heure…</option>';
  zone.appendChild(listeH);

  const chH = document.createElement('input');
  chH.type = 'time';
  chH.id = 'rapHeure';
  chH.style.cssText = 'display:none;margin-top:6px;';
  chH.addEventListener('change', apercuRappel);
  zone.appendChild(chH);

  listeH.addEventListener('change', () => {
    if(listeH.value === 'autre'){
      chH.style.display = 'block';
      setTimeout(() => chH.focus(), 60);
    }else{
      chH.style.display = 'none';
      chH.value = listeH.value;
    }
    apercuRappel();
  });

  const aideH = document.createElement('div');
  aideH.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 12px;line-height:1.4;';
  aideH.innerHTML = "Reprise dans le SMS avec la variable <strong>{heure}</strong>, " +
    "dans « Mes prochains cours » et sur l'écran de l'accueil.";
  zone.appendChild(aideH);

  /* La liste des moniteurs, chargée une fois */
  (async () => {
    try{
      if(typeof chargerMoniteurs === 'function' &&
         (typeof moniteursActifs === 'undefined' || !moniteursActifs.length)){
        await chargerMoniteurs();
      }
      const liste = (typeof moniteursActifs !== 'undefined' ? moniteursActifs : []) || [];
      selMon.innerHTML = '<option value="">— ne pas créer le cours —</option>' +
        liste.map(m => '<option value="' + String(m).replace(/"/g, '&quot;') + '">' +
                       m + '</option>').join('');
      /* Un moniteur qui utilise l'outil se propose lui-même */
      if(liste.indexOf(ACCES.moniteur) !== -1) selMon.value = ACCES.moniteur;
    }catch(e){ /* sans liste, le champ reste sur « ne pas créer » */ }
  })();

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
    heure: $('rapHeure') ? $('rapHeure').value : '',
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

  /* L'heure conditionne le SMS, « Mes prochains cours » et l'écran
     de l'accueil : un rappel sans heure laisse l'élève et le
     moniteur dans le flou. */
  if($('rapHeure') && !$('rapHeure').value){
    direEtatEnvoi("Indique l'heure du cours avant d'envoyer.", true);
    $('rapHeure').focus();
    return;
  }

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

    /* Le cours annoncé rejoint « Mes prochains cours » du moniteur */
    preparerDepuisRappel(nom, choixRappel && choixRappel.jour,
                         $('rapMoniteur') ? $('rapMoniteur').value : '',
                         {
                           heure: $('rapHeure') ? $('rapHeure').value : '',
                           vehicule: (($('rapMod') ? $('rapMod').value : '') + ' ' +
                                      ($('rapVoiture') ? $('rapVoiture').value.trim() : '')).trim(),
                           /* « rue » côté SMS, « devant » côté écran :
                              c'est le même endroit, dit autrement. */
                           lieu: ($('rapEmpl') && $('rapEmpl').value === 'rue') ? 'devant'
                               : ($('rapEmpl') ? $('rapEmpl').value : '')
                         });

    /* On passe à l'élève suivant. Ce qui vaut pour lui seul est
       remis à zéro : une mention oubliée d'un rappel à l'autre
       envoie une information fausse à quelqu'un d'autre. */
    setTimeout(() => {
      if($('rappelEleve')) $('rappelEleve').value = '';
      if($('rapTel')) $('rapTel').value = '';
      if($('rapVoiture')) $('rapVoiture').value = '';
      if($('rapMod')) $('rapMod').value = '';
      if($('rapHeure')) $('rapHeure').value = '';
      if($('rapHeureChoix')) $('rapHeureChoix').value = '';
      if($('rapLibre')) $('rapLibre').value = '';

      /* Les mentions cochées : elles décrivent CE cours-là */
      document.querySelectorAll('.optionRappel').forEach(cb => {
        cb.checked = false;
      });

      /* Le moniteur et le jour restent : ils ne changent pas
         d'un élève à l'autre dans une série de rappels. */

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


/* ============================================================
   BASCULE ENTRE LES TROIS MODES
   Saisie à la main, lecture d'un planning, historique des envois.
   ============================================================ */
function modeRappel(mode){
  const vues = {
    manuel:     $('rappelManuel'),
    planning:   $('rappelPlanning'),
    historique: $('rappelHistoriqueBloc')
  };
  const boutons = {
    manuel:     $('rappelModeManuel'),
    planning:   $('rappelModePlanning'),
    historique: $('rappelModeHistorique')
  };
  if(!vues.manuel) return;

  const actif = vues[mode] ? mode : 'manuel';

  Object.keys(vues).forEach(k => {
    if(vues[k]) vues[k].style.display = (k === actif) ? 'block' : 'none';
    const b = boutons[k];
    if(!b) return;
    const on = (k === actif);
    b.style.borderColor = on ? 'var(--orange)' : 'var(--line)';
    b.style.color = on ? 'var(--accent-text)' : 'var(--cream)';
    b.style.background = on ? 'rgba(182,255,14,.09)' : 'var(--navy)';
  });

  if(actif === 'manuel') afficherRappelManuel();
  if(actif === 'historique') afficherHistoriqueSms();
}

/* ============================================================
   UN RAPPEL VAUT ANNONCE D'UN COURS

   Prévenir un élève qu'il a cours demain, c'est savoir qu'il aura
   cours demain. La préparation se crée donc toute seule, pour que
   le cours apparaisse dans « Mes prochains cours ».
   ============================================================ */
async function preparerDepuisRappel(eleve, jourTexte, moniteur, details){
  if(!eleve || eleve.length < 3) return;

  /* Sans moniteur désigné, on ne crée rien : un cours attribué au
     hasard encombrerait la liste de quelqu'un qui ne le fera pas. */
  const qui = String(moniteur || '').trim();
  if(!qui) return;

  const iso = dateDuRappel(jourTexte);
  if(!iso) return;

  try{
    /* Rien à faire si elle existe déjà */
    const d = await appelPrep({ action: 'prepList' });
    const liste = (d && d.preparations) || [];
    const deja = liste.some(x =>
      normaliserMot(x.eleve || '') === normaliserMot(eleve) && x.date === iso);
    if(deja) return;

    /* La boîte de l'élève décide du type de bilan. Sans indication —
       fiche vide, élève tout neuf — on part sur l'automatique :
       c'est le cas le plus courant, et le moniteur corrige d'un
       geste si besoin. */
    const f = (typeof ficheDe === 'function') ? ficheDe(eleve) : null;
    const formation = String((f && f.formation) || '').trim();

    let cle = 'conduite-auto';
    if(/manuel|\bbv\b|b[oô]ite m/i.test(formation)) cle = 'conduite-manuelle';

    /* Le dossier de l'élève, pour que le moniteur n'ait pas à tout
       ressaisir : numéro de leçon, frise, note du cours précédent.
       Sans cours antérieur, la fiche reste à remplir. */
    let note = '';
    let contexte = '';
    try{
      const d = await chargerDossierEleve(eleve);
      if(d && (d.lecons || d.derniereNote || d.frise)){
        const rep = {
          lecon: d.lecons ? String(d.lecons + 1) : '',
          frise: d.frise || '',
          modele: cle
        };
        contexte = JSON.stringify(rep);
        note = (typeof noteDepuisQuestionnaire === 'function')
          ? noteDepuisQuestionnaire(rep) : '';

        /* Ce que le moniteur précédent a laissé comme consigne */
        if(d.derniereNote){
          note = (note ? note + '\n\n' : '') + '📌 ' + d.derniereNote;
        }
      }else{
        note = '❓ Informations à renseigner : aucun cours enregistré pour ' +
               'cet élève.';
      }
    }catch(e){
      note = '❓ Informations à renseigner — dossier non lu.';
    }

    const r = await appelPrep({
      action: 'prepAdd',
      date: iso,
      eleve: eleve,
      modele: cle,
      modeleLabel: (typeof MODELES !== 'undefined' && MODELES[cle])
        ? MODELES[cle].label : '',
      site: (f && f.site) || '',
      /* L'heure en tête de note : « Mes prochains cours » et
         l'écran de l'accueil la lisent au même endroit. */
      note: (details && details.heure
              ? '🕐 ' + String(details.heure).replace(':', 'h') + '\n' : '') + note,
      contexte: contexte,
      moniteur: qui
    });

    /* Le véhicule et l'emplacement partent avec, pour l'affichage
       du bureau : sans ça, il fallait les ressaisir un par un. */
    if(details && (details.vehicule || details.lieu || details.heure)){
      try{
        await appelPrep({
          action: 'ecranLigneSet',
          idPrep: (r && r.id) || '',
          jour: iso,
          eleve: eleve,
          moniteur: qui,
          heure: details.heure || '',
          vehicule: details.vehicule || '',
          lieu: details.lieu || '',
          ordre: 0,
          par: ACCES.moniteur || ''
        });
      }catch(e){ console.warn('Détails d\'affichage non transmis :', e); }
    }

    showToast('Cours ajouté aux prochains cours de ' + qui + ' 📅' +
              (note ? '' : ' — infos à renseigner'));
  }catch(e){
    console.warn('Préparation non créée depuis le rappel :', e);
  }
}

/* Les libellés des rappels sont en caractères stylisés (𝗗𝗘𝗠𝗔𝗜𝗡) :
   la normalisation habituelle ne les ramène pas en lettres simples. */
function lettresSimples(texte){
  return String(texte || '').replace(/[\uD835][\uDC00-\uDFFF]/g, ch => {
    const p = ch.codePointAt(0) - 0x1D400;
    const bloc = Math.floor(p / 52);
    const reste = p % 52;
    /* Chaque bloc de 52 couvre A-Z puis a-z */
    return reste < 26
      ? String.fromCharCode(65 + reste)
      : String.fromCharCode(97 + reste - 26);
  });
}

/* « DEMAIN », « LUNDI »… devient une date ISO */
function dateDuRappel(jourTexte){
  const t = normaliserMot(lettresSimples(jourTexte || ''));
  const d = new Date();

  if(!t || /demain/.test(t)){ d.setDate(d.getDate() + 1); }
  else if(/aujourd/.test(t)){ /* aujourd'hui */ }
  else {
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi',
                   'jeudi', 'vendredi', 'samedi'];
    const cible = jours.findIndex(x => t.indexOf(x) !== -1);
    if(cible === -1) return '';
    /* Le prochain jour portant ce nom, jamais aujourd'hui */
    let n = (cible - d.getDay() + 7) % 7;
    if(n === 0) n = 7;
    d.setDate(d.getDate() + n);
  }

  const p = x => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-rappels.js'] = true;
