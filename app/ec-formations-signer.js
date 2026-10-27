/* Déployé le 27/10/2026 à 17:38 — v1282 */
/* ============================================================
   ec-formations-signer.js — ✍️ LES SIGNATURES DES FORMATIONS (v1282)

   David, le 27 octobre 2026 : « faire signer les élèves », « que le
   moniteur puisse faire signer la fiche de présence » ; et, pour les
   formations qui n'apparaissent pas dans « Mes prochains cours » :
   « il faut que le moniteur puisse faire signer directement dans le
   dossier ». Son arbitrage : TOUS les moniteurs, sans case dans
   ⚙️ Accès, voient les formations dont ils sont le formateur.

   Trois endroits, un seul écran de signature :
   · 💼 Formations (le moniteur ne voit que SES formations : leurs
     séances, leurs stagiaires) — ✍️ Faire signer, ✍️ Séance non
     prévue, 📄 La feuille ;
   · 📅 Séances du dossier, pour le bureau ;
   · la carte du cours dans « Mes prochains cours », quand l'élève du
     cours est un salarié d'une formation : 💼 FORMATION ENTREPRISE.

   Chaque salarié signe du doigt, un par un (🚫 Absent s'il n'est pas
   là), puis le formateur en dernier — sa signature est gardée, un
   appui suffit ensuite. Le Worker horodate et range chaque signature,
   et refuse de la changer ensuite. La feuille signée part toute seule
   dans le dossier (📄 Documents).
   ============================================================ */

const FS = { miennes: null, chargeLe: 0, enCours: null, maSig: undefined, ecran: null };

/* ---------- où trouver un dossier ---------- */
function fsSource(fid){
  if(typeof FE !== 'undefined' && FE.d && (FE.d.formations || []).some(x => x.id === fid))
    return { x: FE.d.formations.find(x => x.id === fid), organisme: FE.d.organisme, entetes: FE.d.entetes, gere: !FE.d.restreint || !!FE.d.gere, moi: FE.d.moi };
  if(FS.miennes && (FS.miennes.formations || []).some(x => x.id === fid))
    return { x: FS.miennes.formations.find(x => x.id === fid), organisme: FS.miennes.organisme, entetes: FS.miennes.entetes, gere: !!FS.miennes.gere, moi: FS.miennes.moi };
  return null;
}
function fsMoi(){ return (typeof ACCES !== 'undefined' && ACCES && ACCES.moniteur) || (FE.d && FE.d.moi) || (FS.miennes && FS.miennes.moi) || ''; }
function fsEstFormateur(d, s){
  const f = feNorm((s && s.formateur) || (d.formation && d.formation.formateur));
  return !!f && f === feNorm(fsMoi());
}
/* La réponse du Worker remplace le dossier partout où il est affiché */
function fsMajFormation(f){
  if(!f) return;
  if(typeof FE !== 'undefined' && FE.d){
    const l = FE.d.formations || [];
    const i = l.findIndex(x => x.id === f.id);
    if(i !== -1){
      if(FE.d.restreint) l[i] = f;
      else { feFusionServeur(l[i], f.donnees); l[i].majLe = f.majLe; }
    }
  }
  if(FS.miennes){
    const l = FS.miennes.formations || [];
    const i = l.findIndex(x => x.id === f.id);
    if(i !== -1) l[i] = f.restreint ? f : Object.assign({}, l[i], { donnees: Object.assign({}, l[i].donnees, { seances: f.donnees.seances, stagiaires: (f.donnees.stagiaires || []).map(s => ({ id: s.id, nom: s.nom, fonction: s.fonction })) }) });
  }
}
function fsRedessiner(){
  if(typeof FE !== 'undefined' && FE.d && $('formationsZone') && $('formationsZone').offsetParent) feDessiner();
  fsRemplirLesCartes();
}

/* ---------- l'état des signatures d'une séance ---------- */
function fsEtat(d, s){
  const demis = feDemis(s), ins = feInscrits(d, s), sig = Array.isArray(s.signatures) ? s.signatures : [];
  const signe = st => demis.every(dm => sig.some(e => e.qui === st.id && e.demi === dm && !e.absent));
  const absents = ins.filter(st => sig.some(e => e.qui === st.id && e.absent) && !signe(st));
  return { demis: demis, ins: ins, sig: sig, commence: sig.length > 0, complete: feSeanceSignee(d, s),
           nSignes: ins.filter(signe).length, absents: absents,
           formateur: sig.filter(e => e.qui === '_formateur') };
}
function fsDemiLib(dm){ return dm === 'matin' ? 'matin' : (dm === 'apres' ? 'après-midi' : ''); }
function fsMoment(s){
  const a = feMinutes(s.debut), b = feMinutes(s.fin);
  if(a !== null && b !== null && a < 12 * 60 && b > 13 * 60 + 30) return 'journée';
  return a !== null && a >= 12 * 60 ? 'après-midi' : 'matin';
}
function fsJourCourt(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return '';
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'][d.getDay()] + ' ' + (+m[3]) + ' ' + ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][+m[2] - 1];
}
function fsPeutFaireSigner(src, d, s){ return !!src && (src.gere || fsEstFormateur(d, s)); }

