/* Déployé le 21/11/2026 à 11:42 — v1526 */
/* ============================================================
   ec-drivup-ext.js — 📥 DRIVUP DANS L'APP (avec l'extension)

   David, le 21 novembre : « intégrer Drivup dans l'app […] comme si les
   2 ne faisaient plus qu'un » ; ses choix (schéma « Drivup dans l'App ») :
   · une extension « App EC · Drivup » (Chrome en fichier à charger soi-
     même, Firefox) qui lit Drivup en arrière-plan, avec la session
     Drivup du navigateur — personne ne retape son mot de passe ;
   · Drivup dans l'App : un onglet « Drivup » en haut, ET un panneau à
     côté du dossier de l'élève ;
   · un cours déplacé ou annulé dans Drivup : personne n'est prévenu, il
     est seulement dans « 🔔 Du nouveau dans Drivup » ;
   · les nouvelles notes internes rangées seules dans 🗂️ Administratif ;
   · « que je puisse changer les timings de relecture directement dans
     l'app » : Gestion › 📥 Drivup › ⏱️ Les rythmes ;
   · « que ça mette à jour l'affichage s'il y a un changement de cours
     dans la journée » : fait par le Worker à chaque lecture.

   Ce module : la conversation avec l'extension (par pont.js, posé dans
   cette page), Gestion › 📥 Drivup, l'onglet Drivup, le panneau du
   dossier. La lecture elle-même s'enregistre comme celle du favori
   (lectureDeVeilleDrivup, ec-drivup.js).
   ============================================================ */

const EXT_DV = { present: false, version: '', reglages: null, poste: '', etat: null };
function extDrivupPresente(){
  if(EXT_DV.present || document.documentElement.hasAttribute('data-ec-ext-drivup')) return true;
  /* v1526 — l'App ouverte « à côté » (dans un cadre de l'App) : l'extension est dans la page autour */
  try{ return window.parent !== window && !!(window.parent.EXT_DV && window.parent.EXT_DV.present); }catch(e){ return false; }
}
function versExtDrivup(m){ window.postMessage(Object.assign({ ecVersExt: 1 }, m), location.origin); }
function repondreExtDrivup(id, m){ window.postMessage(Object.assign({ ecVersExt: 1, reponseA: id }, m), location.origin); }

/* ---------- ce que l'extension demande à la page ---------- */
window.addEventListener('message', ev => {
  if(ev.source !== window || ev.origin !== location.origin || !ev.data || ev.data.ecExt !== 1) return;
  const d = ev.data;
  if(d.type === 'ext-pret'){
    const nouveau = !EXT_DV.present;
    EXT_DV.present = true;
    EXT_DV.version = String(d.version || '');
    if(nouveau && typeof majOngletsVisibles === 'function'){ try{ majOngletsVisibles(); }catch(e){} }
    return;
  }
  if(!d.demandeId) return;
  traiterDemandeExtDrivup(d).then(r => repondreExtDrivup(d.demandeId, r || {}),
    e => repondreExtDrivup(d.demandeId, { ok: false, erreur: (e && e.message) || String(e) }));
});

async function traiterDemandeExtDrivup(d){
  const pret = !!(typeof ACCES !== 'undefined' && ACCES && ACCES.code) && typeof peutLireDrivup === 'function' && peutLireDrivup();
  if(d.type === 'pret?') return { ok: pret };
  if(!pret) return { ok: false, erreur: 'Personne n’est connecté à l’App dans cet onglet.' };
  if(d.type === 'jeton?'){
    EXT_DV.poste = String(d.poste || '');
    const r = await appelPrep({ action: 'drivupJeton', poste: d.poste, navigateur: d.navigateur, version: d.version,
                                drivup: d.drivup, lecture: d.lecture || null });
    if(r && r.reglages) EXT_DV.reglages = r.reglages;
    return { ok: !!(r && r.ok), lecteur: r && r.lecteur, reglages: r && r.reglages };
  }
  if(d.type === 'drivup-etat'){
    EXT_DV.etat = d;
    if(EXT_DV.poste) appelPrep({ action: 'drivupPoste', poste: EXT_DV.poste, drivup: d.drivup || 'inconnu' }).catch(() => {});
    return { ok: true };
  }
  if(d.type === 'drivup-donnees'){
    if(typeof lectureDeVeilleDrivup !== 'function') return { ok: false, erreur: 'module Drivup absent' };
    await lectureDeVeilleDrivup(d.paquet, true);
    /* le bilan du jour, pour Gestion › 📥 Drivup */
    const p = d.paquet || {}, jl = (typeof VEILLE_DV !== 'undefined' && VEILLE_DV.journal) || {};
    if(EXT_DV.poste && Array.isArray(p.cours)){
      try{
        await appelPrep({ action: 'drivupPoste', poste: EXT_DV.poste, drivup: 'ok',
                          bilan: { passe: p.passe, pages: p.pages || 0, cours: p.cours.length, rouverts: p.cours.length - (p.detailsGardes || 0),
                                   changes: jl.changes || 0, fiches: jl.fiches || 0, notes: jl.notes || 0 } });
        apresLectureExtDrivup();
      }catch(e){ /* le bilan manquera, la lecture est enregistrée */ }
    }
    return { ok: true, erreur: (typeof VEILLE_DV !== 'undefined' && VEILLE_DV.erreurIci) || '' };
  }
  return { ok: false };
}
/* La lecture vient d'être enregistrée : Gestion › 📥 Drivup se rafraîchit s'il est à l'écran */
function apresLectureExtDrivup(){
  const z = $('drivupGestionZone');
  if(z && z.offsetParent) afficherDrivupGestion(true);
}

/* ============================================================
   GESTION › 📥 DRIVUP — trois cartes, comme le schéma « Drivup dans
   l'App » : 📥 Drivup dans l'App (les connexions de l'équipe),
   ⏱️ Ce qui est lu, et quand (avec ✏️ pour changer les rythmes),
   🔔 Du nouveau dans Drivup.
   ============================================================ */
