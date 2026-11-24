/* Déployé le 24/11/2026 à 10:49 — v1549 */
/* ============================================================
   ec-faq.js — ❓ LES QUESTIONS FRÉQUENTES DES ÉLÈVES — v1548

   David, le 24 novembre : « les élèves posent plein de questions dont
   les réponses sont sur le groupe Évolution Conduites sur Facebook :
   prépare une sorte de FAQ qu'on mettrait sur leur app, il faut qu'on
   puisse mettre du texte, des vidéos, des images » — l'espace Drivup,
   notre App, Kopilote, un résumé de la formation code, un résumé de la
   formation conduite, le NEPH. Ses choix : un onglet dans la barre du
   bas ET une carte sur l'accueil + un rond ❓ en haut ; les admins ET le
   bureau écrivent ; je rédige les premiers textes d'après le groupe, en
   tutoyant.

   ⚠️ PAS UN ÉDITEUR DE PLUS. La FAQ est un groupe ❓ de « Groupes et
   guides » (voir LA FAQ DES ÉLÈVES dans le Worker) : cet écran est
   l'atelier des guides (ec-parcours.js) en « mode FAQ ». Un guide
   publié = un thème ; une étape = une question ; ses blocs = la réponse.

   « ➕ Créer la FAQ » pose le groupe et les premiers thèmes EN
   BROUILLON : rien ne part chez les élèves avant d'être relu et publié.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

function afficherFaqEquipe(){
  if(typeof parcoursModeFaq === 'undefined' || typeof afficherParcours !== 'function') return;
  parcoursModeFaq = true;
  afficherParcours();
  chargerFaqStats();
}

/* ============================================================
   👁️ 🎯 CE QUE LES ÉLÈVES LISENT, ET POUR QUELLES FORMATIONS — v1549

   David, le 24/11, sur le schéma « FAQ : le compteur de lectures et les
   questions par formation » : le chiffre 👁️ = les deux (élèves
   différents ET ouvertures) ; la période = les trois (30 derniers jours,
   depuis le début, au choix) ; « 🔎 Cherché sans réponse » gardé ; les
   formations sur les questions ET sur les thèmes ; un élève sans
   formation voit tout.
   · Une question : « formations » sur son 🏷️ titre (enregistré avec le
     guide). Un thème : faqThemeReglage (D1).
   · Le choix des formations est celui de « 🔒 Seulement certains élèves »
     des guides, avec des formations, et des familles d'un coup.
   ============================================================ */