/* La ligne d'état, dans 📅 Séances et sur les cartes du moniteur */
function feLigneSignatures(x, s){
  const d = x.donnees, e = fsEtat(d, s), auj = feAujourdhui();
  const l = feEl('div', 'feSigEtat');
  if(e.complete){
    l.appendChild(feEl('b', 'ok', '✅ Signée'));
    l.appendChild(document.createTextNode(' · ' + e.nSignes + '/' + e.ins.length + ' + formateur'));
    if(e.absents.length){
      const a = feEl('div', 'feSigAbs', '⚠️ ' + e.absents.map(z => z.nom).join(', ') + ' absent' + (e.absents.length > 1 ? 's' : '') + ' — pas de signature');
      l.appendChild(a);
    }
  } else if(e.commence){
    l.appendChild(feEl('b', 'att', '✍️ en cours'));
    l.appendChild(document.createTextNode(' · ' + e.sig.filter(z => z.qui !== '_formateur' && !z.absent).length + ' signature' + (e.sig.length > 1 ? 's' : '') + ', le formateur n’a pas encore signé'));
  } else if(s.date === auj){
    l.appendChild(feEl('b', 'ici', '🔴 aujourd’hui'));
    l.appendChild(document.createTextNode(' · pas encore signée'));
  } else if(s.date && s.date < auj){
    l.appendChild(feEl('b', 'ko', '⚠️ pas signée'));
    l.appendChild(document.createTextNode(' sur le téléphone'));
  } else {
    l.appendChild(feEl('span', 'feAideIn', '🕘 à venir'));
  }
  return l;
}
/* Les boutons : ✍️ Faire signer / Continuer / Compléter, 📄 La feuille */
function feBoutonsSignature(x, s){
  const d = x.donnees, e = fsEtat(d, s), auj = feAujourdhui(), src = fsSource(x.id);
  const out = [];
  if(fsPeutFaireSigner(src, d, s) && s.date && s.date <= auj){
    if(!e.complete) out.push(feBouton(e.commence ? '✍️ Continuer' : '✍️ Faire signer', 'feBtnPetit btn-primary fsSigner', () => feFaireSigner(x.id, s.id)));
    else if(e.absents.length) out.push(feBouton('✍️ Compléter', 'feBtnPetit', () => feFaireSigner(x.id, s.id)));
  }
  if(e.commence) out.push(feBouton('📄 La feuille', 'feBtnPetit', () => fsVoirFeuille(x.id, s.id)));
  return out;
}

/* ---------- 📄 la feuille, avec ses signatures ---------- */
async function fsImages(fid, sid){
  const r = await appelPrep({ action: 'formationSignaturesLire', id: fid, seance: sid });
  if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Signatures illisibles');
  return r.images || {};
}
function fsDocFeuille(src, s, images){ return Object.assign(FE_DOCS.emargement(src.x.donnees, src.organisme, src.x, s, images), { cle: 'emargement' }); }
async function fsVoirFeuille(fid, sid){
  const src = fsSource(fid);
  if(!src) return;
  const s = (src.x.donnees.seances || []).find(y => y.id === sid);
  if(!s) return;
  feVoir(async () => [fsDocFeuille(src, s, await fsImages(fid, sid))], 'Feuille de présence ' + feDateFr(s.date), src.entetes && src.entetes.sb);
}
/* Une fois la dernière signature posée, la feuille part dans le dossier */
async function fsRangerFeuille(fid, sid){
  try{
    const src = fsSource(fid);
    const s = src && (src.x.donnees.seances || []).find(y => y.id === sid);
    if(!s || !feSeanceSignee(src.x.donnees, s)) return;
    const doc = await feFabriquerPdf([fsDocFeuille(src, s, await fsImages(fid, sid))], src.entetes && src.entetes.sb);
    const b64 = doc.output('datauristring').split(',')[1];
    const r = await appelPrep({ action: 'formationFeuillePoser', id: fid, seance: sid, contenu: b64 });
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Feuille non rangée');
    feToast('📄 La feuille signée est dans le dossier');
    if(typeof FE !== 'undefined' && FE.journal) delete FE.journal[fid];
  }catch(e){ feToast('⚠️ Feuille signée : ' + ((e && e.message) || e)); }
}

/* ============================================================
   LE CADRE OÙ L'ON SIGNE DU DOIGT
   ============================================================ */
