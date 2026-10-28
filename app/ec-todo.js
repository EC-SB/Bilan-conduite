/* Déployé le 28/10/2026 à 08:24 — v1284 */
/* ============================================================
   ec-todo.js — v1278
   ☑️ La todo list : le bouton à côté du 💬, et son volet.

   David, le 27 octobre : « à côté du logo de messagerie en haut, met
   moi un autre bouton qui ouvre une todo list simple, j'ai besoin de
   cette partie de choisir qui la voit. La todo list doit avoir des
   listes perso et des listes partagées. Il faut une liste que l'on
   partage avec le bureau avec les choses à faire tous les jours et qui
   se met à jour tous les matins où chacun dit ce qu'il fait dans sa
   journée. »

   Trois vues dans le volet :
   · 🏢 Bureau · aujourd'hui — « 🔁 Tous les jours » (décoché chaque
     matin à 6h, « ⚠️ pas fait hier ») et « 🗓️ Ma journée » (des lignes
     à cocher + un texte libre, chacun la sienne, tout le monde voit) ;
   · 👤 Mes listes — à soi seul ;
   · 👥 Partagées — avec les personnes choisies ; une tâche peut être
     « pour » quelqu'un (la seule notification).
   ⚙️ : les tâches de tous les jours, une liste pour les deux bureaux
   (bureau et administrateurs). La case « ☑️ À faire » de ⚙️ Accès
   décide qui voit le bouton — le Worker répond, c'est lui qui tranche.
   Suffixe « TD ».
   ============================================================ */

const TD = { d: null, vue: 'bureau', reglage: false, hier: null, voirHier: false, ouvertes: {}, edition: '', creation: '',
             equipe: [], ouvert: false, charge: 0, enCours: null };
const JOURS_TD = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const NOMS_JOURS_TD = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

function normTD(t){ return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function elTD(tag, cls, txt){ const e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }
function boutonTD(txt, cls, titre, faire){
  const b = elTD('button', 'btn ' + (cls || 'btn-secondary'), txt);
  b.type = 'button';
  if(titre) b.title = titre;
  /* un bouton cliqué (ou « Entrée ») : on quitte le champ, sinon le volet ne se redessine pas */
  if(faire) b.addEventListener('click', ev => {
    ev.stopPropagation();
    const a = document.activeElement;
    if(a && a !== b && a.dataset && a.dataset.tdGarde) a.blur();
    faire(ev, b);
  });
  return b;
}
function heureTD(ms){ return ms ? new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''; }
function quandTD(ms){
  if(!ms) return '';
  const d = new Date(ms), a = new Date();
  if(d.toDateString() === a.toDateString()) return heureTD(ms);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}
function jourDitTD(iso){ return iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : ''; }
function jourLongTD(iso){ const t = new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1); }
function initialesTD(n){ const m = String(n || '').trim().split(/\s+/); return ((m[0] || '').slice(0, 1) + (m[1] || m[0] || '').slice(0, 1)).toUpperCase(); }
function rondTD(n){ const r = elTD('span', 'tdRond', initialesTD(n)); r.title = n; return r; }
function toastTD(t){ if(typeof showToast === 'function') showToast(t); }

/* ---------- les données ---------- */
async function chargerTD(avecEquipe){
  if(typeof appelPrep !== 'function') return null;
  if(TD.enCours) return TD.enCours;
  TD.enCours = (async () => {
    try{
      const d = await appelPrep({ action: 'todoTout', equipe: !!avecEquipe || !TD.equipe.length });
      if(d && d.status === 'ok'){ poserTD(d); montrerBoutonTD(true); }
      return d;
    }catch(e){
      if(/Accès refusé|droit/i.test((e && e.message) || '')) montrerBoutonTD(false);
      return null;
    }finally{ TD.enCours = null; }
  })();
  return TD.enCours;
}
function poserTD(d){
  if(!d || d.status !== 'ok') return;
  if(d.equipe && d.equipe.length) TD.equipe = d.equipe;
  /* 🔁 v1281 — relu toutes les 10 s volet ouvert : on ne redessine que
     si quelque chose a changé (sinon le volet clignote) */
  const empreinte = JSON.stringify([d.jour, d.quotidien, d.journee, d.listes, d.toutesQuotidiennes]);
  const pareil = empreinte === TD.empreinte;
  TD.empreinte = empreinte;
  TD.d = d;
  TD.charge = Date.now();
  majPastilleTD();
  if(TD.ouvert && !pareil){ if(occupeTD()) TD.retenu = true; else dessinerTD(); }
}
/* On écrit, on modifie une tâche, on crée une liste : la relecture
   attend, pour ne rien effacer sous les doigts */
function occupeTD(){
  const z = $('todoCorps'), f = document.activeElement;
  return !!(TD.edition || TD.creation || TD.reglage || (z && f && z.contains(f) && /^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName)));
}
/* La pastille : ce que dit le Worker, plus les tâches sous condition
   qui ont quelque chose à faire (seule l'appli connaît les tuiles) */
function majPastilleTD(){
  const d = TD.d;
  if(!d) return;
  let c = Number(d.compte) || 0;
  (d.quotidien || []).forEach(x => { if(x.condition && !x.faitLe){ const v = valeurConditionTD(x.condition); if(v && v.n > 0) c++; } });
  const n = $('todoBtnN');
  if(n){ n.textContent = c > 99 ? '99+' : String(c || ''); n.style.display = c ? 'inline-block' : 'none'; }
}

/* ⚡ v1281 — LES TÂCHES SOUS CONDITION. David : « mettre une condition,
   par exemple s'il y a des résultats d'examen à renseigner, la tâche
   faire les post-permis ». Une tâche de tous les jours peut dépendre
   d'une TUILE de l'appli (Permis, Suivi, Moto…) : elle n'apparaît que
   si la tuile compte quelque chose, avec le nombre. La clé gardée est
   « onglet|tuile ». */
