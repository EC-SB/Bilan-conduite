/* Déployé le 30/10/2026 à 17:51 — v1316 */
/* ============================================================
   ec-suivi-eleve.js — 👁️ LE SUIVI DE L'ÉLÈVE — v1272

   David, le 27 octobre :
   · « dans les manœuvres, il faut enlever les petites voitures au
     bout de chaque bouton : il ne le faut qu'une seule fois, en
     dernier, pour tout cocher » — et, sur le schéma, « il faut pouvoir
     en retirer » ;
   · « il faut ajouter un œil au bout, qui ouvre un bloc de texte pour
     indiquer que le repère pour cette manœuvre n'est pas le même que
     tout le monde, et que le moniteur indique quel est le bon repère
     pour cet élève » — pas sur Utilisation radio, Utilisation
     téléphone, Faire peur, Parking avec ticket, GPS, Régulateur,
     Ouverture du capot, Va où tu veux fais ce que tu veux ; le repère
     part dans son bilan le jour où il est écrit ou changé ;
   · les questions de vérification posées en cours « se gardent en
     mémoire comme les manœuvres » (voir ec-verifs.js).

   Ce module tient ce qu'on sait de l'élève du cours (lu au Worker,
   table D1 « suivi_reperes » / « suivi_verifs ») et dessine l'œil, le
   bloc du repère et le 🚗 unique. Les deux écrans de cours (vocal :
   ec-vocal.js, à la main : ec-manuel.js) s'en servent de la même
   façon.

   ⚠️ TOUS LES NOMS FINISSENT PAR « SE » : les modules partagent une
   seule portée.
   ============================================================ */

const SANS_REPERE_SE = ['utilisation radio', 'utilisation telephone', 'faire peur', 'parking avec ticket', 'gps',
  'regulateur', 'ouverture du capot', 'va ou tu veux fais ce que tu veux'];

/* Ce qu'on sait de chaque élève, lu au Worker une fois (le cours, le
   dossier, la colonne de droite de la messagerie peuvent parler de
   plusieurs élèves à la fois). */
const SUIVIS_SE = {};

function normSE(t){
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function cleManoeuvreSE(libelle){ return normSE(libelle).slice(0, 80); }
function sansRepereSE(libelle){ return SANS_REPERE_SE.indexOf(normSE(libelle)) !== -1; }
function eleveDuCoursSE(){
  const c = (typeof $ === 'function') ? $('studentName') : null;
  return c ? String(c.value || '').trim() : '';
}
function jourSE(){ return (typeof todayLocal === 'function') ? todayLocal() : new Date().toISOString().slice(0, 10); }
function prenomSE(nom){ return String(nom || '').trim().split(/\s+/)[0] || 'l’élève'; }

function entreeSE(nom){
  const k = normSE(nom);
  return SUIVIS_SE[k] || (SUIVIS_SE[k] = { nom: String(nom || '').trim(), donnees: null, promesse: null });
}
function poserDonneesSE(nom, r){
  const e = entreeSE(nom);
  e.donnees = { reperes: r.reperes || [], verifs: r.verifs || [], fiche: r.fiche || { ecoutes: false, groupes: false, texte: '' },
                messages: r.messages || [], convs: r.convs || [] };
  return e.donnees;
}
function chargerSuiviSE(nom, forcer){
  nom = String(nom || '').trim();
  if(nom.length < 3 || typeof appelPrep !== 'function') return Promise.resolve(null);
  const e = entreeSE(nom);
  if(!forcer){
    if(e.donnees) return Promise.resolve(e.donnees);
    if(e.promesse) return e.promesse;
  }
  const p = Promise.resolve(appelPrep({ action: 'suiviLire', eleve: nom })).then(r => {
    e.promesse = null;
    const d = poserDonneesSE(nom, (r && r.status === 'ok') ? r : {});
    rafraichirApresSuiviSE(nom);
    return d;
  }).catch(() => { e.promesse = null; return null; });
  e.promesse = p;
  return p;
}
/* Ce qu'on a déjà, sans attendre (null si pas encore lu) */
function suiviSE(nom){
  nom = nom == null ? eleveDuCoursSE() : nom;
  const e = SUIVIS_SE[normSE(nom)];
  return (e && e.donnees) || null;
}
function rafraichirApresSuiviSE(nom){
  const k = normSE(nom == null ? eleveDuCoursSE() : nom);
  document.querySelectorAll('.oeilRepere').forEach(b => { if(typeof b._peindre === 'function') b._peindre(); });
  document.querySelectorAll('.suiviVivant').forEach(x => { if((!k || x.dataset.suiviDe === k) && typeof x._maj === 'function') x._maj(); });
  if(k === normSE(eleveDuCoursSE())) appliquerCasesAuxLignesSE();
  /* pas pendant qu'on écrit une réponse : le champ perdrait la main */
  const a = document.activeElement;
  if(a && a.closest && a.closest('.tiroirVerifs')) return;
  if(typeof qvRedessiner === 'function'){ try{ qvRedessiner(); }catch(e){} }
}

/* ---------- 👁️ les repères ---------- */
function repereSE(libelle, nom){
  const d = suiviSE(nom);
  if(!d) return null;
  const k = cleManoeuvreSE(libelle);
  return d.reperes.find(r => r.manoeuvre === k) || null;
}
async function poserRepereSE(libelle, texte, nom){
  nom = nom || eleveDuCoursSE();
  const r = await appelPrep({ action: 'suiviReperePoser', eleve: nom, manoeuvre: libelle, texte: texte });
  if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'pas enregistré');
  const d = suiviSE(nom);
  if(d){
    const k = cleManoeuvreSE(libelle);
    d.reperes = d.reperes.filter(x => x.manoeuvre !== k);
    if(r.repere) d.reperes.push(r.repere);
  }
  rafraichirApresSuiviSE(nom);
  return r;
}

/* L'œil, au bout d'une manœuvre. « hote() » rend l'élément après
   lequel le bloc du repère s'ouvre (le bouton dans sa grille, ou la
   ligne de la case). */
function oeilRepereSE(libelle, hote){
  if(sansRepereSE(libelle)) return null;
  const o = document.createElement('button');
  o.type = 'button';
  o.className = 'btn pastilleVue pastilleAilleurs oeilRepere';
  o.textContent = '👁️';
  o.setAttribute('data-repere', libelle);
  o._peindre = () => {
    const r = repereSE(libelle);
    o.classList.toggle('aRepere', !!r);
    o.title = r ? 'Son repère à lui : ' + r.texte : 'Son repère n’est pas celui de tout le monde ? Écris le bon.';
    o.setAttribute('aria-label', o.title);
  };
  o.addEventListener('click', ev => {
    ev.preventDefault(); ev.stopPropagation();
    const h = hote ? hote() : o;
    const deja = h && h.nextElementSibling && h.nextElementSibling.classList.contains('repereBloc') ? h.nextElementSibling : null;
    document.querySelectorAll('.repereBloc').forEach(x => x.remove());
    if(deja) return;
    const b = blocRepereSE(libelle);
    if(h && h.parentNode) h.parentNode.insertBefore(b, h.nextSibling);
    const ta = b.querySelector('textarea');
    if(ta) try{ ta.focus(); }catch(e){}
  });
  o._peindre();
  const nom = eleveDuCoursSE();
  if(nom && !suiviSE(nom)) chargerSuiviSE(nom);
  return o;
}