let faqStatsEC = { questions: {}, themes: {}, plusLues: [], cherches: [], pour: {}, lu: 0 };
let faqPeriodeEC = { mode: '30', du: '', au: '' };
try{ const p = JSON.parse(localStorage.getItem('ec_faq_periode') || 'null'); if(p && p.mode) faqPeriodeEC = p; }catch(e){}
function bornesPeriodeFaq(){
  const p = faqPeriodeEC;
  if(p.mode === 'tout') return { du: '', au: '' };
  if(p.mode === 'choix') return { du: p.du || '', au: p.au || '' };
  const d = new Date(Date.now() - 30 * 86400000);
  return { du: d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }), au: '' };
}
function nomPeriodeFaq(){
  const p = faqPeriodeEC;
  if(p.mode === 'tout') return 'depuis le début';
  if(p.mode === 'choix'){
    const f = x => x ? x.slice(8, 10) + '/' + x.slice(5, 7) + '/' + x.slice(0, 4) : '…';
    return 'du ' + f(p.du) + ' au ' + f(p.au);
  }
  return '30 derniers jours';
}
async function chargerFaqStats(){
  try{
    const b = bornesPeriodeFaq();
    const d = await appelPrep({ action: 'faqStats', du: b.du, au: b.au });
    if(!d || d.status !== 'ok') return;
    faqStatsEC = { questions: d.questions || {}, themes: d.themes || {}, plusLues: d.plusLues || [], cherches: d.cherches || [], pour: d.pour || {}, lu: Date.now() };
  }catch(e){ return; }
  rafraichirFaqStats();
}
/* Redessine ce qui montre les chiffres, sans toucher à ce qu'on écrit */
function rafraichirFaqStats(){
  if(typeof parcoursModeFaq === 'undefined' || !parcoursModeFaq) return;
  const z = document.getElementById('faqZone');
  if(!z) return;
  const ed = z.querySelector('#pcEditeur');
  if(ed){
    /* pas pendant qu'on écrit : les chiffres attendront le prochain dessin */
    const a = document.activeElement;
    if(a && ed.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
    if(a && a.isContentEditable && ed.contains(a)) return;
    if(typeof ed._faqRedessiner === 'function') ed._faqRedessiner();
    return;
  }
  if(typeof dessinerParcours === 'function') dessinerParcours();
}
function chiffresFaq(x){
  if(!x || !x.eleves) return '👁️ personne encore';
  return '👁️ ' + x.eleves + ' élève' + (x.eleves > 1 ? 's' : '') + ' · ' + x.ouvertures + ' ouverture' + (x.ouvertures > 1 ? 's' : '');
}

/* Les formations : celles des fiches élèves (FORMATIONS_BASE), et quatre familles d'un coup */
const FAMILLES_FAQ = [
  { nom: '🚗 Toutes les voitures', court: '🚗 voitures', f: x => x.voiture && !/aménagée|Régularisation/i.test(x.cle) },
  { nom: '🛵 Tous les 2 roues', court: '🛵 2 roues', f: x => /^(Moto A|A1 permis|A1 passerelle|AM 2 roues|A2)$/.test(x.cle) },
  { nom: '🚚 Remorque (BE)', court: '🚚 remorque', f: x => x.cle === 'Permis BE' },
  { nom: '♿ Aménagée et régularisation', court: '♿ aménagée', f: x => /aménagée|Régularisation/i.test(x.cle) }
];
function formationsConnuesFaq(){
  return ((typeof FORMATIONS_BASE !== 'undefined') ? FORMATIONS_BASE : []).filter(x => x.cle);
}
function nomFormationFaq(cle){
  const x = formationsConnuesFaq().find(y => y.cle === cle);
  return x ? x.nom : cle;
}
/* « toutes les formations », « 🛵 2 roues », « 🚗 Voiture manuelle (BV) », « 3 formations » */
function texteFormationsFaq(liste){
  const l = Array.isArray(liste) ? liste : [];
  if(!l.length) return 'toutes les formations';
  const tri = x => x.slice().sort().join('|');
  for(const f of FAMILLES_FAQ){
    const cles = formationsConnuesFaq().filter(f.f).map(x => x.cle);
    if(cles.length && tri(cles) === tri(l)) return f.court + ' (' + l.length + ' formation' + (l.length > 1 ? 's' : '') + ')';
  }
  if(l.length === 1) return nomFormationFaq(l[0]);
  return l.length + ' formations';
}
/* Le choix des formations (thème ou question). quand(liste) à chaque changement. */
function choixFormationsFaq(liste, quand){
  const p = document.createElement('div');
  p.className = 'pcRgP faqFormations';
  let l = (Array.isArray(liste) ? liste : []).slice();
  let certaines = l.length > 0;
  const dessiner = () => {
    p.innerHTML = '';
    const lab = document.createElement('label'); lab.textContent = '🎯 Pour quelles formations';
    p.appendChild(lab);
    const qui = document.createElement('div'); qui.className = 'pcRgQui';
    [['toutes', '🎯 Toutes les formations'], ['certaines', '🔒 Seulement certaines']].forEach(([v, n]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.faqQui = v;
      const on = v === 'certaines' ? certaines : !certaines;
      b.className = 'pcRgQ' + (on ? ' on' : '');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = n;
      b.addEventListener('click', () => {
        if(v === 'toutes'){ certaines = false; if(l.length){ l = []; quand(l); } }
        else certaines = true;
        dessiner();
      });
      qui.appendChild(b);
    });
    p.appendChild(qui);
    if(certaines){
      const a1 = document.createElement('div'); a1.className = 'pcAide'; a1.style.margin = '6px 0 4px'; a1.textContent = 'D’un coup :';
      p.appendChild(a1);
      const fam = document.createElement('div'); fam.className = 'pcRgProp';
      FAMILLES_FAQ.forEach(f => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = '＋ ' + f.nom; b.dataset.faqFamille = f.court;
        b.addEventListener('click', () => {
          formationsConnuesFaq().filter(f.f).forEach(x => { if(l.indexOf(x.cle) === -1) l.push(x.cle); });
          quand(l.slice()); dessiner();
        });
        fam.appendChild(b);
      });
      p.appendChild(fam);
      const noms = document.createElement('div'); noms.className = 'pcRgNoms'; noms.style.marginTop = '8px';
      if(!l.length){
        const v = document.createElement('div'); v.className = 'pcAide';
        v.textContent = 'Personne de choisi : elle reste pour toutes les formations tant qu’il n’y en a aucune.';
        noms.appendChild(v);
      }
      l.forEach(cle => {
        const c = document.createElement('span'); c.className = 'pcRgNom'; c.textContent = nomFormationFaq(cle);
        const x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.title = 'Retirer ' + nomFormationFaq(cle);
        x.setAttribute('aria-label', 'Retirer ' + nomFormationFaq(cle));
        x.addEventListener('click', () => { l = l.filter(y => y !== cle); quand(l.slice()); dessiner(); });
        c.appendChild(x);
        noms.appendChild(c);
      });
      p.appendChild(noms);
      const ch = document.createElement('input');
      ch.type = 'search'; ch.className = 'pcRgCherche'; ch.placeholder = '🔎 Ajouter une formation…';
      ch.setAttribute('aria-label', 'Ajouter une formation');
      const prop = document.createElement('div'); prop.className = 'pcRgProp';
      const proposer = () => {
        const q = (typeof normaliserMot === 'function' ? normaliserMot : (t => String(t).toLowerCase()))(ch.value || '');
        prop.innerHTML = '';
        formationsConnuesFaq().filter(x => l.indexOf(x.cle) === -1 && (!q || (typeof normaliserMot === 'function' ? normaliserMot(x.nom + ' ' + x.cle) : (x.nom + ' ' + x.cle).toLowerCase()).indexOf(q) !== -1))
          .slice(0, q ? 12 : 0).forEach(x => {
            const b = document.createElement('button'); b.type = 'button'; b.textContent = '＋ ' + x.nom; b.dataset.faqFormation = x.cle;
            b.addEventListener('click', () => { l.push(x.cle); quand(l.slice()); dessiner(); });
            prop.appendChild(b);
          });
      };
      ch.addEventListener('input', (e) => { e.stopPropagation(); proposer(); });
      ch.addEventListener('keydown', (e) => { if(e.key === 'Enter') e.preventDefault(); });
      p.append(ch, prop);
      const a2 = document.createElement('div'); a2.className = 'pcAide';
      a2.textContent = 'Les autres élèves ne la voient pas (sauf s’ils touchent « 👀 Tout voir »). Un élève sans formation dans sa fiche voit tout.';
      p.appendChild(a2);
    }
  };
  dessiner();
  return p;
}
/* La ligne sous une question, dans un thème de la FAQ */
function reglageQuestionFaq(et, idGuide, cb){
  const t = et.titre;
  const r = document.createElement('div');
  r.className = 'pcRg faqRg';
  const fo = Array.isArray(t.formations) ? t.formations : [];
  const st = faqStatsEC.questions[idGuide + '::' + (t.id || '')];
  const ligne = document.createElement('div'); ligne.className = 'pcRgL';
  ligne.innerHTML = '<span class="pcRgC' + (st && st.eleves ? ' on' : '') + '" data-faq-stat="1">' + echParcours(chiffresFaq(st)) + ' · ' + echParcours(nomPeriodeFaq()) + '</span>' +
    '<span class="pcRgC' + (fo.length ? ' on' : '') + '">🎯 ' + echParcours(texteFormationsFaq(fo)) + '</span>';
  const bR = document.createElement('button');
  bR.type = 'button'; bR.className = 'pcRgB'; bR.dataset.faqRegler = '1';
  bR.textContent = et.faqRgOuvert ? '⚙️ Fermer ▴' : '⚙️ Régler ▾';
  bR.setAttribute('aria-expanded', et.faqRgOuvert ? 'true' : 'false');
  bR.addEventListener('click', () => { cb.avant(); et.faqRgOuvert = !et.faqRgOuvert; cb.redessiner(); });
  ligne.appendChild(bR);
  r.appendChild(ligne);
  if(et.faqRgOuvert){
    r.appendChild(choixFormationsFaq(fo, (l) => {
      if(l.length) t.formations = l; else delete t.formations;
      const c = r.querySelector('.pcRgL .pcRgC:nth-child(2)');
      if(c){ c.textContent = '🎯 ' + texteFormationsFaq(l); c.classList.toggle('on', l.length > 0); }
      cb.avant(); cb.apres();
    }));
  }
  return r;
}
/* Sous le titre du thème : pour quelles formations est le thème entier, et ses lectures */
function ligneThemeFaq(idGuide, redessiner){
  const r = document.createElement('div');
  r.className = 'pcRg faqTheme';
  r.style.margin = '0 0 10px';
  const fo = (faqStatsEC.pour[idGuide] || {}).formations || [];
  const st = faqStatsEC.themes[idGuide];
  const ouvert = !!ligneThemeFaq.ouvert[idGuide];
  const ligne = document.createElement('div'); ligne.className = 'pcRgL';
  ligne.innerHTML = '<span class="pcRgC' + (fo.length ? ' on' : '') + '">🎯 Thème pour : ' + echParcours(texteFormationsFaq(fo)) + '</span>' +
    '<span class="pcRgC' + (st && st.eleves ? ' on' : '') + '">' + echParcours(chiffresFaq(st)) + ' · ' + echParcours(nomPeriodeFaq()) + '</span>';
  const bR = document.createElement('button');
  bR.type = 'button'; bR.className = 'pcRgB'; bR.dataset.faqThemeRegler = '1';
  bR.textContent = ouvert ? '⚙️ Fermer ▴' : '⚙️ Régler ▾';
  bR.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
  bR.addEventListener('click', () => { ligneThemeFaq.ouvert[idGuide] = !ouvert; redessiner(); });
  ligne.appendChild(bR);
  r.appendChild(ligne);
  if(ouvert){
    r.appendChild(choixFormationsFaq(fo, async (l) => {
      try{
        const d = await appelPrep({ action: 'faqThemeReglage', id: idGuide, formations: l });
        if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
        faqStatsEC.pour = d.pour || {};
        const c = r.querySelector('.pcRgL .pcRgC');
        if(c){ c.textContent = '🎯 Thème pour : ' + texteFormationsFaq(l); c.classList.toggle('on', l.length > 0); }
        showToast('🎯 Thème pour : ' + texteFormationsFaq(l) + ' ✅');
      }catch(e){ showToast('Pas enregistré : ' + ((e && e.message) || e) + (/inconnu|seulement/.test(String(e && e.message)) ? ' — le thème doit être enregistré d’abord.' : '')); }
    }));
  }
  return r;
}
ligneThemeFaq.ouvert = {};
/* Le sommaire d'un thème : 👁️ et 🎯 au bout de chaque question */
function marquesSommaireFaq(idGuide, titre){
  const st = faqStatsEC.questions[idGuide + '::' + ((titre && titre.id) || '')];
  const fo = (titre && Array.isArray(titre.formations)) ? titre.formations : [];
  return (fo.length ? '<span title="Pour : ' + echParcours(texteFormationsFaq(fo)) + '">🎯</span>' : '') +
    '<span class="faqSomStat" title="' + echParcours(chiffresFaq(st) + ' · ' + nomPeriodeFaq()) + '" style="font-size:11.5px;font-weight:600;color:var(--muted);white-space:nowrap;">👁️ ' + ((st && st.eleves) || 0) + '</span>';
}
/* La carte d'un thème : ses lectures et pour qui */
function ligneCarteFaq(x){
  const st = faqStatsEC.themes[x.id];
  const fo = (faqStatsEC.pour[x.id] || {}).formations || [];
  return '<div class="d faqCarteStat">' + echParcours(chiffresFaq(st)) + ' · 🎯 ' + echParcours(texteFormationsFaq(fo)) + '</div>';
}
/* Au-dessus des thèmes : la période, les plus lues, cherché sans réponse */
function blocStatsFaq(){
  const b = document.createElement('div');
  b.className = 'faqStats';
  b.style.cssText = 'border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:0 0 12px;font-size:13px;line-height:1.55;';
  const per = document.createElement('div');
  per.className = 'faqPeriode';
  per.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:10px;';
  [['30', '30 derniers jours'], ['tout', 'Depuis le début'], ['choix', '📅 Choisir les dates']].forEach(([v, n]) => {
    const bt = document.createElement('button');
    bt.type = 'button';
    bt.className = 'btn ' + (faqPeriodeEC.mode === v ? 'btn-primary' : 'btn-secondary');
    bt.style.cssText = 'width:auto;margin:0;padding:6px 12px;font-size:12.5px;min-height:0;';
    bt.dataset.faqPeriode = v;
    bt.textContent = n;
    bt.addEventListener('click', () => {
      faqPeriodeEC = Object.assign({}, faqPeriodeEC, { mode: v });
      if(v === 'choix' && !faqPeriodeEC.du){
        faqPeriodeEC.du = new Date(Date.now() - 30 * 86400000).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
        faqPeriodeEC.au = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
      }
      try{ localStorage.setItem('ec_faq_periode', JSON.stringify(faqPeriodeEC)); }catch(e){}
      chargerFaqStats();
      if(typeof dessinerParcours === 'function') dessinerParcours();
    });
    per.appendChild(bt);
  });
  if(faqPeriodeEC.mode === 'choix'){
    const mk = (k, lab) => {
      const l = document.createElement('label');
      l.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin:0;font-size:12.5px;text-transform:none;letter-spacing:0;font-weight:600;';
      l.textContent = lab;
      const i = document.createElement('input'); i.type = 'date'; i.value = faqPeriodeEC[k] || ''; i.dataset.faqDate = k;
      i.style.cssText = 'width:auto;margin:0;padding:5px 8px;';
      i.addEventListener('change', () => {
        faqPeriodeEC = Object.assign({}, faqPeriodeEC, { [k]: i.value });
        try{ localStorage.setItem('ec_faq_periode', JSON.stringify(faqPeriodeEC)); }catch(e){}
        chargerFaqStats();
      });
      l.appendChild(i);
      return l;
    };
    per.append(mk('du', 'du'), mk('au', 'au'));
  }
  b.appendChild(per);
  const g = document.createElement('div');
  g.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;';
  const l = (t, n) => '<div style="display:flex;justify-content:space-between;gap:8px;"><span style="min-width:0;">' + echParcours(t) + '</span><b style="white-space:nowrap;">' + echParcours(n) + '</b></div>';
  const top = faqStatsEC.plusLues || [];
  const ch = faqStatsEC.cherches || [];
  g.innerHTML = '<div class="faqPlusLues"><div style="font-weight:800;margin-bottom:6px;">👁️ Les plus lues · ' + echParcours(nomPeriodeFaq()) + '</div>' +
      (top.length ? top.map(x => l(x.titre || x.cle, x.eleves + ' élève' + (x.eleves > 1 ? 's' : '') + ' · ' + x.ouvertures)).join('')
                  : '<div style="color:var(--muted);">Aucune lecture sur cette période.</div>') +
      '<div style="color:var(--muted);font-size:12px;margin-top:4px;">Élèves différents · ouvertures. Un élève compte une fois par question dans « élèves ».</div></div>' +
    '<div class="faqCherches"><div style="font-weight:800;margin-bottom:6px;">🔎 Cherché sans réponse · ' + echParcours(nomPeriodeFaq()) + '</div>' +
      (ch.length ? ch.map(x => l('« ' + x.texte + ' »', x.fois + ' fois')).join('')
                 : '<div style="color:var(--muted);">Rien sur cette période.</div>') +
      '<div style="color:var(--muted);font-size:12px;margin-top:4px;">Ce que les élèves ont tapé sans rien trouver : les questions qui manquent. Sans leur nom.</div></div>';
  b.appendChild(g);
  return b;
}

