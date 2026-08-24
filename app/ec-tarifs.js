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
/* Chaque prestation porte son nom et son tarif dans les deux
   boîtes : le véhicule n'est pas le même, le libellé non plus. */
const TARIFS_DEFAUT = [
  { nom:'Cours théorie de la conduite 1h',            q:3,      pu:37,
    nomA:'Cours théorie de la conduite 1h',           puA:37 },
  { nom:'Simulateur avec moniteur 1h',                q:'simu', pu:45,
    nomA:'Simulateur BEA avec moniteur 1h',           puA:45 },
  { nom:'Conduite en Audi A3 Sportback 2h',           q:'c2h',  pu:118,
    nomA:'Conduite en Audi Q3 2h',                    puA:118 },
  { nom:'Conduite en Audi A3 Sportback 1h',           q:1,      pu:59,
    nomA:'Conduite en Audi Q3 1h',                    puA:59 },
  { nom:'Simulateur prévention des risques 1h',       q:1,      pu:45,
    nomA:'Simulateur prévention des risques 1h',      puA:45 },
  { nom:'Simulateur conduite de nuit 1h',             q:1,      pu:45,
    nomA:'Simulateur conduite de nuit 1h',            puA:45 },
  { nom:'Vérifications',                              q:1,      pu:24,
    nomA:'Vérifications',                             puA:24 },
  { nom:'Examen blanc pratique 1h30',                 q:1,      pu:88.5,
    nomA:'Examen blanc pratique 1h30',                puA:88.5 },
  { nom:'Écoute pédagogique 2h',                      q:150,    pu:0.2,
    nomA:'Écoute pédagogique 2h',                     puA:0.2 },
  { nom:'Écoute pédagogique 1h30 : Examen Blanc',     q:20,     pu:0,
    nomA:'Écoute pédagogique 1h30 : Examen Blanc',    puA:0 },
  { nom:'Formation constat Amiable',                  q:1,      pu:0,
    nomA:'Formation constat Amiable',                 puA:0 },
  { nom:'Formation entretien véhicule',               q:1,      pu:0,
    nomA:'Formation entretien véhicule',              puA:0 },
  { nom:"Accompagnement à l'examen du permis de conduire voiture", q:1, pu:59,
    nomA:"Accompagnement à l'examen du permis de conduire voiture", puA:59 },
  { nom:'Disque magnétique rétro-réfléchissant A',    q:1,      pu:5,
    nomA:'Disque magnétique rétro-réfléchissant A',   puA:5 },
  { nom:'Abonnement OBLIGATOIRE 1 an mail post permis', q:1,    pu:5,
    nomA:'Abonnement OBLIGATOIRE 1 an mail post permis', puA:5 },
  { nom:"Livret d'apprentissage OBLIGATOIRE",         q:1,      pu:10,
    nomA:"Livret d'apprentissage OBLIGATOIRE",        puA:10 },
  { nom:'1 accès OBLIGATOIRE compte en ligne formule pratique', q:1, pu:95,
    nomA:'1 accès OBLIGATOIRE compte en ligne formule pratique', puA:95 },
  { nom:'Test de vue / Conseil anti-stress / Rdv financement', q:1, pu:0,
    nomA:'Test de vue / Conseil anti-stress / Rdv financement', puA:0 },
  { nom:'30 minutes moniteur dans votre véhicule post permis', q:1, pu:0,
    nomA:'30 minutes moniteur dans votre véhicule post permis', puA:0 },
  { nom:'Carte SD',                                   q:1,      pu:15,
    nomA:'Carte SD',                                  puA:15 },
  { nom:'Accès salle des tablettes',                  q:1,      pu:0,
    nomA:'Accès salle des tablettes',                 puA:0 }
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
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;' +
    'min-width:520px;';
  table.innerHTML = '<thead><tr>' +
    '<th style="text-align:left;padding:7px 5px;font-size:11px;' +
      'color:var(--muted);">Prestation</th>' +
    '<th style="padding:7px 5px;font-size:11px;color:var(--muted);' +
      'width:56px;">Qté</th>' +
    '<th style="padding:7px 5px;font-size:11px;color:var(--accent-text);' +
      'width:78px;border-left:1px solid var(--line);">🚗 BV</th>' +
    '<th style="padding:7px 5px;font-size:11px;color:var(--accent-text);' +
      'width:78px;">🚙 BEA</th>' +
    '<th style="width:30px;"></th>' +
  '</tr></thead>';

  const corps = document.createElement('tbody');

  tarifsPrestations.forEach((l, i) => {
    const auto = (l.q === 'simu' || l.q === 'c2h');

    const tr = document.createElement('tr');
    tr.style.cssText = 'border-top:1px solid rgba(255,255,255,.06);';

    /* Le nom : deux libellés quand ils diffèrent, un seul sinon */
    const tdN = document.createElement('td');
    tdN.style.cssText = 'padding:6px 5px;line-height:1.4;' +
      (auto ? 'color:var(--accent-text);' : '');

    const iN = document.createElement('input');
    iN.type = 'text';
    iN.value = l.nom;
    iN.style.cssText = 'width:100%;padding:4px;font-size:12px;margin:0;' +
      'background:transparent;border:none;color:inherit;';
    iN.addEventListener('input', () => { tarifsPrestations[i].nom = iN.value; });
    tdN.appendChild(iN);

    /* Le libellé automatique, quand il n'est pas le même */
    if((l.nomA || l.nom) !== l.nom || auto){
      const iA = document.createElement('input');
      iA.type = 'text';
      iA.value = l.nomA || l.nom;
      iA.style.cssText = 'width:100%;padding:4px;font-size:11px;margin:0;' +
        'background:transparent;border:none;color:var(--muted);';
      iA.addEventListener('input', () => { tarifsPrestations[i].nomA = iA.value; });
      tdN.appendChild(iA);
    }
    tr.appendChild(tdN);

    /* La quantité : calculée pour deux lignes, saisie pour le reste */
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

    /* Les deux prix */
    const prix = (champ, bordure) => {
      const td = document.createElement('td');
      td.style.cssText = 'padding:6px 5px;' +
        (bordure ? 'border-left:1px solid var(--line);' : '');
      const ip = document.createElement('input');
      ip.type = 'number';
      ip.value = (l[champ] !== undefined) ? l[champ] : l.pu;
      ip.min = '0';
      ip.step = '0.01';
      ip.style.cssText = 'width:100%;padding:5px;font-size:13px;margin:0;' +
        'text-align:right;';
      ip.addEventListener('input', () => {
        tarifsPrestations[i][champ] = Number(ip.value) || 0;
        majApercuTarifs();
      });
      td.appendChild(ip);
      return td;
    };
    tr.appendChild(prix('pu', true));
    tr.appendChild(prix('puA', false));

    /* Retirer une prestation ajoutée à la main */
    const tdS = document.createElement('td');
    tdS.style.cssText = 'padding:6px 2px;text-align:center;';
    if(!auto){
      const bs = document.createElement('button');
      bs.className = 'btn btn-secondary';
      bs.style.cssText = 'width:auto;padding:4px 6px;font-size:11px;margin:0;' +
        'color:var(--red);border-color:transparent;background:transparent;';
      bs.textContent = '×';
      bs.title = 'Retirer cette prestation';
      bs.addEventListener('click', async () => {
        if(!await confirmer('Retirer « ' + l.nom + ' » ?\n\n' +
            'Rien n\'est enregistré tant que tu n\'appuies pas sur 💾.')) return;
        tarifsPrestations.splice(i, 1);
        afficherTarifs();
      });
      tdS.appendChild(bs);
    }
    tr.appendChild(tdS);

    corps.appendChild(tr);
  });

  table.appendChild(corps);
  t.appendChild(table);
  zone.appendChild(t);

  /* Ajouter une prestation : les tarifs évoluent */
  const bAdd = document.createElement('button');
  bAdd.className = 'btn btn-secondary';
  bAdd.style.cssText = 'margin-bottom:10px;padding:10px;font-size:12px;';
  bAdd.textContent = '➕ Ajouter une prestation';
  bAdd.addEventListener('click', async () => {
    const nom = await demander('Nom de la prestation', '', 'Nouvelle prestation');
    if(!nom || !nom.trim()) return;
    tarifsPrestations.push({ nom: nom.trim(), q: 1, pu: 0,
                             nomA: nom.trim(), puA: 0 });
    afficherTarifs();
    showToast('Ajoutée — n\'oublie pas d\'enregistrer');
  });
  zone.appendChild(bAdd);

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

  const ap = document.createElement('div');
  ap.id = 'tarifsApercu';
  ap.style.cssText = 'margin-top:12px;font-size:12px;color:var(--muted);' +
    'line-height:1.7;padding:10px 12px;border:1px solid var(--line);' +
    'border-radius:10px;';
  zone.appendChild(ap);
  majApercuTarifs();
}