const DV_NOUV = { filtre: 'tout', donnees: null, etat: null, rythmesOuverts: false };
const SORTES_DV = {
  cours_neuf:   { puce: '🆕 Nouveau cours', cls: 'neuf',   famille: 'planning' },
  cours_bouge:  { puce: '🕐 Déplacé',       cls: 'bouge',  famille: 'planning' },
  cours_annule: { puce: '✖️ Annulé',        cls: 'annule', famille: 'planning' },
  affichage:    { puce: '📺 Affichage',     cls: 'bouge',  famille: 'planning' },
  note:         { puce: '📝 Note interne',  cls: 'neuf',   famille: 'notes' },
  neph:         { puce: '🆔 NEPH arrivé',   cls: 'neuf',   famille: 'neph' },
  mandat:       { puce: '✅ Mandat pris',   cls: 'neuf',   famille: 'mandats' },
  ecoute_ouverte:   { puce: '👂 Écoute ouverte',   cls: 'neuf',   famille: 'ecoutes' },
  ecoute_supprimee: { puce: '👂 Écoute supprimée', cls: 'annule', famille: 'ecoutes' },
  dossier:      { puce: '🆕 Dossier créé',  cls: 'neuf',   famille: 'dossiers' }
};
const FAMILLES_DV = [['planning', '📆', 'Planning'], ['notes', '📝', 'Notes'], ['neph', '🆔', 'NEPH'], ['mandats', '✅', 'Mandats'], ['ecoutes', '👂', 'Écoutes'], ['dossiers', '🆕', 'Dossiers']];
const JOURS_DV = [[1, 'Lun'], [2, 'Mar'], [3, 'Mer'], [4, 'Jeu'], [5, 'Ven'], [6, 'Sam'], [0, 'Dim']];
/* la flèche verte des titres (le glyphe « drivup » de ec-verre.js) */
const GLYPHE_DV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M12 3.5v10.5"/><path d="M7.5 9.5 12 14l4.5-4.5"/><path d="M4.5 15.5v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2.5"/></svg>';

function elDv(tag, cls, txt){ const e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }
function heureDv(t){ return t ? new Date(Number(t)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).replace(':', 'h') : '—'; }
function ilYADv(t){
  if(!t) return 'jamais';
  const m = Math.round((Date.now() - Number(t)) / 60000);
  if(m < 1) return 'à l’instant';
  if(m < 60) return 'il y a ' + m + ' min';
  if(m < 1440) return 'il y a ' + Math.round(m / 60) + ' h';
  return 'il y a ' + Math.round(m / 1440) + ' j';
}
function dureeDv(min){
  min = Number(min) || 0;
  if(min < 60) return min + ' min';
  const h = Math.floor(min / 60), r = min % 60;
  return h + ' h' + (r ? ' ' + String(r).padStart(2, '0') : '');
}
/* une ligne : l'heure (ou le rythme), le rond, le nom et sa phrase, la pastille */
function ligneDv(h, rond, titre, sous, etat, puce, etatLigne){
  const l = elDv('div', 'dvL ' + (etatLigne != null ? etatLigne : (etat || '')));
  const hh = elDv('span', 'dvH', h);
  const q = elDv('span', 'dvQui');
  q.append(elDv('b', '', titre), elDv('span', '', sous));
  if(window.innerWidth < 500){
    /* au téléphone : la pastille passe sous le nom (le schéma) */
    const et = elDv('div', 'dvEt ' + (etat || ''), puce);
    et.style.cssText = 'display:block;width:fit-content;margin:4px 0 5px;';
    q.insertBefore(et, q.children[1]);
    hh.style.minWidth = '46px';
    l.append(hh, rond, q);
  }else l.append(hh, rond, q, elDv('span', 'dvEt ' + (etat || ''), puce));
  return l;
}
function rondTexteDv(t){ const r = elDv('span', 'ligneEleveRond', t); r.style.fontSize = '17px'; return r; }
function carteDv(zone, emo, titre, desc){
  const c = elDv('div', 'card dvCarte');
  const h = elDv('h2', 'section-title');
  const e = elDv('span', 'emo', emo + ' ');
  const v = elDv('span', 'vgl');
  v.style.setProperty('--c', '#16A34A');
  v.innerHTML = GLYPHE_DV;
  h.append(e, v, document.createTextNode(titre));
  h.setAttribute('data-verre', '1');
  c.append(h, elDv('div', 'dvCarteD', desc));
  zone.appendChild(c);
  return c;
}
function noteDv(t){ const n = elDv('div', 'dvNote', t); n.style.margin = '6px 0 2px'; return n; }

async function afficherDrivupGestion(silencieux){
  const z = $('drivupGestionZone');
  if(!z) return;
  if(!silencieux) z.innerHTML = '<div class="card"><div class="empty">Lecture…</div></div>';
  let etat, nouv;
  try{
    [etat, nouv] = await Promise.all([appelPrep({ action: 'drivupEtat' }), appelPrep({ action: 'drivupNouveau', jours: 14 })]);
  }catch(e){
    z.innerHTML = '';
    const c = elDv('div', 'card');
    c.appendChild(elDv('div', 'dvNote', '⚠️ ' + ((e && e.message) || e)));
    z.appendChild(c);
    return;
  }
  DV_NOUV.etat = etat; DV_NOUV.donnees = (nouv && nouv.nouveau) || [];
  dessinerDrivupGestion();
}
function dessinerDrivupGestion(){
  const z = $('drivupGestionZone');
  if(!z || !DV_NOUV.etat) return;
  z.innerHTML = '';
  dessinerConnexionsDv(z, DV_NOUV.etat);
  dessinerRythmesDv(z, DV_NOUV.etat);
  dessinerEcoutesDv(z, DV_NOUV.etat);
  dessinerNouveauDv(z);
}

/* ---------- 👂 v1524 — les écoutes pédagogiques ----------
   David, le 21 novembre : l'extension ouvre et supprime les écoutes ;
   « une liste à valider avec une option pour qu'elle le fasse toute
   seule » ; supprimer seulement les vides, qui ne servent plus aucun
   cours, jamais un « NON » ; 2h + 2h à la suite, même moniteur, même
   élève : une écoute de 4h. */
