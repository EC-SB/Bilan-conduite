/* Déployé le 22/10/2026 à 17:10 — v1246 */
/* ============================================================
   ec-verifs.js — 🧰 LES QUESTIONS DE VÉRIFICATION (v1246)

   David, le 22/10 : « là où on met le numéro de la question, je veux
   que tu mettes directement les questions correspondantes — VI ce
   sont les vérifications intérieures et VE les extérieures » ; et
   « un endroit, la base de données des questions de vérification, que
   je puisse modifier au besoin et dire : cette question est
   neutralisée, remplacée soit directement dans la case soit par une
   autre ».

   Ses choix sur le schéma :
     · les réponses sont « cachées derrière le bouton » 👁️ ;
     · le bilan porte les questions ET leurs réponses (« C ») ;
     · la banque se modifie par « les admin uniquement » ;
     · les 5 questions PLS (11, 18, 59, 76, 97) sont « neutralisées
       d'office » (dans ec-verifs-banque.js).

   TROIS ENDROITS MONTRENT LA QUESTION, dès qu'un numéro est tapé :
     1. l'examen blanc et le RVP : la carte entière sous « N° de la
        question » ;
     2. l'examen officiel : le numéro et le bouton sous le champ, et
        chaque partie dans SA zone (Vérification, QSER, 1ers secours) ;
     3. l'en-tête des cours (Carte SD · Installation · Vérifications),
        au questionnaire et au vocal : la carte sous « Question n° ».

   ⚠️ LA CARTE N'EST PAS UN CHAMP. Elle ne porte ni input ni textarea :
   une fiche se replace par le rang de ses champs (voir
   champsDeSaisieManuelle), et une case de plus décalerait tout. Elle
   se repose seule (écoute + un coup d'œil chaque seconde) : une fiche
   reprise, une zone redessinée retrouvent leur carte.

   LE TEXTE : BANQUE_VERIFS_DSR (le texte officiel, qui ne bouge pas)
   + ce que les administrateurs ont changé (D1, verifsLire), gardé dans
   ce navigateur pour que le bilan l'ait même sans réseau.
   ============================================================ */
const VERIFS = {
  surcharges: {},       /* n → la question telle que modifiée */
  admin: false,
  lu: 0,                /* quand la banque a été relue */
  enCours: null,
  reponses: false,      /* 👁️ — un seul interrupteur pour toutes les cartes */
  version: 0,           /* change à chaque relecture : les cartes se redessinent */
  filtre: 'toutes', cherche: ''
};
const VERIFS_PARTIES = ['verif', 'qser', 'secours'];
const VERIFS_CLE_LOCALE = 'ecVerifsBanque';
try{
  const x = JSON.parse(localStorage.getItem(VERIFS_CLE_LOCALE) || 'null');
  if(x && x.surcharges && typeof x.surcharges === 'object') VERIFS.surcharges = x.surcharges;
}catch(e){}

/* ---------- La banque ---------- */
function verifsNumero(v){
  const m = String(v == null ? '' : v).match(/\d{1,3}/);
  const n = m ? Number(m[0]) : 0;
  return n >= 1 && n <= 100 ? n : 0;
}
function verifsOfficielle(n){
  return (typeof BANQUE_VERIFS_DSR !== 'undefined' && BANQUE_VERIFS_DSR[n - 1] && BANQUE_VERIFS_DSR[n - 1].n === n)
    ? BANQUE_VERIFS_DSR[n - 1]
    : ((typeof BANQUE_VERIFS_DSR !== 'undefined' && BANQUE_VERIFS_DSR.find(x => x.n === n)) || null);
}
/* La question telle qu'elle se lit aujourd'hui */
function verifsQuestion(n){
  const o = verifsOfficielle(n);
  if(!o) return null;
  const s = VERIFS.surcharges[String(n)];
  if(!s) return o;
  const q = { n: n, type: o.type, modifiee: true, majLe: s.majLe || '', par: s.par || '' };
  VERIFS_PARTIES.forEach(k => { q[k] = s[k] != null ? s[k] : o[k]; q[k + 'Rep'] = s[k + 'Rep'] != null ? s[k + 'Rep'] : o[k + 'Rep']; });
  q.neutre = (s.neutre && typeof s.neutre === 'object') ? s.neutre : {};
  return q;
}
function verifsNomPartie(k, type){
  return k === 'verif' ? (type === 'VE' ? 'Vérification extérieure' : 'Vérification intérieure')
       : k === 'qser' ? 'QSER' : '1ers secours';
}
/* Ce qui se pose vraiment pour une partie : la question, ou sa
   remplaçante quand elle est neutralisée.
   « suivante » = la question suivante dont la MÊME partie n'est pas
   neutralisée (après la 100, la 1) — la règle de la DSR. */
