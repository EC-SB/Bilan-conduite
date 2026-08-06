/* ============================================================
   ec-historique.js
   Historique des cours enregistrés et cours en cours.

   Deux besoins distincts : savoir ce qui a été fait, et savoir
   ce qui se fait en ce moment. Le second sert surtout au bureau,
   pour voir qui est en cours sans appeler les moniteurs.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let cacheHistorique = null;

/* ---------- Cours en cours d'enregistrement ---------- */

/* Le moniteur s'inscrit au démarrage. Un échec ne bloque rien :
   c'est une commodité, pas une étape du cours. */
async function signalerCoursDemarre(eleve, type, site){
  try{
    await appelPrep({ action: 'coursDemarre',
                      moniteur: ACCES.moniteur || '',
                      eleve: eleve || '', type: type || '', site: site || '',
                      appareil: (navigator.userAgent || '').slice(0, 40) });
  }catch(e){ console.warn('Cours démarré non signalé :', e); }
}

async function signalerCoursFini(){
  try{
    await appelPrep({ action: 'coursFini', moniteur: ACCES.moniteur || '' });
  }catch(e){ console.warn('Fin de cours non signalée :', e); }
}


/* ---------- L'écran ---------- */

async function afficherHistoriqueCours(){
  const zone = $('historiqueZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture des cours…</div>';

  let enCours = [], bilans = [];
  try{
    /* Les deux listes en parallèle : elles n'ont rien à s'attendre */
    const [a, b] = await Promise.all([
      appelPrep({ action: 'coursEnCours' }).catch(() => ({})),
      appelPrep({ action: 'bilansRecents', combien: 200 }).catch(() => ({}))
    ]);
    enCours = (a && a.cours) || [];
    bilans = (b && b.bilans) || [];
    cacheHistorique = { enCours: enCours, bilans: bilans, total: (b && b.total) || 0 };
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';

  /* --- Ce qui se fait en ce moment --- */
  const t1 = document.createElement('div');
  t1.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent-text);' +
    'margin-bottom:8px;';
  t1.textContent = '🎙️ Cours en cours — ' + enCours.length;
  zone.appendChild(t1);

  if(!enCours.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.style.cssText = 'padding:10px;font-size:12px;margin-bottom:16px;';
    v.textContent = 'Aucun cours en cours d\'enregistrement.';
    zone.appendChild(v);
  }else{
    enCours.forEach(c => {
      const d = document.createElement('div');
      d.style.cssText = 'border:1px solid var(--orange);border-radius:10px;' +
        'padding:9px 12px;margin-bottom:7px;background:rgba(182,255,14,.06);' +
        'display:flex;gap:8px;align-items:flex-start;';

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0;';
      info.innerHTML = '<strong style="font-size:14px;">' +
        (c.eleve || '(élève non saisi)').replace(/</g, '&lt;') + '</strong>' +
        '<div style="font-size:12px;color:var(--muted);margin-top:2px;line-height:1.5;">' +
        '👤 ' + (c.moniteur || '?').replace(/</g, '&lt;') +
        (c.type ? ' · ' + c.type.replace(/</g, '&lt;') : '') +
        (c.site ? ' · ' + c.site.replace(/</g, '&lt;') : '') +
        '<br>▶ démarré à ' + (c.depuis || '?') + '</div>';
      d.appendChild(info);

      /* Retirer une ligne restée là après un abandon */
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:auto;padding:6px 10px;font-size:12px;margin:0;' +
        'flex-shrink:0;color:var(--red);border-color:var(--red);';
      b.textContent = '✕ Retirer';
      b.title = 'Retirer de la liste — le bilan reste à enregistrer';
      b.addEventListener('click', async () => {
        if(!await confirmer('Retirer ce cours de la liste ?\n\n' +
            (c.moniteur || '?') + ' — ' + (c.eleve || 'élève non saisi') + '\n\n' +
            "Cela ne supprime aucun bilan : ça retire seulement la mention " +
            "« en cours ». Si le moniteur enregistre plus tard, son bilan " +
            'sera bien pris en compte.')) return;

        b.disabled = true;
        b.textContent = '…';
        try{
          await appelPrep({ action: 'coursRetirer',
                            moniteur: c.moniteur, eleve: c.eleve });
          showToast('Retiré de la liste ✅');
          afficherHistoriqueCours();
        }catch(e){
          showToast('Retrait impossible : ' + e.message);
          b.disabled = false;
          b.textContent = '✕ Retirer';
        }
      });
      d.appendChild(b);

      zone.appendChild(d);
    });

    const a = document.createElement('div');
    a.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:16px;line-height:1.4;';
    a.textContent = "Un cours reste affiché tant que son bilan n'est pas enregistré. " +
      'Un moniteur qui abandonne son enregistrement y figure encore.';
    zone.appendChild(a);
  }

  /* --- Ce qui a été enregistré --- */
  const t2 = document.createElement('div');
  t2.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent-text);' +
    'margin:14px 0 8px;';
  t2.textContent = '📚 Cours enregistrés';
  zone.appendChild(t2);

  const rech = document.createElement('input');
  rech.type = 'text';
  rech.placeholder = '🔍 Filtrer par élève, moniteur, type ou site';
  rech.style.marginBottom = '8px';
  zone.appendChild(rech);

  const duo = document.createElement('div');
  duo.className = 'duo';
  duo.innerHTML =
    '<div><label for="hMoniteur">Moniteur</label><select id="hMoniteur"></select></div>' +
    '<div><label for="hPeriode">Période</label><select id="hPeriode">' +
      '<option value="7">7 derniers jours</option>' +
      '<option value="30">30 derniers jours</option>' +
      '<option value="">Tout</option>' +
    '</select></div>';
  zone.appendChild(duo);

  const compte = document.createElement('div');
  compte.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px;';
  zone.appendChild(compte);

  const lst = document.createElement('div');
  lst.style.cssText = 'max-height:460px;overflow-y:auto;';
  zone.appendChild(lst);

  /* Les moniteurs présents dans la période lue */
  const mons = [];
  bilans.forEach(b => {
    const m = (b.moniteur || '').trim();
    if(m && mons.indexOf(m) === -1) mons.push(m);
  });
  mons.sort((a, b) => a.localeCompare(b, 'fr'));
  $('hMoniteur').innerHTML = '<option value="">Tous</option>' +
    mons.map(m => '<option value="' + m.replace(/"/g, '&quot;') + '">' + m + '</option>').join('');

  function dansPeriode(b, jours){
    if(!jours) return true;
    const iso = dateFrVersIso(b.date) || '';
    if(!iso) return true;
    const limite = new Date();
    limite.setDate(limite.getDate() - parseInt(jours, 10));
    return iso >= limite.toISOString().slice(0, 10);
  }

  function dessiner(){
    const q = normaliserMot(rech.value);
    const mon = $('hMoniteur').value;
    const per = $('hPeriode').value;

    const vus = bilans.filter(b =>
      (!mon || (b.moniteur || '').trim() === mon) &&
      dansPeriode(b, per) &&
      (!q || normaliserMot(b.eleve || '').indexOf(q) !== -1 ||
             normaliserMot(b.moniteur || '').indexOf(q) !== -1 ||
             normaliserMot(b.type || '').indexOf(q) !== -1 ||
             normaliserMot(b.site || '').indexOf(q) !== -1));

    compte.textContent = vus.length + ' cours affiché(s)' +
      (vus.length !== bilans.length ? ' sur ' + bilans.length + ' lus' : '') +
      (cacheHistorique.total > bilans.length
        ? ' · ' + cacheHistorique.total + ' au total dans le classeur' : '');

    lst.innerHTML = '';
    if(!vus.length){
      lst.innerHTML = '<div class="empty">Aucun cours ne correspond.</div>';
      return;
    }

    /* Regroupement par jour : c'est ainsi qu'on lit un historique */
    let jour = '';
    vus.forEach(b => {
      if(b.date !== jour){
        jour = b.date;
        const h = document.createElement('div');
        h.style.cssText = 'font-size:12px;font-weight:700;color:var(--accent-text);' +
          'margin:10px 0 5px;';
        h.textContent = '📅 ' + (dateEnToutesLettres(dateFrVersIso(jour)) || jour);
        lst.appendChild(h);
      }

      const d = document.createElement('div');
      d.style.cssText = 'border:1px solid var(--line);border-radius:9px;' +
        'padding:8px 11px;margin-bottom:5px;';
      d.innerHTML = '<strong style="font-size:14px;">' +
        (b.eleve || '?').replace(/</g, '&lt;') + '</strong>' +
        '<div style="font-size:12px;color:var(--muted);margin-top:2px;line-height:1.5;">' +
        '👤 ' + (b.moniteur || '?').replace(/</g, '&lt;') +
        (b.type ? ' · ' + b.type.replace(/</g, '&lt;') : '') +
        (b.site ? ' · ' + b.site.replace(/</g, '&lt;') : '') +
        (b.horodatage ? '<br>enregistré le ' + b.horodatage : '') +
        (b.note ? '<br>🔒 ' + b.note.replace(/</g, '&lt;').slice(0, 120) : '') +
        '</div>';
      lst.appendChild(d);
    });
  }

  [rech, $('hMoniteur'), $('hPeriode')].forEach(e => {
    if(!e) return;
    e.addEventListener('input', dessiner);
    e.addEventListener('change', dessiner);
  });
  dessiner();

  const bMaj = document.createElement('button');
  bMaj.className = 'btn btn-secondary';
  bMaj.style.cssText = 'margin-top:12px;padding:11px;font-size:13px;';
  bMaj.textContent = '🔄 Actualiser';
  bMaj.addEventListener('click', () => afficherHistoriqueCours());
  zone.appendChild(bMaj);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-historique.js'] = true;