function feSignaturePad(){
  const w = feEl('div', 'feSigCadre');
  const cv = document.createElement('canvas');
  w.appendChild(cv);
  w.appendChild(feEl('span', 'feSigAide', 'signe avec le doigt'));
  const st = { traits: 0, actif: false, der: null, bb: null };
  let g = null;
  const taille = () => {
    const r = cv.getBoundingClientRect();
    if(!r.width) return;
    const k = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * k); cv.height = Math.round(r.height * k);
    g = cv.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#111';
  };
  const point = ev => { const r = cv.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  const etendre = p => { if(!st.bb) st.bb = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; else { st.bb.x0 = Math.min(st.bb.x0, p.x); st.bb.y0 = Math.min(st.bb.y0, p.y); st.bb.x1 = Math.max(st.bb.x1, p.x); st.bb.y1 = Math.max(st.bb.y1, p.y); } };
  cv.addEventListener('pointerdown', ev => {
    if(!g) taille();
    ev.preventDefault();
    try{ cv.setPointerCapture(ev.pointerId); }catch(e){}
    st.actif = true; st.der = point(ev); etendre(st.der);
    g.beginPath(); g.arc(st.der.x, st.der.y, 1.2, 0, Math.PI * 2); g.fillStyle = '#111'; g.fill();
    st.traits++;
    w.classList.add('signe');
  });
  cv.addEventListener('pointermove', ev => {
    if(!st.actif) return;
    ev.preventDefault();
    const p = point(ev);
    g.beginPath(); g.moveTo(st.der.x, st.der.y); g.lineTo(p.x, p.y); g.stroke();
    st.der = p; etendre(p);
  });
  const fin = () => { st.actif = false; };
  cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin); cv.addEventListener('pointerleave', fin);
  requestAnimationFrame(taille);
  return {
    el: w,
    vide: () => st.traits === 0,
    effacer: () => { taille(); st.traits = 0; st.bb = null; w.classList.remove('signe'); },
    /* l'image : rognée autour du trait, fond transparent, 600 px au plus */
    image: () => {
      if(!st.bb) return '';
      const k = window.devicePixelRatio || 1, m = 6;
      const x0 = Math.max(0, (st.bb.x0 - m) * k), y0 = Math.max(0, (st.bb.y0 - m) * k);
      const x1 = Math.min(cv.width, (st.bb.x1 + m) * k), y1 = Math.min(cv.height, (st.bb.y1 + m) * k);
      const lw = Math.max(1, x1 - x0), lh = Math.max(1, y1 - y0);
      const r = Math.min(1, 600 / lw);
      const c2 = document.createElement('canvas');
      c2.width = Math.max(1, Math.round(lw * r)); c2.height = Math.max(1, Math.round(lh * r));
      c2.getContext('2d').drawImage(cv, x0, y0, lw, lh, 0, 0, c2.width, c2.height);
      return c2.toDataURL('image/png');
    }
  };
}

/* ============================================================
   ✍️ L'ÉCRAN DE SIGNATURE (plein écran, sur le téléphone)
   ============================================================ */
