/* ============================================================
   ec-ecoutes.js
   Suivi des écoutes pédagogiques.

   Deux listes qui ne disent pas la même chose :
   — ceux qui ne réservent pas d'écoutes du tout ;
   — ceux qui réservent et ne viennent pas, ce qui bloque une
     place et pénalise les autres élèves.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Le message envoyé à un élève qui n'est pas venu. Texte fixe,
   fourni par l'auto-école, modifiable avant chaque envoi. */
const TEXTE_ABSENCE_ECOUTE =
  "Bonjour, tu avais réservé de l'écoute pédagogique !\n" +
  '\n' +
  "Tu n'es pas venu à l\u2019écoute pédagogique que tu as réservé tu prends la " +
  "place d'un autre élève qui aurai bien aimé venir en écoute 😡😡😡\n" +
  '\n' +
  'Un paiement de 5 euros TTC te sera facturé pour non présentation sans avoir ' +
  'prévenu. \n' +
  'https://m.facebook.com/groups/174715876519873/permalink/1205199580138159/';


let ecoutesSans = [];
let ecoutesAbsents = [];

async function afficherEcoutes(){
  const zone = $('ecoutesZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture des écoutes…</div>';
  try{
    /* Le répertoire en même temps : c'est lui qui porte les numéros,
       et l'attendre au moment d'enregistrer donnait l'impression
       d'un blocage. */
    const [d] = await Promise.all([
      appelPrep({ action: 'ecouteList' }),
      (typeof chargerFiches === 'function' &&
       (typeof fichesEleves === 'undefined' || !fichesEleves.length))
        ? chargerFiches().catch(() => []) : Promise.resolve()
    ]);
    ecoutesSans = (d && d.sans) || [];
    ecoutesAbsents = (d && d.absents) || [];
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  zone.innerHTML = '';

  /* ---- Signaler une absence ---- */
  const f = document.createElement('div');
  f.style.cssText = 'border:1px solid var(--orange);border-radius:12px;' +
    'padding:12px 14px;margin-bottom:18px;';
  f.innerHTML =
    '<div style="font-size:14px;font-weight:700;color:var(--accent-text);margin-bottom:4px;">' +
      '🚫 Signaler une absence en écoute</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.5;">' +
      "L'élève avait réservé et n'est pas venu. Indique le créneau qu'il a laissé " +
      'vide.</div>' +
    '<label for="ecEleve">Élève</label>' +
    '<input type="text" id="ecEleve" list="listeEleves" autocomplete="off" ' +
      'placeholder="Prénom et nom">' +
    /* Le numéro sous le nom : le moniteur voit tout de suite si le
       SMS pourra partir, sans attendre l'enregistrement. */
    '<div id="ecTel" style="font-size:12px;margin:-6px 0 10px;' +
      'min-height:17px;line-height:1.4;"></div>' +
    '<label for="ecDate">Date du rendez-vous manqué</label>' +
    '<input type="date" id="ecDate">' +

    /* Le SMS n'est pas automatique : le moniteur décide, et relit
       le texte avant de l'envoyer. */
    '<label style="display:flex;align-items:center;gap:10px;text-transform:none;' +
      'font-size:15px;color:var(--cream);margin:6px 0 8px;font-weight:400;">' +
      '<input type="checkbox" id="ecSms" style="width:19px;height:19px;">' +
      '📱 Le prévenir par SMS</label>' +
    '<div id="ecBlocSms" style="display:none;">' +
      '<textarea id="ecTexte" rows="10" ' +
        'style="width:100%;background:var(--navy);border:1px solid var(--line);' +
        'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:14px;' +
        'line-height:1.55;font-family:inherit;resize:vertical;margin-bottom:4px;"></textarea>' +
      '<div id="ecCompteur" style="font-size:11px;color:var(--muted);' +
        'margin-bottom:8px;"></div>' +
    '</div>';

  /* La date du jour par défaut : une absence se signale le jour même */
  const champDate = f.querySelector('#ecDate');
  if(champDate) champDate.value = todayLocal();

  /* Le numéro s'affiche dès que le nom est reconnu */
  const champNom = f.querySelector('#ecEleve');
  const zTel = f.querySelector('#ecTel');

  const majTelephone = () => {
    if(!zTel) return;
    const nom = champNom.value.trim();

    if(nom.split(' ').length < 2){
      zTel.innerHTML = '';
      return;
    }

    const fiche = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
    if(fiche && fiche.telephone){
      zTel.innerHTML = '<span style="color:var(--accent-text);">📱 ' +
        String(fiche.telephone).replace(/</g, '&lt;') + '</span>';
    }else if(fiche){
      zTel.innerHTML = '<span style="color:var(--warn-text);">' +
        '⚠️ Aucun numéro sur sa fiche — le SMS ne pourra pas partir</span>';
    }else{
      zTel.innerHTML = '<span style="color:var(--muted);">' +
        'Élève inconnu du répertoire</span>';
    }
  };

  if(champNom){
    champNom.addEventListener('input', majTelephone);
    champNom.addEventListener('change', majTelephone);
  }

  /* Le texte, modifiable avant envoi */
  const caseSms = f.querySelector('#ecSms');
  const blocSms = f.querySelector('#ecBlocSms');
  const champTexte = f.querySelector('#ecTexte');
  /* Signé du moniteur qui envoie : l'élève doit savoir à qui il a
     affaire, et le message n'arrive pas d'un expéditeur anonyme. */
  if(champTexte){
    champTexte.value = TEXTE_ABSENCE_ECOUTE +
      (ACCES.moniteur ? '\n\n' + ACCES.moniteur +
        (ACCES.emoji ? ' ' + ACCES.emoji : '') : '');
  }

  const majCompteurSms = () => {
    const cp = f.querySelector('#ecCompteur');
    if(!cp || !champTexte) return;
    const n = champTexte.value.length;
    const parts = (typeof decouperMessage === 'function')
      ? decouperMessage(champTexte.value, LIMITE_SMS).length
      : Math.ceil(n / 160);
    cp.style.color = (parts > 1) ? '#E8A33D' : 'var(--muted)';
    cp.textContent = n + ' caractères — ' + parts + ' SMS';
  };
  if(champTexte) champTexte.addEventListener('input', majCompteurSms);
  if(caseSms){
    caseSms.addEventListener('change', () => {
      blocSms.style.display = caseSms.checked ? 'block' : 'none';
      if(caseSms.checked) majCompteurSms();
    });
  }

  const bAbs = document.createElement('button');
  bAbs.className = 'btn btn-primary';
  bAbs.style.cssText = 'padding:12px;font-size:14px;';
  bAbs.textContent = '💾 Enregistrer l\'absence';
  bAbs.addEventListener('click', async () => {
    const nom = $('ecEleve').value.trim();
    const date = $('ecDate').value;
    if(nom.split(' ').length < 2){
      showToast("Prénom ET nom de l'élève.");
      return;
    }
    if(!date){ showToast('Indique la date du rendez-vous.'); return; }

    /* Le numéro d'abord : inutile d'enregistrer si le SMS demandé
       ne peut pas partir. */
    const fiche = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
    const tel = (fiche && fiche.telephone) || '';
    if(caseSms.checked && !tel){
      showToast("Pas de numéro sur sa fiche : le SMS ne peut pas partir.");
      return;
    }

    bAbs.disabled = true;
    bAbs.textContent = 'Enregistrement…';
    try{
      await appelPrep({ action: 'ecouteSet', type: 'absent', eleve: nom,
                        dateRdv: date, par: ACCES.moniteur || '' });

      if(caseSms.checked){
        bAbs.textContent = 'Envoi du SMS…';
        const n = await envoyerMessageComplet(tel, champTexte.value.trim(), nom);
        showToast('Absence enregistrée · ' + (n > 1 ? n + ' SMS envoyés' : 'SMS envoyé') + ' ✅');
      }else{
        showToast('Absence enregistrée ✅');
      }
      afficherEcoutes();
    }catch(e){
      /* L'absence est enregistrée même si le SMS échoue : c'est le
         suivi qui compte, le message peut se renvoyer. */
      showToast('Absence notée, mais SMS impossible : ' + e.message);
      bAbs.disabled = false;
      bAbs.textContent = '💾 Enregistrer l\'absence';
    }
  });
  f.appendChild(bAbs);
  zone.appendChild(f);

  /* ---- Ceux qui ne réservent pas d'écoutes ---- */
  const t1 = document.createElement('div');
  t1.style.cssText = 'font-size:15px;font-weight:700;color:var(--accent-text);margin-bottom:4px;';
  t1.textContent = '😱 Ne réserve pas d\'écoutes — ' + ecoutesSans.length;
  zone.appendChild(t1);

  const a1 = document.createElement('div');
  a1.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.5;';
  a1.textContent = "Signalés par les moniteurs au questionnaire. Ils restent listés " +
    "tant que la case l'est ; la date est celle du premier signalement.";
  zone.appendChild(a1);

  if(!ecoutesSans.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.style.cssText = 'padding:10px;font-size:12px;margin-bottom:18px;';
    v.textContent = 'Personne pour le moment.';
    zone.appendChild(v);
  }else{
    const l1 = document.createElement('div');
    l1.style.marginBottom = '18px';
    ecoutesSans
      .slice()
      .sort((a, b) => a.eleve.localeCompare(b.eleve, 'fr'))
      .forEach(x => l1.appendChild(ligneSansEcoute(x)));
    zone.appendChild(l1);
  }

  /* ---- Ceux qui ne sont pas venus ---- */
  const t2 = document.createElement('div');
  t2.style.cssText = 'font-size:15px;font-weight:700;color:var(--accent-text);margin-bottom:4px;';
  t2.textContent = '🚫 Pas venu en écoute — ' + ecoutesAbsents.length + ' absence(s)';
  zone.appendChild(t2);

  const a2 = document.createElement('div');
  a2.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.5;';
  a2.textContent = "Une place réservée et laissée vide, c'est un autre élève qui " +
    "n'a pas pu venir. Les récidivistes apparaissent en rouge.";
  zone.appendChild(a2);

  if(!ecoutesAbsents.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.style.cssText = 'padding:10px;font-size:12px;';
    v.textContent = 'Aucune absence signalée.';
    zone.appendChild(v);
    return;
  }

  /* Groupés par élève : le compteur est ce qui compte, pas la ligne */
  const parEleve = {};
  ecoutesAbsents.forEach(x => {
    const cle = normaliserMot(x.eleve);
    if(!parEleve[cle]) parEleve[cle] = { eleve: x.eleve, lignes: [] };
    parEleve[cle].lignes.push(x);
  });

  const l2 = document.createElement('div');
  Object.keys(parEleve)
    .map(k => parEleve[k])
    .sort((a, b) => b.lignes.length - a.lignes.length ||
                    a.eleve.localeCompare(b.eleve, 'fr'))
    .forEach(g => l2.appendChild(blocAbsences(g)));
  zone.appendChild(l2);
}


/* Un élève qui ne réserve pas d'écoutes */
function ligneSansEcoute(x){
  const d = document.createElement('div');
  d.style.cssText = 'display:flex;gap:8px;align-items:center;border:1px solid var(--line);' +
    'border-radius:10px;padding:9px 12px;margin-bottom:5px;';

  const t = document.createElement('div');
  t.style.cssText = 'flex:1;min-width:0;font-size:14px;line-height:1.5;';
  t.innerHTML = '<strong>' + x.eleve.replace(/</g, '&lt;') + '</strong>' +
    '<div style="font-size:11px;color:var(--muted);">signalé le ' + x.signale +
    (x.par ? ' par ' + x.par.replace(/</g, '&lt;') : '') + '</div>';
  d.appendChild(t);

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;padding:6px 10px;font-size:12px;margin:0;flex-shrink:0;';
  b.textContent = '✓ Il réserve';
  b.title = 'Le retirer de la liste';
  b.addEventListener('click', async () => {
    if(!await confirmer('Retirer ' + x.eleve + ' de la liste ?\n\n' +
        'À faire quand il se remet à réserver des écoutes.')) return;
    b.disabled = true;
    try{
      await appelPrep({ action: 'ecouteDelete', id: x.id });
      showToast('Retiré ✅');
      afficherEcoutes();
    }catch(e){ showToast('Impossible : ' + e.message); b.disabled = false; }
  });
  d.appendChild(b);

  return d;
}


/* Un élève et toutes ses absences */
function blocAbsences(g){
  const n = g.lignes.length;
  const grave = n >= 3;

  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid ' + (grave ? 'var(--red)' : 'var(--line)') +
    ';border-radius:10px;padding:10px 12px;margin-bottom:8px;';

  const h = document.createElement('div');
  h.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:6px;color:' +
    (grave ? 'var(--red)' : 'var(--cream)') + ';';
  h.textContent = g.eleve + '  ·  ' + n + ' absence' + (n > 1 ? 's' : '');
  d.appendChild(h);

  g.lignes
    .slice()
    .sort((a, b) => String(b.dateRdv).localeCompare(String(a.dateRdv)))
    .forEach(x => {
      const l = document.createElement('div');
      l.style.cssText = 'display:flex;gap:8px;align-items:center;' +
        'font-size:13px;color:var(--muted);padding:3px 0;';

      const t = document.createElement('div');
      t.style.cssText = 'flex:1;min-width:0;';
      t.textContent = '· ' + (dateEnToutesLettres(x.dateRdv) || x.dateRdv) +
        (x.heureRdv ? ' à ' + x.heureRdv : '') +
        (x.par ? '  — signalé par ' + x.par : '');
      l.appendChild(t);

      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'width:auto;padding:4px 8px;font-size:11px;margin:0;flex-shrink:0;';
      b.textContent = '🗑️';
      b.title = 'Supprimer cette absence';
      b.addEventListener('click', async () => {
        if(!await confirmer('Supprimer cette absence du ' +
            (dateEnToutesLettres(x.dateRdv) || x.dateRdv) + ' ?')) return;
        b.disabled = true;
        try{
          await appelPrep({ action: 'ecouteDelete', id: x.id });
          showToast('Supprimée ✅');
          afficherEcoutes();
        }catch(e){ showToast('Impossible : ' + e.message); b.disabled = false; }
      });
      l.appendChild(b);

      d.appendChild(l);
    });

  return d;
}


/* Le questionnaire signale l'élève quand la case est cochée, et le
   retire quand elle ne l'est plus. Sans ça, la liste dépendrait
   d'une saisie au bureau que personne ne ferait. */
async function majEcouteDepuisQuestionnaire(eleve, pasEcoute){
  if(!eleve || eleve.split(' ').length < 2) return;
  try{
    if(pasEcoute){
      await appelPrep({ action: 'ecouteSet', type: 'sans', eleve: eleve,
                        par: ACCES.moniteur || '' });
    }else{
      await appelPrep({ action: 'ecouteDelete', eleve: eleve });
    }
  }catch(e){ console.warn('Suivi des écoutes :', e); }
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-ecoutes.js'] = true;
