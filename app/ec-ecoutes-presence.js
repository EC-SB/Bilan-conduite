/* Déployé le 30/10/2026 à 15:53 — v1312 */
/* ============================================================
   ec-ecoutes-presence.js — v1277
   👂 La présence aux écoutes pédagogiques.

   David, le 27 octobre : « savoir s'ils sont bien là en écoute ou
   pas, que les moniteurs puissent le dire […] dans mes prochains
   cours, sur la fiche de la bonne heure, les moniteurs puissent dire
   j'ai cet élève […] au bout de 30 minutes, tous les élèves considérés
   comme pas venus doivent recevoir le mail […] et que ça alimente la
   liste pas venu en écoute ». Puis les rappels (« si la voiture est
   dans la rue ou dans la cour intérieure »), et pouvoir les annuler.

   ① le favori : les écoutes réservées (colonnes BEA, BV, Ecoute) partent
     au Worker à chaque lecture du planning ;
   ② la carte du cours (Mes prochains cours, aujourd'hui) : « 👂 En
     écoute à 10h », on coche qui est dans la voiture ;
   ③ à H+30, le Worker trouve les pas venus : « ❓ Pas venu(e) ? » avec
     « ✉️ Envoyer l'absence » et « ↩️ Était là » (l'envoi tout seul se
     règle par un interrupteur) ;
   ④ Suivi › 👂 Écoutes : les réglages, les rappels de demain (17h) à
     retirer ou annuler, et les absences trouvées au pointage.
   Suffixe « EP ».
   ============================================================ */

const MODELES_AVEC_ECOUTE_EP = ['conduite-auto', 'conduite-manuelle', 'aac-auto', 'aac-manuelle', 'examen-blanc', 'rdv-post'];
const ETAT_EP = { jour: '', d: null, t: 0, enCours: null };

