/* Déployé le 07/11/2026 à 15:10 — v1380 */
/* ============================================================
   ec-relances.js — 📨 LES RELANCES DE L'ONGLET PERMIS — v1380

   David, le 7 novembre : « un nouveau sous-onglet relance sous à
   envisager : un bouton pour relancer ceux qui n'ont pas fait encore
   le bilan post, choisir à qui j'envoie et comment (mail et
   messagerie), modifier le message et qu'il soit personnalisé ; un
   autre bouton sur le même principe pour ceux qui n'ont pas réservé
   leur rendez-vous post-permis, et un autre pour les repassages. Pour
   tous il faut que je voie à qui j'envoie avec les infos. »

   Ses réponses au schéma (partagé à sa collègue) :
   · repassages = RDV post-permis fait + repassage décidé + aucune
     leçon réservée, ET ceux qui sont dans À envisager › 🔁 Repassages ;
   · les mails partent de la boîte de l'école, avec la signature de
     celui qui envoie ;
   · pas de délai imposé entre deux relances, mais on voit la
     dernière (colonne 122 « relances » du suivi) ;
   · les messages de départ vivent dans Outils › Ce qu'on écrit
     (usages relance_bilan, relance_rdv, relance_repassage). La
     première ligne « Objet : … » donne l'objet du mail.
   ============================================================ */

const RL_TYPES = {
  bilan: {
    ic: '📝', titre: 'Bilan post-permis à faire', usage: 'relance_bilan',
    sous: 'Ajournés qui n’ont pas encore envoyé leur bilan (ou à refaire)',
    defaut: "Objet : Ton bilan post-permis\n\nBonjour {prenom},\n\nOn n’a pas encore reçu ton bilan post-permis suite à ton examen du {dateexamen}. C’est lui qui nous permet de préparer ton rendez-vous post-permis et de te faire repasser au plus vite.\n\nTu peux l’écrire directement dans ton espace élève : {lien}\n\nÀ très vite,\n{signature}"
  },
  rdv: {
    ic: '📅', titre: 'RDV post-permis à réserver', usage: 'relance_rdv',
    sous: 'Bilan reçu, mais pas encore de rendez-vous post-permis',
    defaut: "Objet : Ton rendez-vous post-permis\n\nBonjour {prenom},\n\nOn a bien reçu ton bilan, merci 👍 Il te reste à réserver ton rendez-vous post-permis (30 min, au bureau ou en visio).\n\nDrivup > Réserver > Pratique > Prestations pratique > Rendez-vous post-permis > Acheter > Planifier\n\nÀ très vite,\n{signature}"
  },
  repass: {
    ic: '🔁', titre: 'Repassages à relancer', usage: 'relance_repassage',
    sous: 'Repassage décidé, mais aucune leçon réservée — et les prêts à repasser',
    defaut: "Objet : On prépare ton repassage\n\nBonjour {prenom},\n\nOn prépare ton repassage du permis. Il te reste {heures} de conduite avant de pouvoir repasser : pense à les réserver sur Drivup dès maintenant, les places d’examen partent vite.\n\nÀ très vite,\n{signature}"
  }
};
const RL_LIEN = 'https://eleve.evolutionconduites.fr';

let rlTous = [];                 /* la liste du bureau, posée par afficherBureau */
let rlCoursDrivup = { lu: 0, liste: [] };
let rlFondEssaye = 0;            /* les lectures de fond, au plus une fois toutes les 2 min */

