/* Déployé le 30/10/2026 à 17:21 — v1315 */
/* ============================================================
   📺 LA SALLE DES TABLETTES — v1290 (côté équipe)

   David, le 28 octobre : « il faut que je puisse décider de ce qu'il
   voit en salle des tablettes, que ce soit simple et rapide pour moi,
   que je vérifie que ce soit le bon élève qui est en salle ». Puis,
   après le schéma : pas de photo ; la première fois, l'équipe
   l'installe (n'importe qui de l'équipe) ; ensuite il revient seul
   avec son jour et mois de naissance ; fini, ses groupes s'ouvrent
   tout seuls ; « Déjà vu en salle » pour les élèves d'avant.

   Élèves › Au quotidien › 📺 Salle des tablettes :
     · En ce moment : chaque tablette, libre ou occupée (où il en est,
       jusqu'à quand), ▶ Installer un élève, ⏹ Arrêter ;
     · La théorie d'aujourd'hui, lue dans Drivup ;
     · Les élèves en cours ;
     · Au programme de la salle (les groupes du parcours qui se
       regardent en salle) — administrateurs ;
     · Les tablettes : ➕ Installer une tablette (un code à six chiffres
       à taper sur salle.html), retirer — administrateurs.
   Dans sa fiche (coin révisions) : où il en est, ses séances, et
   « ✅ Déjà vu en salle : ouvrir ses groupes ».

   Le Worker fait le reste (voir « LA SALLE DES TABLETTES »).

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const SL = { d: null, groupes: null, minuteur: null, chargeLe: 0 };

const slEch = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function slEl(tag, cls, html){ const e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; }
function slBouton(texte, cls, f){
  const b = slEl('button', 'btn ' + (cls || 'btn-secondary') + ' slBtn', slEch(texte));
  b.type = 'button';
  if(f) b.addEventListener('click', f);
  return b;
}
function slHeure(ms){ const d = new Date(Number(ms) || 0); return d.getHours() + 'h' + ('0' + d.getMinutes()).slice(-2); }
function slJour(ms){ const d = new Date(Number(ms) || 0); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); }
function slHeureTexte(h){ return String(h || '').replace(/^0/, '').replace(':', 'h').replace(/h00$/, 'h'); }
function slSiteNom(s){ return s === 'loudeac' ? 'Loudéac' : 'Saint-Brieuc'; }
function slNorm(s){ return (typeof normaliserMot === 'function') ? normaliserMot(String(s || '')) : String(s || '').toLowerCase().trim(); }
/* « EXEMPLE Léa » (Drivup) et « Léa Exemple » (sa fiche) : les mêmes mots */
function slCle(s){ return slNorm(s).split(/[\s-]+/).filter(Boolean).sort().join(' '); }
function slFicheDe(nom){
  const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
  if(f) return f;
  const c = slCle(nom);
  return ((typeof fichesEleves !== 'undefined' && fichesEleves) || []).find(x => slCle(x.eleve) === c) || null;
}
function slPeutRegler(){ return !!(SL.d && SL.d.peutRegler); }
function slPeut(){ return (typeof peutModifier !== 'function') || peutModifier('salle'); }

function slStyle(){
  if(document.getElementById('slStyle')) return;
  const s = document.createElement('style');
  s.id = 'slStyle';
  s.textContent =
    '.slBtn{width:auto;margin:0;padding:7px 11px;font-size:13px;}' +
    '.slSous{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin:18px 0 8px;}' +
    '.slAide{font-size:12.5px;color:var(--muted);line-height:1.5;}' +
    '.slGrille{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:10px;}' +
    '.slTab{border:1px solid var(--line);border-radius:12px;padding:10px 12px;}' +
    '.slTab.occupee{border:2px solid var(--accent-text);}' +
    '.slTab b{font-size:14px;}.slTab .etat{font-weight:800;}' +
    '.slTab .det{font-size:12.5px;color:var(--muted);line-height:1.5;margin:6px 0 8px;}' +
    '.slBarre{height:6px;border-radius:99px;background:var(--line);overflow:hidden;margin:6px 0 2px;}' +
    '.slBarre i{display:block;height:100%;background:var(--accent-text);}' +
    '.slLigne{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--line);font-size:13.5px;}' +
    '.slLigne:first-child{border-top:none;}.slLigne .n{flex:1;min-width:160px;font-weight:700;}' +
    '.slLigne small{color:var(--muted);font-size:12px;}' +
    '.slLigne small.slMain{color:var(--accent-text);font-weight:700;}' +
    '.slPuce{display:inline-block;font-size:12.5px;border:1px solid var(--line);border-radius:999px;padding:4px 9px;margin:0 4px 4px 0;}' +
    '.slCode{font-size:40px;font-weight:800;letter-spacing:.18em;text-align:center;margin:12px 0;}';
  document.head.appendChild(s);
}

