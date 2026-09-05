/* Déployé le 05/09/2026 à 10:30 — v883 */
/* ============================================================
   ec-codeamenage.js
   Le code aménagé.

   Une session à la fois, des élèves inscrits, et cinq étapes
   jusqu'à la validation par la DDTM. Les données vivent dans le
   classeur de suivi, onglet « Code aménagé ».

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let elevesCodeam = [];
let sessionCodeam = '';


async function afficherCodeAmenage(){
  const zone = $('codeSousZone') || $('codeZone');
  if(!zone) return;

  zone.innerHTML = htmlAttente('Lecture des inscriptions…');

  try{
    const d = await appelPrep({ action: 'codeamList' });
    if(d && d.status === 'error') throw new Error(d.message);
    elevesCodeam = (d && d.eleves) || [];
    sessionCodeam = (d && d.session) || '';
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' +
      String(e.message || e).replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';
  dessinerCodeAmenage(zone);
}


/* ============================================================
   LE CODE AMÉNAGÉ

   Une session, des élèves, cinq étapes chacun jusqu'à
   l'inscription validée.
   ============================================================ */

const ETAPES_CODEAM = [
  { cle:'demande',     nom:'Demande envoyée' },
  { cle:'inscritDdtm', nom:'Inscription envoyée à la DDTM' },
  { cle:'redevance',   nom:'Redevance payée' },
  { cle:'valide',      nom:'Inscription validée' }
];


function dessinerCodeAmenage(zone){
  /* La session en cours, modifiable */
  const s = document.createElement('div');
  s.style.cssText = 'display:flex;gap:9px;align-items:center;' +
    'margin-bottom:12px;padding:10px 12px;border:1px solid var(--orange);' +
    'border-radius:11px;';
  s.innerHTML = '<span style="flex:1;min-width:0;font-size:14px;">' +
    '<strong>' + (sessionCodeam || 'Session non précisée').replace(/</g, '&lt;') +
    '</strong></span>';

  const bS = document.createElement('button');
  bS.className = 'btn btn-secondary';
  bS.style.cssText = 'width:auto;padding:8px 11px;font-size:12px;margin:0;';
  bS.textContent = '✏️';
  bS.title = 'Changer la session';
  bS.addEventListener('click', async () => {
    const v = await demander('Quelle session ?', sessionCodeam,
                             'Code aménagé');
    if(v === null) return;
    try{
      await appelPrep({ action: 'codeamSet', session: v });
      showToast('Session mise à jour ✅');
      afficherCodeAmenage();
    }catch(e){ showToast('Impossible : ' + e.message); }
  });
  s.appendChild(bS);
  zone.appendChild(s);

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'margin-bottom:10px;padding:12px;font-size:13px;';
  b.textContent = '➕ Ajouter un élève';
  b.addEventListener('click', () => ouvrirEleveCodeam(null));
  zone.appendChild(b);

  if(!elevesCodeam.length){
    zone.innerHTML += '<div class="empty">Aucun élève sur cette session.</div>';
    return;
  }

  /* Ce qui attend encore quelque chose */
  const enCours = elevesCodeam.filter(x => !x.valide).length;
  if(enCours){
    const t = document.createElement('div');
    t.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;';
    t.textContent = enCours + ' inscription(s) non validée(s) sur ' +
                    elevesCodeam.length;
    zone.appendChild(t);
  }

  elevesCodeam.forEach(e => zone.appendChild(ligneCodeam(e)));
}


