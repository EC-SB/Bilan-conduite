/* Déployé le 31/10/2026 à 17:05 — v1325 */
/* ============================================================
   🔑 LE COIN RÉVISIONS D'UN ÉLÈVE — v1325

   David, le 31 octobre (captures à l'appui) :
   « Le mail que l'on envoie quand on ouvre son espace révisions n'est
     pas bon : il faut dire ce qui est coché — là ça met réciter tes
     procédures et suivre tes séances de code pour un élève qui n'a rien
     de ça dans son espace — et il faut qu'on puisse le modifier avant
     qu'il parte. Si le groupe théorie n'est pas coché, le message (de la
     salle) ne sert à rien. Le questionnaire n'est pas à remplir pour les
     élèves en passerelle. Dans la partie coin révisions, c'est pas
     ergonomique pour mettre en route l'espace. »

   Ses réponses au schéma :
   · A + B : la première fois, une MISE EN ROUTE en trois étapes (sa
     formation → ce qu'il voit → le message) ; ensuite, la carte A ;
   · « ce qu'on ouvre d'habitude » se règle par formation (admins) ;
   · passerelles, motos et remises à niveau ne font pas la salle : le
     groupe théorie n'est pas coché d'habitude chez eux ;
   · le message part aussi dans sa messagerie, case cochée de base ;
   · des interrupteurs plutôt que des cases ;
   · le questionnaire : un interrupteur, allumé pour tous sauf les
     passerelles, les remises à niveau et les régularisations.

   ⚠️ LE QUESTIONNAIRE ÉTEINT S'ÉCRIT « sans_questionnaire » DANS SES
   MODULES (colonne G de ElevesAcces). Allumé est l'état de base : un
   élève d'avant la v1325 n'a pas la clé, il garde son questionnaire. Le
   Worker lit la clé à la connexion (renseignementsALaConnexion) et ne
   le relance pas (relancesDesRenseignements).
   ⚠️ LES MODULES ET LES GROUPES S'ENREGISTRENT ENSEMBLE, depuis un seul
   état (cvListeModules) : deux écrans qui recomposaient chacun la liste
   en lisant des cases finissaient par effacer la clé de l'autre.
   ⚠️ LE MESSAGE DIT CE QUI EST OUVERT, et rien d'autre (cvTexteAcces) ;
   il est le même pour le mail, la messagerie et le bouton 📋 des Codes.
   ============================================================ */

const CV_TUILES = [
  { cle: 'parcours',          i: '🎬', t: 'Ses vidéos et guides',       d: 'les groupes cochés dessous' },
  { cle: 'rappel',            i: '📅', t: 'Son prochain cours',         d: 'et ses écoutes' },
  { cle: 'historique',        i: '📖', t: 'L’historique de ses leçons', d: 'le bilan de chaque cours' },
  { cle: 'messages',          i: '💬', t: 'Écrire à l’école',           d: 'ouvert à tous', fixe: true },
  { cle: 'questionnaire',     i: '📋', t: 'Le questionnaire',           d: 'renseignements et disponibilités, à sa 1re visite' },
  { cle: 'proccorriger',      i: '📋', t: 'Réciter des procédures',     d: 'au micro, corrigées par l’équipe' },
  { cle: 'code',              i: '🎓', t: 'Suivi du code en salle',     d: 'ses séances de code' },
  { cle: 'verifs',            i: '🧰', t: 'Le jeu des vérifications',   d: 'cartes éclair VI / VE' },
  { cle: 'messages_moniteur', i: '💬', t: '… et à son moniteur',        d: 'un fil avec son moniteur' },
  { cle: 'appel_vocal',       i: '📞', t: 'Appeler en vocal',           d: 'le bureau, son moniteur' },
  { cle: 'appel_video',       i: '🎥', t: '… et en vidéo',              d: '' }
];
const CV_SANS_Q = 'sans_questionnaire';
const CV_REGLAGE = 'reglage_espace_formations';
const CV_HABITUDE_MODULES = ['parcours', 'rappel', 'historique'];
const CV_LIEN_DRIVUP = 'https://client.drivup.fr/';
/* Pas de questionnaire, d'habitude, pour ces formations (David : « tous
   sauf les passerelles, les remises à niveau, les régularisations ») */
const CV_SANS_Q_RE = /passerelle|remise|r[ée]gularisation/i;
/* … et pas de salle (« on décoche pour les passerelles, les motos et les
   remises à niveau ») */
const CV_SANS_SALLE_RE = /passerelle|remise|moto|\bA1\b|\bA2\b|\bAM\b/i;

