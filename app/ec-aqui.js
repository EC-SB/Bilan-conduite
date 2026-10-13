/* Déployé le 13/10/2026 à 09:51 — v1161 */
/* ============================================================
   ec-aqui.js
   ✏️ Écrire plus vite — « À qui ? » et « ✏️ Écrire à … »
   Application Bilan de conduite — Évolution Conduites

   David, le 12 octobre : « quand on veut ouvrir une nouvelle
   conversation c'est trop long et trop compliqué, simplifie la chose
   au maximum, j'ai besoin d'ergonomie et de ne pas perdre 3h avant
   d'envoyer un message ». Sur le schéma, il a pris les solutions 1
   et 3 :

     1 · le ＋ ouvre UNE question, « À qui ? ». Un nom touché ouvre
         le fil, le curseur dans la barre. S'il existe déjà une
         conversation avec cette personne, c'est elle qui s'ouvre.
         « En mon nom / au nom du bureau » n'est plus une question
         préalable : c'est « Signé : 🏢 Le bureau · 👤 Moi seul » au-
         dessus de la barre, déjà choisi.
     3 · « Rechercher partout » propose en tête « ✏️ Écrire à … ».

   ⚠️ RIEN NE PART TANT QU'ON N'A PAS ENVOYÉ. Le fil neuf n'existe
   que sur cet écran : refermer ne laisse aucune conversation vide
   chez l'élève (la leçon de la v1111).

   ⚠️ L'ÉCRAN D'AVANT RESTE pour le groupe (« 👥 Plusieurs
   personnes ») et pour les participants d'un fil existant.
   ============================================================ */

let aQuiMots = '';
let filNeufEC = null;   /* { cible, signature } tant que rien n'est parti */

function moiMessagerie(){
  return normaliserMessagerie((typeof ACCES !== 'undefined' && ACCES.moniteur) || '');
}
function aLaBoiteDuBureau(){
  return typeof aDroit !== 'function' || aDroit('messagerie_bureau') || aDroit('messagerie_admin');
}
function initialesDe(nom){
  const m = String(nom || '').trim().split(/\s+/).filter(Boolean);
  if(!m.length) return '?';
  return ((m[0][0] || '') + (m.length > 1 ? (m[m.length - 1][0] || '') : '')).toUpperCase();
}

/* ---------- qui peut-on viser ---------- */

/* La conversation déjà ouverte avec cette personne, s'il y en a
   une : on ne fait pas de doublon. */
function filExistantPour(cible, signature){
  const moi = moiMessagerie();
  const n = normaliserMessagerie(cible.nom);
  const ouvertes = (conversationsEC || []).filter(c => !Number(c.fermee || 0) && !c.enSupervision);
  if(cible.genre === 'eleve'){
    const genre = signature === 'bureau' ? 'bureau' : 'moniteur';
    return ouvertes.find(c => c.genre === genre && normaliserMessagerie(c.eleve) === n &&
      (genre === 'bureau' || (c.membres || []).some(m => m.genre === 'user' &&
                                                         normaliserMessagerie(m.qui) === moi))) || null;
  }
  if(cible.genre === 'user'){
    return ouvertes.find(c => {
      if(c.genre !== 'interne') return false;
      const us = (c.membres || []).filter(m => m.genre === 'user').map(m => normaliserMessagerie(m.qui));
      return us.length === 2 && us.indexOf(moi) !== -1 && us.indexOf(n) !== -1 &&
             !(c.membres || []).some(m => m.genre === 'eleve');
    }) || null;
  }
  return null;
}

/* La signature par défaut : un élève → le bureau, si on en est ;
   sinon en son nom. Un collègue : entre vous, sans question. */
function signatureParDefaut(cible){
  if(cible.genre !== 'eleve') return 'moi';
  return aLaBoiteDuBureau() ? 'bureau' : 'moi';
}

/* Les récents, les élèves du jour, les groupes — tirés de ce que
   l'écran a déjà : rien n'est demandé au serveur pour les montrer. */
