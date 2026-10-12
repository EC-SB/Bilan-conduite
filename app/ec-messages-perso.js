/* Déployé le 04/09/2026 à 13:25 — v866 */
/* ============================================================
   ec-messages-perso.js
   Un message épinglé à une personne, pas à un élève.

   « Est-ce qu'on peut faire un endroit si on veut mettre un
   message en particulier à un utilisateur ? »

   Le 📨 Messages aux moniteurs qui existait déjà est attaché à un
   ÉLÈVE : il remonte au prochain cours de cet élève-là, dans la
   note du moniteur. Parfait pour « attention, il a changé de
   voiture » ; inutilisable pour « pense à rendre les clés du 208 ».

   Celui-ci est attaché à une PERSONNE, et s'affiche en tête de son
   bandeau du jour, quel que soit l'écran où elle travaille.

   ⚠️ C'EST LA SEULE LIGNE DU BANDEAU QUI VIENNE DU CLASSEUR.
   Tout le reste s'y déduit de données qui existent déjà. Un
   message, non : il faut bien que quelqu'un l'écrive. D'où une
   feuille, un appel réseau, et la seule occasion pour le bandeau
   de se tromper si le réseau manque — auquel cas il se tait.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let messagesPerso = null;

/* ------------------------------------------------------------
   ⏰ L'HEURE DE DÉBUT ET L'HEURE DE FIN — v1145

   David : « dans messages internes, mets l'heure d'affichage dans
   “à partir” et “jusqu'au”, afin que je mette des messages pendant
   une durée ».

   Le serveur rend les messages du JOUR ; c'est ici, à chaque
   dessin, que l'heure décide. Il ne pouvait pas le faire seul : le
   bandeau ne relit ses messages qu'au retour sur l'appli, et un
   message de 14 h à 16 h serait resté affiché jusqu'au prochain
   retour. Voir planifierLesMessages (ec-bandeau.js), qui redessine
   le bandeau à l'heure dite.

   Une heure sans date vaut pour sa date ; sans heure, la journée
   entière, comme avant.
   ------------------------------------------------------------ */
function minutesDeLHeureMsg(h){
  const m = String(h || '').match(/^(\d{1,2})\s*[:h]\s*(\d{2})/);
  return m ? (Number(m[1]) * 60 + Number(m[2])) : null;
}

/* Le début et la fin d'un message, en millisecondes (heure locale) */
function bornesDuMessage(m){
  const borne = (iso, h, fin) => {
    if(!iso) return null;
    const p = String(iso).split('-').map(Number);
    if(p.length !== 3 || p.some(isNaN)) return null;
    const mn = minutesDeLHeureMsg(h);
    const d = new Date(p[0], p[1] - 1, p[2], 0, 0, 0, 0);
    if(mn !== null) d.setMinutes(mn);
    else if(fin) d.setDate(d.getDate() + 1);     /* la journée entière */
    return d.getTime();
  };
  return { debut: borne(m && m.du, m && m.heureDu, false),
           fin:   borne(m && m.au, m && m.heureAu, true) };
}

function messageEpingleEnCours(m, maintenant){
  const t = maintenant || Date.now();
  const b = bornesDuMessage(m);
  if(b.debut !== null && t < b.debut) return false;
  if(b.fin !== null && t >= b.fin) return false;
  return true;
}

/* Le prochain moment où un message apparaît ou disparaît, dans les
   prochaines 24 h — null s'il n'y en a pas. */
function prochainChangementDesMessages(liste, maintenant){
  const t = maintenant || Date.now();
  let p = null;
  (liste || []).forEach(m => {
    const b = bornesDuMessage(m);
    [b.debut, b.fin].forEach(x => {
      if(x !== null && x > t && x - t < 86400000 && (p === null || x < p)) p = x;
    });
  });
  return p;
}

/* Ce qui m'est adressé, aujourd'hui. Le tri par destinataire et par
   date se fait DANS le classeur : une liste filtrée côté navigateur
   est une liste que tout le monde a reçue. */
async function chargerMessagesEpingles(){
  try{
    const d = await appelPrep({ action: 'msgBandeauList' });
    return (d && d.messages) || [];
  }catch(e){
    console.warn('Messages épinglés :', e);
    return [];
  }
}


/* ============================================================
   L'ÉCRAN DU BUREAU
   ============================================================ */