function cvEch(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function cvNorm(t){ return (typeof normaliserMot === 'function') ? normaliserMot(String(t || '')) : String(t || '').trim().toLowerCase(); }
function cvAdmin(){ return typeof ACCES !== 'undefined' && ACCES && ACCES.role === 'admin'; }
function cvNomGroupe(g){ return (g.icone ? g.icone + ' ' : '') + g.nom; }

function cvStyle(){
  if(document.getElementById('cvCss')) return;
  const s = document.createElement('style');
  s.id = 'cvCss';
  s.textContent = `
.cvC{border:1px solid var(--orange);border-radius:11px;padding:12px 14px;color:var(--cream)}
.cvC.ferme{border-color:var(--line)}
.cvT{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.cvT .n{flex:1;min-width:180px;font-size:13px;line-height:1.5}
.cvT .n small{display:block;font-size:11px;color:var(--muted)}
.cvCode{font-size:16px;letter-spacing:.12em;color:var(--accent-text);font-weight:700;cursor:pointer}
.cvBtns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:flex-start}
.cvBtns>.btn,.cvBtns>div{flex:1 1 200px;margin:0}
.cvBtns .btn{padding:11px;font-size:13px;margin:0;width:100%}
.cvAide{font-size:11px;color:var(--muted);margin-top:4px;line-height:1.45}
.cvH{font-size:12.5px;font-weight:800;margin:14px 0 6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cvH small{font-weight:400;color:var(--muted);font-size:11px}
.cvH .btn{width:auto;margin:0 0 0 auto;padding:6px 10px;font-size:12px}
.cvGrille{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:7px}
.cvGrille>*{min-width:0}
.cvTu{display:flex;gap:9px;align-items:flex-start;border:1px solid var(--line);border-radius:11px;padding:9px 10px;cursor:pointer;min-height:58px;
  background:transparent;color:var(--cream);text-align:left;font:inherit;width:100%;margin:0}
.cvTu .i{font-size:19px;line-height:1}
.cvTu .t{flex:1;min-width:0;font-size:13px;font-weight:700;line-height:1.3;overflow-wrap:break-word}
.cvTu .t small{display:block;font-weight:400;font-size:11px;color:var(--muted);margin-top:2px}
.cvTu .s{width:34px;height:20px;border-radius:999px;background:var(--line);position:relative;flex-shrink:0;margin-top:1px;transition:background .15s}
.cvTu .s:after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:left .15s}
.cvTu.on{border-color:var(--orange);background:var(--orange-soft);color:var(--on-accent)}
.cvTu.on .t small{color:var(--on-accent);opacity:.8}
.cvTu.on .s{background:#3B6900}.cvTu.on .s:after{left:16px}
.cvTu.fixe{opacity:.75;cursor:default}
.cvTu:disabled{cursor:wait}
.cvTu:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
.cvBadge{display:inline-block;font-size:10.5px;font-weight:800;border-radius:999px;padding:2px 7px;margin-top:3px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}
.cvTu.on .cvBadge{border-color:rgba(0,0,0,.25);color:var(--on-accent)}
.cvBadge.sal{border-color:#2F7FD8;color:#2F7FD8}
.cvTu.on .cvBadge.sal{border-color:#1F5FA8;color:#1F5FA8}
.cvBadge.ok{border-color:#3B6900;color:#3B6900}
.cvNote{border:1px dashed var(--line);border-radius:10px;padding:9px 11px;font-size:12.5px;line-height:1.6;margin-top:8px}
.cvBas{margin-top:14px;padding-top:9px;border-top:1px solid var(--line);display:flex;gap:6px 14px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--muted)}
.cvLien{background:none;border:0;padding:4px 0;margin:0;font:inherit;font-size:12px;font-weight:700;color:var(--accent-text);cursor:pointer;width:auto}
.cvLien.rouge{color:var(--red)}
.cvEtat{font-size:11.5px;min-height:16px;margin-top:6px}
.cvEt{display:flex;gap:6px;margin-bottom:12px}
.cvEt span{flex:1;font-size:12px;font-weight:800;text-align:center;padding:7px 4px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}
.cvEt span.on{background:var(--orange);border-color:var(--orange);color:var(--on-accent)}
.cvEt span.fait{border-color:var(--orange);color:var(--accent-text)}
.cvMail textarea{width:100%;min-height:300px;font-family:inherit;font-size:14px;line-height:1.55;margin:0}
.cvMail input[type=text],.cvMail input[type=email]{width:100%;margin:0 0 8px}
.cvCoche{display:flex;gap:8px;align-items:center;text-transform:none;font-size:13px;color:var(--cream);margin:8px 0 0;font-weight:400}
.cvCoche input{width:18px;height:18px;margin:0;flex-shrink:0}
@media (max-width:520px){.cvGrille{grid-template-columns:minmax(0,1fr)}.cvTu{min-height:0}.cvC{padding:11px 10px}.cvEt span{font-size:11px}}

`;
  document.head.appendChild(s);
}

/* ── les habitudes, par formation ── */
function cvReglage(){
  const m = (typeof modelesTexte !== 'undefined' && modelesTexte || []).find(x => x.usage === CV_REGLAGE);
  let r = {};
  try{ r = m ? (JSON.parse(m.contenu) || {}) : {}; }catch(e){ r = {}; }
  return (r && typeof r.formations === 'object' && r.formations) ? r.formations : {};
}
async function cvPoserHabitude(formation, h){
  if(typeof chargerModelesTexte === 'function') await chargerModelesTexte(true);
  const m = (modelesTexte || []).find(x => x.usage === CV_REGLAGE);
  const tout = cvReglage();
  tout[cvNorm(formation)] = { nom: String(formation), modules: h.modules.slice(), questionnaire: !!h.q, groupes: h.groupes.slice() };
  const contenu = JSON.stringify({ formations: tout });
  const rep = await appelPrep({ action: 'modeleSet', id: m ? m.id : '', usage: CV_REGLAGE,
                                nom: 'Réglage — ce qu’on ouvre par formation (coin révisions)', contenu: contenu });
  if(rep && rep.status === 'error') throw new Error(rep.message);
  if(m) m.contenu = contenu;
  else modelesTexte.push({ id: (rep && rep.id) || '', usage: CV_REGLAGE, nom: 'Réglage — ce qu’on ouvre par formation (coin révisions)', contenu: contenu });
}
/* Ce qu'on ouvre d'habitude pour une formation : le réglage des admins,
   sinon la règle de base (les groupes qui la prévoient, sans la salle
   pour les passerelles, motos et remises à niveau). */
function cvHabitudeDe(formation, groupes, prog){
  const f = String(formation || '').trim();
  const ouverts = (groupes || []).filter(g => !g.fermeLe);
  const r = f ? cvReglage()[cvNorm(f)] : null;
  if(r){
    return { modules: (r.modules || []).filter(k => CV_TUILES.some(t => t.cle === k && !t.fixe && k !== 'questionnaire')),
             q: r.questionnaire !== false,
             groupes: (r.groupes || []).filter(id => ouverts.some(g => g.id === id)), regle: true };
  }
  let gs = f ? ouverts.filter(g => (g.formations || []).some(x => cvNorm(x) === cvNorm(f))) : [];
  if(CV_SANS_SALLE_RE.test(f)) gs = gs.filter(g => ((prog && prog.groupes) || []).indexOf(g.id) === -1);
  return { modules: CV_HABITUDE_MODULES.slice(), q: !CV_SANS_Q_RE.test(f), groupes: gs.map(g => g.id), regle: false };
}

/* ── l'état d'un accès ── */
function cvEtatDeLAcces(acces){
  const brut = String((acces && acces.modules) || '').split(',').map(x => x.trim()).filter(Boolean);
  const connus = CV_TUILES.map(t => t.cle);
  return {
    mods: brut.filter(k => connus.indexOf(k) !== -1 && k !== 'messages'),
    q: brut.indexOf(CV_SANS_Q) === -1,
    /* une clé qu'on ne connaît pas ici n'est jamais effacée par cet écran */
    autres: brut.filter(k => connus.indexOf(k) === -1 && k !== CV_SANS_Q && k !== 'aucun'),
    groupes: ((acces && acces.groupes) || []).slice()
  };
}
/* ⚠️ LA SEULE LISTE QU'ON ÉCRIT (voir l'en-tête) */
function cvListeModules(E){
  const l = CV_TUILES.filter(t => t.cle !== 'questionnaire' && (t.cle === 'messages' || E.mods.indexOf(t.cle) !== -1)).map(t => t.cle);
  if(E.groupes.length && l.indexOf('parcours') === -1) l.push('parcours');
  (E.autres || []).forEach(k => { if(l.indexOf(k) === -1) l.push(k); });
  if(!E.q) l.push(CV_SANS_Q);
  return l.join(',');
}
/* Rend false si l'appui est refusé : 🎬 suit ses groupes (v1039) */
function cvBasculer(E, cle){
  if(cle === 'questionnaire'){ E.q = !E.q; return true; }
  const on = E.mods.indexOf(cle) !== -1;
  if(cle === 'parcours' && on && E.groupes.length){
    showToast('🎬 suit ses groupes : décoche d’abord ses groupes.');
    return false;
  }
  if(on) E.mods = E.mods.filter(k => k !== cle); else E.mods.push(cle);
  /* 📞 la vidéo emporte le vocal, et l'inverse */
  if(cle === 'appel_video' && !on && E.mods.indexOf('appel_vocal') === -1) E.mods.push('appel_vocal');
  if(cle === 'appel_vocal' && on) E.mods = E.mods.filter(k => k !== 'appel_video');
  return true;
}
function cvAllume(E, cle){ return cle === 'messages' ? true : cle === 'questionnaire' ? E.q : E.mods.indexOf(cle) !== -1; }

/* Les groupes de la salle parmi les siens */
function cvSalleCochee(E, prog){ return E.groupes.filter(id => ((prog && prog.groupes) || []).indexOf(id) !== -1); }

/* ── les tuiles ── */
function cvTuile(on, i, t, dHtml, fixe){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cvTu' + (on ? ' on' : '') + (fixe ? ' fixe' : '');
  b.setAttribute('role', 'switch');
  b.setAttribute('aria-checked', on ? 'true' : 'false');
  b.innerHTML = '<span class="i">' + i + '</span><span class="t">' + cvEch(t) + (dHtml ? '<small>' + dHtml + '</small>' : '') + '</span><span class="s"></span>';
  return b;
}
function cvGrilleModules(E, auClic){
  const g = document.createElement('div');
  g.className = 'cvGrille';
  CV_TUILES.forEach(t => {
    const b = cvTuile(cvAllume(E, t.cle), t.i, t.t, cvEch(t.d), t.fixe);
    b.dataset.tuile = t.cle;
    if(t.fixe) b.setAttribute('aria-disabled', 'true');
    else b.addEventListener('click', () => auClic(t.cle, b));
    g.appendChild(b);
  });
  return g;
}
/* Le badge d'un groupe : la salle d'abord, ce qui l'attend, ou rien */
function cvBadgeGroupe(g, E, prog, groupes, assistant){
  const pg = (prog && prog.groupes) || [];
  if(pg.indexOf(g.id) !== -1) return '<span class="cvBadge sal">📺 ' + (assistant ? 'groupe de la salle' : 'en salle d’abord') + '</span>';
  const r = ((prog && prog.regles) || {})[g.id] || { mode: 'apres' };
  if(r.mode === 'groupe'){
    const ref = (groupes || []).find(x => x.id === r.groupe);
    if(ref && E.groupes.indexOf(ref.id) !== -1) return '<span class="cvBadge">🔒 après « ' + cvEch(ref.nom) + ' »</span>';
    return '<span class="cvBadge ok">ouvert tout de suite</span>';
  }
  if(r.mode === 'apres' && cvSalleCochee(E, prog).length) return '<span class="cvBadge">🔒 après la salle</span>';
  return '<span class="cvBadge ok">ouvert tout de suite</span>';
}
function cvGrilleGroupes(E, groupes, prog, formation, auClic, assistant){
  const g = document.createElement('div');
  g.className = 'cvGrille';
  const f = cvNorm(formation);
  (groupes || []).filter(x => !x.fermeLe || E.groupes.indexOf(x.id) !== -1).forEach(x => {
    const on = E.groupes.indexOf(x.id) !== -1;
    const prevu = !f || !(x.formations || []).length || (x.formations || []).some(y => cvNorm(y) === f);
    let d = '';
    if(x.fermeLe) d = 'groupe fermé';
    else if(on || (prog && (prog.groupes || []).indexOf(x.id) !== -1)) d = cvBadgeGroupe(x, E, prog, groupes, assistant);
    else if(!prevu) d = 'pas prévu pour sa formation';
    const b = cvTuile(on, cvEch(x.icone || '🧩'), x.nom, d);
    b.dataset.groupe = x.id;
    b.addEventListener('click', () => auClic(x.id, b));
    g.appendChild(b);
  });
  if(!g.children.length){
    const v = document.createElement('div');
    v.style.cssText = 'font-size:11.5px;color:var(--muted);';
    v.textContent = '🧩 Aucun groupe créé pour l’instant.';
    return v;
  }
  return g;
}

/* ── les lectures ── */
async function cvLire(nom){
  const [dA, dP] = await Promise.all([
    appelPrep({ action: 'accesElevesList' }),
    appelPrep({ action: 'parcoursList' }).catch(() => null)
  ]);
  const acces = ((dA && dA.acces) || []).find(x => cvNorm(x.eleve) === cvNorm(nom)) || null;
  const fiche = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
  return {
    nom: nom, acces: acces,
    groupes: (dP && dP.groupes) || [],
    prog: (dP && dP.salle) || { groupes: [], regles: {} },
    lu: !!dP,
    formation: String((fiche && fiche.formation) || '').trim()
  };
}

/* ── le message ── */
function cvTexteAcces(o){
  const E = o.E, prenom = String(o.nom || '').split(' ')[0];
  const noms = o.groupes.filter(g => E.groupes.indexOf(g.id) !== -1);
  const l = [];
  if(noms.length && cvAllume(E, 'parcours')) l.push('🎬 tes vidéos et guides : ' + noms.map(g => g.nom).join(', '));
  if(cvAllume(E, 'rappel')) l.push('📅 ton prochain cours');
  if(cvAllume(E, 'historique')) l.push('📖 l’historique de tes leçons, avec le bilan de chaque cours');
  if(cvAllume(E, 'proccorriger')) l.push('📋 tes procédures à réciter, corrigées par l’équipe');
  if(cvAllume(E, 'code')) l.push('🎓 le suivi de tes séances de code');
  if(cvAllume(E, 'verifs')) l.push('🧰 le jeu des vérifications');
  l.push('💬 une messagerie pour écrire à l’auto-école' + (cvAllume(E, 'messages_moniteur') ? ' et à ton moniteur' : ''));
  if(cvAllume(E, 'appel_vocal')) l.push('📞 un bouton pour nous appeler' + (cvAllume(E, 'appel_video') ? ', en vocal ou en vidéo' : ''));
  let t = 'Bonjour ' + prenom + ',\n\n' +
    'Ton espace révisions Évolution Conduites est ouvert :\n' +
    String((typeof CONFIG === 'object' && CONFIG.LIEN_ELEVE) || '') + '\n' +
    'Ton nom : ' + o.nom + '\n' +
    'Ton code : ' + o.code + '\n\n' +
    'Tu y trouveras :\n' + l.map(x => '• ' + x).join('\n') + '\n';
  /* 📺 la salle : seulement si un groupe de la salle est coché, et pas finie */
  const salle = cvSalleCochee(E, o.prog);
  if(salle.length && !o.salleFinie){
    const nomsSalle = o.groupes.filter(g => salle.indexOf(g.id) !== -1).map(g => '« ' + g.nom + ' »');
    const attendent = noms.filter(g => salle.indexOf(g.id) === -1 &&
      ((((o.prog && o.prog.regles) || {})[g.id] || { mode: 'apres' }).mode === 'apres'));
    t += '\n📺 ' + (nomsSalle.length > 1 ? nomsSalle.join(' et ') + ' se regardent' : nomsSalle[0] + ' se regarde') +
      ' d’abord en salle des tablettes, à l’auto-école : réserve tes heures de théorie dans Drivup.' +
      (attendent.length ? ' Tes autres vidéos s’ouvrent quand tu as fini.' : '') + '\n';
  }
  if(E.q) t += '\n📋 À ta première visite, remplis le questionnaire « Mes renseignements et disponibilités ».\n';
  t += '\nTes cours se réservent sur ton espace Drivup : ' + CV_LIEN_DRIVUP + '\n\n' +
    'Garde ce code, il te servira à chaque fois.\n\n' +
    'À bientôt !\n' +
    'Évolution Conduites';
  return t;
}
async function cvSalleFinie(nom){
  try{
    const d = await appelPrep({ action: 'salleEleve', eleve: nom });
    return !!(d && d.eleve && d.eleve.fini);
  }catch(e){ return false; }
}
/* Le message d'accès, à un seul endroit — lu sur son accès tel qu'il est
   enregistré (le bouton 📋 de l'écran des Codes s'en sert). */
async function messageDeLAcces(nom){
  const L = await cvLire(nom);
  const [code, fini] = await Promise.all([codeDeLEleve(nom), cvSalleFinie(nom)]);
  return cvTexteAcces({ nom: (L.acces && L.acces.eleve) || nom, code: code, E: cvEtatDeLAcces(L.acces),
                        groupes: L.groupes, prog: L.prog, salleFinie: fini });
}

/* ── ✉️ le message : À, Objet, le texte modifiable, sa messagerie ── */
async function cvAdresseDe(nom){
  const champ = document.getElementById('fiMail');
  if(champ && champ.value.trim()) return champ.value.trim();
  const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
  if(f && f.email) return String(f.email).trim();
  try{
    const d = await appelPrep({ action: 'contactEleve', eleve: nom });
    return String((((d && d.contact) || {}).email) || '').trim();
  }catch(e){ return ''; }
}
function cvCorpsMail(boite, texte, adresse, actif){
  const z = document.createElement('div');
  z.className = 'cvMail';
  z.innerHTML =
    '<label for="cvA">À</label><input type="email" id="cvA" inputmode="email" autocomplete="off" placeholder="prenom.nom@exemple.fr">' +
    '<label for="cvObjet">Objet</label><input type="text" id="cvObjet">' +
    '<label for="cvTexte">Le message — écrit d’après ce qui est ouvert, modifiable</label><textarea id="cvTexte"></textarea>' +
    '<label class="cvCoche"><input type="checkbox" id="cvMsg"' + (actif ? ' checked' : ' disabled') + '> 💬 L’envoyer aussi dans sa messagerie de l’appli' +
      (actif ? '' : ' <span style="color:var(--muted);">(son espace est fermé)</span>') + '</label>' +
    '<div class="cvEtat" id="cvEtatMail"></div>';
  z.querySelector('#cvA').value = adresse || '';
  z.querySelector('#cvObjet').value = 'Ton espace révisions — Évolution Conduites';
  z.querySelector('#cvTexte').value = texte;
  boite.appendChild(z);
  return z;
}
/* Envoie ce qui est dans la fenêtre. Rend true si quelque chose est parti. */
async function cvEnvoyer(nom, z, adresseDepart){
  const etat = z.querySelector('#cvEtatMail');
  const a = z.querySelector('#cvA').value.trim();
  const sujet = z.querySelector('#cvObjet').value.trim() || 'Ton espace révisions — Évolution Conduites';
  const texte = z.querySelector('#cvTexte').value.trim();
  const msg = z.querySelector('#cvMsg').checked;
  const dire = (t, rouge) => { etat.style.color = rouge ? 'var(--red)' : 'var(--muted)'; etat.textContent = t; };
  if(!texte){ dire('Le message est vide.', true); return false; }
  if(a && a.indexOf('@') === -1){ dire('Cette adresse ne semble pas valable.', true); return false; }
  if(!a && !msg){ dire('Mets une adresse, ou coche sa messagerie.', true); return false; }
  dire('⏳ Envoi…');
  const faits = [], rates = [];
  if(a){
    try{
      await appelPrep({ action: 'mailBilan', genre: 'acces', eleve: nom, to: [a], sujet: sujet, texte: texte });
      faits.push('mail à ' + a);
      /* Corrigée : elle redescend sur sa fiche (comme confirmerAdresseEleve) */
      if(a !== adresseDepart){
        try{
          await appelPrep({ action: 'ficheSet', eleve: nom, email: a });
          const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
          if(f) f.email = a;
          const champ = document.getElementById('fiMail');
          if(champ) champ.value = a;
          if(typeof fichesLues !== 'undefined') fichesLues = 0;
        }catch(e){ /* l'envoi prime */ }
      }
    }catch(e){ rates.push('mail : ' + e.message); }
  }
  if(msg){
    try{
      await appelPrep({ action: 'accesEleveMessagerie', eleve: nom, texte: texte });
      faits.push('sa messagerie');
    }catch(e){ rates.push('messagerie : ' + e.message); }
  }
  if(rates.length){ dire('❌ ' + rates.join(' · ') + (faits.length ? ' — parti : ' + faits.join(' et ') : ''), true); return faits.length > 0; }
  showToast('Envoyé : ' + faits.join(' et ') + ' ✅');
  return true;
}
function cvBoite(titre, large){
  cvStyle();
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(' + (large ? 640 : 560) + 'px, 96vw);max-height:92vh;overflow-y:auto;';
  boite.innerHTML = '<h3>' + titre + '</h3>';
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => { if(typeof fermerFond === 'function') fermerFond(fond); else fond.remove(); };
  return { fond, boite, fermer };
}
function cvBouton(txt, cls, fn){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn ' + (cls || 'btn-secondary');
  b.textContent = txt;
  if(fn) b.addEventListener('click', fn);
  return b;
}

/* ✉️ « Lui envoyer son accès » — depuis sa carte ou l'écran des Codes */
async function fenetreAccesEleve(nom, apres){
  const W = cvBoite('✉️ Lui envoyer son accès');
  const att = document.createElement('div');
  att.style.cssText = 'font-size:13px;color:var(--muted);';
  att.textContent = 'Lecture de son accès…';
  W.boite.appendChild(att);
  let L, code, fini, adresse;
  try{
    L = await cvLire(nom);
    if(!L.acces) throw new Error('il n’a pas encore de coin révisions');
    [code, fini, adresse] = await Promise.all([codeDeLEleve(nom), cvSalleFinie(nom), cvAdresseDe(nom)]);
  }catch(e){
    att.style.color = 'var(--red)';
    att.textContent = '❌ ' + e.message;
    const r = document.createElement('div'); r.className = 'btn-row';
    r.appendChild(cvBouton('Fermer', 'btn-secondary', W.fermer));
    W.boite.appendChild(r);
    return;
  }
  att.remove();
  const E = cvEtatDeLAcces(L.acces);
  const z = cvCorpsMail(W.boite, cvTexteAcces({ nom: L.acces.eleve || nom, code, E, groupes: L.groupes, prog: L.prog, salleFinie: fini }),
                        adresse, !!L.acces.actif);
  const r = document.createElement('div');
  r.className = 'btn-row';
  r.style.marginTop = '12px';
  r.appendChild(cvBouton('Annuler', 'btn-secondary', W.fermer));
  r.appendChild(cvBouton('📋 Copier', 'btn-secondary', async () => {
    try{ await navigator.clipboard.writeText(z.querySelector('#cvTexte').value); showToast('Message copié ✅'); }
    catch(e){ showToast('Copie impossible'); }
  }));
  const bOk = cvBouton('✉️ Envoyer', 'btn-primary', async () => {
    if(bOk.disabled) return;
    bOk.disabled = true;
    const parti = await cvEnvoyer(nom, z, adresse);
    if(parti && !z.querySelector('#cvEtatMail').textContent.startsWith('❌')){ W.fermer(); if(apres) apres(); }
    else bOk.disabled = false;
  });
  bOk.dataset.envoyer = '1';
  r.appendChild(bOk);
  W.boite.appendChild(r);
}

/* ============================================================
   🧭 LA MISE EN ROUTE — trois étapes (B du schéma)
   ① sa formation (celle de sa fiche, qu'on peut changer ici) ;
   ② ce qu'il voit, pré-rempli par l'habitude de sa formation ;
   ③ le message. Son accès s'enregistre en passant de ② à ③ : le code
   existe quand le message s'écrit.
   ============================================================ */
async function miseEnRouteCoinRevisions(nom, apres){
  const W = cvBoite('🧭 Mettre en route son espace — ' + cvEch(nom), true);
  const etapes = document.createElement('div');
  etapes.className = 'cvEt';
  W.boite.appendChild(etapes);
  const corps = document.createElement('div');
  W.boite.appendChild(corps);
  const bas = document.createElement('div');
  bas.className = 'btn-row';
  bas.style.marginTop = '14px';
  W.boite.appendChild(bas);
  corps.innerHTML = '<div style="font-size:13px;color:var(--muted);">Lecture…</div>';
  const fin = () => { W.fermer(); if(apres) apres(); };

  let L;
  try{
    if(typeof chargerModelesTexte === 'function') await chargerModelesTexte();
    L = await cvLire(nom);
  }catch(e){
    corps.innerHTML = '<div style="color:var(--red);font-size:13px;">❌ ' + cvEch(e.message) + '</div>';
    bas.appendChild(cvBouton('Fermer', 'btn-secondary', W.fermer));
    return;
  }
  const S = { n: 1, formation: L.formation, formationVue: null, habitude: false, repartir: !L.acces,
              E: L.acces ? cvEtatDeLAcces(L.acces) : null, code: '', adresse: null };

  const dessinerEtapes = () => {
    etapes.innerHTML = ['① Sa formation', '② Ce qu’il voit', '③ Le message']
      .map((t, i) => '<span class="' + (i + 1 === S.n ? 'on' : (i + 1 < S.n ? 'fait' : '')) + '">' + t + '</span>').join('');
  };
  const appliquerHabitude = () => {
    const h = cvHabitudeDe(S.formation, L.groupes, L.prog);
    const autres = S.E ? S.E.autres : [];
    S.E = { mods: h.modules.slice(), q: h.q, groupes: h.groupes.slice(), autres: autres };
  };

  const etape1 = () => {
    S.n = 1; dessinerEtapes(); bas.innerHTML = ''; corps.innerHTML = '';
    const liste = (typeof toutesLesFormations === 'function') ? toutesLesFormations() : [];
    const opts = liste.map(f => '<option value="' + cvEch(f.cle) + '">' + cvEch(f.nom) + '</option>');
    if(S.formation && !liste.some(f => cvNorm(f.cle) === cvNorm(S.formation))) opts.unshift('<option value="' + cvEch(S.formation) + '">' + cvEch(S.formation) + '</option>');
    corps.innerHTML =
      '<div style="font-size:14px;line-height:1.55;margin-bottom:10px">Sa formation choisit ce qu’on ouvre d’habitude. Tu ajustes à l’étape suivante.</div>' +
      '<label for="cvForm">Sa formation (de sa fiche)</label>' +
      '<select id="cvForm" style="width:100%;margin:0 0 10px"><option value="">— pas de formation —</option>' + opts.join('') + '</select>' +
      '<div class="cvNote" id="cvHab" style="margin-top:0"></div>';
    const sel = corps.querySelector('#cvForm');
    const choisie = liste.find(f => cvNorm(f.cle) === cvNorm(S.formation));
    sel.value = choisie ? choisie.cle : S.formation;
    const resume = () => {
      const f = sel.value;
      const h = cvHabitudeDe(f, L.groupes, L.prog);
      const mods = CV_TUILES.filter(t => t.cle === 'messages' || h.modules.indexOf(t.cle) !== -1)
        .map(t => t.i + ' ' + t.t.toLowerCase().replace(/^ses |^son |^l’/, '')).join(' · ');
      const gs = L.groupes.filter(g => h.groupes.indexOf(g.id) !== -1).map(g => cvEch(g.nom));
      corps.querySelector('#cvHab').innerHTML =
        '<b>Ce qu’on ouvre d’habitude' + (f ? ' pour « ' + cvEch(f) + ' »' : '') + ' :</b><br>' + cvEch(mods) + '<br>' +
        '🧩 groupes : ' + (gs.length ? gs.join(' · ') : '<i>aucun</i>') + '<br>' +
        '📋 questionnaire : <b>' + (h.q ? 'oui' : 'non') + '</b>' + (!h.q && !h.regle ? ' (pas pour les passerelles, remises à niveau, régularisations)' : '') + '<br>' +
        '<span style="color:var(--muted)">' + (h.regle ? 'Réglé par un admin pour cette formation.' : 'Règle de base.') +
        (cvAdmin() ? ' Tu peux en faire l’habitude à l’étape suivante.' : ' Les admins le règlent par formation.') + '</span>' +
        (L.acces ? '<label class="cvCoche" style="margin-top:8px"><input type="checkbox" id="cvRepartir"' + (S.repartir ? ' checked' : '') +
          '> Repartir de ce qu’on ouvre d’habitude <span style="color:var(--muted)">(sinon, ce qui est ouvert aujourd’hui)</span></label>' : '');
      const rp = corps.querySelector('#cvRepartir');
      if(rp) rp.addEventListener('change', () => { S.repartir = rp.checked; });
    };
    sel.addEventListener('change', () => { S.formation = sel.value; if(L.acces){ S.repartir = true; } resume(); });
    resume();
    bas.appendChild(cvBouton('Annuler', 'btn-secondary', W.fermer));
    const b = cvBouton('Suivant ›', 'btn-primary', () => {
      S.formation = sel.value;
      if(S.repartir || !S.E || S.formationVue !== null && S.formationVue !== S.formation) appliquerHabitude();
      S.formationVue = S.formation;
      etape2();
    });
    b.dataset.suivant = '1';
    bas.appendChild(b);
  };

  const etape2 = () => {
    S.n = 2; dessinerEtapes(); bas.innerHTML = ''; corps.innerHTML = '';
    const redessiner = () => etape2();
    const h1 = document.createElement('div'); h1.className = 'cvH'; h1.style.marginTop = '0'; h1.textContent = 'Ce qu’il trouve dans son espace';
    corps.appendChild(h1);
    corps.appendChild(cvGrilleModules(S.E, (cle) => { if(cvBasculer(S.E, cle)) redessiner(); }));
    const h2 = document.createElement('div'); h2.className = 'cvH'; h2.textContent = '🧩 Ses groupes';
    corps.appendChild(h2);
    corps.appendChild(cvGrilleGroupes(S.E, L.groupes, L.prog, S.formation, (id) => {
      const i = S.E.groupes.indexOf(id);
      if(i === -1) S.E.groupes.push(id); else S.E.groupes.splice(i, 1);
      if(S.E.groupes.length && S.E.mods.indexOf('parcours') === -1) S.E.mods.push('parcours');
      redessiner();
    }, true));
    if(cvAdmin() && S.formation){
      const c = document.createElement('label');
      c.className = 'cvCoche';
      c.style.marginTop = '12px';
      c.innerHTML = '<input type="checkbox" id="cvHabitude"' + (S.habitude ? ' checked' : '') + '> ⭐ En faire l’habitude pour « ' + cvEch(S.formation) + ' »';
      c.querySelector('input').addEventListener('change', e => { S.habitude = e.target.checked; });
      corps.appendChild(c);
    }
    const etat = document.createElement('div'); etat.className = 'cvEtat'; corps.appendChild(etat);
    bas.appendChild(cvBouton('‹ Retour', 'btn-secondary', etape1));
    const b = cvBouton(L.acces ? 'Enregistrer › le message' : 'Ouvrir son espace ›', 'btn-primary', async () => {
      if(b.disabled) return;
      b.disabled = true;
      etat.style.color = 'var(--muted)'; etat.textContent = '⏳ Enregistrement…';
      try{
        const rep = await appelPrep({ action: 'accesEleveSet', eleve: nom, modules: cvListeModules(S.E), groupes: S.E.groupes.join('|') });
        if(rep && rep.status === 'error') throw new Error(rep.message || 'refusé');
        if(rep && rep.code && typeof retenirCodeEleve === 'function') retenirCodeEleve(nom, rep.code);
        if(!L.acces) L.acces = { eleve: nom, actif: true, modules: cvListeModules(S.E), groupes: S.E.groupes.slice() };
        else { L.acces.modules = cvListeModules(S.E); L.acces.groupes = S.E.groupes.slice(); }
        if(S.habitude && cvAdmin() && S.formation){
          try{ await cvPoserHabitude(S.formation, { modules: S.E.mods.filter(k => k !== 'messages'), q: S.E.q, groupes: S.E.groupes }); }
          catch(e){ showToast('Habitude non enregistrée : ' + e.message); }
        }
        S.code = await codeDeLEleve(nom);
        if(S.adresse === null) S.adresse = await cvAdresseDe(nom);
        S.fini = await cvSalleFinie(nom);
        etape3();
      }catch(e){
        etat.style.color = 'var(--red)'; etat.textContent = '❌ ' + e.message;
        b.disabled = false;
      }
    });
    b.dataset.suivant = '1';
    bas.appendChild(b);
  };

  const etape3 = () => {
    S.n = 3; dessinerEtapes(); bas.innerHTML = ''; corps.innerHTML = '';
    const ok = document.createElement('div');
    ok.style.cssText = 'font-size:12.5px;color:var(--accent-text);font-weight:700;margin-bottom:8px;';
    ok.textContent = '✅ Son espace est ouvert. Envoie-lui le message — ou ferme, et envoie-le plus tard depuis sa carte.';
    corps.appendChild(ok);
    const z = cvCorpsMail(corps, cvTexteAcces({ nom: (L.acces && L.acces.eleve) || nom, code: S.code, E: S.E, groupes: L.groupes, prog: L.prog, salleFinie: S.fini }),
                          S.adresse, true);
    bas.appendChild(cvBouton('‹ Retour', 'btn-secondary', etape2));
    bas.appendChild(cvBouton('📋 Copier', 'btn-secondary', async () => {
      try{ await navigator.clipboard.writeText(z.querySelector('#cvTexte').value); showToast('Message copié ✅'); }
      catch(e){ showToast('Copie impossible'); }
    }));
    const bOk = cvBouton('✉️ Envoyer', 'btn-primary', async () => {
      if(bOk.disabled) return;
      bOk.disabled = true;
      const parti = await cvEnvoyer(nom, z, S.adresse);
      if(parti && !z.querySelector('#cvEtatMail').textContent.startsWith('❌')) fin();
      else bOk.disabled = false;
    });
    bOk.dataset.envoyer = '1';
    bas.appendChild(bOk);
    const f = document.createElement('div');
    f.style.cssText = 'text-align:center;width:100%;';
    f.appendChild(cvBouton('Fermer sans envoyer', 'cvLien', fin));
    bas.appendChild(f);
  };

  etape1();
}

/* ============================================================
   ⚙️ CE QU'ON OUVRE PAR FORMATION — les admins
   ============================================================ */
async function fenetreHabitudesCoinRevisions(formationDepart){
  if(!cvAdmin()){ showToast('Réservé aux administrateurs.'); return; }
  const W = cvBoite('⚙️ Ce qu’on ouvre par formation', true);
  const corps = document.createElement('div');
  corps.innerHTML = '<div style="font-size:13px;color:var(--muted);">Lecture…</div>';
  W.boite.appendChild(corps);
  let groupes = [], prog = { groupes: [], regles: {} };
  try{
    if(typeof chargerModelesTexte === 'function') await chargerModelesTexte(true);
    const d = await appelPrep({ action: 'parcoursList' });
    groupes = (d && d.groupes) || []; prog = (d && d.salle) || prog;
  }catch(e){ corps.innerHTML = '<div style="color:var(--red)">❌ ' + cvEch(e.message) + '</div>'; return; }
  const liste = (typeof toutesLesFormations === 'function') ? toutesLesFormations() : [];
  let formation = formationDepart || (liste[0] && liste[0].cle) || '';
  let E = null;
  const charger = () => { const h = cvHabitudeDe(formation, groupes, prog); E = { mods: h.modules.slice(), q: h.q, groupes: h.groupes.slice(), autres: [], regle: h.regle }; };
  const dessiner = () => {
    corps.innerHTML =
      '<div style="font-size:13px;line-height:1.55;margin-bottom:10px">Ce que la mise en route ouvre d’habitude pour une formation. On ajuste toujours élève par élève ensuite.</div>' +
      '<label for="cvHF">Formation</label><select id="cvHF" style="width:100%;margin:0 0 6px">' +
      liste.map(f => '<option value="' + cvEch(f.cle) + '">' + cvEch(f.nom) + '</option>').join('') + '</select>' +
      '<div style="font-size:11.5px;color:var(--muted);margin-bottom:6px">' + (E.regle ? '⭐ Réglée.' : 'Pas encore réglée : c’est la règle de base qui s’applique.') + '</div>';
    const sel = corps.querySelector('#cvHF');
    sel.value = formation;
    sel.addEventListener('change', () => { formation = sel.value; charger(); dessiner(); });
    const h1 = document.createElement('div'); h1.className = 'cvH'; h1.textContent = 'Ce qu’il trouve dans son espace'; corps.appendChild(h1);
    corps.appendChild(cvGrilleModules(E, (cle) => { if(cvBasculer(E, cle)) dessiner(); }));
    const h2 = document.createElement('div'); h2.className = 'cvH'; h2.textContent = '🧩 Ses groupes'; corps.appendChild(h2);
    corps.appendChild(cvGrilleGroupes(E, groupes.filter(g => !g.fermeLe), prog, formation, (id) => {
      const i = E.groupes.indexOf(id);
      if(i === -1) E.groupes.push(id); else E.groupes.splice(i, 1);
      if(E.groupes.length && E.mods.indexOf('parcours') === -1) E.mods.push('parcours');
      dessiner();
    }, true));
    const etat = document.createElement('div'); etat.className = 'cvEtat'; corps.appendChild(etat);
    const r = document.createElement('div'); r.className = 'btn-row'; r.style.marginTop = '12px';
    r.appendChild(cvBouton('Fermer', 'btn-secondary', W.fermer));
    const b = cvBouton('⭐ Enregistrer pour « ' + formation + ' »', 'btn-primary', async () => {
      b.disabled = true;
      try{
        await cvPoserHabitude(formation, { modules: E.mods.filter(k => k !== 'messages'), q: E.q, groupes: E.groupes });
        E.regle = true;
        showToast('Habitude enregistrée ✅');
        dessiner();
      }catch(e){ etat.style.color = 'var(--red)'; etat.textContent = '❌ ' + e.message; b.disabled = false; }
    });
    r.appendChild(b);
    corps.appendChild(r);
  };
  charger();
  dessiner();
}

/* ============================================================
   🔑 LA CARTE (A du schéma) — l'onglet 🔑 de sa fiche
   ============================================================ */
async function afficherEspaceEleve(nom, zone){
  if(!zone || !nom) return;
  cvStyle();
  zone.innerHTML = '<div style="font-size:12px;color:var(--muted);">Lecture de son accès…</div>';

  let L;
  try{ L = await cvLire(nom); }
  catch(e){ zone.innerHTML = ''; return; }
  zone.innerHTML = '';
  const redessiner = () => afficherEspaceEleve(nom, zone);
  const acces = L.acces;
  const carte = document.createElement('div');
  carte.className = 'cvC' + (acces && acces.actif ? '' : ' ferme');

  /* ── pas encore d'espace : la mise en route ── */
  if(!acces){
    carte.innerHTML = '<div style="font-size:13px;line-height:1.5;"><strong>🔒 Pas encore de coin révisions</strong>' +
      '<div style="font-size:11px;color:var(--muted);margin-top:2px;">Ses vidéos, son prochain cours, ses leçons, la messagerie : tout se règle en trois étapes, et le message part à la fin.</div></div>';
    const b = cvBouton('🧭 Mettre en route son espace', 'btn-primary', () => miseEnRouteCoinRevisions(nom, redessiner));
    b.dataset.miseEnRoute = '1';
    b.style.cssText = 'margin-top:10px;padding:11px;font-size:13px;';
    carte.appendChild(b);
    zone.appendChild(carte);
    return;
  }

  const E = cvEtatDeLAcces(acces);

  /* ── l'en-tête : état, formation, code ── */
  const t = document.createElement('div');
  t.className = 'cvT';
  t.innerHTML = '<div class="n"><strong>' + (acces.actif ? '🔓' : '🔒') + ' Coin révisions</strong><small>' +
      (acces.derniereVisite ? 'vu le ' + cvEch(acces.derniereVisite) : 'jamais venu') +
      (L.formation ? ' · ' + cvEch(L.formation) : '') +
      (acces.langue ? ' · 🌍 ' + cvEch(acces.langue) : '') + '</small></div>' +
    /* ⚠️ MASQUÉ, RÉVÉLÉ AU CLIC — le code se demande pour cet élève-là,
       et la demande laisse une trace au journal (accesEleveCode). */
    '<code data-code class="cvCode" title="Afficher le code">••••••</code>';
  const bCode = cvBouton('👁️ Code', 'btn-secondary');
  bCode.style.cssText = 'width:auto;margin:0;padding:6px 10px;font-size:12px;';
  t.appendChild(bCode);
  carte.appendChild(t);
  const zCode = t.querySelector('[data-code]');
  const montrerCode = async () => {
    try{ zCode.textContent = await codeDeLEleve(nom); }
    catch(e){ showToast('Code illisible : ' + e.message); }
  };
  zCode.addEventListener('click', montrerCode);
  bCode.addEventListener('click', montrerCode);

  /* ── ✉️ lui envoyer son accès · 👀 lui montrer son espace ── */
  const bt = document.createElement('div');
  bt.className = 'cvBtns';
  const bEnv = cvBouton('✉️ Lui envoyer son accès', 'btn-primary', () => fenetreAccesEleve(nom));
  bEnv.dataset.envoyerAcces = '1';
  bt.appendChild(bEnv);
  /* 👀 v1256 — ouvrir son espace pour le lui montrer. SON CODE NE PASSE
     PAS PAR ICI : le Worker rend un ticket (deux minutes, une seule fois)
     que la page élève échange contre une session de démonstration.
     L'onglet s'ouvre AVANT l'appel (sinon le navigateur le bloquerait). */
  if(acces.actif){
    const w = document.createElement('div');
    const bM = cvBouton('👀 Ouvrir son espace pour le lui montrer', 'btn-secondary');
    bM.setAttribute('data-montrer-espace', '1');
    const aideM = document.createElement('div');
    aideM.className = 'cvAide';
    aideM.textContent = 'Dans un nouvel onglet, comme il le voit. Rien n’est envoyé ni enregistré à son nom.';
    bM.addEventListener('click', async () => {
      const fen = window.open('about:blank', '_blank');
      bM.disabled = true;
      try{
        const d = await appelPrep({ action: 'eleveAccompagner', eleve: nom });
        if(!d || !d.ticket) throw new Error((d && d.message) || 'pas de ticket');
        const adresse = String(CONFIG.LIEN_ELEVE || 'eleve.html').split('#')[0] + '#accompagner=' + d.ticket;
        if(fen && !fen.closed){ try{ fen.opener = null; }catch(e){} fen.location.href = adresse; }
        else window.open(adresse, '_blank', 'noopener');
      }catch(e){
        try{ if(fen) fen.close(); }catch(x){}
        showToast('Impossible : ' + e.message);
      }finally{ bM.disabled = false; }
    });
    w.appendChild(bM);
    w.appendChild(aideM);
    bt.appendChild(w);
  }
  carte.appendChild(bt);

  /* ── un seul enregistrement, dans l'ordre des appuis ── */
  const etat = document.createElement('div');
  etat.className = 'cvEtat';
  let file = Promise.resolve();
  const enregistrer = (avant, apresOk) => {
    file = file.then(async () => {
      etat.style.color = 'var(--muted)'; etat.textContent = '⏳ Enregistrement…';
      try{
        const rep = await appelPrep({ action: 'accesEleveSet', eleve: nom, modules: cvListeModules(E), groupes: E.groupes.join('|') });
        if(rep && rep.status === 'error') throw new Error(rep.message || 'refusé');
        acces.modules = cvListeModules(E); acces.groupes = E.groupes.slice();
        etat.style.color = 'var(--accent-text)'; etat.textContent = '✅ Enregistré';
        if(apresOk) apresOk();
      }catch(e){
        Object.assign(E, avant);
        etat.style.color = 'var(--red)'; etat.textContent = '❌ ' + e.message;
        dessinerTuiles();
      }
    });
    return file;
  };
  const copie = () => ({ mods: E.mods.slice(), q: E.q, groupes: E.groupes.slice(), autres: E.autres.slice() });

  /* ── ce qu'il trouve dans son espace ── */
  const h1 = document.createElement('div');
  h1.className = 'cvH';
  h1.innerHTML = 'Ce qu’il trouve dans son espace <small>· un appui ouvre ou ferme, c’est enregistré</small>';
  carte.appendChild(h1);
  const zMods = document.createElement('div');
  carte.appendChild(zMods);

  /* ── ses groupes ── */
  const h2 = document.createElement('div');
  h2.className = 'cvH';
  carte.appendChild(h2);
  const zGrp = document.createElement('div');
  carte.appendChild(zGrp);
  const zSalle = document.createElement('div');
  carte.appendChild(zSalle);
  carte.appendChild(etat);

  const habitude = cvHabitudeDe(L.formation, L.groupes, L.prog);
  const dessinerSalle = () => {
    if(typeof ligneSalleFiche === 'function') ligneSalleFiche(nom, zSalle, { salleCochee: cvSalleCochee(E, L.prog).length > 0 });
  };
  const dessinerTuiles = () => {
    zMods.innerHTML = '';
    zMods.appendChild(cvGrilleModules(E, (cle) => {
      const avant = copie();
      if(!cvBasculer(E, cle)) return;
      dessinerTuiles();
      enregistrer(avant);
    }));
    const n = E.groupes.length;
    h2.innerHTML = '🧩 Ses groupes <small>· ' + (n ? n + ' ouvert' + (n > 1 ? 's' : '') : 'aucun ouvert — c’est toi qui ouvres') + '</small>';
    if(habitude.groupes.length || habitude.regle){
      const bP = cvBouton('🧩 Ce que prévoit sa formation (' + habitude.groupes.length + ')', 'btn-secondary', async () => {
        const noms = L.groupes.filter(g => habitude.groupes.indexOf(g.id) !== -1).map(g => g.nom);
        if(!await confirmer('Remettre ce qu’on ouvre d’habitude pour « ' + (L.formation || '?') + ' » ?\n\n' +
            '🧩 ' + (noms.length ? noms.join(', ') : 'aucun groupe') + '\n' +
            CV_TUILES.filter(t => !t.fixe && t.cle !== 'questionnaire' && habitude.modules.indexOf(t.cle) !== -1).map(t => t.i + ' ' + t.t).join(' · ') + '\n' +
            '📋 questionnaire : ' + (habitude.q ? 'oui' : 'non'), '🧩 Ce que prévoit sa formation')) return;
        const avant = copie();
        E.mods = habitude.modules.slice(); E.q = habitude.q; E.groupes = habitude.groupes.slice();
        dessinerTuiles();
        enregistrer(avant, dessinerSalle);
      });
      bP.dataset.prevoit = '1';
      h2.appendChild(bP);
    }
    zGrp.innerHTML = '';
    if(!L.lu){
      zGrp.innerHTML = '<div style="font-size:11.5px;color:var(--muted);">Groupes illisibles pour l’instant.</div>';
      return;
    }
    zGrp.appendChild(cvGrilleGroupes(E, L.groupes, L.prog, L.formation, (id) => {
      const avant = copie();
      const i = E.groupes.indexOf(id);
      if(i === -1) E.groupes.push(id); else E.groupes.splice(i, 1);
      /* ⚠️ LE MODULE SUIT LE GROUPE (v1039) : un groupe ouvert chez quelqu'un
         dont le parcours est fermé, c'est un accès qui ne montre rien. */
      if(E.groupes.length && E.mods.indexOf('parcours') === -1) E.mods.push('parcours');
      dessinerTuiles();
      enregistrer(avant, dessinerSalle);
    }, false));
  };
  dessinerTuiles();
  dessinerSalle();

  /* ── le bas : ouvert le…, refaire la mise en route, réglage, départ ── */
  const basC = document.createElement('div');
  basC.className = 'cvBas';
  const gauche = document.createElement('span');
  gauche.style.cssText = 'flex:1;min-width:120px;';
  gauche.textContent = acces.creeLe ? 'Ouvert le ' + String(acces.creeLe).split(' ')[0] : '';
  basC.appendChild(gauche);
  const bRe = cvBouton('🧭 Refaire la mise en route', 'cvLien', () => miseEnRouteCoinRevisions(nom, redessiner));
  bRe.dataset.miseEnRoute = '1';
  basC.appendChild(bRe);
  if(cvAdmin()) basC.appendChild(cvBouton('⚙️ Ce qu’on ouvre par formation', 'cvLien', () => fenetreHabitudesCoinRevisions(L.formation)));

  /* 🚪 IL A QUITTÉ L'AUTO-ÉCOLE — v1038. ÇA FERME, ÇA N'EFFACE PAS : son
     dossier, sa progression et ses récitations restent. Fermé par le
     permis : rien à rouvrir ici. */
  if(acces.sorti === 'permis'){
    const f = document.createElement('span');
    f.style.cssText = 'color:var(--accent-text);font-weight:700;';
    f.textContent = '🏁 Il a son permis : son coin révisions s’est fermé tout seul.';
    basC.appendChild(f);
  }else{
    const parti = acces.sorti === 'parti';
    if(parti){
      const q = document.createElement('div');
      q.style.cssText = 'width:100%;font-size:12px;color:var(--warn-text);line-height:1.5;';
      q.textContent = '🚪 Il a quitté l’auto-école : son coin révisions est fermé. Son dossier, lui, est intact.';
      basC.insertBefore(q, basC.firstChild);
    }
    const bD = cvBouton(parti ? '↩️ Il est revenu' : '🚪 Il a quitté l’auto-école', 'cvLien' + (parti ? '' : ' rouge'), async () => {
      if(!parti && !await confirmer(
          'Noter que ' + nom + ' a quitté l’auto-école ?\n\n' +
          'Son coin révisions se ferme tout de suite : plus de parcours, plus de procédures, plus d’historique.\n\n' +
          'Son dossier et sa progression RESTENT — ça se défait.')) return;
      bD.disabled = true;
      try{
        await appelPrep({ action: 'eleveDepart', eleve: nom, parti: parti ? 'non' : 'oui' });
        showToast(parti ? 'Son accès est rouvert ✅' : 'Départ noté ✅');
        redessiner();
      }catch(e){ showToast('Impossible : ' + e.message); bD.disabled = false; }
    });
    bD.dataset.depart = '1';
    basC.appendChild(bD);
  }
  carte.appendChild(basC);
  zone.appendChild(carte);
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-coin-revisions.js'] = true;
