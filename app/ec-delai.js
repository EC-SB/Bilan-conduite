/* Déployé le 26/11/2026 à 11:17 — v1579 */
/* ============================================================
   ec-delai.js — ⏳ LE DÉLAI DE PRÉSENTATION (v1579)

   David, le 26 novembre : « quand un élève est ajourné il faut qu'on
   puisse ajouter le délai de présentation imposé par la préfecture.
   Ça veut dire qu'on ne peut replacer un élève que le lendemain de la
   fin du délai (…) si on essaye de mettre un élève sur une date avant
   la fin de son délai on ait un avertissement — on peut négocier avec
   la préfecture donc il ne faut pas que ce soit bloquant ».

   Ses réponses au schéma (26/11) :
   · noté dès le premier pop-up du résultat (la fiche de 🏁 Résultats),
     pour tous, AU-DESSUS des captures, avant Obtenu / Ajourné — « sur
     RdvPermis il apparaît avant que l'on ait accès au CEPC » ;
   · au rendez-vous post-permis seulement s'il n'a pas été noté ;
   · rien de pré-rempli : il dépend des points et des fautes
     éliminatoires, on tape la date de RdvPermis ;
   · un message court en plus dans « Suivi examen » quand il est noté
     après l'ajournement ;
   · ⏳ sous le nom dans les listes de 🎓 Suivi permis.

   LES DEUX CASES DU SUIVI (colonnes 124 et 125, script v273)
   · delaiFin  — « AAAA-MM-JJ » (le dernier jour du délai), « non »
                 (pas de délai), vide (pas encore connu) ;
   · delaiNote — JSON { pour, par, le, ou } : l'examen qu'il suit
                 (AAAA-MM-JJ), qui l'a noté, quand, et où
                 (« resultat », « post », « dossier »).

   ⚠️ LE PREMIER JOUR POSSIBLE EST LE LENDEMAIN DE LA FIN. RdvPermis
   affiche « Fin du délai : 25/12/2026 » : l'élève peut repasser à
   partir du 26/12. Tout ce qui compare une date d'examen compare donc
   à « des », jamais à « fin ».
   ============================================================ */

function delaiIso(v){
  const t = String(v || '').trim();
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return m[0];
  return (typeof dateFrVersIso === 'function') ? (dateFrVersIso(t) || '') : '';
}
function delaiLendemain(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1, 12);
  const p2 = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
}
/* « 25/12/2026 » */
function delaiFr(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
}
/* « 26/12 » */
function delaiCourt(iso){ return delaiFr(iso).slice(0, 5); }
/* « samedi 26 décembre 2026 » */
function delaiLong(iso){
  return ((typeof dateEnToutesLettres === 'function') ? dateEnToutesLettres(iso) : '') || delaiFr(iso);
}
/* « sam. 26 déc. » — la forme des tuiles du dossier */
function delaiBref(iso, semaine){
  return ((typeof jourBref === 'function') ? jourBref(iso, !!semaine) : '') || delaiFr(iso);
}

/* La case « delaiFin » telle qu'on la compare : AAAA-MM-JJ, « non » ou
   vide. ⚠️ Une case écrite par le classeur peut revenir en « 25/12/2026 »
   (Sheets en fait une date) : on la remet d'aplomb. */
function valeurDuDelai(s){
  const v = String((s && s.delaiFin) || '').trim();
  if(!v || v === 'non') return v;
  return delaiIso(v);
}

function noteDuDelai(s){
  try{
    const o = JSON.parse(String((s && s.delaiNote) || '{}'));
    return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
  }catch(e){ return {}; }
}

/* L'état du délai d'un élève, lu dans son suivi.
   { fin, des, actif, non, note } — « actif » : on est encore avant
   le premier jour possible (il disparaît tout seul le lendemain de la
   fin). */
