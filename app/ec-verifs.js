/* Déployé le 28/10/2026 à 20:09 — v1300 */
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
        ⚠️ v1251 : ce champ n'existe plus (un rappel à la place) ; les
        questions d'un cours se posent dans le tiroir 🧰, plus bas.

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
  /* 🧰 v1251 — et les questions posées pendant le cours */
  if(forcer && typeof qvRedessiner === 'function') qvRedessiner();
  /* La banque se relit une fois connecté (puis toutes les 30 minutes) */
  if(verifsConnecte() && !VERIFS.enCours && document.querySelector('.vqCarte') && verifsARelire())
    chargerVerifs().then(ok => { if(ok) verifsPoserCartes(true); });
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
  const vue = VERIFS.vue || 'banque';
  if(vue === 'jouer' && !z.querySelector('.vbEssai')) vbDessinerEcran(z);
  else if(!z.querySelector('#vbListe') && vue === 'banque') vbDessinerEcran(z);
  const ok = await chargerVerifs(true);
  if(!ok && verifsARelire()) showToastVerifs('⚠️ Banque lue hors ligne : les dernières modifications ne sont peut-être pas là.');
  /* la partie d'essai et l'atelier ne se redessinent pas sous les doigts */
  if(vue === 'banque' || !z.querySelector(vue === 'jouer' ? '.vbEssai' : '.at')) vbDessinerEcran(z);
}
function showToastVerifs(m){ if(typeof showToast === 'function') showToast(m); }

/* 📸 v1249 — deux onglets pour les administrateurs : la banque, et
   l'atelier du jeu (ec-jeu-atelier.js).
   🎮 v1256 — et pour toute l'équipe, « Jouer » : David, « un onglet
   pour que l'on puisse jouer au jeu de notre côté afin de tester ». */