function normEP(t){ return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function cleNomEP(n){ return normEP(n).split(' ').filter(Boolean).sort().join(' '); }
function agenceEP(t){ return /loud/.test(normEP(t)) ? 'loudeac' : 'saint-brieuc'; }
function nomAgenceEP(a){ return a === 'loudeac' ? 'Loudéac' : 'Saint-Brieuc'; }
function heureEP(h){
  const m = String(h || '').match(/(\d{1,2})\s*[h:]\s*(\d{2})?/);
  if(!m || Number(m[1]) > 23) return '';
  return String(m[1]).padStart(2, '0') + ':' + (m[2] || '00');
}
function minEP(h){ const x = heureEP(h); return x ? Number(x.slice(0, 2)) * 60 + Number(x.slice(3)) : -1; }
function heureDiteEP(h){ const x = heureEP(h); if(!x) return ''; return Number(x.slice(0, 2)) + 'h' + (x.slice(3) === '00' ? '' : x.slice(3)); }
function heureDeMsEP(ms){ return ms ? new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''; }
function aujourdhuiEP(){ return (typeof todayLocal === 'function') ? todayLocal() : new Date().toISOString().slice(0, 10); }
function maintenantMinEP(){ const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
function colonneDiteEP(c){ const t = normEP(c); return t === 'ecoute' ? 'Écoute' : String(c || '').toUpperCase(); }
function echEP(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ---------- les données du jour ---------- */
async function chargerEP(forcer){
  const jour = aujourdhuiEP();
  if(!forcer && ETAT_EP.d && ETAT_EP.jour === jour && Date.now() - ETAT_EP.t < 55000) return ETAT_EP.d;
  if(ETAT_EP.enCours) return ETAT_EP.enCours;
  if(typeof appelPrep !== 'function') return null;
  ETAT_EP.enCours = (async () => {
    try{
      const d = await appelPrep({ action: 'ecoutesJour', jour: jour });
      if(d && d.status === 'ok'){ ETAT_EP.d = d; ETAT_EP.jour = jour; ETAT_EP.t = Date.now(); }
      return ETAT_EP.d;
    }catch(e){ return ETAT_EP.d; }
    finally{ ETAT_EP.enCours = null; }
  })();
  return ETAT_EP.enCours;
}
function poserEP(d){
  if(d && d.status === 'ok' && d.resa){ ETAT_EP.d = d; ETAT_EP.jour = d.jour; ETAT_EP.t = Date.now(); }
  remplirToutEP();
}

/* ---------- ② sur la carte du cours ---------- */
/* Appelée par ec-prepares.js pour chaque carte : un cadre (sous la
   carte) et une ligne (dans le sommaire de gauche), remplis quand les
   données sont là. Seulement les cours d'aujourd'hui qui prennent une
   écoute. */
function blocEcoutesEP(cours){
  if(!cours || cours.date !== aujourdhuiEP()) return null;
  if(MODELES_AVEC_ECOUTE_EP.indexOf(String(cours.modele || '')) === -1) return null;
  const heure = (typeof heureDeLaPreparation === 'function') ? heureEP(heureDeLaPreparation(cours)) : '';
  if(!heure) return null;
  const bloc = document.createElement('div');
  bloc.className = 'ecouteCours';
  bloc.style.display = 'none';
  const ligne = document.createElement('div');
  ligne.className = 'ecouteLigne';
  ligne.style.display = 'none';
  [bloc, ligne].forEach(x => {
    x.dataset.heure = heure;
    x.dataset.agence = agenceEP(cours.site);
    x.dataset.moniteur = String(cours.moniteur || '');
  });
  setTimeout(() => {
    if(ETAT_EP.d && ETAT_EP.jour === aujourdhuiEP()){ remplirBlocEP(bloc); remplirLigneEP(ligne); }
    chargerEP(false).then(() => remplirToutEP());
  }, 0);
  return { bloc, ligne };
}

/* Ce que le créneau dit, pour une carte */
function creneauEP(d, heure, agence, moniteur){
  const vus = {};
  const eleves = (d.resa || []).filter(x => x.agence === agence && x.debut <= heure && heure < x.fin && !x.annulee)
    .filter(x => { if(vus[x.eleveCle]) return false; vus[x.eleveCle] = 1; return true; });
  const ici = (d.pointages || []).filter(p => p.heure === heure && p.agence === agence);
  const mien = ici.find(p => p.moniteurCle === normEP(moniteur)) || null;
  const autres = ici.filter(p => p !== mien);
  const avant = (d.pointages || []).filter(p => p.agence === agence && p.heure < heure);
  const abs = {};
  (d.absences || []).forEach(a => { if(a.heure === heure && a.agence === agence) abs[a.eleveCle] = a; });
  return { eleves, mien, autres, avant, abs };
}
function peutPointerEP(d, moniteur){
  if(typeof ACCES === 'undefined' || !ACCES) return false;
  return normEP(moniteur) === normEP(ACCES.moniteur) || ACCES.role === 'admin' || !!(d && d.peutTout);
}

function remplirToutEP(){
  document.querySelectorAll('.ecouteCours').forEach(remplirBlocEP);
  document.querySelectorAll('.ecouteLigne').forEach(remplirLigneEP);
}

function remplirLigneEP(l){
  const d = ETAT_EP.d;
  if(!d || ETAT_EP.jour !== aujourdhuiEP() || !d.reglages || !d.reglages.pointage){ l.style.display = 'none'; return; }
  const c = creneauEP(d, l.dataset.heure, l.dataset.agence, l.dataset.moniteur);
  if(!c.eleves.length){ l.style.display = 'none'; return; }
  const absents = c.eleves.map(e => c.abs[e.eleveCle]).filter(a => a && a.etat !== 'presente');
  const enAttente = absents.filter(a => a.etat !== 'envoyee').length, partis = absents.length - enAttente;
  let t, coul;
  if(!c.mien){ t = '👂 ' + c.eleves.length + ' en écoute à pointer'; coul = 'var(--warn-text)'; }
  else if(c.mien.personne){ t = '👂 personne avec toi'; coul = 'var(--accent-text)'; }
  else { t = '👂 ' + c.mien.avec.length + ' avec toi'; coul = 'var(--accent-text)'; }
  if(enAttente) t += ' · ❓ ' + enAttente + ' pas venu' + (enAttente > 1 ? 's' : '') + ' ?';
  if(partis) t += ' · 🚫 ' + partis + ' pas venu' + (partis > 1 ? 's' : '');
  if(absents.length) coul = 'var(--red)';
  l.textContent = t;
  l.style.color = coul;
  l.style.display = '';
}

function remplirBlocEP(z){
  const d = ETAT_EP.d;
  if(!d || ETAT_EP.jour !== aujourdhuiEP() || !d.reglages || !d.reglages.pointage){ z.style.display = 'none'; return; }
  const heure = z.dataset.heure, agence = z.dataset.agence, moniteur = z.dataset.moniteur;
  const c = creneauEP(d, heure, agence, moniteur);
  if(!c.eleves.length){ z.style.display = 'none'; z.innerHTML = ''; return; }
  /* pas pendant qu'on écrit dedans */
  const f = document.activeElement;
  if(f && z.contains(f) && /INPUT|TEXTAREA/.test(f.tagName)) return;
  const sig = JSON.stringify([c, d.reglages, Math.floor(maintenantMinEP() / 5), z.dataset.ajout || '']);
  if(z.dataset.sig === sig && z.style.display !== 'none') return;
  z.dataset.sig = sig;
  z.style.display = '';
  z.innerHTML = '';
  const peut = peutPointerEP(d, moniteur);
  const h = minEP(heure), maint = maintenantMinEP();
  const toi = normEP(moniteur) === normEP((typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur) || '') ? 'toi' : moniteur;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; };
  const alerte = !c.mien && maint >= h + 25 && peut;
  z.classList.toggle('alerte', alerte);

  const t = el('div', 'epTete');
  t.appendChild(el('span', 'epTitre', '👂 EN ÉCOUTE À ' + heureDiteEP(heure).toUpperCase()));
  t.appendChild(el('span', 'epSous', nomAgenceEP(agence) + (d.luLe ? ' · lu dans Drivup à ' + heureDeMsEP(d.luLe) : '')));
  z.appendChild(t);
  let q = '';
  if(alerte) q = '⏰ ' + heureDiteEP(heureEP(String(Math.floor(maint / 60)) + ':' + String(maint % 60).padStart(2, '0'))) + ' — ' + (toi === 'toi' ? 'tu n’as' : moniteur + ' n’a') + ' pas encore dit qui est dans la voiture';
  else if(c.mien && c.mien.personne) q = '✅ Personne avec ' + toi + ' (' + heureDeMsEP(c.mien.quand) + (c.mien.par && normEP(c.mien.par) !== normEP(moniteur) ? ', ' + c.mien.par : '') + ')';
  else if(c.mien) q = '✅ Pointé à ' + heureDeMsEP(c.mien.quand) + (c.mien.par && normEP(c.mien.par) !== normEP(moniteur) ? ' par ' + c.mien.par : '');
  else q = peut ? (toi === 'toi' ? 'Qui est dans ta voiture ? Coche-les.' : 'Qui est dans la voiture de ' + moniteur + ' ?') : 'Pas encore pointé.';
  z.appendChild(el('div', 'epQuestion', q));

  const avecMoi = c.mien && !c.mien.personne ? c.mien.avec : [];
  c.eleves.forEach(e => {
    const r = el('div', 'epEleve');
    const ab = c.abs[e.eleveCle];
    const chez = c.autres.find(p => p.avec.indexOf(e.eleveCle) !== -1);
    const moi = avecMoi.indexOf(e.eleveCle) !== -1;
    const avantP = c.avant.filter(p => p.avec.indexOf(e.eleveCle) !== -1 && p.heure >= e.debut).pop();
    let etat = 'libre', dit = '';
    if(moi){ etat = 'moi'; dit = 'avec ' + toi; }
    else if(ab && ab.etat === 'presente'){ etat = 'libre'; dit = 'était là (↩️ ' + ab.presentPar + ')'; }
    else if(ab && ab.etat === 'envoyee'){ etat = 'absent'; dit = 'Pas venu(e) · ' + (ab.mail === 'ok' ? '✉️ mail' : '✉️ ' + ab.mail) + (ab.message === 'ok' ? ' et 💬 message partis' : ' parti · 💬 ' + ab.message) + ' à ' + heureDeMsEP(ab.envoyeLe) + (ab.envoyePar ? ' (' + ab.envoyePar + ')' : ''); }
    else if(ab && ab.etat === 'a_confirmer'){ etat = 'absent'; dit = 'Pas venu(e) ? — personne ne l’a coché(e) à ' + heureDiteEP(heureEP(String(Math.floor((h + 30) / 60)) + ':' + String((h + 30) % 60).padStart(2, '0'))); }
    else if(ab && ab.etat === 'a_verifier'){ etat = 'absent'; dit = 'À vérifier — tous les moniteurs de ' + heureDiteEP(heure) + ' n’ont pas pointé'; }
    else if(chez){ etat = 'chez'; dit = 'avec ' + chez.moniteur + ' (' + heureDeMsEP(chez.quand) + ')'; }
    else if(avecMoi.length >= 2){ etat = 'gris'; dit = 'pas avec ' + toi + ' ? — ' + (toi === 'toi' ? 'tu peux' : 'on peut') + ' encore le cocher'; }
    if(!moi && avantP && etat !== 'absent') dit = (dit ? dit + ' · ' : '') + 'avec ' + (normEP(avantP.moniteur) === normEP(moniteur) ? toi : avantP.moniteur) + ' à ' + heureDiteEP(avantP.heure) + ' — à recocher pour ' + heureDiteEP(heure);
    r.classList.add(etat);
    r.appendChild(el('span', 'epCoche', etat === 'moi' ? '☑' : etat === 'absent' ? '🚫' : etat === 'chez' ? '🚗' : '☐'));
    const tx = el('div', 'epNom');
    tx.appendChild(el('b', '', e.eleve));
    tx.appendChild(el('span', 'epCol', ' · ' + colonneDiteEP(e.colonne || '') + (e.colonne ? ' · ' : '') + heureDiteEP(e.debut) + '–' + heureDiteEP(e.fin) + (e.source === 'main' ? ' · ajouté' : '')));
    if(dit) tx.appendChild(el('div', 'epDit', dit));
    r.appendChild(tx);
    /* les boutons d'une absence */
    if(ab && ab.etat !== 'presente'){
      const peutAb = (d.peutTout) || (peut && !!c.mien);
      if(peutAb){
        const w = el('div', 'epBoutons');
        if(ab.etat !== 'envoyee' && (ab.etat === 'a_confirmer' || d.peutTout)){
          const b1 = el('button', 'btn btn-primary', '✉️ Envoyer l’absence');
          b1.type = 'button';
          b1.addEventListener('click', ev => { ev.stopPropagation(); envoyerAbsenceEP(ab, b1); });
          w.appendChild(b1);
        }
        const b2 = el('button', 'btn btn-secondary', '↩️ Était là');
        b2.type = 'button';
        b2.addEventListener('click', ev => { ev.stopPropagation(); etaitLaEP(ab, b2); });
        w.appendChild(b2);
        r.appendChild(w);
      }
    }
    if(peut && etat !== 'absent'){
      r.classList.add('touchable');
      r.setAttribute('role', 'checkbox');
      r.setAttribute('aria-checked', moi ? 'true' : 'false');
      r.tabIndex = 0;
      const basculer = () => {
        const l = avecMoi.slice();
        const i = l.indexOf(e.eleveCle);
        if(i === -1) l.push(e.eleveCle); else l.splice(i, 1);
        pointerEP(z, l, false);
      };
      r.addEventListener('click', basculer);
      r.addEventListener('keydown', ev => { if(ev.key === ' ' || ev.key === 'Enter'){ ev.preventDefault(); basculer(); } });
    }
    z.appendChild(r);
  });

  if(peut){
    const r = el('div', 'epActions');
    if(!avecMoi.length && !(c.mien && c.mien.personne)){
      const b = el('button', 'btn btn-secondary', '👂 Personne avec ' + (toi === 'toi' ? 'moi' : moniteur));
      b.type = 'button';
      b.addEventListener('click', () => pointerEP(z, [], true));
      r.appendChild(b);
    }else if(c.mien && c.mien.personne){
      const b = el('button', 'btn btn-secondary', '✏️ Changer');
      b.type = 'button';
      b.addEventListener('click', () => pointerEP(z, [], false));
      r.appendChild(b);
    }
    const b2 = el('button', 'btn btn-secondary', '＋ Un élève pas dans la liste');
    b2.type = 'button';
    b2.addEventListener('click', () => { z.dataset.ajout = z.dataset.ajout ? '' : '1'; z.dataset.sig = ''; remplirBlocEP(z); });
    r.appendChild(b2);
    z.appendChild(r);
    if(z.dataset.ajout){
      const a = el('div', 'epAjout');
      const i = document.createElement('input');
      i.type = 'text';
      i.setAttribute('list', 'listeEleves');
      i.placeholder = 'Prénom et nom de l’élève en écoute';
      i.autocomplete = 'off';
      a.appendChild(i);
      const ok = el('button', 'btn btn-primary', 'Ajouter');
      ok.type = 'button';
      ok.addEventListener('click', () => ajouterEP(z, i.value, ok));
      i.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); ajouterEP(z, i.value, ok); } });
      a.appendChild(ok);
      z.appendChild(a);
      setTimeout(() => { try{ i.focus(); }catch(e){} }, 0);
    }
  }
  if(maint < h + 30){
    z.appendChild(el('div', 'epPied', 'À ' + heureDiteEP(heureEP(String(Math.floor((h + 30) / 60)) + ':' + String((h + 30) % 60).padStart(2, '0'))) +
      ', ceux que personne n’a cochés passent « pas venus ? » : ' +
      (d.reglages.auto ? 'le mail « absence en écoute » et le même message dans son espace partent tout seuls.'
                       : 'un bouton envoie le mail « absence en écoute » et le même message dans son espace.')));
  }
}

