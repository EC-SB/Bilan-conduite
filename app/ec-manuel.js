/* ============================================================
   ec-manuel.js
   Bilan à remplir à la main
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ============================================================
   BILAN MANUEL — sans micro ni résumé automatique
   Le moniteur remplit chaque rubrique ; il peut dicter dans
   chaque champ séparément s'il le souhaite.
   ============================================================ */

/* Ce que le moniteur doit renseigner, selon le modèle choisi */
/* Les rubriques du résumé, dans l'ordre du bilan */
const THEMES_ERREURS = [
  { cle:'commandes',   nom:'🚙 MANIPULATION DES COMMANDES' },
  { cle:'trajectoire', nom:'👀 TRAJECTOIRE' },
  { cle:'giratoires',  nom:'🍩 GIRATOIRES' },
  { cle:'vavd',        nom:'🛣️ VA VD' },
  { cle:'pad',         nom:'❌ PAD' },
  { cle:'allures',     nom:'🏎️💨 ALLURES' },
  { cle:'controles',   nom:'👀 CONTRÔLES' },
  { cle:'divers',      nom:'🧠 DIVERS' },
  { cle:'manoeuvres',  nom:'🚙🚗🚙 MANŒUVRES' }
];

const CHAMPS_MANUELS = {
  conduiteResume: [
    { cle:'carteSD',     type:'ok',    nom:'Carte SD',    defaut:'✅' },
    { cle:'installation',type:'ok',    nom:'Installation',defaut:'✅' },
    { cle:'passager',    type:'ok',    nom:'Passager',    defaut:'✅' },
    { cle:'voyants',     type:'ok',    nom:'Voyants',     defaut:'✅' },
    { cle:'texteDicte',  type:'texte', nom:'🎙️ Ton cours', lignes:8,
      aide:'Ce que tu as dit pendant le cours. Peut rester vide.' },
    { cle:'resume',      type:'themes', nom:'🧠 Erreurs de ce jour' },
    { cle:'manoeuvres',  type:'manoeuvres', nom:'🦉 Manœuvres travaillées' },
    { cle:'groupesTravail', type:'ok', nom:'4 groupes de travail suivis', defaut:'' },
    { cle:'ecoutes',     type:'ok',    nom:"Plus d'écoutes que de conduite", defaut:'' }
  ],
  conduite: [
    { cle:'carteSD',     type:'ok',    nom:'Carte SD',    defaut:'✅' },
    { cle:'installation',type:'ok',    nom:'Installation',defaut:'✅' },
    { cle:'passager',    type:'ok',    nom:'Passager',    defaut:'✅' },
    { cle:'voyants',     type:'ok',    nom:'Voyants',     defaut:'✅' },
    { cle:'resume',      type:'themes', nom:'🧠 Erreurs de ce jour' },
    { cle:'manoeuvres',  type:'manoeuvres', nom:'🦉 Manœuvres travaillées' },
    { cle:'groupesTravail', type:'ok', nom:'4 groupes de travail suivis', defaut:'' },
    { cle:'ecoutes',     type:'ok',    nom:"Plus d'écoutes que de conduite", defaut:'' }
  ],
  simu: [
    { cle:'competences', type:'competences', nom:'Compétences travaillées' },
    { cle:'resume',      type:'texte', nom:'🧠 Remarques du cours', lignes:10 }
  ],
  eval: [
    { cle:'resume',      type:'texte', nom:'Bilan de l\'évaluation', lignes:12 },
    { cle:'simuHeures',  type:'court', nom:'Heures de simulateur' },
    { cle:'leconsAvant', type:'court', nom:'Leçons avant examen blanc' },
    { cle:'leconsApres', type:'court', nom:'Leçons après examen blanc' }
  ],
  examenblanc: [
    { cle:'avant.carteSD',      type:'ok', nom:'1-1 · Carte SD', defaut:'✅' },
    { cle:'avant.installation', type:'ok', nom:'1-2 · Installation', defaut:'✅' },
    { cle:'avant.passager',     type:'ok', nom:'1-2 · Passager', defaut:'✅' },
    { cle:'avant.voyants',      type:'ok', nom:'1-2 · Voyants', defaut:'✅' },
    { cle:'avant.erreursRoute', type:'texte', lignes:5,
      nom:"1-3 · Erreurs en allant au centre d'examen",
      aide:'Une erreur par ligne.' },

    { cle:'examen.installation', type:'ok', nom:'2-1 · Installation', defaut:'' },
    { cle:'examen.remarqueInstallation', type:'court', nom:'2-1 · Remarque sur l\'installation' },
    { cle:'examen.passager',     type:'ok', nom:'2-1 · Passager', defaut:'' },
    { cle:'examen.voyants',      type:'ok', nom:'2-1 · Voyants', defaut:'' },
    { cle:'examen.verifQuestion',type:'court', nom:'2-2 · Vérifications, question n°' },
    { cle:'examen.reflexions',   type:'texte', lignes:10,
      nom:'2-3 · Réflexions inspecteur et explications',
      aide:'Une réflexion par ligne.' },

    { cle:'cepc',        type:'cepc',  nom:'🧾 CEPC — bilan des compétences' },
    { cle:'observations',type:'texte', lignes:4,
      nom:'Observations et fautes éliminatoires',
      aide:'Une observation par ligne.' },

    { cle:'bilanErreurs',type:'texte', lignes:6, nom:'3 · Bilan erreurs',
      aide:'Une erreur par ligne : chacune reçoit les trois questions.' },

    { cle:'niveau',      type:'niveau', nom:'4 · Niveau permis ?' },
    { cle:'heuresAvant', type:'court',  nom:"4 · Combien d'heures avant permis" },
    { cle:'friseAvant',  type:'ouinon', nom:'4 · Frise respectée avant examen blanc' },
    { cle:'friseAvantH', type:'court',  nom:'4 · Si non, heures en plus' },
    { cle:'frisePost',   type:'ouinon', nom:'4 · Frise respectée post permis' },
    { cle:'frisePostH',  type:'court',  nom:'4 · Si non, heures en plus' },
    { cle:'aDate',       type:'ouinon', nom:'4 · A déjà sa date de permis' },
    { cle:'heuresPlanifiees', type:'ok', nom:'4 · Heures avant permis planifiées', defaut:'' },
    { cle:'heuresPosees',     type:'ok', nom:'4 · Heures posées (2×2h + 1×1h)', defaut:'' }
  ],
  examen: [
    { cle:'installation',type:'ok',    nom:'Installation', defaut:'' },
    { cle:'passager',    type:'ok',    nom:'Passager',     defaut:'' },
    { cle:'voyants',     type:'ok',    nom:'Voyants',      defaut:'' },
    { cle:'verifQuestion', type:'court', nom:'N° de la question de vérification' },
    { cle:'vi',          type:'ok',    nom:'Vérification intérieure', defaut:'' },
    { cle:'qser',        type:'ok',    nom:'Question sécurité routière', defaut:'' },
    { cle:'secours',     type:'ok',    nom:'Premiers secours', defaut:'' },
    { cle:'observations',type:'observations', nom:'Observations de l\'inspecteur' }
  ],
  rvp: [
    { cle:'resume',      type:'texte', nom:'Déroulé du rendez-vous', lignes:12 }
  ],
  accompagnateur: [
    { cle:'resume',      type:'texte', nom:'Déroulé de la formation', lignes:12 }
  ]
};