function blocRepereSE(libelle){
  const prenom = prenomSE(eleveDuCoursSE());
  const r = repereSE(libelle);
  const b = document.createElement('div');
  b.className = 'repereBloc';
  b.setAttribute('data-repere', libelle);
  const t = document.createElement('div');
  t.className = 'repereTitre';
  t.textContent = '👁️ Le repère de ' + prenom + ' — ' + libelle;
  b.appendChild(t);
  const aide = document.createElement('div');
  aide.className = 'repereAide';
  aide.textContent = 'Pas le même que tout le monde : écris le bon. Il reste là pour les prochains moniteurs, l’œil reste allumé, et il part dans son bilan aujourd’hui.';
  b.appendChild(aide);
  const rg = document.createElement('div');
  rg.className = 'repereRang';
  const ta = document.createElement('textarea');
  ta.rows = 3;
  ta.placeholder = 'Ex : il ne voit pas le repère dans le rétro, on prend le poteau dans la vitre arrière.';
  ta.value = r ? r.texte : '';
  ta.setAttribute('data-hors-saisie', '1');
  rg.appendChild(ta);
  if(typeof microDObservation === 'function') rg.appendChild(microDObservation(ta, 'le repère'));
  b.appendChild(rg);
  if(r){
    const qui = document.createElement('div');
    qui.className = 'repereQui';
    qui.textContent = '✏️ ' + (r.par || '') + (r.le ? ' · ' + jourCourtSE(r.le) : '');
    b.appendChild(qui);
  }
  const acts = document.createElement('div');
  acts.className = 'repereActs';
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'btn btn-primary repereOk';
  ok.textContent = '💾 Enregistrer le repère';
  ok.addEventListener('click', async ev => {
    ev.preventDefault(); ev.stopPropagation();
    if(!eleveDuCoursSE()){ if(typeof showToast === 'function') showToast('Choisis d’abord l’élève.'); return; }
    ok.disabled = true;
    try{
      await poserRepereSE(libelle, ta.value.trim());
      if(typeof showToast === 'function') showToast(ta.value.trim() ? '👁️ Repère enregistré pour ' + prenom : 'Repère retiré');
      b.remove();
    }catch(e){
      ok.disabled = false;
      if(typeof showToast === 'function') showToast('⚠️ Le repère n’est pas enregistré : ' + (e.message || e));
    }
  });
  acts.appendChild(ok);
  if(r){
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'btn btn-secondary repereRetirer';
    x.textContent = '🗑️ Retirer';
    x.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); ta.value = ''; ok.click(); });
    acts.appendChild(x);
  }
  const f = document.createElement('button');
  f.type = 'button';
  f.className = 'btn btn-secondary';
  f.textContent = 'Fermer';
  f.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); b.remove(); });
  acts.appendChild(f);
  b.appendChild(acts);
  return b;
}
function jourCourtSE(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return String(iso || '');
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

/* Dans le bilan : les repères écrits ou changés AUJOURD'HUI */
function lignesReperesDuJourSE(){
  const d = suiviSE();
  if(!d) return [];
  const j = jourSE();
  return d.reperes.filter(r => r.le === j && r.texte)
    .map(r => '👁️ Ton repère pour « ' + (r.libelle || r.manoeuvre) + ' » : ' + r.texte);
}

/* ---------- 🚗 le bouton unique ---------- */
/* À la fin de la grille des manœuvres : il les coche toutes ; chaque
   manœuvre montre alors son 🚗 bleu, qu'on touche pour la retirer ;
   retouché quand tout est coché, il décoche tout. Rien ne s'affiche
   si la grille n'a pas de case 🚗 (élève de chez nous). */
function boutonAilleursToutSE(grille, racine, peindreTout){
  const cases = () => Array.prototype.slice.call(racine.querySelectorAll('input.mAilleurs'));
  if(!cases().length) return null;
  const g = document.createElement('span');
  g.className = 'pastilleGroupe ailleursTout';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn pastilleVue pastilleAilleurs';
  const maj = () => {
    const l = cases(), n = l.filter(x => x.checked).length;
    b.textContent = n ? '🚗 Déjà faites ailleurs : ' + n + ' sur ' + l.length : '🚗 Toutes déjà faites ailleurs';
    b.className = 'btn pastilleVue pastilleAilleurs ' + (n ? 'on' : 'btn-secondary');
    b.setAttribute('aria-pressed', n === l.length ? 'true' : 'false');
    b.title = 'Déjà faites dans une autre auto-école';
  };
  b.addEventListener('click', ev => {
    ev.preventDefault();
    const l = cases();
    const toutes = l.every(x => x.checked);
    l.forEach(x => {
      if(x.checked === !toutes) return;
      x.checked = !toutes;
      x.dispatchEvent(new Event('change', { bubbles: true }));
    });
    grille.dataset.ailleurs = toutes ? '' : '1';
    if(peindreTout) peindreTout();
    maj();
  });
  racine.addEventListener('change', ev => { if(ev.target && ev.target.classList && ev.target.classList.contains('mAilleurs')) maj(); });
  g._maj = maj;
  g.appendChild(b);
  maj();
  return g;
}

/* ============================================================
   ⚠️ v1273 — LE TIROIR « SUIVI DE … »

   David, le 27 octobre : « une partie avec pas d'écoutes
   pédagogiques, pas bosser sur les groupes (qui sont à la fin mais il
   faut le dire pendant le cours) ; cette partie devient rouge quand
   c'est coché pour que le moniteur suivant le voie », un texte libre
   gardé, et les infos de la messagerie. Sur le schéma v2 : « un tiroir
   comme les autres, là où il y a les procédures et les vérifs » ; son
   nom : « ⚠️ Suivi de Lena » ; les cases « font ce qu'elles font
   quand elles sont cochées à la fin : Pas d'écoutes met le texte
   automatiquement, Ne travaille pas sur les groupes fait ce que fait
   la croix rouge » ; elles se cochent aussi toutes seules quand le
   dernier bilan avait ❌, et se décochent à la main ; tout le monde
   coche et écrit.
   ============================================================ */
const ZONES_SUIVI_SE = { verifsCours: 'suiviCours', verifsManuel: 'suiviManuel' };
const CASES_SUIVI_SE = [
  { k: 'ecoutes', t: '🎧 Pas d’écoutes pédagogiques', s: 'à lui en parler pendant le cours · le texte des écoutes part dans le bilan', court: '🎧 pas d’écoutes', champ: 'ecoutes' },
  { k: 'groupes', t: '👥 Ne travaille pas sur les groupes', s: 'à lui en parler pendant le cours · ❌ aux groupes dans le bilan', court: '👥 pas les groupes', champ: 'groupesTravail' },
  /* 🚨 v1316 — David, le 30 octobre : « ajoute Urgent : il faut ajouter une
     leçon, avant l'examen s'il a une date d'examen, ou avant l'examen blanc
     si pas d'examen prévu ; quand un moniteur coche, un message part
     automatiquement dans Message important pour que le bureau ait
     l'information ». Pas de ligne du bilan derrière (champ vide). */
  { k: 'urgent', t: '🚨 Urgent : ajouter une leçon', s: '', court: '🚨 leçon à ajouter', champ: '' }
];
/* « avant son examen du 12/11 » s'il a une date d'examen à venir,
   « avant l'examen blanc » sinon */
function quandUrgentSE(nom){
  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  const brut = String(s.datePermis || s.dateExamen || '').trim();
  let iso = '';
  let m = brut.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) iso = m[0];
  else if((m = brut.match(/^(\d{2})\/(\d{2})\/(\d{4})/))) iso = m[3] + '-' + m[2] + '-' + m[1];
  if(iso && iso >= jourSE()) return 'avant son examen du ' + iso.slice(8, 10) + '/' + iso.slice(5, 7);
  return 'avant l’examen blanc';
}
function texteUrgentSE(nom){ return 'il faut ajouter une leçon ' + quandUrgentSE(nom); }
/* Le message dans « Message important » : au nom de celui qui coche, et
   il entre dans le Suivi de l'élève comme tout message de ce fil */