function ciblesRecentes(){
  const moi = moiMessagerie();
  const vus = {};
  const gens = [];
  const groupes = [];
  (conversationsEC || []).filter(c => !c.enSupervision).forEach(c => {
    if(c.genre === 'groupe'){
      if(groupes.length < 3) groupes.push({ genre: 'groupe', nom: c.titre || 'Groupe', conv: c });
      return;
    }
    let cible = null;
    if(c.eleve && ['bureau', 'moniteur', 'retard', 'annul', 'oubli'].indexOf(c.genre) !== -1){
      cible = { genre: 'eleve', nom: c.eleve };
    }else if(c.genre === 'interne'){
      const autres = (c.membres || []).filter(m => m.genre === 'user' &&
                                                   normaliserMessagerie(m.qui) !== moi);
      if(autres.length === 1) cible = { genre: 'user', nom: autres[0].qui };
    }
    if(!cible) return;
    const k = cible.genre + ':' + normaliserMessagerie(cible.nom);
    if(vus[k]) return;
    vus[k] = true;
    gens.push(cible);
  });
  return { gens: gens.slice(0, 4), groupes: groupes };
}

function elevesDuJour(){
  const jour = (typeof todayLocal === 'function') ? todayLocal() : '';
  const tous = ((typeof prepares !== 'undefined' && prepares) || [])
    .filter(x => x && x.eleve && x.date === jour);
  const moi = moiMessagerie();
  const miens = tous.filter(x => normaliserMessagerie(x.moniteur) === moi);
  const liste = (miens.length || !aLaBoiteDuBureau()) ? miens : tous;
  const heure = x => (typeof heureDuCoursPrepare === 'function') ? heureDuCoursPrepare(x) : '';
  const vus = {};
  return {
    titre: (miens.length || !aLaBoiteDuBureau()) ? 'Mes élèves aujourd’hui' : 'Aujourd’hui',
    gens: liste.slice().sort((a, b) => heure(a) < heure(b) ? -1 : 1)
      .filter(x => { const k = normaliserMessagerie(x.eleve); if(vus[k]) return false; vus[k] = true; return true; })
      .slice(0, 6)
      .map(x => ({ genre: 'eleve', nom: x.eleve,
                   sous: [heure(x) !== '99:99' ? heure(x) : '', x.moniteur ? 'avec ' + x.moniteur : '']
                         .filter(Boolean).join(' ') }))
  };
}

/* Ce qui répond à quelques lettres : élèves, équipe, groupes. */
function ciblesPour(mots){
  const m = normaliserMessagerie(mots);
  if(m.length < 2) return [];
  const colle = n => {
    const t = normaliserMessagerie(n);
    return t.indexOf(m) === 0 || t.split(' ').some(x => x.indexOf(m) === 0) || t.indexOf(m) !== -1;
  };
  const moi = moiMessagerie();
  const out = [];
  ((typeof tousLesElevesConnus === 'function') ? tousLesElevesConnus() : []).filter(colle)
    .slice(0, 6).forEach(n => out.push({ genre: 'eleve', nom: n }));
  ((typeof lesComptesDeLEquipe === 'function') ? lesComptesDeLEquipe() : [])
    .filter(n => normaliserMessagerie(n) !== moi && colle(n))
    .slice(0, 3).forEach(n => out.push({ genre: 'user', nom: n }));
  (conversationsEC || []).filter(c => c.genre === 'groupe' && !c.enSupervision && colle(c.titre || ''))
    .slice(0, 3).forEach(c => out.push({ genre: 'groupe', nom: c.titre || 'Groupe', conv: c }));
  return out;
}