/* La boîte automatique part du même formulaire que la boîte manuelle,
   puis les deux évoluent séparément. */
CHAMPS_MANUELS.conduiteResumeAuto =
  JSON.parse(JSON.stringify(CHAMPS_MANUELS.conduiteResume));


/* champsManuels : déclaré dans ec-etat.js */
/* modeManuel : déclaré dans ec-etat.js */

/* La dictée est-elle possible sur ce navigateur ? */
function dicteePossible(){
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/* Dictée dans un champ précis, sans toucher au reste */
function dicterDans(champ, bouton){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ showToast('La dictée demande Chrome sur Android.'); return; }

  if(bouton.dataset.actif === 'oui'){
    if(bouton._sr) try{ bouton._sr.stop(); }catch(e){}
    return;
  }

  const sr = new SR();
  sr.lang = 'fr-FR';
  sr.continuous = true;
  sr.interimResults = false;
  sr.maxAlternatives = 3;

  const depart = champ.value;
  let ajoute = '';

  sr.onresult = ev => {
    for(let i = ev.resultIndex; i < ev.results.length; i++){
      if(!ev.results[i].isFinal) continue;
      let meilleur = ev.results[i][0].transcript;
      let score = -1;
      for(let k = 0; k < ev.results[i].length; k++){
        const s = scoreMetier(ev.results[i][k].transcript);
        if(s > score){ score = s; meilleur = ev.results[i][k].transcript; }
      }
      ajoute += (ajoute ? ' ' : '') + corrigerVocabulaire(meilleur.trim());
    }
    champ.value = (depart ? depart + (depart.endsWith('\n') ? '' : ' ') : '') +
                  terminerPhrase(ajoute);
    champ.scrollTop = champ.scrollHeight;
  };
  sr.onerror = e => { if(e.error !== 'no-speech') showToast('Dictée : ' + e.error); };
  sr.onend = () => {
    bouton.dataset.actif = '';
    bouton.textContent = '🎙️';
    bouton.style.background = '';
    bouton._sr = null;
  };

  bouton._sr = sr;
  bouton.dataset.actif = 'oui';
  bouton.textContent = '⏹️';
  bouton.style.background = 'var(--red)';
  try{ sr.start(); }catch(e){ showToast('Dictée indisponible.'); sr.onend(); }
}



