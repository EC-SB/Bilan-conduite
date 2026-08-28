/* Déployé le 28/08/2026 à 12:57 — v649 */
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
/* Charger ce qui manque, avec un second essai.

   Les fiches portent les numéros, les modèles portent les
   messages : sans l'un ou l'autre, l'écran ne sert à rien. */
async function chargerCeQuiManque(){
  const rates = [];

  const tenter = async (nom, charger, present) => {
    if(present()) return;

    for(let i = 0; i < 2; i++){
      try{
        await charger();
        if(present()) return;
      }catch(e){ /* on réessaie une fois */ }

      if(i === 0) await new Promise(r => setTimeout(r, 600));
    }

    rates.push(nom);
  };

  await Promise.all([
    tenter('les numéros des élèves',
           () => (typeof chargerFiches === 'function') ? chargerFiches() : null,
           () => typeof fichesEleves !== 'undefined' && fichesEleves.length),

    tenter('les modèles de message',
           () => (typeof chargerModelesTexte === 'function')
                   ? chargerModelesTexte() : null,
           () => typeof modelesTexte !== 'undefined' && modelesTexte.length)
  ]);

  return rates;
}


/* Le dire, plutôt que d'afficher un écran muet */
function blocChargementRate(manquants, relancer){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:14px;text-align:center;';

  d.innerHTML = '<div style="font-size:15px;font-weight:700;' +
      'color:var(--warn-text);margin-bottom:8px;">⚠️ Chargement incomplet</div>' +
    '<div style="font-size:13px;color:var(--muted);line-height:1.6;">' +
      'Impossible de charger ' + manquants.join(' et ') + '.<br>' +
      'Les rappels ne peuvent pas être préparés sans cela.</div>';

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-top:12px;padding:12px;font-size:13px;';
  b.textContent = '🔄 Réessayer';
  b.addEventListener('click', () => {
    /* Chaque écran se relance lui-même : le manuel et la liste
       ne montrent pas la même chose. */
    if(typeof relancer === 'function') relancer();
    else if(typeof afficherRappels === 'function') afficherRappels();
  });
  d.appendChild(b);

  return d;
}


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

  /* Un échec passait inaperçu : la liste revenait vide et l'écran
     s'affichait sans numéros ni modèles. Il fallait rafraîchir
     plusieurs fois sans savoir pourquoi. */
  const manquants = await chargerCeQuiManque();

  if(manquants.length){
    zone.innerHTML = '';
    zone.appendChild(blocChargementRate(manquants));
    return;
  }

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

      /* Ceux dont le planning ne nomme pas le moniteur ne créeront
         aucun cours. Une série entière pouvait ainsi partir sans
         rien préparer, en silence. */
      const sansQui = restants.filter(x => !String(x.moniteur || '').trim());
      if(sansQui.length && !await accepterSansMoniteur(sansQui.length)) return;

      bTous.disabled = true;
      let ok = 0, rates = [];
      for(let i = 0; i < restants.length; i++){
        const cr = restants[i];
        bTous.textContent = 'Envoi ' + (i + 1) + ' sur ' + restants.length + '…';
        try{
          await envoyerMessageComplet(cr.telephone, messageRappel(cr), cr.choisi || cr.eleve);
          cr.envoye = true;
          /* Chaque cours va au moniteur lu sur le planning */
          preparerDepuisRappel(cr.choisi || cr.eleve, cr.jour, cr.moniteur,
                               { type: cr.type ||
                                       (choixRappel && choixRappel.type) || '',
                                 titreType: titreDuType(cr.type ||
                                   (choixRappel && choixRappel.type)) });
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
      const qui = c.choisi || c.eleve;

      /* Le planning ne dit pas toujours qui fera le cours. Sans
         moniteur, rien ne sera préparé : on le dit avant l'envoi. */
      if(!String(c.moniteur || '').trim() &&
         !await accepterSansMoniteur(1)) return;

      /* L'écran rend la main tout de suite : l'envoi traverse le
         Worker puis Allo, et le bureau n'a rien à attendre pour
         passer au suivant. */
      a.disabled = true;
      a.textContent = '📤 Envoi…';
      c.envoye = true;

      /* Le cours rejoint les prochains cours du moniteur lu sur
         le planning */
      preparerDepuisRappel(qui, c.jour, c.moniteur,
                           { type: c.type ||
                                   (choixRappel && choixRappel.type) || '',
                             titreType: titreDuType(c.type ||
                               (choixRappel && choixRappel.type)) });

      envoyerMessageComplet(c.telephone, messageRappel(c), qui)
        .then(() => {
          showToast('✅ Envoyé à ' + qui);
          afficherRappels();
        })
        .catch(e => {
          /* Un échec doit se voir : sans cela, le bureau croirait
             l'élève prévenu. */
          c.envoye = false;
          showToast('⚠️ ' + qui + ' non prévenu : ' + e.message);
          a.disabled = false;
          a.textContent = '💬 Envoyer';
        });
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

/* ============================================================
   LA DATE DU COURS

   Le champ « Quand » dit « DEMAIN » ou « MARDI » ; l'élève, lui,
   comprend mieux « dimanche 23 août ». La date se déduit du choix
   et du jour où l'on écrit le rappel.
   ============================================================ */
const NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi',
                    'jeudi', 'vendredi', 'samedi'];
const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                   'juillet', 'août', 'septembre', 'octobre',
                   'novembre', 'décembre'];