function delaiDe(nom){
  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  const note = noteDuDelai(s);
  const v = valeurDuDelai(s);
  if(v === 'non') return { fin: '', des: '', actif: false, non: true, note: note };
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { fin: '', des: '', actif: false, non: false, note: note };
  const des = delaiLendemain(v);
  const auj = (typeof todayLocal === 'function') ? todayLocal() : new Date().toISOString().slice(0, 10);
  return { fin: v, des: des, actif: auj < des, non: false, note: note };
}

/* La valeur notée POUR CET EXAMEN-LÀ (une fiche de Résultats, la
   confirmation d'ajournement). Un délai noté pour un examen d'avant
   n'est pas celui-ci : on repart de « pas encore connu ». */
function delaiPourLExamen(nom, isoExamen){
  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  const v = valeurDuDelai(s);
  if(!v) return '';
  const pour = noteDuDelai(s).pour || '';
  if(isoExamen && pour && pour !== isoExamen) return '';
  return v;
}

/* Une date d'examen avant le premier jour possible ? */
function delaiTropTot(nom, quand){
  const d = delaiDe(nom);
  const iso = delaiIso(quand);
  return !!(d.fin && iso && iso < d.des);
}

/* ⚠️ L'AVERTISSEMENT — LE MÊME PARTOUT, ET JAMAIS UN BLOCAGE.
   Rend true si on peut placer (pas de délai, date après le délai, ou
   « Placer quand même »), false si on renonce. */
async function avertirDelai(nom, quand){
  if(!nom || !delaiTropTot(nom, quand)) return true;
  const d = delaiDe(nom);
  const iso = delaiIso(quand);
  const texte = nom + ' a un délai de présentation jusqu’au ' + delaiLong(d.fin) +
    ' : la préfecture ne l’accepte qu’à partir du ' + delaiLong(d.des) + '.\n\n' +
    'Le placer quand même le ' + delaiLong(iso) + ' ?\n\n' +
    'À faire seulement si la préfecture a accepté.';
  if(typeof fenetre !== 'function'){
    return (typeof confirmer === 'function') ? !!(await confirmer(texte)) : true;
  }
  const r = await fenetre(texte, [
    { nom: 'Annuler', valeur: false },
    { nom: '⏳ Placer quand même', valeur: true, principal: true }
  ], '⏳ Délai de présentation');
  return r === true;
}

/* « ⏳ pas avant le 26/12 » — sous le nom, dans les listes */
function etiquetteDelai(nom){
  const d = delaiDe(nom);
  return d.actif ? '⏳ pas avant le ' + delaiCourt(d.des) : '';
}

/* La ligne de « Suivi examen » */
function phraseDelaiSuiviExamen(fin){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(fin || ''))) return '';
  return '⏳ Délai de présentation jusqu’au ' + delaiFr(fin) +
    ' : replaçable à partir du ' + delaiFr(delaiLendemain(fin));
}

/* Qui l'a noté, et où : « noté au post-permis par François » */
function quiANoteLeDelai(note){
  const ou = { resultat: 'noté au résultat', post: 'noté au post-permis', dossier: 'noté dans le dossier' }[note && note.ou] || 'noté';
  return ou + (note && note.par ? ' par ' + note.par : '');
}

/* Le motif, jamais tapé : « échec à l'examen du 25 nov. » */
function motifDuDelai(nom, note){
  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  const iso = (note && note.pour) || delaiIso(s.dateAjournement || '');
  return iso ? 'échec à l’examen du ' + delaiBref(iso, false) : '';
}

/* Écrire le délai dans le suivi. « valeur » : AAAA-MM-JJ, « non » ou
   vide. « pour » : la date de l'examen qu'il suit. */
function champsDuDelai(valeur, ou, pour){
  const v = String(valeur || '').trim();
  const maintenant = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  return {
    delaiFin: v,
    delaiNote: v ? JSON.stringify({ pour: pour || '', par: (typeof ACCES !== 'undefined' && ACCES.moniteur) || '',
                                    le: maintenant, ou: ou || '' }) : ''
  };
}
async function poserDelai(nom, valeur, ou, pour){
  if(typeof majSuivi !== 'function') throw new Error('Le suivi n’est pas disponible ici.');
  await majSuivi(nom, champsDuDelai(valeur, ou, pour));
}