function tuilesPourConditionTD(){
  const out = [];
  if(typeof TUILES === 'undefined' || typeof tuilesDeLOnglet !== 'function') return out;
  Object.keys(TUILES).forEach(o => {
    let l = [];
    try{ l = tuilesDeLOnglet(o).liste; }catch(e){ l = []; }
    l.forEach(t => {
      const k = typeof cleDeLaTuile === 'function' ? cleDeLaTuile(t) : String(t.cle || t.cpt || '');
      if(k && t.lib) out.push({ cle: o + '|' + k, onglet: o, t: t, lib: t.lib });
    });
  });
  return out;
}
const NOMS_ONGLETS_TD = { permis: 'Permis', suivi: 'Suivi', eleves: 'Élèves', outils: 'Outils', gestion: 'Gestion', cours: 'Cours', messagerie: 'Messagerie' };
function tuileDeConditionTD(cle){ return tuilesPourConditionTD().find(x => x.cle === cle) || null; }
function valeurConditionTD(cle){
  const x = tuileDeConditionTD(cle);
  if(!x) return null;
  let v = null;
  try{ v = valeurDeLaTuile(x.t); }catch(e){ v = null; }
  if(v === false) return { n: 0 };
  return v && typeof v.n === 'number' ? v : null;
}
/* Une tuile pas encore lue : on charge le bureau en silence, une fois
   toutes les 10 minutes au plus (c'est ce que fait l'onglet Permis) */
function chargerLesTuilesTD(){
  if(Date.now() - (TD.tuilesLues || 0) < 10 * 60000) return;
  TD.tuilesLues = Date.now();
  try{ if(typeof afficherBureau === 'function') Promise.resolve(afficherBureau(true)).then(() => { majPastilleTD(); if(TD.ouvert) dessinerTD(); }).catch(() => {}); }catch(e){}
}
async function agirTD(corps, bouton){
  if(bouton) bouton.disabled = true;
  try{
    const d = await appelPrep(corps);
    poserTD(d);
    return d;
  }catch(e){
    toastTD('Impossible : ' + ((e && e.message) || e));
    if(bouton) bouton.disabled = false;
    return null;
  }
}

/* ---------- le bouton et le volet ---------- */
function montrerBoutonTD(oui){
  const b = $('todoBtn');
  if(b) b.style.display = oui ? 'inline-flex' : 'none';
  if(!oui && TD.ouvert) fermerTD();
}
function ouvrirTD(vue){
  const a = $('todoTiroir'), v = $('todoVoile');
  if(!a) return;
  if(vue) TD.vue = vue;
  TD.ouvert = true;
  a.style.transform = 'translateX(0)';
  /* v1279 — l'ombre seulement ouvert : fermé, elle débordait au bord de l'écran */
  a.style.boxShadow = '-8px 0 24px rgba(0,0,0,.18)';
  if(v) v.style.display = 'block';
  if(typeof fermerTiroirMessagerie === 'function' && typeof tiroirOuvertEC !== 'undefined' && tiroirOuvertEC) fermerTiroirMessagerie();
  dessinerTD();
  chargerTD(!TD.equipe.length).then(() => reprendreLesTachesTD());
}
function fermerTD(){
  const a = $('todoTiroir'), v = $('todoVoile');
  TD.ouvert = false;
  if(a){ a.style.transform = 'translateX(100%)'; a.style.boxShadow = 'none'; }
  if(v) v.style.display = 'none';
}
function basculerTD(){ if(TD.ouvert) fermerTD(); else ouvrirTD(); }

/* ---------- le dessin ---------- */
function dessinerTD(){
  const z = $('todoCorps');
  if(!z) return;
  const f = document.activeElement;
  /* pas pendant qu'on écrit (le texte de sa journée, une tâche qu'on modifie) */
  if(f && z.contains(f) && f.dataset.tdGarde) return;
  TD.retenu = false;
  const d = TD.d;
  const reg = $('todoRegler');
  if(reg) reg.style.display = d && d.peutRegler ? '' : 'none';
  const haut = z.scrollTop;
  z.innerHTML = '';
  if(!d){ z.appendChild(elTD('div', 'empty', 'Lecture…')); return; }
  if(TD.reglage){ dessinerReglageTD(z, d); z.scrollTop = haut; return; }
  const ong = elTD('div', 'tdOnglets');
  const reste = (d.quotidien || []).filter(x => !x.faitLe).length;
  [['bureau', '🏢 Bureau · aujourd’hui', reste], ['perso', '👤 Mes listes', 0], ['partage', '👥 Partagées', 0]].forEach(([k, t, n]) => {
    const b = boutonTD('', 'tdOnglet' + (TD.vue === k ? ' on' : ''), '', () => { TD.vue = k; TD.creation = ''; TD.edition = ''; dessinerTD(); });
    b.textContent = t;
    if(n) b.appendChild(elTD('b', 'tdOngletN', String(n)));
    ong.appendChild(b);
  });
  z.appendChild(ong);
  if(TD.vue === 'bureau') dessinerBureauTD(z, d);
  else dessinerListesTD(z, d, TD.vue);
  z.scrollTop = haut;
}

function sectionTD(z, titre, sous){
  const s = elTD('div', 'tdSect', titre);
  if(sous) s.appendChild(elTD('span', 'tdSectSous', ' ' + sous));
  z.appendChild(s);
}
function caseTD(fait, faire, titre){
  const b = boutonTD(fait ? '☑' : '☐', 'tdCase' + (fait ? ' fait' : ''), titre || (fait ? 'Décocher' : 'C’est fait'), faire);
  b.setAttribute('role', 'checkbox');
  b.setAttribute('aria-checked', fait ? 'true' : 'false');
  return b;
}
function ligneAjoutTD(ph, faire, id){
  const r = elTD('div', 'tdAjout');
  const i = document.createElement('input');
  i.type = 'text';
  i.placeholder = ph;
  i.maxLength = 300;
  i.dataset.tdGarde = '1';
  if(id) i.id = id;
  const ok = boutonTD('＋', 'btn-primary', 'Ajouter', async (ev, b) => {
    const t = i.value.trim();
    if(!t){ i.focus(); return; }
    i.blur();
    const r2 = await faire(t, b);
    if(r2){ i.value = ''; b.disabled = false; setTimeout(() => { const j = id && $(id); if(j) j.focus(); }, 30); }
  });
  i.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); ok.click(); } });
  r.appendChild(i);
  r.appendChild(ok);
  return r;
}

