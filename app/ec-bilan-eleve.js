/* Déployé le 31/10/2026 à 14:03 — v1321 */
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

   ✍️ v1321 — ET L'ÉLÈVE PEUT AUSSI COMPLÉTER LE BILAN DU MONITEUR.
   David : « sur le même principe, avec ce qu'a écrit le moniteur, et que
   l'élève doive compléter » ; « quand il y a des choses faites avec l'IA,
   il faut qu'il puisse compléter les catégories déjà mises, et mettre
   toutes celles où il n'y a rien ». Ses réponses : cours validé tout de
   suite ; le même réglage ; un bouton sous « Copier, enregistrer et
   terminer » ET le choix dans la fenêtre, renommée « L'élève doit faire ou
   compléter son bilan ». Le bilan à compléter garde le texte du moniteur
   et y glisse des « ✍️ » : sous chaque catégorie écrite, chaque catégorie
   vide (même absente du bilan), les manœuvres, « à retravailler ».

   📚 Et l'espace révisions s'allume (schéma v1315) : la demande se range
   dans la base (bilanCoursCreer) ; l'élève la remplit dans son onglet
   📝 Bilan ; elle arrive dans le fil élève ↔ moniteur, où le moniteur, le
   bureau ou un admin la corrige et la valide — la version corrigée
   remplace le bilan du cours dans son dossier et « Mes leçons ». Relance
   à 2 jours, puis demande à compléter (le Worker, à 18 h).
   ============================================================ */
const BE_MODELES = ['conduite-auto', 'conduite-manuelle', 'aac-auto', 'aac-manuelle'];
const MARQUE_BE = 'tu dois faire toi-même ton bilan de cours';
const MARQUE_BC = 'il te reste à le compléter avec tes mots';
const MARQUE_VALIDE_BE = /✅ Bilan (écrit|complété) par [^\n]*, corrigé et validé par ([^\n]*?) le \d/;
const SEP_SON_BILAN_BE = '📥 SON BILAN — collé par ';
const TITRE_BE = '📝 L’élève doit faire ou compléter son bilan';