/* 💬 Le message court de « Suivi examen », quand le délai est noté
   APRÈS l'ajournement (au post-permis, ou corrigé dans le dossier).
   Noté avant, il part dans le bloc de l'annonce « ❌ … — Ajourné ». */
async function annoncerDelaiSuiviExamen(nom, fin, ou){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(fin || ''))) return false;
  try{
    const d = await appelPrep({ action: 'convList' });
    const estSuivi = (typeof estSuiviExamenPP === 'function') ? estSuiviExamenPP : (() => false);
    const conv = ((d && d.conversations) || []).find(c =>
      (c.genre === 'groupe' || c.genre === 'interne') && !c.eleve && estSuivi(c.titre));
    if(!conv){
      if(typeof showToast === 'function') showToast('ℹ️ Pas de conversation « Suivi examen » pour toi : le délai n’y est pas annoncé.');
      return false;
    }
    const par = (typeof ACCES !== 'undefined' && ACCES.moniteur) || '';
    const texte = '⏳ ' + nom + ' — délai de présentation jusqu’au ' + delaiFr(fin) +
      ' : replaçable à partir du ' + delaiFr(delaiLendemain(fin)) +
      ' (' + quiANoteLeDelai({ ou: ou, par: par }) + ')';
    const r = await appelPrep({ action: 'convEcrire', id: conv.id, texte: texte });
    if(r && r.status === 'error') throw new Error(r.message || 'refusé');
    if(typeof showToast === 'function') showToast('💬 Délai annoncé dans « ' + (conv.titre || 'Suivi examen') + ' »');
    return true;
  }catch(e){
    if(typeof showToast === 'function') showToast('« Suivi examen » : ' + ((e && e.message) || e));
    return false;
  }
}

/* ============================================================
   LE CADRE ⏳ — le même au résultat, dans la confirmation
   d'ajournement, au post-permis et dans le dossier.

   o.valeur      — la valeur de départ (AAAA-MM-JJ, « non », vide)
   o.inconnu     — propose aussi « Pas encore connu »
   o.aide        — la phrase sous les boutons, quand rien n'est choisi
   o.surChoix(v) — appelé à chaque choix (v : AAAA-MM-JJ, « non », vide)
   o.titre       — le titre du cadre
   o.nu          — sans le cadre (dans une partie qui a déjà le sien)
   Rend l'élément ; .valeur() rend le choix courant.
   ============================================================ */
