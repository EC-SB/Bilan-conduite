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


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-rappels.js'] = true;