/* Les groupes du parcours (lus une fois par ouverture de la vue) */
async function slGroupes(force){
  if(!SL.groupes || force){
    const d = await appelPrep({ action: 'parcoursList' });
    SL.groupes = (d && d.groupes) || [];
  }
  return SL.groupes;
}
/* Pour sa formation : ce qui se regarde en salle, et ce qui s'ouvrira
   à la fin (« Ouvrir ce que prévoit sa formation » dans 🔑). Un groupe
   de la salle sans formation cochée vaut pour toutes. */
function slGroupesPour(formation, groupes, programme){
  const f = slNorm(formation);
  const pourLui = g => (g.formations || []).some(x => slNorm(x) === f);
  const ouverts = (groupes || []).filter(g => !g.fermeLe);
  const salle = ouverts.filter(g => (programme || []).indexOf(g.id) !== -1 && (!(g.formations || []).length || (f && pourLui(g))));
  const ensuite = f ? ouverts.filter(g => pourLui(g) && !salle.some(x => x.id === g.id)) : [];
  const net = g => ({ id: g.id, nom: g.nom, icone: g.icone || '' });
  return { salle: salle.map(net), ensuite: ensuite.map(net) };
}
const slNomGroupe = g => (g.icone ? g.icone + ' ' : '') + g.nom;

/* ============================================================
   LA VUE
   ============================================================ */
async function afficherSalle(){
  const z = $('salleZone');
  if(!z) return;
  slStyle();
  if(!SL.d) z.innerHTML = (typeof htmlAttente === 'function') ? htmlAttente('Lecture de la salle…') : 'Lecture de la salle…';
  try{
    const [d] = await Promise.all([appelPrep({ action: 'salleLire' }), slGroupes(true)]);
    SL.d = d; SL.chargeLe = Date.now();
  }catch(e){ z.innerHTML = '<div class="empty">⚠️ ' + slEch(e.message || e) + '</div>'; return; }
  if((typeof fichesEleves === 'undefined' || !fichesEleves || !fichesEleves.length) && typeof chargerFiches === 'function') chargerFiches().catch(() => {});
  slDessiner();
  slSuivre();
}
/* Relue toute seule tant que la vue est à l'écran */
function slSuivre(){
  if(SL.minuteur) clearTimeout(SL.minuteur);
  SL.minuteur = setTimeout(async () => {
    const z = $('salleZone');
    if(!z || !z.offsetParent || document.hidden){ SL.minuteur = null; if(z && z.offsetParent) slSuivre(); return; }
    if(document.querySelector('.overlay.show')){ slSuivre(); return; }
    try{ SL.d = await appelPrep({ action: 'salleLire' }); SL.chargeLe = Date.now(); slDessiner(); }catch(e){}
    slSuivre();
  }, 20000);
}

