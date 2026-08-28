/* ============================================================
   ec-taches.js
   Les tâches du bureau : qui fait quoi, avec quelle urgence.

   Une tâche terminée est supprimée, pas archivée. Une liste qui
   s'allonge indéfiniment n'est plus lue, et le but est qu'elle
   reste utile au quotidien.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

let taches = [];

const PRIORITES = [
  { cle: 'urgente', nom: '🔴 Urgente',  couleur: 'var(--red)' },
  { cle: 'haute',   nom: '🟠 Haute',    couleur: '#E8A33D' },
  { cle: 'normale', nom: '🟢 Normale',  couleur: 'var(--accent-text)' },
  { cle: 'basse',   nom: '⚪ Quand tu peux', couleur: 'var(--muted)' }
];

const STATUTS = [
  { cle: 'afaire',  nom: '📋 À faire' },
  { cle: 'encours', nom: '⏳ En cours' },
  { cle: 'attente', nom: '⏸️ En attente' }
];

function nomPriorite(cle){
  const p = PRIORITES.find(x => x.cle === cle);
  return p ? p.nom : '🟢 Normale';
}
function couleurPriorite(cle){
  const p = PRIORITES.find(x => x.cle === cle);
  return p ? p.couleur : 'var(--accent-text)';
}
function nomStatut(cle){
  const s = STATUTS.find(x => x.cle === cle);
  return s ? s.nom : '📋 À faire';
}


/* ============================================================
   L'ÉCRAN
   ============================================================ */

