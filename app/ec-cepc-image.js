/* ============================================================
   ec-cepc-image.js
   Le bilan de compétences, dessiné comme sur RDV Permis.

   Le bilan lui-même est du texte : il part sur Messenger, en SMS
   ou par mail. Cette grille est donc une image à part, que le
   moniteur envoie juste après — l'élève retrouve exactement ce
   qu'il verra le jour de l'examen.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les couleurs du document officiel, pas celles de l'application :
   c'est sa ressemblance avec le vrai CEPC qui fait son intérêt. */
const CEPC_STYLE = {
  fond:        '#FFFFFF',
  bandeau:     '#EDF1F5',
  texte:       '#1A1A1A',
  libelle:     '#1B6AC9',
  titre:       '#0B2E4F',
  trait:       '#D3DCE6',
  caseVide:    '#FFFFFF',
  caseGrisee:  '#E6EAEE',
  choisi:      '#1568C8',
  choisiTexte: '#FFFFFF',
  elimine:     '#E5322D',
  favorable:   '#1568C8',
  observation: '#FFF6E5',
  obsBord:     '#E8A33D',
  obsTexte:    '#B26A00'
};

/* Dimensions, en points d'image. Doublées à la sortie pour rester
   nettes sur les écrans de téléphone. */
const CEPC_DIM = {
  largeur: 620, marge: 14, ligne: 30, ecart: 3,
  titreH: 26, sectionH: 22, caseL: 30, caseH: 22, caseEcart: 6
};