/* 🏢 Bureau · aujourd'hui */
function dessinerBureauTD(z, d){
  const t = elTD('div', 'tdJour');
  t.appendChild(elTD('b', '', jourLongTD(d.jour)));
  t.appendChild(elTD('span', 'tdSous', 'remise à zéro chaque matin à 6h'));
  z.appendChild(t);
  const q = d.quotidien || [];
  sectionTD(z, '🔁 Tous les jours', '— ' + q.filter(x => x.faitLe).length + ' / ' + q.length + ' faites');
  if(!q.length){
    z.appendChild(elTD('div', 'tdVide', d.peutRegler ? 'Aucune tâche de tous les jours pour aujourd’hui : ⚙️ pour les écrire.' : 'Aucune tâche de tous les jours pour aujourd’hui.'));
  }
  /* ✅ v1284 — David : « quand quelque chose est fait, il faut qu'il
     descende pour voir les choses pas encore faites en haut » */
  q.slice().sort((a, b) => (a.faitLe ? 1 : 0) - (b.faitLe ? 1 : 0) || (a.faitLe && b.faitLe ? a.faitLe - b.faitLe : 0)).forEach(x => {
    /* ⚡ sous condition : cachée quand la tuile ne compte rien */
    let compteCond = null;
    if(x.condition){
      const v = valeurConditionTD(x.condition);
      if(v === null) chargerLesTuilesTD();
      else if(!(v.n > 0) && !x.faitLe) return;
      compteCond = v;
    }
    const r = elTD('div', 'tdItem' + (x.faitLe ? ' fait' : '') + (x.pasFaitHier && !x.faitLe ? ' hier' : ''));
    r.appendChild(caseTD(!!x.faitLe, (ev, b) => agirTD({ action: 'todoQuotidienCocher', id: x.id, fait: !x.faitLe }, b)));
    const tx = elTD('div', 'tdTexte');
    tx.appendChild(elTD('span', 'tdLibelle', x.texte + (compteCond && compteCond.n > 0 && !x.faitLe ? ' (' + compteCond.n + ')' : '')));
    if(x.condition){
      const tu = tuileDeConditionTD(x.condition);
      const lien = elTD('div', 'tdCond', '⚡ ' + (tu ? tu.lib + (compteCond ? '' : ' — pas encore lue') : 'tuile introuvable ici'));
      if(tu && typeof ouvrirLaTuile === 'function'){
        lien.classList.add('lien'); lien.title = 'Ouvrir « ' + tu.lib + ' »';
        lien.addEventListener('click', ev => { ev.stopPropagation(); fermerTD(); try{ afficherOnglet(tu.onglet); ouvrirLaTuile(tu.onglet, tu.t); }catch(e){} });
      }
      tx.appendChild(lien);
    }
    if(x.faitLe) tx.appendChild(elTD('div', 'tdSous', '✅ ' + x.faitPar + ' · ' + heureTD(x.faitLe)));
    else if(x.pasFaitHier) tx.appendChild(elTD('div', 'tdSous alerte', '⚠️ pas fait hier'));
    /* 🙋 v1279 — David : « un bouton c'est moi qui fais ça, ça se
       duplique dans ma journée et les autres voient que j'ai prévu de
       le faire ». Qui s'en occupe reste écrit tant que ce n'est pas coché. */
    const aMoi = x.prisParCle && x.prisParCle === normTD(d.moi);
    if(x.prisPar && !x.faitLe) tx.appendChild(elTD('div', 'tdPris' + (aMoi ? ' moi' : ''), '🙋 ' + (aMoi ? 'Tu t’en occupes' : x.prisPar + ' s’en occupe')));
    r.appendChild(tx);
    if(!x.faitLe && !x.prisPar)
      r.appendChild(boutonTD('🙋 C’est moi', 'tdPrendre', 'Je m’en occupe aujourd’hui : la tâche passe dans « Ma journée »',
        (ev, b) => agirTD({ action: 'todoQuotidienPrendre', id: x.id }, b)));
    else if(!x.faitLe && aMoi)
      r.appendChild(boutonTD('↩️', 'tdPetit', 'Je ne m’en occupe plus', (ev, b) => agirTD({ action: 'todoQuotidienPrendre', id: x.id, prendre: false }, b)));
    /* 🙋 v1281 — reprendre la tâche de quelqu'un, tant qu'elle n'est pas cochée */
    else if(!x.faitLe && x.prisPar)
      r.appendChild(boutonTD('🙋 Je reprends', 'tdPrendre', 'Reprendre la tâche de ' + x.prisPar + ' : elle passe dans ta journée', async (ev, b) => {
        if(typeof confirmer === 'function' && !await confirmer(x.prisPar + ' s’en occupe. Reprendre « ' + x.texte + ' » ?', 'Je reprends', false)) return;
        agirTD({ action: 'todoQuotidienPrendre', id: x.id, reprendre: true }, b);
      }));
    if(x.prisPar && !x.faitLe) r.classList.add('pris');
    z.appendChild(r);
  });
  if(d.peutRegler){
    const l = boutonTD('⚙️ Les tâches de tous les jours', 'tdLien', '', () => { TD.reglage = true; dessinerTD(); });
    z.appendChild(l);
  }

  sectionTD(z, '🗓️ Ma journée', '— chacun dit ce qu’il fait aujourd’hui');
  const moiK = normTD(d.moi);
  const pers = (d.journee || []).slice();
  if(!pers.some(p => p.cle === moiK)) pers.push({ personne: d.moi, cle: moiK, texte: '', items: [] });
  pers.sort((a, b) => (b.cle === moiK) - (a.cle === moiK) || String(a.personne).localeCompare(String(b.personne), 'fr'));
  pers.forEach(p => z.appendChild(carteJourneeTD(p, p.cle === moiK)));

  const h = boutonTD(TD.voirHier ? '📜 La journée d’hier ▾' : '📜 La journée d’hier ▸', 'tdLien', '', async () => {
    TD.voirHier = !TD.voirHier;
    if(TD.voirHier && (!TD.hier || TD.hier.jour !== d.hier)){
      try{ TD.hier = await appelPrep({ action: 'todoJournee', jour: d.hier }); }catch(e){ TD.hier = null; }
    }
    dessinerTD();
  });
  z.appendChild(h);
  if(TD.voirHier && TD.hier && TD.hier.status === 'ok'){
    const w = elTD('div', 'tdHier');
    w.appendChild(elTD('div', 'tdSous', jourLongTD(TD.hier.jour)));
    (TD.hier.quotidien || []).forEach(x => w.appendChild(elTD('div', 'tdHierLigne' + (x.faitLe ? '' : ' rate'),
      (x.faitLe ? '☑ ' : '☐ ') + x.texte + (x.faitLe ? ' — ' + x.faitPar + ' · ' + heureTD(x.faitLe) : ' — pas fait'))));
    (TD.hier.journee || []).forEach(p => w.appendChild(carteJourneeTD(p, false, true)));
    if(!(TD.hier.journee || []).length && !(TD.hier.quotidien || []).length) w.appendChild(elTD('div', 'tdVide', 'Rien d’écrit ce jour-là.'));
    z.appendChild(w);
  }
}
function carteJourneeTD(p, moi, lecture){
  const c = elTD('div', 'tdPersonne' + (moi ? ' moi' : ''));
  const t = elTD('div', 'tdPersonneTete');
  t.appendChild(rondTD(p.personne));
  t.appendChild(elTD('b', '', p.personne + (moi ? ' (toi)' : '')));
  c.appendChild(t);
  /* ✅ v1281 — David : « quand c'est barré, il faut que ça aille en bas » */
  (p.items || []).slice().sort((a, b) => (a.fait ? 1 : 0) - (b.fait ? 1 : 0) || (a.fait ? (a.faitLe || 0) - (b.faitLe || 0) : 0)).forEach(x => {
    const r = elTD('div', 'tdItem' + (x.fait ? ' fait' : ''));
    if(moi && !lecture) r.appendChild(caseTD(!!x.fait, (ev, b) => agirTD({ action: 'todoJourneeEcrire', quoi: 'cocher', id: x.id, fait: !x.fait }, b)));
    else r.appendChild(elTD('span', 'tdCase lecture' + (x.fait ? ' fait' : ''), x.fait ? '☑' : '☐'));
    const tx = elTD('div', 'tdTexte');
    tx.appendChild(elTD('span', 'tdLibelle', x.texte));
    /* ↩️ v1284 — une ligne pas cochée revient le lendemain */
    const depuis = x.depuis ? (TD.d && x.depuis === TD.d.hier ? '↩️ d’hier' : '↩️ depuis le ' + x.depuis.slice(8, 10) + '/' + x.depuis.slice(5, 7)) : '';
    if(x.fait && x.faitLe) tx.appendChild(elTD('div', 'tdSous', '✅ ' + heureTD(x.faitLe) + (x.tache ? ' · 🔁 tous les jours' : '') + (depuis ? ' · ' + depuis : '')));
    else if(x.tache) tx.appendChild(elTD('div', 'tdSous', '🔁 des tâches de tous les jours'));
    else if(lecture && x.reporte) tx.appendChild(elTD('div', 'tdSous', '↪️ reportée au lendemain'));
    else if(depuis) tx.appendChild(elTD('div', 'tdSous alerte', depuis));
    r.appendChild(tx);
    if(moi && !lecture) r.appendChild(boutonTD('✕', 'tdPetit', 'Retirer', (ev, b) => agirTD({ action: 'todoJourneeEcrire', quoi: 'retirer', id: x.id }, b)));
    c.appendChild(r);
  });
  if(moi && !lecture){
    c.appendChild(ligneAjoutTD('Qu’est-ce que tu fais aujourd’hui ?', (t, b) => agirTD({ action: 'todoJourneeEcrire', quoi: 'ajouter', texte: t }, b), 'todoMaJournee'));
    const ta = document.createElement('textarea');
    ta.className = 'tdNote';
    ta.rows = 2;
    ta.placeholder = '📝 Ta journée en quelques mots (libre)…';
    ta.value = p.texte || '';
    ta.dataset.avant = ta.value;
    ta.dataset.tdGarde = '1';
    const garder = () => {
      if(ta.value === ta.dataset.avant) return;
      ta.dataset.avant = ta.value;
      appelPrep({ action: 'todoJourneeEcrire', quoi: 'texte', texte: ta.value }).then(d => { if(TD.d && d && d.journee) TD.d.journee = d.journee; })
        .catch(e => toastTD('Texte non gardé : ' + ((e && e.message) || e)));
    };
    let minuterie = 0;
    ta.addEventListener('input', () => { clearTimeout(minuterie); minuterie = setTimeout(garder, 1500); });
    ta.addEventListener('blur', garder);
    c.appendChild(ta);
  }else if(p.texte){
    c.appendChild(elTD('div', 'tdNoteLue', p.texte));
  }
  if(!moi && !(p.items || []).length && !p.texte) c.appendChild(elTD('div', 'tdVide', 'Rien d’écrit.'));
  return c;
}

