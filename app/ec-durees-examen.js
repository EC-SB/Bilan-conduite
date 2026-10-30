/* Déployé le 28/10/2026 à 20:09 — v1300 */
/* ============================================================
   ec-durees-examen.js — ⏱️ LA DURÉE DES EXAMENS OFFICIELS

   David, le 28 octobre 2026 : « sur les examens officiels il faut
   ajouter un bouton début d'examen, et un bouton fin d'examen qui
   enregistre la durée de l'examen, et que cette durée soit mise dans
   notre partie à nous et qu'on puisse la voir — elle ne va jamais à
   l'élève ».

   Ses choix :
     · les deux boutons en haut de « 🏁 Examen » sur la fiche, ET sur la
       ligne de la fiche gardée en haut de l'écran (on enchaîne les
       élèves sans rouvrir chaque fiche) ;
     · les heures se corrigent à la main (un bouton oublié) ;
     · la durée se voit : note interne du bilan, dossier élève ›
       Permis, historique des leçons, et une moyenne par centre et
       par inspecteur dans Permis › Résultats.

   ⚠️ JAMAIS À L'ÉLÈVE. buildExamen ne lit pas « dureeExamen » ; la
   note interne ne part pas ; le Worker ne la sert sur aucune route de
   l'espace élève. Rangée côté serveur (D1, examens_durees) : effacée
   et renommée avec son dossier, rendue par l'export RGPD.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const DX = { liste: null, charge: 0, enCours: null, envois: {} };

const dxEch = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function dxNorm(s){ return (typeof normaliserMot === 'function') ? normaliserMot(String(s || '')) : String(s || '').toLowerCase().trim(); }
function dxAujourdhui(){ return (typeof todayLocal === 'function') ? todayLocal() : new Date().toISOString().slice(0, 10); }
function dxMaintenant(){ const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
/* « 28/10/2026 », « 2026-10-28 », « 28/10/2026 10:02 » → « 2026-10-28 » */
function dxIso(v){
  const t = String(v || '').trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return m[1] + '-' + m[2] + '-' + m[3];
  m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0') : '';
}
function dxFr(iso){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || ''); }
function dxHeure(v){
  const m = String(v || '').trim().match(/^(\d{1,2})[:h](\d{1,2})$/);
  if(!m || Number(m[1]) > 23 || Number(m[2]) > 59) return '';
  return m[1].padStart(2, '0') + ':' + m[2].padStart(2, '0');
}
function dxMinutes(debut, fin){
  const a = dxHeure(debut), b = dxHeure(fin);
  if(!a || !b) return 0;
  const m = (Number(b.slice(0, 2)) * 60 + Number(b.slice(3))) - (Number(a.slice(0, 2)) * 60 + Number(a.slice(3)));
  return m > 0 && m < 300 ? m : 0;
}
/* « 32 min », « 1 h 05 » */
function dxDuree(min){
  min = Math.round(Number(min) || 0);
  if(min < 60) return min + ' min';
  return Math.floor(min / 60) + ' h ' + String(min % 60).padStart(2, '0');
}
/* La phrase de l'équipe : « 32 min (10:02 → 10:34) », « en cours depuis 10:02 » */
function dxPhrase(debut, fin, jour){
  const a = dxHeure(debut), b = dxHeure(fin), m = dxMinutes(a, b);
  if(a && b) return m ? dxDuree(m) + ' (' + a + ' → ' + b + ')' : '⚠️ ' + a + ' → ' + b + ' : la fin est avant le début';
  if(a && (!jour || jour === dxAujourdhui())){
    const d = new Date(), passe = d.getHours() * 60 + d.getMinutes() - (Number(a.slice(0, 2)) * 60 + Number(a.slice(3)));
    return '⏳ en cours depuis ' + a + (passe > 0 ? ' (' + dxDuree(passe) + ')' : '');
  }
  if(a) return 'commencé à ' + a + ', fin non notée';
  if(b) return 'fin à ' + b + ', début non noté';
  return '';
}
/* ⏱️ v1300 — l'examen officiel seul part au serveur (ses statistiques,
   son dossier) ; l'examen blanc et le rendez-vous pédagogique gardent la
   durée sur la fiche et dans la note interne — jamais à l'élève */