async function afficherMessagesPerso(recharger){
  const zone = $('msgPersoZone');
  if(!zone) return;

  if(recharger) messagesPerso = null;

  if(messagesPerso === null){
    zone.innerHTML = '<div class="empty">Lecture…</div>';
    try{
      /* « tous » : le bureau veut voir ce qu'il a écrit pour les
         autres, pas seulement ce qui lui est adressé. */
      const d = await appelPrep({ action: 'msgBandeauList', tous: true });
      messagesPerso = (d && d.messages) || [];
    }catch(e){
      zone.innerHTML = '<div class="empty">⚠️ ' +
        String(e.message || e).replace(/</g, '&lt;') + '</div>';
      return;
    }
  }

  zone.innerHTML = '';
  zone.appendChild(formulaireMessagePerso());

  if(!messagesPerso.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.style.marginTop = '12px';
    v.innerHTML = "Tu n'as épinglé aucun message.<br>" +
      '<span style="font-size:12px;">Ceux que tu écris ici s\'affichent en ' +
      'tête du bandeau de leurs destinataires. Chacun ne gère que les ' +
      'siens — les administratrices voient tout.</span>';
    zone.appendChild(v);
    return;
  }

  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);

  /* ⚠️ CHACUN NE VOIT QUE CE QU'IL A ÉCRIT — sauf les
     administratrices, qui voient tout. Le tri est fait par le
     CLASSEUR, pas ici : cette phrase ne fait que le dire. */
  const admin = (typeof ACCES !== 'undefined') && ACCES.role === 'admin';

  const t = document.createElement('div');
  t.style.cssText = 'margin-top:14px;font-size:13px;font-weight:700;';
  t.textContent = messagesPerso.length + ' message(s) épinglé(s)';
  zone.appendChild(t);

  const q = document.createElement('div');
  q.style.cssText = 'font-size:11px;color:var(--muted);line-height:1.5;' +
    'margin-bottom:2px;';
  q.textContent = admin
    ? "Tu vois ceux de tout le monde : c'est le privilège des administratrices."
    : "Tu ne vois que les tiens. Ceux qu'ont écrits les autres ne te " +
      'regardent pas, et les tiens ne les regardent pas non plus.';
  zone.appendChild(q);

  messagesPerso.forEach(m => zone.appendChild(ligneMessagePerso(m, auj)));
}

