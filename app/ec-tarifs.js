/* ============================================================
   ec-tarifs.js
   Les prestations et leurs tarifs.

   Le devis d'évaluation se calcule à partir d'ici. Quand un
   tarif change, il suffit de le corriger une fois : tous les
   devis suivants en tiennent compte.

   Deux quantités ne se saisissent pas — le simulateur et la
   conduite de deux heures : elles viennent de l'évaluation.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Ce que l'application propose tant que rien n'a été réglé.
   Reprend le classeur au moment où il a été lu. */
const TARIFS_DEFAUT = [
  { nom:'Cours théorie de la conduite 1h',            q:3,      pu:37 },
  { nom:'Simulateur avec moniteur 1h',                q:'simu', pu:45 },
  { nom:'Conduite en Audi A3 Sportback 2h',           q:'c2h',  pu:118 },
  { nom:'Conduite en Audi A3 Sportback 1h',           q:1,      pu:59 },
  { nom:'Simulateur prévention des risques 1h',       q:1,      pu:45 },
  { nom:'Simulateur conduite de nuit 1h',             q:1,      pu:45 },
  { nom:'Vérifications',                              q:1,      pu:24 },
  { nom:'Examen blanc pratique 1h30',                 q:1,      pu:88.5 },
  { nom:'Écoute pédagogique 2h',                      q:150,    pu:0.2 },
  { nom:'Écoute pédagogique 1h30 : Examen Blanc',     q:20,     pu:0 },
  { nom:'Formation constat Amiable',                  q:1,      pu:0 },
  { nom:'Formation entretien véhicule',               q:1,      pu:0 },
  { nom:"Accompagnement à l'examen du permis de conduire voiture", q:1, pu:59 },
  { nom:'Disque magnétique rétro-réfléchissant A',    q:1,      pu:5 },
  { nom:'Abonnement OBLIGATOIRE 1 an mail post permis', q:1,    pu:5 },
  { nom:"Livret d'apprentissage OBLIGATOIRE",         q:1,      pu:10 },
  { nom:'1 accès OBLIGATOIRE compte en ligne formule pratique', q:1, pu:95 },
  { nom:'Test de vue / Conseil anti-stress / Rdv financement', q:1, pu:0 },
  { nom:'30 minutes moniteur dans votre véhicule post permis', q:1, pu:0 },
  { nom:'Carte SD',                                   q:1,      pu:15 },
  { nom:'Accès salle des tablettes',                  q:1,      pu:0 }
];

let tarifsPrestations = null;


/* La liste en vigueur. L'évaluation l'appelle avant de calculer. */
async function chargerTarifs(){
  if(tarifsPrestations !== null) return tarifsPrestations;

  try{
    const d = await appelPrep({ action: 'reglagesList' });
    const g = (d && d.reglages) || {};
    if(g.tarifsPrestations){
      const l = JSON.parse(g.tarifsPrestations);
      if(Array.isArray(l) && l.length) tarifsPrestations = l;
    }
  }catch(e){ /* on garde les tarifs d'origine */ }

  if(tarifsPrestations === null){
    /* Une copie : la liste d'origine ne doit pas être modifiée */
    tarifsPrestations = TARIFS_DEFAUT.map(x => Object.assign({}, x));
  }
  return tarifsPrestations;
}