function cadreDelai(nom, o){
  o = o || {};
  let valeur = String(o.valeur || '').trim();
  const d = document.createElement('div');
  d.className = 'cadreDelai';
  if(!o.nu) d.style.cssText = 'margin:0 0 12px;border:1px solid var(--line);border-radius:11px;padding:9px 11px 2px;';
  const dessiner = () => {
    d.innerHTML = '';
    if(o.titre !== ''){
      const lab = document.createElement('div');
      lab.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:6px;';
      lab.textContent = o.titre || '⏳ Délai de présentation (RdvPermis)';
      d.appendChild(lab);
    }
    const estDate = /^\d{4}-\d{2}-\d{2}$/.test(valeur);
    const choix = [];
    if(o.inconnu) choix.push({ val: 'inconnu', lib: 'Pas encore connu' });
    choix.push({ val: 'non', lib: 'Pas de délai' });
    choix.push({ val: 'date', lib: estDate ? '📅 Fin du délai : ' + delaiFr(valeur) : '📅 Fin du délai…' });
    const courant = estDate ? 'date' : (valeur === 'non' ? 'non' : (o.inconnu ? 'inconnu' : '__aucun'));
    const poser = (v) => { valeur = v; dessiner(); if(typeof o.surChoix === 'function') o.surChoix(v); };
    const rangee = (typeof rangeeBoutons === 'function')
      ? rangeeBoutons('', choix, courant, async (val) => {
          /* Rappuyer sur un choix le retire (rangeeBoutons) : sur la
             date, c'est qu'on veut la CHANGER — le calendrier se rouvre. */
          if(val === '' && estDate) val = 'date';
          if(val === 'inconnu') val = '';
          if(val !== 'date'){ poser(val); return; }
          const iso = (typeof choisirDate === 'function')
            ? await choisirDate('Fin du délai de présentation (RdvPermis)', estDate ? valeur : '') : '';
          if(iso) poser(iso); else dessiner();
        })
      : document.createTextNode('');
    d.appendChild(rangee);
    const aide = document.createElement('div');
    aide.className = 'cadreDelaiAide';
    aide.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.45;margin:-4px 0 8px;';
    aide.textContent = estDate
      ? 'Replaçable à partir du ' + delaiLong(delaiLendemain(valeur)) + '.' + (o.apres ? ' ' + o.apres : '')
      : (valeur === 'non' ? 'Pas de délai : on peut le replacer dès qu’on veut.' : (o.aide || ''));
    if(aide.textContent) d.appendChild(aide);
  };
  dessiner();
  d.valeur = () => valeur;
  return d;
}

/* ✏️ Noter ou corriger le délai depuis le dossier (onglet 🎓 Permis) */
async function modifierDelaiDossier(nom){
  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  const avant = valeurDuDelai(s);
  const cadre = cadreDelai(nom, { valeur: avant, inconnu: true, titre: '',
    aide: 'La date de fin affichée sur RdvPermis.' });
  const w = document.createElement('div');
  const q = document.createElement('div');
  q.style.cssText = 'font-size:14px;margin-bottom:10px;line-height:1.45;';
  q.textContent = 'Le délai de présentation de ' + nom + ', tel que RdvPermis l’affiche.';
  w.appendChild(q);
  w.appendChild(cadre);
  const ok = await fenetre(w, [
    { nom: 'Annuler', valeur: false },
    { nom: 'Enregistrer', valeur: true, principal: true }
  ], '⏳ Délai de présentation');
  if(ok !== true) return false;
  const v = cadre.valeur();
  if(v === avant) return false;
  const pour = noteDuDelai(s).pour || delaiIso(s.dateAjournement || '');
  await poserDelai(nom, v, 'dossier', pour);
  if(/^\d{4}-\d{2}-\d{2}$/.test(v) && s.resultat === 'ajourne') annoncerDelaiSuiviExamen(nom, v, 'dossier');
  if(typeof showToast === 'function') showToast('Délai enregistré ✅');
  return true;
}

/* ============================================================
   LA TUILE « OÙ EN EST SON PERMIS » — la ligne ⏳

   Une ligne « date à reprendre » prend la mention au bout ; sinon une
   ligne rouge à elle, juste sous la première. Une date d'examen déjà
   prise AVANT le premier jour possible le dit aussi.
   ============================================================ */
function delaiDansLaTuile(t, nom){
  if(!t || t.cle === 'obtenu') return t;
  const d = delaiDe(nom);
  if(!d.fin) return t;
  const lignes = Array.isArray(t.lignes) ? t.lignes.slice() : [];
  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  const isoDate = delaiIso(s.datePermis || '');
  if(isoDate){
    if(isoDate < d.des){
      lignes.push({ txt: '⏳ Avant la fin de son délai (' + delaiBref(d.fin, false) + ') — accord de la préfecture ?', ton: 'rouge' });
    }
    return Object.assign({}, t, { lignes: lignes });
  }
  if(!d.actif) return t;
  const i = lignes.findIndex(l => l && /date à reprendre/.test(String(l.txt || '')));
  if(i !== -1){
    lignes[i] = Object.assign({}, lignes[i], {
      txt: lignes[i].txt + ' · ⏳ pas avant le ' + delaiBref(d.des, true) + ' (délai préfecture)', ton: 'rouge' });
  }else{
    lignes.splice(Math.min(1, lignes.length), 0,
      { txt: '⏳ Délai préfecture : pas avant le ' + delaiBref(d.des, true), ton: 'rouge' });
  }
  return Object.assign({}, t, { lignes: lignes });
}

