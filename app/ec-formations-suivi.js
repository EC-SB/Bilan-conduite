/* Déployé le 27/10/2026 à 18:16 — v1283 */
/* ============================================================
   ec-formations-suivi.js — 💼 FORMATIONS, LIVRAISON 3 (v1283)

   David, le 27 octobre 2026 (schéma v1, puis « je te laisse faire la
   livraison 3 ») :
   · 📥 les séances lues dans le planning Drivup — « les salariés ont
     leur fiche élève et leurs leçons dans Drivup » ;
   · 📝 les questionnaires (Qualiopi) : avant devis (son « Questionnaire
     de pré-devis »), positionnement au départ, satisfaction à la fin —
     des salariés et de l'entreprise — en ligne ou remplis ici ;
   · 🧾 les rapports écrits par l'IA à partir des bilans de cours,
     « comme pour l'ESAT » (son rapport individuel et son rapport à
     l'entreprise) ;
   · 🔔 les alertes des formations dans 🔔 Alertes et dans le bandeau
     du jour ;
   · 📊 les chiffres du BPF (bilan pédagogique et financier, à déclarer
     avant le 31 mai sur « Mon activité formation »).

   Les questionnaires sont écrits UNE fois, dans le Worker
   (QUESTIONNAIRES_FE) : l'appli et la page questionnaire.html les
   lisent de là.
   ============================================================ */

const FQ = { drivup: {}, ia: '' };

/* ---------- les questionnaires : où en est-on ---------- */
function feQuestModeles(){ return (typeof FE !== 'undefined' && FE.d && FE.d.questionnairesModeles) || (typeof FS !== 'undefined' && FS.miennes && FS.miennes.questionnairesModeles) || {}; }
function feQuestDe(x, genre, stagiaire){ return (x.questionnaires || []).find(q => q.genre === genre && (q.stagiaire || '') === (stagiaire || '')) || null; }
function feQuestRecus(x, genre){
  const ids = (x.donnees.stagiaires || []).map(s => s.id);
  return (x.questionnaires || []).filter(q => q.genre === genre && q.reponduLe && ids.indexOf(q.stagiaire) !== -1).length;
}
const FE_QUEST_ORDRE = [['avantDevis', '📝'], ['positionnement', '🎯'], ['satisfaction', '😊'], ['satisfactionEntreprise', '🏢']];
function feQuestEtat(q){
  if(q && q.reponduLe) return { cls: 'ok', t: '✅ reçu le ' + new Date(q.reponduLe).toLocaleDateString('fr-FR') + (q.par === 'en ligne' ? ' (en ligne)' : (q.par ? ' (rempli par ' + q.par + ')' : '')) };
  if(q && q.envoyeLe) return { cls: 'att', t: '✉️ envoyé le ' + new Date(q.envoyeLe).toLocaleDateString('fr-FR') + ' — pas encore de réponse' };
  return { cls: 'non', t: '— pas encore envoyé' };
}

/* La fenêtre qui fait remplir un questionnaire ici (le bureau au
   téléphone, le moniteur à la séance) */
function feFenetreQuest(x, genre, st, apres){
  const def = feQuestModeles()[genre];
  if(!def) return;
  const fen = feFenetre((genre === 'positionnement' ? '🎯 ' : genre === 'satisfaction' ? '😊 ' : '📝 ') + def.titre);
  const b = fen.boite;
  b.appendChild(feAide((st ? '<b>' + feEsc(st.nom) + '</b> · ' : '') + feEsc(def.intro)));
  const v = {};
  def.sections.forEach(sec => {
    b.appendChild(feSous(sec.titre));
    sec.questions.forEach(q => b.appendChild(feQuestion(q, v)));
  });
  const r = feEl('div', 'btn-row');
  const go = feBouton('✓ Enregistrer les réponses', 'btn-primary', async () => {
    go.disabled = true;
    try{
      const rr = await appelPrep({ action: 'formationQuestPoser', id: x.id, genre: genre, stagiaire: st ? st.id : '', reponses: v });
      if(!rr || rr.status !== 'ok') throw new Error((rr && rr.message) || 'Réponses non enregistrées');
      x.questionnaires = rr.questionnaires;
      if(typeof FE !== 'undefined' && FE.journal) delete FE.journal[x.id];
      fen.fermer();
      if(apres) apres(); else feDessiner();
    }catch(e){ feToast('⚠️ ' + ((e && e.message) || e)); go.disabled = false; }
  });
  r.append(feBouton('Annuler', '', fen.fermer), go);
  b.appendChild(r);
}
/* Une question, dans l'appli (la page publique a sa propre copie) */
function feQuestion(q, v){
  const w = feEl('div', 'feQ');
  w.appendChild(feEl('div', 'feQL', q.l));
  if(q.t === 'texte' || q.t === 'nombre'){
    const i = document.createElement('input'); i.type = q.t === 'nombre' ? 'number' : 'text'; i.dataset.q = q.k;
    i.addEventListener('input', () => { v[q.k] = i.value; });
    w.appendChild(i);
  } else if(q.t === 'long'){
    const t = document.createElement('textarea'); t.rows = 3; t.dataset.q = q.k;
    t.addEventListener('input', () => { v[q.k] = t.value; });
    w.appendChild(t);
  } else if(q.t === 'un' || q.t === 'plusieurs'){
    const z = feEl('div', 'feOnglets');
    q.options.forEach(o => z.appendChild(fePuce(o, false, p => {
      if(q.t === 'un'){ v[q.k] = v[q.k] === o ? '' : o; [...z.children].forEach(c => c.classList.toggle('on', c === p && v[q.k] === o)); }
      else { const l = v[q.k] = v[q.k] || []; const i = l.indexOf(o); if(i === -1) l.push(o); else l.splice(i, 1); p.classList.toggle('on', i === -1); }
    })));
    w.appendChild(z);
  } else if(q.t === 'echelle'){
    v[q.k] = v[q.k] || {};
    q.items.forEach((it, i) => {
      const l = feEl('div', 'feQEch');
      l.appendChild(feEl('span', 'feQEchL', it));
      const z = feEl('div', 'feOnglets');
      q.options.forEach((o, k) => z.appendChild(fePuce((k + 1) + ' · ' + o, false, p => { v[q.k][i] = k + 1; [...z.children].forEach(c => c.classList.toggle('on', c === p)); })));
      l.appendChild(z);
      w.appendChild(l);
    });
  }
  return w;
}
/* 👁️ les réponses */
function feReponsesLignes(def, rep){
  const out = [];
  def.sections.forEach(sec => sec.questions.forEach(q => {
    const val = rep && rep[q.k];
    if(val === undefined) return;
    if(q.t === 'echelle') q.items.forEach((it, i) => { if(val[i]) out.push([it, val[i] + ' / ' + q.options.length + ' — ' + q.options[val[i] - 1]]); });
    else out.push([q.l, Array.isArray(val) ? val.join(' · ') : String(val)]);
  }));
  return out;
}
function feFenetreReponses(x, genre, q, nom){
  const def = feQuestModeles()[genre];
  if(!def || !q) return;
  const fen = feFenetre('👁️ ' + def.court + (nom ? ' — ' + nom : ''));
  fen.boite.appendChild(feAide(feQuestEtat(q).t));
  feReponsesLignes(def, q.reponses).forEach(([k, v]) => { const l = feEl('div', 'feKv'); l.append(feEl('span', 'k', k), feEl('span', 'v', v)); fen.boite.appendChild(l); });
  const r = feEl('div', 'btn-row'); r.appendChild(feBouton('Fermer', 'btn-primary', fen.fermer)); fen.boite.appendChild(r);
}
/* La moyenne de chaque point d'une échelle, et la part des réponses */
function feSynthese(x, genre){
  const def = feQuestModeles()[genre];
  const l = (x.questionnaires || []).filter(q => q.genre === genre && q.reponduLe && q.reponses);
  if(!def || !l.length) return null;
  const out = { n: l.length, echelles: [], choix: [] };
  def.sections.forEach(sec => sec.questions.forEach(q => {
    if(q.t === 'echelle') q.items.forEach((it, i) => {
      const v = l.map(r => r.reponses[q.k] && r.reponses[q.k][i]).filter(Boolean);
      if(v.length) out.echelles.push({ l: it, moy: v.reduce((a, b) => a + b, 0) / v.length, max: q.options.length, n: v.length });
    });
    if(q.t === 'un'){
      const v = l.map(r => r.reponses[q.k]).filter(Boolean);
      if(v.length) out.choix.push({ l: q.l, parts: q.options.map(o => [o, v.filter(y => y === o).length]).filter(p => p[1]), n: v.length });
    }
  }));
  return out;
}