/* Dessine la grille et rend le canvas */
function dessinerCepc(cepc, observations){
  const D = CEPC_DIM;
  const S = CEPC_STYLE;
  const c = calculerCepc(cepc);

  /* Hauteur calculée d'avance : on ne peut pas agrandir un canvas
     déjà dessiné sans tout perdre. */
  let h = D.titreH + 16;
  CEPC_BLOCS.forEach(b => { h += D.sectionH + b.items.length * (D.ligne + D.ecart) + 8; });
  h += 20 + D.ligne + 16;                       /* Résultat */

  const obs = (observations || '').trim();
  const lignesObs = obs ? decouperPourCepc(obs, 78) : [];
  if(obs) h += 30 + lignesObs.length * 17 + 14;

  const ech = 2;                                /* netteté sur mobile */
  const cv = document.createElement('canvas');
  cv.width = D.largeur * ech;
  cv.height = Math.round(h) * ech;
  const g = cv.getContext('2d');
  g.scale(ech, ech);

  g.fillStyle = S.fond;
  g.fillRect(0, 0, D.largeur, h);

  let y = D.marge;

  /* ---- Titre ---- */
  g.fillStyle = S.titre;
  g.font = 'bold 13px Arial, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('Bilan de compétences', D.marge, y + 8);
  y += D.titreH;

  g.strokeStyle = S.trait;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, y - 6); g.lineTo(D.largeur, y - 6);
  g.stroke();

  /* ---- Les cinq blocs ---- */
  CEPC_BLOCS.forEach((bloc, iBloc) => {
    g.fillStyle = S.titre;
    g.font = 'bold 11px Arial, sans-serif';
    g.fillText(bloc.titre, D.marge, y + 10);

    /* La légende, une seule fois, en tête du premier bloc */
    if(iBloc === 0){
      g.fillStyle = '#8A94A0';
      g.font = '8px Arial, sans-serif';
      g.textAlign = 'right';
      g.fillText("Niveaux d'appréciation", D.largeur - D.marge, y + 10);
      g.textAlign = 'left';
    }
    y += D.sectionH;

    bloc.items.forEach((it, i) => {
      /* Une ligne sur deux est teintée, comme sur le document */
      if(i % 2 === 0){
        g.fillStyle = S.bandeau;
        g.fillRect(D.marge, y, D.largeur - 2 * D.marge, D.ligne);
      }

      const valeur = (cepc || {})[it.nom];
      const estElimine = (valeur === 'E');

      g.fillStyle = S.libelle;
      g.font = '10px Arial, sans-serif';
      g.fillText(coupeSiTropLong(g, it.nom, 300), D.marge + 8, y + D.ligne / 2);

      /* La mention rouge, à gauche des cases */
      let droite = D.largeur - D.marge - 8;
      const toutes = ['E', '0', '1', '2', '3'];
      const largeurCases = toutes.length * (D.caseL + D.caseEcart);

      if(estElimine){
        g.fillStyle = S.elimine;
        g.font = 'bold 9px Arial, sans-serif';
        g.textAlign = 'right';
        g.fillText('Résultat éliminatoire',
                   droite - largeurCases - 10, y + D.ligne / 2);
        g.textAlign = 'left';
      }

      /* Les cases, alignées à droite. Celles qui n'existent pas pour
         cette compétence restent grisées et vides, comme sur le
         document officiel. */
      const cases = (it.valeurs.indexOf('0.5') !== -1)
        ? ['', '0', '0,5', '1', '']
        : toutes.map(v => (it.valeurs.indexOf(v) !== -1 ? v : ''));

      let x = droite - largeurCases + D.caseEcart;
      cases.forEach((lab, k) => {
        const vraie = (it.valeurs.indexOf('0.5') !== -1)
          ? (lab === '0,5' ? '0.5' : lab)
          : lab;
        const active = lab !== '' && String(valeur) === String(vraie);
        const cy = y + (D.ligne - D.caseH) / 2;

        if(lab === ''){
          g.fillStyle = S.caseGrisee;
          g.fillRect(x, cy, D.caseL, D.caseH);
        }else{
          g.fillStyle = active
            ? (lab === 'E' ? S.elimine : S.choisi)
            : S.caseVide;
          g.fillRect(x, cy, D.caseL, D.caseH);
          g.strokeStyle = active ? (lab === 'E' ? S.elimine : S.choisi) : S.trait;
          g.strokeRect(x + .5, cy + .5, D.caseL - 1, D.caseH - 1);

          g.fillStyle = active ? S.choisiTexte
                              : (lab === 'E' ? S.libelle : S.libelle);
          g.font = (active ? 'bold ' : '') + '10px Arial, sans-serif';
          g.textAlign = 'center';
          g.fillText(lab, x + D.caseL / 2, cy + D.caseH / 2);
          g.textAlign = 'left';
        }
        x += D.caseL + D.caseEcart;
        void k;
      });

      y += D.ligne + D.ecart;
    });

    y += 8;
  });

  /* ---- Résultat ---- */
  g.strokeStyle = S.trait;
  g.beginPath();
  g.moveTo(0, y); g.lineTo(D.largeur, y);
  g.stroke();
  y += 12;

  g.fillStyle = S.titre;
  g.font = 'bold 11px Arial, sans-serif';
  g.fillText('Résultat', D.marge, y + 8);
  y += 24;

  g.fillStyle = S.libelle;
  g.font = '10px Arial, sans-serif';
  g.fillText('Total général', D.marge + 8, y + D.caseH / 2);

  const verdict = c.elimine ? 'ÉLIMINATOIRE'
                : (c.favorable ? 'FAVORABLE' : 'INSUFFISANT');
  const couleur = c.elimine ? S.elimine
                : (c.favorable ? S.favorable : S.elimine);
  const note = c.elimine ? 'E' : String(c.total).replace('.', ',');

  const xNote = D.largeur - D.marge - 8 - D.caseL;
  g.fillStyle = couleur;
  g.fillRect(xNote, y, D.caseL, D.caseH);
  g.fillStyle = '#FFFFFF';
  g.font = 'bold 10px Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText(note, xNote + D.caseL / 2, y + D.caseH / 2);

  g.fillStyle = couleur;
  g.font = 'bold 10px Arial, sans-serif';
  g.textAlign = 'right';
  g.fillText(verdict, xNote - 10, y + D.caseH / 2);
  g.textAlign = 'left';
  y += D.ligne + 12;

  /* ---- Observations ---- */
  if(obs){
    const hb = 22 + lignesObs.length * 17;
    g.fillStyle = S.observation;
    g.fillRect(D.marge, y, D.largeur - 2 * D.marge, hb);
    g.fillStyle = S.obsBord;
    g.fillRect(D.marge, y, 3, hb);

    g.fillStyle = S.obsTexte;
    g.font = 'bold 10px Arial, sans-serif';
    g.fillText('⚠ Observations', D.marge + 12, y + 13);

    g.fillStyle = S.libelle;
    g.font = '10px Arial, sans-serif';
    lignesObs.forEach((l, i) => {
      g.fillText(l, D.marge + 12, y + 30 + i * 17);
    });
  }

  return cv;
}


/* Coupe un libellé trop long plutôt que de le laisser déborder
   sur les cases de notation. */