function dateDuChoix(choix){
  /* Les libellés sont en caractères gras : on les ramène en
     lettres ordinaires pour les comparer. */
  const n = String(choix || '').normalize('NFKD')
    .replace(/[^A-Za-z']/g, '').toLowerCase();
  if(!n) return null;

  const d = new Date();
  d.setHours(12, 0, 0, 0);

  if(n.indexOf('aujourd') === 0) return d;
  if(n === 'demain'){ d.setDate(d.getDate() + 1); return d; }

  const cible = NOMS_JOURS.indexOf(n);
  if(cible === -1) return null;

  /* Le prochain jour de ce nom. Jamais aujourd'hui : « mardi »
     un mardi désigne le mardi suivant. */
  let ecart = (cible - d.getDay() + 7) % 7;
  if(ecart === 0) ecart = 7;
  d.setDate(d.getDate() + ecart);
  return d;
}

function dateEnLettres(d){
  if(!d) return '';
  return NOMS_JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + NOMS_MOIS[d.getMonth()];
}

function dateCourteDuChoix(d){
  if(!d) return '';
  return String(d.getDate()).padStart(2, '0') + '/' +
         String(d.getMonth() + 1).padStart(2, '0');
}


const JOURS_RAPPEL = ['𝗗𝗘𝗠𝗔𝗜𝗡', "𝗔𝗨𝗝𝗢𝗨𝗥𝗗'𝗛𝗨𝗜", '𝗟𝗨𝗡𝗗𝗜', '𝗠𝗔𝗥𝗗𝗜',
                      '𝗠𝗘𝗥𝗖𝗥𝗘𝗗𝗜', '𝗝𝗘𝗨𝗗𝗜', '𝗩𝗘𝗡𝗗𝗥𝗘𝗗𝗜', '𝗦𝗔𝗠𝗘𝗗𝗜', '𝗗𝗜𝗠𝗔𝗡𝗖𝗛𝗘'];

const EMPLACEMENTS = [
  { cle:'cour', texte:"𝗧𝗮 𝘃𝗼𝗶𝘁𝘂𝗿𝗲 𝘀𝗲𝗿𝗮 𝗱𝗮𝗻𝘀 𝗹𝗮 𝗰𝗼𝘂𝗿 𝗶𝗻𝘁𝗲́𝗿𝗶𝗲𝘂𝗿𝗲 𝗱𝗲 𝗹'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !" },
  { cle:'rue',  texte:'𝗧𝗮 𝘃𝗼𝗶𝘁𝘂𝗿𝗲 𝘀𝗲𝗿𝗮 𝗱𝗮𝗻𝘀 𝗹𝗮 𝗿𝘂𝗲 𝗹𝗲 𝗹𝗼𝗻𝗴 𝗱𝘂 𝘁𝗿𝗼𝘁𝘁𝗼𝗶𝗿 !' },
  /* Une séance qui ne commence pas dans une voiture : le message
     dit où se présenter, pas où est le véhicule. */
  { cle:'moto',      texte:'𝗧𝗮 𝗺𝗼𝘁𝗼 𝘁\'𝗮𝘁𝘁𝗲𝗻𝗱 𝗮̀ 𝗹\'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !' },
  { cle:'scooter',   texte:'𝗧𝗼𝗻 𝘀𝗰𝗼𝗼𝘁𝗲𝗿 𝘁\'𝗮𝘁𝘁𝗲𝗻𝗱 𝗮̀ 𝗹\'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !' },
  { cle:'bureau',    texte:'𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗮𝘂 𝗯𝘂𝗿𝗲𝗮𝘂 𝗱𝗲 𝗹\'𝗮𝘂𝘁𝗼-𝗲́𝗰𝗼𝗹𝗲 !' },
  { cle:'tablettes', texte:'𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗱𝗮𝗻𝘀 𝗹𝗮 𝘀𝗮𝗹𝗹𝗲 𝗱𝗲𝘀 𝘁𝗮𝗯𝗹𝗲𝘁𝘁𝗲𝘀 !' },
  { cle:'cours',     texte:'𝗥𝗲𝗻𝗱𝗲𝘇-𝘃𝗼𝘂𝘀 𝗱𝗮𝗻𝘀 𝗹𝗮 𝘀𝗮𝗹𝗹𝗲 𝗱𝗲 𝗰𝗼𝘂𝗿𝘀 !' },
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

/* Le titre lisible d'un type de rappel.

   Un type personnalisé a pour clé « perso:m17 » : elle ne dit
   rien du contenu. Le titre, lui, porte le sens — « Examen
   blanc », « Simulateur », « RDV préalable ». */
function titreDuType(cle){
  if(!cle) return '';
  const t = typesDisponibles().find(x => x.cle === cle);
  return (t && (t.titre || t.nom)) || String(cle);
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

  const empl = { texte: texteDuLieu(r.emplacement) };
  const mentions = (r.options || [])
    .map(cle => (OPTIONS_RAPPEL.find(x => x.cle === cle) || {}).texte)
    .filter(Boolean).join('\n\n');

  /* La date que désigne le choix, calculée depuis aujourd'hui */
  const quand = dateDuChoix(r.jour);

  return appliquerModele(type.contenu || '', {
    jour: r.jour || '',
    /* « dimanche 23 août » : ce que l'élève comprend */
    date: dateEnLettres(quand),
    datecourte: dateCourteDuChoix(quand),
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
/* Les véhicules de la flotte, chargés une fois. Un véhicule au
   garage ne doit pas être annoncé à un élève : on le montre barré
   plutôt que de le cacher, pour qu'on sache pourquoi il manque. */
let flotteRappel = null;

async function chargerFlotteRappel(){
  if(flotteRappel !== null) return flotteRappel;
  try{
    const d = await appelPrep({ action: 'flotteList' });
    flotteRappel = (d && d.vehicules) || [];
  }catch(e){ flotteRappel = []; }
  return flotteRappel;
}

async function remplirChoixVehicule(){
  const sel = $('rapVehicule');
  if(!sel) return;

  const liste = (await chargerFlotteRappel())
    .filter(v => v.etat !== 'vendu' && v.categorie !== 'remorque');

  if(!liste.length){
    sel.innerHTML = '<option value="">— aucun véhicule enregistré —</option>';
    return;
  }

  sel.innerHTML = '<option value="">— aucun —</option>' +
    liste.map(v => {
      const bloque = v.indisponible;
      return '<option value="' + String(v.nom).replace(/"/g, '&quot;') + '"' +
             (bloque ? ' disabled' : '') + '>' +
             (bloque ? '⛔ ' : '') + v.nom +
             (v.immat ? ' · ' + v.immat : '') +
             (bloque ? ' — ' + (v.motifIndispo || 'au garage') : '') +
             '</option>';
    }).join('') +
    /* Un véhicule de prêt n'est pas dans la flotte : on doit
       pouvoir l'annoncer quand même. */
    '<option value="autre">⌨️ Autre véhicule…</option>';

  /* Le dernier véhicule utilisé : on fait la journée d'un moniteur
     avant de passer au suivant, il ne change pas d'un élève à
     l'autre. */
  const memo = (choixRappel && choixRappel.vehicule) || '';
  if(memo){
    const encore = liste.find(v => v.nom === memo && !v.indisponible);
    if(encore) sel.value = memo;
  }
  majChampsVehicule();
}

/* Le champ caché que lisent le SMS et l'affichage */
function majChampsVehicule(){
  const sel = $('rapVehicule');
  const libre = $('rapVehLibre');
  if(!sel) return;

  if(sel.value === 'autre'){
    if(libre) libre.style.display = 'block';
    if($('rapVoiture')) $('rapVoiture').value = libre ? libre.value.trim() : '';
  }else{
    if(libre) libre.style.display = 'none';
    if($('rapVoiture')) $('rapVoiture').value = sel.value || '';
  }
  if($('rapMod')) $('rapMod').value = '';
}


/* La journée type d'un moniteur : c'est cet enchaînement qu'on
   suit en préparant les rappels d'une journée. */
/* L'entête d'une note de préparation : l'heure, puis ce que l'élève
   doit apporter. Ces repères se lisent d'un coup d'œil dans
   « Mes prochains cours ». */
function enTeteDeNote(details){
  if(!details) return '';

  const bouts = [];
  if(details.heure) bouts.push('🕐 ' + String(details.heure).replace(':', 'h'));

  const opts = details.options || [];
  if(opts.indexOf('ci') !== -1) bouts.push('🆔');
  if(opts.indexOf('sd') !== -1) bouts.push('💾');

  return bouts.length ? bouts.join(' ') + '\n' : '';
}


const HEURES_JOURNEE = ['08:00', '10:00', '13:00', '15:00', '17:00'];

/* Le créneau qui suit celui-ci dans la journée type */
function heureSuivante(h){
  const i = HEURES_JOURNEE.indexOf(h);
  if(i === -1 || i === HEURES_JOURNEE.length - 1) return '';
  return HEURES_JOURNEE[i + 1];
}

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

  /* Les modèles portent les messages : sans eux, l'écran annonce
     « aucun modèle enregistré » alors qu'ils existent. Ils
     n'étaient chargés que par l'autre écran. */
  zone.innerHTML = '<div class="empty">Chargement…</div>';

  const manquants = await chargerCeQuiManque();

  if(manquants.length){
    zone.innerHTML = '';
    zone.appendChild(blocChargementRate(manquants, afficherRappelManuel));
    return;
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
    '<div><label for="rapVehicule">Véhicule</label>' +
      '<select id="rapVehicule"><option value="">— chargement —</option></select>' +
      '<input type="text" id="rapVehLibre" placeholder="Lequel ?" ' +
        'style="display:none;margin-top:6px;">' +
      '<input type="hidden" id="rapVoiture">' +
      '<input type="hidden" id="rapMod">' +
    '</div>' +
    '<div><label for="rapEmpl">Où est la voiture</label>' +
      '<select id="rapEmpl"><option value="">Ne pas préciser</option></select></div>';
  zone.appendChild(grille2);

  /* La liste des emplacements, la même que dans l'affichage */
  const selEmpl = zone.querySelector('#rapEmpl');
  remplirListeLieux(selEmpl, (choixRappel && choixRappel.emplacement) || '', true);
  selEmpl.addEventListener('change', apercuRappel);

  const selVeh = zone.querySelector('#rapVehicule');
  if(selVeh){
    selVeh.addEventListener('change', () => {
      if(selVeh.value === 'autre'){
        setTimeout(() => { const l = $('rapVehLibre'); if(l) l.focus(); }, 60);
      }
      majChampsVehicule();
      apercuRappel();
    });
    const libre = zone.querySelector('#rapVehLibre');
    if(libre) libre.addEventListener('input', () => {
      majChampsVehicule();
      apercuRappel();
    });
    remplirChoixVehicule();
  }

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
  /* Les créneaux d'une journée type en tête, le reste en dessous :
     ce sont ceux-là qu'on cherche neuf fois sur dix. */
  listeH.innerHTML = '<option value="">— choisis l\'heure —</option>' +
    '<optgroup label="⭐ Journée type">' +
      HEURES_JOURNEE.map(h => '<option value="' + h + '">' +
                              h.replace(':', 'h') + '</option>').join('') +
    '</optgroup>' +
    '<optgroup label="Autres créneaux">' +
      CRENEAUX_RAPPEL.filter(h => HEURES_JOURNEE.indexOf(h) === -1)
        .map(h => '<option value="' + h + '">' +
                  h.replace(':', 'h') + '</option>').join('') +
    '</optgroup>' +
    '<option value="autre">⌨️ Autre heure…</option>';
  zone.appendChild(listeH);

  const chH = document.createElement('input');
  chH.type = 'time';
  chH.id = 'rapHeure';
  chH.style.cssText = 'display:none;margin-top:6px;';
  chH.addEventListener('change', apercuRappel);
  zone.appendChild(chH);

  /* Rien de choisi : on part sur le premier créneau du matin */
  if(!listeH.value && !chH.value){
    listeH.value = HEURES_JOURNEE[0];
    chH.value = HEURES_JOURNEE[0];
  }

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

  /* La liste des moniteurs.

     Elle se chargeait en silence : quand la lecture échouait — un
     réseau lent au petit matin suffit — le menu restait sur
     « ne pas créer le cours », personne n'était proposé, et TOUS
     les rappels de la matinée partaient sans créer de cours sans
     que rien ne le dise. On le dit maintenant, avec de quoi
     réessayer. */
  const remplirMoniteurs = async () => {
    aideMon.style.color = 'var(--muted)';
    aideMon.textContent = 'Lecture de la liste des moniteurs…';
    try{
      if(typeof chargerMoniteurs === 'function' &&
         (typeof moniteursActifs === 'undefined' || !moniteursActifs.length)){
        await chargerMoniteurs();
      }
      const liste = (typeof moniteursActifs !== 'undefined' ? moniteursActifs : []) || [];
      if(!liste.length) throw new Error('liste vide');

      selMon.innerHTML = '<option value="">— ne pas créer le cours —</option>' +
        liste.map(m => '<option value="' + String(m).replace(/"/g, '&quot;') + '">' +
                       m + '</option>').join('');
      /* Un moniteur qui utilise l'outil se propose lui-même */
      if(liste.indexOf(ACCES.moniteur) !== -1) selMon.value = ACCES.moniteur;

      aideMon.style.color = 'var(--muted)';
      aideMon.textContent = "Le cours apparaîtra dans « Mes prochains cours » du " +
        'moniteur choisi. Sans moniteur, le rappel part sans créer de cours.';
    }catch(e){
      aideMon.style.color = 'var(--warn-text)';
      aideMon.innerHTML = '⚠️ La liste des moniteurs n\'a pas pu être lue. ' +
        'Les rappels partiront <strong>sans créer de cours</strong>. ';
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:auto;padding:5px 10px;font-size:12px;margin:6px 0 0;';
      b.textContent = '🔄 Réessayer';
      b.addEventListener('click', () => remplirMoniteurs());
      aideMon.appendChild(b);
    }
  };
  remplirMoniteurs();

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
    voiture: $('rapVoiture') ? $('rapVoiture').value : '',
    vehicule: $('rapVoiture') ? $('rapVoiture').value : '',
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
    /* Un envoi de SMS traverse le Worker puis Allo : quarante
       secondes valent mieux que vingt, et un second essai
       rattrape une connexion qui vient de changer.

       Le SMS peut partir malgré l'abandon : mieux vaut attendre
       que de laisser le moniteur croire à un échec. */
  }, 40000, 2);

  const d = await r.json().catch(() => ({}));
  if(!r.ok || d.error){
    throw new Error(d.error || ('Le Worker a répondu ' + r.status +
      (r.status === 404 ? ' — route inconnue' : '')));
  }
  return d;
}


/* ============================================================
   PARTIR SANS CRÉER LE COURS

   Un rappel envoyé sans moniteur ne crée rien : ni cours dans
   « Mes prochains cours », ni ligne sur l'écran de l'accueil.
   C'est parfois voulu. Mais quand la liste des moniteurs n'a pas
   pu se charger, ça ne l'est pas — et une matinée entière de
   rappels partait sans que personne s'en aperçoive.

   La question n'est posée qu'une fois par écran : sur une série
   de quinze rappels, la reposer serait pire que le mal.
   ============================================================ */
let sansMoniteurAccepte = false;

async function accepterSansMoniteur(combien){
  if(sansMoniteurAccepte) return true;

  const ok = await confirmer(
    'Aucun moniteur choisi.\n\n' +
    (combien > 1 ? 'Les ' + combien + ' rappels partiront' : 'Le rappel partira') +
    " sans créer de cours : rien n'apparaîtra dans « Mes prochains " +
    "cours », ni sur l'écran de l'accueil.\n\n" +
    'Continuer quand même ?');

  if(ok) sansMoniteurAccepte = true;
  return ok;
}


/* ============================================================
   LE RÉPERTOIRE SE COMPLÈTE TOUT SEUL

   Un numéro tapé pour un rappel ne servait qu'une fois : le champ
   se vidait après l'envoi, et il fallait le retaper au cours
   suivant. On le range dans la fiche de l'élève.

   Rien ne se fait en silence quand il y a un doute : créer une
   fiche et remplacer un numéro se demandent. Le champ nom est
   libre — « Kevin » au lieu de « Kevin Martin » créerait un doublon
   que personne n'irait nettoyer.
   ============================================================ */

/* Deux écritures d'un même numéro : « 06 12 34 56 78 », « 0612345678 »,
   « +33612345678 ». Les comparer telles quelles ferait passer le même
   numéro pour un changement. */
function memeNumero(a, b){
  const propre = t => {
    let n = String(t || '').replace(/[^\d+]/g, '');
    if(/^\+33\d{9}$/.test(n)) n = '0' + n.slice(3);
    return n;
  };
  const x = propre(a), y = propre(b);
  return !!x && x === y;
}

async function completerFicheDepuisRappel(nom, numero){
  const propre = String(nom || '').trim();
  const tel = String(numero || '').trim();
  /* Un envoi à un numéro seul, sans nom : rien à ranger */
  if(propre.length < 3 || !tel) return;

  const f = (typeof ficheDe === 'function') ? ficheDe(propre) : null;

  if(!f){
    if(!await confirmer(
        'Créer la fiche de « ' + propre + ' » ?\n\n' +
        'Numéro : ' + telLisible(tel) + '\n\n' +
        'Vérifie l\'orthographe du nom : elle entrera telle quelle ' +
        'dans le répertoire des élèves.')) return;

  }else if(!f.telephone){
    /* Fiche connue mais sans numéro : on comble un vide, rien ne
       peut être perdu. Pas de question à poser. */

  }else if(memeNumero(f.telephone, tel)){
    return;                       /* déjà à jour, rien à faire */

  }else{
    if(!await confirmer(
        'Sa fiche indique ' + telLisible(f.telephone) + ',\n' +
        'le SMS est parti au ' + telLisible(tel) + '.\n\n' +
        'Mettre à jour sa fiche avec ce nouveau numéro ?')) return;
  }

  try{
    await appelPrep({ action: 'ficheSet', eleve: propre, telephone: tel });

    /* La fiche en mémoire suit tout de suite : sans cela, le rappel
       suivant au même élève redemanderait son numéro. */
    if(typeof fichesEleves !== 'undefined'){
      const f2 = (typeof ficheDe === 'function') ? ficheDe(propre) : null;
      if(f2) f2.telephone = tel;
      else fichesEleves.push({ eleve: propre, telephone: tel });
    }
    if(typeof fichesLues !== 'undefined') fichesLues = 0;

    showToast(f ? 'Numéro enregistré dans sa fiche ✅'
                : 'Fiche créée dans le répertoire ✅');
  }catch(e){
    /* Le SMS est parti : l'échec du rangement ne doit pas passer
       pour un échec d'envoi. */
    showToast('SMS envoyé, mais fiche non enregistrée : ' + e.message);
  }
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

  /* Sans moniteur, rien ne sera préparé. On le dit avant, pas après */
  if(!($('rapMoniteur') && $('rapMoniteur').value) &&
     !await accepterSansMoniteur(1)) return;

  b.disabled = true;
  b.textContent = 'Envoi…';
  try{
    const n = await envoyerMessageComplet(numero, texte, nom);
    b.textContent = '✅ Envoyé';
    direEtatEnvoi((n > 1 ? n + ' SMS envoyés' : 'SMS envoyé') +
                  ' au ' + telLisible(numero) + (nom ? ' — ' + nom : ''), false);
    showToast(n > 1 ? n + ' SMS envoyés ✅' : 'SMS envoyé ✅');

    /* Le numéro qui vient de servir rejoint le répertoire : sans
       cela il ne vivait que le temps de l'envoi, et il fallait le
       retaper au rappel suivant. */
    await completerFicheDepuisRappel(nom, numero);

    /* Le cours annoncé rejoint « Mes prochains cours » du moniteur */
    preparerDepuisRappel(nom, choixRappel && choixRappel.jour,
                         $('rapMoniteur') ? $('rapMoniteur').value : '',
                         {
                           /* Le type de séance décide du bilan : sans
                              lui, un examen blanc devenait un cours
                              de conduite ordinaire. */
                           type: (choixRappel && choixRappel.type) || '',
                           /* Vos types viennent des Textes types : leur
                              clé est « perso:xxx », qui ne dit rien.
                              C'est le titre qui porte le sens. */
                           titreType: titreDuType(choixRappel &&
                                                  choixRappel.type),
                           heure: $('rapHeure') ? $('rapHeure').value : '',
                           /* Ce que l'élève doit apporter : le moniteur
                              le voit dans ses prochains cours, sans
                              rouvrir le SMS. */
                           options: [...document.querySelectorAll('.optionRappel')]
                                      .filter(x => x.checked).map(x => x.value),
                           vehicule: $('rapVoiture') ? $('rapVoiture').value : '',
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
      /* Le véhicule reste : c'est le même moniteur, la même voiture
         toute la journée. Il se change à la main au moniteur suivant. */
      /* L'heure avance d'un cran dans la journée type : on prépare
         les rappels d'un moniteur les uns après les autres. Hors
         journée type, elle se vide comme avant. */
      const hEnvoyee = $('rapHeure') ? $('rapHeure').value : '';
      const suivante = heureSuivante(hEnvoyee);

      if(suivante){
        if($('rapHeure')) $('rapHeure').value = suivante;
        if($('rapHeureChoix')) $('rapHeureChoix').value = suivante;
      }else{
        if($('rapHeure')) $('rapHeure').value = '';
        if($('rapHeureChoix')) $('rapHeureChoix').value = '';
      }
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
    }else if(/réseau|network|délai|ne répond pas/i.test(texte)){
      aide = "Le SMS est peut-être parti quand même : vérifie sur " +
             "Messenger ou dans Allo avant de renvoyer.";
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
   RATTRAPER LES COURS DEPUIS LES RAPPELS ENVOYÉS

   Quand les rappels sont partis sans créer les cours — liste des
   moniteurs muette, moniteur oublié — tout n'est pas perdu : le
   journal SMS garde l'élève, l'heure d'envoi et le texte du
   message. On les relit, le bureau désigne qui fera quoi, et les
   cours se créent d'un coup.

   Volontairement manuel : on ne devine pas le moniteur, on le
   demande. C'est justement de l'avoir deviné en silence que vient
   le problème qu'on répare.
   ============================================================ */

/* L'heure du cours, lue dans le texte du rappel. Le message dit
   « 13h » ou « 13h30 » ; on prend la PREMIÈRE heure trouvée, celle
   du début du cours. Rien de sûr : le bureau corrige à l'écran. */
function heureDuMessage(message){
  const m = String(message || '').match(/\b([0-1]?\d|2[0-3])\s*h\s*([0-5]\d)?\b/);
  if(!m) return '';
  const hh = String(m[1]).padStart(2, '0');
  const mm = m[2] ? m[2] : '00';
  return hh + ':' + mm;
}

/* Les rappels d'un jour donné, un par élève : un élève prévenu
   deux fois ne doit pas donner deux cours. */
function rappelsDuJour(liste, jjmmaaaa){
  const vus = {};
  const out = [];
  (liste || []).forEach(x => {
    if(String(x.quand || '').indexOf(jjmmaaaa) !== 0) return;
    const nom = String(x.eleve || '').trim();
    if(nom.length < 3) return;
    const k = normaliserMot(nom);
    if(vus[k]) return;
    vus[k] = true;
    out.push({ eleve: nom, heure: heureDuMessage(x.message), quand: x.quand });
  });
  return out;
}

async function ouvrirRattrapageCours(liste){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 95vw);max-height:90vh;overflow-y:auto;';

  const auj = new Date().toLocaleDateString('fr-FR');
  const demain = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    const p = x => String(x).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  })();

  boite.innerHTML = '<h3>🔁 Rattraper les cours</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.5;">' +
      'Les élèves prévenus par SMS, repris du journal des envois. ' +
      'Désigne qui fera le cours et il rejoindra ses prochains cours, ' +
      'avec sa ligne sur l\'écran de l\'accueil.</div>' +

    '<label for="raJour">Rappels envoyés le</label>' +
    '<input type="text" id="raJour" value="' + auj + '" ' +
      'placeholder="jj/mm/aaaa">' +

    '<label for="raDate">Cours à créer pour le</label>' +
    '<input type="date" id="raDate" value="' + demain + '">' +

    '<label for="raTous">Tout attribuer à</label>' +
    '<select id="raTous"><option value="">— choisis un moniteur —</option></select>';

  const zListe = document.createElement('div');
  zListe.style.cssText = 'border-top:1px solid var(--line);margin-top:12px;padding-top:10px;';
  boite.appendChild(zListe);

  const msg = document.createElement('div');
  msg.style.cssText = 'font-size:13px;margin-top:8px;min-height:16px;line-height:1.5;';
  boite.appendChild(msg);

  const rangee = document.createElement('div');
  rangee.className = 'btn-row';
  rangee.style.marginTop = '10px';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Fermer';
  bAnn.addEventListener('click', () => document.body.removeChild(fond));
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '📅 Créer les cours';
  rangee.appendChild(bAnn); rangee.appendChild(bOk);
  boite.appendChild(rangee);

  fond.appendChild(boite);
  document.body.appendChild(fond);

  /* Les moniteurs, avec le même filet que l'écran de composition */
  const selTous = boite.querySelector('#raTous');
  try{
    if(typeof chargerMoniteurs === 'function' &&
       (typeof moniteursActifs === 'undefined' || !moniteursActifs.length)){
      await chargerMoniteurs();
    }
  }catch(e){}
  const moniteurs = (typeof moniteursActifs !== 'undefined' ? moniteursActifs : []) || [];
  if(!moniteurs.length){
    msg.style.color = 'var(--warn-text)';
    msg.textContent = '⚠️ La liste des moniteurs n\'a pas pu être lue. ' +
      'Ferme et réessaie dans un instant.';
  }
  const optionsMon = '<option value="">— aucun —</option>' +
    moniteurs.map(m => '<option value="' + String(m).replace(/"/g, '&quot;') + '">' +
                       m + '</option>').join('');
  selTous.innerHTML = '<option value="">— choisis un moniteur —</option>' +
    moniteurs.map(m => '<option value="' + String(m).replace(/"/g, '&quot;') + '">' +
                       m + '</option>').join('');

  const lignes = [];

  const dessiner = () => {
    const jour = boite.querySelector('#raJour').value.trim();
    const trouves = rappelsDuJour(liste, jour);
    lignes.length = 0;
    zListe.innerHTML = '';

    if(!trouves.length){
      zListe.innerHTML = '<div style="font-size:13px;color:var(--muted);">' +
        'Aucun rappel envoyé ce jour-là.</div>';
      return;
    }

    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);' +
      'margin-bottom:8px;';
    t.textContent = trouves.length + ' élève(s) prévenu(s)';
    zListe.appendChild(t);

    trouves.forEach(r => {
      const d = document.createElement('div');
      d.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;' +
        'padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;';
      d.appendChild(cb);

      const n = document.createElement('span');
      n.style.cssText = 'flex:1;min-width:120px;font-size:14px;';
      n.textContent = r.eleve;
      d.appendChild(n);

      const h = document.createElement('input');
      h.type = 'time';
      h.value = r.heure || '';
      h.style.cssText = 'width:auto;margin:0;padding:6px 8px;font-size:13px;flex-shrink:0;';
      d.appendChild(h);

      const s = document.createElement('select');
      s.innerHTML = optionsMon;
      s.style.cssText = 'width:auto;margin:0;padding:6px 8px;font-size:13px;min-width:110px;';
      d.appendChild(s);

      zListe.appendChild(d);
      lignes.push({ eleve: r.eleve, cb: cb, heure: h, sel: s });
    });
  };

  boite.querySelector('#raJour').addEventListener('change', dessiner);
  selTous.addEventListener('change', () => {
    lignes.forEach(l => { l.sel.value = selTous.value; });
  });
  dessiner();

  bOk.addEventListener('click', async () => {
    const iso = boite.querySelector('#raDate').value;
    if(!iso){ msg.style.color = 'var(--warn-text)';
              msg.textContent = 'Choisis la date des cours.'; return; }

    const aFaire = lignes.filter(l => l.cb.checked && l.sel.value);
    if(!aFaire.length){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Aucun cours à créer : coche des élèves et désigne un moniteur.';
      return;
    }

    const sansQui = lignes.filter(l => l.cb.checked && !l.sel.value).length;
    if(sansQui && !await confirmer(
        sansQui + ' élève(s) coché(s) sans moniteur seront ignorés.\n\n' +
        'Créer les ' + aFaire.length + ' autres cours ?')) return;

    bOk.disabled = true;
    let faits = 0;
    const rates = [];
    /* Ceux qui n'ont rien donné : cours déjà là, formation sans
       bilan… On les nomme plutôt que de les compter en réussites. */
    const deja = [];
    for(let i = 0; i < aFaire.length; i++){
      const l = aFaire[i];
      bOk.textContent = 'Création ' + (i + 1) + ' sur ' + aFaire.length + '…';
      try{
        /* Le même chemin que l'envoi d'un rappel : mêmes règles,
           même contexte, même ligne d'écran. Refaire un chemin
           parallèle, c'est se garantir deux comportements. */
        const ok = await preparerDepuisRappel(l.eleve, iso, l.sel.value,
                                             { heure: l.heure.value || '' });
        if(ok) faits++;
        else deja.push(l.eleve);
      }catch(e){ rates.push(l.eleve + ' : ' + e.message); }
    }

    bOk.disabled = false;
    bOk.textContent = '📅 Créer les cours';
    msg.style.color = rates.length ? 'var(--warn-text)' : 'var(--accent-text)';
    msg.textContent = faits + ' cours créé(s)' +
      (deja.length ? ' · ' + deja.length + ' sans effet (déjà présent, ou ' +
                     'formation sans bilan) : ' + deja.join(' · ') : '') +
      (rates.length ? ' · ' + rates.length + ' échec(s) : ' + rates.join(' · ') : '');
    if(typeof afficherPrepares === 'function') afficherPrepares();
  });
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

    /* De quoi rattraper des cours que les rappels n'auraient pas
       créés. Placé ici : c'est le seul écran qui sait qui a été
       prévenu, et c'est là qu'on vient quand quelque chose manque. */
    const bRat = document.createElement('button');
    bRat.className = 'btn btn-secondary';
    bRat.style.cssText = 'width:100%;padding:10px;font-size:13px;margin-bottom:10px;';
    bRat.textContent = '🔁 Rattraper les cours depuis ces rappels';
    bRat.title = 'Créer les cours des élèves prévenus, sans renvoyer de SMS';
    bRat.addEventListener('click', () => ouvrirRattrapageCours(liste));
    zone.appendChild(bRat);

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
/* ============================================================
   LE BILAN QUI VA AVEC LA SÉANCE

   Chaque type de rappel appelle un bilan précis. Ce qui n'est
   pas listé garde le bilan de conduite automatique — le plus
   courant — et le moniteur le change d'un geste si besoin.
   ============================================================ */
const BILAN_DU_RAPPEL = {
  /* Les cours de conduite, par site */
  cours:            'conduite-auto',
  'cours-sb':       'conduite-auto',
  'cours-loudeac':  'conduite-auto',

  simulateur:       'simu-auto',

  /* La passerelle se fait en boîte manuelle */
  passerelle:       'conduite-manuelle',
  'passerelle-jj':  'conduite-manuelle',

  accompagnateur:   'formation-accompagnateur',
  'rdv-accompagnateur': 'formation-accompagnateur',

  prealable:        'rdv-prealable-auto',
  'rdv-prealable':  'rdv-prealable-auto',

  permis:           'examen-officiel',
  'rappel-permis':  'examen-officiel',

  examblanc:        'examen-blanc',
  'examen-blanc':   'examen-blanc'
};

function modeleDuTypeDeRappel(type){
  const t = normaliserMot(String(type || ''));
  if(!t) return '';

  /* Le type exact d'abord */
  if(BILAN_DU_RAPPEL[t]) return verifierModele(BILAN_DU_RAPPEL[t]);

  /* À défaut, ce que le libellé raconte */
  if(t.indexOf('simu') !== -1) return verifierModele('simu-auto');
  if(t.indexOf('passerelle') !== -1) return verifierModele('conduite-manuelle');
  if(t.indexOf('accompagnateur') !== -1) return verifierModele('formation-accompagnateur');
  if(t.indexOf('prealable') !== -1) return verifierModele('rdv-prealable-auto');
  if(t.indexOf('blanc') !== -1) return verifierModele('examen-blanc');
  if(t.indexOf('permis') !== -1) return verifierModele('examen-officiel');
  if(t.indexOf('cours') !== -1) return verifierModele('conduite-auto');

  return '';
}

/* Un modèle qui n'existe pas ferait un bilan vide : mieux vaut
   laisser le choix par défaut. */
function verifierModele(cle){
  if(typeof MODELES === 'undefined') return cle;
  return MODELES[cle] ? cle : '';
}

/* ============================================================
   LA SÉANCE DIT QUEL BILAN, LA FORMATION DIT QUELLE BOÎTE

   Ce sont deux questions distinctes, et elles étaient confondues :
   le type de séance écrasait la boîte déduite de la fiche, et tout
   élève en boîte manuelle repartait sur un bilan automatique dès
   que sa séance était nommée — c'est-à-dire presque toujours.
   ============================================================ */

/* Les modèles vont par paires « -auto » / « -manuelle » : conduite,
   AAC, rendez-vous préalable, simulateur, évaluation. La paire se
   déduit du nom plutôt que d'une seconde liste à tenir d'accord
   avec MODELES. Un modèle sans paire est rendu tel quel. */
function modeleDansLaBoite(cle, manuelle){
  if(!cle) return cle;
  const paire = manuelle ? cle.replace(/-auto$/, '-manuelle')
                         : cle.replace(/-manuelle$/, '-auto');
  return (paire !== cle && verifierModele(paire)) ? paire : cle;
}

/* La passerelle est la seule séance qui décide elle-même de la
   boîte : on y vient justement apprendre la manuelle, quelle que
   soit la formation encore inscrite sur la fiche. Partout ailleurs,
   c'est la formation de l'élève qui tranche. */
function seanceImposeLaBoite(type){
  return normaliserMot(String(type || '')).indexOf('passerelle') !== -1;
}


/* Renvoie true si un cours a bien été créé. Les appels d'origine
   ignorent la réponse ; le rattrapage, lui, compte ce qui a marché
   plutôt que d'annoncer des cours qui n'existent pas. */
async function preparerDepuisRappel(eleve, jourTexte, moniteur, details){
  if(!eleve || eleve.length < 3) return false;

  /* Sans moniteur désigné, on ne crée rien : un cours attribué au
     hasard encombrerait la liste de quelqu'un qui ne le fera pas. */
  const qui = String(moniteur || '').trim();
  if(!qui) return false;

  const iso = dateDuRappel(jourTexte);
  if(!iso) return false;

  try{
    /* Rien à faire si elle existe déjà */
    const d = await appelPrep({ action: 'prepList' });
    const liste = (d && d.preparations) || [];
    const deja = liste.some(x =>
      normaliserMot(x.eleve || '') === normaliserMot(eleve) && x.date === iso);
    if(deja) return false;

    /* La boîte de l'élève décide du type de bilan. Sans indication —
       fiche vide, élève tout neuf — on part sur l'automatique :
       c'est le cas le plus courant, et le moniteur corrige d'un
       geste si besoin. */
    const f = (typeof ficheDe === 'function') ? ficheDe(eleve) : null;
    const formation = String((f && f.formation) || '').trim();

    /* Moto, remorque, cyclo : le bilan de conduite n'existe pas
       encore pour ces formations. Le rappel part quand même, mais
       on ne crée pas un cours qu'on ne saurait pas remplir. */
    if(typeof formationVoiture === 'function' && !formationVoiture(formation)){
      showToast('Rappel envoyé — pas de bilan pour cette formation ' +
                '(' + formation + ')');
      return false;
    }

    const manuelle = /manuel|\bbv\b|b[oô]ite m/i.test(formation);
    let cle = manuelle ? 'conduite-manuelle' : 'conduite-auto';

    /* Le type de séance dit de quelle séance il s'agit — simulateur,
       rendez-vous préalable, examen — mais pas dans quelle boîte :
       ça, c'est la fiche de l'élève qui le sait. On garde donc le
       modèle imposé par la séance, dans la boîte de l'élève.
       Le titre d'abord : la clé ne sert que pour les types d'origine. */
    const typeSeance = (details && details.titreType) ||
                       (details && details.type) || '';
    const impose = modeleDuTypeDeRappel(typeSeance);
    if(impose){
      cle = seanceImposeLaBoite(typeSeance)
              ? impose
              : modeleDansLaBoite(impose, manuelle);
    }

    /* Le dossier de l'élève, pour que le moniteur n'ait pas à tout
       ressaisir : numéro de leçon, frise, note du cours précédent.
       Sans cours antérieur, la fiche reste à remplir. */
    let note = '';
    let contexte = '';
    try{
      /* Le dossier enrichit le cours, il ne le conditionne pas :
         au-delà de six secondes on crée le cours sans lui plutôt
         que de faire attendre le moniteur qui enchaîne. */
      const d = await Promise.race([
        chargerDossierEleve(eleve),
        new Promise(r => setTimeout(() => r(null), 6000))
      ]);
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
      note: enTeteDeNote(details) + note,
      contexte: contexte,
      moniteur: qui
    });

    /* Le cours a-t-il bien été créé ? Un enchaînement rapide de
       rappels pouvait en perdre un en silence. */
    if(!r || (!r.id && r.status !== 'ok')){
      throw new Error('Le cours n\'a pas été enregistré.');
    }

    /* La liste en mémoire suit tout de suite : le moniteur voit
       son cours sans attendre le prochain rafraîchissement. */
    try{
      if(typeof prepares !== 'undefined'){
        const dedans = prepares.some(x => String(x.id) === String(r.id));
        if(!dedans){
          prepares.push({
            id: (r && r.id) || ('tmp' + Date.now()),
            eleve: eleve, date: iso, modele: cle,
            modeleLabel: (typeof MODELES !== 'undefined' && MODELES[cle])
              ? MODELES[cle].label : '',
            site: (f && f.site) || '',
            note: enTeteDeNote(details) + note,
            contexte: contexte,
            moniteur: qui
          });
        }
      }
      if(typeof afficherPrepares === 'function') afficherPrepares();
    }catch(e){ /* l'affichage se rattrapera au rafraîchissement */ }

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
    return true;
  }catch(e){
    console.warn('Préparation non créée depuis le rappel :', e);

    /* Le moniteur doit le savoir : sans cours préparé, il
       découvrirait le manque devant l'élève. */
    if(typeof showToast === 'function'){
      showToast('⚠️ Cours NON créé pour ' + eleve +
                ' — refais le rappel ou ajoute-le à la main');
    }
    return false;
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
  /* Une date déjà écrite en clair se garde telle quelle : le
     rattrapage depuis le journal SMS en fournit une, et la faire
     passer par les noms de jours ne rendait rien. */
  const brut = String(jourTexte || '').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(brut)) return brut;

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