/* ============================================================
   📝 L'ONGLET « QUESTIONNAIRES » (le bureau)
   ============================================================ */
function feOngletQuestionnaires(z, x){
  const d = x.donnees, e = d.entreprise || {};
  const M = feQuestModeles();
  z.appendChild(feAide('Qualiopi demande de recueillir <b>le niveau et les attentes de chacun avant</b> la formation (positionnement), et <b>l’avis de chacun à la fin</b> (satisfaction) — des salariés et de l’entreprise. <b>✉️</b> part par mail avec un lien (la personne répond sur son téléphone) ; <b>📱</b> se remplit ici, au téléphone avec elle ou sur le téléphone du formateur à la première séance.'));
  FE_QUEST_ORDRE.forEach(([genre, emoji]) => {
    const def = M[genre];
    if(!def) return;
    const bloc = feEl('div', 'feBoite feQBloc');
    const tete = feEl('div', 'feQTete');
    tete.appendChild(feEl('b', '', emoji + ' ' + def.court));
    const cibles = def.pour === 'entreprise' ? [{ id: '', nom: e.nom || 'L’entreprise', mail: e.mail || '' }] : (d.stagiaires || []);
    if(def.pour === 'stagiaire') tete.appendChild(feEl('span', 'feAideIn', feQuestRecus(x, genre) + ' / ' + cibles.length + ' reçu' + (feQuestRecus(x, genre) > 1 ? 's' : '')));
    bloc.appendChild(tete);
    bloc.appendChild(feEl('div', 'feAideIn', { avantDevis: 'Avant le devis : le besoin de l’entreprise (son questionnaire de pré-devis).', positionnement: 'Avant le début : expérience, aisance, attentes, besoins particuliers.',
      satisfaction: 'À la fin : l’avis de chaque salarié.', satisfactionEntreprise: 'À la fin : l’avis de l’entreprise.' }[genre] || ''));
    if(def.pour === 'stagiaire' && !cibles.length) bloc.appendChild(feEl('div', 'feAideIn', 'aucun salarié dans 👥 Stagiaires'));
    cibles.forEach(st => {
      const q = feQuestDe(x, genre, st.id);
      const et = feQuestEtat(q);
      const l = feEl('div', 'feQLigne ' + et.cls);
      const n = feEl('div', 'feQNom');
      n.appendChild(feEl('b', '', st.nom || '?'));
      n.appendChild(feEl('span', '', et.t + (!st.mail && !(q && q.reponduLe) ? ' · pas de mail' : '')));
      l.appendChild(n);
      const bs = feEl('div', 'feDocBtns');
      if(q && q.reponduLe) bs.appendChild(feBouton('👁️', 'feBtnPetit', () => feFenetreReponses(x, genre, q, st.nom), 'Voir les réponses'));
      else {
        bs.appendChild(feBouton('📱', 'feBtnPetit feEcrit', () => feFenetreQuest(x, genre, def.pour === 'stagiaire' ? st : null), 'Remplir ici'));
        if(st.mail) bs.appendChild(feBouton(q && q.envoyeLe ? '✉️ Relancer' : '✉️ Envoyer', 'feBtnPetit feEcrit', () => feEnvoyerQuest(x, genre, def.pour === 'stagiaire' ? [st.id] : null), 'Envoyer par mail'));
      }
      l.appendChild(bs);
      bloc.appendChild(l);
    });
    if(def.pour === 'stagiaire'){
      const restent = cibles.filter(st => st.mail && !((feQuestDe(x, genre, st.id) || {}).reponduLe));
      if(restent.length > 1) bloc.appendChild(feBouton('✉️ Envoyer aux ' + restent.length + ' qui n’ont pas répondu', 'feBtnPetit feEcrit', () => feEnvoyerQuest(x, genre, restent.map(st => st.id))));
    }
    const sy = (genre === 'satisfaction' || genre === 'satisfactionEntreprise') ? feSynthese(x, genre) : null;
    if(sy){
      const s2 = feEl('div', 'feQSynthese');
      sy.echelles.forEach(it => {
        const l = feEl('div', 'feQBarre');
        l.appendChild(feEl('span', 'l', it.l));
        const j = feEl('span', 'j'); const i = feEl('i'); i.style.width = Math.round(it.moy / it.max * 100) + '%'; j.appendChild(i);
        l.appendChild(j);
        l.appendChild(feEl('b', '', feNb(Math.round(it.moy * 10) / 10) + ' / ' + it.max));
        s2.appendChild(l);
      });
      sy.choix.forEach(c => s2.appendChild(feEl('div', 'feAideIn', c.l + ' — ' + c.parts.map(p => p[0] + ' : ' + p[1]).join(' · '))));
      bloc.appendChild(s2);
    }
    z.appendChild(bloc);
  });
  const t = feEl('div', 'feBarre');
  t.appendChild(feBouton('📄 La synthèse en PDF', '', () => feVoir([feDocument('questionnaires', x)], 'Questionnaires ' + x.numero)));
  z.appendChild(t);
}
async function feEnvoyerQuest(x, genre, stagiaires){
  try{
    feToast('✉️ Envoi…');
    const r = await appelPrep({ action: 'formationQuestEnvoyer', id: x.id, genre: genre, stagiaires: stagiaires || undefined, renvoyer: true,
                                page: location.origin + location.pathname.replace(/[^/]*$/, '') + 'questionnaire.html' });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Questionnaire non envoyé');
    x.questionnaires = r.questionnaires;
    if(FE.journal) delete FE.journal[x.id];
    feToast((r.envoyes.length ? '✉️ Envoyé à ' + r.envoyes.join(', ') : 'Rien n’est parti') + (r.sans.length ? ' · sans mail : ' + r.sans.join(', ') : ''));
    feDessiner();
  }catch(e){ feToast('⚠️ ' + ((e && e.message) || e)); }
}