function dessinerEcoutesDv(z, etat){
  const reg = etat.reglages || {}, r = reg.rythmes || {}, auj = etat.aujourdhui || {};
  const c = carteDv(z, '👂', 'Les écoutes pédagogiques', 'Une écoute par cours de conduite de 2h et plus (et l’examen blanc), dans la 1re colonne libre : BEA ou BV à Saint-Brieuc, « Ecoute » à Loudéac. ' +
    '2h + 2h à la suite avec le même moniteur et le même élève : une seule écoute de 4h. Les écoutes vides, à venir, qui ne servent plus aucun cours se suppriment — jamais un « NON », jamais une écoute où un élève est inscrit.');
  const puces = elDv('div', 'dvPuces');
  puces.append(puceDrivup('neuf', auj.ecoute_ouverte || 0, 'ouvertes aujourd’hui'), puceDrivup('annule', auj.ecoute_supprimee || 0, 'supprimées aujourd’hui'));
  c.appendChild(puces);
  const auto = !!reg.ecoutesAuto;
  c.appendChild(ligneDv(auto ? dureeDv(r.complet || 60) : 'à la main', rondTexteDv('🤖'), 'Toute seule',
    auto ? 'À chaque lecture complète, l’extension ouvre ce qui serait coché dans la liste' + (reg.suppressionVerifiee ? ' et supprime les écoutes vides' : ' (elle supprimera dès qu’une première suppression aura été faite à la main et vérifiée)')
         : 'Éteint : on ouvre la liste, on coche, on valide',
    auto ? 'neuf' : 'ignore', auto ? '✅ Allumé' : '— Éteint'));
  if(!reg.suppressionVerifiee) c.appendChild(noteDv('🗑️ La toute première suppression se fait depuis la liste, une seule écoute : l’App vérifie dans Drivup qu’elle a disparu. Ensuite seulement, le mode « toute seule » supprime aussi.'));
  const bas = elDv('div', 'btn-row');
  bas.style.cssText = 'margin-top:10px;flex-wrap:wrap;gap:8px;';
  const voir = elDv('button', 'btn btn-primary', '👂 Écoutes à ouvrir et à supprimer');
  voir.type = 'button'; voir.style.cssText = 'width:auto;flex:0 0 auto;';
  voir.disabled = !extDrivupPresente();
  if(!extDrivupPresente()) voir.title = 'Il faut l’extension « App EC · Drivup » sur cet ordinateur';
  voir.addEventListener('click', () => {
    if(typeof fenetreEcoutesDrivup === 'function') fenetreEcoutesDrivup(new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }));
  });
  bas.appendChild(voir);
  if(etat.estAdmin){
    const bascule = elDv('button', 'btn btn-secondary', auto ? '⏸️ Éteindre « toute seule »' : '🤖 Allumer « toute seule »');
    bascule.type = 'button'; bascule.style.cssText = 'width:auto;flex:0 0 auto;';
    bascule.addEventListener('click', async () => {
      bascule.disabled = true;
      try{
        const rep = await appelPrep({ action: 'drivupReglagesPoser', ecoutesAuto: !auto });
        DV_NOUV.etat.reglages = rep.reglages;
        EXT_DV.reglages = rep.reglages;
        dessinerDrivupGestion();
      }catch(e){ bascule.disabled = false; if(typeof showToast === 'function') showToast('⚠️ ' + ((e && e.message) || e)); }
    });
    bas.appendChild(bascule);
  }
  c.appendChild(bas);
}

/* ---------- 📥 Drivup dans l'App ---------- */
function dessinerConnexionsDv(z, etat){
  const c = carteDv(z, '📥', 'Drivup dans l’App', 'Drivup est lu en arrière-plan par l’extension « App EC · Drivup » du navigateur, avec la connexion Drivup de la personne. Personne ne tape son mot de passe dans l’App.');
  const j = etat.jour || {};
  const puces = elDv('div', 'dvPuces');
  puces.append(puceDrivup('', j.pages || 0, 'pages Drivup lues aujourd’hui'));
  if(j.cours) puces.append(puceDrivup('neuf', Math.round(100 * (j.pareils || 0) / j.cours) + ' %', 'sans changement'));
  puces.append(puceDrivup('', j.ecrites || 0, 'lignes écrites dans la base'));
  puces.append(puceDrivup('bouge', etat.jeton ? 1 : 0, 'lecteur pour toute l’équipe'));
  c.appendChild(puces);
  c.appendChild(elDv('div', 'dvJour', 'Les connexions Drivup de l’équipe'));
  const postes = etat.postes || [];
  const lecteur = etat.jeton && etat.jeton.poste;
  if(!postes.length) c.appendChild(elDv('div', 'dvPli', 'Aucun ordinateur n’a encore l’extension. Installe-la (ci-dessous), puis ouvre l’App sur cet ordinateur : il apparaîtra ici.'));
  postes.forEach(p => {
    const estLecteur = p.poste === lecteur;
    const ici = !!(EXT_DV.poste && p.poste === EXT_DV.poste);
    const eteint = Date.now() - Number(p.vu || 0) > 3 * 3600000;
    const nav = p.navigateur || 'Navigateur';
    let etatP, puce, sous, etatLigne;
    if(p.drivup === 'deconnecte'){
      etatP = 'annule'; etatLigne = 'bouge'; puce = '🔒 À reconnecter';
      sous = 'Drivup l’a déconnecté · ouvrir Drivup dans ' + nav + ' : il remplit le mot de passe';
    }else if(eteint){
      etatP = 'ignore'; puce = '— Éteint';
      sous = nav + ' · vu ' + ilYADv(p.vu);
    }else{
      etatP = 'neuf'; puce = estLecteur ? '✅ Connecté · lecteur' : '✅ Connecté';
      sous = nav + ' · session Drivup gardée par ' + nav + ' · ' + (estLecteur ? 'c’est lui qui lit pour tous' : 'prend le relais si le lecteur s’éteint');
    }
    if(ici) sous = 'Cet ordinateur · ' + sous;
    if(p.lecture && p.lecture.le && !eteint) sous += ' · dernière lecture à ' + heureDv(p.lecture.le);
    c.appendChild(ligneDv('PC', rondDrivup(p.nom || '?'), p.nom || 'Quelqu’un', sous, etatP, puce, etatLigne));
  });
  c.appendChild(noteDv('Le mot de passe reste dans le navigateur (son gestionnaire de mots de passe) et dans Drivup. L’extension réutilise la session Drivup déjà ouverte dans ce navigateur ; elle la garde éveillée en lisant régulièrement.'));
  /* lire maintenant, et l'installer */
  const bas = elDv('div', 'btn-row');
  bas.style.cssText = 'margin-top:10px;flex-wrap:wrap;gap:8px;';
  if(extDrivupPresente()){
    const b = elDv('button', 'btn btn-secondary', '↻ Lire maintenant');
    b.type = 'button'; b.style.cssText = 'width:auto;flex:0 0 auto;';
    b.addEventListener('click', () => {
      b.disabled = true; b.textContent = 'Lecture dans Drivup…';
      const fin = ev => {
        if(ev.source !== window || !ev.data || ev.data.ecExt !== 1 || ev.data.type !== 'ext-lu') return;
        window.removeEventListener('message', fin);
        b.disabled = false; b.textContent = '↻ Lire maintenant';
        const st = ev.data.status;
        if(st && st !== 'ok' && typeof showToast === 'function'){
          showToast({ 'pas-mon-tour': 'Un autre ordinateur lit en ce moment pour l’équipe.', 'occupe': 'Une lecture est déjà en cours.',
                      'erreur': 'Drivup n’a pas pu être lu : ouvre Drivup et connecte-toi.', 'pas-d-app': 'L’App n’est pas ouverte.' }[st] || st);
        }
        afficherDrivupGestion(true);
      };
      window.addEventListener('message', fin);
      versExtDrivup({ type: 'lire-maintenant' });
    });
    bas.appendChild(b);
    c.appendChild(bas);
  }
  const aide = elDv('details', 'dvPli');
  aide.appendChild(elDv('summary', '', extDrivupPresente()
    ? '🧩 L’extension est sur cet ordinateur (version ' + (EXT_DV.version || '?') + ') — l’installer sur un autre'
    : '🧩 Installer l’extension sur cet ordinateur'));
  const ol = elDv('div', 'dvNote');
  ol.style.whiteSpace = 'pre-line';
  ol.textContent = 'Chrome, Edge, ou l’App installée sur Windows : décompresse « extension-drivup.zip » dans un dossier qu’on ne supprime pas, ' +
    'ouvre chrome://extensions (edge://extensions pour Edge), allume « Mode développeur », clique « Charger l’extension non empaquetée » et choisis ce dossier.\n' +
    'Firefox : ouvre le fichier « .xpi » signé par Mozilla, et accepte.\n' +
    'Ensuite : ouvre Drivup une fois dans ce navigateur et connecte-toi (laisse le navigateur retenir le mot de passe), puis recharge l’App : l’ordinateur apparaît dans la liste.';
  aide.appendChild(ol);
  c.appendChild(aide);
}

