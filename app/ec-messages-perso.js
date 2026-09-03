/* Déployé le 03/09/2026 à 08:58 — v824 */
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
  const fini = m.au && m.au < auj;
  const pasCommence = m.du && m.du > auj;

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
      echapper(m.texte) + '</div>' +
    '<div style="font-size:12px;color:var(--muted);margin-top:3px;">' +
      echapper(qui) +
      (m.par ? ' · écrit par ' + echapper(m.par) : '') +
      (m.du ? '<br>à partir du ' + echapper(jour(m.du)) : '') +
      (m.au ? (m.du ? ' · ' : '<br>') + "jusqu'au " + echapper(jour(m.au)) : '') +
      (fini ? '<br>⏳ terminé' : pasCommence ? '<br>⏳ pas encore affiché' : '') +
    '</div>';

  const b = document.createElement('button');
  b.className = 'btn btn-secondary';
  b.style.cssText = 'width:auto;margin:8px 0 0;padding:5px 11px;font-size:12px;' +
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
  d.appendChild(b);

  return d;
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
    "jusqu'à la date de fin ou jusqu'à ce que tu le retires.";
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

  /* Les dates, facultatives */
  const dl = document.createElement('div');
  dl.style.cssText = 'display:flex;gap:8px;';
  dl.innerHTML =
    '<div style="flex:1;"><label>À partir du (facultatif)</label>' +
      '<input type="date" class="mpDu" style="margin:0;"></div>' +
    '<div style="flex:1;"><label>Jusqu\'au (facultatif)</label>' +
      '<input type="date" class="mpAu" style="margin:0;"></div>';
  f.appendChild(dl);

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
    b.disabled = true;
    b.textContent = 'Envoi…';
    try{
      const r = await appelPrep({
        action: 'msgBandeauSet',
        destinataires: pourTous ? 'tous' : Object.keys(choisis).join('|'),
        texte: texte,
        du: dl.querySelector('.mpDu').value,
        au: dl.querySelector('.mpAu').value,
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
