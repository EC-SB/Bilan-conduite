/* Déployé le 30/10/2026 à 16:48 — v1314 */
/* ============================================================
   📝 « TU DOIS FAIRE TON BILAN » — v1314

   David, le 30 octobre : « sur les bilans classique boîte automatique,
   boîte manuelle, AAC boîte automatique et AAC boîte manuelle, ajoute en
   bas un bouton Tu dois faire ton bilan. Il faut que ça valide le cours
   directement, même si c'est un vocal dans lequel il n'y a rien — pas de
   blocage pas assez de mots. Dans son dossier élève, dans l'historique,
   on voit qu'il a demandé que l'élève fasse son bilan, et on peut coller
   dedans ce qu'il a écrit. Il reçoit comme mail de cours : Tu dois faire
   toi-même ton bilan de cours et nous l'envoyer sur Messenger, avec le
   squelette du bilan manuel. »

   Ses réponses au schéma :
   · pas de lien Messenger dans le mail (ils savent) ;
   · une note interne 📌 dans la fenêtre ;
   · le texte du mail tel que montré ;
   · la trame aussi dans sa messagerie de l'appli (fil « Le bureau ») ;
   · tout le monde peut coller son bilan ;
   · un réglage où il active ou non Messenger / messagerie / espace
     révisions, pour dire à l'élève où le faire. L'espace révisions est
     PRÉPARÉ (le réglage existe) mais pas encore proposé à l'élève : il
     attend son schéma (l'élève le remplit, il part au moniteur dans la
     messagerie, le moniteur corrige et valide, il remonte dans
     l'historique).

   ⚠️ LE COURS PASSE PAR LE MÊME CHEMIN QU'UN BILAN NORMAL. À la main :
   genererBilanManuel (questionnaire de fin, heures, trajet), dont le
   texte est remplacé par celui-ci. À l'oral : les gestes du bouton rouge
   (micro coupé, trajet clos, questionnaire), sans génération. Puis
   l'enregistrement de toujours (exporterVersSheets) : l'historique, la
   carte de « Mes prochains cours », la frise — rien de neuf à brancher.

   ⚠️ LE TEXTE ENREGISTRÉ EST LE MAIL. C'est lui que l'historique
   reconnaît (MARQUE_BE), et lui qu'on renverrait avec ✉️.
   ============================================================ */
const BE_MODELES = ['conduite-auto', 'conduite-manuelle', 'aac-auto', 'aac-manuelle'];
const MARQUE_BE = 'tu dois faire toi-même ton bilan de cours';
const SEP_SON_BILAN_BE = '📥 SON BILAN — collé par ';