function verifsPartieDemandee(n, k, prof){
  const x = verifsQuestion(n);
  if(!x) return null;
  const ne = x.neutre && x.neutre[k];
  if(!ne) return { q: x[k] || '', r: x[k + 'Rep'] || '', neutre: null, depuis: n };
  const res = { q: '', r: '', neutre: ne, depuis: null, barre: x[k] || '' };
  prof = prof || 0;
  if(ne.mode === 'texte'){
    res.q = ne.q || ''; res.r = ne.r || '';
  }else if(ne.mode === 'num' && verifsNumero(ne.num) && verifsNumero(ne.num) !== n && prof < 5){
    const y = verifsPartieDemandee(verifsNumero(ne.num), k, prof + 1);
    if(y){ res.q = y.q; res.r = y.r; res.depuis = y.depuis; }
  }else{
    for(let i = 1; i < 100; i++){
      const m = ((n - 1 + i) % 100) + 1;
      const y = verifsQuestion(m);
      if(y && !(y.neutre && y.neutre[k])){ res.q = y[k] || ''; res.r = y[k + 'Rep'] || ''; res.depuis = m; break; }
    }
  }
  return res;
}
function verifsDeuxChiffres(n){ return String(n).padStart(2, '0'); }
function verifsPhraseRemplacement(d){
  const ne = d.neutre || {};
  return '⚠️ Neutralisée' + (ne.pourquoi ? ' (' + ne.pourquoi + ')' : '') + ' — ' +
    (ne.mode === 'texte' ? 'l’inspecteur pose à la place :'
     : ne.mode === 'num' ? 'l’inspecteur pose celle du n° ' + verifsDeuxChiffres(d.depuis || ne.num) + ' :'
     : 'l’inspecteur pose la suivante' + (d.depuis ? ', celle du n° ' + verifsDeuxChiffres(d.depuis) : '') + ' :');
}

/* ---------- Relire ce que les administrateurs ont changé ---------- */
function verifsARelire(){ return !VERIFS.lu || Date.now() - VERIFS.lu >= 30 * 60 * 1000; }
function chargerVerifs(force){
  if(VERIFS.enCours) return VERIFS.enCours;
  if(!force && !verifsARelire()) return Promise.resolve(false);
  if(typeof appelPrep !== 'function') return Promise.resolve(false);
  VERIFS.enCours = appelPrep({ action: 'verifsLire' }).then(r => {
    VERIFS.enCours = null;
    if(!r || r.status !== 'ok') return false;
    verifsRecevoir(r);
    return true;
  }).catch(() => { VERIFS.enCours = null; VERIFS.lu = Date.now() - 25 * 60 * 1000; return false; });
  return VERIFS.enCours;
}
function verifsRecevoir(r){
  VERIFS.surcharges = (r.surcharges && typeof r.surcharges === 'object') ? r.surcharges : {};
  VERIFS.admin = !!r.admin;
  VERIFS.lu = Date.now();
  VERIFS.version++;
  try{ localStorage.setItem(VERIFS_CLE_LOCALE, JSON.stringify({ surcharges: VERIFS.surcharges })); }catch(e){}
}
function verifsConnecte(){
  return typeof ACCES !== 'undefined' && ACCES && !!ACCES.role;
}

/* ============================================================
   LA CARTE D'UNE QUESTION
   ============================================================ */