function vbOnglets(z){
  const o = vqEl('div', 'atOng');
  const l = [['banque', '📖 Les 100 questions']];
  if(vbEstAdmin() && typeof afficherAtelierJeu === 'function') l.push(['atelier', '📸 Nos voitures — l’atelier du jeu']);
  l.push(['jouer', '🎮 Jouer (essai)']);
  l.forEach(([k, t]) => {
    const b = vqEl('button', 'vbPuce' + ((VERIFS.vue || 'banque') === k ? ' on' : ''), t);
    b.type = 'button';
    b.setAttribute('data-vue-verifs', k);
    b.addEventListener('click', () => { VERIFS.vue = k; vbDessinerEcran(z); });
    o.appendChild(b);
  });
  z.appendChild(o);
}
function vbDessinerEcran(z){
  z.innerHTML = '';
  vbOnglets(z);
  if(VERIFS.vue === 'jouer') return vbJouer(z);
  if(VERIFS.vue === 'atelier' && vbEstAdmin() && typeof afficherAtelierJeu === 'function'){
    const a = vqEl('div', 'at');
    z.appendChild(a);
    afficherAtelierJeu(a);
    return;
  }
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
/* ============================================================
   🎮 JOUER, DE NOTRE CÔTÉ — v1256

   Le VRAI jeu : eleve.html, dans un cadre de la taille d'un
   téléphone, ouvert en « partie d'essai ». L'appli lui donne ce
   qu'un élève qui n'a jamais joué recevrait (nos voitures, leurs
   photos, la banque avec ses corrections) ; la page, elle, ne parle
   pas au Worker. Choix de David : rien n'est gardé — « ↺ Recommencer »
   ou rouvrir l'onglet repart de zéro.
   ============================================================ */
function vbJouer(z){
  const c = vqEl('div', 'vbEssai');
  const rang = vqEl('div', 'vbRang');
  rang.appendChild(vqEl('div', 'vbIntro', '🧪 Le jeu tel que l’élève le voit, avec nos voitures et leurs photos. Rien n’est gardé : à chaque ouverture, on repart de zéro.'));
  const re = vqEl('button', 'btn btn-secondary', '↺ Recommencer à zéro'); re.type = 'button';
  re.addEventListener('click', () => vbDessinerEcran(z));
  rang.appendChild(re);
  c.appendChild(rang);
  const tel = vqEl('div', 'vbTel');
  tel.innerHTML = '<div class="empty">Chargement du jeu…</div>';
  c.appendChild(tel);
  z.appendChild(c);
  appelPrep({ action: 'jeuEssaiLire' }).then(d => {
    if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'le jeu ne répond pas');
    if(!tel.isConnected) return;
    const f = document.createElement('iframe');
    f.className = 'vbCadre';
    f.title = 'Le jeu des vérifications — partie d’essai';
    f.src = 'eleve.html?essai=jeu';
    tel.innerHTML = '';
    tel.appendChild(f);
    const ecoute = ev => {
      if(!f.isConnected){ window.removeEventListener('message', ecoute); return; }
      if(ev.source !== f.contentWindow || ev.origin !== location.origin) return;
      if(ev.data && ev.data.jvEssaiPret){
        f.contentWindow.postMessage({ jvEssai: d, nom: (typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur) || 'Équipe',
                                      clair: document.body.classList.contains('clair') }, location.origin);
      }
    };
    window.addEventListener('message', ecoute);
  }).catch(e => {
    if(tel.isConnected) tel.innerHTML = '<div class="empty">⚠️ ' + String((e && e.message) || e).replace(/</g, '&lt;') + '</div>';
  });
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

/* ============================================================
   🎮 v1248 — LE JEU DES ÉLÈVES, VU PAR L'ÉQUIPE

   David a choisi : « le moniteur voit la progression, pas de
   classement ». Deux endroits :
     · le dossier de l'élève, onglet 🔑 Coin révisions, sous son
       parcours : ce qu'il maîtrise, sa série, ce qu'il a à revoir, et
       la grille des 100 ;
     · Mes prochains cours : une ligne sur la carte d'un examen blanc,
       d'un examen ou d'un RVP — « 🧰 Vérifs : 23/100 · à revoir 12, 37 ».
   Le jeu lui-même est dans eleve.html (onglet « 🧰 Vérifs »).
   ============================================================ */
const JEU_CACHE = {};          /* nom → { t, r } */
const JEU_MODELES_CARTE = ['examen-blanc', 'examen-officiel', 'aac-rvp'];
let jeuEnCours = null;
function jeuCle(nom){ return String(nom || '').trim().toLowerCase(); }
async function resumesDuJeu(noms){
  const manquent = noms.filter(n => { const c = JEU_CACHE[jeuCle(n)]; return !c || Date.now() - c.t > 5 * 60000; });
  if(manquent.length && typeof appelPrep === 'function'){
    const r = await appelPrep({ action: 'verifsEleves', eleves: manquent });
    const el = (r && r.eleves) || {};
    manquent.forEach(n => {
      const k = Object.keys(el).find(x => jeuCle(x) === jeuCle(n));
      JEU_CACHE[jeuCle(n)] = { t: Date.now(), r: k ? el[k] : null };
    });
  }
  const out = {};
  noms.forEach(n => { const c = JEU_CACHE[jeuCle(n)]; out[n] = c ? c.r : null; });
  return out;
}
function jeuPhraseRevoir(l){
  if(!l || !l.length) return '';
  return l.slice(0, 8).join(' · ') + (l.length > 8 ? ' …' : '');
}
/* Mes prochains cours : la ligne des examens */
function verifsLignesDesCartes(){
  const cartes = [...document.querySelectorAll('#listePrepares .history-item[data-modele]')]
    .filter(c => JEU_MODELES_CARTE.indexOf(c.dataset.modele) !== -1 && c.dataset.eleve && !c.querySelector('.vqPrep'));
  if(!cartes.length || jeuEnCours || !verifsConnecte()) return;
  const noms = [...new Set(cartes.map(c => c.dataset.eleve))];
  jeuEnCours = resumesDuJeu(noms).then(res => {
    jeuEnCours = null;
    cartes.forEach(c => {
      if(c.querySelector('.vqPrep')) return;
      const r = res[c.dataset.eleve];
      const l = document.createElement('div');
      l.className = 'vqPrep';
      if(!r){ l.dataset.vide = '1'; c.appendChild(l); return; }
      l.textContent = '🧰 Vérifs : ' + r.maitrisees + '/100 maîtrisées' + (r.revoir.length ? ' · à revoir : ' + jeuPhraseRevoir(r.revoir) : '');
      const m = c.querySelector('.meta') || c;
      m.appendChild(l);
    });
  }).catch(() => { jeuEnCours = null; cartes.forEach(c => { if(!c.querySelector('.vqPrep')){ const l = document.createElement('div'); l.className = 'vqPrep'; l.dataset.vide = '1'; c.appendChild(l); } }); });
}
setInterval(() => { if(!document.hidden) verifsLignesDesCartes(); }, 1500);

/* Le dossier : 🔑 Coin révisions, sous son parcours */
async function posterVerifsDuDossier(corps, nom){
  const cadre = document.createElement('div');
  cadre.className = 'vqDossier';
  cadre.style.cssText = 'margin-top:16px;padding-top:14px;border-top:1px solid var(--line);';
  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:8px;';
  t.textContent = '🧰 Son jeu des vérifications';
  cadre.appendChild(t);
  const zone = document.createElement('div');
  zone.innerHTML = '<div class="empty">Lecture…</div>';
  cadre.appendChild(zone);
  corps.appendChild(cadre);
  let r = null;
  try{
    delete JEU_CACHE[jeuCle(nom)];
    r = (await resumesDuJeu([nom]))[nom];
  }catch(e){
    zone.innerHTML = '';
    zone.appendChild(vqEl('div', 'empty', '⚠️ Illisible : ' + ((e && e.message) || e)));
    return;
  }
  zone.innerHTML = '';
  if(!r){
    zone.appendChild(vqEl('div', 'empty', 'Il n’a pas encore joué. Le jeu s’ouvre avec la case « 🧰 Le jeu des vérifications », plus haut.'));
    return;
  }
  const lignes = vqEl('div', 'vqJeuLignes');
  const ligne = (a, b) => { const d = vqEl('div', 'vqJeuL'); d.appendChild(vqEl('b', '', a)); const s = vqEl('span', ''); if(typeof b === 'string') s.textContent = b; else s.appendChild(b); d.appendChild(s); lignes.appendChild(d); };
  ligne('Maîtrisées', r.maitrisees + ' / 100');
  ligne('Série', '🔥 ' + (r.serie || 0) + ' jour' + (r.serie > 1 ? 's' : '') + (r.jour ? ' · dernier jour joué : ' + r.jour.split('-').reverse().join('/') : ''));
  const rv = vqEl('span', '');
  if(r.revoir.length) r.revoir.forEach(n => rv.appendChild(vqEl('span', 'vqJeuPuce', String(n)))); else rv.textContent = 'rien 👏';
  ligne('À revoir', rv);
  ligne('Jour J', (r.jourJ && r.jourJ.parties ? r.jourJ.parties + ' partie(s) · ' + r.jourJ.parfaits + ' fois 3/3' : 'pas encore joué'));
  /* 🚨 v1250 */
  if(r.voyants && r.voyants.parties) ligne('Le bon voyant', r.voyants.parties + ' partie(s) · record ' + r.voyants.record + ' points');
  zone.appendChild(lignes);
  const g = vqEl('div', 'vqJeuGrille');
  String(r.grille || '').split('').forEach((c, i) => { const x = vqEl('i', c === '.' ? '' : c, String(i + 1)); g.appendChild(x); });
  zone.appendChild(g);
  zone.appendChild(vqEl('div', 'vbAide', 'Vert : maîtrisée (3 réussites, 3 jours) · jaune : en cours · rose : à revoir (ratée dans le jeu, ou à un examen blanc / examen dont le bilan est parti par mail).'));
}

/* ============================================================
   🧰 v1251 — LES QUESTIONS POSÉES PENDANT LE COURS

   David, le 23/10 : « sur le même principe que le bouton pour ajouter
   des procédures, il faut un bouton pour poser des questions de
   vérification : le moniteur appuie, met le numéro de la question, il
   voit les questions, l'élève répond, le moniteur met une note sur 3
   et tout ça va dans son bilan ; plusieurs questions ; sur les bilans
   vocaux et manuels ; seulement les conduites et conduites
   accompagnées — pas les simulateurs, ni les évaluations, ni les
   examens, qui ont déjà leur case ».

   Ses choix sur le schéma :
     · ✅ ❌ par partie (vérification, QSER, secours) : la note sur 3
       se calcule, « — » = pas demandée ;
     · la case « Question n° / Note sur 3 » de l'en-tête est
       REMPLACÉE par un rappel qui renvoie au tiroir ;
     · pas sur le rendez-vous préalable ;
     · au vocal, « question 12 » dite à voix haute la pose toute seule.

   GARDÉES DANS LE TÉLÉPHONE, PAR ÉLÈVE ET PAR JOUR, comme les
   procédures cochées (même clé, cleProcsDuCours, trente-six heures) :
   un plantage, un passage au bilan manuel ne les perdent pas.
   « ot » garde les numéros retirés d'un ✕ : la voix ne les remet pas.

   ⚠️ LE BILAN : chaque partie se termine par ✅ ou ❌ (ou « (pas
   demandée) »). Le Worker la lit (verifsRateesDuBilan) : une partie
   ❌ part dans « À revoir » du jeu de l'élève.
   ============================================================ */
const QV_MODELES = ['conduite-auto', 'conduite-manuelle', 'aac-manuelle', 'aac-auto'];
const QV_CLE = 'ec_verifs_cours';
const QV_DUREE = 36 * 3600 * 1000;
const QV_ZONES = ['verifsCours', 'verifsManuel'];
const QV_NOMS = { qser: 'QSER', secours: 'Premiers secours' };

function qvModeleOk(cle){
  const m = cle != null ? cle : ((typeof $ === 'function' && $('modele')) ? $('modele').value : '');
  return QV_MODELES.indexOf(m) !== -1;
}
function qvCle(){ return (typeof cleProcsDuCours === 'function') ? cleProcsDuCours() : ''; }
function qvLireTout(){
  try{
    const t = JSON.parse(localStorage.getItem(QV_CLE) || '{}');
    return (t && typeof t === 'object' && !Array.isArray(t)) ? t : {};
  }catch(e){ return {}; }
}
function qvMarque(v){ return v === '✅' || v === '❌' ? v : ''; }
function qvEtat(){
  const vide = { qs: [], ot: [] };
  const k = qvCle();
  if(!k) return vide;
  const x = qvLireTout()[k];
  if(!x || Date.now() - Number(x.t || 0) > QV_DUREE) return vide;
  const vus = {};
  const qs = (Array.isArray(x.qs) ? x.qs : []).map(q => {
    const n = verifsNumero(q && q.n);
    if(!n || vus[n]) return null;
    vus[n] = true;
    const p = (q && q.p) || {};
    /* 💬 v1272 — la réponse de l'élève et le commentaire du moniteur, par partie */
    const txt3 = o => { o = o || {}; return { verif: String(o.verif || ''), qser: String(o.qser || ''), secours: String(o.secours || '') }; };
    return { n: n, p: { verif: qvMarque(p.verif), qser: qvMarque(p.qser), secours: qvMarque(p.secours) }, r: txt3(q.r), c: txt3(q.c) };
  }).filter(Boolean);
  const ot = (Array.isArray(x.ot) ? x.ot : []).map(verifsNumero).filter(Boolean);
  return { qs: qs, ot: ot };
}
function qvPoserEtat(e){
  const k = qvCle();
  if(!k) return;
  const t = qvLireTout();
  const maintenant = Date.now();
  Object.keys(t).forEach(c => { if(!t[c] || maintenant - Number(t[c].t || 0) > QV_DUREE) delete t[c]; });
  if(e.qs.length || e.ot.length) t[k] = { qs: e.qs, ot: e.ot, t: maintenant };
  else delete t[k];
  try{ localStorage.setItem(QV_CLE, JSON.stringify(t)); }catch(err){}
}
function qvNoteDe(q){ return VERIFS_PARTIES.filter(k => q.p[k] === '✅').length; }
function qvNotee(q){ return VERIFS_PARTIES.some(k => q.p[k]); }
function qvTotal(qs){
  const notees = qs.filter(qvNotee);
  return { notees: notees.length, points: notees.reduce((a, q) => a + qvNoteDe(q), 0) };
}
function qvResume(qs){
  if(!qs.length) return '';
  const t = qvTotal(qs);
  return qs.length + ' posée' + (qs.length > 1 ? 's' : '') + (t.notees ? ' · ' + t.points + '/' + (t.notees * 3) : '');
}

/* ---------- Poser, retirer, noter ---------- */
function qvPoser(n, parLaVoix){
  n = verifsNumero(n);
  if(!n) return 'numero';
  const e = qvEtat();
  if(e.qs.some(q => q.n === n)) return 'deja';
  if(parLaVoix && e.ot.indexOf(n) !== -1) return 'retiree';
  e.qs.push({ n: n, p: { verif: '', qser: '', secours: '' }, r: { verif: '', qser: '', secours: '' }, c: { verif: '', qser: '', secours: '' } });
  e.ot = e.ot.filter(x => x !== n);
  qvPoserEtat(e);
  return 'ok';
}
function qvRetirer(n){
  const e = qvEtat();
  e.qs = e.qs.filter(q => q.n !== n);
  if(e.ot.indexOf(n) === -1) e.ot.push(n);
  qvPoserEtat(e);
}
function qvNoter(n, k, v){
  const e = qvEtat();
  const q = e.qs.find(x => x.n === n);
  if(!q || VERIFS_PARTIES.indexOf(k) === -1) return;
  q.p[k] = qvMarque(v);
  qvPoserEtat(e);
}

/* 💬 v1272 — « r » : ce que l'élève a répondu ; « c » : le commentaire du moniteur */
function qvEcrire(n, k, quoi, t){
  const e = qvEtat();
  const q = e.qs.find(x => x.n === n);
  if(!q || VERIFS_PARTIES.indexOf(k) === -1 || (quoi !== 'r' && quoi !== 'c')) return;
  q[quoi][k] = String(t || '').slice(0, 400);
  qvPoserEtat(e);
}

/* ---------- La voix : « question 12 », « question numéro 12 » ---------- */
function qvNumerosDits(texte){
  const out = [];
  const re = /\bquestions?\s+(?:(?:de\s+)?v[ée]rifications?\s+)?(?:n\s*[°º]\s*|num[ée]ro\s+|no\.?\s+)?(\d{1,3})(?![\d,.]?\d)/gi;
  let m;
  while((m = re.exec(String(texte || ''))) !== null){
    const n = verifsNumero(m[1]);
    if(n && String(n) === m[1].replace(/^0+/, '') && out.indexOf(n) === -1) out.push(n);
  }
  return out;
}

/* ---------- Le tiroir ---------- */
function qvBoutons3(n, k, val, apres){
  const r = vqEl('div', 'qvTrois');
  r.style.cssText = 'display:flex;gap:5px;flex-shrink:0;';
  r.setAttribute('data-partie', k);
  const peindre = v => {
    Array.prototype.forEach.call(r.children, b => {
      const choisi = b.getAttribute('data-val') === v;
      b.classList.toggle('qvChoisi', choisi);
      b.setAttribute('aria-pressed', choisi ? 'true' : 'false');
      const c = { '✅': ['var(--orange)', '#0B0B0B'], '❌': ['var(--red)', '#FFFFFF'], '': ['var(--muted)', '#0B0B0B'] }[b.getAttribute('data-val')];
      b.style.background = choisi ? c[0] : 'var(--navy)';
      b.style.borderColor = choisi ? c[0] : 'var(--line)';
      b.style.color = choisi ? c[1] : 'var(--cream)';
      b.style.fontWeight = choisi ? '700' : '400';
      b.style.transform = choisi ? 'scale(1.04)' : 'none';
      b.style.boxShadow = choisi ? '0 2px 10px rgba(0,0,0,.35)' : 'none';
    });
  };
  [['✅', '✅'], ['❌', '❌'], ['—', '']].forEach(([lab, v]) => {
    const b = vqEl('button', 'btn btn-secondary', lab);
    b.type = 'button';
    b.setAttribute('data-val', v);
    b.setAttribute('data-hors-saisie', '1');
    b.style.cssText = 'width:auto;padding:7px 11px;font-size:15px;margin:0;transition:transform .1s, background .1s;';
    b.addEventListener('click', ev => {
      ev.preventDefault();
      qvNoter(n, k, v);
      peindre(v);
      if(apres) apres();
    });
    r.appendChild(b);
  });
  peindre(val || '');
  return r;
}
function qvBloc(q, majTitre){
  const x = verifsQuestion(q.n);
  const w = vqEl('div', 'qvBloc');
  w.setAttribute('data-qv', String(q.n));
  w.style.cssText = 'border-top:1px solid var(--line);margin-top:12px;padding-top:4px;';
  const c = vqCarte(q.n);
  const tete = c.querySelector('.vqTete') || c;
  const x2 = vqEl('button', 'vqBouton qvRetirer', '✕');
  x2.type = 'button';
  x2.title = 'Retirer cette question';
  x2.setAttribute('data-hors-saisie', '1');
  x2.style.marginLeft = tete === c ? 'auto' : '0';
  x2.addEventListener('click', ev => {
    ev.preventDefault(); ev.stopPropagation();
    qvRetirer(q.n);
    qvRedessiner();
  });
  tete.appendChild(x2);
  w.appendChild(c);
  if(!x) return w;
  const notes = vqEl('div', 'qvNotes');
  notes.style.cssText = 'margin-top:10px;';
  const tot = vqEl('div', 'qvNote');
  tot.style.cssText = 'text-align:right;font-size:14px;font-weight:800;color:var(--accent-text);';
  const majNote = () => {
    const e = qvEtat().qs.find(y => y.n === q.n) || q;
    tot.textContent = qvNotee(e) ? 'Note : ' + qvNoteDe(e) + ' / 3' : 'Pas encore notée';
    if(majTitre) majTitre();
  };
  /* ✅ ❌ — v1272 : AU BOUT DE CHAQUE LIGNE de la carte, plus en
     dessous (David, le 27 octobre). Et sous chaque ligne notée, les
     deux lignes de l'examen blanc : « Réponse de l'élève » (en bleu,
     comme la remarque de l'inspecteur) et « Commentaire du moniteur ». */
  const lignesCarte = c.querySelectorAll('.vqL');
  VERIFS_PARTIES.forEach((k, i) => {
    const vl = lignesCarte[i];
    const deux = qvDeuxLignes(q, k);
    const trois = qvBoutons3(q.n, k, q.p[k], () => {
      const e = qvEtat().qs.find(y => y.n === q.n) || q;
      deux.style.display = e.p[k] ? '' : 'none';
      majNote();
    });
    trois.classList.add('qvAuBout');
    if(vl){
      const gauche = vqEl('div', 'qvTexteL');
      while(vl.firstChild) gauche.appendChild(vl.firstChild);
      vl.classList.add('qvAvecNote');
      vl.appendChild(gauche);
      vl.appendChild(trois);
      vl.parentNode.insertBefore(deux, vl.nextSibling);
    }else{
      /* une partie sans ligne dans la carte (neutralisée…) : comme avant */
      const l = vqEl('div', 'qvLigne');
      l.style.cssText = 'margin-bottom:8px;display:flex;gap:10px;align-items:center;';
      const lab = vqEl('label', '', QV_NOMS[k] || verifsNomPartie(k, x.type));
      lab.style.cssText = 'flex:1;min-width:0;margin:0;font-size:14px;text-transform:none;color:var(--cream);';
      l.appendChild(lab);
      l.appendChild(trois);
      notes.appendChild(l);
      notes.appendChild(deux);
    }
    deux.style.display = q.p[k] ? '' : 'none';
  });
  notes.appendChild(tot);
  w.appendChild(notes);
  /* 📜 déjà posée avant ? */
  const avant = qvDejaPosee(q.n);
  if(avant){
    const t = c.querySelector('.vqTete');
    const ch = vqEl('div', 'qvDejaPosee', '📜 Déjà posée le ' + qvJourCourt(avant.jour) + (avant.par ? ' par ' + avant.par : '') + ' : ' + avant.note + '/3');
    if(t && t.parentNode) t.parentNode.insertBefore(ch, t.nextSibling);
  }
  majNote();
  return w;
}
function qvDeuxLignes(q, k){
  const z = vqEl('div', 'qvDeux');
  z.setAttribute('data-partie', k);
  const champ = (quoi, ph) => {
    const r = vqEl('div', 'qvDeuxL');
    const i = document.createElement('input');
    i.type = 'text';
    i.className = quoi === 'r' ? 'qvRep' : 'qvCom';
    i.placeholder = ph;
    i.value = (q[quoi] && q[quoi][k]) || '';
    i.setAttribute('data-hors-saisie', '1');
    i.dataset.horsSaisie = '1';
    i.addEventListener('input', () => qvEcrire(q.n, k, quoi, i.value));
    r.appendChild(i);
    if(typeof microDObservation === 'function'){
      const m = microDObservation(i, quoi === 'r' ? 'la réponse de l’élève' : 'ton commentaire');
      /* la dictée écrit dans le champ : on garde ce qu'elle a écrit */
      i.addEventListener('change', () => qvEcrire(q.n, k, quoi, i.value));
      if(m && m.tagName === 'BUTTON') m.addEventListener('click', () => {
        const t0 = setInterval(() => { qvEcrire(q.n, k, quoi, i.value); if(m.dataset.actif !== 'oui') clearInterval(t0); }, 800);
      });
      r.appendChild(m);
    }
    return r;
  };
  z.appendChild(champ('r', 'Réponse de l’élève'));
  z.appendChild(champ('c', 'Commentaire du moniteur'));
  return z;
}

/* ---------- 📜 v1272 — DÉJÀ POSÉES (gardées comme les manœuvres) ----------
   David, le 27 octobre : « quand on rouvre cette partie la leçon
   d'après, on voit les questions posées, avec les réponses que l'élève
   a données, les points et la date ». Lu au Worker (ec-suivi-eleve.js),
   écrit à chaque bilan composé (lignesVerifsDuCours). */
function qvJourDuCours(){
  const k = qvCle();
  const j = k.split('|')[1] || '';
  return /^\d{4}-\d{2}-\d{2}$/.test(j) ? j : ((typeof todayLocal === 'function') ? todayLocal() : '');
}
function qvJourCourt(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return String(iso || '');
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}
function qvHistorique(){
  const d = (typeof suiviSE === 'function') ? suiviSE() : null;
  if(!d) return [];
  const j = qvJourDuCours();
  return (d.verifs || []).filter(v => v.jour !== j);
}
function qvDejaPosee(n){ return qvHistorique().find(v => v.n === n) || null; }
function qvBlocHistorique(){
  const h = qvHistorique();
  if(!h.length) return null;
  const jours = {};
  h.forEach(v => { jours[v.jour] = 1; });
  const nomE = ($('studentName') && $('studentName').value || '').trim().split(/\s+/)[0] || 'l’élève';
  const d = document.createElement('details');
  d.className = 'qvHisto';
  d.open = true;
  const s = vqEl('summary', '', '📜 Déjà posées à ' + nomE + ' — ' + h.length + ' question' + (h.length > 1 ? 's' : '') + ', ' +
    Object.keys(jours).length + ' cours');
  d.appendChild(s);
  h.forEach(v => {
    const e = vqEl('div', 'qvHistoL');
    e.setAttribute('data-qv-histo', String(v.n));
    const t = vqEl('div', 'qvHistoT');
    const g = vqEl('span', 'qvHistoQui');
    g.innerHTML = '<b>' + echapperVerifs(qvJourCourt(v.jour)) + '</b> · ' + echapperVerifs(v.par || '') +
      ' — <b>Question ' + v.n + '</b> · <b class="' + (v.note === 3 ? 'ok' : 'ko') + '">' + v.note + '/3</b>';
    t.appendChild(g);
    const re = vqEl('button', 'btn btn-secondary qvReposer', '🔁 Reposer');
    re.type = 'button';
    re.setAttribute('data-hors-saisie', '1');
    re.addEventListener('click', ev => {
      ev.preventDefault(); ev.stopPropagation();
      const r = qvPoser(v.n);
      if(r === 'deja') showToastVerifs('🧰 La question ' + v.n + ' est déjà posée');
      qvRedessiner(true);
    });
    t.appendChild(re);
    e.appendChild(t);
    const det = vqEl('div', 'qvHistoDet');
    det.style.display = 'none';
    VERIFS_PARTIES.forEach(k => {
      const p = (v.parties || {})[k];
      if(!p) return;
      const x = verifsQuestion(v.n);
      const nomP = k === 'verif' ? ((x && x.type) || 'Vérif') : (k === 'qser' ? 'QSER' : '1ers secours');
      const l = vqEl('div', 'qvHistoP');
      l.innerHTML = '<b>' + echapperVerifs(nomP) + '</b> ' + (p.v || '—') +
        (p.r ? '<div class="qvHistoR">↳ Réponse : ' + echapperVerifs(p.r) + '</div>' : '') +
        (p.c ? '<div class="qvHistoC">↳ ' + echapperVerifs(v.par || 'Moniteur') + ' : ' + echapperVerifs(p.c) + '</div>' : '');
      det.appendChild(l);
    });
    const voir = vqEl('div', 'qvHistoVoir', '▸ toucher pour voir ses réponses');
    e.appendChild(voir);
    e.appendChild(det);
    e.addEventListener('click', () => {
      const o = det.style.display === 'none';
      det.style.display = o ? '' : 'none';
      voir.textContent = o ? '▾ ses réponses' : '▸ toucher pour voir ses réponses';
    });
    d.appendChild(e);
  });
  return d;
}
function echapperVerifs(t){
  return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function dessinerQuestionsVerifs(idZone){
  /* ⚠️ v1273 — le tiroir « Suivi de … », juste au-dessus (ec-suivi-eleve.js) */
  if(typeof dessinerSuiviDuCoursSE === 'function' && typeof ZONES_SUIVI_SE !== 'undefined' && ZONES_SUIVI_SE[idZone]){
    try{ dessinerSuiviDuCoursSE(ZONES_SUIVI_SE[idZone]); }catch(e){}
  }
  const z = typeof idZone === 'string' ? document.getElementById(idZone) : idZone;
  if(!z) return;
  const sig = qvModeleOk() + '|' + qvCle();
  z.setAttribute('data-qv-sig', sig);
  const avant = z.querySelector('details.tiroirVerifs');
  const ouvert = !!(avant && avant.open);
  const tape = avant && avant.querySelector('input.qvNumero') ? avant.querySelector('input.qvNumero').value : '';
  z.innerHTML = '';
  if(!qvModeleOk() || !qvCle()){ z.style.display = 'none'; qvMajRappels(); return; }
  z.style.display = '';

  const d = document.createElement('details');
  d.className = 'tiroirVerifs';
  d.style.cssText = 'border:1px solid var(--line);border-radius:12px;padding:10px 12px;';
  d.open = ouvert;
  const s = document.createElement('summary');
  s.style.cssText = 'cursor:pointer;font-size:14px;font-weight:700;color:var(--accent-text);';
  d.appendChild(s);
  const majTitre = () => {
    const r = qvResume(qvEtat().qs);
    const nh = qvHistorique().length;
    s.textContent = '🧰 Questions de vérification' + (r ? ' — ' + r : '') + (nh ? (r ? ' · ' : ' — ') + nh + ' déjà avant' : '');
    qvMajRappels();
  };

  const aide = vqEl('div', 'qvAide', 'Tape le numéro de la question, l’élève répond, tu coches chaque partie : la note sur 3 se fait toute seule. ' +
    'Tu peux en poser plusieurs : tout part dans son bilan.' + (idZone === 'verifsCours' ? ' « Question 12 » dit à voix haute la pose aussi.' : ''));
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin:8px 0 8px;line-height:1.5;';
  d.appendChild(aide);

  const rang = vqEl('div', 'qvRang');
  rang.style.cssText = 'display:flex;gap:8px;align-items:center;';
  const i = document.createElement('input');
  i.type = 'text';
  i.inputMode = 'numeric';
  i.className = 'qvNumero';
  i.placeholder = 'N° (1 à 100)';
  i.value = tape;
  i.setAttribute('data-hors-saisie', '1');
  i.dataset.horsSaisie = '1';
  i.style.cssText = 'flex:1;min-width:0;margin:0;';
  rang.appendChild(i);
  const poser = () => {
    const r = qvPoser(i.value);
    if(r === 'numero'){ showToastVerifs('Tape un numéro de 1 à 100'); i.focus(); return; }
    if(r === 'deja') showToastVerifs('🧰 La question ' + verifsNumero(i.value) + ' est déjà posée');
    i.value = '';
    qvRedessiner(true);
  };
  const b = vqEl('button', 'btn btn-primary qvPoser', '➕ Poser');
  b.type = 'button';
  b.setAttribute('data-hors-saisie', '1');
  b.style.cssText = 'width:auto;margin:0;padding:10px 14px;font-size:14px;white-space:nowrap;';
  b.addEventListener('click', ev => { ev.preventDefault(); poser(); });
  i.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); poser(); } });
  rang.appendChild(b);
  const h = vqEl('button', 'btn btn-secondary qvHasard', '🎲');
  h.type = 'button';
  h.title = 'Une question au hasard';
  h.setAttribute('data-hors-saisie', '1');
  h.style.cssText = 'width:auto;margin:0;padding:10px 12px;font-size:14px;';
  h.addEventListener('click', ev => {
    ev.preventDefault();
    const deja = qvEtat().qs.map(q => q.n);
    const libres = [];
    for(let n = 1; n <= 100; n++) if(deja.indexOf(n) === -1) libres.push(n);
    if(!libres.length) return;
    qvPoser(libres[Math.floor(Math.random() * libres.length)]);
    qvRedessiner(true);
  });
  rang.appendChild(h);
  d.appendChild(rang);

  /* 📜 v1272 — déjà posées les cours d'avant (lu une fois par élève) */
  const nomQ = ($('studentName') && $('studentName').value || '').trim();
  if(typeof chargerSuiviSE === 'function' && nomQ && typeof suiviSE === 'function' && !suiviSE(nomQ)) chargerSuiviSE(nomQ);
  const histo = qvBlocHistorique();
  if(histo) d.appendChild(histo);

  /* La dernière posée en haut : c'est elle qu'on lit à l'élève */
  qvEtat().qs.slice().reverse().forEach(q => d.appendChild(qvBloc(q, majTitre)));
  z.appendChild(d);
  majTitre();
}
/* Redessine les tiroirs présents ; « ouvrir » ouvre ceux qui sont visibles */
function qvRedessiner(ouvrir){
  /* 🧰 v1300 — et les questions posées dans une fiche d'examen */
  document.querySelectorAll('.qvExamen').forEach(b => { if(typeof b._qvDessiner === 'function') b._qvDessiner(); });
  QV_ZONES.forEach(id => {
    const z = document.getElementById(id);
    if(!z) return;
    if(ouvrir && z.offsetParent){
      const d = z.querySelector('details.tiroirVerifs');
      if(d) d.open = true;
    }
    dessinerQuestionsVerifs(id);
  });
  qvMajRappels();
}