function echBE(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function modeleBEOk(cle){ return BE_MODELES.indexOf(String(cle || '')) !== -1; }
function estBilanParLEleve(texte){ return String(texte || '').toLowerCase().indexOf(MARQUE_BE) !== -1; }

/* ── le réglage : où l'élève le fait ── */
function reglageBE(){
  const m = (typeof modelesTexte !== 'undefined' && modelesTexte || []).find(x => x.usage === 'reglage_bilan_eleve');
  let r = {};
  try{ r = m ? (JSON.parse(m.contenu) || {}) : {}; }catch(e){ r = {}; }
  return { messenger: r.messenger !== false, messagerie: r.messagerie !== false, revisions: !!r.revisions };
}
async function poserReglageBE(r){
  const m = (modelesTexte || []).find(x => x.usage === 'reglage_bilan_eleve');
  const contenu = JSON.stringify({ messenger: !!r.messenger, messagerie: !!r.messagerie, revisions: !!r.revisions });
  const rep = await appelPrep({ action: 'modeleSet', id: m ? m.id : '', usage: 'reglage_bilan_eleve',
                                nom: 'Réglage — bilan fait par l’élève', contenu: contenu });
  if(rep && rep.status === 'error') throw new Error(rep.message);
  if(m) m.contenu = contenu;
  else modelesTexte.push({ id: (rep && rep.id) || '', usage: 'reglage_bilan_eleve', nom: 'Réglage — bilan fait par l’élève', contenu: contenu });
}
/* Ce que le mail dit : « sur Messenger », « ou dans ta messagerie… ».
   L'espace révisions n'y est pas encore (voir l'en-tête). */
function ouLeFaireBE(r){
  const l = [];
  if(r.messenger) l.push('sur Messenger');
  if(r.messagerie) l.push('dans ta messagerie de l’appli (« Le bureau »)');
  if(!l.length) l.push('sur Messenger');
  return l.length === 1 ? l[0] : l.slice(0, -1).join(', ') + ' ou ' + l[l.length - 1];
}

/* ── le texte : le mail, et ce qui s'enregistre ── */
function ficheDuModeleBE(cle){
  const B = (typeof BLOC !== 'undefined') ? BLOC : {};
  if(cle === 'aac-auto') return B.ficheListeAacAuto || [];
  if(cle === 'aac-manuelle') return B.ficheListe || [];
  return B.ficheListeConduite || B.ficheListe || [];
}
function texteBilanParLEleve(o){
  const r = reglageBE();
  const prenom = String(o.eleve || '').trim().split(/\s+/)[0] || '';
  const jour = (typeof dateEnToutesLettres === 'function' && o.date) ? (dateEnToutesLettres(o.date) || o.date) : (o.date || '');
  const label = ((typeof MODELES !== 'undefined' && MODELES[o.modele]) || {}).label || '';
  const ou = ouLeFaireBE(r);
  const seulMessenger = r.messenger && !r.messagerie;
  const themes = (typeof THEMES_ERREURS !== 'undefined' ? THEMES_ERREURS : []).map(t => t.nom);
  const L = [];
  L.push('Bonjour ' + prenom + ',');
  L.push('');
  L.push('Aujourd’hui, tu dois faire toi-même ton bilan de cours et nous l’envoyer ' + ou + ' ✍️');
  L.push('C’est le meilleur moyen de vérifier que tu as bien compris ce qui a été travaillé. Remplis chaque catégorie ci-dessous avec tes mots (ce que tu as réussi, tes erreurs, ce qu’il faut retravailler), puis ' +
    (seulMessenger ? 'copie-colle le tout dans un message Messenger à Évolution Conduites.' : 'envoie-le nous ' + ou + '.'));
  L.push('');
  L.push('✂️ ─────── TON BILAN À REMPLIR ───────');
  L.push('');
  L.push('👋 MON BILAN DE CONDUITE — ' + jour + (o.moniteur ? ', avec ' + o.moniteur : '') + (label ? ' (' + label + ')' : ''));
  L.push('');
  L.push('𝘾𝙖𝙧𝙩𝙚 𝙎𝘿 : je l’ai regardée ✅❌');
  L.push('𝙄𝙣𝙨𝙩𝙖𝙡𝙡𝙖𝙩𝙞𝙤𝙣 ✅❌   𝙋𝙖𝙨𝙨𝙖𝙜𝙚𝙧 ✅❌   𝙑𝙤𝙮𝙖𝙣𝙩𝙨 ✅❌');
  L.push('');
  L.push('🧠 MES ERREURS DE CE JOUR :');
  themes.forEach(t => { L.push(t + ' :'); L.push(''); });
  L.push('🦉 LES MANŒUVRES QUE J’AI TRAVAILLÉES (garde seulement celles que tu as faites) :');
  ficheDuModeleBE(o.modele).forEach(x => L.push(x));
  L.push('');
  L.push('➡️ CE QUE JE DOIS RETRAVAILLER AU PROCHAIN COURS :');
  L.push('');
  L.push('✂️ ───────────────────────────────');
  L.push('');
  L.push('À très vite !');
  L.push('L’équipe Évolution Conduites');
  return L.join('\n');
}
function sujetBE(dateIso){
  const m = String(dateIso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return 'Ton bilan de cours du ' + (m ? m[3] + '/' + m[2] : '') + ' — à faire toi-même ✍️ — Évolution Conduites';
}

/* ── la fenêtre : la note interne, et (admin) le réglage ── */
function fenetreBE(eleve){
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const md = document.createElement('div');
    md.className = 'modal';
    md.id = 'fenetreBilanEleve';
    md.style.maxWidth = 'min(460px, 94vw)';
    const r = reglageBE();
    const prenom = String(eleve || '').trim().split(/\s+/)[0] || 'l’élève';
    md.innerHTML = '<h3>📝 Tu dois faire ton bilan</h3>' +
      '<div style="font-size:15px;line-height:1.6;margin-bottom:10px;">C’est ' + echBE(eleve) + ' qui fait son bilan ?</div>' +
      '<div class="beListe" style="font-size:14px;line-height:1.55;margin-bottom:12px;">' +
        '✅ Le cours est validé tout de suite (pas de bilan à composer, aucun minimum de mots).<br>' +
        '✉️ ' + echBE(prenom) + ' reçoit « Tu dois faire toi-même ton bilan de cours » avec la trame à remplir' +
        (r.messagerie ? ', aussi dans sa messagerie de l’appli' : '') + '.<br>' +
        '📚 Dans son dossier › Cours : « 📝 Bilan à faire par l’élève », avec une case pour coller ce ' + (/^[aeiouyhâàéèêëîïôöûü]/i.test(prenom) ? 'qu’' : 'que ') + echBE(prenom) + ' a écrit.</div>' +
      '<label for="beNote" style="margin:0 0 4px;">📌 Note interne (pour le moniteur suivant)</label>';
    const ta = document.createElement('textarea');
    ta.id = 'beNote';
    ta.rows = 3;
    ta.placeholder = 'Facultatif';
    ta.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);color:var(--cream);' +
      'padding:9px 10px;border-radius:10px;font-size:15px;line-height:1.5;font-family:inherit;resize:vertical;margin:0 0 12px;';
    ta.value = ($('noteInterne') && $('noteInterne').value) || '';
    md.appendChild(ta);

    if(typeof ACCES !== 'undefined' && ACCES && ACCES.role === 'admin'){
      const d = document.createElement('details');
      d.className = 'beReglage';
      d.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:8px 11px;margin-bottom:12px;';
      d.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:700;">⚙️ Où l’élève fait son bilan</summary>' +
        '<div style="font-size:11px;color:var(--muted);margin:6px 0;">Pour tous les élèves. Le mail lui dit où le faire.</div>';
      [['messenger', '💬 Messenger'], ['messagerie', '📱 Sa messagerie de l’appli (« Le bureau ») — la trame y est aussi envoyée'],
       ['revisions', '📚 Son espace révisions — bientôt (attend son schéma)']].forEach(([k, lab]) => {
        const l = document.createElement('label');
        l.style.cssText = 'display:flex;gap:8px;align-items:center;font-size:14px;text-transform:none;color:var(--cream);margin:6px 0;';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.setAttribute('data-k', k); cb.checked = !!r[k];
        cb.style.cssText = 'width:18px;height:18px;margin:0;';
        if(k === 'revisions'){ cb.disabled = true; l.style.opacity = '.6'; }
        cb.addEventListener('change', async () => {
          const neuf = reglageBE(); neuf[k] = cb.checked;
          cb.disabled = true;
          try{ await poserReglageBE(neuf); if(typeof showToast === 'function') showToast('Réglage enregistré ✅'); }
          catch(e){ cb.checked = !cb.checked; if(typeof showToast === 'function') showToast('Impossible : ' + e.message); }
          finally{ cb.disabled = (k === 'revisions'); }
        });
        l.appendChild(cb); l.appendChild(document.createTextNode(lab));
        d.appendChild(l);
      });
      md.appendChild(d);
    }

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';
    const bR = document.createElement('button');
    bR.className = 'btn btn-secondary'; bR.textContent = 'Revenir';
    const bV = document.createElement('button');
    bV.className = 'btn btn-primary'; bV.textContent = '📝 Valider et lui envoyer';
    bR.addEventListener('click', () => { fermerFond(fond); resolve(null); });
    bV.addEventListener('click', () => { fermerFond(fond); resolve({ note: ta.value.trim() }); });
    rangee.append(bR, bV);
    md.appendChild(rangee);
    fond.appendChild(md);
    document.body.appendChild(fond);
  });
}