/* ============================================================
   AU RENDEZ-VOUS POST-PERMIS — la partie, sous la conclusion

   ⚠️ CE N'EST PAS UNE PARTIE DU CRÉATEUR DE FICHE. Ajoutée à
   PARTIES_RDV_POST, toute fiche publiée sans elle se défait
   (« partie absente » → l'écran d'avant) : on la pose juste après la
   conclusion, où qu'elle soit rangée. Sa valeur vit dans le champ
   caché « rdvPostDelai », que la copie de secours garde avec les
   autres.
   ============================================================ */
function dessinerDelaiRdvPost(nom){
  const vieux = document.getElementById('rdvPostDelaiPart');
  if(vieux) vieux.remove();
  const conclusion = document.querySelector('[data-rdv-part="rdvConclusion"]');
  const cache = document.getElementById('rdvPostDelai');
  if(!conclusion || !cache || !nom) return;
  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  const note = noteDuDelai(s);
  const deja = valeurDuDelai(s);
  const part = document.createElement('div');
  part.id = 'rdvPostDelaiPart';
  part.style.cssText = 'margin-bottom:14px;';
  /* Noté au résultat (ou dans le dossier) : une ligne, pas de champ */
  if(deja && note.ou !== 'post'){
    cache.value = '';
    const l = document.createElement('div');
    l.style.cssText = 'font-size:13px;line-height:1.5;border:1px solid var(--line);border-radius:10px;padding:8px 11px;' +
      (deja === 'non' ? 'color:var(--muted);' : 'color:var(--red);font-weight:600;');
    l.textContent = deja === 'non'
      ? '⏳ Pas de délai de présentation (' + quiANoteLeDelai(note) + ')'
      : '⏳ Délai de présentation ' + quiANoteLeDelai(note) + ' : jusqu’au ' + delaiFr(deja) +
        ' — replaçable à partir du ' + delaiLong(delaiLendemain(deja));
    part.appendChild(l);
  }else{
    const lab = document.createElement('label');
    lab.textContent = '⏳ Délai de présentation — la fin du délai sur RdvPermis';
    part.appendChild(lab);
    const depart = String(cache.value || '').trim() || (note.ou === 'post' ? deja : '');
    cache.value = depart;
    part.appendChild(cadreDelai(nom, { valeur: depart, titre: '', nu: true,
      aide: 'Pas encore noté : la date de fin affichée sur RdvPermis, ou « Pas de délai ».',
      apres: motifDuDelai(nom, note) ? 'Motif : ' + motifDuDelai(nom, note) + '.' : '',
      surChoix: (v) => {
        cache.value = v;
        if(typeof garderRdvPost === 'function') garderRdvPost();
      } }));
  }
  conclusion.parentNode.insertBefore(part, conclusion.nextSibling);
}

/* Ce que « Terminer le rendez-vous » écrit (rien si rien n'a changé) */
function champsDelaiRdvPost(nom){
  const cache = document.getElementById('rdvPostDelai');
  const v = String((cache && cache.value) || '').trim();
  if(!v) return null;
  const s = (typeof suiviDe === 'function') ? (suiviDe(nom) || {}) : {};
  const note = noteDuDelai(s);
  if(valeurDuDelai(s) && note.ou !== 'post') return null;
  if(v === valeurDuDelai(s)) return null;
  return champsDuDelai(v, 'post', delaiIso(s.dateAjournement || ''));
}

/* ⚠️ À GARDER EN DERNIÈRE LIGNE : le fichier est arrivé jusqu'au bout. */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-delai.js'] = true;