function vqEl(tag, cls, texte){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(texte != null) e.textContent = texte;
  return e;
}
function vqBoutonReponses(){
  const b = vqEl('button', 'vqBouton', VERIFS.reponses ? '🙈 Cacher les réponses' : '👁️ Voir les réponses');
  b.type = 'button';
  b.setAttribute('data-hors-saisie', '1');
  b.addEventListener('click', ev => {
    ev.preventDefault(); ev.stopPropagation();
    VERIFS.reponses = !VERIFS.reponses;
    verifsPoserCartes(true);
    if(typeof afficherVerifs === 'function' && document.getElementById('vbListe')) vbDessinerListe();
  });
  return b;
}
function vqTete(x){
  const t = vqEl('div', 'vqTete');
  t.appendChild(document.createTextNode('📖 Question ' + verifsDeuxChiffres(x.n) + ' '));
  t.appendChild(vqEl('span', 'vqType ' + x.type, x.type));
  t.appendChild(vqBoutonReponses());
  return t;
}
const VQ_LAB = { verif: 'v', qser: 'q', secours: 's' };
function vqLigne(x, k){
  const l = vqEl('div', 'vqL');
  l.appendChild(vqEl('span', 'vqLab ' + VQ_LAB[k], verifsNomPartie(k, x.type)));
  const d = verifsPartieDemandee(x.n, k);
  const rep = t => { if(VERIFS.reponses && t) l.lastChild.appendChild(vqEl('div', 'vqRep', '→ ' + t)); };
  if(!d.neutre){
    l.appendChild(vqEl('span', '', d.q || '—'));
    if(VERIFS.reponses && d.r) l.appendChild(vqEl('div', 'vqRep', '→ ' + d.r));
    return l;
  }
  l.appendChild(vqEl('span', 'vqBarre', d.barre));
  const n = vqEl('div', 'vqNeutre');
  n.appendChild(vqEl('b', '', verifsPhraseRemplacement(d)));
  n.appendChild(document.createElement('br'));
  n.appendChild(document.createTextNode(d.q || '—'));
  l.appendChild(n);
  rep(d.r);
  return l;
}
function vqCarte(n, seul){
  const x = verifsQuestion(n);
  const c = vqEl('div', 'vqCarte');
  c.setAttribute('data-vq', '1');
  if(!x){
    c.appendChild(vqEl('div', 'vqInconnue', '❔ Pas de question n° ' + n + ' dans la banque (1 à 100).'));
    return c;
  }
  if(seul === 'tete'){ c.classList.add('vqSeuleTete'); c.appendChild(vqTete(x)); return c; }
  if(!seul) c.appendChild(vqTete(x));
  (seul ? [seul] : VERIFS_PARTIES).forEach(k => c.appendChild(vqLigne(x, k)));
  return c;
}

/* ---------- Les poser là où un numéro est tapé ---------- */
function vqSignature(n){ return n + '|' + VERIFS.reponses + '|' + VERIFS.version; }
/* Pose (ou retire) la carte d'un endroit : « hote » la reçoit à la fin,
   ou juste après « apres » */
function vqPoser(hote, cle, n, seul, apres){
  let c = null;
  const deja = apres ? apres.parentNode && apres.parentNode.querySelector(':scope > .vqCarte[data-vq-pour="' + cle + '"]')
                     : hote.querySelector(':scope > .vqCarte[data-vq-pour="' + cle + '"]');
  if(!n){ if(deja) deja.remove(); return; }
  const sig = vqSignature(n);
  if(deja && deja.getAttribute('data-vq-sig') === sig) return;
  c = vqCarte(n, seul);
  c.setAttribute('data-vq-pour', cle);
  c.setAttribute('data-vq-sig', sig);
  if(deja) deja.replaceWith(c);
  else if(apres) apres.parentNode.insertBefore(c, apres.nextSibling);
  else hote.appendChild(c);
}
function verifsPoserCartes(forcer){
  if(forcer) document.querySelectorAll('.vqCarte[data-vq-sig]').forEach(c => c.setAttribute('data-vq-sig', ''));
  /* 1 · 2 — les fiches (questionnaire) */
  /* Le questionnaire (#manuelChamps) ET le module examen blanc du RVP
     au vocal (#examenBlancCours) : les mêmes zones, dessinées ailleurs */
  {
    document.querySelectorAll('[data-zone$="examen.verifQuestion"]').forEach(z => {
      const racine = z.closest('#manuelChamps, #examenBlancCours') || document;
      const cle = z.getAttribute('data-zone');
      const champ = z.querySelector('textarea, input[type="text"], input:not([type])');
      const n = champ ? verifsNumero(champ.value) : 0;
      const prefixe = cle.slice(0, cle.length - 'verifQuestion'.length);
      const zv = racine.querySelector('[data-zone="' + prefixe + 'vi"]');
      const zq = racine.querySelector('[data-zone="' + prefixe + 'qser"]');
      const zs = racine.querySelector('[data-zone="' + prefixe + 'secours"]');
      if(zv && zq && zs){
        /* l'examen officiel : chaque partie dans sa zone */
        vqPoser(z, cle, n, 'tete');
        [[zv, 'verif'], [zq, 'qser'], [zs, 'secours']].forEach(([zz, k]) => {
          if(zz.style.flexWrap !== 'wrap') zz.style.flexWrap = 'wrap';
          vqPoser(zz, cle + ':' + k, n, k);
        });
      }else{
        vqPoser(z, cle, n, null);
      }
    });
  }
  /* 3 — l'en-tête des cours, au questionnaire et au vocal */
  document.querySelectorAll('input.enteteTexte[data-cle="verifQuestion"], input.entTexte[data-cle="verifQuestion"]').forEach((i, rang) => {
    const duo = i.parentNode && i.parentNode.parentNode;
    if(!duo || !duo.parentNode) return;
    vqPoser(duo.parentNode, 'entete' + rang, verifsNumero(i.value), null, duo);
  });
  /* La banque se relit une fois connecté (puis toutes les 30 minutes) */
  if(verifsConnecte() && !VERIFS.enCours && document.querySelector('.vqCarte') && verifsARelire())
    chargerVerifs().then(ok => { if(ok) verifsPoserCartes(); });
}
document.addEventListener('input', ev => {
  const t = ev.target;
  if(!t || !t.matches) return;
  if(t.matches('[data-zone$="examen.verifQuestion"] textarea, [data-zone$="examen.verifQuestion"] input, input[data-cle="verifQuestion"]')) verifsPoserCartes();
}, true);
setInterval(() => { if(!document.hidden) verifsPoserCartes(); }, 1000);