function sousTitreDeCible(c){
  if(c.sous) return c.sous;
  if(c.genre === 'groupe'){
    const m = (c.conv && c.conv.membres) || [];
    const el = m.filter(x => x.genre === 'eleve').length;
    return [el ? el + ' élève' + (el > 1 ? 's' : '') : '',
            m.some(x => x.genre === 'boite') ? 'le bureau' : ''].filter(Boolean).join(' · ') || 'groupe';
  }
  return c.genre === 'eleve' ? 'élève' : 'équipe';
}

function ligneDeCible(c){
  const d = document.createElement('div');
  d.className = 'aquiLigne';
  d.style.cssText = 'display:flex;gap:11px;align-items:center;padding:9px 6px;' +
    'border-bottom:1px solid var(--line);cursor:pointer;';
  const r = document.createElement('div');
  r.style.cssText = 'width:36px;height:36px;border-radius:12px;border:1px solid var(--line);' +
    'display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex:0 0 auto;';
  r.textContent = c.genre === 'groupe' ? '👥' : initialesDe(c.nom);
  d.appendChild(r);
  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;';
  t.innerHTML = '<div style="font-weight:800;font-size:14px;overflow-wrap:anywhere;"></div>' +
    '<div style="font-size:12px;color:var(--muted);"></div>';
  t.firstChild.textContent = c.nom;
  t.lastChild.textContent = sousTitreDeCible(c);
  d.appendChild(t);
  if(c.genre === 'eleve' && aLaBoiteDuBureau()){
    const p = document.createElement('span');
    p.className = 'ckPill';
    p.textContent = '🏢 bureau';
    d.appendChild(p);
  }
  d.addEventListener('click', () => ecrireA(c));
  return d;
}

/* ---------- 1 · « À qui ? » ---------- */

async function ecranAQui(){
  const zone = zoneFilMsg();
  if(!zone) return;
  aQuiMots = '';
  filNeufEC = null;
  if(typeof reglagesMsgOuvertEC !== 'undefined') reglagesMsgOuvertEC = false;   /* ⚙️ v1154 */
  if(typeof signalOuvertEC !== 'undefined') signalOuvertEC = null;              /* 📞 v1155 */
  ckEcranAPart = true;
  if(typeof ckLarge === 'function' && ckLarge() && typeof ckDessinerLaFiche === 'function') ckDessinerLaFiche(null);
  if(typeof arreterLaVeilleDuFil === 'function') arreterLaVeilleDuFil();
  if(typeof couperLeDirect === 'function') couperLeDirect();
  filOuvertEC = null;

  /* Les élèves et l'équipe d'abord : sans eux la recherche ne
     trouverait personne. Le même chargement que l'écran d'avant. */
  zone.innerHTML = (typeof htmlAttente === 'function') ? htmlAttente('Lecture des listes…')
                                                      : '<div class="empty">Lecture des listes…</div>';
  try{ if(typeof preparerLesListesDuSelecteur === 'function') await preparerLesListesDuSelecteur(); }
  catch(e){ /* on cherchera dans ce qu'on a */ }
  if(zoneFilMsg() !== zone || filOuvertEC) return;
  dessinerAQui(zone);
}

function dessinerAQui(zone){
  zone.innerHTML = '';
  const tete = document.createElement('div');
  tete.className = 'ckFh' + (ckLarge() ? '' : ' etroit');
  tete.innerHTML = '<div class="tt"><div class="t">✏️ Nouveau message</div>' +
    '<div class="s">tape un nom, touche-le : le fil s’ouvre</div></div><div class="b"></div>';
  tete.querySelector('.b').appendChild(ckBouton('✕', 'Fermer', () => {
    ckEcranAPart = false;
    filNeufEC = null;
    afficherMessagerie(true);
  }, ckLarge() ? '' : 'rond'));
  zone.appendChild(tete);

  const corps = document.createElement('div');
  corps.className = 'aquiCorps';
  corps.style.cssText = 'padding:14px 18px;overflow:auto;';
  const ch = document.createElement('input');
  ch.type = 'text';
  ch.id = 'aquiCherche';
  ch.autocomplete = 'off';
  ch.placeholder = 'À qui ? Un élève, un collègue, un groupe…';
  ch.style.marginBottom = '6px';
  ch.value = aQuiMots;
  corps.appendChild(ch);
  const res = document.createElement('div');
  res.id = 'aquiResultats';
  corps.appendChild(res);
  zone.appendChild(corps);

  ch.addEventListener('input', () => { aQuiMots = ch.value; remplirAQui(res); });
  ch.addEventListener('keydown', ev => {
    if(ev.key === 'Enter'){
      const premiere = res.querySelector('.aquiLigne');
      if(premiere){ ev.preventDefault(); premiere.click(); }
    }
  });
  remplirAQui(res);
  setTimeout(() => { try{ ch.focus(); }catch(e){} }, 0);
}