/* ---------- ⏱️ Ce qui est lu, et quand ---------- */
function joursTexteDv(jours){
  const l = (jours || []).slice().sort((a, b) => ((a || 7) - (b || 7)));
  const noms = { 0: 'dimanche', 1: 'lundi', 2: 'mardi', 3: 'mercredi', 4: 'jeudi', 5: 'vendredi', 6: 'samedi' };
  if(!l.length) return 'aucun jour';
  if(l.join() === '1,2,3,4,5,6') return 'du lundi au samedi';
  if(l.join() === '1,2,3,4,5') return 'du lundi au vendredi';
  if(l.join() === '1,2,3,4,5,6,0') return 'tous les jours';
  return l.map(n => noms[n]).join(', ');
}
function dessinerRythmesDv(z, etat){
  const r = Object.assign({ semaine: 15, complet: 60, debut: 7, fin: 20, jours: [1, 2, 3, 4, 5, 6], fiches: 30 }, (etat.reglages && etat.reglages.rythmes) || {});
  const j = etat.jour || {}, auj = etat.aujourdhui || {};
  const c = carteDv(z, '⏱️', 'Ce qui est lu, et quand', 'Un seul ordinateur lit pour toute l’équipe (le premier connecté) ; les autres attendent et prennent le relais. De ' +
    r.debut + ' h à ' + r.fin + ' h, ' + joursTexteDv(r.jours) + '.');
  const sem = [j.semaine, j.complete].filter(Boolean).sort((a, b) => b.le - a.le)[0];
  const lu = (x, plus) => x && x.le ? 'lu à ' + heureDv(x.le) + (plus || '') : 'pas encore lu';
  const pl = (n, un, plusieurs) => n + ' ' + (n > 1 ? plusieurs : un);
  c.appendChild(ligneDv(dureeDv(r.semaine), rondTexteDv('📆'), 'Le planning de la semaine', 'Le flux de Drivup ; seuls les cours nouveaux ou modifiés sont rouverts pour savoir quel élève',
    'neuf', lu(sem, sem ? ' · ' + pl(sem.rouverts || 0, 'rouvert', 'rouverts') : '')));
  c.appendChild(ligneDv(dureeDv(r.complet), rondTexteDv('📆'), 'Les semaines 2 à 4', 'Pareil, quatre semaines en tout', 'neuf', lu(j.complete)));
  c.appendChild(ligneDv(dureeDv(r.complet), rondTexteDv('🆔'), 'Les NEPH', 'Avec les fiches : un NEPH apparu dans Drivup va dans sa fiche', 'neuf', '🆔 ' + pl(auj.neph || 0, 'arrivé', 'arrivés')));
  c.appendChild(ligneDv(dureeDv(r.complet), rondTexteDv('✅'), 'Les mandats RdvPermis', 'Avec les fiches (l’onglet Examens de Drivup) : un mandat devenu actif se voit ici', 'neuf', '✅ ' + pl(auj.mandat || 0, 'pris', 'pris')));
  c.appendChild(ligneDv('1 fois par jour', rondTexteDv('📝'), 'Les notes internes', 'Les élèves qui ont un cours dans les 14 jours, plus celui dont un cours vient de bouger, à la lecture suivante',
    'neuf', '📝 ' + pl(auj.note || 0, 'nouvelle', 'nouvelles')));
  c.appendChild(ligneDv(dureeDv(r.complet), rondTexteDv('🪪'), 'Les fiches', r.fiches + ' élèves au plus par lecture, pour les cases vides chez nous (adresse, code, responsable légal…)',
    'neuf', '🪪 ' + pl((j.fiches && j.fiches.n) || 0, 'complétée', 'complétées')));
  /* 🆕 v1525 */
  c.appendChild(ligneDv(dureeDv(r.semaine), rondTexteDv('🆕'), 'Les nouveaux élèves', 'Un cours dans Drivup et pas de dossier chez nous : son dossier est créé tout seul, avec sa fiche Drivup',
    'neuf', '🆕 ' + pl(auj.dossier || 0, 'créé', 'créés')));
  c.appendChild(noteDv('Rien n’est écrit dans Drivup. Ce qui n’a pas changé ne réécrit rien dans la base : seuls les changements partent.'));
  if(etat.estAdmin) editeurRythmesDv(c, r);
}
/* David : « que je puisse changer les timings de relecture directement dans l'app » */
function editeurRythmesDv(c, r){
  const ouvrir = elDv('button', 'btn btn-secondary', '✏️ Changer les rythmes');
  ouvrir.type = 'button'; ouvrir.style.cssText = 'width:auto;margin-top:10px;';
  const boite = elDv('div', 'dvRythmes');
  boite.hidden = !DV_NOUV.rythmesOuverts;
  ouvrir.addEventListener('click', () => { DV_NOUV.rythmesOuverts = boite.hidden; boite.hidden = !boite.hidden; });
  c.append(ouvrir, boite);
  const grille = elDv('div', 'dvRyGrille');
  const champ = (lib, val, min, max, unite) => {
    const w = elDv('label', 'dvRy');
    w.append(elDv('span', 'dvRyL', lib));
    const i = document.createElement('input');
    i.type = 'number'; i.min = min; i.max = max; i.value = val; i.inputMode = 'numeric';
    const ligne = elDv('span', 'dvRyC');
    ligne.append(i, elDv('span', 'dvRyU', unite));
    w.append(ligne);
    grille.appendChild(w);
    return i;
  };
  const iS = champ('Le planning de la semaine, toutes les', r.semaine, 5, 120, 'min');
  const iC = champ('Les semaines 2 à 4, les fiches, toutes les', r.complet, 15, 360, 'min');
  const iD = champ('À partir de', r.debut, 0, 23, 'h');
  const iF = champ('Jusqu’à', r.fin, 0, 23, 'h');
  const iFi = champ('Fiches relues à chaque fois, au plus', r.fiches, 0, 100, 'élèves');
  boite.appendChild(grille);
  const jours = elDv('div', 'dvPuces');
  const coches = {};
  JOURS_DV.forEach(([n, nom]) => {
    const on = (r.jours || []).indexOf(n) !== -1;
    const b = elDv('button', 'dvPuce dvJourB' + (on ? ' neuf' : ''), nom);
    b.type = 'button'; b.setAttribute('aria-pressed', String(on));
    coches[n] = b;
    b.addEventListener('click', () => { const o = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(o)); b.classList.toggle('neuf', o); });
    jours.appendChild(b);
  });
  boite.appendChild(jours);
  const etatTxt = elDv('div', 'dvNote');
  const ok = elDv('button', 'btn btn-primary', '✅ Enregistrer les rythmes');
  ok.type = 'button'; ok.style.cssText = 'width:auto;';
  ok.addEventListener('click', async () => {
    ok.disabled = true;
    try{
      const rythmes = { semaine: Number(iS.value), complet: Number(iC.value), debut: Number(iD.value), fin: Number(iF.value), fiches: Number(iFi.value),
                        jours: Object.keys(coches).map(Number).filter(n => coches[n].getAttribute('aria-pressed') === 'true') };
      const rep = await appelPrep({ action: 'drivupReglagesPoser', rythmes: rythmes });
      const rr = rep.reglages.rythmes;
      DV_NOUV.etat.reglages = rep.reglages;
      EXT_DV.reglages = rep.reglages;
      dessinerDrivupGestion();
      if(typeof showToast === 'function') showToast('✅ Rythmes enregistrés : la semaine toutes les ' + dureeDv(rr.semaine) + ', le reste toutes les ' + dureeDv(rr.complet) + '.');
    }catch(e){
      etatTxt.textContent = '⚠️ ' + ((e && e.message) || e);
      ok.disabled = false;
    }
  });
  boite.append(ok, etatTxt);
  boite.appendChild(noteDv('L’extension prend les nouveaux rythmes à sa prochaine lecture (5 minutes au plus).'));
}