async function afficherTarifs(){
  const zone = $('tarifsZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture des tarifs…</div>';
  await chargerTarifs();
  zone.innerHTML = '';

  const aide = document.createElement('div');
  aide.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:12px;' +
    'line-height:1.6;';
  aide.innerHTML = 'Le devis de l\'évaluation se calcule à partir de cette ' +
    'liste.<br>Les deux lignes en couleur ont une quantité qui vient de ' +
    'l\'évaluation : seul leur tarif se modifie.';
  zone.appendChild(aide);

  const t = document.createElement('div');
  t.style.cssText = 'overflow-x:auto;margin-bottom:12px;';

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
  table.innerHTML = '<thead><tr>' +
    '<th style="text-align:left;padding:7px 5px;font-size:11px;' +
      'color:var(--muted);">Prestation</th>' +
    '<th style="padding:7px 5px;font-size:11px;color:var(--muted);' +
      'width:62px;">Qté</th>' +
    '<th style="padding:7px 5px;font-size:11px;color:var(--muted);' +
      'width:86px;">Prix</th>' +
  '</tr></thead>';

  const corps = document.createElement('tbody');

  tarifsPrestations.forEach((l, i) => {
    const auto = (l.q === 'simu' || l.q === 'c2h');

    const tr = document.createElement('tr');
    tr.style.cssText = 'border-top:1px solid rgba(255,255,255,.06);';

    const tdN = document.createElement('td');
    tdN.style.cssText = 'padding:6px 5px;line-height:1.4;' +
      (auto ? 'color:var(--accent-text);' : '');
    tdN.textContent = l.nom;
    tr.appendChild(tdN);

    const tdQ = document.createElement('td');
    tdQ.style.cssText = 'padding:6px 5px;text-align:center;';
    if(auto){
      tdQ.innerHTML = '<span style="font-size:11px;color:var(--accent-text);">' +
        (l.q === 'simu' ? 'simu' : 'calc.') + '</span>';
    }else{
      const iq = document.createElement('input');
      iq.type = 'number';
      iq.value = l.q;
      iq.min = '0';
      iq.step = '1';
      iq.style.cssText = 'width:100%;padding:5px;font-size:13px;margin:0;' +
        'text-align:center;';
      iq.addEventListener('input', () => {
        tarifsPrestations[i].q = Number(iq.value) || 0;
      });
      tdQ.appendChild(iq);
    }
    tr.appendChild(tdQ);

    const tdP = document.createElement('td');
    tdP.style.cssText = 'padding:6px 5px;';
    const ip = document.createElement('input');
    ip.type = 'number';
    ip.value = l.pu;
    ip.min = '0';
    ip.step = '0.01';
    ip.style.cssText = 'width:100%;padding:5px;font-size:13px;margin:0;' +
      'text-align:right;';
    ip.addEventListener('input', () => {
      tarifsPrestations[i].pu = Number(ip.value) || 0;
    });
    tdP.appendChild(ip);
    tr.appendChild(tdP);

    corps.appendChild(tr);
  });

  table.appendChild(corps);
  t.appendChild(table);
  zone.appendChild(t);

  const r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;';

  const bO = document.createElement('button');
  bO.className = 'btn btn-primary';
  bO.style.cssText = 'flex:1;padding:12px;font-size:13px;margin:0;';
  bO.textContent = '💾 Enregistrer';
  bO.addEventListener('click', async () => {
    bO.disabled = true;
    try{
      await appelPrep({
        action: 'reglageSet', cle: 'tarifsPrestations',
        valeur: JSON.stringify(tarifsPrestations),
        par: ACCES.moniteur || ''
      });
      showToast('Tarifs enregistrés ✅');
    }catch(e){
      showToast('Impossible : ' + e.message);
    }
    bO.disabled = false;
  });
  r.appendChild(bO);

  /* Revenir aux tarifs d'origine : utile après une fausse
     manœuvre, et sans conséquence tant qu'on n'enregistre pas. */
  const bR = document.createElement('button');
  bR.className = 'btn btn-secondary';
  bR.style.cssText = 'width:auto;padding:12px 14px;font-size:12px;margin:0;';
  bR.textContent = '↩️';
  bR.title = 'Revenir aux tarifs d\'origine';
  bR.addEventListener('click', async () => {
    if(!await confirmer('Revenir aux tarifs d\'origine ?\n\n' +
        'Rien n\'est enregistré tant que tu n\'appuies pas sur 💾.')) return;
    tarifsPrestations = TARIFS_DEFAUT.map(x => Object.assign({}, x));
    afficherTarifs();
  });
  r.appendChild(bR);

  zone.appendChild(r);

  /* Ce que donnerait un devis, pour vérifier d'un coup d'œil */
  const ap = document.createElement('div');
  ap.style.cssText = 'margin-top:12px;font-size:12px;color:var(--muted);' +
    'line-height:1.6;padding:10px 12px;border:1px solid var(--line);' +
    'border-radius:10px;';

  const exemple = tarifsPrestations.reduce((s, l) => {
    const q = (l.q === 'simu') ? 4 : (l.q === 'c2h') ? 10 : l.q;
    return s + (q * l.pu);
  }, 0);

  ap.innerHTML = '<strong style="color:var(--cream);">Pour vérifier</strong><br>' +
    'Une évaluation à 32 h en boîte manuelle donnerait ' +
    '<strong style="color:var(--accent-text);">' +
    (Math.round(exemple * 100) / 100).toFixed(2).replace('.', ',') +
    ' €</strong>.';
  zone.appendChild(ap);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-tarifs.js'] = true;