function remplirAQui(res){
  res.innerHTML = '';
  const sect = t => {
    const s = document.createElement('div');
    s.style.cssText = 'font-size:11px;letter-spacing:.12em;text-transform:uppercase;' +
      'color:var(--muted);font-weight:700;margin:14px 0 4px;';
    s.textContent = t;
    res.appendChild(s);
  };
  if(normaliserMessagerie(aQuiMots).length >= 2){
    const trouves = ciblesPour(aQuiMots);
    if(!trouves.length){
      const v = document.createElement('div');
      v.className = 'empty';
      v.textContent = 'Personne à ce nom.';
      res.appendChild(v);
    }else trouves.forEach(c => res.appendChild(ligneDeCible(c)));
  }else{
    const r = ciblesRecentes();
    const j = elevesDuJour();
    if(r.gens.length){ sect('Récents'); r.gens.forEach(c => res.appendChild(ligneDeCible(c))); }
    if(j.gens.length){ sect(j.titre); j.gens.forEach(c => res.appendChild(ligneDeCible(c))); }
    if(r.groupes.length){ sect('Groupes'); r.groupes.forEach(c => res.appendChild(ligneDeCible(c))); }
  }
  /* Le groupe : l'écran d'avant, déjà réglé sur « Un groupe » */
  if(aLaBoiteDuBureau()){
    const g = document.createElement('div');
    g.style.marginTop = '14px';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-secondary';
    b.style.cssText = 'width:auto;margin:0;padding:9px 14px;font-size:13px;';
    b.textContent = '👥 Plusieurs personnes : un groupe';
    b.addEventListener('click', () => ecranNouvelleConversation('groupe'));
    g.appendChild(b);
    res.appendChild(g);
  }
}

/* ---------- un nom touché ---------- */

function ecrireA(cible){
  if(cible.genre === 'groupe' && cible.conv){ ckEcranAPart = false; ouvrirLeFil(cible.conv.id); return; }
  const signature = signatureParDefaut(cible);
  const deja = filExistantPour(cible, signature);
  if(deja){ ckEcranAPart = false; ouvrirLeFil(deja.id); return; }
  ouvrirLeFilNeuf(cible, signature);
}

/* ---------- le fil neuf : il naît au premier envoi ---------- */