/* Le moniteur : positionnement et satisfaction de ses stagiaires */
function feOngletQuestMoniteur(z, x){
  const d = x.donnees, M = feQuestModeles();
  z.appendChild(feAide('À la première séance, fais remplir le <b>positionnement</b> à ceux qui ne l’ont pas fait (📱) ; à la dernière, la <b>satisfaction</b>. Le positionnement te dit leur niveau et leurs attentes (👁️).'));
  ['positionnement', 'satisfaction'].forEach(genre => {
    const def = M[genre];
    if(!def) return;
    const bloc = feEl('div', 'feBoite feQBloc');
    const tete = feEl('div', 'feQTete');
    tete.appendChild(feEl('b', '', (genre === 'positionnement' ? '🎯 ' : '😊 ') + def.court));
    tete.appendChild(feEl('span', 'feAideIn', feQuestRecus(x, genre) + ' / ' + (d.stagiaires || []).length));
    bloc.appendChild(tete);
    (d.stagiaires || []).forEach(st => {
      const q = feQuestDe(x, genre, st.id), et = feQuestEtat(q);
      const l = feEl('div', 'feQLigne ' + et.cls);
      const n = feEl('div', 'feQNom'); n.append(feEl('b', '', st.nom || '?'), feEl('span', '', et.t)); l.appendChild(n);
      const bs = feEl('div', 'feDocBtns');
      if(q && q.reponduLe) bs.appendChild(feBouton('👁️', 'feBtnPetit', () => feFenetreReponses(x, genre, q, st.nom), 'Voir les réponses'));
      else bs.appendChild(feBouton('📱 Faire remplir', 'feBtnPetit btn-primary', () => feFenetreQuest(x, genre, st, () => feDessiner())));
      l.appendChild(bs);
      bloc.appendChild(l);
    });
    z.appendChild(bloc);
  });
}

/* ============================================================
   📥 LES SÉANCES DU PLANNING DRIVUP
   ============================================================ */
async function feLireDrivup(x, force){
  const c = FQ.drivup[x.id];
  if(!force && c && Date.now() - c.t < 60000) return c.r;
  const r = await appelPrep({ action: 'formationDrivup', id: x.id });
  if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Planning illisible');
  FQ.drivup[x.id] = { t: Date.now(), r: r };
  return r;
}
function feBlocDrivup(z, x){
  const bloc = feEl('div', 'feDrivup');
  bloc.style.display = 'none';
  z.appendChild(bloc);
  feLireDrivup(x).then(r => feRemplirDrivup(bloc, x, r)).catch(() => {});
  return bloc;
}
function feRemplirDrivup(bloc, x, r){
  const d = x.donnees, restreint = !!(FE.d && FE.d.restreint);
  const nom = id => ((d.stagiaires || []).find(s => s.id === id) || {}).nom || '?';
  bloc.innerHTML = '';
  if(!r.groupes.length && !r.disparues.length){ bloc.style.display = 'none'; return; }
  bloc.style.display = '';
  if(r.groupes.length){
    bloc.appendChild(feEl('div', 'feDrivupT', '📥 Planning Drivup : ' + r.groupes.length + ' leçon' + (r.groupes.length > 1 ? 's' : '') + ' des salariés pas encore dans le dossier'));
    r.groupes.forEach(g => {
      const l = feEl('div', 'feDrivupL');
      l.appendChild(feEl('span', 'n', fsJourCourt(g.date) + ' · ' + feHeure(g.debut) + ' – ' + feHeure(g.fin) + ' · ' + g.stagiaires.map(nom).join(', ') + (g.moniteur ? ' · 👤 ' + g.moniteur : '') + (g.completer ? ' → à ajouter à la séance de cette heure' : '')));
      l.appendChild(feBouton('＋ Ajouter', 'feBtnPetit feEcrit', () => feAjouterDrivup(x, [g])));
      bloc.appendChild(l);
    });
    if(r.groupes.length > 1) bloc.appendChild(feBouton('＋ Tout ajouter (' + r.groupes.length + ')', 'feBtnPetit btn-primary feEcrit', () => feAjouterDrivup(x, r.groupes)));
  }
  if(r.disparues.length){
    const s = (d.seances || []).filter(y => r.disparues.indexOf(y.id) !== -1);
    bloc.appendChild(feEl('div', 'feDrivupT ko', '❗ ' + s.map(y => fsJourCourt(y.date) + ' ' + feHeure(y.debut)).join(', ') + ' : plus dans le planning Drivup (leçon annulée ?)'));
    if(restreint) bloc.appendChild(feBouton('✕ Retirer ' + (s.length > 1 ? 'ces séances' : 'cette séance'), 'feBtnPetit', () => feRetirerDisparues(x, r.disparues)));
    else bloc.appendChild(feEl('div', 'feAideIn', 'À retirer avec ✕ si la leçon est bien annulée.'));
  }
  if(!restreint && typeof fePeutEcrire === 'function' && !fePeutEcrire()) bloc.querySelectorAll('button.feEcrit').forEach(b => { b.disabled = true; });
}
async function feAjouterDrivup(x, groupes){
  try{
    if(FE.d && FE.d.restreint){
      const r = await appelPrep({ action: 'formationDrivupPoser', id: x.id, cles: groupes.map(g => g.cle) });
      if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Séances non ajoutées');
      fsMajFormation(r.formation);
    } else {
      /* le bureau : dans le dossier ouvert, enregistré comme le reste */
      const d = x.donnees;
      d.seances = d.seances || [];
      groupes.forEach(g => {
        if(g.completer){ const s = d.seances.find(y => y.id === g.completer); if(s && s.stagiaires && s.stagiaires.length) g.stagiaires.forEach(i => { if(s.stagiaires.indexOf(i) === -1) s.stagiaires.push(i); }); return; }
        d.seances.push({ id: feId('e'), date: g.date, debut: g.debut, fin: g.fin, contenu: String(g.libelle || '').replace(/^\s*(conduite|le[çc]on)\s*[-–:]\s*/i, '').slice(0, 200),
                         stagiaires: g.stagiaires.length === (d.stagiaires || []).length ? [] : g.stagiaires.slice(), formateur: g.moniteur || (d.formation && d.formation.formateur) || '', absents: [], drivup: g.cle });
      });
      FE.attente = x;
      await feSauverMaintenant('📥 ' + groupes.length + ' séance(s) reprise(s) du planning Drivup');
    }
    delete FQ.drivup[x.id];
    feDessiner();
  }catch(e){ feToast('⚠️ ' + ((e && e.message) || e)); }
}
async function feRetirerDisparues(x, ids){
  try{
    const r = await appelPrep({ action: 'formationDrivupPoser', id: x.id, retirer: ids });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Non retirées');
    fsMajFormation(r.formation);
    delete FQ.drivup[x.id];
    feDessiner();
  }catch(e){ feToast('⚠️ ' + ((e && e.message) || e)); }
}