function slDessiner(){
  const z = $('salleZone');
  if(!z || !SL.d) return;
  const d = SL.d;
  z.innerHTML = '';
  z.appendChild(slEl('div', 'slAide', 'Ce qui se passe sur les tablettes de la salle. La première fois, quelqu’un de l’équipe installe l’élève ; ensuite il revient seul (son nom, puis son jour et mois de naissance). Fini : ses groupes s’ouvrent tout seuls dans son espace.'));

  /* ① En ce moment, site par site */
  const sites = ['saint-brieuc', 'loudeac'].filter(s => d.tablettes.some(t => t.site === s));
  if(!d.tablettes.length){
    z.appendChild(slEl('div', 'slSous', '📺 En ce moment'));
    z.appendChild(slEl('div', 'empty', 'Aucune tablette installée.' + (slPeutRegler() ? ' Plus bas : ➕ Installer une tablette.' : ' Un administrateur les installe.')));
  }
  sites.forEach(site => {
    z.appendChild(slEl('div', 'slSous', '📺 En ce moment · ' + slSiteNom(site)));
    const g = slEl('div', 'slGrille');
    d.tablettes.filter(t => t.site === site).forEach(t => g.appendChild(slCarteTablette(t)));
    z.appendChild(g);
  });

  /* ② La théorie d'aujourd'hui dans Drivup */
  z.appendChild(slEl('div', 'slSous', '📆 La théorie d’aujourd’hui dans Drivup · ' + (d.resa || []).length));
  /* ➕ v1300 — David : « il faut que je puisse ajouter un élève qui n'a
     pas réservé sur Drivup et qui est là » */
  if(slPeut()){
    const ba = slBouton('➕ Un élève présent, pas réservé sur Drivup', 'btn-secondary', () => slFenetreAjouterPresent());
    ba.id = 'slAjouterPresent';
    ba.style.marginBottom = '8px';
    z.appendChild(ba);
  }
  if(!(d.resa || []).length){
    z.appendChild(slEl('div', 'empty', 'Rien de lu pour aujourd’hui. Elle arrive avec la lecture du planning d’une agence (favori 📥 Bilan de conduite).'));
  }else{
    const bloc = slEl('div', '');
    const fins = {};
    (d.eleves || []).forEach(e => { fins[slCle(e.eleve)] = e; });
    d.resa.forEach(r => {
      const e = fins[slCle(r.eleve)];
      const l = slEl('div', 'slLigne');
      l.appendChild(slEl('span', '', '🕐 ' + slEch(slHeureTexte(r.debut) + '–' + slHeureTexte(r.fin))));
      const fi = slFicheDe(r.eleve);
      l.appendChild(slEl('span', 'n', slEch(fi ? fi.eleve : r.eleve) + ' <small>· ' + slEch(slSiteNom(r.site)) + '</small>'));
      l.appendChild(slEl('small', '', e ? (e.fini ? '✅ fini' : (e.total ? e.vus + ' sur ' + e.total + ' vues' : 'commencé') + ' · revient seul') : '🆕 à installer la première fois'));
      if(r.main){
        l.setAttribute('data-main', '1');
        l.appendChild(slEl('small', 'slMain', '➕ ajouté' + (r.par ? ' par ' + slEch(r.par) : '') + ' · pas sur Drivup'));
        if(slPeut()){
          const x = slBouton('✕', '', async () => {
            if(!await confirmer('Retirer ' + r.eleve + ' de la théorie d’aujourd’hui ?', '📺 Salle des tablettes')) return;
            try{ SL.d = await appelPrep({ action: 'salleResaRetirer', id: r.id }); slDessiner(); }catch(err){ showToast('Impossible : ' + err.message); }
          });
          x.title = 'Retirer (ajouté par erreur)';
          l.appendChild(x);
        }
      }
      if((!e || !e.fini) && slPeut()){
        const libre = d.tablettes.filter(t => t.site === r.site && !t.seance);
        if(libre.length) l.appendChild(slBouton('▶ Installer', '', () => slFenetreInstaller(libre[0], fi ? fi.eleve : r.eleve)));
      }
      bloc.appendChild(l);
    });
    z.appendChild(bloc);
  }

  /* ③ Les élèves en cours */
  const enCours = (d.eleves || []).filter(e => !e.fini);
  z.appendChild(slEl('div', 'slSous', '👥 En cours · ' + enCours.length));
  if(!enCours.length) z.appendChild(slEl('div', 'empty', 'Personne en cours.'));
  else {
    const bloc = slEl('div', '');
    enCours.forEach(e => {
      const l = slEl('div', 'slLigne');
      l.appendChild(slEl('span', 'n', slEch(e.eleve) + (e.formation ? ' <small>· ' + slEch(e.formation) + '</small>' : '')));
      l.appendChild(slEl('small', '', (e.total ? e.vus + ' sur ' + e.total + ' vues' : 'pas encore commencé') +
        (e.majLe ? ' · le ' + slJour(e.majLe) : '') + ' · installé par ' + slEch(e.installePar || '?') + ' · ' + slSiteNom(e.site)));
      if(typeof ouvrirFicheEleve === 'function') l.appendChild(slBouton('👤', '', () => ouvrirFicheEleve(e.eleve)));
      bloc.appendChild(l);
    });
    z.appendChild(bloc);
  }
  const finis = (d.eleves || []).filter(e => e.fini);
  if(finis.length){
    const det = slEl('details', '');
    det.style.marginTop = '8px';
    det.appendChild(slEl('summary', 'slAide', '✅ Finis ces 30 derniers jours · ' + finis.length)).style.cursor = 'pointer';
    finis.forEach(e => det.appendChild(slEl('div', 'slLigne', '<span class="n">' + slEch(e.eleve) + '</span><small>' +
      (e.deja ? 'déjà vu avant l’appli · ouvert par ' + slEch(e.finiPar || '?') : 'fini le ' + slJour(e.finiLe)) + '</small>')));
    z.appendChild(det);
  }

  /* ④ Au programme */
  z.appendChild(slProgramme());

  /* ⑤ Les tablettes */
  if(slPeutRegler()) z.appendChild(slLesTablettes());
}