function echBE(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function modeleBEOk(cle){ return BE_MODELES.indexOf(String(cle || '')) !== -1; }
function estBilanParLEleve(texte){ return String(texte || '').toLowerCase().indexOf(MARQUE_BE) !== -1; }
function estBilanACompleter(texte){ return String(texte || '').toLowerCase().indexOf(MARQUE_BC) !== -1; }
function estBilanValideBE(texte){ return MARQUE_VALIDE_BE.test(String(texte || '')); }

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
/* Ce que le mail dit : « sur Messenger », « ou dans ta messagerie… »,
   « ou directement dans ton espace révisions » (v1321) */
function ouLeFaireBE(r){
  const l = [];
  if(r.messenger) l.push('sur Messenger');
  if(r.messagerie) l.push('dans ta messagerie de l’appli (« Le bureau »)');
  if(r.revisions) l.push('directement dans ton espace révisions (onglet 📝 Bilan)');
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
  const seulMessenger = r.messenger && !r.messagerie && !r.revisions;
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

/* ============================================================
   ✍️ v1321 — LES TRAMES À CASES (voir l'en-tête du Worker, « LE BILAN
   QUE L'ÉLÈVE FAIT OU COMPLÈTE ») : le texte avec des « ⟦id⟧ », et ce
   qu'on attend dans chaque case. Le Worker rend la même trame avec les
   réponses de l'élève (rendreTrameBC) : les deux rendus DOIVENT dire
   la même chose — c'est le banc v1321 qui le vérifie.
   ============================================================ */
function normBC(t){
  return String(t || '').normalize('NFKC').replace(/Œ/g, 'OE').replace(/œ/g, 'oe')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
function rendreTrameMailBC(trame, cases, genre){
  const parId = {};
  (cases || []).forEach(c => { parId[c.id] = c; });
  return String(trame || '').replace(/⟦([A-Za-z0-9_-]+)⟧/g, (tout, id) => {
    const c = parId[id];
    if(!c) return '';
    if(c.type === 'ok') return '✅❌';
    if(c.type === 'choix') return genre === 'completer' ? '✍️ Ajoute celles que tu as faites aussi : …' : '✍️ …';
    return genre === 'completer' && c.moniteur ? '✍️ À toi de compléter : …' : '✍️ …';
  }).replace(/\n{3,}/g, '\n\n');
}
function themesBC(){
  return (typeof THEMES_ERREURS !== 'undefined' ? THEMES_ERREURS : []).map(t => t.nom);
}

/* 📝 « Il fait son bilan » : la trame vide, en cases */
function trameAFaireBC(o){
  const jour = (typeof dateEnToutesLettres === 'function' && o.date) ? (dateEnToutesLettres(o.date) || o.date) : (o.date || '');
  const label = ((typeof MODELES !== 'undefined' && MODELES[o.modele]) || {}).label || '';
  const cases = [
    { id: 'sd', type: 'ok', label: 'Carte SD' }, { id: 'inst', type: 'ok', label: 'Installation' },
    { id: 'pass', type: 'ok', label: 'Passager' }, { id: 'voy', type: 'ok', label: 'Voyants' }
  ];
  const L = ['👋 MON BILAN DE CONDUITE — ' + jour + (o.moniteur ? ', avec ' + o.moniteur : '') + (label ? ' (' + label + ')' : ''), '',
             '𝘾𝙖𝙧𝙩𝙚 𝙎𝘿 : je l’ai regardée ⟦sd⟧',
             '𝙄𝙣𝙨𝙩𝙖𝙡𝙡𝙖𝙩𝙞𝙤𝙣 ⟦inst⟧   𝙋𝙖𝙨𝙨𝙖𝙜𝙚𝙧 ⟦pass⟧   𝙑𝙤𝙮𝙖𝙣𝙩𝙨 ⟦voy⟧', '',
             '🧠 MES ERREURS DE CE JOUR :'];
  themesBC().forEach((nom, i) => {
    cases.push({ id: 't' + (i + 1), type: 'texte', label: nom });
    L.push(nom + ' : ⟦t' + (i + 1) + '⟧');
  });
  cases.push({ id: 'man', type: 'choix', label: '🦉 Les manœuvres que j’ai travaillées', options: ficheDuModeleBE(o.modele).slice() });
  cases.push({ id: 'ret', type: 'texte', label: '➡️ Ce que je dois retravailler au prochain cours' });
  L.push('', '🦉 LES MANŒUVRES QUE J’AI TRAVAILLÉES : ⟦man⟧', '', '➡️ CE QUE JE DOIS RETRAVAILLER AU PROCHAIN COURS : ⟦ret⟧');
  return { trame: L.join('\n'), cases: cases };
}

/* ✍️ « Il complète ton bilan » : le texte du moniteur, tel quel, avec des
   cases glissées dedans. ⚠️ ON NE RÉÉCRIT RIEN DE CE QU'IL A ÉCRIT : on
   repère ses catégories (en gras unicode ou non, avec ou sans « : »), on
   ajoute une case sous chacune, et les catégories absentes là où elles
   tomberaient dans l'ordre de la fiche. */
function trameACompleterBC(texte, modele, quoi){
  quoi = Object.assign({ ecrites: true, vides: true, man: true, ret: true }, quoi || {});
  const lignes = String(texte || '').replace(/\r/g, '').replace(/\s+$/, '').split('\n');
  const themes = themesBC();
  const nt = themes.map(normBC);
  const options = ficheDuModeleBE(modele).slice();
  const no = options.map(normBC);
  const avant = l => { const i = l.indexOf(':'); return i === -1 ? l : l.slice(0, i); };
  const apresDeuxPoints = l => { const i = l.indexOf(':'); return i === -1 ? '' : l.slice(i + 1).trim(); };
  const estPuce = l => /^\s*[•\-–*·]/.test(l);
  const themeDe = l => { if(estPuce(l)) return -1; const n = normBC(avant(l)); return n ? nt.indexOf(n) : -1; };
  const estFiche = l => !estPuce(l) && /^(FICHEVEHICULE|LESMANOEUVRES)/.test(normBC(avant(l)));
  const estRet = l => !estPuce(l) && normBC(avant(l)).indexOf('RETRAVAILLER') !== -1;
  /* Une autre rubrique (« 🚦 Intersections : ») : une ligne qui commence par un émoji et finit par « : » */
  const estTitre = l => /^\s*[^\p{L}\p{N}\s•\-–*·]/u.test(l) && /:\s*$/.test(l);
  const estArret = l => !l.trim() || themeDe(l) !== -1 || estFiche(l) || estRet(l) || estTitre(l) || /^\s*(🦉|➡|💡|🎙|✂|👋|🧠|📍)/.test(l);
  const fin = i => { let j = i; while(j + 1 < lignes.length && !estArret(lignes[j + 1])) j++; return j; };
  const apres = {}, devant = {};
  const apresL = (i, arr) => { (apres[i] = apres[i] || []).push(...arr); };
  const devantL = (i, arr) => { (devant[i] = devant[i] || []).push(...arr); };
  const corpsDe = (i, f) => [apresDeuxPoints(lignes[i])].concat(lignes.slice(i + 1, f + 1)).map(x => x.trim()).filter(Boolean).join('\n');
  const cases = [];

  const trouves = {};
  lignes.forEach((l, i) => {
    const t = themeDe(l);
    if(t !== -1 && !trouves[t]){ const f = fin(i); trouves[t] = { h: i, f: f, corps: corpsDe(i, f) }; }
  });
  const ordre = Object.keys(trouves).map(Number).sort((a, b) => a - b);
  let finErreurs = -1;
  if(ordre.length){
    themes.forEach((nom, t) => {
      const id = 't' + (t + 1);
      if(trouves[t]){
        /* Écrite par le moniteur, ou titre posé mais vide (bilans en gras unicode) */
        if(trouves[t].corps ? !quoi.ecrites : !quoi.vides) return;
        apresL(trouves[t].f, ['⟦' + id + '⟧']);
        cases.push({ id: id, type: 'texte', label: nom, moniteur: trouves[t].corps });
        return;
      }
      if(!quoi.vides) return;
      cases.push({ id: id, type: 'texte', label: nom, moniteur: '' });
      const suivant = ordre.find(x => x > t);
      if(suivant !== undefined) devantL(trouves[suivant].h, [nom + ' :', '⟦' + id + '⟧', '']);
      else apresL(trouves[ordre[ordre.length - 1]].f, ['', nom + ' :', '⟦' + id + '⟧']);
    });
    finErreurs = Math.max.apply(null, ordre.map(t => trouves[t].f));
  }else if(quoi.vides){
    /* Aucune catégorie reconnue : la section entière, sous « 🧠 … ERREURS … » s'il existe */
    let h = lignes.findIndex(l => /🧠/.test(l) && /ERREURS|🅴🆁🆁/.test(normBC(l) + l));
    const bloc = [];
    if(h === -1) bloc.push('', '🧠 TES ERREURS DE CE JOUR :');
    themes.forEach((nom, t) => {
      const id = 't' + (t + 1);
      cases.push({ id: id, type: 'texte', label: nom, moniteur: '' });
      bloc.push(nom + ' :', '⟦' + id + '⟧');
    });
    if(h === -1){
      const fi = lignes.findIndex(estFiche);
      h = fi !== -1 ? fi - 1 : lignes.length - 1;
    }
    apresL(h, bloc);
    finErreurs = h;
  }

  if(finErreurs === -1) finErreurs = lignes.length - 1;
  const fi = lignes.findIndex(estFiche);
  let ancre = finErreurs;
  const caseMan = { id: 'man', type: 'choix', label: '🦉 Les manœuvres', options: options, moniteur: '' };
  if(fi !== -1){
    const f = fin(fi);
    caseMan.moniteur = lignes.slice(fi + 1, f + 1).map(x => x.trim()).filter(x => x && (/[✅❌🟠]/.test(x) || no.indexOf(normBC(x)) === -1)).join('\n');
    if(quoi.man) apresL(f, ['⟦man⟧']);
    ancre = Math.max(ancre, f);
  }
  const ri = lignes.findIndex(estRet);
  const caseRet = { id: 'ret', type: 'texte', label: '➡️ Ce que tu dois retravailler au prochain cours', moniteur: '' };
  if(fi === -1 && quoi.man) apresL(ancre, ['', '🦉 LES MANŒUVRES QUE TU AS TRAVAILLÉES :', '⟦man⟧']);
  if(quoi.ret){
    if(ri !== -1){
      const f = fin(ri);
      caseRet.moniteur = corpsDe(ri, f);
      apresL(f, ['⟦ret⟧']);
    }else apresL(ancre, ['', '➡️ CE QUE TU DOIS RETRAVAILLER AU PROCHAIN COURS :', '⟦ret⟧']);
  }
  if(quoi.man) cases.push(caseMan);
  if(quoi.ret) cases.push(caseRet);

  const out = [];
  lignes.forEach((l, i) => {
    if(devant[i]) out.push(...devant[i]);
    out.push(l);
    if(apres[i]) out.push(...apres[i]);
  });
  return { trame: out.join('\n').replace(/\n{4,}/g, '\n\n\n'), cases: cases };
}

/* Le mail « Complète ton bilan » — c'est lui qui s'enregistre (comme v1314) */
function texteBilanACompleter(o, tc){
  const r = reglageBE();
  const prenom = String(o.eleve || '').trim().split(/\s+/)[0] || '';
  const ou = ouLeFaireBE(r);
  const seulMessenger = r.messenger && !r.messagerie && !r.revisions;
  return ['Bonjour ' + prenom + ',', '',
    'Voici le bilan de ton cours écrit par ' + (o.moniteur || 'ton moniteur') + '. Il te reste à le compléter avec tes mots : ajoute ce que tu as compris sous ce qu’a écrit ' +
      (o.moniteur || 'ton moniteur') + ', et remplis chaque catégorie restée vide ✍️. Puis ' +
      (seulMessenger ? 'copie-colle le tout dans un message Messenger à Évolution Conduites.' : 'envoie-le nous ' + ou + '.'),
    '', '✂️ ─────── TON BILAN À COMPLÉTER ───────', '',
    rendreTrameMailBC(tc.trame, tc.cases, 'completer'),
    '', '✂️ ───────────────────────────────', '', 'À très vite !', 'L’équipe Évolution Conduites'].join('\n');
}
function sujetBC(dateIso){
  const m = String(dateIso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return 'Ton bilan de cours du ' + (m ? m[3] + '/' + m[2] : '') + ' — à compléter ✍️ — Évolution Conduites';
}

/* ── la fenêtre : faire ou compléter, la note interne, et (admin) le réglage ──
   opts.choix   : avant le bilan (boutons du cours) — « il fait » ou « il complète »
   opts.genre   : « completer » depuis l'écran du bilan (on sait déjà) */
function fenetreBE(eleve, opts){
  opts = opts || {};
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'overlay show';
    const md = document.createElement('div');
    md.className = 'modal';
    md.id = 'fenetreBilanEleve';
    md.style.maxWidth = 'min(460px, 94vw)';
    const r = reglageBE();
    const prenom = String(eleve || '').trim().split(/\s+/)[0] || 'l’élève';
    const deQue = (/^[aeiouyhâàéèêëîïôöûü]/i.test(prenom) ? 'qu’' : 'que ') + echBE(prenom);
    let genre = opts.genre === 'completer' ? 'completer' : 'faire';
    md.innerHTML = '<h3>' + TITRE_BE + '</h3>';
    const qui = document.createElement('div');
    qui.style.cssText = 'font-size:15px;line-height:1.6;margin-bottom:10px;';
    md.appendChild(qui);

    /* « il fait » / « il complète » — seulement avant le bilan */
    let choixZone = null;
    if(opts.choix){
      choixZone = document.createElement('div');
      choixZone.className = 'beChoix';
      choixZone.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;';
      [['faire', '📝 Il fait son bilan'], ['completer', '✍️ Il complète ton bilan']].forEach(([g, lab]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-genre', g);
        b.style.cssText = 'flex:1 1 150px;width:auto;margin:0;padding:11px 10px;font-size:14px;font-weight:700;border-radius:10px;';
        b.textContent = lab;
        b.addEventListener('click', () => { genre = g; dessiner(); });
        choixZone.appendChild(b);
      });
      md.appendChild(choixZone);
    }
    const liste = document.createElement('div');
    liste.className = 'beListe';
    liste.style.cssText = 'font-size:14px;line-height:1.55;margin-bottom:12px;';
    md.appendChild(liste);

    /* Ce qu'il complète (depuis l'écran du bilan) : tout coché, décochable */
    const quoi = { ecrites: true, vides: true, man: true, ret: true };
    let casesZone = null;
    if(opts.genre === 'completer'){
      casesZone = document.createElement('div');
      casesZone.className = 'beQuoi';
      casesZone.innerHTML = '<label style="margin:0 0 4px;">Ce que ' + echBE(prenom) + ' doit compléter</label>';
      [['ecrites', 'Les catégories que tu as écrites : une ligne « ✍️ À toi de compléter » sous chacune'],
       ['vides', 'Toutes les catégories vides du bilan, comme dans « Tu dois faire ton bilan »'],
       ['man', '🦉 Les manœuvres : ajouter celles qu’il a faites'],
       ['ret', '➡️ Ce qu’il doit retravailler']].forEach(([k, lab]) => {
        const l = document.createElement('label');
        l.style.cssText = 'display:flex;gap:8px;align-items:flex-start;font-size:14px;text-transform:none;color:var(--cream);margin:6px 0;line-height:1.4;';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.checked = true; cb.setAttribute('data-quoi', k);
        cb.style.cssText = 'width:18px;height:18px;margin:2px 0 0;flex-shrink:0;';
        cb.addEventListener('change', () => { quoi[k] = cb.checked; });
        l.appendChild(cb); l.appendChild(document.createTextNode(lab));
        casesZone.appendChild(l);
      });
      md.appendChild(casesZone);
    }

    const lab = document.createElement('label');
    lab.setAttribute('for', 'beNote');
    lab.style.margin = '10px 0 4px';
    lab.textContent = '📌 Note interne (pour le moniteur suivant)';
    md.appendChild(lab);
    const ta = document.createElement('textarea');
    ta.id = 'beNote';
    ta.rows = 3;
    ta.placeholder = 'Facultatif';
    ta.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);color:var(--cream);' +
      'padding:9px 10px;border-radius:10px;font-size:15px;line-height:1.5;font-family:inherit;resize:vertical;margin:0 0 12px;';
    const champNote = (opts.genre === 'completer' && $('noteResult')) ? $('noteResult') : $('noteInterne');
    ta.value = (champNote && champNote.value) || '';
    md.appendChild(ta);

    if(typeof ACCES !== 'undefined' && ACCES && ACCES.role === 'admin'){
      const d = document.createElement('details');
      d.className = 'beReglage';
      d.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:8px 11px;margin-bottom:12px;';
      d.innerHTML = '<summary style="cursor:pointer;font-size:13px;font-weight:700;">⚙️ Où l’élève fait son bilan</summary>' +
        '<div style="font-size:11px;color:var(--muted);margin:6px 0;">Pour tous les élèves, qu’il le fasse ou qu’il le complète. Le mail lui dit où le faire.</div>';
      [['messenger', '💬 Messenger'], ['messagerie', '📱 Sa messagerie de l’appli (« Le bureau ») — la trame y est aussi envoyée'],
       ['revisions', '📚 Son espace révisions (onglet 📝 Bilan) — il le remplit, il arrive au moniteur dans la messagerie, qui le corrige et le valide']].forEach(([k, lb]) => {
        const l = document.createElement('label');
        l.style.cssText = 'display:flex;gap:8px;align-items:center;font-size:14px;text-transform:none;color:var(--cream);margin:6px 0;';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.setAttribute('data-k', k); cb.checked = !!r[k];
        cb.style.cssText = 'width:18px;height:18px;margin:0;flex-shrink:0;';
        cb.addEventListener('change', async () => {
          const n2 = reglageBE(); n2[k] = cb.checked;
          cb.disabled = true;
          try{ await poserReglageBE(n2); if(typeof showToast === 'function') showToast('Réglage enregistré ✅'); dessiner(); }
          catch(e){ cb.checked = !cb.checked; if(typeof showToast === 'function') showToast('Impossible : ' + e.message); }
          finally{ cb.disabled = false; }
        });
        l.appendChild(cb); l.appendChild(document.createTextNode(lb));
        d.appendChild(l);
      });
      md.appendChild(d);
    }

    const rangee = document.createElement('div');
    rangee.className = 'btn-row';
    const bR = document.createElement('button');
    bR.className = 'btn btn-secondary'; bR.textContent = 'Revenir';
    const bV = document.createElement('button');
    bV.className = 'btn btn-primary';
    bR.addEventListener('click', () => { fermerFond(fond); resolve(null); });
    bV.addEventListener('click', () => { fermerFond(fond); resolve({ note: ta.value.trim(), genre: genre, quoi: quoi }); });
    rangee.append(bR, bV);
    md.appendChild(rangee);

    function dessiner(){
      const rg = reglageBE();
      const aussi = (rg.messagerie ? ', aussi dans sa messagerie de l’appli' : '') + (rg.revisions ? ' et dans son espace révisions' : '');
      if(choixZone) choixZone.querySelectorAll('button').forEach(b => {
        b.className = b.getAttribute('data-genre') === genre ? 'btn btn-primary' : 'btn btn-secondary';
      });
      if(genre === 'faire'){
        qui.textContent = 'C’est ' + eleve + ' qui fait son bilan ?';
        liste.innerHTML = '✅ Le cours est validé tout de suite (pas de bilan à composer, aucun minimum de mots).<br>' +
          '✉️ ' + echBE(prenom) + ' reçoit « Tu dois faire toi-même ton bilan de cours » avec la trame à remplir' + aussi + '.<br>' +
          '📚 Dans son dossier › Cours : « 📝 Bilan à faire par l’élève », avec une case pour coller ce ' + deQue + ' a écrit.';
        bV.textContent = '📝 Valider et lui envoyer';
      }else if(opts.choix){
        qui.textContent = 'C’est ' + eleve + ' qui complète ton bilan ?';
        liste.innerHTML = '🎙️ Tu fais ton bilan comme d’habitude, à l’oral ou à la main.<br>' +
          '✍️ Sur l’écran du bilan, relis-le puis appuie sur « ✍️ L’élève complète son bilan » : ' + echBE(prenom) +
          ' le reçoit avec les parties à compléter' + aussi + '.';
        bV.textContent = '✍️ Faire mon bilan d’abord';
      }else{
        qui.textContent = 'Ton bilan part à ' + eleve + ', et c’est à ' + prenom + ' de le compléter.';
        liste.innerHTML = '✅ Le cours est validé tout de suite, avec TON bilan.<br>' +
          '✉️ ' + echBE(prenom) + ' reçoit « Complète ton bilan de cours » : ton texte, et les parties marquées ✍️ à remplir' + aussi + '.<br>' +
          '📚 Dans son dossier › Cours : « ✍️ Bilan à compléter par l’élève », avec une case pour coller ce ' + deQue + ' a complété.';
        bV.textContent = '✍️ Valider et lui envoyer';
      }
    }
    dessiner();
    fond.appendChild(md);
    document.body.appendChild(fond);
  });
}

/* ── la demande, rangée pour l'espace révisions, la messagerie et la relance ── */
async function creerDemandeBC(o){
  const r = reglageBE();
  const rep = await appelPrep({ action: 'bilanCoursCreer', eleve: o.eleve, jour: o.dateIso, moniteur: o.moniteur, modele: o.modele,
    genre: o.genre, ligne: (typeof etatEnregistre !== 'undefined' && etatEnregistre && etatEnregistre.ligne) || 0,
    trame: o.tc.trame, cases: o.tc.cases, revisions: !!r.revisions,
    mails: (typeof adressesDuBilan === 'function') ? adressesDuBilan(o.eleve) : [], sujet: o.sujet, texteMail: o.texte });
  if(rep && rep.status === 'error') throw new Error(rep.message);
  return rep;
}

/* ── la fin, commune aux chemins : enregistrer, envoyer, accueil ──
   o : { genre, tc, sujet, moniteur, modele } (v1321) */
async function finirBilanParLEleve(eleve, texte, dateIso, o){
  o = o || {};
  const genre = o.genre === 'completer' ? 'completer' : 'faire';
  const ok = (typeof bilanEnregistre !== 'undefined' && bilanEnregistre && typeof etatEnregistre !== 'undefined' && etatEnregistre.ligne)
    ? await mettreAJourBilan() : await exporterVersSheets(true);
  if(!ok){
    await informer('Le cours n’est PAS enregistré. Vérifie ta connexion, puis appuie sur « 📋 Copier, enregistrer et terminer ».', '⚠️ Pas enregistré');
    return false;
  }
  const sujet = o.sujet || (genre === 'completer' ? sujetBC(dateIso) : sujetBE(dateIso));
  const dit = [genre === 'completer' ? '✅ Cours validé : ' + eleve + ' complétera ton bilan.' : '✅ Cours validé : ' + eleve + ' fera son bilan.'];
  try{
    const n = await envoyerBilanParMail(eleve, dateIso, texte, { sujet: sujet });
    dit.push(n ? '✉️ Mail envoyé (' + n + ' adresse' + (n > 1 ? 's' : '') + ').' : '✉️ Mail non envoyé : pas d’adresse.');
  }catch(e){ dit.push('⚠️ Mail non envoyé : ' + e.message); }
  const rg = reglageBE();
  if(rg.messagerie){
    try{
      const r = await appelPrep({ action: 'bilanEleveMessagerie', eleve: eleve, texte: texte });
      dit.push(r && r.status === 'ok' ? '💬 ' + (genre === 'completer' ? 'Le bilan à compléter' : 'La trame') + ' est aussi dans sa messagerie.' : '💬 ' + ((r && r.message) || 'Pas envoyé dans sa messagerie.'));
    }catch(e){ dit.push('💬 Pas envoyé dans sa messagerie : ' + e.message); }
  }
  /* 📚 v1321 — la demande : l'espace révisions, le fil avec le moniteur, la relance */
  try{
    const tc = o.tc || trameAFaireBC({ date: dateIso, moniteur: o.moniteur || '', modele: o.modele || '' });
    await creerDemandeBC({ eleve: eleve, dateIso: dateIso, moniteur: o.moniteur || ($('monitorName') ? $('monitorName').value.trim() : ''),
                           modele: o.modele || ($('modele') ? $('modele').value : ''), genre: genre, tc: tc, sujet: sujet, texte: texte });
    if(rg.revisions) dit.push('📚 Il le retrouve dans son espace révisions (onglet 📝 Bilan) ; il t’arrivera dans la messagerie, à valider.');
    dit.push('⏰ Pas fait dans 2 jours : rappel et mail renvoyé.');
  }catch(e){ dit.push('⚠️ La demande n’a pas été rangée (pas de relance) : ' + e.message); }
  await fenetre(dit.join('\n'), [{ nom: '🏠 Accueil', valeur: true, principal: true }],
                genre === 'completer' ? '✍️ Bilan à compléter par l’élève' : '📝 Bilan à faire par l’élève');
  if(typeof terminerCours === 'function') terminerCours();
  return true;
}

/* « Il complète » choisi avant le bilan : le bilan se fait comme d'habitude,
   et le bouton ✍️ de l'écran du bilan se montre */
function annoncerCompleterBC(){
  window.completerBCDemande = true;
  majBoutonBC();
  if(typeof showToast === 'function') showToast('✍️ Relis ton bilan, puis appuie sur « L’élève complète son bilan ».');
}

/* ── à la main : le chemin de « Composer le bilan », texte remplacé ── */
async function bilanParLEleveManuel(){
  const eleve = ($('studentName') && $('studentName').value.trim()) || '';
  if(!eleve){ showToast('Saisis le nom de l’élève.'); return; }
  const modele = $('modele').value;
  if(!modeleBEOk(modele)) return;
  const choix = await fenetreBE(eleve, { choix: true });
  if(!choix) return;
  if($('noteInterne')) $('noteInterne').value = choix.note;
  if(choix.genre === 'completer'){
    window.completerBCDemande = true;
    await genererBilanManuel();
    if($('resultView') && $('resultView').style.display === 'block') annoncerCompleterBC();
    return;
  }
  const dateIso = $('lessonDate').value;
  const moniteur = $('monitorName').value.trim();
  const texte = texteBilanParLEleve({ eleve: eleve, date: dateIso, moniteur: moniteur, modele: modele });
  window.bilanParLEleveEC = { texte: texte };
  try{ await genererBilanManuel(); }
  finally{ window.bilanParLEleveEC = null; }
  /* Renoncé en route (trajet, erreur) : rien n'est enregistré */
  if(!$('resultView') || $('resultView').style.display !== 'block' || $('resultText').value !== texte) return;
  await finirBilanParLEleve(eleve, texte, dateIso, { genre: 'faire', moniteur: moniteur, modele: modele,
    tc: trameAFaireBC({ date: dateIso, moniteur: moniteur, modele: modele }) });
}

/* ── à l'oral : les gestes du bouton rouge, sans génération ── */
async function bilanParLEleveOral(){
  const eleve = ($('studentName') && $('studentName').value.trim()) || '';
  if(!eleve){ showToast('Saisis le nom de l’élève.'); return; }
  const modeleCle = $('modele').value;
  if(!modeleBEOk(modeleCle)) return;
  const choix = await fenetreBE(eleve, { choix: true });
  if(!choix) return;
  if(choix.genre === 'completer'){
    /* Le bilan de toujours (bouton rouge, IA) ; le ✍️ attend sur l'écran du bilan */
    if($('noteInterne')) $('noteInterne').value = choix.note;
    window.completerBCDemande = true;
    if(typeof showToast === 'function') showToast('🎙️ Termine ton bilan ; sur l’écran du bilan, appuie sur « ✍️ L’élève complète son bilan ».');
    if($('finishBtn')) $('finishBtn').click();
    return;
  }
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
  const moniteur = $('monitorName').value.trim();
  const texte = texteBilanParLEleve({ eleve: eleve, date: dateIso, moniteur: moniteur, modele: modeleCle });
  currentLessonMeta = {
    modeleLabel: (MODELES[modeleCle] || {}).label || '',
    studentName: eleve,
    monitorName: moniteur,
    site: $('site').value,
    dateStr: dateIso,
    noteInterne: ($('noteInterne') && $('noteInterne').value.trim()) || '',
    ts: Date.now()
  };
  $('resultText').value = texte;
  afficherNote(currentLessonMeta.noteInterne);
  marquerExport(false);
  $('resultView').style.display = 'block';
  await finirBilanParLEleve(eleve, texte, dateIso, { genre: 'faire', moniteur: moniteur, modele: modeleCle,
    tc: trameAFaireBC({ date: dateIso, moniteur: moniteur, modele: modeleCle }) });
}

/* ── ✍️ depuis l'écran du bilan : le bilan du moniteur, à compléter ── */
async function bilanACompleterDepuisResultat(){
  const meta = (typeof currentLessonMeta !== 'undefined' && currentLessonMeta) || {};
  const eleve = String(meta.studentName || ($('studentName') && $('studentName').value) || '').trim();
  if(!eleve){ showToast('Saisis le nom de l’élève.'); return; }
  const modele = $('modele').value;
  if(!modeleBEOk(modele)){ showToast('Seulement pour les cours de conduite (boîte manuelle ou automatique, AAC).'); return; }
  const texteMoniteur = String(($('resultText') && $('resultText').value) || '').trim();
  if(!texteMoniteur){ showToast('Le bilan est vide : écris-le d’abord.'); return; }
  if(estBilanParLEleve(texteMoniteur) || estBilanACompleter(texteMoniteur)){ showToast('Ce bilan est déjà parti à l’élève.'); return; }
  const choix = await fenetreBE(eleve, { genre: 'completer' });
  if(!choix) return;
  if($('noteResult')) $('noteResult').value = choix.note;
  if($('noteInterne')) $('noteInterne').value = choix.note;
  const dateIso = meta.dateStr || ($('lessonDate') && $('lessonDate').value) || '';
  const moniteur = String(meta.monitorName || ($('monitorName') && $('monitorName').value) || '').trim();
  const tc = trameACompleterBC(texteMoniteur, modele, choix.quoi);
  if(!tc.cases.length){ showToast('Tu as tout décoché : il n’aurait rien à compléter.'); return; }
  const texte = texteBilanACompleter({ eleve: eleve, moniteur: moniteur, date: dateIso }, tc);
  $('resultText').value = texte;
  window.completerBCDemande = false;
  const ok = await finirBilanParLEleve(eleve, texte, dateIso, { genre: 'completer', tc: tc, moniteur: moniteur, modele: modele });
  if(!ok) $('resultText').value = texteMoniteur;
}

/* ── les boutons ── */
function poserBoutonsBE(){
  if($('manuelGen') && !$('faireSonBilanManuel')){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary btnFaireSonBilan';
    b.id = 'faireSonBilanManuel';
    b.type = 'button';
    b.textContent = TITRE_BE;
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
    b.textContent = TITRE_BE;
    b.style.display = 'none';
    b.addEventListener('click', async () => {
      b.disabled = true;
      try{ await bilanParLEleveOral(); }
      catch(e){ console.error(e); await informer('Ça n’a pas pu se faire.\n\nDétail : ' + (e && e.message ? e.message : e), 'Erreur'); }
      finally{ b.disabled = false; }
    });
    $('finishBtn').after(b);
  }
  /* ✍️ v1321 — sous « 📋 Copier, enregistrer et terminer » */
  if($('copyBtn') && !$('completerSonBilan')){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.id = 'completerSonBilan';
    b.type = 'button';
    b.style.cssText = 'display:none;margin-top:8px;padding:14px;font-size:14px;';
    b.textContent = '✍️ L’élève complète son bilan';
    const a = document.createElement('div');
    a.id = 'completerSonBilanAide';
    a.style.cssText = 'display:none;font-size:12px;color:var(--muted);text-align:center;margin-top:4px;line-height:1.4;';
    a.textContent = 'Le cours est validé ; il reçoit ce bilan avec les parties à compléter.';
    b.addEventListener('click', async () => {
      b.disabled = true;
      try{ await bilanACompleterDepuisResultat(); }
      catch(e){ console.error(e); await informer('Ça n’a pas pu se faire.\n\nDétail : ' + (e && e.message ? e.message : e), 'Erreur'); }
      finally{ b.disabled = false; majBoutonBC(); }
    });
    $('copyBtn').after(b);
    b.after(a);
  }
  majBoutonsBE();
  /* Les zones s'ouvrent et se ferment ailleurs : on suit leur style */
  const suivre = el => { if(el && typeof MutationObserver === 'function') new MutationObserver(majBoutonsBE).observe(el, { attributes: true, attributeFilter: ['style'] }); };
  suivre($('manuelView')); suivre($('finishBtn')); suivre($('resultView'));
  if($('modele')) $('modele').addEventListener('change', majBoutonsBE);
  if($('resultText')) $('resultText').addEventListener('input', majBoutonBC);
}
function majBoutonsBE(){
  const ok = modeleBEOk($('modele') && $('modele').value);
  const bm = $('faireSonBilanManuel'), bo = $('faireSonBilanOral');
  if(bm) bm.style.display = (ok && !window.sansIAEnCours) ? '' : 'none';
  if(bo) bo.style.display = (ok && $('finishBtn') && $('finishBtn').style.display !== 'none') ? 'block' : 'none';
  majBoutonBC();
}
function majBoutonBC(){
  const b = $('completerSonBilan'), a = $('completerSonBilanAide');
  if(!b) return;
  const t = String(($('resultText') && $('resultText').value) || '');
  const voir = modeleBEOk($('modele') && $('modele').value) && $('resultView') && $('resultView').style.display === 'block' &&
               t.trim() && !estBilanParLEleve(t) && !estBilanACompleter(t);
  b.style.display = voir ? 'block' : 'none';
  if(a) a.style.display = voir ? 'block' : 'none';
  /* Choisi dans la fenêtre avant le bilan : le bouton se signale */
  b.style.outline = (voir && window.completerBCDemande) ? '3px solid var(--accent, #b8ff12)' : '';
  b.style.outlineOffset = (voir && window.completerBCDemande) ? '2px' : '';
}

/* ── l'historique : la ligne du cours, et son bilan à coller ── */
function decorerBilanParLEleve(row, item){
  if(!row || !item) return;
  const b0 = String(item.bilan || '');
  const aFaire = estBilanParLEleve(b0), aCompleter = estBilanACompleter(b0);
  const valide = b0.match(MARQUE_VALIDE_BE);
  if(!aFaire && !aCompleter && !valide) return;
  row.classList.add('beLigne');
  row.style.flexWrap = 'wrap';
  const z = document.createElement('div');
  z.className = 'beHisto';
  const dessiner = () => {
    z.innerHTML = '';
    const b = String(item.bilan || '');
    const v = b.match(MARQUE_VALIDE_BE);
    const t = document.createElement('div');
    if(v){
      /* ✅ v1321 — fait dans son espace, corrigé et validé : plus rien à coller */
      t.className = 'beHistoTitre beFait';
      t.textContent = (v[1] === 'complété' ? '✍️ Bilan complété par l’élève ✅' : '📝 Bilan fait par l’élève ✅') + ' — corrigé et validé par ' + v[2];
      z.appendChild(t);
      return;
    }
    const comp = estBilanACompleter(b);
    const i = b.indexOf(SEP_SON_BILAN_BE);
    const fait = i !== -1;
    t.className = 'beHistoTitre' + (fait ? ' beFait' : '');
    const dem = item.moniteur ? ' — demandé par ' + item.moniteur : '';
    t.textContent = comp ? (fait ? '✍️ Bilan complété par l’élève ✅' : '✍️ Bilan à compléter par l’élève') + dem
                         : (fait ? '📝 Bilan fait par l’élève ✅' : '📝 Bilan à faire par l’élève') + dem;
    z.appendChild(t);
    if(fait){
      const s = document.createElement('div');
      s.className = 'beSonBilan';
      s.textContent = '📥 ' + b.slice(i + 3).replace(/^SON BILAN — /, 'Son bilan, ');
      z.appendChild(s);
    }
    const d = document.createElement('details');
    d.className = 'beColler';
    d.innerHTML = '<summary>' + (fait ? '✏️ Remplacer son bilan' : comp ? '📥 Son bilan complété (ce qu’il/elle a écrit)' : '📥 Son bilan (ce qu’il/elle a écrit)') + '</summary>';
    const ta = document.createElement('textarea');
    ta.rows = 4;
    ta.placeholder = comp ? 'Colle ici le bilan complété par l’élève…' : 'Colle ici ce que l’élève a écrit…';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'btn btn-primary';
    ok.textContent = comp ? '💾 Garder son bilan complété' : '💾 Garder son bilan';
    ok.addEventListener('click', async ev => {
      ev.stopPropagation();
      const val = ta.value.trim();
      if(!val){ showToast('Colle d’abord ce qu’il a écrit.'); return; }
      if(!item.ligne){ showToast('Ce cours n’a pas de ligne : rouvre le dossier et réessaie.'); return; }
      ok.disabled = true;
      const quand = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' ', ' à ');
      const base = fait ? b.slice(0, i).replace(/\s*━+\s*$/, '') : b.replace(/\s*$/, '');
      const neuf = base + '\n\n━━━━━━━━━━━━━━━━━━\n' + SEP_SON_BILAN_BE + ((ACCES && ACCES.moniteur) || '') + ' le ' + quand + ' :\n' + val;
      try{
        const r = await appelPrep({ action: 'bilanMaj', ligne: item.ligne, eleve: item.eleve, bilan: neuf });
        if(r && r.status === 'error') throw new Error(r.message);
        item.bilan = neuf;
        /* 📚 v1321 — la demande est close : plus de relance, plus d'onglet à remplir */
        try{ await appelPrep({ action: 'bilanCoursColle', eleve: item.eleve, ligne: item.ligne }); }catch(e){}
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

/* ============================================================
   💬 v1321 — DANS LA MESSAGERIE : son bilan, à lire, corriger et valider
   (schéma v1315 : « ✏️ Lire, corriger et valider » sous son message, dans
   le fil élève ↔ moniteur). Valident : le moniteur du cours, le bureau,
   les admins — le Worker le revérifie.
   ============================================================ */
function carteBilanCoursEC(m){
  if(!m || m.motif !== 'bilan-cours' || !m.donnees || !m.donnees.bilanCours || Number(m.supprime || 0)) return null;
  const z = document.createElement('div');
  z.className = 'bcCarte';
  z.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px;padding:8px 10px;' +
    'border:1px solid var(--line);border-radius:10px;background:var(--navy);';
  const t = document.createElement('div');
  t.style.cssText = 'flex:1 1 160px;font-size:13px;font-weight:700;line-height:1.35;';
  const j = String(m.texte || '').match(/cours du (\d{2}\/\d{2})/);
  t.textContent = '📝 Son bilan' + (j ? ' du cours du ' + j[1] : '') + ' · à valider';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-primary';
  b.style.cssText = 'width:auto;margin:0;padding:8px 12px;font-size:13px;';
  b.textContent = '✏️ Lire, corriger et valider';
  b.addEventListener('click', ev => { ev.stopPropagation(); ouvrirBilanCoursEC(m.donnees.bilanCours); });
  z.append(t, b);
  return z;
}
async function ouvrirBilanCoursEC(id){
  let r;
  try{ r = await appelPrep({ action: 'bilanCoursLire', id: id }); }
  catch(e){ showToast('Impossible de l’ouvrir : ' + e.message); return; }
  if(!r || r.status === 'error' || !r.bilan){ showToast((r && r.message) || 'Ce bilan n’existe plus.'); return; }
  const x = r.bilan;
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const md = document.createElement('div');
  md.className = 'modal';
  md.id = 'fenetreBilanCours';
  md.style.maxWidth = 'min(560px, 94vw)';
  const comp = x.genre === 'completer';
  const ddmm = String(x.jour || '').split('-').reverse().slice(0, 2).join('/');
  const recu = x.envoyeLe ? new Date(x.envoyeLe).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' ', ' à ') : '';
  md.innerHTML = '<h3>' + (comp ? '✍️ Bilan complété par ' : '📝 Bilan écrit par ') + echBE(x.eleve) + '</h3>' +
    '<div style="font-size:12px;color:var(--muted);margin:-4px 0 10px;line-height:1.5;">' +
    (recu ? 'Reçu le ' + echBE(recu) + ' depuis son espace révisions · ' : '') + 'cours du ' + echBE(ddmm) + (x.moniteur ? ' avec ' + echBE(x.moniteur) : '') + '.</div>';
  const ta = document.createElement('textarea');
  ta.id = 'bcTexte';
  ta.rows = 14;
  ta.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);color:var(--cream);padding:10px 12px;' +
    'border-radius:10px;font-size:14px;line-height:1.55;font-family:inherit;resize:vertical;margin:0 0 6px;';
  ta.value = x.etat === 'valide' ? (x.texteValide || x.texteEleve) : (x.texteEleve || '');
  md.appendChild(ta);
  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:10px;line-height:1.5;';
  md.appendChild(aide);
  const retour = document.createElement('textarea');
  retour.id = 'bcRetour';
  retour.rows = 2;
  retour.placeholder = 'Ce qu’il doit compléter (seulement si tu lui redemandes)';
  retour.style.cssText = ta.style.cssText + 'font-size:14px;';
  md.appendChild(retour);
  const rangee = document.createElement('div');
  rangee.className = 'btn-row';
  const bF = document.createElement('button'); bF.className = 'btn btn-secondary'; bF.textContent = 'Fermer';
  const bA = document.createElement('button'); bA.className = 'btn btn-secondary'; bA.textContent = '↩️ Demander de compléter';
  const bV = document.createElement('button'); bV.className = 'btn btn-primary'; bV.textContent = '✅ Valider';
  rangee.append(bF, bA, bV);
  md.appendChild(rangee);
  if(x.etat === 'valide'){
    ta.readOnly = true; retour.style.display = 'none'; bA.style.display = 'none'; bV.style.display = 'none';
    aide.textContent = '✅ Validé par ' + (x.validePar || '—') + ' : c’est cette version qui est dans son historique et dans « 📖 Mes leçons ».';
  }else if(x.etat === 'attendu' || x.etat === 'colle'){
    ta.readOnly = true; retour.style.display = 'none'; bA.style.display = 'none'; bV.style.display = 'none';
    aide.textContent = x.etat === 'colle' ? 'Son bilan a été collé à la main dans son dossier.' : 'Il ne l’a pas encore envoyé.';
  }else{
    aide.textContent = 'Corrige directement dans le texte : c’est cette version qui ira dans son historique et dans « 📖 Mes leçons ».' +
      (x.etat === 'acompleter' ? ' (Déjà renvoyé pour compléter : « ' + (x.retour || '') + ' ».)' : '');
    if(!x.peutValider){
      bA.disabled = true; bV.disabled = true;
      aide.textContent += ' Seuls ' + (x.moniteur || 'le moniteur du cours') + ', le bureau et les admins le valident.';
    }
  }
  bF.addEventListener('click', () => fermerFond(fond));
  bA.addEventListener('click', async () => {
    const t = retour.value.trim();
    if(!t){ showToast('Écris ce qu’il doit compléter.'); retour.focus(); return; }
    bA.disabled = true;
    try{
      const rr = await appelPrep({ action: 'bilanCoursACompleter', id: x.id, retour: t });
      if(rr && rr.status === 'error') throw new Error(rr.message);
      showToast('↩️ Demandé : il le reprend dans son espace.');
      fermerFond(fond);
    }catch(e){ bA.disabled = false; showToast('Pas envoyé : ' + e.message); }
  });
  bV.addEventListener('click', async () => {
    bV.disabled = true; bV.textContent = 'Validation…';
    try{
      const rr = await appelPrep({ action: 'bilanCoursValider', id: x.id, texte: ta.value });
      if(rr && rr.status === 'error') throw new Error(rr.message);
      if(typeof viderCaches === 'function') viderCaches(x.eleve);
      showToast('✅ Validé : il est dans son historique et dans « Mes leçons ».');
      fermerFond(fond);
    }catch(e){ bV.disabled = false; bV.textContent = '✅ Valider'; await informer(e.message, '⚠️ Pas validé'); }
  });
  fond.appendChild(md);
  fond.addEventListener('click', e => { if(e.target === fond) fermerFond(fond); });
  document.body.appendChild(fond);
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poserBoutonsBE);
else poserBoutonsBE();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-bilan-eleve.js'] = true;