function ligneCodeam(e){
  const d = document.createElement('details');
  d.style.cssText = 'border:1px solid ' +
    (e.valide ? 'var(--line)' : 'var(--orange)') +
    ';border-radius:11px;padding:10px 12px;margin-bottom:8px;';

  const faites = ETAPES_CODEAM.filter(x => e[x.cle]).length;

  const som = document.createElement('summary');
  som.style.cssText = 'cursor:pointer;font-size:15px;font-weight:700;' +
    'color:var(--cream);list-style:none;';
  som.innerHTML = (e.valide ? '✅ ' : '🎓 ') + e.eleve.replace(/</g, '&lt;') +
    '<div style="font-size:11px;font-weight:400;color:var(--muted);' +
      'margin-top:2px;">' + faites + '/' + ETAPES_CODEAM.length +
      ' étape(s)' +
      (e.souhaite ? ' · ' + e.souhaite.replace(/</g, '&lt;') : '') +
      (e.resultat ? ' · ' + e.resultat.replace(/</g, '&lt;') : '') +
    '</div>';
  d.appendChild(som);

  const corps = document.createElement('div');
  corps.style.marginTop = '10px';

  /* Souhaite-t-il faire la session ? */
  const lb = document.createElement('label');
  lb.textContent = 'Souhaite faire la session';
  corps.appendChild(lb);

  const sel = document.createElement('select');
  sel.innerHTML = ['', 'En attente de réponse', 'Oui', 'Non']
    .map(v => '<option value="' + v + '"' +
      (v === e.souhaite ? ' selected' : '') + '>' +
      (v || '—') + '</option>').join('');
  sel.addEventListener('change', async () => {
    try{
      await appelPrep({ action: 'codeamSet', ligne: e.ligne,
                        souhaite: sel.value });
      e.souhaite = sel.value;
      showToast('Enregistré ✅');
      afficherCodeAmenage();
    }catch(err){ showToast('Impossible : ' + err.message); }
  });
  corps.appendChild(sel);

  /* Les quatre étapes */
  const ze = document.createElement('div');
  ze.style.cssText = 'margin:10px 0;padding:9px 0;' +
    'border-top:1px solid rgba(255,255,255,.06);' +
    'border-bottom:1px solid rgba(255,255,255,.06);';

  ETAPES_CODEAM.forEach(et => {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;align-items:center;gap:10px;' +
      'text-transform:none;font-size:14px;color:var(--cream);margin:0 0 7px;' +
      'font-weight:400;';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!e[et.cle];
    cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin:0;';
    cb.addEventListener('change', async () => {
      cb.disabled = true;
      try{
        const envoi = { action: 'codeamSet', ligne: e.ligne };
        envoi[et.cle] = cb.checked;
        await appelPrep(envoi);
        e[et.cle] = cb.checked;
        showToast('Enregistré ✅');
        afficherCodeAmenage();
      }catch(err){
        cb.checked = !cb.checked;
        showToast('Impossible : ' + err.message);
      }
      cb.disabled = false;
    });
    l.appendChild(cb);

    const t = document.createElement('span');
    t.style.cssText = 'flex:1;min-width:0;';
    t.textContent = et.nom;
    l.appendChild(t);
    ze.appendChild(l);
  });
  corps.appendChild(ze);

  if(e.remarque){
    const r = document.createElement('div');
    r.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.5;' +
      'margin-bottom:9px;white-space:pre-wrap;';
    r.textContent = e.remarque;
    corps.appendChild(r);
  }

  const r2 = document.createElement('div');
  r2.style.cssText = 'display:flex;gap:8px;';

  const bM = document.createElement('button');
  bM.className = 'btn btn-secondary';
  bM.style.cssText = 'flex:1;padding:9px;font-size:12px;margin:0;';
  bM.textContent = '✏️ Résultat et remarque';
  bM.addEventListener('click', () => ouvrirEleveCodeam(e));
  r2.appendChild(bM);

  const bS = document.createElement('button');
  bS.className = 'btn btn-secondary';
  bS.style.cssText = 'width:auto;padding:9px 11px;font-size:12px;margin:0;' +
    'flex-shrink:0;color:var(--red);border-color:var(--red);';
  bS.textContent = '🗑️';
  bS.addEventListener('click', async () => {
    if(!await confirmer('Retirer ' + e.eleve + ' de la session ?')) return;
    try{
      await appelPrep({ action: 'codeamDelete', ligne: e.ligne });
      showToast('Retiré ✅');
      afficherCodeAmenage();
    }catch(err){ showToast('Impossible : ' + err.message); }
  });
  r2.appendChild(bS);

  corps.appendChild(r2);
  d.appendChild(corps);
  return d;
}


function ouvrirEleveCodeam(e){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.maxWidth = 'min(440px, 94vw)';

  boite.innerHTML = '<h3>' + (e ? '✏️ ' + e.eleve.replace(/</g, '&lt;')
                                : '➕ Ajouter un élève') + '</h3>' +
    (e ? '' :
      '<label for="caNom">Nom et prénom</label>' +
      '<input type="text" id="caNom" list="listeEleves" autocomplete="off">') +
    '<label for="caRes">Résultat</label>' +
    '<input type="text" id="caRes" placeholder="Ex : Réussi, Ajourné…">' +
    '<label for="caRem">Remarque</label>' +
    '<textarea id="caRem" rows="3" ' +
      'placeholder="Ce qui reste à faire, ce qui manque…"></textarea>';

  if(e){
    boite.querySelector('#caRes').value = e.resultat || '';
    boite.querySelector('#caRem').value = e.remarque || '';
  }

  const r = document.createElement('div');
  r.className = 'btn-row';

  const bA = document.createElement('button');
  bA.className = 'btn btn-secondary';
  bA.textContent = 'Annuler';
  bA.addEventListener('click', () => fermerFond(fond));
  r.appendChild(bA);

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.textContent = '💾 Enregistrer';
  bO.addEventListener('click', async () => {
    const envoi = { action: 'codeamSet', ligne: e ? e.ligne : 0 };

    if(!e){
      envoi.eleve = boite.querySelector('#caNom').value.trim();
      if(!envoi.eleve){ showToast('Indique le nom.'); return; }
    }
    envoi.resultat = boite.querySelector('#caRes').value.trim();
    envoi.remarque = boite.querySelector('#caRem').value;

    bO.disabled = true;
    try{
      await appelPrep(envoi);
      fermerFond(fond);
      showToast('Enregistré ✅');
      afficherCodeAmenage();
    }catch(err){
      showToast('Impossible : ' + err.message);
      bO.disabled = false;
    }
  });
  r.appendChild(bO);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  if(!e) setTimeout(() => boite.querySelector('#caNom').focus(), 100);
}




/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-codeamenage.js'] = true;