async function afficherTaches(){
  const zone = $('tachesZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Lecture des tâches…</div>';
  try{
    const d = await appelPrep({ action: 'tacheList' });
    taches = (d && d.taches) || [];
  }catch(e){
    zone.innerHTML = '<div class="empty">⚠️ ' + e.message.replace(/</g, '&lt;') + '</div>';
    return;
  }

  /* Les moniteurs, pour l'attribution */
  try{
    if(typeof chargerMoniteurs === 'function' &&
       (typeof moniteursActifs === 'undefined' || !moniteursActifs.length)){
      await chargerMoniteurs();
    }
  }catch(e){ /* la liste restera vide */ }

  /* Le compte sur le sous-onglet : visible sans ouvrir la vue */
  if(typeof poserCompteVue === 'function'){
    poserCompteVue('taches', taches.length);
  }

  zone.innerHTML = '';

  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-bottom:14px;padding:13px;font-size:14px;';
  b.textContent = '➕ Nouvelle tâche';
  b.addEventListener('click', () => ouvrirEditeurTache(null));
  zone.appendChild(b);

  if(!taches.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Aucune tâche en cours. Tout est fait 🎉';
    zone.appendChild(v);
    return;
  }

  /* Filtre par personne : chacun veut voir les siennes */
  const gens = [];
  taches.forEach(t => {
    const p = (t.pour || '').trim();
    if(p && gens.indexOf(p) === -1) gens.push(p);
  });
  gens.sort((a, b2) => a.localeCompare(b2, 'fr'));

  const filtre = document.createElement('select');
  filtre.style.marginBottom = '12px';
  filtre.innerHTML = '<option value="">Toutes les personnes</option>' +
    '<option value="__moi">Mes tâches</option>' +
    gens.map(g => '<option value="' + g.replace(/"/g, '&quot;') + '">' + g + '</option>').join('');
  zone.appendChild(filtre);

  const compte = document.createElement('div');
  compte.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;';
  zone.appendChild(compte);

  const liste = document.createElement('div');
  zone.appendChild(liste);

  /* Ordre : urgence d'abord, puis les plus anciennes */
  const rang = { urgente: 0, haute: 1, normale: 2, basse: 3 };

  function dessiner(){
    const f = filtre.value;
    const vues = taches.filter(t => {
      if(!f) return true;
      if(f === '__moi') return normaliserMot(t.pour || '') === normaliserMot(ACCES.moniteur || '');
      return (t.pour || '').trim() === f;
    }).sort((a, b2) => {
      const d1 = (rang[a.priorite] === undefined ? 2 : rang[a.priorite]);
      const d2 = (rang[b2.priorite] === undefined ? 2 : rang[b2.priorite]);
      if(d1 !== d2) return d1 - d2;
      return String(a.creee).localeCompare(String(b2.creee));
    });

    compte.textContent = vues.length + ' tâche(s)' +
      (vues.length !== taches.length ? ' sur ' + taches.length : '');

    liste.innerHTML = '';
    if(!vues.length){
      liste.innerHTML = '<div class="empty">Aucune tâche pour ce filtre.</div>';
      return;
    }
    vues.forEach(t => liste.appendChild(ligneTache(t)));
  }

  filtre.addEventListener('change', dessiner);
  dessiner();
}


/* Une tâche : son titre, son état, ses boutons */
function ligneTache(t){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-left:4px solid ' +
    couleurPriorite(t.priorite) + ';border-radius:10px;padding:10px 12px;margin-bottom:8px;';

  const h = document.createElement('div');
  h.style.cssText = 'display:flex;gap:8px;align-items:flex-start;';

  const txt = document.createElement('div');
  txt.style.cssText = 'flex:1;min-width:0;';
  txt.innerHTML = '<strong style="font-size:15px;">' +
    (t.titre || '(sans titre)').replace(/</g, '&lt;') + '</strong>' +
    '<div style="font-size:12px;color:var(--muted);margin-top:3px;line-height:1.5;">' +
      nomStatut(t.statut) + ' · ' + nomPriorite(t.priorite) +
      (t.pour ? ' · 👤 ' + t.pour.replace(/</g, '&lt;') : ' · 👤 non attribuée') +
      (t.echeance ? ' · 📅 ' + (dateEnToutesLettres(t.echeance) || t.echeance) : '') +
      '<br>créée le ' + t.creee + (t.par ? ' par ' + t.par.replace(/</g, '&lt;') : '') +
    '</div>' +
    (t.detail
      ? '<div style="font-size:13px;line-height:1.5;margin-top:6px;white-space:pre-wrap;">' +
        t.detail.replace(/</g, '&lt;') + '</div>'
      : '');
  h.appendChild(txt);
  d.appendChild(h);

  /* La capture, chargée seulement si on la demande */
  if(t.aImage){
    const bImg = document.createElement('button');
    bImg.className = 'btn btn-secondary';
    bImg.style.cssText = 'margin-top:8px;padding:8px 11px;font-size:12px;width:auto;';
    bImg.textContent = '🖼️ Voir la capture';
    bImg.addEventListener('click', async () => {
      bImg.disabled = true;
      bImg.textContent = 'Chargement…';
      try{
        const r = await appelPrep({ action: 'tacheImage', id: t.id });
        const src = (r && r.image) || '';
        if(!src){ showToast('Capture introuvable'); bImg.disabled = false;
                  bImg.textContent = '🖼️ Voir la capture'; return; }
        const img = document.createElement('img');
        img.src = src;
        img.style.cssText = 'max-width:100%;border-radius:10px;margin-top:8px;' +
          'border:1px solid var(--line);';
        bImg.replaceWith(img);
      }catch(e){
        showToast('Impossible : ' + e.message);
        bImg.disabled = false;
        bImg.textContent = '🖼️ Voir la capture';
      }
    });
    d.appendChild(bImg);
  }

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;';

  /* Avancer d'un état : à faire → en cours → en attente */
  const bEtat = document.createElement('button');
  bEtat.className = 'btn btn-secondary';
  bEtat.style.cssText = 'width:auto;padding:7px 11px;font-size:12px;margin:0;';
  bEtat.textContent = (t.statut === 'encours') ? '⏸️ Mettre en attente'
                    : (t.statut === 'attente') ? '📋 Remettre à faire'
                    : '⏳ Je m\'en occupe';
  bEtat.addEventListener('click', async () => {
    const suite = (t.statut === 'encours') ? 'attente'
                : (t.statut === 'attente') ? 'afaire' : 'encours';
    bEtat.disabled = true;
    try{
      await appelPrep({ action: 'tacheSet', id: t.id, titre: t.titre,
                        detail: t.detail, pour: t.pour, priorite: t.priorite,
                        echeance: t.echeance, statut: suite,
                        par: ACCES.moniteur || '' });
      afficherTaches();
    }catch(e){ showToast('Impossible : ' + e.message); bEtat.disabled = false; }
  });
  actions.appendChild(bEtat);

  const bMod = document.createElement('button');
  bMod.className = 'btn btn-secondary';
  bMod.style.cssText = 'width:auto;padding:7px 11px;font-size:12px;margin:0;';
  bMod.textContent = '✏️ Modifier';
  bMod.addEventListener('click', () => ouvrirEditeurTache(t));
  actions.appendChild(bMod);

  const bFait = document.createElement('button');
  bFait.className = 'btn btn-secondary';
  bFait.style.cssText = 'width:auto;padding:7px 11px;font-size:12px;margin:0;' +
    'color:var(--accent-text);border-color:var(--orange);';
  bFait.textContent = '✓ Terminée';
  bFait.title = 'La tâche sera supprimée définitivement';
  bFait.addEventListener('click', async () => {
    if(!await confirmer('Tâche terminée ?\n\n« ' + (t.titre || '') + ' »\n\n' +
        'Elle sera SUPPRIMÉE définitivement, avec sa capture.')) return;
    bFait.disabled = true;
    try{
      await appelPrep({ action: 'tacheDelete', id: t.id });
      showToast('Tâche terminée ✅');
      afficherTaches();
    }catch(e){ showToast('Impossible : ' + e.message); bFait.disabled = false; }
  });
  actions.appendChild(bFait);

  d.appendChild(actions);
  return d;
}


/* ============================================================
   CRÉER OU MODIFIER UNE TÂCHE
   ============================================================ */

function ouvrirEditeurTache(tache){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(560px, 94vw);max-height:88vh;overflow-y:auto;';

  const gens = (typeof moniteursActifs !== 'undefined' ? moniteursActifs : []) || [];

  boite.insertAdjacentHTML('beforeend',
    '<h3>' + (tache ? 'Modifier la tâche' : 'Nouvelle tâche') + '</h3>' +
    '<label for="tkTitre">Quoi faire</label>' +
    '<input type="text" id="tkTitre" maxlength="120" ' +
      'placeholder="Ex : Relancer la préfecture pour les places de septembre">' +
    '<label for="tkDetail">Détail (facultatif)</label>' +
    '<textarea id="tkDetail" rows="4" maxlength="1500" ' +
      'placeholder="Ce qu\'il faut savoir pour la faire" ' +
      'style="width:100%;background:var(--navy);border:1px solid var(--line);' +
      'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:15px;' +
      'line-height:1.6;font-family:inherit;resize:vertical;margin-bottom:12px;"></textarea>' +
    '<div class="duo">' +
      '<div><label for="tkPour">Pour qui</label><select id="tkPour">' +
        '<option value="">— non attribuée —</option>' +
        gens.map(g => '<option value="' + String(g).replace(/"/g, '&quot;') + '">' +
                      g + '</option>').join('') +
      '</select></div>' +
      '<div><label for="tkPrio">Importance</label><select id="tkPrio">' +
        PRIORITES.map(p => '<option value="' + p.cle + '">' + p.nom + '</option>').join('') +
      '</select></div>' +
    '</div>' +
    '<div class="duo">' +
      '<div><label for="tkStatut">Où en est-on</label><select id="tkStatut">' +
        STATUTS.map(s => '<option value="' + s.cle + '">' + s.nom + '</option>').join('') +
      '</select></div>' +
      '<div><label for="tkEcheance">Pour quand (facultatif)</label>' +
        '<input type="date" id="tkEcheance"></div>' +
    '</div>' +
    '<label>🖼️ Capture d\'écran (facultatif)</label>' +
    '<div id="tkZone" tabindex="0" style="border:2px dashed var(--line);' +
      'border-radius:12px;padding:18px 14px;text-align:center;cursor:pointer;' +
      'font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:8px;">' +
      '📋 Colle ta capture ici (Ctrl+V)<br>' +
      '<span style="font-size:12px;">ou glisse une image · ou appuie pour choisir un fichier</span>' +
    '</div>' +
    '<input type="file" id="tkImage" accept="image/*" style="display:none;">' +
    '<div id="tkApercu" style="margin-bottom:12px;"></div>');

  const r = document.createElement('div');
  r.className = 'btn-row';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary';
  bAnn.textContent = 'Annuler';
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary';
  bOk.textContent = '💾 Enregistrer';
  r.appendChild(bAnn); r.appendChild(bOk);
  boite.appendChild(r);

  const msg = document.createElement('div');
  msg.style.cssText = 'margin-top:8px;font-size:13px;min-height:16px;';
  boite.appendChild(msg);

  fond.appendChild(boite);
  document.body.appendChild(fond);

  if(tache){
    boite.querySelector('#tkTitre').value = tache.titre || '';
    boite.querySelector('#tkDetail').value = tache.detail || '';
    boite.querySelector('#tkPour').value = tache.pour || '';
    boite.querySelector('#tkPrio').value = tache.priorite || 'normale';
    boite.querySelector('#tkStatut').value = tache.statut || 'afaire';
    boite.querySelector('#tkEcheance').value = tache.echeance || '';
  }else{
    /* Une tâche qu'on se donne à soi-même : c'est le cas courant */
    boite.querySelector('#tkPour').value = ACCES.moniteur || '';
  }

  /* La capture, réduite avant envoi : une photo de téléphone
     dépasse les cinq mégaoctets et bloquerait l'enregistrement. */
  let imageData = '';
  const zoneImg = boite.querySelector('#tkZone');
  const champImg = boite.querySelector('#tkImage');

  function traiterFichier(f){
    if(!f || !/^image\//.test(f.type)) return;
    const lect = new FileReader();
    lect.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1200;
        const ech = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * ech);
        cv.height = Math.round(img.height * ech);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        imageData = cv.toDataURL('image/jpeg', 0.75);
        montrerApercu();
      };
      img.src = lect.result;
    };
    lect.readAsDataURL(f);
  }

  function montrerApercu(){
    const ap = boite.querySelector('#tkApercu');
    ap.innerHTML = '';
    if(!imageData) return;

    const vue = document.createElement('img');
    vue.src = imageData;
    vue.style.cssText = 'max-width:100%;border-radius:10px;margin-top:8px;' +
      'border:1px solid var(--line);';
    ap.appendChild(vue);

    const bSup = document.createElement('button');
    bSup.type = 'button';
    bSup.className = 'btn btn-secondary';
    bSup.style.cssText = 'width:auto;padding:6px 10px;font-size:12px;margin-top:6px;';
    bSup.textContent = '✕ Retirer la capture';
    bSup.addEventListener('click', () => { imageData = ''; montrerApercu(); });
    ap.appendChild(bSup);

    zoneImg.style.borderColor = 'var(--orange)';
    zoneImg.innerHTML = '✅ Capture prête — colle ou glisse pour la remplacer';
  }

  /* Coller : c'est le geste naturel après une capture d'écran */
  const surCollage = ev => {
    const items = (ev.clipboardData && ev.clipboardData.items) || [];
    for(let i = 0; i < items.length; i++){
      if(/^image\//.test(items[i].type)){
        traiterFichier(items[i].getAsFile());
        ev.preventDefault();
        return;
      }
    }
  };
  /* Sur toute la fenêtre : on ne veut pas obliger à cliquer d'abord */
  boite.addEventListener('paste', surCollage);
  document.addEventListener('paste', surCollage);

  /* Glisser-déposer */
  ['dragenter', 'dragover'].forEach(e =>
    zoneImg.addEventListener(e, ev => {
      ev.preventDefault();
      zoneImg.style.borderColor = 'var(--orange)';
    }));
  zoneImg.addEventListener('dragleave', () => {
    if(!imageData) zoneImg.style.borderColor = 'var(--line)';
  });
  zoneImg.addEventListener('drop', ev => {
    ev.preventDefault();
    const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    traiterFichier(f);
  });

  /* Et le choix de fichier, pour le téléphone */
  zoneImg.addEventListener('click', () => champImg.click());
  champImg.addEventListener('change', ev => {
    traiterFichier(ev.target.files && ev.target.files[0]);
  });

  /* Le collage est écouté sur tout le document : on le retire en
     fermant, sinon il resterait actif après la fenêtre. */
  const fermerTout = () => {
    document.removeEventListener('paste', surCollage);
    document.body.removeChild(fond);
  };

  bAnn.addEventListener('click', fermerTout);

  bOk.addEventListener('click', async () => {
    const titre = boite.querySelector('#tkTitre').value.trim();
    if(titre.length < 3){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Décris la tâche en quelques mots.';
      return;
    }
    bOk.disabled = true;
    bOk.textContent = 'Enregistrement…';
    try{
      await appelPrep({
        action: 'tacheSet',
        id: tache ? tache.id : '',
        titre: titre,
        detail: boite.querySelector('#tkDetail').value.trim(),
        pour: boite.querySelector('#tkPour').value,
        priorite: boite.querySelector('#tkPrio').value,
        statut: boite.querySelector('#tkStatut').value,
        echeance: boite.querySelector('#tkEcheance').value,
        image: imageData,
        par: ACCES.moniteur || ''
      });
      fermerTout();
      showToast('Tâche enregistrée ✅');
      afficherTaches();
    }catch(e){
      msg.style.color = 'var(--warn-text)';
      msg.textContent = 'Impossible : ' + e.message;
      bOk.disabled = false;
      bOk.textContent = '💾 Enregistrer';
    }
  });

  setTimeout(() => boite.querySelector('#tkTitre').focus(), 100);
}


/* Le compte des tâches, lu en tâche de fond : sans ça le chiffre
   n'apparaîtrait qu'après avoir ouvert la vue, ce qui lui retire
   tout intérêt. */
async function compterTachesEnFond(){
  if(typeof aDroit === 'function' && !aDroit('taches')) return;
  try{
    const d = await appelPrep({ action: 'tacheList' });
    const n = ((d && d.taches) || []).length;
    if(typeof poserCompteVue === 'function') poserCompteVue('taches', n);
  }catch(e){ /* hors ligne : pas de compte */ }
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-taches.js'] = true;