/* ---------- 🔔 Du nouveau dans Drivup ---------- */
function dessinerNouveauDv(z){
  const c = carteDv(z, '🔔', 'Du nouveau dans Drivup', 'Ce que la lecture en arrière-plan a trouvé de nouveau (les 14 derniers jours). Une ligne ouvre le dossier de l’élève. Personne n’est prévenu d’un cours déplacé ou annulé : c’est ici qu’on le voit.');
  const l = DV_NOUV.donnees || [];
  const fam = x => (SORTES_DV[x.sorte] || {}).famille;
  const filtres = elDv('div', 'dvPuces dvFiltres');
  const puceFiltre = (f, el) => {
    el.setAttribute('role', 'button'); el.tabIndex = 0;
    el.style.cursor = 'pointer';
    const choisir = () => { DV_NOUV.filtre = f; dessinerDrivupGestion(); };
    el.addEventListener('click', choisir);
    el.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); choisir(); } });
    filtres.appendChild(el);
  };
  puceFiltre('tout', puceDrivup(DV_NOUV.filtre === 'tout' ? 'bouge' : '', 'Tout', '· ' + l.length));
  FAMILLES_DV.forEach(([f, emo, nom]) => {
    const n = l.filter(x => fam(x) === f).length;
    if(!n) return;
    puceFiltre(f, puceDrivup(DV_NOUV.filtre === f ? 'bouge' : '', emo, nom + ' ' + n));
  });
  c.appendChild(filtres);
  const vus = l.filter(x => DV_NOUV.filtre === 'tout' || fam(x) === DV_NOUV.filtre);
  if(!vus.length){ c.appendChild(elDv('div', 'dvPli', '✅ Rien de nouveau pour le moment.')); return; }
  const auj = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
  const hier = new Date(Date.now() - 86400000).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
  let jour = '';
  vus.slice(0, 200).forEach(x => {
    const jx = new Date(Number(x.quand)).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    if(jx !== jour){
      jour = jx;
      c.appendChild(elDv('div', 'dvJour', jx === auj ? 'Aujourd’hui' : jx === hier ? 'Hier' : dateLisibleDrivup(jx)));
    }
    const s = SORTES_DV[x.sorte] || { puce: x.titre, cls: '' };
    const ligne = ligneDv(heureDv(x.quand), x.eleve ? rondDrivup(x.eleve) : rondTexteDv('•'), x.eleve || x.titre, x.detail || x.titre, s.cls, s.puce);
    if(x.eleve && typeof ouvrirPageEleve === 'function'){
      ligne.classList.add('dvCliquable');
      ligne.setAttribute('role', 'button'); ligne.tabIndex = 0;
      ligne.title = 'Ouvrir le dossier de ' + x.eleve;
      const ouvrir = () => {
        if(typeof afficherOnglet === 'function') afficherOnglet('eleves');
        if(typeof afficherVue === 'function') afficherVue('eleves', 'dossier');
        ouvrirPageEleve(x.eleve);
      };
      ligne.addEventListener('click', ouvrir);
      ligne.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); ouvrir(); } });
    }
    c.appendChild(ligne);
  });
}