/* Une ligne du CEPC : la compétence et son niveau */
function ligneCepc(nom, valeurs){
  const l = document.createElement('div');
  l.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;';
  const t = document.createElement('span');
  t.style.cssText = 'flex:1;font-size:14px;color:var(--cream);line-height:1.3;min-width:0;';
  t.textContent = nom;
  const s = document.createElement('select');
  s.className = 'cepcNiveau';
  s.setAttribute('data-comp', nom);
  s.style.cssText = 'width:auto;margin:0;padding:7px 9px;font-size:15px;flex-shrink:0;';
  [''].concat(valeurs || ['E','0','1','2','3']).forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v || '—';
    s.appendChild(o);
  });
  s.addEventListener('change', majTotalCepc);
  l.appendChild(t); l.appendChild(s);
  return l;
}

function majTotalCepc(){
  const z = document.getElementById('cepcTotal');
  if(!z) return;
  const c = {};
  document.querySelectorAll('.cepcNiveau').forEach(s => {
    if(s.value) c[s.getAttribute('data-comp')] = s.value;
  });
  const r = calculerCepc(c);
  let etat, couleur;
  if(r.elimine){
    etat = 'ÉLIMINATOIRE — ' + r.eliminatoires.length + ' compétence(s) en E';
    couleur = 'var(--red)';
  }else if(r.favorable){
    etat = 'FAVORABLE'; couleur = 'var(--accent-text)';
  }else{
    etat = 'insuffisant — 20 minimum'; couleur = 'var(--warn-text)';
  }
  z.innerHTML = 'Total : ' + r.total + ' / ' + r.max + ' · <span style="color:' + couleur + ';">' +
    etat + '</span>';
}