function slCarteTablette(t){
  const s = t.seance;
  const c = slEl('div', 'slTab' + (s ? ' occupee' : ''));
  if(s){
    const pct = s.total ? Math.round(100 * s.vus / s.total) : 0;
    c.innerHTML = '<b>📺 ' + slEch(t.nom) + '</b> · <span class="etat" style="color:var(--accent-text);">▶ ' + slEch(s.eleve) + '</span>' +
      (s.total ? '<div class="slBarre"><i style="width:' + pct + '%"></i></div>' : '') +
      '<div class="det">' + (s.total ? s.vus + ' sur ' + s.total + ' vues · ' : '') + 'depuis ' + slHeure(s.debut) + ' · jusqu’à ' + slHeure(s.finPrevue) +
      '<br>' + (s.par ? 'installé par ' + slEch(s.par) : 'revenu seul') + '</div>';
    if(slPeut()) c.appendChild(slBouton('⏹ Arrêter sa séance', '', async () => {
      if(!await confirmer('Arrêter la séance de ' + s.eleve + ' sur la ' + t.nom + ' ? Il reprendra là où il s’est arrêté.', '⏹ Salle des tablettes')) return;
      try{ SL.d = await appelPrep({ action: 'salleArreter', id: s.id }); slDessiner(); }catch(e){ showToast('Impossible : ' + e.message); }
    }));
  }else{
    c.innerHTML = '<b>📺 ' + slEch(t.nom) + '</b> · <span class="etat" style="color:var(--muted);">libre</span>' +
      '<div class="det">' + (t.derniere ? 'Dernière séance : ' + slEch(t.derniere.eleve) + ', ' + slHeure(t.derniere.debut) + '–' + slHeure(t.derniere.fin) + ' (' + slJour(t.derniere.debut) + ')' : 'Pas encore servi.') +
      (t.vueLe && Date.now() - t.vueLe > 10 * 60000 ? '<br>⚠️ Pas vue depuis ' + slJour(t.vueLe) + ' ' + slHeure(t.vueLe) + ' : est-elle allumée sur salle.html ?' : '') + '</div>';
    if(slPeut()) c.appendChild(slBouton('▶ Installer un élève', 'btn-primary', () => slFenetreInstaller(t, '')));
  }
  return c;
}

/* ============================================================
   ▶ INSTALLER UN ÉLÈVE SUR UNE TABLETTE — la première fois
   ============================================================ */