function ligneMessagePerso(m, auj){
  const d = document.createElement('div');
  /* À la minute près depuis la v1145 : un message de 14 h à 16 h
     est « terminé » à 16 h, pas le lendemain. */
  const maintenant = Date.now();
  const bornes = bornesDuMessage(m);
  const fini = bornes.fin !== null && maintenant >= bornes.fin;
  const pasCommence = bornes.debut !== null && maintenant < bornes.debut;

  d.style.cssText = 'border:1px solid var(--line);border-radius:10px;' +
    'padding:10px 12px;margin-top:8px;font-size:13px;line-height:1.6;' +
    (fini || pasCommence ? 'opacity:.55;' : '');

  const qui = (m.destinataires === 'tous' || !m.destinataires)
    ? '👥 tout le monde'
    : '👤 ' + m.destinataires.split('|').join(', ');

  const jour = iso => (typeof dateEnToutesLettres === 'function')
    ? dateEnToutesLettres(iso) : iso;

  d.innerHTML =
    '<div style="font-weight:700;word-break:break-word;">' +
      (m.important ? '⚠️ ' : '') + echapper(m.texte) + '</div>' +
    '<div style="font-size:12px;color:var(--muted);margin-top:3px;">' +
      echapper(qui) +
      (m.par ? ' · écrit par ' + echapper(m.par) : '') +
      (m.important ? '<br>⚠️ en gros cadre, refermable seulement par ' +
                     '« ✅ J’ai bien vu »' : '') +
      (m.du ? '<br>à partir du ' + echapper(jour(m.du)) +
              (m.heureDu ? ' à ' + echapper(m.heureDu) : '') : '') +
      (m.au ? (m.du ? ' · ' : '<br>') + "jusqu'au " + echapper(jour(m.au)) +
              (m.heureAu ? ' à ' + echapper(m.heureAu) : '') : '') +
      (m.relance ? '<br>🔁 relancé le ' + echapper(m.relance) : '') +
      (fini ? '<br>⏳ terminé' : pasCommence ? '<br>⏳ pas encore affiché' : '') +
    '</div>';

  /* ── QUI L'A VU, ET QUI RESTE ──

     David, le 4 septembre : le message disparaît chez celui qui
     dit l'avoir vu, « oui SI de notre côté on voit qui a mis j'ai
     vu ». C'est la contrepartie exacte de sa disparition — sans
     cette ligne, un message poussé s'évanouirait sans qu'on sache
     s'il a servi. */
  d.appendChild(blocLecturesDuMessage(m));

  const rangee = document.createElement('div');
  rangee.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;';

  /* ── 🔁 RELANCER ──

     « Bien évidemment. » Elle remet le gros cadre chez ceux qui
     n'ont pas encore répondu, et redemande l'accusé à ceux qui
     l'avaient donné : c'est le sens d'une relance. Rien n'est
     effacé — la lecture d'avant reste au classeur, elle ne compte
     simplement plus. */
  const bRel = document.createElement('button');
  bRel.className = 'btn btn-secondary';
  bRel.style.cssText = 'width:auto;margin:0;padding:5px 11px;font-size:12px;' +
    'border-radius:999px;';
  bRel.textContent = '🔁 Relancer';
  bRel.title = 'Le remettre en gros cadre, et redemander à tout le monde ' +
               'de dire qu’il l’a vu';
  bRel.addEventListener('click', async () => {
    if(!await confirmer(
        'Relancer ce message ?\n\n' + m.texte + '\n\n' +
        'Il repasse en ⚠️ gros cadre, et TOUT LE MONDE devra de nouveau ' +
        'dire qu’il l’a vu — y compris ceux qui l’avaient déjà fait.',
        'Relancer')) return;
    bRel.disabled = true;
    try{
      const r = await appelPrep({ action: 'msgBandeauRelance', id: m.id });
      if(r && r.status === 'error') throw new Error(r.message);
      showToast('🔁 Relancé');
      afficherMessagesPerso(true);
    }catch(e){
      showToast('Impossible : ' + (e.message || e));
      bRel.disabled = false;
    }
  });
  rangee.appendChild(bRel);

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;margin:0;padding:5px 11px;font-size:12px;' +
    'border-radius:999px;';
  b.textContent = '🗑️ Retirer';
  b.addEventListener('click', async () => {
    if(!await confirmer('Retirer définitivement ce message ?\n\n' + m.texte,
                        'Message épinglé', true)) return;
    b.disabled = true;
    try{
      const r = await appelPrep({ action: 'msgBandeauDelete', id: m.id });
      if(r && r.status === 'error') throw new Error(r.message);
      showToast('Retiré ✅');
      afficherMessagesPerso(true);
    }catch(e){
      showToast('Impossible : ' + (e.message || e));
      b.disabled = false;
    }
  });
  rangee.appendChild(b);
  d.appendChild(rangee);

  return d;
}

/* ============================================================
   LES DESTINATAIRES D'UN MESSAGE, ET CEUX QUI N'ONT PAS RÉPONDU

   ⚠️ « TOUT LE MONDE », C'EST TOUS LES COMPTES — David, le
   4 septembre. Pas seulement ceux qui donnent des cours : le
   relais rend les deux listes, et c'est la plus large qu'on prend
   ici. Une personne du bureau qui ne conduit pas doit quand même
   avoir vu le message.

   Sans la liste des comptes (elle arrive avec la connexion), on ne
   dit RIEN sur les manquants plutôt que d'annoncer « 3 sur 3 » en
   n'ayant compté que trois noms sur cinq.
   ============================================================ */
function destinatairesDuMessage(m){
  const dits = String((m && m.destinataires) || '').trim();
  if(dits && dits !== 'tous'){
    return dits.split('|').map(x => x.trim()).filter(Boolean);
  }
  const tous = (typeof comptesActifs !== 'undefined' && comptesActifs) || [];
  return tous.map(c => (typeof c === 'string') ? c : (c && c.nom) || '')
             .filter(Boolean);
}