/* ============================================================
   LE BILAN — « C » : les questions ET leurs réponses
   ============================================================ */
function ligneVerifPourLeBilan(valeur, k, avecNom){
  const n = verifsNumero(valeur);
  const x = n && verifsQuestion(n);
  if(!x) return '';
  const d = verifsPartieDemandee(n, k);
  if(!d || !d.q) return '';
  return (avecNom ? verifsNomPartie(k, x.type).replace(/^Vérification (intérieure|extérieure)$/, x.type) +
                    (d.neutre ? ' (remplace la question neutralisée)' : '') + ' : '
                  : (d.neutre ? '(remplace la question neutralisée) ' : '')) +
    d.q + (d.r ? ' → ' + d.r : '');
}
function lignesVerifsPourLeBilan(valeur){
  return VERIFS_PARTIES.map(k => ligneVerifPourLeBilan(valeur, k, true)).filter(Boolean);
}

/* ============================================================
   🧰 L'ÉCRAN DE LA BANQUE — Outils › Ce qu'on écrit › Vérifications
   ============================================================ */
function vbEstAdmin(){ return VERIFS.admin || (typeof ACCES !== 'undefined' && ACCES && ACCES.role === 'admin'); }
function vbSansAccents(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function vbToutes(){ return (typeof BANQUE_VERIFS_DSR !== 'undefined' ? BANQUE_VERIFS_DSR : []).map(o => verifsQuestion(o.n)); }
function vbNeutralisees(){ return vbToutes().filter(x => x.neutre && Object.keys(x.neutre).length); }

async function afficherVerifs(){
  const z = document.getElementById('verifsZone');
  if(!z) return;
  if(!z.querySelector('#vbListe')) vbDessinerEcran(z);
  const ok = await chargerVerifs(true);
  if(!ok && verifsARelire()) showToastVerifs('⚠️ Banque lue hors ligne : les dernières modifications ne sont peut-être pas là.');
  vbDessinerEcran(z);
}
function showToastVerifs(m){ if(typeof showToast === 'function') showToast(m); }

function vbDessinerEcran(z){
  z.innerHTML = '';
  const b = vqEl('div', 'vb');
  b.appendChild(vqEl('div', 'vbIntro', 'Les 100 questions de l’examen (banque DSR du 1er janvier 2018) : la vérification (VI intérieure, VE extérieure), la question de sécurité routière (QSER) et celle de premiers secours, avec leurs réponses. Les fiches les montrent dès qu’on tape le numéro. ' +
    (vbEstAdmin() ? 'Une question peut être corrigée (✏️), ou neutralisée et remplacée.' : 'Seul un administrateur les modifie.')));
  const rang = vqEl('div', 'vbRang');
  const ch = vqEl('input', 'vbCherche');
  ch.type = 'text';
  ch.placeholder = '🔎 Un numéro ou un mot (« lave-glace », « PLS »…)';
  ch.value = VERIFS.cherche;
  ch.setAttribute('data-hors-saisie', '1');
  ch.addEventListener('input', () => { VERIFS.cherche = ch.value; vbDessinerListe(); });
  rang.appendChild(ch);
  const bouton = (t, quoi) => { const x = vqEl('button', 'btn btn-secondary', t); x.type = 'button'; x.addEventListener('click', quoi); return x; };
  if(vbEstAdmin()) rang.appendChild(bouton('⚠️ Neutraliser des questions', () => vbFenetreLot()));
  rang.appendChild(bouton('📄 Exporter en PDF', () => vbExporter()));
  b.appendChild(rang);
  const puces = vqEl('div', 'vbRang vbPuces');
  puces.id = 'vbPuces';
  b.appendChild(puces);
  const ban = vqEl('div', 'vbBandeau');
  ban.id = 'vbBandeau';
  b.appendChild(ban);
  const l = vqEl('div', 'vbListe');
  l.id = 'vbListe';
  b.appendChild(l);
  z.appendChild(b);
  vbDessinerListe();
}
function vbDessinerListe(){
  const l = document.getElementById('vbListe');
  if(!l) return;
  const toutes = vbToutes();
  const neutres = toutes.filter(x => x.neutre && Object.keys(x.neutre).length);
  const modifs = toutes.filter(x => x.modifiee);
  /* les puces */
  const p = document.getElementById('vbPuces');
  p.innerHTML = '';
  [['toutes', 'Toutes · ' + toutes.length], ['VI', 'VI · ' + toutes.filter(x => x.type === 'VI').length],
   ['VE', 'VE · ' + toutes.filter(x => x.type === 'VE').length], ['neutre', '⚠️ Neutralisées · ' + neutres.length],
   ['modif', '✏️ Modifiées · ' + modifs.length]].forEach(([v, t]) => {
    const b = vqEl('button', 'vbPuce' + (VERIFS.filtre === v ? ' on' : ''), t);
    b.type = 'button';
    b.addEventListener('click', () => { VERIFS.filtre = v; vbDessinerListe(); });
    p.appendChild(b);
  });
  p.appendChild(vqBoutonReponses());
  /* le bandeau des neutralisées */
  const ban = document.getElementById('vbBandeau');
  ban.innerHTML = '';
  ban.style.display = neutres.length ? '' : 'none';
  if(neutres.length){
    const parPartie = {};
    neutres.forEach(x => Object.keys(x.neutre).forEach(k => { (parPartie[k] = parPartie[k] || []).push(x.n); }));
    ban.textContent = '⚠️ Neutralisées : ' + Object.keys(parPartie).map(k =>
      verifsNomPartie(k, '').replace('Vérification intérieure', 'vérification') + ' des questions ' + parPartie[k].join(', ')).join(' · ') +
      ' — l’inspecteur pose la remplaçante, et les fiches la montrent.';
  }
  /* la liste */
  const mot = vbSansAccents(VERIFS.cherche.trim());
  const num = /^\d{1,3}$/.test(VERIFS.cherche.trim()) ? Number(VERIFS.cherche.trim()) : 0;
  const vues = toutes.filter(x => {
    if(VERIFS.filtre === 'VI' || VERIFS.filtre === 'VE'){ if(x.type !== VERIFS.filtre) return false; }
    if(VERIFS.filtre === 'neutre' && !(x.neutre && Object.keys(x.neutre).length)) return false;
    if(VERIFS.filtre === 'modif' && !x.modifiee) return false;
    if(num) return x.n === num;
    if(mot){
      const tout = vbSansAccents(VERIFS_PARTIES.map(k => x[k] + ' ' + x[k + 'Rep']).join(' ') +
        (x.neutre && Object.keys(x.neutre).length ? ' neutralisee ' + Object.values(x.neutre).map(v => v.pourquoi || '').join(' ') : ''));
      return mot.split(/\s+/).every(m => tout.indexOf(m) !== -1);
    }
    return true;
  });
  l.innerHTML = '';
  if(!vues.length){ l.appendChild(vqEl('div', 'empty', 'Aucune question ne correspond.')); return; }
  const admin = vbEstAdmin();
  vues.forEach(x => {
    const r = vqEl('div', 'vbLigne');
    r.setAttribute('data-n', String(x.n));
    const t = vqEl('div', 'vbTeteL');
    t.appendChild(vqEl('span', 'vbN', verifsDeuxChiffres(x.n)));
    t.appendChild(vqEl('span', 'vqType ' + x.type, x.type));
    if(x.modifiee) t.appendChild(vqEl('span', 'vbModif', '✏️ modifiée' + (x.par ? ' par ' + x.par : '') + (x.majLe ? ' · ' + x.majLe : '')));
    if(admin){
      const e = vqEl('button', 'vbCrayon', '✏️');
      e.type = 'button';
      e.title = 'Modifier la question ' + x.n;
      e.addEventListener('click', () => vbFenetreQuestion(x.n));
      t.appendChild(e);
    }
    r.appendChild(t);
    VERIFS_PARTIES.forEach(k => r.appendChild(vqLigne(x, k)));
    l.appendChild(r);
  });
}

/* ---------- ✏️ Une question ---------- */
function vbFenetre(titre){
  const fond = vqEl('div', 'overlay show');
  const boite = vqEl('div', 'modal vbModal');
  boite.appendChild(vqEl('h3', '', titre));
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => { if(fond.parentNode) fond.remove(); };
  fond.addEventListener('click', ev => { if(ev.target === fond) fermer(); });
  return { boite, fermer };
}
function vbPuces(choix, valeur, quoi){
  const r = vqEl('div', 'vbChx');
  choix.forEach(([v, t]) => {
    const b = vqEl('button', 'vbPuce' + (v === valeur ? ' on' : ''), t);
    b.type = 'button';
    b.addEventListener('click', () => { r.querySelectorAll('.vbPuce').forEach(y => y.classList.toggle('on', y === b)); quoi(v); });
    r.appendChild(b);
  });
  return r;
}
function vbZone(valeur, lignes, ph){
  const t = vqEl('textarea', 'vbTexte');
  t.rows = lignes || 2;
  t.value = valeur || '';
  if(ph) t.placeholder = ph;
  return t;
}
async function vbEnvoyer(donnees, bouton){
  if(bouton){ bouton.disabled = true; }
  try{
    const r = await appelPrep(donnees);
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'enregistrement impossible');
    verifsRecevoir(r);
    vbDessinerListe();
    verifsPoserCartes(true);
    return true;
  }catch(e){
    showToastVerifs('⚠️ ' + ((e && e.message) || e));
    return false;
  }finally{
    if(bouton) bouton.disabled = false;
  }
}
function vbFenetreQuestion(n){
  if(!vbEstAdmin()) return;
  const x = verifsQuestion(n);
  if(!x) return;
  const brouillon = { neutre: JSON.parse(JSON.stringify(x.neutre || {})) };
  VERIFS_PARTIES.forEach(k => { brouillon[k] = x[k] || ''; brouillon[k + 'Rep'] = x[k + 'Rep'] || ''; });
  const f = vbFenetre('✏️ Question ' + verifsDeuxChiffres(n) + ' · ' + x.type);
  f.boite.appendChild(vqEl('div', 'vbAide', 'Ce que tu changes ici remplace le texte partout (fiches et bilans). « ↩️ Texte officiel » remet celui de la DSR.'));
  const champs = {};
  VERIFS_PARTIES.forEach(k => {
    const bl = vqEl('div', 'vbBloc');
    bl.appendChild(vqEl('div', 'vbBlocT', (k === 'verif' ? '🔎 ' : k === 'qser' ? '🚦 ' : '🚑 ') + verifsNomPartie(k, x.type)));
    bl.appendChild(vqEl('div', 'vbLab', 'La question'));
    const tq = vbZone(brouillon[k], 2); bl.appendChild(tq);
    bl.appendChild(vqEl('div', 'vbLab', 'La réponse'));
    const tr = vbZone(brouillon[k + 'Rep'], 2, k === 'verif' ? '(facultatif)' : ''); bl.appendChild(tr);
    champs[k] = { tq, tr };
    const sous = vqEl('div', 'vbSous');
    const dessinerSous = () => {
      sous.innerHTML = '';
      const ne = brouillon.neutre[k];
      if(!ne) return;
      sous.appendChild(vqEl('div', 'vbLab', 'Pourquoi (montré au moniteur)'));
      const pq = vqEl('input', 'vbIn');
      pq.type = 'text'; pq.value = ne.pourquoi || ''; pq.placeholder = 'Ex : position latérale de sécurité, en attente de la refonte';
      pq.addEventListener('input', () => { ne.pourquoi = pq.value; });
      sous.appendChild(pq);
      sous.appendChild(vqEl('div', 'vbLab', 'Remplacée par'));
      const suiv = (() => { for(let i = 1; i < 100; i++){ const m = ((n - 1 + i) % 100) + 1; const y = verifsQuestion(m); if(y && !(y.neutre && y.neutre[k])) return m; } return 0; })();
      sous.appendChild(vbPuces([['suivante', '⏭️ La suivante' + (suiv ? ' (n° ' + suiv + ')' : '')], ['num', '🔢 Une autre question n° …'], ['texte', '✏️ Une question écrite ici']],
        ne.mode || 'suivante', v => { ne.mode = v; dessinerSous(); }));
      if(ne.mode === 'num'){
        const i = vqEl('input', 'vbIn vbNum');
        i.type = 'number'; i.min = '1'; i.max = '100'; i.value = ne.num || ''; i.placeholder = 'N°';
        i.addEventListener('input', () => { ne.num = verifsNumero(i.value) || ''; });
        sous.appendChild(i);
      }
      if(ne.mode === 'texte'){
        sous.appendChild(vqEl('div', 'vbLab', 'La question posée à la place'));
        const a = vbZone(ne.q, 2); a.addEventListener('input', () => { ne.q = a.value; }); sous.appendChild(a);
        sous.appendChild(vqEl('div', 'vbLab', 'Sa réponse'));
        const r = vbZone(ne.r, 2); r.addEventListener('input', () => { ne.r = r.value; }); sous.appendChild(r);
      }
    };
    bl.appendChild(vbPuces([['pose', '✅ Posée'], ['neutre', '⚠️ Neutralisée']], brouillon.neutre[k] ? 'neutre' : 'pose', v => {
      if(v === 'neutre') brouillon.neutre[k] = brouillon.neutre[k] || { mode: 'suivante', pourquoi: '' };
      else delete brouillon.neutre[k];
      dessinerSous();
    }));
    bl.appendChild(sous);
    dessinerSous();
    f.boite.appendChild(bl);
  });
  const rang = vqEl('div', 'btn-row vbBtn');
  const ok = vqEl('button', 'btn btn-primary', '💾 Enregistrer'); ok.type = 'button';
  ok.addEventListener('click', async () => {
    const q = { neutre: {} };
    VERIFS_PARTIES.forEach(k => { q[k] = champs[k].tq.value.trim(); q[k + 'Rep'] = champs[k].tr.value.trim(); });
    Object.keys(brouillon.neutre).forEach(k => {
      const ne = brouillon.neutre[k];
      if(ne.mode === 'num' && !verifsNumero(ne.num)) ne.mode = 'suivante';
      if(ne.mode === 'texte' && !String(ne.q || '').trim()) ne.mode = 'suivante';
      q.neutre[k] = ne;
    });
    if(!q.qser || !q.secours || !q.verif){ showToastVerifs('Chaque partie garde sa question.'); return; }
    if(await vbEnvoyer({ action: 'verifsPoser', n: n, question: q }, ok)){ showToastVerifs('✅ Question ' + n + ' enregistrée'); f.fermer(); }
  });
  rang.appendChild(ok);
  if(VERIFS.surcharges[String(n)]){
    const ret = vqEl('button', 'btn btn-secondary', '↩️ Texte officiel'); ret.type = 'button';
    ret.addEventListener('click', async () => {
      if(!confirm('Remettre la question ' + n + ' au texte officiel de la DSR ?')) return;
      if(await vbEnvoyer({ action: 'verifsRetirer', n: n }, ret)){ showToastVerifs('↩️ Question ' + n + ' remise au texte officiel'); f.fermer(); }
    });
    rang.appendChild(ret);
  }
  const fe = vqEl('button', 'btn btn-secondary', 'Fermer'); fe.type = 'button';
  fe.addEventListener('click', f.fermer);
  rang.appendChild(fe);
  f.boite.appendChild(rang);
}