function slFenetreInstaller(t, nomDepart){
  const fond = slEl('div', 'overlay show');
  const m = slEl('div', 'modal');
  m.style.cssText = 'max-width:min(620px,95vw);max-height:92vh;overflow-y:auto;';
  m.appendChild(slEl('h3', '', '▶ Installer un élève — 📺 ' + slEch(t.nom)));
  m.appendChild(slEl('div', 'slAide', 'Il est devant la tablette : son cours de salle s’y ouvre à son nom dans quelques secondes. Ensuite, il revient seul.')).style.marginBottom = '12px';
  m.appendChild(slEl('label', '', 'L’élève'));
  const ie = slEl('input');
  ie.type = 'text'; ie.setAttribute('list', 'listeEleves'); ie.autocomplete = 'off';
  ie.placeholder = '🔎 Son nom';
  ie.value = nomDepart || '';
  m.appendChild(ie);
  /* La théorie d'aujourd'hui à ce site, pas encore finie */
  const jour = (SL.d && SL.d.resa || []).filter(r => r.site === t.site);
  if(jour.length && !nomDepart){
    const p = slEl('div', '');
    p.style.margin = '-6px 0 10px';
    jour.forEach(r => {
      const e = (SL.d.eleves || []).find(x => slCle(x.eleve) === slCle(r.eleve));
      if(e && e.fini) return;
      const b = slEl('button', 'btn tdOnglet', slEch(slHeureTexte(r.debut) + ' · ' + r.eleve));
      b.type = 'button';
      b.style.margin = '0 4px 4px 0';
      b.addEventListener('click', () => { const fi = slFicheDe(r.eleve); ie.value = fi ? fi.eleve : r.eleve; majEleve(); });
      p.appendChild(b);
    });
    m.appendChild(p);
  }
  const info = slEl('div', '');
  m.appendChild(info);
  const r = slEl('div', 'btn-row');
  const bA = slBouton('Annuler', 'btn-secondary', () => fermerFond(fond));
  const bG = slBouton('▶ Lancer sur la ' + t.nom, 'btn-primary', null);
  bG.disabled = true;
  r.appendChild(bA); r.appendChild(bG);
  m.appendChild(r);
  fond.appendChild(m);
  document.body.appendChild(fond);

  let choix = null;
  function majEleve(){
    const fi = slFicheDe(ie.value.trim());
    info.innerHTML = '';
    choix = null;
    bG.disabled = true;
    if(!ie.value.trim()) return;
    if(!fi){ info.appendChild(slEl('div', 'slAide', '⚠️ Pas de fiche à ce nom : choisis-le dans la liste.')); return; }
    const gp = slGroupesPour(fi.formation, SL.groupes, (SL.d.programme || {}).groupes);
    const e = (SL.d.eleves || []).find(x => slNorm(x.eleve) === slNorm(fi.eleve));
    choix = { eleve: fi.eleve, formation: fi.formation || '', naissance: fi.naissance || '', salle: gp.salle, ensuite: gp.ensuite, duree: 60 };
    if(e && e.fini){ info.appendChild(slEl('div', 'slAide', '✅ ' + slEch(fi.eleve) + ' a déjà fini la salle : ses groupes sont ouverts.')); return; }
    if(!gp.salle.length){
      info.appendChild(slEl('div', 'slAide', '⚠️ Rien n’est au programme de la salle pour sa formation (' + slEch(fi.formation || 'non renseignée') + ') : 📘 Au programme de la salle, plus bas.'));
      return;
    }
    const lignes = [
      '🎓 Sa formation : <b>' + slEch(fi.formation || 'non renseignée') + '</b>',
      '📺 En salle : ' + gp.salle.map(g => '<span class="slPuce">' + slEch(slNomGroupe(g)) + '</span>').join(''),
      '🔓 Puis s’ouvrent tout seuls : ' + (gp.ensuite.length ? gp.ensuite.map(g => '<span class="slPuce">' + slEch(slNomGroupe(g)) + '</span>').join('') : '<span class="slAide">les groupes de la salle seulement' + (fi.formation ? '' : ' (sa formation n’est pas renseignée)') + '</span>')
    ];
    if(e) lignes.push('↩️ Déjà commencé : ' + (e.total ? e.vus + ' sur ' + e.total + ' vues' : 'pas encore de vue') + ' — il reprend là où il s’est arrêté.');
    info.appendChild(slEl('div', '', '<div style="font-size:13.5px;line-height:1.9;margin-bottom:10px;">' + lignes.join('<br>') + '</div>'));
    /* Son code pour revenir seul */
    const ddmm = (String(fi.naissance || '').match(/^\d{4}-(\d{2})-(\d{2})/) || []);
    if(ddmm.length){
      info.appendChild(slEl('div', 'slAide', '🔒 Pour revenir seul : son jour et mois de naissance, <b>' + ddmm[2] + ddmm[1] + '</b> (' + ddmm[2] + '/' + ddmm[1] + '). Dis-le-lui.')).style.marginBottom = '10px';
    }else{
      info.appendChild(slEl('label', '', 'Sa date de naissance (son code pour revenir seul)'));
      const id = slEl('input'); id.type = 'date';
      id.addEventListener('input', () => { choix.naissance = id.value; });
      id.addEventListener('change', () => { choix.naissance = id.value; });
      info.appendChild(id);
    }
    /* Combien de temps : sa théorie de Drivup, sinon 1 h */
    const maintenant = new Date(), nowMin = maintenant.getHours() * 60 + maintenant.getMinutes();
    const r0 = jour.find(x => slCle(x.eleve) === slCle(fi.eleve) && (Number(x.fin.slice(0, 2)) * 60 + Number(x.fin.slice(3))) > nowMin + 5);
    const finDrivup = r0 ? (Number(r0.fin.slice(0, 2)) * 60 + Number(r0.fin.slice(3))) - nowMin : 0;
    const options = [['60', '1 h'], ['120', '2 h']];
    if(finDrivup) options.unshift(['d', 'jusqu’à ' + slHeureTexte(r0.fin) + ' (Drivup)']);
    choix.duree = finDrivup || 60;
    const zd = slEl('div', '');
    const dessinerDuree = (k) => {
      zd.innerHTML = '';
      zd.appendChild(slEl('label', '', '⏱️ Sa séance'));
      const rr = slEl('div', 'tdOnglets');
      options.forEach(([kk, tt]) => {
        const b = slEl('button', 'btn tdOnglet' + (kk === k ? ' on' : ''), slEch(tt));
        b.type = 'button';
        b.addEventListener('click', () => { choix.duree = kk === 'd' ? finDrivup : Number(kk); dessinerDuree(kk); });
        rr.appendChild(b);
      });
      zd.appendChild(rr);
    };
    dessinerDuree(finDrivup ? 'd' : '60');
    info.appendChild(zd);
    bG.disabled = false;
  }
  ie.addEventListener('change', majEleve);
  if(nomDepart) majEleve();
  bG.addEventListener('click', async () => {
    if(!choix) return;
    bG.disabled = true; bG.textContent = '…';
    try{
      const d = await appelPrep({ action: 'salleInstallerEleve', tablette: t.id, eleve: choix.eleve, formation: choix.formation,
                                  naissance: choix.naissance, salle: choix.salle, ensuite: choix.ensuite, duree: choix.duree });
      SL.d = d;
      fermerFond(fond);
      showToast('▶ ' + choix.eleve + ' démarre sur la ' + t.nom + ' (quelques secondes) ✅');
      slDessiner();
    }catch(e){ bG.disabled = false; bG.textContent = '▶ Lancer sur la ' + t.nom; showToast('Impossible : ' + e.message); }
  });
  setTimeout(() => { try{ (nomDepart ? bG : ie).focus(); }catch(e){} }, 50);
}

/* ============================================================
   ➕ UN ÉLÈVE PRÉSENT, PAS RÉSERVÉ SUR DRIVUP — v1300
   Il rejoint la théorie d'aujourd'hui : la tablette le propose, et sa
   séance dure jusqu'à l'heure dite. Une relecture de Drivup ne l'efface
   pas (le Worker garde les ajouts « à la main »).
   ============================================================ */