/* ============================================================
   🧰 v1300 — LES QUESTIONS DE VÉRIFICATION DANS LES EXAMENS

   David, le 28 octobre : « sur les vérifications, faire comme sur les
   cours classiques : les questions avec validé ou non et les cases en
   dessous ; idem sur l'examen blanc et le rendez-vous pédagogique
   pratique ». Son choix : à la place des cases de la partie
   « 🧰 Vérification », au même endroit de la fiche.

   ⚠️ LES ANCIENNES CASES RESTENT, CACHÉES, ET C'EST CE TIROIR QUI LES
   REMPLIT : le n° de la question, les ✅/❌ (examen officiel) ou la note
   sur 3 (examen blanc), et les textes. Le bilan, la note du CEPC, les
   brouillons et l'impression les lisent comme avant — un seul chemin
   pour le bilan, pas deux. Les cases à phrase (« tu n'as pas bossé tes
   vérifications ») passent dans le tiroir, telles quelles.
   ============================================================ */
const QV_EXAMEN_OFFICIEL = ['examen.verifQuestion', 'examen.vi', 'examen.viTexte', '__sQser', 'examen.qser', 'examen.qserTexte',
                            '__sSecours', 'examen.secours', 'examen.secoursTexte'];
const QV_EXAMEN_BLANC = ['examen.verifNote', 'examen.verifQuestion', 'examen.verifRemarque'];
const QV_CLE_OK = { verif: 'examen.vi', qser: 'examen.qser', secours: 'examen.secours' };
const QV_CLE_TEXTE = { verif: 'examen.viTexte', qser: 'examen.qserTexte', secours: 'examen.secoursTexte' };
const QV_NOM_PARTIE = { verif: 'Vérification', qser: 'QSER', secours: 'Premiers secours' };
function qvStyleExamen(){
  if(document.getElementById('qvStyleExamen')) return;
  const st = document.createElement('style');
  st.id = 'qvStyleExamen';
  st.textContent = '.qvRemplace{display:none !important;}' +
    '.qvExamen .qvCasesPhrase{margin-top:10px;padding-top:8px;border-top:1px dashed var(--line);}' +
    '.qvExamen .qvCasesPhrase label{margin:0 0 6px !important;}';
  document.head.appendChild(st);
}
function qvExamenOfficiel(){ return ((typeof $ === 'function' && $('modele')) ? $('modele').value : '') === 'examen-officiel'; }
/* Le questionnaire (#manuelChamps) ou le module examen blanc du RVP au
   vocal (#examenBlancCours) : chaque tiroir travaille dans le sien */