function dxOfficiel(modele){
  const m = modele != null ? modele : (($('modele') && $('modele').value) || '');
  return m === 'examen-officiel';
}
const DX_MODELES = { 'examen-officiel': 'dureeExamen', 'examen-blanc': 'dureeExamen', 'aac-rvp': 'examenBlanc.dureeExamen' };
/* Le compteur : « 12:34 », « 1:02:07 » */
function dxCompte(ms){
  const t = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, sec = t % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(sec).padStart(2, '0');
}
/* Depuis quand, au plus juste : la seconde notée sur cet appareil quand
   le bouton a été pressé ici, sinon l'heure de la fiche (à la minute) */
function dxDepuis(eleve, jour, debut){
  const h = dxHeure(debut);
  if(!h) return 0;
  try{
    const x = JSON.parse(localStorage.getItem('ec_dx_depuis') || '{}')[dxNorm(eleve) + '|' + jour];
    if(x && x.h === h) return Number(x.t) || 0;
  }catch(e){}
  const m = String(jour || dxAujourdhui()).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3], +h.slice(0, 2), +h.slice(3), 0) : new Date();
  return d.getTime();
}
function dxNoterDepuis(eleve, jour, debut){
  try{
    const t = JSON.parse(localStorage.getItem('ec_dx_depuis') || '{}');
    Object.keys(t).forEach(k => { if(Date.now() - Number((t[k] || {}).t || 0) > 2 * 86400000) delete t[k]; });
    t[dxNorm(eleve) + '|' + jour] = { h: dxHeure(debut), t: Date.now() };
    localStorage.setItem('ec_dx_depuis', JSON.stringify(t));
  }catch(e){}
}

/* La valeur gardée dans la fiche : « 10:02|10:34 » */
function dxLireValeur(v){ const p = String(v || '').split('|'); return { debut: dxHeure(p[0]), fin: dxHeure(p[1]) }; }

/* ── le serveur ── */
async function chargerDureesExamen(force){
  if(!force && DX.liste && Date.now() - DX.charge < 5 * 60000) return DX.liste;
  if(DX.enCours) return DX.enCours;
  DX.enCours = (async () => {
    try{
      const r = await appelPrep({ action: 'examenDureeList' });
      if(r && r.status === 'ok'){ DX.liste = r.durees || []; DX.charge = Date.now(); }
    }catch(e){ /* sans réseau : on garde ce qu'on avait */ }
    DX.enCours = null;
    return DX.liste || [];
  })();
  return DX.enCours;
}
/* Ce qu'on sait pour un élève, un jour donné (sans attendre) */
function dureeExamenDe(eleve, jour){
  const k = dxNorm(eleve), j = dxIso(jour);
  return (DX.liste || []).find(x => x.eleveCle === k && x.jour === j) || null;
}
/* Envoyer (un peu plus tard si l'on corrige au clavier) — une file par élève et par jour */
function envoyerDureeExamen(o, attente){
  if(!o || !o.eleve || !o.jour) return Promise.resolve(null);
  const cle = dxNorm(o.eleve) + '|' + o.jour;
  clearTimeout(DX.envois[cle]);
  return new Promise(res => {
    DX.envois[cle] = setTimeout(async () => {
      let r = null;
      try{
        r = await appelPrep(Object.assign({ action: 'examenDureeSet' }, o));
        if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
        /* La copie locale suit : dossier, historique et statistiques la lisent */
        DX.liste = (DX.liste || []).filter(x => !(x.eleveCle === dxNorm(o.eleve) && x.jour === o.jour));
        if(r.duree) DX.liste.unshift(r.duree);
      }catch(e){
        if(typeof showToast === 'function') showToast('⚠️ Durée de l’examen pas enregistrée : ' + (e && e.message ? e.message : 'réseau') + ' — elle reste sur la fiche');
      }
      res(r);
    }, attente || 0);
  });
}
/* Le contexte de la fiche ouverte : élève, jour, moniteur, inspecteur, centre */
function dxContexteFiche(){
  const eleve = ($('studentName') && $('studentName').value.trim()) || '';
  const jour = dxIso(($('lessonDate') && $('lessonDate').value) || '') || dxAujourdhui();
  const s = (eleve && typeof suiviDe === 'function') ? (suiviDe(eleve) || {}) : {};
  const insp = document.getElementById('man_inspecteur');
  return { eleve: eleve, jour: jour, moniteur: ($('monitorName') && $('monitorName').value.trim()) || '',
           inspecteur: (insp && insp.value && insp.value !== '__autre__') ? insp.value : '', centre: String(s.centre || '').trim() };
}