function estMessageImportantSE(c){
  const t = normSE(c && c.titre);
  return !!c && !c.eleve && (c.genre === 'groupe' || c.genre === 'interne') && / important/.test(' ' + t);
}
async function prevenirLeBureauUrgentSE(nom){
  try{
    /* sa date d'examen vient de l'état du bureau : lu s'il ne l'est pas encore */
    if(typeof chargerBureau === 'function' && typeof etatBureau !== 'undefined' && !(etatBureau && (etatBureau.suivi || []).length)){
      try{ await chargerBureau(false); }catch(e){ /* « avant l'examen blanc » par défaut */ }
    }
    const d = await appelPrep({ action: 'convList' });
    const conv = ((d && d.conversations) || []).find(estMessageImportantSE);
    if(!conv){
      if(typeof showToast === 'function') showToast('ℹ️ Pas de conversation « Message important » pour toi : préviens le bureau.');
      return false;
    }
    await appelPrep({ action: 'convEcrire', id: conv.id, texte: '🚨 URGENT — ' + nom + ' : ' + texteUrgentSE(nom) + '.', suivi: { noms: [nom] } });
    if(typeof showToast === 'function') showToast('🚨 Le bureau est prévenu dans « ' + (conv.titre || 'Message important') + ' »');
    return true;
  }catch(e){
    if(typeof showToast === 'function') showToast('« Message important » : ' + ((e && e.message) || e));
    return false;
  }
}
function suiviCaseSE(k, nom){ const d = suiviSE(nom); return !!(d && d.fiche && d.fiche[k]); }

function dateDuMessageSE(t){
  const m = String(t || '').match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 12), +(m[5] || 0)) : null;
}
function quandCourtSE(t){
  const d = dateDuMessageSE(t);
  if(!d) return String(t || '');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + (/\d{2}:\d{2}/.test(t) ? ' ' + String(t).slice(11, 16) : '');
}
/* ⚠️ v1276 — ROUGE : UNE CASE COCHÉE, ET RIEN D'AUTRE. David, le 27
   octobre : « le fond est rouge alors qu'aucune case n'est cochée » (un
   message de la messagerie suffisait). C'est ce que dit le tiroir :
   « Une case cochée met le tiroir en rouge ». */
function aSavoirSE(d){
  if(!d) return false;
  const f = d.fiche || {};
  return !!(f.ecoutes || f.groupes || f.urgent);
}
/* Quelque chose à lire (sans rouge) : un texte, ou un message de la semaine */
function aQuelqueChoseSE(d){
  if(!d) return false;
  if(aSavoirSE(d)) return true;
  const f = d.fiche || {};
  if(String(f.texte || '').trim()) return true;
  const limite = Date.now() - 7 * 86400000;
  return (d.messages || []).some(m => { const x = dateDuMessageSE(m.envoyeLe); return x && x.getTime() >= limite; });
}
function resumeSuiviSE(d){
  if(!d) return '';
  const f = d.fiche || {}, l = [];
  CASES_SUIVI_SE.forEach(c => { if(f[c.k]) l.push(c.court); });
  if(String(f.texte || '').trim()) l.push('📝');
  if((d.reperes || []).length) l.push('👁️ ' + d.reperes.length);
  if((d.messages || []).length) l.push('💬 ' + d.messages.length);
  return l.join(' · ');
}

/* Le tiroir, au-dessus de « 🧰 Questions de vérification » (posé par
   dessinerQuestionsVerifs, et par la veille quand l'élève change) */
/* 🔁 v1308 — « nomImpose » : le rendez-vous post-permis n'a pas de case
   « élève » de cours ; il donne le sien (David : « je veux le bloc où il
   y a Pas d'écoutes, Ne travaille pas sur les groupes, Ce qu'il faut
   savoir et ce qui remonte de la messagerie »). */
function dessinerSuiviDuCoursSE(id, nomImpose){
  const z = (typeof $ === 'function') ? $(id) : null;
  if(!z) return;
  const nom = nomImpose ? String(nomImpose).trim() : eleveDuCoursSE();
  if(nom.length < 3){ z.style.display = 'none'; z.innerHTML = ''; z.dataset.sig = ''; return; }
  z.style.display = '';
  z.dataset.sig = normSE(nom);
  const avant = z.querySelector('details.tiroirSuivi');
  const ouvert = !!(avant && avant.open);
  z.innerHTML = '';
  const d = document.createElement('details');
  d.className = 'tiroirSuivi suiviVivant';
  d.dataset.suiviDe = normSE(nom);
  d.open = ouvert;
  const s = document.createElement('summary');
  d.appendChild(s);
  const corps = document.createElement('div');
  corps.className = 'suiviCorps';
  d.appendChild(corps);
  d._maj = () => {
    const x = suiviSE(nom);
    const r = resumeSuiviSE(x);
    s.textContent = '⚠️ Suivi de ' + prenomSE(nom) + (r ? ' — ' + r : '');
    d.classList.toggle('rouge', aSavoirSE(x));
    const a = document.activeElement;
    if(a && corps.contains(a) && /TEXTAREA|INPUT|SELECT/.test(a.tagName)) return;
    corps.innerHTML = '';
    corps.appendChild(x ? contenuSuiviSE(nom, x) : Object.assign(document.createElement('div'), { className: 'suiviAide', textContent: 'Lecture…' }));
  };
  z.appendChild(d);
  d._maj();
  if(!suiviSE(nom)) chargerSuiviSE(nom);
}