/* 👤 Mes listes · 👥 Partagées */
function dessinerListesTD(z, d, vue){
  const genre = vue === 'perso' ? 'perso' : 'partage';
  const listes = (d.listes || []).filter(l => l.genre === genre);
  sectionTD(z, genre === 'perso' ? '👤 Mes listes' : '👥 Listes partagées', genre === 'perso' ? '— toi seul les vois' : '— avec les personnes choisies');
  if(!listes.length && TD.creation !== genre){
    z.appendChild(elTD('div', 'tdVide', genre === 'perso' ? 'Aucune liste perso pour l’instant.' : 'Aucune liste partagée avec toi pour l’instant.'));
  }
  listes.forEach((l, i) => z.appendChild(carteListeTD(l, d, i === 0 && TD.ouvertes[l.id] === undefined)));
  if(TD.creation === genre) z.appendChild(formListeTD(genre, null));
  else z.appendChild(boutonTD(genre === 'perso' ? '＋ Nouvelle liste perso' : '＋ Nouvelle liste partagée', 'tdNouvelle', '', () => { TD.creation = genre; dessinerTD(); setTimeout(() => { const i = $('todoNomListe'); if(i) i.focus(); }, 30); }));
}
function carteListeTD(l, d, ouvrirParDefaut){
  const ouverte = TD.ouvertes[l.id] !== undefined ? TD.ouvertes[l.id] : ouvrirParDefaut;
  const c = elTD('div', 'tdListe');
  const t = elTD('div', 'tdListeTete');
  t.appendChild(elTD('b', 'tdListeNom', l.nom));
  if(l.genre === 'partage'){
    const rs = elTD('span', 'tdRonds');
    [l.proprio].concat(l.membres || []).slice(0, 6).forEach(n => rs.appendChild(rondTD(n)));
    t.appendChild(rs);
  }
  const reste = l.items.filter(x => !x.fait).length;
  t.appendChild(elTD('span', 'tdSous', reste ? reste + ' à faire' : (l.items.length ? 'tout est fait' : 'vide')));
  t.appendChild(elTD('span', 'tdPli', ouverte ? '▾' : '▸'));
  t.addEventListener('click', () => { TD.ouvertes[l.id] = !ouverte; dessinerTD(); });
  c.appendChild(t);
  if(!ouverte) return c;
  if(TD.edition === 'liste:' + l.id){ c.appendChild(formListeTD(l.genre, l)); return c; }
  const corps = elTD('div', 'tdItems');
  corps.dataset.liste = l.id;
  l.items.forEach(x => corps.appendChild(TD.edition === x.id ? editeurItemTD(x, l) : ligneItemTD(x, l, d)));
  c.appendChild(corps);
  c.appendChild(ligneAjoutTD('Ajouter à « ' + l.nom + ' »', (t2, b) => agirTD({ action: 'todoItemEcrire', quoi: 'ajouter', liste: l.id, texte: t2 }, b), 'todoAjout_' + l.id));
  const pied = elTD('div', 'tdListePied');
  if(l.items.some(x => x.fait)) pied.appendChild(boutonTD('🧹 Effacer les faites', 'tdLien', '', (ev, b) => agirTD({ action: 'todoListeEcrire', quoi: 'effacerFaites', id: l.id }, b)));
  if(l.aMoi || (typeof ACCES !== 'undefined' && ACCES && ACCES.role === 'admin')){
    pied.appendChild(boutonTD(l.genre === 'partage' ? '✏️ Nom et personnes' : '✏️ Renommer', 'tdLien', '', () => { TD.edition = 'liste:' + l.id; dessinerTD(); }));
    pied.appendChild(boutonTD('🗑️ Supprimer la liste', 'tdLien danger', '', async (ev, b) => {
      if(typeof confirmer === 'function' && !await confirmer('Supprimer la liste « ' + l.nom + ' » et ses ' + l.items.length + ' tâche(s) ?' +
         (l.genre === 'partage' ? '\n\nElle disparaît aussi chez ' + (l.membres || []).join(', ') + '.' : ''), 'Supprimer', true)) return;
      agirTD({ action: 'todoListeEcrire', quoi: 'supprimer', id: l.id }, b);
    }));
  }else if(l.genre === 'partage'){
    pied.appendChild(elTD('span', 'tdSous', 'liste de ' + l.proprio));
  }
  c.appendChild(pied);
  return c;
}
function ligneItemTD(x, l, d){
  const r = elTD('div', 'tdItem' + (x.fait ? ' fait' : ''));
  r.dataset.id = x.id;
  r.appendChild(caseTD(!!x.fait, (ev, b) => agirTD({ action: 'todoItemEcrire', quoi: 'cocher', id: x.id, fait: !x.fait }, b)));
  const tx = elTD('div', 'tdTexte');
  tx.appendChild(elTD('span', 'tdLibelle', x.texte));
  const sous = [];
  if(x.fait) sous.push('✅ ' + x.faitPar + ' · ' + quandTD(x.faitLe));
  else{
    if(x.pour) sous.push('👤 pour ' + (normTD(x.pour) === normTD(d.moi) ? 'toi' : x.pour));
    if(x.echeance) sous.push((x.echeance < d.jour ? '⚠️ ' : '📅 ') + jourDitTD(x.echeance) + (x.echeance < d.jour ? ' (en retard)' : x.echeance === d.jour ? ' (aujourd’hui)' : ''));
  }
  if(sous.length) tx.appendChild(elTD('div', 'tdSous' + (!x.fait && x.echeance && x.echeance < d.jour ? ' alerte' : ''), sous.join(' · ')));
  if(x.note) tx.appendChild(elTD('div', 'tdSous', x.note));
  if((x.images || []).length) tx.appendChild(vignettesTD(x, false));
  tx.addEventListener('click', () => { TD.edition = x.id; dessinerTD(); });
  tx.title = 'Modifier';
  r.appendChild(tx);
  if(!x.fait){
    const p = elTD('span', 'tdPoignee', '⠿');
    p.title = 'Glisser pour ranger';
    brancherGlisserTD(p, r, l.id);
    r.appendChild(p);
  }
  return r;
}
function editeurItemTD(x, l){
  const f = elTD('div', 'tdEdition');
  const t = document.createElement('input'); t.type = 'text'; t.value = x.texte; t.maxLength = 300; t.dataset.tdGarde = '1'; f.appendChild(t);
  const ligne = elTD('div', 'tdEditionLigne');
  const dt = document.createElement('input'); dt.type = 'date'; dt.value = x.echeance || ''; dt.title = 'Pour quand';
  ligne.appendChild(elTD('span', 'tdSous', '📅')); ligne.appendChild(dt);
  let pour = null;
  if(l.genre === 'partage'){
    pour = document.createElement('select');
    pour.appendChild(new Option('👤 pour personne en particulier', ''));
    [l.proprio].concat(l.membres || []).forEach(n => pour.appendChild(new Option('👤 pour ' + n, n)));
    pour.value = x.pour || '';
    ligne.appendChild(pour);
  }
  f.appendChild(ligne);
  const note = document.createElement('input'); note.type = 'text'; note.placeholder = 'Une précision (facultatif)'; note.value = x.note || ''; note.maxLength = 500;
  f.appendChild(note);
  /* 🖼️ v1281 — des images, collées (Ctrl+V) ou importées */
  const zi = elTD('div', 'tdImagesEd');
  /* les vignettes se refont sur place : ce qu'on a tapé dans l'éditeur reste */
  const refaire = () => {
    const av = zi.querySelector('.tdImages');
    const nv = (x.images || []).length ? vignettesTD(x, true, refaire) : null;
    if(av && nv) av.replaceWith(nv); else if(av) av.remove(); else if(nv) zi.insertBefore(nv, zi.firstChild);
  };
  refaire();
  const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.multiple = true; fi.style.display = 'none'; fi.className = 'tdFichier';
  fi.addEventListener('change', () => { ajouterImagesTD(x, [...(fi.files || [])], refaire); fi.value = ''; });
  const li = elTD('div', 'tdImagesLigne');
  li.appendChild(boutonTD('🖼️ Importer une image', 'btn-secondary tdPetitBtn', 'Choisir une image ou une photo', () => fi.click()));
  li.appendChild(elTD('span', 'tdSous', 'ou colle-la ici (Ctrl+V)'));
  zi.append(li, fi);
  f.appendChild(zi);
  f.addEventListener('paste', ev => {
    const imgs = [...((ev.clipboardData && ev.clipboardData.items) || [])].filter(i => /^image\//.test(i.type)).map(i => i.getAsFile()).filter(Boolean);
    if(!imgs.length) return;
    ev.preventDefault();
    ajouterImagesTD(x, imgs, refaire);
  });
  const b = elTD('div', 'tdEditionBoutons');
  b.appendChild(boutonTD('Enregistrer', 'btn-primary', '', async (ev, bt) => {
    TD.edition = '';
    await agirTD({ action: 'todoItemEcrire', quoi: 'modifier', id: x.id, texte: t.value, echeance: dt.value, note: note.value, pour: pour ? pour.value : undefined }, bt);
    dessinerTD();
  }));
  b.appendChild(boutonTD('Annuler', 'btn-secondary', '', () => { TD.edition = ''; dessinerTD(); }));
  b.appendChild(boutonTD('🗑️', 'btn-secondary', 'Supprimer la tâche', async (ev, bt) => { TD.edition = ''; await agirTD({ action: 'todoItemEcrire', quoi: 'supprimer', id: x.id }, bt); dessinerTD(); }));
  f.appendChild(b);
  setTimeout(() => { try{ t.focus(); }catch(e){} }, 30);
  return f;
}
/* 🖼️ Les images d'une tâche */
function vignettesTD(x, retirer, refaire){
  const w = elTD('div', 'tdImages');
  (x.images || []).forEach(im => {
    const c = elTD('span', 'tdMini');
    const i = document.createElement('img');
    i.src = im.mini || ''; i.alt = 'Image'; i.loading = 'lazy';
    c.appendChild(i);
    c.addEventListener('click', ev => { ev.stopPropagation(); voirImageTD(x, im); });
    if(retirer){
      const b = boutonTD('✕', 'tdMiniX', 'Retirer cette image', async (ev, bt) => {
        ev.stopPropagation();
        if(typeof confirmer === 'function' && !await confirmer('Retirer cette image ?', 'Retirer', true)) return;
        TD.edition = x.id;
        const d = await agirTD({ action: 'todoImageRetirer', id: x.id, cle: im.cle }, bt);
        majImagesDeTD(x, d);
        if(refaire) refaire(); else dessinerTD();
      });
      c.appendChild(b);
    }
    w.appendChild(c);
  });
  return w;
}
function imageVersJpegTD(fichier, max, qualite){
  return new Promise((ok, non) => {
    const url = URL.createObjectURL(fichier);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', qualite));
    };
    im.onerror = () => { URL.revokeObjectURL(url); non(new Error('Image illisible')); };
    im.src = url;
  });
}
function majImagesDeTD(x, d){
  const n = ((d && d.listes) || []).reduce((y, l) => y || l.items.find(i => i.id === x.id), null);
  if(n) x.images = n.images;
}
async function ajouterImagesTD(x, fichiers, refaire){
  for(const f of fichiers.slice(0, 8)){
    try{
      toastTD('🖼️ Envoi de l’image…');
      const grand = await imageVersJpegTD(f, 1600, 0.82), mini = await imageVersJpegTD(f, 240, 0.7);
      const d = await appelPrep({ action: 'todoImagePoser', id: x.id, contenu: grand, mini: mini });
      if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'Image refusée');
      TD.edition = x.id;
      poserTD(d);
      majImagesDeTD(x, d);
      if(refaire) refaire(); else { TD.retenu = false; dessinerTD(); }
    }catch(e){ toastTD('Image : ' + ((e && e.message) || e)); }
  }
}
async function voirImageTD(x, im){
  const fond = elTD('div', 'tdVisionneuse');
  const i = document.createElement('img'); i.alt = 'Image'; i.src = im.mini || '';
  fond.appendChild(i);
  fond.appendChild(elTD('div', 'tdSous', 'Toucher pour fermer'));
  fond.addEventListener('click', () => fond.remove());
  document.body.appendChild(fond);
  try{
    const d = await appelPrep({ action: 'todoImageLire', id: x.id, cle: im.cle });
    if(d && d.status === 'ok') i.src = d.donnees;
  }catch(e){ toastTD('Image : ' + ((e && e.message) || e)); }
}