/* Construit le formulaire du bilan manuel */
async function ouvrirBilanManuel(){
  const probleme = verifierContexteManuel();
  if(probleme){ showToast(probleme); return; }

  const modeleCle = $('modele').value;
  const modele = MODELES[modeleCle];

  /* Le rendez-vous post-permis a son propre écran */
  if(modeleCle === 'rdv-post'){
    const nom = $('studentName').value.trim();
    if(nom.length < 2){ showToast("Saisis le nom de l'élève."); return; }
    ouvrirRdvPost({ eleve: nom, date: $('lessonDate').value,
                    moniteur: ACCES.moniteur || '', note: '', modele: 'rdv-post' });
    return;
  }

  const champs = CHAMPS_MANUELS[modele.schema];
  if(!champs){ showToast('Ce modèle ne se remplit pas encore à la main.'); return; }

  const eleve = $('studentName').value.trim();
  const btn = $('manuelBtn');
  btn.disabled = true;
  btn.textContent = 'Préparation…';

  /* Le questionnaire alimente la note interne, comme pour un cours enregistré */
  if(!contexteDepart){
    try{
      const rep = await ouvrirQuestionnaireDepart(null, 'Avant de remplir le bilan', 'Continuer');
      if(rep){
        contexteDepart = rep;
        appliquerNoteQuestionnaire(noteDepuisQuestionnaire(rep));
      }
    }catch(e){}
  }

  /* Ce qui se remplit tout seul : frise, manœuvres déjà validées */
  let dossier = { manoeuvres: [], frise: '' };
  try{ dossier = await chargerDossierEleve(eleve); }catch(e){}

  btn.disabled = false;
  btn.textContent = '✍️ Bilan à remplir à la main';

  champsManuels = {};
  modeManuel = true;

  const zone = $('manuelChamps');
  zone.innerHTML = '';

  champs.forEach(ch => {
    const bloc = document.createElement('div');
    bloc.style.cssText = 'margin-bottom:16px;';

    if(ch.type === 'niveau' || ch.type === 'ouinon'){
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:8px;';
      const choix = (ch.type === 'niveau')
        ? [['✅ Oui', 'oui'], ['❌ Pas le niveau', 'non'], ['—', '']]
        : [['✅ Oui', 'oui'], ['❌ Non', 'non'], ['—', '']];
      choix.forEach(([lab, val]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'flex:1;padding:11px;font-size:14px;margin:0;';
        b.textContent = lab;
        b.addEventListener('click', () => {
          champsManuels[ch.cle] = val;
          Array.prototype.forEach.call(r.children, x => {
            x.style.borderColor = 'var(--line)';
            x.style.color = 'var(--cream)';
          });
          b.style.borderColor = 'var(--orange)';
          b.style.color = 'var(--accent-text)';
        });
        r.appendChild(b);
      });
      bloc.appendChild(r);

    }else if(ch.type === 'ok'){
      /* Trois états : ✅ ❌ ou rien */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:8px;';
      [['✅','✅'], ['❌','❌'], ['—','']].forEach(([lab, val]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style.cssText = 'flex:1;padding:12px;font-size:17px;margin:0;';
        b.textContent = lab;
        b.addEventListener('click', () => {
          champsManuels[ch.cle] = val;
          Array.prototype.forEach.call(r.children, x => {
            x.style.borderColor = 'var(--line)';
            x.style.color = 'var(--cream)';
          });
          b.style.borderColor = 'var(--orange)';
          b.style.color = 'var(--accent-text)';
        });
        if((ch.defaut || '') === val) setTimeout(() => b.click(), 0);
        r.appendChild(b);
      });
      bloc.appendChild(r);

    }else if(ch.type === 'manoeuvres' || ch.type === 'competences'){
      const liste = (ch.type === 'manoeuvres')
        ? BLOC.ficheListeConduite
        : (modele.comps || []).map(x => x.nom || x);
      const dejaFaites = (dossier.manoeuvres || []).map(normaliserMot);

      const l = document.createElement('label');
      l.textContent = ch.nom + ' — coche celles travaillées aujourd\'hui';
      bloc.appendChild(l);
      const z = document.createElement('div');
      z.style.cssText = 'background:var(--navy);border:1px solid var(--line);border-radius:10px;' +
        'padding:10px 12px;max-height:260px;overflow-y:auto;';
      liste.forEach(nom => {
        const dejaOk = dejaFaites.indexOf(normaliserMot(nom)) !== -1;
        const lab = document.createElement('label');
        lab.style.cssText = 'display:flex;align-items:center;gap:9px;padding:5px 0;' +
          'font-size:15px;text-transform:none;margin:0;color:' +
          (dejaOk ? 'var(--muted)' : 'var(--cream)') + ';';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = nom;
        cb.className = 'chManuel-' + ch.cle;
        cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;';
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(nom + (dejaOk ? ' — déjà validée' : '')));
        z.appendChild(lab);
      });
      bloc.appendChild(z);

    }else if(ch.type === 'themes'){
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      const a = document.createElement('div');
      a.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 8px;line-height:1.4;';
      a.textContent = 'Remplis seulement les rubriques utiles : les autres ne sortiront pas.';
      bloc.appendChild(a);

      THEMES_ERREURS.forEach(th => {
        const b = document.createElement('div');
        b.style.cssText = 'margin-bottom:10px;';
        const t2 = document.createElement('div');
        t2.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin-bottom:4px;';
        t2.textContent = th.nom;
        b.appendChild(t2);

        const r = document.createElement('div');
        r.style.cssText = 'display:flex;gap:8px;align-items:flex-start;';
        const t = document.createElement('textarea');
        t.rows = 2;
        t.className = 'themeErreur';
        t.setAttribute('data-theme', th.nom);
        t.placeholder = 'Une remarque par ligne';
        t.style.cssText = 'flex:1;background:var(--navy);border:1px solid var(--line);' +
          'color:var(--cream);padding:10px 11px;border-radius:10px;font-size:16px;' +
          'line-height:1.5;font-family:inherit;resize:vertical;margin:0;';
        r.appendChild(t);
        if(dicteePossible()){
          const mic = document.createElement('button');
          mic.type = 'button';
          mic.className = 'btn btn-secondary';
          mic.style.cssText = 'width:auto;padding:10px 12px;font-size:17px;margin:0;flex-shrink:0;';
          mic.textContent = '🎙️';
          mic.title = 'Dicter dans ' + th.nom;
          mic.addEventListener('click', () => dicterDans(t, mic));
          r.appendChild(mic);
        }
        b.appendChild(r);
        bloc.appendChild(b);
      });

    }else if(ch.type === 'cepc'){
      const l = document.createElement('label');
      l.textContent = ch.nom + ' — E, 0, 1, 2 ou 3';
      bloc.appendChild(l);

      const z = document.createElement('div');
      z.style.cssText = 'background:var(--navy);border:1px solid var(--line);border-radius:10px;padding:10px 12px;';
      CEPC_BLOCS.forEach(g => {
        const t = document.createElement('div');
        t.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-text);margin:8px 0 4px;';
        t.textContent = g.titre;
        z.appendChild(t);
        g.items.forEach(it => z.appendChild(ligneCepc(it.nom, it.valeurs)));
      });

      const tot = document.createElement('div');
      tot.id = 'cepcTotal';
      tot.style.cssText = 'margin-top:12px;padding-top:10px;border-top:1px solid var(--line);' +
        'font-size:15px;font-weight:700;color:var(--accent-text);';
      z.appendChild(tot);
      bloc.appendChild(z);
      setTimeout(majTotalCepc, 0);

    }else if(ch.type === 'photo'){
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.id = 'photo_' + ch.cle;
      inp.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
        'color:var(--cream);padding:11px;border-radius:10px;font-size:14px;';
      bloc.appendChild(inp);
      const apercu = document.createElement('div');
      apercu.id = 'apercu_' + ch.cle;
      apercu.style.cssText = 'margin-top:8px;';
      bloc.appendChild(apercu);
      const aide = document.createElement('div');
      aide.style.cssText = 'font-size:11px;color:var(--muted);margin-top:6px;line-height:1.4;';
      aide.textContent = "La photo reste sur ce téléphone : elle sert au moniteur pendant " +
        "le rendez-vous, elle n'est pas envoyée dans le bilan.";
      bloc.appendChild(aide);

      inp.addEventListener('change', () => {
        const f = inp.files && inp.files[0];
        apercu.innerHTML = '';
        if(!f) return;
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        img.style.cssText = 'max-width:100%;border-radius:10px;border:1px solid var(--line);';
        apercu.appendChild(img);
        champsManuels[ch.cle] = f.name;
      });

    }else if(ch.type === 'observations'){
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      const z = document.createElement('div');
      z.id = 'obsManuel';
      bloc.appendChild(z);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      b.style.cssText = 'margin-top:8px;padding:10px;font-size:13px;';
      b.textContent = '➕ Ajouter une observation';
      b.addEventListener('click', () => ajouterObservationManuelle(z));
      bloc.appendChild(b);
      ajouterObservationManuelle(z);

    }else{
      /* Texte libre, avec dictée possible */
      const l = document.createElement('label');
      l.textContent = ch.nom;
      bloc.appendChild(l);
      if(ch.aide){
        const a = document.createElement('div');
        a.style.cssText = 'font-size:11px;color:var(--muted);margin:-8px 0 6px;line-height:1.4;';
        a.textContent = ch.aide;
        bloc.appendChild(a);
      }
      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:8px;align-items:flex-start;';
      const t = document.createElement('textarea');
      t.rows = (ch.type === 'court') ? 1 : (ch.lignes || 6);
      t.id = 'man_' + ch.cle.replace('.', '_');
      t.style.cssText = 'flex:1;background:var(--navy);border:1px solid var(--line);' +
        'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:16px;' +
        'line-height:1.6;font-family:inherit;resize:vertical;margin:0;';
      r.appendChild(t);
      if(dicteePossible()){
        const mic = document.createElement('button');
        mic.type = 'button';
        mic.className = 'btn btn-secondary';
        mic.style.cssText = 'width:auto;padding:11px 13px;font-size:18px;margin:0;flex-shrink:0;';
        mic.textContent = '🎙️';
        mic.title = 'Dicter dans ce champ';
        mic.addEventListener('click', () => dicterDans(t, mic));
        r.appendChild(mic);
      }
      bloc.appendChild(r);
    }

    zone.appendChild(bloc);
  });

  /* Frise récupérée automatiquement */
  const aide = $('aideManuel');
  if(aide){
    aide.textContent = dicteePossible()
      ? "Remplis chaque rubrique. Le 🎙️ à côté d'un champ permet de dicter au lieu d'écrire."
      : "Remplis chaque rubrique en écrivant. La dictée demanderait Chrome sur Android, "
        + "mais tout le reste fonctionne normalement ici.";
  }

  const info = $('manuelInfo');
  const frise = dossier.frise || extraireFrise($('noteInterne').value);
  const versionApp = (document.querySelector('.version') || {}).textContent || '';
  info.innerHTML = '<strong>' + (eleve || '') + '</strong> · ' + modele.label +
    (versionApp ? ' · <span style="color:var(--muted);">' + versionApp + '</span>' : '') +
    (frise ? '<br>Frise reprise : ' + frise.replace(/</g,'&lt;') : '') +
    ((dossier.manoeuvres || []).length
      ? '<br>' + dossier.manoeuvres.length + ' manœuvre(s) déjà validée(s), reprises automatiquement'
      : '');

  $('recordView').style.display = 'none';
  $('resultView').style.display = 'none';
  $('manuelView').style.display = 'block';
  window.scrollTo(0, 0);
}