async function feFaireSigner(fid, sid, demi){
  const src = fsSource(fid);
  if(!src){ feToast('⚠️ Dossier introuvable'); return; }
  const s = (src.x.donnees.seances || []).find(y => y.id === sid);
  if(!s){ feToast('⚠️ Séance introuvable'); return; }
  if(FS.ecran) FS.ecran.remove();
  const fond = feEl('div', 'feSignEcran');
  fond.setAttribute('role', 'dialog');
  fond.setAttribute('aria-label', 'Feuille de présence');
  document.body.appendChild(fond);
  FS.ecran = fond;
  document.body.classList.add('feSignOuvert');
  const ctx = { fid: fid, sid: sid, demi: demi || '', qui: '', pad: null, refaire: false };
  const demis = feDemis(s);
  if(demis.indexOf(ctx.demi) === -1){
    const e = fsEtat(src.x.donnees, s);
    ctx.demi = demis.find(dm => !e.sig.some(z => z.qui === '_formateur' && z.demi === dm)) || demis[0];
    if(demis.length > 1 && !ctx.demi) ctx.demi = new Date().getHours() < 13 ? 'matin' : 'apres';
  }
  fsDessinerEcran(ctx);
}
function fsFermerEcran(){
  if(FS.ecran) FS.ecran.remove();
  FS.ecran = null;
  document.body.classList.remove('feSignOuvert');
  fsRedessiner();
}
function fsDessinerEcran(ctx){
  const fond = FS.ecran;
  if(!fond) return;
  const src = fsSource(ctx.fid);
  const x = src.x, d = x.donnees, s = (d.seances || []).find(y => y.id === ctx.sid);
  const e = fsEtat(d, s);
  fond.innerHTML = '';
  const boite = feEl('div', 'feSignBoite');
  fond.appendChild(boite);
  const tete = feEl('div', 'feSignTete');
  tete.appendChild(feEl('h3', '', '✍️ Feuille de présence'));
  tete.appendChild(feBouton('✕', 'feBtnX', () => fsFermerEcran(), 'Fermer'));
  boite.appendChild(tete);
  const f = d.formation || {};
  boite.appendChild(feEl('div', 'feSignTitre', f.intitule || 'Formation'));
  boite.appendChild(feEl('div', 'feSignSous', ((d.entreprise && d.entreprise.nom) || '') + ' · ' + feDateLongue(s.date, true)));
  boite.appendChild(feEl('div', 'feSignSous', '🕘 ' + fsMoment(s) + ' · ' + feHeure(s.debut) + ' – ' + feHeure(s.fin) + ' · formateur : ' + ((s.formateur || f.formateur) || '?')));
  if(e.demis.length > 1){
    const o = feEl('div', 'feOnglets');
    e.demis.forEach(dm => o.appendChild(fePuce((dm === 'matin' ? '☀️ Matin' : '🌙 Après-midi') + (e.sig.some(z => z.qui === '_formateur' && z.demi === dm) ? ' ✓' : ''), ctx.demi === dm,
      () => { ctx.demi = dm; ctx.qui = ''; fsDessinerEcran(ctx); })));
    boite.appendChild(o);
  }
  const dm = ctx.demi;
  const sigDe = qui => e.sig.find(z => z.qui === qui && z.demi === dm) || null;
  const reste = e.ins.filter(st => !sigDe(st.id));
  const formE = sigDe('_formateur');
  /* celui qui signe : celui qu'on a touché, sinon le premier qui reste */
  if(ctx.qui && ctx.qui !== '_formateur' && (!e.ins.some(st => st.id === ctx.qui) || (sigDe(ctx.qui) && !sigDe(ctx.qui).absent))) ctx.qui = '';
  if(!ctx.qui && reste.length) ctx.qui = reste[0].id;
  const liste = feEl('div', 'feSignListe');
  e.ins.forEach(st => {
    const z = sigDe(st.id);
    const ici = ctx.qui === st.id;
    const l = feEl('div', 'feSignLigne' + (z && !z.absent ? ' ok' : '') + (z && z.absent ? ' absent' : '') + (ici ? ' ici' : ''));
    l.appendChild(feEl('span', 'feSignIc', z && !z.absent ? '✅' : (z && z.absent ? '🚫' : (ici ? '👉' : ''))));
    const n = feEl('div', 'feSignNom');
    n.appendChild(feEl('b', '', st.nom || '?'));
    if(z && !z.absent) n.appendChild(feEl('span', '', 'signé à ' + feHeureDe(z.a)));
    else if(z && z.absent) n.appendChild(feEl('span', '', 'absent — touche pour le faire signer s’il arrive'));
    l.appendChild(n);
    if(ici) l.appendChild(feEl('span', 'feSignALui', 'à lui'));
    else if(!z && !formE){
      l.appendChild(feBouton('🚫 Absent', 'feBtnPetit fsAbsent', async (ev, b) => {
        b.disabled = true;
        await fsEnvoyer(ctx, { qui: st.id, absent: true });
      }));
    }
    if(!(z && !z.absent)){
      l.classList.add('touchable');
      l.addEventListener('click', ev => { if(ev.target.closest('button')) return; ctx.qui = st.id; fsDessinerEcran(ctx); });
    }
    liste.appendChild(l);
  });
  boite.appendChild(liste);

  const enCours = ctx.qui && ctx.qui !== '_formateur' ? e.ins.find(st => st.id === ctx.qui) : null;
  if(enCours){
    boite.appendChild(feEl('div', 'feSignQui', 'Signature de ' + enCours.nom));
    const pad = feSignaturePad();
    boite.appendChild(pad.el);
    const r = feEl('div', 'feSignBtns');
    r.appendChild(feBouton('↺ Effacer', '', () => pad.effacer()));
    r.appendChild(feBouton('✅ Valider sa signature', 'btn-primary', async (ev, b) => {
      if(pad.vide()){ feToast('⚠️ Il faut signer dans le cadre.'); return; }
      b.disabled = true;
      await fsEnvoyer(ctx, { qui: enCours.id, image: pad.image() });
    }));
    boite.appendChild(r);
    boite.appendChild(feAide('Chaque signature est enregistrée avec l’heure exacte et le nom du moniteur connecté ; on ne peut plus la modifier ensuite. Quand tout le monde a signé, <b>toi, le formateur, tu signes en dernier</b> (ta signature est gardée, un appui suffit).'));
    return;
  }
  /* tout le monde a signé (ou est absent) : le formateur */
  if(!formE){
    const formateur = s.formateur || f.formateur || '';
    const moi = fsEstFormateur(d, s) || (!formateur && src.gere);
    const c = feEl('div', 'feSignFormateur');
    c.appendChild(feEl('div', 'feSignQui', '👤 ' + (formateur || fsMoi()) + ' — le formateur signe en dernier'));
    if(!moi){
      c.appendChild(feAide('C’est <b>' + feEsc(formateur) + '</b> qui signe en dernier, depuis son téléphone (💼 Formations ou la carte de son cours).'));
      boite.appendChild(c);
      return;
    }
    boite.appendChild(c);
    const avecPad = (texte) => {
      const pad = feSignaturePad();
      c.appendChild(pad.el);
      const r = feEl('div', 'feSignBtns');
      r.appendChild(feBouton('↺ Effacer', '', () => pad.effacer()));
      r.appendChild(feBouton(texte, 'btn-primary', async (ev, b) => {
        if(pad.vide()){ feToast('⚠️ Il faut signer dans le cadre.'); return; }
        b.disabled = true;
        const img = pad.image();
        FS.maSig = img;
        await fsEnvoyer(ctx, { qui: '_formateur', image: img });
      }));
      c.appendChild(r);
      c.appendChild(feAide('Ta signature est gardée pour les prochaines feuilles : un appui suffira.'));
    };
    if(FS.maSig === undefined){
      c.appendChild(feEl('div', 'feAideIn', 'Lecture de ta signature…'));
      appelPrep({ action: 'formationMaSignature' }).then(r => { FS.maSig = (r && r.status === 'ok' && r.image) || ''; fsDessinerEcran(ctx); })
        .catch(() => { FS.maSig = ''; fsDessinerEcran(ctx); });
      return;
    }
    if(FS.maSig && !ctx.refaire){
      const im = document.createElement('img'); im.src = FS.maSig; im.alt = 'Ta signature'; im.className = 'feSignMaSig';
      c.appendChild(im);
      const r = feEl('div', 'feSignBtns');
      r.appendChild(feBouton('↺ Refaire ma signature', '', () => { ctx.refaire = true; fsDessinerEcran(ctx); }));
      r.appendChild(feBouton('✅ Je signe la feuille', 'btn-primary', async (ev, b) => { b.disabled = true; await fsEnvoyer(ctx, { qui: '_formateur' }); }));
      c.appendChild(r);
    } else avecPad('✅ Valider ma signature');
    return;
  }
  /* c'est signé */
  const fin = feEl('div', 'feSignFini');
  fin.appendChild(feEl('div', 'feSignFiniT', '✅ C’est signé' + (e.demis.length > 1 ? ' (' + fsDemiLib(dm) + ')' : '')));
  fin.appendChild(feEl('div', 'feSignSous', '👤 ' + formE.nom + ' (formateur) a signé à ' + feHeureDe(formE.a) + (e.complete ? ' · 📄 la feuille part dans le dossier' : '')));
  const r = feEl('div', 'feSignBtns');
  const autre = e.demis.find(z => !e.sig.some(y => y.qui === '_formateur' && y.demi === z));
  if(autre) r.appendChild(feBouton(autre === 'matin' ? '☀️ Le matin' : '🌙 L’après-midi', '', () => { ctx.demi = autre; ctx.qui = ''; fsDessinerEcran(ctx); }));
  r.appendChild(feBouton('📄 La feuille', '', () => fsVoirFeuille(ctx.fid, ctx.sid)));
  r.appendChild(feBouton('Fermer', 'btn-primary', () => fsFermerEcran()));
  fin.appendChild(r);
  boite.appendChild(fin);
}
async function fsEnvoyer(ctx, corps){
  try{
    const r = await appelPrep(Object.assign({ action: 'formationSigner', id: ctx.fid, seance: ctx.sid, demi: ctx.demi }, corps));
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'Signature non enregistrée');
    const avant = fsSource(ctx.fid);
    const sa = avant && (avant.x.donnees.seances || []).find(y => y.id === ctx.sid);
    const etaitComplete = !!sa && feSeanceSignee(avant.x.donnees, sa);
    fsMajFormation(r.formation);
    ctx.qui = ''; ctx.refaire = false;
    const src = fsSource(ctx.fid);
    const s = src && (src.x.donnees.seances || []).find(y => y.id === ctx.sid);
    /* la feuille part dans le dossier quand elle devient complète, et
       repart si un absent signe après coup (✍️ Compléter) */
    if(s && feSeanceSignee(src.x.donnees, s) && (!etaitComplete || !corps.absent)) fsRangerFeuille(ctx.fid, ctx.sid);
    fsDessinerEcran(ctx);
  }catch(e){
    feToast('⚠️ ' + ((e && e.message) || e));
    fsDessinerEcran(ctx);
  }
}