/* ============================================================
   ① SUR LA FICHE — en haut de « 🏁 Examen »
   ============================================================ */
function dessinerDureeExamen(bloc, ch){
  bloc.classList.add('zonePourNous');
  bloc.style.cssText = 'border:1px dashed var(--line);border-radius:12px;padding:24px 12px 11px;margin-bottom:16px;';
  const cle = String(ch.cle || 'dureeExamen');
  bloc.innerHTML =
    '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-bottom:8px;">' +
      /* « 🔒 Pour nous seulement — ne part pas à l'élève » : posé par la
         classe zonePourNous, comme les zones « pour nous » du créateur */
      '<b style="font-size:15px;">' + dxEch(ch.nom || '⏱️ Durée de l’examen') + '</b></div>' +
    /* ⏱️ v1300 — le compteur, visible de loin pendant l'examen */
    '<div class="dxCompteur" aria-live="off" style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;font-weight:800;' +
      'letter-spacing:.02em;text-align:center;margin:0 0 10px;color:var(--muted);">0:00</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:9px;">' +
      '<button type="button" class="btn btn-primary dxDebut" style="flex:1;min-width:140px;margin:0;padding:12px;font-size:15px;">▶️ Début d’examen</button>' +
      '<button type="button" class="btn btn-secondary dxFin" style="flex:1;min-width:140px;margin:0;padding:12px;font-size:15px;">⏹️ Fin d’examen</button></div>' +
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:13px;">' +
      '<label style="display:flex;gap:6px;align-items:center;margin:0;">Début <input type="time" class="dxH" data-cle="' + dxEch(cle) + '.debut" id="man_' + dxEch(cle) + '_debut" style="width:auto;margin:0;padding:6px 8px;"></label>' +
      '<label style="display:flex;gap:6px;align-items:center;margin:0;">Fin <input type="time" class="dxH" data-cle="' + dxEch(cle) + '.fin" id="man_' + dxEch(cle) + '_fin" style="width:auto;margin:0;padding:6px 8px;"></label>' +
      '<b class="dxTotal" style="color:var(--accent-text);"></b></div>';
  const iD = bloc.querySelector('[data-cle="' + cle + '.debut"]'), iF = bloc.querySelector('[data-cle="' + cle + '.fin"]');
  const bD = bloc.querySelector('.dxDebut'), bF = bloc.querySelector('.dxFin'), tot = bloc.querySelector('.dxTotal');
  const compteur = bloc.querySelector('.dxCompteur');
  const reglage = () => (typeof ficheEnReglage === 'function') && ficheEnReglage();
  const compter = () => {
    const c = dxContexteFiche();
    const a = dxHeure(iD.value), b = dxHeure(iF.value);
    if(a && b){
      const m = dxMinutes(a, b);
      compteur.textContent = m ? dxCompte(m * 60000) : '—';
      compteur.style.color = 'var(--accent-text)';
    }else if(a && c.jour === dxAujourdhui()){
      compteur.textContent = dxCompte(Date.now() - dxDepuis(c.eleve, c.jour, a));
      compteur.style.color = 'var(--cream)';
    }else{
      compteur.textContent = '0:00';
      compteur.style.color = 'var(--muted)';
    }
  };
  const peindre = () => {
    const c = dxContexteFiche();
    tot.textContent = dxPhrase(iD.value, iF.value, c.jour);
    compter();
    const enCours = iD.value && !iF.value;
    bD.className = 'btn ' + (iD.value ? 'btn-secondary' : 'btn-primary') + ' dxDebut';
    bF.className = 'btn ' + (enCours ? 'btn-primary' : 'btn-secondary') + ' dxFin';
    bD.textContent = iD.value ? '↺ Recommencer' : '▶️ Début d’examen';
  };
  const signaler = (el) => { el.dispatchEvent(new Event('input', { bubbles: true })); };
  const envoyer = (attente) => {
    if(reglage()) return;
    /* l'examen blanc et le rendez-vous pédagogique : sur la fiche seulement */
    if(!dxOfficiel()) return;
    const c = dxContexteFiche();
    if(!c.eleve) return;
    envoyerDureeExamen(Object.assign(c, { debut: iD.value, fin: iF.value }), attente);
  };
  bD.addEventListener('click', async () => {
    if(iD.value && typeof confirmer === 'function' &&
       !await confirmer('L’examen a déjà commencé à ' + iD.value + (iF.value ? ' et fini à ' + iF.value : '') + '.\n\nRepartir de maintenant ?', '⏱️ Début d’examen')) return;
    iD.value = dxMaintenant(); iF.value = '';
    { const c = dxContexteFiche(); dxNoterDepuis(c.eleve, c.jour, iD.value); }
    signaler(iD); peindre(); envoyer(0);
    if(typeof showToast === 'function') showToast('▶️ Examen commencé à ' + iD.value);
  });
  bF.addEventListener('click', () => {
    if(!iD.value){ if(typeof showToast === 'function') showToast('Appuie d’abord sur ▶️ Début d’examen — ou tape l’heure de début.'); iD.focus(); return; }
    iF.value = dxMaintenant();
    signaler(iF); peindre(); envoyer(0);
    if(typeof showToast === 'function') showToast('⏹️ Examen fini : ' + dxPhrase(iD.value, iF.value));
  });
  [iD, iF].forEach(i => i.addEventListener('change', () => { peindre(); envoyer(800); }));
  /* Une fiche reprise remet les heures sans prévenir ; « en cours depuis »
     avance tout seul : on repeint de temps en temps, tant qu'elle est là */
  peindre();
  const t = setInterval(() => { if(!bloc.isConnected){ clearInterval(t); return; } peindre(); }, 15000);
  /* le compteur, à la seconde, tant que l'examen court */
  const t2 = setInterval(() => { if(!bloc.isConnected){ clearInterval(t2); return; } if(iD.value && !iF.value) compter(); }, 1000);
  setTimeout(peindre, 400);
}
/* La valeur que lit le bilan : « 10:02|10:34 » */
function lireDureeExamenFiche(cle){
  const k = String(cle || 'dureeExamen');
  const d = document.querySelector('#manuelChamps [data-cle="' + k + '.debut"]') || document.querySelector('[data-cle="' + k + '.debut"]');
  const f = document.querySelector('#manuelChamps [data-cle="' + k + '.fin"]') || document.querySelector('[data-cle="' + k + '.fin"]');
  const a = d ? dxHeure(d.value) : '', b = f ? dxHeure(f.value) : '';
  return (a || b) ? a + '|' + b : '';
}
/* Au bilan : la ligne de la note interne, et l'inspecteur choisi part avec */
function mentionDureeExamen(valeur){
  const v = dxLireValeur(valeur);
  const p = dxPhrase(v.debut, v.fin, '0000-00-00');
  return p ? '⏱️ Durée : ' + p : '';
}
function noterDureeAuBilan(champs){
  const v = dxLireValeur(champs && champs.dureeExamen);
  if(!v.debut && !v.fin) return;
  const c = dxContexteFiche();
  if(!c.eleve) return;
  if(champs.inspecteur) c.inspecteur = String(champs.inspecteur);
  envoyerDureeExamen(Object.assign(c, v), 0);
}