async function pointerEP(z, avec, personne){
  const d = ETAT_EP.d;
  z.querySelectorAll('button, .epEleve').forEach(b => { b.disabled = true; b.style.pointerEvents = 'none'; });
  try{
    const r = await appelPrep({ action: 'ecoutePointer', jour: aujourdhuiEP(), heure: z.dataset.heure, agence: z.dataset.agence,
                                moniteur: z.dataset.moniteur, avec: avec, personne: !!personne });
    z.dataset.sig = '';
    poserEP(r);
  }catch(e){
    if(typeof showToast === 'function') showToast('Pointage impossible : ' + ((e && e.message) || e));
    z.dataset.sig = '';
    remplirBlocEP(z);
  }
}
async function ajouterEP(z, nom, bouton){
  nom = String(nom || '').trim();
  if(nom.split(/\s+/).length < 2){ if(typeof showToast === 'function') showToast('Prénom ET nom de l’élève.'); return; }
  bouton.disabled = true;
  try{
    const r = await appelPrep({ action: 'ecouteAjouter', jour: aujourdhuiEP(), debut: z.dataset.heure, agence: z.dataset.agence, eleve: nom });
    z.dataset.ajout = '';
    z.dataset.sig = '';
    poserEP(r);
    if(typeof showToast === 'function') showToast('👂 ' + nom + ' ajouté(e) en écoute ✅');
  }catch(e){
    bouton.disabled = false;
    if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e));
  }
}
async function envoyerAbsenceEP(ab, bouton){
  if(typeof confirmer === 'function' && !await confirmer('Envoyer à ' + ab.eleve + ' le mail « absence en écoute » (5 €) et le même message dans son espace ?\n\nÉcoute de ' +
      heureDiteEP(ab.debut) + ' à ' + heureDiteEP(ab.fin) + ' (' + nomAgenceEP(ab.agence) + ').', 'Envoyer')) return;
  if(bouton){ bouton.disabled = true; bouton.textContent = 'Envoi…'; }
  try{
    const r = await appelPrep({ action: 'ecouteAbsenceEnvoyer', id: ab.id });
    const e = (r && r.envoi) || {};
    if(typeof showToast === 'function') showToast(e.mail === 'ok' ? 'Absence envoyée ✅' : 'Absence notée — mail : ' + (e.mail || '?'));
    if(r && r.resa) poserEP(r);
    if(typeof afficherEcoutes === 'function' && document.getElementById('ecoutesZone') && document.getElementById('ecoutesZone').offsetParent) afficherEcoutes();
  }catch(err){
    if(bouton){ bouton.disabled = false; bouton.textContent = '✉️ Envoyer l’absence'; }
    if(typeof showToast === 'function') showToast('Impossible : ' + ((err && err.message) || err));
  }
}
async function etaitLaEP(ab, bouton){
  if(bouton) bouton.disabled = true;
  try{
    const r = await appelPrep({ action: 'ecouteAbsencePresent', id: ab.id });
    if(typeof showToast === 'function') showToast('↩️ ' + ab.eleve + ' était là — retiré(e) de « Pas venu en écoute »');
    if(r && r.resa) poserEP(r);
    if(typeof afficherEcoutes === 'function' && document.getElementById('ecoutesZone') && document.getElementById('ecoutesZone').offsetParent) afficherEcoutes();
  }catch(e){
    if(bouton) bouton.disabled = false;
    if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e));
  }
}