let qvRacineCourante = null;
function qvRacine(b){ return (b && b.closest && b.closest('#manuelChamps, #examenBlancCours')) || document; }
function qvDans(){ return qvRacineCourante || document.getElementById('manuelChamps') || document; }
function qvChampDe(cle){
  const id = typeof idChamp === 'function' ? idChamp(cle) : '';
  if(!id) return null;
  const r = qvDans();
  return (r.querySelector ? r.querySelector('#' + id) : null) || document.getElementById(id);
}
function qvZoneDe(cle){ return qvDans().querySelector('[data-zone="' + String(cle).replace(/"/g, '') + '"]'); }
function qvPoserTexte(cle, v){
  const el = qvChampDe(cle);
  if(!el || el.value === v) return;
  el.value = v;
  if(typeof champsManuels !== 'undefined') champsManuels[cle] = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
function qvPoserOk(cle, v){
  if(typeof champsManuels !== 'undefined' && (champsManuels[cle] || '') === v) return;
  const b = qvDans().querySelector('[data-champ="' + cle + '"] [data-val="' + v + '"]');
  if(b) b.click();
}
function qvPoserNote3(cle, v){
  const el = qvChampDe(cle);
  if(!el || el.value === v) return;
  el.value = v;
  if(typeof champsManuels !== 'undefined') champsManuels[cle] = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  if(typeof reporterNotesCepc === 'function') try{ reporterNotesCepc(); }catch(e){}
}
/* Le tiroir → les cases cachées (et, au bilan, l'historique de l'élève) */
function qvRemplirExamen(b, historique){
  if(!b || !b._qv || !b.isConnected || !b.closest('#manuelChamps, #examenBlancCours')) return;
  qvRacineCourante = qvRacine(b);
  try{ qvRemplirExamenDans(b, historique); }finally{ qvRacineCourante = null; }
}
/* ⚠️ LE TIROIR N'EFFACE QUE CE QU'IL A ÉCRIT. Une fiche reprise, une case
   remplie avant lui (n° tapé, ✅, texte, case à phrase) : on garde tout,
   on retire seulement ses propres lignes d'avant, puis on met les neuves. */
const QV_ECRIT = {};
function qvEcritCle(cle){ return qvCle() + '|' + cle; }
function qvFusionTexte(cle, lignes){
  const el = qvChampDe(cle);
  if(!el) return;
  const k = qvEcritCle(cle);
  const avant = QV_ECRIT[k] || [];
  if(!avant.length && !lignes.length) return;
  const enlever = {};
  avant.concat(lignes).forEach(l => { enlever[String(l).trim()] = 1; });
  const garde = String(el.value || '').split('\n').filter(l => !enlever[l.trim()]);
  while(garde.length && !garde[garde.length - 1].trim()) garde.pop();
  QV_ECRIT[k] = lignes.slice();
  qvPoserTexte(cle, garde.concat(lignes).join('\n').replace(/^\s*\n/, ''));
}
function qvFusionValeur(cle, v, poser){
  const k = qvEcritCle(cle);
  if(!v && !QV_ECRIT[k]) return;
  QV_ECRIT[k] = v;
  poser(cle, v);
}
function qvRemplirExamenDans(b, historique){
  const pre = b._qv.pre;
  const qs = qvEtat().qs.filter(q => verifsQuestion(q.n));
  /* le n° : laissé tel qu'il est écrit s'il dit déjà les mêmes questions (« Q12 ») */
  qvFusionValeur(pre + 'examen.verifQuestion', qs.map(q => q.n).join(', '), (cle, v) => {
    const el = qvChampDe(cle);
    const deja = String((el && el.value) || '').split(/[^\d]+/).map(verifsNumero).filter(Boolean).join(', ');
    if(deja !== v) qvPoserTexte(cle, v);
  });
  const plusieurs = qs.length > 1;
  const lignesDe = (k, q) => {
    const r = String((q.r && q.r[k]) || '').trim(), c = String((q.c && q.c[k]) || '').trim();
    return [r ? 'Ta réponse : ' + r : '', c].filter(Boolean).map(t => (plusieurs ? 'Question ' + q.n + ' · ' : '') + t);
  };
  if(b._qv.officiel){
    VERIFS_PARTIES.forEach(k => {
      const m = qs.map(q => q.p[k]).filter(Boolean);
      qvFusionValeur(pre + QV_CLE_OK[k], m.indexOf('❌') !== -1 ? '❌' : (m.length ? '✅' : ''), qvPoserOk);
      const l = [];
      qs.forEach(q => l.push.apply(l, lignesDe(k, q)));
      qvFusionTexte(pre + QV_CLE_TEXTE[k], l);
    });
  }else{
    const notees = qs.filter(qvNotee);
    qvFusionValeur(pre + 'examen.verifNote', notees.length ? String(qvNoteDe(notees[notees.length - 1])) : '', qvPoserNote3);
    const l = [];
    qs.forEach(q => VERIFS_PARTIES.forEach(k => {
      const r = String((q.r && q.r[k]) || '').trim(), c = String((q.c && q.c[k]) || '').trim();
      if(!r && !c) return;
      l.push((plusieurs ? 'Question ' + q.n + ' · ' : '') + QV_NOM_PARTIE[k] + (q.p[k] ? ' ' + q.p[k] : '') +
             (r ? ' — ta réponse : ' + r : '') + (c ? ' — ' + c : ''));
    }));
    qvFusionTexte(pre + 'examen.verifRemarque', l);
  }
  if(historique) qvEnregistrerHistorique(qs);
}
/* Au bilan : tous les tiroirs d'examen remplissent leurs cases */
function syncVerifsExamens(historique){
  document.querySelectorAll('#manuelChamps .qvExamen, #examenBlancCours .qvExamen').forEach(b => { try{ qvRemplirExamen(b, historique); }catch(e){ console.warn('Vérifications :', e); } });
}
function dessinerVerifsExamen(bloc, ch){
  qvStyleExamen();
  const pre = String(ch.cle || '').replace(/questionsVerifs$/, '');
  bloc.classList.add('qvExamen');
  bloc._qv = { pre: pre, officiel: qvExamenOfficiel() };
  const cases = vqEl('div', 'qvCasesPhrase');
  bloc._qvCases = [];
  let attente = null;
  const remplir = () => { clearTimeout(attente); attente = setTimeout(() => qvRemplirExamen(bloc), 250); };
  const dessiner = () => {
    const tape = (bloc.querySelector('input.qvNumero') || {}).value || '';
    bloc.innerHTML = '';
    const l = vqEl('label', '', ch.nom || '🧰 Questions de vérification');
    bloc.appendChild(l);
    const aide = vqEl('div', 'qvAide', 'Tape le numéro de la question, l’élève répond, tu coches chaque partie ✅ ❌ : la note se fait toute seule' +
      (bloc._qv.officiel ? ' (vérification, QSER, premiers secours).' : ' sur 3.') + ' Sous chaque partie : sa réponse et ton commentaire.');
    aide.style.cssText = 'font-size:11px;color:var(--muted);margin:0 0 8px;line-height:1.5;';
    bloc.appendChild(aide);
    const rang = vqEl('div', 'qvRang');
    rang.style.cssText = 'display:flex;gap:8px;align-items:center;';
    const i = document.createElement('input');
    i.type = 'text'; i.inputMode = 'numeric'; i.className = 'qvNumero'; i.placeholder = 'N° (1 à 100)'; i.value = tape;
    i.setAttribute('data-hors-saisie', '1'); i.dataset.horsSaisie = '1';
    i.style.cssText = 'flex:1;min-width:0;margin:0;';
    rang.appendChild(i);
    const poser = n => {
      const r = qvPoser(n);
      if(r === 'numero'){ showToastVerifs('Tape un numéro de 1 à 100'); i.focus(); return; }
      if(r === 'deja') showToastVerifs('🧰 La question ' + verifsNumero(n) + ' est déjà posée');
      i.value = '';
      dessiner(); remplir();
    };
    const bP = vqEl('button', 'btn btn-primary qvPoser', '➕ Poser');
    bP.type = 'button'; bP.setAttribute('data-hors-saisie', '1');
    bP.style.cssText = 'width:auto;margin:0;padding:10px 14px;font-size:14px;white-space:nowrap;';
    bP.addEventListener('click', ev => { ev.preventDefault(); poser(i.value); });
    i.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); poser(i.value); } });
    rang.appendChild(bP);
    const h = vqEl('button', 'btn btn-secondary qvHasard', '🎲');
    h.type = 'button'; h.title = 'Une question au hasard'; h.setAttribute('data-hors-saisie', '1');
    h.style.cssText = 'width:auto;margin:0;padding:10px 12px;font-size:14px;';
    h.addEventListener('click', ev => {
      ev.preventDefault();
      const deja = qvEtat().qs.map(q => q.n), libres = [];
      for(let n = 1; n <= 100; n++) if(deja.indexOf(n) === -1) libres.push(n);
      if(libres.length) poser(libres[Math.floor(Math.random() * libres.length)]);
    });
    rang.appendChild(h);
    bloc.appendChild(rang);
    const histo = qvBlocHistorique();
    if(histo){ histo.open = false; bloc.appendChild(histo); }
    qvEtat().qs.slice().reverse().forEach(q => bloc.appendChild(qvBloc(q, remplir)));
    if(bloc._qvCases.length){
      bloc._qvCases.forEach(x => { const cb = x.querySelector('input'); if(cb && x._qvOrig) cb.checked = x._qvOrig.checked; cases.appendChild(x); });
      bloc.appendChild(cases);
    }
  };
  bloc._qvDessiner = () => { dessiner(); remplir(); };
  /* les textes (réponse, commentaire) remplissent aussi, un peu après */
  bloc.addEventListener('input', ev => { if(ev.target && ev.target.closest && ev.target.closest('.qvDeux')) remplir(); });
  /* Les cases remplacées (elles sont dessinées APRÈS ce bloc) : cachées ;
     leurs cases à phrase viennent ici ; une fiche reprise sans le tiroir
     de ce jour retrouve ses questions d'après le n° gardé */
  setTimeout(() => {
    if(!bloc.isConnected) return;
    /* Dans le créateur de fiches, les anciennes zones restent visibles :
       l'administrateur règle toujours leurs cases à phrase */
    if(!bloc.closest('#manuelChamps, #examenBlancCours')) return;
    qvRacineCourante = qvRacine(bloc);
    try{ qvRangerExamen(bloc, pre); }finally{ qvRacineCourante = null; }
    dessiner();
  }, 0);
  dessiner();
}
function qvRangerExamen(bloc, pre){
  {
    (bloc._qv.officiel ? QV_EXAMEN_OFFICIEL : QV_EXAMEN_BLANC).forEach(k => {
      const z = qvZoneDe(pre + k) || qvZoneDe(pre + k + 'Rvp');
      if(z) z.classList.add('qvRemplace');
    });
    const zt = qvZoneDe(pre + (bloc._qv.officiel ? 'examen.viTexte' : 'examen.verifRemarque'));
    /* ⚠️ LES CASES RESTENT À LEUR PLACE (cachées) : une fiche se garde et se
       reprend par le RANG de ses champs — en déplacer une décalerait tout ce
       qui suit. Le tiroir en montre une copie qui coche l'originale. */
    if(zt) zt.querySelectorAll('label').forEach(lab => {
      const orig = lab.querySelector('input[type="checkbox"]');
      if(!orig || lab.hasAttribute('data-voitures')) return;
      const copie = lab.cloneNode(true);
      copie.removeAttribute('id');
      const cb = copie.querySelector('input[type="checkbox"]');
      cb.removeAttribute('id'); cb.removeAttribute('name');
      cb.setAttribute('data-hors-saisie', '1');
      cb.classList.add('qvCopieCase');
      cb.checked = orig.checked;
      cb.addEventListener('change', () => { if(orig.checked !== cb.checked) orig.click(); cb.checked = orig.checked; });
      orig.addEventListener('change', () => { cb.checked = orig.checked; });
      copie._qvOrig = orig;
      bloc._qvCases.push(copie);
    });
    setTimeout(() => (bloc._qvCases || []).forEach(c => { const cb = c.querySelector('input'); if(cb && c._qvOrig) cb.checked = c._qvOrig.checked; }), 1500);
    if(!qvEtat().qs.length){
      const el = qvChampDe(pre + 'examen.verifQuestion');
      const nums = String((el && el.value) || '').split(/[^\d]+/).map(verifsNumero).filter(Boolean);
      nums.forEach(n => qvPoser(n));
      if(nums.length && bloc._qv.officiel && typeof champsManuels !== 'undefined'){
        VERIFS_PARTIES.forEach(k => { const v = champsManuels[pre + QV_CLE_OK[k]]; if(v === '✅' || v === '❌') qvNoter(nums[0], k, v); });
      }
    }
  }
}