/* ============================================================
   ② SUR LA FICHE GARDÉE, EN HAUT DE L'ÉCRAN
   ============================================================ */
function dxSaisie(b, suffixe){ const k = DX_MODELES[(b && b.modele) || ''] || 'dureeExamen'; return (b && b.saisies || []).find(s => String(s.cle || '') === k + '.' + suffixe) || null; }
/* Les boutons d'une fiche d'examen gardée : officiel, blanc, rendez-vous
   pédagogique (v1300) — rien pour les autres */
function boutonsDureeBrouillon(b){
  if(!b || !DX_MODELES[b.modele]) return null;
  const cleD = DX_MODELES[b.modele];
  const sD = dxSaisie(b, 'debut'), sF = dxSaisie(b, 'fin');
  if(!sD || !sF) return null;      /* une fiche commencée avant la v1295 */
  const jour = dxIso(b.date) || dxAujourdhui();
  const w = document.createElement('div');
  w.className = 'dxBandeau';
  w.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:5px;';
  w.addEventListener('click', e => e.stopPropagation());
  const deb = dxHeure(sD.valeur), fin = dxHeure(sF.valeur);
  const bouton = (t, prim, f) => {
    const x = document.createElement('button');
    x.type = 'button'; x.className = 'btn ' + (prim ? 'btn-primary' : 'btn-secondary');
    x.style.cssText = 'width:auto;margin:0;padding:6px 11px;font-size:12.5px;';
    x.textContent = t; x.addEventListener('click', e => { e.stopPropagation(); f(); });
    w.appendChild(x);
  };
  const ecrire = (d, f) => {
    sD.valeur = d; sF.valeur = f;
    /* La fiche ouverte de cet élève : ses champs suivent, et sa garde aussi */
    const ouvert = $('studentName') && dxNorm($('studentName').value) === dxNorm(b.eleve);
    const iD = ouvert && document.querySelector('#manuelChamps [data-cle="' + cleD + '.debut"]');
    const iF = ouvert && document.querySelector('#manuelChamps [data-cle="' + cleD + '.fin"]');
    if(iD && iF){ iD.value = d; iF.value = f; iD.dispatchEvent(new Event('input', { bubbles: true })); }
    try{
      const l = JSON.parse(localStorage.getItem('bilans_manuels') || '[]');
      const x = Array.isArray(l) ? l.find(y => y && dxNorm(y.eleve) === dxNorm(b.eleve) && y.modele === b.modele) : null;
      if(x){
        (x.saisies || []).forEach(s => { if(s.cle === cleD + '.debut') s.valeur = d; if(s.cle === cleD + '.fin') s.valeur = f; });
        localStorage.setItem('bilans_manuels', JSON.stringify(l));
      }
    }catch(e){}
    const s = (typeof suiviDe === 'function') ? (suiviDe(b.eleve) || {}) : {};
    if(d && !f) dxNoterDepuis(b.eleve, jour, d);
    if(dxOfficiel(b.modele)) envoyerDureeExamen({ eleve: b.eleve, jour: jour, debut: d, fin: f, moniteur: b.moniteur || '', centre: String(s.centre || '') }, 0);
    if(typeof proposerReprise === 'function') proposerReprise();
  };
  const etat = document.createElement('span');
  etat.style.cssText = 'font-size:12px;color:var(--accent-text);font-weight:700;';
  if(!deb){
    bouton('▶️ Début d’examen', true, () => { ecrire(dxMaintenant(), ''); if(typeof showToast === 'function') showToast('▶️ ' + b.eleve + ' : examen commencé'); });
  }else if(!fin){
    /* ⏱️ v1300 — le compteur, à la seconde */
    const cpt = document.createElement('b');
    cpt.className = 'dxCompteurB';
    cpt.style.cssText = 'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:15px;';
    const tic = () => { cpt.textContent = '⏱️ ' + dxCompte(Date.now() - dxDepuis(b.eleve, jour, deb)); };
    tic();
    const t = setInterval(() => { if(!cpt.isConnected){ clearInterval(t); return; } tic(); }, 1000);
    w.appendChild(cpt);
    etat.textContent = 'en cours depuis ' + deb;
    w.appendChild(etat);
    bouton('⏹️ Fin d’examen', true, () => { const f = dxMaintenant(); ecrire(deb, f); if(typeof showToast === 'function') showToast('⏹️ ' + b.eleve + ' : ' + dxPhrase(deb, f)); });
  }else{
    etat.textContent = '⏱️ ' + dxPhrase(deb, fin);
    w.appendChild(etat);
  }
  return w;
}