/* ============================================================
   🧾 LES RAPPORTS, ÉCRITS PAR L'IA À PARTIR DES BILANS DE COURS
   ============================================================ */
const FE_RAPPORT_IND = [['pointsForts', 'Points forts'], ['axes', 'Axes d’amélioration'], ['conseils', 'Conseils personnalisés'], ['synthese', 'Synthèse du formateur']];
const FE_RAPPORT_ENT = [['comportements', 'Comportements courants observés'], ['recurrents', 'Points récurrents à améliorer'], ['recommandations', 'Recommandations générales'],
                        ['actions', 'Actions complémentaires possibles'], ['politique', 'Suggestions pour la politique sécurité routière']];
function feIsoBilan(t){
  const s = String(t || '');
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/); if(m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return '';
}
/* Les bilans de cours d'un salarié pendant la formation */
async function feBilansDe(nom, du, au){
  const r = await fetchFiable(CONFIG.SHEETS_PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'search', code: ACCES.code, eleve: nom, exact: true, maxi: 80 }) });
  if(!r.ok) throw new Error('Bilans illisibles (HTTP ' + r.status + ')');
  const data = await r.json().catch(() => ({}));
  return ((data && data.resultats) || []).map(b => Object.assign({}, b, { iso: feIsoBilan(b.date) }))
    .filter(b => b.iso && (!du || b.iso >= du) && (!au || b.iso <= au) && String(b.bilan || '').trim())
    .sort((a, b) => a.iso.localeCompare(b.iso));
}
async function feIA(quoi, systeme, texte, max){
  const r = await fetch(CONFIG.IA_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: ACCES.code, quoi: quoi, payload: { model: CONFIG.MODELE_IA || 'claude-sonnet-5', max_tokens: max || 2500, system: systeme, messages: [{ role: 'user', content: texte }] } }) });
  if(!r.ok) throw new Error('IA injoignable (HTTP ' + r.status + ')');
  const data = await r.json();
  const t = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').replace(/```json|```/g, '').trim();
  const i = t.indexOf('{'), j = t.lastIndexOf('}');
  try{ return JSON.parse(t.slice(i, j + 1)); }catch(e){ throw new Error('L’IA n’a pas rendu un rapport lisible. Réessaie.'); }
}
const FE_IA_SYSTEME = 'Tu es formateur à la conduite à l’auto-école Évolution Conduites (Saint-Brieuc). Tu écris des rapports de formation pour des salariés d’entreprise, ' +
  'à partir des bilans de cours écrits par les moniteurs pendant la formation. Tu restes fidèle aux bilans : rien d’inventé, pas de note chiffrée, ' +
  'pas d’information médicale ni personnelle. Phrases simples et concrètes, comme un moniteur qui parle à quelqu’un qu’il a formé. ' +
  'Si les bilans sont trop maigres pour une rubrique, écris-le simplement (« à compléter par le formateur »). Réponds UNIQUEMENT en JSON valide.';
