/* Déployé le 05/11/2026 à 08:55 — v1357 */
/* ============================================================
   ec-acces-etat.js — 🔑 L'ESPACE ÉLÈVE OUVERT À TOUS, ET QUI A
   REÇU SON ACCÈS

   David, le 5 novembre : « est-ce qu'on ne peut pas ouvrir à tous
   l'espace élève, et j'ai une indication de mon côté pour savoir
   s'ils ont reçu leur identifiant et mot de passe, de manière plus
   visible ». Ses réponses au schéma :
   · « tous » = les élèves qui ont une fiche, sans les partis ni ceux
     qui ont leur permis (pas les anciens) ;
   · un nouvel élève : son espace s'ouvre TOUT SEUL, selon sa
     formation — mais l'envoi de l'accès attend son appui ;
   · ce qu'on ouvre = « ⚙️ Ce qu'on ouvre par formation » ;
   · sans mail : « ✅ Je le lui ai donné » (pas de SMS) ;
   · pas de relance automatique ;
   · les accès d'avant : « 🟠 Accès pas envoyé », et le bouton dit
     qu'il l'a donné.

   Quatre états, les mêmes couleurs partout (répertoire, en-tête du
   dossier, carte 🔑 Coin révisions) :
   🔒 pas d'espace · 🟠 accès pas envoyé · ✉️ envoyé, pas encore venu ·
   ✅ venu. ⚠️ « Reçu » ne se sait pas : on sait qu'il est PARTI, et
   qu'il s'est CONNECTÉ — c'est la seule preuve qu'il l'a reçu.
   ⚠️ La messagerie de l'appli seule ne compte pas comme un envoi :
   il faut déjà son code pour la lire.

   Le Worker lit l'état (accesElevesList : envoi, sansEspace,
   nouveaux, auto), ouvre (accesOuvrir), note (accesEnvoiNoter) et
   règle « tout seul » (accesAutoRegler). Ce qu'on ouvre chez chacun
   est calculé ICI, par cvHabitudeDe (ec-coin-revisions.js).
   ============================================================ */

const ACCES_ETAT = { lu: 0, parNom: {}, sansEspace: [], nouveaux: [], auto: null, autoEteint: false, enCours: null };
let filtreAccesRepertoire = '';

