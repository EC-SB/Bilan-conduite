/* Déployé le 04/09/2026 à 08:02 — v850 */
/* ============================================================
   ec-places.js
   Réglage des mois, semaines et jours ouverts.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* ------------------------------------------------------------
   « p1 » ET « p2 » — LE JOUR OÙ ON PREND LES PLACES

   La règle habituelle est écrite dans ec-postpermis : 1ᵉʳ mardi du
   mois précédent pour la 1ʳᵉ quinzaine, 2ᵉ mardi pour la 2ᵉ. Elle
   suffit onze mois sur douze.

   Chrystel, le 3 septembre : « il y a eu un bug à la préfecture, on
   pourra prendre les places de la première quinzaine d'octobre
   mardi prochain et celles de la deuxième quinzaine mardi
   15 septembre. » La règle ne sait pas dire ça — elle connaît le
   calendrier, pas la préfecture.

   D'où ces deux dates, VIDES PAR DÉFAUT. Vide veut dire « la règle
   s'applique » ; remplie veut dire « la préfecture a décidé
   autrement », et c'est elle qui gagne.

   ⚠️ ELLES VIVENT ICI, ET PAS DANS UN ÉCRAN À ELLES. « 15 places à
   prendre le 8 septembre pour la 2ᵉ quinzaine d'octobre » est UNE
   information : la couper en deux écrans, c'est la faute qu'on
   répare partout ailleurs dans ce dossier. Et comme le mois
   disparaît tout seul une fois écoulé, ses deux dates partent avec
   lui — il n'y a jamais rien à nettoyer.
   ------------------------------------------------------------ */
function moisVide(iso){
  return { mois: iso || '', p1:'', p2:'',
           /* 🚗 Catégorie B */
           total:'', q1:'', q2:'', s1:'', s2:'', etp:'', mT:'', m1:'', m2:'',
           /* 🏍️ Catégorie A — mêmes champs, préfixés « a » */
           aTotal:'', aQ1:'', aQ2:'', aS1:'', aS2:'', aEtp:'',
           aMT:'', aM1:'', aM2:'',
           semaines: [] };
}

/* ------------------------------------------------------------
   LES DEUX CATÉGORIES, DÉCRITES UNE SEULE FOIS

   Chrystel, le 4 septembre : « on duplique pour le A sur le même
   principe », et « les ETP A sont différents des ETP B ».

   « Le même principe » ne veut pas dire « le même fichier recopié ».
   Un second module moto, ce serait la règle de la préfecture écrite
   à deux endroits — et le jour où elle change sa façon de compter,
   une seule des deux copies serait corrigée. C'est très exactement
   la faute qu'on répare partout ailleurs dans ce dossier.

   Ici, une seule table dit où chaque catégorie range ses nombres.
   Le calcul, le dessin et le rappel de prise la lisent tous les
   trois : ils ne savent pas s'ils travaillent sur une voiture ou
   sur une moto, et c'est ce qui garantit qu'ils feront pareil.
   ------------------------------------------------------------ */
function categoriePlaces(cle){
  if(String(cle || '') === 'a'){
    return { cle:'a', nom:'Catégorie A', court:'A', emoji:'🏍️',
             teinte:'var(--accent-text)', etpEcole:'etpA',
             s1:'aS1', s2:'aS2', etp:'aEtp',
             total:'aTotal', q1:'aQ1', q2:'aQ2',
             mT:'aMT', m1:'aM1', m2:'aM2' };
  }
  return { cle:'b', nom:'Catégorie B', court:'B', emoji:'🚗',
           teinte:'var(--accent-text)', etpEcole:'etp',
           s1:'s1', s2:'s2', etp:'etp',
           total:'total', q1:'q1', q2:'q2',
           mT:'mT', m1:'m1', m2:'m2' };
}

/* Les deux, dans l'ordre où elles s'affichent : B puis A. */
function categoriesPlaces(){
  return [categoriePlaces('b'), categoriePlaces('a')];
}

/* ------------------------------------------------------------
   LE CALCUL DE LA PRÉFECTURE — « s1 », « s2 », « etp »

   Chrystel, le 4 septembre. Le mail de la préfecture donne des
   SEUILS CUMULÉS, en deux temps :

     « Pour la catégorie B, le seuil est désormais fixé à 5 avec
       une publication en deux temps :
         · Mardi 8 septembre  : seuil de 2,5
         · Mardi 15 septembre : seuil porté à 5 »

   Donc la 2ᵉ quinzaine ne vaut pas 5 : elle vaut 5 − 2,5. « Pour
   certains c'est compliqué de faire une soustraction ici au
   bureau » — c'est la raison d'être de ces deux cases. On RECOPIE
   ce que le mail écrit (2,5 puis 5), la machine soustrait.

   Puis chaque tranche est multipliée par le total des ETP B de
   l'école, relevé sur le site rendez-vous permis. Un seul ETP pour
   les deux centres ; il change tous les deux ou trois mois.

   ⚠️ CHAQUE MOIS GARDE L'ETP AVEC LEQUEL IL A ÉTÉ CALCULÉ (« m.etp »),
   et non l'ETP du jour. Sinon, changer l'ETP en décembre
   réécrirait le nombre de places d'octobre — des places déjà
   prises. Quand les deux diffèrent, l'écran le DIT et propose de
   recalculer ; il ne le fait jamais tout seul.
   ------------------------------------------------------------ */