/* Ce que donnerait un devis type, pour vérifier d'un coup d'œil.

   Vingt heures en manuelle et treize en automatique : le socle
   au-dessous duquel on ne descend pas. */
function majApercuTarifs(){
  const z = $('tarifsApercu');
  if(!z || !tarifsPrestations) return;

  const total = (heures, auto) => {
    /* La même mécanique que l'évaluation */
    const simu = auto ? ((heures <= 18) ? 2 : 3) : ((heures < 25) ? 3 : 4);
    const c2h = Math.ceil((heures - (3 + simu + 6)) / 2);

    return tarifsPrestations.reduce((s, l) => {
      const q = (l.q === 'simu') ? simu : (l.q === 'c2h') ? c2h : l.q;
      const pu = auto ? ((l.puA !== undefined) ? l.puA : l.pu) : l.pu;
      return s + (q * pu);
    }, 0);
  };

  const e = v => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') + ' €';

  z.innerHTML = '<strong style="color:var(--cream);">Pour vérifier</strong><br>' +
    '🚗 20 h en boîte manuelle : <strong style="color:var(--accent-text);">' +
      e(total(20, false)) + '</strong><br>' +
    '🚙 13 h en boîte automatique : <strong style="color:var(--accent-text);">' +
      e(total(13, true)) + '</strong>';
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-tarifs.js'] = true;