function formListeTD(genre, l){
  const f = elTD('div', 'tdCreation');
  f.appendChild(elTD('div', 'tdCreationTitre', l ? '✏️ ' + l.nom : (genre === 'perso' ? '＋ Nouvelle liste perso' : '＋ Nouvelle liste partagée')));
  const n = document.createElement('input'); n.type = 'text'; n.id = 'todoNomListe'; n.placeholder = 'Nom de la liste'; n.maxLength = 80; n.value = l ? l.nom : ''; n.dataset.tdGarde = '1';
  f.appendChild(n);
  const choisis = l ? (l.membres || []).slice() : [];
  if(genre === 'partage'){
    f.appendChild(elTD('div', 'tdSous', 'Avec qui ?'));
    const ch = elTD('div', 'tdChoix');
    const moiK = normTD(TD.d && TD.d.moi);
    const proprioK = normTD(l ? l.proprio : (TD.d && TD.d.moi));
    TD.equipe.filter(p => normTD(p) !== moiK && normTD(p) !== proprioK).forEach(p => {
      const b = boutonTD(p, 'tdPuce' + (choisis.indexOf(p) !== -1 ? ' on' : ''), '', () => {
        const i = choisis.indexOf(p);
        if(i === -1) choisis.push(p); else choisis.splice(i, 1);
        b.classList.toggle('on', i === -1);
      });
      ch.appendChild(b);
    });
    if(!TD.equipe.length) ch.appendChild(elTD('span', 'tdSous', 'Lecture de l’équipe…'));
    f.appendChild(ch);
  }
  const bs = elTD('div', 'tdEditionBoutons');
  bs.appendChild(boutonTD(l ? 'Enregistrer' : 'Créer la liste', 'btn-primary', '', async (ev, b) => {
    if(!n.value.trim()){ n.focus(); return; }
    const corps = l ? { action: 'todoListeEcrire', quoi: 'modifier', id: l.id, nom: n.value, membres: genre === 'partage' ? choisis : undefined }
                    : { action: 'todoListeEcrire', quoi: 'creer', genre: genre, nom: n.value, membres: choisis };
    const r = await agirTD(corps, b);
    if(r){ TD.creation = ''; TD.edition = ''; dessinerTD(); }
  }));
  bs.appendChild(boutonTD('Annuler', 'btn-secondary', '', () => { TD.creation = ''; TD.edition = ''; dessinerTD(); }));
  f.appendChild(bs);
  n.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); bs.firstChild.click(); } });
  return f;
}

