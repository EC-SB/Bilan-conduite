/* ============================================================
   ec-places.js
   Réglage des mois, semaines et jours ouverts.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

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

/* Le numéro de semaine ISO : c'est ainsi que la préfecture
   et les plannings désignent les périodes. */
function numeroSemaine(iso){
  if(!iso) return 0;
  const d = new Date(iso + 'T12:00:00');
  if(isNaN(d)) return 0;
  /* Norme ISO 8601 : la semaine 1 est celle du premier jeudi */
  const j = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const jour = j.getUTCDay() || 7;
  j.setUTCDate(j.getUTCDate() + 4 - jour);
  const debutAn = new Date(Date.UTC(j.getUTCFullYear(), 0, 1));
  return Math.ceil(((j - debutAn) / 86400000 + 1) / 7);
}

/* « du mardi 1 au vendredi 4 septembre — S36 » */
function libelleSemaine(w){
  if(!w.du && !w.au) return 'Semaine à définir';
  const fmt = (iso, avecMois) => {
    if(!iso) return '?';
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', avecMois
      ? { weekday:'long', day:'numeric', month:'long' }
      : { weekday:'long', day:'numeric' });
  };

  /* Le numéro : celui du début, et celui de fin s'il diffère */
  const n1 = numeroSemaine(w.du);
  const n2 = numeroSemaine(w.au);
  const num = !n1 ? ''
    : (n2 && n2 !== n1) ? '  ·  S' + n1 + '–S' + n2
    : '  ·  S' + n1;

  return 'du ' + fmt(w.du, false) + ' au ' + fmt(w.au, true) + num;
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
    const st = stats.parMois[m.mois] ||
               { prevus:0, remplacements:0, fantomes:0, aDonner:0, centres:{} };
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
      '</div>' +
      /* La répartition par centre d'examen */
      (Object.keys(st.centres || {}).length
        ? '<div style="color:var(--muted);font-size:13px;">🏁 ' +
          Object.keys(st.centres).sort().map(function(x){
            return x + ' : <strong style="color:var(--cream);">' + st.centres[x] + '</strong>';
          }).join(' · ') + '</div>'
        : '');

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

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-places.js'] = true;