function ajouterObservationManuelle(zone){
  const d = document.createElement('div');
  d.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px;';
  d.innerHTML =
    '<input type="text" class="obsInsp" placeholder="Remarque de l\'inspecteur" style="margin-bottom:6px;">' +
    '<input type="text" class="obsRep" placeholder="Explication ou correction" style="margin:0;">';
  zone.appendChild(d);
}


/* Relève tout ce que le moniteur a saisi dans le formulaire */
function lireChampsManuels(){
  const modele = MODELES[$('modele').value];
  const champs = CHAMPS_MANUELS[modele.schema];
  if(!champs) return;

  champs.forEach(ch => {
    if(ch.type === 'manoeuvres' || ch.type === 'competences'){
      champsManuels[ch.cle] = Array.prototype.slice
        .call(document.querySelectorAll('.chManuel-' + ch.cle + ':checked'))
        .map(x => ({ nom: x.value, fait: true }));
    }else if(ch.type === 'themes'){
      const bouts = [];
      document.querySelectorAll('.themeErreur').forEach(t => {
        const v = t.value.trim();
        if(!v) return;
        const lignes = v.split('\n').map(x => x.trim()).filter(Boolean);
        bouts.push(t.getAttribute('data-theme') + '\n' +
                   lignes.map(x => (x.startsWith('•') ? x : '• ' + x)).join('\n'));
      });
      champsManuels[ch.cle] = bouts.join('\n\n');
    }else if(ch.type === 'cepc'){
      const cepc = {};
      document.querySelectorAll('.cepcNiveau').forEach(s => {
        if(s.value) cepc[s.getAttribute('data-comp')] = s.value;
      });
      champsManuels[ch.cle] = cepc;
    }else if(ch.type === 'observations'){
      const obs = [];
      document.querySelectorAll('#obsManuel > div').forEach(d => {
        const i = d.querySelector('.obsInsp');
        const r = d.querySelector('.obsRep');
        const vi = i ? i.value.trim() : '';
        const vr = r ? r.value.trim() : '';
        if(vi || vr) obs.push({ inspecteur: vi, reponse: vr });
      });
      champsManuels[ch.cle] = obs;
    }else if(ch.type !== 'ok' && ch.type !== 'photo' &&
             ch.type !== 'niveau' && ch.type !== 'ouinon'){
      const t = document.getElementById('man_' + ch.cle.replace('.', '_'));
      if(t) champsManuels[ch.cle] = t.value.trim();
    }
  });
}