function slFenetreAjouterPresent(){
  const fond = slEl('div', 'overlay show');
  const m = slEl('div', 'modal');
  m.style.cssText = 'max-width:min(480px,95vw);';
  m.appendChild(slEl('h3', '', '➕ Un élève présent, pas réservé sur Drivup'));
  m.appendChild(slEl('div', 'slAide', 'Il est là pour la salle sans avoir réservé : il rejoint la théorie d’aujourd’hui, et « ▶ Installer » le met sur une tablette.')).style.marginBottom = '12px';
  m.appendChild(slEl('label', '', 'L’élève'));
  const ie = slEl('input');
  ie.type = 'text'; ie.setAttribute('list', 'listeEleves'); ie.autocomplete = 'off';
  ie.placeholder = '🔎 Son nom';
  ie.id = 'slPresentNom';
  m.appendChild(ie);
  const sites = ['saint-brieuc', 'loudeac'].filter(x => (SL.d.tablettes || []).some(t => t.site === x));
  let site = sites[0] || 'saint-brieuc';
  const zs = slEl('div', '');
  const dessinerSites = () => {
    zs.innerHTML = '';
    zs.appendChild(slEl('label', '', '📍 Où'));
    const rr = slEl('div', 'tdOnglets');
    ['saint-brieuc', 'loudeac'].forEach(k => {
      const b = slEl('button', 'btn tdOnglet' + (k === site ? ' on' : ''), slEch(slSiteNom(k)));
      b.type = 'button'; b.dataset.site = k;
      b.addEventListener('click', () => { site = k; dessinerSites(); });
      rr.appendChild(b);
    });
    zs.appendChild(rr);
  };
  dessinerSites();
  m.appendChild(zs);
  const maintenant = new Date();
  const fin = new Date(maintenant.getTime() + 60 * 60000);
  const hhmm = d => ('0' + d.getHours()).slice(-2) + ':' + ('0' + (Math.floor(d.getMinutes() / 5) * 5)).slice(-2);
  m.appendChild(slEl('label', '', '⏱️ Jusqu’à'));
  const ifin = slEl('input');
  ifin.type = 'time'; ifin.value = hhmm(fin); ifin.id = 'slPresentFin';
  m.appendChild(ifin);
  const msg = slEl('div', 'slAide', '');
  m.appendChild(msg);
  const r = slEl('div', 'btn-row');
  const bA = slBouton('Annuler', 'btn-secondary', () => fermerFond(fond));
  const bG = slBouton('➕ Ajouter', 'btn-primary', null);
  r.appendChild(bA); r.appendChild(bG);
  m.appendChild(r);
  fond.appendChild(m);
  fond.addEventListener('click', ev => { if(ev.target === fond) fermerFond(fond); });
  document.body.appendChild(fond);
  bG.addEventListener('click', async () => {
    const nom = ie.value.trim();
    const fi = slFicheDe(nom);
    if(!fi && nom.split(/\s+/).length < 2){ msg.textContent = '⚠️ Son prénom ET son nom (ou choisis-le dans la liste).'; ie.focus(); return; }
    bG.disabled = true; bG.textContent = '…';
    try{
      SL.d = await appelPrep({ action: 'salleResaAjouter', eleve: fi ? fi.eleve : nom, site: site, debut: hhmm(new Date()), fin: ifin.value });
      fermerFond(fond);
      showToast('➕ ' + (fi ? fi.eleve : nom) + ' rejoint la théorie d’aujourd’hui ✅');
      slDessiner();
    }catch(e){ bG.disabled = false; bG.textContent = '➕ Ajouter'; msg.textContent = '⚠️ ' + (e.message || e); }
  });
  setTimeout(() => { try{ ie.focus(); }catch(e){} }, 50);
}

/* ============================================================
   📘 AU PROGRAMME DE LA SALLE
   ============================================================ */