/* ---------- Le rappel, à la place de « Question n° / Note sur 3 » ---------- */
function rappelQuestionsVerifs(ou){
  const r = vqEl('div', 'qvRappel');
  r.setAttribute('data-ou', ou || '');
  r.setAttribute('data-hors-saisie', '1');
  r.style.cssText = 'font-size:13px;line-height:1.5;border:1px dashed var(--line);border-radius:10px;padding:8px 10px;cursor:pointer;';
  r.addEventListener('click', () => {
    const z = document.getElementById(ou === 'vocal' ? 'verifsCours' : 'verifsManuel');
    const d = z && z.querySelector('details.tiroirVerifs');
    if(!d) return;
    d.open = true;
    try{ d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }catch(e){ d.scrollIntoView(); }
  });
  qvPeindreRappel(r);
  return r;
}
function qvPeindreRappel(r){
  const blocVerifs = r.closest('.qvBlocEntete');
  const ok = qvModeleOk();
  if(blocVerifs) blocVerifs.style.display = ok ? '' : 'none';
  const qs = qvEtat().qs;
  const t = qvTotal(qs);
  const titre = qs.length
    ? '🧰 ' + qs.length + ' question' + (qs.length > 1 ? 's' : '') + ' posée' + (qs.length > 1 ? 's' : '') + (t.notees ? ' · ' + t.points + '/' + (t.notees * 3) : '')
    : '🧰 Aucune question posée pour l’instant';
  const ou = r.getAttribute('data-ou') === 'vocal'
    ? 'Elles se posent avec le bouton « 🧰 Questions de vérification », sous les procédures.'
    : 'Elles se posent en bas, avec le bouton « 🧰 Questions de vérification », juste avant « Composer le bilan ».';
  const sig = titre + '|' + ou + '|' + ok;
  if(r.getAttribute('data-sig') === sig) return;
  r.setAttribute('data-sig', sig);
  r.innerHTML = '';
  r.appendChild(vqEl('b', '', titre));
  r.appendChild(document.createElement('br'));
  const sp = vqEl('span', '', ou);
  sp.style.color = 'var(--muted)';
  r.appendChild(sp);
}
function qvMajRappels(){ document.querySelectorAll('.qvRappel').forEach(qvPeindreRappel); }