function blocLecturesDuMessage(m){
  const z = document.createElement('div');
  z.style.cssText = 'font-size:12px;line-height:1.6;margin-top:6px;' +
    'padding-top:6px;border-top:1px solid var(--line);';

  const vus = (m && m.vus) || [];
  const attendus = destinatairesDuMessage(m);

  const aVu = nom => vus.some(v =>
    normaliserMot(v.qui || '') === normaliserMot(nom));
  const manquants = attendus.filter(n => !aVu(n));

  if(!vus.length && !attendus.length){
    z.style.color = 'var(--muted)';
    z.textContent = '👀 Personne ne l’a encore dit vu.';
    return z;
  }

  const tousVus = attendus.length && !manquants.length;
  const tete = document.createElement('div');
  tete.style.cssText = 'font-weight:700;color:' +
    (tousVus ? 'var(--accent-text)' : 'var(--cream)') + ';';
  tete.textContent = attendus.length
    ? (tousVus ? '✅ Vu par tout le monde (' + vus.length + ')'
               : '👀 Vu par ' + vus.length + ' / ' + attendus.length)
    : '👀 Vu par ' + vus.length;
  z.appendChild(tete);

  if(vus.length){
    const l = document.createElement('div');
    l.style.color = 'var(--muted)';
    l.textContent = vus.map(v => v.qui + (v.quand ? ' (' + v.quand + ')' : ''))
                       .join(' · ');
    z.appendChild(l);
  }

  /* Les manquants NOMMÉS : « 3 sur 5 » ne dit pas à qui aller
     parler. C'est pourtant la seule chose qu'on veut savoir. */
  if(manquants.length){
    const q = document.createElement('div');
    q.style.color = 'var(--warn-text)';
    q.textContent = '⏳ en attente : ' + manquants.join(', ');
    z.appendChild(q);
  }

  return z;
}

/* ------------------------------------------------------------
   LE FORMULAIRE

   Les destinataires se cochent : « possibilité de cocher plusieurs
   personnes ». « Tout le monde » est une case comme les autres,
   qui décoche les noms — sinon on enverrait deux fois le même
   message à la même personne, et il s'afficherait deux fois.
   ------------------------------------------------------------ */