/* Les premiers textes : tirés des publications du groupe Facebook
   (guides 3, 4, 5, 6, le message du 18/11 sur les applis, les rappels
   sur le NEPH, les horaires). Les vidéos se déposent ensuite dans
   chaque question, comme dans un guide. */
const FAQ_PREMIERS_THEMES = [
  { titre: '🚗 Ma formation', questions: [
    ['Comment se passe ma formation, du début à la fin ?',
     '[g]1. Le code[/g] : cours en salle, en visio ou en ligne sur Kopilote, puis l’examen du code.\n' +
     '[g]2. La théorie de la conduite[/g] : 3 heures en salle des tablettes, à réserver sur Drivup.\n' +
     '[g]3. La conduite[/g] : simulateur, écoutes pédagogiques et leçons en voiture.\n' +
     '[g]4. L’examen blanc[/g] : il dit combien d’heures il te reste avant le permis.\n' +
     '[g]5. Le permis[/g] : la date se donne quand tu as le niveau.\n\n' +
     'Entre chaque cours, tu travailles dans l’App : Réviser (les vidéos), Vérifs et Réciter.'],
    ['Résumé de la formation code',
     'Trois façons de suivre tes cours de code :\n' +
     '• [g]En salle[/g] : scanne le QR code de la séance avec ton téléphone, réponds aux questions, et tu vois tes erreurs à la fin de chaque série.\n' +
     '• [g]En visio[/g] : tu rejoins le cours depuis l’App, à l’heure de ta réservation.\n' +
     '• [g]En ligne[/g] : tes cours et tes tests se font sur l’application Kopilote.\n\n' +
     'Les cours de code en salle ou en visio se réservent sur Drivup.'],
    ['Résumé de la formation conduite',
     '• [g]La théorie de la conduite[/g] (3 h en salle des tablettes), à réserver sur Drivup.\n' +
     '• [g]Le simulateur[/g] : pour apprendre les bases (volant, pédales, vitesses).\n' +
     '• [g]Les écoutes pédagogiques[/g] : tu es à l’arrière pendant le cours d’un autre élève, tu regardes et tu écoutes.\n' +
     '• [g]Les leçons de conduite[/g] : à réserver sur Drivup. Avant chaque leçon, travaille ce que ton moniteur t’a demandé (bilan dans Réviser › Mes leçons).\n' +
     '• [g]Les vérifications[/g] : elles valent 3 points le jour de l’examen, entraîne-toi dans l’onglet Vérifs.\n' +
     '• [g]L’examen blanc[/g] : il décide des heures qu’il te reste avant le permis.'],
    ['C’est quoi « 6 + 3 » avant mon permis ?',
     'Après ton examen blanc, ton moniteur te dit combien d’heures il te reste, par exemple « 6 + 3 » :\n' +
     '• [g]6[/g] = 6 heures de leçons avant l’examen (3 leçons de 2 h) ;\n' +
     '• [g]+ 3[/g] = 2 heures la veille de l’examen + 1 heure le jour de l’examen.\n\n' +
     'Ces heures sont à réserver sur Drivup avant ton examen. Si tu ne trouves pas de créneau, écris-nous.'],
    ['Quand est-ce que je passe mon permis ?',
     'Quand tu as le niveau. Peu importe le nombre d’heures déjà faites : [g]sans le niveau, pas d’examen[/g] — on préfère rendre une place d’examen.\n\n' +
     'Pour y arriver plus vite : travaille ton code, tes procédures et tes vérifications entre les cours. Un cours peut être arrêté si le travail demandé n’a pas été fait.'],
    ['J’ai raté mon examen : qu’est-ce que je fais ?',
     'Pas de panique, ça arrive.\n' +
     '1. Remplis ton bilan dans l’App (onglet 📝 Bilan) : c’est obligatoire avant la suite.\n' +
     '2. On valide ton bilan, puis tu prends ton rendez-vous post-permis sur Drivup.\n' +
     '3. On fait le point ensemble sur les heures à refaire avant de repasser.'],
    ['J’ai eu mon permis : et maintenant ?',
     '• Télécharge ton certificat d’examen (CEPC) depuis ton espace Rendez-vous Permis : avec ta pièce d’identité, il vaut permis pendant 4 mois.\n' +
     '• Demande ton titre définitif sur le site de l’ANTS (gratuit), ou on s’en occupe pour 45 €.\n' +
     '• Passe récupérer ton disque A au bureau.\n' +
     '• Tu as 30 minutes de conduite offertes dans ta propre voiture.\n' +
     '• Pense à supprimer le mandat dans ton espace Rendez-vous Permis.\n' +
     '• Tu commences avec 6 points : la formation post-permis (entre 6 et 12 mois après) réduit ta période probatoire.'] ] },

  { titre: '📋 Administratif', questions: [
    ['C’est quoi le NEPH ?',
     'Le [g]NEPH[/g], c’est ton numéro d’inscription au permis de conduire. Tu l’as quand ton dossier d’inscription est validé par l’ANTS.\n\n' +
     '[g]Sans NEPH, pas de place d’examen[/g] : ni pour le code, ni pour la conduite.\n\n' +
     'Vérifie qu’il s’affiche sur l’accueil de ton compte Drivup.'],
    ['Qui fait mon dossier ANTS ?',
     'Deux cas :\n' +
     '• [g]C’est nous[/g] (option à 45 €, visible dans tes factures Drivup) : donne-nous toutes tes pièces. S’il en manque une, on te le dit.\n' +
     '• [g]C’est toi[/g] : fais ta demande sur le site de l’ANTS et envoie-nous ton NEPH dès que tu l’as, depuis l’onglet Écrire.'],
    ['Pourquoi installer France Identité ?',
     'France Identité est l’application officielle de l’État : ta carte d’identité (et plus tard ton permis) sur ton téléphone, en toute sécurité.\n\n' +
     'Si tu perds tes papiers juste avant l’examen, tu peux quand même le passer avec France Identité.\n\n' +
     'Il te faut une carte d’identité au format carte bancaire et un téléphone compatible (Android 11+ ou iOS 16+ avec NFC).\n' +
     '[france-identite.gouv.fr](https://france-identite.gouv.fr/)'],
    ['Comment payer ma formation ? Il y a des aides ?',
     'Plusieurs solutions existent : le CPF, le permis à 1 € par jour, l’aide de la Région Bretagne, des aides pour certains apprentis, et le paiement en plusieurs fois.\n\n' +
     'Si un financement est en cours pour toi, tu le suis sur l’accueil de l’App (carte 💶 Mon financement). Sinon, demande-nous depuis l’onglet Écrire : on regarde ce qui marche pour toi.'] ] },

  { titre: '📱 Drivup, l’App et Kopilote', questions: [
    ['À quoi sert chaque application ?',
     '• [g]Drivup[/g] : acheter et réserver tes cours (code et conduite), voir tes factures et ton livret d’apprentissage.\n' +
     '• [g]Kopilote[/g] : réviser ton code de la route en ligne.\n' +
     '• [g]L’App Évolution Conduites[/g] (celle-ci) : tout le reste — tes révisions, tes bilans, la messagerie avec l’équipe, les jeux.'],
    ['Comment réserver mes cours sur Drivup ?',
     'Va dans ton espace élève Drivup (bouton « 📅 Réserver mes cours sur Drivup » sur l’accueil de l’App), puis :\n' +
     '1. Achète les cours qu’il te faut (s’ils ne sont pas déjà dans ta formule).\n' +
     '2. Touche « Planifier » et choisis un créneau.\n\n' +
     'Leçons, écoutes pédagogiques, simulateur, théorie en salle, code en salle ou en visio : tout se réserve là. Tes cours apparaissent ensuite dans l’App.\n' +
     'Tu ne trouves pas de créneau (en boîte manuelle surtout) ? Écris-nous.'],
    ['Comment marche l’App Évolution Conduites ?',
     'Tes identifiants (ton prénom et ton nom + ton code personnel) t’ont été envoyés par mail.\n' +
     '• [g]Accueil[/g] : ton prochain cours, ta dernière leçon, les bureaux.\n' +
     '• [g]Réviser[/g] : les vidéos et guides (groupes de travail), et le bilan de chacune de tes leçons.\n' +
     '• [g]Vérifs[/g] : le jeu des vérifications intérieures et extérieures.\n' +
     '• [g]Réciter[/g] : tes procédures à réciter au micro, corrigées par l’équipe.\n' +
     '• [g]Écrire[/g] : la messagerie avec le bureau.\n\n' +
     'Tout ne s’affiche pas pour tout le monde : l’école ouvre ce qui correspond à ta formation. S’il te manque quelque chose, demande-le depuis Écrire.'],
    ['Comment mettre l’App sur mon téléphone et activer les notifications ?',
     'Sur l’accueil de l’App, un bandeau te le propose avec un bouton. Sinon :\n' +
     '• [g]Android (Chrome)[/g] : menu ⋮ › « Ajouter à l’écran d’accueil ».\n' +
     '• [g]iPhone (Safari)[/g] : bouton Partager › « Sur l’écran d’accueil ».\n\n' +
     'Active les notifications : tu sais tout de suite quand on te répond.'],
    ['J’ai perdu mon code de l’App',
     'Pas grave : écris-nous (ou appelle le bureau) et on te le renvoie.'],
    ['Kopilote : c’est quoi ?',
     'Kopilote, c’est l’application de code en ligne : tes cours et tes tests de code, quand tu veux, où tu veux.\n' +
     'Un souci de connexion ou un test qui ne se lance pas ? Écris-nous depuis l’onglet Écrire.'] ] },

  { titre: '⏰ Au quotidien', questions: [
    ['Les horaires du bureau',
     'Du [g]lundi au samedi, de 10 h à 18 h[/g].\n' +
     'Certains créneaux se réservent seulement en ligne, de 9 h à 10 h et de 18 h à 19 h (code, tablettes, simulateur en autonomie…).\n\n' +
     'Les horaires de la semaine de chaque bureau sont sur l’accueil de l’App (carte 🕒 Les bureaux).'],
    ['Je dois annuler ou décaler un cours',
     'Préviens-nous [g]au moins 48 heures avant[/g] : un cours non décommandé 48 h avant est dû.\n' +
     'Dans l’App : onglet Écrire › « Annuler ou décaler ».'],
    ['Je suis en retard',
     'Préviens-nous tout de suite : onglet Écrire › « En retard ».\n' +
     'Pour une urgence dans l’heure, appelle le bureau.\n\n' +
     'Une écoute pédagogique ne t’attend pas : en retard, tu la manques.'],
    ['C’est quoi une écoute pédagogique ?',
     'Tu es assis(e) à l’arrière pendant le cours de conduite d’un autre élève : tu regardes, tu écoutes les explications du moniteur, et tu apprends beaucoup.\n\n' +
     'Elles se réservent sur Drivup. Si tu es absent(e) sans prévenir, 5 € TTC sont facturés.'],
    ['J’ai oublié quelque chose dans la voiture',
     'Onglet Écrire › « Objet oublié » (ta carte SD, par exemple) : en un seul appui, on prévient le moniteur.'] ] }
];