/* ⚙️ Les tâches de tous les jours */
function dessinerReglageTD(z, d){
  const h = elTD('div', 'tdReglageTete');
  h.appendChild(boutonTD('‹ Retour', 'btn-secondary', '', () => { TD.reglage = false; dessinerTD(); }));
  h.appendChild(elTD('b', '', '⚙️ Les tâches de tous les jours'));
  z.appendChild(h);
  z.appendChild(elTD('div', 'tdSous', 'Une seule liste pour Saint-Brieuc et Loudéac. Elles reviennent décochées chaque matin à 6h, les jours choisis.'));
  const zone = elTD('div', 'tdItems');
  zone.dataset.quotidien = '1';
  (d.toutesQuotidiennes || []).forEach(x => {
    const r = elTD('div', 'tdRegLigne');
    r.dataset.id = x.id;
    const haut = elTD('div', 'tdRegHaut');
    const p = elTD('span', 'tdPoignee', '⠿'); p.title = 'Glisser pour ranger';
    brancherGlisserTD(p, r, '', true);
    haut.appendChild(p);
    const t = document.createElement('input'); t.type = 'text'; t.value = x.texte; t.maxLength = 200; t.dataset.tdGarde = '1';
    t.addEventListener('change', () => agirTD({ action: 'todoQuotidienRegler', quoi: 'modifier', id: x.id, texte: t.value }));
    haut.appendChild(t);
    haut.appendChild(boutonTD('✕', 'tdPetit', 'Retirer cette tâche', async (ev, b) => {
      if(typeof confirmer === 'function' && !await confirmer('Retirer « ' + x.texte + ' » des tâches de tous les jours ?', 'Retirer', true)) return;
      agirTD({ action: 'todoQuotidienRegler', quoi: 'retirer', id: x.id }, b);
    }));
    r.appendChild(haut);
    r.appendChild(puceJoursTD(x.jours, j => agirTD({ action: 'todoQuotidienRegler', quoi: 'modifier', id: x.id, jours: j })));
    r.appendChild(choixConditionTD(x.condition || '', c => agirTD({ action: 'todoQuotidienRegler', quoi: 'modifier', id: x.id, condition: c })));
    zone.appendChild(r);
  });
  z.appendChild(zone);
  let joursNeufs = '1111110', condNeuve = '';
  const a = elTD('div', 'tdRegLigne neuve');
  a.appendChild(ligneAjoutTD('Une tâche de tous les jours', (t, b) => agirTD({ action: 'todoQuotidienRegler', quoi: 'ajouter', texte: t, jours: joursNeufs, condition: condNeuve }, b), 'todoQuotidienNeuve'));
  a.appendChild(puceJoursTD(joursNeufs, j => { joursNeufs = j; }));
  a.appendChild(choixConditionTD('', c => { condNeuve = c; }));
  z.appendChild(a);
}
function choixConditionTD(valeur, changer){
  const w = elTD('div', 'tdCondChoix');
  w.appendChild(elTD('span', 'tdSous', '⚡'));
  const s = document.createElement('select');
  s.className = 'tdCondSelect';
  s.appendChild(new Option('Tous les jours choisis, sans condition', ''));
  const groupes = {};
  tuilesPourConditionTD().forEach(x => {
    const g = NOMS_ONGLETS_TD[x.onglet] || x.onglet;
    if(!groupes[g]){ groupes[g] = document.createElement('optgroup'); groupes[g].label = 'Seulement s’il y a… (' + g + ')'; s.appendChild(groupes[g]); }
    groupes[g].appendChild(new Option(x.lib, x.cle));
  });
  if(valeur && ![...s.options].some(o => o.value === valeur)) s.appendChild(new Option('⚡ ' + valeur.split('|').pop() + ' (pas encore lue)', valeur));
  s.value = valeur || '';
  s.addEventListener('change', () => changer(s.value));
  w.appendChild(s);
  return w;
}
function puceJoursTD(jours, changer){
  const w = elTD('div', 'tdJours');
  let j = String(jours || '1111110').split('');
  JOURS_TD.forEach((lettre, k) => {
    const b = boutonTD(lettre, 'tdJourPuce' + (j[k] === '1' ? ' on' : ''), NOMS_JOURS_TD[k], () => {
      j[k] = j[k] === '1' ? '0' : '1';
      b.classList.toggle('on', j[k] === '1');
      changer(j.join(''));
    });
    w.appendChild(b);
  });
  return w;
}