/* Assemble le bilan à partir de ce qui a été saisi */
async function genererBilanManuel(){
  /* On relève d'abord tout ce que le moniteur a saisi */
  lireChampsManuels();

  const modeleCle = $('modele').value;
  const modele = MODELES[modeleCle];

  /* Un examen blanc renseigne déjà sa conclusion : on ne la redemande pas */
  const repris = Object.assign({}, contexteDepart || {});
  if(modeleCle === 'examen-blanc'){
    if(champsManuels.niveau === 'non'){
      repris.ebPasse = 'pasleniveau';
    }else if(champsManuels.niveau === 'oui'){
      const h = String(champsManuels.heuresAvant || '').trim();
      if(h === '' || h === '0'){
        repris.ebPasse = '3h';
      }else{
        repris.ebPasse = 'lecons';
        repris.ebLecons = h;
      }
    }
    if(champsManuels.aDate === 'oui' && !repris.examPermis) repris.examPermis = 'prevu';
    if(champsManuels.aDate === 'non' && !repris.examPermis) repris.examPermis = 'aprevoir';
  }

  /* Mise à jour des infos, comme à la fin d'un cours enregistré */
  const maj = await ouvrirQuestionnaireDepart(repris, 'Après ce cours', 'Terminer');
  if(maj){
    contexteDepart = maj;
    appliquerNoteQuestionnaire(noteDepuisQuestionnaire(maj));
  }

  const eleve = $('studentName').value.trim();
  let manoeuvresAvant = [];
  try{
    const d = await chargerDossierEleve(eleve);
    manoeuvresAvant = d.manoeuvres || [];
  }catch(e){}

  /* Les manœuvres du jour sont au format attendu par le constructeur */
  const liste = (champsManuels.manoeuvres || []).map(x => x.nom || x);

  /* Les clés « avant.carteSD » deviennent des objets imbriqués */
  const donnees = { manoeuvres: liste };
  Object.keys(champsManuels).forEach(k => {
    if(k.indexOf('.') === -1){ donnees[k] = champsManuels[k]; return; }
    const [pere, fils] = k.split('.');
    if(!donnees[pere]) donnees[pere] = {};
    donnees[pere][fils] = champsManuels[k];
  });

  let bilan;
  try{
    bilan = modele.build(donnees, {
      manoeuvresAvant: manoeuvresAvant,
      transcript: champsManuels.texteDicte || '',
      note: $('noteInterne').value.trim()
    });
  }catch(e){
    console.error('Composition du bilan :', e);
    await informer('Le bilan n\'a pas pu être composé.\n\nDétail : ' + (e && e.message ? e.message : e));
    return;
  }

  currentLessonMeta = {
    modeleLabel: modele.label,
    studentName: eleve,
    monitorName: $('monitorName').value.trim(),
    site: $('site').value,
    dateStr: $('lessonDate').value,
    noteInterne: $('noteInterne').value.trim(),
    ts: Date.now()
  };

  $('resultText').value = bilan;
  afficherNote($('noteInterne').value.trim());
  marquerExport(false);
  $('manuelView').style.display = 'none';
  $('resultView').style.display = 'block';
  window.scrollTo(0, 0);
  sauvegarderLocal(true);
}