/* Un nombre saisi à la française : « 2,5 » vaut 2,5. null si vide. */
function nombreFr(v){
  const t = String(v == null ? '' : v).replace(',', '.').trim();
  if(!t) return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

/* Écrit un nombre à la française : 8.75 → « 8,75 » */
function texteFr(n){
  if(n == null || isNaN(n)) return '';
  return String(Math.round(n * 1e6) / 1e6).replace('.', ',');
}

/* L'arrondi retenu par Chrystel : au plus proche, la moitié vers
   le haut. « 8,51 = 9, 8,49 = 8 » — et donc 8,5 = 9.

   ⚠️ Le passage par 1e6 n'est pas de la coquetterie : en virgule
   flottante, 2,5 × 3,4 vaut 8,499999999999998. Sans lui, ce cas
   tomberait à 8 alors que la règle dit 9. */
function arrondiPlaces(x){
  if(x == null || isNaN(x)) return null;
  return Math.floor(Math.round(x * 1e6) / 1e6 + 0.5);
}

/* Le calcul complet d'un mois, ou null tant qu'il manque un des
   trois nombres. Aucune écriture ici : cette fonction ne fait que
   dire ce que le calcul donne — c'est l'écran qui décide d'en
   tenir compte ou de garder la valeur tapée à la main. */
function calculPlacesDuMois(m, cle){
  if(!m) return null;
  const c = categoriePlaces(cle);
  const s1 = nombreFr(m[c.s1]), s2 = nombreFr(m[c.s2]), etp = nombreFr(m[c.etp]);
  if(s1 == null || s2 == null || etp == null) return null;
  const tranche2 = s2 - s1;
  const exact1 = s1 * etp, exact2 = tranche2 * etp, exactTotal = s2 * etp;
  const q1 = arrondiPlaces(exact1), q2 = arrondiPlaces(exact2);
  return {
    s1: s1, s2: s2, etp: etp, tranche2: tranche2,
    exact1: exact1, exact2: exact2, exactTotal: exactTotal,
    q1: q1, q2: q2,
    total: q1 + q2,
    totalDuSeuil: arrondiPlaces(exactTotal),
    /* Le mail lu à l'envers : 2,5 en second et 5 en premier. Ça
       donnerait une 2ᵉ quinzaine négative — on le dit au lieu de
       poser un nombre absurde dans la case. */
    negatif: tranche2 < 0
  };
}

/* Pose le résultat du calcul dans les cases restées automatiques.

   ⚠️ Elle ne touche JAMAIS une case marquée « à la main ». C'est la
   règle demandée le 4 septembre : « laisse-moi la possibilité de
   mettre à la main quand même le résultat des calculs », et rien ne
   réécrit cette valeur tout seul — ni un seuil corrigé, ni un
   rechargement, ni un changement d'ETP. Seul le ↩︎ rend la case au
   calcul. */
function poserCalcul(m, cle){
  const c = categoriePlaces(cle);
  const r = calculPlacesDuMois(m, cle);
  if(!r || r.negatif) return;
  if(String(m[c.m1] || '') !== 'main') m[c.q1] = String(r.q1);
  if(String(m[c.m2] || '') !== 'main') m[c.q2] = String(r.q2);
  if(String(m[c.mT] || '') !== 'main') m[c.total] = String(r.total);
}

/* Le nombre de places d'une quinzaine, catégorie A. La B a sa
   propre fonction (« placesDeLaQuinzaine »), lue par le bandeau et
   le rendez-vous post-permis ; la A n'est lue que par le cadre de
   🏍️ Permis moto et par le rappel de prise. */
function placesAdeLaQuinzaine(isoMois, quinzaine){
  if(typeof placesConfig === 'undefined' || !placesConfig) return '';
  const m = (placesConfig.mois || [])
    .find(x => String(x.mois || '') === String(isoMois || ''));
  if(!m) return '';
  return String((quinzaine === 1 ? m.aQ1 : m.aQ2) || '').trim();
}

/* Les jours moto d'une semaine : HC (plateau) et CIR (circulation).

   ⚠️ PAS DE DISTINCTION DE CENTRE, et c'est un choix de Chrystel
   confirmé le 4 septembre — contrairement aux jours voiture, qui
   se comptent séparément à Saint-Brieuc et à Loudéac. */
function joursMotoDeLaSemaine(w){
  const n = v => { const x = nombreFr(v); return x == null ? 0 : x; };
  return { hc: n(w && w.hc), cir: n(w && w.cir) };
}

/* « 2,5 » et non « 2.5 » — une demi-journée s'écrit à la française.
   Homonyme volontaire de « nbFr » d'ec-permis-listes : celle-ci vit
   ici parce que le réglage des places se charge sans lui. */
function nbFrPlaces(n){
  const x = Number(n) || 0;
  return String(Math.round(x * 100) / 100).replace('.', ',');
}

/* La date de prise réglée à la main pour une quinzaine d'un mois,
   ou '' si c'est la règle qui s'applique.

   Lue ICI et nulle part ailleurs : ec-postpermis l'appelle, le
   bandeau l'appelle. Trois lectures du même réglage finiraient par
   ne pas être d'accord. */
function priseReglee(isoMois, quinzaine){
  if(typeof placesConfig === 'undefined' || !placesConfig) return '';
  const m = (placesConfig.mois || [])
    .find(x => String(x.mois || '') === String(isoMois || ''));
  if(!m) return '';
  const v = String((quinzaine === 1 ? m.p1 : m.p2) || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}

/* Le nombre de places d'une quinzaine, tel que le bureau l'a saisi.
   '' quand il n'a pas encore été renseigné — et le bandeau le dit
   plutôt que d'afficher un zéro qui ferait croire à zéro place. */
function placesDeLaQuinzaine(isoMois, quinzaine){
  if(typeof placesConfig === 'undefined' || !placesConfig) return '';
  const m = (placesConfig.mois || [])
    .find(x => String(x.mois || '') === String(isoMois || ''));
  if(!m) return '';
  return String((quinzaine === 1 ? m.q1 : m.q2) || '').trim();
}

function chargerPlaces(brut){
  placesConfig = { mois: [], etp: '', etpA: '' };
  try{
    const o = brut ? JSON.parse(brut) : null;
    if(!o || typeof o !== 'object') return;

    /* ⚠️ LES ETP DE L'ÉCOLE SE RELISENT AUSSI.
       Ils vivent à la racine, à côté de « mois ». Oublier ces deux
       lignes les ferait disparaître au premier rechargement : on
       les aurait saisis, enregistrés, et ils ne seraient plus là —
       sans message, sans erreur, exactement le genre de perte
       qu'on répare ailleurs dans ce dossier. */
    if(o.etp != null) placesConfig.etp = String(o.etp);
    if(o.etpA != null) placesConfig.etpA = String(o.etpA);

    if(Array.isArray(o.mois)){
      placesConfig.mois = o.mois.map(m => Object.assign(moisVide(), m,
        { semaines: Array.isArray(m.semaines) ? m.semaines : [] }));
    }else if(o.mois || o.total || (o.semaines && o.semaines.length)){
      /* Ancien format à un seul mois */
      placesConfig.mois = [Object.assign(moisVide(), o,
        { semaines: Array.isArray(o.semaines) ? o.semaines : [] })];
    }
  }catch(e){}
  placesConfig.mois.sort((a, b) => String(a.mois).localeCompare(String(b.mois)));
}

/* Retire les semaines terminées et les mois écoulés.
   Renvoie true si quelque chose a été retiré, pour enregistrer ensuite. */
function nettoyerPeriodesEchues(){
  const auj = todayLocal();
  const moisCourant = auj.slice(0, 7);
  let modifie = false;

  placesConfig.mois.forEach(m => {
    const avant = (m.semaines || []).length;
    /* Une semaine disparaît le lendemain de sa date de fin */
    m.semaines = (m.semaines || []).filter(w => !w.au || w.au >= auj);
    if(m.semaines.length !== avant) modifie = true;
  });

  const avantMois = placesConfig.mois.length;
  /* Un mois disparaît quand il est entièrement écoulé */
  placesConfig.mois = placesConfig.mois.filter(m => !m.mois || m.mois >= moisCourant);
  if(placesConfig.mois.length !== avantMois) modifie = true;

  return modifie;
}

/* Toutes les semaines, tous mois confondus */
function toutesSemaines(){
  const out = [];
  placesConfig.mois.forEach(m => (m.semaines || []).forEach(w => out.push(w)));
  return out;
}

async function enregistrerPlaces(){
  const valeur = JSON.stringify(placesConfig);
  await appelPrep({ action:'configSet', cle:'places', valeur: valeur });

  /* ⚠️ LE CACHE DU BUREAU TIENT TRENTE SECONDES, ET IL GAGNAIT.

     « Les champs Prise le ne se sauvegardent pas. »

     Ils partaient très bien. C'est le RETOUR qui les écrasait : le
     bouton 💾 enregistre, puis rappelle « afficherBureau », qui
     relit l'état du bureau — et « chargerBureau » rend la réponse
     gardée en cache pendant trente secondes, donc CELLE D'AVANT
     L'ENREGISTREMENT. « chargerPlaces » reposait cette ancienne
     configuration par-dessus la neuve, et l'écran se redessinait
     sans les dates.

     Pire : si « nettoyerPeriodesEchues » trouvait ensuite une
     période à retirer, il RENVOYAIT cette version périmée au
     classeur. Ce n'était plus un affichage trompeur, c'était une
     perte pour de bon.

     Une même chose lue à deux endroits — la configuration qu'on
     vient d'écrire, et sa copie de trente secondes — et c'est la
     mauvaise qui gagnait. On met donc le cache à jour avec ce
     qu'on vient d'enregistrer : il dit la vérité au lieu d'être
     seulement jeune. */
  try{
    if(typeof cacheBureau !== 'undefined' && cacheBureau && cacheBureau.data){
      cacheBureau.data.places = valeur;
    }
  }catch(e){ /* pas de cache : rien à corriger */ }
}

/* Le numéro de semaine ISO : c'est ainsi que la préfecture
   et les plannings désignent les périodes. */
function numeroSemaine(iso){
  if(!iso) return 0;
  const d = new Date(iso + 'T12:00:00');
  if(isNaN(d)) return 0;
  /* Norme ISO 8601 : la semaine 1 est celle du premier jeudi */
  const j = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const jour = j.getUTCDay() || 7;
  j.setUTCDate(j.getUTCDate() + 4 - jour);
  const debutAn = new Date(Date.UTC(j.getUTCFullYear(), 0, 1));
  return Math.ceil(((j - debutAn) / 86400000 + 1) / 7);
}

/* « du mardi 1 au vendredi 4 septembre — S36 » */
function libelleSemaine(w){
  if(!w.du && !w.au) return 'Semaine à définir';
  const fmt = (iso, avecMois) => {
    if(!iso) return '?';
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', avecMois
      ? { weekday:'long', day:'numeric', month:'long' }
      : { weekday:'long', day:'numeric' });
  };

  /* Le numéro : celui du début, et celui de fin s'il diffère */
  const n1 = numeroSemaine(w.du);
  const n2 = numeroSemaine(w.au);
  const num = !n1 ? ''
    : (n2 && n2 !== n1) ? '  ·  S' + n1 + '–S' + n2
    : '  ·  S' + n1;

  return 'du ' + fmt(w.du, false) + ' au ' + fmt(w.au, true) + num;
}

/* Semaines de travail (lundi→vendredi) d'un mois donné */
function semainesDuMois(isoMois){
  if(!isoMois) return [];
  const [an, mo] = isoMois.split('-').map(Number);
  if(!an || !mo) return [];
  const p2 = n => String(n).padStart(2, '0');
  const dernier = new Date(an, mo, 0).getDate();
  const out = [];
  let jour = 1;
  while(jour <= dernier){
    const d = new Date(an, mo - 1, jour);
    const js = d.getDay();                       /* 0 dimanche, 6 samedi */
    if(js === 0 || js === 6){ jour++; continue; }
    /* Début de bloc : on va jusqu'au vendredi ou à la fin du mois */
    const debut = jour;
    let fin = jour;
    while(fin + 1 <= dernier){
      const suivant = new Date(an, mo - 1, fin + 1).getDay();
      if(suivant === 0 || suivant === 6) break;
      fin++;
    }
    out.push({
      du: an + '-' + p2(mo) + '-' + p2(debut),
      au: an + '-' + p2(mo) + '-' + p2(fin),
      sb: '', lo: '',            /* jours voiture, par centre */
      hc: '', cir: ''            /* jours moto, sans centre */
    });
    jour = fin + 1;
  }
  return out;
}

function afficherPlaces(stats){
  const zone = $('blocPlaces');
  if(!zone) return;
  zone.innerHTML = '';

  const nb = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
  const libMois = iso => iso
    ? new Date(iso + '-15T12:00:00').toLocaleDateString('fr-FR', { month:'long', year:'numeric' })
    : 'Mois non renseigné';

  /* Un récapitulatif par mois configuré */
  if(!placesConfig.mois.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Aucun mois configuré — utilise « Régler les places » ci-dessous.';
    zone.appendChild(v);
  }

  placesConfig.mois.forEach(m => {
    const st = stats.parMois[m.mois] ||
               { prevus:0, remplacements:0, fantomes:0, aDonner:0, centres:{} };
    const restant = nb(m.total) - st.prevus;

    const r = document.createElement('div');
    r.style.cssText = 'background:var(--navy);border:1px solid var(--line);border-radius:10px;' +
      'padding:12px;margin-bottom:10px;font-size:14px;line-height:1.7;';
    r.innerHTML =
      '<div style="font-size:15px;font-weight:700;margin-bottom:6px;text-transform:capitalize;">' +
        '📊 ' + libMois(m.mois) + '</div>' +
      '<div><strong>' + st.prevus + '</strong> candidat(s) prévu(s) sur <strong>' +
        (m.total || '?') + '</strong> place(s)' +
        (m.total ? ' — <span style="color:' + (restant < 0 ? 'var(--red)' : 'var(--accent-text)') +
          ';font-weight:700;">' +
          (restant >= 0 ? restant + ' élève(s) à prévoir' : Math.abs(restant) + ' en trop') +
          '</span>' : '') + '</div>' +
      ((m.q1 || m.q2)
        ? '<div style="color:var(--muted);font-size:13px;">🚗 1ʳᵉ quinzaine : ' + (m.q1 || '?') +
          ' · 2ᵉ quinzaine : ' + (m.q2 || '?') + '</div>'
        : '') +
      /* Les places A s'AFFICHENT, elles ne se comparent pas à un
         comptage : « je fais à la main, je n'en ai pas beaucoup »
         (Chrystel, 4 septembre). Annoncer « X candidats prévus sur
         Y » sans savoir qui est placé sur quelle date moto, ce
         serait afficher un chiffre faux avec l'aplomb d'un vrai. */
      ((m.aQ1 || m.aQ2 || m.aTotal)
        ? '<div style="color:var(--muted);font-size:13px;">🏍️ ' +
          (m.aTotal ? '<strong>' + m.aTotal + '</strong> place(s) · ' : '') +
          '1ʳᵉ quinzaine : ' + (m.aQ1 || '?') +
          ' · 2ᵉ quinzaine : ' + (m.aQ2 || '?') + '</div>'
        : '') +
      '<div>🔄 <strong>' + st.remplacements + '</strong> remplacement(s) · ' +
        '👻 <strong>' + st.fantomes + '</strong> place(s) fantôme(s)' +
        (st.aDonner ? ' · 🏫 <strong>' + st.aDonner + '</strong> à donner à une autre AE' : '') +
      '</div>' +
      /* La répartition par centre d'examen */
      (Object.keys(st.centres || {}).length
        ? '<div style="color:var(--muted);font-size:13px;">🏁 ' +
          Object.keys(st.centres).sort().map(function(x){
            return x + ' : <strong style="color:var(--cream);">' + st.centres[x] + '</strong>';
          }).join(' · ') + '</div>'
        : '');

    if((m.semaines || []).length){
      let tsb = 0, tlo = 0, thc = 0, tcir = 0;
      m.semaines.forEach(w => {
        tsb += nb(w.sb); tlo += nb(w.lo);
        const jm = joursMotoDeLaSemaine(w);
        thc += jm.hc; tcir += jm.cir;
      });
      const s = document.createElement('div');
      s.style.cssText = 'margin-top:8px;padding-top:8px;border-top:1px solid var(--line);' +
        'font-size:13px;line-height:1.8;';
      s.innerHTML = '<div style="font-weight:700;margin-bottom:2px;">Jours ouverts à la prise de date</div>' +
        m.semaines.map(w => {
          const n = (stats.parSemaine && stats.parSemaine[w.du + '>' + w.au]) || 0;
          const jm = joursMotoDeLaSemaine(w);
          return '• ' + libelleSemaine(w) + '<br>' +
            '&nbsp;&nbsp;🚗 <strong>' + (w.sb || 0) +
            '</strong> j Saint-Brieuc · <strong>' + (w.lo || 0) + '</strong> j Loudéac' +
            ' · <span style="color:' + (n ? 'var(--accent-text)' : 'var(--muted)') + ';">' +
            n + ' examen' + (n > 1 ? 's' : '') + ' prévu' + (n > 1 ? 's' : '') + '</span>' +
            /* Une semaine sans jour moto ne se tait pas : elle le
               dit. Un blanc se lit « je n'ai pas regardé », un
               « 0 j » se lit « il n'y en a pas ». */
            '<br>&nbsp;&nbsp;🏍️ <strong>' + nbFrPlaces(jm.hc) + '</strong> j HC · ' +
            '<strong>' + nbFrPlaces(jm.cir) + '</strong> j CIR';
        }).join('<br>') +
        '<div style="margin-top:4px;color:var(--muted);">Total : 🚗 ' + nbFrPlaces(tsb) +
        ' j Saint-Brieuc · ' + nbFrPlaces(tlo) + ' j Loudéac — 🏍️ ' + nbFrPlaces(thc) +
        ' j HC · ' + nbFrPlaces(tcir) + ' j CIR</div>';
      r.appendChild(s);
    }

    /* Candidats sans mois reconnu */
    zone.appendChild(r);
  });

  if(stats.horsMois){
    const h = document.createElement('div');
    h.style.cssText = 'background:var(--warn-bg);border:1px solid var(--red);border-radius:10px;' +
      'padding:10px 12px;margin-bottom:10px;font-size:13px;color:var(--warn-text);';
    h.textContent = '⚠️ ' + stats.horsMois + ' candidat(s) sur un mois non configuré.';
    zone.appendChild(h);
  }

  /* ---- Réglage ---- */
  const det = document.createElement('details');
  det.innerHTML = '<summary style="cursor:pointer;color:var(--accent-text);font-weight:700;' +
    'font-size:14px;">⚙️ Régler les places disponibles</summary>';
  const corps = document.createElement('div');
  corps.className = 'mois-places';
  corps.style.cssText = 'margin-top:12px;';
  det.appendChild(corps);
  zone.appendChild(det);

  function dessinerTout(){
    corps.innerHTML = '';

    /* ---- Les ETP de l'école : deux cases, tout en haut ----
       Un seul ETP par catégorie pour Saint-Brieuc et Loudéac
       (Chrystel, 4 septembre), relevé sur le site rendez-vous permis,
       changé tous les deux ou trois mois. Et « les ETP A sont
       différents des ETP B » : deux cases, jamais une.

       Ils vivent ICI et nulle part ailleurs : les retaper dans chaque
       mois, c'est la même chose écrite à douze endroits — et c'est le
       mauvais qui finirait par gagner. */
    const zEtp = document.createElement('div');
    zEtp.style.cssText = 'border:1px solid var(--line);border-radius:12px;' +
      'padding:12px;margin-bottom:14px;';
    zEtp.innerHTML =
      '<label>🚗 Total de nos ETP B <span style="font-weight:400;color:var(--muted);">' +
        '(site rendez-vous permis)</span></label>' +
      '<input type="text" class="etpEcole" inputmode="decimal" value="' +
        (placesConfig.etp || '') + '">' +
      '<label style="margin-top:8px;">🏍️ Total de nos ETP A ' +
        '<span style="font-weight:400;color:var(--muted);">(moto)</span></label>' +
      '<input type="text" class="etpEcoleA" inputmode="decimal" value="' +
        (placesConfig.etpA || '') + '">' +
      '<div style="font-size:11px;color:var(--muted);line-height:1.5;margin-top:2px;">' +
        'Servent à tous les mois. Les changer ici ne retouche aucun mois déjà ' +
        'calculé — chaque mois garde l’ETP avec lequel il a été fait, et ' +
        'te propose de le recalculer si tu veux.</div>';
    /* Chaque mois dépose ici de quoi se repeindre. Changer un ETP
       touche tous les mois à la fois — mais en repeignant, pas en
       redessinant : sinon la case qu'on vient de quitter disparaît
       sous le doigt qui allait ailleurs. */
    const repeindre = [];
    const surEtp = (sel, cle) => {
      zEtp.querySelector(sel).addEventListener('input', e => {
        placesConfig[cle] = e.target.value.trim();
        repeindre.forEach(f => { try{ f(); }catch(err){} });
      });
    };
    surEtp('.etpEcole', 'etp');
    surEtp('.etpEcoleA', 'etpA');
    corps.appendChild(zEtp);

    placesConfig.mois.forEach((m, im) => {
      const bloc = document.createElement('div');
      bloc.style.cssText = 'border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:14px;';

      const tete = document.createElement('div');
      tete.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:10px;';
      const im2 = document.createElement('input');
      im2.type = 'month';
      im2.value = m.mois || '';
      im2.style.cssText = 'flex:1;margin:0;';
      im2.addEventListener('change', () => { m.mois = im2.value; });
      const bGen = document.createElement('button');
      bGen.className = 'btn btn-secondary';
      bGen.style.cssText = 'width:auto;padding:11px 12px;font-size:13px;white-space:nowrap;';
      bGen.textContent = '🗓️ Générer';
      bGen.addEventListener('click', async () => {
        if(!m.mois){ showToast('Choisis un mois.'); return; }
        const nouvelles = semainesDuMois(m.mois);
        if((m.semaines || []).length &&
           !await confirmer('Remplacer les semaines de ce mois ?')) return;
        m.semaines = nouvelles;
        dessinerTout();
      });
      tete.appendChild(im2);
      tete.appendChild(bGen);
      bloc.appendChild(tete);

      /* ------------------------------------------------------------
         UN BLOC PAR CATÉGORIE — ÉCRIT UNE FOIS, DESSINÉ DEUX FOIS

         « On duplique pour le A sur le même principe » (Chrystel,
         4 septembre). Dupliquer l'ÉCRAN, pas le CODE : ce bloc ne
         sait pas s'il dessine une voiture ou une moto, il lit la
         table des catégories. Le jour où la préfecture change sa
         façon de compter, il n'y a qu'un endroit à corriger.
         ------------------------------------------------------------ */
      function blocCategorie(cat){
        const zone = document.createElement('div');
        zone.style.cssText = 'border-left:3px solid var(--line);padding-left:10px;' +
          'margin-bottom:14px;';

        const titre = document.createElement('div');
        titre.style.cssText = 'font-size:13.5px;font-weight:700;margin-bottom:7px;';
        titre.textContent = cat.emoji + ' ' + cat.nom;
        zone.appendChild(titre);

        /* ---- Ce que dit le mail de la préfecture ---- */
        const mail = document.createElement('div');
        mail.style.cssText = 'border:1px dashed var(--line);border-radius:10px;' +
          'padding:10px;margin-bottom:10px;';
        mail.innerHTML =
          '<div style="font-size:13px;font-weight:700;margin-bottom:6px;">' +
            '📬 Ce que dit le mail de la préfecture (' + cat.court + ')</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<div style="flex:1;"><label>Seuil du 1ᵉʳ mardi</label>' +
              '<input type="text" class="mS1" inputmode="decimal" value="' +
                (m[cat.s1] || '') + '"></div>' +
            '<div style="flex:1;"><label>Seuil total (2ᵉ mardi)</label>' +
              '<input type="text" class="mS2" inputmode="decimal" value="' +
                (m[cat.s2] || '') + '"></div>' +
          '</div>' +
          /* On recopie, on ne calcule pas. C'est toute la demande. */
          '<div style="font-size:11px;color:var(--muted);line-height:1.5;margin-top:2px;">' +
            'Recopie les deux chiffres du mail tels quels — par exemple ' +
            '<strong>2,5</strong> puis <strong>5</strong>. Le second est le ' +
            '<strong>total</strong> : la soustraction est faite ici.</div>';
        zone.appendChild(mail);

        const det2 = document.createElement('div');
        det2.style.cssText = 'font-size:12px;line-height:1.7;margin:-4px 0 10px;padding:0 2px;';
        zone.appendChild(det2);

        const bMaj = document.createElement('button');
        bMaj.className = 'btn btn-secondary';
        bMaj.style.cssText = 'margin-bottom:10px;padding:8px;font-size:12px;';
        bMaj.hidden = true;
        bMaj.addEventListener('click', () => {
          m[cat.etp] = String(placesConfig[cat.etpEcole] || '').trim();
          poserCalcul(m, cat.cle);
          peindreCalcul();
        });
        zone.appendChild(bMaj);

        /* ---- Les nombres retenus ---- */
        /* « calculé : 9 ↩︎ » sous une case tapée à la main : la valeur
           de Chrystel reste, et le calcul se voit à côté sans jamais
           la remplacer. Une seule source pour tout le reste de
           l'application — « m.q1 » — et une trace de sa provenance.

           La ligne est TOUJOURS dans la page, montrée ou cachée. La
           fabriquer à la volée obligerait à redessiner tout le
           réglage à chaque frappe — et redessiner, c'est détruire la
           case où le doigt allait se poser. */
        const sousCase = role =>
          '<div class="rappelCalc" data-role="' + role + '" hidden ' +
          'style="font-size:11px;color:var(--warn-text);margin-top:-6px;' +
          'margin-bottom:8px;cursor:pointer;"></div>';

        const grille = document.createElement('div');
        grille.innerHTML =
          '<label>Places du mois</label>' +
          '<input type="text" class="mTotal" inputmode="numeric" value="' +
            (m[cat.total] || '') + '">' +
          sousCase('mT') +
          '<div style="display:flex;gap:8px;">' +
            '<div style="flex:1;"><label>1ʳᵉ quinzaine</label>' +
              '<input type="text" class="mQ1" inputmode="numeric" value="' +
                (m[cat.q1] || '') + '">' + sousCase('m1') + '</div>' +
            '<div style="flex:1;"><label>2ᵉ quinzaine</label>' +
              '<input type="text" class="mQ2" inputmode="numeric" value="' +
                (m[cat.q2] || '') + '">' + sousCase('m2') + '</div>' +
          '</div>';
        zone.appendChild(grille);

        /* ------------------------------------------------------------
           REPEINDRE SANS REDESSINER

           Tout ce qui suit se met à jour à chaque frappe, EN PLACE.
           Un « dessinerTout() » serait plus court à écrire — et il
           détruirait les champs pendant qu'on tape dedans : le curseur
           saute, et sur téléphone le clavier se referme. On repeint
           donc le texte et les valeurs, jamais la structure.
           ------------------------------------------------------------ */
        const chQ = {
          mT: grille.querySelector('.mTotal'),
          m1: grille.querySelector('.mQ1'),
          m2: grille.querySelector('.mQ2')
        };
        /* Le rôle d'une case (« la 1ʳᵉ quinzaine ») et le champ où
           elle se range (« q1 » ou « aQ1 ») sont deux choses : c'est
           la catégorie qui fait le pont. */
        const champDuRole = { mT: cat.total, m1: cat.q1, m2: cat.q2 };
        const marqueDuRole = { mT: cat.mT, m1: cat.m1, m2: cat.m2 };

        function peindreCalcul(){
          const calc = calculPlacesDuMois(m, cat.cle);
          const etpEcole = String(placesConfig[cat.etpEcole] || '').trim();
          const etpMois = String(m[cat.etp] || '').trim();
          const etpDecale = !!(calc && etpEcole && etpMois && etpEcole !== etpMois);

          if(!calc){
            det2.style.color = 'var(--muted)';
            det2.textContent = etpEcole
              ? 'Remplis les deux seuils pour que le calcul se fasse.'
              : 'Remplis les deux seuils, et l’ETP ' + cat.court +
                ' tout en haut de ce réglage.';
          }else if(calc.negatif){
            det2.style.color = 'var(--warn-text)';
            det2.innerHTML = '⚠️ Le seuil total (' + texteFr(calc.s2) +
              ') est <strong>inférieur</strong> au seuil du 1ᵉʳ mardi (' +
              texteFr(calc.s1) + '). Les deux chiffres sont sans doute ' +
              'inversés : le second doit être le total. Rien n’a été calculé.';
          }else{
            det2.style.color = '';
            det2.innerHTML =
              '1ʳᵉ quinzaine : ' + texteFr(calc.s1) + ' × ' + texteFr(calc.etp) +
                ' = ' + texteFr(calc.exact1) + ' → <strong>' + calc.q1 + '</strong><br>' +
              '2ᵉ quinzaine : (' + texteFr(calc.s2) + ' − ' + texteFr(calc.s1) + ') × ' +
                texteFr(calc.etp) + ' = ' + texteFr(calc.exact2) +
                ' → <strong>' + calc.q2 + '</strong>' +
              /* Deux arrondis ne font pas toujours le même total qu'un
                 seul : 7,5 + 7,5 donne 8 + 8 = 16, là où 15 arrondi en
                 fait 15. On le DIT, on ne le corrige pas — c'est à elle
                 de savoir ce que la préfecture accepte. */
              (calc.totalDuSeuil !== calc.total
                ? '<br><span style="color:var(--warn-text);">⚠️ Pris d’un bloc, le seuil ' +
                  'total donnerait <strong>' + calc.totalDuSeuil + '</strong> places (' +
                  texteFr(calc.s2) + ' × ' + texteFr(calc.etp) + ' = ' +
                  texteFr(calc.exactTotal) + '), alors que les deux quinzaines arrondies ' +
                  'en font <strong>' + calc.total + '</strong> — deux arrondis au lieu ' +
                  'd’un. À toi de trancher.</span>'
                : '') +
              (etpDecale
                ? '<br><span style="color:var(--warn-text);">⚠️ Ce mois a été calculé avec ' +
                  'un ETP ' + cat.court + ' de <strong>' + texteFr(nombreFr(etpMois)) +
                  '</strong> ; l’école est aujourd’hui à <strong>' +
                  texteFr(nombreFr(etpEcole)) + '</strong>.</span>'
                : '');
          }

          bMaj.hidden = !etpDecale;
          if(etpDecale){
            bMaj.textContent = '🔁 Recalculer ' + cat.court + ' avec l’ETP actuel (' +
              texteFr(nombreFr(etpEcole)) + ')';
          }

          /* Les valeurs, et le rappel du calcul sous celles reprises à
             la main. On ne touche jamais au champ où le doigt est posé. */
          const bon = calc && !calc.negatif ? calc : null;
          Object.keys(chQ).forEach(role => {
            const champ = chQ[role];
            const attendu = !bon ? null
              : (role === 'mT' ? bon.total : role === 'm1' ? bon.q1 : bon.q2);
            if(champ !== document.activeElement) champ.value = m[champDuRole[role]] || '';
            const rappel = grille.querySelector('.rappelCalc[data-role="' + role + '"]');
            if(!rappel) return;
            const aLaMain = String(m[marqueDuRole[role]] || '') === 'main';
            rappel.hidden = !(aLaMain && attendu != null);
            if(!rappel.hidden){
              rappel.innerHTML = '✏️ à la main · calculé : <strong>' + attendu +
                '</strong> ↩︎';
            }
          });
        }

        /* Taper dans une case, c'est la reprendre à la main : le calcul
           ne la touchera plus tant qu'on n'a pas appuyé sur ↩︎. */
        Object.keys(chQ).forEach(role => {
          chQ[role].addEventListener('input', e => {
            m[champDuRole[role]] = e.target.value.trim();
            m[marqueDuRole[role]] = 'main';
            peindreCalcul();
          });
        });

        grille.querySelectorAll('.rappelCalc').forEach(el => {
          el.addEventListener('click', () => {
            m[marqueDuRole[el.dataset.role]] = '';
            poserCalcul(m, cat.cle);
            peindreCalcul();
          });
        });

        /* Les seuils : on recalcule, mais on ne touche qu'aux cases
           restées automatiques. */
        [[cat.s1, 'mS1'], [cat.s2, 'mS2']].forEach(([champ, cls]) => {
          mail.querySelector('.' + cls).addEventListener('input', e => {
            m[champ] = e.target.value.trim();
            /* Le mois se fige sur l'ETP du jour au moment où on le
               calcule — pas sur celui de décembre prochain. */
            if(!String(m[cat.etp] || '').trim()){
              m[cat.etp] = String(placesConfig[cat.etpEcole] || '').trim();
            }
            poserCalcul(m, cat.cle);
            peindreCalcul();
          });
        });

        peindreCalcul();
        repeindre.push(peindreCalcul);
        return zone;
      }

      categoriesPlaces().forEach(cat => bloc.appendChild(blocCategorie(cat)));

      /* ---- Les deux dates de prise : COMMUNES AU MOIS ----
         La préfecture ouvre le même mardi pour tout le monde ; seule
         l'heure change selon la catégorie. Une date par catégorie,
         ce serait la même information écrite deux fois — et deux
         occasions de ne pas être d'accord. */
      const zPrise = document.createElement('div');
      zPrise.innerHTML =
        '<div style="display:flex;gap:8px;">' +
          '<div style="flex:1;"><label>1ʳᵉ quinzaine — prise le</label>' +
            '<input type="date" class="mP1" value="' + (m.p1 || '') + '"></div>' +
          '<div style="flex:1;"><label>2ᵉ quinzaine — prise le</label>' +
            '<input type="date" class="mP2" value="' + (m.p2 || '') + '"></div>' +
        '</div>' +
        /* Le vide n'est pas un oubli : c'est le mode normal. Sans
           cette phrase, on remplirait les deux dates « pour bien
           faire », et la règle ne servirait plus jamais. */
        '<div style="font-size:11px;color:var(--muted);line-height:1.5;' +
          'margin-top:2px;margin-bottom:10px;">Laisse vide pour garder la règle : ' +
          '1ᵉʳ et 2ᵉ mardi du mois précédent. Ne remplis que si la ' +
          'préfecture décale. Ces deux dates valent pour la B ET pour la A.</div>';
      /* « input » ET « change » : une date tapée au clavier plutôt
         que choisie dans le calendrier ne déclenche « change »
         qu'en quittant le champ — et on quitte le champ en appuyant
         sur 💾, ce qui est exactement le moment où il est trop
         tard pour s'en apercevoir. */
      ['input', 'change'].forEach(ev => {
        zPrise.querySelector('.mP1').addEventListener(ev, e => { m.p1 = e.target.value; });
        zPrise.querySelector('.mP2').addEventListener(ev, e => { m.p2 = e.target.value; });
      });
      bloc.appendChild(zPrise);

      (m.semaines || []).forEach((w, iw) => {
        const l = document.createElement('div');
        l.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px;';
        l.innerHTML =
          '<div style="font-size:14px;font-weight:700;margin-bottom:8px;">' + libelleSemaine(w) + '</div>' +
          '<div style="display:flex;gap:6px;margin-bottom:6px;">' +
            '<input type="date" class="wDu" value="' + (w.du || '') + '" style="flex:1;margin:0;">' +
            '<input type="date" class="wAu" value="' + (w.au || '') + '" style="flex:1;margin:0;">' +
          '</div>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<span style="font-size:13px;color:var(--muted);white-space:nowrap;">Jours 🚗</span>' +
            '<input type="text" class="wSB" inputmode="decimal" value="' + (w.sb || '') +
              '" style="flex:1;margin:0;text-align:center;">' +
            '<input type="text" class="wLO" inputmode="decimal" value="' + (w.lo || '') +
              '" style="flex:1;margin:0;text-align:center;">' +
          '</div>' +
          '<div style="display:flex;gap:8px;font-size:11px;color:var(--muted);margin-top:2px;">' +
            '<span style="flex:1;text-align:center;">Saint-Brieuc</span>' +
            '<span style="flex:1;text-align:center;">Loudéac</span>' +
          '</div>' +
          /* ---- Les jours moto, bien en dessous et séparés ----
             Le trait n'est pas décoratif : deux paires de cases qui
             se ressemblent, collées l'une à l'autre, c'est
             l'occasion de taper les jours moto dans les cases
             voiture. Et les libellés sont ceux du métier — HC et
             CIR — pas « moto 1 » et « moto 2 ».

             ⚠️ PAS DE CENTRE ICI : les jours voiture se comptent à
             Saint-Brieuc et à Loudéac, les jours moto non. C'est un
             choix de Chrystel, confirmé le 4 septembre. */
          '<div style="border-top:1px solid var(--line);margin:10px 0 7px;"></div>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<span style="font-size:13px;color:var(--muted);white-space:nowrap;">Jours 🏍️</span>' +
            '<input type="text" class="wHC" inputmode="decimal" value="' + (w.hc || '') +
              '" style="flex:1;margin:0;text-align:center;">' +
            '<input type="text" class="wCIR" inputmode="decimal" value="' + (w.cir || '') +
              '" style="flex:1;margin:0;text-align:center;">' +
          '</div>' +
          '<div style="display:flex;gap:8px;font-size:11px;color:var(--muted);margin-top:2px;">' +
            '<span style="flex:1;text-align:center;">HC — Plateau</span>' +
            '<span style="flex:1;text-align:center;">CIR — Circulation</span>' +
          '</div>';
        l.querySelector('.wDu').addEventListener('change', e => { w.du = e.target.value; dessinerTout(); });
        l.querySelector('.wAu').addEventListener('change', e => { w.au = e.target.value; dessinerTout(); });
        l.querySelector('.wSB').addEventListener('input', e => { w.sb = e.target.value.trim(); });
        l.querySelector('.wLO').addEventListener('input', e => { w.lo = e.target.value.trim(); });
        l.querySelector('.wHC').addEventListener('input', e => { w.hc = e.target.value.trim(); });
        l.querySelector('.wCIR').addEventListener('input', e => { w.cir = e.target.value.trim(); });

        const bw = document.createElement('button');
        bw.className = 'btn btn-secondary';
        bw.style.cssText = 'margin-top:8px;padding:7px;font-size:12px;color:var(--red);border-color:var(--red);';
        bw.textContent = '✕ Retirer cette semaine';
        bw.addEventListener('click', () => { m.semaines.splice(iw, 1); dessinerTout(); });
        l.appendChild(bw);
        bloc.appendChild(l);
      });

      const bAddW = document.createElement('button');
      bAddW.className = 'btn btn-secondary';
      bAddW.style.cssText = 'margin-bottom:8px;padding:8px;font-size:12px;';
      bAddW.textContent = '➕ Ajouter une semaine';
      bAddW.addEventListener('click', () => {
        m.semaines = m.semaines || [];
        m.semaines.push({ du:'', au:'', sb:'', lo:'', hc:'', cir:'' });
        dessinerTout();
      });
      bloc.appendChild(bAddW);

      const bDelM = document.createElement('button');
      bDelM.className = 'btn btn-secondary';
      bDelM.style.cssText = 'padding:8px;font-size:12px;color:var(--red);border-color:var(--red);';
      bDelM.textContent = '🗑️ Retirer ce mois';
      bDelM.addEventListener('click', async () => {
        if(!await confirmer('Retirer ' + libMois(m.mois) + ' du réglage ?')) return;
        placesConfig.mois.splice(im, 1);
        dessinerTout();
      });
      bloc.appendChild(bDelM);

      corps.appendChild(bloc);
    });

    const bAddM = document.createElement('button');
    bAddM.className = 'btn btn-secondary';
    bAddM.style.cssText = 'margin-bottom:10px;';
    bAddM.textContent = '➕ Ajouter un mois';
    bAddM.addEventListener('click', () => {
      /* Propose le mois suivant le dernier configuré */
      const d = new Date();
      d.setDate(15);
      if(placesConfig.mois.length){
        const dernier = placesConfig.mois[placesConfig.mois.length - 1].mois;
        if(dernier){
          const [a, mo] = dernier.split('-').map(Number);
          d.setFullYear(a, mo, 15);
        }
      }
      const p2 = n => String(n).padStart(2, '0');
      placesConfig.mois.push(moisVide(d.getFullYear() + '-' + p2(d.getMonth() + 1)));
      dessinerTout();
    });
    corps.appendChild(bAddM);

    const bEnr = document.createElement('button');
    bEnr.className = 'btn btn-primary';
    bEnr.textContent = '💾 Enregistrer';
    bEnr.addEventListener('click', async () => {
      bEnr.disabled = true;
      bEnr.textContent = 'Enregistrement…';
      try{
        placesConfig.mois.sort((a, b) => String(a.mois).localeCompare(String(b.mois)));
        await enregistrerPlaces();
        showToast('Places enregistrées ✅');
        afficherBureau();
      }catch(e){ showToast('Erreur : ' + e.message); }
      finally{ bEnr.disabled = false; bEnr.textContent = '💾 Enregistrer'; }
    });
    corps.appendChild(bEnr);
  }
  dessinerTout();
}


/* Synthèse des élèves à placer : par moniteur, semaine et centre */

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-places.js'] = true;