/* ⠿ Ranger en glissant (doigt ou souris) */
/* ⚠️ v1281 — « le bouton pour déplacer ne fonctionne pas » : la ligne
   change de place dans la page pendant qu'on glisse, et une poignée
   déplacée perd la capture du doigt — plus aucun mouvement n'arrivait.
   On écoute désormais la fenêtre entière. */
function brancherGlisserTD(poignee, ligne, listeId, quotidien){
  poignee.style.touchAction = 'none';
  poignee.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    ev.stopPropagation();
    const parent = ligne.parentElement;
    ligne.classList.add('tdGlisse');
    const ordreAvant = [...parent.children].map(x => x.dataset.id).filter(Boolean).join();
    const bouger = e => {
      const autres = [...parent.children].filter(x => x !== ligne && x.dataset.id && !x.classList.contains('fait'));
      const avant = autres.find(x => { const r = x.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
      if(avant) parent.insertBefore(ligne, avant);
      else{
        const der = autres[autres.length - 1];
        if(der) parent.insertBefore(ligne, der.nextSibling);
      }
    };
    const lacher = () => {
      window.removeEventListener('pointermove', bouger);
      window.removeEventListener('pointerup', lacher);
      window.removeEventListener('pointercancel', lacher);
      ligne.classList.remove('tdGlisse');
      const ids = [...parent.children].map(x => x.dataset.id).filter(Boolean);
      if(ids.join() === ordreAvant) return;
      if(quotidien) agirTD({ action: 'todoQuotidienRegler', quoi: 'ordre', ids: ids });
      else agirTD({ action: 'todoItemEcrire', quoi: 'ordre', id: ligne.dataset.id, ids: ids });
    };
    window.addEventListener('pointermove', bouger);
    window.addEventListener('pointerup', lacher);
    window.addEventListener('pointercancel', lacher);
  });
}