async function feEcrireRapportsIA(x){
  const d = x.donnees, f = d.formation || {};
  const sta = (d.stagiaires || []).filter(s => s.nom);
  if(!sta.length){ feToast('⚠️ Aucun salarié dans 👥 Stagiaires.'); return; }
  d.rapports = d.rapports || { ind: {}, entreprise: {} };
  const prog = (f.programme || []).map(p => '- ' + p.titre + (p.detail ? ' (' + p.detail + ')' : '')).join('\n');
  const vides = [];
  for(let k = 0; k < sta.length; k++){
    const st = sta[k];
    FQ.ia = '🧠 ' + (k + 1) + ' / ' + sta.length + ' — ' + st.nom + '…';
    feDessiner();
    let bilans = [];
    try{ bilans = await feBilansDe(st.nom, f.dateDebut, f.dateFin); }catch(e){ bilans = []; }
    if(!bilans.length) vides.push(st.nom);
    const pos = feQuestDe(x, 'positionnement', st.id);
    const seances = feSeancesDe(d, st).filter(s => s.date).map(s => '- ' + feDateFr(s.date) + ' ' + feHeure(s.debut) + '–' + feHeure(s.fin) + (s.contenu ? ' : ' + s.contenu : '')).join('\n');
    const texte = 'Formation : ' + (f.intitule || '') + (f.objectifs ? '\nObjectifs : ' + f.objectifs : '') + (prog ? '\nProgramme :\n' + prog : '') +
      '\n\nSalarié : ' + st.nom + (st.fonction ? ' (' + st.fonction + ')' : '') + ' — ' + feNb(feHeuresFaites(d, st)) + ' h suivies' +
      (seances ? '\nSéances :\n' + seances : '') +
      (pos && pos.reponses ? '\n\nSon questionnaire de positionnement :\n' + feReponsesLignes(feQuestModeles().positionnement, pos.reponses).map(l => '- ' + l[0] + ' : ' + l[1]).join('\n') : '') +
      '\n\nBilans de cours pendant la formation :\n' + (bilans.length ? bilans.map(b => '[' + feDateFr(b.iso) + (b.moniteur ? ', ' + b.moniteur : '') + ']\n' + String(b.bilan).slice(0, 2500)).join('\n\n').slice(0, 14000) : '(aucun bilan de cours trouvé)') +
      '\n\nÉcris son rapport individuel, en le tutoyant (il lui est envoyé), en JSON : {"pointsForts": "…", "axes": "…", "conseils": "…", "synthese": "…"}.' +
      ' pointsForts = ce qu’il fait bien ; axes = ce qu’il doit encore travailler ; conseils = des conseils de conduite concrets pour son travail ; synthese = un court paragraphe du formateur sur sa formation.';
    try{
      const r = await feIA('Rapport individuel de formation', FE_IA_SYSTEME, texte, 2500);
      d.rapports.ind[st.id] = { pointsForts: String(r.pointsForts || ''), axes: String(r.axes || ''), conseils: String(r.conseils || ''), synthese: String(r.synthese || ''), bilans: bilans.length, faitLe: feAujourdhui() };
    }catch(e){ FQ.ia = ''; feDessiner(); feToast('⚠️ ' + st.nom + ' : ' + ((e && e.message) || e)); return; }
  }
  FQ.ia = '🧠 Le rapport à l’entreprise…';
  feDessiner();
  const sat = feSynthese(x, 'satisfaction');
  const texteE = 'Formation : ' + (f.intitule || '') + ' — entreprise ' + ((d.entreprise && d.entreprise.nom) || '') + ' — ' + sta.length + ' salarié(s), ' + feDates(f) +
    (f.objectifs ? '\nObjectifs : ' + f.objectifs : '') + '\n\nLes rapports individuels :\n' +
    sta.map(st => { const r = d.rapports.ind[st.id] || {}; return '## ' + st.nom + (st.fonction ? ' (' + st.fonction + ')' : '') + '\nPoints forts : ' + r.pointsForts + '\nAxes : ' + r.axes + '\nConseils : ' + r.conseils; }).join('\n\n') +
    (sat ? '\n\nSatisfaction des salariés (' + sat.n + ' réponses) : ' + sat.echelles.map(e => e.l + ' ' + feNb(Math.round(e.moy * 10) / 10) + '/' + e.max).join(' ; ') : '') +
    '\n\nÉcris le rapport global à l’entreprise (vouvoiement, sans nommer de salarié en mal), en JSON : {"comportements": "…", "recurrents": "…", "recommandations": "…", "actions": "…", "politique": "…"}.' +
    ' comportements = comportements courants observés ; recurrents = points récurrents à améliorer ; recommandations = recommandations générales ; actions = actions complémentaires possibles (formations, rappels) ; politique = suggestions pour la politique sécurité routière de l’entreprise (équipement des véhicules, règles internes).';
  try{
    const r = await feIA('Rapport de formation à l’entreprise', FE_IA_SYSTEME, texteE, 2500);
    d.rapports.entreprise = { comportements: String(r.comportements || ''), recurrents: String(r.recurrents || ''), recommandations: String(r.recommandations || ''),
                              actions: String(r.actions || ''), politique: String(r.politique || ''), faitLe: feAujourdhui() };
  }catch(e){ feToast('⚠️ Rapport entreprise : ' + ((e && e.message) || e)); }
  FQ.ia = '';
  FE.attente = x;
  await feSauverMaintenant('🧠 rapports écrits par l’IA (à relire)');
  if(vides.length) feToast('⚠️ Aucun bilan de cours trouvé pour ' + vides.join(', ') + ' : leur rapport est à compléter.');
  feDessiner();
}
function feOngletRapports(z, x){
  const d = x.donnees;
  const sta = (d.stagiaires || []).filter(s => s.nom);
  z.appendChild(feAide('Comme pour l’ESAT : <b>un rapport par salarié</b> (à lui envoyer) et <b>un rapport à l’entreprise</b>. L’IA les écrit à partir des <b>bilans de cours</b> des salariés pendant la formation (et de leur positionnement) ; tu relis et tu corriges — tout s’enregistre tout seul.'));
  const t = feEl('div', 'feBarre');
  const deja = d.rapports && Object.keys(d.rapports.ind || {}).length;
  if(FQ.ia) t.appendChild(feEl('span', 'feIaEnCours', FQ.ia));
  else t.appendChild(feBouton(deja ? '🧠 Réécrire avec l’IA' : '🧠 Écrire les rapports avec l’IA', deja ? 'feEcrit' : 'btn-primary feEcrit', async () => {
    if(deja && typeof confirmer === 'function' && !await confirmer('Réécrire tous les rapports ? Tes corrections seront remplacées.', 'Réécrire', true)) return;
    feEcrireRapportsIA(x);
  }));
  if(deja){
    t.appendChild(feBouton('👁️ Les rapports', '', () => feVoir(sta.map(st => feDocument('rapportIndividuel', x, st)).concat([feDocument('rapportEntreprise', x)]), 'Rapports ' + x.numero)));
    t.appendChild(feBouton('✉️ À chaque salarié', 'feEcrit', () => feEnvoyerRapportsSalaries(x)));
    t.appendChild(feBouton('✉️ À l’entreprise', 'feEcrit', () => feFenetreMail(x, ['rapportEntreprise', 'rapportsIndividuels'])));
  }
  z.appendChild(t);
  if(!sta.length){ z.appendChild(feEl('div', 'empty', 'Aucun salarié dans 👥 Stagiaires.')); return; }
  if(!deja) return;
  const R = d.rapports;
  sta.forEach(st => {
    R.ind[st.id] = R.ind[st.id] || {};
    const c = feEl('div', 'feBoite feRapport');
    c.appendChild(feEl('b', 'feRapportNom', '🧾 ' + st.nom + (st.fonction ? ' · ' + st.fonction : '')));
    c.appendChild(feEl('div', 'feAideIn', (R.ind[st.id].bilans ? R.ind[st.id].bilans + ' bilan' + (R.ind[st.id].bilans > 1 ? 's' : '') + ' de cours lu' + (R.ind[st.id].bilans > 1 ? 's' : '') : '⚠️ aucun bilan de cours trouvé : à compléter') + (R.ind[st.id].faitLe ? ' · écrit le ' + feDateFr(R.ind[st.id].faitLe) : '')));
    FE_RAPPORT_IND.forEach(([k, lib]) => c.appendChild(feChamp(lib, R.ind[st.id], k, { type: 'textarea', rows: 3, large: true })));
    z.appendChild(c);
  });
  R.entreprise = R.entreprise || {};
  const c = feEl('div', 'feBoite feRapport');
  c.appendChild(feEl('b', 'feRapportNom', '🏢 Rapport à l’entreprise'));
  FE_RAPPORT_ENT.forEach(([k, lib]) => c.appendChild(feChamp(lib, R.entreprise, k, { type: 'textarea', rows: 3, large: true })));
  z.appendChild(c);
}
async function feEnvoyerRapportsSalaries(x){
  const d = x.donnees, f = d.formation || {};
  const avec = (d.stagiaires || []).filter(s => /@/.test(s.mail || '')), sans = (d.stagiaires || []).filter(s => s.nom && !/@/.test(s.mail || ''));
  if(!avec.length){ feToast('⚠️ Aucun salarié n’a de mail : envoie les rapports à l’entreprise.'); return; }
  if(typeof confirmer === 'function' && !await confirmer('Envoyer son rapport à chacun des ' + avec.length + ' salariés qui ont un mail' + (sans.length ? ' (' + sans.map(s => s.nom).join(', ') + ' : pas de mail)' : '') + ' ?', 'Envoyer', false)) return;
  let n = 0;
  for(const st of avec){
    try{
      await fePdfEnvoi(x, [{ genre: 'rapportIndividuel', nom: feNomPdf('Rapport individuel ' + st.nom, x), contenu: await fePdfB64([feDocument('rapportIndividuel', x, st)]) }], [st.mail],
        'Ton rapport de formation — ' + (f.intitule || 'Formation'), 'Bonjour,\n\nVoici ton rapport de la formation « ' + (f.intitule || '') + ' » : ce que tu fais bien, ce qu’il te reste à travailler, et nos conseils.\n\nBonne route !\n' + (FE.d.moi || '') + ' — Évolution Conduites');
      n++;
    }catch(e){ feToast('⚠️ ' + st.nom + ' : ' + ((e && e.message) || e)); }
  }
  delete FE.journal[x.id];
  feToast('✉️ ' + n + ' rapport' + (n > 1 ? 's' : '') + ' envoyé' + (n > 1 ? 's' : ''));
}