/* ---------- petites aides ---------- */
function rlEch(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function rlNorm(n){ return (typeof normaliserMot === 'function') ? normaliserMot(String(n || '')) : String(n || '').trim().toLowerCase(); }
function rlCleTriee(n){ return rlNorm(n).split(/\s+/).filter(Boolean).sort().join(' '); }
function rlSuivi(nom){ return (typeof suiviDe === 'function' && suiviDe(nom)) || {}; }
function rlRelances(nom){
  try{ const o = JSON.parse(rlSuivi(nom).relances || '{}'); return (o && typeof o === 'object') ? o : {}; }catch(e){ return {}; }
}
/* « 07/11/2026 14:02 » ou ISO → « 07/11 » */
function rlJour(v){
  const t = String(v || '');
  let m = t.match(/^(\d{2})\/(\d{2})/); if(m) return m[1] + '/' + m[2];
  m = t.match(/^\d{4}-(\d{2})-(\d{2})/); if(m) return m[2] + '/' + m[1];
  return t;
}
function rlMaintenant(){
  const d = new Date(), z = x => String(x).padStart(2, '0');
  return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
}
function rlMoi(){ return (typeof ACCES !== 'undefined' && ACCES && (ACCES.moniteur || ACCES.nom)) || ''; }
function rlTexteRelance(nom, type){
  const r = rlRelances(nom)[type];
  if(!r || !r.n) return 'jamais relancé';
  return 'relancé ' + r.n + ' fois (dernière le ' + rlJour(r.le) + (r.par ? ' par ' + r.par : '') + ')';
}
function rlCentre(nom){
  const s = rlSuivi(nom);
  return String(s.centre || '').trim() || ((typeof centreDeBase === 'function') ? centreDeBase(nom) : '');
}
function rlAjournements(s){ const n = Number(s.nbAjournements || 0); return n ? n + ' ajournement' + (n > 1 ? 's' : '') : ''; }
function rlLigneAjourne(nom){
  const s = rlSuivi(nom);
  return [s.dateAjournement ? 'Ajourné(e) le ' + rlJour(s.dateAjournement) : 'Ajourné(e)', rlCentre(nom), rlAjournements(s)].filter(Boolean).join(' · ');
}
function rlHeures(nom){
  if(typeof heuresQuiComptent !== 'function') return '';
  const v = heuresQuiComptent(nom).valeur;
  if(String(v) === '') return '';
  return (typeof motsDeLaReserve === 'function') ? motsDeLaReserve(v, false) : v + ' h';
}
function rlEmail(nom){ const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null; return String((f && f.email) || '').trim(); }
/* La messagerie de l'appli ne sert que s'il a déjà son code (venu ou accès envoyé) */
function rlAppli(nom){
  const e = (typeof etatAccesDe === 'function') ? etatAccesDe(nom) : null;
  return !!(e && (e.k === 'venu' || e.k === 'envoye'));
}
/* Sa prochaine leçon Drivup (hors examen et hors RDV post-permis) */
function rlProchaineLecon(nom){
  const k = rlCleTriee(nom);
  return rlCoursDrivup.liste.find(c => rlCleTriee(c.eleve) === k && !/post.?permis|examen/i.test(c.libelle || '')) || null;
}
async function rlLireCoursDrivup(){
  if(Date.now() - rlCoursDrivup.lu < 120000) return;
  try{
    const d = await appelPrep({ action: 'relancesCoursAVenir' });
    rlCoursDrivup = { lu: Date.now(), liste: (d && d.cours) || [] };
  }catch(e){ /* sans la lecture, personne n'est grisé pour une leçon */ }
}

/* ---------- qui est dans chaque relance ---------- */
function rlAjourneEnCours(s){ return s.resultat === 'ajourne' && s.rdvPostFait !== 'oui' && !String(s.rdvPostDate || '').trim(); }
function rlCandidats(type){
  const out = [], vus = new Set();
  const ajouter = (nom, o) => { const k = rlNorm(nom); if(vus.has(k)) return; vus.add(k); out.push(Object.assign({ nom: nom }, o)); };
  rlTous.forEach(e => {
    const nom = e.eleve, s = rlSuivi(nom);
    const etat = String(s.bilanEleveEtat || '');
    const aBilan = !!String(s.bilanEleve || '').trim() || etat === 'valide';
    if(type === 'bilan' && rlAjourneEnCours(s) &&
       (etat === 'arefaire' || (!String(s.bilanEleve || '').trim() && etat !== 'attente' && etat !== 'valide'))){
      ajouter(nom, { l1: rlLigneAjourne(nom),
        l2: 'Bilan : ' + (etat === 'arefaire' ? 'à refaire' : 'rien envoyé') + ' · ' + rlTexteRelance(nom, type) });
    }
    if(type === 'rdv' && rlAjourneEnCours(s) && aBilan){
      const d = (typeof rdvDrivupDe === 'function') ? rdvDrivupDe(nom) : null;
      if(d) ajouter(nom, { l1: rlLigneAjourne(nom), gris: true,
        l2: 'RDV Drivup trouvé le ' + rlJour(d.jour) + (d.debut ? ' à ' + d.debut : '') + ' — déjà pris, pas besoin de relancer' });
      else ajouter(nom, { l1: rlLigneAjourne(nom),
        l2: ['Bilan reçu' + (s.bilanEleveValideLe ? ' (validé le ' + rlJour(s.bilanEleveValideLe) + ')' : ''),
             s.rdvPostMessagesLe ? 'messages partis le ' + rlJour(s.rdvPostMessagesLe) : 'messages pas encore partis',
             rlTexteRelance(nom, type)].join(' · ') });
    }
    if(type === 'repass'){
      const aDate = (typeof dateExamenAVenir === 'function') && dateExamenAVenir(nom);
      if(aDate) return;
      const h = rlHeures(nom);
      /* ① RDV post-permis fait, repassage décidé */
      if(s.rdvPostFait === 'oui' && (s.suite === '3h' || s.suite === '2h')){
        const l = rlProchaineLecon(nom);
        const suite = (typeof libelleSuite === 'function') ? libelleSuite(s.suite) : s.suite;
        ajouter(nom, { gris: !!l,
          l1: 'RDV post-permis' + (s.rdvPostDate ? ' le ' + rlJour(s.rdvPostDate) : '') + (s.rdvPostMoniteur ? ' avec ' + s.rdvPostMoniteur : '') + (suite ? ' · « ' + suite + ' »' : ''),
          l2: [h ? h + ' à faire' : '', l ? 'leçon réservée le ' + rlJour(l.jour) + (l.debut ? ' à ' + l.debut : '') + ' — pas besoin de relancer' : 'aucune leçon réservée',
               (!l && e.date) ? 'dernière leçon le ' + rlJour(e.date) : '', l ? '' : rlTexteRelance(nom, type)].filter(Boolean).join(' · ') });
        return;
      }
      /* ② dans À envisager › 🔁 Repassages */
      if(Number(s.nbAjournements || 0) > 0 && typeof estPretAuPermis === 'function' && estPretAuPermis(e) &&
         !(typeof masquePretAuPermis === 'function' && masquePretAuPermis(e))){
        ajouter(nom, { l1: 'Prêt à repasser — dans À envisager › 🔁 Repassages · ' + [rlCentre(nom), rlAjournements(s)].filter(Boolean).join(' · '),
          l2: [h ? h : '', e.date ? 'dernière leçon le ' + rlJour(e.date) : '', rlTexteRelance(nom, type)].filter(Boolean).join(' · ') });
      }
    }
  });
  return out;
}
function rlDerniereDuType(type){
  let mieux = null;
  rlTous.forEach(e => {
    const r = rlRelances(e.eleve)[type];
    if(!r || !r.le) return;
    const cle = String(r.le).replace(/^(\d{2})\/(\d{2})\/(\d{4})/, '$3$2$1');
    if(!mieux || cle > mieux.cle) mieux = { cle: cle, le: r.le, par: r.par };
  });
  return mieux ? rlJour(mieux.le) + (mieux.par ? ' par ' + mieux.par : '') : 'jamais';
}

/* ---------- la vue : les trois tuiles ---------- */
function afficherRelances(tous){
  if(Array.isArray(tous)) rlTous = tous;
  const z = document.getElementById('relancesZone');
  if(!z) return;
  rlStyle();
  z.innerHTML = '';
  const aide = document.createElement('div');
  aide.className = 'rlAide';
  aide.textContent = 'Trois relances, chacune avec la liste de ceux qui sont concernés. Un appui ouvre la fenêtre : tu choisis à qui, par mail et/ou par la messagerie de l’appli, et tu modifies le message avant qu’il parte — il est personnalisé pour chacun.';
  z.appendChild(aide);
  const g = document.createElement('div');
  g.className = 'rlTuiles';
  let total = 0;
  Object.keys(RL_TYPES).forEach(type => {
    const t = RL_TYPES[type];
    const n = rlCandidats(type).filter(x => !x.gris).length;
    total += n;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rlTuile';
    b.dataset.relance = type;
    b.innerHTML = '<span class="rlTic">' + t.ic + '</span>' +
      '<span class="rlTtx"><b>' + rlEch(t.titre) + '</b><small>' + rlEch(t.sous) + '</small><em>Dernière relance : ' + rlEch(rlDerniereDuType(type)) + '</em></span>' +
      '<span class="rlTn' + (n ? '' : ' zero') + '">' + n + '</span><span class="rlTgo">Relancer ›</span>';
    b.addEventListener('click', () => ouvrirRelance(type));
    g.appendChild(b);
  });
  z.appendChild(g);
  rlPoserLeCompte(total);
  /* Les chiffres dépendent de Drivup (leçons réservées, RDV post-permis
     déjà pris) : on les lit en fond, puis on recompte une fois. */
  if(Date.now() - rlFondEssaye > 120000){
    rlFondEssaye = Date.now();
    const l = [rlLireCoursDrivup()];
    if(typeof chargerRdvPostDrivup === 'function' && !(typeof rdvPostDrivupFrais === 'function' && rdvPostDrivupFrais())) l.push(chargerRdvPostDrivup());
    Promise.all(l.map(x => Promise.resolve(x).catch(() => {}))).then(() => afficherRelances());
  }
}
/* Le chiffre sur le bouton du rail. ⚠️ PAS poserCompteVue : il ajouterait ce
   nombre à la pastille de l'onglet Permis, qui dit déjà autre chose. */
function rlPoserLeCompte(n){
  const b = document.querySelector('.barre-vues[data-pour="permis"] button[data-vue-cible="relances"]');
  if(!b) return;
  let p = b.querySelector('.compte-vue');
  if(!n){ if(p) p.remove(); return; }
  if(!p){
    p = document.createElement('span');
    p.className = 'compte-vue';
    p.style.cssText = 'display:inline-block;margin-left:6px;min-width:18px;padding:0 5px;border-radius:9px;background:var(--orange);color:#0B0B0B;font-size:11px;font-weight:800;line-height:18px;text-align:center;';
    b.appendChild(p);
  }
  p.textContent = n > 99 ? '99+' : String(n);
}

/* ---------- le message : modèle, objet, variables ---------- */
function rlModele(type){
  const t = RL_TYPES[type];
  const m = (typeof modelesTexte !== 'undefined' ? modelesTexte : []).find(x => x.usage === t.usage && String(x.contenu || '').trim());
  const brut = m ? String(m.contenu) : t.defaut;
  const o = brut.match(/^\s*Objet\s*:\s*(.*)\n+/i);
  return { objet: o ? o[1].trim() : t.titre, texte: o ? brut.slice(o[0].length) : brut };
}
function rlRemplir(texte, nom, signature){
  const s = rlSuivi(nom);
  const prenom = String(nom || '').split(' ')[0];
  const dEx = s.dateAjournement || '';
  const dateEx = dEx ? ((typeof dateEnToutesLettres === 'function' && /^\d{4}-\d{2}-\d{2}/.test(dEx)) ? dateEnToutesLettres(dEx) : rlJour(dEx)) : 'ton dernier examen';
  return String(texte || '')
    .replace(/\{pr[ée]nom\}/gi, prenom)
    .replace(/\{eleve\}/gi, nom)
    .replace(/\{dateexamen\}|\{date d[’']examen\}/gi, dateEx)
    .replace(/\{heures\}|\{heures à faire\}/gi, rlHeures(nom) || 'quelques heures')
    .replace(/\{lien\}|\{lien de son espace\}/gi, RL_LIEN)
    .replace(/\{centre\}/gi, rlCentre(nom))
    .replace(/\{signature\}/gi, signature == null ? '' : signature);
}
function rlSignatureTexte(){ const m = rlMoi(); return (m ? m + ' — ' : '') + 'Évolution Conduites'; }
function rlEnHtml(t){
  return String(t || '').trim().split(/\n{2,}/).map(p => '<div>' + rlEch(p).replace(/\n/g, '<br>') + '</div>').join('<div><br></div>');
}
async function rlSignatureHtml(){
  if(typeof mlLireLesSignatures !== 'function' || typeof mlHtmlDeLaSignature !== 'function' || typeof mlMaCle !== 'function') return '';
  const l = await mlLireLesSignatures();
  const s = (l || []).find(x => x.qui === mlMaCle());
  if(!s) return '';
  /* même préparation que l'éditeur de mail : le logo part DANS le mail */
  const d = document.createElement('div');
  d.innerHTML = mlHtmlDeLaSignature(s);
  d.querySelectorAll('img[data-ec-cle]').forEach(im => { im.setAttribute('src', 'ec-cle:' + im.getAttribute('data-ec-cle')); im.removeAttribute('data-ec-cle'); });
  d.querySelectorAll('.mlSignature').forEach(x => { x.removeAttribute('class'); x.removeAttribute('data-sig'); });
  return d.innerHTML;
}

/* ---------- la fenêtre ---------- */
async function ouvrirRelance(type){
  const t = RL_TYPES[type];
  if(!t) return;
  rlStyle();
  if(typeof styleLignesCompactes === 'function') styleLignesCompactes();
  const fond = document.createElement('div');
  fond.className = 'overlay show lcO';
  const boite = document.createElement('div');
  boite.className = 'modal lcFen rlFen';
  boite.innerHTML = '<div class="empty">Lecture…</div>';
  fond.appendChild(boite);
  fond.addEventListener('click', ev => { if(ev.target === fond) fond.remove(); });
  document.body.appendChild(fond);

  /* ce qu'il faut pour décider, lu à l'ouverture */
  const attentes = [];
  if(typeof chargerModelesTexte === 'function') attentes.push(chargerModelesTexte());
  if(typeof chargerEtatAcces === 'function') attentes.push(chargerEtatAcces());
  if(type === 'rdv' && typeof chargerRdvPostDrivup === 'function') attentes.push(chargerRdvPostDrivup());
  if(type === 'repass') attentes.push(rlLireCoursDrivup());
  await Promise.all(attentes.map(p => Promise.resolve(p).catch(() => {})));

  const gens = rlCandidats(type);
  const pris = new Set(gens.filter(g => !g.gris).map(g => g.nom));
  const canal = { mail: true, appli: true };
  const mod = rlModele(type);
  let vu = 0;

  boite.innerHTML = '';
  const tete = document.createElement('div');
  tete.className = 'lcTete';
  tete.innerHTML = '<h3>' + t.ic + ' Relancer — ' + rlEch(t.titre) + '</h3>';
  const bx = document.createElement('button');
  bx.type = 'button'; bx.className = 'btn btn-secondary rlX'; bx.textContent = '✕';
  bx.addEventListener('click', () => fond.remove());
  tete.appendChild(bx);
  boite.appendChild(tete);

  if(!gens.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = '🎉 Personne à relancer pour le moment.';
    boite.appendChild(v);
    return;
  }

  /* ① à qui */
  const e1 = rlEtape(1, 'À qui ?');
  const compte = document.createElement('small');
  e1.appendChild(compte);
  const tout = document.createElement('button');
  tout.type = 'button'; tout.className = 'rlMini';
  e1.appendChild(tout);
  boite.appendChild(e1);
  const liste = document.createElement('div');
  liste.className = 'rlListe';
  gens.forEach(g => {
    const l = document.createElement('label');
    l.className = 'rlL' + (g.gris ? ' gris' : '');
    const c = document.createElement('input');
    c.type = 'checkbox'; c.checked = pris.has(g.nom);
    c.addEventListener('change', () => { if(c.checked) pris.add(g.nom); else pris.delete(g.nom); vu = 0; maj(); });
    const tx = document.createElement('span');
    tx.className = 'rlLt';
    tx.innerHTML = '<b>' + rlEch(g.nom) + '</b><span>' + rlEch(g.l1) + '</span><span>' + rlEch(g.l2) + '</span>';
    const mail = rlEmail(g.nom), appli = rlAppli(g.nom);
    const cn = document.createElement('span');
    cn.className = 'rlCan';
    cn.innerHTML = '<span class="rlC ' + (mail ? 'ok' : 'non') + '" title="' + rlEch(mail || 'pas d’adresse mail dans sa fiche') + '">✉️ ' + (mail ? 'mail' : 'pas de mail') + '</span>' +
                   '<span class="rlC ' + (appli ? 'ok' : 'non') + '">💬 ' + (appli ? 'appli' : 'pas d’accès') + '</span>';
    l.append(c, tx, cn);
    liste.appendChild(l);
  });
  boite.appendChild(liste);
  tout.addEventListener('click', () => {
    const tous = gens.every(g => pris.has(g.nom));
    gens.forEach(g => { if(tous) pris.delete(g.nom); else pris.add(g.nom); });
    liste.querySelectorAll('input[type=checkbox]').forEach((c, i) => { c.checked = pris.has(gens[i].nom); });
    vu = 0; maj();
  });

  /* ② comment */
  boite.appendChild(rlEtape(2, 'Comment ?'));
  const canaux = document.createElement('div');
  canaux.className = 'rlCanaux';
  const sw = (cle, titre) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'lcSw on';
    b.innerHTML = '<span class="t">' + titre + '<small></small></span><span class="s"></span>';
    b.addEventListener('click', () => { canal[cle] = !canal[cle]; b.classList.toggle('on', canal[cle]); maj(); });
    canaux.appendChild(b);
    return b;
  };
  const swMail = sw('mail', '✉️ Par mail');
  const swAppli = sw('appli', '💬 Messagerie de l’appli');
  boite.appendChild(canaux);

  /* ③ le message */
  const e3 = rlEtape(3, 'Le message');
  const s3 = document.createElement('small');
  s3.textContent = 'modifiable · personnalisé pour chacun';
  e3.appendChild(s3);
  boite.appendChild(e3);
  const lo = document.createElement('label');
  lo.className = 'rlLab'; lo.textContent = 'Objet du mail';
  const objet = document.createElement('input');
  objet.type = 'text'; objet.className = 'rlObjet'; objet.value = mod.objet;
  const ta = document.createElement('textarea');
  ta.className = 'rlTexte'; ta.value = mod.texte;
  boite.append(lo, objet, ta);
  const vars = document.createElement('div');
  vars.className = 'rlVars';
  vars.innerHTML = '<span>Insérer :</span>';
  ['{prenom}', '{dateexamen}', '{heures}', '{lien}', '{centre}', '{signature}'].forEach(v => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = v;
    b.addEventListener('click', () => {
      const a = ta.selectionStart || ta.value.length, z = ta.selectionEnd || a;
      ta.value = ta.value.slice(0, a) + v + ta.value.slice(z);
      ta.focus(); ta.selectionStart = ta.selectionEnd = a + v.length;
      maj();
    });
    vars.appendChild(b);
  });
  const note = document.createElement('span');
  note.className = 'rlVarNote';
  note.textContent = 'Le message de départ se change pour toujours dans Outils › Ce qu’on écrit.';
  vars.appendChild(note);
  boite.appendChild(vars);
  const ap = document.createElement('div');
  ap.className = 'rlApercu';
  boite.appendChild(ap);
  ta.addEventListener('input', () => maj());
  objet.addEventListener('input', () => maj());

  /* le pied */
  const pied = document.createElement('div');
  pied.className = 'rlPied';
  const etat = document.createElement('span');
  etat.className = 'rlNote';
  etat.textContent = 'Une fois parti : « relancé le ' + rlJour(rlMaintenant()) + ' par ' + (rlMoi() || 'toi') + ' » s’inscrit sur chaque élève.';
  const bA = document.createElement('button');
  bA.type = 'button'; bA.className = 'btn btn-secondary'; bA.textContent = 'Annuler';
  bA.addEventListener('click', () => fond.remove());
  const bOk = document.createElement('button');
  bOk.type = 'button'; bOk.className = 'btn btn-primary';
  pied.append(etat, bA, bOk);
  boite.appendChild(pied);

  function choisis(){ return gens.filter(g => pris.has(g.nom)); }
  function maj(){
    const l = choisis();
    compte.textContent = l.length + ' sur ' + gens.length + ' coché' + (l.length > 1 ? 's' : '');
    tout.textContent = gens.every(g => pris.has(g.nom)) ? 'Tout décocher' : 'Tout cocher';
    const nM = l.filter(g => rlEmail(g.nom)).length, nA = l.filter(g => rlAppli(g.nom)).length;
    swMail.querySelector('small').textContent = nM + ' sur ' + l.length + ' ont une adresse' + (nM < l.length ? ' — les autres ne le recevront pas par mail' : '');
    swAppli.querySelector('small').textContent = nA + ' sur ' + l.length + ' ont accès à leur espace';
    const joignables = l.filter(g => (canal.mail && rlEmail(g.nom)) || (canal.appli && rlAppli(g.nom)));
    bOk.disabled = !joignables.length;
    bOk.textContent = '📨 Envoyer à ' + joignables.length + ' élève' + (joignables.length > 1 ? 's' : '');
    /* l'aperçu : le texte exact que reçoit chacun */
    ap.innerHTML = '';
    if(!l.length){ ap.innerHTML = '<div class="rlApT">Personne n’est coché.</div>'; return; }
    if(vu >= l.length) vu = 0;
    const g = l[vu];
    const tt = document.createElement('div');
    tt.className = 'rlApT';
    tt.innerHTML = '👁️ Aperçu pour <b>' + rlEch(g.nom) + '</b>';
    const nav = document.createElement('span');
    nav.className = 'rlNav';
    const av = document.createElement('button'); av.type = 'button'; av.textContent = '‹';
    const ar = document.createElement('button'); ar.type = 'button'; ar.textContent = '›';
    av.addEventListener('click', () => { vu = (vu - 1 + l.length) % l.length; maj(); });
    ar.addEventListener('click', () => { vu = (vu + 1) % l.length; maj(); });
    nav.append(av, document.createTextNode(' ' + (vu + 1) + ' / ' + l.length + ' '), ar);
    tt.appendChild(nav);
    const ob = document.createElement('div');
    ob.className = 'rlApO';
    ob.textContent = 'Objet : ' + rlRemplir(objet.value, g.nom, '');
    const bd = document.createElement('div');
    bd.className = 'rlApB';
    bd.textContent = rlRemplir(ta.value, g.nom, rlSignatureTexte());
    ap.append(tt, ob, bd);
  }
  maj();

  bOk.addEventListener('click', async () => {
    const l = choisis();
    if(!l.length) return;
    const texte = ta.value, sujet = objet.value.trim();
    if(!texte.trim()){ if(typeof showToast === 'function') showToast('Le message est vide.'); return; }
    bOk.disabled = true; bA.disabled = true;
    const sigHtml = canal.mail ? await rlSignatureHtml() : '';
    let nMail = 0, nAppli = 0, i = 0;
    const injoignables = [], rates = [];
    for(const g of l){
      i++;
      bOk.textContent = '📨 Envoi ' + i + ' / ' + l.length + '…';
      const mail = canal.mail ? rlEmail(g.nom) : '';
      const appli = canal.appli && rlAppli(g.nom);
      if(!mail && !appli){ injoignables.push(g.nom); continue; }
      const via = [];
      if(mail){
        try{
          /* le corps sans {signature} : la vraie signature (avec son logo) suit */
          const corps = rlEnHtml(rlRemplir(texte, g.nom, '').replace(/\n+$/, ''));
          const r = await appelPrep({ action: 'mailEnvoyer', a: [{ nom: g.nom, adresse: mail }], cc: [], cci: [],
            sujet: rlRemplir(sujet, g.nom, ''), html: corps + (sigHtml ? '<div><br></div>' + sigHtml : '<div><br></div><div>' + rlEch(rlSignatureTexte()) + '</div>'),
            pieces: [], fil: 0, repondA: 0, mode: 'nouveau', brouillon: '', eleve: g.nom });
          if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
          via.push('mail'); nMail++;
        }catch(err){ rates.push(g.nom + ' (mail : ' + (err.message || err) + ')'); }
      }
      if(appli){
        try{
          const r = await appelPrep({ action: 'messageBureauEleve', eleve: g.nom, texte: rlRemplir(texte, g.nom, rlSignatureTexte()), motif: 'post-permis' });
          if(r && r.status === 'error') throw new Error(r.message || 'refusé');
          via.push('appli'); nAppli++;
        }catch(err){ rates.push(g.nom + ' (messagerie : ' + (err.message || err) + ')'); }
      }
      if(via.length){
        const rel = rlRelances(g.nom);
        const avant = rel[type] || {};
        rel[type] = { le: rlMaintenant(), par: rlMoi(), n: Number(avant.n || 0) + 1, via: via.join(',') };
        try{ await majSuivi(g.nom, { relances: JSON.stringify(rel) }); }
        catch(err){ rates.push(g.nom + ' (la date de relance ne s’est pas notée : ' + (err.message || err) + ')'); }
      }
    }
    /* le compte rendu, dans la fenêtre */
    pied.innerHTML = '';
    const cr = document.createElement('div');
    cr.className = 'rlBilan';
    cr.innerHTML = '<b>✅ Relance partie</b> · ✉️ ' + nMail + ' mail' + (nMail > 1 ? 's' : '') + ' · 💬 ' + nAppli + ' message' + (nAppli > 1 ? 's' : '') +
      (injoignables.length ? '<div>⚠️ Sans moyen de le joindre : ' + rlEch(injoignables.join(', ')) + '</div>' : '') +
      (rates.length ? '<div class="rlRate">⚠️ ' + rlEch(rates.join(' · ')) + '</div>' : '');
    const bF = document.createElement('button');
    bF.type = 'button'; bF.className = 'btn btn-primary'; bF.textContent = 'Fermer';
    bF.addEventListener('click', () => fond.remove());
    pied.append(cr, bF);
    if(typeof showToast === 'function') showToast('📨 Relance envoyée');
    afficherRelances();
  });
}
function rlEtape(n, titre){
  const d = document.createElement('div');
  d.className = 'rlEtape';
  d.innerHTML = '<span class="rlNum">' + n + '</span>' + rlEch(titre);
  return d;
}

/* ---------- le style ---------- */
function rlStyle(){
  if(document.getElementById('rlCss')) return;
  const st = document.createElement('style');
  st.id = 'rlCss';
  st.textContent = `
.rlAide{ font-size:13px; color:var(--muted); line-height:1.55; margin:-4px 0 14px; max-width:820px; }
.rlTuiles{ display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:12px; }
.rlTuile{ display:grid; grid-template-columns:auto 1fr auto; grid-template-rows:auto auto; gap:4px 12px; align-items:start; text-align:left; font:inherit; color:var(--cream); cursor:pointer; padding:14px 16px; border-radius:18px; border:1px solid var(--line); background:var(--navy-deep); width:100%; margin:0; }
.rlTuile:hover{ border-color:var(--orange); }
body.verre .rlTuile{ background:var(--verre); border-color:var(--verre-bord); box-shadow:inset 0 1px 0 var(--verre-reflet), 0 6px 18px var(--verre-ombre); }
.rlTic{ font-size:26px; grid-row:1 / 3; }
.rlTtx b{ display:block; font-size:15px; } .rlTtx small{ display:block; font-size:12.5px; color:var(--muted); line-height:1.4; margin-top:2px; } .rlTtx em{ display:block; font-style:normal; font-size:11.5px; color:var(--muted); margin-top:6px; }
.rlTn{ font-size:22px; font-weight:900; min-width:40px; height:40px; border-radius:999px; display:flex; align-items:center; justify-content:center; background:var(--red); color:#fff; padding:0 10px; }
.rlTn.zero{ background:var(--line); color:var(--muted); }
.rlTgo{ grid-column:3; font-size:12.5px; font-weight:800; color:var(--accent-text); white-space:nowrap; align-self:end; }
.rlFen{ max-width:min(780px,95vw) !important; }
.rlX{ width:auto !important; margin:0 !important; padding:6px 11px !important; }
.rlEtape{ display:flex; align-items:center; gap:9px; font-size:15px; font-weight:800; margin:16px 0 8px; }
.rlEtape small{ font-size:12px; font-weight:600; color:var(--muted); }
.rlNum{ width:24px; height:24px; border-radius:50%; background:var(--orange); color:#0B0B0B; display:inline-flex; align-items:center; justify-content:center; font-size:13px; flex:none; }
.rlMini{ margin-left:auto; font:inherit; font-size:12px; font-weight:700; border:1px solid var(--line); background:transparent; color:var(--cream); border-radius:999px; padding:4px 10px; width:auto; cursor:pointer; }
.rlListe{ border:1px solid var(--line); border-radius:14px; overflow:hidden; max-height:46vh; overflow-y:auto; }
.rlL{ display:flex; gap:10px; align-items:center; padding:9px 12px; border-bottom:1px solid var(--line); text-transform:none; letter-spacing:0; margin:0; font-weight:400; color:var(--cream); cursor:pointer; }
.rlL:last-child{ border-bottom:none; }
.rlL input{ width:19px; height:19px; margin:0; flex:none; }
.rlL.gris{ opacity:.55; }
.rlLt{ flex:1; min-width:0; display:flex; flex-direction:column; }
.rlLt b{ font-size:14px; } .rlLt span{ font-size:12px; color:var(--muted); line-height:1.45; }
.rlCan{ display:flex; flex-direction:column; gap:4px; align-items:flex-end; flex:none; }
.rlC{ font-size:11px; font-weight:800; border-radius:999px; padding:1px 8px; border:1px solid; white-space:nowrap; }
.rlC.ok{ color:#3B6900; border-color:#9BCB3C; background:#F1FBDD; } .rlC.non{ color:#A85A00; border-color:#E8A23A; background:#FFF4E2; }
.rlCanaux{ display:grid; grid-template-columns:1fr 1fr; gap:8px; } .rlCanaux .lcSw{ margin:0; }
@media (max-width:560px){ .rlCanaux{ grid-template-columns:1fr; } .rlL{ flex-wrap:wrap; } .rlCan{ flex-direction:row; width:100%; padding-left:29px; } }
.rlLab{ font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin:2px 0 4px; display:block; }
.rlObjet{ margin:0 0 8px !important; }
.rlTexte{ font-family:inherit !important; width:100%; min-height:150px; margin:0 !important; font-size:13.5px !important; line-height:1.5 !important; }
.rlVars{ display:flex; flex-wrap:wrap; gap:5px; align-items:center; margin:7px 0 10px; font-size:12px; color:var(--muted); }
.rlVars button{ font:inherit; font-size:12px; font-weight:700; border:1px dashed var(--line); background:transparent; color:var(--accent-text); border-radius:999px; padding:3px 9px; width:auto; margin:0; cursor:pointer; }
.rlVarNote{ flex-basis:100%; font-size:11.5px; }
.rlApercu{ border:1px solid var(--line); border-radius:14px; padding:10px 13px; background:var(--navy); }
.rlApT{ font-size:12.5px; color:var(--muted); display:flex; gap:6px; align-items:center; }
.rlNav{ margin-left:auto; font-weight:800; color:var(--cream); display:inline-flex; align-items:center; gap:4px; }
.rlNav button{ font:inherit; font-weight:800; border:1px solid var(--line); background:transparent; color:var(--cream); border-radius:8px; width:28px; height:26px; margin:0; padding:0; cursor:pointer; }
.rlApO{ font-size:12.5px; font-weight:700; margin-top:6px; }
.rlApB{ font-size:13px; line-height:1.55; margin-top:6px; white-space:pre-wrap; }
.rlPied{ display:flex; gap:8px; align-items:center; margin-top:14px; flex-wrap:wrap; }
.rlPied .btn{ width:auto; margin:0; } .rlNote{ flex:1 1 260px; font-size:12px; color:var(--muted); line-height:1.4; }
.rlBilan{ flex:1 1 260px; font-size:13.5px; line-height:1.5; } .rlBilan div{ font-size:12.5px; color:var(--warn-text); }
`;
  document.head.appendChild(st);
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-relances.js'] = true;