/* Les ✅ Tâches du bureau d'avant, reprises une fois dans « 🏢 Bureau »
   (David : « tu mets dans liste partagée bureau ») */
async function reprendreLesTachesTD(){
  const d = TD.d;
  if(!d || !d.peutRegler || reprendreLesTachesTD.fait) return;
  reprendreLesTachesTD.fait = true;
  try{
    const x = await appelPrep({ action: 'todoTachesReprises' });
    if(x && x.reprises) return;
    const t = await appelPrep({ action: 'tacheList' });
    const r = await appelPrep({ action: 'todoReprendreTaches', taches: (t && t.taches) || [] });
    poserTD(r);
    if(r && r.reprises) toastTD('✅ ' + r.reprises + ' tâche(s) du bureau reprises dans 👥 « 🏢 Bureau »');
  }catch(e){ reprendreLesTachesTD.fait = false; }
}

/* ---------- branchement ---------- */
(function(){
  const brancher = () => {
    const b = $('todoBtn');
    if(!b || b.dataset.branche) return;
    b.dataset.branche = '1';
    b.addEventListener('click', basculerTD);
    const f = $('todoFermer'); if(f) f.addEventListener('click', fermerTD);
    const v = $('todoVoile'); if(v) v.addEventListener('click', fermerTD);
    const r = $('todoRegler'); if(r) r.addEventListener('click', () => { TD.reglage = !TD.reglage; dessinerTD(); });
    const p = $('todoPlus');
    if(p) p.addEventListener('click', () => {
      TD.reglage = false;
      if(TD.vue === 'bureau'){ dessinerTD(); setTimeout(() => { const i = $('todoMaJournee'); if(i){ i.scrollIntoView({ block: 'center' }); i.focus(); } }, 30); }
      else{ TD.creation = TD.vue === 'perso' ? 'perso' : 'partage'; dessinerTD(); setTimeout(() => { const i = $('todoNomListe'); if(i){ i.scrollIntoView({ block: 'center' }); i.focus(); } }, 30); }
    });
    document.addEventListener('keydown', ev => { if(ev.key === 'Escape' && TD.ouvert) fermerTD(); });
  };
  /* Le bouton n'apparaît que si le Worker répond (la case « ☑️ À faire »
     de ⚙️ Accès) : au démarrage, puis toutes les 5 minutes */
  let n = 0;
  const essayer = () => {
    brancher();
    if(typeof ACCES !== 'undefined' && ACCES && ACCES.code){ chargerTD(true); return; }
    if(++n < 240) setTimeout(essayer, 1000);
  };
  setTimeout(essayer, 2500);
  /* 🔁 v1281 — David : « il faut rafraîchir pour voir ce que mettent
     les autres ». Volet ouvert : relu toutes les 10 s ; fermé : la
     pastille toutes les minutes. */
  setInterval(() => {
    if(typeof ACCES === 'undefined' || !ACCES || !ACCES.code || document.hidden) return;
    if(TD.ouvert ? Date.now() - TD.charge > 9000 : Date.now() - TD.charge > 60000) chargerTD(false);
  }, 5000);
  /* un redessin retenu pendant qu'on écrivait se fait en quittant le champ */
  document.addEventListener('focusout', ev => {
    const z = $('todoCorps');
    if(!z || !TD.ouvert || !TD.retenu || !z.contains(ev.target)) return;
    setTimeout(() => { if(TD.retenu && !occupeTD()){ TD.retenu = false; dessinerTD(); } }, 250);
  });
  document.addEventListener('visibilitychange', () => {
    if(!document.hidden && typeof ACCES !== 'undefined' && ACCES && ACCES.code && Date.now() - TD.charge > 60000) chargerTD(false);
  });
  /* La notification « ☑️ Une tâche pour toi » ouvre le volet */
  if(navigator.serviceWorker){
    navigator.serviceWorker.addEventListener('message', ev => {
      const d = ev.data || {};
      if(d.quoi === 'ouvrirVue' && d.vue === 'todo') ouvrirTD('partage');
    });
  }
  try{ if(new URLSearchParams(location.search).get('vue') === 'todo') setTimeout(() => ouvrirTD('partage'), 3000); }catch(e){}
})();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-todo.js'] = true;