function slProgramme(){
  const w = slEl('div', '');
  w.appendChild(slEl('div', 'slSous', '📘 Au programme de la salle'));
  w.appendChild(slEl('div', 'slAide', 'Les groupes du parcours qui se regardent sur les tablettes, selon sa formation (celles cochées dans le groupe ; aucune = toutes). Tant qu’il ne les a pas finis en salle, il ne les voit pas chez lui. Fini : ils s’ouvrent, avec ceux que prévoit sa formation.' +
    (slPeutRegler() ? '' : ' Un administrateur les choisit.'))).style.marginBottom = '8px';
  const prog = (SL.d.programme || {}).groupes || [];
  const groupes = (SL.groupes || []).filter(g => !g.fermeLe);
  if(!groupes.length){ w.appendChild(slEl('div', 'empty', 'Aucun groupe dans le parcours.')); return w; }
  groupes.forEach(g => {
    const l = slEl('div', 'slLigne');
    const dedans = prog.indexOf(g.id) !== -1;
    l.appendChild(slEl('span', 'n', slEch(slNomGroupe(g)) + ' <small>· ' + slEch((g.formations || []).join(', ') || 'toutes les formations') + '</small>'));
    if(slPeutRegler()){
      const b = slEl('button', 'btn tdOnglet' + (dedans ? ' on' : ''), dedans ? '📺 En salle' : 'Pas en salle');
      b.type = 'button';
      b.addEventListener('click', async () => {
        const ids = dedans ? prog.filter(x => x !== g.id) : prog.concat([g.id]);
        b.disabled = true;
        try{ SL.d = await appelPrep({ action: 'salleProgramme', groupes: ids }); slDessiner(); }catch(e){ b.disabled = false; showToast('Impossible : ' + e.message); }
      });
      l.appendChild(b);
    }else l.appendChild(slEl('small', '', dedans ? '📺 en salle' : '—'));
    w.appendChild(l);
  });
  if((SL.d.programme || {}).majPar) w.appendChild(slEl('div', 'slAide', 'Réglé le ' + slEch(SL.d.programme.majLe) + ' par ' + slEch(SL.d.programme.majPar) + '.')).style.marginTop = '6px';
  return w;
}

/* ============================================================
   🔑 LES TABLETTES — administrateurs
   ============================================================ */
function slLesTablettes(){
  const w = slEl('div', '');
  w.appendChild(slEl('div', 'slSous', '🔑 Les tablettes · ' + SL.d.tablettes.length));
  SL.d.tablettes.forEach(t => {
    const l = slEl('div', 'slLigne');
    l.appendChild(slEl('span', 'n', '📺 ' + slEch(t.nom) + ' <small>· ' + slSiteNom(t.site) + '</small>'));
    l.appendChild(slEl('small', '', 'installée le ' + slJour(t.creeLe) + ' par ' + slEch(t.creePar || '?') + (t.vueLe ? ' · vue ' + slJour(t.vueLe) + ' ' + slHeure(t.vueLe) : '')));
    l.appendChild(slBouton('🗑️', '', async () => {
      if(!await confirmer('Retirer la ' + t.nom + ' (' + slSiteNom(t.site) + ') ? Elle ne pourra plus rien ouvrir ; pour la remettre, il faudra la réinstaller.', '🔑 Les tablettes', true)) return;
      try{ SL.d = await appelPrep({ action: 'salleTabletteRetirer', id: t.id }); slDessiner(); }catch(e){ showToast('Impossible : ' + e.message); }
    }));
    w.appendChild(l);
  });
  const b = slBouton('➕ Installer une tablette', '', slFenetreTablette);
  b.style.marginTop = '8px';
  w.appendChild(b);
  w.appendChild(slEl('div', 'slAide', 'Sur la tablette, ouvre <b>' + slEch(new URL('salle.html', location.href).href) + '</b> (ajoute-la à l’écran d’accueil), puis tape le code à six chiffres donné ici. Elle n’ouvre jamais le reste de l’appli.')).style.marginTop = '6px';
  return w;
}
function slFenetreTablette(){
  const fond = slEl('div', 'overlay show');
  const m = slEl('div', 'modal');
  m.style.cssText = 'max-width:min(460px,95vw);';
  m.appendChild(slEl('h3', '', '➕ Installer une tablette'));
  let site = 'saint-brieuc';
  const zs = slEl('div', '');
  const dessinerSite = () => {
    zs.innerHTML = '';
    zs.appendChild(slEl('label', '', 'Le site'));
    const rr = slEl('div', 'tdOnglets');
    [['saint-brieuc', 'Saint-Brieuc'], ['loudeac', 'Loudéac']].forEach(([k, t]) => {
      const b = slEl('button', 'btn tdOnglet' + (k === site ? ' on' : ''), t);
      b.type = 'button';
      b.addEventListener('click', () => { site = k; dessinerSite(); in2.value = slNomPropose(site); });
      rr.appendChild(b);
    });
    zs.appendChild(rr);
  };
  m.appendChild(zs);
  m.appendChild(slEl('label', '', 'Son nom (écrit dessus)'));
  const in2 = slEl('input'); in2.type = 'text'; in2.maxLength = 40;
  m.appendChild(in2);
  dessinerSite();
  in2.value = slNomPropose(site);
  const res = slEl('div', '');
  m.appendChild(res);
  const r = slEl('div', 'btn-row');
  const bA = slBouton('Fermer', 'btn-secondary', () => { fermerFond(fond); afficherSalle(); });
  const bG = slBouton('Donner le code', 'btn-primary', async () => {
    bG.disabled = true;
    try{
      const d = await appelPrep({ action: 'salleTablettePoser', site: site, nom: in2.value.trim() });
      res.innerHTML = '<div class="slCode">' + slEch(d.code) + '</div><div class="slAide" style="text-align:center;">À taper sur la tablette (<b>salle.html</b>) avant ' + slHeure(d.expire) + '. Une seule fois.</div>';
      bG.style.display = 'none';
    }catch(e){ bG.disabled = false; showToast('Impossible : ' + e.message); }
  });
  r.appendChild(bA); r.appendChild(bG);
  m.appendChild(r);
  fond.appendChild(m);
  document.body.appendChild(fond);
}
function slNomPropose(site){
  const n = ((SL.d && SL.d.tablettes) || []).filter(t => t.site === site).length;
  return 'Tablette ' + (n + 1);
}