/* ============================================================
   L'ONGLET « DRIVUP » — la vraie page Drivup, dans un cadre
   (Drivup ne l'interdit pas, relevé le 21/11 ; la connexion y suit
   grâce à l'extension). Sans l'extension, le cadre montrerait la page
   de connexion de Drivup : on propose de l'ouvrir dans un onglet.
   ============================================================ */
/* Les raccourcis du schéma (relevés dans le menu de Drivup le 21/11 :
   agence=1 Saint-Brieuc, agence=3 Loudéac ; Trésorerie › Listing encaissements) */
function jourDrivupIso(){ return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }); }
const DRIVUP_RACCOURCIS = [
  ['📆 Planning Saint-Brieuc', () => '/planning/agence.php?agence=1&date=' + jourDrivupIso() + '&day=1'],
  ['📆 Planning Loudéac', () => '/planning/agence.php?agence=3&date=' + jourDrivupIso() + '&day=1'],
  ['👥 Élèves', () => '/eleves/']
  /* v1525 — David : « enlève le bouton paiement » */
];
/* La bande d'adresse au-dessus du cadre : le point vert et l'adresse */
function adresseDv(){
  const a = elDv('div', 'dvCadreAdresse');
  a.append(elDv('span', 'dvPoint'), elDv('span', 'dvAdr', ''));
  a.poser = chemin => { a.lastChild.textContent = 'app.drivup.fr' + String(chemin).split('?')[0]; };
  return a;
}
let drivupOngletPret = false;
function ouvrirOngletDrivup(){
  const z = $('drivupOngletZone');
  if(!z) return;
  if(drivupOngletPret && z.querySelector('iframe')) return;
  drivupOngletPret = true;
  z.innerHTML = '';
  /* v1525 — David : « mets les boutons Planning etc. en dessous, au plus
     bas, pour que je voie plus Drivup » : une seule rangée fine sous le
     cadre (raccourcis, adresse, ↻, ↗), et la carte va jusqu'en bas de l'écran. */
  const barre = elDv('div', 'dvCadreBarre dvCadreBas');
  const cadre = document.createElement('iframe');
  cadre.className = 'dvCadre';
  cadre.title = 'Drivup';
  cadre.setAttribute('referrerpolicy', 'no-referrer');
  const adresse = adresseDv();
  const aller = (chemin, b) => {
    cadre.src = DRIVUP_ORIGINE + chemin;
    adresse.poser(chemin);
    barre.querySelectorAll('.dvRac').forEach(x => { x.className = 'btn btn-secondary dvRac'; });
    if(b) b.className = 'btn btn-primary dvRac';
  };
  DRIVUP_RACCOURCIS.forEach(([nom, chemin], i) => {
    const b = elDv('button', 'btn btn-secondary dvRac', nom);
    b.type = 'button';
    b.addEventListener('click', () => aller(chemin(), b));
    barre.appendChild(b);
    if(i === 0) aller(chemin(), b);
  });
  barre.appendChild(adresse);
  barre.appendChild(elDv('span', 'dvCadreEsp', ''));
  const rel = elDv('button', 'btn btn-secondary', '↻');
  rel.type = 'button'; rel.title = 'Recharger';
  rel.addEventListener('click', () => { try{ cadre.contentWindow.location.reload(); }catch(e){ cadre.src = cadre.src; } });
  const out = elDv('button', 'btn btn-secondary', '↗ Ouvrir dans un onglet');
  out.type = 'button';
  out.addEventListener('click', () => window.open(cadre.src || DRIVUP_ORIGINE, '_blank', 'noopener'));
  barre.append(rel, out);
  if(!extDrivupPresente()){
    const n = elDv('div', 'dvNote dvCadreSans', '🧩 Sans l’extension « App EC · Drivup » sur cet ordinateur, Drivup ne garde pas ta connexion dans l’App : il demandera de se connecter. Installe l’extension (Gestion › 📥 Drivup), ou « ↗ Ouvrir dans un onglet ».');
    z.appendChild(n);
  }
  z.append(cadre, barre);
  ajusterOngletDrivup();
}
/* La carte Drivup prend toute la hauteur qui reste sous elle, jusqu'en bas
   de l'écran (moins la barre des onglets quand elle est en bas, au téléphone). */
function ajusterOngletDrivup(){
  const c = document.querySelector('.dvOngletCarte');
  if(!c || !c.offsetParent) return;
  let bas = 10;
  const nav = $('barreOnglets');
  if(nav && getComputedStyle(nav).display !== 'none'){   /* fixe : pas d'offsetParent */
    const r = nav.getBoundingClientRect();
    if(r.top > window.innerHeight / 2) bas += window.innerHeight - r.top;
  }
  const haut = c.getBoundingClientRect().top + window.scrollY;
  c.style.height = Math.max(300, Math.round(window.innerHeight - haut - bas)) + 'px';
}
window.addEventListener('resize', () => { if(typeof ongletActif !== 'undefined' && ongletActif === 'drivup') ajusterOngletDrivup(); });