/* La carte suit toute seule : toutes les minutes tant qu'un cours
   d'aujourd'hui est à l'écran, et au retour sur l'appli */
setInterval(() => {
  if(document.hidden) return;
  const l = [...document.querySelectorAll('.ecouteCours')];
  if(!l.length) return;
  if(!l.some(x => x.offsetParent || (x.parentElement && x.parentElement.offsetParent))) return;
  chargerEP(true).then(() => remplirToutEP());
}, 60000);
document.addEventListener('visibilitychange', () => {
  if(!document.hidden && document.querySelector('.ecouteCours')) chargerEP(true).then(() => remplirToutEP());
});
/* La notification « 👂 Écoutes de 10h à pointer » ouvre Mes prochains cours */
if(navigator.serviceWorker){
  navigator.serviceWorker.addEventListener('message', ev => {
    const d = ev.data || {};
    if(d.quoi === 'ouvrirVue' && d.vue === 'prepares' && typeof afficherOnglet === 'function'){
      try{ afficherOnglet('cours'); afficherVue('cours', 'prepares'); }catch(e){}
    }
  });
}

/* ---------- ① le favori : les écoutes réservées ---------- */
/* Les séances posées dans une colonne d'écoute (BEA, BV à Saint-Brieuc,
   Ecoute à Loudéac) qui ont des élèves : on les envoie, avec les agences
   lues (une écoute qui n'y est plus a été annulée dans Drivup). */
function ecoutesDuPlanningEP(p){
  const estCol = t => /^(bea|bv|ecoute)$/.test(normEP(t));
  const agences = [];
  (p.colonnes || []).forEach(t => {
    const n = normEP(t);
    const a = n === 'ecoute' ? 'loudeac' : (n === 'bea' || n === 'bv') ? 'saint-brieuc' : '';
    if(a && agences.indexOf(a) === -1) agences.push(a);
  });
  const ecoutes = [];
  (p.cours || []).forEach(c => {
    if(!estCol(c.moniteurDrivup) || !(c.eleves || []).length || c.examen) return;
    const eleves = c.eleves.map(x => {
      const f = (typeof ficheDeLEleveDrivup === 'function') ? ficheDeLEleveDrivup(x) : null;
      const nom = f ? f.eleve : ((typeof nomDeLEleveDrivup === 'function') ? nomDeLEleveDrivup(x) : [x.prenom, x.nom].filter(Boolean).join(' '));
      return nom ? { nom: nom, idDrivup: String(x.id || '') } : null;
    }).filter(Boolean);
    if(!eleves.length) return;
    const n = normEP(c.moniteurDrivup);
    ecoutes.push({ evt: String(c.id), jour: c.jour, debut: c.debut, fin: c.fin,
                   colonne: n === 'ecoute' ? 'Ecoute' : String(c.moniteurDrivup).toUpperCase(),
                   agence: n === 'ecoute' ? 'loudeac' : 'saint-brieuc', eleves: eleves });
  });
  return { agences, ecoutes };
}
async function enregistrerLesEcoutesReserveesDrivup(p){
  const x = ecoutesDuPlanningEP(p);
  if(!x.agences.length) return null;
  const r = await appelPrep({ action: 'ecoutesResaPoser', du: p.du, au: p.au, agences: x.agences, ecoutes: x.ecoutes });
  ETAT_EP.t = 0;
  return r;
}

