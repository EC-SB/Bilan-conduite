/* ============================================================
   ec-notes-dossier.js — 📝 LES NOTES INTERNES DU DOSSIER — v1139

   David, le 10 octobre : « dans le dossier élève ajoute un sous-
   onglet sous Coin révisions, Notes internes, avec des blocs de
   texte que l'on ajoute, et des catégories ». Schéma validé, puis
   ses choix :
   · trois catégories, celles qu'il connaît : Administratif,
     Pédagogique, Sensible ;
   · toute l'équipe qui ouvre le dossier les lit, « Sensible »
     compris ;
   · une note se modifie ou se supprime par son auteur ou par un
     administrateur.

   ⚠️ L'ÉLÈVE NE LES VOIT JAMAIS. Elles vivent dans la feuille
   « NotesDossier » du classeur, que rien du côté de l'espace élève
   ne lit.

   ⚠️ CE MODULE N'ÉCRIT PAS L'AUTEUR. Le Worker pose le
   « demandeur », le classeur décide qui peut toucher une note. Les
   boutons ✏️ 🗑️ ne s'affichent que pour qui le peut — c'est du
   confort : la règle, elle, est au serveur.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const CAT_NOTES_DOSSIER = [
  { cle:'adm',  nom:'🗂️ Administratif', couleur:'var(--bleu)' },
  { cle:'peda', nom:'🎓 Pédagogique',   couleur:'var(--accent-text)' },
  { cle:'sens', nom:'🔒 Sensible',      couleur:'var(--red)' }
];

/* Ce que l'écran retient d'un dossier à l'autre : rien de sensible,
   juste le filtre et la dernière catégorie choisie. */
const etatNotesDossier = { filtre:'', categorie:'peda' };

function categorieNoteDossier(cle){
  return CAT_NOTES_DOSSIER.find(c => c.cle === cle) ||
         { cle: cle, nom: cle || '—', couleur: 'var(--muted)' };
}