function coupeSiTropLong(g, texte, maxi){
  let t = String(texte || '');
  if(g.measureText(t).width <= maxi) return t;
  while(t.length > 4 && g.measureText(t + '…').width > maxi) t = t.slice(0, -1);
  return t + '…';
}

/* Découpe les observations en lignes d'une largeur donnée */
function decouperPourCepc(texte, parLigne){
  const mots = String(texte || '').split(/\s+/).filter(Boolean);
  const out = [];
  let l = '';
  mots.forEach(m => {
    if((l + ' ' + m).trim().length > parLigne){ out.push(l.trim()); l = m; }
    else l = (l + ' ' + m).trim();
  });
  if(l) out.push(l);
  return out.slice(0, 6);            /* six lignes suffisent */
}


/* ============================================================
   L'IMAGE, PROPOSÉE AU MONITEUR
   ============================================================ */

/* Le bouton sous le bilan, quand il s'agit d'un examen blanc */
function proposerImageCepc(cepc, observations, eleve){
  const zone = $('resultActions') || $('resultView');
  if(!zone) return;

  const ancien = document.getElementById('btnImageCepc');
  if(ancien) ancien.remove();

  /* Rien à dessiner si aucune compétence n'est notée */
  const rempli = Object.keys(cepc || {}).some(k => (cepc[k] || '') !== '');
  if(!rempli) return;

  const b = document.createElement('button');
  b.id = 'btnImageCepc';
  b.className = 'btn btn-secondary';
  b.style.cssText = 'margin-top:10px;padding:13px;font-size:14px;';
  b.textContent = '📸 Image du bilan de compétences';
  b.title = "À envoyer juste après le bilan : l'élève retrouve la grille " +
            "telle qu'il la verra le jour de l'examen.";
  b.addEventListener('click', () => ouvrirImageCepc(cepc, observations, eleve));
  zone.appendChild(b);
}


function ouvrirImageCepc(cepc, observations, eleve){
  let cv;
  try{
    cv = dessinerCepc(cepc, observations);
  }catch(e){
    showToast("L'image n'a pas pu être dessinée : " + e.message);
    return;
  }

  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(680px, 96vw);max-height:90vh;overflow-y:auto;';

  const t = document.createElement('h3');
  t.textContent = 'Bilan de compétences';
  boite.appendChild(t);

  const a = document.createElement('div');
  a.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.5;';
  a.textContent = "À envoyer juste après le bilan, dans la même conversation : " +
    "le bilan est du texte, cette grille est une image.";
  boite.appendChild(a);

  const img = document.createElement('img');
  img.src = cv.toDataURL('image/png');
  img.style.cssText = 'width:100%;border:1px solid var(--line);border-radius:8px;' +
    'background:#fff;';
  boite.appendChild(img);

  const nom = 'CEPC-' + String(eleve || 'eleve').replace(/[^\w-]+/g, '-') + '.png';

  const r = document.createElement('div');
  r.className = 'btn-row';
  r.style.marginTop = '14px';

  /* Le partage direct : c'est le geste utile sur téléphone */
  const bPart = document.createElement('button');
  bPart.className = 'btn btn-primary';
  bPart.textContent = '📤 Partager';
  bPart.addEventListener('click', async () => {
    try{
      const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
      const fichier = new File([blob], nom, { type: 'image/png' });
      if(navigator.canShare && navigator.canShare({ files: [fichier] })){
        await navigator.share({ files: [fichier], title: 'Bilan de compétences' });
      }else{
        telechargerImageCepc(cv, nom);
        showToast('Partage indisponible : image téléchargée ✅');
      }
    }catch(e){
      if(e && e.name === 'AbortError') return;    /* partage annulé */
      telechargerImageCepc(cv, nom);
    }
  });
  r.appendChild(bPart);

  const bTel = document.createElement('button');
  bTel.className = 'btn btn-secondary';
  bTel.textContent = '⬇️ Télécharger';
  bTel.addEventListener('click', () => telechargerImageCepc(cv, nom));
  r.appendChild(bTel);

  const bFer = document.createElement('button');
  bFer.className = 'btn btn-secondary';
  bFer.textContent = 'Fermer';
  bFer.addEventListener('click', () => document.body.removeChild(fond));
  r.appendChild(bFer);

  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
}


function telechargerImageCepc(cv, nom){
  try{
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }catch(e){
    showToast('Téléchargement impossible : ' + e.message);
  }
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-cepc-image.js'] = true;