/* ---------- Le bilan ---------- */
/* Les lignes de la section 𝙑𝙚́𝙧𝙞𝙛𝙞𝙘𝙖𝙩𝙞𝙤𝙣𝙨, ou null si aucune question.
   S'y ajoutent les numéros que l'IA a relevés (ai.verifQuestion) et
   ceux dits dans le cours, sauf ceux retirés d'un ✕. */
function lignesVerifsDuCours(ai, texte){
  const e = qvEtat();
  const qs = e.qs.slice();
  const ajouter = n => { if(n && e.ot.indexOf(n) === -1 && !qs.some(q => q.n === n)) qs.push({ n: n, p: { verif: '', qser: '', secours: '' } }); };
  String((ai && ai.verifQuestion) || '').split(/[^\d]+/).forEach(x => ajouter(verifsNumero(x)));
  qvNumerosDits(texte).forEach(ajouter);
  const avecTexte = qs.filter(q => verifsQuestion(q.n));
  if(!avecTexte.length) return null;
  const out = ['𝙑𝙚́𝙧𝙞𝙛𝙞𝙘𝙖𝙩𝙞𝙤𝙣𝙨 https://www.facebook.com/groups/864826058258637 '];
  avecTexte.forEach(q => {
    const notee = qvNotee(q);
    out.push('question n° ' + q.n + (notee ? ' : ' + qvNoteDe(q) + '/3' : ''));
    VERIFS_PARTIES.forEach(k => {
      const l = ligneVerifPourLeBilan(q.n, k, true);
      if(!l) return;
      out.push(l + (notee ? ' ' + (q.p[k] || '(pas demandée)') : ''));
      /* 💬 v1272 — sa réponse, et le commentaire du moniteur */
      const rep = String((q.r && q.r[k]) || '').trim(), com = String((q.c && q.c[k]) || '').trim();
      if(q.p[k] && rep) out.push('↳ Ta réponse : ' + rep);
      if(q.p[k] && com) out.push('↳ ' + ((typeof ACCES !== 'undefined' && ACCES.moniteur) || 'Ton moniteur') + ' : ' + com);
    });
  });
  qvEnregistrerHistorique(avecTexte);
  const t = qvTotal(avecTexte);
  if(avecTexte.length > 1){
    if(t.notees) out.push('𝗧𝗼𝘁𝗮𝗹 : ' + t.points + '/' + (t.notees * 3) + ' sur ' + t.notees + ' question' + (t.notees > 1 ? 's' : ''));
    out.push('/3 points jour du permis (une seule question ce jour-là) ');
  }else{
    out.push('/3 points jour du permis ');
  }
  return out;
}