/* Le contenu : le même dans le tiroir du cours et dans le dossier */
function contenuSuiviSE(nom, x){
  const w = document.createElement('div');
  w.className = 'suiviContenu';
  const prenom = prenomSE(nom);
  const aide = document.createElement('div');
  aide.className = 'suiviAide';
  aide.textContent = 'Gardé d’un cours à l’autre, pour tous les moniteurs. Une case cochée met le tiroir en rouge, et fait comme à la fin du cours.';
  w.appendChild(aide);
  const f = x.fiche || {};
  CASES_SUIVI_SE.forEach(c => {
    const l = document.createElement('label');
    l.className = 'suiviCase';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!f[c.k];
    cb.setAttribute('data-suivi-case', c.k);
    l.appendChild(cb);
    const t = document.createElement('span');
    const qui = f[c.k] ? (f[c.k + 'Auto'] ? 'coché tout seul : ❌ au bilan du ' + quandCourtSE(isoVersFrSE(f[c.k + 'Le'])) : '✏️ ' + (f[c.k + 'Par'] || '') + (f[c.k + 'Le'] ? ' · ' + quandCourtSE(isoVersFrSE(f[c.k + 'Le'])) : '')) : '';
    const sous = c.k === 'urgent' ? quandUrgentSE(nom) + ' · le bureau est prévenu dans « Message important »' : c.s;
    if(c.k === 'urgent') l.classList.add('suiviUrgent');
    t.innerHTML = '<b>' + c.t + '</b><br><small>' + echSE(sous) + (qui ? ' · ' + echSE(qui) : '') + '</small>';
    l.appendChild(t);
    cb.addEventListener('change', async () => {
      cb.disabled = true;
      try{
        const r = await appelPrep({ action: 'suiviCasePoser', eleve: nom, cle: c.k, on: cb.checked });
        if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
        poserDonneesSE(nom, r);
        rafraichirApresSuiviSE(nom);
        if(c.k === 'urgent' && cb.checked) prevenirLeBureauUrgentSE(nom);
      }catch(e){
        cb.checked = !cb.checked;
        cb.disabled = false;
        if(typeof showToast === 'function') showToast('⚠️ Pas enregistré : ' + (e.message || e));
      }
    });
    w.appendChild(l);
  });
  /* 📝 le texte libre */
  w.appendChild(titreSE('📝 Ce qu’il faut savoir'));
  const rg = document.createElement('div');
  rg.className = 'suiviRang';
  const ta = document.createElement('textarea');
  ta.rows = 3;
  ta.className = 'suiviTexte';
  ta.placeholder = 'Ce que le prochain moniteur doit savoir sur ' + prenom + '…';
  ta.value = f.texte || '';
  ta.setAttribute('data-hors-saisie', '1');
  rg.appendChild(ta);
  if(typeof microDObservation === 'function') rg.appendChild(microDObservation(ta, 'ce qu’il faut savoir'));
  w.appendChild(rg);
  const bas = document.createElement('div');
  bas.className = 'suiviBas';
  const qui = document.createElement('span');
  qui.className = 'suiviQui';
  qui.textContent = f.texte ? '✏️ ' + (f.textePar || '') + (f.texteLe ? ' · ' + quandCourtSE(isoVersFrSE(f.texteLe)) : '') : '';
  bas.appendChild(qui);
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'btn btn-secondary suiviEnregistrer';
  ok.textContent = '💾 Enregistrer';
  ok.disabled = true;
  ta.addEventListener('input', () => { ok.disabled = ta.value.trim() === String(f.texte || '').trim(); });
  ok.addEventListener('click', async ev => {
    ev.preventDefault();
    ok.disabled = true;
    try{
      const r = await appelPrep({ action: 'suiviTextePoser', eleve: nom, texte: ta.value });
      if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
      const d = suiviSE(nom);
      if(d){ d.fiche = Object.assign({}, d.fiche, { texte: r.texte, textePar: r.textePar, texteLe: r.texteLe }); }
      ta.blur();
      if(typeof showToast === 'function') showToast('📝 Enregistré pour ' + prenom);
      rafraichirApresSuiviSE(nom);
    }catch(e){
      ok.disabled = false;
      if(typeof showToast === 'function') showToast('⚠️ Pas enregistré : ' + (e.message || e));
    }
  });
  bas.appendChild(ok);
  w.appendChild(bas);
  /* 👁️ ses repères */
  if((x.reperes || []).length){
    w.appendChild(titreSE('👁️ Ses repères'));
    x.reperes.forEach(r => {
      const d = document.createElement('div');
      d.className = 'suiviRepere';
      d.innerHTML = '<b>' + echSE(r.libelle || r.manoeuvre) + '</b> — ' + echSE(r.texte) + ' <small>· ' + echSE(r.par || '') + (r.le ? ', ' + echSE(quandCourtSE(isoVersFrSE(r.le))) : '') + '</small>';
      w.appendChild(d);
    });
  }
  /* 💬 la messagerie */
  w.appendChild(titreSE('💬 Dans la messagerie, sur ' + prenom));
  const ms = x.messages || [];
  if(!ms.length){
    const v = document.createElement('div');
    v.className = 'suiviAide';
    v.textContent = 'Rien pour l’instant. Un message qui parle de ' + prenom + ' dans « Message important » ou « Suivi examen » arrive ici tout seul.';
    w.appendChild(v);
  }
  ms.slice(0, 15).forEach(m => {
    const d = document.createElement('div');
    d.className = 'suiviMsg';
    d.innerHTML = '<b>' + echSE(m.auteur || '') + '</b> <small>' + echSE(quandCourtSE(m.envoyeLe)) +
      (m.comment === 'reponse' ? ' · en réponse' : '') + (m.titre ? ' · 👥 ' + echSE(m.titre) : '') + '</small><br>' +
      (m.vocal ? '🎤 ' : '') + echSE(m.texte || (m.vocal ? 'Message vocal' : ''));
    w.appendChild(d);
  });
  /* ✍️ écrire dans la conversation lue */
  const convs = x.convs || [];
  if(convs.length){
    const e = document.createElement('div');
    e.className = 'suiviEcrire';
    let sel = null;
    if(convs.length > 1){
      sel = document.createElement('select');
      convs.forEach(c => sel.appendChild(new Option(c.titre || 'Conversation', c.id)));
      e.appendChild(sel);
    }
    const r2 = document.createElement('div');
    r2.className = 'suiviRang';
    const t2 = document.createElement('textarea');
    t2.rows = 2;
    t2.className = 'suiviMot';
    t2.placeholder = 'Écrire dans « ' + (convs[0].titre || 'la conversation') + ' » sur ' + prenom + '…';
    t2.setAttribute('data-hors-saisie', '1');
    r2.appendChild(t2);
    const env = document.createElement('button');
    env.type = 'button';
    env.className = 'btn btn-primary suiviEnvoyer';
    env.textContent = '➤';
    env.title = 'Envoyer';
    env.addEventListener('click', async ev => {
      ev.preventDefault();
      const mot = t2.value.trim();
      if(!mot) return;
      const id = sel ? sel.value : convs[0].id;
      env.disabled = true;
      try{
        const r = await appelPrep({ action: 'convEcrire', id: id, texte: '📌 ' + nom + ' : ' + mot, suivi: { noms: [nom] } });
        if(r && r.status === 'error') throw new Error(r.message || 'refusé');
        t2.value = '';
        t2.blur();
        if(typeof showToast === 'function') showToast('💬 Envoyé dans « ' + ((convs.find(c => c.id === id) || {}).titre || 'la conversation') + ' »');
        await chargerSuiviSE(nom, true);
      }catch(e2){
        if(typeof showToast === 'function') showToast('⚠️ Pas envoyé : ' + (e2.message || e2));
      }
      env.disabled = false;
    });
    r2.appendChild(env);
    e.appendChild(r2);
    w.appendChild(e);
  }
  return w;
}
function titreSE(t){ const d = document.createElement('div'); d.className = 'suiviTitre'; d.textContent = t; return d; }
function echSE(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function isoVersFrSE(iso){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || ''); }

/* Les cases font ce que font les réponses de fin de cours : sur le
   bilan à la main, ❌ aux lignes « 4 groupes de travail suivis » et
   « Plus d'écoutes que de conduite », marquées d'où elles viennent ;
   une case décochée rend ce qu'elle avait posé. */