/* ── la fin, commune aux deux chemins : enregistrer, envoyer, accueil ── */
async function finirBilanParLEleve(eleve, texte, dateIso){
  const ok = await exporterVersSheets(true);
  if(!ok){
    await informer('Le cours n’est PAS enregistré. Vérifie ta connexion, puis appuie sur « 📋 Copier, enregistrer et terminer ».', '⚠️ Pas enregistré');
    return false;
  }
  const dit = ['✅ Cours validé : ' + eleve + ' fera son bilan.'];
  try{
    const n = await envoyerBilanParMail(eleve, dateIso, texte, { sujet: sujetBE(dateIso) });
    dit.push(n ? '✉️ Mail envoyé (' + n + ' adresse' + (n > 1 ? 's' : '') + ').' : '✉️ Mail non envoyé : pas d’adresse.');
  }catch(e){ dit.push('⚠️ Mail non envoyé : ' + e.message); }
  if(reglageBE().messagerie){
    try{
      const r = await appelPrep({ action: 'bilanEleveMessagerie', eleve: eleve, texte: texte });
      dit.push(r && r.status === 'ok' ? '💬 La trame est aussi dans sa messagerie.' : '💬 ' + ((r && r.message) || 'Pas envoyé dans sa messagerie.'));
    }catch(e){ dit.push('💬 Pas envoyé dans sa messagerie : ' + e.message); }
  }
  await fenetre(dit.join('\n'), [{ nom: '🏠 Accueil', valeur: true, principal: true }], '📝 Bilan à faire par l’élève');
  if(typeof terminerCours === 'function') terminerCours();
  return true;
}