function ouvrirLeFilNeuf(cible, signature){
  const zone = zoneFilMsg();
  if(!zone) return;
  if(typeof arreterLaVeilleDuFil === 'function') arreterLaVeilleDuFil();
  if(typeof couperLeDirect === 'function') couperLeDirect();
  filOuvertEC = null;
  ckEcranAPart = true;
  filNeufEC = { cible: cible, signature: signature };
  const large = ckLarge();
  zone.innerHTML = '';
  zone.classList.toggle('msgEtroit', !large);

  const tete = document.createElement('div');
  tete.className = 'ckFh' + (large ? '' : ' etroit');
  if(!large) tete.appendChild(ckBouton('←', 'Revenir', () => ecranAQui(), 'rond'));
  const tt = document.createElement('div');
  tt.className = 'tt';
  tt.innerHTML = '<div class="t"></div><div class="s"><span class="ckDot"></span> ' +
    'nouvelle conversation · rien n’est parti</div>';
  tt.firstChild.textContent = cible.nom;
  tete.appendChild(tt);
  const b = document.createElement('div');
  b.className = 'b';
  b.appendChild(ckBouton('✕', 'Ne rien envoyer', () => {
    ckEcranAPart = false;
    filNeufEC = null;
    afficherMessagerie(true);
  }, large ? '' : 'rond'));
  tete.appendChild(b);
  zone.appendChild(tete);

  const fil = document.createElement('div');
  fil.className = 'msgFil';
  fil.id = 'msgElvFil';
  fil.innerHTML = '<div class="empty">Écris ton message : la conversation naît au premier envoi.</div>';
  zone.appendChild(fil);

  /* « Signé : » — seulement quand il y a un choix à faire */
  if(cible.genre === 'eleve' && aLaBoiteDuBureau()){
    const sg = document.createElement('div');
    sg.className = 'aquiSigne';
    sg.style.cssText = 'display:flex;gap:7px;align-items:center;flex-wrap:wrap;padding:6px 16px 8px;' +
      'font-size:12.5px;color:var(--muted);';
    const poser = () => {
      sg.innerHTML = 'Signé :';
      [['bureau', '🏢 Le bureau'], ['moi', '👤 Moi seul']].forEach(([v, t]) => {
        const x = document.createElement('button');
        x.type = 'button';
        const on = filNeufEC.signature === v;
        x.className = on ? '' : 'btn btn-secondary';
        x.style.cssText = 'width:auto;margin:0;padding:6px 12px;font-size:12.5px;border-radius:999px;' +
          (on ? 'font-weight:700;font-family:inherit;cursor:pointer;background:var(--orange-soft);' +
                'border:1px solid var(--orange);color:var(--on-accent);' : '');
        x.textContent = t;
        x.addEventListener('click', () => {
          if(filNeufEC.signature === v) return;
          /* Une conversation de cette sorte existe déjà : c'est elle */
          const deja = filExistantPour(cible, v);
          if(deja){ ckEcranAPart = false; filNeufEC = null; ouvrirLeFil(deja.id); return; }
          filNeufEC.signature = v;
          poser();
        });
        sg.appendChild(x);
      });
      const n = document.createElement('span');
      n.textContent = filNeufEC.signature === 'bureau'
        ? '· la boîte du bureau voit et peut répondre'
        : '· entre ' + cible.nom.split(/\s+/)[0] + ' et toi';
      sg.appendChild(n);
    };
    poser();
    zone.appendChild(sg);
  }

  /* La VRAIE barre d'écriture : mêmes outils, même place. Ses gestes
     sont rattrapés ici tant que le fil n'existe pas. */
  const barre = zoneDEcritureDuFil('');
  /* ⚠️ SUR LA ZONE, PLUS SUR LA BARRE — v1161. Les gestes photo,
     vidéo et fichier vivent dans le panneau du ＋, posé AU-DESSUS de
     la barre : un écouteur sur la barre ne les voyait plus passer,
     et le premier fichier d'un fil neuf serait parti nulle part. Le
     ＋ lui-même n'est pas rattrapé : ouvrir le panneau ne crée rien. */
  /* ⚠️ UNE SEULE FOIS PAR ZONE : elle survit aux dessins (« innerHTML
     = '' » ne retire pas ses écouteurs), et deux écouteurs créeraient
     deux conversations pour un seul appui. */
  if(!zone.dataset.ecouteFilNeuf) zone.addEventListener('click', ev => {
    const cibleClic = ev.target && ev.target.closest && ev.target.closest('button');
    if(!cibleClic || !filNeufEC) return;
    const id = cibleClic.id;
    if(['msgElvEnvoyer', 'msgElvVocal', 'msgPlusPhoto', 'msgPlusGalerie',
        'msgPlusFilmer', 'msgPlusVideo', 'msgPlusFichier'].indexOf(id) === -1) return;
    ev.stopPropagation();
    ev.preventDefault();
    if(typeof fermerLePanneauPlus === 'function') fermerLePanneauPlus();
    envoyerDansLeFilNeuf(id);
  }, true);
  zone.dataset.ecouteFilNeuf = '1';
  barre.addEventListener('keydown', ev => {
    if(filNeufEC && ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)){
      ev.stopPropagation();
      ev.preventDefault();
      envoyerDansLeFilNeuf('msgElvEnvoyer');
    }
  }, true);
  zone.appendChild(barre);
  setTimeout(() => { const t = $('msgElvTexte'); if(t) try{ t.focus(); }catch(e){} }, 0);
}