function echNoteDossier(t){
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* « sam. 10 oct. 2026 » */
function jourNoteDossier(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return String(iso || '');
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR',
    { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}

/* Confort d'écran seulement : le classeur refuse de toute façon. */
function peutToucherNoteDossierEcran(note){
  if(typeof ACCES === 'undefined' || !ACCES) return false;
  if(ACCES.role === 'admin') return true;
  const moi = (typeof normaliserMot === 'function')
    ? normaliserMot(ACCES.moniteur || '') : String(ACCES.moniteur || '').toLowerCase();
  const auteur = (typeof normaliserMot === 'function')
    ? normaliserMot(note.auteur || '') : String(note.auteur || '').toLowerCase();
  return !!moi && moi === auteur;
}

/* Les boutons de catégorie, partagés par l'ajout et la modification */
function pastillesCategorieNote(choisie, auChoix){
  const z = document.createElement('div');
  z.className = 'ndCats';
  z.style.cssText = 'display:contents;';
  const peindre = () => {
    z.querySelectorAll('button').forEach(b => {
      const c = categorieNoteDossier(b.dataset.cat);
      const on = (b.dataset.cat === z.dataset.choisie);
      b.style.borderColor = on ? c.couleur : '';
      b.style.color = on ? c.couleur : '';
      b.style.fontWeight = on ? '700' : '';
      b.style.boxShadow = on ? 'inset 0 0 0 1px ' + c.couleur : '';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };
  z.dataset.choisie = choisie || '';
  CAT_NOTES_DOSSIER.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-secondary';
    b.dataset.cat = c.cle;
    b.style.cssText = 'width:auto;margin:0;padding:7px 12px;font-size:13px;border-radius:999px;';
    b.textContent = c.nom;
    b.addEventListener('click', () => {
      z.dataset.choisie = c.cle;
      peindre();
      if(auChoix) auChoix(c.cle);
    });
    z.appendChild(b);
  });
  peindre();
  return z;
}

async function ongletNotesDossier(corps, nom){
  const zAjout = document.createElement('div');
  const zFiltres = document.createElement('div');
  const zListe = document.createElement('div');
  corps.appendChild(zAjout);
  corps.appendChild(zFiltres);
  corps.appendChild(zListe);

  let notes = [];

  /* ── ➕ Une nouvelle note ── */
  zAjout.style.cssText = 'border:1px solid var(--line);border-radius:12px;padding:12px 14px;' +
    'margin-bottom:14px;background:var(--navy-deep);box-shadow:var(--ombre-carte);';
  const t = document.createElement('div');
  t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:8px;';
  t.textContent = '📝 Nouvelle note';
  zAjout.appendChild(t);

  const champ = document.createElement('textarea');
  champ.rows = 4;
  champ.maxLength = 4000;
  champ.placeholder = 'Écris la note… Elle reste dans l’équipe : l’élève ne la voit jamais.';
  champ.style.cssText = 'width:100%;margin:0 0 10px;font-size:14px;line-height:1.5;';
  zAjout.appendChild(champ);

  const rang = document.createElement('div');
  rang.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;';
  const cats = pastillesCategorieNote(etatNotesDossier.categorie,
    cle => { etatNotesDossier.categorie = cle; });
  rang.appendChild(cats);

  const jour = document.createElement('input');
  jour.type = 'date';
  jour.value = (typeof todayLocal === 'function') ? todayLocal() : '';
  jour.style.cssText = 'width:auto;margin:0;padding:7px 10px;font-size:13px;';
  jour.setAttribute('aria-label', 'Date de la note');
  rang.appendChild(jour);

  const bAjout = document.createElement('button');
  bAjout.type = 'button';
  bAjout.className = 'btn btn-primary';
  bAjout.style.cssText = 'width:auto;margin:0 0 0 auto;padding:9px 16px;font-size:14px;';
  bAjout.textContent = '➕ Ajouter la note';
  rang.appendChild(bAjout);
  zAjout.appendChild(rang);

  bAjout.addEventListener('click', async () => {
    const texte = champ.value.trim();
    if(!texte){ showToast('La note est vide.'); champ.focus(); return; }
    if(!cats.dataset.choisie){ showToast('Choisis une catégorie.'); return; }
    bAjout.disabled = true;
    try{
      const r = await appelPrep({ action:'notesDossierSet', eleve: nom,
        categorie: cats.dataset.choisie, texte: texte, jour: jour.value });
      if(r && r.note) notes.unshift(r.note);
      trier();
      champ.value = '';
      showToast('Note ajoutée ✅');
      dessiner();
    }catch(e){
      showToast('Impossible : ' + (e && e.message ? e.message : 'refusé'));
    }
    bAjout.disabled = false;
  });

  const trier = () => notes.sort((a, b) =>
    (a.jour !== b.jour) ? (a.jour < b.jour ? 1 : -1) : (a.id < b.id ? 1 : (a.id > b.id ? -1 : 0)));

  /* ── Les filtres, puis la liste ── */
  function dessiner(){
    zFiltres.innerHTML = '';
    zFiltres.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
    const filtre = (cle, nomF, n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary ndFiltre';
      b.dataset.filtre = cle;
      const on = (etatNotesDossier.filtre === cle);
      b.style.cssText = 'width:auto;margin:0;padding:5px 11px;font-size:12.5px;border-radius:999px;' +
        (on ? 'background:var(--orange);color:var(--on-accent);border-color:var(--orange);font-weight:700;' : '');
      b.innerHTML = echNoteDossier(nomF) + ' <span style="opacity:.7;">' + n + '</span>';
      b.addEventListener('click', () => { etatNotesDossier.filtre = cle; dessiner(); });
      zFiltres.appendChild(b);
    };
    filtre('', 'Toutes', notes.length);
    CAT_NOTES_DOSSIER.forEach(c => filtre(c.cle, c.nom, notes.filter(n => n.categorie === c.cle).length));

    zListe.innerHTML = '';
    const vues = notes.filter(n => !etatNotesDossier.filtre || n.categorie === etatNotesDossier.filtre);
    if(!vues.length){
      const v = document.createElement('div');
      v.className = 'empty';
      v.textContent = notes.length ? 'Aucune note dans cette catégorie.'
                                   : 'Aucune note pour le moment.';
      zListe.appendChild(v);
      return;
    }
    vues.forEach(n => zListe.appendChild(ligne(n)));
  }

  function ligne(n){
    const c = categorieNoteDossier(n.categorie);
    const l = document.createElement('div');
    l.className = 'ndNote';
    l.dataset.id = n.id;
    l.style.cssText = 'display:flex;gap:10px;align-items:flex-start;padding:11px 2px;' +
      'border-bottom:1px solid var(--line);';

    const pt = document.createElement('span');
    pt.style.cssText = 'width:10px;height:10px;border-radius:50%;background:' + c.couleur +
      ';flex-shrink:0;margin-top:5px;';
    l.appendChild(pt);

    const g = document.createElement('div');
    g.style.cssText = 'flex:1;min-width:0;';
    g.innerHTML =
      '<div style="font-size:13px;"><strong>' + echNoteDossier(n.auteur || '—') + '</strong> ' +
        '<span style="color:var(--muted);">· ' + echNoteDossier(jourNoteDossier(n.jour)) + '</span> ' +
        '<span style="font-size:11px;font-weight:700;color:' + c.couleur + ';white-space:nowrap;">' +
          echNoteDossier(c.nom) + '</span></div>' +
      '<div class="ndTexte" style="font-size:14px;line-height:1.5;margin-top:3px;white-space:pre-wrap;' +
        'overflow-wrap:anywhere;">' + echNoteDossier(n.texte) + '</div>' +
      (n.modifieeLe ? '<div style="font-size:11px;color:var(--muted);margin-top:3px;">modifiée le ' +
        echNoteDossier(n.modifieeLe) + (n.modifieePar ? ' par ' + echNoteDossier(n.modifieePar) : '') +
        '</div>' : '');
    l.appendChild(g);

    if(peutToucherNoteDossierEcran(n)){
      const bMod = document.createElement('button');
      bMod.type = 'button';
      bMod.className = 'btn btn-secondary';
      bMod.title = 'Modifier';
      bMod.setAttribute('aria-label', 'Modifier la note');
      bMod.style.cssText = 'width:auto;margin:0;padding:5px 8px;font-size:14px;flex-shrink:0;';
      bMod.textContent = '✏️';
      bMod.addEventListener('click', () => modifier(n, l));
      l.appendChild(bMod);

      const bSup = document.createElement('button');
      bSup.type = 'button';
      bSup.className = 'btn btn-secondary';
      bSup.title = 'Supprimer';
      bSup.setAttribute('aria-label', 'Supprimer la note');
      bSup.style.cssText = 'width:auto;margin:0;padding:5px 8px;font-size:14px;flex-shrink:0;' +
        'color:var(--red);border-color:var(--red);';
      bSup.textContent = '🗑️';
      bSup.addEventListener('click', async () => {
        if(!await confirmer('Supprimer cette note ?\n\n« ' +
            String(n.texte || '').slice(0, 120) + (String(n.texte || '').length > 120 ? '…' : '') +
            ' »')) return;
        try{
          await appelPrep({ action:'notesDossierDelete', eleve: nom, id: n.id });
          notes = notes.filter(x => x.id !== n.id);
          showToast('Note supprimée ✅');
          dessiner();
        }catch(e){
          showToast('Impossible : ' + (e && e.message ? e.message : 'refusé'));
        }
      });
      l.appendChild(bSup);
    }
    return l;
  }

  /* La modification se fait sur place, avec les mêmes boutons */
  function modifier(n, l){
    l.innerHTML = '';
    l.style.display = 'block';
    const ta = document.createElement('textarea');
    ta.rows = Math.min(10, Math.max(3, String(n.texte || '').split('\n').length + 1));
    ta.maxLength = 4000;
    ta.value = n.texte || '';
    ta.style.cssText = 'width:100%;margin:0 0 8px;font-size:14px;line-height:1.5;';
    l.appendChild(ta);

    const r = document.createElement('div');
    r.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;';
    const cs = pastillesCategorieNote(n.categorie);
    r.appendChild(cs);
    const j = document.createElement('input');
    j.type = 'date';
    j.value = n.jour || '';
    j.style.cssText = 'width:auto;margin:0;padding:7px 10px;font-size:13px;';
    r.appendChild(j);

    const bAnn = document.createElement('button');
    bAnn.type = 'button';
    bAnn.className = 'btn btn-secondary';
    bAnn.style.cssText = 'width:auto;margin:0 0 0 auto;padding:8px 14px;font-size:13px;';
    bAnn.textContent = 'Annuler';
    bAnn.addEventListener('click', () => dessiner());
    r.appendChild(bAnn);

    const bOk = document.createElement('button');
    bOk.type = 'button';
    bOk.className = 'btn btn-primary';
    bOk.style.cssText = 'width:auto;margin:0;padding:8px 14px;font-size:13px;';
    bOk.textContent = '✅ Enregistrer';
    bOk.addEventListener('click', async () => {
      const texte = ta.value.trim();
      if(!texte){ showToast('La note est vide.'); return; }
      bOk.disabled = true;
      try{
        const rep = await appelPrep({ action:'notesDossierSet', eleve: nom, id: n.id,
          categorie: cs.dataset.choisie, texte: texte, jour: j.value });
        if(rep && rep.note) Object.assign(n, rep.note);
        trier();
        showToast('Note modifiée ✅');
        dessiner();
      }catch(e){
        showToast('Impossible : ' + (e && e.message ? e.message : 'refusé'));
        bOk.disabled = false;
      }
    });
    r.appendChild(bOk);
    l.appendChild(r);
    ta.focus();
  }

  zListe.innerHTML = '<div class="empty">Lecture des notes…</div>';
  try{
    const d = await appelPrep({ action:'notesDossierList', eleve: nom });
    notes = ((d && d.notes) || []).slice();
    trier();
    dessiner();
  }catch(e){
    zListe.innerHTML = '';
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = '⚠️ Notes illisibles : ' + String((e && e.message) || e);
    zListe.appendChild(v);
  }
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-notes-dossier.js'] = true;