/* ---------- les documents de la livraison 3 ---------- */
FE_DOCS.rapportIndividuel = function(d, o, x, st){
  const f = d.formation || {}, r = ((d.rapports || {}).ind || {})[st.id] || {};
  const blocs = [{ t: 'titre', texte: 'RAPPORT INDIVIDUEL DE FORMATION' }, { t: 'sous', texte: (f.intitule || '') + ' · Réf. ' + x.numero },
    { t: 'kv', lignes: [['Salarié', '**' + st.nom + '**' + (st.fonction ? ' — ' + st.fonction : '')], ['Entreprise', (d.entreprise && d.entreprise.nom) || ''], ['Dates', feDates(f)],
                        ['Durée suivie', feHeures(feHeuresFaites(d, st))], ['Formateur', f.formateur || '']] }];
  FE_RAPPORT_IND.forEach(([k, lib]) => { blocs.push({ t: 'h', texte: lib }); blocs.push({ t: 'p', texte: r[k] || '—' }); });
  blocs.push({ t: 'signatures', cases: [feSignatureOF(d, o, 'Le formateur'), null] });
  return { titre: 'Rapport individuel ' + st.nom, ref: x.numero + '-RI', blocs: blocs };
};
FE_DOCS.rapportEntreprise = function(d, o, x){
  const f = d.formation || {}, r = (d.rapports || {}).entreprise || {};
  const blocs = [{ t: 'titre', texte: 'RAPPORT DE FORMATION À L’ENTREPRISE' }, { t: 'sous', texte: (f.intitule || '') + ' · Réf. ' + x.numero },
    { t: 'kv', lignes: [['Entreprise', '**' + ((d.entreprise && d.entreprise.nom) || '') + '**'], ['Dates', feDates(f)], ['Salariés formés', String((d.stagiaires || []).length)],
                        ['Objectifs', (f.objectifs || '').replace(/\n+/g, ' · ')]] }];
  blocs.push({ t: 'h', texte: 'Synthèse des observations' });
  FE_RAPPORT_ENT.slice(0, 2).forEach(([k, lib]) => { blocs.push({ t: 'p', texte: '**' + lib + '** — ' + (r[k] || '—') }); });
  blocs.push({ t: 'h', texte: 'Recommandations' });
  FE_RAPPORT_ENT.slice(2).forEach(([k, lib]) => { blocs.push({ t: 'p', texte: '**' + lib + '** — ' + (r[k] || '—') }); });
  blocs.push({ t: 'p', gris: true, taille: 9, texte: 'Annexes : les rapports individuels de chaque salarié.' });
  blocs.push({ t: 'signatures', cases: [feSignatureOF(d, o), null] });
  return { titre: 'Rapport entreprise', ref: x.numero + '-RE', blocs: blocs };
};
FE_DOCS.questionnaires = function(d, o, x){
  const M = feQuestModeles();
  const blocs = [{ t: 'titre', texte: 'SYNTHÈSE DES QUESTIONNAIRES' }, { t: 'sous', texte: ((d.formation || {}).intitule || '') + ' · ' + ((d.entreprise || {}).nom || '') + ' · Réf. ' + x.numero }];
  FE_QUEST_ORDRE.forEach(([genre]) => {
    const def = M[genre];
    if(!def) return;
    const l = (x.questionnaires || []).filter(q => q.genre === genre && q.reponduLe);
    blocs.push({ t: 'h', texte: def.court + ' — ' + l.length + ' réponse' + (l.length > 1 ? 's' : '') });
    const sy = feSynthese(x, genre);
    if(sy && sy.echelles.length) blocs.push({ t: 'table', cols: [{}, { w: 30, align: 'center' }], entete: ['Moyenne', 'Sur'], lignes: sy.echelles.map(e => [e.l, feNb(Math.round(e.moy * 10) / 10) + ' / ' + e.max]), taille: 9.5 });
    l.forEach(q => {
      const st = (d.stagiaires || []).find(s => s.id === q.stagiaire);
      blocs.push({ t: 'p', texte: '**' + (st ? st.nom : ((d.entreprise || {}).nom || 'Entreprise')) + '** — ' + new Date(q.reponduLe).toLocaleDateString('fr-FR') + (q.par === 'en ligne' ? ' (en ligne)' : ' (rempli avec ' + q.par + ')') });
      const lignes = feReponsesLignes(def, q.reponses);
      if(lignes.length) blocs.push({ t: 'kv', largeurCle: 70, lignes: lignes.map(([k, v]) => [k, v]) });
    });
    if(!l.length) blocs.push({ t: 'p', gris: true, texte: 'Aucune réponse.' });
  });
  return { titre: 'Questionnaires', ref: x.numero + '-Q', blocs: blocs };
};
function feDocsSuivi(x){
  const d = x.donnees, sta = (d.stagiaires || []).filter(s => s.nom);
  const R = d.rapports || {}, ok = Object.keys(R.ind || {}).length > 0;
  const nq = (x.questionnaires || []).filter(q => q.reponduLe).length;
  return [
    { cle: 'rapportsIndividuels', emoji: '🧾', nom: 'Rapports individuels (' + sta.length + ')', etat: ok ? 'écrits (🧾 Rapports)' : '', fait: ok, docs: () => sta.map(st => feDocument('rapportIndividuel', x, st)), vide: !sta.length || !ok },
    { cle: 'rapportEntreprise', emoji: '🏢', nom: 'Rapport à l’entreprise', etat: ok ? 'écrit (🧾 Rapports)' : '', fait: ok, docs: () => [feDocument('rapportEntreprise', x)], vide: !ok },
    { cle: 'questionnaires', emoji: '📝', nom: 'Synthèse des questionnaires', etat: nq ? nq + ' réponse' + (nq > 1 ? 's' : '') : '', fait: nq > 0, docs: () => [feDocument('questionnaires', x)], sansMail: true }
  ];
}