/* ============================================================
   LE PANNEAU À CÔTÉ — du dossier de l'élève, et (v1526) des rappels
   de cours. David, le 21 novembre : « que je puisse régler la largeur
   de chaque fenêtre » → une poignée à glisser entre les deux, la
   largeur gardée sur cet ordinateur ; double-clic : la largeur de
   départ. « Le même principe dans Rappels de cours, avec la bonne
   journée sur le planning en fonction de ce qu'on choisit sur le
   rappel » → le planning « Tous les utilisateurs » du jour choisi
   dans « Quand », qui suit quand on le change.
   ============================================================ */
const DRIVUP_ONGLETS_ELEVE = [['Fiche', '/eleves/profil.php'], ['Examens', '/eleves/examens_eleve.php'], ['Notes internes', '/eleves/notes_internes.php'],
                              ['Planning', '/eleves/plannings.php'], ['Paiements', '/eleves/releveDeCompteNf.php']];
let dvOngletEleve = 'Fiche';
const DV_LARGEUR_CLE = 'ec_dv_panneau_l';
function largeurPanneauDv(){
  let l = 560;
  try{ l = parseInt(localStorage.getItem(DV_LARGEUR_CLE) || '560', 10) || 560; }catch(e){}
  return l;
}
function bornerPanneauDv(l){
  const av = $('appView');
  const max = Math.max(380, ((av && av.getBoundingClientRect().width) || window.innerWidth) - 380);
  return Math.round(Math.max(360, Math.min(max, l)));
}
function poserLargeurPanneauDv(l){ document.documentElement.style.setProperty('--dv-l', bornerPanneauDv(l) + 'px'); }

/* o : { pour, titre, sous, onglets: [[nom, chemin complet]], quel, garderOnglet } */
function ouvrirPanneauDrivup(o){
  fermerPanneauDrivupEleve();
  const p = elDv('aside', 'card dvPanneau');
  p.id = 'dvPanneau';
  p.dataset.pour = o.pour;
  p.dataset.cle = o.cle || '';
  p.setAttribute('aria-label', o.titre);
  const poignee = elDv('div', 'dvPoignee');
  poignee.title = 'Glisser pour régler la largeur (double-clic : la largeur de départ)';
  poignee.setAttribute('aria-hidden', 'true');
  poignee.appendChild(elDv('i'));
  const tete = elDv('div', 'dvPanneauTete');
  const t = elDv('div', 'dvPanneauTitre');
  const sous = elDv('span', '', o.sous || '');
  t.append(elDv('b', '', o.titre), sous);
  const grand = elDv('button', 'btn btn-secondary', '↗'); grand.type = 'button'; grand.title = 'Ouvrir dans un onglet';
  const x = elDv('button', 'btn btn-secondary', '✕'); x.type = 'button'; x.title = 'Fermer'; x.setAttribute('aria-label', 'Fermer le panneau Drivup');
  tete.append(t, grand, x);
  const ongl = elDv('div', 'dvPanneauOnglets');
  const cadre = document.createElement('iframe');
  cadre.className = 'dvCadre'; cadre.title = o.titre; cadre.setAttribute('referrerpolicy', 'no-referrer');
  const adresse = adresseDv();
  const aller = (n, chemin, b) => {
    if(o.garderOnglet) o.garderOnglet(n);
    cadre.src = DRIVUP_ORIGINE + chemin;
    adresse.poser(chemin);
    ongl.querySelectorAll('button').forEach(y => { y.className = 'btn btn-secondary'; });
    if(b) b.className = 'btn btn-primary';
  };
  const choisi = o.onglets.some(z => z[0] === o.quel) ? o.quel : o.onglets[0][0];
  o.onglets.forEach(([n, chemin]) => {
    const b = elDv('button', 'btn btn-secondary', n); b.type = 'button';
    b.addEventListener('click', () => aller(n, chemin, b));
    ongl.appendChild(b);
    if(n === choisi) aller(n, chemin, b);
  });
  grand.addEventListener('click', () => window.open(cadre.src, '_blank', 'noopener'));
  x.addEventListener('click', fermerPanneauDrivupEleve);
  const corps = elDv('div', 'dvPanneauCorps');
  corps.append(adresse);
  if(!extDrivupPresente()) corps.appendChild(elDv('div', 'dvNote dvCadreSans', '🧩 Sans l’extension sur cet ordinateur, Drivup demandera de se connecter ici : « ↗ » l’ouvre dans un onglet.'));
  corps.appendChild(cadre);
  p.append(poignee, tete);
  if(o.onglets.length > 1) p.appendChild(ongl);
  p.appendChild(corps);
  /* pour changer l'adresse sans tout refaire (les rappels : un autre jour) */
  p.changer = (titre, sousTexte, chemin) => {
    p.querySelector('.dvPanneauTitre b').textContent = titre;
    sous.textContent = sousTexte || '';
    p.setAttribute('aria-label', titre);
    aller('', chemin, null);
  };
  poignee.addEventListener('pointerdown', ev => {
    if(ev.button !== 0) return;
    ev.preventDefault();
    const pid = ev.pointerId;
    try{ poignee.setPointerCapture(pid); }catch(e){}
    document.body.classList.add('dvTire');
    const depart = p.getBoundingClientRect().width, x0 = ev.clientX;
    const bouge = e => { if(e.pointerId === pid) poserLargeurPanneauDv(depart + (x0 - e.clientX)); };
    const fin = e => {
      if(e.pointerId !== pid) return;
      poignee.removeEventListener('pointermove', bouge);
      poignee.removeEventListener('pointerup', fin);
      poignee.removeEventListener('pointercancel', fin);
      document.body.classList.remove('dvTire');
      const l = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--dv-l'), 10);
      try{ if(l) localStorage.setItem(DV_LARGEUR_CLE, String(l)); }catch(e){}
    };
    poignee.addEventListener('pointermove', bouge);
    poignee.addEventListener('pointerup', fin);
    poignee.addEventListener('pointercancel', fin);
  });
  poignee.addEventListener('dblclick', () => {
    try{ localStorage.removeItem(DV_LARGEUR_CLE); }catch(e){}
    poserLargeurPanneauDv(560);
  });
  poserLargeurPanneauDv(largeurPanneauDv());
  const av = $('appView') || document.body;
  av.appendChild(p);
  document.body.classList.add('avecPanneauDrivup');
  return p;
}
window.addEventListener('resize', () => { if($('dvPanneau')) poserLargeurPanneauDv(largeurPanneauDv()); });