function appliquerCasesAuxLignesSE(){
  const d = suiviSE();
  if(!d) return;
  CASES_SUIVI_SE.forEach(c => {
    if(!c.champ) return;   /* 🚨 l'urgence n'a pas de ligne au bilan */
    document.querySelectorAll('[data-champ="' + c.champ + '"]').forEach(r => {
      const on = !!(d.fiche || {})[c.k];
      const val = (typeof champsManuels !== 'undefined' && champsManuels) ? champsManuels[c.champ] : undefined;
      const bouton = v => Array.prototype.find.call(r.querySelectorAll('button[data-val]'), b => b.getAttribute('data-val') === v);
      const bloc = r.parentElement;
      let mot = bloc && bloc.nextElementSibling && bloc.nextElementSibling.classList.contains('suiviPose') ? bloc.nextElementSibling : null;
      if(on && val !== '❌'){
        const b = bouton('❌');
        if(b){ b.click(); r.dataset.parSuivi = '1'; }
      }else if(!on && r.dataset.parSuivi === '1' && val === '❌'){
        const b = bouton('');
        if(b) b.click();
        r.dataset.parSuivi = '';
      }
      if(on && r.dataset.parSuivi === '1' && !mot && bloc && bloc.parentNode){
        mot = document.createElement('div');
        mot.className = 'suiviPose';
        mot.textContent = '⚠️ posé par « Suivi de ' + prenomSE(eleveDuCoursSE()) + ' »';
        bloc.parentNode.insertBefore(mot, bloc.nextSibling);
      }
      if((!on || r.dataset.parSuivi !== '1') && mot) mot.remove();
    });
  });
}

/* Le bilan : ce qu'il dit des groupes et des écoutes coche (ou décoche
   ce qui avait été coché tout seul). Une fois par bilan. */
function casesParLeBilanSE(groupes, ecoutes){
  const nom = eleveDuCoursSE();
  if(nom.length < 3 || typeof appelPrep !== 'function') return;
  if(!groupes && !ecoutes) return;
  const sig = normSE(nom) + '|' + groupes + '|' + ecoutes + '|' + jourSE();
  if(casesParLeBilanSE._sig === sig) return;
  casesParLeBilanSE._sig = sig;
  Promise.resolve(appelPrep({ action: 'suiviCasesDuBilan', eleve: nom, groupes: groupes, ecoutes: ecoutes }))
    .then(r => { if(r && r.change) chargerSuiviSE(nom, true); })
    .catch(() => { casesParLeBilanSE._sig = ''; });
}

/* La veille : l'élève du cours a changé → le tiroir suit */
setInterval(() => {
  if(document.hidden) return;
  Object.keys(ZONES_SUIVI_SE).forEach(v => {
    const z = document.getElementById(ZONES_SUIVI_SE[v]);
    if(!z) return;
    const vz = document.getElementById(v);
    if(vz && vz.style.display === 'none' && !z.dataset.sig) return;
    if((z.dataset.sig || '') !== normSE(eleveDuCoursSE())) dessinerSuiviDuCoursSE(ZONES_SUIVI_SE[v]);
  });
}, 1500);

/* ============================================================
   💬 v1273 — LA MESSAGERIE : REPÉRER LES ÉLÈVES

   Seulement dans un fil « lu pour le suivi » (conv.suivi, décidé par
   le Worker) : son nom complet, son prénom seul (s'il est porté par
   plusieurs élèves, on propose), « mon élève actuel », et une réponse
   (↩️) suit le message qu'elle cite.
   ============================================================ */
/* v1275 — le prénom d'un nom, qu'il soit écrit « Lena Guivarch » ou
   « GUIVARCH Lena » : le mot tout en majuscules est le nom de famille.
   Sans majuscules pour trancher, c'est le premier mot. */
function prenomDuNomSE(n){
  const mots = String(n || '').trim().split(/\s+/).filter(Boolean);
  if(mots.length < 2) return normSE(n).split(' ')[0] || '';
  const majuscule = m => /[A-ZÀ-Ý]/.test(m) && m === m.toUpperCase() && normSE(m).length >= 2;
  const nonMaj = mots.filter(m => !majuscule(m));
  const p = (nonMaj.length && nonMaj.length < mots.length) ? nonMaj[0] : mots[0];
  return normSE(p).split(' ')[0] || '';
}
/* Les élèves connus, un par personne : « Lena Guivarch » et « GUIVARCH Lena »
   ne font qu'une (on garde l'écriture qui commence par le prénom). */
function elevesUniquesSE(){
  const noms = (typeof elevesConnus !== 'undefined' && Array.isArray(elevesConnus)) ? elevesConnus : [];
  if(elevesUniquesSE._src === noms && elevesUniquesSE._n === noms.length) return elevesUniquesSE._l;
  const vus = {}, l = [];
  noms.forEach(n => {
    const k = normSE(n);
    if(!k || k.split(' ').length < 2) return;
    const cle = k.split(' ').sort().join(' ');
    const x = { nom: String(n).trim(), k: k, prenom: prenomDuNomSE(n) };
    const prenomDabord = y => y.k.split(' ')[0] === y.prenom;
    if(vus[cle]){ if(!prenomDabord(vus[cle]) && prenomDabord(x)) Object.assign(vus[cle], x); return; }
    vus[cle] = x;
    l.push(x);
  });
  elevesUniquesSE._src = noms; elevesUniquesSE._n = noms.length; elevesUniquesSE._l = l;
  return l;
}
function elevesDuTexteSE(texte){
  const l = elevesUniquesSE();
  const t = ' ' + normSE(texte) + ' ';
  const mots = {};
  normSE(texte).split(' ').forEach(m => { if(m) mots[m] = 1; });
  const equipe = {};
  ((typeof lesComptesDeLEquipe === 'function') ? lesComptesDeLEquipe() : []).concat([(typeof ACCES !== 'undefined' && ACCES.moniteur) || ''])
    .forEach(n => { const p = normSE(n).split(' ')[0]; if(p) equipe[p] = 1; });
  const surs = [];
  /* le nom entier, dans un sens ou dans l'autre */
  l.forEach(x => {
    const p = x.k.split(' ');
    const inverse = p.slice(1).join(' ') + ' ' + p[0];
    const debut = p.slice(0, -1).join(' '), fin = p[p.length - 1];
    const inverse2 = fin + ' ' + debut;
    if((t.indexOf(' ' + x.k + ' ') !== -1 || t.indexOf(' ' + inverse + ' ') !== -1 || t.indexOf(' ' + inverse2 + ' ') !== -1) && surs.indexOf(x.nom) === -1) surs.push(x.nom);
  });
  /* le prénom seul */
  const parPrenom = {};
  l.forEach(x => { if(x.prenom.length >= 3) (parPrenom[x.prenom] = parPrenom[x.prenom] || []).push(x.nom); });
  const ambigus = [];
  /* ⚠️ v1276 — le prénom d'un collègue (« David ») porté aussi par un
     élève : on ne range rien tout seul (c'est peut-être le collègue),
     on le PROPOSE pendant qu'on écrit. David, le 27 octobre : « il ne
     me repère pas David ». */
  const doutes = [];
  Object.keys(parPrenom).forEach(p => {
    if(!mots[p]) return;
    if(surs.some(s => prenomDuNomSE(s) === p)) return;
    const c = parPrenom[p];
    /* écrit comme dans la liste : « Inès », pas « Ines » */
    const mot = String(c[0]).split(/\s+/).find(w => normSE(w) === p) || p;
    const joli = mot === mot.toUpperCase() ? mot.charAt(0) + mot.slice(1).toLowerCase() : mot;
    const prenom = joli.charAt(0).toUpperCase() + joli.slice(1);
    if(equipe[p]){ doutes.push({ prenom: prenom, choix: c.slice(0, 8) }); return; }
    if(c.length === 1) surs.push(c[0]);
    else ambigus.push({ prenom: prenom, choix: c.slice(0, 8) });
  });
  const actuel = /(^| )mon eleve (actuel|actuelle|en cours|du moment|de maintenant)( |$)/.test(normSE(texte));
  return { noms: surs.slice(0, 10), ambigus: ambigus.slice(0, 5), actuel: actuel, equipe: doutes.slice(0, 5) };
}
/* ✍️ v1276 — les choix faits AU-DESSUS DE LA BARRE, avant d'envoyer
   (par conversation) : « exclus » (✕ sur une étiquette), « choisis »
   (le prénom → l'élève choisi, ou '' pour « aucun »). David : « il faut
   qu'il me propose s'il y en a plusieurs … je ne peux pas choisir
   directement ici ». */