/* ============================================================
   ③ DOSSIER ÉLÈVE › PERMIS
   ============================================================ */
async function zoneDureesExamenEleve(corps, nom){
  const z = document.createElement('div');
  corps.appendChild(z);
  const l = (await chargerDureesExamen(true)).filter(x => x.eleveCle === dxNorm(nom));
  if(!l.length || !z.isConnected) return;
  if(typeof sousTitreDossier === 'function') z.appendChild(sousTitreDossier('⏱️ Durée de ses examens — pour nous'));
  l.forEach(x => {
    const d = [dxPhrase(x.debut, x.fin, x.jour), x.inspecteur ? 'inspecteur ' + x.inspecteur : '', x.centre, x.moniteur].filter(Boolean).join(' · ');
    z.appendChild(typeof ligneDossier === 'function' ? ligneDossier('🎓 Examen du ' + dxFr(x.jour), d) : document.createTextNode(d));
  });
}

/* ============================================================
   ④ HISTORIQUE DES LEÇONS — sur la ligne d'un examen officiel
   ============================================================ */
function spanDureeHistorique(item){
  if(!item || !/examen officiel/i.test(String(item.type || ''))) return null;
  const sp = document.createElement('span');
  sp.className = 'dxHisto';
  sp.style.cssText = 'color:var(--accent-text);';
  const peindre = () => {
    const x = dureeExamenDe(item.eleve, item.date);
    sp.textContent = x ? '⏱️ Examen : ' + dxPhrase(x.debut, x.fin, x.jour) + ' · 🔒 pour nous' : '';
    sp.style.display = x ? '' : 'none';
  };
  peindre();
  if(!DX.liste || Date.now() - DX.charge > 5 * 60000) chargerDureesExamen().then(peindre);
  return sp;
}