/* ============================================================
   🔔 LES ALERTES : le bandeau du jour et 🔔 Alertes
   ============================================================ */
const FX = { charge: 0, enCours: null };
async function fxChargerFormations(){
  if(typeof aDroit !== 'function' || !aDroit('formations')) return null;
  if(FE.d && !FE.d.restreint && (Date.now() - FX.charge < 5 * 60000 || FE.vue === 'dossier' || FE.attente)) return FE.d;
  if(FX.enCours) return FX.enCours;
  FX.enCours = (async () => {
    try{
      const r = await appelPrep({ action: 'formationsLire' });
      /* ⚠️ JAMAIS SOUS UN ÉCRAN OUVERT : un dossier qu'on remplit garde
         ses objets (les champs y sont liés, une fenêtre d'envoi aussi) */
      const ouvert = FE.d && (FE.vue === 'dossier' || FE.attente || ($('formationsZone') && $('formationsZone').offsetParent));
      if(r && r.status === 'ok' && !ouvert && (!FE.d || !FE.d.restreint)){
        FE.d = r;
        FX.charge = Date.now();
      }
    }catch(e){}
    FX.enCours = null;
    return FE.d;
  })();
  return FX.enCours;
}
function feAlertesToutes(){
  if(!FE.d || FE.d.restreint) return [];
  const out = [];
  (FE.d.formations || []).filter(x => !((x.donnees.suivi || {}).paye)).forEach(x => { try{ feAlertes(x).forEach(a => out.push([x, a])); }catch(e){} });
  return out;
}
function feAllerAuDossier(id, onglet){
  try{ afficherOnglet('outils'); afficherVue('outils', 'formations'); }catch(e){}
  setTimeout(() => { if(FE.d && (FE.d.formations || []).some(y => y.id === id)) feOuvrir(id, onglet); }, 400);
}
/* Une ligne du bandeau par alerte (famille « formations ») */
function lignesFormationsBandeau(){
  return feAlertesToutes().map(([x, a], i) => ({
    id: 'formation:' + x.id + ':' + a.texte.replace(/\d+ jours?/g, '').slice(0, 40), famille: 'formations', emoji: '💼',
    texte: ((x.donnees.entreprise && x.donnees.entreprise.nom) || x.numero) + ' — ' + a.texte,
    sous: 'Formation entreprise · ' + ((x.donnees.formation && x.donnees.formation.intitule) || ''), urgente: /OPCO|Paiement attendu/.test(a.texte), groupe: 'auj',
    action: () => feAllerAuDossier(x.id, a.onglet), actionTexte: a.bouton.replace(/^\S+\s/, '') || 'Ouvrir' }));
}
/* La partie « 💼 Formations entreprise » de 🔔 Alertes */
function sectionFormationsNotifs(){
  const l = feAlertesToutes();
  if(!l.length) return null;
  const w = feEl('div', 'feNotifs');
  w.appendChild(feEl('div', 'feNotifsT', '💼 Formations entreprise — ' + l.length));
  l.forEach(([x, a]) => {
    const r = feEl('div', 'feAFaireL');
    const t = feEl('div', 'feAFaireTxt');
    t.appendChild(feEl('b', '', (x.donnees.entreprise && x.donnees.entreprise.nom) || x.numero));
    t.appendChild(document.createTextNode(' — ' + a.texte));
    r.append(t, feBouton(a.bouton, 'feBtnPetit', () => feAllerAuDossier(x.id, a.onglet)));
    w.appendChild(r);
  });
  return w;
}
/* Au démarrage, puis toutes les 30 minutes */
(function(){
  let n = 0;
  const essayer = () => {
    if(typeof ACCES !== 'undefined' && ACCES && ACCES.code){
      fxChargerFormations().then(() => { if(typeof dessinerBandeau === 'function') try{ dessinerBandeau(); }catch(e){} });
      return;
    }
    if(++n < 240) setTimeout(essayer, 1000);
  };
  setTimeout(essayer, 4000);
  setInterval(() => { if(typeof ACCES !== 'undefined' && ACCES && ACCES.code) fxChargerFormations().then(() => { if(typeof dessinerBandeau === 'function') try{ dessinerBandeau(); }catch(e){} }); }, 30 * 60000);
})();

/* ============================================================
   📊 LE BPF — bilan pédagogique et financier
   Cerfa 10443 : cadre C (origine des produits), E (formateurs),
   F-1 (types de stagiaires), F-3 (objectif), F-4 (spécialité).
   ============================================================ */