const CHOIX_ENVOI_SE = {};
function choixEnvoiSE(id){ return CHOIX_ENVOI_SE[id] = CHOIX_ENVOI_SE[id] || { exclus: {}, choisis: {} }; }
/* Ce qui sera rangé : ce que l'appli a reconnu, corrigé par ces choix */
function suiviResoluSE(texte, id){
  const r = elevesDuTexteSE(texte || '');
  const c = choixEnvoiSE(id || '');
  const k = p => normSE(p);
  const noms = r.noms.filter(n => !c.exclus[normSE(n)]);
  const ambigus = [], doutes = [];
  r.ambigus.concat(r.equipe.map(x => Object.assign({ collegue: true }, x))).forEach(x => {
    if(Object.prototype.hasOwnProperty.call(c.choisis, k(x.prenom))){
      const n = c.choisis[k(x.prenom)];
      if(n && noms.indexOf(n) === -1 && !c.exclus[normSE(n)]) noms.push(n);
    }else if(x.collegue) doutes.push(x);
    else ambigus.push(x);
  });
  return { noms: noms.slice(0, 10), ambigus: ambigus, doutes: doutes, actuel: r.actuel && !c.exclus['§actuel'] };
}
/* Ce qui part avec un message (ou un vocal) dans un fil lu pour le suivi.
   Un prénom de collègue sans choix ne part pas : ce n'est pas un élève. */
function suiviPourLEnvoiSE(texte, idFil){
  const f = (typeof filOuvertEC !== 'undefined') ? filOuvertEC : null;
  if(!f || !f.conv || !f.conv.suivi || (idFil && f.conv.id !== idFil)) return undefined;
  const r = suiviResoluSE(texte, f.conv.id);
  if(r.noms.length || r.ambigus.length || r.actuel) return { noms: r.noms, ambigus: r.ambigus, actuel: r.actuel };
  /* tout retiré à la main : on le dit au serveur, pour que la relecture
     ne le range pas quand même plus tard */
  const brut = elevesDuTexteSE(texte || '');
  return (brut.noms.length || brut.ambigus.length || brut.actuel) ? { aucun: true } : undefined;
}
/* v1275 — au-dessus de la barre d'écriture, pendant qu'on tape : à qui
   ira le message (on le voit AVANT d'envoyer). v1276 : et on y choisit —
   ✕ retire un élève, un prénom à plusieurs élèves (ou celui d'un
   collègue) propose les élèves, un appui suffit. */
function apercuSuiviSE(texte){
  const zone = (typeof zoneFilMsg === 'function') ? zoneFilMsg() : null;
  if(!zone) return;
  let a = zone.querySelector('#msgSuiviApercu');
  const f = (typeof filOuvertEC !== 'undefined') ? filOuvertEC : null;
  const id = f && f.conv ? f.conv.id : '';
  if(id && !String(texte || '').trim()) delete CHOIX_ENVOI_SE[id];
  const r = (f && f.conv && f.conv.suivi && String(texte || '').trim()) ? suiviResoluSE(texte, id) : null;
  if(!r || !(r.noms.length || r.ambigus.length || r.doutes.length || r.actuel)){ if(a && a.parentNode) a.parentNode.removeChild(a); return; }
  const barre = zone.querySelector('.msgBarre');
  if(!barre || !barre.parentNode) return;
  if(!a){ a = document.createElement('div'); a.id = 'msgSuiviApercu'; a.className = 'msgSuiviApercu'; }
  if(a.nextSibling !== barre) barre.parentNode.insertBefore(a, barre);
  const sig = JSON.stringify(r);
  if(a.dataset.sig === sig) return;
  a.dataset.sig = sig;
  a.innerHTML = '';
  const c = choixEnvoiSE(id);
  const redire = () => { a.dataset.sig = ''; const t = document.getElementById('msgElvTexte'); apercuSuiviSE(t ? t.value : ''); if(t) t.focus(); };
  const bouton = (txt, cls, titre, faire) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = cls; b.textContent = txt; if(titre) b.title = titre;
    b.addEventListener('mousedown', ev => ev.preventDefault());
    b.addEventListener('click', ev => { ev.stopPropagation(); faire(); redire(); });
    return b;
  };
  const lab = document.createElement('span');
  lab.className = 'msgSuiviLab';
  lab.textContent = r.noms.length || r.actuel ? 'Ira dans le suivi de :' : 'Un élève ?';
  a.appendChild(lab);
  const puce = (txt, retirer) => {
    const p = document.createElement('span');
    p.className = 'suiviPuce';
    p.appendChild(Object.assign(document.createElement('span'), { className: 'msgSuiviNom', textContent: txt }));
    p.appendChild(bouton('✕', 'suiviPuceX', 'Pas dans le suivi', retirer));
    a.appendChild(p);
  };
  r.noms.forEach(n => puce('📌 ' + n, () => {
    c.exclus[normSE(n)] = 1;
    Object.keys(c.choisis).forEach(k => { if(c.choisis[k] === n) c.choisis[k] = ''; });
  }));
  if(r.actuel) puce('📌 mon élève actuel', () => { c.exclus['§actuel'] = 1; });
  r.ambigus.concat(r.doutes).forEach(x => {
    const q = document.createElement('span');
    q.className = 'msgSuiviChoix';
    q.appendChild(Object.assign(document.createElement('span'), { className: 'msgSuiviQ',
      textContent: '❓ ' + x.prenom + (r.doutes.indexOf(x) !== -1 ? ', un élève ?' : ' :') }));
    x.choix.forEach(n => q.appendChild(bouton(n, 'msgSuiviOpt', 'Ranger dans le suivi de ' + n, () => { c.choisis[normSE(x.prenom)] = n; delete c.exclus[normSE(n)]; })));
    q.appendChild(bouton(r.doutes.indexOf(x) !== -1 ? 'Non' : 'Aucun', 'msgSuiviOpt non', r.doutes.indexOf(x) !== -1 ? 'C’est le collègue' : 'Aucun de ces élèves', () => { c.choisis[normSE(x.prenom)] = ''; }));
    a.appendChild(q);
  });
}

/* v1275 — à l'ouverture d'un fil lu pour le suivi, les messages de
   l'équipe des 30 derniers jours qui n'ont aucune étiquette sont relus :
   ceux écrits avant la mise à jour, depuis une appli pas encore à jour,
   ou par un bouton rapide. Le serveur ne repose rien sur un message
   qui a déjà eu une étiquette (même retirée par ✕). */