/* Le fil naît ici : la conversation, puis le message — ou, pour un
   vocal, une photo, une vidéo, le fil d'abord et l'outil ensuite. */
async function creerLeFilNeuf(){
  const n = filNeufEC;
  if(!n) return '';
  const moiNom = (typeof ACCES !== 'undefined' && ACCES.moniteur) || '';
  const corps = { action: 'convCreer', mode: 'discussion', titre: '' };
  if(n.cible.genre === 'eleve'){
    corps.genre = n.signature === 'bureau' ? 'bureau' : 'moniteur';
    corps.eleves = JSON.stringify([n.cible.nom]);
    corps.users = JSON.stringify([moiNom]);
    corps.avecBureau = n.signature === 'bureau' ? '1' : '';
  }else{
    corps.genre = 'interne';
    corps.eleves = JSON.stringify([]);
    corps.users = JSON.stringify([moiNom, n.cible.nom]);
    corps.avecBureau = '';
  }
  const d = await appelPrep(corps);
  return (d && d.id) || '';
}

async function envoyerDansLeFilNeuf(quoi){
  if(!filNeufEC) return;
  const champ = $('msgElvTexte');
  const bouton = $('msgElvEnvoyer');
  const texte = champ ? champ.value.trim() : '';
  if(texte.length > MAX_TEXTE_MESSAGERIE){
    if(typeof showToast === 'function') showToast('Message trop long (' + MAX_TEXTE_MESSAGERIE + ' caractères au plus).');
    return;
  }
  if(bouton) bouton.disabled = true;
  let id = '';
  try{
    id = await creerLeFilNeuf();
    if(!id) throw new Error('la conversation ne s’est pas ouverte');
    if(quoi === 'msgElvEnvoyer') await appelPrep({ action: 'convEcrire', id: id, texte: texte || '👍' });
  }catch(e){
    if(bouton) bouton.disabled = false;
    if(typeof showToast === 'function') showToast('Ce n’est pas parti : ' + ((e && e.message) || e));
    if(id){ filNeufEC = null; ckEcranAPart = false; conversationsEC = []; await ouvrirLeFil(id); }
    return;
  }
  filNeufEC = null;
  ckEcranAPart = false;
  conversationsEC = [];
  await ouvrirLeFil(id);
  afficherMessagerie(true);
  /* L'outil demandé, maintenant que le fil existe : sur la plupart
     des téléphones il s'ouvre tout seul ; sinon un second toucher. */
  if(quoi !== 'msgElvEnvoyer'){
    /* Les gestes du ＋ n'ont plus de bouton à l'écran une fois le
       panneau refermé : on les fait directement. */
    if(quoi.indexOf('msgPlus') === 0 && typeof faireLeGesteDuPlus === 'function'){
      faireLeGesteDuPlus(quoi);
    }else{
      const b = $(quoi);
      if(b) b.click();
    }
  }
}

/* ---------- 3 · « ✏️ Écrire à … » en tête de la recherche ---------- */