function aeNorm(n){ return (typeof normaliserMot === 'function') ? normaliserMot(String(n || '')) : String(n || '').trim().toLowerCase(); }
function aeEch(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function aeVoit(){ return typeof aDroit !== 'function' || aDroit('acces_eleves'); }
function aeModifie(){ return typeof peutModifier !== 'function' || peutModifier('acces_eleves'); }

/* La liste des accès, relue au plus toutes les 30 s (sauf « force ») */
async function chargerEtatAcces(force){
  if(!aeVoit()) return ACCES_ETAT;
  if(!force && ACCES_ETAT.lu && Date.now() - ACCES_ETAT.lu < 30000) return ACCES_ETAT;
  if(ACCES_ETAT.enCours) return ACCES_ETAT.enCours;
  ACCES_ETAT.enCours = (async () => {
    try{
      const d = await appelPrep({ action: 'accesElevesList' });
      lireEtatAcces(d);
    }catch(e){ /* l'état attendra la prochaine lecture */ }
    finally{ ACCES_ETAT.enCours = null; }
    return ACCES_ETAT;
  })();
  return ACCES_ETAT.enCours;
}
/* Ce que rend accesElevesList — aussi appelée par les écrans qui la lisent déjà */
function lireEtatAcces(d){
  if(!d || !Array.isArray(d.acces)) return;
  ACCES_ETAT.parNom = {};
  d.acces.forEach(a => { ACCES_ETAT.parNom[aeNorm(a.eleve)] = a; });
  ACCES_ETAT.sansEspace = d.sansEspace || [];
  ACCES_ETAT.nouveaux = d.nouveaux || [];
  ACCES_ETAT.auto = d.auto || null;
  ACCES_ETAT.autoEteint = !!d.autoEteint;
  ACCES_ETAT.lu = Date.now();
  if(ACCES_ETAT.nouveaux.length) setTimeout(() => ouvrirLesNouveauxEspaces(), 0);
}

function aeDate(t, avecHeure){
  if(!t) return '';
  const d = new Date(Number(t));
  const j = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  return avecHeure ? j + ' à ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : j;
}
function aeVisite(v){
  /* « 03/11/2026 18:42 » → « 03/11 à 18:42 » */
  const m = String(v || '').match(/^(\d{2})\/(\d{2})\/\d{4}(?:\s+(\d{1,2}:\d{2}))?/);
  return m ? m[1] + '/' + m[2] + (m[3] ? ' à ' + m[3] : '') : String(v || '');
}
function aeComment(c){
  return String(c || '').split(',').filter(Boolean).map(x =>
    x === 'mail' ? '✉️ mail' : x === 'messagerie' ? '💬 messagerie' : x === 'main' ? '✋ donné à la main' : x).join(' · ');
}
/* Un envoi qui compte : par mail, ou donné à la main */
function aeEnvoiCompte(e){ return !!(e && /(^|,)(mail|main)(,|$)/.test(String(e.comment || ''))); }

/* L'état d'un élève — null quand il n'y a rien à dire (un ancien sans espace) */
function etatAccesDe(nom){
  const a = ACCES_ETAT.parNom[aeNorm(nom)];
  if(!a){
    if(!ACCES_ETAT.sansEspace.some(x => aeNorm(x.eleve) === aeNorm(nom))) return null;
    return { k: 'aucun', ico: '🔒', court: 'Pas d’espace', txt: 'Pas d’espace', coul: 'var(--muted)', bord: 'var(--line)' };
  }
  if(!a.actif) return { k: 'ferme', ico: '🚪', court: 'Espace fermé', txt: a.sorti === 'permis' ? 'Espace fermé (permis obtenu)' : 'Espace fermé',
                        coul: 'var(--muted)', bord: 'var(--line)', acces: a };
  if(a.derniereVisite) return { k: 'venu', ico: '✅', court: 'Espace : venu', txt: 'Venu le ' + aeVisite(a.derniereVisite),
                                coul: 'var(--accent-text)', bord: 'var(--orange)', acces: a };
  if(aeEnvoiCompte(a.envoi)){
    const main = !/(^|,)mail(,|$)/.test(a.envoi.comment);
    return { k: 'envoye', ico: main ? '✋' : '✉️', court: main ? 'Accès donné, pas venu' : 'Accès envoyé, pas venu',
             txt: (main ? 'Accès donné le ' : 'Accès envoyé le ') + aeDate(a.envoi.le) + ' · pas encore venu',
             coul: 'var(--bleu)', bord: 'var(--bleu)', acces: a };
  }
  return { k: 'pas', ico: '🟠', court: 'Accès pas envoyé', txt: 'Accès pas envoyé', coul: 'var(--ambre)', bord: 'var(--ambre)', acces: a };
}

/* ── ✉️ / ✋ noter un envoi ── */
async function noterEnvoiAcces(nom, comment){
  try{
    const r = await appelPrep({ action: 'accesEnvoiNoter', eleve: nom, comment: comment });
    const a = ACCES_ETAT.parNom[aeNorm(nom)];
    if(a && r && r.envoi) a.envoi = r.envoi;
    rafraichirPastilleAcces();
    return r && r.envoi;
  }catch(e){ return null; }
}
async function jeLuiAiDonne(nom, apres){
  if(!await confirmer('Noter que tu as donné son accès à ' + nom + ' ?\n\n(Messenger, SMS de ton téléphone, de vive voix…)', '✋ Je le lui ai donné')) return;
  const e = await noterEnvoiAcces(nom, 'main');
  if(!e){ showToast('Pas noté : réessaie.'); return; }
  showToast('Noté : accès donné ✅');
  if(apres) apres();
}

/* ── la pastille de l'en-tête du dossier ── */
function pastilleAccesEleve(nom){
  if(!aeVoit()) return null;
  const p = document.createElement('button');
  p.type = 'button';
  p.className = 'btn btn-secondary aePastille';
  p.style.display = 'none';
  p.title = 'Son espace élève — ouvrir 🔑 Coin révisions';
  p.addEventListener('click', () => {
    if(typeof ongletPageEleve !== 'undefined'){
      ongletPageEleve = 'acces';
      try{ localStorage.setItem('onglet_page_eleve', 'acces'); }catch(e){}
      if(typeof dessinerPageEleve === 'function') dessinerPageEleve();
    }
  });
  const remplir = () => {
    const s = etatAccesDe(nom);
    if(!s){ p.style.display = 'none'; return; }
    p.style.display = '';
    p.style.color = s.coul;
    p.style.borderColor = s.bord;
    p.textContent = '🔑 ' + s.ico + ' ' + s.court;
  };
  if(ACCES_ETAT.lu) remplir();
  chargerEtatAcces().then(remplir);
  p._remplir = remplir;
  return p;
}
function rafraichirPastilleAcces(){
  document.querySelectorAll('.aePastille').forEach(p => { if(p._remplir) p._remplir(); });
}

/* ── le suivi, dans la carte 🔑 Coin révisions ── */
function suiviAccesCarte(nom, acces, apres){
  const a = ACCES_ETAT.parNom[aeNorm(nom)] || acces || {};
  const e = (ACCES_ETAT.parNom[aeNorm(nom)] || {}).envoi || (acces && acces.envoi) || null;
  const z = document.createElement('div');
  z.className = 'aeSuivi';
  const ligne = (cls, i, html) => '<div class="aeEt ' + cls + '"><span class="i">' + i + '</span><div class="x">' + html + '</div></div>';
  const ouvert = String(a.creeLe || '').split(' ')[0];
  let h = ligne('', '✅', '<b>Espace ouvert</b><small>' + (ouvert ? 'le ' + aeEch(ouvert) : '') + '</small>');
  const compte = aeEnvoiCompte(e);
  if(compte){
    h += ligne('', '✅', '<b>' + (/(^|,)mail(,|$)/.test(e.comment) ? 'Accès envoyé' : 'Accès donné') + '</b> — son nom + son code' +
      '<small>le ' + aeDate(e.le, true) + (e.par ? ' par ' + aeEch(e.par) : '') + ' · ' + aeEch(aeComment(e.comment)) + '</small>');
  }else{
    h += ligne('attente', '🟠', '<b>Accès pas encore envoyé</b>' +
      '<small>il ne peut pas entrer : il n’a ni son nom de connexion ni son code' +
      (e && e.comment ? ' (parti seulement dans sa messagerie le ' + aeDate(e.le) + ' : il faut déjà son code pour la lire)' : '') + '</small>');
  }
  if(a.derniereVisite){
    h += ligne('', '✅', '<b>Il est venu</b><small>dernière visite le ' + aeEch(aeVisite(a.derniereVisite)) + '</small>');
  }else{
    const jours = compte ? Math.floor((Date.now() - Number(e.le || Date.now())) / 86400000) : 0;
    h += ligne('attente gris', '⏳', '<b>Pas encore venu</b>' + (jours >= 1 ? ' <span class="depuis">· depuis ' + jours + ' jour' + (jours > 1 ? 's' : '') + '</span>' : '') +
      '<small>dès sa première connexion, cette ligne passe au vert</small>');
  }
  z.innerHTML = h;
  if(!compte && aeModifie()){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cvLien';
    b.dataset.donne = '1';
    b.textContent = '✋ Je le lui ai donné (Messenger, de vive voix…)';
    b.addEventListener('click', () => jeLuiAiDonne(nom, apres));
    z.appendChild(b);
  }
  return { el: z, envoye: compte };
}

/* ── le répertoire : le cadre, les filtres, la pastille de chaque ligne ── */
function badgeAccesLigne(nom){
  if(!aeVoit()) return null;
  const s = etatAccesDe(nom);
  if(!s) return null;
  const b = document.createElement('div');
  b.innerHTML = '<span class="aeBadge" style="color:' + s.coul + ';border-color:' + s.bord + '">🔑 ' + s.ico + ' ' + aeEch(s.txt) + '</span>';
  return b;
}
function filtreAccesPasse(nom){
  if(!filtreAccesRepertoire) return true;
  const s = etatAccesDe(nom);
  return !!s && s.k === filtreAccesRepertoire;
}
function cadreAccesRepertoire(noms, redessiner){
  if(!aeVoit()) return null;
  if(typeof cvStyle === 'function') cvStyle();
  const z = document.createElement('div');
  z.className = 'aeCadre';
  const compte = k => noms.filter(n => { const s = etatAccesDe(n); return s && s.k === k; }).length;
  const puces = [['', 'Tous', noms.length], ['aucun', '🔒 Pas d’espace', compte('aucun')], ['pas', '🟠 Accès pas envoyé', compte('pas')],
                 ['envoye', '✉️ Envoyé, pas encore venu', compte('envoye')], ['venu', '✅ Venu', compte('venu')]];
  z.innerHTML = '<div class="t">🔑 Leur espace élève</div><div class="aePuces"></div>';
  const zp = z.querySelector('.aePuces');
  puces.forEach(([k, t, n]) => {
    if(k && !n && filtreAccesRepertoire !== k) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'aePuce' + (filtreAccesRepertoire === k ? ' on' : '');
    b.innerHTML = aeEch(t) + '<b>' + n + '</b>';
    b.dataset.filtre = k;
    b.addEventListener('click', () => { filtreAccesRepertoire = k; redessiner(); });
    zp.appendChild(b);
  });
  const sans = ACCES_ETAT.sansEspace.length;
  if(sans && aeModifie()){
    const bo = document.createElement('button');
    bo.className = 'btn btn-primary';
    bo.dataset.ouvrirTous = '1';
    bo.style.cssText = 'margin:0;padding:11px;font-size:13px;';
    bo.textContent = '🔓 Ouvrir l’espace à tous ceux qui n’en ont pas (' + sans + ')';
    bo.addEventListener('click', () => fenetreOuvrirATous(redessiner));
    z.appendChild(bo);
  }
  if(aeModifie()){
    const l = document.createElement('div');
    l.className = 'aeAuto';
    const a = ACCES_ETAT.auto;
    l.innerHTML = '🔁 Nouveaux élèves : ' + (a ? 'leur espace s’ouvre tout seul (depuis le ' + aeEch(aeDate(a.le)) + ')' : 'leur espace ne s’ouvre pas tout seul') + ' · ';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cvLien';
    b.textContent = a ? 'arrêter' : 'l’allumer';
    b.addEventListener('click', async () => {
      b.disabled = true;
      try{
        const r = await appelPrep({ action: 'accesAutoRegler', auto: a ? 0 : 1 });
        ACCES_ETAT.auto = (r && r.auto) || null;
        showToast(ACCES_ETAT.auto ? '🔁 Les nouveaux élèves auront leur espace tout seuls ✅' : '🔁 Arrêté ✅');
        await chargerEtatAcces(true);
        redessiner();
      }catch(e){ showToast('Impossible : ' + e.message); b.disabled = false; }
    });
    l.appendChild(b);
    z.appendChild(l);
  }
  return z;
}

/* ── ce qu'on ouvre chez chacun : l'habitude de sa formation ── */
async function aeHabitudes(){
  if(typeof chargerModelesTexte === 'function'){ try{ await chargerModelesTexte(); }catch(e){} }
  let groupes = [], prog = { groupes: [], regles: {} };
  try{
    const d = await appelPrep({ action: 'parcoursList' });
    groupes = (d && d.groupes) || [];
    prog = (d && d.salle) || prog;
  }catch(e){}
  return { groupes: groupes, prog: prog };
}
function aeAOuvrir(nom, formation, H){
  const h = cvHabitudeDe(formation, H.groupes, H.prog);
  const E = { mods: h.modules.slice(), q: h.q, groupes: h.groupes.slice(), autres: [] };
  return { eleve: nom, modules: cvListeModules(E), groupes: E.groupes.join('|'), E: E };
}
function aeResume(E, H){
  const mods = CV_TUILES.filter(t => !t.fixe && t.cle !== 'questionnaire' && E.mods.indexOf(t.cle) !== -1).map(t => t.i + ' ' + t.t.toLowerCase().replace(/^ses |^son |^l’/, ''));
  const gs = H.groupes.filter(g => E.groupes.indexOf(g.id) !== -1).map(g => g.nom);
  return mods.concat(['💬 messagerie']).concat(E.q ? ['📋 questionnaire'] : []).join(' · ') +
    (gs.length ? ' · 🧩 ' + gs.join(', ') : '');
}

/* ── 🔓 la fenêtre « Ouvrir l'espace à tous » ── */
async function fenetreOuvrirATous(apres){
  if(!aeModifie()){ showToast('Ouvrir des espaces demande le droit 🔑 Accès à l’espace élève (codes).'); return; }
  const W = cvBoite('🔓 Ouvrir l’espace à tous', true);
  const corps = document.createElement('div');
  corps.innerHTML = '<div style="font-size:13px;color:var(--muted);">Lecture…</div>';
  W.boite.appendChild(corps);
  const bas = document.createElement('div');
  bas.className = 'btn-row';
  bas.style.marginTop = '12px';
  W.boite.appendChild(bas);
  await chargerEtatAcces(true);
  const H = await aeHabitudes();
  if(typeof chargerFiches === 'function' && (typeof fichesEleves === 'undefined' || !fichesEleves.length)){ try{ await chargerFiches(); }catch(e){} }
  const sans = ACCES_ETAT.sansEspace.slice().sort((a, b) => String(a.eleve).localeCompare(String(b.eleve), 'fr'));
  if(!sans.length){
    corps.innerHTML = '<div style="font-size:13.5px;line-height:1.5;">✅ Tous les élèves en formation ont déjà leur espace.</div>';
    bas.appendChild(cvBouton('Fermer', 'btn-secondary', W.fermer));
    return;
  }
  const coches = {};
  sans.forEach(x => { coches[x.eleve] = true; });
  corps.innerHTML =
    '<div style="font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:6px">' + sans.length + ' élève' + (sans.length > 1 ? 's' : '') +
      ' en formation n’' + (sans.length > 1 ? 'ont' : 'a') + ' pas encore d’espace. Chacun reçoit ce qu’on ouvre d’habitude pour sa formation ' +
      '(⚙️ Ce qu’on ouvre par formation) ; ça se change ensuite dans son dossier.</div>' +
    '<div class="aeRacc"></div><div class="aeListe"></div>' +
    '<label class="cvCoche" style="margin-top:12px"><input type="checkbox" id="aeMail" checked><span>✉️ Leur envoyer leur accès tout de suite, par mail (nom + code + ce qui est ouvert)</span></label>' +
    '<label class="cvCoche"><input type="checkbox" id="aeAuto"' + (ACCES_ETAT.autoEteint && !ACCES_ETAT.auto ? '' : ' checked') + '><span>🔁 Désormais, ouvrir l’espace tout seul à chaque nouvel élève <span style="color:var(--muted)">(l’accès, lui, attend ton appui)</span></span></label>' +
    '<div style="font-size:11.5px;color:var(--muted);line-height:1.5;margin-top:8px">Les élèves partis ou qui ont leur permis ne sont pas comptés. Chaque envoi est noté : il apparaît dans le répertoire et dans son dossier.</div>' +
    '<div class="cvEtat" id="aeEtat"></div>';
  const liste = corps.querySelector('.aeListe');
  const plans = {};
  sans.forEach(x => {
    const f = (typeof ficheDe === 'function' ? ficheDe(x.eleve) : null) || {};
    const formation = String(f.formation || x.formation || '').trim();
    const mail = String(f.email || x.email || '').trim().split(/[,;\s]+/)[0];
    plans[x.eleve] = Object.assign(aeAOuvrir(x.eleve, formation, H), { mail: mail, formation: formation });
    const lab = document.createElement('label');
    lab.className = 'aeLigne';
    lab.innerHTML = '<input type="checkbox" checked><span class="x"><b>' + aeEch(x.eleve) + '</b> · ' + aeEch(formation || 'pas de formation') +
      '<small>' + aeEch(aeResume(plans[x.eleve].E, H)) + '</small>' +
      (mail ? '<small>✉️ ' + aeEch(mail) + '</small>' : '<small class="sans">⚠️ pas d’adresse mail : son accès est à lui donner autrement, puis « ✋ Je le lui ai donné » dans son dossier</small>') +
      '</span>';
    lab.querySelector('input').addEventListener('change', ev => { coches[x.eleve] = ev.target.checked; majBouton(); });
    liste.appendChild(lab);
  });
  const racc = corps.querySelector('.aeRacc');
  const bTout = cvBouton('Tout décocher', 'btn-secondary', () => {
    const tous = Object.keys(coches).every(k => coches[k]);
    liste.querySelectorAll('input').forEach(i => { i.checked = !tous; });
    Object.keys(coches).forEach(k => { coches[k] = !tous; });
    bTout.textContent = tous ? 'Tout cocher' : 'Tout décocher';
    majBouton();
  });
  bTout.style.cssText = 'width:auto;margin:0 0 6px;padding:7px 11px;font-size:12px;';
  racc.appendChild(bTout);
  const chMail = corps.querySelector('#aeMail');
  const chAuto = corps.querySelector('#aeAuto');
  const etat = corps.querySelector('#aeEtat');
  bas.appendChild(cvBouton('Annuler', 'btn-secondary', W.fermer));
  const bOk = cvBouton('', 'btn-primary');
  bOk.dataset.ouvrir = '1';
  bas.appendChild(bOk);
  const choisis = () => sans.filter(x => coches[x.eleve]).map(x => plans[x.eleve]);
  function majBouton(){
    const l = choisis();
    const m = chMail.checked ? l.filter(p => p.mail).length : 0;
    bOk.disabled = !l.length;
    bOk.textContent = '🔓 Ouvrir ' + l.length + ' espace' + (l.length > 1 ? 's' : '') + (m ? ' · envoyer ' + m + ' mail' + (m > 1 ? 's' : '') : '');
  }
  chMail.addEventListener('change', majBouton);
  majBouton();

  bOk.addEventListener('click', async () => {
    if(bOk.disabled) return;
    const l = choisis();
    if(!l.length) return;
    bOk.disabled = true;
    const dire = (t, rouge) => { etat.style.color = rouge ? 'var(--red)' : 'var(--muted)'; etat.textContent = t; };
    dire('⏳ Ouverture de ' + l.length + ' espace' + (l.length > 1 ? 's' : '') + '…');
    let r;
    try{
      if(chAuto.checked !== !!ACCES_ETAT.auto){
        const ra = await appelPrep({ action: 'accesAutoRegler', auto: chAuto.checked ? 1 : 0 });
        ACCES_ETAT.auto = (ra && ra.auto) || null;
      }
      r = await appelPrep({ action: 'accesOuvrir', eleves: l.map(p => ({ eleve: p.eleve, modules: p.modules, groupes: p.groupes })) });
      if(r && r.status === 'error') throw new Error(r.message || 'refusé');
    }catch(e){ dire('❌ ' + e.message, true); bOk.disabled = false; return; }
    const ouverts = (r && r.ouverts) || [];
    (ouverts || []).forEach(o => { if(typeof retenirCodeEleve === 'function') retenirCodeEleve(o.eleve, o.code); });
    let mails = 0, rates = [];
    if(chMail.checked){
      const aEnvoyer = ouverts.filter(o => plans[o.eleve] && plans[o.eleve].mail);
      for(let i = 0; i < aEnvoyer.length; i++){
        const o = aEnvoyer[i], p = plans[o.eleve];
        dire('✉️ ' + (i + 1) + ' / ' + aEnvoyer.length + ' — ' + o.eleve + '…');
        try{
          const texte = cvTexteAcces({ nom: o.eleve, code: o.code, E: p.E, groupes: H.groupes, prog: H.prog, salleFinie: false });
          await appelPrep({ action: 'mailBilan', genre: 'acces', eleve: o.eleve, to: [p.mail],
                            sujet: 'Ton espace révisions — Évolution Conduites', texte: texte });
          await noterEnvoiAcces(o.eleve, 'mail');
          mails++;
        }catch(e){ rates.push(o.eleve + ' : ' + e.message); }
      }
    }
    await chargerEtatAcces(true);
    rafraichirPastilleAcces();
    W.fermer();
    showToast('🔓 ' + ouverts.length + ' espace' + (ouverts.length > 1 ? 's' : '') + ' ouvert' + (ouverts.length > 1 ? 's' : '') +
              (chMail.checked ? ' · ✉️ ' + mails + ' mail' + (mails > 1 ? 's' : '') : '') +
              (rates.length ? ' · ⚠️ pas parti : ' + rates.join(' ; ') : '') + ' ✅');
    if(apres) apres();
  });
}

/* ── 🔁 les nouveaux élèves : leur espace s'ouvre tout seul ──
   Le Worker dit qui (« nouveaux » : une fiche ajoutée depuis que c'est
   allumé, jamais ouverte) ; l'écran calcule ce qu'on ouvre et demande.
   Le Worker réserve chaque nom avant d'écrire : deux écrans ouverts en
   même temps n'ouvrent pas deux fois. L'accès, lui, n'est PAS envoyé. */
let aeOuvertureEnCours = false;
async function ouvrirLesNouveauxEspaces(){
  if(aeOuvertureEnCours || !aeModifie() || !ACCES_ETAT.nouveaux.length) return;
  if(typeof cvHabitudeDe !== 'function') return;
  aeOuvertureEnCours = true;
  try{
    const H = await aeHabitudes();
    if(typeof chargerFiches === 'function' && (typeof fichesEleves === 'undefined' || !fichesEleves.length)){ try{ await chargerFiches(); }catch(e){} }
    const l = ACCES_ETAT.nouveaux.map(nom => {
      const f = (typeof ficheDe === 'function' ? ficheDe(nom) : null) || {};
      const x = ACCES_ETAT.sansEspace.find(s => aeNorm(s.eleve) === aeNorm(nom)) || {};
      const p = aeAOuvrir(nom, String(f.formation || x.formation || '').trim(), H);
      return { eleve: p.eleve, modules: p.modules, groupes: p.groupes };
    });
    const r = await appelPrep({ action: 'accesOuvrir', auto: 1, eleves: l });
    ACCES_ETAT.nouveaux = [];
    if(r && r.ouverts && r.ouverts.length){
      r.ouverts.forEach(o => { if(typeof retenirCodeEleve === 'function') retenirCodeEleve(o.eleve, o.code); });
      ACCES_ETAT.lu = 0;
      await chargerEtatAcces(true);
      rafraichirPastilleAcces();
    }
  }catch(e){ /* la prochaine lecture réessaiera */ }
  finally{ aeOuvertureEnCours = false; }
}
/* Au démarrage, puis toutes les vingt minutes : qui peut ouvrir regarde */
let aeMinuteur = 0;
function veillerLesNouveauxEspaces(){
  if(!aeModifie()) return;
  chargerEtatAcces(true);
  if(aeMinuteur) return;
  aeMinuteur = setInterval(() => { if(!document.hidden) chargerEtatAcces(true); }, 1200000);
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-acces-etat.js'] = true;