/* ── à la main : le chemin de « Composer le bilan », texte remplacé ── */
async function bilanParLEleveManuel(){
  const eleve = ($('studentName') && $('studentName').value.trim()) || '';
  if(!eleve){ showToast('Saisis le nom de l’élève.'); return; }
  const modele = $('modele').value;
  if(!modeleBEOk(modele)) return;
  const choix = await fenetreBE(eleve);
  if(!choix) return;
  if($('noteInterne')) $('noteInterne').value = choix.note;
  const dateIso = $('lessonDate').value;
  const texte = texteBilanParLEleve({ eleve: eleve, date: dateIso, moniteur: $('monitorName').value.trim(), modele: modele });
  window.bilanParLEleveEC = { texte: texte };
  try{ await genererBilanManuel(); }
  finally{ window.bilanParLEleveEC = null; }
  /* Renoncé en route (trajet, erreur) : rien n'est enregistré */
  if(!$('resultView') || $('resultView').style.display !== 'block' || $('resultText').value !== texte) return;
  await finirBilanParLEleve(eleve, texte, dateIso);
}

/* ── à l'oral : les gestes du bouton rouge, sans génération ── */
async function bilanParLEleveOral(){
  const eleve = ($('studentName') && $('studentName').value.trim()) || '';
  if(!eleve){ showToast('Saisis le nom de l’élève.'); return; }
  const modeleCle = $('modele').value;
  if(!modeleBEOk(modeleCle)) return;
  const choix = await fenetreBE(eleve);
  if(!choix) return;
  if(typeof isRecording !== 'undefined' && isRecording){
    try{ recognition.stop(); }catch(e){}
    arreterUI();
  }
  if(typeof libererEcran === 'function') libererEcran();
  if(typeof arreterTrajet === 'function') arreterTrajet();
  if($('noteInterne')) $('noteInterne').value = choix.note;
  /* Le questionnaire de fin, comme au bouton rouge : les heures, la suite */
  const maj = await ouvrirQuestionnaireDepart(contexteDepart, 'Après ce cours', 'Terminer');
  if(maj){
    contexteDepart = maj;
    if(maj.heuresRemontees !== undefined && typeof remonterHeuresAuBureau === 'function'){
      const noteDuJour = noteDepuisQuestionnaire(maj);
      await remonterHeuresAuBureau(eleve, maj.heuresRemontees, niveauDepuisLaSuite(maj.ebPasse),
                                   false, maj.heuresDuJour, noteDuJour, maj.heuresDepuisRang, maj.heuresRangJour);
    }
    appliquerNoteQuestionnaire(noteDepuisQuestionnaire(maj));
  }
  const dateIso = $('lessonDate').value;
  const texte = texteBilanParLEleve({ eleve: eleve, date: dateIso, moniteur: $('monitorName').value.trim(), modele: modeleCle });
  currentLessonMeta = {
    modeleLabel: (MODELES[modeleCle] || {}).label || '',
    studentName: eleve,
    monitorName: $('monitorName').value.trim(),
    site: $('site').value,
    dateStr: dateIso,
    noteInterne: ($('noteInterne') && $('noteInterne').value.trim()) || '',
    ts: Date.now()
  };
  $('resultText').value = texte;
  afficherNote(currentLessonMeta.noteInterne);
  marquerExport(false);
  $('resultView').style.display = 'block';
  await finirBilanParLEleve(eleve, texte, dateIso);
}