function blocEcrireA(mots){
  const gens = ciblesPour(mots).filter(c => c.genre !== 'groupe').slice(0, 3);
  if(!gens.length) return null;
  const b = document.createElement('div');
  b.id = 'ckpEcrireA';
  b.appendChild(sousTitreMessagerie('Écrire'));
  gens.forEach(c => {
    const d = document.createElement('div');
    d.className = 'ecrireALigne';
    d.style.cssText = 'display:flex;gap:11px;align-items:center;padding:10px 12px;margin:2px 8px 6px;' +
      'border:1px solid var(--orange);background:var(--orange-soft);border-radius:14px;' +
      'color:var(--on-accent);cursor:pointer;';
    d.innerHTML = '<div style="width:36px;height:36px;border-radius:12px;background:#fff;color:#0B0B0B;' +
      'display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex:0 0 auto;"></div>' +
      '<div style="flex:1;min-width:0;"><div style="font-weight:800;font-size:14px;"></div>' +
      '<div style="font-size:12px;opacity:.75;"></div></div>';
    d.firstChild.textContent = initialesDe(c.nom);
    d.children[1].firstChild.textContent = '✏️ Écrire à ' + c.nom;
    d.children[1].lastChild.textContent = sousTitreDeCible(c);
    d.addEventListener('click', () => {
      chercheMessagerie = '';
      ecrireA(c);
      if(typeof dessinerLaListeMessagerie === 'function' && ckLarge()) dessinerLaListeMessagerie();
    });
    b.appendChild(d);
  });
  return b;
}

/* Pendant la frappe : la ligne « ✏️ Écrire à … » se pose en tête,
   sans toucher au champ (un redessin lui ferait perdre la main). */
function majEcrireAPendantLaFrappe(mots){
  const zone = (typeof zoneListeMsg === 'function') ? zoneListeMsg() : null;
  if(!zone) return;
  const sc = zone.querySelector('.ckpScroll');
  if(!sc) return;
  const avant = sc.querySelector('#ckpEcrireA');
  if(avant) avant.remove();
  if(normaliserMessagerie(mots).length < 2 || !peutOuvrirUneConversation()) return;
  const bloc = blocEcrireA(mots);
  if(bloc) sc.insertBefore(bloc, sc.firstChild);
}

/* ---------- depuis le dossier : la bulle 💬 — v1153 ----------

   David, le 12 octobre : « la bulle en haut à côté du téléphone veut
   envoyer un SMS, il faut qu'elle ouvre la messagerie directement
   vers l'élève ». Le même geste que « À qui ? » quand on touche son
   nom : sa conversation si elle existe, sinon un fil neuf.

   ⚠️ ON ATTEND LA LISTE. Sans elle, on ne saurait pas qu'une
   conversation existe déjà, et on en ouvrirait une deuxième. La
   demande est posée ici, et c'est « afficherMessagerie » qui la
   reprend une fois la liste lue (poursuivreEcrireA). */
let ecrireAEnAttente = null;

function ecrireAEleveDansLaMessagerie(nom){
  if(!nom) return;
  ecrireAEnAttente = { genre: 'eleve', nom: nom };
  filNeufEC = null;
  if(typeof allerALaMessagerie === 'function') allerALaMessagerie('messagerie');
  if(typeof afficherMessagerie === 'function') afficherMessagerie(true);
}

/* 👤 v1155 — « Lui écrire seul », depuis le ⋯ d'un fil où le bureau
   est : la signature « Moi seul » d'office, et la conversation à deux
   si elle existe déjà. Rien n'est créé avant le premier message. */
function ecrireSeulA(nom){
  if(!nom) return;
  const cible = { genre: 'eleve', nom: nom };
  if(typeof ckFicheOuverte !== 'undefined') ckFicheOuverte = false;
  const deja = filExistantPour(cible, 'moi');
  if(deja){ ckEcranAPart = false; filNeufEC = null; return ouvrirLeFil(deja.id); }
  ouvrirLeFilNeuf(cible, 'moi');
}

function poursuivreEcrireA(){
  if(!ecrireAEnAttente) return;
  const c = ecrireAEnAttente;
  ecrireAEnAttente = null;
  ecrireA(c);
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-aqui.js'] = true;