const SUIVI_RELUS_SE = {};
let suiviRelectureSE = false;
async function relireLeSuiviDuFilSE(){
  if(suiviRelectureSE || typeof appelPrep !== 'function') return;
  const f = (typeof filOuvertEC !== 'undefined') ? filOuvertEC : null;
  if(!f || !f.conv || !f.conv.suivi || !Array.isArray(f.messages)) return;
  if(!elevesUniquesSE().length) return;
  const limite = Date.now() - 30 * 86400000;
  const date = t => { const x = String(t || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/); return x ? new Date(+x[3], +x[2] - 1, +x[1]).getTime() : 0; };
  const aFaire = [];
  f.messages.forEach(m => {
    if(!m || !m.id || SUIVI_RELUS_SE[m.id]) return;
    if(m.auteurGenre !== 'user' || Number(m.supprime || 0) || !String(m.texte || '').trim()) return;
    if(Array.isArray(m.suivi) && m.suivi.length) return;
    if(date(m.envoyeLe) < limite) return;
    SUIVI_RELUS_SE[m.id] = 1;
    const r = elevesDuTexteSE(m.texte);
    if(r.noms.length || r.ambigus.length) aFaire.push({ m: m, r: r });
  });
  if(!aFaire.length) return;
  suiviRelectureSE = true;
  let pose = 0;
  try{
    for(const x of aFaire.slice(-10)){
      if(!filOuvertEC || !filOuvertEC.conv || filOuvertEC.conv.id !== f.conv.id) break;
      try{
        const rep = await appelPrep({ action: 'suiviMessageNoter', id: f.conv.id, message: x.m.id, suivi: { noms: x.r.noms, ambigus: x.r.ambigus } });
        if(rep && Number(rep.n || 0)) pose++;
      }catch(e){ /* on réessaiera à la prochaine session */ }
    }
  }finally{ suiviRelectureSE = false; }
  if(pose && typeof rafraichirLeFil === 'function') rafraichirLeFil();
}

/* Les étiquettes sous une bulle */
function pucesSuiviSE(m){
  const l = (m && Array.isArray(m.suivi)) ? m.suivi : [];
  if(!l.length) return null;
  const z = document.createElement('div');
  z.className = 'suiviPuces';
  l.forEach(x => {
    const p = document.createElement('span');
    if(x.eleve){
      p.className = 'suiviPuce';
      const n = document.createElement('button');
      n.type = 'button';
      n.className = 'suiviPuceNom';
      n.textContent = '📌 ' + x.eleve + (x.comment === 'actuel' ? ' · élève actuel' : x.comment === 'reponse' ? ' · en réponse' : '');
      n.title = 'Dans « Suivi de ' + prenomSE(x.eleve) + ' »';
      n.addEventListener('click', ev => { ev.stopPropagation(); allerALEleveDuFilSE(x.eleve); });
      p.appendChild(n);
      const r = document.createElement('button');
      r.type = 'button';
      r.className = 'suiviPuceX';
      r.textContent = '✕';
      r.title = 'Ce message ne parle pas de ' + x.eleve;
      r.addEventListener('click', async ev => {
        ev.stopPropagation();
        try{
          await appelPrep({ action: 'suiviMessageRetirer', message: m.id, eleve: x.eleve });
          if(typeof rafraichirLeFil === 'function') await rafraichirLeFil();
        }catch(e){ if(typeof showToast === 'function') showToast('Impossible : ' + (e.message || e)); }
      });
      p.appendChild(r);
    }else{
      p.className = 'suiviPuce aChoisir';
      const n = document.createElement('button');
      n.type = 'button';
      n.className = 'suiviPuceNom';
      n.textContent = '❓ ' + (x.prenom === 'mon élève actuel' ? 'Ton élève actuel' : x.prenom) + ' : ' + (x.prenom === 'mon élève actuel' ? 'lequel ?' : 'lequel ou laquelle ?');
      n.addEventListener('click', ev => {
        ev.stopPropagation();
        const deja = z.querySelector('.suiviChoix');
        if(deja){ deja.remove(); return; }
        const c = document.createElement('div');
        c.className = 'suiviChoix';
        (x.choix || []).concat(['']).forEach(nom => {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = nom || 'Aucun';
          b.addEventListener('click', async e2 => {
            e2.stopPropagation();
            try{
              await appelPrep({ action: 'suiviMessageChoisir', message: m.id, prenom: x.prenom, eleve: nom });
              if(typeof rafraichirLeFil === 'function') await rafraichirLeFil();
            }catch(e3){ if(typeof showToast === 'function') showToast('Impossible : ' + (e3.message || e3)); }
          });
          c.appendChild(b);
        });
        z.appendChild(c);
      });
      p.appendChild(n);
    }
    z.appendChild(p);
  });
  return z;
}
function allerALEleveDuFilSE(nom){
  const b = document.querySelector('.ckSuiviEleve[data-suivi-de="' + normSE(nom) + '"]');
  if(b && b.offsetParent){ try{ b.scrollIntoView({ behavior: 'smooth', block: 'start' }); }catch(e){ b.scrollIntoView(); } b.classList.add('vu'); setTimeout(() => b.classList.remove('vu'), 1200); return; }
  if(typeof ouvrirPageEleve === 'function') ouvrirPageEleve(nom);
}
/* Les élèves d'un fil lu pour le suivi, le dernier nommé d'abord */
function elevesDuFilSE(f){
  const out = [];
  ((f && f.messages) || []).slice().sort((a, b) => (b.rang || 0) - (a.rang || 0)).forEach(m => {
    (m.suivi || []).forEach(x => { if(x.eleve && !out.some(n => normSE(n) === normSE(x.eleve))) out.push(x.eleve); });
  });
  return out;
}
/* À droite (et dans ⓘ sur téléphone) : sa fiche, comme quand on parle
   à l'élève, une par élève nommé */
function blocElevesDuFilSE(f){
  const noms = elevesDuFilSE(f);
  if(!noms.length) return null;
  const z = document.createElement('div');
  z.className = 'ckSuiviEleves';
  const t = document.createElement('div');
  t.className = 'ckSuiviTitre';
  t.textContent = '📌 Les élèves de ce fil · ' + noms.length;
  z.appendChild(t);
  noms.slice(0, 8).forEach((nom, i) => {
    const b = document.createElement('div');
    b.className = 'ckSuiviEleve suiviVivant';
    b.dataset.suiviDe = normSE(nom);
    if(typeof ckBlocEleve === 'function') b.appendChild(ckBlocEleve(nom));
    const a = document.createElement('div');
    a.className = 'ckSuiviResume';
    b.appendChild(a);
    b._maj = () => {
      const d = suiviSE(nom);
      b.classList.toggle('rouge', aSavoirSE(d));
      if(!d){ a.innerHTML = '<div class="lab">⚠️ SUIVI</div>…'; return; }
      const f2 = d.fiche || {};
      const l = [];
      const cases = CASES_SUIVI_SE.filter(c => f2[c.k]).map(c => c.t);
      if(cases.length) l.push(echSE(cases.join(' · ')));
      if(String(f2.texte || '').trim()) l.push('📝 ' + echSE(String(f2.texte).slice(0, 90)) + (String(f2.texte).length > 90 ? '…' : ''));
      if((d.reperes || []).length) l.push('👁️ ' + d.reperes.length + ' repère' + (d.reperes.length > 1 ? 's' : ''));
      if((d.messages || []).length) l.push('💬 ' + d.messages.length + ' message' + (d.messages.length > 1 ? 's' : '') + ', le dernier de ' + echSE(d.messages[0].auteur || ''));
      a.innerHTML = '<div class="lab">⚠️ SUIVI</div>' + (l.length ? l.join('<br>') : 'Rien de particulier');
    };
    b._maj();
    chargerSuiviSE(nom);
    if(typeof ckBouton === 'function' && typeof ouvrirPageEleve === 'function'){
      const acts = document.createElement('div');
      acts.className = 'ckFicheActs';
      acts.appendChild(ckBouton('👤 Ouvrir son dossier', 'Le dossier complet de ' + nom, () => ouvrirPageEleve(nom)));
      b.appendChild(acts);
    }
    z.appendChild(b);
  });
  return z;
}