/* ---------- ④ Suivi › 👂 Écoutes pédagogiques ---------- */
/* Appelée par afficherEcoutes : les réglages et les rappels de demain,
   en tête de la zone. */
function blocsSuiviEcoutesEP(zone, d){
  if(!zone || !d || d.status !== 'ok') return;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; };
  const reg = d.reglages || {};
  /* ⚙️ les réglages */
  const r = document.createElement('details');
  r.className = 'epReglages';
  r.open = !!d.estAdmin;
  r.appendChild(el('summary', '', '⚙️ Pointage et rappels des écoutes'));
  const ligne = (cle, titre, sous) => {
    const l = el('label', 'epReg');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!reg[cle];
    cb.disabled = !d.estAdmin;
    cb.addEventListener('change', async () => {
      cb.disabled = true;
      try{
        const x = {}; x[cle] = cb.checked;
        const rep = await appelPrep(Object.assign({ action: 'ecoutesReglagesPoser' }, x));
        reg[cle] = cb.checked;
        if(typeof showToast === 'function') showToast(titre + (cb.checked ? ' : allumé ✅' : ' : éteint'));
        ETAT_EP.t = 0;
        if(rep && rep.reglages) Object.assign(reg, rep.reglages);
      }catch(e){
        cb.checked = !cb.checked;
        if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e));
      }finally{ cb.disabled = !d.estAdmin; }
    });
    l.appendChild(cb);
    const s = el('span', '');
    s.appendChild(el('b', '', titre));
    s.appendChild(el('span', 'epRegSous', sous));
    l.appendChild(s);
    r.appendChild(l);
  };
  ligne('pointage', '👂 Pointer les écoutes sur les cours', 'Sur Mes prochains cours, chaque moniteur coche qui est dans sa voiture.');
  ligne('auto', '✉️ Envoyer l’absence tout seul, 30 min après', 'Éteint : un bouton « ✉️ Envoyer l’absence » sur la carte et ci-dessous. Allumé : le mail + le message partent seuls (sauf si un cours de l’heure n’a rien pointé).');
  ligne('rappels', '⏰ Rappel des écoutes, la veille à 17h', 'Mail + message dans son espace : le jour, l’heure, et où l’attend la voiture (lu dans les rappels de cours envoyés pour le lendemain).');
  if(!d.estAdmin) r.appendChild(el('div', 'epRegSous', 'Réglé par les administrateurs.'));
  zone.insertBefore(r, zone.firstChild);

  /* 👂 v1308 — les écoutes d'AUJOURD'HUI : ce qu'ont pointé les moniteurs,
     et le bureau qui dit « il est là » ou « pas là » */
  const blocJour = blocEcoutesDuJourEP(d, el);
  if(blocJour) zone.insertBefore(blocJour, r.nextSibling);

  /* ⏰ les rappels de demain */
  const lr = d.rappels || [];
  const bloc = el('div', 'epRappels');
  bloc.appendChild(el('div', 'epRappelsTitre', '⏰ Rappels d’écoute de demain — ' + (reg.rappels ? 'partent à 17h' : 'éteints : rien ne part')));
  bloc.appendChild(el('div', 'epRegSous', (typeof dateEnToutesLettres === 'function' ? dateEnToutesLettres(d.demain) : d.demain) +
    (d.luLe ? ' · lu dans Drivup le ' + new Date(d.luLe).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ' · pas encore lu dans Drivup') +
    ' · la voiture vient des rappels de cours.'));
  if(!lr.length){
    bloc.appendChild(el('div', 'empty', 'Aucune écoute réservée demain (d’après la dernière lecture du favori).'));
  }
  const groupes = [];
  const parEvt = {};
  lr.forEach(x => {
    if(!parEvt[x.evt]){ parEvt[x.evt] = { evt: x.evt, agence: x.agence, debut: x.debut, fin: x.fin, colonne: x.colonne, l: [] }; groupes.push(parEvt[x.evt]); }
    parEvt[x.evt].l.push(x);
  });
  const recharger = rep => { if(rep && rep.status === 'ok' && typeof afficherEcoutes === 'function') afficherEcoutes(); };
  const LIEU = { cour: '🅿️ cour intérieure', devant: '🛣️ devant, le long du trottoir' };
  groupes.sort((a, b) => (a.debut + a.agence).localeCompare(b.debut + b.agence)).forEach(g => {
    const toutes = g.l.every(x => x.annulee);
    const gb = el('div', 'epRappelGroupe' + (toutes ? ' annulee' : ''));
    const t = el('div', 'epRappelTete');
    t.appendChild(el('b', '', heureDiteEP(g.debut) + '–' + heureDiteEP(g.fin) + ' · ' + nomAgenceEP(g.agence) + ' · ' + colonneDiteEP(g.colonne) + (toutes ? ' — annulée' : '')));
    const ba = el('button', 'btn btn-secondary', toutes ? '↩️ Remettre' : '✕ Annuler l’écoute');
    ba.type = 'button';
    ba.addEventListener('click', async () => {
      const dejaParti = g.l.some(x => x.rappelEnvoye && !x.annulee);
      if(!toutes && typeof confirmer === 'function' && !await confirmer('Annuler l’écoute de ' + heureDiteEP(g.debut) + ' (' + g.l.map(x => x.eleve).join(', ') + ') ?' +
          (dejaParti ? '\n\nLe rappel est déjà parti : ils recevront « Ton écoute pédagogique de demain est annulée » (mail + message).' : '\n\nAucun rappel ne partira.'), 'Annuler l’écoute', true)) return;
      ba.disabled = true;
      try{ recharger(await appelPrep({ action: 'ecouteAnnuler', evt: g.evt, annuler: !toutes })); }
      catch(e){ ba.disabled = false; if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e)); }
    });
    t.appendChild(ba);
    gb.appendChild(t);
    g.l.forEach(x => {
      const l = el('div', 'epRappelLigne' + (x.annulee || x.pasDeRappel ? ' barre' : ''));
      const tx = el('div', 'epRappelNom');
      tx.appendChild(el('b', '', x.eleve));
      const etat = x.annulee ? 'annulée' + (x.annuleePar ? ' par ' + x.annuleePar : '') + (x.annulationEnvoyee ? ' · 📣 prévenu(e)' : '')
        : x.pasDeRappel ? 'pas de rappel' + (x.pasDeRappelPar ? ' (' + x.pasDeRappelPar + ')' : '')
        : x.rappelEnvoye ? '✉️ rappel parti à ' + heureDeMsEP(x.rappelEnvoye) + (LIEU[x.rappelLieu] ? ' · ' + LIEU[x.rappelLieu] : '')
        : (x.source === 'main' ? 'ajouté(e) à la main' : '');
      if(etat) tx.appendChild(el('span', 'epCol', ' · ' + etat));
      l.appendChild(tx);
      let bt;
      if(x.annulee){
        bt = el('button', 'btn btn-secondary', '↩️');
        bt.title = 'Remettre son écoute';
        bt.addEventListener('click', async () => { bt.disabled = true; try{ recharger(await appelPrep({ action: 'ecouteAnnuler', id: x.id, annuler: false })); }catch(e){ bt.disabled = false; } });
      }else if(x.rappelEnvoye){
        bt = el('button', 'btn btn-secondary', '✕ Annuler pour lui/elle');
        bt.addEventListener('click', async () => {
          if(typeof confirmer === 'function' && !await confirmer('Annuler l’écoute de ' + x.eleve + ' ?\n\nSon rappel est parti : il/elle recevra le message d’annulation.', 'Annuler', true)) return;
          bt.disabled = true;
          try{ recharger(await appelPrep({ action: 'ecouteAnnuler', id: x.id, annuler: true })); }catch(e){ bt.disabled = false; }
        });
      }else{
        bt = el('button', 'btn btn-secondary', x.pasDeRappel ? '↩️' : '✕ Pas de rappel');
        bt.title = x.pasDeRappel ? 'Remettre son rappel' : 'Le rappel ne partira pas';
        bt.addEventListener('click', async () => { bt.disabled = true; try{ recharger(await appelPrep({ action: 'ecouteRappelRetirer', id: x.id, retirer: !x.pasDeRappel })); }catch(e){ bt.disabled = false; } });
      }
      bt.type = 'button';
      l.appendChild(bt);
      gb.appendChild(l);
    });
    bloc.appendChild(gb);
  });
  bloc.appendChild(el('div', 'epPied', 'Avant 17h : « ✕ » = le rappel ne part pas. Après 17h (rappel déjà parti) : « ✕ Annuler » envoie « Ton écoute pédagogique de demain est annulée » (mail + message). Une écoute annulée ne compte pas au pointage.'));
  zone.insertBefore(bloc, (blocJour && blocJour.parentNode === zone) ? blocJour.nextSibling : r.nextSibling);
}

