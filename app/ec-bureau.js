/* ============================================================
   ec-bureau.js
   Suivi bureau : listes, places d'examen, repassages
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   LISTES BUREAU
   Lecture de l'état de tous les élèves, et consignes du bureau
   qui remontent au moniteur lors de la prochaine leçon.
   ============================================================ */
/* etatBureau : déclaré dans ec-etat.js */

/* Décode les phrases produites par le questionnaire */
function analyserNote(note){
  /* Les téléphones remplacent l'apostrophe droite par une typographique :
     sans cette normalisation, les repères du bilan ne sont plus reconnus. */
  const t = String(note || '')
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u00A0\u202F\u2007]/g, ' ');
  const r = { repassages:null, dateAjournement:null,
              ebSuite:null, ebDate:null, ebLecons:null,
              examBlanc:null, examBlancN:null, examBlancDate:null,
              simuNuit:null, simuDate:null, permis:null,
              permisDate:null, permisN:null, lecon:null, leconTotal:null,
              friseDepassee:false, finirFiche:false };
  let m;

  if((m = t.match(/Examen blanc passé le ([^—·]+)— pas le niveau/i))){
    r.examBlanc = 'passe';
    r.ebSuite = 'pasleniveau';
    r.ebDate = m[1].trim();
  }
  else if((m = t.match(/Examen blanc passé le ([^—·]+)— plus que les 3h/i))){
    r.examBlanc = 'passe';
    r.ebSuite = '3h';
    r.ebDate = m[1].trim();
  }
  else if((m = t.match(/Examen blanc passé le ([^—·]+)— encore (\d+) leçon/i))){
    r.examBlanc = 'passe';
    r.ebSuite = 'lecons';
    r.ebDate = m[1].trim();
    r.ebLecons = +m[2];
  }
  else if(/Ne pas prévoir d'examen blanc/i.test(t)) r.examBlanc = 'impossible';
  else if(/Examen blanc passé/i.test(t)) r.examBlanc = 'passe';
  else if((m = t.match(/Examen blanc fixé au ([^—·(]+)/i))){
    r.examBlanc = 'reserve';
    r.examBlancDate = m[1].trim();
  }
  else if((m = t.match(/Examen blanc réservé dans (\d+)/i))){ r.examBlanc='reserve'; r.examBlancN=+m[1]; }
  else if(/La prochaine leçon, c'est l'examen blanc/i.test(t)){ r.examBlanc='reserve'; r.examBlancN=0; }
  else if(/Examen blanc réservé/i.test(t)) r.examBlanc = 'reserve';
  else if((m = t.match(/Examen blanc à prévoir dans (\d+)/i))){ r.examBlanc='aprevoir'; r.examBlancN=+m[1]; }
  else if(/Examen blanc à prévoir dès la prochaine/i.test(t)){ r.examBlanc='aprevoir'; r.examBlancN=0; }
  else if(/Examen blanc à prévoir/i.test(t)) r.examBlanc = 'aprevoir';

  if((m = t.match(/Simulateur nuit et risques fixé au ([^—·(]+)/i))){
    r.simuNuit = 'prevu';
    r.simuDate = m[1].trim();
  }
  else if(/Simulateur nuit et risques fait/i.test(t)) r.simuNuit = 'fait';
  else if(/Simulateur nuit et risques déjà prévu/i.test(t)) r.simuNuit = 'prevu';
  else if(/Simulateur nuit et risques à prévoir/i.test(t)) r.simuNuit = 'aprevoir';

  /* Examen blanc réussi : la date de permis est à prendre */
  if(r.ebSuite === '3h' && !/Examen (du permis )?(prévu|fixé)/i.test(t)) r.permis = 'aprevoir';

  /* L'annulation prime sur toute date déjà annoncée */
  if(/annulé/i.test(t) && /permis|examen/i.test(t)) r.permis = 'annule';
  else if((m = t.match(/Examen du permis fixé au ([^—·(]+)/i))){
    r.permis = 'prevu';
    r.permisDate = m[1].trim();
  }
  else if(/(date d'examen|examen(?: du permis)?)\s*(?:est\s*)?à pr[ée]voir/i.test(t)) r.permis = 'aprevoir';
  else if((m = t.match(/Examen prévu le ([^—·]+)/i))){ r.permis='prevu'; r.permisDate=m[1].trim(); }
  if(r.permis === 'annule') r.permisDate = null;
  if((m = t.match(/Examen prévu le [^—·]+— encore (\d+) leçon/i))) r.permisN = +m[1];

  if((m = t.match(/(\d+)(?:ère|ème) leçon sur (\d+)/i))){ r.lecon=+m[1]; r.leconTotal=+m[2]; }
  else if((m = t.match(/(\d+)(?:ère|ème) leçon/i))) r.lecon = +m[1];
  if(/frise dépassée/i.test(t)) r.friseDepassee = true;
  if((m = t.match(/(\d+)(?:er|e) repassage/i))) r.repassages = +m[1];
  if((m = t.match(/[Aa]journé le ([^—·(]+)/))) r.dateAjournement = m[1].trim();
  if(/Finir Fiche/i.test(t)) r.finirFiche = true;
  return r;
}

const URGENCES = [
  { v:'', l:'— normal —', c:'var(--muted)' },
  { v:'1', l:'🟢 Peut attendre', c:'var(--muted)' },
  { v:'2', l:'🟡 À planifier', c:'var(--accent-text)' },
  { v:'3', l:'🟠 Assez pressé', c:'#E8A33D' },
  { v:'4', l:'🔴 Urgent', c:'var(--red)' },
  { v:'5', l:'🚨 Prioritaire absolu', c:'var(--red)' }
];

function libelleUrgence(v){
  const u = URGENCES.find(x => x.v === String(v || ''));
  return u || URGENCES[0];
}

async function chargerBureau(forcer){
  let data;
  if(!forcer && cacheBureau && Date.now() - cacheBureau.ts < 30000){
    data = cacheBureau.data;
  }else{
    data = await appelPrep({ action: 'bureauEtat' });
    cacheBureau = { ts: Date.now(), data: data };
  }
  const eleves = (data && data.eleves) || [];
  const consignes = (data && data.consignes) || [];

  etatBureau.consignes = consignes;
  etatBureau.suivi = (data && data.suivi) || [];
  chargerPlaces(data && data.places);
  /* Les périodes terminées sortent d'elles-mêmes */
  if(nettoyerPeriodesEchues()){
    try{ await enregistrerPlaces(); }catch(e){}
  }
  /* Un élève peut n'exister que par une consigne du bureau */
  const connus = eleves.map(x => normaliserMot(x.eleve));
  consignes.forEach(cs => {
    if(cs.traite === 'oui' || cs.type === 'urgence') return;
    const k = normaliserMot(cs.eleve);
    if(!k || connus.indexOf(k) !== -1) return;
    connus.push(k);
    eleves.push({ eleve: cs.eleve, note: '', date: cs.creeLe || '', type: '',
                  horodatage: '', moniteur: '', boite: '', ants: '', lecons: 0 });
  });

  etatBureau.eleves = eleves.map(e => {
    const enAttente = consignes.filter(cs =>
      normaliserMot(cs.eleve) === normaliserMot(e.eleve) &&
      cs.traite !== 'oui' && cs.type !== 'urgence');

    /* Une consigne du bureau non traitée prime sur la note du moniteur */
    const a = analyserNote(e.note);
    if(enAttente.length){
      const ajout = analyserNote(enAttente.map(x => x.texte).join(' · '));
      Object.keys(ajout).forEach(k => {
        if(ajout[k] !== null && ajout[k] !== false) a[k] = ajout[k];
      });
    }
    const urg = consignes.find(cs =>
      normaliserMot(cs.eleve) === normaliserMot(e.eleve) && cs.type === 'urgence');
    return Object.assign({}, e, {
      etat: a,
      enAttente: enAttente,
      urgence: urg ? urg.valeur : ''
    });
  });
  return etatBureau;
}

/* Enregistre une consigne : elle sera injectée dans la note du prochain cours */
async function envoyerConsigne(eleve, type, texte, valeur){
  cacheBureau = null;
  await appelPrep({
    action: 'consigneAdd',
    eleve: eleve, type: type, texte: texte, valeur: valeur || '',
    par: ACCES.moniteur || ''
  });
}




/* Fiche de suivi d'un élève, ou objet vide */
function suiviDe(eleve){
  return etatBureau.suivi.find(x => normaliserMot(x.eleve) === normaliserMot(eleve)) || {};
}

/* Met à jour quelques champs sans écraser le reste */
async function majSuivi(eleve, champs){
  cacheBureau = null;
  const s = suiviDe(eleve);
  await appelPrep(Object.assign({ action:'suiviSet' }, s, champs, {
    eleve: eleve, par: ACCES.moniteur || ''
  }));
}

/* Fiche de préparation administrative d'un passage au permis */
function ficheSuiviPermis(e){
  const s = etatBureau.suivi.find(x => normaliserMot(x.eleve) === normaliserMot(e.eleve)) || {};

  const d = document.createElement('details');
  d.style.cssText = 'margin-top:8px;';
  d.innerHTML = '<summary style="cursor:pointer;color:var(--accent-text);font-weight:600;font-size:14px;">' +
    '📋 Fiche de préparation' + (s.majLe ? ' — mise à jour le ' + s.majLe : '') + '</summary>';

  const f = document.createElement('div');
  f.className = 'fiche-permis';
  f.style.cssText = 'margin-top:12px;padding:12px;background:var(--navy);' +
    'border:1px solid var(--line);border-radius:10px;';

  const id = 'sv' + Math.random().toString(36).slice(2, 8);
  f.innerHTML =
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;' +
      'color:var(--accent-text);font-weight:700;margin-bottom:14px;">' +
      '<input type="checkbox" id="' + id + 'ok" style="width:19px;height:19px;">' +
      '✅ Tout est OK — dossier prêt</label>' +

    '<label for="' + id + 'typ">Type d\'examen</label>' +
    '<select id="' + id + 'typ">' +
      '<option value="bv">🅑 BV — boîte manuelle</option>' +
      '<option value="bea">🅰 BEA — boîte automatique</option>' +
      '<option value="handicap">♿ Handicap</option>' +
    '</select>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;color:var(--cream);margin-bottom:10px;">' +
      '<input type="checkbox" id="' + id + 'fan" style="width:19px;height:19px;">' +
      '👻 Place fantôme — nom posé, repreneur encore inconnu</label>' +
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;color:var(--cream);margin-bottom:10px;">' +
      '<input type="checkbox" id="' + id + 'rem" style="width:19px;height:19px;">' +
      'Place à remplacer — à donner à un autre élève</label>' +
    '<div id="' + id + 'zone" style="display:none;padding:10px;margin-bottom:14px;' +
      'background:var(--navy-deep);border:1px solid var(--orange);border-radius:10px;">' +
      '<label for="' + id + 'nouv">Nouveau candidat</label>' +
      '<input type="text" id="' + id + 'nouv" list="listeEleves" autocomplete="off" ' +
      'placeholder="Nom et prénom du repreneur">' +
      '<button class="btn btn-primary" id="' + id + 'trf" style="font-size:14px;padding:11px;">' +
      '➡️ Transférer la date à ce candidat</button>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.4;">' +
      'La date passe au nouveau candidat et sera transmise à son moniteur au prochain cours.</div>' +
    '</div>' +

    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;color:var(--cream);margin-bottom:10px;">' +
      '<input type="checkbox" id="' + id + 'don" style="width:19px;height:19px;">' +
      'Date à donner à une autre auto-école</label>' +
    '<div id="' + id + 'zae" style="display:none;margin-bottom:14px;">' +
      '<label for="' + id + 'ae">Auto-école destinataire</label>' +
      '<input type="text" id="' + id + 'ae" placeholder="Nom de l\'auto-école">' +
    '</div>' +

    '<label for="' + id + 'pay">Reste à payer</label>' +
    '<input type="text" id="' + id + 'pay" placeholder="Ex : 240 €">' +
    '<label for="' + id + 'qd">Paiement prévu le</label>' +
    '<input type="date" id="' + id + 'qd">' +
    '<label for="' + id + 'rel">Relancé le</label>' +
    '<input type="date" id="' + id + 'rel">' +

    '<label for="' + id + 'nat">À faire par l\'élève</label>' +
    '<select id="' + id + 'nat">' +
      '<option value="">— rien —</option>' +
      '<option value="acheter">À acheter</option>' +
      '<option value="reserver">À réserver</option>' +
      '<option value="both">À acheter et réserver</option>' +
    '</select>' +
    '<label for="' + id + 'l2">Leçons de 2h</label>' +
    '<input type="text" id="' + id + 'l2" inputmode="numeric" placeholder="Ex : 3">' +
    '<label for="' + id + 'l1">Leçons d\'1h</label>' +
    '<input type="text" id="' + id + 'l1" inputmode="numeric" placeholder="Ex : 1">' +
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:15px;color:var(--cream);margin-bottom:14px;">' +
      '<input type="checkbox" id="' + id + 'acc" style="width:19px;height:19px;">Accompagnement à l\'examen</label>' +
    '<label for="' + id + 'aut">Autre à prévoir</label>' +
    '<textarea id="' + id + 'aut" rows="2" style="width:100%;background:var(--navy-deep);' +
      'border:1px solid var(--line);color:var(--cream);padding:10px;border-radius:10px;' +
      'font-size:15px;font-family:inherit;resize:vertical;margin-bottom:14px;"></textarea>' +

    '<div class="pleine-largeur">' +
    '<label for="' + id + 'res">Réservations faites sur le planning</label>' +
    '<textarea id="' + id + 'res" rows="2" placeholder="Ex : 10/09 14h-16h et 11/09 9h-12h" ' +
      'style="width:100%;background:var(--navy-deep);border:1px solid var(--line);color:var(--cream);' +
      'padding:10px;border-radius:10px;font-size:15px;font-family:inherit;resize:vertical;margin-bottom:14px;"></textarea>' +
    '</div>';

  const bEnr = document.createElement('button');
  bEnr.className = 'btn btn-primary pleine-largeur';
  bEnr.textContent = '💾 Enregistrer la fiche';
  f.appendChild(bEnr);
  const etat = document.createElement('div');
  etat.className = 'pleine-largeur';
  etat.style.cssText = 'margin-top:8px;font-size:13px;min-height:16px;';
  f.appendChild(etat);

  d.appendChild(f);

  /* Valeurs déjà enregistrées */
  setTimeout(() => {
    const g = k => document.getElementById(id + k);
    if(g('rem')) g('rem').checked = (s.aRemplacer === 'oui');
    if(g('don')) g('don').checked = (s.dateADonner === 'oui');
    if(g('pay')) g('pay').value = s.resteAPayer || '';
    if(g('qd')) g('qd').value = s.paiementPrevu || '';
    if(g('rel')) g('rel').value = s.relanceLe || '';
    if(g('nat')) g('nat').value = s.nature || '';
    if(g('l2')) g('l2').value = s.lecons2h || '';
    if(g('l1')) g('l1').value = s.lecons1h || '';
    if(g('acc')) g('acc').checked = (s.accompagnement === 'oui');
    if(g('aut')) g('aut').value = s.autre || '';
    if(g('res')) g('res').value = s.reservations || '';
    if(g('typ')) g('typ').value = s.typeExamen ||
      ((e.boite || (/automatique/i.test(e.type || '') ? 'bea' : 'bv')).toLowerCase());
    if(g('ae')) g('ae').value = s.autoEcole || '';
    if(g('fan')) g('fan').checked = (s.fantome === 'oui');
    if(g('ok')) g('ok').checked = (s.toutOk === 'oui');
  }, 0);

  /* Affichages conditionnels */
  setTimeout(() => {
    const cbRem = document.getElementById(id + 'rem');
    const zn = document.getElementById(id + 'zone');
    if(cbRem && zn){
      const maj = () => { zn.style.display = cbRem.checked ? 'block' : 'none'; };
      cbRem.addEventListener('change', maj);
      maj();
    }
    const cbDon = document.getElementById(id + 'don');
    const zae = document.getElementById(id + 'zae');
    if(cbDon && zae){
      const majAE = () => { zae.style.display = cbDon.checked ? 'block' : 'none'; };
      cbDon.addEventListener('change', majAE);
      majAE();
    }

    const bTrf = document.getElementById(id + 'trf');
    if(bTrf) bTrf.addEventListener('click', async () => {
      const nouveau = document.getElementById(id + 'nouv').value.trim();
      if(nouveau.length < 2){ showToast('Saisis le nom du repreneur.'); return; }
      const dateP = (e.etat && e.etat.permisDate) || s.datePermis || '';
      if(!dateP){ showToast('Aucune date de permis à transférer.'); return; }
      if(!await confirmer('Transférer l\'examen du ' + dateP + '\n\nde ' + e.eleve +
                  '\nvers ' + nouveau + ' ?')) return;

      bTrf.disabled = true;
      bTrf.textContent = 'Transfert…';
      try{
        /* Le repreneur hérite de la date */
        await envoyerConsigne(nouveau, 'permis',
          'Examen du permis fixé au ' + dateP + ' (repris de ' + e.eleve + ')');
        await appelPrep({ action:'suiviSet', eleve: nouveau, datePermis: dateP,
                          par: ACCES.moniteur || '' });

        /* L'élève précédent perd la date */
        await envoyerConsigne(e.eleve, 'permis',
          'Examen du ' + dateP + ' redonné à un autre candidat — nouvelle date à prévoir');
        /* L'ancien candidat sort complètement de la liste des permis prévus */
        await appelPrep({ action:'suiviDelete', eleve: e.eleve });

        showToast('Date transférée à ' + nouveau + ' ✅');
        afficherBureau();
      }catch(err){
        showToast('Transfert impossible : ' + err.message);
        bTrf.disabled = false;
        bTrf.textContent = '➡️ Transférer la date à ce candidat';
      }
    });
  }, 0);

  bEnr.addEventListener('click', async () => {
    const g = k => document.getElementById(id + k);
    bEnr.disabled = true;
    bEnr.textContent = 'Enregistrement…';
    try{
      await appelPrep({
        action: 'suiviSet',
        eleve: e.eleve,
        datePermis: (e.etat && e.etat.permisDate) || s.datePermis || '',
        aRemplacer: g('rem').checked ? 'oui' : '',
        dateADonner: g('don').checked ? 'oui' : '',
        resteAPayer: g('pay').value.trim(),
        paiementPrevu: g('qd').value,
        relanceLe: g('rel').value,
        nature: g('nat').value,
        lecons2h: g('l2').value.trim(),
        lecons1h: g('l1').value.trim(),
        accompagnement: g('acc').checked ? 'oui' : '',
        autre: g('aut').value.trim(),
        reservations: g('res').value.trim(),
        typeExamen: g('typ').value,
        autoEcole: g('ae').value.trim(),
        fantome: g('fan').checked ? 'oui' : '',
        toutOk: g('ok').checked ? 'oui' : '',
        statut: s.statut || '',
        aPlanifier: s.aPlanifier || '',
        semaine: s.semaine || '',
        moniteurDate: s.moniteurDate || '',
        par: ACCES.moniteur || ''
      });
      etat.style.color = 'var(--accent-text)';
      etat.textContent = '✅ Fiche enregistrée.';
      await chargerBureau();
    }catch(err){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Erreur : ' + err.message;
    }finally{
      bEnr.disabled = false;
      bEnr.textContent = '💾 Enregistrer la fiche';
    }
  });

  return d;
}

/* Résumé court de la fiche, affiché sous le nom */
function resumeSuivi(eleve){
  const s = etatBureau.suivi.find(x => normaliserMot(x.eleve) === normaliserMot(eleve));
  if(!s) return '';
  const bouts = [];
  if(s.toutOk === 'oui') bouts.push('✅ tout est OK');
  if(s.statut === 'annule') bouts.push('❌ examen annulé');
  if(s.fantome === 'oui') bouts.push('👻 place fantôme');
  if(s.aRemplacer === 'oui') bouts.push('🔄 place à remplacer');
  if(s.dateADonner === 'oui'){
    bouts.push('🏫 date à donner à une autre auto-école' +
               (s.autoEcole ? ' : ' + s.autoEcole : ''));
  }
  if(s.resteAPayer) bouts.push('💰 reste ' + s.resteAPayer);
  if(s.paiementPrevu) bouts.push('paiement ' + s.paiementPrevu);
  if(s.relanceLe) bouts.push('relancé ' + s.relanceLe);
  const nat = { acheter:'à acheter', reserver:'à réserver', both:'à acheter et réserver' }[s.nature];
  if(nat){
    const det = [];
    if(s.lecons2h) det.push(s.lecons2h + '×2h');
    if(s.lecons1h) det.push(s.lecons1h + '×1h');
    if(s.accompagnement === 'oui') det.push('accompagnement');
    if(s.autre) det.push(s.autre);
    bouts.push(nat + (det.length ? ' : ' + det.join(', ') : ''));
  }
  if(s.reservations) bouts.push('📅 ' + s.reservations);
  return bouts.join(' · ');
}


/* ============================================================
   RÉPARTITION DES PLACES D'EXAMEN
   ============================================================ */
/* Une entrée par mois : on planifie en général sur le mois en cours, M+1 et M+2 */
/* placesConfig : déclaré dans ec-etat.js */

function moisVide(iso){
  return { mois: iso || '', total:'', q1:'', q2:'', semaines: [] };
}

function chargerPlaces(brut){
  placesConfig = { mois: [] };
  try{
    const o = brut ? JSON.parse(brut) : null;
    if(!o || typeof o !== 'object') return;

    if(Array.isArray(o.mois)){
      placesConfig.mois = o.mois.map(m => Object.assign(moisVide(), m,
        { semaines: Array.isArray(m.semaines) ? m.semaines : [] }));
    }else if(o.mois || o.total || (o.semaines && o.semaines.length)){
      /* Ancien format à un seul mois */
      placesConfig.mois = [Object.assign(moisVide(), o,
        { semaines: Array.isArray(o.semaines) ? o.semaines : [] })];
    }
  }catch(e){}
  placesConfig.mois.sort((a, b) => String(a.mois).localeCompare(String(b.mois)));
}

/* Retire les semaines terminées et les mois écoulés.
   Renvoie true si quelque chose a été retiré, pour enregistrer ensuite. */
function nettoyerPeriodesEchues(){
  const auj = todayLocal();
  const moisCourant = auj.slice(0, 7);
  let modifie = false;

  placesConfig.mois.forEach(m => {
    const avant = (m.semaines || []).length;
    /* Une semaine disparaît le lendemain de sa date de fin */
    m.semaines = (m.semaines || []).filter(w => !w.au || w.au >= auj);
    if(m.semaines.length !== avant) modifie = true;
  });

  const avantMois = placesConfig.mois.length;
  /* Un mois disparaît quand il est entièrement écoulé */
  placesConfig.mois = placesConfig.mois.filter(m => !m.mois || m.mois >= moisCourant);
  if(placesConfig.mois.length !== avantMois) modifie = true;

  return modifie;
}

/* Toutes les semaines, tous mois confondus */
function toutesSemaines(){
  const out = [];
  placesConfig.mois.forEach(m => (m.semaines || []).forEach(w => out.push(w)));
  return out;
}

async function enregistrerPlaces(){
  await appelPrep({ action:'configSet', cle:'places',
                    valeur: JSON.stringify(placesConfig) });
}

/* « du mardi 1 au vendredi 4 septembre » */
function libelleSemaine(w){
  if(!w.du && !w.au) return 'Semaine à définir';
  const fmt = (iso, avecMois) => {
    if(!iso) return '?';
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', avecMois
      ? { weekday:'long', day:'numeric', month:'long' }
      : { weekday:'long', day:'numeric' });
  };
  return 'du ' + fmt(w.du, false) + ' au ' + fmt(w.au, true);
}

/* Semaines de travail (lundi→vendredi) d'un mois donné */
function semainesDuMois(isoMois){
  if(!isoMois) return [];
  const [an, mo] = isoMois.split('-').map(Number);
  if(!an || !mo) return [];
  const p2 = n => String(n).padStart(2, '0');
  const dernier = new Date(an, mo, 0).getDate();
  const out = [];
  let jour = 1;
  while(jour <= dernier){
    const d = new Date(an, mo - 1, jour);
    const js = d.getDay();                       /* 0 dimanche, 6 samedi */
    if(js === 0 || js === 6){ jour++; continue; }
    /* Début de bloc : on va jusqu'au vendredi ou à la fin du mois */
    const debut = jour;
    let fin = jour;
    while(fin + 1 <= dernier){
      const suivant = new Date(an, mo - 1, fin + 1).getDay();
      if(suivant === 0 || suivant === 6) break;
      fin++;
    }
    out.push({
      du: an + '-' + p2(mo) + '-' + p2(debut),
      au: an + '-' + p2(mo) + '-' + p2(fin),
      sb: '', lo: ''
    });
    jour = fin + 1;
  }
  return out;
}

function afficherPlaces(stats){
  const zone = $('blocPlaces');
  if(!zone) return;
  zone.innerHTML = '';

  const nb = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
  const libMois = iso => iso
    ? new Date(iso + '-15T12:00:00').toLocaleDateString('fr-FR', { month:'long', year:'numeric' })
    : 'Mois non renseigné';

  /* Un récapitulatif par mois configuré */
  if(!placesConfig.mois.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Aucun mois configuré — utilise « Régler les places » ci-dessous.';
    zone.appendChild(v);
  }

  placesConfig.mois.forEach(m => {
    const st = stats.parMois[m.mois] || { prevus:0, remplacements:0, fantomes:0, aDonner:0 };
    const restant = nb(m.total) - st.prevus;

    const r = document.createElement('div');
    r.style.cssText = 'background:var(--navy);border:1px solid var(--line);border-radius:10px;' +
      'padding:12px;margin-bottom:10px;font-size:14px;line-height:1.7;';
    r.innerHTML =
      '<div style="font-size:15px;font-weight:700;margin-bottom:6px;text-transform:capitalize;">' +
        '📊 ' + libMois(m.mois) + '</div>' +
      '<div><strong>' + st.prevus + '</strong> candidat(s) prévu(s) sur <strong>' +
        (m.total || '?') + '</strong> place(s)' +
        (m.total ? ' — <span style="color:' + (restant < 0 ? 'var(--red)' : 'var(--accent-text)') +
          ';font-weight:700;">' +
          (restant >= 0 ? restant + ' élève(s) à prévoir' : Math.abs(restant) + ' en trop') +
          '</span>' : '') + '</div>' +
      ((m.q1 || m.q2)
        ? '<div style="color:var(--muted);font-size:13px;">1ʳᵉ quinzaine : ' + (m.q1 || '?') +
          ' · 2ᵉ quinzaine : ' + (m.q2 || '?') + '</div>'
        : '') +
      '<div>🔄 <strong>' + st.remplacements + '</strong> remplacement(s) · ' +
        '👻 <strong>' + st.fantomes + '</strong> place(s) fantôme(s)' +
        (st.aDonner ? ' · 🏫 <strong>' + st.aDonner + '</strong> à donner à une autre AE' : '') +
      '</div>';

    if((m.semaines || []).length){
      let tsb = 0, tlo = 0;
      m.semaines.forEach(w => { tsb += nb(w.sb); tlo += nb(w.lo); });
      const s = document.createElement('div');
      s.style.cssText = 'margin-top:8px;padding-top:8px;border-top:1px solid var(--line);' +
        'font-size:13px;line-height:1.8;';
      s.innerHTML = '<div style="font-weight:700;margin-bottom:2px;">Jours ouverts à la prise de date</div>' +
        m.semaines.map(w => {
          const n = (stats.parSemaine && stats.parSemaine[w.du + '>' + w.au]) || 0;
          return '• ' + libelleSemaine(w) + ' — 🚗 <strong>' + (w.sb || 0) +
            '</strong> j Saint-Brieuc · <strong>' + (w.lo || 0) + '</strong> j Loudéac' +
            ' · <span style="color:' + (n ? 'var(--accent-text)' : 'var(--muted)') + ';">' +
            n + ' examen' + (n > 1 ? 's' : '') + ' prévu' + (n > 1 ? 's' : '') + '</span>';
        }).join('<br>') +
        '<div style="margin-top:4px;color:var(--muted);">Total : ' + tsb +
        ' j Saint-Brieuc · ' + tlo + ' j Loudéac</div>';
      r.appendChild(s);
    }

    /* Candidats sans mois reconnu */
    zone.appendChild(r);
  });

  if(stats.horsMois){
    const h = document.createElement('div');
    h.style.cssText = 'background:var(--warn-bg);border:1px solid var(--red);border-radius:10px;' +
      'padding:10px 12px;margin-bottom:10px;font-size:13px;color:var(--warn-text);';
    h.textContent = '⚠️ ' + stats.horsMois + ' candidat(s) sur un mois non configuré.';
    zone.appendChild(h);
  }

  /* ---- Réglage ---- */
  const det = document.createElement('details');
  det.innerHTML = '<summary style="cursor:pointer;color:var(--accent-text);font-weight:700;' +
    'font-size:14px;">⚙️ Régler les places disponibles</summary>';
  const corps = document.createElement('div');
  corps.className = 'mois-places';
  corps.style.cssText = 'margin-top:12px;';
  det.appendChild(corps);
  zone.appendChild(det);

  function dessinerTout(){
    corps.innerHTML = '';

    placesConfig.mois.forEach((m, im) => {
      const bloc = document.createElement('div');
      bloc.style.cssText = 'border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:14px;';

      const tete = document.createElement('div');
      tete.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:10px;';
      const im2 = document.createElement('input');
      im2.type = 'month';
      im2.value = m.mois || '';
      im2.style.cssText = 'flex:1;margin:0;';
      im2.addEventListener('change', () => { m.mois = im2.value; });
      const bGen = document.createElement('button');
      bGen.className = 'btn btn-secondary';
      bGen.style.cssText = 'width:auto;padding:11px 12px;font-size:13px;white-space:nowrap;';
      bGen.textContent = '🗓️ Générer';
      bGen.addEventListener('click', async () => {
        if(!m.mois){ showToast('Choisis un mois.'); return; }
        const nouvelles = semainesDuMois(m.mois);
        if((m.semaines || []).length &&
           !await confirmer('Remplacer les semaines de ce mois ?')) return;
        m.semaines = nouvelles;
        dessinerTout();
      });
      tete.appendChild(im2);
      tete.appendChild(bGen);
      bloc.appendChild(tete);

      const grille = document.createElement('div');
      grille.innerHTML =
        '<label>Places du mois</label><input type="text" class="mTotal" inputmode="numeric" value="' +
          (m.total || '') + '">' +
        '<div style="display:flex;gap:8px;">' +
          '<div style="flex:1;"><label>1ʳᵉ quinzaine</label>' +
            '<input type="text" class="mQ1" inputmode="numeric" value="' + (m.q1 || '') + '"></div>' +
          '<div style="flex:1;"><label>2ᵉ quinzaine</label>' +
            '<input type="text" class="mQ2" inputmode="numeric" value="' + (m.q2 || '') + '"></div>' +
        '</div>';
      grille.querySelector('.mTotal').addEventListener('input', e => { m.total = e.target.value.trim(); });
      grille.querySelector('.mQ1').addEventListener('input', e => { m.q1 = e.target.value.trim(); });
      grille.querySelector('.mQ2').addEventListener('input', e => { m.q2 = e.target.value.trim(); });
      bloc.appendChild(grille);

      (m.semaines || []).forEach((w, iw) => {
        const l = document.createElement('div');
        l.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px;';
        l.innerHTML =
          '<div style="font-size:14px;font-weight:700;margin-bottom:8px;">' + libelleSemaine(w) + '</div>' +
          '<div style="display:flex;gap:6px;margin-bottom:6px;">' +
            '<input type="date" class="wDu" value="' + (w.du || '') + '" style="flex:1;margin:0;">' +
            '<input type="date" class="wAu" value="' + (w.au || '') + '" style="flex:1;margin:0;">' +
          '</div>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<span style="font-size:13px;color:var(--muted);white-space:nowrap;">Jours 🚗</span>' +
            '<input type="text" class="wSB" inputmode="decimal" value="' + (w.sb || '') +
              '" style="flex:1;margin:0;text-align:center;">' +
            '<input type="text" class="wLO" inputmode="decimal" value="' + (w.lo || '') +
              '" style="flex:1;margin:0;text-align:center;">' +
          '</div>' +
          '<div style="display:flex;gap:8px;font-size:11px;color:var(--muted);margin-top:2px;">' +
            '<span style="flex:1;text-align:center;">Saint-Brieuc</span>' +
            '<span style="flex:1;text-align:center;">Loudéac</span>' +
          '</div>';
        l.querySelector('.wDu').addEventListener('change', e => { w.du = e.target.value; dessinerTout(); });
        l.querySelector('.wAu').addEventListener('change', e => { w.au = e.target.value; dessinerTout(); });
        l.querySelector('.wSB').addEventListener('input', e => { w.sb = e.target.value.trim(); });
        l.querySelector('.wLO').addEventListener('input', e => { w.lo = e.target.value.trim(); });

        const bw = document.createElement('button');
        bw.className = 'btn btn-secondary';
        bw.style.cssText = 'margin-top:8px;padding:7px;font-size:12px;color:var(--red);border-color:var(--red);';
        bw.textContent = '✕ Retirer cette semaine';
        bw.addEventListener('click', () => { m.semaines.splice(iw, 1); dessinerTout(); });
        l.appendChild(bw);
        bloc.appendChild(l);
      });

      const bAddW = document.createElement('button');
      bAddW.className = 'btn btn-secondary';
      bAddW.style.cssText = 'margin-bottom:8px;padding:8px;font-size:12px;';
      bAddW.textContent = '➕ Ajouter une semaine';
      bAddW.addEventListener('click', () => {
        m.semaines = m.semaines || [];
        m.semaines.push({ du:'', au:'', sb:'', lo:'' });
        dessinerTout();
      });
      bloc.appendChild(bAddW);

      const bDelM = document.createElement('button');
      bDelM.className = 'btn btn-secondary';
      bDelM.style.cssText = 'padding:8px;font-size:12px;color:var(--red);border-color:var(--red);';
      bDelM.textContent = '🗑️ Retirer ce mois';
      bDelM.addEventListener('click', async () => {
        if(!await confirmer('Retirer ' + libMois(m.mois) + ' du réglage ?')) return;
        placesConfig.mois.splice(im, 1);
        dessinerTout();
      });
      bloc.appendChild(bDelM);

      corps.appendChild(bloc);
    });

    const bAddM = document.createElement('button');
    bAddM.className = 'btn btn-secondary';
    bAddM.style.cssText = 'margin-bottom:10px;';
    bAddM.textContent = '➕ Ajouter un mois';
    bAddM.addEventListener('click', () => {
      /* Propose le mois suivant le dernier configuré */
      const d = new Date();
      d.setDate(15);
      if(placesConfig.mois.length){
        const dernier = placesConfig.mois[placesConfig.mois.length - 1].mois;
        if(dernier){
          const [a, mo] = dernier.split('-').map(Number);
          d.setFullYear(a, mo, 15);
        }
      }
      const p2 = n => String(n).padStart(2, '0');
      placesConfig.mois.push(moisVide(d.getFullYear() + '-' + p2(d.getMonth() + 1)));
      dessinerTout();
    });
    corps.appendChild(bAddM);

    const bEnr = document.createElement('button');
    bEnr.className = 'btn btn-primary';
    bEnr.textContent = '💾 Enregistrer';
    bEnr.addEventListener('click', async () => {
      bEnr.disabled = true;
      bEnr.textContent = 'Enregistrement…';
      try{
        placesConfig.mois.sort((a, b) => String(a.mois).localeCompare(String(b.mois)));
        await enregistrerPlaces();
        showToast('Places enregistrées ✅');
        afficherBureau();
      }catch(e){ showToast('Erreur : ' + e.message); }
      finally{ bEnr.disabled = false; bEnr.textContent = '💾 Enregistrer'; }
    });
    corps.appendChild(bEnr);
  }
  dessinerTout();
}


/* Synthèse des élèves à placer : par moniteur, semaine et centre */
function tableauAPlacer(liste){
  const bloc = document.createElement('div');
  if(!liste.length) return bloc;

  const nb = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
  const CENTRES = ['Saint-Brieuc', 'Loudéac'];

  /* Regroupement par semaine puis par centre */
  const parSemaine = {};
  liste.forEach(e => {
    const s = suiviDe(e.eleve);
    const se = s.semaine || '— semaine à définir —';
    const ce = s.centre || '— centre à définir —';
    if(!parSemaine[se]) parSemaine[se] = {};
    if(!parSemaine[se][ce]) parSemaine[se][ce] = [];
    parSemaine[se][ce].push(e);
  });

  /* Jours ouverts de chaque semaine, pour comparer à la demande */
  const joursDe = {};
  toutesSemaines().forEach(w => {
    const lib = libelleSemaine(w) +
      ((w.sb || w.lo) ? ' (' + (w.sb || 0) + ' SB / ' + (w.lo || 0) + ' LO)' : '');
    joursDe[lib] = { 'Saint-Brieuc': nb(w.sb), 'Loudéac': nb(w.lo) };
  });

  const det = document.createElement('details');
  det.open = true;
  det.innerHTML = '<summary style="cursor:pointer;color:var(--accent-text);font-weight:700;' +
    'font-size:14px;margin-bottom:8px;">📊 Répartition des places — ' +
    liste.length + ' élève(s) dans la liste</summary>';

  const corps = document.createElement('div');
  corps.style.cssText = 'margin-bottom:12px;';

  /* Les semaines datées d'abord, les indéfinies à la fin */
  Object.keys(parSemaine).sort((a, b) => {
    const ia = a.startsWith('—') ? 1 : 0, ib = b.startsWith('—') ? 1 : 0;
    return ia !== ib ? ia - ib : a.localeCompare(b);
  }).forEach(se => {
    const bs = document.createElement('div');
    bs.style.cssText = 'background:var(--navy);border:1px solid var(--line);border-radius:10px;' +
      'padding:10px 12px;margin-bottom:8px;font-size:13px;line-height:1.6;';

    let total = 0;
    Object.keys(parSemaine[se]).forEach(ce => { total += parSemaine[se][ce].length; });

    const tete = document.createElement('div');
    tete.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent-text);margin-bottom:6px;';
    tete.textContent = '🗓️ ' + se + ' — ' + total + ' élève(s)';
    bs.appendChild(tete);

    /* Chaque centre, avec les jours ouverts en regard */
    const centresPresents = Object.keys(parSemaine[se]);
    CENTRES.concat(centresPresents.filter(x => CENTRES.indexOf(x) === -1))
      .forEach(ce => {
        const eleves = parSemaine[se][ce];
        const dispo = joursDe[se] ? joursDe[se][ce] : undefined;
        if(!eleves && !dispo) return;

        const n = eleves ? eleves.length : 0;
        const ligne = document.createElement('div');
        ligne.style.cssText = 'margin-top:4px;';

        let etat = '';
        if(dispo !== undefined){
          /* Un jour d'examen accueille plusieurs candidats : on affiche les deux */
          etat = ' · <span style="color:var(--muted);">' + dispo + ' jour(s) ouvert(s)</span>';
          if(dispo === 0 && n > 0){
            etat += ' <span style="color:var(--red);font-weight:700;">⚠️ aucun jour ici</span>';
          }
        }
        ligne.innerHTML = '<strong>📍 ' + ce.replace(/</g,'&lt;') + '</strong> — ' +
          n + ' élève(s)' + etat;
        bs.appendChild(ligne);

        (eleves || []).forEach(e => {
          const s = suiviDe(e.eleve);
          const l = document.createElement('div');
          l.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0 4px 18px;';

          const nom = document.createElement('span');
          nom.style.cssText = 'flex:1;color:var(--cream);font-size:14px;min-width:0;';
          nom.textContent = (s.nbAjournements ? '🔁 ' : '') + e.eleve +
            (s.moniteurDate ? ' · ' + s.moniteurDate : ' · moniteur à définir');
          l.appendChild(nom);

          const bCal = document.createElement('button');
          bCal.className = 'btn btn-secondary';
          bCal.style.cssText = 'width:auto;padding:6px 9px;font-size:15px;margin:0;flex-shrink:0;';
          bCal.textContent = '📅';
          bCal.title = 'Date obtenue pour ' + e.eleve;
          bCal.addEventListener('click', async () => {
            const iso = await choisirDate('Date obtenue — ' + e.eleve);
            if(!iso) return;
            bCal.disabled = true;
            try{
              await envoyerConsigne(e.eleve, 'permis',
                'Examen du permis fixé au ' + dateEnToutesLettres(iso) + ' (bureau)');
              await majSuivi(e.eleve, { datePermis: dateEnToutesLettres(iso),
                                        aPlanifier: '', statut: '' });
              showToast('Date transmise ✅');
              afficherBureau();
            }catch(err){ showToast('Erreur : ' + err.message); bCal.disabled = false; }
          });
          l.appendChild(bCal);

          const bDel = document.createElement('button');
          bDel.className = 'btn btn-secondary';
          bDel.style.cssText = 'width:auto;padding:6px 9px;font-size:13px;margin:0;flex-shrink:0;' +
            'color:var(--red);border-color:var(--red);';
          bDel.textContent = '✕';
          bDel.title = 'Retirer de la liste RDV PERMIS';
          bDel.addEventListener('click', async () => {
            if(!await confirmer('Retirer ' + e.eleve + ' de la liste RDV PERMIS ?\n\n' +
                        'Il retourne dans « Examens du permis à prévoir ».')) return;
            bDel.disabled = true;
            try{
              await majSuivi(e.eleve, { aPlanifier: '', retireAPrevoir: '' });
              showToast(e.eleve + ' est retourné en « à prévoir »');
              afficherBureau();
            }catch(err){ showToast('Erreur : ' + err.message); bDel.disabled = false; }
          });
          l.appendChild(bDel);

          bs.appendChild(l);
        });
      });

    corps.appendChild(bs);
  });

  /* Rappel du total par moniteur, sous forme compacte */
  const parMoniteur = {};
  liste.forEach(e => {
    const m = suiviDe(e.eleve).moniteurDate || '— à définir —';
    parMoniteur[m] = (parMoniteur[m] || 0) + 1;
  });
  const pied = document.createElement('div');
  pied.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.7;padding:4px 2px;';
  pied.innerHTML = '👤 ' + Object.keys(parMoniteur).sort()
    .map(m => m.replace(/</g,'&lt;') + ' (' + parMoniteur[m] + ')').join(' · ');
  corps.appendChild(pied);

  det.appendChild(corps);
  bloc.appendChild(det);
  return bloc;
}

/* Élèves dont l'examen blanc a montré qu'ils n'avaient pas le niveau */
function afficherPasNiveau(tous){
  const zone = $('listePasNiveau');
  if(!zone) return;

  const liste = tous.filter(e => e.etat.ebSuite === 'pasleniveau');
  zone.innerHTML = '';
  if(!liste.length){
    zone.innerHTML = '<div class="empty">Personne dans ce cas.</div>';
    return;
  }

  liste.forEach(e => {
    zone.appendChild(ligneBureau(e, {
      info: x => 'Examen blanc du ' + (x.etat.ebDate || '?') + ' — pas le niveau',
      resume: x => resumeSuivi(x.eleve),
      alerte: () => 'À replacer ou heures à fixer',
      actions: (x, zone2) => {
        const r = document.createElement('div');
        r.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

        const bEB = document.createElement('button');
        bEB.className = 'btn btn-primary';
        bEB.style.cssText = 'width:auto;padding:10px 13px;font-size:13px;';
        bEB.textContent = '📝 Replacer un examen blanc';
        bEB.addEventListener('click', async () => {
          const n = await demander('Nouvel examen blanc dans combien de leçons ?\n' +
                           '(laisse vide si non déterminé)');
          if(n === null) return;
          const v = String(n).trim();
          bEB.disabled = true;
          try{
            await envoyerConsigne(x.eleve, 'examblanc',
              'Nouvel examen blanc à prévoir' +
              (v ? ' dans ' + v + ' leçon' + (parseInt(v, 10) > 1 ? 's' : '') : '') + ' (bureau)');
            showToast('Transmis au moniteur ✅');
            afficherBureau();
          }catch(err){ showToast('Erreur : ' + err.message); bEB.disabled = false; }
        });
        r.appendChild(bEB);

        const bH = document.createElement('button');
        bH.className = 'btn btn-secondary';
        bH.style.cssText = 'width:auto;padding:10px 13px;font-size:13px;';
        bH.textContent = '⏱️ Fixer un nombre d\'heures';
        bH.addEventListener('click', async () => {
          const n = await demander('Combien d\'heures de conduite avant de reparler d\'examen ?');
          if(n === null) return;
          const v = String(n).trim();
          if(!v) return;
          bH.disabled = true;
          try{
            await envoyerConsigne(x.eleve, 'examblanc',
              v + 'h de conduite à prévoir avant de reparler d\'examen (bureau)');
            showToast('Transmis au moniteur ✅');
            afficherBureau();
          }catch(err){ showToast('Erreur : ' + err.message); bH.disabled = false; }
        });
        r.appendChild(bH);

        zone2.appendChild(r);
      }
    }));
  });
}

/* Construit une ligne d'élève avec ses actions */
function ligneBureau(e, options){
  const row = document.createElement('div');
  row.className = 'history-item';

  /* Un repassage se repère d'un coup d'œil */
  const sv = suiviDe(e.eleve);
  if(sv.nbAjournements){
    row.classList.add('repassage');
  }
  row.style.flexDirection = 'column';
  row.style.alignItems = 'stretch';

  const haut = document.createElement('div');
  haut.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:8px;';

  const meta = document.createElement('div');
  meta.className = 'meta';
  const nom = document.createElement('strong');
  nom.textContent = e.eleve;
  meta.appendChild(nom);

  const info = document.createElement('span');
  info.textContent = options.info(e);
  meta.appendChild(info);

  const sous = document.createElement('span');
  sous.textContent = 'Dernier cours le ' + (e.date || '?') +
                     (e.moniteur ? ' avec ' + e.moniteur : '');
  meta.appendChild(sous);

  if(e.enAttente.length){
    const att = document.createElement('span');
    att.style.color = 'var(--accent-text)';
    att.textContent = '📨 ' + e.enAttente.map(x => x.texte).join(' · ') +
                      ' (transmis au prochain cours)';
    meta.appendChild(att);
  }
  haut.appendChild(meta);

  if(options.alerte && options.alerte(e)){
    const a = document.createElement('div');
    a.style.cssText = 'font-size:22px;flex-shrink:0;';
    a.textContent = '⚠️';
    a.title = options.alerte(e);
    haut.appendChild(a);
  }
  row.appendChild(haut);

  if(options.resume){
    const r = options.resume(e);
    if(r){
      const rr = document.createElement('span');
      rr.style.cssText = 'display:block;font-size:12px;color:var(--muted);line-height:1.5;margin-top:4px;';
      rr.textContent = r;
      meta.appendChild(rr);
    }
  }

  const actions = document.createElement('div');
  actions.style.cssText = 'margin-top:10px;';
  options.actions(e, actions);
  row.appendChild(actions);

  return row;
}

/* Bouton + calendrier pour fixer une date depuis le bureau */
function boutonDate(libelle, onChoisi){
  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;';
  b.textContent = libelle;
  b.addEventListener('click', async () => {
    const iso = await choisirDate(libelle);
    if(!iso) return;
    b.disabled = true;
    b.textContent = 'Enregistrement…';
    try{
      await onChoisi(iso);
    }finally{
      b.disabled = false;
      b.textContent = libelle;
    }
  });
  return b;
}

async function afficherBureau(silencieux){
  const zEB = $('listeExamBlanc');
  const zSim = $('listeSimu');
  const zPer = $('listePermis');
  if(!zEB) return;

  const btn = $('bureauBtn');
  if(silencieux){
    if(btn) btn.textContent = '🔄 Actualisation…';
  }else{
    if(btn){ btn.disabled = true; btn.textContent = '🔄 Chargement…'; }
    zSim.innerHTML = '<div class="empty">Chargement du suivi…<br>' +
      '<span style="font-size:12px;">Le premier chargement prend quelques secondes.</span></div>';
    zEB.innerHTML = '';
    zPer.innerHTML = '';
  }

  try{
    await chargerBureau(!silencieux);
    bureauDejaCharge = true;
  }catch(e){
    if(btn){ btn.disabled = false; btn.textContent = '🔄 Actualiser les listes'; }
    if(!silencieux){
      zSim.innerHTML = '';
      const err = document.createElement('div');
      err.className = 'empty';
      err.innerHTML = '⚠️ ' + e.message.replace(/</g,'&lt;') + '<br>';
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'margin-top:10px;width:auto;padding:10px 16px;';
      b.textContent = '🔄 Réessayer';
      b.addEventListener('click', () => afficherBureau());
      err.appendChild(b);
      zSim.appendChild(err);
    }
    return;
  }
  if(btn){ btn.disabled = false; btn.textContent = '🔄 Actualiser les listes'; }

  const tous = etatBureau.eleves;

  /* ---- 1. Examens blancs à prévoir ---- */
  const eb = tous.filter(e => (e.etat.examBlanc === 'aprevoir' || e.etat.examBlanc === 'reserve') &&
                              e.etat.ebSuite !== 'pasleniveau');
  eb.sort((a, b) => (a.etat.examBlancN === null ? 99 : a.etat.examBlancN) -
                    (b.etat.examBlancN === null ? 99 : b.etat.examBlancN));
  zEB.innerHTML = '';
  if(!eb.length){
    zEB.innerHTML = '<div class="empty">Aucun examen blanc à prévoir.</div>';
  }else{
    eb.forEach(e => {
      zEB.appendChild(ligneBureau(e, {
        info: x => {
          const n = x.etat.examBlancN;
          const etat = (x.etat.examBlanc === 'reserve') ? 'Réservé' : 'À prévoir';
          if(n === null) return etat + ' — nombre de leçons non précisé';
          if(n === 0) return etat + ' — dès la prochaine leçon';
          return etat + ' — dans ' + n + ' leçon' + (n > 1 ? 's' : '');
        },
        alerte: x => (x.etat.examBlancN !== null && x.etat.examBlancN <= 1)
                     ? 'Plus qu\'une leçon avant l\'examen blanc' : null,
        actions: (x, zone) => {
          zone.appendChild(boutonDate('📅 Fixer la date', async iso => {
            await envoyerConsigne(x.eleve, 'examblanc',
              'Examen blanc fixé au ' + dateEnToutesLettres(iso) + ' (bureau)');
            showToast('Date transmise ✅');
            afficherBureau();
          }));
        }
      }));
    });
  }

  /* ---- 2. Simulateurs nuit et risques ---- */
  const sim = tous.filter(e => e.etat.simuNuit === 'aprevoir' || e.etat.simuNuit === 'prevu');
  zSim.innerHTML = '';
  if(!sim.length){
    zSim.innerHTML = '<div class="empty">Aucun simulateur nuit et risques en attente.</div>';
  }else{
    sim.forEach(e => {
      zSim.appendChild(ligneBureau(e, {
        info: x => (x.etat.simuNuit === 'prevu' ? 'Déjà prévu' : 'À prévoir') +
                   (x.etat.examBlanc === 'reserve'
                     ? ' — examen blanc réservé' +
                       (x.etat.examBlancN !== null ? ' dans ' + x.etat.examBlancN + ' leçon(s)' : '')
                     : ''),
        /* Le simulateur doit être fait avant l'examen blanc */
        alerte: x => (x.etat.simuNuit === 'aprevoir' && x.etat.examBlanc === 'reserve' &&
                      x.etat.examBlancN !== null && x.etat.examBlancN <= 1)
                     ? 'Examen blanc imminent et simulateur non fait' : null,
        actions: (x, zone) => {
          zone.appendChild(boutonDate('📅 Fixer la date', async iso => {
            await envoyerConsigne(x.eleve, 'simu',
              'Simulateur nuit et risques fixé au ' + dateEnToutesLettres(iso) + ' (bureau)');
            showToast('Date transmise ✅');
            afficherBureau();
          }));
        }
      }));
    });
  }

  /* ---- 3 bis. Élèves permis : à placer sur une date ---- */
  const zAP = $('listeAPlacer');
  const aPlacer = tous.filter(e => suiviDe(e.eleve).aPlanifier === 'oui' &&
                                   suiviDe(e.eleve).statut !== 'annule');
  zAP.innerHTML = '';
  if(!aPlacer.length){
    zAP.innerHTML = '<div class="empty">Aucun élève dans la liste RDV PERMIS.</div>';
  }else{
    zAP.appendChild(tableauAPlacer(aPlacer));

    /* Seuls les dossiers incomplets méritent une fiche détaillée :
       les autres se gèrent depuis la synthèse ci-dessus. */
    const incomplets = aPlacer.filter(e => {
      const s = suiviDe(e.eleve);
      return !s.centre || !s.moniteurDate || !s.semaine;
    });

    if(!incomplets.length){
      const ok = document.createElement('div');
      ok.className = 'empty';
      ok.innerHTML = '✅ Tous les dossiers sont complets.<br>' +
        '<span style="font-size:12px;">Utilise la synthèse ci-dessus pour saisir les dates obtenues.</span>';
      zAP.appendChild(ok);
    }else{
      const t = document.createElement('div');
      t.style.cssText = 'font-size:13px;font-weight:700;color:var(--warn-text);margin:12px 0 6px;';
      t.textContent = '⏳ À compléter (' + incomplets.length + ')';
      zAP.appendChild(t);
    }

    incomplets.forEach(e => {
      zAP.appendChild(ligneBureau(e, {
        info: x => {
          const s = suiviDe(x.eleve);
          const t = (s.typeExamen === 'bea' ? '🅰 BEA'
                     : s.typeExamen === 'handicap' ? '♿ Handicap' : '🅑 BV');
          return t + ' · ' + (s.centre || 'centre à définir') +
                 (s.moniteurDate ? ' · ' + s.moniteurDate : ' · moniteur à définir') +
                 (s.semaine ? ' · ' + s.semaine : '');
        },
        resume: x => resumeSuivi(x.eleve),
        alerte: x => {
          const s = suiviDe(x.eleve);
          if(!s.centre) return 'Centre d\'examen non défini';
          if(!s.moniteurDate) return 'Moniteur non défini';
          return null;
        },
        actions: (x, zone) => {
          const s = suiviDe(x.eleve);

          const selC = document.createElement('select');
          selC.style.marginBottom = '8px';
          selC.innerHTML = '<option value="">— centre d\'examen —</option>' +
            '<option value="Saint-Brieuc">Saint-Brieuc</option>' +
            '<option value="Loudéac">Loudéac</option>';
          selC.value = s.centre || '';
          selC.addEventListener('change', async () => {
            selC.disabled = true;
            try{ await majSuivi(x.eleve, { centre: selC.value }); await chargerBureau(); afficherBureau(); }
            catch(e){ showToast('Erreur : ' + e.message); }
            selC.disabled = false;
          });
          zone.appendChild(selC);

          const selM = document.createElement('select');
          selM.style.marginBottom = '8px';
          selM.innerHTML = '<option value="">— moniteur qui prend la date —</option>';
          moniteursActifs.forEach(n => {
            const o = document.createElement('option');
            o.value = n; o.textContent = n;
            selM.appendChild(o);
          });
          selM.value = s.moniteurDate || '';
          selM.addEventListener('change', async () => {
            selM.disabled = true;
            try{ await majSuivi(x.eleve, { moniteurDate: selM.value }); await chargerBureau(); }
            catch(e){ showToast('Erreur : ' + e.message); }
            selM.disabled = false;
          });
          zone.appendChild(selM);

          const selS = document.createElement('select');
          selS.style.marginBottom = '8px';
          selS.innerHTML = '<option value="">— semaine à viser —</option>';
          toutesSemaines().forEach(w => {
            const lib = libelleSemaine(w) +
                        ((w.sb || w.lo) ? ' (' + (w.sb || 0) + ' SB / ' + (w.lo || 0) + ' LO)' : '');
            const o = document.createElement('option');
            o.value = lib; o.textContent = lib;
            selS.appendChild(o);
          });
          if(s.semaine && !toutesSemaines().some(w =>
              (libelleSemaine(w) + ((w.sb || w.lo) ? ' (' + (w.sb||0) + ' SB / ' + (w.lo||0) + ' LO)' : '')) === s.semaine)){
            const o = document.createElement('option');
            o.value = s.semaine; o.textContent = s.semaine;
            selS.appendChild(o);
          }
          selS.value = s.semaine || '';
          selS.addEventListener('change', async () => {
            selS.disabled = true;
            try{ await majSuivi(x.eleve, { semaine: selS.value }); await chargerBureau(); }
            catch(e){ showToast('Erreur : ' + e.message); }
            selS.disabled = false;
          });
          zone.appendChild(selS);

          zone.appendChild(boutonDate('📅 Date obtenue', async iso => {
            await envoyerConsigne(x.eleve, 'permis',
              'Examen du permis fixé au ' + dateEnToutesLettres(iso) + ' (bureau)');
            await majSuivi(x.eleve, { datePermis: dateEnToutesLettres(iso),
                                      aPlanifier: '', statut: '' });
            showToast('Date transmise ✅');
            afficherBureau();
          }));
        }
      }));
    });
  }

  /* ---- 4. Permis prévus : préparation administrative ---- */
  const zPP = $('listePermisPrevu');
  const prevus = tous.filter(e => e.etat.permis === 'prevu');
  /* Élèves dont seule la fiche de suivi porte une date */
  etatBureau.suivi.forEach(s => {
    if(!s.datePermis) return;
    if(prevus.some(x => normaliserMot(x.eleve) === normaliserMot(s.eleve))) return;
    const base = tous.find(x => normaliserMot(x.eleve) === normaliserMot(s.eleve));
    if(base) prevus.push(base);
  });

  /* Date et boîte de chaque élève, pour le récapitulatif et les filtres */
  prevus.forEach(e => {
    const s = etatBureau.suivi.find(y => normaliserMot(y.eleve) === normaliserMot(e.eleve));
    e._suivi = s || {};
    e._datePermis = (e.etat.permisDate) || (s && s.datePermis) || '';
    e._iso = dateFrVersIso(e._datePermis) || '';
    e._boite = ((s && s.typeExamen) || e.boite ||
                (/automatique/i.test(e.type || '') ? 'bea' : 'bv')).toLowerCase();
  });

  /* Récapitulatif : nombre d'examens par date */
  const parDate = {};
  prevus.forEach(e => {
    const k = e._datePermis || 'Date inconnue';
    if(!parDate[k]) parDate[k] = { iso: e._iso, bv: 0, bea: 0, handicap: 0, total: 0 };
    parDate[k].total++;
    if(e._boite === 'bea') parDate[k].bea++;
    else if(e._boite === 'handicap') parDate[k].handicap++;
    else parDate[k].bv++;
  });

  const dates = Object.keys(parDate).sort((a, b) =>
    (parDate[a].iso || '9999').localeCompare(parDate[b].iso || '9999'));

  const zRecap = $('recapDates');
  zRecap.innerHTML = '';
  if(dates.length){
    dates.forEach(k => {
      const d = parDate[k];
      /* Alerte si plusieurs types d'examen tombent le même jour */
      const types = [d.bv, d.bea, d.handicap].filter(x => x > 0).length;
      const mixte = (types > 1);
      const l = document.createElement('div');
      l.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;' +
        'padding:8px 10px;border-radius:8px;margin-bottom:4px;font-size:14px;' +
        'background:' + (mixte ? 'var(--warn-bg)' : 'var(--navy)') + ';' +
        'border:1px solid ' + (mixte ? 'var(--red)' : 'var(--line)') + ';';
      const g = document.createElement('div');
      g.innerHTML = '<strong>' + k.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</strong>' +
        '<span style="color:var(--muted);"> — ' + d.total + ' examen' + (d.total>1?'s':'') + '</span>';
      const dr = document.createElement('div');
      dr.style.cssText = 'flex-shrink:0;font-size:13px;font-weight:700;';
      const parts = [];
      if(d.bv) parts.push('<span style="color:var(--accent-text);">' + d.bv + ' BV</span>');
      if(d.bea) parts.push('<span style="color:#E8A33D;">' + d.bea + ' BEA</span>');
      if(d.handicap) parts.push('<span style="color:#7FB3FF;">' + d.handicap + ' ♿</span>');
      dr.innerHTML = parts.join(' · ') + (mixte ? ' ⚠️' : '');
      dr.title = mixte ? 'Plusieurs types d\'examen le même jour' : '';
      l.appendChild(g); l.appendChild(dr);
      zRecap.appendChild(l);
    });
  }

  /* Menu des dates disponibles */
  const selD = $('filtreDate');
  const choixD = selD.value;
  selD.innerHTML = '<option value="">Toutes les dates</option>';
  dates.forEach(k => {
    const o = document.createElement('option');
    o.value = k; o.textContent = k + ' (' + parDate[k].total + ')';
    selD.appendChild(o);
  });
  selD.value = choixD;

  /* Application des filtres */
  const fEtat = $('filtrePP').value;
  const fDate = selD.value;
  let visibles = prevus.slice();
  if(fEtat === 'donner')    visibles = visibles.filter(e => e._suivi.dateADonner === 'oui');
  if(fEtat === 'remplacer') visibles = visibles.filter(e => e._suivi.aRemplacer === 'oui');
  if(fEtat === 'fantome')   visibles = visibles.filter(e => e._suivi.fantome === 'oui');
  if(fEtat === 'ok')        visibles = visibles.filter(e => e._suivi.toutOk === 'oui');
  if(fEtat === 'pasok')     visibles = visibles.filter(e => e._suivi.toutOk !== 'oui');
  if(fDate) visibles = visibles.filter(e => (e._datePermis || 'Date inconnue') === fDate);
  visibles.sort((a, b) => (a._iso || '9999').localeCompare(b._iso || '9999'));

  /* Statistiques ventilées par mois d'examen */
  const actifs = prevus.filter(e => suiviDe(e.eleve).statut !== 'annule');
  const parMois = {};
  let horsMois = 0;
  const moisConnus = placesConfig.mois.map(m => m.mois).filter(Boolean);

  actifs.forEach(e => {
    const k = (e._iso || '').slice(0, 7);
    if(!k || moisConnus.indexOf(k) === -1){ horsMois++; return; }
    if(!parMois[k]) parMois[k] = { prevus:0, remplacements:0, fantomes:0, aDonner:0 };
    const s = suiviDe(e.eleve);
    parMois[k].prevus++;
    if(s.aRemplacer === 'oui') parMois[k].remplacements++;
    if(s.fantome === 'oui') parMois[k].fantomes++;
    if(s.dateADonner === 'oui') parMois[k].aDonner++;
  });

  /* Nombre d'examens tombant dans chaque semaine ouverte */
  const parSemaine = {};
  placesConfig.mois.forEach(m => (m.semaines || []).forEach(w => {
    if(!w.du || !w.au) return;
    const cle = w.du + '>' + w.au;
    parSemaine[cle] = actifs.filter(e => e._iso && e._iso >= w.du && e._iso <= w.au).length;
  }));

  afficherPlaces({ parMois: parMois, horsMois: horsMois, parSemaine: parSemaine });

  zPP.innerHTML = '';
  if(!prevus.length){
    zPP.innerHTML = '<div class="empty">Aucun permis prévu.</div>';
  }else if(!fEtat && !fDate){
    /* Liste souvent longue : on ne l'affiche qu'à la demande */
    zPP.innerHTML = '<div class="empty">' + prevus.length + ' permis prévu(s).<br>' +
      'Choisis un filtre ou une date ci-dessus pour afficher les élèves.</div>';
  }else if(!visibles.length){
    zPP.innerHTML = '<div class="empty">Aucun élève ne correspond à ce filtre.</div>';
  }else{
    visibles.forEach(e => {
      const l = ligneBureau(e, {
        info: x => (x._boite === 'bea' ? '🅰 BEA'
                    : x._boite === 'handicap' ? '♿ Handicap' : '🅑 BV') +
                   ' · Permis le ' + (x._datePermis || 'date inconnue') +
                   (x.etat.permisN !== null ? ' · encore ' + x.etat.permisN + ' leçon(s)' : ''),
        resume: x => resumeSuivi(x.eleve),
        alerte: x => {
          const s = etatBureau.suivi.find(y => normaliserMot(y.eleve) === normaliserMot(x.eleve));
          if(s && s.aRemplacer === 'oui') return 'Place à remplacer';
          if(s && s.dateADonner === 'oui') return 'Date à donner à une autre auto-école';
          return null;
        },
        actions: (x, zone) => {
          zone.appendChild(boutonDate('📅 Modifier la date', async iso => {
            await envoyerConsigne(x.eleve, 'permis',
              'Examen du permis fixé au ' + dateEnToutesLettres(iso) + ' (bureau)');
            await appelPrep({ action:'suiviSet', eleve:x.eleve,
                              datePermis: dateEnToutesLettres(iso), par: ACCES.moniteur || '' });
            showToast('Date transmise ✅');
            afficherBureau();
          }));
          const rangee = document.createElement('div');
          rangee.style.cssText = 'display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;';

          const s = suiviDe(x.eleve);
          const bAnn = document.createElement('button');
          bAnn.className = 'btn btn-secondary';
          bAnn.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;';
          bAnn.textContent = '❌ Annuler l\'examen';
          bAnn.addEventListener('click', async () => {
            const annuler = (s.statut !== 'annule');
            if(annuler && !await confirmer('Annuler l\'examen de ' + x.eleve + ' ?')) return;
            bAnn.disabled = true;
            try{
              if(annuler){
                /* Les anciennes consignes de date n'ont plus lieu d'être */
                const obsoletes = (x.enAttente || []).filter(cs =>
                  /permis|examen/i.test(cs.type + ' ' + cs.texte));
                for(const cs of obsoletes){
                  try{ await appelPrep({ action:'consigneDone', id: cs.id }); }catch(e){}
                }
                /* L'examen n'existe plus : l'élève retourne dans « à prévoir » */
                await envoyerConsigne(x.eleve, 'permis',
                  "Examen du permis annulé — date d'examen à prévoir (bureau)");
                await appelPrep({ action:'suiviDelete', eleve: x.eleve });
                showToast(x.eleve + ' est repassé en « à prévoir »');
              }else{
                await majSuivi(x.eleve, { statut: '' });
              }
              afficherBureau();
            }catch(e){ showToast('Erreur : ' + e.message); bAnn.disabled = false; }
          });
          rangee.appendChild(bAnn);

          const bSup = document.createElement('button');
          bSup.className = 'btn btn-secondary';
          bSup.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;' +
            'color:var(--red);border-color:var(--red);';
          bSup.textContent = '🗑️ Retirer de la liste';
          bSup.addEventListener('click', async () => {
            if(!await confirmer('Retirer ' + x.eleve + ' de la liste des permis prévus ?\n\n' +
                        'Ses bilans ne sont pas touchés.')) return;
            bSup.disabled = true;
            try{
              await appelPrep({ action:'suiviDelete', eleve: x.eleve });
              afficherBureau();
            }catch(e){ showToast('Erreur : ' + e.message); bSup.disabled = false; }
          });
          rangee.appendChild(bSup);
          zone.appendChild(rangee);

          zone.appendChild(ficheSuiviPermis(x));
        }
      });
      zPP.appendChild(l);
    });
  }

  /* ---- 5. Examens passés : résultat à saisir ---- */
  await afficherPostExamen(prevus.concat(
    tous.filter(e => suiviDe(e.eleve).datePermis &&
                     !prevus.some(p => normaliserMot(p.eleve) === normaliserMot(e.eleve)))
        .map(e => Object.assign({}, e, { _iso: dateFrVersIso(suiviDe(e.eleve).datePermis) }))
  ));

  /* ---- 3. Examens du permis ---- */
  const candidats = tous.filter(e => e.etat.permis === 'aprevoir' || e.etat.permis === 'annule');
  const masques = candidats.filter(e => suiviDe(e.eleve).aPlanifier === 'oui' ||
                                        suiviDe(e.eleve).retireAPrevoir === 'oui');
  let per = candidats.filter(e => suiviDe(e.eleve).aPlanifier !== 'oui' &&
                                  suiviDe(e.eleve).retireAPrevoir !== 'oui');

  /* Filtre par état */
  const fPer = $('filtrePermis') ? $('filtrePermis').value : '';
  if(fPer === 'annule') per = per.filter(e => e.etat.permis === 'annule');
  else if(fPer === 'aprevoir') per = per.filter(e => e.etat.permis === 'aprevoir');
  else if(fPer === 'urgent') per = per.filter(e => String(e.urgence || '') >= '4');
  else if(fPer === 'sansprio') per = per.filter(e => !e.urgence);
  else if(fPer === 'repassage') per = per.filter(e => suiviDe(e.eleve).nbAjournements);
  else if(fPer === 'premier') per = per.filter(e => !suiviDe(e.eleve).nbAjournements);

  /* Priorité décroissante, puis demande la plus ancienne */
  per.sort((a, b) => {
    const ua = parseInt(a.urgence || '0', 10);
    const ub = parseInt(b.urgence || '0', 10);
    if(ub !== ua) return ub - ua;
    return String(a.date || '').localeCompare(String(b.date || ''));
  });
  afficherPasNiveau(tous);
  afficherAttenteBilan(tous);
  afficherAlertePrise(per);

  zPer.innerHTML = '';

  /* Un élève écarté par un drapeau doit rester repérable */
  if(masques.length){
    const m = document.createElement('div');
    m.style.cssText = 'font-size:12px;color:var(--muted);padding:8px 10px;margin-bottom:8px;' +
      'background:var(--navy);border:1px solid var(--line);border-radius:8px;line-height:1.5;';
    m.innerHTML = 'ℹ️ ' + masques.length + ' élève(s) masqué(s) : ' +
      masques.map(x => {
        const s = suiviDe(x.eleve);
        return x.eleve.replace(/</g,'&lt;') +
          (s.aPlanifier === 'oui' ? ' (dans RDV PERMIS)' : ' (retiré de la liste)');
      }).join(' · ');
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'margin-top:8px;padding:8px;font-size:12px;';
    b.textContent = '↩️ Les remettre dans la liste';
    b.addEventListener('click', async () => {
      if(!await confirmer('Remettre ces ' + masques.length +
                          ' élève(s) dans les examens à prévoir ?')) return;
      b.disabled = true;
      try{
        for(const x of masques){
          await majSuivi(x.eleve, { aPlanifier: '', retireAPrevoir: '' });
        }
        afficherBureau();
      }catch(err){ showToast('Erreur : ' + err.message); b.disabled = false; }
    });
    m.appendChild(b);
    zPer.appendChild(m);
  }

  if(!per.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = fPer ? 'Aucun élève ne correspond à ce filtre.'
                         : 'Aucun examen du permis à prévoir.';
    zPer.appendChild(v);
  }else{
    per.forEach(e => {
      zPer.appendChild(ligneBureau(e, {
        info: x => {
          const sv = suiviDe(x.eleve);
          const rep = sv.nbAjournements ? '🔁 ' + mentionAjournements(sv.nbAjournements).replace('🔁 ','') + ' · ' : '🆕 ';
          const att = (sv.resultat === 'ajourne' && !sv.rdvPostFait)
            ? (sv.rdvPostDate ? ' · RDV post-permis le ' + dateEnToutesLettres(sv.rdvPostDate)
                              : ' · en attente du RDV post-permis')
            : '';
          const suite = sv.rdvPostFait === 'oui' && sv.suite ? ' · ' + libelleSuite(sv.suite) : '';
          const dispo = sv.dispoDu ? ' · 📅 à partir du ' + dateEnToutesLettres(sv.dispoDu) : '';
          const base = rep + ((x.etat.permis === 'annule') ? 'Examen annulé — à reprogrammer'
                                                          : 'Date à prévoir') + att + suite + dispo;
          const dem = x.date ? ' · demandé le ' + x.date : '';
          const lec = (x.etat.permisN !== null) ? ' · ' + x.etat.permisN + ' leçon(s) à prévoir' : '';
          const u = libelleUrgence(x.urgence);
          return base + dem + lec + (x.urgence ? ' · ' + u.l : '');
        },
        alerte: x => (String(x.urgence) >= '4') ? 'Priorité élevée' : null,
        actions: (x, zone) => {
          const lab = document.createElement('label');
          lab.style.cssText = 'display:flex;align-items:center;gap:10px;text-transform:none;' +
            'font-size:15px;color:var(--cream);margin-bottom:10px;';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.style.cssText = 'width:19px;height:19px;';
          cb.checked = (suiviDe(x.eleve).aPlanifier === 'oui');
          cb.addEventListener('change', async () => {
            cb.disabled = true;
            try{
              await majSuivi(x.eleve, { aPlanifier: cb.checked ? 'oui' : '',
                                        retireAPrevoir: '' });
              afficherBureau();
            }catch(e){ showToast('Erreur : ' + e.message); cb.disabled = false; }
          });
          lab.appendChild(cb);
          lab.appendChild(document.createTextNode('Mettre dans la liste RDV PERMIS'));
          zone.appendChild(lab);

          const bRet = document.createElement('button');
          bRet.className = 'btn btn-secondary';
          bRet.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;margin-right:6px;' +
            'color:var(--red);border-color:var(--red);';
          bRet.textContent = '🗑️ Retirer de la liste';
          bRet.addEventListener('click', async () => {
            if(!await confirmer('Retirer ' + x.eleve + ' des examens à prévoir ?\n\n' +
                        'Il y reviendra si un moniteur le signale à nouveau.')) return;
            bRet.disabled = true;
            try{
              /* Les consignes en attente ne doivent plus le faire réapparaître */
              for(const cs of (x.enAttente || [])){
                try{ await appelPrep({ action:'consigneDone', id: cs.id }); }catch(e){}
              }
              await majSuivi(x.eleve, { retireAPrevoir: 'oui' });
              afficherBureau();
            }catch(e){ showToast('Erreur : ' + e.message); bRet.disabled = false; }
          });
          zone.appendChild(bRet);

          zone.appendChild(blocDispo(x));

          zone.appendChild(boutonDate('📅 Date de permis', async iso => {
            await envoyerConsigne(x.eleve, 'permis',
              'Examen du permis fixé au ' + dateEnToutesLettres(iso) + ' (bureau)');
            showToast('Date transmise ✅');
            afficherBureau();
          }));

          const sel = document.createElement('select');
          sel.style.cssText = 'margin-top:8px;margin-bottom:0;';
          URGENCES.forEach(u => {
            const o = document.createElement('option');
            o.value = u.v; o.textContent = u.l;
            sel.appendChild(o);
          });
          sel.value = x.urgence || '';
          sel.addEventListener('change', async () => {
            sel.disabled = true;
            try{
              await envoyerConsigne(x.eleve, 'urgence', '', sel.value);
              showToast('Priorité enregistrée ✅');
              await chargerBureau();
            }catch(e){ showToast('Erreur : ' + e.message); }
            sel.disabled = false;
          });
          zone.appendChild(sel);
        }
      }));
    });
  }
}


/* Message libre du bureau vers le moniteur, sans passer par un bilan */
async function envoyerMessageBureau(){
  const eleve = $('msgEleve').value.trim();
  const texte = $('msgTexte').value.trim();
  const etat = $('msgEtat');

  if(eleve.length < 2){ etat.style.color='var(--warn-text)'; etat.textContent="Saisis le nom de l'élève."; return; }
  if(!texte){ etat.style.color='var(--warn-text)'; etat.textContent='Saisis un message.'; return; }

  const btn = $('msgBtn');
  btn.disabled = true;
  btn.textContent = 'Envoi…';
  try{
    await envoyerConsigne(eleve, 'message', texte);
    etat.style.color = 'var(--accent-text)';
    etat.textContent = '✅ Message enregistré pour ' + eleve +
                       ' — il le verra au prochain cours.';
    $('msgTexte').value = '';
    await afficherConsignesEnAttente();
  }catch(e){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = 'Erreur : ' + e.message;
  }finally{
    btn.disabled = false;
    btn.textContent = '📨 Envoyer au moniteur';
  }
}

/* Messages déjà envoyés mais pas encore lus par un moniteur */
async function afficherConsignesEnAttente(){
  const zone = $('listeConsignes');
  if(!zone) return;
  try{
    const data = await appelPrep({ action: 'consigneList' });
    const liste = ((data && data.consignes) || [])
      .filter(x => x.traite !== 'oui' && x.type !== 'urgence');

    if($('nbConsignes')) $('nbConsignes').textContent = '(' + liste.length + ')';
    majCompteur('cptMessages', liste.length);
    if(!liste.length){
      zone.innerHTML = '<div class="empty">Aucun message en attente.</div>';
      return;
    }
    zone.innerHTML = '';
    liste.forEach(cs => {
      const row = document.createElement('div');
      row.className = 'history-item';
      const meta = document.createElement('div');
      meta.className = 'meta';
      const nom = document.createElement('strong');
      nom.textContent = cs.eleve;
      const t = document.createElement('span');
      t.style.cssText = 'color:var(--accent-text);white-space:pre-wrap;';
      t.textContent = '📨 ' + cs.texte;
      const d = document.createElement('span');
      d.textContent = 'Envoyé le ' + cs.creeLe + (cs.par ? ' par ' + cs.par : '');
      meta.appendChild(nom); meta.appendChild(t); meta.appendChild(d);
      row.appendChild(meta);

      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:auto;padding:9px 10px;font-size:13px;color:var(--red);border-color:var(--red);flex-shrink:0;';
      b.textContent = '✕';
      b.title = 'Annuler ce message';
      b.addEventListener('click', async () => {
        if(!await confirmer('Annuler ce message ?')) return;
        b.disabled = true;
        try{
          await appelPrep({ action: 'consigneDone', id: cs.id });
          afficherConsignesEnAttente();
        }catch(e){ showToast('Erreur : ' + e.message); b.disabled = false; }
      });
      row.appendChild(b);
      zone.appendChild(row);
    });
  }catch(e){
    zone.innerHTML = '<div class="empty">Erreur : ' + e.message + '</div>';
  }
}


/* Ajout manuel d'une date depuis le bureau, hors des listes */
async function ajouterDateBureau(){
  const eleve = $('addEleve').value.trim();
  const type = $('addType').value;
  const situation = $('addEtat').value;
  const iso = $('addDate').value;
  const nLecons = $('addLecons').value.trim();
  const etat = $('addEtatMsg');

  if(eleve.length < 2){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = "Saisis le nom de l'élève.";
    return;
  }
  if(situation === 'date' && !iso){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = 'Choisis une date ou passe en « à prévoir ».';
    return;
  }

  const suite = nLecons
    ? ' — encore ' + nLecons + ' leçon' + (parseInt(nLecons, 10) > 1 ? 's' : '')
    : '';

  let texte;
  if(situation === 'date'){
    const quand = dateEnToutesLettres(iso);
    if(type === 'permis') texte = 'Examen du permis fixé au ' + quand + suite + ' avant (bureau)';
    else if(type === 'examblanc') texte = 'Examen blanc fixé au ' + quand + suite + ' avant (bureau)';
    else texte = 'Simulateur nuit et risques fixé au ' + quand + ' (bureau)';
  }else{
    if(type === 'permis'){
      texte = "Date d'examen à prévoir" + (suite ? ' (' + suite.replace(' — ', '') + ')' : '') + ' (bureau)';
    }else if(type === 'examblanc'){
      texte = 'Examen blanc à prévoir' +
              (nLecons ? ' dans ' + nLecons + ' leçon' + (parseInt(nLecons,10) > 1 ? 's' : '') : '') +
              ' (bureau)';
    }else{
      texte = 'Simulateur nuit et risques à prévoir (bureau)';
    }
  }

  const btn = $('addBtn');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';
  try{
    await envoyerConsigne(eleve, type, texte);
    etat.style.color = 'var(--accent-text)';
    etat.textContent = '✅ ' + texte;
    $('addLecons').value = '';
    await afficherConsignesEnAttente();
    await afficherBureau();
  }catch(e){
    etat.style.color = 'var(--warn-text)';
    etat.textContent = 'Erreur : ' + e.message;
  }finally{
    btn.disabled = false;
    btn.textContent = '📅 Enregistrer la date';
  }
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-bureau.js'] = true;