/* ============================================================
   ＋ UNE SÉANCE (le moniteur) · ✍️ SÉANCE NON PRÉVUE
   ============================================================ */
function feFenetreSeance(fid, s, o){
  o = o || {};
  const src = fsSource(fid);
  if(!src) return;
  const d = src.x.donnees;
  const maintenant = new Date();
  const q = Math.floor(maintenant.getMinutes() / 15) * 15;
  const deb = o.debut || String(maintenant.getHours()).padStart(2, '0') + ':' + String(q).padStart(2, '0');
  const plus2 = h => { const m = feMinutes(h) + 120; return String(Math.min(23, Math.floor(m / 60))).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const v = s ? { date: s.date, debut: s.debut, fin: s.fin, contenu: s.contenu || '', stagiaires: (s.stagiaires || []).slice() }
              : { date: o.date || feAujourdhui(), debut: deb, fin: o.fin || plus2(deb), contenu: '', stagiaires: (o.stagiaires || []).slice() };
  const fen = feFenetre(s ? '✏️ La séance' : (o.nonPrevue ? '✍️ Séance non prévue' : '＋ Une séance'));
  const b = fen.boite;
  if(o.nonPrevue) b.appendChild(feAide('Une séance qui n’était pas posée : elle s’ajoute au dossier, et tu fais signer tout de suite.'));
  const g = feGrille(120);
  [['Date', 'date', 'date', 'feSeaDate'], ['Début', 'debut', 'time', 'feSeaDebut'], ['Fin', 'fin', 'time', 'feSeaFin']].forEach(([l, k, t, id]) => g.appendChild(feChampLibre(l, v, k, { type: t, id: id })));
  b.appendChild(g);
  b.appendChild(feChampLibre('Contenu', v, 'contenu', { id: 'feSeaContenu' }));
  b.appendChild(feEl('label', 'feLab', 'Stagiaires (tous si aucun n’est choisi)'));
  const zq = feEl('div', 'feOnglets');
  (d.stagiaires || []).forEach(st => zq.appendChild(fePuce(st.nom || '?', v.stagiaires.indexOf(st.id) !== -1, p => {
    const i = v.stagiaires.indexOf(st.id);
    if(i === -1) v.stagiaires.push(st.id); else v.stagiaires.splice(i, 1);
    p.classList.toggle('on', i === -1);
  })));
  b.appendChild(zq);
  const r = feEl('div', 'btn-row');
  const go = feBouton(o.nonPrevue ? '✍️ Faire signer maintenant' : '✓ Enregistrer', 'btn-primary', async () => {
    go.disabled = true;
    try{
      const rr = await appelPrep({ action: 'formationSeancePoser', id: fid, seance: Object.assign({ id: s ? s.id : '', nonPrevue: !!o.nonPrevue }, v) });
      if(!rr || rr.status !== 'ok') throw new Error((rr && rr.message) || 'Séance non enregistrée');
      fsMajFormation(rr.formation);
      fen.fermer();
      if(o.nonPrevue) feFaireSigner(fid, rr.seance);
      else fsRedessiner();
    }catch(e){ feToast('⚠️ ' + ((e && e.message) || e)); go.disabled = false; }
  });
  r.append(feBouton('Annuler', '', fen.fermer), go);
  b.appendChild(r);
}

/* ============================================================
   💼 L'ÉCRAN DU MONITEUR : ses formations, leurs séances
   ============================================================ */
function feDessinerMoniteur(z){
  const L = FE.d.formations || [];
  const x = FE.vue === 'dossier' ? L.find(y => y.id === FE.id) : null;
  if(!x){
    FE.vue = 'liste';
    z.appendChild(feAide('👤 Les formations entreprise dont tu es le formateur : tu vois leurs séances et leurs stagiaires, et tu fais signer la feuille de présence.'));
    if(!L.length){ z.appendChild(feEl('div', 'empty', 'Aucune formation dont tu es le formateur pour l’instant.')); return; }
    const auj = feAujourdhui();
    L.forEach(y => {
      const d = y.donnees, f = d.formation || {};
      const c = feEl('div', 'feCarte');
      c.tabIndex = 0;
      const ouvrir = () => { FE.vue = 'dossier'; FE.id = y.id; FE.onglet = 'sea'; feDessiner(); };
      c.addEventListener('click', ouvrir);
      c.addEventListener('keydown', ev => { if(ev.key === 'Enter') ouvrir(); });
      const tt = feEl('div', 'feCarteTete');
      tt.appendChild(feEl('b', 'feCarteNom', (d.entreprise && d.entreprise.nom) || 'Entreprise ?'));
      const m = (FE.d.modeles || []).find(k => k.id === d.modele);
      tt.appendChild(feEl('span', 'feCarteQuoi', (m ? m.emoji + ' ' : '') + (f.intitule || 'Formation') + ' · ' + (d.stagiaires || []).length + ' salarié' + ((d.stagiaires || []).length > 1 ? 's' : '')));
      c.appendChild(tt);
      const aSigner = (d.seances || []).filter(s => s.date && s.date <= auj && !feSeanceSignee(d, s)).length;
      const proch = feTrier(d.seances).find(s => s.date >= auj);
      c.appendChild(feEl('div', 'feCarteSuite' + (aSigner ? ' alerte' : ''), aSigner ? '✍️ ' + aSigner + ' feuille' + (aSigner > 1 ? 's' : '') + ' à faire signer'
        : (proch ? '📅 prochaine séance : ' + fsJourCourt(proch.date) + ' · ' + feHeure(proch.debut) : '✅ rien à faire signer')));
      c.appendChild(feEl('div', 'feCartePied', '📅 ' + feDates(f) + ' · ' + y.numero));
      z.appendChild(c);
    });
    return;
  }
  const d = x.donnees, f = d.formation || {};
  const t = feEl('div', 'feDossierTete');
  t.appendChild(feBouton('‹ Retour', 'feBtnPetit', () => { FE.vue = 'liste'; FE.id = ''; feDessiner(); }));
  t.appendChild(feEl('b', 'feDossierNom', (d.entreprise && d.entreprise.nom) || 'Entreprise ?'));
  const m = (FE.d.modeles || []).find(k => k.id === d.modele);
  t.appendChild(feEl('span', 'feDossierQuoi', (m ? m.emoji + ' ' : '') + (f.intitule || '') + ' · ' + (d.stagiaires || []).length + ' salarié' + ((d.stagiaires || []).length > 1 ? 's' : '')));
  t.appendChild(feEl('span', 'feDossierNum', x.numero));
  z.appendChild(t);
  const o = feEl('div', 'feOnglets feOngletsDossier');
  if(FE.onglet !== 'sta') FE.onglet = 'sea';
  [['sea', '📅 Séances · ' + (d.seances || []).length], ['sta', '👥 Stagiaires · ' + (d.stagiaires || []).length]]
    .forEach(([k, nom]) => o.appendChild(fePuce(nom, FE.onglet === k, () => { FE.onglet = k; feDessiner(); })));
  z.appendChild(o);
  const corps = feEl('div', 'feCorps');
  z.appendChild(corps);
  if(FE.onglet === 'sta'){
    (d.stagiaires || []).forEach(st => {
      const l = feEl('div', 'feBoite feStagM');
      l.appendChild(feEl('b', '', st.nom || '?'));
      if(st.fonction) l.appendChild(feEl('span', 'feAideIn', st.fonction));
      l.appendChild(feEl('span', 'feAideIn', '⏱️ ' + feNb(feHeuresFaites(d, st)) + ' h' + (f.duree ? ' / ' + feNb(f.duree) + ' h' : '')));
      corps.appendChild(l);
    });
    if(!(d.stagiaires || []).length) corps.appendChild(feEl('div', 'empty', 'Aucun salarié dans ce dossier.'));
    return;
  }
  corps.appendChild(feAide('👤 Tu es le formateur de cette formation : tu vois ses séances et ses stagiaires, et tu fais signer. Chaque séance a sa feuille de présence : tu la fais signer sur ton téléphone, <b>ici dans le dossier</b> (pour les formations qui ne sont pas dans « Mes prochains cours »), ou depuis la carte de ton cours.'));
  const r0 = feEl('div', 'feBarre');
  r0.appendChild(feBouton('＋ Ajouter une séance', '', () => feFenetreSeance(x.id, null, { date: feAujourdhui() })));
  corps.appendChild(r0);
  corps.appendChild(feBouton('✍️ Séance non prévue : faire signer maintenant', 'feNonPrevue', () => feFenetreSeance(x.id, null, { nonPrevue: true })));
  const auj = feAujourdhui();
  feTrier(d.seances).forEach(s => {
    const e = fsEtat(d, s);
    const ajd = s.date === auj;
    const c = feEl('div', 'feBoite feSeanceM' + (ajd && !e.complete ? ' ajd' : '') + (e.complete && e.absents.length ? ' manque' : ''));
    c.appendChild(feEl('b', 'feSeaJour', fsJourCourt(s.date)));
    c.appendChild(feEl('div', 'feAideIn', feHeure(s.debut) + ' – ' + feHeure(s.fin) + ' · ' + fsMoment(s)));
    c.appendChild(feEl('b', 'feSeaQuoi', s.contenu || 'Séance'));
    const noms = e.ins.length === (d.stagiaires || []).length && e.ins.length > 2 ? 'les ' + e.ins.length : e.ins.map(st => st.nom).join(', ');
    c.appendChild(feEl('div', 'feAideIn', noms + ' · 👤 ' + ((s.formateur || f.formateur) || '?')));
    c.appendChild(feLigneSignatures(x, s));
    const p = feEl('div', 'feStagPied');
    feBoutonsSignature(x, s).forEach(bb => p.appendChild(bb));
    if(!e.commence && s.date >= auj && fsEstFormateur(d, s)) p.appendChild(feBouton('✏️', 'feBtnPetit', () => feFenetreSeance(x.id, s), 'Modifier la séance'));
    if(p.children.length) c.appendChild(p);
    corps.appendChild(c);
  });
  if(!(d.seances || []).length) corps.appendChild(feEl('div', 'empty', 'Aucune séance posée.'));
}

/* ============================================================
   💼 SUR LA CARTE DU COURS (« Mes prochains cours »)
   ============================================================ */
async function feChargerMiennes(force){
  if(!force && FS.miennes && Date.now() - FS.chargeLe < 60000) return FS.miennes;
  if(FS.enCours) return FS.enCours;
  FS.enCours = (async () => {
    try{
      const r = await appelPrep({ action: 'formationsMiennes' });
      if(r && r.status === 'ok'){ FS.miennes = r; FS.chargeLe = Date.now(); }
    }catch(e){ /* pas de droit, pas de réseau : pas de bloc */ }
    FS.enCours = null;
    return FS.miennes;
  })();
  return FS.enCours;
}
function blocFormationFE(cours){
  if(!cours || cours.date !== feAujourdhui() || !cours.eleve) return null;
  if(typeof aDroit === 'function' && !aDroit('cours') && !aDroit('formations')) return null;
  const heure = typeof heureDeLaPreparation === 'function' ? heureDeLaPreparation(cours) : '';
  if(!heure) return null;
  const bloc = feEl('div', 'feCoursBloc');
  const ligne = feEl('div', 'feCoursLigne');
  [bloc, ligne].forEach(el => { el.style.display = 'none'; el.dataset.eleve = cours.eleve; el.dataset.date = cours.date; el.dataset.heure = heure; });
  setTimeout(() => {
    if(FS.miennes) { fsRemplirBloc(bloc); fsRemplirLigne(ligne); }
    feChargerMiennes().then(() => { fsRemplirBloc(bloc); fsRemplirLigne(ligne); });
  }, 0);
  return { bloc, ligne };
}
function fsRemplirLesCartes(){
  document.querySelectorAll('.feCoursBloc').forEach(fsRemplirBloc);
  document.querySelectorAll('.feCoursLigne').forEach(fsRemplirLigne);
}
/* La formation et la séance de ce cours, s'il y en a une */
function fsPourLeCours(eleve, date, heure){
  const m = FS.miennes;
  if(!m) return null;
  const n = feNorm(eleve);
  for(const x of (m.formations || [])){
    const d = x.donnees, st = (d.stagiaires || []).find(z => feNorm(z.nom) === n);
    if(!st) continue;
    const s = (d.seances || []).find(y => y.date === date && y.debut <= heure && heure < y.fin && feInscrits(d, y).indexOf(st) !== -1);
    const f = d.formation || {};
    if(s) return { x: x, s: s, st: st };
    if((!f.dateDebut || f.dateDebut <= date) && (!f.dateFin || date <= f.dateFin)) return { x: x, s: null, st: st };
  }
  return null;
}
function fsRemplirLigne(l){
  const t = fsPourLeCours(l.dataset.eleve, l.dataset.date, l.dataset.heure);
  if(!t){ l.style.display = 'none'; return; }
  l.style.display = '';
  const e = t.s ? fsEtat(t.x.donnees, t.s) : null;
  l.textContent = '💼 ' + (e && e.complete ? 'feuille de présence signée' : 'feuille de présence à faire signer');
  l.style.color = e && e.complete ? 'var(--accent-text)' : 'var(--warn-text)';
}
function fsRemplirBloc(b){
  const t = fsPourLeCours(b.dataset.eleve, b.dataset.date, b.dataset.heure);
  if(!t){ b.style.display = 'none'; return; }
  b.style.display = '';
  b.innerHTML = '';
  const x = t.x, d = x.donnees, f = d.formation || {}, s = t.s;
  b.appendChild(feEl('div', 'feCoursT', '💼 FORMATION ENTREPRISE'));
  const toutes = feTrier(d.seances);
  const m = FS.miennes && (FS.miennes.modeles || []).find(k => k.id === d.modele);
  b.appendChild(feEl('div', 'feCoursS', ((d.entreprise && d.entreprise.nom) || '') + ' · ' + ((m && m.nom) || f.intitule || 'formation') + (s ? ' · séance ' + (toutes.indexOf(s) + 1) + ' / ' + toutes.length : '')));
  if(!s){
    b.appendChild(feEl('div', 'feCoursM', '✍️ Pas de feuille de présence posée à ' + feHeure(b.dataset.heure) + ' pour ' + t.st.nom + '.'));
    b.appendChild(feBouton('✍️ Faire signer', 'btn-primary fsSigner', () => feFenetreSeance(x.id, null, { nonPrevue: true, date: b.dataset.date, debut: b.dataset.heure, stagiaires: [t.st.id] })));
    return;
  }
  const e = fsEtat(d, s);
  const dm = e.demis.length > 1 ? (new Date().getHours() < 13 ? 'matin' : 'apres') : '';
  if(e.complete){
    b.appendChild(feEl('div', 'feCoursM ok', '✅ Feuille de présence signée.'));
  } else {
    b.appendChild(feEl('div', 'feCoursM', '✍️ Feuille de présence de ' + feHeure(s.debut).replace('h00', 'h') + ' à ' + feHeure(s.fin).replace('h00', 'h') + ' : ' + (e.commence ? 'en cours de signature.' : 'à faire signer en début de séance.')));
  }
  e.ins.forEach(st => {
    const z = e.sig.filter(y => y.qui === st.id);
    const signe = z.find(y => !y.absent && (!dm || y.demi === dm)) || z.find(y => !y.absent);
    const abs = !signe && z.find(y => y.absent);
    const l = feEl('div', 'feCoursSt' + (signe ? ' ok' : '') + (abs ? ' absent' : ''));
    l.appendChild(feEl('span', 'feCoursCase', signe ? '✅' : (abs ? '🚫' : '')));
    const n = feEl('div', '');
    n.appendChild(feEl('b', '', st.nom));
    if(signe) n.appendChild(feEl('span', '', '✍️ signé à ' + feHeureDe(signe.a)));
    if(abs) n.appendChild(feEl('span', '', 'absent'));
    l.appendChild(n);
    b.appendChild(l);
  });
  if(e.complete){
    const fo = e.formateur[e.formateur.length - 1];
    b.appendChild(feEl('div', 'feCoursPied', '👤 ' + fo.nom + ' (formateur) a signé à ' + feHeureDe(fo.a) + ' · 📄 la feuille part dans le dossier'));
  } else if(fsPeutFaireSigner(fsSource(x.id), d, s)){
    b.appendChild(feBouton(e.commence ? '✍️ Continuer' : '✍️ Faire signer', 'btn-primary fsSigner', () => feFaireSigner(x.id, s.id)));
  } else {
    b.appendChild(feEl('div', 'feCoursPied', 'C’est ' + ((s.formateur || f.formateur) || 'le formateur') + ' qui fait signer.'));
  }
}

/* Au démarrage : un moniteur (sans la case 💼) formateur d'au moins une
   formation voit l'onglet Outils, pour 💼 Formations */
function fsAuDemarrage(){
  if(typeof aDroit !== 'function' || aDroit('formations') || !aDroit('cours')) return;
  feChargerMiennes(true).then(m => {
    const oui = !!(m && (m.formations || []).length);
    if(oui !== !!window.FE_FORMATEUR){ window.FE_FORMATEUR = oui; if(typeof majOngletsVisibles === 'function') majOngletsVisibles(); }
  });
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-formations-signer.js'] = true;