function fermerBilanManuel(){
  modeManuel = false;
  $('manuelView').style.display = 'none';
  $('recordView').style.display = 'block';
  if(typeof afficherVue === 'function') afficherVue('cours', 'cours');
}


/* Le modèle doit correspondre à la boîte de l'élève : un élève BEA
   ne doit pas recevoir une fiche boîte manuelle, et inversement. */
const MODELE_EQUIVALENT = {
  'conduite-manuelle':      { bea: 'conduite-auto' },
  'conduite-auto':          { bv:  'conduite-manuelle' },
  'aac-manuelle':           { bea: 'aac-auto' },
  'aac-auto':               { bv:  'aac-manuelle' },
  'rdv-prealable-manuelle': { bea: 'rdv-prealable-auto' },
  'rdv-prealable-auto':     { bv:  'rdv-prealable-manuelle' },
  'simu-manuelle':          { bea: 'simu-auto' },
  'simu-auto':              { bv:  'simu-manuelle' },
  'eval-manuelle':          { bea: 'eval-auto' },
  'eval-auto':              { bv:  'eval-manuelle' }
};

function verifierBoiteModele(boite){
  const zone = $('alerteBoite');
  if(!zone) return;
  zone.style.display = 'none';
  zone.innerHTML = '';
  if(!boite) return;

  const actuel = $('modele').value;
  const equiv = MODELE_EQUIVALENT[actuel];
  if(!equiv || !equiv[boite]) return;      /* déjà le bon modèle */

  const cible = equiv[boite];
  if(!MODELES[cible]) return;

  const libelle = (boite === 'bea') ? 'boîte automatique (BEA)' : 'boîte manuelle (BV)';
  zone.style.display = 'block';
  zone.style.cssText = 'display:block;background:var(--warn-bg);border:1px solid var(--red);' +
    'border-radius:10px;padding:11px 12px;margin:-6px 0 14px;font-size:14px;line-height:1.5;';

  const t = document.createElement('div');
  t.innerHTML = '⚠️ Cet élève est en <strong>' + libelle + '</strong>, ' +
    'mais le modèle choisi ne correspond pas.';
  zone.appendChild(t);

  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-primary';
  b.style.cssText = 'margin-top:8px;font-size:14px;padding:11px;';
  b.textContent = '↔️ Passer sur « ' + MODELES[cible].label + ' »';
  b.addEventListener('click', () => {
    $('modele').value = cible;
    zone.style.display = 'none';
    showToast('Modèle adapté ✅');
  });
  zone.appendChild(b);
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-manuel.js'] = true;