/* ============================================================
   DANS SA FICHE (coin révisions) — où il en est, « Déjà vu en salle »
   ============================================================ */
async function ligneSalleFiche(nom, zone){
  if(!zone || !nom || (typeof aDroit === 'function' && !aDroit('salle'))) return;
  slStyle();
  let d = null;
  try{ d = await appelPrep({ action: 'salleEleve', eleve: nom }); }catch(e){ return; }
  const e = d && d.eleve;
  const c = slEl('div', '');
  c.style.cssText = 'border:1px solid var(--line);border-radius:11px;padding:10px 12px;margin-top:8px;font-size:12.5px;line-height:1.6;';
  if(e && e.fini){
    c.innerHTML = '<b style="font-size:13px;">📺 Salle des tablettes</b> · <span style="color:var(--accent-text);font-weight:700;">✅ ' +
      (e.deja ? 'déjà vu avant l’appli — groupes ouverts le ' + slJour(e.finiLe) + ' par ' + slEch(e.finiPar || '?') : 'fini le ' + slJour(e.finiLe) + ', ses groupes se sont ouverts') + '</span>';
  }else{
    c.innerHTML = '<b style="font-size:13px;">📺 Salle des tablettes</b> · ' +
      (e ? '<span style="color:var(--accent-text);font-weight:700;">' + (e.total ? e.vus + ' sur ' + e.total + ' vues' : 'installé, pas encore de vue') + '</span>' : '<span style="color:var(--muted);">pas encore commencé</span>');
    const s = (d.seances || []).slice(0, 6);
    if(s.length) c.appendChild(slEl('div', '', '<div style="color:var(--muted);">' + s.map(x => slJour(x.debut) + ' · ' + slHeure(x.debut) + '–' + slHeure(x.fin || x.finPrevue) +
      ' (' + slEch(x.tablette || '?') + ', ' + (x.par ? 'installé par ' + slEch(x.par) : 'revenu seul') + ')').join('<br>') + '</div>'));
    if(e && (e.ensuite || []).length) c.appendChild(slEl('div', '', '<div style="color:var(--muted);">Ses groupes s’ouvriront à la fin : ' + e.ensuite.map(g => slEch(slNomGroupe(g))).join(' · ') + '</div>'));
    /* 📺 v1315 — chez lui, aucun groupe tant que la salle n'est pas finie,
       même cochés ici (David : « tous les élèves », élèves d'avant compris) */
    c.appendChild(slEl('div', '', '<div style="color:var(--muted);">🔒 Chez lui, ses groupes restent fermés jusqu’à la fin de la salle, même cochés dans son accès.</div>'));
    if(slPeut()){
      const b = slBouton('✅ Déjà vu en salle (avant l’appli) : ouvrir ses groupes', '', () => slDejaVu(nom, zone, c));
      b.style.marginTop = '8px';
      c.appendChild(b);
    }
  }
  const vieux = zone.querySelector('[data-salle-fiche]');
  if(vieux) vieux.remove();
  c.setAttribute('data-salle-fiche', '1');
  zone.appendChild(c);
}
async function slDejaVu(nom, zone, carte){
  let groupes = [], prog = [];
  try{
    const [g, d] = await Promise.all([slGroupes(), appelPrep({ action: 'salleLire' })]);
    groupes = g; prog = ((d && d.programme) || {}).groupes || [];
  }catch(e){ showToast('Impossible : ' + e.message); return; }
  const fi = slFicheDe(nom);
  const gp = slGroupesPour(fi && fi.formation, groupes, prog);
  const tous = gp.salle.concat(gp.ensuite);
  if(!tous.length){ showToast('Aucun groupe à lui ouvrir pour sa formation (' + ((fi && fi.formation) || 'non renseignée') + ').'); return; }
  if(!await confirmer('Il a vu le cours de la salle avant l’appli (sur le Facebook de la salle) : lui ouvrir ' + tous.map(slNomGroupe).join(', ') + ' ?', '📺 Déjà vu en salle')) return;
  try{
    await appelPrep({ action: 'salleDejaVu', eleve: nom, formation: (fi && fi.formation) || '', salle: gp.salle, ensuite: gp.ensuite });
    showToast('Ses groupes sont ouverts ✅');
    await ligneSalleFiche(nom, zone);
  }catch(e){ showToast('Impossible : ' + e.message); }
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-salle.js'] = true;