/* 📜 v1272 — les questions notées du jour partent au Worker, pour les
   cours suivants (le même jour remplace : un bilan recomposé ne double
   rien). En silence : un échec ne gêne pas le bilan. */
function qvEnregistrerHistorique(qs){
  const nom = ($('studentName') && $('studentName').value || '').trim();
  const notees = (qs || []).filter(qvNotee);
  if(!nom || !notees.length || typeof appelPrep !== 'function') return;
  const jour = qvJourDuCours();
  const sig = nom + '|' + jour + '|' + JSON.stringify(notees);
  if(qvEnregistrerHistorique._sig === sig) return;
  qvEnregistrerHistorique._sig = sig;
  try{
    Promise.resolve(appelPrep({ action: 'suiviVerifsPoser', eleve: nom, jour: jour,
      qs: notees.map(q => ({ n: q.n, p: q.p, r: q.r || {}, c: q.c || {} })) })).catch(() => { qvEnregistrerHistorique._sig = ''; });
  }catch(e){ qvEnregistrerHistorique._sig = ''; }
}

/* ---------- La veille : modèle ou élève changé, et la voix ---------- */
setInterval(() => {
  if(document.hidden) return;
  QV_ZONES.forEach(id => {
    const z = document.getElementById(id);
    if(!z || !z.hasAttribute('data-qv-sig')) return;
    if(z.getAttribute('data-qv-sig') !== qvModeleOk() + '|' + qvCle()) dessinerQuestionsVerifs(id);
  });
  qvMajRappels();
  /* « question 12 » dite pendant l'enregistrement */
  if(typeof isRecording === 'undefined' || !isRecording || !qvModeleOk() || !qvCle()) return;
  const texte = (typeof finalTranscript === 'string' ? finalTranscript : '');
  if(!texte) return;
  let neuves = [];
  qvNumerosDits(texte).forEach(n => { if(qvPoser(n, true) === 'ok') neuves.push(n); });
  if(neuves.length){
    qvRedessiner();
    showToastVerifs('🧰 Question' + (neuves.length > 1 ? 's ' : ' ') + neuves.join(', ') + ' posée' + (neuves.length > 1 ? 's' : '') + ' — note-la dans « Questions de vérification »');
  }
}, 1500);

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-verifs.js'] = true;