/* ============================================================
   👂 v1308 — LES ÉCOUTES D'AUJOURD'HUI

   David, le 30 octobre : « dans le suivi des écoutes je n'ai que les
   rappels de demain, je ne vois pas ceux du jour avec ce qu'ont mis les
   moniteurs, et la possibilité, moi depuis le bureau, de dire s'ils sont
   bien là ou pas ». Par écoute : chaque élève, ce qu'en dit le pointage
   (« ✅ avec Hery à 10h », « 🚫 absence envoyée »…), et deux boutons pour
   le bureau, ✅ Là / 🚫 Pas là, qui passent devant le pointage.
   ============================================================ */
function etatJourEP(d, x){
  const cle = x.eleveCle;
  const avec = (d.jourPointages || []).filter(p => p.agence === x.agence && minEP(p.heure) >= minEP(x.debut) && minEP(p.heure) < minEP(x.fin) && (p.avec || []).indexOf(cle) !== -1);
  const muets = (d.jourPointages || []).filter(p => p.agence === x.agence && minEP(p.heure) >= minEP(x.debut) && minEP(p.heure) < minEP(x.fin) && p.personne);
  const abs = (d.jourAbsences || []).filter(a => a.agence === x.agence && a.eleveCle === cle && a.debut === x.debut);
  const bureau = (d.jourBureau || {})[x.agence + '|' + x.debut + '|' + cle] || null;
  const l = [];
  avec.forEach(p => l.push('✅ avec ' + p.moniteur + ' à ' + heureDiteEP(p.heure)));
  abs.forEach(a => {
    if(a.etat === 'envoyee') l.push('🚫 absence envoyée' + (a.envoyePar ? ' par ' + a.envoyePar : '') + (a.envoyeLe ? ' à ' + heureDeMsEP(a.envoyeLe) : ''));
    else if(a.etat === 'presente') l.push('↩️ était là' + (a.presentPar ? ' (' + a.presentPar + ')' : ''));
    else if(a.etat === 'a_verifier') l.push('❓ à vérifier (cours pas pointé à ' + heureDiteEP(a.heure) + ')');
    else l.push('❓ personne ne l’avait à ' + heureDiteEP(a.heure) + (a.pointePar ? ' (pointé : ' + a.pointePar + ')' : ''));
  });
  if(!avec.length && !abs.length) l.push(muets.length ? '— ' + muets.map(p => p.moniteur).join(', ') + ' : personne dans la voiture' : '⏳ pas encore pointé');
  return { texte: l.join(' · '), bureau: bureau, absence: abs.find(a => a.etat === 'a_confirmer' || a.etat === 'a_verifier') || null,
           present: !!avec.length || abs.some(a => a.etat === 'presente') };
}
/* 👂 v1312 — annuler une écoute d'aujourd'hui (le créneau entier ou un
   élève). David : « il faut que je puisse les annuler, que ça enlève sur
   les moniteurs et sur l'affichage ». Le Worker pose annulee = 1 : Mes
   prochains cours et la télé ne lisent que les écoutes non annulées.
   On demande s'il faut prévenir l'élève (mail + message). */