function feExercice(annee, mois){
  const m = Math.max(1, Math.min(12, Number(mois) || 1));
  const du = annee + '-' + String(m).padStart(2, '0') + '-01';
  const fin = new Date(+annee + 1, m - 1, 0);
  return { du: du, au: feIso(fin), lib: 'du ' + feDateFr(du) + ' au ' + feDateFr(feIso(fin)) };
}
function feBpf(annee){
  const o = FE.d.organisme || {};
  const ex = feExercice(annee, o.exerciceMois);
  const dans = iso => iso && iso >= ex.du && iso <= ex.au;
  const r = { ex: ex, c1: 0, c2h: 0, formateurs: {}, heuresFormateurs: 0, stagiaires: 0, heuresStagiaires: 0, dossiers: [] };
  (FE.d.formations || []).forEach(x => {
    const d = x.donnees, s = d.suivi || {}, f = d.formation || {};
    /* les heures : les séances de l'exercice */
    let hS = 0, nS = 0, hF = 0;
    (d.stagiaires || []).forEach(st => {
      const h = feArr(feSeancesDe(d, st).filter(se => dans(se.date) && se.date <= feAujourdhui()).reduce((a, se) => {
        const sig = Array.isArray(se.signatures) ? se.signatures : [];
        if(sig.length){ const dm = feDemis(se); return a + feDureeSeance(se) * dm.filter(z => sig.some(e => e.qui === st.id && e.demi === z && !e.absent)).length / dm.length; }
        return (se.absents || []).indexOf(st.id) === -1 ? a + feDureeSeance(se) : a;
      }, 0));
      if(h > 0){ hS += h; nS++; }
    });
    (d.seances || []).filter(se => dans(se.date) && se.date <= feAujourdhui()).forEach(se => {
      const qui = se.formateur || f.formateur || '?';
      r.formateurs[qui] = (r.formateurs[qui] || 0) + feDureeSeance(se);
      hF += feDureeSeance(se);
    });
    /* les produits : la facture de l'exercice (sinon la fin de la formation) */
    /* une formation pas encore finie ni facturée n'a rien produit */
    const fin = f.dateFin || f.dateDebut || '';
    const quand = (s.facture && s.facture.le) || (fin && fin <= feAujourdhui() ? fin : '');
    let ht = 0, opco = 0;
    if(dans(quand)){
      const t = feTotaux(d, o);
      ht = s.facture && Number(s.facture.montant) ? feArr(Number(s.facture.montant) / (1 + t.tva / 100)) : t.ht;
      if(feEstOpco(d) && s.opcoAccord && !s.opcoRefus) opco = Math.min(ht, Number(s.opcoAccord.montant) || 0);
      r.c2h += opco; r.c1 += ht - opco;
    }
    r.stagiaires += nS; r.heuresStagiaires += hS; r.heuresFormateurs += hF;
    if(nS || ht) r.dossiers.push({ x: x, ht: ht, opco: opco, nS: nS, hS: hS, quand: quand });
  });
  r.c1 = Math.round(r.c1); r.c2h = Math.round(r.c2h); r.heuresStagiaires = Math.round(r.heuresStagiaires); r.heuresFormateurs = Math.round(r.heuresFormateurs);
  return r;
}
function feFenetreBpf(){
  const o = FE.d.organisme || {};
  const annees = new Set([new Date().getFullYear() - 1, new Date().getFullYear()]);
  (FE.d.formations || []).forEach(x => { const f = x.donnees.formation || {}; [f.dateDebut, f.dateFin].forEach(iso => { if(iso) annees.add(+iso.slice(0, 4)); }); });
  let annee = new Date().getMonth() < 6 ? new Date().getFullYear() - 1 : new Date().getFullYear();
  const fen = feFenetre('📊 BPF — bilan pédagogique et financier');
  const b = fen.boite;
  b.appendChild(feAide('Chaque année, <b>avant le 31 mai</b>, l’organisme déclare l’exercice précédent sur <b>« Mon activité formation »</b>. Voici les chiffres des formations entreprise de l’appli ; le reste (cadre D, les charges) vient de ta comptabilité.'));
  const ch = feEl('div', 'feOnglets');
  const zone = feEl('div', 'feBpf');
  const dessiner = () => {
    [...ch.children].forEach(c => c.classList.toggle('on', c.dataset.a === String(annee)));
    const r = feBpf(annee);
    const nF = Object.keys(r.formateurs).length;
    const t = (cadre, lignes) => { const w = feEl('div', 'feBpfCadre'); w.appendChild(feEl('b', '', cadre)); lignes.forEach(([k, v]) => { const l = feEl('div', 'feKv'); l.append(feEl('span', 'k', k), feEl('span', 'v', v)); w.appendChild(l); }); return w; };
    zone.innerHTML = '';
    zone.appendChild(feEl('div', 'feAideIn', 'Exercice ' + r.ex.lib + (o.exerciceMois && o.exerciceMois !== 1 ? '' : ' (à changer dans ⚙️ L’organisme si ton exercice comptable est décalé)')));
    zone.appendChild(t('C — Origine des produits (HT)', [['1 · Entreprises, pour la formation de leurs salariés', feEur(r.c1).replace(',00', '')],
      ['2-h · OPCO — plan de développement des compétences', feEur(r.c2h).replace(',00', '')], ['Total des produits de la formation', feEur(r.c1 + r.c2h).replace(',00', '')]]));
    zone.appendChild(t('E — Personnes qui dispensent les heures', [['1 · Formateurs de l’organisme : nombre', String(nF)], ['… heures dispensées', r.heuresFormateurs + ' h'],
      ['(qui)', Object.keys(r.formateurs).map(k => k + ' ' + Math.round(r.formateurs[k]) + ' h').join(' · ') || '—']]));
    zone.appendChild(t('F-1 — Types de stagiaires', [['a · Salariés d’employeurs privés : stagiaires', String(r.stagiaires)], ['… heures-stagiaires', r.heuresStagiaires + ' h']]));
    zone.appendChild(t('F-3 — Objectif général', [['d · Autres formations professionnelles', r.stagiaires + ' stagiaires · ' + r.heuresStagiaires + ' h'], ['', 'Un permis inscrit au répertoire spécifique (RS) irait en b : à vérifier formation par formation.']]));
    zone.appendChild(t('F-4 — Spécialité de formation', [['311 · Transport, manutention, magasinage', r.stagiaires + ' stagiaires · ' + r.heuresStagiaires + ' h'], ['', 'Code NSF à confirmer lors de la déclaration.']]));
    const det = feEl('div', 'feBpfCadre');
    det.appendChild(feEl('b', '', 'Les dossiers comptés (' + r.dossiers.length + ')'));
    r.dossiers.forEach(z2 => det.appendChild(feEl('div', 'feAideIn', z2.x.numero + ' · ' + ((z2.x.donnees.entreprise || {}).nom || '') + ' — ' + z2.nS + ' stagiaire(s), ' + Math.round(z2.hS) + ' h-stagiaires' + (z2.ht ? ' · ' + feEur(z2.ht) + ' HT' + (z2.opco ? ' (dont OPCO ' + feEur(z2.opco) + ')' : '') : ''))));
    if(!r.dossiers.length) det.appendChild(feEl('div', 'feAideIn', 'Aucune formation sur cet exercice.'));
    zone.appendChild(det);
    zone.dataset.texte = 'BPF ' + r.ex.lib + '\nC-1 Entreprises : ' + r.c1 + ' € HT\nC-2h OPCO (plan de développement des compétences) : ' + r.c2h + ' € HT\nTotal : ' + (r.c1 + r.c2h) + ' € HT\n' +
      'E-1 Formateurs de l’organisme : ' + nF + ' — ' + r.heuresFormateurs + ' h\nF-1 a Salariés d’employeurs privés : ' + r.stagiaires + ' stagiaires — ' + r.heuresStagiaires + ' h-stagiaires\n' +
      'F-3 d Autres formations : ' + r.stagiaires + ' — ' + r.heuresStagiaires + ' h\nF-4 311 Transport, manutention, magasinage : ' + r.stagiaires + ' — ' + r.heuresStagiaires + ' h';
  };
  [...annees].sort().forEach(a => { const p = fePuce('Exercice ' + a, false, () => { annee = a; dessiner(); }); p.dataset.a = String(a); ch.appendChild(p); });
  b.append(ch, zone);
  const r = feEl('div', 'btn-row');
  r.append(feBouton('📋 Copier', '', async () => { try{ await navigator.clipboard.writeText(zone.dataset.texte || ''); feToast('📋 Copié'); }catch(e){ feToast('⚠️ Copie impossible'); } }), feBouton('Fermer', 'btn-primary', fen.fermer));
  b.appendChild(r);
  dessiner();
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-formations-suivi.js'] = true;