function blocsDuThemeFaq(t){
  const blocs = [];
  t.questions.forEach((q, i) => {
    blocs.push({ type: 'titre', titre: q[0], texte: '', fichier: '', id: 't' + (i + 1) });
    blocs.push({ type: 'texte', titre: '', texte: q[1], fichier: '' });
  });
  return blocs;
}

/* L'écran vide : créer la FAQ avec les premiers textes */
function dessinerFaqVide(zone){
  zone.innerHTML = '';
  const c = document.createElement('div');
  c.className = 'faqVide';
  c.style.cssText = 'border:1px dashed var(--line);border-radius:14px;padding:16px;max-width:620px;';
  const n = FAQ_PREMIERS_THEMES.reduce((a, t) => a + t.questions.length, 0);
  c.innerHTML = '<div style="font-size:15px;font-weight:800;margin-bottom:8px;">❓ La FAQ n’existe pas encore</div>' +
    '<div style="font-size:13px;line-height:1.6;color:var(--muted);margin-bottom:10px;">Elle se crée avec ' + FAQ_PREMIERS_THEMES.length +
    ' thèmes et ' + n + ' questions déjà rédigés d’après le groupe Facebook — <b>en brouillon</b> : rien ne part chez les élèves tant que tu n’as pas relu et publié un thème. ' +
    'Tu ajoutes ensuite les vidéos et les images dans chaque question.</div>' +
    '<ul style="font-size:13px;line-height:1.6;margin:0 0 12px 18px;padding:0;">' +
    FAQ_PREMIERS_THEMES.map(t => '<li><b>' + echParcours(t.titre) + '</b> · ' + t.questions.length + ' questions</li>').join('') + '</ul>';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-primary faqCreer';
  b.style.cssText = 'width:auto;padding:11px 16px;font-size:13.5px;';
  b.textContent = '➕ Créer la FAQ avec ces premiers textes';
  b.addEventListener('click', async () => {
    b.disabled = true;
    b.textContent = '⏳ Création… (une dizaine de secondes)';
    try{
      const rep = await appelPrep({ action: 'faqCreer', nom: 'Questions fréquentes',
        themes: FAQ_PREMIERS_THEMES.map(t => ({ titre: t.titre, blocs: blocsDuThemeFaq(t) })) });
      if(!rep || rep.status !== 'ok') throw new Error((rep && rep.message) || 'refusé');
      if(rep.options) parcoursOptions = rep.options;
      if(rep.id) parcoursGroupeOuvert = rep.id;
      showToast('❓ FAQ créée : ' + (rep.themes || 0) + ' thèmes en brouillon ✅');
      afficherFaqEquipe();
    }catch(e){
      showToast('Impossible : ' + ((e && e.message) || e));
      b.disabled = false;
      b.textContent = '➕ Créer la FAQ avec ces premiers textes';
    }
  });
  c.appendChild(b);
  zone.appendChild(c);
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-faq.js'] = true;