async function annulerEcouteDuJourEP(lignes, titre, recharger, bouton){
  const noms = lignes.map(x => x.eleve).join(', ');
  const choix = (typeof fenetre === 'function') ? await fenetre('Annuler ' + titre + ' (' + noms + ') ?\n\n' +
      'Elle disparaît de Mes prochains cours des moniteurs et de l’affichage.\n\n' +
      '« Annuler et prévenir » envoie « Ton écoute pédagogique d’aujourd’hui est annulée » (mail + message dans son espace).',
    [{ nom: 'Retour', valeur: 0 }, { nom: 'Annuler sans prévenir', valeur: 1 }, { nom: 'Annuler et prévenir', valeur: 2, danger: true }],
    '✕ Annuler l’écoute') : 1;
  if(!choix) return;
  if(bouton) bouton.disabled = true;
  try{
    const rep = await appelPrep({ action: 'ecouteAnnuler', ids: lignes.map(x => x.id), annuler: true, prevenir: choix === 2 });
    if(typeof showToast === 'function') showToast('Écoute annulée ✅' + (rep && rep.prevenus ? ' · ' + rep.prevenus + ' prévenu(s)' : ''));
    ETAT_EP.t = 0;
    recharger(rep);
  }catch(e){ if(bouton) bouton.disabled = false; if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e)); }
}
async function remettreEcouteDuJourEP(lignes, recharger, bouton){
  if(bouton) bouton.disabled = true;
  try{ const rep = await appelPrep({ action: 'ecouteAnnuler', ids: lignes.map(x => x.id), annuler: false }); ETAT_EP.t = 0; recharger(rep); }
  catch(e){ if(bouton) bouton.disabled = false; if(typeof showToast === 'function') showToast('Impossible : ' + ((e && e.message) || e)); }
}
function blocEcoutesDuJourEP(d, el){
  /* v1312 : les annulées restent, barrées, avec ↩️ pour les remettre */
  const lj = d.jourResa || [];
  const bloc = el('div', 'epRappels epJour');
  bloc.appendChild(el('div', 'epRappelsTitre', '👂 Écoutes d’aujourd’hui — qui est là ?'));
  bloc.appendChild(el('div', 'epRegSous', (typeof dateEnToutesLettres === 'function' ? dateEnToutesLettres(d.aujourdhui) : d.aujourdhui) +
    ' · ce qu’ont pointé les moniteurs sur Mes prochains cours' + (d.peutTout ? ' · ✅ / 🚫 : c’est le bureau qui tranche' : '') + '.'));
  if(!lj.length){
    bloc.appendChild(el('div', 'empty', 'Aucune écoute aujourd’hui (d’après la dernière lecture du favori).'));
    return bloc;
  }
  const groupes = [], par = {};
  lj.forEach(x => {
    const k = x.agence + '|' + x.debut + '|' + x.fin + '|' + x.colonne;
    if(!par[k]){ par[k] = { agence: x.agence, debut: x.debut, fin: x.fin, colonne: x.colonne, l: [] }; groupes.push(par[k]); }
    par[k].l.push(x);
  });
  const recharger = rep => { if(rep && rep.status === 'ok' && typeof afficherEcoutes === 'function') afficherEcoutes(); };
  groupes.sort((a, b) => (a.debut + a.agence).localeCompare(b.debut + b.agence)).forEach(g => {
    const toutes = g.l.every(x => x.annulee);
    const gb = el('div', 'epRappelGroupe' + (toutes ? ' annulee' : ''));
    const t = el('div', 'epRappelTete');
    const enCours = d.minutes >= minEP(g.debut) && d.minutes < minEP(g.fin);
    const titreG = 'l’écoute de ' + heureDiteEP(g.debut);
    t.appendChild(el('b', '', heureDiteEP(g.debut) + '–' + heureDiteEP(g.fin) + ' · ' + nomAgenceEP(g.agence) + ' · ' + colonneDiteEP(g.colonne) +
      (toutes ? ' — annulée' : enCours ? ' — en cours' : d.minutes >= minEP(g.fin) ? ' — finie' : '')));
    if(d.peutTout){
      const ba = el('button', 'btn btn-secondary epAnnulerJour', toutes ? '↩️ Remettre' : '✕ Annuler l’écoute');
      ba.type = 'button';
      ba.addEventListener('click', () => toutes ? remettreEcouteDuJourEP(g.l, recharger, ba)
                                                : annulerEcouteDuJourEP(g.l.filter(x => !x.annulee), titreG, recharger, ba));
      t.appendChild(ba);
    }
    gb.appendChild(t);
    g.l.forEach(x => {
      if(x.annulee){
        const l = el('div', 'epRappelLigne epJourLigne barre');
        l.setAttribute('data-eleve', x.eleve);
        const tx = el('div', 'epRappelNom');
        tx.appendChild(el('b', '', x.eleve));
        tx.appendChild(el('span', 'epCol', ' · annulée' + (x.annuleePar ? ' par ' + x.annuleePar : '') + (x.annulationEnvoyee ? ' · 📣 prévenu(e)' : '')));
        l.appendChild(tx);
        if(d.peutTout && !toutes){
          const br = el('button', 'btn btn-secondary', '↩️');
          br.type = 'button'; br.title = 'Remettre son écoute';
          br.addEventListener('click', () => remettreEcouteDuJourEP([x], recharger, br));
          l.appendChild(br);
        }
        gb.appendChild(l);
        return;
      }
      const e = etatJourEP(d, x);
      const l = el('div', 'epRappelLigne epJourLigne' + (e.bureau ? ' ' + (e.bureau.etat === 'la' ? 'epLa' : 'epPasLa') : (e.present ? ' epLa' : '')));
      l.setAttribute('data-eleve', x.eleve);
      const tx = el('div', 'epRappelNom');
      tx.appendChild(el('b', '', x.eleve));
      tx.appendChild(el('span', 'epCol', ' · ' + e.texte));
      if(e.bureau) tx.appendChild(el('div', 'epRegSous', '🏢 ' + (e.bureau.etat === 'la' ? 'Là' : 'Pas là') + ' — ' + (e.bureau.par || 'le bureau') + (e.bureau.quand ? ' à ' + heureDeMsEP(e.bureau.quand) : '')));
      l.appendChild(tx);
      if(d.peutTout){
        const boutons = el('div', 'epJourBoutons');
        const poser = async (etat, b) => {
          b.disabled = true;
          try{ recharger(await appelPrep({ action: 'ecouteBureauPoser', id: x.id, etat: etat })); }
          catch(err){ b.disabled = false; if(typeof showToast === 'function') showToast('Impossible : ' + ((err && err.message) || err)); }
        };
        const bLa = el('button', 'btn ' + (e.bureau && e.bureau.etat === 'la' ? 'btn-primary' : 'btn-secondary'), '✅ Là');
        bLa.type = 'button';
        bLa.title = e.bureau && e.bureau.etat === 'la' ? 'Retirer « là »' : 'Il est bien là';
        bLa.addEventListener('click', () => poser(e.bureau && e.bureau.etat === 'la' ? '' : 'la', bLa));
        const bAbs = el('button', 'btn ' + (e.bureau && e.bureau.etat === 'absent' ? 'btn-primary' : 'btn-secondary'), '🚫 Pas là');
        bAbs.type = 'button';
        bAbs.title = e.bureau && e.bureau.etat === 'absent' ? 'Retirer « pas là »' : 'Il n’est pas venu';
        bAbs.addEventListener('click', () => poser(e.bureau && e.bureau.etat === 'absent' ? '' : 'absent', bAbs));
        boutons.append(bLa, bAbs);
        if(g.l.filter(y => !y.annulee).length > 1){
          const bX = el('button', 'btn btn-secondary', '✕');
          bX.type = 'button'; bX.title = 'Annuler son écoute (lui/elle seulement)';
          bX.addEventListener('click', () => annulerEcouteDuJourEP([x], 'l’écoute de ' + heureDiteEP(x.debut), recharger, bX));
          boutons.appendChild(bX);
        }
        if(e.absence && e.absence.etat === 'a_confirmer'){
          const bEnv = el('button', 'btn btn-primary', '✉️ Envoyer l’absence');
          bEnv.type = 'button';
          bEnv.addEventListener('click', () => envoyerAbsenceEP(e.absence, bEnv));
          boutons.appendChild(bEnv);
        }
        l.appendChild(boutons);
      }
      gb.appendChild(l);
    });
    bloc.appendChild(gb);
  });
  bloc.appendChild(el('div', 'epPied', '✅ Là : ses absences du jour s’effacent, et le pointage n’en recrée pas. 🚫 Pas là : l’absence est posée « à confirmer » — rien ne part sans « ✉️ Envoyer l’absence » (ou l’envoi automatique, s’il est allumé). Un second appui retire la décision. ✕ Annuler : l’écoute disparaît des cours des moniteurs et de l’affichage (prévenir l’élève ou non, au choix).'));
  return bloc;
}