/* ── les deux boutons ── */
function poserBoutonsBE(){
  if($('manuelGen') && !$('faireSonBilanManuel')){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary btnFaireSonBilan';
    b.id = 'faireSonBilanManuel';
    b.type = 'button';
    b.textContent = '📝 Tu dois faire ton bilan';
    b.style.display = 'none';
    b.addEventListener('click', async () => {
      b.disabled = true;
      try{ await bilanParLEleveManuel(); }
      catch(e){ console.error(e); await informer('Ça n’a pas pu se faire.\n\nDétail : ' + (e && e.message ? e.message : e), 'Erreur'); }
      finally{ b.disabled = false; }
    });
    $('manuelGen').after(b);
  }
  if($('finishBtn') && !$('faireSonBilanOral')){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary btnFaireSonBilan';
    b.id = 'faireSonBilanOral';
    b.type = 'button';
    b.textContent = '📝 Tu dois faire ton bilan';
    b.style.display = 'none';
    b.addEventListener('click', async () => {
      b.disabled = true;
      try{ await bilanParLEleveOral(); }
      catch(e){ console.error(e); await informer('Ça n’a pas pu se faire.\n\nDétail : ' + (e && e.message ? e.message : e), 'Erreur'); }
      finally{ b.disabled = false; }
    });
    $('finishBtn').after(b);
  }
  majBoutonsBE();
  /* Les deux zones s'ouvrent et se ferment ailleurs : on suit leur style */
  const suivre = el => { if(el && typeof MutationObserver === 'function') new MutationObserver(majBoutonsBE).observe(el, { attributes: true, attributeFilter: ['style'] }); };
  suivre($('manuelView')); suivre($('finishBtn'));
  if($('modele')) $('modele').addEventListener('change', majBoutonsBE);
}
function majBoutonsBE(){
  const ok = modeleBEOk($('modele') && $('modele').value);
  const bm = $('faireSonBilanManuel'), bo = $('faireSonBilanOral');
  if(bm) bm.style.display = (ok && !window.sansIAEnCours) ? '' : 'none';
  if(bo) bo.style.display = (ok && $('finishBtn') && $('finishBtn').style.display !== 'none') ? 'block' : 'none';
}

/* ── l'historique : la ligne du cours, et son bilan à coller ── */
function decorerBilanParLEleve(row, item){
  if(!row || !item || !estBilanParLEleve(item.bilan)) return;
  row.classList.add('beLigne');
  row.style.flexWrap = 'wrap';
  const z = document.createElement('div');
  z.className = 'beHisto';
  const dessiner = () => {
    z.innerHTML = '';
    const b = String(item.bilan || '');
    const i = b.indexOf(SEP_SON_BILAN_BE);
    const fait = i !== -1;
    const t = document.createElement('div');
    t.className = 'beHistoTitre' + (fait ? ' beFait' : '');
    t.textContent = fait ? '📝 Bilan fait par l’élève ✅' + (item.moniteur ? ' — demandé par ' + item.moniteur : '')
                         : '📝 Bilan à faire par l’élève' + (item.moniteur ? ' — demandé par ' + item.moniteur : '');
    z.appendChild(t);
    if(fait){
      const s = document.createElement('div');
      s.className = 'beSonBilan';
      s.textContent = '📥 ' + b.slice(i + 3).replace(/^SON BILAN — /, 'Son bilan, ');
      z.appendChild(s);
    }
    const d = document.createElement('details');
    d.className = 'beColler';
    d.innerHTML = '<summary>' + (fait ? '✏️ Remplacer son bilan' : '📥 Son bilan (ce qu’il/elle a écrit)') + '</summary>';
    const ta = document.createElement('textarea');
    ta.rows = 4;
    ta.placeholder = 'Colle ici ce que l’élève a écrit…';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'btn btn-primary';
    ok.textContent = '💾 Garder son bilan';
    ok.addEventListener('click', async ev => {
      ev.stopPropagation();
      const v = ta.value.trim();
      if(!v){ showToast('Colle d’abord ce qu’il a écrit.'); return; }
      if(!item.ligne){ showToast('Ce cours n’a pas de ligne : rouvre le dossier et réessaie.'); return; }
      ok.disabled = true;
      const quand = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' ', ' à ');
      const base = fait ? b.slice(0, i).replace(/\s*━+\s*$/, '') : b.replace(/\s*$/, '');
      const neuf = base + '\n\n━━━━━━━━━━━━━━━━━━\n' + SEP_SON_BILAN_BE + ((ACCES && ACCES.moniteur) || '') + ' le ' + quand + ' :\n' + v;
      try{
        const r = await appelPrep({ action: 'bilanMaj', ligne: item.ligne, eleve: item.eleve, bilan: neuf });
        if(r && r.status === 'error') throw new Error(r.message);
        item.bilan = neuf;
        if(typeof viderCaches === 'function') viderCaches(item.eleve);
        showToast('📥 Son bilan est gardé ✅');
        dessiner();
      }catch(e){ ok.disabled = false; showToast('Pas gardé : ' + e.message); }
    });
    d.append(ta, ok);
    d.addEventListener('click', ev => ev.stopPropagation());
    z.appendChild(d);
  };
  dessiner();
  row.appendChild(z);
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poserBoutonsBE);
else poserBoutonsBE();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-bilan-eleve.js'] = true;