/* ---------- ⚠️ Neutraliser d'un coup (quand la DSR en annonce) ---------- */
function vbFenetreLot(){
  if(!vbEstAdmin()) return;
  const l = { partie: 'secours', mode: 'suivante', pourquoi: '', q: '', r: '' };
  const f = vbFenetre('⚠️ Neutraliser des questions');
  f.boite.appendChild(vqEl('div', 'vbAide', 'Quand la DSR annonce des questions neutralisées : tape-les toutes d’un coup.'));
  f.boite.appendChild(vqEl('div', 'vbLab', 'Les numéros'));
  const nums = vqEl('input', 'vbIn'); nums.type = 'text'; nums.placeholder = 'Ex : 11, 18, 59, 76, 97';
  f.boite.appendChild(nums);
  f.boite.appendChild(vqEl('div', 'vbLab', 'Quelle partie'));
  f.boite.appendChild(vbPuces([['verif', '🔎 Vérification'], ['qser', '🚦 QSER'], ['secours', '🚑 1ers secours']], l.partie, v => { l.partie = v; }));
  f.boite.appendChild(vqEl('div', 'vbLab', 'Remplacée par'));
  const sousT = vqEl('div', '');
  f.boite.appendChild(vbPuces([['suivante', '⏭️ La suivante'], ['texte', '✏️ Une question écrite ici']], l.mode, v => { l.mode = v; sousT.style.display = v === 'texte' ? '' : 'none'; }));
  sousT.style.display = 'none';
  sousT.appendChild(vqEl('div', 'vbLab', 'La question posée à la place'));
  const tq = vbZone('', 2); sousT.appendChild(tq);
  sousT.appendChild(vqEl('div', 'vbLab', 'Sa réponse'));
  const tr = vbZone('', 2); sousT.appendChild(tr);
  f.boite.appendChild(sousT);
  f.boite.appendChild(vqEl('div', 'vbLab', 'Pourquoi (montré au moniteur)'));
  const pq = vqEl('input', 'vbIn'); pq.type = 'text'; pq.placeholder = 'Ex : en attente de la refonte de la banque';
  f.boite.appendChild(pq);
  const rang = vqEl('div', 'btn-row vbBtn');
  const ok = vqEl('button', 'btn btn-primary', '⚠️ Neutraliser'); ok.type = 'button';
  const lire = () => Array.from(new Set((nums.value.match(/\d{1,3}/g) || []).map(Number).filter(n => n >= 1 && n <= 100)));
  nums.addEventListener('input', () => { const n = lire().length; ok.textContent = '⚠️ Neutraliser' + (n ? (n === 1 ? ' la question' : ' les ' + n) : ''); });
  ok.addEventListener('click', async () => {
    const liste = lire();
    if(!liste.length){ showToastVerifs('Tape au moins un numéro (1 à 100).'); return; }
    if(l.mode === 'texte' && !tq.value.trim()){ showToastVerifs('Écris la question posée à la place.'); return; }
    const questions = liste.map(n => {
      const x = verifsQuestion(n);
      const q = { neutre: JSON.parse(JSON.stringify(x.neutre || {})) };
      VERIFS_PARTIES.forEach(k => { q[k] = x[k] || ''; q[k + 'Rep'] = x[k + 'Rep'] || ''; });
      q.neutre[l.partie] = l.mode === 'texte' ? { mode: 'texte', pourquoi: pq.value.trim(), q: tq.value.trim(), r: tr.value.trim() }
                                             : { mode: 'suivante', pourquoi: pq.value.trim() };
      return { n: n, question: q };
    });
    if(await vbEnvoyer({ action: 'verifsLot', questions: questions }, ok)){ showToastVerifs('⚠️ ' + liste.length + ' question(s) neutralisée(s)'); f.fermer(); }
  });
  rang.appendChild(ok);
  const an = vqEl('button', 'btn btn-secondary', 'Annuler'); an.type = 'button';
  an.addEventListener('click', f.fermer);
  rang.appendChild(an);
  f.boite.appendChild(rang);
}