/* Les absences trouvées au pointage, en lignes de la liste « 🚫 Pas
   venu en écoute » (groupées avec celles signalées à la main) */
function ligneAbsenceEP(a){
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; };
  const l = el('div', 'epAbsLigne');
  const t = el('div', 'epAbsTexte');
  const quand = (typeof dateEnToutesLettres === 'function' ? dateEnToutesLettres(a.jour) : a.jour) + ' · ' + heureDiteEP(a.debut) + '–' + heureDiteEP(a.fin) +
    ' · ' + (a.colonne ? colonneDiteEP(a.colonne) + ' ' : '') + '(' + nomAgenceEP(a.agence) + ')';
  t.appendChild(el('b', '', quand));
  t.appendChild(el('span', 'epTag ' + (a.etat === 'envoyee' ? 'pointage' : 'confirmer'),
    a.etat === 'envoyee' ? '👂 pointage' : a.etat === 'a_verifier' ? '❓ à vérifier' : '❓ à confirmer'));
  const sous = a.etat === 'a_verifier'
    ? 'Des moniteurs de ' + heureDiteEP(a.heure) + ' n’ont pas pointé' + (a.pointePar ? ' (pointé : ' + a.pointePar + ')' : '') + ' · rien n’est parti'
    : 'Personne ne l’avait à ' + heureDiteEP(heureEP(String(Math.floor((minEP(a.heure) + 30) / 60)) + ':' + String((minEP(a.heure) + 30) % 60).padStart(2, '0'))) +
      (a.pointePar ? ' (pointé : ' + a.pointePar + ')' : '') +
      (a.etat === 'envoyee' ? ' · ✉️ ' + (a.mail === 'ok' ? 'mail envoyé' : a.mail) + (a.envoyePar ? ' par ' + a.envoyePar : '') + ' à ' + heureDeMsEP(a.envoyeLe) +
                              ' · 💬 ' + (a.message === 'ok' ? 'message parti' : a.message)
                            : ' · rien n’est parti');
  t.appendChild(el('div', 'epRegSous', sous));
  l.appendChild(t);
  if(a.etat !== 'envoyee'){
    const b1 = el('button', 'btn btn-primary', '✉️ Envoyer l’absence');
    b1.type = 'button';
    b1.addEventListener('click', () => envoyerAbsenceEP(a, b1));
    l.appendChild(b1);
  }
  const b2 = el('button', 'btn btn-secondary', '↩️ Était là');
  b2.type = 'button';
  b2.addEventListener('click', () => etaitLaEP(a, b2));
  l.appendChild(b2);
  return l;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-ecoutes-presence.js'] = true;