function formulaireMessagePerso(){
  const f = document.createElement('div');
  f.style.cssText = 'border:1px solid var(--line);border-radius:12px;padding:12px;';

  const t = document.createElement('div');
  t.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent-text);' +
    'margin-bottom:2px;';
  t.textContent = '📌 Épingler un message';
  f.appendChild(t);

  const s = document.createElement('div');
  s.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;' +
    'line-height:1.45;';
  s.textContent = "S'affichera en tête de son bandeau, sur tous les écrans, " +
    "jusqu'à la date et l'heure de fin, ou jusqu'à ce que tu le retires.";
  f.appendChild(s);

  /* Les destinataires */
  const lab = document.createElement('label');
  lab.textContent = 'Pour qui';
  f.appendChild(lab);

  const cases = document.createElement('div');
  cases.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';

  const choisis = {};
  let pourTous = true;

  function pastille(cle, texte){
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.dataset.qui = cle;
    b.style.cssText = 'width:auto;flex:0 0 auto;margin:0;padding:6px 11px;' +
      'font-size:12px;border-radius:999px;white-space:nowrap;';
    b.textContent = texte;
    b.addEventListener('click', () => {
      if(cle === '*'){
        pourTous = true;
        Object.keys(choisis).forEach(k => delete choisis[k]);
      }else{
        pourTous = false;
        if(choisis[cle]) delete choisis[cle]; else choisis[cle] = true;
        /* Plus personne de coché : on revient à tout le monde plutôt
           que de laisser un message sans destinataire. */
        if(!Object.keys(choisis).length) pourTous = true;
      }
      peindre();
    });
    return b;
  }

  function peindre(){
    cases.querySelectorAll('button').forEach(b => {
      const actif = (b.dataset.qui === '*') ? pourTous : !!choisis[b.dataset.qui];
      b.style.background = actif ? 'var(--orange)' : '';
      b.style.color = actif ? 'var(--navy-deep)' : '';
      b.style.borderColor = actif ? 'var(--orange)' : '';
      b.style.fontWeight = actif ? '700' : '';
    });
  }

  cases.appendChild(pastille('*', '👥 Tout le monde'));
  /* La liste vient de « moniteursActifs », celle qui remplit déjà
     tous les menus « pour quel moniteur ». Une deuxième liste de
     noms serait une deuxième vérité sur qui travaille ici. */
  const gens = (typeof moniteursActifs !== 'undefined' && moniteursActifs) || [];
  gens.forEach(n => {
    const nom = (typeof n === 'string') ? n : (n && n.nom) || '';
    if(nom) cases.appendChild(pastille(nom, nom));
  });
  f.appendChild(cases);
  peindre();

  /* Le texte */
  const lt = document.createElement('label');
  lt.textContent = 'Le message';
  f.appendChild(lt);
  const txt = document.createElement('textarea');
  txt.rows = 2;
  txt.maxLength = 400;
  txt.placeholder = 'Pense à rendre les clés du 208 avant vendredi';
  txt.style.cssText = 'width:100%;';
  f.appendChild(txt);

  /* ── ⚠️ IMPORTANT : LE GROS CADRE ──

     David : « deux niveaux, avec la case ». Un message ordinaire
     reste une ligne du bandeau ; un message important prend le
     cadre du rappel de prise des places, et ne se referme QUE par
     « ✅ J'ai bien vu ». Si tout était important, plus rien ne le
     serait — c'est pourquoi c'est une case, et pas le défaut. */
  let important = false;
  const bImp = document.createElement('button');
  bImp.type = 'button';
  bImp.className = 'btn btn-secondary';
  bImp.style.cssText = 'width:auto;margin:8px 0 2px;padding:6px 12px;' +
    'font-size:12px;border-radius:999px;';
  const peindreImp = () => {
    bImp.textContent = (important ? '⚠️ Important' : '⬜ Message ordinaire');
    bImp.style.background = important ? 'var(--red)' : '';
    bImp.style.color = important ? 'var(--navy-deep)' : '';
    bImp.style.borderColor = important ? 'var(--red)' : '';
    bImp.style.fontWeight = important ? '700' : '';
  };
  bImp.title = 'Un message important s’affiche en gros cadre et ne peut se ' +
               'refermer qu’en disant qu’on l’a vu';
  bImp.addEventListener('click', () => { important = !important; peindreImp(); });
  peindreImp();
  f.appendChild(bImp);

  /* Les dates et les heures, facultatives — v1145. Une rangée par
     borne : la date et l'heure côte à côte, et sur un téléphone les
     deux tiennent sur la ligne. */
  const dl = document.createElement('div');
  const rangeeBorne = (titre, cDate, cHeure) =>
    '<label>' + titre + '</label>' +
    '<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">' +
      '<input type="date" class="' + cDate + '" style="margin:0;flex:1.4;min-width:0;">' +
      '<span style="font-size:13px;color:var(--muted);flex-shrink:0;">à</span>' +
      '<input type="time" class="' + cHeure + '" style="margin:0;flex:1;min-width:0;">' +
    '</div>';
  dl.innerHTML =
    rangeeBorne('À partir du (facultatif)', 'mpDu', 'mpHeureDu') +
    rangeeBorne('Jusqu\'au (facultatif)', 'mpAu', 'mpHeureAu');
  f.appendChild(dl);

  /* Une heure posée sans sa date vaut pour aujourd'hui : sinon elle
     ne voudrait rien dire, et partirait en silence. */
  const auj = (typeof todayLocal === 'function')
    ? todayLocal() : new Date().toISOString().slice(0, 10);
  [['mpHeureDu', 'mpDu'], ['mpHeureAu', 'mpAu']].forEach(([h, d]) => {
    dl.querySelector('.' + h).addEventListener('change', e => {
      const champ = dl.querySelector('.' + d);
      if(e.target.value && !champ.value) champ.value = auj;
    });
  });

  const etat = document.createElement('div');
  etat.style.cssText = 'font-size:12px;min-height:16px;margin-top:6px;';
  f.appendChild(etat);

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-top:8px;';
  b.textContent = '📌 Épingler';
  b.addEventListener('click', async () => {
    const texte = txt.value.trim();
    if(!texte){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Écris le message.';
      return;
    }
    const lu = c => dl.querySelector('.' + c).value;
    const essai = { du: lu('mpDu'), heureDu: lu('mpHeureDu'),
                    au: lu('mpAu'), heureAu: lu('mpHeureAu') };
    const bb = bornesDuMessage(essai);
    if(bb.debut !== null && bb.fin !== null && bb.fin <= bb.debut){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'La fin doit venir après le début.';
      return;
    }
    b.disabled = true;
    b.textContent = 'Envoi…';
    try{
      const r = await appelPrep({
        action: 'msgBandeauSet',
        destinataires: pourTous ? 'tous' : Object.keys(choisis).join('|'),
        texte: texte,
        important: important ? 'oui' : '',
        du: essai.du,
        au: essai.au,
        heureDu: essai.du ? essai.heureDu : '',
        heureAu: essai.au ? essai.heureAu : '',
        par: ACCES.moniteur || ''
      });
      if(r && r.status === 'error') throw new Error(r.message);
      showToast('📌 Épinglé');
      afficherMessagesPerso(true);
    }catch(e){
      etat.style.color = 'var(--warn-text)';
      etat.textContent = 'Impossible : ' + (e.message || e);
      b.disabled = false;
      b.textContent = '📌 Épingler';
    }
  });
  f.appendChild(b);

  return f;
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-messages-perso.js'] = true;