/* ============================================================
   ⑤ PERMIS › RÉSULTATS — la durée moyenne par centre, par inspecteur
   ============================================================ */
async function afficherDureesExamen(){
  const z = $('dureesExamenZone');
  if(!z) return;
  z.innerHTML = '<div class="empty">Lecture…</div>';
  const l = (await chargerDureesExamen(true)).filter(x => Number(x.minutes) > 0);
  if(!l.length){
    z.innerHTML = '<div class="empty">Aucune durée notée pour le moment. Elles arrivent avec ▶️ Début et ⏹️ Fin, sur la fiche d’examen officiel.</div>';
    return;
  }
  const groupe = (cle, vide) => {
    const g = {};
    l.forEach(x => { const k = String(x[cle] || '').trim() || vide; (g[k] = g[k] || []).push(Number(x.minutes)); });
    return Object.keys(g).map(k => ({ k: k, n: g[k].length, moy: g[k].reduce((a, b) => a + b, 0) / g[k].length, min: Math.min.apply(null, g[k]), max: Math.max.apply(null, g[k]) }))
      .sort((a, b) => b.n - a.n || a.k.localeCompare(b.k));
  };
  const table = (titre, rows) => '<div style="font-size:12px;font-weight:800;letter-spacing:.06em;color:var(--muted);margin:12px 0 6px;">' + titre + '</div>' +
    '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">' +
    '<tr style="color:var(--muted);font-size:12px;"><th style="text-align:left;padding:5px 6px;"></th><th style="padding:5px 6px;">Examens</th><th style="padding:5px 6px;">Moyenne</th><th style="padding:5px 6px;">Plus court</th><th style="padding:5px 6px;">Plus long</th></tr>' +
    rows.map(r => '<tr style="border-top:1px solid var(--line);"><td style="padding:6px;">' + dxEch(r.k) + '</td><td style="padding:6px;text-align:center;">' + r.n + '</td>' +
      '<td style="padding:6px;text-align:center;font-weight:800;color:var(--accent-text);">' + dxDuree(r.moy) + '</td><td style="padding:6px;text-align:center;">' + dxDuree(r.min) + '</td>' +
      '<td style="padding:6px;text-align:center;">' + dxDuree(r.max) + '</td></tr>').join('') + '</table></div>';
  const tout = l.reduce((a, x) => a + Number(x.minutes), 0) / l.length;
  z.innerHTML = '<div style="font-size:13px;margin-bottom:4px;">' + l.length + ' examen(s) chronométré(s) · moyenne <b style="color:var(--accent-text);">' + dxDuree(tout) + '</b>' +
      ' <span style="color:var(--muted);font-size:12px;">— 🔒 pour l’équipe, jamais à l’élève</span></div>' +
    table('PAR CENTRE D’EXAMEN', groupe('centre', 'Centre non noté')) +
    table('PAR INSPECTEUR', groupe('inspecteur', 'Inspecteur non noté')) +
    '<div style="font-size:12px;font-weight:800;letter-spacing:.06em;color:var(--muted);margin:12px 0 6px;">LES DERNIERS</div>' +
    l.slice(0, 15).map(x => '<div style="font-size:13px;padding:5px 0;border-top:1px solid var(--line);">' + dxFr(x.jour) + ' · <b>' + dxEch(x.eleve) + '</b> · ' + dxEch(dxPhrase(x.debut, x.fin, x.jour)) +
      [x.inspecteur, x.centre, x.moniteur].filter(Boolean).map(t => ' · ' + dxEch(t)).join('') + '</div>').join('');
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-durees-examen.js'] = true;