/* ⚙️ Les réglages : quelles conversations sont lues pour le suivi */
/* v1275 — les fils entre nous (jamais avec un élève), et les titres lus
   d'office : tout titre qui contient « important », ou « suivi » et
   « exam » (« ⚠️ Messages importants équipe », « Suivi des examens »…). */
const GENRES_SUIVI_SE = ['groupe', 'interne', 'moniteur', 'bureau'];
function titreDeSuiviSE(titre){
  const t = ' ' + normSE(titre) + ' ';
  return / important/.test(t) || (/ suivi /.test(t) && / exam/.test(t));
}
function carteSuiviReglagesSE(r){
  const c = document.createElement('div');
  c.className = 'regSuivi';
  c.innerHTML = '<div style="font-weight:800;">📌 Conversations lues pour le suivi des élèves</div>' +
    '<div style="font-size:12px;color:var(--muted);margin:3px 0 8px;line-height:1.45;">Un message qui nomme un élève (ou « mon élève actuel ») dans une de ces conversations va tout seul dans « ⚠️ Suivi de … » de cet élève. ' +
    'D’office : « Message important » et « Suivi examen ». Jamais les conversations avec les élèves.</div>';
  const reg = (r && r.suiviConvs) || { ajoutees: [], retirees: [] };
  const liste = ((typeof conversationsEC !== 'undefined' && conversationsEC) || [])
    .filter(x => GENRES_SUIVI_SE.indexOf(x.genre) !== -1 && !x.eleve);
  if(!liste.length){
    const v = document.createElement('div');
    v.style.cssText = 'font-size:12.5px;color:var(--muted);';
    v.textContent = 'Aucune conversation entre vous à proposer.';
    c.appendChild(v);
    return c;
  }
  liste.forEach(x => {
    const parDefaut = titreDeSuiviSE(x.titre);
    const lue = reg.ajoutees.indexOf(x.id) !== -1 || (parDefaut && reg.retirees.indexOf(x.id) === -1);
    const l = document.createElement('label');
    l.className = 'regSuiviL';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = lue;
    cb.setAttribute('data-conv', x.id);
    l.appendChild(cb);
    const t = document.createElement('span');
    const nom = x.titre || ((typeof ckTitreListe === 'function') ? ckTitreListe(x) : 'Conversation');
    t.textContent = (x.genre === 'groupe' ? '👥 ' : '🏠 ') + nom + (parDefaut ? ' · d’office' : '');
    l.appendChild(t);
    cb.addEventListener('change', async () => {
      const v = { ajoutees: reg.ajoutees.filter(i => i !== x.id), retirees: reg.retirees.filter(i => i !== x.id) };
      if(cb.checked && !parDefaut) v.ajoutees.push(x.id);
      if(!cb.checked && parDefaut) v.retirees.push(x.id);
      cb.disabled = true;
      try{
        const rep = await appelPrep({ action: 'msgReglageSet', cle: 'suiviConversations', valeur: v });
        if(rep && rep.status === 'error') throw new Error(rep.message || 'refusé');
        reg.ajoutees = v.ajoutees; reg.retirees = v.retirees;
        if(typeof showToast === 'function') showToast(cb.checked ? '📌 Lue pour le suivi' : 'Plus lue pour le suivi');
      }catch(e){
        cb.checked = !cb.checked;
        if(typeof showToast === 'function') showToast('Impossible : ' + (e.message || e));
      }
      cb.disabled = false;
    });
    c.appendChild(l);
  });
  return c;
}

/* ============================================================
   👤 v1273 — DANS LE DOSSIER ÉLÈVE (« Dans le dossier élève, je suis
   ok ») : un résumé rouge en haut quand il y a quelque chose à
   savoir, et l'onglet « ⚠️ Suivi » avec tout.
   ============================================================ */
function banniereSuiviSE(nom){
  const b = document.createElement('div');
  b.className = 'suiviBanniere suiviVivant';
  b.dataset.suiviDe = normSE(nom);
  b.style.display = 'none';
  b._maj = () => {
    const d = suiviSE(nom);
    if(!d || !aQuelqueChoseSE(d)){ b.style.display = 'none'; return; }
    b.style.display = '';
    b.classList.toggle('calme', !aSavoirSE(d));
    const f = d.fiche || {};
    const l = [];
    const cases = CASES_SUIVI_SE.filter(c => f[c.k]).map(c => c.t);
    if(cases.length) l.push(echSE(cases.join(' · ')));
    if(String(f.texte || '').trim()) l.push('📝 ' + echSE(String(f.texte).slice(0, 70)) + (String(f.texte).length > 70 ? '…' : ''));
    const bout = [];
    if((d.reperes || []).length) bout.push('👁️ ' + d.reperes.length + ' repère' + (d.reperes.length > 1 ? 's' : ''));
    if((d.messages || []).length) bout.push('💬 ' + d.messages.length + ' message' + (d.messages.length > 1 ? 's' : '') + ', le dernier de ' + echSE(d.messages[0].auteur || ''));
    if(bout.length) l.push(bout.join(' · '));
    b.innerHTML = '<div class="t">⚠️ SUIVI DE ' + echSE(prenomSE(nom).toUpperCase()) + ' <span>ouvrir ▸</span></div><div class="l">' + l.join('<br>') + '</div>';
  };
  b.addEventListener('click', () => { if(typeof choisirOngletEleve === 'function') choisirOngletEleve('suivi'); });
  chargerSuiviSE(nom).then(() => b._maj());
  b._maj();
  return b;
}
function ongletSuiviEleveSE(corps, nom){
  const w = document.createElement('div');
  w.className = 'suiviOnglet suiviVivant';
  w.dataset.suiviDe = normSE(nom);
  w._maj = () => {
    const d = suiviSE(nom);
    const a = document.activeElement;
    if(a && w.contains(a) && /TEXTAREA|INPUT|SELECT/.test(a.tagName)) return;
    w.innerHTML = '';
    w.classList.toggle('rouge', aSavoirSE(d));
    const t = document.createElement('div');
    t.className = 'suiviOngletTitre';
    t.textContent = '⚠️ Suivi de ' + prenomSE(nom);
    w.appendChild(t);
    w.appendChild(d ? contenuSuiviSE(nom, d) : Object.assign(document.createElement('div'), { className: 'suiviAide', textContent: 'Lecture…' }));
  };
  corps.appendChild(w);
  w._maj();
  chargerSuiviSE(nom, true);
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-suivi-eleve.js'] = true;