function ouvrirPanneauDrivupEleve(nom, idDrivup, quel){
  return ouvrirPanneauDrivup({ pour: 'dossier', cle: nom, titre: '📥 Drivup — ' + nom, sous: 'sa fiche Drivup, à côté de son dossier',
    onglets: DRIVUP_ONGLETS_ELEVE.map(([n, c]) => [n, c + '?eleve=' + encodeURIComponent(idDrivup)]),
    quel: quel || dvOngletEleve, garderOnglet: n => { if(n) dvOngletEleve = n; } });
}
function fermerPanneauDrivupEleve(){
  const p = $('dvPanneau');
  if(p) p.remove();
  document.body.classList.remove('avecPanneauDrivup');
}
document.addEventListener('keydown', e => { if(e.key === 'Escape' && $('dvPanneau')) fermerPanneauDrivupEleve(); });

/* ---------- 🔔 Rappels de cours : le planning du jour choisi ---------- */
function jourDesRappelsDv(){
  const v = $('rapJour') ? $('rapJour').value : '';
  try{ return (typeof dateDuRappel === 'function') ? dateDuRappel(v) : ''; }catch(e){ return ''; }
}
function cheminRappelsDv(jour){ return '/planning/tous_les_utilisateurs.php?date=' + jour + '&day=1'; }
function titreRappelsDv(jour){ return '📥 Drivup — ' + (typeof dateLisibleDrivup === 'function' ? dateLisibleDrivup(jour) : jour); }
function ouvrirPanneauDrivupRappels(){
  const jour = jourDesRappelsDv() || new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
  return ouvrirPanneauDrivup({ pour: 'rappels', cle: jour, titre: titreRappelsDv(jour), sous: 'le planning « Tous les utilisateurs » du jour du rappel',
    onglets: [['Tous les utilisateurs', cheminRappelsDv(jour)]] });
}
/* « Quand » change : le planning suit */
document.addEventListener('change', e => {
  if(!e.target || e.target.id !== 'rapJour') return;
  const p = $('dvPanneau');
  if(!p || p.dataset.pour !== 'rappels') return;
  const jour = jourDesRappelsDv();
  if(!jour || jour === p.dataset.cle) return;
  p.dataset.cle = jour;
  p.changer(titreRappelsDv(jour), 'le planning « Tous les utilisateurs » du jour du rappel', cheminRappelsDv(jour));
});
function poserBoutonDrivupRappels(){
  if(typeof peutLireDrivup !== 'function' || !peutLireDrivup()) return;
  const h = document.querySelector('[data-vue="rappels"] h2.section-title');
  if(!h || h.querySelector('.dvBtnDossier')) return;
  const b = elDv('button', 'btn btn-primary dvBtnDossier', '📥 Drivup');
  b.type = 'button';
  b.title = 'Le planning Drivup du jour du rappel, à côté';
  b.addEventListener('click', () => { const p = $('dvPanneau'); if(p && p.dataset.pour === 'rappels') fermerPanneauDrivupEleve(); else ouvrirPanneauDrivupRappels(); });
  h.appendChild(b);
}

/* Le bouton « 📥 Drivup » dans la tête du dossier */
function poserBoutonDrivupDossier(){
  if(typeof peutLireDrivup !== 'function' || !peutLireDrivup()) return;
  const h = document.querySelector('[data-vue="dossier"] h2.section-title');
  if(!h) return;
  const nom = (typeof elevePageOuverte !== 'undefined' && elevePageOuverte) ? String(elevePageOuverte) : '';
  let b = h.querySelector('.dvBtnDossier');
  if(!nom){ if(b) b.remove(); return; }
  const f = typeof ficheDe === 'function' ? ficheDe(nom) : null;
  const id = chiffresDrivup(f && f.idDrivup);
  if(!b){
    b = elDv('button', 'btn btn-primary dvBtnDossier', '📥 Drivup');
    b.type = 'button';
    h.appendChild(b);
  }
  b.disabled = !id;
  b.title = id ? 'Sa fiche Drivup, à côté de son dossier' : 'Pas encore relié à Drivup (son numéro Drivup manque)';
  b.onclick = () => ouvrirPanneauDrivupEleve(nom, id);
  /* le panneau ouvert suit l'élève affiché */
  const p = $('dvPanneau');
  if(p && p.dataset.pour === 'dossier' && id && p.dataset.cle !== nom) ouvrirPanneauDrivupEleve(nom, id);
}
/* ⚠️ APRÈS TOUS LES SCRIPTS : ec-onglets.js est chargé après ce module,
   et sa déclaration « function afficherOnglet » remplacerait l'habillage. */
function habillerPourDrivup(){
  if(typeof dessinerPageEleve === 'function'){
    const avant = dessinerPageEleve;
    window.dessinerPageEleve = function(){
      const r = avant.apply(this, arguments);
      Promise.resolve(r).then(() => setTimeout(poserBoutonDrivupDossier, 50)).catch(() => {});
      return r;
    };
  }
  if(typeof afficherOnglet === 'function'){
    const avantO = afficherOnglet;
    window.afficherOnglet = function(cle){
      const r = avantO.apply(this, arguments);
      try{
        if(typeof ongletActif !== 'undefined' && ongletActif === 'drivup'){
          ouvrirOngletDrivup();
          window.scrollTo(0, 0);
          setTimeout(ajusterOngletDrivup, 60);
          setTimeout(ajusterOngletDrivup, 600);
        }
        if(typeof ongletActif !== 'undefined' && ongletActif !== 'eleves') fermerPanneauDrivupEleve();
      }catch(e){}
      return r;
    };
  }
  if(typeof afficherVue === 'function'){
    const avantV = afficherVue;
    window.afficherVue = function(onglet, cle){
      const r = avantV.apply(this, arguments);
      try{
        const p = $('dvPanneau');
        if(onglet === 'eleves' && p && cle !== p.dataset.pour) fermerPanneauDrivupEleve();
        if(onglet === 'eleves' && cle === 'rappels') poserBoutonDrivupRappels();
      }catch(e){}
      return r;
    };
  }
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', habillerPourDrivup);
else habillerPourDrivup();
document.addEventListener('DOMContentLoaded', () => setTimeout(poserBoutonDrivupRappels, 3000));
versExtDrivup({ type: 'ext?' });
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-drivup-ext.js'] = true;