/* ---------- 📄 La banque à imprimer (ou enregistrer en PDF) ---------- */
function vbExporter(){
  const w = window.open('', '_blank');
  if(!w){ showToastVerifs('Autorise les fenêtres pour exporter.'); return; }
  const e = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const partie = (x, k) => {
    const d = verifsPartieDemandee(x.n, k);
    const nom = verifsNomPartie(k, x.type);
    if(!d.neutre) return '<p><b>' + e(nom) + ' :</b> ' + e(d.q) + (d.r ? '<br><i>→ ' + e(d.r) + '</i>' : '') + '</p>';
    return '<p><b>' + e(nom) + ' :</b> <s>' + e(d.barre) + '</s><br><span class="n">' + e(verifsPhraseRemplacement(d)) + '</span> ' +
      e(d.q) + (d.r ? '<br><i>→ ' + e(d.r) + '</i>' : '') + '</p>';
  };
  const corps = vbToutes().map(x => '<div class="q"><h2>Question ' + verifsDeuxChiffres(x.n) + ' · ' + x.type + (x.modifiee ? ' · modifiée' : '') + '</h2>' +
    VERIFS_PARTIES.map(k => partie(x, k)).join('') + '</div>').join('');
  w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Questions de vérification</title><style>' +
    'body{font:11pt/1.4 Calibri,Carlito,Arial,sans-serif;margin:14mm;color:#111}h1{font-size:16pt;margin:0 0 4mm}' +
    '.q{break-inside:avoid;border-top:1px solid #ccc;padding:2mm 0}h2{font-size:11.5pt;margin:0 0 1mm;color:#7A0A0A}' +
    'p{margin:0 0 1.2mm}i{color:#444}.n{color:#8F5A00;font-weight:bold}s{color:#888}</style></head><body>' +
    '<h1>Questions de vérification — banque DSR' + '</h1>' + corps + '</body></html>');
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
  showToastVerifs('Choisis « Enregistrer en PDF » dans l’impression');
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-verifs.js'] = true;
